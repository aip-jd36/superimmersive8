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
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
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
