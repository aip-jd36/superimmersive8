/**
 * Constraint A evaluation corpus (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6c).
 * 15 hand-labeled cases, matching the required positive/negative categories
 * exactly. Not a Jest fixture set for the deterministic suite alone -- this
 * is the real evaluation corpus consumed by the real-model harness.
 *
 * A subset carries an optional `after` state: a plausible/actual answer's
 * resulting StructuredUnderstanding, hand-constructed for cases where "what
 * would a real answer produce" is unambiguous. Used only for the
 * retrospective-diff comparison (step 7) -- never fed back into the
 * prospective decision itself.
 *
 * Cleanup pass 2026-08-07 (post-first-real-model-eval, pre-Phase-7): fixed
 * bundled_disentangling_needed's after_structured_understanding, which
 * previously did not differ structurally from its before state (see inline
 * comment on that case). Widened acceptable_reason_codes on
 * confirmed_absence_redundant, bundled_disentangling_needed, and
 * tool_tier_unknown_necessary where a first real-model run showed a second
 * reason code was an equally valid description of the same direction --
 * never done by loosening expected_should_ask itself.
 * tool_tier_unknown_irrelevant's expected_should_ask is deliberately left at
 * `false` despite the model's consistent disagreement in that first run --
 * see CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6c for why that is preserved as a
 * real (not fixture) disagreement, not resolved by relabeling.
 */

import type {
  ProjectFacts,
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
} from '@/types/interview-engine'
import type { CandidateQuestionProposal } from '../candidate-question'
import type { ConstraintAReasonCode } from '../decision'
import { ASK_REASON_CODES, SUPPRESS_REASON_CODES } from '../decision'

export interface ConstraintACorpusCase {
  id: string
  category: string
  description: string
  structured_understanding: StructuredUnderstanding
  candidate: CandidateQuestionProposal
  expected_should_ask: boolean
  acceptable_reason_codes: ConstraintAReasonCode[]
  after_structured_understanding?: StructuredUnderstanding
}

// ── Local builders (mirrors the convention established across __tests__) ───

function projectFacts(overrides: Partial<ProjectFacts> = {}): ProjectFacts {
  return {
    intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'placeholder' },
    workflow_role: { attestation: { state: 'confirmed', value: 'Producer' }, source_turn: 1, source_statement: 'placeholder' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    ...overrides,
  }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function observation(overrides: Partial<ScopedObservation> & Pick<ScopedObservation, 'observation_id'>): ScopedObservation {
  return {
    scope: 'current_project',
    workflow_stage: null,
    confidence: 'confirmed',
    status: null,
    note: 'placeholder',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

function su(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: projectFacts(),
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    current_phase: 2,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function candidate(overrides: Partial<CandidateQuestionProposal> & Pick<CandidateQuestionProposal, 'question_text' | 'question_kind'>): CandidateQuestionProposal {
  return {
    target_signal_id: null,
    phase: 2,
    ...overrides,
  }
}

// ── Corpus ───────────────────────────────────────────────────────────────────

export const CONSTRAINT_A_CORPUS: ConstraintACorpusCase[] = [
  {
    id: 'unresolved_nano_banana',
    category: 'unresolved Nano Banana surface',
    description: 'An ambiguous multi-surface tool is named but not resolved -- a plausible answer would resolve it.',
    structured_understanding: su({
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' }, confidence: 'unresolved_no_visibility' }),
      ],
    }),
    candidate: candidate({
      question_text: 'When you used Nano Banana, was that the app on your phone, or did you go through the API with a developer key?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'tm-1',
    }),
    expected_should_ask: true,
    acceptable_reason_codes: ['AMBIGUOUS_TOOL_SURFACE_RESOLVABLE'],
    after_structured_understanding: su({
      tool_mentions: [
        { ...toolMention({ mention_id: 'tm-1', resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' } }), superseded_by: 'tm-2' },
        toolMention({
          mention_id: 'tm-2',
          resolution: { kind: 'canonical', identifier: 'gemini-api' },
          access_surface: { state: 'confirmed', value: 'API' },
          source_turn: 2,
        }),
      ],
    }),
  },

  {
    id: 'already_resolved_gemini_consumer',
    category: 'already-resolved Gemini Consumer surface',
    description: 'The tool is already canonically resolved -- asking again would only restate a confirmed fact.',
    structured_understanding: su({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'gemini-consumer-app' },
          access_surface: { state: 'confirmed', value: 'Consumer web app' },
        }),
      ],
    }),
    candidate: candidate({
      question_text: 'Just to confirm, was that through the app or the API?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'tm-1',
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['FACT_ALREADY_CONFIRMED', 'SUFFICIENT_CERTAINTY_ALREADY'],
  },

  {
    id: 'missing_intended_use',
    category: 'missing intended use',
    description: 'Intended use has never been established -- a plausible answer would fill a genuinely missing fact.',
    structured_understanding: su({ project_facts: projectFacts({ intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: '' } }) }),
    candidate: candidate({
      question_text: "What's this video going to be used for -- is it for a client, internal use, or something else?",
      question_kind: 'other',
      target_signal_id: 'project:intended_use',
    }),
    expected_should_ask: true,
    acceptable_reason_codes: ['MISSING_INTENDED_USE'],
    after_structured_understanding: su({
      project_facts: projectFacts({ intended_use: { attestation: { state: 'confirmed', value: 'Paid client campaign' }, source_turn: 2, source_statement: "It's for a paid client campaign." } }),
    }),
  },

  {
    id: 'intended_use_already_confirmed',
    category: 'intended use already confirmed',
    description: 'Intended use is already confirmed -- nothing left to fill.',
    structured_understanding: su({
      project_facts: projectFacts({ intended_use: { attestation: { state: 'confirmed', value: 'Paid social ad campaign' }, source_turn: 1, source_statement: 'placeholder' } }),
    }),
    candidate: candidate({
      question_text: "Just to double check, what's this video for?",
      question_kind: 'other',
      target_signal_id: 'project:intended_use',
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['FACT_ALREADY_CONFIRMED', 'SUFFICIENT_CERTAINTY_ALREADY'],
  },

  {
    id: 'current_vs_historical_ambiguous',
    category: 'current-vs-historical ambiguity',
    description: 'A recorded fact might belong to the current project or a past one -- genuinely unclear which.',
    structured_understanding: su({
      scoped_observations: [
        observation({ observation_id: 'so-1', workflow_stage: 'T2', note: 'Legal reviewed something before delivery -- possibly this project, possibly a past one, unclear from context.' }),
      ],
    }),
    candidate: candidate({
      question_text: 'Was that legal review for this project specifically, or was that on a different one?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'so-1',
    }),
    expected_should_ask: true,
    acceptable_reason_codes: ['CURRENT_VS_HISTORICAL_AMBIGUOUS'],
  },

  {
    id: 'current_historical_already_separated',
    category: 'historical/current already separated',
    description: 'Current and historical facts on the same topic are already distinctly recorded.',
    structured_understanding: su({
      scoped_observations: [
        observation({ observation_id: 'so-1', scope: 'current_project', workflow_stage: 'T2', note: 'No review on this project.' }),
        observation({ observation_id: 'so-2', scope: 'historical_project', workflow_stage: 'T2', note: 'A past project was reviewed by legal.', source_turn: 2 }),
      ],
    }),
    candidate: candidate({
      question_text: 'Was that review for this project or a past one?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'so-2',
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['FACT_ALREADY_CONFIRMED', 'SUFFICIENT_CERTAINTY_ALREADY'],
  },

  {
    id: 'unresolved_no_visibility_clarifiable',
    category: 'unresolved-no-visibility, one clarification may add understanding',
    description: "The respondent lacks personal visibility -- a clarification could still establish whether anyone else has visibility.",
    structured_understanding: su({
      scoped_observations: [
        observation({ observation_id: 'so-1', confidence: 'unresolved_no_visibility', note: "I don't have access to that, someone else manages billing." }),
      ],
    }),
    candidate: candidate({
      question_text: 'Is that something a colleague on your team would know, or is it genuinely unclear to everyone?',
      question_kind: 'uncertainty_clarification',
      target_signal_id: 'so-1',
    }),
    expected_should_ask: true,
    acceptable_reason_codes: ['VISIBILITY_GAP_CLARIFIABLE'],
  },

  {
    id: 'confirmed_absence_redundant',
    category: 'confirmed absence, suppress redundant clarification',
    description: 'Absence is already confirmed cleanly -- nothing more to clarify.',
    structured_understanding: su({
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'confirmed_absent', note: 'No, nobody reviewed it before it went out.' })],
    }),
    candidate: candidate({
      question_text: 'Are you sure absolutely no one looked at it?',
      question_kind: 'uncertainty_clarification',
      target_signal_id: 'so-1',
    }),
    expected_should_ask: false,
    // Widened 2026-08-07: "are you sure absolutely no one looked at it?" is
    // simultaneously a redundant reconfirmation AND an interrogative push for
    // reassurance -- REVIEWER_STYLE_DRILLDOWN is an equally valid description
    // of the same suppress decision, not a different (wrong) one. The prior
    // set was too narrow for a case that legitimately straddles both
    // categories by construction.
    acceptable_reason_codes: ['FACT_ALREADY_CONFIRMED', 'SUFFICIENT_CERTAINTY_ALREADY', 'REVIEWER_STYLE_DRILLDOWN'],
  },

  {
    id: 'bundled_disentangling_needed',
    category: 'bundled answer requiring one disentangling question',
    description: 'A bundled answer produced two observations whose scope genuinely cannot be told apart.',
    structured_understanding: su({
      scoped_observations: [
        observation({
          observation_id: 'so-1',
          scope: 'current_project',
          confidence: 'unresolved_no_visibility',
          note: 'Something happened on this one, or maybe the other project -- both came up in the same breath.',
        }),
        observation({
          observation_id: 'so-2',
          scope: 'current_project',
          confidence: 'unresolved_no_visibility',
          note: 'Could be this one instead -- same bundled answer, still unclear which project it belongs to.',
          source_turn: 2,
        }),
      ],
    }),
    candidate: candidate({
      question_text: 'Just to make sure I have this right -- which of those two things happened on this project, and which was the other one?',
      question_kind: 'disentangling_question',
      target_signal_id: null,
    }),
    expected_should_ask: true,
    acceptable_reason_codes: ['BUNDLED_OBSERVATIONS_DISENTANGLEABLE', 'CURRENT_VS_HISTORICAL_AMBIGUOUS'],
    // Fixed 2026-08-07 (Phase 6c cleanup pass): the prior version gave so-1 an
    // implicit default scope and so-2 an already-explicit 'historical_project'
    // scope in the BEFORE state -- meaning both "before" and "after" already
    // carried identical, fully-resolved scope values, so the ambiguity existed
    // only in prose (note text), which computeRetrospectiveDiff correctly does
    // not treat as material. Corrected: the BEFORE state now encodes the
    // ambiguity structurally -- both observations share the same tentative
    // scope guess ('current_project') and carry confidence:
    // 'unresolved_no_visibility', genuinely representing "we can't yet tell
    // these apart." The AFTER state resolves both: so-1 stays
    // 'current_project' (confirmed), so-2 moves to 'historical_project'
    // (confirmed) -- a real scope correction plus a real confidence change on
    // both, which the diff will now correctly detect as material.
    after_structured_understanding: su({
      scoped_observations: [
        observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'Confirmed: this happened on the current project.' }),
        observation({ observation_id: 'so-2', scope: 'historical_project', confidence: 'confirmed', note: 'Confirmed: the other fact was about a past project.', source_turn: 3 }),
      ],
    }),
  },

  {
    id: 'incident_level_detail_unnecessary',
    category: 'unnecessary incident-level detail',
    description: 'Absence is already established -- forensic drill-down into exactly why review failed adds nothing CRC needs.',
    structured_understanding: su({
      scoped_observations: [observation({ observation_id: 'so-1', confidence: 'confirmed_absent', note: 'No review happened before this went out.' })],
    }),
    candidate: candidate({
      question_text: 'Walk me through exactly why the review step was skipped -- who was responsible, and what happened in that process?',
      question_kind: 'incident_investigation',
      target_signal_id: null,
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['REVIEWER_STYLE_DRILLDOWN'],
  },

  {
    id: 'tool_tier_unknown_irrelevant',
    category: 'tool tier unknown but irrelevant to current understanding',
    description: 'Plan tier is unresolved, but intended use is purely internal -- the tier does not change what CRC needs to understand.',
    structured_understanding: su({
      project_facts: projectFacts({ intended_use: { attestation: { state: 'confirmed', value: 'Internal concept test, not for external use' }, source_turn: 1, source_statement: 'placeholder' } }),
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'unknown' } }),
      ],
    }),
    candidate: candidate({
      question_text: 'Do you know which Kling plan tier you were on for this?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'tm-1',
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['DETAIL_NOT_MATERIAL', 'NO_MATERIAL_IMPROVEMENT'],
  },

  {
    id: 'tool_tier_unknown_necessary',
    category: 'tool tier unknown and genuinely necessary to identify the described workflow',
    description: "Plan tier is unresolved, and it's load-bearing here: the described workflow can't be understood without knowing which access tier was used.",
    structured_understanding: su({
      project_facts: projectFacts({ intended_use: { attestation: { state: 'confirmed', value: 'Paid commercial ad campaign' }, source_turn: 1, source_statement: 'placeholder' } }),
      tool_mentions: [
        toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' }, plan_tier: { state: 'unknown' }, access_surface: { state: 'unknown' } }),
      ],
    }),
    candidate: candidate({
      question_text: 'For the Runway generation, was that through a free personal account, or a paid team/API plan?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'tm-1',
    }),
    expected_should_ask: true,
    // Widened 2026-08-07: this fixture leaves BOTH plan_tier and
    // access_surface unknown, so a plausible answer resolving either one
    // genuinely improves understanding -- VISIBILITY_GAP_CLARIFIABLE is a
    // defensible framing of the same fixture (an access-visibility gap), not
    // a mismatch with MISSING_WORKFLOW_FACT. Direction is unchanged.
    acceptable_reason_codes: ['MISSING_WORKFLOW_FACT', 'MATERIALLY_IMPROVES_UNDERSTANDING', 'VISIBILITY_GAP_CLARIFIABLE'],
  },

  {
    id: 'correction_signal_prior_state_may_be_wrong',
    category: 'correction signal suggesting prior state may be wrong',
    description: 'The candidate question itself flags that a previously confirmed fact might actually be incorrect.',
    structured_understanding: su({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'kling' } })],
    }),
    candidate: candidate({
      question_text: 'Earlier you mentioned Kling, but just now it sounded like it might have actually been Runway -- can you confirm which one it was?',
      question_kind: 'follow_up_on_signal',
      target_signal_id: 'tm-1',
    }),
    expected_should_ask: true,
    acceptable_reason_codes: ['POTENTIAL_MISINTERPRETATION'],
  },

  {
    id: 'purely_retrieval_motivated',
    category: 'purely Retrieval-motivated question',
    description: "Every fact CRC needs is already established -- the question only makes sense if its purpose is helping a downstream matching system, not the Interview Engine's own understanding.",
    structured_understanding: su({
      project_facts: projectFacts({ intended_use: { attestation: { state: 'confirmed', value: 'Paid social ad campaign' }, source_turn: 1, source_statement: 'placeholder' } }),
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'runway-gen3' },
          access_surface: { state: 'confirmed', value: 'API' },
          plan_tier: { state: 'confirmed', value: 'Team' },
        }),
      ],
    }),
    candidate: candidate({
      question_text: 'Can you describe the visual style, resolution, and aspect ratio so we can find similar reference examples for you?',
      question_kind: 'other',
      target_signal_id: null,
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['RETRIEVAL_MOTIVATED'],
  },

  {
    id: 'semantically_duplicate_question',
    category: 'semantically duplicate question phrased differently',
    description: 'Differently worded, but asks for exactly the fact already confirmed.',
    structured_understanding: su({
      project_facts: projectFacts({ intended_use: { attestation: { state: 'confirmed', value: 'Paid social ad campaign' }, source_turn: 1, source_statement: 'placeholder' } }),
    }),
    candidate: candidate({
      question_text: "So just so I'm clear, what's the commercial purpose behind this piece?",
      question_kind: 'other',
      target_signal_id: 'project:intended_use',
    }),
    expected_should_ask: false,
    acceptable_reason_codes: ['WORDING_ONLY_CHANGE', 'FACT_ALREADY_CONFIRMED'],
  },
]
