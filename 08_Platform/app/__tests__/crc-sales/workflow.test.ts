/**
 * CAH-3B — Sales workflow state machine (§8, §23.F).
 */

import { validateTransition, timestampColumnFor, SALES_STATUSES, SALES_CLOSE_REASONS } from '@/lib/crc-sales/workflow'

describe('validateTransition — valid paths', () => {
  test('NEW → CONTACTED', () => {
    expect(validateTransition('NEW', 'CONTACTED', null)).toEqual({ ok: true, to: 'CONTACTED', close_reason: null })
  })
  test('NEW → CLOSED{reason} allowed', () => {
    expect(validateTransition('NEW', 'CLOSED', 'not_a_fit')).toEqual({ ok: true, to: 'CLOSED', close_reason: 'not_a_fit' })
  })
  test('CONTACTED → CONVERTING', () => {
    expect(validateTransition('CONTACTED', 'CONVERTING', null).ok).toBe(true)
  })
  test('CONTACTED → CLOSED{reason}', () => {
    expect(validateTransition('CONTACTED', 'CLOSED', 'declined').ok).toBe(true)
  })
  test('CONVERTING → CLOSED{converted}', () => {
    expect(validateTransition('CONVERTING', 'CLOSED', 'converted').ok).toBe(true)
  })
  test('CLOSED → CONTACTED (single reopen path)', () => {
    expect(validateTransition('CLOSED', 'CONTACTED', null).ok).toBe(true)
  })
})

describe('validateTransition — rejected', () => {
  test('NEW → CONVERTING rejected (customer cannot agree before contact)', () => {
    expect(validateTransition('NEW', 'CONVERTING', null)).toEqual({ ok: false, code: 'invalid_transition' })
  })
  test('re-issuing current status rejected (not a silent no-op)', () => {
    expect(validateTransition('CONTACTED', 'CONTACTED', null)).toEqual({ ok: false, code: 'invalid_transition' })
    expect(validateTransition('NEW', 'NEW', null)).toEqual({ ok: false, code: 'invalid_transition' })
  })
  test('CONVERTING → CONTACTED rejected', () => {
    expect(validateTransition('CONVERTING', 'CONTACTED', null).ok).toBe(false)
  })
  test('CLOSED → CONVERTING rejected', () => {
    expect(validateTransition('CLOSED', 'CONVERTING', null).ok).toBe(false)
  })
  test('CLOSED without close_reason rejected', () => {
    expect(validateTransition('CONTACTED', 'CLOSED', null)).toEqual({ ok: false, code: 'missing_close_reason' })
  })
  test('non-CLOSED with a close_reason rejected', () => {
    expect(validateTransition('NEW', 'CONTACTED', 'declined')).toEqual({ ok: false, code: 'unexpected_close_reason' })
  })
  test('unknown close_reason rejected', () => {
    expect(validateTransition('NEW', 'CLOSED', 'bogus' as never)).toEqual({ ok: false, code: 'unknown_close_reason' })
  })
  test('unknown status rejected', () => {
    expect(validateTransition('NEW', 'WAT' as never, null)).toEqual({ ok: false, code: 'unknown_status' })
    expect(validateTransition('WAT' as never, 'CONTACTED', null)).toEqual({ ok: false, code: 'unknown_status' })
  })
})

describe('timestampColumnFor', () => {
  test('maps each transition target to the right column', () => {
    expect(timestampColumnFor('CONTACTED')).toBe('contacted_at')
    expect(timestampColumnFor('CONVERTING')).toBe('converting_at')
    expect(timestampColumnFor('CLOSED')).toBe('closed_at')
    expect(timestampColumnFor('NEW')).toBeNull()
  })
})

describe('enums', () => {
  test('close reasons are a small bounded set', () => {
    expect(SALES_CLOSE_REASONS).toEqual(['converted', 'declined', 'not_a_fit', 'unreachable', 'no_response'])
  })
  test('no REVIEWED state', () => {
    expect(SALES_STATUSES).not.toContain('REVIEWED')
    expect(SALES_STATUSES).toEqual(['NEW', 'CONTACTED', 'CONVERTING', 'CLOSED'])
  })
})
