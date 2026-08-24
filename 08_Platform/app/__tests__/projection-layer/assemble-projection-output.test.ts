/**
 * Full ProjectionOutput assembly deterministic evaluation suite
 * (PROJECTION_LAYER_ARCHITECTURE.md §9, Prototype Beta, Slice 3). Every
 * case here is deterministic -- no live model, no LLM.
 */

import * as fs from 'fs'
import * as path from 'path'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff } from '@/types/interview-engine'

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

function tool(identifier: string, overrides: Partial<{ access_surface: string; plan_tier: string }> = {}) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown', ...overrides }
}

function retrievalResult(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    source_fact: { kind: 'tool', identifier: 'runway-gen3' },
    claim_id: 'runway-gen3',
    matrix_identifier: 'runway-gen3',
    publication_scope: 'CRC may state only that Runway permits commercial use across tiers.',
    candidate_statement: "Runway's current Terms allow commercial use across all subscription tiers.",
    last_verified: '2026-07-01',
    topic: 'commercial_use',
    unresolved_project_dependencies: [],
    // Governed Topic Relationships milestone (2026-08-16) defaults --
    // matches assembleResult's own exact_topic default for every
    // pre-existing tool-sourced fixture in this file.
    match_origin: 'exact_topic',
    matched_goal_category: 'commercial_use',
    relationship_id: null,
    ...overrides,
  }
}

describe('assembleProjectionOutput', () => {
  test('1: fully empty -> valid all-empty ProjectionOutput, never null, never an optional wrapper', () => {
    const { output, diagnostics } = assembleProjectionOutput(handoff(), [])
    expect(output).toEqual({ opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' })
    expect(diagnostics).toEqual([])
  })

  test('2: summary-only -- understood_summary non-empty, no knowledge items, fixed copy attached', () => {
    const { output } = assembleProjectionOutput(handoff({ tools: [tool('kling')] }), [])
    expect(output.opening_line).toBe("Here's what I understood about your workflow.")
    expect(output.understood_summary).toBe('You mentioned using kling.')
    expect(output.knowledge_items).toEqual([])
    expect(output.closing_cta).toBe('If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.')
  })

  test('3: knowledge-items-only -- empty handoff, one eligible result, fixed copy attached', () => {
    const { output } = assembleProjectionOutput(handoff(), [retrievalResult()])
    expect(output.opening_line).toBe("Here's what I understood about your workflow.")
    expect(output.understood_summary).toBe('')
    expect(output.knowledge_items).toHaveLength(1)
    expect(output.closing_cta).not.toBe('')
  })

  test('4: summary + knowledge items both present', () => {
    const { output } = assembleProjectionOutput(handoff({ tools: [tool('kling')] }), [retrievalResult()])
    expect(output.understood_summary).toBe('You mentioned using kling.')
    expect(output.knowledge_items).toHaveLength(1)
    expect(output.opening_line).not.toBe('')
    expect(output.closing_cta).not.toBe('')
  })

  test('5: single tool / single claim', () => {
    const { output } = assembleProjectionOutput(
      handoff({ tools: [tool('runway-gen3', { access_surface: 'API', plan_tier: 'Team' })] }),
      [retrievalResult({ claim_id: 'runway-gen3', matrix_identifier: 'runway-gen3' })],
    )
    expect(output.knowledge_items).toEqual([
      { claim_id: 'runway-gen3', statement: "Runway's current Terms allow commercial use across all subscription tiers.", last_verified: '2026-07-01' },
    ])
  })

  test('6: multi-tool -- multiple results, never merged into one item', () => {
    const { output } = assembleProjectionOutput(
      handoff({ tools: [tool('runway-gen3'), tool('kling')] }),
      [
        retrievalResult({ claim_id: 'runway-gen3', matrix_identifier: 'runway-gen3', candidate_statement: 'Runway statement.' }),
        retrievalResult({ claim_id: 'kling', matrix_identifier: 'kling', candidate_statement: 'Kling statement.' }),
      ],
    )
    expect(output.knowledge_items.map((i) => i.statement)).toEqual(['Runway statement.', 'Kling statement.'])
  })

  test('7: compound-row results (e.g. ElevenLabs shape) -- two distinct claims from the same matrix_identifier both surface independently', () => {
    const { output } = assembleProjectionOutput(handoff(), [
      retrievalResult({ claim_id: 'elevenlabs-commercial-tiering', matrix_identifier: 'elevenlabs', candidate_statement: 'Commercial tiering statement.' }),
      retrievalResult({ claim_id: 'elevenlabs-voice-consent', matrix_identifier: 'elevenlabs', candidate_statement: 'Voice consent statement.' }),
    ])
    expect(output.knowledge_items).toHaveLength(2)
    expect(output.knowledge_items.map((i) => i.claim_id).sort()).toEqual(['elevenlabs-commercial-tiering', 'elevenlabs-voice-consent'])
  })

  test('8: missing Candidate Statement -> diagnostic, no fabricated item, never falls back to publication_scope', () => {
    const { output, diagnostics } = assembleProjectionOutput(handoff(), [
      retrievalResult({ claim_id: 'kling', matrix_identifier: 'kling', candidate_statement: null }),
    ])
    expect(output.knowledge_items).toEqual([])
    expect(diagnostics).toEqual([{ claim_id: 'kling', reason: 'missing_candidate_statement' }])
  })

  test('9: full opt-out -- everything declined, still collapses to the same all-empty output as case 1', () => {
    const { output } = assembleProjectionOutput(
      handoff({
        certainty_state: 'declined',
        tools: [],
        unresolved_aliases: [],
        workflow_role: 'declined',
        intended_use: 'declined',
        scoped_observations: [
          { observation_id: 'so-1', scope: 'current_project', workflow_stage: null, confidence: 'declined', status: null, note: 'User asked to stop.', superseded_by: null, source_turn: 1, source_statement: 'x' },
        ],
      }),
      [],
    )
    expect(output).toEqual({ opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' })
  })

  test('10: opening/CTA are both empty on an all-empty result -- the system must not manufacture framing or a CTA with nothing to project', () => {
    const { output } = assembleProjectionOutput(handoff(), [])
    expect(output.opening_line).toBe('')
    expect(output.closing_cta).toBe('')
  })

  test('11: opening/CTA are both present and exactly the fixed v1 copy on any substantive result', () => {
    const { output } = assembleProjectionOutput(handoff({ tools: [tool('kling')] }), [])
    expect(output.opening_line).toBe("Here's what I understood about your workflow.")
    expect(output.closing_cta).toBe('If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.')
  })

  test('12: diagnostics remain outside ProjectionOutput -- returned as a sibling, never a field on output', () => {
    const result = assembleProjectionOutput(handoff(), [retrievalResult({ candidate_statement: null })])
    expect(Object.keys(result).sort()).toEqual(['diagnostics', 'output'])
    expect(Object.keys(result.output)).not.toContain('diagnostics')
    expect(result.diagnostics).toHaveLength(1)
  })

  test('13: no Publication Scope leakage anywhere in the assembled output', () => {
    const scope = 'CRC may state only that Runway permits commercial use -- this publication scope does not extend to ownership analysis.'
    const { output } = assembleProjectionOutput(handoff({ tools: [tool('runway-gen3')] }), [
      retrievalResult({ publication_scope: scope, candidate_statement: 'A distinct, unrelated candidate statement.' }),
    ])
    expect(JSON.stringify(output)).not.toContain('does not extend to ownership analysis')
  })

  test('module has no import of Matrix, Living Notebook, Retrieval-logic, or LLM/adapter code -- structural, not just discipline', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'projection-layer', 'assemble-projection-output.ts'), 'utf-8')
    const importLines = source.match(/^import .+$/gm) ?? []
    expect(importLines.length).toBeGreaterThan(0)

    const importText = importLines.join('\n')
    const forbiddenPatterns = [
      /matrix-fixture/i,
      /platform-rights-matrix/i,
      /living-notebook/i,
      /lib\/retrieval-engine\/(retrieve|lookup-rows|enumerate-eligible-claims|extract-matchable-facts|assemble-result)/i,
      /anthropic/i,
      /openai/i,
      /\bllm\b/i,
    ]
    for (const pattern of forbiddenPatterns) {
      expect(importText).not.toMatch(pattern)
    }

    // Only permitted imports: RetrievalHandoff's type module, RetrievalResult's type module
    // (an already-established exception, per project-knowledge-items.ts),
    // BoundedInterpretation's type module (the same exception extended to
    // Milestone 2's fourth subsystem, 2026-08-15 -- types only, never
    // lib/bounded-interpretation/rules or build-bounded-interpretation), and
    // this module's own sibling files within lib/projection-layer/.
    for (const line of importLines) {
      expect(line).toMatch(/@\/types\/interview-engine|@\/lib\/retrieval-engine\/types|@\/lib\/bounded-interpretation\/types|\.\/understood-summary|\.\/project-knowledge-items|\.\/types/)
    }
  })

  test('module never imports Bounded Interpretation LOGIC (rules.ts / build-bounded-interpretation.ts) -- types only, mirroring the RetrievalResult exception', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'projection-layer', 'assemble-projection-output.ts'), 'utf-8')
    const importText = (source.match(/^import .+$/gm) ?? []).join('\n')
    expect(importText).not.toMatch(/lib\/bounded-interpretation\/(rules|build-bounded-interpretation)/i)
  })
})

describe('assembleProjectionOutput -- interpretations parameter (CRC Milestone 2, 2026-08-15)', () => {
  function interpretation(overrides: Partial<import('@/lib/bounded-interpretation/types').BoundedInterpretation> = {}) {
    const summary = overrides.summary ?? 'Fixed template summary text.'
    return {
      goal_id: 'g-1',
      goal_text: 'Can I use this commercially?',
      category: 'commercial_use' as const,
      status: 'directly_relevant' as const,
      summary,
      summary_blocks: [summary],
      supporting_claim_ids: ['runway-gen3'],
      unresolved_relevant_claims: [],
      ...overrides,
    }
  }

  test('interpretations defaults to [] -- an existing caller that never passes the third argument is unaffected', () => {
    const { output } = assembleProjectionOutput(handoff({ tools: [tool('runway-gen3')] }), [retrievalResult()])
    expect(output.goal_interpretations).toEqual([])
  })

  test('a passed interpretation is narrowed to {goal_text, summary, summary_blocks} only -- goal_id, category, status, supporting_claim_ids never leak into ProjectionOutput', () => {
    const { output } = assembleProjectionOutput(handoff({ tools: [tool('runway-gen3')] }), [retrievalResult()], [interpretation()])
    expect(output.goal_interpretations).toEqual([
      { goal_text: 'Can I use this commercially?', summary: 'Fixed template summary text.', summary_blocks: ['Fixed template summary text.'] },
    ])
    const keys = Object.keys(output.goal_interpretations[0]).sort()
    expect(keys).toEqual(['goal_text', 'summary', 'summary_blocks'])
  })

  test('multiple interpretations are all rendered, in order, none dropped', () => {
    const { output } = assembleProjectionOutput(handoff(), [], [
      interpretation({ goal_id: 'g-1', goal_text: 'first goal', summary: 'first summary', summary_blocks: ['first summary'] }),
      interpretation({ goal_id: 'g-2', goal_text: 'second goal', summary: 'second summary', summary_blocks: ['second summary'] }),
    ])
    expect(output.goal_interpretations).toEqual([
      { goal_text: 'first goal', summary: 'first summary', summary_blocks: ['first summary'] },
      { goal_text: 'second goal', summary: 'second summary', summary_blocks: ['second summary'] },
    ])
  })

  test('a non-empty interpretations array alone (no facts, no knowledge_items) is substantive enough to escape the fully-empty branch -- opening_line/closing_cta still render', () => {
    const { output } = assembleProjectionOutput(handoff(), [], [interpretation()])
    expect(output.opening_line).not.toBe('')
    expect(output.closing_cta).not.toBe('')
    expect(output.understood_summary).toBe('')
    expect(output.knowledge_items).toEqual([])
    expect(output.goal_interpretations).toHaveLength(1)
  })

  test('fully empty still requires goal_interpretations empty too -- zero facts, zero knowledge, zero interpretations triggers the all-empty branch exactly as before Milestone 2', () => {
    const { output } = assembleProjectionOutput(handoff(), [], [])
    expect(output).toEqual({ opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' })
  })
})
