/**
 * recordKnowledgeDemandEvidence tests (LK-DEMAND-2C, 2026-09-18). Same
 * fake-client dependency-injection pattern as turn-traces.test.ts/
 * pilot-events.test.ts.
 */

import { recordKnowledgeDemandEvidence, KNOWLEDGE_DEMAND_EVIDENCE_SCHEMA_VERSION } from '../../lib/crc-engine/knowledge-demand-evidence'
import type { KnowledgeDemandOccurrence } from '../../types/interview-engine'

function fakeClient(overrides: { upsertResult?: { error: unknown } } = {}) {
  const upsertResult = overrides.upsertResult ?? { error: null }
  const upsertCalls: { rows: unknown; options: unknown }[] = []
  const client = {
    from: jest.fn(() => ({
      upsert: jest.fn(async (rows: unknown, options: unknown) => {
        upsertCalls.push({ rows, options })
        return upsertResult
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

describe('recordKnowledgeDemandEvidence', () => {
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

  test('zero occurrences -- no DB call at all', async () => {
    const { client, upsertCalls } = fakeClient()
    await recordKnowledgeDemandEvidence(client, { sessionId: 'session-123', occurrences: [] })
    expect(client.from).not.toHaveBeenCalled()
    expect(upsertCalls).toHaveLength(0)
  })

  test('a Supabase upsert error does not throw -- best-effort, fail-open', async () => {
    const { client } = fakeClient({ upsertResult: { error: { message: 'write failed' } } })
    await expect(recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })).resolves.toBeUndefined()
  })

  test('a unique-constraint violation does not throw (defense in depth alongside ignoreDuplicates)', async () => {
    const { client } = fakeClient({
      upsertResult: { error: { code: '23505', message: 'duplicate key value violates unique constraint "crc_knowledge_demand_occurrences_session_occurrence_unique"' } },
    })
    await expect(recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })).resolves.toBeUndefined()
  })

  test('an unexpected exception from the client does not throw', async () => {
    const client = {
      from: jest.fn(() => {
        throw new Error('client blew up')
      }),
    } as any
    await expect(recordKnowledgeDemandEvidence(client, { sessionId: 'x', occurrences: [occurrence()] })).resolves.toBeUndefined()
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
})
