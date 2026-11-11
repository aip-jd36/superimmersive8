/**
 * CR-V2-DOC-2B — generic replay examination foundation: the receipt engine through the generic envelope.
 * CR-V2-DOC-2B-IDENTITY-1 — replay identity binds the recorded output; profile versioning is pinned; fixture
 * content is never workflow authority.
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
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import {
  EXAMINATION_ENVELOPE,
  EXAMINATION_FAILURE_REASONS,
  parseExaminationEnvelope,
  type ExaminationEnvelope,
  type ExaminationFailureReason,
  type ExaminationResult,
} from '@/lib/creator-record/examination/envelope'
import { examineDocument, examinationKey, recordingDigest, type ExaminationDeps, type ExaminationDocumentRecord } from '@/lib/creator-record/examination/examine-document'
import { buildProfileRegistry, profileOutputCanonical, type ExaminationProfile, type ProfileFingerprintCase } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE, RECEIPT_PROFILE_OUTPUT_FINGERPRINTS, RECEIPT_PROFILE_VERSION, receiptLimitations } from '@/lib/creator-record/examination/receipt-profile'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'

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
    fixtures: knownFixtureRegistry(table),
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
const tableWith = (fixture: ReplayFixture, doc: Doc, over: Partial<ReplayFixture> = {}) => buildReplayTable([{ ...fixture, sha256: doc.record.sha256, ...over }])
const examineOne = async (fixture: ReplayFixture, doc: Doc, over: Partial<ExaminationDeps> = {}, table = tableWith(fixture, doc)) =>
  envelopeOf(await examineDocument(harness([doc], table, over).deps, req(doc.record.id)))

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

/**
 * The fixed fingerprint corpus for the profile versioning contract: every committed replay fixture (sorted by
 * id, with the stand-in bytes above) plus fixed failure cases. Changing this corpus changes every pin.
 */
function fingerprintCorpus(): ProfileFingerprintCase[] {
  const fixtures = [...REPLAY_FIXTURES].sort((a, b) => (a.fixture_id < b.fixture_id ? -1 : 1)).map((f) => ({ id: f.fixture_id, bytes: bytesFor(f.fixture_id, f.media_type), recorded_output: f.parsed_output }))
  const png = bytesFor('failure-case', 'image/png')
  return [
    ...fixtures,
    { id: 'failure:schema-invalid', bytes: png, recorded_output: { document_type: 'passport' } },
    { id: 'failure:no-output', bytes: png, recorded_output: null },
    { id: 'failure:empty-file', bytes: new Uint8Array(), recorded_output: REPLAY_FIXTURES[0].parsed_output },
    { id: 'failure:unsupported-format', bytes: new Uint8Array(Buffer.from('not a document')), recorded_output: REPLAY_FIXTURES[0].parsed_output },
  ]
}
const fingerprintOf = async (profile: ExaminationProfile) => sha256Hex(canonicalJson(await profileOutputCanonical(profile, fingerprintCorpus())))

describe('CR-V2-DOC-2B examination foundation', () => {
  test('the failure vocabulary is exactly the receipt engine’s', () => {
    const a: ExaminationFailureReason[] = [] as CouldNotExamineReason[]
    const b: CouldNotExamineReason[] = [] as ExaminationFailureReason[]
    expect([a, b]).toEqual([[], []])
    expect([...EXAMINATION_FAILURE_REASONS].sort()).toEqual(['empty_file', 'file_too_large', 'model_error', 'schema_invalid', 'structured_output_missing', 'unsupported_format'])
  })

  test.each(REPLAY_FIXTURES.map((f) => [f.fixture_id, f] as const))('fixture %s: normalized reading equals the existing replay path', async (_id, fixture) => {
    const doc = docFor(fixture)
    const table = tableWith(fixture, doc)
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
    expect(env.executor).toEqual({ mode: 'fixture_replay', replay_set: REPLAY_SET_VERSION, recording_sha256: sha256Hex(canonicalJson(fixture.parsed_output)) })
    expect(env.profile).toEqual({ id: 'receipt', version: 1, schema: legacy.versions.schema, prompt: 'receipt-prompt-v2' })
    expect(env.content_class).toBe('known_synthetic_fixture')
    expect(env.workflow_authorization).toBe('not_established')
    expect(env.observations.every((o) => o.verification === 'not_verified' && o.origin === 'fixture_replay_recorded' && o.source.document_sha256 === doc.record.sha256 && o.source.location === null)).toBe(true)
    expect(env.limitations.slice(0, 2)).toEqual(['recorded_test_data_not_model_output', 'observations_not_verified'])
  })

  test('every fixture examined: all 45, and every printed field keeps its status, value and verbatim excerpt', async () => {
    expect(REPLAY_FIXTURES).toHaveLength(45)
    for (const f of REPLAY_FIXTURES) {
      const doc = docFor(f)
      const env = await examineOne(f, doc)
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
      ['a caller-asserted content class', { ...req('00000000-0000-4000-8000-000000000001'), content_class: 'known_synthetic_fixture' }],
      ['a caller-asserted workflow authorization', { ...req('00000000-0000-4000-8000-000000000001'), workflow_authorization: 'established' }],
      ['a caller-asserted legacy authority class', { ...req('00000000-0000-4000-8000-000000000001'), authority_class: 'synthetic_test' }],
      ['a caller-supplied recorded output', { ...req('00000000-0000-4000-8000-000000000001'), parsed_output: {} }],
      ['a caller-supplied recording digest', { ...req('00000000-0000-4000-8000-000000000001'), recording_sha256: 'a'.repeat(64) }],
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

  describe('content recognition is derived from trusted metadata and is never authority', () => {
    const fixture = REPLAY_FIXTURES[1]
    test('content that is not a known fixture is refused, even with a recording available', async () => {
      const doc = docFor(fixture)
      const h = harness([doc], tableWith(fixture, doc), { fixtures: { isKnownSyntheticFixture: () => false } })
      expect(await examineDocument(h.deps, req(doc.record.id))).toEqual({ kind: 'refused', stage: 'content', code: 'not_a_known_synthetic_fixture' })
      expect(h.calls.recordingFor).toBe(0)
    })

    test('the registry is consulted with the RE-COMPUTED hash, not the stored claim', async () => {
      const doc = docFor(fixture)
      const seen: string[] = []
      envelopeOf(await examineDocument(harness([doc], tableWith(fixture, doc), { fixtures: { isKnownSyntheticFixture: (s) => { seen.push(s); return true } } }).deps, req(doc.record.id)))
      expect(seen).toEqual([sha(doc.bytes!)])
    })

    test('known content but no recording for these bytes → refused at the executor', async () => {
      const doc = docFor(fixture)
      const h = harness([doc], buildReplayTable([]), { fixtures: { isKnownSyntheticFixture: () => true } })
      expect(await examineDocument(h.deps, req(doc.record.id))).toEqual({ kind: 'refused', stage: 'executor', code: 'no_replay_recording' })
    })

    test('fixture recognition alone establishes no workflow, customer or synthetic-test authorization, whoever owns the document', async () => {
      for (const owner of [OWNER, OTHER]) {
        const doc = docFor(fixture, { user_id: owner })
        const env = envelopeOf(await examineDocument(harness([doc], tableWith(fixture, doc)).deps, req(doc.record.id, RECEIPT, owner)))
        expect(env.content_class).toBe('known_synthetic_fixture')
        expect(env.workflow_authorization).toBe('not_established')
      }
    })

    test.each([
      ['an established workflow authorization', { workflow_authorization: 'established' }],
      ['a synthetic-test authorization', { workflow_authorization: 'synthetic_test' }],
      ['a customer content class', { content_class: 'customer' }],
      ['the legacy v1 authority field', { authority_class: 'synthetic_test' }],
    ])('the envelope parser refuses %s', async (_n, patch) => {
      const doc = docFor(fixture)
      const env = await examineOne(fixture, doc)
      expect(parseExaminationEnvelope({ ...env, ...patch })).toBeNull()
    })

    test('the parser refuses a v1 envelope (no recording digest, legacy authority field)', async () => {
      const doc = docFor(fixture)
      const env = await examineOne(fixture, doc)
      const { content_class: _c, workflow_authorization: _w, ...rest } = env
      const v1 = { ...rest, envelope: { id: EXAMINATION_ENVELOPE.id, version: 1 }, authority_class: 'synthetic_test', executor: { mode: env.executor.mode, replay_set: env.executor.replay_set } }
      expect(parseExaminationEnvelope(v1)).toBeNull()
      expect(EXAMINATION_ENVELOPE.version).toBe(2)
    })

    test('no source in the foundation names an authority class or a synthetic-test authorization', () => {
      const DIR = path.join(process.cwd(), 'lib', 'creator-record', 'examination')
      for (const f of readdirSync(DIR).filter((x) => x.endsWith('.ts'))) {
        const src = readFileSync(path.join(DIR, f), 'utf8')
        expect(src).not.toMatch(/'synthetic_test'|authority_class|isSyntheticTestDocument|real_documents_not_permitted/)
      }
    })
  })

  describe('deterministic replay identity binds every result-producing input', () => {
    const fixture = REPLAY_FIXTURES[2]
    test('the same document, bytes, profile and replay inputs give the same key and an identical envelope', async () => {
      const doc = docFor(fixture)
      const table = tableWith(fixture, doc)
      const a = await examineOne(fixture, doc, {}, table)
      const b = await examineOne(fixture, doc, {}, table)
      expect(b).toEqual(a)
      expect(a.identity).toBe('deterministic_replay_key')
      expect(a.examination_key).toBe(examinationKey({ document_id: doc.record.id, sha256: doc.record.sha256, profile: a.profile, executor: a.executor }))
      expect(a.observations.every((o) => o.observation_id.startsWith(`${a.examination_key.slice(0, 16)}:`))).toBe(true)
      expect(JSON.stringify(a)).not.toMatch(/"(created_at|examined_at|timestamp)"/)
    })

    test('the recording digest is canonical: key order in the recorded output does not change it', () => {
      const reordered = Object.fromEntries(Object.entries(fixture.parsed_output as Record<string, unknown>).reverse())
      expect(recordingDigest(reordered)).toBe(recordingDigest(fixture.parsed_output))
    })

    test('different replay data for the same bytes and replay-set label gives a different key (never a silent collision)', async () => {
      const doc = docFor(fixture)
      const original = await examineOne(fixture, doc)
      const changed = JSON.parse(JSON.stringify(fixture.parsed_output)) as Record<string, { status: string; value: string | null; evidence: string | null }>
      changed.issuer_name = { status: 'not_shown', value: null, evidence: null }
      const altered = await examineOne(fixture, doc, {}, tableWith(fixture, doc, { parsed_output: changed }))
      expect(altered.executor.replay_set).toBe(original.executor.replay_set)
      expect(altered.executor.recording_sha256).not.toBe(original.executor.recording_sha256)
      expect(altered.examination_key).not.toBe(original.examination_key)
      expect(normalized(altered)).not.toEqual(normalized(original))
    })

    test('a different profile version, engine schema/prompt, replay set, recording, document or bytes gives a different key', () => {
      const base = { document_id: OWNER, sha256: 'a'.repeat(64), profile: RECEIPT_PROFILE.ref, executor: { mode: 'fixture_replay' as const, replay_set: 'r1', recording_sha256: 'c'.repeat(64) } }
      const k = examinationKey(base)
      const variants = [
        { ...base, profile: { ...base.profile, version: 2 } },
        { ...base, profile: { ...base.profile, schema: 'receipt-extraction-v3' } },
        { ...base, profile: { ...base.profile, prompt: 'receipt-prompt-v3' } },
        { ...base, executor: { ...base.executor, replay_set: 'r2' } },
        { ...base, executor: { ...base.executor, recording_sha256: 'd'.repeat(64) } },
        { ...base, document_id: OTHER },
        { ...base, sha256: 'b'.repeat(64) },
      ]
      const keys = variants.map(examinationKey)
      expect(keys).not.toContain(k)
      expect(new Set(keys).size).toBe(variants.length)
    })

    test('a registered profile at a new version examines the same document under a distinct key', async () => {
      const doc = docFor(fixture)
      const v2: ExaminationProfile = { ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, version: 2 } }
      const table = tableWith(fixture, doc)
      const profiles = buildProfileRegistry([RECEIPT_PROFILE, v2])
      const a = envelopeOf(await examineDocument(harness([doc], table, { profiles }).deps, req(doc.record.id, RECEIPT)))
      const b = envelopeOf(await examineDocument(harness([doc], table, { profiles }).deps, req(doc.record.id, { id: 'receipt', version: 2 })))
      expect(b.examination_key).not.toBe(a.examination_key)
      expect(b.profile.version).toBe(2)
    })

    test.each([
      ['undefined inside the output', { ...(REPLAY_FIXTURES[2].parsed_output as object), extra: undefined }],
      ['a non-finite number', { ...(REPLAY_FIXTURES[2].parsed_output as object), n: Number.NaN }],
      ['a non-plain object', new Date(0)],
    ])('a recording that is not canonical JSON (%s) is refused before the engine runs', async (_n, output) => {
      const doc = docFor(fixture)
      const read = jest.fn(RECEIPT_PROFILE.readRecorded)
      const h = harness([doc], tableWith(fixture, doc, { parsed_output: output }), { profiles: buildProfileRegistry([{ ...RECEIPT_PROFILE, readRecorded: read }]) })
      expect(await examineDocument(h.deps, req(doc.record.id))).toEqual({ kind: 'refused', stage: 'executor', code: 'invalid_replay_recording' })
      expect(read).not.toHaveBeenCalled()
    })

    test('the profile consumes exactly the hashed value: a deep-frozen copy materialised from the hashed text', async () => {
      const doc = docFor(fixture)
      const seen: unknown[] = []
      const spy: ExaminationProfile = { ...RECEIPT_PROFILE, readRecorded: async (b, out) => { seen.push(out); return RECEIPT_PROFILE.readRecorded(b, out) } }
      const env = await examineOne(fixture, doc, { profiles: buildProfileRegistry([spy]) })
      expect(seen).toHaveLength(1)
      expect(sha256Hex(canonicalJson(seen[0]))).toBe(env.executor.recording_sha256)
      expect(seen[0]).not.toBe(fixture.parsed_output)
      expect(Object.isFrozen(seen[0])).toBe(true)
      expect(Object.isFrozen((seen[0] as Record<string, unknown>).issuer_name)).toBe(true)
      expect(Object.isFrozen(fixture.parsed_output)).toBe(false)
    })

    test('a recording whose value changes between reads (getter) cannot make the examined value differ from the hashed one', async () => {
      const doc = docFor(fixture)
      const base = JSON.parse(JSON.stringify(fixture.parsed_output)) as Record<string, unknown>
      let reads = 0
      const shifting = { ...base }
      Object.defineProperty(shifting, 'document_type', { enumerable: true, get: () => (++reads === 1 ? base.document_type : 'passport') })
      const seen: unknown[] = []
      const spy: ExaminationProfile = { ...RECEIPT_PROFILE, readRecorded: async (b, out) => { seen.push(out); return RECEIPT_PROFILE.readRecorded(b, out) } }
      const h = harness([doc], tableWith(fixture, doc), { profiles: buildProfileRegistry([spy]) })
      const env = envelopeOf(await examineDocument({ ...h.deps, executor: { identity: h.deps.executor.identity, recordingFor: () => ({ fixture_id: fixture.fixture_id, parsed_output: shifting }) } }, req(doc.record.id)))
      expect(sha256Hex(canonicalJson(seen[0]))).toBe(env.executor.recording_sha256)
      expect((seen[0] as Record<string, unknown>).document_type).toBe(base.document_type)
      expect(env.outcome.status).toBe('examined')
    })

    test('the executor cannot supply the recording digest or any extra identity field', async () => {
      const doc = docFor(fixture)
      const h = harness([doc], tableWith(fixture, doc))
      const forged = { identity: { mode: 'fixture_replay', replay_set: REPLAY_SET_VERSION, recording_sha256: 'e'.repeat(64) }, recordingFor: h.deps.executor.recordingFor } as unknown as ExaminationDeps['executor']
      expect(await examineDocument({ ...h.deps, executor: forged }, req(doc.record.id))).toEqual({ kind: 'refused', stage: 'executor', code: 'executor_not_permitted' })
    })
  })

  describe('profile versioning contract (pinned output fingerprint per version)', () => {
    test('the current receipt profile version has a pin, and its readings match it', async () => {
      expect(RECEIPT_PROFILE.ref.version).toBe(RECEIPT_PROFILE_VERSION)
      const pin = RECEIPT_PROFILE_OUTPUT_FINGERPRINTS[RECEIPT_PROFILE_VERSION]
      expect(pin).toMatch(/^[0-9a-f]{64}$/)
      expect(await fingerprintOf(RECEIPT_PROFILE)).toBe(pin)
    })

    test('the corpus covers every committed fixture and the fixed failure cases', () => {
      const ids = fingerprintCorpus().map((c) => c.id)
      expect(ids).toHaveLength(REPLAY_FIXTURES.length + 4)
      expect(new Set(ids).size).toBe(ids.length)
    })

    test('a mapping change without a version bump is detected (the fingerprint no longer matches the pin)', async () => {
      const changedMapping: ExaminationProfile = {
        ...RECEIPT_PROFILE,
        async readRecorded(bytes, out) {
          const r = await RECEIPT_PROFILE.readRecorded(bytes, out)
          return r.status === 'examined' ? { ...r, limitations: r.limitations.filter((l) => l !== 'no_location_reference') } : r
        },
      }
      expect(await fingerprintOf(changedMapping)).not.toBe(RECEIPT_PROFILE_OUTPUT_FINGERPRINTS[RECEIPT_PROFILE_VERSION])
    })

    test('an engine-version label change without a version bump is detected', async () => {
      const relabelled: ExaminationProfile = { ...RECEIPT_PROFILE, ref: { ...RECEIPT_PROFILE.ref, schema: 'receipt-extraction-v3' } }
      expect(await fingerprintOf(relabelled)).not.toBe(RECEIPT_PROFILE_OUTPUT_FINGERPRINTS[RECEIPT_PROFILE_VERSION])
    })

    test('the contract states the explicit version rule and that the pin is corpus-limited only', () => {
      const src = readFileSync(path.join(process.cwd(), 'lib', 'creator-record', 'examination', 'profile.ts'), 'utf8')
      expect(src).toContain('MUST be raised, as an explicit reviewed change')
      expect(src).toContain('whether or not any test notices the change')
      expect(src).toContain('corpus-limited regression protection, NOT a code fingerprint')
      expect(src).toContain('A pin MATCH proves nothing about')
    })

    test('the mapping helpers stay pure and deterministic', () => {
      const ex = REPLAY_FIXTURES[0].parsed_output as ReceiptExtraction
      expect(receiptLimitations(ex)).toEqual(receiptLimitations(JSON.parse(JSON.stringify(ex))))
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
      const env = await examineOne(fixture, doc, {}, tableWith(fixture, doc, { parsed_output: output }))
      expect(env.outcome).toEqual({ status: 'could_not_examine', reason })
      expect(env.observations).toEqual([])
      expect(env.limitations).toEqual(['recorded_test_data_not_model_output', 'observations_not_verified'])
      expect(env.provenance.engine_attempts).toBe(attempts)
      expect(env.provenance.model_calls).toBe(0)
      expect(env.executor.recording_sha256).toBe(sha256Hex(canonicalJson(output)))
      expect(parseExaminationEnvelope(env)).toEqual(env)
    })
  })

  test.each(['inject-visible-instructions', 'inject-pricing-page-claims-invoice'])('prompt-injection fixture %s: flagged and limited, text kept as data, nothing upgraded', async (id) => {
    const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === id)!
    const doc = docFor(fixture)
    const table = tableWith(fixture, doc)
    const legacy = await examineUpload(doc.bytes!, 'x', { mode: 'fixture_replay', replayTable: table })
    const env = envelopeOf(await examineDocument(harness([doc], table).deps, req(doc.record.id)))
    expect(env.limitations).toContain('instruction_like_text_present')
    expect(env.observations.find((o) => o.field === 'instruction_like_text_present')!.value).toBe('true')
    expect(normalized(env)).toEqual(legacy.extraction)
    expect(env.observations.every((o) => o.verification === 'not_verified')).toBe(true)
    expect(env.workflow_authorization).toBe('not_established')
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
      const h = harness([doc], tableWith(fixture, doc))
      const live = { identity: { mode: 'live_model', replay_set: 'x' }, recordingFor: () => ({ fixture_id: 'x', parsed_output: fixture.parsed_output }) } as unknown as ExaminationDeps['executor']
      const result = await examineDocument({ ...h.deps, executor: live }, req(doc.record.id))
      expect(result).toEqual({ kind: 'refused', stage: 'executor', code: 'executor_not_permitted' })
      expect(h.calls.get).toBe(0)
    })

    test('the envelope parser rejects a live executor or a model-origin observation', async () => {
      const fixture = REPLAY_FIXTURES[0]
      const doc = docFor(fixture)
      const env = await examineOne(fixture, doc)
      expect(parseExaminationEnvelope({ ...env, executor: { ...env.executor, mode: 'live_model' } })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, executor: { mode: env.executor.mode, replay_set: env.executor.replay_set } })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, executor: { ...env.executor, recording_sha256: 'not-a-digest' } })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, provenance: { ...env.provenance, model_calls: 1 } })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, observations: env.observations.map((o, i) => (i === 0 ? { ...o, origin: 'live_model' } : o)) })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, observations: env.observations.map((o, i) => (i === 0 ? { ...o, verification: 'verified' } : o)) })).toBeNull()
      expect(parseExaminationEnvelope({ ...env, extra: 1 })).toBeNull()
    })

    test('real-document and live-extraction code locks are unchanged', () => {
      const lib = path.join(process.cwd(), 'lib', 'creator-record')
      expect(readFileSync(path.join(lib, 'evidence', 'config.ts'), 'utf8')).toContain('export const LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: boolean = false')
      expect(readFileSync(path.join(lib, 'evidence-intake', 'contract.ts'), 'utf8')).toContain('export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = true') // CR-V2-MVP-PROD-UAT-ACTIVATION-1
    })
  })

  test('only the approved production port and operator-UAT module import it; only the operator CLI imports the port (no route, record, guidance, payment or publication path)', () => {
    const roots = ['lib', 'app', 'components', 'scripts'].map((r) => path.join(process.cwd(), r))
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
    const own = path.join(process.cwd(), 'lib', 'creator-record', 'examination') + path.sep
    const files = roots.flatMap((r) => { try { return walk(r) } catch { return [] } })
    const rel = (f: string) => path.relative(process.cwd(), f).split(path.sep).join('/')
    // CR-V2-DOC-2C-C-B: the approved internal production-side module; CR-V2-PROD-UAT-B: the operator-UAT module.
    // CR-V2-EXAM-INTEGRATION-X0: the record may hold an examination ONLY through the bounded projection, and the
    // persisted comparison may read only the exact receipt-reading inversion (and the envelope type). Relative imports
    // count too, and each importer is pinned to exactly the examination modules it may use.
    const examinationImports = (f: string) =>
      Array.from(readFileSync(f, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g))
        .map((m) => m[1])
        .map((i) => (i.startsWith('.') ? path.relative(path.join(process.cwd(), 'lib', 'creator-record'), path.resolve(path.dirname(f), i)).split(path.sep).join('/') : i.replace(/^@\/lib\/creator-record\//, '')))
        .filter((i) => i.startsWith('examination/'))
        .sort()
    const importers = files.filter((f) => !f.startsWith(own) && examinationImports(f).length > 0).map((f) => [rel(f), examinationImports(f)])
    // CR-V2-EXAM-INTEGRATION-X2: the creator examination service uses the unchanged adapter and read-back, and the
    // receipt profile identity only (no engine import).
    expect(importers).toEqual([
      // CR-V2-EXAM-INTEGRATION-X3: and the bounded projection, for a prepared record to carry.
      ['lib/creator-record/customer-flow/examination.ts', ['examination/persistence', 'examination/projection', 'examination/receipt-reading']],
      ['lib/creator-record/customer-flow/purchase.ts', ['examination/projection']],
      // CR-V2-MVP-M3A: the customer PDF prints a schema 8 record's projections, reading only the envelope's closed vocabularies.
      ['lib/creator-record/customer-pdf/document-model.ts', ['examination/envelope']],
      ['lib/creator-record/customer-pdf/templates.ts', ['examination/envelope']],
      ['lib/creator-record/customer-record/examination-section.ts', ['examination/projection']],
      ['lib/creator-record/customer-record/record.ts', ['examination/projection']],
      // CRV2-IA-4D3 S2b: the offline synthetic evaluation runner (no app path imports eval/) reads the receipt profile's reading
      // contract v3 and profile identities, to evaluate the inactive v3 profile and attribute its reports. It selects nothing.
      ['lib/creator-record/eval/run-receipt-eval.ts', ['examination/receipt-profile']],
      ['lib/creator-record/evidence/persisted-comparison.ts', ['examination/envelope', 'examination/receipt-reading']],
      // CR-V2-MVP-INTEGRATION-2: the integrated assessment reads a record's projections only through the same exact inversion.
      ['lib/creator-record/integrated-assessment/assess.ts', ['examination/receipt-reading']],
      // CR-V2-DOC-LIVE-1A: the closed v3 contract, which nothing outside tests imports (live-examination.test.ts).
      ['lib/creator-record/live-examination/document-access.ts', ['examination/envelope']],
      ['lib/creator-record/live-examination/envelope.ts', ['examination/envelope']],
      ['lib/creator-record/live-examination/examine.ts', ['examination/envelope', 'examination/examine-document', 'examination/examine-document', 'examination/profile', 'examination/profile', 'examination/receipt-profile']],
      ['lib/creator-record-flow/examination-production.ts', ['examination/examine-document', 'examination/persistence', 'examination/replay-executor']],
    ])
    for (const f of ['lib/creator-record/customer-flow/purchase.ts', 'lib/creator-record/customer-record/record.ts'])
      expect(readFileSync(path.join(process.cwd(), f), 'utf8')).not.toMatch(/^import\s+(?!type\s)[^\n]*examination\//m)
    expect(files.filter((f) => !f.startsWith(own) && /creator-record\/examination/.test(readFileSync(f, 'utf8'))).map(rel)).toEqual(['lib/creator-record-flow/examination-production.ts'])
    // CR-V2-PROD-UAT-B: the operator CLI imports the production port; CR-V2-EXAM-INTEGRATION-X2: so does the creator
    // examination wiring (its one route is stopped by default, invite-only, and the database decides authority).
    // CR-V2-MVP-M2A: and the customer live examination ports, which reuse its document lookup, object read and access-log table name
    // (loaded on demand by the creator examination wiring only, while both code locks are true).
    expect(files.filter((f) => /(from\s+|import\s*\(\s*)['"][^'"]*creator-record-flow\/examination-production['"]/.test(readFileSync(f, 'utf8'))).map(rel).sort()).toEqual(['lib/creator-record-flow/admin-uat.ts', 'lib/creator-record-flow/customer-live-production.ts', 'lib/creator-record-flow/examination-customer.ts', 'lib/creator-record-flow/live-examination-production.ts'])
    // ... and only the creator examination route and (X3) the prepare flow's production ports import that wiring.
    expect(files.filter((f) => /creator-record-flow\/examination-customer['"]/.test(readFileSync(f, 'utf8'))).map(rel).sort()).toEqual(['app/api/admin/creator-record-v2/uat/evidence/[id]/examination/route.ts', 'app/api/creator-record-v2/evidence/[id]/examination/route.ts', 'lib/creator-record-flow/admin-uat.ts', 'lib/creator-record-flow/production.ts', 'lib/creator-record-flow/route-handlers.ts'])
  })
})
