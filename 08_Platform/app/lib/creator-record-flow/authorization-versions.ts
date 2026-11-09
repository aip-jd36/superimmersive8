/**
 * CR-V2-SCHEMA8-PATH-1 (E7) — the storage-consent and AI-examination permission identifiers a creator is asked for NOW, bound to
 * the approved privacy notice and terms versions (`lib/legal/policies.ts`) by `boundAuthorizationVersion`.
 *
 *   - storage consent: the page shows, and the upload accepts and records, only this identifier (`consent_required` otherwise).
 *     While the policies are not both approved, only SI8's synthetic test documents can be stored (real documents also need the
 *     policies) and the draft identifier alone is used.
 *   - AI-examination permission: null until the policies are approved; without it no live examination is offered. The application
 *     sends and grants exactly this identifier, and the database accepts a grant only for the version currently authorized there
 *     (20261113000000), so a grant under an earlier version, wording or policy no longer permits examination.
 *
 * CR-V2-MVP-PROD-PREP-1 / CR-V2-APPROVAL-AUTHORITY-FIX-1: an identifier binds only APPROVED wording (the slots in
 * `lib/creator-record/evidence-intake/contract.ts`, null today) and only while that approval names the customer wording set this
 * build renders (`customerWordingIdentity().sha256`). Publishing the policies alone binds nothing, and changing the consent text
 * (which changes the wording set) unbinds the approval until it is renewed. The intake boundary independently refuses anything but
 * an approved storage-consent identifier for real documents (`approvedStorageConsentIdentifier`).
 */
import {
  AI_EXAMINATION_PERMISSION_APPROVED_WORDING, approvedWordingIdWellFormed, boundAuthorizationVersion, CONSENT_VERSION_UNBINDABLE,
  EVIDENCE_CONSENT_APPROVED_WORDING, EVIDENCE_CONSENT_DRAFT_VERSION, type ApprovedAuthorizationWording,
} from '@/lib/creator-record/evidence-intake/contract'
import { approvedPolicyVersions, type ApprovedPolicyVersions } from '@/lib/legal/policies'
import { customerWordingIdentity } from './customer-wording'

export { AI_EXAMINATION_PERMISSION_APPROVED_WORDING, CONSENT_VERSION_UNBINDABLE, EVIDENCE_CONSENT_APPROVED_WORDING, type ApprovedAuthorizationWording }

/** Approved, well formed, and approving the customer wording set this build renders now. */
export function approvedWordingUsable(w: ApprovedAuthorizationWording | null, customerWordingSha256: string = customerWordingIdentity().sha256): w is ApprovedAuthorizationWording {
  return !!w && approvedWordingIdWellFormed(w.id) && w.customer_wording_sha256 === customerWordingSha256
}

export function evidenceConsentVersion(policies: ApprovedPolicyVersions | null = approvedPolicyVersions(), wording: ApprovedAuthorizationWording | null = EVIDENCE_CONSENT_APPROVED_WORDING): string {
  if (!policies) return EVIDENCE_CONSENT_DRAFT_VERSION
  // Policies published but no current approved consent wording: nothing a customer could agree to (fail closed).
  if (!approvedWordingUsable(wording)) return CONSENT_VERSION_UNBINDABLE
  return boundAuthorizationVersion(wording.id, policies) ?? CONSENT_VERSION_UNBINDABLE
}

export function aiExaminationPermissionVersion(policies: ApprovedPolicyVersions | null = approvedPolicyVersions(), wording: ApprovedAuthorizationWording | null = AI_EXAMINATION_PERMISSION_APPROVED_WORDING): string | null {
  if (!approvedWordingUsable(wording)) return null
  return boundAuthorizationVersion(wording.id, policies)
}
