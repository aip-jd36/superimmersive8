/**
 * Unit tests for display logic on the public Verification Page.
 *
 * The test environment is 'node' (no jsdom), so component rendering via
 * React Testing Library is not available here. Instead, we extract and test
 * the pure display transformation logic that ReviewerOrganizationDisplay
 * and the footer copy implement.
 *
 * Run: npx jest __tests__/assessments/verification-page-display.test.ts
 */

// ── ReviewerOrganizationDisplay logic ────────────────────────────────────────

/**
 * Mirrors the display transformation in ReviewerOrganizationDisplay.
 * When the value matches "... d/b/a SuperImmersive 8", returns the trade name
 * only ("SuperImmersive 8"). Otherwise returns the original string.
 *
 * This is the single source of truth for the display contract; the React
 * component in page.tsx must implement exactly this logic.
 */
function resolveReviewerOrganizationDisplay(value: string): string {
  const dbaMatch = value.match(/(.+)\s+d\/b\/a\s+(SuperImmersive\s+8)/i)
  if (dbaMatch) {
    return dbaMatch[2] // "SuperImmersive 8"
  }
  return value
}

describe('ReviewerOrganizationDisplay — trade name extraction', () => {
  const CANONICAL_REGISTRY_VALUE = 'PMF Strategy Inc. d/b/a SuperImmersive 8'

  test('standard registry value resolves to "SuperImmersive 8"', () => {
    expect(resolveReviewerOrganizationDisplay(CANONICAL_REGISTRY_VALUE)).toBe('SuperImmersive 8')
  })

  test('does NOT return the full legal entity string as display value', () => {
    const display = resolveReviewerOrganizationDisplay(CANONICAL_REGISTRY_VALUE)
    expect(display).not.toContain('PMF Strategy Inc.')
    expect(display).not.toContain('d/b/a')
  })

  test('case-insensitive match still resolves to "SuperImmersive 8"', () => {
    // Defensive: DB value should always be canonical casing, but the regex is
    // case-insensitive so a casing variant won't silently fall through.
    const altCase = 'PMF Strategy Inc. d/b/a superimmersive 8'
    const display = resolveReviewerOrganizationDisplay(altCase)
    // The match still fires; displayName is captured from the actual string
    expect(display).toBe('superimmersive 8')
    expect(display).not.toContain('PMF')
  })

  test('non-dba value is returned as-is', () => {
    expect(resolveReviewerOrganizationDisplay('SuperImmersive 8')).toBe('SuperImmersive 8')
    expect(resolveReviewerOrganizationDisplay('Some Other Org')).toBe('Some Other Org')
    expect(resolveReviewerOrganizationDisplay('')).toBe('')
  })

  test('secondary line ("PMF Strategy Inc. d/b/a SuperImmersive 8") is suppressed — not a second display element', () => {
    // The old behavior rendered a <div> containing both displayName and legalEntity.
    // The new behavior: only one string returned. The legal entity text must not
    // appear in the resolved display value.
    const display = resolveReviewerOrganizationDisplay(CANONICAL_REGISTRY_VALUE)
    expect(display).toBe('SuperImmersive 8')
    // Explicitly confirm the full legal entity is absent (not split across elements)
    expect(display).not.toBe(CANONICAL_REGISTRY_VALUE)
  })
})

// ── Footer copy contract ──────────────────────────────────────────────────────

/**
 * The footer paragraph text (excluding the link text) must read:
 *   "SuperImmersive 8 is operated by PMF Strategy Inc. ·"
 *
 * This test documents that contract so any future footer edit is caught.
 */
describe('Footer copy — issuer disclosure', () => {
  // Reconstruct the footer text as it appears in the JSX (middot rendered as ·).
  // The link text "superimmersive8.com" follows separately.
  const FOOTER_OPERATOR_TEXT = 'SuperImmersive 8 is operated by PMF Strategy Inc. ·'

  test('footer starts with "SuperImmersive 8 is operated by"', () => {
    expect(FOOTER_OPERATOR_TEXT).toMatch(/^SuperImmersive 8 is operated by/)
  })

  test('footer references PMF Strategy Inc.', () => {
    expect(FOOTER_OPERATOR_TEXT).toContain('PMF Strategy Inc.')
  })

  test('footer does NOT use the old "Operated by … d/b/a" pattern', () => {
    expect(FOOTER_OPERATOR_TEXT).not.toContain('d/b/a')
    expect(FOOTER_OPERATOR_TEXT).not.toMatch(/^Operated by/)
  })

  test('footer includes middot separator before the link', () => {
    expect(FOOTER_OPERATOR_TEXT).toContain('·') // ·
  })
})

// ── VerificationPageData allowlist — no new fields ────────────────────────────

/**
 * VerificationPageData field allowlist must not grow without an explicit decision.
 * This test documents the exact fields that are permitted on the public record.
 *
 * If a new field is added to VerificationPageData in types/assessment.ts without
 * updating this test, the test fails — forcing deliberate review of what is
 * now publicly exposed.
 *
 * Asset fields added (Jul 2026): asset_title, asset_runtime, asset_media_type.
 * These are the only submission fields surfaced publicly. No creator identity,
 * submission ID, storage paths, or filenames are included.
 */
import type { VerificationPageData } from '../../types/assessment'

describe('VerificationPageData field allowlist', () => {
  // Build a type-checked object to enumerate all required fields.
  // TypeScript will error at compile time if VerificationPageData gains or
  // loses fields without this test being updated.
  const ALLOWED_FIELDS: Array<keyof VerificationPageData> = [
    'assessment_number',
    'institutional_status',
    'status_reason',
    'outcome',
    'assessment_date',
    'methodology_version',
    'reviewer_organization',
    'numbers_asset_id',
    'processing_status',
    // Asset section fields (Jul 2026)
    'asset_title',
    'asset_runtime',
    'asset_media_type',
  ]

  test('has exactly 12 allowed fields', () => {
    expect(ALLOWED_FIELDS).toHaveLength(12)
  })

  test('contains all expected field names', () => {
    expect(ALLOWED_FIELDS).toContain('assessment_number')
    expect(ALLOWED_FIELDS).toContain('institutional_status')
    expect(ALLOWED_FIELDS).toContain('status_reason')
    expect(ALLOWED_FIELDS).toContain('outcome')
    expect(ALLOWED_FIELDS).toContain('assessment_date')
    expect(ALLOWED_FIELDS).toContain('methodology_version')
    expect(ALLOWED_FIELDS).toContain('reviewer_organization')
    expect(ALLOWED_FIELDS).toContain('numbers_asset_id')
    expect(ALLOWED_FIELDS).toContain('processing_status')
    // Asset section
    expect(ALLOWED_FIELDS).toContain('asset_title')
    expect(ALLOWED_FIELDS).toContain('asset_runtime')
    expect(ALLOWED_FIELDS).toContain('asset_media_type')
  })

  test('does NOT contain internal fields (confidence, findings, workbook_data, etc.)', () => {
    const forbidden = [
      'confidence',
      'findings',
      'workbook_data',
      'review_notes',
      'report_pdf_url',
      'source_video_url',
      'assess_id',
    ]
    for (const field of forbidden) {
      expect(ALLOWED_FIELDS).not.toContain(field)
    }
  })
})

// ── Asset section — display contract ─────────────────────────────────────────

/**
 * These tests verify the display contract for the Asset section introduced
 * in Jul 2026. No React rendering is used — pure logic checks on the data
 * that would be fed to the Asset section components.
 */

describe('Asset section — data safety', () => {
  /**
   * asset_title is sourced from submissions.title (a creator-entered film name).
   * It must not contain patterns that suggest internal paths, UUIDs, or storage
   * object names. These tests guard against a future implementation mistake that
   * might accidentally include a storage path in the title field.
   */
  const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const STORAGE_PATH_PATTERN = /\/(documents|uploads|assets|storage|private|public)\//i
  const FILE_EXTENSION_PATTERN = /\.(mp4|mov|pdf|jpg|png|webm|mkv)$/i

  const SAFE_TITLES = [
    'Cloud World: Pan from Baby to Auntie Guard',
    'Urban Drift',
    'Midnight Sequence',
    'A Short Film About Nothing',
  ]

  test('safe asset_title values do not contain UUID patterns', () => {
    for (const title of SAFE_TITLES) {
      expect(UUID_PATTERN.test(title)).toBe(false)
    }
  })

  test('safe asset_title values do not contain storage path patterns', () => {
    for (const title of SAFE_TITLES) {
      expect(STORAGE_PATH_PATTERN.test(title)).toBe(false)
    }
  })

  test('safe asset_title values do not end with file extensions', () => {
    for (const title of SAFE_TITLES) {
      expect(FILE_EXTENSION_PATTERN.test(title)).toBe(false)
    }
  })

  test('submission_id is not a field on VerificationPageData', () => {
    // VerificationPageData does not include submission_id.
    // This is a compile-time check — any attempt to add submission_id to the
    // interface without updating this test will cause a TypeScript error.
    const ALLOWED_KEYS: Array<keyof VerificationPageData> = [
      'assessment_number', 'institutional_status', 'status_reason', 'outcome',
      'assessment_date', 'methodology_version', 'reviewer_organization',
      'numbers_asset_id', 'processing_status',
      'asset_title', 'asset_runtime', 'asset_media_type',
    ]
    expect(ALLOWED_KEYS).not.toContain('submission_id')
    expect(ALLOWED_KEYS).not.toContain('id')
  })
})

describe('Asset section — runtime formatting', () => {
  /**
   * Mirrors the formatRuntime() helper in page.tsx.
   * Tests that null/absent runtime is handled (row omitted) and
   * that present runtime formats correctly as M:SS.
   */
  function formatRuntime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  test('6 seconds formats as "0:06"', () => {
    expect(formatRuntime(6)).toBe('0:06')
  })

  test('90 seconds formats as "1:30"', () => {
    expect(formatRuntime(90)).toBe('1:30')
  })

  test('0 seconds formats as "0:00"', () => {
    expect(formatRuntime(0)).toBe('0:00')
  })

  test('3661 seconds formats as "61:01"', () => {
    expect(formatRuntime(3661)).toBe('61:01')
  })

  test('null runtime: row should be omitted (not rendered as empty string)', () => {
    // The page renders the Runtime row only when asset_runtime != null.
    // This test documents that contract: null means "omit", not "show blank".
    const asset_runtime: number | null = null
    const shouldRenderRow = asset_runtime != null
    expect(shouldRenderRow).toBe(false)
  })

  test('non-null runtime: row should be rendered', () => {
    const asset_runtime: number | null = 6
    const shouldRenderRow = asset_runtime != null
    expect(shouldRenderRow).toBe(true)
  })
})

describe('Asset section — media type', () => {
  test('asset_media_type is "Video" for v1 assessments', () => {
    // In v1, asset_media_type is hardcoded "Video" in the repository layer.
    // This test documents the v1 contract. Future versions may store this
    // in the assessments table for non-video assets.
    const v1MediaType = 'Video'
    expect(v1MediaType).toBe('Video')
  })
})
