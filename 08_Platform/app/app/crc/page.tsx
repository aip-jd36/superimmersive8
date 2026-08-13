'use client'

/**
 * /crc -- the smallest usable live CRC conversation experience (CRC
 * Product Integration -- First Usable Live Slice, Phase 6).
 *
 * All conversation state (session token, StructuredUnderstanding,
 * BoundaryState, pending_clarification) lives server-side, addressed by
 * an httpOnly cookie this component never reads directly -- it only ever
 * calls GET/POST /api/crc/turn and renders whatever browser-safe response
 * comes back. No internal phase names, gate states, or signal ids are
 * ever surfaced here -- there is nothing in either response type that
 * could leak them (see route.ts's own TurnResponseBody/
 * SessionStatusResponseBody types).
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { CrcProjectionOutput } from '@/components/CrcProjectionOutput'
import { CommercialAssuranceBridge } from '@/components/CommercialAssuranceBridge'
import type { TurnResponseBody, SessionStatusResponseBody } from '@/lib/crc-engine/api-contract'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import { shouldShowAcknowledgmentGuidance, ACKNOWLEDGMENT_GUIDANCE_COPY, type CrcPagePhase as Phase } from '@/lib/crc-engine/acknowledgment-guidance'

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
  const pendingRequestRef = useRef<PendingRequestBody | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

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
        setProjection(data.projection)
        setPhase('complete')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

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
      setProjection(data.projection)
      pendingRequestRef.current = null
      setInputText('')
      setLastOutcomeWasAcknowledgment(false)
      setPhase('complete')
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
    setPhase('idle')
  }

  function handleStartOverClick() {
    const hasUnfinishedProgress = messages.length > 0 && phase !== 'complete'
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

        {(phase === 'idle' || phase === 'sending' || phase === 'retry' || phase === 'complete') && (
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

              {phase === 'complete' && projection && (
                <div className="border-t pt-4">
                  <CrcProjectionOutput output={projection} />

                  <div className="mt-6">
                    <CommercialAssuranceBridge />
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
