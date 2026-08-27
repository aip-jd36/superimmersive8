/**
 * Music Scenario A -- Artlist A-3 real-publication retrieval tests
 * (2026-08-27, A-3 CRC Publication Recording task).
 *
 * CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1 (A-3) is the first
 * Music-domain claim to receive a real TOPIC_CLAIMS_FIXTURE entry and
 * CRC Publication approval (CRC Approver: JD (PM), 2026-08-27), following
 * CPR_007's own "runtime prerequisite only" disposition and its
 * subsequent clearance via the Artlist A-3 Synthetic Runtime Canary and
 * the Artlist Provider Registration Canary Integration Review.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone, mirroring exactly
 * what the now-deleted scratch canary files proved on a throwaway basis,
 * now made permanent because A-3 is permanently, really reachable.
 *
 * The other 9 Music Scenario A claims remain WITHHELD/PENDING and have no
 * fixture entry -- this file proves they stay completely unreachable
 * alongside A-3's own correct reachability, per this task's own one-claim
 * isolation requirement.
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

const A3_ID = 'CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1'

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

function sourceRightsGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'My Artlist subscription lapsed -- is the finished video still licensed?',
    category: 'third_party_source_rights',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'My Artlist subscription lapsed -- is the finished video still licensed?',
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

function suWithProvider(providerId: string | null, goalCategory: 'third_party_source_rights' | 'commercial_use' = 'third_party_source_rights'): StructuredUnderstanding {
  return {
    ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
    user_goals: [sourceRightsGoal({ category: goalCategory, raw_text: `Can I still use my ${providerId ?? 'project'} track?` })],
    asset_provider_mentions: providerId ? [providerMention(providerId)] : [],
  }
}

const UNKNOWN_FACTS = { jurisdiction: { state: 'unknown' as const }, toolMentions: [] }

// ── One-claim isolation (§7) ────────────────────────────────────────────────

describe('one-claim isolation: A-3 is the only reachable Music claim', () => {
  test('exactly one CLAIM-MUSIC-* entry exists in TOPIC_CLAIMS_FIXTURE, and it is A-3', () => {
    const musicClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-MUSIC'))
    expect(musicClaims.map((c) => c.claim_id)).toEqual([A3_ID])
  })

  test('A-3 is Lifecycle: Adopted and crc_eligible: Yes; no other Music claim is', () => {
    const a3 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === A3_ID)!
    expect(a3.lifecycle).toBe('Adopted')
    expect(a3.crc_eligible).toBe('Yes')
  })

  test('Artlist + relevant goal retrieves ONLY A-3 among Music claims -- no other Music claim becomes reachable merely because A-3 is now published', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    const musicIds = result.matches.map((m) => m.claim_id).filter((id) => id.startsWith('CLAIM-MUSIC'))
    expect(musicIds).toEqual([A3_ID])
  })
})

// ── §8: real explicit-goal pipeline ─────────────────────────────────────────

describe('explicit-goal retrieval, real committed fixture', () => {
  test('POSITIVE: Artlist + third_party_source_rights goal -> A-3 returned, correct provider_scope, correct candidate statement, no stock claim, no other Music claim', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).toEqual([A3_ID])
    const a3 = result.matches[0]
    expect(a3.provider_scope).toEqual(['artlist'])
    expect(a3.crc_candidate_statement).toBe("Artlist's stated policy is that already-completed, already-published work stays licensed after cancellation, while new use does not.")
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-002-v2')
  })

  test.each([
    ['Getty', 'getty'],
    ['iStock', 'istock'],
    ['Shutterstock', 'shutterstock'],
    ['Adobe Stock', 'adobe-stock'],
    ['Envato Elements', 'envato-elements'],
    ['Epidemic Sound', 'epidemic-sound'],
    ['an unknown/unregistered provider', 'some-unknown-provider-xyz'],
  ])('NEGATIVE (§15): %s only -> A-3 absent', (_label, providerId) => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(A3_ID)
  })

  test('NEGATIVE: no provider named at all -> A-3 absent', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(A3_ID)
  })
})

// ── §9/§10: real Track A / Track C ──────────────────────────────────────────

describe('Track A discovered relevance, real committed fixture', () => {
  test('canonical Artlist mention + commercial_use goal -> third_party_source_rights discovered -> A-3 only (Music); stock v2 claims absent; no fabricated UserGoal', () => {
    const su = suWithProvider('artlist', 'commercial_use')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.length).toBeGreaterThan(0)
    expect(occurrences[0].topic).toBe('third_party_source_rights')
    expect(su.user_goals.length).toBe(1) // no fabricated UserGoal anywhere in this call

    const rHandoff = buildRetrievalHandoff(su)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, occurrences)
    const ids = results.map((r) => r.claim_id)
    expect(ids.filter((id) => id.startsWith('CLAIM-MUSIC'))).toEqual([A3_ID])
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-002-v2')

    const a3Result = results.find((r) => r.claim_id === A3_ID)
    expect(a3Result?.match_origin).toBe('discovered_topic') // provenance stays discovered
    expect(a3Result?.matched_goal_category).toBe('commercial_use') // Track C: originating goal preserved
  })

  // §10: Track C provenance -- EXERCISED (confirmed above via matched_goal_category
  // on the discovered result). Explicit-precedence case (both an explicit
  // third_party_source_rights goal AND a discoverable commercial_use goal
  // present) is not separately re-tested here -- it is already covered
  // generically by discovered-relevance.ts's own existing "explicit always
  // wins" precedence tests and by discovered-relevance-retrieval.test.ts's
  // own stock-claim coverage of the identical mechanism; re-proving it a
  // third time with A-3 specifically would not exercise any new code path.
})

// ── §11: evidence-only dependency stays fail-closed ─────────────────────────

describe('A-3 dependency remains evidence-only / fail-closed after real publication', () => {
  test('artlist_subscription_active_at_publication_confirmed is absent from the dependency-askability registry -- CRC publication of A-3 creates no new user-facing question', () => {
    expect(getAskabilityEntry('artlist_subscription_active_at_publication_confirmed')).toBeUndefined()
  })
})

// ── §12/§13: real Bounded Interpretation + Projection ───────────────────────

describe('Bounded Interpretation + Projection, real published A-3', () => {
  test('unresolved dependency -> existing generic Case 3B (relevant_applicability_unresolved) hedge fires; CRC explains the Artlist rule but never asserts this user\'s project is licensed, that the subscription was active, or that the project is commercially cleared', () => {
    const su = suWithProvider('artlist', 'third_party_source_rights')
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('artlist'))
    expect(interp).toBeDefined()
    expect(interp?.summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(interp?.summary).toMatch(/already-completed, already-published work stays licensed/)
    expect(interp?.summary).not.toMatch(/your project is (licensed|cleared)/i)
    expect(interp?.summary).not.toMatch(/you are (covered|cleared)/i)
    expect(interp?.summary).not.toMatch(/subscription was active/i)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain(A3_ID)
  })

  test('Projection renders the approved candidate_statement verbatim -- opaque pass-through, no strengthening, same generic composer as every other claim', () => {
    const su = suWithProvider('artlist', 'third_party_source_rights')
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const a3Item = output.knowledge_items.find((k) => k.claim_id === A3_ID)
    const a3Fixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === A3_ID)!
    expect(a3Item?.statement).toBe(a3Fixture.crc_candidate_statement)
  })
})

// ── §14: stock domain-safety, real fixture, real A-3 present ───────────────

describe('stock domain-safety, unaffected by A-3\'s real publication', () => {
  test('Artlist explicit-goal retrieval never surfaces stock-editorial v2 claims', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-002-v2')
  })

  test('Getty/iStock/Shutterstock/Adobe Stock routing is unaffected by A-3\'s publication -- stock claims still surface for their own providers, A-3 does not leak into them', () => {
    for (const provider of ['getty', 'istock', 'shutterstock', 'adobe-stock']) {
      const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [provider])
      const ids = result.matches.map((m) => m.claim_id)
      expect(ids).toContain('CLAIM-STOCK-EDITORIAL-001-v2')
      expect(ids).not.toContain(A3_ID)
    }
  })
})

// ── §16: registration/publication separation, final state ──────────────────

describe('registration/publication separation -- final evidenced progression', () => {
  test('Artlist registered + A-3 real + CRC-eligible = exactly A-3 reachable for Artlist (not zero, not more than one)', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([A3_ID])
  })

  test('the other 9 Music Scenario A claims have zero fixture representation -- confirmed by exact count, not assumed', () => {
    const musicClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-MUSIC'))
    expect(musicClaims).toHaveLength(1)
  })
})
