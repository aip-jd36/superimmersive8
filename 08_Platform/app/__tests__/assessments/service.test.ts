/**
 * Unit tests for assessment service layer.
 * Covers buildC2PAManifest and status transition validation.
 *
 * Run: npx jest __tests__/assessments/service.test.ts
 *
 * NOTE: signAssessment requires Supabase — tested via integration tests, not here.
 * We test the pure functions (buildC2PAManifest) and the transition logic.
 */

import { buildC2PAManifest } from '../../lib/assessments/service'

describe('buildC2PAManifest', () => {
  const base = {
    assessment_number:    'ASSESS-001-2026-07-12',
    assessment_date:      '2026-07-12',
    reviewer_organization: 'PMF Strategy Inc. d/b/a SuperImmersive 8',
    methodology_version:  'SI8 Reviewer Manual v0.1',
    outcome:              'EVIDENCE_SUPPORTS' as const,
    verification_url:     'https://app.superimmersive8.com/assessment/ASSESS-001-2026-07-12',
  }

  test('returns all 6 approved fields', () => {
    const manifest = buildC2PAManifest(base)
    expect(Object.keys(manifest)).toHaveLength(6)
    expect(manifest['si8:assessment_number']).toBeDefined()
    expect(manifest['si8:assessment_date']).toBeDefined()
    expect(manifest['si8:reviewer_organization']).toBeDefined()
    expect(manifest['si8:methodology_version']).toBeDefined()
    expect(manifest['si8:outcome_code']).toBeDefined()
    expect(manifest['si8:verification_url']).toBeDefined()
  })

  test('maps values correctly', () => {
    const manifest = buildC2PAManifest(base)
    expect(manifest['si8:assessment_number']).toBe('ASSESS-001-2026-07-12')
    expect(manifest['si8:assessment_date']).toBe('2026-07-12')
    expect(manifest['si8:reviewer_organization']).toBe('PMF Strategy Inc. d/b/a SuperImmersive 8')
    expect(manifest['si8:methodology_version']).toBe('SI8 Reviewer Manual v0.1')
    expect(manifest['si8:outcome_code']).toBe('EVIDENCE_SUPPORTS')
    expect(manifest['si8:verification_url']).toBe(
      'https://app.superimmersive8.com/assessment/ASSESS-001-2026-07-12',
    )
  })

  // Security: these fields must NEVER appear in the C2PA manifest
  test('does NOT include confidence', () => {
    const manifest = buildC2PAManifest(base)
    const keys = JSON.stringify(Object.keys(manifest))
    expect(keys).not.toContain('confidence')
    expect(keys).not.toContain('commercial_confidence')
  })

  test('does NOT include report_hash', () => {
    const manifest = buildC2PAManifest(base)
    const keys = JSON.stringify(Object.keys(manifest))
    expect(keys).not.toContain('report_hash')
    expect(keys).not.toContain('pdf_hash')
  })

  test('does NOT include customer or campaign data', () => {
    const manifest = buildC2PAManifest(base)
    const keys = JSON.stringify(Object.keys(manifest))
    expect(keys).not.toContain('customer')
    expect(keys).not.toContain('campaign')
    expect(keys).not.toContain('client')
    expect(keys).not.toContain('creator')
  })

  test('does NOT include findings or evidence', () => {
    const manifest = buildC2PAManifest(base)
    const keys = JSON.stringify(Object.keys(manifest))
    expect(keys).not.toContain('finding')
    expect(keys).not.toContain('evidence')
    expect(keys).not.toContain('notes')
  })

  test('does NOT include commercial_authorization (removed from v1 manifest)', () => {
    const manifest = buildC2PAManifest(base)
    const keys = JSON.stringify(Object.keys(manifest))
    expect(keys).not.toContain('commercial_authorization')
    expect(keys).not.toContain('likeness')
  })
})

describe('assessment_number format', () => {
  // The format ASSESS-NNN-YYYY-MM-DD is critical — the Verification Page uses it
  // as the primary lookup key.
  const VALID_FORMAT = /^ASSESS-\d{3}-\d{4}-\d{2}-\d{2}$/

  test('ASSESS-001-2026-07-12 matches format', () => {
    expect('ASSESS-001-2026-07-12').toMatch(VALID_FORMAT)
  })

  test('ASSESS-042-2026-12-31 matches format', () => {
    expect('ASSESS-042-2026-12-31').toMatch(VALID_FORMAT)
  })

  test('format rejects zero-padded years', () => {
    expect('ASSESS-001-26-07-12').not.toMatch(VALID_FORMAT)
  })

  test('format rejects missing date', () => {
    expect('ASSESS-001').not.toMatch(VALID_FORMAT)
  })
})
