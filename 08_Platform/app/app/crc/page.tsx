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
import type { TurnResponseBody, SessionStatusResponseBody } from '@/app/api/crc/turn/route'
import type { ProjectionOutput } from '@/lib/projection-layer/types'

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

type Phase = 'loading' | 'idle' | 'sending' | 'retry' | 'complete' | 'session_not_found'

/** What to resend on Retry -- exactly the body of the last POST attempt. */
type PendingRequestBody = { message: string } | { declineAction: keyof typeof DECLINE_LABEL }

export default function CrcPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [projection, setProjection] = useState<ProjectionOutput | null>(null)
  const [inputText, setInputText] = useState('')
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
      setMessages((prev) => [...prev, { role: 'assistant', text: data.message }])
      pendingRequestRef.current = null
      setInputText('')
      setPhase('idle')
    } else if (data.status === 'complete') {
      setProjection(data.projection)
      pendingRequestRef.current = null
      setInputText('')
      setPhase('complete')
    } else if (data.status === 'session_not_found') {
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
    setPhase('idle')
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Commercial Readiness Check</CardTitle>
            <CardDescription>
              A short conversation about how your AI video was made. There&apos;s no wrong answer, and you can skip anything you&apos;d rather not
              cover.
            </CardDescription>
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
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleStartOver}>
                    Start a New Conversation
                  </Button>
                </div>
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
