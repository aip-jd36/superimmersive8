/**
 * CAH-4G.10 Slice A — VISIBLE HRR research thread.
 *
 * HRR becomes VISIBLY conversational (successive research turns stay on screen)
 * but NOT yet CONTEXTUALLY conversational (every free-form question is still
 * classified independently from its own text alone; no prior turn reaches the
 * classifier / retrieval / applicability / BI / composition / audit; no
 * `prior_context` in the request body).
 *
 * Two layers:
 *   1. `hrr-thread.ts` — a pure append-only reducer, unit-tested here directly
 *      (the repo has no React render harness: `testEnvironment: 'node'`).
 *   2. `ReviewerLkLookup.tsx` — source-scanned, the project convention for
 *      every reviewer-surface guarantee.
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
import type { HrrResearchAnswer } from '@/lib/hrr/types'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const LOOKUP = 'app/admin/submissions/[id]/review/ReviewerLkLookup.tsx'
const THREAD = 'app/admin/submissions/[id]/review/hrr-thread.ts'

// A minimal stand-in — the reducer never inspects the answer's shape.
const ANSWER = { research_mode: 'question', question_text: 'q', topics: [] } as unknown as HrrResearchAnswer
const ANSWER2 = { research_mode: 'question', question_text: 'q2', topics: [] } as unknown as HrrResearchAnswer

// ── 1. reducer — append-only turn model ───────────────────────────────────

describe('hrrThreadReducer — append-only, one-in-flight, stale-safe', () => {
  test('initial state has no turns and is idle', () => {
    expect(EMPTY_HRR_THREAD).toEqual({ turns: [], inFlight: 0 })
  })

  test('begin appends the reviewer turn + a pending HRR turn, tagged with the request seq', () => {
    const s = hrrThreadReducer(EMPTY_HRR_THREAD, {
      type: 'begin',
      seq: 1,
      reviewer: topicReviewerTurn(1, 'copyright_ownership', 'Copyright ownership'),
    })
    expect(s.inFlight).toBe(1)
    expect(s.turns).toHaveLength(2)
    expect(s.turns[0]).toMatchObject({ role: 'reviewer', entryMode: 'topic', topic: 'copyright_ownership', label: 'Copyright ownership', seq: 1 })
    expect(s.turns[1]).toMatchObject({ role: 'hrr', status: 'pending', seq: 1 })
  })

  test('a topic reviewer turn is a truthful action record — it carries topic + label, NEVER a fabricated question string', () => {
    const t = topicReviewerTurn(3, 'copyrightability', 'Copyrightability')
    expect(t).toMatchObject({ role: 'reviewer', entryMode: 'topic', topic: 'copyrightability', label: 'Copyrightability' })
    expect(t).not.toHaveProperty('question')
  })

  test('a free-form reviewer turn carries the verbatim reviewer text', () => {
    const t = questionReviewerTurn(2, 'What does governed knowledge say about copyrightability here?')
    expect(t).toMatchObject({ role: 'reviewer', entryMode: 'free_form', question: 'What does governed knowledge say about copyrightability here?' })
  })

  test('begin while a request is in flight is ignored (one request at a time — a hard reducer invariant)', () => {
    const s1 = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q1') })
    const s2 = hrrThreadReducer(s1, { type: 'begin', seq: 2, reviewer: questionReviewerTurn(2, 'q2') })
    expect(s2).toBe(s1)
    expect(s2.turns).toHaveLength(2)
  })

  test('settle with the current seq resolves the pending turn into an answer; inFlight clears', () => {
    let s: HrrThreadState = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q1') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 1, result: { answer: ANSWER } })
    expect(s.inFlight).toBe(0)
    expect(s.turns).toHaveLength(2)
    expect(s.turns[1]).toMatchObject({ role: 'hrr', status: 'answer', answer: ANSWER, seq: 1 })
  })

  test('settle with an error resolves the pending turn into a bounded error turn', () => {
    let s: HrrThreadState = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q1') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 1, result: { message: 'Living Knowledge research is unavailable right now. Try again.' } })
    expect(s.turns[1]).toMatchObject({ role: 'hrr', status: 'error', message: 'Living Knowledge research is unavailable right now. Try again.' })
  })

  test('a stale settle (seq != inFlight) can never resolve a turn', () => {
    const s1 = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 5, reviewer: questionReviewerTurn(5, 'q5') })
    const s2 = hrrThreadReducer(s1, { type: 'settle', seq: 4, result: { answer: ANSWER } })
    expect(s2).toBe(s1)
    expect(s2.turns[1]).toMatchObject({ status: 'pending' })
  })

  test('a settle arriving after Clear conversation is inert', () => {
    let s: HrrThreadState = hrrThreadReducer(EMPTY_HRR_THREAD, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q1') })
    s = hrrThreadReducer(s, { type: 'clear' })
    s = hrrThreadReducer(s, { type: 'settle', seq: 1, result: { answer: ANSWER } })
    expect(s).toEqual(EMPTY_HRR_THREAD)
  })

  test('a second research turn preserves the first question + answer (append-only)', () => {
    let s: HrrThreadState = EMPTY_HRR_THREAD
    s = hrrThreadReducer(s, { type: 'begin', seq: 1, reviewer: topicReviewerTurn(1, 'copyright_ownership', 'Copyright ownership') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 1, result: { answer: ANSWER } })
    s = hrrThreadReducer(s, { type: 'begin', seq: 2, reviewer: questionReviewerTurn(2, 'What about copyrightability?') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 2, result: { answer: ANSWER2 } })
    expect(s.turns.map((t) => [t.role, 'status' in t ? t.status : t.entryMode])).toEqual([
      ['reviewer', 'topic'],
      ['hrr', 'answer'],
      ['reviewer', 'free_form'],
      ['hrr', 'answer'],
    ])
    expect(s.turns[1]).toMatchObject({ status: 'answer', answer: ANSWER })
    expect(s.turns[3]).toMatchObject({ status: 'answer', answer: ANSWER2 })
  })

  test('a third turn preserves both earlier turns; a later error never erases earlier successful turns', () => {
    let s: HrrThreadState = EMPTY_HRR_THREAD
    for (const [seq, q] of [[1, 'q1'], [2, 'q2']] as const) {
      s = hrrThreadReducer(s, { type: 'begin', seq, reviewer: questionReviewerTurn(seq, q) })
      s = hrrThreadReducer(s, { type: 'settle', seq, result: { answer: ANSWER } })
    }
    s = hrrThreadReducer(s, { type: 'begin', seq: 3, reviewer: questionReviewerTurn(3, 'q3') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 3, result: { message: 'network error' } })
    expect(s.turns).toHaveLength(6)
    expect(s.turns[1]).toMatchObject({ status: 'answer' })
    expect(s.turns[3]).toMatchObject({ status: 'answer' })
    expect(s.turns[5]).toMatchObject({ status: 'error', message: 'network error' })
  })

  test('the pending turn is visible immediately and does not delete history', () => {
    let s: HrrThreadState = EMPTY_HRR_THREAD
    s = hrrThreadReducer(s, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q1') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 1, result: { answer: ANSWER } })
    s = hrrThreadReducer(s, { type: 'begin', seq: 2, reviewer: questionReviewerTurn(2, 'q2') })
    expect(s.turns).toHaveLength(4)
    expect(s.turns[1]).toMatchObject({ status: 'answer' })
    expect(s.turns[3]).toMatchObject({ status: 'pending' })
  })

  test('clear returns to the initial state', () => {
    let s: HrrThreadState = EMPTY_HRR_THREAD
    s = hrrThreadReducer(s, { type: 'begin', seq: 1, reviewer: questionReviewerTurn(1, 'q1') })
    s = hrrThreadReducer(s, { type: 'settle', seq: 1, result: { answer: ANSWER } })
    s = hrrThreadReducer(s, { type: 'clear' })
    expect(s).toEqual(EMPTY_HRR_THREAD)
  })
})

// ── 2. hrr-thread.ts — presentation / session state only ──────────────────

describe('hrr-thread.ts is presentation state only', () => {
  const src = codeOnly(THREAD)
  const imports = (read(THREAD).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

  test('no persistence / storage / network / audit anywhere', () => {
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|IndexedDB|document\.cookie/)
    expect(src).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(|access_kind|recordReviewerLkAccess|logPilotEvent/)
  })

  test('imports only types — no classifier / retrieval / applicability / BI / composition / react', () => {
    expect(imports).not.toMatch(/interpret-research-intent|hrr-authority-gate|select-reviewer-claims|retrieve/)
    expect(imports).not.toMatch(/bounded-interpretation|consultative-answer-plan|project-hrr-research-answer|run-hrr-research/)
    expect(imports).not.toMatch(/@anthropic-ai\/sdk|from ['"]react['"]/)
  })

  test('no prior_context / transcript / messages concept exists in the turn model', () => {
    expect(src).not.toMatch(/prior_context|priorContext|transcript|messages\s*:|conversation_id|prior_answer|priorAnswer|prior_topic|priorTopic/)
  })
})

// ── 3. ReviewerLkLookup.tsx — the visible thread ──────────────────────────

describe('ReviewerLkLookup — append-only visible thread', () => {
  const src = codeOnly(LOOKUP)

  test('the single-answer replace model is gone: no `setState({ kind: \'answer\' ... })`', () => {
    expect(src).not.toMatch(/setState\(\s*\{\s*kind:\s*'answer'/)
    expect(src).not.toMatch(/kind:\s*'idle'\s*\}\s*\)/)
  })

  test('the thread is a useReducer over the append-only hrrThreadReducer', () => {
    expect(src).toMatch(/useReducer\(\s*hrrThreadReducer\s*,\s*EMPTY_HRR_THREAD\s*\)/)
    expect(src).toMatch(/from '\.\/hrr-thread'/)
  })

  test('every turn renders as a list item; the answer turn uses the ONE canonical renderer', () => {
    expect(src).toMatch(/thread\.turns\.map\(/)
    expect(src).toMatch(/<HrrResearchAnswerView\s+answer=\{turn\.answer\}/)
    // no forked renderer
    expect(src).not.toMatch(/TopicResearchResultView|QuestionResearchResultView|HistoricalAnswerView|ConversationalAnswerView/)
    // exactly one HrrResearchAnswerView render site (inside the turn switch)
    expect((src.match(/<HrrResearchAnswerView\b/g) ?? []).length).toBe(1)
  })

  test('a topic pick is recorded truthfully — "Research:" + the label, never a fabricated typed question', () => {
    expect(src).toMatch(/topicReviewerTurn\(mine,\s*payload\.topic,\s*reviewerTopicLabel\(payload\.topic\)\)/)
    expect(src).toMatch(/'Research:'/)
    // the component never synthesises a question sentence from a topic
    expect(src).not.toMatch(/What does governed knowledge say about/)
    expect(src).not.toMatch(/`[^`]*\$\{[^}]*topic[^}]*\}[^`]*\?`/)
  })

  test('a free-form question is recorded verbatim as a reviewer turn', () => {
    expect(src).toMatch(/questionReviewerTurn\(mine,\s*payload\.question\)/)
  })

  // slice `src` between two markers so a lazy regex can't run past a callback
  const slice = (from: string, to: string) => {
    const i = src.indexOf(from)
    const j = src.indexOf(to, i + from.length)
    return i === -1 ? '' : src.slice(i, j === -1 ? undefined : j)
  }

  test('Clear conversation clears the client thread only — no server call, no audit, no assessment mutation', () => {
    expect(src).toMatch(/Clear conversation/)
    expect(src).toMatch(/dispatch\(\{\s*type:\s*'clear'\s*\}\)/)
    const clearFn = slice('const clearConversation = useCallback', 'return (')
    expect(clearFn).not.toMatch(/fetch\(|type: 'begin'|\.insert\s*\(|\.rpc\s*\(/)
    expect(clearFn).toMatch(/seqRef\.current\+\+/)
  })

  test('the composer clears after a successful submit; a topic click never populates the composer', () => {
    expect(slice('const submitQuestion = useCallback', 'const clearConversation')).toMatch(/setQuestion\(''\)/)
    expect(slice('const runTopic = useCallback', 'const submitQuestion')).not.toMatch(/setQuestion/)
  })

  test('one research request in flight at a time — both entry paths gate on thread.inFlight', () => {
    expect(slice('const runTopic = useCallback', 'const submitQuestion')).toMatch(/thread\.inFlight === 0/)
    expect(slice('const submitQuestion = useCallback', 'const clearConversation')).toMatch(/thread\.inFlight !== 0/)
    expect(src).toMatch(/disabled=\{loading\}/)      // chips
    expect(src).toMatch(/disabled=\{loading \|\|/)   // Ask button
  })

  test('stale-response protection: a settle only dispatches when its request is still current', () => {
    expect(src).toMatch(/const mine = \+\+seqRef\.current/)
    expect(src).toMatch(/if \(mine !== seqRef\.current\) return/)
    // and the reducer double-checks (settle ignores a non-current seq)
    expect(codeOnly(THREAD)).toMatch(/if \(action\.seq !== state\.inFlight\) return state/)
  })

  test('exactly one fetch, still inside the research callback (no mount effect)', () => {
    expect((src.match(/fetch\(/g) ?? []).length).toBe(1)
    expect(src).not.toMatch(/useEffect\b/)
    expect(src).toMatch(/const research = useCallback\(\s*async \(payload[\s\S]*?fetch\(/)
  })

  test('the POST body is ONLY { mode, topic } / { mode, question } — no prior_context / transcript / messages / history / prior answer', () => {
    // body is the untouched payload
    expect(src).toMatch(/body:\s*JSON\.stringify\(payload\)/)
    expect(src).not.toMatch(/prior_context|priorContext|prior_answer|priorAnswer|prior_topic|priorTopic|previous_answer|messages:\s*\[|history:|transcript|conversation_id|conversationId/)
    // the payload type carries only the two shapes
    expect(src).toMatch(/\{ mode: 'topic_pick'; topic: GoalCategory \}/)
    expect(src).toMatch(/\{ mode: 'question'; question: string \}/)
  })

  test('no browser storage / URL state / cookie', () => {
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|IndexedDB|document\.cookie|history\.pushState|URLSearchParams|useSearchParams|useRouter/)
  })

  test('the honest disclaimers survive; neutral styling only', () => {
    expect(src).toMatch(/not assessment evidence/i)
    expect(src).toMatch(/[Nn]ot legal advice/)
    expect(src).toMatch(/not a commercial-clearance determination/i)
    expect(src).not.toMatch(/#(dc2626|ef4444|16a34a|22c55e|15803d|dcfce7|fee2e2)/i)
    expect(src).not.toMatch(/PASS|FAIL|✓|✗|✅|❌/)
    expect(src).not.toMatch(/crc_eligible|crc_publication_scope/)
  })

  test('no auto-scroll machinery in Slice A (no scrollIntoView / scroll refs / effects)', () => {
    expect(src).not.toMatch(/scrollIntoView|scrollTo\(|scrollAnchorRef|useEffect/)
  })
})
