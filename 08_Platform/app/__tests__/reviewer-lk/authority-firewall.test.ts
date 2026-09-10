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
const HRR_RESEARCH_ROUTE = 'app/api/admin/submissions/[id]/reviewer-lk/research/route.ts' // CAH-4G.6 — the one HRR route
const HRR_ANSWER_VIEW = 'app/admin/submissions/[id]/review/HrrResearchAnswerView.tsx' // CAH-4G.6
const REVIEWER_LK_PANEL = 'app/admin/submissions/[id]/review/ReviewerLkPanel.tsx'
const REVIEWER_LK_LOOKUP = 'app/admin/submissions/[id]/review/ReviewerLkLookup.tsx'
const HRR_THREAD = 'app/admin/submissions/[id]/review/hrr-thread.ts' // CAH-4G.10 — client thread reducer (presentation state only)
const REVIEWER_LK_RESOURCES = 'app/admin/submissions/[id]/review/ReviewerResources.tsx' // CAH-4F container (server slot provider)
const REVIEWER_RESOURCES_INSPECTOR = 'app/admin/submissions/[id]/review/ReviewerResourcesInspector.tsx' // CAH-4F.1 (client tab host)
const REVIEWER_SHELL = 'app/admin/submissions/[id]/review/ReviewerShell.tsx' // CAH-4F.1 (generic layout owner)
const REVIEWER_LK_ALL = [
  ...REVIEWER_LK_LIB,
  HRR_RESEARCH_ROUTE,
  HRR_ANSWER_VIEW,
  REVIEWER_LK_PANEL,
  REVIEWER_LK_LOOKUP,
  HRR_THREAD,
  REVIEWER_LK_RESOURCES,
  REVIEWER_RESOURCES_INSPECTOR,
  REVIEWER_SHELL,
]

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

describe('D — the ONE HRR research route is research + append-only audit only', () => {
  const research = codeOnly(HRR_RESEARCH_ROUTE)

  test('CAH-4G.7: the legacy GET topic route is retired — the reviewer-lk route dir holds only the research POST', () => {
    const dir = path.join(APP_ROOT, 'app/api/admin/submissions/[id]/reviewer-lk')
    expect(fs.readdirSync(dir).sort()).toEqual(['research'])
  })

  test('CAH-4G.6 research route: POST only — no GET/PUT/PATCH/DELETE', () => {
    expect(research).toMatch(/export async function POST\b/)
    expect(research).not.toMatch(/export async function (GET|PUT|PATCH|DELETE)\b/)
  })

  test('CAH-4G.6 research route never imports an assessment mutation service, CRC retrieve, CRC session, or Linked CRC context', () => {
    const imports = importLines(HRR_RESEARCH_ROUTE)
    expect(imports).not.toMatch(/@\/lib\/assessments|patchWorkbookAtomic|workbook\/route|updateAssessment|signOffAssessment/)
    expect(imports).not.toMatch(/@\/lib\/retrieval-engine\/retrieve|enumerate-eligible-claims/)
    expect(imports).not.toMatch(/crc_sessions|@\/lib\/crc-engine|@\/lib\/crc-sales|@\/lib\/crc-assurance|reviewer-crc-context|linked.*crc/i)
  })

  test('CAH-4G.6 research route never returns governed content except through the audited orchestration boundary', () => {
    // runAuditedHrrResearch is the only producer of the answer; projectHrrResearchAnswer
    // is never called directly (which would bypass the required audit).
    expect(research).toMatch(/runAuditedHrrResearch\s*\(/)
    expect(research).not.toMatch(/projectHrrResearchAnswer\s*\(/)
    expect(research).not.toMatch(/runHrrResearch\s*\(/)
    // both entry modes go through the gate, never a hand-rolled intent
    expect(research).toMatch(/topicSelectionGateResult\s*\(|hrrAuthorityGate\s*\(/)
  })

  test('CAH-4G.6 research route never accepts actor identity / authority facts from the client', () => {
    expect(research).toMatch(/checkReviewerContextAccess\s*\(/)
    expect(research).toMatch(/actorUserId:\s*access\.userId/)
    // the client body is only parsed via parseBody → { mode, topic|question }
    expect(research).not.toMatch(/body\.(actor|actorUserId|claim_id|claimIds|applicability|bi_status|authority|assessment)/i)
  })

  test('CAH-4G.6 research route: audit failure → 503 with a fixed message, zero governed content', () => {
    expect(research).toMatch(/HrrAuditNotRecordedError/)
    expect(research).toMatch(/status:\s*503/)
  })
})

describe('E — the panel is a server component; the lookup client shares no workbook state', () => {
  test('ReviewerLkPanel.tsx is NOT a client component', () => {
    expect(read(REVIEWER_LK_PANEL)).not.toMatch(/^'use client'/m)
  })
  test('ReviewerLkLookup.tsx: one POST to the converged research route; no copy-to-evidence / apply-to-workbook control', () => {
    const src = codeOnly(REVIEWER_LK_LOOKUP)
    const fetches = src.match(/fetch\(/g) ?? []
    expect(fetches).toHaveLength(1)
    expect(src).toMatch(/method:\s*'POST'/)
    expect(src).toMatch(/reviewer-lk\/research/)
    // the legacy GET topic path is NOT used by the UI any more
    expect(src).not.toMatch(/reviewer-lk\?topic=/)
    expect(src).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim|summari[sz]e/i)
    // a labelled free-form input is expected (Ask HRR); no bare unlabelled input
    expect(src).toMatch(/<textarea\b/)
    expect(src).toMatch(/htmlFor="hrr-question"/)
    expect(src).toMatch(/id="hrr-question"/)
  })
  test('HrrResearchAnswerView.tsx is the one shared renderer — no topic/question split, no reinterpretation, no promotion control', () => {
    const src = codeOnly(HRR_ANSWER_VIEW)
    expect(src).not.toMatch(/TopicResearchResultView|QuestionResearchResultView/)
    expect(src).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(src).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim|promoteClaim|addToEvidence|summari[sz]e/i)
    expect(src).not.toMatch(/buildBoundedInterpretations|evaluateApplicabilityDetailed|selectReviewerClaims/)
    // renders the composed answer only
    expect(src).toMatch(/answer:\s*HrrResearchAnswer/)
  })
  test('the LK view reaches the page via the <ReviewerShell> inspector slot, never inside WorkbookClient (code, not comments)', () => {
    const page = codeOnly('app/admin/submissions/[id]/review/page.tsx')
    // CAH-4F.1: page.tsx wraps WorkbookClient in <ReviewerShell> and passes
    // <ReviewerResources> as the opaque `inspector` slot — never as a
    // WorkbookClient prop/child.
    expect(page).toMatch(/<ReviewerShell/)
    expect(page).toMatch(/inspector=\{[^}]*<ReviewerResources submissionId=\{params\.id\} \/>/)
    expect(page).not.toMatch(/<ReviewerLkPanel/)
    // WorkbookClient's opening tag carries no reviewer component as a prop
    const wbOpen = page.match(/<WorkbookClient[\s\S]*?\/>/)
    expect(wbOpen).not.toBeNull()
    expect(wbOpen![0]).not.toMatch(/ReviewerResources|ReviewerLkPanel|ReviewerCrcContextPanel|ReviewerShell/)
  })

  test('<ReviewerResources> is a server component that only hands the two views to the client inspector as slots', () => {
    const src = codeOnly(REVIEWER_LK_RESOURCES)
    expect(read(REVIEWER_LK_RESOURCES)).not.toMatch(/^'use client'/m)
    expect(src).toMatch(/<ReviewerResourcesInspector/)
    expect(src).toMatch(/livingKnowledge=\{<ReviewerLkPanel submissionId=\{submissionId\} \/>\}/)
    expect(src).toMatch(/linkedCrcContext=\{<ReviewerCrcContextPanel submissionId=\{submissionId\} \/>\}/)
    expect(src).not.toMatch(/fetch\(|useState|useEffect|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(src).not.toMatch(/<textarea|<input\b/)
    expect(src).not.toMatch(/copyToEvidence|applyToWorkbook|acceptClaim/i)
  })

  test('<ReviewerResourcesInspector> is a client tab host with no data path — imports no reviewer-lk/reviewer-context/assessment service', () => {
    const imports = importLines(REVIEWER_RESOURCES_INSPECTOR)
    expect(read(REVIEWER_RESOURCES_INSPECTOR)).toMatch(/^'use client'/m)
    expect(imports).not.toMatch(/@\/lib\/reviewer-lk|@\/lib\/reviewer-context|@\/lib\/assessments|@\/lib\/retrieval-engine/)
    const src = codeOnly(REVIEWER_RESOURCES_INSPECTOR)
    expect(src).not.toMatch(/fetch\(|\.insert\s*\(|\.update\s*\(|\.rpc\s*\(/)
    expect(src).not.toMatch(/<textarea|<input\b/)
  })
})

describe('F — CRC-channel governance metadata is not rendered as reviewer authority (CAH-4F → CAH-4G.6)', () => {
  const lookup = codeOnly(REVIEWER_LK_LOOKUP)
  const view = codeOnly(HRR_ANSWER_VIEW)

  test('raw crc_publication_scope / crc_eligible are never rendered by the HRR surface', () => {
    for (const src of [lookup, view]) {
      expect(src).not.toMatch(/crc_publication_scope/)
      expect(src).not.toMatch(/crc_eligible/)
      expect(src).not.toMatch(/CRC channel/)
    }
  })

  test('the reviewer-readable topic label map keys are exactly GOAL_CATEGORIES minus "unknown"', () => {
    const { REVIEWER_TOPIC_LABELS } = require('@/lib/reviewer-lk/topic-labels')
    const { GOAL_CATEGORIES } = require('@/types/interview-engine')
    expect(Object.keys(REVIEWER_TOPIC_LABELS).sort()).toEqual(
      GOAL_CATEGORIES.filter((c: string) => c !== 'unknown').sort(),
    )
  })

  test('CAH-4G.6: topic chips carry the canonical enum (data-topic), display the label only, and a click runs the research', () => {
    expect(lookup).toMatch(/role="radiogroup"/)
    expect(lookup).toMatch(/data-topic=\{t\}/)
    expect(lookup).toMatch(/onClick=\{\(\) => onResearch\(t\)\}/)
    expect(lookup).toMatch(/\{reviewerTopicLabel\(t\)\}/)
    // the enum reaches the server in the POST body, never a label round-trip
    expect(lookup).toMatch(/mode:\s*'topic_pick',\s*topic/)
  })
})
