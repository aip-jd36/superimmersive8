/**
 * Reviewer Aggregate Authority Completion milestone (2026-09-15;
 * ADR-001-generic-applicability-architecture.md §K). Permanent regression:
 * for a VALID applicability expression, the reviewer/HRR chain must use the
 * SAME authoritative aggregate `evaluateApplicabilityExpression` computes --
 * never a whole-claim reconstruction from raw leaf outcomes
 * (`.some(status==='not_met')`, `.filter(status==='unresolved')`).
 *
 * Reproduces, through the REAL, non-mocked production chain
 * (`selectReviewerClaims` -> `runHrrResearch`'s `claimDoesNotApply`
 * partition -> `reviewerClaimToBiResult` -> `buildBoundedInterpretations`),
 * the exact defect found in the prior milestone's own risk note: a claim
 * whose true aggregate is UNRESOLVED (e.g. `A not_met OR B unresolved`) was
 * being misclassified `does_not_apply` because a whole-leaf-scanning
 * predicate treated ANY not_met leaf, anywhere, as proof the whole claim
 * does not apply.
 */

import { runHrrResearch, topicSelectionGateResult, type RunHrrResearchInput } from '@/lib/hrr/run-hrr-research'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type { TopicClaim, ApplicabilityRequirement } from '@/lib/retrieval-engine/types'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ToolMention } from '@/types/interview-engine'

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id'>): TopicClaim {
  return {
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope prose',
    crc_candidate_statement: 'a governed statement',
    publication_scope: 'Reviewer/Commercial Assurance',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-09-15',
    superseded_by: null,
    ...overrides,
  }
}

function ctx(overrides: Partial<ReviewerLkContextBundle> = {}): ReviewerLkContextBundle {
  return {
    context: { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: [] },
    applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    activeToolIds: [],
    assetProviderIds: [],
    ...overrides,
  }
}

const runInput = (over: Partial<RunHrrResearchInput>): RunHrrResearchInput => ({
  gate: topicSelectionGateResult('commercial_use'),
  reviewerContext: ctx(),
  topicClaims: [],
  ...over,
})

/** One synthetic leaf requirement + the ToolMention needed to drive it to the desired status -- same construction as evaluate-applicability-expression.test.ts's own `leaf` helper. */
function leaf(id: string, status: 'met' | 'not_met' | 'unresolved'): { requirement: ApplicabilityRequirement; mention: ToolMention | null } {
  const requirement: ApplicabilityRequirement = { fact: 'tool_account_status', tool: id, operator: 'equals', value: 'Member Account' }
  if (status === 'unresolved') return { requirement, mention: null }
  const mention: ToolMention = {
    mention_id: `m-${id}`,
    resolution: { kind: 'canonical', identifier: id },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'confirmed', value: status === 'met' ? 'Member Account' : 'Regular Account' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `${id} account status`,
    superseded_by: null,
  }
  return { requirement, mention }
}

function mergeFacts(...leaves: ReturnType<typeof leaf>[]): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: leaves.map((l) => l.mention).filter((m): m is ToolMention => m !== null) }
}

describe('runHrrResearch -- valid-aggregate HRR acceptance matrix (Phase 6)', () => {
  test('CASE 1: A met OR B unresolved => aggregate MET -- NOT does_not_apply, existing MET/directly_relevant policy, B does not reopen applicability', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const c = claim({ claim_id: 'C-1', applicability_any_of: [[A.requirement], [B.requirement]] })
    const res = runHrrResearch(runInput({ topicClaims: [c], reviewerContext: ctx({ applicabilityFacts: mergeFacts(A, B) }) }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('directly_relevant')
    expect(t.governed_claims.map((x) => x.claim_id)).toEqual(['C-1'])
    expect(t.does_not_apply).toEqual([])
    expect(t.withheld).toEqual([])
  })

  test('CASE 2: A not_met OR B unresolved => aggregate UNRESOLVED -- NOT does_not_apply, unresolved/hedged policy, B is the material unresolved dependency', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'unresolved')
    const c = claim({ claim_id: 'C-1', applicability_any_of: [[A.requirement], [B.requirement]] })
    const res = runHrrResearch(runInput({ topicClaims: [c], reviewerContext: ctx({ applicabilityFacts: mergeFacts(A, B) }) }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    expect(t.governed_claims.map((x) => x.claim_id)).toEqual(['C-1'])
    expect(t.governed_claims[0].applicability_status).toBe('unresolved')
    expect(t.governed_claims[0].applicability_material_unresolved).toEqual([B.requirement])
    expect(t.does_not_apply).toEqual([])
    expect(t.withheld).toEqual([])
  })

  test('CASE 3: A not_met OR B not_met => aggregate NOT_MET -- does_not_apply per existing valid-NOT_MET policy', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'not_met')
    const c = claim({ claim_id: 'C-1', applicability_any_of: [[A.requirement], [B.requirement]] })
    const res = runHrrResearch(runInput({ topicClaims: [c], reviewerContext: ctx({ applicabilityFacts: mergeFacts(A, B) }) }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.governed_claims).toEqual([])
    expect(t.does_not_apply.map((x) => x.claim_id)).toEqual(['C-1'])
    expect(t.withheld).toEqual([])
  })

  test('CASE 4: (A met AND B unresolved) OR C not_met => aggregate UNRESOLVED -- NOT does_not_apply, B material', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const c = claim({ claim_id: 'C-1', applicability_any_of: [[A.requirement, B.requirement], [C.requirement]] })
    const res = runHrrResearch(runInput({ topicClaims: [c], reviewerContext: ctx({ applicabilityFacts: mergeFacts(A, B, C) }) }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    expect(t.governed_claims.map((x) => x.claim_id)).toEqual(['C-1'])
    expect(t.governed_claims[0].applicability_material_unresolved).toEqual([B.requirement])
    expect(t.does_not_apply).toEqual([])
  })

  test('CASE 5: (A not_met AND B unresolved) OR C not_met => aggregate NOT_MET -- does_not_apply, B non-material', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const c = claim({ claim_id: 'C-1', applicability_any_of: [[A.requirement, B.requirement], [C.requirement]] })
    const res = runHrrResearch(runInput({ topicClaims: [c], reviewerContext: ctx({ applicabilityFacts: mergeFacts(A, B, C) }) }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.governed_claims).toEqual([])
    expect(t.does_not_apply.map((x) => x.claim_id)).toEqual(['C-1'])
  })

  test('CASE 6: applicability_any_of absent, existing flat NOT_MET => existing reviewer/HRR behavior byte-identical', () => {
    const req: ApplicabilityRequirement = { fact: 'jurisdiction', operator: 'equals', value: 'United States' }
    const c = claim({ claim_id: 'C-1', applicability_requirements: [req] })
    const res = runHrrResearch(runInput({ topicClaims: [c], reviewerContext: ctx({ applicabilityFacts: { jurisdiction: { included: [], excluded: ['United States'] }, toolMentions: [] } }) }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.does_not_apply.map((x) => x.claim_id)).toEqual(['C-1'])
    expect(t.does_not_apply[0].applicability_status).toBe('not_met')
  })

  test('CASE 7: applicability_any_of absent, existing flat UNRESOLVED => existing reviewer/HRR unresolved behavior byte-identical', () => {
    const req: ApplicabilityRequirement = { fact: 'jurisdiction', operator: 'equals', value: 'United States' }
    const c = claim({ claim_id: 'C-1', applicability_requirements: [req] })
    const res = runHrrResearch(runInput({ topicClaims: [c] }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    expect(t.governed_claims.map((x) => x.claim_id)).toEqual(['C-1'])
    expect(t.governed_claims[0].applicability_status).toBe('unresolved')
    expect(t.governed_claims[0].applicability_material_unresolved).toEqual([req])
  })

  test('CASE 8: invalid governance => withheld invalid_governed_applicability before ReviewerLkClaim, never reaches the normal HRR applicability partition', () => {
    const c = claim({ claim_id: 'C-1', applicability_any_of: [] })
    const res = runHrrResearch(runInput({ topicClaims: [c] }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.governed_claims).toEqual([])
    expect(t.does_not_apply).toEqual([])
    expect(t.withheld).toEqual([{ claim_id: 'C-1', reason: 'invalid_governed_applicability' }])
  })
})
