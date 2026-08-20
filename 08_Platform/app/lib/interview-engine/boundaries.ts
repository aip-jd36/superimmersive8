/**
 * Conversation boundary state machine -- Constraint B
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 4; INTERVIEW_ENGINE_ARCHITECTURE.md
 * §6; PRD_CRC_v1.0.md §8 normative rules 2, 3, 4, 6).
 *
 * Answers one question only: even if a candidate question would materially
 * improve understanding (Constraint A, evaluated elsewhere), is CRC
 * permitted to ask it? This module never evaluates Constraint A itself, has
 * no opinion on candidate-question quality, and does not import gates.ts,
 * Retrieval, or StructuredUnderstanding -- Constraint A and Constraint B are
 * independent per architecture doc §6, and this file is the concrete
 * enforcement of that boundary in code.
 *
 * Pure functions only: evaluateBoundary never mutates its input BoundaryState.
 * It returns a new BoundaryState (`next_state`) for the caller to carry
 * forward, following the same supersede-rather-than-mutate discipline as
 * mutations.ts.
 *
 * PRD §8 scope note: this implements normative rules 2 (one follow-up per
 * signal, never an incident investigation), 3 (one historical-experience
 * question), 4 (one uncertainty clarification), 6 (user boundaries override
 * completeness, scoped to question/phase/interview), and, added in Phase 6b,
 * 5 (one disentangling question for bundled answers, never resolved by
 * guessing, never repeated drill-down). Rule 5 was deliberately deferred out
 * of Phase 4's original scope -- see CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6b
 * section for the reconciled requirement and its explicit prototype-scoping
 * caveat: the disentangling-question cap below is scoped once-per-interview,
 * a prototype assumption arising from ambiguity in the PRD's own wording
 * (once-per-interview vs. once-per-bundling-event), not settled product
 * meaning. Flagged for a dedicated future evaluation case, not resolved here.
 */

import type { Phase, OptOutScope } from '@/types/interview-engine'

// ── Candidate question classification ───────────────────────────────────────

export const CANDIDATE_QUESTION_KINDS = [
  'follow_up_on_signal',
  'uncertainty_clarification',
  'historical_experience',
  'incident_investigation',
  'disentangling_question',
  'other',
  /**
   * CRC Limited Pilot -- Commercial Readiness Discovery Catalog
   * integration, 2026-08-12. Deterministically constructed by
   * lib/crc-engine/commercial-readiness-catalog.ts, never proposed by the
   * ordinary candidate-question generator (excluded from that adapter's
   * own LLM-facing schema enum -- see anthropic-candidate-question.ts's
   * ORDINARY_GENERATOR_QUESTION_KINDS). Always carries target_signal_id:
   * null -- a discovery question is not a follow-up on any existing
   * signal, so it is never in SIGNAL_REQUIRED_KINDS (candidate-question.ts).
   * Capped globally, once per interview -- see
   * commercial_readiness_discovery_asked below.
   */
  'commercial_readiness_discovery',
  /**
   * CRC Living Knowledge Phase 1, 2026-08-16, PM final approval SS5. Same
   * shape/precedent as 'commercial_readiness_discovery' exactly:
   * deterministically constructed by lib/crc-engine/jurisdiction-
   * clarification.ts, never proposed by the ordinary LLM generator
   * (excluded from anthropic-candidate-question.ts's own schema enum).
   * Always carries target_signal_id: null -- a jurisdiction clarification
   * is not a follow-up on any existing signal. Capped globally, once per
   * interview -- see jurisdiction_clarification_asked below. Takes
   * precedence over 'commercial_readiness_discovery' for the same Model 4
   * attempt-#1 slot when both are eligible the same turn (run-turn.ts) --
   * a narrow, PM-approved precedence rule, not a general "jurisdiction
   * always wins" principle.
   */
  'jurisdiction_clarification',
  /**
   * Copyright UAT Correction Milestone, 2026-08-19, PM-approved H3/H4. Same
   * shape/precedent as 'jurisdiction_clarification' exactly: deterministically
   * constructed by lib/crc-engine/human-contribution-clarification.ts, never
   * proposed by the ordinary LLM generator (excluded from anthropic-
   * candidate-question.ts's own schema enum). Always carries
   * target_signal_id: null -- not a follow-up on any existing signal.
   * Capped globally, once per interview -- see
   * human_contribution_clarification_asked below. Takes precedence over
   * 'commercial_readiness_discovery' for the same Model 4 attempt-#1 slot
   * when both are eligible the same turn, but yields to
   * 'jurisdiction_clarification' when both it and this are eligible the
   * same turn (run-turn.ts) -- claims are not formally applicable until
   * jurisdiction is confirmed.
   */
  'human_contribution_clarification',
  /**
   * Second-Jurisdiction UX milestone (2026-08-20), J3. Exactly one
   * deterministic, fixed-copy retry when the initial jurisdiction_clarification
   * question left jurisdiction unresolved -- same shape/precedent as
   * 'jurisdiction_clarification' exactly: deterministically constructed by
   * lib/crc-engine/jurisdiction-clarification.ts's own
   * buildJurisdictionClarificationRetryProposal, never proposed by the
   * ordinary LLM generator (excluded from anthropic-candidate-question.ts's
   * own schema enum). Always carries target_signal_id: null. Capped
   * globally, once per interview -- see
   * jurisdiction_clarification_retry_asked below. Occupies the SAME
   * deterministic attempt-#1 slot as 'jurisdiction_clarification' in
   * run-turn.ts (never both eligible at once -- the retry's own eligibility
   * function requires the initial question to have already been asked).
   */
  'jurisdiction_clarification_retry',
] as const

export type CandidateQuestionKind = (typeof CANDIDATE_QUESTION_KINDS)[number]

/**
 * Duplicate-Question Prevention milestone (2026-08-19). A small, CLOSED set
 * of narrow follow-up "needs" -- deliberately NOT a generic InformationNeed
 * taxonomy (see the completed Duplicate-Question Diagnostic's own T3
 * assessment: two Class-A cases is not yet evidence a generic framework is
 * warranted). Each value names one specific, already-known question shape
 * this milestone targets:
 * - 'asset_provider_usage' / 'asset_provider_license': the two DISTINCT
 *   follow-up needs a named third-party asset provider (iStock, Getty,
 *   Shutterstock, ...) can raise -- "how was it used in the workflow" vs.
 *   "what license/permission exists for it." Deliberately kept as two
 *   separate values, never collapsed into one "asset provider follow-up" --
 *   the diagnostic's own false-positive guard requires that answering one
 *   must never suppress the other (Duplicate-Question Diagnostic §3/§14).
 * - 'tool_plan_tier': the one tool-mention follow-up need with an existing
 *   structured field (ToolMention.plan_tier) that can be duplicate-asked via
 *   the SAME loophole -- included because it reuses the identical mechanism
 *   at near-zero extra cost, not because tool-mention follow-ups in general
 *   are in scope.
 * This list is expected to grow only when a concrete, reproduced duplicate
 * case justifies a new value -- never speculatively.
 */
export const FOLLOW_UP_NEEDS = ['asset_provider_usage', 'asset_provider_license', 'tool_plan_tier'] as const

export type FollowUpNeed = (typeof FOLLOW_UP_NEEDS)[number]

/**
 * Deliberately carries no question text. "Rephrasing the same prohibited
 * follow-up must not evade the cap" is satisfied structurally, not just by
 * test coverage: the evaluator has no wording to be fooled by in the first
 * place. Caps are keyed entirely by signal_id, which the caller (Extraction/
 * candidate-question generation, Phase 6b) is responsible for assigning
 * consistently to the same underlying topic regardless of how it's phrased.
 */
export interface CandidateQuestion {
  kind: CandidateQuestionKind
  /** Required for 'follow_up_on_signal' and 'uncertainty_clarification'; ignored otherwise. */
  signal_id?: string
  phase: Phase
  /**
   * Duplicate-Question Prevention milestone (2026-08-19). Optional, additive.
   * When present, evaluateBoundary keys its cap to (signal_id, follow_up_need)
   * INSTEAD OF bare signal_id -- this is what lets "asset usage confirmed,
   * license still unresolved" ask the license question even though both
   * target the same signal_id (Duplicate-Question Diagnostic §3/§14's
   * explicit false-positive guard), and what closes the fresh-observation-ID
   * loophole (Diagnostic §13): the need is anchored to the STABLE
   * tool_mention/asset_provider_mention signal_id, never to an ephemeral
   * scoped_observation id that gets freshly minted on every restatement.
   * Absent (undefined) -> zero behavior change from before this milestone;
   * every existing candidate (no caller sets this field yet outside the new
   * code paths) falls through to the untouched per-signal-id logic below.
   */
  follow_up_need?: FollowUpNeed
  /**
   * Second-Jurisdiction UX milestone (2026-08-20), J2. Optional, additive,
   * computed by run-turn.ts (which has StructuredUnderstanding access this
   * module deliberately does not -- see module header) from
   * `target_signal_id === 'project:jurisdiction' && jurisdiction.attestation.state
   * === 'confirmed'`. Deliberately a plain boolean flag, NOT folded into
   * FollowUpNeed (jurisdiction has its own dedicated once-per-interview cap
   * shape via jurisdiction_clarification_asked/jurisdiction_clarification_
   * retry_asked already; this flag exists only to give evaluateBoundary a
   * deterministic, LLM-independent veto over an organic candidate that
   * structurally targets an already-confirmed jurisdiction, mirroring the
   * exact "external flag, boundaries.ts just enforces it" split follow_up_need
   * already established). Absent/false -> zero behavior change.
   */
  targets_confirmed_jurisdiction?: boolean
}

// ── Boundary state ───────────────────────────────────────────────────────────

/**
 * Plain, JSON-safe data -- no Map/Set/class instances -- so it round-trips
 * through JSON.stringify/parse the same way StructuredUnderstanding does
 * (see serialization.ts). Deliberately separate from StructuredUnderstanding,
 * never nested inside it: keeping the two types structurally disjoint is
 * part of what makes "boundary evaluation must not mutate Structured
 * Understanding facts" true by construction, not just by discipline --
 * evaluateBoundary's signature has no StructuredUnderstanding field to
 * touch even accidentally.
 */
export interface BoundaryState {
  /** signal_id -> number of follow-up questions already asked for that signal */
  follow_ups_used: Record<string, number>
  /** signal_id -> number of uncertainty clarifications already asked for that signal */
  uncertainty_clarifications_used: Record<string, number>
  historical_experience_asked: boolean
  /**
   * Rule 5 (PRD §8): true once a disentangling question has been asked.
   * Scoped once-per-interview, same mechanism as historical_experience_asked
   * -- a PROTOTYPE ASSUMPTION (see module header), not settled product
   * meaning. A second, independent bundled ambiguity later in the same
   * interview will be suppressed under this scope, not asked -- documented,
   * not silently accepted as correct.
   */
  disentangling_question_asked: boolean
  /**
   * CRC Limited Pilot -- Commercial Readiness Discovery Catalog
   * integration, 2026-08-12. True once a commercial_readiness_discovery
   * question has been asked. Global, not per-category and not per-signal
   * -- the pilot rule is one discovery question per CONVERSATION, not one
   * per category (mirrors historical_experience_asked's own global-cap
   * shape, not follow_ups_used's per-signal shape). A missing value on an
   * old, pre-migration session deserializes as `undefined`, which is
   * falsy and therefore behaves identically to `false` everywhere this
   * field is read -- safe by construction, no defensive `?? false` needed
   * (same reasoning already applied to historical_experience_asked and
   * disentangling_question_asked when each was added).
   */
  commercial_readiness_discovery_asked: boolean
  /**
   * CRC Living Knowledge Phase 1, 2026-08-16. True once a
   * jurisdiction_clarification question has been asked. Global, once per
   * conversation -- same shape as commercial_readiness_discovery_asked,
   * deliberately a SEPARATE field/cap (PM SS7, "do NOT consume Discovery's
   * own cap merely because a jurisdiction clarification occurred") --
   * jurisdiction serves an already-stated user goal and Discovery is
   * opportunistic education; conflating their budgets would incorrectly
   * block one because the other fired. Same safe-default-on-missing-field
   * reasoning as commercial_readiness_discovery_asked: a pre-Phase-1
   * session deserializes this as `undefined`, which is falsy and behaves
   * identically to `false` everywhere it's read.
   */
  jurisdiction_clarification_asked: boolean
  /**
   * Copyright UAT Correction Milestone, 2026-08-19, PM-approved H4. True
   * once a human_contribution_clarification question has been asked.
   * Global, once per conversation -- same shape as
   * jurisdiction_clarification_asked, deliberately a SEPARATE field/cap
   * (independent budgets, same reasoning as jurisdiction's own cap being
   * kept independent of Discovery's -- "do NOT consume one question
   * source's cap merely because a different one fired"). Same
   * safe-default-on-missing-field reasoning as jurisdiction_clarification_
   * asked: a pre-this-milestone session deserializes this as `undefined`,
   * which is falsy and behaves identically to `false` everywhere it's read.
   */
  human_contribution_clarification_asked: boolean
  /**
   * Second-Jurisdiction UX milestone (2026-08-20), J3. True once the
   * deterministic jurisdiction_clarification_retry question has been asked.
   * Global, once per conversation -- deliberately a SEPARATE cap from
   * jurisdiction_clarification_asked (never conflated: a boolean cannot
   * distinguish "never asked" / "initial asked" / "retry asked" on its
   * own -- see jurisdiction-clarification.ts's own retry-eligibility
   * function for how both are read together). Same safe-default-on-missing-
   * field reasoning as every other `_asked` field above: a pre-this-
   * milestone session deserializes this as `undefined`, falsy, behaves
   * identically to `false`.
   */
  jurisdiction_clarification_retry_asked: boolean
  /**
   * Second-Jurisdiction UX milestone (2026-08-20), J1. True for exactly one
   * turn: the turn immediately AFTER either jurisdiction_clarification or
   * jurisdiction_clarification_retry was approved and asked. Consumed
   * (read, then explicitly reset) by run-turn.ts at the start of that next
   * turn to set RawUserTurn.answering_jurisdiction_question -- the narrow
   * question-context signal extraction needs to distinguish a direct
   * response to CRC's own explicit jurisdiction question from an unprompted
   * mention of the same words. Deliberately lives HERE (inside
   * BoundaryState, which already round-trips generically through
   * serialization.ts and the Supabase `boundary_state` JSONB column) rather
   * than as a new top-level CRCSessionState field, specifically so this
   * milestone requires zero DB migration -- mirrors
   * pending_commercial_readiness_takeaway's own role/lifecycle exactly,
   * just addressed at the BoundaryState layer instead of CRCSessionState's,
   * since BoundaryState's persistence path needs no new column at all. Same
   * safe-default-on-missing-field reasoning as every `_asked` field above.
   */
  jurisdiction_clarification_pending_answer: boolean
  /** True once an interview-scoped decline has occurred; persists across all future evaluations. */
  interview_ended: boolean
  /** Phases closed by a phase-scoped decline. A phase not in this list is unaffected, even after another phase closes -- closing one phase must not automatically end unrelated future questioning in a different phase. */
  phases_ended: Phase[]
}

export function createInitialBoundaryState(): BoundaryState {
  return {
    follow_ups_used: {},
    uncertainty_clarifications_used: {},
    historical_experience_asked: false,
    disentangling_question_asked: false,
    commercial_readiness_discovery_asked: false,
    jurisdiction_clarification_asked: false,
    human_contribution_clarification_asked: false,
    jurisdiction_clarification_retry_asked: false,
    jurisdiction_clarification_pending_answer: false,
    interview_ended: false,
    phases_ended: [],
  }
}

// ── Decline input ────────────────────────────────────────────────────────────

/**
 * Represents a decline that just occurred, to be processed on this
 * evaluation. `scope` reuses OptOutScope directly (the same type
 * StructuredUnderstanding.opt_out_scope already uses) rather than inventing
 * a parallel enum -- one decline-scope vocabulary for the whole engine.
 * `'ambiguous'` is this module's own addition: the scope the user expressed
 * genuinely isn't classifiable into question/phase/interview from what they
 * said. Per the invariant "must not infer a broader opt-out than the user
 * expressed," ambiguous defaults to the NARROWEST scope (question-level
 * suppression only) rather than escalating -- with a distinct reason_code so
 * the ambiguity itself stays visible in debug context instead of silently
 * looking identical to an explicit question-level decline.
 */
export interface DeclineSignal {
  scope: Exclude<OptOutScope, null> | 'ambiguous'
}

// ── Result shape ─────────────────────────────────────────────────────────────

export const BOUNDARY_ACTION_SCOPES = ['ask', 'suppress_current_question', 'end_current_phase', 'end_interview'] as const

export type BoundaryActionScope = (typeof BOUNDARY_ACTION_SCOPES)[number]

/**
 * Deliberately one code per distinct firing rule -- never a single generic
 * "do not ask" -- so a caller (and a human reading logs) can tell a depth
 * cap from an absolute prohibition from a user boundary without inspecting
 * anything else.
 */
export const BOUNDARY_REASON_CODES = [
  'ALLOWED',
  'FOLLOW_UP_CAP_REACHED',
  'UNCERTAINTY_CLARIFICATION_CAP_REACHED',
  'HISTORICAL_EXPERIENCE_ALREADY_ASKED',
  'DISENTANGLING_QUESTION_ALREADY_ASKED',
  'COMMERCIAL_READINESS_DISCOVERY_ALREADY_ASKED',
  'JURISDICTION_CLARIFICATION_ALREADY_ASKED',
  'HUMAN_CONTRIBUTION_CLARIFICATION_ALREADY_ASKED',
  'INCIDENT_INVESTIGATION_PROHIBITED',
  /**
   * Duplicate-Question Prevention milestone (2026-08-19). Fires whenever
   * candidate.follow_up_need is present and its (signal_id, follow_up_need)
   * compound key has already been asked once -- same "1 ask, ever" shape as
   * FOLLOW_UP_CAP_REACHED, generalized to a need-scoped key so two distinct
   * needs about the same signal (e.g. asset usage vs. asset license) are
   * capped independently rather than sharing one budget.
   */
  'FOLLOW_UP_NEED_ALREADY_ASKED',
  /**
   * Second-Jurisdiction UX milestone (2026-08-20), J3. Same "1 ask, ever"
   * global-cap shape as JURISDICTION_CLARIFICATION_ALREADY_ASKED, for the
   * separate jurisdiction_clarification_retry_asked cap.
   */
  'JURISDICTION_CLARIFICATION_RETRY_ALREADY_ASKED',
  /**
   * Second-Jurisdiction UX milestone (2026-08-20), J2. Fires whenever
   * candidate.targets_confirmed_jurisdiction is true -- a deterministic,
   * LLM-independent veto, checked before the per-kind switch below (same
   * placement discipline as the follow_up_need check), so an organic
   * candidate that structurally targets project:jurisdiction can never
   * reach the user once jurisdiction is confirmed, regardless of what
   * Constraint A decided.
   */
  'JURISDICTION_ALREADY_CONFIRMED',
  'USER_DECLINED_QUESTION',
  'USER_DECLINED_PHASE',
  'USER_DECLINED_INTERVIEW',
  'DECLINE_SCOPE_AMBIGUOUS_DEFAULTED_TO_QUESTION',
  'PHASE_ALREADY_ENDED_BY_DECLINE',
  'INTERVIEW_ALREADY_ENDED_BY_DECLINE',
] as const

export type BoundaryReasonCode = (typeof BOUNDARY_REASON_CODES)[number]

export interface BoundaryResult {
  allowed: boolean
  reason_code: BoundaryReasonCode
  action_scope: BoundaryActionScope
  /** The state to carry forward. The input BoundaryState is never mutated. */
  next_state: BoundaryState
  debug: {
    /** Human-legible: which specific rule fired. */
    fired_boundary: string
    candidate_kind: CandidateQuestionKind
    signal_id?: string
  }
}

// ── Evaluator ────────────────────────────────────────────────────────────────

export function evaluateBoundary(
  state: BoundaryState,
  candidate: CandidateQuestion,
  decline?: DeclineSignal,
): BoundaryResult {
  if ((candidate.kind === 'follow_up_on_signal' || candidate.kind === 'uncertainty_clarification') && !candidate.signal_id) {
    throw new Error(`candidate.signal_id is required for kind '${candidate.kind}'`)
  }

  // ── Persistent boundary state takes precedence over everything else:
  // once ended, a scope stays ended for all future evaluations, regardless
  // of what candidate or decline is being evaluated now. Checked before a
  // fresh decline so a new decline signal arriving after the interview
  // already ended doesn't produce a confusing/different result.
  if (state.interview_ended) {
    return {
      allowed: false,
      reason_code: 'INTERVIEW_ALREADY_ENDED_BY_DECLINE',
      action_scope: 'end_interview',
      next_state: state,
      debug: { fired_boundary: 'interview_ended (persistent)', candidate_kind: candidate.kind, signal_id: candidate.signal_id },
    }
  }
  if (state.phases_ended.includes(candidate.phase)) {
    return {
      allowed: false,
      reason_code: 'PHASE_ALREADY_ENDED_BY_DECLINE',
      action_scope: 'end_current_phase',
      next_state: state,
      debug: { fired_boundary: `phase_ended:${candidate.phase} (persistent)`, candidate_kind: candidate.kind, signal_id: candidate.signal_id },
    }
  }

  // ── A fresh decline overrides normal cap-checking for this turn. It is
  // never re-interpreted as unknown/absence/stability/completion -- it
  // produces its own reason code and, for phase/interview scope, persists
  // into next_state so all FUTURE evaluations for that scope are blocked too
  // (see the persistent checks above). Question-scoped declines are NOT
  // persisted anywhere -- they suppress only this one turn, exactly like an
  // ordinary depth cap, and leave state untouched.
  if (decline) {
    if (decline.scope === 'interview') {
      return {
        allowed: false,
        reason_code: 'USER_DECLINED_INTERVIEW',
        action_scope: 'end_interview',
        next_state: { ...state, interview_ended: true },
        debug: { fired_boundary: 'user_decline:interview', candidate_kind: candidate.kind, signal_id: candidate.signal_id },
      }
    }
    if (decline.scope === 'phase') {
      return {
        allowed: false,
        reason_code: 'USER_DECLINED_PHASE',
        action_scope: 'end_current_phase',
        next_state: { ...state, phases_ended: [...state.phases_ended, candidate.phase] },
        debug: { fired_boundary: `user_decline:phase:${candidate.phase}`, candidate_kind: candidate.kind, signal_id: candidate.signal_id },
      }
    }
    if (decline.scope === 'ambiguous') {
      return {
        allowed: false,
        reason_code: 'DECLINE_SCOPE_AMBIGUOUS_DEFAULTED_TO_QUESTION',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'user_decline:ambiguous->question (narrowest default)', candidate_kind: candidate.kind, signal_id: candidate.signal_id },
      }
    }
    // decline.scope === 'question'
    return {
      allowed: false,
      reason_code: 'USER_DECLINED_QUESTION',
      action_scope: 'suppress_current_question',
      next_state: state,
      debug: { fired_boundary: 'user_decline:question', candidate_kind: candidate.kind, signal_id: candidate.signal_id },
    }
  }

  // ── No decline this turn: evaluate the candidate against the per-kind caps.

  if (candidate.kind === 'incident_investigation') {
    // Absolute prohibition, not a counter -- PRD §8 Rule 2 ("never conduct
    // an incident investigation"). Fires regardless of how many times it's
    // asked, and regardless of any claim that it would add information --
    // Constraint B is independent of Constraint A's material-improvement
    // judgment.
    return {
      allowed: false,
      reason_code: 'INCIDENT_INVESTIGATION_PROHIBITED',
      action_scope: 'suppress_current_question',
      next_state: state,
      debug: { fired_boundary: 'incident_investigation (absolute prohibition)', candidate_kind: candidate.kind },
    }
  }

  // ── Second-Jurisdiction UX milestone (2026-08-20), J2. Checked BEFORE the
  // per-kind switch below, REGARDLESS of candidate.kind (covers 'other' and
  // any signal-bearing kind an organic candidate might use to target
  // project:jurisdiction). Deterministic, LLM-independent -- Constraint A is
  // never consulted for this veto. When absent/false, zero behavior change.
  if (candidate.targets_confirmed_jurisdiction) {
    return {
      allowed: false,
      reason_code: 'JURISDICTION_ALREADY_CONFIRMED',
      action_scope: 'suppress_current_question',
      next_state: state,
      debug: { fired_boundary: 'jurisdiction_already_confirmed', candidate_kind: candidate.kind, signal_id: candidate.signal_id },
    }
  }

  // ── Duplicate-Question Prevention milestone (2026-08-19). Checked BEFORE
  // the per-kind switch below, and REGARDLESS of candidate.kind (covers both
  // 'follow_up_on_signal' and 'other' -- Diagnostic §8's own finding that
  // 'other' is exactly where the uncapped duplicate risk lives). When
  // absent, every candidate falls straight through to the unchanged
  // per-kind logic below -- zero behavior change for any existing caller.
  if (candidate.follow_up_need) {
    const capKey = `${candidate.signal_id ?? 'none'}::${candidate.follow_up_need}`
    const used = state.follow_ups_used[capKey] ?? 0
    if (used >= 1) {
      return {
        allowed: false,
        reason_code: 'FOLLOW_UP_NEED_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: `follow_up_need_cap:${capKey}`, candidate_kind: candidate.kind, signal_id: candidate.signal_id },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, follow_ups_used: { ...state.follow_ups_used, [capKey]: used + 1 } },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind, signal_id: candidate.signal_id },
    }
  }

  if (candidate.kind === 'follow_up_on_signal') {
    const signalId = candidate.signal_id!
    const used = state.follow_ups_used[signalId] ?? 0
    if (used >= 1) {
      return {
        allowed: false,
        reason_code: 'FOLLOW_UP_CAP_REACHED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: `follow_up_cap:${signalId}`, candidate_kind: candidate.kind, signal_id: signalId },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, follow_ups_used: { ...state.follow_ups_used, [signalId]: used + 1 } },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind, signal_id: signalId },
    }
  }

  if (candidate.kind === 'uncertainty_clarification') {
    const signalId = candidate.signal_id!
    const used = state.uncertainty_clarifications_used[signalId] ?? 0
    if (used >= 1) {
      return {
        allowed: false,
        reason_code: 'UNCERTAINTY_CLARIFICATION_CAP_REACHED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: `uncertainty_clarification_cap:${signalId}`, candidate_kind: candidate.kind, signal_id: signalId },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, uncertainty_clarifications_used: { ...state.uncertainty_clarifications_used, [signalId]: used + 1 } },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind, signal_id: signalId },
    }
  }

  if (candidate.kind === 'historical_experience') {
    if (state.historical_experience_asked) {
      return {
        allowed: false,
        reason_code: 'HISTORICAL_EXPERIENCE_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'historical_experience_cap', candidate_kind: candidate.kind },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, historical_experience_asked: true },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
    }
  }

  if (candidate.kind === 'disentangling_question') {
    // Rule 5 (PRD §8): at most one, ever suppress repeated drill-down.
    // target_signal_id is deliberately not required here -- a disentangling
    // question is about the relationship BETWEEN multiple signals, not a
    // follow-up on one, so candidate.signal_id is expected to be absent for
    // this kind (see candidate-question.ts's validateCandidateReference).
    if (state.disentangling_question_asked) {
      return {
        allowed: false,
        reason_code: 'DISENTANGLING_QUESTION_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'disentangling_question_cap (once per interview -- prototype assumption)', candidate_kind: candidate.kind },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, disentangling_question_asked: true },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
    }
  }

  if (candidate.kind === 'commercial_readiness_discovery') {
    // CRC Limited Pilot -- Commercial Readiness Discovery Catalog
    // integration, 2026-08-12. Global cap, at most one ever, same shape as
    // historical_experience above (never per-signal -- candidate.signal_id
    // is expected to be absent for this kind, same reasoning as
    // disentangling_question: the catalog's own eligibility/priority logic
    // in commercial-readiness-catalog.ts already picks a single category,
    // this is only the enforcement layer, and it has no opinion on WHICH
    // category was asked, only THAT one was).
    if (state.commercial_readiness_discovery_asked) {
      return {
        allowed: false,
        reason_code: 'COMMERCIAL_READINESS_DISCOVERY_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'commercial_readiness_discovery_cap (once per interview)', candidate_kind: candidate.kind },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, commercial_readiness_discovery_asked: true },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
    }
  }

  if (candidate.kind === 'jurisdiction_clarification') {
    // CRC Living Knowledge Phase 1, 2026-08-16. Same global-cap shape as
    // commercial_readiness_discovery above -- see that branch's own
    // comment for why candidate.signal_id is expected absent here too.
    // The eligibility DECISION (is there an active goal that needs this,
    // is jurisdiction still unconfirmed/undeclined) is made upstream in
    // lib/crc-engine/jurisdiction-clarification.ts, exactly mirroring how
    // commercial-readiness-catalog.ts owns Discovery's own eligibility --
    // this evaluator has no opinion on WHY a jurisdiction_clarification
    // candidate was proposed, only THAT the once-per-interview cap holds.
    if (state.jurisdiction_clarification_asked) {
      return {
        allowed: false,
        reason_code: 'JURISDICTION_CLARIFICATION_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'jurisdiction_clarification_cap (once per interview)', candidate_kind: candidate.kind },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, jurisdiction_clarification_asked: true },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
    }
  }

  if (candidate.kind === 'jurisdiction_clarification_retry') {
    // Second-Jurisdiction UX milestone (2026-08-20), J3. Same global-cap
    // shape as jurisdiction_clarification above, deliberately a SEPARATE
    // field (jurisdiction_clarification_retry_asked) -- a bare boolean
    // cannot distinguish "never asked" / "initial asked" / "retry asked" on
    // its own. The eligibility DECISION (retry only after the initial
    // question was already asked, jurisdiction still unresolved, retry not
    // yet used) is made upstream in jurisdiction-clarification.ts's own
    // evaluateJurisdictionClarificationRetryEligibility -- this evaluator
    // has no opinion on WHY a retry candidate was proposed, only THAT the
    // once-per-interview cap holds.
    if (state.jurisdiction_clarification_retry_asked) {
      return {
        allowed: false,
        reason_code: 'JURISDICTION_CLARIFICATION_RETRY_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'jurisdiction_clarification_retry_cap (once per interview)', candidate_kind: candidate.kind },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, jurisdiction_clarification_retry_asked: true },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
    }
  }

  if (candidate.kind === 'human_contribution_clarification') {
    // Copyright UAT Correction Milestone, 2026-08-19, PM-approved H4. Same
    // global-cap shape as jurisdiction_clarification above -- see that
    // branch's own comment for why candidate.signal_id is expected absent
    // here too. The eligibility DECISION is made upstream in
    // lib/crc-engine/human-contribution-clarification.ts, exactly
    // mirroring how jurisdiction-clarification.ts owns jurisdiction's own
    // eligibility -- this evaluator has no opinion on WHY a
    // human_contribution_clarification candidate was proposed, only THAT
    // the once-per-interview cap holds.
    if (state.human_contribution_clarification_asked) {
      return {
        allowed: false,
        reason_code: 'HUMAN_CONTRIBUTION_CLARIFICATION_ALREADY_ASKED',
        action_scope: 'suppress_current_question',
        next_state: state,
        debug: { fired_boundary: 'human_contribution_clarification_cap (once per interview)', candidate_kind: candidate.kind },
      }
    }
    return {
      allowed: true,
      reason_code: 'ALLOWED',
      action_scope: 'ask',
      next_state: { ...state, human_contribution_clarification_asked: true },
      debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
    }
  }

  // candidate.kind === 'other': not subject to any boundary rule implemented
  // here. Constraint B has no opinion on ordinary Phase 1-2 discovery
  // questions -- Constraint A (elsewhere) is what decides whether to ask.
  return {
    allowed: true,
    reason_code: 'ALLOWED',
    action_scope: 'ask',
    next_state: state,
    debug: { fired_boundary: 'none', candidate_kind: candidate.kind },
  }
}
