/**
 * Jurisdiction clarification eligibility (CRC Living Knowledge Phase 1,
 * 2026-08-16, PM final approval SS4/SS5). Deterministic sibling to
 * commercial-readiness-catalog.ts, using the exact same architectural
 * pattern: this module decides WHETHER a jurisdiction-clarification
 * candidate is eligible to be proposed this turn; run-turn.ts's own Model
 * 4 attempt-#1 slot (the same slot Commercial Readiness Discovery already
 * uses, confirmed by direct inspection before this module was written) is
 * what actually turns that into a real candidate the ordinary Constraint
 * A/B pipeline evaluates -- "eligibility only creates a candidate," same
 * hard rule the Discovery catalog's own header states.
 *
 * Exact PM-approved eligibility rule (SS4), all five must hold:
 *   A. Gate 1 is met.
 *   B. At least one active, confirmed UserGoal exists whose category has
 *      an Adopted + CRC-eligible, non-superseded TopicClaim carrying a
 *      'jurisdiction' applicability requirement.
 *   C. (folded into B -- a claim with no jurisdiction requirement can
 *      never make jurisdiction clarification eligible on its own account.)
 *   D. ProjectFacts.jurisdiction is NEITHER confirmed NOR declined.
 *   E. jurisdiction_clarification_asked is false (enforced in
 *      boundaries.ts, not duplicated here -- this module's own
 *      `alreadyAskedThisConversation` parameter is the same shape
 *      commercial-readiness-catalog.ts already uses for the identical
 *      reason: testable in isolation before boundary wiring exists).
 *   F. Existing candidate/Constraint rules permit asking -- decided by the
 *      ordinary Constraint A/B pipeline this candidate still goes
 *      through, never bypassed here.
 *
 * Deliberately does NOT fire merely because GOVERNED-CLAIMS.md contains
 * jurisdictional knowledge, a tool was mentioned, or a session has an IP
 * address -- the trigger is `needsJurisdiction`, computed strictly from an
 * ACTIVE USER GOAL's own category against real topic claims (never from
 * IP/locale/traffic-classification -- this module imports none of those).
 */

import type { Phase, StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

/**
 * PM-approved exact copy (SS3): "Which country's copyright rules are most
 * relevant to this project?" Fixed, catalog-owned, never LLM-generated --
 * same "trivial verbatim lookup" discipline as
 * COMMERCIAL_READINESS_DISCOVERY_QUESTIONS.
 */
export const JURISDICTION_CLARIFICATION_QUESTION = "Which country's copyright rules are most relevant to this project?"

export interface JurisdictionClarificationEligibilityResult {
  needs_jurisdiction: boolean
  jurisdiction_unresolved: boolean
  eligible: boolean
}

function claimNeedsJurisdiction(claim: TopicClaim): boolean {
  return (
    claim.lifecycle === 'Adopted' &&
    claim.crc_eligible === 'Yes' &&
    claim.superseded_by === null &&
    claim.applicability_requirements.some((r) => r.fact === 'jurisdiction')
  )
}

export function evaluateJurisdictionClarificationEligibility(
  understanding: StructuredUnderstanding,
  topicClaims: TopicClaim[],
  alreadyAskedThisConversation: boolean,
  gate1Met: boolean,
): JurisdictionClarificationEligibilityResult {
  const activeConfirmedGoals = understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')
  const needsJurisdiction = activeConfirmedGoals.some((g) => topicClaims.some((c) => c.topic === g.category && claimNeedsJurisdiction(c)))

  const jurisdictionState = understanding.project_facts.jurisdiction.attestation.state
  const jurisdictionUnresolved = jurisdictionState !== 'confirmed' && jurisdictionState !== 'declined'

  const eligible = gate1Met && needsJurisdiction && jurisdictionUnresolved && !alreadyAskedThisConversation

  return { needs_jurisdiction: needsJurisdiction, jurisdiction_unresolved: jurisdictionUnresolved, eligible }
}

/**
 * Deterministically constructs the CandidateQuestionProposal -- the exact
 * same shape the ordinary generator produces, for run-turn.ts to feed
 * through the unchanged validate -> Constraint A -> Constraint B pipeline.
 * target_signal_id is always null, same reasoning as
 * buildCommercialReadinessDiscoveryProposal.
 */
export function buildJurisdictionClarificationProposal(phase: Phase): CandidateQuestionProposal {
  return {
    question_text: JURISDICTION_CLARIFICATION_QUESTION,
    question_kind: 'jurisdiction_clarification',
    target_signal_id: null,
    phase,
  }
}
