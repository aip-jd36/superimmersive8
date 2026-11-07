/**
 * CR-V2-DOC-LIVE-1C-A — what the entry point would do behind the lock. The lock is replaced for this file ONLY. The adapter is a local fake
 * and every port is in memory, including a ledger with the database's rules, so nothing here can reach a provider or a database. The real
 * database rules are proved in `__tests__/db/creator-record-v2-live-evaluation.db.test.ts`.
 */
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { LIVE_EXTRACTION_MODEL } from '@/lib/creator-record/evidence/live-caller'
import { profileKey } from '@/lib/creator-record/examination/profile'
import { LIVE_EVALUATION_ENV, toMicroUsd, worstCaseAttemptUsd } from '@/lib/creator-record/live-examination/controls'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { PreparedBindingRow } from '@/lib/creator-record/live-examination/document-access'
import type { LiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import { EvaluationPortError, MAX_AUTHORIZATION_DAYS, runAuthorizedEvaluation, verifyDurableAuthorization, type DurableAuthorization, type EvaluationDeps, type EvaluationPorts } from '@/lib/creator-record/live-examination/evaluation'
import { RECEIPT_LIVE_PROFILE, type LiveAttemptRow } from '@/lib/creator-record/live-examination/examine'
import { loadRealLiveExecutor, type LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import type { ProviderFailureKind } from '@/lib/creator-record/receipt-examination/examine.anthropic'
import { syntheticPdf } from '@/test-support/synthetic-pdf'
import { createHash } from 'node:crypto'

jest.mock('@/lib/creator-record/live-examination/controls', () => {
  const actual = jest.requireActual('@/lib/creator-record/live-examination/controls')
  return { ...actual, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true, liveEvaluationEnabled: (env: Record<string, string | undefined>, a: never, now: Date) => actual.liveEvaluationEnabled(env, a, now, true) }
})

const OPERATOR = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC = '33333333-3333-4333-8333-333333333333'
const PREPARED = '44444444-4444-4444-8444-444444444444'
const DRAFT = '55555555-5555-4555-8555-555555555555'
const NOW = new Date('2026-11-06T10:00:00.000Z')
const ENV_REF = 'abcdefghijklmnopqrst'
const EVAL = 'eval-2026-test'
const CREDENTIAL = 'operator-session-token-0001'
const BYTES = syntheticPdf(1, 'evaluation-unlocked')
const SHA = createHash('sha256').update(BYTES).digest('hex')
const RECORD = { id: DOC, user_id: OPERATOR, sha256: SHA, media_type: 'application/pdf' as const, byte_size: BYTES.length, state: 'stored' as const }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!.parsed_output
const PROFILES = new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]])
const RESERVE = toMicroUsd(worstCaseAttemptUsd(LIVE_EXTRACTION_MODEL)!)
const REQUEST = { credential: CREDENTIAL, evaluation_id: EVAL, prepared_id: PREPARED, document_id: DOC, tool_index: 0 }
const ENV = { [LIVE_EVALUATION_ENV]: EVAL, CREATOR_RECORD_EXTRACTION_API_KEY: 'stub-key-not-real' }
const good = (over: object = {}) => ({ id: 'msg_01', model: LIVE_EXTRACTION_MODEL, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 1000, output_tokens: 200 }, parsed_output: OUTPUT, ...over })

const canonical = canonicalJson({ documents: { items: [{ document_id: DOC, sha256: SHA, tool_index: 0 }] } })
const PREPARED_ROW: PreparedBindingRow = { id: PREPARED, user_id: OPERATOR, canonical, sha256: sha256Hex(canonical), draft_id: DRAFT, version: 2, status: 'reviewed', latest_version: 2 }

/** An in-memory evaluation database with the evaluation schema's rules: authority, ledger, one reading, three attempts. */
function world(over: { auth?: Partial<DurableAuthorization>; ports?: Partial<EvaluationPorts>; maxSpend?: number; maxAttempts?: number } = {}) {
  const events: string[] = []
  const reservations: { id: string; reserved: number; charged: number | null; usage: unknown }[] = []
  const attempts: LiveAttemptRow[] = []
  const auth: DurableAuthorization = {
    evaluation_id: EVAL, operator_user_id: OPERATOR, environment_ref: ENV_REF, provider: 'anthropic', model: LIVE_EXTRACTION_MODEL, profile_id: 'receipt', profile_version: 1,
    max_attempts: over.maxAttempts ?? 18, max_spend_micro_usd: over.maxSpend ?? 5_000_000, attempt_reserve_micro_usd: RESERVE, created_at: '2026-11-05T10:00:00.000Z', expires_at: '2026-11-12T10:00:00.000Z',
    document_id: DOC, document_sha256: SHA, authority_reference: 'consent-ref-0001', spent_micro_usd: 0, reservations_used: 0, ...over.auth,
  }
  const spent = () => reservations.reduce((n, r) => n + (r.charged ?? r.reserved), 0)
  const evaluation: EvaluationPorts = {
    authenticateOperator: async (c) => { events.push('authenticate'); return c === CREDENTIAL ? { user_id: OPERATOR } : null },
    preflight: async (e, o, d) => {
      events.push('preflight')
      // The fake database answers for the request it was given; what it returns is then checked by the application.
      if (e !== EVAL || o !== OPERATOR || d !== DOC) throw new EvaluationPortError('preflight', 'authorization_not_found')
      return { ...auth, spent_micro_usd: spent(), reservations_used: reservations.length }
    },
    reserve: async () => {
      events.push('reserve')
      if (reservations.length >= auth.max_attempts) throw new EvaluationPortError('reserve', 'attempts_exhausted')
      if (spent() + auth.attempt_reserve_micro_usd > auth.max_spend_micro_usd) throw new EvaluationPortError('reserve', 'budget_exhausted')
      const r = { id: `res-${reservations.length + 1}`, reserved: auth.attempt_reserve_micro_usd, charged: null as number | null, usage: null as unknown }
      reservations.push(r)
      return { reservation_id: r.id, reserved_micro_usd: r.reserved }
    },
    settle: async (id, usage) => {
      events.push('settle')
      const r = reservations.find((x) => x.id === id)!
      if (r.charged !== null) throw new EvaluationPortError('settle', 'reservation_settled')
      r.charged = Math.max(r.reserved, usage.estimated_micro_usd)
      r.usage = usage
      return { charged_micro_usd: r.charged }
    },
    record: async (resId, access, text) => {
      events.push('record')
      const e = JSON.parse(text) as LiveEnvelope
      if (attempts.some((a) => a.outcome_status === 'examined')) throw new EvaluationPortError('record', 'conflict')
      const row: LiveAttemptRow = { id: `att-${attempts.length + 1}`, attempt_number: attempts.length + 1, examination_key: e.examination_key, document_id: DOC, user_id: OPERATOR, document_sha256: SHA, envelope_version: 3, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model, outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at, envelope_canonical: text, envelope_sha256: sha256Hex(text), access_log_id: access, created_at: NOW.toISOString() }
      attempts.push(row)
      return { attempt_id: row.id, result: 'created' }
    },
    listAttempts: async () => { events.push('list'); return attempts.map((a) => ({ ...a })) },
    ...over.ports,
  }
  let log = 0
  const documents = {
    getDocument: async (id: string) => { events.push('get_document'); return id === DOC ? RECORD : null },
    logExaminationRead: async () => { events.push('log_read'); return ++log },
    readObject: async () => { events.push('read'); return BYTES },
  }
  return { events, reservations, attempts, auth, evaluation, documents }
}

function adapter(call: () => Promise<unknown> = async () => good(), classify: (e: unknown) => ProviderFailureKind = () => 'unknown') {
  const caller = jest.fn(call)
  const load = jest.fn(async (): Promise<LiveAnthropicAdapter> => ({ createAnthropicReceiptCaller: () => caller as never, classifyAnthropicFailure: classify }))
  return { caller, load }
}

function deps(w: ReturnType<typeof world>, a = adapter(), over: Partial<EvaluationDeps> = {}): EvaluationDeps {
  return { evaluation: w.evaluation, documents: w.documents, prepared: { getPrepared: async () => PREPARED_ROW }, environmentRef: ENV_REF, profiles: PROFILES, isKnownSyntheticFixture: () => false, env: ENV, now: () => NOW, loadAdapter: a.load, ...over }
}

describe('the full order', () => {
  test('every check, then the reservation, then the model, then the record, then the settlement', async () => {
    const w = world()
    const a = adapter()
    const r = await runAuthorizedEvaluation(deps(w, a), REQUEST)
    expect(r).toMatchObject({ kind: 'completed', result: { kind: 'examined', model_called: true }, reservation_refusal: null, settlement: { status: 'settled', charged_micro_usd: RESERVE } })
    // The document row is read twice: once for the binding, once by the examination itself. The bytes, once, after the audit.
    expect(w.events).toEqual(['authenticate', 'preflight', 'get_document', 'list', 'get_document', 'log_read', 'read', 'reserve', 'record', 'settle'])
    expect(a.caller).toHaveBeenCalledTimes(1)
    expect(w.reservations[0].usage).toEqual({ requests: 1, input_tokens: 1000, output_tokens: 200, usage_complete: true, estimated_micro_usd: toMicroUsd((1000 * 2 + 200 * 10) / 1_000_000) })
    if (r.kind !== 'completed' || r.result.kind !== 'examined') throw new Error('not examined')
    expect(r.result.envelope).toMatchObject({ execution_origin: 'live_model', content_class: 'customer_document', workflow_authorization: 'not_established', executor: { mode: 'live_model', provider: 'anthropic', model: LIVE_EXTRACTION_MODEL } })
    expect(r.result.envelope.observations.every((o) => o.origin === 'live_model_extracted' && o.verification === 'not_verified')).toBe(true)
  })

  test('a held reading is returned with no reservation and no model call', async () => {
    const w = world()
    await runAuthorizedEvaluation(deps(w), REQUEST)
    const a = adapter()
    const again = await runAuthorizedEvaluation(deps(w, a), REQUEST)
    expect(again).toMatchObject({ kind: 'completed', result: { kind: 'examined', model_called: false }, settlement: { status: 'not_reserved' } })
    expect(a.caller).not.toHaveBeenCalled()
    expect(w.reservations).toHaveLength(1)
  })
})

describe('refused before anything is read, reserved or sent', () => {
  const nothingHappened = (w: ReturnType<typeof world>, a: ReturnType<typeof adapter>) => {
    expect(w.events.filter((e) => ['log_read', 'read', 'reserve', 'record', 'settle'].includes(e))).toEqual([])
    expect(a.caller).not.toHaveBeenCalled()
  }

  test('an unauthenticated operator, or an identity service that is down', async () => {
    for (const [d, code] of [[{}, 'operator_not_authenticated'], [{ ports: { authenticateOperator: async () => { throw new Error('down') } } }, 'operator_unavailable'], [{ ports: { authenticateOperator: async () => ({ user_id: 'not-a-uuid' }) } }, 'operator_not_authenticated']] as const) {
      const w = world(d as never)
      const a = adapter()
      expect(await runAuthorizedEvaluation(deps(w, a), { ...REQUEST, credential: 'a-token-that-is-not-valid' })).toEqual({ kind: 'refused', stage: 'operator', code })
      nothingHappened(w, a)
      expect(a.load).not.toHaveBeenCalled()
    }
  })

  test('a caller-supplied authorization is not accepted: the request has no place for one', async () => {
    const w = world()
    const a = adapter()
    expect(await runAuthorizedEvaluation(deps(w, a), { ...REQUEST, authorization: { authorization_id: EVAL } })).toEqual({ kind: 'refused', stage: 'request', code: 'invalid_request' })
    expect(w.events).toEqual([])
  })

  test.each([
    'authorization_not_found', 'operator_mismatch', 'authorization_revoked', 'authorization_expired', 'environment_mismatch', 'environment_not_established', 'document_not_authorized', 'document_mismatch',
  ])('the database refuses: %s', async (refusal) => {
    const w = world({ ports: { preflight: async () => { throw new EvaluationPortError('preflight', refusal) } } })
    const a = adapter()
    expect(await runAuthorizedEvaluation(deps(w, a), REQUEST)).toEqual({ kind: 'refused', stage: 'authorization', code: refusal })
    nothingHappened(w, a)
    expect(a.load).not.toHaveBeenCalled()
  })

  test('persistence unavailable before anything else: no read, no adapter, no model', async () => {
    const w = world({ ports: { preflight: async () => { throw new EvaluationPortError('preflight', null) } } })
    const a = adapter()
    expect(await runAuthorizedEvaluation(deps(w, a), REQUEST)).toEqual({ kind: 'refused', stage: 'authorization', code: 'authorization_unavailable' })
    nothingHappened(w, a)
    expect(a.load).not.toHaveBeenCalled()
  })

  test.each<[string, Partial<DurableAuthorization> | null, Partial<EvaluationDeps>]>([
    ['operator_mismatch', { operator_user_id: OTHER }, {}],
    ['evaluation_mismatch', { evaluation_id: 'eval-2026-other' }, {}],
    ['environment_mismatch', { environment_ref: 'zyxwvutsrqponmlkjihg' }, {}],
    ['environment_mismatch', { environment_ref: 'lehqgcgnenwdmuzudbrs' }, { environmentRef: 'lehqgcgnenwdmuzudbrs' }],
    ['model_mismatch', { model: 'claude-other-model' }, {}],
    ['model_mismatch', { provider: 'other' }, {}],
    ['profile_not_registered', { profile_version: 2 }, {}],
    ['authorization_duration', { expires_at: new Date(Date.parse('2026-11-05T10:00:00.000Z') + (MAX_AUTHORIZATION_DAYS + 1) * 86_400_000).toISOString() }, {}],
    ['authorization_expired', { expires_at: '2026-11-06T09:59:59.000Z' }, {}],
    ['authorization_expired', { created_at: '2026-11-06T10:00:01.000Z' }, {}],
    ['document_not_authorized', { document_id: OTHER }, {}],
    ['document_not_authorized', { document_sha256: 'bad' }, {}],
    ['authority_reference_missing', { authority_reference: '' }, {}],
    ['authorization_shape', { max_spend_micro_usd: 20_000_000 }, {}],
  ])('what the database returned is checked again: %s', async (code, auth, over) => {
    const w = world({ auth: auth ?? {} })
    const a = adapter()
    expect(await runAuthorizedEvaluation(deps(w, a, over), REQUEST)).toEqual({ kind: 'refused', stage: 'authorization', code })
    nothingHappened(w, a)
    expect(a.load).not.toHaveBeenCalled()
  })

  test('an unsafe SDK variable in the process environment refuses, even when the env passed in is clean', async () => {
    const saved = process.env.ANTHROPIC_LOG
    process.env.ANTHROPIC_LOG = 'debug'
    try {
      const w = world()
      const a = adapter()
      expect(await runAuthorizedEvaluation(deps(w, a), REQUEST)).toEqual({ kind: 'refused', stage: 'executor', code: 'unsafe_sdk_environment' })
      nothingHappened(w, a)
      expect(a.load).not.toHaveBeenCalled()
    } finally {
      if (saved === undefined) delete process.env.ANTHROPIC_LOG
      else process.env.ANTHROPIC_LOG = saved
    }
  })

  test('a per-attempt reservation below the planning maximum is refused', async () => {
    const w = world({ auth: { attempt_reserve_micro_usd: RESERVE - 1 } })
    const a = adapter()
    expect(await runAuthorizedEvaluation(deps(w, a), REQUEST)).toEqual({ kind: 'refused', stage: 'cost', code: 'reserve_below_planning_maximum' })
    nothingHappened(w, a)
  })

  test('an unsafe SDK environment, or a missing local intent, refuses the executor', async () => {
    for (const [env, code] of [[{ ...ENV, ANTHROPIC_BASE_URL: 'https://x.invalid' }, 'unsafe_sdk_environment'], [{ ...ENV, ANTHROPIC_LOG: 'debug' }, 'unsafe_sdk_environment'], [{ ...ENV, [LIVE_EVALUATION_ENV]: 'eval-2026-other' }, 'authorization_not_in_force'], [{ [LIVE_EVALUATION_ENV]: EVAL }, 'dedicated_key_missing']] as const) {
      const w = world()
      const a = adapter()
      expect(await runAuthorizedEvaluation(deps(w, a, { env }), REQUEST)).toEqual({ kind: 'refused', stage: 'executor', code })
      nothingHappened(w, a)
      expect(a.load).not.toHaveBeenCalled()
    }
  })

  test.each<[string, Partial<PreparedBindingRow> | null]>([
    ['a superseded prepared version', { version: 2, latest_version: 3 }],
    ['a prepared version with an unknown status', { status: 'withdrawn' }],
    ['another user’s prepared version', { user_id: OTHER }],
    ['a prepared version that does not exist', null],
  ])('%s does not bind', async (_n, change) => {
    const w = world()
    const a = adapter()
    const r = await runAuthorizedEvaluation(deps(w, a, { prepared: { getPrepared: async () => (change === null ? null : { ...PREPARED_ROW, ...change }) } }), REQUEST)
    expect(r).toMatchObject({ kind: 'completed', result: { kind: 'refused', code: 'document_not_bound', read_logged: false }, settlement: { status: 'not_reserved' } })
    nothingHappened(w, a)
  })

  test('a superseded binding does not return an earlier reading either', async () => {
    const w = world()
    await runAuthorizedEvaluation(deps(w), REQUEST)
    const r = await runAuthorizedEvaluation(deps(w, adapter(), { prepared: { getPrepared: async () => ({ ...PREPARED_ROW, latest_version: 3 }) } }), REQUEST)
    expect(r).toMatchObject({ kind: 'completed', result: { kind: 'refused', code: 'document_not_bound' } })
    expect(JSON.stringify(r)).not.toContain('observations')
  })

  test('a deleted document, another tool, or another owner', async () => {
    const cases: [Partial<EvaluationDeps>, string][] = [
      [{ documents: { ...world().documents, getDocument: async () => ({ ...RECORD, state: 'deleted' as const }) } }, 'document_not_stored'],
      [{ documents: { ...world().documents, getDocument: async () => ({ ...RECORD, user_id: OTHER }) } }, 'not_owner'],
    ]
    for (const [over, code] of cases) {
      const w = world()
      const a = adapter()
      expect(await runAuthorizedEvaluation(deps(w, a, over), REQUEST)).toMatchObject({ kind: 'completed', result: { kind: 'refused', code } })
      expect(a.caller).not.toHaveBeenCalled()
      expect(w.reservations).toHaveLength(0)
    }
    const w = world()
    const a = adapter()
    expect(await runAuthorizedEvaluation(deps(w, a), { ...REQUEST, tool_index: 1 })).toMatchObject({ kind: 'completed', result: { kind: 'refused', code: 'document_not_bound' } })
    nothingHappened(w, a)
  })

  test('a failed read audit means no read, no reservation and no model', async () => {
    const w = world()
    const a = adapter()
    const r = await runAuthorizedEvaluation(deps(w, a, { documents: { ...w.documents, logExaminationRead: async () => { throw new Error('down') } } }), REQUEST)
    expect(r).toMatchObject({ kind: 'completed', result: { kind: 'not_read' }, settlement: { status: 'not_reserved' } })
    expect(w.events).not.toContain('read')
    nothingHappened(w, a)
  })

  test('changed bytes, an unsupported type or too many pages: read, refused, nothing reserved', async () => {
    const consistent = (bytes: Uint8Array) => {
      const sha = createHash('sha256').update(bytes).digest('hex')
      const c = canonicalJson({ documents: { items: [{ document_id: DOC, sha256: sha, tool_index: 0 }] } })
      return { sha, record: { ...RECORD, sha256: sha, byte_size: bytes.length }, prepared: { getPrepared: async () => ({ ...PREPARED_ROW, canonical: c, sha256: sha256Hex(c) }) } }
    }
    const six = syntheticPdf(6, 'evaluation-unlocked-6')
    const sixWorld = consistent(six)
    const cases: [ReturnType<typeof world>, Partial<EvaluationDeps>, string][] = []
    const w1 = world()
    cases.push([w1, { documents: { ...w1.documents, readObject: async () => syntheticPdf(1, 'evaluation-unlockeX') } }, 'integrity_mismatch'])
    const w2 = world()
    cases.push([w2, { documents: { ...w2.documents, readObject: async () => new Uint8Array(Buffer.from('GIF89a-unsupported')) } }, 'integrity_mismatch'])
    const w3 = world({ auth: { document_sha256: sixWorld.sha } })
    cases.push([w3, { prepared: sixWorld.prepared, documents: { ...w3.documents, getDocument: async () => sixWorld.record, readObject: async () => six } }, 'document_exceeds_live_bounds'])
    for (const [w, over, code] of cases) {
      const a = adapter()
      const r = await runAuthorizedEvaluation(deps(w, a, over), REQUEST)
      expect(r).toEqual({ kind: 'completed', result: { kind: 'refused', code, read_logged: true }, reservation_refusal: null, settlement: { status: 'not_reserved' } })
      expect(w.events).toContain('log_read') // audited before the bytes, which the overridden store returns
      expect(a.caller).not.toHaveBeenCalled()
      expect(w.reservations).toHaveLength(0)
    }
  })

  test('a store that throws is unavailable, with nothing reserved', async () => {
    const w = world()
    const a = adapter()
    const r = await runAuthorizedEvaluation(deps(w, a, { documents: { ...w.documents, readObject: async () => { throw new Error('storage 500') } } }), REQUEST)
    expect(r).toEqual({ kind: 'completed', result: { kind: 'unavailable', reason: 'storage_unavailable' }, reservation_refusal: null, settlement: { status: 'not_reserved' } })
    expect(a.caller).not.toHaveBeenCalled()
  })
})

describe('cost', () => {
  test('a refused reservation stops the attempt before the model', async () => {
    for (const refusal of ['budget_exhausted', 'attempts_exhausted', 'reading_exists', null]) {
      const w = world({ ports: { reserve: async () => { throw new EvaluationPortError('reserve', refusal) } } })
      const a = adapter()
      const r = await runAuthorizedEvaluation(deps(w, a), REQUEST)
      expect(r).toEqual({ kind: 'completed', result: { kind: 'refused', code: 'live_budget_exhausted', read_logged: true }, reservation_refusal: refusal ?? 'reservation_unavailable', settlement: { status: 'not_reserved' } })
      expect(a.caller).not.toHaveBeenCalled()
    }
  })

  test('the durable ledger outlives the process: a second run with a new executor sees what the first spent', async () => {
    const w = world({ maxSpend: RESERVE * 2 + 1, maxAttempts: 18 })
    let n = 0
    const failing = adapter(async () => { throw new Error(`x${n++}`) }, () => 'overloaded')
    expect(await runAuthorizedEvaluation(deps(w, failing), REQUEST)).toMatchObject({ result: { kind: 'failed', reason: 'provider_failure' }, settlement: { status: 'settled' } })
    expect(await runAuthorizedEvaluation(deps(w, failing), REQUEST)).toMatchObject({ result: { kind: 'failed', reason: 'provider_failure' } })
    const fresh = adapter()
    const third = await runAuthorizedEvaluation(deps(w, fresh), REQUEST)
    expect(third).toMatchObject({ result: { kind: 'refused', code: 'live_budget_exhausted' }, reservation_refusal: 'budget_exhausted' })
    expect(fresh.caller).not.toHaveBeenCalled()
    expect(w.reservations.map((r) => r.charged)).toEqual([RESERVE, RESERVE])
  })

  test('a failed or unparseable attempt is charged at least its full reservation, with usage marked incomplete', async () => {
    const parse = adapter(async () => { throw new Error('Failed to parse structured output: bad') })
    const w = world()
    const r = await runAuthorizedEvaluation(deps(w, parse), REQUEST)
    expect(r).toMatchObject({ result: { kind: 'failed', reason: 'structured_output_missing' }, settlement: { status: 'settled', charged_micro_usd: RESERVE } })
    expect(parse.caller).toHaveBeenCalledTimes(2)
    expect(w.reservations[0].usage).toEqual({ requests: 2, input_tokens: 0, output_tokens: 0, usage_complete: false, estimated_micro_usd: 0 })
  })

  test('usage above the reservation is charged in full', async () => {
    const big = adapter(async () => good({ usage: { input_tokens: 400_000, output_tokens: 1000 } }))
    const w = world()
    const r = await runAuthorizedEvaluation(deps(w, big), REQUEST)
    const estimate = toMicroUsd((400_000 * 2 + 1000 * 10) / 1_000_000)
    expect(estimate).toBeGreaterThan(RESERVE)
    expect(r).toMatchObject({ settlement: { status: 'settled', charged_micro_usd: estimate } })
  })

  test('a result the database will not store is discarded, and the spend is still settled', async () => {
    const w = world({ ports: { record: async () => { throw new EvaluationPortError('record', 'envelope_invalid') } } })
    const r = await runAuthorizedEvaluation(deps(w), REQUEST)
    expect(r).toMatchObject({ result: { kind: 'not_recorded', reason: 'envelope_invalid' }, settlement: { status: 'settled' } })
  })

  test('a settlement that fails leaves the reservation counting in full', async () => {
    const w = world({ ports: { settle: async () => { throw new EvaluationPortError('settle', null) } } })
    const r = await runAuthorizedEvaluation(deps(w), REQUEST)
    expect(r).toMatchObject({ result: { kind: 'examined' }, settlement: { status: 'unsettled', reason: 'settlement_unavailable' } })
    expect(w.reservations[0].charged).toBeNull()
  })

  test('the executor sends nothing without an admitted attempt, so its model call cannot be used around a reservation', async () => {
    const a = adapter()
    const executor = await loadRealLiveExecutor({ authorization_id: EVAL, expires_at: '2026-11-12T10:00:00.000Z', max_estimated_usd: 5, permitted_documents: [{ sha256: SHA, consent_reference: 'consent-ref-0001' }] }, { env: ENV, now: () => NOW, loadAdapter: a.load })
    await expect(executor.callModel({ content: [], maxTokens: 1024 })).rejects.toThrow('live_provider_failure:not_reserved')
    expect(a.caller).not.toHaveBeenCalled()
    expect(executor.report().stopped).toBe('not_reserved')
  })
})

describe('micro-dollars', () => {
  test('round up, so a cost is never under-recorded, and are never negative', () => {
    expect([toMicroUsd(0), toMicroUsd(0.000001), toMicroUsd(0.0000011), toMicroUsd(0.13872), toMicroUsd(-1)]).toEqual([0, 1, 2, 138720, 0])
    expect(Object.is(toMicroUsd(0), 0)).toBe(true)
  })
})

describe('the authorization check on its own', () => {
  test('holds for what the preflight returns', () => {
    const w = world()
    expect(verifyDurableAuthorization({ ...w.auth }, { evaluation_id: EVAL, operator_user_id: OPERATOR, document_id: DOC, environment_ref: ENV_REF, now: NOW, profiles: PROFILES })).toBeNull()
  })
})
