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
 */
import { AI_EXAMINATION_PERMISSION_DRAFT_VERSION, boundAuthorizationVersion, EVIDENCE_CONSENT_DRAFT_VERSION } from '@/lib/creator-record/evidence-intake/contract'
import { approvedPolicyVersions, type ApprovedPolicyVersions } from '@/lib/legal/policies'

/** Never shown and never accepted: a consent that could not be bound to the policies fails closed instead of going unbound. */
export const CONSENT_VERSION_UNBINDABLE = 'consent-version-unavailable'

export function evidenceConsentVersion(policies: ApprovedPolicyVersions | null = approvedPolicyVersions()): string {
  if (!policies) return EVIDENCE_CONSENT_DRAFT_VERSION
  return boundAuthorizationVersion(EVIDENCE_CONSENT_DRAFT_VERSION, policies) ?? CONSENT_VERSION_UNBINDABLE
}

export function aiExaminationPermissionVersion(policies: ApprovedPolicyVersions | null = approvedPolicyVersions()): string | null {
  return boundAuthorizationVersion(AI_EXAMINATION_PERMISSION_DRAFT_VERSION, policies)
}
