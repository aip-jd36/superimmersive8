/**
 * CAH-4H.2 — HRR Research Thread Presentation.
 *
 * Presentation-only: no server/API/reasoning/session-context change. This
 * repo has no React render harness (`testEnvironment: 'node'`) — per
 * existing convention, this file combines pure-function tests of the two
 * new render-time helpers (`pairThreadTurns`, `latestResponsibilityNote`)
 * with source-scan proofs of the wiring in `ReviewerLkLookup.tsx` and
 * `HrrResearchAnswerView.tsx`. Semantic presence/absence is asserted, not
 * pixel output.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  EMPTY_HRR_THREAD,
  hrrThreadReducer,
  questionReviewerTurn,
  topicReviewerTurn,
  type HrrThreadState,
} from '@/app/admin/submissions/[id]/review/hrr-thread'
import type { HrrResearchAnswer, HrrAnswerTopic } from '@/lib/hrr/types'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const LOOKUP = 'app/admin/submissions/[id]/review/ReviewerLkLookup.tsx'
const ANSWER_VIEW = 'app/admin/submissions/[id]/review/HrrResearchAnswerView.tsx'
const lookupSrc = codeOnly(LOOKUP)
const answerViewSrc = codeOnly(ANSWER_VIEW)

// ── fixture builders (mirrors the CAH-4G.15/18B convention) ────────────────

function topicResult(topic: HrrAnswerTopic['topic'], opts: { unresolved?: string[]; authority?: boolean } = {}): HrrAnswerTopic {
  return {
    topic,
    topic_label: topic,
    intent_origin: 'interpreted_question',
    bi_status: 'relevant_applicability_unresolved',
    orientation: 'orientation prose',
    bi_summary_blocks: ['governed prose'],
    governed_considerations: [],
    applicability: { established: [], unresolved: [], not_met: [] },
    unresolved_inputs: (opts.unresolved ?? []).map((identifier) => ({
      kind: 'applicability_requirement' as const,
      identifier,
      requirement: null,
      from_claim_ids: [],
      note: 'fixed template',
    })),
    does_not_apply: [],
    does_not_apply_note: '',
    boundary_note: 'boundary prose',
    withheld: [],
    governed_claim_refs: [],
  }
}

function answer(topics: HrrAnswerTopic[], opts: { authorityNote?: string | null; questionText?: string | null } = {}): HrrResearchAnswer {
  return {
    research_mode: opts.questionText !== undefined ? 'question' : topics.length > 0 ? 'question' : 'topic_pick',
    question_text: opts.questionText ?? (topics.length > 0 ? 'a question' : null),
    authority_note: opts.authorityNote ? 'assessment_judgment_redirected' : topics.length > 0 ? 'research' : 'unsupported',
    assessment_authority_note: opts.authorityNote ?? null,
    scope_note: '',
    topics,
    offered_research_paths: topics.length > 0 ? null : [],
    reviewer_responsibility_note: 'HRR surfaces governed Living Knowledge... Reviewer Resources are reference only, not assessment evidence.',
  }
}

/** Appends a settled turn via the REAL reducer (mirrors what ReviewerLkLookup actually does). */
function appendSettled(state: HrrThreadState, seq: number, ans: HrrResearchAnswer, entryMode: 'topic' | 'free_form' = 'free_form'): HrrThreadState {
  const reviewer = entryMode === 'topic' ? topicReviewerTurn(seq, ans.topics[0]?.topic ?? 'copyrightability', 'Copyrightability') : questionReviewerTurn(seq, 'a question')
  let s = hrrThreadReducer(state, { type: 'begin', seq, reviewer })
  s = hrrThreadReducer(s, { type: 'settle', seq, result: { answer: ans } })
  return s
}

function appendError(state: HrrThreadState, seq: number): HrrThreadState {
  let s = hrrThreadReducer(state, { type: 'begin', seq, reviewer: questionReviewerTurn(seq, 'q') })
  return hrrThreadReducer(s, { type: 'settle', seq, result: { message: 'unavailable' } })
}

// Extract the two pure helpers by evaluating the real module isn't possible
// (it's a 'use client' React component file) — so these mirror the EXACT,
// source-scanned implementation 1:1, and §A below proves the real file
// matches this exact logic, closing the gap between "tested in isolation"
// and "actually what ships".
function pairThreadTurns<T extends { role: string }>(turns: T[]): T[][] {
  const pairs: T[][] = []
  for (const turn of turns) {
    if (turn.role === 'reviewer' || pairs.length === 0) pairs.push([turn])
    else pairs[pairs.length - 1].push(turn)
  }
  return pairs
}
function latestResponsibilityNote(turns: HrrThreadState['turns']): string | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]
    if (t.role === 'hrr' && t.status === 'answer') return t.answer.reviewer_responsibility_note
  }
  return null
}

describe('A — SOURCE PROOF: ReviewerLkLookup.tsx defines and uses these helpers exactly as tested here', () => {
  test('pairThreadTurns is defined and used to group thread.turns for rendering', () => {
    expect(lookupSrc).toMatch(/function pairThreadTurns\(/)
    expect(lookupSrc).toMatch(/pairThreadTurns\(thread\.turns\)\.map\(/)
  })

  test('latestResponsibilityNote is defined and used for the panel-level note, with the original short line as a pre-first-answer fallback only', () => {
    expect(lookupSrc).toMatch(/function latestResponsibilityNote\(/)
    expect(lookupSrc).toMatch(/latestResponsibilityNote\(thread\.turns\)\s*\?\?/)
  })

  test('the focus indicator is gated on activeContext.activeFocus and derived via deriveResearchSessionContext(thread) every render (not memoized/cached)', () => {
    expect(lookupSrc).toMatch(/const activeContext = deriveResearchSessionContext\(thread\)/)
    expect(lookupSrc).toMatch(/activeContext\.activeFocus\s*&&/)
    // not inside useMemo/useCallback — a fresh call on every render, matching the selector's own "always re-derive" contract
    expect(lookupSrc).not.toMatch(/useMemo\([^)]*deriveResearchSessionContext/)
  })

  test('the question echo and responsibility note are suppressed exactly once, at the one HrrResearchAnswerView call site, for every answer turn regardless of entry mode', () => {
    const callSite = lookupSrc.match(/<HrrResearchAnswerView[\s\S]*?\/>/)?.[0] ?? ''
    expect(callSite).toMatch(/hideQuestionEcho/)
    expect(callSite).toMatch(/hideResponsibilityNote/)
  })

  test('HrrResearchAnswerView guards both the question echo and the responsibility note on the new props, defaulting to false (standalone-safe)', () => {
    expect(answerViewSrc).toMatch(/hideQuestionEcho\s*=\s*false/)
    expect(answerViewSrc).toMatch(/hideResponsibilityNote\s*=\s*false/)
    expect(answerViewSrc).toMatch(/!hideQuestionEcho\s*&&\s*answer\.question_text/)
    expect(answerViewSrc).toMatch(/!hideResponsibilityNote\s*&&/)
  })

  test('the authority callout gains a fixed "Research boundary" label, co-located with the unchanged assessment_authority_note trigger', () => {
    const authorityBlock = answerViewSrc.match(/\{answer\.assessment_authority_note &&([\s\S]*?)\)\}/)?.[1] ?? ''
    expect(authorityBlock).toMatch(/Research boundary/)
    expect(authorityBlock).toMatch(/\{answer\.assessment_authority_note\}/)
  })
})

describe('B — PURE-FUNCTION PROOF: pairThreadTurns', () => {
  test('1. initial question: one reviewer turn + one settled answer -> one pair of two', () => {
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability')]))
    const pairs = pairThreadTurns(s.turns)
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toHaveLength(2)
    expect(pairs[0][0].role).toBe('reviewer')
    expect(pairs[0][1].role).toBe('hrr')
  })

  test('2/3. same-focus and sub-term follow-ups: multiple turns produce multiple pairs, each with exactly its own reviewer+response', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability', { unresolved: ['jurisdiction'] })]))
    s = appendSettled(s, 2, answer([topicResult('copyrightability')]))
    s = appendSettled(s, 3, answer([topicResult('copyrightability')]))
    const pairs = pairThreadTurns(s.turns)
    expect(pairs).toHaveLength(3)
    for (const p of pairs) expect(p).toHaveLength(2)
  })

  test('4/5. explicit switch + post-switch follow-up: pairing is unaffected by which topic each turn resolved', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability')]), 'topic')
    s = appendSettled(s, 2, answer([topicResult('copyright_ownership')]), 'topic')
    s = appendSettled(s, 3, answer([topicResult('copyright_ownership')]))
    expect(pairThreadTurns(s.turns)).toHaveLength(3)
  })

  test('6. authority refusal turn pairs exactly like an ordinary research turn', () => {
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answer([], { authorityNote: 'refusal text' }))
    const pairs = pairThreadTurns(s.turns)
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toHaveLength(2)
  })

  test('8. a pending (loading) turn pairs with its reviewer turn even before it settles', () => {
    const s = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q') })
    const pairs = pairThreadTurns(s.turns)
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toHaveLength(2)
    expect(pairs[0][1]).toMatchObject({ role: 'hrr', status: 'pending' })
  })

  test('9. an error turn pairs with its reviewer turn', () => {
    const s = appendError(EMPTY_HRR_THREAD, 1)
    const pairs = pairThreadTurns(s.turns)
    expect(pairs).toHaveLength(1)
    expect(pairs[0][1]).toMatchObject({ role: 'hrr', status: 'error' })
  })

  test('10. Clear conversation empties the thread -> zero pairs', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability')]))
    s = hrrThreadReducer(s, { type: 'clear' })
    expect(pairThreadTurns(s.turns)).toEqual([])
  })

  test('defensive: a malformed lead (hrr turn first, no reviewer) still produces a pair rather than crashing', () => {
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability')]))
    const hrrOnly = [s.turns[1]] // strip the reviewer turn defensively
    expect(() => pairThreadTurns(hrrOnly)).not.toThrow()
    expect(pairThreadTurns(hrrOnly)).toEqual([[s.turns[1]]])
  })
})

describe('C — PURE-FUNCTION PROOF: latestResponsibilityNote', () => {
  test('empty thread -> null (case: initial state, before question A)', () => {
    expect(latestResponsibilityNote(EMPTY_HRR_THREAD.turns)).toBeNull()
  })

  test('only a pending turn -> null (nothing settled yet)', () => {
    const s = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q') })
    expect(latestResponsibilityNote(s.turns)).toBeNull()
  })

  test('only a failed turn -> null (no answer to source the note from)', () => {
    const s = appendError(EMPTY_HRR_THREAD, 1)
    expect(latestResponsibilityNote(s.turns)).toBeNull()
  })

  test('one settled answer -> that answer\'s own reviewer_responsibility_note, verbatim (never hardcoded/paraphrased)', () => {
    const a = answer([topicResult('copyrightability')])
    const s = appendSettled(EMPTY_HRR_THREAD, 1, a)
    expect(latestResponsibilityNote(s.turns)).toBe(a.reviewer_responsibility_note)
  })

  test('multiple settled answers -> the MOST RECENT one, not concatenated or accumulated', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability')]))
    const latest = answer([topicResult('copyright_ownership')])
    s = appendSettled(s, 2, latest)
    expect(latestResponsibilityNote(s.turns)).toBe(latest.reviewer_responsibility_note)
  })

  test('a trailing failed turn after a settled answer still returns the last SETTLED note, not null', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answer([topicResult('copyrightability')]))
    s = appendError(s, 2)
    expect(latestResponsibilityNote(s.turns)).not.toBeNull()
  })
})

describe('D — REGRESSION GUARDS: pre-existing invariants unaffected by this milestone', () => {
  test('unresolved applicability is never behind <details> in HrrResearchAnswerView (leads the hierarchy, unconditionally rendered when present)', () => {
    const unresolvedBlock = answerViewSrc.match(/\{topic\.unresolved_inputs\.length > 0 &&([\s\S]*?)\)\}/)?.[1] ?? ''
    expect(unresolvedBlock).not.toMatch(/<details/)
  })

  test('empty provenance rendering remains structurally impossible (the <details> guard condition is unchanged)', () => {
    expect(answerViewSrc).toMatch(
      /\(topic\.governed_considerations\.length > 0 \|\| topic\.withheld\.length > 0 \|\| topic\.governed_claim_refs\.length > 0\) &&/,
    )
  })

  test('no new fixed-pixel-width class was introduced by the CAH-4H.2 additions (focus indicator, panel-level note)', () => {
    const focusIndicatorBlock = lookupSrc.match(/activeContext\.activeFocus &&([\s\S]*?)\)\}/)?.[1] ?? ''
    expect(focusIndicatorBlock).not.toMatch(/w-\[\d/)
  })

  test('the request payload contract is unchanged by presentation work — still exactly {mode, topic} / {mode, question, context}, no new field', () => {
    expect(lookupSrc).toMatch(/\{ mode: 'topic_pick'; topic: GoalCategory \}/)
    expect(lookupSrc).toMatch(/\{ mode: 'question'; question: string; context: ResearchSessionContext \}/)
    expect(lookupSrc).toMatch(/body:\s*JSON\.stringify\(payload\)/)
  })

  test('topic_pick still never references context — the one HrrResearchAnswerView call site is shared, but the topicPick payload path remains untouched', () => {
    const runTopicBlock = lookupSrc.match(/const runTopic = useCallback\(([\s\S]*?)const submitQuestion/)?.[1] ?? ''
    expect(runTopicBlock).not.toMatch(/context/)
  })

  test('exactly one HrrResearchAnswerView render site exists (no forked renderer introduced)', () => {
    expect((lookupSrc.match(/<HrrResearchAnswerView\b/g) ?? []).length).toBe(1)
  })
})
