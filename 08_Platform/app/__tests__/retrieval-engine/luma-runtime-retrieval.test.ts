/**
 * Luma AI (Dream Machine) commercial-use governed knowledge deterministic
 * tests (Trial 5, Living Knowledge onboarding benchmark, LK-84 through
 * LK-87). Exercises the REAL, live MATRIX_FIXTURE `luma` claim end-to-end
 * through retrieve() -> buildBoundedInterpretations() -> generic
 * Composition, mirroring kling-commercial-use.test.ts's own structure,
 * simplified for Luma's zero-applicability-requirement, single-claim shape
 * (no tool_account_status-style exception exists in the governed
 * proposition). No live model needed -- pure functions.
 *
 * Confirmed by direct inspection of retrieve.ts before writing these tests:
 * Matrix-shaped claims (like `luma`) are reachable ONLY through the
 * explicit tool-identity + eligible-claim path -- lookupDiscoveredTopicClaims
 * and lookupRelatedTopicClaims both operate over `topicClaims` (TopicClaim[])
 * only, never over `matrix`. A confirmed canonical Luma ToolMention AND an
 * active, confirmed `commercial_use` UserGoal are both required; there is no
 * Track A discovered-relevance path for any Matrix claim, Luma included.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { runExtractionPipeline } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
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

function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown' }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return {
    state: 'confirmed',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
    ...overrides,
  }
}

const LUMA_ID = 'luma'
const UNKNOWN_FACTS: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

function lumaRow() {
  const row = MATRIX_FIXTURE.find((r) => r.identifier === 'luma')
  if (!row) throw new Error('luma row missing from MATRIX_FIXTURE')
  return row
}

// ── A. one-claim isolation, real committed fixture ──────────────────────

describe('A: one-claim isolation -- Luma is the only new Matrix row this trial added', () => {
  test('MATRIX_FIXTURE has exactly one luma row, exactly one claim, CRC-Eligible Yes, topic commercial_use, zero applicability requirements', () => {
    const row = lumaRow()
    expect(row.claims).toHaveLength(1)
    expect(row.claims[0].claim_id).toBe(LUMA_ID)
    expect(row.claims[0].crc_eligible).toBe('Yes')
    expect(row.claims[0].topic).toBe('commercial_use')
    expect(row.claims[0].applicability_requirements).toEqual([])
  })

  test('candidate statement matches the FGR-approved wording exactly, verbatim, no price or plan-name merchandising', () => {
    const row = lumaRow()
    expect(row.claims[0].crc_candidate_statement).toBe(
      "Luma AI's current Terms of Service restrict commercial use of Dream Machine output to an active paid subscription plan that specifically permits commercial use. Output produced under Free or Trial use may not be used commercially.",
    )
    const forbidden = /\$\d|Plus plan|Pro plan|Ultra plan|\/month/i
    expect(row.claims[0].crc_candidate_statement).not.toMatch(forbidden)
    expect(row.claims[0].crc_publication_scope).not.toMatch(forbidden)
  })

  test('publication scope explicitly forecloses ownership, copyrightability, third-party-rights clearance, and indemnification in both directions', () => {
    const row = lumaRow()
    const scope = row.claims[0].crc_publication_scope!
    expect(scope).toMatch(/does not extend to.*ownership/i)
    expect(scope).toMatch(/copyrightability/i)
    expect(scope).toMatch(/third-party-rights clearance/i)
    expect(scope).toMatch(/indemnification/i)
    // LK-87 correction: no categorical indemnification conclusion in either direction anywhere in the CRC-facing text.
    expect(scope).not.toMatch(/customer indemnifies luma/i)
    expect(scope).not.toMatch(/luma does not indemnify/i)
    expect(scope).not.toMatch(/luma indemnifies/i)
  })
})

// ── B/C/D. explicit-goal retrieval ───────────────────────────────────────

describe('B/C/D: explicit commercial_use goal + canonical Luma tool identity', () => {
  test('B: explicit commercial_use goal + Luma tool identity retrieves the governed claim', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).toContain(LUMA_ID)
  })

  test('C: the wrong tool (e.g. Runway) does NOT retrieve the Luma claim', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).not.toContain(LUMA_ID)
  })

  test('D: a generic commercial_use goal with NO Luma identity mentioned never retrieves the Luma claim -- no discovered-relevance path exists for Matrix claims', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).not.toContain(LUMA_ID)
  })

  test('a Luma tool identity with NO goal at all produces a Retrieval result but zero interpretations -- BI never fabricates a goal', () => {
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [], [], UNKNOWN_FACTS)
    // Retrieval itself is goal-driven for eligibility of the RESULT, but the
    // Matrix loop adds an eligible claim regardless of goals -- confirms the
    // real safety boundary is BI's own active-confirmed-goal requirement,
    // not Retrieval silently withholding it.
    const interpretations = buildBoundedInterpretations([], out.results, out.diagnostics)
    expect(interpretations).toEqual([])
  })
})

// ── E. Bounded Interpretation ────────────────────────────────────────────

describe('E: Bounded Interpretation preserves the conditional rule without selecting a branch for the project', () => {
  test('directly_relevant, tool-sourced boundary clause, verbatim governed statement, no fabricated dependency gate', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Luma video commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.supporting_claim_ids).toEqual([LUMA_ID])
    expect(interp.unresolved_relevant_claims).toEqual([])
    expect(interp.summary).toContain(
      "Luma AI's current Terms of Service restrict commercial use of Dream Machine output to an active paid subscription plan that specifically permits commercial use.",
    )
  })

  test('BI output never infers the user\'s plan, an active paid subscription, generation timing, ownership, copyrightability, clearance, non-infringement, or indemnification for the project', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Luma video commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const forbidden = [
      /you (are|'re) on (the )?(plus|pro|ultra|free|trial)/i,
      /your (plan|subscription) (permits|allows|includes)/i,
      /your output was (produced|generated) during/i,
      /you own the (output|copyright)/i,
      /your output is copyrightable/i,
      /your output is (commercially |legally )?clear(ed)?/i,
      /non-?infringing/i,
      /luma (does not |doesn't )?indemnif/i,
      /you (are|'re) indemnified/i,
      /commercially cleared/i,
    ]
    for (const pattern of forbidden) {
      expect(interp.summary).not.toMatch(pattern)
    }
  })

  test('boundary clause is source-aware (allToolSourced) -- the same generic mechanism already proven for Runway/Kling/Pika/Midjourney/ElevenLabs, no Luma-specific wording branch', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const lumaOut = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const pikaOut = retrieve(handoff({ tools: [tool('pika')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const lumaInterp = buildBoundedInterpretations([g], lumaOut.results, lumaOut.diagnostics)[0]
    const pikaInterp = buildBoundedInterpretations([g], pikaOut.results, pikaOut.diagnostics)[0]
    // Same status, same summary_blocks shape (single block, no guidance
    // block) -- proves the boundary/composition mechanism is generic across
    // tool-sourced results, not conditioned on which tool.
    expect(lumaInterp.status).toBe(pikaInterp.status)
    expect(lumaInterp.summary_blocks).toHaveLength(pikaInterp.summary_blocks.length)
  })
})

// ── F. generic Composition ───────────────────────────────────────────────

describe('F: generic Composition -- no Luma-specific composer, no strengthened conclusion', () => {
  test('assembleProjectionOutput surfaces the Luma claim through the same generic pipeline, never producing a project-specific clearance statement', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Luma video commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const interpretations = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const projection = assembleProjectionOutput(handoff({ tools: [tool('luma')] }), out.results, interpretations)
    expect(projection.output.knowledge_items.map((k) => k.claim_id)).toContain(LUMA_ID)
    const forbidden = [/you can use your luma (video|output) commercially/i, /your (video|output) is (commercially |legally )?clear(ed)?/i, /commercially cleared/i, /non-?infringing/i]
    for (const pattern of forbidden) {
      expect(projection.output.understood_summary + JSON.stringify(projection.output.goal_interpretations)).not.toMatch(pattern)
    }
  })
})

// ── G. cross-domain / bleed isolation ────────────────────────────────────

describe('G: cross-domain safety -- Luma does not bleed into or from any other tool/provider', () => {
  const OTHER_TOOL_CLAIM_IDS = ['pika', 'midjourney', 'runway-gen3', 'kling-commercial-use-baseline', 'kling-commercial-use-member', 'elevenlabs-commercial-tiering']

  test.each(['pika', 'midjourney', 'runway-gen3', 'kling', 'elevenlabs'])('Luma tool identity alone never retrieves %s\'s claim(s)', (otherTool) => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const otherRow = MATRIX_FIXTURE.find((r) => r.identifier === otherTool)!
    const otherClaimIds = otherRow.claims.map((c) => c.claim_id)
    for (const id of otherClaimIds) {
      expect(out.results.map((r) => r.claim_id)).not.toContain(id)
    }
  })

  test.each(['pika', 'midjourney', 'runway-gen3', 'kling', 'elevenlabs'])('%s\'s own tool identity alone never retrieves the Luma claim', (otherTool) => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool(otherTool)] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).not.toContain(LUMA_ID)
  })

  test('a Luma tool identity never causes provider-scoped stock/music knowledge to surface (no asset provider named)', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')], asset_providers: [] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const ids = out.results.map((r) => r.claim_id)
    expect(ids.every((id) => !id.startsWith('CLAIM-STOCK') && !id.startsWith('CLAIM-MUSIC') && !id.startsWith('CLAIM-POND5') && !id.startsWith('CLAIM-STORYBLOCKS') && !id.startsWith('CLAIM-ADOBESTOCK'))).toBe(true)
  })

  test('every other tool row in MATRIX_FIXTURE is completely unaffected by the Luma addition (full claim_id set unchanged in shape)', () => {
    for (const claimId of OTHER_TOOL_CLAIM_IDS) {
      const found = MATRIX_FIXTURE.some((r) => r.claims.some((c) => c.claim_id === claimId))
      expect(found).toBe(true)
    }
  })
})

// ── H. explicit-goal reachability shape, matching precedent ─────────────

describe('H: Luma reachability shape matches the established explicit-goal Matrix precedent, not Track A discovery', () => {
  test('match_origin is exact_topic (never discovered_topic or related_topic) for the Luma result', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const lumaResult = out.results.find((r) => r.claim_id === LUMA_ID)!
    expect(lumaResult.match_origin).toBe('exact_topic')
    expect(lumaResult.unresolved_project_dependencies).toEqual([])
  })
})

// ── I. LK-89: real extraction pipeline, exact observed production expression ──

function emptySU(): StructuredUnderstanding {
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
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function lumaToolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: "I made a video with Luma AI's Dream Machine.",
    kind: 'tool_mention',
    raw_tool_name: "Luma AI's Dream Machine",
    ...overrides,
  }
}

describe('I: LK-89 real-pipeline reproduction of the exact LK-88 production expression', () => {
  test('the exact observed opening turn now reaches the governed luma claim end-to-end through the real, unmodified extraction pipeline', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I made a video with Luma AI's Dream Machine. Can I use it commercially?" },
      constantExtractor([
        lumaToolCandidate(),
        {
          proposal_id: 'c2',
          turn: 1,
          raw_text: 'Can I use it commercially?',
          kind: 'user_goal',
          goal_confidence_hint: 'confirmed',
          goal_category_hint: 'commercial_use',
          goal_scope_hint: 'informational',
        },
      ]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'luma' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.tools).toEqual([{ identifier: 'luma', access_surface: 'unresolved', plan_tier: 'unknown' }])
    expect(rHandoff.unresolved_aliases).toEqual([])

    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, [], facts)
    expect(out.results.map((r) => r.claim_id)).toContain(LUMA_ID)

    const interpretations = buildBoundedInterpretations(updated.user_goals, out.results, out.diagnostics)
    const interp = interpretations.find((i) => i.supporting_claim_ids.includes(LUMA_ID))
    expect(interp?.status).toBe('directly_relevant')
  })

  test('negative alias safety: the bare word "luma" alone does NOT resolve -- only the exact observed compound expression does (no speculative variant added)', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Luma.' },
      constantExtractor([lumaToolCandidate({ raw_text: 'I used Luma.', raw_tool_name: 'Luma' })]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Luma' })
  })

  test('negative alias safety: "Dream Machine" alone does NOT resolve -- no speculative variant added', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Dream Machine.' },
      constantExtractor([lumaToolCandidate({ raw_text: 'I used Dream Machine.', raw_tool_name: 'Dream Machine' })]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Dream Machine' })
  })

  test('negative alias safety: the new Luma alias does not cause any asset_provider_mention to be created (no cross-registry bleed)', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: "I made a video with Luma AI's Dream Machine." }, constantExtractor([lumaToolCandidate()]))
    expect(updated.asset_provider_mentions).toEqual([])
  })

  test('negative alias safety: another known tool (Kling) is unaffected -- still resolves canonically, never bleeds into Luma', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Kling AI.' },
      constantExtractor([{ proposal_id: 'c1', turn: 1, raw_text: 'I used Kling AI.', kind: 'tool_mention', raw_tool_name: 'Kling AI' }]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
  })

  test('correction semantics: correcting Luma to a different known tool supersedes the Luma ToolMention -- Luma relevance does not remain stale', async () => {
    const g: CandidateObservation = {
      proposal_id: 'g1',
      turn: 1,
      raw_text: 'Can I use it commercially?',
      kind: 'user_goal',
      goal_confidence_hint: 'confirmed',
      goal_category_hint: 'commercial_use',
      goal_scope_hint: 'informational',
    }
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I made a video with Luma AI's Dream Machine. Can I use it commercially?" },
      constantExtractor([lumaToolCandidate(), g]),
    )
    expect(turn1.updated.tool_mentions.filter((m) => m.superseded_by === null)).toHaveLength(1)
    expect(turn1.updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'luma' })

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Sorry, it was actually Kling AI, not Luma.' },
      constantExtractor([
        {
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Sorry, it was actually Kling AI, not Luma.',
          kind: 'tool_mention',
          raw_tool_name: 'Kling AI',
          is_correction: true,
          correction_of_raw_text: "Luma AI's Dream Machine",
        },
      ]),
    )
    const active = turn2.updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
    const supersededLuma = turn2.updated.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'luma')
    expect(supersededLuma?.superseded_by).not.toBeNull()

    // Downstream: only Kling's claim is now retrieved for the commercial_use
    // goal -- Luma's claim does not remain stale-reachable after correction.
    const rHandoff = buildRetrievalHandoff(turn2.updated)
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: turn2.updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, turn2.updated.user_goals, [], facts)
    expect(out.results.map((r) => r.claim_id)).not.toContain(LUMA_ID)
    expect(out.results.map((r) => r.claim_id)).toContain('kling-commercial-use-baseline')
  })
})
