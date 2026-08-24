/**
 * Kling commercial-use governed knowledge deterministic tests (CRC Kling
 * Governed Knowledge Correction + Decomposition milestone, 2026-08-24).
 * Exercises the REAL, live MATRIX_FIXTURE Kling claims (not synthetic
 * analogs) end-to-end through retrieve() -> buildBoundedInterpretations(),
 * proving the accepted Model B decomposition (unconditional baseline +
 * applicability-gated Member exception) behaves correctly through the
 * already-integrated generic infrastructure (CRC Generic Mixed-Resolution
 * Bounded Interpretation + CRC Generic Applicability Diagnostic Parity,
 * both already on main). No live model needed -- pure functions.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { deriveSelectorNeeds } from '@/lib/crc-engine/selector-questioning'
import { getSelectorAskabilityEntry, isSelectorAskable } from '@/lib/crc-engine/selector-askability'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { deriveApplicabilityReadinessGaps } from '@/lib/retrieval-engine/applicability-readiness'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'

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

function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown' }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return {
    state: 'confirmed',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
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

const BASELINE_ID = 'kling-commercial-use-baseline'
const MEMBER_ID = 'kling-commercial-use-member'

function klingRow() {
  const row = MATRIX_FIXTURE.find((r) => r.identifier === 'kling')
  if (!row) throw new Error('kling row missing from MATRIX_FIXTURE')
  return row
}

// A. the old combined claim no longer remains live in conflicting form
describe('A: old combined Kling claim retired, replaced by Model B decomposition', () => {
  test('MATRIX_FIXTURE kling row has exactly two claims, the new claim_ids, no bare "kling" claim_id', () => {
    const row = klingRow()
    expect(row.claims.map((c) => c.claim_id).sort()).toEqual([BASELINE_ID, MEMBER_ID])
    expect(row.claims.some((c) => c.claim_id === 'kling')).toBe(false)
  })

  test('neither claim uses "paid members"/"free users" language -- the corrected terminology issue', () => {
    const row = klingRow()
    for (const claim of row.claims) {
      expect(claim.crc_candidate_statement).not.toMatch(/paid members|free users/i)
      expect(claim.crc_publication_scope).not.toMatch(/paid members|free users/i)
    }
  })
})

describe('B/C/D: unknown membership -- baseline retrieves, Member exception withheld with unresolved detail', () => {
  const facts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }

  test('B: baseline claim retrieves unconditionally regardless of membership status', () => {
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [], [], facts)
    expect(out.results.map((r) => r.claim_id)).toContain(BASELINE_ID)
  })

  test('C: Member exception is withheld -- never fabricated as applicable when membership is unknown', () => {
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [], [], facts)
    expect(out.results.map((r) => r.claim_id)).not.toContain(MEMBER_ID)
  })

  test('D: unknown membership emits unresolved applicability detail for the Member claim, scoped to kling', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [], facts)
    expect(out.diagnostics).toContainEqual({
      identifier: 'commercial_use',
      reason: 'applicability_unmet',
      unmet_applicability: [{ claim_id: MEMBER_ID, requirement: { fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }, status: 'unresolved' }],
    })
  })
})

describe('E: BI preserves baseline + unresolved Member exception, without changing the resolved conclusion', () => {
  test('State A (membership unknown): directly_relevant on the baseline alone, Member claim preserved as unresolved_relevant_claims, no question asked', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const facts: ApplicabilityFacts = { jurisdiction: { state: 'unknown' }, toolMentions: [] }
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [], facts)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.summary).toContain("Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission.")
    expect(interp.supporting_claim_ids).toEqual([BASELINE_ID])
    expect(interp.unresolved_relevant_claims).toEqual([{ claim_id: MEMBER_ID }])

    // No question generated solely from this state -- deriveSelectorNeeds returns no askable need (registry empty).
    const su: StructuredUnderstanding = {
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      scoped_observations: [],
      user_goals: [g],
      asset_provider_mentions: [],
      current_phase: 3,
      gate_1_state: 'met',
      gate_2_state: 'not_yet_stable',
      completion_reason: null,
      opt_out_scope: null,
    }
    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, [], createInitialBoundaryState())
    expect(needs).toEqual([])
  })
})

describe('F/G: State B -- known Member Account', () => {
  const memberFacts = (): ApplicabilityFacts => ({
    jurisdiction: { state: 'unknown' },
    toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, account_status: { state: 'confirmed', value: 'Member Account' } })],
  })

  test('F: known Member Account -- both baseline and Member proposition retrieve', () => {
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [], [], memberFacts())
    expect(out.results.map((r) => r.claim_id).sort()).toEqual([BASELINE_ID, MEMBER_ID])
  })

  test('G: known Member Account -- BI shows both applicable propositions, zero unresolved metadata', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [], memberFacts())
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.summary).toContain("Under Kling's current Terms of Service, you may not use")
    expect(interp.summary).toContain("If you currently hold a Kling Member Account")
    expect(interp.summary).toContain('except for developing or offering products or services that compete with Kling AI')
    expect(interp.supporting_claim_ids.sort()).toEqual([BASELINE_ID, MEMBER_ID])
    expect(interp.unresolved_relevant_claims).toEqual([])
  })
})

describe('H/I: State C -- known Regular Account (non-Member)', () => {
  const regularFacts = (): ApplicabilityFacts => ({
    jurisdiction: { state: 'unknown' },
    toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, account_status: { state: 'confirmed', value: 'Regular Account' } })],
  })

  test('H: known Regular Account -- Member proposition withheld as not_met, never guessed applicable', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [], regularFacts())
    expect(out.results.map((r) => r.claim_id)).toEqual([BASELINE_ID])
    expect(out.diagnostics).toContainEqual({
      identifier: 'commercial_use',
      reason: 'applicability_unmet',
      unmet_applicability: [{ claim_id: MEMBER_ID, requirement: { fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }, status: 'not_met' }],
    })
  })

  test('I: known Regular Account -- BI shows baseline only, Member claim NOT represented as unresolved (a settled negative, not an open question)', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [], regularFacts())
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.supporting_claim_ids).toEqual([BASELINE_ID])
    expect(interp.summary).not.toContain('If you currently hold a Kling Member Account')
    expect(interp.unresolved_relevant_claims).toEqual([])
  })
})

// J. provider isolation -- State D from the task's Expected CRC Behavior
describe('J: provider isolation -- another tool having account_status confirmed must not leak into Kling\'s claims, and vice versa', () => {
  test("a different tool's confirmed Member Account status does not make Kling's Member claim applicable", () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const facts: ApplicabilityFacts = {
      jurisdiction: { state: 'unknown' },
      toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' }, account_status: { state: 'confirmed', value: 'Member Account' } })],
    }
    // Kling is mentioned too, but its OWN account_status is unresolved -- only runway-gen3's mention carries a confirmed value.
    const out = retrieve(handoff({ tools: [tool('kling'), tool('runway-gen3')] }), MATRIX_FIXTURE, [g], [], facts)
    expect(out.results.map((r) => r.claim_id)).not.toContain(MEMBER_ID)
    expect(out.results.map((r) => r.claim_id)).toContain(BASELINE_ID)
    expect(out.results.map((r) => r.claim_id)).toContain('runway-gen3') // Runway's own unconditional claim, unaffected
  })

  test("Kling's Member claim never surfaces for a different tool's row merely because the generic tool_account_status fact exists", () => {
    // Runway's real Matrix claim has no applicability_requirements at all -- confirms the generic fact
    // being reusable across tools does not cause cross-tool leakage by itself (no Kling-specific gate exists on Runway's row).
    const runwayRow = MATRIX_FIXTURE.find((r) => r.identifier === 'runway-gen3')
    expect(runwayRow?.claims.every((c) => c.applicability_requirements.every((r) => r.fact !== 'tool_account_status'))).toBe(true)
  })
})

// K. selector registry remains empty / non-askable
describe('K: askability remains dormant -- tool_account_status is not registered askable', () => {
  test('getSelectorAskabilityEntry returns undefined for tool_account_status', () => {
    expect(getSelectorAskabilityEntry('tool_account_status')).toBeUndefined()
  })

  test('isSelectorAskable returns false for tool_account_status', () => {
    expect(isSelectorAskable('tool_account_status')).toBe(false)
  })
})

// L. no new question generated solely because membership is unresolved (also exercised inline in E above)
describe('L: unresolved Kling membership status never produces a selector-need proposal, because the fact is not registered askable', () => {
  test('deriveSelectorNeeds returns [] even though a real, currently-unresolved, explicit-goal-relevant applicability gap exists', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const su: StructuredUnderstanding = {
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
      scoped_observations: [],
      user_goals: [g],
      asset_provider_mentions: [],
      current_phase: 3,
      gate_1_state: 'met',
      gate_2_state: 'not_yet_stable',
      completion_reason: null,
      opt_out_scope: null,
    }
    // Sanity: the readiness gap genuinely exists (proves this is a real "would be askable if registered" case, not a vacuous pass).
    const gaps = deriveApplicabilityReadinessGaps(
      buildRetrievalHandoff(su),
      MATRIX_FIXTURE,
      su.user_goals,
      [],
      { jurisdiction: su.project_facts.jurisdiction.attestation, toolMentions: su.tool_mentions },
    )
    expect(gaps.some((d) => d.unmet_applicability?.some((u) => u.claim_id === MEMBER_ID))).toBe(true)

    const needs = deriveSelectorNeeds(su, MATRIX_FIXTURE, [], createInitialBoundaryState())
    expect(needs).toEqual([])
  })
})

// M. candidate statements faithfully match the implemented primary-source evidence model
describe('M: candidate-statement fidelity to the primary-source evidence model', () => {
  test('baseline claim text matches the K1 §4.6 governed model exactly', () => {
    const row = klingRow()
    const baseline = row.claims.find((c) => c.claim_id === BASELINE_ID)
    expect(baseline?.crc_candidate_statement).toBe(
      "Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission.",
    )
  })

  test('member claim text matches the K2 §1.4-1.6/§3.1.2 governed model exactly, including the competing-product carve-out', () => {
    const row = klingRow()
    const member = row.claims.find((c) => c.claim_id === MEMBER_ID)
    expect(member?.crc_candidate_statement).toBe(
      "If you currently hold a Kling Member Account (i.e. you're subscribed to Kling's Membership Service), Kling's current Terms of Paid Service permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI.",
    )
  })

  test('neither claim asserts unsupported temporal semantics (generation-time, permanence, retroactivity)', () => {
    const row = klingRow()
    const forbidden = /generated while|remains commercially usable forever|must have existed at generation|retroactively/i
    for (const claim of row.claims) {
      expect(claim.crc_candidate_statement).not.toMatch(forbidden)
      expect(claim.crc_publication_scope).not.toMatch(forbidden)
    }
  })

  test('member claim uses source terminology ("Member Account") not a re-abstracted synonym', () => {
    const row = klingRow()
    const member = row.claims.find((c) => c.claim_id === MEMBER_ID)
    expect(member?.applicability_requirements).toEqual([{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }])
  })
})

// N. last_verified / lifecycle / CRC eligibility / supersession
describe('N: governance fields', () => {
  test('kling row last_verified reflects the K1/K2 direct-evidence re-verification date', () => {
    expect(klingRow().last_verified).toBe('2026-08-24')
  })

  test('both claims are CRC-Eligible: Yes', () => {
    const row = klingRow()
    expect(row.claims.every((c) => c.crc_eligible === 'Yes')).toBe(true)
  })

  test('both claims are tagged topic: commercial_use', () => {
    const row = klingRow()
    expect(row.claims.every((c) => c.topic === 'commercial_use')).toBe(true)
  })
})

// Correction semantics: recomputation, no persisted state
describe('correction semantics: unresolved membership resolving in either direction recomputes cleanly', () => {
  test('unresolved -> Member Account: the claim naturally moves into matches[] and out of unresolved_relevant_claims', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const h = handoff({ tools: [tool('kling')] })

    const turnN = retrieve(h, MATRIX_FIXTURE, [g], [], { jurisdiction: { state: 'unknown' }, toolMentions: [] })
    const interpN = buildBoundedInterpretations([g], turnN.results, turnN.diagnostics)[0]
    expect(interpN.unresolved_relevant_claims).toEqual([{ claim_id: MEMBER_ID }])

    const turnNPlus1 = retrieve(h, MATRIX_FIXTURE, [g], [], {
      jurisdiction: { state: 'unknown' },
      toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, account_status: { state: 'confirmed', value: 'Member Account' } })],
    })
    const interpNPlus1 = buildBoundedInterpretations([g], turnNPlus1.results, turnNPlus1.diagnostics)[0]
    expect(interpNPlus1.supporting_claim_ids.sort()).toEqual([BASELINE_ID, MEMBER_ID])
    expect(interpNPlus1.unresolved_relevant_claims).toEqual([])
  })

  test('unresolved -> Regular Account: the claim disappears from unresolved_relevant_claims without ever entering matches[]', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const h = handoff({ tools: [tool('kling')] })

    const turnN = retrieve(h, MATRIX_FIXTURE, [g], [], { jurisdiction: { state: 'unknown' }, toolMentions: [] })
    const interpN = buildBoundedInterpretations([g], turnN.results, turnN.diagnostics)[0]
    expect(interpN.unresolved_relevant_claims).toEqual([{ claim_id: MEMBER_ID }])

    const turnNPlus1 = retrieve(h, MATRIX_FIXTURE, [g], [], {
      jurisdiction: { state: 'unknown' },
      toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, account_status: { state: 'confirmed', value: 'Regular Account' } })],
    })
    const interpNPlus1 = buildBoundedInterpretations([g], turnNPlus1.results, turnNPlus1.diagnostics)[0]
    expect(interpNPlus1.supporting_claim_ids).toEqual([BASELINE_ID])
    expect(interpNPlus1.unresolved_relevant_claims).toEqual([])
  })
})
