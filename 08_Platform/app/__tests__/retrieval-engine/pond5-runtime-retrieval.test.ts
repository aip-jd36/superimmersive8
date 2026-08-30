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
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { runExtractionPipeline } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

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

// ── LK-66: end-to-end reachability -- real extraction pipeline through to
// real Retrieval/BI/Composition against the real committed Pond5 fixture, no
// hand-built structured state anywhere in this block. Mirrors the identical
// LK-54 Storyblocks end-to-end block exactly, adapted for Pond5's own
// third_party_source_rights topic (explicit-goal reachable, no Track A
// discovery needed) and its two evidence-only dependencies.
describe('LK-66: natural-language Pond5 mention reaches the real Pond5 claim end-to-end', () => {
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
    return { proposal_id: 'c1', turn: 1, raw_text: 'I used Pond5.', kind: 'asset_provider_mention', raw_provider_name: 'Pond5', ...overrides }
  }

  function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
    return {
      proposal_id: 'c2',
      turn: 1,
      raw_text: 'Can I use this Pond5 clip in a commercial for my client?',
      kind: 'user_goal',
      goal_confidence_hint: 'confirmed',
      goal_category_hint: 'third_party_source_rights',
      ...overrides,
    }
  }

  test('§8 safety: a bare Pond5 mention with no accompanying goal creates the AssetProviderMention but fabricates NO UserGoal', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Pond5.' }, constantExtractor([providerCandidate()]))
    expect(updated.asset_provider_mentions).toHaveLength(1)
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'pond5' })
    expect(updated.user_goals).toHaveLength(0) // no fabricated UserGoal from provider recognition alone
  })

  test('end-to-end: real extraction (provider + explicit third_party_source_rights goal, both via legitimate candidates) -> real handoff -> real retrieve() -> real Bounded Interpretation, Case 3B', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Pond5. Can I use this Pond5 clip in a commercial for my client?' },
      constantExtractor([providerCandidate(), goalCandidate()]),
    )
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'pond5' })
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0]).toMatchObject({ category: 'third_party_source_rights', state: 'confirmed' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.asset_providers).toEqual(['pond5'])
    expect(rHandoff.unresolved_asset_provider_mentions).toEqual([])

    const { results, diagnostics } = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    expect(results.map((r) => r.claim_id)).toContain(POND5_ID)
    const pond5Result = results.find((r) => r.claim_id === POND5_ID)!
    expect(pond5Result.unresolved_project_dependencies).toEqual(['editorial_designation_confirmed', 'separate_authorization_obtained'])

    const interpretations = buildBoundedInterpretations(updated.user_goals, results, diagnostics, { state: 'unknown' })
    const pond5Interp = interpretations.find((i) => i.supporting_claim_ids.includes(POND5_ID))
    expect(pond5Interp).toBeDefined()
    expect(pond5Interp!.status).toBe('relevant_applicability_unresolved')

    const forbidden = [
      /is (marked|designated) editorial/i,
      /is not editorial/i,
      /consent was (obtained|granted)/i,
      /commercially cleared/i,
      /is prohibited/i,
      /standard license resolves/i,
      /subscription resolves/i,
    ]
    for (const pattern of forbidden) {
      expect(pond5Interp!.summary).not.toMatch(pattern)
    }

    const projection = assembleProjectionOutput(rHandoff, results, interpretations)
    expect(projection.output.knowledge_items.map((k) => k.claim_id)).toContain(POND5_ID)
    const pond5Fixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === POND5_ID)!
    const pond5GoalInterp = projection.output.goal_interpretations.find((g) => g.summary.includes(pond5Fixture.crc_candidate_statement!))
    expect(pond5GoalInterp).toBeDefined()
    expect(pond5GoalInterp!.summary).toContain('A human-reviewed Commercial Assurance Assessment can address this directly.')
  })

  test('§7 dependency safety: a Pond5 mention carrying a "standard license, paid subscription, assumption not checked" attestation does NOT resolve either evidence-only dependency -- both remain static Living Knowledge facts, never wired to AssetProviderMention.license/.usage', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have a paid Pond5 subscription and downloaded it under the standard license. Can I use this Pond5 clip in a commercial for my client?' },
      constantExtractor([
        providerCandidate({
          raw_text: 'I have a paid Pond5 subscription and downloaded it under the standard license.',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'standard license, paid subscription',
        }),
        goalCandidate(),
      ]),
    )
    expect(updated.asset_provider_mentions[0].license).toEqual({ state: 'confirmed', value: 'standard license, paid subscription' })
    expect(getAskabilityEntry('editorial_designation_confirmed')).toBeUndefined()
    expect(getAskabilityEntry('separate_authorization_obtained')).toBeUndefined()

    const rHandoff = buildRetrievalHandoff(updated)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    const pond5Result = results.find((r) => r.claim_id === POND5_ID)!
    expect(pond5Result.unresolved_project_dependencies).toEqual(['editorial_designation_confirmed', 'separate_authorization_obtained'])
  })

  test('correction/supersession: a canonical Pond5 mention can be superseded using the same generic mechanism already proven for Getty/iStock/Storyblocks -- exercised once here for this specific canonical id, not duplicating the generic suite', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Pond5.' }, constantExtractor([providerCandidate()]))
    expect(turn1.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)).toHaveLength(1)

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Sorry, it was actually Getty.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Sorry, it was actually Getty.', raw_provider_name: 'Getty', is_correction: true, correction_of_raw_text: 'Pond5' }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'getty' })
    const supersededPond5 = turn2.updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'pond5')
    expect(supersededPond5?.superseded_by).not.toBeNull()

    const rHandoff = buildRetrievalHandoff(turn2.updated)
    expect(rHandoff.asset_providers).toEqual(['getty'])
    const goalOnly = await runExtractionPipeline(turn2.updated, { turn: 3, text: 'Can I use it commercially?' }, constantExtractor([goalCandidate({ proposal_id: 'c3', turn: 3, raw_text: 'Can I use it commercially?' })]))
    const finalHandoff = buildRetrievalHandoff(goalOnly.updated)
    const { results } = retrieve(finalHandoff, MATRIX_FIXTURE, goalOnly.updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], finalHandoff.asset_providers, [])
    expect(results.map((r) => r.claim_id)).not.toContain(POND5_ID)
  })
})
