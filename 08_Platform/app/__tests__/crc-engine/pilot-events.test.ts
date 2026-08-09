/**
 * logPilotEvent tests (CRC Limited Pilot milestone). Same fake-client
 * dependency-injection pattern as supabase-session-store.test.ts.
 */

import { logPilotEvent } from '../../lib/crc-engine/pilot-events'

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

describe('logPilotEvent', () => {
  test('writes session_id, event_type, and detail', async () => {
    const { client, insertCalls } = fakeClient()
    await logPilotEvent(client, { session_id: 'token-123', event_type: 'skip_question', detail: null })
    expect(insertCalls).toEqual([{ session_id: 'token-123', event_type: 'skip_question', detail: null }])
  })

  test('detail defaults to null when omitted', async () => {
    const { client, insertCalls } = fakeClient()
    await logPilotEvent(client, { session_id: 'token-123', event_type: 'stop_interview' })
    expect((insertCalls[0] as any).detail).toBeNull()
  })

  test('accepts a null session_id (no resolvable token)', async () => {
    const { client, insertCalls } = fakeClient()
    await logPilotEvent(client, { session_id: null, event_type: 'missing_session' })
    expect((insertCalls[0] as any).session_id).toBeNull()
  })

  test('a Supabase error does not throw -- best-effort logging only', async () => {
    const { client } = fakeClient({ insertResult: { error: { message: 'write failed' } } })
    await expect(logPilotEvent(client, { session_id: 'x', event_type: 'retryable_failure' })).resolves.toBeUndefined()
  })

  test('an unexpected exception from the client does not throw', async () => {
    const client = {
      from: jest.fn(() => {
        throw new Error('client blew up')
      }),
    } as any
    await expect(logPilotEvent(client, { session_id: 'x', event_type: 'persistence_error' })).resolves.toBeUndefined()
  })
})
