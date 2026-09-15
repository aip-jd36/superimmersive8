/**
 * recordCrcCompletionTrace tests (CRC-PILOT-OBS-3, Durable Pipeline Trace
 * Implementation; turn_number identity added by CRC-PILOT-OBS-3A). Same
 * fake-client dependency-injection pattern as
 * pilot-events.test.ts/supabase-session-store.test.ts.
 */

import { recordCrcCompletionTrace, TRACE_SCHEMA_VERSION } from '../../lib/crc-engine/turn-traces'
import { runCRCConversation } from '../../lib/crc-engine/run-crc-conversation'
import { DIALOGUE_FIXTURES } from '../../lib/interview-engine/fixtures'
import { MATRIX_FIXTURE } from '../../lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '../../lib/retrieval-engine/topic-claims-fixture'

function fakeClient(overrides: { insertResult?: { error: unknown } } = {}) {
  const insertResult = overrides.insertResult ?? { error: null }
  const insertCalls: unknown[] = []
  const client = {
    from: jest.fn(() => ({
      insert: jest.fn(async (payload: unknown) => {
        insertCalls.push(payload)
        return insertResult
      }),
    })),
  }
  return { client: client as any, insertCalls }
}

// A real, fully-computed CRCPipelineResult -- not a hand-built stub -- so
// this test proves the writer persists the actual runtime objects
// runCRCConversation() produces, not a shape that merely satisfies the
// TypeScript type.
const realResult = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

describe('recordCrcCompletionTrace', () => {
  test('writes turn_number, trace_kind, runtime_commit, trace_schema_version, and session_id', async () => {
    const { client, insertCalls } = fakeClient()
    await recordCrcCompletionTrace(client, { sessionId: 'session-123', turnNumber: 5, result: realResult })
    expect(insertCalls).toHaveLength(1)
    const row = insertCalls[0] as any
    expect(row.session_id).toBe('session-123')
    expect(row.turn_number).toBe(5)
    expect(row.trace_kind).toBe('completion')
    expect(row.trace_schema_version).toBe(TRACE_SCHEMA_VERSION)
    expect(typeof row.runtime_commit).toBe('string')
    expect(row.runtime_commit.length).toBeGreaterThan(0)
  })

  test('payload preserves the exact runtime objects -- faithful, not a reduced/summarized DTO', async () => {
    const { client, insertCalls } = fakeClient()
    await recordCrcCompletionTrace(client, { sessionId: 'session-123', turnNumber: 5, result: realResult })
    const payload = (insertCalls[0] as any).payload

    expect(payload.structured_understanding).toBe(realResult.structured_understanding)
    expect(payload.output).toBe(realResult.output)
    expect(payload.plan).toBe(realResult.plan)
    expect(payload.bounded_interpretations).toBe(realResult.bounded_interpretations)
    expect(payload.consultative_notes).toBe(realResult.consultative_notes)
    expect(payload.discovered_topic_occurrences).toBe(realResult.discovered_topic_occurrences)
    expect(payload.retrieval_results).toBe(realResult.trace.retrieval_results)
    expect(payload.retrieval_diagnostics).toBe(realResult.diagnostics.retrieval)

    // No extra transformation/summarization has been applied -- the
    // payload's own knowledge_items are byte-identical to the pipeline's,
    // not re-derived or trimmed.
    expect(payload.output.knowledge_items).toEqual(realResult.output.knowledge_items)
  })

  test('a Supabase insert error does not throw -- best-effort, fail-open', async () => {
    const { client } = fakeClient({ insertResult: { error: { message: 'write failed' } } })
    await expect(recordCrcCompletionTrace(client, { sessionId: 'x', turnNumber: 1, result: realResult })).resolves.toBeUndefined()
  })

  test('a unique-constraint violation (e.g. a genuine race between two completion attempts on the same turn) does not throw', async () => {
    const { client } = fakeClient({
      insertResult: { error: { code: '23505', message: 'duplicate key value violates unique constraint "crc_turn_traces_session_turn_kind_unique"' } },
    })
    await expect(recordCrcCompletionTrace(client, { sessionId: 'x', turnNumber: 1, result: realResult })).resolves.toBeUndefined()
  })

  test('an unexpected exception from the client does not throw', async () => {
    const client = {
      from: jest.fn(() => {
        throw new Error('client blew up')
      }),
    } as any
    await expect(recordCrcCompletionTrace(client, { sessionId: 'x', turnNumber: 1, result: realResult })).resolves.toBeUndefined()
  })
})
