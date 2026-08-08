/**
 * Claim enumeration + eligibility filtering (RETRIEVAL_ENGINE_ARCHITECTURE.md
 * Phase 5, Prototype Beta).
 *
 * For a matched row, enumerate every claim in its CRC Claims sub-table and
 * keep only `CRC-Eligible: Yes` -- `No` and `Pending` are excluded
 * identically, matching the Matrix's own governing text ("nothing is
 * grandfathered in... including rows with a Verified Status"). A row's
 * factual Status (Verified, Needs Reverification, etc.) is not represented
 * on MatrixRow at all -- this module has no way to conflate the two even by
 * accident, since Status isn't a field it can read.
 *
 * [PROTOTYPE ASSUMPTION -- TO VALIDATE] (RETRIEVAL_ENGINE_ARCHITECTURE.md
 * §3): every CRC-Eligible: Yes claim under a matched row is retrievable --
 * no further applicability filter. A compound row (ElevenLabs) fans out to
 * every claim independently; each is filtered on its own CRC-Eligible only.
 * If a future row ever has multiple Yes claims where only some should
 * apply depending on additional structured facts, that is evidence for a
 * future deterministic applicability schema -- not solved speculatively
 * here.
 */

import type { MatrixClaim, MatrixRow } from './types'

export function enumerateEligibleClaims(row: MatrixRow): MatrixClaim[] {
  return row.claims.filter((c) => c.crc_eligible === 'Yes')
}
