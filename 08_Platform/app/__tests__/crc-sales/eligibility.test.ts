/**
 * CAH-3B — Sales lead eligibility (§6, §23.A, Correction 1).
 */

import { isSalesEligible, SALES_ELIGIBLE_COMPLETION_REASONS, type SalesEligibilityInput } from '@/lib/crc-sales/eligibility'
import { COMPLETION_REASONS } from '@/types/interview-engine'

const CONTACTABLE = { email: 'a@b.com', identity_source: 'email_gate', crc_lead_id: 'lead-1' } as const

function input(overrides: Partial<SalesEligibilityInput>): SalesEligibilityInput {
  return { completion_reason: 'gate_1_gate_2_met', ...CONTACTABLE, ...overrides }
}

describe('isSalesEligible', () => {
  test('completed (any governed completion_reason) + email-gate email + lead id → eligible', () => {
    for (const r of COMPLETION_REASONS) {
      expect(isSalesEligible(input({ completion_reason: r }))).toBe(true)
    }
  })

  test('completed + NO email → not eligible', () => {
    expect(isSalesEligible(input({ email: null }))).toBe(false)
    expect(isSalesEligible(input({ email: '' }))).toBe(false)
    expect(isSalesEligible(input({ email: '   ' }))).toBe(false)
  })

  test('incomplete (completion_reason null) + email → not eligible', () => {
    expect(isSalesEligible(input({ completion_reason: null }))).toBe(false)
  })

  test('completion_reason null but session "done" only via product_stop_reason → NOT eligible (Correction 1)', () => {
    // The eligibility predicate has no product_stop_reason input at all: a
    // session that reached a terminal PRODUCT state (conversation_limit_reached
    // / email_declined) without a governed completion_reason cannot be
    // represented as eligible here. This test documents that the input shape
    // itself excludes it.
    expect(isSalesEligible(input({ completion_reason: null }))).toBe(false)
    expect(Object.keys(input({})).includes('product_stop_reason')).toBe(false)
  })

  test('no crc_lead_id → not eligible', () => {
    expect(isSalesEligible(input({ crc_lead_id: null }))).toBe(false)
  })

  test('identity_source other than email_gate → not eligible', () => {
    expect(isSalesEligible(input({ identity_source: null }))).toBe(false)
    expect(isSalesEligible(input({ identity_source: 'something_else' }))).toBe(false)
  })

  test('an unrecognised completion_reason string → not eligible (exhaustive set, not != null)', () => {
    expect(isSalesEligible(input({ completion_reason: 'made_up_value' as never }))).toBe(false)
  })

  test('SALES_ELIGIBLE_COMPLETION_REASONS is exactly the five governed values', () => {
    expect([...SALES_ELIGIBLE_COMPLETION_REASONS].sort()).toEqual([...COMPLETION_REASONS].sort())
    expect(SALES_ELIGIBLE_COMPLETION_REASONS.size).toBe(5)
  })
})
