/**
 * CRV2-IA-4A — objective-to-fact authorization and the jurisdiction publication boundary, through the REAL pipeline
 * (shared selector, applicability evaluator, Bounded Interpretation, composition) and the REAL governed copyright claims.
 *
 * Ledger entries, authorizations and guidance-place observations below are TEST-ONLY. Neither authority bundle carries
 * any of them, the question registry does not accept a guidance-place target yet, and the copyright objectives are not
 * in the default run, so none of this is reachable by a customer (asserted at the end).
 */

import * as biModule from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { composeGuidance, type CreatorRecordObjective } from '@/lib/creator-record/contract/compose'
import { objectiveFactAuthorizationErrors, type ObjectiveFactAuthorization } from '@/lib/creator-record/contract/objective-fact-authorization'
import type { DeclaredObservation } from '@/lib/creator-record/contract/provenance'
import type { PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { synBi, synClaim, synLabel, synLedgerEntry, synSelected } from '@/lib/creator-record/contract/testing/synthetic-fixtures'
import { bundleAuthorizationErrors } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_INACTIVE_OBJECTIVES, CREATOR_RECORD_OBJECTIVE_CATALOG_IDS, CREATOR_RECORD_OBJECTIVES, type CreatorRecordObjectiveDefinition } from '@/lib/creator-record/integration/objectives'
import { runCreatorRecordGuidance, type CreatorRecordGuidanceInput } from '@/lib/creator-record/integration/run-creator-record-guidance'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import * as selectorModule from '@/lib/reviewer-lk/select-reviewer-claims'

const AS_OF = '2026-11-11'
const claim = (id: string) => TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)!
const COPY001 = 'CLAIM-COPY-001-v1'
const COPY002 = 'CLAIM-COPY-002-v1'
const COPY003 = 'CLAIM-COPY-003-v1'
const COPY004 = 'CLAIM-COPY-004-v1'
const TW = 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'
const CN = 'CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1'
const US_TM = 'CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1'
const US_CLAIMS = [COPY001, COPY002, COPY003]

// ── test-only ledger: matches each real claim's own last_verified; China deliberately absent ──
const entry = (id: string, policy: PublicationLedgerEntry['applicability_policy']) =>
  synLedgerEntry({ claim_id: id, claim_last_verified: claim(id).last_verified!, applicability_policy: policy, evidence_notes: { human_contribution_description: 'TEST evidence note' }, refresh_by: '2027-02-11' })
const LEDGER: PublicationLedgerEntry[] = [entry(COPY004, 'met_only'), ...[...US_CLAIMS, TW].map((id) => entry(id, 'requirements_met'))]

const [OWNERSHIP, COPYRIGHTABILITY] = ['copyright_ownership', 'copyrightability'].map((t) => CREATOR_RECORD_INACTIVE_OBJECTIVES.find((o) => o.topic === t)!)
const COPYRIGHT_OBJECTIVES = [OWNERSHIP, COPYRIGHTABILITY]

// ── test-only authorizations: J1 v1 → jurisdiction, for the two copyright objectives only ──
const APPROVAL = { status: 'approved' as const, approver: 'TEST-APPROVER', decision_date: '2026-11-11', review_ref: 'TEST-REVIEW' }
const auth = (objective: CreatorRecordObjectiveDefinition, over: Partial<ObjectiveFactAuthorization> = {}): ObjectiveFactAuthorization => ({
  authorization_id: `TEST-OFA-${objective.topic}`,
  version: 1,
  objective_id: objective.objective_id,
  fact: 'jurisdiction',
  source: { q_id: 'J1', q_version: 1 },
  semantic_review_ref: 'TEST-SEMANTIC-REVIEW',
  approval: APPROVAL,
  ...over,
})
const AUTHS = COPYRIGHT_OBJECTIVES.map((o) => auth(o))

// ── test-only declarations, built directly (the registry does not accept a guidance-place target yet) ──
let seq = 0
const obs = (q_id: string, code: string, target: DeclaredObservation['target'], q_version = 1): DeclaredObservation => ({
  observation_id: `TEST-REC:v1:${q_id}:${seq++}`,
  source_kind: 'customer_declared',
  record_id: 'TEST-REC',
  record_version: 1,
  question: { q_id, q_version },
  instance: null,
  answer_verbatim: code,
  normalized_value: code,
  observation_kind: target.kind === 'none' ? 'record_only' : target.kind === 'dependency' ? 'declared_description' : 'declared_value',
  target,
  map_entry: target.kind === 'none' ? null : { o_id: `TEST-O-${q_id}-${code}`, o_version: 1, value_mapping_version: 'TEST' },
  captured_at: '2026-11-11T00:00:00Z',
  supersedes: null,
})
const J1 = {
  us: () => obs('J1', 'us', { kind: 'guidance_place', place: 'United States' }),
  tw: () => obs('J1', 'tw', { kind: 'guidance_place', place: 'Taiwan' }),
  none: () => obs('J1', 'none', { kind: 'none' }),
  not_sure: () => obs('J1', 'not_sure', { kind: 'none' }),
}
const H1 = () => obs('H1', 'Edited the video', { kind: 'dependency', dependency_id: 'human_contribution_description' })
const TOOL = () => obs('T1', 'Runway', { kind: 'tool_identity' })

function run(observations: DeclaredObservation[], over: Partial<CreatorRecordGuidanceInput> = {}) {
  return runCreatorRecordGuidance({
    observations: [TOOL(), H1(), ...observations],
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    ledger: LEDGER,
    dependencyLabel: synLabel,
    as_of: AS_OF,
    objectives: COPYRIGHT_OBJECTIVES,
    objectiveFactAuthorizations: AUTHS,
    ...over,
  })
}
type R = ReturnType<typeof run>
const traceOf = (r: R, o: CreatorRecordObjective) => r.objectives.find((t) => t.objective_id === o.objective_id)!
const shown = (r: R, o: CreatorRecordObjective) => r.composition.items.filter((i) => i.provenance.objective.objective_id === o.objective_id).map((i) => i.claim_id).sort()

afterEach(() => jest.restoreAllMocks())

describe('scenarios: places reach jurisdiction only from an explicit, authorized choice', () => {
  const scenarios: [string, () => DeclaredObservation[], string[]][] = [
    ['United States', () => [J1.us()], US_CLAIMS],
    ['Taiwan', () => [J1.tw()], [TW]],
    ['both', () => [J1.us(), J1.tw()], [...US_CLAIMS, TW].sort()],
    ['None of these', () => [J1.none()], []],
    ['Not sure', () => [J1.not_sure()], []],
    ['United States + Not sure', () => [J1.us(), J1.not_sure()], US_CLAIMS],
  ]

  test.each(scenarios)('%s', (_name, declared, expectedCopyrightability) => {
    const spy = jest.spyOn(biModule, 'buildBoundedInterpretations')
    const r = run(declared())
    const t = traceOf(r, COPYRIGHTABILITY)

    // Only explicitly chosen places reach the evaluator; nothing is ever excluded.
    expect(t.jurisdiction_basis.map((b) => b.place).sort()).toEqual(declared().flatMap((o) => (o.target.kind === 'guidance_place' ? [o.target.place] : [])).sort())
    // Exactly the authorized, met claims reach BI and are shown; China never does.
    expect([...t.bi_input_claim_ids].sort()).toEqual(expectedCopyrightability)
    expect(shown(r, COPYRIGHTABILITY)).toEqual(expectedCopyrightability)
    for (const call of spy.mock.calls) expect(call[1].map((b) => b.claim_id)).not.toContain(CN)
    // Every place-scoped claim not met is refused before BI, with its reason.
    for (const id of [...US_CLAIMS, TW].filter((id) => !expectedCopyrightability.includes(id))) {
      expect(t.refused_before_bi).toContainEqual({ claim_id: id, reason: 'jurisdiction_requirement_not_met' })
    }
    expect(t.refused_before_bi).toContainEqual({ claim_id: CN, reason: 'no_ledger_entry' })

    // COPY-004 (no place requirement) is the same in every scenario.
    expect(shown(r, OWNERSHIP)).toEqual([COPY004])
    expect(r.composition.items.find((i) => i.claim_id === COPY004)!.conclusion).toBe('relevant_on_declared_facts')
  })

  test('the selector receives places only as included, never excluded, and only for authorized objectives', () => {
    const spy = jest.spyOn(selectorModule, 'selectReviewerClaims')
    run([J1.us(), J1.tw()], { objectives: [...CREATOR_RECORD_OBJECTIVES, ...COPYRIGHT_OBJECTIVES] })
    const byTopic = new Map(spy.mock.calls.map(([a]) => [a.topic, a.applicabilityFacts.jurisdiction]))
    expect(byTopic.get('copyrightability')).toEqual({ included: ['United States', 'Taiwan'], excluded: [] })
    expect(byTopic.get('copyright_ownership')).toEqual({ included: ['United States', 'Taiwan'], excluded: [] })
    expect(byTopic.get('commercial_use')).toEqual({ included: [], excluded: [] })
    expect(byTopic.get('third_party_source_rights')).toEqual({ included: [], excluded: [] })
  })
})

describe('the open human-contribution dependency and the interpretation ceiling are preserved', () => {
  test('copyright protection items stay unresolved, with an open dependency row, whatever the creator declared', () => {
    const r = run([J1.us(), J1.tw()])
    expect(traceOf(r, COPYRIGHTABILITY).bi_status).toBe('relevant_applicability_unresolved')
    const items = r.composition.items.filter((i) => [...US_CLAIMS, TW].includes(i.claim_id))
    expect(items).toHaveLength(4)
    for (const i of items) {
      expect(i.applicability.status).toBe('met')
      expect(i.conclusion).toBe('relevant_applicability_unresolved')
      expect(i.dependency_rows.map((d) => [d.dependency_id, d.status])).toEqual([['human_contribution_description', 'open']])
    }
    expect(r.composition.items.every((i) => i.conclusion !== 'relevant_on_declared_facts' || i.claim_id === COPY004)).toBe(true)
  })
})

describe('invalid values and unauthorized sources are withheld, never guessed', () => {
  test.each([
    ['a non-canonical spelling', 'taiwan'],
    ['an unlisted place', 'Japan'],
    ['an alias the shared table would canonicalise', 'US'],
  ])('%s is dropped', (_name, value) => {
    const r = run([obs('J1', 'x', { kind: 'guidance_place', place: value })])
    expect(r.facts.declaredGuidancePlaces).toEqual([])
    expect(r.facts.guidancePlaceDrops).toHaveLength(1)
    expect(traceOf(r, COPYRIGHTABILITY).bi_input_claim_ids).toEqual([])
  })

  test('a place from another question version is not authorized', () => {
    const r = run([obs('J1', 'us', { kind: 'guidance_place', place: 'United States' }, 2)])
    expect(traceOf(r, COPYRIGHTABILITY).jurisdiction_basis).toEqual([])
    expect(traceOf(r, COPYRIGHTABILITY).bi_input_claim_ids).toEqual([])
  })

  test('no authorization, or an unapproved one, means no place (default deny)', () => {
    for (const objectiveFactAuthorizations of [undefined, [], AUTHS.map((a) => ({ ...a, approval: { ...a.approval, status: 'pending' as const } }))]) {
      const r = run([J1.us()], { objectiveFactAuthorizations })
      expect(traceOf(r, COPYRIGHTABILITY).jurisdiction_basis).toEqual([])
      expect(shown(r, COPYRIGHTABILITY)).toEqual([])
      expect(shown(r, OWNERSHIP)).toEqual([COPY004])
    }
  })

  test('location answers never become places, even with authorizations present', () => {
    const r = run([obs('F2', 'us', { kind: 'location', role: 'distribution_market' }), obs('F3', 'us', { kind: 'location', role: 'client_base' })])
    expect(r.facts.declaredGuidancePlaces).toEqual([])
    expect(r.facts.applicabilityFacts.jurisdiction).toEqual({ included: [], excluded: [] })
    expect(shown(r, COPYRIGHTABILITY)).toEqual([])
  })
})

describe('future objectives and misconfigured ledger entries cannot publish an unchosen place', () => {
  test('an objective without an authorization gets no places: a US-scoped trademark claim is refused before BI', () => {
    const TRADEMARK: CreatorRecordObjectiveDefinition = { objective_id: 'creator-record:trademark:v1', version: 1, topic: 'trademark' as never, origin: 'creator_record_system_objective' }
    const r = run([J1.us()], { objectives: [...COPYRIGHT_OBJECTIVES, TRADEMARK], ledger: [...LEDGER, entry(US_TM, 'requirements_met')] })
    const t = traceOf(r, TRADEMARK)
    expect(t.jurisdiction_basis).toEqual([])
    expect(t.refused_before_bi).toContainEqual({ claim_id: US_TM, reason: 'jurisdiction_requirement_not_met' })
    expect(t.bi_input_claim_ids).not.toContain(US_TM)
    expect(shown(r, COPYRIGHTABILITY)).toEqual(US_CLAIMS)
  })

  test('a China ledger entry does not publish China guidance when only the United States was chosen', () => {
    const r = run([J1.us()], { ledger: [...LEDGER, entry(CN, 'requirements_met')] })
    expect(traceOf(r, COPYRIGHTABILITY).refused_before_bi).toContainEqual({ claim_id: CN, reason: 'jurisdiction_requirement_not_met' })
    expect(traceOf(r, COPYRIGHTABILITY).bi_input_claim_ids).not.toContain(CN)
  })

  test('a place-scoped entry misconfigured as met_or_unresolved is refused, even when its place was chosen', () => {
    const ledger = LEDGER.map((e) => (e.claim_id === TW ? { ...e, applicability_policy: 'met_or_unresolved' as const } : e))
    for (const declared of [[J1.tw()], [J1.none()]]) {
      const r = run(declared, { ledger })
      expect(traceOf(r, COPYRIGHTABILITY).refused_before_bi).toContainEqual({ claim_id: TW, reason: 'jurisdiction_scoped_requires_met_policy' })
      expect(shown(r, COPYRIGHTABILITY)).not.toContain(TW)
    }
  })

  test('composition refuses requirements_met when applicability is not met (defence in depth behind the pre-BI check)', () => {
    const c = synClaim({ claim_id: 'CLAIM-SYN-RM-v1' })
    const objective: CreatorRecordObjective = { objective_id: 'SYN-OBJ-RM', version: 1, topic: 'copyrightability', origin: 'creator_record_system_objective' }
    const out = composeGuidance({
      evaluations: [{ objective, fed_claims: [synSelected(c, 'unresolved')], interpretation: synBi('relevant_applicability_unresolved', [c.claim_id], [], objective.objective_id) }],
      ledger: [synLedgerEntry({ claim_id: c.claim_id, applicability_policy: 'requirements_met' })],
      observations: [],
      dependencyLabel: synLabel,
      as_of: '2026-10-25',
    })
    expect(out).toEqual({ items: [], omissions: [{ claim_id: c.claim_id, objective_id: 'SYN-OBJ-RM', reason: 'policy_requires_requirements_met' }] })
  })
})

describe('authority-bundle validation: malformed or unapproved authorizations fail the bundle', () => {
  const registry_input = {
    questions: [{ q_id: 'J1', version: 1 }],
    observation_map: [{ q_id: 'J1', q_version: 1, target: { kind: 'guidance_place' }, approval: APPROVAL }],
  }
  const ctx = { objective_ids: CREATOR_RECORD_OBJECTIVE_CATALOG_IDS, registry_input }
  const ok = AUTHS[1]

  test('a well-formed, approved list validates', () => {
    expect(objectiveFactAuthorizationErrors(AUTHS, ctx)).toEqual([])
    expect(objectiveFactAuthorizationErrors(undefined, ctx)).toEqual([])
    expect(objectiveFactAuthorizationErrors([], ctx)).toEqual([])
  })

  test.each([
    ['not a list', { x: 1 }],
    ['an unknown objective', [{ ...ok, objective_id: 'creator-record:trademark:v1' }]],
    ['a fact that is not authorizable', [{ ...ok, fact: 'tool_plan_tier' }]],
    ['an unknown question', [{ ...ok, source: { q_id: 'F2', q_version: 1 } }]],
    ['a question version mismatch', [{ ...ok, source: { q_id: 'J1', q_version: 2 } }]],
    ['no semantic review', [{ ...ok, semantic_review_ref: '' }]],
    ['a pending approval', [{ ...ok, approval: { ...APPROVAL, status: 'pending' } }]],
    ['an approval without approver', [{ ...ok, approval: { ...APPROVAL, approver: null } }]],
    ['an approval without review reference', [{ ...ok, approval: { ...APPROVAL, review_ref: null } }]],
    ['an unknown field', [{ ...ok, scope: 'all' }]],
    ['a duplicate id', [ok, { ...ok, objective_id: AUTHS[0].objective_id }]],
    ['a duplicate authorization', [ok, { ...ok, authorization_id: 'TEST-OFA-other' }]],
    ['a bad version', [{ ...ok, version: 0 }]],
  ])('%s', (_name, input) => {
    expect(objectiveFactAuthorizationErrors(input, ctx).length).toBeGreaterThan(0)
  })

  test('a source question with no approved guidance-place observation is refused', () => {
    const unapproved = { ...registry_input, observation_map: [{ ...registry_input.observation_map[0], approval: { ...APPROVAL, status: 'pending' as const } }] }
    expect(objectiveFactAuthorizationErrors([ok], { ...ctx, registry_input: unapproved })).toEqual([expect.stringContaining('no approved guidance-place observation')])
  })

  test('both real bundles validate and carry no authorization', () => {
    expect(bundleAuthorizationErrors(CREATOR_RECORD_GOVERNANCE_AUTHORITY)).toEqual([])
    expect(CREATOR_RECORD_GOVERNANCE_AUTHORITY.objective_fact_authorizations).toBeUndefined()
    expect(bundleAuthorizationErrors(CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY!)).toEqual([])
    expect(CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY!.objective_fact_authorizations).toBeUndefined()
  })

  test('an authorization added to the real governance bundle would make it unusable (its registry has no J1)', () => {
    expect(bundleAuthorizationErrors({ ...CREATOR_RECORD_GOVERNANCE_AUTHORITY, objective_fact_authorizations: AUTHS }).length).toBeGreaterThan(0)
  })
})

describe('copyright guidance stays inactive', () => {
  test('the default run evaluates only the two active objectives, even with places declared and authorizations passed', () => {
    const r = runCreatorRecordGuidance({ observations: [TOOL(), H1(), J1.us(), J1.tw()], topicClaims: TOPIC_CLAIMS_FIXTURE, ledger: LEDGER, dependencyLabel: synLabel, as_of: AS_OF, objectiveFactAuthorizations: AUTHS })
    expect(r.objectives.map((o) => o.objective_id)).toEqual(['creator-record:commercial_use:v1', 'creator-record:third_party_source_rights:v1'])
    expect(r.composition.items.map((i) => i.claim_id)).not.toEqual(expect.arrayContaining([COPY004]))
    for (const t of r.objectives) expect(t.jurisdiction_basis).toEqual([])
  })

  test('the question registry still refuses a guidance-place target, so no approved questionnaire can produce one', () => {
    const r = loadQuestionRegistry({
      questions: [{ q_id: 'J1', version: 1, question_kind: 'factual_value', wording_ref: 'J1', options: ['us', 'not_sure'], display_condition: { kind: 'always' }, approval: APPROVAL }],
      observation_map: [{ o_id: 'O-J1-us', version: 1, q_id: 'J1', q_version: 1, applies_to: { kind: 'option', value: 'us' }, observation_kind: 'declared_value', target: { kind: 'guidance_place', place: 'United States' }, value_mapping_version: 'M', approval: APPROVAL }],
    } as never)
    expect(r).toEqual({ ok: false, errors: [expect.stringContaining("target kind 'guidance_place' is not mappable")] })
  })

  test('no ledger entry in either bundle names a copyright claim, and none uses requirements_met', () => {
    for (const b of [CREATOR_RECORD_GOVERNANCE_AUTHORITY, CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY!]) {
      expect(b.publication_ledger.filter((e) => [COPY004, ...US_CLAIMS, TW, CN].includes(e.claim_id))).toEqual([])
      expect(b.publication_ledger.filter((e) => e.applicability_policy === 'requirements_met')).toEqual([])
    }
  })
})
