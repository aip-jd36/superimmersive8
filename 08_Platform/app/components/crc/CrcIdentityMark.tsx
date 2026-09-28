'use client'

/**
 * SI8 / CRC text-based product lockup (CRC-UI-1, 2026-09-18; product/
 * parent-brand relationship added 2026-09-28).
 *
 * PRODUCT DECISION (resolved, not re-litigated here): a text-only lockup,
 * not the marketing site's SVG logo asset -- no logo/wordmark file exists
 * anywhere in this Next.js app (07_Website/'s asset is a separate,
 * statically-built project, not imported here), and this milestone does
 * not copy it in or touch that separate codebase. This component is
 * intentionally small and isolated so it can be swapped for an
 * authoritative brand asset later without touching any CRC page/flow
 * logic -- every caller only ever renders <CrcIdentityMark />.
 *
 * Renders "Commercial Readiness Check / by SuperImmersive 8", with the
 * brand name linking back to the marketing site. The link opens a new tab
 * so an in-progress CRC session is never navigated away from. `noopener`
 * only (not `noreferrer`): the destination is SI8's own marketing site, so
 * the referrer is kept for first-party analytics. The brand name itself
 * is never localized -- only the surrounding attribution template is.
 */

import { useCrcLocale } from './CrcLocaleProvider'

export const SI8_MARKETING_SITE_URL = 'https://www.superimmersive8.com/'
const BRAND_NAME = 'SuperImmersive 8'

export function CrcIdentityMark() {
  const { copy } = useCrcLocale()
  const [before, after] = copy.productSubtitle.split('{brand}')

  return (
    <div className="leading-tight">
      <p className="text-sm font-semibold tracking-tight text-foreground">{copy.productName}</p>
      <p className="text-xs text-muted-foreground">
        {before}
        <a
          href={SI8_MARKETING_SITE_URL}
          target="_blank"
          rel="noopener"
          className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          {BRAND_NAME}
        </a>
        {after}
      </p>
    </div>
  )
}
