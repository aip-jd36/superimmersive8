/**
 * Thin regression tests for the Phase 7 dialogue orchestrator
 * (run-dialogue.ts). Always-run, zero API cost -- the full, human-readable
 * mock dry run (npm run eval:dialogue-mock-dryrun) is the primary Phase 7
 * artifact; this file exists so orchestrator wiring stays proven on every
 * `npm test`, the same regression-insurance role every other phase's thin
 * Jest layer plays over its own real-model harness.
 */

import { runDialogue } from '@/lib/interview-engine/eval/run-dialogue'
import { sequencedExtractor, sequencedGenerator, sequencedDecider } from '@/lib/interview-engine/eval/mock-sequenced'
import { DIALOGUE_SCENARIOS } from '@/lib/interview-engine/eval/dialogue-scenarios'
import { diffScenario } from '@/lib/interview-engine/eval/dialogue-trace-report'

describe('dialogue orchestrator (Phase 7)', () => {
  test('all 9 scenarios are well-formed (unique ids, matching turn/candidate/queue lengths)', () => {
    const ids = DIALOGUE_SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DIALOGUE_SCENARIOS).toHaveLength(9)
    for (const s of DIALOGUE_SCENARIOS) {
      expect(s.turn_candidates).toHaveLength(s.turns.length)
    }
  })

  test('exactly one scenario is the Rule 5 implementation probe, not counted as a normative PRD dialogue', () => {
    const probes = DIALOGUE_SCENARIOS.filter((s) => s.is_normative_probe)
    expect(probes).toHaveLength(1)
    expect(probes[0].id).toBe('rule5_disentangling_probe')
  })

  for (const scenario of DIALOGUE_SCENARIOS) {
    test(`${scenario.id}: mock-stack run matches its own authored expectation`, async () => {
      const deps = {
        extractor: sequencedExtractor(scenario.turn_candidates),
        generator: sequencedGenerator(scenario.generator_queue),
        decider: sequencedDecider(scenario.decider_queue),
      }
      const run = await runDialogue(scenario.initial_su, scenario.turns, deps)
      const diff = diffScenario(scenario, run)
      expect(diff.mismatches).toEqual([])
      expect(diff.passed).toBe(true)
    })
  }

  test('full_opt_out: opt_out_scope is threaded into the SAME turn as the decline, not only assembled after the loop', async () => {
    const scenario = DIALOGUE_SCENARIOS.find((s) => s.id === 'full_opt_out')!
    const deps = {
      extractor: sequencedExtractor(scenario.turn_candidates),
      generator: sequencedGenerator(scenario.generator_queue),
      decider: sequencedDecider(scenario.decider_queue),
    }
    const run = await runDialogue(scenario.initial_su, scenario.turns, deps)
    expect(run.turns).toHaveLength(1)
    expect(run.turns[0].su_after.opt_out_scope).toBe('interview')
    expect(run.turns[0].gate_1.state).toBe('not_applicable_declined')
  })

  test('ambiguous_multi_surface_tool: resolves cleanly in turn 2 (Finding 3 fix), access_surface confirmed via the deterministic disambiguation channel (Finding 1 fix)', async () => {
    // Finding 4 (a same-lineage second follow-up) previously arose naturally
    // here before the Finding 3 wording fix; it is now covered directly by
    // __tests__/interview-engine/signal-lineage.test.ts instead, per JD's
    // 2026-08-08 instruction to add dedicated boundary-cap-lineage tests
    // rather than rely on this dialogue continuing to reproduce it.
    const scenario = DIALOGUE_SCENARIOS.find((s) => s.id === 'ambiguous_multi_surface_tool')!
    const deps = {
      extractor: sequencedExtractor(scenario.turn_candidates),
      generator: sequencedGenerator(scenario.generator_queue),
      decider: sequencedDecider(scenario.decider_queue),
    }
    const run = await runDialogue(scenario.initial_su, scenario.turns, deps)
    expect(run.turns[0].assistant_action).toBe('ASK')
    expect(run.turns[0].asked_question?.target_signal_id).toBe('tm-1')
    expect(run.turns[1].assistant_action).toBe('NONE_PROPOSED')
    const tm2 = run.final_su.tool_mentions.find((m) => m.mention_id === 'tm-2-resolved')
    expect(tm2?.resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })
    expect(tm2?.access_surface).toEqual({ state: 'confirmed', value: 'API' })
  })

  test('rule5_disentangling_probe: first disentangling question allowed, second suppressed by the once-per-interview cap', async () => {
    const scenario = DIALOGUE_SCENARIOS.find((s) => s.id === 'rule5_disentangling_probe')!
    const deps = {
      extractor: sequencedExtractor(scenario.turn_candidates),
      generator: sequencedGenerator(scenario.generator_queue),
      decider: sequencedDecider(scenario.decider_queue),
    }
    const run = await runDialogue(scenario.initial_su, scenario.turns, deps)
    expect(run.turns[0].assistant_action).toBe('ASK')
    expect(run.turns[2].assistant_action).toBe('SUPPRESSED_BY_CONSTRAINT_B')
    expect(run.turns[2].boundary_result_reason_code).toBe('DISENTANGLING_QUESTION_ALREADY_ASKED')
    // Never resolved by guessing: the second ambiguity's tool mention stays an unresolved_alias.
    const tm1 = run.final_su.tool_mentions.find((m) => m.mention_id === 'tm-1')
    expect(tm1?.resolution.kind).toBe('unresolved_alias')
  })
})
