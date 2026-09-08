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
  NON_PRODUCTION_PROVENANCE_NOTE,
  PENDING_PROVENANCE_NOTE,
} from '@/lib/assessments/sign-deliver-projection'
import { isPubliclyVisibleProcessingStatus } from '@/lib/assessments/public-visibility'
import { isPubliclyVisibleProcessingStatus as fromRepository } from '@/lib/assessments/repository'
import { PROCESSING_STATUSES, type ProcessingStatus } from '@/types/assessment'

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

// ── Q — Public Assessment Record projection ────────────────────────────────

describe('Public Assessment Record projection', () => {
  it('T4: not-publicly-visible status + verification_url present → affordance NOT shown', () => {
    for (const status of ['DRAFT', 'REPORT_GENERATED', 'SIGNING', 'SIGNED', 'FAILED'] as ProcessingStatus[]) {
      expect(shouldShowPublicAssessmentRecord({ processingStatus: status, verificationUrl: URL })).toBe(false)
    }
  })

  it('T5: DELIVERED + verification_url present → affordance shown', () => {
    expect(shouldShowPublicAssessmentRecord({ processingStatus: 'DELIVERED', verificationUrl: URL })).toBe(true)
  })

  it('T6: the projection tracks the canonical shared predicate across every processing status', () => {
    for (const status of PROCESSING_STATUSES) {
      expect(shouldShowPublicAssessmentRecord({ processingStatus: status, verificationUrl: URL })).toBe(
        isPubliclyVisibleProcessingStatus(status as ProcessingStatus),
      )
    }
  })

  it('T6: the public route and the admin projection import the SAME predicate (no duplicate status list)', () => {
    // repository.ts re-exports the pure module's function — identity, not a copy.
    expect(fromRepository).toBe(isPubliclyVisibleProcessingStatus)
  })

  it('T7: verification_url absent → affordance NOT shown even for an otherwise-eligible status', () => {
    expect(shouldShowPublicAssessmentRecord({ processingStatus: 'DELIVERED', verificationUrl: null })).toBe(false)
    expect(shouldShowPublicAssessmentRecord({ processingStatus: 'DELIVERED', verificationUrl: '' })).toBe(false)
  })

  it('T7: null processing status → not shown', () => {
    expect(shouldShowPublicAssessmentRecord({ processingStatus: null, verificationUrl: URL })).toBe(false)
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
