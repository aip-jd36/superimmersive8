/**
 * SI8-PRIVACY-CRC-1B — the CRC privacy-notice link under the results gate's email field.
 *
 * Renders nothing until the CRC privacy notice is published (`lib/legal/crc-privacy-notice.ts`). The gate renders it from
 * `resultsGateDisclosure()` (`lib/crc-engine/results-gate-disclosure.ts`), which also gives the version the page reports with the
 * email; this component re-checks publication itself so it can never render on its own. Opens in a new tab so the visitor's gate
 * state is not lost. The Commercial Assurance follow-up sentence is rendered separately by the gate and is not part of this component.
 */
import { CRC_PRIVACY_NOTICE, CRC_PRIVACY_PATH, crcPrivacyNoticePublished } from '@/lib/legal/crc-privacy-notice'
import type { ApprovedLegalDocument } from '@/lib/legal/policies'
import { getResultsGatePrivacyLinkCopyLocalized } from './crc-ui-copy'
import type { CrcLocale } from './crc-locale'

export function ResultsGatePrivacyLink({ locale, doc = CRC_PRIVACY_NOTICE }: { locale: CrcLocale; doc?: ApprovedLegalDocument | null }) {
  if (!crcPrivacyNoticePublished(doc)) return null
  const copy = getResultsGatePrivacyLinkCopyLocalized(locale)
  return (
    <p className="text-xs text-muted-foreground" data-crc-privacy-link>
      {copy.prefix}
      <a href={CRC_PRIVACY_PATH} target="_blank" rel="noopener noreferrer" className="underline">
        {copy.linkText}
      </a>
      {copy.suffix}
    </p>
  )
}
