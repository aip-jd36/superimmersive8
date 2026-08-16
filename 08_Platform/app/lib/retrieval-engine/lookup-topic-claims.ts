/**
 * Topic claim lookup + applicability evaluation (CRC Living Knowledge
 * Phase 1, 2026-08-16). Parallel to lookup-rows.ts, not a modification of
 * it -- matches PRD v0.2 §14's "Tool Retrieval + Topic/LK Retrieval"
 * model, and the repo-grounded finding that a non-tool-scoped claim has no
 * MatrixRow to attach to, so it needs its own lookup path.
 *
 * Two-step process, deliberately kept as two small pure functions rather
 * than one: (1) topic match -- does an active, confirmed UserGoal's
 * category match a TopicClaim's topic, on a currently-Adopted +
 * CRC-eligible, non-superseded claim; (2) applicability match -- of the
 * topic-matched claims, does the deterministic predicate evaluation over
 * ApplicabilityFacts pass. A claim that matches (1) but fails (2) is not
 * an error -- it's the exact "relevant but not applicable" case PRD v0.2
 * §9 requires (e.g. a US-jurisdiction copyright claim when jurisdiction
 * is unconfirmed). No guessing, no partial credit -- a claim only ever
 * becomes a RetrievalResult when every one of its requirements evaluates
 * true.
 */

import type { Attested, GoalCategory, ToolMention, UserGoal } from '@/types/interview-engine'
import type { ApplicabilityRequirement, RetrievalDiagnostic, TopicClaim } from './types'

/**
 * Only the two Phase 1 IMPLEMENTED fact sources -- see APPLICABILITY_FACTS'
 * own doc comment in types.ts for why the other three predicate types are
 * reserved, not evaluable, in Phase 1.
 */
export interface ApplicabilityFacts {
  jurisdiction: Attested<string>
  toolMentions: ToolMention[]
}

function evaluateRequirement(req: ApplicabilityRequirement, facts: ApplicabilityFacts): boolean {
  let actual: string | undefined

  if (req.fact === 'jurisdiction') {
    actual = facts.jurisdiction.state === 'confirmed' ? facts.jurisdiction.value : undefined
  } else if (req.fact === 'tool_plan_tier') {
    const mention = facts.toolMentions.find(
      (m) => m.superseded_by === null && m.resolution.kind === 'canonical' && m.resolution.identifier === req.tool,
    )
    actual = mention && mention.plan_tier.state === 'confirmed' ? mention.plan_tier.value : undefined
  }

  // Unconfirmed/unresolvable fact -> requirement unmet, never guessed. This
  // is the single mechanism that makes "jurisdiction unknown" and "wrong
  // jurisdiction" behave identically from the claim's own point of view --
  // both simply fail this check, never a fabricated match.
  if (actual === undefined) return false

  return req.operator === 'equals' ? actual === req.value : actual !== req.value
}

/** True only when EVERY requirement evaluates true. An empty requirements list is vacuously applicable (no gate at all). */
export function isApplicable(requirements: ApplicabilityRequirement[], facts: ApplicabilityFacts): boolean {
  return requirements.every((req) => evaluateRequirement(req, facts))
}

export interface TopicLookupResult {
  matches: TopicClaim[]
  diagnostics: RetrievalDiagnostic[]
}

/**
 * Only ACTIVE (superseded_by === null), CONFIRMED goals are considered --
 * mirrors buildBoundedInterpretations' own filter exactly (a declined or
 * superseded goal has nothing to look up knowledge for).
 */
export function lookupTopicClaims(goals: UserGoal[], topicClaims: TopicClaim[], facts: ApplicabilityFacts): TopicLookupResult {
  const diagnostics: RetrievalDiagnostic[] = []
  const matches: TopicClaim[] = []
  const seen = new Set<string>()

  const activeGoalCategories = new Set<GoalCategory>(
    goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category),
  )

  for (const category of activeGoalCategories) {
    const candidates = topicClaims.filter((c) => c.topic === category && c.superseded_by === null)

    if (candidates.length === 0) {
      diagnostics.push({ identifier: category, reason: 'no_topic_claim' })
      continue
    }

    let anyEligible = false
    let anyApplicable = false

    for (const claim of candidates) {
      if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue
      anyEligible = true

      if (!isApplicable(claim.applicability_requirements, facts)) continue
      anyApplicable = true

      const dedupeKey = claim.claim_id
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      matches.push(claim)
    }

    if (!anyEligible) {
      diagnostics.push({ identifier: category, reason: 'not_adopted_or_eligible' })
    } else if (!anyApplicable) {
      diagnostics.push({ identifier: category, reason: 'applicability_unmet' })
    }
  }

  return { matches, diagnostics }
}
