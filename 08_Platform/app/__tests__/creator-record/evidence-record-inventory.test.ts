/**
 * CR-V2-DOC-1 — documents in prepared Creator Record v2 versions and the synthetic PDF inventory.
 *
 * Uses the shipped SYNTHETIC test authority under its isolated conditions (no real governance). Proves:
 * a version records each referenced document by SHA-256, in order, as not examined; foreign, missing,
 * deleted or out-of-range references refuse; versions stay immutable and a correction is a new version;
 * documents never change guidance; the PDF prints the inventory under the wording lock and refuses an
 * unknown document state.
 */
import { preparePrepared, verifiedRecord, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedStore } from '@/lib/creator-record/customer-flow/service'
import { approvedCustomerRecordInputs, approvedPdfTemplates, currentPublicationAuthority } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, documentModelCanonical } from '@/lib/creator-record/customer-pdf/document-model'
import { wordingLockViolations, type CustomerPdfTemplates } from '@/lib/creator-record/customer-pdf/templates'
import type { EvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

jest.mock('@/lib/creator-record-flow/production', () => ({ renderCreatorRecordV2Pdf: jest.fn() }))

const ISOLATED = { SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test', VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SI8_CR_SYNTHETIC_SUPABASE_REF: 'abcdefghijklmnopqrst', STRIPE_SECRET_KEY: 'sk_test_51Doc1' }
const bundle = currentPublicationAuthority(ISOLATED)
if (!bundle) throw new Error('synthetic authority not selected')
const NOW = new Date('2026-11-01T09:00:00.000Z')
const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

const doc = (n: number, over: Partial<EvidenceRow> = {}): EvidenceRow => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, user_id: USER, sha256: String(n % 10).repeat(64), media_type: 'application/pdf', byte_size: 1000 + n,
  file_name: `receipt-${n}.pdf`, storage_path: `${USER}/x`, consent_version: 'c', state: 'stored', created_at: 'x', stored_at: 'x', deleted_at: null, object_removed_at: null, ...over,
})
const DOCS = new Map([doc(1), doc(2), doc(3, { user_id: OTHER }), doc(4, { state: 'deleted', deleted_at: 'x' }), doc(5, { state: 'pending', stored_at: null }), doc(6, { media_type: 'image/png' })].map((d) => [d.id, d]))

function memoryStore() {
  const rows = new Map<string, PreparedRow>()
  const store: PreparedStore = {
    async insert(row: NewPreparedRow) {
      const full: PreparedRow = { ...row, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }
      rows.set(row.id, JSON.parse(JSON.stringify(full)))
      return JSON.parse(JSON.stringify(full))
    },
    async get(id) { return rows.has(id) ? JSON.parse(JSON.stringify(rows.get(id))) : null },
    async latestVersion(draftId) { return Array.from(rows.values()).filter((r) => r.draft_id === draftId).sort((a, b) => b.version - a.version)[0] ?? null },
    async markReviewed() { return null },
  }
  return { store, rows }
}
let seq = 100
function deps(over: Partial<FlowDeps> = {}) {
  const mem = memoryStore()
  const d: FlowDeps = {
    submissions: 'open', hasPilotAccess: async () => true, store: mem.store, inputs: () => approvedCustomerRecordInputs(bundle), topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => NOW, newId: () => `00000000-0000-4000-9000-${String(++seq).padStart(12, '0')}`, evidence: { get: async (id) => DOCS.get(id) ?? null }, ...over,
  }
  return { d, mem }
}
const STATE = {
  answers: { P1: ['Inventory test'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] },
  tools: [{ T1: ['pika'], T3: ['Standard'] }],
  acknowledgements: { A1: true, A2: true },
}
const ref = (n: number, tool_index: number | null = 0, category = 'billing_receipt') => ({ document_id: doc(n).id, category, tool_index })
const prepare = (d: FlowDeps, documents?: unknown, draft_id?: string) => preparePrepared(d, USER, { state: STATE, ...(documents !== undefined ? { documents } : {}), ...(draft_id ? { draft_id } : {}) })

describe('prepared versions record their documents', () => {
  test('each referenced document is recorded by SHA-256, in the creator\'s order, as not examined', async () => {
    const { d, mem } = deps()
    const r = await prepare(d, [ref(2, null, 'project_file'), ref(1, 0)])
    if (!r.ok) throw new Error(`prepare: ${r.code}`)
    expect(r.view.documents).toEqual([
      { document_id: doc(2).id, file_name: 'receipt-2.pdf', media_type: 'application/pdf', byte_size: 1002, sha256: '2'.repeat(64), category: 'project_file', tool_index: null },
      { document_id: doc(1).id, file_name: 'receipt-1.pdf', media_type: 'application/pdf', byte_size: 1001, sha256: '1'.repeat(64), category: 'billing_receipt', tool_index: 0 },
    ])
    const record = verifiedRecord(mem.rows.get(r.view.id)!)!
    expect(record.schema_version).toBe(5)
    expect(record.documents.policy).toBe('inventory_only')
    expect(record.documents.items.map((x) => x.examination)).toEqual(['not_examined', 'not_examined'])
  })

  test.each([
    ['another creator\'s document', [ref(3)]],
    ['a deleted document', [ref(4)]],
    ['an unfinished upload', [ref(5)]],
    ['an unknown document', [{ document_id: '00000000-0000-4000-8000-0000000fffff', category: 'other', tool_index: null }]],
    ['a tool that was not declared', [ref(1, 1)]],
    ['an unknown category', [ref(1, 0, 'verified_rights')]],
    ['three documents for one tool', [ref(1), ref(2), ref(6)]],
  ])('%s refuses the whole version (invalid_documents), and nothing is stored', async (_, documents) => {
    const { d, mem } = deps()
    expect(await prepare(d, documents)).toMatchObject({ ok: false, status: 400, code: 'invalid_documents' })
    expect(mem.rows.size).toBe(0)
  })

  test('without the evidence port, any reference fails closed', async () => {
    const { d } = deps({ evidence: undefined })
    expect(await prepare(d, [ref(1)])).toMatchObject({ code: 'invalid_documents' })
    expect((await prepare(d)).ok).toBe(true)
  })

  test('a stored version never changes; a correction is a new version with its own references', async () => {
    const { d, mem } = deps()
    const v1 = await prepare(d, [ref(1)])
    if (!v1.ok) throw new Error('v1')
    const before = JSON.stringify(mem.rows.get(v1.view.id))
    const v2 = await prepare(d, [ref(2, null, 'licence')], v1.view.draft_id)
    if (!v2.ok) throw new Error('v2')
    expect(v2.view.version).toBe(2)
    expect(JSON.stringify(mem.rows.get(v1.view.id))).toBe(before)
    expect(v1.view.documents.map((x) => x.document_id)).toEqual([doc(1).id])
    expect(v2.view.documents.map((x) => x.document_id)).toEqual([doc(2).id])
    // A changed reference is a changed record, and a tampered stored record fails verification.
    expect(mem.rows.get(v1.view.id)!.sha256).not.toBe(mem.rows.get(v2.view.id)!.sha256)
    const tampered = { ...mem.rows.get(v1.view.id)!, canonical: mem.rows.get(v1.view.id)!.canonical.replace('1'.repeat(64), '9'.repeat(64)) }
    expect(verifiedRecord(tampered)).toBeNull()
  })

  test('documents never change guidance: the same answers with and without documents give identical guidance', async () => {
    const { d, mem } = deps()
    const a = await prepare(d)
    const b = await prepare(d, [ref(1), ref(2, null)])
    if (!a.ok || !b.ok) throw new Error('prepare')
    const ra = verifiedRecord(mem.rows.get(a.view.id)!)!
    const rb = verifiedRecord(mem.rows.get(b.view.id)!)!
    // Observation ids embed each version's own record reference; nothing else may differ.
    const norm = (x: unknown, ref: string) => JSON.parse(JSON.stringify(x).split(ref).join('PREP-X'))
    expect(norm(rb.guidance, rb.record.record_ref)).toEqual(norm(ra.guidance, ra.record.record_ref))
    expect(norm(rb.declarations, rb.record.record_ref)).toEqual(norm(ra.declarations, ra.record.record_ref))
    expect(rb.guidance.items.length).toBeGreaterThan(0)
  })
})

describe('synthetic PDF inventory', () => {
  async function model(documents?: unknown) {
    const { d, mem } = deps()
    const r = await prepare(d, documents)
    if (!r.ok) throw new Error(`prepare: ${r.code}`)
    const row = mem.rows.get(r.view.id)!
    const t = approvedPdfTemplates(bundle)
    return { row, model: buildCustomerDocument({ canonical: row.canonical, sha256: row.sha256, issued: { record_id: 'CR-2026-ABCDEF12', issued_on: '2026-11-01' }, templates: t.templates, template_approval: t.approval }) }
  }
  const open = (m: ReturnType<typeof buildCustomerDocument>) => m.sections.find((s) => s.id === 'open_items')!.blocks

  test('the inventory prints each document\'s name, type, description, tool, size, fingerprint and "not examined"', async () => {
    const { model: m } = await model([ref(1, 0), ref(6, null, 'licence')])
    const rows = open(m).filter((b) => b.kind === 'row') as { label: string; value: string; value_from: string }[]
    const pairs = rows.map((b) => [b.label, b.value])
    expect(pairs).toEqual(expect.arrayContaining([
      ['[TEST ONLY] Document 1', 'receipt-1.pdf'], ['[TEST ONLY] Type', '[TEST ONLY] PDF'], ['[TEST ONLY] Your description', '[TEST ONLY] Receipt or invoice'],
      ['[TEST ONLY] Tool', '[TEST ONLY] Tool 1'], ['[TEST ONLY] Size', '[TEST ONLY] 1001 bytes'], ['[TEST ONLY] SHA-256 fingerprint', '1'.repeat(64)],
      ['[TEST ONLY] Examination', '[TEST ONLY] Not examined by SI8'],
      ['[TEST ONLY] Document 2', 'receipt-6.pdf'], ['[TEST ONLY] Type', '[TEST ONLY] PNG image'], ['[TEST ONLY] Your description', '[TEST ONLY] Licence'],
    ]))
    // Only the file name and the fingerprint come from the record; every other word is template text.
    expect(rows.filter((b) => b.value_from === 'record').map((b) => b.value)).toEqual(expect.arrayContaining(['receipt-1.pdf', '1'.repeat(64)]))
    expect(open(m).some((b) => 'text' in b && b.text.includes('does not show that the document is genuine'))).toBe(true)
    expect(wordingLockViolations(approvedPdfTemplates(bundle).templates as CustomerPdfTemplates)).toEqual([])
  })

  test('no documents → the "not provided" line, and the model is deterministic', async () => {
    const a = await model()
    const b = await model()
    expect(open(a.model).some((x) => 'text' in x && x.text === '[TEST ONLY] No documents.')).toBe(true)
    expect(documentModelCanonical(a.model).length).toBeGreaterThan(0)
    // Everything but provenance (which names each version's own reference and digest) is identical.
    const body = (m: typeof a.model) => m.sections.filter((x) => x.id !== 'provenance')
    expect(body(a.model)).toEqual(body(b.model))
  })

  test('an unknown document state in the record refuses rendering (re-signed so only the state differs)', async () => {
    const { row } = await model([ref(1)])
    const rec = JSON.parse(row.canonical)
    rec.documents.items[0].examination = 'examined'
    const canonical = canonicalJson(rec)
    const t = approvedPdfTemplates(bundle)
    expect(() => buildCustomerDocument({ canonical, sha256: sha256Hex(canonical), issued: { record_id: 'CR-2026-ABCDEF12', issued_on: '2026-11-01' }, templates: t.templates, template_approval: t.approval })).toThrow(CustomerPdfRefusal)
  })
})

describe('CR-V2-DOC-1B: payment and issuance refuse a record whose documents are not held intact', () => {
  const { renderV2ForIssuance, V2IssuanceRefusal, checkV2Checkout } = jest.requireActual('@/lib/creator-record/customer-flow/purchase') as typeof import('@/lib/creator-record/customer-flow/purchase')
  const { approvedGovernanceSnapshot } = jest.requireActual('@/lib/creator-record/customer-flow/approved-inputs') as typeof import('@/lib/creator-record/customer-flow/approved-inputs')
  const SUB = '33333333-3333-4333-8333-333333333333'
  type Integrity = Awaited<ReturnType<NonNullable<import('@/lib/creator-record/customer-flow/purchase').V2IssuanceDeps['evidenceIntact']>>>

  async function reviewedBound(documents?: unknown) {
    const { d, mem } = deps()
    const r = await prepare(d, documents)
    if (!r.ok) throw new Error(`prepare: ${r.code}`)
    const row = mem.rows.get(r.view.id)!
    row.status = 'reviewed'
    row.reviewed_at = NOW.toISOString()
    row.submission_id = SUB
    return row
  }
  const issue = (row: PreparedRow, evidenceIntact?: (u: string, items: readonly { document_id: string }[]) => Promise<Integrity>) =>
    renderV2ForIssuance({
      boundTo: async () => row,
      governance: (date) => approvedGovernanceSnapshot(date, TOPIC_CLAIMS_FIXTURE, bundle),
      templates: () => approvedPdfTemplates(bundle),
      renderPdf: async () => new Uint8Array([1]),
      ...(evidenceIntact ? { evidenceIntact } : {}),
    }, { id: SUB, user_id: USER, tier: 'creator_record', creator_record_product: 'v2' }, 'CR-2026-33333333', NOW)
      .then(() => 'issued').catch((e) => (e instanceof V2IssuanceRefusal ? e.code : String(e)))
  const checkout = (row: PreparedRow, evidenceIntact?: (u: string, items: readonly { document_id: string }[]) => Promise<Integrity>) =>
    checkV2Checkout({
      submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, getPrepared: async () => row, latestVersion: async () => row, boundTo: async () => row,
      bind: async () => ({ submissionId: SUB, reason: 'existing' }), governance: (date) => approvedGovernanceSnapshot(date, TOPIC_CLAIMS_FIXTURE, bundle), now: () => NOW,
      ...(evidenceIntact ? { evidenceIntact } : {}),
    }, USER, { id: SUB, user_id: USER, tier: 'creator_record', creator_record_product: 'v2' }).then((r) => (r.ok ? 'ok' : r.code))

  test('documents held intact: checkout passes and the record issues; the check sees exactly the recorded fingerprints', async () => {
    const row = await reviewedBound([ref(1)])
    const seen: unknown[] = []
    const intact = async (_u: string, items: readonly { document_id: string }[]) => { seen.push(items); return { ok: true } as Integrity }
    expect(await checkout(row, intact)).toBe('ok')
    expect(await issue(row, intact)).toBe('issued')
    expect(seen[0]).toEqual([{ document_id: doc(1).id, sha256: '1'.repeat(64), byte_size: 1001 }])
  })

  test.each(['not_stored', 'fingerprint_mismatch', 'object_missing', 'object_altered', 'unavailable'] as const)('a referenced document that is %s: checkout refuses and nothing is issued', async (reason) => {
    const row = await reviewedBound([ref(1)])
    const failing = async () => ({ ok: false, reason }) as Integrity
    expect(await checkout(row, failing)).toBe('evidence_unavailable')
    expect(await issue(row, failing)).toBe('evidence_unavailable')
  })

  test('without the evidence check a record with documents is neither sold nor issued; one without documents is unaffected', async () => {
    expect(await checkout(await reviewedBound([ref(1)]))).toBe('evidence_unavailable')
    expect(await issue(await reviewedBound([ref(1)]))).toBe('evidence_unavailable')
    expect(await checkout(await reviewedBound())).toBe('ok')
    expect(await issue(await reviewedBound())).toBe('issued')
  })
})
