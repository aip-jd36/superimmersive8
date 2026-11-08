/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — the privacy notice and terms of service, as approved content only.
 *
 * INFRASTRUCTURE ONLY. No policy text is approved, so none is published: each slot below is `null`, the public pages say the
 * document is not available yet, and `legalPoliciesApproved()` is false. While it is false, Creator Record v2 cannot accept real
 * documents, offer AI examination or sell a record, whatever the other locks say (`evidence-production.ts`,
 * `examination-customer.ts`, `customer-flow/purchase.ts`).
 *
 * CR-V2-SCHEMA8-PATH-1 (E7): the approved versions are also part of every storage consent and AI-examination permission a
 * creator gives (`../creator-record/evidence-intake/contract.ts`), so a change to either document makes earlier authorizations
 * stale instead of silently reusing them.
 *
 * To publish: replace a slot with the approved text, its version identifier, its approval reference and the date it takes effect,
 * in one reviewed change. Draft wording never goes here.
 */

export interface ApprovedLegalDocument {
  /**
   * A stable identifier, e.g. "privacy-2026-12-01". Shown on the page and recorded inside every consent and permission that
   * relies on it. 3–32 characters, lower case: it must fit inside the permission identifiers the database stores.
   */
  version: string
  effective_date: string
  /** Who approved it and where that approval is recorded (not shown to customers). */
  approval_reference: string
  title: string
  /** Paragraphs, in order. Plain text: no markup is interpreted. */
  paragraphs: readonly string[]
}

export const PRIVACY_NOTICE: ApprovedLegalDocument | null = null
export const TERMS_OF_SERVICE: ApprovedLegalDocument | null = null

export { LEGAL_PATHS } from './paths'

/** The version format: 3–32 characters (E7 binds these inside 120-character permission identifiers). */
export const LEGAL_VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

const complete = (d: ApprovedLegalDocument | null): d is ApprovedLegalDocument =>
  !!d && LEGAL_VERSION_PATTERN.test(d.version) && /^\d{4}-\d{2}-\d{2}$/.test(d.effective_date) &&
  d.approval_reference.trim().length > 0 && d.title.trim().length > 0 && d.paragraphs.length > 0 && d.paragraphs.every((p) => p.trim().length > 0)

type PolicyDocs = { privacy: ApprovedLegalDocument | null; terms: ApprovedLegalDocument | null }
const CURRENT: PolicyDocs = { privacy: PRIVACY_NOTICE, terms: TERMS_OF_SERVICE }

/** True only when BOTH documents carry complete, approved content. Fail closed. */
export function legalPoliciesApproved(docs: PolicyDocs = CURRENT): boolean {
  return complete(docs.privacy) && complete(docs.terms)
}

/** CR-V2-SCHEMA8-PATH-1 (E7): the two approved versions an authorization relies on, or null while either is not approved. */
export interface ApprovedPolicyVersions {
  privacy: string
  terms: string
}

export function approvedPolicyVersions(docs: PolicyDocs = CURRENT): ApprovedPolicyVersions | null {
  return complete(docs.privacy) && complete(docs.terms) ? { privacy: docs.privacy.version, terms: docs.terms.version } : null
}

/** What a public legal page shows: the approved document, or nothing (never draft text). */
export function legalPageContent(doc: ApprovedLegalDocument | null): { available: true; doc: ApprovedLegalDocument } | { available: false } {
  return complete(doc) ? { available: true, doc } : { available: false }
}
