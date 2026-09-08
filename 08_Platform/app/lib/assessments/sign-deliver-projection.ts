/**
 * Sign & Deliver capability projection (CA-RLK-2d-UI).
 *
 * Pure helpers that turn authoritative assessment state into what the admin
 * Sign & Deliver panel is allowed to present. The panel must never present a
 * stronger conclusion or capability than the underlying state supports:
 *
 *   - Technical Provenance projection respects the assessment's actual
 *     provider / execution class (a system-test assessment is permanently
 *     isolated from any production external provenance provider — CA-RLK-2d —
 *     so it must never be shown as "pending, awaiting NUMBERS_API_KEY").
 *   - Public Assessment Record projection respects the SAME governed
 *     public-visibility predicate the public route uses
 *     (`isPubliclyVisibleProcessingStatus`), not merely the presence of a
 *     stored `verification_url`.
 *
 * No lifecycle, provider, signing, delivery, or public-route policy is changed
 * here — only the projection of existing state.
 */

import type { ProcessingStatus } from '@/types/assessment'
import { isPubliclyVisibleProcessingStatus } from './public-visibility'

// ── Technical Provenance ───────────────────────────────────────────────────

export type TechnicalProvenanceProjection =
  | { kind: 'numbers-record'; verifyUrl: string }
  | { kind: 'non-production'; note: string }
  | { kind: 'pending-configuration'; note: string }

export const NON_PRODUCTION_PROVENANCE_NOTE =
  'Non-production signing mode — external provenance registration is withheld for this system-test assessment.'

export const PENDING_PROVENANCE_NOTE =
  'Pending — provenance signing will occur when NUMBERS_API_KEY is configured.'

/**
 * - A real Numbers asset exists → show the provenance record link.
 * - Else, the assessment is a system test → external registration is withheld
 *   by policy; never imply a future NUMBERS_API_KEY would change that.
 * - Else (real assessment, signed, no Numbers asset) → the existing truthful
 *   "pending, awaiting configuration" wording.
 */
export function projectTechnicalProvenance(input: {
  isSystemTest: boolean
  numbersAssetId: string | null
}): TechnicalProvenanceProjection {
  if (input.numbersAssetId) {
    return {
      kind: 'numbers-record',
      verifyUrl: `https://verify.numbersprotocol.io/asset-profile?nid=${input.numbersAssetId}`,
    }
  }
  if (input.isSystemTest) {
    return { kind: 'non-production', note: NON_PRODUCTION_PROVENANCE_NOTE }
  }
  return { kind: 'pending-configuration', note: PENDING_PROVENANCE_NOTE }
}

// ── Public Assessment Record ───────────────────────────────────────────────

/**
 * Whether the admin panel may offer the "Open Public Assessment Record"
 * affordance. Requires BOTH a stored public URL AND that the assessment is
 * actually publicly resolvable under the governed predicate — a stored
 * `verification_url` alone (written at sign-off, long before delivery) must
 * NOT make the affordance appear.
 */
export function shouldShowPublicAssessmentRecord(input: {
  processingStatus: string | null
  verificationUrl: string | null
}): boolean {
  if (!input.verificationUrl) return false
  if (!input.processingStatus) return false
  return isPubliclyVisibleProcessingStatus(input.processingStatus as ProcessingStatus)
}
