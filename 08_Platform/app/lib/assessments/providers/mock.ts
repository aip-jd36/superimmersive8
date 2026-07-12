/**
 * MockProvenanceProvider
 *
 * Deterministic test double for the ProvenanceProvider contract.
 * Never calls external APIs.
 * Used in unit tests and development environments where no Numbers API key exists.
 *
 * Behaviour:
 *   - Returns deterministic values derived from the assessment number
 *   - Simulates a 10ms delay (configurable) to catch async-handling bugs
 *   - Can be configured to throw on demand (for failure-path tests)
 */

import type {
  AssessmentMetadata,
  ProvenanceMetadata,
  ProvenanceProvider,
  SignedAssetResult,
} from '@/types/assessment'

export interface MockProvenanceProviderOptions {
  /** If set, the provider will throw this error instead of signing. */
  throwWith?: Error
  /** Simulated network delay in milliseconds. Default: 10ms. */
  delayMs?: number
}

export class MockProvenanceProvider implements ProvenanceProvider {
  private readonly opts: MockProvenanceProviderOptions

  constructor(opts: MockProvenanceProviderOptions = {}) {
    this.opts = opts
  }

  async sign(
    asset: Buffer,
    _assessment: AssessmentMetadata,
    _provenance: ProvenanceMetadata,
  ): Promise<SignedAssetResult> {
    const delay = this.opts.delayMs ?? 10
    await new Promise(resolve => setTimeout(resolve, delay))

    if (this.opts.throwWith) {
      throw this.opts.throwWith
    }

    return {
      // Empty CID — service treats '' same as null; numbers_asset_id stays unset.
      // This allows real signing later without the idempotency guard blocking.
      provenanceAssetId: '',
      // signedAssetBuffer provided: service skips the HTTP download step entirely.
      // The original asset is stored as-is (no actual C2PA signing in mock mode).
      signedAssetUrl:    '',
      signedAssetBuffer: asset,
    }
  }
}
