/**
 * CR-V2-DOC-2C-C-B — the examination persistence adapter with fake ports (order of effects, failure mapping,
 * idempotency, conflicts, retries, strict read-back), and the production port against a mocked Supabase client.
 * The real database contract is exercised by __tests__/db/creator-record-v2-examination-adapter.db.test.ts.
 */

import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildReplayTable, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import type { ExaminationDocumentRecord } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import {
  classifyDatabaseError,
  examineAndRecord,
  ExaminationPortError,
  readExaminationHistory,
  type DatabaseRefusal,
  type ExaminationAdapterDeps,
  type PersistedRunRow,
} from '@/lib/creator-record/examination/persistence'

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const FIX = REPLAY_FIXTURES[0]
const bytesFor = (id: string) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${id}`)])

function rowFor(env: ExaminationEnvelope, text: string, id: string, supersedes: string | null, over: Partial<PersistedRunRow> = {}): PersistedRunRow {
  return {
    id, examination_key: env.examination_key, document_id: env.document.document_id, user_id: OWNER, document_sha256: env.document.sha256,
    envelope_version: env.envelope.version, content_class: env.content_class, workflow_authorization: env.workflow_authorization,
    execution_boundary: 'isolated_synthetic_test', environment_project_ref: 'localpg15examination', profile_id: env.profile.id,
    profile_version: env.profile.version, schema_version: env.profile.schema, prompt_version: env.profile.prompt, executor_mode: env.executor.mode,
    replay_set: env.executor.replay_set, recording_sha256: env.executor.recording_sha256, replay_fixture_id: env.provenance.replay_fixture_id,
    outcome_status: env.outcome.status, outcome_reason: env.outcome.reason, envelope_canonical: text, envelope_sha256: sha256Hex(text),
    supersedes_id: supersedes, access_log_id: 1, uat_grant_id: null, created_at: '2026-11-02T00:00:00.000Z', ...over,
  }
}

/** A world of fake ports that records the order of effects and emulates the database's idempotency rule. */
function world(opts: { fixture?: ReplayFixture; doc?: Partial<ExaminationDocumentRecord>; bytes?: Uint8Array | null } = {}) {
  const fixture = opts.fixture ?? FIX
  const bytes = opts.bytes === undefined ? bytesFor(fixture.fixture_id) : opts.bytes
  const standIn = bytesFor(fixture.fixture_id)
  const doc: ExaminationDocumentRecord = { id: randomUUID(), user_id: OWNER, sha256: sha(standIn), media_type: 'image/png', byte_size: standIn.length, state: 'stored', ...opts.doc }
  const table = buildReplayTable([{ ...fixture, sha256: sha(standIn) }])
  const events: string[] = []
  const runs = new Map<string, { text: string; id: string }>()
  const fail: { log?: ExaminationPortError; read?: Error; record?: ExaminationPortError; get?: Error } = {}
  let logs = 0
  const deps: ExaminationAdapterDeps = {
    core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
    storage: {
      async getDocument(id) { events.push('get'); if (fail.get) throw fail.get; return id === doc.id ? doc : null },
      async logExaminationRead(id, owner) { events.push(`log:${id === doc.id && owner === doc.user_id}`); if (fail.log) throw fail.log; return ++logs },
      async readObject() { events.push('read'); if (fail.read) throw fail.read; return bytes },
      async recordExamination(logId, text) {
        events.push(`record:${logId}`)
        if (fail.record) throw fail.record
        const key = (JSON.parse(text) as ExaminationEnvelope).examination_key
        const existing = runs.get(key)
        if (existing) {
          if (existing.text !== text) throw new ExaminationPortError('record', 'key_conflict')
          return { run_id: existing.id, result: 'existing' }
        }
        const id = randomUUID()
        runs.set(key, { text, id })
        return { run_id: id, result: 'created' }
      },
      async listRuns() { return [] },
    },
  }
  return { deps, doc, events, runs, fail, req: { actor_user_id: OWNER, document_id: doc.id, profile: { id: 'receipt', version: 1 } } }
}

describe('examineAndRecord — order of effects', () => {
  test('the access event is written AFTER the core accepted request, document and owner, and BEFORE the bytes are read; then the envelope is recorded', async () => {
    const w = world()
    const r = await examineAndRecord(w.deps, w.req)
    expect(r.kind).toBe('recorded')
    expect(w.events).toEqual(['get', 'log:true', 'read', 'record:1'])
    if (r.kind === 'recorded') {
      expect(r.result).toBe('created')
      expect([r.envelope.workflow_authorization, r.envelope.content_class]).toEqual(['not_established', 'known_synthetic_fixture'])
      expect(w.runs.get(r.envelope.examination_key)!.text).toBe(canonicalJson(r.envelope))
    }
  })

  test.each<[string, ExaminationPortError, DatabaseRefusal | 'audit_unavailable']>([
    ['the audit store is unavailable', new ExaminationPortError('log_read', null), 'audit_unavailable'],
    ['the database refuses examination reads in this environment', new ExaminationPortError('log_read', 'environment_not_authorized'), 'environment_not_authorized'],
    ['the database refuses the read for this actor', new ExaminationPortError('log_read', 'examination_read_refused'), 'examination_read_refused'],
  ])('when %s, the bytes are never read and nothing is recorded', async (_n, err, reason) => {
    const w = world()
    w.fail.log = err
    expect(await examineAndRecord(w.deps, w.req)).toEqual({ kind: 'not_read', reason })
    expect(w.events).toEqual(['get', 'log:true'])
  })

  test.each([
    ['an invalid request', (w: ReturnType<typeof world>) => ({ ...w.req, authority: 'x' }), 'request', 'invalid_request', []],
    ['an unknown document', (w: ReturnType<typeof world>) => ({ ...w.req, document_id: randomUUID() }), 'document', 'document_not_found', ['get']],
    ['another creator’s document', (w: ReturnType<typeof world>) => ({ ...w.req, actor_user_id: OTHER }), 'ownership', 'not_owner', ['get']],
    ['an unregistered profile', (w: ReturnType<typeof world>) => ({ ...w.req, profile: { id: 'licence', version: 1 } }), 'profile', 'profile_not_registered', []],
  ])('%s is refused by the core before any access event or read', async (_n, mk, stage, code, events) => {
    const w = world()
    expect(await examineAndRecord(w.deps, mk(w))).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage, code }, read_logged: false })
    expect(w.events).toEqual(events)
  })

  test('a pending or deleted document is refused before any access event', async () => {
    for (const state of ['pending', 'deleted'] as const) {
      const w = world({ doc: { state } })
      expect(await examineAndRecord(w.deps, w.req)).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage: 'document', code: 'document_not_stored' }, read_logged: false })
      expect(w.events).toEqual(['get'])
    }
  })

  test('integrity and content refusals after the read are reported with the access event marked as written; nothing is recorded', async () => {
    const missing = world({ bytes: null })
    expect(await examineAndRecord(missing.deps, missing.req)).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage: 'integrity', code: 'object_unavailable' }, read_logged: true })
    const altered = world({ bytes: new Uint8Array([...bytesFor(FIX.fixture_id), 0x20]) })
    expect(await examineAndRecord(altered.deps, altered.req)).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage: 'integrity', code: 'integrity_mismatch' }, read_logged: true })
    const unknown = world()
    unknown.deps.core = { ...unknown.deps.core, fixtures: { isKnownSyntheticFixture: () => false } }
    expect(await examineAndRecord(unknown.deps, unknown.req)).toEqual({ kind: 'refused', refusal: { kind: 'refused', stage: 'content', code: 'not_a_known_synthetic_fixture' }, read_logged: true })
    for (const w of [missing, altered, unknown]) expect(w.events.some((e) => e.startsWith('record'))).toBe(false)
  })

  test('storage failures fail closed with the stage and whether an access event was written', async () => {
    const g = world()
    g.fail.get = new Error('db down')
    expect(await examineAndRecord(g.deps, g.req)).toEqual({ kind: 'unavailable', stage: 'document', read_logged: false })
    const o = world()
    o.fail.read = new Error('bucket down')
    expect(await examineAndRecord(o.deps, o.req)).toEqual({ kind: 'unavailable', stage: 'object', read_logged: true })
  })
})

describe('examineAndRecord — database outcomes', () => {
  test('the database’s environment refusal is reported, never overridden', async () => {
    const w = world()
    w.fail.record = new ExaminationPortError('record', 'environment_not_authorized')
    const r = await examineAndRecord(w.deps, w.req)
    expect([r.kind, r.kind === 'not_recorded' && r.reason]).toEqual(['not_recorded', 'environment_not_authorized'])
  })

  test('a duplicate save is idempotent: the same run, a new access event each time', async () => {
    const w = world()
    const a = await examineAndRecord(w.deps, w.req)
    const b = await examineAndRecord(w.deps, w.req)
    expect([a.kind, b.kind]).toEqual(['recorded', 'recorded'])
    if (a.kind === 'recorded' && b.kind === 'recorded') expect([a.result, b.result, b.run_id]).toEqual(['created', 'existing', a.run_id])
    expect(w.events.filter((e) => e.startsWith('log'))).toHaveLength(2)
  })

  test('a conflicting save (same key, different stored bytes) is reported and the stored run is not replaced', async () => {
    const w = world()
    const first = await examineAndRecord(w.deps, w.req)
    if (first.kind !== 'recorded') throw new Error('expected recorded')
    w.runs.set(first.envelope.examination_key, { text: 'different', id: first.run_id })
    const r = await examineAndRecord(w.deps, w.req)
    expect([r.kind, r.kind === 'not_recorded' && r.reason]).toEqual(['not_recorded', 'key_conflict'])
    expect(w.runs.get(first.envelope.examination_key)!.text).toBe('different')
  })

  test('a persistence failure after the read is safe to retry: the retry converges on one run', async () => {
    const w = world()
    w.fail.record = new ExaminationPortError('record', null)
    const r1 = await examineAndRecord(w.deps, w.req)
    expect([r1.kind, r1.kind === 'not_recorded' && r1.reason]).toEqual(['not_recorded', 'persistence_unavailable'])
    expect(w.runs.size).toBe(0)
    delete w.fail.record
    const r2 = await examineAndRecord(w.deps, w.req)
    expect(r2.kind === 'recorded' && r2.result).toBe('created')
    expect(w.runs.size).toBe(1)
    expect(w.events.filter((e) => e.startsWith('log'))).toHaveLength(2)
  })
})

describe('classifyDatabaseError', () => {
  test.each([
    ['examination_environment_not_authorized', 'environment_not_authorized'],
    ['examination reads are not authorized in this environment', 'environment_not_authorized'],
    ['examination_envelope_invalid', 'envelope_invalid'],
    ['examination_key_mismatch', 'key_mismatch'],
    ['examination_access_not_logged', 'access_not_logged'],
    ['examination_document_mismatch', 'document_mismatch'],
    ['examination_content_not_recognized', 'content_not_recognized'],
    ['examination_key_conflict', 'key_conflict'],
    ['examination_profile_regression', 'profile_regression'],
    ['an examination read is logged only for the owner of a stored document', 'examination_read_refused'],
    ['examination_uat_target_mismatch', 'uat_target_mismatch'],
    ['examination_uat_budget_exhausted', 'uat_budget_exhausted'],
  ])('P0001 "%s" → %s', (message, refusal) => expect(classifyDatabaseError({ code: 'P0001', message })).toBe(refusal))

  test('anything else is not a refusal (treated as unavailable)', () => {
    for (const e of [null, undefined, { code: '42501', message: 'permission denied' }, { code: 'P0001', message: 'something else' }, { code: '42703', message: 'examination_key_conflict' }]) expect(classifyDatabaseError(e)).toBeNull()
  })
})

describe('readExaminationHistory — strict read-back', () => {
  async function chain(versions: number[]) {
    const w = world()
    const rows: PersistedRunRow[] = []
    let prev: string | null = null
    for (const v of versions) {
      const profiles = buildProfileRegistry([{ ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, version: v } }])
      const r = await examineAndRecord({ ...w.deps, core: { ...w.deps.core, profiles } }, { ...w.req, profile: { id: 'receipt', version: v } })
      if (r.kind !== 'recorded') throw new Error(`expected recorded, got ${r.kind}`)
      const id = randomUUID()
      rows.push(rowFor(r.envelope, canonicalJson(r.envelope), id, prev))
      prev = id
    }
    return { rows, doc: w.doc }
  }
  const history = (rows: PersistedRunRow[], owner = OWNER, docId?: string) => readExaminationHistory({ listRuns: async () => rows }, owner, docId ?? rows[0].document_id)

  test('a verified chain comes back in supersession order with no run chosen as current', async () => {
    const { rows } = await chain([1, 2, 3])
    const h = await history([rows[2], rows[0], rows[1]])
    expect(h.kind).toBe('verified')
    if (h.kind === 'verified') {
      expect(h.runs.map((r) => r.envelope.profile.version)).toEqual([1, 2, 3])
      expect(Object.keys(h)).toEqual(['kind', 'runs'])
    }
    expect(await readExaminationHistory({ listRuns: async () => [] }, OWNER, randomUUID())).toEqual({ kind: 'verified', runs: [] })
  })

  test.each<[string, (rows: PersistedRunRow[]) => PersistedRunRow[]]>([
    ['a digest that does not match the stored text', (r) => [{ ...r[0], envelope_sha256: '0'.repeat(64) }]],
    ['non-canonical stored text (re-formatted)', (r) => { const t = JSON.stringify(JSON.parse(r[0].envelope_canonical), null, 1); return [{ ...r[0], envelope_canonical: t, envelope_sha256: sha256Hex(t) }] }],
    ['stored text the strict parser refuses', (r) => { const e = JSON.parse(r[0].envelope_canonical); const t = canonicalJson({ ...e, workflow_authorization: 'established' }); return [{ ...r[0], envelope_canonical: t, envelope_sha256: sha256Hex(t) }] }],
    ['a key that does not recompute', (r) => { const e = JSON.parse(r[0].envelope_canonical); e.provenance.replay_fixture_id = 'conflict-two-plan-names'; const t = canonicalJson({ ...e, executor: { ...e.executor, recording_sha256: 'a'.repeat(64) } }); return [{ ...r[0], envelope_canonical: t, envelope_sha256: sha256Hex(t) }] }],
    ['a column that disagrees with the envelope', (r) => [{ ...r[0], profile_version: 9 }]],
    ['a row for another owner', (r) => [{ ...r[0], user_id: OTHER }]],
    ['a row whose document differs from the one asked for', (r) => [{ ...r[0], document_id: randomUUID() }]],
    ['a recording column that disagrees', (r) => [{ ...r[0], recording_sha256: 'b'.repeat(64) }]],
  ])('fails closed on %s', async (_n, tamper) => {
    const { rows, doc } = await chain([1])
    const h = await readExaminationHistory({ listRuns: async () => tamper(rows) }, OWNER, doc.id)
    expect([h.kind, h.kind === 'unavailable' && h.reason]).toEqual(['unavailable', 'run_integrity'])
  })

  describe('CR-V2-PROD-UAT-B authority stamp (boundary, grant, project ref)', () => {
    const GRANT = '33333333-3333-4333-8333-333333333333'
    const uat = (r: PersistedRunRow): PersistedRunRow => ({ ...r, execution_boundary: 'operator_synthetic_uat', environment_project_ref: 'lehqgcgnenwdmuzudbrs', uat_grant_id: GRANT })

    test('an operator-UAT run verifies on its own and against the exact expected grant and project', async () => {
      const { rows, doc } = await chain([1])
      const ok = await readExaminationHistory({ listRuns: async () => [uat(rows[0])] }, OWNER, doc.id, { boundary: 'operator_synthetic_uat', uat_grant_id: GRANT, project_ref: 'lehqgcgnenwdmuzudbrs' })
      expect(ok.kind).toBe('verified')
      expect((await readExaminationHistory({ listRuns: async () => [uat(rows[0])] }, OWNER, doc.id)).kind).toBe('verified')
      expect((await readExaminationHistory({ listRuns: async () => rows }, OWNER, doc.id, { boundary: 'isolated_synthetic_test', uat_grant_id: null })).kind).toBe('verified')
    })

    test.each<[string, (r: PersistedRunRow) => PersistedRunRow, string]>([
      ['an unknown boundary', (r) => ({ ...r, execution_boundary: 'production' }), 'execution_boundary'],
      ['a malformed project ref', (r) => ({ ...r, environment_project_ref: 'Not-A-Ref' }), 'environment_project_ref'],
      ['an isolated run carrying a grant', (r) => ({ ...r, uat_grant_id: GRANT }), 'uat_grant_id'],
      ['an isolated run stamped with the Production project', (r) => ({ ...r, environment_project_ref: 'lehqgcgnenwdmuzudbrs' }), 'environment_project_ref'],
      ['an operator-UAT run with no grant', (r) => ({ ...uat(r), uat_grant_id: null }), 'uat_grant_id'],
      ['an operator-UAT run with a malformed grant id', (r) => ({ ...uat(r), uat_grant_id: 'grant-1' }), 'uat_grant_id'],
    ])('rejects %s', async (_n, tamper, check) => {
      const { rows, doc } = await chain([1])
      const { verifyRunRow } = await import('@/lib/creator-record/examination/persistence')
      expect(verifyRunRow(tamper(rows[0]), OWNER, doc.id)).toBe(check)
      const h = await readExaminationHistory({ listRuns: async () => [tamper(rows[0])] }, OWNER, doc.id)
      expect([h.kind, h.kind === 'unavailable' && h.reason]).toEqual(['unavailable', 'run_integrity'])
    })

    test.each<[string, Parameters<typeof readExaminationHistory>[3], string]>([
      ['a different expected boundary', { boundary: 'isolated_synthetic_test' }, 'expected_boundary'],
      ['a different expected grant', { boundary: 'operator_synthetic_uat', uat_grant_id: '44444444-4444-4444-8444-444444444444' }, 'expected_uat_grant_id'],
      ['a different expected project', { boundary: 'operator_synthetic_uat', project_ref: 'abcdefghijklmnopqrst' }, 'expected_project_ref'],
    ])('rejects an operator-UAT run against %s', async (_n, expectation, check) => {
      const { rows, doc } = await chain([1])
      const { verifyRunRow } = await import('@/lib/creator-record/examination/persistence')
      expect(verifyRunRow(uat(rows[0]), OWNER, doc.id, expectation)).toBe(check)
      expect((await readExaminationHistory({ listRuns: async () => [uat(rows[0])] }, OWNER, doc.id, expectation)).kind).toBe('unavailable')
    })

    test('the adapter’s Production ref mirrors the governed constant', async () => {
      const { PRODUCTION_PROJECT_REF } = await import('@/lib/creator-record/examination/persistence')
      const { PRODUCTION_SUPABASE_PROJECT_REF } = await import('@/lib/creator-record/governed/publication-authority')
      expect(PRODUCTION_PROJECT_REF).toBe(PRODUCTION_SUPABASE_PROJECT_REF)
    })
  })

  test.each<[string, (rows: PersistedRunRow[]) => PersistedRunRow[]]>([
    ['a missing predecessor', (r) => [r[0], r[2]]],
    ['two roots', (r) => [r[0], { ...r[1], supersedes_id: null }]],
    ['a fork (two successors of one run)', (r) => [r[0], r[1], { ...r[2], supersedes_id: r[0].id }]],
    ['a cycle with no root', (r) => [{ ...r[0], supersedes_id: r[1].id }, r[1]]],
  ])('fails closed on a broken chain: %s', async (_n, tamper) => {
    const { rows, doc } = await chain([1, 2, 3])
    const h = await readExaminationHistory({ listRuns: async () => tamper(rows) }, OWNER, doc.id)
    expect([h.kind, h.kind === 'unavailable' && h.reason]).toEqual(['unavailable', 'chain_integrity'])
  })

  test('a storage failure is unavailable, never an empty history', async () => {
    expect(await readExaminationHistory({ listRuns: async () => { throw new Error('down') } }, OWNER, randomUUID())).toEqual({ kind: 'unavailable', reason: 'storage_unavailable' })
  })
})

describe('production port (mocked Supabase client) and boundaries', () => {
  const calls: { op: string; args: unknown[] }[] = []
  const result: { insert?: unknown; rpc?: unknown } = {}
  beforeAll(() => {
    jest.resetModules()
    jest.doMock('@/lib/supabase/admin', () => {
      const chain = (table: string) => {
        const q: Record<string, (...a: unknown[]) => unknown> = {}
        for (const m of ['select', 'eq', 'maybeSingle']) q[m] = (...a: unknown[]) => { calls.push({ op: `${table}.${m}`, args: a }); return m === 'maybeSingle' ? Promise.resolve({ data: null, error: null }) : q }
        q.insert = (...a: unknown[]) => { calls.push({ op: `${table}.insert`, args: a }); return { select: (...s: unknown[]) => { calls.push({ op: `${table}.insert.select`, args: s }); return { single: () => Promise.resolve(result.insert) } } } }
        return q
      }
      return { supabaseAdmin: { from: chain, rpc: (...a: unknown[]) => { calls.push({ op: 'rpc', args: a }); return Promise.resolve(result.rpc) }, storage: { from: () => ({ download: (p: string) => { calls.push({ op: 'download', args: [p] }); return Promise.resolve({ data: null, error: { status: 404, message: 'not found' } }) } }) } } }
    })
  })
  afterAll(() => jest.dontMock('@/lib/supabase/admin'))

  test('the access event is an owner, examination-purpose insert returning its id; the database refusal is classified', async () => {
    const { examinationStorage } = await import('@/lib/creator-record-flow/examination-production')
    result.insert = { data: { id: '42' }, error: null }
    expect(await examinationStorage.logExaminationRead('d', 'u')).toBe(42)
    expect(calls.find((c) => c.op.endsWith('.insert'))).toEqual({ op: 'creator_record_v2_evidence_access_log.insert', args: [{ document_id: 'd', actor_user_id: 'u', actor_role: 'owner', purpose: 'examination' }] })
    result.insert = { data: null, error: { code: 'P0001', message: 'examination reads are not authorized in this environment' } }
    await expect(examinationStorage.logExaminationRead('d', 'u')).rejects.toMatchObject({ refusal: 'environment_not_authorized' })
  })

  test('recording calls exactly the database write function with the exact text; results and refusals are mapped', async () => {
    const { examinationStorage } = await import('@/lib/creator-record-flow/examination-production')
    result.rpc = { data: [{ run_id: 'r1', result: 'existing' }], error: null }
    expect(await examinationStorage.recordExamination(7, '{"x":1}')).toEqual({ run_id: 'r1', result: 'existing' })
    expect(calls.filter((c) => c.op === 'rpc').pop()).toEqual({ op: 'rpc', args: ['creator_record_v2_record_examination', { p_access_log_id: 7, p_envelope: '{"x":1}' }] })
    result.rpc = { data: null, error: { code: 'P0001', message: 'examination_key_conflict' } }
    await expect(examinationStorage.recordExamination(7, 't')).rejects.toMatchObject({ refusal: 'key_conflict' })
    result.rpc = { data: [{ run_id: 'r1', result: 'replaced' }], error: null }
    await expect(examinationStorage.recordExamination(7, 't')).rejects.toMatchObject({ refusal: null })
  })

  test('the object is read from the DOC-1 path <user>/<document>; a missing object is null', async () => {
    const { examinationStorage } = await import('@/lib/creator-record-flow/examination-production')
    expect(await examinationStorage.readObject({ id: 'doc', user_id: 'usr', sha256: 'x', media_type: 'image/png', byte_size: 1, state: 'stored' })).toBeNull()
    expect(calls.filter((c) => c.op === 'download').pop()).toEqual({ op: 'download', args: ['usr/doc'] })
  })

  test('neither the adapter nor the port can touch the environment marker, a model, or a route', () => {
    for (const rel of ['lib/creator-record/examination/persistence.ts', 'lib/creator-record-flow/examination-production.ts']) {
      const src = readFileSync(path.join(process.cwd(), rel), 'utf8').split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n')
      expect(src).not.toMatch(/creator_record_v2_examination_environment|@anthropic-ai|live-caller|examine\.anthropic|evidence\/config|live_model|import\(|next\/server|NextResponse/)
    }
  })
})
