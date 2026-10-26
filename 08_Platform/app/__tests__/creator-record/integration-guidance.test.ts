/**
 * CR-IMPL-1b — Creator Record guidance through the REAL Product A pipeline
 * components (selectReviewerClaims, reviewerClaimToBiResult,
 * buildBoundedInterpretations), with synthetic governed claims, synthetic
 * ledger entries and synthetic declarations only.
 */

import * as biModule from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { biRankForStatus, conclusionRank } from '@/lib/creator-record/contract/compose'
import type { DeclaredObservation, RecordContext } from '@/lib/creator-record/contract/provenance'
import { loadQuestionRegistry, mapAnswer, type Answers } from '@/lib/creator-record/contract/question-registry'
import { synLabel, synLedgerEntry, synRegistryInput, synTopicClaim } from '@/lib/creator-record/contract/testing/synthetic-fixtures'
import type { PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import { buildCreatorRecordFacts } from '@/lib/creator-record/integration/facts'
import { CREATOR_RECORD_OBJECTIVES, objectiveToBiIntent } from '@/lib/creator-record/integration/objectives'
import { runCreatorRecordGuidance, type CreatorRecordGuidanceInput } from '@/lib/creator-record/integration/run-creator-record-guidance'
import { buildProductionFacts } from '@/lib/production-review/build-production-facts'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import * as selectorModule from '@/lib/reviewer-lk/select-reviewer-claims'

// ── Synthetic governed claims (real canonical tool/provider ids, synthetic content) ──
const PLAIN = synTopicClaim({ claim_id: 'CLAIM-SYN-RUNWAY-PLAIN-v1', topic: 'commercial_use', tool_scope: ['runway-gen3'] })
const PRO = synTopicClaim({ claim_id: 'CLAIM-SYN-RUNWAY-PRO-v1', topic: 'commercial_use', tool_scope: ['runway-gen3'], applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'SynPro' }] })
const FREE = synTopicClaim({ claim_id: 'CLAIM-SYN-RUNWAY-FREE-v1', topic: 'commercial_use', tool_scope: ['runway-gen3'], applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'SynFree' }] })
const UNAUTH = synTopicClaim({ claim_id: 'CLAIM-SYN-RUNWAY-UNAUTH-v1', topic: 'commercial_use', tool_scope: ['runway-gen3'], unresolved_project_dependencies: ['syn_evidence_only_dep'] })
const JUR = synTopicClaim({ claim_id: 'CLAIM-SYN-JURISDICTION-v1', topic: 'commercial_use', jurisdiction: 'California', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'California' }] })
const INTERNAL = synTopicClaim({ claim_id: 'CLAIM-SYN-INTERNAL-v1', topic: 'commercial_use', tool_scope: ['runway-gen3'], publication_scope: 'Internal/research' })
const ARTLIST = synTopicClaim({ claim_id: 'CLAIM-SYN-ARTLIST-v1', topic: 'third_party_source_rights', provider_scope: ['artlist'], unresolved_project_dependencies: ['syn_evidence_only_dep'] })
const CLAIMS = [PLAIN, PRO, FREE, UNAUTH, JUR, INTERNAL, ARTLIST]

const AUTHORIZED: PublicationLedgerEntry[] = [PLAIN, PRO, FREE, JUR, INTERNAL, ARTLIST].map((c) =>
  synLedgerEntry({ claim_id: c.claim_id, evidence_notes: c === ARTLIST ? { syn_evidence_only_dep: 'SYN evidence note' } : {} }),
)

// ── Synthetic declarations through the real Q/O contract ──
const CTX: RecordContext = { record_id: 'SYN-REC-INT', record_version: 1, captured_at: '2026-10-25T00:00:00Z' }
const reg = (() => {
  const r = loadQuestionRegistry(synRegistryInput())
  if (!r.ok) throw new Error(r.errors.join('; '))
  return r.registry
})()
function declare(q_id: string, values: string[], opts: { instance?: string; answers?: Answers } = {}): DeclaredObservation[] {
  const r = mapAnswer(reg, opts.answers ?? {}, CTX, { q_id, q_version: 1, values, verbatim: values.join(', '), instance: opts.instance })
  if (!r.ok) throw new Error(`${q_id}: ${r.reason}`)
  return r.observations
}
const runwayPro = () => [...declare('SYN-TOOL', ['Runway'], { instance: 't1' }), ...declare('SYN-PLAN', ['SynPro'], { instance: 't1' })]
const artlistWithDoc = () => [
  ...declare('SYN-PROVIDER', ['Artlist']),
  ...declare('SYN-PRESENCE', ['yes']),
  ...declare('SYN-DOC-EXISTS', ['yes'], { answers: { 'SYN-PRESENCE': ['yes'] } }),
]

function run(over: Partial<CreatorRecordGuidanceInput> = {}) {
  return runCreatorRecordGuidance({ observations: [...runwayPro(), ...artlistWithDoc()], topicClaims: CLAIMS, ledger: AUTHORIZED, dependencyLabel: synLabel, as_of: '2026-10-25', ...over })
}
const trace = (r: ReturnType<typeof run>, topic: string) => r.objectives.find((o) => o.objective_id === `creator-record:${topic}:v1`)!

afterEach(() => jest.restoreAllMocks())

describe('objectives are fixed system objectives, not customer goals', () => {
  test('exactly commercial_use and third_party_source_rights, informational, with fixed labels', () => {
    expect(CREATOR_RECORD_OBJECTIVES.map((o) => [o.objective_id, o.origin])).toEqual([
      ['creator-record:commercial_use:v1', 'creator_record_system_objective'],
      ['creator-record:third_party_source_rights:v1', 'creator_record_system_objective'],
    ])
    for (const o of CREATOR_RECORD_OBJECTIVES) {
      const i = objectiveToBiIntent(o)
      expect(i).toEqual({ intent_id: o.objective_id, intent_text: expect.stringMatching(/^Creator Record objective: /), category: o.topic, scope: 'informational' })
      expect(Object.keys(i).sort()).toEqual(['category', 'intent_id', 'intent_text', 'scope'])
    }
  })
})

describe('authorized synthetic claims pass through the real pipeline', () => {
  const r = run()

  test('commercial_use: plain and plan-met claims shown; not_met excluded; base-gate and ledger refusals reported', () => {
    const t = trace(r, 'commercial_use')
    expect(t.withheld).toEqual([{ claim_id: INTERNAL.claim_id, reason: 'publication_scope_not_reviewer_eligible' }])
    expect(t.excluded_not_met).toEqual([FREE.claim_id])
    expect(t.refused_before_bi).toEqual([
      { claim_id: JUR.claim_id, reason: 'jurisdiction_scoped_guidance_disabled' },
      { claim_id: UNAUTH.claim_id, reason: 'no_ledger_entry' },
    ])
    expect(t.bi_input_claim_ids).toEqual([PLAIN.claim_id, PRO.claim_id])
    expect(t.bi_status).toBe('directly_relevant')
    const shown = r.composition.items.filter((i) => i.provenance.objective.topic === 'commercial_use')
    expect(shown.map((i) => [i.claim_id, i.conclusion])).toEqual([
      [PLAIN.claim_id, 'relevant_on_declared_facts'],
      [PRO.claim_id, 'relevant_on_declared_facts'],
    ])
    const pro = shown.find((i) => i.claim_id === PRO.claim_id)!
    expect(pro.declared_applicability_basis).toEqual([{ fact: 'tool_plan_tier', tool: 'runway-gen3', instance: 't1', observation_id: 'SYN-REC-INT:v1:SYN-PLAN:t1:0', normalized_value: 'SynPro' }])
    // The plain claim has no applicability requirement, so no declared basis.
    expect(shown.find((i) => i.claim_id === PLAIN.claim_id)!.declared_applicability_basis).toEqual([])
    expect(pro.provenance).toMatchObject({
      objective: { objective_id: 'creator-record:commercial_use:v1' },
      bounded_interpretation: { goal_id: 'creator-record:commercial_use:v1', status: 'directly_relevant', citation: 'supporting' },
      publication: { entry_id: `SYN-LEDGER-${PRO.claim_id}`, approver: 'SYN-APPROVER' },
    })
  })

  test('third_party_source_rights: provider-scoped claim with an open dependency is unresolved, not stronger', () => {
    const t = trace(r, 'third_party_source_rights')
    expect(t.bi_input_claim_ids).toEqual([ARTLIST.claim_id])
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    const a = r.composition.items.find((i) => i.claim_id === ARTLIST.claim_id)!
    expect(a.conclusion).toBe('relevant_applicability_unresolved')
  })

  test('fact provenance: tool, plan and provider each trace to their declaration', () => {
    expect(r.facts.provenance.tools).toEqual([{ observation_id: 'SYN-REC-INT:v1:SYN-TOOL:t1:0', instance: 't1', declared: 'Runway', tool_id: 'runway-gen3' }])
    expect(r.facts.provenance.plans).toEqual([{ observation_id: 'SYN-REC-INT:v1:SYN-PLAN:t1:0', instance: 't1', tool_id: 'runway-gen3', declared: 'SynPro', governed_value: 'SynPro', passed_to_applicability: true }])
    expect(r.facts.provenance.providers).toEqual([{ observation_id: 'SYN-REC-INT:v1:SYN-PROVIDER:0', declared: 'Artlist', provider_id: 'artlist' }])
  })

  test('composition never exceeds the BI status of the claim\'s own objective', () => {
    for (const item of r.composition.items) {
      const t = r.objectives.find((o) => o.objective_id === item.provenance.objective.objective_id)!
      expect(conclusionRank(item.conclusion)).toBeLessThanOrEqual(biRankForStatus(t.bi_status!))
      expect(item.provenance.bounded_interpretation.status).toBe(t.bi_status)
    }
  })
})

describe('publication authorization is enforced before BI', () => {
  test('an empty ledger produces no guidance and BI is never called', () => {
    const spy = jest.spyOn(biModule, 'buildBoundedInterpretations')
    const r = run({ ledger: [] })
    expect(r.composition.items).toEqual([])
    expect(spy).not.toHaveBeenCalled()
    expect(r.objectives.flatMap((o) => o.refused_before_bi.map((x) => x.reason))).toEqual(['no_ledger_entry', 'no_ledger_entry', 'no_ledger_entry', 'no_ledger_entry', 'no_ledger_entry'])
  })

  test('the real governed fixture with an empty ledger produces no guidance', () => {
    const r = runCreatorRecordGuidance({ observations: [...runwayPro(), ...artlistWithDoc()], topicClaims: TOPIC_CLAIMS_FIXTURE, ledger: [], dependencyLabel: synLabel, as_of: '2026-10-25' })
    expect(r.composition.items).toEqual([])
    expect(r.objectives.every((o) => o.bi_input_claim_ids.length === 0 && o.bi_status === null)).toBe(true)
  })

  test('BI receives exactly the authorized claims (spy on the real BI call)', () => {
    const spy = jest.spyOn(biModule, 'buildBoundedInterpretations')
    run()
    const fedIds = spy.mock.calls.map(([, results]) => results.map((x) => x.claim_id))
    expect(fedIds).toEqual([[PLAIN.claim_id, PRO.claim_id], [ARTLIST.claim_id]])
    expect(spy.mock.calls.map(([intents]) => intents.map((i) => i.intent_id))).toEqual([['creator-record:commercial_use:v1'], ['creator-record:third_party_source_rights:v1']])
  })

  test('an unauthorized dependency-bearing claim cannot change BI for authorized claims', () => {
    expect(trace(run(), 'commercial_use').bi_status).toBe('directly_relevant')
    // Control: the same claim, once authorized, does reach BI and changes its status.
    const withUnauth = run({ ledger: [...AUTHORIZED, synLedgerEntry({ claim_id: UNAUTH.claim_id })] })
    expect(trace(withUnauth, 'commercial_use').bi_status).toBe('relevant_applicability_unresolved')
  })

  test('reviewer eligibility, CRC eligibility and publication scope never authorize on their own', () => {
    const crcYes = CLAIMS.map((c) => ({ ...c, crc_eligible: 'Yes' as const, publication_scope: 'Public SI8 position' as const }))
    const r = run({ topicClaims: crcYes, ledger: [] })
    expect(r.composition.items).toEqual([])
  })

  test('governance gaps are reported: refused claims and ledger entries with no governed claim', () => {
    const r = run({ ledger: [...AUTHORIZED, synLedgerEntry({ claim_id: 'CLAIM-SYN-DOES-NOT-EXIST-v1' })] })
    expect(r.governance_gaps).toContainEqual({ kind: 'ledger_entry_without_governed_claim', entry_id: 'SYN-LEDGER-CLAIM-SYN-DOES-NOT-EXIST-v1', claim_id: 'CLAIM-SYN-DOES-NOT-EXIST-v1' })
    expect(r.governance_gaps).toContainEqual({ kind: 'claim_refused', claim_id: JUR.claim_id, objective_id: 'creator-record:commercial_use:v1', reason: 'jurisdiction_scoped_guidance_disabled' })
  })
})

describe('declarations cannot resolve evidence-only dependencies', () => {
  test('a "yes, I have the document" answer is shown beside the dependency, which stays open and not assessed', () => {
    const a = run().composition.items.find((i) => i.claim_id === ARTLIST.claim_id)!
    expect(a.dependency_rows).toHaveLength(1)
    expect(a.dependency_rows[0]).toMatchObject({ dependency_id: 'syn_evidence_only_dep', status: 'open', sufficiency: 'not_assessed', treated_as: 'evidence_required', evidence_note: 'SYN evidence note' })
    expect(a.dependency_rows[0].declarations.map((d) => d.observation_kind)).toEqual(['declared_document_existence'])
    expect(a.conclusion).toBe('relevant_applicability_unresolved')
  })
})

describe('unresolved applicability remains unresolved', () => {
  test('no plan declared → plan claim unresolved at the selector, at BI and in the record', () => {
    const r = run({ observations: declare('SYN-TOOL', ['Runway'], { instance: 't1' }) })
    const t = trace(r, 'commercial_use')
    expect(t.excluded_not_met).toEqual([])
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    const pro = r.composition.items.find((i) => i.claim_id === PRO.claim_id)!
    expect(pro.applicability.status).toBe('unresolved')
    expect(pro.applicability.material_unresolved).toEqual([{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'SynPro' }])
    expect(pro.conclusion).toBe('relevant_applicability_unresolved')
    // Mixed objective: BI caps the plain claim too, and Creator Record does not repair it.
    expect(r.composition.items.find((i) => i.claim_id === PLAIN.claim_id)!.conclusion).toBe('relevant_applicability_unresolved')
  })

  test('a plan that is not a governed value never reaches the evaluator', () => {
    const r = run({ observations: [...declare('SYN-TOOL', ['Runway'], { instance: 't1' }), ...declare('SYN-PLAN', ['Ultra'], { instance: 't1' })] })
    expect(r.facts.provenance.dropped).toContainEqual({ observation_id: 'SYN-REC-INT:v1:SYN-PLAN:t1:0', reason: 'plan_not_a_governed_value' })
    expect(r.composition.items.find((i) => i.claim_id === PRO.claim_id)!.applicability.status).toBe('unresolved')
  })

  test('conflicting governed plans for one tool are dropped, not picked', () => {
    const obs = [
      ...declare('SYN-TOOL', ['Runway'], { instance: 't1' }),
      ...declare('SYN-PLAN', ['SynPro'], { instance: 't1' }),
      ...declare('SYN-TOOL', ['Runway'], { instance: 't2' }),
      ...declare('SYN-PLAN', ['SynFree'], { instance: 't2' }),
    ]
    const f = buildCreatorRecordFacts(obs, CLAIMS)
    expect(f.applicabilityFacts.toolMentions.every((m) => m.plan_tier.state === 'unknown')).toBe(true)
    expect(f.provenance.dropped.filter((d) => d.reason === 'plan_conflicting_declarations')).toHaveLength(2)
  })

  test('account status and unresolvable tools contribute nothing (fail closed)', () => {
    const f = buildCreatorRecordFacts([...declare('SYN-TOOL', ['NotATool'], { instance: 't1' }), ...declare('SYN-ACCOUNT', ['member'], { instance: 't1' })], CLAIMS)
    expect(f.activeToolIds).toEqual([])
    expect(f.applicabilityFacts.toolMentions).toEqual([])
    expect(f.provenance.dropped.map((d) => d.reason).sort()).toEqual(['account_status_not_supported', 'tool_unresolved'])
  })
})

describe('location facts never become jurisdiction facts', () => {
  test('declared California / United States locations leave jurisdiction empty and select nothing', () => {
    const spy = jest.spyOn(selectorModule, 'selectReviewerClaims')
    const obs = [...runwayPro(), ...declare('SYN-BASED', ['US-CA']), ...declare('SYN-SHOWN', ['US'])]
    const r = run({ observations: obs })
    expect(r.facts.applicabilityFacts.jurisdiction).toEqual({ included: [], excluded: [] })
    for (const [args] of spy.mock.calls) expect(args.applicabilityFacts.jurisdiction).toEqual({ included: [], excluded: [] })
    expect(trace(r, 'commercial_use').refused_before_bi).toContainEqual({ claim_id: JUR.claim_id, reason: 'jurisdiction_scoped_guidance_disabled' })
    expect(r.composition.items.map((i) => i.claim_id)).not.toContain(JUR.claim_id)
  })

  test('location answers do not change guidance at all', () => {
    const base = [...runwayPro(), ...artlistWithDoc()]
    const withLocation = [...base, ...declare('SYN-BASED', ['US-CA']), ...declare('SYN-SHOWN', ['SYN-GROUP', 'online_worldwide'])]
    expect(run({ observations: withLocation }).composition).toEqual(run({ observations: base }).composition)
    expect(run({ observations: withLocation }).objectives).toEqual(run({ observations: base }).objectives)
  })
})

describe('existing Product A behaviour is reused, not re-implemented', () => {
  test('equivalent declarations produce the same retrieval inputs as the Product A fact builder', () => {
    const cr = buildCreatorRecordFacts(runwayPro(), CLAIMS)
    const pa = buildProductionFacts({ tools_used: [{ tool_name: 'Runway', plan_type: 'SynPro' }], territory_preferences: 'United States', third_party_assets: null, audio_disclosure: null }, CLAIMS)
    const shape = (ms: typeof cr.applicabilityFacts.toolMentions) => ms.map((m) => ({ resolution: m.resolution, plan_tier: m.plan_tier, account_status: m.account_status, superseded_by: m.superseded_by }))
    expect(shape(cr.applicabilityFacts.toolMentions)).toEqual(shape(pa.applicabilityFacts.toolMentions))
    expect(cr.applicabilityFacts.jurisdiction).toEqual(pa.applicabilityFacts.jurisdiction)
    expect(cr.activeToolIds).toEqual(pa.activeToolIds)
  })

  test('before the Creator Record gate, selection equals the reviewer selector on the same inputs', () => {
    const facts = buildCreatorRecordFacts([...runwayPro(), ...artlistWithDoc()], CLAIMS)
    const r = run()
    for (const o of CREATOR_RECORD_OBJECTIVES) {
      const direct = selectorModule.selectReviewerClaims({ topic: o.topic, topicClaims: CLAIMS, assetProviderIds: facts.assetProviderIds, activeToolIds: facts.activeToolIds, applicabilityFacts: facts.applicabilityFacts })
      const t = r.objectives.find((x) => x.objective_id === o.objective_id)!
      expect(t.withheld).toEqual(direct.withheld)
      expect([...t.excluded_not_met, ...t.refused_before_bi.map((x) => x.claim_id), ...t.bi_input_claim_ids].sort()).toEqual(direct.claims.map((c) => c.claim_id).sort())
    }
  })
})
