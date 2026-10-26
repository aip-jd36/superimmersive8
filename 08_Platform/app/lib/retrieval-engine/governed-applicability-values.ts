/**
 * Governed tool-fact value contract (LK-EXCLUSION-ACTIVATION-READINESS-1,
 * 2026-10-26; ADR-001 §L.9).
 *
 * One shared definition of how a DECLARED tool-scoped fact value (a plan tier
 * or an account status a customer typed into a form) relates to the values
 * Living Knowledge actually governs. Used by the declaration-based fact
 * builders (Product A preview, Creator Record) and, for comparison only, by
 * the exclusion gate. It is not an applicability authority: it never
 * evaluates a requirement and never changes `equals` / `not_equals`, which
 * stay exact comparisons inside the one evaluator (lookup-topic-claims.ts).
 *
 * Contract:
 *   - The governed vocabulary for (fact, tool) is exactly the values authored
 *     in governed requirements, `applicability_any_of` alternatives and
 *     `applicability_exclusions` for that canonical tool. Nothing else.
 *   - A declaration maps to a governed value only when its normalized form
 *     (NFKC, trim, internal-whitespace collapse, case fold) equals exactly one
 *     governed value's normalized form. No alias table, no substring/prefix
 *     matching, no entitlement or status inference: "Enterprise plan" is not
 *     "Enterprise".
 *   - Two governed values that normalize identically for one (fact, tool) are
 *     a governance defect; a declaration that hits them is `ambiguous` and is
 *     never confirmed. `findGovernedValueCollisions` reports them.
 *   - The declaration itself is never rewritten; callers keep it verbatim and
 *     record the canonical value alongside it.
 *
 * Pure. No I/O.
 */

import type { ApplicabilityRequirement, ExcludableApplicabilityFact, TopicClaim } from './types'

/** Tool-scoped facts that carry a governed value vocabulary. */
export type GovernedToolFact = ExcludableApplicabilityFact

/** Comparison normalization only. Never used to create or confirm a fact value. */
export function normalizeGovernedValue(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

type ClaimWithGovernedValues = Pick<TopicClaim, 'applicability_requirements' | 'applicability_any_of' | 'applicability_exclusions'>

function governedEntries(claim: ClaimWithGovernedValues): { fact: string; tool?: string; value: string }[] {
  const reqs: ApplicabilityRequirement[] = [...claim.applicability_requirements, ...(claim.applicability_any_of ?? []).flat()]
  return [...reqs, ...(Array.isArray(claim.applicability_exclusions) ? claim.applicability_exclusions : [])]
}

/** Governed values for one tool-scoped fact, per canonical tool, in authoring order. */
export function governedToolFactValues(topicClaims: readonly ClaimWithGovernedValues[], fact: GovernedToolFact): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const claim of topicClaims) {
    for (const e of governedEntries(claim)) {
      if (e.fact !== fact || !e.tool || typeof e.value !== 'string') continue
      if (!out.has(e.tool)) out.set(e.tool, new Set())
      out.get(e.tool)!.add(e.value)
    }
  }
  return out
}

export type GovernedValueMatch =
  | { kind: 'canonical'; value: string; exact: boolean }
  | { kind: 'not_governed' }
  | { kind: 'ambiguous'; candidates: string[] }

/** Maps one declared value onto the governed vocabulary for its (fact, tool). */
export function matchGovernedValue(declared: string, governed: ReadonlySet<string> | undefined): GovernedValueMatch {
  const target = normalizeGovernedValue(declared)
  if (target === '' || !governed) return { kind: 'not_governed' }
  const candidates = Array.from(governed).filter((g) => normalizeGovernedValue(g) === target)
  if (candidates.length === 0) return { kind: 'not_governed' }
  if (candidates.length > 1) return { kind: 'ambiguous', candidates }
  return { kind: 'canonical', value: candidates[0], exact: candidates[0] === declared }
}

export interface GovernedValueCollision {
  fact: GovernedToolFact
  tool: string
  normalized: string
  values: string[]
}

/** Corpus-level readiness check: governed spellings that would make a declaration ambiguous. */
export function findGovernedValueCollisions(topicClaims: readonly ClaimWithGovernedValues[]): GovernedValueCollision[] {
  const out: GovernedValueCollision[] = []
  for (const fact of ['tool_plan_tier', 'tool_account_status'] as const) {
    for (const [tool, values] of governedToolFactValues(topicClaims, fact)) {
      const byNormalized = new Map<string, string[]>()
      for (const v of values) byNormalized.set(normalizeGovernedValue(v), [...(byNormalized.get(normalizeGovernedValue(v)) ?? []), v])
      for (const [normalized, vs] of byNormalized) if (vs.length > 1) out.push({ fact, tool, normalized, values: vs })
    }
  }
  return out
}

/**
 * A declared governed value that was NOT passed to applicability as confirmed
 * (the declarations for its tool conflict, or the governed vocabulary is
 * ambiguous). Requirements never see it. The exclusion gate reads it only to
 * refuse to treat a possibly-excluded project as covered (ADR-001 §L.9).
 */
export interface WithheldToolFact {
  mention_id: string
  tool: string
  fact: GovernedToolFact
  /** Canonical governed value when one exists, otherwise the declaration verbatim. */
  value: string
  reason: 'conflicting_declarations' | 'ambiguous_governed_value'
}
