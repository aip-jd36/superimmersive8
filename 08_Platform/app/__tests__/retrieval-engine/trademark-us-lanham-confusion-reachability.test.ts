/**
 * CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1 -- production representation
 * reachability tests (Trademark CRC Production Representation milestone,
 * 2026-09-16).
 *
 * This is the first `topic: 'trademark'` entry in TOPIC_CLAIMS_FIXTURE, and
 * the first claim whose topic is ALSO a real `GoalCategory` value added in
 * this same milestone (`types/interview-engine.ts`'s own `GOAL_CATEGORIES`).
 * Unlike CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1 (a
 * KnowledgeTopic-only, relationship-routed claim, see
 * euai-art50-4-topicclaim.test.ts), this claim is reached via the existing,
 * unmodified exact-topic path (`lookupTopicClaims`) against an explicit
 * `trademark` goal only -- no `TopicRelationship`, no discovered relevance,
 * no `ContentPresenceCategory` is authored by this milestone.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { CANDIDATE_RESPONSE_SCHEMA } from '@/lib/interview-engine/anthropic-extractor'
import { GOAL_CATEGORIES, type StructuredUnderstanding, type UserGoal } from '@/types/interview-engine'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1'
const TOPIC = 'trademark'
const DEPENDENCY = 'confusion_as_to_affiliation_or_sponsorship'

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

function trademarkGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Can I use this brand name in my video without getting sued?',
    category: 'trademark',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use this brand name in my video without getting sued?',
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

describe('CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1 -- production TopicClaim representation (2026-09-16)', () => {
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
    expect(c.jurisdiction).toBe('United States (federal)')
    expect(c.provider_scope).toBeNull()
    expect(c.tool_scope).toBeNull()
    expect(c.claim_character).toBe('established')
    expect(c.publication_scope).toBe('Reviewer/Commercial Assurance')
  })

  test('C. applicability_requirements preserved exactly: jurisdiction equals United States, no other gate', () => {
    expect(claim().applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }])
  })

  test('D. exactly one governed dependency preserved, not fabricated as resolved', () => {
    expect(claim().unresolved_project_dependencies).toEqual([DEPENDENCY])
  })

  test('E. crc_candidate_statement matches the CPR_027-approved text -- Lanham Act 15 U.S.C. § 1125(a)(1), registration-independent, distinct from copyright', () => {
    expect(claim().crc_candidate_statement).toMatch(/15 U\.S\.C\. § 1125\(a\)\(1\)/)
    expect(claim().crc_candidate_statement).toMatch(/regardless of whether the mark is federally registered/)
    expect(claim().crc_candidate_statement).toMatch(/separate legal question from copyright/)
  })

  test('F. crc_publication_scope carries the jurisdiction-attachment disclaimer, mirroring the NY/Article 50 precedent', () => {
    expect(claim().crc_publication_scope).toMatch(/including the user merely selecting, stating, or mentioning the United States/i)
    expect(claim().crc_publication_scope).not.toBeNull()
  })

  // ── G. GoalCategory membership -- the inverse of euai-art50-4's own test H ──
  test('G. trademark IS a real GoalCategory (unlike ai_content_transparency) -- reached via an explicit UserGoal, not a KnowledgeTopic relationship', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(true)
  })

  // ── H. no UNEXPECTED trademark-adjacent claim exists ────────────────────
  // Updated 2026-09-23/24 (Taiwan Trademark Act Article 68 CRC Production
  // Representation milestone): this test originally asserted zero other
  // TRADEMARK-named claims existed at all. That invariant is now
  // deliberately superseded by an intentional, governed second entry --
  // CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1, a jurisdiction-split
  // sibling under the SAME `trademark` topic (CPR_030), not a registration/
  // ownership/validity/authorization-specific claim of a different kind.
  // The guard is preserved in spirit -- catch an UNEXPECTED trademark claim
  // slipping in -- by naming the exact, closed set of two known trademark
  // claims rather than asserting none exist. See the dedicated
  // trademark-tw-art68-infringement-reachability.test.ts for that claim's
  // own full reachability/BI/multi-jurisdiction proof.
  test('H. exactly the two known trademark claims exist in the production fixture -- this one and its Taiwan Article 68 sibling -- no other, unexpected TRADEMARK-named claim', () => {
    const ids = TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id)
    const trademarkIds = ids.filter((id) => /TRADEMARK/i.test(id))
    expect(trademarkIds.sort()).toEqual([CLAIM_ID, 'CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1'].sort())
  })

  // ── I. no TopicRelationship targets trademark -- explicit-goal-only, no relationship authored ──
  test('I. no TopicRelationship in the production fixture targets the trademark topic', () => {
    const targeting = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    expect(targeting).toHaveLength(0)
  })
})

// ── dependency askability -- fail-closed, no new user-facing question ──────

describe('dependency askability, unaffected by runtime activation', () => {
  test(`${DEPENDENCY} is absent from the dependency-askability registry -- remains non-self-attestable, no new user-facing question created by this activation`, () => {
    expect(getAskabilityEntry(DEPENDENCY)).toBeUndefined()
  })
})

describe('knowledge-readiness questioning never begins asking about this claim\'s dependency', () => {
  test('deriveKnowledgeReadinessNeeds: a wide-open conversation (every real GoalCategory active) produces zero needs referencing this claim or its dependency', () => {
    const su = emptySU({ user_goals: GOAL_CATEGORIES.map((category, i) => trademarkGoal({ goal_id: `g-${i}`, category })) })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    expect(needs.some((n) => n.claim_ids.includes(CLAIM_ID))).toBe(false)
    expect(needs.some((n) => n.dependency_id === DEPENDENCY)).toBe(false)
  })
})

// ── jurisdiction applicability scenarios A-E, real pipeline ────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: United States included -> claim retrieved via explicit trademark goal', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C: a non-US jurisdiction (United Kingdom) established -> NOT retrieved, no cross-border inference', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United Kingdom']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('D: no explicit trademark goal (bare commercial_use, even with United States established) -> claim never surfaces -- explicit-goal-only, no discovered relevance', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('United States explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('E: jurisdiction fact is only the applicability gate -- retrieve() never renders a project-specific "infringement/confusion established" conclusion; result carries the bounded, general candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    // The general statutory statement itself DOES say "likely to cause
    // confusion" (that's the governed proposition) -- what must never appear
    // is that conclusion attached to THIS project/use specifically.
    expect(result?.candidate_statement).not.toMatch(/your (use|project|video|content) (infringes|is likely to cause confusion|is not authorized|is authorized)|you own (a|the) (valid )?trademark/i)
  })
})

// ── explicit-vs-discovered regression ───────────────────────────────────────

describe('explicit-vs-discovered regression -- no Track A trigger exists for trademark', () => {
  test('a bare commercial_use goal (no trademark goal at all) never discovers the trademark topic, with or without United States jurisdiction', () => {
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'United States' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).toEqual([])
  })

  test('every real GoalCategory active simultaneously (no trademark goal excluded) still produces zero discovered trademark occurrences -- no generic trigger is registered for this topic', () => {
    const su = emptySU({
      user_goals: GOAL_CATEGORIES.filter((c) => c !== 'trademark' && c !== 'unknown').map((category, i) => commercialUseGoal({ goal_id: `g-${i}`, category })),
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).toEqual([])
  })

  test('lookupTopicClaims: even with a confirmed trademark goal, no OTHER goal category ever matches this claim (exact-topic path, not fuzzy)', () => {
    for (const category of GOAL_CATEGORIES) {
      if (category === TOPIC) continue
      const result = lookupTopicClaims([trademarkGoal({ category })], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    }
  })
})

// ── full pipeline / Composition compatibility / BI ceiling ─────────────────

describe('full pipeline -- explicit trademark goal + United States jurisdiction confirmed', () => {
  test('POSITIVE CANARY: CLAIM_ID retrieves via explicit trademark goal, dependency still unresolved, BI bounded to relevant_applicability_unresolved, Projection renders the approved candidate statement, no project-specific legal conclusion', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'United States' },
      },
    })

    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    expect(item?.statement).toBe(claim().crc_candidate_statement)

    const interp = output.goal_interpretations.find((i) => i.goal_text === trademarkGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Aggregate BI ceiling: relevant_applicability_unresolved (Case 3B),
    // never directly_relevant -- forced by the one unresolved project
    // dependency (needsApplicabilityHedge in build-bounded-interpretation.ts).
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)

    // No stronger-than-BI conclusion of any kind, matching the exact
    // prohibited-conclusions boundary from crc_publication_scope (test F
    // above). The general statutory statement itself DOES say "likely to
    // cause confusion" verbatim (that's the governed proposition, asserted
    // in test A above) -- what must never appear is that conclusion, or an
    // infringement finding, attached to THIS project/use specifically.
    expect(summary).not.toMatch(/your (use|project|video|content) infringes|(this|your) (use|project) constitutes infringement/i)
    expect(summary).not.toMatch(/your (use|project|video|content) (is likely to cause|causes) confusion|likelihood of confusion (is|has been) (established|shown)( for your| in your)/i)
    expect(summary).not.toMatch(/affiliat(ed|ion) (is|has been) (established|shown)( for your| with your)?/i)
    expect(summary).not.toMatch(/constitutes "use in commerce"|does not constitute "use in commerce"/i)
    expect(summary).not.toMatch(/you (have|lack|do not have) authorization|you (have|do not have) permission/i)
    expect(summary).not.toMatch(/you own (a|the) (valid )?trademark/i)
    expect(summary).not.toMatch(/united states (law|jurisdiction) (governs|applies to) your project/i)
    expect(summary).not.toMatch(/is (legally )?permitted|is not (legally )?permitted/i)
    expect(summary).not.toMatch(/establishes (broader legal compliance|copyright clearance|overall commercial readiness)/i)
  })

  test('a non-US jurisdiction (United Kingdom) with the same explicit trademark goal never surfaces the claim through the real pipeline', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United Kingdom' }, source_turn: 1, source_statement: 'United Kingdom' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })
})

// ── structured-output / extraction schema reliability ───────────────────────

describe('extractor schema reliability (Anthropic structured output)', () => {
  test('goal_category_hint enum on the production extractor schema includes trademark', () => {
    const goalCategoryHint = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.goal_category_hint
    expect(goalCategoryHint.enum).toContain('trademark')
  })

  test('goal_category_hint enum is exactly GOAL_CATEGORIES plus null -- no drift between the runtime type and the wire schema', () => {
    const goalCategoryHint = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.goal_category_hint
    expect(goalCategoryHint.enum.filter((v: unknown) => v !== null).sort()).toEqual([...GOAL_CATEGORIES].sort())
  })
})
