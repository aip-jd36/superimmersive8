/**
 * Governed scope-exclusion gate (LK-APPLICABILITY-EXCLUSION-1B, 2026-10-25;
 * ADR-001 §L).
 *
 * A `TopicClaim.applicability_exclusions` entry says: "this claim's
 * proposition does not cover a project whose CONFIRMED `fact` for `tool` is
 * `value`." It is a known-false gate applied AFTER ordinary applicability
 * evaluation, never a positive requirement:
 *
 *   confirmed value matches        -> `triggered`  -> claim becomes `not_met`
 *   confirmed value does not match -> not triggered -> ordinary status kept
 *   no confirmed value             -> not triggered -> ordinary status kept
 *   invalid exclusion governance   -> claim's applicability is INVALID (fail closed)
 *
 * An untriggered exclusion contributes nothing: it never appears among
 * requirement outcomes, is never "established", never material, never
 * askable, and cannot satisfy an `applicability_any_of` group (it is not a
 * requirement and is never evaluated inside one). "Not triggered" never means
 * the project is confirmed to be outside the excluded value -- only that no
 * confirmed fact matched it.
 *
 * Conflicts (LK-EXCLUSION-ACTIVATION-READINESS-1, ADR-001 §L.9): when the
 * excluded value is among the declared values for the tool but is not the
 * ONLY one (two different confirmed values, or a matching value a fact
 * builder withheld because its declarations conflict or the governed
 * vocabulary is ambiguous), the exclusion is `indeterminate`: confirmation is
 * withheld, so the claim is neither excluded nor covered -- it can be at most
 * `unresolved`.
 *
 * Matching uses CONFIRMED, non-superseded, canonically-resolved ToolMention
 * facts only, compared after conservative normalization (Unicode NFKC, trim,
 * internal-whitespace collapse, case fold). No alias table and no inference:
 * "Enterprise plan" does not match "Enterprise". Normalization is used only
 * for this comparison; it never turns text into a confirmed governed value.
 *
 * Pure. No I/O.
 */

import type { ToolMention } from '@/types/interview-engine'
import { normalizeGovernedValue, type WithheldToolFact } from './governed-applicability-values'
import { EXCLUDABLE_APPLICABILITY_FACTS, type ApplicabilityExclusion } from './types'

export const APPLICABILITY_EXCLUSION_VIOLATION_KINDS = ['not_an_array', 'empty_array', 'malformed_exclusion', 'unsupported_fact', 'missing_tool', 'empty_value'] as const
export type ApplicabilityExclusionViolationKind = (typeof APPLICABILITY_EXCLUSION_VIOLATION_KINDS)[number]

export interface ApplicabilityExclusionViolation {
  kind: ApplicabilityExclusionViolationKind
  /** Index into `applicability_exclusions`. Absent for array-level violations. */
  exclusion_index?: number
  /** Engineering/governance-review detail only; never rendered to a CRC user. */
  detail: string
}

export const APPLICABILITY_EXCLUSION_RESULTS = ['triggered', 'indeterminate_conflicting_values', 'not_triggered_confirmed_other_value', 'not_triggered_not_confirmed'] as const
export type ApplicabilityExclusionResult = (typeof APPLICABILITY_EXCLUSION_RESULTS)[number]

export interface ApplicabilityExclusionOutcome {
  exclusion: ApplicabilityExclusion
  exclusion_index: number
  result: ApplicabilityExclusionResult
  /** Confirmed values considered for this exclusion's fact/tool, verbatim, with their mention ids. Provenance only. */
  confirmed_facts: { mention_id: string; value: string }[]
  /** Declared values a fact builder withheld from confirmation for this fact/tool (conflict or ambiguity). Provenance only. */
  withheld_facts: { mention_id: string; value: string; reason: WithheldToolFact['reason'] }[]
  /** Confirmed or withheld facts whose value matches the excluded value (non-empty iff `triggered` or `indeterminate_conflicting_values`). */
  matched_mention_ids: string[]
}

export type ApplicabilityExclusionGate =
  | { valid: true; triggered: boolean; indeterminate: boolean; outcomes: ApplicabilityExclusionOutcome[] }
  | { valid: false; violations: ApplicabilityExclusionViolation[] }

/** Conservative comparison normalization only (the shared governed-value normalizer). Never used to create or confirm a fact value. */
export const normalizeExclusionValue = normalizeGovernedValue

/**
 * Structural validation of untrusted/hand-authored exclusion data. `undefined`
 * (field absent) is valid. Anything else must be a non-empty array of
 * well-formed exclusions over an excludable fact, with a non-empty tool and a
 * value that is non-empty after normalization.
 */
export function validateApplicabilityExclusions(raw: unknown): ApplicabilityExclusionViolation[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return [{ kind: 'not_an_array', detail: 'applicability_exclusions must be an array when present' }]
  if (raw.length === 0) return [{ kind: 'empty_array', detail: 'applicability_exclusions must not be an empty array (omit the field instead)' }]
  const violations: ApplicabilityExclusionViolation[] = []
  raw.forEach((entry, exclusion_index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      violations.push({ kind: 'malformed_exclusion', exclusion_index, detail: `exclusion ${exclusion_index} is not an object` })
      return
    }
    const e = entry as Record<string, unknown>
    if (typeof e.fact !== 'string' || typeof e.value !== 'string' || ('tool' in e && typeof e.tool !== 'string')) {
      violations.push({ kind: 'malformed_exclusion', exclusion_index, detail: `exclusion ${exclusion_index} has a missing or non-string fact/tool/value` })
      return
    }
    if (!(EXCLUDABLE_APPLICABILITY_FACTS as readonly string[]).includes(e.fact)) {
      violations.push({ kind: 'unsupported_fact', exclusion_index, detail: `exclusion ${exclusion_index} targets '${e.fact}', which is not excludable (only ${EXCLUDABLE_APPLICABILITY_FACTS.join(', ')})` })
    }
    if (typeof e.tool !== 'string' || e.tool.trim() === '') {
      violations.push({ kind: 'missing_tool', exclusion_index, detail: `exclusion ${exclusion_index} has no tool` })
    }
    if (normalizeExclusionValue(e.value) === '') {
      violations.push({ kind: 'empty_value', exclusion_index, detail: `exclusion ${exclusion_index} has an empty value` })
    }
  })
  return violations
}

function confirmedFactsFor(exclusion: ApplicabilityExclusion, toolMentions: readonly ToolMention[]): { mention_id: string; value: string }[] {
  const out: { mention_id: string; value: string }[] = []
  for (const m of toolMentions) {
    if (m.superseded_by !== null || m.resolution.kind !== 'canonical' || m.resolution.identifier !== exclusion.tool) continue
    const field = exclusion.fact === 'tool_plan_tier' ? m.plan_tier : m.account_status
    if (field.state === 'confirmed') out.push({ mention_id: m.mention_id, value: field.value })
  }
  return out
}

/**
 * Validates, then evaluates every exclusion:
 *   - `triggered`: at least one confirmed fact matches, and every confirmed
 *     and withheld value for the fact/tool is that same (normalized) value;
 *   - `indeterminate_conflicting_values`: a confirmed or withheld value
 *     matches, but another differs, or the match was withheld;
 *   - otherwise not triggered.
 * The gate is triggered if any exclusion is triggered; indeterminate if none
 * is triggered and any is indeterminate.
 */
export function evaluateApplicabilityExclusionGate(
  exclusions: unknown,
  toolMentions: readonly ToolMention[],
  withheldToolFacts: readonly WithheldToolFact[] = [],
): ApplicabilityExclusionGate {
  const violations = validateApplicabilityExclusions(exclusions)
  if (violations.length > 0) return { valid: false, violations }
  if (exclusions === undefined) return { valid: true, triggered: false, indeterminate: false, outcomes: [] }
  const outcomes = (exclusions as ApplicabilityExclusion[]).map((exclusion, exclusion_index): ApplicabilityExclusionOutcome => {
    const confirmed_facts = confirmedFactsFor(exclusion, toolMentions)
    const withheld_facts = withheldToolFacts
      .filter((w) => w.tool === exclusion.tool && w.fact === exclusion.fact)
      .map((w) => ({ mention_id: w.mention_id, value: w.value, reason: w.reason }))
    const target = normalizeExclusionValue(exclusion.value)
    const all = [...confirmed_facts, ...withheld_facts]
    const matched_mention_ids = all.filter((f) => normalizeExclusionValue(f.value) === target).map((f) => f.mention_id)
    const confirmedMatch = confirmed_facts.some((f) => normalizeExclusionValue(f.value) === target)
    const unanimous = withheld_facts.length === 0 && all.every((f) => normalizeExclusionValue(f.value) === target)
    const result: ApplicabilityExclusionResult =
      matched_mention_ids.length === 0
        ? confirmed_facts.length > 0
          ? 'not_triggered_confirmed_other_value'
          : 'not_triggered_not_confirmed'
        : confirmedMatch && unanimous
          ? 'triggered'
          : 'indeterminate_conflicting_values'
    return { exclusion: { ...exclusion }, exclusion_index, result, confirmed_facts, withheld_facts, matched_mention_ids }
  })
  const triggered = outcomes.some((o) => o.result === 'triggered')
  return { valid: true, triggered, indeterminate: !triggered && outcomes.some((o) => o.result === 'indeterminate_conflicting_values'), outcomes }
}
