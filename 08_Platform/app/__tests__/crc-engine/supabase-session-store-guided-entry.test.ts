/**
 * Guided Entry Foundation (GE-1) — createGuidedEntrySession() persistence
 * tests. Same small-fake-client dependency-injection pattern as the
 * existing supabase-session-store.test.ts (not the global chainable
 * __mocks__ stub), so each test controls exactly what a query resolves to.
 *
 * Run: npx jest __tests__/crc-engine/supabase-session-store-guided-entry.test.ts
 */

import { createGuidedEntrySession, loadCrcSessionProductState } from '../../lib/crc-engine/supabase-session-store'

function fakeClient(overrides: { insertResult?: { error: unknown }; selectResult?: { data: unknown; error: unknown } } = {}) {
  const insertResult = overrides.insertResult ?? { error: null }
  const selectResult = overrides.selectResult ?? { data: null, error: null }
  const insertCalls: unknown[] = []

  const client = {
    from: jest.fn(() => ({
      insert: jest.fn(async (payload: unknown) => {
        insertCalls.push(payload)
        return insertResult
      }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => selectResult),
        })),
      })),
    })),
  }
  return { client: client as any, insertCalls }
}

const BASE_INPUT = {
  token: 'tok-abc',
  structured_understanding: { fake: 'su' },
  boundary_state: { fake: 'boundary' },
  guided_entry_definition_id: 'agency-producing-for-client',
  guided_entry_definition_version: 'v1',
  traffic_type: 'pilot',
  abuse_key: null,
  runtime_commit: 'abc123',
  model_config: {},
  attribution_token: 'attr-1',
}

describe('createGuidedEntrySession', () => {
  test('a clean insert returns outcome "created", with initialization_source guided in the single insert payload', async () => {
    const { client, insertCalls } = fakeClient({ insertResult: { error: null } })
    const result = await createGuidedEntrySession(client, BASE_INPUT)
    expect(result.outcome).toBe('created')
    expect(insertCalls).toHaveLength(1)
    const payload = insertCalls[0] as Record<string, unknown>
    expect(payload.id).toBe('tok-abc')
    expect(payload.initialization_source).toBe('guided')
    expect(payload.guided_entry_definition_id).toBe('agency-producing-for-client')
    expect(payload.guided_entry_definition_version).toBe('v1')
    // turn_count starts at 1, not 0: the guided initialization itself is
    // turn 1 -- see createGuidedEntrySession's own header for why.
    expect(payload.turn_count).toBe(1)
    expect(payload.structured_understanding).toEqual({ fake: 'su' })
  })

  test('a duplicate-key error, when the existing row matches this exact definition id/version, resolves as "already_initialized" (legitimate idempotent retry)', async () => {
    const { client } = fakeClient({
      insertResult: { error: { code: '23505', message: 'duplicate key' } },
      selectResult: {
        data: {
          turn_count: 1,
          transcript: [],
          updated_at: 'now',
          email: null,
          traffic_type: 'pilot',
          abuse_key: null,
          attribution_token: 'attr-1',
          product_stop_reason: null,
          created_at: 'now',
          crc_lead_id: null,
          capture_notice_version: null,
          results_email_status: null,
          results_email_last_recipient: null,
          initialization_source: 'guided',
          guided_entry_definition_id: 'agency-producing-for-client',
          guided_entry_definition_version: 'v1',
        },
        error: null,
      },
    })
    const result = await createGuidedEntrySession(client, BASE_INPUT)
    expect(result.outcome).toBe('already_initialized')
  })

  test('a duplicate-key error against a row that is NOT guided, or has a different definition, resolves as "conflict" -- never silently reused', async () => {
    const { client } = fakeClient({
      insertResult: { error: { code: '23505', message: 'duplicate key' } },
      selectResult: {
        data: {
          turn_count: 3,
          transcript: [],
          updated_at: 'now',
          email: null,
          traffic_type: 'pilot',
          abuse_key: null,
          attribution_token: 'attr-other',
          product_stop_reason: null,
          created_at: 'now',
          crc_lead_id: null,
          capture_notice_version: null,
          results_email_status: null,
          results_email_last_recipient: null,
          initialization_source: 'free_form',
          guided_entry_definition_id: null,
          guided_entry_definition_version: null,
        },
        error: null,
      },
    })
    const result = await createGuidedEntrySession(client, BASE_INPUT)
    expect(result.outcome).toBe('conflict')
  })

  test('a non-duplicate-key insert error is thrown, not swallowed as a retry signal', async () => {
    const { client } = fakeClient({ insertResult: { error: { code: '42501', message: 'permission denied' } } })
    await expect(createGuidedEntrySession(client, BASE_INPUT)).rejects.toThrow(/createGuidedEntrySession failed/)
  })
})

describe('loadCrcSessionProductState — GE-1 fields', () => {
  test('initialization_source/guided_entry_definition_id/version round-trip, defaulting to null when absent', async () => {
    const { client } = fakeClient({
      selectResult: {
        data: {
          turn_count: 2,
          transcript: [],
          updated_at: 'now',
          email: null,
          traffic_type: 'pilot',
          abuse_key: null,
          attribution_token: null,
          product_stop_reason: null,
          created_at: 'now',
          crc_lead_id: null,
          capture_notice_version: null,
          results_email_status: null,
          results_email_last_recipient: null,
          // GE-1 columns omitted entirely -- simulates a pre-migration/historical row.
        },
        error: null,
      },
    })
    const state = await loadCrcSessionProductState(client, 'tok')
    expect(state?.initialization_source).toBeNull()
    expect(state?.guided_entry_definition_id).toBeNull()
    expect(state?.guided_entry_definition_version).toBeNull()
  })
})
