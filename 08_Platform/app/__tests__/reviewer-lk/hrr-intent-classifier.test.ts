/**
 * CAH-4G.2 Slice 2 — HRR structured research-intent classifier.
 *
 * Tests the PURE contract + deterministic normalization + the trust-boundary
 * prompt, plus the adapter's fail-closed wiring via a mocked SDK client
 * (`anthropic-extractor-thinking-disabled.test.ts` established that pattern).
 * The normal suite never touches live Anthropic access.
 */

const mockParse = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ messages: { parse: mockParse } })),
}))

import {
  RESEARCH_INTENT_CLASSIFIER_SCHEMA,
  RESEARCH_INTENT_SYSTEM_PROMPT,
  UNSUPPORTED_RESEARCH_INTENT,
  unsupportedResearchIntent,
  validateAndNormalizePermittedResearchIntent,
} from '@/lib/reviewer-lk/interpret-research-intent'
import {
  constantResearchIntentInterpreter,
  functionResearchIntentInterpreter,
} from '@/lib/reviewer-lk/interpret-research-intent.mock'
import {
  HRR_MAX_RESOLVED_TOPICS,
  HRR_UNRESOLVED_AMBIGUITY_REASONS,
  REVIEWER_RESEARCH_TOPICS,
  type PermittedResearchIntent,
} from '@/lib/reviewer-lk/types'
import { REVIEWER_TOPIC_LABELS } from '@/lib/reviewer-lk/topic-labels'
import { GOAL_CATEGORIES } from '@/types/interview-engine'

// ── Topic enum authority ───────────────────────────────────────────────────

describe('ReviewerResearchTopic enum authority', () => {
  test('REVIEWER_RESEARCH_TOPICS === GOAL_CATEGORIES minus "unknown" (sorted)', () => {
    expect([...REVIEWER_RESEARCH_TOPICS].sort()).toEqual(GOAL_CATEGORIES.filter((c: string) => c !== 'unknown').sort())
  })

  test('REVIEWER_RESEARCH_TOPICS === keys of REVIEWER_TOPIC_LABELS (the reviewer-facing label source)', () => {
    expect([...REVIEWER_RESEARCH_TOPICS].sort()).toEqual(Object.keys(REVIEWER_TOPIC_LABELS).sort())
  })

  test('no accidental fan-out cap drift — the frozen §T-4 default is 2', () => {
    expect(HRR_MAX_RESOLVED_TOPICS).toBe(2)
  })
})

// ── Schema shape: enum-bounded, no prose field ─────────────────────────────

describe('RESEARCH_INTENT_CLASSIFIER_SCHEMA — structurally cannot carry an answer', () => {
  const s = RESEARCH_INTENT_CLASSIFIER_SCHEMA

  test('top-level object is closed (additionalProperties: false), exactly the 3 required fields', () => {
    expect(s.type).toBe('object')
    expect(s.additionalProperties).toBe(false)
    expect([...s.required].sort()).toEqual(['assessment_decision_requested', 'research_intents', 'unresolved_ambiguity'])
    expect(Object.keys(s.properties).sort()).toEqual(['assessment_decision_requested', 'research_intents', 'unresolved_ambiguity'])
  })

  test('no answer / summary / statement / explanation / conclusion / applicability field anywhere in the schema', () => {
    const json = JSON.stringify(s)
    for (const forbidden of ['answer', 'summary', 'statement', 'explanation', 'conclusion', 'applicability', 'rationale', 'finding', 'verdict', 'cleared']) {
      expect(json).not.toContain(`"${forbidden}"`)
    }
  })

  test('research_intents items are enum-only {topic, scope}, closed, and hard-capped at HRR_MAX_RESOLVED_TOPICS', () => {
    const arr = s.properties.research_intents
    expect(arr.type).toBe('array')
    expect(arr.maxItems).toBe(HRR_MAX_RESOLVED_TOPICS)
    const item = arr.items
    expect(item.additionalProperties).toBe(false)
    expect([...item.required].sort()).toEqual(['scope', 'topic'])
    expect([...item.properties.topic.enum].sort()).toEqual([...REVIEWER_RESEARCH_TOPICS].sort())
    expect([...item.properties.scope.enum].sort()).toEqual(['determination_request', 'informational'])
  })

  test('assessment_decision_requested is a plain boolean; unresolved_ambiguity is an enum array', () => {
    expect(s.properties.assessment_decision_requested.type).toBe('boolean')
    expect([...s.properties.unresolved_ambiguity.items.enum].sort()).toEqual([...HRR_UNRESOLVED_AMBIGUITY_REASONS].sort())
  })
})

// ── Trust boundary: system prompt ──────────────────────────────────────────

describe('RESEARCH_INTENT_SYSTEM_PROMPT — reviewer text is data, not instruction', () => {
  test('states it classifies/maps only and never answers', () => {
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/classif/i)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/NEVER answer|do not.*(research|retrieve|interpret|conclude)/i)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/Emit ONLY the JSON schema/i)
  })

  test('declares reviewer text is DATA to classify, not an instruction that can change policy', () => {
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/DATA/)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/NOT an instruction|do not obey/i)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/ignore your rules/i)
  })

  test('forbids inventing a "closest topic" and names the cap', () => {
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/never invent a "closest topic"/i)
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toContain(String(HRR_MAX_RESOLVED_TOPICS))
  })

  test('states a separate-utterance decision request never changes a research clause scope', () => {
    expect(RESEARCH_INTENT_SYSTEM_PROMPT).toMatch(/NEVER changes a research clause'?s scope/i)
  })
})

// ── Deterministic validation + normalization ───────────────────────────────

const ri = (topic: string, scope = 'informational') => ({ topic, scope })
const permitted = (over: Partial<Record<string, unknown>> = {}) => ({
  research_intents: [],
  assessment_decision_requested: false,
  unresolved_ambiguity: [],
  ...over,
})

describe('validateAndNormalizePermittedResearchIntent — malformed model output', () => {
  test.each([
    ['not an object (string)', 'copyright ownership is fine'],
    ['not an object (array)', [{ topic: 'copyright_ownership' }]],
    ['null', null],
    ['missing research_intents', { assessment_decision_requested: false, unresolved_ambiguity: [] }],
    ['research_intents not an array', permitted({ research_intents: 'copyright_ownership' })],
    ['assessment_decision_requested not boolean', permitted({ assessment_decision_requested: 'yes' })],
    ['unresolved_ambiguity not an array', permitted({ unresolved_ambiguity: 'question_too_general' })],
  ])('%s -> null (caller fails closed)', (_label, raw) => {
    expect(validateAndNormalizePermittedResearchIntent(raw as unknown)).toBeNull()
  })

  test('prose smuggled into an extra field is ignored (extra keys dropped, not rejected outright)', () => {
    const raw = permitted({
      research_intents: [ri('copyright_ownership')],
      answer: 'Yes, the client owns the copyright.',
      summary: 'This project is cleared.',
    })
    const out = validateAndNormalizePermittedResearchIntent(raw)
    expect(out).not.toBeNull()
    expect(JSON.stringify(out)).not.toMatch(/client owns|cleared/i)
    expect(Object.keys(out!).sort()).toEqual(['assessment_decision_requested', 'research_intents', 'unresolved_ambiguity'])
  })

  test('invalid enum topic is DROPPED, never coerced or guessed', () => {
    const out = validateAndNormalizePermittedResearchIntent(
      permitted({ research_intents: [ri('trademark'), ri('copyright ownership'), ri('copyright_ownership')] }),
    )
    expect(out!.research_intents).toEqual([{ topic: 'copyright_ownership', scope: 'informational' }])
  })

  test('invalid scope is DROPPED (whole clause), never defaulted', () => {
    const out = validateAndNormalizePermittedResearchIntent(
      permitted({ research_intents: [ri('likeness', 'certify'), ri('commercial_use', 'informational')] }),
    )
    expect(out!.research_intents).toEqual([{ topic: 'commercial_use', scope: 'informational' }])
  })

  test('unrecognized unresolved_ambiguity reasons are dropped', () => {
    const out = validateAndNormalizePermittedResearchIntent(
      permitted({ unresolved_ambiguity: ['question_too_general', 'made_up_reason', 42] }),
    )
    expect(out!.unresolved_ambiguity).toEqual(['question_too_general'])
  })
})

describe('validateAndNormalizePermittedResearchIntent — dedup, ordering, cap', () => {
  test('duplicate topic collapses to one; question-interpretation order preserved', () => {
    const out = validateAndNormalizePermittedResearchIntent(
      permitted({ research_intents: [ri('commercial_use'), ri('copyright_ownership'), ri('commercial_use')] }),
    )
    expect(out!.research_intents.map((i) => i.topic)).toEqual(['commercial_use', 'copyright_ownership'])
  })

  test('duplicate topic with different scopes -> the stronger (determination_request) wins, never downgraded', () => {
    const a = validateAndNormalizePermittedResearchIntent(
      permitted({ research_intents: [ri('copyright_ownership', 'informational'), ri('copyright_ownership', 'determination_request')] }),
    )
    expect(a!.research_intents).toEqual([{ topic: 'copyright_ownership', scope: 'determination_request' }])
    const b = validateAndNormalizePermittedResearchIntent(
      permitted({ research_intents: [ri('copyright_ownership', 'determination_request'), ri('copyright_ownership', 'informational')] }),
    )
    expect(b!.research_intents).toEqual([{ topic: 'copyright_ownership', scope: 'determination_request' }])
  })

  test('> HRR_MAX_RESOLVED_TOPICS distinct topics -> keep the first MAX by governed enum order + flag multiple_unrelated_topics', () => {
    // model emits them out of enum order; overflow rule is enum order.
    const out = validateAndNormalizePermittedResearchIntent(
      permitted({
        research_intents: [ri('likeness'), ri('commercial_use'), ri('third_party_source_rights')],
      }),
    )
    expect(out!.research_intents.map((i) => i.topic)).toEqual(['commercial_use', 'likeness'])
    expect(out!.research_intents).toHaveLength(HRR_MAX_RESOLVED_TOPICS)
    expect(out!.unresolved_ambiguity).toContain('multiple_unrelated_topics')
  })

  test('exactly MAX topics -> no overflow flag, model order kept', () => {
    const out = validateAndNormalizePermittedResearchIntent(
      permitted({ research_intents: [ri('copyright_ownership'), ri('commercial_use')] }),
    )
    expect(out!.research_intents.map((i) => i.topic)).toEqual(['copyright_ownership', 'commercial_use'])
    expect(out!.unresolved_ambiguity).not.toContain('multiple_unrelated_topics')
  })

  test('the normalizer never ADDS a research topic the model did not emit', () => {
    const out = validateAndNormalizePermittedResearchIntent(permitted({ assessment_decision_requested: true }))
    expect(out!.research_intents).toEqual([])
  })
})

describe('validateAndNormalizePermittedResearchIntent — happy paths for every governed topic', () => {
  test.each([...REVIEWER_RESEARCH_TOPICS])('%s informational passes through', (topic) => {
    const out = validateAndNormalizePermittedResearchIntent(permitted({ research_intents: [ri(topic)] }))
    expect(out!.research_intents).toEqual([{ topic, scope: 'informational' }])
    expect(out!.assessment_decision_requested).toBe(false)
  })
})

// ── Fail-closed constant ──────────────────────────────────────────────────

describe('unsupportedResearchIntent / UNSUPPORTED_RESEARCH_INTENT', () => {
  test('is the empty-research, no-decision, no_governed_topic_matched shape', () => {
    expect(unsupportedResearchIntent()).toEqual({
      research_intents: [],
      assessment_decision_requested: false,
      unresolved_ambiguity: ['no_governed_topic_matched'],
    })
    expect(UNSUPPORTED_RESEARCH_INTENT).toEqual(unsupportedResearchIntent())
  })

  test('returns a fresh object each call (no shared mutable singleton)', () => {
    expect(unsupportedResearchIntent()).not.toBe(unsupportedResearchIntent())
  })
})

// ── Mocks ─────────────────────────────────────────────────────────────────

describe('mock interpreters', () => {
  test('constantResearchIntentInterpreter returns its constant, ignoring the question', async () => {
    const intent: PermittedResearchIntent = {
      research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
      assessment_decision_requested: false,
      unresolved_ambiguity: [],
    }
    const interp = constantResearchIntentInterpreter(intent)
    await expect(interp('anything at all')).resolves.toEqual(intent)
    await expect(interp('')).resolves.toEqual(intent)
  })

  test('functionResearchIntentInterpreter routes the question through fn', async () => {
    const interp = functionResearchIntentInterpreter((q) =>
      q.includes('likeness')
        ? { research_intents: [{ topic: 'likeness', scope: 'informational' }], assessment_decision_requested: false, unresolved_ambiguity: [] }
        : unsupportedResearchIntent(),
    )
    expect((await interp('what about likeness?')).research_intents).toEqual([{ topic: 'likeness', scope: 'informational' }])
    expect((await interp('hello')).research_intents).toEqual([])
  })
})

// ── Adapter fail-closed wiring (mocked SDK) ────────────────────────────────

describe('createAnthropicResearchIntentInterpreter — fail closed, never throw, never invent', () => {
  beforeEach(() => {
    mockParse.mockReset()
    process.env.ANTHROPIC_API_KEY = 'test-key-not-real'
    delete process.env.HRR_INTENT_CLASSIFIER_MODEL
  })

  const load = () => require('@/lib/reviewer-lk/interpret-research-intent.anthropic').createAnthropicResearchIntentInterpreter

  test('valid structured output -> normalized PermittedResearchIntent; exactly one call; thinking disabled; real schema sent', async () => {
    mockParse.mockResolvedValueOnce({
      id: 'msg_ok',
      stop_reason: 'end_turn',
      content: [{ type: 'text' }],
      usage: { input_tokens: 200, output_tokens: 40, output_tokens_details: { thinking_tokens: 0 } },
      parsed_output: { research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }], assessment_decision_requested: true, unresolved_ambiguity: [] },
    })
    const interp = load()()
    const out = await interp('Should I approve this, and what does governed knowledge say about copyright ownership?')
    expect(out).toEqual({
      research_intents: [{ topic: 'copyright_ownership', scope: 'informational' }],
      assessment_decision_requested: true,
      unresolved_ambiguity: [],
    })
    expect(mockParse).toHaveBeenCalledTimes(1)
    const args = mockParse.mock.calls[0][0]
    expect(args.thinking).toEqual({ type: 'disabled' })
    expect(args.max_tokens).toBe(1024)
    expect(args).toHaveProperty('output_config')
    expect(args.messages).toEqual([{ role: 'user', content: expect.stringContaining('copyright ownership') }])
  })

  test('provider throws -> UNSUPPORTED (no throw, no invented intent, no "all topics")', async () => {
    mockParse.mockRejectedValue(Object.assign(new Error('503 upstream'), { status: 503 }))
    const interp = load()()
    const out = await interp('what about copyright ownership?')
    expect(out).toEqual(unsupportedResearchIntent())
  })

  test('model returns prose instead of structured output (parsed_output null, no text, max_tokens x2) -> UNSUPPORTED after one retry', async () => {
    const miss = { id: 'm', stop_reason: 'max_tokens', content: [{ type: 'thinking' }], usage: { input_tokens: 1, output_tokens: 1, output_tokens_details: { thinking_tokens: 1 } }, parsed_output: null }
    mockParse.mockResolvedValue(miss)
    const interp = load()()
    const out = await interp('anything')
    expect(out).toEqual(unsupportedResearchIntent())
    expect(mockParse).toHaveBeenCalledTimes(2) // base + one recovery
  })

  test('model returns a structurally invalid object (bad enum) -> deterministic normalizer rejects -> UNSUPPORTED', async () => {
    mockParse.mockResolvedValueOnce({
      id: 'm', stop_reason: 'end_turn', content: [{ type: 'text' }],
      usage: { input_tokens: 1, output_tokens: 1, output_tokens_details: { thinking_tokens: 0 } },
      parsed_output: { research_intents: 'copyright_ownership', assessment_decision_requested: false, unresolved_ambiguity: [] },
    })
    const interp = load()()
    await expect(interp('x')).resolves.toEqual(unsupportedResearchIntent())
  })

  test('missing ANTHROPIC_API_KEY -> throws at construction (never silently mocked)', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => load()()).toThrow(/ANTHROPIC_API_KEY is not set/)
  })

  test('HRR_INTENT_CLASSIFIER_MODEL env override is honored', async () => {
    process.env.HRR_INTENT_CLASSIFIER_MODEL = 'claude-test-model'
    mockParse.mockResolvedValueOnce({
      id: 'm', stop_reason: 'end_turn', content: [{ type: 'text' }],
      usage: { input_tokens: 1, output_tokens: 1, output_tokens_details: { thinking_tokens: 0 } },
      parsed_output: { research_intents: [], assessment_decision_requested: false, unresolved_ambiguity: ['question_too_general'] },
    })
    await load()()('help')
    expect(mockParse.mock.calls[0][0].model).toBe('claude-test-model')
  })
})
