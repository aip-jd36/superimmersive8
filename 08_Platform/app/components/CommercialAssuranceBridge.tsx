/**
 * CRC ending redesign -- the Method Framing bridge into SI8 Commercial
 * Assurance (approved 2026-08-12). Product-layer/UI only: no dependency on
 * ProjectionOutput, StructuredUnderstanding, or any session state -- the
 * distinction it communicates (self-described conversation vs.
 * independently reviewed evidence) is true of every CRC session
 * identically, so this renders unconditionally whenever the interview has
 * completed, with no per-session logic.
 *
 * Replaces the retired `closing_cta` line's role (see
 * CrcProjectionOutput.tsx's own header) without touching Projection's
 * contract -- closing_cta is still computed, just no longer displayed.
 *
 * Deliberately NOT a topic checklist, coverage map, or comparison table --
 * the approved design principle is "different method, not more topics."
 * No icons, no badges, no colored panel, no borders beyond the same
 * `border-t` divider already used elsewhere on this page. Two plain
 * paragraphs and a single restrained CTA, sized to read in well under 20
 * seconds.
 */

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { buildCalendlyUrl } from '@/lib/crc-engine/calendly-attribution'

/**
 * CRC Identity + Abuse Prevention + Analytics milestone -- Calendly
 * attribution (design report §9) and impression/click tracking (JD's
 * approved additions). `attributionToken`/`email` are optional: a session
 * that finalized before ever reaching the email gate (declined, or hit
 * the turn ceiling before turn 4) may have neither -- the bridge still
 * renders and the CTA still works, just without attribution params.
 *
 * attributionToken is passed as a UTM-style tracking param, not the real
 * session id -- see the migration's own header for why the actual
 * internal row identifier is deliberately kept out of a third-party
 * URL/referrer chain. UTM params are used (rather than a proprietary
 * Calendly param) because they're documented and supported without any
 * Calendly-side configuration -- see design report §9 for the honest
 * caveat that exact non-UTM Calendly param names were not independently
 * verified.
 */
interface CommercialAssuranceBridgeProps {
  attributionToken?: string
  email?: string | null
}

export function CommercialAssuranceBridge({ attributionToken, email }: CommercialAssuranceBridgeProps) {
  useEffect(() => {
    // Fire-and-forget, best-effort -- see /api/crc/bridge-shown's own
    // header for why this is safe to call on every mount (server-side
    // idempotent, exactly one impression row per session regardless of
    // how many times this component mounts).
    fetch('/api/crc/bridge-shown', { method: 'POST' }).catch(() => {})
  }, [])

  function handleCtaClick() {
    // Fire-and-forget -- target="_blank" below keeps this tab alive, so an
    // ordinary fetch is sufficient (no navigator.sendBeacon needed).
    fetch('/api/crc/cta-click', { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm font-medium">How this understanding was built</p>

      <p className="text-sm text-muted-foreground">
        This understanding came from what you shared in conversation -- a fast, educational way to surface commercial-readiness considerations.
      </p>

      <p className="text-sm text-muted-foreground">
        A Commercial Assurance Assessment works differently: an independent SI8 reviewer examines evidence like your files, licenses, and prompts, and
        produces an Assessment Report you can hand to a client, a platform, or legal.
      </p>

      <Button asChild variant="outline" size="sm">
        <a href={buildCalendlyUrl(attributionToken, email)} target="_blank" rel="noopener noreferrer" onClick={handleCtaClick}>
          Talk with SI8 about a Commercial Assurance Assessment
        </a>
      </Button>
    </div>
  )
}
