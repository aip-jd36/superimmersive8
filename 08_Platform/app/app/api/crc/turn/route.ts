/**
 * POST /api/crc/turn -- the one live-turn Route Handler for the CRC
 * conversation (CRC Product Integration -- First Usable Live Slice,
 * Phase 4; Results Gate milestone, 2026-08-14, restructured the
 * email-related branches -- see that migration's own header).
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
 *
 * Results Gate (2026-08-14): every `status: 'complete'` response, from
 * every branch in this file, is now built by the single shared
 * buildCompleteResponseFields() helper (complete-response.ts) -- the same
 * function GET uses. This is what guarantees `projection` can never be
 * returned to a non-grandfathered session through ANY code path here,
 * including retry/ceiling/product-stop branches, not just the "happy
 * path" completion. The mid-conversation email gate (email_required,
 * the turn-4 fallback threshold, pending-message resume, decline_email)
 * is fully retired -- see complete-response.ts and api-contract.ts for
 * what replaced it.
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
  saveCrcSessionCreationMeta,
  saveCrcSessionProductStop,
  type TranscriptEntry,
  type MessageKind,
  type CrcSessionProductState,
} from '@/lib/crc-engine/supabase-session-store'
import { createAnthropicExtractor } from '@/lib/interview-engine/anthropic-extractor'
import { createAnthropicCandidateQuestionGenerator } from '@/lib/interview-engine/anthropic-candidate-question'
import { createAnthropicConstraintADecider } from '@/lib/interview-engine/anthropic-decision'
import type { DeclineAction } from '@/lib/crc-engine/decline'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseRequest, type TurnRequestBody, type TurnResponseBody, type SessionStatusResponseBody } from '@/lib/crc-engine/api-contract'
import { logPilotEvent } from '@/lib/crc-engine/pilot-events'
import { logAnalyticsEvent } from '@/lib/crc-engine/analytics-events'
import { resolveClientIp, normalizeIp, deriveAbuseKey } from '@/lib/crc-engine/abuse-key'
import { classifyTraffic, shouldApplyRateLimiting } from '@/lib/crc-engine/traffic-classification'
import { checkSessionCreationRate, checkBurst, checkTurnCeiling, logRateLimitedEvent } from '@/lib/crc-engine/abuse-prevention'
import { getRuntimeCommit, getModelConfig } from '@/lib/crc-engine/runtime-metadata'
import { buildCompleteResponseFields } from '@/lib/crc-engine/complete-response'
import { deliverCrcResultsEmail } from '@/lib/crc-engine/results-email-delivery'
import { getResultsEmailErrorMessage, type ResultsEmailClaimReason } from '@/lib/crc-engine/results-gate-copy'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { ConsultativeNote } from '@/lib/crc-engine/unresolved-applicability-realization'

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

const DECLINE_EVENT_TYPE: Record<DeclineAction, 'skip_question' | 'skip_phase' | 'stop_interview'> = {
  skip_question: 'skip_question',
  skip_phase: 'skip_phase',
  stop_interview: 'stop_interview',
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

/** Builds the full `status: 'complete'` TurnResponseBody, applying a pending results-email error/blocked overlay if provided. */
function buildCompleteTurnResponse(
  productState: Pick<
    CrcSessionProductState,
    'created_at' | 'attribution_token' | 'email' | 'results_email_status' | 'results_email_last_recipient'
  >,
  output: ProjectionOutput,
  consultativeNotes: ConsultativeNote[],
  overlay?: { blockedReason?: string; errorMessage?: string },
): Extract<TurnResponseBody, { status: 'complete' }> {
  const fields = buildCompleteResponseFields({
    sessionCreatedAt: productState.created_at,
    output,
    consultativeNotes,
    attributionToken: productState.attribution_token,
    email: productState.email,
    resultsEmailStatus: productState.results_email_status,
    resultsEmailLastRecipient: productState.results_email_last_recipient,
  })
  if (overlay && fields.results_email) {
    fields.results_email = { ...fields.results_email, blocked_reason: overlay.blockedReason, error_message: overlay.errorMessage }
  }
  return { status: 'complete', ...fields }
}

/**
 * GET /api/crc/turn -- read-only session rehydration for page load and
 * refresh. No engine decision logic here: for a completed session this
 * calls the same shared buildCompleteResponseFields() helper POST uses,
 * via runCRCConversation() internally -- the exact same pure,
 * deterministic, side-effect-free function runTurn() itself calls
 * internally for its own "already complete" short-circuit -- not a
 * parallel reimplementation, the same function, called the same way, for
 * the same reason.
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
    await logPilotEvent(supabaseAdmin, { session_id: token, event_type: 'missing_session' })
    return NextResponse.json<SessionStatusResponseBody>({ status: 'session_not_found' }, { status: 404 })
  }
  const transcript = productState?.transcript ?? []

  // CRC Identity + Abuse Prevention + Analytics milestone: a session can now
  // also be "done" at the PRODUCT layer (the hard turn ceiling) without the
  // Interview Engine's own completion_reason ever being set -- see
  // route.ts's own module-level note near product_stop_reason handling
  // below for why that's deliberate. Both conditions render the exact
  // same finalized view, so a page refresh after either one correctly
  // re-shows the gated/grandfathered result instead of falling back to an
  // active chat input.
  const isDone = engineState.structured_understanding.completion_reason !== null || productState?.product_stop_reason != null
  if (isDone) {
    const result = runCRCConversation(engineState.structured_understanding, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const fields = buildCompleteResponseFields({
      sessionCreatedAt: productState?.created_at ?? new Date(0).toISOString(),
      output: result.output,
      consultativeNotes: result.consultative_notes,
      attributionToken: productState?.attribution_token,
      email: productState?.email ?? null,
      resultsEmailStatus: productState?.results_email_status ?? null,
      resultsEmailLastRecipient: productState?.results_email_last_recipient ?? null,
    })
    return NextResponse.json<SessionStatusResponseBody>({ status: 'complete', transcript, ...fields })
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

  // ── Abuse key + traffic classification (design report §4/§5/§15) ───────
  // Cheap, pure computation -- no I/O, runs before any Supabase or model
  // call. abuseKey stays null (and every rate-limit check below is
  // skipped, fail-open, per the approved failure model) if the HMAC secret
  // is missing/misconfigured -- a deploy-time bug, not a live condition
  // worth taking the whole pilot down over.
  const rawIp = resolveClientIp(request)
  const normalizedIp = normalizeIp(rawIp)
  let abuseKey: string | null = null
  try {
    abuseKey = deriveAbuseKey(normalizedIp)
  } catch (err) {
    console.error('[api/crc/turn] abuse-key derivation unavailable, skipping abuse checks for this request', err)
  }
  const trafficType = classifyTraffic({
    nodeEnv: process.env.NODE_ENV,
    evalKeyHeader: request.headers.get('x-crc-eval-key'),
    normalizedIp,
  })
  // Only real pilot traffic is ever rate-limited -- development/
  // internal_test/automated_eval all need to run repeatedly without
  // tripping the same limits real anonymous users are bounded by.
  const rateLimitingApplies = shouldApplyRateLimiting(trafficType, abuseKey)

  const isNewSession = !existingToken || parsed.restart

  // email/resendResultEmail only make sense against an existing, completed
  // session -- a brand-new session has no result to send yet.
  if (isNewSession && (parsed.kind === 'email' || parsed.kind === 'resend_result_email')) {
    return NextResponse.json<TurnResponseBody>({ status: 'invalid_request', error: 'Cannot request results email before completing the Commercial Readiness Check.' }, { status: 400 })
  }

  if (isNewSession && rateLimitingApplies) {
    const rateCheck = await checkSessionCreationRate(supabaseAdmin, abuseKey!)
    if (rateCheck.limited) {
      await logRateLimitedEvent(supabaseAdmin, null, rateCheck.reason, rawIp)
      return NextResponse.json<TurnResponseBody>({ status: 'rate_limited', reason: rateCheck.reason, retryAfterSeconds: rateCheck.retryAfterSeconds }, { status: 429 })
    }
  }

  let token: string
  let turnNumber: number
  let transcript: TranscriptEntry[]
  // Set only on the existing-session branch, from that session's own
  // already-persisted values -- used to fill attribution_token/email on a
  // 'complete' response for a session that finishes THIS turn but was not
  // newly created this turn (a brand-new session gets a freshly-generated
  // attributionToken further down instead, see isNewSession handling).
  let existingAttributionToken: string | undefined
  let existingEmail: string | null | undefined
  let existingCreatedAt: string | undefined

  if (isNewSession) {
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
      sessionStore.load(existingToken!),
      loadCrcSessionProductState(supabaseAdmin, existingToken!),
    ])
    if (!engineState) {
      await logPilotEvent(supabaseAdmin, { session_id: existingToken!, event_type: 'missing_session' })
      return NextResponse.json<TurnResponseBody>({ status: 'session_not_found' }, { status: 404 })
    }
    token = existingToken!
    turnNumber = (productState?.turn_count ?? 0) + 1
    transcript = productState?.transcript ?? []
    existingAttributionToken = productState?.attribution_token ?? undefined
    existingEmail = productState?.email ?? undefined
    existingCreatedAt = productState?.created_at

    // Already finalized at the PRODUCT layer (the hard turn ceiling was
    // already hit on a prior request) -- deliberately kept separate from
    // structured_understanding.completion_reason (see the migration's own
    // header and the design report §14/§B item 6): this is a business
    // decision to stop spending on this session, not the Interview Engine
    // deciding it's naturally finished, and keeping it out of
    // completion_reason means this milestone never touches
    // types/interview-engine.ts or any Interview Engine completion logic.
    // Re-checked fresh on every request (not a one-time redirect), so it
    // correctly re-blocks even if the client somehow retries after the
    // stop. Deliberately does NOT short-circuit an email/resendResultEmail
    // request -- a ceiling-stopped session still has a real completed
    // result the user should be able to have emailed.
    if (productState?.product_stop_reason && parsed.kind !== 'email' && parsed.kind !== 'resend_result_email') {
      const result = runCRCConversation(engineState.structured_understanding, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      const response = NextResponse.json<TurnResponseBody>(buildCompleteTurnResponse(productState, result.output, result.consultative_notes))
      setSessionCookie(response, token)
      return response
    }

    if (rateLimitingApplies) {
      const burstCheck = checkBurst(productState?.updated_at ?? null)
      if (burstCheck.limited) {
        await logRateLimitedEvent(supabaseAdmin, token, burstCheck.reason, rawIp)
        return NextResponse.json<TurnResponseBody>({ status: 'rate_limited', reason: burstCheck.reason, retryAfterSeconds: burstCheck.retryAfterSeconds }, { status: 429 })
      }
    }

    // ── Results Gate: email submission / explicit resend ──────────────────
    // Only reachable once the session is genuinely complete (natural
    // Interview Engine completion OR the turn-ceiling product stop) --
    // there is no "pending message" concept anymore, so this is the whole
    // handler for both request kinds. No runTurn() call on this path, no
    // model cost, no turn_count increment.
    if (parsed.kind === 'email' || parsed.kind === 'resend_result_email') {
      const isComplete = engineState.structured_understanding.completion_reason !== null || productState?.product_stop_reason != null
      if (!isComplete) {
        return NextResponse.json<TurnResponseBody>(
          { status: 'invalid_request', error: 'Results email is only available once the Commercial Readiness Check is complete.' },
          { status: 400 },
        )
      }

      const targetEmail = parsed.kind === 'email' ? parsed.email : productState?.results_email_last_recipient ?? null
      if (!targetEmail) {
        return NextResponse.json<TurnResponseBody>({ status: 'invalid_request', error: 'No recipient to resend to yet.' }, { status: 400 })
      }

      const delivery = await deliverCrcResultsEmail(supabaseAdmin, {
        sessionId: token,
        email: targetEmail,
        isExplicitResend: parsed.kind === 'resend_result_email',
        structuredUnderstanding: engineState.structured_understanding,
        matrix: MATRIX_FIXTURE,
        topicClaims: TOPIC_CLAIMS_FIXTURE,
        relationships: TOPIC_RELATIONSHIPS_FIXTURE,
        attributionToken: productState?.attribution_token,
      })

      if (delivery.kind === 'lead_persistence_failed') {
        return NextResponse.json<TurnResponseBody>({ status: 'retry', message: "We couldn't save your email right now. Please try again." }, { status: 503 })
      }

      // Re-read -- delivery may have mutated email/crc_lead_id/results_email_*.
      const refreshed = await loadCrcSessionProductState(supabaseAdmin, token)
      const overlay =
        delivery.kind === 'blocked'
          ? { blockedReason: delivery.reason, errorMessage: getResultsEmailErrorMessage(delivery.reason as ResultsEmailClaimReason) }
          : delivery.kind === 'send_failed' || delivery.kind === 'send_unknown'
            ? { errorMessage: "That didn't go through. You can try again." }
            : undefined

      const result = runCRCConversation(engineState.structured_understanding, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      const responseBody = buildCompleteTurnResponse(refreshed ?? productState!, result.output, result.consultative_notes, overlay)
      const response = NextResponse.json<TurnResponseBody>(responseBody)
      setSessionCookie(response, token)
      return response
    }

    if (rateLimitingApplies) {
      const ceilingCheck = checkTurnCeiling(turnNumber)
      if (ceilingCheck.limited) {
        await logRateLimitedEvent(supabaseAdmin, token, ceilingCheck.reason, rawIp)
        try {
          await saveCrcSessionProductStop(supabaseAdmin, token, 'conversation_limit_reached')
        } catch (err) {
          console.error('[api/crc/turn] saveCrcSessionProductStop (conversation_limit_reached) failed', err)
        }
        const result = runCRCConversation(engineState.structured_understanding, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
        const ceilingResponse = NextResponse.json<TurnResponseBody>(
          buildCompleteTurnResponse(productState ?? ({} as CrcSessionProductState), result.output, result.consultative_notes),
        )
        setSessionCookie(ceilingResponse, token)
        return ceilingResponse
      }
    }
  }

  // parsed.kind is guaranteed 'message' | 'decline' by this point -- both
  // 'email' and 'resend_result_email' kinds returned early above, in both
  // the new-session guard and the existing-session branch.
  const userText = parsed.kind === 'message' ? parsed.text : parsed.kind === 'decline' ? DECLINE_LABEL[parsed.action] : ''
  const declineAction = parsed.kind === 'decline' ? parsed.action : undefined

  let outcome: Awaited<ReturnType<typeof runTurn>>
  try {
    // createAnthropicExtractor()/createAnthropicCandidateQuestionGenerator()/
    // createAnthropicConstraintADecider() each throw synchronously and
    // immediately if ANTHROPIC_API_KEY is unavailable (deliberate, documented
    // fail-loud behavior in each adapter -- never a silent mock fallback).
    // That throw must land inside this try, not before it: constructed
    // outside, a missing/misconfigured key produces an unhandled exception
    // (bare 500, no JSON body) instead of the same clean retryable response
    // every other failure in this route gets. Nothing has been persisted at
    // this point either way, so the catch below's own safety reasoning
    // still holds unchanged.
    const deps: RunTurnDeps = {
      extractor: createAnthropicExtractor(),
      generator: createAnthropicCandidateQuestionGenerator(),
      decider: createAnthropicConstraintADecider(),
      sessionStore,
      matrix: MATRIX_FIXTURE,
      topicClaims: TOPIC_CLAIMS_FIXTURE,
      relationships: TOPIC_RELATIONSHIPS_FIXTURE,
    }
    outcome = await runTurn({ token, turnNumber, userText, declineAction }, deps)
  } catch (err) {
    // runTurn() has not persisted anything at this point on any failure
    // path (its own sessionStore.save() calls are always the last step,
    // after every upstream step has already succeeded in memory) -- safe
    // to tell the client to retry the exact same action. No cookie is set
    // on this response: for an existing session the browser already has
    // the right one from a prior turn; for a brand-new session nothing
    // was ever created (runTurn() never reached its own save()), so a
    // retry correctly re-enters the "mint a new token" path rather than
    // pointing at a row that doesn't exist.
    console.error('[api/crc/turn] runTurn failed', err)
    await logPilotEvent(supabaseAdmin, { session_id: token, event_type: 'retryable_failure', detail: err instanceof Error ? err.message : String(err) })
    return NextResponse.json<TurnResponseBody>({ status: 'retry' }, { status: 503 })
  }

  if (declineAction) {
    // Logged only once runTurn() has actually succeeded -- a failed
    // attempt (caught above) never reaches here, so a retried decline
    // isn't double-counted, and this only ever reflects a decline that
    // genuinely took effect.
    await logPilotEvent(supabaseAdmin, { session_id: token, event_type: DECLINE_EVENT_TYPE[declineAction] })
  }

  let attributionToken: string | undefined
  if (isNewSession) {
    // Session-creation-time facts (design report §7/§14) -- NOT part of
    // CRCSessionState, so runTurn()'s own save() never writes these for a
    // brand-new token. Written here, once, now that runTurn() has
    // succeeded and the row is guaranteed to exist -- same ordering
    // dependency saveCrcSessionProductState already has below.
    attributionToken = randomUUID()
    try {
      await saveCrcSessionCreationMeta(supabaseAdmin, token, {
        traffic_type: trafficType,
        abuse_key: abuseKey,
        runtime_commit: getRuntimeCommit(),
        model_config: getModelConfig(),
        attribution_token: attributionToken,
      })
    } catch (err) {
      // Best-effort, not fatal -- a failure here means this session is
      // missing identity/analytics metadata, never a broken user-facing
      // turn (the engine-state save this depends on has already fully
      // succeeded). Matches the fail-open discipline for analytics
      // failures throughout this milestone.
      console.error('[api/crc/turn] saveCrcSessionCreationMeta failed', err)
    }
  }

  // Transcript v2 (design report §6): timestamp + message_kind on every
  // entry going forward. message_kind maps 1:1 to the real outcome shape
  // already computed above -- nothing inferred beyond what runTurn()
  // itself already decided this turn.
  const now = new Date().toISOString()
  const updatedTranscript: TranscriptEntry[] = [...transcript, { role: 'user', text: userText, timestamp: now, message_kind: 'user' }]
  // Commercial Readiness Discovery Catalog integration, 2026-08-12: shown
  // as its own transcript entry, ahead of this turn's own message -- so a
  // page refresh redisplays it correctly with zero extra client logic,
  // and so it reads as a distinct conversational beat, not appended prose
  // onto whatever else this turn says.
  if (outcome.precedingTakeaway) {
    updatedTranscript.push({ role: 'assistant', text: outcome.precedingTakeaway, timestamp: now, message_kind: 'educational_takeaway' })
  }
  if (outcome.kind !== 'complete') {
    const messageKind: MessageKind =
      outcome.kind === 'acknowledgment'
        ? 'acknowledgment'
        : outcome.jurisdictionSignal?.outcome === 'asked'
          ? 'jurisdiction_clarification_question'
          : outcome.discoverySignal?.outcome === 'asked'
            ? 'commercial_readiness_discovery_question'
            : 'ordinary_question'
    updatedTranscript.push({ role: 'assistant', text: outcome.message, timestamp: now, message_kind: messageKind })
  }

  try {
    await saveCrcSessionProductState(supabaseAdmin, token, { turn_count: turnNumber, transcript: updatedTranscript })
  } catch (err) {
    // Part 1 hardening: this call sits after runTurn() has already
    // committed engine state (structured_understanding/boundary_state)
    // successfully -- a failure here is scoped to turn_count/transcript
    // only, never a partial engine-state commit (each DB call is its own
    // atomic statement; runTurn()'s own save() already fully succeeded
    // before this line is ever reached). The cookie IS set on this
    // failure response, unlike the runTurn() catch above: by this point
    // the row is guaranteed to exist (runTurn() created it if this was a
    // brand-new session), so a retry must target that same token, not
    // mint a new one and orphan it.
    console.error('[api/crc/turn] saveCrcSessionProductState failed', err)
    await logPilotEvent(supabaseAdmin, { session_id: token, event_type: 'persistence_error', detail: err instanceof Error ? err.message : String(err) })
    const retryResponse = NextResponse.json<TurnResponseBody>({ status: 'retry' }, { status: 503 })
    setSessionCookie(retryResponse, token)
    return retryResponse
  }

  // Discovery analytics instrumentation (design report §11) -- logged
  // best-effort, after the turn's own persistence has already succeeded.
  // Only present on the organic (non-decline) path; undefined otherwise,
  // in which case there is nothing to log.
  if (outcome.discoverySignal) {
    await logAnalyticsEvent(supabaseAdmin, { session_id: token, event_type: 'discovery_signal', event_data: outcome.discoverySignal })
  }

  const response =
    outcome.kind === 'complete'
      ? NextResponse.json<TurnResponseBody>({
          ...buildCompleteTurnResponse(
            {
              created_at: isNewSession ? now : (existingCreatedAt ?? now),
              attribution_token: attributionToken ?? existingAttributionToken ?? null,
              email: existingEmail ?? null,
              // A session completing on THIS turn cannot yet have any
              // results-email state -- the gate is only ever reachable
              // after completion, on a subsequent request.
              results_email_status: null,
              results_email_last_recipient: null,
            },
            outcome.result.output,
            outcome.result.consultative_notes,
          ),
          precedingTakeaway: outcome.precedingTakeaway,
        })
      : NextResponse.json<TurnResponseBody>({ status: outcome.kind, message: outcome.message, precedingTakeaway: outcome.precedingTakeaway })

  setSessionCookie(response, token)

  return response
}
