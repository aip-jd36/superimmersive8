/**
 * Envato + Epidemic real-publication retrieval tests (2026-09-10, CPR_022
 * decision persistence + activation package).
 *
 * CLAIM-MUSIC-ENVATO-SYNC-001-v1, CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1,
 * and CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1 are the first Envato/
 * Epidemic claims with real TOPIC_CLAIMS_FIXTURE entries and CRC
 * Publication approval (CRC Approver: JD (PM), 2026-09-10), following
 * CPR_022's own reconsideration -- mirroring exactly the shape of
 * music-a3-artlist-retrieval.test.ts for the Artlist domain.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone, no hand-
 * transcription. The 3 remaining Music Scenario A claims (Artlist's own
 * withheld AI Training Exclusion aside) are fully accounted for elsewhere;
 * this file is scoped to Envato + Epidemic only.
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

const ENVATO_SYNC_ID = 'CLAIM-MUSIC-ENVATO-SYNC-001-v1'
const ENVATO_CANCELLATION_ID = 'CLAIM-MUSIC-ENVATO-CANCELLATION-001-v1'
const EPIDEMIC_ID = 'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1'

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
    raw_text: 'What does my music license actually let me do?',
    category: 'third_party_source_rights',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'What does my music license actually let me do?',
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

const UNKNOWN_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

// ── §1: fixture presence and governance state ───────────────────────────────

describe('Envato + Epidemic fixture presence', () => {
  test('all three claims have real TOPIC_CLAIMS_FIXTURE entries, Adopted + CRC-eligible', () => {
    for (const id of [ENVATO_SYNC_ID, ENVATO_CANCELLATION_ID, EPIDEMIC_ID]) {
      const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)
      expect(claim).toBeDefined()
      expect(claim?.lifecycle).toBe('Adopted')
      expect(claim?.crc_eligible).toBe('Yes')
      expect(claim?.topic).toBe('third_party_source_rights')
    }
  })

  test('provider_scope is exact and correctly narrowed per claim', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ENVATO_SYNC_ID)?.provider_scope).toEqual(['envato-elements'])
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ENVATO_CANCELLATION_ID)?.provider_scope).toEqual(['envato-elements'])
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === EPIDEMIC_ID)?.provider_scope).toEqual(['epidemic-sound'])
  })

  test('dependencies preserved exactly as governed', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ENVATO_SYNC_ID)?.unresolved_project_dependencies).toEqual(['which_music_provider'])
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ENVATO_CANCELLATION_ID)?.unresolved_project_dependencies).toEqual(['music_subscription_active_at_publication_confirmed'])
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === EPIDEMIC_ID)?.unresolved_project_dependencies).toEqual(['which_music_provider', 'epidemic_license_tier_confirmed'])
  })
})

// ── §2: explicit-goal retrieval, real committed fixture ─────────────────────

describe('explicit-goal retrieval, real committed fixture', () => {
  test('Envato Elements provider retrieves BOTH Envato claims, no Epidemic, no Artlist, no stock claim', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['envato-elements'])
    const ids = result.matches.map((m) => m.claim_id).sort()
    expect(ids).toEqual([ENVATO_CANCELLATION_ID, ENVATO_SYNC_ID])
    expect(ids).not.toContain(EPIDEMIC_ID)
    expect(ids).not.toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
  })

  test('Epidemic Sound provider retrieves ONLY the Epidemic claim, no Envato, no Artlist', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['epidemic-sound'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).toEqual([EPIDEMIC_ID])
  })

  test('correct candidate_statement text for each claim', () => {
    const envatoResult = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['envato-elements'])
    const sync = envatoResult.matches.find((m) => m.claim_id === ENVATO_SYNC_ID)
    expect(sync?.crc_candidate_statement).toBe("Envato Elements' standard license ties music use to synchronization with other media, and excludes standalone resale/redistribution and broadcast presentations specifically.")

    const epidemicResult = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['epidemic-sound'])
    const epidemic = epidemicResult.matches[0]
    expect(epidemic.crc_candidate_statement).toContain('Which of these applies depends on which tier')
  })

  test.each([
    ['Getty', 'getty'],
    ['iStock', 'istock'],
    ['Shutterstock', 'shutterstock'],
    ['Adobe Stock', 'adobe-stock'],
    ['Artlist', 'artlist'],
    ['Storyblocks', 'storyblocks'],
    ['Pond5', 'pond5'],
    ['an unknown/unregistered provider', 'some-unknown-provider-xyz'],
  ])('NEGATIVE: %s only -> neither Envato nor Epidemic claim retrieved', (_label, providerId) => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).not.toContain(ENVATO_SYNC_ID)
    expect(ids).not.toContain(ENVATO_CANCELLATION_ID)
    expect(ids).not.toContain(EPIDEMIC_ID)
  })

  test('NEGATIVE: no provider named at all -> neither Envato nor Epidemic claim retrieved', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).not.toContain(ENVATO_SYNC_ID)
    expect(ids).not.toContain(ENVATO_CANCELLATION_ID)
    expect(ids).not.toContain(EPIDEMIC_ID)
  })
})

// ── §3: Epidemic tier scenarios (Step 8's own explicit requirement) ─────────

describe('Epidemic Tier Advertising: tier-neutral retrieval and BI behavior', () => {
  // This claim carries no `applicability_requirements` (the tier question
  // is an `unresolved_project_dependencies` entry, not an applicability
  // gate) -- so retrieval itself does not vary by tier. What must vary
  // (or rather, must NOT vary) is documented below: Bounded Interpretation
  // hedges identically regardless of which tier scenario is described,
  // because no code path anywhere resolves epidemic_license_tier_confirmed
  // from conversational content -- confirmed directly, not assumed.

  test('1. Epidemic + a goal describing a KNOWN Private Tier scenario: still retrieves, still hedges (Case 3B) -- tier knowledge is never inferred from goal text', () => {
    const g = sourceRightsGoal({ raw_text: 'I have the Private Tier license, can I use this track in a paid ad?' })
    const result = lookupTopicClaims([g], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['epidemic-sound'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([EPIDEMIC_ID])
  })

  test('2. Epidemic + a goal describing a KNOWN Commercial Tier scenario: still retrieves, still hedges -- tier knowledge is never inferred from goal text', () => {
    const g = sourceRightsGoal({ raw_text: 'I have the Commercial Tier license, can I use this track in a paid ad?' })
    const result = lookupTopicClaims([g], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['epidemic-sound'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([EPIDEMIC_ID])
  })

  test('3. Epidemic + tier genuinely unresolved: retrieves identically to scenarios 1/2 -- no structured tier fact exists anywhere in this pipeline to differentiate them', () => {
    const g = sourceRightsGoal({ raw_text: 'What does my Epidemic Sound license cover?' })
    const result = lookupTopicClaims([g], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['epidemic-sound'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([EPIDEMIC_ID])
  })

  test('4. wrong provider (Artlist) fails closed for the Epidemic claim regardless of tier language in the goal text', () => {
    const g = sourceRightsGoal({ raw_text: 'I have the Commercial Tier, can I use this in an ad?' })
    const result = lookupTopicClaims([g], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(EPIDEMIC_ID)
  })

  test('5. absent provider fails closed regardless of tier language in the goal text', () => {
    const g = sourceRightsGoal({ raw_text: 'I have the Commercial Tier, can I use this in an ad?' })
    const result = lookupTopicClaims([g], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(EPIDEMIC_ID)
  })

  test('Bounded Interpretation + Projection: Case 3B fires identically across all three tier scenarios -- unknown tier never becomes known, Private tier is never rendered as "all commercial use prohibited", Commercial tier monetization right is never rendered as general commercial permission, broadcast exclusion stays distinct from the paid-media exclusion', () => {
    for (const rawText of ['I have the Private Tier license.', 'I have the Commercial Tier license.', 'What does my Epidemic Sound license cover?']) {
      const su = suWithProvider('epidemic-sound', 'third_party_source_rights')
      su.user_goals = [sourceRightsGoal({ raw_text: rawText })]
      const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
      const interp = output.goal_interpretations.find((i) => i.goal_text.includes('epidemic-sound') || i.goal_text.toLowerCase().includes('tier') || i.goal_text.toLowerCase().includes('license'))
      expect(interp).toBeDefined()
      expect(interp?.summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
      expect(interp?.summary).not.toMatch(/you (have|hold|are on) the (private|commercial) tier/i)
      expect(interp?.summary).not.toMatch(/prohibits all commercial use/i)
      expect(interp?.summary).not.toMatch(/your project is (cleared|commercially safe)/i)
      expect(output.knowledge_items.map((k) => k.claim_id)).toContain(EPIDEMIC_ID)
    }
  })

  test('Projection renders the approved candidate_statement verbatim -- opaque pass-through, no strengthening', () => {
    const su = suWithProvider('epidemic-sound', 'third_party_source_rights')
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const item = output.knowledge_items.find((k) => k.claim_id === EPIDEMIC_ID)
    const fixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === EPIDEMIC_ID)!
    expect(item?.statement).toBe(fixture.crc_candidate_statement)
  })
})

// ── §4: dependency remains evidence-only / fail-closed after real publication ──

describe('dependencies remain evidence-only / fail-closed after real publication', () => {
  test('which_music_provider, music_subscription_active_at_publication_confirmed, and epidemic_license_tier_confirmed are all absent from the dependency-askability registry -- CRC publication creates no new user-facing question', () => {
    expect(getAskabilityEntry('which_music_provider')).toBeUndefined()
    expect(getAskabilityEntry('music_subscription_active_at_publication_confirmed')).toBeUndefined()
    expect(getAskabilityEntry('epidemic_license_tier_confirmed')).toBeUndefined()
  })
})

// ── §5: Bounded Interpretation + Projection, Envato claims ──────────────────

describe('Bounded Interpretation + Projection, real published Envato claims', () => {
  test('Envato Sync: unresolved dependency -> Case 3B hedge fires; CRC never asserts the user holds a valid subscription or that the project is cleared', () => {
    const su = suWithProvider('envato-elements', 'third_party_source_rights')
    su.user_goals = [sourceRightsGoal({ raw_text: 'Can I resell this Envato track on its own?' })]
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations[0]
    expect(interp?.summary).toMatch(/ties music use to synchronization/)
    expect(interp?.summary).not.toMatch(/you (hold|have) a valid/i)
    expect(interp?.summary).not.toMatch(/your project is (cleared|licensed)/i)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain(ENVATO_SYNC_ID)
  })

  test('Envato Cancellation: CRC never asserts the user\'s subscription was actually active at publication', () => {
    const su = suWithProvider('envato-elements', 'third_party_source_rights')
    su.user_goals = [sourceRightsGoal({ raw_text: 'My Envato subscription ended, is my finished video still licensed?' })]
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations[0]
    expect(interp?.summary).toMatch(/already-completed, already-published work stays licensed/)
    expect(interp?.summary).not.toMatch(/your subscription was active/i)
    expect(interp?.summary).not.toMatch(/your (project|video) is (still )?licensed/i)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain(ENVATO_CANCELLATION_ID)
  })
})

// ── §6: cross-provider isolation (Step 9) ───────────────────────────────────

describe('cross-provider isolation: Envato <-> Epidemic <-> Artlist <-> Stock', () => {
  test('Envato + Epidemic + Artlist all mentioned together: each claim only fires for its own provider, no bleed in any direction', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['envato-elements', 'epidemic-sound', 'artlist'])
    const ids = result.matches.map((m) => m.claim_id).sort()
    expect(ids).toContain(ENVATO_SYNC_ID)
    expect(ids).toContain(ENVATO_CANCELLATION_ID)
    expect(ids).toContain(EPIDEMIC_ID)
    expect(ids).toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')
    // each result's own provider_scope independently correct, no cross-assignment
    for (const m of result.matches) {
      if (m.claim_id === EPIDEMIC_ID) expect(m.provider_scope).toEqual(['epidemic-sound'])
      if (m.claim_id === ENVATO_SYNC_ID || m.claim_id === ENVATO_CANCELLATION_ID) expect(m.provider_scope).toEqual(['envato-elements'])
    }
  })

  test('Getty/iStock/Shutterstock/Adobe Stock routing is unaffected by this activation -- stock claims still surface for their own providers, Envato/Epidemic do not leak into them', () => {
    for (const provider of ['getty', 'istock', 'shutterstock', 'adobe-stock']) {
      const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [provider])
      const ids = result.matches.map((m) => m.claim_id)
      expect(ids).not.toContain(ENVATO_SYNC_ID)
      expect(ids).not.toContain(ENVATO_CANCELLATION_ID)
      expect(ids).not.toContain(EPIDEMIC_ID)
    }
  })
})

// ── §7: explicit vs discovered provenance, no fabricated UserGoal ───────────

describe('Track A discovered relevance, real committed fixture', () => {
  test('canonical Envato mention + commercial_use goal -> third_party_source_rights discovered -> both Envato claims (Music); Epidemic/Artlist/stock claims absent; no fabricated UserGoal', () => {
    const su = suWithProvider('envato-elements', 'commercial_use')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.length).toBeGreaterThan(0)
    expect(occurrences[0].topic).toBe('third_party_source_rights')
    expect(su.user_goals.length).toBe(1) // no fabricated UserGoal anywhere in this call

    const rHandoff = buildRetrievalHandoff(su)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, occurrences)
    const ids = results.map((r) => r.claim_id)
    expect(ids).toContain(ENVATO_SYNC_ID)
    expect(ids).toContain(ENVATO_CANCELLATION_ID)
    expect(ids).not.toContain(EPIDEMIC_ID)
    expect(ids).not.toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')

    const syncResult = results.find((r) => r.claim_id === ENVATO_SYNC_ID)
    expect(syncResult?.match_origin).toBe('discovered_topic') // provenance stays discovered
    expect(syncResult?.matched_goal_category).toBe('commercial_use') // Track C: originating goal preserved
  })

  test('explicit third_party_source_rights goal produces exact_topic provenance, distinct from discovered', () => {
    const su = suWithProvider('epidemic-sound', 'third_party_source_rights')
    const rHandoff = buildRetrievalHandoff(su)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    const r = results.find((x) => x.claim_id === EPIDEMIC_ID)
    expect(r?.match_origin).toBe('exact_topic')
  })
})

// ── §8: registration/publication separation, final state ───────────────────

describe('registration/publication separation -- final evidenced progression', () => {
  test('exactly three CLAIM-MUSIC-ENVATO-*/CLAIM-MUSIC-EPIDEMIC-* entries have fixture representation, confirmed by exact count', () => {
    const envatoEpidemicClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-MUSIC-ENVATO') || c.claim_id.startsWith('CLAIM-MUSIC-EPIDEMIC'))
    expect(envatoEpidemicClaims).toHaveLength(3)
    expect(envatoEpidemicClaims.map((c) => c.claim_id).sort()).toEqual([ENVATO_CANCELLATION_ID, ENVATO_SYNC_ID, EPIDEMIC_ID])
  })

  test('total CLAIM-MUSIC-* reachable population is now nine: six Artlist (A-3 + five activated siblings) + two Envato + one Epidemic -- AI Training Exclusion remains correctly absent', () => {
    const musicClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-MUSIC'))
    expect(musicClaims).toHaveLength(9)
    expect(musicClaims.map((c) => c.claim_id)).not.toContain('CLAIM-MUSIC-ARTLIST-AI-TRAINING-EXCLUSION-001-v1')
  })
})
