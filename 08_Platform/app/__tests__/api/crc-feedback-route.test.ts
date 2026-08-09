/**
 * Deterministic tests for POST /api/crc/feedback's own pure
 * request-parsing logic (CRC Limited Pilot, Part 3). Same discipline as
 * crc-turn-route.test.ts: only the plain, deterministic parseFeedbackRequest
 * function is covered here, not GET/POST themselves.
 */

import { parseFeedbackRequest } from '../../lib/crc-engine/api-contract'

describe('parseFeedbackRequest', () => {
  test('each valid rating is parsed with a null text', () => {
    expect(parseFeedbackRequest({ rating: 'yes' })).toEqual({ rating: 'yes', text: null })
    expect(parseFeedbackRequest({ rating: 'somewhat' })).toEqual({ rating: 'somewhat', text: null })
    expect(parseFeedbackRequest({ rating: 'no' })).toEqual({ rating: 'no', text: null })
  })

  test('an invalid rating value is rejected with a specific error', () => {
    const result = parseFeedbackRequest({ rating: 'definitely' })
    expect(result).toHaveProperty('error')
    expect((result as { error: string }).error).toContain('yes')
  })

  test('a missing rating is rejected', () => {
    const result = parseFeedbackRequest({})
    expect(result).toHaveProperty('error')
  })

  test('text is trimmed and carried through when present', () => {
    expect(parseFeedbackRequest({ rating: 'yes', text: '  helpful, thanks  ' })).toEqual({ rating: 'yes', text: 'helpful, thanks' })
  })

  test('a whitespace-only text is normalized to null', () => {
    expect(parseFeedbackRequest({ rating: 'yes', text: '   ' })).toEqual({ rating: 'yes', text: null })
  })

  test('a non-string text value is rejected, not coerced', () => {
    const result = parseFeedbackRequest({ rating: 'yes', text: 12345 })
    expect(result).toHaveProperty('error')
  })
})
