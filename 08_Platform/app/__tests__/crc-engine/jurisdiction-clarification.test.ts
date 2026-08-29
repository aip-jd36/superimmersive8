/**
 * Jurisdiction clarification eligibility deterministic tests (CRC Living
 * Knowledge Phase 1, 2026-08-16; relationship-aware, Interview Engine
 * Diagnostic Slice 1, 2026-08-19; Gate-1 requirement removed, Copyright
 * UAT Correction Milestone T1, 2026-08-19). No live model needed -- pure
 * functions, same discipline as commercial-readiness-catalog.test.ts.
 */

import {
  evaluateJurisdictionClarificationEligibility,
  evaluateJurisdictionClarificationRetryEligibility,
  buildJurisdictionClarificationProposal,
  buildJurisdictionClarificationRetryProposal,
  JURISDICTION_CLARIFICATION_QUESTION,
  JURISDICTION_CLARIFICATION_RETRY_QUESTION,
} from '@/lib/crc-engine/jurisdiction-clarification'
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
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

describe('evaluateJurisdictionClarificationEligibility', () => {
  // Copyright UAT Correction Milestone T1, 2026-08-19: replaces the old
  // "not eligible when Gate 1 is not met" test, whose premise no longer
  // exists -- the function no longer accepts a gate1Met parameter at all.
  // This is the direct, positive proof of the T1 behavior change: the
  // exact same governed-relevance state that used to be blocked is now
  // eligible, with `gate_1_state: 'not_met'` explicitly set on the input
  // SU to make the intent unambiguous even though the function itself
  // never reads that field.
  test('T1: eligible when a relevant goal + governed knowledge requires jurisdiction, even though Gate 1 is not met', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })], gate_1_state: 'not_met' })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.jurisdiction_unresolved).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('not eligible when no active goal needs jurisdiction-scoped knowledge', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim({ claim_id: 'C-1', topic: 'copyright_ownership' })], false)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('not eligible when NO governed claim contains a jurisdiction applicability requirement -- claim existing alone is never the trigger', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const claimWithoutJurisdictionGate: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [claimWithoutJurisdictionGate], false)
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
          account_status: { state: 'unknown' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'Kling',
          superseded_by: null,
        },
      ],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
    expect(result.eligible).toBe(false)
  })

  test('eligible when an active goal needs jurisdiction-scoped knowledge and jurisdiction is unconfirmed', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
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
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // Assessment-Jurisdiction Mention Model (2026-08-28): the legacy scalar's
  // 'declined' state is no longer specially read by this module at all (see
  // jurisdiction-clarification.ts's own computeJurisdictionNeedState header)
  // -- decline no longer permanently locks out a value the way the old
  // single-scalar model implied; "do not keep pestering" is enforced purely
  // by the ordinary already-asked cap (`alreadyAskedThisConversation`),
  // which in real production flow becomes true the moment the initial
  // question is asked, decline or not. jurisdiction_unresolved on its own
  // stays true (nothing was confirmed or explicitly excluded); eligibility
  // is false because of the already-asked gate, not a special decline check.
  test('not eligible once jurisdiction has already been asked (including after a decline) -- the already-asked cap, not a decline-specific state, prevents pestering', () => {
    const su = baseSU({
      user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'declined' }, source_turn: 2, source_statement: 'skip' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], true)
    expect(result.jurisdiction_unresolved).toBe(true)
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
          human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        },
      })
      const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
      expect(result.eligible).toBe(true)
    }
  })

  test('not eligible when already asked this conversation -- once-per-interview cap unchanged by T1', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], true)
    expect(result.eligible).toBe(false)
  })

  test('a superseded or declined goal never triggers eligibility', () => {
    const superseded = goal({ goal_id: 'g-1', category: 'copyright_ownership', superseded_by: 'g-2' })
    const declined = goal({ goal_id: 'g-2', category: 'copyright_ownership', state: 'declined' })
    const su = baseSU({ user_goals: [superseded, declined] })
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
    expect(result.eligible).toBe(false)
  })

  test('a claim with no eligible/adopted version never triggers eligibility (reviewer-only or candidate claim)', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const overridesList: Partial<TopicClaim>[] = [{ lifecycle: 'Candidate' }, { crc_eligible: 'No' }, { superseded_by: 'C-2' }]
    for (const overrides of overridesList) {
      const result = evaluateJurisdictionClarificationEligibility(su, [{ ...jurisdictionGatedClaim(), ...overrides }], false)
      expect(result.eligible).toBe(false)
    }
  })

  test('omitting the relationships argument entirely (pre-Slice-1 call shape) behaves identically to passing [] -- backward-compatible default', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'copyright_ownership' })] })
    const withDefault = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false)
    const withExplicitEmpty = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, [])
    expect(withDefault).toEqual(withExplicitEmpty)
  })
})

// ── Relationship-aware eligibility (Interview Engine Diagnostic Slice 1, 2026-08-19) ──
// Governance gates (relationship Lifecycle/CRC-eligible/supersession, target-claim
// Lifecycle/CRC-eligible/supersession, one-hop-only traversal) are UNCHANGED by T1 --
// T1 only removed gate1Met from the top-level eligibility formula. Every test in this
// block still proves the full governance-gate matrix exactly as Slice 1 left it.

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
    const result = evaluateJurisdictionClarificationEligibility(su, [directClaimNoJurisdiction, relatedJurisdictionGatedClaim()], false, [rel])
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.eligible).toBe(true)
  })

  // B: relationship Pending -> not eligible
  test('B: relationship Adopted but CRC-Eligible: Pending -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const pendingRel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', crc_eligible: 'Pending' })
    const result = evaluateJurisdictionClarificationEligibility(su, [relatedJurisdictionGatedClaim()], false, [pendingRel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // C: relationship not Adopted -> not eligible
  test('C: relationship CRC-Eligible: Yes but Lifecycle: Candidate (not Adopted) -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const notAdoptedRel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability', lifecycle: 'Candidate' })
    const result = evaluateJurisdictionClarificationEligibility(su, [relatedJurisdictionGatedClaim()], false, [notAdoptedRel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // D: target claim Pending -> not eligible
  test('D: target claim CRC-Eligible: Pending -> not eligible, even with a live relationship', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const pendingTarget: TopicClaim = { ...relatedJurisdictionGatedClaim(), crc_eligible: 'Pending' }
    const result = evaluateJurisdictionClarificationEligibility(su, [pendingTarget], false, [rel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // E: target claim not Adopted -> not eligible
  test('E: target claim Lifecycle: Candidate (not Adopted) -> not eligible, even with a live relationship', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const notAdoptedTarget: TopicClaim = { ...relatedJurisdictionGatedClaim(), lifecycle: 'Candidate' }
    const result = evaluateJurisdictionClarificationEligibility(su, [notAdoptedTarget], false, [rel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // F: target claim has no jurisdiction requirement -> not eligible
  test('F: target claim is Adopted + CRC-Eligible: Yes but carries no jurisdiction applicability requirement -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const noJurisdictionTarget: TopicClaim = { ...relatedJurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [noJurisdictionTarget], false, [rel])
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // G: unrelated relationship -> not eligible
  test('G: an unrelated relationship (different source_topic than the active goal) never contributes -> not eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const unrelatedRel = relationship({ relationship_id: 'REL-UNRELATED', source_topic: 'commercial_use', target_topic: 'copyrightability' })
    const result = evaluateJurisdictionClarificationEligibility(su, [relatedJurisdictionGatedClaim()], false, [unrelatedRel])
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
      [rel, secondHopRel],
    )
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('direct-topic behavior is unaffected when a relationship also exists for the same goal category -- both direct and relationship paths can independently make a goal need jurisdiction', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    // Direct-topic claim DOES need jurisdiction -- relationship is irrelevant here, but passing one must not break anything.
    const result = evaluateJurisdictionClarificationEligibility(su, [jurisdictionGatedClaim()], false, [rel])
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
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const directClaimNoJurisdiction: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationEligibility(su, [directClaimNoJurisdiction, relatedJurisdictionGatedClaim()], false, [rel])
    expect(result.eligible).toBe(false)
  })
})

// ── Copyright ownership UAT-state regression (Interview Engine Diagnostic Slice 1,
// 2026-08-19; Gate-1 requirement removed, Copyright UAT Correction Milestone T1,
// 2026-08-19) ── Real fixtures, not synthetic clones -- proves the fix against the
// actual, currently-live governance state (COPY-004/-001/-002/-003 and
// REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 are all real CRC Eligible: Yes as of
// 2026-08-19).

describe('copyright ownership UAT regression: "Do I own the copyright?" now becomes jurisdiction-clarification-eligible', () => {
  const ownershipGoal: UserGoal = {
    goal_id: 'g-1', state: 'confirmed', raw_text: 'Do I own the copyright to it?', category: 'copyright_ownership',
    scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'Do I own the copyright to it?',
  }

  test('BEFORE-style check (relationships omitted): the real fixture alone, without relationships threaded in, is NOT eligible -- proves the fix is additive, not a fixture-content change', () => {
    const su = baseSU({ user_goals: [ownershipGoal] })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // T1: proves the exact live-UAT critical state -- goal confirmed, real governed
  // relationship + target claims requiring jurisdiction, jurisdiction unknown, AND
  // Gate 1 explicitly not_met -- is eligible. This is the state that stalled the
  // real live UAT before T1 (Gate 1 never became 'met' due to the Kling-alias gap
  // fixed by T2 below); it must be eligible on its own, independent of Gate 1.
  test('T1: with relationships threaded in, jurisdiction unknown, and Gate 1 explicitly not_met, the real copyright_ownership goal is eligible before full Gate 1 is required', () => {
    const su = baseSU({ user_goals: [ownershipGoal], gate_1_state: 'not_met' })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
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
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
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
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('third_party_source_rights goal: unaffected -- no relationship sources from third_party_source_rights, and the real stock claims carry no jurisdiction requirement', () => {
    const su = baseSU({
      user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this Getty image?', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('an asset_provider_mention alone (no goal at all) never triggers jurisdiction clarification -- the trigger is strictly an active goal category, never a provider mention (Path B remains off)', () => {
    const su = baseSU({
      user_goals: [],
      asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Getty', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
    })
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
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
    const result = evaluateJurisdictionClarificationEligibility(su, TOPIC_CLAIMS_FIXTURE, false, TOPIC_RELATIONSHIPS_FIXTURE)
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

  // Generalized by the Assessment-Jurisdiction Mention Model (2026-08-28):
  // the original Copyright-only, country-only wording would have been
  // actively misleading for a different jurisdiction-gated domain (e.g.
  // Likeness) and never supported a subnational value. See
  // JURISDICTION_CLARIFICATION_QUESTION's own doc comment.
  test('the approved copy is exactly the generalized assessment-scope question -- CRC Assessment-Jurisdiction Mention Model, 2026-08-28', () => {
    expect(JURISDICTION_CLARIFICATION_QUESTION).toBe(
      'Which jurisdiction — for example, a country, or a specific state or province — should CRC consider for this assessment?',
    )
  })
})

// ── Second-Jurisdiction UX milestone (2026-08-20), J3 -- one bounded
// deterministic retry ──

describe('evaluateJurisdictionClarificationRetryEligibility', () => {
  const goalCopyOwnership = goal({ goal_id: 'g-1', category: 'copyright_ownership' })

  test('K: initial already asked, jurisdiction still unresolved, retry not yet used -> eligible', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const result = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, false)
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.jurisdiction_unresolved).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('not eligible before the initial question has ever been asked -- retry is never a substitute first attempt', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const result = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], false, false)
    expect(result.eligible).toBe(false)
  })

  test('L: retry already used -> not eligible, even though jurisdiction remains unresolved and the initial question was asked (no third deterministic attempt)', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const result = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, true)
    expect(result.eligible).toBe(false)
  })

  test('M: jurisdiction already confirmed by the FIRST answer -> retry never becomes eligible', () => {
    const su = baseSU({
      user_goals: [goalCopyOwnership],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'United States' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const result = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, false)
    expect(result.jurisdiction_unresolved).toBe(false)
    expect(result.eligible).toBe(false)
  })

  // Assessment-Jurisdiction Mention Model (2026-08-28): the legacy scalar's
  // 'declined' state is no longer specially read by computeJurisdictionNeedState
  // (see jurisdiction-clarification.ts's own header) -- a decline leaves
  // jurisdiction genuinely unresolved (nothing confirmed or excluded), so
  // the bounded, differently-worded retry is now correctly ELIGIBLE exactly
  // once after a decline, gated only by its own once-only cap
  // (retryAlreadyAskedThisConversation), not by a decline-specific
  // suppression. This is an intentional product behavior, not a regression:
  // the old single-scalar model conflated "declined" with "give up
  // entirely," which this milestone's redesign deliberately does not
  // reproduce.
  test('N: jurisdiction declined -> retry is eligible once (the decline itself does not suppress the bounded retry; only the retry\'s own once-only cap does)', () => {
    const su = baseSU({
      user_goals: [goalCopyOwnership],
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'declined' }, source_turn: 2, source_statement: 'skip' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    const eligibleForRetry = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, false)
    expect(eligibleForRetry.jurisdiction_unresolved).toBe(true)
    expect(eligibleForRetry.eligible).toBe(true)

    const retryAlreadyUsed = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, true)
    expect(retryAlreadyUsed.eligible).toBe(false)
  })

  test('not eligible when no active goal needs jurisdiction-scoped knowledge -- same governance gate as the initial question', () => {
    const su = baseSU({ user_goals: [goal({ goal_id: 'g-1', category: 'commercial_use' })] })
    const result = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim({ claim_id: 'C-1', topic: 'copyright_ownership' })], true, false)
    expect(result.needs_jurisdiction).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('relationship-mediated need is exactly as retry-worthy as a direct one (shared computeJurisdictionNeedState with the initial question)', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const rel = relationship({ relationship_id: 'REL-TEST-1', source_topic: 'copyright_ownership', target_topic: 'copyrightability' })
    const directClaimNoJurisdiction: TopicClaim = { ...jurisdictionGatedClaim(), applicability_requirements: [] }
    const result = evaluateJurisdictionClarificationRetryEligibility(su, [directClaimNoJurisdiction, relatedJurisdictionGatedClaim()], true, false, [rel])
    expect(result.needs_jurisdiction).toBe(true)
    expect(result.eligible).toBe(true)
  })

  test('omitting the relationships argument behaves identically to passing [] -- same backward-compatible default as the initial question', () => {
    const su = baseSU({ user_goals: [goalCopyOwnership] })
    const withDefault = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, false)
    const withExplicitEmpty = evaluateJurisdictionClarificationRetryEligibility(su, [jurisdictionGatedClaim()], true, false, [])
    expect(withDefault).toEqual(withExplicitEmpty)
  })
})

describe('buildJurisdictionClarificationRetryProposal', () => {
  test('produces the exact PM-suggested retry text, its own dedicated kind, and null signal id', () => {
    const proposal = buildJurisdictionClarificationRetryProposal(2)
    expect(proposal).toEqual({
      question_text: JURISDICTION_CLARIFICATION_RETRY_QUESTION,
      question_kind: 'jurisdiction_clarification_retry',
      target_signal_id: null,
      phase: 2,
    })
  })

  test('retry text is distinct from the initial question -- never the same string, never LLM-generated', () => {
    expect(JURISDICTION_CLARIFICATION_RETRY_QUESTION).not.toBe(JURISDICTION_CLARIFICATION_QUESTION)
    expect(JURISDICTION_CLARIFICATION_RETRY_QUESTION.length).toBeGreaterThan(0)
  })

  // Generalized by the Assessment-Jurisdiction Mention Model (2026-08-28) --
  // was untouched by the earlier Second-Jurisdiction UX milestone (J3) this
  // test originally documented; this later milestone did change it. See
  // JURISDICTION_CLARIFICATION_QUESTION's own doc comment.
  test('the primary jurisdiction question itself is untouched by the Second-Jurisdiction UX (J3) milestone -- wording non-goal for J3', () => {
    expect(JURISDICTION_CLARIFICATION_QUESTION).toBe(
      'Which jurisdiction — for example, a country, or a specific state or province — should CRC consider for this assessment?',
    )
  })
})
