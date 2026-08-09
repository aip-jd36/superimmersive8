/**
 * Nine Phase 7 scenarios (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 7): the six
 * normative PRD dialogues, two implementation fixtures, and one targeted
 * Rule 5 probe (JD decision, 2026-08-08). Turn text and target end-states are
 * mined directly from fixtures.ts's own source_turn/source_statement fields
 * where possible -- those fields exist on every fact specifically so a later
 * phase could reconstruct the conversation that produced them (fixtures.ts's
 * own header comment: "not the full dialogue-turn conversion (that's the
 * Phase 6b/7 fixture work)").
 *
 * Phase and decline scope are SCRIPT-SUPPLIED on every DialogueTurnScript
 * (JD Decision 1, 2026-08-08) -- see run-dialogue.ts's module header.
 *
 * Each scenario also carries the exact candidate/proposal/decision queues a
 * mock-stack dry run needs (sequencedExtractor/sequencedGenerator/
 * sequencedDecider, mock-sequenced.ts) to deterministically reproduce this
 * file's own `expected` block. This is not circular: the mocks only supply
 * the three genuinely model-dependent decision points (what candidates does
 * a turn contain, what question would be proposed, would Constraint A ask
 * it) -- every other step (normalizeCandidate, attestCandidate, mutations,
 * evaluateGate1/2, deriveEligibleSignals, validateCandidateReference,
 * evaluateBoundary, buildRetrievalHandoff) is real, unmocked deterministic
 * code. The dry run genuinely tests whether those seven real modules
 * integrate correctly; it does not (and cannot) test whether the scripted
 * answers are what a live model would actually produce -- that is exactly
 * what the later live-model battery is for.
 *
 * ── Findings made while authoring this file (all before any code ran,  ──
 * ── except the ones verified by direct execution, noted below) ─────────
 *
 * FINDING 1 -- FIXED (2026-08-08, JD instruction item 1): CandidateObservation
 * originally had no field for a ToolMention's access_surface/plan_tier, and
 * attestCandidate's tool_mention branch unconditionally hardcoded both to
 * `{ state: 'unknown' }`. Closed via two channels, both deterministic, never
 * inferred from weak context: (1) explicit access_surface_confidence_hint/
 * value_hint and plan_tier_confidence_hint/value_hint fields on
 * CandidateObservation, populated only when the user directly stated the
 * value in that turn; (2) normalizeCandidate's own disambiguation match now
 * also returns the surface it deterministically implies (extended
 * NormalizationResult/AmbiguousToolEntry), read by attestCandidate as a
 * fallback when the candidate itself carries no direct-statement hint. See
 * extraction.ts's resolveAttestedToolField for the exact priority order.
 * Scenarios below now populate these hints wherever the scripted turn text
 * directly states a surface/tier (rich_signal, mixed_multi_signal,
 * current_vs_historical, full_phase_1_to_4_trace via channel 1;
 * ambiguous_multi_surface_tool via channel 2, the disambiguation match
 * itself) -- and deliberately do NOT for a bare mention like ambiguous_
 * uncertain's "We used Kling," matching JD's own example that tier must stay
 * unknown there.
 *
 * FINDING 2 (deterministic self-consistency check, gates.ts vs fixtures.ts,
 * recorded in the roadmap Phase 7 section): current_vs_historical and
 * ambiguous_uncertain both declare gate_1_state: 'met' while their own
 * intended_use is 'unknown' -- evaluateGate1 actually computes 'not_met' /
 * INTENDED_USE_MISSING for both. fixtures.ts predates gates.ts and was never
 * checked against it. This file's expected traces for those two scenarios
 * use the real evaluator's output, not the stale stored field.
 *
 * FINDING 3 -- FIXED (2026-08-08, JD instruction item 2): ambiguous_multi_
 * surface_tool's original turn-2 wording, reused verbatim from fixtures.ts's
 * own "successful disambiguation" source_statement, was verified by direct
 * execution (see chat record) to NOT actually disambiguate against the real
 * normalizeCandidate -- the negation "it's not the app on my phone" still
 * matched the consumer-app pattern (no negation awareness), so both
 * disambiguation rules fired and the tool stayed known_ambiguous. Per
 * explicit instruction, the NORMALIZER was not touched (a bad test sentence
 * is not a normalizer defect) -- only this fixture's turn-2 text was
 * rewritten to unambiguously state the API surface with no negation-driven
 * language, re-verified by direct execution to resolve cleanly. The
 * now-unnecessary third turn (previously needed to eventually reach
 * disambiguation via cleaner phrasing) was removed; the scenario is back to
 * 2 turns, matching the original fixture's own turn count.
 *
 * FINDING 4 -- FIXED (2026-08-08, JD instruction item 3): a second
 * follow_up_on_signal about what is conceptually the same ongoing
 * ambiguity, after a supersession changed its signal_id, was previously
 * allowed by evaluateBoundary because its per-signal cap is keyed by
 * whichever id currently represents the thing being asked about. Fixed via
 * signal-lineage.ts's resolveLineageRoot, called by the orchestrator
 * (run-dialogue.ts) to resolve a candidate's signal_id to its lineage root
 * BEFORE constructing the object passed to evaluateBoundary -- boundaries.ts
 * itself is completely unmodified; see signal-lineage.ts for the full
 * rationale and __tests__/interview-engine/signal-lineage.test.ts for the
 * 5 required cases. This fixture's own turn-2 rewrite (Finding 3) means the
 * ambiguity now resolves in a single exchange, so this scenario no longer
 * naturally exercises a same-lineage second follow-up -- that behavior is
 * now covered directly and more precisely by the dedicated lineage tests,
 * which was JD's own instruction (explicit test cases, not merely a
 * live-battery observation), rather than reworked back into this dialogue.
 */

import type { CandidateObservation } from '../extraction'
import type { CandidateQuestionProposal } from '../candidate-question'
import type { ConstraintADecision } from '../decision'
import type { DialogueTurnScript } from './run-dialogue'
import { emptyStructuredUnderstanding } from './empty-structured-understanding'
import type { RetrievalHandoffTool, StructuredUnderstanding } from '@/types/interview-engine'

export interface ScenarioExpected {
  assistant_actions: string[]
  final_active_observation_ids: string[]
  final_active_tool_mention_ids: string[]
  final_gate_1_state: StructuredUnderstanding['gate_1_state']
  final_gate_2_state: StructuredUnderstanding['gate_2_state']
  final_completion_reason: StructuredUnderstanding['completion_reason']
  /** Verifies Finding 1's fix explicitly (JD instruction item 5) -- not just eyeballed from the raw handoff JSON. */
  final_handoff_tools: RetrievalHandoffTool[]
  notes: string
}

export interface DialogueScenario {
  id: string
  is_normative_probe: boolean
  description: string
  initial_su: StructuredUnderstanding
  turns: DialogueTurnScript[]
  turn_candidates: CandidateObservation[][]
  generator_queue: (CandidateQuestionProposal | null)[]
  decider_queue: ConstraintADecision[]
  expected: ScenarioExpected
}

const tool = (over: Partial<CandidateObservation> & Pick<CandidateObservation, 'proposal_id' | 'turn' | 'raw_text' | 'raw_tool_name'>): CandidateObservation => ({
  kind: 'tool_mention',
  ...over,
})

const obs = (
  over: Partial<CandidateObservation> & Pick<CandidateObservation, 'proposal_id' | 'turn' | 'raw_text' | 'observation_confidence_hint'>,
): CandidateObservation => ({ kind: 'scoped_observation', ...over })

const fact = (
  over: Partial<CandidateObservation> &
    Pick<CandidateObservation, 'proposal_id' | 'turn' | 'raw_text' | 'raw_fact_field' | 'fact_confidence_hint'>,
): CandidateObservation => ({ kind: 'project_fact', ...over })

// ── 1. rich_signal ───────────────────────────────────────────────────────────

const richSignal: DialogueScenario = {
  id: 'rich_signal',
  is_normative_probe: false,
  description: 'User volunteers full project facts in one bundled turn; a trailing no-op turn establishes Gate 2 stability.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'We shot the whole thing in Runway Gen-3, team API plan. It’s for a paid social campaign, a 30-second cutdown. I’m the producer on this one.' },
    { turn: 2, phase: 2, user_text: 'That’s about it, that’s the whole project.' },
  ],
  turn_candidates: [
    [
      tool({
        proposal_id: 'tm-1', turn: 1, raw_text: 'We shot the whole thing in Runway Gen-3, team API plan.', raw_tool_name: 'Runway Gen-3',
        // Channel 1 (Finding 1 fix): "team API plan" is a direct statement of both surface and tier.
        access_surface_confidence_hint: 'confirmed', access_surface_value_hint: 'API',
        plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'Team',
      }),
      obs({ proposal_id: 'so-1', turn: 1, raw_text: 'Generation done entirely in Runway, no other tools involved.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T1' }),
      fact({ proposal_id: 'pf-1a', turn: 1, raw_text: 'It’s for a paid social campaign, a 30-second cutdown.', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'Paid social ad campaign, 30s cutdown' }),
      fact({ proposal_id: 'pf-1b', turn: 1, raw_text: 'I’m the producer on this one.', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Producer' }),
    ],
    [],
  ],
  generator_queue: [null, null],
  decider_queue: [],
  expected: {
    assistant_actions: ['NONE_PROPOSED', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1'],
    final_active_tool_mention_ids: ['t1-tm-1'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'stable',
    final_completion_reason: 'gate_1_gate_2_met',
    final_handoff_tools: [{ identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' }],
    notes: 'tm-1 resolves to runway-gen3 (canonical). access_surface/plan_tier now confirmed ‘API’/’Team’ via the Finding 1 fix (channel 1: direct-statement hint), matching the original fixture’s declared values.',
  },
}

// ── 2. no_signal ─────────────────────────────────────────────────────────────

const noSignal: DialogueScenario = {
  id: 'no_signal',
  is_normative_probe: false,
  description: 'CRC asks for intended use; user gives an unresponsive answer twice; natural flow exhausts without looping back to force it.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: "I'm not really sure, I'd have to check." },
    { turn: 2, phase: 2, user_text: "I'm not really sure, I'd have to check." },
  ],
  turn_candidates: [
    [obs({ proposal_id: 'so-1a', turn: 1, raw_text: "I'm not really sure, I'd have to check.", observation_confidence_hint: 'unknown', low_confidence: true })],
    [obs({ proposal_id: 'so-1', turn: 2, raw_text: 'User gave only "not sure" / "I\'d have to check" across two follow-ups.', observation_confidence_hint: 'unknown', scope: 'current_project' })],
  ],
  generator_queue: [
    { question_text: "What's this video going to be used for?", question_kind: 'other', target_signal_id: 'project:intended_use', phase: 2 },
    null,
  ],
  decider_queue: [{ should_ask: true, reason_code: 'MISSING_INTENDED_USE', rationale: 'Intended use has never been established.' }],
  expected: {
    assistant_actions: ['ASK', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1'],
    final_active_tool_mention_ids: [],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
    final_handoff_tools: [],
    notes: 'Turn 1’s low_confidence candidate (so-1a) is deferred by attestCandidate and never applied -- only turn 2’s explicit unknown-confidence observation (so-1) is actually recorded. Matches original fixture’s single so-1.',
  },
}

// ── 3. current_vs_historical ────────────────────────────────────────────────

const currentVsHistorical: DialogueScenario = {
  id: 'current_vs_historical',
  is_normative_probe: false,
  description: 'Same topic (review process) answered once for the current project and once for a past one in a single turn; must stay tagged distinctly. intended_use deliberately never established -- see Finding 2.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: "I'm the editor on it. This one was Kling, personal plan." },
    { turn: 2, phase: 3, user_text: 'No, nobody reviewed this one. Different from a project we did last year — that one our legal team checked.' },
  ],
  turn_candidates: [
    [
      fact({ proposal_id: 'pf-1', turn: 1, raw_text: "I'm the editor on it.", raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Editor' }),
      // Channel 1: "personal plan" directly states tier; no surface stated.
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'This one was Kling, personal plan.', raw_tool_name: 'Kling', plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'Personal' }),
    ],
    [
      obs({ proposal_id: 'so-1', turn: 2, raw_text: 'No one reviewed this project before delivery.', observation_confidence_hint: 'confirmed_absent', scope: 'current_project', workflow_stage: 'T2' }),
      obs({ proposal_id: 'so-2', turn: 2, raw_text: 'A past project did go through internal legal review before delivery.', observation_confidence_hint: 'confirmed', scope: 'historical_project', workflow_stage: 'T2' }),
    ],
  ],
  generator_queue: [
    { question_text: "What's this video for?", question_kind: 'other', target_signal_id: 'project:intended_use', phase: 2 },
    null,
  ],
  decider_queue: [{ should_ask: true, reason_code: 'MISSING_INTENDED_USE', rationale: 'Intended use has never been established.' }],
  expected: {
    assistant_actions: ['ASK', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1', 'so-2'],
    final_active_tool_mention_ids: ['t1-tm-1'],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
    final_handoff_tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'Personal' }],
    notes: 'Finding 2: gate_1_state corrected to not_met/INTENDED_USE_MISSING (original fixture stored ‘met’ while intended_use was unknown -- a Phase1/Phase3 cross-inconsistency, not reproduced here). so-1/so-2 correctly stay separately scoped, never merged. plan_tier now confirmed ‘Personal’ via Finding 1’s fix; access_surface stays unresolved since no surface was ever stated.',
  },
}

// ── 4. ambiguous_uncertain ──────────────────────────────────────────────────

const ambiguousUncertain: DialogueScenario = {
  id: 'ambiguous_uncertain',
  is_normative_probe: false,
  description: 'Contrasts unresolved_no_visibility ("I can’t see that") against genuine unknown ("nobody’s decided") within the same conversation.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'I did the motion work on this. We used Kling.' },
    { turn: 2, phase: 2, user_text: "Honestly I don't have access to the billing page, someone else manages that." },
    { turn: 3, phase: 2, user_text: "Nobody's decided yet where this is actually going to run." },
  ],
  turn_candidates: [
    [
      fact({ proposal_id: 'pf-1', turn: 1, raw_text: 'I did the motion work on this.', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Motion designer' }),
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'We used Kling.', raw_tool_name: 'Kling' }),
    ],
    [obs({ proposal_id: 'so-1', turn: 2, raw_text: 'Account is shared with a producer; this user cannot confirm which plan tier is active.', observation_confidence_hint: 'unresolved_no_visibility', scope: 'current_project', workflow_stage: 'T1' })],
    [
      obs({ proposal_id: 'so-2', turn: 3, raw_text: 'Final commercial use of the piece has not been decided by anyone yet.', observation_confidence_hint: 'unknown', scope: 'current_project' }),
      fact({ proposal_id: 'pf-3', turn: 3, raw_text: "Nobody's decided yet where this is actually going to run.", raw_fact_field: 'intended_use', fact_confidence_hint: 'unknown' }),
    ],
  ],
  generator_queue: [
    { question_text: "What's this video for?", question_kind: 'other', target_signal_id: 'project:intended_use', phase: 2 },
    { question_text: 'Is that something a colleague on your team would know?', question_kind: 'uncertainty_clarification', target_signal_id: 'so-1', phase: 2 },
    null,
  ],
  decider_queue: [
    { should_ask: true, reason_code: 'MISSING_INTENDED_USE', rationale: 'Intended use has never been established.' },
    { should_ask: true, reason_code: 'VISIBILITY_GAP_CLARIFIABLE', rationale: 'A plausible answer would establish whether anyone else has visibility.' },
  ],
  expected: {
    assistant_actions: ['ASK', 'ASK', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1', 'so-2'],
    final_active_tool_mention_ids: ['t1-tm-1'],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
    final_handoff_tools: [{ identifier: 'kling', access_surface: 'unresolved', plan_tier: 'unknown' }],
    notes: 'Finding 2 again (same intended_use-unknown/gate_1 correction as current_vs_historical). "We used Kling" is a bare mention -- no hint set on tm-1, so plan_tier correctly stays ‘unknown’ post-Finding-1-fix, matching JD’s own bare-Kling example exactly (deliberately NOT the original fixture’s more specific ‘unresolved_no_visibility’, since nothing in this turn directly states a tier at all -- that finer distinction was never something Finding 1’s fix was meant to produce).',
  },
}

// ── 5. full_opt_out ──────────────────────────────────────────────────────────

const fullOptOut: DialogueScenario = {
  id: 'full_opt_out',
  is_normative_probe: false,
  description: 'User declines to continue the interview entirely on the first turn.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [{ turn: 1, phase: 1, user_text: "I'd rather not go through this right now, can we stop?", decline: { scope: 'interview' } }],
  turn_candidates: [
    [
      fact({ proposal_id: 'pf-1a', turn: 1, raw_text: "I'd rather not go through this right now, can we stop?", raw_fact_field: 'intended_use', fact_confidence_hint: 'declined' }),
      fact({ proposal_id: 'pf-1b', turn: 1, raw_text: "I'd rather not go through this right now, can we stop?", raw_fact_field: 'workflow_role', fact_confidence_hint: 'declined' }),
      obs({ proposal_id: 'so-1', turn: 1, raw_text: 'User asked to stop the interview and not be asked further questions.', observation_confidence_hint: 'declined', scope: 'current_project' }),
    ],
  ],
  generator_queue: [null],
  decider_queue: [],
  expected: {
    assistant_actions: ['INTERVIEW_ENDED_BY_DECLINE'],
    final_active_observation_ids: ['so-1'],
    final_active_tool_mention_ids: [],
    final_gate_1_state: 'not_applicable_declined',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'declined',
    final_handoff_tools: [],
    notes: 'Requires the opt_out_scope threading fix made to run-dialogue.ts before this scenario was authored -- see the orchestrator’s module-level comment. Without it, evaluateGate1’s decline branch could never fire mid-run.',
  },
}

// ── 6. mixed_multi_signal ────────────────────────────────────────────────────

const mixedMultiSignal: DialogueScenario = {
  id: 'mixed_multi_signal',
  is_normative_probe: false,
  description: 'One bundled turn yields multiple distinct scoped observations and tool mentions, correctly separated rather than merged (PRD Dialogue F shape).',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'We used Runway for the visuals and ElevenLabs for voiceover, both on team plans, and legal already signed off since it is for a pitch, not a paid campaign. I’m the creative director on this.' },
    { turn: 2, phase: 2, user_text: 'That covers it.' },
  ],
  turn_candidates: [
    [
      fact({ proposal_id: 'pf-1a', turn: 1, raw_text: 'It’s for a pitch, not a paid campaign.', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'Client-facing pitch deck video' }),
      fact({ proposal_id: 'pf-1b', turn: 1, raw_text: 'I’m the creative director on this.', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Creative director' }),
      // Channel 1: "both on team plans" directly states tier for both tools; no surface stated for either.
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'We used Runway for the visuals, both on team plans.', raw_tool_name: 'Runway', plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'Team' }),
      tool({ proposal_id: 'tm-2', turn: 1, raw_text: 'ElevenLabs for voiceover, both on team plans.', raw_tool_name: 'ElevenLabs', plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'Team' }),
      obs({ proposal_id: 'so-1', turn: 1, raw_text: 'Visuals generated in Runway.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T1' }),
      obs({ proposal_id: 'so-2', turn: 1, raw_text: 'Voiceover generated in ElevenLabs.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T1' }),
      obs({ proposal_id: 'so-3', turn: 1, raw_text: 'Internal legal already reviewed and approved this piece.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T2' }),
    ],
    [],
  ],
  generator_queue: [null, null],
  decider_queue: [],
  expected: {
    assistant_actions: ['NONE_PROPOSED', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1', 'so-2', 'so-3'],
    final_active_tool_mention_ids: ['t1-tm-1', 't1-tm-2'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'stable',
    final_completion_reason: 'gate_1_gate_2_met',
    final_handoff_tools: [
      { identifier: 'runway-gen3', access_surface: 'unresolved', plan_tier: 'Team' },
      { identifier: 'elevenlabs', access_surface: 'unresolved', plan_tier: 'Team' },
    ],
    notes: 'Seven candidates from one turn, proving runExtractionPipeline’s per-candidate loop stays correctly split, not just in Phase 6a’s isolated tests. Both tools’ plan_tier now confirmed ‘Team’ via Finding 1’s fix; access_surface stays unresolved since no surface was directly stated for either.',
  },
}

// ── 7. ambiguous_multi_surface_tool ─────────────────────────────────────────

const ambiguousMultiSurfaceTool: DialogueScenario = {
  id: 'ambiguous_multi_surface_tool',
  is_normative_probe: false,
  description: 'User names a multi-surface tool ("Nano Banana"); engine must hold it unresolved, then disambiguate. Turn 2 corrected 2026-08-08 per JD instruction item 2 -- see Finding 3 in the file header.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'I used Nano Banana for this one. I’m the designer on it. It’s just an internal concept test.' },
    // Rewritten 2026-08-08 (Finding 3 fix): the original wording's negation
    // ("it's not the app on my phone") tripped the consumer-app pattern even
    // while denying it. This version states the API surface with no
    // negation-driven language at all -- re-verified by direct execution to
    // resolve cleanly (see chat record). The normalizer itself was not
    // touched, per explicit instruction.
    { turn: 2, phase: 2, user_text: 'Through the API — I called it directly with my own developer key.' },
  ],
  turn_candidates: [
    [
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'I used Nano Banana for this one.', raw_tool_name: 'Nano Banana' }),
      fact({ proposal_id: 'pf-1a', turn: 1, raw_text: 'I’m the designer on it.', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Designer' }),
      fact({ proposal_id: 'pf-1b', turn: 1, raw_text: 'It’s just an internal concept test.', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'Internal concept test' }),
    ],
    // mention_id is now turn-qualified (t{turn}-{proposal_id}), not the bare
    // proposal_id/'-resolved'-suffix scheme (2026-08-09, proposal-ID
    // collision-class fix, LIVE-RUNTIME-FOLLOWUP-REPORT-2026-08-09) -- tm-1
    // (turn 1) persists as 't1-tm-1', and tm-2 (which supersedes it)
    // persists as 't2-tm-2'. access_surface is populated via channel 2
    // (Finding 1 fix): the same disambiguation match that resolves
    // 'gemini-api' also deterministically returns access_surface: 'API' --
    // no candidate-level hint needed here, deliberately exercising that
    // channel (channels 1 is exercised by other scenarios' direct-statement
    // hints).
    [
      tool({ proposal_id: 'tm-2', turn: 2, raw_text: 'Through the API — I called it directly with my own developer key.', raw_tool_name: 'Nano Banana', supersedes_tool_mention_id: 't1-tm-1' }),
      obs({ proposal_id: 'so-1', turn: 2, raw_text: 'Generation via Gemini API (developer key), not the Gemini consumer app.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T1' }),
    ],
  ],
  generator_queue: [
    { question_text: 'When you used Nano Banana, was that the app on your phone, or did you go through the API with a developer key?', question_kind: 'follow_up_on_signal', target_signal_id: 't1-tm-1', phase: 2 },
    null,
  ],
  decider_queue: [
    { should_ask: true, reason_code: 'AMBIGUOUS_TOOL_SURFACE_RESOLVABLE', rationale: 'Tool surface is unresolved and a plausible answer would resolve it.' },
  ],
  expected: {
    assistant_actions: ['ASK', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1'],
    final_active_tool_mention_ids: ['t2-tm-2'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: null,
    final_handoff_tools: [{ identifier: 'gemini-api', access_surface: 'API', plan_tier: 'unknown' }],
    notes: 'Finding 3 (fixed): turn 2 now unambiguously resolves to t2-tm-2/gemini-api, canonical, in a single exchange -- re-verified by direct execution before this scenario was finalized. access_surface is now confirmed ‘API’ via Finding 1’s channel 2 (the disambiguation match itself), demonstrating that channel independent of the direct-statement channel used elsewhere. Finding 4’s watch case (a same-lineage second follow-up) no longer arises naturally here since the ambiguity resolves in one step -- it is now covered directly by __tests__/interview-engine/signal-lineage.test.ts instead, per JD’s own instruction to add dedicated tests rather than rely on a dialogue observation.',
  },
}

// ── 8. full_phase_1_to_4_trace ──────────────────────────────────────────────

const fullPhase1To4Trace: DialogueScenario = {
  id: 'full_phase_1_to_4_trace',
  is_normative_probe: false,
  description: 'Clean run through Phases 1-4 ending in Gate 1 met, Gate 2 stable, and an assembled handoff -- proves the whole pipeline connects, since the six PRD dialogues each start mid-Phase-3.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'Runway Gen-3, team API plan. It’s for a paid social ad campaign. I’m the producer.' },
    { turn: 2, phase: 3, user_text: 'This has been a pretty smooth process so far.' },
    { turn: 3, phase: 4, user_text: 'It’s been submitted for delivery now.' },
    { turn: 4, phase: 4, user_text: 'Legal signed off on this last week.' },
    { turn: 5, phase: 4, user_text: 'That’s everything on our end.' },
  ],
  turn_candidates: [
    [
      // Channel 1: "team API plan" directly states both surface and tier.
      tool({
        proposal_id: 'tm-1', turn: 1, raw_text: 'Runway Gen-3, team API plan.', raw_tool_name: 'Runway Gen-3',
        access_surface_confidence_hint: 'confirmed', access_surface_value_hint: 'API',
        plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'Team',
      }),
      fact({ proposal_id: 'pf-1a', turn: 1, raw_text: 'It’s for a paid social ad campaign.', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'Paid social ad campaign' }),
      fact({ proposal_id: 'pf-1b', turn: 1, raw_text: 'I’m the producer.', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Producer' }),
      obs({ proposal_id: 'so-1', turn: 1, raw_text: 'Generation done entirely in Runway.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T1' }),
    ],
    [],
    [],
    [obs({ proposal_id: 'so-2', turn: 4, raw_text: 'Internal legal reviewed and approved before delivery.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T2' })],
    [],
  ],
  generator_queue: [null, null, null, null, null],
  decider_queue: [],
  expected: {
    assistant_actions: ['NONE_PROPOSED', 'NONE_PROPOSED', 'NONE_PROPOSED', 'NONE_PROPOSED', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1', 'so-2'],
    final_active_tool_mention_ids: ['t1-tm-1'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'stable',
    final_completion_reason: 'gate_1_gate_2_met',
    final_handoff_tools: [{ identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' }],
    notes: 'Only scenario spanning all 4 phases end to end. Turns 2-3 deliberately extract nothing (Phase 3/4 bridge, no new fact) so Gate 2 briefly stabilizes before turn 4’s legal-review fact re-opens it, then turn 5 restabilizes -- directly exercises Gate 2 flipping stable -> not_yet_stable -> stable within one run. tm-1.access_surface/plan_tier now confirmed ‘API’/’Team’ via Finding 1’s fix, matching the original fixture’s declared values.',
  },
}

// ── 9. rule5_disentangling_probe (implementation probe, not a PRD dialogue) ─

const rule5DisentanglingProbe: DialogueScenario = {
  id: 'rule5_disentangling_probe',
  is_normative_probe: true,
  description:
    'Targeted probe (JD Decision 2, 2026-08-08), NOT a normative PRD dialogue. Tests only: does the real candidate generator recognize a genuine bundled ambiguity and propose the one allowed disentangling_question; does Constraint A/B correctly permit the first one; is a second, independent bundled ambiguity later in the same interview correctly suppressed under the current once-per-interview cap. Explicitly not evidence the cap’s scope is a final product interpretation.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'It went through internal review before delivery, or maybe that was actually a different project we did — I honestly can’t remember which one right now.' },
    { turn: 2, phase: 2, user_text: 'Sorry — the review was on this current project. The other thing was on a past one.' },
    { turn: 3, phase: 2, user_text: 'Also, on a totally separate note — we used either Kling or Runway for this, I genuinely mix up which was which since we tested both around the same time.' },
  ],
  turn_candidates: [
    [
      obs({ proposal_id: 'so-1', turn: 1, raw_text: 'Something happened on this one, or maybe the other project -- both came up in the same breath.', observation_confidence_hint: 'unresolved_no_visibility', scope: 'current_project' }),
      obs({ proposal_id: 'so-2', turn: 1, raw_text: 'Could be this one instead -- same bundled answer, still unclear which project it belongs to.', observation_confidence_hint: 'unresolved_no_visibility', scope: 'current_project' }),
    ],
    [
      obs({ proposal_id: 'so-1c', turn: 2, raw_text: 'Confirmed: this happened on the current project.', observation_confidence_hint: 'confirmed', scope: 'current_project', supersedes_observation_id: 'so-1' }),
      obs({ proposal_id: 'so-2c', turn: 2, raw_text: 'Confirmed: the other fact was about a past project.', observation_confidence_hint: 'confirmed', scope: 'historical_project', supersedes_observation_id: 'so-2' }),
    ],
    [tool({ proposal_id: 'tm-1', turn: 3, raw_text: 'we used either Kling or Runway for this, I genuinely mix up which was which', raw_tool_name: 'Kling or Runway' })],
  ],
  generator_queue: [
    { question_text: 'Just to make sure I have this right — which of those two things happened on this project, and which was the other one?', question_kind: 'disentangling_question', target_signal_id: null, phase: 2 },
    null,
    { question_text: 'Just to clarify — was that Kling or Runway you used?', question_kind: 'disentangling_question', target_signal_id: null, phase: 2 },
  ],
  decider_queue: [
    { should_ask: true, reason_code: 'BUNDLED_OBSERVATIONS_DISENTANGLEABLE', rationale: 'The two observations are bundled and ambiguous; disentangling would materially improve understanding.' },
    { should_ask: true, reason_code: 'BUNDLED_OBSERVATIONS_DISENTANGLEABLE', rationale: 'A second, independent bundled ambiguity; disentangling would materially improve understanding. Constraint A has no visibility into Constraint B’s cap and must not consider it.' },
  ],
  expected: {
    assistant_actions: ['ASK', 'NONE_PROPOSED', 'SUPPRESSED_BY_CONSTRAINT_B'],
    // attestCandidate suffixes a correcting scoped_observation's id with
    // '-corrected' whenever supersedes_observation_id is set -- 'so-1c'
    // becomes 'so-1c-corrected' at mutation time. Found by the mock dry run
    // itself (see chat record); fixed here, not in extraction.ts, which is
    // behaving exactly as designed.
    final_active_observation_ids: ['so-1c-corrected', 'so-2c-corrected'],
    final_active_tool_mention_ids: ['t3-tm-1'],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
    final_handoff_tools: [],
    notes: 'Turn 1: both observations remain distinctly unresolved before clarification (never guessed/merged). Turn 1 disentangling_question: generated, Constraint A approves, Constraint B allows (first). Turn 3: Constraint A independently approves a second, unrelated bundled ambiguity (tm-1 stays unresolved_alias, never guessed) but Constraint B suppresses it -- DISENTANGLING_QUESTION_ALREADY_ASKED, the once-per-interview cap firing exactly as designed. This result is evidence about the prototype’s current cap behavior only, not a claim about final product scope (JD, 2026-08-08).',
  },
}

export const DIALOGUE_SCENARIOS: DialogueScenario[] = [
  richSignal,
  noSignal,
  currentVsHistorical,
  ambiguousUncertain,
  fullOptOut,
  mixedMultiSignal,
  ambiguousMultiSurfaceTool,
  fullPhase1To4Trace,
  rule5DisentanglingProbe,
]
