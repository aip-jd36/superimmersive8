/**
 * CR-V2-DOC-LIVE-1A — the closed live-examination contract, exercised with a mock only. No provider, no key, no real document.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineDocument } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { LIVE_ORIGIN_RULES, liveExaminationKey, MOCK_MODEL, parseLiveEnvelope, type LiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import {
  examineLiveAndRecord,
  LIVE_DATABASE_REFUSALS,
  LivePortError,
  MAX_LIVE_ATTEMPTS,
  RECEIPT_LIVE_PROFILE,
  runLiveExamination,
  verifyLiveAttemptRow,
  type LiveAttemptRow,
  type LiveExaminationDeps,
  type LiveExecutor,
  type LiveStoragePorts,
} from '@/lib/creator-record/live-examination/examine'
import { profileKey } from '@/lib/creator-record/examination/profile'
import { mockLiveExecutor, type MockStep } from '@/test-support/mock-live-executor'

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-11-06T10:00:00.000Z')
const FIXTURE = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
const GOOD: MockStep = { output: FIXTURE.parsed_output }
const BYTES = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic-test:live\n%%EOF\n'))
const SHA = createHash('sha256').update(BYTES).digest('hex')
const RECORD = { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf' as const, byte_size: BYTES.length, state: 'stored' as const }
const REQUEST = { actor_user_id: OWNER, document_id: DOC, profile: { id: 'receipt', version: 1 } }
const PROFILES = new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]])
const LIVE_IDENTITY = { mode: 'live_model', provider: 'anthropic', model: 'a-real-model-name' } as const

function coreDeps(executor: LiveExecutor, over: Partial<LiveExaminationDeps> = {}): LiveExaminationDeps {
  return {
    documents: { get: async (id) => (id === DOC ? RECORD : null), readBytes: async () => BYTES },
    isKnownSyntheticFixture: (s) => s === SHA,
    executor,
    profiles: PROFILES,
    livePermitted: false,
    now: () => NOW,
    ...over,
  }
}
async function examined(steps: MockStep[] = [GOOD]): Promise<LiveEnvelope> {
  const r = await runLiveExamination(coreDeps(mockLiveExecutor(steps)), REQUEST)
  if (r.kind !== 'envelope') throw new Error(r.code)
  return r.envelope
}

/** The database's rules, in memory: one reading, first write wins, capped attempts. The DB suite proves the real ones. */
function store(over: Partial<LiveStoragePorts> = {}) {
  const rows: LiveAttemptRow[] = []
  const events: string[] = []
  let logId = 0
  const toRow = (e: LiveEnvelope, access: number): LiveAttemptRow => ({
    id: `attempt-${rows.length + 1}`, attempt_number: rows.length + 1, examination_key: e.examination_key, document_id: e.document.document_id, user_id: OWNER, document_sha256: e.document.sha256,
    envelope_version: 3, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt,
    executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model, outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at,
    envelope_canonical: canonicalJson(e), envelope_sha256: sha256Hex(canonicalJson(e)), access_log_id: access, created_at: NOW.toISOString(),
  })
  const ports: LiveStoragePorts = {
    getDocument: async (id) => (id === DOC ? RECORD : null),
    logExaminationRead: async () => { events.push('log'); return ++logId },
    readObject: async () => { events.push('read'); return BYTES },
    recordLiveAttempt: async (access, text) => {
      events.push('record')
      const e = JSON.parse(text) as LiveEnvelope
      if (rows.some((r) => r.outcome_status === 'examined')) throw new LivePortError('record', 'conflict')
      const row = toRow(e, access)
      rows.push(row)
      return { attempt_id: row.id, result: 'created' }
    },
    listLiveAttempts: async () => rows.map((r) => ({ ...r })),
    ...over,
  }
  return { ports, rows, events, toRow }
}
const adapter = (storage: LiveStoragePorts, executor: LiveExecutor) => {
  const { documents: _d, ...core } = coreDeps(executor)
  return { storage, core }
}

describe('a mocked examination', () => {
  test('succeeds and says it is a mock at every level', async () => {
    const e = await examined()
    expect(parseLiveEnvelope(e)).toEqual(e)
    expect(e).toMatchObject({
      envelope: { version: 3 }, identity: 'execution_key', execution_origin: 'mock_test', executed_at: NOW.toISOString(), content_class: 'known_synthetic_fixture', workflow_authorization: 'not_established',
      executor: { mode: 'mock_test', provider: 'test_double', model: MOCK_MODEL }, outcome: { status: 'examined', reason: null },
      document: { document_id: DOC, sha256: SHA, media_type: 'application/pdf', byte_size: BYTES.length },
      profile: { id: 'receipt', version: 1 },
      provenance: { integrity: 'sha256_size_and_type_rechecked', model_calls: 1, prompt_sent: true, provider_response_id: 'mock-response-1' },
    })
    expect(e.observations.length).toBeGreaterThan(0)
    expect(e.observations.every((o) => o.origin === 'mock_test_double' && o.verification === 'not_verified' && o.source.document_sha256 === SHA)).toBe(true)
    expect(e.limitations).toEqual(expect.arrayContaining(['mock_test_data_not_model_output', 'observations_not_verified']))
  })

  test('the execution key leaves out the time, and depends on the bytes, the document, the profile and the executor', async () => {
    const base = { document_id: DOC, sha256: SHA, profile: RECEIPT_LIVE_PROFILE.ref, executor: mockLiveExecutor([GOOD]).identity }
    const k = liveExaminationKey(base)
    const a = await examined()
    const later = await runLiveExamination(coreDeps(mockLiveExecutor([GOOD]), { now: () => new Date('2026-11-07T00:00:00.000Z') }), REQUEST)
    expect(later.kind === 'envelope' && later.envelope.examination_key).toBe(a.examination_key)
    expect(a.examination_key).toBe(k)
    expect(liveExaminationKey({ ...base, sha256: 'f'.repeat(64) })).not.toBe(k)
    expect(liveExaminationKey({ ...base, document_id: OTHER })).not.toBe(k)
    expect(liveExaminationKey({ ...base, profile: { ...base.profile, prompt: 'other' } })).not.toBe(k)
    expect(liveExaminationKey({ ...base, executor: LIVE_IDENTITY })).not.toBe(k)
  })

  test.each([
    ['malformed output', [{ output: { document_type: 'nonsense' } }], 'schema_invalid'],
    ['no structured output', [{ output: null }], 'structured_output_missing'],
    ['a timeout', ['timeout'], 'model_timeout'],
    ['a provider failure', ['provider_failure'], 'provider_failure'],
    ['a reading that names no response id', [{ output: FIXTURE.parsed_output, response_id: null }], 'provider_failure'],
    ['a response id that hides the mock', [{ output: FIXTURE.parsed_output, response_id: 'msg_01' }], 'provider_failure'],
  ] as [string, MockStep[], string][])('%s is a failed attempt with no observations', async (_n, steps, reason) => {
    const e = await examined(steps)
    expect(parseLiveEnvelope(e)).toEqual(e)
    expect(e.outcome).toEqual({ status: 'could_not_examine', reason })
    expect(e.observations).toEqual([])
    expect(e.limitations).toEqual(['mock_test_data_not_model_output', 'observations_not_verified'])
  })

  test('a refusal means no model call and no envelope', async () => {
    const cases: [string, Partial<LiveExaminationDeps>, unknown][] = [
      ['invalid_request', {}, { ...REQUEST, extra: 1 }],
      ['profile_not_registered', {}, { ...REQUEST, profile: { id: 'receipt', version: 2 } }],
      ['profile_not_registered', {}, { ...REQUEST, profile: { id: 'contract', version: 1 } }],
      ['document_not_found', { documents: { get: async () => null, readBytes: async () => BYTES } }, REQUEST],
      ['document_not_found', { documents: { get: async () => ({ ...RECORD, id: OTHER }), readBytes: async () => BYTES } }, REQUEST],
      ['document_not_stored', { documents: { get: async () => ({ ...RECORD, state: 'pending' as const }), readBytes: async () => BYTES } }, REQUEST],
      ['not_owner', {}, { ...REQUEST, actor_user_id: OTHER }],
      ['object_unavailable', { documents: { get: async () => RECORD, readBytes: async () => null } }, REQUEST],
      ['integrity_mismatch', { documents: { get: async () => RECORD, readBytes: async () => new Uint8Array(Buffer.from('%PDF-1.4\n%another document, same size!')) } }, REQUEST],
      ['integrity_mismatch', { documents: { get: async () => ({ ...RECORD, byte_size: RECORD.byte_size + 1 }), readBytes: async () => BYTES } }, REQUEST],
      ['integrity_mismatch', { documents: { get: async () => ({ ...RECORD, media_type: 'image/png' as const }), readBytes: async () => BYTES } }, REQUEST],
      ['mock_requires_known_fixture', { isKnownSyntheticFixture: () => false }, REQUEST],
    ]
    for (const [code, over, request] of cases) {
      const executor = mockLiveExecutor([GOOD])
      expect(await runLiveExamination(coreDeps(executor, over), request)).toEqual({ kind: 'refused', code })
      expect(executor.calls()).toBe(0)
    }
  })
})

describe('the contract cannot be misrepresented', () => {
  const key = (e: LiveEnvelope) => liveExaminationKey({ document_id: e.document.document_id, sha256: e.document.sha256, profile: e.profile, executor: e.executor })

  test('a mock cannot be relabelled as live, piece by piece or all at once', async () => {
    const e = await examined()
    const live = { execution_origin: 'live_model', executor: LIVE_IDENTITY, content_class: 'customer_document' }
    const rekey = (x: LiveEnvelope) => { const k = key(x); return { ...x, examination_key: k, observations: x.observations.map((o) => ({ ...o, observation_id: k.slice(0, 16) + o.observation_id.slice(16) })) } }
    const relabelled = { ...e, ...live } as unknown as LiveEnvelope
    const steps: unknown[] = [
      { ...e, execution_origin: 'live_model' },
      { ...e, executor: LIVE_IDENTITY },
      rekey({ ...e, executor: LIVE_IDENTITY } as unknown as LiveEnvelope),
      { ...e, content_class: 'customer_document' },
      rekey({ ...e, executor: { ...e.executor, mode: 'live_model' } } as unknown as LiveEnvelope),
      rekey(relabelled),
      rekey({ ...relabelled, observations: e.observations.map((o) => ({ ...o, origin: 'live_model_extracted' })) } as unknown as LiveEnvelope),
      rekey({ ...relabelled, observations: e.observations.map((o) => ({ ...o, origin: 'live_model_extracted' })), limitations: ['observations_not_verified'] } as unknown as LiveEnvelope),
      { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, origin: 'live_model_extracted' } : o)) },
      { ...e, limitations: e.limitations.filter((l) => l !== 'mock_test_data_not_model_output') },
    ]
    for (const s of steps) expect(parseLiveEnvelope(s)).toBeNull()
  })

  test('a live envelope cannot name a test double', async () => {
    const e = await examined()
    const asLive = (executor: object, id: string | null = 'msg_real') => {
      const x = { ...e, execution_origin: 'live_model', executor, content_class: 'customer_document', limitations: ['observations_not_verified'], observations: [], provenance: { ...e.provenance, provider_response_id: id } } as unknown as LiveEnvelope
      return { ...x, examination_key: key(x) }
    }
    expect(parseLiveEnvelope(asLive(LIVE_IDENTITY))).not.toBeNull() // the shape a later, authorized milestone would produce
    expect(parseLiveEnvelope(asLive({ ...LIVE_IDENTITY, provider: 'test_double' }))).toBeNull()
    expect(parseLiveEnvelope(asLive({ ...LIVE_IDENTITY, provider: 'openai' }))).toBeNull()
    expect(parseLiveEnvelope(asLive({ ...LIVE_IDENTITY, model: MOCK_MODEL }))).toBeNull()
    expect(parseLiveEnvelope(asLive({ ...LIVE_IDENTITY, model: 'claude-test' }))).toBeNull()
    expect(parseLiveEnvelope(asLive(LIVE_IDENTITY, 'mock-response-1'))).toBeNull()
    expect(LIVE_ORIGIN_RULES.live_model.providers).toEqual(['anthropic'])
  })

  test('missing or inconsistent provenance is refused', async () => {
    const e = await examined()
    const without = <T extends object>(o: T, k: keyof T) => { const c = { ...o }; delete c[k]; return c }
    for (const k of Object.keys(e) as (keyof LiveEnvelope)[]) expect(parseLiveEnvelope(without(e, k))).toBeNull()
    for (const k of Object.keys(e.provenance) as (keyof LiveEnvelope['provenance'])[]) expect(parseLiveEnvelope({ ...e, provenance: without(e.provenance, k) })).toBeNull()
    for (const k of Object.keys(e.executor) as (keyof LiveEnvelope['executor'])[]) expect(parseLiveEnvelope({ ...e, executor: without(e.executor, k) })).toBeNull()
    for (const k of Object.keys(e.document) as (keyof LiveEnvelope['document'])[]) expect(parseLiveEnvelope({ ...e, document: without(e.document, k) })).toBeNull()
    const bad: unknown[] = [
      { ...e, extra: 1 },
      { ...e, envelope: { ...e.envelope, version: 4 } },
      { ...e, execution_origin: 'human' },
      { ...e, executed_at: 'yesterday' },
      { ...e, identity: 'recording_bound' },
      { ...e, workflow_authorization: 'authorized' },
      { ...e, examination_key: 'a'.repeat(64) },
      { ...e, document: { ...e.document, sha256: 'a'.repeat(64) } },
      { ...e, document: { ...e.document, document_id: OTHER } },
      { ...e, profile: { ...e.profile, version: 2 } },
      { ...e, provenance: { ...e.provenance, integrity: 'unchecked' } },
      { ...e, provenance: { ...e.provenance, model_calls: 0, prompt_sent: false } },
      { ...e, provenance: { ...e.provenance, prompt_sent: false } },
      { ...e, provenance: { ...e.provenance, provider_response_id: null } },
      { ...e, outcome: { status: 'examined', reason: 'model_timeout' } },
      { ...e, outcome: { status: 'could_not_examine', reason: 'model_timeout' } }, // a failure holds no observations
      { ...e, outcome: { status: 'could_not_examine', reason: 'model_error' } },
      { ...e, limitations: [...e.limitations, 'recorded_test_data_not_model_output'] },
      { ...e, limitations: e.limitations.filter((l) => l !== 'observations_not_verified') },
      { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, verification: 'verified' } : o)) },
      { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, source: { document_sha256: 'a'.repeat(64), location: null } } : o)) },
      { ...e, observations: [e.observations[0], e.observations[0]] },
      { ...e, observations: e.observations.map((o, i) => (i === 0 ? { ...o, conclusion: 'cleared' } : o)) },
    ]
    for (const b of bad) expect(parseLiveEnvelope(b)).toBeNull()
  })

  test('v3 cannot enter the replay path, and replay output cannot enter v3', async () => {
    expect(parseExaminationEnvelope(await examined())).toBeNull()
    expect(parseExaminationEnvelope(await examined(['timeout']))).toBeNull()
    const table = buildReplayTable([{ ...FIXTURE, sha256: SHA }])
    const replay = await examineDocument(
      { documents: { get: async () => RECORD, readBytes: async () => BYTES }, fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: buildProfileRegistry([RECEIPT_PROFILE]) },
      REQUEST,
    )
    if (replay.kind !== 'envelope') throw new Error('replay refused')
    expect(parseExaminationEnvelope(replay.envelope)).not.toBeNull()
    expect(parseLiveEnvelope(replay.envelope)).toBeNull()
    expect(parseLiveEnvelope({ ...replay.envelope, envelope: { ...replay.envelope.envelope, version: 3 } })).toBeNull()
  })
})

describe('live stays off', () => {
  test('a live executor reaches no model, even when the caller says it is permitted', async () => {
    for (const livePermitted of [false, true]) {
      const callModel = jest.fn()
      const readBytes = jest.fn(async () => BYTES)
      const r = await runLiveExamination(coreDeps({ identity: LIVE_IDENTITY, callModel }, { livePermitted, documents: { get: async () => RECORD, readBytes } }), REQUEST)
      expect(r).toEqual({ kind: 'refused', code: 'live_examination_disabled' })
      expect(callModel).not.toHaveBeenCalled()
      expect(readBytes).not.toHaveBeenCalled()
    }
  })

  test('a live identity with an unknown provider, or an unknown mode, is refused', async () => {
    const callModel = jest.fn()
    for (const identity of [{ ...LIVE_IDENTITY, provider: 'openai' }, { mode: 'mock_test', provider: 'anthropic', model: MOCK_MODEL }, { mode: 'fixture_replay', provider: 'test_double', model: MOCK_MODEL }])
      expect(await runLiveExamination(coreDeps({ identity, callModel } as unknown as LiveExecutor), REQUEST)).toEqual({ kind: 'refused', code: 'executor_not_permitted' })
    expect(callModel).not.toHaveBeenCalled()
  })
})

describe('retry and idempotency', () => {
  test('audit first: read logged, then bytes, then the record', async () => {
    const s = store()
    const r = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor([GOOD])), REQUEST)
    expect(r).toMatchObject({ kind: 'examined', attempt_id: 'attempt-1', model_called: true })
    expect(s.events).toEqual(['log', 'read', 'record'])
  })

  test('a held reading is returned as is, with no second model call', async () => {
    const s = store()
    const first = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor([GOOD])), REQUEST)
    const second = mockLiveExecutor([{ output: REPLAY_FIXTURES.find((f) => f.fixture_id !== FIXTURE.fixture_id)!.parsed_output }])
    const again = await examineLiveAndRecord(adapter(s.ports, second), REQUEST)
    expect(second.calls()).toBe(0)
    expect(again).toMatchObject({ kind: 'examined', attempt_id: 'attempt-1', model_called: false })
    expect(first.kind === 'examined' && again.kind === 'examined' && canonicalJson(again.envelope) === canonicalJson(first.envelope)).toBe(true)
    expect(s.rows).toHaveLength(1)
  })

  test('two racing attempts: the first write stands and the loser receives it', async () => {
    const s = store()
    const winner = await examined()
    // The list is read before the race is lost: the other attempt is stored between this one's list and its write.
    let lists = 0
    const racing: LiveStoragePorts = {
      ...s.ports,
      listLiveAttempts: async () => { lists += 1; return lists === 1 ? [] : s.ports.listLiveAttempts(OWNER, DOC, 'receipt') },
      recordLiveAttempt: async () => { s.rows.push(s.toRow(winner, 99)); throw new LivePortError('record', 'conflict') },
    }
    const different = REPLAY_FIXTURES.find((f) => f.fixture_id !== FIXTURE.fixture_id && f.media_type === 'application/pdf')!
    const r = await examineLiveAndRecord(adapter(racing, mockLiveExecutor([{ output: different.parsed_output }])), REQUEST)
    expect(r).toMatchObject({ kind: 'examined', attempt_id: s.rows[0].id, model_called: true })
    expect(r.kind === 'examined' && canonicalJson(r.envelope)).toBe(canonicalJson(winner))
  })

  test('retry after a failure: the failure is kept and is never the reading', async () => {
    const s = store()
    const a = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor(['timeout'])), REQUEST)
    expect(a).toEqual({ kind: 'failed', attempt_id: 'attempt-1', reason: 'model_timeout', retryable: true })
    const b = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor(['provider_failure'])), REQUEST)
    expect(b).toEqual({ kind: 'failed', attempt_id: 'attempt-2', reason: 'provider_failure', retryable: true })
    const c = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor([GOOD])), REQUEST)
    expect(c).toMatchObject({ kind: 'examined', attempt_id: 'attempt-3', model_called: true })
    expect(s.rows.map((r) => r.outcome_status)).toEqual(['could_not_examine', 'could_not_examine', 'examined'])
    // And now the reading holds.
    const d = mockLiveExecutor(['timeout'])
    expect(await examineLiveAndRecord(adapter(s.ports, d), REQUEST)).toMatchObject({ kind: 'examined', attempt_id: 'attempt-3', model_called: false })
    expect(d.calls()).toBe(0)
  })

  test('attempts are capped before any model call', async () => {
    const s = store()
    for (let i = 0; i < MAX_LIVE_ATTEMPTS; i++) {
      const r = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor(['timeout'])), REQUEST)
      expect(r).toMatchObject({ kind: 'failed', retryable: i < MAX_LIVE_ATTEMPTS - 1 })
    }
    const next = mockLiveExecutor([GOOD])
    expect(await examineLiveAndRecord(adapter(s.ports, next), REQUEST)).toEqual({ kind: 'attempts_exhausted' })
    expect(next.calls()).toBe(0)
  })

  test('a failure that depends on the file is final', async () => {
    const s = store()
    const failed = await examined(['timeout'])
    s.rows.push(s.toRow({ ...failed, outcome: { status: 'could_not_examine', reason: 'file_too_large' }, provenance: { ...failed.provenance, model_calls: 0, prompt_sent: false } }, 1))
    const next = mockLiveExecutor([GOOD])
    expect(await examineLiveAndRecord(adapter(s.ports, next), REQUEST)).toEqual({ kind: 'not_retryable', reason: 'file_too_large' })
    expect(next.calls()).toBe(0)
  })

  test('no audit, no read and no model', async () => {
    const s = store({ logExaminationRead: async () => { throw new LivePortError('log_read', 'environment_not_authorized') } })
    const executor = mockLiveExecutor([GOOD])
    expect(await examineLiveAndRecord(adapter(s.ports, executor), REQUEST)).toEqual({ kind: 'not_read', reason: 'environment_not_authorized' })
    expect(executor.calls()).toBe(0)
    expect(s.events).toEqual([])
  })

  test('a reading the database did not store is discarded', async () => {
    for (const refusal of ['envelope_invalid', 'key_mismatch', 'document_mismatch', 'content_not_recognized', 'live_not_authorized', 'attempts_exhausted', null]) {
      const s = store({ recordLiveAttempt: async () => { throw new LivePortError('record', refusal) } })
      const r = await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor([GOOD])), REQUEST)
      expect(r).toEqual({ kind: 'not_recorded', reason: refusal ?? 'persistence_unavailable' })
    }
    // Conflict, with no reading to be found afterwards: still nothing.
    const s = store({ recordLiveAttempt: async () => { throw new LivePortError('record', 'conflict') } })
    expect(await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor([GOOD])), REQUEST)).toEqual({ kind: 'not_recorded', reason: 'conflict' })
  })

  test('stored attempts that do not verify stop everything, and nothing is chosen between contradictions', async () => {
    const good = await examined()
    const tampered: [string, (r: LiveAttemptRow) => LiveAttemptRow][] = [
      ['envelope_digest', (r) => ({ ...r, envelope_sha256: 'a'.repeat(64) })],
      ['envelope_digest', (r) => ({ ...r, envelope_canonical: r.envelope_canonical.replace('mock-response-1', 'mock-response-2') })],
      ['examination_key', (r) => ({ ...r, examination_key: 'a'.repeat(64) })],
      ['document_id', (r) => ({ ...r, document_id: OTHER })],
      ['user_id', (r) => ({ ...r, user_id: OTHER })],
      ['execution_origin', (r) => ({ ...r, execution_origin: 'live_model' })],
      ['outcome_status', (r) => ({ ...r, outcome_status: 'could_not_examine' })],
      ['model', (r) => ({ ...r, model: 'a-real-model-name' })],
    ]
    for (const [check, f] of tampered) {
      const s = store()
      const row = f(s.toRow(good, 1))
      expect(verifyLiveAttemptRow(row, OWNER, DOC)).toBe(check)
      s.rows.push(row)
      const executor = mockLiveExecutor([GOOD])
      expect(await examineLiveAndRecord(adapter(s.ports, executor), REQUEST)).toEqual({ kind: 'unavailable', reason: 'attempt_integrity' })
      expect(executor.calls()).toBe(0)
    }
    const s = store()
    s.rows.push(s.toRow(good, 1), s.toRow({ ...good, executed_at: '2026-11-06T11:00:00.000Z' }, 2))
    expect(await examineLiveAndRecord(adapter(s.ports, mockLiveExecutor([GOOD])), REQUEST)).toEqual({ kind: 'unavailable', reason: 'attempt_integrity' })
    const down = store({ listLiveAttempts: async () => { throw new Error('down') } })
    const executor = mockLiveExecutor([GOOD])
    expect(await examineLiveAndRecord(adapter(down.ports, executor), REQUEST)).toEqual({ kind: 'unavailable', reason: 'storage_unavailable' })
    expect(executor.calls()).toBe(0)
  })

  test('every database refusal has a closed code', () => {
    const sql = readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20261108000000_creator_record_v2_live_examination_foundation.sql'), 'utf8')
    const raised = Array.from(sql.matchAll(/RAISE EXCEPTION '([a-z_]+)'/g)).map((m) => m[1])
    expect(raised.length).toBeGreaterThan(5)
    for (const m of raised) expect(Object.keys(LIVE_DATABASE_REFUSALS)).toContain(m)
  })
})

describe('boundaries', () => {
  const roots = ['lib', 'app', 'components', 'scripts'].map((r) => path.join(process.cwd(), r))
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
  const own = path.join(process.cwd(), 'lib', 'creator-record', 'live-examination') + path.sep
  const files = roots.flatMap((r) => { try { return walk(r) } catch { return [] } })

  test('no production code imports the live foundation or the mock, except its own storage ports, which nothing imports', () => {
    const ports = path.join(process.cwd(), 'lib', 'creator-record-flow', 'live-examination-production.ts')
    // CR-V2-DOC-LIVE-1C-B1: and the fixed runner, which only the operator CLI imports (live-evaluation-runner.test.ts).
    const runner = path.join(process.cwd(), 'lib', 'creator-record-flow', 'live-evaluation-runner.ts')
    const cli = path.join(process.cwd(), 'scripts', 'creator-record-live-evaluation.ts')
    // CR-V2-DOC-LIVE-1C-B2B: and the offline synthetic tool, for the live pre-call checks only: the input bound, the price table and the
    // unsafe SDK variables, from `controls`. It reaches no executor, entry point, envelope, engine or mock.
    const synthetic = path.join(process.cwd(), 'lib', 'creator-record', 'eval', 'run-receipt-eval.ts')
    const outside = files.filter((f) => !f.startsWith(own)).filter((f) => /live-examination|mock-live-executor/.test(readFileSync(f, 'utf8')))
    expect(outside.sort()).toEqual([runner, ports, synthetic].sort())
    const syntheticRefs = Array.from(readFileSync(synthetic, 'utf8').matchAll(/['"]([^'"]*live-examination[^'"]*)['"]/g)).map((m) => m[1])
    expect(syntheticRefs).toEqual(['../live-examination/controls'])
    expect(readFileSync(synthetic, 'utf8')).not.toMatch(/mock-live-executor|real-executor|live-examination\/(evaluation|examine|envelope|document-access)|live-evaluation-runner/)
    expect(readFileSync(cli, 'utf8')).not.toMatch(/live-examination|mock-live-executor/)
    expect(readFileSync(runner, 'utf8')).not.toMatch(/mock-live-executor|real-executor/)
    expect(readFileSync(ports, 'utf8')).not.toMatch(/mock-live-executor|real-executor/)
  })

  test('it imports no provider, record, guidance, governance, payment or eligibility code', () => {
    const imports = files.filter((f) => f.startsWith(own)).flatMap((f) => Array.from(readFileSync(f, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g)).map((m) => m[1]))
    expect(Array.from(new Set(imports)).sort()).toEqual([
      '../evidence-intake/contract',
      '../evidence-intake/vocabulary',
      '../evidence/document-observations',
      '../evidence/live-caller', // CR-V2-DOC-LIVE-1B: real-executor.ts, for the pinned model, key and timeout
      '../evidence/pdf-text-layer',
      '../examination/envelope',
      '../examination/examine-document',
      '../examination/profile',
      '../examination/receipt-profile',
      '../receipt-examination/examine',
      '../receipt-examination/examine.anthropic', // CR-V2-DOC-LIVE-1B: real-executor.ts only, dynamically, behind every lock (checked below)
      '../receipt-examination/prompt',
      '../receipt-examination/schema',
      '../record-core/canonical',
      './controls',
      './document-access', // CR-V2-DOC-LIVE-1C-A: evaluation.ts, the one entry point
      './envelope',
      './examine',
      './real-executor', // CR-V2-DOC-LIVE-1C-A: evaluation.ts only (live-examination-real.test.ts)
      '@/lib/interview-engine/anthropic-structured-output-retry',
    ])
    const adapterUsers = files.filter((f) => f.startsWith(own) && /receipt-examination\/examine\.anthropic/.test(readFileSync(f, 'utf8')))
    expect(adapterUsers.map((f) => path.basename(f))).toEqual(['real-executor.ts'])
    const executor = readFileSync(adapterUsers[0], 'utf8')
    expect(executor).toMatch(/import type \{ ProviderFailureKind \} from '\.\.\/receipt-examination\/examine\.anthropic'/)
    expect(executor).not.toMatch(/^import (?!type )[^\n]*examine\.anthropic/m)
    expect(executor).toContain("if (LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD !== true) throw new LiveExaminationDisabled('code_lock')")
    expect(executor.indexOf("throw new LiveExaminationDisabled('code_lock')")).toBeLessThan(executor.indexOf("import('../receipt-examination/examine.anthropic')"))
  })

  test('the earlier comparison is no longer called by anything', () => {
    const callers = files.filter((f) => !f.endsWith(path.join('evidence', 'persisted-comparison.ts')) && /comparePersistedExamination/.test(readFileSync(f, 'utf8')))
    expect(callers).toEqual([])
  })

  test('every gate stays closed', async () => {
    const lib = path.join(process.cwd(), 'lib', 'creator-record')
    expect(readFileSync(path.join(lib, 'evidence', 'config.ts'), 'utf8')).toContain('export const LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: boolean = false')
    expect(readFileSync(path.join(lib, 'live-examination', 'controls.ts'), 'utf8')).toContain('export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false')
    expect(readFileSync(path.join(lib, 'evidence-intake', 'contract.ts'), 'utf8')).toContain('export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = false')
    const { liveExtractionEnabled } = await import('@/lib/creator-record/evidence/config')
    expect(liveExtractionEnabled({ CREATOR_RECORD_LIVE_EXTRACTION: 'enabled' })).toBe(false)
  })
})
