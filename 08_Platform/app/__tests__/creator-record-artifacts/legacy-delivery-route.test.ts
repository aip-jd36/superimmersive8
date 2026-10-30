/**
 * CR-LEGACY-DOCUMENT-SECURITY-1C — GET /api/creator-record/[id]/pdf, wired end to end with a mocked Supabase:
 * a legacy Creator Record PDF is streamed from its recorded object in the legacy bucket, only after the
 * caller is authorized, and nothing is written. A failure never reveals a storage URL.
 */
const SUB = '3f2a9c10-1111-4222-8333-444455556666'
const PATH = 'rights-packages/CR-2026-3F2A9C10_creator-record.pdf'
const URL_ = `https://project.supabase.co/storage/v1/object/public/documents/${PATH}`
const PDF = new TextEncoder().encode('%PDF-1.3 historical')

const state = {
  user: 'owner-1' as string | null,
  owner: 'owner-1',
  admin: false,
  refs: [{ submission_id: SUB, document_path: PATH, document_url: URL_ }] as unknown[],
  refsError: null as unknown,
  download: { data: PDF, error: null } as { data: Uint8Array | null; error: unknown },
  tables: [] as string[],
  writes: [] as string[],
  storage: [] as Array<[string, string]>,
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null }, error: null }) } }),
}))
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      state.tables.push(table)
      const b: Record<string, unknown> = {}
      for (const w of ['insert', 'update', 'upsert', 'delete']) b[w] = () => { state.writes.push(`${table}.${w}`); return b }
      b.select = () => b
      b.eq = () => b
      b.maybeSingle = async () => {
        if (table === 'submissions') return { data: { user_id: state.owner, tier: 'creator_record' }, error: null }
        if (table === 'users') return { data: { is_admin: state.admin }, error: null }
        return { data: null, error: null }     // creator_record_artifacts: no artifact row
      }
      b.then = (res: (v: unknown) => unknown) => res(table === 'rights_packages' ? { data: state.refs, error: state.refsError } : { data: [], error: null })
      return b
    },
    storage: {
      from: (bucket: string) => ({
        download: async (path: string) => {
          state.storage.push([bucket, path])
          const { data, error } = state.download
          return { data: data ? { arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) } : null, error }
        },
        upload: async () => { state.writes.push(`storage.${bucket}.upload`); return { error: null } },
      }),
    },
  },
}))

import { GET } from '@/app/api/creator-record/[id]/pdf/route'

const get = () => GET({} as any, { params: { id: SUB } })

beforeEach(() => {
  Object.assign(state, {
    user: 'owner-1', owner: 'owner-1', admin: false,
    refs: [{ submission_id: SUB, document_path: PATH, document_url: URL_ }], refsError: null,
    download: { data: PDF, error: null }, tables: [], writes: [], storage: [],
  })
})

test('owner → 200 with the original bytes, read from the documents bucket at the recorded path; nothing written', async () => {
  const r = await get()
  expect(r.status).toBe(200)
  expect(r.headers.get('location')).toBeNull()
  expect(r.headers.get('cache-control')).toBe('private, no-store, max-age=0')
  expect(new Uint8Array(await r.arrayBuffer())).toEqual(PDF)
  expect(state.storage).toEqual([['documents', PATH]])
  expect(state.writes).toEqual([])
})

test('admin → 200', async () => {
  Object.assign(state, { user: 'admin-1', admin: true })
  expect((await get()).status).toBe(200)
  expect(state.storage).toEqual([['documents', PATH]])
})

test('anonymous → 401 and an unrelated user → 404, with no rights_packages lookup and no storage read', async () => {
  state.user = null
  expect((await get()).status).toBe(401)
  state.user = 'someone-else'
  expect((await get()).status).toBe(404)
  expect(state.tables).not.toContain('rights_packages')
  expect(state.storage).toEqual([])
})

test.each([
  ['the object is missing', () => { state.download = { data: null, error: { statusCode: '404', message: 'Object not found' } } }],
  ['storage fails', () => { state.download = { data: null, error: { statusCode: '503', message: 'upstream down' } } }],
  ['the reference lookup fails', () => { state.refsError = { code: 'XX000' } }],
  ['the reference is ambiguous', () => { state.refs = [state.refs[0], state.refs[0]] }],
])('%s → 500, no URL, path or detail in the response', async (_label, arrange) => {
  arrange()
  const r = await get()
  expect(r.status).toBe(500)
  expect(r.headers.get('location')).toBeNull()
  expect(await r.text()).not.toMatch(/http|documents|rights-packages|503|XX000|Object not found/)
  expect(state.writes).toEqual([])
})
