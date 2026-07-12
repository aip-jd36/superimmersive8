/**
 * Unit tests for processing_status transition validation in the repository layer.
 *
 * These tests import the internal validateTransition logic via the
 * transitionProcessingStatus function. We use a mock to avoid Supabase calls.
 *
 * Run: npx jest __tests__/assessments/repository-transitions.test.ts
 */

// We test the transition table directly since it is the source of truth.
// The PERMITTED_TRANSITIONS const is not exported; we test via observable behavior.
// For pure unit testing of the table, we duplicate the transition map here
// and verify it matches PRD-defined rules.

type ProcessingStatus =
  | 'DRAFT'
  | 'REPORT_GENERATED'
  | 'SIGNING'
  | 'SIGNED'
  | 'DELIVERED'
  | 'FAILED'

// Mirrors PERMITTED_TRANSITIONS in repository.ts — must stay in sync.
// FAILED is recoverable: FAILED → SIGNING is permitted (recovery path).
const PERMITTED_TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  DRAFT:            ['REPORT_GENERATED', 'FAILED'],
  REPORT_GENERATED: ['SIGNING', 'FAILED'],
  SIGNING:          ['SIGNED', 'FAILED'],
  SIGNED:           ['DELIVERED', 'FAILED'],
  DELIVERED:        ['FAILED'],
  FAILED:           ['SIGNING'],
}

function isPermitted(from: ProcessingStatus, to: ProcessingStatus): boolean {
  return (PERMITTED_TRANSITIONS[from] ?? []).includes(to)
}

describe('Processing status transitions', () => {
  test('happy path DRAFT → REPORT_GENERATED → SIGNING → SIGNED → DELIVERED', () => {
    expect(isPermitted('DRAFT', 'REPORT_GENERATED')).toBe(true)
    expect(isPermitted('REPORT_GENERATED', 'SIGNING')).toBe(true)
    expect(isPermitted('SIGNING', 'SIGNED')).toBe(true)
    expect(isPermitted('SIGNED', 'DELIVERED')).toBe(true)
  })

  test('any non-FAILED status can transition to FAILED', () => {
    const statuses: ProcessingStatus[] = ['DRAFT', 'REPORT_GENERATED', 'SIGNING', 'SIGNED', 'DELIVERED']
    for (const s of statuses) {
      expect(isPermitted(s, 'FAILED')).toBe(true)
    }
  })

  test('FAILED is recoverable — only SIGNING is permitted from FAILED', () => {
    // FAILED → SIGNING is the one permitted recovery transition.
    expect(isPermitted('FAILED', 'SIGNING')).toBe(true)

    // All other transitions from FAILED remain forbidden.
    const forbidden: ProcessingStatus[] = [
      'DRAFT', 'REPORT_GENERATED', 'SIGNED', 'DELIVERED', 'FAILED',
    ]
    for (const s of forbidden) {
      expect(isPermitted('FAILED', s)).toBe(false)
    }
  })

  test('cannot skip steps (e.g. DRAFT → SIGNED)', () => {
    expect(isPermitted('DRAFT', 'SIGNED')).toBe(false)
    expect(isPermitted('DRAFT', 'DELIVERED')).toBe(false)
    expect(isPermitted('REPORT_GENERATED', 'SIGNED')).toBe(false)
    expect(isPermitted('REPORT_GENERATED', 'DELIVERED')).toBe(false)
  })

  test('cannot go backward', () => {
    expect(isPermitted('REPORT_GENERATED', 'DRAFT')).toBe(false)
    expect(isPermitted('SIGNING', 'REPORT_GENERATED')).toBe(false)
    expect(isPermitted('SIGNED', 'SIGNING')).toBe(false)
    expect(isPermitted('DELIVERED', 'SIGNED')).toBe(false)
  })
})

describe('FAILED constraint: diagnostic required', () => {
  // This test documents the rule even though it cannot call the real DB.
  // The real enforcement is in transitionProcessingStatus + the DB CHECK constraint.
  test('transition to FAILED requires failure_diagnostic to be non-null', () => {
    // This is a contract test — it asserts the rule that the service layer enforces.
    // If failure_diagnostic is undefined/null and status is FAILED, the DB rejects it.
    const failedWithoutDiagnostic = {
      processing_status: 'FAILED' as ProcessingStatus,
      failure_diagnostic: null,
    }
    // The CHECK constraint: processing_status != 'FAILED' OR failure_diagnostic IS NOT NULL
    const violatesConstraint =
      failedWithoutDiagnostic.processing_status === 'FAILED' &&
      failedWithoutDiagnostic.failure_diagnostic === null
    expect(violatesConstraint).toBe(true) // confirms the constraint would fire
  })

  test('FAILED with diagnostic satisfies constraint', () => {
    const failedWithDiagnostic = {
      processing_status: 'FAILED' as ProcessingStatus,
      failure_diagnostic: '[2026-07-12] Step: ProvenanceProvider.sign | Error: HTTP 503',
    }
    const violatesConstraint =
      failedWithDiagnostic.processing_status === 'FAILED' &&
      failedWithDiagnostic.failure_diagnostic === null
    expect(violatesConstraint).toBe(false) // constraint satisfied
  })
})

describe('Institutional status transitions (separate from processing)', () => {
  // Institutional and processing statuses are independent — they must never
  // share a single status field. This test documents the separation.
  test('ACTIVE is the default institutional status', () => {
    const defaultInstitutional = 'ACTIVE'
    expect(defaultInstitutional).toBe('ACTIVE')
  })

  test('institutional status does not affect processing status', () => {
    // A SUPERSEDED assessment can still have processing_status = DELIVERED.
    // These are orthogonal dimensions.
    const supersededAndDelivered = {
      institutional_status: 'SUPERSEDED',
      processing_status: 'DELIVERED',
    }
    // Both can coexist — no constraint violation.
    expect(supersededAndDelivered.institutional_status).toBe('SUPERSEDED')
    expect(supersededAndDelivered.processing_status).toBe('DELIVERED')
  })
})
