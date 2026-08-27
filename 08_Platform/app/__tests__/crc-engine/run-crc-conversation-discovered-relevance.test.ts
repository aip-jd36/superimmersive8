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
      { mention_id: 't4-c2', resolution: { kind: 'canonical', identifier: 'kling' }, access_surface: { state: 'unknown' }, plan_tier: { state: 'confirmed', value: 'paid tier' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 4, source_statement: 'I was on the paid tier.', superseded_by: null },
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
  // A/B, Track C — Discovered-Topic Goal Provenance (2026-08-21): the
  // discovered stock result now carries the ORIGINATING explicit goal
  // category (commercial_use) as matched_goal_category, not the claim's own
  // intrinsic topic (third_party_source_rights) -- this is the exact fix
  // this milestone implements. `topic` still correctly names the claim's
  // own subject, unchanged.
  test('A/B: effective relevance includes commercial_use (explicit) and Retrieval considers stock claims for the discovered third_party_source_rights topic', () => {
    const { output, trace } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const stockResult = trace.retrieval_results.find((r) => r.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(stockResult).toBeDefined()
    expect(stockResult?.matched_goal_category).toBe('commercial_use')
    expect(stockResult?.topic).toBe('third_party_source_rights')
    expect(stockResult?.match_origin).toBe('discovered_topic')
    // Stock-editorial claims also surface, also attributed to commercial_use.
    // CLAIM-STOCK-EDITORIAL-001-v1 renamed to -v2 (2026-08-27, Governance
    // Correction Review, governance-reviews/FGR_007_STOCK_EDITORIAL_
    // PROVIDER_SCOPE_CORRECTION_2026-08-27.md) -- provider_scope corrected
    // from null to an evidence-bounded set that still includes iStock, so
    // this scenario's own outcome is unaffected in substance.
    const genericStockResult = trace.retrieval_results.find((r) => r.claim_id === 'CLAIM-STOCK-EDITORIAL-001-v2')
    expect(genericStockResult).toBeDefined()
    expect(genericStockResult?.matched_goal_category).toBe('commercial_use')
    expect(output).toBeDefined()
  })

  // The actual defect this milestone closes (Track C diagnostic Section 2/4):
  // the commercial_use goal_interpretation must no longer be
  // outside_current_coverage now that discovered stock knowledge correctly
  // attributes to it -- it reaches the SAME relevant_applicability_unresolved
  // template copyright's own H5 already uses, with the governed stock
  // statements quoted, using EXISTING template machinery only (no new
  // final-answer copy authored by this milestone).
  test('the commercial_use interpretation is no longer outside_current_coverage -- its rendered summary quotes the discovered stock guidance instead of the "no governed guidance" fallback', () => {
    const { output } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.goal_interpretations).toHaveLength(1)
    const interp = output.goal_interpretations[0]
    expect(interp.goal_text).toBe('Can I use that commercially?')
    expect(interp.summary).not.toMatch(/doesn't currently have governed guidance/)
    // Quotes the real governed stock statements verbatim (H5-shaped:
    // relevant, but project-specific evidence unresolved) -- not a
    // fabricated determination that the project IS or ISN'T cleared. See
    // build-bounded-interpretation-discovered-topic.test.ts for the
    // unit-level proof of the exact `status`/`supporting_claim_ids` this
    // rendered summary comes from.
    expect(interp.summary).toMatch(/Editorial/)
    expect(interp.summary).toMatch(/there isn't enough project-specific information to determine how it applies/)
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

  // CC-1 -- Claim-Level Bounded Grouping (2026-08-21): the canonical
  // Kling + generic-stock + iStock case, at the full runCRCConversation()
  // level. Before CC-1, Kling's own dependency-free claim was flattened
  // into the same undifferentiated join as the two dependency-bearing stock
  // claims. This proves: Kling guidance survives, generic stock guidance
  // survives, iStock guidance survives, the dependency-free (Kling) content
  // is grouped into its own distinguishable clause ahead of the
  // dependency-bearing content, the overall status/hedge is unchanged, and
  // no stronger conclusion (about Kling OR about the stock claims) is
  // generated.
  test('4. canonical Kling + iStock -- Kling guidance is grouped distinguishably from dependency-bearing stock/iStock guidance, overall bounded treatment preserved, no stronger conclusion', () => {
    const { output } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const interp = output.goal_interpretations[0]

    // All three governed statements survive, verbatim.
    expect(interp.summary).toContain(
      "Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission.",
    )
    expect(interp.summary).toContain('A stock-media provider\'s standard license for content marked "Editorial"')
    expect(interp.summary).toContain('iStock\'s standard license doesn\'t cover commercial')

    // Kling (the only dependency-free match) is grouped into its own
    // clause, using the EXISTING directly_relevant-style boundary sentence,
    // ordered before the dependency-bearing stock/iStock content.
    expect(interp.summary).toContain("though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.")
    expect(interp.summary.indexOf("Kling's commercial-use permissions")).toBeLessThan(interp.summary.indexOf('A stock-media provider'))

    // The single, unchanged unresolved-applicability hedge still governs
    // the overall goal -- exactly once, not duplicated per group.
    expect(interp.summary).toContain("there isn't enough project-specific information to determine how it applies")
    expect(interp.summary.match(/A human-reviewed Commercial Assurance Assessment can address this directly\./g)).toHaveLength(1)

    // Bounded status unchanged -- CC-1 does not create a stronger or a
    // weaker overall conclusion for the goal.
    expect(output.goal_interpretations).toHaveLength(1)

    // No stronger conclusion about EITHER Kling or the stock/iStock claims.
    const noConclusionLanguage =
      /\bresolved\b|\bappears resolved\b|\bsatisfied\b|\bverified\b|\bchecked\b|\bcleared\b|\bsafe\b|\bapproved\b|commercially usable|not a blocker|not the issue|no longer an issue|primary blocker|material issue|only remaining issue|commercially cleared/i
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })

  // 5. Multiple dependency-bearing stock claims (generic-001 + istock) --
  // both governed statements survive; neither is singled out as primary.
  test('5. multiple dependency-bearing stock claims -- all governed statements survive, none arbitrarily selected as the primary/material issue', () => {
    const { output, trace } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const dependencyBearingResults = trace.retrieval_results.filter((r) => r.matched_goal_category === 'commercial_use' && r.unresolved_project_dependencies.length > 0)
    const dependencyBearingIds = dependencyBearingResults.map((r) => r.claim_id)
    // CLAIM-STOCK-EDITORIAL-001-v1 renamed to -v2 (2026-08-27, Governance
    // Correction Review) -- still matches iStock, so this scenario's own
    // outcome is unaffected in substance. -002-v2 also now legitimately
    // appears (arrayContaining does not require an exhaustive match).
    expect(dependencyBearingIds).toEqual(expect.arrayContaining(['CLAIM-STOCK-EDITORIAL-001-v2', 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1']))
    const interp = output.goal_interpretations[0]
    // Every dependency-bearing claim's own governed statement is quoted --
    // none dropped, none singled out as "the" answer.
    for (const r of dependencyBearingResults) {
      expect(interp.summary).toContain(r.candidate_statement)
    }
    expect(interp.summary).not.toMatch(/primary|material issue|main (issue|blocker)/i)
  })

  // CC-2 -- Semantics-Preserving Rhetorical Composition (2026-08-21): the
  // canonical Kling + generic-stock + iStock case, at the full
  // runCRCConversation() level. Locks in the repetition reduction this
  // milestone exists to make: before CC-2, "This is relevant to whether
  // this can be used commercially," was asserted twice, verbatim, in this
  // exact answer (once for Kling's own dependency-free clause, once as the
  // closing hedge's lead-in). CC-2 removes only the second, redundant
  // occurrence -- every governed statement, the boundary clause, the
  // closing hedge substance, and the bridge sentence all remain unchanged.
  test('6. CC-2: canonical Kling + iStock -- "This is relevant to" appears exactly once, not twice, with all governed content and authority boundaries unchanged', () => {
    const { output } = runCRCConversation(productionIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const interp = output.goal_interpretations[0]

    expect(interp.summary.match(/This is relevant to/g)).toHaveLength(1)

    // Every governed statement still survives, verbatim.
    expect(interp.summary).toContain(
      "Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission.",
    )
    expect(interp.summary).toContain('A stock-media provider\'s standard license for content marked "Editorial"')
    expect(interp.summary).toContain('iStock\'s standard license doesn\'t cover commercial')

    // Kling's own boundary clause is unchanged, byte-for-byte.
    expect(interp.summary).toContain("though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.")

    // The closing hedge's SUBSTANCE is unchanged -- only its redundant
    // lead-in was removed.
    expect(interp.summary).toContain("But based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project.")
    expect(interp.summary.match(/A human-reviewed Commercial Assurance Assessment can address this directly\./g)).toHaveLength(1)

    // No stronger conclusion introduced by the reworded transition.
    const noConclusionLanguage =
      /\bresolved\b|\bsatisfied\b|\bverified\b|\bchecked\b|\bcleared\b|\bsafe\b|\bapproved\b|commercially usable|not a blocker|\bblocker\b|main concern|material issue|only remaining issue|commercially cleared|because of this|\btherefore\b/i
    expect(interp.summary).not.toMatch(noConclusionLanguage)
  })
})

// O. Multi-goal isolation (Track C — Discovered-Topic Goal Provenance,
// 2026-08-21): discovered knowledge must attribute ONLY to parent goals the
// trigger's own allowed_parent_goals actually authorizes -- never to every
// active explicit goal simply because it happens to be active this turn.
describe('O: multi-goal isolation -- discovered stock knowledge supports commercial_use only, never an unrelated active goal', () => {
  function multiGoalIstockSessionState(): StructuredUnderstanding {
    const base = productionIstockSessionState()
    return {
      ...base,
      user_goals: [
        ...base.user_goals,
        { goal_id: 't1-c4', state: 'confirmed', raw_text: 'Do I own the copyright?', category: 'copyright_ownership', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'Do I own the copyright?' },
      ],
    }
  }

  test('with commercial_use AND copyright_ownership both active, the discovered stock RetrievalResult is attributed ONLY to commercial_use (the trigger\'s own allowed_parent_goals), never copyright_ownership', () => {
    const { trace } = runCRCConversation(multiGoalIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const discoveredStockResults = trace.retrieval_results.filter((r) => r.match_origin === 'discovered_topic')
    expect(discoveredStockResults.length).toBeGreaterThan(0)
    for (const r of discoveredStockResults) {
      expect(r.matched_goal_category).toBe('commercial_use')
      expect(r.matched_goal_category).not.toBe('copyright_ownership')
    }
  })

  test('the copyright_ownership interpretation is unaffected by the stock discovery -- no stock content leaks into it', () => {
    const { output } = runCRCConversation(multiGoalIstockSessionState(), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.goal_interpretations).toHaveLength(2)
    const copyrightInterp = output.goal_interpretations.find((i) => i.goal_text === 'Do I own the copyright?')
    expect(copyrightInterp).toBeDefined()
    expect(copyrightInterp?.summary).not.toMatch(/Editorial/)
    expect(copyrightInterp?.summary).not.toMatch(/iStock/)
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
