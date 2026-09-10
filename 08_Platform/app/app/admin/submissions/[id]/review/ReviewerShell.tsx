'use client'

/**
 * ReviewerShell — CAH-4F.1 (Reviewer Workspace Shell).
 *
 * The generic page-level layout owner for the Human Reviewer workspace:
 *
 *     ASSESSMENT NAVIGATION | ASSESSMENT WORK SURFACE | REVIEWER RESOURCES
 *
 * It owns ONLY:
 *   - the workspace region (renders `children` — the WorkbookClient — verbatim,
 *     always mounted, never remounted on inspector open/close);
 *   - the Reviewer Resources region (renders the opaque `inspector` ReactNode);
 *   - inspector open/close state and the reopen affordance;
 *   - the adjacent-column ⇄ overlay-drawer responsive decision.
 *
 * It MUST NOT (enforced by `__tests__/reviewer-shell/reviewer-shell.test.ts`
 * and the two authority-firewall suites):
 *   - import reviewer-lk / reviewer-context / assessment business services;
 *   - know about governed claims, CRC associations, or workbook state;
 *   - write anything.
 *
 * The workbook (`children`) and the resources content (`inspector`) are both
 * opaque `React.ReactNode` slots produced by the server `page.tsx`. The shell
 * never inspects, transforms, or couples them — UI adjacency here does not
 * collapse the three authority surfaces (Assessment Workbook / Reviewer Living
 * Knowledge / Linked CRC Context). See `ADR-001`.
 *
 * Responsive (breakpoint derived from measured region widths, NOT from
 * Tailwind's default `2xl` — see REVIEWER_RESOURCES_ARCHITECTURE.md §Responsive):
 *   - viewport ≥ ADJACENT_MIN_PX  → inspector is a real adjacent right column,
 *     the workbook flexes narrower beside it;
 *   - viewport <  ADJACENT_MIN_PX → inspector is a right-anchored overlay
 *     drawer; the workbook DOM is not reflowed; default closed.
 *
 * CAH-4F.2 (Contextual Inspector Coordination): at adjacent widths, only one
 * contextual surface occupies the right rail at a time. The shell derives one
 * layout-only fact — `workbookContextAsideHidden` — and publishes it through a
 * domain-neutral context (`./workspace-layout-context`) around the opaque
 * Workbook child. The shell still knows nothing about `rightTab`, guidance,
 * submission, evidence, LK topics or CRC associations — it only knows whether
 * Reviewer Resources currently occupies the adjacent rail. This is a UX
 * mechanism, not an authority boundary.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PanelRightOpen, X } from 'lucide-react'
import { WorkspaceLayoutProvider } from './workspace-layout-context'

/**
 * Below this width the assessment work surface (left nav 200px + its own
 * ~280px context aside + a readable center) plus a usable ~340px resource
 * column no longer fit together, so the inspector becomes an overlay drawer.
 * Justified in REVIEWER_RESOURCES_ARCHITECTURE.md §Responsive with the
 * per-viewport width table (1280 / 1440 / 1536 / 1920).
 */
export const ADJACENT_MIN_PX = 1440

export function ReviewerShell({
  children,
  inspector,
  resourcesAvailable,
}: {
  children: React.ReactNode
  /** Opaque server-rendered Reviewer Resources content. Never inspected here. */
  inspector: React.ReactNode
  resourcesAvailable: boolean
}) {
  // SSR guess: adjacent + open (the ordinary-desktop case). Corrected on mount.
  const [adjacent, setAdjacent] = useState(true)
  const [open, setOpen] = useState(true)
  const didInit = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${ADJACENT_MIN_PX}px)`)
    // First mount: pick the layout mode AND the initial open state from width.
    if (!didInit.current) {
      didInit.current = true
      setAdjacent(mq.matches)
      setOpen(mq.matches)
    }
    // On later resizes: track the layout mode only — respect the reviewer's
    // last open/close choice (do not auto-reopen on every resize).
    const onChange = (e: MediaQueryListEvent) => setAdjacent(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const close = useCallback(() => setOpen(false), [])
  const openInspector = useCallback(() => setOpen(true), [])

  // Escape closes the drawer (not the adjacent column — that stays put).
  useEffect(() => {
    if (adjacent || !open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adjacent, open])

  const showInspector = resourcesAvailable && open
  const showReopenTab = resourcesAvailable && !open

  // CAH-4F.2: the one layout-only fact handed to the Workbook child. True only
  // while Reviewer Resources is an in-flow adjacent column — so the Workbook's
  // own context aside yields the rail. In drawer mode (`!adjacent`) the
  // inspector is a fixed overlay that does not reflow the workbook, so the
  // aside stays visible: this stays false. Layout state only — no `rightTab`,
  // no guidance/submission/evidence, no resource data, no callback.
  const workspaceLayout = useMemo(
    () => ({ workbookContextAsideHidden: showInspector && adjacent }),
    [showInspector, adjacent],
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#FAFAF7' }}>
      {/* ── Assessment nav + work surface (the WorkbookClient owns its own
             internal 3-zone layout; the shell only bounds its width/height).
             CAH-4F.2: wrapped in the neutral layout provider — the shell never
             inspects or couples to `children`, it only publishes one boolean. */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <WorkspaceLayoutProvider value={workspaceLayout}>{children}</WorkspaceLayoutProvider>
      </div>

      {/* ── Reviewer Resources — adjacent column ─────────────────────────────
             Rendered in normal flow beside the workbook when the viewport is
             wide enough. Kept in the DOM (hidden, not unmounted) when closed so
             a completed look-up survives a close/reopen. */}
      {resourcesAvailable && adjacent && (
        <aside
          aria-label="Reviewer Resources"
          className={`${open ? 'flex' : 'hidden'} h-full w-[340px] 2xl:w-[380px] flex-shrink-0 flex-col border-l`}
          style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#FCFBF7' }}
        >
          <InspectorChrome onClose={close} content={inspector} />
        </aside>
      )}

      {/* ── Reviewer Resources — overlay drawer (narrow) ─────────────────────
             Right-anchored, does not reflow the workbook DOM. Light backdrop
             closes on click. */}
      {resourcesAvailable && !adjacent && (
        <>
          <div
            hidden={!open}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden="true"
          />
          <aside
            aria-label="Reviewer Resources"
            className={`fixed right-0 top-0 z-50 h-screen w-[min(420px,92vw)] flex flex-col border-l shadow-2xl transition-transform duration-200 ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#FCFBF7' }}
          >
            <InspectorChrome onClose={close} content={inspector} />
          </aside>
        </>
      )}

      {/* ── Reopen affordance ───────────────────────────────────────────────
             A slim persistent edge tab when the inspector is closed. Owned by
             the shell so WorkbookClient needs no change. */}
      {showReopenTab && (
        <button
          type="button"
          onClick={openInspector}
          className="fixed right-0 top-24 z-30 flex items-center gap-1.5 rounded-l-md border border-r-0 px-2.5 py-2 text-xs font-medium shadow-sm"
          style={{ borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#FCFBF7', color: '#1c1c1e' }}
          aria-label="Open Reviewer Resources"
        >
          <PanelRightOpen className="h-4 w-4" style={{ color: '#233f66' }} />
          Reviewer Resources
        </button>
      )}

      {/* Structural marker for the responsive acceptance test. */}
      <span
        hidden
        data-reviewer-shell-mode={adjacent ? 'adjacent' : 'drawer'}
        data-inspector-open={showInspector ? 'true' : 'false'}
      />
    </div>
  )
}

/**
 * The inspector panel frame — title, reference framing, close control, and a
 * single scroll region wrapping the (opaque) resources content. Shared by the
 * adjacent-column and drawer layouts. Owns no resource state.
 */
function InspectorChrome({ onClose, content }: { onClose: () => void; content: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className="flex flex-shrink-0 items-start justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#1c1c1e' }}>
            Reviewer Resources
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: '#83837e' }}>
            Reference materials to support your review — not assessment evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 rounded p-1 hover:bg-black/5"
          aria-label="Close Reviewer Resources"
        >
          <X className="h-4 w-4" style={{ color: '#83837e' }} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
    </div>
  )
}
