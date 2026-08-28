/**
 * CRC Generic Applicability Readiness milestone (2026-08-24). Deterministic
 * tests for `deriveApplicabilityReadinessGaps` -- the Retrieval-owned
 * primitive exposing governed applicability gaps across BOTH TopicClaim and
 * MatrixClaim sources, usable before an interview completes. No live model
 * needed -- pure functions, same discipline as retrieve.test.ts.
 */

import { deriveApplicabilityReadinessGaps } from '@/lib/retrieval-engine/applicability-readiness'
import type { MatrixRow, TopicClaim } from '@/lib/retrieval-engine/types'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

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

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'category'>): UserGoal {
  return { goal_id: 'g-1', state: 'confirmed', raw_text: 'x', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x', ...overrides }
}

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
}

function matrixRow(overrides: Partial<MatrixRow> & Pick<MatrixRow, 'identifier'>): MatrixRow {
  return { last_verified: '2026-08-24', claims: [], ...overrides }
}

describe('deriveApplicabilityReadinessGaps -- Matrix-origin gaps', () => {
  test('A: eligible Matrix claim, topic matches an active explicit goal, unresolved requirement -> gap reported', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [goal({ category: 'commercial_use' })], [], facts())
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toEqual({
      identifier: 'commercial_use',
      reason: 'applicability_unmet',
      unmet_applicability: [{ claim_id: 'kling', requirement: { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }, status: 'unresolved' }],
    })
  })

  test('B: topic does NOT match any active explicit goal -> no gap, even though the claim is otherwise eligible and unresolved (explicit-goal-only policy, applied generically)', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    // No goals at all.
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [], [], facts())
    expect(gaps).toEqual([])
  })

  test('C: mixed unresolved + not_met on the same Matrix claim -> both appear, raw and unsuppressed (suppression is selector-questioning\'s own job, not readiness\'s)', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [
            { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
            { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
          ],
        },
      ],
    })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    // Assessment-Jurisdiction Mention Model (2026-08-28): a genuine not_met
    // now requires an EXPLICIT exclusion, not merely a different included
    // value.
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [goal({ category: 'commercial_use' })], [], facts({ jurisdiction: { included: [], excluded: ['United States'] } }))
    expect(gaps).toHaveLength(1)
    expect(gaps[0].unmet_applicability).toEqual([
      { claim_id: 'kling', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'not_met' },
      { claim_id: 'kling', requirement: { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }, status: 'unresolved' },
    ])
  })

  test('D: fully-met Matrix claim -> no gap', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    function tm(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
      return { access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: 'x', superseded_by: null, ...overrides }
    }
    const mention = tm({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'paid' } })
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [goal({ category: 'commercial_use' })], [], facts({ toolMentions: [mention] }))
    expect(gaps).toEqual([])
  })

  test('a CRC-Eligible: No Matrix claim never contributes a gap', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'No',
          crc_publication_scope: null,
          crc_candidate_statement: null,
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [goal({ category: 'commercial_use' })], [], facts())
    expect(gaps).toEqual([])
  })
})

describe('deriveApplicabilityReadinessGaps -- TopicClaim-origin gaps, provider-scope parity', () => {
  function providerScopedClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id'>): TopicClaim {
    return {
      topic: 'third_party_source_rights',
      claim_character: 'conditional',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'scope',
      crc_candidate_statement: 'statement',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: [],
      provider_scope: ['istock'],
      last_verified: null,
      superseded_by: null,
      ...overrides,
    }
  }

  test('E: provider-scoped claim + matching canonical provider in handoff.asset_providers + explicit goal + unresolved requirement -> gap visible', () => {
    const claim = providerScopedClaim({ claim_id: 'CLAIM-ISTOCK-1' })
    const h = handoff({ asset_providers: ['istock'] })
    const gaps = deriveApplicabilityReadinessGaps(h, [], [goal({ category: 'third_party_source_rights' })], [claim], facts())
    expect(gaps).toHaveLength(1)
    expect(gaps[0].identifier).toBe('third_party_source_rights')
    expect(gaps[0].unmet_applicability).toEqual([{ claim_id: 'CLAIM-ISTOCK-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }])
  })

  test('F: same claim, no matching canonical provider in handoff.asset_providers -> no gap (claim never even a candidate, exact parity with final Retrieval)', () => {
    const claim = providerScopedClaim({ claim_id: 'CLAIM-ISTOCK-1' })
    const h = handoff({ asset_providers: [] })
    const gaps = deriveApplicabilityReadinessGaps(h, [], [goal({ category: 'third_party_source_rights' })], [claim], facts())
    expect(gaps).toEqual([])
  })

  test('a DIFFERENT canonical provider in handoff.asset_providers does not satisfy a claim scoped to another provider', () => {
    const claim = providerScopedClaim({ claim_id: 'CLAIM-ISTOCK-1', provider_scope: ['istock'] })
    const h = handoff({ asset_providers: ['getty'] })
    const gaps = deriveApplicabilityReadinessGaps(h, [], [goal({ category: 'third_party_source_rights' })], [claim], facts())
    expect(gaps).toEqual([])
  })

  test('a generic (provider_scope: null) claim is unaffected by handoff.asset_providers -- always a candidate', () => {
    const claim = providerScopedClaim({ claim_id: 'CLAIM-GENERIC-1', provider_scope: null })
    const h = handoff({ asset_providers: [] })
    const gaps = deriveApplicabilityReadinessGaps(h, [], [goal({ category: 'third_party_source_rights' })], [claim], facts())
    expect(gaps).toHaveLength(1)
  })
})

describe('deriveApplicabilityReadinessGaps -- combined Matrix + Topic', () => {
  test('G: a Matrix-origin gap and a Topic-origin gap in the same call both appear together', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    const topicClaim: TopicClaim = {
      claim_id: 'CLAIM-COPY-TEST',
      topic: 'copyright_ownership',
      claim_character: 'conditional',
      jurisdiction: 'United States',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'scope',
      crc_candidate_statement: 'statement',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: null,
      superseded_by: null,
    }
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [goal({ category: 'commercial_use' }), goal({ goal_id: 'g-2', category: 'copyright_ownership' })], [topicClaim], facts())
    expect(gaps.map((g) => g.identifier).sort()).toEqual(['commercial_use', 'copyright_ownership'])
  })

  test('H: a duplicate resolved tool mention for the same canonical tool does not produce a duplicate gap entry', () => {
    const row = matrixRow({
      identifier: 'kling',
      claims: [
        {
          claim_id: 'kling',
          crc_eligible: 'Yes',
          crc_publication_scope: 'scope',
          crc_candidate_statement: 'statement',
          topic: 'commercial_use',
          applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' }],
        },
      ],
    })
    // Two handoff tool entries resolving to the same canonical identifier.
    const h = handoff({
      tools: [
        { identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' },
        { identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' },
      ],
    })
    const gaps = deriveApplicabilityReadinessGaps(h, [row], [goal({ category: 'commercial_use' })], [], facts())
    expect(gaps).toHaveLength(1)
  })
})
