/**
 * Topic claim lookup + applicability evaluator deterministic tests (CRC
 * Living Knowledge Phase 1, 2026-08-16). No live model needed -- pure
 * functions, same discipline as retrieve.test.ts.
 */

import { isApplicable, lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import type { ToolMention, UserGoal } from '@/types/interview-engine'

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'category'>): UserGoal {
  return {
    state: 'confirmed',
    raw_text: 'placeholder',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
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
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { state: 'unknown' }, toolMentions: [], ...overrides }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

describe('isApplicable', () => {
  test('empty requirements list is vacuously applicable', () => {
    expect(isApplicable([], facts())).toBe(true)
  })

  test('jurisdiction requirement met when confirmed and equal', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { state: 'confirmed', value: 'United States' } }))).toBe(true)
  })

  test('jurisdiction requirement unmet when confirmed but different value', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { state: 'confirmed', value: 'Taiwan' } }))).toBe(false)
  })

  test('jurisdiction requirement unmet when unknown -- never guessed', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { state: 'unknown' } }))).toBe(false)
  })

  test('jurisdiction requirement unmet when declined', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { state: 'declined' } }))).toBe(false)
  })

  test('not_equals operator', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'not_equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { state: 'confirmed', value: 'Taiwan' } }))).toBe(true)
    expect(isApplicable(req, facts({ jurisdiction: { state: 'confirmed', value: 'United States' } }))).toBe(false)
  })

  test('tool_plan_tier requirement met for the specific tool', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' } })
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(true)
  })

  test('tool_plan_tier requirement unmet when the mention is for a different tool', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'free' } })
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(false)
  })

  test('tool_plan_tier requirement unmet when a superseded mention is the only match', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' }, superseded_by: 'm2' })
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(false)
  })

  test('multiple requirements: ALL must pass (deterministic .every(), no partial credit)', () => {
    const req: ApplicabilityRequirement[] = [
      { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
      { fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' },
    ]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' } })
    expect(isApplicable(req, facts({ jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [tm] }))).toBe(true)
    expect(isApplicable(req, facts({ jurisdiction: { state: 'unknown' }, toolMentions: [tm] }))).toBe(false)
  })
})

describe('lookupTopicClaims -- goal filtering', () => {
  test('empty goals -> empty matches', () => {
    expect(lookupTopicClaims([], [claim({ claim_id: 'C-1', topic: 'commercial_use' })], facts())).toEqual({ matches: [], diagnostics: [] })
  })

  test('a superseded goal is never looked up', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership', superseded_by: 'g-2' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    expect(lookupTopicClaims([g], [c], facts()).matches).toEqual([])
  })

  test('a declined goal is never looked up', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership', state: 'declined' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    expect(lookupTopicClaims([g], [c], facts()).matches).toEqual([])
  })
})

describe('lookupTopicClaims -- topic matching + eligibility gates', () => {
  test('no claim for the goal category -> no_topic_claim diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const result = lookupTopicClaims([g], [claim({ claim_id: 'C-1', topic: 'likeness' })], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'no_topic_claim' }])
  })

  test('a Candidate-lifecycle claim is excluded -- not_adopted_or_eligible diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership', lifecycle: 'Candidate' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'not_adopted_or_eligible' }])
  })

  test('an Adopted but CRC-Eligible: No claim is excluded (reviewer-only) -- not_adopted_or_eligible diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership', lifecycle: 'Adopted', crc_eligible: 'No' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'not_adopted_or_eligible' }])
  })

  test('Adopted + CRC-Eligible but a superseded (non-current) version is excluded', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1-v1', topic: 'copyright_ownership', superseded_by: 'C-1-v2' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([])
  })

  test('Adopted + CRC-Eligible + applicable -> matches', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([c])
    expect(result.diagnostics).toEqual([])
  })

  test('Adopted + CRC-Eligible but applicability unmet -> applicability_unmet diagnostic, not a fabricated match', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { state: 'unknown' } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'applicability_unmet' }])
  })

  test('applicability met -> the claim surfaces', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { state: 'confirmed', value: 'United States' } }))
    expect(result.matches).toEqual([c])
  })

  test('wrong jurisdiction -> unmet, not a fabricated match (US-only claim, Taiwan confirmed)', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { state: 'confirmed', value: 'Taiwan' } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'applicability_unmet' }])
  })

  test('an unsettled + CRC-eligible + applicable claim surfaces just like an established one -- character is descriptive, not a gate', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership', claim_character: 'unsettled' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([c])
  })

  test('two distinct goal categories each independently resolved in one call', () => {
    const g1 = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const g2 = goal({ goal_id: 'g-2', category: 'likeness' })
    const c1 = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    const result = lookupTopicClaims([g1, g2], [c1], facts())
    expect(result.matches).toEqual([c1])
    expect(result.diagnostics).toEqual([{ identifier: 'likeness', reason: 'no_topic_claim' }])
  })

  test('no duplicate matches when the same claim_id would otherwise be counted twice', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    const result = lookupTopicClaims([g], [c, c], facts())
    expect(result.matches).toHaveLength(1)
  })
})
