/**
 * CR-V2-MVP-M3 — Creator Record v2 purchase, checkout preconditions and issuance.
 *
 * Every "approved" source, template and approval here is a SYNTHETIC TEST FIXTURE (pilot content
 * relabelled with a synthetic approver; placeholder PDF templates), injected through the ports. The
 * production approved inputs are also exercised: they are empty, so nothing is purchasable or issuable.
 *
 * The bind fake mirrors the database function's contract (proven against real PostgreSQL in
 * __tests__/db/creator-record-v2-binding.db.test.ts).
 *
 * @react-pdf/renderer is ESM-only and does not load under this Jest config, so the render port here
 * runs the REAL customer document builder (every record, template and wording-lock check) and emits
 * its canonical model as the bytes. Real PDF bytes are proven by a separate tsx smoke run.
 */

jest.mock('@/lib/creator-record-flow/production', () => ({
  renderCreatorRecordV2Pdf: jest.fn(),
}))

import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { buildCustomerRecord as buildCurrentRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, HISTORICAL_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { governanceSnapshotFrom, UNAVAILABLE } from '@/lib/creator-record/customer-record/governance-state'
import type { GovernanceSnapshot } from '@/lib/creator-record/customer-record/eligibility'
import { approvedGovernanceSnapshot, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import {
  checkV2Checkout, renderV2ForIssuance, startPurchase, V2IssuanceRefusal,
  type BindReason, type CheckoutSubmission, type PurchaseDeps, type V2IssuanceDeps,
} from '@/lib/creator-record/customer-flow/purchase'
import { CUSTOMER_PDF_TEMPLATE_ID, templateFingerprint, type CustomerPdfTemplates, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerDocument, CustomerPdfRefusal, documentModelCanonical, type CustomerDocumentInput } from '@/lib/creator-record/customer-pdf/document-model'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { APPLICABILITY_FACTS } from '@/lib/retrieval-engine/types'
import {
  CREATOR_RECORD_V1_FAMILY, CREATOR_RECORD_V2_FAMILY, CREATOR_RECORD_V2_GENERATOR_VERSION, rendererForFamily, selectCreatorRecordRenderer,
  CreatorRecordIssuanceStoppedError,
} from '@/lib/creator-record-artifacts/renderers'
import { ArtifactFamilyMismatchError, issueCreatorRecordArtifact, sha256Hex, type ArtifactRow, type ArtifactTable, type IssueDeps, type ObjectStore } from '@/lib/creator-record-artifacts/issue'
import { legacyGenerateFor } from '@/lib/creator-record-artifacts/production'
import * as production from '@/lib/creator-record-flow/production'
import type { FulfillmentSubmission } from '@/lib/payments/repository'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { asRenderableSchema5, COMMERCIAL_SUPPORT_UNDER_TEST } from '@/test-support/commercial-support'

const buildCustomerRecord = buildCurrentRecord

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-11-01T09:00:00.000Z')
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

// ── Synthetic approved governance (test fixture only) ──
const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }
function syntheticSources(): CreatorRecordSources {
  return withQuestionnaireApproval(unapprovedSources())
}
function unapprovedSources(): CreatorRecordSources {
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
function textApproval(s: CreatorRecordSources): SourceTextApproval {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
  }
}
const SOURCES = syntheticSources()
const TEXT = textApproval(SOURCES)
const governance = (over: Partial<Parameters<typeof governanceSnapshotFrom>[0]> = {}) => (date: string): GovernanceSnapshot =>
  governanceSnapshotFrom({ issuance_date: date, sources: SOURCES, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [TEXT], support: COMMERCIAL_SUPPORT_UNDER_TEST, authority_class: 'synthetic_test', ...over })
const withdrawn = () => governance({ sources: { ...SOURCES, ledger: SOURCES.ledger.map((e) => ({ ...e, creator_record_eligible: 'No' as const })) } })

const ANS = { P1: ['Synthetic M3 video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const state = (): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })

let seq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

function preparedRow(over: Partial<PreparedRow> = {}, version = 1): PreparedRow {
  const id = over.id ?? uuid()
  const built = buildCustomerRecord({
    state: state(), sources: SOURCES, source_text: { approval: TEXT, acknowledgements: ACKS(SOURCES) }, topicClaims: TOPIC_CLAIMS_FIXTURE,
    as_of: '2026-11-01', record: { record_id: `PREP-${id}`, record_version: version, captured_at: NOW.toISOString() },
  })
  if (!built.ok) throw new Error(`fixture record did not build: ${JSON.stringify(built).slice(0, 300)}`)
  return {
    id, user_id: OWNER, draft_id: over.draft_id ?? uuid(), version, record_ref: `PREP-${id}`, record_schema: CUSTOMER_RECORD_SCHEMA,
    record_schema_version: built.record.schema_version, canonical: built.canonical, sha256: built.sha256, form_state: state(),
    status: 'reviewed', created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: null, ...over,
  }
}

// ── Fakes ──
function world(over: Partial<PurchaseDeps> = {}) {
  const rows = new Map<string, PreparedRow>()
  const subs = new Map<string, CheckoutSubmission>()
  const calls = { bind: 0 }
  const add = (r: PreparedRow) => (rows.set(r.id, clone(r)), r)
  const latest = (draftId: string) => Array.from(rows.values()).filter((r) => r.draft_id === draftId).sort((a, b) => b.version - a.version)[0] ?? null
  // Mirrors create_creator_record_v2_submission.
  const bind: PurchaseDeps['bind'] = async ({ preparedId, userId, sha256 }) => {
    calls.bind++
    const r = rows.get(preparedId)
    const out = (reason: BindReason, submissionId: string | null = null) => ({ submissionId, reason })
    if (!r || r.user_id !== userId) return out('not_found')
    if (r.submission_id) return r.sha256 === sha256 ? out('existing', r.submission_id) : out('digest_mismatch')
    if (r.status !== 'reviewed') return out('not_reviewed')
    if (r.sha256 !== sha256) return out('digest_mismatch')
    if (latest(r.draft_id)?.id !== r.id) return out('superseded')
    const sid = uuid()
    subs.set(sid, { id: sid, user_id: userId, tier: 'creator_record', creator_record_product: 'v2' })
    r.submission_id = sid
    return out('created', sid)
  }
  const deps: PurchaseDeps = {
    submissions: 'open',
    issuance: 'enabled',
    hasPilotAccess: async (u) => u === OWNER || u === OTHER,
    getPrepared: async (id) => (rows.has(id) ? clone(rows.get(id) as PreparedRow) : null),
    latestVersion: async (d) => (latest(d) ? clone(latest(d) as PreparedRow) : null),
    boundTo: async (sid) => clone(Array.from(rows.values()).find((r) => r.submission_id === sid) ?? null),
    bind,
    governance: governance(),
    now: () => NOW,
    ...over,
  }
  return { deps, rows, subs, calls, add }
}

// ── startPurchase ──
describe('startPurchase', () => {
  test('creates one submission for the reviewed latest version; a repeat returns the same one', async () => {
    const w = world()
    const row = w.add(preparedRow())
    const a = await startPurchase(w.deps, OWNER, row.id)
    expect(a).toEqual({ ok: true, submission_id: expect.any(String) })
    const b = await startPurchase(w.deps, OWNER, row.id)
    expect(b).toEqual(a)
    expect(w.subs.size).toBe(1)
    expect(Array.from(w.subs.values())[0]).toMatchObject({ user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' })
  })

  test.each([
    ['issuance stopped', { issuance: 'stopped' as const }, 503, 'issuance_stopped'],
    ['new submissions stopped', { submissions: 'stopped' as const }, 503, 'submissions_stopped'],
    ['not invited', { hasPilotAccess: async () => false }, 403, 'not_invited'],
    ['governance unavailable', { governance: governance({ sources: UNAVAILABLE }) }, 503, 'unavailable'],
    ['governance withdrawn', { governance: withdrawn() }, 409, 'ineligible'],
    // Empty approved sources: every reference is missing, a definitive refusal.
    ['production governance (no M0 approvals)', { governance: (d: string) => approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE) }, 409, 'ineligible'],
  ])('%s → refused before any binding', async (_, over, status, code) => {
    const w = world(over as Partial<PurchaseDeps>)
    const row = w.add(preparedRow())
    expect(await startPurchase(w.deps, OWNER, row.id)).toEqual({ ok: false, status, code })
    expect(w.calls.bind).toBe(0)
    expect(w.subs.size).toBe(0)
  })

  test('another creator, a missing or malformed id are indistinguishable', async () => {
    const w = world()
    const row = w.add(preparedRow())
    for (const [user, id] of [[OTHER, row.id], [OWNER, uuid()], [OWNER, 'nope'], [OWNER, undefined]] as const) {
      expect(await startPurchase(w.deps, user, id)).toEqual({ ok: false, status: 404, code: 'not_found' })
    }
    expect(w.calls.bind).toBe(0)
  })

  test('an unreviewed version and a superseded version are refused', async () => {
    const w = world()
    const unreviewed = w.add(preparedRow({ status: 'prepared', reviewed_at: null }))
    expect(await startPurchase(w.deps, OWNER, unreviewed.id)).toEqual({ ok: false, status: 409, code: 'not_reviewed' })
    const v1 = w.add(preparedRow())
    w.add(preparedRow({ draft_id: v1.draft_id, status: 'prepared', reviewed_at: null }, 2))
    expect(await startPurchase(w.deps, OWNER, v1.id)).toEqual({ ok: false, status: 409, code: 'superseded' })
    expect(w.calls.bind).toBe(0)
  })

  test('a tampered stored record is an integrity failure; nothing is bound', async () => {
    const w = world()
    const row = preparedRow()
    w.add({ ...row, canonical: row.canonical.replace('Synthetic M3 video', 'Synthetic M3 videO') })
    expect(await startPurchase(w.deps, OWNER, row.id)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
    w.rows.clear()
    w.add({ ...row, sha256: 'f'.repeat(64) })
    expect(await startPurchase(w.deps, OWNER, row.id)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
    expect(w.calls.bind).toBe(0)
  })

  test('a digest mismatch reported by the database is an integrity failure', async () => {
    const w = world({ bind: async () => ({ submissionId: null, reason: 'digest_mismatch' }) })
    const row = w.add(preparedRow())
    expect(await startPurchase(w.deps, OWNER, row.id)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
  })

  test('the database result is mapped exactly; an unknown reason or a missing id throws', async () => {
    for (const [reason, expected] of [['superseded', 'superseded'], ['not_reviewed', 'not_reviewed'], ['not_found', 'not_found']] as const) {
      const w = world({ bind: async () => ({ submissionId: null, reason }) })
      const row = w.add(preparedRow())
      expect(await startPurchase(w.deps, OWNER, row.id)).toMatchObject({ ok: false, code: expected })
    }
    const w1 = world({ bind: async () => ({ submissionId: null, reason: 'created' }) })
    await expect(startPurchase(w1.deps, OWNER, w1.add(preparedRow()).id)).rejects.toThrow('creator_record_v2_bind_without_submission')
    const w2 = world({ bind: async () => ({ submissionId: null, reason: 'surprise' as BindReason }) })
    await expect(startPurchase(w2.deps, OWNER, w2.add(preparedRow()).id)).rejects.toThrow('creator_record_v2_bind_unknown_reason')
  })
})

// ── checkV2Checkout ──
describe('checkV2Checkout', () => {
  async function bought(over: Partial<PurchaseDeps> = {}) {
    const w = world(over)
    const row = w.add(preparedRow())
    const r = await startPurchase({ ...w.deps, governance: governance() , issuance: 'enabled', submissions: 'open', hasPilotAccess: async () => true }, OWNER, row.id)
    if (!r.ok) throw new Error('setup')
    return { w, row, sub: w.subs.get(r.submission_id) as CheckoutSubmission }
  }

  test('a bound, reviewed, latest, eligible record may be checked out; its digest is returned', async () => {
    const { w, row, sub } = await bought()
    expect(await checkV2Checkout(w.deps, OWNER, sub)).toEqual({ ok: true, sha256: row.sha256, record_ref: row.record_ref })
  })

  test('only a v2 creator_record submission of the session user', async () => {
    const { w, sub } = await bought()
    expect(await checkV2Checkout(w.deps, OTHER, sub)).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(await checkV2Checkout(w.deps, OWNER, { ...sub, creator_record_product: null })).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(await checkV2Checkout(w.deps, OWNER, { ...sub, tier: 'si8_certified' })).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(await checkV2Checkout(w.deps, OWNER, { ...sub, id: uuid() })).toEqual({ ok: false, status: 404, code: 'not_found' })
  })

  test.each([
    ['issuance stopped after binding', { issuance: 'stopped' as const }, 503, 'issuance_stopped'],
    ['submissions stopped after binding', { submissions: 'stopped' as const }, 503, 'submissions_stopped'],
    ['invite revoked', { hasPilotAccess: async () => false }, 403, 'not_invited'],
    ['approval withdrawn after binding', { governance: withdrawn() }, 409, 'ineligible'],
    ['governance unavailable', { governance: governance({ topicClaims: UNAVAILABLE }) }, 503, 'unavailable'],
  ])('%s → refused', async (_, over, status, code) => {
    const { w, sub } = await bought(over as Partial<PurchaseDeps>)
    expect(await checkV2Checkout(w.deps, OWNER, sub)).toEqual({ ok: false, status, code })
  })

  test('a correction after binding supersedes the bound version: refused', async () => {
    const { w, row, sub } = await bought()
    w.add(preparedRow({ draft_id: row.draft_id, status: 'prepared', reviewed_at: null }, 2))
    expect(await checkV2Checkout(w.deps, OWNER, sub)).toEqual({ ok: false, status: 409, code: 'superseded' })
  })

  test('a tampered bound record, or a binding that does not point back, is an integrity failure', async () => {
    const { w, row, sub } = await bought()
    w.rows.set(row.id, { ...(w.rows.get(row.id) as PreparedRow), canonical: row.canonical.replace('Pro', 'Pr0') })
    expect(await checkV2Checkout(w.deps, OWNER, sub)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
    const w2 = world({ boundTo: async () => ({ ...row, submission_id: uuid() }) })
    expect(await checkV2Checkout(w2.deps, OWNER, sub)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
  })
})

// ── Issuance ──
const PH = '[Placeholder] '
function placeholderTemplates(): CustomerPdfTemplates {
  const meta = pilotSources().presentation
  const question_sections: Record<string, 'project' | 'contribution'> = {}
  for (const [q, p] of Object.entries(meta)) if (!p.per_tool) question_sections[q] = p.section === 'project' || p.section === 'locations' ? 'project' : 'contribution'
  const t = (x: string) => `${PH}${x}`
  return {
    template_id: CUSTOMER_PDF_TEMPLATE_ID, version: 1, record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: HISTORICAL_RECORD_SCHEMA_VERSION },
    document_title: t('Creator Record {record_id}'), stamp: 'PLACEHOLDER WORDING FOR TESTING ONLY · CREATOR RECORD · SELF-DECLARED · NOT A CLEARANCE OR LEGAL OPINION',
    footer: t('Creator Record {record_id}'), page_label: 'Page {page} of {pages}',
    sections: {
      about: { heading: t('1. About'), intro: [t('Intro.')], counts: { answers: { one: t('{n} answer.'), other: t('{n} answers.') }, guidance: { one: t('{n} item.'), other: t('{n} items.') }, open_items: { one: t('{n} open.'), other: t('{n} open.') } } },
      project: { heading: t('2. Project'), intro: t('As told.'), empty: t('Nothing.') },
      tools: { heading: t('3. Tools'), intro: t('Tools.'), tool_heading: t('Tool {n}'), empty: t('None.') },
      contribution: { heading: t('4. Contribution'), intro: t('As told.'), empty: t('Nothing.') },
      guidance: {
        heading: t('5. Guidance'), intro: t('Educational.'), empty: t('None.'), item_heading: t('Guidance {index}: {subject}'), subject_with_tool: '{topic} (tool {n})',
        conclusion: t('Reads'), selected_because: t('Because'), on_what_you_told_us: t('On what you told us'), depends_on: t('Depends on'),
        unspecified_condition: t('Unspecified.'), caveats: t('Note'), item_limitation: t('Describes published terms only.'), topic_level: t('Topic level.'),
      },
      open_items: {
        heading: t('6. Open items'), intro: t('Not established.'), empty: t('None.'), item_ref: t('Guidance {index}'), for_guidance: t('For'),
        not_established_heading: t('Not established'), affects: t('Affects {items}'), unspecified_heading: t('Unspecified'), topic_qualified_heading: t('Topic qualified'),
        what_you_told_us: t('Told'), nothing_told: t('Nothing'), evidence_note: t('Evidence'), status: t('Status'), sufficiency: t('Evidence'),
        not_sure_heading: t('Not sure'), documents_heading: t('Documents'), documents_not_provided: t('No documents.'), limitations_heading: t('Limitations'), limitations: [t('Limited.')],
      },
      not_done: { heading: t('7. Not done'), lines: [t('No review.')] },
      provenance: {
        heading: t('8. Provenance'), acknowledgements_heading: t('Acknowledged'), identity_heading: t('Record'), sources_heading: t('Sources'), publications_heading: t('Guidance sources'),
        labels: {
          record_id: t('Record id'), issued_on: t('Issued on'), prepared_ref: t('Ref'), record_version: t('Version'), prepared_on: t('Prepared'), captured_at: t('Captured'), snapshot: t('SHA-256'),
          record_schema: t('Schema'), record_schema_version: t('Schema version'), builder: t('Builder'), builder_version: t('Builder version'), registry_version: t('Registry'), ledger_version: t('Ledger'),
          wording: t('Wording'), wording_version: t('Wording version'), wording_digest: t('Wording digest'), templates: t('Templates'), templates_version: t('Templates version'), templates_fingerprint: t('Templates fingerprint'),
          publication_version: t('Entry version'),
        },
      },
    },
    question_sections,
    conclusion_labels: { relevant_on_declared_facts: t('Relevant'), relevant_applicability_unresolved: t('Relevant, depending') },
    topic_labels: { commercial_use: t('Commercial use'), third_party_source_rights: t('Third-party material') },
    fact_labels: Object.fromEntries(APPLICABILITY_FACTS.map((f) => [f, `${PH}${f.replace(/_/g, ' ')}`])),
    not_sure_label: t('Not sure'),
    documents: { intro: t('Documents you added, listed as received.'), item_label: t('Document {n}'), type: t('Type'), category: t('Your description'), tool: t('Tool'), tool_value: t('Tool {n}'), size: t('Size'), size_value: t('{bytes} bytes'), fingerprint: t('SHA-256 fingerprint'), fingerprint_note: t('A fingerprint identifies the exact file received. It does not show that the document is genuine, who created it, or when.'), examination: t('Examination'), not_examined: t('Not examined by SI8') },
    document_type_labels: { 'application/pdf': t('PDF'), 'image/png': t('PNG image'), 'image/jpeg': t('JPEG image') },
    document_category_labels: { billing_receipt: t('Receipt or invoice'), licence: t('Licence'), provider_terms: t('Provider terms'), release_or_consent: t('Release or consent'), permission: t('Permission'), project_file: t('Project file'), other: t('Other') },
    dependency_codes: { status: { open: t('Open') }, sufficiency: { not_assessed: t('Not assessed') } },
  }
}
const approvalOf = (t: unknown): PdfTemplateApproval => ({
  template_id: CUSTOMER_PDF_TEMPLATE_ID, version: 1, fingerprint: templateFingerprint(t), record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: HISTORICAL_RECORD_SCHEMA_VERSION },
  lifecycle: 'approved', authority: 'SYNTHETIC TEMPLATE AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEMPLATE-REVIEW-1',
})
const TEMPLATES = placeholderTemplates()
const RECORD_ID = 'CR-2026-ABCDEF12'

function issuance(rows: PreparedRow[], over: Partial<V2IssuanceDeps> = {}) {
  const rendered: CustomerDocumentInput[] = []
  const deps: V2IssuanceDeps = {
    boundTo: async (sid) => clone(rows.find((r) => r.submission_id === sid) ?? null),
    latestVersion: async (d) => clone(rows.filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null),
    governance: governance(),
    templates: () => ({ templates: TEMPLATES, approval: approvalOf(TEMPLATES) }),
    renderPdf: async (input) => ((rendered.push(input)), new TextEncoder().encode(documentModelCanonical(buildCustomerDocument(asRenderableSchema5(input))))),
    ...over,
  }
  return { deps, rendered }
}
const SUB_ID = '33333333-3333-4333-8333-333333333333'
const v2sub = (over: Partial<CheckoutSubmission> = {}): CheckoutSubmission => ({ id: SUB_ID, user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2', ...over })

describe('renderV2ForIssuance', () => {
  test('renders the customer document from exactly the bound record', async () => {
    const row = preparedRow({ submission_id: SUB_ID })
    const { deps, rendered } = issuance([row])
    const bytes = await renderV2ForIssuance(deps, v2sub(), RECORD_ID, NOW)
    const model = JSON.parse(new TextDecoder().decode(bytes))
    expect(model.identity).toMatchObject({ record_id: RECORD_ID, issued_on: '2026-11-01', record_ref: row.record_ref })
    expect(rendered).toHaveLength(1)
    expect(rendered[0]).toMatchObject({ canonical: row.canonical, sha256: row.sha256, issued: { record_id: RECORD_ID, issued_on: '2026-11-01' } })
  })

  test('CR-V2-MVP-ELIGIBILITY-1: a correction that exists at issuance stops automatic issuance of the earlier version; nothing is rendered', async () => {
    const row = preparedRow({ submission_id: SUB_ID })
    const later = preparedRow({ draft_id: row.draft_id, status: 'prepared', reviewed_at: null }, 2)
    const { deps, rendered } = issuance([row, later])
    await expect(renderV2ForIssuance(deps, v2sub(), RECORD_ID, NOW)).rejects.toEqual(new V2IssuanceRefusal('record_superseded'))
    expect(rendered).toHaveLength(0)
  })

  test.each([
    ['not a v2 submission', () => issuance([preparedRow({ submission_id: SUB_ID })]), v2sub({ creator_record_product: null }), 'not_v2_submission'],
    ['another tier', () => issuance([preparedRow({ submission_id: SUB_ID })]), v2sub({ tier: 'si8_certified' }), 'not_v2_submission'],
    ['no bound record', () => issuance([]), v2sub(), 'record_unbound'],
    ['bound record of another owner', () => issuance([preparedRow({ submission_id: SUB_ID, user_id: OTHER })]), v2sub(), 'binding_mismatch'],
    ['binding that does not point back', () => issuance([], { boundTo: async () => preparedRow({ submission_id: uuid() }) }), v2sub(), 'binding_mismatch'],
    ['unreviewed bound record', () => issuance([preparedRow({ submission_id: SUB_ID, status: 'prepared', reviewed_at: null })]), v2sub(), 'record_not_reviewed'],
    ['tampered canonical', () => { const r = preparedRow({ submission_id: SUB_ID }); return issuance([{ ...r, canonical: r.canonical.replace('Pro', 'Pr0') }]) }, v2sub(), 'record_integrity'],
    ['tampered digest', () => issuance([{ ...preparedRow({ submission_id: SUB_ID }), sha256: 'e'.repeat(64) }]), v2sub(), 'record_integrity'],
    // The record itself is intact, but the row's identity columns disagree with it.
    ['row identity disagrees with the record', () => issuance([{ ...preparedRow({ submission_id: SUB_ID }), record_ref: 'PREP-00000000-0000-4000-8000-999999999999' }]), v2sub(), 'record_integrity'],
    ['approval withdrawn', () => issuance([preparedRow({ submission_id: SUB_ID })], { governance: withdrawn() }), v2sub(), 'governance_ineligible'],
    ['governance unavailable', () => issuance([preparedRow({ submission_id: SUB_ID })], { governance: governance({ source_text_approvals: UNAVAILABLE }) }), v2sub(), 'governance_indeterminate'],
    ['production governance (no M0 approvals)', () => issuance([preparedRow({ submission_id: SUB_ID })], { governance: (d) => approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE) }), v2sub(), 'governance_ineligible'],
  ])('%s → refused, nothing rendered', async (_, make, sub, code) => {
    const { deps, rendered } = make()
    await expect(renderV2ForIssuance(deps, sub, RECORD_ID, NOW)).rejects.toEqual(new V2IssuanceRefusal(code as never))
    expect(rendered).toHaveLength(0)
  })

  test('without approved PDF templates (production: none until M0) the PDF builder refuses', async () => {
    expect(approvedPdfTemplates()).toEqual({ templates: null, approval: null })
    const { deps } = issuance([preparedRow({ submission_id: SUB_ID })], { templates: approvedPdfTemplates })
    await expect(renderV2ForIssuance(deps, v2sub(), RECORD_ID, NOW)).rejects.toBeInstanceOf(CustomerPdfRefusal)
  })
})

// ── The v2 renderer through the private artifact path ──
describe('v2 renderer and private artifact issuance', () => {
  function memoryArtifacts() {
    const rows = new Map<string, ArtifactRow>()
    const objects = new Map<string, Uint8Array>()
    const table: ArtifactTable = {
      async find(sid) { return clone(Array.from(rows.values()).find((r) => r.submission_id === sid) ?? null) },
      async insertPending(row) {
        if (Array.from(rows.values()).some((r) => r.submission_id === row.submission_id)) return { result: 'conflict' }
        const full: ArtifactRow = { ...row, id: `art-${rows.size + 1}`, status: 'pending', issued_at: null }
        rows.set(full.id, full)
        return { result: 'inserted', row: clone(full) }
      },
      async takeOver(id, expected, next) {
        const r = rows.get(id)
        if (!r || r.status !== 'pending' || r.attempt_id !== expected) return false
        Object.assign(r, next)
        return true
      },
      async markIssued(id, attempt, sha) {
        const r = rows.get(id)
        if (!r || r.status !== 'pending' || r.attempt_id !== attempt || r.sha256 !== sha) return false
        r.status = 'issued'
        r.issued_at = NOW.toISOString()
        return true
      },
    }
    const store: ObjectStore = {
      async get(p) { return objects.get(p) ?? null },
      async put(p, b) { if (objects.has(p)) return 'exists'; objects.set(p, b); return 'stored' },
    }
    return { rows, objects, table, store }
  }

  const fulfilmentSub = (over: Partial<FulfillmentSubmission> = {}): FulfillmentSubmission => ({
    id: SUB_ID, user_id: OWNER, tier: 'creator_record', status: 'approved', title: 'Creator Record', filmmaker_name: 'Creator', tools_used: [],
    authorship_statement: '', likeness_confirmation: {}, ip_confirmation: {}, territory_preferences: null, creator_record_product: 'v2', ...over,
  })

  function depsFor(renderer: ReturnType<typeof rendererForFamily>, a: ReturnType<typeof memoryArtifacts>, sub: FulfillmentSubmission): IssueDeps {
    let n = 0
    return {
      artifacts: a.table, objects: a.store,
      renderer: { family: renderer.family, generator_version: renderer.generator_version, ownsGeneratorVersion: (v) => renderer.ownsGeneratorVersion(v), render: (rid) => renderer.render(sub, rid, NOW) },
      newAttemptId: () => `attempt-${++n}`, now: () => NOW, uat: false,
    }
  }

  beforeEach(() => {
    const row = preparedRow({ submission_id: SUB_ID })
    const { deps } = issuance([row])
    ;(production.renderCreatorRecordV2Pdf as jest.Mock).mockReset().mockImplementation((s: CheckoutSubmission, rid: string, at: Date) => renderV2ForIssuance(deps, s, rid, at))
  })

  test('stopped by default: a v2 submission never reaches a renderer', () => {
    expect(() => selectCreatorRecordRenderer(fulfilmentSub())).toThrow(CreatorRecordIssuanceStoppedError)
  })

  test('enabled: the v2 renderer issues one private artifact with its own generator version; a duplicate run re-issues nothing', async () => {
    const renderer = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
    expect(renderer.family).toBe(CREATOR_RECORD_V2_FAMILY)
    expect(renderer.legacy_path_permitted).toBe(false)
    const a = memoryArtifacts()
    const first = await issueCreatorRecordArtifact(SUB_ID, depsFor(renderer, a, fulfilmentSub()))
    expect(first.outcome).toBe('issued')
    const art = (first as { artifact: ArtifactRow }).artifact
    expect(art.generator_version).toBe(CREATOR_RECORD_V2_GENERATOR_VERSION)
    expect(art.record_id).toMatch(/^CR-2026-33333333$/)
    expect(sha256Hex(a.objects.get(art.storage_path) as Uint8Array)).toBe(art.sha256)
    const second = await issueCreatorRecordArtifact(SUB_ID, depsFor(renderer, a, fulfilmentSub()))
    expect(second.outcome).toBe('already_issued')
    expect(production.renderCreatorRecordV2Pdf).toHaveBeenCalledTimes(1)
  })

  test('enabled but ineligible: nothing is rendered, stored or recorded', async () => {
    const row = preparedRow({ submission_id: SUB_ID })
    const { deps } = issuance([row], { governance: withdrawn() })
    ;(production.renderCreatorRecordV2Pdf as jest.Mock).mockImplementation((s: CheckoutSubmission, rid: string, at: Date) => renderV2ForIssuance(deps, s, rid, at))
    const a = memoryArtifacts()
    await expect(issueCreatorRecordArtifact(SUB_ID, depsFor(rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled'), a, fulfilmentSub()))).rejects.toBeInstanceOf(V2IssuanceRefusal)
    expect(a.rows.size).toBe(0)
    expect(a.objects.size).toBe(0)
  })

  test('never a fallback: v2 cannot use the legacy generator, and neither family resumes the other\'s pending row', async () => {
    const v2 = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
    const v1 = rendererForFamily(CREATOR_RECORD_V1_FAMILY, 'enabled')
    const legacy = jest.fn(async () => undefined)
    await expect(legacyGenerateFor(v2, legacy)()).rejects.toThrow('creator_record_product_family_unsupported')
    expect(legacy).not.toHaveBeenCalled()
    expect(v1.ownsGeneratorVersion(CREATOR_RECORD_V2_GENERATOR_VERSION)).toBe(false)
    expect(v2.ownsGeneratorVersion('legacy-creator-record-pdf-v3')).toBe(false)

    const a = memoryArtifacts()
    a.rows.set('art-v1', { id: 'art-v1', submission_id: SUB_ID, record_id: 'CR-2026-33333333', attempt_id: 'old', storage_path: 'x/old.pdf', sha256: 'a'.repeat(64), byte_size: 1, generator_version: 'legacy-creator-record-pdf-v3', status: 'pending', uat: false, issued_at: null })
    await expect(issueCreatorRecordArtifact(SUB_ID, depsFor(v2, a, fulfilmentSub()))).rejects.toBeInstanceOf(ArtifactFamilyMismatchError)
    a.rows.get('art-v1')!.generator_version = CREATOR_RECORD_V2_GENERATOR_VERSION
    await expect(issueCreatorRecordArtifact(SUB_ID, depsFor(v1, a, fulfilmentSub({ creator_record_product: null })))).rejects.toBeInstanceOf(ArtifactFamilyMismatchError)
    expect(production.renderCreatorRecordV2Pdf).not.toHaveBeenCalled()
  })
})
