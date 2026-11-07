/** CR-V2-MVP-LAUNCH-FOUNDATION-1 — the terms of service: approved content only (`lib/legal/policies.ts`); none is approved yet. */
import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { TERMS_OF_SERVICE, legalPageContent } from '@/lib/legal/policies'

export const metadata: Metadata = {
  title: 'Terms of service — SuperImmersive 8',
  ...(legalPageContent(TERMS_OF_SERVICE).available ? {} : { robots: { index: false, follow: false } }),
}

export default function TermsPage() {
  return <LegalDocumentPage doc={TERMS_OF_SERVICE} fallbackTitle="Terms of service" />
}
