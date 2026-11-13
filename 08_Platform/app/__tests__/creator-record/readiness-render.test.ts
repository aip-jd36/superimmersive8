/**
 * CR-SUM-2A — the synthetic-only renderer proof for the Creator Record consultative summary.
 *
 * Every record here is a real record, built locally by the real builder: from the LIVE approved sources (Runway,
 * Higgsfield) or from the pilot sources under a synthetic questionnaire/wording approval. The summary and render
 * templates are SYNTHETIC: the render wording below is the CR-SUM-0 DRAFT plus strings copied from the approved PDF
 * template set v3, under an approval that is clearly a synthetic test approval and is registered nowhere.
 * No database, Storage, model or network.
 *
 * Set SI8_RENDER_EXAMPLES_DIR to write the rendered examples as text files (review only).
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import type { PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import { approvedCustomerRecordInputs, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { CREATOR_RECORD_CAVEATS, CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import {
  READINESS_RENDER_METHOD, readinessRenderFingerprint, readinessRenderText, renderReadinessSummary, ReadinessRenderRefusal,
  type ReadinessRenderApproval, type ReadinessRenderTemplates, type RenderedReadinessSummary,
} from '@/lib/creator-record/readiness-summary/render'
import { buildReadinessSummary, readinessTemplatesFingerprint, READINESS_SUMMARY_METHOD, type ReadinessSummary, type ReadinessSummaryTemplates } from '@/lib/creator-record/readiness-summary/summary'
import { canonicalJson } from '@/lib/creator-record/record-core/canonical'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { schema8Fixture } from '@/test-support/customer-record-schema8'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'

// ── wording: approved PDF v3 strings (read, not retyped) + CR-SUM-0 DRAFT strings, under a SYNTHETIC approval ──
const V3 = (approvedPdfTemplates(GOV as never, { id: CUSTOMER_RECORD_SCHEMA, version: 8 }).templates as any)
const SYNTHETIC_APPROVAL_AUTHORITY = 'SYNTHETIC TEST APPROVAL — CR-SUM-2A renderer proof — NOT APPROVED WORDING'

const SUMMARY_TEMPLATES: ReadinessSummaryTemplates = {
  template_id: 'si8/creator-record-v2-readiness-summary-templates',
  version: 1,
  conclusion_labels: { relevant_on_declared_facts: V3.conclusion_labels.relevant_on_declared_facts, relevant_applicability_unresolved: V3.conclusion_labels.relevant_applicability_unresolved },
  topic_labels: { commercial_use: V3.topic_labels.commercial_use, third_party_source_rights: V3.topic_labels.third_party_source_rights },
  topic_framing: {
    commercial_use: 'An AI tool’s own terms set whether, and on which plans, what it generates may be used commercially.',
    third_party_source_rights: 'When a video includes music or stock material from a library, that library’s license sets how the material may be used.',
  },
  selected_because_label: V3.sections.guidance.selected_because,
  based_on_label: V3.sections.guidance.on_what_you_told_us,
  subject_questions: ['T1', 'T1X', 'M1', 'M1X', 'M3', 'M3X'],
  topic_qualified_note: V3.sections.guidance.topic_level,
  unspecified_condition_note: V3.sections.guidance.unspecified_condition,
}
const SUMMARY_APPROVAL = { template_id: SUMMARY_TEMPLATES.template_id, version: 1, fingerprint: readinessTemplatesFingerprint(SUMMARY_TEMPLATES), lifecycle: 'approved' as const, authority: SYNTHETIC_APPROVAL_AUTHORITY, decision_date: '2026-11-12' }

const RENDER_TEMPLATES: ReadinessRenderTemplates = {
  template_id: 'si8/creator-record-v2-readiness-render-templates',
  version: 1,
  summary_method: { ...READINESS_SUMMARY_METHOD },
  heading: 'Commercial-readiness considerations', // DRAFT (CR-SUM-0 SUM-H1)
  orientation: 'This section brings together what SI8’s published guidance says about the tools and services the creator named, and what this record does not establish. It does not weigh these points against each other or reach an overall conclusion, and it is not a decision about whether the video may be used commercially.', // DRAFT (SUM-O1)
  declared_heading: V3.sections.open_items.what_you_told_us, // v3 "What you told us"
  guidance_heading: 'What SI8’s published guidance says', // DRAFT
  guidance_intro: V3.sections.guidance.intro, // v3
  item_limitation: V3.sections.guidance.item_limitation, // v3
  dependency_told_label: V3.sections.open_items.what_you_told_us, // v3
  dependency_nothing_told: V3.sections.open_items.nothing_told, // v3
  dependency_evidence_label: V3.sections.open_items.evidence_note, // v3
  conclusion_label: V3.sections.guidance.conclusion, // v3
  caveats_label: V3.sections.guidance.caveats, // v3
  consideration_ref_label: '[TEST ONLY] Consideration', // CR-SUM-2B synthetic test wording; formal wording pending approval
  caveat_applies_to_label: '[TEST ONLY] Applies to considerations', // CR-SUM-2B synthetic test wording; formal wording pending approval
  depends_on_label: V3.sections.guidance.depends_on, // v3
  fact_labels: V3.fact_labels, // v3
  unresolved_heading: 'What remains open', // DRAFT
  unresolved_intro: 'An open item is not a problem SI8 has found, and it is not resolved by anything in this record.', // v3 sentence (second sentence of open_items.intro)
  unresolved_empty: V3.sections.open_items.empty, // v3
  dependency_status_label: V3.sections.open_items.status, // v3
  dependency_status_labels: V3.dependency_codes.status, // v3
  dependency_sufficiency_label: V3.sections.open_items.sufficiency, // v3
  dependency_sufficiency_labels: V3.dependency_codes.sufficiency, // v3
  topic_qualified_heading: V3.sections.open_items.topic_qualified_heading, // v3
  unspecified_heading: V3.sections.open_items.unspecified_heading, // v3
  not_sure_heading: V3.sections.open_items.not_sure_heading, // v3
  not_established_heading: 'What this record does not establish', // DRAFT
  guidance_empty: V3.sections.guidance.empty, // v3
  uncovered_intro: 'SI8 has no published guidance in this record for these tools and services the creator named:', // DRAFT (SUM-M2)
  rest_of_answers: 'The rest of the creator’s answers received no guidance in this record. That is not a finding about them: it neither suggests nor rules out commercial use, and it does not mean there is nothing to consider.', // DRAFT (SUM-M4)
  assurance_heading: 'How this differs from a human-reviewed assessment', // DRAFT (SUM-A1)
  assurance_text: 'This record organises what the creator declared and what SI8’s published guidance says about it. It does not examine the evidence behind the answers, resolve open items or decide whether the video may be used commercially. SI8’s Commercial Assurance Assessment is a separate service in which a person at SI8 reviews a project and its evidence.', // DRAFT (SUM-A2)
}
const renderApprovalOf = (t: ReadinessRenderTemplates): ReadinessRenderApproval => ({ template_id: t.template_id, version: t.version, fingerprint: readinessRenderFingerprint(t), lifecycle: 'approved', authority: SYNTHETIC_APPROVAL_AUTHORITY, decision_date: '2026-11-12' })
const RENDER_APPROVAL = renderApprovalOf(RENDER_TEMPLATES)

// ── record builders (local, real builder) ──
const ACK = { A1: true, A2: true }
const RECORD = (id: string, version = 1) => ({ record_id: id, record_version: version, captured_at: '2026-11-12T00:00:00Z' })
function live(id: string, answers: Record<string, string[]>, tools: Record<string, string[]>[], version = 1) {
  const i = approvedCustomerRecordInputs(GOV as never)
  const r = buildCustomerRecord({ state: { answers, tools, acknowledgements: ACK } as never, sources: i.sources as never, source_text: i.source_text as never, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12', record: RECORD(id, version) })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 500))
  return r
}
// Pilot sources under a synthetic questionnaire approval (the customer-pdf tests' pattern), with a chosen ledger.
const SYN: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-11-12', review_ref: 'SYNTHETIC-REVIEW-SUM2A' }
function pilot(ledger: readonly PublicationLedgerEntry[] | null): CreatorRecordSources {
  const p = pilotSources()
  return withQuestionnaireApproval({
    ...p,
    kind: 'governed',
    registry_input: {
      ...p.registry_input,
      questions: p.registry_input.questions.map((q) => ({ ...q, approval: q.approval.status === 'approved' ? SYN : q.approval })),
      observation_map: p.registry_input.observation_map.map((o) => ({ ...o, approval: o.approval.status === 'approved' ? SYN : o.approval })),
    },
    ...(ledger ? { ledger, caveats: { ...p.caveats, ...CREATOR_RECORD_CAVEATS } } : { ledger: p.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver: SYN.approver })) }),
    versions: { registry: 'SYNTHETIC-REGISTRY-SUM2A', ledger: 'SYNTHETIC-LEDGER-SUM2A' },
  } as CreatorRecordSources)
}
function pilotRecord(id: string, sources: CreatorRecordSources, answers: Record<string, string[]>, tools: Record<string, string[]>[]) {
  const acks = Object.fromEntries(sources.acknowledgement_ids.map((a) => [a, `Synthetic acknowledgement ${a} (test fixture only).`]))
  const loaded = loadQuestionRegistry(sources.registry_input)
  if (!loaded.ok) throw new Error('registry')
  const approval = {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(sources, loaded.registry, acks)),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved' as const, authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-11-12', review_ref: 'SYNTHETIC-TEXT-SUM2A',
  }
  const r = buildCustomerRecord({ state: { answers, tools, acknowledgements: ACK } as never, sources, source_text: { approval, acknowledgements: acks }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-12', record: RECORD(id) })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 500))
  return r
}

const PROPOSAL = JSON.parse(readFileSync(join(__dirname, '../../lib/creator-record/governed/proposals/CR-V2-LEDGER-4-artlist-standalone.proposal.json'), 'utf8')) as { entry: PublicationLedgerEntry }
/** The Artlist proposal as if approved — TEST ONLY; the staged proposal itself stays Pending and outside the live ledger. */
const ARTLIST_APPROVED_COPY: PublicationLedgerEntry = { ...PROPOSAL.entry, creator_record_eligible: 'Yes', approver: 'SYNTHETIC TEST APPROVER', decision_date: '2026-11-12', refresh_by: '2027-02-12' }
const LIVE_PLUS_ARTLIST = [...CREATOR_RECORD_PUBLICATION_LEDGER.filter((e) => !e.superseded_by && e.creator_record_eligible === 'Yes'), ARTLIST_APPROVED_COPY]

const BASE = { P1: ['Renderer proof video'], P3: ['own_channels'], F1: ['TW'], F2: ['TW'], L1: ['no'], H1: ['edited'] }
type Built = { canonical: string; sha256: string }
const SCENARIOS: Record<string, () => Built> = {
  '1-runway-higgsfield': () => live('PREP-SUM2A-1', { ...BASE, M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['higgsfield'], T3: ['Creator'], T4: ['May 2026'] }]),
  '2-tools-artlist-music': () => pilotRecord('PREP-SUM2A-2', pilot(LIVE_PLUS_ARTLIST), { ...BASE, M0: ['music'], M1: ['artlist'], M2: ['yes'] }, [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }]),
  '3-tools-artlist-stock': () => pilotRecord('PREP-SUM2A-3', pilot(LIVE_PLUS_ARTLIST), { ...BASE, M0: ['stock'], M3: ['artlist'], M3D: ['yes'] }, [{ T1: ['higgsfield'], T3: ['Creator'], T4: ['May 2026'] }]),
  '4-incomplete-declarations': () => live('PREP-SUM2A-4', { ...BASE, L1: ['not_sure'], M0: ['music'], M1: ['not_sure'], M2: ['not_sure'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['not_sure'] }, { T1: ['not_sure'], T3: ['not_sure'], T4: ['not_sure'] }]),
  '5-unresolved-and-topic-caps': () => pilotRecord('PREP-SUM2A-5', pilot(null), { ...BASE, M0: ['stock'], M3: ['getty'], M3D: ['no'] }, [{ T1: ['pika'], T3: ['not_sure'], T4: ['May 2026'] }]),
}

const summarize = (b: Built): ReadinessSummary => buildReadinessSummary({ canonical: b.canonical, sha256: b.sha256, templates: SUMMARY_TEMPLATES, approval: SUMMARY_APPROVAL })
const render = (s: ReadinessSummary, t = RENDER_TEMPLATES, a: ReadinessRenderApproval | null = RENDER_APPROVAL) => renderReadinessSummary(s, t, a)
const refusal = (fn: () => unknown): string => {
  try {
    fn()
    return 'rendered'
  } catch (e) {
    if (e instanceof ReadinessRenderRefusal) return e.code
    throw e
  }
}
const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out))
  return out
}
const texts = (r: RenderedReadinessSummary) => r.blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))

const BUILT: Record<string, Built> = {}
const SUMMARIES: Record<string, ReadinessSummary> = {}
const valueOf = (b: RenderedReadinessSummary['blocks'][number]) => (b.kind === 'row' ? b.value : b.text)
const RENDERED: Record<string, RenderedReadinessSummary> = {}
beforeAll(() => {
  for (const [k, f] of Object.entries(SCENARIOS)) {
    BUILT[k] = f()
    SUMMARIES[k] = summarize(BUILT[k])
    RENDERED[k] = render(SUMMARIES[k])
  }
  const dir = process.env.SI8_RENDER_EXAMPLES_DIR
  if (dir) {
    mkdirSync(dir, { recursive: true })
    for (const [k, r] of Object.entries(RENDERED)) {
      writeFileSync(join(dir, `${k}.txt`), `SYNTHETIC RENDERER PROOF (CR-SUM-2A) · DRAFT WORDING UNDER A SYNTHETIC TEST APPROVAL · NOT APPROVED · NOT A REAL RECORD\nrecord ${r.summary.record_ref} v${r.summary.record_version} · snapshot ${r.summary.snapshot_sha256.slice(0, 12)}…\n\n${readinessRenderText(r)}`)
    }
  }
})

describe('the scenarios are what they claim to be (real records)', () => {
  test('1: Runway and Higgsfield from the live approved sources, in questionnaire order', () => {
    const s = SUMMARIES['1-runway-higgsfield']
    expect(s.identity.schema_version).toBe(7)
    expect(s.groups.map((g) => g.considerations.map((c) => c.claim_id))).toEqual([['CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'], ['CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1']])
  })
  test('2 and 3: the same Artlist consideration, selected by the music answer or by the stock answer', () => {
    const music = SUMMARIES['2-tools-artlist-music'].groups.find((g) => g.considerations.some((c) => c.claim_id.includes('ARTLIST')))!
    const stock = SUMMARIES['3-tools-artlist-stock'].groups.find((g) => g.considerations.some((c) => c.claim_id.includes('ARTLIST')))!
    expect(music.subject!.q_id).toBe('M1')
    expect(stock.subject!.q_id).toBe('M3')
    expect(music.considerations[0].explanation).toBe(ARTLIST_APPROVED_COPY.explanation)
    expect(stock.considerations[0].explanation).toBe(ARTLIST_APPROVED_COPY.explanation)
  })
  test('4: incomplete declarations: not-sure answers and an uncovered "Not sure" tool', () => {
    const s = SUMMARIES['4-incomplete-declarations']
    expect(s.open_items.not_sure.length).toBeGreaterThanOrEqual(4)
    expect(s.uncovered_subjects.some((u) => u.q_id === 'T1' && u.tool_index === 1)).toBe(true)
  })
  test('5: unresolved conditions, open dependencies and a topic-level cap', () => {
    const s = SUMMARIES['5-unresolved-and-topic-caps']
    expect(s.open_items.unresolved_applicability.length).toBeGreaterThan(0)
    expect(s.open_items.topic_qualified.length).toBeGreaterThan(0)
    expect(s.open_items.dependencies.length).toBeGreaterThan(0)
  })
})

describe('boundedness: rendering adds no interpretation', () => {
  test('every rendered text is a summary string (source "summary") or a render template string (source "render")', () => {
    const templateStrings = new Set(strings(RENDER_TEMPLATES))
    for (const [k, r] of Object.entries(RENDERED)) {
      const summaryStrings = new Set(strings(SUMMARIES[k]))
      for (const b of r.blocks) {
        const parts = b.kind === 'row' ? [[b.label, b.label_source], [b.value, b.value_source]] as const : [[b.text, b.source]] as const
        const n = SUMMARIES[k].groups.flatMap((g) => g.considerations).length
        const mechanical = (text: string) => /^[1-9]\d*(, [1-9]\d*)*$/.test(text) && text.split(', ').every((x) => Number(x) <= n)
        for (const [text, source] of parts) expect([k, text, source === 'summary' ? summaryStrings.has(text) : source === 'render' ? templateStrings.has(text) : mechanical(text)]).toEqual([k, text, true])
      }
    }
  })
  test('conclusions: exactly one per consideration, in order, verbatim from the summary, and nowhere else', () => {
    for (const [k, r] of Object.entries(RENDERED)) {
      const cs = SUMMARIES[k].groups.flatMap((g) => g.considerations)
      const rows = r.blocks.filter((b) => b.role === 'conclusion')
      expect(rows.map((b) => (b.kind === 'row' ? b.value : null))).toEqual(cs.map((c) => c.conclusion.label))
      const labels = new Set(Object.values(SUMMARY_TEMPLATES.conclusion_labels))
      const elsewhere = r.blocks.filter((b) => b.role !== 'conclusion' && texts({ ...r, blocks: [b] }).some((t) => labels.has(t)))
      expect(elsewhere).toEqual([])
    }
  })
  test('nothing is dropped: every consideration, condition, dependency, cap, unidentified condition and not-sure answer is rendered', () => {
    for (const [k, r] of Object.entries(RENDERED)) {
      const s = SUMMARIES[k]
      const all = texts(r)
      for (const c of s.groups.flatMap((g) => g.considerations)) {
        expect(all).toContain(c.explanation)
        for (const cv of c.caveats) expect(all).toContain(cv)
        if (c.topic_qualified) expect(all).toContain(c.topic_qualified)
        if (c.unspecified_condition) expect(all).toContain(c.unspecified_condition)
      }
      for (const d of s.open_items.dependencies) expect(all).toContain(d.label)
      for (const f of s.open_items.unresolved_applicability) expect(all).toContain(RENDER_TEMPLATES.fact_labels[f.fact])
      for (const q of s.open_items.not_sure) expect(all).toContain(q.question)
      for (const u of s.uncovered_subjects) expect(all).toContain(u.answer)
    }
  })
  test('the five reader-facing distinctions are kept apart and in a fixed order', () => {
    const ORDER = ['header', 'declared', 'guidance', 'unresolved', 'not_established', 'assurance']
    for (const r of Object.values(RENDERED)) {
      const seq = r.blocks.map((b) => ORDER.indexOf(b.section))
      expect(seq).toEqual([...seq].sort((a, b) => a - b))
      // Governed text appears only in the guidance section; open items only in the unresolved section.
      expect(r.blocks.filter((b) => (b.role === 'explanation' || b.role === 'conclusion' || b.role === 'caveat') && b.section !== 'guidance')).toEqual([])
      expect(r.blocks.filter((b) => b.role === 'open_item' && b.section !== 'unresolved')).toEqual([])
      expect(r.blocks.filter((b) => b.section === 'assurance').map((b) => (b.kind === 'row' ? b.value : b.text))).toEqual([RENDER_TEMPLATES.assurance_heading, RENDER_TEMPLATES.assurance_text])
    }
  })
  test('declarations rendered are exactly the recorded answers; no fact is invented', () => {
    for (const [k, r] of Object.entries(RENDERED)) {
      const record = JSON.parse(BUILT[k].canonical)
      for (const b of r.blocks) {
        if (b.role !== 'declaration' && b.role !== 'uncovered') continue
        if (b.kind !== 'row') throw new Error('declaration not a row')
        expect(record.declarations.answers.some((a: { question: string; answer_verbatim: string }) => a.question === b.label && a.answer_verbatim === b.value)).toBe(true)
      }
    }
  })
  test('D10: no document id, reading value or excerpt is rendered, even when the summary carries document codes', async () => {
    const f = await schema8Fixture({ docs: [{ tool_index: 0 }, { tool_index: 0 }] })
    const s = summarize(f)
    const ids = f.record.documents.items.map((d) => d.document_id)
    const readings = new Set<string>()
    for (const d of f.record.documents.items) if (d.examination !== 'not_examined') for (const o of (d.examination as any).envelope.observations) for (const t of [o.value, o.excerpt]) if (typeof t === 'string') readings.add(t)
    expect(s.groups.flatMap((g) => g.considerations).some((c) => c.documents.length > 0)).toBe(true)
    const rendered = render(s)
    const all = texts(rendered)
    for (const id of ids) expect(all.some((x) => x.includes(id))).toBe(false)
    const declared = new Set(strings(f.record.declarations))
    for (const x of all) if (readings.has(x)) expect(declared.has(x)).toBe(true)
  })
})

describe('determinism and version isolation', () => {
  test('the same summary renders byte-identically', () => {
    for (const s of Object.values(SUMMARIES)) expect(canonicalJson(render(s))).toBe(canonicalJson(render(s)))
  })
  test('each rendering is bound to one record version, and rendering another version leaves it unchanged', () => {
    const before = canonicalJson(RENDERED['1-runway-higgsfield'])
    const v2 = live('PREP-SUM2A-1', { ...BASE, M0: ['none'] }, [{ T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }], 2)
    const r2 = render(summarize(v2))
    expect(r2.summary.record_version).toBe(2)
    expect(r2.summary.snapshot_sha256).toBe(v2.sha256)
    expect(r2.summary.snapshot_sha256).not.toBe(RENDERED['1-runway-higgsfield'].summary.snapshot_sha256)
    expect(canonicalJson(render(SUMMARIES['1-runway-higgsfield']))).toBe(before)
  })
  test('the renderer takes only the summary: its signature has no record, claim, ledger or document input', () => {
    expect(renderReadinessSummary.length).toBe(3)
    const src = readFileSync(join(__dirname, '../../lib/creator-record/readiness-summary/render.ts'), 'utf8')
    const imports = Array.from(src.matchAll(/from '([^']+)'/g)).map((m) => m[1])
    expect(imports.sort()).toEqual(['../record-core/canonical', './summary'])
  })
})

describe('fail closed', () => {
  const s = () => SUMMARIES['5-unresolved-and-topic-caps']
  test('templates: missing, unapproved, changed or incomplete wording refuses', () => {
    expect(refusal(() => render(s(), RENDER_TEMPLATES, null))).toBe('templates_not_approved')
    expect(refusal(() => render(s(), { ...RENDER_TEMPLATES, heading: 'changed' }, RENDER_APPROVAL))).toBe('templates_fingerprint_mismatch')
    const incomplete = { ...RENDER_TEMPLATES, assurance_text: '' }
    expect(refusal(() => render(s(), incomplete, renderApprovalOf(incomplete)))).toBe('templates_incomplete')
  })
  test('a summary from another method version, an unlabelled fact or dependency code, or a malformed summary refuses', () => {
    expect(refusal(() => render({ ...s(), method: { ...s().method, version: 2 } as never }))).toBe('summary_method_mismatch')
    const noFacts = { ...RENDER_TEMPLATES, fact_labels: {} }
    expect(refusal(() => render(s(), noFacts, renderApprovalOf(noFacts)))).toBe('unlabelled_fact')
    const noStatus = { ...RENDER_TEMPLATES, dependency_status_labels: {} }
    expect(refusal(() => render(s(), noStatus, renderApprovalOf(noStatus)))).toBe('unlabelled_dependency_code')
    expect(refusal(() => render({ ...s(), topics: [] }))).toBe('malformed_summary')
    expect(refusal(() => render({ ...s(), open_items: { ...s().open_items, topic_qualified: [{ consideration: 99 }] } }))).toBe('malformed_summary')
  })
})

describe('inactive', () => {
  test('no application code imports the renderer or the summary; the synthetic approval is registered nowhere', () => {
    const root = join(__dirname, '../..')
    const files: string[] = []
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        if (['node_modules', '.next', '__tests__', '.git'].includes(n)) continue
        const p = join(d, n)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx|js|mjs)$/.test(n)) files.push(p)
      }
    }
    for (const d of ['app', 'lib', 'components', 'scripts']) {
      try { walk(join(root, d)) } catch { /* folder absent */ }
    }
    const own = join(root, 'lib/creator-record/readiness-summary')
    // CR-SUM-PDF-B1: the customer document model is the one gated importer; the synthetic approval appears in no application file.
    const importers = files.filter((p) => !p.startsWith(own) && /from ['"][^'"]*readiness-summary/.test(readFileSync(p, 'utf8'))).map((p) => relative(root, p).split(sep).join('/'))
    expect(importers).toEqual(['lib/creator-record/customer-pdf/document-model.ts'])
    expect(files.filter((p) => /SYNTHETIC TEST APPROVAL/.test(readFileSync(p, 'utf8')))).toEqual([])
  })
})

describe('CR-SUM-2B: mechanical consideration references', () => {
  test('each consideration carries its own position as its reference, in order, stable across renders', () => {
    for (const [k, r] of Object.entries(RENDERED)) {
      const n = SUMMARIES[k].groups.flatMap((g) => g.considerations).length
      const refs = r.blocks.filter((b) => b.section === 'guidance' && b.role === 'reference' && b.applies_to === undefined)
      expect(refs.map(valueOf)).toEqual(Array.from({ length: n }, (_, i) => String(i + 1)))
      expect(refs.every((b) => b.kind === 'row' && b.value_source === 'mechanical' && b.consideration === Number(b.value))).toBe(true)
      expect(canonicalJson(render(SUMMARIES[k]))).toBe(canonicalJson(r))
    }
  })
  test('several considerations under one provider get distinct references, and the open items use the same ones', () => {
    const k = '5-unresolved-and-topic-caps'
    const s = SUMMARIES[k]
    const r = RENDERED[k]
    const pika = s.groups.find((g) => g.subject?.answer.toLowerCase().includes('pika'))!
    expect(pika.considerations.length).toBeGreaterThan(1)
    // Every open condition is shown under the reference of the consideration it belongs to.
    for (const f of s.open_items.unresolved_applicability) {
      const at = r.blocks.findIndex((b) => b.section === 'unresolved' && b.role === 'reference' && b.consideration === f.consideration)
      expect(at).toBeGreaterThanOrEqual(0)
      expect(valueOf(r.blocks[at])).toBe(String(f.consideration))
      expect(r.blocks.some((b) => b.section === 'unresolved' && b.role === 'condition' && b.consideration === f.consideration && valueOf(b) === RENDER_TEMPLATES.fact_labels[f.fact])).toBe(true)
    }
    for (const d of s.open_items.dependencies) expect(r.blocks.some((b) => b.section === 'unresolved' && b.role === 'condition' && b.consideration === d.consideration && valueOf(b) === d.label)).toBe(true)
    for (const x of s.open_items.topic_qualified) expect(r.blocks.some((b) => b.section === 'unresolved' && b.role === 'reference' && b.consideration === x.consideration)).toBe(true)
    // The three previously indistinguishable "Commercial use of AI output: Pika" rows now each carry a different reference.
    const pikaOpen = r.blocks.filter((b) => b.section === 'unresolved' && b.role === 'subject' && valueOf(b).toLowerCase().includes('pika'))
    expect(new Set(pikaOpen.map((b) => b.consideration)).size).toBeGreaterThan(1)
    for (const b of pikaOpen) {
      const prev = r.blocks[r.blocks.indexOf(b) - 1]
      expect(prev.kind === 'row' && prev.role === 'reference' && prev.consideration === b.consideration && prev.value === String(b.consideration)).toBe(true)
    }
  })
  test('references carry no meaning: they never depend on status', () => {
    const s = SUMMARIES['5-unresolved-and-topic-caps']
    const flipped: ReadinessSummary = JSON.parse(JSON.stringify(s))
    for (const c of flipped.groups.flatMap((g) => g.considerations)) c.conclusion = { code: 'relevant_on_declared_facts', label: SUMMARY_TEMPLATES.conclusion_labels.relevant_on_declared_facts }
    const refsOf = (r: RenderedReadinessSummary) => r.blocks.filter((b) => b.section === 'guidance' && b.role === 'reference' && b.applies_to === undefined).map(valueOf)
    expect(refsOf(render(flipped))).toEqual(refsOf(render(s)))
  })
})

describe('CR-SUM-2B: caveats shown once, with an explicit mapping', () => {
  test('each distinct caveat text is shown exactly once, mapped to exactly the considerations it qualifies', () => {
    for (const [k, r] of Object.entries(RENDERED)) {
      const cs = SUMMARIES[k].groups.flatMap((g) => g.considerations)
      const shown = r.blocks.filter((b) => b.role === 'caveat')
      const texts = shown.map(valueOf)
      expect(new Set(texts).size).toBe(texts.length)
      const expected = new Map<string, number[]>()
      for (const c of cs) for (const cv of c.caveats) expected.set(cv, [...(expected.get(cv) ?? []), c.index].filter((x, i, a) => a.indexOf(x) === i))
      expect(texts).toEqual([...expected.keys()])
      for (const b of shown) expect(b.applies_to).toEqual(expected.get(valueOf(b)))
      // The visible mapping row follows each caveat and states the same references.
      for (const b of shown) {
        const next = r.blocks[r.blocks.indexOf(b) + 1]
        expect(next.kind === 'row' && next.role === 'reference' && next.value === b.applies_to!.join(', ')).toBe(true)
      }
    }
  })
  test('scenario 2: Runway and Artlist share both caveats; the record keeps them per item', () => {
    const s = SUMMARIES['2-tools-artlist-music']
    const r = RENDERED['2-tools-artlist-music']
    expect(s.groups.flatMap((g) => g.considerations).every((c) => c.caveats.length === 2)).toBe(true)
    expect(r.blocks.filter((b) => b.role === 'caveat').map((b) => b.applies_to)).toEqual([[1, 2], [1, 2]])
  })
  test('only identical text is combined: a one-character difference stays separate, and nothing is broadened', () => {
    const s: ReadinessSummary = JSON.parse(JSON.stringify(SUMMARIES['2-tools-artlist-music']))
    const second = s.groups.flatMap((g) => g.considerations)[1]
    second.caveats = [second.caveats[0] + ' ', second.caveats[1]]
    const r = render(s)
    const shown = r.blocks.filter((b) => b.role === 'caveat')
    expect(shown.length).toBe(3)
    expect(shown.map((b) => b.applies_to)).toEqual([[1], [1, 2], [2]])
  })
})

describe('CR-SUM-PDF-B1 reading order: selection provenance belongs to the consideration it explains', () => {
  test('each consideration opens with its reference, topic, then "Selected because you told us" and its selecting answers', () => {
    expect(READINESS_RENDER_METHOD.version).toBe(2)
    for (const [k, r] of Object.entries(RENDERED)) {
      for (const c of SUMMARIES[k].groups.flatMap((g) => g.considerations)) {
        const own = r.blocks.filter((b) => b.section === 'guidance' && b.consideration === c.index)
        const head = own.slice(0, 3 + c.selected_because.declarations.length)
        expect([k, c.index, head.map((b) => b.role)]).toEqual([k, c.index, ['reference', 'topic', 'chrome', ...c.selected_because.declarations.map(() => 'declaration')]])
        expect(head[2].kind === 'label' && head[2].text).toBe(c.selected_because.label)
        c.selected_because.declarations.forEach((d, n) => {
          const b = head[3 + n]
          expect(b.kind === 'row' && [b.label, b.value]).toEqual([d.question, d.answer])
        })
        // The declared basis sits directly under the conclusion it explains.
        if (c.based_on.declarations.length > 0) {
          const at = own.findIndex((b) => b.role === 'conclusion')
          const nb = own[at + 1]; expect(nb.kind === 'label' ? nb.text : null).toBe(c.based_on.label)
        }
        // No consideration ends with a label or a declaration row, so nothing can be read as the next one's heading.
        const last = own[own.length - 1]
        expect([k, c.index, last.kind === 'label' || last.role === 'declaration']).toEqual([k, c.index, false])
      }
    }
  })
  test('presentation only: each consideration prints exactly the same blocks as before, in a different order', () => {
    // The v1 order, rebuilt from the v2 blocks: same multiset of (kind, role, text) per consideration.
    for (const [k, r] of Object.entries(RENDERED)) {
      for (const c of SUMMARIES[k].groups.flatMap((g) => g.considerations)) {
        const own = r.blocks.filter((b) => b.section === 'guidance' && b.consideration === c.index)
        const key = (b: (typeof own)[number]) => JSON.stringify(b.kind === 'row' ? [b.kind, b.role, b.label, b.value] : [b.kind, b.role, b.text])
        const expected = [
          ['row', 'reference', RENDER_TEMPLATES.consideration_ref_label, String(c.index)],
          ['row', 'conclusion', RENDER_TEMPLATES.conclusion_label, c.conclusion.label],
          ['paragraph', 'explanation', c.explanation],
          ['paragraph', 'boundary', RENDER_TEMPLATES.item_limitation],
          ['label', 'chrome', c.selected_because.label],
          ...c.selected_because.declarations.map((d) => ['row', 'declaration', d.question, d.answer]),
          ...(c.based_on.declarations.length > 0 ? [['label', 'chrome', c.based_on.label], ...c.based_on.declarations.map((d) => ['row', 'declaration', d.question, d.answer])] : []),
          ...(c.topic_qualified !== null ? [['paragraph', 'note', c.topic_qualified]] : []),
          ...(c.unspecified_condition !== null ? [['paragraph', 'note', c.unspecified_condition]] : []),
        ].map((x) => JSON.stringify(x))
        const got = own.filter((b) => b.role !== 'topic' && b.role !== 'framing').map(key)
        expect([k, c.index, [...got].sort()]).toEqual([k, c.index, [...expected].sort()])
      }
    }
  })
})

describe('CR-SUM-2B: selection provenance and test-only fixtures', () => {
  test('"Selected because you told us" and the exact selecting answers are kept for every consideration', () => {
    for (const [k, r] of Object.entries(RENDERED)) {
      for (const c of SUMMARIES[k].groups.flatMap((g) => g.considerations)) {
        const own = r.blocks.filter((b) => b.section === 'guidance' && b.consideration === c.index)
        expect(own.some((b) => b.kind === 'label' && b.text === c.selected_because.label)).toBe(true)
        for (const d of c.selected_because.declarations) expect(own.some((b) => b.kind === 'row' && b.role === 'declaration' && b.label === d.question && b.value === d.answer)).toBe(true)
      }
    }
  })
  test('the Pika and Getty items come from the renamed pilot (synthetic) ledger only, never the live one', () => {
    const record = JSON.parse(BUILT['5-unresolved-and-topic-caps'].canonical)
    const ids: string[] = record.sources.publications.map((p: { entry_id: string }) => p.entry_id)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((id) => id.startsWith('SYN-'))).toBe(true)
    expect(ids.some((id) => CREATOR_RECORD_PUBLICATION_LEDGER.some((e) => e.entry_id === id))).toBe(false)
    expect(record.sources.ledger_version).toBe('SYNTHETIC-LEDGER-SUM2A')
  })
  test('schema 8 (documents) renders with references and grouped caveats, and still no document data', async () => {
    const f = await schema8Fixture({ docs: [{ tool_index: 0 }, { tool_index: 0 }] })
    const r = render(summarize(f))
    expect(r.blocks.some((b) => b.role === 'reference')).toBe(true)
    const all = texts(r)
    for (const d of f.record.documents.items) expect(all.some((x) => x.includes(d.document_id))).toBe(false)
  })
})
