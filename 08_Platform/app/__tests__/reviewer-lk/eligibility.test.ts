/**
 * CAH-4E §16.A — reviewer claim eligibility governance.
 *
 * The reviewer eligibility boundary is derived from lifecycle +
 * publication_scope + supersession ONLY. `crc_eligible` (Yes/No/Pending) MUST
 * NOT determine it. Fail closed for missing / unknown / malformed scope.
 */

import { evaluateReviewerEligibility, isReviewerEligible, isReviewerEligiblePublicationScope } from '@/lib/reviewer-lk/eligibility'
import type { CrcEligible, Lifecycle, PublicationScope, TopicClaim } from '@/lib/retrieval-engine/types'

function claim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'CLAIM-TEST-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope prose',
    crc_candidate_statement: 'statement',
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

describe('evaluateReviewerEligibility', () => {
  test('Adopted + Reviewer/Commercial Assurance -> eligible', () => {
    expect(evaluateReviewerEligibility(claim())).toEqual({ eligible: true })
  })

  test('Adopted + CRC eligible (as a publication_scope value) -> eligible', () => {
    expect(isReviewerEligible(claim({ publication_scope: 'CRC eligible' }))).toBe(true)
  })

  test('Adopted + Public SI8 position -> eligible', () => {
    expect(isReviewerEligible(claim({ publication_scope: 'Public SI8 position' }))).toBe(true)
  })

  test('Adopted + Internal/research only -> withheld (publication_scope_not_reviewer_eligible)', () => {
    expect(evaluateReviewerEligibility(claim({ publication_scope: 'Internal/research' }))).toEqual({
      eligible: false,
      reason: 'publication_scope_not_reviewer_eligible',
    })
  })

  test.each(['Candidate', 'Under Review', 'Deprecated'] as Lifecycle[])('lifecycle %s -> withheld (not_adopted)', (lifecycle) => {
    expect(evaluateReviewerEligibility(claim({ lifecycle }))).toEqual({ eligible: false, reason: 'not_adopted' })
  })

  test('superseded claim -> withheld (superseded), even if Adopted + reviewer-scoped', () => {
    expect(evaluateReviewerEligibility(claim({ superseded_by: 'CLAIM-TEST-001-v2', lifecycle: 'Deprecated' }))).toEqual({
      eligible: false,
      reason: 'superseded',
    })
  })

  test('missing publication_scope (undefined) -> withheld (publication_scope_missing_or_unknown)', () => {
    expect(evaluateReviewerEligibility(claim({ publication_scope: undefined }))).toEqual({
      eligible: false,
      reason: 'publication_scope_missing_or_unknown',
    })
  })

  test('unknown / malformed publication_scope string -> withheld (publication_scope_missing_or_unknown)', () => {
    const bad = claim({ publication_scope: 'Reviewer' as unknown as PublicationScope })
    expect(evaluateReviewerEligibility(bad)).toEqual({ eligible: false, reason: 'publication_scope_missing_or_unknown' })
  })

  test.each(['Yes', 'No', 'Pending'] as CrcEligible[])(
    'crc_eligible = %s does NOT determine reviewer eligibility (Adopted + reviewer-scoped stays eligible)',
    (crc_eligible) => {
      expect(isReviewerEligible(claim({ crc_eligible }))).toBe(true)
    },
  )

  test('crc_eligible = No cannot RESCUE an Internal/research claim', () => {
    // even a "safe" crc_eligible value never overrides the publication_scope gate
    expect(isReviewerEligible(claim({ crc_eligible: 'No', publication_scope: 'Internal/research' }))).toBe(false)
  })
})

describe('isReviewerEligiblePublicationScope', () => {
  test('recognizes the three reviewer-permitted scopes', () => {
    expect(isReviewerEligiblePublicationScope('Reviewer/Commercial Assurance')).toBe(true)
    expect(isReviewerEligiblePublicationScope('CRC eligible')).toBe(true)
    expect(isReviewerEligiblePublicationScope('Public SI8 position')).toBe(true)
  })
  test('rejects Internal/research, undefined, null, and arbitrary strings', () => {
    expect(isReviewerEligiblePublicationScope('Internal/research')).toBe(false)
    expect(isReviewerEligiblePublicationScope(undefined)).toBe(false)
    expect(isReviewerEligiblePublicationScope(null)).toBe(false)
    expect(isReviewerEligiblePublicationScope('anything')).toBe(false)
  })
})
