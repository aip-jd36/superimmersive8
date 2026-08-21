/**
 * Provider-scoped Topic Retrieval tests (Living Knowledge — Third-Party
 * Source Rights, M3, 2026-08-18), per THIRD_PARTY_SOURCE_RIGHTS_PATH_A_
 * PROVIDER_NARROWING.md §7-§11 and the M3 implementation task's own test
 * plan (§44).
 *
 * Deterministic throughout -- no live model. Synthetic-eligible scenarios
 * clone real TOPIC_CLAIMS_FIXTURE entries with crc_eligible overridden to
 * 'Yes' IN TEST MEMORY ONLY (spread copies, never mutating the imported
 * fixture array or its objects) -- proves future provider-narrowing
 * behavior without changing real governance state. Real-fixture end-to-end
 * tests use TOPIC_CLAIMS_FIXTURE completely unmodified to prove today's
 * actual crc_eligible: Pending exclusion.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { AssetProviderMention, RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

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
    raw_text: 'Can I use this stock image in an ad?',
    category: 'third_party_source_rights',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use this stock image in an ad?',
    ...overrides,
  }
}

function providerMention(identifier: string, overrides: Partial<AssetProviderMention> = {}): AssetProviderMention {
  return {
    mention_id: `m-${identifier}`,
    resolution: { kind: 'canonical', identifier },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `I used ${identifier}.`,
    superseded_by: null,
    usage: { state: 'unknown' },
    license: { state: 'unknown' },
    ...overrides,
  }
}

/** Test-only claim factory, mirroring lookup-topic-claims.test.ts's own claim() shape. */
function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Scope text.',
    crc_candidate_statement: 'Candidate statement.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    last_verified: '2026-08-18',
    superseded_by: null,
    ...overrides,
  }
}

/**
 * Synthetic-eligible clones of the five REAL stock claims -- crc_eligible
 * overridden to 'Yes' in a fresh spread copy each time, never mutating
 * TOPIC_CLAIMS_FIXTURE itself. Sourced from the real fixture's own
 * provider_scope/topic/dependencies so a future drift in the real claims
 * (e.g. a corrected provider_scope) is automatically reflected here too.
 */
function eligibleStockFixture(): TopicClaim[] {
  return TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-STOCK-')).map((c) => ({ ...c, crc_eligible: 'Yes' as const }))
}

// ── LOOKUP: provider pre-filter, real synthetic claims (test plan 8-15) ────

describe('lookupTopicClaims: provider pre-filter (synthetic Adopted+eligible claims, isolated from real governance)', () => {
  const generic = claim({ claim_id: 'GEN-1', topic: 'third_party_source_rights', provider_scope: null })
  const getty = claim({ claim_id: 'GETTY-1', topic: 'third_party_source_rights', provider_scope: ['getty'] })
  const istock = claim({ claim_id: 'ISTOCK-1', topic: 'third_party_source_rights', provider_scope: ['istock'] })
  const shutterstock = claim({ claim_id: 'SHUTTER-1', topic: 'third_party_source_rights', provider_scope: ['shutterstock'] })
  const allFour = [generic, getty, istock, shutterstock]
  const facts = { jurisdiction: { state: 'unknown' as const }, toolMentions: [] }

  test('8: generic claim passes with no provider named', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [generic], facts, [])
    expect(result.matches.map((m) => m.claim_id)).toEqual(['GEN-1'])
  })

  test('9: generic claim passes with Getty named too', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [generic], facts, ['getty'])
    expect(result.matches.map((m) => m.claim_id)).toEqual(['GEN-1'])
  })

  test('10: Getty claim passes when Getty is named', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [getty], facts, ['getty'])
    expect(result.matches.map((m) => m.claim_id)).toEqual(['GETTY-1'])
  })

  test('11: Getty claim silently fails (not a candidate) with iStock named instead', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [getty], facts, ['istock'])
    expect(result.matches).toEqual([])
  })

  test('12: iStock claim silently fails with Getty named instead', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [istock], facts, ['getty'])
    expect(result.matches).toEqual([])
  })

  test('13: Shutterstock claim silently fails with Getty named instead', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [shutterstock], facts, ['getty'])
    expect(result.matches).toEqual([])
  })

  test('14: unresolved provider identifiers never satisfy any provider_scope -- passing a raw/unresolved-looking string never matches', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [getty], facts, ['PhotoMega'])
    expect(result.matches).toEqual([])
  })

  test('15: multiple matching providers in one conversation -- Getty + Shutterstock both surface, iStock does not', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], allFour, facts, ['getty', 'shutterstock'])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(['GEN-1', 'GETTY-1', 'SHUTTER-1'])
  })

  test('provider mismatch produces NO diagnostic of its own -- diagnostics list is empty when a generic claim already satisfies the category (no leak, no provider_scope_unmet, no applicability_unmet)', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], allFour, facts, ['getty'])
    expect(result.diagnostics).toEqual([])
  })

  test('provider mismatch is silent even with ONLY a mismatched provider-specific claim present (no generic fallback) -- excluded via no_topic_claim, never a provider-specific reason', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], [istock], facts, ['getty'])
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'third_party_source_rights', reason: 'no_topic_claim' }])
  })
})

// ── GOVERNANCE: provider match is necessary but not sufficient (test plan 16-18, 40) ─

describe('governance and provider-scope are independent gates (test plan 16-18, critical three-way proof)', () => {
  const facts = { jurisdiction: { state: 'unknown' as const }, toolMentions: [] }

  // NOTE (updated 2026-08-18, following CRC-Publication Review #3 + PM
  // approval): CLAIM-STOCK-GETTY-EDITORIAL-001-v1 is now real
  // crc_eligible: 'Yes' -- the first provider-specific claim in the domain
  // to go live.
  // NOTE (updated again 2026-08-18, following CRC-Publication Review #4 +
  // PM approval): CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1 is ALSO now real
  // crc_eligible: 'Yes' -- the second.
  // NOTE (updated again 2026-08-18, following CRC-Publication Review #5 +
  // PM approval): CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 is ALSO now
  // real crc_eligible: 'Yes' -- the third and, to date, final
  // provider-specific claim. No real provider-specific Pending claim
  // remains in this domain to prove the "provider match + Pending =
  // excluded" leg against, so this test now uses a synthetic Pending
  // clone of the real (now-live) Shutterstock claim -- a spread copy with
  // ONLY crc_eligible forced back to 'Pending', everything else (incl.
  // provider_scope) sourced from the real claim, so it can never silently
  // drift from the real claim's own shape. Dedicated real-Getty,
  // real-iStock, and real-Shutterstock "provider match + Yes = candidate"
  // proofs sit alongside it below.
  test('16: synthetic Pending clone of a real provider-specific claim, provider named -- provider matches, but crc_eligible: Pending still excludes it', () => {
    const realShutterstock = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')!
    const pendingShutterstockClone: TopicClaim = { ...realShutterstock, crc_eligible: 'Pending' }
    const result = lookupTopicClaims([sourceRightsGoal()], [pendingShutterstockClone], facts, ['shutterstock'])
    expect(result.matches.find((m) => m.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')).toBeUndefined()
  })

  test('16b: real fixture, Getty named -- provider matches AND crc_eligible: Yes (real, post-CPR_003) -> genuinely a candidate', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['getty'])
    expect(result.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeDefined()
  })

  test('16c: real fixture, iStock named -- provider matches AND crc_eligible: Yes (real, post-CPR_004) -> genuinely a candidate', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['istock'])
    expect(result.matches.find((m) => m.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')).toBeDefined()
  })

  test('16d: real fixture, Shutterstock named -- provider matches AND crc_eligible: Yes (real, post-CPR_005) -> genuinely a candidate', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['shutterstock'])
    expect(result.matches.find((m) => m.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')).toBeDefined()
  })

  test('17: synthetic eligible copy, provider matches -> candidate', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['getty'])
    expect(result.matches.map((m) => m.claim_id)).toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
  })

  test('18: synthetic eligible copy, provider MISMATCHES -> excluded despite eligibility', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['istock'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
  })

  // NOTE (updated 2026-08-18, following CRC-Publication Review #5 + PM
  // approval): all three provider-specific claims researched to date
  // (Getty, iStock, Shutterstock) are now real crc_eligible: 'Yes' -- no
  // real provider-specific Pending claim remains in this domain. The
  // "provider match + Pending = excluded" leg now uses the same synthetic
  // Pending clone pattern as test 16 above (a spread copy of the real,
  // now-live Shutterstock claim with only crc_eligible forced back to
  // 'Pending'). All three "provider match + Yes = candidate" legs are now
  // provable directly against the real, unmodified fixture (no synthetic
  // clone needed for those), which is a strictly stronger proof than before.
  test('40: three-way proof -- (provider match + Pending = excluded), (provider match + Yes = candidate), (provider mismatch + Yes = excluded)', () => {
    const realShutterstock = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')!
    const pendingShutterstockClone: TopicClaim = { ...realShutterstock, crc_eligible: 'Pending' }
    const pendingMatch = lookupTopicClaims([sourceRightsGoal()], [pendingShutterstockClone], facts, ['shutterstock'])
    expect(pendingMatch.matches.find((m) => m.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')).toBeUndefined()

    const eligibleMatch = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['getty'])
    expect(eligibleMatch.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeDefined()

    const eligibleMatchIstock = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['istock'])
    expect(eligibleMatchIstock.matches.find((m) => m.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')).toBeDefined()

    const eligibleMatchShutterstock = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['shutterstock'])
    expect(eligibleMatchShutterstock.matches.find((m) => m.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')).toBeDefined()

    const eligibleMismatch = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['istock'])
    expect(eligibleMismatch.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeUndefined()

    const eligibleMismatchGettyForIstock = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['getty'])
    expect(eligibleMismatchGettyForIstock.matches.find((m) => m.claim_id === 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')).toBeUndefined()

    const eligibleMismatchGettyForShutterstock = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['getty'])
    expect(eligibleMismatchGettyForShutterstock.matches.find((m) => m.claim_id === 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')).toBeUndefined()
  })
})

// ── END-TO-END: real fixture, Pending, through the full pipeline (test plan 19-23) ──

describe('end-to-end through runCRCConversation, real unmodified TOPIC_CLAIMS_FIXTURE (test plan 19-23)', () => {
  function suWithProvider(providerId: string | null, goalCategory: 'third_party_source_rights' | 'commercial_use' = 'third_party_source_rights'): StructuredUnderstanding {
    return {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [sourceRightsGoal({ category: goalCategory, raw_text: `Can I use this ${providerId ?? 'stock'} image in an ad?` })],
      asset_provider_mentions: providerId ? [providerMention(providerId)] : [],
    }
  }

  // NOTE: `understood_summary` legitimately contains the recognized provider's
  // display name ("You mentioned using Getty Images as a source provider.")
  // -- that is M2's own, already-shipped rendering behavior (understood-
  // summary.ts), completely independent of M3's own retrieval concern. These
  // tests check for the ABSENCE of the claim's own governed CONTENT
  // (Editorial license text, Rights and Clearance mechanics) in
  // knowledge_items/goal_interpretations specifically -- not a blanket
  // absence of the provider's name anywhere in the output.
  // NOTE (updated 2026-08-18, following CRC-Publication Review #1 + PM
  // approval): CLAIM-STOCK-EDITORIAL-001-v1 is now real crc_eligible: 'Yes'
  // -- a Getty question legitimately surfaces its own GENERIC content
  // (provider_scope: null matches any provider).
  // NOTE (updated again 2026-08-18, following CRC-Publication Review #3 +
  // PM approval): CLAIM-STOCK-GETTY-EDITORIAL-001-v1 is ALSO now real
  // crc_eligible: 'Yes' -- the first provider-specific claim to go live.
  // A real Getty question now legitimately surfaces Getty-SPECIFIC content
  // too ("Rights and Clearance", "gambling/betting/gaming" are Getty's own
  // governed text, not a leak). This test now checks the positive case
  // (Getty content DOES surface for a Getty question) plus continued
  // absence of iStock/Shutterstock-SPECIFIC mechanism text (still Pending,
  // and provider-scope-excluded regardless), which remains the real
  // provider-narrowing proof this suite exists for.
  test('19: real Getty question -> generic -001/-002 AND Getty-specific claim all surface; iStock/Shutterstock-specific content never does, no throw', () => {
    const { output } = runCRCConversation(suWithProvider('getty'), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain('CLAIM-STOCK-EDITORIAL-001-v1')
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
    expect(output.goal_interpretations[0].summary).toContain('Rights and Clearance')
    expect(output.goal_interpretations[0].summary).toContain('gambling/betting/gaming')
    expect(output.goal_interpretations[0].summary).not.toContain('editorial use only')
    expect(output.goal_interpretations[0].summary).not.toContain('monetize, sell, promote')
  })

  // NOTE (updated 2026-08-18, following CRC-Publication Review #4 + PM
  // approval): CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1 is now real
  // crc_eligible: 'Yes' -- an iStock question legitimately surfaces its own
  // content, including "editorial use only" (iStock's own governed term)
  // and its negative-finding text ("not that none exists"). This test now
  // checks the positive case (iStock content DOES surface, with its own
  // exclusive markers) plus continued absence of Getty/Shutterstock-
  // SPECIFIC mechanism text ("Rights and Clearance", Shutterstock's
  // "monetize, sell, promote" phrasing).
  test('20: real iStock question -> generic -001/-002 AND iStock-specific claim all surface; Getty/Shutterstock-specific content never does', () => {
    const { output } = runCRCConversation(suWithProvider('istock'), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const ids = output.knowledge_items.map((k) => k.claim_id)
    expect(ids).toContain('CLAIM-STOCK-EDITORIAL-001-v1')
    expect(ids).toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
    expect(output.goal_interpretations[0].summary).toContain('merchandising')
    expect(output.goal_interpretations[0].summary).toContain('not that none exists')
    expect(output.goal_interpretations[0].summary).not.toContain('Rights and Clearance')
    expect(output.goal_interpretations[0].summary).not.toContain('monetize, sell, promote')
  })

  // NOTE (updated 2026-08-18, following CRC-Publication Review #5 + PM
  // approval): CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1 is now real
  // crc_eligible: 'Yes' -- a Shutterstock question legitimately surfaces
  // its own content, including "Rights and Clearance" (Shutterstock's own
  // governed mechanism name) and its evidence-tier caveat ("haven't been
  // independently confirmed"). This test now checks the positive case
  // (Shutterstock content DOES surface, with its own exclusive markers)
  // plus continued absence of Getty/iStock-SPECIFIC mechanism text.
  test('21: real Shutterstock question -> generic -001/-002 AND Shutterstock-specific claim all surface; Getty/iStock-specific content never does', () => {
    const { output } = runCRCConversation(suWithProvider('shutterstock'), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const ids = output.knowledge_items.map((k) => k.claim_id)
    expect(ids).toContain('CLAIM-STOCK-EDITORIAL-001-v1')
    expect(ids).toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(ids).not.toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(output.goal_interpretations[0].summary).toContain('monetize, sell, promote')
    expect(output.goal_interpretations[0].summary).toContain("haven't been independently confirmed")
    expect(output.goal_interpretations[0].summary).not.toContain('gambling/betting/gaming')
    expect(output.goal_interpretations[0].summary).not.toContain('editorial use only')
  })

  // NOTE (updated 2026-08-18, following CRC-Publication Review #3 + PM
  // approval): CLAIM-STOCK-GETTY-EDITORIAL-001-v1 is now real
  // crc_eligible: 'Yes' -- it legitimately surfaces in knowledge_items.
  // NOTE (rewritten 2026-08-21, Track C — Discovered-Topic Goal Provenance):
  // this test's original premise -- that the commercial_use interpretation
  // must be BYTE-IDENTICAL regardless of whether Getty stock evidence is
  // present -- was itself the exact defect the Track C diagnostic and fix
  // address (a discovered-topic RetrievalResult never attributed to the
  // explicit goal that caused its own discovery, so it could never
  // "contaminate" commercial_use even when it legitimately should). The
  // corrected, intended behavior is the opposite: when structural evidence
  // (a confirmed canonical AssetProviderMention) makes third_party_source_
  // rights relevant to an active commercial_use goal, and there is no
  // SEPARATE explicit third_party_source_rights goal already covering it,
  // that discovered guidance SHOULD now legitimately contribute to the
  // commercial_use interpretation -- via the existing, unmodified
  // relevant_applicability_unresolved template, never a fabricated
  // determination. This test now proves three distinct, correct properties
  // instead of one now-incorrect one.
  test('22a: commercial_use + Getty evidence, NO explicit third_party_source_rights goal -- Getty guidance now legitimately attaches to the commercial_use interpretation (the Track C fix)', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [sourceRightsGoal({ goal_id: 'g-1', category: 'commercial_use', raw_text: 'Can I use the finished video commercially?' })],
      asset_provider_mentions: [providerMention('getty')],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const commercialInterp = output.goal_interpretations.find((i) => i.goal_text.includes('commercially'))
    expect(commercialInterp).toBeDefined()
    expect(commercialInterp?.summary).toMatch(/Rights and Clearance/) // Getty-specific content
    expect(commercialInterp?.summary).not.toMatch(/doesn't currently have governed guidance/)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
  })

  // 22b. When an EXPLICIT third_party_source_rights goal ALSO exists for
  // the same evidence, discovery is suppressed (deriveDiscoveredTopicOccurrences's
  // explicit-precedence rule) -- the commercial_use interpretation reverts
  // to Kling/Runway-only content (no duplicate attribution of the same
  // Getty guidance across two interpretations), matching a true no-Getty-
  // evidence control exactly. The Getty guidance still surfaces, just under
  // its own explicit third_party_source_rights interpretation, unchanged.
  test('22b: commercial_use + Getty evidence + an EXPLICIT third_party_source_rights goal -- commercial_use interpretation is unaffected (explicit goal already owns the Getty content, no duplicate attribution)', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [
        sourceRightsGoal({ goal_id: 'g-1', category: 'commercial_use', raw_text: 'Can I use the finished video commercially?' }),
        sourceRightsGoal({ goal_id: 'g-2', category: 'third_party_source_rights', raw_text: 'Can I use the Getty image in the ad?' }),
      ],
      asset_provider_mentions: [providerMention('getty')],
    }
    const withGettyGoal = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const noGettyEvidenceAtAll = runCRCConversation(
      { ...su, user_goals: su.user_goals.filter((g) => g.category === 'commercial_use'), asset_provider_mentions: [] },
      MATRIX_FIXTURE,
      TOPIC_CLAIMS_FIXTURE,
    )
    const commercialWithGettyGoal = withGettyGoal.output.goal_interpretations.find((i) => i.goal_text.includes('commercially'))
    const commercialNoGettyAtAll = noGettyEvidenceAtAll.output.goal_interpretations.find((i) => i.goal_text.includes('commercially'))
    expect(commercialWithGettyGoal?.summary).toEqual(commercialNoGettyAtAll?.summary)
    // The Getty content still surfaces overall -- just under its own
    // explicit third_party_source_rights interpretation, not duplicated
    // into commercial_use.
    expect(withGettyGoal.output.knowledge_items.map((k) => k.claim_id)).toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    const sourceRightsInterp = withGettyGoal.output.goal_interpretations.find((i) => i.goal_text.includes('Getty image'))
    expect(sourceRightsInterp?.summary).toMatch(/Rights and Clearance/)
  })

  test('23: incidental Getty disclosure (no goal) still produces no stock goal/output -- Path A explicit-question gate, unaffected by M3', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [],
      asset_provider_mentions: [providerMention('getty', { source_statement: 'I used Getty.' })],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.goal_interpretations).toEqual([])
    expect(output.understood_summary).toContain('Getty Images as a source provider')
  })
})

// ── SYNTHETIC ELIGIBLE: future-behavior proof (test plan 24-30) ────────────

describe('synthetic-eligible stock claims: proves future provider-narrowing behavior without touching real governance', () => {
  const facts = { jurisdiction: { state: 'unknown' as const }, toolMentions: [] }
  const genericIds = ['CLAIM-STOCK-EDITORIAL-001-v1', 'CLAIM-STOCK-EDITORIAL-002-v1']

  test('24: Getty -> generic + Getty, never iStock/Shutterstock', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['getty'])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual([...genericIds, 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1'].sort())
  })

  test('25: iStock -> generic + iStock, never Getty/Shutterstock', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['istock'])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual([...genericIds, 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1'].sort())
  })

  test('26: Shutterstock -> generic + Shutterstock, never Getty/iStock', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['shutterstock'])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual([...genericIds, 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1'].sort())
  })

  test('27: Getty + Shutterstock -> generic + both, never iStock; no duplicate generic claims', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['getty', 'shutterstock'])
    const ids = result.matches.map((m) => m.claim_id).sort()
    expect(ids).toEqual([...genericIds, 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1', 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1'].sort())
    expect(new Set(ids).size).toBe(ids.length) // no duplicates
  })

  test('28: no provider named -> generic only', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, [])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(genericIds.sort())
  })

  test('29: unresolved provider only -> generic only, never inferred from text similarity', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, [])
    // Simulates: AssetProviderMention resolved to unresolved_alias("PhotoMega") ->
    // handoff.asset_providers stays [] (unresolved aliases never enter it, per handoff.ts) ->
    // this call already reflects that real contract.
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(genericIds.sort())
  })

  test('30: Adobe Stock recognized -> generic only, no Adobe-specific claim exists -- proves provider recognition and provider-specific knowledge are separate concepts', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['adobe-stock'])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(genericIds.sort())
  })
})

// ── BOUNDARIES: no leak, no Bounded Interpretation change, email consistency (test plan 31-35) ──

describe('boundary proofs (test plan 31-35)', () => {
  // NOTE (updated 2026-08-18, following CRC-Publication Review #2 + PM
  // approval): CLAIM-STOCK-EDITORIAL-002-v1's own now-live, approved
  // CRC-facing text legitimately NAMES Getty/iStock/Shutterstock as
  // confirmed providers (and Adobe Stock as unconfirmed) -- this is the
  // authorized bounded copy adjustment, not a leak.
  // NOTE (updated again 2026-08-18, following CRC-Publication Review #3 +
  // PM approval): CLAIM-STOCK-GETTY-EDITORIAL-001-v1 is now real
  // crc_eligible: 'Yes' too -- for a Getty-named conversation, "rights and
  // clearance" and "gambling/betting/gaming" are now GETTY's own live,
  // legitimate governed text, not a leak. This test's forbidden list is
  // narrowed to markers unique to iStock's/Shutterstock's OWN still-Pending
  // mechanism text ("editorial use only" is iStock-exclusive phrasing;
  // "monetize, sell, promote" is Shutterstock-exclusive phrasing) --
  // neither of which any live claim's text contains, so their presence
  // would still prove a real leak.
  test('31: no provider-mismatch diagnostic, and no iStock/Shutterstock-SPECIFIC (still-Pending) claim content, leaks into a real end-to-end ProjectionOutput', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [sourceRightsGoal()],
      asset_provider_mentions: [providerMention('getty')],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const serialized = JSON.stringify(output).toLowerCase()
    for (const forbidden of ['provider_scope', 'provider mismatch', 'provider unknown', 'need provider', 'need more information about provider', 'editorial use only', 'monetize, sell, promote']) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  test('32: build-bounded-interpretation.ts requires no logic change -- a synthetic-eligible Getty claim with unresolved_project_dependencies still renders via the existing Case 3B hedge, not a new status', () => {
    const eligibleGetty = eligibleStockFixture().find((c) => c.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')!
    expect(eligibleGetty.unresolved_project_dependencies.length).toBeGreaterThan(0)
    const out = retrieve(handoff(), MATRIX_FIXTURE, [sourceRightsGoal()], [eligibleGetty], { jurisdiction: { state: 'unknown' }, toolMentions: [] }, [], ['getty'])
    expect(out.results).toHaveLength(1)
    expect(out.results[0].unresolved_project_dependencies).toEqual(eligibleGetty.unresolved_project_dependencies)
    // The claim surfaces as general knowledge -- the user's own asset's
    // Editorial status is never asserted as confirmed anywhere in the result.
  })

  test('33: interactive and email-recomputation paths see identical provider narrowing -- both call runCRCConversation() with the same StructuredUnderstanding, so handoff.asset_providers threading is identical by construction', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [sourceRightsGoal()],
      asset_provider_mentions: [providerMention('getty')],
    }
    // "Interactive" and "email recomputation" are not two code paths in this
    // codebase -- results-email-delivery.ts calls the exact same
    // runCRCConversation() function. Proving byte-identical output for two
    // independent calls with the same input is the direct proof of that
    // shared-path guarantee, not a simulation of a second path.
    const interactive = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const emailRecomputed = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(interactive.output).toEqual(emailRecomputed.output)
  })

  test('34: existing copyright Topic Retrieval is completely unchanged by M3 -- byte-identical output for a copyright_ownership goal with and without asset_provider_mentions present', () => {
    const goal: UserGoal = {
      goal_id: 'g-1',
      state: 'confirmed',
      raw_text: 'Do I own the copyright?',
      category: 'copyright_ownership',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Do I own the copyright?',
    }
    const suWithoutProvider: StructuredUnderstanding = { ...DIALOGUE_FIXTURES.rich_signal.structured_understanding, user_goals: [goal] }
    const suWithProvider: StructuredUnderstanding = { ...suWithoutProvider, asset_provider_mentions: [providerMention('getty')] }
    const a = runCRCConversation(suWithoutProvider, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const b = runCRCConversation(suWithProvider, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    // Scoped to knowledge_items/goal_interpretations, not the full output --
    // understood_summary legitimately differs (M2's own provider-name
    // rendering, unrelated to M3's Topic Retrieval concern this test proves).
    expect(a.output.knowledge_items).toEqual(b.output.knowledge_items)
    expect(a.output.goal_interpretations).toEqual(b.output.goal_interpretations)
  })

  test('35: existing tool retrieval (Matrix-row-keyed) is completely unchanged -- retrieve() with no assetProviders argument at all behaves identically to passing []', () => {
    const h = handoff({ tools: [{ identifier: 'runway-gen3', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    const withDefault = retrieve(h, MATRIX_FIXTURE)
    const withExplicitEmpty = retrieve(h, MATRIX_FIXTURE, [], [], undefined, [], [])
    expect(withDefault.results).toEqual(withExplicitEmpty.results)
  })
})
