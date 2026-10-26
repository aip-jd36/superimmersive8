/**
 * TopicClaim Representation Readiness Primitive (LK-13, 2026-08-30).
 *
 * Answers exactly one question: is a TopicClaim-shaped governed proposition
 * MECHANICALLY representable under the current canonical governed model?
 * It does NOT answer whether evidence is sufficient, whether the proposition
 * is correct, whether Topic/provider_scope/tool_scope are the RIGHT choice,
 * whether the claim should be Adopted, or whether CRC should publish it --
 * all of that remains exclusively human governance judgment (FGR/CPR/DAR),
 * untouched by this module.
 *
 * Dependency direction (LK-12's own correction of LK-11, carried forward
 * exactly): TopicClaim schema + canonical authorities -> THIS VALIDATOR ->
 * a future candidate gate -> optional fixture-consistency consumers. This
 * module is deliberately NOT derived from, and does not import,
 * topic-claims-fixture.ts, matrix-fixture.ts, GOVERNED-CLAIMS.md, or
 * PLATFORM-RIGHTS-MATRIX.md -- it validates a supplied TopicClaim value
 * only, reusing exactly the same authorities LK-10's tool-identity registry
 * and the pre-existing AssetProviderId/GoalCategory/Lifecycle/CrcEligible
 * consts already are. Fixture consistency (topic-claims-fixture-
 * consistency.test.ts's own provider_scope check) remains defense-in-depth,
 * unmodified by this milestone -- it does not consume this function yet.
 *
 * First-milestone scope only (LK-13 SS 5): topic, lifecycle, provider_scope,
 * tool_scope, applicability_requirements' structural discriminant + tool
 * controlled-reference, crc_eligible. Deliberately excluded (LK-13 SS 6,
 * flagged rather than silently added or dropped): provider_scope/tool_scope
 * non-empty-array shape (a real invariant per TopicClaim.provider_scope's
 * own doc comment, currently enforced only inside the fixture-consistency
 * test, not here -- not named in this milestone's own SS 5 A-F list),
 * superseded_by target resolution, unresolved_project_dependencies shape/
 * semantics, dependency askability, evidence sufficiency, proposition
 * wording, crc_publication_scope/crc_candidate_statement correctness,
 * last_verified freshness, and ApplicabilityRequirement.operator membership
 * (already fully closed by its own TypeScript union, no registry needed).
 *
 * LK-EXCLUSION-ACTIVATION-READINESS-1 (2026-10-26, ADR-001 §L.9) extends the
 * same primitive to `applicability_exclusions`: the structural checks reuse
 * the runtime gate's own validator (`validateApplicabilityExclusions`, so
 * readiness and runtime cannot disagree about what is malformed), the tool
 * reference is checked against the same canonical tool authority as
 * `tool_scope`, and an exclusion that names the very value a mandatory
 * `equals` requirement of the same claim demands is rejected as
 * self-contradictory. Corpus-level spelling collisions are checked by
 * `findGovernedValueCollisions` (governed-applicability-values.ts), not here,
 * because this primitive validates one claim at a time.
 *
 * This module is not wired into any candidate/Adoption gate yet -- it is
 * the primitive only, per this milestone's own explicit Hard Boundary.
 * Never mutates its input; never throws for ordinary invalid representation
 * (structured issues are returned instead, per SS 4's own requirement).
 */

import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import { APPLICABILITY_FACTS, CRC_ELIGIBLE_VALUES, KNOWLEDGE_TOPICS, LIFECYCLE_VALUES } from '@/lib/retrieval-engine/types'
import { ASSET_PROVIDER_IDS } from '@/types/interview-engine'
import { isCanonicalToolIdentity } from '@/lib/tool-identity/registry'
import { validateApplicabilityExclusions, type ApplicabilityExclusionViolationKind } from '@/lib/retrieval-engine/applicability-exclusions'
import { normalizeGovernedValue } from '@/lib/retrieval-engine/governed-applicability-values'

export type RepresentationReadinessIssueCode =
  | 'invalid_topic'
  | 'invalid_lifecycle'
  | 'invalid_crc_eligible'
  | 'invalid_provider_scope_entry'
  | 'invalid_tool_scope_entry'
  | 'invalid_applicability_fact'
  | 'missing_applicability_tool_reference'
  | 'invalid_applicability_tool_reference'
  | 'invalid_applicability_exclusions'
  | 'malformed_applicability_exclusion'
  | 'unsupported_applicability_exclusion_fact'
  | 'missing_applicability_exclusion_tool_reference'
  | 'invalid_applicability_exclusion_tool_reference'
  | 'blank_applicability_exclusion_value'
  | 'duplicate_applicability_exclusion'
  | 'contradictory_applicability_exclusion'

/**
 * Deliberately minimal -- an issue code, the field path it was found at
 * (dotted/indexed, e.g. `tool_scope[0]`, `applicability_requirements[1].tool`),
 * and the offending raw value where one exists. No legal/governance prose,
 * no Adoption/CRC/safety verdict of any kind -- see this module's own
 * header for why that boundary is load-bearing, not stylistic.
 */
export interface RepresentationReadinessIssue {
  code: RepresentationReadinessIssueCode
  path: string
  value?: string
}

/** `ready` is `true` iff `issues` is empty -- never an independent field a caller could desync from the list. */
export interface RepresentationReadinessResult {
  ready: boolean
  issues: RepresentationReadinessIssue[]
}

/**
 * `KnowledgeTopic`-shaped, not `GoalCategory`-only (KnowledgeTopic
 * Foundation milestone, 2026-09-13) -- `TopicClaim.topic` is now
 * `KnowledgeTopic`-typed, and a governed knowledge-only topic (once one is
 * ever adopted) is a legitimate, representable value, not a validation
 * error. `KNOWLEDGE_TOPICS` is `GOAL_CATEGORIES` plus `KNOWLEDGE_ONLY_TOPICS`
 * (currently empty), so this check's actual membership is byte-identical to
 * before this milestone today, and only ever grows alongside a real,
 * separately-governed adoption decision -- never silently.
 */
const KNOWLEDGE_TOPIC_SET: ReadonlySet<string> = new Set(KNOWLEDGE_TOPICS)
const LIFECYCLE_SET: ReadonlySet<string> = new Set(LIFECYCLE_VALUES)
const CRC_ELIGIBLE_SET: ReadonlySet<string> = new Set(CRC_ELIGIBLE_VALUES)
const ASSET_PROVIDER_ID_SET: ReadonlySet<string> = new Set(ASSET_PROVIDER_IDS)
const APPLICABILITY_FACT_SET: ReadonlySet<string> = new Set(APPLICABILITY_FACTS)

/**
 * The two ApplicabilityFact values whose `tool` field is meaningful (per
 * ApplicabilityRequirement's own doc comment, retrieval-engine/types.ts, and
 * matrix-fixture.ts's real `tool_account_status` usage) -- `jurisdiction`
 * carries no tool reference at all, and is correctly never checked against
 * the tool-identity authority.
 */
const TOOL_SCOPED_APPLICABILITY_FACTS: ReadonlySet<string> = new Set(['tool_plan_tier', 'tool_account_status'])

function checkApplicabilityRequirement(req: ApplicabilityRequirement, index: number, issues: RepresentationReadinessIssue[]): void {
  const basePath = `applicability_requirements[${index}]`

  if (!APPLICABILITY_FACT_SET.has(req.fact)) {
    issues.push({ code: 'invalid_applicability_fact', path: `${basePath}.fact`, value: req.fact })
    // A structurally unrecognized fact has no defined tool-reference
    // semantics to check further -- stop at this requirement, exactly
    // mirroring toolScopeMatches's own "fail closed, don't guess" discipline.
    return
  }

  if (!TOOL_SCOPED_APPLICABILITY_FACTS.has(req.fact)) return

  if (req.tool === undefined) {
    issues.push({ code: 'missing_applicability_tool_reference', path: `${basePath}.tool` })
    return
  }

  // Same canonical tool identity authority tool_scope consumes (LK-9 SS 12's
  // explicit "no separate vocabularies" requirement) -- never a second,
  // parallel tool-identifier check.
  if (!isCanonicalToolIdentity(req.tool)) {
    issues.push({ code: 'invalid_applicability_tool_reference', path: `${basePath}.tool`, value: req.tool })
  }
}

const EXCLUSION_VIOLATION_CODES: Record<ApplicabilityExclusionViolationKind, RepresentationReadinessIssueCode> = {
  not_an_array: 'invalid_applicability_exclusions',
  empty_array: 'invalid_applicability_exclusions',
  malformed_exclusion: 'malformed_applicability_exclusion',
  unsupported_fact: 'unsupported_applicability_exclusion_fact',
  missing_tool: 'missing_applicability_exclusion_tool_reference',
  empty_value: 'blank_applicability_exclusion_value',
}

function checkApplicabilityExclusions(claim: TopicClaim, issues: RepresentationReadinessIssue[]): void {
  const raw: unknown = (claim as { applicability_exclusions?: unknown }).applicability_exclusions
  const violations = validateApplicabilityExclusions(raw)
  for (const v of violations) {
    const path = v.exclusion_index === undefined ? 'applicability_exclusions' : `applicability_exclusions[${v.exclusion_index}]`
    issues.push({ code: EXCLUSION_VIOLATION_CODES[v.kind], path: v.kind === 'missing_tool' ? `${path}.tool` : v.kind === 'empty_value' ? `${path}.value` : v.kind === 'unsupported_fact' ? `${path}.fact` : path })
  }
  if (!Array.isArray(raw)) return
  const badIndexes = new Set(violations.map((v) => v.exclusion_index))
  const seen = new Set<string>()
  raw.forEach((x: { fact: string; tool: string; value: string }, index) => {
    if (badIndexes.has(index)) return
    if (!isCanonicalToolIdentity(x.tool)) {
      issues.push({ code: 'invalid_applicability_exclusion_tool_reference', path: `applicability_exclusions[${index}].tool`, value: x.tool })
      return
    }
    const key = `${x.fact}\u0000${x.tool}\u0000${normalizeGovernedValue(x.value)}`
    if (seen.has(key)) issues.push({ code: 'duplicate_applicability_exclusion', path: `applicability_exclusions[${index}]`, value: x.value })
    seen.add(key)
    const contradicts = claim.applicability_requirements.some(
      (r) => r.operator === 'equals' && r.fact === x.fact && r.tool === x.tool && normalizeGovernedValue(r.value) === normalizeGovernedValue(x.value),
    )
    if (contradicts) issues.push({ code: 'contradictory_applicability_exclusion', path: `applicability_exclusions[${index}]`, value: x.value })
  })
}

export function checkTopicClaimRepresentationReadiness(claim: TopicClaim): RepresentationReadinessResult {
  const issues: RepresentationReadinessIssue[] = []

  if (!KNOWLEDGE_TOPIC_SET.has(claim.topic)) {
    issues.push({ code: 'invalid_topic', path: 'topic', value: claim.topic })
  }

  if (!LIFECYCLE_SET.has(claim.lifecycle)) {
    issues.push({ code: 'invalid_lifecycle', path: 'lifecycle', value: claim.lifecycle })
  }

  if (!CRC_ELIGIBLE_SET.has(claim.crc_eligible)) {
    issues.push({ code: 'invalid_crc_eligible', path: 'crc_eligible', value: claim.crc_eligible })
  }

  if (claim.provider_scope !== null) {
    claim.provider_scope.forEach((providerId, index) => {
      if (!ASSET_PROVIDER_ID_SET.has(providerId)) {
        issues.push({ code: 'invalid_provider_scope_entry', path: `provider_scope[${index}]`, value: providerId })
      }
    })
  }

  if (claim.tool_scope !== null) {
    claim.tool_scope.forEach((toolId, index) => {
      if (!isCanonicalToolIdentity(toolId)) {
        issues.push({ code: 'invalid_tool_scope_entry', path: `tool_scope[${index}]`, value: toolId })
      }
    })
  }

  claim.applicability_requirements.forEach((req, index) => checkApplicabilityRequirement(req, index, issues))

  checkApplicabilityExclusions(claim, issues)

  return { ready: issues.length === 0, issues }
}
