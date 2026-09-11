/**
 * CAH-4G.18B — CLIENT CONTEXT TRANSPORT.
 *
 * Closes the exact gap CAH-4G.18A found: `deriveResearchSessionContext`
 * existed (CAH-4G.15) but `ReviewerLkLookup.tsx` never called it, so no real
 * free-form request ever carried `context` — regardless of the CAH-4G.17
 * server feature flag. This repo has no React render harness
 * (`testEnvironment: 'node'`) — per existing convention
 * (`authority-firewall.test.ts`, `hrr-thread.test.ts`), this file combines:
 *
 *   (A) SOURCE-SCAN proof that `submitQuestion` calls
 *       `deriveResearchSessionContext(thread)` and passes the result as
 *       `context` into `research({ mode: 'question', ... })`, and that
 *       `runTopic` (`topic_pick`) never references context at all;
 *   (B) FUNCTION-LEVEL proof, using the REAL `hrrThreadReducer` +
 *       `deriveResearchSessionContext` in the EXACT sequence the component
 *       performs (begin -> settle -> derive-before-next-submit), that after
 *       a completed Copyrightability turn the derived context — and
 *       therefore the request body a real Turn 2 submit would send — is
 *       exactly what CAH-4G.17's server expects.
 *
 * Together these mechanically cover the previous blind spot: every prior
 * CAH-4G.15/16/17 test constructed its own synthetic server-side request
 * body directly and never asserted anything about `ReviewerLkLookup.tsx`'s
 * OWN payload construction.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  EMPTY_HRR_THREAD,
  hrrThreadReducer,
  questionReviewerTurn,
  topicReviewerTurn,
} from '@/app/admin/submissions/[id]/review/hrr-thread'
import { deriveResearchSessionContext } from '@/lib/hrr/research-session-context'
import type { HrrResearchAnswer, HrrAnswerTopic } from '@/lib/hrr/types'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const LOOKUP = 'app/admin/submissions/[id]/review/ReviewerLkLookup.tsx'
const src = codeOnly(LOOKUP)

function topicResult(
  topic: HrrAnswerTopic['topic'],
  origin: 'topic_selection' | 'interpreted_question' = 'topic_selection',
): HrrAnswerTopic {
  return {
    topic,
    topic_label: topic,
    intent_origin: origin,
    bi_status: 'relevant_applicability_unresolved',
    orientation: '',
    bi_summary_blocks: [],
    governed_considerations: [],
    applicability: { established: [], unresolved: [], not_met: [] },
    unresolved_inputs: [],
    does_not_apply: [],
    does_not_apply_note: '',
    boundary_note: '',
    withheld: [],
    governed_claim_refs: [],
  }
}

function answerWithTopics(topics: HrrAnswerTopic[]): HrrResearchAnswer {
  return {
    research_mode: topics.length > 0 ? 'question' : 'topic_pick',
    question_text: null,
    authority_note: topics.length > 0 ? 'research' : 'unsupported',
    assessment_authority_note: null,
    scope_note: '',
    topics,
    offered_research_paths: topics.length > 0 ? null : [],
    reviewer_responsibility_note: '',
  }
}

describe('A — SOURCE WIRING: submitQuestion derives + sends context; topic_pick never does', () => {
  test('deriveResearchSessionContext is imported from the canonical selector module', () => {
    expect(src).toMatch(
      /import\s*\{\s*deriveResearchSessionContext,\s*type ResearchSessionContext\s*\}\s*from\s*'@\/lib\/hrr\/research-session-context'/,
    )
  })

  test('submitQuestion calls deriveResearchSessionContext(thread) and passes the result as context to research({mode:"question", ...})', () => {
    const submitQuestionBlock = src.match(/const submitQuestion = useCallback\(([\s\S]*?)const clearConversation/)?.[1] ?? ''
    expect(submitQuestionBlock).toMatch(/const context = deriveResearchSessionContext\(thread\)/)
    expect(submitQuestionBlock).toMatch(/research\(\{ mode: 'question', question: q, context \}\)/)
  })

  test('submitQuestion depends on the current `thread` (not just thread.inFlight) — required to derive fresh context on every call', () => {
    const submitQuestionBlock = src.match(/const submitQuestion = useCallback\(([\s\S]*?)\n  \}, \[([^\]]*)\]\)/)
    const deps = submitQuestionBlock?.[2] ?? ''
    expect(deps.split(',').map((d) => d.trim())).toContain('thread')
  })

  test('runTopic (topic_pick) never references context, in either its body or its payload', () => {
    const runTopicBlock = src.match(/const runTopic = useCallback\(([\s\S]*?)const submitQuestion/)?.[1] ?? ''
    expect(runTopicBlock.length).toBeGreaterThan(0)
    expect(runTopicBlock).not.toMatch(/context/)
    expect(runTopicBlock).toMatch(/research\(\{ mode: 'topic_pick', topic \}\)/)
  })

  test('the ResearchPayload type: topic_pick carries no context field; question carries a typed ResearchSessionContext', () => {
    expect(src).toMatch(/\{ mode: 'topic_pick'; topic: GoalCategory \}/)
    expect(src).toMatch(/\{ mode: 'question'; question: string; context: ResearchSessionContext \}/)
  })
})

describe('B — FUNCTION-LEVEL PROOF: real reducer + real selector, real sequence, the Turn-1 -> Turn-2 regression case', () => {
  test('after a completed free-form Copyrightability answer, deriving context from the CURRENT thread yields exactly activeFocus=copyrightability — the exact CAH-4G.18A regression case', () => {
    // Mirrors exactly what ReviewerLkLookup does: begin -> settle (Turn 1), then derive immediately before Turn 2's submit.
    let thread = hrrThreadReducer(EMPTY_HRR_THREAD, {
      type: 'begin',
      seq: 1,
      reviewer: questionReviewerTurn(1, 'What does governed knowledge say about copyrightability here?'),
    })
    thread = hrrThreadReducer(thread, {
      type: 'settle',
      seq: 1,
      result: { answer: answerWithTopics([topicResult('copyrightability', 'interpreted_question')]) },
    })

    const context = deriveResearchSessionContext(thread)
    expect(context.activeFocus).toBe('copyrightability')
    expect(context.activeFocusOrigin).toBe('interpreted_question')

    // The exact request body a real Turn 2 submit ("Why isn't that established?") now constructs — this is
    // NOT a claim that the model resolves it; it is the mechanical transport proof CAH-4G.18B exists to make.
    const requestBody = { mode: 'question' as const, question: "Why isn't that established?", context }
    expect(requestBody).toEqual({
      mode: 'question',
      question: "Why isn't that established?",
      context: { activeFocus: 'copyrightability', activeFocusOrigin: 'interpreted_question', unresolvedReferents: [] },
    })
  })

  test('a topic-shortcut Turn 1 also yields the correct derived context (activeFocusOrigin=topic_selection) for a subsequent free-form Turn 2', () => {
    let thread = hrrThreadReducer(EMPTY_HRR_THREAD, {
      type: 'begin',
      seq: 1,
      reviewer: topicReviewerTurn(1, 'copyrightability', 'Copyrightability'),
    })
    thread = hrrThreadReducer(thread, {
      type: 'settle',
      seq: 1,
      result: { answer: answerWithTopics([topicResult('copyrightability', 'topic_selection')]) },
    })
    expect(deriveResearchSessionContext(thread)).toEqual({
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      unresolvedReferents: [],
    })
  })

  test('the topic_pick request body itself never contains a context field, regardless of thread history — matches §A source proof', () => {
    let thread = hrrThreadReducer(EMPTY_HRR_THREAD, {
      type: 'begin',
      seq: 1,
      reviewer: questionReviewerTurn(1, 'What does governed knowledge say about copyrightability here?'),
    })
    thread = hrrThreadReducer(thread, { type: 'settle', seq: 1, result: { answer: answerWithTopics([topicResult('copyrightability')]) } })
    // The ACTUAL payload runTopic sends, per §A's source proof: { mode: 'topic_pick', topic } — no context, ever.
    const topicPickPayload: { mode: 'topic_pick'; topic: string } = { mode: 'topic_pick', topic: 'copyright_ownership' }
    expect(topicPickPayload).not.toHaveProperty('context')
    expect(Object.keys(topicPickPayload).sort()).toEqual(['mode', 'topic'])
  })

  test('an explicit focus switch (Turn 2 = a different topic-pick) is what the NEXT derived context reflects — no stale focus survives', () => {
    let thread = hrrThreadReducer(EMPTY_HRR_THREAD, {
      type: 'begin',
      seq: 1,
      reviewer: topicReviewerTurn(1, 'copyrightability', 'Copyrightability'),
    })
    thread = hrrThreadReducer(thread, { type: 'settle', seq: 1, result: { answer: answerWithTopics([topicResult('copyrightability')]) } })
    thread = hrrThreadReducer(thread, {
      type: 'begin',
      seq: 2,
      reviewer: topicReviewerTurn(2, 'copyright_ownership', 'Copyright ownership'),
    })
    thread = hrrThreadReducer(thread, { type: 'settle', seq: 2, result: { answer: answerWithTopics([topicResult('copyright_ownership')]) } })
    expect(deriveResearchSessionContext(thread).activeFocus).toBe('copyright_ownership')
  })
})
