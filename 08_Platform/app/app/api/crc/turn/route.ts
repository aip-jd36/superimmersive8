/**
 * POST /api/crc/turn -- the one live-turn Route Handler for the CRC
 * conversation (CRC Product Integration -- First Usable Live Slice,
 * Phase 4).
 *
 * Responsibilities only: resolve/create the session, load server-side
 * state, validate the incoming request, invoke runTurn(), persist the
 * result, return the minimum browser-safe response. No runtime logic is
 * duplicated here -- every decision about phase/gates/completion/decline
 * scope is runTurn()'s own, unchanged.
 *
 * Session token: an httpOnly cookie (`crc_session`), never read by client
 * JS -- the browser holds "only an opaque session identifier" more
 * strictly than asked, since client code never even sees the raw value.
 *
 * Persistence-only-after-success is not something this route has to
 * implement itself -- runTurn() already guarantees it structurally (its
 * own sessionStore.save() calls are the LAST thing it does on every path,
 * after every upstream step -- extraction, gates, phase, completion,
 * candidate generation, Constraint A/B -- has already succeeded in
 * memory). This route's own product-state write (turn_count/transcript)
 * is placed after a successful runTurn() call for the same reason.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import {
  createSupabaseSessionStore,
  loadCrcSessionProductState,
  saveCrcSessionProductState,
  type TranscriptEntry,
} from '@/lib/crc-engine/supabase-session-store'
import { createAnthropicExtractor } from '@/lib/interview-engine/anthropic-extractor'
import { createAnthropicCandidateQuestionGenerator } from '@/lib/interview-engine/anthropic-candidate-question'
import { createAnthropicConstraintADecider } from '@/lib/interview-engine/anthropic-decision'
import type { DeclineAction } from '@/lib/crc-engine/decline'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseRequest, type TurnRequestBody, type TurnResponseBody, type SessionStatusResponseBody } from '@/lib/crc-engine/api-contract'

const COOKIE_NAME = 'crc_session'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

/**
 * User-facing label for a decline action -- used both as the turn's
 * userText (what Extraction sees) and the transcript's own display text
 * for that turn. No separate internal/display split: the label is
 * plain and accurate either way, and two parallel maps would be one more
 * thing to keep in sync for no real benefit.
 */
const DECLINE_LABEL: Record<DeclineAction, string> = {
  skip_question: "Let's skip this question.",
  skip_phase: "Let's skip this section.",
  stop_interview: "I'd like to stop here.",
}

/**
 * GET /api/crc/turn -- read-only session rehydration for page load and
 * refresh. No engine decision logic here: for a completed session this
 * calls runCRCConversation() directly, the exact same pure, deterministic,
 * side-effect-free function runTurn() itself calls internally for its own
 * "already complete" short-circuit -- not a parallel reimplementation, the
 * same function, called the same way, for the same reason.
 */
export async function GET(request: NextRequest) {
  const cookieStore = cookies()

  if (request.nextUrl.searchParams.get('restart') === 'true') {
    // "Start Over" -- the cookie is httpOnly, so client JS cannot clear it
    // itself; this is the one path that discards a session by explicit
    // user action rather than resolving one. Does not touch the DB row
    // (an orphaned row with no cookie pointing to it is harmless, same as
    // any abandoned conversation) -- just stops the browser from
    // presenting it.
    const response = NextResponse.json<SessionStatusResponseBody>({ status: 'new' })
    response.cookies.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 })
    return response
  }

  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json<SessionStatusResponseBody>({ status: 'new' })
  }

  const sessionStore = createSupabaseSessionStore(supabaseAdmin)
  const [engineState, productState] = await Promise.all([sessionStore.load(token), loadCrcSessionProductState(supabaseAdmin, token)])
  if (!engineState) {
    return NextResponse.json<SessionStatusResponseBody>({ status: 'session_not_found' }, { status: 404 })
  }
  const transcript = productState?.transcript ?? []

  if (engineState.structured_understanding.completion_reason !== null) {
    const result = runCRCConversation(engineState.structured_understanding, MATRIX_FIXTURE)
    return NextResponse.json<SessionStatusResponseBody>({ status: 'complete', transcript, projection: result.output })
  }

  return NextResponse.json<SessionStatusResponseBody>({ status: 'active', transcript })
}

export async function POST(request: NextRequest) {
  let body: TurnRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<TurnResponseBody>({ status: 'invalid_request', error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = parseRequest(body)
  if ('error' in parsed) {
    return NextResponse.json<TurnResponseBody>({ status: 'invalid_request', error: parsed.error }, { status: 400 })
  }

  const cookieStore = cookies()
  const existingToken = cookieStore.get(COOKIE_NAME)?.value

  const sessionStore = createSupabaseSessionStore(supabaseAdmin)

  let token: string
  let turnNumber: number
  let transcript: TranscriptEntry[]

  if (!existingToken || parsed.restart) {
    // No token supplied at all, or the user explicitly asked to restart --
    // both are legitimately "begin a new conversation," never confused
    // with an unresolvable existing one (see the else branch).
    token = randomUUID()
    turnNumber = 1
    transcript = []
  } else {
    // A token WAS supplied -- it must resolve, or this is a
    // missing/corrupt session, never silently treated as a valid
    // continuation. engineState is the authoritative resolvability
    // signal (it's what actually drives runTurn()'s own behavior);
    // productState defaults defensively only once engineState has
    // already proven the session is real.
    const [engineState, productState] = await Promise.all([
      sessionStore.load(existingToken),
      loadCrcSessionProductState(supabaseAdmin, existingToken),
    ])
    if (!engineState) {
      return NextResponse.json<TurnResponseBody>({ status: 'session_not_found' }, { status: 404 })
    }
    token = existingToken
    turnNumber = (productState?.turn_count ?? 0) + 1
    transcript = productState?.transcript ?? []
  }

  const userText = parsed.kind === 'message' ? parsed.text : DECLINE_LABEL[parsed.action]
  const declineAction = parsed.kind === 'decline' ? parsed.action : undefined

  const deps: RunTurnDeps = {
    extractor: createAnthropicExtractor(),
    generator: createAnthropicCandidateQuestionGenerator(),
    decider: createAnthropicConstraintADecider(),
    sessionStore,
    matrix: MATRIX_FIXTURE,
  }

  let outcome: Awaited<ReturnType<typeof runTurn>>
  try {
    outcome = await runTurn({ token, turnNumber, userText, declineAction }, deps)
  } catch (err) {
    // runTurn() has not persisted anything at this point on any failure
    // path (its own sessionStore.save() calls are always the last step,
    // after every upstream step has already succeeded in memory) -- safe
    // to tell the client to retry the exact same action.
    console.error('[api/crc/turn] runTurn failed', err)
    return NextResponse.json<TurnResponseBody>({ status: 'retry' }, { status: 503 })
  }

  const updatedTranscript: TranscriptEntry[] = [...transcript, { role: 'user', text: userText }]
  if (outcome.kind !== 'complete') {
    updatedTranscript.push({ role: 'assistant', text: outcome.message })
  }
  await saveCrcSessionProductState(supabaseAdmin, token, { turn_count: turnNumber, transcript: updatedTranscript })

  const response =
    outcome.kind === 'complete'
      ? NextResponse.json<TurnResponseBody>({ status: 'complete', projection: outcome.result.output })
      : NextResponse.json<TurnResponseBody>({ status: outcome.kind, message: outcome.message })

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })

  return response
}
