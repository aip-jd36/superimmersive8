/**
 * Trial 4 (Living Knowledge onboarding benchmark, first trial run under the
 * LK-68/LK-68A prospective benchmark instrumentation) -- Adobe Stock
 * real-publication retrieval tests (2026-08-31, LK-75).
 *
 * CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1 is the fourth
 * real provider_scope-narrowed TopicClaim to receive a real
 * TOPIC_CLAIMS_FIXTURE entry and CRC Publication approval (CRC Approver: JD
 * (PM), 2026-08-31), following CPR_012 -- with no intervening DEFER,
 * mirroring the Storyblocks (CPR_010) and Pond5 (CPR_011) precedent. Like
 * Synthesia/Storyblocks (topic: 'commercial_use'), this claim is reachable
 * via an explicit commercial_use UserGoal + provider fact directly (proven
 * empirically at CPR_012 via the synthetic-eligibility-canary harness).
 * UNLIKE every prior claim in this fixture, unresolved_project_dependencies
 * is [] -- the load-bearing behavior this file exists to lock in at the real
 * pipeline level is that Bounded Interpretation resolves to
 * `directly_relevant` (not Case 3B) while Composition still never overstates
 * the conclusion for the user's specific project. UNLIKE Pond5/Storyblocks,
 * 'adobe stock'/'adobestock' already had a KNOWN_ASSET_PROVIDERS extraction
 * alias before this trial began -- no conversational-reachability gap to
 * disclose here.
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

const ADOBESTOCK_ID = 'CLAIM-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1'

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
    raw_text: 'I used Adobe Stock AI Studio to generate a background for my ad -- can I use it commercially?',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'I used Adobe Stock AI Studio to generate a background for my ad -- can I use it commercially?',
    ...overrides,
  }
}

const UNKNOWN_FACTS = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

// ── One-claim isolation ──────────────────────────────────────────────────

describe('one-claim isolation: Adobe Stock is the only reachable CLAIM-ADOBESTOCK-* claim', () => {
  test('exactly one CLAIM-ADOBESTOCK-* entry exists in TOPIC_CLAIMS_FIXTURE, and it is the AI Studio commercially-safe-label claim', () => {
    const claims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-ADOBESTOCK'))
    expect(claims.map((c) => c.claim_id)).toEqual([ADOBESTOCK_ID])
  })

  test('the claim is Lifecycle: Adopted, crc_eligible: Yes, and has NO unresolved project dependency -- unique in this fixture', () => {
    const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ADOBESTOCK_ID)!
    expect(claim.lifecycle).toBe('Adopted')
    expect(claim.crc_eligible).toBe('Yes')
    expect(claim.provider_scope).toEqual(['adobe-stock'])
    expect(claim.tool_scope).toBeNull()
    expect(claim.unresolved_project_dependencies).toEqual([])
    expect(claim.applicability_requirements).toEqual([])
  })
})

// ── Explicit-goal real pipeline ──────────────────────────────────────────

describe('explicit-goal retrieval, real committed fixture', () => {
  test('POSITIVE: adobe-stock + commercial_use goal -> claim returned, correct provider_scope, correct candidate statement, no dependency', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['adobe-stock'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).toEqual([ADOBESTOCK_ID])
    const claim = result.matches[0]
    expect(claim.provider_scope).toEqual(['adobe-stock'])
    expect(claim.crc_candidate_statement).toContain('Commercially safe')
    expect(claim.crc_candidate_statement).toContain('Firefly')
    expect(claim.unresolved_project_dependencies).toEqual([])
  })

  test.each([
    ['Getty', 'getty'],
    ['iStock', 'istock'],
    ['Shutterstock', 'shutterstock'],
    ['Pond5', 'pond5'],
    ['Artlist', 'artlist'],
    ['Storyblocks', 'storyblocks'],
    ['an unknown/unregistered provider', 'some-unknown-provider-xyz'],
  ])('NEGATIVE: %s only -> claim absent', (_label, providerId) => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(ADOBESTOCK_ID)
  })

  test('NEGATIVE: no provider named at all -> claim absent', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(ADOBESTOCK_ID)
  })

  test('NEGATIVE: adobe-stock provider present, no relevant explicit goal -> claim absent, no fabricated relevance', () => {
    const result = lookupTopicClaims([], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['adobe-stock'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(ADOBESTOCK_ID)
  })

  test('NEGATIVE: adobe-stock provider present + an unrelated explicit goal (third_party_source_rights, not commercial_use) -> claim absent', () => {
    const unrelatedGoal: UserGoal = { ...commercialUseGoal(), category: 'third_party_source_rights', raw_text: 'Do I have rights to use this Adobe Stock asset?' }
    const result = lookupTopicClaims([unrelatedGoal], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['adobe-stock'])
    expect(result.matches.map((m) => m.claim_id)).not.toContain(ADOBESTOCK_ID)
  })
})

// ── No dependency exists to leak ────────────────────────────────────────

describe('no project dependency exists for this claim -- CRC publication creates no new user-facing question, and no dependency machinery is exercised at all', () => {
  test('the claim carries zero unresolved_project_dependencies in the real fixture', () => {
    const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ADOBESTOCK_ID)!
    expect(claim.unresolved_project_dependencies).toHaveLength(0)
  })
})

// ── Bounded Interpretation + Projection, real published claim ──────────

describe('Bounded Interpretation + Projection, real published Adobe Stock claim', () => {
  test('empty dependency list -> Bounded Interpretation resolves directly_relevant (NOT Case 3B), Composition renders verbatim statement + fixed generic hedge/bridge, no strengthening, no indemnification, no model-identity assertion', async () => {
    const h = handoff({ asset_providers: ['adobe-stock'] })
    const { results, diagnostics } = retrieve(h, MATRIX_FIXTURE, [commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], ['adobe-stock'], [])
    expect(results.map((r) => r.claim_id)).toEqual([ADOBESTOCK_ID])
    expect(results[0].unresolved_project_dependencies).toEqual([])

    const interpretations = buildBoundedInterpretations([commercialUseGoal()], results, diagnostics, { state: 'unknown' })
    expect(interpretations).toHaveLength(1)
    expect(interpretations[0].status).toBe('directly_relevant')
    expect(interpretations[0].status).not.toBe('relevant_applicability_unresolved')

    const forbidden = [
      /indemnif/i,
      /commercially cleared/i,
      /is non-?infringing/i,
      /guarantees? commercial safety/i,
      /you (used|have) firefly/i,
      /you (used|have) a partner model/i,
      /your (content|output|project) is commercially safe/i,
      /you can use it commercially(?! though)/i,
    ]
    for (const pattern of forbidden) {
      expect(interpretations[0].summary).not.toMatch(pattern)
    }

    const projection = assembleProjectionOutput(h, results, interpretations)
    expect(projection.output.knowledge_items.map((k) => k.claim_id)).toEqual([ADOBESTOCK_ID])
    const summary = projection.output.goal_interpretations[0].summary
    const claimFixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ADOBESTOCK_ID)!
    expect(summary).toContain(claimFixture.crc_candidate_statement)
    expect(summary).toContain("doesn't by itself determine the answer for your specific project")
    expect(projection.output.closing_cta).toBe('If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.')
  })
})

// ── Cross-domain safety: stock/Music/Synthesia/Storyblocks/Pond5 unaffected ──

describe('cross-domain safety, unaffected by Adobe Stock\'s real publication', () => {
  test('Adobe Stock explicit-goal retrieval never surfaces stock-editorial, Artlist, Synthesia, Storyblocks, or Pond5 claims', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['adobe-stock'])
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).not.toContain('CLAIM-STOCK-EDITORIAL-001-v2')
    expect(ids).not.toContain('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1')
    expect(ids).not.toContain('CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1')
    expect(ids).not.toContain('CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1')
    expect(ids).not.toContain('CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1')
  })

  test('Getty/iStock/Shutterstock/Pond5/Artlist/Storyblocks routing is unaffected -- Adobe Stock does not leak into them', () => {
    for (const providerId of ['getty', 'istock', 'shutterstock', 'pond5', 'storyblocks']) {
      const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [providerId])
      expect(result.matches.map((m) => m.claim_id)).not.toContain(ADOBESTOCK_ID)
    }
    const artlistResult = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['artlist'])
    expect(artlistResult.matches.map((m) => m.claim_id)).not.toContain(ADOBESTOCK_ID)
  })
})

// ── Registration/publication separation, final state ────────────────────

describe('registration/publication separation -- final evidenced progression', () => {
  test('Adobe Stock registered (already, before this trial) + claim real + CRC-eligible = exactly this claim reachable for Adobe Stock (not zero, not more than one)', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, ['adobe-stock'])
    expect(result.matches.map((m) => m.claim_id)).toEqual([ADOBESTOCK_ID])
  })

  test('exactly one CLAIM-ADOBESTOCK-* claim has fixture representation -- confirmed by exact count, not assumed', () => {
    const claims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-ADOBESTOCK'))
    expect(claims).toHaveLength(1)
  })
})

// ── LK-75: end-to-end reachability -- real extraction pipeline through to
// real Retrieval/BI/Composition against the real committed Adobe Stock
// fixture. UNLIKE Pond5/Storyblocks, 'adobe stock' already has a
// KNOWN_ASSET_PROVIDERS alias (registered before this trial) -- this block
// proves ordinary conversational reachability directly, not just canonical
// retrieval given an already-resolved provider.
describe('LK-75: natural-language Adobe Stock mention reaches the real claim end-to-end', () => {
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
    return { proposal_id: 'c1', turn: 1, raw_text: 'I used Adobe Stock.', kind: 'asset_provider_mention', raw_provider_name: 'Adobe Stock', ...overrides }
  }

  function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
    return {
      proposal_id: 'c2',
      turn: 1,
      raw_text: 'Can I use this Adobe Stock AI Studio content commercially?',
      kind: 'user_goal',
      goal_confidence_hint: 'confirmed',
      goal_category_hint: 'commercial_use',
      ...overrides,
    }
  }

  test('ordinary conversational reachability: "Adobe Stock" resolves to the canonical adobe-stock AssetProviderMention (pre-existing alias, not added by this trial)', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Adobe Stock.' }, constantExtractor([providerCandidate()]))
    expect(updated.asset_provider_mentions).toHaveLength(1)
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })
    expect(updated.user_goals).toHaveLength(0) // no fabricated UserGoal from provider recognition alone
  })

  test('end-to-end: real extraction (provider + explicit commercial_use goal, both via legitimate candidates) -> real handoff -> real retrieve() -> real Bounded Interpretation, directly_relevant', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Adobe Stock. Can I use this Adobe Stock AI Studio content commercially?' },
      constantExtractor([providerCandidate(), goalCandidate()]),
    )
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0]).toMatchObject({ category: 'commercial_use', state: 'confirmed' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.asset_providers).toEqual(['adobe-stock'])
    expect(rHandoff.unresolved_asset_provider_mentions).toEqual([])

    const { results, diagnostics } = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    expect(results.map((r) => r.claim_id)).toContain(ADOBESTOCK_ID)
    const claimResult = results.find((r) => r.claim_id === ADOBESTOCK_ID)!
    expect(claimResult.unresolved_project_dependencies).toEqual([])

    const interpretations = buildBoundedInterpretations(updated.user_goals, results, diagnostics, { state: 'unknown' })
    const claimInterp = interpretations.find((i) => i.supporting_claim_ids.includes(ADOBESTOCK_ID))
    expect(claimInterp).toBeDefined()
    expect(claimInterp!.status).toBe('directly_relevant')

    const forbidden = [/indemnif/i, /commercially cleared/i, /is non-?infringing/i, /you (used|have) firefly/i, /you (used|have) a partner model/i]
    for (const pattern of forbidden) {
      expect(claimInterp!.summary).not.toMatch(pattern)
    }

    const projection = assembleProjectionOutput(rHandoff, results, interpretations)
    expect(projection.output.knowledge_items.map((k) => k.claim_id)).toContain(ADOBESTOCK_ID)
    const claimFixture = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ADOBESTOCK_ID)!
    const claimGoalInterp = projection.output.goal_interpretations.find((g) => g.summary.includes(claimFixture.crc_candidate_statement!))
    expect(claimGoalInterp).toBeDefined()
    expect(claimGoalInterp!.summary).toContain("doesn't by itself determine the answer for your specific project")
  })

  test('no dependency exists to leak from AssetProviderMention.license/.usage attestations -- there is no dependency at all for this claim', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have a paid Adobe Stock subscription. Can I use this Adobe Stock AI Studio content commercially?' },
      constantExtractor([
        providerCandidate({
          raw_text: 'I have a paid Adobe Stock subscription.',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'paid subscription',
        }),
        goalCandidate(),
      ]),
    )
    expect(updated.asset_provider_mentions[0].license).toEqual({ state: 'confirmed', value: 'paid subscription' })

    const rHandoff = buildRetrievalHandoff(updated)
    const { results } = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], rHandoff.asset_providers, [])
    const claimResult = results.find((r) => r.claim_id === ADOBESTOCK_ID)!
    expect(claimResult.unresolved_project_dependencies).toEqual([])
  })

  test('correction/supersession: a canonical Adobe Stock mention can be superseded using the same generic mechanism already proven for Getty/iStock/Pond5/Storyblocks', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Adobe Stock.' }, constantExtractor([providerCandidate()]))
    expect(turn1.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)).toHaveLength(1)

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Sorry, it was actually Getty.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Sorry, it was actually Getty.', raw_provider_name: 'Getty', is_correction: true, correction_of_raw_text: 'Adobe Stock' }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'getty' })
    const supersededAdobe = turn2.updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'adobe-stock')
    expect(supersededAdobe?.superseded_by).not.toBeNull()

    const rHandoff = buildRetrievalHandoff(turn2.updated)
    expect(rHandoff.asset_providers).toEqual(['getty'])
    const goalOnly = await runExtractionPipeline(turn2.updated, { turn: 3, text: 'Can I use it commercially?' }, constantExtractor([goalCandidate({ proposal_id: 'c3', turn: 3, raw_text: 'Can I use it commercially?' })]))
    const finalHandoff = buildRetrievalHandoff(goalOnly.updated)
    const { results } = retrieve(finalHandoff, MATRIX_FIXTURE, goalOnly.updated.user_goals, TOPIC_CLAIMS_FIXTURE, UNKNOWN_FACTS, [], finalHandoff.asset_providers, [])
    expect(results.map((r) => r.claim_id)).not.toContain(ADOBESTOCK_ID)
  })
})
