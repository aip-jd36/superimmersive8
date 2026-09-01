/**
 * Suno commercial-use governed knowledge deterministic tests (Trial 6,
 * Living Knowledge onboarding benchmark, LK-95 through LK-99). Exercises the
 * REAL, live MATRIX_FIXTURE `suno` claim end-to-end through retrieve() ->
 * buildBoundedInterpretations() -> generic Composition, mirroring
 * luma-runtime-retrieval.test.ts's own structure. No live model needed --
 * pure functions.
 *
 * Suno is the first identity onboarded after LK-94's Canonicalization
 * Readiness gate. LK-99's own first-attempt readiness check (representative
 * expression "Suno", real `checkCanonicalizationReadiness`) FAILED -- no
 * `KNOWN_TOOLS` extraction alias exists for Suno at this commit, by design
 * (registration does not itself add one; see registry.ts's own doc comment
 * for `suno`). Section I below documents that real, current FAIL state
 * directly through the real extraction pipeline -- it is not a negative
 * regression test for an established alias (there is none yet), it is
 * evidence of the exact gap LK-94's gate exists to catch pre-publication.
 * Sections A-H validate the SEPARATE, already-passing property: governed-
 * knowledge reachability given an already-resolved structured identity,
 * per the LK-93 five-property model.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { runExtractionPipeline, normalizeCandidate } from '@/lib/interview-engine/extraction'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import { checkCanonicalizationReadiness } from '@/lib/crc-engine/canonicalization-readiness'

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

const SUNO_ID = 'suno'
const UNKNOWN_FACTS: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

function sunoRow() {
  const row = MATRIX_FIXTURE.find((r) => r.identifier === 'suno')
  if (!row) throw new Error('suno row missing from MATRIX_FIXTURE')
  return row
}

// ── A. one-claim isolation, real committed fixture ──────────────────────

describe('A: one-claim isolation -- Suno is the only new Matrix row this trial added', () => {
  test('MATRIX_FIXTURE has exactly one suno row, exactly one claim, CRC-Eligible Yes, topic commercial_use, zero applicability requirements', () => {
    const row = sunoRow()
    expect(row.claims).toHaveLength(1)
    expect(row.claims[0].claim_id).toBe(SUNO_ID)
    expect(row.claims[0].crc_eligible).toBe('Yes')
    expect(row.claims[0].topic).toBe('commercial_use')
    expect(row.claims[0].applicability_requirements).toEqual([])
  })

  test('candidate statement matches the LK-99-corrected wording exactly, verbatim -- never LK-98\'s rejected over-strengthened first draft', () => {
    const row = sunoRow()
    expect(row.claims[0].crc_candidate_statement).toBe(
      "Under Suno's Terms of Service revised March 26, 2026, Output generated under the Free or Basic tier is restricted to non-commercial use. For Output generated during a Pro or Premier paid-tier subscription term, Suno states that it assigns its right, title and interest in that Output to the user.",
    )
    // LK-98's rejected draft opened with "Suno's current Terms of Service
    // restrict commercial use of generated Output to the Pro or Premier
    // paid tier" -- an affirmative categorical grant. Confirm that framing
    // is absent.
    expect(row.claims[0].crc_candidate_statement).not.toMatch(/restrict commercial use of generated output to the pro or premier/i)
  })

  test('publication scope explicitly forecloses copyrightability, ownership beyond the stated assignment, non-infringement, third-party-rights clearance, training-data legality, indemnification, and post-cancellation persistence/termination', () => {
    const row = sunoRow()
    const scope = row.claims[0].crc_publication_scope!
    expect(scope).toMatch(/copyrightability/i)
    expect(scope).toMatch(/ownership beyond suno's stated assignment/i)
    expect(scope).toMatch(/non-infringement/i)
    expect(scope).toMatch(/third-party-rights clearance/i)
    expect(scope).toMatch(/training-data legality/i)
    expect(scope).toMatch(/indemnification/i)
    expect(scope).toMatch(/persists or terminates/i)
    // Never a categorical ownership/copyright conclusion.
    expect(scope).not.toMatch(/user owns (the )?copyright/i)
    expect(scope).not.toMatch(/suno owns (the )?copyright/i)
  })
})

// ── B/C/D. explicit-goal retrieval ───────────────────────────────────────

describe('B/C/D: explicit commercial_use goal + canonical Suno tool identity', () => {
  test('B: explicit commercial_use goal + Suno tool identity retrieves the governed claim', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).toContain(SUNO_ID)
  })

  test('C: the wrong tool (e.g. Kling) does NOT retrieve the Suno claim', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('kling')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).not.toContain(SUNO_ID)
  })

  test('D: a generic commercial_use goal with NO Suno identity mentioned never retrieves the Suno claim -- no discovered-relevance path exists for Matrix claims', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).not.toContain(SUNO_ID)
  })

  test('a Suno tool identity with NO goal at all produces a Retrieval result but zero interpretations -- BI never fabricates a goal', () => {
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [], [], UNKNOWN_FACTS)
    const interpretations = buildBoundedInterpretations([], out.results, out.diagnostics)
    expect(interpretations).toEqual([])
  })
})

// ── E. Bounded Interpretation ────────────────────────────────────────────

describe('E: Bounded Interpretation preserves the conditional rule without selecting a branch or strengthening the assignment into a categorical grant', () => {
  test('directly_relevant, tool-sourced boundary clause, verbatim governed statement, no fabricated dependency gate', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Suno song commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    expect(interp.status).toBe('directly_relevant')
    expect(interp.supporting_claim_ids).toEqual([SUNO_ID])
    expect(interp.unresolved_relevant_claims).toEqual([])
    expect(interp.summary).toContain("Under Suno's Terms of Service revised March 26, 2026")
  })

  test("BI output never infers the user's plan, generation timing, categorical copyright ownership, copyrightability, clearance, non-infringement, indemnification, or post-cancellation status for the project", () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Suno song commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const forbidden = [
      /you (are|'re) on (the )?(free|basic|pro|premier)/i,
      /your (plan|subscription) (permits|allows|includes)/i,
      /your output was (produced|generated) during/i,
      /you own the (output|copyright)/i,
      /your output is copyrightable/i,
      /your output is (commercially |legally )?clear(ed)?/i,
      /non-?infringing/i,
      /suno (does not |doesn't )?indemnif/i,
      /you (are|'re) indemnified/i,
      /commercially cleared/i,
      /restrict commercial use of generated output to the pro or premier/i,
      /is the (legal )?mechanism (that|which) (makes|enables) commercial use/i,
      /your (subscription|access) (is still|remains) active/i,
      /your rights (persist|end|terminate)/i,
    ]
    for (const pattern of forbidden) {
      expect(interp.summary).not.toMatch(pattern)
    }
  })

  test('boundary clause is source-aware (allToolSourced) -- the same generic mechanism already proven for Runway/Kling/Pika/Midjourney/ElevenLabs/Luma, no Suno-specific wording branch', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const sunoOut = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const lumaOut = retrieve(handoff({ tools: [tool('luma')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const sunoInterp = buildBoundedInterpretations([g], sunoOut.results, sunoOut.diagnostics)[0]
    const lumaInterp = buildBoundedInterpretations([g], lumaOut.results, lumaOut.diagnostics)[0]
    expect(sunoInterp.status).toBe(lumaInterp.status)
    expect(sunoInterp.summary_blocks).toHaveLength(lumaInterp.summary_blocks.length)
  })
})

// ── F. generic Composition ───────────────────────────────────────────────

describe('F: generic Composition -- no Suno-specific composer, no strengthened conclusion', () => {
  test('assembleProjectionOutput surfaces the Suno claim through the same generic pipeline, never producing a project-specific clearance or ownership statement', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this Suno song commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const interpretations = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const projection = assembleProjectionOutput(handoff({ tools: [tool('suno')] }), out.results, interpretations)
    expect(projection.output.knowledge_items.map((k) => k.claim_id)).toContain(SUNO_ID)
    const forbidden = [
      /you can use your suno (song|output) commercially/i,
      /your (song|output) is (commercially |legally )?clear(ed)?/i,
      /commercially cleared/i,
      /non-?infringing/i,
      /you own the copyright/i,
    ]
    const rendered = projection.output.understood_summary + JSON.stringify(projection.output.goal_interpretations)
    for (const pattern of forbidden) {
      expect(rendered).not.toMatch(pattern)
    }
  })
})

// ── G. cross-domain / bleed isolation ────────────────────────────────────

describe('G: cross-domain safety -- Suno does not bleed into or from any other tool/provider', () => {
  const OTHER_TOOL_CLAIM_IDS = [
    'pika',
    'midjourney',
    'runway-gen3',
    'kling-commercial-use-baseline',
    'kling-commercial-use-member',
    'elevenlabs-commercial-tiering',
    'luma',
  ]

  test.each(['pika', 'midjourney', 'runway-gen3', 'kling', 'elevenlabs', 'luma'])('Suno tool identity alone never retrieves %s\'s claim(s)', (otherTool) => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const otherRow = MATRIX_FIXTURE.find((r) => r.identifier === otherTool)!
    const otherClaimIds = otherRow.claims.map((c) => c.claim_id)
    for (const id of otherClaimIds) {
      expect(out.results.map((r) => r.claim_id)).not.toContain(id)
    }
  })

  test.each(['pika', 'midjourney', 'runway-gen3', 'kling', 'elevenlabs', 'luma'])('%s\'s own tool identity alone never retrieves the Suno claim', (otherTool) => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool(otherTool)] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).not.toContain(SUNO_ID)
  })

  test('a Suno tool identity never causes provider-scoped stock/music knowledge to surface (no asset provider named)', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')], asset_providers: [] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const ids = out.results.map((r) => r.claim_id)
    expect(ids.every((id) => !id.startsWith('CLAIM-STOCK') && !id.startsWith('CLAIM-MUSIC') && !id.startsWith('CLAIM-POND5') && !id.startsWith('CLAIM-STORYBLOCKS') && !id.startsWith('CLAIM-ADOBESTOCK'))).toBe(true)
  })

  test('every other tool row in MATRIX_FIXTURE is completely unaffected by the Suno addition (full claim_id set unchanged in shape)', () => {
    for (const claimId of OTHER_TOOL_CLAIM_IDS) {
      const found = MATRIX_FIXTURE.some((r) => r.claims.some((c) => c.claim_id === claimId))
      expect(found).toBe(true)
    }
  })
})

// ── H. explicit-goal reachability shape, matching precedent ─────────────

describe('H: Suno reachability shape matches the established explicit-goal Matrix precedent, not Track A discovery', () => {
  test('match_origin is exact_topic (never discovered_topic or related_topic) for the Suno result', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    const sunoResult = out.results.find((r) => r.claim_id === SUNO_ID)!
    expect(sunoResult.match_origin).toBe('exact_topic')
    expect(sunoResult.unresolved_project_dependencies).toEqual([])
  })
})

// ── I. LK-99: real extraction pipeline -- the current, real FAIL state ──

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

function sunoToolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'I made a song with Suno.',
    kind: 'tool_mention',
    raw_tool_name: 'Suno',
    ...overrides,
  }
}

describe('I: LK-99 real-pipeline evidence of the current, genuine Canonicalization Readiness FAIL state', () => {
  test('checkCanonicalizationReadiness(suno, "Suno") is false -- the exact real first-attempt result this milestone recorded, reproduced deterministically here', () => {
    expect(checkCanonicalizationReadiness({ kind: 'tool', identifier: 'suno', representativeExpression: 'Suno' })).toBe(false)
  })

  test('normalizeCandidate confirms the precise failing boundary: raw_tool_name "Suno" normalizes to unrecognized (no KNOWN_TOOLS entry exists)', () => {
    const result = normalizeCandidate(sunoToolCandidate())
    expect(result).toEqual({ status: 'unrecognized' })
  })

  test('an ordinary opening turn naming Suno does NOT reach the governed suno claim through the real, unmodified extraction pipeline -- the exact production-shaped failure this gate caught pre-publication instead of in production UAT', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I made a song with Suno. Can I use it commercially?' },
      constantExtractor([
        sunoToolCandidate(),
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
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Suno' })

    const rHandoff = buildRetrievalHandoff(updated)
    expect(rHandoff.tools).toEqual([])
    expect(rHandoff.unresolved_aliases).toEqual(['Suno'])

    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: updated.tool_mentions }
    const out = retrieve(rHandoff, MATRIX_FIXTURE, updated.user_goals, [], facts)
    expect(out.results.map((r) => r.claim_id)).not.toContain(SUNO_ID)
  })

  test('the same governed knowledge IS reachable given an already-resolved structured identity -- confirms the failure is specifically at the raw-text-to-canonical-identity boundary, not downstream', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('suno')] }), MATRIX_FIXTURE, [g], [], UNKNOWN_FACTS)
    expect(out.results.map((r) => r.claim_id)).toContain(SUNO_ID)
  })

  test('another known tool (Kling) is unaffected by Suno\'s absence from KNOWN_TOOLS -- still resolves canonically, no cross-registry interference', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Kling AI.' },
      constantExtractor([{ proposal_id: 'c1', turn: 1, raw_text: 'I used Kling AI.', kind: 'tool_mention', raw_tool_name: 'Kling AI' }]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
  })
})
