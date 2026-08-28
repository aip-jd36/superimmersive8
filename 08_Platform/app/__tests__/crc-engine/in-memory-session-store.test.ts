/**
 * In-memory SessionStore test double -- deterministic round-trip tests
 * (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §6/§7, Live Interview Runtime
 * milestone).
 */

import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import type { CRCSessionState } from '@/lib/crc-engine/types'
import type { StructuredUnderstanding } from '@/types/interview-engine'

function emptySU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function state(overrides: Partial<CRCSessionState> = {}): CRCSessionState {
  return {
    structured_understanding: emptySU(),
    boundary_state: createInitialBoundaryState(),
    pending_clarification: null,
    pending_commercial_readiness_takeaway: null,
    ...overrides,
  }
}

describe('createInMemorySessionStore', () => {
  test('load on an unknown token returns null, never throws', async () => {
    const store = createInMemorySessionStore()
    expect(await store.load('unknown-token')).toBeNull()
  })

  test('save then load returns the exact same state, round-trip', async () => {
    const store = createInMemorySessionStore()
    const saved = state({ pending_clarification: { signal_id: 'tm-1', kind: 'follow_up_on_signal', unresolved_summary: "tool mention 'Kling'" } })
    await store.save('token-1', saved)
    expect(await store.load('token-1')).toEqual(saved)
  })

  test('saving again under the same token overwrites, does not merge', async () => {
    const store = createInMemorySessionStore()
    await store.save('token-1', state({ pending_clarification: null }))
    const second = state({ pending_clarification: { signal_id: 'tm-1', kind: 'uncertainty_clarification', unresolved_summary: 'x' } })
    await store.save('token-1', second)
    expect(await store.load('token-1')).toEqual(second)
  })

  test('two different tokens are stored independently', async () => {
    const store = createInMemorySessionStore()
    const a = state({ boundary_state: { ...createInitialBoundaryState(), phases_ended: [1] } })
    const b = state({ boundary_state: { ...createInitialBoundaryState(), phases_ended: [2] } })
    await store.save('token-a', a)
    await store.save('token-b', b)
    expect(await store.load('token-a')).toEqual(a)
    expect(await store.load('token-b')).toEqual(b)
  })
})
