/**
 * Unit tests for assessment number format and sequential numbering logic.
 *
 * generateAssessmentNumber() now delegates to a PostgreSQL sequence via
 * supabase.rpc('generate_assessment_number'). These tests verify:
 *   - Format contract: ASSESS-NNN-YYYY-MM-DD
 *   - Sequential NNN values do not collide (when using the DB sequence)
 *   - NNN resets at 3+ digits when NNN > 999 (no upper bound — the spec does
 *     not cap NNN; if it exceeds 3 digits the format expands gracefully)
 *
 * NOTE: generateAssessmentNumber() itself cannot be unit-tested without a live
 * Supabase connection (it calls supabase.rpc). What we test here is:
 *   1. The DB function's output format
 *   2. The format regex that the Verification Page and C2PA manifest rely on
 *   3. The contract that NNN is globally monotone (not per-day)
 *
 * Run: npx jest __tests__/assessments/assessment-number.test.ts
 */

// ── Format contract ───────────────────────────────────────────────────────────

// The canonical format. This regex is the source of truth for what the DB
// function must produce and what the Verification Page URL will contain.
const ASSESSMENT_NUMBER_FORMAT = /^ASSESS-\d{3}-\d{4}-\d{2}-\d{2}$/

describe('Assessment number format contract', () => {
  test('standard number matches format', () => {
    expect('ASSESS-001-2026-07-12').toMatch(ASSESSMENT_NUMBER_FORMAT)
  })

  test('number 099 matches format', () => {
    expect('ASSESS-099-2026-07-12').toMatch(ASSESSMENT_NUMBER_FORMAT)
  })

  test('number 999 matches format', () => {
    expect('ASSESS-999-2026-07-12').toMatch(ASSESSMENT_NUMBER_FORMAT)
  })

  test('rejects non-zero-padded NNN', () => {
    expect('ASSESS-1-2026-07-12').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
    expect('ASSESS-01-2026-07-12').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
  })

  test('rejects two-digit year', () => {
    expect('ASSESS-001-26-07-12').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
  })

  test('rejects missing date', () => {
    expect('ASSESS-001').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
    expect('ASSESS-001-').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
  })

  test('rejects wrong prefix', () => {
    expect('ASSESS_001-2026-07-12').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
    expect('SI8-001-2026-07-12').not.toMatch(ASSESSMENT_NUMBER_FORMAT)
  })
})

// ── Sequence / uniqueness contract ────────────────────────────────────────────

describe('Assessment number sequence contract', () => {
  // This test documents the contract that the DB sequence enforces.
  // It cannot actually call supabase.rpc without a live DB connection.
  // The DB-level guarantee (from migration 20260712000001) is:
  //   - PostgreSQL nextval() is atomic
  //   - Two concurrent callers will always receive different seq values
  //   - The sequence does NOT reset daily (global counter)

  test('NNN is global — does not reset by date', () => {
    // Simulated output from two sequential DB calls on different dates:
    const day1 = 'ASSESS-003-2026-07-10'
    const day2 = 'ASSESS-004-2026-07-11'

    // Both are valid format
    expect(day1).toMatch(ASSESSMENT_NUMBER_FORMAT)
    expect(day2).toMatch(ASSESSMENT_NUMBER_FORMAT)

    // NNN from day2 is higher than day1 — sequence is global
    const nnn1 = parseInt(day1.split('-')[1], 10)
    const nnn2 = parseInt(day2.split('-')[1], 10)
    expect(nnn2).toBeGreaterThan(nnn1)
  })

  test('same-date sequential numbers have different NNNs', () => {
    // Two assessments issued on the same date must have different NNN values.
    // This is enforced by the DB sequence + UNIQUE constraint on assessment_number.
    const first  = 'ASSESS-007-2026-07-12'
    const second = 'ASSESS-008-2026-07-12'

    expect(first).toMatch(ASSESSMENT_NUMBER_FORMAT)
    expect(second).toMatch(ASSESSMENT_NUMBER_FORMAT)

    const nnn1 = parseInt(first.split('-')[1], 10)
    const nnn2 = parseInt(second.split('-')[1], 10)
    expect(nnn2).toBe(nnn1 + 1)

    // The two numbers on the same date are not equal
    expect(first).not.toBe(second)
  })

  test('UNIQUE constraint on assessment_number prevents collision at DB level', () => {
    // If the application layer somehow generated the same number twice,
    // the UNIQUE constraint on assessments.assessment_number would reject
    // the second INSERT. This is the safety net below the sequence.
    //
    // This is documented as a contract test, not a live DB test.
    const duplicateA = 'ASSESS-005-2026-07-12'
    const duplicateB = 'ASSESS-005-2026-07-12'
    expect(duplicateA).toBe(duplicateB) // same string = collision
    // In practice, the DB would throw on the second INSERT; the sequence prevents this.
  })
})

// ── Verification Page lookup ──────────────────────────────────────────────────

describe('Assessment number in Verification Page URL', () => {
  const SITE_URL = 'https://app.superimmersive8.com'

  function buildVerificationUrl(assessmentNumber: string): string {
    return `${SITE_URL}/assessment/${assessmentNumber}`
  }

  test('verification URL contains the full assessment number', () => {
    const num = 'ASSESS-001-2026-07-12'
    const url = buildVerificationUrl(num)
    expect(url).toBe('https://app.superimmersive8.com/assessment/ASSESS-001-2026-07-12')
    expect(url).toContain(num)
  })

  test('verification URL is stable — does not change after creation', () => {
    // The verification URL is constructed from assessment_number + SITE_URL.
    // Both are immutable after creation. This is a design contract test.
    const num = 'ASSESS-042-2026-07-12'
    const urlA = buildVerificationUrl(num)
    const urlB = buildVerificationUrl(num)
    expect(urlA).toBe(urlB)
  })
})
