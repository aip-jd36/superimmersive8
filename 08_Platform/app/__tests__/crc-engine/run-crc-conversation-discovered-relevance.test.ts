/**
 * Track A — Generic Discovered Relevance milestone (2026-08-21). End-to-end
 * proof against the EXACT confirmed production state (session
 * `2dcf86f0-...`, 2026-08-20 iStock UAT) that runCRCConversation() now
 * surfaces the iStock stock claim in `knowledge_items`, without
 * fabricating a `third_party_source_rights` UserGoal and without any
 * false "you asked" framing in `goal_interpretations`.
 *
 * Test IDs below (R-U, plus the canonical acceptance test A-G from
 * Section 24) map to this milestone's own required test matrix.
 */

import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { StructuredUnderstanding } from '@/types/interview-engine'

/**
 * Byte-shape reconstruction of the real confirmed production session's
 * structured_understanding (see the CRC Living Knowledge Architecture
 * Diagnostic's own session-verification task, 2026-08-20) -- exactly one
 * commercial_use goal, one confirmed canonical iStock mention, no
 * third_party_source_rights goal, one confirmed Kling tool mention.
 */
function productionIstockSessionState(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'an AI-generated video for a client' }, source_turn: 1, source_statement: 'in an AI-generated video for a client' },
      workflow_role: { attestation: { state: 'confirmed', value: 'creative producer' }, source_turn: 3, source_statement: 'I was the creative producer' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'confirmed', value: 'generated the AI content myself' }, source_turn: 3, source_statement: 'I generated the AI content myself' },
    },
    tool_mentions: [
      { mention_id: 't4-c2', resolution: { kind: 'canonical', identifier: 'kling' }, access_surface: { state: 'unknown' }, plan_tier: { state: 'confirmed', value: 'paid tier' }, confidence: 'confirmed', source_turn: 4, source_statement: 'I was on the paid tier.', superseded_by: null },
    ],
    scoped_observations: [
      { observation_id: 't5-c1', scope: 'current_project', workflow_stage: 'T0', confidence: 'confirmed', status: null, note: 'the client gave me their logo to use', superseded_by: null, source_turn: 5, source_statement: 'the client gave me their logo to use' },
    ],
    user_goals: [{ goal_id: 't1-c3', state: 'confirmed', raw_text: 'Can I use that commercially?', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'Can I use that commercially?' }],
    asset_provider_mentions: [
      { mention_id: 't1-c1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', source_turn: 1, source_statement: 'iStock images', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } },
    ],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: 'questioning_exhausted',
    opt_out_scope: null,
  }
}

describe('canonical production acceptance test (Section 24)', () => {
  test('A/B: effective relevance includes commercial_use (explicit) and Retrieval considers stock claims for the discovered third_party_source_rights topic', () => {
    const { output, trace } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const stockResult = trace.retrieval_results.find((r) => r.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(stockResult).toBeDefined()
    expect(stockResult?.matched_goal_category).toBe('third_party_source_rights')
    // Generic stock claims also surface.
    expect(trace.retrieval_results.some((r) => r.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v1')).toBe(true)
    expect(output).toBeDefined()
  })

  // C. provider_scope: generic claims pass, iStock claim passes, Getty/Shutterstock fail
  test('C: only iStock-scoped and generic stock claims are retrieved -- Getty/Shutterstock never leak in from a single-provider session', () => {
    const { trace } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const ids = trace.retrieval_results.map((r) => r.claim_id)
    expect(ids).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
  })

  // D. no fabricated third_party_source_rights UserGoal exists
  test('D: no third_party_source_rights UserGoal is ever fabricated -- the input StructuredUnderstanding is never mutated by this pipeline', () => {
    const su = productionIstockSessionState()
    runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(su.user_goals).toHaveLength(1)
    expect(su.user_goals[0].category).toBe('commercial_use')
    expect(su.user_goals.some((g) => g.category === 'third_party_source_rights')).toBe(false)
  })

  // E. output does not falsely say the user explicitly asked a stock-rights question
  test('E/U: goal_interpretations contains ONLY the real commercial_use goal_text -- no fabricated "you asked about stock rights" framing', () => {
    const { output } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].goal_text).toBe('Can I use that commercially?')
    // No interpretation entry mentions or was generated for a stock/rights/iStock goal.
    expect(output.goal_interpretations.every((gi) => gi.goal_text === 'Can I use that commercially?')).toBe(true)
  })

  // Section 34: the discovered knowledge is NOT silently dropped -- it
  // surfaces in knowledge_items, the one Projection container that is not
  // keyed to explicit UserGoal at all.
  test('discovered stock knowledge is NOT silently discarded -- it appears in knowledge_items even without its own goal_interpretation', () => {
    const { output } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.some((k) => k.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')).toBe(true)
  })
})

describe('R/S: exact production opening extraction result unchanged, downstream discovery gained', () => {
  test('R: the reconstructed production state itself carries exactly commercial_use + iStock provider mention, nothing else goal/provider-shaped -- Track A operates strictly downstream of this already-correct extraction result', () => {
    const su = productionIstockSessionState()
    expect(su.user_goals.map((g) => g.category)).toEqual(['commercial_use'])
    expect(su.asset_provider_mentions.map((m) => m.resolution.kind === 'canonical' && m.resolution.identifier)).toEqual(['istock'])
  })

  test('S: that same state gains discovered third_party_source_rights relevance only at the Retrieval/readiness boundary, never by altering the state itself', () => {
    const su = productionIstockSessionState()
    const before = JSON.stringify(su)
    runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(JSON.stringify(su)).toBe(before) // untouched by the pipeline
  })
})
