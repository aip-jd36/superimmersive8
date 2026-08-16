/**
 * Wave 1 governance-boundary proof (CRC Living Knowledge Phase 1,
 * 2026-08-16; updated 2026-08-16 for the first formal adoption decision;
 * updated again 2026-08-17 for the first formal CRC-publication decision).
 * Uses the REAL TOPIC_CLAIMS_FIXTURE content -- four real U.S. copyright
 * claims, formally ADOPTED 2026-08-16 (Adoption Approver: JD/PM) as SI8
 * institutional/reviewer knowledge.
 *
 * As of 2026-08-17, this file's own premise changed for the first time:
 * CLAIM-COPY-004-v1 is now `crc_eligible: 'Yes'` (CRC Approver: JD/PM,
 * 2026-08-17, after source-hardening research -- see
 * 01_Business/research/COPY-004-SOURCE-HARDENING-RESEARCH-2026.md) -- the
 * first non-platform copyright claim ever published to CRC.
 * CLAIM-COPY-001/002/003-v1 remain `crc_eligible: 'Pending'`, unchanged by
 * that same decision. This file was updated, not left stale, to assert the
 * now-accurate mixed state (one live, three still excluded) rather than
 * silently keep asserting a fact that stopped being true for one of the
 * four claims -- same discipline the 2026-08-16 update already established
 * as precedent for this file.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}

function copyrightGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Do I own the copyright?',
    category: 'copyright_ownership',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Do I own the copyright?',
    ...overrides,
  }
}

/**
 * CLAIM-COPY-001/002/003 are tagged Topic: copyrightability;
 * CLAIM-COPY-004 is tagged Topic: copyright_ownership. copyrightGoal()
 * above only exercises copyright_ownership (now matching only 004); this
 * helper exercises copyrightability (matching 001/002/003, all three still
 * Pending), so the exclusion proof below still directly covers those three
 * claims, not just the one live claim by coincidence.
 */
function copyrightabilityGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Is this even copyrightable?',
    category: 'copyrightability',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Is this even copyrightable?',
    ...overrides,
  }
}

describe('Wave 1 real claims -- governance state as of 2026-08-17 (COPY-004 published, COPY-001/002/003 still Pending)', () => {
  test('all four Wave 1 claims are present in the fixture', () => {
    expect(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id).sort()).toEqual([
      'CLAIM-COPY-001-v1',
      'CLAIM-COPY-002-v1',
      'CLAIM-COPY-003-v1',
      'CLAIM-COPY-004-v1',
    ])
  })

  test('all four ARE Lifecycle: Adopted -- visible as Adopted institutional knowledge in the canonical Governed Claims source', () => {
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      expect(claim.lifecycle).toBe('Adopted')
    }
  })

  test('CLAIM-COPY-004 is the ONLY claim that is CRC-Eligible: Yes; the other three remain Pending -- Adoption alone never implies CRC eligibility, which is a separate, per-claim decision', () => {
    const copy004 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-004-v1')!
    expect(copy004.crc_eligible).toBe('Yes')
    for (const id of ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']) {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)?.crc_eligible).toBe('Pending')
    }
  })

  test('the governed relationship REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 remains CRC-Eligible: Pending -- COPY-004 publication is deliberately NOT bundled with related-topic activation', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')!
    expect(rel.lifecycle).toBe('Adopted')
    expect(rel.crc_eligible).toBe('Pending')
  })
})

describe('CLAIM-COPY-004 -- now reachable through exact Topic Retrieval (published 2026-08-17)', () => {
  test('lookupTopicClaims returns CLAIM-COPY-004 for a copyright_ownership goal, jurisdiction unconfirmed -- Global + empty applicability requirements means no gate to clear', () => {
    const result = lookupTopicClaims([copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'unknown' }, toolMentions: [] })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].claim_id).toBe('CLAIM-COPY-004-v1')
  })

  test('retrieve() produces exactly one result for a copyright_ownership goal, correctly tagged exact_topic', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'unknown' }, toolMentions: [] }, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0]).toMatchObject({ claim_id: 'CLAIM-COPY-004-v1', match_origin: 'exact_topic', matched_goal_category: 'copyright_ownership', relationship_id: null })
  })

  test('the relationship stays Pending -> passing TOPIC_RELATIONSHIPS_FIXTURE alongside COPY-004 does NOT additionally surface COPY-001/002/003 as related-topic content', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] }, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(out.results.filter((r) => r.match_origin === 'related_topic')).toEqual([])
    expect(out.results).toHaveLength(1) // COPY-004 only
  })

  test('InterpretationStatus is directly_relevant, not a stronger claim -- COPY-004 has empty unresolved_project_dependencies, so Case 3B never fires', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'unknown' }, toolMentions: [] })
    const [interp] = buildBoundedInterpretations([copyrightGoal()], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
  })
})

describe('Wave 1 real claims -- CLAIM-COPY-001/002/003 remain structurally excluded from Topic Retrieval (still Pending, unaffected by COPY-004\'s publication)', () => {
  test('lookupTopicClaims returns zero matches for a copyrightability goal (CLAIM-COPY-001/002/003) even with a directly-applicable goal + confirmed US jurisdiction -- Adopted does not bypass the crc_eligible gate', () => {
    const goal = copyrightabilityGoal()
    for (const id of ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']) {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)?.lifecycle).toBe('Adopted')
    }
    const result = lookupTopicClaims([goal], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] })
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toContainEqual({ identifier: 'copyrightability', reason: 'not_adopted_or_eligible' })
  })

  test('item F: relevant_applicability_unresolved cannot create a backdoor around CRC eligibility -- even though these Adopted claims carry non-empty unresolved_project_dependencies (Case 3B territory), crc_eligible: Pending excludes them before Case 3B logic is ever reached', () => {
    const claim001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-001-v1')!
    expect(claim001.unresolved_project_dependencies).toEqual(['human_creative_contribution_level'])
    expect(claim001.lifecycle).toBe('Adopted')
    expect(claim001.crc_eligible).toBe('Pending')
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] })
    expect(result.matches).toEqual([])
  })

  test('retrieve() produces zero results for a copyrightability goal (post-retag) even with a directly-applicable goal + confirmed jurisdiction', () => {
    const goal = copyrightabilityGoal()
    const out = retrieve(
      handoff(),
      MATRIX_FIXTURE,
      [goal],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] },
    )
    expect(out.results).toEqual([])
  })
})

describe('Wave 1 real claims -- end-to-end through the full CRC pipeline (2026-08-17 governance state: COPY-004 live, COPY-001/002/003 still withheld)', () => {
  test('a real copyright_ownership goal (CLAIM-COPY-004) against the real Wave 1 fixture now surfaces COPY-004\'s real governed statement -- directly_relevant, never a copyright/ownership conclusion, and COPY-001/002/003 content never leaks alongside it', () => {
    const goal = copyrightGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
      },
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).toBe(
      "Whether a platform's terms allow commercial use of the output, and whether that output is copyrighted (and who owns it), are two separate questions -- a platform granting commercial-use permission doesn't by itself answer either. This is relevant to who owns the copyright, though it doesn't by itself determine the answer for your specific project.",
    )
    // Never the old "no coverage" template -- that would mean the
    // publication decision silently didn't take effect.
    expect(output.goal_interpretations[0].summary).not.toContain("doesn't establish an answer")
    // Never a copyright/ownership conclusion in either direction.
    expect(output.goal_interpretations[0].summary).not.toMatch(/\byou own\b|\byou do not own\b|\bis copyrightable\b|\bis not copyrightable\b/i)
    // COPY-001/002/003's own still-withheld content never leaks in alongside COPY-004's.
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('bedrock')
    expect(serialized).not.toContain('Thaler')
    expect(serialized).not.toContain('sweat of the brow')
    expect(serialized).not.toContain('sufficient human creative contribution')
    expect(serialized).not.toContain('perceptible portion')
    expect(serialized).not.toContain('DRAFT')
    // No internal relationship/claim-id metadata rendered to the user.
    expect(serialized).not.toContain('REL-COPY-OWNERSHIP-COPYRIGHTABILITY')
    expect(serialized).not.toContain('relevant_consideration')
  })

  test('a real copyrightability goal (CLAIM-COPY-001/002/003, post-retag) against the real Wave 1 fixture still produces outside_current_coverage, never the draft claim content -- unaffected by COPY-004\'s own publication', () => {
    const goal = copyrightabilityGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
      },
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).toContain("doesn't establish an answer")
    expect(output.goal_interpretations[0].summary).not.toContain("there isn't enough project-specific information")
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('bedrock')
    expect(serialized).not.toContain('Thaler')
    expect(serialized).not.toContain('sweat of the brow')
    expect(serialized).not.toContain('sufficient human creative contribution')
    expect(serialized).not.toContain('perceptible portion')
    expect(serialized).not.toContain('DRAFT')
    expect(serialized).not.toContain('RE-VERIFIED')
  })

  test('commercial_use goal isolation: COPY-004 never appears for an unrelated goal category in the same conversation', () => {
    const commercialGoal: UserGoal = {
      goal_id: 'g-2',
      state: 'confirmed',
      raw_text: 'Can I use this commercially?',
      category: 'commercial_use',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Can I use this commercially?',
    }
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialGoal],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('CLAIM-COPY-004')
    expect(serialized).not.toContain("doesn't by itself answer either")
  })
})
