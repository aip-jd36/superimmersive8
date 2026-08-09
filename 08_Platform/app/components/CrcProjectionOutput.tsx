/**
 * Final ProjectionOutput renderer (CRC Product Integration -- First
 * Usable Live Slice, Phase 7). Renders exactly what the deterministic
 * ProjectionOutput contract provides -- no field this component doesn't
 * receive can appear here, since ProjectionOutput itself
 * (lib/projection-layer/types.ts) has no claim_id/confidence/publication_scope/
 * governance fields on it at all. `claim_id` is used only as a React
 * `key`, never rendered as visible text.
 *
 * Emptiness rules (each field independently, per the frozen contract):
 * opening_line / understood_summary / knowledge_items / closing_cta each
 * render only when non-empty. If ALL FOUR are empty (the deliberate
 * "fully-empty" case assembleProjectionOutput itself already produces --
 * see that module's own header comment, JD decision 2026-08-08, for full
 * opt-out / zero-signal conversations), this component shows one honest,
 * neutral line rather than either a blank screen or inventing framing the
 * engine deliberately declined to produce.
 *
 * last_verified is wrapped into "Content last updated [date]" (not "last
 * reviewed" -- PRD_CRC_v1.0.md's own wording, PROJECTION_LAYER_ARCHITECTURE.md
 * §4/§8), formatted for readability when it parses as a date, falling
 * back to the raw stored string otherwise -- never reinterpreted beyond that.
 */

import type { ProjectionOutput } from '@/lib/projection-layer/types'

function formatLastVerified(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function CrcProjectionOutput({ output }: { output: ProjectionOutput }) {
  const isFullyEmpty = output.opening_line === '' && output.understood_summary === '' && output.knowledge_items.length === 0 && output.closing_cta === ''

  if (isFullyEmpty) {
    return (
      <div className="text-sm text-muted-foreground">
        The interview is complete. There wasn&apos;t enough information shared to generate a summary this time -- nothing was lost, and you&apos;re
        welcome to start a new conversation whenever you&apos;d like to share more.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {output.opening_line !== '' && <p className="text-base font-medium">{output.opening_line}</p>}

      {output.understood_summary !== '' && <p className="text-sm text-muted-foreground whitespace-pre-line">{output.understood_summary}</p>}

      {output.knowledge_items.length > 0 && (
        <div className="space-y-4">
          {output.knowledge_items.map((item) => {
            const lastUpdated = formatLastVerified(item.last_verified)
            return (
              <div key={item.claim_id} className="rounded-md border p-4">
                <p className="text-sm whitespace-pre-line">{item.statement}</p>
                {lastUpdated && <p className="mt-2 text-xs text-muted-foreground">Content last updated {lastUpdated}</p>}
              </div>
            )
          })}
        </div>
      )}

      {output.closing_cta !== '' && <p className="text-sm text-muted-foreground">{output.closing_cta}</p>}
    </div>
  )
}
