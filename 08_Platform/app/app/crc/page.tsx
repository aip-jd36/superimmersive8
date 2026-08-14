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
import { shouldShowAcknowledgmentGuidance, ACKNOWLEDGMENT_GUIDANCE_COPY, type CrcPagePhase as Phase } from '@/lib/crc-engine/acknowledgment-guidance'
import { getRateLimitMessage } from '@/lib/crc-engine/rate-limit-copy'
import { RESULTS_GATE_COPY, buildConfirmationCopy, buildTeaserCopy } from '@/lib/crc-engine/results-gate-copy'
import { buildCalendlyUrl } from '@/lib/crc-engine/calendly-attribution'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

/** Mirrors route.ts's own DECLINE_LABEL exactly, for immediate optimistic display before the server responds. */
const DECLINE_LABEL = {
  skip_question: "Let's skip this question.",
  skip_phase: "Let's skip this section.",
  stop_interview: "I'd like to stop here.",
} as const

/** What to resend on Retry -- exactly the body of the last POST attempt. */
type PendingRequestBody = { message: string } | { declineAction: keyof typeof DECLINE_LABEL }

type FeedbackRating = 'yes' | 'somewhat' | 'no'
type FeedbackStatus = 'idle' | 'submitting' | 'submitted' | 'error'

export default function CrcPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [projection, setProjection] = useState<ProjectionOutput | null>(null)
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
        setPhase('idle')
      } else if (data.status === 'session_not_found') {
        setPhase('session_not_found')
      } else if (data.status === 'active') {
        setMessages(data.transcript)
        // SessionStatusResponseBody doesn't carry whether the last turn
        // was a question or an acknowledgment -- deliberately not shown on
        // a fresh page load/refresh (only on a live transition within this
        // same session), keeping this fix presentation-only and small.
        setLastOutcomeWasAcknowledgment(false)
        setPhase('idle')
      } else if (data.status === 'complete') {
        setMessages(data.transcript)
        applyCompleteResponse(data)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

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
    pendingRequestRef.current = body
    setPhase('sending')

    const optimisticText = 'message' in body ? body.message : DECLINE_LABEL[body.declineAction]
    setMessages((prev) => [...prev, { role: 'user', text: optimisticText }])

    let res: Response
    try {
      res = await fetch('/api/crc/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } catch {
      setPhase('retry')
      return
    }

    const data: TurnResponseBody = await res.json()

    if (data.status === 'question' || data.status === 'acknowledgment') {
      // Commercial Readiness Discovery Catalog integration, 2026-08-12:
      // when present, the fixed Educational Takeaway from the PREVIOUS
      // discovery question renders as its own message, immediately ahead
      // of this turn's own -- two distinct conversational beats from one
      // response, never a separate interview question.
      setMessages((prev) => [
        ...prev,
        ...(data.precedingTakeaway ? [{ role: 'assistant' as const, text: data.precedingTakeaway }] : []),
        { role: 'assistant', text: data.message },
      ])
      pendingRequestRef.current = null
      setInputText('')
      setLastOutcomeWasAcknowledgment(data.status === 'acknowledgment')
      setPhase('idle')
    } else if (data.status === 'complete') {
      if (data.precedingTakeaway) {
        const takeaway = data.precedingTakeaway
        setMessages((prev) => [...prev, { role: 'assistant', text: takeaway }])
      }
      pendingRequestRef.current = null
      setInputText('')
      setLastOutcomeWasAcknowledgment(false)
      applyCompleteResponse(data)
    } else if (data.status === 'rate_limited') {
      setMessages((prev) => prev.slice(0, -1))
      setRateLimitMessage(getRateLimitMessage(data.reason, data.retryAfterSeconds))
      setPhase('rate_limited')
    } else if (data.status === 'session_not_found') {
      setLastOutcomeWasAcknowledgment(false)
      setPhase('session_not_found')
    } else if (data.status === 'retry') {
      setPhase('retry')
    } else if (data.status === 'invalid_request') {
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
      res = await fetch('/api/crc/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) })
    } catch {
      setResultsEmailSubmitting(false)
      setResultsEmailError('That didn’t go through. You can try again.')
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
      setResultsEmailError(getRateLimitMessage(data.reason, data.retryAfterSeconds))
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
  }

  function handleStartOverClick() {
    const hasUnfinishedProgress = messages.length > 0 && phase !== 'complete' && phase !== 'results_confirmation'
    if (hasUnfinishedProgress && !window.confirm('Start over? This will clear the current conversation.')) return
    handleStartOver()
  }

  async function handleSubmitFeedback() {
    if (!feedbackRating || feedbackStatus === 'submitting') return
    setFeedbackStatus('submitting')
    try {
      const res = await fetch('/api/crc/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: feedbackRating, text: feedbackText.trim() || undefined }),
      })
      setFeedbackStatus(res.ok ? 'submitted' : 'error')
    } catch {
      setFeedbackStatus('error')
    }
  }

  const confirmationCopy = resultsEmail?.masked_email ? buildConfirmationCopy(resultsEmail.masked_email) : null

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Commercial Readiness Check</CardTitle>
              <CardDescription>
                A short conversation about how your AI video was made. There&apos;s no wrong answer, and you can skip anything you&apos;d rather not
                cover. This is educational workflow guidance, not an SI8 Commercial Assurance Assessment -- it doesn&apos;t provide legal advice or
                certify commercial use.
              </CardDescription>
            </div>
            {phase !== 'loading' && (
              <Button variant="ghost" size="sm" className="shrink-0" onClick={handleStartOverClick}>
                Start Over
              </Button>
            )}
          </CardHeader>
        </Card>

        {phase === 'loading' && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        )}

        {phase === 'session_not_found' && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-red-600">Your session could not be found. It may have expired.</p>
              <Button onClick={handleStartOver}>Start New Conversation</Button>
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
              {messages.length === 0 && phase === 'idle' && (
                <p className="text-sm text-muted-foreground">Tell me a bit about the project to get started.</p>
              )}

              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={m.role === 'user' ? 'max-w-[80%] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground' : 'max-w-[80%] rounded-lg bg-muted px-4 py-2 text-sm'}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={scrollAnchorRef} />
              </div>

              {phase === 'sending' && <p className="text-sm text-muted-foreground">Thinking…</p>}

              {phase === 'retry' && (
                <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">Something went wrong. Nothing was lost -- you can try again.</p>
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    Retry
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
                      const teaserCopy = buildTeaserCopy(teaser.consideration_count)
                      return (
                        <div>
                          <p className="text-base font-semibold">{teaserCopy.heading}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{teaserCopy.body}</p>
                        </div>
                      )
                    })()}
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-medium">{RESULTS_GATE_COPY.heading}</p>
                    <p className="text-sm text-muted-foreground">{RESULTS_GATE_COPY.valueProp}</p>
                    <Textarea
                      value={resultsEmailInput}
                      onChange={(e) => setResultsEmailInput(e.target.value)}
                      placeholder={RESULTS_GATE_COPY.fieldLabel}
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
                      {RESULTS_GATE_COPY.buttonText}
                    </Button>
                    <p className="text-xs text-muted-foreground">{RESULTS_GATE_COPY.disclosure}</p>
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
                      Talk with SI8 about a Commercial Assurance Assessment
                    </a>
                  </Button>

                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <button type="button" className="underline" onClick={handleChangeEmailClick} disabled={resultsEmailSubmitting}>
                      Wrong email? Change it
                    </button>
                    <button type="button" className="underline" onClick={handleResendResultEmail} disabled={resultsEmailSubmitting}>
                      Didn&apos;t get it? Resend
                    </button>
                  </div>
                  {resultsEmailError && <p className="text-sm text-red-600">{resultsEmailError}</p>}
                </div>
              )}

              {phase === 'complete' && projection && (
                <div className="border-t pt-4">
                  <CrcProjectionOutput output={projection} />

                  <div className="mt-6">
                    <CommercialAssuranceBridge attributionToken={attributionToken} email={email} />
                  </div>

                  {feedbackStatus === 'submitted' ? (
                    <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">Thanks for the feedback.</p>
                  ) : (
                    <div className="mt-6 space-y-3 border-t pt-4">
                      <p className="text-sm font-medium">Was this helpful?</p>
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
                            {rating === 'yes' ? 'Yes' : rating === 'somewhat' ? 'Somewhat' : 'No'}
                          </Button>
                        ))}
                      </div>
                      <Textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Anything you'd add? (optional)"
                        disabled={feedbackStatus === 'submitting'}
                      />
                      {feedbackStatus === 'error' && (
                        <p className="text-sm text-red-600">Something went wrong submitting your feedback. You can try again.</p>
                      )}
                      <Button type="button" size="sm" disabled={!feedbackRating || feedbackStatus === 'submitting'} onClick={handleSubmitFeedback}>
                        Submit feedback
                      </Button>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="mt-4" onClick={handleStartOver}>
                    Start a New Conversation
                  </Button>
                </div>
              )}

              {phase === 'results_confirmation' && (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleStartOver}>
                  Start a New Conversation
                </Button>
              )}

              {shouldShowAcknowledgmentGuidance(phase, lastOutcomeWasAcknowledgment) && (
                <p className="text-sm text-muted-foreground">{ACKNOWLEDGMENT_GUIDANCE_COPY}</p>
              )}

              {(phase === 'idle' || phase === 'sending') && (
                <div className="space-y-3 border-t pt-4">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your answer…"
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
                        Skip question
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={phase === 'sending'} onClick={() => handleDecline('skip_phase')}>
                        Skip section
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={phase === 'sending'} onClick={() => handleDecline('stop_interview')}>
                        Stop
                      </Button>
                    </div>
                    <Button type="button" disabled={phase === 'sending' || inputText.trim().length === 0} onClick={handleSend}>
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
