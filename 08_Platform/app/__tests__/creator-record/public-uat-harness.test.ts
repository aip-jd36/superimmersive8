/**
 * CR-V2-WORK-UAT-HARNESS-2 — the public, temporary, synthetic-only UAT harness.
 *
 * H1 fail-closed switch and expiry · H2 runtime dependency closure · H3 admin
 * routes keep their protection · H4 size limits · H5 strict request (no
 * uploads, no observations, allowlisted fixtures only) · H6 parity with the
 * admin prototype · H7 replay/origin labels · H8 review flows · H9 wording and
 * designation · H10 no internal metadata · analytics exclusion · noindex.
 * H11 (Production smoke) and H12 (a real ChatGPT Work run) are not locally
 * testable.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

jest.mock('@/lib/creator-record/public-uat/config', () => {
  const actual = jest.requireActual('@/lib/creator-record/public-uat/config')
  return { ...actual, publicUatStatus: jest.fn(actual.publicUatStatus) }
})

import { POST } from '@/app/api/uat/creator-record-v2/draft/route'
import { GA_INLINE_SNIPPET, GA_MEASUREMENT_ID, isGaExcludedPath } from '@/lib/analytics/ga-snippet'
import type { ReviewDecision } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { verifyReturnedDocument } from '@/lib/creator-record/evidence/verify-returned-documents'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import * as configModule from '@/lib/creator-record/public-uat/config'
import { buildPublicUatDraft, documentsFromRefs } from '@/lib/creator-record/public-uat/build-public-uat-draft'
import { documentForFixture, PUBLIC_UAT_FIXTURES, publicUatFixtureDocuments } from '@/lib/creator-record/public-uat/fixtures'
import { parsePublicUatRequest } from '@/lib/creator-record/public-uat/parse-public-request'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { NEGATION_ALLOWLIST, T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const APP = path.resolve(__dirname, '..', '..')
const { PUBLIC_UAT_MAX_WINDOW_DAYS } = configModule
const actualStatus = jest.requireActual('@/lib/creator-record/public-uat/config').publicUatStatus as typeof configModule.publicUatStatus
const statusMock = configModule.publicUatStatus as jest.MockedFunction<typeof configModule.publicUatStatus>
const OPEN_WINDOW = { opens_at: '2026-10-27T00:00:00Z', closes_at: '2026-11-10T00:00:00Z' }
const openHarness = () => statusMock.mockImplementation((now = new Date('2026-10-28T12:00:00Z')) => actualStatus(now, { enabled: true, window: OPEN_WINDOW }))
const closedHarness = (config: { enabled: boolean; window: { opens_at: string; closes_at: string } | null } = { enabled: true, window: null }, now = new Date('2026-10-28T12:00:00Z')) =>
  statusMock.mockImplementation(() => actualStatus(now, config))

const ACK = { A1: true, A2: true }
const ANS = { P1: ['UAT test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const state = (tools: Record<string, string[]>[] = [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], answers: Record<string, string[]> = {}): CreatorRecordFormState => ({ answers: { ...ANS, ...answers }, tools, acknowledgements: ACK })
const ref = (fixture_id: string, tool_index = 0, decision: string = 'not_reviewed', adopted_value: string | null = null) => ({ tool_index, fixture_id, review: { decision: decision as ReviewDecision, adopted_value } })
const RECORD = { record_id: 'UAT-TEST0001', record_version: 1, captured_at: '2026-10-28T00:00:00Z' }

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/uat/creator-record-v2/draft', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
}
const post = async (body: unknown, headers?: Record<string, string>) => POST(jsonRequest(body, headers) as any)

beforeEach(() => openHarness())

// ───────────────────────────────────────────── H1 fail closed

describe('H1 — the harness fails closed when disabled, not armed, malformed or expired', () => {
  const at = (iso: string) => new Date(iso)
  test.each([
    ['disabled', { enabled: false, window: OPEN_WINDOW }, '2026-10-28T00:00:00Z', 'disabled'],
    ['not armed', { enabled: true, window: null }, '2026-10-28T00:00:00Z', 'not_armed'],
    ['malformed time', { enabled: true, window: { opens_at: 'soon', closes_at: '2026-11-10T00:00:00Z' } }, '2026-10-28T00:00:00Z', 'invalid_window'],
    ['closes before it opens', { enabled: true, window: { opens_at: '2026-11-10T00:00:00Z', closes_at: '2026-10-27T00:00:00Z' } }, '2026-10-28T00:00:00Z', 'invalid_window'],
    ['longer than 14 days', { enabled: true, window: { opens_at: '2026-10-27T00:00:00Z', closes_at: '2026-11-10T00:00:00.001Z' } }, '2026-10-28T00:00:00Z', 'window_too_long'],
    ['not yet open', { enabled: true, window: OPEN_WINDOW }, '2026-10-26T23:59:59Z', 'not_yet_open'],
    ['expired (exactly at close)', { enabled: true, window: OPEN_WINDOW }, '2026-11-10T00:00:00Z', 'expired'],
  ])('%s → closed', (_n, config, now, reason) => {
    expect(actualStatus(at(now), config as any)).toEqual({ open: false, reason })
  })

  test('a window of exactly 14 days, while open, is open', () => {
    expect(PUBLIC_UAT_MAX_WINDOW_DAYS).toBe(14)
    expect(actualStatus(at('2026-11-09T23:59:59Z'), { enabled: true, window: OPEN_WINDOW })).toEqual({ open: true, closes_at: '2026-11-10T00:00:00.000Z' })
  })

  test('the committed window is exactly the PM-approved deployment window (CR-V2-WORK-UAT-HARNESS-3B), 14 days, and closes for good afterwards', () => {
    // Tripwire: changing or extending the window requires a new PM decision and an update here.
    expect(configModule.PUBLIC_UAT_HARNESS_ENABLED).toBe(true)
    expect(configModule.PUBLIC_UAT_WINDOW).toEqual({ opens_at: '2026-10-27T07:00:00Z', closes_at: '2026-11-10T07:00:00Z' })
    const committed = { enabled: configModule.PUBLIC_UAT_HARNESS_ENABLED, window: configModule.PUBLIC_UAT_WINDOW }
    expect(actualStatus(new Date('2026-10-27T06:59:59Z'), committed)).toEqual({ open: false, reason: 'not_yet_open' })
    expect(actualStatus(new Date('2026-11-01T00:00:00Z'), committed)).toEqual({ open: true, closes_at: '2026-11-10T07:00:00.000Z' })
    expect(actualStatus(new Date('2026-11-10T07:00:00Z'), committed)).toEqual({ open: false, reason: 'expired' })
    expect(actualStatus(new Date('2027-01-01T00:00:00Z'), committed)).toEqual({ open: false, reason: 'expired' })
  })

  test.each([
    ['not armed', () => closedHarness()],
    ['expired', () => closedHarness({ enabled: true, window: OPEN_WINDOW }, new Date('2026-11-10T00:00:00Z'))],
    ['disabled', () => closedHarness({ enabled: false, window: OPEN_WINDOW })],
  ])('closed (%s) → the route answers 404 before reading any part of the request', async (_n, close) => {
    close()
    const touched = { headers: false, body: false, text: false, json: false }
    const req = {
      get headers() {
        touched.headers = true
        return new Headers()
      },
      get body() {
        touched.body = true
        return null
      },
      text: async () => ((touched.text = true), ''),
      json: async () => ((touched.json = true), {}),
    }
    const res = await POST(req as any)
    expect(res.status).toBe(404)
    expect(touched).toEqual({ headers: false, body: false, text: false, json: false })
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  test('the page checks the same switch per request (never frozen at build) and 404s when closed', () => {
    const page = readFileSync(path.join(APP, 'app', 'uat', 'creator-record-v2', 'page.tsx'), 'utf8')
    expect(page).toMatch(/export const dynamic = 'force-dynamic'/)
    expect(page).toMatch(/const status = publicUatStatus\(\)\s+if \(!status\.open\) notFound\(\)/)
    // The check precedes any rendering or data preparation.
    expect(page.indexOf('if (!status.open) notFound()')).toBeLessThan(page.indexOf('<PublicUatClient'))
  })
})

// ───────────────────────────────────────────── H2 dependency closure

/** Transitive RUNTIME import closure (excludes `import type`). */
function runtimeClosure(entries: string[]): { files: string[]; external: string[] } {
  const IMP = /^\s*(?:import|export)\s+(?!type\s)(?:[^;'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm
  const DYN = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  const resolve = (from: string, spec: string): string | null => {
    const base = spec.startsWith('@/') ? path.join(APP, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null
    if (!base) return null
    for (const c of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), base]) if (existsSync(c) && !c.endsWith(path.sep)) try { if (readFileSync(c)) return c } catch { /* directory */ }
    return null
  }
  const seen = new Set<string>()
  const external = new Set<string>()
  const stack = entries.map((e) => path.join(APP, e))
  while (stack.length) {
    const f = stack.pop() as string
    if (seen.has(f)) continue
    seen.add(f)
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const specs = [...Array.from(src.matchAll(IMP)).map((m) => m[1]), ...Array.from(src.matchAll(DYN)).map((m) => m[1])]
    for (const s of specs) {
      const r = resolve(f, s)
      if (r) stack.push(r)
      else if (!s.startsWith('.') && !s.startsWith('@/')) external.add(s)
    }
  }
  return { files: Array.from(seen).map((f) => path.relative(APP, f).split(path.sep).join('/')).sort(), external: Array.from(external).sort() }
}

describe('H2 — the public harness reaches no privileged capability', () => {
  const FORBIDDEN_FILES = [
    /^lib\/reviewer-context\//,
    /^lib\/supabase\//,
    /^lib\/auth\//,
    /^lib\/storage\.ts$/,
    /^lib\/emails\.ts$/,
    /^lib\/stripe\.ts$/,
    /^lib\/payments\//,
    /^lib\/pdf\//,
    /^lib\/crc-engine\//,
    /^lib\/assessments\//,
    /^middleware\.ts$/,
    /^app\/admin\//,
    /^app\/api\/admin\//,
    /^lib\/creator-record\/evidence\/(examine-upload|live-caller|config)\.ts$/,
    /^lib\/creator-record\/receipt-examination\/(examine|examine\.anthropic|prompt)\.ts$/,
    /^lib\/interview-engine\/anthropic/,
  ]
  const ALLOWED_EXTERNAL = ['crypto', 'next/navigation', 'next/server', 'node:crypto', 'react']

  test.each([['the public route', ['app/api/uat/creator-record-v2/draft/route.ts']], ['the public page and its client components', ['app/uat/creator-record-v2/page.tsx']]])('%s: no auth, Supabase, service role, storage, email, payment, examination, gate or model module', (_n, entries) => {
    const { files, external } = runtimeClosure(entries)
    expect(files.length).toBeGreaterThan(10)
    expect(files.filter((f) => FORBIDDEN_FILES.some((re) => re.test(f)))).toEqual([])
    expect(external.filter((e) => !ALLOWED_EXTERNAL.includes(e))).toEqual([])
    expect(external.some((e) => /supabase|anthropic|stripe|resend|react-pdf|typst/.test(e))).toBe(false)
  })

  test('positive control: the same closure walk DOES find the privileged modules of the admin routes', () => {
    const admin = runtimeClosure(['app/api/admin/creator-record-v2/draft/route.ts', 'app/api/admin/creator-record-v2/examine/route.ts'])
    expect(admin.files).toEqual(expect.arrayContaining(['lib/reviewer-context/auth.ts', 'lib/creator-record/evidence/live-caller.ts', 'lib/creator-record/evidence/examine-upload.ts']))
    expect(admin.external).toEqual(expect.arrayContaining(['@supabase/ssr']))
  })

  test('the public route uses no cookies, headers() helper, auth or logging', () => {
    const src = readFileSync(path.join(APP, 'app', 'api', 'uat', 'creator-record-v2', 'draft', 'route.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(src).not.toMatch(/cookies\(|next\/headers|getUser|getSession|checkReviewerContextAccess|requireAdmin|console\./)
  })
})

// ───────────────────────────────────────────── H3 admin routes unchanged

describe('H3 — the admin prototype keeps its protection', () => {
  test('both admin routes still authorize first; the admin page still sits under requireAdmin', () => {
    for (const r of ['draft', 'examine']) {
      const src = readFileSync(path.join(APP, 'app', 'api', 'admin', 'creator-record-v2', r, 'route.ts'), 'utf8')
      const body = src.slice(src.indexOf('export async function POST'))
      expect(body.indexOf('checkReviewerContextAccess()')).toBeGreaterThan(-1)
      expect(body.indexOf('checkReviewerContextAccess()')).toBeLessThan(Math.min(...['req.text()', 'req.body', 'req.headers'].map((x) => (body.indexOf(x) === -1 ? Infinity : body.indexOf(x)))))
    }
    expect(readFileSync(path.join(APP, 'app', 'admin', 'layout.tsx'), 'utf8')).toMatch(/await requireAdmin\(\)/)
  })

  test('the public harness is not under /admin and never calls an admin route', () => {
    const client = readFileSync(path.join(APP, 'app', 'uat', 'creator-record-v2', 'PublicUatClient.tsx'), 'utf8')
    expect(Array.from(client.matchAll(/fetch\('([^']+)'/g)).map((m) => m[1])).toEqual(['/api/uat/creator-record-v2/draft'])
    expect(client).not.toMatch(/\/api\/admin\//)
  })
})

// ───────────────────────────────────────────── H4 size

describe('H4 — streamed 32 KB request limit', () => {
  test('declared Content-Length over the limit → 413 before the body is read', async () => {
    const touched = { body: false }
    const req = {
      headers: new Headers({ 'content-type': 'application/json', 'content-length': '40000' }),
      get body() {
        touched.body = true
        return null
      },
    }
    const res = await POST(req as any)
    expect(res.status).toBe(413)
    expect(touched.body).toBe(false)
  })

  test('a streamed body over the limit (no Content-Length) → 413', async () => {
    const chunk = new TextEncoder().encode('x'.repeat(8192))
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 5; i++) c.enqueue(chunk)
        c.close()
      },
    })
    const res = await POST({ headers: new Headers({ 'content-type': 'application/json' }), body: stream } as any)
    expect(res.status).toBe(413)
  })
})

// ───────────────────────────────────────────── H5 strict request

describe('H5 — no uploads, no browser-supplied observations, allowlisted fixtures only', () => {
  const doc = documentForFixture('pdf-pika-pro-no-period')
  test.each([
    ['multipart upload', () => {
      const form = new FormData()
      form.append('file', new Blob(['x']), 'x.pdf')
      return POST(new Request('http://localhost/x', { method: 'POST', body: form }) as any)
    }],
    ['not JSON', () => post('not json')],
    ['unknown fixture id', () => post({ ...state(), documents: [ref('my-own-receipt')] })],
    ['a replay fixture that is not allowlisted', () => post({ ...state(), documents: [ref('pdf-runway-standard-monthly')] })],
    ['a browser-supplied observation', () => post({ ...state(), documents: [{ tool_index: 0, document: doc, review: { document_id: doc.document_id, decision: 'not_reviewed', adopted_value: null } }] })],
    ['an extraction next to the fixture id', () => post({ ...state(), documents: [{ ...ref('pdf-pika-pro-no-period'), extraction: doc.extraction }] })],
    ['a hash next to the fixture id', () => post({ ...state(), documents: [{ ...ref('pdf-pika-pro-no-period'), sha256: doc.sha256 }] })],
    ['a document id in the review', () => post({ ...state(), documents: [{ ...ref('pdf-pika-pro-no-period'), review: { document_id: doc.document_id, decision: 'ignored', adopted_value: null } }] })],
    ['an unknown review decision', () => post({ ...state(), documents: [ref('pdf-pika-pro-no-period', 0, 'approved')] })],
    ['a document for a tool block that does not exist', () => post({ ...state(), documents: [ref('pdf-pika-pro-no-period', 1)] })],
    ['two documents for one tool', () => post({ ...state(), documents: [ref('pdf-pika-pro-no-period'), ref('conflict-reseller-merchant')] })],
    ['an unexpected top-level field (sources)', () => post({ ...state(), sources: 'governed' })],
    ['an unexpected top-level field (view)', () => post({ ...state(), view: {} })],
    ['a mode field', () => post({ ...state(), mode: 'live_model' })],
  ])('%s → 400', async (_n, send) => {
    expect((await send()).status).toBe(400)
  })

  test('the observation for a fixture id is exactly the server replay table’s, whatever the request says', () => {
    for (const f of PUBLIC_UAT_FIXTURES) {
      const d = documentForFixture(f.fixture_id)
      const entry = REPLAY_FIXTURES.find((x) => x.fixture_id === f.fixture_id)!
      expect(d.sha256).toBe(entry.sha256)
      expect(d).toEqual(expect.objectContaining({ extraction_mode: 'fixture_replay', model_calls: 0, replay_fixture_id: f.fixture_id }))
      expect(verifyReturnedDocument({ tool_index: 0, document: d, review: { document_id: d.document_id, decision: 'not_reviewed', adopted_value: null } })).toBe(true)
    }
    const parsed = parsePublicUatRequest({ ...state(), documents: [ref('pdf-pika-pro-no-period', 0, 'adopted', 'Pro')] })
    expect(parsed.ok && documentsFromRefs(parsed.documents)[0].document).toEqual(documentForFixture('pdf-pika-pro-no-period'))
  })

  test('every allowlisted fixture is in the replay table and exam-ready', () => {
    expect(PUBLIC_UAT_FIXTURES.length).toBeGreaterThanOrEqual(8)
    for (const f of publicUatFixtureDocuments()) expect(f.document.outcome).toBe('document_examined')
  })

  const generated = path.join(APP, 'lib', 'creator-record', 'eval', 'fixtures', 'generated')
  ;(existsSync(path.join(generated, 'manifest.json')) ? test : test.skip)('a fixture’s server-built observation equals examining the real synthetic file (when generated locally)', async () => {
    const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8')) as { documents: { id: string; file: string }[] }
    for (const f of PUBLIC_UAT_FIXTURES) {
      const m = manifest.documents.find((x) => x.id === f.fixture_id)!
      const examined = await examineUpload(new Uint8Array(readFileSync(path.join(generated, m.file))), 'x', { mode: 'fixture_replay' })
      const built = documentForFixture(f.fixture_id)
      expect({ ...built, file_name: 'x' }).toEqual({ ...examined, file_name: 'x' })
    }
  })
})

// ───────────────────────────────────────────── H6 parity

describe('H6 — the public harness and the admin prototype produce the same governed guidance', () => {
  const cases: [string, CreatorRecordFormState, ReturnType<typeof ref>[]][] = [
    ['Pika Pro', state(), []],
    ['Pika Pro + Kling', state([{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['kling'], T3: ['Standard'], T4: ['May 2026'] }]), []],
    ['music + stock open items', state([{ T1: ['kling'], T3: ['not_sure'], T4: ['May 2026'] }], { M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] }), []],
    ['unlisted tool', state([{ T1: ['other_tool'], T1X: ['Vidmagic 9000'], T3: ['Pro'], T4: ['May 2026'] }]), []],
    ['adopted plan from a fixture', state(), [ref('pdf-pika-pro-no-period', 0, 'adopted', 'Pro')]],
    ['two fixtures', state([{ T1: ['pika'], T3: ['Standard'], T4: ['May 2026'] }, { T1: ['runway-gen3'], T3: ['not_sure'], T4: ['May 2026'] }]), [ref('conflict-reseller-merchant'), ref('conflict-two-plan-names', 1, 'ignored')]],
  ]

  test.each(cases)('%s', (_n, s, refs) => {
    const admin = buildCreatorRecordDraft({ state: s, sources: pilotSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: RECORD, documents: documentsFromRefs(refs) })
    const pub = buildPublicUatDraft({ state: s, refs, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: RECORD })
    if (!admin.ok || !pub.ok) throw new Error('both must succeed')
    // Same orchestrator, same result.
    expect(pub.internal.guidance).toEqual(admin.guidance)
    expect(pub.internal.view).toEqual(admin.view)
    // The public view changes no interpretation: same cards, open items, omissions, declarations, documents (beyond the origin line).
    const strip = (cards: { claim_id: string; provenance?: unknown }[]) => cards.map(({ claim_id: _c, provenance: _p, ...rest }) => rest)
    expect(strip(pub.view.guidance.cards)).toEqual(strip(admin.view.guidance.cards))
    expect(pub.view.guidance.empty).toBe(admin.view.guidance.empty)
    expect(pub.view.open_items.items.map(({ dependency_id: _d, ...o }) => o)).toEqual(admin.view.open_items.items.map(({ dependency_id: _d, ...o }) => o))
    expect(pub.view.not_shown).toEqual(admin.view.not_shown)
    expect(pub.view.declarations).toEqual(admin.view.declarations)
    expect(pub.view.independent_review).toEqual(admin.view.independent_review)
    expect(pub.view.not_done.slice(0, admin.view.not_done.length)).toEqual(admin.view.not_done)
    expect(pub.view.documents.items.map((d) => d.rows.filter((r) => r.label !== T.public_uat_doc_origin_label))).toEqual(admin.view.documents.items.map((d) => d.rows))
  })

  test('document observations stay display-only: the guidance is the same with and without fixtures', () => {
    const without = buildPublicUatDraft({ state: state(), refs: [], topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: RECORD })
    for (const f of PUBLIC_UAT_FIXTURES) {
      const withDoc = buildPublicUatDraft({ state: state(), refs: [ref(f.fixture_id, 0, 'ignored')], topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-10-28', record: RECORD })
      if (!without.ok || !withDoc.ok) throw new Error('must succeed')
      expect(withDoc.view.guidance).toEqual(without.view.guidance)
      expect(withDoc.internal.guidance.facts).toEqual(without.internal.guidance.facts)
    }
  })
})

// ───────────────────────────────────────────── H7–H10 through the public route

describe('H7–H10 — through the public route', () => {
  const draft = async (body: unknown) => {
    const res = await post(body)
    return { res, data: await res.json() }
  }

  test('H7: every document is labelled as chosen from the synthetic set and as fixture replay with no AI model', async () => {
    const { res, data } = await draft({ ...state([{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['kling'], T3: ['not_sure'], T4: ['May 2026'] }]), documents: [ref('pdf-pika-pro-no-period'), ref('unreadable-dark-image', 1)] })
    expect(res.status).toBe(200)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(res.headers.get('cache-control')).toBe('no-store')
    for (const d of data.view.documents.items) {
      expect(d.rows).toContainEqual({ label: T.public_uat_doc_origin_label, value: T.public_uat_doc_origin })
      expect(d.rows).toContainEqual({ label: T.doc_read_label, value: T.doc_read_replay })
      expect(d.heading).toMatch(/Synthetic test document/)
    }
  })

  test('H8: adopt, own answer and ignore behave as in the admin prototype; a stale adoption is refused (422)', async () => {
    const adopted = await draft({ ...state(), documents: [ref('pdf-pika-pro-no-period', 0, 'adopted', 'Pro')] })
    expect(adopted.res.status).toBe(200)
    expect(adopted.data.view.documents.items[0].review).toBe(T.doc_review.adopted('Pro'))
    const pro = adopted.data.view.guidance.cards.find((c: { explanation: string }) => /Pro plan/.test(c.explanation))
    expect(pro.conclusion_label).toBe(T.conclusion_label.relevant_on_declared_facts)
    const stale = await draft({ ...state([{ T1: ['pika'], T3: ['Standard'], T4: ['May 2026'] }]), documents: [ref('pdf-pika-pro-no-period', 0, 'adopted', 'Pro')] })
    expect(stale.res.status).toBe(422)
    expect(stale.data.issues).toContainEqual({ q_id: 'T3', tool_index: 0, issue: 'stale_document_review' })
    const notShown = await draft({ ...state([{ T1: ['pika'], T3: ['Enterprise'], T4: ['May 2026'] }]), documents: [ref('pdf-pika-pro-no-period', 0, 'adopted', 'Enterprise')] })
    expect(notShown.res.status).toBe(422)
    const own = await draft({ ...state([{ T1: ['pika'], T3: ['Standard'], T4: ['May 2026'] }]), documents: [ref('pdf-pika-pro-no-period', 0, 'entered_different')] })
    expect(own.data.view.documents.items[0].review).toBe(T.doc_review.entered_different)
  })

  test('H9: the designation is in the record title, status, banner, summary, method and "what SI8 did not do"; the unapproved/counsel statement is in the summary', async () => {
    const { data } = await draft(state())
    const v = data.view
    expect(v.header.record_title).toContain(T.public_uat_designation)
    expect(v.header.status).toBe(T.public_uat_status)
    expect(v.banner.title).toBe(T.public_uat_designation)
    expect(v.summary[0]).toContain(T.public_uat_designation)
    expect(v.summary[1]).toBe(T.public_uat_summary_unapproved)
    expect(v.summary[1]).toMatch(/not been reviewed by counsel/)
    expect(v.method[0]).toEqual({ label: T.public_uat_method_run, value: T.public_uat_method_run_value })
    expect(v.not_done).toContain(T.public_uat_not_done)
    expect(v.public_uat).toBe(true)
    // Every evidence and verification limitation is still there.
    for (const line of T.not_done) expect(v.not_done).toContain(line)
    expect(v.declarations.intro).toBe(T.declarations_intro)
  })

  test('H9: the record view renders the title, banner, status and summary for every view (no path drops the designation)', () => {
    const view = readFileSync(path.join(APP, 'components', 'creator-record', 'DraftRecordView.tsx'), 'utf8')
    expect(view).toMatch(/\{view\.header\.record_title\} · \{view\.header\.status\}/)
    expect(view).toMatch(/view\.banner &&/)
    expect(view).toMatch(/view\.summary\.map/)
    const client = readFileSync(path.join(APP, 'app', 'uat', 'creator-record-v2', 'PublicUatClient.tsx'), 'utf8')
    expect(client).toMatch(/T\.public_uat_prepared/)
    expect(client).toMatch(/T\.public_uat_designation/)
    expect(client).toMatch(/showTrace=\{false\} showReferences=\{false\}/)
  })

  test('H9: no banned or clearance wording in any public template or rendered public record', async () => {
    const BANNED = [/\bclear(ed|ance|ing|s)?\b/i, /complian/i, /certif/i, /verif/i, /\bapprov/i, /licensed to|permitted to|\bsafe to\b/i, /applies to you|governed by|does not apply/i, /\bmatch(es|ed)?\b/i, /\bconfirm/i, /contradict/i, /\bprov(e|es|ed|en)\b/i]
    const clean = (t: string) => NEGATION_ALLOWLIST.reduce((s, n) => s.split(n).join(' '), t).split('approved for Creator Records').join(' ')
    const templates = Object.entries(T).filter(([k]) => k.startsWith('public_uat')).map(([, v]) => JSON.stringify(v))
    const { data } = await draft({ ...state([{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }, { T1: ['kling'], T3: ['not_sure'], T4: ['May 2026'] }], { M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] }), documents: [ref('conflict-two-plan-names'), ref('inject-pricing-page-claims-invoice', 1)] })
    const texts = [...templates, JSON.stringify(data.view)]
    const offenders = texts.flatMap((t) => BANNED.filter((re) => re.test(clean(t))).map((re) => `${re}: ${t.slice(0, 120)}`))
    expect(offenders).toEqual([])
  })

  test('H10: no internal trace, publication identifiers, claim or dependency identifiers, or local paths in the public response', async () => {
    const { data } = await draft({ ...state([{ T1: ['kling'], T3: ['not_sure'], T4: ['May 2026'] }], { M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] }), documents: [ref('pdf-kling-pro-monthly')] })
    const all = JSON.stringify(data)
    expect(data.view.trace).toBeUndefined()
    expect(all).not.toMatch(/PILOT-UAT-LEDGER|CLAIM-|"provenance"|publication_entry|bi_status|objective_id|asset_confirmed|editorial_designation|discarded_answers|dropped_facts/)
    expect(all).not.toMatch(/[A-Za-z]:\\\\|\/Users\/|eval\/fixtures|generated\//)
    expect(data.view.guidance.cards.map((c: { claim_id: string }) => c.claim_id)).toEqual(data.view.guidance.cards.map((_: unknown, i: number) => `guidance-${i + 1}`))
  })
})

// ───────────────────────────────────────────── analytics + noindex

describe('analytics exclusion and noindex', () => {
  const runSnippet = (pathname: string) => {
    const sandbox: Record<string, unknown> = { location: { pathname }, Date }
    sandbox.window = sandbox
    vm.runInNewContext(GA_INLINE_SNIPPET, sandbox)
    return sandbox
  }

  test('GA4 is disabled for /uat paths before config; every other path runs exactly the same calls as before', () => {
    for (const p of ['/uat', '/uat/creator-record-v2']) {
      const s = runSnippet(p)
      expect(s[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(true)
      expect(isGaExcludedPath(p)).toBe(true)
    }
    for (const p of ['/', '/crc', '/admin/creator-record-v2', '/uatx', '/record']) {
      const s = runSnippet(p)
      expect(s[`ga-disable-${GA_MEASUREMENT_ID}`]).toBeUndefined()
      const calls = (s.dataLayer as IArguments[]).map((a) => Array.from(a))
      expect(calls.map((c) => c[0])).toEqual(['js', 'config'])
      expect(calls[1]).toEqual(['config', GA_MEASUREMENT_ID])
      expect(isGaExcludedPath(p)).toBe(false)
    }
  })

  test('the root layout uses the shared snippet; the measurement id is unchanged', () => {
    const layout = readFileSync(path.join(APP, 'app', 'layout.tsx'), 'utf8')
    expect(layout).toMatch(/__html: GA_INLINE_SNIPPET/)
    expect(layout).toMatch(/gtag\/js\?id=\$\{GA_MEASUREMENT_ID\}/)
    expect(GA_MEASUREMENT_ID).toBe('G-628BLE9N15')
  })

  test('X-Robots-Tag is set for /uat and /api/uat only; the page metadata is noindex', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(path.join(APP, 'next.config.js'))
    const headers = await config.headers()
    expect(headers).toEqual([
      { source: '/uat/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/uat/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ])
    const page = readFileSync(path.join(APP, 'app', 'uat', 'creator-record-v2', 'page.tsx'), 'utf8')
    expect(page).toMatch(/robots: \{ index: false, follow: false/)
  })
})
