/**
 * CRC-OPS-NOTIFY-1 (2026-09-23) -- shouldNotifyCrcSessionStarted /
 * shouldNotifyCrcResultsEmailCaptured pure predicate tests. These are the
 * actual gating DECISION route.ts relies on; see that module's own header
 * for why the decision is extracted here rather than tested only via a
 * (nonexistent) full route-handler integration harness.
 */

import { shouldNotifyCrcSessionStarted, shouldNotifyCrcResultsEmailCaptured } from '../../lib/crc-engine/crc-usage-notification-trigger'

describe('shouldNotifyCrcSessionStarted', () => {
  test('pilot (genuine external) traffic => true', () => {
    expect(shouldNotifyCrcSessionStarted('pilot')).toBe(true)
  })

  test('internal_test traffic => false, never notifies', () => {
    expect(shouldNotifyCrcSessionStarted('internal_test')).toBe(false)
  })
})

describe('shouldNotifyCrcResultsEmailCaptured', () => {
  test('genuine first acceptance (sent, not already accepted before, real pilot traffic) => true', () => {
    expect(shouldNotifyCrcResultsEmailCaptured('sent', false, 'pilot')).toBe(true)
  })

  test('idempotent retry (already_sent) => false, regardless of prior-acceptance state or traffic type', () => {
    expect(shouldNotifyCrcResultsEmailCaptured('already_sent', false, 'pilot')).toBe(false)
    expect(shouldNotifyCrcResultsEmailCaptured('already_sent', true, 'pilot')).toBe(false)
  })

  test('a later legitimate resend that is newly accepted (sent, but already accepted before) => false -- not another CRC completion, per PM clarification', () => {
    expect(shouldNotifyCrcResultsEmailCaptured('sent', true, 'pilot')).toBe(false)
  })

  test('internal_test traffic => false even on a genuine first acceptance', () => {
    expect(shouldNotifyCrcResultsEmailCaptured('sent', false, 'internal_test')).toBe(false)
  })

  test('every non-"sent" delivery kind => false', () => {
    for (const kind of ['blocked', 'lead_persistence_failed', 'send_failed', 'send_unknown']) {
      expect(shouldNotifyCrcResultsEmailCaptured(kind, false, 'pilot')).toBe(false)
    }
  })
})
