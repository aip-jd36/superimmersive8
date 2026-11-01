/**
 * CR-V2-2B — the customer PDF document model and its rendering boundary.
 *
 * Everything "approved" here is a SYNTHETIC TEST FIXTURE: the questionnaire
 * sources (pilot content relabelled), the wording approval, the PLACEHOLDER
 * template set and its approval. None of it is customer wording.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, type CustomerRecordInput, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { evaluateIssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { governanceSnapshotFrom } from '@/lib/creator-record/customer-record/governance-state'
import * as TemplatesModule from '@/lib/creator-record/customer-pdf/templates'
import { CUSTOMER_PDF_SECTIONS, CUSTOMER_PDF_TEMPLATE_ID, fill, templateFingerprint, wordingLockViolations, type CustomerPdfTemplates, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerDocument, CustomerPdfRefusal, documentModelCanonical, documentText, type Block, type CustomerDocumentInput } from '@/lib/creator-record/customer-pdf/document-model'
import { APPLICABILITY_FACTS } from '@/lib/retrieval-engine/types'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const RECORD = { record_id: 'PREP-CRV22BTEST', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const AS_OF = '2026-10-31'
const ISSUED = { record_id: 'CR-2026-3F2A9C10', issued_on: '2026-11-02' }
const ANS = { P1: ['CR-V2-2B synthetic video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

// ── Synthetic record fixtures ──
const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }
function approvedSources(): CreatorRecordSources {
  const p = pilotSources()
  return {
    ...p,
    kind: 'governed',
    registry_input: {
      ...p.registry_input,
      questions: p.registry_input.questions.map((q) => ({ ...q, approval: q.approval.status === 'approved' ? SYNTHETIC : q.approval })),
      observation_map: p.registry_input.observation_map.map((o) => ({ ...o, approval: o.approval.status === 'approved' ? SYNTHETIC : o.approval })),
    },
    ledger: p.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver: SYNTHETIC.approver })),
    versions: { registry: 'SYNTHETIC-REGISTRY-1', ledger: 'SYNTHETIC-LEDGER-1' },
  }
}
const ACKS = (s: CreatorRecordSources) => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function textApproval(s: CreatorRecordSources) {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved' as const, authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
  }
}
const state = (plan = 'Pro', tool = 'pika'): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: [tool], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })
function prepare(over: Partial<CustomerRecordInput> = {}) {
  const sources = over.sources ?? approvedSources()
  const r = buildCustomerRecord({ state: state(), sources, source_text: { approval: textApproval(sources), acknowledgements: ACKS(sources) }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD, ...over })
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r
}

// ── PLACEHOLDER template set (test fixture only; not customer wording) ──
const PH = '[Placeholder] '
function placeholderTemplates(): CustomerPdfTemplates {
  const meta = pilotSources().presentation
  const question_sections: Record<string, 'project' | 'contribution'> = {}
  for (const [q, p] of Object.entries(meta)) if (!p.per_tool) question_sections[q] = p.section === 'project' || p.section === 'locations' ? 'project' : 'contribution'
  return {
    template_id: CUSTOMER_PDF_TEMPLATE_ID,
    version: 1,
    record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    document_title: `${PH}Creator Record {record_id}`,
    stamp: 'PLACEHOLDER WORDING FOR TESTING ONLY · CREATOR RECORD · SELF-DECLARED · NOT A CLEARANCE OR LEGAL OPINION',
    footer: `${PH}Creator Record {record_id}`,
    page_label: 'Page {page} of {pages}',
    sections: {
      about: {
        heading: `${PH}1. About this record`,
        intro: [`${PH}This record sets out what you told us about your project, with educational guidance where SI8 has published it.`, `${PH}It is self-declared. No documents were examined. It is not a clearance or legal opinion.`],
        counts: { answers: { one: `${PH}{n} answer recorded.`, other: `${PH}{n} answers recorded.` }, guidance: { one: `${PH}{n} guidance item.`, other: `${PH}{n} guidance items.` }, open_items: { one: `${PH}{n} open item.`, other: `${PH}{n} open items.` } },
      },
      project: { heading: `${PH}2. Your project and intended use`, intro: `${PH}As you told us.`, empty: `${PH}Nothing recorded.` },
      tools: { heading: `${PH}3. Tools and plans`, intro: `${PH}The tools you told us you used.`, tool_heading: `${PH}Tool {n}`, empty: `${PH}No tools recorded.` },
      contribution: { heading: `${PH}4. People, materials and your contribution`, intro: `${PH}As you told us. SI8 has not assessed these answers.`, empty: `${PH}Nothing recorded.` },
      guidance: {
        heading: `${PH}5. Commercial-use guidance`, intro: `${PH}Educational guidance selected from your own answers. SI8 has not checked them.`, empty: `${PH}No published guidance matches your answers yet.`,
        item_heading: `${PH}Guidance {index}: {subject}`, subject_with_tool: '{topic} (tool {n})', conclusion: `${PH}How this reads`, selected_because: `${PH}Selected because you told us`, on_what_you_told_us: `${PH}On what you told us`,
        depends_on: `${PH}This depends on information not established`, unspecified_condition: `${PH}This record does not list the specific information this depends on.`, caveats: `${PH}Please note`,
        item_limitation: `${PH}This describes published terms. It does not confirm your plan, your account or that your use is covered.`,
        topic_level: `${PH}Its own conditions match your answers; it is qualified because the topic as a whole depends on information not established.`,
      },
      open_items: {
        heading: `${PH}6. Open items and limitations`, intro: `${PH}What this record does not establish.`, empty: `${PH}No open items.`, item_ref: `${PH}Guidance {index}`, for_guidance: `${PH}For`,
        not_established_heading: `${PH}Information not established`, affects: `${PH}Affects guidance {items}`, unspecified_heading: `${PH}Guidance that depends on information not listed in this record`,
        topic_qualified_heading: `${PH}Guidance qualified at topic level`,
        what_you_told_us: `${PH}What you told us`, nothing_told: `${PH}Nothing recorded`, evidence_note: `${PH}Evidence that would help`, status: `${PH}Status`, sufficiency: `${PH}Evidence`,
        not_sure_heading: `${PH}Questions you answered "Not sure"`, documents_heading: `${PH}Documents`, documents_not_provided: `${PH}No documents were provided or examined.`,
        limitations_heading: `${PH}Limitations`, limitations: [`${PH}Guidance appears only where SI8 has published it for what you told us. Where a tool or topic has none, this record says nothing about it.`],
      },
      not_done: { heading: `${PH}7. What SI8 did not do, and Commercial Assurance`, lines: [`${PH}SI8 did not review your video, documents or agreements.`, `${PH}A human-reviewed SI8 Commercial Assurance Assessment is a separate service.`] },
      provenance: {
        heading: `${PH}8. Declarations and provenance`, acknowledgements_heading: `${PH}What you acknowledged`, identity_heading: `${PH}Record`, sources_heading: `${PH}Sources`, publications_heading: `${PH}Guidance sources`,
        labels: {
          record_id: `${PH}Record id`, issued_on: `${PH}Issued on`, prepared_ref: `${PH}Preparation reference`, record_version: `${PH}Record version`, prepared_on: `${PH}Prepared on`, captured_at: `${PH}Answers captured at`, snapshot: `${PH}Snapshot SHA-256`,
          record_schema: `${PH}Record schema`, record_schema_version: `${PH}Record schema version`, builder: `${PH}Builder`, builder_version: `${PH}Builder version`, registry_version: `${PH}Question registry`, ledger_version: `${PH}Publication ledger`,
          wording: `${PH}Questionnaire wording`, wording_version: `${PH}Wording version`, wording_digest: `${PH}Wording digest`,
          templates: `${PH}PDF templates`, templates_version: `${PH}Template version`, templates_fingerprint: `${PH}Template fingerprint`,
          publication_version: `${PH}Entry version`,
        },
      },
    },
    question_sections,
    conclusion_labels: { relevant_on_declared_facts: `${PH}Relevant on what you told us`, relevant_applicability_unresolved: `${PH}Relevant, depending on information not established` },
    topic_labels: { commercial_use: `${PH}Commercial use of your AI tools`, third_party_source_rights: `${PH}Third-party source material` },
    fact_labels: Object.fromEntries(APPLICABILITY_FACTS.map((f) => [f, `${PH}${f.replace(/_/g, ' ')}`])),
    not_sure_label: `${PH}Not sure`,
    dependency_codes: { status: { open: `${PH}Open` }, sufficiency: { not_assessed: `${PH}Not assessed` } },
  }
}
const approvalOf = (t: unknown, over: Partial<PdfTemplateApproval> = {}): PdfTemplateApproval => ({
  template_id: CUSTOMER_PDF_TEMPLATE_ID, version: 1, fingerprint: templateFingerprint(t), record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
  lifecycle: 'approved', authority: 'SYNTHETIC TEMPLATE AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEMPLATE-REVIEW-1', ...over,
})
function docInput(over: Partial<CustomerDocumentInput> = {}, rec = prepare()): CustomerDocumentInput {
  const templates = over.templates ?? placeholderTemplates()
  return { canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates, template_approval: approvalOf(templates), ...over }
}
const refusal = (f: () => unknown): string => {
  try {
    f()
  } catch (err) {
    if (err instanceof CustomerPdfRefusal) return err.code
    throw err
  }
  throw new Error('expected a refusal')
}
const reseal = (rec: ReturnType<typeof prepare>, f: (r: any) => void) => {
  const r = clone(rec.record) as any
  f(r)
  const c = canonicalJson(r)
  return { ...rec, canonical: c, sha256: sha256Hex(c) }
}
const allBlocks = (m: ReturnType<typeof buildCustomerDocument>): Block[] => m.sections.flatMap((s) => s.blocks)

// ───────────────────────────────────────────── the model

describe('the document model', () => {
  test('has the eight sections in order, the issuance identity and the template identity', () => {
    const rec = prepare()
    const t = placeholderTemplates()
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    expect(m.sections.map((s) => s.id)).toEqual([...CUSTOMER_PDF_SECTIONS])
    expect(m.identity).toEqual({ record_id: ISSUED.record_id, issued_on: ISSUED.issued_on, record_ref: RECORD.record_id, snapshot_sha256: rec.sha256, templates: { id: CUSTOMER_PDF_TEMPLATE_ID, version: 1, fingerprint: templateFingerprint(t) } })
    expect(m.marking.record_id).toBe(ISSUED.record_id)
    expect(m.marking.stamp).toBe(t.stamp)
  })

  test('identical inputs give an identical model', () => {
    const rec = prepare()
    expect(documentModelCanonical(buildCustomerDocument(docInput({}, rec)))).toBe(documentModelCanonical(buildCustomerDocument(docInput({}, rec))))
  })

  test('every statement is the record verbatim, the issuance identity, or a template with only counts or record values in its slots', () => {
    const rec = prepare({ state: { ...state('not_sure'), tools: [state('not_sure').tools[0], { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] } })
    const t = placeholderTemplates()
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    const recordStrings = new Set<string>()
    const collect = (v: unknown) => {
      if (typeof v === 'string') recordStrings.add(v)
      else if (typeof v === 'number') recordStrings.add(String(v))
      else if (Array.isArray(v)) v.forEach(collect)
      else if (v && typeof v === 'object') Object.values(v).forEach(collect)
    }
    collect(rec.record)
    recordStrings.add(rec.sha256)
    const templateStrings: string[] = []
    const collectT = (v: unknown) => {
      if (typeof v === 'string') templateStrings.push(v)
      else if (Array.isArray(v)) v.forEach(collectT)
      else if (v && typeof v === 'object') Object.values(v).forEach(collectT)
    }
    collectT(t)
    templateStrings.push(templateFingerprint(t), '1')
    const patterns = templateStrings.map((x) => new RegExp(`^${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[a-z_]+\\\}/g, '.+')}$`))
    const ok = (text: string, from: string) =>
      from === 'record' ? recordStrings.has(text) : from === 'issuance' ? text === ISSUED.record_id || text === ISSUED.issued_on : patterns.some((p) => p.test(text))
    for (const b of allBlocks(m)) {
      if (b.kind === 'row') {
        expect([b.label, b.label_from, ok(b.label, b.label_from)]).toEqual([b.label, b.label_from, true])
        expect([b.value, b.value_from, ok(b.value, b.value_from)]).toEqual([b.value, b.value_from, true])
      } else expect([b.text, b.from, ok(b.text, b.from)]).toEqual([b.text, b.from, true])
    }
  })

  test('creator declarations, governed guidance, open matters and limitations are in separate sections', () => {
    const rec = prepare({ state: state('not_sure') })
    const m = buildCustomerDocument(docInput({}, rec))
    const textOf = (id: string) => m.sections.find((s) => s.id === id)!.blocks.map((b) => (b.kind === 'row' ? `${b.label} ${b.value}` : b.text)).join('\n')
    for (const i of rec.record.guidance.items) {
      expect(textOf('guidance')).toContain(i.explanation)
      for (const id of ['project', 'tools', 'contribution', 'open_items', 'provenance']) expect(textOf(id)).not.toContain(i.explanation)
    }
    expect(textOf('tools')).toContain(rec.record.declarations.answers.find((a) => a.tool_index === 0)!.question)
    expect(textOf('guidance')).not.toContain('No documents were provided or examined')
    expect(textOf('open_items')).toContain('No documents were provided or examined.')
    for (const a of rec.record.declarations.acknowledgements) expect(textOf('provenance')).toContain(a.text)
  })

  test('no new conclusion: each guidance item shows exactly the approved label of its own code, in record order', () => {
    const t = placeholderTemplates()
    for (const plan of ['Pro', 'Standard', 'not_sure']) {
      const rec = prepare({ state: state(plan) })
      const m = buildCustomerDocument(docInput({ templates: t }, rec))
      const shown = m.sections.find((s) => s.id === 'guidance')!.blocks.filter((b): b is Extract<Block, { kind: 'row' }> => b.kind === 'row' && b.label === t.sections.guidance.conclusion).map((b) => b.value)
      expect(shown).toEqual(rec.record.guidance.items.map((i) => t.conclusion_labels[i.conclusion]))
    }
  })

  test('"Not sure" answers are listed as open, and documents are shown as not provided, never inferred', () => {
    const rec = prepare({ state: state('not_sure') })
    const m = buildCustomerDocument(docInput({}, rec))
    const open = m.sections.find((s) => s.id === 'open_items')!.blocks
    const ns = rec.record.declarations.answers.filter((a) => a.values.some((v) => v.kind === 'not_sure'))
    expect(ns.length).toBeGreaterThan(0)
    for (const a of ns) expect(open.some((b) => b.kind === 'bullet' && b.text === a.question)).toBe(true)
    expect(documentText(m).join('\n')).not.toMatch(/\.pdf|\.png|file name|fingerprint of your/i)
  })

  test('a declarations-only record prints no guidance and no guidance sources', () => {
    const sources = { ...approvedSources(), ledger: [] }
    const rec = prepare({ sources })
    const t = placeholderTemplates()
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    expect(m.sections.find((s) => s.id === 'guidance')!.blocks.map((b) => (b.kind === 'row' ? b.value : b.text))).toContain(t.sections.guidance.empty)
    expect(documentText(m)).not.toContain(t.sections.provenance.publications_heading)
  })
})

// ───────────────────────────────────────────── fail closed

describe('the record is verified before anything is read, and every unknown fails closed', () => {
  const throwing = new Proxy({}, { get: () => { throw new Error('templates read') } })

  test.each([
    ['tampered text', (r: ReturnType<typeof prepare>) => ({ ...r, canonical: r.canonical.replace('CR-V2-2B synthetic video', 'CR-V2-2B synthetic videO') })],
    ['a wrong digest', (r: ReturnType<typeof prepare>) => ({ ...r, sha256: '0'.repeat(64) })],
    ['an older schema', (r: ReturnType<typeof prepare>) => reseal(r, (x) => { x.schema_version = 2 })],
  ])('%s → record_invalid, templates never read', (_, corrupt) => {
    const rec = corrupt(prepare())
    expect(refusal(() => buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: throwing, template_approval: null }))).toBe('record_invalid')
  })

  test.each([
    ['an unknown conclusion code', (x: any) => { x.guidance.items[0].conclusion = 'cleared_for_commercial_use' }],
    ['an unknown field on a guidance item', (x: any) => { x.guidance.items[0].commercial_status = 'ok' }],
    ['a missing field', (x: any) => { delete x.guidance.items[0].explanation }],
    ['a document state other than not provided', (x: any) => { x.documents.status = 'provided' }],
    ['comparisons enabled', (x: any) => { x.comparison.policy = 'enabled' }],
    ['generated text', (x: any) => { x.content.generated_text = 'some' }],
    ['an unknown answer value kind', (x: any) => { x.declarations.answers[0].values[0].kind = 'inferred' }],
    ['a dependency status other than open', (x: any) => { if (x.guidance.items[0].dependency_rows.length === 0) x.guidance.items[0].dependency_rows.push({ dependency_id: 'd', label: 'L', declarations: [], evidence_note: null, evidence_requirement: 'not_defined_by_governance', treated_as: 'evidence_required', sufficiency: 'not_assessed', status: 'open' }); x.guidance.items[0].dependency_rows[0].status = 'met' }],
  ])('%s → record_unsupported', (_, f) => {
    const rec = reseal(prepare({ state: state('Standard') }), f)
    expect(refusal(() => buildCustomerDocument(docInput({}, rec)))).toBe('record_unsupported')
  })

  test('an unlabelled topic, fact or unmapped question refuses (no fallback text)', () => {
    const rec = prepare({ state: state('not_sure') })
    expect(refusal(() => buildCustomerDocument(docInput({}, reseal(rec, (x) => { x.guidance.items[0].provenance.objective.topic = 'new_topic' }))))).toBe('topic_unlabelled')
    const facts = rec.record.guidance.items.flatMap((i) => i.applicability.material_unresolved.map((q) => q.fact))
    expect(facts.length).toBeGreaterThan(0)
    const noFact = placeholderTemplates()
    delete noFact.fact_labels[facts[0]]
    expect(refusal(() => buildCustomerDocument(docInput({ templates: noFact }, rec)))).toBe('fact_unlabelled')
    const unmapped = placeholderTemplates()
    delete unmapped.question_sections.P1
    expect(refusal(() => buildCustomerDocument(docInput({ templates: unmapped }, rec)))).toBe('question_section_unmapped')
  })

  test.each([
    [{ record_id: 'PREP-CRV22BTEST', issued_on: '2026-11-02' }, 'issued_record_id_invalid'],
    [{ record_id: 'cr-2026-3f2a9c10', issued_on: '2026-11-02' }, 'issued_record_id_invalid'],
    [{ record_id: 'CR-2026-3F2A9C10', issued_on: '2026-10-30' }, 'issued_on_invalid'],
    [{ record_id: 'CR-2026-3F2A9C10', issued_on: '02/11/2026' }, 'issued_on_invalid'],
  ])('issuance identity %j → %s', (issued, code) => {
    expect(refusal(() => buildCustomerDocument(docInput({ issued })))).toBe(code)
  })
})

// ───────────────────────────────────────────── template approval

describe('template approval: exactly the approved, fingerprinted set, separate from the questionnaire wording', () => {
  test.each([
    ['a changed template string under the old approval', () => { const t = placeholderTemplates(); const a = approvalOf(t); t.sections.about.heading += ' (edited)'; return docInput({ templates: t, template_approval: a }) }, 'templates_fingerprint_mismatch'],
    ['no approval', () => docInput({ template_approval: null }), 'templates_approval_missing'],
    ['a pending approval', () => { const t = placeholderTemplates(); return docInput({ templates: t, template_approval: approvalOf(t, { lifecycle: 'pending' }) }) }, 'templates_approval_not_approved'],
    ['a withdrawn approval', () => { const t = placeholderTemplates(); return docInput({ templates: t, template_approval: approvalOf(t, { lifecycle: 'withdrawn' }) }) }, 'templates_approval_withdrawn'],
    ['a superseded approval', () => { const t = placeholderTemplates(); return docInput({ templates: t, template_approval: approvalOf(t, { lifecycle: 'superseded' }) }) }, 'templates_approval_superseded'],
    ['a pilot-marked authority', () => { const t = placeholderTemplates(); return docInput({ templates: t, template_approval: approvalOf(t, { authority: 'PILOT-UAT — not a governance approval' }) }) }, 'templates_pilot_marker'],
    ['another template version', () => { const t = placeholderTemplates(); return docInput({ templates: t, template_approval: approvalOf(t, { version: 2 }) }) }, 'templates_approval_identity_mismatch'],
    ['another record schema', () => { const t = placeholderTemplates(); return docInput({ templates: t, template_approval: approvalOf(t, { record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: 2 } }) }) }, 'templates_schema_mismatch'],
    ['a missing template key', () => { const t = placeholderTemplates() as any; delete t.sections.not_done; return docInput({ templates: t, template_approval: approvalOf(t) }) }, 'templates_templates_malformed'],
    ['an extra template key', () => { const t = placeholderTemplates() as any; t.sections.guidance.verdict = 'Safe to use'; return docInput({ templates: t, template_approval: approvalOf(t) }) }, 'templates_templates_malformed'],
    ['a conclusion code without a label', () => { const t = placeholderTemplates() as any; delete t.conclusion_labels.relevant_on_declared_facts; return docInput({ templates: t, template_approval: approvalOf(t) }) }, 'templates_templates_malformed'],
    ['an extra conclusion label', () => { const t = placeholderTemplates() as any; t.conclusion_labels.cleared = 'Cleared'; return docInput({ templates: t, template_approval: approvalOf(t) }) }, 'templates_templates_malformed'],
    ['approved templates that break the wording lock', () => { const t = placeholderTemplates(); t.stamp = 'CREATOR RECORD · CERTIFIED'; return docInput({ templates: t, template_approval: approvalOf(t) }) }, 'templates_wording_lock'],
    ['a template slot with no value', () => { const t = placeholderTemplates(); t.sections.tools.tool_heading = 'Tool {n} of {total}'; return docInput({ templates: t, template_approval: approvalOf(t) }) }, 'templates_unusable'],
  ])('%s → %s', (_, make, code) => {
    expect(refusal(() => buildCustomerDocument(make()))).toBe(code)
  })

  test('a template change never touches a prepared record: digest and issuance eligibility are unchanged', () => {
    const rec = prepare()
    const before = rec.sha256
    const t2 = placeholderTemplates()
    t2.version = 2
    t2.sections.about.heading = `${PH}1. About your record`
    const m = buildCustomerDocument(docInput({ templates: t2, template_approval: approvalOf(t2, { version: 2 }) }, rec))
    expect(m.identity.templates.version).toBe(2)
    expect(rec.sha256).toBe(before)
    const sources = approvedSources()
    const g = governanceSnapshotFrom({ issuance_date: '2026-11-02', sources, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [textApproval(sources)] })
    expect(evaluateIssuanceEligibility(rec.canonical, rec.sha256, g).decision).toBe('eligible')
  })

  test('the wording lock: banned terms are caught, the two negation and provenance exceptions are not', () => {
    const t = placeholderTemplates()
    expect(wordingLockViolations(t)).toEqual([])
    const bad = clone(t)
    bad.sections.not_done.lines = ['Your video is cleared.', 'This is approved.', 'You are licensed to use it.', 'It is safe to publish.', 'This applies to you.', 'Verified by SI8.', 'Compliant with the EU AI Act.']
    expect(wordingLockViolations(bad)).toHaveLength(7)
    const fine = clone(t)
    fine.sections.not_done.lines = ['This is not a clearance or legal opinion.', 'Guidance approved for Creator Records only.']
    expect(wordingLockViolations(fine)).toEqual([])
    const dep = clone(t)
    dep.dependency_codes.status.open = 'Met'
    expect(wordingLockViolations(dep)).toEqual(['dependency_codes.status.open'])
  })
})

// ───────────────────────────────────────────── CR-V2-2C presentation hardening

describe('guidance numbering and open conditions', () => {
  const materials = () => ({ ...state('Pro'), answers: { ...ANS, M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['yes'] } })
  const twoToolsNotSure = () => ({ ...state('not_sure'), tools: [state('not_sure').tools[0], { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] })
  const section = (m: ReturnType<typeof buildCustomerDocument>, id: string) => m.sections.find((s) => s.id === id)!.blocks
  const rows = (blocks: Block[]) => blocks.filter((b): b is Extract<Block, { kind: 'row' }> => b.kind === 'row')

  const itemTexts = (m: ReturnType<typeof buildCustomerDocument>, n: number) => {
    const g = section(m, 'guidance')
    const start = g.findIndex((b) => b.kind === 'subheading' && b.text.startsWith(`${PH}Guidance ${n}: `))
    const next = g.findIndex((b, i) => i > start && b.kind === 'subheading' && /^\[Placeholder\] Guidance \d+: /.test(b.text))
    return g.slice(start, next < 0 ? undefined : next).map((b) => (b.kind === 'row' ? `${b.label} ${b.value}` : b.text))
  }

  test('every guidance item is numbered in record order, and open conditions point to that number', () => {
    const t = placeholderTemplates()
    const rec = prepare({ state: materials() })
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    const headings = section(m, 'guidance').filter((b) => b.kind === 'subheading').map((b) => (b as { text: string }).text)
    expect(headings.map((h) => /^\[Placeholder\] Guidance (\d+): /.exec(h)?.[1])).toEqual(rec.record.guidance.items.map((_, n) => String(n + 1)))
    const forRows = rows(section(m, 'open_items')).filter((b) => b.label === t.sections.open_items.for_guidance).map((b) => b.value)
    const expected = rec.record.guidance.items.flatMap((i, n) => i.dependency_rows.map(() => `${PH}Guidance ${n + 1}`))
    expect(forRows).toEqual(expected)
    expect(expected.length).toBe(4)
  })

  // CR-V2-2I: expected classification, computed independently from the record.
  const classify = (items: CustomerRecordV2['guidance']['items']) => {
    const qualified: number[] = []
    const unspecified: number[] = []
    items.forEach((i, n) => {
      if (i.conclusion !== 'relevant_applicability_unresolved') return
      const bi = i.provenance.bounded_interpretation
      const topic = i.applicability.status === 'met' && i.dependency_rows.length === 0 && bi.citation === 'supporting' && bi.status === 'relevant_applicability_unresolved'
      if (topic) qualified.push(n + 1)
      const own = i.applicability.material_unresolved.length > 0 || i.dependency_rows.length > 0
      if ((i.applicability.status === 'unresolved' && i.applicability.material_unresolved.length === 0) || (!own && !topic)) unspecified.push(n + 1)
    })
    return { qualified, unspecified }
  }

  test('section 6 lists every open condition, nothing is dropped, and the count is the number of entries listed', () => {
    const t = placeholderTemplates()
    for (const st of [state('Pro'), twoToolsNotSure(), materials()]) {
      const rec = prepare({ state: st })
      const m = buildCustomerDocument(docInput({ templates: t }, rec))
      const open = section(m, 'open_items')
      const items = rec.record.guidance.items
      const deps = items.reduce((n, i) => n + i.dependency_rows.length, 0)
      const facts = new Set(items.flatMap((i) => i.applicability.material_unresolved.map((q) => `${q.fact}|${q.tool ?? ''}`)))
      const { qualified, unspecified } = classify(items)
      const notSure = rec.record.declarations.answers.filter((a) => a.values.some((v) => v.kind === 'not_sure'))
      for (const i of items) for (const d of i.dependency_rows) expect(open.some((b) => b.kind === 'subheading' && b.text === d.label)).toBe(true)
      const factRows = rows(open).filter((b) => b.value.startsWith(`${PH}Affects guidance `))
      expect(factRows).toHaveLength(facts.size)
      for (const [n, i] of items.entries()) {
        for (const q of i.applicability.material_unresolved) {
          expect(factRows.some((r) => r.label === t.fact_labels[q.fact] && r.value.replace(`${PH}Affects guidance `, '').split(', ').includes(String(n + 1)))).toBe(true)
        }
      }
      for (const n of qualified) expect(open.some((b) => b.kind === 'bullet' && b.text === `${PH}Guidance ${n}`)).toBe(true)
      for (const n of unspecified) expect(open.some((b) => b.kind === 'bullet' && b.text === `${PH}Guidance ${n}`)).toBe(true)
      expect(section(m, 'guidance').filter((b) => b.kind === 'paragraph' && b.text === t.sections.guidance.unspecified_condition)).toHaveLength(unspecified.length)
      const total = deps + facts.size + qualified.length + unspecified.length + notSure.length
      const counts = t.sections.about.counts.open_items
      expect(section(m, 'about')).toContainEqual({ kind: 'paragraph', text: fill(total === 1 ? counts.one : counts.other, { n: total }), from: 'template' })
      expect(open.some((b) => b.kind === 'paragraph' && b.text === t.sections.open_items.empty)).toBe(total === 0)
    }
  })

  test('the fixture families exercise every kind of open condition', () => {
    const kinds = new Set<string>()
    for (const st of [twoToolsNotSure(), materials()]) {
      const rec = prepare({ state: st })
      const { qualified } = classify(rec.record.guidance.items)
      for (const i of rec.record.guidance.items) {
        if (i.dependency_rows.length > 0) kinds.add('dependency')
        if (i.applicability.material_unresolved.length > 0) kinds.add('not_established')
      }
      if (qualified.length > 0) kinds.add('topic_qualified')
      if (rec.record.declarations.answers.some((a) => a.values.some((v) => v.kind === 'not_sure'))) kinds.add('not_sure')
    }
    expect(kinds).toEqual(new Set(['dependency', 'not_established', 'topic_qualified', 'not_sure']))
  })

  // CR-V2-2I: the record does not establish which inputs produced a topic-level status, so no item is named as its cause.
  const dropClaims = (rec: ReturnType<typeof prepare>, ids: string[]) => {
    const out = reseal(rec, (r) => {
      r.guidance.items = r.guidance.items.filter((i: any) => !ids.includes(i.claim_id))
      r.sources.publications = r.sources.publications.filter((p: any) => !ids.includes(p.claim_id))
    })
    return { ...out, record: JSON.parse(out.canonical) as CustomerRecordV2 }
  }
  const topicPrefix = (t: CustomerPdfTemplates) => t.sections.guidance.topic_level
  const namesAnotherItem = (texts: string[], self: number) => texts.some((x) => /Guidance \d+/.test(x) && !x.startsWith(`${PH}Guidance ${self}: `))

  test('R3: guidance whose own conditions are met is explained at topic level, naming no other item', () => {
    const t = placeholderTemplates()
    const withKling = (s: CreatorRecordFormState) => ({ ...s, tools: [...s.tools, { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] })
    for (const st of [withKling(state('Pro')), twoToolsNotSure(), withKling(materials())]) {
      const rec = prepare({ state: st })
      const items = rec.record.guidance.items
      const m = buildCustomerDocument(docInput({ templates: t }, rec))
      const { qualified } = classify(items)
      expect(qualified.length).toBeGreaterThan(0)
      for (const n of qualified) {
        const item = items[n - 1]
        // The conclusion is unchanged (still the topic-level ceiling); only its explanation is accurate.
        expect(item.conclusion).toBe('relevant_applicability_unresolved')
        expect(item.applicability.status).toBe('met')
        expect(itemTexts(m, n)).toContain(topicPrefix(t))
        expect(itemTexts(m, n)).not.toContain(t.sections.guidance.unspecified_condition)
        expect(namesAnotherItem(itemTexts(m, n), n)).toBe(false)
      }
    }
  })

  test('the explanation does not depend on which other items of the topic are in the record', () => {
    const t = placeholderTemplates()
    const MEMBER = 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1'
    const base = prepare({ state: twoToolsNotSure() })
    // The cause can be absent from the record (e.g. omitted after interpretation); the remaining items read the same.
    for (const rec of [base, dropClaims(base, [MEMBER])]) {
      const m = buildCustomerDocument(docInput({ templates: t }, rec))
      const n = rec.record.guidance.items.findIndex((i) => i.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1') + 1
      expect(itemTexts(m, n)).toContain(topicPrefix(t))
      expect(itemTexts(m, n)).not.toContain(t.sections.guidance.unspecified_condition)
    }
    const only = dropClaims(prepare({ state: { ...state('Pro'), tools: [{ T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] } }), [MEMBER])
    const m = buildCustomerDocument(docInput({ templates: t }, only))
    expect(only.record.guidance.items[0].provenance.bounded_interpretation.status).toBe('relevant_applicability_unresolved')
    expect(itemTexts(m, 1)).toContain(topicPrefix(t))
  })

  test('a condition genuinely not represented in the record is still said to be not listed', () => {
    const t = placeholderTemplates()
    // Applicability unresolved with no material fact (e.g. conflicting declared values): the item's own condition is not listed.
    const sealed = reseal(prepare({ state: { ...state('Pro'), tools: [{ T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }] } }), (r) => {
      const i = r.guidance.items.find((x: any) => x.claim_id === 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1')
      i.applicability = { status: 'unresolved', material_unresolved: [] }
    })
    const rec = { ...sealed, record: JSON.parse(sealed.canonical) as CustomerRecordV2 }
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    const n = rec.record.guidance.items.findIndex((i) => i.claim_id === 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1') + 1
    expect(itemTexts(m, n)).toContain(t.sections.guidance.unspecified_condition)
    expect(itemTexts(m, n)).not.toContain(topicPrefix(t))
    expect(section(m, 'open_items').some((b) => b.kind === 'bullet' && b.text === `${PH}Guidance ${n}`)).toBe(true)
    // Listed dependencies do not hide an applicability condition that is itself not listed.
    const GETTY = 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1'
    const sealed2 = reseal(prepare({ state: materials() }), (r) => {
      const i = r.guidance.items.find((x: any) => x.claim_id === GETTY)
      i.applicability = { status: 'unresolved', material_unresolved: [] }
    })
    const rec2 = { ...sealed2, record: JSON.parse(sealed2.canonical) as CustomerRecordV2 }
    const k = rec2.record.guidance.items.findIndex((i) => i.claim_id === GETTY) + 1
    expect(rec2.record.guidance.items[k - 1].dependency_rows.length).toBeGreaterThan(0)
    expect(itemTexts(buildCustomerDocument(docInput({ templates: t }, rec2)), k)).toContain(t.sections.guidance.unspecified_condition)
  })

  test('every guidance explanation is followed by the limitation line', () => {
    const t = placeholderTemplates()
    for (const st of [state('Pro'), twoToolsNotSure(), materials()]) {
      const rec = prepare({ state: st })
      const g = section(buildCustomerDocument(docInput({ templates: t }, rec)), 'guidance')
      for (const item of rec.record.guidance.items) {
        const at = g.findIndex((b) => b.kind === 'paragraph' && b.text === item.explanation)
        expect(g[at + 1]).toEqual({ kind: 'paragraph', text: t.sections.guidance.item_limitation, from: 'template' })
      }
    }
  })

  test('no approver name or internal ledger identifier is printed; both stay in the verified record', () => {
    const rec = prepare({ state: materials() })
    const text = documentText(buildCustomerDocument(docInput({}, rec))).join('\n')
    const hidden = [rec.record.sources.source_text.authority, ...rec.record.sources.publications.flatMap((p) => [p.entry_id, p.approver, p.claim_id]), ...rec.record.guidance.items.map((i) => i.claim_id)]
    for (const h of hidden) expect([h, text.includes(h)]).toEqual([h, false])
    expect(rec.record.sources.source_text.authority.length).toBeGreaterThan(0)
    expect(rec.record.sources.publications.every((p) => p.entry_id && p.approver)).toBe(true)
  })

  // CR-V2-MVP-M1 (PM direction 9): no future re-check date is shown as a review date, and no unverified
  // "last reviewed" date is printed until one is defined as authoritative. The dates stay in the verified record.
  test('the customer PDF prints no review, re-check or decision date for guidance', () => {
    for (const st of [state('Pro'), materials()]) {
      const rec = prepare({ state: st })
      const text = documentText(buildCustomerDocument(docInput({}, rec))).join('\n')
      const dates = new Set(rec.record.sources.publications.flatMap((p) => [p.refresh_by, p.decision_date, p.claim_last_verified]))
      expect(dates.size).toBeGreaterThan(0)
      for (const d of Array.from(dates)) expect([d, text.includes(d)]).toEqual([d, false])
    }
    expect(Object.keys(placeholderTemplates().sections.provenance.labels)).not.toContain('publication_next_review')
  })

  test('dependencies are never shown as resolved: only the approved open and not-assessed labels are used', () => {
    const t = placeholderTemplates()
    const rec = prepare({ state: materials() })
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    const statusValues = rows(section(m, 'open_items')).filter((b) => b.label === t.sections.open_items.status || b.label === t.sections.open_items.sufficiency).map((b) => b.value)
    expect(new Set(statusValues)).toEqual(new Set([t.dependency_codes.status.open, t.dependency_codes.sufficiency.not_assessed]))
    expect(documentText(m).join('\n')).not.toMatch(/\b(resolved|satisfied|confirmed|met)\b/i)
  })

  test('page numbering: the page style sets no line height (a page-level line height stops the page number being drawn)', () => {
    const src = readFileSync(path.resolve(__dirname, '../../lib/creator-record/customer-pdf/CustomerRecordPDF.tsx'), 'utf8')
    const pageStyle = /\n  page: \{([^}]*)\}/.exec(src)?.[1] ?? ''
    expect(pageStyle).toMatch(/paddingTop/)
    expect(pageStyle).not.toMatch(/lineHeight/)
    expect(src).toMatch(/style=\{s\.pageNumber\} fixed render=/)
  })
})

// ───────────────────────────────────────────── CR-V2-2E selection provenance in the PDF

describe('selection basis in the customer PDF', () => {
  const materials = () => ({ ...state('Pro'), answers: { ...ANS, M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['yes'] } })
  const itemBlocks = (m: ReturnType<typeof buildCustomerDocument>, n: number) => {
    const g = m.sections.find((s) => s.id === 'guidance')!.blocks
    const start = g.findIndex((b) => b.kind === 'subheading' && b.text.startsWith(`${PH}Guidance ${n}: `))
    const next = g.findIndex((b, i) => i > start && b.kind === 'subheading' && /^\[Placeholder\] Guidance \d+: /.test(b.text))
    return g.slice(start, next < 0 ? undefined : next)
  }

  test('each item shows the declarations it was selected on, verbatim, under its own label, separate from the applicability basis', () => {
    const t = placeholderTemplates()
    const rec = prepare({ state: materials() })
    const m = buildCustomerDocument(docInput({ templates: t }, rec))
    const obs = new Map(rec.record.declarations.observations.map((o) => [o.observation_id, o]))
    rec.record.guidance.items.forEach((item, n) => {
      const blocks = itemBlocks(m, n + 1)
      const at = blocks.findIndex((b) => b.kind === 'label' && b.text === t.sections.guidance.selected_because)
      const cited = item.selection_basis.scopes.flatMap((s) => s.observation_ids)
      expect(at >= 0).toBe(cited.length > 0)
      const rows = blocks.slice(at + 1, at + 1 + cited.length) as Extract<Block, { kind: 'row' }>[]
      expect(rows.map((r) => [r.kind, r.value, r.value_from])).toEqual(cited.map((id) => ['row', obs.get(id)!.answer_verbatim, 'record']))
    })
    const gettyIndex = rec.record.guidance.items.findIndex((i) => i.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1') + 1
    const gettyRows = itemBlocks(m, gettyIndex).filter((b): b is Extract<Block, { kind: 'row' }> => b.kind === 'row' && b.label_from === 'record')
    const m3 = rec.record.declarations.answers.find((a) => a.q_id === 'M3')!
    expect(gettyRows).toContainEqual({ kind: 'row', label: m3.question, label_from: 'record', value: m3.answer_verbatim, value_from: 'record' })
  })

  test('the selection basis never appears as an answer to a dependency', () => {
    const rec = prepare({ state: materials() })
    const t = placeholderTemplates()
    const open = buildCustomerDocument(docInput({ templates: t }, rec)).sections.find((s) => s.id === 'open_items')!.blocks
    const toldUs = open.filter((b, i) => b.kind === 'bullet' && open[i - 1]?.kind === 'label' && (open[i - 1] as { text: string }).text === t.sections.open_items.what_you_told_us)
    expect(toldUs.length).toBeGreaterThan(0)
    for (const b of toldUs) expect(b).toEqual({ kind: 'bullet', text: t.sections.open_items.nothing_told, from: 'template' })
  })

  test('a single cited tool block numbers the heading; two blocks of the same tool do not pick one', () => {
    const one = buildCustomerDocument(docInput({}, prepare({ state: state('Pro') })))
    expect(one.sections.find((s) => s.id === 'guidance')!.blocks.filter((b) => b.kind === 'subheading').map((b) => (b as { text: string }).text)).toEqual([
      `${PH}Guidance 1: ${PH}Commercial use of your AI tools (tool 1)`,
      `${PH}Guidance 2: ${PH}Commercial use of your AI tools (tool 1)`,
    ])
    const twice = prepare({ state: { ...state('Pro'), tools: [state('Pro').tools[0], { T1: ['pika'], T3: ['Standard'], T4: ['May 2026'] }] } })
    const m = buildCustomerDocument(docInput({}, twice))
    const baseline = twice.record.guidance.items.findIndex((i) => i.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1') + 1
    expect((itemBlocks(m, baseline)[0] as { text: string }).text).toBe(`${PH}Guidance ${baseline}: ${PH}Commercial use of your AI tools`)
    expect(itemBlocks(m, baseline).filter((b) => b.kind === 'row' && b.label_from === 'record')).toHaveLength(2)
  })
})

// ───────────────────────────────────────────── no route, no issuance path, no production templates

describe('rendering boundary', () => {
  const APP_ROOT = path.resolve(__dirname, '..', '..')
  const ROOT = path.join(APP_ROOT, 'lib', 'creator-record', 'customer-pdf')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      if (n === 'node_modules' || n === '.next') return []
      const p = path.join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
    })
  const importsOf = (f: string) => Array.from(readFileSync(f, 'utf8').matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)).map((m) => m[1])

  // CR-V2-MVP-M3: reached only through the issuance rules (type-only) and the v2 renderer's lazy production port.
  test('only the v2 issuance path reaches it (exact list): no route, page or payment code imports it', () => {
    const files = [...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components')), ...walk(path.join(APP_ROOT, 'lib'))].filter((f) => !f.startsWith(ROOT))
    const rel = (f: string) => path.relative(APP_ROOT, f).split(path.sep).join('/')
    // CR-V2-MVP-M4B: the publication authority bundle shape (type-only).
    const TYPE_ONLY = ['lib/creator-record/customer-flow/approved-inputs.ts', 'lib/creator-record/customer-flow/purchase.ts', 'lib/creator-record/governed/publication-authority.ts', 'lib/creator-record/governed/sources.ts', 'lib/creator-record/governed/synthetic-test-authority.ts']
    expect(files.filter((f) => importsOf(f).some((i) => i.includes('customer-pdf'))).map(rel).sort()).toEqual(TYPE_ONLY)
    for (const f of TYPE_ONLY) expect(readFileSync(path.join(APP_ROOT, f), 'utf8')).not.toMatch(/^\s*import\s+(?!type\b)[^\n]*customer-pdf/m)
    // The renderer (react-pdf) is loaded lazily, by the production v2 issuance port only.
    const lazy = files.filter((f) => /import\(['"][^'"]*customer-pdf\/CustomerRecordPDF['"]\)/.test(readFileSync(f, 'utf8'))).map(rel)
    expect(lazy).toEqual(['lib/creator-record-flow/production.ts'])
  })

  test('it reads only the verified record and the template contract: no database, Storage, payment, governance or v1 PDF code', () => {
    const targets = new Set(walk(ROOT).flatMap(importsOf))
    expect(Array.from(targets).sort()).toEqual([
      '../contract/compose', '../contract/types', '../customer-record/record', '../integration/objectives', '../record-core/canonical', '../record-core/projection',
      './document-model', './templates', '@react-pdf/renderer', 'react',
    ])
  })

  test('no template set ships with the application (placeholders exist only in tests)', () => {
    for (const v of Object.values(TemplatesModule)) expect(v && typeof v === 'object' && 'stamp' in (v as object)).toBe(false)
    for (const f of walk(ROOT)) expect(readFileSync(f, 'utf8')).not.toMatch(/Placeholder|PLACEHOLDER WORDING/)
  })
})

export type { CustomerRecordV2 }
