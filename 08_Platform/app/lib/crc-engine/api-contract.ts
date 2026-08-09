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
