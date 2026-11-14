/**
 * Creator Record MVP provider scope.
 *
 * CR-V2-MVP-PROVIDER-SCOPE-1 (T1 v2): Pika removed from new tool choices and from the active publication set (LEDGER-3: the
 * Pika baseline entry is withdrawn by a version 2 entry).
 * CR-V2-MVP-PROVIDER-SCOPE-2 (T1 v3, CRV2-PA-1A): new records may select only Higgsfield and Runway. Every other registered
 * tool and "My tool isn't listed" are gone, so the free-text tool name (T1X) can never be shown or answered. "Not sure" stays
 * (the question registry requires it on every closed question); it attaches to no identity and no guidance.
 *
 * Proven here, from the real governed sources, the real record builder, the real prepare service and the real PDF model (no
 * database, network or model):
 *   - T1 v3 offers exactly Higgsfield, Runway and "Not sure"; the tool identity registry and the ledger are unchanged;
 *   - every other registered tool (Pika and Kling included) and "My tool isn't listed" are refused, by the builder and by the
 *     prepare service, which stores nothing;
 *   - free text cannot bypass the restriction: "My tool isn't listed" is refused, and a T1X value sent beside an allowed
 *     choice is discarded like any hidden answer (never stored, mapped, shown or printed);
 *   - Runway and Higgsfield still publish their founder-approved guidance;
 *   - records prepared under the previous approvals (T1 v1 with Pika, T1 v2 with Kling or an unlisted tool) still verify, pass
 *     their own declaration checks and render with their own content, unchanged; they can no longer be prepared again.
 */
import { approvedCustomerRecordInputs, approvedPdfTemplates } from '@/lib/creator-record/customer-flow/approved-inputs'
import { preparePrepared as prepareAsSent, type ApprovedInputs, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedStore } from '@/lib/creator-record/customer-flow/service'
import { authorizePublication } from '@/lib/creator-record/contract/publication-ledger'
import { buildCustomerDocument, documentText } from '@/lib/creator-record/customer-pdf/document-model'
import { buildCustomerRecord, declarationIncompatibilities, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { questionnaireContract } from '@/lib/creator-record/customer-record/questionnaire-contract'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import {
  CREATOR_RECORD_EXCLUDED_TOOL_IDS, CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_LAUNCH_APPROVAL_REF, CREATOR_RECORD_MVP_TOOL_IDS,
  CREATOR_RECORD_PRESENTATION, CREATOR_RECORD_PROVIDER_SCOPE_APPROVAL_REF, CREATOR_RECORD_PUBLICATION_LEDGER, CREATOR_RECORD_REGISTRY_INPUT,
} from '@/lib/creator-record/governed/sources'
import { CANONICAL_TOOL_ID_LIST, TOOL_OPTION_CODES, TOOL_OPTION_LABELS } from '@/lib/creator-record/identity/selectable-identities'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

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
const issuesOf = (r: ReturnType<typeof build>) => JSON.stringify(r)

const CURRENT = approvedCustomerRecordInputs(GOV)
const MVP_OPTIONS = ['higgsfield', 'runway-gen3', 'not_sure']
const REFUSED_CHOICES = [...CREATOR_RECORD_EXCLUDED_TOOL_IDS, 'other_tool']

describe('provider selection (T1 v3)', () => {
  test('T1 offers exactly Higgsfield, Runway and "Not sure", with only their labels and identity observations', () => {
    expect(CREATOR_RECORD_MVP_TOOL_IDS).toEqual(['higgsfield', 'runway-gen3'])
    const t1 = CREATOR_RECORD_REGISTRY_INPUT.questions.find((q) => q.q_id === 'T1')!
    expect(t1.version).toBe(3)
    expect(t1.options).toEqual(MVP_OPTIONS)
    expect(CREATOR_RECORD_PRESENTATION.T1.option_labels).toEqual({ higgsfield: 'Higgsfield', not_sure: 'Not sure', 'runway-gen3': 'Runway' })
    expect(CREATOR_RECORD_PRESENTATION.T1.help).toBe('Choose it from the list. You can add up to 3 tools.')
    const t1Observations = CREATOR_RECORD_REGISTRY_INPUT.observation_map.filter((o) => o.q_id === 'T1')
    expect(t1Observations.map((o) => (o.applies_to as { value: string }).value).sort()).toEqual(['higgsfield', 'runway-gen3'])
    expect(t1Observations.every((o) => o.q_version === 3)).toBe(true)
  })

  test('every registered tool outside the MVP set is excluded, Pika and Kling included', () => {
    expect([...CREATOR_RECORD_EXCLUDED_TOOL_IDS].sort()).toEqual(CANONICAL_TOOL_ID_LIST.filter((id) => id !== 'higgsfield' && id !== 'runway-gen3').sort())
    expect(CREATOR_RECORD_EXCLUDED_TOOL_IDS).toEqual(expect.arrayContaining(['pika', 'kling']))
  })

  test('the shared identity registry and its option list are unchanged (CRC and Living Knowledge are untouched)', () => {
    for (const id of ['pika', 'kling', 'midjourney', 'runway-gen3', 'higgsfield']) expect(CANONICAL_TOOL_ID_LIST).toContain(id)
    expect(TOOL_OPTION_CODES).toEqual(expect.arrayContaining(['pika', 'kling', 'other_tool', 'not_sure']))
    expect(TOOL_OPTION_LABELS.other_tool).toBe('My tool isn’t listed')
  })

  test.each(REFUSED_CHOICES)('a new record cannot choose %s', (code) => {
    const r = build(state(tool(code)), CURRENT)
    expect(r.ok).toBe(false)
  })

  test('an excluded tool is refused even beside an allowed one', () => {
    expect(build(state(tool('runway-gen3'), tool('kling')), CURRENT).ok).toBe(false)
  })

  test('free text cannot bypass the restriction: choosing "My tool isn\'t listed" with a typed name is refused', () => {
    expect(build(state(tool('other_tool', { T1X: ['Pika'] })), CURRENT).ok).toBe(false)
  })

  // T1X is shown only for "My tool isn't listed", which T1 v3 does not offer. As for every hidden question, a T1X value sent
  // beside an allowed choice is discarded (the questionnaire's existing behaviour, unchanged): it is never stored, mapped to an
  // identity, shown in guidance or printed, so the record holds only the allowed tool.
  test.each([
    ['Runway', 'runway-gen3', [RUNWAY]],
    ['Not sure', 'not_sure', []],
  ])('free text cannot bypass the restriction: a T1X value beside %s is discarded and never reaches the record', (_, code, claims) => {
    const r = build(state(tool(code, { T1X: ['Kling'] })), CURRENT)
    if (!r.ok) throw new Error(`build failed: ${issuesOf(r).slice(0, 300)}`)
    expect(r.canonical).not.toContain('Kling')
    expect(r.record.declarations.answers.some((a) => a.q_id === 'T1X')).toBe(false)
    expect(guidanceClaims(r)).toEqual(claims)
    expect(declarationIncompatibilities(r.record)).toEqual([])
    expect(renderText(r, AS_OF)).not.toContain('Kling')
  })

  test('"Not sure" is accepted, records no tool identity and publishes no guidance', () => {
    const r = build(state(tool('not_sure')), CURRENT)
    expect(r.ok).toBe(true)
    expect(guidanceClaims(r)).toEqual([])
  })
})

describe('approved publication filtering (LEDGER-3, unchanged)', () => {
  test('Runway and Higgsfield publish their approved guidance; together, both and only they appear', () => {
    expect(guidanceClaims(build(state(tool('runway-gen3')), CURRENT))).toEqual([RUNWAY])
    expect(guidanceClaims(build(state(tool('higgsfield')), CURRENT))).toEqual([HIGGSFIELD])
    expect(guidanceClaims(build(state(tool('runway-gen3'), tool('higgsfield')), CURRENT))?.sort()).toEqual([HIGGSFIELD, RUNWAY])
  })

  test('the guidance text is the approved ledger explanation, verbatim', () => {
    const r = build(state(tool('runway-gen3'), tool('higgsfield')), CURRENT)
    if (!r.ok) throw new Error('build failed')
    for (const id of [RUNWAY, HIGGSFIELD]) {
      const entry = CREATOR_RECORD_PUBLICATION_LEDGER.find((e) => e.claim_id === id && e.superseded_by === null)!
      expect(JSON.stringify(r.record.guidance)).toContain(JSON.stringify(entry.explanation).slice(1, -1))
    }
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

// ── The real prepare service, with the Production approved inputs and an in-memory store ──
const OWNER = '11111111-1111-4111-8111-111111111111'
function memoryStore() {
  const rows = new Map<string, PreparedRow>()
  const calls = { insert: 0 }
  const store: PreparedStore = {
    async insert(row: NewPreparedRow) {
      calls.insert++
      const full: PreparedRow = { ...row, status: 'prepared', created_at: `${AS_OF}T09:00:00.000Z`, reviewed_at: null, submission_id: null }
      rows.set(row.id, clone(full))
      return clone(full)
    },
    async get(id) { return rows.has(id) ? clone(rows.get(id)!) : null },
    async latestVersion(draftId) { return clone(Array.from(rows.values()).filter((r) => r.draft_id === draftId).sort((a, b) => b.version - a.version)[0] ?? null) },
    async markReviewed() { return null },
  }
  return { store, calls }
}
let seq = 0
function deps(mem = memoryStore()): FlowDeps & { mem: ReturnType<typeof memoryStore> } {
  return {
    submissions: 'open',
    hasPilotAccess: async (u) => u === OWNER,
    store: mem.store,
    inputs: () => approvedCustomerRecordInputs(GOV),
    topicClaims: CLAIMS,
    now: () => new Date(`${AS_OF}T09:00:00.000Z`),
    newId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    mem,
  }
}
const preparePrepared = namingCurrentContract(prepareAsSent)

describe('server-side enforcement (prepare service, Production inputs)', () => {
  test.each([['Runway', 'runway-gen3'], ['Higgsfield', 'higgsfield']])('%s is prepared and stored', async (_, code) => {
    const d = deps()
    const r = await preparePrepared(d, OWNER, { state: state(tool(code)) })
    expect(r.ok).toBe(true)
    expect(d.mem.calls.insert).toBe(1)
  })

  test.each([
    ...REFUSED_CHOICES.map((c) => [c, state(tool(c))] as const),
    ['"not listed" with a typed name', state(tool('other_tool', { T1X: ['Pika'] }))] as const,
  ])('%s is refused as invalid answers and nothing is stored', async (_, s) => {
    const d = deps()
    const r = await preparePrepared(d, OWNER, { state: s })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.code).toBe('invalid_answers')
    expect(d.mem.calls.insert).toBe(0)
  })

  // The prepared row keeps the raw form state for resuming the draft (existing behaviour for every hidden answer). The record
  // itself, its declarations and its guidance hold the allowed tool only.
  test('a T1X value sent beside Runway never reaches the prepared record: its declarations and guidance hold Runway only', async () => {
    const d = deps()
    const r = await preparePrepared(d, OWNER, { state: state(tool('runway-gen3', { T1X: ['Kling'] })) })
    if (!r.ok) throw new Error(JSON.stringify(r))
    expect(JSON.stringify(r.view.declarations)).not.toContain('Kling')
    expect(r.view.declarations.answers.filter((a) => a.q_id === 'T1' || a.q_id === 'T1X').map((a) => a.answer)).toEqual(['Runway'])
    expect(r.view.guidance_items).toBe(1)
  })
})

/**
 * The governed sources exactly as approved before CR-V2-MVP-PROVIDER-SCOPE-2. 'v1': T1 v1 offering every tool (Pika included),
 * the LEDGER-2 entries, REGISTRY-1 and the version 3 Source Text and version 1 contract approvals. 'v2': T1 v2 offering every
 * tool but Pika, LEDGER-3, REGISTRY-2 and the version 5 Source Text and version 2 contract approvals. Each reconstruction is
 * proven faithful by reproducing both pinned digests of its approvals.
 */
const R2_T1_HELP = 'Choose it from the list. If it is not listed, choose “My tool isn’t listed” and type its name. You can add up to 3 tools.'
const PREVIOUS = {
  v1: { sourceText: '0947f3d27e82e2bf9f509668a309baefb53caf3977f7d885edfe7ed56084d967', contract: '7b63a6d98ebe1a4b02d43091135f8c58ac59e295c1f6a5b80d8e28702ec808be' },
  v2: { sourceText: '06fc6f6d6a103450c149b57a0edf03cbd210ebc30a56989c98a3bf3d39930277', contract: '69d32b7df61ddade4f006be12c2a371a9cd7c9d6f0db80d6420850689eb27868' },
} as const
function previousInputs(at: 'v1' | 'v2'): ApprovedInputs {
  const prev = clone(CURRENT) as ApprovedInputs
  const s = prev.sources as unknown as {
    registry_input: typeof CREATOR_RECORD_REGISTRY_INPUT; presentation: typeof CREATOR_RECORD_PRESENTATION; ledger: typeof CREATOR_RECORD_PUBLICATION_LEDGER
    versions: { registry: string; ledger: string }; questionnaire_approval: Record<string, unknown>
  }
  const authority = 'JD, for PMF Strategy Inc. d/b/a SuperImmersive 8'
  const approval = at === 'v1'
    ? { status: 'approved', approver: authority, decision_date: '2026-11-09', review_ref: CREATOR_RECORD_LAUNCH_APPROVAL_REF }
    : { status: 'approved', approver: authority, decision_date: '2026-11-11', review_ref: CREATOR_RECORD_PROVIDER_SCOPE_APPROVAL_REF }
  const version = at === 'v1' ? 1 : 2
  const offered = (code: string) => at === 'v1' || code !== 'pika'
  const t1 = s.registry_input.questions.find((q) => q.q_id === 'T1')!
  Object.assign(t1, { version, options: TOOL_OPTION_CODES.filter(offered), approval })
  const others = s.registry_input.observation_map.filter((o) => o.q_id !== 'T1')
  const firstT1 = s.registry_input.observation_map.findIndex((o) => o.q_id === 'T1')
  const base = s.registry_input.observation_map.find((o) => o.q_id === 'T1')!
  const t1Obs = CANONICAL_TOOL_ID_LIST.filter(offered).map((id) => ({ ...base, o_id: `CR-V2-LAUNCH-O-T1-${id}`, version, q_version: version, applies_to: { kind: 'option', value: id }, approval }))
  s.registry_input.observation_map = [...others.slice(0, firstT1), ...t1Obs, ...others.slice(firstT1)] as typeof s.registry_input.observation_map
  ;(s.presentation as Record<string, (typeof CREATOR_RECORD_PRESENTATION)['T1']>).T1 = { ...s.presentation.T1, help: R2_T1_HELP, option_labels: Object.fromEntries(TOOL_OPTION_CODES.filter(offered).map((c) => [c, TOOL_OPTION_LABELS[c]])) }
  if (at === 'v1') s.ledger = s.ledger.filter((e) => !e.entry_id.endsWith('-WITHDRAWN-2')).map((e) => (e.entry_id === PIKA_V1 ? { ...e, superseded_by: null } : e))
  s.versions = at === 'v1' ? { registry: 'CR-V2-LAUNCH-REGISTRY-1', ledger: 'CR-V2-LAUNCH-LEDGER-2' } : { registry: 'CR-V2-LAUNCH-REGISTRY-2', ledger: 'CR-V2-LAUNCH-LEDGER-3' }
  const text: SourceTextApproval = {
    ...(prev.source_text!.approval as SourceTextApproval), version: at === 'v1' ? 3 : 5, content_sha256: PREVIOUS[at].sourceText,
    decision_date: approval.decision_date, review_ref: `${approval.review_ref} schema 7`,
  }
  prev.source_text = { approval: text, acknowledgements: prev.source_text!.acknowledgements }
  s.questionnaire_approval = { ...s.questionnaire_approval, contract_version: version, contract_sha256: PREVIOUS[at].contract, decision_date: approval.decision_date, review_ref: approval.review_ref }
  return prev
}
const renderText = (r: Extract<ReturnType<typeof build>, { ok: true }>, issued_on: string) => {
  // CR-V2-MVP-APPROVAL-AND-RELEASE-1: selected per record schema, as Production selects it (schema 7 → v4).
  const pdf = approvedPdfTemplates(GOV, { id: 'si8/creator-record-v2-record', version: 7 })
  return documentText(buildCustomerDocument({ canonical: r.canonical, sha256: r.sha256, issued: { record_id: 'CR-2026-ABCDEF12', issued_on }, templates: pdf.templates, template_approval: pdf.approval })).join('\n')
}

describe('historical record compatibility', () => {
  const V1 = previousInputs('v1')
  const V2 = previousInputs('v2')

  test.each([['v1', V1], ['v2', V2]] as const)('the reconstruction of the %s approvals is exact (both pinned digests reproduce)', (at, inputs) => {
    const reg = loadQuestionRegistry(inputs.sources.registry_input)
    if (!reg.ok) throw new Error(`${at} registry does not load`)
    const st = sourceTextDigest(sourceTextContent(inputs.sources, reg.registry, inputs.source_text!.acknowledgements))
    expect(st).toBe(PREVIOUS[at].sourceText)
    const qc = questionnaireContract(inputs.sources, st)
    expect(qc.ok && qc.sha256).toBe(PREVIOUS[at].contract)
  })

  test('a Pika record prepared under T1 v1 still verifies, passes its own declaration checks and renders its own Pika guidance', () => {
    const r = build(state(tool('pika')), V1, '2026-11-10')
    if (!r.ok) throw new Error(`v1 build failed: ${JSON.stringify(r).slice(0, 300)}`)
    expect(guidanceClaims(r)).toEqual([PIKA])
    expect(r.record.sources).toMatchObject({ registry_version: 'CR-V2-LAUNCH-REGISTRY-1', ledger_version: 'CR-V2-LAUNCH-LEDGER-2' })
    expect(verifyCustomerRecord(r.canonical, r.sha256).ok).toBe(true)
    expect(declarationIncompatibilities(r.record)).toEqual([])
    const text = renderText(r, '2026-11-10')
    expect(text).toContain(CREATOR_RECORD_PUBLICATION_LEDGER.find((e) => e.entry_id === PIKA_V1)!.explanation!)
    expect(text).toContain('Pika')
  })

  test('a Kling record and an unlisted-tool record prepared under T1 v2 still verify and render their own declarations', () => {
    const kling = build(state(tool('kling')), V2, '2026-11-11')
    const unlisted = build(state(tool('other_tool', { T1X: ['Acme Video'] })), V2, '2026-11-11')
    for (const r of [kling, unlisted]) {
      if (!r.ok) throw new Error(`v2 build failed: ${JSON.stringify(r).slice(0, 300)}`)
      expect(r.record.sources).toMatchObject({ registry_version: 'CR-V2-LAUNCH-REGISTRY-2', ledger_version: 'CR-V2-LAUNCH-LEDGER-3' })
      expect(verifyCustomerRecord(r.canonical, r.sha256).ok).toBe(true)
      expect(declarationIncompatibilities(r.record)).toEqual([])
      expect(guidanceClaims(r)).toEqual([])
    }
    if (!kling.ok || !unlisted.ok) throw new Error('unreachable')
    expect(renderText(kling, '2026-11-11')).toContain('Kling')
    expect(renderText(unlisted, '2026-11-11')).toContain('Acme Video')
  })

  test.each([['v1', V1], ['v2', V2]] as const)('a record cannot be prepared again under the current approvals with the %s wording approval', (_, inputs) => {
    const mixed = clone(CURRENT) as ApprovedInputs
    mixed.source_text = inputs.source_text
    expect(build(state(tool('runway-gen3')), mixed).ok).toBe(false)
  })
})
