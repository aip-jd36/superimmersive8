/**
 * CR-V2-DOC-1 — the evidence routes: authentication, the stop and invite gates BEFORE any body is read,
 * strict multipart shape, and safe download headers. Production ports are replaced by fakes.
 */
const session = { user: '11111111-1111-4111-8111-111111111111' as string | null }
jest.mock('@/lib/creator-record-flow/http', () => {
  const actual = jest.requireActual('@/lib/creator-record-flow/http')
  return { ...actual, sessionUserId: async () => session.user }
})
const admin = { value: false }
jest.mock('@/lib/creator-record-flow/evidence-http', () => {
  const actual = jest.requireActual('@/lib/creator-record-flow/evidence-http')
  return { ...actual, isAdminUser: async () => admin.value }
})
const gateState = { submissions: 'open' as 'open' | 'stopped', invited: true }
const stored = new Map<string, Uint8Array>()
const fakeDeps = () => {
  const { createHash } = jest.requireActual('crypto')
  return {
    get submissions() { return gateState.submissions },
    hasPilotAccess: async () => gateState.invited,
    realDocumentsPermitted: false,
    isSyntheticTestDocument: () => true,
    newId: () => '00000000-0000-4000-8000-000000000001',
    now: () => new Date(),
    store: {
      insertPending: async (row: Record<string, unknown>) => ({ inserted: true, row: { ...row, state: 'pending', created_at: '2026-11-01T00:00:00.000Z' } }),
      markStored: async (id: string, user_id: string) => ({ id, user_id, sha256: createHash('sha256').update(stored.get(`${user_id}/${id}`)!).digest('hex'), media_type: 'application/pdf', byte_size: stored.get(`${user_id}/${id}`)!.length, file_name: 'r.pdf', storage_path: `${user_id}/${id}`, consent_version: 'c', state: 'stored', created_at: '2026-11-01T00:00:00.000Z', stored_at: 'x', deleted_at: null, object_removed_at: null }),
      removePending: async () => true,
      get: async (id: string) => {
        const path = `11111111-1111-4111-8111-111111111111/${id}`
        const b = stored.get(path)
        return b ? { id, user_id: '11111111-1111-4111-8111-111111111111', sha256: createHash('sha256').update(b).digest('hex'), media_type: 'application/pdf', byte_size: b.length, file_name: 'r.pdf', storage_path: path, consent_version: 'c', state: 'stored', created_at: 'x', stored_at: 'x', deleted_at: null, object_removed_at: null } : null
      },
      listStored: async () => [],
      countLive: async () => 0,
      markDeleted: async () => 'deleted',
      markObjectRemoved: async () => undefined,
      pendingCreatedBefore: async () => [],
      deletedWithObject: async () => [],
      logAccess: async () => undefined,
    },
    objects: {
      put: async (path: string, bytes: Uint8Array) => { stored.set(path, bytes) },
      get: async (path: string) => stored.get(path) ?? null,
      remove: async (path: string) => { stored.delete(path) },
    },
  }
}
jest.mock('@/lib/creator-record-flow/evidence-production', () => ({ productionEvidenceDeps: () => fakeDeps() }))

import { GET as list, POST as upload } from '@/app/api/creator-record-v2/evidence/route'
import { DELETE as remove } from '@/app/api/creator-record-v2/evidence/[id]/route'
import { GET as download } from '@/app/api/creator-record-v2/evidence/[id]/file/route'
import { EVIDENCE_CONSENT_DRAFT_VERSION } from '@/lib/creator-record/evidence-intake/contract'

const PDF = new TextEncoder().encode('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n')
function multipart(fields: Record<string, string | Blob>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v as never)
  return new Request('http://local.test/api/creator-record-v2/evidence', { method: 'POST', body: fd })
}
const ID = '00000000-0000-4000-8000-000000000001'

beforeEach(() => {
  session.user = '11111111-1111-4111-8111-111111111111'
  gateState.submissions = 'open'
  gateState.invited = true
  admin.value = false
  stored.clear()
})

test('signed out → 401 on every route', async () => {
  session.user = null
  expect((await list()).status).toBe(401)
  expect((await upload(multipart({ file: new Blob([PDF]), consent: EVIDENCE_CONSENT_DRAFT_VERSION }) as never)).status).toBe(401)
  expect((await remove({} as never, { params: { id: ID } })).status).toBe(401)
  expect((await download({} as never, { params: { id: ID } })).status).toBe(401)
})

test('while the submissions stop is closed, upload answers 503 WITHOUT reading the body; list and delete answer 503', async () => {
  gateState.submissions = 'stopped'
  let pulled = false
  const body = new ReadableStream<Uint8Array>({ pull() { pulled = true } }, { highWaterMark: 0 })
  const req = new Request('http://local.test/x', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body, duplex: 'half' } as RequestInit)
  const res = await upload(req as never)
  expect(res.status).toBe(503)
  expect((await res.json()).code).toBe('submissions_stopped')
  expect(pulled).toBe(false)
  expect((await list()).status).toBe(503)
  expect((await remove({} as never, { params: { id: ID } })).status).toBe(503)
  expect(stored.size).toBe(0)
})

test('an uninvited creator is refused before the body is read', async () => {
  gateState.invited = false
  expect((await upload(multipart({ file: new Blob([PDF]), consent: EVIDENCE_CONSENT_DRAFT_VERSION }) as never)).status).toBe(403)
})

test.each([
  ['no consent field', { file: new Blob([PDF]) }],
  ['an extra field', { file: new Blob([PDF]), consent: EVIDENCE_CONSENT_DRAFT_VERSION, tool_index: '0' }],
  ['a string instead of a file', { file: 'not a file', consent: EVIDENCE_CONSENT_DRAFT_VERSION }],
])('%s → 400, nothing stored', async (_, fields) => {
  expect((await upload(multipart(fields as never) as never)).status).toBe(400)
  expect(stored.size).toBe(0)
})

test('a declared body over the limit → 413 before reading', async () => {
  const req = new Request('http://local.test/x', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(10 * 1024 * 1024) }, body: 'x' })
  expect((await upload(req as never)).status).toBe(413)
})

test('a valid upload is stored (201) and downloads only as a sandboxed, uncached attachment', async () => {
  const res = await upload(multipart({ file: new File([PDF], '..\\evil"name.pdf'), consent: EVIDENCE_CONSENT_DRAFT_VERSION }) as never)
  expect(res.status).toBe(201)
  expect((await res.json()).document).toMatchObject({ id: ID, media_type: 'application/pdf' })
  const file = await download({} as never, { params: { id: ID } })
  expect(file.status).toBe(200)
  expect(file.headers.get('content-disposition')).toBe(`attachment; filename="document-00000000.pdf"`)
  expect(file.headers.get('x-content-type-options')).toBe('nosniff')
  expect(file.headers.get('content-security-policy')).toContain('sandbox')
  expect(file.headers.get('cache-control')).toContain('no-store')
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(PDF)
})

test('another signed-in creator cannot download it (404); an admin can', async () => {
  await upload(multipart({ file: new Blob([PDF]), consent: EVIDENCE_CONSENT_DRAFT_VERSION }) as never)
  session.user = '22222222-2222-4222-8222-222222222222'
  expect((await download({} as never, { params: { id: ID } })).status).toBe(404)
  admin.value = true
  expect((await download({} as never, { params: { id: ID } })).status).toBe(200)
})
