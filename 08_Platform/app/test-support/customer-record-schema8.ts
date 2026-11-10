/**
 * CR-V2-MVP-M3A — test fixture only (never imported by application code): a real examination-bearing Creator Record (schema 8),
 * built by the real record builder from synthetic test sources, with examinations produced by the real replay adapter over fake
 * ports (no database, Storage, model or network), exactly as the X0/X3 record suites do. Used by the schema 8 PDF tests and by the
 * tsx layout check.
 */
import { createHash } from 'node:crypto'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { buildCustomerRecord, type CustomerRecordDocument, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'
import type { CreatorResponseInput } from '@/lib/creator-record/customer-record/examination-section'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineAndRecord, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { projectVerifiedRun } from '@/lib/creator-record/examination/projection'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'

export const OWNER = '11111111-1111-4111-8111-111111111111'
export const AS_OF = '2026-11-06'

/** The documents of the fixture: two examined (one per replay fixture), one never examined. */
export const DOCS = [
  { document_id: '33333333-3333-4333-8333-333333333331', fixture_id: 'pdf-pika-pro-no-period', run_id: '44444444-4444-4444-8444-444444444441', category: 'billing_receipt', tool_index: 0 },
  { document_id: '33333333-3333-4333-8333-333333333332', fixture_id: 'conflict-two-plan-names', run_id: '44444444-4444-4444-8444-444444444442', category: 'billing_receipt', tool_index: null },
  { document_id: '33333333-3333-4333-8333-333333333333', fixture_id: null, run_id: null, category: 'licence', tool_index: null },
] as const

const standIn = (id: string) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.from(`synthetic-test:${id}`)])

async function examined(documentId: string, fixtureId: string, runId: string): Promise<{ envelope: ExaminationEnvelope; row: PersistedRunRow }> {
  const fixture = REPLAY_FIXTURES.find((f) => f.fixture_id === fixtureId)
  if (!fixture) throw new Error(`no replay fixture ${fixtureId}`)
  const bytes = standIn(fixtureId)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const table = buildReplayTable([{ ...fixture, sha256: sha }])
  let text = ''
  const r = await examineAndRecord(
    {
      core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: defaultProfileRegistry() },
      storage: {
        async getDocument(id) { return id === documentId ? { id: documentId, user_id: OWNER, sha256: sha, media_type: 'image/png', byte_size: bytes.length, state: 'stored' } : null },
        async logExaminationRead() { return 1 },
        async readObject() { return bytes },
        async recordExamination(_id, t) { text = t; return { run_id: runId, result: 'created' } },
        async listRuns() { return [] },
      },
    },
    { actor_user_id: OWNER, document_id: documentId, profile: { id: 'receipt', version: 1 } },
  )
  if (r.kind !== 'recorded') throw new Error(`fixture run not recorded: ${r.kind}`)
  const e = r.envelope
  const row: PersistedRunRow = {
    id: runId, examination_key: e.examination_key, document_id: documentId, user_id: OWNER, document_sha256: e.document.sha256,
    envelope_version: e.envelope.version, content_class: e.content_class, workflow_authorization: e.workflow_authorization,
    execution_boundary: 'customer_path_synthetic_uat', environment_project_ref: 'aaaaaaaaaaaaaaaaaaaa', profile_id: e.profile.id,
    profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode,
    replay_set: e.executor.replay_set, recording_sha256: e.executor.recording_sha256, replay_fixture_id: e.provenance.replay_fixture_id,
    outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, envelope_canonical: text, envelope_sha256: sha256Hex(text),
    supersedes_id: null, access_log_id: 1, uat_grant_id: '55555555-5555-4555-8555-555555555555', created_at: '2026-11-03T08:55:00.000Z',
  }
  return { envelope: e, row }
}

export interface Schema8Fixture {
  canonical: string
  sha256: string
  record: CustomerRecordV2
  envelopes: Map<string, ExaminationEnvelope>
}

/**
 * A schema 8 record. `fileNames` overrides the stored file names (for Unicode and long-text checks); `responses` builds a function
 * of the envelopes, so a response can target a real observation.
 */
export async function schema8Fixture(o: {
  fileNames?: string[]
  title?: string
  responses?: (envelopes: Map<string, ExaminationEnvelope>, runIds: Map<string, string>) => CreatorResponseInput[]
  /** CR-V2-MVP-INTEGRATION-2: per document (same order as DOCS), a different replay fixture and/or tool link. */
  docs?: ({ fixture_id?: string | null; tool_index?: number | null } | undefined)[]
  /** CR-V2-MVP-INTEGRATION-2: the declared plan for tool 1 (default 'Standard'). */
  plan?: string
} = {}): Promise<Schema8Fixture> {
  const SYN = syntheticUatInputs()
  if (!SYN.source_text_examination) throw new Error('no synthetic schema 8 wording approval')
  const envelopes = new Map<string, ExaminationEnvelope>()
  const runIds = new Map<string, string>()
  const documents: CustomerRecordDocument[] = []
  const examinations = []
  for (const [i, base] of DOCS.entries()) {
    const d = { ...base, ...(o.docs?.[i] ?? {}) }
    const bytes = standIn(d.fixture_id ?? 'not-examined')
    documents.push({
      document_id: d.document_id, sha256: createHash('sha256').update(bytes).digest('hex'), media_type: 'image/png', byte_size: bytes.length,
      file_name: o.fileNames?.[i] ?? `synthetic-${i + 1}.png`, category: d.category, tool_index: d.tool_index,
    })
    if (d.fixture_id && d.run_id) {
      const x = await examined(d.document_id, d.fixture_id, d.run_id)
      const p = projectVerifiedRun(x.row, OWNER, d.document_id)
      if (!p.ok) throw new Error(`projection refused: ${p.reason}`)
      envelopes.set(d.document_id, x.envelope)
      runIds.set(d.document_id, d.run_id)
      examinations.push({ document_id: d.document_id, projection: p.projection })
    }
  }
  const b = buildCustomerRecord({
    state: {
      answers: { P1: [o.title ?? 'Schema 8 test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] },
      tools: [{ T1: ['pika'], T3: [o.plan ?? 'Standard'] }],
      acknowledgements: { A1: true, A2: true },
    },
    sources: SYN.sources,
    source_text: SYN.source_text_examination,
    topicClaims: CLAIMS,
    as_of: AS_OF,
    record: { record_id: 'PREP-99999999-9999-4999-8999-999999999999', record_version: 2, captured_at: '2026-11-06T09:00:00.000Z' },
    documents,
    examinations,
    responses: o.responses ? o.responses(envelopes, runIds) : [],
  })
  if (!b.ok) throw new Error(`fixture: ${JSON.stringify(b).slice(0, 400)}`)
  return { canonical: b.canonical, sha256: b.sha256, record: b.record, envelopes }
}
