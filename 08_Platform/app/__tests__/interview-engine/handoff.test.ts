/**
 * Unit tests for Interview -> Retrieval handoff assembly
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 5).
 *
 * Run: npx jest __tests__/interview-engine/handoff.test.ts
 */

import type { Attested, ProjectFacts, ScopedObservation, StructuredUnderstanding, ToolMention } from '../../types/interview-engine'
import { buildRetrievalHandoff } from '../../lib/interview-engine/handoff'
import { serializeRetrievalHandoff, deserializeRetrievalHandoff } from '../../lib/interview-engine/serialization'

function projectFacts(overrides: { intended_use?: Attested<string>; workflow_role?: Attested<string> } = {}): ProjectFacts {
  return {
    intended_use: {
      attestation: overrides.intended_use ?? { state: 'confirmed', value: 'Paid social ad campaign' },
      source_turn: 1,
      source_statement: 'placeholder',
    },
    workflow_role: {
      attestation: overrides.workflow_role ?? { state: 'confirmed', value: 'Producer' },
      source_turn: 1,
      source_statement: 'placeholder',
    },
    jurisdiction: {
      attestation: { state: 'unknown' },
      source_turn: 0,
      source_statement: '',
    },
  }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder statement',
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
    source_statement: 'placeholder statement',
    ...overrides,
  }
}

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: projectFacts(),
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

describe('tool identity', () => {
  test('single resolved tool', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'runway-gen3' },
          access_surface: { state: 'confirmed', value: 'API' },
          plan_tier: { state: 'confirmed', value: 'Team' },
        }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools).toEqual([{ identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' }])
    expect(handoff.unresolved_aliases).toEqual([])
  })

  test('multiple tools with different surfaces and tiers', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'runway-gen3' },
          access_surface: { state: 'confirmed', value: 'API' },
          plan_tier: { state: 'confirmed', value: 'Team' },
        }),
        toolMention({
          mention_id: 'tm-2',
          resolution: { kind: 'canonical', identifier: 'elevenlabs' },
          access_surface: { state: 'confirmed', value: 'Web app' },
          plan_tier: { state: 'confirmed', value: 'Personal' },
        }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools).toEqual([
      { identifier: 'runway-gen3', access_surface: 'API', plan_tier: 'Team' },
      { identifier: 'elevenlabs', access_surface: 'Web app', plan_tier: 'Personal' },
    ])
  })

  test('unresolved multi-surface alias (Nano Banana): raw name only, never forced into a canonical tool', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
        }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools).toEqual([])
    expect(handoff.unresolved_aliases).toEqual(['Nano Banana'])
  })

  test('resolved Gemini Consumer App', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'gemini-consumer-app' },
          access_surface: { state: 'confirmed', value: 'Consumer web app' },
        }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools[0].identifier).toBe('gemini-consumer-app')
    expect(handoff.tools[0].access_surface).toBe('Consumer web app')
  })

  test('resolved Gemini API', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'gemini-api' },
          access_surface: { state: 'confirmed', value: 'API (developer key)' },
        }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools[0].identifier).toBe('gemini-api')
    expect(handoff.tools[0].access_surface).toBe('API (developer key)')
  })

  test('corrected tool mention: old mention excluded, only the replacement appears', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
          confidence: 'unresolved_no_visibility',
          superseded_by: 'tm-2',
        }),
        toolMention({
          mention_id: 'tm-2',
          resolution: { kind: 'canonical', identifier: 'gemini-api' },
          access_surface: { state: 'confirmed', value: 'API' },
          source_turn: 2,
        }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools).toEqual([{ identifier: 'gemini-api', access_surface: 'API', plan_tier: 'unknown' }])
    expect(handoff.unresolved_aliases).toEqual([])
  })
})

describe('scoped observations', () => {
  test('superseded observation excluded', () => {
    const su = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-1', note: 'Old note.', superseded_by: 'so-2' }),
        observation({ observation_id: 'so-2', note: 'Corrected note.', source_turn: 2 }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.scoped_observations.map((o) => o.observation_id)).toEqual(['so-2'])
  })

  test('retracted observation excluded (retraction is a supersession, same mechanism)', () => {
    const su = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-1', confidence: 'confirmed', note: 'Used Kling.', superseded_by: 'so-1-retracted' }),
        observation({ observation_id: 'so-1-retracted', confidence: 'unknown', note: 'Retracted.', source_turn: 2 }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.scoped_observations.map((o) => o.observation_id)).toEqual(['so-1-retracted'])
    expect(handoff.scoped_observations.find((o) => o.observation_id === 'so-1')).toBeUndefined()
  })

  test('current and historical observations kept distinct, not merged', () => {
    const su = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-current', scope: 'current_project', note: 'No review on this one.' }),
        observation({ observation_id: 'so-historical', scope: 'historical_project', note: 'A past project was reviewed.' }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    const byId = Object.fromEntries(handoff.scoped_observations.map((o) => [o.observation_id, o.scope]))
    expect(byId['so-current']).toBe('current_project')
    expect(byId['so-historical']).toBe('historical_project')
  })

  test('unknown, unresolved, confirmed-absent, and declined confidence states are preserved distinctly', () => {
    const su = baseSU({
      scoped_observations: [
        observation({ observation_id: 'so-unknown', confidence: 'unknown' }),
        observation({ observation_id: 'so-unresolved', confidence: 'unresolved_no_visibility' }),
        observation({ observation_id: 'so-absent', confidence: 'confirmed_absent' }),
        observation({ observation_id: 'so-declined', confidence: 'declined' }),
      ],
    })
    const handoff = buildRetrievalHandoff(su)
    const byId = Object.fromEntries(handoff.scoped_observations.map((o) => [o.observation_id, o.confidence]))
    expect(byId['so-unknown']).toBe('unknown')
    expect(byId['so-unresolved']).toBe('unresolved_no_visibility')
    expect(byId['so-absent']).toBe('confirmed_absent')
    expect(byId['so-declined']).toBe('declined')
    expect(new Set(Object.values(byId)).size).toBe(4)
  })
})

describe('partial and opt-out states', () => {
  test('partial handoff before Gate 1: no fabricated completeness', () => {
    const su = baseSU({
      project_facts: projectFacts({ intended_use: { state: 'unknown' } }),
      tool_mentions: [],
      gate_1_state: 'not_met',
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.tools).toEqual([])
    expect(handoff.intended_use).toBe('unclear')
    expect(handoff.certainty_state).toBe('gate_1_unmet')
  })

  test('handoff after user opt-out reflects decline, not fabricated completion', () => {
    const su = baseSU({
      project_facts: projectFacts({ intended_use: { state: 'declined' }, workflow_role: { state: 'declined' } }),
      tool_mentions: [],
      gate_1_state: 'not_applicable_declined',
      opt_out_scope: 'interview',
      completion_reason: 'declined',
    })
    const handoff = buildRetrievalHandoff(su)
    expect(handoff.certainty_state).toBe('declined')
    expect(handoff.intended_use).toBe('declined')
    expect(handoff.workflow_role).toBe('declined')
    expect(handoff.exclusions).toEqual(expect.arrayContaining(['project_facts.intended_use', 'project_facts.workflow_role']))
  })
})

describe('exclusions (negative assertions, not absence-by-omission)', () => {
  const handoff = buildRetrievalHandoff(
    baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
    }),
  )
  const keys = Object.keys(handoff)

  test('no risk score or conclusion fields', () => {
    const forbidden = ['risk_score', 'risk', 'clearance', 'conclusion', 'assessment', 'outcome', 'confidence_score']
    for (const f of forbidden) expect(keys).not.toContain(f)
  })

  test('no CRC-Eligible/publication data', () => {
    const forbidden = ['crc_eligible', 'crcEligible', 'publication_scope', 'publication_decision']
    for (const f of forbidden) expect(keys).not.toContain(f)
  })
})

describe('determinism and immutability', () => {
  test('deterministic equality for identical input', () => {
    const su = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
      scoped_observations: [observation({ observation_id: 'so-1' })],
    })
    const first = buildRetrievalHandoff(su)
    const second = buildRetrievalHandoff(su)
    expect(first).toEqual(second)
  })

  test('source StructuredUnderstanding object is unchanged after assembly', () => {
    const su = baseSU({
      tool_mentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'runway-gen3' } })],
      scoped_observations: [observation({ observation_id: 'so-1' })],
    })
    const before = JSON.parse(JSON.stringify(su))
    buildRetrievalHandoff(su)
    expect(su).toEqual(before)
  })
})

describe('serialization', () => {
  test('RetrievalHandoff survives a serialize/deserialize round trip', () => {
    const su = baseSU({
      tool_mentions: [
        toolMention({
          mention_id: 'tm-1',
          resolution: { kind: 'canonical', identifier: 'runway-gen3' },
          access_surface: { state: 'confirmed', value: 'API' },
          plan_tier: { state: 'confirmed', value: 'Team' },
        }),
      ],
      scoped_observations: [observation({ observation_id: 'so-1', scope: 'historical_project' })],
    })
    const handoff = buildRetrievalHandoff(su)
    const restored = deserializeRetrievalHandoff(serializeRetrievalHandoff(handoff))
    expect(restored).toEqual(handoff)
  })
})

describe('user_goals never reach RetrievalHandoff (Milestone 1 hard scope boundary, 2026-08-15 -- Retrieval and Projection unaffected by construction)', () => {
  test('RetrievalHandoff output is byte-identical whether user_goals is empty or populated', () => {
    const goal = { goal_id: 'g-1', state: 'confirmed' as const, raw_text: 'Can I use this commercially?', category: 'unknown' as const, scope: 'informational' as const, superseded_by: null, source_turn: 1, source_statement: 'placeholder' }
    const withoutGoals = baseSU({ user_goals: [] })
    const withGoals = baseSU({ user_goals: [goal] })
    expect(buildRetrievalHandoff(withoutGoals)).toEqual(buildRetrievalHandoff(withGoals))
  })

  test('RetrievalHandoff has no user_goals key at all -- this module enumerates specific fields, never spreads StructuredUnderstanding', () => {
    const goal = { goal_id: 'g-1', state: 'confirmed' as const, raw_text: 'Can I use this commercially?', category: 'unknown' as const, scope: 'informational' as const, superseded_by: null, source_turn: 1, source_statement: 'placeholder' }
    const handoff = buildRetrievalHandoff(baseSU({ user_goals: [goal] }))
    expect(Object.keys(handoff)).not.toContain('user_goals')
    expect(JSON.stringify(handoff)).not.toContain('Can I use this commercially')
  })
})
