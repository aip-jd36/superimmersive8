/**
 * CR-V2-DOC-2B — generic replay examination foundation: the receipt engine through the generic envelope.
 *
 * In-memory synthetic documents only (bytes are deterministic stand-ins re-keyed into a replay table, as
 * evidence-examine.test.ts does; no generated fixture files, no storage, no model).
 */

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { buildReplayTable, REPLAY_SET_VERSION, type ReplayFixture, type ReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { EXTRACTED_FIELD_NAMES, type ReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import type { CouldNotExamineReason } from '@/lib/creator-record/receipt-examination/examine'
import {
  EXAMINATION_FAILURE_REASONS,
  parseExaminationEnvelope,
  type ExaminationEnvelope,
  type ExaminationFailureReason,
  type ExaminationResult,
} from '@/lib/creator-record/examination/envelope'
import { examineDocument, examinationKey, type ExaminationDeps, type ExaminationDocumentRecord } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry, type ExaminationProfile } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { defaultProfileRegistry, replayExecutor, syntheticRegistry } from '@/lib/creator-record/examination/replay-executor'

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const RECEIPT = { id: 'receipt', version: 1 }
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

/** Deterministic synthetic stand-in bytes whose leading bytes match the fixture's media type. */
function bytesFor(id: string, media: string): Uint8Array {
  const tag = Buffer.from(`synthetic-test:${id}`)
  if (media === 'application/pdf') return new Uint8Array(Buffer.from(`%PDF-1.4\n%synthetic-test:${id}\n%%EOF\n`))
  if (media === 'image/png') return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...tag])
  return new Uint8Array([0xff, 0xd8, 0xff, ...tag])
}

interface Doc { record: ExaminationDocumentRecord; bytes: Uint8Array | null }
let n = 0
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`

function docFor(fixture: Pick<ReplayFixture, 'fixture_id' | 'media_type'>, over: Partial<ExaminationDocumentRecord> = {}): Doc {
  const bytes = bytesFor(fixture.fixture_id, fixture.media_type)
  return { bytes, record: { id: uuid(), user_id: OWNER, sha256: sha(bytes), media_type: fixture.media_type as ExaminationDocumentRecord['media_type'], byte_size: bytes.length, state: 'stored', ...over } }
}

function harness(docs: Doc[], table: ReplayTable, over: Partial<ExaminationDeps> = {}) {
  const calls = { get: 0, readBytes: 0, recordingFor: 0 }
  const byId = new Map(docs.map((d) => [d.record.id, d]))
  const exec = replayExecutor(table)
  const deps: ExaminationDeps = {
    documents: {
      get: async (id) => { calls.get += 1; return byId.get(id)?.record ?? null },
      readBytes: async (r) => { calls.readBytes += 1; return byId.get(r.id)?.bytes ?? null },
    },
    synthetic: syntheticRegistry(table),
    executor: { identity: exec.identity, recordingFor: (s) => { calls.recordingFor += 1; return exec.recordingFor(s) } },
    profiles: defaultProfileRegistry(),
    ...over,
  }
  return { deps, calls }
}

const req = (document_id: string, profile = RECEIPT, actor = OWNER) => ({ actor_user_id: actor, document_id, profile })
const envelopeOf = (r: ExaminationResult): ExaminationEnvelope => {
  if (r.kind !== 'envelope') throw new Error(`refused: ${r.stage}/${r.code}`)
  return r.envelope
}

/** The envelope's receipt observations back in the legacy extraction shape, for comparison only. */
function normalized(env: ExaminationEnvelope): ReceiptExtraction {
  const one = (f: string) => env.observations.filter((o) => o.field === f)
  const cls = (f: string) => one(f)[0].value!
  const field = (f: string) => { const o = one(f); expect(o).toHaveLength(1); return { status: o[0].status, value: o[0].value, evidence: o[0].excerpt } }
  return {
    document_type: cls('document_type') as ReceiptExtraction['document_type'],
    readability: cls('readability') as ReceiptExtraction['readability'],
    issuer_name: field('issuer_name'),
    product_or_plan_name: field('product_or_plan_name'),
    transaction_date: field('transaction_date'),
    service_period_start: field('service_period_start'),
    service_period_end: field('service_period_end'),
    plan_candidates: one('plan_candidate').map((o) => ({ text: o.value!, evidence: o.excerpt!, context: o.qualifier as ReceiptExtraction['plan_candidates'][number]['context'] })),
    multiple_plans_shown: cls('multiple_plans_shown') === 'true',
    instruction_like_text_present: cls('instruction_like_text_present') === 'true',
  }
}

describe('CR-V2-DOC-2B examination foundation', () => {
  test('the failure vocabulary is exactly the receipt engine’s', () => {
    const a: ExaminationFailureReason[] = [] as CouldNotExamineReason[]
    const b: CouldNotExamineReason[] = [] as ExaminationFailureReason[]
    expect([a, b]).toEqual([[], []])
    expect([...EXAMINATION_FAILURE_REASONS].sort()).toEqual(['empty_file', 'file_too_large', 'model_error', 'schema_invalid', 'structured_output_missing', 'unsupported_format'])
  })

  test.each(REPLAY_FIXTURES.map((f) => [f.fixture_id, f] as const))('fixture %s: normalized reading equals the existing replay path', async (_id, fixture) => {
    const doc = docFor(fixture)
    const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
    const legacy = await examineUpload(doc.bytes!, 'x', { mode: 'fixture_replay', replayTable: table })
    const env = envelopeOf(await examineDocument(harness([doc], table).deps, req(doc.record.id)))

    expect(parseExaminationEnvelope(env)).toEqual(env)
    expect(legacy.model_calls).toBe(0)
    if (legacy.outcome === 'document_examined') {
      expect(env.outcome).toEqual({ status: 'examined', reason: null })
      expect(normalized(env)).toEqual(legacy.extraction)
    } else {
      expect(env.outcome).toEqual({ status: 'could_not_examine', reason: legacy.reason })
      expect(env.observations).toEqual([])
    }
    expect(env.provenance).toEqual({ integrity: 'sha256_size_and_type_rechecked', replay_fixture_id: fixture.fixture_id, engine_attempts: 1, model_calls: 0, prompt_sent: false })
    expect(env.executor).toEqual({ mode: 'fixture_replay', replay_set: REPLAY_SET_VERSION })
    expect(env.profile).toEqual({ id: 'receipt', version: 1, schema: legacy.versions.schema, prompt: 'receipt-prompt-v2' })
    expect(env.authority_class).toBe('synthetic_test')
    expect(env.observations.every((o) => o.verification === 'not_verified' && o.origin === 'fixture_replay_recorded' && o.source.document_sha256 === doc.record.sha256 && o.source.location === null)).toBe(true)
    expect(env.limitations.slice(0, 2)).toEqual(['recorded_test_data_not_model_output', 'observations_not_verified'])
  })

  test('every fixture examined: all 45, and every printed field keeps its status, value and verbatim excerpt', async () => {
    expect(REPLAY_FIXTURES).toHaveLength(45)
    for (const f of REPLAY_FIXTURES) {
      const doc = docFor(f)
      const env = envelopeOf(await examineDocument(harness([doc], buildReplayTable([{ ...f, sha256: doc.record.sha256 }])).deps, req(doc.record.id)))
      expect(env.outcome.status).toBe('examined')
      for (const name of EXTRACTED_FIELD_NAMES) {
        const o = env.observations.find((x) => x.field === name)!
        expect(o.basis).toBe('printed_text')
        expect(o.status === 'present').toBe(o.value !== null)
      }
    }
  })

  describe('preflight refusals happen before examination and produce no envelope', () => {
    const fixture = REPLAY_FIXTURES[0]
    const run = async (doc: Doc, request: unknown, over: Partial<ExaminationDeps> = {}, docs: Doc[] = [doc]) => {
      const table = buildReplayTable([{ ...fixture, sha256: sha(bytesFor(fixture.fixture_id, fixture.media_type)) }])
      const read = jest.fn(RECEIPT_PROFILE.readRecorded)
      const h = harness(docs, table, { profiles: buildProfileRegistry([{ ...RECEIPT_PROFILE, readRecorded: read }]), ...over })
      const result = await examineDocument(h.deps, request)
      return { result, read, calls: h.calls }
    }

    test.each([
      ['an unregistered profile', { id: 'licence', version: 1 }, 'profile', 'profile_not_registered'],
      ['an unregistered profile version', { id: 'receipt', version: 2 }, 'profile', 'profile_not_registered'],
    ])('%s', async (_n, profile, stage, code) => {
      const doc = docFor(fixture)
      const { result, read, calls } = await run(doc, req(doc.record.id, profile))
      expect(result).toEqual({ kind: 'refused', stage, code })
      expect(read).not.toHaveBeenCalled()
      expect(calls.get).toBe(0)
    })

    test('a profile that does not support the media type', async () => {
      const doc = docFor({ fixture_id: fixture.fixture_id, media_type: 'image/png' })
      const pdfOnly: ExaminationProfile = { ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, id: 'pdf-only' }, media_types: ['application/pdf'], readRecorded: jest.fn() }
      const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
      const result = await examineDocument(harness([doc], table, { profiles: buildProfileRegistry([pdfOnly]) }).deps, req(doc.record.id, { id: 'pdf-only', version: 1 }))
      expect(result).toEqual({ kind: 'refused', stage: 'profile', code: 'media_type_not_supported' })
      expect(pdfOnly.readRecorded).not.toHaveBeenCalled()
    })

    test.each([
      ['unknown document', (d: Doc) => ({ doc: d, docs: [] as Doc[] }), 'document', 'document_not_found'],
      ['pending upload', (d: Doc) => ({ doc: { ...d, record: { ...d.record, state: 'pending' as const } } }), 'document', 'document_not_stored'],
      ['deleted document', (d: Doc) => ({ doc: { ...d, record: { ...d.record, state: 'deleted' as const } } }), 'document', 'document_not_stored'],
      ['another creator’s document', (d: Doc) => ({ doc: { ...d, record: { ...d.record, user_id: OTHER } } }), 'ownership', 'not_owner'],
      ['object missing', (d: Doc) => ({ doc: { ...d, bytes: null } }), 'integrity', 'object_unavailable'],
      ['object altered (fingerprint)', (d: Doc) => ({ doc: { ...d, bytes: new Uint8Array([...d.bytes!, 0x20]) } }), 'integrity', 'integrity_mismatch'],
      ['size differs from the record', (d: Doc) => ({ doc: { ...d, record: { ...d.record, byte_size: d.record.byte_size + 1 } } }), 'integrity', 'integrity_mismatch'],
      ['type differs from the record', (d: Doc) => ({ doc: { ...d, record: { ...d.record, media_type: d.record.media_type === 'image/png' ? 'application/pdf' as const : 'image/png' as const } } }), 'integrity', 'integrity_mismatch'],
    ])('%s', async (_n, mutate, stage, code) => {
      const base = docFor(fixture)
      const m = mutate(base) as { doc: Doc; docs?: Doc[] }
      const { result, read, calls } = await run(m.doc, req(base.record.id), {}, m.docs ?? [m.doc])
      expect(result).toEqual({ kind: 'refused', stage, code })
      expect(read).not.toHaveBeenCalled()
      expect(calls.recordingFor).toBe(0)
    })

    test.each([
      ['not an object', null],
      ['a caller-asserted authority', { ...req('00000000-0000-4000-8000-000000000001'), authority_class: 'synthetic_test' }],
      ['a caller-supplied recorded output', { ...req('00000000-0000-4000-8000-000000000001'), parsed_output: {} }],
      ['a caller-chosen mode', { ...req('00000000-0000-4000-8000-000000000001'), mode: 'live_model' }],
      ['a non-UUID document id', req('../etc/passwd')],
      ['a non-integer profile version', req('00000000-0000-4000-8000-000000000001', { id: 'receipt', version: 1.5 })],
    ])('invalid request: %s', async (_n, request) => {
      const doc = docFor(fixture)
      const { result, read, calls } = await run(doc, request)
      expect(result).toEqual({ kind: 'refused', stage: 'request', code: 'invalid_request' })
      expect(read).not.toHaveBeenCalled()
      expect(calls.get).toBe(0)
    })
  })

  describe('synthetic authority is derived from trusted metadata only', () => {
    const fixture = REPLAY_FIXTURES[1]
    test('a document absent from the synthetic registry is refused, even with a recording available', async () => {
      const doc = docFor(fixture)
      const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
      const h = harness([doc], table, { synthetic: { isSyntheticTestDocument: () => false } })
      expect(await examineDocument(h.deps, req(doc.record.id))).toEqual({ kind: 'refused', stage: 'authority', code: 'real_documents_not_permitted' })
      expect(h.calls.recordingFor).toBe(0)
    })

    test('the registry is consulted with the RE-COMPUTED hash, not the stored claim', async () => {
      const doc = docFor(fixture)
      const seen: string[] = []
      const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
      const h = harness([doc], table, { synthetic: { isSyntheticTestDocument: (s) => { seen.push(s); return true } } })
      envelopeOf(await examineDocument(h.deps, req(doc.record.id)))
      expect(seen).toEqual([sha(doc.bytes!)])
    })

    test('synthetic but no recording for these bytes → refused at the executor', async () => {
      const doc = docFor(fixture)
      const h = harness([doc], buildReplayTable([]), { synthetic: { isSyntheticTestDocument: () => true } })
      expect(await examineDocument(h.deps, req(doc.record.id))).toEqual({ kind: 'refused', stage: 'executor', code: 'no_replay_recording' })
    })

    test('the envelope cannot describe a non-synthetic authority', async () => {
      const doc = docFor(fixture)
      const env = envelopeOf(await examineDocument(harness([doc], buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])).deps, req(doc.record.id)))
      expect(parseExaminationEnvelope({ ...env, authority_class: 'customer' })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, authority_class: 'governance' })).toBeNull()
    })
  })

  describe('deterministic replay identity (no durable exactly-once claim)', () => {
    const fixture = REPLAY_FIXTURES[2]
    test('the same document, bytes, profile and executor give the same key and an identical envelope', async () => {
      const doc = docFor(fixture)
      const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
      const a = envelopeOf(await examineDocument(harness([doc], table).deps, req(doc.record.id)))
      const b = envelopeOf(await examineDocument(harness([doc], table).deps, req(doc.record.id)))
      expect(b).toEqual(a)
      expect(a.identity).toBe('deterministic_replay_key')
      expect(a.examination_key).toBe(examinationKey({ document_id: doc.record.id, sha256: doc.record.sha256, profile: a.profile, executor: a.executor }))
      expect(a.observations.every((o) => o.observation_id.startsWith(`${a.examination_key.slice(0, 16)}:`))).toBe(true)
      expect(JSON.stringify(a)).not.toMatch(/"(created_at|examined_at|timestamp)"/)
    })

    test('a different profile version, replay set or document gives a different key', () => {
      const base = { document_id: OWNER, sha256: 'a'.repeat(64), profile: RECEIPT_PROFILE.ref, executor: { mode: 'fixture_replay' as const, replay_set: 'r1' } }
      const k = examinationKey(base)
      expect(examinationKey({ ...base, profile: { ...base.profile, version: 2 } })).not.toBe(k)
      expect(examinationKey({ ...base, executor: { ...base.executor, replay_set: 'r2' } })).not.toBe(k)
      expect(examinationKey({ ...base, document_id: OTHER })).not.toBe(k)
      expect(examinationKey({ ...base, sha256: 'b'.repeat(64) })).not.toBe(k)
    })
  })

  describe('invalid structured output is an examination outcome, failed closed by the unchanged engine', () => {
    const fixture = REPLAY_FIXTURES[3]
    test.each([
      ['schema-invalid output', { ...(fixture.parsed_output as object), document_type: 'passport' }, 'schema_invalid', 1],
      ['an extra key', { ...(fixture.parsed_output as object), verified: true }, 'schema_invalid', 1],
      ['a value without status present', { ...(fixture.parsed_output as object), issuer_name: { status: 'not_shown', value: 'Runway', evidence: null } }, 'schema_invalid', 1],
      ['no structured output (engine retries once)', null, 'structured_output_missing', 2],
    ])('%s', async (_n, output, reason, attempts) => {
      const doc = docFor(fixture)
      const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256, parsed_output: output }])
      const env = envelopeOf(await examineDocument(harness([doc], table).deps, req(doc.record.id)))
      expect(env.outcome).toEqual({ status: 'could_not_examine', reason })
      expect(env.observations).toEqual([])
      expect(env.limitations).toEqual(['recorded_test_data_not_model_output', 'observations_not_verified'])
      expect(env.provenance.engine_attempts).toBe(attempts)
      expect(env.provenance.model_calls).toBe(0)
      expect(parseExaminationEnvelope(env)).toEqual(env)
    })
  })

  test.each(['inject-visible-instructions', 'inject-pricing-page-claims-invoice'])('prompt-injection fixture %s: flagged and limited, text kept as data, nothing upgraded', async (id) => {
    const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === id)!
    const doc = docFor(fixture)
    const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
    const legacy = await examineUpload(doc.bytes!, 'x', { mode: 'fixture_replay', replayTable: table })
    const env = envelopeOf(await examineDocument(harness([doc], table).deps, req(doc.record.id)))
    expect(env.limitations).toContain('instruction_like_text_present')
    expect(env.observations.find((o) => o.field === 'instruction_like_text_present')!.value).toBe('true')
    expect(normalized(env)).toEqual(legacy.extraction)
    expect(env.observations.every((o) => o.verification === 'not_verified')).toBe(true)
    expect(env.authority_class).toBe('synthetic_test')
  })

  describe('the live model is unreachable through the foundation', () => {
    const DIR = path.join(process.cwd(), 'lib', 'creator-record', 'examination')
    const files = readdirSync(DIR).filter((f) => f.endsWith('.ts')).map((f) => readFileSync(path.join(DIR, f), 'utf8'))

    test('no import of the SDK, the live caller, the live gate or the SDK adapter; no dynamic import; no live mode literal', () => {
      expect(files.length).toBeGreaterThanOrEqual(5)
      for (const src of files) {
        expect(src).not.toMatch(/@anthropic-ai|live-caller|examine\.anthropic|evidence\/config|import\(/)
        expect(src).not.toMatch(/'live_model'|"live_model"/)
      }
    })

    test('an injected executor claiming another mode is refused before anything is read', async () => {
      const fixture = REPLAY_FIXTURES[0]
      const doc = docFor(fixture)
      const table = buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])
      const h = harness([doc], table)
      const live = { identity: { mode: 'live_model', replay_set: 'x' }, recordingFor: () => ({ fixture_id: 'x', parsed_output: fixture.parsed_output }) } as unknown as ExaminationDeps['executor']
      const result = await examineDocument({ ...h.deps, executor: live }, req(doc.record.id))
      expect(result).toEqual({ kind: 'refused', stage: 'executor', code: 'executor_not_permitted' })
      expect(h.calls.get).toBe(0)
    })

    test('the envelope parser rejects a live executor or a model-origin observation', async () => {
      const fixture = REPLAY_FIXTURES[0]
      const doc = docFor(fixture)
      const env = envelopeOf(await examineDocument(harness([doc], buildReplayTable([{ ...fixture, sha256: doc.record.sha256 }])).deps, req(doc.record.id)))
      expect(parseExaminationEnvelope({ ...env, executor: { mode: 'live_model', replay_set: env.executor.replay_set } })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, provenance: { ...env.provenance, model_calls: 1 } })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, observations: env.observations.map((o, i) => (i === 0 ? { ...o, origin: 'live_model' } : o)) })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, observations: env.observations.map((o, i) => (i === 0 ? { ...o, verification: 'verified' } : o)) })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, extra: 1 })).toBeNull()
    })
  })

  test('nothing outside lib/creator-record/examination imports it (no route, record, guidance, payment or publication path)', () => {
    const roots = ['lib', 'app', 'components'].map((r) => path.join(process.cwd(), r))
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
    const own = path.join(process.cwd(), 'lib', 'creator-record', 'examination') + path.sep
    const importers = roots.flatMap((r) => { try { return walk(r) } catch { return [] } }).filter((f) => !f.startsWith(own) && /creator-record\/examination/.test(readFileSync(f, 'utf8')))
    expect(importers).toEqual([])
  })
})
