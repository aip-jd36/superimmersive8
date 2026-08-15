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
import type { StructuredUnderstanding } from '@/types/interview-engine'

const EMPTY_PROJECTION_OUTPUT = { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' }

/** Case 8 (required): a tool resolved to a canonical identifier the Matrix has no row for at all. */
const unknownToolSU: StructuredUnderstanding = {
  project_facts: {
    intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
    workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
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
    expect(output.understood_summary).toContain('You said your role on this is Producer.')
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
