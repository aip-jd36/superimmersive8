/**
 * SI8-PRIVACY-CRC-1B / CRC-3 — the Commercial Readiness Check privacy notice, English and Traditional Chinese: approved content
 * only (`lib/legal/crc-privacy-notice.ts`). `?lang=zh-TW` selects Traditional Chinese; anything else shows English.
 *
 * None is approved yet, so this page shows the fixed "not available yet" notice, offers no language choice and is not indexed.
 * Once a notice complete in both languages is approved, each language renders under its own `lang` attribute, with a language
 * selector (`components/crc/CrcPrivacyNoticeView.tsx`). Separate from the Creator Record Privacy Notice at /privacy.
 */
import type { Metadata } from 'next'
import { CrcPrivacyNoticeView } from '@/components/crc/CrcPrivacyNoticeView'
import { CRC_PRIVACY_NOTICE, crcPrivacyNoticeHref, crcPrivacyNoticePublished, parseCrcNoticeLocale } from '@/lib/legal/crc-privacy-notice'

export const metadata: Metadata = {
  title: 'Commercial Readiness Check privacy notice — SuperImmersive 8',
  ...(crcPrivacyNoticePublished()
    ? { alternates: { languages: { en: crcPrivacyNoticeHref('en'), 'zh-TW': crcPrivacyNoticeHref('zh-TW') } } }
    : { robots: { index: false, follow: false } }),
}

export default function CrcPrivacyPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  return <CrcPrivacyNoticeView notice={CRC_PRIVACY_NOTICE} locale={parseCrcNoticeLocale(searchParams?.lang)} />
}
