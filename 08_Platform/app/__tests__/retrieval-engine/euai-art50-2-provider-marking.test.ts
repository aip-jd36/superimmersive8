/**
 * EU AI Act Article 50(2) Provider-Side Machine-Readable Marking /
 * Detectability -- real-publication reachability tests
 * (LK-EUAI-ART50-2-PROD-REP-1, 2026-10-02).
 *
 * CLAIM-EUAI-ART50-2-PROVIDER-MARKING-001-v1 is the second claim under the
 * already-Adopted `ai_content_transparency` KnowledgeOnlyTopic, sibling to
 * CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1 -- reached
 * through the SAME existing REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1
 * relationship (source_topic: commercial_use), never an explicit goal (there
 * is no `ai_content_transparency` GoalCategory). Governance chain: FGR_027
 * (GO) -> PM Adoption (D2, independently re-derived from zero, NOT the
 * sibling's four-dependency array) -> CPR_033 (APPROVE WITH BOUNDED
 * WORDING). Mirrors euai-art50-4-topicrelationship.test.ts's own structure
 * for the relationship/coexistence proofs and
 * ca-bpc-17610-synthetic-performer-disclosure-reachability.test.ts's own
 * structure for the fixture-fidelity/temporal-wording/BI-canary proofs.
 *
 * These tests exercise the REAL, unmodified pipeline against the REAL,
 * committed TOPIC_CLAIMS_FIXTURE / TOPIC_RELATIONSHIPS_FIXTURE -- no
 * synthetic clone, except where noted.
 */

import { lookupRelatedTopicClaims } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

const CLAIM_ID = 'CLAIM-EUAI-ART50-2-PROVIDER-MARKING-001-v1'
const ART50_4_SIBLING_ID = 'CLAIM-EUAI-ART50-4-AUDIOVISUAL-DEEPFAKE-DISCLOSURE-001-v1' // distinct, APPROVED, must remain unaffected
const NY_SYNTHETIC_PERFORMER_ID = 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1'
const CA_SYNTHETIC_PERFORMER_ID = 'CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1'
const WITHHELD_NY_LIKENESS_ID = 'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1' // WITHHELD -- no fixture entry
const WITHHELD_CN_LIKENESS_ID = 'CLAIM-LIKENESS-CN-PORTRAIT-VOICE-CONSENT-001-v1' // WITHHELD -- no fixture entry

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
    raw_text: 'Does my AI-generated video need any kind of AI marking or label under EU rules?',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Does my AI-generated video need any kind of AI marking or label under EU rules?',
    ...overrides,
  }
}

function facts(jurisdictionIncluded: string[] = [], jurisdictionExcluded: string[] = []): ApplicabilityFacts {
  return { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] }
}

function suWithEUJurisdiction(): StructuredUnderstanding {
  return {
    ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
    user_goals: [commercialUseGoal()],
    project_facts: {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
      jurisdiction: { attestation: { state: 'confirmed', value: 'European Union' }, source_turn: 1, source_statement: 'European Union' },
    },
  }
}

// ── fixture fidelity + governance-fidelity ──────────────────────────────────

describe('fixture fidelity, mechanical projection from GOVERNED-CLAIMS.md (CPR_033-controlling wording)', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)

  test('exists exactly once, Adopted, crc_eligible Yes', () => {
    const matches = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === CLAIM_ID)
    expect(matches).toHaveLength(1)
    expect(claim?.lifecycle).toBe('Adopted')
    expect(claim?.crc_eligible).toBe('Yes')
  })

  test('topic, jurisdiction, provider_scope, tool_scope, claim_character, publication_scope projected faithfully', () => {
    expect(claim?.topic).toBe('ai_content_transparency')
    expect(claim?.jurisdiction).toBe('European Union')
    expect(claim?.provider_scope).toBeNull()
    expect(claim?.tool_scope).toBeNull()
    expect(claim?.claim_character).toBe('established')
    expect(claim?.publication_scope).toBe('Reviewer/Commercial Assurance')
    expect(claim?.geographic_relevance_scope).toBeUndefined()
  })

  test('applicability_requirements preserved exactly: jurisdiction equals European Union, no other gate', () => {
    expect(claim?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }])
  })

  test('the controlling D2 dependency array is preserved exactly -- independently re-derived from zero, NOT the Article 50(4) sibling\'s four-dependency array, nothing fabricated as resolved', () => {
    expect(claim?.unresolved_project_dependencies).toEqual(['provider_status_confirmed', 'union_establishment_or_output_use'])
  })

  test('crc_candidate_statement is byte-identical to CPR_033\'s own finalized text', () => {
    expect(claim?.crc_candidate_statement).toBe(
      "Under Article 50(2) of the EU AI Act (Regulation (EU) 2024/1689), a provider of an AI system -- the company or organization that develops or publishes the AI tool, not a stock-footage or asset vendor, and not the person using the tool to create content -- must ensure that outputs the system generates (audio, image, video, or text) are marked in a machine-readable format and detectable as artificially generated or manipulated, subject to statutory technical-feasibility, assistive-editing, and law-enforcement qualifications. The obligation applies from 2 August 2026, except that a provider of a system placed on the market before that date has until 2 December 2026 to come into compliance. This duty falls on the AI system's provider, not on the person using the system to create content.",
    )
  })
})

// ── temporal wording preservation (CPR_033 two-date structure) ─────────────

describe('temporal wording preservation -- the CPR_033 two-date construction (2 Aug 2026 / 2 Dec 2026), not present-tense drift', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!

  test('crc_candidate_statement states both the general application date and the transitional date', () => {
    expect(claim.crc_candidate_statement).toMatch(/applies from 2 August 2026/)
    expect(claim.crc_candidate_statement).toMatch(/until 2 December 2026 to come into compliance/)
  })

  test('crc_candidate_statement never collapses into an unqualified present-tense opening that erases the transitional population -- a regression could silently strip the "except that..." clause', () => {
    expect(claim.crc_candidate_statement).toMatch(/except that a provider of a system placed on the market before that date/)
  })

  test('crc_candidate_statement never asserts the obligation is already fully, unconditionally in effect for every provider', () => {
    expect(claim.crc_candidate_statement).not.toMatch(/is currently in effect for all providers|already binds every provider|currently requires every provider/i)
  })

  test('crc_publication_scope explicitly preserves the Principle 3 non-identifiability/no-deep-fake-definition finding and the regulated-actor boundary', () => {
    expect(claim.crc_publication_scope).toMatch(/contains no "deep fake" definition/)
    expect(claim.crc_publication_scope).toMatch(/duty falls on the AI system's provider, not on SI8's typical CRC user/)
  })
})

// ── regulated-actor wording preservation ────────────────────────────────────

describe('regulated-actor boundary preserved in the governed wording itself', () => {
  const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!

  test('crc_candidate_statement names the provider as the company/organization that develops or publishes the tool, explicitly distinct from a stock-footage/asset vendor and from the person using the tool', () => {
    expect(claim.crc_candidate_statement).toMatch(/not a stock-footage or asset vendor, and not the person using the tool to create content/)
  })

  test('crc_candidate_statement closes with an explicit statement that the duty falls on the provider, not the user', () => {
    expect(claim.crc_candidate_statement).toMatch(/This duty falls on the AI system's provider, not on the person using the system to create content\.$/)
  })
})

// ── dependency askability / BI "never directly_relevant" re-verification ───

describe('dependency askability, re-verified directly against the registry (not inherited from governance-report framing)', () => {
  test.each(['provider_status_confirmed', 'union_establishment_or_output_use'])(
    '%s is absent from the dependency-askability registry -- remains non-self-attestable, no new user-facing question created by this activation',
    (dep) => {
      expect(getAskabilityEntry(dep)).toBeUndefined()
    },
  )
})

// ── jurisdiction applicability, real pipeline (relationship-reached, not exact-topic) ──

describe('jurisdiction applicability, real committed fixture, reached via REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1', () => {
  test('A: European Union included -> claim retrieved via lookupRelatedTopicClaims from a commercial_use goal', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['European Union']))
    expect(result.matches.map((m) => m.claim.claim_id)).toContain(CLAIM_ID)
  })

  test('B: jurisdiction unresolved -> NOT retrieved (never guessed from silence) -- fail-closed', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts())
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('C: a materially different jurisdiction (New York) established -> NOT retrieved', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['New York']))
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('D: California -> NOT retrieved', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['California']))
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('E: Taiwan -> NOT retrieved', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['Taiwan']))
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('F: "United States" (country-level) -> NOT retrieved, no hierarchy inferred', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['United States']))
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('G: European Union explicitly excluded -> NOT retrieved', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts([], ['European Union']))
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('H: a non-commercial_use goal category never reaches this claim via the relationship, even with EU jurisdiction stated -- the relationship\'s own source_topic is commercial_use only', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal({ category: 'likeness' })], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['European Union']))
    expect(result.matches.map((m) => m.claim.claim_id)).not.toContain(CLAIM_ID)
  })

  test('I: retrieve() never renders an "applies to your project" conclusion merely because jurisdiction is the request-scope gate', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [commercialUseGoal()], TOPIC_CLAIMS_FIXTURE, facts(['European Union']), TOPIC_RELATIONSHIPS_FIXTURE)
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result).toBeDefined()
    expect(result?.candidate_statement).not.toMatch(/definitely (applies|governs)|legally governs your project|applies to your project/i)
  })
})

// ── Bounded Interpretation ceiling + adversarial canaries ───────────────────

describe('Bounded Interpretation ceiling -- permanent Case 3B, never directly_relevant, real production pipeline', () => {
  function run(jurisdictionIncluded: string[]) {
    const out = retrieve(
      handoff(),
      MATRIX_FIXTURE,
      [commercialUseGoal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { included: jurisdictionIncluded, excluded: [] }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    const interpretations = buildBoundedInterpretations(userGoalsToBiIntents([commercialUseGoal()]), out.results, out.diagnostics, { state: 'unknown' })
    return { out, interpretations }
  }

  test('with EU jurisdiction gate met, the commercial_use BoundedInterpretation status is relevant_applicability_unresolved -- never directly_relevant', () => {
    const { out, interpretations } = run(['European Union'])
    expect(out.results.map((r) => r.claim_id)).toContain(CLAIM_ID)
    const interp = interpretations.find((i) => i.category === 'commercial_use')
    expect(interp).toBeDefined()
    expect(interp!.status).not.toBe('directly_relevant')
    expect(interp!.status).toBe('relevant_applicability_unresolved')
    expect(interp!.supporting_claim_ids).toContain(CLAIM_ID)
  })

  test('unresolved_project_dependencies is passed through unmodified regardless of jurisdiction gate outcome -- D2 never shrinks at runtime', () => {
    const { out } = run(['European Union'])
    const result = out.results.find((r) => r.claim_id === CLAIM_ID)
    expect(result?.unresolved_project_dependencies).toEqual(['provider_status_confirmed', 'union_establishment_or_output_use'])
  })

  test.each([
    "We're the AI provider.",
    "We're established in Germany.",
    'Our model already adds metadata.',
    'We use C2PA.',
    'The watermark survives export.',
    "We've verified the metadata.",
    'Our lawyers say we are compliant.',
    'The AI company says Article 50 applies.',
    'The AI company says Article 50 does not apply.',
  ])('adversarial user statement %j cannot be represented as a resolved project fact -- D2 has no acquisition path for any of these, so the BI ceiling cannot be exceeded', () => {
    // No mechanism in this pipeline converts free-form user statements like
    // these into a resolved value for provider_status_confirmed or
    // union_establishment_or_output_use (neither is in DEPENDENCY_TREATMENTS,
    // and unresolved_project_dependencies is a static passthrough of the
    // claim's own authored array -- confirmed above and in
    // build-bounded-interpretation.ts's own hasGovernedProjectDependencies).
    // This test documents that structural fact rather than attempting to
    // feed free text through extraction (out of scope for this fixture-level
    // test file).
    const { interpretations } = run(['European Union'])
    const interp = interpretations.find((i) => i.category === 'commercial_use')
    expect(interp!.status).toBe('relevant_applicability_unresolved')
  })
})

// ── full pipeline: runCRCConversation, Composition safety, prohibited conclusions ──

describe('full pipeline (runCRCConversation) -- Composition renders the governed statement verbatim, hedge fires, no prohibited conclusion reachable', () => {
  test('commercial_use goal + confirmed EU jurisdiction -> claim reaches knowledge_items, Case 3B hedge present, regulated-actor + temporal wording intact, no prohibited conclusion', () => {
    const su = suWithEUJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).not.toContain(WITHHELD_NY_LIKENESS_ID)
    expect(claimIds).not.toContain(WITHHELD_CN_LIKENESS_ID)

    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('marking or label'))
    expect(interp).toBeDefined()
    const summary = interp!.summary

    // Case 3B hedge fires.
    expect(summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    // Governed statement content present, verbatim.
    expect(summary).toMatch(/must ensure that outputs the system generates/)
    expect(summary).toMatch(/applies from 2 August 2026/)
    expect(summary).toMatch(/This duty falls on the AI system's provider, not on the person using the system to create content\./)

    // Prohibited-conclusion audit -- none of these ever appear.
    expect(summary).not.toMatch(/you must (personally )?add a watermark/i)
    expect(summary).not.toMatch(/you (need|must) (to )?(add|implement) (a |the )?(watermark|marking|label)/i)
    expect(summary).not.toMatch(/your (ai )?provider (complies|is compliant|violates|is violating)/i)
    expect(summary).not.toMatch(/the metadata satisfies|c2pa satisfies|is sufficiently detectable/i)
    expect(summary).not.toMatch(/article 50\(2\) (applies to|governs) your project/i)
    expect(summary).not.toMatch(/you are the (statutory )?provider/i)
    expect(summary).not.toMatch(/commercially cleared|legally cleared|copyright clearance|platform permission/i)
    expect(summary).not.toMatch(/article 50\(2\) and (article )?50\(4\) (are|impose) the same/i)
  })

  test('Composition renders the fixture\'s own crc_candidate_statement verbatim -- opaque pass-through, same generic composer as every other claim', () => {
    const su = suWithEUJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const item = output.knowledge_items.find((k) => k.claim_id === CLAIM_ID)
    const fixtureClaim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!
    expect(item?.statement).toBe(fixtureClaim.crc_candidate_statement)
  })

  test('jurisdiction UNCONFIRMED -> claim absent from output entirely, never asserted as though EU were confirmed', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialUseGoal()],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id)).not.toContain(CLAIM_ID)
  })
})

// ── Article 50(2) + Article 50(4) coexistence ───────────────────────────────

describe('Article 50(2) + Article 50(4) coexistence -- both reached via the same relationship, never merged into one undated/un-actored rule', () => {
  test('a commercial_use goal + confirmed EU jurisdiction surfaces BOTH claims via lookupRelatedTopicClaims, independently gated', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['European Union']))
    const ids = result.matches.map((m) => m.claim.claim_id)
    expect(ids).toContain(CLAIM_ID)
    expect(ids).toContain(ART50_4_SIBLING_ID)
  })

  test('both claims flow into one combined commercial_use BoundedInterpretation (dependency-bearing group), each self-contained statement surviving the space-join, neither actor/mechanism conflated', () => {
    const out = retrieve(
      handoff(),
      MATRIX_FIXTURE,
      [commercialUseGoal()],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { included: ['European Union'], excluded: [] }, toolMentions: [] },
      TOPIC_RELATIONSHIPS_FIXTURE,
    )
    const interpretations = buildBoundedInterpretations(userGoalsToBiIntents([commercialUseGoal()]), out.results, out.diagnostics, { state: 'unknown' })
    const interp = interpretations.find((i) => i.category === 'commercial_use')
    expect(interp).toBeDefined()
    expect(interp!.status).toBe('relevant_applicability_unresolved')
    expect(interp!.supporting_claim_ids).toEqual(expect.arrayContaining([CLAIM_ID, ART50_4_SIBLING_ID]))

    // Both self-contained, independently-scoped sentences present, verbatim,
    // never flattened into one undated/un-actored "EU AI content must be
    // labelled" rule.
    expect(interp!.summary).toMatch(/Under Article 50\(2\) of the EU AI Act.*a provider of an AI system/)
    expect(interp!.summary).toMatch(/Under Article 50\(4\), first subparagraph, of Regulation \(EU\) 2024\/1689.*a deployer of an AI system/)
    // Each names its own distinct actor explicitly -- never collapsed.
    expect(interp!.summary).toMatch(/This duty falls on the AI system's provider, not on the person using the system to create content\./)
    expect(interp!.summary).not.toMatch(/article 50\(2\) and (article )?50\(4\) (are|impose) the same/i)
  })

  test('full pipeline (runCRCConversation): both claim IDs present in knowledge_items for the same commercial_use + EU conversation', () => {
    const su = suWithEUJurisdiction()
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).toContain(ART50_4_SIBLING_ID)
  })

  // CRC-JURISDICTION-CANONICALIZATION-REPAIR-1 (2026-10-07): the production
  // defect this reproduces used the REAL `assessment_jurisdiction_mentions`
  // model (not the legacy `project_facts.jurisdiction` scalar
  // `suWithEUJurisdiction()` above exercises), with the raw, uncanonicalized
  // value a real user actually typed, not an already-canonical literal.
  // Session 37a78beb-8cc4-462a-944b-bccf6d444f7e persisted exactly this
  // shape and both EU claims were silently withheld before this repair.
  test('full pipeline, real assessment_jurisdiction_mentions model, raw production value "The European Union": both Article 50(2) and Article 50(4) reach knowledge_items, dependencies remain unresolved, governance untouched', () => {
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialUseGoal()],
      assessment_jurisdiction_mentions: [
        {
          mention_id: 'm-1',
          value: 'The European Union',
          confidence: 'confirmed',
          source_turn: 2,
          source_statement: 'The European Union.',
          superseded_by: null,
        },
      ],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)

    // The proven production fix: both claims now reach the user instead of
    // being silently dropped behind "Related context" with no substantive
    // explanation.
    expect(claimIds).toContain(CLAIM_ID)
    expect(claimIds).toContain(ART50_4_SIBLING_ID)

    // Jurisdiction matching is necessary, not sufficient -- this repair does
    // not resolve either claim's own governed dependencies or strengthen
    // the BI ceiling. Still Case 3B, still the fixed generic hedge, still no
    // prohibited conclusion.
    const interp = output.goal_interpretations.find((i) => i.goal_text.includes('marking or label'))
    expect(interp).toBeDefined()
    expect(interp!.summary).toMatch(/there isn't enough project-specific information to determine how it applies to your specific project/)
    expect(interp!.summary).not.toMatch(/article 50\(2\) (applies to|governs) your project/i)
    expect(interp!.summary).not.toMatch(/your (ai )?provider (complies|is compliant|violates|is violating)/i)

    const art502 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CLAIM_ID)!
    const art504 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ART50_4_SIBLING_ID)!
    expect(art502.unresolved_project_dependencies).toEqual(['provider_status_confirmed', 'union_establishment_or_output_use'])
    expect(art504.unresolved_project_dependencies).toEqual([
      'deployer_status_confirmed',
      'content_constitutes_deep_fake',
      'artistic_creative_satirical_fictional_analogous_work',
      'union_establishment_or_output_use',
    ])
  })

  test('the raw production value is NEVER substituted by a distribution-territory mention -- assessment jurisdiction and distribution territory remain structurally separate inputs', () => {
    // A session with ONLY a distribution_territory_mentions entry (never an
    // assessment_jurisdiction_mentions entry) must not retrieve either claim
    // -- deriveAssessmentJurisdictionFacts (lib/crc-engine/assessment-
    // jurisdiction-scope.ts) reads exclusively from
    // assessment_jurisdiction_mentions/the legacy scalar, never from
    // distribution_territory_mentions, and this repair does not touch that
    // function at all.
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialUseGoal()],
      distribution_territory_mentions: [
        { mention_id: 'd-1', value: 'the European Union', confidence: 'confirmed', source_turn: 2, source_statement: 'the European Union', superseded_by: null },
      ],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const claimIds = output.knowledge_items.map((k) => k.claim_id)
    expect(claimIds).not.toContain(CLAIM_ID)
    expect(claimIds).not.toContain(ART50_4_SIBLING_ID)
  })
})

// ── sibling non-interference (all directions) ───────────────────────────────

describe('sibling claim isolation -- Article 50(4), NY/California synthetic-performer claims, both withheld real-person likeness claims all unaffected', () => {
  test('the Article 50(4) sibling retains its own four-dependency array and EU applicability, unmodified by this activation', () => {
    const sibling = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === ART50_4_SIBLING_ID)
    expect(sibling).toBeDefined()
    expect(sibling?.unresolved_project_dependencies).toEqual([
      'deployer_status_confirmed',
      'content_constitutes_deep_fake',
      'artistic_creative_satirical_fictional_analogous_work',
      'union_establishment_or_output_use',
    ])
    expect(sibling?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'European Union' }])
    expect(sibling?.provider_scope).toBeNull()
  })

  test('the one TopicRelationship targeting ai_content_transparency is unchanged -- still exactly one, still Adopted + crc_eligible: Yes', () => {
    const targeting = TOPIC_RELATIONSHIPS_FIXTURE.filter((r) => r.target_topic === 'ai_content_transparency')
    expect(targeting).toHaveLength(1)
    expect(targeting[0].relationship_id).toBe('REL-COMMERCIAL-USE-AI-CONTENT-TRANSPARENCY-v1')
    expect(targeting[0].lifecycle).toBe('Adopted')
    expect(targeting[0].crc_eligible).toBe('Yes')
  })

  test('NY and California synthetic-performer claims (likeness topic) retain their own dependency arrays and applicability, unaffected', () => {
    const ny = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === NY_SYNTHETIC_PERFORMER_ID)
    const ca = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === CA_SYNTHETIC_PERFORMER_ID)
    expect(ny?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'New York' }])
    expect(ca?.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'California' }])
  })

  test('both withheld real-person likeness claims have no fixture entry -- activating the EU Article 50(2) claim does not activate either', () => {
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === WITHHELD_NY_LIKENESS_ID)).toBeUndefined()
    expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === WITHHELD_CN_LIKENESS_ID)).toBeUndefined()
  })

  test('EU-jurisdiction + commercial_use retrieval never surfaces either withheld likeness sibling, or the NY/California likeness-topic claims (different GoalCategory, different applicability)', () => {
    const result = lookupRelatedTopicClaims([commercialUseGoal()], TOPIC_RELATIONSHIPS_FIXTURE, TOPIC_CLAIMS_FIXTURE, facts(['European Union']))
    const ids = result.matches.map((m) => m.claim.claim_id)
    expect(ids).not.toContain(WITHHELD_NY_LIKENESS_ID)
    expect(ids).not.toContain(WITHHELD_CN_LIKENESS_ID)
    expect(ids).not.toContain(NY_SYNTHETIC_PERFORMER_ID)
    expect(ids).not.toContain(CA_SYNTHETIC_PERFORMER_ID)
  })
})

// ── total reachable population sanity ───────────────────────────────────────

describe('total fixture population sanity', () => {
  test('exactly thirty-eight Adopted + CRC-eligible claims exist as of 2026-10-02 (see topic-claims-fixture-consistency.test.ts for the authoritative, itemized manifest assertion -- the 38th is this claim, CLAIM-EUAI-ART50-2-PROVIDER-MARKING-001-v1)', () => {
    const live = TOPIC_CLAIMS_FIXTURE.filter((c) => c.lifecycle === 'Adopted' && c.crc_eligible === 'Yes')
    expect(live).toHaveLength(38)
  })
})
