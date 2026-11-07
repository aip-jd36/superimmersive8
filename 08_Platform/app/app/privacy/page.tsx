/** CR-V2-MVP-LAUNCH-FOUNDATION-1 — the privacy notice: approved content only (`lib/legal/policies.ts`); none is approved yet. */
import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { PRIVACY_NOTICE, legalPageContent } from '@/lib/legal/policies'

export const metadata: Metadata = {
  title: 'Privacy notice — SuperImmersive 8',
  ...(legalPageContent(PRIVACY_NOTICE).available ? {} : { robots: { index: false, follow: false } }),
}

export default function PrivacyPage() {
  return <LegalDocumentPage doc={PRIVACY_NOTICE} fallbackTitle="Privacy notice" />
}
