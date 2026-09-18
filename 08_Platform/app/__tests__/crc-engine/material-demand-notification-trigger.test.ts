/**
 * recordAndNotifyMaterialDemandEvidence tests (LK-DEMAND-2E, 2026-09-18).
 * Proves the notification-gating wiring itself -- both
 * recordKnowledgeDemandEvidence and sendMaterialDemandAdminNotification
 * are mocked at the module boundary (each already has its own full
 * behavioral test suite elsewhere), so this file tests ONLY the seam: is
 * the notification attempted exactly when, and only when, it should be.
 */

const mockRecordKnowledgeDemandEvidence = jest.fn()
const mockSendMaterialDemandAdminNotification = jest.fn()

jest.mock('../../lib/crc-engine/knowledge-demand-evidence', () => ({
  recordKnowledgeDemandEvidence: mockRecordKnowledgeDemandEvidence,
}))
jest.mock('../../lib/emails', () => ({
  sendMaterialDemandAdminNotification: mockSendMaterialDemandAdminNotification,
}))

import { recordAndNotifyMaterialDemandEvidence } from '../../lib/crc-engine/material-demand-notification-trigger'
import type { KnowledgeDemandOccurrence } from '../../types/interview-engine'

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
    id: 'row-1',
    session_id: 'session-123',
    occurrence_id: 'kd-t1-c2',
    source_turn: 1,
    raw_text: 'on a test platform',
    source_statement: 'on a test platform',
    created_at: '2026-09-18T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockRecordKnowledgeDemandEvidence.mockReset()
  mockSendMaterialDemandAdminNotification.mockReset()
  mockSendMaterialDemandAdminNotification.mockResolvedValue(undefined)
})

const client = {} as any

describe('recordAndNotifyMaterialDemandEvidence -- notification gating', () => {
  test('21. one newly inserted row -> exactly one notification attempt, with that row', async () => {
    const row = durableRow()
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([row])
    await recordAndNotifyMaterialDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(mockSendMaterialDemandAdminNotification).toHaveBeenCalledTimes(1)
    expect(mockSendMaterialDemandAdminNotification).toHaveBeenCalledWith([row])
  })

  test('22. multiple newly inserted rows in the same turn -> still exactly one notification attempt, containing all of them', async () => {
    const rowA = durableRow({ id: 'row-a', occurrence_id: 'kd-t1-a' })
    const rowB = durableRow({ id: 'row-b', occurrence_id: 'kd-t1-b' })
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([rowA, rowB])
    await recordAndNotifyMaterialDemandEvidence(client, {
      sessionId: 'session-123',
      occurrences: [occurrence({ occurrence_id: 'kd-t1-a' }), occurrence({ occurrence_id: 'kd-t1-b' })],
    })
    expect(mockSendMaterialDemandAdminNotification).toHaveBeenCalledTimes(1)
    expect(mockSendMaterialDemandAdminNotification).toHaveBeenCalledWith([rowA, rowB])
  })

  test('23. zero newly inserted rows -> zero notification attempts', async () => {
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([])
    await recordAndNotifyMaterialDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(mockSendMaterialDemandAdminNotification).not.toHaveBeenCalled()
  })

  test('24. all-duplicate persistence result ([]) -> zero notification attempts (retry-safe)', async () => {
    // Simulates a genuine client retry reproducing the same deterministic
    // occurrence_id -- recordKnowledgeDemandEvidence itself already
    // returns [] for this case (its own test suite proves it); this test
    // proves the gate correctly propagates that into "no second email."
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([])
    await recordAndNotifyMaterialDemandEvidence(client, {
      sessionId: 'session-123',
      occurrences: [occurrence(), occurrence({ occurrence_id: 'kd-t1-c3' })],
    })
    expect(mockSendMaterialDemandAdminNotification).not.toHaveBeenCalled()
  })

  test('25. evidence persistence failure ([]) -> zero notification attempts', async () => {
    // recordKnowledgeDemandEvidence itself resolves to [] on any failure
    // (fail-open, never throws) -- indistinguishable at this seam from
    // "everything already existed," and correctly produces the same "no
    // notification" outcome either way.
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([])
    await recordAndNotifyMaterialDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })
    expect(mockSendMaterialDemandAdminNotification).not.toHaveBeenCalled()
  })

  test('26. a notification failure does not throw or propagate -- the trigger itself resolves normally even if the notification call unexpectedly rejects', async () => {
    // sendMaterialDemandAdminNotification's own real implementation never
    // rejects (proven in material-demand-admin-notification.test.ts) --
    // this test proves the trigger's OWN redundant try/catch means that
    // guarantee is not load-bearing: even a hypothetical future bug in
    // that function's error handling could never surface here as a thrown
    // exception into route.ts.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([durableRow()])
    mockSendMaterialDemandAdminNotification.mockRejectedValue(new Error('unexpected'))
    await expect(recordAndNotifyMaterialDemandEvidence(client, { sessionId: 'session-123', occurrences: [occurrence()] })).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('recordKnowledgeDemandEvidence is called with the exact sessionId/occurrences passed through unchanged', async () => {
    mockRecordKnowledgeDemandEvidence.mockResolvedValue([])
    const occurrences = [occurrence({ occurrence_id: 'kd-t5-x' })]
    await recordAndNotifyMaterialDemandEvidence(client, { sessionId: 'session-xyz', occurrences })
    expect(mockRecordKnowledgeDemandEvidence).toHaveBeenCalledWith(client, { sessionId: 'session-xyz', occurrences })
  })
})
