/**
 * CRC-BI-CASE3B-LEADING-QUALIFIER-1 (2026-10-18, PM/Architecture-approved
 * design B′ from CRC-BI-CASE3B-BOUNDARY-PRESENTATION-1).
 *
 * Case 3B dependency-bearing groups with two or more non-empty governed
 * statements now render as:
 *   [dependency-free block, unchanged, if any]
 *   [leading collective qualification]
 *   [statement 1] … [statement N]          -- verbatim, match order
 *   [related clause? + H5? + bridge]       -- existing conditions, at most once
 *   [mixed-resolution sentence, if any]    -- unchanged
 * A single dependency-bearing statement keeps the old shape byte-for-byte.
 *
 * Real fixtures (retrieve() + TOPIC_CLAIMS_FIXTURE) are used for Shutterstock,
 * Article 50(2)/(4) and Kling + Track C discovered stock; synthetic BiResults
 * only where a branch has no real fixture shape.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { buildResultsEmailContent, escapeHtml } from '@/lib/crc-engine/results-email-template'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { runHrrResearch, topicSelectionGateResult } from '@/lib/hrr/run-hrr-research'
import { projectHrrResearchAnswer } from '@/lib/hrr/project-hrr-research-answer'
import type { BiIntent, BiResult, BoundedInterpretation } from '@/lib/bounded-interpretation/types'
import type { DiscoveredTopicOccurrence, RetrievalDiagnostic, TopicClaim } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import * as fs from 'fs'
import * as path from 'path'

// ── fixed wording (copied literally, so any drift fails loudly) ──────────────

const BRIDGE = 'A human-reviewed Commercial Assurance Assessment can address this directly.'
const RELATED = 'This information is relevant to what you asked, but does not by itself determine the answer.'
const HEDGE_TAIL = "but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project."
const LABEL = {
  commercial_use: 'whether this can be used commercially',
  third_party_source_rights: 'whether you have the rights to use third-party source material',
  copyrightability: 'whether this kind of output can be copyrighted at all',
} as const
const lead = (label: string) => `The following guidance is relevant to ${label}, ${HEDGE_TAIL}`
const LEAD_PREFIX = 'The following guidance is relevant to'
const MIXED_RESOLUTION =
  "There's additional governed guidance relevant to this topic that hasn't been confirmed as applicable based on what's been described here — it may or may not apply, and CRC can't determine that from this conversation."

const SHUTTERSTOCK_IDS = ['CLAIM-STOCK-EDITORIAL-001-v2', 'CLAIM-STOCK-EDITORIAL-002-v2', 'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1']
const ART50_2 = 'CLAIM-EUAI-ART50-2-PROVIDER-MARKING-001-v1'
const ART50_4 = 'CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1'
const KLING = 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1'

const fixtureStatement = (claimId: string): string => {
  const c = TOPIC_CLAIMS_FIXTURE.find((x) => x.claim_id === claimId)
  if (!c || !c.crc_candidate_statement) throw new Error(`fixture missing ${claimId}`)
  return c.crc_candidate_statement
}

// ── helpers ─────────────────────────────────────────────────────────────────

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
function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return { state: 'confirmed', category: 'unknown', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: overrides.raw_text, ...overrides }
}
const intent = (over: Partial<BiIntent> = {}): BiIntent => ({ intent_id: 'i-1', intent_text: 'q', category: 'commercial_use', scope: 'informational', ...over })
const dep = (over: Partial<BiResult> = {}): BiResult => ({
  matched_goal_category: 'commercial_use',
  unresolved_project_dependencies: ['some_dependency'],
  claim_id: 'CLAIM-DEP-v1',
  candidate_statement: 'Dependency-bearing statement.',
  match_origin: 'exact_topic',
  source_fact: { kind: 'topic' },
  ...over,
})
const d0 = (over: Partial<BiResult> = {}): BiResult => dep({ unresolved_project_dependencies: [], source_fact: { kind: 'tool' }, claim_id: 'CLAIM-D0-v1', candidate_statement: 'Dependency-free statement.', ...over })

function expectJoinInvariant(bi: BoundedInterpretation) {
  expect(bi.summary_blocks.join(' ')).toBe(bi.summary)
}
const countOf = (haystack: string, needle: string) => haystack.split(needle).length - 1

// ── real-fixture runs ───────────────────────────────────────────────────────

function runShutterstock() {
  const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Shutterstock clip?', category: 'third_party_source_rights' })
  const out = retrieve(handoff(), MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE, undefined, [], ['shutterstock'])
  const [bi] = buildBoundedInterpretations(userGoalsToBiIntents([g]), out.results, out.diagnostics)
  return { out, bi }
}

function runArticle50() {
  const g = goal({ goal_id: 'g-1', raw_text: 'Does my AI video need a label under EU rules?', category: 'commercial_use' })
  const out = retrieve(
    handoff(),
    MATRIX_FIXTURE,
    [g],
    TOPIC_CLAIMS_FIXTURE,
    { jurisdiction: { included: ['European Union'], excluded: [] }, toolMentions: [] },
    TOPIC_RELATIONSHIPS_FIXTURE,
  )
  const [bi] = buildBoundedInterpretations(userGoalsToBiIntents([g]), out.results, out.diagnostics)
  return { out, bi }
}

const SHUTTERSTOCK_DISCOVERY: DiscoveredTopicOccurrence = {
  topic: 'third_party_source_rights',
  trigger_id: 'asset_provider_mention_to_third_party_source_rights',
  source_kind: 'asset_provider_mention',
  source_id: 'ap-1',
  source_goal_category: 'commercial_use',
}

function runKlingPlusDiscoveredStock() {
  const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
  const h = handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] as RetrievalHandoff['tools'] })
  const out = retrieve(h, MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE, undefined, [], ['shutterstock'], [SHUTTERSTOCK_DISCOVERY])
  const [bi] = buildBoundedInterpretations(userGoalsToBiIntents([g]), out.results, out.diagnostics)
  return { out, bi }
}

// ═════════════════════════════════════════════════════════════════════════
// 1. Shutterstock — three dependency-bearing claims
// ═════════════════════════════════════════════════════════════════════════

describe('1. Shutterstock — multiple dependency-bearing claims (real fixture)', () => {
  test('leading qualifier, then each governed statement verbatim in match order, then bridge', () => {
    const { out, bi } = runShutterstock()
    const matchedIds = out.results.filter((r) => r.matched_goal_category === 'third_party_source_rights').map((r) => r.claim_id)
    expect([...matchedIds].sort()).toEqual([...SHUTTERSTOCK_IDS].sort())

    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.supporting_claim_ids).toEqual(matchedIds)
    expect(bi.summary_blocks).toEqual([lead(LABEL.third_party_source_rights), ...matchedIds.map(fixtureStatement), BRIDGE])
    expectJoinInvariant(bi)
  })

  test('the qualification appears exactly once and before every statement; no statement block carries a hedge of its own', () => {
    const { bi } = runShutterstock()
    expect(countOf(bi.summary, HEDGE_TAIL)).toBe(1)
    expect(bi.summary_blocks.findIndex((b) => b.startsWith(LEAD_PREFIX))).toBe(0)
    for (const id of SHUTTERSTOCK_IDS) {
      const block = bi.summary_blocks.find((b) => b === fixtureStatement(id))
      expect(block).toBeDefined()
      expect(block).not.toContain(HEDGE_TAIL)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 2. Article 50(2) + 50(4) — distinct actors, related-topic origin
// ═════════════════════════════════════════════════════════════════════════

describe('2. Article 50(2) + 50(4) (real fixture, related-topic path)', () => {
  test('separated under one leading qualifier; related clause + bridge trail once', () => {
    const { out, bi } = runArticle50()
    const matched = out.results.filter((r) => r.matched_goal_category === 'commercial_use')
    const matchedIds = matched.map((r) => r.claim_id)
    expect([...matchedIds].sort()).toEqual([ART50_2, ART50_4].sort())
    expect(matched.every((r) => r.match_origin === 'related_topic')).toBe(true)

    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.supporting_claim_ids).toEqual(matchedIds)
    expect(bi.summary_blocks).toEqual([lead(LABEL.commercial_use), ...matchedIds.map(fixtureStatement), `${RELATED} ${BRIDGE}`])
    expect(countOf(bi.summary, RELATED)).toBe(1)
    expectJoinInvariant(bi)
  })

  test('each actor stays inside its own statement block — deployer duty and provider duty never share a paragraph', () => {
    const { bi } = runArticle50()
    const block50_4 = bi.summary_blocks.find((b) => b.startsWith('Under Article 50(4)'))!
    const block50_2 = bi.summary_blocks.find((b) => b.startsWith('Under Article 50(2)'))!
    expect(block50_4).toBe(fixtureStatement(ART50_4))
    expect(block50_2).toBe(fixtureStatement(ART50_2))
    expect(block50_4).toMatch(/a deployer of an AI system/)
    expect(block50_4).not.toMatch(/Article 50\(2\)/)
    expect(block50_2).toMatch(/This duty falls on the AI system's provider, not on the person using the system to create content\./)
    expect(block50_2).not.toMatch(/Article 50\(4\)/)
    // the qualification itself names no actor and no article
    expect(bi.summary_blocks[0]).not.toMatch(/deployer|provider|Article/)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 3. Kling (dependency-free) + Track C discovered stock (dependency-bearing)
// ═════════════════════════════════════════════════════════════════════════

describe('3. Kling + Track C discovered Shutterstock stock guidance (real fixture)', () => {
  test('dependency-free block first and unqualified; leading qualifier scopes only the discovered stock statements', () => {
    const { out, bi } = runKlingPlusDiscoveredStock()
    const matched = out.results.filter((r) => r.matched_goal_category === 'commercial_use')
    const stock = matched.filter((r) => r.match_origin === 'discovered_topic')
    expect(stock.map((r) => r.claim_id).sort()).toEqual([...SHUTTERSTOCK_IDS].sort())
    expect(stock.every((r) => r.topic === 'third_party_source_rights')).toBe(true)
    const freeMatches = matched.filter((r) => r.unresolved_project_dependencies.length === 0)
    expect(freeMatches.map((r) => r.claim_id)).toContain(KLING)

    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.supporting_claim_ids).toEqual(matched.map((r) => r.claim_id))

    // Pre-existing behavior, unchanged by this milestone: the D0 boundary
    // wording follows source_fact.kind (Kling's TopicClaim is topic-sourced),
    // and a withheld commercial_use sibling adds the trailing mixed-resolution
    // sentence.
    const freeStatement = freeMatches.map((r) => r.candidate_statement).join(' ')
    const freeBoundary = freeMatches.every((r) => r.source_fact.kind === 'tool')
      ? "though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness."
      : "though it doesn't by itself determine the answer for your specific project."
    const freeBlock = `${freeStatement} This is relevant to ${LABEL.commercial_use}, ${freeBoundary}`
    const trailingMixed = bi.unresolved_relevant_claims.length > 0 ? [MIXED_RESOLUTION] : []
    expect(bi.summary_blocks).toEqual([freeBlock, lead(LABEL.commercial_use), ...stock.map((r) => fixtureStatement(r.claim_id)), BRIDGE, ...trailingMixed])
    for (const u of bi.unresolved_relevant_claims) expect(bi.supporting_claim_ids).not.toContain(u.claim_id)
    expectJoinInvariant(bi)
  })

  test('the leading qualifier is NOT applied to the dependency-free subgroup', () => {
    const { bi } = runKlingPlusDiscoveredStock()
    const klingIndex = bi.summary_blocks.findIndex((b) => b.includes(fixtureStatement(KLING)))
    const leadIndex = bi.summary_blocks.findIndex((b) => b.startsWith(LEAD_PREFIX))
    expect(klingIndex).toBe(0)
    expect(leadIndex).toBe(1)
    expect(bi.summary_blocks[klingIndex]).not.toContain(HEDGE_TAIL)
    expect(bi.summary_blocks[klingIndex]).not.toContain(LEAD_PREFIX)
    // Discovered (not related-topic) results never attach the related clause.
    expect(bi.summary).not.toContain(RELATED)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 4. Single dependency-bearing claim — byte-identical to the prior shape
// ═════════════════════════════════════════════════════════════════════════

describe('4. single dependency-bearing statement — unchanged, byte-for-byte', () => {
  test('dependency-bearing only', () => {
    const [bi] = buildBoundedInterpretations([intent()], [dep({ candidate_statement: 'Only statement.' })])
    expect(bi.summary_blocks).toEqual([`Only statement. This is relevant to ${LABEL.commercial_use}, ${HEDGE_TAIL} ${BRIDGE}`])
    expectJoinInvariant(bi)
  })

  test('dependency-free + one dependency-bearing (CC-1/CC-2 shape)', () => {
    const [bi] = buildBoundedInterpretations([intent()], [d0(), dep({ candidate_statement: 'Only statement.' })])
    expect(bi.summary_blocks).toEqual([
      `Dependency-free statement. This is relevant to ${LABEL.commercial_use}, though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.`,
      `Only statement. But based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. ${BRIDGE}`,
    ])
    expectJoinInvariant(bi)
  })

  test('related-topic single claim keeps related clause inline', () => {
    const [bi] = buildBoundedInterpretations([intent()], [dep({ candidate_statement: 'Only statement.', match_origin: 'related_topic' })])
    expect(bi.summary_blocks).toEqual([`Only statement. ${RELATED} This is relevant to ${LABEL.commercial_use}, ${HEDGE_TAIL} ${BRIDGE}`])
  })

  test('a null statement does not count toward the two-statement threshold', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [dep({ claim_id: 'A', candidate_statement: 'Only statement.' }), dep({ claim_id: 'B', candidate_statement: null })],
    )
    expect(bi.summary_blocks).toEqual([`Only statement. This is relevant to ${LABEL.commercial_use}, ${HEDGE_TAIL} ${BRIDGE}`])
    expect(bi.supporting_claim_ids).toEqual(['A', 'B'])
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 5. Related-topic clause at most once
// ═════════════════════════════════════════════════════════════════════════

describe('5. related-topic clause appears at most once', () => {
  test('two related-topic dependency-bearing claims -> one related clause, in the trailing block', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [dep({ claim_id: 'A', candidate_statement: 'Related A.', match_origin: 'related_topic' }), dep({ claim_id: 'B', candidate_statement: 'Related B.', match_origin: 'related_topic' })],
    )
    expect(bi.summary_blocks).toEqual([lead(LABEL.commercial_use), 'Related A.', 'Related B.', `${RELATED} ${BRIDGE}`])
    expect(countOf(bi.summary, RELATED)).toBe(1)
  })

  test('exact-topic only -> no related clause', () => {
    const [bi] = buildBoundedInterpretations([intent()], [dep({ claim_id: 'A', candidate_statement: 'A.' }), dep({ claim_id: 'B', candidate_statement: 'B.' })])
    expect(bi.summary).not.toContain(RELATED)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 6. H5 contribution wording keeps its original conditions
// ═════════════════════════════════════════════════════════════════════════

describe('6. H5 contribution sentence — original A/B/C conditions unchanged', () => {
  const copyDeps = [
    dep({ matched_goal_category: 'copyrightability', claim_id: 'C1', candidate_statement: 'Copy statement one.', unresolved_project_dependencies: ['human_contribution_description'] }),
    dep({ matched_goal_category: 'copyrightability', claim_id: 'C2', candidate_statement: 'Copy statement two.', unresolved_project_dependencies: ['human_contribution_description'] }),
  ]

  test('all three conditions hold -> H5 trails the statements, before the bridge, once', () => {
    const [bi] = buildBoundedInterpretations([intent({ category: 'copyrightability' })], copyDeps, [], { state: 'confirmed', value: 'I edited and arranged the clips' })
    expect(bi.summary_blocks.slice(0, 3)).toEqual([lead(LABEL.copyrightability), 'Copy statement one.', 'Copy statement two.'])
    const trailing = bi.summary_blocks[3]
    expect(trailing.startsWith('You described your own contribution as: "I edited and arranged the clips."')).toBe(true)
    expect(trailing.endsWith(` ${BRIDGE}`)).toBe(true)
    expect(bi.summary_blocks).toHaveLength(4)
    expect(countOf(bi.summary, 'You described your own contribution as')).toBe(1)
    expectJoinInvariant(bi)
  })

  test('contribution not confirmed (condition C) -> no H5', () => {
    const [bi] = buildBoundedInterpretations([intent({ category: 'copyrightability' })], copyDeps, [], { state: 'unknown' })
    expect(bi.summary).not.toContain('You described your own contribution')
    expect(bi.summary_blocks[bi.summary_blocks.length - 1]).toBe(BRIDGE)
  })

  test('non-copyright goal (condition A) -> no H5 even with the dependency and a confirmed description', () => {
    const results = copyDeps.map((r) => ({ ...r, matched_goal_category: 'commercial_use' as const }))
    const [bi] = buildBoundedInterpretations([intent()], results, [], { state: 'confirmed', value: 'I edited it' })
    expect(bi.summary).not.toContain('You described your own contribution')
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 7. Mixed-resolution sentence — unchanged, still last
// ═════════════════════════════════════════════════════════════════════════

describe('7. mixed-resolution behavior', () => {
  const diagnostics: RetrievalDiagnostic[] = [
    {
      identifier: 'commercial_use',
      reason: 'applicability_unmet',
      unmet_applicability: [
        { claim_id: 'CLAIM-WITHHELD-v1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'European Union' }, status: 'unresolved', unresolved_reason: null },
      ],
    } as RetrievalDiagnostic,
  ]

  test('mixed-resolution sentence appended once, after the trailing bridge block; unresolved claim recorded, not rendered', () => {
    const [bi] = buildBoundedInterpretations([intent()], [dep({ claim_id: 'A', candidate_statement: 'A.' }), dep({ claim_id: 'B', candidate_statement: 'B.' })], diagnostics)
    expect(bi.summary_blocks).toEqual([lead(LABEL.commercial_use), 'A.', 'B.', BRIDGE, MIXED_RESOLUTION])
    expect(bi.unresolved_relevant_claims.map((c) => c.claim_id)).toEqual(['CLAIM-WITHHELD-v1'])
    expect(bi.supporting_claim_ids).toEqual(['A', 'B'])
    expectJoinInvariant(bi)
  })

  test('no unresolved siblings -> no mixed-resolution sentence', () => {
    const [bi] = buildBoundedInterpretations([intent()], [dep({ claim_id: 'A', candidate_statement: 'A.' }), dep({ claim_id: 'B', candidate_statement: 'B.' })])
    expect(bi.summary).not.toContain(MIXED_RESOLUTION)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 8 & 9. Statuses, claim selection, dependency-free output unchanged
// ═════════════════════════════════════════════════════════════════════════

describe('8/9. statuses, selected claims and dependency-free output are unchanged', () => {
  test('directly_relevant multi-D0 (9dd9b9c4 shape) carries no leading qualifier', () => {
    const [bi] = buildBoundedInterpretations([intent()], [d0({ claim_id: 'A', candidate_statement: 'A.' }), d0({ claim_id: 'B', candidate_statement: 'B.' })])
    const tail = `This is relevant to ${LABEL.commercial_use}, though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.`
    expect(bi.status).toBe('directly_relevant')
    expect(bi.summary_blocks).toEqual([`A. ${tail}`, `B. ${tail}`])
    expect(bi.summary).not.toContain(LEAD_PREFIX)
  })

  test('two D0 + two dependency-bearing -> D0 subgroup still one joined block (deferred follow-up), unqualified by the leading sentence', () => {
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [d0({ claim_id: 'F1', candidate_statement: 'Free one.' }), dep({ claim_id: 'D1', candidate_statement: 'Dep one.' }), d0({ claim_id: 'F2', candidate_statement: 'Free two.' }), dep({ claim_id: 'D2', candidate_statement: 'Dep two.' })],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.supporting_claim_ids).toEqual(['F1', 'D1', 'F2', 'D2'])
    expect(bi.summary_blocks).toEqual([
      `Free one. Free two. This is relevant to ${LABEL.commercial_use}, though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness.`,
      lead(LABEL.commercial_use),
      'Dep one.',
      'Dep two.',
      BRIDGE,
    ])
    expect(bi.summary_blocks[0]).not.toContain(LEAD_PREFIX)
    expectJoinInvariant(bi)
  })

  test('determination_declined / outside coverage / Case 3A untouched', () => {
    const [declined] = buildBoundedInterpretations([intent({ scope: 'determination_request' })], [dep({ claim_id: 'A' }), dep({ claim_id: 'B' })])
    expect(declined.status).toBe('determination_declined')
    expect(declined.summary).not.toContain(LEAD_PREFIX)
    const [outside] = buildBoundedInterpretations([intent()], [])
    expect(outside.summary).not.toContain(LEAD_PREFIX)
  })

  test('CAH-4G.3A unresolved-applicability results are grouped with the dependency-bearing statements', () => {
    const unresolved = { status: 'unresolved' as const, unresolved_requirements: [{ fact: 'jurisdiction' as const, operator: 'equals' as const, value: 'United States' }] }
    const [bi] = buildBoundedInterpretations(
      [intent()],
      [dep({ claim_id: 'A', candidate_statement: 'A.', unresolved_project_dependencies: [], applicability: unresolved }), dep({ claim_id: 'B', candidate_statement: 'B.' })],
    )
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary_blocks).toEqual([lead(LABEL.commercial_use), 'A.', 'B.', BRIDGE])
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 11. CRC email and web paragraph presentation (full pipeline)
// ═════════════════════════════════════════════════════════════════════════

describe('11. CRC email and web presentation — one paragraph per block, qualifier first', () => {
  function articleFiftyPipeline() {
    const g = goal({ goal_id: 'g-1', raw_text: 'Does my AI video need a label under EU rules?', category: 'commercial_use' })
    const base = DIALOGUE_FIXTURES.no_signal.structured_understanding
    const su: StructuredUnderstanding = {
      ...base,
      user_goals: [g],
      project_facts: { ...base.project_facts, jurisdiction: { attestation: { state: 'confirmed', value: 'European Union' }, source_turn: 1, source_statement: 'European Union' } },
    }
    return runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
  }

  test('web input (ProjectionOutput.goal_interpretations) and realization content_blocks carry the separated blocks verbatim', () => {
    const result = articleFiftyPipeline()
    const interp = result.output.goal_interpretations[0]
    expect(interp.summary_blocks[0]).toBe(lead(LABEL.commercial_use))
    expect(interp.summary_blocks).toContain(fixtureStatement(ART50_2))
    expect(interp.summary_blocks).toContain(fixtureStatement(ART50_4))
    expect(result.realization.goal_answers[0].content_blocks).toEqual(interp.summary_blocks)
    // Article 50 statements are owned by the goal section, so they are not repeated as supplementary items.
    expect(result.plan.explicit_sections[0].summary_claim_refs.map((r) => r.claim_id).sort()).toEqual([ART50_2, ART50_4].sort())
  })

  test('email HTML renders each block as its own <p>, qualifier before both statements; plain text separates them by blank lines', () => {
    const result = articleFiftyPipeline()
    const email = buildResultsEmailContent(result.output, null, 'reader@example.com', result.plan, result.consultative_notes, result.realization)
    const blocks = result.realization.goal_answers[0].content_blocks
    const positions = blocks.map((b) => email.html.indexOf(`>${escapeHtml(b)}</p>`))
    for (const p of positions) expect(p).toBeGreaterThan(-1)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(email.text).toContain(blocks.join('\n\n'))
  })

  test('web component still maps each block to its own paragraph (source contract unchanged)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../components/CrcProjectionOutput.tsx'), 'utf8')
    expect(src).toMatch(/blocks\.map\(\(block, blockIndex\) => \(\s*<p key=\{blockIndex\}/)
  })
})

// ═════════════════════════════════════════════════════════════════════════
// 12. HRR — verbatim BI blocks, grounding preserved
// ═════════════════════════════════════════════════════════════════════════

describe('12. HRR consumes the same BI blocks verbatim', () => {
  const hrrClaim = (over: Partial<TopicClaim>): TopicClaim => ({
    claim_id: 'CLAIM-X-001-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'scope prose',
    crc_candidate_statement: 'a governed statement',
    publication_scope: 'Reviewer/Commercial Assurance',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-09-01',
    superseded_by: null,
    ...over,
  })
  const claims = [
    hrrClaim({ claim_id: 'CLAIM-HRR-A-v1', crc_candidate_statement: 'HRR statement A.', unresolved_project_dependencies: ['dep_a'] }),
    hrrClaim({ claim_id: 'CLAIM-HRR-B-v1', crc_candidate_statement: 'HRR statement B.', unresolved_project_dependencies: ['dep_b'] }),
  ]
  const reviewerContext = {
    context: { resolved_tool_ids: [], resolved_asset_provider_ids: [], jurisdiction_included: [] },
    applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    activeToolIds: [],
    assetProviderIds: [],
  }

  test('two dependency-bearing governed claims -> leading qualifier + separate statements, passed through to the HRR answer unchanged', () => {
    const input = { gate: topicSelectionGateResult('commercial_use'), reviewerContext, topicClaims: claims }
    const research = runHrrResearch(input)
    const perTopic = research.per_topic.find((p) => p.topic === 'commercial_use')!
    expect(perTopic.bi_status).toBe('relevant_applicability_unresolved')
    expect(perTopic.summary_blocks).toEqual([lead(LABEL.commercial_use), 'HRR statement A.', 'HRR statement B.', BRIDGE])

    const answer = projectHrrResearchAnswer(research)
    const topic = answer.topics.find((t) => t.topic === 'commercial_use')!
    expect(topic.bi_summary_blocks).toEqual(perTopic.summary_blocks)
  })
})
