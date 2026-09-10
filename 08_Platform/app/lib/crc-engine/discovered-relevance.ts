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

import type { ContentPresenceCategory, GoalCategory, StructuredUnderstanding } from '@/types/interview-engine'
import type { DiscoveredTopicOccurrence, TopicClaim } from '@/lib/retrieval-engine/types'

/**
 * Closed to the structurally-supported evidence types that actually exist.
 * `content_presence_mention` (Bridge #2 — Synthetic-Person Observable Fact
 * -> Track A Likeness Discovered Relevance, 2026-09-11) is the second entry,
 * added under the exact extension discipline this module's own prior
 * milestone (Track A — Generic Discovered Relevance, 2026-08-21) predicted
 * and proved the shape for (see that milestone's "synthetic extensibility"
 * test in this module's own test file): the fact/observation type
 * (`ContentPresenceMention`) already existed on `StructuredUnderstanding`
 * before this milestone (Content-Presence Correction Safety — Append-Only
 * Closure, 2026-08-28, and earlier), so this milestone required only (a)
 * widening this union and (b) one new `case` in
 * `deriveDiscoveredTopicOccurrences` below -- neither touched `run-turn.ts`,
 * `retrieve()`, `lookupDiscoveredTopicClaims`, or any other orchestration
 * call site, exactly the scalability property the 2026-08-21 milestone's own
 * task spec asked to prove.
 *
 * Adding a genuinely NEW source kind still requires (a) a new
 * `StructuredUnderstanding` fact/observation type to exist first (a one-time,
 * per-fact-shape engineering cost, not a per-domain one) and (b) one new
 * `case` here -- this module's own generic dispatch loop is unchanged in
 * shape by this milestone, only in how many source kinds it recognizes.
 */
export type DiscoveredRelevanceSourceKind = 'asset_provider_mention' | 'content_presence_mention'

/**
 * Bridge #2's own qualifying observable-fact categories: a synthetic-person
 * content-presence mention is only "about a person" when its `category` is
 * one of these two (both of `ContentPresenceCategory`'s current values,
 * spelled out explicitly rather than relying on that being the full set
 * today -- so a future, non-person `ContentPresenceCategory` addition does
 * not silently become likeness-qualifying without an explicit registry
 * decision). Generic observable-FACT gating only -- no statute, no
 * jurisdiction, no "recognizable" distinction; see this module's own header
 * for the observable-fact-vs-legal-conclusion boundary this trigger is
 * built to respect.
 */
const LIKENESS_QUALIFYING_CONTENT_PRESENCE_CATEGORIES: readonly ContentPresenceCategory[] = ['person_visual_presence', 'person_voice_presence']

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
 * First trigger (Track A — Generic Discovered Relevance, 2026-08-21): a
 * confirmed, canonical AssetProviderMention -- for ANY of the four
 * canonical provider ids (getty/istock/shutterstock/adobe-stock), never a
 * provider-specific branch -- discovers `third_party_source_rights`
 * relevance, but ONLY when an active `commercial_use` goal already
 * exists. This directly, and only, models the confirmed production
 * failure case; it does not generalize to other parent goals without a
 * new evidenced case (Section 20: "Do not guess").
 *
 * Second trigger (Bridge #2, 2026-09-11): a confirmed, non-superseded
 * `ContentPresenceMention` describing a SYNTHETIC person's visual or voice
 * presence -- again only when an active `commercial_use` goal already
 * exists -- discovers `likeness` relevance. This closes the production gap
 * where a user describes a synthetic performer in a commercial-use question
 * (e.g. "Are there any rules I should know about before using this
 * commercially?" -- now correctly classified `commercial_use` since Bridge
 * #1) but never phrases a separate, explicit `likeness`-shaped question, so
 * `likeness`-topic governed knowledge (e.g. NY GBL §396-b synthetic
 * performer disclosure) was never even considered relevant. Deliberately
 * generic and NON-statute-specific, exactly mirroring the first trigger's
 * own discipline: this trigger encodes only "a synthetic person is
 * described, in a commercial-use context" -- an OBSERVABLE FACT -- never
 * any statute's own legal elements (jurisdiction, "recognizable as any
 * identifiable natural performer," actual knowledge, duty-holder status,
 * exemption). Those remain exclusively the governed `TopicClaim`'s own
 * `applicability_requirements`/`unresolved_project_dependencies`, evaluated
 * entirely downstream of this module, unchanged by this milestone. A bare
 * `commercial_use` -> `likeness` `TopicRelationship` was explicitly
 * evaluated and rejected as over-broad (it would fire for EVERY
 * commercial_use goal regardless of whether any person appears at all) --
 * this trigger is the narrower, evidence-gated alternative Bridge #2 exists
 * to implement instead.
 */
const DISCOVERED_RELEVANCE_TRIGGERS: readonly DiscoveredRelevanceTrigger[] = [
  {
    trigger_id: 'asset_provider_mention_to_third_party_source_rights',
    source_kind: 'asset_provider_mention',
    topic: 'third_party_source_rights',
    allowed_parent_goals: ['commercial_use'],
  },
  {
    trigger_id: 'synthetic_person_content_presence_to_likeness',
    source_kind: 'content_presence_mention',
    topic: 'likeness',
    allowed_parent_goals: ['commercial_use'],
  },
]

/**
 * The shape produced here (`DiscoveredTopicOccurrence`) is defined in
 * `lib/retrieval-engine/types.ts`, not this file -- mirrors this file's own
 * existing precedent of consuming `TopicClaim` from that same module
 * one-way, rather than Retrieval ever importing this file. See that type's
 * own doc comment for the full field-by-field rationale, in particular
 * `source_goal_category` and why a trigger with more than one
 * simultaneously-satisfied `allowed_parent_goals` entry produces one
 * occurrence per satisfied goal rather than collapsing them.
 */

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
    // Explicit-precedence suppression (Track C — Discovered-Topic Goal
    // Provenance, 2026-08-21): when the trigger's OWN topic is already an
    // active, explicit, confirmed goal category, the user already asked
    // about this topic directly -- Retrieval's existing exact-topic path
    // already covers it. Discovering it a second time here would produce a
    // second, redundant RetrievalResult for the same claim (once exact_topic,
    // once discovered_topic) and, before this fix, a redundant readiness
    // topic. Mirrors `computeRelevantTopics`'s own pre-existing "explicit
    // always wins over discovered for the SAME topic" precedence (see that
    // function's own doc comment) -- applied here, at the source, so every
    // consumer of this function's output (discoveredTopicCategories for
    // Track B, and the richer occurrence list for Retrieval) inherits it
    // for free, rather than each needing its own copy of this rule.
    if (activeGoals.has(trigger.topic)) continue
    if (!hasGovernedClaimForTopic(trigger.topic, topicClaims)) continue

    // Satisfied parent goals, not just "is at least one active" (Track C):
    // one occurrence is emitted per (satisfied parent goal x qualifying
    // mention), preserving which SPECIFIC explicit goal authorized each
    // occurrence rather than a single collapsed boolean. For the current
    // single-entry `commercial_use` trigger this is always at most one
    // category; a future trigger with more than one allowed parent goal
    // that are simultaneously active correctly produces one occurrence per
    // satisfied goal, never an occurrence that ambiguously "belongs to"
    // more than one category at once.
    const satisfiedParentGoals = trigger.allowed_parent_goals.filter((g) => activeGoals.has(g))
    if (satisfiedParentGoals.length === 0) continue

    if (trigger.source_kind === 'asset_provider_mention') {
      for (const mention of understanding.asset_provider_mentions) {
        if (mention.superseded_by !== null) continue
        if (mention.resolution.kind !== 'canonical') continue
        if (mention.confidence !== 'confirmed') continue
        for (const sourceGoalCategory of satisfiedParentGoals) {
          occurrences.push({
            topic: trigger.topic,
            trigger_id: trigger.trigger_id,
            source_kind: trigger.source_kind,
            source_id: mention.mention_id,
            source_goal_category: sourceGoalCategory,
          })
        }
      }
    }

    // Bridge #2 (2026-09-11): mirrors the asset_provider_mention branch's
    // own shape exactly -- enumerate qualifying structured mentions, emit
    // one occurrence per (qualifying mention x satisfied parent goal).
    // "Qualifying" is the OBSERVABLE FACT only (superseded_by null,
    // confirmed, a person-presence category, synthetic) -- never a legal
    // characterization. `ContentPresenceMention`s are append-only (no
    // extraction-driven supersession exists today -- see that type's own
    // doc comment, "Content-Presence Correction Safety — Append-Only
    // Closure," 2026-08-28), so a later real-person correction adds a
    // SECOND, separate mention rather than retracting an earlier synthetic
    // one; this trigger therefore keeps firing on the still-non-superseded
    // synthetic mention even after such a correction. Deliberately not
    // worked around here -- this is pre-existing, generic content-presence
    // correction-semantics debt (not introduced by this milestone, not
    // specific to this trigger), and the resulting effect is bounded to
    // TOPIC relevance/education only: every one of §396-b's own legal
    // dependencies (including `synthetic_performer_present_confirmed`
    // itself) remains independently unresolved/evidence-only downstream,
    // so this can only make likeness-topic governed knowledge discoverable
    // when it might not currently apply -- it can never fabricate a legal
    // conclusion. See this module's own test file for the direct proof.
    if (trigger.source_kind === 'content_presence_mention') {
      for (const mention of understanding.content_presence_mentions) {
        if (mention.superseded_by !== null) continue
        if (mention.confidence !== 'confirmed') continue
        if (!LIKENESS_QUALIFYING_CONTENT_PRESENCE_CATEGORIES.includes(mention.category)) continue
        if (mention.real_or_synthetic !== 'synthetic') continue
        for (const sourceGoalCategory of satisfiedParentGoals) {
          occurrences.push({
            topic: trigger.topic,
            trigger_id: trigger.trigger_id,
            source_kind: trigger.source_kind,
            source_id: mention.mention_id,
            source_goal_category: sourceGoalCategory,
          })
        }
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
