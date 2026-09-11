/**
 * CAH-4G.15 — bounded HRR session context: SELECTOR + PREFIX-BUILDER
 * contract tests. Pure-function tests only; nothing here exercises the live
 * route, classifier, or any production code path — `research-session-context.ts`
 * is not imported by any of them (see `research-session-context-boundary.test.ts`).
 */

import {
  buildResearchSessionContextPrefix,
  deriveResearchSessionContext,
  EMPTY_RESEARCH_SESSION_CONTEXT,
  HRR_MAX_REFERENT_IDENTIFIER_LENGTH,
  HRR_MAX_UNRESOLVED_REFERENTS,
  type ResearchSessionContext,
} from '@/lib/hrr/research-session-context'
import {
  EMPTY_HRR_THREAD,
  hrrThreadReducer,
  questionReviewerTurn,
  topicReviewerTurn,
  type HrrThreadState,
} from '@/app/admin/submissions/[id]/review/hrr-thread'
import type { HrrResearchAnswer, HrrAnswerTopic, HrrUnresolvedInput } from '@/lib/hrr/types'

// ── fixture builders — structured only, never prose-derived ────────────────

function unresolvedInput(identifier: string): HrrUnresolvedInput {
  return { kind: 'applicability_requirement', identifier, requirement: null, from_claim_ids: [], note: 'fixed template' }
}

function topicResult(
  topic: HrrAnswerTopic['topic'],
  opts: { origin?: 'topic_selection' | 'interpreted_question'; unresolved?: string[] } = {},
): HrrAnswerTopic {
  return {
    topic,
    topic_label: topic,
    intent_origin: opts.origin ?? 'topic_selection',
    bi_status: 'relevant_applicability_unresolved',
    orientation: 'PROSE — must never be read by the selector',
    bi_summary_blocks: ['PROSE — must never be read by the selector'],
    governed_considerations: [],
    applicability: { established: [], unresolved: [], not_met: [] },
    unresolved_inputs: (opts.unresolved ?? []).map(unresolvedInput),
    does_not_apply: [],
    does_not_apply_note: '',
    boundary_note: 'PROSE — must never be read by the selector',
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
    reviewer_responsibility_note: 'PROSE — must never be read by the selector',
  }
}

/** Appends a settled turn (topic-pick or free-form) with the given answer, via the real reducer. */
function appendSettled(state: HrrThreadState, seq: number, answer: HrrResearchAnswer): HrrThreadState {
  const reviewer =
    answer.topics.length === 1 && answer.topics[0].intent_origin === 'topic_selection'
      ? topicReviewerTurn(seq, answer.topics[0].topic, answer.topics[0].topic_label)
      : questionReviewerTurn(seq, 'reviewer question text — irrelevant to the selector')
  let s = hrrThreadReducer(state, { type: 'begin', seq, reviewer })
  s = hrrThreadReducer(s, { type: 'settle', seq, result: { answer } })
  return s
}

function appendError(state: HrrThreadState, seq: number): HrrThreadState {
  let s = hrrThreadReducer(state, { type: 'begin', seq, reviewer: questionReviewerTurn(seq, 'q') })
  s = hrrThreadReducer(s, { type: 'settle', seq, result: { message: 'unavailable' } })
  return s
}

// ── 1. selector — the 13 pre-registered lifecycle cases (CAH-4G.15 Phase 5) ─

describe('deriveResearchSessionContext — pre-registered lifecycle cases', () => {
  test('1. empty thread -> EMPTY', () => {
    expect(deriveResearchSessionContext(EMPTY_HRR_THREAD)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('2. first topic-pick -> that topic becomes activeFocus, origin topic_selection', () => {
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability', { origin: 'topic_selection' })]))
    expect(deriveResearchSessionContext(s)).toEqual({
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      unresolvedReferents: [],
    })
  })

  test('3. first free-form resolved topic -> that topic becomes activeFocus, origin interpreted_question', () => {
    const s = appendSettled(
      EMPTY_HRR_THREAD,
      1,
      answerWithTopics([topicResult('copyright_ownership', { origin: 'interpreted_question', unresolved: ['jurisdiction'] })]),
    )
    expect(deriveResearchSessionContext(s)).toEqual({
      activeFocus: 'copyright_ownership',
      activeFocusOrigin: 'interpreted_question',
      unresolvedReferents: ['jurisdiction'],
    })
  })

  test('4. same-focus turn (repeat) -> the most recent single-topic turn wins, referents refresh', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability', { unresolved: ['jurisdiction'] })]))
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyrightability', { unresolved: ['human_contribution_description'] })]))
    expect(deriveResearchSessionContext(s)).toEqual({
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      unresolvedReferents: ['human_contribution_description'],
    })
  })

  test('5. explicit topic switch -> the newly-named topic wins immediately; the old focus does not leak', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability', { unresolved: ['jurisdiction'] })]))
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyright_ownership')]))
    const ctx = deriveResearchSessionContext(s)
    expect(ctx.activeFocus).toBe('copyright_ownership')
    expect(ctx.unresolvedReferents).not.toContain('jurisdiction')
  })

  test('6. a failed turn is transparent — the selector looks past it to the last resolved turn', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('likeness')]))
    s = appendError(s, 2)
    expect(deriveResearchSessionContext(s).activeFocus).toBe('likeness')
  })

  test('7. an authority-only turn (topics: []) is transparent — old focus is preserved, not erased', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    s = appendSettled(s, 2, answerWithTopics([])) // "Is that enough evidence?" — declined, no research clause survived
    expect(deriveResearchSessionContext(s).activeFocus).toBe('copyrightability')
  })

  test('8. a pending turn is transparent — the selector falls back to the last settled turn', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('third_party_source_rights')]))
    s = hrrThreadReducer(s, { type: 'begin', seq: 2, reviewer: questionReviewerTurn(2, 'q2') }) // still pending, never settled
    expect(deriveResearchSessionContext(s).activeFocus).toBe('third_party_source_rights')
  })

  test('9. a stale settle never reaches the thread at all — the reducer already discards it (nothing new to test here)', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('commercial_use')]))
    s = hrrThreadReducer(s, { type: 'begin', seq: 2, reviewer: questionReviewerTurn(2, 'q2') })
    const beforeStaleAttempt = deriveResearchSessionContext(s)
    // A stale settle (wrong seq) must not mutate state, and therefore not affect the derived context.
    const afterStaleAttempt = hrrThreadReducer(s, {
      type: 'settle',
      seq: 999,
      result: { answer: answerWithTopics([topicResult('likeness')]) },
    })
    expect(afterStaleAttempt).toBe(s) // reducer identity-preserves on a stale settle
    expect(deriveResearchSessionContext(afterStaleAttempt)).toEqual(beforeStaleAttempt)
  })

  test('10. clear conversation -> EMPTY, zero new code path (falls through to case 1)', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    s = hrrThreadReducer(s, { type: 'clear' })
    expect(deriveResearchSessionContext(s)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('11. multi-topic/ambiguous result -> activeFocus RESETS to null; scanning STOPS (older focus does not resurface)', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyright_ownership'), topicResult('likeness')]))
    expect(deriveResearchSessionContext(s)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('12. no resolved topic anywhere in the thread -> EMPTY', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([]))
    s = appendError(s, 2)
    expect(deriveResearchSessionContext(s)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('13. an unrecognized/malformed topic value is filtered out, not propagated as activeFocus', () => {
    const malformed = answerWithTopics([topicResult('unknown' as HrrAnswerTopic['topic'])])
    const s = appendSettled(EMPTY_HRR_THREAD, 1, malformed)
    expect(deriveResearchSessionContext(s)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })
})

// ── 1b. correction contract (CAH-4G.15 Phase 14 — unvalidated hypothesis) ──
//
// `ADR-003` §8's hypothesis: a correction ("No, I meant ownership") requires
// NO special-cased mechanism — it is handled by the SAME context-aware
// classification path as any ordinary follow-up, and if the classifier
// resolves an explicit new topic, that is indistinguishable in effect from
// case 5 (explicit focus switch). These tests prove exactly that: a
// "correction-shaped" scenario is not given any special code path — it
// passes through the identical selector logic already exercised above.
// This does NOT validate the hypothesis behaviorally (that would require
// the live classifier, out of scope here) — it proves the DESIGN COMMITMENT
// that no correction-specific selector code exists to diverge.

describe('correction contract — no special-casing, same selector logic as an explicit switch', () => {
  test('"No, I meant ownership" (simulated as a resolved Copyright ownership turn) supersedes Copyrightability exactly like case 5 — same code path, no correction-specific branch', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability', { unresolved: ['jurisdiction'] })]))
    // Simulates what a future context-aware classifier resolving "No, I meant ownership" would produce: a normal single-topic answer.
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyright_ownership', { origin: 'interpreted_question' })]))
    const ctx = deriveResearchSessionContext(s)
    expect(ctx.activeFocus).toBe('copyright_ownership')
    expect(ctx.unresolvedReferents).not.toContain('jurisdiction') // old focus's referents do not leak
  })

  test('"Actually, I meant likeness" (simulated) supersedes an intervening focus exactly the same way, regardless of how many prior turns existed', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyright_ownership')]))
    s = appendSettled(s, 3, answerWithTopics([topicResult('likeness', { origin: 'interpreted_question' })]))
    expect(deriveResearchSessionContext(s).activeFocus).toBe('likeness')
  })

  test('an ambiguous correction that cannot resolve safely fails closed — identical to case 11 (multi-topic), no guess, no partial resolution', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    // Simulates an ambiguous correction the classifier itself could not cleanly resolve to one topic.
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyright_ownership'), topicResult('copyrightability')]))
    expect(deriveResearchSessionContext(s)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('a correction that resolves to no topic at all (classifier could not map it) leaves the prior focus intact — transparent, same as case 7', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    s = appendSettled(s, 2, answerWithTopics([])) // unsupported — offered research paths, no topic resolved
    expect(deriveResearchSessionContext(s).activeFocus).toBe('copyrightability')
  })

  test('correction never mutates a previously rendered turn — the thread stays append-only (unchanged hrrThreadReducer contract)', () => {
    let s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability')]))
    const beforeCorrection = s.turns.length
    s = appendSettled(s, 2, answerWithTopics([topicResult('copyright_ownership')]))
    expect(s.turns.length).toBe(beforeCorrection + 2) // strictly appended (reviewer + hrr), turn 1 untouched
    expect(s.turns[0]).toMatchObject({ role: 'reviewer', seq: 1 })
    expect(s.turns[1]).toMatchObject({ role: 'hrr', seq: 1, status: 'answer' })
  })
})

// ── 2. no-prior-answer-prose dependency proof (CAH-4G.15 Phase 4) ──────────

describe('deriveResearchSessionContext — no prior-answer-prose dependency', () => {
  test('a turn whose only distinguishing content is prose (orientation/boundary_note/summary blocks) still derives correctly from structured fields alone', () => {
    const topic = topicResult('copyrightability', { unresolved: ['jurisdiction'] })
    // Sanity: the fixture DOES carry prose fields (as a real answer would).
    expect(topic.orientation).toMatch(/PROSE/)
    expect(topic.boundary_note).toMatch(/PROSE/)
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topic]))
    const ctx = deriveResearchSessionContext(s)
    // The derived context contains NONE of the prose text anywhere.
    const serialized = JSON.stringify(ctx)
    expect(serialized).not.toMatch(/PROSE/)
    expect(ctx).toEqual({ activeFocus: 'copyrightability', activeFocusOrigin: 'topic_selection', unresolvedReferents: ['jurisdiction'] })
  })

  test('a free-form reviewer question\'s raw text never appears in the derived context', () => {
    const s = appendSettled(
      EMPTY_HRR_THREAD,
      1,
      answerWithTopics([topicResult('copyright_ownership', { origin: 'interpreted_question' })]),
    )
    const serialized = JSON.stringify(deriveResearchSessionContext(s))
    expect(serialized).not.toMatch(/reviewer question text/)
  })
})

// ── 3. O(1) bound proofs (CAH-4G.15 Phase 10) ──────────────────────────────

describe('deriveResearchSessionContext — O(1) bound (not merely claimed)', () => {
  test('unresolvedReferents is capped at HRR_MAX_UNRESOLVED_REFERENTS regardless of how many the answer carried', () => {
    const many = Array.from({ length: HRR_MAX_UNRESOLVED_REFERENTS + 10 }, (_, i) => `requirement_${i}`)
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability', { unresolved: many })]))
    expect(deriveResearchSessionContext(s).unresolvedReferents).toHaveLength(HRR_MAX_UNRESOLVED_REFERENTS)
  })

  test('100 visible turns cannot produce more than the fixed context shape — exactly the 3 declared fields, always', () => {
    let s = EMPTY_HRR_THREAD
    for (let i = 1; i <= 100; i++) {
      const topic = i % 2 === 0 ? 'copyrightability' : 'copyright_ownership'
      s = appendSettled(s, i, answerWithTopics([topicResult(topic, { unresolved: [`req_${i}`] })]))
    }
    const ctx = deriveResearchSessionContext(s)
    expect(Object.keys(ctx).sort()).toEqual(['activeFocus', 'activeFocusOrigin', 'unresolvedReferents'])
    expect(ctx.unresolvedReferents.length).toBeLessThanOrEqual(HRR_MAX_UNRESOLVED_REFERENTS)
  })

  test('an oversized referent identifier is dropped, not truncated-and-kept', () => {
    const tooLong = 'x'.repeat(HRR_MAX_REFERENT_IDENTIFIER_LENGTH + 1)
    const s = appendSettled(EMPTY_HRR_THREAD, 1, answerWithTopics([topicResult('copyrightability', { unresolved: [tooLong, 'jurisdiction'] })]))
    expect(deriveResearchSessionContext(s).unresolvedReferents).toEqual(['jurisdiction'])
  })
})

// ── 4. explicit-intent precedence, topic-pick side (CAH-4G.15 Phase 6) ─────

describe('explicit-intent precedence — structural proof for the topic-pick path', () => {
  test('topicSelectionGateResult has no context parameter — it structurally cannot consume ResearchSessionContext', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { topicSelectionGateResult } = require('@/lib/hrr/run-hrr-research')
    expect(topicSelectionGateResult.length).toBe(1) // arity 1: (topic) only
    const a = topicSelectionGateResult('copyrightability')
    const b = topicSelectionGateResult('copyrightability')
    expect(a).toEqual(b) // identical output regardless of any "would-be" inherited context
  })
})

// ── 5. prefix builder (CAH-4G.15 Phase 12 — no-transcript proof, bounded) ──

describe('buildResearchSessionContextPrefix — bounded, fixed-template, no prose', () => {
  test('null context -> null prefix (byte-identical to today\'s unmodified classifier input)', () => {
    expect(buildResearchSessionContextPrefix(EMPTY_RESEARCH_SESSION_CONTEXT)).toBeNull()
  })

  test('a focus-only context renders a fixed-template line naming only the topic', () => {
    const ctx: ResearchSessionContext = { activeFocus: 'copyrightability', activeFocusOrigin: 'topic_selection', unresolvedReferents: [] }
    expect(buildResearchSessionContextPrefix(ctx)).toBe('[Context: Active Research Focus = copyrightability.]')
  })

  test('a focus + referents context renders both, still fixed-template', () => {
    const ctx: ResearchSessionContext = {
      activeFocus: 'copyright_ownership',
      activeFocusOrigin: 'interpreted_question',
      unresolvedReferents: ['jurisdiction', 'human_contribution_description'],
    }
    expect(buildResearchSessionContextPrefix(ctx)).toBe(
      '[Context: Active Research Focus = copyright_ownership. Unresolved: jurisdiction, human_contribution_description.]',
    )
  })

  test('the prefix length is mechanically bounded regardless of input — never grows with session length', () => {
    const maxTopicLen = Math.max(...['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights'].map((t) => t.length))
    const worstCase: ResearchSessionContext = {
      activeFocus: 'third_party_source_rights',
      activeFocusOrigin: 'interpreted_question',
      unresolvedReferents: Array.from({ length: HRR_MAX_UNRESOLVED_REFERENTS }, () => 'x'.repeat(HRR_MAX_REFERENT_IDENTIFIER_LENGTH)),
    }
    const prefix = buildResearchSessionContextPrefix(worstCase)!
    const hardBound =
      80 + maxTopicLen + HRR_MAX_UNRESOLVED_REFERENTS * (HRR_MAX_REFERENT_IDENTIFIER_LENGTH + 2) // fixed template overhead + worst-case fields
    expect(prefix.length).toBeLessThanOrEqual(hardBound)
  })

  test('the prefix never contains any of the words used in this fixture\'s prose fields', () => {
    const ctx: ResearchSessionContext = { activeFocus: 'copyrightability', activeFocusOrigin: 'topic_selection', unresolvedReferents: ['jurisdiction'] }
    expect(buildResearchSessionContextPrefix(ctx)).not.toMatch(/PROSE|orientation|boundary_note|summary/i)
  })
})
