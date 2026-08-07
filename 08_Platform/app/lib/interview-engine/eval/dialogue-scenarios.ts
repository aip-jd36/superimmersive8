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
 * ── except the two verified by direct execution, noted below) ──────────
 *
 * FINDING 1 (systemic, affects nearly every scenario): CandidateObservation
 * has no field for a ToolMention's access_surface/plan_tier, and
 * attestCandidate's tool_mention branch unconditionally hardcodes both to
 * `{ state: 'unknown' }` regardless of any hint -- including on a
 * *superseding* candidate that successfully resolves an unresolved alias.
 * fixtures.ts's own end-states (rich_signal, mixed_multi_signal,
 * ambiguous_multi_surface_tool, full_phase_1_to_4_trace) all declare
 * confirmed access_surface/plan_tier values that the current extraction
 * pipeline has no code path to ever produce. This does not affect Gate 1
 * (evaluateGate1 only reads `resolution.kind`, never access_surface/
 * plan_tier) but does affect Gate 2's interview-scope diff and every
 * scenario's final handoff, which will show 'unresolved'/'unknown' for
 * these fields where the original fixtures declared confirmed values. Not
 * fixed here -- extraction.ts is frozen (Phase 6a), and this is a real
 * capability gap for JD to weigh, not a bug in gates.ts/handoff.ts, both of
 * which behave correctly against the data they're actually given.
 *
 * FINDING 2 (deterministic self-consistency check, gates.ts vs fixtures.ts,
 * recorded in the roadmap Phase 7 section): current_vs_historical and
 * ambiguous_uncertain both declare gate_1_state: 'met' while their own
 * intended_use is 'unknown' -- evaluateGate1 actually computes 'not_met' /
 * INTENDED_USE_MISSING for both. fixtures.ts predates gates.ts and was never
 * checked against it. This file's expected traces for those two scenarios
 * use the real evaluator's output, not the stale stored field.
 *
 * FINDING 3 (verified by direct execution against the exact original
 * fixture wording -- see chat record): ambiguous_multi_surface_tool's own
 * turn-2 source_statement, "Oh, through the API — I have a developer key,
 * it's not the app on my phone," does NOT disambiguate when run through the
 * real normalizeCandidate -- the negation ("it's not the app...") still
 * matches the consumer-app pattern (/\b(the app|...)\b/i has no negation
 * awareness), so both disambiguation rules fire and the tool stays
 * known_ambiguous. The original Phase 1 fixture's own documented "success"
 * sentence has never actually been run through the real disambiguation
 * logic until this scenario was authored. Kept as-is (not reworded to dodge
 * it) -- this scenario's turn 2 deliberately preserves the original wording
 * so the dry run surfaces this as a real, reproducible normalization
 * finding, with a turn 3 added to reach eventual (correct) disambiguation
 * via cleaner phrasing.
 *
 * FINDING 4 (the JD-flagged watch case, naturally exercised, no dedicated
 * scenario needed): ambiguous_multi_surface_tool's turn 3 asks a SECOND
 * follow_up_on_signal about what is conceptually the same ongoing tool
 * ambiguity -- but because turn 2's supersession gave the tool mention a new
 * signal_id (tm-1 -> tm-2), boundaries.ts's per-signal follow-up cap is keyed
 * to the new id and is therefore fresh, not exhausted. evaluateBoundary
 * allows it. This is the exact interaction PHASE_7_PLANNING.md §8 named as
 * the strongest concrete mechanism by which integration testing could
 * surface something no unit-level phase could see. Observed here as
 * designed evidence, not treated as a failure to fix -- Phase 8 is where
 * JD's four-bar architecture-change threshold gets applied to it.
 */

import type { CandidateObservation } from '../extraction'
import type { CandidateQuestionProposal } from '../candidate-question'
import type { ConstraintADecision } from '../decision'
import type { DialogueTurnScript } from './run-dialogue'
import { emptyStructuredUnderstanding } from './empty-structured-understanding'
import type { StructuredUnderstanding } from '@/types/interview-engine'

export interface ScenarioExpected {
  assistant_actions: string[]
  final_active_observation_ids: string[]
  final_active_tool_mention_ids: string[]
  final_gate_1_state: StructuredUnderstanding['gate_1_state']
  final_gate_2_state: StructuredUnderstanding['gate_2_state']
  final_completion_reason: StructuredUnderstanding['completion_reason']
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
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'We shot the whole thing in Runway Gen-3, team API plan.', raw_tool_name: 'Runway Gen-3' }),
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
    final_active_tool_mention_ids: ['tm-1'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'stable',
    final_completion_reason: 'gate_1_gate_2_met',
    notes: 'tm-1 resolves to runway-gen3 (canonical). access_surface/plan_tier stay unknown -- Finding 1 -- diverging from the original fixture’s confirmed ‘API’/’Team’.',
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
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'This one was Kling, personal plan.', raw_tool_name: 'Kling' }),
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
    final_active_tool_mention_ids: ['tm-1'],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
    notes: 'Finding 2: gate_1_state corrected to not_met/INTENDED_USE_MISSING (original fixture stored ‘met’ while intended_use was unknown -- a Phase1/Phase3 cross-inconsistency, not reproduced here). so-1/so-2 correctly stay separately scoped, never merged.',
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
    final_active_tool_mention_ids: ['tm-1'],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
    notes: 'Finding 2 again (same intended_use-unknown/gate_1 correction as current_vs_historical). tm-1.plan_tier stays ‘unknown’ (Finding 1) rather than the more specific ‘unresolved_no_visibility’ the original fixture declared -- the extraction gap also collapses this finer distinction.',
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
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'We used Runway for the visuals.', raw_tool_name: 'Runway' }),
      tool({ proposal_id: 'tm-2', turn: 1, raw_text: 'ElevenLabs for voiceover.', raw_tool_name: 'ElevenLabs' }),
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
    final_active_tool_mention_ids: ['tm-1', 'tm-2'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'stable',
    final_completion_reason: 'gate_1_gate_2_met',
    notes: 'Seven candidates from one turn, proving runExtractionPipeline’s per-candidate loop stays correctly split, not just in Phase 6a’s isolated tests. Both tools’ access_surface/plan_tier stay unknown (Finding 1).',
  },
}

// ── 7. ambiguous_multi_surface_tool ─────────────────────────────────────────

const ambiguousMultiSurfaceTool: DialogueScenario = {
  id: 'ambiguous_multi_surface_tool',
  is_normative_probe: false,
  description: 'User names a multi-surface tool ("Nano Banana"); engine must hold it unresolved, then disambiguate. Exercises Finding 3 and Finding 4 directly.',
  initial_su: emptyStructuredUnderstanding(),
  turns: [
    { turn: 1, phase: 2, user_text: 'I used Nano Banana for this one. I’m the designer on it. It’s just an internal concept test.' },
    { turn: 2, phase: 2, user_text: "Oh, through the API — I have a developer key, it's not the app on my phone." },
    { turn: 3, phase: 2, user_text: 'Sorry, to be clear: it was the developer API key I used, called directly.' },
  ],
  turn_candidates: [
    [
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'I used Nano Banana for this one.', raw_tool_name: 'Nano Banana' }),
      fact({ proposal_id: 'pf-1a', turn: 1, raw_text: 'I’m the designer on it.', raw_fact_field: 'workflow_role', fact_confidence_hint: 'confirmed', fact_value_hint: 'Designer' }),
      fact({ proposal_id: 'pf-1b', turn: 1, raw_text: 'It’s just an internal concept test.', raw_fact_field: 'intended_use', fact_confidence_hint: 'confirmed', fact_value_hint: 'Internal concept test' }),
    ],
    // attestCandidate suffixes a superseding tool_mention's id with
    // '-resolved' whenever supersedes_tool_mention_id is set -- tm-2 (which
    // supersedes tm-1) actually becomes 'tm-2-resolved' at mutation time.
    // Turn 3's own supersedes_tool_mention_id must therefore reference
    // 'tm-2-resolved', the real active id after turn 2, not the naive 'tm-2'
    // -- mutations.ts's supersedeToolMention correctly rejects a reference
    // to a nonexistent id ('tm-2' was never actually written). Found by the
    // mock dry run itself (see chat record); fixed here, not in
    // extraction.ts or mutations.ts, both behaving exactly as designed.
    [tool({ proposal_id: 'tm-2', turn: 2, raw_text: "Oh, through the API — I have a developer key, it's not the app on my phone.", raw_tool_name: 'Nano Banana', supersedes_tool_mention_id: 'tm-1' })],
    [
      tool({ proposal_id: 'tm-3', turn: 3, raw_text: 'Sorry, to be clear: it was the developer API key I used, called directly.', raw_tool_name: 'Nano Banana', supersedes_tool_mention_id: 'tm-2-resolved' }),
      obs({ proposal_id: 'so-1', turn: 3, raw_text: 'Generation via Gemini API (developer key), not the Gemini consumer app.', observation_confidence_hint: 'confirmed', scope: 'current_project', workflow_stage: 'T1' }),
    ],
  ],
  generator_queue: [
    { question_text: 'When you used Nano Banana, was that the app on your phone, or did you go through the API with a developer key?', question_kind: 'follow_up_on_signal', target_signal_id: 'tm-1', phase: 2 },
    { question_text: 'Sorry, to make sure I have it right — was that through the API, or the phone app?', question_kind: 'follow_up_on_signal', target_signal_id: 'tm-2-resolved', phase: 2 },
    null,
  ],
  decider_queue: [
    { should_ask: true, reason_code: 'AMBIGUOUS_TOOL_SURFACE_RESOLVABLE', rationale: 'Tool surface is unresolved and a plausible answer would resolve it.' },
    { should_ask: true, reason_code: 'AMBIGUOUS_TOOL_SURFACE_RESOLVABLE', rationale: 'Still unresolved after the first attempt; a plausible answer would resolve it.' },
  ],
  expected: {
    assistant_actions: ['ASK', 'ASK', 'NONE_PROPOSED'],
    final_active_observation_ids: ['so-1'],
    final_active_tool_mention_ids: ['tm-3-resolved'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: null,
    notes: 'Finding 3: turn 2’s exact original-fixture wording does NOT disambiguate (verified by direct execution) -- tm-1 supersedes to tm-2-resolved, still unresolved_alias. Finding 4: turn 2’s follow-up is ALLOWED by Constraint B despite tm-1 already having used its one follow-up, because supersession gave the ambiguity a new signal_id (tm-2-resolved) with a fresh cap -- the JD-flagged watch case, naturally exercised, no dedicated scenario needed. Turn 3 (cleaner phrasing) finally resolves to tm-3-resolved/gemini-api, canonical. access_surface stays unknown even on the successful resolution (Finding 1) -- the gap is separate from, and does not block, the tool-identity resolution itself.',
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
      tool({ proposal_id: 'tm-1', turn: 1, raw_text: 'Runway Gen-3, team API plan.', raw_tool_name: 'Runway Gen-3' }),
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
    final_active_tool_mention_ids: ['tm-1'],
    final_gate_1_state: 'met',
    final_gate_2_state: 'stable',
    final_completion_reason: 'gate_1_gate_2_met',
    notes: 'Only scenario spanning all 4 phases end to end. Turns 2-3 deliberately extract nothing (Phase 3/4 bridge, no new fact) so Gate 2 briefly stabilizes before turn 4’s legal-review fact re-opens it, then turn 5 restabilizes -- directly exercises Gate 2 flipping stable -> not_yet_stable -> stable within one run. tm-1.access_surface/plan_tier stay unknown (Finding 1); final handoff will show ‘unresolved’/’unknown’ where the original fixture declared confirmed ‘API’/’Team’.',
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
    final_active_tool_mention_ids: ['tm-1'],
    final_gate_1_state: 'not_met',
    final_gate_2_state: 'not_yet_stable',
    final_completion_reason: 'gate_1_unmet_exhausted',
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
