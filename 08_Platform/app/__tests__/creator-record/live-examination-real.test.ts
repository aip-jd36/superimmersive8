/**
 * CR-V2-DOC-LIVE-1B — the real-examination preparation in the real, locked build. The SDK is replaced by a module that throws when loaded,
 * so this file also proves that nothing here loads it. No provider, no key, no real document, no spend.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { extractionMode, LIVE_EXTRACTION_ENV, LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { countPdfPages } from '@/lib/creator-record/evidence/pdf-text-layer'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { profileKey } from '@/lib/creator-record/examination/profile'
import {
  checkLiveDocumentBounds,
  LIVE_AUTHORIZATION_CEILINGS,
  LIVE_BOUNDS,
  LIVE_EVALUATION_ENV,
  LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD,
  liveEvaluationEnabled,
  parseLiveEvaluationAuthorization,
  worstCaseAttemptUsd,
} from '@/lib/creator-record/live-examination/controls'
import { examineBoundDocument, parseLiveDocumentScope, verifyDocumentBinding, type PreparedBindingRow } from '@/lib/creator-record/live-examination/document-access'
import { RECEIPT_LIVE_PROFILE, runLiveExamination, type LiveAttemptRow, type LiveStoragePorts } from '@/lib/creator-record/live-examination/examine'
import type { LiveEnvelope } from '@/lib/creator-record/live-examination/envelope'
import { loadRealLiveExecutor, LiveExaminationDisabled } from '@/lib/creator-record/live-examination/real-executor'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT } from '@/lib/creator-record/receipt-examination/prompt'
import { validateReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import { mockLiveExecutor } from '@/test-support/mock-live-executor'
import { syntheticObjStmPdf, syntheticPdf } from '@/test-support/synthetic-pdf'

jest.mock('@anthropic-ai/sdk', () => {
  throw new Error('the Anthropic SDK must not load in this file')
})
jest.mock('@anthropic-ai/sdk/helpers/json-schema', () => {
  throw new Error('the Anthropic SDK must not load in this file')
})

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC = '33333333-3333-4333-8333-333333333333'
const PREPARED = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-11-06T10:00:00.000Z')
const BYTES = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic-test:bound\n%%EOF\n'))
const SHA = createHash('sha256').update(BYTES).digest('hex')
const RECORD = { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf' as const, byte_size: BYTES.length, state: 'stored' as const }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!.parsed_output
const PROFILES = new Map([[profileKey(RECEIPT_LIVE_PROFILE.ref), RECEIPT_LIVE_PROFILE]])
const AUTH = { authorization_id: 'eval-2026-test', expires_at: '2027-01-01T00:00:00.000Z', max_estimated_usd: 5, permitted_documents: [{ sha256: SHA, consent_reference: 'consent-ref-1' }] }
const ENV = { [LIVE_EVALUATION_ENV]: AUTH.authorization_id, CREATOR_RECORD_EXTRACTION_API_KEY: 'x' }

// CR-V2-DOC-LIVE-1C-A: a real page tree; the counter no longer accepts page objects without one.
const pdf = (pages: number, extra = '') => syntheticPdf(pages, 'synthetic-test', { extra })


describe('the code lock', () => {
  test('every lock is false in this build', () => {
    expect(LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
    expect(readFileSync(path.join(process.cwd(), 'lib', 'creator-record', 'live-examination', 'controls.ts'), 'utf8')).toContain('export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false')
  })

  test('the real executor cannot be built, even with a valid authorization, the environment and a key, and the adapter is never loaded', async () => {
    const loadAdapter = jest.fn()
    await expect(loadRealLiveExecutor(AUTH, { env: ENV, now: () => NOW, loadAdapter })).rejects.toBeInstanceOf(LiveExaminationDisabled)
    await expect(loadRealLiveExecutor(AUTH, { env: ENV, now: () => NOW, loadAdapter })).rejects.toThrow('live_examination_disabled:code_lock')
    expect(loadAdapter).not.toHaveBeenCalled()
  })

  test('the environment alone opens nothing', () => {
    expect(liveEvaluationEnabled(ENV, AUTH, NOW)).toBe(false)
    expect(extractionMode({ [LIVE_EXTRACTION_ENV]: 'enabled', ...ENV })).toBe('fixture_replay')
  })

  test('a live identity with a working guard still reaches nothing', async () => {
    const callModel = jest.fn()
    const readBytes = jest.fn(async () => BYTES)
    const guard = { documentPermitted: jest.fn(() => true), reserveAttempt: jest.fn(() => true) }
    const r = await runLiveExamination(
      { documents: { get: async () => RECORD, readBytes }, isKnownSyntheticFixture: () => false, executor: { identity: { mode: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5' }, callModel, guard }, profiles: PROFILES, livePermitted: true, now: () => NOW },
      { actor_user_id: OWNER, document_id: DOC, profile: { id: 'receipt', version: 1 } },
    )
    expect(r).toEqual({ kind: 'refused', code: 'live_examination_disabled' })
    for (const f of [callModel, readBytes, guard.documentPermitted, guard.reserveAttempt]) expect(f).not.toHaveBeenCalled()
  })
})

describe('the authorization', () => {
  test('a valid one parses', () => expect(parseLiveEvaluationAuthorization(AUTH)).toEqual(AUTH))

  test.each([
    ['no object', null],
    ['an extra key', { ...AUTH, extra: 1 }],
    ['a missing key', { ...AUTH, expires_at: undefined }],
    ['a short id', { ...AUTH, authorization_id: 'x' }],
    ['a loose expiry', { ...AUTH, expires_at: 'tomorrow' }],
    ['no ceiling', { ...AUTH, max_estimated_usd: 0 }],
    ['a ceiling above the code limit', { ...AUTH, max_estimated_usd: LIVE_AUTHORIZATION_CEILINGS.max_estimated_usd + 0.01 }],
    ['no documents', { ...AUTH, permitted_documents: [] }],
    ['too many documents', { ...AUTH, permitted_documents: Array.from({ length: LIVE_AUTHORIZATION_CEILINGS.max_documents + 1 }, (_, i) => ({ sha256: sha256Hex(String(i)), consent_reference: 'consent-ref-1' })) }],
    ['a repeated document', { ...AUTH, permitted_documents: [AUTH.permitted_documents[0], AUTH.permitted_documents[0]] }],
    ['a document with no consent reference', { ...AUTH, permitted_documents: [{ sha256: SHA }] }],
    ['a malformed digest', { ...AUTH, permitted_documents: [{ sha256: 'abc', consent_reference: 'consent-ref-1' }] }],
  ])('%s is refused', (_n, raw) => expect(parseLiveEvaluationAuthorization(raw)).toBeNull())

  test('all three conditions are needed, and an expired one is out of force', () => {
    const on = { ...ENV }
    expect(liveEvaluationEnabled(on, AUTH, NOW, true)).toBe(true)
    expect(liveEvaluationEnabled(on, AUTH, NOW, false)).toBe(false)
    expect(liveEvaluationEnabled({ [LIVE_EVALUATION_ENV]: 'another-authorization' }, AUTH, NOW, true)).toBe(false)
    expect(liveEvaluationEnabled({}, AUTH, NOW, true)).toBe(false)
    expect(liveEvaluationEnabled(on, AUTH, new Date('2027-01-01T00:00:00.000Z'), true)).toBe(false)
  })

  test('the planning maximum for one attempt is fixed, and an unlisted model has none', () => {
    expect(worstCaseAttemptUsd('claude-sonnet-5')).toBeCloseTo(0.13872, 5)
    expect(worstCaseAttemptUsd('some-other-model')).toBeNull()
  })
})

describe('document bounds', () => {
  test('page counts come from the structure', () => {
    expect(countPdfPages(pdf(1))).toBe(1)
    expect(countPdfPages(pdf(6))).toBe(6)
  })

  // CR-V2-DOC-LIVE-1C-A: stricter than 1B, which counted this as 40. A tree whose /Count disagrees with its pages is ambiguous, so unreadable.
  test('a page tree that declares more than the pages it holds cannot be counted', () => {
    expect(countPdfPages(syntheticPdf(2, 'synthetic-test', { count: 40 }))).toBeNull()
  })

  test('pages inside a compressed object stream are counted', () => {
    expect(countPdfPages(syntheticObjStmPdf(1))).toBe(1)
    expect(countPdfPages(syntheticObjStmPdf(6))).toBe(6)
  })

  test.each([
    ['no page objects', '%PDF-1.4\n%%EOF\n'],
    ['encrypted', '%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\ntrailer << /Encrypt 3 0 R >>\n%%EOF\n'],
    ['not a PDF', 'not a pdf'],
  ])('%s cannot be counted', (_n, text) => expect(countPdfPages(new Uint8Array(Buffer.from(text)))).toBeNull())

  test('the bound fails closed', () => {
    expect(checkLiveDocumentBounds(pdf(LIVE_BOUNDS.max_pdf_pages), 'application/pdf')).toBe('within_bounds')
    expect(checkLiveDocumentBounds(pdf(LIVE_BOUNDS.max_pdf_pages + 1), 'application/pdf')).toBe('too_many_pages')
    expect(checkLiveDocumentBounds(BYTES, 'application/pdf')).toBe('pages_undetermined')
    expect(checkLiveDocumentBounds(new Uint8Array(LIVE_BOUNDS.max_document_bytes + 1), 'image/png')).toBe('too_large')
    expect(checkLiveDocumentBounds(new Uint8Array(10), 'image/png')).toBe('within_bounds')
  })
})

describe('the document binding', () => {
  const canonical = (items: unknown[]) => canonicalJson({ documents: { items } })
  const row = (items: unknown[] = [{ document_id: DOC, sha256: SHA, tool_index: 1 }]): PreparedBindingRow => {
    const text = canonical(items)
    return { id: PREPARED, user_id: OWNER, canonical: text, sha256: sha256Hex(text), draft_id: OTHER, version: 2, status: 'reviewed', latest_version: 2 }
  }
  const SCOPE = { actor_user_id: OWNER, prepared_id: PREPARED, document_id: DOC, tool_index: 1 }

  test('holds for the right user, record, tool and bytes', () => expect(verifyDocumentBinding(row(), SCOPE, SHA)).toBeNull())

  test.each<[string, () => string | null]>([
    ['prepared_id', () => verifyDocumentBinding({ ...row(), id: OTHER }, SCOPE, SHA)],
    ['prepared_owner', () => verifyDocumentBinding({ ...row(), user_id: OTHER }, SCOPE, SHA)],
    ['prepared_digest', () => verifyDocumentBinding({ ...row(), sha256: 'a'.repeat(64) }, SCOPE, SHA)],
    ['prepared_shape', () => { const text = '{"documents":{}}'; return verifyDocumentBinding({ ...row(), canonical: text, sha256: sha256Hex(text) }, SCOPE, SHA) }],
    ['tool_association', () => verifyDocumentBinding(row([{ document_id: DOC, sha256: SHA, tool_index: 2 }]), SCOPE, SHA)],
    ['tool_association', () => verifyDocumentBinding(row([{ document_id: DOC, sha256: SHA, tool_index: null }]), SCOPE, SHA)],
    ['tool_association', () => verifyDocumentBinding(row([]), SCOPE, SHA)],
    ['tool_association', () => verifyDocumentBinding(row([{ document_id: DOC, sha256: SHA, tool_index: 1 }, { document_id: DOC, sha256: SHA, tool_index: 1 }]), SCOPE, SHA)],
    ['document_sha256', () => verifyDocumentBinding(row(), SCOPE, 'f'.repeat(64))],
  ])('fails on %s', (check, run) => expect(run()).toBe(check))

  test('a scope is exact', () => {
    expect(parseLiveDocumentScope(SCOPE)).toEqual(SCOPE)
    for (const bad of [null, { ...SCOPE, extra: 1 }, { ...SCOPE, tool_index: null }, { ...SCOPE, tool_index: -1 }, { ...SCOPE, tool_index: 1.5 }, { ...SCOPE, actor_user_id: 'me' }, { ...SCOPE, prepared_id: undefined }]) expect(parseLiveDocumentScope(bad)).toBeNull()
  })

  const storage = () => {
    const events: string[] = []
    const rows: LiveAttemptRow[] = []
    const ports: LiveStoragePorts = {
      getDocument: async (id) => { events.push('get'); return id === DOC ? RECORD : null },
      logExaminationRead: async () => { events.push('log'); return 1 },
      readObject: async () => { events.push('read'); return BYTES },
      recordLiveAttempt: async (_id, text) => {
        events.push('record')
        const e = JSON.parse(text) as LiveEnvelope
        rows.push({ id: 'a1', attempt_number: 1, examination_key: e.examination_key, document_id: DOC, user_id: OWNER, document_sha256: SHA, envelope_version: 3, execution_origin: e.execution_origin, content_class: e.content_class, profile_id: e.profile.id, profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode, provider: e.executor.provider, model: e.executor.model, outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, executed_at: e.executed_at, envelope_canonical: text, envelope_sha256: sha256Hex(text), access_log_id: 1, created_at: NOW.toISOString() })
        return { attempt_id: 'a1', result: 'created' }
      },
      listLiveAttempts: async () => { events.push('list'); return rows.map((r) => ({ ...r })) },
    }
    return { ports, events, rows }
  }
  const deps = (ports: LiveStoragePorts, executor = mockLiveExecutor([{ output: OUTPUT }]), prepared: PreparedBindingRow | null = row()) => ({
    storage: ports,
    prepared: { getPrepared: async () => prepared },
    core: { isKnownSyntheticFixture: (s: string) => s === SHA, executor, profiles: PROFILES, livePermitted: false, now: () => NOW },
  })
  const P = { id: 'receipt', version: 1 }

  test('a bound document runs the one existing pipeline, in audit order', async () => {
    const s = storage()
    expect(await examineBoundDocument(deps(s.ports), SCOPE, P)).toMatchObject({ kind: 'examined', attempt_id: 'a1', model_called: true })
    expect(s.events.filter((e) => e === 'log' || e === 'read' || e === 'record')).toEqual(['log', 'read', 'record'])
  })

  test('the examination stores no prompt and no document bytes', async () => {
    const s = storage()
    await examineBoundDocument(deps(s.ports), SCOPE, P)
    const stored = s.rows[0].envelope_canonical
    expect(stored).not.toContain(RECEIPT_EXAMINATION_SYSTEM_PROMPT.slice(0, 40))
    expect(stored).not.toContain(Buffer.from(BYTES).toString('base64'))
    expect(Object.keys(JSON.parse(stored).provenance).sort()).toEqual(['input_tokens', 'integrity', 'model_calls', 'output_tokens', 'prompt_sent', 'provider_response_id'])
  })

  test('an unbound document is refused before any read, audit event or model call', async () => {
    for (const prepared of [null, row([]), row([{ document_id: DOC, sha256: SHA, tool_index: 2 }]), { ...row(), user_id: OTHER }, { ...row(), sha256: 'a'.repeat(64) }]) {
      const s = storage()
      const executor = mockLiveExecutor([{ output: OUTPUT }])
      expect(await examineBoundDocument(deps(s.ports, executor, prepared), SCOPE, P)).toEqual({ kind: 'refused', code: 'document_not_bound', read_logged: false })
      expect(s.events).toEqual(['get'])
      expect(executor.calls()).toBe(0)
    }
  })

  test('a reading already held is not returned to a scope that does not bind', async () => {
    const s = storage()
    await examineBoundDocument(deps(s.ports), SCOPE, P)
    expect(await examineBoundDocument(deps(s.ports, undefined, row([{ document_id: DOC, sha256: SHA, tool_index: 2 }])), SCOPE, P)).toMatchObject({ kind: 'refused', code: 'document_not_bound' })
    expect(await examineBoundDocument(deps(s.ports), SCOPE, P)).toMatchObject({ kind: 'examined', model_called: false })
  })

  test('a held reading is not returned once its document is no longer stored, even though the binding still holds', async () => {
    const s = storage()
    const first = await examineBoundDocument(deps(s.ports), SCOPE, P)
    expect(first).toMatchObject({ kind: 'examined', model_called: true })
    expect(s.rows).toHaveLength(1)
    expect(verifyDocumentBinding(row(), SCOPE, SHA)).toBeNull()
    const touched = () => s.events.filter((e) => e === 'log' || e === 'read' || e === 'record').length
    const before = touched()
    for (const state of ['deleted', 'pending'] as const) {
      const executor = mockLiveExecutor([{ output: OUTPUT }])
      const r = await examineBoundDocument(deps({ ...s.ports, getDocument: async () => ({ ...RECORD, state }) }, executor), SCOPE, P)
      expect(r).toEqual({ kind: 'refused', code: 'document_not_stored', read_logged: false })
      expect(JSON.stringify(r)).not.toContain('observations')
      expect(executor.calls()).toBe(0)
    }
    expect(touched()).toBe(before)
    // A document row that has gone, or a binding that no longer holds, is still refused as unbound: its state is not disclosed.
    expect(await examineBoundDocument(deps({ ...s.ports, getDocument: async () => null }), SCOPE, P)).toEqual({ kind: 'refused', code: 'document_not_bound', read_logged: false })
    expect(await examineBoundDocument(deps({ ...s.ports, getDocument: async () => ({ ...RECORD, state: 'deleted' as const }) }, undefined, row([{ document_id: DOC, sha256: SHA, tool_index: 2 }])), SCOPE, P)).toEqual({ kind: 'refused', code: 'document_not_bound', read_logged: false })
    // A stored document keeps its idempotent readback, with the same reading and no model call.
    const executor = mockLiveExecutor([{ output: OUTPUT }])
    const again = await examineBoundDocument(deps(s.ports, executor), SCOPE, P)
    expect(again).toMatchObject({ kind: 'examined', attempt_id: 'a1', model_called: false })
    expect(first.kind === 'examined' && again.kind === 'examined' && canonicalJson(again.envelope) === canonicalJson(first.envelope)).toBe(true)
    expect(executor.calls()).toBe(0)
  })

  test('a document that is missing, or a store that is down, fails closed', async () => {
    const s = storage()
    expect(await examineBoundDocument(deps(s.ports), { ...SCOPE, document_id: OTHER }, P)).toMatchObject({ kind: 'refused', code: 'document_not_bound' })
    expect(await examineBoundDocument(deps({ ...s.ports, getDocument: async () => { throw new Error('down') } }), SCOPE, P)).toEqual({ kind: 'unavailable', reason: 'storage_unavailable' })
    expect(await examineBoundDocument(deps(s.ports), { ...SCOPE, tool_index: 'x' }, P)).toEqual({ kind: 'refused', code: 'invalid_request', read_logged: false })
  })

  test('bytes that changed after the check are refused by the existing integrity step', async () => {
    const s = storage()
    const executor = mockLiveExecutor([{ output: OUTPUT }])
    const r = await examineBoundDocument(deps({ ...s.ports, readObject: async () => new Uint8Array(Buffer.from('%PDF-1.4\n%different-document-same-record\n')) }, executor), SCOPE, P)
    expect(r).toEqual({ kind: 'refused', code: 'integrity_mismatch', read_logged: true })
    expect(executor.calls()).toBe(0)
  })
})

describe('production ports (mocked Supabase client)', () => {
  const calls: { op: string; args: unknown[] }[] = []
  const result: { rpc?: unknown; select?: unknown; insert?: unknown; latest?: unknown } = {}
  beforeAll(() => {
    jest.resetModules()
    jest.doMock('@/lib/supabase/admin', () => {
      const chain = (table: string) => {
        const q: Record<string, (...a: unknown[]) => unknown> = {}
        let ordered = false
        for (const m of ['select', 'eq', 'order', 'limit']) q[m] = (...a: unknown[]) => { calls.push({ op: `${table}.${m}`, args: a }); if (m === 'order') ordered = true; return q }
        q.maybeSingle = () => Promise.resolve(ordered ? result.latest : result.select)
        ;(q as unknown as { then: unknown }).then = (ok: (v: unknown) => unknown) => Promise.resolve(result.select).then(ok)
        q.insert = (...a: unknown[]) => { calls.push({ op: `${table}.insert`, args: a }); return { select: () => ({ single: () => Promise.resolve(result.insert) }) } }
        return q
      }
      return { supabaseAdmin: { from: chain, rpc: (...a: unknown[]) => { calls.push({ op: 'rpc', args: a }); return Promise.resolve(result.rpc) } } }
    })
  })
  afterAll(() => jest.dontMock('@/lib/supabase/admin'))
  const ports = () => import('@/lib/creator-record-flow/live-examination-production')

  test('recording calls exactly the database function, and its refusals are mapped', async () => {
    const { liveExaminationStorage } = await ports()
    result.rpc = { data: [{ attempt_id: 'a1', result: 'created' }], error: null }
    expect(await liveExaminationStorage.recordLiveAttempt(7, '{"x":1}')).toEqual({ attempt_id: 'a1', result: 'created' })
    expect(calls.filter((c) => c.op === 'rpc').pop()).toEqual({ op: 'rpc', args: ['creator_record_v2_record_live_examination', { p_access_log_id: 7, p_envelope: '{"x":1}' }] })
    result.rpc = { data: null, error: { code: 'P0001', message: 'live_examination_not_authorized' } }
    await expect(liveExaminationStorage.recordLiveAttempt(7, 't')).rejects.toMatchObject({ op: 'record', refusal: 'live_not_authorized' })
    result.rpc = { data: null, error: { code: '500', message: 'other' } }
    await expect(liveExaminationStorage.recordLiveAttempt(7, 't')).rejects.toMatchObject({ op: 'record', refusal: null })
    result.rpc = { data: [{ attempt_id: 'a1', result: 'replaced' }], error: null }
    await expect(liveExaminationStorage.recordLiveAttempt(7, 't')).rejects.toMatchObject({ refusal: null })
  })

  test('the read audit is the existing examination event, and a database refusal stops the read', async () => {
    const { liveExaminationStorage } = await ports()
    result.insert = { data: { id: '42' }, error: null }
    expect(await liveExaminationStorage.logExaminationRead('d', 'u')).toBe(42)
    expect(calls.filter((c) => c.op.endsWith('.insert')).pop()).toEqual({ op: 'creator_record_v2_evidence_access_log.insert', args: [{ document_id: 'd', actor_user_id: 'u', actor_role: 'owner', purpose: 'examination' }] })
    result.insert = { data: null, error: { code: 'P0001', message: 'examination reads are not authorized in this environment' } }
    await expect(liveExaminationStorage.logExaminationRead('d', 'u')).rejects.toMatchObject({ op: 'log_read', refusal: 'environment_not_authorized' })
  })

  test('attempts are read for this owner, document and profile only; a prepared version by its id', async () => {
    const { liveExaminationStorage, livePreparedSource } = await ports()
    result.select = { data: [{ id: 'a', access_log_id: '9' }], error: null }
    expect(await liveExaminationStorage.listLiveAttempts('u', 'd', 'receipt')).toEqual([{ id: 'a', access_log_id: 9 }])
    expect(calls.filter((c) => c.op === 'creator_record_v2_live_examination_attempts.eq').map((c) => c.args)).toEqual([['user_id', 'u'], ['document_id', 'd'], ['profile_id', 'receipt']])
    result.select = { data: { id: 'p', user_id: 'u', canonical: '{}', sha256: 'x', draft_id: 'dr', version: 2, status: 'reviewed' }, error: null }
    result.latest = { data: { version: 3 }, error: null }
    expect(await livePreparedSource.getPrepared('p')).toEqual({ id: 'p', user_id: 'u', canonical: '{}', sha256: 'x', draft_id: 'dr', version: 2, status: 'reviewed', latest_version: 3 })
    // CR-V2-DOC-LIVE-1C-A: the newest version of the same draft is read, so a superseded version is told apart.
    expect(calls.filter((c) => c.op.startsWith('creator_record_v2_prepared.') && ['eq', 'order', 'limit'].some((m) => c.op.endsWith(m))).map((c) => [c.op.split('.')[1], ...c.args])).toEqual([['eq', 'id', 'p'], ['eq', 'draft_id', 'dr'], ['order', 'version', { ascending: false }], ['limit', 1]])
    result.latest = { data: null, error: { code: '500' } }
    await expect(livePreparedSource.getPrepared('p')).rejects.toThrow('unavailable')
    result.select = { data: null, error: { code: '500' } }
    await expect(livePreparedSource.getPrepared('p')).rejects.toThrow('unavailable')
    result.select = { data: null, error: null }
    expect(await livePreparedSource.getPrepared('p')).toBeNull()
  })
})

describe('what stays closed', () => {
  const root = process.cwd()
  const rel = (f: string) => path.relative(root, f).split(path.sep).join('/')
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
  const files = ['lib', 'app', 'components', 'scripts'].flatMap((r) => { try { return walk(path.join(root, r)) } catch { return [] } })
  const NEW = ['lib/creator-record/live-examination/controls.ts', 'lib/creator-record/live-examination/real-executor.ts', 'lib/creator-record/live-examination/document-access.ts', 'lib/creator-record/live-examination/evaluation.ts', 'lib/creator-record-flow/live-examination-production.ts']

  test('customer submissions and issuance are stopped', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
  })

  test('no route or page reaches the foundation, the real executor or the production ports', () => {
    const importers = (pattern: RegExp) => files.filter((f) => pattern.test(readFileSync(f, 'utf8'))).map(rel)
    expect(importers(/from\s+['"][^'"]*live-examination\/real-executor['"]|import\(\s*['"][^'"]*real-executor['"]/)).toEqual([])
    // CR-V2-DOC-LIVE-1C-B1: only the fixed runner loads the production ports.
    expect(importers(/['"][^'"]*live-examination-production['"]/)).toEqual(['lib/creator-record-flow/live-evaluation-runner.ts'])
    // CR-V2-DOC-LIVE-1C-A: the one entry point builds the executor, and only the (unimported) production ports name the entry point.
    // CR-V2-MVP-M2A: and the customer entry point, through `loadCustomerLiveExecutor` (its own lock as well as the shared one).
    expect(importers(/['"]\.\/real-executor['"]/).sort()).toEqual(['lib/creator-record/live-examination/customer.ts', 'lib/creator-record/live-examination/evaluation.ts'])
    expect(importers(/['"][^'"]*live-examination\/evaluation['"]|['"]\.\/evaluation['"]/).sort()).toEqual(['lib/creator-record-flow/live-evaluation-runner.ts', 'lib/creator-record-flow/live-examination-production.ts'])
    expect(files.map(rel).filter((f) => f.startsWith('app/') && /live-examination/.test(readFileSync(path.join(root, f), 'utf8')))).toEqual([])
    expect(files.map(rel).filter((f) => f.startsWith('components/') && /live-examination/.test(readFileSync(path.join(root, f), 'utf8')))).toEqual([])
  })

  test('the adapter has no new importer', () => {
    const importers = files.filter((f) => /receipt-examination\/examine\.anthropic['"]/.test(readFileSync(f, 'utf8'))).map(rel).sort()
    expect(importers).toEqual(['lib/creator-record/eval/run-receipt-eval.ts', 'lib/creator-record/evidence/live-caller.ts', 'lib/creator-record/live-examination/real-executor.ts'])
  })

  test('an existing route cannot be opened by this work: the admin route still depends on its own lock', () => {
    const route = readFileSync(path.join(root, 'app', 'api', 'admin', 'creator-record-v2', 'examine', 'route.ts'), 'utf8')
    expect(route).not.toMatch(/live-examination|real-executor|LIVE_EXAMINATION_PERMITTED/)
    const caller = readFileSync(path.join(root, 'lib', 'creator-record', 'evidence', 'live-caller.ts'), 'utf8')
    expect(caller).toContain("if (!liveExtractionEnabled(env)) throw new Error('Live document examination is disabled.')")
    expect(readFileSync(path.join(root, 'lib', 'creator-record', 'evidence', 'config.ts'), 'utf8')).not.toMatch(/LIVE_EXAMINATION_PERMITTED/)
  })

  test('the new code logs nothing and issues no document URL', () => {
    for (const f of NEW) {
      const src = readFileSync(path.join(root, f), 'utf8')
      expect([f, /console\.|createSignedUrl|getPublicUrl|publicUrl/.test(src)]).toEqual([f, false])
    }
  })

  test('the new code touches no guidance, governance, declaration, payment, issuance or eligibility module', () => {
    const forbidden = /guidance|governance|eligibility|purchase|stripe|payment|customer-record|customer-flow|prepared-record|bounded-interpretation|living-knowledge|creator-record-artifacts/i
    for (const f of NEW) {
      const imports = Array.from(readFileSync(path.join(root, f), 'utf8').matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)).map((m) => m[1])
      expect([f, imports.filter((i) => forbidden.test(i))]).toEqual([f, []])
    }
  })

  // CR-V2-MVP-M2A: exactly one later migration widens it, for the customer shape only: a live row always has its reservation, the
  // 1A function still refuses live output, and every new function refuses without the customer enablement row.
  test('the 1A migration is unchanged; only 20261110000000 widens it, and only for reserved customer attempts while enabled', () => {
    const dir = path.join(root, 'supabase', 'migrations')
    const names = readdirSync(dir).sort()
    // CR-V2-MVP-RETENTION-M1A follows them: it adds a consent guard trigger only and replaces no examination function.
    expect(names.slice(-4)).toEqual(['20261108000000_creator_record_v2_live_examination_foundation.sql', '20261110000000_creator_record_v2_customer_live_examination.sql', '20261111000000_creator_record_v2_retention_m1a.sql', '20261112000000_creator_record_v2_ai_examination_permission.sql'])
    // CR-V2-MVP-LAUNCH-FOUNDATION-1 (20261112): adds a permission guard trigger only and replaces no examination function.
    const permission = readFileSync(path.join(dir, names[names.length - 1]), 'utf8')
    expect(permission).not.toMatch(/CREATE OR REPLACE FUNCTION public.creator_record_v2_(record|reserve|settle)_[a-z_]*examination|DROP CONSTRAINT[^;]*live_examination_attempts/)
    names.pop()
    const retention = readFileSync(path.join(dir, names[names.length - 1]), 'utf8')
    expect(retention).not.toMatch(/CREATE OR REPLACE FUNCTION public\.creator_record_v2_(record|reserve|settle)_[a-z_]*examination|DROP CONSTRAINT[^;]*live_examination_attempts/)
    names.pop()
    const sql = readFileSync(path.join(dir, names[names.length - 2]), 'utf8')
    expect(sql).toContain("execution_origin    text NOT NULL CHECK (execution_origin = 'mock_test')")
    expect(sql).toContain("RAISE EXCEPTION 'live_examination_not_authorized'")
    const next = readFileSync(path.join(dir, names[names.length - 1]), 'utf8')
    expect(next).toContain("execution_origin = 'live_model' AND content_class = 'customer_document' AND executor_mode = 'live_model' AND provider = 'anthropic'")
    expect(next).toContain('reservation_id IS NOT NULL')
    expect(next).not.toMatch(/CREATE OR REPLACE FUNCTION public\.creator_record_v2_record_live_examination\b/)
    for (const f of ['reserve_customer_live_examination', 'record_customer_live_examination']) {
      const body = next.slice(next.indexOf(`FUNCTION public.creator_record_v2_${f}`))
      expect(body.slice(0, body.indexOf('$$;'))).toContain("RAISE EXCEPTION 'customer_live_examination_not_enabled'")
    }
  })

  test('the model output contract has no conclusion to carry', () => {
    expect(RECEIPT_EXAMINATION_SYSTEM_PROMPT).toContain('Do not assess legal rights, licences, commercial use, entitlement, authenticity')
    expect(validateReceiptExtraction({ ...(OUTPUT as object), commercial_clearance: 'cleared' })).toBeNull()
  })
})
