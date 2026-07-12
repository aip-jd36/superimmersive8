/**
 * Unit tests for assessment domain types and enums.
 *
 * Run: npx jest __tests__/assessments/types.test.ts
 */

import {
  ASSESSMENT_OUTCOMES,
  OUTCOME_LABELS,
  INSTITUTIONAL_STATUSES,
  PROCESSING_STATUSES,
  DIGITAL_SOURCE_TYPE_URIS,
  ASSESSMENT_DOMAINS,
  parseAssessmentDate,
} from '../../types/assessment'

describe('AssessmentOutcome', () => {
  test('has exactly 5 values', () => {
    expect(ASSESSMENT_OUTCOMES).toHaveLength(5)
  })

  test('every outcome has a human-readable label', () => {
    for (const outcome of ASSESSMENT_OUTCOMES) {
      expect(OUTCOME_LABELS[outcome]).toBeDefined()
      expect(typeof OUTCOME_LABELS[outcome]).toBe('string')
      expect(OUTCOME_LABELS[outcome].length).toBeGreaterThan(0)
    }
  })

  test('outcome labels do not contain raw enum values', () => {
    for (const outcome of ASSESSMENT_OUTCOMES) {
      // Labels should be human-readable prose, not the enum code itself
      expect(OUTCOME_LABELS[outcome]).not.toEqual(outcome)
    }
  })
})

describe('InstitutionalStatus', () => {
  test('has exactly 3 values', () => {
    expect(INSTITUTIONAL_STATUSES).toHaveLength(3)
  })

  test('includes ACTIVE, SUPERSEDED, WITHDRAWN', () => {
    expect(INSTITUTIONAL_STATUSES).toContain('ACTIVE')
    expect(INSTITUTIONAL_STATUSES).toContain('SUPERSEDED')
    expect(INSTITUTIONAL_STATUSES).toContain('WITHDRAWN')
  })
})

describe('ProcessingStatus', () => {
  test('has exactly 6 values', () => {
    expect(PROCESSING_STATUSES).toHaveLength(6)
  })

  test('lifecycle order is DRAFT → REPORT_GENERATED → SIGNING → SIGNED → DELIVERED, and FAILED', () => {
    const expected = ['DRAFT', 'REPORT_GENERATED', 'SIGNING', 'SIGNED', 'DELIVERED', 'FAILED']
    expect([...PROCESSING_STATUSES]).toEqual(expected)
  })
})

describe('DIGITAL_SOURCE_TYPE_URIS', () => {
  test('uses full IPTC URIs, not short names', () => {
    for (const uri of Object.values(DIGITAL_SOURCE_TYPE_URIS)) {
      expect(uri).toMatch(/^http:\/\/cv\.iptc\.org\/newscodes\/digitalsourcetype\//)
    }
  })

  test('trainedAlgorithmicMedia URI is correct', () => {
    expect(DIGITAL_SOURCE_TYPE_URIS.trainedAlgorithmicMedia).toBe(
      'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
    )
  })

  test('compositeWithTrainedAlgorithmicMedia URI is correct', () => {
    expect(DIGITAL_SOURCE_TYPE_URIS.compositeWithTrainedAlgorithmicMedia).toBe(
      'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
    )
  })
})

describe('ASSESSMENT_DOMAINS', () => {
  test('has exactly 7 domains', () => {
    expect(ASSESSMENT_DOMAINS).toHaveLength(7)
  })

  test('domain codes are single uppercase letters', () => {
    for (const d of ASSESSMENT_DOMAINS) {
      expect(d.code).toMatch(/^[A-Z]$/)
    }
  })

  test('covers A, R, H, I, L, T, D', () => {
    const codes = ASSESSMENT_DOMAINS.map(d => d.code)
    expect(codes).toContain('A')
    expect(codes).toContain('R')
    expect(codes).toContain('H')
    expect(codes).toContain('I')
    expect(codes).toContain('L')
    expect(codes).toContain('T')
    expect(codes).toContain('D')
  })
})

describe('parseAssessmentDate', () => {
  test('extracts date from valid assessment number', () => {
    expect(parseAssessmentDate('ASSESS-001-2026-07-12')).toBe('2026-07-12')
    expect(parseAssessmentDate('ASSESS-042-2026-12-31')).toBe('2026-12-31')
  })

  test('returns today as fallback for malformed number', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(parseAssessmentDate('INVALID')).toBe(today)
    expect(parseAssessmentDate('')).toBe(today)
  })
})
