/**
 * CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1 -- production representation
 * reachability tests (PRODUCTION-REPRESENTATION-CHINA-AI-ASSISTED-
 * COPYRIGHTABILITY-1, 2026-10-08).
 *
 * First China-jurisdiction Living Knowledge claim in this corpus. Reuses the
 * existing `copyrightability` topic/GoalCategory verbatim -- no new
 * GoalCategory, no new KnowledgeTopic, no TopicRelationship. Mirrors
 * copyright-tw-ai-assisted-output-reachability.test.ts's own structure and
 * rigor, adapted for this claim's own national-uncertainty shape: the
 * governed proposition's load-bearing closing clause (the SPC's twice-
 * independently-stated non-decision) must survive, byte-identical, all the
 * way to the rendered CRC output -- not merely contain a keyword such as
 * "unsettled" or "SPC" that could remain true while the rest of the limiting
 * sentence silently disappeared.
 *
 * Governance chain: FGR_028 (ADVANCE) -> PM Adoption (D1, independently
 * re-derived from zero) -> CPR_034 (APPROVE FOR CRC PUBLICATION) ->
 * Production Readiness (generic China jurisdiction canonicalization, commit
 * 23f04466) -> this Production Representation.
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

const CLAIM_ID = 'CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1'
const TOPIC = 'copyrightability'
const TW_SIBLING_ID = 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'
const US_SIBLING_IDS = ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']
const WITHHELD_CN_LIKENESS_ID = 'CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1' // different China domain, WITHHELD -- no fixture entry

// The exact, governed, load-bearing statement -- byte-identical to
// GOVERNED-CLAIMS.md's own `CRC Candidate Statement:` field and to the
// fixture entry's `crc_candidate_statement`. A fragile keyword search (e.g.
// matching only "unsettled" or "SPC") could keep passing while the rest of
// this limiting clause silently disappeared from a future edit; this full
// string is the mechanical protection the national-uncertainty requirement
// (PRODUCTION-REPRESENTATION-CHINA-AI-ASSISTED-COPYRIGHTABILITY-1 §P) calls
// for.
const GOVERNED_STATEMENT =
  "In Chinese litigation, when courts assess whether AI-assisted or AI-generated content is protected by copyright, official Supreme People's Court guidance directs courts to comprehensively consider the human user's specific input instructions and the process of selection and modification, to determine whether the resulting content reflects the human's own original creative choices and expression. Particular Chinese courts (reported Wuhan decisions) have found copyright protection on this basis in specific, fact-specific cases. However, the Supreme People's Court has twice stated, in separate 2026 official explanatory publications, that views on the copyrightability of AI-generated content remain divided and that its own AI-disputes Opinion does not establish a rule on this question -- there is no uniform national rule on AI-content copyrightability in China at this time."

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
    raw_text: 'Is my AI-generated video copyrightable under Chinese law?',
    category: 'copyrightability',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Is my AI-generated video copyrightable under Chinese law?',
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

describe('CLAIM-COPYRIGHT-CN-AI-ASSISTED-OUTPUT-001-v1 -- production TopicClaim representation (2026-10-08)', () => {
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
    expect(c.jurisdiction).toBe('China')
    expect(c.provider_scope).toBeNull()
    expect(c.tool_scope).toBeNull()
    expect(c.claim_character).toBe('established')
    expect(c.publication_scope).toBe('Reviewer/Commercial Assurance')
  })

  test('C. applicability_requirements preserved exactly: jurisdiction equals China, no other gate', () => {
    expect(claim().applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'China' }])
  })

  test('D. exactly one dependency -- human_contribution_description (D1, independently re-derived, not inherited from Taiwan for symmetry)', () => {
    expect(claim().unresolved_project_dependencies).toEqual(['human_contribution_description'])
  })

  test('E. crc_candidate_statement is byte-identical to the governed statement -- the national-uncertainty clause cannot silently disappear while a fragile keyword match would still pass', () => {
    expect(claim().crc_candidate_statement).toBe(GOVERNED_STATEMENT)
  })

  test("E2. the national-uncertainty clause specifically, and the Wuhan fact-specific framing, are both present within that byte-identical statement", () => {
    expect(claim().crc_candidate_statement).toMatch(/there is no uniform national rule on AI-content copyrightability in China at this time/)
    expect(claim().crc_candidate_statement).toMatch(/twice stated, in separate 2026 official explanatory publications/)
    expect(claim().crc_candidate_statement).toMatch(/\(reported Wuhan decisions\) have found copyright protection on this basis in specific, fact-specific cases/)
  })

  test('F. crc_publication_scope carries the jurisdiction-attachment disclaimer and the national-rule disclaimer, mirroring the Taiwan/US precedent', () => {
    expect(claim().crc_publication_scope).toMatch(/Chinese jurisdiction attaches to a specific project for any reason including the user merely selecting China as the assessment jurisdiction/i)
    expect(claim().crc_publication_scope).toMatch(/the Wuhan cases or the Implementation Plan establish a national rule/i)
    expect(claim().crc_publication_scope).not.toBeNull()
  })

  test('G. copyrightability topic reuses an EXISTING GoalCategory -- no new enum registration required by this milestone', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(true)
  })

  test('H. this claim is the only China-jurisdiction entry under the copyrightability topic', () => {
    const sameTopicChina = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID && c.topic === TOPIC && c.jurisdiction === 'China')
    expect(sameTopicChina).toHaveLength(0)
  })

  test('I. no TopicRelationship in the production fixture targets this claim -- explicit-goal-only', () => {
    const targetingTopic = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    for (const rel of targetingTopic) {
      expect(JSON.stringify(rel)).not.toMatch(/china/i)
    }
  })
})

// ── dependency askability -- reused, unchanged, no new question ────────────

describe('dependency askability -- human_contribution_description reused unchanged', () => {
  test('knowledge-readiness questioning treatment for this claim is identical to the existing Taiwan/US copyrightability claims (same dependency, same askability registry entry)', () => {
    const su = emptySU({ user_goals: [copyrightabilityGoal()] })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    expect(needs.some((n) => n.claim_ids.includes(CLAIM_ID) && n.dependency_id !== 'human_contribution_description')).toBe(false)
  })
})

// ── jurisdiction applicability scenarios, real pipeline ─────────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: China included -> claim retrieved via explicit copyrightability goal', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['China']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('A2: the China jurisdiction aliases admitted at Production Readiness (PRC, People\'s Republic of China) also retrieve this claim through the real canonicalization boundary -- not merely the bare canonical value', () => {
    for (const rawValue of ['PRC', "People's Republic of China", "the People's Republic of China"]) {
      const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts([rawValue]))
      expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
    }
  })

  test('A3: "Mainland China" remains deliberately unaliased/fail-closed -- Production Readiness rejected it as ambiguous, not merely unproven; this claim must NOT retrieve on that raw value', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Mainland China']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C (JURISDICTION NEGATIVE CONTROL): Taiwan established -> China claim NOT retrieved, no cross-jurisdiction inference within the same topic', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    expect(result.matches.map((m) => m.claim_id)).toContain(TW_SIBLING_ID)
  })

  test('D (JURISDICTION NEGATIVE CONTROL, reverse direction): China established -> the existing Taiwan/US copyrightability claims do NOT match', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['China']))
    expect(result.matches.map((m) => m.claim_id)).toEqual([CLAIM_ID])
    expect(result.matches.map((m) => m.claim_id)).not.toEqual(expect.arrayContaining([TW_SIBLING_ID, ...US_SIBLING_IDS]))
  })

  test('E: no explicit copyrightability goal (bare commercial_use, even with China established) -> claim never surfaces -- explicit-goal-only, no discovered relevance', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['China']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('China explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['China']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('F: retrieve() never renders a project-specific copyrightability/ownership conclusion; result carries the bounded, general candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, facts(['China']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).toBe(GOVERNED_STATEMENT)
    expect(result?.candidate_statement).not.toMatch(/your (output|video|project) (is|is not) (protected|copyrightable)|you (are|own)/i)
  })
})

// ── explicit-vs-discovered regression ───────────────────────────────────────

describe('explicit-vs-discovered regression -- no Track A trigger exists for this claim / China jurisdiction', () => {
  test('a bare commercial_use goal (no copyrightability goal at all) never discovers this claim, with or without China jurisdiction', () => {
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'China' }, source_turn: 1, source_statement: 'China' },
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
        jurisdiction: { attestation: { state: 'confirmed', value: 'China' }, source_turn: 1, source_statement: 'China' },
        human_contribution_description: { attestation: { state: 'confirmed', value: 'I wrote detailed prompts and edited the output.' }, source_turn: 1, source_statement: 'I wrote detailed prompts and edited the output.' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).not.toContainEqual(expect.objectContaining({ claim_id: CLAIM_ID }))
  })

  test('lookupTopicClaims: even with a confirmed copyrightability goal, no OTHER goal category ever matches this specific claim_id (exact-topic path, not fuzzy)', () => {
    for (const category of GOAL_CATEGORIES) {
      if (category === TOPIC) continue
      const result = lookupTopicClaims([copyrightabilityGoal({ category })], TOPIC_CLAIMS_FIXTURE, facts(['China']))
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    }
  })
})

// ── full pipeline / BI ceiling -- the safety-critical proof ─────────────────

describe('full pipeline -- explicit copyrightability goal + China jurisdiction confirmed', () => {
  test('CANARY 1 (no human_contribution_description): CLAIM_ID retrieves via explicit goal, statement is byte-identical to the governed text, BI reaches Case 3B (relevant_applicability_unresolved), never directly_relevant', () => {
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'China' }, source_turn: 1, source_statement: 'China' },
      },
    })

    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    expect(item?.statement).toBe(GOVERNED_STATEMENT)

    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightabilityGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Case-3B closing sentence present -- proves this claim did NOT reach
    // directly_relevant, by direct output inspection.
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(summary).not.toMatch(/though it doesn't by itself determine the answer for your specific project/)

    // The rendered summary itself must still carry the governed statement
    // (and therefore the national-uncertainty clause) verbatim.
    expect(summary).toContain(GOVERNED_STATEMENT)

    // No stronger-than-BI conclusion of any kind.
    expect(summary).not.toMatch(/your (output|video|project) (is|is not) (protected|copyrightable) by copyright/i)
    expect(summary).not.toMatch(/your (contribution|prompting|editing) (is|is not) (sufficiently|legally) (creative|sufficient)/i)
    expect(summary).not.toMatch(/you are the author/i)
    expect(summary).not.toMatch(/(you|the (employer|client|commissioning party)) owns? (the|a) (copyright|economic rights)/i)
    expect(summary).not.toMatch(/infringement (occurred|did not occur)/i)
    expect(summary).not.toMatch(/third-party rights (are|is) cleared/i)
    expect(summary).not.toMatch(/chinese (law|jurisdiction) (governs|applies to) your project/i)
    expect(summary).not.toMatch(/commercially cleared/i)
    expect(summary).not.toMatch(/the wuhan cases? (establish|binds?|is binding)/i)
    expect(summary).not.toMatch(/the implementation plan (resolved|settles?|establishes?) the national/i)
  })

  test('CANARY 2 (human_contribution_description CONFIRMED): claim remains Case 3B -- H5 echo sentence present, status unchanged, no legal-standard resolution', () => {
    const description = 'I wrote the script, directed the AI prompting shot by shot, and personally selected and edited the final cuts.'
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'China' }, source_turn: 1, source_statement: 'China' },
        human_contribution_description: { attestation: { state: 'confirmed', value: description }, source_turn: 2, source_statement: description },
      },
    })

    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightabilityGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Still Case 3B -- the dependency is NEVER dynamically resolved/cleared
    // by a confirmed project fact; a human-contribution description does
    // not, and structurally cannot, transition this claim to
    // directly_relevant, regardless of how much contribution is described.
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(summary).not.toMatch(/though it doesn't by itself determine the answer for your specific project/)

    // H5 echo present -- the user's own words are reflected back, bounded,
    // non-interpretive.
    expect(summary).toMatch(/You described your own contribution as:/)
    expect(summary).toMatch(new RegExp(description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

    // The echo sentence itself never asserts sufficiency, existence, or
    // non-existence of copyright -- and the national-uncertainty clause
    // still survives alongside it.
    expect(summary).toMatch(/CRC can't determine from this conversation whether your described contribution meets that legal threshold/)
    expect(summary).not.toMatch(/your contribution (is|meets|satisfies) the (legal )?threshold/i)
    expect(summary).not.toMatch(/copyright (exists|does not exist) for (this|your) project/i)
    expect(summary).toContain('there is no uniform national rule on AI-content copyrightability in China at this time')
  })

  test('a different jurisdiction (Taiwan) with the same explicit copyrightability goal never surfaces THIS claim through the real pipeline (the Taiwan claim surfaces instead)', () => {
    const su = emptySU({
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
    expect(output.knowledge_items.map((k) => k.claim_id)).toEqual(expect.arrayContaining([TW_SIBLING_ID]))
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
        jurisdiction: { attestation: { state: 'confirmed', value: 'China' }, source_turn: 1, source_statement: 'China' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightabilityGoal().raw_text)
    const summary = interp!.summary
    expect(summary).not.toMatch(/You described your own contribution as:/)
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
  })
})

// ── sibling non-interference ─────────────────────────────────────────────

describe('sibling non-interference -- Taiwan/US copyrightability siblings and the unrelated China Likeness domain are untouched', () => {
  test('Taiwan and US copyrightability claims retain their own unchanged jurisdiction/applicability/dependency shape', () => {
    const tw = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === TW_SIBLING_ID)
    expect(tw?.jurisdiction).toBe('Taiwan')
    expect(tw?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'Taiwan' }])
    for (const id of US_SIBLING_IDS) {
      const us = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)
      expect(us).toBeDefined()
      expect(us?.jurisdiction).not.toBe('China')
    }
  })

  test('the unrelated China Likeness domain (CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1) remains correctly absent from TOPIC_CLAIMS_FIXTURE -- this Production Representation does not make it reachable', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === WITHHELD_CN_LIKENESS_ID)).toBeUndefined()
  })
})
