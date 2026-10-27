/**
 * CR-V2-VERTICAL-SLICE-1 — admin-only access and side-effect boundaries of the
 * internal prototype (route + page).
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const checkReviewerContextAccess = jest.fn()
jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))

import * as buildModule from '@/lib/creator-record/prototype/build-draft'
import { POST } from '@/app/api/admin/creator-record-v2/draft/route'
import { documentIdFor } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { REPLAY_SET_VERSION } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'

const APP = path.resolve(__dirname, '..', '..')
const req = (body: unknown) => ({ text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as any
const VALID = {
  answers: { P1: ['Night Market'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] },
  tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }],
  acknowledgements: { A1: true, A2: true },
}
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

beforeEach(() => {
  jest.restoreAllMocks()
  checkReviewerContextAccess.mockReset()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'admin-1' })
})

describe('admin-only access', () => {
  test('unauthenticated → 401 and the draft is never built', async () => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
    const spy = jest.spyOn(buildModule, 'buildCreatorRecordDraft')
    const res = await POST(req(VALID))
    expect(res.status).toBe(401)
    expect(spy).not.toHaveBeenCalled()
  })

  test('authenticated non-admin → 403 and the draft is never built', async () => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 403 })
    const spy = jest.spyOn(buildModule, 'buildCreatorRecordDraft')
    const res = await POST(req(VALID))
    expect(res.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })

  test('the admin check runs before the body is read', async () => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status: 401 })
    const text = jest.fn(async () => JSON.stringify(VALID))
    await POST({ text } as any)
    expect(text).not.toHaveBeenCalled()
  })

  test('the page sits under the admin layout, which requires admin', () => {
    const layout = readFileSync(path.join(APP, 'app', 'admin', 'layout.tsx'), 'utf8')
    expect(layout).toMatch(/await requireAdmin\(\)/)
    expect(readFileSync(path.join(APP, 'app', 'admin', 'creator-record-v2', 'page.tsx'), 'utf8')).toContain('CreatorRecordPrototypeClient')
  })
})

describe('request handling', () => {
  test('authorized + valid → 200 with a pilot-marked draft view', async () => {
    const res = await POST(req(VALID))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.view.pilot).toBe(true)
    expect(data.view.header.record_id).toMatch(/^PROTOTYPE-[0-9A-F]{8}$/)
    expect(data.view.guidance.cards.map((c: { claim_id: string }) => c.claim_id)).toEqual(['CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1'])
  })

  test('the route always uses the pilot sources and the real claim fixtures', async () => {
    const spy = jest.spyOn(buildModule, 'buildCreatorRecordDraft')
    await POST(req(VALID))
    const arg = spy.mock.calls[0][0]
    expect(arg.sources.kind).toBe('pilot')
    expect(arg.topicClaims.length).toBeGreaterThan(30)
  })

  test('incomplete answers → 422 with issues', async () => {
    const res = await POST(req({ ...VALID, acknowledgements: { A1: true } }))
    expect(res.status).toBe(422)
    expect((await res.json()).issues).toContainEqual({ q_id: 'A2', tool_index: null, issue: 'acknowledgement_required' })
  })

  test.each([
    ['not JSON', 'not json'],
    ['extra top-level field', { ...VALID, ledger: [] }],
    ['sources override attempt', { ...VALID, sources: 'governed' }],
    ['non-string answer', { ...VALID, answers: { P1: [1] } }],
    ['bad key', { ...VALID, answers: { 'p1;drop': ['x'] } }],
    ['non-boolean acknowledgement', { ...VALID, acknowledgements: { A1: 'yes' } }],
    ['tools not an array', { ...VALID, tools: {} }],
  ])('malformed (%s) → 400', async (_name, body) => {
    const res = await POST(req(body))
    expect(res.status).toBe(400)
  })

  test('oversized body → 413', async () => {
    const res = await POST(req('x'.repeat(40_000)))
    expect(res.status).toBe(413)
  })

  // CR-V2-EVIDENCE-SLICE-1 / -PROD-UAT-1: documents travel back for display only, and are checked
  // against SI8's own replay table. A legitimate replayed document is exactly what the examine route
  // returns for the real synthetic fixture file (same SHA-256, same validated extraction).
  const legitDocument = (fixtureId = 'pdf-pika-pro-no-period') => {
    const f = REPLAY_FIXTURES.find((x) => x.fixture_id === fixtureId)!
    return JSON.parse(
      JSON.stringify({
        document_id: documentIdFor(f.sha256),
        file_name: `${fixtureId}.pdf`,
        sha256: f.sha256,
        bytes: 65000,
        detected_media_type: 'application/pdf',
        outcome: 'document_examined',
        reason: null,
        extraction_mode: 'fixture_replay',
        replay_fixture_id: f.fixture_id,
        versions: { schema: RECEIPT_EXTRACTION_SCHEMA_VERSION, prompt: null, replay_set: REPLAY_SET_VERSION },
        model_calls: 0,
        extraction: validateReceiptExtraction(f.parsed_output),
      }),
    )
  }
  const withDoc = (document: { document_id: string }) => ({ ...VALID, documents: [{ tool_index: 0, document, review: { document_id: document.document_id, decision: 'ignored', adopted_value: null } }] })

  test('authorized + valid with a replayed document → 200; the document is shown and guidance is unchanged', async () => {
    const plain = await (await POST(req(VALID))).json()
    const res = await POST(req(withDoc(legitDocument())))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.view.documents.items).toHaveLength(1)
    expect(data.view.guidance.cards.map((c: { claim_id: string }) => c.claim_id)).toEqual(plain.view.guidance.cards.map((c: { claim_id: string }) => c.claim_id))
  })

  test.each([
    ['an edited but schema-valid extraction', (d: any) => (d.extraction.product_or_plan_name = { status: 'present', value: 'Enterprise', evidence: 'Enterprise' })],
    ['a schema-invalid extraction', (d: any) => (d.extraction.product_or_plan_name.evidence = null)],
    ['a "live_model" label (live is locked off in this build)', (d: any) => ((d.extraction_mode = 'live_model'), (d.replay_fixture_id = null), (d.model_calls = 1), (d.versions.prompt = 'receipt-prompt-v2'), (d.versions.replay_set = null))],
    ['another fixture’s id', (d: any) => (d.replay_fixture_id = 'conflict-two-plan-names')],
    ['a stale replay-set version', (d: any) => (d.versions.replay_set = 'receipt-fixtures-v1/oracle-replay')],
    ['an unknown file claimed as examined', (d: any) => ((d.sha256 = 'f'.repeat(64)), (d.document_id = documentIdFor('f'.repeat(64))))],
    ['a known fixture claimed as "not read"', (d: any) => ((d.outcome = 'document_provided_not_examined'), (d.reason = 'no_replay_fixture'), (d.extraction = null), (d.replay_fixture_id = null))],
  ])('a returned document with %s → 400', async (_name, edit) => {
    const d = legitDocument()
    edit(d)
    const res = await POST(req(withDoc(d)))
    expect(res.status).toBe(400)
  })

  test('a genuinely unknown file ("received but not read") and a rejected format are accepted for display', async () => {
    for (const document of [
      await examineUpload(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from('route-unknown')]), 'other.png', { mode: 'fixture_replay' }),
      await examineUpload(new Uint8Array(Buffer.from('not a document')), 'fake.pdf', { mode: 'fixture_replay' }),
    ]) {
      const res = await POST(req(withDoc(JSON.parse(JSON.stringify(document)))))
      expect(res.status).toBe(200)
    }
  })
})

describe('no side effects', () => {
  const files = [
    'app/api/admin/creator-record-v2/draft/route.ts',
    'app/admin/creator-record-v2/page.tsx',
    'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx',
    'components/creator-record/CreatorRecordQuestionnaire.tsx',
    'components/creator-record/DraftRecordView.tsx',
  ]
  test('no database write, storage, payment, email, PDF or AI SDK in the prototype surface', () => {
    for (const f of files) {
      const src = stripComments(readFileSync(path.join(APP, f), 'utf8'))
      expect(src).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(|storage\.|@\/lib\/supabase\/admin|stripe|resend|@\/lib\/emails|@\/lib\/pdf|@anthropic-ai|localStorage|sessionStorage|cookies\(\)/i)
    }
  })
  test('the browser calls only the two admin prototype routes (examine, then draft)', () => {
    const client = stripComments(readFileSync(path.join(APP, 'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx'), 'utf8'))
    const urls = Array.from(client.matchAll(/fetch\('([^']+)'/g)).map((m) => m[1])
    expect(urls).toEqual(['/api/admin/creator-record-v2/examine', '/api/admin/creator-record-v2/draft'])
    for (const f of ['components/creator-record/CreatorRecordQuestionnaire.tsx', 'components/creator-record/DocumentReviewPanel.tsx', 'components/creator-record/DraftRecordView.tsx']) {
      expect(stripComments(readFileSync(path.join(APP, f), 'utf8'))).not.toMatch(/fetch\(/)
    }
  })
})
