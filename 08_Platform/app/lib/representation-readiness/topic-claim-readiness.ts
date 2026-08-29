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
 * This module is not wired into any candidate/Adoption gate yet -- it is
 * the primitive only, per this milestone's own explicit Hard Boundary.
 * Never mutates its input; never throws for ordinary invalid representation
 * (structured issues are returned instead, per SS 4's own requirement).
 */

import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import { APPLICABILITY_FACTS, CRC_ELIGIBLE_VALUES, LIFECYCLE_VALUES } from '@/lib/retrieval-engine/types'
import { ASSET_PROVIDER_IDS, GOAL_CATEGORIES } from '@/types/interview-engine'
import { isCanonicalToolIdentity } from '@/lib/tool-identity/registry'

export type RepresentationReadinessIssueCode =
  | 'invalid_topic'
  | 'invalid_lifecycle'
  | 'invalid_crc_eligible'
  | 'invalid_provider_scope_entry'
  | 'invalid_tool_scope_entry'
  | 'invalid_applicability_fact'
  | 'missing_applicability_tool_reference'
  | 'invalid_applicability_tool_reference'

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

const GOAL_CATEGORY_SET: ReadonlySet<string> = new Set(GOAL_CATEGORIES)
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

export function checkTopicClaimRepresentationReadiness(claim: TopicClaim): RepresentationReadinessResult {
  const issues: RepresentationReadinessIssue[] = []

  if (!GOAL_CATEGORY_SET.has(claim.topic)) {
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

  return { ready: issues.length === 0, issues }
}
