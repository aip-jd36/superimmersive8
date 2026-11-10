/**
 * CR-V2-PDF-7 — the customer PDF renders schema 7 records, questionnaire-only, from the record alone.
 *
 * Runs the real document builder and, through `renderV2ForIssuance`, the real issuance checks. Synthetic fixtures only.
 * @react-pdf/renderer does not load under this Jest config, so the bytes are proven by a separate tsx run.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { renderV2ForIssuance, V2IssuanceRefusal, type CheckoutSubmission, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import { verifiedRecord, type PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { buildCustomerDocument, CustomerPdfRefusal, documentText, type Block } from '@/lib/creator-record/customer-pdf/document-model'
import { wordingLockViolations, type CustomerPdfTemplates } from '@/lib/creator-record/customer-pdf/templates'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom, type CurrentGovernance } from '@/lib/creator-record/customer-record/governance-state'
import {
  buildCustomerRecord, declarationIncompatibilities, verifyCustomerRecord, CUSTOMER_RECORD_EXAMINATION_BUILDER, CUSTOMER_RECORD_EXAMINATION_CONTENT,
  CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA, type CustomerRecordV2,
} from '@/lib/creator-record/customer-record/record'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as BUNDLE } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { COMMERCIAL_SUPPORT_UNDER_TEST as SUPPORT } from '@/test-support/commercial-support'

const AS_OF = '2026-11-06'
const NOW = new Date('2026-11-06T09:00:00.000Z')
const ISSUED = { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-07' }
const ID = '99999999-9999-4999-8999-999999999999'
const SYN = syntheticUatInputs()
const T = approvedPdfTemplates(BUNDLE)
const SAVED = JSON.parse(readFileSync(join(process.cwd(), 'test-support', 'fixtures', 'pre-questionnaire-contract-rows.json'), 'utf8')) as PreparedRow[]
const saved = (v: number) => SAVED.find((r) => r.record_schema_version === v)!

const STATE = {
  answers: { P1: ['PDF 7 test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['music'], M1: ['artlist'], H1: ['edited'] },
  tools: [{ T1: ['pika'], T3: ['Standard'] }],
  acknowledgements: { A1: true, A2: true },
}
function prepare(state: unknown = STATE) {
  const b = buildCustomerRecord({ state, sources: SYN.sources, source_text: SYN.source_text, topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: `PREP-${ID}`, record_version: 3, captured_at: NOW.toISOString() } })
  if (!b.ok) throw new Error(`fixture: ${JSON.stringify(b).slice(0, 300)}`)
  return b
}
const REC = prepare()
const doc = (r: { canonical: string; sha256: string }) => buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: ISSUED, templates: T.templates, template_approval: T.approval })
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V
const reseal = (f: (r: CustomerRecordV2) => void, from: { record: CustomerRecordV2 } = REC) => {
  const r = clone(from.record)
  f(r)
  const canonical = canonicalJson(r)
  return { canonical, sha256: sha256Hex(canonical) }
}
const refusalOf = (f: () => unknown) => {
  try {
    f()
    return 'rendered'
  } catch (e) {
    return e instanceof CustomerPdfRefusal ? e.code : `other:${String(e)}`
  }
}
const answer = (r: CustomerRecordV2, q: string) => r.declarations.answers.find((a) => a.q_id === q)!
const rows = (m: ReturnType<typeof doc>) => m.sections.flatMap((s) => s.blocks).filter((b): b is Extract<Block, { kind: 'row' }> => b.kind === 'row')
const section = (m: ReturnType<typeof doc>, id: string) => m.sections.find((s) => s.id === id)!.blocks

describe('a schema 7 record renders', () => {
  const m = doc(REC)
  const P = (T.templates as CustomerPdfTemplates).sections.provenance.labels

  test('every question and answer appears, in the section its contract puts it', () => {
    expect(declarationIncompatibilities(REC.record)).toEqual([])
    const texts = (id: string) => section(m, id).map((b) => (b.kind === 'row' ? b.value : b.text))
    for (const a of REC.record.declarations.answers) {
      const where = a.tool_index !== null ? 'tools' : (T.templates as CustomerPdfTemplates).question_sections[a.q_id]
      expect(texts(where)).toContain(a.question)
      for (const v of a.values) expect(texts(where)).toContain(v.label ?? v.value)
    }
    expect(REC.record.declarations.answers.map((a) => a.q_id)).toEqual(expect.arrayContaining(['P1', 'T1', 'T3', 'M1']))
  })

  test('the contract is named by id, version and a short reference; the full digest stays in the record and the model', () => {
    const c = REC.record.sources.questionnaire_contract!
    const value = (label: string) => rows(m).find((b) => b.label === label)?.value
    expect(value(P.questionnaire_contract)).toBe(c.contract_id)
    expect(value(P.questionnaire_contract_version)).toBe(String(c.contract_version))
    expect(value(P.questionnaire_contract_ref)).toBe(c.contract_sha256.slice(0, 12))
    expect(m.identity.questionnaire_contract).toEqual({ id: c.contract_id, version: c.contract_version, sha256: c.contract_sha256 })
    expect(documentText(m).join('\n')).not.toContain(c.contract_sha256)
  })

  test('approval text is never printed: naming a contract is no claim that anyone reviewed it', () => {
    const c = REC.record.sources.questionnaire_contract!
    const all = documentText(m).join('\n')
    expect(all).not.toContain(c.authority)
    expect(all).not.toContain(c.review_ref)
    expect(all).not.toMatch(/SYN-DECL|decision/i)
  })

  test('it is the exact confirmed version: reference, version and snapshot digest', () => {
    expect(m.identity).toMatchObject({ record_ref: `PREP-${ID}`, record_version: 3, snapshot_sha256: REC.sha256 })
    expect(rows(m).find((b) => b.label === P.snapshot)?.value).toBe(REC.sha256)
    expect(rows(m).find((b) => b.label === P.record_version)?.value).toBe('3')
    expect(rows(m).find((b) => b.label === P.record_schema_version)?.value).toBe('7')
  })

  test('test-only status is on the stamp, and no template claims verification or clearance', () => {
    expect(m.marking.stamp).toContain('SYNTHETIC TEST RECORD')
    expect(m.marking.stamp).toContain('NOT A CREATOR RECORD')
    expect(wordingLockViolations(T.templates as CustomerPdfTemplates)).toEqual([])
    const words = section(m, 'not_done').map((b) => (b.kind === 'row' ? b.value : b.text)).join(' ')
    expect(words).toMatch(/No review of any kind/)
  })
})

describe('answers must be what the record\'s own contract allows: anything else refuses, nothing is dropped', () => {
  test('the contract is the one in the record, not the questionnaire deployed today', () => {
    expect(doc(REC).identity.questionnaire_contract.version).toBe(1)
  })

  test.each([
    ['an unknown question', (r: CustomerRecordV2) => { const a = clone(answer(r, 'P1')); a.q_id = 'ZZ9'; r.declarations.answers.push(a) }, 'unknown_question:ZZ9'],
    ['a required answer removed', (r: CustomerRecordV2) => { r.declarations.answers = r.declarations.answers.filter((a) => a.q_id !== 'F1') }, 'required:F1'],
    ['another question version', (r: CustomerRecordV2) => { answer(r, 'P1').q_version = 2 }, 'question_version:P1'],
    ['changed question wording', (r: CustomerRecordV2) => { answer(r, 'P1').question = 'A different question' }, 'question_wording:P1'],
    ['a single question recorded on a tool', (r: CustomerRecordV2) => { answer(r, 'P1').tool_index = 0 }, 'question_scope:P1'],
    ['a tool question recorded as single', (r: CustomerRecordV2) => { answer(r, 'T1').tool_index = null }, 'question_scope:T1'],
    ['an option the contract does not have', (r: CustomerRecordV2) => { answer(r, 'F1').values[0].value = 'XX' }, 'answer_value:F1'],
    ['an option with another label', (r: CustomerRecordV2) => { answer(r, 'F1').values[0].label = 'A different label' }, 'answer_value:F1'],
    ['free text on a closed question', (r: CustomerRecordV2) => { const v = answer(r, 'F1').values[0]; v.kind = 'free_text'; v.label = null }, 'answer_value:F1'],
    ['an answer twice', (r: CustomerRecordV2) => { r.declarations.answers.push(clone(answer(r, 'P1'))) }, 'duplicate_answer:P1'],
    ['an answer to a question its conditions hide', (r: CustomerRecordV2) => { answer(r, 'M0').values = [{ value: 'none', kind: 'option', label: r.sources.questionnaire_contract!.wording.questions.M0.option_labels.none }] }, 'hidden_answer:M1'],
    ['an acknowledgement missing', (r: CustomerRecordV2) => { r.declarations.acknowledgements = r.declarations.acknowledgements.filter((a) => a.id !== 'A1') }, 'acknowledgement_required:A1'],
    ['acknowledgement wording changed', (r: CustomerRecordV2) => { r.declarations.acknowledgements[0].text = 'Something else' }, 'acknowledgement:A1'],
  ] as const)('%s', (_n, change, issue) => {
    const stored = reseal(change)
    expect(verifyCustomerRecord(stored.canonical, stored.sha256).ok).toBe(true)
    expect(declarationIncompatibilities(JSON.parse(stored.canonical))).toContain(issue)
    expect(refusalOf(() => doc(stored))).toBe('declarations_incompatible')
  })

  test('an unknown field on an answer refuses at the exact-key projection', () => {
    expect(refusalOf(() => doc(reseal((r) => { (answer(r, 'P1') as unknown as Record<string, unknown>).extra = 'x' })))).toBe('record_unsupported')
  })

  test('a contract under other validation rules refuses: these rules cannot speak for it', () => {
    const stored = reseal((r) => {
      const c = r.sources.questionnaire_contract!
      ;(c.body.validation_rules as { version: number }).version = 99
      c.contract_sha256 = sha256Hex(canonicalJson(c.body))
    })
    expect(verifyCustomerRecord(stored.canonical, stored.sha256).ok).toBe(true)
    expect(declarationIncompatibilities(JSON.parse(stored.canonical))).toEqual(['validation_rules_unsupported'])
    expect(refusalOf(() => doc(stored))).toBe('declarations_incompatible')
  })
})

describe('contract provenance', () => {
  test('a schema 7 record without its contract, or with an inconsistent one, does not verify and is not rendered', () => {
    expect(refusalOf(() => doc(reseal((r) => { delete r.sources.questionnaire_contract })))).toBe('record_invalid')
    expect(refusalOf(() => doc(reseal((r) => { r.sources.questionnaire_contract!.contract_sha256 = 'a'.repeat(64) })))).toBe('record_invalid')
    expect(refusalOf(() => doc(reseal((r) => { r.sources.questionnaire_contract!.contract_version = 0 })))).toBe('record_invalid')
  })

  test('a tampered record does not render', () => {
    expect(refusalOf(() => doc({ canonical: REC.canonical.replace('PDF 7 test video', 'PDF 7 test videO'), sha256: REC.sha256 }))).toBe('record_invalid')
  })
})

describe('schema boundaries', () => {
  test.each([[5], [6]])('a saved schema %i row stays intact and readable, is never reinterpreted, and is refused by name', (v) => {
    const r = saved(v)
    expect(verifyCustomerRecord(r.canonical, r.sha256).ok).toBe(true)
    expect(verifiedRecord(r)!.sources.questionnaire_contract).toBeUndefined()
    expect(refusalOf(() => doc(r))).toBe('record_schema_unsupported')
    expect(sha256Hex(r.canonical)).toBe(r.sha256)
  })

  // CR-V2-MVP-M3A: schema 8 is no longer refused by name. It renders only through templates approved for schema 8
  // (`customer-pdf-schema8.test.ts`); this schema 8 record, offered the schema 7 templates, is refused at the templates.
  test('schema 8 renders only through schema 8 templates: the schema 7 set refuses it', () => {
    const r = JSON.parse(saved(6).canonical)
    r.schema_version = CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
    r.builder = CUSTOMER_RECORD_EXAMINATION_BUILDER
    r.content = CUSTOMER_RECORD_EXAMINATION_CONTENT
    r.sources.source_text.record_schema.version = CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
    r.sources.questionnaire_contract = REC.record.sources.questionnaire_contract
    // CR-V2-MVP-PROD-PREP-1: the embedded contract names the current wording, so the source-text reference must name it too.
    r.sources.source_text.content_sha256 = REC.record.sources.source_text.content_sha256
    r.sources.source_text.categories = REC.record.sources.source_text.categories
    const canonical = canonicalJson(r)
    const stored = { canonical, sha256: sha256Hex(canonical) }
    expect(verifyCustomerRecord(stored.canonical, stored.sha256).ok).toBe(true)
    expect(refusalOf(() => doc(stored))).toMatch(/^templates_/)
  })

  test('historical artifacts do not depend on the renderer: delivery reads stored bytes only', () => {
    const delivery = readFileSync(join(process.cwd(), 'lib', 'creator-record-artifacts', 'deliver.ts'), 'utf8')
    const route = readFileSync(join(process.cwd(), 'app', 'api', 'creator-record', '[id]', 'pdf', 'route.ts'), 'utf8')
    for (const src of [delivery, route]) expect(src).not.toMatch(/customer-pdf|renderCustomerRecordPdf|buildCustomerDocument|renderCreatorRecordV2Pdf/)
  })

  test('templates for one schema render only that schema', () => {
    const fifth = clone(T.templates as CustomerPdfTemplates)
    fifth.record_schema.version = 5
    expect(refusalOf(() => buildCustomerDocument({ canonical: REC.canonical, sha256: REC.sha256, issued: ISSUED, templates: fifth, template_approval: T.approval }))).toMatch(/^templates_/)
  })
})

describe('issuance consumes the PDF without weakening a safeguard', () => {
  const SUB_ID = '33333333-3333-4333-8333-333333333333'
  const row: PreparedRow = { id: ID, user_id: 'owner', draft_id: '88888888-8888-4888-8888-888888888888', version: 3, record_ref: `PREP-${ID}`, record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: REC.record.schema_version, canonical: REC.canonical, sha256: REC.sha256, form_state: STATE as never, status: 'reviewed', created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: SUB_ID }
  const sub: CheckoutSubmission = { id: SUB_ID, user_id: 'owner', tier: 'creator_record', creator_record_product: 'v2' }
  const state = (over: Partial<CurrentGovernance> = {}) => governanceSnapshotFrom({ issuance_date: AS_OF, sources: SYN.sources, topicClaims: CLAIMS, source_text_approvals: [SYN.source_text!.approval!], support: SUPPORT, authority_class: 'synthetic_test', ...over })
  function issuing(over: Partial<V2IssuanceDeps> = {}, rows: PreparedRow[] = [row]) {
    const models: ReturnType<typeof buildCustomerDocument>[] = []
    const deps: V2IssuanceDeps = {
      boundTo: async () => rows[0],
      latestVersion: async () => [...rows].sort((a, b) => b.version - a.version)[0],
      governance: () => state(),
      templates: () => T,
      renderPdf: async (input) => { models.push(buildCustomerDocument(input)); return new Uint8Array([1]) },
      ...over,
    }
    return { deps, models }
  }
  const refusal = (deps: V2IssuanceDeps) => renderV2ForIssuance(deps, sub, ISSUED.record_id, new Date('2026-11-07T09:00:00Z')).then(() => 'rendered', (e) => (e instanceof V2IssuanceRefusal ? e.code : `other:${String(e)}`))

  test('with support named explicitly, a real schema 7 record reaches the real document, as the exact bound version', async () => {
    const i = issuing()
    expect(await refusal(i.deps)).toBe('rendered')
    expect(i.models[0].identity).toMatchObject({ record_ref: row.record_ref, record_version: 3, snapshot_sha256: row.sha256 })
  })

  test.each([
    ['a superseded version', () => issuing({}, [row, { ...row, id: 'later', version: 4, status: 'prepared', reviewed_at: null, submission_id: null }]), 'record_superseded'],
    ['a stale contract', () => issuing({ governance: () => state({ sources: { ...SYN.sources, questionnaire_approval: { ...SYN.sources.questionnaire_approval!, contract_version: 2, contract_sha256: 'b'.repeat(64) } } }) }), 'governance_ineligible'],
    ['a withdrawn contract', () => issuing({ governance: () => state({ sources: { ...SYN.sources, questionnaire_approval: { ...SYN.sources.questionnaire_approval!, lifecycle: 'withdrawn' } } }) }), 'governance_ineligible'],
    ['a synthetic record under real governance', () => issuing({ governance: () => state({ authority_class: 'governance' }) }), 'governance_ineligible'],
    ['no issuance support listed', () => issuing({ governance: () => state({ support: { record_schemas: [], builders: [], examination_methods: [] } }) }), 'governance_ineligible'],
    ['an unconfirmed version', () => issuing({}, [{ ...row, status: 'prepared', reviewed_at: null }]), 'record_not_reviewed'],
  ] as const)('%s: refused before any document is built', async (_n, make, code) => {
    const i = make()
    expect(await refusal(i.deps)).toBe(code)
    expect(i.models).toHaveLength(0)
  })

  test('commercial gates are all still closed', () => {
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [{ id: 'si8/creator-record-v2-record', version: 7 }, { id: 'si8/creator-record-v2-record', version: 8 }], builders: [{ id: 'si8/creator-record-v2-record-builder', version: 5 }, { id: 'si8/creator-record-v2-record-builder', version: 7 }], examination_methods: [{ origin: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5', profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' } }] }) // R15 option (a), JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    // R9 (JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110): the approved schema 7 templates, exactly.
    expect(GOV.pdf_template_approval).toMatchObject({ version: 1, fingerprint: 'c5fe2a21ec8a096c6abf7eccf0bd55f3103401e10a26512052e5d2ee15a11c6c', record_schema: { version: 7 }, review_ref: 'JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110 R9' })
    expect(approvedPdfTemplates(GOV)).toEqual({ templates: GOV.pdf_templates, approval: GOV.pdf_template_approval })
  })
})
