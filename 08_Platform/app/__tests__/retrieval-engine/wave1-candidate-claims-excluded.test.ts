/**
 * Wave 1 candidate-claim exclusion proof (CRC Living Knowledge Phase 1,
 * 2026-08-16). Uses the REAL TOPIC_CLAIMS_FIXTURE content (four real
 * Candidate-lifecycle U.S. copyright claims, drafted 2026-08-16, pending
 * PM review) rather than a synthetic test double -- direct proof that
 * `Lifecycle: Candidate` + `Publication scope: Internal/research` claims
 * cannot reach CRC output even though they exist, are well-formed, and
 * have real, independently-verified content ready to go the moment they
 * are approved.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
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

describe('Wave 1 real candidate claims -- confirmed still Candidate/Pending, never CRC-eligible', () => {
  test('all four Wave 1 claims are present in the fixture', () => {
    expect(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id).sort()).toEqual([
      'CLAIM-COPY-001-v1',
      'CLAIM-COPY-002-v1',
      'CLAIM-COPY-003-v1',
      'CLAIM-COPY-004-v1',
    ])
  })

  test('none of them are Lifecycle: Adopted', () => {
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      expect(claim.lifecycle).toBe('Candidate')
    }
  })

  test('none of them are CRC-Eligible: Yes', () => {
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      expect(claim.crc_eligible).toBe('Pending')
    }
  })
})

describe('Wave 1 real candidate claims -- structurally excluded from Topic Retrieval', () => {
  test('lookupTopicClaims returns zero matches even with a directly-applicable goal + confirmed US jurisdiction', () => {
    const goal = copyrightGoal()
    const result = lookupTopicClaims([goal], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] })
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toContainEqual({ identifier: 'copyright_ownership', reason: 'not_adopted_or_eligible' })
  })

  test('retrieve() produces zero results from these claims even with a directly-applicable goal + confirmed jurisdiction', () => {
    const goal = copyrightGoal()
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

describe('Wave 1 real candidate claims -- structurally excluded end-to-end through the full CRC pipeline', () => {
  test('a real copyright_ownership goal against the real Wave 1 fixture produces outside_current_coverage, never the draft claim content, never even with jurisdiction confirmed', () => {
    const goal = copyrightGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
      },
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).toContain("doesn't establish an answer")
    // None of the draft claim text can possibly leak, since it never even reaches Retrieval's output.
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('bedrock')
    expect(serialized).not.toContain('Thaler')
    expect(serialized).not.toContain('sufficient human creative contribution')
    expect(serialized).not.toContain('DRAFT')
  })
})
