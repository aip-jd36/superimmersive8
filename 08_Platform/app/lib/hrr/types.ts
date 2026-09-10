/**
 * HRR (Human Reviewer Research) — converged governed-research pipeline
 * types (CAH-4G.3 Slice 3, 2026-09-10).
 *
 * `lib/hrr/` is the CAH-4G convergence layer: it composes `lib/reviewer-lk/`
 * governed selection + eligibility + deterministic applicability with
 * `lib/bounded-interpretation/`. `lib/reviewer-lk/**` stays the deterministic
 * reviewer-LK authority surface with no interpretation layer (its authority
 * firewall — no BI import — is unchanged and still meaningful);
 * `lib/bounded-interpretation/**` stays pure. `lib/hrr/**` is the one place
 * allowed to import both.
 *
 * This is the STRUCTURED INTERNAL research result — sufficient for the later
 * (Slice 4) deterministic composition step. It carries NO final narrative
 * answer, NO assessment conclusion, NO evidence-sufficiency / control /
 * approval / commercial-clearance judgement, and NO model-authored prose.
 * Every string in it is either a verbatim governed value or a
 * `BoundedInterpretation` output (fixed templated copy from
 * `lib/bounded-interpretation/rules.ts`).
 */

import type { InterpretationStatus, UnresolvedRelevantClaim } from '@/lib/bounded-interpretation/types'
import type { GoalCategory, GoalScope } from '@/types/interview-engine'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'
import type {
  HrrAuthorityGateResult,
  ReviewerApplicabilityOutcome,
  ReviewerLkClaim,
  ReviewerLkWithheld,
  ReviewerResearchTopic,
} from '@/lib/reviewer-lk/types'

/**
 * One researched governed topic, fully deterministic. `governed_claims` are
 * the reviewer-eligible, applicability-`met`-or-`unresolved` claims that were
 * fed to Bounded Interpretation; `does_not_apply` are the reviewer-eligible
 * claims that were EXCLUDED from BI because a requirement evaluated `not_met`
 * (provably does not apply — never a negative finding, never "unresolved").
 */
export interface HrrResearchTopicResult {
  topic: ReviewerResearchTopic
  /** The clause's own scope. `'determination_request'` → `bi_status` will be `'determination_declined'` (BI's semantic ceiling, not a separate HRR refusal). */
  scope: GoalScope
  intent_origin: 'topic_selection' | 'interpreted_question'
  /** Verbatim from `BoundedInterpretation`. HRR invents no status. */
  bi_status: InterpretationStatus
  /** Verbatim from `BoundedInterpretation.summary_blocks` — fixed templated copy, no new prose. */
  summary_blocks: string[]
  /** Verbatim from `BoundedInterpretation.supporting_claim_ids` — traceability only. */
  supporting_claim_ids: string[]
  /** Verbatim from `BoundedInterpretation.unresolved_relevant_claims`. */
  unresolved_relevant_claims: UnresolvedRelevantClaim[]
  /** The reviewer-eligible claims fed to BI (applicability `met` and/or `unresolved`, none `not_met`). Full `ReviewerLkClaim` projection — verbatim governed fields + per-requirement applicability outcomes. */
  governed_claims: ReviewerLkClaim[]
  /** Reviewer-eligible claims with ≥1 `not_met` requirement — excluded from BI, carried here for a separate "does not apply to this submission" block (Slice 4). */
  does_not_apply: ReviewerLkClaim[]
  /** Claims topic-matched but WITHHELD by the reviewer-channel eligibility gate (not adopted / superseded / not reviewer-eligible scope). Reason only, never content. */
  withheld: ReviewerLkWithheld[]
}

/**
 * The structured internal result of one `runHrrResearch()` call. For
 * `authority_note !== 'research'` (`assessment_judgment_redirected` with no
 * surviving research clause, or `unsupported`), `per_topic` is `[]` and NO
 * governed retrieval / applicability / BI ran.
 */
export interface HrrResearchResult {
  /** Mirrors the authority gate. `'assessment_judgment_redirected'` can still carry `per_topic` entries (the mixed case). */
  authority_note: HrrAuthorityGateResult['authority_note']
  /**
   * The raw reviewer question — carried for Slice-4 ATTRIBUTED display only
   * ("You asked: …"). It NEVER entered governed selection, applicability, or
   * Bounded Interpretation (those received only `{topic, scope}`). `null` for
   * the topic-shortcut path.
   */
  attributed_question: string | null
  per_topic: HrrResearchTopicResult[]
  /** The governed research paths to offer — populated ONLY when `authority_note !== 'research'`; `null` otherwise. Never an invented "closest topic". */
  offered_research_paths: ReviewerResearchTopic[] | null
  /** Passed through from the classifier / gate for Slice-4 UI routing. */
  unresolved_ambiguity: HrrAuthorityGateResult['unresolved_ambiguity']
}

// ── CAH-4G.4 Slice 4 — deterministic consultative composition / projection ──
//
// `HrrResearchAnswer` is the smallest generic structured projection of one
// `runHrrResearch()` result into a consultant-like reviewer answer.
// `projectHrrResearchAnswer()` (`project-hrr-research-answer.ts`) builds it —
// DETERMINISTICALLY, NO model call, NO applicability re-evaluation, NO new
// factual proposition. Every substantive string traces to ONE grounding
// source (`ADR-002` §I, test-enforced by `hrr-projection.test.ts`):
//   (A) a verbatim governed `ReviewerLkClaim.statement`;
//   (B) deterministic applicability outcomes / permitted structured context,
//       accurately characterised;
//   (C) a verbatim `BoundedInterpretation.summary_blocks` entry;
//   (D) a fixed authority / limitation / navigation template constant;
//   (E) a mechanical provenance / status enumeration (`claim_id`,
//       `governed_claims_reference`, requirement `fact` values, status values).
// `question_text` is the verbatim reviewer quotation — echoed for attribution,
// NEVER a factual grounding source; a false premise is never repeated as fact.
//
// The consultative hierarchy (`PRD_CAH_4G_HRR` A–G) is expressed as the field
// order of `HrrAnswerTopic`; empty/irrelevant elements are omitted (empty
// array / empty string), never rendered as a heading. There is NO UI concept
// here (no card colour, no accordion state, no rail section) — only semantic
// projection.

/**
 * One governed proposition, projected verbatim with its deterministic
 * applicability. A mechanical narrowing of `ReviewerLkClaim` — nothing is
 * composed, ranked, or interpreted.
 */
export interface HrrGovernedConsideration {
  claim_id: string
  /** Verbatim `ReviewerLkClaim.statement` (grounding A). `null` when the governed record has no published statement — the reviewer consults `governed_claims_reference`. */
  statement_verbatim: string | null
  /** Verbatim `ReviewerLkClaim.applicability_established` (grounding B). `false` = one or more requirements are unresolved / not met — shown, never read as a negative finding. */
  applicability_established: boolean
  /** Verbatim per-requirement outcomes (grounding B + E). */
  applicability_outcomes: ReviewerApplicabilityOutcome[]
  /** Verbatim governed project-fact dependency identifiers (grounding E). */
  unresolved_project_dependencies: string[]
  /** Verbatim pointer into the canonical governed ledger (grounding E). */
  governed_claims_reference: string
}

/**
 * Mechanical, deduplicated rollup of the per-requirement applicability
 * outcomes across one topic's surfaced claims (hierarchy C). Every entry is a
 * verbatim `ApplicabilityRequirement` copied from a claim outcome — no new
 * requirement is invented, none is re-evaluated. Deduplicated by
 * `(fact, tool, operator, value)`; ordered deterministically.
 */
export interface HrrApplicabilityRollup {
  /** requirements that evaluated `met` on at least one surfaced governed claim */
  established: ApplicabilityRequirement[]
  /** requirements that evaluated `unresolved` on at least one surfaced governed claim */
  unresolved: ApplicabilityRequirement[]
  /** requirements that evaluated `not_met` on a `does_not_apply` claim */
  not_met: ApplicabilityRequirement[]
}

/**
 * One input that must be established before HRR could determine how a topic's
 * governed guidance applies to this submission (hierarchy D). Made useful:
 * the specific governed requirement / dependency identifier + a fixed note on
 * why it matters and whose job it is. NEVER an inferred fact, NEVER a
 * determination that the input is (or is not) satisfiable.
 */
export interface HrrUnresolvedInput {
  kind: 'applicability_requirement' | 'project_dependency'
  /** the governed requirement `fact` value, or the verbatim project-dependency identifier (grounding E) */
  identifier: string
  /** the full governed requirement when `kind === 'applicability_requirement'`; `null` for a project dependency */
  requirement: ApplicabilityRequirement | null
  /** claim_ids whose applicability this unresolved input blocks (grounding E) */
  from_claim_ids: string[]
  /** fixed template (grounding D) — why this matters and whose responsibility it is */
  note: string
}

/**
 * One researched clause, projected into the consultative hierarchy. Field
 * order IS the hierarchy: (A) `orientation`, (B) `bi_summary_blocks` +
 * `governed_considerations`, (C) `applicability`, (D) `unresolved_inputs`,
 * (E) `does_not_apply` (+ `does_not_apply_note`), (F) `boundary_note` +
 * `withheld`, (G) `governed_claim_refs`.
 */
export interface HrrAnswerTopic {
  topic: GoalCategory
  /** `reviewerTopicLabel(topic)` — fixed governed navigation label (grounding D). */
  topic_label: string
  intent_origin: 'topic_selection' | 'interpreted_question'
  /** Verbatim `BoundedInterpretation.status`. HRR invents no status. */
  bi_status: InterpretationStatus
  /** (A) One fixed orientation sentence keyed on `bi_status` (grounding D). */
  orientation: string
  /**
   * (B) Verbatim `BoundedInterpretation.summary_blocks` (grounding C). `[]`
   * for `determination_declined` AND `outside_current_coverage` — the shared
   * `rules.ts` copy for both is CRC-channel-worded ("CRC doesn't…");
   * `orientation` + `boundary_note` carry the HRR-worded equivalent. Kept for
   * `directly_relevant` / `relevant_applicability_unresolved`, where it
   * carries the verbatim governed proposition + its hedge.
   */
  bi_summary_blocks: string[]
  /**
   * (B) The governed propositions BI actually surfaced (`claim_id` ∈
   * `supporting_claim_ids`), verbatim, each with its deterministic
   * applicability. `[]` for `determination_declined` and
   * `outside_current_coverage` (BI cited nothing).
   */
  governed_considerations: HrrGovernedConsideration[]
  /** (C) Mechanical deduplicated applicability rollup across this topic's claims. */
  applicability: HrrApplicabilityRollup
  /**
   * (D) The inputs that must be established before HRR could determine how
   * this topic's guidance applies. Non-empty only for
   * `relevant_applicability_unresolved`, or when a surfaced claim carries an
   * unresolved governed project dependency.
   */
  unresolved_inputs: HrrUnresolvedInput[]
  /**
   * (E) Reviewer-eligible governed claims that provably do NOT apply to this
   * submission (a requirement evaluated `not_met`). Never a negative finding.
   * `[]` for `determination_declined`.
   */
  does_not_apply: HrrGovernedConsideration[]
  /** (E) Fixed template (grounding D) — empty string unless `does_not_apply` is non-empty. */
  does_not_apply_note: string
  /**
   * (F) One fixed sentence keyed on `bi_status` (grounding D) — what governed
   * knowledge here does NOT establish, plus the assessment-authority boundary.
   */
  boundary_note: string
  /** (F) Governed knowledge that exists on this topic but is not reviewer-eligible — verbatim reason only, never content. */
  withheld: ReviewerLkWithheld[]
  /** (G) Deduplicated `governed_claims_reference` pointers for every claim referenced above (grounding E). */
  governed_claim_refs: string[]
}

/**
 * The deterministic consultative projection of one `runHrrResearch()` result.
 * Two structurally separate lanes: `assessment_authority_note` (the refusal,
 * when an assessment decision was requested) and `topics` (the governed
 * research). They are never blended into one "although I can't approve it,
 * this looks fine because…" sentence.
 */
export interface HrrResearchAnswer {
  research_mode: 'topic_pick' | 'question'
  /** Verbatim reviewer question; `null` for a topic pick. Echoed for attribution, NEVER a factual grounding source. */
  question_text: string | null
  authority_note: HrrAuthorityGateResult['authority_note']
  /**
   * Lane 1 — the assessment-authority refusal. Non-null iff
   * `authority_note === 'assessment_judgment_redirected'`. Fixed template
   * (grounding D); never a yes/no; never references the research findings.
   */
  assessment_authority_note: string | null
  /**
   * Fixed template (grounding D + E) — set only when the free-form classifier
   * flagged `multiple_unrelated_topics` (the reviewer named more governed
   * topics than `HRR_MAX_RESOLVED_TOPICS`) and at least one was researched.
   * Names which topics were covered; empty string otherwise.
   */
  scope_note: string
  /** Lane 2 — one entry per researched clause, in gate order. No governed materiality signal exists, so ordering is deterministic input order (documented limitation — see `project-hrr-research-answer.ts`). */
  topics: HrrAnswerTopic[]
  /** Governed research paths to offer — mirrors the gate; populated only when `topics` is empty and `authority_note !== 'research'`. Never an invented "closest topic". */
  offered_research_paths: GoalCategory[] | null
  /** Fixed template (grounding D) — what remains the Human Reviewer's assessment responsibility. Always present. */
  reviewer_responsibility_note: string
}
