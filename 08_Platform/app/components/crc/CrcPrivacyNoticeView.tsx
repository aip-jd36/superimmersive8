/**
 * SI8-PRIVACY-CRC-3 — the /crc/privacy page body: one language of the approved CRC privacy notice with an accessible language
 * selector, or the fixed "not available yet" notice. Server component. Renders only a notice complete in both languages.
 */
import { DEFAULT_LEGAL_DOCUMENT_LABELS, LegalDocumentPage, type LegalDocumentLabels } from '@/components/legal/LegalDocumentPage'
import {
  CRC_NOTICE_LOCALES,
  crcPrivacyNoticeHref,
  crcPrivacyNoticeIn,
  crcPrivacyNoticePublished,
  type CrcNoticeLocale,
  type CrcPrivacyNotice,
} from '@/lib/legal/crc-privacy-notice'

export const CRC_NOTICE_FALLBACK_TITLE: Record<CrcNoticeLocale, string> = {
  en: 'Commercial Readiness Check privacy notice',
  'zh-TW': '商業就緒度檢查隱私權聲明',
}

export const CRC_NOTICE_LABELS: Record<CrcNoticeLocale, LegalDocumentLabels> = {
  en: DEFAULT_LEGAL_DOCUMENT_LABELS,
  'zh-TW': { meta: (version, effectiveDate) => `版本 ${version} · 生效日期 ${effectiveDate}`, unavailable: '本文件尚未提供。' },
}

/** Each language's name in that language. */
export const CRC_NOTICE_LANGUAGE_NAMES: Record<CrcNoticeLocale, string> = { en: 'English', 'zh-TW': '繁體中文' }

export function CrcPrivacyLanguageNav({ current }: { current: CrcNoticeLocale }) {
  return (
    <nav aria-label="Language / 語言" className="mb-6 text-sm" data-crc-privacy-languages>
      <ul className="flex gap-4">
        {CRC_NOTICE_LOCALES.map((l) => (
          <li key={l}>
            <a
              href={crcPrivacyNoticeHref(l)}
              hrefLang={l}
              lang={l}
              aria-current={l === current ? 'page' : undefined}
              className={l === current ? 'font-semibold text-gray-900' : 'underline text-gray-600'}
            >
              {CRC_NOTICE_LANGUAGE_NAMES[l]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** The page body for one language. Renders only a complete, approved notice; otherwise the fixed unavailable notice. */
export function CrcPrivacyNoticeView({ notice, locale }: { notice: CrcPrivacyNotice | null; locale: CrcNoticeLocale }) {
  const published = crcPrivacyNoticePublished(notice)
  return (
    <LegalDocumentPage
      doc={published ? crcPrivacyNoticeIn(notice, locale) : null}
      fallbackTitle={CRC_NOTICE_FALLBACK_TITLE[locale]}
      lang={locale}
      labels={CRC_NOTICE_LABELS[locale]}
      before={published ? <CrcPrivacyLanguageNav current={locale} /> : undefined}
    />
  )
}

