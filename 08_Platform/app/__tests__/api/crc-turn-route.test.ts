/**
 * Deterministic tests for POST /api/crc/turn's own pure request-parsing
 * logic (CRC Product Integration -- First Usable Live Slice, Phase 4).
 * Does not invoke GET/POST themselves (those need a live Next.js request
 * context, Anthropic credentials, and a real/mocked Supabase connection --
 * exercised by Phase 8's browser/API-level validation instead) -- this
 * covers only the one piece of the route that's a plain, deterministic
 * function: parseRequest.
 */

import { parseRequest } from '../../lib/crc-engine/api-contract'

describe('parseRequest', () => {
  test('a non-empty message is parsed as kind: message', () => {
    expect(parseRequest({ message: 'We used Runway.' })).toEqual({ kind: 'message', text: 'We used Runway.', restart: false })
  })

  test('message text is trimmed', () => {
    expect(parseRequest({ message: '  We used Runway.  ' })).toEqual({ kind: 'message', text: 'We used Runway.', restart: false })
  })

  test('a whitespace-only message is rejected as empty', () => {
    const result = parseRequest({ message: '   ' })
    expect(result).toHaveProperty('error')
  })

  test('a valid declineAction is parsed as kind: decline', () => {
    expect(parseRequest({ declineAction: 'skip_question' })).toEqual({ kind: 'decline', action: 'skip_question', restart: false })
    expect(parseRequest({ declineAction: 'skip_phase' })).toEqual({ kind: 'decline', action: 'skip_phase', restart: false })
    expect(parseRequest({ declineAction: 'stop_interview' })).toEqual({ kind: 'decline', action: 'stop_interview', restart: false })
  })

  test('an invalid declineAction value is rejected with a specific error', () => {
    const result = parseRequest({ declineAction: 'skip_everything' })
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('skip_question')
  })

  test('both message and declineAction present is rejected', () => {
    const result = parseRequest({ message: 'hi', declineAction: 'skip_question' })
    expect(result).toHaveProperty('error')
  })

  test('neither message nor declineAction is rejected', () => {
    const result = parseRequest({})
    expect(result).toHaveProperty('error')
  })

  test('restart: true is threaded through for both a message and a decline action', () => {
    expect(parseRequest({ message: 'hi', restart: true })).toEqual({ kind: 'message', text: 'hi', restart: true })
    expect(parseRequest({ declineAction: 'stop_interview', restart: true })).toEqual({ kind: 'decline', action: 'stop_interview', restart: true })
  })

  test('a non-boolean restart value is treated as false, never coerced truthy', () => {
    expect(parseRequest({ message: 'hi', restart: 'yes' })).toEqual({ kind: 'message', text: 'hi', restart: false })
  })

  test('a non-string message value (e.g. a number) is rejected, not coerced', () => {
    const result = parseRequest({ message: 12345 })
    expect(result).toHaveProperty('error')
  })

  // Results Gate milestone, 2026-08-14 -- email/resendResultEmail branches.
  // decline_email is retired along with the mid-conversation gate it
  // belonged to -- there is no more "pending message" to decline.

  test('a valid email is parsed as kind: email, trimmed and lowercased', () => {
    expect(parseRequest({ email: '  JD@Example.com  ' })).toEqual({ kind: 'email', email: 'jd@example.com', restart: false })
  })

  test('a malformed email is rejected with a specific error, not silently accepted', () => {
    const result = parseRequest({ email: 'not-an-email' })
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('email')
  })

  test('resendResultEmail: true is parsed as kind: resend_result_email', () => {
    expect(parseRequest({ resendResultEmail: true })).toEqual({ kind: 'resend_result_email', restart: false })
  })

  test('resendResultEmail: false is not treated as a resend request', () => {
    const result = parseRequest({ resendResultEmail: false })
    expect(result).toHaveProperty('error')
  })

  test('email combined with message is rejected -- exactly one of the four kinds is allowed', () => {
    const result = parseRequest({ email: 'jd@example.com', message: 'hi' })
    expect(result).toHaveProperty('error')
  })

  test('email combined with declineAction is rejected', () => {
    const result = parseRequest({ email: 'jd@example.com', declineAction: 'skip_question' })
    expect(result).toHaveProperty('error')
  })

  test('resendResultEmail combined with email is rejected', () => {
    const result = parseRequest({ resendResultEmail: true, email: 'jd@example.com' })
    expect(result).toHaveProperty('error')
  })

  test('an empty-string email is rejected the same as no email at all, not treated as a valid empty request', () => {
    const result = parseRequest({ email: '   ' })
    expect(result).toHaveProperty('error')
  })
})
