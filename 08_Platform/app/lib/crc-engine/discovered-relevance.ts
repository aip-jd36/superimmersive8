/**
 * Generic discovered relevance / "Path B" (Track A — Generic Discovered
 * Relevance milestone, 2026-08-21, following the CRC Living Knowledge
 * Architecture Diagnostic and its approved Track A/Track B split,
 * 2026-08-20). Answers exactly one question: when structured project
 * evidence satisfies an engineering/governance-authored relevance
 * trigger, which governed topics become relevant WITHOUT the user having
 * explicitly phrased a question in that topic?
 *
 * Canonical production case this module exists to close: a user names
 * iStock while stating a `commercial_use` goal ("I used iStock images...
 * Can I use that commercially?") -- extraction correctly produces a
 * confirmed `commercial_use` UserGoal and a confirmed, canonical iStock
 * AssetProviderMention, but (correctly, per the extractor's own
 * explicit-question-gating discipline) never a `third_party_source_rights`
 * UserGoal. Confirmed live in production (session `2dcf86f0-...`,
 * 2026-08-20): `lookupTopicClaims()` never even considered any stock
 * claim, because its own `activeGoalCategories` computation reads
 * `UserGoal.category` only.
 *
 * Explicit intent and discovered relevance are kept STRUCTURALLY
 * DISTINCT, never merged: this module never mutates or fabricates a
 * `UserGoal`. It produces a separate, additive representation
 * (`DiscoveredTopicOccurrence`) that downstream code (Retrieval, Track B
 * readiness) may additionally consult -- see `discoveredTopics` parameters
 * on `lookupTopicClaims`/`retrieve`/`deriveKnowledgeReadinessNeeds`, each
 * unioned with the existing explicit-goal-derived category set, never
 * replacing it. `computeRelevantTopics` below is the one place that
 * merges the two views for diagnostic/reporting purposes, and even there
 * an explicit goal for a topic always wins provenance over a discovered
 * occurrence of the SAME topic (Section 7 of this milestone's own task
 * spec: "do not create duplicate relevance").
 *
 * Fail-closed by construction, mirroring `provider_scope`'s own existing
 * discipline (types.ts: "an author must make an explicit, reviewed
 * choice... never fall through an implicit default"):
 *   - no trigger registered for a given source kind -> no discovered relevance
 *   - unresolved provider alias -> no discovered relevance (only a
 *     canonical, confirmed AssetProviderMention counts)
 *   - superseded mention -> no discovered relevance
 *   - no active goal matching the trigger's own `allowed_parent_goals` ->
 *     no discovered relevance (Option D from the task's own Section 20 --
 *     the ONLY evidenced case is `commercial_use`; no other parent goal is
 *     configured without a real, evidenced case)
 *   - no Adopted + CRC-eligible TopicClaim exists for the trigger's own
 *     topic at all (Option B from Section 6) -> no discovered relevance,
 *     even if every other condition holds -- this is a GENERIC check (any
 *     provider_scope, since the two existing generic third_party_source_
 *     rights claims are provider-agnostic and should make the topic
 *     discoverable for ANY canonical provider, not just the three with
 *     their own provider-specific claim), never a per-provider special
 *     case
 *
 * No LLM call, no embeddings, no fuzzy/semantic matching anywhere in this
 * file -- every trigger evaluates deterministically over already-structured
 * `StructuredUnderstanding` state and already-governed `TopicClaim[]`
 * metadata. Claim text and `TopicRelationship.rationale` are never read by
 * this module (mirrors `rules.ts`'s own "rationale is never rendered"
 * discipline) -- a trigger cannot author itself from governance prose, and
 * governance markdown cannot inject code, only enable/disable an
 * engineering-authored trigger by existing (Section 6's Option B gate).
 *
 * One-hop only (Section 21): this module produces discovered TOPIC
 * relevance from structured evidence exactly once per turn -- it never
 * consumes its own output as input to discover a second-order topic, and
 * it does not itself traverse `TopicRelationship` (that remains Retrieval's
 * own, already-designed, already-gated one-hop mechanism, operating on
 * whatever active topic set -- explicit or discovered -- it is handed;
 * no `third_party_source_rights`-sourced relationship is approved today,
 * so this composition currently has no live effect, disclosed here rather
 * than silently assumed).
 *
 * Ownership/location: `lib/crc-engine/`, mirroring `knowledge-readiness.ts`'s
 * own precedent exactly -- this is the orchestration layer already
 * established as the correct place for code that needs both Interview
 * Engine (`StructuredUnderstanding`, `GoalCategory`) and Retrieval
 * (`TopicClaim`) TYPES, without either subsystem importing the other's
 * logic (jurisdiction-clarification.ts/human-contribution-clarification.ts
 * already set this precedent for the two-type-boundary case; this module
 * is a direct sibling, not a new architectural layer).
 */

import type { GoalCategory, StructuredUnderstanding } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

/**
 * Closed today to the one structurally-supported evidence type. Adding a
 * genuinely new source kind (e.g. a future `recognizable_person_present`
 * fact) requires (a) a new `StructuredUnderstanding` fact/observation type
 * to exist first (a one-time, per-fact-shape engineering cost, not a
 * per-domain one -- same discipline as Track B's own AssetProviderMention.
 * usage/license fields) and (b) one new `case` in
 * `evaluateTriggerOccurrences` below -- neither touches `run-turn.ts`,
 * `retrieve()`, or any other orchestration call site, which is exactly
 * the scalability property Section 32 of this milestone's task spec asks
 * to prove (see the synthetic extensibility test in this module's own
 * test file).
 */
export type DiscoveredRelevanceSourceKind = 'asset_provider_mention'

export interface DiscoveredRelevanceTrigger {
  trigger_id: string
  source_kind: DiscoveredRelevanceSourceKind
  topic: GoalCategory
  /**
   * Option D (task Section 20): engineering/governance-authored, never
   * inferred. Populated ONLY with parent goal categories that have real,
   * evidenced justification -- see this module's own header for the exact
   * production case `commercial_use` is drawn from. Do not add a category
   * here speculatively.
   */
  allowed_parent_goals: GoalCategory[]
}

/**
 * Canonical first (and, as of this milestone, only) trigger: a confirmed,
 * canonical AssetProviderMention -- for ANY of the four canonical
 * provider ids (getty/istock/shutterstock/adobe-stock), never a
 * provider-specific branch -- discovers `third_party_source_rights`
 * relevance, but ONLY when an active `commercial_use` goal already
 * exists. This directly, and only, models the confirmed production
 * failure case; it does not generalize to other parent goals without a
 * new evidenced case (Section 20: "Do not guess").
 */
const DISCOVERED_RELEVANCE_TRIGGERS: readonly DiscoveredRelevanceTrigger[] = [
  {
    trigger_id: 'asset_provider_mention_to_third_party_source_rights',
    source_kind: 'asset_provider_mention',
    topic: 'third_party_source_rights',
    allowed_parent_goals: ['commercial_use'],
  },
]

export interface DiscoveredTopicOccurrence {
  topic: GoalCategory
  trigger_id: string
  source_kind: DiscoveredRelevanceSourceKind
  /** The specific structured-fact id that satisfied the trigger (e.g. an AssetProviderMention.mention_id). */
  source_id: string
}

/**
 * Option B (task Section 6): the topic must have at least one Adopted +
 * CRC-eligible, non-superseded TopicClaim -- of ANY provider_scope, since
 * the two generic (provider_scope: null) third_party_source_rights claims
 * are provider-agnostic and should make the topic discoverable regardless
 * of which specific canonical provider triggered it. This is deliberately
 * NOT a provider-specific check (never `claim.provider_scope?.includes(x)`
 * here) -- provider_scope narrowing remains exclusively Retrieval's own,
 * already-designed job (see `providerScopeMatches` in
 * lookup-topic-claims.ts, untouched by this milestone), applied
 * downstream of discovery, never inside it.
 */
function hasGovernedClaimForTopic(topic: GoalCategory, topicClaims: TopicClaim[]): boolean {
  return topicClaims.some((c) => c.topic === topic && c.superseded_by === null && c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
}

function activeConfirmedGoalCategories(understanding: StructuredUnderstanding): Set<GoalCategory> {
  return new Set(understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category))
}

/**
 * Derives, fresh every turn (never persisted -- see this module's own
 * header, Section 30 of the task spec), every discovered-topic occurrence
 * currently satisfied by structured evidence. Not deduplicated by topic
 * (multiple providers can each independently satisfy the same trigger,
 * e.g. iStock AND Getty both mentioned -- see `discoveredTopicCategories`
 * below for the deduplicated view Retrieval/Track B actually consume, and
 * `computeRelevantTopics` for the provenance-preserving diagnostic view).
 */
export function deriveDiscoveredTopicOccurrences(understanding: StructuredUnderstanding, topicClaims: TopicClaim[]): DiscoveredTopicOccurrence[] {
  const activeGoals = activeConfirmedGoalCategories(understanding)
  const occurrences: DiscoveredTopicOccurrence[] = []

  for (const trigger of DISCOVERED_RELEVANCE_TRIGGERS) {
    if (!trigger.allowed_parent_goals.some((g) => activeGoals.has(g))) continue
    if (!hasGovernedClaimForTopic(trigger.topic, topicClaims)) continue

    if (trigger.source_kind === 'asset_provider_mention') {
      for (const mention of understanding.asset_provider_mentions) {
        if (mention.superseded_by !== null) continue
        if (mention.resolution.kind !== 'canonical') continue
        if (mention.confidence !== 'confirmed') continue
        occurrences.push({ topic: trigger.topic, trigger_id: trigger.trigger_id, source_kind: trigger.source_kind, source_id: mention.mention_id })
      }
    }
  }

  return occurrences
}

/** Deduplicated topic list, for feeding directly into `retrieve()`'s/`lookupTopicClaims()`'s/`deriveKnowledgeReadinessNeeds()`'s additive `discoveredTopics` parameters. */
export function discoveredTopicCategories(occurrences: DiscoveredTopicOccurrence[]): GoalCategory[] {
  return Array.from(new Set(occurrences.map((o) => o.topic)))
}

export type TopicOrigin = 'explicit_goal' | 'discovered'

export interface RelevantTopic {
  topic: GoalCategory
  origin: TopicOrigin
  /** UserGoal.goal_id[] for an explicit topic; AssetProviderMention.mention_id[] (or other future source-fact id[]) for a discovered one. */
  source_ids: string[]
}

/**
 * Diagnostic/reporting view only (Section 23 of the task spec) -- not
 * consumed by Retrieval or Track B, which each read the narrower
 * `discoveredTopicCategories` list directly. Explicit provenance always
 * wins when the same topic is both explicitly asked AND independently
 * discovered this same turn (Section 7: "do not create duplicate
 * relevance") -- the discovered occurrence is simply omitted from this
 * view in that case, never merged into or overwriting the explicit entry.
 */
export function computeRelevantTopics(understanding: StructuredUnderstanding, topicClaims: TopicClaim[]): RelevantTopic[] {
  const explicitGoals = understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')
  const explicitByTopic = new Map<GoalCategory, string[]>()
  for (const g of explicitGoals) {
    explicitByTopic.set(g.category, [...(explicitByTopic.get(g.category) ?? []), g.goal_id])
  }

  const discoveredByTopic = new Map<GoalCategory, string[]>()
  for (const o of deriveDiscoveredTopicOccurrences(understanding, topicClaims)) {
    discoveredByTopic.set(o.topic, [...(discoveredByTopic.get(o.topic) ?? []), o.source_id])
  }

  const result: RelevantTopic[] = []
  for (const [topic, source_ids] of explicitByTopic) {
    result.push({ topic, origin: 'explicit_goal', source_ids })
  }
  for (const [topic, source_ids] of discoveredByTopic) {
    if (explicitByTopic.has(topic)) continue
    result.push({ topic, origin: 'discovered', source_ids })
  }
  return result
}
