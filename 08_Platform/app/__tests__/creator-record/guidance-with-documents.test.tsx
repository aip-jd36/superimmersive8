/**
 * Governed guidance beside the document examination, through the real prepare flow and the Kling fixture recording:
 * provenance, claim association, missing evidence and unchanged conclusions. The examination run comes from the REAL
 * adapter over fake ports. No database, Storage, route, model or network is used; every approval is a synthetic fixture.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExaminationReview } from '@/components/creator-record/ExaminationReview'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { examinationProjectionFor } from '@/lib/creator-record/customer-flow/examination'
import { preparePrepared as prepareAsSent, verifiedRecord, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedView } from '@/lib/creator-record/customer-flow/service'
import { guidanceWithDocuments } from '@/lib/creator-record/customer-flow/guidance-with-documents'
import { CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, type CustomerRecordV2 } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { buildReplayTable } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import type { EvidenceRow } from '@/lib/creator-record/evidence-intake/service'
import type { ExaminationEnvelope } from '@/lib/creator-record/examination/envelope'
import { examineAndRecord, type ExaminationAdapterDeps, type PersistedRunRow } from '@/lib/creator-record/examination/persistence'
import { defaultProfileRegistry, knownFixtureRegistry, replayExecutor } from '@/lib/creator-record/examination/replay-executor'
import { T } from '@/lib/creator-record/presentation/templates'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { EXAM_TEXT } from '@/lib/creator-record-flow/examination-ui'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

const preparePrepared = namingCurrentContract(prepareAsSent)

const OWNER = '11111111-1111-4111-8111-111111111111'
const DOC_ID = '33333333-3333-4333-8333-333333333333'
const RUN_ID = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-11-01T09:00:00.000Z')
const BASELINE = 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1'
const MEMBER = 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1'
const PIKA_PRO = 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1'

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
const ANS = { P1: ['Synthetic guidance video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const KLING = { T1: ['kling'], T3: ['Pro'], T4: ['May 2026'] }
const PIKA = { T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }
const state = (tools: Record<string, string[]>[]): CreatorRecordFormState => ({ answers: { ...ANS }, tools, acknowledgements: { A1: true, A2: true } })

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
function runRow(): PersistedRunRow {
  const env = ENVELOPE
  return {
    id: RUN_ID, examination_key: env.examination_key, document_id: DOC_ID, user_id: OWNER, document_sha256: env.document.sha256,
    envelope_version: env.envelope.version, content_class: env.content_class, workflow_authorization: env.workflow_authorization,
    execution_boundary: 'customer_path_synthetic_uat', environment_project_ref: 'lehqgcgnenwdmuzudbrs', profile_id: env.profile.id,
    profile_version: env.profile.version, schema_version: env.profile.schema, prompt_version: env.profile.prompt, executor_mode: env.executor.mode,
    replay_set: env.executor.replay_set, recording_sha256: env.executor.recording_sha256, replay_fixture_id: env.provenance.replay_fixture_id,
    outcome_status: env.outcome.status, outcome_reason: env.outcome.reason, envelope_canonical: ENVELOPE_TEXT, envelope_sha256: sha256Hex(ENVELOPE_TEXT),
    supersedes_id: null, access_log_id: 1, uat_grant_id: '55555555-5555-4555-8555-555555555555', created_at: '2026-11-01T08:55:00.000Z',
  }
}

/** One version through the real prepare flow, with an in-memory store. Same ids each time, so records are comparable. */
async function prepared(o: { tools: Record<string, string[]>[]; toolIndex?: number | null; include?: boolean; attach?: boolean }): Promise<{ view: PreparedView; record: CustomerRecordV2 }> {
  const include = o.include ?? true
  const attach = o.attach ?? true
  const rows: PreparedRow[] = []
  let n = 0
  const doc: EvidenceRow = { id: DOC_ID, user_id: OWNER, sha256: STAND_IN_SHA, media_type: 'image/png', byte_size: STAND_IN.length, file_name: 'synthetic-receipt.png', storage_path: `${OWNER}/${DOC_ID}`, consent_version: 'DRAFT', state: 'stored', created_at: NOW.toISOString(), stored_at: NOW.toISOString(), deleted_at: null, object_removed_at: null }
  const deps: FlowDeps = {
    submissions: 'open',
    hasPilotAccess: async () => true,
    store: {
      async insert(r: NewPreparedRow) { const row: PreparedRow = { ...r, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }; rows.push(row); return row },
      async get(id) { return rows.find((r) => r.id === id) ?? null },
      async latestVersion() { return null },
      async markReviewed() { return null },
    },
    inputs: () => ({ sources: SOURCES, source_text: { approval: textApproval(include ? CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION : CUSTOMER_RECORD_SCHEMA_VERSION), acknowledgements: ACKS } }),
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => NOW,
    newId: () => `${String(++n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    evidence: { get: async (id) => (id === DOC_ID ? doc : null) },
    examinations: { projectionFor: (u, d) => examinationProjectionFor({ listRuns: async () => [runRow()] }, u, d) },
  }
  const toolIndex = o.toolIndex === undefined ? 0 : o.toolIndex
  const r = await preparePrepared(deps, OWNER, { state: state(o.tools), ...(attach ? { documents: [{ document_id: DOC_ID, category: 'billing_receipt', tool_index: toolIndex }] } : {}), ...(include ? { include_examinations: true } : {}) })
  if (!r.ok) throw new Error(`prepare refused: ${JSON.stringify(r)}`)
  const record = verifiedRecord(rows[0])
  if (!record) throw new Error('record did not verify')
  return { view: r.view, record }
}
const item = (v: PreparedView, claim: string) => {
  const g = v.examination?.guidance.find((x) => x.claim_id === claim)
  if (!g) throw new Error(`no guidance for ${claim}`)
  return g
}
const guidanceOnly = (r: CustomerRecordV2) => JSON.stringify(r.guidance)

describe('the Kling fixture: governed guidance beside the document observations', () => {
  test('both Kling claims are shown exactly as recorded, each linked to the examined document', async () => {
    const { view, record } = await prepared({ tools: [KLING] })
    expect(record.schema_version).toBe(8)
    expect(view.examination?.guidance.map((g) => g.claim_id).sort()).toEqual([BASELINE, MEMBER].sort())
    for (const g of view.examination!.guidance) {
      const recorded = record.guidance.items.find((i) => i.claim_id === g.claim_id)!
      expect(g.conclusion).toBe(recorded.conclusion)
      expect(g.explanation).toBe(recorded.explanation)
      expect(g.applicability_status).toBe(recorded.applicability.status)
      expect(g.tool_labels).toEqual(['Kling'])
      expect(g.documents.map((d) => d.document_id)).toEqual([DOC_ID])
    }
  })

  test('provenance: run, observations and limitations are the persisted envelope’s, never verified; the governed source stays separate', async () => {
    const { view, record } = await prepared({ tools: [KLING] })
    const g = item(view, MEMBER)
    const e = g.documents[0].examination
    if (e.status !== 'examined') throw new Error('not examined')
    expect(e.run_id).toBe(RUN_ID)
    expect(e.verification).toBe('not_verified')
    expect(e.observation_ids).toEqual(ENVELOPE.observations.map((o) => o.observation_id))
    expect(e.observation_ids).toHaveLength(10)
    expect(e.limitations).toEqual(ENVELOPE.limitations)
    expect(view.examination!.documents[0].observations.every((o) => o.verification === 'not_verified')).toBe(true)
    const recorded = record.guidance.items.find((i) => i.claim_id === MEMBER)!
    expect(g.provenance).toEqual({
      claim_last_verified: recorded.provenance.claim.last_verified,
      bounded_interpretation_status: recorded.provenance.bounded_interpretation.status,
      publication_entry_id: recorded.provenance.publication.entry_id,
      publication_version: recorded.provenance.publication.version,
    })
    // A governed proposition is never an observation value, and an observation value never enters the guidance text.
    expect(guidanceOnly(record)).not.toContain('Pro Plan - Monthly')
  })

  test('what cannot be established stays unresolved, with the receipt present', async () => {
    const { view } = await prepared({ tools: [KLING] })
    const g = item(view, MEMBER)
    expect(g.conclusion).toBe('relevant_applicability_unresolved')
    expect(g.applicability_status).toBe('unresolved')
    expect(g.unresolved_requirements).toEqual([{ fact: 'tool_account_status', tool: 'kling', tool_label: 'Kling', value: 'Member Account' }])
    expect(g.documents[0].comparison?.provider).toEqual({ result: 'not_assessed', reason: 'determination_withheld' })
  })
})

describe('unchanged conclusions: documents never reach guidance', () => {
  test.each([
    ['one tool, linked', [KLING], 0],
    ['two tools, linked to the first', [KLING, PIKA], 0],
    ['two tools, linked to the second (the seller appears to conflict)', [KLING, PIKA], 1],
    ['linked to no tool', [KLING], null],
  ] as const)('%s: guidance is byte-identical to the same declarations with no document', async (_n, tools, toolIndex) => {
    const withDocument = await prepared({ tools: [...tools], toolIndex })
    const without = await prepared({ tools: [...tools], include: false, attach: false })
    expect(withDocument.record.schema_version).toBe(8)
    expect(without.record.schema_version).toBe(7)
    expect(guidanceOnly(withDocument.record)).toBe(guidanceOnly(without.record))
  })
})

describe('claim association', () => {
  test('a document links only to the claims of its own tool block', async () => {
    const { view } = await prepared({ tools: [KLING, PIKA], toolIndex: 1 })
    expect(item(view, MEMBER).documents).toEqual([])
    expect(item(view, BASELINE).documents).toEqual([])
    const pika = item(view, PIKA_PRO)
    expect(pika.documents.map((d) => [d.document_id, d.tool_index])).toEqual([[DOC_ID, 1]])
    expect(pika.documents[0].comparison?.provider).toEqual({ result: 'not_assessed', reason: 'determination_withheld' })
    expect(pika.declared_plans).toEqual([{ tool_label: 'Pika', plan: 'Pro' }])
    // Its own requirement is met on the declaration, while BI holds the shared objective at unresolved (Kling Member).
    expect(pika.applicability_status).toBe('met')
    expect(pika.conclusion).toBe('relevant_applicability_unresolved')
  })

  test('an examined document linked to no tool links to no claim, and is still shown as an examination', async () => {
    const { view } = await prepared({ tools: [KLING], toolIndex: null })
    expect(view.examination?.documents.map((d) => d.document_id)).toEqual([DOC_ID])
    expect(view.examination?.guidance.every((g) => g.documents.length === 0)).toBe(true)
  })

  test('a selection the record cannot trace links to nothing; a claim with no tool scope links to nothing', async () => {
    const { record } = await prepared({ tools: [KLING] })
    const untraceable = JSON.parse(JSON.stringify(record)) as CustomerRecordV2
    for (const i of untraceable.guidance.items) for (const s of i.selection_basis.scopes) s.observation_ids = ['unknown-observation']
    expect(guidanceWithDocuments(untraceable).every((g) => g.documents.length === 0)).toBe(true)
    const unscoped = JSON.parse(JSON.stringify(record)) as CustomerRecordV2
    for (const i of unscoped.guidance.items) i.selection_basis.scopes = []
    expect(guidanceWithDocuments(unscoped).every((g) => g.documents.length === 0 && g.tool_labels.length === 0)).toBe(true)
  })
})

describe('missing evidence', () => {
  test('a linked document with no examination is reported as not examined, never as if it showed anything', async () => {
    const { record } = await prepared({ tools: [KLING] })
    const notExamined = JSON.parse(JSON.stringify(record)) as CustomerRecordV2
    notExamined.documents.items[0].examination = 'not_examined'
    notExamined.comparison = { ...notExamined.comparison, items: [] } as CustomerRecordV2['comparison']
    const [g] = guidanceWithDocuments(notExamined)
    expect(g.documents).toEqual([{ document_id: DOC_ID, tool_index: 0, examination: { status: 'not_examined' }, comparison: null }])
  })

  test('the view never changes the record it reads', async () => {
    const { record } = await prepared({ tools: [KLING] })
    const before = JSON.stringify(record)
    guidanceWithDocuments(record)
    expect(JSON.stringify(record)).toBe(before)
  })

  test('a version with no document has no examination view at all (the v5 journey is unchanged)', async () => {
    const { view } = await prepared({ tools: [KLING], include: false, attach: false })
    expect(view.examination).toBeUndefined()
  })
})

describe('presentation', () => {
  const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')
  const render = (view: PreparedView) => renderToStaticMarkup(<ExaminationReview view={view} busy={false} onRespond={() => undefined} />)

  test('declarations, unverified observations and governed guidance are visibly separate, in existing wording', async () => {
    const { view } = await prepared({ tools: [KLING] })
    const html = render(view)
    const member = html.slice(html.indexOf(`data-guidance-claim="${MEMBER}"`))
    const card = text(member.slice(0, member.indexOf('</article>')))
    expect(card).toContain(T.conclusion_label.relevant_applicability_unresolved)
    expect(card).toContain(item(view, MEMBER).explanation)
    expect(card).toContain(EXAM_TEXT.guidance_not_established_label)
    expect(card).toContain(T.not_established_next_account('Kling', 'Member Account').replace(/\s+/g, ' '))
    expect(card).toContain('synthetic-receipt.png')
    expect(card).toContain(EXAM_TEXT.guidance_examined_other.replace('{count}', '10'))
    expect(card).toContain(EXAM_TEXT.not_verified)
    expect(card).toContain(EXAM_TEXT.guidance_document_effect)
    expect(card).toContain(`Reference: ${MEMBER}`)
    expect(html.indexOf('data-examined-document')).toBeLessThan(html.indexOf('data-guidance-beside-documents'))
  })

  test('a claim with no linked document says so', async () => {
    const { view } = await prepared({ tools: [KLING], toolIndex: null })
    expect(render(view)).toContain('data-guidance-no-document')
    expect(text(render(view))).toContain(EXAM_TEXT.guidance_no_document)
  })

  test('no statement of clearance, verification or compliance is added', async () => {
    const { view } = await prepared({ tools: [KLING] })
    const added = text(render({ ...view, examination: { ...view.examination!, documents: [], comparisons: [], responses: [], guidance: view.examination!.guidance.map((g) => ({ ...g, explanation: '', caveats: [] })) } }))
    expect(added).not.toMatch(/\b(cleared|certified|compliant|compliance|verified (fact|licen)|approved for commercial|legally (safe|cleared)|guarantee)/i)
  })
})

describe('boundaries', () => {
  const src = readFileSync(path.join(process.cwd(), 'lib/creator-record/customer-flow/guidance-with-documents.ts'), 'utf8')
  test('the link reads no Living Knowledge runtime, retrieval, BI or evaluator, and has no provider-specific branch', () => {
    const runtimeImports = Array.from(src.matchAll(/^import (?!type)[^\n]*from '([^']+)'/gm)).map((m) => m[1])
    expect(runtimeImports.sort()).toEqual(['../identity/selectable-identities', '../prototype/form'])
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/evaluate|retriev|buildBounded|composeGuidance|['"](kling|runway|pika)['"]/i)
  })
})
