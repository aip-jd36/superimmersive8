/**
 * CRC <-> Assurance association core (CAH-3D).
 *
 * Policy-independent association machinery ONLY. No candidate discovery, no
 * customer/reviewer/Sales/admin front door, no handoff consumer, no
 * current-LK/current-BI recomputation. See ./types.ts for the full boundary
 * statement and __tests__/crc-assurance-handoff/boundaries.test.ts for the
 * structural enforcement.
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
  KNOWN_AUTHORIZATION_BASES,
  CURRENTLY_ENABLED_AUTHORIZATION_BASES,
  isKnownAuthorizationBasis,
} from './types'
export { PRODUCTION_AUTHORIZATION_POLICY, type AuthorizationPolicy } from './authorization-policy'

export {
  CANONICALIZATION_VERSION,
  canonicalizeStructuredUnderstanding,
  computeCrcStateIdentity,
  compareCrcStateIdentity,
  type CrcStateIdentity,
} from './state-binding'

export { associateCrcSessionWithSubmission, removeCrcAssuranceAssociation } from './service'

export {
  getAssociationById,
  listActiveAssociationsForSubmission,
} from './repository'
