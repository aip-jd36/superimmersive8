/**
 * SupabaseSessionStore tests (CRC Product Integration -- First Usable Live
 * Slice, Phase 3). Uses a small fake Supabase client (not the global
 * __mocks__/supabaseAdmin.ts chainable stub) so each test can control
 * exactly what a query resolves to -- dependency injection (this module
 * accepts a client, never imports supabaseAdmin itself) makes this
 * possible without any jest.mock() wiring.
 *
 * Covers update()/insert() (not upsert()) call shapes -- .upsert() was
 * replaced after a confirmed live failure (2026-08-09): against the real
 * project, .upsert() reliably failed to recognize an existing row as a
 * conflict (with or without an explicit onConflict option), always
 * attempting a plain INSERT and failing NOT NULL constraints on any
 * column outside the payload. .update() and .insert() were independently
 * verified to behave correctly and predictably instead.
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
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

/** Minimal fake Supabase client covering only the chain shapes this module calls. */
function fakeClient(
  overrides: {
    selectResult?: { data: unknown; error: unknown }
    /** What .update(...).eq(...).select(...) resolves to -- data.length > 0 means "row existed, updated". */
    updateResult?: { data: unknown[] | null; error: unknown }
    insertResult?: { error: unknown }
  } = {},
) {
  const selectResult = overrides.selectResult ?? { data: null, error: null }
  const updateResult = overrides.updateResult ?? { data: [{ id: 'x' }], error: null }
  const insertResult = overrides.insertResult ?? { error: null }
  const updateCalls: unknown[] = []
  const insertCalls: unknown[] = []

  const client = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => selectResult),
        })),
      })),
      update: jest.fn((payload: unknown) => {
        updateCalls.push(payload)
        return {
          eq: jest.fn(() => ({
            select: jest.fn(async () => updateResult),
          })),
        }
      }),
      insert: jest.fn(async (payload: unknown) => {
        insertCalls.push(payload)
        return insertResult
      }),
    })),
  }
  return { client: client as any, updateCalls, insertCalls }
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
          pending_commercial_readiness_takeaway: null,
        },
        error: null,
      },
    })
    const store = createSupabaseSessionStore(client)
    const loaded = await store.load('valid-token')
    expect(loaded).toEqual({
      structured_understanding: su,
      boundary_state: boundaryState,
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    })
  })

  test('an old row missing pending_commercial_readiness_takeaway (pre-migration) defaults to null, not undefined -- backward compatible', async () => {
    const su = emptySU()
    const boundaryState = createInitialBoundaryState()
    const { client } = fakeClient({
      selectResult: {
        data: {
          structured_understanding: JSON.parse(serializeStructuredUnderstanding(su)),
          boundary_state: JSON.parse(serializeBoundaryState(boundaryState)),
          pending_clarification: null,
          // pending_commercial_readiness_takeaway deliberately absent.
        },
        error: null,
      },
    })
    const store = createSupabaseSessionStore(client)
    const loaded = await store.load('old-token')
    expect(loaded?.pending_commercial_readiness_takeaway).toBeNull()
  })

  test('a completed session (completion_reason set) round-trips its completion state correctly', async () => {
    const su: StructuredUnderstanding = { ...emptySU(), gate_1_state: 'not_met', user_goals: [],
    current_phase: 3, completion_reason: 'gate_1_unmet_exhausted' }
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
  test('an existing row (update matches) is updated, never falls through to insert', async () => {
    const { client, updateCalls, insertCalls } = fakeClient({ updateResult: { data: [{ id: 'my-token' }], error: null } })
    const store = createSupabaseSessionStore(client)
    const state: CRCSessionState = {
      structured_understanding: emptySU(),
      boundary_state: createInitialBoundaryState(),
      pending_clarification: { signal_id: 'x', kind: 'follow_up_on_signal', unresolved_summary: 'test' },
      pending_commercial_readiness_takeaway: null,
    }
    await store.save('my-token', state)
    expect(updateCalls).toHaveLength(1)
    expect(insertCalls).toHaveLength(0)
    const payload = updateCalls[0] as Record<string, unknown>
    expect(payload.pending_clarification).toEqual(state.pending_clarification)
    expect(Object.keys(payload).sort()).toEqual([
      'boundary_state',
      'pending_clarification',
      'pending_commercial_readiness_takeaway',
      'structured_understanding',
    ])
  })

  test('a brand-new token (update matches zero rows) falls through to insert, keyed by token as id', async () => {
    const { client, updateCalls, insertCalls } = fakeClient({ updateResult: { data: [], error: null } })
    const store = createSupabaseSessionStore(client)
    const state: CRCSessionState = {
      structured_understanding: emptySU(),
      boundary_state: createInitialBoundaryState(),
      pending_clarification: null,
      pending_commercial_readiness_takeaway: null,
    }
    await store.save('new-token', state)
    expect(updateCalls).toHaveLength(1)
    expect(insertCalls).toHaveLength(1)
    const payload = insertCalls[0] as Record<string, unknown>
    expect(payload.id).toBe('new-token')
    expect(Object.keys(payload).sort()).toEqual([
      'boundary_state',
      'id',
      'pending_clarification',
      'pending_commercial_readiness_takeaway',
      'structured_understanding',
    ])
  })

  test('a Supabase error on update throws, rather than silently succeeding', async () => {
    const { client } = fakeClient({ updateResult: { data: null, error: { message: 'connection failed' } } })
    const store = createSupabaseSessionStore(client)
    await expect(
      store.save('token', {
        structured_understanding: emptySU(),
        boundary_state: createInitialBoundaryState(),
        pending_clarification: null,
        pending_commercial_readiness_takeaway: null,
      }),
    ).rejects.toThrow('connection failed')
  })

  test('a Supabase error on the insert fallback throws, rather than silently succeeding', async () => {
    const { client } = fakeClient({ updateResult: { data: [], error: null }, insertResult: { error: { message: 'insert failed' } } })
    const store = createSupabaseSessionStore(client)
    await expect(
      store.save('token', {
        structured_understanding: emptySU(),
        boundary_state: createInitialBoundaryState(),
        pending_clarification: null,
        pending_commercial_readiness_takeaway: null,
      }),
    ).rejects.toThrow('insert failed')
  })
})

describe('product-layer helpers (turn_count/transcript, not part of SessionStore)', () => {
  test('loadCrcSessionProductState returns null for a missing row', async () => {
    const { client } = fakeClient({ selectResult: { data: null, error: null } })
    await expect(loadCrcSessionProductState(client, 'missing')).resolves.toBeNull()
  })

  test('loadCrcSessionProductState defaults transcript to [] when the column is null', async () => {
    const { client } = fakeClient({
      selectResult: {
        data: {
          turn_count: 2,
          transcript: null,
          updated_at: '2026-08-14T00:00:00.000Z',
          email: null,
          traffic_type: 'pilot',
          abuse_key: null,
          attribution_token: null,
          product_stop_reason: null,
          created_at: '2026-08-13T00:00:00.000Z',
          crc_lead_id: null,
          capture_notice_version: null,
          results_email_status: null,
          results_email_last_recipient: null,
        },
        error: null,
      },
    })
    await expect(loadCrcSessionProductState(client, 'token')).resolves.toEqual({
      turn_count: 2,
      transcript: [],
      updated_at: '2026-08-14T00:00:00.000Z',
      email: null,
      traffic_type: 'pilot',
      abuse_key: null,
      attribution_token: null,
      product_stop_reason: null,
      created_at: '2026-08-13T00:00:00.000Z',
      crc_lead_id: null,
      capture_notice_version: null,
      results_email_status: null,
      results_email_last_recipient: null,
    })
  })

  test('saveCrcSessionProductState writes only turn_count/transcript via update(), never the engine-state columns', async () => {
    const { client, updateCalls } = fakeClient({ updateResult: { data: [{ id: 'token' }], error: null } })
    await saveCrcSessionProductState(client, 'token', { turn_count: 3, transcript: [{ role: 'user', text: 'hi' }] })
    const payload = updateCalls[0] as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['transcript', 'turn_count'])
  })

  test('saveCrcSessionProductState throws on a Supabase error', async () => {
    const { client } = fakeClient({ updateResult: { data: null, error: { message: 'write failed' } } })
    await expect(saveCrcSessionProductState(client, 'token', { turn_count: 1, transcript: [] })).rejects.toThrow('write failed')
  })

  test('saveCrcSessionProductState throws if zero rows matched -- the documented precondition (row already exists) was violated', async () => {
    const { client } = fakeClient({ updateResult: { data: [], error: null } })
    await expect(saveCrcSessionProductState(client, 'nonexistent-token', { turn_count: 1, transcript: [] })).rejects.toThrow('no row found for token')
  })
})
