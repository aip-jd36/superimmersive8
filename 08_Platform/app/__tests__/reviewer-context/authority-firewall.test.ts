/**
 * CAH-4B §9 / §14 — AUTHORITY FIREWALL (the critical acceptance condition).
 *
 * Reviewer CRC context must be STRUCTURALLY incapable of automatically writing
 * Commercial Assurance assessment state. These are enforceable boundaries
 * scanned against the ACTUAL file trees — not comments, not TypeScript nominal
 * claims. Same technique as `crc-sales/subsystem-boundaries.test.ts` and
 * `crc-assurance-handoff/boundaries.test.ts`.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')

function listFiles(dir: string, exts: string[]): string[] {
  const full = path.join(APP_ROOT, dir)
  if (!fs.existsSync(full)) return []
  const out: string[] = []
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...listFiles(p, exts))
    else if (e.isFile() && exts.some((x) => e.name.endsWith(x)) && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
/** Source with block + line comments removed. */
const codeOnly = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
const importLines = (rel: string) => (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

const REVIEWER_CONTEXT_LIB = listFiles('lib/reviewer-context', ['.ts'])
const CRC_PROJECT_CONTEXT_LIB = listFiles('lib/crc-project-context', ['.ts'])
const REVIEWER_CONTEXT_ALL = [
  ...REVIEWER_CONTEXT_LIB,
  ...CRC_PROJECT_CONTEXT_LIB,
  'app/api/admin/submissions/[id]/reviewer-crc-context/route.ts',
  'app/admin/submissions/[id]/review/ReviewerCrcContextPanel.tsx',
]

const REVIEWER_CONTEXT_ROUTE = 'app/api/admin/submissions/[id]/reviewer-crc-context/route.ts'
// The assessment WRITE/domain surface: everything under lib/assessments plus
// the submissions API routes — EXCEPT the reviewer-context route itself, which
// physically sits in the submissions tree but IS the reviewer-context surface
// (it is allowed, and required, to import lib/reviewer-context).
const ASSESSMENT_DOMAIN = [
  ...listFiles('lib/assessments', ['.ts']),
  ...listFiles('app/api/admin/submissions', ['.ts']),
].filter((rel) => path.normalize(rel) !== path.normalize(REVIEWER_CONTEXT_ROUTE))

// ── A. reviewer-context modules do not import assessment mutation / domain ──

describe('A — reviewer-context does not import the assessment write/domain surface', () => {
  test('the reviewer-context module tree is present and non-trivial', () => {
    expect(REVIEWER_CONTEXT_LIB.length).toBeGreaterThanOrEqual(3)
    expect(CRC_PROJECT_CONTEXT_LIB.length).toBeGreaterThanOrEqual(2)
  })

  test.each(REVIEWER_CONTEXT_ALL)('%s imports nothing from lib/assessments or the submissions API surface', (rel) => {
    const imports = importLines(rel)
    expect(imports).not.toMatch(/from\s+['"]@\/lib\/assessments/)
    expect(imports).not.toMatch(/from\s+['"]@\/app\/api\/admin\/submissions/)
    // and never the workbook write path by any name
    expect(imports).not.toMatch(/patchWorkbookAtomic|patch_workbook_atomic|updateAssessment|signOffAssessment|workbook\/route/)
  })

  test.each(REVIEWER_CONTEXT_ALL)('%s does not import lib/crc-sales (the neutral projection is shared, crc-sales is not)', (rel) => {
    expect(importLines(rel)).not.toMatch(/from\s+['"]@\/lib\/crc-sales/)
  })
})

// ── B. reverse boundary: assessment domain does not depend on reviewer-context ──

describe('B — the assessment domain does not depend on reviewer-context', () => {
  test.each(ASSESSMENT_DOMAIN)('%s does not import lib/reviewer-context or lib/crc-project-context', (rel) => {
    const imports = importLines(rel)
    expect(imports).not.toMatch(/from\s+['"]@\/lib\/reviewer-context/)
    expect(imports).not.toMatch(/from\s+['"]@\/lib\/crc-project-context/)
  })
})

// ── C. reviewer-context service exports read operations only ────────────────

describe('C — the reviewer-context service is read-only', () => {
  const svc = 'lib/reviewer-context/service.ts'
  test('exports only get* / read helpers — no create/update/delete/write/save/patch export', () => {
    const exports = [...read(svc).matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map((m) => m[1])
    expect(exports).toContain('getReviewerCrcContext')
    for (const name of exports) {
      expect(name).not.toMatch(/^(create|update|delete|remove|write|save|patch|set|insert|upsert|mutate)/i)
    }
  })

  test('performs NO database write — no .insert / .update / .upsert / .delete / .rpc, no supabaseAdmin', () => {
    const src = codeOnly(svc)
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/)
    expect(src).not.toMatch(/supabaseAdmin/)
    expect(src).not.toMatch(/\.rpc\s*\(/)
    // it never names an assessment-state table
    expect(src).not.toMatch(/from\(\s*['"](assessments|submissions|workbook_snapshots|assessment_publications)['"]/)
  })

  test('no export or helper converts a CRC goal/assertion into evidence / control / gap / finding / outcome / report', () => {
    for (const rel of REVIEWER_CONTEXT_LIB) {
      const src = codeOnly(rel).toLowerCase()
      for (const token of [
        'section_1', 'section_2', 'section_3', 'section_4', 'section_5', 'section_6', 'section_7',
        'workbookdata', 'workbook_data', 'toevidence', 'to_evidence', 'ascontrol', 'as_control',
        'tofinding', 'to_finding', 'tooutcome', 'to_outcome', 'tocontrol', 'gap_log', 'findings_log',
        'derivefinding', 'suggestoutcome', 'applytoworkbook',
      ]) {
        expect(src).not.toContain(token)
      }
    }
  })
})

// ── D. disjoint state — ReviewerCrcContext is not in WorkbookData / workbook form state ──

describe('D — ReviewerCrcContext is disjoint from workbook state', () => {
  test('workbook-schema.ts does not reference ReviewerCrcContext / reviewer-context', () => {
    const src = read('app/admin/submissions/[id]/review/workbook-schema.ts')
    expect(src).not.toMatch(/ReviewerCrcContext|reviewer-context|reviewer_crc/i)
  })

  test('WorkbookClient.tsx neither imports nor stores ReviewerCrcContext / the panel', () => {
    const src = read('app/admin/submissions/[id]/review/WorkbookClient.tsx')
    expect(src).not.toMatch(/ReviewerCrcContextPanel|reviewer-context|@\/lib\/reviewer-context|@\/lib\/crc-project-context|ReviewerCrcContext/)
    // no useState / prop carrying CRC context
    expect(src).not.toMatch(/crcContext|reviewerContext|crc_context/i)
  })

  test('the EMPTY_WORKBOOK shape has no CRC/reviewer-context key', () => {
    const src = read('app/admin/submissions/[id]/review/workbook-schema.ts')
    const empty = src.slice(src.indexOf('EMPTY_WORKBOOK'), src.indexOf('EMPTY_WORKBOOK') + 1500).toLowerCase()
    expect(empty).not.toMatch(/crc|reviewer_context|association/)
  })
})

// ── E. UI separation — the panel is a sibling reference surface ─────────────

describe('E — the reviewer CRC panel is a sibling, not a workbook field/section', () => {
  const panel = 'app/admin/submissions/[id]/review/ReviewerCrcContextPanel.tsx'
  const page = 'app/admin/submissions/[id]/review/page.tsx'

  test('the panel is a server component (no "use client"), so it cannot share workbook client state', () => {
    expect(read(panel)).not.toMatch(/^['"]use client['"]/m)
  })

  test('the panel does not import WorkbookClient or any Section component', () => {
    const imports = importLines(panel)
    expect(imports).not.toMatch(/WorkbookClient|Section[1-7]|workbook-schema|guidance/)
  })

  test('page.tsx renders the panel as a SIBLING of <WorkbookClient>, not a child/prop of it', () => {
    const src = read(page)
    // the panel is its own self-closing element taking only submissionId
    expect(src).toMatch(/<ReviewerCrcContextPanel\s+submissionId=\{params\.id\}\s*\/>/)
    // <WorkbookClient ...> is self-closing (no children) — its opening tag ends with "/>"
    const wc = src.slice(src.indexOf('<WorkbookClient'))
    expect(wc.slice(0, wc.indexOf('>') + 1)).not.toContain('ReviewerCrcContextPanel')
    expect(wc).not.toMatch(/<WorkbookClient[^>]*>[\s\S]*<\/WorkbookClient>/) // never has children
    // the panel is not handed to WorkbookClient as a prop under any name
    expect(src).not.toMatch(/crcContext=|reviewerContext=|reviewerCrcContext=|contextPanel=/)
  })

  test('the panel exposes no editable control / save / copy-to-evidence / apply / accept', () => {
    const src = codeOnly(panel)
    expect(src).not.toMatch(/<(input|textarea|select)\b/)
    expect(src).not.toMatch(/onSubmit|onSave|handleSave/)
    expect(src).not.toMatch(/copy to evidence|apply to workbook|accept finding|use as evidence/i)
    expect(src).not.toMatch(/fetch\(.+POST|method:\s*['"](POST|PUT|PATCH|DELETE)/)
  })

  test('the panel carries the fixed "not verified / not assessment evidence" framing', () => {
    expect(read(panel)).toMatch(/not verified.*not assessment evidence/i)
  })
})

// ── F. crc-project-context stays neutral (imported by BOTH sales + reviewer) ──

describe('F — lib/crc-project-context is neutral', () => {
  test.each(CRC_PROJECT_CONTEXT_LIB)('%s imports only @/types/interview-engine (no sales, no assessments, no reviewer-context)', (rel) => {
    const imports = importLines(rel)
    expect(imports).not.toMatch(/@\/lib\/crc-sales|@\/lib\/assessments|@\/lib\/reviewer-context|@\/app\//)
  })
})
