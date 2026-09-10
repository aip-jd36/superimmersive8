'use client'

/**
 * Human Reviewer Research (HRR) — the converged Governed Research Interface
 * surface inside the "Living Knowledge" tab (CAH-4E → CAH-4F → CAH-4G.6).
 *
 * TWO entry modes into ONE governed research capability:
 *   - TOPIC SHORTCUTS  — deterministic; clicking a chip runs the research
 *                        directly (0 classifier/model calls);
 *   - ASK HRR          — a free-form research question about this submission
 *                        (1 bounded classify-only model call, server-side).
 *
 * BOTH modes POST to `/api/admin/submissions/[id]/reviewer-lk/research`, which
 * runs the SAME downstream pipeline (selection → applicability → Bounded
 * Interpretation → deterministic composition → REQUIRED lk_research audit) and
 * returns one `HrrResearchAnswer`. Both render through the ONE
 * `<HrrResearchAnswerView>` — there is no topic-vs-question presentation split.
 *
 * NOTHING is fetched on mount, on inspector open, or on tab switch. Each
 * question/topic is interpreted independently from its own text — there is NO
 * conversation memory: a previous answer is never sent into the next request.
 * The raw question lives only in this component's state for the current
 * request + the attributed "You asked:" echo; it is never persisted to storage
 * or a URL. Reloading the page shows the empty surface again.
 *
 * One current research response. A new topic/question replaces it — this is the
 * honest representation of the stateless V1 architecture.
 *
 * No editable control that touches assessment state. No "copy to evidence" /
 * "apply" / "accept" / "summarize".
 */

import { useCallback, useRef, useState } from 'react'
import type { GoalCategory } from '@/types/interview-engine'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import { HRR_QUESTION_MAX_LENGTH } from '@/lib/reviewer-lk/types'
import type { HrrResearchAnswer } from '@/lib/hrr/types'
import { HrrResearchAnswerView } from './HrrResearchAnswerView'

type ResearchPayload =
  | { mode: 'topic_pick'; topic: GoalCategory }
  | { mode: 'question'; question: string }

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'answer'; answer: HrrResearchAnswer }
  | { kind: 'error'; message: string }

const ACCENT = '#233f66'
const INK_SOFT = '#4a4a52'
const MUTED = '#83837e'

/** Reviewer-readable topic chips. `data-topic` carries the canonical enum; a click runs the research. */
function TopicShortcuts({
  topics,
  disabled,
  onResearch,
}: {
  topics: readonly GoalCategory[]
  disabled: boolean
  onResearch: (topic: GoalCategory) => void
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const [focused, setFocused] = useState(0)
  const moveTo = (next: number) => {
    const n = (next + topics.length) % topics.length
    setFocused(n)
    refs.current[n]?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Research topic shortcuts" className="mt-1.5 flex flex-wrap gap-1.5">
      {topics.map((t, i) => (
        <button
          key={t}
          ref={(el) => { refs.current[i] = el }}
          type="button"
          role="radio"
          aria-checked={i === focused}
          tabIndex={i === focused ? 0 : -1}
          disabled={disabled}
          data-topic={t}
          onClick={() => onResearch(t)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); moveTo(focused + 1) }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); moveTo(focused - 1) }
          }}
          className="rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
          style={{ borderColor: '#d9d6cc', backgroundColor: '#ffffff', color: INK_SOFT }}
        >
          {reviewerTopicLabel(t)}
        </button>
      ))}
    </div>
  )
}

export function ReviewerLkLookup({
  submissionId,
  topics,
}: {
  submissionId: string
  topics: readonly GoalCategory[]
}) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [question, setQuestion] = useState('')
  // Monotonic request sequence — a slower earlier response can never overwrite a
  // newer one (rapid topic clicks / question submits).
  const seqRef = useRef(0)

  const research = useCallback(
    async (payload: ResearchPayload) => {
      const mine = ++seqRef.current
      setState({ kind: 'loading' })
      try {
        const res = await fetch(
          `/api/admin/submissions/${submissionId}/reviewer-lk/research`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
          },
        )
        if (mine !== seqRef.current) return
        if (res.status === 503) {
          setState({ kind: 'error', message: 'Living Knowledge research unavailable — access could not be recorded. Try again.' })
          return
        }
        if (res.status === 400) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          setState({ kind: 'error', message: data?.error ?? 'Check your research question and try again.' })
          return
        }
        if (!res.ok) {
          setState({ kind: 'error', message: 'Living Knowledge research is unavailable right now. Try again.' })
          return
        }
        const answer = (await res.json()) as HrrResearchAnswer
        if (mine !== seqRef.current) return
        setState({ kind: 'answer', answer })
      } catch {
        if (mine !== seqRef.current) return
        setState({ kind: 'error', message: 'Could not reach Living Knowledge research. Check your connection and try again.' })
      }
    },
    [submissionId],
  )

  const submitQuestion = useCallback(() => {
    const q = question.trim()
    if (q.length === 0 || state.kind === 'loading') return
    research({ mode: 'question', question: q })
  }, [question, state.kind, research])

  const loading = state.kind === 'loading'

  return (
    <div className="text-sm">
      <p className="text-xs leading-relaxed" style={{ color: INK_SOFT }}>
        Research SI8&rsquo;s governed Living Knowledge for this submission — pick a topic shortcut, or ask a research question.
      </p>

      {/* ── Topic shortcuts ─────────────────────────────────────────────── */}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
        Topic shortcuts
      </p>
      <TopicShortcuts
        topics={topics}
        disabled={loading}
        onResearch={(topic) => { if (!loading) research({ mode: 'topic_pick', topic }) }}
      />

      {/* ── Ask HRR ─────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <label htmlFor="hrr-question" className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          Ask HRR
        </label>
        <textarea
          id="hrr-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitQuestion() }
          }}
          maxLength={HRR_QUESTION_MAX_LENGTH}
          rows={2}
          placeholder="What would you like to research about this submission?"
          className="mt-1 w-full resize-y rounded-md border px-2.5 py-2 text-sm"
          style={{ borderColor: '#d9d6cc', color: '#1c1c1e', backgroundColor: '#ffffff' }}
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={submitQuestion}
            disabled={loading || question.trim().length === 0}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {loading ? 'Researching…' : 'Ask'}
          </button>
          <span className="text-[11px]" style={{ color: MUTED }}>
            HRR searches and interprets governed SI8 Living Knowledge for this submission. Not legal advice; not a commercial-clearance determination.
          </span>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <p className="mt-3 text-sm" role="status" aria-live="polite" style={{ color: MUTED }}>
          Performing governed research…
        </p>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {state.kind === 'error' && (
        <p className="mt-3 text-sm" role="alert" style={{ color: '#9a3b2f' }}>
          {state.message}
        </p>
      )}

      {/* ── One current research response ───────────────────────────────── */}
      {state.kind === 'answer' && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs" style={{ color: MUTED }}>
            <span className="font-semibold uppercase tracking-wide">Governed research response</span>
            <button
              type="button"
              onClick={() => { seqRef.current++; setState({ kind: 'idle' }); setQuestion('') }}
              className="font-medium hover:underline"
              style={{ color: ACCENT }}
            >
              Clear
            </button>
          </div>
          <p className="mb-2 text-[11px] italic" style={{ color: MUTED }}>
            Reference only — not assessment evidence.
          </p>
          <HrrResearchAnswerView
            answer={state.answer}
            onResearchTopic={(topic) => { if (!loading) research({ mode: 'topic_pick', topic }) }}
          />
        </div>
      )}
    </div>
  )
}
