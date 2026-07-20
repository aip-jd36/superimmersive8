/**
 * Unit tests for MockProvenanceProvider.
 *
 * Run: npx jest __tests__/assessments/mock-provider.test.ts
 */

import { MockProvenanceProvider } from '../../lib/assessments/providers/mock'
import type { AssessmentMetadata, ProvenanceMetadata } from '../../types/assessment'
import { DIGITAL_SOURCE_TYPE_URIS } from '../../types/assessment'

const SAMPLE_ASSESSMENT: AssessmentMetadata = {
  assessmentNumber:     'ASSESS-001-2026-07-12',
  assessmentDate:       '2026-07-12',
  reviewerOrganization: 'PMF Strategy Inc. d/b/a SuperImmersive 8',
  methodologyVersion:   'SI8 Reviewer Manual v0.2',
  outcomeCode:          'EVIDENCE_SUPPORTS',
  verificationUrl:      'https://app.superimmersive8.com/assessment/ASSESS-001-2026-07-12',
}

const SAMPLE_PROVENANCE: ProvenanceMetadata = {
  digitalSourceType: DIGITAL_SOURCE_TYPE_URIS.compositeWithTrainedAlgorithmicMedia,
}

describe('MockProvenanceProvider', () => {
  test('returns a deterministic result without calling external APIs', async () => {
    const provider = new MockProvenanceProvider({ delayMs: 0 })
    const result = await provider.sign(
      Buffer.from('fake-video'),
      SAMPLE_ASSESSMENT,
      SAMPLE_PROVENANCE,
    )

    expect(result.provenanceAssetId).toBe('mock-cid-ASSESS-001-2026-07-12')
    expect(result.signedAssetUrl).toContain('mock-cid-ASSESS-001-2026-07-12')
    expect(result.verificationUrl).toContain('mock-cid-ASSESS-001-2026-07-12')
  })

  test('result for the same input is idempotent (deterministic)', async () => {
    const provider = new MockProvenanceProvider({ delayMs: 0 })
    const r1 = await provider.sign(Buffer.from('v1'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE)
    const r2 = await provider.sign(Buffer.from('v2'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE)
    // Deterministic on assessment number, not asset content
    expect(r1.provenanceAssetId).toBe(r2.provenanceAssetId)
  })

  test('throws when throwWith is configured', async () => {
    const err = new Error('simulated Numbers API failure')
    const provider = new MockProvenanceProvider({ throwWith: err, delayMs: 0 })

    await expect(
      provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE),
    ).rejects.toThrow('simulated Numbers API failure')
  })

  test('respects the delay option', async () => {
    const delayMs = 50
    const provider = new MockProvenanceProvider({ delayMs })
    const start = Date.now()
    await provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(delayMs - 5) // small tolerance
  })

  test('result includes all required SignedAssetResult fields', async () => {
    const provider = new MockProvenanceProvider({ delayMs: 0 })
    const result = await provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE)

    expect(typeof result.provenanceAssetId).toBe('string')
    expect(result.provenanceAssetId.length).toBeGreaterThan(0)
    expect(typeof result.signedAssetUrl).toBe('string')
    expect(result.signedAssetUrl.length).toBeGreaterThan(0)
  })
})
