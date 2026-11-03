/**
 * CR-V2-PROD-UAT-B — the operator synthetic UAT logic (lib/creator-record-flow/examination-uat.ts) with fake ports,
 * and static boundaries of the operator CLI (scripts/creator-record-v2-uat/examination-uat.ts). The database
 * contract is proved by __tests__/db/creator-record-v2-operator-uat.db.test.ts.
 */

import { createHash, randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  embeddedSupabaseUrls,
  examineGrantDocument,
  isOperatorSeedGrant,
  newBindingNonce,
  readGrantHistory,
  resolveGrant,
  seedSyntheticDocument,
  serviceKeyRef,
  verifyTarget,
  type SeedPorts,
  type SeedRow,
  type UatGrantStatus,
} from '@/lib/creator-record-flow/examination-uat'
import type { ExaminationAdapterDeps, PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'

const PROD = 'lehqgcgnenwdmuzudbrs'
const STAGING = 'abcdefghijklmnopqrst'
const url = (ref: string) => `https://${ref}.supabase.co`
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`
const PDF = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic-test:uat-unit\n%%EOF\n'))
const STAND_IN = { fixture_id: 'uat-unit-fixture', sha256: sha(PDF), media_type: 'application/pdf', bytes: PDF.length, parsed_output: {} }

function grantStatus(over: Partial<UatGrantStatus> = {}): UatGrantStatus {
  return {
    grant_id: '33333333-3333-4333-8333-333333333333', test_user_id: '11111111-1111-4111-8111-111111111111', document_sha256: STAND_IN.sha256,
    bound_document_id: null, supabase_project_ref: PROD, created_at: '2026-11-02T00:00:00Z', expires_at: '2026-11-02T02:00:00Z',
    active: true, revoked: false, read_events_used: 0, max_read_events: 4, new_runs_used: 0, max_new_runs: 1, ...over,
  }
}
/** A fake live app: one page referencing two scripts; the second embeds the given Supabase URLs. */
const liveApp = (urls: string[]) => async (u: string) => {
  if (u.endsWith('/auth/login')) return '<script src="/_next/static/chunks/a.js"></script><script src="/_next/static/chunks/b.js"></script>'
  if (u.endsWith('/a.js')) return 'console.log(1)'
  if (u.endsWith('/b.js')) return urls.map((x) => `createClient("${x}","anon")`).join(';')
  throw new Error('unexpected fetch ' + u)
}

describe('single-use binding code', () => {
  test('a 32-byte hex code and its SHA-256 (the only value that goes into the grant SQL)', () => {
    const { nonce, sha256 } = newBindingNonce(() => new Uint8Array(32).fill(7))
    expect(nonce).toBe('07'.repeat(32))
    expect(sha256).toBe(sha(nonce))
    expect(newBindingNonce().nonce).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('target verification (layered operator safeguards)', () => {
  const prod = (over: Partial<Parameters<typeof verifyTarget>[0]> = {}, urls = [url(PROD)]) =>
    verifyTarget({ target: 'production', expectRef: PROD, supabaseUrl: url(PROD), serviceKey: jwt({ ref: PROD, role: 'service_role' }), ...over }, { fetchText: liveApp(urls) })

  test('the live app embeds exactly the configured project, which is the expected Production ref, and the key belongs to it', async () => {
    expect(await embeddedSupabaseUrls(liveApp([url(PROD), url(PROD)]))).toEqual([url(PROD)])
    const v = await prod()
    expect([v.ok, v.ref]).toEqual([true, PROD])
    expect(v.checks.map((c) => c.name)).toEqual(['configured project', 'production ref', 'live app binding', 'service key project'])
  })

  test.each<[string, Partial<Parameters<typeof verifyTarget>[0]>, string[], string]>([
    ['the configured URL names another project', { supabaseUrl: url(STAGING) }, [url(PROD)], 'configured project'],
    ['the operator expects a non-Production ref', { expectRef: STAGING, supabaseUrl: url(STAGING) }, [url(STAGING)], 'production ref'],
    ['the live app uses a different project', {}, [url(STAGING)], 'live app binding'],
    ['the live app embeds two projects', {}, [url(PROD), url(STAGING)], 'live app binding'],
    ['the key belongs to another project', { serviceKey: jwt({ ref: STAGING }) }, [url(PROD)], 'service key project'],
    ['a local URL', { supabaseUrl: 'http://localhost:54321' }, [url(PROD)], 'configured project'],
  ])('refuses when %s', async (_n, over, urls, failing) => {
    const v = await prod(over, urls)
    expect(v.ok).toBe(false)
    expect(v.checks.filter((c) => !c.ok).map((c) => c.name)).toContain(failing)
  })

  test('a key without a ref claim leaves that layer unavailable (reported, not failed); an unreachable live app fails closed', async () => {
    const v = await prod({ serviceKey: 'sb_secret_not_a_jwt' })
    expect(v.ok).toBe(true)
    expect(v.checks.find((c) => c.name === 'service key project')!.detail).toMatch(/not verifiable/)
    expect(serviceKeyRef(undefined)).toBe('unverifiable')
    expect(serviceKeyRef('a.b.c')).toBe('unverifiable')
    const down = await verifyTarget({ target: 'production', expectRef: PROD, supabaseUrl: url(PROD), serviceKey: undefined }, { fetchText: async () => { throw new Error('offline') } })
    expect(down.ok).toBe(false)
  })

  test('staging: never the Production ref, and never the project the live app uses', async () => {
    const ok = await verifyTarget({ target: 'staging', expectRef: STAGING, supabaseUrl: url(STAGING), serviceKey: jwt({ ref: STAGING }) }, { fetchText: liveApp([url(PROD)]) })
    expect(ok.ok).toBe(true)
    expect((await verifyTarget({ target: 'staging', expectRef: PROD, supabaseUrl: url(PROD), serviceKey: undefined }, { fetchText: liveApp([url(PROD)]) })).ok).toBe(false)
    expect((await verifyTarget({ target: 'staging', expectRef: STAGING, supabaseUrl: url(STAGING), serviceKey: undefined }, { fetchText: liveApp([url(STAGING)]) })).ok).toBe(false)
  })
})

describe('grant resolution by code', () => {
  test('exactly one grant, for the verified project; anything else refuses', async () => {
    const g = grantStatus()
    expect(await resolveGrant(async () => [g], 'n', PROD)).toEqual({ ok: true, grant: g })
    expect(await resolveGrant(async () => [], 'n', PROD)).toEqual({ ok: false, reason: 'no_grant_for_code' })
    expect(await resolveGrant(async () => [g, g], 'n', PROD)).toEqual({ ok: false, reason: 'ambiguous' })
    expect(await resolveGrant(async () => [g], 'n', STAGING)).toEqual({ ok: false, reason: 'project_mismatch' })
    expect(await resolveGrant(async () => { throw new Error('down') }, 'n', PROD)).toEqual({ ok: false, reason: 'status_unavailable' })
  })
})

describe('seeding exactly one synthetic document (no automatic cleanup)', () => {
  function ports(fail: Partial<Record<'insert' | 'insertThrow' | 'put' | 'get' | 'getNull' | 'getWrong' | 'mark' | 'markFalse', boolean>> = {}) {
    const calls: string[] = []
    const rows: SeedRow[] = []
    const p: SeedPorts = {
      async insertPending(row) { calls.push('insert'); rows.push(row); if (fail.insertThrow) throw new Error('timeout'); return fail.insert ? { ok: false, refused: 'P0001:refused' } : { ok: true } },
      async putObject() { calls.push('put'); if (fail.put) throw new Error('upload') },
      async getObject() { calls.push('get'); if (fail.get) throw new Error('download'); return fail.getNull ? null : fail.getWrong ? new Uint8Array([1, 2, 3]) : PDF },
      async markStored() { calls.push('mark'); if (fail.mark) throw new Error('update'); return !fail.markFalse },
    }
    return { p, calls, rows }
  }
  const opts = { newId: () => '44444444-4444-4444-8444-444444444444', now: () => new Date('2026-11-02T00:00:00Z'), fixtures: [STAND_IN] }

  test('success: one pending operator_synthetic_seed row with NO consent value, the grant named, uploaded without overwrite, read back, then stored', async () => {
    const { p, calls, rows } = ports()
    const r = await seedSyntheticDocument(p, grantStatus(), PDF, opts)
    expect(r).toEqual({ stage: 'stored', document_id: opts.newId(), fixture_id: STAND_IN.fixture_id, sha256: STAND_IN.sha256 })
    expect(calls).toEqual(['insert', 'put', 'get', 'mark'])
    expect(rows[0]).toEqual({
      id: opts.newId(), user_id: grantStatus().test_user_id, sha256: STAND_IN.sha256, media_type: 'application/pdf', byte_size: PDF.length,
      file_name: 'uat-unit-fixture.pdf', storage_path: `${grantStatus().test_user_id}/${opts.newId()}`, consent_version: null,
      origin: 'operator_synthetic_seed', seed_grant_id: grantStatus().grant_id, state: 'pending',
    })
  })

  test.each<[string, Partial<UatGrantStatus>, Uint8Array, string]>([
    ['an inactive grant', { active: false }, PDF, 'grant_not_active'],
    // CR-V2-EXAM-INTEGRATION-X1: a customer_path_uat grant is never seeded (the database refuses it as well).
    ['a customer_path_uat grant', { grant_kind: 'customer_path_uat' }, PDF, 'not_an_operator_seed_grant'],
    ['an already-bound grant', { bound_document_id: randomUUID() }, PDF, 'grant_already_bound'],
    ['bytes DOC-1 validation refuses', {}, new Uint8Array(Buffer.from('not a pdf')), 'bytes_invalid:unsupported_format'],
    ['another fixture than the granted one', { document_sha256: 'a'.repeat(64) }, PDF, 'not_the_granted_fixture'],
  ])('refuses before writing anything for %s', async (_n, over, bytes, reason) => {
    const { p, calls } = ports()
    expect(await seedSyntheticDocument(p, grantStatus(over), bytes, opts)).toEqual({ stage: 'refused_before_write', reason })
    expect(calls).toEqual([])
  })

  test('refuses bytes that are not a committed fixture (the default table), and a database refusal writes nothing further', async () => {
    const { p, calls } = ports()
    expect(await seedSyntheticDocument(p, grantStatus(), PDF, { newId: opts.newId, now: opts.now })).toEqual({ stage: 'refused_before_write', reason: 'not_a_committed_fixture' })
    expect(calls).toEqual([])
    const refused = ports({ insert: true })
    expect(await seedSyntheticDocument(refused.p, grantStatus(), PDF, opts)).toEqual({ stage: 'refused_before_write', reason: 'database_refused:P0001:refused' })
    expect(refused.calls).toEqual(['insert'])
  })

  test.each<[string, Parameters<typeof ports>[0], string, string[]]>([
    ['an insert with no reported outcome', { insertThrow: true }, 'insert_outcome_unknown', ['insert']],
    ['a failed upload', { put: true }, 'pending_without_object', ['insert', 'put']],
    ['a failed read-back', { get: true }, 'object_unverified', ['insert', 'put', 'get']],
    ['an absent object', { getNull: true }, 'object_unverified', ['insert', 'put', 'get']],
    ['an object that does not match', { getWrong: true }, 'object_unverified', ['insert', 'put', 'get']],
    ['a failed stored update', { mark: true }, 'not_marked_stored', ['insert', 'put', 'get', 'mark']],
    ['no pending row to mark', { markFalse: true }, 'not_marked_stored', ['insert', 'put', 'get', 'mark']],
  ])('PARTIAL SEED — %s is contained and reported: the grant stays bound, nothing is cleaned up or retried', async (_n, fail, stage, expectedCalls) => {
    const { p, calls } = ports(fail)
    const r = await seedSyntheticDocument(p, grantStatus(), PDF, opts)
    expect(r).toMatchObject({ stage, document_id: opts.newId(), grant_bound: true, automatic_cleanup: false })
    expect('next' in r && r.next).toMatch(/No automatic cleanup.*Revoke the grant.*never be re-bound/)
    expect(calls).toEqual(expectedCalls)
  })

  test('the seed ports have no delete, remove or overwrite operation at all', () => {
    const { p } = ports()
    expect(Object.keys(p).sort()).toEqual(['getObject', 'insertPending', 'markStored', 'putObject'])
  })
})

describe('examination (once, replay only) and strict read-back', () => {
  function fakeDeps(listRuns: PersistedRunRow[] = []) {
    const seen: string[] = []
    const table = buildReplayTable([STAND_IN])
    const deps: ExaminationAdapterDeps = {
      core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
      storage: {
        async getDocument(id) { seen.push(`get:${id}`); return null },
        async logExaminationRead() { seen.push('log'); return 1 },
        async readObject() { seen.push('read'); return null },
        async recordExamination() { throw new Error('unreachable') },
        async listRuns(owner, doc) { seen.push(`list:${owner}:${doc}`); return listRuns },
      },
    }
    return { deps, seen }
  }

  test('not attempted unless the grant is active and bound; otherwise exactly one adapter call for the grant’s document and test identity', async () => {
    const { deps, seen } = fakeDeps()
    expect(await examineGrantDocument(deps, grantStatus({ active: false, bound_document_id: randomUUID() }))).toEqual({ kind: 'not_attempted', reason: 'grant_not_active' })
    expect(await examineGrantDocument(deps, grantStatus())).toEqual({ kind: 'not_attempted', reason: 'grant_not_bound' })
    // CR-V2-EXAM-INTEGRATION-X1: the operator script never examines a customer-path upload, even when bound.
    expect(await examineGrantDocument(deps, grantStatus({ grant_kind: 'customer_path_uat', bound_document_id: randomUUID() }))).toEqual({ kind: 'not_attempted', reason: 'not_an_operator_seed_grant' })
    // A grant read before 20261106000000 (no grant_kind) and one marked operator_seed are both operator-seeded.
    expect(isOperatorSeedGrant(grantStatus())).toBe(true)
    expect(isOperatorSeedGrant(grantStatus({ grant_kind: 'operator_seed' }))).toBe(true)
    expect(seen).toEqual([])
    const doc = randomUUID()
    const r = await examineGrantDocument(deps, grantStatus({ bound_document_id: doc }))
    expect(r.kind).toBe('refused')
    expect(seen).toEqual([`get:${doc}`])
  })

  test('history reads only the grant document of the test identity and requires the operator-UAT boundary, this grant and project', async () => {
    const doc = randomUUID()
    const isolatedRow = { execution_boundary: 'isolated_synthetic_test', environment_project_ref: 'localpg15examination', uat_grant_id: null } as unknown as PersistedRunRow
    const { deps, seen } = fakeDeps([isolatedRow])
    expect(await readGrantHistory(deps.storage, grantStatus())).toEqual({ kind: 'not_bound' })
    const h = await readGrantHistory(deps.storage, grantStatus({ bound_document_id: doc }))
    expect(h).toMatchObject({ kind: 'unavailable', reason: 'run_integrity' })
    expect(seen).toEqual([`list:${grantStatus().test_user_id}:${doc}`])
    expect(await readGrantHistory(fakeDeps([]).deps.storage, grantStatus({ bound_document_id: doc }))).toEqual({ kind: 'verified', runs: [] })
  })
})

describe('DOC-1 cleanup never removes an operator-seeded document', () => {
  test('when the database refuses removing a stale seeded pending row, cleanupEvidence removes neither the row nor its object, and reports the failure; owner uploads are cleaned as before', async () => {
    const { cleanupEvidence } = await import('@/lib/creator-record/evidence-intake/service')
    type Row = Awaited<ReturnType<Parameters<typeof cleanupEvidence>[0]['store']['pendingCreatedBefore']>>[number]
    const row = (id: string, user: string): Row => ({ id, user_id: user, sha256: 'a'.repeat(64), media_type: 'application/pdf', byte_size: 10, file_name: 'f.pdf', storage_path: `${user}/${id}`, consent_version: null, state: 'pending', created_at: '2026-11-01T00:00:00Z', stored_at: null, deleted_at: null, object_removed_at: null })
    const seeded = row('seeded-row', 'test-identity')
    const owner = { ...row('owner-row', 'creator'), consent_version: 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0' }
    const removedRows: string[] = []
    const removedObjects: string[] = []
    const store = {
      async pendingCreatedBefore() { return [seeded, owner] },
      async deletedWithObject() { return [] },
      // Emulates the database: a seeded row is never deleted by an application role.
      async removePending(id: string) { if (id === seeded.id) throw new Error('creator_record_evidence_store_remove_pending_P0001'); removedRows.push(id); return true },
      async markObjectRemoved() { throw new Error('unreachable') },
    }
    const objects = { async remove(path: string) { removedObjects.push(path) } }
    const logs: string[] = []
    const r = await cleanupEvidence({ store: store as never, objects: objects as never, now: () => new Date('2026-11-02T00:00:00Z'), log: (e: string) => logs.push(e) })
    expect(r).toEqual({ pending_removed: 1, objects_removed: 0, failures: 1 })
    expect(removedRows).toEqual([owner.id])
    expect(removedObjects).toEqual([owner.storage_path])
    expect(logs).toEqual(['creator_record_evidence_cleanup_failures'])
  })
})

describe('static boundaries: route-free, replay-only, no grant authority, no deletion', () => {
  const root = process.cwd()
  const code = (rel: string) => readFileSync(path.join(root, rel), 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n')
  const CLI = 'scripts/creator-record-v2-uat/examination-uat.ts'
  const MODULE = 'lib/creator-record-flow/examination-uat.ts'

  test('neither the module nor the CLI touches the grants table or the marker, deletes, removes, overwrites, reaches a model or a route', () => {
    for (const rel of [MODULE, CLI]) {
      const src = code(rel)
      expect([rel, src]).not.toEqual([rel, expect.stringMatching(/creator_record_v2_examination_uat_grants|creator_record_v2_examination_environment|\.delete\(|\.remove\(|upsert:\s*true|@anthropic-ai|live-caller|evidence\/config|next\/server|NextResponse|revoked_at/)])
    }
    const cli = code(CLI)
    expect([...cli.matchAll(/\.rpc\(\s*([A-Z_a-z.'"]+)/g)].map((m) => m[1])).toEqual(['UAT_STATUS_FUNCTION'])
    expect(cli).toContain('upsert: false')
  })

  test('the CLI creates a Supabase client only after the target checks pass', () => {
    const cli = code(CLI)
    const verified = cli.indexOf('if (!verification.ok || !verification.ref)')
    expect(verified).toBeGreaterThan(0)
    for (const late of ["import('../../lib/supabase/admin')", "import('../../lib/creator-record-flow/examination-production')"]) expect(cli.indexOf(late)).toBeGreaterThan(verified)
    expect(cli).not.toMatch(/^import[^\n]*(supabase\/admin|examination-production)/m)
  })

  test('only the operator CLI imports the UAT module (no route, page, job or customer flow)', () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
    const files = ['lib', 'app', 'components', 'scripts'].flatMap((r) => { try { return walk(path.join(root, r)) } catch { return [] } })
    const rel = (f: string) => path.relative(root, f).split(path.sep).join('/')
    expect(files.filter((f) => /(from\s+|import\s*\(\s*)['"][^'"]*creator-record-flow\/examination-uat['"]/.test(readFileSync(f, 'utf8'))).map(rel)).toEqual([CLI])
  })
})
