/**
 * CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1 -- production representation
 * reachability tests (Third-Party Copyright CRC Production Representation
 * milestone, 2026-09-19).
 *
 * This is the first `topic: 'third_party_copyright'` entry in
 * TOPIC_CLAIMS_FIXTURE, and the first claim whose topic is ALSO a real
 * `GoalCategory` value added in this same milestone (`types/interview-
 * engine.ts`'s own `GOAL_CATEGORIES`). Mirrors
 * trademark-us-lanham-confusion-reachability.test.ts's own structure and
 * rigor exactly, adapted for this claim's own D0 (zero-dependency) shape:
 * this claim is reached via the existing, unmodified exact-topic path
 * (`lookupTopicClaims`) against an explicit `third_party_copyright` goal
 * only -- no `TopicRelationship`, no discovered relevance, no
 * `ContentPresenceCategory` is authored by this milestone. Because it
 * carries zero `unresolved_project_dependencies`, its Bounded Interpretation
 * ceiling is `directly_relevant` (not Case 3B), the same generic path
 * already empirically proven safe for the zero-dependency
 * CLAIM-ADOBESTOCK-AI-STUDIO-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1 and
 * CLAIM-COPY-004-v1 claims.
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
import { CANDIDATE_RESPONSE_SCHEMA } from '@/lib/interview-engine/anthropic-extractor'
import { GOAL_CATEGORIES, type StructuredUnderstanding, type UserGoal } from '@/types/interview-engine'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1'
const TOPIC = 'third_party_copyright'

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

function copyrightGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: "Does my video recreate a copyrighted character? What copyright issues should I understand?",
    category: 'third_party_copyright',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: "Does my video recreate a copyrighted character? What copyright issues should I understand?",
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

describe('CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1 -- production TopicClaim representation (2026-09-19)', () => {
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

  test('D. zero unresolved_project_dependencies -- D0, not fabricated as a dependency', () => {
    expect(claim().unresolved_project_dependencies).toEqual([])
  })

  test('E. crc_candidate_statement matches the CPR_028-approved text -- 17 U.S.C. §§ 106/501, distinct from copyrightability', () => {
    expect(claim().crc_candidate_statement).toMatch(/17 U\.S\.C\. § 106/)
    expect(claim().crc_candidate_statement).toMatch(/17 U\.S\.C\. § 501\(a\)/)
    expect(claim().crc_candidate_statement).toMatch(/separate legal question from whether your own AI-assisted output is itself copyrightable/)
  })

  test('F. crc_publication_scope carries the jurisdiction-attachment disclaimer, mirroring the Trademark/NY/Article 50 precedent', () => {
    expect(claim().crc_publication_scope).toMatch(/including the user merely selecting, stating, or mentioning the United States/i)
    expect(claim().crc_publication_scope).not.toBeNull()
  })

  // ── G. GoalCategory membership -- mirrors trademark's own test G ──────────
  test('G. third_party_copyright IS a real GoalCategory -- reached via an explicit UserGoal, not a KnowledgeTopic relationship', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(true)
  })

  // ── H. no other third-party-copyright-adjacent claim exists ─────────────
  test('H. no other claim in the production fixture shares this topic', () => {
    const sameTopicOthers = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID && c.topic === TOPIC)
    expect(sameTopicOthers).toHaveLength(0)
  })

  // ── I. no TopicRelationship targets third_party_copyright -- explicit-goal-only ──
  test('I. no TopicRelationship in the production fixture targets the third_party_copyright topic', () => {
    const targeting = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    expect(targeting).toHaveLength(0)
  })
})

// ── dependency askability -- moot given D0, no new question created ────────

describe('no dependency, no askability, unaffected by runtime activation', () => {
  test('knowledge-readiness questioning never begins asking about this claim -- it carries zero dependencies to ask about', () => {
    const su = emptySU({ user_goals: GOAL_CATEGORIES.map((category, i) => copyrightGoal({ goal_id: `g-${i}`, category })) })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    expect(needs.some((n) => n.claim_ids.includes(CLAIM_ID))).toBe(false)
  })
})

// ── jurisdiction applicability scenarios A-E, real pipeline ────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: United States included -> claim retrieved via explicit third_party_copyright goal', () => {
    const result = lookupTopicClaims([copyrightGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([copyrightGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C: a non-US jurisdiction (United Kingdom) established -> NOT retrieved, no cross-border inference', () => {
    const result = lookupTopicClaims([copyrightGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United Kingdom']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('D: no explicit third_party_copyright goal (bare commercial_use, even with United States established) -> claim never surfaces -- explicit-goal-only, no discovered relevance', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('United States explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([copyrightGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('E: jurisdiction fact is only the applicability gate -- retrieve() never renders a project-specific "infringement/reproduction established" conclusion; result carries the bounded, general candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/your (use|project|video|content|output) (infringes|is a derivative work|reproduces|is not authorized|is authorized)|you own (a|the) (valid )?copyright/i)
  })
})

// ── explicit-vs-discovered regression ───────────────────────────────────────

describe('explicit-vs-discovered regression -- no Track A trigger exists for third_party_copyright', () => {
  test('a bare commercial_use goal (no third_party_copyright goal at all) never discovers the topic, with or without United States jurisdiction', () => {
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

  test('every real GoalCategory active simultaneously (no third_party_copyright goal excluded) still produces zero discovered occurrences -- no generic trigger is registered for this topic', () => {
    const su = emptySU({
      user_goals: GOAL_CATEGORIES.filter((c) => c !== TOPIC && c !== 'unknown').map((category, i) => commercialUseGoal({ goal_id: `g-${i}`, category })),
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).toEqual([])
  })

  test('lookupTopicClaims: even with a confirmed third_party_copyright goal, no OTHER goal category ever matches this claim (exact-topic path, not fuzzy)', () => {
    for (const category of GOAL_CATEGORIES) {
      if (category === TOPIC) continue
      const result = lookupTopicClaims([copyrightGoal({ category })], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    }
  })
})

// ── full pipeline / Composition compatibility / BI ceiling ─────────────────

describe('full pipeline -- explicit third_party_copyright goal + United States jurisdiction confirmed', () => {
  test('POSITIVE CANARY: CLAIM_ID retrieves via explicit goal, zero dependencies, BI reaches directly_relevant (not Case 3B), Projection renders the approved candidate statement, no project-specific legal conclusion', () => {
    const su = emptySU({
      user_goals: [copyrightGoal()],
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

    const interp = output.goal_interpretations.find((i) => i.goal_text === copyrightGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Aggregate BI ceiling: directly_relevant (D0, zero dependencies) --
    // never relevant_applicability_unresolved -- the applicability gate is
    // met and hasGovernedProjectDependencies is false
    // (build-bounded-interpretation.ts's own needsApplicabilityHedge).
    // `ProjectionGoalInterpretation` (projection-layer/types.ts) never
    // exposes an internal BI `status` field to callers -- only `goal_text`/
    // `summary`/`summary_blocks` -- mirroring exactly how the Trademark
    // precedent test (trademark-us-lanham-confusion-reachability.test.ts)
    // asserts the BI ceiling via summary text alone, never `.status`. The
    // fixed, universal, domain-blind boundary clause every directly_relevant
    // interpretation carries regardless of dependency count -- the same
    // structural safety net already proven for the zero-dependency Adobe
    // Stock / COPY-004 claims -- is the actual, correct signal that this
    // reached directly_relevant rather than Case 3B (whose own closing
    // sentence, "there isn't enough project-specific information to
    // determine how it applies to your specific project," is textually
    // distinct and does not appear here).
    expect(summary).toMatch(/though it doesn't by itself determine the answer for your specific project/)
    expect(summary).not.toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)

    // No stronger-than-BI conclusion of any kind, matching the exact
    // prohibited-conclusions boundary from crc_publication_scope (test F
    // above). The general statutory statement itself DOES state the
    // exclusive-rights/infringement rule verbatim (that's the governed
    // proposition, asserted in test E above) -- what must never appear is
    // that conclusion, or an infringement finding, attached to THIS
    // project/output specifically.
    expect(summary).not.toMatch(/your (output|video|project|content) (infringes|is a derivative work based on|reproduces)/i)
    expect(summary).not.toMatch(/(this|your) (use|project|output) constitutes (infringement|copying)/i)
    expect(summary).not.toMatch(/substantial similarity (is|has been) (established|shown|found)/i)
    expect(summary).not.toMatch(/you (have|lack|do not have) authorization|you (have|do not have) permission/i)
    expect(summary).not.toMatch(/you own (a|the) (valid )?(copyright|third-party copyright)/i)
    expect(summary).not.toMatch(/fair use (does|does not) apply/i)
    expect(summary).not.toMatch(/united states (law|jurisdiction) (governs|applies to) your project/i)
    expect(summary).not.toMatch(/is (legally )?permitted|is not (legally )?permitted/i)
    expect(summary).not.toMatch(/establishes (broader legal compliance|overall commercial readiness)/i)
  })

  test('a non-US jurisdiction (United Kingdom) with the same explicit third_party_copyright goal never surfaces the claim through the real pipeline', () => {
    const su = emptySU({
      user_goals: [copyrightGoal()],
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
  test('goal_category_hint enum on the production extractor schema includes third_party_copyright', () => {
    const goalCategoryHint = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.goal_category_hint
    expect(goalCategoryHint.enum).toContain('third_party_copyright')
  })

  test('goal_category_hint enum is exactly GOAL_CATEGORIES plus null -- no drift between the runtime type and the wire schema', () => {
    const goalCategoryHint = (CANDIDATE_RESPONSE_SCHEMA.properties.candidates.items as any).properties.goal_category_hint
    expect(goalCategoryHint.enum.filter((v: unknown) => v !== null).sort()).toEqual([...GOAL_CATEGORIES].sort())
  })
})
