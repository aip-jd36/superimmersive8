/**
 * CR-V2-MVP-INTEGRATION-2 — the MVP integrated assessment (PRD_CREATOR_RECORD_v2_MVP_SCOPE.md §9).
 *
 * Real schema 8 records (real builder, real replay examinations, synthetic test sources). The `integrated_assessment` wording
 * (`test-support/integrated-assessment-draft-wording.ts`) is a DRAFT for PM review, NOT APPROVED; it is used here under a synthetic test approval only. No database, model or network.
 */
import { preCutoverLiveSet } from '@/test-support/registered-template-sets'
import { buildCustomerDocument, CustomerPdfRefusal, type Block, type CustomerDocumentModel } from '@/lib/creator-record/customer-pdf/document-model'
import { templateFingerprint, wordingLockViolations, type CustomerPdfTemplates, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { assessIntegrated, INTEGRATED_ASSESSMENT_METHOD, type IntegratedAssessmentInput } from '@/lib/creator-record/integrated-assessment/assess'
import { CREATOR_RECORD_PDF_TEMPLATE_SETS, CREATOR_RECORD_PDF_TEMPLATES } from '@/lib/creator-record/governed/sources'
import { SYNTHETIC_TEST_EXAMINATION_PDF as EXAM_PDF } from '@/lib/creator-record/governed/synthetic-test-authority'
import { DOCS, schema8Fixture, type Schema8Fixture } from '@/test-support/customer-record-schema8'
import { DRAFT_INTEGRATED_WORDING } from '@/test-support/integrated-assessment-draft-wording'

const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V
const ISSUED = { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }
const PLAN_CLAIM = 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1'

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

  test('without the block nothing changes: no integrated text anywhere', () => {
    const m = render(BASE, EXAM_PDF)
    for (const s of m.sections) expect(texts(s.blocks)).not.toContain(W.heading)
    // The schema 7 set never carries it (schema 7 records hold no examinations).
    expect(Object.prototype.hasOwnProperty.call(CREATOR_RECORD_PDF_TEMPLATES as object, 'integrated_assessment')).toBe(false)
  })

  test('CR-V2-MVP-INTEGRATION-4: the governed schema 8 set (version 3) carries exactly the approved wording', () => {
    // CR-V2-MVP-APPROVAL-AND-RELEASE-1: v3 stays registered and unchanged, superseded by v5 (rendered here as it was while live).
    const registered = CREATOR_RECORD_PDF_TEMPLATE_SETS.filter((s) => s.approval.record_schema.version === 8 && s.approval.version === 3)
    expect(registered).toHaveLength(1)
    expect(registered[0].approval).toMatchObject({ version: 3, record_schema: { version: 8 }, lifecycle: 'superseded', review_ref: 'JD-CR-V2-MVP-INTEGRATION-4-20261110' })
    const set = preCutoverLiveSet(8)
    expect((set.templates as Record<string, unknown>).integrated_assessment).toEqual(W)
    expect(templateFingerprint(set.templates)).toBe(set.approval.fingerprint)
    expect(W.not_compared).toBe('SI8 has not determined whether the information read from your documents matches what you told us. This section explains how the document observations relate to the conditions in the guidance above.')
    expect(W.intro.split('\n\n')).toHaveLength(4)
    // Printed as four paragraph blocks directly after the heading, so the heading keeps with the first (`groupHeadings`).
    const m = render(BASE, { templates: set.templates, approval: set.approval })
    const ia = integratedOf(m, BASE.record.guidance.items.findIndex((i) => i.claim_id === PLAN_CLAIM))
    expect(ia.slice(1, 5).map((b) => (b.kind === 'paragraph' ? b.text : null))).toEqual(W.intro.split('\n\n'))
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

describe('CR-V2-MVP-INTEGRATION-3: the proposed wording keeps the required distinctions', () => {
  const all = (o: unknown): string[] => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(all) : [])
  const rowTexts = [...Object.values(W.status_labels), ...Object.values(W.reason_labels), ...Object.values(W.evidence_labels), ...Object.values(W.standing_labels)]

  test('1: automated examination is presented as not an independent check', () => {
    expect(W.intro).toMatch(/automated/i)
    expect(W.intro).toMatch(/does not independently confirm/)
  })

  test('2: a relevant observation is never presented as satisfying the condition', () => {
    expect(W.intro).toMatch(/does not mean a condition has been satisfied/)
    for (const x of [W.status_labels.relevant_observation_unverified, W.reason_labels.field_present]) expect(x).not.toMatch(/\b(satisf|meets|fulfil|proves?|confirm|establish)/i)
  })

  test('3: missing usable evidence is never presented as the document being incapable', () => {
    expect(W.status_labels.cannot_establish).not.toMatch(/\b(cannot|can't|unable|incapable|never)\b/i)
    expect(W.status_labels.cannot_establish).toMatch(/no usable information/i)
    expect(W.intro).toMatch(/may still be useful even when this automated check cannot read/)
  })

  test('4: no wording says or implies that plan names match, conflict or were compared (only that they were not)', () => {
    const texts = all(W).filter((x) => x !== W.not_compared)
    for (const x of texts) expect(x).not.toMatch(/\b(match(es|ed|ing)?|conflict\w*|contradict\w*|consistent|inconsistent|differ\w*|compar\w*|same plan|different plan)\b/i)
    expect(W.not_compared).toMatch(/has not determined whether/)
  })

  test('5: creator corrections are acknowledged and the reading is not used', () => {
    expect(W.status_labels.creator_disputed).toMatch(/You asked SI8 not to rely/)
    expect(W.status_labels.creator_disputed).toMatch(/not been used/)
  })

  test('6: one explanation, then concise rows: no row text repeats the explanation, and rows stay short', () => {
    for (const x of rowTexts) {
      expect(x.length).toBeLessThanOrEqual(120)
      expect(x).not.toMatch(/independently confirm|does not mean a condition/)
    }
    expect(W.not_compared.length).toBeLessThanOrEqual(200)
  })

  test('the full block passes the customer wording lock (with the approved Production labels too)', () => {
    expect(wordingLockViolations(withBlock().templates as CustomerPdfTemplates)).toEqual([])
    expect(wordingLockViolations(withProductionLabels().templates as CustomerPdfTemplates)).toEqual([])
  })
})

/** The APPROVED Production schema 8 template set plus the DRAFT block, under a synthetic test approval of exactly that set. */
function withProductionLabels(): { templates: unknown; approval: PdfTemplateApproval } {
  const set = preCutoverLiveSet(8) // CR-V2-MVP-APPROVAL-AND-RELEASE-1: the v3 set, which carries the integrated assessment
  const t = clone(set.templates) as Record<string, unknown>
  t.integrated_assessment = clone(W)
  // The synthetic fixture's questions are the synthetic set's: map them exactly as the synthetic templates do.
  t.question_sections = clone((EXAM_PDF.templates as unknown as CustomerPdfTemplates).question_sections)
  return { templates: t, approval: { ...set.approval, fingerprint: templateFingerprint(t) } }
}

describe('CR-V2-MVP-INTEGRATION-3: exact rendered customer text (approved Production labels + DRAFT block)', () => {
  test('cases A–D render inside the plan guidance item', async () => {
    const UNRESOLVED = await schema8Fixture({ plan: 'Free' })
    const at = (f: Schema8Fixture) => f.record.guidance.items.findIndex((i) => i.claim_id === PLAN_CLAIM)
    const out = (f: Schema8Fixture) => printed(integratedOf(render(f, withProductionLabels()), at(f)))
    const cases = { A_relevant: out(BASE), B1_ambiguous: out(AMBIG), B2_disputed: out(DISPUTED), C_no_usable_information: out(CANNOT), D_unresolved: out(UNRESOLVED) }
    expect(cases.A_relevant).toContain(W.status_labels.relevant_observation_unverified)
    expect(cases.B1_ambiguous).toContain(W.status_labels.leaves_uncertainty)
    expect(cases.B2_disputed).toContain(W.status_labels.creator_disputed)
    expect(cases.C_no_usable_information).toContain(W.status_labels.cannot_establish)
    expect(cases.D_unresolved).toContain(W.standing_labels.not_established)
    for (const c of Object.values(cases)) {
      for (const para of W.intro.split('\n\n')) expect(c.split(para).length - 1).toBe(1) // the explanation once, paragraph by paragraph
      expect(c).not.toContain('[TEST ONLY] Fact') // the requirement label is the approved one
    }
    if (process.env.PRINT_INTEGRATED_EXAMPLES) for (const [k, v] of Object.entries(cases)) console.log(`===== ${k}
${v}`)
  })
})
