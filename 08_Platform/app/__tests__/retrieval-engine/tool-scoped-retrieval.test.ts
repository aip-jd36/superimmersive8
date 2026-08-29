/**
 * Tool-scoped Topic Retrieval tests (Living Knowledge — Canonical Tool-Scope
 * Primitive, LK-7, 2026-08-29). Mirrors `provider-scoped-retrieval.test.ts`'s
 * own structure and discipline exactly, for the structurally-parallel-but-
 * independent `tool_scope` dimension.
 *
 * Generic test cases only -- no Synthesia-specific production logic. Test
 * tool identifiers below (`kling`, `runway-gen3`) are used purely as
 * mechanical fixtures (they already exist as canonical Matrix tool
 * identifiers, per PLATFORM-RIGHTS-MATRIX.md) -- no Matrix row, Matrix
 * claim, or governed knowledge for either tool is read, created, or
 * modified by any test in this file. Every `TopicClaim` used here is
 * synthetic/test-only, never a real governed claim.
 *
 * Deterministic throughout -- no live model, no Track A trigger, no
 * fabricated UserGoal or discovered-topic occurrence anywhere in this file.
 */

import { lookupTopicClaims, toolScopeMatches } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { RetrievalHandoff, ToolMention, AssetProviderMention, UserGoal } from '@/types/interview-engine'
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

function commercialUseGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Can I use this commercially?',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use this commercially?',
    ...overrides,
  }
}

function toolMention(identifier: string, overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: `m-${identifier}`,
    resolution: { kind: 'canonical', identifier },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `I used ${identifier}.`,
    superseded_by: null,
    ...overrides,
  }
}

function assetProviderMention(identifier: string, overrides: Partial<AssetProviderMention> = {}): AssetProviderMention {
  return {
    mention_id: `p-${identifier}`,
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

/** Test-only claim factory, mirroring provider-scoped-retrieval.test.ts's own claim() shape. */
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
    tool_scope: null,
    last_verified: '2026-08-29',
    superseded_by: null,
    ...overrides,
  }
}

// ── UNIT: toolScopeMatches ──────────────────────────────────────────────────

describe('toolScopeMatches', () => {
  test('1: null tool_scope always matches, regardless of active tools', () => {
    const generic = claim({ claim_id: 'GEN-1', topic: 'commercial_use', tool_scope: null })
    expect(toolScopeMatches(generic, [])).toBe(true)
    expect(toolScopeMatches(generic, ['kling'])).toBe(true)
  })

  test('2: non-null tool_scope matches when the listed tool is active', () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    expect(toolScopeMatches(klingOnly, ['kling'])).toBe(true)
  })

  test('3: non-null tool_scope fails closed when a different tool is active', () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    expect(toolScopeMatches(klingOnly, ['runway-gen3'])).toBe(false)
  })

  test('4: non-null tool_scope fails closed when no tools are active at all', () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    expect(toolScopeMatches(klingOnly, [])).toBe(false)
  })

  test('multiple tool_scope values: matches if ANY is active', () => {
    const multi = claim({ claim_id: 'MULTI-1', topic: 'commercial_use', tool_scope: ['kling', 'runway-gen3'] })
    expect(toolScopeMatches(multi, ['runway-gen3'])).toBe(true)
    expect(toolScopeMatches(multi, ['midjourney'])).toBe(false)
  })
})

// ── LOOKUP: tool pre-filter, synthetic claims (mirrors provider-scoped-retrieval.test.ts) ──

describe('lookupTopicClaims: tool pre-filter (synthetic claims, isolated from real governance)', () => {
  const generic = claim({ claim_id: 'GEN-1', topic: 'commercial_use', tool_scope: null })
  const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
  const runwayOnly = claim({ claim_id: 'RUNWAY-1', topic: 'commercial_use', tool_scope: ['runway-gen3'] })
  const facts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

  test('1: tool_scope null preserves existing behavior -- generic claim passes with no tool named at all', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [generic], facts, [], [], [])
    expect(result.matches.map((m) => m.claim_id)).toEqual(['GEN-1'])
  })

  test('1b: tool_scope null preserves existing behavior -- generic claim passes even when a tool IS active (unaffected by tool_scope machinery)', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [generic], facts, [], [], ['kling'])
    expect(result.matches.map((m) => m.claim_id)).toEqual(['GEN-1'])
  })

  test('2: matching confirmed tool permits an otherwise-relevant tool-scoped claim to continue', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [klingOnly], facts, [], [], ['kling'])
    expect(result.matches.map((m) => m.claim_id)).toEqual(['KLING-1'])
  })

  test('3: non-matching confirmed tool fails closed -- a different tool never satisfies tool_scope', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [klingOnly], facts, [], [], ['runway-gen3'])
    expect(result.matches).toEqual([])
  })

  test('4: absent sufficient tool fact fails closed for non-null tool_scope -- no active tools at all', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [klingOnly], facts, [], [], [])
    expect(result.matches).toEqual([])
  })

  test('4b: absent sufficient tool fact fails closed even with an UNRESOLVED alias-looking string -- never fuzzy-matched', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [klingOnly], facts, [], [], ['Kling (some other app)'])
    expect(result.matches).toEqual([])
  })

  test('multiple tool-scoped claims: only the matching one surfaces', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [generic, klingOnly, runwayOnly], facts, [], [], ['kling'])
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(['GEN-1', 'KLING-1'])
  })

  test('tool mismatch produces NO diagnostic of its own -- silent exclusion, mirroring provider_scope exactly', () => {
    const result = lookupTopicClaims([commercialUseGoal()], [klingOnly], facts, [], [], ['runway-gen3'])
    expect(result.diagnostics).toEqual([{ identifier: 'commercial_use', reason: 'no_topic_claim' }])
  })
})

// ── CROSS-DIMENSION: tool_scope and provider_scope must never substitute for each other ──

describe('tool_scope and provider_scope are structurally independent -- neither substitutes for the other', () => {
  const facts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

  test('5: an AssetProviderMention cannot satisfy tool_scope -- providing "kling" as an active PROVIDER id (not a tool id) never matches a tool_scope: ["kling"] claim', () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    // "kling" supplied via the assetProviders parameter, never activeToolIds.
    const result = lookupTopicClaims([commercialUseGoal()], [klingOnly], facts, ['kling'], [], [])
    expect(result.matches).toEqual([])
  })

  test('6: a ToolMention cannot satisfy provider_scope -- providing "getty" as an active TOOL id (not a provider id) never matches a provider_scope: ["getty"] claim', () => {
    const gettyProviderScoped = claim({ claim_id: 'GETTY-1', topic: 'third_party_source_rights', provider_scope: ['getty'] })
    // "getty" supplied via activeToolIds, never assetProviders.
    const result = lookupTopicClaims(
      [commercialUseGoal({ category: 'third_party_source_rights', raw_text: 'Can I use this stock image?' })],
      [gettyProviderScoped],
      facts,
      [],
      [],
      ['getty'],
    )
    expect(result.matches).toEqual([])
  })

  test('7: provider_scope + tool_scope together require BOTH to match -- tool matches but provider does not -> excluded', () => {
    const both = claim({ claim_id: 'BOTH-1', topic: 'third_party_source_rights', provider_scope: ['getty'], tool_scope: ['kling'] })
    const result = lookupTopicClaims(
      [commercialUseGoal({ category: 'third_party_source_rights' })],
      [both],
      facts,
      ['istock'], // wrong provider
      [],
      ['kling'], // correct tool
    )
    expect(result.matches).toEqual([])
  })

  test('7b: provider_scope + tool_scope together require BOTH to match -- provider matches but tool does not -> excluded', () => {
    const both = claim({ claim_id: 'BOTH-1', topic: 'third_party_source_rights', provider_scope: ['getty'], tool_scope: ['kling'] })
    const result = lookupTopicClaims(
      [commercialUseGoal({ category: 'third_party_source_rights' })],
      [both],
      facts,
      ['getty'], // correct provider
      [],
      ['runway-gen3'], // wrong tool
    )
    expect(result.matches).toEqual([])
  })

  test('7c: provider_scope + tool_scope together require BOTH to match -- both match -> included', () => {
    const both = claim({ claim_id: 'BOTH-1', topic: 'third_party_source_rights', provider_scope: ['getty'], tool_scope: ['kling'] })
    const result = lookupTopicClaims(
      [commercialUseGoal({ category: 'third_party_source_rights' })],
      [both],
      facts,
      ['getty'],
      [],
      ['kling'],
    )
    expect(result.matches.map((m) => m.claim_id)).toEqual(['BOTH-1'])
  })
})

// ── END-TO-END: retrieve(), explicit goal + tool_scope, no Track A involved ──

describe('retrieve(): explicit-goal retrieval with matching tool scope works without any Track A machinery', () => {
  test('8: an explicit, confirmed commercial_use goal + a matching ToolMention surfaces a tool-scoped claim through the full retrieve() pipeline', () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    const { results } = retrieve(h, [], [commercialUseGoal()], [klingOnly])
    expect(results.map((r) => r.claim_id)).toEqual(['KLING-1'])
    expect(results[0].match_origin).toBe('exact_topic')
    expect(results[0].matched_goal_category).toBe('commercial_use')
  })

  test('9: a ToolMention alone, with NO explicit goal and NO discovered-topic occurrence supplied, does NOT surface a tool-scoped claim -- tool_scope narrows relevance, it never creates it', () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    // No goals[] supplied at all, and no discoveredTopicOccurrences (retrieve()'s
    // own default is []) -- this is the exact "tool mention alone" case the
    // semantic contract requires to produce zero TOPIC-PATH results. `matrix`
    // is deliberately []  -- this test targets the tool_scope/Topic path only,
    // never the pre-existing, unrelated Matrix/tool path (lookupRows), which
    // legitimately still runs off `handoff.tools` regardless of goals (that
    // is existing, untouched behavior -- see its own real `no_matrix_row`
    // diagnostic below, asserted explicitly rather than ignored, so this test
    // cannot silently start passing for the wrong reason).
    const { results, diagnostics } = retrieve(h, [], [], [klingOnly])
    expect(results).toEqual([])
    // No UserGoal was fabricated (goals[] was and remains empty -- nothing in
    // this module can mutate its own input array), and the tool_scope/Topic
    // path itself produced no diagnostic of its own -- the claim was never
    // even a topic-match candidate (mirrors provider_scope's own "never a
    // candidate at all" silence). The one diagnostic present is the
    // pre-existing, unrelated Matrix/tool-path lookup for the empty `matrix`
    // array supplied above -- unrelated to tool_scope, asserted explicitly so
    // this test stays honest about exactly what it proves.
    expect(diagnostics).toEqual([{ identifier: 'kling', reason: 'no_matrix_row' }])
  })

  test("9b: tool_scope alone cannot substitute for topic matching -- a matching tool but a goal in a DIFFERENT category never surfaces the claim", () => {
    const klingOnly = claim({ claim_id: 'KLING-1', topic: 'commercial_use', tool_scope: ['kling'] })
    const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] })
    const unrelatedGoal = commercialUseGoal({ category: 'copyrightability', raw_text: 'Can this be copyrighted?' })
    const { results } = retrieve(h, [], [unrelatedGoal], [klingOnly])
    expect(results).toEqual([])
  })
})
