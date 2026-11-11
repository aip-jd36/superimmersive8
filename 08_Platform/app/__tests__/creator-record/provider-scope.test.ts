/**
 * CR-V2-MVP-PROVIDER-SCOPE-1 — the Creator Record MVP supports Higgsfield and Runway. Pika is removed from new customer tool
 * choices (T1 v2) and from the active publication set (LEDGER-3: the Pika baseline entry is withdrawn by a version 2 entry).
 *
 * Proven here, from the real governed sources and the real record builder and PDF model (no database, network or model):
 *   - a new record cannot choose Pika, and naming it as an unlisted tool is record-only, so no Pika guidance can appear;
 *   - Runway and Higgsfield still publish their founder-approved guidance;
 *   - the Pika claim fails closed as `not_eligible` (withdrawn), every other unpublished claim as before;
 *   - a record prepared under the previous approvals (LEDGER-2, T1 v1 with Pika) still verifies, passes its own declaration
 *     checks and renders with its own Pika guidance, unchanged. Records are never re-evaluated against the current ledger.
 *
 * This milestone does NOT complete the integrated-assessment MVP requirement: the Runway and Higgsfield claims carry no
 * structured, document-assessable requirement, so the integrated assessment has nothing to relate documents to for them.
 */
import { approvedCustomerRecordInputs, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import type { ApprovedInputs } from '@/lib/creator-record/customer-flow/service'
import { authorizePublication } from '@/lib/creator-record/contract/publication-ledger'
import { buildCustomerDocument, documentText } from '@/lib/creator-record/customer-pdf/document-model'
import { buildCustomerRecord, declarationIncompatibilities, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { questionnaireContract } from '@/lib/creator-record/customer-record/questionnaire-contract'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import {
  CREATOR_RECORD_EXCLUDED_TOOL_IDS, CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_LAUNCH_APPROVAL_REF, CREATOR_RECORD_PRESENTATION,
  CREATOR_RECORD_PUBLICATION_LEDGER, CREATOR_RECORD_REGISTRY_INPUT,
} from '@/lib/creator-record/governed/sources'
import { CANONICAL_TOOL_ID_LIST, TOOL_OPTION_CODES } from '@/lib/creator-record/identity/selectable-identities'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'

const AS_OF = '2026-11-11'
const ANS = { P1: ['Provider scope test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const RUNWAY = 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'
const HIGGSFIELD = 'CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1'
const PIKA = 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1'
const PIKA_V1 = 'CR-V2-LAUNCH-LEDGER-CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1'
const clone = <V,>(v: V): V => JSON.parse(JSON.stringify(v)) as V

const tool = (t1: string, extra: Record<string, string[]> = {}) => ({ T1: [t1], T3: ['Pro'], T4: ['May 2026'], ...extra })
const state = (...tools: Record<string, string[]>[]) => ({ answers: { ...ANS }, tools, acknowledgements: { A1: true, A2: true } })
const build = (s: unknown, inputs: ApprovedInputs, as_of = AS_OF) =>
  buildCustomerRecord({ state: s, sources: inputs.sources, source_text: inputs.source_text, topicClaims: CLAIMS, as_of, record: { record_id: 'PREP-provider-scope-1', record_version: 1, captured_at: `${as_of}T00:00:00.000Z` } })
const guidanceClaims = (r: ReturnType<typeof build>) => (r.ok ? r.record.guidance.items.map((i) => i.claim_id) : null)

const CURRENT = approvedCustomerRecordInputs(GOV)

describe('provider selection (T1 v2)', () => {
  test('Pika is not a T1 option or label; every other registered tool still is, including Runway and Higgsfield', () => {
    expect(CREATOR_RECORD_EXCLUDED_TOOL_IDS).toEqual(['pika'])
    const t1 = CREATOR_RECORD_REGISTRY_INPUT.questions.find((q) => q.q_id === 'T1')!
    expect(t1.version).toBe(2)
    expect(t1.options).toEqual(TOOL_OPTION_CODES.filter((c) => c !== 'pika'))
    expect(t1.options).toEqual(expect.arrayContaining(['runway-gen3', 'higgsfield', 'other_tool', 'not_sure']))
    expect(Object.keys(CREATOR_RECORD_PRESENTATION.T1.option_labels).sort()).toEqual([...(t1.options as string[])].sort())
    const t1Observations = CREATOR_RECORD_REGISTRY_INPUT.observation_map.filter((o) => o.q_id === 'T1')
    expect(t1Observations.map((o) => (o.applies_to as { value: string }).value).sort()).toEqual(CANONICAL_TOOL_ID_LIST.filter((id) => id !== 'pika').sort())
    expect(t1Observations.every((o) => o.q_version === 2)).toBe(true)
  })

  test('the identity registry itself is unchanged: Pika stays a registered tool (CRC and Living Knowledge are untouched)', () => {
    expect(CANONICAL_TOOL_ID_LIST).toContain('pika')
    expect(TOOL_OPTION_CODES).toContain('pika')
  })

  test('a new record cannot choose Pika', () => {
    const r = build(state(tool('pika')), CURRENT)
    expect(r.ok).toBe(false)
  })

  test('naming Pika as an unlisted tool is recorded only: it attaches to no identity, so no Pika guidance appears', () => {
    const r = build(state(tool('other_tool', { T1X: ['Pika'] })), CURRENT)
    expect(r.ok).toBe(true)
    expect(guidanceClaims(r)).toEqual([])
  })
})

describe('approved publication filtering (LEDGER-3)', () => {
  test('Runway and Higgsfield publish their approved guidance; together, both and only they appear', () => {
    expect(guidanceClaims(build(state(tool('runway-gen3')), CURRENT))).toEqual([RUNWAY])
    expect(guidanceClaims(build(state(tool('higgsfield')), CURRENT))).toEqual([HIGGSFIELD])
    expect(guidanceClaims(build(state(tool('runway-gen3'), tool('higgsfield')), CURRENT))?.sort()).toEqual([HIGGSFIELD, RUNWAY])
  })

  test('the Pika claim fails closed as withdrawn (not_eligible), at any date', () => {
    const claim = CLAIMS.find((c) => c.claim_id === PIKA)!
    for (const d of ['2026-11-11', '2027-01-31']) expect(authorizePublication(CREATOR_RECORD_PUBLICATION_LEDGER, claim, d)).toEqual({ authorized: false, reason: 'not_eligible' })
    for (const id of [RUNWAY, HIGGSFIELD]) expect(authorizePublication(CREATOR_RECORD_PUBLICATION_LEDGER, CLAIMS.find((c) => c.claim_id === id)!, AS_OF)).toMatchObject({ authorized: true })
  })

  test('no current approved entry exists for any Pika claim', () => {
    const pikaClaims = CLAIMS.filter((c) => (c.tool_scope ?? []).includes('pika')).map((c) => c.claim_id)
    expect(pikaClaims.length).toBeGreaterThan(0)
    for (const id of pikaClaims) {
      const auth = authorizePublication(CREATOR_RECORD_PUBLICATION_LEDGER, CLAIMS.find((c) => c.claim_id === id)!, AS_OF)
      expect(auth.authorized).toBe(false)
    }
  })
})

/**
 * The governed sources exactly as approved before this change: T1 v1 offering Pika, the LEDGER-2 packet entries, REGISTRY-1, and
 * the version 3 Source Text and version 1 contract approvals. The reconstruction is proven faithful by reproducing both pinned
 * digests of those approvals.
 */
function previousInputs(): ApprovedInputs {
  const prev = clone(CURRENT) as ApprovedInputs
  const s = prev.sources as unknown as {
    registry_input: typeof CREATOR_RECORD_REGISTRY_INPUT; presentation: typeof CREATOR_RECORD_PRESENTATION; ledger: typeof CREATOR_RECORD_PUBLICATION_LEDGER
    versions: { registry: string; ledger: string }; questionnaire_approval: Record<string, unknown>
  }
  const LAUNCH = { status: 'approved', approver: 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8', decision_date: '2026-11-09', review_ref: CREATOR_RECORD_LAUNCH_APPROVAL_REF }
  s.registry_input = clone(s.registry_input)
  const t1 = s.registry_input.questions.find((q) => q.q_id === 'T1')!
  Object.assign(t1, { version: 1, options: [...TOOL_OPTION_CODES], approval: LAUNCH })
  const others = s.registry_input.observation_map.filter((o) => o.q_id !== 'T1')
  const firstT1 = s.registry_input.observation_map.findIndex((o) => o.q_id === 'T1')
  const t1Obs = CANONICAL_TOOL_ID_LIST.map((id) => {
    const base = s.registry_input.observation_map.find((o) => o.q_id === 'T1')!
    return { ...base, o_id: `CR-V2-LAUNCH-O-T1-${id}`, version: 1, q_version: 1, applies_to: { kind: 'option', value: id }, approval: LAUNCH }
  })
  s.registry_input.observation_map = [...others.slice(0, firstT1), ...t1Obs, ...others.slice(firstT1)] as typeof s.registry_input.observation_map
  s.presentation = clone(s.presentation)
  ;(s.presentation.T1.option_labels as Record<string, string>).pika = 'Pika'
  s.ledger = s.ledger.filter((e) => !e.entry_id.endsWith('-WITHDRAWN-2')).map((e) => (e.entry_id === PIKA_V1 ? { ...e, superseded_by: null } : e))
  s.versions = { registry: 'CR-V2-LAUNCH-REGISTRY-1', ledger: 'CR-V2-LAUNCH-LEDGER-2' }
  const approval: SourceTextApproval = { ...(prev.source_text!.approval as SourceTextApproval), version: 3, content_sha256: '0947f3d27e82e2bf9f509668a309baefb53caf3977f7d885edfe7ed56084d967', decision_date: '2026-11-09', review_ref: `${CREATOR_RECORD_LAUNCH_APPROVAL_REF} schema 7` }
  prev.source_text = { approval, acknowledgements: prev.source_text!.acknowledgements }
  s.questionnaire_approval = { ...s.questionnaire_approval, contract_version: 1, contract_sha256: '7b63a6d98ebe1a4b02d43091135f8c58ac59e295c1f6a5b80d8e28702ec808be', decision_date: '2026-11-09', review_ref: CREATOR_RECORD_LAUNCH_APPROVAL_REF }
  return prev
}

describe('historical record compatibility', () => {
  const PREV = previousInputs()

  test('the reconstruction of the previous approvals is exact (both pinned digests reproduce)', () => {
    const reg = loadQuestionRegistry(PREV.sources.registry_input)
    if (!reg.ok) throw new Error('previous registry does not load')
    const st = sourceTextDigest(sourceTextContent(PREV.sources, reg.registry, PREV.source_text!.acknowledgements))
    expect(st).toBe('0947f3d27e82e2bf9f509668a309baefb53caf3977f7d885edfe7ed56084d967')
    const qc = questionnaireContract(PREV.sources, st)
    expect(qc.ok && qc.sha256).toBe('7b63a6d98ebe1a4b02d43091135f8c58ac59e295c1f6a5b80d8e28702ec808be')
  })

  test('a Pika record prepared before the change still verifies, passes its own declaration checks and renders its own Pika guidance', () => {
    const r = build(state(tool('pika')), PREV, '2026-11-10')
    if (!r.ok) throw new Error(`previous build failed: ${JSON.stringify(r).slice(0, 300)}`)
    expect(guidanceClaims(r)).toEqual([PIKA])
    expect(r.record.sources).toMatchObject({ registry_version: 'CR-V2-LAUNCH-REGISTRY-1', ledger_version: 'CR-V2-LAUNCH-LEDGER-2' })
    expect(verifyCustomerRecord(r.canonical, r.sha256).ok).toBe(true)
    expect(declarationIncompatibilities(r.record)).toEqual([])
    const pdf = approvedPdfTemplates(GOV)
    const m = buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: { record_id: 'CR-2026-ABCDEF12', issued_on: '2026-11-10' }, templates: pdf.templates, template_approval: pdf.approval })
    const text = documentText(m).join('\n')
    const pikaEntry = CREATOR_RECORD_PUBLICATION_LEDGER.find((e) => e.entry_id === PIKA_V1)!
    expect(text).toContain(pikaEntry.explanation!)
    expect(text).toContain('Pika')
  })

  test('the same record cannot be prepared again under the current approvals: the old wording approval no longer matches', () => {
    const mixed = clone(CURRENT) as ApprovedInputs
    mixed.source_text = PREV.source_text
    expect(build(state(tool('runway-gen3')), mixed).ok).toBe(false)
  })
})
