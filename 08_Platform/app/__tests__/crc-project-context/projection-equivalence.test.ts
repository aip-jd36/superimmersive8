/**
 * CAH-4B §3 / §14 — the neutral CRC project-context projection is behaviorally
 * IDENTICAL to the pre-extraction Sales projection.
 *
 * `lib/crc-sales/projection.ts` is now a thin re-export of
 * `buildCrcProjectContext`. This suite:
 *   1. re-runs the exact assertions the original `buildSalesSessionProject`
 *      suite made, against `buildCrcProjectContext` directly;
 *   2. proves `buildSalesSessionProject(su) === buildCrcProjectContext(su)`
 *      (deep-equal) for every representative fixture — the Sales entrypoint
 *      produces exactly what the neutral function produces;
 *   3. proves no fact was added or removed, corrections are preserved,
 *      contradictions are not resolved, and no discovered relevance becomes a
 *      goal.
 */

import { buildCrcProjectContext } from '@/lib/crc-project-context/projection'
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

// ── Representative fixtures (superset of the original Sales suite) ──────────

const FIXTURES: Record<string, () => StructuredUnderstanding> = {
  empty: () => emptyStructuredUnderstanding(),
  supersession: () => ({
    ...emptyStructuredUnderstanding(),
    tool_mentions: [
      tool({ mention_id: 'm-old', source_statement: 'I used Runway', superseded_by: 'm-new' }),
      tool({ mention_id: 'm-new', source_statement: 'Actually I used Kling', resolution: { kind: 'canonical', identifier: 'kling' } }),
    ],
    user_goals: [
      goal({ goal_id: 'g-old', raw_text: 'old question', superseded_by: 'g-new' }),
      goal({ goal_id: 'g-new', raw_text: 'new question' }),
    ],
  }),
  conflicting_content_presence: () => ({
    ...emptyStructuredUnderstanding(),
    content_presence_mentions: [
      cpm({ mention_id: 'c1', source_statement: 'No real person appears', real_or_synthetic: 'synthetic' }),
      cpm({ mention_id: 'c2', source_statement: 'Actually my own face appears', real_or_synthetic: 'real' }),
    ],
  }),
  verbatim_contribution: () => {
    const statement = "I was the creative director and I personally handled the AI generation and the final edit — every shot."
    return {
      ...emptyStructuredUnderstanding(),
      project_facts: {
        ...emptyStructuredUnderstanding().project_facts,
        human_contribution_description: { attestation: { state: 'confirmed', value: statement }, source_turn: 4, source_statement: statement },
      },
    }
  },
  provider_and_goal: () => ({
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
  }),
  multi_tool: () => ({
    ...emptyStructuredUnderstanding(),
    tool_mentions: [tool({}), tool({ mention_id: 'm2', source_statement: 'and Kling' })],
    user_goals: [goal({})],
  }),
}

describe('CAH-4B — neutral projection ≡ Sales projection', () => {
  test.each(Object.keys(FIXTURES))('%s: buildSalesSessionProject deep-equals buildCrcProjectContext', (name) => {
    const su = FIXTURES[name]()
    expect(buildSalesSessionProject(su)).toEqual(buildCrcProjectContext(su))
  })

  test('supersession: current assertions only; superseded → correction_history verbatim', () => {
    const p = buildCrcProjectContext(FIXTURES.supersession())
    expect(p.assertions.filter((a) => a.kind === 'tool').map((a) => a.stated)).toEqual(['Actually I used Kling'])
    expect(p.goals.map((g) => g.raw_text)).toEqual(['new question'])
    expect(p.correction_history.find((h) => h.kind === 'tool')?.stated).toBe('I used Runway')
    expect(p.correction_history.find((h) => h.kind === 'goal')?.stated).toBe('old question')
  })

  test('conflicting append-only content-presence: BOTH preserved; no synthesised resolution', () => {
    const p = buildCrcProjectContext(FIXTURES.conflicting_content_presence())
    expect(p.assertions.filter((a) => a.kind === 'content_presence').map((a) => a.stated)).toEqual([
      'No real person appears',
      'Actually my own face appears',
    ])
    expect(JSON.stringify(p)).not.toMatch(/1 real|one real person|resolved/i)
  })

  test('verbatim source_statement preserved; never reworded', () => {
    const statement = "I was the creative director and I personally handled the AI generation and the final edit — every shot."
    const p = buildCrcProjectContext(FIXTURES.verbatim_contribution())
    expect(p.assertions.find((a) => a.kind === 'human_contribution')?.stated).toBe(statement)
  })

  test('no risk / materiality / readiness / priority language anywhere', () => {
    const json = JSON.stringify(buildCrcProjectContext(FIXTURES.provider_and_goal())).toLowerCase()
    for (const bad of ['risk', 'material', 'blocker', 'unsafe', 'needs evidence', 'will fail', 'priority', 'recommended', 'readiness', 'infring', 'editorial designation', 'self-attest']) {
      expect(json).not.toContain(bad)
    }
  })

  test('deterministic + empty SU never throws', () => {
    const su = FIXTURES.multi_tool()
    expect(buildCrcProjectContext(su)).toEqual(buildCrcProjectContext(su))
    const e = buildCrcProjectContext(emptyStructuredUnderstanding())
    expect(e).toEqual({ goals: [], assertions: [], correction_history: [] })
  })

  test('no discovered relevance becomes a UserGoal — goals come ONLY from su.user_goals', () => {
    // A tool mention present, NO user_goals: zero goals must be produced.
    const su: StructuredUnderstanding = { ...emptyStructuredUnderstanding(), tool_mentions: [tool({})], user_goals: [] }
    expect(buildCrcProjectContext(su).goals).toEqual([])
    // A superseded goal is NOT a current goal.
    const su2: StructuredUnderstanding = {
      ...emptyStructuredUnderstanding(),
      user_goals: [goal({ goal_id: 'gx', raw_text: 'superseded goal', superseded_by: 'gy' })],
    }
    expect(buildCrcProjectContext(su2).goals).toEqual([])
    expect(buildCrcProjectContext(su2).correction_history.map((h) => h.stated)).toEqual(['superseded goal'])
  })
})
