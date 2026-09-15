/**
 * End-to-end invalid-governed-applicability boundary tests (ADR-001 §K.3;
 * Generic Shallow Applicability -- Runtime Foundation milestone, Phase 11's
 * own HARD TEST). Proves, across every real consumer, that invalid
 * governed `applicability_any_of` (a defense-in-depth condition -- every
 * production claim's own field is validated or absent by construction):
 *
 *   - is excluded from `matches[]`/retrieval results, exactly like a
 *     settled `not_met` claim;
 *   - is reported under a diagnostic reason distinct from
 *     `applicability_unmet` (`applicability_invalid_governance`), never
 *     mixed into ordinary per-requirement detail;
 *   - never reaches `deriveApplicabilityReadinessGaps`'s own Track-B-facing
 *     gap list;
 *   - never produces a `SelectorNeed`/Track B question candidate, end to
 *     end, through the real (non-mocked) `deriveApplicabilityReadinessGaps`
 *     composition `deriveSelectorNeeds` itself uses.
 */

import { lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { deriveApplicabilityReadinessGaps } from '@/lib/retrieval-engine/applicability-readiness'
import { deriveSelectorNeeds } from '@/lib/crc-engine/selector-questioning'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { ApplicabilityRequirement, MatrixRow, TopicClaim } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'category'>): UserGoal {
  return { goal_id: 'g-1', state: 'confirmed', raw_text: 'x', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x', ...overrides }
}

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Scope text.',
    crc_candidate_statement: 'Candidate statement.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-09-15',
    superseded_by: null,
    ...overrides,
  }
}

/** Empty outer array -- INVALID per ADR-001 §K.2 -- used as the canonical defense-in-depth malformed value throughout this file. */
const INVALID_ANY_OF: ApplicabilityRequirement[][] = []

describe('invalid governed applicability -- lookupTopicClaims boundary', () => {
  test('an invalid claim is excluded from matches[] and reported under applicability_invalid_governance, never applicability_unmet', () => {
    const g = goal({ category: 'commercial_use' })
    const invalidClaim = claim({ claim_id: 'INVALID', topic: 'commercial_use', applicability_any_of: INVALID_ANY_OF })
    const result = lookupTopicClaims([g], [invalidClaim], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'applicability_invalid_governance' }])
  })

  test('an invalid claim never carries unmet_applicability', () => {
    const g = goal({ category: 'commercial_use' })
    const invalidClaim = claim({ claim_id: 'INVALID', topic: 'commercial_use', applicability_any_of: INVALID_ANY_OF })
    const result = lookupTopicClaims([g], [invalidClaim], facts())
    expect(result.diagnostics[0].unmet_applicability).toBeUndefined()
  })

  test('a valid sibling claim in the same category still matches normally alongside an invalid one', () => {
    const g = goal({ category: 'commercial_use' })
    const valid = claim({ claim_id: 'VALID', topic: 'commercial_use' })
    const invalidClaim = claim({ claim_id: 'INVALID', topic: 'commercial_use', applicability_any_of: INVALID_ANY_OF })
    const result = lookupTopicClaims([g], [valid, invalidClaim], facts())
    expect(result.matches).toEqual([valid])
    expect(result.diagnostics).toContainEqual({ identifier: 'commercial_use', reason: 'applicability_invalid_governance' })
  })
})

describe('invalid governed applicability -- retrieve() Matrix path boundary', () => {
  function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
    return {
      tools: [],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
      ...overrides,
    }
  }

  test('an invalid Matrix claim is excluded from results and reported under applicability_invalid_governance', () => {
    const matrix: MatrixRow[] = [
      {
        identifier: 'test-tool',
        last_verified: '2026-09-15',
        claims: [
          {
            claim_id: 'test-tool-invalid',
            crc_eligible: 'Yes',
            crc_publication_scope: 'scope',
            crc_candidate_statement: 'statement',
            topic: 'commercial_use',
            applicability_requirements: [],
            applicability_any_of: INVALID_ANY_OF,
          },
        ],
      },
    ]
    const out = retrieve(handoff({ tools: [{ identifier: 'test-tool', access_surface: 'unresolved', plan_tier: 'unknown' }] }), matrix)
    expect(out.results).toEqual([])
    expect(out.diagnostics).toContainEqual({ identifier: 'commercial_use', reason: 'applicability_invalid_governance' })
    expect(out.diagnostics.some((d) => d.reason === 'applicability_unmet')).toBe(false)
  })
})

describe('invalid governed applicability -- Track B HARD TEST (Phase 11): creates NO question candidate, end to end', () => {
  test('deriveApplicabilityReadinessGaps produces zero gaps for an invalid TopicClaim', () => {
    const handoff: RetrievalHandoff = {
      tools: [],
      unresolved_aliases: [],
      asset_providers: [],
      unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved',
      intended_use: 'unclear',
      scoped_observations: [],
      certainty_state: 'gate_1_unmet',
      exclusions: [],
    }
    const invalidClaim = claim({ claim_id: 'INVALID', topic: 'commercial_use', applicability_any_of: INVALID_ANY_OF })
    const gaps = deriveApplicabilityReadinessGaps(handoff, [], [goal({ category: 'commercial_use' })], [invalidClaim], facts())
    expect(gaps).toEqual([])
  })

  test('deriveSelectorNeeds (the real, non-mocked Track B composition) produces zero SelectorNeed for an invalid claim -- no fabricated question, no side channel', () => {
    const invalidClaim = claim({ claim_id: 'INVALID', topic: 'commercial_use', applicability_any_of: INVALID_ANY_OF })
    const su: StructuredUnderstanding = {
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
      tool_mentions: [],
      scoped_observations: [],
      user_goals: [goal({ category: 'commercial_use' })],
      asset_provider_mentions: [],
      assessment_jurisdiction_mentions: [],
      content_presence_mentions: [],
      distribution_territory_mentions: [],
      organization_location_mentions: [],
      current_phase: 2,
      gate_1_state: 'not_met',
      gate_2_state: 'not_yet_stable',
      completion_reason: null,
      opt_out_scope: null,
    }
    const needs = deriveSelectorNeeds(su, [], [invalidClaim], createInitialBoundaryState())
    expect(needs).toEqual([])
  })
})
