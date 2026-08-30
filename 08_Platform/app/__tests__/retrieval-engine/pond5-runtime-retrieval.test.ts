/**
 * Trial 3 (Living Knowledge onboarding benchmark, LK-42 protocol) --
 * Pond5 real-publication retrieval tests (2026-08-30, LK-63).
 *
 * CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1 is the third real
 * provider_scope-narrowed TopicClaim to receive a real TOPIC_CLAIMS_FIXTURE
 * entry and CRC Publication approval (CRC Approver: JD (PM), 2026-08-30),
 * following CPR_011 -- with no intervening DEFER, mirroring the
 * Storyblocks precedent (CPR_010). Unlike Synthesia/Storyblocks (topic:
 * 'commercial_use', reached only via Track A discovery from a provider
 * mention), this claim's own topic is 'third_party_source_rights' -- the
 * same reachability shape as Music/Artlist A-3 and the Getty/iStock/
 * Shutterstock Editorial claims it structurally mirrors: reachable via an
 * explicit third_party_source_rights UserGoal directly. Structure mirrors
 * music-a3-artlist-retrieval.test.ts's own explicit-goal shape, crossed
 * with storyblocks-runtime-retrieval.test.ts's own negative/safety-test
 * coverage, adapted for Pond5's own two evidence-only dependencies.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'

const POND5_ID = 'CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1'

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
    raw_text: 'Can I use this Pond5 Editorial clip in a commercial for my client?',
    category: 'third_party_source_rights',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use this Pond5 Editorial clip in a commercial for my client?',
    ...overrides,
  }
}

const UNKNOWN_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

// ── One-claim isolation ──────────────────────────────────────────────────

describe('one-claim isolation: Pond5 is the only reachable CLAIM-POND5-* claim', () => {
  test('exactly one CLAIM-POND5-* entry exists in TOPIC_CLAIMS_FIXTURE, and it is the Editorial-consent claim', () => {
    const claims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-POND5'))
    expect(claims.map((c) => c.claim_id)).toEqual([POND5_ID])
  })

  test('the claim is Lifecycle: Adopted and crc_eligible: Yes', () => {
    const pond5 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === POND5_ID)!
    expect(pond5.lifecycle).toBe('Adopted')
    expect(pond5.crc_eligible).toBe('Yes')
    expect(pond5.provider_scope).toEqual(['pond5'])
    expect(pond5.tool_scope).toBeNull()
  })
})

// ── Explicit-goal real pipeline ──────────────────────────────────────────

describe('explicit-goal retrieval, real committed fixture', () => {
  test('POSITIVE: pond5 + third_party_source_rights goal -> claim returned, correct provider_scope, correct candidate statement', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['pond5'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).toEqual([POND5_ID])
    const pond5 = result.matches[0]
    expect(pond5.provider_scope).toEqual(['pond5'])
    expect(pond5.crc_candidate_statement).toContain('Pond5')
    expect(pond5.crc_candidate_statement).toContain('Editorial')
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
  })

  test.each([
    ['Getty', 'getty'],
    ['iStock', 'istock'],
    ['Shutterstock', 'shutterstock'],
    ['Adobe Stock', 'adobe-stock'],
    ['Artlist', 'artlist'],
    ['Storyblocks', 'storyblocks'],
    ['an unknown/unregistered provider', 'some-unknown-provider-xyz'],
  ])('NEGATIVE: %s only -> claim absent', (_label, providerId) => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(POND5_ID)
  })

  test('NEGATIVE: no provider named at all -> claim absent', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(POND5_ID)
  })

  test('NEGATIVE: pond5 provider present, no relevant explicit goal -> claim absent, no fabricated relevance', () => {
    const result = lookupTopicClaims([], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['pond5'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(POND5_ID)
  })

  test('NEGATIVE: pond5 provider present + an unrelated explicit goal (commercial_use, not third_party_source_rights) -> claim absent -- no Track A discovery path exists into third_party_source_rights from an asset-provider mention alone without going through the real discovered-relevance mechanism', () => {
    const unrelatedGoal: UserGoal = { ...sourceRightsGoal(), category: 'commercial_use', raw_text: 'Can I use the finished video commercially?' }
    const result = lookupTopicClaims([unrelatedGoal], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['pond5'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(POND5_ID)
  })
})

// ── Evidence-only dependencies stay fail-closed ─────────────────────────

describe('editorial_designation_confirmed / separate_authorization_obtained remain evidence-only / fail-closed after real publication', () => {
  test('both are absent from the dependency-askability registry -- CRC publication of Pond5 creates no new user-facing question', () => {
    expect(getAskabilityEntry('editorial_designation_confirmed')).toBeUndefined()
    expect(getAskabilityEntry('separate_authorization_obtained')).toBeUndefined()
  })
})

// ── Bounded Interpretation + Projection, real published claim ──────────

describe('Bounded Interpretation + Projection, real published Pond5 claim', () => {
  test('dependency preserved exactly through the real pipeline, Case 3B fires, Composition renders verbatim statement + fixed hedge/bridge, no Pond5-specific text', async () => {
    const h = handoff({ asset_providers: ['pond5'] })
    const { results, diagnostics } = retrieve(h, MATRIX_FIXTURE, [sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['pond5'], [])
    expect(results.map((r) => r.claim_id)).toEqual([POND5_ID])
    expect(results[0].unresolved_project_dependencies).toEqual(['editorial_designation_confirmed', 'separate_authorization_obtained'])

    const { buildBoundedInterpretations } = await import('@/lib/bounded-interpretation/build-bounded-interpretation')
    const interpretations = buildBoundedInterpretations([sourceRightsGoal()], results, diagnostics, { state: 'unknown' })
    expect(interpretations).toHaveLength(1)
    expect(interpretations[0].status).toBe('relevant_applicability_unresolved')
    expect(interpretations[0].status).not.toBe('directly_relevant')

    const forbidden = [
      /is (marked|designated) editorial/i,
      /is not editorial/i,
      /consent was (obtained|granted)/i,
      /consent (was not|wasn't) (obtained|granted)/i,
      /contacting pond5 is enough/i,
      /commercially cleared/i,
      /is prohibited/i,
      /releases (exist|do not exist)/i,
    ]
    for (const pattern of forbidden) {
      expect(interpretations[0].summary).not.toMatch(pattern)
    }

    const { assembleProjectionOutput } = await import('@/lib/projection-layer/assemble-projection-output')
    const projection = assembleProjectionOutput(h, results, interpretations)
    expect(projection.output.knowledge_items.map((k) => k.claim_id)).toEqual([POND5_ID])
    const summary = projection.output.goal_interpretations[0].summary
    const pond5Fixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === POND5_ID)!
    expect(summary).toContain(pond5Fixture.crc_candidate_statement)
    expect(summary).toContain('A human-reviewed Commercial Assurance Assessment can address this directly.')
    expect(projection.output.closing_cta).toBe('If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.')
  })
})

// ── Cross-domain safety: stock/Music/Synthesia/Storyblocks unaffected ──

describe('cross-domain safety, unaffected by Pond5\'s real publication', () => {
  test('Pond5 explicit-goal retrieval never surfaces stock-editorial, Artlist, Synthesia, or Storyblocks claims', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['pond5'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).not.toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')
    expect(ids).not.toContain('CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1')
    expect(ids).not.toContain('CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1')
  })

  test('Getty/iStock/Shutterstock/Adobe Stock/Artlist/Storyblocks routing is unaffected -- Pond5 does not leak into them', () => {
    for (const providerId of ['getty', 'istock', 'shutterstock', 'adobe-stock']) {
      const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
      expect(result.matches.map((m) => m.claim_id)).not.toContain(POND5_ID)
    }
    const artlistResult = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    expect(artlistResult.matches.map((m) => m.claim_id)).not.toContain(POND5_ID)
  })
})

// ── Registration/publication separation, final state ────────────────────

describe('registration/publication separation -- final evidenced progression', () => {
  test('Pond5 registered + claim real + CRC-eligible = exactly this claim reachable for Pond5 (not zero, not more than one)', () => {
    const result = lookupTopicClaims([sourceRightsGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['pond5'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([POND5_ID])
  })

  test('exactly one CLAIM-POND5-* claim has fixture representation -- confirmed by exact count, not assumed', () => {
    const claims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-POND5'))
    expect(claims).toHaveLength(1)
  })
})
