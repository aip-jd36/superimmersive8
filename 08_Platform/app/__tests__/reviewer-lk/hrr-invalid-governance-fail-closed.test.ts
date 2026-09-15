/**
 * Permanent regression: invalid governed applicability must fail closed
 * through the REAL reviewer/HRR chain (Generic Shallow Applicability --
 * Reviewer/HRR Fail-Closed Completion milestone, 2026-09-15; ADR-001-
 * generic-applicability-architecture.md §K.3).
 *
 * Reproduces, through the real, non-mocked production chain
 * (`selectReviewerClaims` -> `runHrrResearch`'s applicability partition ->
 * `reviewerClaimToBiResult` -> `buildBoundedInterpretations`), the exact
 * blocker found during fresh-main revalidation: before this fix, an invalid
 * `applicability_any_of` produced `applicability_established: false` +
 * `applicability_outcomes: []` on the reviewer claim, which
 * `reviewerClaimToBiResult` (deriving its own conclusion from
 * `outcomes.filter(unresolved).length > 0`, never reading
 * `applicability_established`) silently read as `{status: 'established'}`
 * -- the strongest possible applicability conclusion -- for governance that
 * could not actually be evaluated.
 *
 * The fix withholds an invalid-governance claim in `selectReviewerClaims`
 * itself (reason `'invalid_governed_applicability'`, the same `withheld[]`
 * mechanism every other reviewer-ineligibility reason already uses) -- it
 * never becomes a `ReviewerLkClaim`, so `runHrrResearch`'s partition and
 * `reviewerClaimToBiResult` never see it at all. This test proves that
 * end to end, without mocking the partition.
 */

import { runHrrResearch, topicSelectionGateResult, type RunHrrResearchInput } from '@/lib/hrr/run-hrr-research'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'
import type { TopicClaim, ApplicabilityRequirement } from '@/lib/retrieval-engine/types'

function claim(overrides: Partial<TopicClaim>): TopicClaim {
  return {
    claim_id: 'CLAIM-INVALID-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope prose',
    crc_candidate_statement: 'This governed statement must never be presented as unconditionally applicable.',
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

/** Empty outer array -- INVALID per ADR-001 §K.2. */
const INVALID_ANY_OF: ApplicabilityRequirement[][] = []

describe('selectReviewerClaims -- invalid governed applicability withheld before ReviewerLkClaim construction', () => {
  test('an invalid claim is withheld with reason invalid_governed_applicability, never appears in claims[]', () => {
    const invalidClaim = claim({ applicability_any_of: INVALID_ANY_OF })
    const { claims, withheld } = selectReviewerClaims({
      topic: 'commercial_use',
      topicClaims: [invalidClaim],
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: ctx().applicabilityFacts,
    })
    expect(claims).toEqual([])
    expect(withheld).toEqual([{ claim_id: 'CLAIM-INVALID-001-v1', reason: 'invalid_governed_applicability' }])
  })

  test('a valid sibling claim on the same topic is still surfaced normally alongside a withheld invalid one', () => {
    const validClaim = claim({ claim_id: 'CLAIM-VALID-001-v1' })
    const invalidClaim = claim({ claim_id: 'CLAIM-INVALID-001-v1', applicability_any_of: INVALID_ANY_OF })
    const { claims, withheld } = selectReviewerClaims({
      topic: 'commercial_use',
      topicClaims: [validClaim, invalidClaim],
      assetProviderIds: [],
      activeToolIds: [],
      applicabilityFacts: ctx().applicabilityFacts,
    })
    expect(claims.map((c) => c.claim_id)).toEqual(['CLAIM-VALID-001-v1'])
    expect(claims[0].applicability_established).toBe(true)
    expect(withheld).toEqual([{ claim_id: 'CLAIM-INVALID-001-v1', reason: 'invalid_governed_applicability' }])
  })
})

describe('runHrrResearch -- end-to-end: invalid governance never reaches established/directly_relevant', () => {
  const runInput = (over: Partial<RunHrrResearchInput>): RunHrrResearchInput => ({
    gate: topicSelectionGateResult('commercial_use'),
    reviewerContext: ctx(),
    topicClaims: [],
    ...over,
  })

  test('THE EXACT REPRODUCED BLOCKER: a topic with only an invalid-governance claim never yields bi_status directly_relevant, never established applicability', () => {
    const invalidClaim = claim({ applicability_any_of: INVALID_ANY_OF })
    const res = runHrrResearch(runInput({ topicClaims: [invalidClaim] }))
    const t = res.per_topic[0]

    // Never fed to BI at all -- mirrors the existing not_met precedent
    // exactly ("no claim reached BI; NOT relevant_applicability_unresolved,
    // NOT a finding").
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.bi_status).not.toBe('directly_relevant')

    // Never in governed_claims (never reached reviewerClaimToBiResult at all).
    expect(t.governed_claims).toEqual([])

    // Never in does_not_apply either -- that bucket means "provably not_met",
    // a DIFFERENT, semantically distinct condition from "governance itself
    // is malformed" (per this milestone's own explicit non-goal: do not
    // equate invalid governance with valid-expression NOT_MET).
    expect(t.does_not_apply).toEqual([])

    // Withheld, with the distinct, honest reason -- never silently dropped,
    // never presented as a negative finding about the claim's substance.
    expect(t.withheld).toEqual([{ claim_id: 'CLAIM-INVALID-001-v1', reason: 'invalid_governed_applicability' }])

    // No supporting claim id, no summary content derived from the invalid claim.
    expect(t.supporting_claim_ids).toEqual([])
  })

  test('no material unresolved dependency and no ordinary project-unresolved representation is created for the invalid claim', () => {
    const invalidClaim = claim({ applicability_any_of: INVALID_ANY_OF })
    const res = runHrrResearch(runInput({ topicClaims: [invalidClaim] }))
    const t = res.per_topic[0]
    expect(t.unresolved_relevant_claims).toEqual([])
  })

  test('valid MET regression: an ordinary fully-met claim is unaffected -- reaches BI, established, directly_relevant', () => {
    const validClaim = claim({ claim_id: 'CLAIM-MET-001-v1' })
    const res = runHrrResearch(runInput({ topicClaims: [validClaim] }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('directly_relevant')
    expect(t.governed_claims.map((c) => c.claim_id)).toEqual(['CLAIM-MET-001-v1'])
    expect(t.does_not_apply).toEqual([])
    expect(t.withheld).toEqual([])
  })

  test('valid NOT_MET regression: an ordinary provably-inapplicable claim is unaffected -- excluded, does_not_apply, outside_current_coverage, never withheld', () => {
    const notMetClaim = claim({ claim_id: 'CLAIM-NOTMET-001-v1', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    const res = runHrrResearch(
      runInput({
        topicClaims: [notMetClaim],
        reviewerContext: ctx({ applicabilityFacts: { jurisdiction: { included: [], excluded: ['United States'] }, toolMentions: [] } }),
      }),
    )
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('outside_current_coverage')
    expect(t.governed_claims).toEqual([])
    expect(t.does_not_apply.map((c) => c.claim_id)).toEqual(['CLAIM-NOTMET-001-v1'])
    expect(t.withheld).toEqual([])
  })

  test('valid UNRESOLVED regression: an ordinary unresolved claim is unaffected -- fed to BI, relevant_applicability_unresolved, never withheld, never does_not_apply', () => {
    const unresolvedClaim = claim({ claim_id: 'CLAIM-UNRESOLVED-001-v1', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    const res = runHrrResearch(runInput({ topicClaims: [unresolvedClaim] }))
    const t = res.per_topic[0]
    expect(t.bi_status).toBe('relevant_applicability_unresolved')
    expect(t.governed_claims.map((c) => c.claim_id)).toEqual(['CLAIM-UNRESOLVED-001-v1'])
    expect(t.does_not_apply).toEqual([])
    expect(t.withheld).toEqual([])
  })
})
