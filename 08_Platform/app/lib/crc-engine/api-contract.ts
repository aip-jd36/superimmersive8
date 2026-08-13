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
  /**
   * Email gate (CRC Identity + Abuse Prevention + Analytics milestone).
   * `email` and `declineEmail` are their own round-trip, separate from an
   * ordinary message/decline turn -- sent only in response to a prior
   * `{status: 'email_required'}`, never combined with message/declineAction
   * in the same request.
   */
  email?: unknown
  declineEmail?: unknown
}

/**
 * `restart` is carried on every variant, always false for email/decline_email
 * (a restart concept doesn't apply to them -- they only ever target an
 * existing session) -- keeps `parsed.restart` uniformly accessible without
 * narrowing gymnastics at every call site that only cares about the
 * message/decline branches.
 */
export type ParsedRequest =
  | { kind: 'message'; text: string; restart: boolean }
  | { kind: 'decline'; action: DeclineAction; restart: boolean }
  | { kind: 'email'; email: string; restart: false }
  | { kind: 'decline_email'; restart: false }

/** Deliberately simple format validation, not verification -- see design report §1 ("not for v1"). */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseRequest(body: TurnRequestBody): ParsedRequest | { error: string } {
  const restart = body.restart === true

  const hasMessage = typeof body.message === 'string' && body.message.trim().length > 0
  const hasDecline = typeof body.declineAction === 'string'
  const hasEmail = typeof body.email === 'string' && body.email.trim().length > 0
  const hasDeclineEmail = body.declineEmail === true

  const providedCount = [hasMessage, hasDecline, hasEmail, hasDeclineEmail].filter(Boolean).length
  if (providedCount > 1) {
    return { error: 'Provide exactly one of message, declineAction, email, or declineEmail.' }
  }

  if (hasEmail) {
    const trimmed = (body.email as string).trim().toLowerCase()
    if (!EMAIL_FORMAT.test(trimmed)) {
      return { error: 'email must be a valid email address.' }
    }
    return { kind: 'email', email: trimmed, restart: false }
  }
  if (hasDeclineEmail) {
    return { kind: 'decline_email', restart: false }
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
  return { error: 'Request must include a non-empty message, a valid declineAction, an email, or declineEmail.' }
}

/**
 * Only browser-safe fields -- see route.ts's own module header and Phase
 * 4's exclusion list. `precedingTakeaway` (CRC Limited Pilot -- Commercial
 * Readiness Discovery Catalog integration, 2026-08-12): present only on
 * the turn immediately following an asked commercial_readiness_discovery
 * question -- fixed, catalog-owned Educational Takeaway text, rendered as
 * its own message ahead of this response's own message/projection. Never
 * a verdict, never routed through ProjectionOutput.
 */
/**
 * `attribution_token`/`email` (CRC Identity + Abuse Prevention + Analytics
 * milestone) ride along on a `complete` response so the client can build
 * the Calendly attribution URL (design report §9) -- attribution_token is
 * a deliberately opaque, non-reversible public token, never the real
 * session id, so exposing it to the client and to Calendly's own
 * referrer/URL is not a sensitive-data concern.
 *
 * `email_required` (design report §1): returned BEFORE runTurn() is ever
 * called, with no side effects -- the client's pending message is not
 * consumed, and must be resubmitted once email is provided or declined.
 * `email_accepted` acknowledges a successful email submission; the client
 * is expected to immediately resubmit its original pending request.
 */
export type TurnResponseBody =
  | { status: 'question' | 'acknowledgment'; message: string; precedingTakeaway?: string }
  | { status: 'complete'; projection: ProjectionOutput; precedingTakeaway?: string; attribution_token?: string; email?: string | null }
  | { status: 'email_required' }
  | { status: 'email_accepted' }
  | { status: 'session_not_found' }
  | { status: 'rate_limited'; retryAfterSeconds?: number }
  | { status: 'retry' }
  | { status: 'invalid_request'; error: string }

/** Only browser-safe fields, same discipline as TurnResponseBody. */
export type SessionStatusResponseBody =
  | { status: 'new' }
  | { status: 'session_not_found' }
  | { status: 'active'; transcript: TranscriptEntry[] }
  | { status: 'complete'; transcript: TranscriptEntry[]; projection: ProjectionOutput; attribution_token?: string; email?: string | null }

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
