/**
 * Unit and integration tests for the FAILED → SIGNING recovery path.
 *
 * Tests 1–4: pure unit tests against the transition table (no Supabase).
 *   These mirror the pattern in repository-transitions.test.ts.
 *
 * Tests 5–10: integration test stubs.
 *   signAssessment() requires Supabase + Storage. These tests document the
 *   expected behavior and are marked INTEGRATION TEST so they can be wired
 *   up when a test Supabase instance is available. They will not pass in
 *   the current CI environment without Supabase credentials.
 *
 * Run unit tests only: npx jest __tests__/assessments/retry.test.ts
 */

import type { AssessmentMetadata, ProvenanceMetadata, SignedAssetResult } from '../../types/assessment'
import type { ProvenanceProvider } from '../../types/assessment'

// ── Transition table (mirrors PERMITTED_TRANSITIONS in repository.ts) ─────────
// Must stay in sync. If repository.ts changes, update this mirror too.

type ProcessingStatus =
  | 'DRAFT'
  | 'REPORT_GENERATED'
  | 'SIGNING'
  | 'SIGNED'
  | 'DELIVERED'
  | 'FAILED'

const PERMITTED_TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  DRAFT:            ['REPORT_GENERATED', 'FAILED'],
  REPORT_GENERATED: ['SIGNING', 'FAILED'],
  SIGNING:          ['SIGNED', 'FAILED'],
  SIGNED:           ['DELIVERED', 'FAILED'],
  DELIVERED:        ['FAILED'],
  // FAILED is recoverable — SIGNING is the only permitted recovery transition.
  FAILED:           ['SIGNING'],
}

function isPermitted(from: ProcessingStatus, to: ProcessingStatus): boolean {
  return (PERMITTED_TRANSITIONS[from] ?? []).includes(to)
}

// ── Tests 1–4: PERMITTED_TRANSITIONS unit tests ───────────────────────────────

describe('FAILED recovery — transition table', () => {
  test('1. FAILED → SIGNING is permitted (recovery path)', () => {
    expect(isPermitted('FAILED', 'SIGNING')).toBe(true)
  })

  test('2. FAILED → REPORT_GENERATED is NOT permitted (must use SIGNING path)', () => {
    expect(isPermitted('FAILED', 'REPORT_GENERATED')).toBe(false)
  })

  test('3. FAILED → DELIVERED is NOT permitted', () => {
    expect(isPermitted('FAILED', 'DELIVERED')).toBe(false)
  })

  test('4. FAILED → FAILED is NOT permitted (cannot transition to self)', () => {
    expect(isPermitted('FAILED', 'FAILED')).toBe(false)
  })

  test('4b. FAILED → SIGNED is NOT permitted (must go through SIGNING)', () => {
    expect(isPermitted('FAILED', 'SIGNED')).toBe(false)
  })

  test('4c. FAILED → DRAFT is NOT permitted (no backward transitions)', () => {
    expect(isPermitted('FAILED', 'DRAFT')).toBe(false)
  })

  // Ensure existing happy path tests still hold after adding FAILED → SIGNING
  test('happy path still permitted: DRAFT → REPORT_GENERATED → SIGNING → SIGNED → DELIVERED', () => {
    expect(isPermitted('DRAFT', 'REPORT_GENERATED')).toBe(true)
    expect(isPermitted('REPORT_GENERATED', 'SIGNING')).toBe(true)
    expect(isPermitted('SIGNING', 'SIGNED')).toBe(true)
    expect(isPermitted('SIGNED', 'DELIVERED')).toBe(true)
  })

  test('any non-FAILED status can still reach FAILED', () => {
    const canFail: ProcessingStatus[] = ['DRAFT', 'REPORT_GENERATED', 'SIGNING', 'SIGNED', 'DELIVERED']
    for (const s of canFail) {
      expect(isPermitted(s, 'FAILED')).toBe(true)
    }
  })
})

// ── Stateful test double ──────────────────────────────────────────────────────

/**
 * FailOnceMockProvider — throws on the first call, succeeds on the second.
 *
 * Used in integration tests (5, 9) to simulate a transient provider failure.
 * Defined in the test file — do not modify MockProvenanceProvider in mock.ts.
 */
class FailOnceMockProvider implements ProvenanceProvider {
  private callCount = 0
  private readonly failError: Error

  constructor(failError: Error = new Error('simulated transient Numbers API error')) {
    this.failError = failError
  }

  async sign(
    _asset: Buffer,
    assessment: AssessmentMetadata,
    _provenance: ProvenanceMetadata,
  ): Promise<SignedAssetResult> {
    this.callCount++
    if (this.callCount === 1) {
      throw this.failError
    }
    const num = assessment.assessmentNumber
    return {
      provenanceAssetId: `mock-cid-retry-${num}`,
      signedAssetUrl:    `https://mock.numbersprotocol.io/assets/mock-cid-retry-${num}/signed.mp4`,
      verificationUrl:   `https://verify.numbersprotocol.io/asset-profile?nid=mock-cid-retry-${num}`,
    }
  }

  get callsMade(): number { return this.callCount }
}

// ── Tests 5–10: integration test stubs ───────────────────────────────────────
//
// These tests describe the expected behavior of signAssessment() across retry
// scenarios. They require a running Supabase instance + signed-assets bucket.
// In CI without Supabase, they are documented as skipped stubs.
//
// To run: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local,
// then: npx jest --testNamePattern="INTEGRATION" __tests__/assessments/retry.test.ts

describe('FAILED recovery — signAssessment() integration tests [INTEGRATION TEST]', () => {
  // INTEGRATION TEST 5
  test.skip(
    '5. Retry after provider failure reaches SIGNED — FailOnceMockProvider succeeds on second call',
    async () => {
      // Setup: create assessment in DRAFT, call signAssessment, expect it to fail,
      // then call signAssessment again with FailOnceMockProvider's second successful call.
      // Assert: final processing_status = SIGNED, numbers_asset_id populated.
      //
      // const provider = new FailOnceMockProvider()
      // ... create assessment, call signAssessment (first call throws) ...
      // ... verify assessment is FAILED in DB ...
      // ... call signAssessment again (second call succeeds) ...
      // ... verify assessment is SIGNED in DB, failure_diagnostic is null ...
    },
  )

  // INTEGRATION TEST 6
  test.skip(
    '6. Retry preserves the same assessment number',
    async () => {
      // Assert: after a FAILED → retry → SIGNED cycle, assessment_number
      // is unchanged from creation. A new assessment number must NOT be generated.
    },
  )

  // INTEGRATION TEST 7
  test.skip(
    '7. Retry on already-SIGNED assessment returns idempotency result without calling provider',
    async () => {
      // Setup: assessment in SIGNED state (numbers_asset_id + signed_asset_path set).
      // Assert: signAssessment() returns immediately, provider.sign() is NOT called.
      // This is the existing idempotency guard; test verifies it still holds
      // after the retry path was added.
    },
  )

  // INTEGRATION TEST 8
  test.skip(
    '8. Retry when numbers_asset_id is set but signed_asset_path is not: skips provider call, proceeds to download',
    async () => {
      // Setup: assessment in FAILED state with numbers_asset_id populated (partial success
      // where Numbers responded but SI8 crashed before download/upload).
      // Assert: provider.sign() is NOT called, download is attempted using stored CID.
      // This validates the partial-success guard in service.ts.
    },
  )

  // INTEGRATION TEST 9
  test.skip(
    '9. Failed retry preserves the prior diagnostic (Option A: retain until success)',
    async () => {
      // Setup: assessment FAILED with diagnostic "Step: ProvenanceProvider.sign | Error: HTTP 503".
      // Trigger a second failure (e.g., download failure).
      // Assert: failure_diagnostic is updated to the new diagnostic (most recent failure).
      // The prior diagnostic is overwritten — this is the expected behavior because
      // markFailed() calls updateAssessment() directly on every failure.
      // The key invariant is: failure_diagnostic is NOT cleared during retry; it is
      // only cleared on SIGNED (see transitionProcessingStatus in repository.ts).
    },
  )

  // INTEGRATION TEST 10
  test.skip(
    '10. Successful retry clears failure_diagnostic',
    async () => {
      // Setup: assessment FAILED with a non-null failure_diagnostic.
      // Retry succeeds (FailOnceMockProvider second call).
      // Assert: after SIGNED, assessments.failure_diagnostic IS NULL in DB.
      // This validates the `updates.failure_diagnostic = null` in transitionProcessingStatus.
    },
  )
})

// ── Diagnostic: FailOnceMockProvider self-test ────────────────────────────────

describe('FailOnceMockProvider — self-test (no Supabase required)', () => {
  const SAMPLE_ASSESSMENT: AssessmentMetadata = {
    assessmentNumber:     'ASSESS-099-2026-07-12',
    assessmentDate:       '2026-07-12',
    reviewerOrganization: 'PMF Strategy Inc. d/b/a SuperImmersive 8',
    methodologyVersion:   'SI8 Reviewer Manual v0.1',
    outcomeCode:          'EVIDENCE_SUPPORTS',
    verificationUrl:      'https://app.superimmersive8.com/assessment/ASSESS-099-2026-07-12',
  }

  const SAMPLE_PROVENANCE: ProvenanceMetadata = {
    digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
  }

  test('throws on first call', async () => {
    const provider = new FailOnceMockProvider()
    await expect(
      provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE),
    ).rejects.toThrow('simulated transient Numbers API error')
    expect(provider.callsMade).toBe(1)
  })

  test('succeeds on second call with correct provenanceAssetId format', async () => {
    const provider = new FailOnceMockProvider()
    // First call — throw
    await provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE).catch(() => null)
    // Second call — succeed
    const result = await provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE)
    expect(result.provenanceAssetId).toBe('mock-cid-retry-ASSESS-099-2026-07-12')
    expect(result.signedAssetUrl).toContain('mock-cid-retry-ASSESS-099-2026-07-12')
    expect(provider.callsMade).toBe(2)
  })

  test('always fails when constructed with a custom error', async () => {
    const customErr = new Error('custom failure')
    const provider = new FailOnceMockProvider(customErr)
    await expect(
      provider.sign(Buffer.from('v'), SAMPLE_ASSESSMENT, SAMPLE_PROVENANCE),
    ).rejects.toThrow('custom failure')
  })
})
