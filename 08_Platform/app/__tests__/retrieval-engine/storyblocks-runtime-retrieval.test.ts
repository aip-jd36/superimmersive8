/**
 * Trial 2 (Living Knowledge onboarding benchmark, LK-42 protocol) --
 * Storyblocks real-publication retrieval tests (2026-08-30, LK-51).
 *
 * CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1 is the second real
 * provider_scope-narrowed TopicClaim to receive a real TOPIC_CLAIMS_FIXTURE
 * entry and CRC Publication approval (CRC Approver: JD (PM), 2026-08-30),
 * following CPR_010 -- with no intervening DEFER, unlike CLAIM-SYNTHESIA-
 * STOCK-PAID-PROMOTION-001-v1's own CPR_009.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone, mirroring exactly
 * what the now-deleted LK-50 scratch canary proved on a throwaway basis,
 * now made permanent because the claim is permanently, really reachable.
 * Structure mirrors music-a3-artlist-retrieval.test.ts exactly, adapted for
 * this claim's own commercial_use topic (A-3's is third_party_source_rights)
 * and single evidence-only dependency.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { runExtractionPipeline } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import type { AssetProviderMention, RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const SB_ID = 'CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1'

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

function commercialUseGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Can I use my Storyblocks footage in a broadcast TV spot?',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use my Storyblocks footage in a broadcast TV spot?',
    ...overrides,
  }
}

function providerMention(identifier: string): AssetProviderMention {
  return {
    mention_id: `m-${identifier}`,
    resolution: { kind: 'canonical', identifier },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `I used ${identifier}.`,
    superseded_by: null,
    usage: { state: 'unknown' },
    license: { state: 'unknown' },
  }
}

function suWithProvider(providerId: string | null, goalCategory: 'third_party_source_rights' | 'commercial_use' = 'commercial_use'): StructuredUnderstanding {
  return {
    ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
    user_goals: [commercialUseGoal({ category: goalCategory, raw_text: `Can I still use my ${providerId ?? 'project'} footage for broadcast?` })],
    asset_provider_mentions: providerId ? [providerMention(providerId)] : [],
  }
}

const UNKNOWN_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

// ── One-claim isolation (mirrors A-3's own §7) ──────────────────────────────

describe('one-claim isolation: Storyblocks is the only reachable CLAIM-STORYBLOCKS-* claim', () => {
  test('exactly one CLAIM-STORYBLOCKS-* entry exists in TOPIC_CLAIMS_FIXTURE', () => {
    const claims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-STORYBLOCKS'))
    expect(claims.map((c) => c.claim_id)).toEqual([SB_ID])
  })

  test('the claim is Lifecycle: Adopted and crc_eligible: Yes', () => {
    const sb = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === SB_ID)!
    expect(sb.lifecycle).toBe('Adopted')
    expect(sb.crc_eligible).toBe('Yes')
    expect(sb.provider_scope).toEqual(['storyblocks'])
    expect(sb.tool_scope).toBeNull()
  })
})

// ── Explicit-goal real pipeline ──────────────────────────────────────────────

describe('explicit-goal retrieval, real committed fixture', () => {
  test('POSITIVE: storyblocks + commercial_use goal -> claim returned, correct provider_scope, correct candidate statement', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['storyblocks'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).toEqual([SB_ID])
    const sb = result.matches[0]
    expect(sb.provider_scope).toEqual(['storyblocks'])
    expect(sb.crc_candidate_statement).toContain('Storyblocks')
    expect(sb.crc_candidate_statement).toContain('Broadcast, Television, or OTT')
  })

  test.each([
    ['Getty', 'getty'],
    ['iStock', 'istock'],
    ['Shutterstock', 'shutterstock'],
    ['Adobe Stock', 'adobe-stock'],
    ['Artlist', 'artlist'],
    ['an unknown/unregistered provider', 'some-unknown-provider-xyz'],
  ])('NEGATIVE: %s only -> claim absent', (_label, providerId) => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(SB_ID)
  })

  test('NEGATIVE: no provider named at all -> claim absent', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(SB_ID)
  })

  test('NEGATIVE: storyblocks provider present, no commercial_use goal -> claim absent, no fabricated relevance', () => {
    const result = lookupTopicClaims([], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['storyblocks'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(SB_ID)
  })
})

// ── Track A: no discovery path exists for this claim's own topic ───────────

describe('Track A discovered relevance: commercial_use is not a discoverable target', () => {
  test('canonical Storyblocks mention + commercial_use goal already active -> the sole trigger discovers third_party_source_rights only, never commercial_use itself -- no fabricated UserGoal, claim reachable only via the explicit goal already present', () => {
    const su = suWithProvider('storyblocks', 'commercial_use')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(su.user_goals.length).toBe(1) // no fabricated UserGoal anywhere in this call

    const rHandoff = buildRetrievalHandoff(su)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, occurrences)
    const ids = results.map((r) => r.claim_id)
    // DIALOGUE_FIXTURES.rich_signal carries its own ambient ToolMention
    // (runway-gen3) that independently matches an unrelated Matrix row --
    // scope to Storyblocks-domain claims specifically, same technique
    // music-a3-artlist-retrieval.test.ts uses for its own equivalent check.
    expect(ids.filter((id) => id.startsWith('CLAIM-STORYBLOCKS'))).toEqual([SB_ID]) // reachable via the explicit commercial_use goal, not via discovery
    const sbResult = results.find((r) => r.claim_id === SB_ID)
    expect(sbResult?.match_origin).toBe('exact_topic') // NOT 'discovered_topic' -- this claim has no discovery path
  })
})

// ── Evidence-only dependency stays fail-closed ──────────────────────────────

describe('storyblocks_license_tier_confirmed remains evidence-only / fail-closed after real publication', () => {
  test('absent from the dependency-askability registry -- CRC publication creates no new user-facing question', () => {
    expect(getAskabilityEntry('storyblocks_license_tier_confirmed')).toBeUndefined()
  })
})

// ── Bounded Interpretation + Projection, real published claim ──────────────

describe('Bounded Interpretation + Projection, real published claim', () => {
  test('unresolved dependency -> existing generic Case 3B (relevant_applicability_unresolved) hedge fires; CRC explains the Storyblocks rule but never asserts this user\'s project/plan is cleared, that a specific tier is held, or that the project is commercially cleared', () => {
    const su = suWithProvider('storyblocks', 'commercial_use')
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('storyblocks'))
    expect(interp).toBeDefined()
    expect(interp?.summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(interp?.summary).toMatch(/Broadcast, Television, or OTT/)
    expect(interp?.summary).not.toMatch(/your project is (cleared|licensed)/i)
    expect(interp?.summary).not.toMatch(/you (hold|have) a business license/i)
    expect(interp?.summary).not.toMatch(/commercially cleared/i)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain(SB_ID)
  })

  test('Projection renders the approved candidate_statement verbatim -- opaque pass-through, no strengthening, same generic composer as every other claim', () => {
    const su = suWithProvider('storyblocks', 'commercial_use')
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const item = output.knowledge_items.find((k) => k.claim_id === SB_ID)
    const fixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === SB_ID)!
    expect(item?.statement).toBe(fixture.crc_candidate_statement)
  })

  test('dependency preserved exactly through the real pipeline', () => {
    const h = handoff({ asset_providers: ['storyblocks'] })
    const { results } = retrieve(h, MATRIX_FIXTURE, [commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['storyblocks'], [])
    expect(results.map((r) => r.claim_id)).toEqual([SB_ID])
    expect(results[0].unresolved_project_dependencies).toEqual(['storyblocks_license_tier_confirmed'])
  })
})

// ── Domain-safety: stock/Music/Synthesia unaffected ─────────────────────────

describe('cross-domain safety, unaffected by this claim\'s real publication', () => {
  test('Storyblocks explicit-goal retrieval never surfaces stock-editorial, Artlist, or Synthesia claims', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['storyblocks'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).not.toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')
    expect(ids).not.toContain('CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1')
  })

  test('Getty/iStock/Shutterstock/Adobe Stock/Artlist/Synthesia routing is unaffected -- Storyblocks does not leak into them', () => {
    for (const providerId of ['getty', 'istock', 'shutterstock', 'adobe-stock']) {
      const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
      expect(result.matches.map((m) => m.claim_id)).not.toContain(SB_ID)
    }
    const artlistResult = lookupTopicClaims([commercialUseGoal({ category: 'third_party_source_rights' })], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    expect(artlistResult.matches.map((m) => m.claim_id)).not.toContain(SB_ID)
  })
})

// ── Registration/publication separation, final state ────────────────────────

describe('registration/publication separation -- final evidenced progression', () => {
  test('Storyblocks registered + claim real + CRC-eligible = exactly this claim reachable for Storyblocks (not zero, not more than one)', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['storyblocks'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([SB_ID])
  })

  test('exactly one CLAIM-STORYBLOCKS-* claim has fixture representation -- confirmed by exact count, not assumed', () => {
    const claims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-STORYBLOCKS'))
    expect(claims).toHaveLength(1)
  })
})

// ── LK-54: end-to-end reachability -- real extraction pipeline through to
// real Retrieval/BI, no hand-built structured state anywhere in this block.
// Proves the newly reachable canonical provider feeds the already-existing
// governed runtime path WITHOUT bypassing provider acquisition -- the one
// deterministic boundary available without a live LLM call (see this file's
// own header discipline: constantExtractor mocks the LLM call only; every
// downstream step -- normalization, attestation, mutation, handoff,
// Retrieval, Bounded Interpretation -- is real, unmodified production code).
describe('LK-54: natural-language Storyblocks mention reaches the real Storyblocks claim end-to-end', () => {
  function emptySU(): StructuredUnderstanding {
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
    }
  }

  function providerCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
    return { proposal_id: 'c1', turn: 1, raw_text: 'I used Storyblocks.', kind: 'asset_provider_mention', raw_provider_name: 'Storyblocks', ...overrides }
  }

  function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
    return {
      proposal_id: 'c2',
      turn: 1,
      raw_text: 'Can I use my Storyblocks footage in a broadcast TV spot?',
      kind: 'user_goal',
      goal_confidence_hint: 'confirmed',
      goal_category_hint: 'commercial_use',
      ...overrides,
    }
  }

  const UNKNOWN_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

  test('§8 safety: a bare Storyblocks mention with no accompanying goal creates the AssetProviderMention but fabricates NO UserGoal', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Storyblocks.' }, constantExtractor([providerCandidate()]))
    expect(updated.asset_provider_mentions).toHaveLength(1)
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'storyblocks' })
    expect(updated.user_goals).toHaveLength(0) // no fabricated UserGoal from provider recognition alone
  })

  test('end-to-end: real extraction (provider + explicit commercial_use goal, both via legitimate candidates) -> real handoff -> real retrieve() -> real Bounded Interpretation, Case 3B', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Storyblocks. Can I use my Storyblocks footage in a broadcast TV spot?' },
      constantExtractor([providerCandidate(), goalCandidate()]),
    )
    // Extraction layer: canonical provider + one explicit, genuinely-asked goal -- neither fabricated by the other.
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'storyblocks' })
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0]).toMatchObject({ category: 'commercial_use', state: 'confirmed' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.asset_providers).toEqual(['storyblocks'])
    expect(rHandoff.unresolved_asset_provider_mentions).toEqual([])

    const { results, diagnostics } = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    expect(results.map((r) => r.claim_id)).toContain(SB_ID)
    const sbResult = results.find((r) => r.claim_id === SB_ID)!
    expect(sbResult.unresolved_project_dependencies).toEqual(['storyblocks_license_tier_confirmed'])

    const interpretations = buildBoundedInterpretations(updated.user_goals, results, diagnostics, { state: 'unknown' })
    const sbInterp = interpretations.find((i) => i.supporting_claim_ids.includes(SB_ID))
    expect(sbInterp).toBeDefined()
    expect(sbInterp!.status).toBe('relevant_applicability_unresolved')
  })

  test('§7 dependency safety: a Storyblocks mention carrying a "standard license" attestation hint does NOT resolve storyblocks_license_tier_confirmed -- the governed dependency is a static Living Knowledge fact, never wired to AssetProviderMention.license', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have the standard Storyblocks license. Can I use my Storyblocks footage in a broadcast TV spot?' },
      constantExtractor([
        providerCandidate({ raw_text: 'I have the standard Storyblocks license.', license_confidence_hint: 'confirmed', license_value_hint: 'standard license' }),
        goalCandidate(),
      ]),
    )
    // The free-text attestation IS captured on the mention's own license field (existing, unmodified Track B behavior) ...
    expect(updated.asset_provider_mentions[0].license).toEqual({ state: 'confirmed', value: 'standard license' })
    // ... but the governed dependency is untouched by it -- confirmed both statically (absent from askability) and by real Retrieval still reporting it unresolved.
    expect(getAskabilityEntry('storyblocks_license_tier_confirmed')).toBeUndefined()

    const rHandoff = buildRetrievalHandoff(updated)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    const sbResult = results.find((r) => r.claim_id === SB_ID)!
    expect(sbResult.unresolved_project_dependencies).toEqual(['storyblocks_license_tier_confirmed'])
  })

  test('correction/supersession: a canonical Storyblocks mention can be superseded using the same generic mechanism already proven for Getty/iStock (asset-provider-mentions.test.ts "AssetProviderMention correction mirrors ToolMention supersession behavior") -- exercised once here for this specific canonical id, not duplicating that generic suite', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Storyblocks.' }, constantExtractor([providerCandidate()]))
    expect(turn1.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)).toHaveLength(1)

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Sorry, it was actually Getty.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Sorry, it was actually Getty.', raw_provider_name: 'Getty', is_correction: true, correction_of_raw_text: 'Storyblocks' }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'getty' })
    const supersededStoryblocks = turn2.updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'storyblocks')
    expect(supersededStoryblocks?.superseded_by).not.toBeNull()

    // Post-correction: Storyblocks relevance disappears from Retrieval; no stale Storyblocks conclusion is retained.
    const rHandoff = buildRetrievalHandoff(turn2.updated)
    expect(rHandoff.asset_providers).toEqual(['getty'])
    const goalOnly = await runExtractionPipeline(turn2.updated, { turn: 3, text: 'Can I use it in a broadcast TV spot?' }, constantExtractor([goalCandidate({ proposal_id: 'c3', turn: 3, raw_text: 'Can I use it in a broadcast TV spot?' })]))
    const finalHandoff = buildRetrievalHandoff(goalOnly.updated)
    const { results } = retrieve(finalHandoff, MATRIX_FIXTURE, goalOnly.updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], finalHandoff.asset_providers, [])
    expect(results.map((r) => r.claim_id)).not.toContain(SB_ID)
  })
})
