/**
 * CR-V2-DOC-LIVE-1C-A — the evaluation infrastructure in the real, locked build. The SDK is used only against a stubbed `fetch`: nothing
 * here can reach a provider. No key, no real document, no spend.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { countPdfPages } from '@/lib/creator-record/evidence/pdf-text-layer'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { checkLiveDocumentBounds, LIVE_BOUNDS, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, unsafeSdkEnvironment } from '@/lib/creator-record/live-examination/controls'
import { EVALUATION_DATABASE_REFUSALS, runAuthorizedEvaluation, type EvaluationPorts } from '@/lib/creator-record/live-examination/evaluation'
import { createAnthropicReceiptCaller } from '@/lib/creator-record/receipt-examination/examine.anthropic'
import { deflateSync } from 'node:zlib'
import { syntheticObjStmPdf, syntheticPdf, xrefPdf } from '@/test-support/synthetic-pdf'

const ROOT = process.cwd()
const SQL_PATH = path.join(ROOT, 'supabase', 'evaluation-only', '20261109000000_creator_record_v2_live_evaluation.sql')
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!.parsed_output

describe('the code lock', () => {
  test('is false, and the entry point touches nothing: no operator check, no database, no document, no adapter', async () => {
    expect(LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
    const fn = () => jest.fn(async () => { throw new Error('must not be called') })
    const evaluation = { authenticateOperator: fn(), preflight: fn(), reserve: fn(), settle: fn(), record: fn(), listAttempts: fn() }
    const documents = { getDocument: fn(), logExaminationRead: fn(), readObject: fn() }
    const prepared = { getPrepared: fn() }
    const loadAdapter = fn()
    const r = await runAuthorizedEvaluation({ evaluation: evaluation as unknown as EvaluationPorts, documents, prepared, environmentRef: 'abcdefghijklmnopqrst', profiles: new Map(), isKnownSyntheticFixture: () => false, loadAdapter: loadAdapter as never }, { credential: 'x'.repeat(40), evaluation_id: 'eval-2026-test', prepared_id: '44444444-4444-4444-8444-444444444444', document_id: '33333333-3333-4333-8333-333333333333', tool_index: 0 })
    expect(r).toEqual({ kind: 'refused', stage: 'lock', code: 'live_examination_disabled' })
    for (const f of [...Object.values(evaluation), ...Object.values(documents), prepared.getPrepared, loadAdapter]) expect(f).not.toHaveBeenCalled()
  })
})

describe('the Anthropic adapter ignores the SDK environment it could otherwise be steered by', () => {
  const ENV_KEYS = ['ANTHROPIC_BASE_URL', 'ANTHROPIC_LOG', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_PROFILE', 'ANTHROPIC_CUSTOM_HEADERS', 'CREATOR_RECORD_EXTRACTION_API_KEY']
  const saved: Record<string, string | undefined> = {}
  const realFetch = globalThis.fetch
  let calls: { url: string; headers: Headers }[] = []
  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    process.env.CREATOR_RECORD_EXTRACTION_API_KEY = 'stub-dedicated-key'
    calls = []
    globalThis.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers) })
      const body = { id: 'msg_stub', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: JSON.stringify(OUTPUT) }] }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
  })
  afterEach(() => {
    for (const k of ENV_KEYS) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
    globalThis.fetch = realFetch
  })
  const send = async () => createAnthropicReceiptCaller({ model: 'claude-sonnet-5', apiKeyEnv: 'CREATOR_RECORD_EXTRACTION_API_KEY', timeoutMs: 5000 })({ content: [{ type: 'text', text: 'x' }], maxTokens: 1024 })

  test('base URL, log level, auth token and profile from the environment have no effect, and nothing is logged', async () => {
    process.env.ANTHROPIC_BASE_URL = 'https://other-host.invalid'
    process.env.ANTHROPIC_LOG = 'debug'
    process.env.ANTHROPIC_AUTH_TOKEN = 'a-different-credential'
    process.env.ANTHROPIC_PROFILE = 'some-profile'
    const spies = (['debug', 'info', 'log', 'warn', 'error'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined))
    try {
      const r = await send()
      expect(r.id).toBe('msg_stub')
      for (const s of spies) expect(s).not.toHaveBeenCalled()
    } finally {
      spies.forEach((s) => s.mockRestore())
    }
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages')
    expect(calls[0].headers.get('x-api-key')).toBe('stub-dedicated-key')
    expect(calls[0].headers.get('authorization')).toBeNull()
  })

  test('custom headers from the environment refuse the adapter before any request', async () => {
    process.env.ANTHROPIC_CUSTOM_HEADERS = 'X-Leak: 1'
    await expect(send()).rejects.toThrow('ANTHROPIC_CUSTOM_HEADERS')
    expect(calls).toHaveLength(0)
  })

  test('the real executor refuses to build with any of them set, in its own env or the process env', () => {
    expect(unsafeSdkEnvironment({}, {})).toEqual([])
    expect(unsafeSdkEnvironment({ ANTHROPIC_LOG: 'debug' }, {})).toEqual(['ANTHROPIC_LOG'])
    expect(unsafeSdkEnvironment({}, { ANTHROPIC_BASE_URL: 'x', ANTHROPIC_CUSTOM_HEADERS: 'y' })).toEqual(['ANTHROPIC_BASE_URL', 'ANTHROPIC_CUSTOM_HEADERS'])
    expect(unsafeSdkEnvironment({ ANTHROPIC_PROFILE: '' }, {})).toEqual([])
  })
})

describe('PDF page bound', () => {
  const untypedKids = (n: number) => {
    const kids = Array.from({ length: n }, (_, i) => `${i + 3} 0 R`).join(' ')
    const objs = Array.from({ length: n }, (_, i) => `${i + 3} 0 obj\n<< /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n`).join('')
    return new Uint8Array(Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count 1 >>\nendobj\n99 0 obj\n<< /Type /Page >>\nendobj\n${objs}trailer\n<< /Root 1 0 R >>\n%%EOF\n`))
  }
  const edit = (b: Uint8Array, from: string, to: string) => new Uint8Array(Buffer.from(Buffer.from(b).toString('latin1').replace(from, to), 'latin1'))

  test('honest files count exactly, plain and with compressed object streams', () => {
    for (const n of [1, 5, 6, 40]) {
      expect(countPdfPages(syntheticPdf(n))).toBe(n)
      expect(countPdfPages(syntheticObjStmPdf(n))).toBe(n)
    }
  })

  test.each<[string, Uint8Array]>([
    // The two bypasses the 1B review found: both held 40 pages and counted as 1.
    ['pages without /Type and a false /Count', untypedKids(40)],
    ['an object stream whose /N and header name 1 object but hold 40 pages', syntheticObjStmPdf(1, 40)],
    ['an object stream whose header names fewer objects than /N', edit(syntheticObjStmPdf(3), '/N 3', '/N 4')],
    ['an object stream holding pages with no page tree', syntheticObjStmPdf(40, 40, { tree: false })],
    ['a /Count that disagrees with the tree', syntheticPdf(2, 'x', { count: 40 })],
    ['an untyped node in the tree, balanced by a page outside it', edit(syntheticPdf(2, 'x', { extra: '50 0 obj\n<< /Type /Page /MediaBox [0 0 612 792] >>\nendobj\n' }), '4 0 obj\n<< /Type /Page /Parent', '4 0 obj\n<< /Parent')],
    ['a page outside the tree', syntheticPdf(2, 'x', { extra: '50 0 obj\n<< /Type /Page /MediaBox [0 0 612 792] >>\nendobj\n' })],
    ['a page marker outside any object that was read', syntheticPdf(2, 'x', { extra: '60 0 obj\n<< /Length 20 >>\nstream\n/Type /Page hidden..\nendstream\nendobj\n' })],
    ['two catalogs named', edit(syntheticPdf(2), '%%EOF', 'trailer\n<< /Root 3 0 R >>\n%%EOF')],
    ['no trailer naming the catalog', edit(syntheticPdf(2), 'trailer\n<< /Root 1 0 R >>\n', '')],
    ['a catalog that is not a catalog', edit(syntheticPdf(2), '/Type /Catalog', '/Type /Other')],
    ['a cycle in the tree', edit(syntheticPdf(2), '/Kids [3 0 R 4 0 R] /Count 2', '/Kids [3 0 R 2 0 R] /Count 2')],
    ['a kid that does not exist', edit(syntheticPdf(2), '/Kids [3 0 R 4 0 R]', '/Kids [3 0 R 77 0 R]')],
    ['an encrypted file', syntheticPdf(1, 'x', { extra: '70 0 obj\n<< /Filter /Standard >>\nendobj\n/Encrypt 70 0 R\n' })],
    ['not a PDF', new Uint8Array(Buffer.from('not a pdf'))],
  ])('%s cannot be counted, so it is refused', (_n, bytes) => {
    expect(countPdfPages(bytes)).toBeNull()
    expect(checkLiveDocumentBounds(bytes, 'application/pdf')).toBe('pages_undetermined')
  })

  // ── CR-V2-DOC-LIVE-1C-A-FIX: the cross-reference table can name a definition other than the one this reader keeps. ──
  // Checked against PyMuPDF and pypdf, which follow the table: the redefinition, hidden-definition and catalog cases hold 40 pages to
  // both, and the honest files hold 3, 5 and 6. The two object-stream cases are conflicting definitions (the classic table here sends a
  // reader to neither stream, and the two readers disagree on one of them): refused as ambiguous, not as a demonstrated 40-page file.
  const PAGE = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>'
  const BARE = '<< /Parent 2 0 R /MediaBox [0 0 612 792] >>'
  const CATALOG = { num: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' }
  const kids = (from: number, n: number) => Array.from({ length: n }, (_, i) => `${from + i} 0 R`).join(' ')
  const leaves = (from: number, n: number, body = PAGE) => Array.from({ length: n }, (_, i) => ({ num: from + i, body }))
  const objStm = (num: number, entries: [number, string][]) => {
    let off = 0
    const head = entries.map(([n, b]) => { const h = `${n} ${off} `; off += b.length + 1; return h }).join('')
    const packed = deflateSync(Buffer.from(head + entries.map(([, b]) => `${b} `).join(''), 'latin1')).toString('latin1')
    return { raw: `${num} 0 obj\n<< /Type /ObjStm /N ${entries.length} /First ${head.length} /Filter /FlateDecode /Length ${packed.length} >>\nstream\n${packed}\nendstream\nendobj\n`, defines: num }
  }
  const honest = (n: number) => xrefPdf([CATALOG, { num: 2, body: `<< /Type /Pages /Kids [${kids(10, n)}] /Count ${n} >>` }, ...leaves(10, n)])
  const XREF_ATTACKS: [string, Uint8Array][] = [
    // The demonstrated bypass: the table names a tree of 40 untyped pages; a later, unreferenced redefinition lists 2. 1C-A counted 2.
    ['the table names a 40-page tree; a later redefinition lists 2 untyped-page siblings', xrefPdf([CATALOG, { num: 2, body: `<< /Type /Pages /Kids [${kids(10, 40)}] /Count 40 >>` }, ...leaves(3, 2), ...leaves(10, 40, BARE), { num: 2, body: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>' }])],
    ['the same, with typed pages', xrefPdf([CATALOG, { num: 2, body: `<< /Type /Pages /Kids [${kids(10, 40)}] /Count 40 >>` }, ...leaves(3, 2), ...leaves(10, 40), { num: 2, body: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>' }])],
    ['the table names a definition hidden inside an uncompressed stream', xrefPdf([
      CATALOG,
      { raw: `5 0 obj\n<< /Length 2000 >>\nstream\n2 0 obj\n<< /Type /Pages /Kids [${kids(10, 40)}] /Count 40 >>\nendobj\nendstream\nendobj\n`, defines: 2 },
      { num: 2, body: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>' }, ...leaves(3, 2), ...leaves(10, 40, BARE),
    ])],
    ['a page-tree node defined both at top level and in an object stream', xrefPdf([
      CATALOG, { num: 2, body: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>' }, ...leaves(3, 2), ...leaves(10, 40, BARE),
      objStm(9, [[2, `<< /Type /Pages /Kids [${kids(10, 40)}] /Count 40 >>`]]),
    ])],
    ['a page defined in two object streams', xrefPdf([
      CATALOG, { num: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
      objStm(8, [[3, PAGE]]), objStm(9, [[3, `<< /Type /Pages /Kids [${kids(10, 40)}] /Count 40 >>`]]), ...leaves(10, 40, BARE),
    ])],
    ['a catalog defined twice', xrefPdf([{ num: 1, body: '<< /Type /Catalog /Pages 7 0 R >>' }, { num: 7, body: `<< /Type /Pages /Kids [${kids(10, 40)}] /Count 40 >>` }, ...leaves(10, 40, BARE), CATALOG, { num: 2, body: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' }, ...leaves(3, 1)])],
  ]

  test.each(XREF_ATTACKS)('%s: refused', (_n, bytes) => {
    expect(countPdfPages(bytes)).toBeNull()
    expect(checkLiveDocumentBounds(bytes, 'application/pdf')).toBe('pages_undetermined')
  })

  test('honest files with a cross-reference table count exactly, and the five-page limit holds', () => {
    expect([3, 5, 6].map((n) => countPdfPages(honest(n)))).toEqual([3, 5, 6])
    expect(checkLiveDocumentBounds(honest(5), 'application/pdf')).toBe('within_bounds')
    expect(checkLiveDocumentBounds(honest(6), 'application/pdf')).toBe('too_many_pages')
  })

  test('the bound itself, and the size and media limits, are unchanged', () => {
    expect(checkLiveDocumentBounds(syntheticPdf(LIVE_BOUNDS.max_pdf_pages), 'application/pdf')).toBe('within_bounds')
    expect(checkLiveDocumentBounds(syntheticPdf(LIVE_BOUNDS.max_pdf_pages + 1), 'application/pdf')).toBe('too_many_pages')
    expect(checkLiveDocumentBounds(syntheticObjStmPdf(LIVE_BOUNDS.max_pdf_pages + 1), 'application/pdf')).toBe('too_many_pages')
    expect(checkLiveDocumentBounds(new Uint8Array(LIVE_BOUNDS.max_document_bytes + 1), 'image/png')).toBe('too_large')
    expect(LIVE_BOUNDS).toMatchObject({ max_document_bytes: 1024 * 1024, max_pdf_pages: 5 })
  })
})

describe('the evaluation-only schema', () => {
  const sql = readFileSync(SQL_PATH, 'utf8')

  test('is not a migration: no migration tooling can apply it, and the migration list is unchanged', () => {
    const migrations = readdirSync(path.join(ROOT, 'supabase', 'migrations')).sort()
    // CR-V2-MVP-M2A: the customer live examination migration follows it; still nothing named for the evaluation.
    // CR-V2-MVP-RETENTION-M1A: the retention migration follows them.
    expect(migrations.slice(-5)).toEqual(['20261108000000_creator_record_v2_live_examination_foundation.sql', '20261110000000_creator_record_v2_customer_live_examination.sql', '20261111000000_creator_record_v2_retention_m1a.sql', '20261112000000_creator_record_v2_ai_examination_permission.sql', '20261113000000_creator_record_v2_ai_permission_current_version.sql'])  // CR-V2-MVP-LAUNCH-FOUNDATION-1: the AI-examination permission migration follows
    expect(migrations.some((m) => /live_evaluation/.test(m))).toBe(false)
    // CR-V2-DOC-LIVE-1C-B1: with its read-only verification and its guarded rollback beside it.
    expect(readdirSync(path.join(ROOT, 'supabase', 'evaluation-only')).sort()).toEqual(['20261109000000_creator_record_v2_live_evaluation.sql', 'rollback_20261109000000.sql', 'verify_live_evaluation_environment.sql'])
    expect(sql).toContain('EVALUATION-ONLY. NOT A MIGRATION.')
  })

  test('changes no existing object', () => {
    const body = sql.replace(/--[^\n]*/g, '')
    expect(body).not.toMatch(/ALTER TABLE\s+public\.creator_record_v2_(?!live_evaluation_)/i)
    expect(body).not.toMatch(/CREATE OR REPLACE FUNCTION\s+public\.creator_record_v2_(?!live_evaluation_)/i)
    expect(body).not.toMatch(/DROP\s+(TABLE|FUNCTION|TRIGGER|POLICY)/i)
    for (const m of Array.from(body.matchAll(/CREATE (?:UNIQUE )?(?:TABLE|INDEX|TRIGGER)\s+(?:public\.)?(\w+)/g))) expect(m[1]).toMatch(/^creator_record_v2_live_evaluation_/)
    for (const m of Array.from(body.matchAll(/\bON\s+public\.(\w+)/g))) expect(m[1]).toMatch(/^creator_record_v2_live_evaluation_/)
  })

  test('the service role reads and calls; it is granted no write on any table', () => {
    const grants = Array.from(sql.matchAll(/GRANT ([A-Z, ]+) ON (TABLE|FUNCTION) ([^;]+) TO service_role/g)).map((m) => ({ priv: m[1].trim(), kind: m[2], what: m[3] }))
    expect(grants.filter((g) => g.kind === 'TABLE').map((g) => g.priv)).toEqual(['SELECT'])
    expect(grants.find((g) => g.kind === 'TABLE')!.what).not.toMatch(/environment/)
    const fns = grants.filter((g) => g.kind === 'FUNCTION').flatMap((g) => Array.from(g.what.matchAll(/creator_record_v2_live_evaluation_(\w+)\(/g)).map((m) => m[1]))
    expect(fns.sort()).toEqual(['preflight', 'record', 'reserve', 'settle'])
  })

  test('every refusal it raises has a fixed code', () => {
    const raised = Array.from(new Set(Array.from(sql.matchAll(/RAISE EXCEPTION '(live_evaluation_[a-z_]+)'/g)).map((m) => m[1])))
    expect(raised.length).toBeGreaterThan(15)
    expect(raised.sort()).toEqual(Object.keys(EVALUATION_DATABASE_REFUSALS).sort())
  })

  test('neither marker nor authorization may name the Production project', () => {
    expect((sql.match(/<> 'lehqgcgnenwdmuzudbrs'/g) ?? []).length).toBe(2)
  })
})

describe('evaluation production ports (mocked Supabase client)', () => {
  const calls: { op: string; args: unknown[] }[] = []
  const result: { rpc?: unknown; select?: unknown; user?: unknown } = {}
  beforeAll(() => {
    jest.resetModules()
    jest.doMock('@/lib/supabase/admin', () => {
      const chain = (table: string) => {
        const q: Record<string, (...a: unknown[]) => unknown> = {}
        for (const m of ['select', 'eq']) q[m] = (...a: unknown[]) => { calls.push({ op: `${table}.${m}`, args: a }); return q }
        ;(q as unknown as { then: unknown }).then = (ok: (v: unknown) => unknown) => Promise.resolve(result.select).then(ok)
        return q
      }
      return {
        supabaseAdmin: {
          from: chain,
          rpc: (...a: unknown[]) => { calls.push({ op: 'rpc', args: a }); return Promise.resolve(result.rpc) },
          auth: { getUser: (t: string) => { calls.push({ op: 'auth.getUser', args: [t] }); return Promise.resolve(result.user) } },
        },
      }
    })
  })
  afterAll(() => jest.dontMock('@/lib/supabase/admin'))
  const ports = async () => (await import('@/lib/creator-record-flow/live-examination-production')).evaluationPorts

  test('the operator is whoever Supabase Auth says the token belongs to; anything else is no operator', async () => {
    const p = await ports()
    result.user = { data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null }
    expect(await p.authenticateOperator('token-1')).toEqual({ user_id: '11111111-1111-4111-8111-111111111111' })
    expect(calls.filter((c) => c.op === 'auth.getUser').pop()).toEqual({ op: 'auth.getUser', args: ['token-1'] })
    result.user = { data: { user: null }, error: { message: 'invalid' } }
    expect(await p.authenticateOperator('token-2')).toBeNull()
  })

  test('each port calls exactly its database function, and refusals keep their fixed codes', async () => {
    const p = await ports()
    result.rpc = { data: [{ reservation_id: 'r1', reserved_micro_usd: '138720' }], error: null }
    expect(await p.reserve('eval-2026-test', 'u', 'd')).toEqual({ reservation_id: 'r1', reserved_micro_usd: 138720 })
    expect(calls.filter((c) => c.op === 'rpc').pop()!.args).toEqual(['creator_record_v2_live_evaluation_reserve', { p_evaluation_id: 'eval-2026-test', p_operator: 'u', p_document_id: 'd' }])
    result.rpc = { data: null, error: { code: 'P0001', message: 'live_evaluation_budget_exhausted' } }
    await expect(p.reserve('e', 'u', 'd')).rejects.toMatchObject({ op: 'reserve', refusal: 'budget_exhausted' })
    result.rpc = { data: null, error: { code: 'P0001', message: 'live_evaluation_conflict' } }
    await expect(p.record('r', 1, '{}')).rejects.toMatchObject({ op: 'record', refusal: 'conflict' })
    result.rpc = { data: null, error: { code: 'XX000', message: 'live_evaluation_budget_exhausted' } }
    await expect(p.preflight('e', 'u', 'd')).rejects.toMatchObject({ op: 'preflight', refusal: null })
    result.rpc = { data: 150000, error: null }
    expect(await p.settle('r1', { requests: 1, input_tokens: 1, output_tokens: 1, usage_complete: true, estimated_micro_usd: 12 })).toEqual({ charged_micro_usd: 150000 })
    expect(calls.filter((c) => c.op === 'rpc').pop()!.args).toEqual(['creator_record_v2_live_evaluation_settle', { p_reservation_id: 'r1', p_requests: 1, p_input_tokens: 1, p_output_tokens: 1, p_usage_complete: true, p_estimated_micro_usd: 12 }])
    result.rpc = { data: [{ attempt_id: 'a1', result: 'created' }], error: null }
    expect(await p.record('r1', 7, '{"x":1}')).toEqual({ attempt_id: 'a1', result: 'created' })
    expect(calls.filter((c) => c.op === 'rpc').pop()!.args).toEqual(['creator_record_v2_live_evaluation_record', { p_reservation_id: 'r1', p_access_log_id: 7, p_envelope: '{"x":1}' }])
  })

  test('stored attempts are read for this evaluation, owner, document and profile only', async () => {
    const p = await ports()
    result.select = { data: [{ id: 'a', access_log_id: '9' }], error: null }
    expect(await p.listAttempts('eval-2026-test', 'u', 'd', 'receipt')).toEqual([{ id: 'a', access_log_id: 9 }])
    expect(calls.filter((c) => c.op === 'creator_record_v2_live_evaluation_attempts.eq').map((c) => c.args)).toEqual([['evaluation_id', 'eval-2026-test'], ['user_id', 'u'], ['document_id', 'd'], ['profile_id', 'receipt']])
  })
})
