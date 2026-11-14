/**
 * CR-V2-DECL-1B-2 — contract identity from display to record.
 *
 * A preparation cannot silently use another questionnaire than the one shown; a new record keeps the whole contract and wording
 * it was prepared under; schema 5 and 6 records stay exactly as they are; issuance and the PDF stay closed for the new schemas.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getPrepared, preparePrepared, reviewPrepared, verifiedRecord, type ApprovedInputs, type FlowDeps, type NewPreparedRow, type PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { approvedCustomerRecordInputs, approvedGovernanceSnapshot, approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS, currentPublicationAuthority } from '@/lib/creator-record/customer-flow/approved-inputs'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { startPurchase, renderV2ForIssuance, V2IssuanceRefusal, type PurchaseDeps } from '@/lib/creator-record/customer-flow/purchase'
import { handlePrepareRequest } from '@/lib/creator-record-flow/route-handlers'
import { AUTHORITY_KINDS } from '@/lib/creator-record/customer-record/authority-content'
import { evaluateIssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom } from '@/lib/creator-record/customer-record/governance-state'
import { embeddedContractValid, questionnaireContract } from '@/lib/creator-record/customer-record/questionnaire-contract'
import { buildCustomerRecord, CUSTOMER_RECORD_BUILDER, CUSTOMER_RECORD_EXAMINATION_BUILDER, CUSTOMER_RECORD_EXAMINATION_CONTENT, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA_VERSION, HISTORICAL_EXAMINATION_SCHEMA_VERSION, HISTORICAL_RECORD_SCHEMA_VERSION, isExaminationBearing, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { buildCustomerDocument, CustomerPdfRefusal } from '@/lib/creator-record/customer-pdf/document-model'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN, SYNTHETIC_PDF_TEMPLATES_FINGERPRINT, SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256, SYNTHETIC_SOURCE_TEXT_SHA256 } from '@/lib/creator-record/governed/synthetic-test-authority'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'

jest.mock('@/lib/supabase/server', () => ({ createClient: () => ({}) }))

/* eslint-disable @typescript-eslint/no-explicit-any */
const OWNER = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-11-05T12:00:00.000Z')
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const CURRENT = SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256
const STATE = { answers: { P1: ['Title'], P3: ['own_channels'], F1: ['TW'], F2: ['US'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['kling'], T3: ['Pro'] }], acknowledgements: { A1: true, A2: true } }

/** The approved inputs after a real questionnaire change: the change itself, plus wording and contract approvals that name it. */
function changed(mutate: (i: any) => void, over: Record<string, unknown> = {}): ApprovedInputs {
  const i = clone(syntheticUatInputs()) as any
  mutate(i)
  i.source_text_examination.acknowledgements = i.source_text.acknowledgements
  const registry = loadQuestionRegistry(i.sources.registry_input)
  if (!registry.ok) throw new Error(registry.errors.join('; '))
  const wording = sourceTextDigest(sourceTextContent(i.sources, registry.registry, i.source_text.acknowledgements))
  i.source_text.approval.content_sha256 = wording
  i.source_text_examination.approval.content_sha256 = wording
  const contract = questionnaireContract(i.sources, wording)
  if (!contract.ok) throw new Error(JSON.stringify(contract))
  i.sources.questionnaire_approval = { ...i.sources.questionnaire_approval, contract_version: 2, contract_sha256: contract.sha256, ...over }
  return i
}
const CHANGED_ACK = 'CHANGED: an acknowledgement the creator was never shown.'
const CHANGED_QUESTION = 'CHANGED: a question the creator was never shown?'
const rewordedInputs = (): ApprovedInputs => changed((i) => { i.source_text.acknowledgements = { ...i.source_text.acknowledgements, A1: CHANGED_ACK }; i.sources.presentation.P1.text = CHANGED_QUESTION })
const shaOf = (i: ApprovedInputs): string => i.sources.questionnaire_approval!.contract_sha256

function world(inputs: () => ApprovedInputs = syntheticUatInputs, rows: PreparedRow[] = []) {
  let n = 0
  const inserts = { count: 0 }
  const deps: FlowDeps = {
    submissions: 'stopped', hasPilotAccess: async () => true,
    store: {
      async insert(r: NewPreparedRow) { inserts.count++; const row: PreparedRow = { ...r, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }; rows.push(row); return row },
      async get(id) { return rows.find((r) => r.id === id) ?? null },
      async latestVersion(d) { return rows.filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null },
      async markReviewed(id) { const r = rows.find((x) => x.id === id); if (!r || r.status !== 'prepared') return null; r.status = 'reviewed'; r.reviewed_at = NOW.toISOString(); return r },
    },
    inputs, topicClaims: CLAIMS, now: () => NOW,
    newId: () => `${String(++n + 100).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    syntheticUat: { admits: (u) => u === OWNER, inputs },
    examinations: { projectionFor: async () => ({ kind: 'none' }) as any },
  }
  return { deps, rows, inserts }
}
/** No argument: the current contract. An explicit undefined: no identity at all. */
function body(...args: [unknown?, Record<string, unknown>?]) {
  const sha = args.length === 0 ? CURRENT : args[0]
  return { state: STATE, ...(sha === undefined ? {} : { questionnaire_contract_sha256: sha }), ...(args[1] ?? {}) }
}
const CHANGED_CODE = { ok: false, status: 409, code: 'questionnaire_changed' }
const UNAVAILABLE = { ok: false, status: 503, code: 'unavailable' }
const BAD = { ok: false, status: 400, code: 'invalid_request' }

const record = (row: PreparedRow) => verifiedRecord(row)!

const SAVED = JSON.parse(readFileSync(join(__dirname, '..', '..', 'test-support', 'fixtures', 'pre-questionnaire-contract-rows.json'), 'utf8')) as PreparedRow[]
/**
 * A schema 8 version: the real examined row saved at fa1b8675, with what schema 8 adds to schema 6. The real path to schema 8 (a
 * persisted run, projected by the server) is exercised end to end by customer-examination-record and synthetic-uat.
 */
function stored8(): PreparedRow {
  const v6 = SAVED.find((r) => r.record_schema_version === 6)!
  const i = syntheticUatInputs()
  const plain = buildCustomerRecord({ state: STATE, sources: i.sources, source_text: i.source_text, topicClaims: CLAIMS, as_of: '2026-11-05', record: { record_id: 'PREP-x', record_version: 1, captured_at: NOW.toISOString() } })
  if (!plain.ok) throw new Error(JSON.stringify(plain))
  const r = JSON.parse(v6.canonical)
  r.schema_version = CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
  r.builder = CUSTOMER_RECORD_EXAMINATION_BUILDER
  r.content = CUSTOMER_RECORD_EXAMINATION_CONTENT
  r.sources.source_text.record_schema.version = CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION
  r.sources.questionnaire_contract = plain.record.sources.questionnaire_contract
  // CR-V2-MVP-PROD-PREP-1: the embedded contract names the current wording, so the source-text reference must name it too.
  r.sources.source_text.content_sha256 = plain.record.sources.source_text.content_sha256
  r.sources.source_text.categories = plain.record.sources.source_text.categories
  const canonical = canonicalJson(r)
  return { ...v6, canonical, sha256: sha256Hex(canonical), record_schema_version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, status: 'prepared', reviewed_at: null, submission_id: null }
}

describe('identity', () => {
  test('MATCHING: prepares, and normal validation still runs afterwards', async () => {
    const w = world()
    const ok = await preparePrepared(w.deps, OWNER, body())
    expect(ok).toMatchObject({ ok: true, view: { questionnaire_contract: { contract_version: 1, contract_sha256: CURRENT } } })
    expect(w.inserts.count).toBe(1)
    const blank = await preparePrepared(w.deps, OWNER, { state: { ...STATE, answers: { ...STATE.answers, P1: [] } }, questionnaire_contract_sha256: CURRENT })
    expect(blank).toMatchObject({ ok: false, status: 400, code: 'invalid_answers' })
    expect(w.inserts.count).toBe(1)
  })

  test.each([
    ['STALE: the contract the page was given has been replaced', CURRENT, rewordedInputs],
    ['FORGED: well formed, but not any contract', 'f'.repeat(64), syntheticUatInputs],
    ['MISSING: a page from before this check', undefined, syntheticUatInputs],
  ] as [string, string | undefined, () => ApprovedInputs][])('%s → 409, nothing written', async (_n, sha, inputs) => {
    const w = world(inputs)
    expect(await preparePrepared(w.deps, OWNER, body(sha))).toEqual(CHANGED_CODE)
    expect(w.inserts.count).toBe(0)
    expect(w.rows).toHaveLength(0)
  })

  test.each([[null], [1], [true], [''], ['abc'], ['F'.repeat(64)], ['g'.repeat(64)], ['a'.repeat(63)], ['a'.repeat(65)], [{ sha256: CURRENT }], [[CURRENT]], [` ${CURRENT}`]])('MALFORMED %j → 400, nothing written', async (sha) => {
    const w = world()
    expect(await preparePrepared(w.deps, OWNER, body(sha))).toEqual(BAD)
    expect(w.inserts.count).toBe(0)
  })

  test('the identity is never part of the answers, and no other name is accepted', async () => {
    const w = world()
    expect(await preparePrepared(w.deps, OWNER, { state: { ...STATE, questionnaire_contract_sha256: CURRENT }, questionnaire_contract_sha256: CURRENT })).toEqual(BAD)
    expect(await preparePrepared(w.deps, OWNER, body(CURRENT, { questionnaire_sha256: CURRENT }))).toEqual(BAD)
    expect(w.inserts.count).toBe(0)
  })

  test('a re-approval of identical content is not a change: only the digest is compared, and the record says which approval', async () => {
    const w = world(() => { const i = clone(syntheticUatInputs()) as any; i.sources.questionnaire_approval.contract_version = 2; return i })
    const r = await preparePrepared(w.deps, OWNER, body())
    expect(r).toMatchObject({ ok: true, view: { questionnaire_contract: { contract_version: 2, contract_sha256: CURRENT } } })
  })
})

describe('a matching digest is not authorization: approval failure takes precedence', () => {
  const withApproval = (over: Record<string, unknown>) => () => { const i = clone(syntheticUatInputs()) as any; i.sources.questionnaire_approval = { ...i.sources.questionnaire_approval, ...over }; return i as ApprovedInputs }
  const cases: [string, () => ApprovedInputs][] = [
    ['withdrawn', withApproval({ lifecycle: 'withdrawn' })],
    ['superseded', withApproval({ lifecycle: 'superseded' })],
    ['pending', withApproval({ lifecycle: 'pending' })],
    ['malformed', withApproval({ contract_sha256: 'nope' })],
    ['naming another contract', withApproval({ contract_sha256: 'e'.repeat(64) })],
    ['missing', () => { const i = clone(syntheticUatInputs()) as any; i.sources.questionnaire_approval = null; return i }],
    ['an unclassified field', () => { const i = clone(syntheticUatInputs()) as any; i.sources.brand_new_setting = true; return i }],
    ['no wording approval', () => { const i = clone(syntheticUatInputs()) as any; i.source_text = null; i.source_text_examination = null; return i }],
  ]
  test.each(cases)('%s: 503 for a matching, a stale and a missing identity alike; nothing written', async (_n, inputs) => {
    for (const sha of [CURRENT, 'f'.repeat(64), undefined]) {
      const w = world(inputs)
      expect(await preparePrepared(w.deps, OWNER, body(sha))).toEqual(UNAVAILABLE)
      expect(w.inserts.count).toBe(0)
    }
  })

  test('the exact digest of the approved synthetic contract opens nothing on the customer path', async () => {
    const w = world(() => approvedCustomerRecordInputs(GOV))
    w.deps.syntheticUat = undefined
    expect(await preparePrepared(w.deps, OWNER, body())).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    w.deps.submissions = 'open'
    // CR-V2-MVP-LEGAL-CONTENT-6: governance now has its own approved contract; the synthetic contract digest still opens nothing.
    expect((await preparePrepared(w.deps, OWNER, body())).ok).toBe(false)
    expect(w.inserts.count).toBe(0)
  })

  test('a malformed identity is still a bad request while approval is failing: the request was never readable', async () => {
    const w = world(withApproval({ lifecycle: 'withdrawn' }))
    expect(await preparePrepared(w.deps, OWNER, body(1))).toEqual(BAD)
  })
})

describe('a stale identity takes precedence over the answers', () => {
  test.each([
    ['invalid answers', { ...STATE, answers: { ...STATE.answers, P1: [] } }],
    ['an unknown question', { ...STATE, answers: { ...STATE.answers, ZZ: ['x'] } }],
    ['an unreadable state', 'not a state'],
    ['no state at all', undefined],
  ])('%s: 409, and the answers are not read', async (_n, state) => {
    const w = world(rewordedInputs)
    expect(await preparePrepared(w.deps, OWNER, { state, questionnaire_contract_sha256: CURRENT })).toEqual(CHANGED_CODE)
    expect(w.inserts.count).toBe(0)
  })

  test('nothing about documents or examinations is looked up for a stale form', async () => {
    const w = world(rewordedInputs)
    const evidence = jest.fn(async () => null)
    const projectionFor = jest.fn(async () => ({ kind: 'none' }) as any)
    w.deps.evidence = { get: evidence as any }
    w.deps.examinations = { projectionFor }
    const doc = { document_id: '33333333-3333-4333-8333-333333333333', category: 'billing_receipt', tool_index: 0 }
    expect(await preparePrepared(w.deps, OWNER, body(CURRENT, { documents: [doc], include_examinations: true }))).toEqual(CHANGED_CODE)
    expect(evidence).not.toHaveBeenCalled()
    expect(projectionFor).not.toHaveBeenCalled()
  })

  test('over HTTP: the same body, a fixed message, and no digest that could prompt an automatic resubmission', async () => {
    const w = world(rewordedInputs)
    const response = await handlePrepareRequest(new Request('http://local.invalid/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body()) }), OWNER, () => w.deps)
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(Object.keys(json).sort()).toEqual(['code', 'error'])
    expect(json.code).toBe('questionnaire_changed')
    expect(JSON.stringify(json)).not.toMatch(/[0-9a-f]{64}/)
    expect(w.inserts.count).toBe(0)
  })
})

describe('the questionnaire changes between display and submission', () => {
  test('the form shown is refused, then the form shown after the update records exactly its wording', async () => {
    const shown = shaOf(syntheticUatInputs())
    const w = world(rewordedInputs)
    expect(await preparePrepared(w.deps, OWNER, body(shown))).toEqual(CHANGED_CODE)
    const r = await preparePrepared(w.deps, OWNER, body(shaOf(rewordedInputs())))
    if (!r.ok) throw new Error(r.code)
    expect(r.view.declarations.acknowledgements.find((a) => a.id === 'A1')!.text).toBe(CHANGED_ACK)
    expect(r.view.declarations.answers.find((a) => a.q_id === 'P1')!.question).toBe(CHANGED_QUESTION)
    expect(r.view.questionnaire_contract!.contract_sha256).toBe(shaOf(rewordedInputs()))
  })

  test.each([
    ['option meaning, same stored value', (i: any) => { i.sources.presentation.F1.option_labels.TW = 'CHANGED meaning of TW' }],
    ['a question that stopped being required', (i: any) => { i.sources.presentation.H1.required = false }],
    ['applicability', (i: any) => { i.sources.registry_input.questions.find((q: any) => q.q_id === 'M1').display_condition = { kind: 'answer_includes', q_id: 'M0', any_of: ['music', 'not_sure'] } }],
    ['what an answer maps to', (i: any) => { i.sources.registry_input.observation_map.find((o: any) => o.q_id === 'H1').value_mapping_version = 'CHANGED' }],
    ['a removed question', (i: any) => {
      const r = i.sources.registry_input
      r.questions = r.questions.filter((q: any) => q.q_id !== 'H1'); r.observation_map = r.observation_map.filter((o: any) => o.q_id !== 'H1'); r.semantic_mappings = r.semantic_mappings.filter((m: any) => m.q_id !== 'H1')
      delete i.sources.presentation.H1
    }],
  ])('%s changes the contract, so the old form is refused', async (_n, mutate) => {
    const next = changed(mutate)
    expect(shaOf(next)).not.toBe(CURRENT)
    const w = world(() => next)
    expect(await preparePrepared(w.deps, OWNER, body(CURRENT))).toEqual(CHANGED_CODE)
    expect(w.inserts.count).toBe(0)
  })
})

describe('schema 7 and 8', () => {
  async function prepared(extra: Record<string, unknown> = {}, inputs: () => ApprovedInputs = syntheticUatInputs) {
    const w = world(inputs)
    const r = await preparePrepared(w.deps, OWNER, body(shaOf(inputs()), extra))
    if (!r.ok) throw new Error(JSON.stringify(r))
    return { ...w, view: r.view, row: w.rows[0], record: record(w.rows[0]) }
  }
  const build = () => {
    const i = syntheticUatInputs()
    return buildCustomerRecord({ state: STATE, sources: i.sources, source_text: i.source_text, topicClaims: CLAIMS, as_of: '2026-11-05', record: { record_id: 'PREP-x', record_version: 1, captured_at: NOW.toISOString() } })
  }

  test('a new declarations record is schema 7, with its builder, content and wording approval for that schema', async () => {
    const { record: r, row } = await prepared()
    expect(r.schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION)
    expect(row.record_schema_version).toBe(7)
    expect(r.builder).toEqual(CUSTOMER_RECORD_BUILDER)
    expect(r.sources.source_text.record_schema.version).toBe(7)
  })

  test('it embeds the contract identity, approval details, whole body and whole wording', async () => {
    const { record: r } = await prepared()
    const e = r.sources.questionnaire_contract!
    expect(Object.keys(e).sort()).toEqual(['authority', 'body', 'contract_id', 'contract_sha256', 'contract_version', 'decision_date', 'review_ref', 'wording'])
    expect(e).toMatchObject({ contract_id: 'si8/creator-record-v2-questionnaire-contract', contract_version: 1, contract_sha256: CURRENT, authority: SYN!.questionnaire_approval!.authority, decision_date: SYN!.questionnaire_approval!.decision_date, review_ref: SYN!.questionnaire_approval!.review_ref })
    expect(e.body.wording_sha256).toBe(SYNTHETIC_SOURCE_TEXT_SHA256)
    expect(sha256Hex(canonicalJson(e.wording))).toBe(SYNTHETIC_SOURCE_TEXT_SHA256)
    // Questions the creator was never asked, because no answer revealed them, are still there.
    expect(r.declarations.answers.map((a) => a.q_id)).not.toContain('M1X')
    expect(e.wording.questions.M1X.text).toBe(SYN!.presentation.M1X.text)
    expect((e.body.questions as any[]).map((q) => q.q_id)).toContain('M1X')
    expect(e.wording.acknowledgements).toEqual(SYN!.acknowledgements)
  })

  test('the browser gets the identity, never the body', async () => {
    const { view } = await prepared()
    expect(Object.keys(view.questionnaire_contract!).sort()).toEqual(['contract_id', 'contract_sha256', 'contract_version'])
    expect(JSON.stringify(view)).not.toContain('wording_sha256')
  })

  test('an examination-bearing record is schema 8 under the same contract, with both sets of checks', async () => {
    const row = stored8()
    const v = verifyCustomerRecord(row.canonical, row.sha256)
    if (!v.ok) throw new Error(v.reason)
    expect(v.record.schema_version).toBe(CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION)
    expect(v.record.sources.questionnaire_contract!.contract_sha256).toBe(CURRENT)
    expect(v.record.documents.policy).toBe('inventory_with_examination')
    // The examination checks still apply on top of the contract checks.
    const broken = JSON.parse(row.canonical)
    broken.comparison.policy = 'disabled'
    const c = canonicalJson(broken)
    expect(verifyCustomerRecord(c, sha256Hex(c))).toEqual({ ok: false, reason: 'wrong_schema' })
  })

  test('schema is a pure function of the record kind', () => {
    const plain = build()
    if (!plain.ok) throw new Error('build')
    expect(isExaminationBearing(plain.record)).toBe(false)
    for (const [v, want] of [[5, false], [6, true], [7, false], [8, true]] as const) expect(isExaminationBearing({ schema_version: v })).toBe(want)
  })

  describe('tampering, each resealed under a correct record digest', () => {
    const base = () => { const b = build(); if (!b.ok) throw new Error('build'); return JSON.parse(b.canonical) }
    const seal = (r: unknown) => { const c = canonicalJson(r); return verifyCustomerRecord(c, sha256Hex(c)) }
    const cases: [string, (r: any) => void][] = [
      ['contract body', (r) => { r.sources.questionnaire_contract.body.max_tools = 99 }],
      ['a question in the body', (r) => { r.sources.questionnaire_contract.body.questions[0].options = ['changed'] }],
      ['behaviour in the body', (r) => { r.sources.questionnaire_contract.body.presentation.P1.required = false }],
      ['wording: an answered question', (r) => { r.sources.questionnaire_contract.wording.questions.P1.text = 'Altered' }],
      ['wording: an unanswered question', (r) => { r.sources.questionnaire_contract.wording.questions.M1X.text = 'Altered' }],
      ['wording: an acknowledgement', (r) => { r.sources.questionnaire_contract.wording.acknowledgements.A1 = 'Altered' }],
      ['wording removed', (r) => { delete r.sources.questionnaire_contract.wording }],
      ['body removed', (r) => { delete r.sources.questionnaire_contract.body }],
      ['the digest', (r) => { r.sources.questionnaire_contract.contract_sha256 = 'e'.repeat(64) }],
      ['a malformed digest', (r) => { r.sources.questionnaire_contract.contract_sha256 = 'nope' }],
      ['body and digest together, wording no longer named', (r) => { const e = r.sources.questionnaire_contract; e.body.wording_sha256 = 'e'.repeat(64); e.contract_sha256 = sha256Hex(canonicalJson(e.body)) }],
      ['wording and body and digest together, record wording digest no longer matching', (r) => {
        const e = r.sources.questionnaire_contract
        e.wording.questions.P1.text = 'Altered'
        e.body.wording_sha256 = sha256Hex(canonicalJson(e.wording))
        e.contract_sha256 = sha256Hex(canonicalJson(e.body))
      }],
      ['approval identity: contract id', (r) => { r.sources.questionnaire_contract.contract_id = 'another' }],
      ['approval identity: version zero', (r) => { r.sources.questionnaire_contract.contract_version = 0 }],
      ['approval: blank authority', (r) => { r.sources.questionnaire_contract.authority = ' ' }],
      ['approval: blank review reference', (r) => { r.sources.questionnaire_contract.review_ref = '' }],
      ['approval: not a date', (r) => { r.sources.questionnaire_contract.decision_date = 'soon' }],
      ['an unknown field', (r) => { r.sources.questionnaire_contract.extra = 1 }],
      ['the contract removed', (r) => { delete r.sources.questionnaire_contract }],
      ['another registry version than the body', (r) => { r.sources.registry_version = 'another' }],
      ['wording approved for another schema', (r) => { r.sources.source_text.record_schema.version = 5 }],
      ['relabelled as examination-bearing', (r) => { r.schema_version = 8; r.sources.source_text.record_schema.version = 8 }],
      ['relabelled as a historical record while keeping the contract', (r) => { r.schema_version = 5 }],
      ['an examination section in a declarations record', (r) => { r.documents.policy = 'inventory_with_examination' }],
      ['responses in a declarations record', (r) => { r.creator_responses = { policy: 'closed_codes_this_version_only', items: [] } }],
    ]
    test('the untampered record verifies', () => expect(seal(base()).ok).toBe(true))
    test.each(cases)('%s → refused', (_n, tamper) => {
      const r = base()
      tamper(r)
      expect(seal(r)).toEqual({ ok: false, reason: 'wrong_schema' })
    })
    test('a stored row with an altered byte fails its own digest first', () => {
      const b = build()
      if (!b.ok) throw new Error('build')
      expect(verifyCustomerRecord(b.canonical.replace('"max_tools":2', '"max_tools":3'), b.sha256)).toEqual({ ok: false, reason: 'digest_mismatch' })
    })
    test('every embedded-contract check reads the record alone', () => {
      expect(embeddedContractValid({})).toBe(false)
      expect(embeddedContractValid(base().sources)).toBe(true)
    })
  })

  describe('independent reconstruction, from the stored text alone', () => {
    // Deliberately uses none of the application's canonicalization or contract code.
    const sorted = (v: any): string => Array.isArray(v) ? `[${v.map(sorted).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${sorted(v[k])}`).join(',')}}` : JSON.stringify(v)
    const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

    test('the row proves itself, and answers what was asked, how it behaved and what it meant', async () => {
      const { row } = await prepared()
      expect(sha(row.canonical)).toBe(row.sha256)
      const e = JSON.parse(row.canonical).sources.questionnaire_contract
      expect(sha(sorted(e.body))).toBe(e.contract_sha256)
      expect(sha(sorted(e.wording))).toBe(e.body.wording_sha256)
      const questions = e.body.questions.map((q: any) => ({ id: q.q_id, text: e.wording.questions[q.q_id].text, required: e.body.presentation[q.q_id].required, condition: q.display_condition }))
      expect(questions.map((q: any) => q.id)).toEqual(SYN!.registry_input.questions.map((q) => q.q_id))
      expect(questions.find((q: any) => q.id === 'M1X')).toMatchObject({ text: SYN!.presentation.M1X.text, required: SYN!.presentation.M1X.required, condition: { kind: 'all' } })
      expect(e.body.observation_map.length).toBe(SYN!.registry_input.observation_map.length)
      expect(e.body.semantic_mappings.map((m: any) => m.dependency_id)).toContain('human_contribution_description')
      expect(e.body.validation_rules).toEqual({ id: 'si8/creator-record-v2-questionnaire-validation', version: 1 })
    })

    test('after the questionnaire changes, the stored version reads exactly as it was', async () => {
      const w = world()
      const first = await preparePrepared(w.deps, OWNER, body())
      if (!first.ok) throw new Error('prepare')
      const later = { ...w.deps, inputs: rewordedInputs, syntheticUat: { admits: () => true, inputs: rewordedInputs } }
      const read = await getPrepared(later, OWNER, first.view.id)
      expect(read).toEqual({ ok: true, view: first.view })
      expect(verifyCustomerRecord(w.rows[0].canonical, w.rows[0].sha256).ok).toBe(true)
    })

    test('with no questionnaire available at all, it still verifies', async () => {
      const { row } = await prepared()
      const empty = approvedCustomerRecordInputs(null)
      expect(empty.sources.registry_input.questions).toHaveLength(0)
      expect(verifiedRecord(row)!.sources.questionnaire_contract!.contract_sha256).toBe(CURRENT)
    })
  })
})

describe('schema 5 and 6: historical formats, exactly as stored', () => {
  const saved = JSON.parse(readFileSync(join(__dirname, '..', '..', 'test-support', 'fixtures', 'pre-questionnaire-contract-rows.json'), 'utf8')) as PreparedRow[]
  const OWNER_OF = saved[0].user_id
  const rows = () => clone(saved)
  const read = (r: PreparedRow[]) => world(syntheticUatInputs, r)
  // The digests of the rows really prepared at fa1b8675. They may never change.
  const PINNED: Record<number, string> = { 5: '5d3834336f280c7a78258abc7b32a03282f66341d51f66f88e9b79a845ab7c2d', 6: '993530cb487fb61f9f65daa89a959ddf8432d4216dedfee4bb8ca1035b7a43c9' }

  test('the saved rows are the ones prepared before schema 7: their bytes still hash to their digests', () => {
    for (const r of saved) {
      expect(createHash('sha256').update(r.canonical, 'utf8').digest('hex')).toBe(r.sha256)
      expect(r.sha256).toBe(PINNED[r.record_schema_version])
      expect(r.canonical).not.toContain('questionnaire')
    }
  })

  test.each(saved.map((r) => [r.record_schema_version, r.id] as const))('schema %i reads with no contract, and nothing is written', async (v, id) => {
    const w = read(rows())
    const r = await getPrepared(w.deps, OWNER_OF, id)
    if (!r.ok) throw new Error(JSON.stringify(r))
    expect(r.view.questionnaire_contract).toBeNull()
    expect(r.view.examination !== undefined).toBe(v === 6)
    expect(w.inserts.count).toBe(0)
    expect(w.rows.find((x) => x.id === id)!.canonical).toBe(saved.find((x) => x.id === id)!.canonical)
  })

  test('schema 5 and 6 never carry a contract: one added is refused, not trusted', () => {
    for (const row of saved) {
      const r = JSON.parse(row.canonical)
      r.sources.questionnaire_contract = { contract_id: 'x' }
      const c = canonicalJson(r)
      expect(verifyCustomerRecord(c, sha256Hex(c))).toEqual({ ok: false, reason: 'wrong_schema' })
    }
    expect([HISTORICAL_RECORD_SCHEMA_VERSION, HISTORICAL_EXAMINATION_SCHEMA_VERSION]).toEqual([5, 6])
  })

  test('confirmation of a historical version is unchanged, and changes no byte', async () => {
    const all = rows()
    const unconfirmed = all.find((r) => r.record_schema_version === 5)!
    unconfirmed.status = 'prepared'
    unconfirmed.reviewed_at = null
    const w = read([unconfirmed])
    const r = await reviewPrepared(w.deps, OWNER_OF, unconfirmed.id)
    expect(r).toMatchObject({ ok: true, view: { status: 'reviewed', questionnaire_contract: null } })
    expect(w.rows[0].canonical).toBe(saved.find((x) => x.id === unconfirmed.id)!.canonical)
  })
})

describe('responses and corrections', () => {
  const saved = JSON.parse(readFileSync(join(__dirname, '..', '..', 'test-support', 'fixtures', 'pre-questionnaire-contract-rows.json'), 'utf8')) as PreparedRow[]
  const historicalOwner = saved[0].user_id
  const v6 = saved.find((r) => r.record_schema_version === 6)!
  const response = { target: { kind: 'observation', run_id: 'r', observation_id: 'o' }, code: 'not_relevant' }

  test('a response under the same contract passes the identity gate and reaches the normal response checks', async () => {
    const w = world(syntheticUatInputs, [stored8()])
    const r = await preparePrepared(w.deps, w.rows[0].user_id, body(CURRENT, { draft_id: w.rows[0].draft_id, include_examinations: true, responses: [response] }))
    // Past identity: refused only because this target is not in the record.
    expect(r).toEqual({ ok: false, status: 400, code: 'invalid_responses' })
    expect(w.inserts.count).toBe(0)
  })

  test('after the questionnaire changed: a response naming its own version\'s contract is refused, and nothing is rebuilt', async () => {
    const w = world(rewordedInputs, [stored8()])
    expect(await preparePrepared(w.deps, w.rows[0].user_id, body(CURRENT, { draft_id: w.rows[0].draft_id, include_examinations: true, responses: [response] }))).toEqual(CHANGED_CODE)
    expect(w.inserts.count).toBe(0)
  })

  test('after the questionnaire changed: naming the CURRENT contract does not get a response through either', async () => {
    const w = world(rewordedInputs, [stored8()])
    expect(await preparePrepared(w.deps, w.rows[0].user_id, body(shaOf(rewordedInputs()), { draft_id: w.rows[0].draft_id, include_examinations: true, responses: [response] }))).toEqual(CHANGED_CODE)
    expect(w.inserts.count).toBe(0)
  })

  test.each([
    ['no identity, as the client sends for a version with none', undefined],
    ['the current contract, as a modified client might send', CURRENT],
  ])('SCHEMA 6: a response with %s is refused, and nothing is rebuilt', async (_n, sha) => {
    const rows = clone(saved)
    const w = world(syntheticUatInputs, rows)
    w.deps.syntheticUat = { admits: () => true, inputs: syntheticUatInputs }
    const r = await preparePrepared(w.deps, historicalOwner, body(sha, { draft_id: v6.draft_id, include_examinations: true, responses: [response] }))
    expect(r).toEqual(CHANGED_CODE)
    expect(w.inserts.count).toBe(0)
    expect(rows.find((x) => x.id === v6.id)!.canonical).toBe(v6.canonical)
  })

  test.each(saved.map((r) => [r.record_schema_version, r] as const))('schema %i: an explicit correction prepares a new version under the current contract and leaves the old one alone', async (_v, row) => {
    const rows = clone(saved)
    const w = world(syntheticUatInputs, rows)
    const r = await preparePrepared(w.deps, historicalOwner, body(CURRENT, { draft_id: row.draft_id }))
    if (!r.ok) throw new Error(JSON.stringify(r))
    expect(r.view.version).toBe(row.version + 1)
    expect(r.view.questionnaire_contract!.contract_sha256).toBe(CURRENT)
    expect(w.rows[w.rows.length - 1].record_schema_version).toBe(7)
    expect(rows.find((x) => x.id === row.id)!.canonical).toBe(row.canonical)
  })

  test('each version keeps its own provenance: a draft may span contracts', async () => {
    const rows: PreparedRow[] = []
    let current: () => ApprovedInputs = syntheticUatInputs
    const w = world(() => current(), rows)
    const v1 = await preparePrepared(w.deps, OWNER, body())
    if (!v1.ok) throw new Error('v1')
    current = rewordedInputs
    expect(await preparePrepared(w.deps, OWNER, body(CURRENT, { draft_id: v1.view.draft_id }))).toEqual(CHANGED_CODE)
    const v2 = await preparePrepared(w.deps, OWNER, body(shaOf(rewordedInputs()), { draft_id: v1.view.draft_id }))
    if (!v2.ok) throw new Error('v2')
    expect(rows.map((r) => record(r).sources.questionnaire_contract!.contract_sha256)).toEqual([CURRENT, shaOf(rewordedInputs())])
    expect(rows.map((r) => record(r).sources.questionnaire_contract!.contract_version)).toEqual([1, 2])
    expect(record(rows[0]).declarations.answers.find((a) => a.q_id === 'P1')!.question).toBe(SYN!.presentation.P1.text)
    expect(record(rows[1]).declarations.answers.find((a) => a.q_id === 'P1')!.question).toBe(CHANGED_QUESTION)
  })

  test('confirmation is unchanged by this slice: whether it should need a current contract is a separate decision', async () => {
    let current: () => ApprovedInputs = syntheticUatInputs
    const w = world(() => current())
    const v1 = await preparePrepared(w.deps, OWNER, body())
    if (!v1.ok) throw new Error('v1')
    current = rewordedInputs
    expect(await reviewPrepared(w.deps, OWNER, v1.view.id)).toMatchObject({ ok: true, view: { status: 'reviewed' } })
  })
})

describe('locks: PDF and issuance stay closed for schemas 7 and 8', () => {
  const bundle = SYN!
  const asOf = '2026-11-05'
  const issued = { record_id: 'CR-2026-ABCD1234', issued_on: '2026-11-06' }
  const current = (examination: boolean): { canonical: string; sha256: string; record: { schema: string } } => {
    if (examination) { const r = stored8(); return { canonical: r.canonical, sha256: r.sha256, record: JSON.parse(r.canonical) } }
    const i = syntheticUatInputs()
    const b = buildCustomerRecord({ state: STATE, sources: i.sources, source_text: i.source_text, topicClaims: CLAIMS, as_of: asOf, record: { record_id: 'PREP-00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa', record_version: 1, captured_at: NOW.toISOString() } })
    if (!b.ok) throw new Error(JSON.stringify(b))
    return b
  }
  const synthetic = () => { const i = syntheticUatInputs(); return governanceSnapshotFrom({ issuance_date: asOf, support: { record_schemas: [], builders: [], examination_methods: [] } /* the refusal mechanism, not the shipped list */, authority_class: 'synthetic_test', sources: i.sources, topicClaims: CLAIMS, source_text_approvals: [i.source_text!.approval!, i.source_text_examination!.approval!] }) }

  test('CR-V2-MVP-ELIGIBILITY-1: issuance supports no schema, and the contract is an authority kind', () => {
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [{ id: 'si8/creator-record-v2-record', version: 7 }, { id: 'si8/creator-record-v2-record', version: 8 }], builders: [{ id: 'si8/creator-record-v2-record-builder', version: 5 }, { id: 'si8/creator-record-v2-record-builder', version: 7 }], examination_methods: [{ origin: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5', profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' } }] }) // R15 option (a), JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110
    expect(AUTHORITY_KINDS).toEqual(['source_text', 'questionnaire_contract', 'question', 'observation_map_entry', 'publication_entry', 'governed_claim', 'record_schema', 'builder'])
  })

  test.each([[7, false], [8, true]] as const)('schema %i: ineligible on its schema and its builder, whatever else is approved', (_v, examination) => {
    const b = current(examination)
    const e = evaluateIssuanceEligibility(b.canonical, b.sha256, synthetic())
    expect(e.decision).toBe('ineligible')
    if (e.decision !== 'ineligible') return
    expect(e.reasons.map((r) => `${r.kind}:${r.code}`)).toEqual(expect.arrayContaining(['builder:reference_missing', 'record_schema:reference_missing']))
  })

  test('CR-V2-PDF-7: the PDF renders schema 7 with the synthetic templates, and refuses schema 8', () => {
    const t = approvedPdfTemplates(bundle)
    const seven = current(false)
    expect(buildCustomerDocument({ canonical: seven.canonical, sha256: seven.sha256, issued, templates: t.templates, template_approval: t.approval }).identity.snapshot_sha256).toBe(seven.sha256)
    const eight = current(true)
    expect(() => buildCustomerDocument({ canonical: eight.canonical, sha256: eight.sha256, issued, templates: t.templates, template_approval: t.approval })).toThrow(CustomerPdfRefusal)
  })

  test('CR-V2-PDF-7: the synthetic PDF templates are pinned, on schema 7', () => {
    expect((bundle.pdf_templates as any).record_schema).toEqual({ id: 'si8/creator-record-v2-record', version: 7 })
    expect(bundle.pdf_template_approval!.record_schema.version).toBe(7)
    expect(bundle.pdf_template_approval!.fingerprint).toBe(SYNTHETIC_PDF_TEMPLATES_FINGERPRINT)
  })

  test('a reviewed schema 7 version cannot be sold, even with every stop removed', async () => {
    const b = current(false)
    const row: PreparedRow = { id: '00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: OWNER, draft_id: '00000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa', version: 1, record_ref: 'PREP-00000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa', record_schema: b.record.schema, record_schema_version: 7, canonical: b.canonical, sha256: b.sha256, form_state: STATE as any, status: 'reviewed', created_at: NOW.toISOString(), reviewed_at: NOW.toISOString(), submission_id: null }
    const bind = jest.fn(async () => ({ submissionId: null, reason: 'not_found' as const }))
    const deps: PurchaseDeps = { submissions: 'open', issuance: 'enabled', hasPilotAccess: async () => true, legalPoliciesApproved: () => true, getPrepared: async () => row, latestVersion: async () => row, boundTo: async () => row, bind, governance: () => synthetic(), now: () => NOW }
    expect(await startPurchase(deps, OWNER, row.id)).toEqual({ ok: false, status: 409, code: 'ineligible' })
    expect(bind).not.toHaveBeenCalled()
    await expect(renderV2ForIssuance({ boundTo: async () => ({ ...row, submission_id: 'sub' }), latestVersion: async () => row, governance: () => synthetic(), templates: () => approvedPdfTemplates(bundle), renderPdf: async () => new Uint8Array([1]) }, { id: 'sub', user_id: OWNER, tier: 'creator_record', creator_record_product: 'v2' }, 'CR-2026-ABCD1234', NOW)).rejects.toEqual(new V2IssuanceRefusal('governance_ineligible'))
  })

  test('publication, payment and issuance switches are unchanged, and customer governance stays closed', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('open') // CR-V2-MVP-PROD-UAT-ACTIVATION-1
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('enabled')
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(true)
    // CR-V2-MVP-LEGAL-CONTENT-6: customer governance carries the founder-approved content; the stops above stay in force.
    // CR-V2-MVP-PROVIDER-SCOPE-1: provider-scope versions of the contract and wording approvals.
    expect(GOV.questionnaire_approval?.review_ref).toBe('JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111')
    expect(GOV.source_text_approval?.review_ref).toBe('JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111 schema 7')
    expect(GOV.registry_input.questions).toHaveLength(21)
    expect(currentPublicationAuthority({})?.questionnaire_approval?.review_ref).toBe('JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111')
    expect(approvedGovernanceSnapshot(asOf, CLAIMS, null).authorities.question).toEqual({ status: 'unavailable' })
  })

  // CR-V2-MVP-PROD-PREP-1: re-pinned once, because the Source Text content now names the customer wording set.
  test('the synthetic contract and wording digests did not move', () => {
    const i = syntheticUatInputs()
    expect(i.sources.questionnaire_approval!.contract_sha256).toBe('d34bc6ce2ee5410ce10d16d049c9d94e320b0a321603dcce5a0d01175a518b26')
    expect(i.source_text!.approval!.content_sha256).toBe('260391e7d6ad73482bb877639db1e84e40c96ec68b35128850634be42e08dd6e')
    expect(i.source_text!.approval!.record_schema.version).toBe(7)
    expect(i.source_text_examination!.approval!.record_schema.version).toBe(8)
  })
})
