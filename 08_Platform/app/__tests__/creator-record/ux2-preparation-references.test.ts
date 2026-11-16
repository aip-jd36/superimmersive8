/**
 * SI8-UX-2 — the references the redesigned page sends are prepared by the UNCHANGED server exactly as intended.
 *
 * Uses the shipped SYNTHETIC test authority under its isolated conditions (no real governance), like
 * `evidence-record-inventory.test.ts`. Proves, end to end through `preparePrepared` and the PDF document model:
 *   - the defect being fixed: the old page re-sent stale indices after a tool was removed, which the server either refused
 *     (out of range) or — when still in range — accepted against the WRONG tool, which only the page can prevent;
 *   - after `associationReducer`, the server records every document against the tool the creator linked it to, and the PDF
 *     inventory prints that tool;
 *   - a pending choice can never reach the server (`serializeAttachments` refuses).
 */
import { preparePrepared as prepareAsSent, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedStore } from '@/lib/creator-record/customer-flow/service'
import { approvedCustomerRecordInputs, approvedPdfTemplates, currentPublicationAuthority } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument } from '@/lib/creator-record/customer-pdf/document-model'
import type { EvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'
import { associationReducer, EMPTY_ASSOCIATIONS, serializeAttachments, type AssociationEvent } from '@/lib/creator-record-flow/document-associations'
import { preparedBody } from '@/lib/creator-record-flow/examination-ui'

const preparePrepared = namingCurrentContract(prepareAsSent)

jest.mock('@/lib/creator-record-flow/production', () => ({ renderCreatorRecordV2Pdf: jest.fn() }))

const ISOLATED = { SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test', VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SI8_CR_SYNTHETIC_SUPABASE_REF: 'abcdefghijklmnopqrst', STRIPE_SECRET_KEY: 'sk_test_51Doc1' }
const bundle = currentPublicationAuthority(ISOLATED)
if (!bundle) throw new Error('synthetic authority not selected')
const NOW = new Date('2026-11-16T09:00:00.000Z')
const USER = '11111111-1111-4111-8111-111111111111'

const doc = (n: number): EvidenceRow => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, user_id: USER, sha256: String(n % 10).repeat(64), media_type: 'application/pdf', byte_size: 1000 + n,
  file_name: `ux2-synthetic-receipt-${n}.pdf`, storage_path: `${USER}/x`, consent_version: 'c', state: 'stored', created_at: 'x', stored_at: 'x', deleted_at: null, object_removed_at: null,
})
const DOCS = new Map([1, 2, 3, 4, 5].map((n) => [doc(n).id, doc(n)]))

function deps() {
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
  let seq = 100
  const d: FlowDeps = {
    submissions: 'open', hasPilotAccess: async () => true, store, inputs: () => approvedCustomerRecordInputs(bundle), topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => NOW, newId: () => `00000000-0000-4000-9000-${String(++seq).padStart(12, '0')}`, evidence: { get: async (id) => DOCS.get(id) ?? null },
  }
  return { d, rows }
}

const ANSWERS = { P1: ['UX-2 synthetic association test'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
// Three declared tools in the synthetic registry; the second and third are both the same provider (duplicate declarations).
const TOOL_A = { T1: ['pika'], T3: ['Standard'] }
const TOOL_B = { T1: ['runway-gen3'], T3: ['Standard'] }
const formState = (tools: Record<string, string[]>[]) => ({ answers: { ...ANSWERS }, tools, acknowledgements: { A1: true, A2: true } })
const D = (n: number) => doc(n).id

/** What the page sends: the same body builder the client uses, with the reducer's serialized references. */
async function prepareFrom(events: AssociationEvent[], tools: Record<string, string[]>[]) {
  const s = events.reduce(associationReducer, EMPTY_ASSOCIATIONS)
  const serialized = serializeAttachments(s, tools.length)
  if (!serialized.ok) return { blocked: serialized.unresolved }
  const { d, rows } = deps()
  const body = preparedBody({ state: formState(tools), contractSha256: null, attachments: serialized.attachments, includeExaminations: false })
  const r = await preparePrepared(d, USER, body)
  return { r, rows }
}

const START: AssociationEvent[] = [
  { kind: 'add', document_id: D(1), category: 'billing_receipt', tool_index: 0 },
  { kind: 'add', document_id: D(2), category: 'licence', tool_index: 1 },
  { kind: 'add', document_id: D(3), category: 'billing_receipt', tool_index: 2 },
  { kind: 'add', document_id: D(4), category: 'billing_receipt', tool_index: 2 },
  { kind: 'add', document_id: D(5), category: 'other', tool_index: null },
]

describe('the defect the page now prevents (server unchanged)', () => {
  test('stale indices after removing the FIRST tool: still in range, so the server accepts them against the wrong tools', async () => {
    // The old page kept D(1)→0 after tool 0 was removed; tool 0 is now TOOL_B. Nothing on the server can tell.
    const { d } = deps()
    const stale = [{ document_id: D(1), category: 'billing_receipt', tool_index: 0 }, { document_id: D(2), category: 'licence', tool_index: 1 }]
    const r = await preparePrepared(d, USER, { state: formState([TOOL_B, TOOL_B]), documents: stale })
    expect(r.ok).toBe(true)
  })

  test('stale indices after removing the LAST tool: out of range, so the whole version is refused (invalid_documents)', async () => {
    const { d } = deps()
    const stale = [{ document_id: D(3), category: 'billing_receipt', tool_index: 2 }]
    expect(await preparePrepared(d, USER, { state: formState([TOOL_A, TOOL_B]), documents: stale })).toMatchObject({ ok: false, status: 400, code: 'invalid_documents' })
  })
})

describe('after the fix: the server records the links the creator chose', () => {
  test('removing the first tool, then explicit choices: every document is recorded against the intended tool', async () => {
    const out = await prepareFrom([
      ...START,
      { kind: 'tool_removed', index: 0 },
      { kind: 'choose', document_id: D(1), choice: { kind: 'unlinked' } },
    ], [TOOL_B, TOOL_B])
    if (!('r' in out) || !out.r || !out.r.ok) throw new Error(`prepare failed: ${JSON.stringify(out)}`)
    expect(out.r.view.documents.map((x) => [x.document_id, x.category, x.tool_index])).toEqual([
      [D(1), 'billing_receipt', null], [D(2), 'licence', 0], [D(3), 'billing_receipt', 1], [D(4), 'billing_receipt', 1], [D(5), 'other', null],
    ])
  })

  test('removing the middle tool and moving its document to another tool', async () => {
    const out = await prepareFrom([...START, { kind: 'tool_removed', index: 1 }, { kind: 'choose', document_id: D(2), choice: { kind: 'tool', tool_index: 0 } }], [TOOL_A, TOOL_B])
    if (!('r' in out) || !out.r || !out.r.ok) throw new Error('prepare failed')
    expect(out.r.view.documents.map((x) => [x.document_id, x.tool_index])).toEqual([[D(1), 0], [D(2), 0], [D(3), 1], [D(4), 1], [D(5), null]])
  })

  test('removing the last tool and taking its documents out of the version', async () => {
    const out = await prepareFrom([
      ...START,
      { kind: 'tool_removed', index: 2 },
      { kind: 'choose', document_id: D(3), choice: { kind: 'exclude' } },
      { kind: 'choose', document_id: D(4), choice: { kind: 'exclude' } },
    ], [TOOL_A, TOOL_B])
    if (!('r' in out) || !out.r || !out.r.ok) throw new Error('prepare failed')
    expect(out.r.view.documents.map((x) => [x.document_id, x.tool_index])).toEqual([[D(1), 0], [D(2), 1], [D(5), null]])
  })

  test('an in-place tool change, confirmed, prepares with the same link', async () => {
    const out = await prepareFrom([...START, { kind: 'tool_identity_changed', index: 0 }, { kind: 'choose', document_id: D(1), choice: { kind: 'tool', tool_index: 0 } }], [TOOL_B, TOOL_B, TOOL_B])
    if (!('r' in out) || !out.r || !out.r.ok) throw new Error('prepare failed')
    expect(out.r.view.documents.find((x) => x.document_id === D(1))!.tool_index).toBe(0)
  })

  test('a pending choice never reaches the server', async () => {
    expect(await prepareFrom([...START, { kind: 'tool_removed', index: 0 }], [TOOL_B, TOOL_B])).toEqual({ blocked: [D(1)] })
    expect(await prepareFrom([...START, { kind: 'tool_identity_changed', index: 2 }], [TOOL_A, TOOL_B, TOOL_B])).toEqual({ blocked: [D(3), D(4)] })
  })

  test('the PDF inventory prints each document against the tool the creator chose', async () => {
    // Tool 0 removed; D(1) moved to the tool now first (which holds D(2)); D(3), D(4) renumbered to the second tool.
    const out = await prepareFrom([...START, { kind: 'tool_removed', index: 0 }, { kind: 'choose', document_id: D(1), choice: { kind: 'tool', tool_index: 0 } }], [TOOL_B, TOOL_B])
    if (!('r' in out) || !out.r || !out.r.ok || !out.rows) throw new Error('prepare failed')
    const row = out.rows.get(out.r.view.id)!
    const t = approvedPdfTemplates(bundle)
    const m = buildCustomerDocument({ canonical: row.canonical, sha256: row.sha256, issued: { record_id: 'CR-0000-00000000', issued_on: '2026-11-16' }, templates: t.templates, template_approval: t.approval })
    const rows = m.sections.find((s) => s.id === 'open_items')!.blocks.filter((b) => b.kind === 'row') as { label: string; value: string }[]
    // Pair each document's file name with the next "Tool" row printed for it.
    const toolOf: Record<string, string> = {}
    let current = ''
    for (const b of rows) {
      if (/Document \d+$/.test(b.label)) current = b.value
      else if (/\bTool$/.test(b.label) && current) toolOf[current] = b.value
    }
    expect(toolOf).toMatchObject({
      'ux2-synthetic-receipt-2.pdf': '[TEST ONLY] Tool 1',
      'ux2-synthetic-receipt-1.pdf': '[TEST ONLY] Tool 1',
      'ux2-synthetic-receipt-3.pdf': '[TEST ONLY] Tool 2',
      'ux2-synthetic-receipt-4.pdf': '[TEST ONLY] Tool 2',
    })
    expect(toolOf['ux2-synthetic-receipt-5.pdf']).not.toMatch(/Tool \d/)
  })

  test('the existing two-documents-per-tool rule still refuses a third document on one tool (the page offers no full tool)', async () => {
    const out = await prepareFrom([...START, { kind: 'choose', document_id: D(5), choice: { kind: 'tool', tool_index: 2 } }], [TOOL_A, TOOL_B, TOOL_B])
    if (!('r' in out) || !out.r) throw new Error('expected a server answer')
    expect(out.r).toMatchObject({ ok: false, status: 400, code: 'invalid_documents' })
  })
})
