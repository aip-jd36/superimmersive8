/**
 * CAH-4E §16.B / §16.C — reviewer selector behavior.
 *
 *  - a representative pair: Adopted + Reviewer/Commercial Assurance +
 *    crc_eligible Pending/No  ->  reviewer VISIBLE  (CRC-invisibility proven in crc-regression.test.ts);
 *  - generic predicates (provider/tool scope, applicability) are reused, not reimplemented;
 *  - unresolved applicability stays unresolved and the claim is STILL surfaced
 *    (never withheld, never reinterpreted as a negative finding);
 *  - provider-scoped knowledge does NOT broaden when the provider identity is unresolved.
 */

import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

const NO_FACTS: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

function base(overrides: Partial<TopicClaim>): TopicClaim {
  return {
    claim_id: 'CLAIM-X-001-v1',
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
    last_verified: '2026-09-01',
    superseded_by: null,
    ...overrides,
  }
}

describe('representative pair — reviewer-eligible, CRC-pending/no', () => {
  const reviewerOnlyPending = base({ claim_id: 'CLAIM-RVW-PENDING-v1', crc_eligible: 'Pending' })
  const reviewerOnlyNo = base({ claim_id: 'CLAIM-RVW-NO-v1', crc_eligible: 'No' })
  const set = [reviewerOnlyPending, reviewerOnlyNo]

  test('reviewer selector SURFACES both (crc_eligible not consulted)', () => {
    const { claims } = selectReviewerClaims({
      topic: 'commercial_use',
      topicClaims: set,
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: NO_FACTS,
    })
    expect(claims.map((c) => c.claim_id).sort()).toEqual(['CLAIM-RVW-NO-v1', 'CLAIM-RVW-PENDING-v1'])
    expect(claims.every((c) => c.publication_scope === 'Reviewer/Commercial Assurance')).toBe(true)
  })

  test('CRC lookupTopicClaims (unchanged) EXCLUDES both — the same claims, opposite consumer', () => {
    const goals = [
      { goal_id: 'g1', raw_text: 'commercial use', category: 'commercial_use', scope: 'informational', state: 'confirmed', superseded_by: null, source_turn: 1, source_statement: 'commercial use' } as any,
    ]
    const { matches } = lookupTopicClaims(goals, set, NO_FACTS)
    expect(matches).toEqual([])
  })
})

describe('withheld reasons are reported (topic-matched but not reviewer-eligible)', () => {
  test('Internal/research + Candidate + superseded are each reported with a bounded reason, content never exposed', () => {
    const set: TopicClaim[] = [
      base({ claim_id: 'CLAIM-INTERNAL-v1', publication_scope: 'Internal/research' }),
      base({ claim_id: 'CLAIM-CANDIDATE-v1', lifecycle: 'Candidate' }),
      base({ claim_id: 'CLAIM-OLD-v1', superseded_by: 'CLAIM-OLD-v2', lifecycle: 'Deprecated' }),
      base({ claim_id: 'CLAIM-NOSCOPE-v1', publication_scope: undefined }),
    ]
    const { claims, withheld } = selectReviewerClaims({
      topic: 'commercial_use', topicClaims: set, assetProviderIds: [], activeToolIds: [], applicabilityFacts: NO_FACTS,
    })
    expect(claims).toEqual([])
    expect(withheld).toEqual([
      { claim_id: 'CLAIM-CANDIDATE-v1', reason: 'not_adopted' },
      { claim_id: 'CLAIM-INTERNAL-v1', reason: 'publication_scope_not_reviewer_eligible' },
      { claim_id: 'CLAIM-NOSCOPE-v1', reason: 'publication_scope_missing_or_unknown' },
      { claim_id: 'CLAIM-OLD-v1', reason: 'superseded' },
    ])
    expect(JSON.stringify(withheld)).not.toMatch(/a governed statement|scope prose/)
  })
})

describe('applicability — surfaced, shown, never withheld or reinterpreted (§10)', () => {
  const usClaim = base({
    claim_id: 'CLAIM-US-v1',
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
  })

  test('jurisdiction unresolved -> claim STILL surfaced, applicability_established=false, requirement status "unresolved"', () => {
    const { claims } = selectReviewerClaims({
      topic: 'commercial_use', topicClaims: [usClaim], assetProviderIds: [], activeToolIds: [], applicabilityFacts: NO_FACTS,
    })
    expect(claims).toHaveLength(1)
    expect(claims[0].applicability_established).toBe(false)
    expect(claims[0].applicability_outcomes).toEqual([
      { requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' },
    ])
  })

  test('jurisdiction matches -> applicability_established=true, status "met"', () => {
    const { claims } = selectReviewerClaims({
      topic: 'commercial_use', topicClaims: [usClaim], assetProviderIds: [], activeToolIds: [],
      applicabilityFacts: { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] },
    })
    expect(claims[0].applicability_established).toBe(true)
    expect(claims[0].applicability_outcomes[0].status).toBe('met')
  })
})

describe('provider / tool scope — fail closed on unresolved identity (§11)', () => {
  const gettyClaim = base({ claim_id: 'CLAIM-GETTY-v1', topic: 'third_party_source_rights', provider_scope: ['getty'] })
  const klingClaim = base({ claim_id: 'CLAIM-KLING-v1', tool_scope: ['kling'] })

  test('provider-scoped claim does NOT surface when no provider identity is resolved', () => {
    const { claims } = selectReviewerClaims({
      topic: 'third_party_source_rights', topicClaims: [gettyClaim], assetProviderIds: [], activeToolIds: [], applicabilityFacts: NO_FACTS,
    })
    expect(claims).toEqual([])
  })

  test('provider-scoped claim surfaces only when its exact provider is resolved (never broadened)', () => {
    const yes = selectReviewerClaims({
      topic: 'third_party_source_rights', topicClaims: [gettyClaim], assetProviderIds: ['getty'], activeToolIds: [], applicabilityFacts: NO_FACTS,
    })
    const wrong = selectReviewerClaims({
      topic: 'third_party_source_rights', topicClaims: [gettyClaim], assetProviderIds: ['shutterstock'], activeToolIds: [], applicabilityFacts: NO_FACTS,
    })
    expect(yes.claims.map((c) => c.claim_id)).toEqual(['CLAIM-GETTY-v1'])
    expect(wrong.claims).toEqual([])
  })

  test('tool-scoped claim does NOT surface when the tool is not among resolved tool ids', () => {
    const { claims } = selectReviewerClaims({
      topic: 'commercial_use', topicClaims: [klingClaim], assetProviderIds: [], activeToolIds: [], applicabilityFacts: NO_FACTS,
    })
    expect(claims).toEqual([])
  })

  test('tool-scoped claim surfaces when its tool IS resolved', () => {
    const { claims } = selectReviewerClaims({
      topic: 'commercial_use', topicClaims: [klingClaim], assetProviderIds: [], activeToolIds: ['kling'], applicabilityFacts: NO_FACTS,
    })
    expect(claims.map((c) => c.claim_id)).toEqual(['CLAIM-KLING-v1'])
  })
})
