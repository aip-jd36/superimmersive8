/**
 * SI8-PRIVACY-CRC-1B / CRC-3 — the Commercial Readiness Check (CRC) privacy notice, as approved content only, in English and
 * Traditional Chinese.
 *
 * PUBLICATION GATE. A notice is published only when it is complete in BOTH languages, with a version, an effective date and
 * an approval reference (`isCompleteCrcPrivacyNotice`). Fail closed: a notice missing either language, or its effective date,
 * is not published at all.
 *
 * STATE (SI8-PRIVACY-CRC-5): the copy in `./crc-privacy-notice-proposed.ts` (version crc-privacy-2026-11-17, English and
 * Traditional Chinese) is founder-approved, reference SI8-PRIVACY-CRC-5-20261117, and is placed in the slot below. Its
 * EFFECTIVE DATE IS PENDING: it must be the actual Production publication date, which is not known yet. While it is '':
 *   - /crc/privacy shows the fixed "This document is not available yet." page (noindex) in every language;
 *   - the results gate shows NO privacy link (`crcPrivacyNoticePublished()` is false);
 *   - the gate reports, and captures record, `results-gate-v1` (see `lib/crc-engine/results-gate-disclosure.ts`).
 * Deploying this file in this state changes nothing a CRC visitor sees or what CRC records.
 *
 * To publish, in the Production release change (and only with Production release authorization): set
 * CRC_PRIVACY_NOTICE_EFFECTIVE_DATE to the publication date (YYYY-MM-DD). Text, version and approval reference stay as they
 * are. The link, both language pages and gate version v2 then switch on together.
 *
 * Client-safe by design: this module is imported by the /crc client page, so it deliberately does not import
 * `./policies` (which carries the Creator Record notice and terms text) except for a type. The per-language completeness rule
 * mirrors `legalPageContent()` in `./policies`; `__tests__/legal/crc-privacy-notice.test.ts` checks that the two agree.
 *
 * This notice is separate from the Creator Record Privacy Notice (`./policies`, `privacy-2026-11-09`), which is unchanged.
 */
import type { ApprovedLegalDocument } from './policies'
import { CRC_PRIVACY_NOTICE_PROPOSED } from './crc-privacy-notice-proposed'

/** The notice languages. Identical to the CRC UI locales (`components/crc/crc-locale.ts`; checked by test). */
export type CrcNoticeLocale = 'en' | 'zh-TW'
export const CRC_NOTICE_LOCALES: readonly CrcNoticeLocale[] = ['en', 'zh-TW']

export interface CrcPrivacyNoticeText {
  title: string
  /** Paragraphs, in order. Plain text: no markup is interpreted. Same count and order in every language. */
  paragraphs: readonly string[]
}

export interface CrcPrivacyNotice {
  /** One version for both languages, e.g. "crc-privacy-2026-11-17" (same pattern as the Creator Record documents). */
  version: string
  effective_date: string
  /** Who approved it and where that approval is recorded (not shown to visitors). */
  approval_reference: string
  text: Readonly<Record<CrcNoticeLocale, CrcPrivacyNoticeText>>
}

/** Founder copy approval of crc-privacy-2026-11-17 (both languages), recorded 2026-11-17. */
export const CRC_PRIVACY_NOTICE_APPROVAL_REFERENCE = 'SI8-PRIVACY-CRC-5-20261117'

/**
 * PENDING. The actual Production publication date (YYYY-MM-DD), set only in the Production release change. While empty the
 * notice is not published anywhere (fail closed).
 */
export const CRC_PRIVACY_NOTICE_EFFECTIVE_DATE: string = ''

export const CRC_PRIVACY_NOTICE: CrcPrivacyNotice | null = Object.freeze({
  ...CRC_PRIVACY_NOTICE_PROPOSED,
  effective_date: CRC_PRIVACY_NOTICE_EFFECTIVE_DATE,
  approval_reference: CRC_PRIVACY_NOTICE_APPROVAL_REFERENCE,
})

/** The public path of the CRC notice (separate from the Creator Record notice at /privacy). */
export const CRC_PRIVACY_PATH = '/crc/privacy'

/** The query parameter that selects the notice language. English is the default and has no parameter. */
export const CRC_PRIVACY_LANG_PARAM = 'lang'

/** The notice URL for a language: `/crc/privacy` (English) or `/crc/privacy?lang=zh-TW`. */
export function crcPrivacyNoticeHref(locale: CrcNoticeLocale): string {
  return locale === 'en' ? CRC_PRIVACY_PATH : `${CRC_PRIVACY_PATH}?${CRC_PRIVACY_LANG_PARAM}=${locale}`
}

/** The language a `?lang=` value selects. Anything other than an exact supported value falls back to English. */
export function parseCrcNoticeLocale(raw: unknown): CrcNoticeLocale {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === 'zh-TW' ? 'zh-TW' : 'en'
}

const VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

/** True only for a complete, approved document (the same rule as `legalPageContent()` in `./policies`). Fail closed. */
export function isCompleteLegalDocument(d: ApprovedLegalDocument | null): d is ApprovedLegalDocument {
  return !!d && VERSION_PATTERN.test(d.version) && /^\d{4}-\d{2}-\d{2}$/.test(d.effective_date) &&
    d.approval_reference.trim().length > 0 && d.title.trim().length > 0 && d.paragraphs.length > 0 &&
    d.paragraphs.every((p) => p.trim().length > 0)
}

/** One language of the notice, in the shape the shared legal page renders; null when that language is absent. */
export function crcPrivacyNoticeIn(notice: CrcPrivacyNotice | null, locale: CrcNoticeLocale): ApprovedLegalDocument | null {
  const t = notice?.text?.[locale]
  if (!notice || !t) return null
  return { version: notice.version, effective_date: notice.effective_date, approval_reference: notice.approval_reference, title: t.title, paragraphs: t.paragraphs }
}

/** Complete in every language, with the same number of paragraphs in each. Fail closed. */
export function isCompleteCrcPrivacyNotice(notice: CrcPrivacyNotice | null): notice is CrcPrivacyNotice {
  if (!notice) return false
  const docs = CRC_NOTICE_LOCALES.map((l) => crcPrivacyNoticeIn(notice, l))
  return docs.every((d) => isCompleteLegalDocument(d)) && docs.every((d) => d!.paragraphs.length === docs[0]!.paragraphs.length)
}

/** Whether the CRC notice is published, and therefore whether the results gate links to it. */
export function crcPrivacyNoticePublished(doc: CrcPrivacyNotice | null = CRC_PRIVACY_NOTICE): boolean {
  return isCompleteCrcPrivacyNotice(doc)
}
