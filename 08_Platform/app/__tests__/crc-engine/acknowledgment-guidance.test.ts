/**
 * Presentation-only guidance decision (CRC Limited Pilot -- pilot UX
 * finding, 2026-08-10). Deterministic pure-function tests, matching this
 * project's own established testing convention -- no component-rendering
 * infrastructure exists in this repo, and this fix doesn't need one: the
 * exact decision CrcPage renders from is tested directly.
 *
 * Does not modify or reference any Interview Engine/Runtime/Retrieval/
 * Projection fixture or expectation -- this is presentation-layer only.
 */

import { shouldShowAcknowledgmentGuidance } from '../../lib/crc-engine/acknowledgment-guidance'

describe('shouldShowAcknowledgmentGuidance', () => {
  test('non-complete acknowledgment (idle + last outcome was acknowledgment) -> guidance visible', () => {
    expect(shouldShowAcknowledgmentGuidance('idle', true)).toBe(true)
  })

  test('a real assistant question just landed (idle, but last outcome was NOT an acknowledgment) -> guidance absent', () => {
    expect(shouldShowAcknowledgmentGuidance('idle', false)).toBe(false)
  })

  test('the interview completed -> guidance absent, regardless of the flag', () => {
    expect(shouldShowAcknowledgmentGuidance('complete', true)).toBe(false)
    expect(shouldShowAcknowledgmentGuidance('complete', false)).toBe(false)
  })

  test('a retryable technical error occurred -> guidance absent, regardless of the flag', () => {
    expect(shouldShowAcknowledgmentGuidance('retry', true)).toBe(false)
    expect(shouldShowAcknowledgmentGuidance('retry', false)).toBe(false)
  })

  test('the session could not be resumed -> guidance absent, regardless of the flag', () => {
    expect(shouldShowAcknowledgmentGuidance('session_not_found', true)).toBe(false)
    expect(shouldShowAcknowledgmentGuidance('session_not_found', false)).toBe(false)
  })

  test('a send is currently in flight -> guidance absent (the user is already acting)', () => {
    expect(shouldShowAcknowledgmentGuidance('sending', true)).toBe(false)
  })

  test('initial page load -> guidance absent', () => {
    expect(shouldShowAcknowledgmentGuidance('loading', true)).toBe(false)
  })

  test('the user already pressed Stop: stop_interview always completes the same turn (completion.ts fix), so this state is covered by the "completed" case above, never reachable as idle+acknowledgment', () => {
    // No separate phase value exists for "just pressed Stop" -- a
    // stop_interview decline either lands on 'complete' (the only
    // reachable outcome, per the interview-scope-decline completion fix)
    // or, on a genuine technical failure, 'retry' -- both already covered.
    expect(shouldShowAcknowledgmentGuidance('complete', false)).toBe(false)
  })

  test('the exact pilot transcript that exposed this: Kling, social-media advertising, free tier, acknowledgment -> guidance visible instead of an apparent stall', () => {
    // Mirrors the reported real-user state 1:1: runTurn() returned only an
    // acknowledgment (Constraint A/B suppressed the one candidate this
    // turn, per the confirmed diagnosis), the interview is not complete,
    // and the page is idle, awaiting the user's next action.
    expect(shouldShowAcknowledgmentGuidance('idle', true)).toBe(true)
  })
})
