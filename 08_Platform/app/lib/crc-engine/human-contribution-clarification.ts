/**
 * Human-contribution clarification eligibility (Copyright UAT Correction
 * Milestone, 2026-08-19, PM-approved H3). Deterministic sibling to
 * jurisdiction-clarification.ts, using the exact same architectural
 * pattern and, per the completed Human Creative-Contribution Acquisition
 * Architecture Diagnostic's own T3 finding, deliberately NOT generalized
 * into a shared Class-A abstraction -- two concrete cases (jurisdiction,
 * this one) is not yet enough evidence for that. This module decides
 * WHETHER a human-contribution-clarification candidate is eligible to be
 * proposed this turn; run-turn.ts's own Model 4 attempt-#1 slot (the same
 * slot jurisdiction and Commercial Readiness Discovery already share) is
 * what actually turns that into a real candidate the ordinary Constraint
 * A/B pipeline evaluates -- eligibility only creates a candidate, never
 * bypasses Constraint A/B.
 *
 * Exact eligibility rule, all five must hold:
 *   A. At least one active, confirmed UserGoal exists whose category EITHER
 *      (A1) directly equals the `topic` of an Adopted + CRC-eligible,
 *      non-superseded TopicClaim carrying 'human_contribution_description'
 *      in its `unresolved_project_dependencies`, OR (A2) is the
 *      `source_topic` of an Adopted + CRC-eligible, non-superseded
 *      TopicRelationship whose `target_topic` has such a claim. One hop
 *      only, mirroring jurisdiction-clarification.ts's own
 *      `goalNeedsJurisdiction` shape exactly -- no recursive traversal.
 *   B. That dependency string is registered 'askable_in_crc' in
 *      dependency-askability.ts -- an additional, narrow safety gate
 *      jurisdiction's own rule doesn't need (jurisdiction is a formal
 *      ApplicabilityRequirement, not a governance-metadata dependency
 *      string; this module's own trigger IS a dependency string, so it
 *      checks its own registry before ever proposing a question about it).
 *   C. `human_contribution_description` is NEITHER confirmed NOR declined.
 *   D. A minimal workflow anchor exists: at least one active ToolMention
 *      (any resolution kind, including unresolved_alias) OR at least one
 *      active, affirmative (confirmed/confirmed_absent) ScopedObservation.
 *      Reproduces `phase.ts`'s own `hasEngagedWorkflowTopic` semantics
 *      (Phase 1->2's own low bar) independently, not imported -- phase.ts
 *      is not part of this milestone's authorized diff surface, and this
 *      is exactly the same "reproduce the shape, don't cross-import"
 *      discipline jurisdiction-clarification.ts already uses for
 *      Retrieval's own relationship gate. Deliberately NOT full Gate 1 --
 *      the diagnostic found no jurisdiction-specific (or, by the same
 *      reasoning, contribution-specific) reason to wait for Gate 1's own
 *      tool-canonical-identity/intended-use bar; a bare tool mention or a
 *      single confirmed observation is enough workflow context to ask what
 *      the user personally did.
 *   E. human_contribution_clarification_asked is false (enforced in
 *      boundaries.ts, not duplicated here -- same
 *      `alreadyAskedThisConversation` parameter shape jurisdiction and
 *      Discovery both already use).
 *
 * Precedence (run-turn.ts, unchanged structure, PM-approved order):
 * jurisdiction clarification wins the shared attempt-#1 slot over this
 * module when both are eligible the same turn -- claims are not even
 * formally applicable until jurisdiction is confirmed, so asking about
 * contribution first risks the user describing their workflow in detail
 * for a claim set that may turn out inapplicable. This module in turn
 * wins over Commercial Readiness Discovery -- this serves an
 * already-stated user goal exactly like jurisdiction does; Discovery is
 * opportunistic education.
 *
 * No Retrieval call, no LLM call (same load-bearing boundary as
 * jurisdiction-clarification.ts): this module does NOT call `retrieve()`
 * or import `lookupRelatedTopicClaims`/`lookupTopicClaims`/anything under
 * `lib/bounded-interpretation/`. It reproduces only the narrow
 * governance-gate SHAPE those modules already enforce.
 *
 * Acquisition only, never a legal conclusion: this module's own
 * eligibility check, and the fact it causes to be captured, describe WHAT
 * the user says they did -- never WHETHER that satisfies any copyright
 * threshold. Capturing the fact does NOT resolve the governed
 * `unresolved_project_dependencies` entry -- that string remains on the
 * claim regardless of what the user answers (see build-bounded-
 * interpretation.ts's own H5 addition for the bounded, deterministic,
 * non-conclusive use this captured fact is put to).
 */

import type { GoalCategory, Phase, ScopedObservation, StructuredUnderstanding, ToolMention } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import { isDependencyAskableInCrc } from './dependency-askability'

const HUMAN_CONTRIBUTION_DEPENDENCY = 'human_contribution_description'

/**
 * PM-approved exact copy (H3/Section 8): "Beyond entering prompts, what did
 * you personally do to shape the final video — for example selecting
 * takes, arranging the sequence, editing, or compositing?" Fixed,
 * catalog-owned, never LLM-generated -- same "trivial verbatim lookup"
 * discipline as JURISDICTION_CLARIFICATION_QUESTION.
 */
export const HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION =
  'Beyond entering prompts, what did you personally do to shape the final video — for example selecting takes, arranging the sequence, editing, or compositing?'

export interface HumanContributionClarificationEligibilityResult {
  needs_human_contribution: boolean
  human_contribution_unresolved: boolean
  eligible: boolean
}

function claimNeedsHumanContribution(claim: TopicClaim): boolean {
  return (
    claim.lifecycle === 'Adopted' &&
    claim.crc_eligible === 'Yes' &&
    claim.superseded_by === null &&
    claim.unresolved_project_dependencies.includes(HUMAN_CONTRIBUTION_DEPENDENCY) &&
    isDependencyAskableInCrc(HUMAN_CONTRIBUTION_DEPENDENCY)
  )
}

/** One-hop relationship gate, reproducing jurisdiction-clarification.ts's own `eligibleRelationshipsFor` shape exactly. */
function eligibleRelationshipsFor(category: GoalCategory, relationships: TopicRelationship[]): TopicRelationship[] {
  return relationships.filter(
    (r) => r.source_topic === category && r.superseded_by === null && r.lifecycle === 'Adopted' && r.crc_eligible === 'Yes',
  )
}

function goalNeedsHumanContribution(category: GoalCategory, topicClaims: TopicClaim[], relationships: TopicRelationship[]): boolean {
  const directlyNeeds = topicClaims.some((c) => c.topic === category && claimNeedsHumanContribution(c))
  if (directlyNeeds) return true

  return eligibleRelationshipsFor(category, relationships).some((r) =>
    topicClaims.some((c) => c.topic === r.target_topic && c.superseded_by === null && claimNeedsHumanContribution(c)),
  )
}

/**
 * Minimal workflow anchor (condition D). Reproduces `phase.ts`'s own
 * `hasEngagedWorkflowTopic` semantics independently -- see this module's
 * own header for why it is not imported. Any active ToolMention counts
 * regardless of resolution kind (naming a tool at all, even ambiguously,
 * is engagement); an affirmative ScopedObservation means confidence
 * 'confirmed' or 'confirmed_absent' only -- a lone decline/unknown
 * observation must not count as engagement, same reasoning phase.ts's own
 * comment gives.
 */
function hasMinimalWorkflowAnchor(su: StructuredUnderstanding): boolean {
  const hasActiveTool = su.tool_mentions.some((m: ToolMention) => m.superseded_by === null)
  const hasAffirmativeObservation = su.scoped_observations.some(
    (o: ScopedObservation) => o.superseded_by === null && (o.confidence === 'confirmed' || o.confidence === 'confirmed_absent'),
  )
  return hasActiveTool || hasAffirmativeObservation
}

export function evaluateHumanContributionClarificationEligibility(
  understanding: StructuredUnderstanding,
  topicClaims: TopicClaim[],
  alreadyAskedThisConversation: boolean,
  relationships: TopicRelationship[] = [],
): HumanContributionClarificationEligibilityResult {
  const activeConfirmedGoals = understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')
  const needsHumanContribution = activeConfirmedGoals.some((g) => goalNeedsHumanContribution(g.category, topicClaims, relationships))

  const contributionState = understanding.project_facts.human_contribution_description.attestation.state
  const humanContributionUnresolved = contributionState !== 'confirmed' && contributionState !== 'declined'

  const eligible =
    needsHumanContribution && humanContributionUnresolved && !alreadyAskedThisConversation && hasMinimalWorkflowAnchor(understanding)

  return { needs_human_contribution: needsHumanContribution, human_contribution_unresolved: humanContributionUnresolved, eligible }
}

/**
 * Deterministically constructs the CandidateQuestionProposal -- the exact
 * same shape the ordinary generator produces, for run-turn.ts to feed
 * through the unchanged validate -> Constraint A -> Constraint B pipeline.
 * target_signal_id is always null, same reasoning as
 * buildJurisdictionClarificationProposal.
 */
export function buildHumanContributionClarificationProposal(phase: Phase): CandidateQuestionProposal {
  return {
    question_text: HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION,
    question_kind: 'human_contribution_clarification',
    target_signal_id: null,
    phase,
  }
}
