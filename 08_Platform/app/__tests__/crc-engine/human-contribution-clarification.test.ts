/**
 * Human-contribution clarification eligibility deterministic tests
 * (Copyright UAT Correction Milestone, 2026-08-19, PM-approved H3/H6). No
 * live model needed -- pure functions, same discipline as
 * jurisdiction-clarification.test.ts, which this file mirrors closely.
 */

import {
  evaluateHumanContributionClarificationEligibility,
  buildHumanContributionClarificationProposal,
  HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION,
} from '@/lib/crc-engine/human-contribution-clarification'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { ScopedObservation, StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

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

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function observation(overrides: Partial<ScopedObservation> & Pick<ScopedObservation, 'observation_id'>): ScopedObservation {
  return {
    scope: 'current_project',
    workflow_stage: null,
    confidence: 'confirmed',
    status: null,
    note: 'placeholder',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

function contributionGatedClaim(
  overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'> = { claim_id: 'C-1', topic: 'copyright_ownership' },
): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'United States',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope',
    crc_candidate_statement: 'statement',
    applicability_requirements: [],
    unresolved_project_dependencies: ['human_contribution_description'],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

const copyOwnershipGoal = goal({ goal_id: 'g-1', category: 'copyright_ownership' })

describe('evaluateHumanContributionClarificationEligibility -- core relevance/state gates', () => {
  test('eligible when a relevant goal + governed dependency exists, description unconfirmed, and a minimal workflow anchor exists', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.needs_human_contribution).toBe(true)
    expect(result.human_contribution_unresolved).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('not eligible when no active goal needs the human-contribution dependency', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim({ claim_id: 'C-1', topic: 'copyright_ownership' })], false)
    expect(result.needs_human_contribution).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when no matched claim carries the human_contribution_description dependency', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const claimWithoutDependency: TopicClaim = { ...contributionGatedClaim(), unresolved_project_dependencies: [] }
    const result = evaluateHumanContributionClarificationEligibility(su, [claimWithoutDependency], false)
    expect(result.needs_human_contribution).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible once human_contribution_description is confirmed -- do not re-ask a known fact', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'confirmed', value: 'I only wrote prompts.' }, source_turn: 2, source_statement: 'I only wrote prompts.' },
      },
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.human_contribution_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible once declined -- do not keep pestering after a decline', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'declined' }, source_turn: 2, source_statement: 'skip' },
      },
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.human_contribution_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when already asked this conversation -- once-per-interview cap', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], true)
    expect(result.eligible).toBe(false)
  })

  test('a claim with no eligible/adopted version never triggers eligibility', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const overridesList: Partial<TopicClaim>[] = [{ lifecycle: 'Candidate' }, { crc_eligible: 'No' }, { superseded_by: 'C-2' }]
    for (const overrides of overridesList) {
      const result = evaluateHumanContributionClarificationEligibility(su, [{ ...contributionGatedClaim(), ...overrides }], false)
      expect(result.eligible).toBe(false)
    }
  })
})

describe('evaluateHumanContributionClarificationEligibility -- Gate-1 independence + minimal workflow anchor (Section 23 scenarios)', () => {
  // A: copyright goal + no tool/production engagement at all -> not yet eligible
  test('A: no minimal workflow anchor (no tool mention, no observation) -> not eligible even though the goal/claim relevance holds', () => {
    const su = baseSU({ user_goals: [copyOwnershipGoal] })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.needs_human_contribution).toBe(true)
    expect(result.eligible).toBe(false)
  })

  // B: copyright goal + Kling mention (any resolution kind) -> eligible
  test('B: an unresolved_alias tool mention (e.g. "Kling AI" before normalization) still counts as a minimal workflow anchor -> eligible', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'unresolved_alias', raw_name: 'Kling AI' }, confidence: 'unresolved_no_visibility' })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.eligible).toBe(true)
  })

  // C: copyright goal + confirmed production observation but no tool -> eligible if hasEngagedWorkflowTopic semantics support that
  test('C: a confirmed scoped_observation with no tool mention at all still counts as a minimal workflow anchor -> eligible', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'confirmed' })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.eligible).toBe(true)
  })

  test('C2: an unconfirmed (unknown/declined) scoped_observation does NOT count as engagement -- not eligible', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'unknown' })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.eligible).toBe(false)
  })

  // D: unrelated goal -> not eligible
  test('D: unrelated goal category, even with a tool mention present -> not eligible', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim({ claim_id: 'C-1', topic: 'copyright_ownership' })], false)
    expect(result.eligible).toBe(false)
  })

  test('Gate 1 explicitly not_met never blocks eligibility -- no gate1Met parameter exists on this function at all', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      gate_1_state: 'not_met',
    })
    const result = evaluateHumanContributionClarificationEligibility(su, [contributionGatedClaim()], false)
    expect(result.eligible).toBe(true)
  })
})

describe('evaluateHumanContributionClarificationEligibility -- relationship-aware (one-hop) eligibility, mirrors jurisdiction Slice 1 governance matrix', () => {
  function relationship(overrides: Partial<TopicRelationship> & Pick<TopicRelationship, 'relationship_id' | 'source_topic' | 'target_topic'>): TopicRelationship {
    return {
      relationship_type: 'relevant_consideration',
      rationale: 'test rationale',
      lifecycle: 'Adopted',
      adoption_approver: 'Test',
      adoption_decision_date: '2026-08-16',
      publication_scope: 'Reviewer/Commercial Assurance',
      crc_eligible: 'Yes',
      crc_approver: 'Test',
      crc_decision_date: '2026-08-19',
      last_reviewed: '2026-08-16',
      superseded_by: null,
      ...overrides,
    }
  }
  const rel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
  const su = baseSU({
    user_goals: [copyOwnershipGoal],
    tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
  })
  const relatedClaim = contributionGatedClaim({ claim_id: 'REL-TARGET-1', topic: 'copyrightability' })

  test('eligible via a one-hop relationship when the direct-topic claim itself carries no dependency', () => {
    const directClaimNoDependency: TopicClaim = { ...contributionGatedClaim(), unresolved_project_dependencies: [] }
    const result = evaluateHumanContributionClarificationEligibility(su, [directClaimNoDependency, relatedClaim], false, [rel])
    expect(result.needs_human_contribution).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('relationship Pending -> not eligible', () => {
    const pendingRel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Pending' })
    const result = evaluateHumanContributionClarificationEligibility(su, [relatedClaim], false, [pendingRel])
    expect(result.eligible).toBe(false)
  })

  test('unrelated relationship (different source_topic) never contributes', () => {
    const unrelatedRel = relationship({ relationship_id: 'REL-UNRELATED', source_topic: 'commercial_use', target_topic: 'copyrightability' })
    const result = evaluateHumanContributionClarificationEligibility(su, [relatedClaim], false, [unrelatedRel])
    expect(result.eligible).toBe(false)
  })

  test('one-hop only -- a second, chained relationship is never traversed', () => {
    const secondHopRel = relationship({ relationship_id: 'REL-SECOND-HOP', source_topic: 'copyrightability', target_topic: 'unknown' })
    const secondHopClaim: TopicClaim = contributionGatedClaim({ claim_id: 'SECOND-HOP-CLAIM', topic: 'unknown' })
    const firstHopClaimNoDependency: TopicClaim = { ...relatedClaim, unresolved_project_dependencies: [] }
    const result = evaluateHumanContributionClarificationEligibility(su, [firstHopClaimNoDependency, secondHopClaim], false, [rel, secondHopRel])
    expect(result.eligible).toBe(false)
  })
})

describe('askability registry gate: a dependency string absent from the registry is never askable, even if a claim names it', () => {
  test('a hypothetical future non-askable dependency (e.g. evidence-only) is never proposed as a question', () => {
    const su = baseSU({
      user_goals: [copyOwnershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const evidenceOnlyClaim: TopicClaim = { ...contributionGatedClaim(), unresolved_project_dependencies: ['separate_authorization_obtained'] }
    const result = evaluateHumanContributionClarificationEligibility(su, [evidenceOnlyClaim], false)
    expect(result.needs_human_contribution).toBe(false)
    expect(result.eligible).toBe(false)
  })
})

describe('other-goal / stock / Path B regression: unrelated categories and stock claims never trigger human-contribution clarification', () => {
  test('commercial_use goal: unaffected by the real relationships fixture', () => {
    const su = baseSU({
      user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_human_contribution).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('third_party_source_rights goal: unaffected -- no Editorial-classification question introduced, no stock claim carries this dependency', () => {
    const su = baseSU({
      user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_human_contribution).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('an asset_provider_mention alone (no goal at all) never triggers this clarification -- Path B stays off', () => {
    const su = baseSU({
      user_goals: [],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_human_contribution).toBe(false)
    expect(result.eligible).toBe(false)
  })
})

describe('copyright ownership UAT regression: real fixtures, real REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1', () => {
  const ownershipGoal: UserGoal = {
    goal_id: 'g-1', state: 'confirmed', raw_text: 'Do I own the copyright to it?', category: 'copyright_ownership',
    scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'Do I own the copyright to it?',
  }

  test('eligible with the real live governed claim/relationship package + a minimal workflow anchor', () => {
    const su = baseSU({
      user_goals: [ownershipGoal],
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    })
    const result = evaluateHumanContributionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_human_contribution).toBe(true)
    expect(result.eligible).toBe(true)
  })
})

describe('buildHumanContributionClarificationProposal', () => {
  test('produces the exact PM-approved question text, kind, and null signal id', () => {
    const proposal = buildHumanContributionClarificationProposal(3)
    expect(proposal).toEqual({
      question_text: HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION,
      question_kind: 'human_contribution_clarification',
      target_signal_id: null,
      phase: 3,
    })
  })

  test('the approved copy is exactly the PM-specified wording, verbatim', () => {
    expect(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION).toBe(
      'Beyond entering prompts, what did you personally do to shape the final video — for example selecting takes, arranging the sequence, editing, or compositing?',
    )
  })
})
