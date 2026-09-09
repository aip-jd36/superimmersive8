/**
 * CAH-4F.1 — Reviewer Workspace Shell acceptance (source-scan; the repo has no
 * React render harness — same technique as the two authority-firewall suites).
 *
 * Proves the approved architecture:
 *
 *     ASSESSMENT NAVIGATION | ASSESSMENT WORK SURFACE | REVIEWER RESOURCES
 *
 *   - <ReviewerShell> owns the page frame + inspector open/close + responsive
 *     layout; it is generic (imports no reviewer / assessment service);
 *   - <WorkbookClient> is the shell's `children` — always mounted, never
 *     remounted on inspector open/close — and still owns all workbook state;
 *   - Reviewer Resources reaches the shell as one opaque ReactNode `inspector`
 *     slot; it is NOT rendered above WorkbookClient and NOT nested inside it;
 *   - the LK look-up stays explicit-action-only (no fetch on open/tab-switch);
 *   - the Linked CRC Context tab is always present with a neutral empty state.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')
const R = 'app/admin/submissions/[id]/review'
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const importLines = (rel: string) =>
  (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

const SHELL = `${R}/ReviewerShell.tsx`
const INSPECTOR = `${R}/ReviewerResourcesInspector.tsx`
const RESOURCES = `${R}/ReviewerResources.tsx`
const LK_PANEL = `${R}/ReviewerLkPanel.tsx`
const LK_LOOKUP = `${R}/ReviewerLkLookup.tsx`
const CRC_PANEL = `${R}/ReviewerCrcContextPanel.tsx`
const WORKBOOK = `${R}/WorkbookClient.tsx`
const PAGE = `${R}/page.tsx`

// ── A. Shell structure — three peer regions, not a stack ───────────────────

describe('A — shell structure', () => {
  const page = codeOnly(PAGE)
  const shell = codeOnly(SHELL)

  test('page.tsx wraps <WorkbookClient> in <ReviewerShell> (WorkbookClient is children, not a fragment sibling above)', () => {
    expect(page).toMatch(/<ReviewerShell[\s\S]*?>\s*<WorkbookClient[\s\S]*?\/>\s*<\/ReviewerShell>/)
    // the old fragment-sibling layout is gone
    expect(page).not.toMatch(/<>\s*<ReviewerResources/)
    expect(page).not.toMatch(/<ReviewerResources[^/]*\/>\s*<WorkbookClient/)
  })

  test('page.tsx passes Reviewer Resources as the opaque `inspector` prop, never as a WorkbookClient prop', () => {
    expect(page).toMatch(/inspector=\{[^}]*<ReviewerResources submissionId=\{params\.id\} \/>/)
    const wc = page.slice(page.indexOf('<WorkbookClient'))
    expect(wc.slice(0, wc.indexOf('>') + 1)).not.toMatch(/inspector|Reviewer(Resources|Shell|LkPanel|CrcContextPanel)/)
  })

  test('ReviewerShell is a client component that lays workspace + inspector as peers in ONE viewport-height flex row', () => {
    expect(read(SHELL)).toMatch(/^'use client'/m)
    expect(shell).toMatch(/className="flex h-screen overflow-hidden"/)
    // workspace cell renders {children} verbatim; inspector is a separate <aside>
    expect(shell).toMatch(/<div className="flex-1 min-w-0 h-full overflow-hidden">\{children\}<\/div>/)
    expect(shell).toMatch(/<aside\b[\s\S]*?aria-label="Reviewer Resources"/)
  })

  test('the shell renders {children} exactly once and unconditionally (no {open && children} / no ternary mount)', () => {
    const occurrences = shell.match(/\{children\}/g) ?? []
    expect(occurrences.length).toBe(1)
    expect(shell).not.toMatch(/\{\s*open\s*&&\s*children\s*\}/)
    expect(shell).not.toMatch(/\{\s*[a-zA-Z]+\s*\?\s*children\s*:/)
  })
})

// ── B. Authority isolation — the shell is generic ─────────────────────────

describe('B — authority isolation', () => {
  test('ReviewerShell imports NO reviewer-lk / reviewer-context / assessment / crc service, and no WorkbookClient / Section', () => {
    const imports = importLines(SHELL)
    expect(imports).not.toMatch(
      /@\/lib\/reviewer-lk|@\/lib\/reviewer-context|@\/lib\/crc-project-context|@\/lib\/crc-sales|@\/lib\/crc-assurance-handoff|@\/lib\/assessments|@\/lib\/retrieval-engine|@\/lib\/bounded-interpretation/,
    )
    expect(imports).not.toMatch(/WorkbookClient|Section[1-7]|workbook-schema|guidance|ReviewerLkPanel|ReviewerCrcContextPanel|ReviewerResources/)
  })

  test('ReviewerShell writes nothing — no fetch, no db verbs, no form controls', () => {
    const shell = codeOnly(SHELL)
    expect(shell).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/)
    expect(shell).not.toMatch(/<textarea|<input\b|<select\b/)
  })

  test('the shell slots are typed as opaque React.ReactNode', () => {
    const shell = read(SHELL)
    expect(shell).toMatch(/children:\s*React\.ReactNode/)
    expect(shell).toMatch(/inspector:\s*React\.ReactNode/)
  })

  test('reverse boundary: WorkbookClient imports/uses no shell / inspector / reviewer-resources identifier (code, not comments)', () => {
    const wb = codeOnly(WORKBOOK)
    expect(wb).not.toMatch(/ReviewerShell|ReviewerResources|ReviewerResourcesInspector|ReviewerLkPanel|ReviewerCrcContextPanel|reviewer-lk|reviewer-context/)
    // no prop / state carrying the inspector
    expect(wb).not.toMatch(/inspector\s*[:=]|resourcesPanel/)
  })
})

// ── C. Workbook persistence — never remounted, one structural change ──────

describe('C — Workbook persistence', () => {
  test('the ONLY structural change to WorkbookClient is the outer h-screen → h-full', () => {
    const wb = read(WORKBOOK)
    // outer container is now h-full (height owned by the shell), not h-screen
    expect(wb).toMatch(/<div className="flex flex-col h-full" style=\{\{ backgroundColor: '#FAFAF7' \}\}>/)
    expect(wb).not.toMatch(/className="flex flex-col h-screen"/)
  })

  test('all workbook state / behavior identifiers are still present (regression tripwire)', () => {
    const wb = read(WORKBOOK)
    for (const id of [
      'useState<WorkbookData>',
      "useState<Section>('1')",
      "useState<RightTab>('guidance')",
      'activeDomain',
      'computeGates',
      'sectionNav',
      'saveTimer',
      '/api/admin/submissions/${submissionId}/workbook',
      "method: 'PATCH'",
      'isFirstRender',
    ]) {
      expect(wb).toContain(id)
    }
  })

  test('inspector open/close is a visibility toggle on the <aside>, not a mount toggle of the workspace', () => {
    const shell = codeOnly(SHELL)
    // adjacent aside toggles hidden/flex; drawer aside toggles translate-x — both
    // keep the DOM mounted so a completed look-up survives close/reopen
    expect(shell).toMatch(/\$\{open \? 'flex' : 'hidden'\}/)
    expect(shell).toMatch(/translate-x-0['"]?\s*:\s*['"]?translate-x-full/)
  })
})

// ── D. Living Knowledge — explicit action only ────────────────────────────

describe('D — Living Knowledge', () => {
  test('no fetch on inspector open or tab switch — LK look-up has no mount effect anywhere in the chain', () => {
    for (const rel of [SHELL, INSPECTOR, RESOURCES, LK_PANEL]) {
      expect(codeOnly(rel)).not.toMatch(/fetch\(/)
    }
    const lookup = codeOnly(LK_LOOKUP)
    // the single fetch lives inside the lookUp callback, never a useEffect
    expect((lookup.match(/fetch\(/g) ?? []).length).toBe(1)
    expect(lookup).not.toMatch(/useEffect\([\s\S]*?fetch\(/)
    expect(lookup).toMatch(/const lookUp = useCallback\(async \(\) => \{[\s\S]*?fetch\(/)
  })

  test('the inspector tab host performs NO network call when switching modes', () => {
    const src = codeOnly(INSPECTOR)
    expect(src).not.toMatch(/fetch\(|useEffect/)
    expect(src).toMatch(/onClick=\{\(\) => setMode\(id\)\}/)
  })

  test('canonical topic id is unchanged — fetch URL carries the raw enum, chips carry data-topic', () => {
    const lookup = codeOnly(LK_LOOKUP)
    expect(lookup).toMatch(/reviewer-lk\?topic=\$\{encodeURIComponent\(topic\)\}/)
    expect(lookup).toMatch(/role="radiogroup"/)
    expect(lookup).toMatch(/data-topic=\{t\}/)
  })

  test('the "Living Knowledge" tab label + governed-research framing survive the move into the inspector', () => {
    expect(read(INSPECTOR)).toMatch(/label: 'Living Knowledge'/)
    expect(read(LK_PANEL)).toMatch(/REVIEWER_LK_FRAMING\.body/)
  })
})

// ── E. Linked CRC Context — always a tab, neutral when unlinked ───────────

describe('E — Linked CRC Context', () => {
  test('the "Linked CRC Context" tab is always rendered by the inspector', () => {
    expect(read(INSPECTOR)).toMatch(/label: 'Linked CRC Context'/)
    // both tab panels are always in the DOM
    const src = codeOnly(INSPECTOR)
    expect(src).toMatch(/id="reviewer-resources-panel-living_knowledge"/)
    expect(src).toMatch(/id="reviewer-resources-panel-linked_crc"/)
  })

  test('no-linked-CRC renders a NEUTRAL empty state, not null, and not an assessment deficiency', () => {
    const crc = codeOnly(CRC_PANEL)
    expect(crc).toMatch(/if \(!context\.linked\) \{[\s\S]*?No CRC conversation is linked to this submission/)
    // the old `if (!context.linked) return null` is gone
    expect(crc).not.toMatch(/if \(!context\.linked\) return null/)
    expect(crc).toMatch(/not an\s*\n?\s*assessment deficiency/)
  })

  test('association model + deliberate transcript access are unchanged', () => {
    const crc = read(CRC_PANEL)
    expect(crc).toMatch(/getReviewerCrcContext\(submissionId\)/)
    expect(crc).toMatch(/<ReviewerTranscriptDrawer submissionId=\{submissionId\} associationId=\{provenance\.association_id\} \/>/)
    // the CAH-4C transcript route/audit is untouched by this milestone
    expect(read(`${R}/ReviewerTranscriptDrawer.tsx`)).toMatch(/reviewer-crc-context\/\$\{associationId\}\/transcript/)
  })
})

// ── F. Responsive — adjacent column vs overlay drawer, from measured width ─

describe('F — responsive', () => {
  const shell = read(SHELL)
  const shellCode = codeOnly(SHELL)

  test('the adjacent/drawer breakpoint is an explicit ordinary-desktop constant, not Tailwind default 2xl (1536)', () => {
    const m = shell.match(/export const ADJACENT_MIN_PX = (\d+)/)
    expect(m).not.toBeNull()
    const px = Number(m![1])
    expect(px).toBeGreaterThanOrEqual(1280)
    expect(px).toBeLessThanOrEqual(1536)
    // the decision is made from viewport width via matchMedia, not a static
    // Tailwind `2xl:` on the layout branch
    expect(shell).toMatch(/matchMedia\(`\(min-width: \$\{ADJACENT_MIN_PX\}px\)`\)/)
    expect(shellCode).toMatch(/setAdjacent\(mq\.matches\)/)
  })

  test('adjacent mode: a real in-flow right column (border-l, fixed width, flex-shrink-0) — NOT position:fixed', () => {
    // the adjacent branch renders an <aside> with a width + border, no `fixed`
    const adjacentBranch = shellCode.slice(shellCode.indexOf('adjacent &&'), shellCode.indexOf('!adjacent'))
    expect(adjacentBranch).toMatch(/w-\[340px\] 2xl:w-\[380px\]/)
    expect(adjacentBranch).toMatch(/flex-shrink-0/)
    expect(adjacentBranch).toMatch(/border-l/)
    expect(adjacentBranch).not.toMatch(/fixed/)
  })

  test('drawer mode: right-anchored position:fixed overlay with a transform transition; workbook DOM not reflowed', () => {
    const drawerBranch = shellCode.slice(shellCode.indexOf('!adjacent &&'))
    expect(drawerBranch).toMatch(/fixed right-0 top-0/)
    expect(drawerBranch).toMatch(/translate-x-0['"]?\s*:\s*['"]?translate-x-full/)
  })

  test('a reopen affordance exists when the inspector is closed', () => {
    expect(shellCode).toMatch(/showReopenTab/)
    expect(shellCode).toMatch(/aria-label="Open Reviewer Resources"/)
  })

  test('a structural marker exposes the chosen mode for a browser/e2e acceptance check', () => {
    expect(shellCode).toMatch(/data-reviewer-shell-mode=\{adjacent \? 'adjacent' : 'drawer'\}/)
    expect(shellCode).toMatch(/data-inspector-open=/)
  })
})
