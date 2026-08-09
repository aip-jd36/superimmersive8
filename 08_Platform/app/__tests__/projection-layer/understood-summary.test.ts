/**
 * "What we understood" summary deterministic evaluation suite
 * (PROJECTION_LAYER_ARCHITECTURE.md §9, Prototype Beta, Slice 2). Every
 * case here is deterministic -- no live model, matching this slice's own
 * [PROTOTYPE ASSUMPTION -- TO VALIDATE] that a live model is not needed
 * for this path at all.
 */

import * as fs from 'fs'
import * as path from 'path'
import { buildUnderstoodFacts, renderUnderstoodSummary } from '@/lib/projection-layer/understood-summary'
import type { ObservationScope, RetrievalHandoff, ScopedObservation } from '@/types/interview-engine'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
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

function observation(overrides: Partial<ScopedObservation> & Pick<ScopedObservation, 'observation_id' | 'confidence' | 'scope' | 'note'>): ScopedObservation {
  return {
    workflow_stage: null,
    status: null,
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

describe('buildUnderstoodFacts -- structured extraction', () => {
  test('tools mapped with sentinel-to-null collapse on access_surface/plan_tier', () => {
    const out = buildUnderstoodFacts(handoff({ tools: [tool('kling', { access_surface: 'unresolved', plan_tier: 'unknown' })] }))
    expect(out.tools).toEqual([{ identifier: 'kling', access_surface: null, plan_tier: null }])
  })

  test('a real access_surface/plan_tier value is preserved verbatim', () => {
    const out = buildUnderstoodFacts(handoff({ tools: [tool('runway-gen3', { access_surface: 'API', plan_tier: 'Team' })] }))
    expect(out.tools).toEqual([{ identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' }])
  })

  test('confirmed_absent and declined on tool-level fields also collapse to null (reachable runtime values RetrievalHandoffTool\'s own type under-declares)', () => {
    const out = buildUnderstoodFacts(handoff({ tools: [tool('elevenlabs', { access_surface: 'confirmed_absent', plan_tier: 'declined' })] }))
    expect(out.tools).toEqual([{ identifier: 'elevenlabs', access_surface: null, plan_tier: null }])
  })

  test('unresolved_aliases copied verbatim', () => {
    const out = buildUnderstoodFacts(handoff({ unresolved_aliases: ['Nano Banana'] }))
    expect(out.unresolved_tool_mentions).toEqual(['Nano Banana'])
  })

  test.each(['unresolved', 'unknown', 'unclear', 'confirmed_absent', 'declined'])('workflow_role sentinel %s collapses to null', (sentinel) => {
    expect(buildUnderstoodFacts(handoff({ workflow_role: sentinel })).workflow_role).toBeNull()
  })

  test.each(['unresolved', 'unknown', 'unclear', 'confirmed_absent', 'declined'])('intended_use sentinel %s collapses to null', (sentinel) => {
    expect(buildUnderstoodFacts(handoff({ intended_use: sentinel })).intended_use).toBeNull()
  })

  test('a real workflow_role/intended_use value is preserved verbatim', () => {
    const out = buildUnderstoodFacts(handoff({ workflow_role: 'Producer', intended_use: 'Paid social ad campaign' }))
    expect(out.workflow_role).toBe('Producer')
    expect(out.intended_use).toBe('Paid social ad campaign')
  })

  test('only confirmed/confirmed_absent observations survive; unresolved_no_visibility/unknown/declined are dropped', () => {
    const out = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'A' }),
          observation({ observation_id: 'so-2', scope: 'current_project', confidence: 'confirmed_absent', note: 'B' }),
          observation({ observation_id: 'so-3', scope: 'current_project', confidence: 'unresolved_no_visibility', note: 'C' }),
          observation({ observation_id: 'so-4', scope: 'current_project', confidence: 'unknown', note: 'D' }),
          observation({ observation_id: 'so-5', scope: 'current_project', confidence: 'declined', note: 'E' }),
        ],
      }),
    )
    expect(out.observations.map((o) => o.note)).toEqual(['A', 'B'])
  })

  test('observation scope is preserved, never collapsed', () => {
    const out = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'Current fact.' }),
          observation({ observation_id: 'so-2', scope: 'historical_project', confidence: 'confirmed', note: 'Historical fact.' }),
        ],
      }),
    )
    expect(out.observations).toEqual([
      { scope: 'current_project', note: 'Current fact.' },
      { scope: 'historical_project', note: 'Historical fact.' },
    ])
  })
})

describe('renderUnderstoodSummary -- required cases', () => {
  test('1: one tool, known intended use', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], intended_use: 'Paid social ad campaign' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using kling. You mentioned this is for Paid social ad campaign.')
  })

  test('2: multiple tools', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('runway-gen3'), tool('kling'), tool('elevenlabs')] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using runway-gen3, kling, and elevenlabs.')
  })

  test('3: different access surfaces / tiers rendered per tool, never merged into one value', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        tools: [tool('runway-gen3', { access_surface: 'API', plan_tier: 'Team' }), tool('elevenlabs', { access_surface: 'Web app', plan_tier: 'Personal' })],
      }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using runway-gen3 (API, Team) and elevenlabs (Web app, Personal).')
  })

  test('4: current-project observation only', () => {
    const facts = buildUnderstoodFacts(
      handoff({ scoped_observations: [observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'Visuals generated in Runway.' })] }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('On the current project: Visuals generated in Runway.')
  })

  test('5: historical-project observation only', () => {
    const facts = buildUnderstoodFacts(
      handoff({ scoped_observations: [observation({ observation_id: 'so-1', scope: 'historical_project', confidence: 'confirmed', note: 'A past project used Kling.' })] }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('From a past project: A past project used Kling.')
  })

  test('6: mixed current + historical observations -- two separate clauses, never merged', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed_absent', note: 'No one reviewed this project before delivery.' }),
          observation({ observation_id: 'so-2', scope: 'historical_project', confidence: 'confirmed', note: 'A past project did go through internal legal review before delivery.' }),
        ],
      }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('On the current project: No one reviewed this project before delivery. From a past project: A past project did go through internal legal review before delivery.')
  })

  test('7: unresolved alias -- distinct clause, never conflated with resolved tools', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], unresolved_aliases: ['Nano Banana'] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using kling. You also mentioned "Nano Banana", which I wasn\'t able to match to a specific platform yet.')
  })

  test('7b: unresolved alias with no resolved tools at all -- leading phrasing adjusts, no dangling "also"', () => {
    const facts = buildUnderstoodFacts(handoff({ unresolved_aliases: ['Nano Banana'] }))
    expect(renderUnderstoodSummary(facts)).toBe('You mentioned "Nano Banana", which I wasn\'t able to match to a specific platform yet.')
  })

  test('regression: an access_surface value that already contains parenthetical detail is not double-wrapped in a second set of parens', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('gemini-api', { access_surface: 'API (developer key)', plan_tier: 'unknown' })] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using gemini-api — API (developer key).')
    expect((out.match(/\(/g) ?? []).length).toBe(1)
    expect((out.match(/\)/g) ?? []).length).toBe(1)
  })

  test('regression: nested-parens fix also applies when the OTHER part (plan_tier) is the one carrying parens, and when both parts are present', () => {
    const facts = buildUnderstoodFacts(
      handoff({ tools: [tool('runway-gen3', { access_surface: 'API', plan_tier: 'Enterprise (custom terms)' })] }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using runway-gen3 — API, Enterprise (custom terms).')
    expect((out.match(/\(/g) ?? []).length).toBe(1)
  })

  test('8: unknown tier -- omitted from tool description entirely, never rendered as the literal word "unknown"', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling', { access_surface: 'Web app', plan_tier: 'unknown' })] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using kling (Web app).')
    expect(out).not.toContain('unknown')
  })

  test('9: unclear intended use -- no intended_use clause at all', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], intended_use: 'unclear' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using kling.')
    expect(out).not.toContain('unclear')
  })

  test('10: declined field -- no clause rendered, never says "declined"', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], workflow_role: 'declined', intended_use: 'declined' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using kling.')
    expect(out).not.toContain('declined')
  })

  test('11: sparse gate_1_unmet handoff -- matches the architecture doc\'s own worked example exactly', () => {
    const facts = buildUnderstoodFacts(handoff({ certainty_state: 'gate_1_unmet', tools: [tool('kling')] }))
    expect(renderUnderstoodSummary(facts)).toBe('You mentioned using kling.')
  })

  test('12: full opt-out -- everything declined, empty string result, never an error or placeholder text', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        certainty_state: 'declined',
        tools: [],
        unresolved_aliases: [],
        workflow_role: 'declined',
        intended_use: 'declined',
        scoped_observations: [observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'declined', note: 'User asked to stop the interview.' })],
      }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('')
  })

  test('13: confirmed absence is rendered -- a stated absence is not a gap', () => {
    const facts = buildUnderstoodFacts(
      handoff({ scoped_observations: [observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed_absent', note: 'No one reviewed this project before delivery.' })] }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('On the current project: No one reviewed this project before delivery.')
  })

  test('14: multiple observations in one workflow (same scope) -- joined into one clause, not exploded into repeated scope labels', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'Visuals generated in Runway.' }),
          observation({ observation_id: 'so-2', scope: 'current_project', confidence: 'confirmed', note: 'Voiceover generated in ElevenLabs.' }),
          observation({ observation_id: 'so-3', scope: 'current_project', confidence: 'confirmed', note: 'Internal legal already reviewed and approved this piece.' }),
        ],
      }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('On the current project: Visuals generated in Runway. Voiceover generated in ElevenLabs. Internal legal already reviewed and approved this piece.')
    expect(out.match(/On the current project:/g)?.length).toBe(1)
  })

  test('15: empty/near-empty handoff -- empty string, never an error', () => {
    expect(renderUnderstoodSummary(buildUnderstoodFacts(handoff()))).toBe('')
  })

  test('general_practice observation renders with its own distinct label', () => {
    const facts = buildUnderstoodFacts(
      handoff({ scoped_observations: [observation({ observation_id: 'so-1', scope: 'general_practice', confidence: 'confirmed', note: 'This creator typically reviews all output before delivery.' })] }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('In general: This creator typically reviews all output before delivery.')
  })

  test('all three scopes present -- rendered in a fixed, stable order (current, historical, general), never input order', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'general_practice', confidence: 'confirmed', note: 'General note.' }),
          observation({ observation_id: 'so-2', scope: 'historical_project', confidence: 'confirmed', note: 'Historical note.' }),
          observation({ observation_id: 'so-3', scope: 'current_project', confidence: 'confirmed', note: 'Current note.' }),
        ],
      }),
    )
    const out = renderUnderstoodSummary(facts)
    const currentIdx = out.indexOf('On the current project')
    const historicalIdx = out.indexOf('From a past project')
    const generalIdx = out.indexOf('In general')
    expect(currentIdx).toBeLessThan(historicalIdx)
    expect(historicalIdx).toBeLessThan(generalIdx)
  })
})

describe('renderUnderstoodSummary -- negative assertions', () => {
  const forbiddenWords = ['safe', 'compliant', 'approved', 'cleared', 'low risk', 'high risk', 'you should', 'you can use this commercially', 'risk']

  test.each(forbiddenWords)('fixed template phrases never contain the word/phrase "%s"', (word) => {
    // Exercise every clause path at once with a rich, all-fields-populated handoff, then check the
    // fixed connective phrasing (not fixture-supplied note text, which is out of this module's control).
    const facts = buildUnderstoodFacts(
      handoff({
        tools: [tool('runway-gen3', { access_surface: 'API', plan_tier: 'Team' })],
        unresolved_aliases: ['Nano Banana'],
        workflow_role: 'Producer',
        intended_use: 'Paid social ad campaign',
      }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out.toLowerCase()).not.toContain(word)
  })

  test('module has no import of Matrix, Living Notebook, Retrieval-logic, or LLM/adapter code -- structural, not just discipline', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'projection-layer', 'understood-summary.ts'), 'utf-8')
    const importLines = source.match(/^import .+$/gm) ?? []
    expect(importLines.length).toBeGreaterThan(0)

    const importText = importLines.join('\n')
    const forbiddenPatterns = [
      /matrix-fixture/i,
      /platform-rights-matrix/i,
      /living-notebook/i,
      /lib\/retrieval-engine/i,
      /anthropic/i,
      /openai/i,
      /\bllm\b/i,
    ]
    for (const pattern of forbiddenPatterns) {
      expect(importText).not.toMatch(pattern)
    }

    // Only permitted import: RetrievalHandoff's own type module.
    for (const line of importLines) {
      expect(line).toMatch(/@\/types\/interview-engine/)
    }
  })
})
