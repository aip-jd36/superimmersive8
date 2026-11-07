/**
 * CR-V2-EXAM-INTEGRATION-X3 — examination findings in a prepared record: the server-attached projection, derived
 * comparisons, version-specific creator responses and the carry-forward rule, through the real prepare flow.
 *
 * Every "approved" source here is a SYNTHETIC TEST FIXTURE. The examination run is produced by the REAL adapter over
 * fake ports (as in the X0 suite); no database, Storage, route, model or network is used.
 */

import { createHash } from 'node:crypto'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { examineAndRecord, type ExaminationAdapterDeps, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { examinationProjectionFor, type DocumentProjection } from '@/lib/creator-record/customer-flow/examination'
import { getPrepared, preparePrepared as prepareAsSent, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedView } from '@/lib/creator-record/customer-flow/service'
import { startPurchase, type PurchaseDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { EvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

const preparePrepared = namingCurrentContract(prepareAsSent)

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DOC_ID = '33333333-3333-4333-8333-333333333333'
const RUN_ID = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-11-01T09:00:00.000Z')

// ── Synthetic approved governance (test fixture only), as in the X0 suite ──
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
const ANS = { P1: ['Synthetic X3 video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const state = (plan = 'Pro'): CreatorRecordFormState => ({ answers: { ...ANS }, tools: [{ T1: ['kling'], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })

const FIX = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-kling-pro-monthly')!
const STAND_IN = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${FIX.fixture_id}`)])
const STAND_IN_SHA = createHash('sha256').update(STAND_IN).digest('hex')

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
  if (r.kind !== 'recorded') throw new Error('fixture run not recorded')
  ENVELOPE = r.envelope
})
function runRow(over: Partial<PersistedRunRow> = {}): PersistedRunRow {
  const env = ENVELOPE
  return {
    id: RUN_ID, examination_key: env.examination_key, document_id: DOC_ID, user_id: OWNER, document_sha256: env.document.sha256,
    envelope_version: env.envelope.version, content_class: env.content_class, workflow_authorization: env.workflow_authorization,
    execution_boundary: 'customer_path_synthetic_uat', environment_project_ref: 'lehqgcgnenwdmuzudbrs', profile_id: env.profile.id,
    profile_version: env.profile.version, schema_version: env.profile.schema, prompt_version: env.profile.prompt, executor_mode: env.executor.mode,
    replay_set: env.executor.replay_set, recording_sha256: env.executor.recording_sha256, replay_fixture_id: env.provenance.replay_fixture_id,
    outcome_status: env.outcome.status, outcome_reason: env.outcome.reason, envelope_canonical: ENVELOPE_TEXT, envelope_sha256: sha256Hex(ENVELOPE_TEXT),
    supersedes_id: null, access_log_id: 1, uat_grant_id: '55555555-5555-4555-8555-555555555555', created_at: '2026-11-03T08:55:00.000Z', ...over,
  }
}

/** The prepare flow with an in-memory store, the creator's one stored document, and the projection port over `rows`. */
function world(o: { rows?: () => PersistedRunRow[]; textVersion?: number; examinationsPort?: boolean } = {}) {
  const rows: PreparedRow[] = []
  let n = 0
  const doc: EvidenceRow = { id: DOC_ID, user_id: OWNER, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, file_name: 'synthetic-receipt.png', storage_path: `${OWNER}/${DOC_ID}`, consent_version: 'DRAFT', state: 'stored', created_at: NOW.toISOString(), stored_at: NOW.toISOString(), deleted_at: null, object_removed_at: null }
  const lookups: string[] = []
  const deps: FlowDeps = {
    submissions: 'open',
    hasPilotAccess: async () => true,
    store: {
      async insert(r: NewPreparedRow) { const row: PreparedRow = { ...r, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }; rows.push(row); return row },
      async get(id) { return rows.find((r) => r.id === id) ?? null },
      async latestVersion(draftId) { return rows.filter((r) => r.draft_id === draftId).sort((a, b) => b.version - a.version)[0] ?? null },
      async markReviewed() { return null },
    },
    inputs: () => ({ sources: SOURCES, source_text: { approval: textApproval(o.textVersion ?? CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION), acknowledgements: ACKS } }),
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => NOW,
    newId: () => `${String(++n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    evidence: { get: async (id) => (id === DOC_ID ? doc : null) },
    ...(o.examinationsPort === false ? {} : {
      examinations: {
        projectionFor: async (userId: string, documentId: string): Promise<DocumentProjection> => {
          lookups.push(`${userId}:${documentId}`)
          return examinationProjectionFor({ listRuns: async (u, d) => (o.rows ? o.rows() : [runRow()]).filter((r) => r.user_id === u && r.document_id === d) }, userId, documentId)
        },
      },
    }),
  }
  return { deps, rows, lookups }
}
const REF = [{ document_id: DOC_ID, category: 'billing_receipt', tool_index: 0 }]
const prepare = (deps: FlowDeps, body: Record<string, unknown>) => preparePrepared(deps, OWNER, { state: state(), documents: REF, ...body })
const viewOf = (r: Awaited<ReturnType<typeof preparePrepared>>): PreparedView => {
  if (!r.ok) throw new Error(`prepare refused: ${JSON.stringify(r)}`)
  return r.view
}

describe('the projection a prepared record may carry (server side)', () => {
  test('one customer-visible run → its re-verified projection; none → none', async () => {
    const one = await examinationProjectionFor({ listRuns: async () => [runRow()] }, OWNER, DOC_ID)
    expect(one.kind === 'projection' && [one.projection.run_id, one.projection.verification, one.projection.execution_boundary]).toEqual([RUN_ID, 'not_verified', 'customer_path_synthetic_uat'])
    expect(await examinationProjectionFor({ listRuns: async () => [] }, OWNER, DOC_ID)).toEqual({ kind: 'none' })
  })

  test.each([
    ['an operator-seeded run', () => [runRow({ execution_boundary: 'operator_synthetic_uat' })], 'boundary_not_customer_visible'],
    ['two runs (which one a record carries is not decided)', () => [runRow(), runRow({ id: '66666666-6666-4666-8666-666666666666' })], 'multiple_runs'],
    ['a tampered run', () => [runRow({ envelope_sha256: 'f'.repeat(64) })], 'run_integrity'],
    ['another owner’s run', () => [runRow({ user_id: OTHER })], 'run_integrity'],
  ] as const)('fails closed for %s', async (_n, rows, reason) => {
    expect(await examinationProjectionFor({ listRuns: async () => rows() }, OWNER, DOC_ID)).toEqual({ kind: 'unavailable', reason })
  })

  test('a storage failure is unavailable', async () => {
    expect(await examinationProjectionFor({ listRuns: async () => { throw new Error('down') } }, OWNER, DOC_ID)).toEqual({ kind: 'unavailable', reason: 'storage_unavailable' })
  })
})

describe('preparing a version with examination findings', () => {
  test('WITHOUT include_examinations the version is the v5 record exactly as before, and the port is never consulted', async () => {
    const w = world({ textVersion: CUSTOMER_RECORD_SCHEMA_VERSION })
    const v = viewOf(await prepare(w.deps, {}))
    expect(v.examination).toBeUndefined()
    expect(w.rows[0].record_schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION)
    expect(w.lookups).toEqual([])
  })

  test('WITH include_examinations: the server attaches the persisted projection; observations unverified; limitations shown; comparisons derived', async () => {
    const w = world()
    const v = viewOf(await prepare(w.deps, { include_examinations: true }))
    expect(w.rows[0].record_schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    expect(w.lookups).toEqual([`${OWNER}:${DOC_ID}`])
    const e = v.examination!
    expect(e.documents).toHaveLength(1)
    expect(e.documents[0]).toMatchObject({ document_id: DOC_ID, run_id: RUN_ID, verification: 'not_verified', outcome: { status: 'examined', reason: null } })
    expect(e.documents[0].observations.length).toBe(ENVELOPE.observations.length)
    expect(e.documents[0].observations.every((o) => o.verification === 'not_verified')).toBe(true)
    expect(e.documents[0].limitations).toEqual(expect.arrayContaining(['recorded_test_data_not_model_output', 'observations_not_verified']))
    expect(e.comparisons).toHaveLength(1)
    expect(e.comparisons[0]).toMatchObject({ tool_index: 0, document_id: DOC_ID, run_id: RUN_ID, declared: { tool_id: 'kling', plan: 'Pro' } })
    expect(e.responses).toEqual([])
    expect(e.response_codes).toEqual(['reading_incorrect', 'wrong_document', 'other_plan_applies', 'not_relevant'])
    // The same view on reading back the stored version.
    expect((await getPrepared(w.deps, OWNER, v.id) as { view: PreparedView }).view.examination).toEqual(e)
  })

  test('a document with no run stays not examined (v5 when nothing is examined)', async () => {
    const w = world({ rows: () => [], textVersion: CUSTOMER_RECORD_SCHEMA_VERSION })
    const v = viewOf(await prepare(w.deps, { include_examinations: true }))
    expect(v.examination).toBeUndefined()
    expect(w.rows[0].record_schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION)
  })

  test.each([
    ['the port is missing', { examinationsPort: false }],
    ['an operator-seeded run', { rows: () => [runRow({ execution_boundary: 'operator_synthetic_uat' })] }],
    ['two runs', { rows: () => [runRow(), runRow({ id: '66666666-6666-4666-8666-666666666666' })] }],
    ['a tampered run', { rows: () => [runRow({ envelope_sha256: 'f'.repeat(64) })] }],
  ] as const)('fails closed (409, nothing stored) when %s', async (_n, o) => {
    const w = world(o)
    expect(await prepare(w.deps, { include_examinations: true })).toEqual({ ok: false, status: 409, code: 'examination_unavailable' })
    expect(w.rows).toEqual([])
  })

  test('without a wording approval for the examination-bearing record (v6), nothing is prepared (503)', async () => {
    const w = world({ textVersion: CUSTOMER_RECORD_SCHEMA_VERSION })
    expect(await prepare(w.deps, { include_examinations: true })).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(w.rows).toEqual([])
  })

  test('the browser can never supply a projection, comparison or envelope', async () => {
    const w = world()
    for (const extra of [{ examinations: [{ document_id: DOC_ID }] }, { comparison: [] }, { envelope: {} }, { projection: {} }])
      expect(await prepare(w.deps, { include_examinations: true, ...extra })).toEqual({ ok: false, status: 400, code: 'invalid_request' })
    expect(w.rows).toEqual([])
  })
})

describe('creator responses: closed codes, this version only, never carried silently', () => {
  test('a response is recorded on the NEW version it is given in, attributed to the creator; the observation and comparison are unchanged', async () => {
    const w = world()
    const v1 = viewOf(await prepare(w.deps, { include_examinations: true }))
    const obs = v1.examination!.documents[0].observations[0]
    const responses = [
      { target: { kind: 'observation', run_id: RUN_ID, observation_id: obs.observation_id }, code: 'reading_incorrect' },
      { target: { kind: 'comparison', tool_index: 0, document_id: DOC_ID, field: 'plan' }, code: 'other_plan_applies' },
    ]
    const v2 = viewOf(await prepare(w.deps, { draft_id: v1.draft_id, include_examinations: true, responses }))
    expect(v2.version).toBe(2)
    expect(v2.examination!.responses.map((r) => [r.target.kind, r.code, r.given_in_version])).toEqual([['comparison', 'other_plan_applies', 2], ['observation', 'reading_incorrect', 2]])
    // Evidence untouched: the same observations and comparisons as v1.
    expect(v2.examination!.documents).toEqual(v1.examination!.documents)
    expect(v2.examination!.comparisons).toEqual(v1.examination!.comparisons)
    // v1 is immutable and still has no responses.
    expect((await getPrepared(w.deps, OWNER, v1.id) as { view: PreparedView }).view.examination!.responses).toEqual([])
  })

  test.each([
    ['an unknown code', { target: { kind: 'comparison', tool_index: 0, document_id: DOC_ID, field: 'plan' }, code: 'approved' }],
    ['free text', { target: { kind: 'comparison', tool_index: 0, document_id: DOC_ID, field: 'plan' }, code: 'not_relevant', note: 'x' }],
    ['a target not in this version', { target: { kind: 'observation', run_id: RUN_ID, observation_id: 'nope' }, code: 'not_relevant' }],
    ['a comparison of another tool', { target: { kind: 'comparison', tool_index: 3, document_id: DOC_ID, field: 'plan' }, code: 'not_relevant' }],
  ])('refuses %s (400, nothing stored)', async (_n, response) => {
    const w = world()
    expect(await prepare(w.deps, { include_examinations: true, responses: [response] })).toEqual({ ok: false, status: 400, code: 'invalid_responses' })
    expect(w.rows).toEqual([])
  })

  test('NO SILENT CARRY-FORWARD: a later version has no responses unless re-sent; unchanged targets are only LISTED', async () => {
    const w = world()
    const v1 = viewOf(await prepare(w.deps, { include_examinations: true }))
    const obs = v1.examination!.documents[0].observations[0]
    const given = [
      { target: { kind: 'observation', run_id: RUN_ID, observation_id: obs.observation_id }, code: 'reading_incorrect' },
      { target: { kind: 'comparison', tool_index: 0, document_id: DOC_ID, field: 'plan' }, code: 'other_plan_applies' },
    ]
    const v2 = viewOf(await prepare(w.deps, { draft_id: v1.draft_id, include_examinations: true, responses: given }))
    // Same answers, no responses sent: v3 has none; both earlier responses are listed (targets unchanged).
    const v3 = viewOf(await prepare(w.deps, { draft_id: v2.draft_id, include_examinations: true }))
    expect(v3.examination!.responses).toEqual([])
    expect(v3.carry_forward_candidates).toEqual(expect.arrayContaining(given))
    expect(v3.carry_forward_candidates).toHaveLength(2)
    // Explicit re-affirmation: re-sent, recorded as v4.
    const v4 = viewOf(await prepare(w.deps, { draft_id: v3.draft_id, include_examinations: true, responses: v3.carry_forward_candidates }))
    expect(v4.examination!.responses.every((r) => r.given_in_version === 4)).toBe(true)
  })

  test('changing the declaration replaces the comparison and drops the comparison response from the candidates', async () => {
    const w = world()
    const v1 = viewOf(await prepare(w.deps, { include_examinations: true }))
    const obs = v1.examination!.documents[0].observations[0]
    const v2 = viewOf(await prepare(w.deps, { draft_id: v1.draft_id, include_examinations: true, responses: [
      { target: { kind: 'observation', run_id: RUN_ID, observation_id: obs.observation_id }, code: 'reading_incorrect' },
      { target: { kind: 'comparison', tool_index: 0, document_id: DOC_ID, field: 'plan' }, code: 'other_plan_applies' },
    ] }))
    const v3 = viewOf(await preparePrepared(w.deps, OWNER, { state: state('Standard'), documents: REF, draft_id: v2.draft_id, include_examinations: true }))
    expect(v3.examination!.comparisons[0].declared.plan).toBe('Standard')
    expect(v3.examination!.comparisons[0].plan).toEqual({ result: 'not_assessed', reason: 'determination_withheld' })
    expect(v3.carry_forward_candidates).toEqual([{ target: { kind: 'observation', run_id: RUN_ID, observation_id: obs.observation_id }, code: 'reading_incorrect' }])
  })

  test('responses are refused without include_examinations', async () => {
    const w = world()
    expect(await prepare(w.deps, { responses: [] })).toEqual({ ok: false, status: 400, code: 'invalid_responses' })
  })
})

describe('compatibility and closed behaviour', () => {
  test('an examination-bearing version cannot be bought (no production run check is wired)', async () => {
    const w = world()
    const v = viewOf(await prepare(w.deps, { include_examinations: true }))
    const row = { ...w.rows[0], status: 'reviewed' as const, reviewed_at: NOW.toISOString() }
    const deps: PurchaseDeps = {
      submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true,
      getPrepared: async () => row, latestVersion: async () => row, boundTo: async () => null,
      bind: async () => { throw new Error('must not bind') }, governance: () => ({ approved: false } as never), now: () => NOW,
      evidenceIntact: async () => ({ ok: true }),
    }
    expect(await startPurchase(deps, OWNER, v.id)).toEqual({ ok: false, status: 409, code: 'evidence_unavailable' })
  })

  test('submissions stopped: nothing is prepared and no projection is looked up', async () => {
    const w = world()
    const r = await preparePrepared({ ...w.deps, submissions: 'stopped' }, OWNER, { state: state(), documents: REF, include_examinations: true })
    expect(r).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect([w.rows, w.lookups]).toEqual([[], []])
  })
})

describe('Check 1 — governance authority for the examination-bearing record', () => {
  const withApproval = (over: Partial<SourceTextApproval>) => {
    const w = world()
    return { ...w, deps: { ...w.deps, inputs: () => ({ sources: SOURCES, source_text: { approval: { ...textApproval(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION), ...over }, acknowledgements: ACKS } }) } }
  }

  test.each([
    ['a draft (not approved) v6 approval', { lifecycle: 'draft' as SourceTextApproval['lifecycle'] }],
    ['a withdrawn v6 approval', { lifecycle: 'withdrawn' as SourceTextApproval['lifecycle'] }],
    ['an approval without an authority', { authority: '' }],
    ['an approval of other wording (digest mismatch)', { content_sha256: 'f'.repeat(64) }],
    ['an approval for another record schema version', { record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: 7 } }],
  ])('%s cannot authorise an examination-bearing version (503, nothing stored)', async (_n, over) => {
    const w = withApproval(over)
    expect(await prepare(w.deps, { include_examinations: true })).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(w.rows).toEqual([])
  })

  test('the browser cannot supply or override an approval, sources or schema', async () => {
    const w = world({ textVersion: CUSTOMER_RECORD_SCHEMA_VERSION })
    for (const extra of [{ source_text: { approval: textApproval(6) } }, { approval: {} }, { sources: {} }, { record_schema: { version: 6 } }, { schema_version: 6 }])
      expect(await prepare(w.deps, { include_examinations: true, ...extra })).toEqual({ ok: false, status: 400, code: 'invalid_request' })
    expect(w.rows).toEqual([])
  })

  test('approvals come only from the server’s governed bundle: Production has none, so the page offers nothing', async () => {
    const { approvedCustomerRecordInputs } = await import('@/lib/creator-record/customer-flow/approved-inputs')
    expect(approvedCustomerRecordInputs().source_text).toBeNull()
    const { readFileSync } = await import('node:fs')
    const page = readFileSync(require('node:path').join(process.cwd(), 'app/creator-record/page.tsx'), 'utf8')
    // The v6 offer is computed from the same server inputs, and only after every existing gate passes.
    expect(page.indexOf('const examinationOffered')).toBeGreaterThan(page.indexOf('if (!check.ok || !inputs.source_text) return <Unavailable'))
    // Draft X3 wording is display text only: nothing reads it as an approval.
    expect(readFileSync(require('node:path').join(process.cwd(), 'lib/creator-record/customer-flow/service.ts'), 'utf8')).not.toMatch(/examination-ui|EXAM_TEXT|X3_WORDING_STATUS/)
  })

  test('upload consent is gated independently: the intake never reads a wording approval, the consent stays the draft identifier and real documents stay locked', async () => {
    const { readFileSync } = await import('node:fs')
    const p = require('node:path')
    for (const f of ['lib/creator-record/evidence-intake/service.ts', 'lib/creator-record/evidence-intake/contract.ts', 'lib/creator-record-flow/evidence-production.ts', 'app/api/creator-record-v2/evidence/route.ts'])
      expect([f, /source_text|SourceTextApproval|record_schema|CUSTOMER_RECORD_EXAMINATION|approvedCustomerRecordInputs/.test(readFileSync(p.join(process.cwd(), f), 'utf8'))]).toEqual([f, false])
    const contract = await import('@/lib/creator-record/evidence-intake/contract')
    expect(contract.EVIDENCE_CONSENT_DRAFT_VERSION).toMatch(/^DRAFT-UNAPPROVED-/)
    expect(contract.EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
  })
})

describe('Check 2 — examination run identity across versions', () => {
  const storedProjection = (row: PreparedRow) => {
    const rec = JSON.parse(row.canonical) as { documents: { items: { examination: unknown }[] } }
    const p = rec.documents.items[0].examination as { run_id: string; envelope_sha256: string; run_integrity: string; verification: string }
    return [p.run_id, p.envelope_sha256, p.run_integrity, p.verification]
  }

  test('every examination-bearing version records its exact evidence basis, and revisions reuse the same persisted run', async () => {
    const w = world()
    const v1 = viewOf(await prepare(w.deps, { include_examinations: true }))
    const obs = v1.examination!.documents[0].observations[0]
    await prepare(w.deps, { draft_id: v1.draft_id, include_examinations: true, responses: [{ target: { kind: 'observation', run_id: RUN_ID, observation_id: obs.observation_id }, code: 'not_relevant' }] })
    await preparePrepared(w.deps, OWNER, { state: state('Standard'), documents: REF, draft_id: v1.draft_id, include_examinations: true })
    const expected = [RUN_ID, sha256Hex(ENVELOPE_TEXT), 'persisted_run_rechecked', 'not_verified']
    expect(w.rows.map(storedProjection)).toEqual([expected, expected, expected])
  })

  test('more than one persisted run fails closed: no newest-run or implicit selection, even when one run is newer', async () => {
    const newer = runRow({ id: '66666666-6666-4666-8666-666666666666', created_at: '2026-11-04T00:00:00.000Z' })
    const w = world({ rows: () => [runRow(), newer] })
    expect(await prepare(w.deps, { include_examinations: true })).toEqual({ ok: false, status: 409, code: 'examination_unavailable' })
    expect(w.rows).toEqual([])
  })
})
