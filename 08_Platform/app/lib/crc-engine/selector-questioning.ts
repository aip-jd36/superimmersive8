/**
 * Governed selector questioning -- deterministic need derivation + proposal
 * construction (CRC Narrow Governed Selector Questioning milestone,
 * 2026-08-24; corrected by the CRC Generic Applicability Readiness
 * milestone, same date, following the Retrieval Ownership Diagnostic).
 * Deterministic sibling to jurisdiction-clarification.ts/human-contribution-
 * clarification.ts/knowledge-readiness.ts, but architecturally cleaner than
 * either: it consumes a genuine Retrieval-owned primitive rather than
 * reproducing a narrow gate shape independently (compare jurisdiction's own
 * "reproduce the shape, don't call Retrieval" discipline, adopted there only
 * because no shared per-requirement evaluator existed yet).
 *
 * Answers exactly one question: does an unresolved, askable, governed
 * applicability selector exist whose resolution could make a currently-
 * withheld, explicit-goal-relevant governed claim applicable? If so, produce
 * ONE deterministic candidate question run-turn.ts may use as a forced
 * attempt-#1 candidate, at the same shared slot jurisdiction/human-
 * contribution/discovery already occupy -- never a privileged bypass of
 * Constraint A/B.
 *
 * No full `retrieve()` call (load-bearing, mechanically required, not merely
 * a style choice): `retrieve()` is called ONLY inside `runCRCConversation()`,
 * itself called only once the interview has already completed -- by the
 * time a real, final `RetrievalResult[]`/`RetrievalDiagnostic[]` would
 * exist, it is too late to ask anything. This module instead consumes
 * `deriveApplicabilityReadinessGaps()` (lib/retrieval-engine/applicability-
 * readiness.ts) -- a genuine, generic, Retrieval-owned primitive covering
 * BOTH TopicClaim and MatrixClaim sources, composed entirely from Retrieval's
 * own already-exported, already-authoritative building blocks
 * (`lookupTopicClaims`, `lookupRows`, `enumerateEligibleClaims`,
 * `evaluateApplicabilityDetailed`) -- never a second, independently-
 * reproduced applicability/eligibility/lifecycle/supersession/provider-scope
 * implementation. See that module's own header for the full authority
 * argument (Retrieval Ownership Diagnostic, 2026-08-24).
 *
 * Source-blind by construction (§12/§14 of the correction task): this
 * module never inspects, branches on, or knows whether a given
 * `unmet_applicability` entry originated from a TopicClaim or a MatrixClaim
 * -- it consumes one uniform `RetrievalDiagnostic[]` gap list and applies
 * identical aggregation/suppression/dedupe logic regardless of source.
 * There is no `if (source === 'matrix')` anywhere in this file.
 *
 * Explicit-goal-only (§L of the original design): enforced at the readiness
 * layer, not here -- `deriveApplicabilityReadinessGaps` only ever considers
 * claims relevant to an active, confirmed, EXPLICIT UserGoal (for both
 * TopicClaim, via `lookupTopicClaims`'s own goal-driven lookup, and
 * MatrixClaim, via the readiness module's own explicit-goal-relevance
 * filter). This module inherits that boundary automatically; it does not
 * re-implement or separately enforce it.
 *
 * Jurisdiction exclusion (defense in depth, mirroring Track B's own
 * `HANDLED_BY_DEDICATED_MODULE` pattern and reasoning exactly): `fact ===
 * 'jurisdiction'` is unconditionally skipped here, regardless of what
 * selector-askability.ts ever contains, so this module can never double-own
 * or race jurisdiction's own dedicated, unmigrated clarification module.
 */

import type { GoalCategory, Phase, StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { BoundaryState } from '@/lib/interview-engine/boundaries'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { deriveApplicabilityReadinessGaps } from '@/lib/retrieval-engine/applicability-readiness'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityFact, ApplicabilityRequirement, MatrixRow, TopicClaim, UnmetApplicabilityDetail } from '@/lib/retrieval-engine/types'
import { getSelectorAskabilityEntry } from './selector-askability'
import { deriveAssessmentJurisdictionFacts } from './assessment-jurisdiction-scope'

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
    // CRC Assessment-Jurisdiction Mention Model (2026-08-28): same fix as
    // run-crc-conversation.ts's own applicability-facts construction --
    // sourced from the single, generic derivation, never the legacy scalar
    // directly.
    jurisdiction: deriveAssessmentJurisdictionFacts(understanding),
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
export function deriveSelectorNeeds(understanding: StructuredUnderstanding, matrix: MatrixRow[], topicClaims: TopicClaim[], boundaryState: BoundaryState): SelectorNeed[] {
  const facts = buildApplicabilityFacts(understanding)
  // buildRetrievalHandoff is the SAME function runCRCConversation() itself
  // uses to build the handoff passed into full retrieve() -- canonical tool
  // and asset-provider identifiers here are guaranteed to match final
  // Retrieval's own resolution exactly, by construction. See
  // applicability-readiness.ts's own header for the full authority argument
  // and why this module is now source-blind across TopicClaim/MatrixClaim.
  const handoff = buildRetrievalHandoff(understanding)
  const diagnostics = deriveApplicabilityReadinessGaps(handoff, matrix, understanding.user_goals, topicClaims, facts)

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
