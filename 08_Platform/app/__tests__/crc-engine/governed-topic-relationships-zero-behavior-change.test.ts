/**
 * Zero-behavior-change proof (Governed Topic Relationships implementation
 * milestone, 2026-08-16) -- uses the REAL governed fixtures
 * (TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE), never synthetic
 * eligible ones, through the REAL production entry point
 * (runCRCConversation, the exact function every live call site
 * (app/api/crc/turn/route.ts, run-turn.ts, results-email-delivery.ts) uses).
 *
 * Two independent layers of protection are proven here, deliberately both:
 *
 *   1. runCRCConversation()'s signature has no `relationships` parameter at
 *      all -- TOPIC_RELATIONSHIPS_FIXTURE is not threaded through any real
 *      call site by this milestone (a deliberate, minimal-footprint choice
 *      -- see the implementation report). retrieve()'s own `relationships`
 *      parameter defaults to `[]` whenever runCRCConversation calls it, so
 *      related-topic retrieval never even executes in production today,
 *      independent of any governance state.
 *   2. Even calling retrieve() DIRECTLY with the real
 *      TOPIC_RELATIONSHIPS_FIXTURE explicitly passed, the one real
 *      relationship (REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1) is
 *      `crc_eligible: 'Pending'`, so lookupRelatedTopicClaims() excludes it
 *      before any target claim is even considered -- the double gate
 *      (see lookup-topic-relationships.ts) never gets a chance to matter
 *      because the first gate alone already blocks it.
 *
 * Either layer alone would be sufficient; both are proven so a future
 * change to one doesn't silently remove the other's protection unnoticed.
 */

import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

function ownershipGoal(): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Do I own the copyright?',
    category: 'copyright_ownership',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Do I own the copyright?',
  }
}

describe('governance state as of this milestone -- confirms the premise the rest of this file relies on', () => {
  test('the real relationship record is Adopted but CRC-Eligible: Pending', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')
    expect(rel).toBeDefined()
    expect(rel!.lifecycle).toBe('Adopted')
    expect(rel!.crc_eligible).toBe('Pending')
  })

  test('all four real copyright claims remain Adopted but CRC-Eligible: Pending -- unchanged by this milestone', () => {
    const copyrightClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-COPY-'))
    expect(copyrightClaims).toHaveLength(4)
    for (const c of copyrightClaims) {
      expect(c.lifecycle).toBe('Adopted')
      expect(c.crc_eligible).toBe('Pending')
    }
  })
})

describe('layer 1 -- the real production orchestrator never threads relationships through', () => {
  test('the canonical live scenario ("Do I own the copyright?") via runCRCConversation with the REAL TOPIC_CLAIMS_FIXTURE produces outside_current_coverage, unchanged from pre-milestone behavior', () => {
    const su: StructuredUnderstanding = { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [ownershipGoal()] }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const interp = output.goal_interpretations[0]
    // ProjectionGoalInterpretation carries only goal_text/summary (status is
    // an internal-only BoundedInterpretation field, never exposed this far
    // downstream) -- the fixed outside_current_coverage template text
    // (rules.ts's own OUTSIDE_COVERAGE_BY_CATEGORY) is the observable proof
    // of the same status at this layer.
    expect(interp.summary).toBe("CRC's current governed knowledge doesn't establish an answer to who owns the copyright. A human-reviewed Commercial Assurance Assessment can address this directly.")

    // None of the four real copyright claim statements ever appear.
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      if (claim.crc_candidate_statement) {
        expect(interp.summary).not.toContain(claim.crc_candidate_statement)
      }
    }
    // No related-topic boundary clause -- nothing related-topic-sourced ever reached this interpretation.
    expect(interp.summary).not.toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    expect(JSON.stringify(output)).not.toContain('REL-COPY-OWNERSHIP-COPYRIGHTABILITY')
  })
})

describe('layer 2 -- even with the real relationship fixture explicitly passed to retrieve(), Pending blocks it', () => {
  test('retrieve() called directly with TOPIC_RELATIONSHIPS_FIXTURE + TOPIC_CLAIMS_FIXTURE produces zero related-topic results', () => {
    const handoff = { tools: [], unresolved_aliases: [], workflow_role: 'unresolved' as const, intended_use: 'unclear' as const, scoped_observations: [], certainty_state: 'gate_1_unmet' as const, exclusions: [] }
    const out = retrieve(
      handoff,
      MATRIX_FIXTURE,
      [ownershipGoal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { state: 'confirmed', value: 'United States' }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    const relatedResults = out.results.filter((r) => r.match_origin === 'related_topic')
    expect(relatedResults).toEqual([])
    expect(out.results).toEqual([]) // COPY-004 (exact-topic) is also still Pending -- zero results overall, exactly as before this milestone
  })
})
