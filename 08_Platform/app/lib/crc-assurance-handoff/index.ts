/**
 * CRC <-> Assurance association core -- PUBLIC package surface (CAH-3D,
 * re-architected CAH-3E.2).
 *
 * Mechanism-agnostic association infrastructure ONLY. No candidate discovery,
 * no customer/reviewer/Sales/admin front door, no handoff consumer, no
 * current-LK/current-BI recomputation. See ./types.ts for the full boundary
 * statement and __tests__/crc-assurance-handoff/boundaries.test.ts for the
 * structural enforcement.
 *
 * ── CAH-3E.2: no generic "authorize-and-create" entry point ──
 *
 * This surface deliberately exposes NO function whose apparent contract is
 * "give me an authorization basis and I'll decide whether you are authorized."
 * The non-authorizing invariant/persistence primitive
 * (`createAssociationAfterAuthorization`, in ./service.ts) is INTERNAL
 * server-side infrastructure: a future reviewed capability module imports it
 * from its file path directly, AFTER establishing its own authorization. It is
 * not re-exported here. (Module visibility is architecture hygiene, not a
 * security boundary -- see ./service.ts's header.)
 *
 * `AuthorizationPolicy` / `PRODUCTION_AUTHORIZATION_POLICY` /
 * `CURRENTLY_ENABLED_AUTHORIZATION_BASES` are REMOVED entirely (CAH-3E.2):
 * this package no longer decides authorization, so it has no "policy" and no
 * "enabled" concept.
 */

export type {
  AuthorizationBasis,
  AssociationStatus,
  CrcAssuranceAssociation,
  CreateAssociationInput,
  CreateAssociationResult,
  RemoveAssociationInput,
  RemoveAssociationResult,
  CrcStateComparison,
} from './types'
export {
  // Vocabulary/schema validation only -- KNOWN != ENABLED != AUTHORIZED.
  KNOWN_AUTHORIZATION_BASES,
  isKnownAuthorizationBasis,
} from './types'

export {
  CANONICALIZATION_VERSION,
  canonicalizeStructuredUnderstanding,
  computeCrcStateIdentity,
  compareCrcStateIdentity,
  type CrcStateIdentity,
} from './state-binding'

// Removal is non-authorizing (ownership only) -- safe to expose on the public
// surface. Creation (`createAssociationAfterAuthorization`) is deliberately NOT
// re-exported here (see module header).
export { removeCrcAssuranceAssociation } from './service'

export {
  getAssociationById,
  listActiveAssociationsForSubmission,
} from './repository'
