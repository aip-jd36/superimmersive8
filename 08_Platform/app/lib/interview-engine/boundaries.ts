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
] as const

export type CandidateQuestionKind = (typeof CANDIDATE_QUESTION_KINDS)[number]

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
  'INCIDENT_INVESTIGATION_PROHIBITED',
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
