/**
 * CA-RLK-2d-UI — Sign & Deliver bounded projection alignment.
 *
 * The admin Sign & Deliver panel must not present a stronger capability than
 * authoritative state supports:
 *   P — Technical Provenance must respect the assessment's actual provider /
 *       execution class (a system-test assessment is permanently isolated from
 *       any production external provenance provider — CA-RLK-2d).
 *   Q — "Open Public Assessment Record" must respect the SAME governed
 *       public-visibility predicate the public route uses, not merely the
 *       presence of a stored verification_url.
 *
 * These test the pure projection helpers directly (the panel is a client
 * component; jest runs in node). The panel is implemented to render off these
 * exact helpers.
 *
 * Run: npx jest __tests__/assessments/sign-deliver-projection.test.ts
 */

import fs from 'fs'
import path from 'path'
import {
  projectTechnicalProvenance,
  shouldShowPublicAssessmentRecord,
  shouldShowPublicTombstoneLink,
  NON_PRODUCTION_PROVENANCE_NOTE,
  PENDING_PROVENANCE_NOTE,
} from '@/lib/assessments/sign-deliver-projection'
import type { PublicVisibility } from '@/lib/assessments/publication'
import type { ProcessingStatus } from '@/types/assessment'

const URL = 'https://app.superimmersive8.com/assessment/ASSESS-007-2026-09-07'

// ── P — Technical Provenance projection ────────────────────────────────────

describe('Technical Provenance projection', () => {
  it('T1: system-test + no Numbers asset → non-production wording, never a "pending / NUMBERS_API_KEY" implication', () => {
    const p = projectTechnicalProvenance({ isSystemTest: true, numbersAssetId: null })
    expect(p.kind).toBe('non-production')
    expect(p).toHaveProperty('note', NON_PRODUCTION_PROVENANCE_NOTE)
    const note = 'note' in p ? p.note : ''
    expect(note.toLowerCase()).toContain('withheld')
    expect(note).not.toContain('NUMBERS_API_KEY')
    expect(note).not.toContain('provenance signing will occur')
  })

  it('T2: real assessment + signed + no Numbers asset → existing truthful pending/configuration wording preserved', () => {
    const p = projectTechnicalProvenance({ isSystemTest: false, numbersAssetId: null })
    expect(p.kind).toBe('pending-configuration')
    expect(p).toHaveProperty('note', PENDING_PROVENANCE_NOTE)
  })

  it('T3: real assessment with an actual Numbers asset → provenance record link preserved', () => {
    const p = projectTechnicalProvenance({ isSystemTest: false, numbersAssetId: 'bafyCID123' })
    expect(p.kind).toBe('numbers-record')
    const url = 'verifyUrl' in p ? p.verifyUrl : ''
    expect(url).toContain('verify.numbersprotocol.io/asset-profile?nid=bafyCID123')
  })

  it('T3: a real Numbers CID always wins, even if the flag is somehow set (should not happen post-CA-RLK-2d)', () => {
    const p = projectTechnicalProvenance({ isSystemTest: true, numbersAssetId: 'bafyCID999' })
    expect(p.kind).toBe('numbers-record')
  })
})

// ── Q — Public Assessment Record projection (CA-RLK-2g: keyed on visibility) ──

describe('Public Assessment Record projection', () => {
  it('T4: publicVisibility !== RECORD → "Open Public Assessment Record" NOT shown', () => {
    for (const v of ['NOT_PUBLIC', 'TOMBSTONE'] as PublicVisibility[]) {
      expect(shouldShowPublicAssessmentRecord({ verificationUrl: URL, publicVisibility: v })).toBe(false)
    }
  })

  it('T5: publicVisibility === RECORD + verification_url → shown', () => {
    expect(shouldShowPublicAssessmentRecord({ verificationUrl: URL, publicVisibility: 'RECORD' })).toBe(true)
  })

  it('T7: verification_url absent → NOT shown even for RECORD visibility', () => {
    expect(shouldShowPublicAssessmentRecord({ verificationUrl: null, publicVisibility: 'RECORD' })).toBe(false)
    expect(shouldShowPublicAssessmentRecord({ verificationUrl: '', publicVisibility: 'RECORD' })).toBe(false)
  })

  it('tombstone link shown only for TOMBSTONE visibility with a URL', () => {
    expect(shouldShowPublicTombstoneLink({ verificationUrl: URL, publicVisibility: 'TOMBSTONE' })).toBe(true)
    expect(shouldShowPublicTombstoneLink({ verificationUrl: URL, publicVisibility: 'RECORD' })).toBe(false)
    expect(shouldShowPublicTombstoneLink({ verificationUrl: URL, publicVisibility: 'NOT_PUBLIC' })).toBe(false)
    expect(shouldShowPublicTombstoneLink({ verificationUrl: null, publicVisibility: 'TOMBSTONE' })).toBe(false)
  })
})

// ── Non-regression source guards on the panel ─────────────────────────────

describe('SignAndDeliverPanel non-regression (CA-RLK-2d-UI)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app', 'admin', 'submissions', '[id]', 'SignAndDeliverPanel.tsx'),
    'utf8',
  )

  it('P: the panel renders Technical Provenance from projectTechnicalProvenance, not a bare status string', () => {
    expect(src).toContain('projectTechnicalProvenance({ isSystemTest, numbersAssetId })')
    // the misleading wording is no longer a literal in the component — it now
    // lives (conditionally) in the projection helper
    expect(src).not.toContain('provenance signing will occur when NUMBERS_API_KEY is configured')
    // and the post-sign block no longer hard-derives the Numbers URL itself
    expect(src).not.toContain('numbersVerifyUrl')
  })

  it('Q: the public-record section is gated on shouldShowPublicAssessmentRecord, not on verificationUrl alone', () => {
    expect(src).toContain('shouldShowPublicAssessmentRecord({')
    expect(src).toContain('{showPublicRecord && (')
    expect(src).not.toContain('{verificationUrl && (')
  })

  it('T8: Mark as Delivered wiring is unchanged', () => {
    expect(src).toContain("fetch(`/api/admin/submissions/${submissionId}/mark-delivered`, { method: 'POST' })")
    expect(src).toContain('Mark as Delivered')
    expect(src).toContain('{!isDelivered ? (')
  })

  it('T9: Issue Assessment / signing wiring is unchanged', () => {
    expect(src).toContain("fetch(`/api/admin/submissions/${submissionId}/sign`, { method: 'POST' })")
    expect(src).toContain('Issue Assessment')
  })

  it('T10: the panel imports no provider and no provider-selection code', () => {
    expect(src).not.toContain('ProvenanceProvider')
    expect(src).not.toContain('selectSigningProvider')
  })
})
