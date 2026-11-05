/**
 * CR-V2-2E — generic selection provenance.
 *
 * Synthetic fixtures only (pilot content, relabelled where an approved source is
 * needed). The selection snapshot hash below was computed by the code BEFORE
 * this change, on exactly these states: selection and composition must be
 * identical apart from the new `selection_basis` field.
 */

import { historicalForm } from '@/test-support/historical-record'
import { createHash } from 'node:crypto'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import type { CreatorRecordFactsBundle } from '@/lib/creator-record/integration/facts'
import { selectionBasisFor, SelectionProvenanceError } from '@/lib/creator-record/integration/run-creator-record-guidance'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { runDeclaredGuidance } from '@/lib/creator-record/prototype/declared-guidance'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { buildCustomerRecord, verifyCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, type CustomerRecordResult } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { evaluateIssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { governanceSnapshotFrom } from '@/lib/creator-record/customer-record/governance-state'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'

const RECORD = { record_id: 'PROTOTYPE-SEL', record_version: 1, captured_at: '2026-10-31T00:00:00Z' }
const AS_OF = '2026-10-31'
const ANS = { P1: ['Selection snapshot'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
const tool = (t: string, p: string) => ({ T1: [t], T3: [p], T4: ['May 2026'] })
const st = (answers: Record<string, string[]>, ...tools: Record<string, string[]>[]) => ({ answers: { ...ANS, ...answers }, tools, acknowledgements: { A1: true, A2: true } })
const CASES: Record<string, ReturnType<typeof st>> = {
  pika_pro: st({}, tool('pika', 'Pro')),
  pika_standard: st({}, tool('pika', 'Standard')),
  pika_fancy: st({}, tool('pika', 'Fancy')),
  pika_not_sure: st({}, tool('pika', 'not_sure')),
  kling_standard: st({}, tool('kling', 'Standard')),
  kling_pro: st({}, tool('kling', 'Pro')),
  other_tool_unresolved: st({}, { T1: ['other_tool'], T1X: ['Some Unlisted Tool'], T3: ['Standard'], T4: ['May 2026'] }),
  two_tools: st({}, tool('pika', 'Pro'), tool('kling', 'Standard')),
  same_tool_twice: st({}, tool('pika', 'Pro'), tool('pika', 'Standard')),
  materials_getty_artlist: st({ M0: ['music', 'stock'], M1: ['artlist'], M2: ['no'], M3: ['getty'], M3D: ['yes'] }, tool('pika', 'Pro')),
  stock_shutterstock: st({ M0: ['stock'], M3: ['shutterstock'], M3D: ['no'] }, tool('pika', 'Pro')),
  stock_istock: st({ M0: ['stock'], M3: ['istock'], M3D: ['no'] }, tool('pika', 'Pro')),
  music_epidemic: st({ M0: ['music'], M1: ['epidemic-sound'], M2: ['yes'] }, tool('pika', 'Pro')),
  likeness_ads: st({ L1: ['yes'], L3: ['yes'], P3: ['paid_advertising'], F3: ['US'] }, tool('kling', 'Pro')),
}
/** Computed by the pre-change code (HEAD 0b1e571f) on CASES. */
const SELECTION_SNAPSHOT_BEFORE = '970d35aac5d99f0cdcfa6eb487cffe63f7d01d3076b4ce4ad61aeaf2d35be043'

const guidanceOf = (state: ReturnType<typeof st>, sources: CreatorRecordSources = pilotSources()) => {
  const r = runDeclaredGuidance({ state: state as never, sources, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: RECORD })
  if (!r.ok) throw new Error(JSON.stringify(r.issues))
  return r
}
const claimsById = new Map(TOPIC_CLAIMS_FIXTURE.map((c) => [c.claim_id, c]))

// ── synthetic approved sources (test fixture only) ──
const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }
function approvedSources(): CreatorRecordSources {
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
function textApproval(s: CreatorRecordSources) {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  return {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved' as const, authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
  }
}
function prepare(state: ReturnType<typeof st>) {
  const sources = approvedSources()
  const r = buildCustomerRecord({ state, sources, source_text: { approval: textApproval(sources), acknowledgements: ACKS(sources) }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: { ...RECORD, record_id: 'PREP-SEL' } })
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r
}

// ───────────────────────────────────────────── selection unchanged

describe('claim selection and composition are unchanged', () => {
  test('identical to the pre-change snapshot on every state, apart from the new selection_basis field', () => {
    const strip = (v: unknown): unknown => (Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'selection_basis').map(([k, x]) => [k, strip(x)])) : v)
    const out: Record<string, unknown> = {}
    for (const [name, state] of Object.entries(CASES)) {
      const r = guidanceOf(state)
      out[name] = strip({ objectives: r.guidance.objectives, composition: r.guidance.composition, governance_gaps: r.guidance.governance_gaps, facts: r.guidance.facts })
    }
    expect(createHash('sha256').update(canonicalJson(JSON.parse(JSON.stringify(out)))).digest('hex')).toBe(SELECTION_SNAPSHOT_BEFORE)
  })
})

// ───────────────────────────────────────────── exact references

describe('selection provenance cites exactly the declarations the selector used', () => {
  const toolObs = (r: ReturnType<typeof guidanceOf>, id: string) => r.guidance.facts.provenance.tools.filter((t) => t.tool_id === id).map((t) => t.observation_id).sort()
  const providerObs = (r: ReturnType<typeof guidanceOf>, id: string) => r.guidance.facts.provenance.providers.filter((p) => p.provider_id === id).map((p) => p.observation_id).sort()

  test('every item: one entry per governed scope, matched ids inside that scope and the project, observations exactly those that contributed them', () => {
    for (const state of Object.values(CASES)) {
      const r = guidanceOf(state)
      for (const item of r.guidance.composition.items) {
        const claim = claimsById.get(item.claim_id)!
        const sb = item.selection_basis!
        const expectedScopes = [...(claim.tool_scope !== null ? ['tool'] : []), ...(claim.provider_scope !== null ? ['asset_provider'] : [])]
        expect(sb.scopes.map((s) => s.scope)).toEqual(expectedScopes)
        for (const s of sb.scopes) {
          const scope = s.scope === 'tool' ? claim.tool_scope! : claim.provider_scope!
          const project = s.scope === 'tool' ? r.guidance.facts.activeToolIds : r.guidance.facts.assetProviderIds
          expect(s.matched_ids).toEqual(project.filter((id) => scope.includes(id)).sort())
          expect(s.observation_ids).toEqual(Array.from(new Set(s.matched_ids.flatMap((id) => (s.scope === 'tool' ? toolObs(r, id) : providerObs(r, id))))).sort())
        }
      }
    }
  })

  test('a provider-scoped claim cites the stock answer; a tool-scoped claim cites the tool answer', () => {
    const r = guidanceOf(CASES.materials_getty_artlist)
    const getty = r.guidance.composition.items.find((i) => i.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')!
    expect(getty.selection_basis).toEqual({ scopes: [{ scope: 'asset_provider', matched_ids: ['getty'], observation_ids: providerObs(r, 'getty') }] })
    expect(providerObs(r, 'getty')).toHaveLength(1)
    const pika = r.guidance.composition.items.find((i) => i.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1')!
    expect(pika.selection_basis).toEqual({ scopes: [{ scope: 'tool', matched_ids: ['pika'], observation_ids: toolObs(r, 'pika') }] })
  })

  test('multiple declarations of the same identity are all cited', () => {
    const r = guidanceOf(CASES.same_tool_twice)
    const pika = r.guidance.composition.items.find((i) => i.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1')!
    expect(pika.selection_basis!.scopes[0].observation_ids).toHaveLength(2)
    expect(pika.selection_basis!.scopes[0].observation_ids).toEqual(toolObs(r, 'pika'))
  })

  test('an unresolved identity is never cited and no explanation is fabricated', () => {
    const r = guidanceOf(CASES.other_tool_unresolved)
    expect(r.guidance.facts.activeToolIds).toEqual([])
    expect(r.guidance.composition.items).toEqual([])
  })
})

// ───────────────────────────────────────────── fail closed at the boundary

describe('the selection boundary refuses rather than guesses', () => {
  const claim = (over: Record<string, unknown>) => ({ ...TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1')!, ...over }) as never
  const facts = (over: Partial<CreatorRecordFactsBundle> = {}): CreatorRecordFactsBundle => ({
    applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions: [] } as never,
    activeToolIds: ['pika'],
    assetProviderIds: [],
    provenance: { tools: [{ observation_id: 'o-1', instance: 'tool-1', declared: 'pika', tool_id: 'pika' }], plans: [], providers: [], dropped: [] },
    ...over,
  })

  test('an unscoped claim has no selection basis to cite', () => {
    expect(selectionBasisFor(claim({ tool_scope: null, provider_scope: null }), facts())).toEqual({ scopes: [] })
  })

  test('a scoped claim with no matched id refuses', () => {
    expect(() => selectionBasisFor(claim({ tool_scope: ['kling'] }), facts())).toThrow(SelectionProvenanceError)
  })

  test('a matched id that no declaration contributed refuses (never inferred from co-occurrence)', () => {
    expect(() => selectionBasisFor(claim({ tool_scope: ['pika'] }), facts({ provenance: { tools: [], plans: [], providers: [], dropped: [] } }))).toThrow(SelectionProvenanceError)
  })

  test('an unresolved declaration is never cited, even for a matched id', () => {
    const f = facts({ provenance: { tools: [{ observation_id: 'o-1', instance: 'tool-1', declared: 'pika', tool_id: 'pika' }, { observation_id: 'o-2', instance: 'tool-2', declared: 'Pika?', tool_id: null }], plans: [], providers: [], dropped: [] } })
    expect(selectionBasisFor(claim({ tool_scope: ['pika'] }), f)).toEqual({ scopes: [{ scope: 'tool', matched_ids: ['pika'], observation_ids: ['o-1'] }] })
  })
})

// ───────────────────────────────────────────── selection is not applicability

describe('selection provenance is not applicability or dependency evidence', () => {
  test('it satisfies no applicability requirement: plan items stay unresolved although the tool answer is cited', () => {
    const r = guidanceOf(CASES.pika_not_sure)
    for (const id of ['CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1', 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1']) {
      const item = r.guidance.composition.items.find((i) => i.claim_id === id)!
      expect(item.selection_basis!.scopes[0].observation_ids.length).toBeGreaterThan(0)
      expect(item.conclusion).toBe('relevant_applicability_unresolved')
      expect(item.applicability.material_unresolved.map((q) => q.fact)).toEqual(['tool_plan_tier'])
      expect(item.declared_applicability_basis).toEqual([])
    }
  })

  test('evidence-only dependencies stay open and carry no cited declaration', () => {
    const r = guidanceOf(CASES.materials_getty_artlist)
    const getty = r.guidance.composition.items.find((i) => i.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')!
    const cited = new Set(getty.selection_basis!.scopes.flatMap((s) => s.observation_ids))
    expect(getty.dependency_rows.map((d) => d.dependency_id)).toEqual(['asset_confirmed_getty', 'editorial_designation_confirmed', 'separate_authorization_obtained'])
    for (const d of getty.dependency_rows) {
      expect(d.status).toBe('open')
      expect(d.sufficiency).toBe('not_assessed')
      expect(d.declarations.some((x) => cited.has(x.observation_id))).toBe(false)
    }
  })
})

// ───────────────────────────────────────────── the record

describe('the prepared record carries it, deterministically and fail-closed', () => {
  test('schema v4: every guidance item has its selection basis, grounded in the record; hashing is deterministic; verification and eligibility hold', () => {
    const a = prepare(CASES.materials_getty_artlist)
    const b = prepare(CASES.materials_getty_artlist)
    expect(a.record.schema_version).toBe(CUSTOMER_RECORD_SCHEMA_VERSION) // selection basis unchanged since v4
    expect(b.canonical).toBe(a.canonical)
    expect(a.sha256).toBe(sha256Hex(a.canonical))
    const obs = new Map(a.record.declarations.observations.map((o) => [o.observation_id, o]))
    for (const item of a.record.guidance.items) {
      for (const s of item.selection_basis.scopes) for (const id of s.observation_ids) expect(obs.get(id)?.target.kind).toBe(s.scope === 'tool' ? 'tool_identity' : 'asset_provider_identity')
    }
    expect(verifyCustomerRecord(a.canonical, a.sha256).ok).toBe(true)
    const sources = approvedSources()
    const g = governanceSnapshotFrom({ issuance_date: '2026-11-02', sources, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [textApproval(sources)] })
    const issuable = historicalForm(a) // Issuance supports schema 5 only
    expect(evaluateIssuanceEligibility(issuable.canonical, issuable.sha256, g).decision).toBe('eligible')
  })

  test('a v3 record (no selection provenance) is not a supported record: verification and issuance refuse it', () => {
    const a = prepare(CASES.pika_pro)
    const r = JSON.parse(a.canonical)
    r.schema_version = 3
    for (const i of r.guidance.items) delete i.selection_basis
    const c = canonicalJson(r)
    expect(verifyCustomerRecord(c, sha256Hex(c))).toEqual({ ok: false, reason: 'wrong_schema' })
    expect(evaluateIssuanceEligibility(c, sha256Hex(c), governanceSnapshotFrom({ issuance_date: '2026-11-02', sources: approvedSources(), topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [] })).decision).toBe('invalid_record')
  })

  // Tamper with the pipeline's output; the record builder must refuse.
  function withGuidance(mutate: (r: any) => void): () => CustomerRecordResult {
    let build!: typeof buildCustomerRecord
    jest.isolateModules(() => {
      const actual = jest.requireActual('@/lib/creator-record/integration/run-creator-record-guidance')
      jest.doMock('@/lib/creator-record/integration/run-creator-record-guidance', () => ({
        ...actual,
        runCreatorRecordGuidance: (i: unknown) => {
          const r = actual.runCreatorRecordGuidance(i)
          mutate(r)
          return r
        },
      }))
      build = require('@/lib/creator-record/customer-record/record').buildCustomerRecord
    })
    const sources = approvedSources()
    return () => build({ state: CASES.materials_getty_artlist, sources, source_text: { approval: textApproval(sources), acknowledgements: ACKS(sources) }, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: AS_OF, record: { ...RECORD, record_id: 'PREP-SEL' } })
  }
  const getty = (r: any) => r.composition.items.find((i: any) => i.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')

  test('control: the untampered pipeline builds', () => {
    expect(() => withGuidance(() => undefined)()).not.toThrow()
  })

  test.each([
    ['selection basis not captured', (r: any) => { delete getty(r).selection_basis }],
    ['a cited observation that is not in the record', (r: any) => { getty(r).selection_basis.scopes[0].observation_ids = ['OBS-DOES-NOT-EXIST'] }],
    ['a cited observation of the wrong kind (a tool answer for a provider scope)', (r: any) => { const pika = r.composition.items.find((i: any) => i.claim_id === 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1'); getty(r).selection_basis.scopes[0].observation_ids = pika.selection_basis.scopes[0].observation_ids }],
    ['a matched id outside the governed scope', (r: any) => { getty(r).selection_basis.scopes[0].matched_ids = ['shutterstock'] }],
    ['a scope the governed claim does not declare', (r: any) => { getty(r).selection_basis.scopes.push({ scope: 'tool', matched_ids: ['pika'], observation_ids: [] }) }],
    ['an empty basis for a scoped claim', (r: any) => { getty(r).selection_basis.scopes = [] }],
    ['an unknown field', (r: any) => { getty(r).selection_basis.inferred = true }],
  ])('%s: refused', (_, mutate) => {
    expect(withGuidance(mutate)).toThrow(/^creator_record_v2_record_invariant: /)
  })
})

// ───────────────────────────────────────────── CR-V2-2F: invariant against the real selector

describe('selector/provenance invariant: checked against the real shared selector', () => {
  test('on every state, each cited identity set is necessary and sufficient for the actual selection, and only selected claims carry provenance', () => {
    let scopesChecked = 0
    for (const state of Object.values(CASES)) {
      const r = guidanceOf(state)
      const f = r.guidance.facts
      const fed = new Set(r.guidance.objectives.flatMap((o) => o.bi_input_claim_ids))
      for (const item of r.guidance.composition.items) {
        // Only claims the selector picked and guidance fed to BI are composed, and each carries its provenance.
        expect(fed.has(item.claim_id)).toBe(true)
        expect(item.selection_basis).toBeDefined()
        const select = (tools: string[], providers: string[]) =>
          selectReviewerClaims({ topic: item.provenance.objective.topic as never, topicClaims: TOPIC_CLAIMS_FIXTURE, activeToolIds: tools, assetProviderIds: providers, applicabilityFacts: f.applicabilityFacts }).claims.some((c) => c.claim_id === item.claim_id)
        // The real selector, on the real identity sets, selects it.
        expect(select(f.activeToolIds, f.assetProviderIds)).toBe(true)
        for (const s of item.selection_basis!.scopes) {
          const tools = s.scope === 'tool' ? s.matched_ids : f.activeToolIds
          const providers = s.scope === 'asset_provider' ? s.matched_ids : f.assetProviderIds
          // Sufficient: the cited ids alone keep it selected.
          expect([item.claim_id, s.scope, 'sufficient', select(tools, providers)]).toEqual([item.claim_id, s.scope, 'sufficient', true])
          // Necessary: without the cited ids the real selector drops it.
          const withoutTools = s.scope === 'tool' ? f.activeToolIds.filter((id) => !s.matched_ids.includes(id)) : f.activeToolIds
          const withoutProviders = s.scope === 'asset_provider' ? f.assetProviderIds.filter((id) => !s.matched_ids.includes(id)) : f.assetProviderIds
          expect([item.claim_id, s.scope, 'necessary', select(withoutTools, withoutProviders)]).toEqual([item.claim_id, s.scope, 'necessary', false])
          scopesChecked++
        }
      }
    }
    expect(scopesChecked).toBeGreaterThan(20)
  })
})
