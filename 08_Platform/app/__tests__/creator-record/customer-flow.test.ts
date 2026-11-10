/**
 * CR-V2-MVP-M2 — Creator Record v2 customer flow (prepare / view / review).
 *
 * Every "approved" source here is a SYNTHETIC TEST FIXTURE (pilot content relabelled
 * with a synthetic approver), injected through the service's ports. The production
 * approved inputs are also exercised: they are empty and must prepare nothing.
 */

import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import { CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { approvedCustomerRecordInputs, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import {
  getPrepared, preparePrepared as prepareAsSent, reviewPrepared,
  type ApprovedInputs, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedStore,
} from '@/lib/creator-record/customer-flow/service'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

const preparePrepared = namingCurrentContract(prepareAsSent)

const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-11-01T09:00:00.000Z')

// ── Synthetic approved inputs (test fixture only) ──
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
const ACKS = (s: CreatorRecordSources) => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function syntheticInputs(): ApprovedInputs {
  const sources = syntheticSources()
  const loaded = loadQuestionRegistry(sources.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    sources,
    source_text: {
      approval: {
        source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(sources, loaded.registry, ACKS(sources))),
        categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
        lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
      },
      acknowledgements: ACKS(sources),
    },
  }
}
const ANS = { P1: ['Synthetic M2 video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const state = (title = 'Synthetic M2 video', plan = 'Pro'): CreatorRecordFormState => ({ answers: { ...ANS, P1: [title] }, tools: [{ T1: ['pika'], T3: [plan], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })

// ── In-memory store with the migration's rules (immutable content, prepared -> reviewed only) ──
function memoryStore() {
  const rows = new Map<string, PreparedRow>()
  const calls = { insert: 0, review: 0 }
  const store: PreparedStore = {
    async insert(row: NewPreparedRow) {
      calls.insert++
      const sameDraft = Array.from(rows.values()).filter((r) => r.draft_id === row.draft_id)
      if (sameDraft.some((r) => r.user_id !== row.user_id)) throw new Error('draft owner mismatch')
      if (sameDraft.some((r) => r.version === row.version)) throw new Error('duplicate version')
      const full: PreparedRow = { ...row, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }
      rows.set(row.id, JSON.parse(JSON.stringify(full)))
      return JSON.parse(JSON.stringify(full))
    },
    async get(id) {
      const r = rows.get(id)
      return r ? JSON.parse(JSON.stringify(r)) : null
    },
    async latestVersion(draftId) {
      const list = Array.from(rows.values()).filter((r) => r.draft_id === draftId).sort((a, b) => b.version - a.version)
      return list[0] ? JSON.parse(JSON.stringify(list[0])) : null
    },
    async markReviewed(id, userId) {
      calls.review++
      const r = rows.get(id)
      if (!r || r.user_id !== userId || r.status !== 'prepared') return null
      r.status = 'reviewed'
      r.reviewed_at = NOW.toISOString()
      return JSON.parse(JSON.stringify(r))
    },
  }
  return { store, rows, calls }
}

let seq = 0
function deps(over: Partial<FlowDeps> = {}, mem = memoryStore()): FlowDeps & { mem: ReturnType<typeof memoryStore> } {
  return {
    submissions: 'open',
    hasPilotAccess: async (u) => u === OWNER || u === OTHER,
    store: mem.store,
    inputs: syntheticInputs,
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => NOW,
    newId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    mem,
    ...over,
  }
}

const okView = (r: Awaited<ReturnType<typeof preparePrepared>>) => {
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r.view
}

describe('pilot controls', () => {
  test('new V2 submissions ship open for the controlled UAT (CR-V2-MVP-PROD-UAT-ACTIVATION-1); the invitation gate below still applies', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('open')
  })

  test('stopped submissions prepare and review nothing', async () => {
    const d = deps({ submissions: 'stopped' })
    expect(await preparePrepared(d, OWNER, { state: state() })).toEqual({ ok: false, status: 503, code: 'submissions_stopped' })
    expect(d.mem.calls.insert).toBe(0)
  })

  test('an uninvited creator cannot submit or review', async () => {
    const d = deps({ hasPilotAccess: async () => false })
    expect(await preparePrepared(d, OWNER, { state: state() })).toEqual({ ok: false, status: 403, code: 'not_invited' })
    expect(d.mem.calls.insert).toBe(0)

    const open = deps({}, d.mem)
    const v = okView(await preparePrepared(open, OWNER, { state: state() }))
    expect(await reviewPrepared(d, OWNER, v.id)).toEqual({ ok: false, status: 403, code: 'not_invited' })
    expect(d.mem.calls.review).toBe(0)
  })
})

describe('approved sources only', () => {
  test('the production approved inputs are the founder-approved governance content, and the Production flow stays stopped', async () => {
    // CR-V2-MVP-LEGAL-CONTENT-6: R1-R6 approved (JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109). New submissions remain behind their own stop.
    expect(approvedCustomerRecordInputs().source_text?.approval?.review_ref).toContain('JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109')
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('open') // CR-V2-MVP-PROD-UAT-ACTIVATION-1
    const d = deps({ inputs: approvedCustomerRecordInputs, submissions: 'stopped' })
    expect((await preparePrepared(d, OWNER, { state: state() })).ok).toBe(false)
    expect(d.mem.calls.insert).toBe(0)
  })

  test('pilot sources can never prepare a customer record', async () => {
    const pilot = pilotSources()
    const d = deps({ inputs: () => ({ sources: pilot, source_text: syntheticInputs().source_text }) })
    expect(await preparePrepared(d, OWNER, { state: state() })).toEqual({ ok: false, status: 503, code: 'unavailable' })
    const relabelledKindOnly = deps({ inputs: () => ({ sources: { ...pilot, kind: 'governed' }, source_text: syntheticInputs().source_text }) })
    expect(await preparePrepared(relabelledKindOnly, OWNER, { state: state() })).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(d.mem.calls.insert + relabelledKindOnly.mem.calls.insert).toBe(0)
  })

  test('without a Source Text Approval nothing is prepared', async () => {
    const d = deps({ inputs: () => ({ sources: syntheticSources(), source_text: null }) })
    expect(await preparePrepared(d, OWNER, { state: state() })).toEqual({ ok: false, status: 503, code: 'unavailable' })
  })
})

describe('server-side validation', () => {
  test('invalid answers are rejected with field issues and nothing is stored', async () => {
    const d = deps()
    const bad = { ...state(), answers: { ...ANS, P3: ['not-an-option'] } }
    const r = await preparePrepared(d, OWNER, { state: bad })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.code).toBe('invalid_answers')
    expect(r.ok === false && r.code === 'invalid_answers' && r.issues.length).toBeGreaterThan(0)
    const missingAck = await preparePrepared(d, OWNER, { state: { ...state(), acknowledgements: { A1: true } } })
    expect(missingAck.ok === false && missingAck.code).toBe('invalid_answers')
    expect(d.mem.calls.insert).toBe(0)
  })

  test.each([
    ['not an object', 'x'],
    ['no state', {}],
    ['unknown body field', { state: state(), sha256: 'a'.repeat(64) }],
    ['client record id', { state: state(), record_id: 'CR-2026-0A1B2C3D' }],
    ['client status', { state: state(), status: 'reviewed' }],
    ['client owner', { state: state(), user_id: OTHER }],
    ['malformed draft id', { state: state(), draft_id: 'draft-1' }],
    ['documents', { state: { ...state(), documents: [] } }],
    ['unknown state field', { state: { ...state(), approved: true } }],
  ])('rejects %s', async (_name, body) => {
    const d = deps()
    expect(await preparePrepared(d, OWNER, body)).toEqual({ ok: false, status: 400, code: 'invalid_request' })
    expect(d.mem.calls.insert).toBe(0)
  })
})

describe('prepared records', () => {
  test('a prepared version stores the exact canonical record, bound to its owner', async () => {
    const d = deps()
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    const row = d.mem.rows.get(v.id)!
    expect(row.user_id).toBe(OWNER)
    expect(row.status).toBe('prepared')
    expect(row.version).toBe(1)
    expect(row.record_ref).toBe(`PREP-${v.id}`)
    expect(row.record_schema).toBe(CUSTOMER_RECORD_SCHEMA)
    const verified = verifyCustomerRecord(row.canonical, row.sha256)
    expect(verified.ok).toBe(true)
    if (!verified.ok) return
    expect(verified.record.record.record_ref).toBe(row.record_ref)
    expect(verified.record.record.record_version).toBe(1)
    expect(row.form_state).toEqual(state())
  })

  test('the view shows the declarations and acknowledgements exactly as recorded', async () => {
    const d = deps()
    const v = okView(await preparePrepared(d, OWNER, { state: state('Exact title') }))
    const rec = verifyCustomerRecord(d.mem.rows.get(v.id)!.canonical, d.mem.rows.get(v.id)!.sha256)
    if (!rec.ok) throw new Error('unverifiable')
    expect(v.declarations.answers).toEqual(rec.record.declarations.answers.map((a) => ({ q_id: a.q_id, tool_index: a.tool_index, question: a.question, answer: a.answer_verbatim })))
    expect(v.declarations.acknowledgements).toEqual(rec.record.declarations.acknowledgements)
    expect(v.declarations.answers.some((a) => a.answer === 'Exact title')).toBe(true)
    expect(v.declarations.acknowledgements.map((a) => a.text)).toEqual(['Synthetic acknowledgement A1 (test fixture only).', 'Synthetic acknowledgement A2 (test fixture only).'])
  })

  test('another creator cannot read, review or correct a prepared record', async () => {
    const d = deps()
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    expect(await getPrepared(d, OTHER, v.id)).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(await reviewPrepared(d, OTHER, v.id)).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(await preparePrepared(d, OTHER, { state: state(), draft_id: v.draft_id })).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(d.mem.rows.get(v.id)!.status).toBe('prepared')
    expect(await getPrepared(d, OWNER, 'not-a-uuid')).toEqual({ ok: false, status: 404, code: 'not_found' })
  })

  test('a correction creates a new version; earlier versions never change', async () => {
    const d = deps()
    const v1 = okView(await preparePrepared(d, OWNER, { state: state('First') }))
    const before = JSON.stringify(d.mem.rows.get(v1.id))
    const v2 = okView(await preparePrepared(d, OWNER, { state: state('Second'), draft_id: v1.draft_id }))
    expect(v2.draft_id).toBe(v1.draft_id)
    expect(v2.version).toBe(2)
    expect(v2.id).not.toBe(v1.id)
    expect(JSON.stringify(d.mem.rows.get(v1.id))).toBe(before)
    // Only the latest version can be confirmed.
    expect(await reviewPrepared(d, OWNER, v1.id)).toEqual({ ok: false, status: 409, code: 'superseded' })
    expect(okView(await reviewPrepared(d, OWNER, v2.id)).status).toBe('reviewed')
  })

  test('a reviewed version is frozen: correcting it creates a further version, review is idempotent', async () => {
    const d = deps()
    const v1 = okView(await preparePrepared(d, OWNER, { state: state('Reviewed') }))
    const reviewed = okView(await reviewPrepared(d, OWNER, v1.id))
    expect(reviewed.status).toBe('reviewed')
    const frozen = JSON.stringify(d.mem.rows.get(v1.id))
    const v2 = okView(await preparePrepared(d, OWNER, { state: state('Changed after review'), draft_id: v1.draft_id }))
    expect(v2.version).toBe(2)
    expect(v2.status).toBe('prepared')
    expect(JSON.stringify(d.mem.rows.get(v1.id))).toBe(frozen)
    expect(okView(await reviewPrepared(d, OWNER, v1.id))).toEqual(reviewed)
    expect(okView(await getPrepared(d, OWNER, v1.id)).declarations).toEqual(reviewed.declarations)
  })

  test('a tampered stored record fails closed and is never reviewed', async () => {
    const d = deps()
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    const row = d.mem.rows.get(v.id)!
    row.canonical = row.canonical.replace('Synthetic M2 video', 'Tampered video')
    expect(await getPrepared(d, OWNER, v.id)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
    expect(await reviewPrepared(d, OWNER, v.id)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
    expect(d.mem.calls.review).toBe(0)
  })

  test('a row whose identity columns disagree with its record fails closed', async () => {
    const d = deps()
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    d.mem.rows.get(v.id)!.version = 7
    expect(await getPrepared(d, OWNER, v.id)).toEqual({ ok: false, status: 500, code: 'integrity_failure' })
  })

  test('a lost review race is reported, not overwritten', async () => {
    const d = deps()
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    const racing = deps({ store: { ...d.mem.store, markReviewed: async () => null } }, d.mem)
    expect(await reviewPrepared(racing, OWNER, v.id)).toEqual({ ok: false, status: 409, code: 'conflict' })
  })
})

// ── CR-V2-SCHEMA8-PATH-1 (E2): the view says whether the page may offer payment; the server decides at payment ──
describe('E2: purchasable on the prepared view', () => {
  test('never for an unreviewed version, whatever the port says; the port is not asked', async () => {
    const asked: string[] = []
    const d = deps({ purchaseOfferable: (row) => { asked.push(row.id); return true } })
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    expect(v.status).toBe('prepared')
    expect(v.purchasable).toBe(false)
    expect(asked).toEqual([])
  })

  test('for a reviewed version: exactly what the port answers for the stored row (prepare, review and read alike)', async () => {
    const asked: PreparedRow[] = []
    let answer = true
    const d = deps({ purchaseOfferable: (row) => { asked.push(row); return answer } })
    const v = okView(await preparePrepared(d, OWNER, { state: state() }))
    const reviewed = okView(await reviewPrepared(d, OWNER, v.id))
    expect(reviewed.purchasable).toBe(true)
    expect(asked.map((r) => [r.id, r.status])).toEqual([[v.id, 'reviewed']])
    answer = false
    expect(okView(await getPrepared(d, OWNER, v.id)).purchasable).toBe(false)
  })

  test('absent, throwing or non-boolean port: not purchasable (fail closed)', async () => {
    for (const port of [undefined, () => { throw new Error('x') }, () => 'yes' as unknown as boolean]) {
      const d = deps(port ? { purchaseOfferable: port } : {})
      const v = okView(await preparePrepared(d, OWNER, { state: state() }))
      expect(okView(await reviewPrepared(d, OWNER, v.id)).purchasable).toBe(false)
    }
  })
})
