/**
 * Wave 1 governance-boundary proof (CRC Living Knowledge Phase 1,
 * 2026-08-16; updated 2026-08-16 for the first formal adoption decision;
 * updated again 2026-08-17 for the first formal CRC-publication decision;
 * updated again 2026-08-19 for the atomic copyright publication package).
 * Uses the REAL TOPIC_CLAIMS_FIXTURE content -- four real U.S. copyright
 * claims, formally ADOPTED 2026-08-16 (Adoption Approver: JD/PM) as SI8
 * institutional/reviewer knowledge.
 *
 * As of 2026-08-17, this file's own premise changed for the first time:
 * CLAIM-COPY-004-v1 became `crc_eligible: 'Yes'` (CRC Approver: JD/PM,
 * 2026-08-17, after source-hardening research -- see
 * 01_Business/research/COPY-004-SOURCE-HARDENING-RESEARCH-2026.md) -- the
 * first non-platform copyright claim ever published to CRC.
 *
 * As of 2026-08-19, this file's premise changed a second time: following a
 * bounded Copyright CRC Publication-Readiness Review (recommendation A --
 * PASS/GO AS-IS for all four objects, no text change to any of them) and PM
 * approval, CLAIM-COPY-001-v1/-002-v1/-003-v1 and
 * REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 are now ALSO `crc_eligible: 'Yes'`
 * -- published together in a single atomic governance decision, not
 * sequentially. See
 * `governance-reviews/CPR_006_COPYRIGHT_PUBLICATION_PACKAGE_2026-08-19.md`.
 * This file's own title ("...claims-excluded") now describes its ORIGINAL
 * scope, not its current one -- updated, not left stale or renamed, per
 * this file's own established precedent (see prior header updates above):
 * it now proves the POSITIVE reachability behavior for all four objects,
 * plus the one remaining real applicability boundary (unconfirmed U.S.
 * jurisdiction), which is expected, disclosed, non-blocking behavior, not
 * a routing defect.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { deriveAssessmentJurisdictionFacts } from '@/lib/crc-engine/assessment-jurisdiction-scope'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { lookupTopicClaims } from '@/lib/retrieval-engine/lookup-topic-claims'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

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
    raw_text: 'Do I own the copyright?',
    category: 'copyright_ownership',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Do I own the copyright?',
    ...overrides,
  }
}

/**
 * CLAIM-COPY-001/002/003 are tagged Topic: copyrightability;
 * CLAIM-COPY-004 is tagged Topic: copyright_ownership. copyrightGoal()
 * above only exercises copyright_ownership (directly matches only 004;
 * reaches 001/002/003 ONLY via REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1, now
 * also live); this helper exercises copyrightability directly (matching
 * 001/002/003 via exact topic match, no relationship needed).
 */
function copyrightabilityGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Is this even copyrightable?',
    category: 'copyrightability',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Is this even copyrightable?',
    ...overrides,
  }
}

describe('Wave 1 real claims -- governance state as of 2026-08-19 (all four COPY claims + REL-COPY now CRC-eligible)', () => {
  /**
   * Updated 2026-08-18 (Living Knowledge — Third-Party Source Rights, M3):
   * the fixture now also carries the five real, Adopted stock-media claims
   * (M1 GoalCategory + M2 AssetProviderMention + M3 provider-scoped
   * retrieval together closed their prior no-runtime-representation
   * blocker) -- updated, not left stale, per this file's own established
   * precedent (see module header). Their own crc_eligible state is proven
   * separately, not by this file (which is scoped to Wave 1's copyright
   * claims) -- see topic-claims-fixture-consistency.test.ts and the M3
   * provider-narrowing test suite.
   *
   * Updated again 2026-08-27 (Governance Correction Review,
   * governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_
   * 2026-08-27.md): CLAIM-STOCK-EDITORIAL-001-v1/-002-v1 gained corrected
   * -v2 successors via supersession -- both v1 predecessors are PRESERVED
   * in the fixture (never deleted, per this repository's own "never
   * retroactively edit a historical decision record" discipline) with
   * `superseded_by` now non-null, alongside their new -v2 successors. Count
   * grows from nine to eleven; see the dedicated Lifecycle test immediately
   * below for why not all eleven are still 'Adopted'.
   *
   * Updated again 2026-08-27, later same session (A-3 CRC Publication
   * Recording task): CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1
   * (A-3) gained its first real runtime fixture entry, following explicit
   * human CRC Publication approval (CPR_007 basis + the Artlist A-3
   * Synthetic Runtime Canary + the Artlist Provider Registration Canary
   * Integration Review). Count grows from eleven to twelve. This file
   * remains scoped to Wave 1's own copyright claims plus incidental
   * whole-fixture exhaustiveness -- A-3's own crc_eligible/routing
   * behavior is proven separately, by topic-claims-fixture-consistency.
   * test.ts and the provider-scoped retrieval/discovered-relevance suites.
   *
   * Updated again 2026-08-30 (LK-39, First Real Tool-Scoped TopicClaim
   * Runtime Mirroring): CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1 gained
   * its first real runtime fixture entry -- the first tool_scope-narrowed
   * TopicClaim in this fixture -- following explicit human CRC Publication
   * approval (CPR_009, an intervening DEFER, and a targeted evidence
   * refresh, LK-37 Classification A). Count grows from twelve to thirteen.
   * Its own tool_scope/retrieval/BI/Composition behavior is proven
   * separately by tool-scoped-retrieval.test.ts's own real-fixture describe
   * block.
   *
   * Updated again 2026-08-30 (LK-51, Trial 2 -- First Real Provider-Scoped
   * TopicClaim Runtime Mirroring Since A-3): CLAIM-STORYBLOCKS-BUSINESS-
   * LICENSE-BROADCAST-001-v1 gained its first real runtime fixture entry --
   * the second provider_scope-narrowed TopicClaim in this fixture --
   * following explicit human CRC Publication approval (CPR_010, no
   * intervening DEFER). Count grows from thirteen to fourteen. Its own
   * provider_scope/retrieval/BI/Composition behavior is proven separately
   * by storyblocks-runtime-retrieval.test.ts's own real-fixture describe
   * block.
   */
  test('all four Wave 1 claims plus the seven stock-media claims (five original + two -v2 correction successors) plus A-3 (the first published Music-domain claim) plus the first real tool-scoped claim (Synthesia) plus the first real provider-scoped claim since A-3 (Storyblocks) are present in the fixture', () => {
    expect(TOPIC_CLAIMS_FIXTURE.map((c) => c.claim_id).sort()).toEqual([
      'CLAIM-COPY-001-v1',
      'CLAIM-COPY-002-v1',
      'CLAIM-COPY-003-v1',
      'CLAIM-COPY-004-v1',
      'CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1',
      'CLAIM-STOCK-EDITORIAL-001-v1',
      'CLAIM-STOCK-EDITORIAL-001-v2',
      'CLAIM-STOCK-EDITORIAL-002-v1',
      'CLAIM-STOCK-EDITORIAL-002-v2',
      'CLAIM-STOCK-GETTY-EDITORIAL-001-v1',
      'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1',
      'CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1',
      'CLAIM-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001-v1',
      'CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1',
    ])
  })

  test('all four Wave 1 claims plus the five CURRENTLY-GOVERNING stock-media claims (Getty/iStock/Shutterstock unaffected by the 2026-08-27 correction, plus the two -v2 successors) ARE Lifecycle: Adopted -- the two -v1 predecessors are correctly Deprecated, not Adopted, and are excluded from this assertion deliberately, not by oversight', () => {
    const supersededPredecessors = new Set(['CLAIM-STOCK-EDITORIAL-001-v1', 'CLAIM-STOCK-EDITORIAL-002-v1'])
    for (const claim of TOPIC_CLAIMS_FIXTURE) {
      if (supersededPredecessors.has(claim.claim_id)) {
        expect(claim.lifecycle).toBe('Deprecated')
        continue
      }
      expect(claim.lifecycle).toBe('Adopted')
    }
  })

  test('all four Wave 1 claims (CLAIM-COPY-001/002/003/004) are now CRC-Eligible: Yes -- published atomically 2026-08-19 (001/002/003 + REL-COPY together), 004 independently on 2026-08-17', () => {
    for (const id of ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1']) {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)?.crc_eligible).toBe('Yes')
    }
  })

  test('the governed relationship REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1 is now CRC-Eligible: Yes -- published atomically alongside its three target claims 2026-08-19', () => {
    const rel = TOPIC_RELATIONSHIPS_FIXTURE.find((r) => r.relationship_id === 'REL-COPY-OWNERSHIP-COPYRIGHTABILITY-v1')!
    expect(rel.lifecycle).toBe('Adopted')
    expect(rel.crc_eligible).toBe('Yes')
  })
})

describe('CLAIM-COPY-004 -- reachable through exact Topic Retrieval (published 2026-08-17, unaffected by the 2026-08-19 package)', () => {
  test('lookupTopicClaims returns CLAIM-COPY-004 for a copyright_ownership goal, jurisdiction unconfirmed -- Global + empty applicability requirements means no gate to clear; COPY-001/002/003 never enter this result because lookupTopicClaims only ever exact-matches Topic, and their own Topic is copyrightability, not copyright_ownership', () => {
    const result = lookupTopicClaims([copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: [], excluded: [] }, toolMentions: [] })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].claim_id).toBe('CLAIM-COPY-004-v1')
  })

  test('retrieve() produces exactly one result for a copyright_ownership goal when jurisdiction is unconfirmed, correctly tagged exact_topic -- COPY-001/002/003 are now relationship-reachable in principle, but their own applicability_requirements (confirmed US jurisdiction) are unmet with unknown jurisdiction, so they never enter matches[] via the related-topic path either', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(out.results).toHaveLength(1)
    expect(out.results[0]).toMatchObject({ claim_id: 'CLAIM-COPY-004-v1', match_origin: 'exact_topic', matched_goal_category: 'copyright_ownership', relationship_id: null })
  })

  test('InterpretationStatus is directly_relevant, not a stronger claim -- COPY-004 has empty unresolved_project_dependencies, so Case 3B never fires (no relationships passed here, so this is COPY-004 in isolation, unaffected by the copyright publication package)', () => {
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: [], excluded: [] }, toolMentions: [] })
    const [interp] = buildBoundedInterpretations([copyrightGoal()], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
  })
})

describe('CLAIM-COPY-001/002/003 -- reachable through exact Topic Retrieval for a direct copyrightability goal (published 2026-08-19)', () => {
  test('lookupTopicClaims returns all three for a copyrightability goal with confirmed US jurisdiction -- Adopted + CRC Eligible: Yes + applicability met', () => {
    const goal = copyrightabilityGoal()
    for (const id of ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1']) {
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)?.lifecycle).toBe('Adopted')
      expect(TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === id)?.crc_eligible).toBe('Yes')
    }
    const result = lookupTopicClaims([goal], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] })
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
  })

  test('lookupTopicClaims returns zero matches for a copyrightability goal when jurisdiction is unconfirmed -- the one remaining real applicability boundary, expected and disclosed, not a routing defect', () => {
    const goal = copyrightabilityGoal()
    const result = lookupTopicClaims([goal], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: [], excluded: [] }, toolMentions: [] })
    expect(result.matches).toEqual([])
    const diagnostic = result.diagnostics.find((d) => d.identifier === 'copyrightability' && d.reason === 'applicability_unmet')
    expect(diagnostic).toBeDefined()
    // unmet_applicability aggregates one 'unresolved' jurisdiction entry per
    // claim (COPY-001/002/003) -- order-independent, since fixture array
    // order is not part of this test's own contract.
    expect(diagnostic!.unmet_applicability).toEqual(
      expect.arrayContaining(
        ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'].map((claim_id) => ({
          claim_id,
          requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
          status: 'unresolved',
        })),
      ),
    )
    expect(diagnostic!.unmet_applicability).toHaveLength(3)
  })

  test("item F, now proven positively: relevant_applicability_unresolved (Case 3B) correctly fires for all three claims -- each carries non-empty unresolved_project_dependencies (['human_contribution_description']), so the combined statement renders under the unresolved-applicability template, never directly_relevant", () => {
    const claim001 = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-COPY-001-v1')!
    expect(claim001.unresolved_project_dependencies).toEqual(['human_contribution_description'])
    expect(claim001.lifecycle).toBe('Adopted')
    expect(claim001.crc_eligible).toBe('Yes')
    const out = retrieve(handoff(), MATRIX_FIXTURE, [copyrightabilityGoal()], TOPIC_CLAIMS_FIXTURE, { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] })
    const [interp] = buildBoundedInterpretations([copyrightabilityGoal()], out.results, out.diagnostics)
    expect(interp.status).toBe('relevant_applicability_unresolved')
    expect(interp.summary).toContain("there isn't enough project-specific information")
  })

  test('retrieve() produces zero results for a copyrightability goal when jurisdiction is unconfirmed, even though the claims are now CRC-eligible', () => {
    const goal = copyrightabilityGoal()
    const out = retrieve(
      handoff(),
      MATRIX_FIXTURE,
      [goal],
      TOPIC_CLAIMS_FIXTURE,
      { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    )
    expect(out.results).toEqual([])
  })
})

describe('Wave 1 real claims -- end-to-end through the full CRC pipeline (2026-08-19 governance state: all four COPY claims + REL-COPY live)', () => {
  test('a real copyright_ownership goal, confirmed US jurisdiction, surfaces the full four-claim composition (COPY-004 direct + COPY-001/002/003 via REL-COPY) -- directly_relevant text quoted, never a copyright/ownership conclusion, no internal metadata rendered', () => {
    const goal = copyrightGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const summary = output.goal_interpretations[0].summary
    // COPY-004's own framing statement.
    expect(summary).toContain("are two separate questions")
    // COPY-001/002/003's own governed text, now legitimately reachable via REL-COPY.
    expect(summary).toContain('generally isn\'t eligible for copyright protection')
    expect(summary).toContain('writing prompts alone')
    expect(summary).toContain('meaningfully selecting, arranging, or editing')
    // The related-topic boundary clause, appended once for the relationship-sourced content.
    expect(summary).toContain('This information is relevant to what you asked, but does not by itself determine the answer.')
    // Case 3B's own closing hedge -- fires because COPY-001/002/003 all carry unresolved_project_dependencies.
    expect(summary).toContain("there isn't enough project-specific information")
    // Never the old "no coverage" template -- that would mean the publication decision silently didn't take effect.
    expect(summary).not.toContain("doesn't establish an answer")
    // Never a copyright/ownership conclusion in either direction, and never an assertion the user's own contribution satisfies/fails the legal threshold.
    expect(summary).not.toMatch(/\byou own\b|\byou do not own\b|\byour video is copyrighted\b|\byour video is not copyrighted\b|\byour editing is enough\b|\byour prompts establish authorship\b/i)
    // No internal relationship/claim-id metadata rendered to the user.
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('REL-COPY-OWNERSHIP-COPYRIGHTABILITY')
    expect(serialized).not.toContain('relevant_consideration')
    expect(serialized).not.toContain('DRAFT')
    expect(serialized).not.toContain('bedrock') // internal Source fact prose, never rendered verbatim to CRC users
    expect(serialized).not.toContain('Thaler')
    expect(serialized).not.toContain('sweat of the brow')
  })

  test('a real copyright_ownership goal, jurisdiction UNCONFIRMED, still surfaces only COPY-004 -- COPY-001/002/003 remain silently unreachable (their own applicability_requirements unmet), never asserted as though jurisdiction were confirmed', () => {
    const goal = copyrightGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      // jurisdiction left at DIALOGUE_FIXTURES.no_signal's own default (unattested/unknown) -- deliberately not confirmed here.
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const summary = output.goal_interpretations[0].summary
    expect(summary).toBe(
      "Whether a platform's terms allow commercial use of the output, and whether that output is copyrighted (and who owns it), are two separate questions -- a platform granting commercial-use permission doesn't by itself answer either. This is relevant to who owns the copyright, though it doesn't by itself determine the answer for your specific project.",
    )
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('bedrock')
    expect(serialized).not.toContain('Thaler')
    expect(serialized).not.toContain('sweat of the brow')
    expect(serialized).not.toContain('sufficient human creative contribution')
    expect(serialized).not.toContain('perceptible portion')
    expect(serialized).not.toContain('REL-COPY-OWNERSHIP-COPYRIGHTABILITY')
  })

  test('a real copyrightability goal, confirmed US jurisdiction, now surfaces COPY-001/002/003\'s combined governed statement directly -- never the old outside_current_coverage template', () => {
    const goal = copyrightabilityGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    const summary = output.goal_interpretations[0].summary
    expect(summary).not.toContain("doesn't establish an answer")
    expect(summary).toContain("there isn't enough project-specific information")
    expect(summary).toContain('generally isn\'t eligible for copyright protection')
    expect(summary).toContain('writing prompts alone')
    expect(summary).toContain('meaningfully selecting, arranging, or editing')
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('DRAFT')
    expect(serialized).not.toContain('RE-VERIFIED')
  })

  test('a real copyrightability goal, jurisdiction UNCONFIRMED, now produces Case 3A (relevant_applicability_unresolved, content-free) rather than outside_current_coverage -- a genuine, correct behavior change from pre-publication: previously COPY-001/002/003 were excluded via not_adopted_or_eligible (never reaching the applicability check at all), which does not trigger Case 3A; now that they are Adopted + CRC Eligible: Yes, the SAME unconfirmed jurisdiction instead produces an applicability_unmet diagnostic, which DOES trigger Case 3A -- still zero claim content quoted, still safe, but more informative than the old flat "no coverage" message', () => {
    const goal = copyrightabilityGoal()
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.goal_interpretations).toHaveLength(1)
    // Case 3A, content-free: "SI8 has governed knowledge relevant to ...,
    // but it depends on project-specific information that hasn't been
    // confirmed in this conversation." -- never quotes claim text, never
    // asserts a U.S.-specific proposition without confirmed U.S. jurisdiction.
    expect(output.goal_interpretations[0].summary).toContain('SI8 has governed knowledge relevant to')
    expect(output.goal_interpretations[0].summary).toContain("hasn't been confirmed in this conversation")
    expect(output.goal_interpretations[0].summary).not.toContain("doesn't establish an answer")
    expect(output.goal_interpretations[0].summary).not.toContain("there isn't enough project-specific information")
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('bedrock')
    expect(serialized).not.toContain('Thaler')
    expect(serialized).not.toContain('sweat of the brow')
    expect(serialized).not.toContain('sufficient human creative contribution')
    expect(serialized).not.toContain('perceptible portion')
    expect(serialized).not.toContain('DRAFT')
    expect(serialized).not.toContain('RE-VERIFIED')
  })

  test('commercial_use goal isolation: no copyright content appears for an unrelated goal category in the same conversation', () => {
    const commercialGoal: UserGoal = {
      goal_id: 'g-2',
      state: 'confirmed',
      raw_text: 'Can I use this commercially?',
      category: 'commercial_use',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Can I use this commercially?',
    }
    const su: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [commercialGoal],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('CLAIM-COPY-004')
    expect(serialized).not.toContain('CLAIM-COPY-001')
    expect(serialized).not.toContain('CLAIM-COPY-002')
    expect(serialized).not.toContain('CLAIM-COPY-003')
    expect(serialized).not.toContain("doesn't by itself answer either")
  })
})

describe('Copyright UAT Output-Path Diagnostic P0 fix -- jurisdiction value normalization regression (2026-08-19)', () => {
  function fullCopyrightState(jurisdictionValue: string, contributionText: string | null): StructuredUnderstanding {
    const goal = copyrightGoal()
    return {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      tool_mentions: [
        {
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          access_surface: { state: 'unknown' },
          plan_tier: { state: 'unknown' },
          account_status: { state: 'unknown' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'Kling AI',
          superseded_by: null,
        },
      ],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: jurisdictionValue }, source_turn: 2, source_statement: jurisdictionValue },
        human_contribution_description:
          contributionText === null
            ? { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' }
            : { attestation: { state: 'confirmed', value: contributionText }, source_turn: 3, source_statement: contributionText },
      },
    }
  }

  const RICH_CONTRIBUTION_TEXT = 'I selected the videos, uploaded the reference images, designed the soundtrack, and edited/arranged the sequence.'

  test('Section 9/10: real Retrieval + full runCRCConversation regression -- jurisdiction confirmed as "US" (the real failing UAT value), REL-COPY remains the routing mechanism, all four COPY claims + H5 surface', () => {
    const su = fullCopyrightState('US', RICH_CONTRIBUTION_TEXT)

    // Retrieval-level proof first: REL-COPY is the actual mechanism, not bypassed.
    const handoffResult = retrieve(handoff({ tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }] }), MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, { jurisdiction: deriveAssessmentJurisdictionFacts(su), toolMentions: su.tool_mentions }, TOPIC_RELATIONSHIPS_FIXTURE)
    const relatedResults = handoffResult.results.filter((r) => r.match_origin === 'related_topic')
    expect(relatedResults.map((r) => r.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1'])
    expect(handoffResult.diagnostics).not.toContainEqual({ identifier: 'copyright_ownership', reason: 'applicability_unmet' })

    // Full pipeline.
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(output.knowledge_items.map((k) => k.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1', 'kling-commercial-use-baseline'])
    const summary = output.goal_interpretations[0].summary
    // COPY-001/002/003 consultative content present.
    expect(summary).toContain("generally isn't eligible for copyright protection")
    expect(summary).toContain('writing prompts alone')
    expect(summary).toContain('meaningfully selecting, arranging, or editing')
    // H5 contribution-aware sentence present.
    expect(summary).toContain(`You described your own contribution as: "${RICH_CONTRIBUTION_TEXT}"`)
    // Existing hedge preserved.
    expect(summary).toContain("there isn't enough project-specific information")
    // No forbidden legal conclusions (same discipline as this file's own pre-existing assertions above).
    expect(summary).not.toMatch(/\byou own\b|\byou do not own\b|\byour video is copyrighted\b|\byour video is not copyrighted\b/i)
    expect(summary).not.toMatch(/all ai-generated (material|output|content) is copyrightable/i)
    expect(summary).not.toMatch(/human contribution automatically (creates|establishes) copyright/i)
  })

  test('Section 11: canonical-value equivalence -- "US" and "United States" produce BYTE-IDENTICAL knowledge_items and goal_interpretations, everything else held constant', () => {
    const suA = fullCopyrightState('US', RICH_CONTRIBUTION_TEXT)
    const suB = fullCopyrightState('United States', RICH_CONTRIBUTION_TEXT)
    const resultA = runCRCConversation(suA, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const resultB = runCRCConversation(suB, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(resultA.output.knowledge_items).toEqual(resultB.output.knowledge_items)
    expect(resultA.output.goal_interpretations).toEqual(resultB.output.goal_interpretations)
  })

  test('Section 12: fail-closed regression -- jurisdiction confirmed as "United Kingdom" still yields COPY-004 only; normalization has not weakened the gate', () => {
    const su = fullCopyrightState('United Kingdom', RICH_CONTRIBUTION_TEXT)
    const { output, diagnostics } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    // "kling" also surfaces -- the tool-matrix commercial-use claim is reached independently
    // via the mentioned tool, regardless of goal category; the regression proof here is that
    // COPY-001/002/003 (the jurisdiction-gated copyrightability claims) do NOT appear.
    expect(output.knowledge_items.map((k) => k.claim_id).sort()).toEqual(['CLAIM-COPY-004-v1', 'kling-commercial-use-baseline'])
    expect(diagnostics.retrieval).toContainEqual({ identifier: 'copyright_ownership', reason: 'applicability_unmet' })
    const summary = output.goal_interpretations[0].summary
    expect(summary).not.toContain("generally isn't eligible for copyright protection")
    expect(summary).not.toContain('You described your own contribution as')
  })

  test('Section 13: stock-rights regression -- jurisdiction normalization does not alter third_party_source_rights / provider_scope retrieval for iStock, Getty, or Shutterstock', () => {
    const providerGoal: UserGoal = {
      goal_id: 'g-stock', state: 'confirmed', raw_text: 'Can I use this stock image?', category: 'third_party_source_rights',
      scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x',
    }
    for (const provider of ['istock', 'getty', 'shutterstock'] as const) {
      const su: StructuredUnderstanding = {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
        user_goals: [providerGoal],
        asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: provider }, confidence: 'confirmed', source_turn: 1, source_statement: provider, superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
        project_facts: {
          ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
          jurisdiction: { attestation: { state: 'confirmed', value: 'US' }, source_turn: 2, source_statement: 'US' },
        },
      }
      const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
      const claimIds = output.knowledge_items.map((k) => k.claim_id)
      // Generic editorial claims (no provider_scope) plus the provider-specific one -- exact expected set is provider-dependent,
      // but the key regression proof is that provider_scope routing still discriminates correctly and copyright claims never leak in.
      expect(claimIds.some((id) => id.startsWith('CLAIM-STOCK'))).toBe(true)
      expect(claimIds).not.toContain('CLAIM-COPY-001-v1')
      expect(claimIds).not.toContain('CLAIM-COPY-002-v1')
      expect(claimIds).not.toContain('CLAIM-COPY-003-v1')
      expect(claimIds).not.toContain('CLAIM-COPY-004-v1')
    }
  })
})

describe('Copyright UAT Cumulative-Restatement Fix -- H5 + full pipeline regression (P1, 2026-08-19)', () => {
  const RICH_CONTRIBUTION_TEXT = 'I selected the takes and arranged the sequence. I also edited it as well.'
  const INCIDENTAL_TEXT = 'I sourced everything else on my end.'

  function copyrightStateWith(jurisdictionValue: string, contributionText: string): StructuredUnderstanding {
    const goal = copyrightGoal()
    return {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [goal],
      tool_mentions: [
        {
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'kling' },
          access_surface: { state: 'unknown' },
          plan_tier: { state: 'unknown' },
          account_status: { state: 'unknown' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'Kling AI',
          superseded_by: null,
        },
      ],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: { attestation: { state: 'confirmed', value: jurisdictionValue }, source_turn: 2, source_statement: jurisdictionValue },
        human_contribution_description: { attestation: { state: 'confirmed', value: contributionText }, source_turn: 4, source_statement: contributionText },
      },
    }
  }

  test('Section 16/17: real runCRCConversation, simulating the fixed post-P1 final state (rich contribution preserved through a later incidental disclosure) -- COPY-001/002/003/004 all surface, H5 uses the RICH value, never the incidental one', () => {
    // This state represents what the fix guarantees the FINAL persisted state
    // looks like after the real UAT sequence -- the incidental "I sourced
    // everything else on my end" turn is deterministically rejected upstream
    // (proven directly in extraction.test.ts and run-turn-human-contribution-
    // clarification.test.ts), so the rich value is what actually reaches here.
    const su = copyrightStateWith('US', RICH_CONTRIBUTION_TEXT)
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)

    expect(output.knowledge_items.map((k) => k.claim_id).sort()).toEqual(['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPY-004-v1', 'kling-commercial-use-baseline'])
    const summary = output.goal_interpretations[0].summary
    // COPY-001/002/003 consultative content present.
    expect(summary).toContain("generally isn't eligible for copyright protection")
    expect(summary).toContain('writing prompts alone')
    expect(summary).toContain('meaningfully selecting, arranging, or editing')
    // H5 uses the RICH value.
    expect(summary).toContain(`You described your own contribution as: "${RICH_CONTRIBUTION_TEXT}"`)
    // H5 must NEVER use the incidental, unrelated disclosure text.
    expect(summary).not.toContain(INCIDENTAL_TEXT)
    // Existing hedge preserved; no forbidden legal conclusions.
    expect(summary).toContain("there isn't enough project-specific information")
    expect(summary).not.toMatch(/\byou own\b|\byou do not own\b|\byour video is copyrighted\b|\byour video is not copyrighted\b|\byour editing (is|qualifies)\b|\byour contribution (is sufficient|fails)\b/i)
  })

  test('Section 18: P0 jurisdiction normalization regression -- "US" and "United States" still produce byte-identical output with the P1 fix in place', () => {
    const suA = copyrightStateWith('US', RICH_CONTRIBUTION_TEXT)
    const suB = copyrightStateWith('United States', RICH_CONTRIBUTION_TEXT)
    const resultA = runCRCConversation(suA, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const resultB = runCRCConversation(suB, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    expect(resultA.output.knowledge_items).toEqual(resultB.output.knowledge_items)
    expect(resultA.output.goal_interpretations).toEqual(resultB.output.goal_interpretations)
  })

  test('commercial_use goal isolation unaffected by the P1 fix -- no copyright content leaks in', () => {
    const commercialGoal: UserGoal = {
      goal_id: 'g-2', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'commercial_use',
      scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x',
    }
    const su: StructuredUnderstanding = { ...copyrightStateWith('US', RICH_CONTRIBUTION_TEXT), user_goals: [commercialGoal] }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('CLAIM-COPY-001')
    expect(serialized).not.toContain('CLAIM-COPY-002')
    expect(serialized).not.toContain('CLAIM-COPY-003')
    expect(serialized).not.toContain('CLAIM-COPY-004')
    expect(serialized).not.toContain(RICH_CONTRIBUTION_TEXT)
  })

  test('Path B remains off -- an asset_provider_mention alongside a confirmed human_contribution_description never triggers a stock/editorial claim or question', () => {
    const su: StructuredUnderstanding = {
      ...copyrightStateWith('US', RICH_CONTRIBUTION_TEXT),
      asset_provider_mentions: [{ mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 3, source_statement: 'Getty', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } }],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    const serialized = JSON.stringify(output)
    expect(serialized).not.toContain('CLAIM-STOCK')
    expect(serialized).not.toContain('editorial')
  })
})
