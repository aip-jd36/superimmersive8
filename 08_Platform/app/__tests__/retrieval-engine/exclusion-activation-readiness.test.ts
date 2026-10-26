/**
 * LK-EXCLUSION-ACTIVATION-READINESS-1 — generic safety gaps closed before any
 * governed claim carries `applicability_exclusions` (ADR-001 §L.9).
 * Synthetic claims only; no governed claim is modified.
 */

import { buildProductionFacts } from '@/lib/production-review/build-production-facts'
import { runProductionReview } from '@/lib/production-review/run-production-review'
import { checkTopicClaimRepresentationReadiness } from '@/lib/representation-readiness/topic-claim-readiness'
import {
  findGovernedValueCollisions,
  governedToolFactValues,
  matchGovernedValue,
  type WithheldToolFact,
} from '@/lib/retrieval-engine/governed-applicability-values'
import { evaluateClaimApplicability, exclusionGateBlocks, lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { lookupRelatedTopicClaims } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { ApplicabilityExclusion, MatrixClaim, MatrixRow, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

// ── Synthetic helpers ──
const TOOL = 'runway-gen3' // real canonical id; every claim below is synthetic
const ENT: ApplicabilityExclusion = { fact: 'tool_plan_tier', tool: TOOL, value: 'Enterprise' }

function claim(over: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'CLAIM-SYN-ACT-EXCL-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: null,
    crc_candidate_statement: 'SYN statement: commercial use is permitted on non-Enterprise plans.',
    publication_scope: 'Reviewer/Commercial Assurance',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: [TOOL],
    last_verified: '2026-09-01',
    superseded_by: null,
    applicability_exclusions: [ENT],
    ...over,
  }
}
const X = claim()
const PLAN_CLAIM = claim({
  claim_id: 'CLAIM-SYN-ACT-PLAN-v1',
  applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'SynPro' }],
  applicability_exclusions: undefined,
})

let seq = 0
function mention(plan: string | null, tool = TOOL): ToolMention {
  seq += 1
  return {
    mention_id: `m${seq}`,
    resolution: { kind: 'canonical', identifier: tool },
    access_surface: { state: 'unknown' },
    plan_tier: plan === null ? { state: 'unknown' } : { state: 'confirmed', value: plan },
    account_status: { state: 'unknown' },
    confidence: 'unknown',
    source_turn: 1,
    source_statement: 'synthetic',
    superseded_by: null,
  }
}
const crcFacts = (...plans: (string | null)[]): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: plans.map((p) => mention(p)) })
const goal = (category: string) => ({ goal_id: 'g1', raw_text: 'Can I use this commercially?', category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1 }) as unknown as UserGoal

/** One normalized outcome per consumer: is the synthetic exclusion claim covered, excluded, or held unresolved? */
type Verdict = 'covered' | 'excluded' | 'unresolved'

function crcVerdict(claims: TopicClaim[], plans: (string | null)[], id = X.claim_id): Verdict {
  const f = crcFacts(...plans)
  if (lookupTopicClaims([goal('commercial_use')], claims, f, [], [], [TOOL]).matches.some((c) => c.claim_id === id)) return 'covered'
  const r = evaluateClaimApplicability(claims.find((c) => c.claim_id === id)!, f)
  return r.valid && r.status === 'not_met' ? 'excluded' : 'unresolved'
}
function reviewerVerdict(claims: TopicClaim[], f: ApplicabilityFacts, id = X.claim_id): Verdict {
  const c = selectReviewerClaims({ topic: 'commercial_use', topicClaims: claims, assetProviderIds: [], activeToolIds: [TOOL], applicabilityFacts: f }).claims.find((x) => x.claim_id === id)!
  return c.applicability_status === 'met' ? 'covered' : c.applicability_status === 'not_met' ? 'excluded' : 'unresolved'
}
function productAVerdict(claims: TopicClaim[], plans: (string | null)[], id = X.claim_id): Verdict {
  const r = runProductionReview({ tools_used: plans.map((p) => ({ tool_name: 'Runway', ...(p === null ? {} : { plan_type: p }) })), territory_preferences: null, third_party_assets: null, audio_disclosure: null }, claims)
  const f = r.topics.find((t) => t.topic === 'commercial_use')!.findings.find((x) => x.claim_id === id)!
  return f.applicability === 'applies' ? 'covered' : f.applicability === 'does_not_apply_on_declared_facts' ? 'excluded' : 'unresolved'
}
// Creator Record verdicts for the same cases live in
// __tests__/creator-record/applicability-exclusions-creator-record.test.ts (LK-GOV-CORRECTION-1C).

// ── Task 1: the shared canonicalization contract ──
describe('shared governed-value contract', () => {
  const governed = new Set(['Standard', 'Pro', 'Fancy'])
  test.each([
    ['Pro', { kind: 'canonical', value: 'Pro', exact: true }],
    ['pro', { kind: 'canonical', value: 'Pro', exact: false }],
    ['  PRO \t', { kind: 'canonical', value: 'Pro', exact: false }],
    ['Ｐｒｏ', { kind: 'canonical', value: 'Pro', exact: false }],
    ['Pro plan', { kind: 'not_governed' }],
    ['Professional', { kind: 'not_governed' }],
    ['paid', { kind: 'not_governed' }],
    ['', { kind: 'not_governed' }],
  ])('%p → %p', (declared, expected) => expect(matchGovernedValue(declared, governed)).toEqual(expected))

  test('no governed vocabulary → never governed', () => expect(matchGovernedValue('Pro', undefined)).toEqual({ kind: 'not_governed' }))
  test('colliding governed spellings → ambiguous, never confirmed', () =>
    expect(matchGovernedValue('enterprise', new Set(['Enterprise', 'ENTERPRISE']))).toEqual({ kind: 'ambiguous', candidates: ['Enterprise', 'ENTERPRISE'] }))

  test('the governed vocabulary is requirements + any_of + exclusions, per fact and tool', () => {
    const c = claim({
      applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'A' }],
      applicability_any_of: [[{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'B' }]],
      applicability_exclusions: [ENT, { fact: 'tool_account_status', tool: TOOL, value: 'Suspended' }],
    })
    expect(Array.from(governedToolFactValues([c], 'tool_plan_tier').get(TOOL)!)).toEqual(['A', 'B', 'Enterprise'])
    expect(Array.from(governedToolFactValues([c], 'tool_account_status').get(TOOL)!)).toEqual(['Suspended'])
  })

  test('the current governed corpus has no colliding spellings', () => expect(findGovernedValueCollisions(TOPIC_CLAIMS_FIXTURE)).toEqual([]))
  test('a collision across claims is reported', () =>
    expect(findGovernedValueCollisions([X, claim({ claim_id: 'B', applicability_exclusions: undefined, applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: ' enterprise' }] })])).toEqual([
      { fact: 'tool_plan_tier', tool: TOOL, normalized: 'enterprise', values: ['Enterprise', ' enterprise'] },
    ]))

  test('declarations are preserved verbatim; only the canonical value reaches applicability', () => {
    const b = buildProductionFacts({ tools_used: [{ tool_name: 'Runway', plan_type: ' ENTERPRISE ' }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, [X])
    expect(b.facts.tools[0]).toMatchObject({ declared_plan: 'ENTERPRISE', plan_relation: 'matches_governed_value', governed_plan_value: 'Enterprise' })
    expect(b.applicabilityFacts.toolMentions[0].plan_tier).toEqual({ state: 'confirmed', value: 'Enterprise' })
    expect(b.applicabilityFacts.toolMentions[0].source_statement).toBe('Runway')
  })
})

// ── Task 4: equivalent behaviour across CRC, reviewer and Product A (Creator Record: see note above) ──
describe('cross-consumer equivalence (one claim, CRC / reviewer / Product A; Creator Record in __tests__/creator-record)', () => {
  test.each([
    [['Enterprise'], 'excluded'],
    [['enterprise'], 'excluded'],
    [['  ENTERPRISE  '], 'excluded'],
    [['Ｅｎｔｅｒｐｒｉｓｅ'], 'excluded'],
    [['Enterprise plan'], 'covered'], // no alias inference; vacuous applicability, exactly as before
    [['Pro'], 'covered'],
    [[null], 'covered'], // unknown plan: not excluded, not established by the exclusion
    [['Pro', 'Enterprise'], 'unresolved'], // conflict → confirmation withheld → never covered, never excluded
    [['Enterprise', 'enterprise'], 'excluded'], // agreeing declarations are not a conflict
  ] as const)('declared %p → %s in every consumer', (plans, expected) => {
    const ps = plans as unknown as (string | null)[]
    const verdicts = {
      crc: crcVerdict([X], ps),
      reviewer: reviewerVerdict([X], crcFacts(...ps)),
      product_a: productAVerdict([X], ps),
    }
    expect(verdicts).toEqual({ crc: expected, reviewer: expected, product_a: expected })
  })

  test('declaration-based consumers: a non-governed conflicting value still blocks coverage (Pro plan + Enterprise)', () => {
    expect(productAVerdict([X], ['Pro plan', 'Enterprise'])).toBe('unresolved')
  })

  test('conflicting declarations never satisfy a positive requirement (SynPro + Team)', () => {
    const claims = [PLAN_CLAIM]
    expect(productAVerdict(claims, ['SynPro'], PLAN_CLAIM.claim_id)).toBe('covered')
    expect(productAVerdict(claims, ['synpro'], PLAN_CLAIM.claim_id)).toBe('covered')
    expect(productAVerdict(claims, ['SynPro', 'Team'], PLAN_CLAIM.claim_id)).toBe('unresolved')
    expect(productAVerdict(claims, ['Team', 'SynPro'], PLAN_CLAIM.claim_id)).toBe('unresolved') // order-independent
    const b = buildProductionFacts({ tools_used: [{ tool_name: 'Runway', plan_type: 'SynPro' }, { tool_name: 'Runway', plan_type: 'Team' }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, claims)
    expect(b.facts.tools.map((t) => t.plan_relation)).toEqual(['withheld_conflicting_declarations', 'withheld_conflicting_declarations'])
    expect(b.applicabilityFacts.toolMentions.every((m) => m.plan_tier.state === 'unknown')).toBe(true)
  })

  test('ambiguous governed vocabulary: declaration withheld, exclusion indeterminate, claim held unresolved', () => {
    const colliding = [X, claim({ claim_id: 'CLAIM-SYN-ACT-COLLIDE-v1', applicability_exclusions: undefined, applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'ENTERPRISE' }] })]
    const b = buildProductionFacts({ tools_used: [{ tool_name: 'Runway', plan_type: 'enterprise' }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, colliding)
    expect(b.facts.tools[0].plan_relation).toBe('withheld_ambiguous_governed_value')
    expect(b.applicabilityFacts.toolMentions[0].plan_tier).toEqual({ state: 'unknown' })
    expect(b.applicabilityFacts.withheldToolFacts).toEqual([{ mention_id: 'production-review:tool:0', tool: TOOL, fact: 'tool_plan_tier', value: 'enterprise', reason: 'ambiguous_governed_value' }])
    expect(productAVerdict(colliding, ['enterprise'])).toBe('unresolved')
  })

  test('the reviewer projection explains an indeterminate exclusion; the diagnostic carries the withheld facts', () => {
    const f = crcFacts('Pro', 'Enterprise')
    const c = selectReviewerClaims({ topic: 'commercial_use', topicClaims: [X], assetProviderIds: [], activeToolIds: [TOOL], applicabilityFacts: f }).claims[0]
    expect(c.applicability_established).toBe(false)
    expect(c.applicability_exclusion_outcomes!.map((o) => o.result)).toEqual(['indeterminate_conflicting_values'])
    const pa = buildProductionFacts({ tools_used: [{ tool_name: 'Runway', plan_type: 'Pro' }, { tool_name: 'Runway', plan_type: 'Enterprise' }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, [X])
    const r = evaluateClaimApplicability(X, pa.applicabilityFacts)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.exclusion_outcomes[0]).toMatchObject({
      result: 'indeterminate_conflicting_values',
      confirmed_facts: [],
      withheld_facts: [{ mention_id: 'production-review:tool:1', value: 'Enterprise', reason: 'conflicting_declarations' }],
    })
  })
})

// ── No positive applicability inference ──
describe('no positive inference', () => {
  const withheld: WithheldToolFact[] = [{ mention_id: 'w', tool: TOOL, fact: 'tool_plan_tier', value: 'SynPro', reason: 'conflicting_declarations' }]
  test('withheld facts never satisfy a requirement', () => {
    const r = evaluateClaimApplicability(PLAN_CLAIM, { jurisdiction: { included: [], excluded: [] }, toolMentions: [mention(null)], withheldToolFacts: withheld })
    expect(r.valid && r.status).toBe('unresolved')
  })
  test('indeterminate never upgrades: unresolved and not_met stay as they are', () => {
    const both = claim({ applicability_requirements: PLAN_CLAIM.applicability_requirements })
    const f = (p: string) => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: [mention(p)], withheldToolFacts: [{ ...withheld[0], value: 'Enterprise' }] }) as ApplicabilityFacts
    for (const [p, expected] of [['Team', 'not_met'], ['SynPro', 'unresolved']] as const) {
      const r = evaluateClaimApplicability(both, f(p))
      expect(r.valid && r.status).toBe(expected)
    }
  })
  test('claims without exclusions: withheld facts change nothing, for every governed claim and fact state', () => {
    for (const c of TOPIC_CLAIMS_FIXTURE) {
      for (const plans of [[null], ['Pro'], ['Standard', 'Pro']]) {
        const base = crcFacts(...plans)
        const withW: ApplicabilityFacts = { ...base, withheldToolFacts: [{ mention_id: 'w', tool: 'pika', fact: 'tool_plan_tier', value: 'Pro', reason: 'conflicting_declarations' }] }
        expect(evaluateClaimApplicability(c, withW)).toEqual(evaluateClaimApplicability(c, base))
      }
    }
  })
  test('exact governed declarations produce byte-identical facts to the previous exact-match rule', () => {
    for (const plan of ['Standard', 'Pro', 'Fancy']) {
      const b = buildProductionFacts({ tools_used: [{ tool_name: 'Pika', plan_type: plan }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, TOPIC_CLAIMS_FIXTURE)
      expect(b.applicabilityFacts).toEqual({
        jurisdiction: { included: [], excluded: [] },
        toolMentions: [expect.objectContaining({ plan_tier: { state: 'confirmed', value: plan }, account_status: { state: 'unknown' } })],
      })
    }
  })
})

// ── Task 2: governance readiness validation ──
describe('representation readiness recognizes applicability_exclusions', () => {
  const codes = (c: TopicClaim) => checkTopicClaimRepresentationReadiness(c).issues.map((i) => [i.code, i.path])
  const withX = (x: unknown) => claim({ applicability_exclusions: x as ApplicabilityExclusion[] })
  test('a valid exclusion is ready; absent is ready', () => {
    expect(checkTopicClaimRepresentationReadiness(X)).toEqual({ ready: true, issues: [] })
    expect(checkTopicClaimRepresentationReadiness(claim({ applicability_exclusions: undefined })).ready).toBe(true)
  })
  test.each([
    ['not an array', { fact: 'tool_plan_tier' }, [['invalid_applicability_exclusions', 'applicability_exclusions']]],
    ['empty array', [], [['invalid_applicability_exclusions', 'applicability_exclusions']]],
    ['non-object', ['Enterprise'], [['malformed_applicability_exclusion', 'applicability_exclusions[0]']]],
    ['non-string value', [{ fact: 'tool_plan_tier', tool: TOOL, value: 3 }], [['malformed_applicability_exclusion', 'applicability_exclusions[0]']]],
    ['jurisdiction', [{ fact: 'jurisdiction', tool: TOOL, value: 'US' }], [['unsupported_applicability_exclusion_fact', 'applicability_exclusions[0].fact']]],
    ['unknown fact', [{ fact: 'tool_region', tool: TOOL, value: 'EU' }], [['unsupported_applicability_exclusion_fact', 'applicability_exclusions[0].fact']]],
    ['missing tool', [{ fact: 'tool_plan_tier', value: 'Enterprise' }], [['missing_applicability_exclusion_tool_reference', 'applicability_exclusions[0].tool']]],
    ['blank tool', [{ fact: 'tool_plan_tier', tool: ' ', value: 'Enterprise' }], [['missing_applicability_exclusion_tool_reference', 'applicability_exclusions[0].tool']]],
    ['non-canonical tool', [{ fact: 'tool_plan_tier', tool: 'Runway', value: 'Enterprise' }], [['invalid_applicability_exclusion_tool_reference', 'applicability_exclusions[0].tool']]],
    ['blank value', [{ fact: 'tool_plan_tier', tool: TOOL, value: ' \t ' }], [['blank_applicability_exclusion_value', 'applicability_exclusions[0].value']]],
    ['duplicate (normalized)', [ENT, { ...ENT, value: 'enterprise ' }], [['duplicate_applicability_exclusion', 'applicability_exclusions[1]']]],
  ])('%s', (_n, x, expected) => {
    expect(codes(withX(x))).toEqual(expected)
    expect(checkTopicClaimRepresentationReadiness(withX(x)).ready).toBe(false)
  })
  test('self-contradiction: excluding the value a mandatory equals requirement demands', () => {
    const c = claim({ applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'Enterprise' }] })
    expect(codes(c)).toEqual([['contradictory_applicability_exclusion', 'applicability_exclusions[0]']])
  })
  test('readiness and the runtime gate agree: every readiness-invalid structure is runtime-invalid', () => {
    for (const x of [{ fact: 'tool_plan_tier' }, [], ['x'], [{ fact: 'jurisdiction', tool: TOOL, value: 'US' }], [{ fact: 'tool_plan_tier', value: 'E' }], [{ fact: 'tool_plan_tier', tool: TOOL, value: '' }]]) {
      expect(evaluateClaimApplicability(withX(x), crcFacts('Pro')).valid).toBe(false)
    }
  })
  test('every governed claim passes the exclusion checks', () => {
    for (const c of TOPIC_CLAIMS_FIXTURE) {
      expect(checkTopicClaimRepresentationReadiness(c).issues.filter((i) => i.code.includes('exclusion'))).toEqual([])
    }
  })
})

// ── Task 3: Matrix and relationship coverage ──
describe('Matrix path', () => {
  const handoff = { tools: [{ identifier: TOOL, access_surface: 'unresolved', plan_tier: 'unknown' }], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [] } as unknown as RetrievalHandoff
  const row = (x: unknown): MatrixRow => ({
    identifier: TOOL,
    last_verified: '2026-10-01',
    claims: [{ claim_id: 'syn-matrix', crc_eligible: 'Yes', crc_publication_scope: 'syn', crc_candidate_statement: 'SYN matrix statement.', topic: 'commercial_use', applicability_requirements: [], ...(x === undefined ? {} : { applicability_exclusions: x }) } as MatrixClaim],
  })
  const ids = (m: MatrixRow, f: ApplicabilityFacts) => retrieve(handoff, [m], [], [], f).results.map((r) => r.claim_id)

  test('the Matrix path runs the same exclusion-aware evaluator (enforced even though MatrixClaim cannot author the field)', () => {
    expect(ids(row(undefined), crcFacts('Enterprise'))).toEqual(['syn-matrix'])
    expect(ids(row([ENT]), crcFacts('Enterprise'))).toEqual([])
    expect(ids(row([ENT]), crcFacts('Pro', 'Enterprise'))).toEqual([])
    expect(ids(row([ENT]), crcFacts('Pro'))).toEqual(['syn-matrix'])
    expect(ids(row([]), crcFacts('Pro'))).toEqual([])
  })

  test('no CRC-eligible Matrix claim duplicates a tool+topic that a TopicClaim governs with exclusions', () => {
    const bypasses = (topicClaims: TopicClaim[], matrix: MatrixRow[]) =>
      topicClaims
        .filter((c) => c.applicability_exclusions !== undefined)
        .flatMap((c) =>
          (c.applicability_exclusions ?? []).flatMap((x) =>
            matrix.filter((r) => r.identifier === x.tool).flatMap((r) => r.claims.filter((m) => m.crc_eligible === 'Yes' && m.topic === c.topic).map((m) => `${c.claim_id} ~ ${m.claim_id}`)),
          ),
        )
    expect(bypasses(TOPIC_CLAIMS_FIXTURE, MATRIX_FIXTURE)).toEqual([])
    // The check is live: a synthetic eligible Matrix claim on the same tool+topic is reported.
    expect(bypasses([X], [row(undefined)])).toEqual([`${X.claim_id} ~ syn-matrix`])
    // The two activation targets' tools have no CRC-eligible Matrix claim today.
    for (const tool of ['runway-gen3', 'higgsfield']) {
      expect(MATRIX_FIXTURE.filter((r) => r.identifier === tool).flatMap((r) => r.claims.filter((m) => m.crc_eligible === 'Yes'))).toEqual([])
    }
  })
})

describe('relationship path', () => {
  const rel: TopicRelationship = {
    relationship_id: 'REL-SYN-ACT-v1', source_topic: 'copyright_ownership', target_topic: 'commercial_use', relationship_type: 'relevant_consideration', rationale: 'syn',
    lifecycle: 'Adopted', adoption_approver: 'SYN', adoption_decision_date: '2026-10-01', publication_scope: 'Reviewer/Commercial Assurance', crc_eligible: 'Yes', crc_approver: 'SYN', crc_decision_date: '2026-10-01', last_reviewed: '2026-10-01', superseded_by: null,
  }
  const related = (c: TopicClaim, f: ApplicabilityFacts) => lookupRelatedTopicClaims([goal('copyright_ownership')], [rel], [c], f).matches.map((m) => m.claim.claim_id)

  test('exclusions are enforced (triggered and indeterminate block), independent of the path’s any_of handling', () => {
    expect(related(X, crcFacts('Enterprise'))).toEqual([])
    expect(related(X, crcFacts('Pro', 'Enterprise'))).toEqual([])
    expect(related(X, { ...crcFacts('Pro'), withheldToolFacts: [{ mention_id: 'w', tool: TOOL, fact: 'tool_plan_tier', value: 'Enterprise', reason: 'conflicting_declarations' }] })).toEqual([])
    expect(related(X, crcFacts('Pro'))).toEqual([X.claim_id])
    // A claim whose any_of the legacy path ignores is STILL blocked by its triggered exclusion.
    const anyOf = claim({ applicability_any_of: [[{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'SynPro' }]] })
    expect(related(anyOf, crcFacts('Enterprise'))).toEqual([])
    expect(exclusionGateBlocks(anyOf, crcFacts('Enterprise'))).toBe(true)
  })

  test('pre-existing difference, unchanged and recorded: the relationship path ignores any_of when no exclusion fires', () => {
    const anyOf = claim({ applicability_exclusions: undefined, applicability_any_of: [[{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'SynPro' }]] })
    expect(related(anyOf, crcFacts(null))).toEqual([anyOf.claim_id]) // the topic path would hold this unresolved
    const topicPath = evaluateClaimApplicability(anyOf, crcFacts(null))
    expect(topicPath.valid && topicPath.status).toBe('unresolved')
    // No governed claim uses any_of, so the difference is unreachable today.
    expect(TOPIC_CLAIMS_FIXTURE.filter((c) => c.applicability_any_of !== undefined)).toEqual([])
  })
})
