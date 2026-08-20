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
    expect(out).toBe('You mentioned using kling. The intended use: Paid social ad campaign.')
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

describe('observationClauses -- same-scope sentence separation (A2 fix, 2026-08-15)', () => {
  test('one observation, no punctuation, lowercase start -- capitalized and terminated, no content loss', () => {
    const facts = buildUnderstoodFacts(
      handoff({ scoped_observations: [observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'the client gave me some images and their logo for me to use' })] }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('On the current project: The client gave me some images and their logo for me to use.')
  })

  test('two same-scope observations, real production shape -- rendered as two separate sentences, not a run-on', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'c2', scope: 'current_project', confidence: 'confirmed', note: 'My agency has an executive producer that reviews and verifies my work.' }),
          observation({ observation_id: 'c1', scope: 'current_project', confidence: 'confirmed', note: 'the client gave me some images and their logo for me to use' }),
        ],
      }),
    )
    expect(renderUnderstoodSummary(facts)).toBe(
      'On the current project: My agency has an executive producer that reviews and verifies my work. The client gave me some images and their logo for me to use.',
    )
  })

  test('three same-scope observations -- each its own sentence, single scope label, no content loss', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'the executive producer reviews all work' }),
          observation({ observation_id: 'so-2', scope: 'current_project', confidence: 'confirmed', note: 'the client provided images and a logo' }),
          observation({ observation_id: 'so-3', scope: 'current_project', confidence: 'confirmed', note: 'delivery is scheduled for next week' }),
        ],
      }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe(
      'On the current project: The executive producer reviews all work. The client provided images and a logo. Delivery is scheduled for next week.',
    )
    expect(out.match(/On the current project:/g)?.length).toBe(1)
  })

  test('punctuation already present -- never double-punctuated', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'Is this ready for review?' }),
          observation({ observation_id: 'so-2', scope: 'current_project', confidence: 'confirmed', note: 'Great news!' }),
        ],
      }),
    )
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('On the current project: Is this ready for review? Great news!')
    expect(out).not.toContain('?.')
    expect(out).not.toContain('!.')
  })

  test('capitalization already present -- never double-capitalized or altered', () => {
    const facts = buildUnderstoodFacts(
      handoff({ scoped_observations: [observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'ElevenLabs was used for the voiceover.' })] }),
    )
    expect(renderUnderstoodSummary(facts)).toBe('On the current project: ElevenLabs was used for the voiceover.')
  })

  test('no content loss -- every word from every note survives, only capitalization/terminal punctuation added', () => {
    const notes = ['the client gave me some images and their logo for me to use', 'my agency has an executive producer that reviews my work']
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: notes.map((note, i) => observation({ observation_id: `so-${i}`, scope: 'current_project', confidence: 'confirmed', note })),
      }),
    )
    const out = renderUnderstoodSummary(facts)
    for (const note of notes) {
      const words = note.split(' ')
      // First word's capitalization may differ (sentence-start); every other word must survive verbatim.
      for (const word of words.slice(1)) {
        expect(out).toContain(word)
      }
    }
  })

  test('existing well-formed-sentence fixtures are unaffected (already capitalized, already punctuated -- toSentence is a no-op)', () => {
    const facts = buildUnderstoodFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', scope: 'current_project', confidence: 'confirmed', note: 'Visuals generated in Runway.' }),
          observation({ observation_id: 'so-2', scope: 'current_project', confidence: 'confirmed', note: 'Voiceover generated in ElevenLabs.' }),
          observation({ observation_id: 'so-3', scope: 'current_project', confidence: 'confirmed', note: 'Internal legal already reviewed and approved this piece.' }),
        ],
      }),
    )
    expect(renderUnderstoodSummary(facts)).toBe(
      'On the current project: Visuals generated in Runway. Voiceover generated in ElevenLabs. Internal legal already reviewed and approved this piece.',
    )
  })
})

describe('roleClause -- rendering-contract robustness fix (CRC production hygiene, 2026-08-16, canonical session fd92b4aa-072f-4d45-918f-ea520231b0d0)', () => {
  test('1: noun-phrase role renders naturally', () => {
    const facts = buildUnderstoodFacts(handoff({ workflow_role: 'a solo freelancer' }))
    expect(renderUnderstoodSummary(facts)).toBe('Your role on this: a solo freelancer.')
  })

  test('2: sentence-shaped role (the real production value) renders grammatically, not as a predicate-copula collision', () => {
    const facts = buildUnderstoodFacts(handoff({ workflow_role: 'I created all the images and brand assets' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('Your role on this: I created all the images and brand assets.')
    expect(out).not.toContain('is I created')
  })

  test('3: another sentence-shaped role renders grammatically', () => {
    const facts = buildUnderstoodFacts(handoff({ workflow_role: "I'm the person directly creating the AI content" }))
    expect(renderUnderstoodSummary(facts)).toBe("Your role on this: I'm the person directly creating the AI content.")
  })

  test('4: empty/unknown role -- no clause rendered at all, same as before this fix', () => {
    for (const sentinel of ['unresolved', 'unknown', 'unclear', 'confirmed_absent', 'declined']) {
      const facts = buildUnderstoodFacts(handoff({ workflow_role: sentinel }))
      expect(renderUnderstoodSummary(facts)).not.toContain('Your role on this')
    }
  })

  test('the value is preserved verbatim -- zero rewriting, zero shape detection, zero truncation', () => {
    const sentenceValue = 'I created all the images and brand assets'
    const facts = buildUnderstoodFacts(handoff({ workflow_role: sentenceValue }))
    expect(renderUnderstoodSummary(facts)).toContain(sentenceValue)
  })
})

describe('asset provider rendering (Living Knowledge — Third-Party Source Rights, M1+M2, 2026-08-18)', () => {
  test('a recognized provider renders as a source-provider mention, never as an unresolved AI platform', () => {
    const facts = buildUnderstoodFacts(handoff({ asset_providers: ['getty'] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using Getty Images as a source provider.')
    expect(out).not.toContain("wasn't able to match")
    expect(out).not.toContain('platform')
  })

  test('multiple recognized providers are joined naturally', () => {
    const facts = buildUnderstoodFacts(handoff({ asset_providers: ['getty', 'shutterstock'] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned using Getty Images and Shutterstock as a source provider.')
  })

  test('an unresolved provider-like name renders neutrally -- never called an unresolved AI platform, never overstating recognition', () => {
    const facts = buildUnderstoodFacts(handoff({ unresolved_asset_provider_mentions: ['PhotoMega'] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('You mentioned "PhotoMega" as a possible source provider, which I wasn\'t able to match yet.')
    expect(out).not.toContain('platform')
  })

  test('a resolved provider and an unresolved AI tool alias coexist without conflation -- distinct clauses, distinct wording', () => {
    const facts = buildUnderstoodFacts(handoff({ asset_providers: ['getty'], unresolved_aliases: ['Nano Banana'] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toContain('You mentioned using Getty Images as a source provider.')
    expect(out).toContain('"Nano Banana", which I wasn\'t able to match to a specific platform yet.')
  })

  test('an AI tool and a source provider both present render as two structurally distinct clauses, never merged into one', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], asset_providers: ['getty'] }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toContain('You mentioned using kling.')
    expect(out).toContain('You also mentioned using Getty Images as a source provider.')
  })

  test('an unknown canonical identifier (not in the display-label map) falls back to the raw identifier, never throws', () => {
    const facts = buildUnderstoodFacts(handoff({ asset_providers: ['some-future-provider'] }))
    expect(() => renderUnderstoodSummary(facts)).not.toThrow()
    expect(renderUnderstoodSummary(facts)).toContain('some-future-provider')
  })

  test('no asset providers and no unresolved provider mentions -- clause is entirely absent, not an empty placeholder', () => {
    const facts = buildUnderstoodFacts(handoff())
    expect(renderUnderstoodSummary(facts)).toBe('')
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

// ── P2 Summary/Role-Copy Diagnostic + Implementation, 2026-08-20 ──
// intendedUseClause grammar hardening: ProjectFacts.intended_use carries no
// shape guarantee (a bare fragment, a noun phrase, or a full sentence are
// all equally valid extractor output), so the renderer must produce
// grammatical, deterministic prose for any of those shapes without ever
// requiring extraction to change. Mirrors roleClause's own 2026-08-16 fix
// exactly (colon-appositive + toSentence()), confirmed live to close both
// real production defects: the "for for a client" double-preposition bug
// and the "...for They're going to use it in paid ads.." broken-framing +
// duplicated-period bug.

describe('intendedUseClause grammar hardening (P2, 2026-08-20)', () => {
  test('A. "for a client" -- no "for for", grammatical', () => {
    const facts = buildUnderstoodFacts(handoff({ intended_use: 'for a client' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).not.toContain('for for')
    expect(out).toBe('The intended use: For a client.')
  })

  test('B. "paid ads" -- grammatical', () => {
    const facts = buildUnderstoodFacts(handoff({ intended_use: 'paid ads' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('The intended use: Paid ads.')
  })

  test('C. "They\'re going to use it in paid ads." -- grammatical, no duplicated period, no broken preposition framing (the exact real second observed UAT defect)', () => {
    const facts = buildUnderstoodFacts(handoff({ intended_use: "They're going to use it in paid ads." }))
    const out = renderUnderstoodSummary(facts)
    expect(out).not.toContain('..')
    expect(out).not.toContain('for They')
    expect(out).toBe("The intended use: They're going to use it in paid ads.")
  })

  test('D. "commercially" -- grammatical', () => {
    const facts = buildUnderstoodFacts(handoff({ intended_use: 'commercially' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).toBe('The intended use: Commercially.')
  })

  test('E. "for internal review" -- grammatical, no "for for"', () => {
    const facts = buildUnderstoodFacts(handoff({ intended_use: 'for internal review' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).not.toContain('for for')
    expect(out).toBe('The intended use: For internal review.')
  })

  test('F. empty/unknown intended_use -- clause omitted entirely, unchanged existing behavior', () => {
    for (const sentinel of ['unresolved', 'unknown', 'unclear', 'confirmed_absent', 'declined']) {
      const facts = buildUnderstoodFacts(handoff({ intended_use: sentinel }))
      expect(renderUnderstoodSummary(facts)).toBe('')
    }
  })

  test('G. workflow_role rendering is completely byte-identical -- roleClause untouched by this fix', () => {
    const facts = buildUnderstoodFacts(handoff({ workflow_role: 'Producer' }))
    expect(renderUnderstoodSummary(facts)).toBe('Your role on this: Producer.')

    const sentenceRoleFacts = buildUnderstoodFacts(handoff({ workflow_role: 'I created all the images and brand assets' }))
    expect(renderUnderstoodSummary(sentenceRoleFacts)).toBe('Your role on this: I created all the images and brand assets.')
  })

  test('H. UI and email consistency -- understood_summary remains single-source, no separate email-only rendering branch', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'crc-engine', 'results-email-template.ts'), 'utf-8')
    // The email template must reference the shared output.understood_summary
    // field directly, never call renderUnderstoodSummary or reconstruct the
    // intended_use clause itself.
    expect(source).toContain('output.understood_summary')
    expect(source).not.toContain('renderUnderstoodSummary')
    expect(source).not.toContain('intendedUseClause')
  })

  test('Case 1 regression: real live-UAT stored value "for a client" no longer produces "for for a client" anywhere in the full rendered summary', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], intended_use: 'for a client' }))
    const out = renderUnderstoodSummary(facts)
    expect(out).not.toContain('for for a client')
    expect(out).toBe('You mentioned using kling. The intended use: For a client.')
  })

  test('Case 2 regression: real live-UAT stored value "They\'re going to use it in paid ads." no longer produces the broken/double-punctuated sentence', () => {
    const facts = buildUnderstoodFacts(handoff({ tools: [tool('kling')], intended_use: "They're going to use it in paid ads." }))
    const out = renderUnderstoodSummary(facts)
    expect(out).not.toContain("You mentioned this is for They're going to use it in paid ads..")
    expect(out).toBe("You mentioned using kling. The intended use: They're going to use it in paid ads.")
  })
})
