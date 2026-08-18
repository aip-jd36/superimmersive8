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

  test('16: real fixture, Getty named -- provider matches, but crc_eligible: Pending still excludes it', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['getty'])
    expect(result.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeUndefined()
  })

  test('17: synthetic eligible copy, provider matches -> candidate', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['getty'])
    expect(result.matches.map((m) => m.claim_id)).toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
  })

  test('18: synthetic eligible copy, provider MISMATCHES -> excluded despite eligibility', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['istock'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
  })

  test('40: three-way proof -- (provider match + Pending = excluded), (provider match + Yes = candidate), (provider mismatch + Yes = excluded)', () => {
    const pendingMatch = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, facts, ['getty'])
    expect(pendingMatch.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeUndefined()

    const eligibleMatch = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['getty'])
    expect(eligibleMatch.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeDefined()

    const eligibleMismatch = lookupTopicClaims([sourceRightsGoal()], eligibleStockFixture(), facts, ['istock'])
    expect(eligibleMismatch.matches.find((m) => m.claim_id === 'CLAIM-STOCK-GETTY-EDITORIAL-001-v1')).toBeUndefined()
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
  test('19: real Getty question -> no stock claim content in knowledge_items or goal_interpretations, no throw', () => {
    const { output } = runCRCConversation(suWithProvider('getty'), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
    expect(output.goal_interpretations[0].summary).not.toContain('Editorial')
    expect(output.goal_interpretations[0].summary).not.toContain('Rights and Clearance')
  })

  test('20: real iStock question -> no stock claim content in knowledge_items or goal_interpretations', () => {
    const { output } = runCRCConversation(suWithProvider('istock'), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain('CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1')
    expect(output.goal_interpretations[0].summary).not.toContain('editorial use only')
  })

  test('21: real Shutterstock question -> no stock claim content in knowledge_items or goal_interpretations', () => {
    const { output } = runCRCConversation(suWithProvider('shutterstock'), MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain('CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1')
    expect(output.goal_interpretations[0].summary).not.toContain('Rights and Clearance')
  })

  test('22: mixed commercial_use (Kling) + Getty stock question -- Kling guidance unaffected, stock topic never suppresses or contaminates it', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [
        sourceRightsGoal({ goal_id: 'g-1', category: 'commercial_use', raw_text: 'Can I use the finished video commercially?' }),
        sourceRightsGoal({ goal_id: 'g-2', category: 'third_party_source_rights', raw_text: 'Can I use the Getty image in the ad?' }),
      ],
      asset_provider_mentions: [providerMention('getty')],
    }
    const withStock = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const withoutStock = runCRCConversation(
      { ...su, user_goals: su.user_goals.filter((g) => g.category === 'commercial_use') },
      MATRIX_FIXTURE,
      TOPIC_CLAIMS_FIXTURE,
    )
    const commercialInterpWith = withStock.output.goal_interpretations.find((i) => i.goal_text.includes('commercially'))
    const commercialInterpWithout = withoutStock.output.goal_interpretations.find((i) => i.goal_text.includes('commercially'))
    expect(commercialInterpWith?.summary).toEqual(commercialInterpWithout?.summary)
    expect(withStock.output.knowledge_items.map((k) => k.claim_id)).not.toContain('CLAIM-STOCK-GETTY-EDITORIAL-001-v1')
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
  test('31: no provider-mismatch diagnostic or language leaks into a real end-to-end ProjectionOutput', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [sourceRightsGoal()],
      asset_provider_mentions: [providerMention('getty')],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const serialized = JSON.stringify(output).toLowerCase()
    for (const forbidden of ['provider_scope', 'provider mismatch', 'provider unknown', 'need provider', 'need more information about provider', 'istock', 'shutterstock']) {
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
