/**
 * HRR visible conversational thread — client PRESENTATION / SESSION STATE ONLY
 * (CAH-4G.10 Slice A, 2026-09-11).
 *
 * VISIBLY conversational, NOT yet CONTEXTUALLY conversational. An append-only
 * list of turns the Human Reviewer can scroll back through. It is NEVER
 * reasoning context:
 *
 *   NO turn in this thread is ever sent to the classifier, retrieval,
 *   applicability, Bounded Interpretation, composition, or the audit.
 *
 * Every free-form question is still classified independently from its own text
 * alone, exactly as in production today — see `ReviewerLkLookup` and the
 * unchanged `POST .../reviewer-lk/research` route. `prior_context` /
 * follow-up referent resolution is a later slice (Slice B).
 *
 * No persistence: this state lives in a `useReducer` inside `ReviewerLkLookup`.
 * It survives an inspector tab-switch and inspector close/reopen (the component
 * stays mounted, only hidden); a full page refresh clears it (React remount).
 * No localStorage / sessionStorage / IndexedDB / cookie / URL / DB.
 *
 * Pure + deterministic so it is unit-tested without a React render harness
 * (this repo runs `testEnvironment: 'node'`, no jsdom / RTL).
 */

import type { GoalCategory } from '@/types/interview-engine'
import type { HrrResearchAnswer } from '@/lib/hrr/types'

/**
 * One reviewer research action, recorded truthfully. A topic pick carries the
 * canonical enum + its reviewer-readable label — it is NOT a fabricated typed
 * sentence. A free-form turn carries the reviewer's verbatim question.
 */
export type HrrReviewerTurn =
  | { id: string; seq: number; role: 'reviewer'; entryMode: 'topic'; topic: GoalCategory; label: string }
  | { id: string; seq: number; role: 'reviewer'; entryMode: 'free_form'; question: string }

/** The governed HRR response to the immediately preceding reviewer turn. */
export type HrrResponseTurn =
  | { id: string; seq: number; role: 'hrr'; status: 'pending' }
  | { id: string; seq: number; role: 'hrr'; status: 'answer'; answer: HrrResearchAnswer }
  | { id: string; seq: number; role: 'hrr'; status: 'error'; message: string }

export type HrrThreadTurn = HrrReviewerTurn | HrrResponseTurn

export interface HrrThreadState {
  /** Append-only. A successful turn is never removed or replaced by a later turn. */
  turns: HrrThreadTurn[]
  /** `seq` of the single in-flight request; `0` when idle. One request at a time. */
  inFlight: number
}

export const EMPTY_HRR_THREAD: HrrThreadState = { turns: [], inFlight: 0 }

export type HrrThreadAction =
  /** A research action started: append the reviewer turn + a pending HRR turn, both tagged `seq`. */
  | { type: 'begin'; seq: number; reviewer: HrrReviewerTurn }
  /** The request tagged `seq` resolved. Ignored as stale unless `seq === inFlight`. */
  | { type: 'settle'; seq: number; result: { answer: HrrResearchAnswer } | { message: string } }
  /** "Clear conversation" — back to the initial research state. Client UI only. */
  | { type: 'clear' }

export function hrrThreadReducer(state: HrrThreadState, action: HrrThreadAction): HrrThreadState {
  switch (action.type) {
    case 'begin': {
      // One request at a time — a hard reducer invariant, not just a UI guard.
      if (state.inFlight !== 0) return state
      const pending: HrrResponseTurn = { id: `hrr-${action.seq}`, seq: action.seq, role: 'hrr', status: 'pending' }
      return { turns: [...state.turns, action.reviewer, pending], inFlight: action.seq }
    }
    case 'settle': {
      // A stale response — superseded by a newer request, or arriving after
      // "Clear conversation" — can never resolve a turn.
      if (action.seq !== state.inFlight) return state
      const turns = state.turns.map((t): HrrThreadTurn => {
        if (t.role !== 'hrr' || t.seq !== action.seq || t.status !== 'pending') return t
        return 'answer' in action.result
          ? { id: t.id, seq: t.seq, role: 'hrr', status: 'answer', answer: action.result.answer }
          : { id: t.id, seq: t.seq, role: 'hrr', status: 'error', message: action.result.message }
      })
      return { turns, inFlight: 0 }
    }
    case 'clear':
      return EMPTY_HRR_THREAD
  }
}

/** A truthful reviewer-action record for a topic pick — never a fabricated question. */
export function topicReviewerTurn(seq: number, topic: GoalCategory, label: string): HrrReviewerTurn {
  return { id: `rev-${seq}`, seq, role: 'reviewer', entryMode: 'topic', topic, label }
}

/** The reviewer turn for a free-form question — the verbatim reviewer text. */
export function questionReviewerTurn(seq: number, question: string): HrrReviewerTurn {
  return { id: `rev-${seq}`, seq, role: 'reviewer', entryMode: 'free_form', question }
}
