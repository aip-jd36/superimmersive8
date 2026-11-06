/**
 * CR-V2-DOC-LIVE-1B — what the real executor would do behind the lock. The lock is replaced for this file ONLY, and the adapter is a local
 * fake passed in by the test: nothing here can reach a provider. The one real SDK use is constructing its error classes, with no client and
 * no request. In the real build the lock is false (`live-examination-real.test.ts`).
 */
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'node:crypto'
import { extractionMode, LIVE_EXTRACTION_ENV, LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { LIVE_EXTRACTION_MODEL } from '@/lib/creator-record/evidence/live-caller'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { parseExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { profileKey } from '@/lib/creator-record/examination/profile'
import { LIVE_BOUNDS, LIVE_EVALUATION_ENV, worstCaseAttemptUsd } from '@/lib/creator-record/live-examination/controls'
import { parseLiveEnvelope, type LiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import { examineLiveAndRecord, LivePortError, RECEIPT_LIVE_PROFILE, runLiveExamination, type LiveAttemptRow, type LiveExaminationDeps, type LiveStoragePorts } from '@/lib/creator-record/live-examination/examine'
import { loadRealLiveExecutor, LiveExaminationDisabled, type LiveAnthropicAdapter, type RealLiveExecutor } from '@/lib/creator-record/live-examination/real-executor'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { classifyAnthropicFailure, type ProviderFailureKind } from '@/lib/creator-record/receipt-examination/examine.anthropic'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT } from '@/lib/creator-record/receipt-examination/prompt'
import { syntheticPdf } from '@/test-support/synthetic-pdf'

jest.mock('@/lib/creator-record/live-examination/controls', () => {
  const actual = jest.requireActual('@/lib/creator-record/live-examination/controls')
  return { ...actual, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true, liveEvaluationEnabled: (env: Record<string, string | undefined>, a: never, now: Date) => actual.liveEvaluationEnabled(env, a, now, true) }
})

const OWNER = '11111111-1111-4111-8111-111111111111'
const DOC = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-11-06T10:00:00.000Z')
const MODEL = LIVE_EXTRACTION_MODEL
const pdf = (pages: number, salt = 'real-unlocked') => syntheticPdf(pages, salt)

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const BYTES = pdf(1)
const SHA = sha(BYTES)
const RECORD = { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf' as const, byte_size: BYTES.length, state: 'stored' as const }
const REQUEST = { actor_user_id: OWNER, document_id: DOC, profile: { id: 'receipt', version: 1 } }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!.parsed_output
const AUTH = { authorization_id: 'eval-2026-test', expires_at: '2026-11-07T00:00:00.000Z', max_estimated_usd: 5, permitted_documents: [{ sha256: SHA, consent_reference: 'consent-ref-1' }] }
const ENV = { [LIVE_EVALUATION_ENV]: AUTH.authorization_id, CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }

const good = (over: object = {}) => ({ id: 'msg_01', model: MODEL, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 1000, output_tokens: 200 }, parsed_output: OUTPUT, ...over })

function adapter(call: (req: unknown) => Promise<unknown>, classify: (e: unknown) => ProviderFailureKind = () => 'unknown') {
  const caller = jest.fn(call)
  const create = jest.fn(() => caller as never)
  const a: LiveAnthropicAdapter = { createAnthropicReceiptCaller: create, classifyAnthropicFailure: classify }
  return { a, caller, create }
}
const load = (a: LiveAnthropicAdapter, auth: unknown = AUTH, over: object = {}) => loadRealLiveExecutor(auth, { env: ENV, now: () => NOW, loadAdapter: async () => a, ...over })

function deps(executor: RealLiveExecutor, over: Partial<LiveExaminationDeps> = {}): LiveExaminationDeps & { read: jest.Mock } {
  const read = jest.fn(async () => BYTES as Uint8Array)
  return {
    documents: { get: async () => RECORD, readBytes: read },
    isKnownSyntheticFixture: () => false,
    executor,
    profiles: new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]]),
    livePermitted: true,
    now: () => NOW,
    read,
    ...over,
  }
}
const run = async (executor: RealLiveExecutor, over: Partial<LiveExaminationDeps> = {}) => {
  const r = await runLiveExamination(deps(executor, over), REQUEST)
  if (r.kind !== 'envelope') throw new Error(`refused: ${r.code}`)
  return r.envelope
}

describe('opening the v3 lock opens nothing else', () => {
  test('the shared lock and the admin prototype stay closed', () => {
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(extractionMode({ [LIVE_EXTRACTION_ENV]: 'enabled', ...ENV })).toBe('fixture_replay')
  })
})

describe('loading', () => {
  test.each<[string, unknown, object]>([
    ['authorization_invalid', { ...AUTH, extra: 1 }, {}],
    ['authorization_not_in_force', AUTH, { env: { ...ENV, [LIVE_EVALUATION_ENV]: 'another-authorization' } }],
    ['authorization_not_in_force', AUTH, { env: { CREATOR_RECORD_EXTRACTION_API_KEY: 'x' } }],
    ['authorization_not_in_force', AUTH, { now: () => new Date('2026-11-07T00:00:00.000Z') }],
    ['dedicated_key_missing', AUTH, { env: { [LIVE_EVALUATION_ENV]: AUTH.authorization_id, ANTHROPIC_API_KEY: 'the-shared-key-is-not-used' } }],
  ])('%s: the adapter is never loaded', async (reason, auth, over) => {
    const loadAdapter = jest.fn()
    await expect(loadRealLiveExecutor(auth, { env: ENV, now: () => NOW, loadAdapter, ...over })).rejects.toThrow(new LiveExaminationDisabled(reason))
    expect(loadAdapter).not.toHaveBeenCalled()
  })

  test('the model is pinned and the dedicated key and the request timeout are used; building it makes no call', async () => {
    const { a, caller, create } = adapter(async () => good())
    const executor = await load(a)
    expect(create).toHaveBeenCalledWith({ model: MODEL, apiKeyEnv: 'CREATOR_RECORD_EXTRACTION_API_KEY', timeoutMs: 25_000 })
    expect(executor.identity).toEqual({ mode: 'live_model', provider: 'anthropic', model: MODEL })
    expect(caller).not.toHaveBeenCalled()
  })
})

describe('one examination', () => {
  test('uses the existing pipeline and states its provenance at every level', async () => {
    const { a, caller } = adapter(async () => good())
    const executor = await load(a)
    const e = await run(executor)
    expect(parseLiveEnvelope(e)).toEqual(e)
    expect(e).toMatchObject({
      envelope: { version: 3 },
      execution_origin: 'live_model',
      content_class: 'customer_document',
      workflow_authorization: 'not_established',
      executor: { mode: 'live_model', provider: 'anthropic', model: MODEL },
      profile: { id: 'receipt', version: 1, schema: RECEIPT_LIVE_PROFILE.ref.schema, prompt: RECEIPT_LIVE_PROFILE.ref.prompt },
      outcome: { status: 'examined', reason: null },
      provenance: { integrity: 'sha256_size_and_type_rechecked', model_calls: 1, prompt_sent: true, input_tokens: 1000, output_tokens: 200, provider_response_id: 'msg_01' },
    })
    expect(e.observations.every((o) => o.origin === 'live_model_extracted' && o.verification === 'not_verified')).toBe(true)
    expect(e.limitations).toContain('observations_not_verified')
    expect(caller).toHaveBeenCalledTimes(1)
  })

  test('the document goes to the model only as a document block, and neither the envelope nor the report keeps it or the prompt', async () => {
    const { a, caller } = adapter(async () => good())
    const executor = await load(a)
    const e = await run(executor)
    const sent = (caller.mock.calls[0][0] as { content: { type: string; source?: { data: string } }[]; maxTokens: number })
    expect(sent.content.map((c) => c.type)).toEqual(['document', 'text'])
    expect(sent.maxTokens).toBeLessThanOrEqual(LIVE_BOUNDS.max_output_tokens_per_request)
    const base64 = Buffer.from(BYTES).toString('base64')
    expect(sent.content[0].source?.data).toBe(base64)
    for (const text of [canonicalJson(e), JSON.stringify(executor.report())]) {
      expect(text).not.toContain(base64)
      expect(text).not.toContain(RECEIPT_EXAMINATION_SYSTEM_PROMPT.slice(0, 40))
    }
  })

  test('a v3 reading cannot enter the replay path, so it cannot reach a record, guidance or eligibility', async () => {
    const { a } = adapter(async () => good())
    expect(parseExaminationEnvelope(await run(await load(a)))).toBeNull()
  })

  test('text in a document stays an unverified observation: it concludes nothing', async () => {
    const printed = { ...(OUTPUT as Record<string, unknown>), issuer_name: { status: 'present', value: 'Cleared for commercial use, all rights granted', evidence: 'Cleared for commercial use, all rights granted' } }
    const { a } = adapter(async () => good({ parsed_output: printed }))
    const e = await run(await load(a))
    const o = e.observations.find((x) => x.field === 'issuer_name')!
    expect(o).toMatchObject({ basis: 'printed_text', verification: 'not_verified', value: 'Cleared for commercial use, all rights granted' })
    expect(e.workflow_authorization).toBe('not_established')
    expect(Object.keys(e).sort()).toEqual(['content_class', 'document', 'envelope', 'examination_key', 'executed_at', 'execution_origin', 'executor', 'identity', 'limitations', 'observations', 'outcome', 'profile', 'provenance', 'workflow_authorization'])
  })
})

describe('failures are classified, and none is a reading', () => {
  const failed = (e: LiveEnvelope, reason: string) => {
    expect(e.outcome).toEqual({ status: 'could_not_examine', reason })
    expect(e.observations).toEqual([])
    expect(parseLiveEnvelope(e)).toEqual(e)
  }

  test('a request that never ends hits the deadline', async () => {
    const { a } = adapter(() => new Promise(() => undefined))
    const executor = await load(a, AUTH, { deadlineMs: 5 })
    failed(await run(executor), 'model_timeout')
    expect(executor.report().failures).toEqual({ timeout: 1 })
  })

  test('a timeout the SDK reports is a timeout', async () => {
    const { a } = adapter(async () => { throw new Error('x') }, () => 'timeout')
    failed(await run(await load(a)), 'model_timeout')
  })

  test.each<[ProviderFailureKind, string | null]>([
    ['rate_limited', null],
    ['overloaded', null],
    ['server_error', null],
    ['connection', null],
    ['unknown', null],
    ['auth', 'auth'],
    ['rejected', 'rejected'],
  ])('%s is a provider failure, with no error text kept', async (kind, stopped) => {
    const { a, caller } = adapter(async () => { throw new Error('document text that must not survive') }, () => kind)
    const executor = await load(a)
    const e = await run(executor)
    failed(e, 'provider_failure')
    expect(caller).toHaveBeenCalledTimes(1)
    expect(executor.report()).toMatchObject({ failures: { [kind]: 1 }, stopped })
    expect(JSON.stringify(e) + JSON.stringify(executor.report())).not.toContain('must not survive')
  })

  test('the classification uses the SDK error classes', () => {
    const h = new Headers()
    const cases: [ProviderFailureKind, unknown][] = [
      ['timeout', new Anthropic.APIConnectionTimeoutError()],
      ['connection', new Anthropic.APIConnectionError({ message: 'x' })],
      ['rate_limited', new Anthropic.RateLimitError(429, undefined, undefined, h)],
      ['auth', new Anthropic.AuthenticationError(401, undefined, undefined, h)],
      ['auth', new Anthropic.PermissionDeniedError(403, undefined, undefined, h)],
      ['rejected', new Anthropic.BadRequestError(400, undefined, undefined, h)],
      ['rejected', new Anthropic.NotFoundError(404, undefined, undefined, h)],
      ['server_error', new Anthropic.InternalServerError(500, undefined, undefined, h)],
      ['overloaded', new Anthropic.InternalServerError(529, undefined, undefined, h)],
      ['unknown', new Error('Rate limited')],
      ['unknown', undefined],
    ]
    for (const [kind, err] of cases) expect(classifyAnthropicFailure(err)).toBe(kind)
  })

  test('a response from another model is not a reading, and stops the run', async () => {
    const { a } = adapter(async () => good({ model: 'claude-some-other-model' }))
    const executor = await load(a)
    failed(await run(executor), 'provider_failure')
    expect(executor.report()).toMatchObject({ stopped: 'model_mismatch' })
    expect(await runLiveExamination(deps(executor), REQUEST)).toEqual({ kind: 'refused', code: 'live_budget_exhausted' })
  })

  test.each(['max_tokens', 'refusal', 'pause_turn', null])('stop reason %s: a parsed output is not accepted, and the engine retries once', async (stop_reason) => {
    const { a, caller } = adapter(async () => good({ stop_reason }))
    const executor = await load(a)
    const e = await run(executor)
    failed(e, 'structured_output_missing')
    expect(caller).toHaveBeenCalledTimes(2)
    expect(e.provenance.model_calls).toBe(2)
    expect(executor.report().not_end_turn).toBe(2)
  })

  test('an unparseable output gets the one recovery retry, then fails; a retry that works is the reading', async () => {
    const parse = () => { throw new Error('Failed to parse structured output: bad') }
    const twice = adapter(async () => parse())
    const a1 = await load(twice.a)
    failed(await run(a1), 'structured_output_missing')
    expect(twice.caller).toHaveBeenCalledTimes(2)
    expect(a1.report().parse_failures).toBe(2)
    let n = 0
    const once = adapter(async () => (n++ === 0 ? parse() : good()))
    const e = await run(await load(once.a))
    expect(e.outcome.status).toBe('examined')
    expect(e.provenance.model_calls).toBe(2)
  })

  test.each([
    ['a value outside the schema', { document_type: 'nonsense' }],
    ['an added conclusion', { ...(OUTPUT as object), commercial_clearance: 'cleared' }],
    ['a verdict in place of a field', { ...(OUTPUT as object), issuer_name: 'cleared' }],
  ])('%s is schema_invalid', async (_n, parsed_output) => {
    const { a } = adapter(async () => good({ parsed_output }))
    failed(await run(await load(a)), 'schema_invalid')
  })

  test('a test double cannot pass as a real reading', async () => {
    const { a } = adapter(async () => good({ id: 'mock-response-1' }))
    failed(await run(await load(a)), 'provider_failure')
  })

  test('a request above the output bound is not sent', async () => {
    const { a, caller } = adapter(async () => good())
    const executor = await load(a)
    await expect(executor.callModel({ content: [], maxTokens: LIVE_BOUNDS.max_output_tokens_per_request + 1 })).rejects.toThrow('live_provider_failure:rejected')
    expect(caller).not.toHaveBeenCalled()
  })
})

describe('refused before anything is read or spent', () => {
  test('a live identity with no guard does not run', async () => {
    const callModel = jest.fn()
    const r = await runLiveExamination({ ...deps(await load(adapter(async () => good()).a)), executor: { identity: { mode: 'live_model', provider: 'anthropic', model: MODEL }, callModel } }, REQUEST)
    expect(r).toEqual({ kind: 'refused', code: 'live_examination_disabled' })
    expect(callModel).not.toHaveBeenCalled()
  })

  test('the caller must also say the evaluation is in force', async () => {
    const { a, caller } = adapter(async () => good())
    expect(await runLiveExamination(deps(await load(a), { livePermitted: false }), REQUEST)).toEqual({ kind: 'refused', code: 'live_examination_disabled' })
    expect(caller).not.toHaveBeenCalled()
  })

  test('a document the authorization does not name is not read', async () => {
    const { a, caller } = adapter(async () => good())
    const d = deps(await load(a, { ...AUTH, permitted_documents: [{ sha256: 'f'.repeat(64), consent_reference: 'consent-ref-1' }] }))
    expect(await runLiveExamination(d, REQUEST)).toEqual({ kind: 'refused', code: 'document_not_authorized' })
    expect(d.read).not.toHaveBeenCalled()
    expect(caller).not.toHaveBeenCalled()
  })

  test('a stored size over the bound is not read', async () => {
    const { a, caller } = adapter(async () => good())
    const big = { ...RECORD, byte_size: LIVE_BOUNDS.max_document_bytes + 1 }
    const read = jest.fn(async () => BYTES as Uint8Array)
    expect(await runLiveExamination(deps(await load(a), { documents: { get: async () => big, readBytes: read } }), REQUEST)).toEqual({ kind: 'refused', code: 'document_exceeds_live_bounds' })
    expect(read).not.toHaveBeenCalled()
    expect(caller).not.toHaveBeenCalled()
  })

  test.each([
    ['too many pages', pdf(LIVE_BOUNDS.max_pdf_pages + 1)],
    ['pages that cannot be counted', new Uint8Array(Buffer.from('%PDF-1.4\n%no-page-objects\n%%EOF\n'))],
  ])('%s: no model call and no spend reserved', async (_n, bytes) => {
    const { a, caller } = adapter(async () => good())
    const record = { ...RECORD, sha256: sha(bytes), byte_size: bytes.length }
    const executor = await load(a, { ...AUTH, permitted_documents: [{ sha256: sha(bytes), consent_reference: 'consent-ref-1' }] })
    expect(await runLiveExamination(deps(executor, { documents: { get: async () => record, readBytes: async () => bytes } }), REQUEST)).toEqual({ kind: 'refused', code: 'document_exceeds_live_bounds' })
    expect(caller).not.toHaveBeenCalled()
    expect(executor.report().attempts_admitted).toBe(0)
  })

  test('changed bytes, another owner or a known fixture are refused by the existing checks, with no spend', async () => {
    const { a, caller } = adapter(async () => good())
    const executor = await load(a)
    expect(await runLiveExamination(deps(executor, { documents: { get: async () => RECORD, readBytes: async () => pdf(1, 'changed-bytes!') } }), REQUEST)).toEqual({ kind: 'refused', code: 'integrity_mismatch' })
    expect(await runLiveExamination(deps(executor, { documents: { get: async () => ({ ...RECORD, user_id: DOC }), readBytes: async () => BYTES } }), REQUEST)).toEqual({ kind: 'refused', code: 'not_owner' })
    expect(await runLiveExamination(deps(executor, { isKnownSyntheticFixture: () => true }), REQUEST)).toEqual({ kind: 'refused', code: 'live_refuses_known_fixture' })
    expect(caller).not.toHaveBeenCalled()
    expect(executor.report().attempts_admitted).toBe(0)
  })
})

describe('spend', () => {
  const attempt = worstCaseAttemptUsd(MODEL)!

  test('each attempt reserves its planning maximum, and the ceiling refuses the one it cannot cover', async () => {
    const { a, caller } = adapter(async () => good())
    const executor = await load(a, { ...AUTH, max_estimated_usd: attempt * 2.5 })
    expect((await run(executor)).outcome.status).toBe('examined')
    expect((await run(executor)).outcome.status).toBe('examined')
    expect(await runLiveExamination(deps(executor), REQUEST)).toEqual({ kind: 'refused', code: 'live_budget_exhausted' })
    expect(caller).toHaveBeenCalledTimes(2)
    expect(executor.report()).toMatchObject({ attempts_admitted: 2, requests: 2, input_tokens: 2000, output_tokens: 400 })
    expect(executor.report().reserved_usd).toBeCloseTo(attempt * 2, 6)
    expect(executor.report().estimated_usd).toBeCloseTo((2000 * 2 + 400 * 10) / 1_000_000, 6)
  })

  test('a ceiling smaller than one attempt admits none', async () => {
    const { a, caller } = adapter(async () => good())
    expect(await runLiveExamination(deps(await load(a, { ...AUTH, max_estimated_usd: attempt / 2 })), REQUEST)).toEqual({ kind: 'refused', code: 'live_budget_exhausted' })
    expect(caller).not.toHaveBeenCalled()
  })

  test('actual usage above the ceiling stops the run, whatever was planned', async () => {
    const { a } = adapter(async () => good({ usage: { input_tokens: 5_000_000, output_tokens: 0 } }))
    const executor = await load(a)
    await run(executor)
    expect(executor.report().stopped).toBe('over_ceiling')
    expect(await runLiveExamination(deps(executor), REQUEST)).toEqual({ kind: 'refused', code: 'live_budget_exhausted' })
  })

  test('an authorization that expires during a run admits nothing further', async () => {
    const { a, caller } = adapter(async () => good())
    let t = NOW
    const executor = await loadRealLiveExecutor(AUTH, { env: ENV, now: () => t, loadAdapter: async () => a })
    await run(executor)
    t = new Date('2026-11-07T00:00:00.000Z')
    expect(await runLiveExamination(deps(executor), REQUEST)).toEqual({ kind: 'refused', code: 'live_budget_exhausted' })
    expect(caller).toHaveBeenCalledTimes(1)
  })
})

describe('with the storing path', () => {
  function store(over: Partial<LiveStoragePorts> = {}) {
    const rows: LiveAttemptRow[] = []
    let log = 0
    const ports: LiveStoragePorts = {
      getDocument: async () => RECORD,
      logExaminationRead: async () => ++log,
      readObject: async () => BYTES,
      recordLiveAttempt: async (access, text) => {
        const e = JSON.parse(text) as LiveEnvelope
        const row: LiveAttemptRow = { id: `a${rows.length + 1}`, attempt_number: rows.length + 1, examination_key: e.examination_key, document_id: DOC, user_id: OWNER, document_sha256: SHA, envelope_version: 3, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model, outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at, envelope_canonical: text, envelope_sha256: sha256Hex(text), access_log_id: access, created_at: NOW.toISOString() }
        rows.push(row)
        return { attempt_id: row.id, result: 'created' }
      },
      listLiveAttempts: async () => rows.map((r) => ({ ...r })),
      ...over,
    }
    return { ports, rows }
  }
  const core = (executor: RealLiveExecutor) => ({ executor, isKnownSyntheticFixture: () => false, profiles: new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]]), livePermitted: true, now: () => NOW })

  test('retry and idempotency hold: a failure is kept, the reading is stored once, and a held reading costs nothing', async () => {
    const s = store()
    let n = 0
    const { a, caller } = adapter(async () => (n++ === 0 ? (() => { throw new Error('x') })() : good()), () => 'overloaded')
    const executor = await load(a)
    expect(await examineLiveAndRecord({ storage: s.ports, core: core(executor) }, REQUEST)).toEqual({ kind: 'failed', attempt_id: 'a1', reason: 'provider_failure', retryable: true })
    expect(await examineLiveAndRecord({ storage: s.ports, core: core(executor) }, REQUEST)).toMatchObject({ kind: 'examined', attempt_id: 'a2', model_called: true })
    expect(await examineLiveAndRecord({ storage: s.ports, core: core(executor) }, REQUEST)).toMatchObject({ kind: 'examined', attempt_id: 'a2', model_called: false })
    expect(caller).toHaveBeenCalledTimes(2)
    expect(executor.report().attempts_admitted).toBe(2)
  })

  test('today the database refuses live output, and the reading is discarded', async () => {
    const s = store({ recordLiveAttempt: async () => { throw new LivePortError('record', 'live_not_authorized') } })
    const { a } = adapter(async () => good())
    expect(await examineLiveAndRecord({ storage: s.ports, core: core(await load(a)) }, REQUEST)).toEqual({ kind: 'not_recorded', reason: 'live_not_authorized' })
    expect(s.rows).toEqual([])
  })
})
