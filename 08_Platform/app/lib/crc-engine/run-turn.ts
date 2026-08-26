/**
 * Canonical per-turn loop (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §5, Live
 * Interview Runtime milestone). Glue over already-built, already-tested
 * primitives -- Extraction+Mutation (fused, `runExtractionPipeline`),
 * Gate 1/2, candidate generation, Constraint A, Constraint B, signal
 * lineage -- plus the four new pieces this milestone built
 * (`computePhase`, `checkCompletion`, `resolveDeclineSignal`,
 * `buildPendingClarification`). Not a copy of `run-dialogue.ts` (eval-only,
 * imported by nothing, and this module must not depend on it per the
 * subsystem-boundaries discipline) -- reimplemented fresh here, over the
 * same primitives, with the corrected ordering the accepted architecture
 * doc's own critique of the originally-proposed loop requires.
 *
 * The accepted loop, exactly:
 *   Extraction + Mutation (fused)
 *   -> decline pre-processing (opt_out_scope resolved BEFORE gates --
 *      Phase 7's own shipped bugfix)
 *   -> Gate 1 + Gate 2 evaluation
 *   -> Phase transition (fresh phase, so a phase-completing turn's own
 *      candidate generation already reflects the new phase -- reordered
 *      relative to the originally-proposed loop, per Section 11)
 *   -> Natural-completion check -- if complete, persist and finalize via
 *      the already-built runCRCConversation(), never re-entering below
 *   -> Candidate generation -> Constraint A -> Constraint B (decline
 *      scope applied here too, mirroring run-dialogue.ts's own pattern)
 *   -> set/clear pending_clarification
 *   -> persist -> assistant response
 *
 * `[MODEL 4 -- 2026-08-10]` CRC Limited Pilot, bounded alternative-question
 * search: the organic (no-decline) branch above is now a BOUNDED SEARCH,
 * via `tryCandidate()`, not a single attempt. A rejected or null first
 * candidate gets exactly one alternative attempt (excluding the first's
 * own (kind, target_signal_id) when it was a genuine rejection, no
 * exclusion invented for a null result -- candidate generation is
 * stochastic, confirmed by live-trial evidence during the design review).
 * If the second attempt also fails, the turn finalizes directly with
 * `completion_reason: 'questioning_exhausted'` -- never a third attempt,
 * and never routed through `checkCompletion()`, which remains entirely
 * unaware of Constraint B/BoundaryState by design (kept that way
 * deliberately; see the approved design review for why completion
 * learning about boundary-cap state was rejected in favor of this
 * runtime-local bound). The explicit skip_question/skip_phase decline
 * path is untouched -- Model 4 never engages when declineSignal is set,
 * a deliberate scope boundary from the same review.
 *
 * `[FINDING]`, disclosed rather than hidden: a phase-scope decline updates
 * `BoundaryState.phases_ended` only via `evaluateBoundary`, which this
 * loop calls *after* phase/completion are already computed for this same
 * turn (candidate generation, and therefore boundary evaluation, cannot
 * happen before phase is known -- see the reordering above). A phase
 * ended by decline this turn therefore takes effect starting the
 * *following* turn's `computePhase` call, not instantaneously within the
 * same turn. This does not cause an incorrect outcome: the assistant
 * still asks nothing further this turn regardless (Constraint B's own
 * suppression handles that immediately), and completion is never gated on
 * a phase-scope decline (only an interview-scope one is, via
 * `suForGates.opt_out_scope === 'interview'`, checked directly by
 * `checkCompletion` -- see completion.ts's own `[FIXED 2026-08-10]` note;
 * this was previously, and incorrectly, read off `gate1.state ===
 * 'not_applicable_declined'` instead) -- so nothing is silently wrong,
 * only a one-turn delay in an internal bookkeeping value nothing
 * user-facing depends on this turn.
 *
 * `[COMMERCIAL READINESS DISCOVERY -- 2026-08-12]` CRC Limited Pilot,
 * Commercial Readiness Discovery Catalog integration. Organic (no-decline)
 * path only, same scope boundary as Model 4 itself. When Gate 1 is met,
 * phase === 3, and the global discovery cap
 * (BoundaryState.commercial_readiness_discovery_asked) is unused,
 * `selectEligibleCommercialReadinessCategory` (deterministic, from the
 * already-approved Indicators + Catalog layers) may select a category.
 * If it does, that category's fixed CandidateQuestionProposal becomes
 * attempt #1 -- via `tryCandidate`'s new `proposalOverride` parameter,
 * skipping the ordinary generator call for that one attempt only, but
 * still flowing through the exact same validate -> Constraint A ->
 * Constraint B -> boundary-cap pipeline every other candidate does. No
 * privileged pass: Constraint A can suppress it, Constraint B enforces the
 * new global cap exactly like historical_experience's own cap.
 *
 * Per the approved integration spec, the discovery cap means one
 * discovery question per CONVERSATION, not one per Model 4 attempt: if
 * attempt #1 is a discovery candidate and it is rejected, attempt #2 NEVER
 * retries a second discovery category -- it always falls back to the
 * ordinary generator/candidate pool. No exclusion is threaded from a
 * rejected discovery attempt into attempt #2's ordinary generator call
 * either: a rejected discovery candidate says nothing about the ordinary
 * generator's own search space (different proposal source entirely), so
 * there is nothing meaningful to exclude there.
 *
 * Delivering the fixed Educational Takeaway is entirely Runtime's own
 * concern, not the catalog's: this module reads
 * `pending_commercial_readiness_takeaway` (CRCSessionState) at the START
 * of a turn -- the category asked on the PREVIOUS turn, if any -- attaches
 * that category's fixed takeaway text to whatever outcome THIS turn
 * produces (via the additive `precedingTakeaway` field on TurnOutcome),
 * and clears the persisted field on every save this turn, whether or not
 * this turn also approves a NEW discovery candidate (structurally it never
 * can do both at once: the global cap is already set the moment a
 * discovery candidate is approved, so a pending takeaway from turn N and a
 * freshly-approved discovery candidate on turn N+1 can never coexist). The
 * takeaway is never routed through checkCompletion(), Retrieval, or
 * Projection -- ProjectionOutput is untouched by this feature entirely.
 *
 * `gate_2_state` (and the value fed to `checkCompletion`) uses the
 * `'interview'` evaluation scope, not `'phase'` -- matching
 * `run-dialogue.ts`'s own established precedent (it stores `gate_2_state`
 * from interview scope as the canonical value) and `gates.ts`'s own
 * framing of `'interview'` as the full-object default. `'phase'` scope is
 * still computed (mirroring existing precedent) but not used to drive
 * anything in this module -- and, per the Phase 2->3 design review that
 * preceded this implementation, must never be used as a phase-transition
 * signal (that would be the rejected Candidate C).
 */

import { runExtractionPipeline, type CandidateExtractor, type RawUserTurn } from '@/lib/interview-engine/extraction'
import { evaluateGate1, evaluateGate2 } from '@/lib/interview-engine/gates'
import { computePhase } from '@/lib/interview-engine/phase'
import { createInitialBoundaryState, evaluateBoundary, type BoundaryState, type CandidateQuestion } from '@/lib/interview-engine/boundaries'
import {
  deriveEligibleSignals,
  presatisfyStructuralFollowUpNeeds,
  matchesExclusion,
  validateCandidateReference,
  PROJECT_FACT_SIGNAL_IDS,
  type CandidateExclusion,
  type CandidateQuestionGenerator,
  type CandidateQuestionProposal,
  type EligibleSignal,
} from '@/lib/interview-engine/candidate-question'
import type { ConstraintADecider } from '@/lib/interview-engine/decision'
import { resolveLineageRoot } from '@/lib/interview-engine/signal-lineage'
import { buildPendingClarification, type PendingClarification } from '@/lib/interview-engine/pending-clarification'
import { checkCompletion } from './completion'
import { resolveDeclineSignal, type DeclineAction } from './decline'
import { runCRCConversation, type CRCPipelineResult } from './run-crc-conversation'
import { deriveCommercialReadinessIndicators } from './commercial-readiness-indicators'
import {
  buildCommercialReadinessDiscoveryProposal,
  evaluateCategoryEligibility,
  getCommercialReadinessTakeaway,
  selectEligibleCommercialReadinessCategory,
  COMMERCIAL_READINESS_CATEGORIES,
  type CommercialReadinessCategory,
} from './commercial-readiness-catalog'
import {
  buildJurisdictionClarificationProposal,
  buildJurisdictionClarificationRetryProposal,
  evaluateJurisdictionClarificationEligibility,
  evaluateJurisdictionClarificationRetryEligibility,
  JURISDICTION_CLARIFICATION_QUESTION,
  JURISDICTION_CLARIFICATION_RETRY_QUESTION,
} from './jurisdiction-clarification'
import { buildHumanContributionClarificationProposal, evaluateHumanContributionClarificationEligibility } from './human-contribution-clarification'
import { deriveKnowledgeReadinessNeeds, buildKnowledgeReadinessProposal } from './knowledge-readiness'
import { deriveSelectorNeeds, buildSelectorNeedProposal } from './selector-questioning'
import { deriveDiscoveredTopicOccurrences, discoveredTopicCategories } from './discovered-relevance'
import type { SessionStore } from './session-store'
import type { CRCSessionState } from './types'
import type { MatrixRow, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { Phase, StructuredUnderstanding } from '@/types/interview-engine'

/**
 * Runtime-owned fixed copy for a turn where nothing is asked but the
 * interview continues -- a previously ownerless responsibility this
 * milestone's own architecture review found (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md
 * §1/§5). No new generation layer, no LLM -- a single fixed string,
 * exactly the same "fixed copy is Runtime's own job" pattern
 * `assemble-projection-output.ts`'s opening_line/closing_cta already are.
 */
const ACKNOWLEDGMENT_COPY = 'Got it ??thanks for sharing that.'

/**
 * CRC Global User-Facing Question Budget milestone (2026-08-26). A ceiling,
 * not a target -- natural completion (checkCompletion) and the interview-
 * scope decline path are both checked before this ever applies, and this
 * bounded-eval-supported value (see CRC-GLOBAL-QUESTION-BUDGET eval,
 * 2026-08-26) only ever stops the organic candidate-precedence chain from
 * proposing question #7, never adds a question that wouldn't otherwise have
 * been asked. Sized from evidence, not intuition -- see that eval's own
 * report for the full reasoning.
 */
const MAX_USER_FACING_QUESTIONS = 6

/**
 * Not imported from lib/interview-engine/eval/empty-structured-understanding.ts
 * deliberately -- that module lives under eval/, and production code must
 * never depend on eval-only code (the same directionality the subsystem-
 * boundaries test suite already enforces elsewhere in this pipeline).
 * Small enough to duplicate rather than relocate the eval module.
 */
function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

export type TurnOutcome = (
  | { kind: 'question'; message: string }
  | { kind: 'acknowledgment'; message: string }
  | { kind: 'complete'; result: CRCPipelineResult }
) & {
  /**
   * CRC Limited Pilot -- Commercial Readiness Discovery Catalog
   * integration, 2026-08-12. Present only on the turn immediately
   * following an asked commercial_readiness_discovery question -- the
   * fixed, verbatim Educational Takeaway for that category. Additive:
   * every existing TurnOutcome consumer that does not check this field is
   * unaffected. Never counts as a question of its own -- it rides along
   * with whatever this turn's own outcome already is (a question, or
   * finalization), never consumes a Model 4 attempt, and never goes
   * through Constraint A/B.
   */
  precedingTakeaway?: string
  /**
   * CRC Identity + Abuse Prevention + Analytics milestone -- discovery
   * analytics instrumentation (design report §11). Surfaces the SAME
   * eligibility evaluation this turn already computed deterministically
   * (no extra LLM call), for route.ts to log as a discovery_signal
   * analytics event. Organic (non-decline) path only -- undefined on the
   * decline branch and on the top-of-turn natural-completion short-circuit,
   * where discovery selection never runs at all.
   *
   * `rejected_by_constraint_b` is deliberately not a possible outcome
   * value: selectEligibleCommercialReadinessCategory already checks the
   * same global cap Constraint B enforces, so by the time a discovery
   * proposal reaches Constraint B the cap is guaranteed unused -- it can
   * only ever be rejected by Constraint A or approved.
   */
  discoverySignal?: {
    eligible_categories: CommercialReadinessCategory[]
    selected_category: CommercialReadinessCategory | null
    /**
     * 'preempted_by_jurisdiction' (CRC Living Knowledge Phase 1,
     * 2026-08-16): Discovery was eligible this turn but jurisdiction
     * clarification won the shared attempt-#1 slot first (PM SS6's
     * precedence rule) -- Discovery was never actually attempted, distinct
     * from 'rejected_by_a' (Constraint A genuinely saw and rejected it).
     * 'preempted_by_human_contribution' (Copyright UAT Correction
     * Milestone, 2026-08-19): same concept, one rung lower in the
     * precedence chain -- Discovery was eligible but human-contribution
     * clarification won the slot instead (jurisdiction was not itself
     * eligible this turn).
     */
    outcome: 'never_eligible' | 'rejected_by_a' | 'asked' | 'preempted_by_jurisdiction' | 'preempted_by_human_contribution'
  }
  /**
   * CRC Living Knowledge Phase 1, 2026-08-16, PM final approval SS4/SS6.
   * Same scope/shape discipline as discoverySignal above -- surfaces the
   * same deterministic eligibility evaluation this turn already computed,
   * for route.ts to log as an analytics event. Organic path only.
   */
  jurisdictionSignal?: {
    eligible: boolean
    outcome: 'never_eligible' | 'rejected_by_a' | 'asked'
  }
  /**
   * Copyright UAT Correction Milestone, 2026-08-19, PM-approved H4. Same
   * scope/shape discipline as jurisdictionSignal above -- surfaces the
   * same deterministic eligibility evaluation this turn already computed,
   * for route.ts to log as an analytics event if/when wired up. Organic
   * path only.
   */
  humanContributionSignal?: {
    eligible: boolean
    /**
     * 'preempted_by_jurisdiction': human-contribution clarification was
     * eligible this turn but jurisdiction clarification won the shared
     * attempt-#1 slot first (jurisdiction > human-contribution precedence)
     * -- human-contribution was never actually attempted, distinct from
     * 'rejected_by_a' (Constraint A genuinely saw and rejected it).
     */
    outcome: 'never_eligible' | 'rejected_by_a' | 'asked' | 'preempted_by_jurisdiction'
  }
}

export interface RunTurnDeps {
  extractor: CandidateExtractor
  generator: CandidateQuestionGenerator
  decider: ConstraintADecider
  sessionStore: SessionStore
  matrix: MatrixRow[]
  /**
   * CRC Living Knowledge Phase 1, 2026-08-16. Optional, defaulted to `[]`
   * inside runTurn() itself (not here) -- every pre-existing caller that
   * constructs RunTurnDeps without it continues to compile and behave
   * identically, same discipline as retrieve()'s own additive parameters.
   */
  topicClaims?: TopicClaim[]
  /**
   * Governed Topic Relationships orchestrator-wiring follow-up,
   * 2026-08-16. Same additive, defaulted-to-`[]`-inside-runTurn() discipline
   * as `topicClaims` immediately above.
   */
  relationships?: TopicRelationship[]
}

export interface RunTurnInput {
  token: string
  turnNumber: number
  userText: string
  declineAction?: DeclineAction
}

type CandidateAttemptResult =
  | { status: 'approved'; outcome: TurnOutcome; nextBoundaryState: BoundaryState; pendingClarification: PendingClarification | null }
  /**
   * `exclusion` is null when nothing legitimate was actually proposed
   * this attempt (generator returned null, or the proposal failed
   * validateCandidateReference -- a hallucinated/stale signal_id isn't a
   * real eligible signal to steer away from) -- in both cases there is
   * nothing meaningful to exclude on a following attempt, matching the
   * same reasoning the approved correction already applies to a null
   * first candidate.
   */
  | { status: 'rejected'; exclusion: CandidateExclusion | null }

/**
 * CRC Limited Pilot -- Model 4 (bounded alternative-question search),
 * 2026-08-10. One full generate -> validate -> Constraint A -> Constraint
 * B attempt, organic (no-decline) path only. Never called for a turn with
 * a declineSignal -- that path's own existing, unchanged inline logic in
 * runTurn() still applies (see Model 4's approved scoping: explicit
 * skip_question/skip_phase declines never get a bounded retry).
 *
 * `excluded`, when supplied by the caller, is passed straight through to
 * the generator as structured (kind, signal_id) facts -- never Constraint
 * A/B's own rationale prose (see anthropic-candidate-question.ts's own
 * buildExclusionInstruction). The exclusion returned on a REJECTED result
 * uses the proposal's own raw target_signal_id (what the model itself
 * understands from eligible_signals), never a lineage-resolved id --
 * lineage resolution is Constraint B's own internal concern
 * (resolveLineageRoot, applied only to the boundary-evaluation call
 * below), and a lineage-root id wouldn't appear in eligible_signals at
 * all, so it would be meaningless to hand back to the next generation
 * call.
 *
 * `proposalOverride` (Commercial Readiness Discovery Catalog integration,
 * 2026-08-12): when supplied, this attempt uses that proposal directly
 * instead of calling `deps.generator` -- the ONLY way a deterministically-
 * constructed catalog candidate enters the pipeline. Every step after
 * generation (exclusion check, validation, Constraint A, Constraint B) is
 * identical either way; a discovery candidate gets no privileged pass. The
 * exclusion check is a no-op for an override in practice (callers never
 * pass both `excluded` and `proposalOverride` -- see run-turn.ts's own
 * organic-branch logic, which only ever uses `proposalOverride` for
 * attempt #1, and `excluded` only for attempt #2's ordinary generator
 * call), left unconditional here rather than special-cased, since it is
 * already harmless when `excluded` is absent.
 */
/**
 * Second-Jurisdiction UX milestone (2026-08-20), J2. Pure, deterministic:
 * true only when a candidate's own target_signal_id literally equals
 * project:jurisdiction AND the jurisdiction ProjectFact is currently
 * confirmed. Never routed through Constraint A -- see boundaries.ts's own
 * targets_confirmed_jurisdiction field header for why this lives here
 * (StructuredUnderstanding-aware orchestration layer) rather than inside
 * boundaries.ts (deliberately StructuredUnderstanding-free).
 */
function targetsConfirmedJurisdiction(signalId: string | undefined, su: StructuredUnderstanding): boolean {
  return signalId === PROJECT_FACT_SIGNAL_IDS.jurisdiction && su.project_facts.jurisdiction.attestation.state === 'confirmed'
}

async function tryCandidate(
  suAfter: StructuredUnderstanding,
  eligible: EligibleSignal[],
  phase: Phase,
  boundaryStateLoaded: BoundaryState,
  deps: RunTurnDeps,
  excluded?: CandidateExclusion[],
  proposalOverride?: CandidateQuestionProposal,
): Promise<CandidateAttemptResult> {
  const proposal = proposalOverride ?? (await deps.generator({ structured_understanding: suAfter, eligible_signals: eligible, phase, excluded }))
  if (!proposal) {
    return { status: 'rejected', exclusion: null }
  }

  // Defensive, deterministic check on the model's own compliance with the
  // exclusion it was given -- no live Constraint A/B call spent
  // re-confirming an answer already known from the first attempt.
  if (excluded && excluded.length > 0 && matchesExclusion(proposal, excluded)) {
    return { status: 'rejected', exclusion: { kind: proposal.question_kind, signal_id: proposal.target_signal_id } }
  }

  const validation = validateCandidateReference(proposal, eligible)
  if (validation.outcome !== 'accepted') {
    return { status: 'rejected', exclusion: null }
  }

  const decision = await deps.decider({ structured_understanding: suAfter, candidate: proposal, phase })
  if (!decision.should_ask) {
    return { status: 'rejected', exclusion: { kind: proposal.question_kind, signal_id: proposal.target_signal_id } }
  }

  const lineageResolvedCandidate: CandidateQuestion = {
    ...(validation.candidate.signal_id
      ? { ...validation.candidate, signal_id: resolveLineageRoot(suAfter, validation.candidate.signal_id) }
      : validation.candidate),
    targets_confirmed_jurisdiction: targetsConfirmedJurisdiction(validation.candidate.signal_id, suAfter),
  }
  // declineSignal is always undefined here -- organic path only.
  const boundaryResult = evaluateBoundary(boundaryStateLoaded, lineageResolvedCandidate, undefined)
  if (!boundaryResult.allowed) {
    return { status: 'rejected', exclusion: { kind: proposal.question_kind, signal_id: proposal.target_signal_id } }
  }

  return {
    status: 'approved',
    outcome: { kind: 'question', message: proposal.question_text },
    nextBoundaryState: boundaryResult.next_state,
    pendingClarification: buildPendingClarification(proposal, suAfter),
  }
}

export async function runTurn(input: RunTurnInput, deps: RunTurnDeps): Promise<TurnOutcome> {
  // CRC Living Knowledge Phase 1, 2026-08-16: defaulted here, not on the
  // RunTurnDeps type itself, so every pre-existing caller continues to
  // compile unmodified. Threaded into runCRCConversation() at every
  // completion call site and into jurisdiction-clarification eligibility.
  const topicClaims = deps.topicClaims ?? []
  // Governed Topic Relationships orchestrator-wiring follow-up,
  // 2026-08-16: same defaulted-here discipline as topicClaims immediately
  // above. Threaded into runCRCConversation() at every completion call
  // site.
  //
  // UPDATE (Interview Engine Diagnostic Slice 1, 2026-08-19): also now
  // threaded into evaluateJurisdictionClarificationEligibility below --
  // that module's own governance gate (relationship Adopted + CRC Eligible:
  // Yes, reproduced independently there, never imported from Retrieval)
  // still means a Reviewer-only or CRC-Pending relationship can never
  // trigger a jurisdiction question; only a relationship that ALREADY
  // passes the identical bar Retrieval itself requires can. This closes the
  // gap where a `copyright_ownership` goal could not see that its own
  // relationship-mediated `copyrightability` claims (reachable once
  // REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 went CRC-eligible) require
  // jurisdiction -- see the Interview Engine Diagnostic's own finding.
  const relationships = deps.relationships ?? []
  const loaded = await deps.sessionStore.load(input.token)
  const suLoaded = loaded?.structured_understanding ?? emptyStructuredUnderstanding()
  const boundaryStateLoaded = loaded?.boundary_state ?? createInitialBoundaryState()
  // Commercial Readiness Discovery Catalog integration, 2026-08-12: the
  // category asked on the PREVIOUS turn, if any -- consumed this turn (see
  // this module's own [COMMERCIAL READINESS DISCOVERY] header note).
  const pendingTakeawayCategory = loaded?.pending_commercial_readiness_takeaway ?? null
  const precedingTakeaway = pendingTakeawayCategory ? getCommercialReadinessTakeaway(pendingTakeawayCategory) : undefined

  // §7 recovery: a completed session never re-enters the loop -- recompute
  // (cheap, pure, safe) rather than accept a new turn against it. No
  // precedingTakeaway attached here -- this is a defensive replay of an
  // already-finished session, not a live turn; any takeaway was already
  // delivered and cleared on the turn that actually completed it.
  if (suLoaded.completion_reason !== null) {
    return { kind: 'complete', result: runCRCConversation(suLoaded, deps.matrix, topicClaims, relationships) }
  }

  const declineSignal = input.declineAction ? resolveDeclineSignal(input.declineAction) : undefined

  // Copyright UAT Cumulative-Restatement Fix, 2026-08-19 (P1): the current
  // confirmed value (if any), from BEFORE this turn's own extraction runs
  // -- gives the (genuinely stateless-per-turn) extractor something real to
  // extend/correct FROM, and doubles as the "something is already
  // confirmed, be conservative" signal. See extraction.ts's own
  // RawUserTurn header and anthropic-extractor.ts's buildUserMessageContent
  // for how this is used.
  const currentHumanContributionDescription =
    suLoaded.project_facts.human_contribution_description.attestation.state === 'confirmed'
      ? suLoaded.project_facts.human_contribution_description.attestation.value
      : null
  // Second-Jurisdiction UX milestone (2026-08-20), J1: true ONLY when the
  // immediately preceding assistant turn asked the deterministic
  // jurisdiction_clarification question or its one bounded retry -- read
  // from BoundaryState (set at the end of THIS function whenever that
  // happens, consumed here, then reset for the state that gets saved this
  // turn), never inferred from this turn's own text. See boundaries.ts's
  // own field header for why this lives in BoundaryState rather than a new
  // CRCSessionState field (zero DB migration).
  const answeringJurisdictionQuestion = boundaryStateLoaded.jurisdiction_clarification_pending_answer === true
  const rawTurn: RawUserTurn = {
    turn: input.turnNumber,
    text: input.userText,
    pending_clarification: loaded?.pending_clarification ?? null,
    current_human_contribution_description: currentHumanContributionDescription,
    answering_jurisdiction_question: answeringJurisdictionQuestion,
  }
  const { updated: extracted } = await runExtractionPipeline(suLoaded, rawTurn, deps.extractor)

  // Decline pre-processing BEFORE gate evaluation -- Phase 7's own shipped
  // bugfix (evaluateGate1's decline branch, and evaluateGate2's decline
  // check, both need this current, not stale).
  const optOutScope = declineSignal?.scope === 'interview' ? 'interview' : extracted.opt_out_scope
  const suForGates: StructuredUnderstanding = { ...extracted, opt_out_scope: optOutScope }

  const gate1 = evaluateGate1(suForGates)
  const gate2Interview = evaluateGate2(suLoaded, suForGates, 'interview')

  const phase = computePhase(suForGates, boundaryStateLoaded)
  const completion = checkCompletion(gate1, gate2Interview, phase, suForGates.opt_out_scope)

  let suAfter: StructuredUnderstanding = {
    ...suForGates,
    current_phase: phase,
    gate_1_state: gate1.state,
    gate_2_state: gate2Interview.state,
    completion_reason: completion.reason,
  }

  // Duplicate-Question Prevention milestone (2026-08-19). Pre-seeds the
  // tool_plan_tier compound cap key for any tool whose plan_tier is ALREADY
  // structurally confirmed (e.g. stated directly, never asked as a
  // candidate) -- see presatisfyStructuralFollowUpNeeds's own header for why
  // this must live here (StructuredUnderstanding-aware) rather than inside
  // boundaries.ts (deliberately StructuredUnderstanding-free). Idempotent,
  // pure, recomputed fresh every turn from current state -- everything
  // below this point uses this value in place of the bare loaded state.
  // Computed BEFORE the completion check below (moved up from its original
  // position immediately following this comment, pre-Selector-Opportunity-
  // Before-Natural-Completion milestone) so the completion guard and the
  // organic candidate-generation path share this exact same value -- one
  // computation, never duplicated.
  const boundaryStateForTurn = presatisfyStructuralFollowUpNeeds(suAfter, boundaryStateLoaded)

  if (completion.is_complete) {
    // Selector Opportunity Before Natural Completion milestone (2026-08-25).
    // Real-UAT-found defect: natural completion (checkCompletion, gates.ts)
    // was entirely independent of whether an already-eligible, un-consumed
    // governed selector need existed -- CRC could finalize with reason
    // gate_1_gate_2_met (or gate_1_unmet_exhausted) one turn before a live
    // tool_account_status-style question ever got a chance to compete in
    // candidate generation below, because natural completion short-circuits
    // before candidate generation ever runs.
    //
    // Fix: reuse deriveSelectorNeeds -- the exact same, sole selector-
    // eligibility authority selector-questioning.ts and the organic path
    // below already use -- as a gate on finalizing. No new eligibility
    // logic is introduced; every existing boundary (once-per-conversation
    // cap, askable_in_crc registry, explicit-confirmed-goal-only relevance,
    // tool scoping, jurisdiction's own dedicated-module exclusion) is
    // inherited for free because this calls the identical function with the
    // identical inputs the real ask-path uses.
    //
    // Never applied to an interview-scope decline (`completion.reason ===
    // 'declined'`): PRD_CRC_v1.0.md §9's User Override rule is explicit --
    // an explicit stop ends things immediately, "regardless of either
    // gate's status" -- this milestone does not relitigate that, matching
    // every other decline-first precedent already in this file (Model 4,
    // jurisdiction, human-contribution all exclude the decline path the
    // same way).
    //
    // Self-limiting, not a checklist: once a selector's own cap is
    // consumed -- whether the user answered clearly, ambiguously, said
    // they don't know, or skipped -- deriveSelectorNeeds stops returning it
    // (see selector-questioning.ts's own `selector_needs_used` cap check),
    // so this guard stops deferring for it. Natural completion is delayed
    // by AT MOST one turn per distinct askable selector fact, ever, never
    // indefinitely -- CRC still completes normally with unresolved
    // governed knowledge exactly as before whenever no selector need is
    // (or is no longer) eligible.
    const pendingSelectorNeeds =
      completion.reason === 'declined' ? [] : deriveSelectorNeeds(suAfter, deps.matrix, topicClaims, boundaryStateForTurn)

    if (pendingSelectorNeeds.length === 0) {
      await deps.sessionStore.save(input.token, {
        structured_understanding: suAfter,
        boundary_state: boundaryStateLoaded,
        pending_clarification: null,
        pending_commercial_readiness_takeaway: null,
      })
      const completeOutcome: TurnOutcome = { kind: 'complete', result: runCRCConversation(suAfter, deps.matrix, topicClaims, relationships) }
      return precedingTakeaway ? { ...completeOutcome, precedingTakeaway } : completeOutcome
    }
    // Else: at least one governed selector need is still live and
    // un-consumed -- fall through to the ordinary candidate-generation
    // path below, exactly like any other not-yet-complete turn. That path
    // (unchanged by this milestone) already computes this exact same
    // deriveSelectorNeeds result again and forces it as the selector's
    // normal attempt-#1 candidate when nothing higher-precedence competes.
    // completion_reason must not persist as non-null on a turn that did
    // NOT actually finalize -- it was set above from checkCompletion's own
    // (now-deferred) verdict, before this guard had a chance to act on it.
    suAfter = { ...suAfter, completion_reason: null }
  }

  const eligible = deriveEligibleSignals(suAfter)

  let nextBoundaryState = boundaryStateForTurn
  let pendingClarification: PendingClarification | null = null
  let outcome: TurnOutcome = { kind: 'acknowledgment', message: ACKNOWLEDGMENT_COPY }
  // Commercial Readiness Discovery Catalog integration, 2026-08-12: set
  // only when THIS turn approves a FRESH discovery candidate; null
  // (consumed) otherwise -- including when a discovery candidate was
  // eligible but rejected, and always on the decline branch below, which
  // never attempts one.
  let nextPendingTakeawayCategory: CommercialReadinessCategory | null = null
  // CRC Identity + Abuse Prevention + Analytics milestone -- discovery
  // analytics instrumentation. Set only on the organic (non-decline)
  // branch below; stays undefined on the decline branch, matching
  // TurnOutcome.discoverySignal's own documented scope.
  let discoverySignal: TurnOutcome['discoverySignal']
  // CRC Living Knowledge Phase 1, 2026-08-16 -- same scope discipline as
  // discoverySignal above.
  let jurisdictionSignal: TurnOutcome['jurisdictionSignal']
  // Copyright UAT Correction Milestone, 2026-08-19 -- same scope discipline
  // as jurisdictionSignal above.
  let humanContributionSignal: TurnOutcome['humanContributionSignal']

  if (declineSignal) {
    // Explicit skip_question/skip_phase decline -- unchanged by Model 4.
    // A user who explicitly asked to move past this specific thing does
    // not get an immediate substitute question; that is a different
    // product decision from the organic-rejection dead end Model 4
    // addresses (see this module's own Model 4 header note below and the
    // approved design review's explicit scoping).
    const proposal = await deps.generator({ structured_understanding: suAfter, eligible_signals: eligible, phase })
    if (proposal) {
      const validation = validateCandidateReference(proposal, eligible)
      if (validation.outcome === 'accepted') {
        const decision = await deps.decider({ structured_understanding: suAfter, candidate: proposal, phase })
        if (decision.should_ask) {
          const lineageResolvedCandidate: CandidateQuestion = {
            ...(validation.candidate.signal_id
              ? { ...validation.candidate, signal_id: resolveLineageRoot(suAfter, validation.candidate.signal_id) }
              : validation.candidate),
            targets_confirmed_jurisdiction: targetsConfirmedJurisdiction(validation.candidate.signal_id, suAfter),
          }
          const boundaryResult = evaluateBoundary(boundaryStateForTurn, lineageResolvedCandidate, declineSignal)
          nextBoundaryState = boundaryResult.next_state
          if (boundaryResult.allowed) {
            outcome = { kind: 'question', message: proposal.question_text }
            pendingClarification = buildPendingClarification(proposal, suAfter)
          }
        } else {
          const boundaryResult = evaluateBoundary(boundaryStateForTurn, { kind: 'other', phase }, declineSignal)
          nextBoundaryState = boundaryResult.next_state
        }
      }
    } else {
      const boundaryResult = evaluateBoundary(boundaryStateForTurn, { kind: 'other', phase }, declineSignal)
      nextBoundaryState = boundaryResult.next_state
    }
  } else {
    // CRC Global User-Facing Question Budget milestone (2026-08-26). Checked
    // BEFORE any of the existing candidate-precedence chain below --
    // jurisdiction/human-contribution/Discovery/selector/ordinary/Track B
    // readiness are all downstream of this check, so once the ceiling is
    // reached, attempt #1 never even begins. A ceiling, not a target: this
    // only ever fires when checkCompletion() and the interview-scope
    // decline path (both above) have already found the conversation not yet
    // complete -- natural completion always wins first. discoverySignal/
    // jurisdictionSignal/humanContributionSignal stay unset here (never
    // became eligible this turn -- correctly matches their own "only set
    // when actually eligible" scoping), the same way they stay unset on the
    // decline branch above.
    if (boundaryStateForTurn.user_facing_questions_asked >= MAX_USER_FACING_QUESTIONS) {
      const suBudgetExhausted: StructuredUnderstanding = { ...suAfter, completion_reason: 'question_budget_exhausted' }
      await deps.sessionStore.save(input.token, {
        structured_understanding: suBudgetExhausted,
        boundary_state: boundaryStateForTurn,
        pending_clarification: null,
        pending_commercial_readiness_takeaway: null,
      })
      const budgetExhaustedOutcome: TurnOutcome = { kind: 'complete', result: runCRCConversation(suBudgetExhausted, deps.matrix, topicClaims, relationships) }
      return precedingTakeaway ? { ...budgetExhaustedOutcome, precedingTakeaway } : budgetExhaustedOutcome
    }

    // CRC Limited Pilot -- Model 4 (bounded alternative-question search),
    // 2026-08-10. Organic path only. At most one alternative attempt
    // after a rejected OR null first candidate -- a null result is not
    // treated as "nothing else is askable": live-trial evidence during
    // the design review showed identical conversational state producing
    // both a null/rejected candidate and a valid question across
    // different runs, so a null first attempt still gets the one bounded
    // retry, with no exclusion invented for it (approved correction,
    // 2026-08-10).
    // CRC Living Knowledge Phase 1, 2026-08-16, PM final approval SS4-SS7.
    // Deterministic, no LLM call -- exact same pattern as Commercial
    // Readiness Discovery below, computed FIRST so its result can take
    // precedence over Discovery for the same attempt-#1 slot (PM SS6: an
    // explicit, narrow precedence rule -- jurisdiction serves an
    // already-stated user goal; Discovery is opportunistic education --
    // never generalized into "jurisdiction always wins").
    //
    // `[CHANGED 2026-08-19]` Copyright UAT Correction Milestone T1: no
    // longer passed `gate1.state === 'met'`. The Gate-1/Knowledge-Question-
    // Timing Diagnostic found this requirement inherited from
    // commercial-readiness-catalog.ts's own formula shape, never
    // independently justified, and empirically starved the deterministic
    // question in a real live UAT (Gate 1 stalled on an unrelated
    // tool-alias-normalization gap, so the governed jurisdiction question
    // never got a turn while the conversation ran to exhaustion). Discovery
    // immediately below is UNCHANGED -- it still requires
    // `gate1.state === 'met'` -- this removal is scoped to jurisdiction
    // only, per its own module header's rationale.
    const jurisdictionEligibility = evaluateJurisdictionClarificationEligibility(
      suAfter,
      topicClaims,
      boundaryStateForTurn.jurisdiction_clarification_asked,
      relationships,
    )
    // Second-Jurisdiction UX milestone (2026-08-20), J3. Computed
    // regardless of jurisdictionEligibility's own result -- the two are
    // mutually exclusive by construction (retry requires the initial
    // question to have already been asked, which is exactly the condition
    // that makes the initial question itself no longer eligible), so at
    // most one of jurisdictionEligibility/jurisdictionRetryEligibility is
    // ever true the same turn. Occupies the SAME jurisdictionProposal slot
    // as the initial question -- never a separate, additional precedence
    // tier -- so every downstream consumer of `jurisdictionProposal` (the
    // forcedProposal chain, the [COMMERCIAL READINESS DISCOVERY] precedence
    // note, the final-save jurisdiction-question detection below) needs no
    // additional branching to account for it.
    const jurisdictionRetryEligibility = evaluateJurisdictionClarificationRetryEligibility(
      suAfter,
      topicClaims,
      boundaryStateForTurn.jurisdiction_clarification_asked,
      boundaryStateForTurn.jurisdiction_clarification_retry_asked,
      relationships,
    )
    const jurisdictionProposal = jurisdictionEligibility.eligible
      ? buildJurisdictionClarificationProposal(phase)
      : jurisdictionRetryEligibility.eligible
        ? buildJurisdictionClarificationRetryProposal(phase)
        : undefined

    // Copyright UAT Correction Milestone, 2026-08-19, PM-approved H3/H4.
    // Deterministic, no LLM call -- same pattern as jurisdiction
    // immediately above, computed SECOND so it can take the shared
    // attempt-#1 slot when jurisdiction is not itself eligible this turn
    // (PM-approved precedence: jurisdiction > human-contribution > Discovery
    // > ordinary organic). No Gate 1 requirement (same reasoning as
    // jurisdiction -- see human-contribution-clarification.ts's own
    // header), but does require its own minimal-workflow-anchor condition,
    // computed inside that module.
    const humanContributionEligibility = evaluateHumanContributionClarificationEligibility(
      suAfter,
      topicClaims,
      boundaryStateForTurn.human_contribution_clarification_asked,
      relationships,
    )
    const humanContributionProposal = humanContributionEligibility.eligible ? buildHumanContributionClarificationProposal(phase) : undefined

    // Commercial Readiness Discovery Catalog integration, 2026-08-12.
    // Deterministic, no LLM call: derive indicators from the SAME suAfter
    // every other candidate-generation step this turn already uses, then
    // ask the catalog's own fixed-priority selection rule whether a
    // category is eligible right now. discoveryCategory is null whenever
    // Gate 1 isn't met, phase !== 3, the global cap is already used, or no
    // category's Applicability is currently affirmative -- in every one of
    // those cases attempt #1 below falls back to the ordinary generator,
    // identical to pre-integration Model 4 behavior.
    const discoveryIndicators = deriveCommercialReadinessIndicators(suAfter)
    const discoveryCategory = selectEligibleCommercialReadinessCategory(
      discoveryIndicators,
      boundaryStateForTurn.commercial_readiness_discovery_asked,
      gate1.state === 'met',
      phase,
    )
    const discoveryProposal = discoveryCategory ? buildCommercialReadinessDiscoveryProposal(discoveryCategory, phase) : undefined

    // CRC Narrow Governed Selector Questioning milestone (2026-08-24),
    // corrected by the CRC Generic Applicability Readiness milestone (same
    // date). Deterministic, no LLM call, no FULL retrieve() call -- see
    // selector-questioning.ts's and applicability-readiness.ts's own
    // headers for why a genuine, generic, Retrieval-owned readiness
    // primitive (covering both TopicClaim and MatrixClaim sources) is used
    // instead of a full Retrieval pass mid-turn. `deps.matrix` is threaded
    // through here so Matrix-origin applicability gaps are visible to
    // selector-questioning -- the same `matrix` every other consumer of
    // `deps` already receives. Computed LAST among the four forced-candidate
    // sources (after jurisdiction/human-contribution/Discovery), so it
    // cannot alter any existing precedence for those three, and so it can
    // never fire for a fact that jurisdiction's own dedicated module already
    // owns (selector-questioning.ts's own HANDLED_BY_DEDICATED_MODULE guard
    // is the actual enforcement; this ordering is additionally the smallest,
    // most non-disruptive insertion point per the accepted design's own
    // §P). The production selector-askability registry shipped empty
    // through the Narrow Governed Selector Questioning milestone -- a
    // dormant capability until a future, separate governance decision
    // registered a real selector fact. That decision has now been made
    // (Activate tool_account_status Selector milestone, 2026-08-24):
    // `selectorNeeds`/`selectorProposal` are live for `tool_account_status`
    // whenever an unresolved, explicit-goal-relevant applicability gap for
    // it exists -- no change to this file's own orchestration was required.
    const selectorNeeds = deriveSelectorNeeds(suAfter, deps.matrix, topicClaims, boundaryStateForTurn)
    const selectorProposal = selectorNeeds.length > 0 ? buildSelectorNeedProposal(selectorNeeds[0], phase) : undefined

    // jurisdiction > human-contribution > Discovery > governed selector when
    // more than one is eligible this turn -- see the precedence comments
    // above.
    const forcedProposal = jurisdictionProposal ?? humanContributionProposal ?? discoveryProposal ?? selectorProposal

    const attempt1 = forcedProposal
      ? await tryCandidate(suAfter, eligible, phase, boundaryStateForTurn, deps, undefined, forcedProposal)
      : await tryCandidate(suAfter, eligible, phase, boundaryStateForTurn, deps)

    // Jurisdiction analytics instrumentation. Deliberately narrower than
    // Discovery's own discoverySignal below: Discovery is unconditionally
    // attached every organic turn because it feeds a live
    // `discovery_signal` analytics event that needs the boring
    // 'never_eligible' case for completeness. Jurisdiction demand is
    // reported differently (PM SS15/SS22: "no new event migration unless
    // genuinely required") -- recomputed on demand from
    // project_facts.jurisdiction across historical sessions, not logged
    // turn-by-turn -- so there is no real consumer for a
    // 'never_eligible' value here, and attaching it unconditionally would
    // only add noise to every existing Interview Engine test/outcome that
    // has nothing to do with Living Knowledge. Left undefined (omitted
    // entirely, same as precedingTakeaway's own optional-field discipline)
    // in the ordinary case; only set when jurisdiction clarification was
    // actually a real candidate this turn.
    if (jurisdictionEligibility.eligible) {
      jurisdictionSignal = { eligible: true, outcome: attempt1.status === 'approved' ? 'asked' : 'rejected_by_a' }
    }

    // Human-contribution analytics instrumentation. Same scope discipline
    // as jurisdictionSignal above: undefined unless human-contribution
    // clarification was actually eligible this turn. Mirrors discoverySignal's
    // own three-way outcome shape (preempted / asked / rejected_by_a): when
    // jurisdiction was ALSO eligible this turn, it wins the slot and
    // human-contribution was never actually attempted -- distinct from a
    // genuine Constraint A rejection.
    if (humanContributionEligibility.eligible) {
      humanContributionSignal = {
        eligible: true,
        outcome: jurisdictionProposal ? 'preempted_by_jurisdiction' : attempt1.status === 'approved' ? 'asked' : 'rejected_by_a',
      }
    }

    // Discovery analytics instrumentation: computed from the SAME inputs
    // discoveryCategory already used (pure, no extra I/O). eligible_categories
    // is every category the fixed-priority selector would have accepted,
    // not just the one it picked -- selectEligibleCommercialReadinessCategory
    // only returns the winner, so this evaluates all three directly.
    // Fully determined by discoveryCategory + attempt1 alone: attempt2
    // (below) is always the ordinary generator, never a second discovery
    // category, so it cannot change this outcome either way.
    // 'preempted_by_jurisdiction' (new, 2026-08-16): Discovery was eligible
    // but jurisdiction won the slot first -- Discovery was never actually
    // attempted this turn, distinct from 'rejected_by_a' (which means
    // Constraint A genuinely saw and rejected it). 'preempted_by_human_
    // contribution' (Copyright UAT Correction Milestone, 2026-08-19): same
    // concept, one rung lower -- jurisdiction was not itself eligible, but
    // human-contribution clarification won the slot instead.
    discoverySignal = {
      eligible_categories: COMMERCIAL_READINESS_CATEGORIES.filter(
        (c) => evaluateCategoryEligibility(c, discoveryIndicators, boundaryStateForTurn.commercial_readiness_discovery_asked, gate1.state === 'met', phase).eligible,
      ),
      selected_category: discoveryCategory,
      outcome:
        discoveryCategory === null
          ? 'never_eligible'
          : jurisdictionProposal
            ? 'preempted_by_jurisdiction'
            : humanContributionProposal
              ? 'preempted_by_human_contribution'
            : attempt1.status === 'approved'
              ? 'asked'
              : 'rejected_by_a',
    }

    if (attempt1.status === 'approved') {
      outcome = attempt1.outcome
      nextBoundaryState = attempt1.nextBoundaryState
      pendingClarification = attempt1.pendingClarification
      if (forcedProposal === discoveryProposal && discoveryProposal) {
        // discoveryCategory is guaranteed non-null here (discoveryProposal
        // was only built from a non-null category). Never set when
        // jurisdiction won the slot -- jurisdiction has no takeaway
        // concept, unlike Discovery.
        nextPendingTakeawayCategory = discoveryCategory
      }
    } else {
      // The ONE bounded alternative attempt (Model 4) is ALWAYS the
      // ordinary candidate pool -- never a second forced/deterministic
      // proposal (neither jurisdiction nor discovery), per
      // the approved integration spec ("If Model 4 attempt #1 proposes a
      // commercial-readiness discovery question and it is rejected, do
      // not use attempt #2 to try a second commercial-readiness
      // category") -- extended identically to jurisdiction (PM SS6: "if
      // the jurisdiction proposal fails Constraint A/B, do not
      // automatically give it another attempt; follow existing Model 4
      // behavior"). No exclusion is threaded from a rejected forced
      // attempt into this call either: exclusion only means something
      // within the SAME generator's own search space, and the ordinary
      // generator was never even called on attempt #1 when attempt #1 was
      // a forced (jurisdiction or discovery) candidate.
      const excluded = !forcedProposal && attempt1.exclusion ? [attempt1.exclusion] : undefined
      const attempt2 = await tryCandidate(suAfter, eligible, phase, boundaryStateForTurn, deps, excluded)
      if (attempt2.status === 'approved') {
        outcome = attempt2.outcome
        nextBoundaryState = attempt2.nextBoundaryState
        pendingClarification = attempt2.pendingClarification
        // attempt2 is always the ordinary generator -- never sets
        // nextPendingTakeawayCategory.
      } else {
        // Track B — Generic Living-Knowledge Readiness/Askability
        // milestone (2026-08-20). LAST-RESORT check, right at the exact
        // point bounded candidate search (attempt1+attempt2) would
        // otherwise declare questioning_exhausted -- never earlier, never
        // stealing a turn from jurisdiction/human-contribution/Discovery/
        // ordinary organic generation above, all of which are entirely
        // unchanged. If an already-relevant, already-candidate governed
        // claim (mirroring lookupTopicClaims's own eligibility gate, never
        // Retrieval itself -- see knowledge-readiness.ts's own header) has
        // an unresolved dependency CRC is registered to proactively ask
        // about, and hasn't exhausted its own bounded attempt budget, this
        // is attempt #3: one more forced, deterministic candidate, through
        // the exact same validate -> Constraint A -> Constraint B pipeline
        // as every other candidate (no privileged pass). If it is also
        // rejected -- or no readiness need exists at all -- exhaustion
        // proceeds exactly as before this milestone.
        //
        // Track A — Generic Discovered Relevance milestone (2026-08-21):
        // the already-relevant claim universe Track B inspects now also
        // includes any topic discovered from structured evidence this turn
        // (e.g. a confirmed iStock mention alongside a commercial_use
        // goal) -- derived fresh, same as every other call site, never
        // persisted. This widens WHICH claims Track B can see; it changes
        // nothing about Track B's own readiness/askability/cap semantics.
        const discoveredTopics = discoveredTopicCategories(deriveDiscoveredTopicOccurrences(suAfter, topicClaims))
        const readinessNeeds = deriveKnowledgeReadinessNeeds(suAfter, topicClaims, boundaryStateForTurn, discoveredTopics)
        const readinessProposal = readinessNeeds[0] ? buildKnowledgeReadinessProposal(readinessNeeds[0], phase) : undefined
        const attempt3 = readinessProposal ? await tryCandidate(suAfter, eligible, phase, boundaryStateForTurn, deps, undefined, readinessProposal) : undefined

        if (attempt3 && attempt3.status === 'approved') {
          outcome = attempt3.outcome
          nextBoundaryState = attempt3.nextBoundaryState
          pendingClarification = attempt3.pendingClarification
        } else {
          // Selector Opportunity at questioning_exhausted milestone
          // (2026-08-25), same slot/reasoning as the Track B readiness
          // check immediately above (attempt3): a real UAT found that
          // checkCompletion()'s own selector-completion guard (added by the
          // prior milestone) correctly defers ordinary gate_1_gate_2_met
          // completion when a governed selector need is still pending, but
          // a HIGHER-precedence forced candidate (jurisdiction/human-
          // contribution/Discovery) can still legitimately occupy attempt 1
          // this same turn, get rejected, exhaust attempt 2 (always the
          // ordinary pool, per Model 4's own unchanged rule), and fall
          // through to questioning_exhausted -- a separate finalization
          // path that never re-consults checkCompletion() and therefore
          // never saw the still-pending selector at all. This is attempt
          // #4 (or #3, if the Track B readiness check above never had a
          // proposal to try), one more forced, deterministic candidate,
          // through the exact same validate -> Constraint A -> Constraint
          // B pipeline as every other candidate -- no privileged pass, and
          // never earlier than this exact last-resort point, so it cannot
          // steal a turn from jurisdiction/human-contribution/Discovery/
          // ordinary organic generation, or from Track B's own readiness
          // check, all of which remain entirely unchanged above. Reuses
          // deriveSelectorNeeds/buildSelectorNeedProposal verbatim -- the
          // exact same sole eligibility/cap/askability authority the
          // ordinary selector path already uses -- so every existing
          // boundary (once-per-conversation cap, askable_in_crc registry,
          // explicit-confirmed-goal-only relevance, tool scoping,
          // jurisdiction's own dedicated-module exclusion) is inherited for
          // free. If rejected, or if no need is eligible at all (already
          // consumed, non-askable, discovered-only, or genuinely none),
          // exhaustion proceeds exactly as before this milestone -- no
          // retry, no fallback to a second forced candidate, no loop.
          const exhaustionSelectorNeeds = deriveSelectorNeeds(suAfter, deps.matrix, topicClaims, boundaryStateForTurn)
          const exhaustionSelectorProposal = exhaustionSelectorNeeds[0] ? buildSelectorNeedProposal(exhaustionSelectorNeeds[0], phase) : undefined
          const attempt4 = exhaustionSelectorProposal ? await tryCandidate(suAfter, eligible, phase, boundaryStateForTurn, deps, undefined, exhaustionSelectorProposal) : undefined

          if (attempt4 && attempt4.status === 'approved') {
            outcome = attempt4.outcome
            nextBoundaryState = attempt4.nextBoundaryState
            pendingClarification = attempt4.pendingClarification
          } else {
            // Bounded search exhausted (including the readiness and
            // selector checks above, if either was even eligible) --
            // finalize. Constructed directly here, never via
            // checkCompletion(), which remains entirely unaware of
            // Constraint B/BoundaryState by design (see COMPLETION_REASONS'
            // own doc in types/interview-engine.ts and this module's own
            // header). Per the approved Track B architecture, gates.ts/
            // checkCompletion() are deliberately left byte-identical -- the
            // readiness and selector checks both live entirely in this
            // orchestration layer, the same layer that already constructs
            // this exact completion_reason value directly. nextBoundaryState
            // is still boundaryStateForTurn here: no rejected attempt
            // (including a rejected attempt3 or attempt4, if either was
            // tried) ever reaches evaluateBoundary's "allowed" branch (the
            // only branch that mutates boundary state), so there is nothing
            // to carry forward beyond what was already loaded.
            const suExhausted: StructuredUnderstanding = { ...suAfter, completion_reason: 'questioning_exhausted' }
            await deps.sessionStore.save(input.token, {
              structured_understanding: suExhausted,
              boundary_state: nextBoundaryState,
              pending_clarification: null,
              pending_commercial_readiness_takeaway: null,
            })
            const exhaustedOutcome: TurnOutcome = {
              kind: 'complete',
              result: runCRCConversation(suExhausted, deps.matrix, topicClaims, relationships),
              discoverySignal,
              jurisdictionSignal,
              humanContributionSignal,
            }
            return precedingTakeaway ? { ...exhaustedOutcome, precedingTakeaway } : exhaustedOutcome
          }
        }
      }
    }
  }

  // Second-Jurisdiction UX milestone (2026-08-20), J1. Computed directly
  // from the FINAL outcome/text -- exact-string comparison against the two
  // fixed, catalog-owned question constants (never LLM-rewritten, per their
  // own module header), never text similarity/fuzzy matching. Explicitly
  // overwrites whatever nextBoundaryState's own value happened to be
  // (evaluateBoundary has no opinion on this field at all, so it always
  // just carries forward whatever boundaryStateForTurn already had) -- this
  // is the one deliberate place that field is allowed to change, consumed
  // by the very next turn's `answeringJurisdictionQuestion` read above.
  const jurisdictionQuestionJustAsked =
    outcome.kind === 'question' &&
    (outcome.message === JURISDICTION_CLARIFICATION_QUESTION || outcome.message === JURISDICTION_CLARIFICATION_RETRY_QUESTION)

  // CRC Global User-Facing Question Budget milestone (2026-08-26). Computed
  // directly from the FINAL outcome, same discipline as
  // jurisdictionQuestionJustAsked immediately above -- the single choke
  // point every path that can produce a real, persisted, user-facing
  // question already funnels through, so this covers every source
  // (jurisdiction, human-contribution, Discovery, selector, Track B
  // readiness, ordinary, and the decline path's own substitute question)
  // uniformly, with no per-source wiring needed. Never incremented for a
  // rejected/internal candidate attempt, a failed model/API call, an
  // educational_takeaway, or an acknowledgment -- those never reach this
  // line as outcome.kind === 'question' in the first place.
  const userFacingQuestionsAsked = nextBoundaryState.user_facing_questions_asked + (outcome.kind === 'question' ? 1 : 0)

  const sessionState: CRCSessionState = {
    structured_understanding: suAfter,
    boundary_state: {
      ...nextBoundaryState,
      jurisdiction_clarification_pending_answer: jurisdictionQuestionJustAsked,
      user_facing_questions_asked: userFacingQuestionsAsked,
    },
    pending_clarification: pendingClarification,
    pending_commercial_readiness_takeaway: nextPendingTakeawayCategory,
  }
  await deps.sessionStore.save(input.token, sessionState)

  let finalOutcome: TurnOutcome = discoverySignal ? { ...outcome, discoverySignal } : outcome
  finalOutcome = jurisdictionSignal ? { ...finalOutcome, jurisdictionSignal } : finalOutcome
  finalOutcome = humanContributionSignal ? { ...finalOutcome, humanContributionSignal } : finalOutcome
  return precedingTakeaway ? { ...finalOutcome, precedingTakeaway } : finalOutcome
}
