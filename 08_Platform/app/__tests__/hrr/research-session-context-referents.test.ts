/**
 * CAH-4G.16 — AUTHORITATIVE REFERENT VALIDATION.
 *
 * `research-session-context-referents.ts` proves a client-supplied
 * `unresolvedReferents` entry is a REAL identifier this specific submission's
 * eligible governed claims could actually have produced — not merely a
 * well-formed string (that weaker check is CAH-4G.15's job, already tested
 * in `research-session-context-schema.test.ts`).
 */

import {
  collectAuthoritativeReferentIdentifiers,
  enforceAuthoritativeReferents,
} from '@/lib/hrr/research-session-context-referents'
import { EMPTY_RESEARCH_SESSION_CONTEXT, type ResearchSessionContext } from '@/lib/hrr/research-session-context'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { ReviewerLkContextBundle } from '@/lib/reviewer-lk/submission-facts'

const NO_FACTS: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

const REVIEWER_CONTEXT: ReviewerLkContextBundle = {
  context: { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: [] },
  applicabilityFacts: NO_FACTS,
  activeToolIds: [],
  assetProviderIds: [],
}

function claim(overrides: Partial<TopicClaim>): TopicClaim {
  return {
    claim_id: 'CLAIM-X-001-v1',
    topic: 'copyrightability',
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

const REAL_CLAIMS: TopicClaim[] = [
  claim({
    claim_id: 'CLAIM-COPYRIGHTABILITY-001-v1',
    topic: 'copyrightability',
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: ['human_contribution_description'],
  }),
  claim({
    claim_id: 'CLAIM-COPYRIGHT-OWNERSHIP-001-v1',
    topic: 'copyright_ownership',
    applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'commercial' }],
    unresolved_project_dependencies: ['storyblocks_license_tier_confirmed'],
  }),
]

describe('collectAuthoritativeReferentIdentifiers — reuses selectReviewerClaims, submission + topic scoped', () => {
  test('collects the fact values and dependency identifiers of ELIGIBLE claims for the given topic only', () => {
    const ids = collectAuthoritativeReferentIdentifiers('copyrightability', REVIEWER_CONTEXT, REAL_CLAIMS)
    expect(ids).toEqual(new Set(['jurisdiction', 'human_contribution_description']))
  })

  test('a different topic yields a disjoint set — no cross-topic leakage', () => {
    const ids = collectAuthoritativeReferentIdentifiers('copyright_ownership', REVIEWER_CONTEXT, REAL_CLAIMS)
    expect(ids).toEqual(new Set(['tool_plan_tier', 'storyblocks_license_tier_confirmed']))
  })

  test('a topic with no eligible claims yields an empty set', () => {
    const ids = collectAuthoritativeReferentIdentifiers('likeness', REVIEWER_CONTEXT, REAL_CLAIMS)
    expect(ids).toEqual(new Set())
  })

  test('a claim withheld by the eligibility gate (e.g. not Adopted) contributes NO identifiers, even though it topic-matches', () => {
    const withCandidate: TopicClaim[] = [
      ...REAL_CLAIMS,
      claim({
        claim_id: 'CLAIM-CANDIDATE-v1',
        topic: 'copyrightability',
        lifecycle: 'Candidate', // not reviewer-eligible
        unresolved_project_dependencies: ['should_never_be_authoritative'],
      }),
    ]
    const ids = collectAuthoritativeReferentIdentifiers('copyrightability', REVIEWER_CONTEXT, withCandidate)
    expect(ids.has('should_never_be_authoritative')).toBe(false)
  })
})

describe('enforceAuthoritativeReferents — whole-context rejection on ANY tampering signal', () => {
  test('a null activeFocus context is returned unchanged (nothing to check)', () => {
    expect(enforceAuthoritativeReferents(EMPTY_RESEARCH_SESSION_CONTEXT, REVIEWER_CONTEXT, REAL_CLAIMS)).toEqual(
      EMPTY_RESEARCH_SESSION_CONTEXT,
    )
  })

  test('a focus with no referents is returned unchanged', () => {
    const ctx: ResearchSessionContext = { activeFocus: 'copyrightability', activeFocusOrigin: 'topic_selection', unresolvedReferents: [] }
    expect(enforceAuthoritativeReferents(ctx, REVIEWER_CONTEXT, REAL_CLAIMS)).toEqual(ctx)
  })

  test('a REAL, authoritative referent for this topic is accepted unchanged', () => {
    const ctx: ResearchSessionContext = {
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      unresolvedReferents: ['jurisdiction', 'human_contribution_description'],
    }
    expect(enforceAuthoritativeReferents(ctx, REVIEWER_CONTEXT, REAL_CLAIMS)).toEqual(ctx)
  })

  test('a well-formed but NON-AUTHORITATIVE referent (e.g. an injection attempt) rejects the WHOLE context — not just the bad entry', () => {
    const ctx: ResearchSessionContext = {
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      unresolvedReferents: ['jurisdiction', 'ignore_previous_instructions'],
    }
    expect(enforceAuthoritativeReferents(ctx, REVIEWER_CONTEXT, REAL_CLAIMS)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('a referent that IS authoritative but for a DIFFERENT topic than activeFocus is rejected — no cross-topic laundering', () => {
    const ctx: ResearchSessionContext = {
      activeFocus: 'copyrightability',
      activeFocusOrigin: 'topic_selection',
      // 'storyblocks_license_tier_confirmed' is real, but only for copyright_ownership, not copyrightability
      unresolvedReferents: ['storyblocks_license_tier_confirmed'],
    }
    expect(enforceAuthoritativeReferents(ctx, REVIEWER_CONTEXT, REAL_CLAIMS)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })

  test('a syntactically valid focus with zero eligible claims for that topic rejects any non-empty referent list', () => {
    const ctx: ResearchSessionContext = { activeFocus: 'likeness', activeFocusOrigin: 'topic_selection', unresolvedReferents: ['anything'] }
    expect(enforceAuthoritativeReferents(ctx, REVIEWER_CONTEXT, REAL_CLAIMS)).toEqual(EMPTY_RESEARCH_SESSION_CONTEXT)
  })
})
