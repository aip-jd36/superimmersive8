/**
 * POST /api/crc/feedback -- the one lightweight feedback mechanism
 * approved for the CRC Limited Pilot (Part 3). Stores directly on the
 * existing crc_sessions row (feedback_rating/feedback_text) -- no new
 * table, no survey framework, no separate analytics workflow.
 *
 * Requires the session to actually be complete (structured_understanding's
 * own completion_reason set) before accepting feedback -- feedback on an
 * interview that never finished isn't a meaningful signal, and would be
 * silently overwritten by the next real turn's save() anyway.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseSessionStore, saveCrcSessionFeedback } from '@/lib/crc-engine/supabase-session-store'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseFeedbackRequest, type FeedbackRequestBody, type FeedbackResponseBody } from '@/lib/crc-engine/api-contract'
import { logPilotEvent } from '@/lib/crc-engine/pilot-events'

const COOKIE_NAME = 'crc_session'

export async function POST(request: NextRequest) {
  let body: FeedbackRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<FeedbackResponseBody>({ status: 'invalid_request', error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = parseFeedbackRequest(body)
  if ('error' in parsed) {
    return NextResponse.json<FeedbackResponseBody>({ status: 'invalid_request', error: parsed.error }, { status: 400 })
  }

  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json<FeedbackResponseBody>({ status: 'session_not_found' }, { status: 404 })
  }

  const sessionStore = createSupabaseSessionStore(supabaseAdmin)
  const engineState = await sessionStore.load(token)
  if (!engineState) {
    await logPilotEvent(supabaseAdmin, { session_id: token, event_type: 'missing_session' })
    return NextResponse.json<FeedbackResponseBody>({ status: 'session_not_found' }, { status: 404 })
  }
  if (engineState.structured_understanding.completion_reason === null) {
    return NextResponse.json<FeedbackResponseBody>({ status: 'not_complete' }, { status: 409 })
  }

  try {
    await saveCrcSessionFeedback(supabaseAdmin, token, { rating: parsed.rating, text: parsed.text })
  } catch (err) {
    console.error('[api/crc/feedback] saveCrcSessionFeedback failed', err)
    await logPilotEvent(supabaseAdmin, { session_id: token, event_type: 'persistence_error', detail: err instanceof Error ? err.message : String(err) })
    return NextResponse.json<FeedbackResponseBody>({ status: 'retry' }, { status: 503 })
  }

  return NextResponse.json<FeedbackResponseBody>({ status: 'ok' })
}
