/**
 * POST/GET /api/crc/turn's request-parsing logic and response body types
 * (CRC Product Integration -- First Usable Live Slice, Phase 4).
 *
 * Lives OUTSIDE app/api/crc/turn/route.ts, not inside it -- confirmed live
 * (2026-08-09) that Next.js's own generated route-shape type-checking
 * (.next/types/app/api/crc/turn/route.ts) rejects a Route Handler file
 * that exports anything beyond the fixed set it expects (GET/POST/etc.
 * plus a small list of special config exports); any other named export
 * fails typecheck under `next build`'s own strict route typing, not just
 * a style preference. `route.ts` imports and uses these; the test file
 * and the CRC page import them from here directly, never from route.ts.
 */

import type { DeclineAction } from './decline'
import { DECLINE_ACTIONS } from './decline'
import type { TranscriptEntry } from './supabase-session-store'
import type { ProjectionOutput } from '@/lib/projection-layer/types'

export interface TurnRequestBody {
  message?: unknown
  declineAction?: unknown
  restart?: unknown
}

export type ParsedRequest =
  | { kind: 'message'; text: string; restart: boolean }
  | { kind: 'decline'; action: DeclineAction; restart: boolean }

export function parseRequest(body: TurnRequestBody): ParsedRequest | { error: string } {
  const restart = body.restart === true

  const hasMessage = typeof body.message === 'string' && body.message.trim().length > 0
  const hasDecline = typeof body.declineAction === 'string'

  if (hasMessage && hasDecline) {
    return { error: 'Provide either message or declineAction, not both.' }
  }
  if (hasDecline) {
    if (!DECLINE_ACTIONS.includes(body.declineAction as DeclineAction)) {
      return { error: `declineAction must be one of: ${DECLINE_ACTIONS.join(', ')}.` }
    }
    return { kind: 'decline', action: body.declineAction as DeclineAction, restart }
  }
  if (hasMessage) {
    return { kind: 'message', text: (body.message as string).trim(), restart }
  }
  return { error: 'Request must include a non-empty message or a valid declineAction.' }
}

/** Only browser-safe fields -- see route.ts's own module header and Phase 4's exclusion list. */
export type TurnResponseBody =
  | { status: 'question' | 'acknowledgment'; message: string }
  | { status: 'complete'; projection: ProjectionOutput }
  | { status: 'session_not_found' }
  | { status: 'retry' }
  | { status: 'invalid_request'; error: string }

/** Only browser-safe fields, same discipline as TurnResponseBody. */
export type SessionStatusResponseBody =
  | { status: 'new' }
  | { status: 'session_not_found' }
  | { status: 'active'; transcript: TranscriptEntry[] }
  | { status: 'complete'; transcript: TranscriptEntry[]; projection: ProjectionOutput }

/**
 * POST /api/crc/feedback's own request-parsing logic and response body
 * types (CRC Limited Pilot, Part 3). Lives here for the same reason as the
 * turn contract above -- kept out of route.ts so Next.js's route-shape
 * typechecking doesn't reject the extra exports.
 */
export const FEEDBACK_RATINGS = ['yes', 'somewhat', 'no'] as const
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number]

export interface FeedbackRequestBody {
  rating?: unknown
  text?: unknown
}

export type ParsedFeedbackRequest = { rating: FeedbackRating; text: string | null }

export function parseFeedbackRequest(body: FeedbackRequestBody): ParsedFeedbackRequest | { error: string } {
  if (typeof body.rating !== 'string' || !FEEDBACK_RATINGS.includes(body.rating as FeedbackRating)) {
    return { error: `rating must be one of: ${FEEDBACK_RATINGS.join(', ')}.` }
  }
  if (body.text !== undefined && typeof body.text !== 'string') {
    return { error: 'text must be a string if provided.' }
  }
  const trimmed = typeof body.text === 'string' ? body.text.trim() : ''
  return { rating: body.rating as FeedbackRating, text: trimmed.length > 0 ? trimmed : null }
}

/** Only browser-safe fields. `not_complete` covers a feedback attempt before the interview has actually finished. */
export type FeedbackResponseBody =
  | { status: 'ok' }
  | { status: 'session_not_found' }
  | { status: 'not_complete' }
  | { status: 'retry' }
  | { status: 'invalid_request'; error: string }
