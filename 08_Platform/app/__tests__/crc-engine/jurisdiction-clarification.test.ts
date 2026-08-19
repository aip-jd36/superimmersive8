/**
 * Jurisdiction clarification eligibility deterministic tests (CRC Living
 * Knowledge Phase 1, 2026-08-16). No live model needed -- pure functions,
 * same discipline as commercial-readiness-catalog.test.ts.
 */

import { evaluateJurisdictionClarificationEligibility, buildJurisdictionClarificationProposal, JURISDICTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/jurisdiction-clarification'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
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

function jurisdictionGatedClaim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'> = { claim_id: 'C-1', topic: 'copyright_ownership' }): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'United States',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope',
    crc_candidate_statement: 'statement',
    applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    unresolved_project_dependencies: [],
    provider_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

describe('evaluateJurisdictionClarificationEligibility', () => {
  test('not eligible when Gate 1 is not met, even if everything else lines up', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when no active goal needs jurisdiction-scoped knowledge', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim({ claim_id: 'C-1', topic: 'copyright_ownership' })], false, true)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when NO governed claim contains a jurisdiction applicability requirement -- claim existing alone is never the trigger', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const claimWithoutJurisdictionGate: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [claimWithoutJurisdictionGate], false, true)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible merely because a tool was mentioned -- the trigger is the goal, never the tool', () => {
    const su = baseSU({
      user_goals: [],
      tool_mentions: [
        {
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          access_surface: { state: 'unknown' },
          plan_tier: { state: 'unknown' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'Kling',
          superseded_by: null,
        },
      ],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.eligible).toBe(false)
  })

  test('eligible when Gate 1 met, an active goal needs jurisdiction-scoped knowledge, and jurisdiction is unconfirmed', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.jurisdiction_unresolved).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('not eligible once jurisdiction is confirmed -- do not re-ask a known fact', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible once jurisdiction is declined -- do not keep pestering after a decline', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'declined' }, source_turn: 2, source_statement: 'skip' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('remains eligible when jurisdiction is unresolved_no_visibility or confirmed_absent -- only confirmed/declined close the question', () => {
    for (const state of ['unresolved_no_visibility', 'confirmed_absent'] as const) {
      const su = baseSU({
        user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
        project_facts: {
          intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
          jurisdiction: { attestation: { state }, source_turn: 2, source_statement: 'x' },
        },
      })
      const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
      expect(result.eligible).toBe(true)
    }
  })

  test('not eligible when already asked this conversation', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], true, true)
    expect(result.eligible).toBe(false)
  })

  test('a superseded or declined goal never triggers eligibility', () => {
    const superseded = goal({ goal_id: 'g-1', category: 'copyright_ownership', superseded_by: 'g-2' })
    const declined = goal({ goal_id: 'g-2', category: 'copyright_ownership', state: 'declined' })
    const su = baseSU({ user_goals: [superseded, declined] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    expect(result.eligible).toBe(false)
  })

  test('a claim with no eligible/adopted version never triggers eligibility (reviewer-only or candidate claim)', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const overridesList: Partial<TopicClaim>[] = [{ lifecycle: 'Candidate' }, { crc_eligible: 'No' }, { superseded_by: 'C-2' }]
    for (const overrides of overridesList) {
      const result = evaluateJurisdictionClarificationEligibility(su, [{ ...jurisdictionGatedClaim(), ...overrides }], false, true)
      expect(result.eligible).toBe(false)
    }
  })

  test('omitting the relationships argument entirely (pre-Slice-1 call shape) behaves identically to passing [] -- backward-compatible default', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const withDefault = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true)
    const withExplicitEmpty = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true, [])
    expect(withDefault).toEqual(withExplicitEmpty)
  })
})

// ── Relationship-aware eligibility (Interview Engine Diagnostic Slice 1, 2026-08-19) ──

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

/** A target-topic claim reachable only via a relationship -- topic deliberately NOT copyright_ownership, mirroring the real COPY-001/002/003 shape (topic: copyrightability). */
function relatedJurisdictionGatedClaim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return jurisdictionGatedClaim({ claim_id: 'REL-TARGET-1', topic: 'copyrightability', ...overrides })
}

describe('evaluateJurisdictionClarificationEligibility -- relationship-aware (one-hop) eligibility', () => {
  const rel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
  const goalCopyOwnership = goal({ goal_id: 'g-1', category: 'copyright_ownership' })

  // A: relationship Adopted+Yes, target claim Adopted+Yes, jurisdiction required -> eligible
  test('A: eligible via a one-hop relationship when the direct-topic claim itself has no jurisdiction requirement', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    // Direct-topic claim (copyright_ownership) with NO jurisdiction requirement -- mirrors the real CLAIM-COPY-004-v1 shape.
    const directClaimNoJurisdiction: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [directClaimNoJurisdiction, relatedJurisdictionGatedClaim()], false, true, [rel])
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.eligible).toBe(true)
  })

  // B: relationship Pending -> not eligible
  test('B: relationship Adopted but CRC-Eligible: Pending -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const pendingRel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Pending' })
    const result = evaluateJurisdictionClarificationEligibility(su, [relatedJurisdictionGatedClaim()], false, true, [pendingRel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // C: relationship not Adopted -> not eligible
  test('C: relationship CRC-Eligible: Yes but Lifecycle: Candidate (not Adopted) -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const notAdoptedRel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', lifecycle: 'Candidate' })
    const result = evaluateJurisdictionClarificationEligibility(su, [relatedJurisdictionGatedClaim()], false, true, [notAdoptedRel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // D: target claim Pending -> not eligible
  test('D: target claim CRC-Eligible: Pending -> not eligible, even with a live relationship', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const pendingTarget: TopicClaim = { ...relatedJurisdictionGatedClaim(), crc_eligible: 'Pending' }
    const result = evaluateJurisdictionClarificationEligibility(su, [pendingTarget], false, true, [rel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // E: target claim not Adopted -> not eligible
  test('E: target claim Lifecycle: Candidate (not Adopted) -> not eligible, even with a live relationship', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const notAdoptedTarget: TopicClaim = { ...relatedJurisdictionGatedClaim(), lifecycle: 'Candidate' }
    const result = evaluateJurisdictionClarificationEligibility(su, [notAdoptedTarget], false, true, [rel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // F: target claim has no jurisdiction requirement -> not eligible
  test('F: target claim is Adopted + CRC-Eligible: Yes but carries no jurisdiction applicability requirement -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const noJurisdictionTarget: TopicClaim = { ...relatedJurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [noJurisdictionTarget], false, true, [rel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // G: unrelated relationship -> not eligible
  test('G: an unrelated relationship (different source_topic than the active goal) never contributes -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const unrelatedRel = relationship({ relationship_id: 'REL-UNRELATED', source_topic: 'commercial_use', target_topic: 'copyrightability' })
    const result = evaluateJurisdictionClarificationEligibility(su, [relatedJurisdictionGatedClaim()], false, true, [unrelatedRel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // H: one-hop only, no recursive traversal
  test('H: one-hop only -- a second, chained relationship (copyrightability -> unknown) is never traversed', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const secondHopRel = relationship({ relationship_id: 'REL-SECOND-HOP', source_topic: 'copyrightability', target_topic: 'unknown' })
    // The claim that actually needs jurisdiction sits on the SECOND hop's target topic only -- unreachable in one hop from copyright_ownership.
    const secondHopClaim: TopicClaim = jurisdictionGatedClaim({ claim_id: 'SECOND-HOP-CLAIM', topic: 'unknown' })
    // First-hop target (copyrightability) has a claim, but it does NOT need jurisdiction -- only the (unreachable) second-hop claim does.
    const firstHopClaimNoJurisdiction: TopicClaim = { ...relatedJurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(
      su,
      [firstHopClaimNoJurisdiction, secondHopClaim],
      false,
      true,
      [rel, secondHopRel],
    )
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('direct-topic behavior is unaffected when a relationship also exists for the same goal category -- both B1 and B2 can independently make a goal need jurisdiction', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    // Direct-topic claim DOES need jurisdiction (B1) -- relationship is irrelevant here, but passing one must not break anything.
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, true, [rel])
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('jurisdiction confirmed still closes eligibility even when the need is relationship-mediated', () => {
    const su = baseSU({
      user_goals: [goalCopyOwnership],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
      },
    })
    const directClaimNoJurisdiction: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [directClaimNoJurisdiction, relatedJurisdictionGatedClaim()], false, true, [rel])
    expect(result.eligible).toBe(false)
  })
})

// ── Copyright ownership UAT regression (Interview Engine Diagnostic Slice 1, 2026-08-19) ──
// Real fixtures, not synthetic clones -- proves the fix against the actual, currently-live
// governance state (COPY-004/-001/-002/-003 and REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1
// are all real CRC Eligible: Yes as of 2026-08-19).

describe('copyright ownership UAT regression: "Do I own the copyright?" now becomes jurisdiction-clarification-eligible', () => {
  const ownershipGoal: UserGoal = {
    goal_id: 'g-1', state: 'confirmed', raw_text: 'Do I own the copyright to it?', category: 'copyright_ownership',
    scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'Do I own the copyright to it?',
  }

  test('BEFORE-style check (relationships omitted): the real fixture alone, without relationships threaded in, is NOT eligible -- proves the fix is additive, not a fixture-content change', () => {
    const su = baseSU({ user_goals: [ownershipGoal] })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('AFTER fix: with relationships threaded in and jurisdiction unknown, the real copyright_ownership goal becomes eligible', () => {
    const su = baseSU({ user_goals: [ownershipGoal] })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.jurisdiction_unresolved).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('AFTER fix, jurisdiction confirmed United States: no longer eligible', () => {
    const su = baseSU({
      user_goals: [ownershipGoal],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'United States' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })
})

// ── Other-goal regression (Interview Engine Diagnostic Slice 1, 2026-08-19) ──

describe('other-goal regression: unrelated categories, stock claims, and provider mentions are unaffected', () => {
  test('commercial_use goal: unaffected by the real relationships fixture -- no commercial_use-sourced relationship exists', () => {
    const su = baseSU({
      user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('third_party_source_rights goal: unaffected -- no relationship sources from third_party_source_rights, and the real stock claims carry no jurisdiction requirement', () => {
    const su = baseSU({
      user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('an asset_provider_mention alone (no goal at all) never triggers jurisdiction clarification -- the trigger is strictly an active goal category, never a provider mention (Path B remains off)', () => {
    const su = baseSU({
      user_goals: [],
      asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null }],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('multi-goal: a commercial_use goal alongside the copyright_ownership goal does not suppress or duplicate the relationship-mediated eligibility', () => {
    const su = baseSU({
      user_goals: [
        { goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' },
        { goal_id: 'g-2', state: 'confirmed', raw_text: 'Do I own the copyright?', category: 'copyright_ownership', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' },
      ],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, true, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.eligible).toBe(true)
  })
})

describe('buildJurisdictionClarificationProposal', () => {
  test('produces the exact PM-approved question text, kind, and null signal id', () => {
    const proposal = buildJurisdictionClarificationProposal(3)
    expect(proposal).toEqual({
      question_text: JURISDICTION_CLARIFICATION_QUESTION,
      question_kind: 'jurisdiction_clarification',
      target_signal_id: null,
      phase: 3,
    })
  })

  test('the approved copy is exactly "Which country\'s copyright rules are most relevant to this project?"', () => {
    expect(JURISDICTION_CLARIFICATION_QUESTION).toBe("Which country's copyright rules are most relevant to this project?")
  })
})
