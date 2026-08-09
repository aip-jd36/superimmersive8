/**
 * SupabaseSessionStore tests (CRC Product Integration -- First Usable Live
 * Slice, Phase 3). Uses a small fake Supabase client (not the global
 * __mocks__/supabaseAdmin.ts chainable stub) so each test can control
 * exactly what a query resolves to -- dependency injection (this module
 * accepts a client, never imports supabaseAdmin itself) makes this
 * possible without any jest.mock() wiring.
 */

import {
  createSupabaseSessionStore,
  loadCrcSessionProductState,
  saveCrcSessionProductState,
} from '../../lib/crc-engine/supabase-session-store'
import { serializeStructuredUnderstanding, serializeBoundaryState } from '../../lib/interview-engine/serialization'
import { createInitialBoundaryState } from '../../lib/interview-engine/boundaries'
import type { StructuredUnderstanding } from '../../types/interview-engine'
import type { CRCSessionState } from '../../lib/crc-engine/types'

function emptySU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

/** Minimal fake Supabase client covering only the chain shapes this module calls. */
function fakeClient(overrides: {
  selectResult?: { data: unknown; error: unknown }
  upsertResult?: { error: unknown }
} = {}) {
  const selectResult = overrides.selectResult ?? { data: null, error: null }
  const upsertResult = overrides.upsertResult ?? { error: null }
  const upsertCalls: unknown[] = []

  const client = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => selectResult),
        })),
      })),
      upsert: jest.fn(async (payload: unknown) => {
        upsertCalls.push(payload)
        return upsertResult
      }),
    })),
  }
  return { client: client as any, upsertCalls }
}

describe('createSupabaseSessionStore: load', () => {
  test('no matching row returns null, not a thrown error', async () => {
    const { client } = fakeClient({ selectResult: { data: null, error: null } })
    const store = createSupabaseSessionStore(client)
    await expect(store.load('missing-token')).resolves.toBeNull()
  })

  test('a query error returns null, not a thrown error', async () => {
    const { client } = fakeClient({ selectResult: { data: null, error: { message: 'connection failed' } } })
    const store = createSupabaseSessionStore(client)
    await expect(store.load('any-token')).resolves.toBeNull()
  })

  test('corrupt stored JSON returns null, not a thrown error', async () => {
    // deserializeStructuredUnderstanding/deserializeBoundaryState are thin
    // JSON.parse wrappers with no runtime shape validation (an unchecked
    // `as T` cast -- see serialization.ts's own header) -- the only way
    // this module's own catch branch actually fires is a genuine JSON
    // parse failure. `undefined` reliably forces that: JSON.stringify(undefined)
    // produces the bare value `undefined` (not a string), which JSON.parse
    // coerces to the string "undefined" and then fails to parse as JSON.
    const { client } = fakeClient({
      selectResult: {
        data: { structured_understanding: undefined, boundary_state: {}, pending_clarification: null },
        error: null,
      },
    })
    const store = createSupabaseSessionStore(client)
    await expect(store.load('corrupt-token')).resolves.toBeNull()
  })

  test('a valid row round-trips correctly via the existing serialization helpers', async () => {
    const su = emptySU()
    const boundaryState = createInitialBoundaryState()
    const { client } = fakeClient({
      selectResult: {
        data: {
          structured_understanding: JSON.parse(serializeStructuredUnderstanding(su)),
          boundary_state: JSON.parse(serializeBoundaryState(boundaryState)),
          pending_clarification: null,
        },
        error: null,
      },
    })
    const store = createSupabaseSessionStore(client)
    const loaded = await store.load('valid-token')
    expect(loaded).toEqual({ structured_understanding: su, boundary_state: boundaryState, pending_clarification: null })
  })

  test('a completed session (completion_reason set) round-trips its completion state correctly', async () => {
    const su: StructuredUnderstanding = { ...emptySU(), gate_1_state: 'not_met', current_phase: 3, completion_reason: 'gate_1_unmet_exhausted' }
    const { client } = fakeClient({
      selectResult: {
        data: {
          structured_understanding: JSON.parse(serializeStructuredUnderstanding(su)),
          boundary_state: JSON.parse(serializeBoundaryState(createInitialBoundaryState())),
          pending_clarification: null,
        },
        error: null,
      },
    })
    const store = createSupabaseSessionStore(client)
    const loaded = await store.load('completed-token')
    expect(loaded?.structured_understanding.completion_reason).toBe('gate_1_unmet_exhausted')
  })
})

describe('createSupabaseSessionStore: save', () => {
  test('writes exactly the three CRCSessionState fields, keyed by token as id', async () => {
    const { client, upsertCalls } = fakeClient()
    const store = createSupabaseSessionStore(client)
    const state: CRCSessionState = {
      structured_understanding: emptySU(),
      boundary_state: createInitialBoundaryState(),
      pending_clarification: { signal_id: 'x', kind: 'follow_up_on_signal', unresolved_summary: 'test' },
    }
    await store.save('my-token', state)
    expect(upsertCalls).toHaveLength(1)
    const payload = upsertCalls[0] as Record<string, unknown>
    expect(payload.id).toBe('my-token')
    expect(payload.pending_clarification).toEqual(state.pending_clarification)
    expect(Object.keys(payload).sort()).toEqual(['boundary_state', 'id', 'pending_clarification', 'structured_understanding'])
  })

  test('a Supabase error on save throws, rather than silently succeeding', async () => {
    const { client } = fakeClient({ upsertResult: { error: { message: 'unique violation' } } })
    const store = createSupabaseSessionStore(client)
    await expect(
      store.save('token', { structured_understanding: emptySU(), boundary_state: createInitialBoundaryState(), pending_clarification: null }),
    ).rejects.toThrow('unique violation')
  })
})

describe('product-layer helpers (turn_count/transcript, not part of SessionStore)', () => {
  test('loadCrcSessionProductState returns null for a missing row', async () => {
    const { client } = fakeClient({ selectResult: { data: null, error: null } })
    await expect(loadCrcSessionProductState(client, 'missing')).resolves.toBeNull()
  })

  test('loadCrcSessionProductState defaults transcript to [] when the column is null', async () => {
    const { client } = fakeClient({ selectResult: { data: { turn_count: 2, transcript: null }, error: null } })
    await expect(loadCrcSessionProductState(client, 'token')).resolves.toEqual({ turn_count: 2, transcript: [] })
  })

  test('saveCrcSessionProductState writes only turn_count/transcript, never the engine-state columns', async () => {
    const { client, upsertCalls } = fakeClient()
    await saveCrcSessionProductState(client, 'token', { turn_count: 3, transcript: [{ role: 'user', text: 'hi' }] })
    const payload = upsertCalls[0] as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['id', 'transcript', 'turn_count'])
  })

  test('saveCrcSessionProductState throws on a Supabase error', async () => {
    const { client } = fakeClient({ upsertResult: { error: { message: 'write failed' } } })
    await expect(saveCrcSessionProductState(client, 'token', { turn_count: 1, transcript: [] })).rejects.toThrow('write failed')
  })
})
