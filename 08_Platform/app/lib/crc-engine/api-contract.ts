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
import type { ConsultativeNote } from './unresolved-applicability-realization'
import type { SessionCreationRateResult, BurstResult } from './abuse-prevention'

/**
 * The two rate-limit reasons a client can ever actually receive (CRC
 * Rate-Limit UX refinement, 2026-08-14). Sourced from abuse-prevention.ts's
 * own per-check result types rather than redeclared here, so the two stay
 * in sync automatically. `turn_ceiling` is deliberately excluded: route.ts
 * never returns `status: 'rate_limited'` for it -- a hard ceiling finalizes
 * the conversation gracefully via `status: 'complete'` instead, so there is
 * no reason value for it to carry here.
 */
export type RateLimitReason = Extract<SessionCreationRateResult, { limited: true }>['reason'] | Extract<BurstResult, { limited: true }>['reason']

export interface TurnRequestBody {
  message?: unknown
  declineAction?: unknown
  restart?: unknown
  /**
   * Results Gate (CRC Results Gate milestone, 2026-08-14, PM-revised).
   * `email` now only makes sense against an ALREADY-COMPLETE session --
   * the mid-conversation email gate is retired, there is no more "pending
   * message" to resume. Submitting `email` again with a different address
   * is how the user corrects a typo; submitting the same address again is
   * an idempotent no-op (see claim_crc_result_send). `resendResultEmail`
   * is a distinct, explicit action -- bounded separately (cooldown + max
   * count) from an ordinary email submission, and never carries an email
   * field of its own (it always targets the session's current recipient).
   */
  email?: unknown
  resendResultEmail?: unknown
}

/**
 * `restart` is carried on every variant, always false for email/resendResultEmail
 * (a restart concept doesn't apply to them -- they only ever target an
 * existing, completed session) -- keeps `parsed.restart` uniformly
 * accessible without narrowing gymnastics at every call site that only
 * cares about the message/decline branches.
 */
export type ParsedRequest =
  | { kind: 'message'; text: string; restart: boolean }
  | { kind: 'decline'; action: DeclineAction; restart: boolean }
  | { kind: 'email'; email: string; restart: false }
  | { kind: 'resend_result_email'; restart: false }

/** Deliberately simple format validation, not verification -- see design report §1 ("not for v1"). */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseRequest(body: TurnRequestBody): ParsedRequest | { error: string } {
  const restart = body.restart === true

  const hasMessage = typeof body.message === 'string' && body.message.trim().length > 0
  const hasDecline = typeof body.declineAction === 'string'
  const hasEmail = typeof body.email === 'string' && body.email.trim().length > 0
  const hasResend = body.resendResultEmail === true

  const providedCount = [hasMessage, hasDecline, hasEmail, hasResend].filter(Boolean).length
  if (providedCount > 1) {
    return { error: 'Provide exactly one of message, declineAction, email, or resendResultEmail.' }
  }

  if (hasEmail) {
    const trimmed = (body.email as string).trim().toLowerCase()
    if (!EMAIL_FORMAT.test(trimmed)) {
      return { error: 'email must be a valid email address.' }
    }
    return { kind: 'email', email: trimmed, restart: false }
  }
  if (hasResend) {
    return { kind: 'resend_result_email', restart: false }
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
  return { error: 'Request must include a non-empty message, a valid declineAction, an email, or resendResultEmail.' }
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
 * Results Gate `complete` response shape (CRC Results Gate milestone,
 * 2026-08-14, PM-revised). Completion and result-visibility are
 * deliberately orthogonal: `status: 'complete'` means exactly what it
 * always has (the interview is done), for BOTH grandfathered and
 * newly-gated sessions -- `completion_reason` is never overloaded with
 * email/delivery semantics.
 *
 * `grandfathered` (sessions created before CRC_CONFIG.resultsGateLaunchedAt):
 * behaves exactly as this product did before this milestone -- `projection`
 * is present unconditionally, `teaser`/`results_email` are absent (there is
 * no gate to describe). This is the ONLY case `projection` is ever present.
 *
 * Non-grandfathered sessions NEVER receive `projection` in this response,
 * at any point -- not before email, not after a successful send. The full
 * result is delivered by email, never by the browser (the core invariant
 * of this milestone). `teaser` and `results_email` describe the gate's
 * current state instead; `results_email.masked_email` is computed
 * server-side (see results-gate-copy.ts's maskEmail) -- the raw address is
 * never sent back to the client after submission.
 */
export interface CrcTeaser {
  consideration_count: number
}

export interface CrcResultsEmailState {
  status: 'not_sent' | 'pending' | 'accepted' | 'failed' | 'unknown'
  masked_email?: string
  blocked_reason?: string
  error_message?: string
}

export type TurnResponseBody =
  | { status: 'question' | 'acknowledgment'; message: string; precedingTakeaway?: string }
  | {
      status: 'complete'
      grandfathered: boolean
      teaser?: CrcTeaser
      results_email?: CrcResultsEmailState
      projection?: ProjectionOutput
      /** M2B (2026-09-05). Same gating as `projection` above -- present only for grandfathered sessions. See complete-response.ts's own doc comment. */
      consultative_notes?: ConsultativeNote[]
      precedingTakeaway?: string
      attribution_token?: string
      email?: string | null
    }
  | { status: 'session_not_found' }
  | { status: 'rate_limited'; reason?: RateLimitReason; retryAfterSeconds?: number }
  | { status: 'retry'; message?: string }
  | { status: 'invalid_request'; error: string }

/** Only browser-safe fields, same discipline as TurnResponseBody. */
export type SessionStatusResponseBody =
  | { status: 'new' }
  | { status: 'session_not_found' }
  | { status: 'active'; transcript: TranscriptEntry[] }
  | {
      status: 'complete'
      transcript: TranscriptEntry[]
      grandfathered: boolean
      teaser?: CrcTeaser
      results_email?: CrcResultsEmailState
      projection?: ProjectionOutput
      /** M2B (2026-09-05). Same gating as `projection` above -- present only for grandfathered sessions. See complete-response.ts's own doc comment. */
      consultative_notes?: ConsultativeNote[]
      attribution_token?: string
      email?: string | null
    }

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
