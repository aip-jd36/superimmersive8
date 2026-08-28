/**
 * Track A — Generic Discovered Relevance milestone (2026-08-21). Retrieval
 * integration tests: proves `lookupTopicClaims`'s existing, UNCHANGED
 * `discoveredTopics` parameter correctly widens the active-topic universe
 * while leaving every existing gate (provider_scope, lifecycle,
 * crc_eligible, supersession, applicability) fully authoritative and
 * unmodified. Uses the REAL, live TOPIC_CLAIMS_FIXTURE (the five real
 * stock claims are already `crc_eligible: 'Yes'` in production) for the
 * strongest possible proof -- no synthetic clones needed for this file's
 * own scope.
 *
 * Test IDs below (K-Q) map to this milestone's own required test matrix,
 * Section 33.
 *
 * Track C — Discovered-Topic Goal Provenance (2026-08-21) update: the
 * `lookupTopicClaims`-direct tests (K-Q) above are UNCHANGED -- that
 * function's own `discoveredTopics: GoalCategory[]` parameter and behavior
 * remain fully intact; the real production `retrieve()` pipeline simply
 * stopped feeding it discovered topics, routing them through the new,
 * separate, goal-provenance-preserving `lookupDiscoveredTopicClaims` path
 * instead. The `retrieve()`-level describe block below (previously named
 * for the now-removed flat `discoveredTopics: GoalCategory[]` parameter)
 * was updated to construct real `DiscoveredTopicOccurrence` values and
 * assert the corrected `matched_goal_category`/`match_origin` provenance.
 */

import { lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { DiscoveredTopicOccurrence } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const UNKNOWN_FACTS: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

const NO_GOALS: UserGoal[] = []

function claimIds(matches: { claim_id: string }[]): string[] {
  return matches.map((m) => m.claim_id).sort()
}

describe('lookupTopicClaims — discoveredTopics additive parameter', () => {
  // K. generic stock claims retrieved under discovered topic
  // UPDATED 2026-08-27 (Governance Correction Review, governance-reviews/
  // FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md):
  // CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 are no longer provider_scope: null
  // -- their -v2 successors carry a corrected, evidence-bounded scope, so
  // with NO provider named at all, neither claim matches anymore. This is a
  // real behavioral change (not a rename): a user who names no provider no
  // longer receives stock-media-specific guidance, matching the corrected
  // scope exactly.
  test('K: no explicit goals, discoveredTopics=[third_party_source_rights], no providers -> ZERO stock-editorial claims retrieved (behavior change, 2026-08-27)', () => {
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['third_party_source_rights'])
    const ids = claimIds(result.matches)
    expect(ids).toEqual([])
  })

  // L. matching provider claim retrieved
  test('L: discoveredTopics=[third_party_source_rights] + assetProviders=[istock] -> iStock-specific claim retrieved alongside the stock-editorial v2 successors', () => {
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['istock'], ['third_party_source_rights'])
    const ids = claimIds(result.matches)
    expect(ids).toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(ids).toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).toContain('CLAIM-STOCK-EDITORIAL-002-v2')
  })

  // M. nonmatching provider claim excluded (Getty/Shutterstock leak check)
  test('M: assetProviders=[istock] only -> Getty and Shutterstock claims never leak in', () => {
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['istock'], ['third_party_source_rights'])
    const ids = claimIds(result.matches)
    expect(ids).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
  })

  test('multi-provider (Section 17): assetProviders=[istock, getty] -> both provider-specific claims retrieved, Shutterstock excluded', () => {
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['istock', 'getty'], ['third_party_source_rights'])
    const ids = claimIds(result.matches)
    expect(ids).toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(ids).toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
  })

  // N. CRC Pending claim excluded -- proven via a synthetic Pending clone,
  // since every real stock claim today is already crc_eligible: 'Yes'.
  test('N: a Pending (crc_eligible: No) claim for the discovered topic is excluded even though the topic is active', () => {
    const pendingClaim = { ...TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')!, claim_id: 'CLAIM-STOCK-TEST-PENDING', crc_eligible: 'No' as const }
    const result = lookupTopicClaims(NO_GOALS, [...TOPIC_CLAIMS_FIXTURE, pendingClaim], UNKNOWN_FACTS, ['istock'], ['third_party_source_rights'])
    expect(claimIds(result.matches)).not.toContain('CLAIM-STOCK-TEST-PENDING')
  })

  // O. superseded claim excluded
  test('O: a superseded claim for the discovered topic is excluded', () => {
    const supersededClaim = { ...TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')!, claim_id: 'CLAIM-STOCK-TEST-SUPERSEDED', superseded_by: 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1' }
    const result = lookupTopicClaims(NO_GOALS, [...TOPIC_CLAIMS_FIXTURE, supersededClaim], UNKNOWN_FACTS, ['istock'], ['third_party_source_rights'])
    expect(claimIds(result.matches)).not.toContain('CLAIM-STOCK-TEST-SUPERSEDED')
  })

  // P. applicability_requirements still enforced normally (using a copyright
  // claim, which DOES have a real applicability_requirements gate, to prove
  // discoveredTopics doesn't bypass it).
  test('P: applicability_requirements is still fully enforced for a discovered topic -- a copyright claim with an unmet jurisdiction requirement stays excluded even when discovered', () => {
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['copyrightability'])
    const ids = claimIds(result.matches)
    // COPY-001/002/003 (topic: copyrightability) require jurisdiction ===
    // 'United States'; UNKNOWN_FACTS has jurisdiction unconfirmed, so none
    // should pass even though the topic itself is (hypothetically)
    // discovered/active.
    expect(ids).not.toContain('CLAIM-COPY-001-v1')
    expect(ids).not.toContain('CLAIM-COPY-002-v1')
    expect(ids).not.toContain('CLAIM-COPY-003-v1')
  })

  test('P2: applicability satisfied -> copyright claims DO pass when discovered, proving the gate is a real pass/fail check, not a bypass', () => {
    const confirmedUSFacts: ApplicabilityFacts = { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] }
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, confirmedUSFacts, [], ['copyrightability'])
    const ids = claimIds(result.matches)
    expect(ids).toContain('CLAIM-COPY-001-v1')
  })

  // Q. explicit Path A unchanged
  test('Q: explicit-only call (discoveredTopics omitted) is byte-identical to pre-Track-A behavior -- no stock claim surfaces without an explicit or discovered third_party_source_rights topic', () => {
    const result = lookupTopicClaims(NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['istock'])
    expect(claimIds(result.matches)).not.toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
  })

  test('explicit third_party_source_rights goal (Path A) still works exactly as before, with discoveredTopics defaulted', () => {
    const explicitGoal: UserGoal[] = [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'x', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }]
    const result = lookupTopicClaims(explicitGoal, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['istock'])
    expect(claimIds(result.matches)).toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
  })
})

describe('retrieve() — discoveredTopicOccurrences additive parameter, end-to-end (Track C — Discovered-Topic Goal Provenance, 2026-08-21)', () => {
  function handoffFor(): RetrievalHandoff {
    return buildRetrievalHandoff({
      project_facts: {
        intended_use: { attestation: { state: 'confirmed', value: 'an ad' }, source_turn: 1, source_statement: 'x' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
      tool_mentions: [],
      scoped_observations: [],
      user_goals: [],
      asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', source_turn: 1, source_statement: 'iStock', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
      assessment_jurisdiction_mentions: [],
      current_phase: 2,
      gate_1_state: 'met',
      gate_2_state: 'not_yet_stable',
      completion_reason: null,
      opt_out_scope: null,
    } as StructuredUnderstanding)
  }

  const ISTOCK_DISCOVERY_OCCURRENCE: DiscoveredTopicOccurrence = {
    topic: 'third_party_source_rights',
    trigger_id: 'asset_provider_mention_to_third_party_source_rights',
    source_kind: 'asset_provider_mention',
    source_id: 'ap-1',
    source_goal_category: 'commercial_use',
  }

  // B/D. discovered stock result carries the ORIGINATING explicit goal
  // category (commercial_use), not the claim's own intrinsic topic
  // (third_party_source_rights) -- this is the Track C fix itself, proven
  // at the Retrieval layer directly (independent of discovered-relevance.ts's
  // own derivation, which has its own dedicated tests).
  test('retrieve() with discoveredTopicOccurrences returns the iStock stock claim as a real RetrievalResult, matched_goal_category is the ORIGINATING explicit goal (commercial_use), match_origin discovered_topic', () => {
    const { results } = retrieve(handoffFor(), MATRIX_FIXTURE, NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['istock'], [ISTOCK_DISCOVERY_OCCURRENCE])
    const stockResult = results.find((r) => r.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(stockResult).toBeDefined()
    expect(stockResult?.matched_goal_category).toBe('commercial_use')
    expect(stockResult?.topic).toBe('third_party_source_rights')
    expect(stockResult?.match_origin).toBe('discovered_topic')
    expect(stockResult?.relationship_id).toBeNull()
  })

  test('retrieve() without discoveredTopicOccurrences (existing call sites) is unaffected -- zero results for stock claims', () => {
    const { results } = retrieve(handoffFor(), MATRIX_FIXTURE, NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['istock'])
    expect(results.find((r) => r.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')).toBeUndefined()
  })

  // I/J. corrected-scope claims (-001-v2, -002-v2) + the iStock-specific
  // claim all surface via the discovered path, since all three list 'istock'
  // in their provider_scope; G/H (Getty/Shutterstock) still excluded by the
  // unchanged provider pre-filter. Updated 2026-08-27: the two stock-editorial
  // IDs are the v2 successors (see FGR_007) -- v1 predecessors are Deprecated
  // with superseded_by set, so they no longer surface at all, by design.
  test('corrected-scope stock claims and the iStock-specific claim all surface via discoveredTopicOccurrences; Getty/Shutterstock do not (provider_scope unchanged)', () => {
    const { results } = retrieve(handoffFor(), MATRIX_FIXTURE, NO_GOALS, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['istock'], [ISTOCK_DISCOVERY_OCCURRENCE])
    const ids = results.map((r) => r.claim_id)
    expect(ids).toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).toContain('CLAIM-STOCK-EDITORIAL-002-v2')
    expect(ids).toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-002-v1')
    expect(ids).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
    // Every discovered result carries the originating goal category, never
    // the claim's own intrinsic topic.
    for (const r of results.filter((r) => r.match_origin === 'discovered_topic')) {
      expect(r.matched_goal_category).toBe('commercial_use')
    }
  })

  // P. explicit Path A retrieval remains unchanged when discoveredTopicOccurrences is empty/omitted.
  test('P: explicit third_party_source_rights goal (Path A) still works exactly as before, unaffected by discoveredTopicOccurrences', () => {
    const explicitGoal: UserGoal[] = [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'x', category: 'third_party_source_rights', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }]
    const { results } = retrieve(handoffFor(), MATRIX_FIXTURE, explicitGoal, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['istock'])
    const stockResult = results.find((r) => r.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(stockResult).toBeDefined()
    expect(stockResult?.matched_goal_category).toBe('third_party_source_rights')
    expect(stockResult?.match_origin).toBe('exact_topic')
  })
})
