/**
 * Governed selector questioning -- deterministic need derivation + proposal
 * construction (CRC Narrow Governed Selector Questioning milestone,
 * 2026-08-24, implementing the accepted Governed Selector Questioning
 * architecture design of the same date). Deterministic sibling to
 * jurisdiction-clarification.ts/human-contribution-clarification.ts/
 * knowledge-readiness.ts, using the closest-fitting elements of each:
 * jurisdiction's own "reproduce the narrow gate shape, don't call retrieve()"
 * discipline (see below for why that discipline is mechanically required
 * here, not merely a style preference), and Track B's own compound-key
 * BoundaryState cap shape (a single boolean cannot represent "asked about
 * Kling's plan" separately from "asked about Runway's plan").
 *
 * Answers exactly one question: does an unresolved, askable, governed
 * applicability selector exist whose resolution could make a currently-
 * withheld, explicit-goal-relevant governed claim applicable? If so, produce
 * ONE deterministic candidate question run-turn.ts may use as a forced
 * attempt-#1 candidate, at the same shared slot jurisdiction/human-
 * contribution/discovery already occupy -- never a privileged bypass of
 * Constraint A/B (see run-turn.ts's own wiring: this proposal flows through
 * the unchanged validate -> Constraint A -> Constraint B pipeline exactly
 * like every other deterministic candidate in this codebase).
 *
 * No `retrieve()` call (load-bearing, mechanically required, not merely a
 * style choice): `retrieve()` is called ONLY inside `runCRCConversation()`,
 * itself called only once the interview has already completed (see
 * run-turn.ts's own `runCRCConversation(...)` call sites, all three gated
 * on `kind: 'complete'`) -- by the time a real `RetrievalDiagnostic[]`
 * would exist, it is too late to ask anything. This module instead calls
 * `lookupTopicClaims()` directly (Retrieval's own lighter-weight, already-
 * exported, already-pure topic-lookup function -- not the heavier
 * `retrieve()` orchestration, which also resolves Matrix rows/relationships/
 * discovered-topic lookups this module has no need for) to obtain real,
 * freshly-computed `RetrievalDiagnostic[]` mid-turn. This is still Retrieval
 * evaluating its own applicability logic -- `lookupTopicClaims` internally
 * calls the same `evaluateApplicabilityDetailed()` this whole milestone's
 * Piece 1 introduced, so there is exactly one applicability-evaluation code
 * path in the entire codebase, never a second, independently-reproduced one
 * (unlike jurisdiction/human-contribution, which each reproduce a narrow
 * gate SHAPE from scratch because no shared per-requirement evaluator
 * existed before this milestone).
 *
 * Scoped to TopicClaim applicability only in this milestone (explicit,
 * documented limitation -- see this milestone's own Final Report §Q/§Y, not
 * silently absent): extending this to MatrixClaim applicability would
 * require reproducing `lookupRows`/`enumerateEligibleClaims`'s own
 * tool-row-resolution shape inside this module (no deterministic
 * clarification module does this today), and zero live Matrix-applicability-
 * gated claim exists to justify building it now. `topicClaims` passed to
 * this module's own `deriveSelectorNeeds` is exactly the same
 * `deps.topicClaims` every other deterministic clarification module in
 * run-turn.ts already receives.
 *
 * Explicit-goal-only (§L of the accepted design; §17/§18/§24 of the
 * originating diagnostics): `lookupTopicClaims` is called with
 * `understanding.user_goals` (its own internal filter already restricts to
 * active + confirmed) and WITHOUT a `discoveredTopics` argument (defaults to
 * `[]`) -- a category relevant only via Track A discovered relevance
 * therefore structurally cannot produce a selector need. This is the exact
 * mechanism, not a separate check layered on top.
 *
 * Jurisdiction exclusion (defense in depth, mirroring Track B's own
 * `HANDLED_BY_DEDICATED_MODULE` pattern and reasoning exactly -- "even if a
 * future edit to that registry ever added an entry by mistake, this
 * exclusion is checked first and wins"): `fact === 'jurisdiction'` is
 * unconditionally skipped here, regardless of what selector-askability.ts
 * ever contains, so this module can never double-own or race jurisdiction's
 * own dedicated, unmigrated clarification module.
 */

import type { GoalCategory, Phase, StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { BoundaryState } from '@/lib/interview-engine/boundaries'
import { lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityFact, ApplicabilityRequirement, TopicClaim, UnmetApplicabilityDetail } from '@/lib/retrieval-engine/types'
import { getSelectorAskabilityEntry } from './selector-askability'

/**
 * Facts owned entirely by a pre-existing, dedicated deterministic module --
 * never independently processed here, regardless of what
 * selector-askability.ts says about them. See this module's own header.
 */
const HANDLED_BY_DEDICATED_MODULE = new Set<ApplicabilityFact>(['jurisdiction'])

export interface SelectorNeed {
  fact: ApplicabilityFact
  /** Canonical tool identifier, only for tool-scoped facts (e.g. `tool_plan_tier`). Null for unscoped facts. */
  tool: string | null
  /** The explicit UserGoal category this need was found relevant to -- provenance only, never rendered. */
  originating_goal_category: GoalCategory
  /** Every currently-relevant claim this need would help resolve -- aggregated across claims (§K of the accepted design), never suppressed globally because one sibling claim independently fails. */
  unmet_claim_ids: string[]
  /** Stable identity, also the BoundaryState cap key -- `fact` alone for unscoped facts, `` `${fact}::${tool}` `` for tool-scoped ones. Deliberately keyed on the canonical tool identifier, never a transient ToolMention.mention_id, so the cap survives a correction (§N of the accepted design). */
  dedupe_key: string
}

function buildApplicabilityFacts(understanding: StructuredUnderstanding): ApplicabilityFacts {
  return {
    jurisdiction: understanding.project_facts.jurisdiction.attestation,
    toolMentions: understanding.tool_mentions,
  }
}

function dedupeKeyFor(requirement: ApplicabilityRequirement): string {
  return requirement.tool ? `${requirement.fact}::${requirement.tool}` : requirement.fact
}

/**
 * Per claim, within one category's aggregated `unmet_applicability`: a
 * claim contributes candidate needs ONLY if none of its own requirements are
 * `'not_met'` (Case B/D of the accepted design -- a known-false sibling
 * requirement makes resolving any unresolved one futile for THIS claim).
 * Returns the claim's own unresolved requirements when it qualifies, or
 * `null` when it doesn't (either no unresolved requirements at all, or at
 * least one known-false one).
 */
function unresolvedRequirementsIfClaimStillEligible(claimId: string, detail: UnmetApplicabilityDetail[]): ApplicabilityRequirement[] | null {
  const forClaim = detail.filter((d) => d.claim_id === claimId)
  if (forClaim.some((d) => d.status === 'not_met')) return null
  const unresolved = forClaim.filter((d) => d.status === 'unresolved').map((d) => d.requirement)
  return unresolved.length > 0 ? unresolved : null
}

/**
 * Derives every currently-eligible governed selector need, deterministic and
 * pure. Ordering is entirely incidental to iteration order (category/goal
 * order, then claim order, then requirement-array order) -- never a
 * materiality/priority judgment (§20/§23 of the originating diagnostic).
 * `boundaryState` filters out any dedupe key already consumed this
 * conversation, mirroring `deriveKnowledgeReadinessNeeds`'s own exact
 * pattern (Track B) rather than requiring every caller to filter separately.
 */
export function deriveSelectorNeeds(understanding: StructuredUnderstanding, topicClaims: TopicClaim[], boundaryState: BoundaryState): SelectorNeed[] {
  const facts = buildApplicabilityFacts(understanding)
  // Explicit-goal-only: understanding.user_goals only, discoveredTopics
  // omitted (defaults to []) -- see this module's own header.
  const { diagnostics } = lookupTopicClaims(understanding.user_goals, topicClaims, facts)

  const needsByKey = new Map<string, SelectorNeed>()

  for (const diagnostic of diagnostics) {
    if (diagnostic.reason !== 'applicability_unmet' || !diagnostic.unmet_applicability || diagnostic.unmet_applicability.length === 0) continue
    const goalCategory = diagnostic.identifier as GoalCategory
    const claimIds = Array.from(new Set(diagnostic.unmet_applicability.map((d) => d.claim_id)))

    for (const claimId of claimIds) {
      const unresolved = unresolvedRequirementsIfClaimStillEligible(claimId, diagnostic.unmet_applicability)
      if (!unresolved) continue

      for (const requirement of unresolved) {
        if (HANDLED_BY_DEDICATED_MODULE.has(requirement.fact)) continue
        if (getSelectorAskabilityEntry(requirement.fact)?.treatment !== 'askable_in_crc') continue

        const dedupeKey = dedupeKeyFor(requirement)
        if ((boundaryState.selector_needs_used[dedupeKey] ?? 0) >= 1) continue

        const existing = needsByKey.get(dedupeKey)
        if (existing) {
          if (!existing.unmet_claim_ids.includes(claimId)) existing.unmet_claim_ids.push(claimId)
        } else {
          needsByKey.set(dedupeKey, {
            fact: requirement.fact,
            tool: requirement.tool ?? null,
            originating_goal_category: goalCategory,
            unmet_claim_ids: [claimId],
            dedupe_key: dedupeKey,
          })
        }
      }
    }
  }

  return Array.from(needsByKey.values())
}

/**
 * Deterministically constructs the CandidateQuestionProposal -- the exact
 * same shape every other deterministic clarification module produces, for
 * run-turn.ts to feed through the unchanged validate -> Constraint A ->
 * Constraint B pipeline (no privileged pass: Constraint A can still suppress
 * it, same as jurisdiction/human-contribution/Track B). `question_text`
 * comes only from the governed registry entry, with the literal `{tool}`
 * placeholder substituted for the already-known, canonically-resolved tool
 * identifier when the need is tool-scoped -- never LLM-generated, never
 * synthesized from a claim's own internal requirement value.
 */
export function buildSelectorNeedProposal(need: SelectorNeed, phase: Phase): CandidateQuestionProposal {
  const entry = getSelectorAskabilityEntry(need.fact)
  const template = entry?.question_text ?? ''
  const question_text = need.tool ? template.replace('{tool}', need.tool) : template
  return {
    question_text,
    question_kind: 'governed_selector_clarification',
    target_signal_id: null,
    phase,
    target_selector_dedupe_key: need.dedupe_key,
  }
}
