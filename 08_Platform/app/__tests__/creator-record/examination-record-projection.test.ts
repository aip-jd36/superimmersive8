/**
 * CR-V2-EXAM-INTEGRATION-X0 — the bounded examination-to-record projection, derived comparisons, version-specific
 * creator responses, and the payment / issuance re-check of referenced runs.
 *
 * Every "approved" source here is a SYNTHETIC TEST FIXTURE (pilot content relabelled with a synthetic approver).
 * Examination runs are produced by the REAL examination adapter (`examineAndRecord`) over fake storage ports, as in
 * examination-persistence.test.ts. No database, Storage, route, model or network is used.
 */

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { examineAndRecord, type ExaminationAdapterDeps, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { receiptObservations } from '@/lib/creator-record/examination/receipt-profile'
import { mapReceiptReading, receiptReadingOf } from '@/lib/creator-record/examination/receipt-reading'
import { parseExaminationProjection, projectVerifiedRun, verifyReferencedRuns, type ExaminationProjection } from '@/lib/creator-record/examination/projection'
import { validateReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import { COMPARISON_WITHHELD, comparePersistedExamination, HISTORICAL_COMPARISON_METHOD, PERSISTED_COMPARISON_METHOD } from '@/lib/creator-record/evidence/persisted-comparison'
import { examinationSectionsValid } from '@/lib/creator-record/customer-record/examination-section'
import {
  buildCustomerRecord, verifyCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION,
  type CustomerRecordInput, type CustomerRecordResult, type CustomerRecordV2, type CustomerRecordDocument,
} from '@/lib/creator-record/customer-record/record'
import { carryForwardCandidates, type CreatorResponseInput } from '@/lib/creator-record/customer-record/examination-section'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom } from '@/lib/creator-record/customer-record/governance-state'
import { preparePrepared as prepareAsSent, type FlowDeps, type PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { renderV2ForIssuance, startPurchase, V2IssuanceRefusal, type PurchaseDeps, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import { buildCustomerDocument } from '@/lib/creator-record/customer-pdf/document-model'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '@/lib/creator-record/governed/synthetic-test-authority'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'
import { historicalRow } from '@/test-support/historical-record'
import { COMMERCIAL_SUPPORT_UNDER_TEST } from '@/test-support/commercial-support'

const preparePrepared = namingCurrentContract(prepareAsSent)

const APP_ROOT = path.resolve(__dirname, '..', '..')
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC_ID = '33333333-3333-4333-8333-333333333333'
const RUN_ID = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-11-01T09:00:00.000Z')
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

// ── Synthetic approved governance (test fixture only) ──
const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }
function syntheticSources(): CreatorRecordSources {
  return withQuestionnaireApproval(unapprovedSources())
}
function unapprovedSources(): CreatorRecordSources {
  const p = pilotSources()
  return {
    ...p,
    kind: 'governed',
    registry_input: {
      ...p.registry_input,
      questions: p.registry_input.questions.map((q) => ({ ...q, approval: q.approval.status === 'approved' ? SYNTHETIC : q.approval })),
      observation_map: p.registry_input.observation_map.map((o) => ({ ...o, approval: o.approval.status === 'approved' ? SYNTHETIC : o.approval })),
    },
    ledger: p.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver: SYNTHETIC.approver })),
    versions: { registry: 'SYNTHETIC-REGISTRY-1', ledger: 'SYNTHETIC-LEDGER-1' },
  }
}
const SOURCES = syntheticSources()
const ACKS = Object.fromEntries(SOURCES.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function textApproval(version: number): SourceTextApproval {
  const loaded = loadQuestionRegistry(SOURCES.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(SOURCES, loaded.registry, ACKS)),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
  }
}
const TEXT_V5 = textApproval(CUSTOMER_RECORD_SCHEMA_VERSION)
const TEXT_V6 = textApproval(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)

const ANS = { P1: ['Synthetic X0 video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const state = (plan = 'Pro'): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: ['kling'], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })

// ── A real persisted run, from the real adapter over fake ports ──
const FIX = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
const STAND_IN = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${FIX.fixture_id}`)])
const STAND_IN_SHA = createHash('sha256').update(STAND_IN).digest('hex')
const DOCUMENT: CustomerRecordDocument = { document_id: DOC_ID, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, file_name: 'synthetic-receipt.png', category: 'billing_receipt', tool_index: 0 }

let ENVELOPE_TEXT = ''
let ENVELOPE: ExaminationEnvelope
beforeAll(async () => {
  const table = buildReplayTable([{ ...FIX, sha256: STAND_IN_SHA }])
  const deps: ExaminationAdapterDeps = {
    core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
    storage: {
      async getDocument(id) { return id === DOC_ID ? { id: DOC_ID, user_id: OWNER, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, state: 'stored' } : null },
      async logExaminationRead() { return 1 },
      async readObject() { return STAND_IN },
      async recordExamination(_id, text) { ENVELOPE_TEXT = text; return { run_id: RUN_ID, result: 'created' } },
      async listRuns() { return [] },
    },
  }
  const r = await examineAndRecord(deps, { actor_user_id: OWNER, document_id: DOC_ID, profile: { id: 'receipt', version: 1 } })
  if (r.kind !== 'recorded') throw new Error(`fixture run not recorded: ${JSON.stringify(r)}`)
  ENVELOPE = r.envelope
})

function runRow(over: Partial<PersistedRunRow> = {}): PersistedRunRow {
  const env = ENVELOPE
  return {
    id: RUN_ID, examination_key: env.examination_key, document_id: DOC_ID, user_id: OWNER, document_sha256: env.document.sha256,
    envelope_version: env.envelope.version, content_class: env.content_class, workflow_authorization: env.workflow_authorization,
    execution_boundary: 'operator_synthetic_uat', environment_project_ref: 'lehqgcgnenwdmuzudbrs', profile_id: env.profile.id,
    profile_version: env.profile.version, schema_version: env.profile.schema, prompt_version: env.profile.prompt, executor_mode: env.executor.mode,
    replay_set: env.executor.replay_set, recording_sha256: env.executor.recording_sha256, replay_fixture_id: env.provenance.replay_fixture_id,
    outcome_status: env.outcome.status, outcome_reason: env.outcome.reason, envelope_canonical: ENVELOPE_TEXT, envelope_sha256: sha256Hex(ENVELOPE_TEXT),
    supersedes_id: null, access_log_id: 1, uat_grant_id: '55555555-5555-4555-8555-555555555555', created_at: '2026-11-03T08:55:00.000Z', ...over,
  }
}
function projection(): ExaminationProjection {
  const p = projectVerifiedRun(runRow(), OWNER, DOC_ID)
  if (!p.ok) throw new Error(p.reason)
  return p.projection
}

const input = (over: Partial<CustomerRecordInput> = {}): CustomerRecordInput => ({
  state: state(), sources: SOURCES, source_text: { approval: TEXT_V5, acknowledgements: ACKS }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-01',
  record: { record_id: 'PREP-X0TEST', record_version: 1, captured_at: NOW.toISOString() }, documents: [DOCUMENT], ...over,
})
const examined = (over: Partial<CustomerRecordInput> = {}): CustomerRecordInput =>
  input({ source_text: { approval: TEXT_V6, acknowledgements: ACKS }, examinations: [{ document_id: DOC_ID, projection: projection() }], ...over })
function built(r: CustomerRecordResult): { record: CustomerRecordV2; canonical: string; sha256: string } {
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 500))
  return r
}

// ───────────────────────────────────────────── projection

describe('projection from a persisted, integrity-checked run', () => {
  test('carries the envelope verbatim: observations, excerpts, limitations and provenance unchanged; not_verified', () => {
    const p = projection()
    expect(canonicalJson(p.envelope)).toBe(ENVELOPE_TEXT)
    expect(p.envelope.observations).toEqual(ENVELOPE.observations)
    expect(p.envelope.observations.length).toBeGreaterThan(0)
    expect(p.envelope.observations.every((o) => o.verification === 'not_verified')).toBe(true)
    expect(p.verification).toBe('not_verified')
    expect(p.run_integrity).toBe('persisted_run_rechecked')
    expect(p.envelope.limitations).toEqual(expect.arrayContaining(['recorded_test_data_not_model_output', 'observations_not_verified']))
    expect(p.envelope.provenance).toMatchObject({ model_calls: 0, prompt_sent: false, integrity: 'sha256_size_and_type_rechecked' })
    expect(p).toMatchObject({ run_id: RUN_ID, envelope_sha256: sha256Hex(ENVELOPE_TEXT), execution_boundary: 'operator_synthetic_uat' })
    expect(parseExaminationProjection(clone(p))).not.toBeNull()
  })

  test.each<[string, () => ReturnType<typeof projectVerifiedRun>]>([
    ['another owner', () => projectVerifiedRun(runRow(), OTHER, DOC_ID)],
    ['another document', () => projectVerifiedRun(runRow(), OWNER, '66666666-6666-4666-8666-666666666666')],
    ['envelope text altered', () => projectVerifiedRun(runRow({ envelope_canonical: ENVELOPE_TEXT.replace('"Kling AI"', '"Kling AX"') }), OWNER, DOC_ID)],
    ['stored column disagrees with the envelope', () => projectVerifiedRun(runRow({ outcome_status: 'could_not_examine' }), OWNER, DOC_ID)],
    ['malformed run id', () => projectVerifiedRun(runRow({ id: 'not-a-uuid' }), OWNER, DOC_ID)],
    ['unknown execution boundary', () => projectVerifiedRun(runRow({ execution_boundary: 'customer' }), OWNER, DOC_ID)],
  ])('refuses: %s', (_n, f) => {
    expect(f().ok).toBe(false)
  })

  test.each<[string, (p: Record<string, any>) => void]>([
    ['unknown top-level field', (p) => { p.note = 'x' }],
    ['missing field', (p) => { delete p.run_integrity }],
    ['verification claimed', (p) => { p.verification = 'verified' }],
    ['integrity relabelled', (p) => { p.run_integrity = 'commercially_verified' }],
    ['malformed run id', (p) => { p.run_id = 'x' }],
    ['unknown boundary', (p) => { p.execution_boundary = 'customer_pilot' }],
    ['projection identity', (p) => { p.projection.version = 2 }],
    ['observation value rewritten', (p) => { p.envelope.observations.find((o: any) => o.status === 'present').value = 'Changed' }],
    ['excerpt rewritten', (p) => { p.envelope.observations.find((o: any) => o.excerpt !== null).excerpt = 'Changed' }],
    ['observation marked verified', (p) => { p.envelope.observations[0].verification = 'verified' }],
    ['mandatory limitation removed', (p) => { p.envelope.limitations = p.envelope.limitations.filter((l: string) => l !== 'observations_not_verified') }],
    ['unknown envelope field', (p) => { p.envelope.extra = 1 }],
    ['provenance altered', (p) => { p.envelope.provenance.model_calls = 1 }],
    ['digest replaced', (p) => { p.envelope_sha256 = '0'.repeat(64) }],
  ])('parse refuses: %s', (_n, mutate) => {
    const p = clone(projection()) as Record<string, any>
    mutate(p)
    expect(parseExaminationProjection(p)).toBeNull()
  })
})

describe('receipt reading recovered exactly', () => {
  test('the restated mapping equals the receipt profile mapping on every replay fixture', () => {
    let n = 0
    for (const f of REPLAY_FIXTURES) {
      const ex = validateReceiptExtraction(f.parsed_output)
      if (!ex) continue
      n++
      expect(mapReceiptReading(ex)).toEqual(receiptObservations(ex))
    }
    expect(n).toBeGreaterThan(10)
  })

  test('the persisted envelope inverts to exactly the recorded reading; anything inconsistent is not recovered', () => {
    expect(receiptReadingOf(ENVELOPE)).toEqual(validateReceiptExtraction(FIX.parsed_output))
    const altered = clone(ENVELOPE)
    altered.observations = altered.observations.slice(1)
    expect(receiptReadingOf(altered)).toBeNull()
    expect(receiptReadingOf({ ...clone(ENVELOPE), profile: { ...ENVELOPE.profile, version: 2 } })).toBeNull()
  })
})

// ───────────────────────────────────────────── record

describe('record compatibility (no examinations)', () => {
  test('without examinations the record has no examination section, byte for byte', () => {
    const a = built(buildCustomerRecord(input()))
    const b = built(buildCustomerRecord(input({ examinations: [], responses: [] })))
    expect(b.canonical).toBe(a.canonical)
    expect(a.record.schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION)
    expect(a.record.documents.policy).toBe('inventory_only')
    expect(a.record.documents.items.every((d) => d.examination === 'not_examined')).toBe(true)
    expect(a.record.comparison).toEqual({ policy: 'disabled' })
    expect('creator_responses' in a.record).toBe(false)
    expect(verifyCustomerRecord(a.canonical, a.sha256).ok).toBe(true)
  })
})

describe('examination-bearing record (v6)', () => {
  test('holds the projection separately; declarations and guidance are identical to the record without it', () => {
    const plain = built(buildCustomerRecord(input()))
    const v6 = built(buildCustomerRecord(examined()))
    expect(v6.record.schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    expect(v6.record.documents.policy).toBe('inventory_with_examination')
    expect(v6.record.documents.items[0].examination).toEqual(projection())
    expect(v6.record.declarations).toEqual(plain.record.declarations)
    expect(v6.record.guidance).toEqual(plain.record.guidance)
    expect(verifyCustomerRecord(v6.canonical, v6.sha256).ok).toBe(true)
  })

  test('a source text approval for v5 does not cover a v6 record (approval is per schema)', () => {
    const r = buildCustomerRecord(examined({ source_text: { approval: TEXT_V5, acknowledgements: ACKS } }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.stage).toBe('sources')
  })

  test.each<[string, Partial<CustomerRecordInput>]>([
    ['projection for an unlisted document', { examinations: [{ document_id: '77777777-7777-4777-8777-777777777777', projection: {} as ExaminationProjection }] }],
    ['two projections for one document', { examinations: [{ document_id: DOC_ID, projection: {} as ExaminationProjection }, { document_id: DOC_ID, projection: {} as ExaminationProjection }] }],
    ['projection of another document', { documents: [{ ...DOCUMENT, sha256: 'a'.repeat(64) }] }],
    ['tampered projection', { examinations: [{ document_id: DOC_ID, projection: { ...clone({}), run_id: 'x' } as unknown as ExaminationProjection }] }],
  ])('refuses: %s', (_n, over) => {
    const r = buildCustomerRecord(examined(over))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.stage).toBe('input')
  })

  test('comparisons follow this version\'s declarations and make no determination, in either direction', () => {
    const pro = built(buildCustomerRecord(examined())).record
    const other = built(buildCustomerRecord(examined({ state: state('Standard') }))).record
    const c = (r: CustomerRecordV2) => (r.comparison.policy === 'derived_per_version' ? r.comparison.items : [])
    expect(c(pro)).toHaveLength(1)
    expect(c(pro)[0]).toMatchObject({ tool_index: 0, document_id: DOC_ID, run_id: RUN_ID, declared: { tool_id: 'kling', plan: 'Pro' }, verification: 'not_verified' })
    expect(c(other)[0].declared.plan).toBe('Standard')
    for (const r of [pro, other]) {
      expect(r.comparison).toMatchObject({ method: PERSISTED_COMPARISON_METHOD })
      expect(c(r)[0].provider).toEqual(COMPARISON_WITHHELD)
      expect(c(r)[0].plan).toEqual(COMPARISON_WITHHELD)
    }
    // The false positive this closes: the earlier method calls this document consistent with a declaration it cannot establish alone.
    const earlier = comparePersistedExamination({ tool_index: 0, document_id: DOC_ID, file_name: DOCUMENT.file_name, envelope: ENVELOPE, declared_tool_id: 'kling', declared_plan: 'Pro' })
    expect(earlier.provider.result).toBe('appears_consistent')
  })

  test('a new record cannot hold a determination; an earlier record keeps the one it holds and stays readable', () => {
    const r = built(buildCustomerRecord(examined())).record
    const withResult = (method: unknown, result: string) => ({ ...r, comparison: { policy: 'derived_per_version', method, items: (r.comparison as { items: object[] }).items.map((i) => ({ ...i, provider: { result, reason: 'same_seller' }, plan: { result, reason: 'same_plan' } })) } })
    const valid = (x: unknown) => examinationSectionsValid(x as Parameters<typeof examinationSectionsValid>[0])
    expect(valid(r)).toBe(true)
    for (const result of ['appears_consistent', 'appears_to_conflict', 'does_not_establish']) {
      expect(valid(withResult(PERSISTED_COMPARISON_METHOD, result))).toBe(false)
      expect(valid(withResult(HISTORICAL_COMPARISON_METHOD, result))).toBe(true)
    }
    expect(valid(withResult({ id: PERSISTED_COMPARISON_METHOD.id, version: 3 }, 'not_assessed'))).toBe(false)
    expect(valid(withResult(HISTORICAL_COMPARISON_METHOD, 'verified'))).toBe(false)
  })

  test('a comparison is never accepted as input', () => {
    const r = buildCustomerRecord({ ...examined(), comparison: { policy: 'derived_per_version', items: [] } } as unknown as CustomerRecordInput)
    // Unknown input fields are ignored by the builder; the record's comparisons are always recomputed.
    const plain = built(buildCustomerRecord(examined()))
    expect(built(r).canonical).toBe(plain.canonical)
  })
})

describe('creator responses', () => {
  const obsTarget = () => ({ kind: 'observation' as const, run_id: RUN_ID, observation_id: ENVELOPE.observations.find((o) => o.field === 'product_or_plan_name')!.observation_id })
  const cmpTarget = { kind: 'comparison' as const, tool_index: 0, document_id: DOC_ID, field: 'plan' as const }

  test('closed codes, attributed to the creator and to this version only; evidence and declarations untouched', () => {
    const base = built(buildCustomerRecord(examined()))
    const r = built(buildCustomerRecord(examined({ responses: [{ target: cmpTarget, code: 'other_plan_applies' }, { target: obsTarget(), code: 'reading_incorrect' }] })))
    expect(r.record.creator_responses?.items).toEqual([
      { target: cmpTarget, code: 'other_plan_applies', responded_by: 'creator', given_in_version: 1 },
      { target: obsTarget(), code: 'reading_incorrect', responded_by: 'creator', given_in_version: 1 },
    ])
    expect(r.record.documents).toEqual(base.record.documents)
    expect(r.record.comparison).toEqual(base.record.comparison)
    expect(r.record.declarations).toEqual(base.record.declarations)
    expect(r.record.guidance).toEqual(base.record.guidance)
    expect(verifyCustomerRecord(r.canonical, r.sha256).ok).toBe(true)
  })

  test.each<[string, () => unknown[]]>([
    ['unknown code', () => [{ target: cmpTarget, code: 'disagree' }]],
    ['free text', () => [{ target: cmpTarget, code: 'not_relevant', note: 'my own words' }]],
    ['observation not in this record', () => [{ target: { ...obsTarget(), observation_id: 'nope' }, code: 'reading_incorrect' }]],
    ['run not in this record', () => [{ target: { ...obsTarget(), run_id: OTHER }, code: 'reading_incorrect' }]],
    ['comparison not in this record', () => [{ target: { ...cmpTarget, tool_index: 1 }, code: 'not_relevant' }]],
    ['duplicate target', () => [{ target: cmpTarget, code: 'not_relevant' }, { target: cmpTarget, code: 'wrong_document' }]],
    ['extra target field', () => [{ target: { ...cmpTarget, version: 1 }, code: 'not_relevant' }]],
  ])('refuses: %s', (_n, responses) => {
    const r = buildCustomerRecord(examined({ responses: responses() as CreatorResponseInput[] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.stage).toBe('input')
  })

  test('responses without any examination are refused', () => {
    const r = buildCustomerRecord(input({ source_text: { approval: TEXT_V6, acknowledgements: ACKS }, responses: [{ target: cmpTarget, code: 'not_relevant' }] }))
    expect(r.ok).toBe(false)
  })

  test('responses never carry forward; unchanged targets are only LISTED for explicit re-affirmation', () => {
    const responses: CreatorResponseInput[] = [{ target: cmpTarget, code: 'other_plan_applies' }, { target: obsTarget(), code: 'reading_incorrect' }]
    const v1 = built(buildCustomerRecord(examined({ responses })))
    const v2Same = built(buildCustomerRecord(examined({ record: { record_id: 'PREP-X0TEST', record_version: 2, captured_at: NOW.toISOString() } })))
    expect(v2Same.record.creator_responses?.items).toEqual([])
    expect(carryForwardCandidates(v1.record, v2Same.record)).toEqual(responses.slice().sort((a) => (a.target.kind === 'comparison' ? -1 : 1)))
    const v2Changed = built(buildCustomerRecord(examined({ state: state('Standard'), record: { record_id: 'PREP-X0TEST', record_version: 2, captured_at: NOW.toISOString() } })))
    expect(carryForwardCandidates(v1.record, v2Changed.record)).toEqual([{ target: obsTarget(), code: 'reading_incorrect' }])
    // Re-affirmed explicitly, a response is recorded for the new version.
    const reaffirmed = built(buildCustomerRecord(examined({ responses: [{ target: obsTarget(), code: 'reading_incorrect' }], record: { record_id: 'PREP-X0TEST', record_version: 2, captured_at: NOW.toISOString() } })))
    expect(reaffirmed.record.creator_responses?.items[0].given_in_version).toBe(2)
  })
})

describe('stored v6 record integrity', () => {
  const restamp = (rec: CustomerRecordV2) => {
    const canonical = canonicalJson(rec)
    return verifyCustomerRecord(canonical, sha256Hex(canonical))
  }
  test.each<[string, (r: any) => void]>([
    ['projection observation rewritten', (r) => { r.documents.items[0].examination.envelope.observations.find((o: any) => o.status === 'present').value = 'Changed' }],
    ['projection marked verified', (r) => { r.documents.items[0].examination.verification = 'verified' }],
    ['comparison marked verified', (r) => { r.comparison.items[0].verification = 'verified' }],
    ['comparison result outside the vocabulary', (r) => { r.comparison.items[0].plan.result = 'confirmed' }],
    ['comparison of another run', (r) => { r.comparison.items[0].run_id = OTHER }],
    ['response carried from another version', (r) => { r.creator_responses.items[0].given_in_version = 0 }],
    ['response free text', (r) => { r.creator_responses.items[0].note = 'x' }],
  ])('a re-digested v6 record still refuses: %s', (_n, mutate) => {
    const r = built(buildCustomerRecord(examined({ responses: [{ target: { kind: 'comparison', tool_index: 0, document_id: DOC_ID, field: 'plan' }, code: 'not_relevant' }] })))
    const rec = clone(r.record) as any
    mutate(rec)
    expect(restamp(rec).ok).toBe(false)
  })
})

// ───────────────────────────────────────────── payment and issuance

describe('referenced runs at payment and issuance', () => {
  test('verifyReferencedRuns: integrity and ownership of every referenced run', async () => {
    const ref = { run_id: RUN_ID, document_id: DOC_ID, envelope_sha256: sha256Hex(ENVELOPE_TEXT) }
    expect(await verifyReferencedRuns(async () => runRow(), OWNER, [ref])).toEqual({ ok: true })
    expect(await verifyReferencedRuns(async () => null, OWNER, [ref])).toEqual({ ok: false, reason: 'run_missing' })
    expect(await verifyReferencedRuns(async () => runRow(), OWNER, [{ ...ref, envelope_sha256: 'b'.repeat(64) }])).toEqual({ ok: false, reason: 'run_mismatch' })
    expect(await verifyReferencedRuns(async () => runRow({ outcome_status: 'could_not_examine' }), OWNER, [ref])).toEqual({ ok: false, reason: 'run_integrity' })
    expect(await verifyReferencedRuns(async () => runRow(), OTHER, [ref])).toEqual({ ok: false, reason: 'run_integrity' })
    expect(await verifyReferencedRuns(async () => { throw new Error('down') }, OWNER, [ref])).toEqual({ ok: false, reason: 'unavailable' })
  })

  const v6Row = (): PreparedRow => {
    const r = historicalRow({ ...built(buildCustomerRecord(examined({ record: { record_id: 'PREP-88888888-8888-4888-8888-888888888888', record_version: 1, captured_at: NOW.toISOString() } }))), record_schema_version: 8 })
    return {
      id: '88888888-8888-4888-8888-888888888888', user_id: OWNER, draft_id: '99999999-9999-4999-8999-999999999999', version: 1, record_ref: 'PREP-88888888-8888-4888-8888-888888888888',
      record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: 6, canonical: r.canonical, sha256: r.sha256, form_state: state(), status: 'reviewed',
      created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    }
  }
  const purchaseDeps = (row: PreparedRow, over: Partial<PurchaseDeps> = {}): PurchaseDeps => ({
    submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, legalPoliciesApproved: () => true,
    getPrepared: async () => clone(row), latestVersion: async () => clone(row), boundTo: async () => clone(row),
    bind: async () => { throw new Error('must not bind') },
    governance: (d) => governanceSnapshotFrom({ issuance_date: d, sources: SOURCES, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [TEXT_V6], support: COMMERCIAL_SUPPORT_UNDER_TEST, authority_class: 'synthetic_test' }),
    now: () => NOW, evidenceIntact: async () => ({ ok: true }), ...over,
  })

  test('checkout refuses a record with examinations when the run check is absent or fails; it never binds', async () => {
    const row = v6Row()
    expect(await startPurchase(purchaseDeps(row), OWNER, row.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
    expect(await startPurchase(purchaseDeps(row, { examinationsIntact: async () => ({ ok: false, reason: 'run_mismatch' }) }), OWNER, row.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
    expect(await startPurchase(purchaseDeps(row, { examinationsIntact: async () => { throw new Error('down') } }), OWNER, row.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
    // Runs intact: still not purchasable, because v6 is not an issuable record schema (fail closed).
    const r = await startPurchase(purchaseDeps(row, { examinationsIntact: async () => ({ ok: true }) }), OWNER, row.id)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).not.toBe('evidence_unavailable')
  })

  test('issuance refuses a record with examinations when the run check is absent or fails', async () => {
    const row = v6Row()
    const sub = { id: row.submission_id as string, user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' }
    const deps = (over: Partial<V2IssuanceDeps> = {}): V2IssuanceDeps => ({
      boundTo: async () => clone(row), latestVersion: async () => clone(row), governance: purchaseDeps(row).governance, templates: () => ({ templates: null, approval: null }),
      renderPdf: async () => { throw new Error('must not render') }, evidenceIntact: async () => ({ ok: true }), ...over,
    })
    await expect(renderV2ForIssuance(deps(), sub, 'CR-2026-AAAAAAAA', NOW)).rejects.toEqual(new V2IssuanceRefusal('evidence_unavailable'))
    await expect(renderV2ForIssuance(deps({ examinationsIntact: async () => ({ ok: false, reason: 'run_integrity' }) }), sub, 'CR-2026-AAAAAAAA', NOW)).rejects.toEqual(new V2IssuanceRefusal('evidence_unavailable'))
  })

  test('a record without examinations never consults the run check', async () => {
    const r = built(buildCustomerRecord(input({ documents: [] })))
    const row: PreparedRow = { ...v6Row(), record_schema_version: 7, canonical: r.canonical, sha256: r.sha256, record_ref: 'PREP-X0TEST', submission_id: null }
    const spy = jest.fn(async () => ({ ok: true as const }))
    const r2 = await startPurchase(purchaseDeps(row, { examinationsIntact: spy, bind: async () => ({ submissionId: null, reason: 'not_found' }) }), OWNER, row.id)
    // CR-V2-MVP-M4A: reached the render check, which comes after the run check (no templates are supplied here): every earlier check,
    // the evidence and run checks included, passed without consulting the run check.
    expect(r2).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(spy).not.toHaveBeenCalled()
  })

  test('v6 is not an issuable record schema, and current templates do not render it', () => {
    expect(CURRENT_ISSUANCE_SUPPORT.record_schemas).toEqual([])
    const r = built(buildCustomerRecord(examined()))
    const b = CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY
    expect(() => buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: { record_id: 'CR-2026-AAAAAAAA', issued_on: '2026-11-01' }, templates: b?.pdf_templates ?? null, template_approval: b?.pdf_template_approval ?? null })).toThrow()
  })
})

// ───────────────────────────────────────────── reachability and boundaries

describe('no new reachable behaviour', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      if (n === 'node_modules' || n === '.next') return []
      const p = path.join(dir, n)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
    })
  const rel = (f: string) => path.relative(APP_ROOT, f).split(path.sep).join('/')

  test('the prepare route\'s flow never accepts a projection or comparison; responses only with server-attached examinations (X3)', async () => {
    const deps: FlowDeps = {
      submissions: 'open', hasPilotAccess: async () => true,
      store: { insert: async () => { throw new Error('must not store') }, get: async () => null, latestVersion: async () => null, markReviewed: async () => null },
      inputs: () => ({ sources: SOURCES, source_text: { approval: TEXT_V6, acknowledgements: ACKS } }), topicClaims: TOPIC_CLAIMS_FIXTURE, now: () => NOW, newId: () => DOC_ID,
    }
    // A projection or a comparison supplied by the browser is never read.
    for (const extra of [{ examinations: [] }, { comparison: [] }, { include_examinations: 'yes' }, { include_examinations: false }])
      expect(await preparePrepared(deps, OWNER, { state: state(), ...extra })).toEqual({ ok: false, status: 400, code: 'invalid_request' })
    // CR-V2-EXAM-INTEGRATION-X3: responses only alongside server-attached examinations.
    expect(await preparePrepared(deps, OWNER, { state: state(), responses: [] })).toEqual({ ok: false, status: 400, code: 'invalid_responses' })
    // Asking for examinations without the server's projection port: refused, nothing stored.
    expect(await preparePrepared(deps, OWNER, { state: state(), include_examinations: true })).toEqual({ ok: false, status: 409, code: 'examination_unavailable' })
  })

  test('no app, component or production-port file reaches the examination record path; the run check is wired once (M4A)', () => {
    const files = [...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components')), ...walk(path.join(APP_ROOT, 'lib', 'creator-record-flow'))]
    const reach = files.filter((f) => /examination-section|persisted-comparison|examination\/projection|examination\/receipt-reading/.test(readFileSync(f, 'utf8'))).map(rel)
    expect(reach).toEqual([])
    // CR-V2-MVP-M4A: the purchase and issuance run check is wired in the production ports only, to the one re-check of referenced
    // readings, whose model-reading lookup is loaded on demand and only while both live-examination code locks are true.
    expect(files.filter((f) => /examinationsIntact/.test(readFileSync(f, 'utf8'))).map(rel)).toEqual(['lib/creator-record-flow/production.ts'])
    const production = readFileSync(path.join(APP_ROOT, 'lib', 'creator-record-flow', 'production.ts'), 'utf8')
    expect(production.match(/examinationsIntact: [A-Za-z]+/g)).toEqual(['examinationsIntact: productionReadingsIntact', 'examinationsIntact: productionReadingsIntact'])
    const wiring = readFileSync(path.join(APP_ROOT, 'lib', 'creator-record-flow', 'examination-customer.ts'), 'utf8')
    const port = wiring.slice(wiring.indexOf('export function productionReadingsIntact'), wiring.indexOf('const MESSAGES'))
    expect(port).toMatch(/customerLiveEnabledInThisBuild\(\)\s*\n?\s*\?\s*\{ listLiveAttempts: async/)
    expect(port).not.toMatch(/^import /m)
  })

  test('guidance, facts, retrieval and interpretation never import the examination record path', () => {
    const roots = ['integration', 'contract', 'prototype'].map((d) => path.join(APP_ROOT, 'lib', 'creator-record', d))
      .concat(['retrieval-engine', 'bounded-interpretation'].map((d) => path.join(APP_ROOT, 'lib', d)).filter((d) => { try { return statSync(d).isDirectory() } catch { return false } }))
    const files = roots.flatMap(walk)
    expect(files.length).toBeGreaterThan(10)
    const offenders = files.filter((f) => /from\s+['"][^'"]*(examination\/|examination-section|persisted-comparison)[^'"]*['"]/.test(readFileSync(f, 'utf8'))).map(rel)
    expect(offenders).toEqual([])
  })

  test('production launch controls are unchanged', () => {
    const read = (p: string) => readFileSync(path.join(APP_ROOT, p), 'utf8')
    expect(read('lib/creator-record/customer-flow/approved-inputs.ts')).toContain("export const CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'stopped'")
    expect(read('lib/creator-record-artifacts/config.ts')).toContain("export const CREATOR_RECORD_V2_ISSUANCE: V2IssuanceMode = 'stopped'")
    expect(read('lib/creator-record/evidence-intake/contract.ts')).toContain('export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = false')
    expect(read('lib/creator-record/evidence/config.ts')).toContain('export const LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: boolean = false')
  })
})
