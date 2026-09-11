'use client'

/**
 * Human Reviewer Research (HRR) — the converged Governed Research Interface
 * surface inside the "Living Knowledge" tab (CAH-4E → CAH-4F → CAH-4G.6 →
 * CAH-4G.10).
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
 * CAH-4G.10 Slice A — VISIBLE CONVERSATIONAL THREAD:
 * successive research actions are now APPEND-ONLY. Asking a second question no
 * longer replaces the first interaction — the prior reviewer turns and HRR
 * answers stay visible (`hrr-thread.ts`). This is a VISIBLE thread, NOT a
 * CONTEXTUAL one: every free-form question is STILL classified from its own
 * text as the primary signal. NO prior turn's PROSE (question text, answer
 * text, applicability, BI, composition) is ever sent anywhere — the audit,
 * retrieval, applicability, BI, and composition layers never see anything
 * beyond the current turn. As of CAH-4G.18B, a `mode: 'question'` request
 * ADDITIONALLY carries a bounded, structured `context` field (see CAH-4G.18B
 * below) — enum/identifier only, never prose, never a transcript. Through
 * CAH-4G.10–CAH-4G.17 the POST body for `mode: 'question'` genuinely was
 * `{ mode, question }` only (`deriveResearchSessionContext` existed
 * server-side from CAH-4G.15 but this component never called it — the exact
 * gap CAH-4G.18A found). `mode: 'topic_pick'` remains `{ mode, topic }` only,
 * unchanged since Slice A — explicit topic actions carry no context, ever.
 *
 * NOTHING is fetched on mount, on inspector open, or on tab switch. The thread
 * lives only in this component's `useReducer` state — no storage, no URL, no
 * server round-trip. A page reload shows the empty surface again; an inspector
 * tab-switch / close-reopen keeps the thread (component stays mounted).
 *
 * No editable control that touches assessment state. No "copy to evidence" /
 * "apply" / "accept" / "summarize".
 *
 * CAH-4G.18B — CLIENT CONTEXT TRANSPORT (closes the gap CAH-4G.18A found:
 * `deriveResearchSessionContext` existed server-side since CAH-4G.15 but was
 * never actually called here, so no `mode: 'question'` request ever carried
 * `context`, regardless of the CAH-4G.17 server feature flag). A free-form
 * submit now derives `ResearchSessionContext` from the CURRENT visible
 * thread, immediately before sending — the selector remains the SOLE
 * derivation authority; nothing here constructs context independently or
 * reads prior answer prose. `mode: 'topic_pick'` requests remain byte-for-byte
 * unchanged — NO `context` field, ever (explicit topic actions stay
 * structurally independent of inherited context). Whether the server
 * actually USES the transported `activeFocus` is still gated entirely by
 * `HRR_ACTIVE_FOCUS_CONTEXT_ENABLED` (CAH-4G.17, unchanged) — this file only
 * ensures the bounded contract reaches the existing server trust boundary.
 */

import { useCallback, useReducer, useRef, useState } from 'react'
import type { GoalCategory } from '@/types/interview-engine'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import { HRR_QUESTION_MAX_LENGTH } from '@/lib/reviewer-lk/types'
import type { HrrResearchAnswer } from '@/lib/hrr/types'
import { deriveResearchSessionContext, type ResearchSessionContext } from '@/lib/hrr/research-session-context'
import { HrrResearchAnswerView } from './HrrResearchAnswerView'
import {
  EMPTY_HRR_THREAD,
  hrrThreadReducer,
  questionReviewerTurn,
  topicReviewerTurn,
  type HrrThreadTurn,
} from './hrr-thread'

type ResearchPayload =
  | { mode: 'topic_pick'; topic: GoalCategory }
  | { mode: 'question'; question: string; context: ResearchSessionContext }

const ACCENT = '#233f66'
const INK_SOFT = '#4a4a52'
const MUTED = '#83837e'
const LINE = '#e0ddd2'

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

/** One turn in the append-only research thread. Reviewer actions and HRR responses render distinctly but soberly — no chat bubbles, no avatars. */
function ThreadTurn({
  turn,
  onResearchTopic,
}: {
  turn: HrrThreadTurn
  onResearchTopic: (topic: GoalCategory) => void
}) {
  if (turn.role === 'reviewer') {
    return (
      <div className="text-xs" style={{ color: INK_SOFT }}>
        <span className="mr-1.5 font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
          {turn.entryMode === 'topic' ? 'Research:' : 'You asked:'}
        </span>
        {turn.entryMode === 'topic' ? turn.label : turn.question}
      </div>
    )
  }
  if (turn.status === 'pending') {
    return (
      <p className="text-sm" role="status" aria-live="polite" style={{ color: MUTED }}>
        Performing governed research…
      </p>
    )
  }
  if (turn.status === 'error') {
    return (
      <p className="text-sm" role="alert" style={{ color: '#9a3b2f' }}>
        {turn.message}
      </p>
    )
  }
  return <HrrResearchAnswerView answer={turn.answer} onResearchTopic={onResearchTopic} />
}

export function ReviewerLkLookup({
  submissionId,
  topics,
}: {
  submissionId: string
  topics: readonly GoalCategory[]
}) {
  const [thread, dispatch] = useReducer(hrrThreadReducer, EMPTY_HRR_THREAD)
  const [question, setQuestion] = useState('')
  // Monotonic request id — a slower earlier response can never resolve a turn
  // after a newer request or a "Clear conversation" (checked here AND in the
  // reducer, which also enforces one request in flight at a time).
  const seqRef = useRef(0)

  const loading = thread.inFlight !== 0

  const research = useCallback(
    async (payload: ResearchPayload) => {
      const mine = ++seqRef.current
      dispatch({
        type: 'begin',
        seq: mine,
        reviewer:
          payload.mode === 'topic_pick'
            ? topicReviewerTurn(mine, payload.topic, reviewerTopicLabel(payload.topic))
            : questionReviewerTurn(mine, payload.question),
      })
      const settle = (result: { answer: HrrResearchAnswer } | { message: string }) => {
        if (mine !== seqRef.current) return
        dispatch({ type: 'settle', seq: mine, result })
      }
      try {
        // The request body is EXACTLY `{ mode, topic }` (topic_pick) or
        // `{ mode, question, context }` (question, CAH-4G.18B). `payload`
        // (built by the caller) is the WHOLE body — this function adds
        // nothing to it. No transcript, no messages[], no prior question/
        // answer prose — a second/third question still sends only ITS OWN
        // question text; `context` is bounded/structured/enum-only, never
        // prose (`deriveResearchSessionContext`, CAH-4G.15).
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
          settle({ message: 'Living Knowledge research unavailable — access could not be recorded. Try again.' })
          return
        }
        if (res.status === 400) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          settle({ message: data?.error ?? 'Check your research question and try again.' })
          return
        }
        if (!res.ok) {
          settle({ message: 'Living Knowledge research is unavailable right now. Try again.' })
          return
        }
        const answer = (await res.json()) as HrrResearchAnswer
        settle({ answer })
      } catch {
        settle({ message: 'Could not reach Living Knowledge research. Check your connection and try again.' })
      }
    },
    [submissionId],
  )

  // One research request in flight at a time — topic clicks and question
  // submits are both gated on `thread.inFlight === 0` (and the controls are
  // `disabled` while loading).
  const runTopic = useCallback(
    (topic: GoalCategory) => {
      if (thread.inFlight === 0) research({ mode: 'topic_pick', topic })
    },
    [thread.inFlight, research],
  )

  const submitQuestion = useCallback(() => {
    const q = question.trim()
    if (q.length === 0 || thread.inFlight !== 0) return
    // CAH-4G.18B: derived from the CURRENT thread, immediately before
    // sending — `deriveResearchSessionContext` is the sole derivation
    // authority (never constructed independently here, never from prior
    // answer prose). Bounded, structured, enum/identifier-only — see
    // `lib/hrr/research-session-context.ts`.
    const context = deriveResearchSessionContext(thread)
    setQuestion('') // the question is now recorded as a visible reviewer turn
    research({ mode: 'question', question: q, context })
  }, [question, thread, research])

  const clearConversation = useCallback(() => {
    seqRef.current++ // invalidate any in-flight response
    setQuestion('')
    dispatch({ type: 'clear' })
  }, [])

  return (
    <div className="text-sm">
      <p className="text-xs leading-relaxed" style={{ color: INK_SOFT }}>
        Research SI8&rsquo;s governed Living Knowledge for this submission — pick a topic shortcut, or ask a research question. Each question is researched independently.
      </p>

      {/* ── Topic shortcuts ─────────────────────────────────────────────── */}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
        Topic shortcuts
      </p>
      <TopicShortcuts topics={topics} disabled={loading} onResearch={runTopic} />

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

      {/* ── Append-only research conversation ───────────────────────────── */}
      {thread.turns.length > 0 && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: LINE }}>
          <div className="mb-1 flex items-center justify-between text-xs" style={{ color: MUTED }}>
            <span className="font-semibold uppercase tracking-wide">Research conversation</span>
            <button
              type="button"
              onClick={clearConversation}
              className="font-medium hover:underline"
              style={{ color: ACCENT }}
            >
              Clear conversation
            </button>
          </div>
          <p className="mb-3 text-[11px] italic" style={{ color: MUTED }}>
            Reference only — not assessment evidence. Each question above was researched on its own.
          </p>
          <ol className="space-y-3">
            {thread.turns.map((turn) => (
              <li key={turn.id}>
                <ThreadTurn turn={turn} onResearchTopic={runTopic} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
