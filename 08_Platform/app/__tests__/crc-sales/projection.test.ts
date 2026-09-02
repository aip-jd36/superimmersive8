/**
 * CAH-3B — default Sales projection: correction semantics, append-only
 * content-presence, evidence-only generic handling, no interpretation.
 * (§13, §14, §23.D)
 */

import { buildSalesSessionProject } from '@/lib/crc-sales/projection'
import { emptyStructuredUnderstanding } from '@/lib/interview-engine/eval/empty-structured-understanding'
import type { StructuredUnderstanding, ToolMention, UserGoal, ContentPresenceMention } from '@/types/interview-engine'

function tool(overrides: Partial<ToolMention>): ToolMention {
  return {
    mention_id: 'm1',
    resolution: { kind: 'canonical', identifier: 'runway-gen3' },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'I used Runway',
    superseded_by: null,
    ...overrides,
  }
}
function goal(overrides: Partial<UserGoal>): UserGoal {
  return {
    goal_id: 'g1',
    state: 'confirmed',
    raw_text: 'Can I use it commercially?',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'x',
    ...overrides,
  }
}
function cpm(overrides: Partial<ContentPresenceMention>): ContentPresenceMention {
  return {
    mention_id: 'c1',
    category: 'person_visual_presence',
    real_or_synthetic: null,
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: '',
    superseded_by: null,
    ...overrides,
  }
}

describe('buildSalesSessionProject', () => {
  test('current (non-superseded) assertions only; superseded → correction_history verbatim', () => {
    const su: StructuredUnderstanding = {
      ...emptyStructuredUnderstanding(),
      tool_mentions: [
        tool({ mention_id: 'm-old', source_statement: 'I used Runway', superseded_by: 'm-new' }),
        tool({ mention_id: 'm-new', source_statement: 'Actually I used Kling', resolution: { kind: 'canonical', identifier: 'kling' } }),
      ],
      user_goals: [
        goal({ goal_id: 'g-old', raw_text: 'old question', superseded_by: 'g-new' }),
        goal({ goal_id: 'g-new', raw_text: 'new question' }),
      ],
    }
    const p = buildSalesSessionProject(su)
    expect(p.assertions.filter((a) => a.kind === 'tool').map((a) => a.stated)).toEqual(['Actually I used Kling'])
    expect(p.goals.map((g) => g.raw_text)).toEqual(['new question'])
    expect(p.correction_history.find((h) => h.kind === 'tool')?.stated).toBe('I used Runway')
    expect(p.correction_history.find((h) => h.kind === 'goal')?.stated).toBe('old question')
  })

  test('conflicting append-only content-presence statements are BOTH preserved; no synthesised resolution', () => {
    const su: StructuredUnderstanding = {
      ...emptyStructuredUnderstanding(),
      content_presence_mentions: [
        cpm({ mention_id: 'c1', source_statement: 'No real person appears', real_or_synthetic: 'synthetic' }),
        cpm({ mention_id: 'c2', source_statement: 'Actually my own face appears', real_or_synthetic: 'real' }),
      ],
    }
    const p = buildSalesSessionProject(su)
    const cp = p.assertions.filter((a) => a.kind === 'content_presence').map((a) => a.stated)
    expect(cp).toEqual(['No real person appears', 'Actually my own face appears'])
    // No merged/resolved value, no count.
    expect(JSON.stringify(p)).not.toMatch(/1 real|one real person|resolved/i)
  })

  test('verbatim source_statement is preserved; never reworded', () => {
    const statement = "I was the creative director and I personally handled the AI generation and the final edit — every shot."
    const su: StructuredUnderstanding = {
      ...emptyStructuredUnderstanding(),
      project_facts: {
        ...emptyStructuredUnderstanding().project_facts,
        human_contribution_description: { attestation: { state: 'confirmed', value: statement }, source_turn: 4, source_statement: statement },
      },
    }
    const p = buildSalesSessionProject(su)
    expect(p.assertions.find((a) => a.kind === 'human_contribution')?.stated).toBe(statement)
  })

  test('no risk / materiality / readiness / priority language anywhere in the projection', () => {
    const su: StructuredUnderstanding = {
      ...emptyStructuredUnderstanding(),
      tool_mentions: [tool({})],
      asset_provider_mentions: [
        {
          mention_id: 'ap1',
          resolution: { kind: 'canonical', identifier: 'istock' },
          confidence: 'confirmed',
          source_turn: 2,
          source_statement: 'I used iStock editorial footage',
          superseded_by: null,
          usage: { state: 'confirmed', value: 'other' },
          license: { state: 'unknown' },
        },
      ],
      user_goals: [goal({})],
    }
    const json = JSON.stringify(buildSalesSessionProject(su)).toLowerCase()
    for (const bad of ['risk', 'material', 'blocker', 'unsafe', 'needs evidence', 'will fail', 'priority', 'recommended', 'readiness', 'infring', 'editorial designation', 'self-attest']) {
      expect(json).not.toContain(bad)
    }
  })

  test('deterministic: same input → identical output', () => {
    const su: StructuredUnderstanding = { ...emptyStructuredUnderstanding(), tool_mentions: [tool({}), tool({ mention_id: 'm2', source_statement: 'and Kling' })], user_goals: [goal({})] }
    expect(buildSalesSessionProject(su)).toEqual(buildSalesSessionProject(su))
  })

  test('empty SU → empty project, never throws', () => {
    const p = buildSalesSessionProject(emptyStructuredUnderstanding())
    expect(p.goals).toEqual([])
    expect(p.assertions).toEqual([])
    expect(p.correction_history).toEqual([])
  })
})
