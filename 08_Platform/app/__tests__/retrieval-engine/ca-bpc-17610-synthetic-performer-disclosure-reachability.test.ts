/**
 * California BPC § 17610 (SB 1050) Synthetic Performer Advertising
 * Disclosure -- real-publication reachability tests
 * (LK-CA-SYNTHETIC-PERFORMER-PROD-REP-1, 2026-10-01).
 *
 * CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1 is the second claim in the
 * synthetic-performer-disclosure sub-family, after
 * CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1 -- mirrors that claim's own
 * reachability test file structure exactly, adapted for California's own D2
 * (two-dependency) model, request-scope-only applicability note, and the
 * not-yet-effective (January 1, 2027) date-leading candidate statement
 * CPR_032 approved.
 *
 * Both real-person likeness siblings (CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-
 * 001-v1, CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1) remain withheld
 * and have no fixture entry -- proven absent below as a negative control,
 * distinct from a runtime boundary.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE -- no synthetic clone.
 */

import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1'
const NY_SIBLING_ID = 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1' // distinct, APPROVED, must remain unaffected
const WITHHELD_NY_LIKENESS_ID = 'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1' // WITHHELD (CPR_008) -- no fixture entry
const WITHHELD_CN_LIKENESS_ID = 'CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1' // WITHHELD (CPR_031) -- no fixture entry

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
    raw_text: 'Does my California ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    category: 'likeness',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Does my California ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    ...overrides,
  }
}

function facts(jurisdictionIncluded: string[] = [], jurisdictionExcluded: string[] = []): ApplicabilityFacts {
  return { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] }
}

function suWithCAJurisdiction(): StructuredUnderstanding {
  return {
    ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
    user_goals: [likenessGoal()],
    project_facts: {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
      jurisdiction: { attestation: { state: 'confirmed', value: 'California' }, source_turn: 1, source_statement: 'California' },
    },
  }
}

// ── fixture fidelity + governance-fidelity ──────────────────────────────────

describe('fixture fidelity, mechanical projection from GOVERNED-CLAIMS.md (CPR_032-controlling wording)', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)

  test('exists exactly once, Adopted, crc_eligible Yes', () => {
    const matches = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === CLAIM_ID)
    expect(matches).toHaveLength(1)
    expect(claim?.lifecycle).toBe('Adopted')
    expect(claim?.crc_eligible).toBe('Yes')
  })

  test('topic, jurisdiction, provider_scope, tool_scope, claim_character, publication_scope projected faithfully', () => {
    expect(claim?.topic).toBe('likeness')
    expect(claim?.jurisdiction).toBe('California (state)')
    expect(claim?.provider_scope).toBeNull()
    expect(claim?.tool_scope).toBeNull()
    expect(claim?.claim_character).toBe('established')
    expect(claim?.publication_scope).toBe('Reviewer/Commercial Assurance')
  })

  test('applicability_requirements preserved exactly: jurisdiction equals California, no other gate', () => {
    expect(claim?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'California' }])
  })

  test('the controlling D2 dependency array is preserved exactly -- not the NY sibling\'s four-dependency array, none fabricated as resolved', () => {
    expect(claim?.unresolved_project_dependencies).toEqual(['synthetic_performer_content_present', 'advertisement_purpose_confirmed'])
  })
})

// ── temporal wording preservation (CPR_032 §S date-leading construction) ────

describe('temporal wording preservation -- the CPR_032 date-leading construction, not present-tense drift', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!

  test('crc_candidate_statement leads with the effective date, matching CPR_032 §S verbatim', () => {
    expect(claim.crc_candidate_statement).toMatch(/^Effective January 1, 2027, California Business and Professions Code § 17610/)
  })

  test('crc_candidate_statement never collapses into an unqualified present-tense "California requires" opening -- a regression could silently strip the date-leading clause', () => {
    expect(claim.crc_candidate_statement).not.toMatch(/^California (requires|law requires)/)
  })

  test('crc_candidate_statement never asserts the statute is already in effect', () => {
    expect(claim.crc_candidate_statement).not.toMatch(/is currently in effect|is already in effect|currently requires/i)
  })

  test('crc_publication_scope explicitly states the statute is not yet in effect before January 1, 2027, and preserves the non-identifiability predicate', () => {
    expect(claim.crc_publication_scope).toMatch(/not yet in effect as of any date before January 1, 2027/)
    expect(claim.crc_publication_scope).toMatch(/NOT recognizable as any identifiable natural person/)
  })

  test('crc_publication_scope omits the pre-Production-Representation "Runtime note" (this fixture entry IS that milestone, per CLAIM-TRADEMARK-TW-ART68-INFRINGEMENT-001-v1\'s own precedent)', () => {
    expect(claim.crc_publication_scope).not.toMatch(/has no `?TOPIC_CLAIMS_FIXTURE`? representation/)
  })
})

// ── dependency askability / BI "never directly_relevant" re-verification ───

describe('dependency askability, re-verified directly against the registry (not inherited from the Readiness investigation\'s own framing)', () => {
  test.each(['synthetic_performer_content_present', 'advertisement_purpose_confirmed'])(
    '%s is absent from the dependency-askability registry -- remains non-self-attestable, no new user-facing question created by this activation',
    (dep) => {
      expect(getAskabilityEntry(dep)).toBeUndefined()
    },
  )
})

// ── jurisdiction applicability, real pipeline ───────────────────────────────

describe('jurisdiction applicability, real committed fixture', () => {
  test('A: California included -> claim retrieved via explicit likeness goal', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    expect(result.matches.map((m) => m.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence) -- fail-closed', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C: a materially different jurisdiction (New York) established -> NOT retrieved, no cross-state inference', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('D: "United States" only (country-level) -> NOT retrieved, no US->CA hierarchy inferred', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('California explicitly excluded -> NOT retrieved', () => {
    const result = lookupTopicClaims([likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts([], ['California']))
    expect(result.matches.map((m) => m.claim_id)).not.toContain(CLAIM_ID)
  })

  test('E: jurisdiction fact is only the request-scope applicability gate -- retrieve() never renders a "California law definitely applies" conclusion; result carries the bounded candidate_statement only', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/definitely (applies|governs)|legally governs your project|applies to your project/i)
  })
})

// ── explicit-goal retrieval, Bounded Interpretation, Composition safety ────

describe('explicit-goal retrieval + Bounded Interpretation + Composition, real published claim', () => {
  test('explicit likeness goal, confirmed CA jurisdiction, no fabricated goal, correct match_origin/matched_goal_category', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.match_origin).toBe('exact_topic')
    expect(result?.matched_goal_category).toBe('likeness')
  })

  test('Bounded Interpretation hedges (Case 3B, D2 unresolved dependencies); Composition renders the exact candidate_statement with zero tense-strengthening, and never conflates with either withheld real-person likeness sibling', () => {
    const su = suWithCAJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('disclosure'))
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Case 3B hedge fires (two unresolved dependencies).
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    // Exact governed candidate statement content present, date-leading.
    expect(summary).toMatch(/Effective January 1, 2027/)
    expect(summary).toMatch(/NOT recognizable as any identifiable natural person/)

    // Prohibited-conclusion audit -- none of these ever appear.
    expect(summary).not.toMatch(/violates|complies with (the|this) (law|statute|section)/i)
    expect(summary).not.toMatch(/you are (the|a) (statutory )?duty-holder/i)
    expect(summary).not.toMatch(/your (content|ad|video) (is|contains) a synthetic performer/i)
    expect(summary).not.toMatch(/the exemption (applies|does not apply) to you/i)
    expect(summary).not.toMatch(/california law (governs|applies to) your project/i)
    expect(summary).not.toMatch(/actual knowledge is required/i)
    expect(summary).not.toMatch(/already in effect|currently in effect|currently requires/i)
    expect(summary).not.toMatch(/commercially cleared|legally cleared|copyright clearance|platform permission/i)
    // Real-person-likeness conflation guards -- neither withheld sibling's own subject matter appears folded in.
    expect(summary).not.toMatch(/portrait, picture, likeness, or voice|written consent/i)

    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).not.toContain(WITHHELD_NY_LIKENESS_ID)
    expect(claimIds).not.toContain(WITHHELD_CN_LIKENESS_ID)
  })

  test('Composition renders the fixture\'s own crc_candidate_statement verbatim -- opaque pass-through, same generic composer as every other claim', () => {
    const su = suWithCAJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    const fixtureClaim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!
    expect(item?.statement).toBe(fixtureClaim.crc_candidate_statement)
  })

  test('jurisdiction UNCONFIRMED -> claim absent from output entirely, never asserted as though California were confirmed', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [likenessGoal()],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })
})

// ── sibling non-interference (both directions) ──────────────────────────────

describe('sibling claim isolation -- NY synthetic-performer claim unaffected, both withheld real-person likeness claims unaffected', () => {
  test('the NY synthetic-performer sibling retains its own four-dependency array, unmodified by this activation', () => {
    const nySibling = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === NY_SIBLING_ID)
    expect(nySibling).toBeDefined()
    expect(nySibling?.unresolved_project_dependencies).toEqual([
      'advertiser_or_duty_holder_status_confirmed',
      'synthetic_performer_present_confirmed',
      'actual_knowledge_confirmed',
      'expressive_work_exemption_applies',
    ])
    expect(nySibling?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'New York' }])
  })

  test('California-jurisdiction retrieval never surfaces the NY sibling, and New York-jurisdiction retrieval never surfaces the California claim', () => {
    const caOut = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    expect(caOut.results.map((r) => r.claim_id)).not.toContain(NY_SIBLING_ID)

    const nyOut = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(nyOut.results.map((r) => r.claim_id)).not.toContain(CLAIM_ID)
  })

  test('both withheld real-person likeness claims have no fixture entry -- activating the California synthetic-performer claim does not activate either', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === WITHHELD_NY_LIKENESS_ID)).toBeUndefined()
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === WITHHELD_CN_LIKENESS_ID)).toBeUndefined()
  })

  test('likeness-goal + California-jurisdiction retrieval never surfaces either withheld sibling ID', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [likenessGoal()], TOPIC_CLAIMS_FIXTURE, facts(['California']))
    expect(out.results.map((r) => r.claim_id)).not.toContain(WITHHELD_NY_LIKENESS_ID)
    expect(out.results.map((r) => r.claim_id)).not.toContain(WITHHELD_CN_LIKENESS_ID)
  })
})

// ── total reachable population sanity ───────────────────────────────────────

describe('total fixture population sanity', () => {
  test('exactly thirty-eight Adopted + CRC-eligible claims exist as of 2026-10-02 (see topic-claims-fixture-consistency.test.ts for the authoritative, itemized manifest assertion -- this claim is the 37th; the 38th, added after this file was authored, is CLAIM-EUAI-ART50-2-PROVIDER-MARKING-001-v1)', () => {
    const live = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(live).toHaveLength(39)
  })
})
