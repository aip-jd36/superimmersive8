/**
 * recordKnowledgeDemandEvidence tests (LK-DEMAND-2C, 2026-09-18; return
 * contract widened LK-DEMAND-2E, 2026-09-18). Same fake-client
 * dependency-injection pattern as turn-traces.test.ts/pilot-events.test.ts.
 */

import { recordKnowledgeDemandEvidence, KNOWLEDGE_DEMAND_EVIDENCE_SCHEMA_VERSION } from '../../lib/crc-engine/knowledge-demand-evidence'
import type { KnowledgeDemandOccurrence } from '../../types/interview-engine'

function fakeClient(overrides: { upsertResult?: { data?: unknown; error?: unknown } } = {}) {
  const upsertResult = overrides.upsertResult ?? { data: [], error: null }
  const upsertCalls: { rows: unknown; options: unknown; selectColumns?: unknown }[] = []
  const client = {
    from: jest.fn(() => ({
      upsert: jest.fn((rows: unknown, options: unknown) => {
        const call: { rows: unknown; options: unknown; selectColumns?: unknown } = { rows, options }
        upsertCalls.push(call)
        return {
          select: jest.fn(async (columns: unknown) => {
            call.selectColumns = columns
            return upsertResult
          }),
        }
      }),
    })),
  }
  return { client: client as any, upsertCalls }
}

function occurrence(overrides: Partial<KnowledgeDemandOccurrence> = {}): KnowledgeDemandOccurrence {
  return {
    occurrence_id: 'kd-t1-c2',
    goal_id: 't1-c1',
    source_turn: 1,
    raw_text: 'on a test platform',
    source_statement: 'on a test platform',
    qualification_state: 'qualified',
    superseded_by: null,
    ...overrides,
  }
}

function durableRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-uuid-1',
    session_id: 'session-123',
    occurrence_id: 'kd-t1-c2',
    source_turn: 1,
    raw_text: 'on a test platform',
    source_statement: 'on a test platform',
    created_at: '2026-09-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('recordKnowledgeDemandEvidence -- persistence shape (LK-DEMAND-2C)', () => {
  test('writes one row per occurrence with session_id, runtime_commit, schema_version', async () => {
    const { client, upsertCalls } = fakeClient()
    const o1 = occurrence({ occurrence_id: 'kd-t1-c2' })
    const o2 = occurrence({ occurrence_id: 'kd-t1-c3', raw_text: 'on another platform' })
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [o1, o2] })

    expect(upsertCalls).toHaveLength(1)
    const rows = upsertCalls[0].rows as any[]
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.session_id).toBe('session-123')
      expect(row.schema_version).toBe(KNOWLEDGE_DEMAND_EVIDENCE_SCHEMA_VERSION)
      expect(typeof row.runtime_commit).toBe('string')
      expect(row.runtime_commit.length).toBeGreaterThan(0)
    }
    expect(rows.map((r) => r.occurrence_id).sort()).toEqual(['kd-t1-c2', 'kd-t1-c3'])
  })

  test('preserves the exact runtime fields verbatim -- faithful, not a reduced DTO', async () => {
    const { client, upsertCalls } = fakeClient()
    const o = occurrence({
      occurrence_id: 'kd-t3-c1',
      goal_id: 't2-c1',
      source_turn: 3,
      raw_text: 'on Kick',
      source_statement: 'on Kick',
      qualification_state: 'indeterminate',
      superseded_by: 'kd-t3-c5',
    })
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-abc', occurrences: [o] })
    const row = (upsertCalls[0].rows as any[])[0]
    expect(row.occurrence_id).toBe('kd-t3-c1')
    expect(row.goal_id).toBe('t2-c1')
    expect(row.source_turn).toBe(3)
    expect(row.raw_text).toBe('on Kick')
    expect(row.source_statement).toBe('on Kick')
    expect(row.qualification_state).toBe('indeterminate')
    expect(row.superseded_by).toBe('kd-t3-c5')
  })

  test('uses upsert with onConflict session_id,occurrence_id and ignoreDuplicates -- the idempotency contract', async () => {
    const { client, upsertCalls } = fakeClient()
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(upsertCalls[0].options).toEqual({ onConflict: 'session_id,occurrence_id', ignoreDuplicates: true })
  })

  test('no coverage/subject/onboarding field is ever written -- evidence only', async () => {
    const { client, upsertCalls } = fakeClient()
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    const row = (upsertCalls[0].rows as any[])[0]
    const forbiddenKeys = ['coverage_status', 'coverage_reason', 'uncovered', 'subject_id', 'subject_type', 'knowledge_topic', 'onboarding_status', 'demand_priority', 'demand_score', 'domain', 'notification_status']
    for (const key of forbiddenKeys) {
      expect(Object.prototype.hasOwnProperty.call(row, key)).toBe(false)
    }
  })

  test('10. client-side duplicate occurrence_id collapses to one row sent to upsert -- existing deterministic-identity semantics unchanged', async () => {
    const { client, upsertCalls } = fakeClient({ upsertResult: { data: [durableRow()], error: null } })
    const o1 = occurrence({ occurrence_id: 'kd-t1-c2', raw_text: 'first' })
    const o2 = occurrence({ occurrence_id: 'kd-t1-c2', raw_text: 'first-duplicate' })
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [o1, o2] })
    const rows = upsertCalls[0].rows as any[]
    expect(rows).toHaveLength(1) // first-wins dedup, unchanged from LK-DEMAND-2C-R2
    expect(rows[0].raw_text).toBe('first')
  })
})

describe('recordKnowledgeDemandEvidence -- newly-inserted-row return contract (LK-DEMAND-2E)', () => {
  test('1. a newly inserted occurrence is returned', async () => {
    const row = durableRow({ occurrence_id: 'kd-t1-c2' })
    const { client } = fakeClient({ upsertResult: { data: [row], error: null } })
    const result = await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(result).toEqual([row])
  })

  test('2. returned row contains the required durable fields', async () => {
    const row = durableRow()
    const { client } = fakeClient({ upsertResult: { data: [row], error: null } })
    const [result] = await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(Object.keys(result).sort()).toEqual(['id', 'session_id', 'occurrence_id', 'source_turn', 'raw_text', 'source_statement', 'created_at'].sort())
  })

  test('requests exactly the minimum durable columns via .select()', async () => {
    const { client, upsertCalls } = fakeClient({ upsertResult: { data: [], error: null } })
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(upsertCalls[0].selectColumns).toBe('id, session_id, occurrence_id, source_turn, raw_text, source_statement, created_at')
  })

  test('3. a duplicate/skipped occurrence (upsert reports it absent) is NOT returned as newly inserted', async () => {
    // Simulates Postgres's own ON CONFLICT DO NOTHING RETURNING behavior:
    // a row that already existed is silently absent from the returned set.
    const { client } = fakeClient({ upsertResult: { data: [], error: null } })
    const result = await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(result).toEqual([])
  })

  test('4. an all-duplicate batch (multiple input occurrences, zero newly inserted) returns []', async () => {
    const { client } = fakeClient({ upsertResult: { data: [], error: null } })
    const o1 = occurrence({ occurrence_id: 'kd-t1-c2' })
    const o2 = occurrence({ occurrence_id: 'kd-t1-c3', raw_text: 'on another platform' })
    const result = await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [o1, o2] })
    expect(result).toEqual([])
  })

  test('mixed batch -- only the genuinely-newly-inserted rows are returned, not the skipped ones', async () => {
    const newRow = durableRow({ occurrence_id: 'kd-t1-c3', raw_text: 'on another platform' })
    // Only the second row is returned -- the first was skipped as an
    // existing duplicate, exactly like a real ON CONFLICT DO NOTHING
    // RETURNING result would omit it.
    const { client } = fakeClient({ upsertResult: { data: [newRow], error: null } })
    const o1 = occurrence({ occurrence_id: 'kd-t1-c2' })
    const o2 = occurrence({ occurrence_id: 'kd-t1-c3', raw_text: 'on another platform' })
    const result = await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [o1, o2] })
    expect(result).toEqual([newRow])
  })

  test('5. empty input returns [] -- no DB call at all', async () => {
    const { client, upsertCalls } = fakeClient()
    const result = await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [] })
    expect(result).toEqual([])
    expect(client.from).not.toHaveBeenCalled()
    expect(upsertCalls).toHaveLength(0)
  })

  test('6/7. a Supabase upsert error remains fail-open and resolves to []', async () => {
    const { client } = fakeClient({ upsertResult: { error: { message: 'write failed' } } })
    await expect(recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })).resolves.toEqual([])
  })

  test('8. persistence failure still logs via the existing convention', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = fakeClient({ upsertResult: { error: { message: 'write failed' } } })
    await recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })
    expect(spy).toHaveBeenCalledWith('[recordKnowledgeDemandEvidence] insert error', { message: 'write failed' })
    spy.mockRestore()
  })

  test('a unique-constraint-shaped error remains fail-open and resolves to [] (defense in depth alongside ignoreDuplicates)', async () => {
    const { client } = fakeClient({
      upsertResult: { error: { code: '23505', message: 'duplicate key value violates unique constraint "crc_knowledge_demand_occurrences_session_occurrence_unique"' } },
    })
    await expect(recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })).resolves.toEqual([])
  })

  test('an unexpected exception from the client does not throw and resolves to []', async () => {
    const client = {
      from: jest.fn(() => {
        throw new Error('client blew up')
      }),
    } as any
    await expect(recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })).resolves.toEqual([])
  })
})
