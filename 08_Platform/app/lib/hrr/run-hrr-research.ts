/**
 * runHrrResearch — the converged HRR governed-research pipeline
 * (CAH-4G.3 Slice 3, 2026-09-10).
 *
 * ONE downstream implementation for both entry modes:
 *
 *   topic chip click ─────────────────┐
 *                                     ▼
 *   free-form question → classifier   HrrAuthorityGateResult
 *   → hrrAuthorityGate ───────────────┘   (deterministic, Slice 2)
 *                                     │
 *                                     ▼   runHrrResearch()
 *                    per permitted ExplicitResearchIntent:
 *   selectReviewerClaims()  (reviewer-channel selection + eligibility
 *                            + deterministic applicability — UNCHANGED)
 *                                     │
 *          partition on applicability:  not_met  → does_not_apply (NOT fed to BI)
 *                                       met/unresolved → fed to BI
 *                                     │
 *   researchIntentToBiIntent + reviewerClaimToBiResult
 *                                     │
 *   buildBoundedInterpretations([intent], results, [], {state:'unknown'})
 *                                     │
 *                                     ▼
 *                    HrrResearchResult   (structured, no prose)
 *
 * PURE. No DB, no audit write, no model call, no I/O. The caller (a future
 * Slice-3/6 route) resolves the reviewer submission context first
 * (`getSubmissionFactsForReviewerLk` → `buildReviewerLkContext`) and audits
 * before returning content (Slice 5) — this function only computes.
 *
 * Authority invariants (CAH-4G.3): the classifier/gate output influences
 * ONLY which permitted topic(s) are researched and each topic's scope. It
 * never creates project/applicability facts, never chooses/ranks claim ids,
 * never overrides reviewer eligibility / provider_scope / tool_scope /
 * Lifecycle / supersession, never consults `crc_eligible`, never touches
 * Linked CRC context, never produces answer prose. Reviewer-channel
 * selection stays authoritative; deterministic applicability stays
 * authoritative; Bounded Interpretation stays the semantic ceiling.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type {
  ExplicitResearchIntent,
  HrrAuthorityGateResult,
  ReviewerLkClaim,
  ReviewerResearchTopic,
} from '@/lib/reviewer-lk/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { researchIntentToBiIntent, reviewerClaimToBiResult } from './bi-adapters'
import type { HrrResearchResult, HrrResearchTopicResult } from './types'

/** A claim provably does NOT apply iff any of its applicability requirements evaluated `'not_met'` (a settled false fact — never "unresolved", never a negative finding). */
function claimDoesNotApply(claim: ReviewerLkClaim): boolean {
  return claim.applicability_outcomes.some((o) => o.status === 'not_met')
}

export interface RunHrrResearchInput {
  /** The DETERMINISTIC output of the Slice-2 authority gate (free-form path) or `topicSelectionGateResult()` (topic path). Raw classifier output must never reach here — only gated, normalized intent. */
  gate: HrrAuthorityGateResult
  /** Reviewer submission retrieval context — `buildReviewerLkContext()` output. PURE; no new submission facts are added by this slice. */
  reviewerContext: ReviewerLkContextBundle
  /** Governed topic claims — `TOPIC_CLAIMS_FIXTURE` in production, a test set otherwise. */
  topicClaims: TopicClaim[]
  /**
   * The raw reviewer question — carried into `HrrResearchResult.attributed_question`
   * for Slice-4 attributed display ONLY. It is NEVER passed to
   * `selectReviewerClaims`, applicability, or Bounded Interpretation. `null`
   * for the topic-shortcut path.
   */
  attributedQuestion?: string | null
}

/** Build the gate-result shape for a deterministic topic-chip click — same downstream path, ZERO classifier/model call. */
export function topicSelectionGateResult(topic: ReviewerResearchTopic): HrrAuthorityGateResult {
  const intent: ExplicitResearchIntent = {
    source_kind: 'topic_selection',
    topic,
    scope: 'informational',
    interpreted: false,
    source_text_ref: null,
  }
  return {
    authority_note: 'research',
    research_intents: [intent],
    offered_research_paths: null,
    unresolved_ambiguity: [],
  }
}

function researchOneTopic(
  intent: ExplicitResearchIntent,
  input: RunHrrResearchInput,
): HrrResearchTopicResult {
  const { claims, withheld } = selectReviewerClaims({
    topic: intent.topic,
    topicClaims: input.topicClaims,
    assetProviderIds: input.reviewerContext.assetProviderIds,
    activeToolIds: input.reviewerContext.activeToolIds,
    applicabilityFacts: input.reviewerContext.applicabilityFacts,
  })

  // Applicability partition (CAH-4G.3 §H): a `not_met` claim provably does
  // not apply → excluded from BI, carried separately. `met` / `unresolved`
  // claims feed BI normally (a reviewer sees the unresolved requirement
  // verbatim alongside — "not a negative finding"). `diagnostics: []` for
  // HRR: the reviewer-channel selector never withholds an applicability-
  // gated claim, so BI's Case 3A never fires.
  const does_not_apply = claims.filter(claimDoesNotApply)
  const governed_claims = claims.filter((c) => !claimDoesNotApply(c))

  const biIntent = researchIntentToBiIntent(intent)
  const biResults = governed_claims.map(reviewerClaimToBiResult)
  const [interp] = buildBoundedInterpretations([biIntent], biResults, [], { state: 'unknown' })

  return {
    topic: intent.topic,
    scope: intent.scope,
    intent_origin: intent.source_kind,
    bi_status: interp.status,
    summary_blocks: interp.summary_blocks,
    supporting_claim_ids: interp.supporting_claim_ids,
    unresolved_relevant_claims: interp.unresolved_relevant_claims,
    governed_claims,
    does_not_apply,
    withheld,
  }
}

export function runHrrResearch(input: RunHrrResearchInput): HrrResearchResult {
  const { gate } = input
  const attributed_question = input.attributedQuestion ?? null

  // No permitted research clause → NO governed retrieval, NO BI. Structured
  // authority / unsupported state only. (Applies to a pure "should I approve
  // this?" and to a fully unsupported question.)
  if (gate.research_intents.length === 0) {
    return {
      authority_note: gate.authority_note,
      attributed_question,
      per_topic: [],
      offered_research_paths: gate.offered_research_paths,
      unresolved_ambiguity: gate.unresolved_ambiguity,
    }
  }

  // One or more permitted research clauses. In the MIXED case the gate's
  // `authority_note` is already `'assessment_judgment_redirected'` — carried
  // through unchanged; the decision refusal is Slice-4 composition's job,
  // not a competing HRR refusal here. Each clause is researched
  // independently, in gate order (which the Slice-2 normalizer already
  // deduped + capped + ordered deterministically).
  const per_topic = gate.research_intents.map((intent) => researchOneTopic(intent, input))

  return {
    authority_note: gate.authority_note,
    attributed_question,
    per_topic,
    // there IS research to show → no offered-paths list even in the mixed case
    offered_research_paths: null,
    unresolved_ambiguity: gate.unresolved_ambiguity,
  }
}
