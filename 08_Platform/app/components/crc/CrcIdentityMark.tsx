/**
 * SI8 / CRC text-based product lockup (CRC-UI-1, 2026-09-18).
 *
 * PRODUCT DECISION (resolved, not re-litigated here): a text-only lockup,
 * not the marketing site's SVG logo asset -- no logo/wordmark file exists
 * anywhere in this Next.js app (07_Website/'s asset is a separate,
 * statically-built project, not imported here), and this milestone does
 * not copy it in or touch that separate codebase. This component is
 * intentionally small and isolated so it can be swapped for an
 * authoritative brand asset later without touching any CRC page/flow
 * logic -- every caller only ever renders <CrcIdentityMark />.
 */

export function CrcIdentityMark() {
  return (
    <div className="flex items-baseline gap-1.5 leading-none">
      <span className="text-lg font-bold tracking-tight text-primary">SI8</span>
      <span className="text-sm font-medium text-muted-foreground">CRC</span>
    </div>
  )
}
