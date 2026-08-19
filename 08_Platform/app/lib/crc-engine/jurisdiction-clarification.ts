/**
 * Jurisdiction clarification eligibility (CRC Living Knowledge Phase 1,
 * 2026-08-16, PM final approval SS4/SS5; made relationship-aware, Interview
 * Engine Diagnostic Slice 1, 2026-08-19). Deterministic sibling to
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
 *   B. At least one active, confirmed UserGoal exists whose category EITHER
 *      (B1) directly equals the `topic` of an Adopted + CRC-eligible,
 *      non-superseded TopicClaim carrying a 'jurisdiction' applicability
 *      requirement, OR (B2, added Slice 1, 2026-08-19) is the `source_topic`
 *      of an Adopted + CRC-eligible, non-superseded TopicRelationship whose
 *      `target_topic` has such a claim. One hop only -- this module never
 *      traverses a resolved `target_topic`'s own outgoing relationships,
 *      mirroring `lookupRelatedTopicClaims`'s own "one hop is the entire
 *      shape of the loop" discipline exactly (lookup-topic-relationships.ts).
 *      The double CRC gate that module documents (relationship Adopted+Yes
 *      AND target claim Adopted+Yes, neither alone sufficient) is
 *      reproduced here independently, not imported -- see this module's own
 *      "No Retrieval call" note below for why.
 *   C. (folded into B -- a claim with no jurisdiction requirement can
 *      never make jurisdiction clarification eligible on its own account,
 *      whether reached directly or via a relationship.)
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
 * ACTIVE USER GOAL's own category against real topic claims (direct or
 * one-hop relationship-mediated) (never from IP/locale/traffic-
 * classification -- this module imports none of those).
 *
 * No Retrieval call (Slice 1 scope boundary, load-bearing): this module
 * does NOT call `retrieve()` or import `lookupRelatedTopicClaims`/
 * `lookupTopicClaims`/anything under `lib/bounded-interpretation/`. It
 * reproduces only the narrow governance-gate SHAPE those modules already
 * enforce (Adopted + CRC-eligible, non-superseded, one hop), as a small,
 * self-contained pure helper over `TopicClaim[]`/`TopicRelationship[]` --
 * the same "type-only, no cross-boundary LOGIC import" discipline this
 * module already used for `TopicClaim` before this change. Retrieval's own
 * `isApplicable()`/applicability-fact evaluation is deliberately NOT
 * reused or reproduced here -- this module only asks "does a relevant claim
 * REQUIRE jurisdiction at all," never "is it otherwise applicable," which
 * stays exactly Retrieval's own, single-owner concern.
 */

import type { GoalCategory, Phase, StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

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

/**
 * One-hop relationship gate, reproducing `lookupRelatedTopicClaims`'s own
 * relationship-eligibility filter (lookup-topic-relationships.ts) exactly,
 * independently -- see this module's own header "No Retrieval call" note
 * for why it is not imported instead. A relationship that is Adopted-but-
 * Pending (e.g. a not-yet-CRC-published relationship) never passes this
 * gate, matching Retrieval's own "zero behavior change" guarantee for the
 * exact same governance state.
 */
function eligibleRelationshipsFor(category: GoalCategory, relationships: TopicRelationship[]): TopicRelationship[] {
  return relationships.filter(
    (r) => r.source_topic === category && r.superseded_by === null && r.lifecycle === 'Adopted' && r.crc_eligible === 'Yes',
  )
}

/**
 * Whether an active goal's category needs jurisdiction clarification --
 * true when EITHER a direct-topic claim (B1) OR a one-hop relationship-
 * mediated claim (B2) requires it. `relationships` defaults to `[]` so
 * every pre-existing call site (direct-topic-only) is completely
 * unaffected -- the additive-parameter, defaults-preserve-existing-
 * behavior discipline already used throughout this codebase for
 * `retrieve()`'s own `relationships`/`assetProviders` parameters.
 */
function goalNeedsJurisdiction(category: GoalCategory, topicClaims: TopicClaim[], relationships: TopicRelationship[]): boolean {
  const directlyNeeds = topicClaims.some((c) => c.topic === category && claimNeedsJurisdiction(c))
  if (directlyNeeds) return true

  return eligibleRelationshipsFor(category, relationships).some((r) =>
    topicClaims.some((c) => c.topic === r.target_topic && c.superseded_by === null && claimNeedsJurisdiction(c)),
  )
}

export function evaluateJurisdictionClarificationEligibility(
  understanding: StructuredUnderstanding,
  topicClaims: TopicClaim[],
  alreadyAskedThisConversation: boolean,
  gate1Met: boolean,
  relationships: TopicRelationship[] = [],
): JurisdictionClarificationEligibilityResult {
  const activeConfirmedGoals = understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')
  const needsJurisdiction = activeConfirmedGoals.some((g) => goalNeedsJurisdiction(g.category, topicClaims, relationships))

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
