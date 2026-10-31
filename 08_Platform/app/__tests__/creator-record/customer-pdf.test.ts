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
import { CUSTOMER_PDF_SECTIONS, CUSTOMER_PDF_TEMPLATE_ID, templateFingerprint, wordingLockViolations, type CustomerPdfTemplates, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
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
        subject_with_tool: '{topic} (tool {n})', conclusion: `${PH}How this reads`, on_what_you_told_us: `${PH}On what you told us`, depends_on: `${PH}This depends on information not established`, caveats: `${PH}Please note`,
      },
      open_items: {
        heading: `${PH}6. Open items and limitations`, intro: `${PH}What this record does not establish.`, empty: `${PH}No open items.`, for_guidance: `${PH}For`,
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
          wording: `${PH}Questionnaire wording`, wording_version: `${PH}Wording version`, wording_digest: `${PH}Wording digest`, wording_authority: `${PH}Wording authority`, wording_decision_date: `${PH}Wording decision date`,
          templates: `${PH}PDF templates`, templates_version: `${PH}Template version`, templates_fingerprint: `${PH}Template fingerprint`,
          publication: `${PH}Guidance entry`, publication_version: `${PH}Entry version`, publication_next_review: `${PH}Next review by`,
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

  test('nothing in the app imports it: no route, page, payment, fulfilment or issuance path', () => {
    const files = [...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components')), ...walk(path.join(APP_ROOT, 'lib'))].filter((f) => !f.startsWith(ROOT))
    expect(files.filter((f) => importsOf(f).some((i) => i.includes('customer-pdf'))).map((f) => path.relative(APP_ROOT, f))).toEqual([])
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
