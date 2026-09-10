/**
 * CAH-4G.6 — POST /api/admin/submissions/[id]/reviewer-lk/research
 *
 * The ONE UI-reachable HRR entry point. Both modes converge on
 * `runAuditedHrrResearch` (real, here) which reuses the real deterministic
 * pipeline + the mocked `recordReviewerLkAccess`. Auth + submission read + the
 * classifier adapter are mocked.
 *
 * Proves:
 *   - unauthenticated / non-admin → 401/403, no audit, no content;
 *   - malformed / over-long / transcript-shaped body → 400, no audit;
 *   - topic_pick → 0 classifier calls, audited answer;
 *   - question → 1 classifier call, audited answer;
 *   - audit-before-content: audit write completes before the answer is returned;
 *   - audit throws → 503, fixed message, ZERO governed content;
 *   - authority-only ("should I approve?") → valid bounded answer, NO audit;
 *   - the client cannot supply actor identity / authority facts.
 */

const checkReviewerContextAccess = jest.fn()
const getSubmissionFactsForReviewerLk = jest.fn()
const recordReviewerLkAccess = jest.fn()
const classifier = jest.fn()
const createAnthropicResearchIntentInterpreter = jest.fn(() => classifier)

jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))
jest.mock('@/lib/reviewer-lk/repository', () => ({ getSubmissionFactsForReviewerLk, recordReviewerLkAccess }))
jest.mock('@/lib/reviewer-lk/interpret-research-intent.anthropic', () => ({ createAnthropicResearchIntentInterpreter }))

import { POST } from '@/app/api/admin/submissions/[id]/reviewer-lk/research/route'
import { HRR_QUESTION_MAX_LENGTH } from '@/lib/reviewer-lk/types'
import type { PermittedResearchIntent } from '@/lib/reviewer-lk/types'

const ctx = { params: { id: 'sub-1' } }

function req(body: unknown, opts: { badJson?: boolean } = {}) {
  return {
    json: async () => {
      if (opts.badJson) throw new SyntaxError('bad json')
      return body
    },
  } as any
}

const permitted = (o: Partial<PermittedResearchIntent> = {}): PermittedResearchIntent => ({
  research_intents: [],
  assessment_decision_requested: false,
  unresolved_ambiguity: [],
  ...o,
})

beforeEach(() => {
  jest.clearAllMocks()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'reviewer-9' })
  getSubmissionFactsForReviewerLk.mockResolvedValue({ tools_used: null, territory_preferences: 'United States' })
  recordReviewerLkAccess.mockResolvedValue(undefined)
  classifier.mockResolvedValue(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }))
})

// ── auth ──────────────────────────────────────────────────────────────────

test('unauthenticated → 401; nothing read, nothing audited', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
  const res = await POST(req({ mode: 'topic_pick', topic: 'copyright_ownership' }), ctx)
  expect(res.status).toBe(401)
  expect(getSubmissionFactsForReviewerLk).not.toHaveBeenCalled()
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('non-admin → 403; nothing audited', async () => {
  checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 403 })
  const res = await POST(req({ mode: 'question', question: 'what about copyright ownership?' }), ctx)
  expect(res.status).toBe(403)
  expect(classifier).not.toHaveBeenCalled()
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

// ── input contract ───────────────────────────────────────────────────────

test('malformed JSON → 400, no audit', async () => {
  const res = await POST(req(null, { badJson: true }), ctx)
  expect(res.status).toBe(400)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test.each([
  ['non-object body', 'just a string'],
  ['array body', ['a']],
  ['unknown mode', { mode: 'chat', question: 'hi' }],
  ['topic_pick with bogus topic', { mode: 'topic_pick', topic: 'not_a_topic' }],
  ['topic_pick with the "unknown" sentinel', { mode: 'topic_pick', topic: 'unknown' }],
  ['question missing', { mode: 'question' }],
  ['question not a string', { mode: 'question', question: 42 }],
  ['question blank after trim', { mode: 'question', question: '   ' }],
  ['messages[] transcript shape', { mode: 'question', question: 'hi', messages: [{ role: 'user', content: 'x' }] }],
  ['history shape', { mode: 'question', question: 'hi', history: ['prev answer'] }],
  ['session_id shape', { mode: 'question', question: 'hi', session_id: 'abc' }],
])('%s → 400, no classifier, no audit', async (_label, body) => {
  const res = await POST(req(body), ctx)
  expect(res.status).toBe(400)
  expect(classifier).not.toHaveBeenCalled()
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

test('over-long question → 400 (never truncated / never classified)', async () => {
  const res = await POST(req({ mode: 'question', question: 'a'.repeat(HRR_QUESTION_MAX_LENGTH + 1) }), ctx)
  expect(res.status).toBe(400)
  expect(classifier).not.toHaveBeenCalled()
})

// ── topic path — 0 model calls ───────────────────────────────────────────

test('topic_pick → 0 classifier calls, audited answer through the shared contract', async () => {
  const res = await POST(req({ mode: 'topic_pick', topic: 'copyright_ownership' }), ctx)
  expect(res.status).toBe(200)
  expect(createAnthropicResearchIntentInterpreter).not.toHaveBeenCalled()
  expect(classifier).not.toHaveBeenCalled()
  expect(recordReviewerLkAccess).toHaveBeenCalledTimes(1)
  const answer = await res.json()
  expect(answer.research_mode).toBe('topic_pick')
  expect(answer.question_text).toBeNull()
  expect(answer.topics[0].topic).toBe('copyright_ownership')
})

// ── free-form path — 1 model call ────────────────────────────────────────

test('question → exactly 1 classifier call, audited answer, verbatim question echo', async () => {
  const res = await POST(req({ mode: 'question', question: '  what does governed knowledge say about copyright ownership?  ' }), ctx)
  expect(res.status).toBe(200)
  expect(classifier).toHaveBeenCalledTimes(1)
  // trimmed before classification
  expect(classifier).toHaveBeenCalledWith('what does governed knowledge say about copyright ownership?')
  expect(recordReviewerLkAccess).toHaveBeenCalledTimes(1)
  const answer = await res.json()
  expect(answer.research_mode).toBe('question')
  expect(answer.question_text).toBe('what does governed knowledge say about copyright ownership?')
  expect(answer.topics[0].intent_origin).toBe('interpreted_question')
})

// ── audit-before-content ─────────────────────────────────────────────────

test('ORDERING: submission read → audit write → 200 (audit before the answer body)', async () => {
  const order: string[] = []
  getSubmissionFactsForReviewerLk.mockImplementation(async () => { order.push('read'); return { tools_used: null, territory_preferences: 'United States' } })
  recordReviewerLkAccess.mockImplementation(async () => { order.push('audit') })
  const res = await POST(req({ mode: 'topic_pick', topic: 'copyright_ownership' }), ctx)
  order.push('respond')
  expect(res.status).toBe(200)
  expect(order).toEqual(['read', 'audit', 'respond'])
})

test('AUDIT FAILS → 503, fixed message, ZERO governed content', async () => {
  recordReviewerLkAccess.mockRejectedValue(new Error('insert failed'))
  const res = await POST(req({ mode: 'topic_pick', topic: 'copyright_ownership' }), ctx)
  expect(res.status).toBe(503)
  const body = await res.json()
  expect(body).toEqual({ error: 'Living Knowledge research unavailable — access could not be recorded.' })
  expect(JSON.stringify(body)).not.toMatch(/CLAIM-|statement|orientation|topics|governed/)
})

test('the audit call carries actor + submission ONLY — actor is server-resolved, never from the body', async () => {
  await POST(req({ mode: 'topic_pick', topic: 'commercial_use', actorUserId: 'attacker', actor_user_id: 'attacker' }), ctx)
  expect(recordReviewerLkAccess).toHaveBeenCalledWith({ actorUserId: 'reviewer-9', submissionId: 'sub-1' })
  expect(Object.keys(recordReviewerLkAccess.mock.calls[0][0]).sort()).toEqual(['actorUserId', 'submissionId'])
})

// ── no submission ────────────────────────────────────────────────────────

test('no such submission → 404, no audit', async () => {
  getSubmissionFactsForReviewerLk.mockResolvedValue(null)
  const res = await POST(req({ mode: 'topic_pick', topic: 'copyright_ownership' }), ctx)
  expect(res.status).toBe(404)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
})

// ── authority-only / unsupported → no audit event ────────────────────────

test('"should I approve this?" → 200 bounded refusal answer, NO audit (no governed research occurred)', async () => {
  classifier.mockResolvedValue(permitted({ assessment_decision_requested: true, unresolved_ambiguity: ['no_governed_topic_matched'] }))
  const res = await POST(req({ mode: 'question', question: 'should I approve this?' }), ctx)
  expect(res.status).toBe(200)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
  const answer = await res.json()
  expect(answer.authority_note).toBe('assessment_judgment_redirected')
  expect(answer.assessment_authority_note).toBeTruthy()
  expect(answer.topics).toEqual([])
  expect(answer.offered_research_paths.length).toBe(5)
})

test('unsupported / over-general question → 200 bounded answer, NO audit', async () => {
  classifier.mockResolvedValue(permitted({ unresolved_ambiguity: ['question_too_general'] }))
  const res = await POST(req({ mode: 'question', question: 'help' }), ctx)
  expect(res.status).toBe(200)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
  const answer = await res.json()
  expect(answer.authority_note).toBe('unsupported')
})

test('mixed authority + research → 200, ONE audit (governed research occurred), one response surface, no implied approval', async () => {
  classifier.mockResolvedValue(permitted({
    research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
    assessment_decision_requested: true,
  }))
  const res = await POST(req({ mode: 'question', question: 'should I approve this, and what does LK say about copyright ownership?' }), ctx)
  expect(res.status).toBe(200)
  expect(recordReviewerLkAccess).toHaveBeenCalledTimes(1)
  const answer = await res.json()
  expect(answer.authority_note).toBe('assessment_judgment_redirected')
  expect(answer.assessment_authority_note).toBeTruthy()
  expect(answer.topics).toHaveLength(1)
  expect(answer.topics[0].bi_status).toBe('directly_relevant')
  expect(JSON.stringify(answer.assessment_authority_note)).not.toMatch(/\byes\b|\bapproved\b/i)
})

// ── classifier constructor failure (missing key) ────────────────────────

test('classifier adapter constructor throws (missing API key) → 503, no audit, no provider internals leaked', async () => {
  createAnthropicResearchIntentInterpreter.mockImplementation(() => { throw new Error('ANTHROPIC_API_KEY is not set') })
  const res = await POST(req({ mode: 'question', question: 'copyright ownership?' }), ctx)
  expect(res.status).toBe(503)
  expect(recordReviewerLkAccess).not.toHaveBeenCalled()
  const body = await res.json()
  expect(JSON.stringify(body)).not.toMatch(/ANTHROPIC_API_KEY|Anthropic|api key/i)
})

// ── append-only ─────────────────────────────────────────────────────────

test('two research actions → two append-only audit writes', async () => {
  await POST(req({ mode: 'topic_pick', topic: 'commercial_use' }), ctx)
  await POST(req({ mode: 'topic_pick', topic: 'commercial_use' }), ctx)
  expect(recordReviewerLkAccess).toHaveBeenCalledTimes(2)
})
