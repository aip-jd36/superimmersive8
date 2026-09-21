/**
 * CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1 -- production representation
 * reachability tests (Taiwan AI-Assisted Copyrightability Production
 * Representation milestone, 2026-09-21).
 *
 * First Taiwan-jurisdiction Living Knowledge claim in this corpus. Reuses
 * the existing `copyrightability` topic/GoalCategory verbatim -- no new
 * GoalCategory, no new KnowledgeTopic, no TopicRelationship. Mirrors
 * copyright-us-third-party-output-reachability.test.ts's own structure and
 * rigor, adapted for this claim's own D1 shape (`human_contribution_
 * description`, not D0): its Bounded Interpretation ceiling is permanently
 * Case 3B (`relevant_applicability_unresolved`), never `directly_relevant`,
 * matching CLAIM-COPY-001/002/003-v1's own already-proven behavior for the
 * identical dependency under the identical topic.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { GOAL_CATEGORIES, type StructuredUnderstanding, type UserGoal } from '@/types/interview-engine'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'
const TOPIC = 'copyrightability'

function claim() {
  const c = TOPIC_CLAIMS_FIXTURE.find((x) => x.claim_id === CLAIM_ID)
  if (!c) throw new Error(`${CLAIM_ID} not found in TOPIC_CLAIMS_FIXTURE`)
  return c
}

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

function copyrightabilityGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Is my AI-generated video copyrightable under Taiwan law?',
    category: 'copyrightability',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Is my AI-generated video copyrightable under Taiwan law?',
    ...overrides,
  }
}

function commercialUseGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-cu',
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

function facts(jurisdictionIncluded: string[] = [], jurisdictionExcluded: string[] = []): ApplicabilityFacts {
  return { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] }
}

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
    organization_location_mentions: [],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

// ── A. fixture fidelity ─────────────────────────────────────────────────────

describe('CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1 -- production TopicClaim representation (2026-09-21)', () => {
  test('A. exists exactly once in TOPIC_CLAIMS_FIXTURE, Adopted, crc_eligible Yes', () => {
    const matches = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === CLAIM_ID)
    expect(matches).toHaveLength(1)
    expect(claim().lifecycle).toBe('Adopted')
    expect(claim().crc_eligible).toBe('Yes')
    expect(claim().superseded_by).toBeNull()
  })

  test('B. topic, jurisdiction, provider_scope, tool_scope, claim_character, publication_scope projected faithfully', () => {
    const c = claim()
    expect(c.topic).toBe(TOPIC)
    expect(c.jurisdiction).toBe('Taiwan')
    expect(c.provider_scope).toBeNull()
    expect(c.tool_scope).toBeNull()
    expect(c.claim_character).toBe('established')
    expect(c.publication_scope).toBe('Reviewer/Commercial Assurance')
  })

  test('C. applicability_requirements preserved exactly: jurisdiction equals Taiwan, no other gate', () => {
    expect(claim().applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'Taiwan' }])
  })

  test('D. exactly one dependency -- human_contribution_description (D1, reused from CLAIM-COPY-001/002/003-v1, not fabricated)', () => {
    expect(claim().unresolved_project_dependencies).toEqual(['human_contribution_description'])
  })

  test('E. crc_candidate_statement matches the CPR_029-approved text -- TIPO letter 1140522c + Copyright Act Arts. 3/10/11/12, ownership kept separate', () => {
    expect(claim().crc_candidate_statement).toMatch(/Taiwan copyright law/)
    expect(claim().crc_candidate_statement).toMatch(/may be eligible for copyright protection/)
    expect(claim().crc_candidate_statement).toMatch(/Ownership of a protected work is a separate question/)
  })

  test('F. crc_publication_scope carries the jurisdiction-attachment disclaimer, mirroring the US/Trademark/Third-Party-Copyright precedent', () => {
    expect(claim().crc_publication_scope).toMatch(/Taiwan jurisdiction attaches to a specific project for any reason including the user merely selecting it as the assessment jurisdiction/i)
    expect(claim().crc_publication_scope).not.toBeNull()
  })

  test('G. copyrightability topic reuses an EXISTING GoalCategory -- no new enum registration required by this milestone', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(true)
  })

  test('H. this claim is the only Taiwan-jurisdiction entry under the copyrightability topic', () => {
    const sameTopicTaiwan = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID && c.topic === TOPIC && c.jurisdiction === 'Taiwan')
    expect(sameTopicTaiwan).toHaveLength(0)
  })

  test('I. no TopicRelationship in the production fixture targets this claim -- explicit-goal-only', () => {
    // No relationship exists that would route a different goal category to
    // this specific claim_id; the existing REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1
    // relationship (if present) targets the copyrightability TOPIC generically
    // for copyright_ownership goals, unchanged by this milestone -- it does not
    // single out this claim_id or Taiwan jurisdiction.
    const targetingTopic = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    // Whatever relationships already exist for the topic (if any) are
    // pre-existing and unmodified by this milestone -- this test only
    // confirms this milestone did not add a new one referencing Taiwan.
    for (const rel of targetingTopic) {
      expect(JSON.stringify(rel)).not.toMatch(/taiwan/i)
    }
  })
})

// ── dependency askability -- reused, unchanged, no new question ────────────

describe('dependency askability -- human_contribution_description reused unchanged', () => {
  test('knowledge-readiness questioning treatment for this claim is identical to the existing US copyrightability claims (same dependency, same askability registry entry)', () => {
    const su = emptySU({ user_goals: [copyrightabilityGoal()] })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    // human_contribution_description is handled by the dedicated,
    // pre-existing human-contribution-clarification module (not the generic
    // readiness path) -- this milestone introduces no new readiness need.
    expect(needs.some((n) => n.claim_ids.includes(CLAIM_ID) && n.dependency_id !== 'human_contribution_description')).toBe(false)
  })
})

// ── jurisdiction applicability scenarios, real pipeline ─────────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: Taiwan included -> claim retrieved via explicit copyrightability goal', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C (JURISDICTION NEGATIVE CONTROL): United States established -> Taiwan claim NOT retrieved, no cross-border inference', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    // Conversely, the existing US claims DO match under US jurisdiction --
    // proving the two claims are cleanly, mutually jurisdiction-gated, not
    // that Retrieval simply stopped matching anything.
    expect(result.matches.map((m) => m.claim_id)).toEqual(expect.arrayContaining(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']))
  })

  test('D (JURISDICTION NEGATIVE CONTROL, reverse direction): Taiwan established -> the existing US copyrightability claims do NOT match', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toEqual(expect.arrayContaining(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']))
    expect(result.matches.map((m) => m.claim_id)).toEqual(['CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'])
  })

  test('E: no explicit copyrightability goal (bare commercial_use, even with Taiwan established) -> claim never surfaces -- explicit-goal-only, no discovered relevance', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('Taiwan explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('F: retrieve() never renders a project-specific copyrightability/ownership conclusion; result carries the bounded, general candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/your (output|video|project) (is|is not) (protected|copyrightable)|you (are|own)/i)
  })
})

// ── explicit-vs-discovered regression ───────────────────────────────────────

describe('explicit-vs-discovered regression -- no Track A trigger exists for this claim / Taiwan jurisdiction', () => {
  test('a bare commercial_use goal (no copyrightability goal at all) never discovers this claim, with or without Taiwan jurisdiction', () => {
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).not.toContainEqual(expect.objectContaining({ claim_id: CLAIM_ID }))
  })

  test('a confirmed human_contribution_description alone (no copyrightability/copyright_ownership goal) never discovers this claim -- the dependency\'s existence does not itself justify Track A', () => {
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
        human_contribution_description: { attestation: { state: 'confirmed', value: 'I wrote detailed prompts and edited the output.' }, source_turn: 1, source_statement: 'I wrote detailed prompts and edited the output.' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).not.toContainEqual(expect.objectContaining({ claim_id: CLAIM_ID }))
  })

  test('lookupTopicClaims: even with a confirmed copyrightability goal, no OTHER goal category ever matches this specific claim_id (exact-topic path, not fuzzy)', () => {
    for (const category of GOAL_CATEGORIES) {
      if (category === TOPIC) continue
      const result = lookupTopicClaims([copyrightabilityGoal({ category })], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    }
  })
})

// ── full pipeline / BI ceiling -- the safety-critical proof ─────────────────

describe('full pipeline -- explicit copyrightability goal + Taiwan jurisdiction confirmed', () => {
  test('CANARY 1 (no human_contribution_description): CLAIM_ID retrieves via explicit goal, BI reaches Case 3B (relevant_applicability_unresolved), never directly_relevant', () => {
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })

    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    expect(item?.statement).toBe(claim().crc_candidate_statement)

    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightabilityGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // The Case-3B closing sentence, textually distinct from directly_relevant's
    // own boundary clause -- proves this claim did NOT reach directly_relevant,
    // by direct output inspection (ProjectionGoalInterpretation exposes no
    // internal `.status` field), mirroring the Trademark/Third-Party-Copyright
    // precedent's own assertion-by-summary-text approach exactly.
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(summary).not.toMatch(/though it doesn't by itself determine the answer for your specific project/)

    // No stronger-than-BI conclusion of any kind.
    expect(summary).not.toMatch(/your (output|video|project) (is|is not) (protected|copyrightable) by copyright/i)
    expect(summary).not.toMatch(/your (contribution|prompting|editing) (is|is not) (sufficiently|legally) (creative|sufficient)/i)
    expect(summary).not.toMatch(/you are the author/i)
    expect(summary).not.toMatch(/(you|the (employer|client|commissioning party)) owns? (the|a) (copyright|economic rights)/i)
    expect(summary).not.toMatch(/infringement (occurred|did not occur)/i)
    expect(summary).not.toMatch(/third-party rights (are|is) cleared/i)
    expect(summary).not.toMatch(/taiwan (law|jurisdiction) (governs|applies to) your project/i)
    expect(summary).not.toMatch(/commercially cleared/i)
  })

  test('CANARY 2 (human_contribution_description CONFIRMED): claim remains Case 3B -- H5 echo sentence present, status unchanged, no legal-standard resolution', () => {
    const description = 'I wrote detailed prompts and then selected, arranged, and edited the AI-generated clips myself.'
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
        human_contribution_description: { attestation: { state: 'confirmed', value: description }, source_turn: 2, source_statement: description },
      },
    })

    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightabilityGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Still Case 3B -- the dependency is NEVER dynamically resolved/cleared
    // by a confirmed project fact; presence of a human-contribution
    // description does not, and structurally cannot, transition this claim
    // to directly_relevant.
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(summary).not.toMatch(/though it doesn't by itself determine the answer for your specific project/)

    // H5 echo present -- the user's own words are reflected back, bounded,
    // non-interpretive.
    expect(summary).toMatch(/You described your own contribution as:/)
    expect(summary).toMatch(new RegExp(description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

    // The echo sentence itself never asserts sufficiency, existence, or
    // non-existence of copyright -- it only names the general relevant
    // category of contribution and explicitly disclaims a legal-threshold
    // determination.
    expect(summary).toMatch(/CRC can't determine from this conversation whether your described contribution meets that legal threshold/)
    expect(summary).not.toMatch(/your contribution (is|meets|satisfies) the (legal )?threshold/i)
    expect(summary).not.toMatch(/copyright (exists|does not exist) for (this|your) project/i)
  })

  test('a different jurisdiction (United States) with the same explicit copyrightability goal never surfaces THIS claim through the real pipeline (the US claims surface instead)', () => {
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'United States' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
    expect(output.knowledge_items.map((k) => k.claim_id)).toEqual(expect.arrayContaining(['CLAIM-COPY-001-v1']))
  })
})

// ── fail-closed: malformed/missing state never strengthens the result ──────

describe('fail-closed behavior', () => {
  test('unresolved jurisdiction (no confirmed value at all) -> claim absent, not silently defaulted to a match', () => {
    const su = emptySU({ user_goals: [copyrightabilityGoal()] })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })

  test('human_contribution_description present but only "unknown" state (not confirmed) -> no H5 echo, still Case 3B, no strengthening', () => {
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightabilityGoal().raw_text)
    const summary = interp!.summary
    expect(summary).not.toMatch(/You described your own contribution as:/)
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
  })
})
