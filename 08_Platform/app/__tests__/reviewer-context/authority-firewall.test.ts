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
const REVIEWER_CONTEXT_ROUTES = [
  'app/api/admin/submissions/[id]/reviewer-crc-context/route.ts',
  'app/api/admin/submissions/[id]/reviewer-crc-context/[association_id]/transcript/route.ts', // CAH-4C
]
const REVIEWER_CONTEXT_ALL = [
  ...REVIEWER_CONTEXT_LIB,
  ...CRC_PROJECT_CONTEXT_LIB,
  ...REVIEWER_CONTEXT_ROUTES,
  'app/admin/submissions/[id]/review/ReviewerCrcContextPanel.tsx',
  'app/admin/submissions/[id]/review/ReviewerTranscriptDrawer.tsx', // CAH-4C
  'app/admin/submissions/[id]/review/ReviewerResources.tsx', // CAH-4F container / CAH-4F.1 slot provider
  'app/admin/submissions/[id]/review/ReviewerResourcesInspector.tsx', // CAH-4F.1 client tab host
  'app/admin/submissions/[id]/review/ReviewerShell.tsx', // CAH-4F.1 generic layout owner
]

// The assessment WRITE/domain surface: everything under lib/assessments plus
// the submissions API routes — EXCEPT the reviewer-side READ routes that
// physically sit in the submissions tree but are NOT assessment-domain code:
// the reviewer-context routes (CAH-4B/4C) and the reviewer-LK route (CAH-4E),
// each allowed to import its own reviewer-side module (and, for reviewer-LK,
// to reuse `lib/reviewer-context/auth`).
const REVIEWER_SIDE_ROUTES_NORM = [
  ...REVIEWER_CONTEXT_ROUTES,
  'app/api/admin/submissions/[id]/reviewer-lk/route.ts', // CAH-4E (legacy topic GET — retained, not UI-reachable)
  'app/api/admin/submissions/[id]/reviewer-lk/research/route.ts', // CAH-4G.6 (the converged HRR POST)
].map((r) => path.normalize(r))
const ASSESSMENT_DOMAIN = [
  ...listFiles('lib/assessments', ['.ts']),
  ...listFiles('app/api/admin/submissions', ['.ts']),
].filter((rel) => !REVIEWER_SIDE_ROUTES_NORM.includes(path.normalize(rel)))

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

  test('service.ts performs NO database write — no .insert / .update / .upsert / .delete / .rpc, no supabaseAdmin', () => {
    const src = codeOnly(svc)
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/)
    expect(src).not.toMatch(/supabaseAdmin/)
    expect(src).not.toMatch(/\.rpc\s*\(/)
    // it never names an assessment-state table
    expect(src).not.toMatch(/from\(\s*['"](assessments|submissions|workbook_snapshots|assessment_publications)['"]/)
  })

  // CAH-4C: the ONLY write introduced is the fail-closed context-access audit,
  // and it lives in the dedicated repository — targeting ONLY crc_context_access_events.
  test('repository.ts writes ONLY crc_context_access_events, and reads ONLY crc_sessions', () => {
    const repo = 'lib/reviewer-context/repository.ts'
    const src = codeOnly(repo)
    const writeTargets = [...src.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)[\s\S]{0,160}?\.(insert|update|upsert|delete)\b/g)].map((m) => m[1])
    expect(writeTargets).toEqual(['crc_context_access_events'])
    // no assessment-state table touched at all
    expect(src).not.toMatch(/from\(\s*['"](assessments|submissions|workbook_snapshots|assessment_publications|crc_sales_state|crc_sales_events|crc_assurance_association_events|crc_assurance_associations)['"]/)
    // the ONLY read table is crc_sessions
    const readTargets = [...new Set([...src.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)/g)].map((m) => m[1]))].sort()
    expect(readTargets).toEqual(['crc_context_access_events', 'crc_sessions'])
    // never writes crc_sessions
    expect(src).not.toMatch(/from\(\s*['"]crc_sessions['"]\s*\)[\s\S]{0,160}?\.(insert|update|upsert|delete)\b/)
    expect(src).not.toMatch(/\.rpc\s*\(/)
  })

  test('the transcript route imports only reviewer-context auth/service/repository — never an assessment mutation service', () => {
    const imports = importLines('app/api/admin/submissions/[id]/reviewer-crc-context/[association_id]/transcript/route.ts')
    expect(imports).not.toMatch(/@\/lib\/assessments|patchWorkbookAtomic|updateAssessment|signOffAssessment|workbook\/route|@\/lib\/crc-sales/)
    expect(imports).toMatch(/@\/lib\/reviewer-context\/(auth|service|repository)/)
  })

  test('no transcript -> evidence / finding / outcome conversion helper anywhere in reviewer-context', () => {
    for (const rel of [...REVIEWER_CONTEXT_LIB, 'app/admin/submissions/[id]/review/ReviewerTranscriptDrawer.tsx']) {
      const src = codeOnly(rel).toLowerCase()
      for (const token of [
        'transcripttoevidence', 'transcript_to_evidence', 'entrytoevidence', 'transcripttofinding',
        'transcripttooutcome', 'summarizetranscript', 'summarisetranscript', 'interprettranscript',
        'applytranscript', 'accepttranscript', 'workbook_data', 'workbookdata', 'section_3', 'section_5', 'section_6',
      ]) {
        expect(src).not.toContain(token)
      }
    }
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

  test('the base panel is a server component (no "use client"), so it cannot share workbook client state', () => {
    expect(read(panel)).not.toMatch(/^['"]use client['"]/m)
  })

  test('the panel does not import WorkbookClient or any Section component', () => {
    const imports = importLines(panel)
    expect(imports).not.toMatch(/WorkbookClient|Section[1-7]|workbook-schema|guidance/)
  })

  // CAH-4C: the transcript drawer is the ONLY client component in the surface.
  const drawer = 'app/admin/submissions/[id]/review/ReviewerTranscriptDrawer.tsx'
  test('the transcript drawer shares no workbook state and imports no Section / WorkbookClient / workbook-schema', () => {
    const imports = importLines(drawer)
    expect(imports).not.toMatch(/WorkbookClient|Section[1-7]|workbook-schema|guidance|@\/lib\/assessments|@\/lib\/crc-sales/)
    const src = codeOnly(drawer)
    expect(src).not.toMatch(/crcContext|reviewerContext|workbook|useContext\(|createContext\(/i)
  })

  test('the transcript drawer issues exactly one GET and no mutating request / copy-to-evidence / apply / accept', () => {
    const src = codeOnly(drawer)
    expect(src).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)/)
    expect(src).not.toMatch(/copy to evidence|apply to workbook|accept finding|use as evidence|add to workbook|summariz|summaris/i)
    expect(src).not.toMatch(/<(input|textarea|select)\b/)
    const fetches = [...src.matchAll(/fetch\(/g)]
    expect(fetches.length).toBe(1)
    expect(src).toMatch(/method:\s*['"]GET['"]/)
    expect(src).toMatch(/reviewer-crc-context\/\$\{associationId\}\/transcript/)
  })

  test('the transcript drawer carries the fixed "not verified / not assessment evidence" framing', () => {
    expect(read(drawer)).toMatch(/[Nn]ot verified and not assessment evidence/)
  })

  test('CAH-4F.1: the CRC view reaches the page as the <ReviewerShell> inspector slot, never as a WorkbookClient prop/child', () => {
    const src = read(page)
    const container = 'app/admin/submissions/[id]/review/ReviewerResources.tsx'
    const shell = 'app/admin/submissions/[id]/review/ReviewerShell.tsx'
    // page.tsx wraps WorkbookClient in <ReviewerShell> and passes the resources
    // content as the opaque `inspector` prop — WorkbookClient is `children`.
    expect(src).toMatch(/<ReviewerShell/)
    expect(src).toMatch(/inspector=\{[^}]*<ReviewerResources submissionId=\{params\.id\} \/>/)
    expect(src).not.toMatch(/<ReviewerCrcContextPanel/) // not rendered by page.tsx
    // <ReviewerResources> (server) hands the CRC view to the client inspector as a slot
    const containerSrc = read(container)
    expect(containerSrc).toMatch(/linkedCrcContext=\{<ReviewerCrcContextPanel submissionId=\{submissionId\} \/>\}/)
    expect(containerSrc).not.toMatch(/^['"]use client['"]/m)
    // the shell is generic — it never imports a reviewer-context service or WorkbookClient
    const shellImports = importLines(shell)
    expect(shellImports).not.toMatch(/@\/lib\/reviewer-context|@\/lib\/reviewer-lk|@\/lib\/assessments|WorkbookClient|ReviewerCrcContextPanel|ReviewerLkPanel/)
    // WorkbookClient's opening tag carries no reviewer component as a prop
    const wc = src.slice(src.indexOf('<WorkbookClient'))
    expect(wc.slice(0, wc.indexOf('>') + 1)).not.toMatch(/ReviewerResources|ReviewerShell|ReviewerCrcContextPanel/)
    expect(src).not.toMatch(/crcContext=|reviewerContext=|reviewerCrcContext=|contextPanel=|resourcesPanel=/)
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
