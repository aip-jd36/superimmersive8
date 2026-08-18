/**
 * CRC end-to-end pipeline tests (Prototype Beta, CRC End-to-End
 * Integration milestone, Phases 3 & 5). Every case here validates the
 * FINAL ProjectionOutput -- not an intermediate module in isolation, each
 * of which already has its own dedicated test suite. Reuses the existing
 * DIALOGUE_FIXTURES (StructuredUnderstanding snapshots, Interview
 * Engine's own Phase 1 fixtures) wherever a required case has a natural
 * match; two synthetic StructuredUnderstanding objects are added only for
 * states none of the 8 canonical fixtures happen to end in (a bare
 * unresolved alias, and a tool resolved to an identifier the Matrix
 * doesn't cover) -- built in the same hand-authored style as
 * full_phase_1_to_4_trace, the most "production-shaped" of the 8.
 *
 * Deterministic throughout -- no live model, no mock extractor/generator/
 * decider even, since runCRCConversation's own input is already a
 * finished StructuredUnderstanding, not raw conversation turns (Phase 1
 * architecture decision, see run-crc-conversation.ts's own header).
 */

import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

const EMPTY_PROJECTION_OUTPUT = { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' }

/** Case 8 (required): a tool resolved to a canonical identifier the Matrix has no row for at all. */
const unknownToolSU: StructuredUnderstanding = {
  project_facts: {
    intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  },
  tool_mentions: [
    {
      mention_id: 'tm-1',
      resolution: { kind: 'canonical', identifier: 'some-unlisted-tool' },
      access_surface: { state: 'unresolved_no_visibility' },
      plan_tier: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'I used some tool the Matrix has never heard of.',
      superseded_by: null,
    },
  ],
  scoped_observations: [],
  user_goals: [],
  asset_provider_mentions: [],
    current_phase: 2,
  gate_1_state: 'met',
  gate_2_state: 'not_yet_stable',
  completion_reason: null,
  opt_out_scope: null,
}

/** Case 9 (required): a tool mention still unresolved at handoff time -- not superseded, never disambiguated. */
const unresolvedAliasSU: StructuredUnderstanding = {
  project_facts: {
    intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  },
  tool_mentions: [
    {
      mention_id: 'tm-1',
      resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
      access_surface: { state: 'unresolved_no_visibility' },
      plan_tier: { state: 'unknown' },
      confidence: 'unresolved_no_visibility',
      source_turn: 1,
      source_statement: 'I used Nano Banana for this one.',
      superseded_by: null,
    },
  ],
  scoped_observations: [],
  user_goals: [],
  asset_provider_mentions: [],
    current_phase: 2,
  gate_1_state: 'met',
  gate_2_state: 'not_yet_stable',
  completion_reason: null,
  opt_out_scope: null,
}

/** Case 4 (required, "sparse handoff"): exactly one confirmed tool and nothing else -- the smallest non-empty handoff shape. */
const sparseSingleToolSU: StructuredUnderstanding = {
  project_facts: {
    intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  },
  tool_mentions: [
    {
      mention_id: 'tm-1',
      resolution: { kind: 'canonical', identifier: 'kling' },
      access_surface: { state: 'unresolved_no_visibility' },
      plan_tier: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'Kling.',
      superseded_by: null,
    },
  ],
  scoped_observations: [],
  user_goals: [],
  asset_provider_mentions: [],
    current_phase: 1,
  gate_1_state: 'not_met',
  gate_2_state: 'not_yet_stable',
  completion_reason: null,
  opt_out_scope: null,
}

describe('runCRCConversation -- end-to-end, required cases', () => {
  test('1: minimal successful interview (rich_signal) -- full ProjectionOutput populated end to end', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output.opening_line).toBe("Here's what I understood about your workflow.")
    expect(output.understood_summary).toContain('You mentioned using runway-gen3')
    // Rendering-contract fix (CRC production hygiene, 2026-08-16): the
    // role clause is now grammatically shape-agnostic ("Your role on
    // this: X."), not the old predicate-copula form.
    expect(output.understood_summary).toContain('Your role on this: Producer.')
    expect(output.knowledge_items).toHaveLength(1)
    expect(output.knowledge_items[0].claim_id).toBe('runway-gen3')
    expect(output.closing_cta).toContain('SI8 can review it.')
  })

  test('2: multi-tool workflow (mixed_multi_signal) -- both tools named in the summary and both produce knowledge items', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.mixed_multi_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output.understood_summary).toContain('runway-gen3')
    expect(output.understood_summary).toContain('elevenlabs')
    expect(output.knowledge_items.map((i) => i.claim_id).sort()).toEqual(['elevenlabs-commercial-tiering', 'runway-gen3'])
  })

  test('3: compound-row (ElevenLabs) -- the Yes claim surfaces, the No claim (voice-consent) never appears anywhere in the output', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.mixed_multi_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output.knowledge_items.some((i) => i.claim_id === 'elevenlabs-commercial-tiering')).toBe(true)
    expect(output.knowledge_items.some((i) => i.claim_id === 'elevenlabs-voice-consent')).toBe(false)
    expect(JSON.stringify(output)).not.toContain('voice-consent')
  })

  test('4: sparse handoff -- a single confirmed tool and nothing else produces exactly the minimal expected output', () => {
    const { output } = runCRCConversation(sparseSingleToolSU, MATRIX_FIXTURE)
    expect(output.understood_summary).toBe('You mentioned using kling.')
    expect(output.knowledge_items).toHaveLength(1)
    expect(output.opening_line).not.toBe('')
  })

  test('5: gate_1_unmet (no_signal) -- pipeline still runs to completion, never errors, produces a sensible (here: all-empty) output', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.no_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output).toEqual(EMPTY_PROJECTION_OUTPUT)
  })

  test('6: gate_2_unmet (current_vs_historical, gate_2_state: not_yet_stable) -- the orchestrator produces a fully valid output from currently-confirmed facts regardless; gate_2_state is never read anywhere in this pipeline (confirmed by inspection: RetrievalHandoff.certainty_state is derived from gate_1_state only, per handoff.ts\'s own CERTAINTY_STATE_BY_GATE_1 map)', () => {
    expect(DIALOGUE_FIXTURES.current_vs_historical.structured_understanding.gate_2_state).toBe('not_yet_stable')
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.current_vs_historical.structured_understanding, MATRIX_FIXTURE)
    expect(output.understood_summary.length).toBeGreaterThan(0)
    expect(output.opening_line).not.toBe('')
  })

  test('7: opt-out (full_opt_out) -- everything declined collapses to the same all-empty output, never an error, never leaks the decline reason as content', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.full_opt_out.structured_understanding, MATRIX_FIXTURE)
    expect(output).toEqual(EMPTY_PROJECTION_OUTPUT)
  })

  test('8: unknown tool -- a resolved identifier with no Matrix row produces zero knowledge items and a no_matrix_row diagnostic, never an error, never a fabricated item', () => {
    const { output, diagnostics } = runCRCConversation(unknownToolSU, MATRIX_FIXTURE)
    expect(output.knowledge_items).toEqual([])
    expect(diagnostics.retrieval).toEqual([{ identifier: 'some-unlisted-tool', reason: 'no_matrix_row' }])
    expect(output.understood_summary).toContain('some-unlisted-tool')
  })

  test('9: unresolved alias -- never enters matching, surfaces only as its own distinct clause in the summary, never conflated with a resolved tool', () => {
    const { output, diagnostics } = runCRCConversation(unresolvedAliasSU, MATRIX_FIXTURE)
    expect(output.knowledge_items).toEqual([])
    expect(diagnostics.retrieval).toEqual([{ identifier: 'Nano Banana', reason: 'unresolved_alias' }])
    expect(output.understood_summary).toBe('You mentioned "Nano Banana", which I wasn\'t able to match to a specific platform yet.')
  })

  test('10: current + historical workflow (current_vs_historical) -- both scopes present in the summary, never collapsed into one', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.current_vs_historical.structured_understanding, MATRIX_FIXTURE)
    expect(output.understood_summary).toContain('On the current project:')
    expect(output.understood_summary).toContain('From a past project:')
    const currentIdx = output.understood_summary.indexOf('On the current project:')
    const historicalIdx = output.understood_summary.indexOf('From a past project:')
    expect(currentIdx).toBeLessThan(historicalIdx)
  })

  test('11: empty ProjectionOutput (no_signal) -- distinct from the opt-out case: genuinely no information, not a decline', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.no_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output).toEqual(EMPTY_PROJECTION_OUTPUT)
    expect(DIALOGUE_FIXTURES.no_signal.structured_understanding.completion_reason).toBe('gate_1_unmet_exhausted')
    expect(DIALOGUE_FIXTURES.full_opt_out.structured_understanding.completion_reason).toBe('declined')
  })

  test('12: multiple knowledge items (mixed_multi_signal) -- two eligible claims from two different tools, both fully rendered', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.mixed_multi_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output.knowledge_items.length).toBeGreaterThanOrEqual(2)
    for (const item of output.knowledge_items) {
      expect(item.statement.length).toBeGreaterThan(0)
    }
  })
})

describe('runCRCConversation -- traceability (Phase 5)', () => {
  test('trace exposes all three stages, in order, for diagnostics -- and never alters the final ProjectionOutput', () => {
    const { output, trace } = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE)
    expect(trace.retrieval_handoff.tools.map((t) => t.identifier)).toEqual(['runway-gen3'])
    expect(trace.retrieval_results).toHaveLength(1)
    expect(trace.retrieval_results[0].claim_id).toBe('runway-gen3')
    // Referentially identical, not a copy -- see the CRCPipelineTrace docstring.
    expect(trace.projection_output).toBe(output)
  })

  test('trace on the all-empty case still reports the real (empty) handoff and empty results -- diagnostics never fabricate content the pipeline did not actually produce', () => {
    const { trace } = runCRCConversation(DIALOGUE_FIXTURES.no_signal.structured_understanding, MATRIX_FIXTURE)
    expect(trace.retrieval_handoff.tools).toEqual([])
    expect(trace.retrieval_results).toEqual([])
    expect(trace.projection_output).toEqual(EMPTY_PROJECTION_OUTPUT)
  })

  test('all 8 canonical DIALOGUE_FIXTURES run through the full pipeline without error, producing a valid ProjectionOutput shape every time', () => {
    for (const fixture of Object.values(DIALOGUE_FIXTURES)) {
      const { output } = runCRCConversation(fixture.structured_understanding, MATRIX_FIXTURE)
      expect(typeof output.opening_line).toBe('string')
      expect(typeof output.understood_summary).toBe('string')
      expect(Array.isArray(output.knowledge_items)).toBe(true)
      expect(typeof output.closing_cta).toBe('string')
    }
  })
})

describe('runCRCConversation -- negative assertions', () => {
  test('no Publication Scope text ever leaks into the final ProjectionOutput across any fixture', () => {
    for (const fixture of Object.values(DIALOGUE_FIXTURES)) {
      const { output } = runCRCConversation(fixture.structured_understanding, MATRIX_FIXTURE)
      // Publication Scope text always contains this exact governance phrase; Candidate Statement text never does.
      expect(JSON.stringify(output)).not.toContain('does not extend to')
    }
  })

  test('ProjectionOutput never contains a "topics that often come up" field -- structurally absent, not just empty', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE)
    expect(Object.keys(output).sort()).toEqual(['closing_cta', 'goal_interpretations', 'knowledge_items', 'opening_line', 'understood_summary'])
  })

  test('a goal with category "unknown" (Milestone 2 default, e.g. a real historical Milestone-1-era goal) has zero effect on final ProjectionOutput beyond its own goal_interpretations entry -- byte-identical output otherwise whether populated or empty', () => {
    const goal = {
      goal_id: 'g-1',
      state: 'confirmed' as const,
      raw_text: 'Can I use this commercially and do I own the copyright?',
      category: 'unknown' as const,
      scope: 'informational' as const,
      superseded_by: null,
      source_turn: 1,
      source_statement: 'placeholder',
    }
    for (const fixture of Object.values(DIALOGUE_FIXTURES)) {
      const withoutGoals = runCRCConversation({ ...fixture.structured_understanding, user_goals: [] }, MATRIX_FIXTURE)
      const withGoals = runCRCConversation({ ...fixture.structured_understanding, user_goals: [goal] }, MATRIX_FIXTURE)
      // understood_summary and knowledge_items are derived purely from facts/tools -- goal-independent, always byte-identical.
      expect(withGoals.output.understood_summary).toEqual(withoutGoals.output.understood_summary)
      expect(withGoals.output.knowledge_items).toEqual(withoutGoals.output.knowledge_items)
      // opening_line/closing_cta are NOT asserted identical here: for a fixture with zero other facts/knowledge (e.g. no_signal, full_opt_out), a stated goal is now itself substantive enough to escape the all-empty branch (2026-08-15 fully-empty extension) -- so these two fields legitimately flip from '' to the fixed copy purely because a goal exists. That is the intended new behavior, covered directly by assemble-projection-output.test.ts's own "substantive enough to escape the fully-empty branch" case.
      // The goal itself DOES surface -- Milestone 2's whole point -- but only in its own dedicated field, and only as its own verbatim words plus a fixed template, never leaking into or altering understood_summary/knowledge_items.
      expect(withGoals.output.goal_interpretations).toHaveLength(1)
      expect(JSON.stringify(withGoals.output.goal_interpretations[0])).toContain('Can I use this commercially')
      expect(JSON.stringify({ understood_summary: withGoals.output.understood_summary, knowledge_items: withGoals.output.knowledge_items })).not.toContain('Can I use this commercially')
    }
  })
})

describe('runCRCConversation -- Topic Retrieval end-to-end (CRC Living Knowledge Phase 1, 2026-08-16)', () => {
  test('a topic claim flows all the way through Retrieval -> M2 -> goal_interpretations, exactly like a tool claim does', () => {
    const goal: UserGoal = {
      goal_id: 'g-1',
      state: 'confirmed',
      raw_text: 'Do I own the copyright?',
      category: 'copyright_ownership',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Do I own the copyright?',
    }
    const topicClaim: TopicClaim = {
      claim_id: 'CLAIM-COPY-TEST-v1',
      topic: 'copyright_ownership',
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Test scope.',
      crc_candidate_statement: 'Test candidate statement for end-to-end proof.',
      applicability_requirements: [],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
    }
    const su: StructuredUnderstanding = { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [goal] }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, [topicClaim])

    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].goal_text).toBe('Do I own the copyright?')
    expect(output.goal_interpretations[0].summary).toContain('Test candidate statement for end-to-end proof.')
  })

  test('omitting topicClaims entirely (pre-Phase-1 call shape) still works -- backward-compatible default', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output).toBeDefined()
  })
})

describe('runCRCConversation -- jurisdiction/tool-plan-tier applicability-fact threading (Living Knowledge governance review, 2026-08-16)', () => {
  // Bug fix under test: runCRCConversation() previously called retrieve()
  // with only 4 arguments, silently defaulting applicabilityFacts to
  // {jurisdiction: unknown, toolMentions: []} regardless of what the user
  // actually confirmed. Every test below goes through the real
  // runCRCConversation() entry point (not a direct retrieve() call, which
  // would not have caught this bug) to prove the fix actually reaches the
  // real orchestrator every live call site uses.

  function usGatedClaim(): TopicClaim {
    return {
      claim_id: 'CLAIM-JURIS-US-v1',
      topic: 'copyrightability',
      claim_character: 'established',
      jurisdiction: 'United States',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'US scope.',
      crc_candidate_statement: 'US-specific governed statement.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
    }
  }

  function taiwanGatedClaim(): TopicClaim {
    return {
      claim_id: 'CLAIM-JURIS-TW-v1',
      topic: 'copyrightability',
      claim_character: 'established',
      jurisdiction: 'Taiwan',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Taiwan scope.',
      crc_candidate_statement: 'Taiwan-specific governed statement.',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'Taiwan' }],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
    }
  }

  function copyrightabilityGoal(): UserGoal {
    return {
      goal_id: 'g-1',
      state: 'confirmed',
      raw_text: 'Is this copyrightable?',
      category: 'copyrightability',
      scope: 'informational',
      superseded_by: null,
      source_turn: 1,
      source_statement: 'Is this copyrightable?',
    }
  }

  function suWithJurisdiction(state: 'confirmed' | 'unknown', value?: string): StructuredUnderstanding {
    return {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
      user_goals: [copyrightabilityGoal()],
      project_facts: {
        ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
        jurisdiction: state === 'confirmed'
          ? { attestation: { state: 'confirmed', value: value! }, source_turn: 1, source_statement: value! }
          : { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    }
  }

  test('confirmed US jurisdiction reaches Retrieval as US -- matches a US-gated claim, directly_relevant, content present', () => {
    const { output } = runCRCConversation(suWithJurisdiction('confirmed', 'United States'), MATRIX_FIXTURE, [usGatedClaim()])
    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).toContain('US-specific governed statement.')
  })

  test('confirmed Taiwan jurisdiction reaches Retrieval as Taiwan, not as unknown or as US -- matches its OWN Taiwan-gated claim, not the US-gated one', () => {
    const { output } = runCRCConversation(suWithJurisdiction('confirmed', 'Taiwan'), MATRIX_FIXTURE, [usGatedClaim(), taiwanGatedClaim()])
    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).toContain('Taiwan-specific governed statement.')
    expect(output.goal_interpretations[0].summary).not.toContain('US-specific governed statement.')
  })

  test('confirmed Taiwan jurisdiction against a US-only-gated claim correctly does NOT match (proves Taiwan is threaded as its own real value, not silently coerced to "unknown" which would ALSO fail this gate for the same reason -- distinguished from the bug by the two tests above actually matching their OWN jurisdiction)', () => {
    const { output } = runCRCConversation(suWithJurisdiction('confirmed', 'Taiwan'), MATRIX_FIXTURE, [usGatedClaim()])
    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).not.toContain('US-specific governed statement.')
  })

  test('unknown jurisdiction reaches Retrieval as unknown -- does not accidentally match any jurisdiction-gated claim', () => {
    const { output } = runCRCConversation(suWithJurisdiction('unknown'), MATRIX_FIXTURE, [usGatedClaim(), taiwanGatedClaim()])
    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).not.toContain('US-specific governed statement.')
    expect(output.goal_interpretations[0].summary).not.toContain('Taiwan-specific governed statement.')
  })

  test('tool plan-tier facts also now reach applicability correctly (the same bug also always defaulted toolMentions to [])', () => {
    const tierGatedClaim: TopicClaim = {
      claim_id: 'CLAIM-TIER-v1',
      topic: 'commercial_use',
      claim_character: 'established',
      jurisdiction: 'Global',
      lifecycle: 'Adopted',
      crc_eligible: 'Yes',
      crc_publication_scope: 'Tier scope.',
      crc_candidate_statement: 'Tier-gated governed statement.',
      applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'runway-gen3', operator: 'equals', value: 'paid' }],
      unresolved_project_dependencies: [],
      provider_scope: null,
      last_verified: '2026-08-16',
      superseded_by: null,
    }
    const goal: UserGoal = {
      goal_id: 'g-1',
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
      user_goals: [goal],
      tool_mentions: [
        {
          mention_id: 'm-1',
          resolution: { kind: 'canonical', identifier: 'runway-gen3' },
          access_surface: { state: 'unknown' },
          plan_tier: { state: 'confirmed', value: 'paid' },
          confidence: 'confirmed',
          source_turn: 1,
          source_statement: 'We have the paid Runway plan.',
          superseded_by: null,
        },
      ],
    }
    const { output } = runCRCConversation(su, MATRIX_FIXTURE, [tierGatedClaim])
    expect(output.goal_interpretations.some((i) => i.summary.includes('Tier-gated governed statement.'))).toBe(true)
  })

  test('no active Topic claims supplied -- existing CRC behavior (tool-only retrieval) is completely unchanged by the fix', () => {
    const { output } = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE, [])
    const beforeFixEquivalent = runCRCConversation(DIALOGUE_FIXTURES.rich_signal.structured_understanding, MATRIX_FIXTURE)
    expect(output).toEqual(beforeFixEquivalent.output)
  })

  test('a historical StructuredUnderstanding with jurisdiction defaulted via deserializeStructuredUnderstanding (backward compatibility) does not crash and behaves as unknown', () => {
    const su = suWithJurisdiction('unknown')
    expect(() => runCRCConversation(su, MATRIX_FIXTURE, [usGatedClaim()])).not.toThrow()
  })
})

describe('third_party_source_rights + AssetProviderMention full pipeline (Living Knowledge — Third-Party Source Rights, M1+M2, 2026-08-18)', () => {
  const sourceRightsGoal: UserGoal = {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Can I use this Getty image in an ad?',
    category: 'third_party_source_rights',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Can I use this Getty image in an ad?',
  }

  const suWithGettyGoal: StructuredUnderstanding = {
    ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
    user_goals: [sourceRightsGoal],
    asset_provider_mentions: [
      { mention_id: 'ap-1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'Can I use this Getty image in an ad?', superseded_by: null },
    ],
  }

  test('the full pipeline (extraction-independent, from an already-built StructuredUnderstanding) renders the recognized provider in understood_summary and an outside_current_coverage interpretation for the goal -- no stock claim is reachable, no throw, no dead end', () => {
    const { output } = runCRCConversation(suWithGettyGoal, MATRIX_FIXTURE, [])
    expect(output.understood_summary).toContain('Getty Images as a source provider')
    expect(output.goal_interpretations).toHaveLength(1)
    expect(output.goal_interpretations[0].summary).not.toMatch(/safe|compliant|approved|cleared/i)
  })

  // UPDATED 2026-08-18: CLAIM-STOCK-EDITORIAL-001-v1 AND CLAIM-STOCK-
  // EDITORIAL-002-v1 (both generic claims) are now real crc_eligible: 'Yes'
  // following Formal CRC-Publication Review #1 (recommendation A) and
  // Review #2 (recommendation B -- bounded CRC copy adjustment) + PM
  // approval (governance-reviews/CPR_001.../CPR_002...). Both legitimately
  // surface now. -001's own generic text never names any provider; -002's
  // own approved bounded text DOES now legitimately name "Getty, iStock,
  // or Shutterstock" (as confirmed providers) and "Adobe Stock" (as
  // unconfirmed) -- that is the authorized copy adjustment, not a leak.
  // UPDATED AGAIN 2026-08-18, following CRC-Publication Review #3 + PM
  // approval: CLAIM-STOCK-GETTY-EDITORIAL-001-v1 is now ALSO real
  // crc_eligible: 'Yes' -- the first provider-specific claim to go live.
  // "Rights and Clearance" and "gambling/betting/gaming" are now Getty's
  // own live, legitimate governed text for a Getty-named conversation, not
  // a leak. iStock/Shutterstock remain Pending and provider-scope-excluded
  // regardless -- this test checks for their own still-Pending,
  // iStock/Shutterstock-EXCLUSIVE mechanism phrasing instead ("editorial
  // use only" is iStock-exclusive; "monetize, sell, promote" is
  // Shutterstock-exclusive).
  test('passing TOPIC_CLAIMS_FIXTURE (the real, current fixture) now surfaces generic claims -001/-002 AND the Getty-specific claim (all real CRC-publication decisions, 2026-08-18) -- iStock/Shutterstock-specific claims remain unreachable, still Pending', () => {
    const { output } = runCRCConversation(suWithGettyGoal, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    expect(output.goal_interpretations[0].summary).toContain('Editorial')
    expect(output.goal_interpretations[0].summary).toContain('Adobe Stock') // -002's own approved evidence caveat
    expect(output.goal_interpretations[0].summary).toContain('Rights and Clearance') // Getty's own live mechanism content
    expect(output.goal_interpretations[0].summary).toContain('gambling/betting/gaming') // Getty's own live enumerated list
    expect(output.goal_interpretations[0].summary).not.toContain('editorial use only') // iStock-exclusive phrasing, still Pending
    expect(output.goal_interpretations[0].summary).not.toContain('monetize, sell, promote') // Shutterstock-exclusive phrasing, still Pending
  })

  test('an AssetProviderMention with no accompanying goal (Path B) produces zero goal_interpretations and a provider-only understood_summary clause', () => {
    const suProviderOnly: StructuredUnderstanding = {
      ...DIALOGUE_FIXTURES.rich_signal.structured_understanding,
      user_goals: [],
      asset_provider_mentions: suWithGettyGoal.asset_provider_mentions,
    }
    const { output } = runCRCConversation(suProviderOnly, MATRIX_FIXTURE, [])
    expect(output.goal_interpretations).toEqual([])
    expect(output.understood_summary).toContain('Getty Images as a source provider')
  })
})
