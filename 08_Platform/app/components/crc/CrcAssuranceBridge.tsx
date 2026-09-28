'use client'

/**
 * Results-confirmation → Commercial Assurance bridge (2026-09-28).
 *
 * Rendered only on the post-email 'results_confirmation' phase -- the
 * in-browser end state every current (non-grandfathered) session reaches.
 * Never on the email gate, and deliberately separate from the legacy
 * CommercialAssuranceBridge, which still serves the grandfathered
 * 'complete' phase unchanged.
 *
 * Presentation only: no session state, no API calls, no analytics. The
 * caller passes the existing high-intent Calendly CTA in as
 * `primaryAction` untouched (its own href/onClick/cta_click tracking stay
 * owned by app/crc/page.tsx); this component only adds the explanatory
 * copy and a subordinate text link to the Assessment section of the
 * marketing site. Hierarchy: outlined Calendly button first, plain text
 * link second -- the informational link must never outweigh it.
 */

import type { ReactNode } from 'react'
import { useCrcLocale } from './CrcLocaleProvider'
import { SI8_MARKETING_SITE_URL } from './CrcIdentityMark'

export const COMMERCIAL_ASSURANCE_LEARN_MORE_URL = `${SI8_MARKETING_SITE_URL}#how`

export function CrcAssuranceBridge({ primaryAction }: { primaryAction: ReactNode }) {
  const { copy } = useCrcLocale()

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">{copy.assuranceBridgeHeading}</p>
      <p className="text-sm text-muted-foreground">{copy.assuranceBridgeBody}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {primaryAction}
        <a
          href={COMMERCIAL_ASSURANCE_LEARN_MORE_URL}
          target="_blank"
          rel="noopener"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {copy.assuranceBridgeLearnMore}
        </a>
      </div>
    </div>
  )
}
