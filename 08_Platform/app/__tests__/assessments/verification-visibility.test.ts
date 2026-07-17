/**
 * Unit tests for the public Verification Page exposure gate.
 *
 * findAssessmentForVerification() must only resolve assessments that have
 * actually been DELIVERED. DRAFT, REPORT_GENERATED, SIGNING, SIGNED, and
 * FAILED rows must resolve identically to a nonexistent assessment number.
 *
 * Run: npx jest __tests__/assessments/verification-visibility.test.ts
 */

import { isPubliclyVisibleProcessingStatus } from '../../lib/assessments/repository'
import { PROCESSING_STATUSES, type ProcessingStatus } from '../../types/assessment'

describe('isPubliclyVisibleProcessingStatus', () => {
  test('DRAFT is not publicly visible', () => {
    expect(isPubliclyVisibleProcessingStatus('DRAFT')).toBe(false)
  })

  test('REPORT_GENERATED is not publicly visible', () => {
    expect(isPubliclyVisibleProcessingStatus('REPORT_GENERATED')).toBe(false)
  })

  test('SIGNING is not publicly visible', () => {
    expect(isPubliclyVisibleProcessingStatus('SIGNING')).toBe(false)
  })

  test('SIGNED is not publicly visible — signing success does not imply issuance', () => {
    // Deliberately distinct from DELIVERED: artifacts may be technically
    // complete while delivery to the customer has not yet happened or failed.
    expect(isPubliclyVisibleProcessingStatus('SIGNED')).toBe(false)
  })

  test('DELIVERED is publicly visible', () => {
    expect(isPubliclyVisibleProcessingStatus('DELIVERED')).toBe(true)
  })

  test('FAILED is not publicly visible', () => {
    expect(isPubliclyVisibleProcessingStatus('FAILED')).toBe(false)
  })

  test('exactly one processing status is publicly visible', () => {
    const visible = PROCESSING_STATUSES.filter(isPubliclyVisibleProcessingStatus)
    expect(visible).toEqual(['DELIVERED'])
  })

  test('every known processing status is covered by the predicate without throwing', () => {
    // Defensive: if PROCESSING_STATUSES grows, this test forces a conscious
    // decision about the new status's public-visibility rather than a silent
    // fallthrough to "visible" or "hidden".
    for (const status of PROCESSING_STATUSES) {
      expect(() => isPubliclyVisibleProcessingStatus(status as ProcessingStatus)).not.toThrow()
    }
  })
})
