/**
 * Pending clarification deterministic test suite
 * (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §3, Live Interview Runtime
 * milestone). No live model -- buildPendingClarification is a pure
 * function of (CandidateQuestionProposal, StructuredUnderstanding).
 */

import * as fs from 'fs'
import * as path from 'path'
import { buildPendingClarification } from '@/lib/interview-engine/pending-clarification'
import { PROJECT_FACT_SIGNAL_IDS, type CandidateQuestionProposal } from '@/lib/interview-engine/candidate-question'
import type { ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '@/types/interview-engine'

function su(overrides: Partial<{ tool_mentions: ToolMention[]; scoped_observations: ScopedObservation[]; project_facts: ProjectFacts }> = {}): StructuredUnderstanding {
  return {
    project_facts: overrides.project_facts ?? {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: overrides.tool_mentions ?? [],
    scoped_observations: overrides.scoped_observations ?? [],
    user_goals: [],
    asset_provider_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function proposal(overrides: Partial<CandidateQuestionProposal> = {}): CandidateQuestionProposal {
  return {
    question_text: 'placeholder question text -- must never appear in unresolved_summary',
    question_kind: 'follow_up_on_signal',
    target_signal_id: 'tm-1',
    phase: 2,
    ...overrides,
  }
}

function tool(overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: 'tm-1',
    resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
    access_surface: { state: 'unresolved_no_visibility' },
    plan_tier: { state: 'unknown' },
    confidence: 'unresolved_no_visibility',
    source_turn: 1,
    source_statement: 'x',
    superseded_by: null,
    ...overrides,
  }
}

function observation(overrides: Partial<ScopedObservation> = {}): ScopedObservation {
  return {
    observation_id: 'so-1',
    scope: 'current_project',
    workflow_stage: null,
    confidence: 'unresolved_no_visibility',
    status: null,
    note: 'x',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'x',
    ...overrides,
  }
}

describe('buildPendingClarification -- eligible kinds', () => {
  test('follow_up_on_signal targeting an unresolved tool alias produces a pending clarification', () => {
    const result = buildPendingClarification(proposal({ question_kind: 'follow_up_on_signal', target_signal_id: 'tm-1' }), su({ tool_mentions: [tool()] }))
    expect(result).toEqual({ signal_id: 'tm-1', kind: 'follow_up_on_signal', unresolved_summary: "tool mention 'Nano Banana', not yet resolved to a specific platform" })
  })

  test('uncertainty_clarification targeting a resolved tool produces a pending clarification', () => {
    const result = buildPendingClarification(
      proposal({ question_kind: 'uncertainty_clarification', target_signal_id: 'tm-1' }),
      su({ tool_mentions: [tool({ resolution: { kind: 'canonical', identifier: 'gemini-api' } })] }),
    )
    expect(result).toEqual({ signal_id: 'tm-1', kind: 'uncertainty_clarification', unresolved_summary: "tool mention 'gemini-api'" })
  })

  test('targeting a scoped_observation', () => {
    const result = buildPendingClarification(
      proposal({ target_signal_id: 'so-1' }),
      su({ scoped_observations: [observation({ scope: 'historical_project', confidence: 'unknown' })] }),
    )
    expect(result).toEqual({ signal_id: 'so-1', kind: 'follow_up_on_signal', unresolved_summary: 'a historical_project observation, currently unknown' })
  })

  test('targeting the intended_use project fact', () => {
    const result = buildPendingClarification(
      proposal({ target_signal_id: PROJECT_FACT_SIGNAL_IDS.intended_use }),
      su({ project_facts: { intended_use: { attestation: { state: 'unresolved_no_visibility' }, source_turn: 1, source_statement: 'x' }, workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' }, jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' } } }),
    )
    expect(result).toEqual({ signal_id: PROJECT_FACT_SIGNAL_IDS.intended_use, kind: 'follow_up_on_signal', unresolved_summary: 'project fact intended_use, currently unresolved_no_visibility' })
  })

  test('targeting the workflow_role project fact', () => {
    const result = buildPendingClarification(proposal({ target_signal_id: PROJECT_FACT_SIGNAL_IDS.workflow_role }), su())
    expect(result).toEqual({ signal_id: PROJECT_FACT_SIGNAL_IDS.workflow_role, kind: 'follow_up_on_signal', unresolved_summary: 'project fact workflow_role, currently unknown' })
  })

  test('unresolved_summary never contains the proposal\'s own live-generated question_text -- deterministic templating only, per Option D3', () => {
    const result = buildPendingClarification(proposal({ target_signal_id: 'tm-1' }), su({ tool_mentions: [tool()] }))
    expect(result?.unresolved_summary).not.toContain('placeholder question text')
  })
})

describe('buildPendingClarification -- ineligible kinds and edge cases -> null', () => {
  test.each(['historical_experience', 'incident_investigation', 'disentangling_question', 'other'] as const)(
    'kind "%s" never carries a target_signal_id in practice, and produces null even if one were somehow present',
    (kind) => {
      expect(buildPendingClarification(proposal({ question_kind: kind, target_signal_id: 'tm-1' }), su({ tool_mentions: [tool()] }))).toBeNull()
    },
  )

  test('null target_signal_id -> null', () => {
    expect(buildPendingClarification(proposal({ target_signal_id: null }), su())).toBeNull()
  })

  test('target_signal_id referencing a superseded tool_mention -> null (not found among active records)', () => {
    const result = buildPendingClarification(proposal({ target_signal_id: 'tm-1' }), su({ tool_mentions: [tool({ superseded_by: 'tm-2' })] }))
    expect(result).toBeNull()
  })

  test('target_signal_id referencing a superseded scoped_observation -> null', () => {
    const result = buildPendingClarification(proposal({ target_signal_id: 'so-1' }), su({ scoped_observations: [observation({ superseded_by: 'so-2' })] }))
    expect(result).toBeNull()
  })

  test('target_signal_id matching nothing at all -> null', () => {
    expect(buildPendingClarification(proposal({ target_signal_id: 'does-not-exist' }), su())).toBeNull()
  })
})

describe('buildPendingClarification -- structural import boundary', () => {
  test('module has no import of Retrieval, Projection, Matrix, or LLM/adapter code -- only candidate-question.ts and the shared types module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'interview-engine', 'pending-clarification.ts'), 'utf-8')
    const importLines = source.match(/^import .+$/gm) ?? []
    expect(importLines.length).toBeGreaterThan(0)
    const importText = importLines.join('\n')
    expect(importText).not.toMatch(/retrieval-engine|projection-layer|matrix-fixture|anthropic|openai/i)
  })
})
