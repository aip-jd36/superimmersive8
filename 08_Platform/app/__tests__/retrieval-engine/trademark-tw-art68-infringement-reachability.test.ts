/**
 * CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1 -- production representation
 * reachability tests (Taiwan Trademark CRC Production Representation
 * milestone, 2026-09-23/24).
 *
 * Second Taiwan-jurisdiction Living Knowledge claim in this corpus (after
 * CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1), and the second
 * `topic: 'trademark'` entry in TOPIC_CLAIMS_FIXTURE (after
 * CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1). Mirrors both
 * trademark-us-lanham-confusion-reachability.test.ts (topic/reachability
 * shape) and copyright-tw-ai-assisted-output-reachability.test.ts
 * (Taiwan-jurisdiction/cross-jurisdiction-isolation shape) -- adapted for
 * this claim's own D0 shape (zero dependencies, `directly_relevant`
 * ceiling), unlike the Taiwan copyrightability claim's D1/Case-3B shape.
 *
 * This is also the FIRST claim in this corpus where the SAME topic
 * (`trademark`) has two claims split by jurisdiction only (no dependency
 * difference) -- the multi-jurisdiction retrieval matrix below is the
 * safety-critical regression area this milestone was scoped around.
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
import { GOAL_CATEGORIES, type StructuredUnderstanding, type UserGoal } from '@/types/interview-engine'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1'
const US_SIBLING_CLAIM_ID = 'CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1'
const TOPIC = 'trademark'

function claim() {
  const c = TOPIC_CLAIMS_FIXTURE.find((x) => x.claim_id === CLAIM_ID)
  if (!c) throw new Error(`${CLAIM_ID} not found in TOPIC_CLAIMS_FIXTURE`)
  return c
}

function usSiblingClaim() {
  const c = TOPIC_CLAIMS_FIXTURE.find((x) => x.claim_id === US_SIBLING_CLAIM_ID)
  if (!c) throw new Error(`${US_SIBLING_CLAIM_ID} not found in TOPIC_CLAIMS_FIXTURE`)
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
    raw_text: 'Can I use a mark similar to a registered Taiwan trademark in my video?',
    category: 'trademark',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use a mark similar to a registered Taiwan trademark in my video?',
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

describe('CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1 -- production TopicClaim representation (2026-09-23/24)', () => {
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

  test('D. zero dependencies preserved (D0, FGR_024 Sec.10-REVISED-2) -- neither withdrawn candidate resurrected', () => {
    expect(claim().unresolved_project_dependencies).toEqual([])
  })

  test('E. crc_candidate_statement matches the CPR_030-approved text -- Article 68, registered-mark scope, marketing-purpose condition, item 1 vs items 2-3 structure, Article 36, Article 70 boundary', () => {
    const stmt = claim().crc_candidate_statement!
    expect(stmt).toMatch(/Taiwan Trademark Act Article 68/)
    expect(stmt).toMatch(/without the trademark owner's consent and for a marketing purpose/)
    expect(stmt).toMatch(/an identical mark on identical goods\/services is infringement outright/)
    expect(stmt).toMatch(/likelihood of consumer confusion/)
    expect(stmt).toMatch(/Statutory exceptions \(e\.g\. good-faith descriptive use\) can apply/)
    expect(stmt).toMatch(/separate question from Article 70's well-known-mark dilution provisions/)
  })

  test('F. crc_publication_scope carries the jurisdiction-attachment disclaimer, mirroring the US Lanham/Taiwan Copyrightability precedent', () => {
    expect(claim().crc_publication_scope).toMatch(/Taiwan law definitively governs the project, including merely because the user selected Taiwan as the assessment jurisdiction/i)
    expect(claim().crc_publication_scope).not.toBeNull()
  })

  test('G. trademark topic reuses an EXISTING GoalCategory -- no new enum registration required by this milestone', () => {
    expect((GOAL_CATEGORIES as readonly string[]).includes(TOPIC)).toBe(true)
  })

  test('H. this claim is the only Taiwan-jurisdiction entry under the trademark topic; the US Lanham sibling remains the only United States entry', () => {
    const sameTopicTaiwan = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id !== CLAIM_ID && c.topic === TOPIC && c.jurisdiction === 'Taiwan')
    expect(sameTopicTaiwan).toHaveLength(0)
    expect(usSiblingClaim().jurisdiction).toBe('United States (federal)')
  })

  test('I. exactly two trademark-topic claims exist in the production fixture -- this one and the US Lanham sibling, no others', () => {
    const trademarkClaims = TOPIC_CLAIMS_FIXTURE.filter((c) => c.topic === TOPIC)
    expect(trademarkClaims.map((c) => c.claim_id).sort()).toEqual([CLAIM_ID, US_SIBLING_CLAIM_ID].sort())
  })

  test('J. no TopicRelationship in the production fixture targets the trademark topic', () => {
    const targeting = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === TOPIC)
    expect(targeting).toHaveLength(0)
  })
})

// ── R. item 1 vs items 2-3 canary -- fixture/content-level, no runtime parsing ──

describe('item-1-vs-items-2-3 structural fidelity canary (fixture content only)', () => {
  test('the governed proposition states item 1 WITHOUT a confusion requirement, and items 2-3 WITH one -- would fail if a future edit flattened this into one uniform confusion rule', () => {
    const stmt = claim().crc_candidate_statement!
    // Item 1: identical mark / identical goods -> infringement outright, no confusion language attached to this specific clause.
    const item1Clause = stmt.match(/an identical mark on identical goods\/services is infringement outright/)
    expect(item1Clause).not.toBeNull()
    // Items 2-3: confusion IS required, stated explicitly.
    expect(stmt).toMatch(/is infringement only where there's a likelihood of consumer confusion/)
    // The statement never states a single uniform rule applying "likelihood of confusion" to ALL uses without qualification.
    expect(stmt).not.toMatch(/always requires a likelihood of confusion/i)
    expect(stmt).not.toMatch(/in every case,? (a |the )?likelihood of confusion/i)
  })
})

// ── dependency askability -- fail-closed, no new user-facing question ──────

describe('dependency askability, moot by design (zero dependencies)', () => {
  test('no askability lookup is meaningful for this claim -- unresolved_project_dependencies is empty, so no dependency id exists to check', () => {
    expect(claim().unresolved_project_dependencies).toHaveLength(0)
  })

  test('the two previously-withdrawn dependency candidates remain absent from the askability registry (fail-closed, unaffected by this activation)', () => {
    expect(getAskabilityEntry('mark_and_goods_identity_or_similarity')).toBeUndefined()
    expect(getAskabilityEntry('consumer_confusion_likelihood')).toBeUndefined()
  })
})

describe('knowledge-readiness questioning never begins asking about this claim (zero dependencies)', () => {
  test('deriveKnowledgeReadinessNeeds: a wide-open conversation (every real GoalCategory active) produces zero needs referencing this claim', () => {
    const su = emptySU({ user_goals: GOAL_CATEGORIES.map((category, i) => trademarkGoal({ goal_id: `g-${i}`, category })) })
    const needs = deriveKnowledgeReadinessNeeds(su, TOPIC_CLAIMS_FIXTURE, createInitialBoundaryState())
    expect(needs.some((n) => n.claim_ids.includes(CLAIM_ID))).toBe(false)
  })
})

// ── jurisdiction applicability scenarios, real pipeline ────────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: Taiwan included -> claim retrieved via explicit trademark goal', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence)', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C (JURISDICTION NEGATIVE CONTROL): United States established -> Taiwan claim NOT retrieved, no cross-border inference; the US sibling DOES match', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    expect(result.matches.map((m) => m.claim_id)).toContain(US_SIBLING_CLAIM_ID)
  })

  test('D (JURISDICTION NEGATIVE CONTROL, reverse direction): Taiwan established -> the US Lanham sibling does NOT match; only this claim does', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(US_SIBLING_CLAIM_ID)
    expect(result.matches.map((m) => m.claim_id)).toEqual([CLAIM_ID])
  })

  test('E: no explicit trademark goal (bare commercial_use, even with Taiwan established) -> claim never surfaces -- explicit-goal-only, no discovered relevance', () => {
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('Taiwan explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('F (OTHER JURISDICTION): a third, fictional jurisdiction (Ruritania) -> NEITHER trademark claim becomes substantively applicable merely because the topic matches', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Ruritania']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    expect(result.matches.map((m) => m.claim_id)).not.toContain(US_SIBLING_CLAIM_ID)
  })

  test('G: retrieve() never renders a project-specific registration/use/similarity/confusion/infringement conclusion; result carries the bounded, general candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/your (use|project|video|mark|content) (infringes|is registered|is not registered|is likely to cause confusion|is authorized|is not authorized)|you own (a|the) (valid )?(registered )?trademark/i)
  })
})

// ── explicit-vs-discovered regression ───────────────────────────────────────

describe('explicit-vs-discovered regression -- no Track A trigger exists for this claim / Taiwan jurisdiction', () => {
  test('a bare commercial_use goal (no trademark goal at all) never discovers this claim, with or without Taiwan jurisdiction', () => {
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

  test('every real GoalCategory active simultaneously (trademark excluded) still produces zero discovered trademark occurrences -- no generic trigger is registered for this topic', () => {
    const su = emptySU({
      user_goals: GOAL_CATEGORIES.filter((c) => c !== 'trademark' && c !== 'unknown').map((category, i) => commercialUseGoal({ goal_id: `g-${i}`, category })),
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).toEqual([])
  })

  test('lookupTopicClaims: even with a confirmed trademark goal, no OTHER goal category ever matches this specific claim_id (exact-topic path, not fuzzy)', () => {
    for (const category of GOAL_CATEGORIES) {
      if (category === TOPIC) continue
      const result = lookupTopicClaims([trademarkGoal({ category })], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
      expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
    }
  })
})

// ── NEGATIVE CONTROLS -- claim must never surface via a non-explicit-goal trigger ──

describe('negative controls -- brand/logo/language mentions never surface this claim without an explicit trademark goal', () => {
  test('a content-presence mention alone (no trademark goal; this corpus has no logo/brand ContentPresenceCategory at all -- only person_visual_presence/person_voice_presence exist) never discovers this claim, even with Taiwan jurisdiction confirmed', () => {
    const su = emptySU({
      user_goals: [commercialUseGoal()],
      content_presence_mentions: [
        { mention_id: 'cp-1', category: 'person_visual_presence', real_or_synthetic: 'synthetic', confidence: 'confirmed', source_turn: 1, source_statement: 'there is a person visible in the shot', superseded_by: null },
      ],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).not.toContainEqual(expect.objectContaining({ claim_id: CLAIM_ID }))
    const result = lookupTopicClaims([commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('client-supplied brand assets (asset_provider_mention only, no trademark goal) never surface this claim', () => {
    const su = emptySU({
      user_goals: [],
      asset_provider_mentions: [
        { mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'client supplied a Getty asset with a brand logo', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } },
      ],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const occurrences = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(occurrences.filter((o) => o.topic === TOPIC)).not.toContainEqual(expect.objectContaining({ claim_id: CLAIM_ID }))
  })

  test('Traditional Chinese interface language / wording alone never implies Taiwan jurisdiction -- an explicit trademark goal with jurisdiction left unresolved still fails to retrieve this claim even if the raw_text is in Chinese-referencing English or mentions Taiwan colloquially without an ApplicabilityFacts jurisdiction value', () => {
    const zhFlavoredGoal = trademarkGoal({ raw_text: '我可以在影片中使用類似註冊商標的標誌嗎？ (Can I use a mark similar to a registered trademark in my video?)' })
    const result = lookupTopicClaims([zhFlavoredGoal], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })
})

// ── MULTI-JURISDICTION RETRIEVAL MATRIX -- the critical regression area ────

describe('multi-jurisdiction retrieval matrix: real production trademark topic (Taiwan + United States)', () => {
  test('(a) TAIWAN CASE: explicit trademark goal + Taiwan jurisdiction -> Taiwan claim retrieved, US claim NOT retrieved as substantive supporting knowledge, Taiwan claim reaches BI', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).not.toContain(US_SIBLING_CLAIM_ID)
  })

  test('(b) US CASE: explicit trademark goal + United States jurisdiction -> US claim retrieved, Taiwan claim NOT retrieved as substantive supporting knowledge', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'United States' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(US_SIBLING_CLAIM_ID)
    expect(claimIds).not.toContain(CLAIM_ID)
  })

  test('(c) NO JURISDICTION: explicit trademark goal, jurisdiction unresolved -> existing fail-closed behavior, neither claim surfaces, no fabricated jurisdiction', () => {
    const su = emptySU({ user_goals: [trademarkGoal()] })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).not.toContain(CLAIM_ID)
    expect(claimIds).not.toContain(US_SIBLING_CLAIM_ID)
  })

  test('(d) OTHER JURISDICTION: explicit trademark goal + a fictional third jurisdiction (Ruritania) -> neither jurisdiction-specific claim becomes substantively applicable merely because the topic matches', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Ruritania' }, source_turn: 1, source_statement: 'Ruritania' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).not.toContain(CLAIM_ID)
    expect(claimIds).not.toContain(US_SIBLING_CLAIM_ID)
  })

  test('lookupTopicClaims direct: both jurisdictions confirmed simultaneously (hypothetical dual-jurisdiction assessment) -> both claims own gates are met independently, no merging/cross-claim interpolation', () => {
    const result = lookupTopicClaims([trademarkGoal()], TOPIC_CLAIMS_FIXTURE, facts(['Taiwan', 'United States']))
    const ids = result.matches.map((m) => m.claim_id)
    expect(ids).toContain(CLAIM_ID)
    expect(ids).toContain(US_SIBLING_CLAIM_ID)
    // Each result is its own independent claim object -- no combined/hybrid statement.
    const twMatch = result.matches.find((m) => m.claim_id === CLAIM_ID)!
    const usMatch = result.matches.find((m) => m.claim_id === US_SIBLING_CLAIM_ID)!
    expect(twMatch.crc_candidate_statement).not.toBe(usMatch.crc_candidate_statement)
  })
})

// ── D0 -> directly_relevant BI proof + bounded output ──────────────────────

describe('full pipeline -- explicit trademark goal + Taiwan jurisdiction confirmed (BI ceiling + bounded output, the safety-critical proof)', () => {
  test('POSITIVE CANARY: CLAIM_ID retrieves via explicit trademark goal, zero dependencies, BI reaches directly_relevant (never relevant_applicability_unresolved), Projection renders the approved candidate statement verbatim, no project-specific legal conclusion, no fabricated dependency used to force Case 3B', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
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

    const interp = output.goal_interpretations.find((i) => i.goal_text === trademarkGoal().raw_text)
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // directly_relevant's own fixed boundary clause (rules.ts directlyRelevantSummary,
    // allToolSourced === false branch) -- proves D0 reaches directly_relevant, NOT
    // Case 3B (which would instead read "there isn't enough project-specific
    // information to determine how it applies to your specific project").
    expect(summary).toMatch(/though it doesn't by itself determine the answer for your specific project/)
    expect(summary).not.toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)

    // Fixed category label reused unmodified (rules.ts CATEGORY_LABELS.trademark).
    expect(summary).toMatch(/trademark or brand-use considerations/)

    // No stronger-than-BI conclusion of any kind -- the full prohibited-conclusions
    // boundary from crc_publication_scope (test F above), re-tested against the
    // real rendered Projection output.
    expect(summary).not.toMatch(/a particular mark is registered in Taiwan|registration is valid/i)
    expect(summary).not.toMatch(/(a|the) (person|entity) owns the mark/i)
    expect(summary).not.toMatch(/constitutes statutory trademark use/i)
    expect(summary).not.toMatch(/is legally identical or similar to a specific registered mark/i)
    expect(summary).not.toMatch(/goods\/services are legally identical or similar/i)
    expect(summary).not.toMatch(/consumer confusion (is|is not) likely/i)
    expect(summary).not.toMatch(/article 36 (limitation|exception) (applies|does not apply)/i)
    expect(summary).not.toMatch(/authorization or consent is sufficient/i)
    expect(summary).not.toMatch(/infringement (occurred|did not occur)/i)
    expect(summary).not.toMatch(/taiwan law definitively governs the project/i)
    expect(summary).not.toMatch(/commercially cleared|legally compliant|ready for commercial use/i)
  })

  test('a different jurisdiction (United Kingdom, neither governed trademark jurisdiction) with the same explicit trademark goal never surfaces either claim through the real pipeline', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United Kingdom' }, source_turn: 1, source_statement: 'United Kingdom' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).not.toContain(CLAIM_ID)
    expect(claimIds).not.toContain(US_SIBLING_CLAIM_ID)
  })
})

// ── provider/tool neutrality ─────────────────────────────────────────────

describe('provider/tool neutrality -- no provider/tool gate exists for this claim', () => {
  test('claim retrieves identically regardless of tool mentions present in the conversation (statute is technology-neutral)', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      tool_mentions: [
        {
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          access_surface: { state: 'unknown' },
          plan_tier: { state: 'unknown' },
          account_status: { state: 'unknown' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'Kling',
          superseded_by: null,
        },
      ],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'Taiwan' }, source_turn: 1, source_statement: 'Taiwan' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).toContain(CLAIM_ID)
  })

  test('provider_scope and tool_scope are both null -- structurally incapable of gating on provider/tool identity', () => {
    expect(claim().provider_scope).toBeNull()
    expect(claim().tool_scope).toBeNull()
  })
})

// ── fail-closed behavior ────────────────────────────────────────────────────

describe('fail-closed behavior', () => {
  test('unresolved jurisdiction (no confirmed value at all) -> claim absent, not silently defaulted to a match', () => {
    const su = emptySU({ user_goals: [trademarkGoal()] })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })

  test('jurisdiction present but only "unresolved_no_visibility" state (not confirmed) -> no match, no strengthening', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'unresolved_no_visibility' }, source_turn: 1, source_statement: 'not sure' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })

  test('jurisdiction explicitly declined -> claim absent, never silently assumed', () => {
    const su = emptySU({
      user_goals: [trademarkGoal()],
      project_facts: {
        ...emptySU().project_facts,
        jurisdiction: { attestation: { state: 'declined' }, source_turn: 1, source_statement: 'skip' },
      },
    })
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })
})
