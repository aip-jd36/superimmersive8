/**
 * CRC-LATENCY-2 -- observational per-turn model-call timing instrumentation.
 * Covers TurnTimingCollector, the two sink builders, and recordCrcTurnTiming's
 * fail-open persistence. Does not re-test callWithOneRecoveryRetry /
 * callWithStructuredOutputRecoveryRetry's own retry/attempt mechanics --
 * those are already exhaustively covered by
 * anthropic-structured-output-retry.test.ts and
 * anthropic-extractor-retry.test.ts; this file proves only that THIS
 * module's new consumers react correctly to the event shapes those already-
 * tested call sites actually produce.
 */

import { TurnTimingCollector, recordingSuccessSink, recordingExtractorSuccessSink, recordCrcTurnTiming, type ModelCallObservation } from '../../lib/crc-engine/turn-timing'
import type { StructuredOutputSuccessTelemetryEvent } from '../../lib/interview-engine/anthropic-structured-output-retry'
import type { ExtractorSuccessTelemetryEvent } from '../../lib/interview-engine/anthropic-extractor'

function successEvent(overrides: Partial<StructuredOutputSuccessTelemetryEvent> = {}): StructuredOutputSuccessTelemetryEvent {
  return {
    adapter: 'decider',
    attempt: 1,
    outcome: 'success',
    elapsed_ms: 123.456,
    anthropic_response_id: 'resp_1',
    stop_reason: 'end_turn',
    content_block_types: ['text'],
    parsed_output_present: true,
    thinking_tokens: null,
    output_tokens: 50,
    input_tokens: 500,
    ...overrides,
  }
}

function extractorSuccessEvent(overrides: Partial<ExtractorSuccessTelemetryEvent> = {}): ExtractorSuccessTelemetryEvent {
  return {
    adapter: 'extractor',
    attempt: 1,
    outcome: 'success',
    elapsed_ms: 987.1,
    anthropic_response_id: 'resp_2',
    stop_reason: 'end_turn',
    content_block_types: ['text'],
    parsed_output_present: true,
    thinking_tokens: null,
    output_tokens: 80,
    input_tokens: 900,
    ...overrides,
  }
}

describe('TurnTimingCollector', () => {
  test('a single recorded call produces exactly one observation with the expected shape', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 123.4)
    expect(collector.modelCallCount()).toBe(1)
    expect(collector.modelCalls()).toEqual([{ role: 'extractor', sequence: 1, physical_attempt: 1, is_recovery_retry: false, elapsed_ms: 123 }])
  })

  // "extraction only" -- requirement example 1.
  test('extraction-only turn -> one observation, role extractor', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 100)
    expect(collector.modelCalls().map((c) => c.role)).toEqual(['extractor'])
  })

  // "extraction + forced-candidate decider" -- requirement example 2: no
  // generator entry at all proves it was genuinely skipped, not called.
  test('extraction + forced-candidate decider -> two observations, no generator entry', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 100)
    collector.record('constraint_a_decider', 1, 50)
    const roles = collector.modelCalls().map((c) => c.role)
    expect(roles).toEqual(['extractor', 'constraint_a_decider'])
    expect(roles).not.toContain('candidate_question_generator')
  })

  // "extraction + generator + decider" -- requirement example 3.
  test('extraction + generator + decider -> three distinct, sequentially-numbered observations', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 100)
    collector.record('candidate_question_generator', 1, 80)
    collector.record('constraint_a_decider', 1, 40)
    const calls = collector.modelCalls()
    expect(calls.map((c) => c.role)).toEqual(['extractor', 'candidate_question_generator', 'constraint_a_decider'])
    expect(calls.map((c) => c.sequence)).toEqual([1, 2, 3])
  })

  // "multi-attempt candidate cascades" -- requirement example 4: more than
  // 3 entries, with roles repeating in call order (e.g. attempt1 + Model-4
  // attempt2, each generator+decider).
  test('multi-attempt candidate cascade -> more than 3 observations, roles repeat in order', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 90)
    collector.record('candidate_question_generator', 1, 70) // attempt1
    collector.record('constraint_a_decider', 1, 30)
    collector.record('candidate_question_generator', 1, 65) // attempt2 (Model 4 bounded retry)
    collector.record('constraint_a_decider', 1, 28)
    expect(collector.modelCallCount()).toBe(5)
    expect(collector.modelCalls().map((c) => c.role)).toEqual([
      'extractor',
      'candidate_question_generator',
      'constraint_a_decider',
      'candidate_question_generator',
      'constraint_a_decider',
    ])
    // sequence strictly increases -- the only signal this module uses to
    // reconstruct turn-internal ordering; it never reads run-turn.ts's own
    // attempt1/2/3/4 labels.
    expect(collector.modelCalls().map((c) => c.sequence)).toEqual([1, 2, 3, 4, 5])
  })

  // "application-level recovery retries" -- requirement example 5.
  test('a physical_attempt of 2 is marked is_recovery_retry: true; attempt 1 is not', () => {
    const collector = new TurnTimingCollector()
    collector.record('constraint_a_decider', 1, 50)
    collector.record('constraint_a_decider', 2, 300)
    const [first, retried] = collector.modelCalls()
    expect(first.is_recovery_retry).toBe(false)
    expect(retried.is_recovery_retry).toBe(true)
    expect(retried.physical_attempt).toBe(2)
  })

  test('elapsed_ms is rounded to the nearest integer', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 123.9)
    expect(collector.modelCalls()[0].elapsed_ms).toBe(124)
  })

  // Privacy / content-exclusion requirement: the ONLY fields a recorded
  // observation can ever carry.
  test('a recorded observation never carries any field beyond the fixed allowlist', () => {
    const collector = new TurnTimingCollector()
    collector.record('extractor', 1, 10)
    const keys = Object.keys(collector.modelCalls()[0]).sort()
    expect(keys).toEqual(['elapsed_ms', 'is_recovery_retry', 'physical_attempt', 'role', 'sequence'])
  })
})

describe('recordingSuccessSink (decider / candidate_question_generator)', () => {
  test('forwards only {attempt, elapsed_ms} from a real StructuredOutputSuccessTelemetryEvent into the collector, under the given role', () => {
    const collector = new TurnTimingCollector()
    const sink = recordingSuccessSink(collector, 'constraint_a_decider')
    sink(successEvent({ attempt: 1, elapsed_ms: 212.7, anthropic_response_id: 'resp_should_not_appear' }))
    expect(collector.modelCalls()).toEqual([{ role: 'constraint_a_decider', sequence: 1, physical_attempt: 1, is_recovery_retry: false, elapsed_ms: 213 }])
  })

  test('a retry-attempt event (attempt: 2) is recorded as a recovery retry', () => {
    const collector = new TurnTimingCollector()
    const sink = recordingSuccessSink(collector, 'candidate_question_generator')
    sink(successEvent({ adapter: 'candidate_generator', attempt: 2, elapsed_ms: 400 }))
    expect(collector.modelCalls()[0]).toMatchObject({ role: 'candidate_question_generator', physical_attempt: 2, is_recovery_retry: true })
  })

  test('none of the source event fields (anthropic_response_id, stop_reason, content_block_types, token counts) ever reach the collector', () => {
    const collector = new TurnTimingCollector()
    const sink = recordingSuccessSink(collector, 'constraint_a_decider')
    sink(successEvent())
    const persisted = JSON.stringify(collector.modelCalls())
    expect(persisted).not.toContain('resp_1')
    expect(persisted).not.toContain('end_turn')
    expect(persisted).not.toContain('500')
  })
})

describe('recordingExtractorSuccessSink', () => {
  test('forwards only {attempt, elapsed_ms} from a real ExtractorSuccessTelemetryEvent, role fixed to extractor', () => {
    const collector = new TurnTimingCollector()
    const sink = recordingExtractorSuccessSink(collector)
    sink(extractorSuccessEvent({ attempt: 1, elapsed_ms: 555.2 }))
    expect(collector.modelCalls()).toEqual([{ role: 'extractor', sequence: 1, physical_attempt: 1, is_recovery_retry: false, elapsed_ms: 555 }])
  })

  test('no extractor content (anthropic_response_id, token counts) reaches the collector', () => {
    const collector = new TurnTimingCollector()
    const sink = recordingExtractorSuccessSink(collector)
    sink(extractorSuccessEvent())
    const persisted = JSON.stringify(collector.modelCalls())
    expect(persisted).not.toContain('resp_2')
    expect(persisted).not.toContain('900')
  })
})

// ── recordCrcTurnTiming: fail-open persistence ──────────────────────────────

function fakeClient(opts: { insertError?: unknown; throwOnInsert?: boolean } = {}) {
  const insertCalls: unknown[] = []
  const client = {
    from: jest.fn(() => ({
      insert: jest.fn((row: unknown) => {
        insertCalls.push(row)
        if (opts.throwOnInsert) throw new Error('unexpected client failure')
        return Promise.resolve({ error: opts.insertError ?? null })
      }),
    })),
  }
  return { client: client as any, insertCalls }
}

const SAMPLE_CALLS: ModelCallObservation[] = [
  { role: 'extractor', sequence: 1, physical_attempt: 1, is_recovery_retry: false, elapsed_ms: 900 },
  { role: 'constraint_a_decider', sequence: 2, physical_attempt: 1, is_recovery_retry: false, elapsed_ms: 150 },
]

describe('recordCrcTurnTiming', () => {
  test('inserts exactly one row with the expected shape on success', async () => {
    const { client, insertCalls } = fakeClient({})
    await recordCrcTurnTiming(client, {
      sessionId: 'session-1',
      turnNumber: 3,
      requestDurationMs: 2345.6,
      runTurnDurationMs: 1890.2,
      modelCalls: SAMPLE_CALLS,
    })
    expect(insertCalls).toHaveLength(1)
    const row = insertCalls[0] as any
    expect(row.session_id).toBe('session-1')
    expect(row.turn_number).toBe(3)
    expect(row.request_duration_ms).toBe(2346)
    expect(row.run_turn_duration_ms).toBe(1890)
    expect(row.model_call_count).toBe(2)
    expect(row.model_calls).toEqual(SAMPLE_CALLS)
    expect(typeof row.runtime_commit).toBe('string')
  })

  // The exact requirement this test proves: a telemetry persistence
  // failure never throws to the caller (route.ts awaits this call; if it
  // threw, an otherwise-successful CRC turn would fail or be altered by a
  // pure observability write).
  test('an insert error does not throw -- resolves normally', async () => {
    const { client } = fakeClient({ insertError: { message: 'db down' } })
    await expect(
      recordCrcTurnTiming(client, { sessionId: 's1', turnNumber: 1, requestDurationMs: 100, runTurnDurationMs: 80, modelCalls: [] }),
    ).resolves.toBeUndefined()
  })

  test('an unexpected thrown exception from the client does not throw -- resolves normally', async () => {
    const { client } = fakeClient({ throwOnInsert: true })
    await expect(
      recordCrcTurnTiming(client, { sessionId: 's1', turnNumber: 1, requestDurationMs: 100, runTurnDurationMs: 80, modelCalls: [] }),
    ).resolves.toBeUndefined()
  })

  test('an empty model_calls array (e.g. natural gate completion with zero candidate-search calls) persists correctly', async () => {
    const { client, insertCalls } = fakeClient({})
    await recordCrcTurnTiming(client, { sessionId: 's1', turnNumber: 5, requestDurationMs: 50, runTurnDurationMs: 10, modelCalls: [] })
    const row = insertCalls[0] as any
    expect(row.model_call_count).toBe(0)
    expect(row.model_calls).toEqual([])
  })
})
