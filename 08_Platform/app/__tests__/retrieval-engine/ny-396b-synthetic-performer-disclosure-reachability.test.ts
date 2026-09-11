/**
 * NY GBL 396-b Synthetic Performer Disclosure -- real-publication reachability
 * tests (Generic Non-Provider TopicClaim Runtime Activation milestone,
 * 2026-09-10).
 *
 * CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1 is the second
 * `provider_scope: null` / `tool_scope: null` claim to reach real
 * TOPIC_CLAIMS_FIXTURE representation, after the four CLAIM-COPY-* entries,
 * and the first `likeness`-topic claim to do so -- the sibling
 * CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1 remains withheld under
 * CPR_008 and has no fixture entry, proven absent below (§12 negative
 * control -- a governance-only boundary, distinct from a runtime one).
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone. The scratch canary
 * that validated this claim's runtime shape before activation (CPR_025's
 * own gate) was deleted after that review; these are the first COMMITTED
 * tests for this claim.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { deriveDiscoveredTopicOccurrences, discoveredTopicCategories } from '@/lib/crc-engine/discovered-relevance'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { deriveKnowledgeReadinessNeeds } from '@/lib/crc-engine/knowledge-readiness'
import { createInitialBoundaryState } from '@/lib/interview-engine/boundaries'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ContentPresenceMention, RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1'
const SIBLING_ID = 'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1' // WITHHELD (CPR_008) -- no fixture entry, must never appear reachable

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

function likenessGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    category: 'likeness',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    ...overrides,
  }
}

function facts(jurisdictionIncluded: string[] = [], jurisdictionExcluded: string[] = []): ApplicabilityFacts {
  return { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] }
}

// Bridge #2 (2026-09-11) helpers -- the production case this milestone
// closes: an active EXPLICIT `commercial_use` goal (never `likeness`,
// exactly as Bridge #1 correctly classifies "Are there any rules I should
// know about before using this commercially?"), plus an observable
// synthetic-person content-presence fact.

function commercialUseGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-cu',
    state: 'confirmed',
    raw_text: 'Are there any rules I should know about before using this commercially?',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Are there any rules I should know about before using this commercially?',
    ...overrides,
  }
}

function syntheticPresenceMention(overrides: Partial<ContentPresenceMention> = {}): ContentPresenceMention {
  return {
    mention_id: 'cp-1',
    category: 'person_visual_presence',
    real_or_synthetic: 'synthetic',
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: "It's an AI-generated performer who isn't based on or recognizable as any real person.",
    superseded_by: null,
    ...overrides,
  }
}

// ── §5/§7: fixture fidelity + dependency preservation ──────────────────────

describe('fixture fidelity, mechanical projection from GOVERNED-CLAIMS.md', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)

  test('exists exactly once, Adopted, crc_eligible Yes', () => {
    const matches = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === CLAIM_ID)
    expect(matches).toHaveLength(1)
    expect(claim?.lifecycle).toBe('Adopted')
    expect(claim?.crc_eligible).toBe('Yes')
  })

  test('topic, jurisdiction, provider_scope, tool_scope, claim_character projected faithfully', () => {
    expect(claim?.topic).toBe('likeness')
    expect(claim?.jurisdiction).toBe('New York (state)')
    expect(claim?.provider_scope).toBeNull()
    expect(claim?.tool_scope).toBeNull()
    expect(claim?.claim_character).toBe('established')
    expect(claim?.publication_scope).toBe('Reviewer/Commercial Assurance')
  })

  test('applicability_requirements preserved exactly: jurisdiction equals New York, no other gate', () => {
    expect(claim?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'New York' }])
  })

  test('all four governed dependencies preserved exactly, none fabricated as resolved', () => {
    expect(claim?.unresolved_project_dependencies).toEqual([
      'advertiser_or_duty_holder_status_confirmed',
      'synthetic_performer_present_confirmed',
      'actual_knowledge_confirmed',
      'expressive_work_exemption_applies',
    ])
  })

  test('crc_candidate_statement matches the CPR_025-approved text verbatim, not the shorter pre-CPR draft', () => {
    expect(claim?.crc_candidate_statement).toMatch(/not recognizable as any identifiable natural performer/)
    expect(claim?.crc_candidate_statement).toMatch(/consistent with its use in the work/)
    expect(claim?.crc_candidate_statement).toMatch(/\$1,000 for a first violation and \$5,000/)
  })
})

// ── §14: questioning boundary -- none of the four dependencies become askable merely by activation ──

describe('dependency askability, unaffected by runtime activation', () => {
  test.each(['advertiser_or_duty_holder_status_confirmed', 'synthetic_performer_present_confirmed', 'actual_knowledge_confirmed', 'expressive_work_exemption_applies'])(
    '%s is absent from the dependency-askability registry -- remains non-self-attestable, no new user-facing question created by this activation',
    (dep) => {
      expect(getAskabilityEntry(dep)).toBeUndefined()
    },
  )
})

// ── §6: jurisdiction applicability, real pipeline ───────────────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: New York included -> claim retrieved via explicit likeness goal', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C: another US jurisdiction (California) established -> NOT retrieved, no cross-state inference', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('D: "United States" only (country-level) -> NOT retrieved, no US->NY hierarchy inferred', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('New York explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['New York']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('E: jurisdiction fact is only the applicability gate -- retrieve() never renders a "NY law definitely governs" conclusion; result carries the bounded candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/definitely governs|legally governs your project|applies to your project/i)
  })
})

// ── §9: discovered relevance / Track C ──────────────────────────────────────
//
// Bridge #2 (2026-09-11) registered a generic content_presence_mention ->
// likeness trigger (synthetic_person_content_presence_to_likeness,
// lib/crc-engine/discovered-relevance.ts). The claim below remains
// explicit-goal-only ONLY in the absence of both an active commercial_use
// goal AND an observable synthetic-person fact -- see the two describe
// blocks below for the pre-/post-Bridge-#2 boundary, both proven against
// this real, committed fixture.

describe('Track C discovered relevance -- no goal, no fact -> still explicit-goal-only', () => {
  test('with no active goal at all, no discovered-relevance occurrence is produced for likeness (the registered trigger requires an active commercial_use goal, per Option D -- absence of a goal is absence of relevance, not absence of a trigger)', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [], // no explicit goal
    }
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
  })

  test('with an active commercial_use goal but NO content-presence evidence, likeness is still not discovered -- the trigger requires the observable synthetic-person fact, not merely the parent goal', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialUseGoal()],
      content_presence_mentions: [],
      distribution_territory_mentions: [],
    }
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
  })
})

describe('Bridge #2 — real production gap closed: commercial_use goal + synthetic-person fact -> likeness discovered against the real fixture', () => {
  function suWithSyntheticPersonAndJurisdiction(jurisdiction: string | null): StructuredUnderstanding {
    return {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialUseGoal()],
      content_presence_mentions: [syntheticPresenceMention()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction:
          jurisdiction === null
            ? DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts.jurisdiction
            : { attestation: { state: 'confirmed', value: jurisdiction }, source_turn: 1, source_statement: jurisdiction },
      },
    }
  }

  test('discovered occurrence: topic likeness, source_kind content_presence_mention, matched_goal_category commercial_use -- against the real TOPIC_CLAIMS_FIXTURE, no synthetic clone', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    const likenessOcc = occurrences.find((o) => o.topic === 'likeness')
    expect(likenessOcc).toBeDefined()
    expect(likenessOcc?.source_kind).toBe('content_presence_mention')
    expect(likenessOcc?.source_goal_category).toBe('commercial_use')
  })

  // Positive §396-b canary (task Section 8).
  test('POSITIVE CANARY: full pipeline, NY jurisdiction + synthetic person + commercial_use goal -> CLAIM_ID retrieves via discovered_topic/commercial_use, no fabricated goal, dependencies still unresolved, BI bounded, Projection renders the approved candidate statement, no project-specific legal conclusion', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    const discoveredOccurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    const applicabilityFacts = facts(['New York'])

    // 1. Track A emits discovered likeness relevance.
    expect(discoveredOccurrences.some((o) => o.topic === 'likeness')).toBe(true)

    // 2 + 3 + 4. §396-b retrieves, match_origin discovered_topic, matched_goal_category commercial_use.
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, applicabilityFacts, [], [], discoveredOccurrences)
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.match_origin).toBe('discovered_topic')
    expect(result?.matched_goal_category).toBe('commercial_use')

    // 5. No fabricated UserGoal -- the only goal remains the real explicit commercial_use one.
    expect(su.user_goals).toHaveLength(1)
    expect(su.user_goals[0].category).toBe('commercial_use')

    // 6. Jurisdiction applicability independently passes (New York confirmed).
    // Already proven by claim presence above -- applicability_requirements
    // gates on the SAME `facts` this call already used.

    // 7. All four legal dependencies remain unresolved/evidence-only.
    expect(result?.unresolved_project_dependencies).toEqual([
      'advertiser_or_duty_holder_status_confirmed',
      'synthetic_performer_present_confirmed',
      'actual_knowledge_confirmed',
      'expressive_work_exemption_applies',
    ])

    // 8 + 9 + 10. BI bounded, Projection renders the approved candidate
    // statement, no project-specific legal conclusion -- exercised through
    // the real end-to-end conversation pipeline (a fresh commercial_use-only
    // StructuredUnderstanding, matching the actual failed-UAT opening shape
    // -- no explicit likeness goal anywhere in this input).
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    expect(item?.statement).toBe(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!.crc_candidate_statement)

    const interp = output.goal_interpretations.find((i) => i.goal_text === commercialUseGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(summary).not.toMatch(/violates|complies with (the|this) (law|statute|section)/i)
    expect(summary).not.toMatch(/you are (the|a) (statutory )?duty-holder/i)
    expect(summary).not.toMatch(/your (content|ad|video) (is|contains) a synthetic performer/i)
    expect(summary).not.toMatch(/you (had|have) actual knowledge/i)
    expect(summary).not.toMatch(/the exemption (applies|does not apply) to you/i)
    expect(summary).not.toMatch(/new york law (governs|applies to) your project/i)
  })

  // Negative-control matrix (task Section 9).
  test('A: commercial_use + New York + NO person presence -> no likeness discovery, no §396-b', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    su.content_presence_mentions = []
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, facts(['New York']), [], [], occurrences)
    expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
  })

  test('B: commercial_use + New York + REAL person only (not synthetic) -> synthetic-only trigger does NOT fire', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    su.content_presence_mentions = [syntheticPresenceMention({ real_or_synthetic: 'real' })]
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
  })

  test('C: commercial_use + New York + real_or_synthetic = null (unresolved) -> no synthetic-person discovery', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    su.content_presence_mentions = [syntheticPresenceMention({ real_or_synthetic: null })]
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
  })

  test('D: commercial_use + New York + synthetic person -> §396-b retrieves (positive, restated as its own negative-matrix row)', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, facts(['New York']), [], [], occurrences)
    expect(out.results.map((r) => r.claim_id)).toContain(CLAIM_ID)
  })

  test('E: commercial_use + California + synthetic person -> likeness IS discovered generically (topic relevance is jurisdiction-agnostic), but §396-b fails applicability and does not retrieve', () => {
    const su = suWithSyntheticPersonAndJurisdiction('California')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.some((o) => o.topic === 'likeness')).toBe(true)
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, facts(['California']), [], [], occurrences)
    expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
  })

  test('F: commercial_use + "United States" (country-level) only + synthetic person -> no NY inference, §396-b does not retrieve', () => {
    const su = suWithSyntheticPersonAndJurisdiction('United States')
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.some((o) => o.topic === 'likeness')).toBe(true)
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, facts(['United States']), [], [], occurrences)
    expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
  })

  test('G: commercial_use + jurisdiction unresolved + synthetic person -> topic still discoverable, but §396-b does not retrieve (jurisdiction never guessed from silence)', () => {
    const su = suWithSyntheticPersonAndJurisdiction(null)
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.some((o) => o.topic === 'likeness')).toBe(true)
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, facts(), [], [], occurrences)
    expect(out.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
  })

  test('L: explicit likeness goal + synthetic person -> exact_topic path wins, no duplicate discovered_topic result for the same claim', () => {
    const su = suWithSyntheticPersonAndJurisdiction('New York')
    su.user_goals = [likenessGoal()]
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === 'likeness')).toEqual([])
    const out = retrieve(handoff(), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, facts(['New York']), [], [], occurrences)
    const matches = out.results.filter((r) => r.claim_id === CLAIM_ID)
    expect(matches).toHaveLength(1)
    expect(matches[0].match_origin).toBe('exact_topic')
    expect(matches[0].matched_goal_category).toBe('likeness')
  })
})

// ── §11: questioning safety -- discovery never makes a dependency askable ──

describe('Bridge #2 — questioning safety: discovered relevance never creates a new askable dependency', () => {
  test('with the claim discoverable (commercial_use + synthetic person + NY), deriveKnowledgeReadinessNeeds still proposes NO need for any of the four §396-b dependencies -- the askability registry gate is untouched by this milestone', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialUseGoal()],
      content_presence_mentions: [syntheticPresenceMention()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'New York' }, source_turn: 1, source_statement: 'New York' },
      },
    }
    const discoveredTopics = discoveredTopicCategories(deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE))
    expect(discoveredTopics).toContain('likeness')
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState(), discoveredTopics)
    const dependencyIds = needs.map((n) => n.dependency_id)
    expect(dependencyIds).not.toContain('advertiser_or_duty_holder_status_confirmed')
    expect(dependencyIds).not.toContain('synthetic_performer_present_confirmed')
    expect(dependencyIds).not.toContain('actual_knowledge_confirmed')
    expect(dependencyIds).not.toContain('expressive_work_exemption_applies')
  })
})

// ── §8/§11/§12/§13: explicit-goal retrieval, Bounded Interpretation, Projection ──

describe('explicit-goal retrieval + Bounded Interpretation + Projection, real published claim', () => {
  function suWithNYJurisdiction(): StructuredUnderstanding {
    return {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [likenessGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'New York' }, source_turn: 1, source_statement: 'New York' },
      },
    }
  }

  test('explicit likeness goal, confirmed NY jurisdiction, no fabricated goal, correct match_origin/matched_goal_category', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.match_origin).toBe('exact_topic')
    expect(result?.matched_goal_category).toBe('likeness')
  })

  test('Bounded Interpretation hedges (Case 3B, unresolved dependencies); Projection renders the exact candidate_statement with zero strengthening, and never conflates with the sibling real-person likeness claim', () => {
    const su = suWithNYJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('disclosure'))
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Case 3B hedge fires (four unresolved dependencies).
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    // Exact governed candidate statement content present.
    expect(summary).toMatch(/not recognizable as any identifiable natural performer/)

    // §10/§11 prohibited-conclusion audit -- none of these ever appear.
    expect(summary).not.toMatch(/violates|complies with (the|this) (law|statute|section)/i)
    expect(summary).not.toMatch(/you are (the|a) (statutory )?duty-holder/i)
    expect(summary).not.toMatch(/your (content|ad|video) (is|contains) a synthetic performer/i)
    expect(summary).not.toMatch(/you (had|have) actual knowledge/i)
    expect(summary).not.toMatch(/the exemption (applies|does not apply) to you/i)
    expect(summary).not.toMatch(/new york law (governs|applies to) your project/i)
    expect(summary).not.toMatch(/AI (tool )?providers are (expressly )?exempt/i)
    expect(summary).not.toMatch(/commercially cleared|legally cleared|copyright clearance|platform permission/i)
    // Real-person-likeness conflation guard -- the sibling claim's own subject must never appear folded into this claim's output.
    expect(summary).not.toMatch(/portrait, picture, likeness, or voice|written consent/i)

    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).not.toContain(SIBLING_ID)
  })

  test('Projection renders the fixture\'s own crc_candidate_statement verbatim -- opaque pass-through, same generic composer as every other claim', () => {
    const su = suWithNYJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    const fixtureClaim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!
    expect(item?.statement).toBe(fixtureClaim.crc_candidate_statement)
  })

  test('jurisdiction UNCONFIRMED -> claim absent from output entirely, never asserted as though NY were confirmed', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [likenessGoal()],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })
})

// ── §12: sibling NY likeness claim isolation (negative control) ────────────

describe('sibling CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1 isolation', () => {
  test('sibling has no fixture entry -- activating 396-b does not activate it', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === SIBLING_ID)).toBeUndefined()
  })

  test('likeness-goal + NY-jurisdiction retrieval never surfaces the sibling ID', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(out.results.map((r) => r.claim_id)).not.toContain(SIBLING_ID)
  })
})

// ── §13: Copyright / other non-provider regression ──────────────────────────

describe('Copyright (provider_scope: null) claims unaffected by this activation', () => {
  test('exactly four CLAIM-COPY-* entries still exist, unchanged', () => {
    const copyClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id.startsWith('CLAIM-COPY-'))
    expect(copyClaims).toHaveLength(4)
    expect(copyClaims.map((c) => c.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1'])
  })

  test('a copyrightability goal with US jurisdiction still retrieves COPY-001/002/003 correctly -- no duplication, no suppression, no leakage from the new likeness claim', () => {
    const goal: UserGoal = {
      goal_id: 'g-copy',
      state: 'confirmed',
      raw_text: 'Is my AI video copyrightable?',
      category: 'copyrightability',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Is my AI video copyrightable?',
    }
    const result = lookupTopicClaims([goal], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] })
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids.sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
    expect(ids).not.toContain(CLAIM_ID)
  })
})

// ── §16: total reachable population sanity ──────────────────────────────────

describe('total fixture population sanity', () => {
  test('exactly thirty-one Adopted + CRC-eligible claims exist (see topic-claims-fixture-consistency.test.ts for the authoritative, itemized manifest assertion)', () => {
    const live = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(live).toHaveLength(31)
  })
})
