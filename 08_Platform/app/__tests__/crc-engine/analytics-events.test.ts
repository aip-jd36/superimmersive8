/**
 * crc_analytics_events logging tests (CRC Identity + Abuse Prevention +
 * Analytics milestone, design report §8).
 */

import { logAnalyticsEvent, logBridgeShownEventOnce } from '../../lib/crc-engine/analytics-events'

function fakeClient(overrides: { selectResult?: { data: unknown[] | null; error: unknown }; insertResult?: { error: unknown } } = {}) {
  const selectResult = overrides.selectResult ?? { data: [], error: null }
  const insertResult = overrides.insertResult ?? { error: null }
  const insertCalls: unknown[] = []
  const client = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(async () => selectResult),
          })),
        })),
      })),
      insert: jest.fn(async (payload: unknown) => {
        insertCalls.push(payload)
        return insertResult
      }),
    })),
  }
  return { client: client as any, insertCalls }
}

describe('logAnalyticsEvent', () => {
  test('inserts session_id/event_type/event_data', async () => {
    const { client, insertCalls } = fakeClient()
    await logAnalyticsEvent(client, { session_id: 's1', event_type: 'cta_click', event_data: { destination: 'calendly' } })
    expect(insertCalls).toEqual([{ session_id: 's1', event_type: 'cta_click', event_data: { destination: 'calendly' } }])
  })

  test('event_data defaults to null when omitted', async () => {
    const { client, insertCalls } = fakeClient()
    await logAnalyticsEvent(client, { session_id: 's1', event_type: 'discovery_signal' })
    expect(insertCalls).toEqual([{ session_id: 's1', event_type: 'discovery_signal', event_data: null }])
  })

  test('never throws, even if the insert fails -- analytics failures must never break the user-facing flow', async () => {
    const { client } = fakeClient({ insertResult: { error: { message: 'insert failed' } } })
    await expect(logAnalyticsEvent(client, { session_id: 's1', event_type: 'cta_click' })).resolves.toBeUndefined()
  })
})

describe('logBridgeShownEventOnce', () => {
  test('inserts when no prior impression row exists for this session', async () => {
    const { client, insertCalls } = fakeClient({ selectResult: { data: [], error: null } })
    await logBridgeShownEventOnce(client, 's1')
    expect(insertCalls).toEqual([{ session_id: 's1', event_type: 'commercial_assurance_bridge_shown', event_data: null }])
  })

  test('does NOT insert a second time when a prior impression row already exists -- exactly-once, not once-per-mount', async () => {
    const { client, insertCalls } = fakeClient({ selectResult: { data: [{ id: 'existing-row' }], error: null } })
    await logBridgeShownEventOnce(client, 's1')
    expect(insertCalls).toEqual([])
  })

  test('never throws if the existence check itself fails', async () => {
    const { client } = fakeClient({ selectResult: { data: null, error: { message: 'query failed' } } })
    await expect(logBridgeShownEventOnce(client, 's1')).resolves.toBeUndefined()
  })
})
