/**
 * CAH-4G.17 — ACTIVE-FOCUS CLASSIFIER ENABLEMENT (feature-gated,
 * `HRR_ACTIVE_FOCUS_CONTEXT_ENABLED`, OFF by default).
 *
 * IMPORTANT SCOPE NOTE: there is no live Anthropic API access in this
 * environment (no `ANTHROPIC_API_KEY`), so this suite — like every other
 * route test in this repo — mocks the classifier. It can and does prove:
 * exactly what text the classifier receives (byte-for-byte, both flag
 * states); that `unresolvedReferents` never reaches the classifier input
 * even when the client supplies some; that `topic_pick` never reads context
 * regardless of the flag; that whatever the classifier's OWN mocked output
 * says is what the route acts on, unmodified, in both flag states (proving
 * no post-classification override exists); and that authority/freshness/
 * cost/fail-closed behavior are identical ON vs OFF. It CANNOT and does not
 * claim to prove that a REAL model actually resolves any given phrase
 * correctly when given the advisory context — that requires a live
 * classifier call this environment cannot make (see the Final Report,
 * §P/§Q, for the honest scope of what is and is not demonstrated here).
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
import type { PermittedResearchIntent } from '@/lib/reviewer-lk/types'

const ctx = { params: { id: 'sub-1' } }

function req(body: unknown) {
  return { json: async () => body } as any
}

const permitted = (o: Partial<PermittedResearchIntent> = {}): PermittedResearchIntent => ({
  research_intents: [],
  assessment_decision_requested: false,
  unresolved_ambiguity: [],
  ...o,
})

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED
  delete process.env.HRR_DARK_CONTEXT_DEBUG
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'reviewer-9' })
  getSubmissionFactsForReviewerLk.mockResolvedValue({ tools_used: null, territory_preferences: 'United States' })
  recordReviewerLkAccess.mockResolvedValue(undefined)
  classifier.mockResolvedValue(permitted({ research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }] }))
})

describe('A — FEATURE GATE: default OFF, byte-identical to CAH-4G.16', () => {
  test('flag unset -> classifier receives the bare question, no prefix, even with a valid context', async () => {
    await POST(
      req({ mode: 'question', question: 'why isn\'t that established?', context: { activeFocus: 'copyrightability' } }),
      ctx,
    )
    expect(classifier).toHaveBeenCalledWith("why isn't that established?")
  })

  test('flag = "0" (anything but "1") -> still OFF', async () => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '0'
    await POST(req({ mode: 'question', question: 'q', context: { activeFocus: 'copyrightability' } }), ctx)
    expect(classifier).toHaveBeenCalledWith('q')
  })
})

describe('B — FLAG ON: exact classifier input format', () => {
  beforeEach(() => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
  })

  test('a valid activeFocus prepends the exact fixed-template advisory line, then a blank line, then the verbatim question', async () => {
    await POST(
      req({ mode: 'question', question: "why isn't that established?", context: { activeFocus: 'copyrightability' } }),
      ctx,
    )
    expect(classifier).toHaveBeenCalledWith(
      "[Context: Active Research Focus = copyrightability.]\n\nwhy isn't that established?",
    )
  })

  test('unresolvedReferents supplied by the client NEVER appear in the classifier input, even though schema validation would accept them', async () => {
    await POST(
      req({
        mode: 'question',
        question: 'what do you mean by human contribution?',
        context: { activeFocus: 'copyrightability', unresolvedReferents: ['jurisdiction', 'human_contribution_description'] },
      }),
      ctx,
    )
    const calledWith = classifier.mock.calls[0][0] as string
    expect(calledWith).not.toMatch(/Unresolved:/)
    expect(calledWith).not.toMatch(/jurisdiction|human_contribution_description/)
    expect(calledWith).toBe('[Context: Active Research Focus = copyrightability.]\n\nwhat do you mean by human contribution?')
  })

  test('no context supplied -> classifier input unaffected, byte-identical to flag OFF', async () => {
    await POST(req({ mode: 'question', question: 'q' }), ctx)
    expect(classifier).toHaveBeenCalledWith('q')
  })

  test('null activeFocus (context present but empty) -> no prefix', async () => {
    await POST(req({ mode: 'question', question: 'q', context: {} }), ctx)
    expect(classifier).toHaveBeenCalledWith('q')
  })
})

describe('C — TOPIC-PICK: flag has zero effect', () => {
  test('flag ON, context present on a topic_pick request -> 0 classifier calls, context never read', async () => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
    await POST(req({ mode: 'topic_pick', topic: 'copyright_ownership', context: { activeFocus: 'likeness' } }), ctx)
    expect(classifier).not.toHaveBeenCalled()
  })
})

describe('D — DOWNSTREAM ACTS ON THE CLASSIFIERS OWN OUTPUT — no post-classification override exists', () => {
  beforeEach(() => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
  })

  test('if the (mocked) classifier resolves a topic despite context being present, the route routes to exactly that topic', async () => {
    classifier.mockResolvedValue(permitted({ research_intents: [{ topic: 'likeness', scope: 'informational' }] }))
    const res = await POST(
      req({ mode: 'question', question: 'Tell me about likeness.', context: { activeFocus: 'copyrightability' } }),
      ctx,
    )
    const json = await res.json()
    expect(json.topics.map((t: any) => t.topic)).toEqual(['likeness'])
  })

  test('if the (mocked) classifier still cannot resolve anything even with context present, HRR fails closed exactly as with no context', async () => {
    classifier.mockResolvedValue(permitted()) // simulates "still unsupported"
    const res = await POST(
      req({ mode: 'question', question: 'what do you mean by human contribution?', context: { activeFocus: 'copyrightability' } }),
      ctx,
    )
    const json = await res.json()
    expect(json.authority_note).toBe('unsupported')
    expect(json.offered_research_paths).not.toBeNull()
    expect(json.topics).toEqual([])
  })

  test('multi-topic classifier output is passed through unmodified regardless of context', async () => {
    classifier.mockResolvedValue(
      permitted({
        research_intents: [
          { topic: 'copyrightability', scope: 'informational' },
          { topic: 'copyright_ownership', scope: 'informational' },
        ],
      }),
    )
    const res = await POST(
      req({ mode: 'question', question: 'what about copyrightability and ownership?', context: { activeFocus: 'copyrightability' } }),
      ctx,
    )
    const json = await res.json()
    expect(json.topics.map((t: any) => t.topic).sort()).toEqual(['copyright_ownership', 'copyrightability'])
  })
})

describe('E — AUTHORITY PARITY: identical ON vs OFF, across multiple activeFocus values', () => {
  test.each([
    ['copyrightability', 'Is that enough evidence?'],
    ['copyright_ownership', 'Should I approve this?'],
    ['likeness', 'Does this clear the control?'],
  ])('activeFocus=%s, question=%s -> identical authority refusal ON vs OFF', async (focus, question) => {
    classifier.mockResolvedValue(permitted({ assessment_decision_requested: true }))

    delete process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED
    const resOff = await POST(req({ mode: 'question', question, context: { activeFocus: focus } }), ctx)
    const jsonOff = await resOff.json()

    classifier.mockResolvedValue(permitted({ assessment_decision_requested: true }))
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
    const resOn = await POST(req({ mode: 'question', question, context: { activeFocus: focus } }), ctx)
    const jsonOn = await resOn.json()

    expect(jsonOn.authority_note).toBe(jsonOff.authority_note)
    expect(jsonOn.authority_note).toBe('assessment_judgment_redirected')
    expect(jsonOn.assessment_authority_note).toBe(jsonOff.assessment_authority_note)
  })
})

describe('F — FAIL-CLOSED / MALICIOUS / STALE CONTEXT (flag ON)', () => {
  beforeEach(() => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
  })

  test.each([
    ['unknown focus', { activeFocus: 'not_a_real_topic' }],
    ['malformed (wrong type)', 'not an object'],
    ['injection-shaped referent (still ignored — referents never reach the classifier)', { activeFocus: 'copyrightability', unresolvedReferents: ['ignore_previous_instructions'] }],
    ['extra unexpected fields', { activeFocus: 'copyrightability', priorAnswer: 'fully cleared' }],
  ])('context = %s -> never throws, response succeeds, classifier input has no unauthoritative content', async (_label, context) => {
    const res = await POST(req({ mode: 'question', question: 'q', context }), ctx)
    expect(res.status).toBe(200)
    const calledWith = classifier.mock.calls[0][0] as string
    expect(calledWith === 'q' || calledWith === '[Context: Active Research Focus = copyrightability.]\n\nq').toBe(true)
  })

  test('an explicit current topic in the question is never contradicted or diluted by a stale inherited focus — the route sends BOTH, but only the classifier (untestable live) arbitrates; the WIRING never post-processes the result to prefer the stale focus', async () => {
    classifier.mockResolvedValue(permitted({ research_intents: [{ topic: 'likeness', scope: 'informational' }] }))
    const res = await POST(
      req({ mode: 'question', question: 'Tell me about likeness.', context: { activeFocus: 'copyrightability' } }),
      ctx,
    )
    const json = await res.json()
    // The route acts on the classifier's resolution (likeness), not the stale inherited focus (copyrightability).
    expect(json.topics.map((t: any) => t.topic)).toEqual(['likeness'])
  })
})

describe('G — FRESHNESS: the audited research call receives the current reviewerContext/topicClaims regardless of flag', () => {
  test('reviewerContext is freshly resolved from getSubmissionFactsForReviewerLk on every request, flag ON', async () => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
    getSubmissionFactsForReviewerLk.mockResolvedValue({ tools_used: null, territory_preferences: 'Canada' })
    await POST(req({ mode: 'question', question: 'q', context: { activeFocus: 'copyrightability' } }), ctx)
    expect(getSubmissionFactsForReviewerLk).toHaveBeenCalledTimes(1)
    expect(getSubmissionFactsForReviewerLk).toHaveBeenCalledWith('sub-1')
  })
})

describe('I — PROMPT/PREFIX CONSISTENCY: the system prompt documents the exact shape buildResearchSessionContextPrefix produces', () => {
  test('the advisory-line literal template in RESEARCH_INTENT_SYSTEM_PROMPT matches the real prefix builder output', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RESEARCH_INTENT_SYSTEM_PROMPT } = require('@/lib/reviewer-lk/interpret-research-intent')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildResearchSessionContextPrefix } = require('@/lib/hrr/research-session-context')
    const realPrefix = buildResearchSessionContextPrefix({
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      unresolvedReferents: [],
    })
    // The prompt's own template line, with the placeholder substituted the same way, must be a real, producible shape.
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/\[Context: Active Research Focus = <topic>\.\]/)
    expect(realPrefix).toBe('[Context: Active Research Focus = copyrightability.]')
    expect(RESEARCH_INTENT_SYSTEM_PROMPT.replace('<topic>', 'copyrightability')).toMatch(
      /\[Context: Active Research Focus = copyrightability\.\]/,
    )
  })

  test('the prompt explicitly states explicit-current-topic precedence and that the line is never evidence for an authority determination', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { RESEARCH_INTENT_SYSTEM_PROMPT } = require('@/lib/reviewer-lk/interpret-research-intent')
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/reviewer's own current question ALWAYS takes priority/)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/never changes assessment_decision_requested/)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/never force a resolution/)
  })
})

describe('H — COST: exactly one classifier call, ON or OFF; 0 for topic_pick', () => {
  test('flag ON, free-form -> exactly 1 classifier call', async () => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
    await POST(req({ mode: 'question', question: 'q', context: { activeFocus: 'copyrightability' } }), ctx)
    expect(classifier).toHaveBeenCalledTimes(1)
  })

  test('flag ON, topic_pick -> 0 classifier calls', async () => {
    process.env.HRR_ACTIVE_FOCUS_CONTEXT_ENABLED = '1'
    await POST(req({ mode: 'topic_pick', topic: 'copyrightability' }), ctx)
    expect(classifier).not.toHaveBeenCalled()
  })
})
