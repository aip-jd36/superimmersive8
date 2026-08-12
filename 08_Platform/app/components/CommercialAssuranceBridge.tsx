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

import { Button } from '@/components/ui/button'

const COMMERCIAL_ASSURANCE_CALENDLY_URL = 'https://calendly.com/aipenguins/superimmersive8'

export function CommercialAssuranceBridge() {
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
        <a href={COMMERCIAL_ASSURANCE_CALENDLY_URL} target="_blank" rel="noopener noreferrer">
          Talk with SI8 about a Commercial Assurance Assessment
        </a>
      </Button>
    </div>
  )
}
