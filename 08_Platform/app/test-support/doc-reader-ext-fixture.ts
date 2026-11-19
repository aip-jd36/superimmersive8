/**
 * CR-DOC-READER-EXT-2 — shared synthetic fixture: a real schema 8 record (real record builder; the four candidates under a SYNTHETIC
 * approval; a licence document read through the real replay core by the inactive licence profile) and the candidate v8 template set
 * under a SYNTHETIC approval. Test and proof use only; registered nowhere.
 */
import { createHash } from 'node:crypto'
import { approvedCustomerRecordInputs, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerDocument, CustomerPdfRefusal, type Block } from '@/lib/creator-record/customer-pdf/document-model'
import { checkTemplates, templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerRecord, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA, type CustomerRecordDocument } from '@/lib/creator-record/customer-record/record'
import type { SourceTextInput } from '@/lib/creator-record/customer-record/sources'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { candidateTemplateSetV8, CR_DOC_READER_EXT_2_TEMPLATE_STATUS, V7_NOT_DONE_COMPARISON_LINE, V8_NOT_DONE_COMPARISON_LINE } from '@/test-support/doc-reader-ext-2-template'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PDF_TEMPLATE_SETS } from '@/lib/creator-record/governed/sources'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { examineAndRecord, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { projectVerifiedRun } from '@/lib/creator-record/examination/projection'
import { buildProfileRegistry } from '@/lib/creator-record/examination/profile'
import { RECEIPT_PROFILE } from '@/lib/creator-record/examination/receipt-profile'
import { LICENCE_PROFILE_INACTIVE } from '@/lib/creator-record/examination/licence-profile'
import { knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import type { CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'

export const AS_OF = '2026-11-18'
const OWNER = '11111111-1111-4111-8111-111111111111'
const DOC = '33333333-3333-4333-8333-3333333333b1'
const RUN = '44444444-4444-4444-8444-4444444444b1'
const BASE = approvedCustomerRecordInputs(GOV).sources
// CR-DOC-READER-EXT-6E: the four entries and their labels are now in the live (approved) ledger and labels, so they are used as is.
const SOURCES: CreatorRecordSources = withQuestionnaireApproval({ ...BASE })
const ACKS = (s: CreatorRecordSources): Record<string, string> => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function textFor(s: CreatorRecordSources, schemaVersion: number): SourceTextInput {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  const approval: SourceTextApproval = {
    source_id: SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: schemaVersion },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: AS_OF, review_ref: 'SYNTHETIC-DOC-READER-EXT-2',
  }
  return { approval, acknowledgements: ACKS(s) }
}

export const LICENCE_OUTPUT = {
  document_kind: 'licence_or_licence_certificate', readability: 'legible', instruction_like_text_present: false, personal_details_present: true,
  licence_or_plan_type: { status: 'present', value: 'Pro', evidence: 'Licence type: Pro' },
  content_designation: { status: 'not_shown', value: null, evidence: null },
  permission_statement: { status: 'not_shown', value: null, evidence: null },
  licensed_item_reference: { status: 'present', value: 'Synthetic Track 7', evidence: 'Track: Synthetic Track 7' },
  issue_date: { status: 'present', value: '2026-10-01', evidence: 'Issued 2026-10-01' },
  valid_until: { status: 'not_shown', value: null, evidence: null },
}
const BYTES = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic-test:licence-pdf\n%%EOF\n'))
const SHA = createHash('sha256').update(BYTES).digest('hex')

/** The licence document read through the real replay core and persisted as a row, then projected exactly as issuance does. */
async function licenceExamination(output: unknown = LICENCE_OUTPUT) {
  const table = buildReplayTable([{ fixture_id: 'synthetic-licence-pdf', sha256: SHA, media_type: 'application/pdf', parsed_output: output }])
  let text = ''
  const r = await examineAndRecord(
    {
      core: { fixtures: knownFixtureRegistry(table), executor: replayExecutor(table), profiles: buildProfileRegistry([RECEIPT_PROFILE, LICENCE_PROFILE_INACTIVE]) },
      storage: {
        async getDocument(id) { return id === DOC ? { id: DOC, user_id: OWNER, sha256: SHA, media_type: 'application/pdf', byte_size: BYTES.length, state: 'stored' } : null },
        async logExaminationRead() { return 1 },
        async readObject() { return BYTES },
        async recordExamination(_id, t) { text = t; return { run_id: RUN, result: 'created' } },
        async listRuns() { return [] },
      },
    },
    { actor_user_id: OWNER, document_id: DOC, profile: { id: 'licence', version: 3 } },
  )
  if (r.kind !== 'recorded') throw new Error(`not recorded: ${r.kind}`)
  const e = r.envelope
  const row: PersistedRunRow = {
    id: RUN, examination_key: e.examination_key, document_id: DOC, user_id: OWNER, document_sha256: e.document.sha256,
    envelope_version: e.envelope.version, content_class: e.content_class, workflow_authorization: e.workflow_authorization,
    execution_boundary: 'customer_path_synthetic_uat', environment_project_ref: 'aaaaaaaaaaaaaaaaaaaa', profile_id: e.profile.id,
    profile_version: e.profile.version, schema_version: e.profile.schema, prompt_version: e.profile.prompt, executor_mode: e.executor.mode,
    replay_set: e.executor.replay_set, recording_sha256: e.executor.recording_sha256, replay_fixture_id: e.provenance.replay_fixture_id,
    outcome_status: e.outcome.status, outcome_reason: e.outcome.reason, envelope_canonical: text, envelope_sha256: sha256Hex(text),
    supersedes_id: null, access_log_id: 1, uat_grant_id: '55555555-5555-4555-8555-555555555555', created_at: '2026-11-18T08:55:00.000Z',
  }
  const p = projectVerifiedRun(row, OWNER, DOC)
  if (!p.ok) throw new Error(`projection refused: ${p.reason}`)
  return p.projection
}

export async function licenceRecord(materials: Record<string, string[]>, category = 'licence', tool_index: number | null = null, output: unknown = LICENCE_OUTPUT) {
  const document: CustomerRecordDocument = { document_id: DOC, sha256: SHA, media_type: 'application/pdf', byte_size: BYTES.length, file_name: 'synthetic-licence.pdf', category: category as CustomerRecordDocument['category'], tool_index }
  const b = buildCustomerRecord({
    state: { answers: { P1: ['Synthetic licence test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], H1: ['edited'], ...materials }, tools: [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } } as never,
    sources: SOURCES,
    source_text: textFor(SOURCES, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION),
    topicClaims: CLAIMS,
    as_of: AS_OF,
    record: { record_id: 'PREP-doc-reader-ext-2', record_version: 1, captured_at: `${AS_OF}T09:00:00.000Z` },
    documents: [document],
    examinations: [{ document_id: DOC, projection: await licenceExamination(output) }],
    responses: [],
  } as never)
  if (!b.ok) throw new Error(JSON.stringify(b).slice(0, 500))
  return b
}

export const V8 = candidateTemplateSetV8()
export const SYNTHETIC_V8: PdfTemplateApproval = { ...V8.approval, lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: AS_OF } as PdfTemplateApproval
export const ISSUED = { record_id: 'CR-2026-0000E2B1', issued_on: AS_OF }
