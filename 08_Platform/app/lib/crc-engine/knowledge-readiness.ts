/**
 * Generic Living-Knowledge readiness/acquisition (Track B — Generic
 * Living-Knowledge Readiness/Askability milestone, 2026-08-20, following
 * the CRC 503/Living Knowledge Architecture Diagnostic of the same date).
 *
 * Answers exactly one question, for an ALREADY-RELEVANT/ALREADY-CANDIDATE
 * governed claim: does it have an unresolved dependency CRC is permitted
 * to proactively ask about, and hasn't already exhausted its acquisition
 * budget for? If so, produce ONE deterministic candidate question run-turn.ts
 * may use as a bounded, last-resort forced attempt, at the exact point
 * ordinary bounded candidate search would otherwise declare
 * `questioning_exhausted` -- never earlier, never stealing a turn from
 * jurisdiction/human-contribution/Commercial Readiness Discovery/ordinary
 * organic candidate generation, all of which remain entirely unchanged and
 * untouched by this module.
 *
 * Deliberately DOES NOT solve discovered relevance (Track A / "Path B" in
 * this project's own architecture-diagnostic vocabulary): "already-
 * relevant/candidate" here means exactly what `lookupTopicClaims`
 * (lib/retrieval-engine/lookup-topic-claims.ts) itself would treat as
 * `anyEligible` for an ACTIVE, CONFIRMED UserGoal -- topic-matched,
 * provider-scope-matched, Adopted, CRC-eligible, non-superseded. A claim
 * that is not yet a Retrieval candidate at all (e.g. because no matching
 * UserGoal exists) is out of scope for this module entirely, same as it
 * is for the two existing dedicated clarification modules
 * (jurisdiction-clarification.ts, human-contribution-clarification.ts)
 * this file is a generalized sibling of.
 *
 * `applicability_requirements` is deliberately NOT evaluated here (Section
 * 21 of this milestone's own task spec: "Applicability remains separate").
 * This module's own claim-candidacy gate mirrors `lookupTopicClaims`'s
 * `anyEligible` computation (topic + provider_scope + lifecycle +
 * crc_eligible + supersession), never its `anyApplicable` step -- a
 * claim's FORMAL applicability requirements and its unresolved
 * ACQUISITION dependencies are two different, orthogonal governance
 * concepts (see lib/retrieval-engine/types.ts's own header comment on
 * `unresolved_project_dependencies` for why they were kept structurally
 * separate from the start).
 *
 * No Retrieval import: `providerScopeMatches` is NOT exported from
 * lookup-topic-claims.ts (module-private by design), so this file
 * reimplements the identical two-line predicate rather than either
 * exporting a new cross-boundary symbol from Retrieval or importing
 * Retrieval's own orchestration (`retrieve()`/`lookupTopicClaims()`) into
 * the Interview/CRC-engine layer -- the same "reproduce the narrow
 * governance-gate SHAPE, never cross-import the orchestration" discipline
 * jurisdiction-clarification.ts and human-contribution-clarification.ts
 * already independently established for the topic/lifecycle/eligibility/
 * one-hop-relationship gate. This module does NOT reproduce the one-hop
 * TopicRelationship traversal those two files each independently
 * implement: no currently-relevant claim (stock or otherwise) reaches this
 * module's own target claim set only via a relationship (no
 * `third_party_source_rights`-targeting TopicRelationship is approved --
 * see THIRD_PARTY_SOURCE_ASSETS_ROUTING_ARCHITECTURE.md), so adding a
 * THIRD independent reimplementation of that traversal for zero current
 * benefit was judged unjustified scope; a future claim reachable only via
 * a relationship is out of scope for this module until a real case
 * justifies extending it (disclosed here, not silently absent).
 *
 * Vocabulary relationship to FollowUpNeed (boundaries.ts) -- Option A from
 * this milestone's own task spec, chosen deliberately: FollowUpNeed
 * remains separate, legacy, interview-side bookkeeping for the ordinary
 * LLM candidate generator's own narrow duplicate-question cases
 * (asset_provider_usage/asset_provider_license/tool_plan_tier). This
 * module's own dependency identifiers are GOVERNED strings
 * (`TopicClaim.unresolved_project_dependencies`, authored in
 * GOVERNED-CLAIMS.md), a categorically different vocabulary the
 * architecture diagnostic found has NO current 1:1 mapping onto
 * FollowUpNeed's values (see dependency-askability.ts's own header for the
 * exact naming-mismatch finding). The two systems are never aliased into
 * each other and use separate BoundaryState cap records
 * (`follow_ups_used` vs. `knowledge_readiness_used`) precisely so a future
 * engineer can never accidentally collapse them.
 *
 * `human_contribution_description` is explicitly excluded from this
 * module's own processing (see HANDLED_BY_DEDICATED_MODULE below) -- it
 * remains entirely owned by human-contribution-clarification.ts, unmigrated,
 * still first in run-turn.ts's precedence chain. This is a structural
 * guarantee against ever double-asking it, not merely a documented
 * intention.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { Phase } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { BoundaryState } from '@/lib/interview-engine/boundaries'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { getAskabilityEntry, type ReadinessTarget } from './dependency-askability'

/**
 * Dependencies owned entirely by a pre-existing, dedicated deterministic
 * module -- never independently processed by the generic path, regardless
 * of what dependency-askability.ts says about them (defense in depth: even
 * if a future edit to that registry ever added a `generic_acquisition`
 * strategy to one of these entries by mistake, this exclusion is checked
 * first and wins).
 */
const HANDLED_BY_DEDICATED_MODULE = new Set<string>(['human_contribution_description'])

export interface KnowledgeReadinessNeed {
  /** Every currently-relevant claim contributing this same need -- see the dedupe-by-target-key discipline below. */
  claim_ids: string[]
  dependency_id: string
  target: ReadinessTarget
  question_text: string
  /** The compound BoundaryState.knowledge_readiness_used cap key this need will be evaluated/capped against. */
  attempt_key: string
  /** The specific AssetProviderMention this need is scoped to, for an `asset_provider_field` target -- null for a `project_fact` target. */
  provider_mention_id: string | null
}

/** Mirrors lookup-topic-claims.ts's own private providerScopeMatches exactly -- see this module's own header for why it is reimplemented, not imported. */
function providerScopeMatches(claim: TopicClaim, activeProviderIds: readonly string[]): boolean {
  if (claim.provider_scope === null) return true
  return claim.provider_scope.some((p) => activeProviderIds.includes(p))
}

/**
 * Mirrors `lookupTopicClaims`'s own `anyEligible` gate exactly (topic +
 * provider_scope + lifecycle + crc_eligible + non-superseded) --
 * deliberately NOT `anyApplicable` (applicability_requirements is out of
 * scope for this milestone; see this module's own header).
 */
function isReadinessCandidateClaim(claim: TopicClaim, activeGoalCategories: ReadonlySet<string>, activeProviderIds: readonly string[]): boolean {
  return (
    claim.superseded_by === null &&
    activeGoalCategories.has(claim.topic) &&
    claim.lifecycle === 'Adopted' &&
    claim.crc_eligible === 'Yes' &&
    providerScopeMatches(claim, activeProviderIds)
  )
}

function attestedFieldState(understanding: StructuredUnderstanding, target: ReadinessTarget, providerMentionId: string | null): 'confirmed' | 'confirmed_absent' | 'unresolved_no_visibility' | 'unknown' | 'declined' {
  if (target.kind === 'project_fact') {
    return understanding.project_facts[target.field].attestation.state
  }
  const mention = understanding.asset_provider_mentions.find((m) => m.mention_id === providerMentionId)
  if (!mention) return 'unknown'
  return target.field === 'usage' ? mention.usage.state : mention.license.state
}

/**
 * Every AssetProviderMention this claim's dependency could plausibly be
 * asking about right now -- active, canonically resolved, and (when the
 * claim itself is provider-scoped) restricted to that scope. A generic
 * (provider_scope: null) claim considers every currently active,
 * canonical provider mention -- e.g. a generic third_party_source_rights
 * claim with an askable, provider-shaped dependency would produce one
 * need per active provider, never conflating Getty's state with iStock's.
 */
function relevantProviderMentions(understanding: StructuredUnderstanding, claim: TopicClaim) {
  return understanding.asset_provider_mentions.filter(
    (m) =>
      m.superseded_by === null &&
      m.resolution.kind === 'canonical' &&
      (claim.provider_scope === null || claim.provider_scope.some((p) => p === (m.resolution as { kind: 'canonical'; identifier: string }).identifier)),
  )
}

/**
 * Derives, fresh every turn (no persistence beyond the existing
 * BoundaryState cap record), the set of currently-outstanding knowledge
 * readiness acquisition needs. Deduplicated by `attempt_key`: multiple
 * claims sharing the same dependency + same target produce exactly ONE
 * need, with `claim_ids` accumulating every contributing claim -- e.g.
 * three copyright claims all requiring the same project-fact dependency
 * would collapse to one need (moot in practice today, since
 * human_contribution_description is excluded -- see this module's own
 * header -- but the dedupe logic is exercised by synthetic tests using a
 * dependency that IS registered for the generic path).
 */
export function deriveKnowledgeReadinessNeeds(understanding: StructuredUnderstanding, topicClaims: TopicClaim[], boundaryState: BoundaryState): KnowledgeReadinessNeed[] {
  const activeGoalCategories = new Set(understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category))
  const activeProviderIds = understanding.asset_provider_mentions.filter((m) => m.superseded_by === null && m.resolution.kind === 'canonical').map((m) => (m.resolution as { kind: 'canonical'; identifier: string }).identifier)

  const needsByKey = new Map<string, KnowledgeReadinessNeed>()

  for (const claim of topicClaims) {
    if (!isReadinessCandidateClaim(claim, activeGoalCategories, activeProviderIds)) continue

    for (const dependencyId of claim.unresolved_project_dependencies) {
      if (HANDLED_BY_DEDICATED_MODULE.has(dependencyId)) continue

      const entry = getAskabilityEntry(dependencyId)
      if (!entry || entry.treatment !== 'askable_in_crc' || !entry.generic_acquisition) continue

      const { target, question_text, max_attempts } = entry.generic_acquisition
      const cap = max_attempts ?? 1

      if (target.kind === 'project_fact') {
        const state = attestedFieldState(understanding, target, null)
        if (state === 'confirmed' || state === 'confirmed_absent' || state === 'declined') continue
        const attemptKey = `readiness::project::${dependencyId}`
        if ((boundaryState.knowledge_readiness_used[attemptKey] ?? 0) >= cap) continue
        const existing = needsByKey.get(attemptKey)
        if (existing) existing.claim_ids.push(claim.claim_id)
        else needsByKey.set(attemptKey, { claim_ids: [claim.claim_id], dependency_id: dependencyId, target, question_text, attempt_key: attemptKey, provider_mention_id: null })
      } else {
        for (const mention of relevantProviderMentions(understanding, claim)) {
          const state = attestedFieldState(understanding, target, mention.mention_id)
          if (state === 'confirmed' || state === 'confirmed_absent' || state === 'declined') continue
          const attemptKey = `readiness::${mention.mention_id}::${dependencyId}`
          if ((boundaryState.knowledge_readiness_used[attemptKey] ?? 0) >= cap) continue
          const existing = needsByKey.get(attemptKey)
          if (existing) existing.claim_ids.push(claim.claim_id)
          else needsByKey.set(attemptKey, { claim_ids: [claim.claim_id], dependency_id: dependencyId, target, question_text, attempt_key: attemptKey, provider_mention_id: mention.mention_id })
        }
      }
    }
  }

  return Array.from(needsByKey.values())
}

/**
 * Deterministically constructs the CandidateQuestionProposal -- the exact
 * same shape the ordinary generator produces, for run-turn.ts to feed
 * through the unchanged validate -> Constraint A -> Constraint B pipeline
 * (no privileged pass: Constraint A can still suppress it, same as every
 * other deterministic candidate in this codebase). `target_signal_id` is
 * the provider mention's own id when scoped (already a real eligible
 * signal via deriveEligibleSignals -- see candidate-question.ts) or null
 * for a project-fact-scoped need.
 */
export function buildKnowledgeReadinessProposal(need: KnowledgeReadinessNeed, phase: Phase): CandidateQuestionProposal {
  return {
    question_text: need.question_text,
    question_kind: 'knowledge_readiness_acquisition',
    target_signal_id: need.provider_mention_id,
    phase,
    target_readiness_dependency_id: need.dependency_id,
  }
}
