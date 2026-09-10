/**
 * CAH-4F.2 — Contextual Inspector Coordination acceptance (source-scan; the
 * repo has no React render harness — same technique as `reviewer-shell.test.ts`
 * and the two authority-firewall suites).
 *
 * Proves the approved architecture:
 *
 *   - a domain-neutral `workspace-layout-context` channel carries ONE layout
 *     boolean and nothing else (no reviewer-lk / reviewer-context / assessment
 *     / retrieval / bounded-interpretation / workbook-data / audit / fetch);
 *   - `ReviewerShell` derives `workbookContextAsideHidden` ONLY from
 *     `resourcesAvailable` + inspector-open + adjacent viewport state, and
 *     publishes it via a provider that wraps the opaque Workbook child once;
 *   - drawer (`!adjacent`) mode never hides the Workbook context aside;
 *   - `WorkbookClient` consumes only that boolean and CSS-hides (never
 *     unmounts) its existing Guidance/Submission/Evidence aside; `rightTab`
 *     stays entirely inside `WorkbookClient`; the autosave effect gains no
 *     layout dependency; the Workbook PATCH path is unchanged;
 *   - Reviewer Resources components are byte-unchanged by this milestone.
 *
 * This is a UX / perceptual-clarity mechanism. Authority separation is proven
 * elsewhere (data ownership, service boundaries, audit paths, bounded
 * interpretation, mutation boundaries) — `reviewer-lk/authority-firewall`,
 * `reviewer-context/authority-firewall`, `route-and-audit`, etc. Visibility
 * coordination is NOT an authority boundary and is not asserted as one here.
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

const CTX = `${R}/workspace-layout-context.tsx`
const SHELL = `${R}/ReviewerShell.tsx`
const WORKBOOK = `${R}/WorkbookClient.tsx`
const PAGE = `${R}/page.tsx`
const RESOURCES = `${R}/ReviewerResources.tsx`
const INSPECTOR = `${R}/ReviewerResourcesInspector.tsx`
const LK_PANEL = `${R}/ReviewerLkPanel.tsx`
const LK_LOOKUP = `${R}/ReviewerLkLookup.tsx`
const CRC_PANEL = `${R}/ReviewerCrcContextPanel.tsx`
const CRC_DRAWER = `${R}/ReviewerTranscriptDrawer.tsx`

// ── A. layout-context module — layout state ONLY ─────────────────────────────

describe('A — workspace-layout-context is a layout-only channel', () => {
  const src = read(CTX)
  const code = codeOnly(CTX)
  const imports = importLines(CTX)

  test('exists as a client module exporting a provider + a read hook', () => {
    expect(src).toMatch(/^'use client'/m)
    expect(src).toMatch(/export const WorkspaceLayoutProvider\b/)
    expect(src).toMatch(/export function useWorkspaceLayout\(\)/)
    expect(src).toMatch(/createContext<WorkspaceLayout>/)
  })

  test('the contract carries exactly one boolean layout field and nothing else', () => {
    // comment-stripped interface body — JSDoc naming other concepts is fine
    const from = code.indexOf('interface WorkspaceLayout')
    const iface = code.slice(from, code.indexOf('}', from) + 1)
    expect(iface).toMatch(/workbookContextAsideHidden:\s*boolean/)
    const fields = iface.match(/^\s*[a-zA-Z_]\w*\s*:/gm) ?? []
    expect(fields.length).toBe(1)
    // no data / callback fields in the actual contract
    expect(iface).not.toMatch(/=>|claim|applicab|evidence|audit|workbook_?data|rightTab|topic|crc|assoc|outcome|finding|gap/i)
  })

  test('default value keeps the aside visible so WorkbookClient works with no provider', () => {
    expect(code).toMatch(/workbookContextAsideHidden:\s*false/)
    expect(code).toMatch(/createContext<WorkspaceLayout>\(\s*[A-Z_]+\s*\)|createContext<WorkspaceLayout>\(\{\s*workbookContextAsideHidden:\s*false\s*\}\)/)
  })

  test('imports NOTHING from @/lib and no domain module', () => {
    expect(imports).not.toMatch(/@\//)
    expect(imports).not.toMatch(/reviewer-lk|reviewer-context|crc-project-context|crc-sales|crc-assurance|assessments|retrieval-engine|bounded-interpretation|projection|workbook-schema|guidance|Section[1-7]|Reviewer[A-Z]/)
    // only React
    expect(imports.replace(/\s+/g, ' ').trim()).toMatch(/^import \{ [^}]*\} from 'react'$/)
  })

  test('performs no fetch / persistence / audit / mutation', () => {
    expect(code).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(|localStorage|sessionStorage|access_kind|audit/i)
  })
})

// ── B. ReviewerShell derivation + provider placement ─────────────────────────

describe('B — ReviewerShell publishes only a derived layout boolean', () => {
  const shell = codeOnly(SHELL)

  test('the provider wraps the opaque {children} exactly once, unconditionally', () => {
    expect(shell).toMatch(/<WorkspaceLayoutProvider value=\{workspaceLayout\}>\{children\}<\/WorkspaceLayoutProvider>/)
    expect((shell.match(/\{children\}/g) ?? []).length).toBe(1)
    expect((shell.match(/<WorkspaceLayoutProvider/g) ?? []).length).toBe(1)
    expect(shell).not.toMatch(/\{\s*[a-zA-Z]+\s*(\?|&&)\s*<WorkspaceLayoutProvider/)
  })

  test('workbookContextAsideHidden derives ONLY from resources-available + open + adjacent', () => {
    const m = shell.match(/workbookContextAsideHidden:\s*([^}]+)\}/)
    expect(m).not.toBeNull()
    const expr = m![1].trim()
    // showInspector === resourcesAvailable && open (defined just above); adjacent is the viewport fact
    expect(expr).toMatch(/^(showInspector|resourcesAvailable && open|open && resourcesAvailable)\s*&&\s*adjacent$|^adjacent\s*&&\s*(showInspector|resourcesAvailable && open)$/)
    // no resource/workbook signal leaks into the derivation
    expect(expr).not.toMatch(/rightTab|topic|guidance|submission|evidence|claim|crc|mode|inspector[A-Z]/i)
  })

  test('drawer mode cannot hide the aside — the fact requires `adjacent`', () => {
    // there is no code path setting workbookContextAsideHidden true without `adjacent`
    expect(shell).not.toMatch(/workbookContextAsideHidden:\s*(showInspector|open|resourcesAvailable)\s*[,}]/)
  })

  test('ReviewerShell still imports no reviewer / assessment / workbook module (CAH-4F.1 firewall intact)', () => {
    const imports = importLines(SHELL)
    expect(imports).not.toMatch(/@\/lib\/reviewer-lk|@\/lib\/reviewer-context|@\/lib\/crc-|@\/lib\/assessments|@\/lib\/retrieval-engine|@\/lib\/bounded-interpretation/)
    expect(imports).not.toMatch(/WorkbookClient|Section[1-7]|workbook-schema|\bguidance\b|ReviewerLkPanel|ReviewerCrcContextPanel|ReviewerResources\b/)
    // the ONLY new import is the neutral layout context
    expect(imports).toMatch(/from '\.\/workspace-layout-context'/)
  })

  test('ReviewerShell still writes nothing', () => {
    expect(shell).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(|\.rpc\s*\(/)
    expect(shell).not.toMatch(/<textarea|<input\b|<select\b/)
  })
})

// ── C. WorkbookClient consumes only the layout fact ─────────────────────────

describe('C — WorkbookClient consumes only the layout boolean', () => {
  const wbRaw = read(WORKBOOK)
  const wb = codeOnly(WORKBOOK)

  test('consumes the hook and nothing else new', () => {
    expect(wbRaw).toMatch(/import \{ useWorkspaceLayout \} from '\.\/workspace-layout-context'/)
    expect(wb).toMatch(/const \{ workbookContextAsideHidden \} = useWorkspaceLayout\(\)/)
  })

  test('the context aside stays in the JSX — visibility is a CSS class, not a mount gate', () => {
    expect(wb).toMatch(/\$\{workbookContextAsideHidden \? 'hidden' : 'flex'\}/)
    // the <aside> is not wrapped in `{!workbookContextAsideHidden && ( <aside ...`
    expect(wb).not.toMatch(/\{\s*!?\s*workbookContextAsideHidden\s*&&[\s\S]{0,60}<aside/)
    expect(wb).toMatch(/<aside\b/)
  })

  test('rightTab is still WorkbookClient-owned and layout-independent', () => {
    expect(wb).toMatch(/const \[rightTab, setRightTab\] = useState<RightTab>\('guidance'\)/)
    // rightTab is never derived from / gated by the layout fact
    expect(wb).not.toMatch(/rightTab[\s\S]{0,40}workbookContextAsideHidden|workbookContextAsideHidden[\s\S]{0,40}setRightTab/)
  })

  test('autosave effect gains no layout dependency; PATCH path unchanged', () => {
    // the debounced save effect still depends on [workbook, save] only
    expect(wb).toMatch(/setTimeout\(\(\) => save\(workbook\), 600\)[\s\S]*?\}, \[workbook, save\]\)/)
    expect(wb).not.toMatch(/\}, \[[^\]]*workbookContextAsideHidden[^\]]*\]\)/)
    expect(wb).toMatch(/`\/api\/admin\/submissions\/\$\{submissionId\}\/workbook`/)
    expect(wb).toMatch(/method: 'PATCH'/)
  })

  test('no reviewer-lk / reviewer-context service import sneaks in (reverse firewall intact)', () => {
    expect(wb).not.toMatch(/ReviewerShell|ReviewerResources|ReviewerLkPanel|ReviewerCrcContextPanel|reviewer-lk|reviewer-context|@\/lib\/crc-/)
    expect(wb).not.toMatch(/inspector\s*[:=]|crcContext|reviewerContext|crc_context/i)
  })
})

// ── D. Reviewer Resources unchanged ────────────────────────────────────────

describe('D — Reviewer Resources components are byte-unchanged by CAH-4F.2', () => {
  test('none of the resource components import or reference the layout context', () => {
    for (const rel of [RESOURCES, INSPECTOR, LK_PANEL, LK_LOOKUP, CRC_PANEL, CRC_DRAWER]) {
      const src = read(rel)
      expect(src).not.toMatch(/workspace-layout-context|useWorkspaceLayout|workbookContextAsideHidden|WorkspaceLayoutProvider/)
    }
  })

  test('LK look-up is still explicit-action-only — no fetch on open / tab-switch anywhere in the chain', () => {
    for (const rel of [SHELL, RESOURCES, INSPECTOR, LK_PANEL, CTX]) {
      expect(codeOnly(rel)).not.toMatch(/fetch\(/)
    }
    const lookup = codeOnly(LK_LOOKUP)
    expect((lookup.match(/fetch\(/g) ?? []).length).toBe(1)
    expect(lookup).not.toMatch(/useEffect\([\s\S]*?fetch\(/)
  })

  test('inspector tab host + CRC transcript access semantics unchanged', () => {
    expect(codeOnly(INSPECTOR)).not.toMatch(/fetch\(|useEffect/)
    expect(read(CRC_DRAWER)).toMatch(/reviewer-crc-context\/\$\{associationId\}\/transcript/)
  })
})

// ── E. page.tsx structurally unchanged ────────────────────────────────────

describe('E — page.tsx wiring unchanged', () => {
  const page = codeOnly(PAGE)
  test('still <ReviewerShell ...><WorkbookClient .../></ReviewerShell>, no new prop, no provider in page', () => {
    expect(page).toMatch(/<ReviewerShell[\s\S]*?>\s*<WorkbookClient[\s\S]*?\/>\s*<\/ReviewerShell>/)
    expect(page).not.toMatch(/WorkspaceLayoutProvider|workspace-layout-context|workbookContextAsideHidden/)
  })
})
