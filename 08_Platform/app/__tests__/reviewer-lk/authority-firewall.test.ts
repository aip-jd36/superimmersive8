/**
 * CAH-4E §13 / §16.D — AUTHORITY FIREWALL.
 *
 * `lib/reviewer-lk/**` + the reviewer-lk route must be STRUCTURALLY incapable
 * of writing Commercial Assurance assessment state. Scanned against the ACTUAL
 * file trees — same technique as `reviewer-context/authority-firewall.test.ts`.
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
const codeOnly = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const importLines = (rel: string) => (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

const REVIEWER_LK_LIB = listFiles('lib/reviewer-lk', ['.ts'])
const REVIEWER_LK_ROUTE = 'app/api/admin/submissions/[id]/reviewer-lk/route.ts'
const REVIEWER_LK_PANEL = 'app/admin/submissions/[id]/review/ReviewerLkPanel.tsx'
const REVIEWER_LK_LOOKUP = 'app/admin/submissions/[id]/review/ReviewerLkLookup.tsx'
const REVIEWER_LK_RESOURCES = 'app/admin/submissions/[id]/review/ReviewerResources.tsx' // CAH-4F container
const REVIEWER_LK_ALL = [...REVIEWER_LK_LIB, REVIEWER_LK_ROUTE, REVIEWER_LK_PANEL, REVIEWER_LK_LOOKUP, REVIEWER_LK_RESOURCES]

const ASSESSMENT_DOMAIN = [
  ...listFiles('lib/assessments', ['.ts']),
  ...listFiles('app/api/admin/submissions', ['.ts']).filter((p) => !p.includes('reviewer-lk') && !p.includes('reviewer-crc-context')),
]

describe('A — reviewer-lk imports nothing from the assessment write/domain surface', () => {
  test('the reviewer-lk module tree is present and non-trivial', () => {
    expect(REVIEWER_LK_LIB.length).toBeGreaterThanOrEqual(5)
  })

  test.each(REVIEWER_LK_ALL)('%s imports nothing from lib/assessments, the workbook write path, or crc-sales', (rel) => {
    const imports = importLines(rel)
    expect(imports).not.toMatch(/from\s+['"]@\/lib\/assessments/)
    expect(imports).not.toMatch(/patchWorkbookAtomic|patch_workbook_atomic|updateAssessment|signOffAssessment|workbook\/route/)
    expect(imports).not.toMatch(/from\s+['"]@\/lib\/crc-sales/)
  })

  test.each(REVIEWER_LK_ALL)('%s never imports the CRC retrieval orchestrator (retrieve.ts)', (rel) => {
    expect(importLines(rel)).not.toMatch(/from\s+['"]@\/lib\/retrieval-engine\/retrieve['"]/)
  })

  test.each(REVIEWER_LK_ALL)('%s never imports buildBoundedInterpretation or Consultative Composition', (rel) => {
    const imports = importLines(rel)
    expect(imports).not.toMatch(/bounded-interpretation|consultative-answer-plan|consultative-realization/)
  })
})

describe('B — reverse boundary: the assessment domain does not depend on reviewer-lk', () => {
  test.each(ASSESSMENT_DOMAIN)('%s does not import lib/reviewer-lk', (rel) => {
    expect(importLines(rel)).not.toMatch(/from\s+['"]@\/lib\/reviewer-lk/)
  })

  test('workbook-schema.ts / WorkbookClient.tsx reference no reviewer-lk type', () => {
    for (const rel of [
      'app/admin/submissions/[id]/review/workbook-schema.ts',
      'app/admin/submissions/[id]/review/WorkbookClient.tsx',
    ]) {
      if (!fs.existsSync(path.join(APP_ROOT, rel))) continue
      expect(read(rel)).not.toMatch(/reviewer-lk|ReviewerLk/)
    }
  })
})

describe('C — reviewer-lk performs no assessment-state write; exactly one audit write', () => {
  test('no reviewer-lk module writes assessments / workbook / submissions / crc_sessions / crc_assurance / crc_sales', () => {
    for (const rel of REVIEWER_LK_LIB) {
      const src = codeOnly(rel)
      expect(src).not.toMatch(/from\(\s*['"](assessments|workbook_snapshots|assessment_publications|crc_sales_state|crc_sales_events|crc_assurance_associations|crc_assurance_association_events)['"]\s*\)/)
      // no write to submissions or crc_sessions
      expect(src).not.toMatch(/from\(\s*['"](submissions|crc_sessions)['"]\s*\)[\s\S]{0,200}?\.(insert|update|upsert|delete)\b/)
      expect(src).not.toMatch(/\.rpc\s*\(/)
    }
  })

  test('the ONLY .insert in lib/reviewer-lk targets crc_context_access_events', () => {
    const inserts: string[] = []
    for (const rel of REVIEWER_LK_LIB) {
      const src = codeOnly(rel)
      for (const m of src.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)[\s\S]{0,200}?\.insert\s*\(/g)) {
        inserts.push(m[1])
      }
    }
    expect(inserts).toEqual(['crc_context_access_events'])
  })

  test('the audit row shape is bounded: access_kind lk_research + actor + submission only (no query / claim text / interpretation / findings)', () => {
    const src = codeOnly('lib/reviewer-lk/repository.ts')
    expect(src).toMatch(/access_kind:\s*'lk_research'/)
    expect(src).toMatch(/actor_user_id:/)
    expect(src).toMatch(/submission_id:/)
    expect(src).not.toMatch(/topic:|query|statement|claim_id:|reason:|finding|reliance|interpretation/)
  })

  test('no reviewer-lk module has a helper that converts a claim into assessment state', () => {
    // Converter-shaped identifiers only (a function/const whose NAME implies it
    // turns a claim into evidence/finding/gap/outcome/control/sign-off/report).
    const converterShape =
      /\b(to|as|create|build|record|make|add|apply|promote)[A-Za-z]*(Evidence|Finding|Gap|Outcome|Control|SignOff|Signoff|ReportConclusion|WorkbookAnswer|Attestation)\b/i
    for (const rel of REVIEWER_LK_LIB) {
      const src = codeOnly(rel)
      const decls = src.match(/(?:export\s+)?(?:function|const)\s+[A-Za-z0-9_]+/g) ?? []
      for (const d of decls) expect(d).not.toMatch(converterShape)
    }
  })
})

describe('D — the route is a GET research + append-only audit only', () => {
  const src = codeOnly(REVIEWER_LK_ROUTE)

  test('exports GET only — no POST / PUT / PATCH / DELETE', () => {
    expect(src).toMatch(/export async function GET\b/)
    expect(src).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)\b/)
  })

  test('reads no request body; topic is the only request-derived value', () => {
    expect(src).not.toMatch(/request\.(json|formData|text)\(\)/)
    expect(src).toMatch(/searchParams\.get\(\s*['"]topic['"]\s*\)/)
  })

  test('never imports an assessment mutation service or CRC retrieve', () => {
    const imports = importLines(REVIEWER_LK_ROUTE)
    expect(imports).not.toMatch(/@\/lib\/assessments|patchWorkbookAtomic|workbook\/route|@\/lib\/retrieval-engine\/retrieve/)
  })
})

describe('E — the panel is a server component; the lookup client shares no workbook state', () => {
  test('ReviewerLkPanel.tsx is NOT a client component', () => {
    expect(read(REVIEWER_LK_PANEL)).not.toMatch(/^'use client'/m)
  })
  test('ReviewerLkLookup.tsx issues exactly one fetch, GET, and has no copy-to-evidence / apply-to-workbook control (code, not comments)', () => {
    const src = codeOnly(REVIEWER_LK_LOOKUP)
    const fetches = src.match(/fetch\(/g) ?? []
    expect(fetches).toHaveLength(1)
    expect(src).toMatch(/method:\s*'GET'/)
    expect(src).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim|summari[sz]e/i)
    expect(src).not.toMatch(/<textarea|<input\b/)
  })
  test('the LK panel reaches the page via the <ReviewerResources> sibling container, never inside WorkbookClient (code, not comments)', () => {
    const page = codeOnly('app/admin/submissions/[id]/review/page.tsx')
    // CAH-4F: page.tsx renders the container, not the panel directly.
    expect(page).toMatch(/<ReviewerResources submissionId=\{params\.id\} \/>/)
    expect(page).not.toMatch(/<ReviewerLkPanel/)
    // WorkbookClient's opening tag must not contain the container or the panel as a child/prop
    const wbOpen = page.match(/<WorkbookClient[\s\S]*?\/>/)
    expect(wbOpen).not.toBeNull()
    expect(wbOpen![0]).not.toMatch(/ReviewerResources|ReviewerLkPanel|ReviewerCrcContextPanel/)
  })

  test('<ReviewerResources> is a server component that only groups the two panels — no client state, no fetch, no write', () => {
    const src = codeOnly(REVIEWER_LK_RESOURCES)
    expect(read(REVIEWER_LK_RESOURCES)).not.toMatch(/^'use client'/m)
    expect(src).toMatch(/<ReviewerLkPanel submissionId=\{submissionId\} \/>/)
    expect(src).toMatch(/<ReviewerCrcContextPanel submissionId=\{submissionId\} \/>/)
    expect(src).not.toMatch(/fetch\(|useState|useEffect|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(src).not.toMatch(/<textarea|<input\b/)
    expect(src).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim/i)
  })
})

describe('F — CAH-4F presentation: governance prose / CRC-channel metadata is not rendered as reviewer authority', () => {
  const lookup = codeOnly(REVIEWER_LK_LOOKUP)

  test('raw crc_publication_scope (CRC-channel "may/must" prose) is never rendered by the reviewer lookup', () => {
    expect(lookup).not.toMatch(/crc_publication_scope/)
  })

  test('crc_eligible is not rendered by the reviewer lookup (SR-5 / FR-7 — not shown by default)', () => {
    expect(lookup).not.toMatch(/crc_eligible/)
    expect(lookup).not.toMatch(/CRC channel:/)
  })

  test('the reviewer-readable topic label map keys are exactly GOAL_CATEGORIES minus "unknown"', () => {
    const { REVIEWER_TOPIC_LABELS } = require('@/lib/reviewer-lk/topic-labels')
    const { GOAL_CATEGORIES } = require('@/types/interview-engine')
    expect(Object.keys(REVIEWER_TOPIC_LABELS).sort()).toEqual(
      GOAL_CATEGORIES.filter((c: string) => c !== 'unknown').sort(),
    )
  })

  test('topic labels never change the value sent to the API — the fetch still uses the raw enum topic', () => {
    expect(lookup).toMatch(/topic=\$\{encodeURIComponent\(topic\)\}/)
    // the <select> value is the enum; only the option TEXT is the label
    expect(lookup).toMatch(/value=\{topic\}/)
    expect(lookup).toMatch(/<option key=\{t\} value=\{t\}>\s*\{reviewerTopicLabel\(t\)\}/)
  })
})
