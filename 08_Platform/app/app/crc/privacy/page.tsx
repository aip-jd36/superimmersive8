/**
 * SI8-PRIVACY-CRC-1B — the Commercial Readiness Check privacy notice: approved content only (`lib/legal/crc-privacy-notice.ts`).
 * None is approved yet, so this page shows the fixed "not available yet" notice and is not indexed. Separate from the Creator
 * Record Privacy Notice at /privacy.
 */
import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { CRC_PRIVACY_NOTICE, crcPrivacyNoticePublished } from '@/lib/legal/crc-privacy-notice'

export const metadata: Metadata = {
  title: 'Commercial Readiness Check privacy notice — SuperImmersive 8',
  ...(crcPrivacyNoticePublished() ? {} : { robots: { index: false, follow: false } }),
}

export default function CrcPrivacyPage() {
  return <LegalDocumentPage doc={CRC_PRIVACY_NOTICE} fallbackTitle="Commercial Readiness Check privacy notice" />
}
