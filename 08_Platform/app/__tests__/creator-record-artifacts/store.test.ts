/**
 * CR-ARTIFACT-1 — production adapters (store.ts) against a recording fake of
 * the Supabase client: rollout gate, error classification, no-overwrite
 * uploads, compare-and-swap filters.
 */

type Result = { data?: unknown; error?: { code?: string; statusCode?: string; message?: string } | null }
const calls: { table?: string; bucket?: string; op: string; args: unknown[] }[] = []
let nextResult: Result = { data: null, error: null }

function builder(table: string) {
  const b: Record<string, unknown> = {}
  for (const op of ['select', 'eq', 'insert', 'update']) {
    b[op] = (...args: unknown[]) => {
      calls.push({ table, op, args })
      return b
    }
  }
  b.maybeSingle = async () => nextResult
  b.single = async () => nextResult
  b.then = (res: (v: Result) => unknown) => res(nextResult)
  return b
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => builder(table),
    storage: {
      from: (bucket: string) => ({
        download: async (...args: unknown[]) => {
          calls.push({ bucket, op: 'download', args })
          return nextResult
        },
        upload: async (...args: unknown[]) => {
          calls.push({ bucket, op: 'upload', args })
          return nextResult
        },
      }),
    },
  },
}))

import { artifactGateDecision, artifactStatus, artifactTable, isMissingRelation, isObjectExists, isObjectNotFound, privateObjectStore } from '@/lib/creator-record-artifacts/store'
import { CREATOR_RECORD_ARTIFACT_ROLLOUT } from '@/lib/creator-record-artifacts/config'

beforeEach(() => {
  calls.length = 0
  nextResult = { data: null, error: null }
})

describe('rollout eligibility (server-enforced, three states, fail closed)', () => {
  // CR-MVP-STAGE-D: cutover — every new Creator Record issuance uses the private path.
  test('the default mode is "all": every new issuance is private, decided without an allowlist lookup', async () => {
    expect(CREATOR_RECORD_ARTIFACT_ROLLOUT).toBe('all')
    expect(await artifactGateDecision('s')).toBe('allowlisted')
    expect(calls).toHaveLength(0)
  })

  test('mode "allowlist": explicitly allowlisted → "allowlisted"; definitively absent → "not_allowlisted"', async () => {
    nextResult = { data: { submission_id: 's' }, error: null }
    expect(await artifactGateDecision('s', 'allowlist')).toBe('allowlisted')
    expect(calls[0].table).toBe('creator_record_artifact_uat')
    nextResult = { data: null, error: null }
    expect(await artifactGateDecision('s', 'allowlist')).toBe('not_allowlisted')
  })

  test.each([
    ['missing table / migration not applied (PostgREST schema cache)', 'PGRST205'],
    ['missing relation (Postgres)', '42P01'],
    ['connection failure', '08006'],
    ['statement timeout', '57014'],
    ['permission denied', '42501'],
    ['unknown error without a code', undefined],
  ])('mode "allowlist": %s → "unknown" (never treated as not allowlisted)', async (_n, code) => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    nextResult = { data: null, error: { code } }
    expect(await artifactGateDecision('3f2a9c10-1111-4222-8333-444455556666', 'allowlist')).toBe('unknown')
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/3f2a/)
    spy.mockRestore()
  })

  test('mode "off" (rollback) and mode "all" decide without any lookup', async () => {
    expect(await artifactGateDecision('s', 'off')).toBe('not_allowlisted')
    expect(await artifactGateDecision('s', 'all')).toBe('allowlisted')
    expect(calls).toHaveLength(0)
  })
})

describe('artifact status (fail closed)', () => {
  test.each(['PGRST205', '42P01', '08006'])('a lookup error (%s) is thrown, never read as "no artifact"', async (code) => {
    nextResult = { data: null, error: { code } }
    await expect(artifactStatus('s')).rejects.toThrow(`creator_record_artifact_status_failed:${code}`)
  })
  test('a definite absence is null; a row is its status', async () => {
    nextResult = { data: null, error: null }
    expect(await artifactStatus('s')).toBeNull()
    nextResult = { data: { status: 'issued' }, error: null }
    expect(await artifactStatus('s')).toBe('issued')
    expect(isMissingRelation('PGRST205')).toBe(true)
  })
})

describe('artifact table', () => {
  test('insertPending maps a unique violation to "conflict"', async () => {
    nextResult = { data: null, error: { code: '23505' } }
    const r = await artifactTable.insertPending({ submission_id: 's', record_id: 'CR', attempt_id: 'a', storage_path: 's/a.pdf', sha256: 'f'.repeat(64), byte_size: 1, generator_version: 'g', uat: true })
    expect(r).toEqual({ result: 'conflict' })
    expect(calls.find((c) => c.op === 'insert')!.args[0]).toEqual(expect.objectContaining({ status: 'pending' }))
  })

  test('takeOver and markIssued are compare-and-swap on id + attempt + pending status', async () => {
    nextResult = { data: [{ id: 'x' }], error: null }
    expect(await artifactTable.takeOver('x', 'old', { attempt_id: 'new', storage_path: 's/new.pdf', sha256: 'a'.repeat(64), byte_size: 2, generator_version: 'legacy-creator-record-pdf-v3' })).toBe(true)
    expect(calls.filter((c) => c.op === 'eq').map((c) => c.args)).toEqual([['id', 'x'], ['attempt_id', 'old'], ['status', 'pending']])
    calls.length = 0
    nextResult = { data: [], error: null }
    expect(await artifactTable.markIssued('x', 'att', 'b'.repeat(64))).toBe(false)
    expect(calls.filter((c) => c.op === 'eq').map((c) => c.args)).toEqual([['id', 'x'], ['attempt_id', 'att'], ['sha256', 'b'.repeat(64)], ['status', 'pending']])
  })
})

describe('private object store', () => {
  test('uses the private creator-records bucket, never overwrites (upsert: false)', async () => {
    nextResult = { data: {}, error: null }
    expect(await privateObjectStore.put('s/a.pdf', new Uint8Array([1]))).toBe('stored')
    const up = calls.find((c) => c.op === 'upload')!
    expect(up.bucket).toBe('creator-records')
    expect(up.args[2]).toEqual({ contentType: 'application/pdf', upsert: false })
    nextResult = { data: null, error: { statusCode: '409', message: 'The resource already exists' } }
    expect(await privateObjectStore.put('s/a.pdf', new Uint8Array([1]))).toBe('exists')
    nextResult = { data: null, error: { statusCode: '500', message: 'boom' } }
    await expect(privateObjectStore.put('s/a.pdf', new Uint8Array([1]))).rejects.toThrow('creator_record_artifact_upload_failed:500')
  })

  test('download: only a definite "not found" reads as missing; anything else throws', async () => {
    nextResult = { data: null, error: { statusCode: '404', message: 'Object not found' } }
    expect(await privateObjectStore.get('s/a.pdf')).toBeNull()
    nextResult = { data: null, error: { statusCode: '503', message: 'unavailable' } }
    await expect(privateObjectStore.get('s/a.pdf')).rejects.toThrow('creator_record_artifact_download_failed:503')
    nextResult = { data: { arrayBuffer: async () => new Uint8Array([7, 8]).buffer }, error: null }
    expect(await privateObjectStore.get('s/a.pdf')).toEqual(new Uint8Array([7, 8]))
    expect(isObjectNotFound({ message: 'Object not found' })).toBe(true)
    expect(isObjectExists({ message: 'Duplicate' })).toBe(true)
  })
})
