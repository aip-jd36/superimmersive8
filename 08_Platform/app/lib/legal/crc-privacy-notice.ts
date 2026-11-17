/**
 * SI8-PRIVACY-CRC-1B — the Commercial Readiness Check (CRC) privacy notice, as approved content only.
 *
 * PUBLICATION GATE. No CRC notice text is approved, so the slot below is `null`. While it is null:
 *   - /crc/privacy shows the fixed "This document is not available yet." page (noindex);
 *   - the results gate shows NO privacy link (`crcPrivacyNoticePublished()` is false);
 *   - the gate reports, and captures record, `results-gate-v1` (see `lib/crc-engine/results-gate-disclosure.ts`).
 * Deploying this file in this state changes nothing a CRC visitor sees or what CRC records.
 *
 * To publish: replace the slot with the approved text, its version identifier, its approval reference and the date it takes
 * effect, in one reviewed change, after the notice, the privacy contact and the retention statements are approved. The
 * working draft lives in 08_Platform/implementation/privacy-crc-1b/CRC_PRIVACY_NOTICE_DRAFT.md. Draft wording never goes here.
 *
 * Client-safe by design: this module is imported by the /crc client page, so it deliberately does not import
 * `./policies` (which carries the Creator Record notice and terms text). The completeness rule below mirrors
 * `legalPageContent()` in `./policies`; `__tests__/legal/crc-privacy-notice.test.ts` checks that the two agree.
 *
 * This notice is separate from the Creator Record Privacy Notice (`./policies`, `privacy-2026-11-09`), which is unchanged.
 */
import type { ApprovedLegalDocument } from './policies'

export const CRC_PRIVACY_NOTICE: ApprovedLegalDocument | null = null

/** The public path of the CRC notice (separate from the Creator Record notice at /privacy). */
export const CRC_PRIVACY_PATH = '/crc/privacy'

const VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

/** True only for a complete, approved document (the same rule as `legalPageContent()` in `./policies`). Fail closed. */
export function isCompleteLegalDocument(d: ApprovedLegalDocument | null): d is ApprovedLegalDocument {
  return !!d && VERSION_PATTERN.test(d.version) && /^\d{4}-\d{2}-\d{2}$/.test(d.effective_date) &&
    d.approval_reference.trim().length > 0 && d.title.trim().length > 0 && d.paragraphs.length > 0 &&
    d.paragraphs.every((p) => p.trim().length > 0)
}

/** Whether the CRC notice is published, and therefore whether the results gate links to it. */
export function crcPrivacyNoticePublished(doc: ApprovedLegalDocument | null = CRC_PRIVACY_NOTICE): boolean {
  return isCompleteLegalDocument(doc)
}
