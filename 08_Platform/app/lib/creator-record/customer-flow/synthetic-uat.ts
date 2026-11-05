/**
 * The synthetic test inputs, and the port through which a caller may admit an identity to them.
 *
 * Only the admin UAT wiring (`lib/creator-record-flow/admin-uat.ts`) supplies the port, after authenticating an
 * administrator on the request. Customer wiring never does, so customer routes can never serve synthetic content. There is
 * no window, configuration or request value: the temporary window (CR-V2-UAT-PROD-MIN-1) was retired with this module's
 * earlier form. Purchase and issuance never consult this module.
 *
 * PROVENANCE: the synthetic bundle's authority is named "SYNTHETIC TEST AUTHORITY (staging rehearsal only; no SI8
 * decision)". The wording is historical (M4C); the identifier and digests are kept unchanged. Every version built from it
 * stores that authority and the SYN-… registry and ledger versions in its digest-covered sources, so it stays visibly
 * synthetic and unapproved, cannot pass the purchase governance check, and is never issued.
 */
import { approvedCustomerRecordInputs } from './approved-inputs'
import type { ApprovedInputs } from './service'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY, SYNTHETIC_TEST_EXAMINATION_SOURCE_TEXT_APPROVAL } from '../governed/synthetic-test-authority'

/** The synthetic test bundle (every visible string marked TEST) plus its examination wording approval. Never part of governance. */
export function syntheticUatInputs(): ApprovedInputs {
  const bundle = CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY
  if (!bundle) return approvedCustomerRecordInputs(null)
  const base = approvedCustomerRecordInputs(bundle)
  return { ...base, source_text_examination: { approval: SYNTHETIC_TEST_EXAMINATION_SOURCE_TEXT_APPROVAL, acknowledgements: bundle.acknowledgements } }
}

/** The ports the gates consult. Absent = no synthetic path, which is every customer request. */
export interface SyntheticUatPorts {
  admits(userId: string, now: Date): boolean
  inputs(): ApprovedInputs
}

/** A stored record built from synthetic sources (its wording approval names the synthetic test authority). */
export const isSyntheticRecordAuthority = (authority: unknown) => typeof authority === 'string' && /synthetic|fixture/i.test(authority)
