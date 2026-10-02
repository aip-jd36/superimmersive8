/**
 * CRC-CC-RENDERER-SCOPED-CONTEXT-1C (2026-10-02) -- Web/Email Realization
 * Convergence Plumbing. `CRCPipelineResult.realization` is a new, purely
 * additive field: the SAME authoritative `buildConsultativeRealization`
 * call `results-email-delivery.ts` already makes, computed once inside
 * `runCRCConversation()` from the SAME `plan`/`output`/`consultative_notes`
 * that function already produces.
 *
 * This file does NOT re-prove `buildConsultativeRealization`'s own internal
 * correctness (primary/scoped_context classification, grouping,
 * deduplication, etc.) -- that is already comprehensively covered by
 * `consultative-realization-contract.test.ts` and
 * `consultative-realization-presentation-role.test.ts`, both untouched and
 * still passing byte-identically against baseline. This file's own job is
 * narrower: prove the NEW PLUMBING -- that `runCRCConversation()`'s own
 * `realization` field is produced by calling that exact same function with
 * the exact same inputs (semantic parity), that `presentation_role` survives
 * end-to-end through the real pipeline for both a genuine known-non-match
 * and a genuinely-missing-information case, and that adding this field
 * changes nothing about `output`/`plan`/`consultative_notes`.
 *
 * Reuses the real, committed `TOPIC_CLAIMS_FIXTURE` (the California/New
 * York synthetic-performer sibling pair already used by
 * `ca-bpc-17610-synthetic-performer-disclosure-reachability.test.ts`) and
 * that file's own fixture-building conventions -- not a fixture invented
 * for this milestone, and not a claim-specific production assertion: the
 * purpose is proving the GENERIC role survives the new plumbing, never
 * jurisdiction-specific behavior.
 */

import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const CA_CLAIM_ID = 'CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1'
const NY_CLAIM_ID = 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1'

function likenessGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    category: 'likeness',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    ...overrides,
  }
}

/** California established as the sole assessment jurisdiction -- the CA claim's own requirement is met; the NY sibling's own requirement is a known non-match (California IS established, just not New York). */
function suWithCAJurisdiction(): StructuredUnderstanding {
  return {
    ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
    user_goals: [likenessGoal()],
    project_facts: {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
      jurisdiction: { attestation: { state: 'confirmed', value: 'California' }, source_turn: 1, source_statement: 'California' },
    },
  }
}

/** No jurisdiction established at all -- genuinely missing information for BOTH siblings. */
function suWithNoJurisdiction(): StructuredUnderstanding {
  return { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [likenessGoal()] }
}

describe('CRC-CC-RENDERER-SCOPED-CONTEXT-1C -- realization plumbing', () => {
  test('semantic parity: CRCPipelineResult.realization deep-equals buildConsultativeRealization(plan, output, consultative_notes) built independently from the SAME result', () => {
    const su = suWithCAJurisdiction()
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const independentlyBuilt = buildConsultativeRealization(result.plan, result.output, result.consultative_notes)
    expect(result.realization).toEqual(independentlyBuilt)
  })

  test('semantic parity holds for the genuinely-missing-information fixture too', () => {
    const su = suWithNoJurisdiction()
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const independentlyBuilt = buildConsultativeRealization(result.plan, result.output, result.consultative_notes)
    expect(result.realization).toEqual(independentlyBuilt)
  })

  test('known non-match (California established, New York sibling requires New York) survives end-to-end as presentation_role: scoped_context inside CRCPipelineResult.realization', () => {
    const su = suWithCAJurisdiction()
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

    // Reproduction-validity check: confirm the real pipeline actually
    // reached both claims this turn (otherwise this test would prove
    // nothing).
    expect(result.output.knowledge_items.map((k) => k.claim_id)).toContain(CA_CLAIM_ID)

    const nyItem = result.realization.unresolved_item_presentation.find(
      (p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === NY_CLAIM_ID,
    )
    expect(nyItem).toBeDefined()
    expect(nyItem?.item.kind === 'unresolved_applicability' ? nyItem.item.unresolved_reason : undefined).toBe('value_not_among_established_values')
    expect(nyItem?.presentation_role).toBe('scoped_context')
  })

  test('genuinely missing jurisdiction -> the unresolved item remains presentation_role: primary end-to-end (fail-closed preserved)', () => {
    const su = suWithNoJurisdiction()
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

    const caItem = result.realization.unresolved_item_presentation.find(
      (p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === CA_CLAIM_ID,
    )
    expect(caItem).toBeDefined()
    expect(caItem?.item.kind === 'unresolved_applicability' ? caItem.item.unresolved_reason : undefined).toBeNull()
    expect(caItem?.presentation_role).toBe('primary')
  })

  test('zero product change: output/plan/consultative_notes retain their own existing shape and content with realization now present', () => {
    const su = suWithCAJurisdiction()
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

    // Same assertions the pre-existing, untouched reachability test suite
    // already makes against `output` alone -- reproduced here against the
    // SAME call that also now produces `realization`, proving its presence
    // changes nothing about these three fields.
    const fixtureClaim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CA_CLAIM_ID)!
    const item = result.output.knowledge_items.find((k) => k.claim_id === CA_CLAIM_ID)
    expect(item?.statement).toBe(fixtureClaim.crc_candidate_statement)
    expect(result.plan.explicit_sections).toHaveLength(1)
    expect(Array.isArray(result.consultative_notes)).toBe(true)
  })
})
