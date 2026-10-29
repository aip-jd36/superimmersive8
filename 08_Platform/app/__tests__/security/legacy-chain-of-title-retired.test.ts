/**
 * CR-PDF-CLAIMS-1B — the legacy Certified Chain of Title generator is retired (fail closed).
 *
 * 1. Authorization is unchanged and checked first: unauthenticated → 401, non-admin → 403,
 *    with the same bodies as before and nothing about the retirement disclosed.
 * 2. An authorized admin receives a stable 410 and nothing else happens: the request body and
 *    the submission are not read, no PDF is rendered, nothing is written, uploaded or emailed.
 * 3. No other active code path can reach the legacy generator or its PDF component, and the
 *    Commercial Assurance Assessment routes do not depend on it.
 */
import fs from 'fs'
import path from 'path'

const state = {
  user: { id: 'admin-1' } as null | { id: string },
  authError: null as null | { message: string },
  isAdmin: true as boolean | null,
  tables: [] as string[],
  writes: [] as string[],
  storage: 0,
  rendered: 0,
  emailed: 0,
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: state.authError }) } }),
}))
jest.mock('@/lib/supabase/admin', () => {
  const builder = (table: string) => {
    state.tables.push(table)
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.eq = () => b
    for (const m of ['insert', 'update', 'upsert', 'delete']) b[m] = () => { state.writes.push(`${table}.${m}`); return b }
    b.single = async () => (table === 'users'
      ? { data: state.isAdmin === null ? null : { is_admin: state.isAdmin }, error: null }
      : { data: { id: 's1', tier: 'si8_certified', status: 'approved', tools_used: '[]' }, error: null })
    b.maybeSingle = async () => ({ data: null, error: null })
    return b
  }
  return {
    supabaseAdmin: {
      from: builder,
      storage: { from: () => { state.storage++; return { upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'x' } }) } } },
    },
  }
})
jest.mock('@/lib/pdf/generateChainOfTitle', () => ({
  generateChainOfTitlePDF: async () => { state.rendered++; return 'https://legacy.example/coc.pdf' },
  generateCreatorRecordPDF: async () => { state.rendered++; return 'https://legacy.example/cr.pdf' },
}))
jest.mock('@/lib/emails', () => new Proxy({}, { get: () => async () => { state.emailed++ } }))

import { POST } from '@/app/api/admin/submissions/[id]/generate-rights-package/route'

const APP = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(APP, p), 'utf8')
const ROUTE = 'app/api/admin/submissions/[id]/generate-rights-package/route.ts'
const RETIRED = {
  error: 'Legacy Chain of Title generation is retired. Nothing was generated or changed. Certified submissions use the Commercial Assurance Assessment workflow.',
  status: 'retired',
}

let bodyReads = 0
function call(body: unknown = { catalogId: 'SI8-2026-0001' }) {
  const req = new Request('http://localhost/api/admin/submissions/s1/generate-rights-package', {
    method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
  const spy = (orig: (...a: unknown[]) => unknown) => (...a: unknown[]) => { bodyReads++; return orig.apply(req, a) }
  ;(req as any).json = spy(req.json); (req as any).text = spy(req.text); (req as any).formData = spy(req.formData)
  return POST(req as any, { params: { id: 's1' } })
}

const noSideEffects = () => {
  expect(state.writes).toEqual([])
  expect(state.tables.filter((t) => t !== 'users')).toEqual([])
  expect(state.storage).toBe(0)
  expect(state.rendered).toBe(0)
  expect(state.emailed).toBe(0)
  expect(bodyReads).toBe(0)
}

beforeEach(() => {
  Object.assign(state, { user: { id: 'admin-1' }, authError: null, isAdmin: true, tables: [], writes: [], storage: 0, rendered: 0, emailed: 0 })
  bodyReads = 0
})

describe('authorization boundary (unchanged, checked first)', () => {
  test('no session → 401 Unauthorized; nothing disclosed or done', async () => {
    state.user = null
    const res = await call()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(state.tables).toEqual([])
    noSideEffects()
  })

  test('auth error → 401', async () => {
    state.authError = { message: 'bad jwt' }
    const res = await call()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    noSideEffects()
  })

  test.each([[false], [null]])('authenticated non-admin (is_admin=%p) → 403 Forbidden; no retirement detail', async (isAdmin) => {
    state.isAdmin = isAdmin
    const res = await call()
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
    noSideEffects()
  })
})

describe('authorized admin → retirement response, no side effects', () => {
  test('410 with the stable retirement body', async () => {
    const res = await call()
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual(RETIRED)
    noSideEffects()
  })

  test.each([
    ['no catalogId', {}],
    ['malformed JSON', '{not json'],
    ['empty body', ''],
  ])('%s → still 410 (the body is never read)', async (_l, body) => {
    const res = await call(body)
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual(RETIRED)
    noSideEffects()
  })

  test('repeated calls are identical and inert', async () => {
    const a = await (await call()).json()
    const b = await (await call()).json()
    expect(a).toEqual(b)
    noSideEffects()
  })
})

describe('the unsafe execution path is removed, not flagged off', () => {
  const src = read(ROUTE)
  test('the route does not import or name the legacy generator, storage or email', () => {
    expect(src).not.toMatch(/generateChainOfTitle|ChainOfTitlePDF|renderToStream|\.storage\b|@\/lib\/emails/)
  })
  test('the route contains no write and no rights_packages access', () => {
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\(|rights_packages|request\.json/)
  })
  test('no feature flag or env switch can re-enable generation', () => {
    expect(src).not.toMatch(/process\.env|searchParams|force/)
  })
})

describe('no alternate active path reaches the legacy generator', () => {
  const SKIP = new Set(['node_modules', '.next', '__tests__', 'coverage'])
  function sources(dir: string): string[] {
    return fs.readdirSync(path.join(APP, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.posix.join(dir, e.name)
      if (e.isDirectory()) return SKIP.has(e.name) ? [] : sources(rel)
      return /\.(ts|tsx|js|jsx)$/.test(e.name) ? [rel] : []
    })
  }
  const files = [...sources('app'), ...sources('lib')]
  const uncommented = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  test('generateChainOfTitlePDF is defined in one module and called nowhere', () => {
    const refs = files.filter((f) => uncommented(read(f)).includes('generateChainOfTitlePDF'))
    expect(refs).toEqual(['lib/pdf/generateChainOfTitle.tsx'])
  })

  test('the Chain of Title PDF component is used only by that module', () => {
    const refs = files.filter((f) => /\bChainOfTitlePDF\b/.test(uncommented(read(f))))
    expect(refs.sort()).toEqual(['lib/pdf/ChainOfTitlePDF.tsx', 'lib/pdf/generateChainOfTitle.tsx'])
  })

  test('the retired endpoint is not rendered in any admin page (its button exists only inside a comment)', () => {
    const pages = files.filter((f) => /\.tsx$/.test(f) && /<GenerateRightsPackageButton\b/.test(uncommented(read(f))))
    expect(pages).toEqual([])
  })

  test('Commercial Assurance Assessment routes do not use the legacy generator or rights packages', () => {
    const assessment = ['approve', 'ensure-assessment', 'generate-report', 'record-report', 'sign', 'sign-off', 'mark-delivered', 'delivery-files', 'publish', 'revoke-publication', 'workbook', 'review-state']
    for (const d of assessment) {
      const dir = path.posix.join('app/api/admin/submissions/[id]', d)
      const inDir = files.filter((x) => x.startsWith(dir + '/'))
      expect([d, inDir.length > 0]).toEqual([d, true])
      for (const f of inDir) {
        expect([f, /generate-rights-package|generateChainOfTitle|ChainOfTitlePDF|rights_packages/.test(read(f))]).toEqual([f, false])
      }
    }
  })
})
