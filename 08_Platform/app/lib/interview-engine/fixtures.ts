/**
 * Representative Structured Understanding states for the 8 dialogue fixtures
 * required by CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 1 ("dialogue
 * representability") and INTERVIEW_ENGINE_ARCHITECTURE.md §13b.
 *
 * The six PRD §8 dialogues (rich signal, no signal, current-vs-historical,
 * ambiguous/uncertain, full opt-out, mixed/multi-signal) plus the two
 * roadmap-added fixtures the architecture doc identified as untested gaps
 * (ambiguous multi-surface tool; full Phase 1→4 end-to-end trace).
 *
 * This is Phase 1 only: proof that the type model can represent every
 * required state, not the full dialogue-turn conversion (that's the Phase
 * 6b/7 fixture work — `{ turns, expected }` objects driving the LLM-based
 * pipeline). Lives in lib/ rather than __tests__/ because later phases
 * (mutation, gates, boundaries, handoff assembly) reuse these same base
 * states, not just Phase 1's own tests.
 */

import type { StructuredUnderstanding, RetrievalHandoff } from '@/types/interview-engine'

export const DIALOGUE_FIXTURE_IDS = [
  'rich_signal',
  'no_signal',
  'current_vs_historical',
  'ambiguous_uncertain',
  'full_opt_out',
  'mixed_multi_signal',
  'ambiguous_multi_surface_tool',
  'full_phase_1_to_4_trace',
] as const

export type DialogueFixtureId = (typeof DIALOGUE_FIXTURE_IDS)[number]

export interface DialogueFixture {
  id: DialogueFixtureId
  description: string
  structured_understanding: StructuredUnderstanding
  retrieval_handoff: RetrievalHandoff | null
}

function fact(attestation: StructuredUnderstanding['project_facts']['intended_use']['attestation'], sourceTurn: number, sourceStatement: string) {
  return { attestation, source_turn: sourceTurn, source_statement: sourceStatement }
}

const unattestedFact = (sourceTurn: number, sourceStatement: string) => fact({ state: 'unknown' }, sourceTurn, sourceStatement)

/**
 * Rich signal — user volunteers tool, workflow role, access surface, plan
 * tier, and intended use with no follow-up needed. Gate 1 met, Gate 2 stable,
 * normal completion.
 */
const richSignal: DialogueFixture = {
  id: 'rich_signal',
  description: 'User volunteers full project facts in one or two turns; both gates clear normally.',
  structured_understanding: {
    project_facts: {
      intended_use: fact({ state: 'confirmed', value: 'Paid social ad campaign, 30s cutdown' }, 1, "It's for a paid social campaign, a 30-second cutdown."),
      workflow_role: fact({ state: 'confirmed', value: 'Producer' }, 1, "I'm the producer on this one."),
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'runway-gen3' },
        access_surface: { state: 'confirmed', value: 'API' },
        plan_tier: { state: 'confirmed', value: 'Team' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement: 'We shot the whole thing in Runway Gen-3, team API plan.',
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Generation done entirely in Runway, no other tools involved.',
        superseded_by: null,
        source_turn: 1,
        source_statement: 'We shot the whole thing in Runway Gen-3, team API plan.',
      },
    ],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
  },
  retrieval_handoff: null,
}

/**
 * No signal — user gives minimal/unresponsive answers across Phases 1-2.
 * Gate 1 never met; natural conversational flow runs out per §11 ("does not
 * loop back to force it").
 */
const noSignal: DialogueFixture = {
  id: 'no_signal',
  description: 'User gives minimal, unresponsive answers; Gate 1 unmet after normal flow exhausts.',
  structured_understanding: {
    project_facts: {
      intended_use: unattestedFact(1, "I'm not really sure, I'd have to check."),
      workflow_role: unattestedFact(1, "I'm not really sure, I'd have to check."),
    },
    tool_mentions: [],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: null,
        confidence: 'unknown',
        status: null,
        note: 'User gave only "not sure" / "I\'d have to check" across two follow-ups.',
        superseded_by: null,
        source_turn: 2,
        source_statement: "I'm not really sure, I'd have to check.",
      },
    ],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: 'gate_1_unmet_exhausted',
    opt_out_scope: null,
  },
  retrieval_handoff: null,
}

/**
 * Current vs. historical — same underlying topic (tool review process)
 * answered once for the current project and once for a past project; the two
 * must stay tagged distinctly, never collapsed onto one scope.
 */
const currentVsHistorical: DialogueFixture = {
  id: 'current_vs_historical',
  description: 'User distinguishes "this project" from "a past project" on the same topic.',
  structured_understanding: {
    project_facts: {
      intended_use: unattestedFact(1, "This one was Kling, personal plan."),
      workflow_role: fact({ state: 'confirmed', value: 'Editor' }, 1, "I'm the editor on it."),
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'kling' },
        access_surface: { state: 'confirmed', value: 'Web app' },
        plan_tier: { state: 'confirmed', value: 'Personal' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement: 'This one was Kling, personal plan.',
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T2',
        confidence: 'confirmed_absent',
        status: 'completed',
        note: 'No one reviewed this project before delivery.',
        superseded_by: null,
        source_turn: 2,
        source_statement: 'No, nobody reviewed this one.',
      },
      {
        observation_id: 'so-2',
        scope: 'historical_project',
        workflow_stage: 'T2',
        confidence: 'confirmed',
        status: 'completed',
        note: 'A past project did go through internal legal review before delivery.',
        superseded_by: null,
        source_turn: 2,
        source_statement: 'Different from a project we did last year — that one our legal team checked.',
      },
    ],
    current_phase: 3,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  },
  retrieval_handoff: null,
}

/**
 * Ambiguous/uncertain — contrasts unresolved_no_visibility (fact exists, but
 * this user can't see it) against unknown (genuinely not known by anyone
 * asked) within the same conversation.
 */
const ambiguousUncertain: DialogueFixture = {
  id: 'ambiguous_uncertain',
  description: 'Distinguishes "I can\'t see that" (unresolved_no_visibility) from genuine "nobody knows" (unknown).',
  structured_understanding: {
    project_facts: {
      intended_use: fact({ state: 'unknown' }, 3, "Nobody's decided yet where this is actually going to run."),
      workflow_role: fact({ state: 'confirmed', value: 'Motion designer' }, 1, "I did the motion work on this."),
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'kling' },
        access_surface: { state: 'confirmed', value: 'Web app' },
        plan_tier: { state: 'unresolved_no_visibility' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement: 'We used Kling.',
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'unresolved_no_visibility',
        status: null,
        note: 'Account is shared with a producer; this user cannot confirm which plan tier is active.',
        superseded_by: null,
        source_turn: 2,
        source_statement: "Honestly I don't have access to the billing page, someone else manages that.",
      },
      {
        observation_id: 'so-2',
        scope: 'current_project',
        workflow_stage: null,
        confidence: 'unknown',
        status: null,
        note: 'Final commercial use of the piece has not been decided by anyone yet.',
        superseded_by: null,
        source_turn: 3,
        source_statement: "Nobody's decided yet where this is actually going to run.",
      },
    ],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  },
  retrieval_handoff: null,
}

/**
 * Full opt-out — user declines to continue at all. opt_out_scope 'interview'
 * per §6/§11; Gate 1 recorded as not_applicable_declined, not not_met (a
 * decline is a consent boundary, not evidence understanding is unreachable).
 */
const fullOptOut: DialogueFixture = {
  id: 'full_opt_out',
  description: 'User declines to continue the interview entirely.',
  structured_understanding: {
    project_facts: {
      intended_use: fact({ state: 'declined' }, 1, "I'd rather not go through this right now, can we stop?"),
      workflow_role: fact({ state: 'declined' }, 1, "I'd rather not go through this right now, can we stop?"),
    },
    tool_mentions: [],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: null,
        confidence: 'declined',
        status: null,
        note: 'User asked to stop the interview and not be asked further questions.',
        superseded_by: null,
        source_turn: 1,
        source_statement: "I'd rather not go through this right now, can we stop?",
      },
    ],
    current_phase: 1,
    gate_1_state: 'not_applicable_declined',
    gate_2_state: 'not_yet_stable',
    completion_reason: 'declined',
    opt_out_scope: 'interview',
  },
  retrieval_handoff: null,
}

/**
 * Mixed/multi-signal — one bundled turn (PRD Dialogue F shape) produces
 * multiple distinct scoped observations and multiple tool mentions, correctly
 * separated rather than merged into one.
 */
const mixedMultiSignal: DialogueFixture = {
  id: 'mixed_multi_signal',
  description: 'A single bundled answer yields multiple distinct scoped observations and tool mentions.',
  structured_understanding: {
    project_facts: {
      intended_use: fact({ state: 'confirmed', value: 'Client-facing pitch deck video' }, 1, "It's for a pitch, not a paid campaign."),
      workflow_role: fact({ state: 'confirmed', value: 'Creative director' }, 1, "I'm the creative director on this."),
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'runway-gen3' },
        // Each tool now carries its own access_surface/plan_tier -- previously
        // this fixture could only represent both tools' plans as one prose
        // sentence on a single project-level field. See the type-level note
        // on ToolMention.access_surface for why this moved.
        access_surface: { state: 'confirmed', value: 'API' },
        plan_tier: { state: 'confirmed', value: 'Team' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement:
          'We used Runway for the visuals and ElevenLabs for voiceover, both on team plans, and legal already signed off since it is for a pitch, not a paid campaign.',
        superseded_by: null,
      },
      {
        mention_id: 'tm-2',
        resolution: { kind: 'canonical', identifier: 'elevenlabs' },
        access_surface: { state: 'confirmed', value: 'Web app' },
        plan_tier: { state: 'confirmed', value: 'Team' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement:
          'We used Runway for the visuals and ElevenLabs for voiceover, both on team plans, and legal already signed off since it is for a pitch, not a paid campaign.',
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Visuals generated in Runway.',
        superseded_by: null,
        source_turn: 1,
        source_statement:
          'We used Runway for the visuals and ElevenLabs for voiceover, both on team plans, and legal already signed off since it is for a pitch, not a paid campaign.',
      },
      {
        observation_id: 'so-2',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Voiceover generated in ElevenLabs.',
        superseded_by: null,
        source_turn: 1,
        source_statement:
          'We used Runway for the visuals and ElevenLabs for voiceover, both on team plans, and legal already signed off since it is for a pitch, not a paid campaign.',
      },
      {
        observation_id: 'so-3',
        scope: 'current_project',
        workflow_stage: 'T2',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Internal legal already reviewed and approved this piece.',
        superseded_by: null,
        source_turn: 1,
        source_statement:
          'We used Runway for the visuals and ElevenLabs for voiceover, both on team plans, and legal already signed off since it is for a pitch, not a paid campaign.',
      },
    ],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
  },
  retrieval_handoff: null,
}

/**
 * Ambiguous multi-surface tool — the risk area the architecture doc
 * identified as previously untested (§8, §13b item 1). "Nano Banana" is named
 * but not yet resolved between the Gemini Consumer App and Gemini API rows;
 * the mention starts unresolved, then a later turn's correction supersedes it
 * once disambiguated — exercising both the unresolved_alias state and
 * tool-level supersession within one fixture.
 */
const ambiguousMultiSurfaceTool: DialogueFixture = {
  id: 'ambiguous_multi_surface_tool',
  description:
    'User names a tool with multiple product surfaces ("Nano Banana"); engine must hold it unresolved, then disambiguate.',
  structured_understanding: {
    project_facts: {
      intended_use: fact({ state: 'confirmed', value: 'Internal concept test' }, 1, "It's just an internal concept test."),
      workflow_role: fact({ state: 'confirmed', value: 'Designer' }, 1, "I'm the designer on it."),
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
        // Access surface is itself what's unresolved pre-disambiguation --
        // the ambiguity IS the surface question, not a separate fact to track.
        access_surface: { state: 'unresolved_no_visibility' },
        plan_tier: { state: 'unknown' },
        confidence: 'unresolved_no_visibility',
        source_turn: 1,
        source_statement: 'I used Nano Banana for this one.',
        superseded_by: 'tm-2',
      },
      {
        mention_id: 'tm-2',
        resolution: { kind: 'canonical', identifier: 'gemini-api' },
        // access_surface now lives on the SAME object being resolved, so
        // there's no cross-object propagation step needed -- resolving the
        // tool and confirming its surface happen together. Previously (when
        // access_surface lived on ProjectFacts) this fixture left the
        // project-level field stuck at unresolved_no_visibility even after
        // this resolution -- flagged in the Phase 1 review, fixed by this
        // Phase 3 type migration.
        access_surface: { state: 'confirmed', value: 'API (developer key)' },
        plan_tier: { state: 'unknown' },
        confidence: 'confirmed',
        source_turn: 2,
        source_statement: "Oh, through the API — I have a developer key, it's not the app on my phone.",
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Generation via Gemini API (developer key), not the Gemini consumer app.',
        superseded_by: null,
        source_turn: 2,
        source_statement: "Oh, through the API — I have a developer key, it's not the app on my phone.",
      },
    ],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  },
  retrieval_handoff: null,
}

/**
 * Full Phase 1→4 end-to-end trace — the second roadmap-added fixture
 * (§13b item 2): a clean run through all four phases ending in a populated
 * retrieval handoff, since the six PRD dialogues each start mid-Phase-3 and
 * never individually prove the whole pipeline connects.
 */
const fullPhase1To4Trace: DialogueFixture = {
  id: 'full_phase_1_to_4_trace',
  description: 'Clean run through Phases 1-4 ending in Gate 1 met, Gate 2 stable, and an assembled handoff.',
  structured_understanding: {
    project_facts: {
      intended_use: fact({ state: 'confirmed', value: 'Paid social ad campaign' }, 1, "It's for a paid social ad campaign."),
      workflow_role: fact({ state: 'confirmed', value: 'Producer' }, 1, "I'm the producer."),
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'runway-gen3' },
        access_surface: { state: 'confirmed', value: 'API' },
        plan_tier: { state: 'confirmed', value: 'Team' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement: 'Runway Gen-3, team API plan.',
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Generation done entirely in Runway.',
        superseded_by: null,
        source_turn: 1,
        source_statement: 'Runway Gen-3, team API plan.',
      },
      {
        observation_id: 'so-2',
        scope: 'current_project',
        workflow_stage: 'T2',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Internal legal reviewed and approved before delivery.',
        superseded_by: null,
        source_turn: 4,
        source_statement: 'Legal signed off on this last week.',
      },
    ],
    current_phase: 4,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
  },
  retrieval_handoff: {
    tools: [{ identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' }],
    unresolved_aliases: [],
    workflow_role: 'Producer',
    intended_use: 'Paid social ad campaign',
    scoped_observations: [
      {
        observation_id: 'so-1',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Generation done entirely in Runway.',
        superseded_by: null,
        source_turn: 1,
        source_statement: 'Runway Gen-3, team API plan.',
      },
      {
        observation_id: 'so-2',
        scope: 'current_project',
        workflow_stage: 'T2',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Internal legal reviewed and approved before delivery.',
        superseded_by: null,
        source_turn: 4,
        source_statement: 'Legal signed off on this last week.',
      },
    ],
    certainty_state: 'gate_1_met',
    exclusions: [],
  },
}

/**
 * All 8 fixtures, keyed by id. Typed as Record<DialogueFixtureId, ...> so
 * TypeScript itself enforces every required fixture id is present — a
 * missing entry is a compile error, not a runtime gap discovered later.
 */
export const DIALOGUE_FIXTURES: Record<DialogueFixtureId, DialogueFixture> = {
  rich_signal: richSignal,
  no_signal: noSignal,
  current_vs_historical: currentVsHistorical,
  ambiguous_uncertain: ambiguousUncertain,
  full_opt_out: fullOptOut,
  mixed_multi_signal: mixedMultiSignal,
  ambiguous_multi_surface_tool: ambiguousMultiSurfaceTool,
  full_phase_1_to_4_trace: fullPhase1To4Trace,
}
