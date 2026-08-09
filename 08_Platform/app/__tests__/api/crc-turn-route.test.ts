/**
 * Deterministic tests for POST /api/crc/turn's own pure request-parsing
 * logic (CRC Product Integration -- First Usable Live Slice, Phase 4).
 * Does not invoke GET/POST themselves (those need a live Next.js request
 * context, Anthropic credentials, and a real/mocked Supabase connection --
 * exercised by Phase 8's browser/API-level validation instead) -- this
 * covers only the one piece of the route that's a plain, deterministic
 * function: parseRequest.
 */

import { parseRequest } from '../../app/api/crc/turn/route'

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
})
