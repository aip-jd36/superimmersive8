'use client'

/**
 * /crc -- the smallest usable live CRC conversation experience (CRC
 * Product Integration -- First Usable Live Slice, Phase 6; Results Gate
 * milestone, 2026-08-14, PM-revised -- see that migration's own header).
 *
 * All conversation state (session token, StructuredUnderstanding,
 * BoundaryState, pending_clarification) lives server-side, addressed by
 * an httpOnly cookie this component never reads directly -- it only ever
 * calls GET/POST /api/crc/turn and renders whatever browser-safe response
 * comes back. No internal phase names, gate states, or signal ids are
 * ever surfaced here -- there is nothing in either response type that
 * could leak them (see route.ts's own TurnResponseBody/
 * SessionStatusResponseBody types).
 *
 * Results Gate: the mid-conversation email interrupt is retired. A
 * completed, non-grandfathered session shows a teaser + results-email
 * gate ('results_gate' phase) instead of the full result -- the server
 * never sends `projection` for these sessions, at any point, so there is
 * structurally nothing here to leak even before this component's own
 * render logic runs. Once the results email is accepted by the provider,
 * this shows a confirmation state ('results_confirmation'), never the
 * full result. 'complete' is unchanged from before this milestone --
 * still the grandfathered, full-in-browser-result phase for sessions
 * created before the launch marker.
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CrcProjectionOutput } from '@/components/CrcProjectionOutput'
import { CommercialAssuranceBridge } from '@/components/CommercialAssuranceBridge'
import type { CrcResultsEmailState, CrcTeaser, TurnResponseBody, SessionStatusResponseBody } from '@/lib/crc-engine/api-contract'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { ConsultativeNote } from '@/lib/crc-engine/unresolved-applicability-realization'
import { shouldShowAcknowledgmentGuidance, type CrcPagePhase as Phase } from '@/lib/crc-engine/acknowledgment-guidance'
import { startElapsedSecondsTicker } from '@/lib/crc-engine/wait-indicator'
import { buildCalendlyUrl } from '@/lib/crc-engine/calendly-attribution'
import { CrcEntryFlow, type GuidedSubmission } from '@/components/crc/CrcEntryFlow'
import { CrcLocaleProvider, useCrcLocale } from '@/components/crc/CrcLocaleProvider'
import { CrcLanguageControl } from '@/components/crc/CrcLanguageControl'
import { CrcIdentityMark } from '@/components/crc/CrcIdentityMark'
import { CrcZhLocaleNotice } from '@/components/crc/CrcZhLocaleNotice'
import {
  formatWaitIndicatorLocalized,
  getRateLimitMessageLocalized,
  buildTeaserCopyLocalized,
  buildConfirmationCopyLocalized,
  getResultsGateCopyLocalized,
  getAcknowledgmentGuidanceCopyLocalized,
} from '@/components/crc/crc-ui-copy'
// NOTE (CRC-UI-1 scope boundary): getResultsEmailErrorMessage is called
// SERVER-SIDE (app/api/crc/turn/route.ts:474) and the resulting English
// string is sent to the client as `results_email.error_message`/`data.
// message`/`data.error` -- the client never receives the underlying reason
// code. Localizing these specific server-generated fallback strings would
// require an API contract change (sending a reason code instead of/in
// addition to pre-rendered text), which is explicitly out of scope for this
// presentation-only milestone. They remain English regardless of locale;
// only the CLIENT-OWNED literal fallback used when the server field is
// absent is localized below. See the implementation report's own "Known
// Visual/Product Gaps" section.

interface Message {
  role: 'user' | 'assistant'
  text: string
}

/**
 * Mirrors route.ts's own DECLINE_LABEL exactly, for immediate optimistic
 * display before the server responds. CRC-UI-1: this is ENGINE-BOUND text
 * -- `submit()` below sends this exact string as the turn's own userText
 * for a skip/stop action (see `optimisticText` in submit()). It MUST NEVER
 * be sourced from crc-ui-copy.ts / read `locale` / change with the
 * language selector -- doing so would send Traditional-Chinese text into
 * extraction. The VISIBLE skip/stop BUTTON LABELS the user clicks
 * (copy.skipQuestion/copy.skipSection/copy.stop, rendered lower in this
 * file) are a completely separate, safely localizable set of strings that
 * happen to trigger this same fixed, English-only constant. See
 * __tests__/crc/crc-decline-label-locale-independence.test.ts.
 */
const DECLINE_LABEL = {
  skip_question: "Let's skip this question.",
  skip_phase: "Let's skip this section.",
  stop_interview: "I'd like to stop here.",
} as const

/** What to resend on Retry -- exactly the body of the last POST attempt. GE-2: `guidedInit` sends the SAME request shape route.ts's guided_entry_init branch expects -- this page never mutates StructuredUnderstanding or constructs a UserGoal itself, it only forwards what CrcEntryFlow already validated client-side (the server independently re-validates everything, per guided-entry-init.ts). */
type PendingRequestBody = { message: string } | { declineAction: keyof typeof DECLINE_LABEL } | { guidedInit: GuidedSubmission }

type FeedbackRating = 'yes' | 'somewhat' | 'no'
type FeedbackStatus = 'idle' | 'submitting' | 'submitted' | 'error'

/**
 * CRC-UI-1: the page's actual content, wrapped by CrcLocaleProvider below
 * so `useCrcLocale()` is available -- the provider itself must be an
 * ancestor, not a sibling, of the component that calls the hook.
 */
function CrcPageContent() {
  const { locale, copy } = useCrcLocale()
  // GE-2: gates whether the entry-choice/Guided-Entry flow (CrcEntryFlow)
  // or the existing chat experience (driven by `phase`, below, entirely
  // unchanged) renders. Deliberately a SEPARATE piece of state from
  // `phase`, not a new value added to the shared CrcPagePhase type
  // (acknowledgment-guidance.ts) -- that type is a Free-Form-conversation
  // concept this milestone does not touch. 'choice' covers CrcEntryFlow's
  // own three screens (role choice, guided steps, free-form landing) --
  // all local, pre-network state CrcEntryFlow owns internally.
  const [entryFlowScreen, setEntryFlowScreen] = useState<'loading' | 'choice' | 'chat'>('loading')
  const [entryFlowSubmitting, setEntryFlowSubmitting] = useState(false)
  const [entryFlowError, setEntryFlowError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [projection, setProjection] = useState<ProjectionOutput | null>(null)
  // M2B (2026-09-05): Consultative-Composition-owned, already-realized
  // bounded detail -- gated identically to `projection` server-side (see
  // complete-response.ts). Never computed client-side.
  const [consultativeNotes, setConsultativeNotes] = useState<ConsultativeNote[] | undefined>(undefined)
  const [inputText, setInputText] = useState('')
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle')
  const [lastOutcomeWasAcknowledgment, setLastOutcomeWasAcknowledgment] = useState(false)
  // CRC Identity + Abuse Prevention + Analytics milestone.
  const [attributionToken, setAttributionToken] = useState<string | undefined>(undefined)
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  // CRC Rate-Limit UX refinement, 2026-08-14.
  const [rateLimitMessage, setRateLimitMessage] = useState('')
  // CRC Wait-State UX. Purely presentational -- see wait-indicator.ts's own
  // header for why this is never pipeline/model telemetry. Starts/stops
  // strictly off the existing `phase === 'sending'` authoritative pending
  // state below; not a new source of truth.
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  // CRC Results Gate milestone, 2026-08-14.
  const [teaser, setTeaser] = useState<CrcTeaser | undefined>(undefined)
  const [resultsEmail, setResultsEmail] = useState<CrcResultsEmailState | undefined>(undefined)
  const [resultsEmailInput, setResultsEmailInput] = useState('')
  const [resultsEmailSubmitting, setResultsEmailSubmitting] = useState(false)
  const [resultsEmailError, setResultsEmailError] = useState('')
  const gateShownLoggedRef = useRef(false)
  const pendingRequestRef = useRef<PendingRequestBody | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  /** Applies a `status: 'complete'` response's shared fields to state -- used by every branch that receives one (initial load, message/decline turns, results-email actions). */
  function applyCompleteResponse(data: Extract<TurnResponseBody, { status: 'complete' }> | Extract<SessionStatusResponseBody, { status: 'complete' }>) {
    setAttributionToken(data.attribution_token)
    if (data.grandfathered) {
      setProjection(data.projection ?? null)
      setConsultativeNotes(data.consultative_notes)
      setEmail(data.email)
      setPhase('complete')
    } else {
      setTeaser(data.teaser)
      setResultsEmail(data.results_email)
      setPhase(data.results_email?.status === 'accepted' ? 'results_confirmation' : 'results_gate')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/crc/turn', { method: 'GET' })
      const data: SessionStatusResponseBody = await res.json()
      if (cancelled) return
      if (data.status === 'new') {
        // GE-2: a genuinely new visitor sees the entry-choice screen
        // first, not the old bare free-text textarea. `phase` still
        // starts 'idle' underneath it (unchanged), since Free Form
        // selected from CrcEntryFlow's own landing screen re-enters
        // exactly the existing 'idle' chat experience once submitted.
        setPhase('idle')
        setEntryFlowScreen('choice')
      } else if (data.status === 'session_not_found') {
        setPhase('session_not_found')
        setEntryFlowScreen('chat')
      } else if (data.status === 'active') {
        setMessages(data.transcript)
        // SessionStatusResponseBody doesn't carry whether the last turn
        // was a question or an acknowledgment -- deliberately not shown on
        // a fresh page load/refresh (only on a live transition within this
        // same session), keeping this fix presentation-only and small.
        setLastOutcomeWasAcknowledgment(false)
        setPhase('idle')
        setEntryFlowScreen('chat')
      } else if (data.status === 'complete') {
        setMessages(data.transcript)
        applyCompleteResponse(data)
        setEntryFlowScreen('chat')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  // CRC Wait-State UX. Elapsed-wait ticker, bound strictly to the existing
  // `phase === 'sending'` authoritative pending-turn state -- not a new
  // state machine. Starts a fresh ticker (starting at 0) the moment `phase`
  // becomes 'sending'; the cleanup below stops it immediately the instant
  // `phase` changes to anything else, for any reason (success, failure,
  // rate limit, session-not-found, retry, Start Over) -- see submit()'s own
  // exhaustive phase transitions above, every one of which leaves
  // 'sending'. A later turn re-enters this effect fresh (a brand-new
  // ticker instance, per startElapsedSecondsTicker's own contract), so it
  // can never inherit a prior turn's elapsed count.
  useEffect(() => {
    if (phase !== 'sending') {
      setElapsedSeconds(0)
      return
    }
    const ticker = startElapsedSecondsTicker(setElapsedSeconds)
    return () => ticker.stop()
  }, [phase])

  // Results Gate impression tracking (PM-approved §15/§22) -- fires once
  // the teaser+gate screen is actually shown, not merely on completion.
  // Idempotent server-side (logResultsGateShownEventOnce), and guarded
  // client-side too so a re-render of the same mount doesn't refire.
  useEffect(() => {
    if (phase !== 'results_gate' || gateShownLoggedRef.current) return
    gateShownLoggedRef.current = true
    fetch('/api/crc/results-gate-shown', { method: 'POST' }).catch(() => {})
  }, [phase])

  async function submit(body: PendingRequestBody) {
    // GE-2: a guidedInit submission comes from CrcEntryFlow, which is
    // still mounted (entryFlowScreen === 'choice') at the moment it's
    // fired -- there is no chat transcript visible yet to optimistically
    // append to, and `phase`/the rate-limit/retry cards below don't render
    // while CrcEntryFlow owns the screen. Branch pre-request setup on that
    // fact; the fetch() call itself and the request BODY are byte-identical
    // to an ordinary Free Form submission either way -- same endpoint, same
    // parseRequest() contract on the server (api-contract.ts), never a
    // separate route.
    const fromEntryFlow = entryFlowScreen === 'choice'

    pendingRequestRef.current = body
    if (fromEntryFlow) {
      setEntryFlowSubmitting(true)
      setEntryFlowError(null)
    } else {
      setPhase('sending')
      const optimisticText = 'message' in body ? body.message : 'declineAction' in body ? DECLINE_LABEL[body.declineAction] : body.guidedInit.concern
      setMessages((prev) => [...prev, { role: 'user', text: optimisticText }])
    }

    let res: Response
    try {
      res = await fetch('/api/crc/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      if (fromEntryFlow) {
        setEntryFlowSubmitting(false)
        setEntryFlowError(copy.networkErrorGeneric)
      } else {
        setPhase('retry')
      }
      return
    }

    const data: TurnResponseBody = await res.json()

    if (data.status === 'question' || data.status === 'acknowledgment') {
      // Commercial Readiness Discovery Catalog integration, 2026-08-12:
      // when present, the fixed Educational Takeaway from the PREVIOUS
      // discovery question renders as its own message, immediately ahead
      // of this turn's own -- two distinct conversational beats from one
      // response, never a separate interview question.
      if (fromEntryFlow) {
        // First-ever transition into the chat experience: seed the
        // transcript with the concern the user just typed (the same text
        // that became this turn's real extraction input -- see
        // guided-entry-init.ts's own header), since this is the first
        // time any chat UI has been visible at all for this session.
        const concernText = 'guidedInit' in body ? body.guidedInit.concern : 'message' in body ? body.message : ''
        setMessages([
          { role: 'user', text: concernText },
          ...(data.precedingTakeaway ? [{ role: 'assistant' as const, text: data.precedingTakeaway }] : []),
          { role: 'assistant', text: data.message },
        ])
        setEntryFlowSubmitting(false)
        setEntryFlowScreen('chat')
      } else {
        setMessages((prev) => [
          ...prev,
          ...(data.precedingTakeaway ? [{ role: 'assistant' as const, text: data.precedingTakeaway }] : []),
          { role: 'assistant', text: data.message },
        ])
      }
      pendingRequestRef.current = null
      setInputText('')
      setLastOutcomeWasAcknowledgment(data.status === 'acknowledgment')
      setPhase('idle')
    } else if (data.status === 'complete') {
      if (fromEntryFlow) {
        const concernText = 'guidedInit' in body ? body.guidedInit.concern : 'message' in body ? body.message : ''
        setMessages([{ role: 'user', text: concernText }, ...(data.precedingTakeaway ? [{ role: 'assistant' as const, text: data.precedingTakeaway }] : [])])
        setEntryFlowSubmitting(false)
        setEntryFlowScreen('chat')
      } else if (data.precedingTakeaway) {
        const takeaway = data.precedingTakeaway
        setMessages((prev) => [...prev, { role: 'assistant', text: takeaway }])
      }
      pendingRequestRef.current = null
      setInputText('')
      setLastOutcomeWasAcknowledgment(false)
      applyCompleteResponse(data)
    } else if (data.status === 'rate_limited') {
      if (fromEntryFlow) {
        setEntryFlowSubmitting(false)
        setEntryFlowError(getRateLimitMessageLocalized(locale, data.reason, data.retryAfterSeconds))
        return
      }
      setMessages((prev) => prev.slice(0, -1))
      setRateLimitMessage(getRateLimitMessageLocalized(locale, data.reason, data.retryAfterSeconds))
      setPhase('rate_limited')
    } else if (data.status === 'session_not_found') {
      // Cannot occur on the guidedInit path (it always targets a token
      // this same request just created/resolved), but handled defensively
      // rather than assumed unreachable.
      if (fromEntryFlow) {
        setEntryFlowSubmitting(false)
        setEntryFlowError(copy.networkErrorGeneric)
        return
      }
      setLastOutcomeWasAcknowledgment(false)
      setPhase('session_not_found')
    } else if (data.status === 'retry') {
      if (fromEntryFlow) {
        setEntryFlowSubmitting(false)
        setEntryFlowError(data.message ?? copy.retryMessage)
        return
      }
      setPhase('retry')
    } else if (data.status === 'invalid_request') {
      if (fromEntryFlow) {
        // Surfaces the server's real validation/conflict message (e.g. a
        // guided_entry_init 409 conflict) rather than a generic fallback --
        // client-side validation already prevents most malformed
        // submissions, so a real one reaching here is informative, not
        // noise (Diagnostic Phase 11's own "guided initialization conflict
        // if exposed" requirement).
        setEntryFlowSubmitting(false)
        setEntryFlowError(data.error)
        return
      }
      // Client-side validation below already prevents an empty send, so
      // this should be unreachable in normal use -- fall back to retry
      // state rather than a silent no-op if it somehow occurs.
      setPhase('retry')
    }
  }

  /** Shared by both an ordinary gate submission and a corrected email -- the server distinguishes them by whether the address differs from the session's current target, not by request shape. */
  async function submitResultsEmail(requestBody: { email: string } | { resendResultEmail: true }) {
    setResultsEmailSubmitting(true)
    setResultsEmailError('')
    let res: Response
    try {
      res = await fetch('/api/crc/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
    } catch {
      setResultsEmailSubmitting(false)
      setResultsEmailError(copy.networkErrorGeneric)
      return
    }
    const data: TurnResponseBody = await res.json()
    setResultsEmailSubmitting(false)

    if (data.status === 'complete') {
      applyCompleteResponse(data)
      if (data.grandfathered === false && data.results_email?.status !== 'accepted') {
        setResultsEmailError(data.results_email?.error_message ?? '')
      } else {
        setResultsEmailInput('')
      }
    } else if (data.status === 'retry') {
      setResultsEmailError(data.message ?? "We couldn't save that right now. Please try again.")
    } else if (data.status === 'rate_limited') {
      setResultsEmailError(getRateLimitMessageLocalized(locale, data.reason, data.retryAfterSeconds))
    } else if (data.status === 'invalid_request') {
      setResultsEmailError(data.error)
    }
  }

  function handleResultsEmailSubmit() {
    const trimmed = resultsEmailInput.trim()
    if (!trimmed || resultsEmailSubmitting) return
    submitResultsEmail({ email: trimmed })
  }

  function handleResendResultEmail() {
    if (resultsEmailSubmitting) return
    submitResultsEmail({ resendResultEmail: true })
  }

  function handleChangeEmailClick() {
    setResultsEmailInput('')
    setResultsEmailError('')
    setPhase('results_gate')
  }

  function handleCommercialAssuranceCtaClick() {
    fetch('/api/crc/cta-click', { method: 'POST' }).catch(() => {})
  }

  function handleSend() {
    const text = inputText.trim()
    if (!text || phase === 'sending') return
    submit({ message: text })
  }

  function handleDecline(action: keyof typeof DECLINE_LABEL) {
    if (phase === 'sending') return
    submit({ declineAction: action })
  }

  function handleRetry() {
    const pending = pendingRequestRef.current
    if (!pending) return
    // Remove the optimistic user bubble the failed attempt already added --
    // submit() will re-add it fresh.
    setMessages((prev) => prev.slice(0, -1))
    submit(pending)
  }

  async function handleStartOver() {
    await fetch('/api/crc/turn?restart=true', { method: 'GET' })
    setMessages([])
    setProjection(null)
    setConsultativeNotes(undefined)
    setInputText('')
    pendingRequestRef.current = null
    setFeedbackRating(null)
    setFeedbackText('')
    setFeedbackStatus('idle')
    setLastOutcomeWasAcknowledgment(false)
    setAttributionToken(undefined)
    setEmail(undefined)
    setRateLimitMessage('')
    setTeaser(undefined)
    setResultsEmail(undefined)
    setResultsEmailInput('')
    setResultsEmailSubmitting(false)
    setResultsEmailError('')
    gateShownLoggedRef.current = false
    setPhase('idle')
    // GE-2: Start Over returns to the four-choice entry screen, not
    // straight back to the bare chat input -- CrcEntryFlow itself is a
    // fresh mount (React resets its internal state) the next time
    // entryFlowScreen flips to 'choice', so no separate reset call is
    // needed for its own local role/field/concern state.
    setEntryFlowSubmitting(false)
    setEntryFlowError(null)
    setEntryFlowScreen('choice')
  }

  // GE-2: both call the SAME submit() every other request kind already
  // uses -- Free Form's landing screen sends a plain {message}, exactly
  // handleSend() below does, never guidedInit (Diagnostic Phase 9's own
  // explicit rule). The guided role/tool/jurisdiction/concern answers were
  // already validated client-side by CrcEntryFlow and are re-validated,
  // independently and authoritatively, server-side by
  // validateGuidedEntryRequest() (guided-entry-init.ts) -- this function
  // does not and cannot bypass that.
  function handleGuidedEntrySubmit(submission: GuidedSubmission) {
    if (entryFlowSubmitting) return
    submit({ guidedInit: submission })
  }

  function handleFreeFormEntrySubmit(text: string) {
    if (entryFlowSubmitting) return
    submit({ message: text })
  }

  function handleStartOverClick() {
    const hasUnfinishedProgress = messages.length > 0 && phase !== 'complete' && phase !== 'results_confirmation'
    if (hasUnfinishedProgress && !window.confirm(copy.startOverConfirm)) return
    handleStartOver()
  }

  async function handleSubmitFeedback() {
    if (!feedbackRating || feedbackStatus === 'submitting') return
    setFeedbackStatus('submitting')
    try {
      const res = await fetch('/api/crc/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: feedbackRating,
          text: feedbackText.trim() || undefined,
        }),
      })
      setFeedbackStatus(res.ok ? 'submitted' : 'error')
    } catch {
      setFeedbackStatus('error')
    }
  }

  const confirmationCopy = resultsEmail?.masked_email ? buildConfirmationCopyLocalized(locale, resultsEmail.masked_email) : null
  const resultsGateCopy = getResultsGateCopyLocalized(locale)

  return (
    <div className="crc-shell min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6 lg:max-w-3xl">
        <div className="flex items-center justify-between">
          <CrcIdentityMark />
          <CrcLanguageControl />
        </div>
        <CrcZhLocaleNotice />

        {entryFlowScreen === 'loading' && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">{copy.loading}</CardContent>
          </Card>
        )}

        {entryFlowScreen === 'choice' && (
          // GE-2: the entry-choice/Guided-Entry/Free-Form-landing screens
          // deliberately render WITHOUT the existing "Commercial Readiness
          // Check" header card below -- Diagnostic Phase 4's own "no
          // explanatory paragraphs, no large privacy explanations, this is
          // intentionally lightweight" instruction. CrcEntryFlow supplies
          // its own minimal heading per screen; the familiar header
          // returns once entryFlowScreen becomes 'chat'.
          <CrcEntryFlow
            onGuidedSubmit={handleGuidedEntrySubmit}
            onFreeFormSubmit={handleFreeFormEntrySubmit}
            submitting={entryFlowSubmitting}
            errorMessage={entryFlowError}
          />
        )}

        {entryFlowScreen === 'chat' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{copy.headerTitle}</CardTitle>
                  <CardDescription>{copy.headerDescription}</CardDescription>
                </div>
                {phase !== 'loading' && (
                  <Button variant="ghost" size="sm" className="shrink-0" onClick={handleStartOverClick}>
                    {copy.startOver}
                  </Button>
                )}
              </CardHeader>
            </Card>

            {phase === 'loading' && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">{copy.loading}</CardContent>
              </Card>
            )}

            {phase === 'session_not_found' && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  <p className="text-sm text-red-600">{copy.sessionNotFoundMessage}</p>
                  <Button onClick={handleStartOver}>{copy.sessionNotFoundButton}</Button>
                </CardContent>
              </Card>
            )}

            {(phase === 'idle' ||
              phase === 'sending' ||
              phase === 'retry' ||
              phase === 'complete' ||
              phase === 'rate_limited' ||
              phase === 'results_gate' ||
              phase === 'results_confirmation') && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  {messages.length === 0 && phase === 'idle' && <p className="text-sm text-muted-foreground">{copy.emptyStateHint}</p>}

                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                        <div
                          className={
                            m.role === 'user'
                              ? 'max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground'
                              : 'max-w-[80%] rounded-2xl bg-accent px-4 py-2 text-sm text-accent-foreground'
                          }
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollAnchorRef} />
                  </div>

                  {phase === 'sending' && <p className="text-sm text-muted-foreground">{formatWaitIndicatorLocalized(locale, elapsedSeconds)}</p>}

                  {phase === 'retry' && (
                    <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-600">{copy.retryMessage}</p>
                      <Button variant="outline" size="sm" onClick={handleRetry}>
                        {copy.retryButton}
                      </Button>
                    </div>
                  )}

                  {phase === 'rate_limited' && (
                    <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm text-amber-800">{rateLimitMessage}</p>
                    </div>
                  )}

                  {phase === 'results_gate' && (
                    <div className="space-y-4 border-t pt-4">
                      {teaser &&
                        (() => {
                          const teaserCopy = buildTeaserCopyLocalized(locale, teaser.consideration_count)
                          return (
                            <div>
                              <p className="text-base font-semibold">{teaserCopy.heading}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{teaserCopy.body}</p>
                            </div>
                          )
                        })()}
                      <div className="space-y-3 border-t pt-4">
                        <p className="text-sm font-medium">{resultsGateCopy.heading}</p>
                        <p className="text-sm text-muted-foreground">{resultsGateCopy.valueProp}</p>
                        <Textarea
                          value={resultsEmailInput}
                          onChange={(e) => setResultsEmailInput(e.target.value)}
                          placeholder={resultsGateCopy.fieldLabel}
                          disabled={resultsEmailSubmitting}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleResultsEmailSubmit()
                            }
                          }}
                        />
                        {resultsEmailError && <p className="text-sm text-red-600">{resultsEmailError}</p>}
                        <Button type="button" size="sm" disabled={!resultsEmailInput.trim() || resultsEmailSubmitting} onClick={handleResultsEmailSubmit}>
                          {resultsGateCopy.buttonText}
                        </Button>
                        <p className="text-xs text-muted-foreground">{resultsGateCopy.disclosure}</p>
                      </div>
                    </div>
                  )}

                  {phase === 'results_confirmation' && confirmationCopy && (
                    <div className="space-y-4 border-t pt-4">
                      <p className="text-base font-semibold">{confirmationCopy.heading}</p>
                      <p className="text-sm text-muted-foreground">{confirmationCopy.body}</p>
                      <p className="text-sm text-muted-foreground">{confirmationCopy.body2}</p>

                      <Button asChild variant="outline" size="sm">
                        <a href={buildCalendlyUrl(attributionToken)} target="_blank" rel="noopener noreferrer" onClick={handleCommercialAssuranceCtaClick}>
                          {copy.commercialAssuranceCta}
                        </a>
                      </Button>

                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <button type="button" className="underline" onClick={handleChangeEmailClick} disabled={resultsEmailSubmitting}>
                          {copy.changeEmail}
                        </button>
                        <button type="button" className="underline" onClick={handleResendResultEmail} disabled={resultsEmailSubmitting}>
                          {copy.resendEmail}
                        </button>
                      </div>
                      {resultsEmailError && <p className="text-sm text-red-600">{resultsEmailError}</p>}
                    </div>
                  )}

                  {phase === 'complete' && projection && (
                    <div className="border-t pt-4">
                      <CrcProjectionOutput output={projection} consultativeNotes={consultativeNotes} />

                      <div className="mt-6">
                        <CommercialAssuranceBridge attributionToken={attributionToken} email={email} />
                      </div>

                      {feedbackStatus === 'submitted' ? (
                        <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">{copy.feedbackThanks}</p>
                      ) : (
                        <div className="mt-6 space-y-3 border-t pt-4">
                          <p className="text-sm font-medium">{copy.feedbackPrompt}</p>
                          <div className="flex gap-2">
                            {(['yes', 'somewhat', 'no'] as const).map((rating) => (
                              <Button
                                key={rating}
                                type="button"
                                variant={feedbackRating === rating ? 'default' : 'outline'}
                                size="sm"
                                disabled={feedbackStatus === 'submitting'}
                                onClick={() => setFeedbackRating(rating)}
                              >
                                {rating === 'yes' ? copy.feedbackYes : rating === 'somewhat' ? copy.feedbackSomewhat : copy.feedbackNo}
                              </Button>
                            ))}
                          </div>
                          <Textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder={copy.feedbackPlaceholder}
                            disabled={feedbackStatus === 'submitting'}
                          />
                          {feedbackStatus === 'error' && <p className="text-sm text-red-600">{copy.feedbackError}</p>}
                          <Button type="button" size="sm" disabled={!feedbackRating || feedbackStatus === 'submitting'} onClick={handleSubmitFeedback}>
                            {copy.feedbackSubmit}
                          </Button>
                        </div>
                      )}

                      <Button variant="outline" size="sm" className="mt-4" onClick={handleStartOver}>
                        {copy.startNewConversation}
                      </Button>
                    </div>
                  )}

                  {phase === 'results_confirmation' && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={handleStartOver}>
                      {copy.startNewConversation}
                    </Button>
                  )}

                  {shouldShowAcknowledgmentGuidance(phase, lastOutcomeWasAcknowledgment) && (
                    <p className="text-sm text-muted-foreground">{getAcknowledgmentGuidanceCopyLocalized(locale)}</p>
                  )}

                  {(phase === 'idle' || phase === 'sending') && (
                    <div className="space-y-3 border-t pt-4">
                      <Textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={copy.typeYourAnswer}
                        disabled={phase === 'sending'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                          }
                        }}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="ghost" size="sm" disabled={phase === 'sending'} onClick={() => handleDecline('skip_question')}>
                            {copy.skipQuestion}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" disabled={phase === 'sending'} onClick={() => handleDecline('skip_phase')}>
                            {copy.skipSection}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" disabled={phase === 'sending'} onClick={() => handleDecline('stop_interview')}>
                            {copy.stop}
                          </Button>
                        </div>
                        <Button type="button" disabled={phase === 'sending' || inputText.trim().length === 0} onClick={handleSend}>
                          {copy.send}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * CRC-UI-1: the actual default export. CrcLocaleProvider wraps
 * CrcPageContent so `useCrcLocale()` has an ancestor provider -- this is
 * the ONLY new top-level element this milestone adds outside CrcPageContent
 * itself; no other page/layout file is touched (see this milestone's own
 * report -- app/layout.tsx is deliberately NOT where locale state lives,
 * keeping this entirely scoped to the /crc route).
 */
export default function CrcPage() {
  return (
    <CrcLocaleProvider>
      <CrcPageContent />
    </CrcLocaleProvider>
  )
}
