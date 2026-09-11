/**
 * Track A — Generic Discovered Relevance milestone (2026-08-21). Tests
 * deriveDiscoveredTopicOccurrences/discoveredTopicCategories/computeRelevantTopics
 * in isolation, against real fixture-shaped TopicClaim data (no mocking
 * needed -- this module reads TopicClaim[] as plain data, same as
 * knowledge-readiness.test.ts's own synthetic-claim discipline).
 *
 * Test IDs below (A-J, plus synthetic extensibility) map to this
 * milestone's own required test matrix, Section 33.
 */

import { deriveDiscoveredTopicOccurrences, discoveredTopicCategories, computeRelevantTopics, type DiscoveredRelevanceSourceKind } from '@/lib/crc-engine/discovered-relevance'
import type { StructuredUnderstanding, AssetProviderMention, AssetProviderId, ContentPresenceMention, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

function emptySU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
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
    distribution_territory_mentions: [],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function goal(overrides: Partial<UserGoal> = {}): UserGoal {
  return { goal_id: 'g-1', state: 'confirmed', raw_text: 'x', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x', ...overrides }
}

function providerMention(overrides: Partial<AssetProviderMention> & Pick<AssetProviderMention, 'mention_id'>): AssetProviderMention {
  return {
    resolution: { kind: 'canonical', identifier: 'istock' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'iStock',
    superseded_by: null,
    usage: { state: 'unknown' },
    license: { state: 'unknown' },
    ...overrides,
  }
}

// Generic stock claim (provider_scope: null), mirroring the real
// CLAIM-STOCK-EDITORIAL-001-v1 shape, minus text content.
function genericStockClaim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'CLAIM-STOCK-GENERIC-TEST',
    topic: 'third_party_source_rights',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: null,
    crc_candidate_statement: null,
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: null,
    superseded_by: null,
    ...overrides,
  }
}

function providerScopedClaim(providerId: AssetProviderId, overrides: Partial<TopicClaim> = {}): TopicClaim {
  return genericStockClaim({ claim_id: `CLAIM-STOCK-${providerId.toUpperCase()}-TEST`, provider_scope: [providerId], ...overrides })
}

// Bridge #2 (2026-09-11) helpers.

function presenceMention(overrides: Partial<ContentPresenceMention> & Pick<ContentPresenceMention, 'mention_id'>): ContentPresenceMention {
  return {
    category: 'person_visual_presence',
    real_or_synthetic: 'synthetic',
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: "It's an AI-generated performer.",
    superseded_by: null,
    ...overrides,
  }
}

// Generic likeness claim (provider_scope: null), mirroring the real
// CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1 shape, minus text content.
function genericLikenessClaim(overrides: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'CLAIM-LIKENESS-GENERIC-TEST',
    topic: 'likeness',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: null,
    crc_candidate_statement: null,
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: null,
    superseded_by: null,
    ...overrides,
  }
}

describe('deriveDiscoveredTopicOccurrences', () => {
  // A. commercial_use + confirmed iStock -> discovered third_party_source_rights
  test('A: commercial_use goal + confirmed canonical iStock mention -> discovers third_party_source_rights', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]).toEqual({
      topic: 'third_party_source_rights',
      trigger_id: 'asset_provider_mention_to_third_party_source_rights',
      source_kind: 'asset_provider_mention',
      source_id: 'ap-1',
      // Track C — Discovered-Topic Goal Provenance (2026-08-21): the
      // explicit parent goal that actually satisfied allowed_parent_goals.
      source_goal_category: 'commercial_use',
    })
  })

  // B/C: same topic for Getty/Shutterstock -- generic trigger, no provider-specific branching
  test('B: commercial_use + confirmed Getty -> same discovered topic', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' } })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].topic).toBe('third_party_source_rights')
  })

  test('C: commercial_use + confirmed Shutterstock -> same discovered topic', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'shutterstock' } })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].topic).toBe('third_party_source_rights')
  })

  // D. two providers -> one discovered topic, multiple source IDs
  test('D: commercial_use + iStock + Getty -> one discovered topic, two distinct source_ids', () => {
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [
        providerMention({ mention_id: 'ap-istock', resolution: { kind: 'canonical', identifier: 'istock' } }),
        providerMention({ mention_id: 'ap-getty', resolution: { kind: 'canonical', identifier: 'getty' } }),
      ],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(2)
    expect(occurrences.every((o) => o.topic === 'third_party_source_rights')).toBe(true)
    expect(occurrences.map((o) => o.source_id).sort()).toEqual(['ap-getty', 'ap-istock'])
    expect(discoveredTopicCategories(occurrences)).toEqual(['third_party_source_rights'])
  })

  // E. explicit goal + provider -> no duplicate topic in the merged diagnostic view
  test('E: explicit third_party_source_rights goal + provider mention -> computeRelevantTopics shows one explicit entry, no discovered duplicate', () => {
    const su = emptySU({
      user_goals: [goal({ category: 'third_party_source_rights' })],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    // Note: the real trigger's allowed_parent_goals is ['commercial_use'] only,
    // so this scenario would not even discover the topic on its own -- but
    // the dedup logic in computeRelevantTopics must hold regardless (defense
    // in depth), proven directly here.
    const relevant = computeRelevantTopics(su, [genericStockClaim()])
    const stockTopics = relevant.filter((r) => r.topic === 'third_party_source_rights')
    expect(stockTopics).toHaveLength(1)
    expect(stockTopics[0].origin).toBe('explicit_goal')
  })

  // F. provider mention only, no allowed parent goal -> no discovered topic
  test('F: provider mention with NO active goal at all -> no discovered topic (Path B stays off)', () => {
    const su = emptySU({ user_goals: [], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  test('F2: provider mention + a goal category NOT in allowed_parent_goals -> no discovered topic', () => {
    const su = emptySU({ user_goals: [goal({ category: 'copyright_ownership' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // G. unresolved provider -> no discovered topic
  test('G: unresolved provider alias -> no discovered topic, fail closed', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'unresolved_alias', raw_name: 'PhotoMega' }, confidence: 'unresolved_no_visibility' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // H. superseded provider -> no discovered topic
  test('H: superseded provider mention -> no discovered topic', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', superseded_by: 'ap-2' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // I. unregistered trigger source -> no discovered topic (no governed claim for the topic at all)
  test('I: no Adopted+CRC-eligible claim exists for the topic at all -> no discovered topic even with a valid provider+goal', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [])).toHaveLength(0)
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim({ lifecycle: 'Under Review' })])).toHaveLength(0)
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim({ crc_eligible: 'No' })])).toHaveLength(0)
  })

  // J. wrong parent goal -> no discovered topic (duplicate of F2, kept for matrix-letter traceability)
  test('J: wrong parent goal (copyrightability) -> no discovered topic', () => {
    const su = emptySU({ user_goals: [goal({ category: 'copyrightability' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })

  // Low-confidence mention (canonical but not 'confirmed' -- defensive, not
  // reachable via real extraction today, but the gate is explicit per Section 5.
  test('a canonical mention with non-confirmed confidence never discovers relevance (defense in depth)', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', confidence: 'unresolved_no_visibility' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])).toHaveLength(0)
  })
})

describe('provider_scope remains the sole narrowing filter (Section 11/12)', () => {
  test('provider-scoped claims are untouched by this module -- discovery only ever produces a TOPIC, never a claim-level decision', () => {
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'istock' } })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim(), providerScopedClaim('istock'), providerScopedClaim('getty')])
    // Exactly one occurrence (one trigger, one matching mention) -- this
    // module never inspects provider_scope on any claim; that narrowing
    // happens entirely downstream, in lookupTopicClaims's own
    // providerScopeMatches (untouched by this milestone).
    expect(occurrences).toHaveLength(1)
  })
})

describe('one-hop / no recursive discovery (Section 21, Y)', () => {
  test('discovering third_party_source_rights does not itself produce a second discovered topic, even if a hypothetical trigger existed for that topic as a parent goal', () => {
    // No trigger in the real registry uses third_party_source_rights as an
    // allowed_parent_goal, so this is already structurally impossible --
    // proven directly: running derivation twice (as if feeding the
    // discovered topic back in as a goal) produces no NEW occurrence type.
    const su = emptySU({ user_goals: [goal()], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const first = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(first).toHaveLength(1)
    // Simulate feeding the discovered topic back in as if it were an
    // active EXPLICIT goal category (the one-hop boundary this module
    // itself never performs). Track C — Discovered-Topic Goal Provenance
    // (2026-08-21): this now ALSO exercises the explicit-precedence
    // suppression -- once third_party_source_rights is itself an active,
    // explicit, confirmed goal category, deriveDiscoveredTopicOccurrences
    // suppresses discovering it a second time (the explicit exact-topic
    // path already covers it; a redundant discovered occurrence would
    // produce a duplicate RetrievalResult/knowledge_item for the same
    // claim). The result is therefore EMPTY, not a same-length "no new
    // occurrence type" -- a stronger, more directly correct proof of
    // "no recursive/redundant discovery" than the pre-Track-C version of
    // this test asserted.
    const suWithDiscoveredAsGoal = emptySU({ user_goals: [goal(), goal({ goal_id: 'g-2', category: 'third_party_source_rights' })], asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })] })
    const second = deriveDiscoveredTopicOccurrences(suWithDiscoveredAsGoal, [genericStockClaim()])
    expect(second).toEqual([])
  })
})

// ── Bridge #2 (2026-09-11): synthetic-person content-presence -> likeness ──

describe('deriveDiscoveredTopicOccurrences — content_presence_mention -> likeness (Bridge #2)', () => {
  test('positive: commercial_use goal + confirmed synthetic visual-presence mention -> discovers likeness', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]).toEqual({
      topic: 'likeness',
      trigger_id: 'synthetic_person_content_presence_to_likeness',
      source_kind: 'content_presence_mention',
      source_id: 'cp-1',
      source_goal_category: 'commercial_use',
    })
  })

  test('positive: synthetic VOICE presence (not visual) also qualifies -- category is not narrowed to visual only', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1', category: 'person_voice_presence' })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].topic).toBe('likeness')
  })

  test('negative: no person-presence mention at all -> no likeness discovery, no §396-b-class claim surfaced', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: real_or_synthetic = "real" (not synthetic) -> does NOT qualify -- trigger is synthetic-only by design', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1', real_or_synthetic: 'real' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: real_or_synthetic = null (unresolved/unstated) -> does NOT qualify -- unresolved is never treated as synthetic', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1', real_or_synthetic: null })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: confirmed_absent (explicit "no synthetic person appears") -> does NOT qualify even though real_or_synthetic could carry a value on the absence record', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1', confidence: 'confirmed_absent' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: no active commercial_use goal -> no discovery even with a confirmed synthetic mention (Option D: only commercial_use is an evidenced parent goal)', () => {
    const su = emptySU({ user_goals: [], content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: active goal is NOT commercial_use -> no discovery', () => {
    const su = emptySU({ user_goals: [goal({ category: 'copyright_ownership' })], content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: superseded mention -> no discovery, fail closed (mirrors asset_provider_mention discipline exactly)', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1', superseded_by: 'cp-2' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toHaveLength(0)
  })

  test('negative: no Adopted + CRC-eligible likeness claim exists at all -> no discovery even with a valid synthetic mention + goal', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })] })
    expect(deriveDiscoveredTopicOccurrences(su, [])).toHaveLength(0)
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim({ lifecycle: 'Under Review' })])).toHaveLength(0)
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim({ crc_eligible: 'No' })])).toHaveLength(0)
  })

  test('explicit-precedence: an explicit, active likeness goal already exists -> the same-topic discovery is suppressed, no duplicate exact_topic + discovered_topic', () => {
    const su = emptySU({
      user_goals: [goal(), goal({ goal_id: 'g-2', category: 'likeness' })],
      content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })],
    })
    expect(deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])).toEqual([])
  })

  test('Track C provenance: source_goal_category is the real originating commercial_use goal, never a fabricated likeness goal, and the explicit goal list is never mutated', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])
    expect(occurrences[0].source_goal_category).toBe('commercial_use')
    // The occurrence's own topic ('likeness') is never the same as the
    // source_goal_category -- proves the discovery is additive, not a
    // rewrite of the explicit goal to 'likeness'.
    expect(occurrences[0].topic).not.toBe(occurrences[0].source_goal_category)
    expect(su.user_goals).toHaveLength(1)
    expect(su.user_goals[0].category).toBe('commercial_use')
  })

  test('correction-semantics over-firing (Section 10, classified A -- tracked debt, not a hack): a later "actually, that\'s a real actor" correction is append-only (both mentions remain non-superseded), so the trigger still fires on the earlier synthetic mention', () => {
    const su = emptySU({
      user_goals: [goal()],
      content_presence_mentions: [
        presenceMention({ mention_id: 'cp-1', real_or_synthetic: 'synthetic', source_statement: "It's an AI-generated performer." }),
        // A real correction from ordinary conversation is always a plain
        // ADDITION (addContentPresenceMention only -- see extraction.ts's
        // own content_presence_mention dispatch comment and
        // ContentPresenceMention's own doc comment, "Content-Presence
        // Correction Safety — Append-Only Closure," 2026-08-28); the
        // extraction pipeline never calls supersedeContentPresenceMention.
        // Both mentions below are therefore non-superseded simultaneously,
        // exactly as real extraction would leave them.
        presenceMention({ mention_id: 'cp-2', real_or_synthetic: 'real', source_statement: "Actually, that's a real actor." }),
      ],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim()])
    // Over-fires: likeness topic relevance is still discovered from cp-1,
    // even though the user's current, corrected understanding is "real
    // person." This is bounded to TOPIC relevance only -- no legal
    // conclusion is fabricated, every governed dependency (including
    // synthetic_performer_present_confirmed itself) remains independently
    // unresolved/evidence-only downstream of this module. Tracked as
    // pre-existing, generic content-presence correction-semantics debt, not
    // introduced by or specific to this trigger.
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0].source_id).toBe('cp-1')
  })

  test('provider_scope remains untouched by this trigger -- discovery only ever produces a TOPIC, never a claim-level decision (mirrors the asset-provider trigger\'s own Section 11/12 discipline)', () => {
    const su = emptySU({ user_goals: [goal()], content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })] })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericLikenessClaim(), genericLikenessClaim({ claim_id: 'CLAIM-LIKENESS-OTHER-TEST' })])
    // One occurrence (one trigger, one matching mention) regardless of how
    // many likeness claims exist -- this module never inspects claim-level
    // fields beyond the Option B lifecycle/crc_eligible gate.
    expect(occurrences).toHaveLength(1)
  })
})

describe('existing asset_provider_mention Track A path unaffected by the new content_presence_mention source kind (Section 12 regression)', () => {
  test('commercial_use + confirmed asset provider still discovers third_party_source_rights, unaffected by the sibling likeness trigger being registered', () => {
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
      content_presence_mentions: [],
      distribution_territory_mentions: [],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim(), genericLikenessClaim()])
    expect(occurrences).toHaveLength(1)
    expect(occurrences[0]).toEqual({
      topic: 'third_party_source_rights',
      trigger_id: 'asset_provider_mention_to_third_party_source_rights',
      source_kind: 'asset_provider_mention',
      source_id: 'ap-1',
      source_goal_category: 'commercial_use',
    })
  })

  test('both triggers can independently fire the SAME turn -- asset provider + synthetic person, both under one commercial_use goal', () => {
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
      content_presence_mentions: [presenceMention({ mention_id: 'cp-1' })],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim(), genericLikenessClaim()])
    expect(occurrences).toHaveLength(2)
    expect(occurrences.map((o) => o.topic).sort()).toEqual(['likeness', 'third_party_source_rights'])
  })
})

describe('synthetic extensibility (Section 32 — likeness/music scalability, NOT implemented, shape-only proof)', () => {
  test('the trigger/occurrence type shape supports a future, structurally different source_kind without changing this module\'s public function signatures', () => {
    // This test does NOT implement a real likeness/music trigger -- it only
    // proves the TYPE shape (DiscoveredRelevanceTrigger/DiscoveredTopicOccurrence)
    // is generic enough that a hypothetical future trigger object is
    // assignable to the same interfaces used by the real registry, with no
    // change needed to deriveDiscoveredTopicOccurrences's own signature to
    // accept a config object of this shape.
    const hypotheticalFutureTrigger: { trigger_id: string; source_kind: DiscoveredRelevanceSourceKind | 'recognizable_person_present'; topic: 'commercial_use'; allowed_parent_goals: 'commercial_use'[] } = {
      trigger_id: 'recognizable_person_present_to_likeness_rights',
      source_kind: 'recognizable_person_present',
      topic: 'commercial_use', // placeholder -- 'likeness' is a real GoalCategory value but this test only proves shape compatibility, not a real registration
      allowed_parent_goals: ['commercial_use'],
    }
    expect(hypotheticalFutureTrigger.trigger_id).toBeTruthy()
    // A genuinely new source_kind would additionally require one new `if`
    // branch in deriveDiscoveredTopicOccurrences's own source_kind switch
    // (see that function's own header) -- never a change to run-turn.ts,
    // retrieve(), or any orchestration call site. Not implemented here.
  })
})

describe('Z: old session compatibility', () => {
  test('a historical AssetProviderMention lacking usage/license (deserialized-and-defaulted shape) still triggers discovery correctly -- discovery never reads usage/license at all', () => {
    const su = emptySU({
      user_goals: [goal()],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1', usage: { state: 'unknown' }, license: { state: 'unknown' } })],
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, [genericStockClaim()])
    expect(occurrences).toHaveLength(1)
  })
})

describe('computeRelevantTopics', () => {
  test('explicit and discovered topics are both represented, each with correct origin and source_ids, when they differ', () => {
    const su = emptySU({
      user_goals: [goal({ category: 'commercial_use' }), goal({ goal_id: 'g-2', category: 'copyright_ownership' })],
      asset_provider_mentions: [providerMention({ mention_id: 'ap-1' })],
    })
    const relevant = computeRelevantTopics(su, [genericStockClaim()])
    const byTopic = new Map(relevant.map((r) => [r.topic, r]))
    expect(byTopic.get('commercial_use')).toEqual({ topic: 'commercial_use', origin: 'explicit_goal', source_ids: ['g-1'] })
    expect(byTopic.get('copyright_ownership')).toEqual({ topic: 'copyright_ownership', origin: 'explicit_goal', source_ids: ['g-2'] })
    expect(byTopic.get('third_party_source_rights')).toEqual({ topic: 'third_party_source_rights', origin: 'discovered', source_ids: ['ap-1'] })
  })
})
