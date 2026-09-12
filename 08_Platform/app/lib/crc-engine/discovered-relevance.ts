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
 * One-hop only (Section 21): the FIXED-TOPIC trigger loop below produces
 * discovered TOPIC relevance from structured evidence exactly once per
 * turn -- it never consumes its own output as input to discover a
 * second-order topic, and it does not itself traverse `TopicRelationship`.
 *
 * Generic Orthogonal-Fact Discovery — TopicRelationship Authorization
 * milestone (2026-09-11) ADDS a second, independent discovery mechanism
 * below (`deriveClaimTargetedDiscoveryOccurrences`) that DOES traverse
 * `TopicRelationship` -- in the REVERSE direction from
 * `lookupRelatedTopicClaims` (lib/retrieval-engine/lookup-topic-relationships.ts):
 * that function asks "goal G is active -- which topics may inform it?";
 * this one asks "claim X's orthogonal-fact discovery metadata matches --
 * which ACTIVE goal(s) is claim X's own topic governed to inform?" Same
 * underlying data (`TopicRelationship`, same `relationshipIsAdoptedAndCrcEligible`
 * gate, factored out of `lookup-topic-relationships.ts` specifically so
 * this consumer can never accidentally diverge from or weaken it), reverse
 * query direction. Still one-hop only: this new path never chains a
 * resulting discovered topic into a second lookup.
 *
 * This is the direct outcome of a dedicated architecture diagnostic
 * (2026-09-11, superseding an earlier, now-removed implementation that
 * hard-coded `distribution_territory_mention -> copyright_ownership` as a
 * FIXED-TOPIC trigger -- see git history for that diagnostic's full
 * reasoning). The diagnostic found: (1) an orthogonal structured fact (like
 * a distribution territory) does not itself determine a single valid topic
 * -- it can make claims under MANY different topics candidates
 * simultaneously; (2) the codebase already has a governed, PM-approved
 * contract for "topic X's claims may inform goal category Y"
 * (`TopicRelationship`), currently used only from the explicit-goal
 * direction; (3) reusing it in the reverse direction, rather than inventing
 * a parallel authorization mechanism or hard-coding a topic per orthogonal
 * fact type, is the correct, smallest generalization -- it requires zero
 * new types, zero new registries, and zero changes to `TopicRelationship`
 * itself or to its existing governance gates.
 *
 * Ownership/location: `lib/crc-engine/`, mirroring `knowledge-readiness.ts`'s
 * own precedent exactly -- this is the orchestration layer already
 * established as the correct place for code that needs both Interview
 * Engine (`StructuredUnderstanding`, `GoalCategory`) and Retrieval
 * (`TopicClaim`, `TopicRelationship`) TYPES, without either subsystem
 * importing the other's logic (jurisdiction-clarification.ts/
 * human-contribution-clarification.ts already set this precedent for the
 * two-type-boundary case; this module is a direct sibling, not a new
 * architectural layer). `territoryRelevanceMatches` and
 * `relationshipIsAdoptedAndCrcEligible` are imported one-way from
 * lib/retrieval-engine/ -- the same established dependency direction this
 * module already uses for the `TopicClaim` type.
 */

import type { ContentPresenceCategory, GoalCategory, StructuredUnderstanding } from '@/types/interview-engine'
import type { DiscoveredTopicOccurrence, KnowledgeTopic, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import { territoryRelevanceMatches } from '@/lib/retrieval-engine/lookup-topic-claims'
import { relationshipIsAdoptedAndCrcEligible } from '@/lib/retrieval-engine/lookup-topic-relationships'

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
 *
 * `distribution_territory_mention` (Generic Distribution/Output-Use
 * Territory Contract, 2026-09-11) is the third entry -- but, UNLIKE the two
 * above it, it is NOT a fixed-topic `DISCOVERED_RELEVANCE_TRIGGERS` entry.
 * An orthogonal structured fact (see this module's own header for the full
 * architecture-diagnostic rationale) does not itself determine a single
 * valid topic the way an asset-provider mention or a synthetic-person
 * content-presence mention does -- it can make claims under MANY different
 * topics candidates simultaneously, so it cannot be expressed as one
 * `{source_kind, topic}` pair. Occurrences carrying this `source_kind` are
 * instead produced by the separate `deriveClaimTargetedDiscoveryOccurrences`
 * function below, which derives `topic` from the MATCHING CLAIM's own topic
 * and authorizes `source_goal_category` via a governed `TopicRelationship`
 * lookup, never a fixed trigger config. This value remains part of the
 * union because it is still a real, valid value on
 * `DiscoveredTopicOccurrence.source_kind` -- just never as a
 * `DiscoveredRelevanceTrigger.source_kind`.
 */
export type DiscoveredRelevanceSourceKind = 'asset_provider_mention' | 'content_presence_mention' | 'distribution_territory_mention'

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
 *
 * DEFERRED ARCHITECTURAL DEBT (recorded, not fixed, by the Generic
 * Orthogonal-Fact Discovery milestone, 2026-09-11): neither of these two
 * triggers' `allowed_parent_goals: ['commercial_use']` is backed by a real
 * `TopicRelationship` record (`TOPIC_RELATIONSHIPS_FIXTURE` today contains
 * exactly one relationship, `copyright_ownership -> copyrightability`,
 * unrelated to either). They remain exactly as shipped -- engineering-
 * authored, evidenced by a real production case each, ungoverned by
 * `TopicRelationship`. Migrating them onto the newer, more general
 * `TopicRelationship`-authorized mechanism below is a legitimate future
 * consistency improvement but carries real regression risk to already-
 * shipped, production-live behavior and is explicitly OUT OF SCOPE for this
 * milestone, which proves the new generic path independently. Do not
 * migrate or refactor these two triggers as a side effect of touching this
 * file for the new path.
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

/**
 * Returns `Set<KnowledgeTopic>`, not `Set<GoalCategory>` (KnowledgeTopic
 * Foundation milestone, 2026-09-13) -- every VALUE inserted is still a real
 * `UserGoal.category` (`GoalCategory`), zero behavior change; only the
 * STATIC type widens, so this Set can be compared against a
 * `KnowledgeTopic`-typed `claim.topic`/`trigger.topic` below via `.has()`
 * without a compile error. A `GoalCategory` value is always a valid
 * `KnowledgeTopic` -- see that type's own module header, retrieval-engine/types.ts.
 */
function activeConfirmedGoalCategories(understanding: StructuredUnderstanding): Set<KnowledgeTopic> {
  return new Set<KnowledgeTopic>(understanding.user_goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category))
}

/**
 * Derives, fresh every turn (never persisted -- see this module's own
 * header, Section 30 of the task spec), every FIXED-TOPIC discovered-topic
 * occurrence currently satisfied by structured evidence. Not deduplicated
 * by topic (multiple providers can each independently satisfy the same
 * trigger, e.g. iStock AND Getty both mentioned -- see
 * `discoveredTopicCategories` below for the deduplicated view Retrieval/
 * Track B actually consume, and `computeRelevantTopics` for the
 * provenance-preserving diagnostic view).
 *
 * Renamed from `deriveDiscoveredTopicOccurrences` (Generic Orthogonal-Fact
 * Discovery — TopicRelationship Authorization milestone, 2026-09-11) --
 * this is now the fixed-topic-trigger half only, unmodified in behavior
 * from before this milestone. `deriveDiscoveredTopicOccurrences` (below)
 * is the new, still-exported, public entry point that merges this
 * function's output with `deriveClaimTargetedDiscoveryOccurrences`'s own.
 */
function deriveFixedTopicTriggerOccurrences(understanding: StructuredUnderstanding, topicClaims: TopicClaim[]): DiscoveredTopicOccurrence[] {
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

/**
 * Stable, generic provenance identifier for every occurrence produced by
 * `deriveClaimTargetedDiscoveryOccurrences` below -- deliberately NOT a
 * per-topic or per-relationship id, mirroring how a `DiscoveredRelevanceTrigger`'s
 * own `trigger_id` names the MECHANISM, not the specific topic/claim it
 * happened to reach this time. This mechanism is topic-agnostic by design
 * (see this module's own header) -- one stable id for the whole class of
 * "an orthogonal fact's claim-level discovery metadata matched, and a
 * governed `TopicRelationship` authorized the result" occurrences,
 * regardless of which claim/topic/relationship record was actually
 * involved.
 */
const CLAIM_TARGETED_TERRITORY_DISCOVERY_TRIGGER_ID = 'distribution_territory_mention_claim_targeted_discovery'

/**
 * Generic Orthogonal-Fact Discovery — TopicRelationship Authorization
 * milestone (2026-09-11). See this module's own header for the full
 * architecture rationale; this is the implementation.
 *
 * TWO INDEPENDENT AUTHORIZATION QUESTIONS, in order:
 *
 * (1) DISCOVERY CONDITION -- which claims does the orthogonal fact make
 *     CANDIDATES at all? For distribution territory: a claim whose own
 *     `geographic_relevance_scope` (governed, claim-level, deliberately
 *     inverted-null-polarity -- see that field's own doc comment,
 *     lib/retrieval-engine/types.ts) matches an active, confirmed,
 *     non-superseded `DistributionTerritoryMention` value, via
 *     `territoryRelevanceMatches` (the exact same literal-matching
 *     primitive, imported one-way, never reimplemented here). This
 *     function additionally requires the MATCHING claim itself to be
 *     `lifecycle: 'Adopted'` and `crc_eligible: 'Yes'` -- a stricter,
 *     simpler, fail-closed rule than the fixed-topic triggers' own
 *     topic-level `hasGovernedClaimForTopic` gate, chosen deliberately
 *     because the geographic opt-in here is itself claim-specific (unlike
 *     a bare provider mention, which says nothing about any particular
 *     claim) -- a Pending/unreviewed claim's own geographic opt-in must
 *     never make some OTHER, unrelated, already-Adopted claim of the same
 *     topic newly reachable through a territory fact that other claim
 *     never itself opted into.
 *
 * (2) GOAL-CONTRIBUTION AUTHORIZATION -- which REAL, ACTIVE, CONFIRMED,
 *     EXPLICIT `UserGoal` category may the matching claim's OWN topic
 *     legitimately inform? Answered ENTIRELY by governed `TopicRelationship`
 *     records with `target_topic === claim.topic`, each independently
 *     gated by `relationshipIsAdoptedAndCrcEligible` (the EXACT SAME
 *     governance gate `lookupRelatedTopicClaims` applies for the
 *     explicit-goal-driven direction -- imported, never re-derived) AND
 *     whose `source_topic` is among the caller's own active, confirmed
 *     explicit goal categories. Zero eligible relationships -> zero
 *     occurrences for that claim (fail-closed; never "pick the only active
 *     goal"). Multiple simultaneously-eligible relationships (e.g. two
 *     different active goals both independently authorized) -> one
 *     occurrence per authorized, active goal, mirroring the fixed-topic
 *     triggers' own "one occurrence per satisfied parent goal" precedent.
 *
 * These two questions are answered completely independently, in this
 * order, and NEITHER ever fabricates a `UserGoal` -- `source_goal_category`
 * always equals a real relationship's own `source_topic`, itself checked
 * against the real, active, confirmed goal set.
 *
 * EXPLICIT-PRECEDENCE SUPPRESSION applies per matching claim's own topic,
 * mirroring the fixed-topic triggers' identical rule: if the claim's topic
 * is ALREADY an active, explicit, confirmed goal category, ordinary
 * explicit retrieval already covers it -- no discovered occurrence is
 * produced for that claim, regardless of any relationship that might
 * otherwise authorize it.
 *
 * GEOGRAPHY IS ADDITIVE DISCOVERY ONLY: this function only ever CREATES
 * occurrences (candidates for `lookupDiscoveredTopicClaims`'s own,
 * completely unmodified, topic-scoped candidate enumeration downstream) --
 * it never filters, narrows, or removes a claim reachable through ANY other
 * path. A claim independently reachable via the fixed-topic triggers, an
 * explicit goal, or a governed `TopicRelationship` traversal is never
 * affected by this function returning nothing for it.
 *
 * `relationships` additive, defaults to `[]` at the one real call site
 * (`deriveDiscoveredTopicOccurrences` below) -- with no relationships
 * supplied, this function always returns `[]`, a true zero-behavior-change
 * default matching every other additive parameter in this codebase.
 */
export function deriveClaimTargetedDiscoveryOccurrences(
  understanding: StructuredUnderstanding,
  topicClaims: TopicClaim[],
  relationships: TopicRelationship[],
): DiscoveredTopicOccurrence[] {
  const activeGoals = activeConfirmedGoalCategories(understanding)
  const occurrences: DiscoveredTopicOccurrence[] = []

  const activeTerritoryMentions = understanding.distribution_territory_mentions.filter(
    (m) => m.superseded_by === null && m.confidence === 'confirmed',
  )
  if (activeTerritoryMentions.length === 0) return occurrences

  for (const claim of topicClaims) {
    if (claim.superseded_by !== null) continue
    if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue

    // Explicit-precedence suppression -- see this function's own header.
    if (activeGoals.has(claim.topic)) continue

    // Discovery condition (1): which active territory mentions, if any,
    // does THIS claim's own governed scope opt into? Checked per mention
    // (not per deduplicated value) so `source_id` below always names a
    // real, specific mention_id, exactly like the fixed-topic triggers'
    // own `source_id` provenance discipline.
    const matchingMentions = activeTerritoryMentions.filter((m) => territoryRelevanceMatches(claim, [m.value]))
    if (matchingMentions.length === 0) continue

    // Goal-contribution authorization (2): which active explicit goal(s)
    // is this claim's own topic governed to inform? Never a fabricated or
    // arbitrarily-chosen goal -- see this function's own header.
    const authorizedSourceGoals = relationships
      .filter((r) => r.target_topic === claim.topic && relationshipIsAdoptedAndCrcEligible(r) && activeGoals.has(r.source_topic))
      .map((r) => r.source_topic)
    if (authorizedSourceGoals.length === 0) continue

    for (const mention of matchingMentions) {
      for (const sourceGoalCategory of authorizedSourceGoals) {
        occurrences.push({
          topic: claim.topic,
          trigger_id: CLAIM_TARGETED_TERRITORY_DISCOVERY_TRIGGER_ID,
          source_kind: 'distribution_territory_mention',
          source_id: mention.mention_id,
          source_goal_category: sourceGoalCategory,
        })
      }
    }
  }

  return occurrences
}

/**
 * Public entry point (Generic Orthogonal-Fact Discovery — TopicRelationship
 * Authorization milestone, 2026-09-11). Merges the pre-existing, unmodified
 * fixed-topic-trigger occurrences (`deriveFixedTopicTriggerOccurrences`,
 * itself renamed from this function's own pre-milestone name -- see its own
 * header) with the new claim-targeted, `TopicRelationship`-authorized
 * occurrences (`deriveClaimTargetedDiscoveryOccurrences`). Every existing
 * call site continues to compile and behave IDENTICALLY without passing
 * `relationships` (defaults to `[]`, under which
 * `deriveClaimTargetedDiscoveryOccurrences` always returns `[]`) -- the
 * same zero-behavior-change discipline this codebase uses for every other
 * additive parameter (see e.g. `retrieve()`'s own `relationships`
 * parameter). Callers that already have `relationships` in scope for
 * `retrieve()`/`lookupRelatedTopicClaims()` (i.e. `run-crc-conversation.ts`)
 * pass the SAME array here -- one governed relationship list, two
 * independent consumers, never two different sources of truth.
 */
export function deriveDiscoveredTopicOccurrences(
  understanding: StructuredUnderstanding,
  topicClaims: TopicClaim[],
  relationships: TopicRelationship[] = [],
): DiscoveredTopicOccurrence[] {
  return [
    ...deriveFixedTopicTriggerOccurrences(understanding, topicClaims),
    ...deriveClaimTargetedDiscoveryOccurrences(understanding, topicClaims, relationships),
  ]
}

/**
 * Deduplicated topic list, for feeding directly into `retrieve()`'s/
 * `lookupTopicClaims()`'s/`deriveKnowledgeReadinessNeeds()`'s additive
 * `discoveredTopics` parameters. Returns `KnowledgeTopic[]`, not
 * `GoalCategory[]` (KnowledgeTopic Foundation milestone, 2026-09-13) --
 * `DiscoveredTopicOccurrence.topic` is itself a `KnowledgeTopic` (a discovered
 * occurrence's own topic is the matching claim's intrinsic subject, which may
 * be knowledge-only). Production `retrieve.ts` never feeds this list into
 * `lookupTopicClaims`'s exact-topic path (it always passes `[]` there); the
 * live consumer is Track B (`deriveKnowledgeReadinessNeeds`), whose own
 * `discoveredTopics` parameter widens identically -- see that function's own
 * doc comment.
 */
export function discoveredTopicCategories(occurrences: DiscoveredTopicOccurrence[]): KnowledgeTopic[] {
  return Array.from(new Set(occurrences.map((o) => o.topic)))
}

export type TopicOrigin = 'explicit_goal' | 'discovered'

export interface RelevantTopic {
  topic: KnowledgeTopic
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
  const explicitByTopic = new Map<KnowledgeTopic, string[]>()
  for (const g of explicitGoals) {
    explicitByTopic.set(g.category, [...(explicitByTopic.get(g.category) ?? []), g.goal_id])
  }

  const discoveredByTopic = new Map<KnowledgeTopic, string[]>()
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
