/**
 * CR-V2-MVP-INTEGRATION-2 — the MVP integrated assessment (PRD_CREATOR_RECORD_v2_MVP_SCOPE.md §9).
 *
 * Real schema 8 records (real builder, real replay examinations, synthetic test sources). The `integrated_assessment` wording
 * below is a DRAFT for PM review, NOT APPROVED; it is used here under a synthetic test approval only. No database, model or network.
 */
import { buildCustomerDocument, CustomerPdfRefusal, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { templateFingerprint, wordingLockViolations, type CustomerPdfTemplates, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { assessIntegrated, INTEGRATED_ASSESSMENT_METHOD, type IntegratedAssessmentInput } from '@/lib/creator-record/integrated-assessment/assess'
import { CREATOR_RECORD_PDF_TEMPLATE_SETS, CREATOR_RECORD_PDF_TEMPLATES } from '@/lib/creator-record/governed/sources'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { DOCS, schema8Fixture, type Schema8Fixture } from '@/test-support/customer-record-schema8'

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V
const ISSUED = { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }
const PLAN_CLAIM = 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1'

/** DRAFT customer wording (not approved). */
export const DRAFT_INTEGRATED_WORDING = {
  heading: 'How your documents relate to this guidance',
  intro: 'For each requirement this guidance depends on, this shows what you told us and what your linked documents appear to show. SI8 has not checked what a document shows, and a document never changes the guidance above.',
  requirement: 'Requirement',
  unlabelled_requirement: 'A condition this guidance depends on',
  you_told_us: 'What you told us',
  nothing_told: 'You did not tell us anything about this.',
  standing: 'Where this stands',
  standing_labels: { rests_on_declaration: 'Taken from what you told us.', not_established: 'Not established by this record.', open: 'Open.' },
  evidence_labels: {
    no_linked_document: 'No document you uploaded is linked to this tool, so this rests on what you told us alone.',
    not_read_from_documents: 'This is not something SI8 reads from documents, so your documents were not considered for it.',
    evidence_requirement_not_defined: 'SI8 has not defined which document could show this, so your documents were not assessed against it. It remains open.',
  },
  document: 'Document {n}',
  status_labels: {
    not_examined: 'Not examined. Nothing from this document was used.',
    creator_disputed: 'You told us this reading should not be relied on, so SI8 does not rely on it.',
    cannot_establish: 'This document cannot establish this requirement.',
    leaves_uncertainty: 'This document leaves this requirement uncertain.',
    relevant_observation_unverified: 'This document appears to show information relevant to this requirement. SI8 has not checked it.',
  },
  reason: 'Why',
  reason_labels: {
    not_examined: 'The document was not examined.',
    creator_response: 'Your response to this document.',
    examination_failed: 'The document could not be read.',
    reading_not_recoverable: 'The stored reading could not be used exactly as recorded.',
    tool_link_not_established: 'The record does not show which of your tools this document belongs to for this requirement.',
    not_a_billing_document: 'It does not appear to be a receipt or invoice.',
    document_illegible: 'It could not be read clearly.',
    field_not_shown: 'No plan name appears on it.',
    field_unreadable: 'The plan name could not be read.',
    field_ambiguous: 'The plan name is unclear.',
    multiple_plans_shown: 'It shows more than one plan name.',
    plan_text_incomplete: 'The plan name appears cut off.',
    field_present: 'A plan name appears on it.',
  },
  appears_to_show: 'The document appears to show',
  excerpt: 'Where it appears',
  your_response: 'Your response',
  not_compared: 'SI8 did not compare what your documents appear to show with what you told us, and does not say whether they match.',
  method: 'Integrated assessment method, version {version}',
}
const W = DRAFT_INTEGRATED_WORDING

/** The synthetic schema 8 templates plus the DRAFT block, under a synthetic approval of exactly that set. */
function withBlock(): { templates: unknown; approval: PdfTemplateApproval } {
  const t = clone(EXAM_PDF.templates) as unknown as CustomerPdfTemplates & Record<string, unknown>
  t.integrated_assessment = clone(W)
  return { templates: t, approval: { ...EXAM_PDF.approval, fingerprint: templateFingerprint(t) } }
}
const render = (f: Schema8Fixture, tpl: { templates: unknown; approval: PdfTemplateApproval | null }) =>
  buildCustomerDocument({ canonical: f.canonical, sha256: f.sha256, issued: ISSUED, templates: tpl.templates, template_approval: tpl.approval })
const section = (m: CustomerDocumentModel, id: string) => m.sections.find((s) => s.id === id)?.blocks ?? []
const texts = (blocks: Block[]) => blocks.flatMap((b) => (b.kind === 'row' ? [b.label, b.value] : [b.text]))
const assess = (f: Schema8Fixture) => assessIntegrated(f.record as unknown as IntegratedAssessmentInput)
const planRow = (f: Schema8Fixture) => {
  const item = assess(f).items.find((i) => i.claim_id === PLAN_CLAIM)!
  return item.requirements.find((q) => q.requirement.kind === 'applicability' && q.requirement.fact === 'tool_plan_tier')!
}
/** The guidance item's integrated blocks, from its heading to the method line. */
function integratedOf(m: CustomerDocumentModel, claimIndex: number): Block[] {
  const g = section(m, 'guidance')
  const headings = g.map((b, i) => (b.kind === 'subheading' ? i : -1)).filter((i) => i >= 0)
  const from = headings[claimIndex]
  const to = headings[claimIndex + 1] ?? g.length
  const item = g.slice(from, to)
  const at = item.findIndex((b) => b.kind === 'label' && b.text === W.heading)
  return at < 0 ? [] : item.slice(at)
}
const printed = (blocks: Block[]) =>
  blocks.map((b) => (b.kind === 'row' ? `${b.label}: ${b.value}` : b.kind === 'bullet' ? `  - ${b.text}` : b.kind === 'label' ? `[${b.text}]` : b.text)).join('\n')

let BASE: Schema8Fixture
let AMBIG: Schema8Fixture
let DISPUTED: Schema8Fixture
let CANNOT: Schema8Fixture
let NOT_EXAMINED: Schema8Fixture
beforeAll(async () => {
  BASE = await schema8Fixture()
  AMBIG = await schema8Fixture({ docs: [{ tool_index: null }, { tool_index: 0 }] })
  DISPUTED = await schema8Fixture({
    responses: (envelopes, runIds) => {
      const e = envelopes.get(DOCS[0].document_id)!
      const o = e.observations.find((x) => x.field === 'product_or_plan_name')!
      return [{ target: { kind: 'observation', run_id: runIds.get(DOCS[0].document_id)!, observation_id: o.observation_id }, code: 'reading_incorrect' }]
    },
  })
  CANNOT = await schema8Fixture({ docs: [{ fixture_id: 'nonreceipt-abstract-photo' }] })
  NOT_EXAMINED = await schema8Fixture({ docs: [{ tool_index: null }, undefined, { tool_index: 0 }] })
})

describe('the integrated assessment relates observations to governed requirements', () => {
  test('case 1 — a relevant observation connected to the declared-plan requirement, never compared', () => {
    const q = planRow(BASE)
    expect(q.standing).toBe('rests_on_declaration')
    expect(q.declared.map((d) => d.answer_verbatim)).toEqual(['Standard'])
    expect(q.evidence).toBe('documents_considered')
    expect(q.documents).toHaveLength(1)
    const d = q.documents[0]
    expect(d).toMatchObject({ document_id: DOCS[0].document_id, status: 'relevant_observation_unverified', reason: 'field_present' })
    expect(d.observed!.verification).toBe('not_verified')
    // The reading is the examination's own, verbatim, with its observation provenance.
    const env = BASE.envelopes.get(DOCS[0].document_id)!
    const sel = env.observations.find((o) => o.field === 'product_or_plan_name')!
    expect(d.observed!.value).toBe(sel.value)
    expect(d.observed!.observation_ids[0]).toBe(sel.observation_id)
  })

  test('case 2a — an ambiguous observation: a two-plan receipt whose plan reading is ambiguous leaves the requirement uncertain', () => {
    const q = planRow(AMBIG)
    expect(AMBIG.envelopes.get(DOCS[1].document_id)!.observations.find((o) => o.field === 'product_or_plan_name')!.status).toBe('ambiguous')
    expect(q.documents).toEqual([expect.objectContaining({ document_id: DOCS[1].document_id, status: 'leaves_uncertainty', reason: 'field_ambiguous', observed: null })])
  })

  test('case 2b — a disputed observation: the creator\'s response takes precedence over the reading', () => {
    const q = planRow(DISPUTED)
    expect(q.documents).toEqual([expect.objectContaining({ status: 'creator_disputed', reason: 'creator_response', responses: ['reading_incorrect'], observed: null })])
  })

  test('case 3 — the document cannot establish the requirement', () => {
    const q = planRow(CANNOT)
    expect(q.documents).toEqual([expect.objectContaining({ status: 'cannot_establish', reason: 'not_a_billing_document', observed: null })])
  })

  test('a linked document that was not examined contributes nothing', () => {
    expect(planRow(NOT_EXAMINED).documents).toEqual([expect.objectContaining({ document_id: DOCS[2].document_id, status: 'not_examined', observed: null })])
  })

  test('no linked document: the requirement rests on the declaration alone', () => {
    const f = { ...BASE, record: { ...BASE.record, documents: { ...BASE.record.documents, items: BASE.record.documents.items.map((d) => ({ ...d, tool_index: null })) } } }
    expect(planRow(f as Schema8Fixture)).toMatchObject({ evidence: 'no_linked_document', documents: [], linked_document_ids: [] })
  })
})

describe('authority: governed conclusions are unchanged and D10 holds', () => {
  test('the guidance itself is identical whatever the documents show', () => {
    const g = (f: Schema8Fixture) => JSON.stringify(f.record.guidance)
    for (const f of [AMBIG, DISPUTED, CANNOT, NOT_EXAMINED]) expect(g(f)).toBe(g(BASE))
  })

  test('each assessed item carries exactly the composition conclusion, in order', () => {
    for (const f of [BASE, AMBIG, DISPUTED, CANNOT]) {
      const a = assess(f)
      expect(a.method).toEqual(INTEGRATED_ASSESSMENT_METHOD)
      expect(a.items.map((i) => [i.claim_id, i.conclusion])).toEqual(f.record.guidance.items.map((i) => [i.claim_id, i.conclusion]))
    }
  })

  test('D10: the record still withholds every comparison, and the assessment carries no comparison result', () => {
    for (const f of [BASE, AMBIG, DISPUTED, CANNOT]) {
      const c = f.record.comparison as { policy: string; items: { provider: { result: string }; plan: { result: string } }[] }
      expect(c.policy).toBe('derived_per_version')
      for (const x of c.items) expect([x.provider.result, x.plan.result]).toEqual(['not_assessed', 'not_assessed'])
      expect(JSON.stringify(assess(f))).not.toMatch(/consistent|conflict|differs|match/i)
    }
  })

  test('assessIntegrated is pure: the record is not mutated', () => {
    const before = JSON.stringify(BASE.record)
    assess(BASE)
    expect(JSON.stringify(BASE.record)).toBe(before)
  })
})

describe('fail closed', () => {
  test('a reading that no longer maps back exactly is not relied on', () => {
    // (Storage integrity is enforced upstream: a record whose digest does not verify never renders. This is the inversion's own check.)
    const r = clone(BASE.record) as unknown as IntegratedAssessmentInput & { documents: { items: { examination: { envelope: { observations: { field: string }[] } } }[] } }
    const list = r.documents.items[0].examination.envelope.observations
    list.push(clone(list.find((o) => o.field === 'product_or_plan_name')!))
    const q = assessIntegrated(r).items.find((i) => i.claim_id === PLAN_CLAIM)!.requirements[0]
    expect(q.documents[0]).toMatchObject({ status: 'cannot_establish', reason: 'reading_not_recoverable', observed: null })
  })

  const synthetic = (over: Partial<IntegratedAssessmentInput['guidance']['items'][number]>): IntegratedAssessmentInput => {
    const r = clone(BASE.record) as unknown as IntegratedAssessmentInput
    const item = { ...r.guidance.items.find((i) => i.claim_id === PLAN_CLAIM)!, declared_applicability_basis: [], ...over }
    return { ...r, guidance: { items: [item] } }
  }

  test('an unresolved requirement whose tool cannot be attributed to the linked document is cannot_establish', () => {
    const base = synthetic({})
    const scopes = [{ scope: 'tool', matched_ids: ['pika', 'runway-gen3'], observation_ids: base.guidance.items[0].selection_basis.scopes[0].observation_ids }]
    const r = synthetic({ applicability: { status: 'unresolved', material_unresolved: [{ fact: 'tool_plan_tier', tool: 'pika' }] }, selection_basis: { scopes } })
    const q = assessIntegrated(r).items[0].requirements[0]
    expect(q).toMatchObject({ standing: 'not_established', evidence: 'documents_considered' })
    expect(q.documents[0]).toMatchObject({ status: 'cannot_establish', reason: 'tool_link_not_established' })
  })

  test('a fact SI8 does not read from documents is never assessed against them', () => {
    const r = synthetic({ applicability: { status: 'unresolved', material_unresolved: [{ fact: 'jurisdiction', tool: null }] } })
    expect(assessIntegrated(r).items[0].requirements[0]).toMatchObject({ evidence: 'not_read_from_documents', documents: [], standing: 'not_established' })
  })

  test('a governed dependency is never assessed against documents and stays open', () => {
    const r = synthetic({ dependency_rows: [{ dependency_id: 'human_contribution_description', label: 'A description of your contribution', declarations: [] }] })
    const q = assessIntegrated(r).items[0].requirements[0]
    expect(q).toMatchObject({ requirement: { kind: 'dependency' }, standing: 'open', evidence: 'evidence_requirement_not_defined', documents: [] })
    expect(q.linked_document_ids).toEqual([DOCS[0].document_id])
  })
})

describe('customer PDF: integrated inside guidance, inactive until approved wording', () => {
  test('the DRAFT wording passes the wording lock', () => {
    expect(wordingLockViolations(withBlock().templates as CustomerPdfTemplates)).toEqual([])
  })

  test('without the block (every template set shipped today) nothing changes: no integrated text anywhere', () => {
    const m = render(BASE, EXAM_PDF)
    for (const s of m.sections) expect(texts(s.blocks)).not.toContain(W.heading)
    for (const set of CREATOR_RECORD_PDF_TEMPLATE_SETS) expect(Object.prototype.hasOwnProperty.call(set.templates as object, 'integrated_assessment')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(CREATOR_RECORD_PDF_TEMPLATES as object, 'integrated_assessment')).toBe(false)
  })

  test('with the block, the assessment prints inside the plan guidance item, not in the documents section', () => {
    const m = render(BASE, withBlock())
    expect(texts(section(m, 'documents'))).not.toContain(W.heading)
    const plan = integratedOf(m, BASE.record.guidance.items.findIndex((i) => i.claim_id === PLAN_CLAIM))
    expect(texts(plan)).toEqual(expect.arrayContaining([W.heading, W.status_labels.relevant_observation_unverified, W.not_compared]))
    // The item with no requirement prints no integrated block.
    expect(integratedOf(m, BASE.record.guidance.items.findIndex((i) => i.claim_id !== PLAN_CLAIM))).toEqual([])
    // Everything except the creator's answer and the verbatim reading comes from the templates.
    for (const b of plan) {
      if (b.kind === 'row') expect(b.label_from).toBe('template')
      else expect(['template', 'record']).toContain(b.from)
    }
  })

  test('the printed conclusion is the record\'s own for every case', () => {
    for (const f of [BASE, AMBIG, DISPUTED, CANNOT]) {
      const conclusions = (m: CustomerDocumentModel) => texts(section(m, 'guidance')).filter((x) => Object.values((EXAM_PDF.templates as unknown as CustomerPdfTemplates).conclusion_labels).includes(x))
      expect(conclusions(render(f, withBlock()))).toEqual(conclusions(render(f, EXAM_PDF)))
    }
  })

  test('customer-facing examples for the three acceptance cases', () => {
    const at = BASE.record.guidance.items.findIndex((i) => i.claim_id === PLAN_CLAIM)
    const examples = {
      relevant: printed(integratedOf(render(BASE, withBlock()), at)),
      ambiguous: printed(integratedOf(render(AMBIG, withBlock()), at)),
      disputed: printed(integratedOf(render(DISPUTED, withBlock()), at)),
      cannot_establish: printed(integratedOf(render(CANNOT, withBlock()), at)),
    }
    expect(examples.relevant).toContain(W.status_labels.relevant_observation_unverified)
    expect(examples.ambiguous).toContain(W.status_labels.leaves_uncertainty)
    expect(examples.disputed).toContain(W.status_labels.creator_disputed)
    expect(examples.cannot_establish).toContain(W.reason_labels.not_a_billing_document)
    if (process.env.PRINT_INTEGRATED_EXAMPLES) console.log(JSON.stringify(examples, null, 1))
  })

  test('an unresolved plan requirement renders through the PDF from the full verified record', async () => {
    const f = await schema8Fixture({ plan: 'Free' })
    const items = f.record.guidance.items.filter((i) => i.applicability.material_unresolved.some((q) => q.fact === 'tool_plan_tier'))
    expect(items.length).toBeGreaterThan(0)
    const a = assess(f)
    const q = a.items.find((i) => i.claim_id === items[0].claim_id)!.requirements.find((x) => x.standing === 'not_established')!
    expect(q).toMatchObject({ requirement: { kind: 'applicability', fact: 'tool_plan_tier' }, evidence: 'documents_considered' })
    expect(q.declared.map((d) => d.answer_verbatim)).toEqual(['Free'])
    const m = render(f, withBlock())
    const blocks = integratedOf(m, f.record.guidance.items.indexOf(items[0]))
    expect(texts(blocks)).toEqual(expect.arrayContaining([W.standing_labels.not_established, 'Free']))
    if (process.env.PRINT_INTEGRATED_EXAMPLES) console.log(printed(blocks))
  })

  test('a block with an unlabelled code refuses (labels must cover exactly the codes)', () => {
    const t = clone(withBlock().templates) as unknown as { integrated_assessment: { reason_labels: Record<string, string> } }
    delete t.integrated_assessment.reason_labels.field_present
    const approval = { ...EXAM_PDF.approval, fingerprint: templateFingerprint(t) }
    expect(() => render(BASE, { templates: t, approval })).toThrow(CustomerPdfRefusal)
  })
})
