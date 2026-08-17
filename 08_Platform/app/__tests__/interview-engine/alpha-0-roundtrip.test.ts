/**
 * Alpha 0 checkpoint (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 1a).
 *
 * Create -> Mutate -> Serialize -> Deserialize -> Mutate again. Tests
 * serialization round-trip integrity specifically -- a distinct, foundational
 * property from ordinary unit coverage, per the architecture doc: nothing
 * downstream should be built on a type model that doesn't round-trip cleanly.
 *
 * The supersede-and-mark helper below is deliberately local to this test, not
 * a shared lib/interview-engine module -- Phase 2 owns the real mutation
 * engine (mutations.ts). This is the minimum needed to prove serialization
 * survives a mutation, not a preview of that engine's API.
 *
 * Run: npx jest __tests__/interview-engine/alpha-0-roundtrip.test.ts
 */

import type { ScopedObservation, StructuredUnderstanding } from '../../types/interview-engine'
import {
  deserializeStructuredUnderstanding,
  serializeStructuredUnderstanding,
} from '../../lib/interview-engine/serialization'

function correctObservation(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: Omit<ScopedObservation, 'superseded_by'>,
): StructuredUnderstanding {
  return {
    ...su,
    scoped_observations: [
      ...su.scoped_observations.map((o) =>
        o.observation_id === targetId ? { ...o, superseded_by: replacement.observation_id } : o,
      ),
      { ...replacement, superseded_by: null },
    ],
  }
}

/**
 * Deliberately exercises all 5 confidence states and both current/historical
 * scopes in one object -- richer than any single dialogue fixture needs to
 * be, since this checkpoint's job is round-trip integrity, not dialogue
 * realism.
 */
function buildBaseStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'Not sure yet.' },
      workflow_role: { attestation: { state: 'declined' }, source_turn: 1, source_statement: "I'd rather not say." },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'runway-gen3' },
        access_surface: { state: 'confirmed', value: 'API, team plan' },
        plan_tier: { state: 'unresolved_no_visibility' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement: 'We used Runway.',
        superseded_by: null,
      },
    ],
    scoped_observations: [
      {
        observation_id: 'so-confirmed',
        scope: 'current_project',
        workflow_stage: 'T1',
        confidence: 'confirmed',
        status: 'completed',
        note: 'Generated entirely in Runway.',
        superseded_by: null,
        source_turn: 1,
        source_statement: 'We used Runway.',
      },
      {
        observation_id: 'so-confirmed-absent',
        scope: 'current_project',
        workflow_stage: 'T2',
        confidence: 'confirmed_absent',
        status: 'completed',
        note: 'No legal review occurred before delivery.',
        superseded_by: null,
        source_turn: 2,
        source_statement: 'No, nobody reviewed it.',
      },
      {
        observation_id: 'so-unresolved-visibility',
        scope: 'current_project',
        workflow_stage: null,
        confidence: 'unresolved_no_visibility',
        status: null,
        note: 'User does not have billing access to confirm plan tier.',
        superseded_by: null,
        source_turn: 3,
        source_statement: "I don't have access to that, someone else manages billing.",
      },
      {
        observation_id: 'so-unknown',
        scope: 'historical_project',
        workflow_stage: null,
        confidence: 'unknown',
        status: null,
        note: 'Nobody involved knows whether the past project was ever reviewed.',
        superseded_by: null,
        source_turn: 4,
        source_statement: "Honestly, no idea, that was before my time on the team.",
      },
      {
        observation_id: 'so-declined',
        scope: 'historical_project',
        workflow_stage: null,
        confidence: 'declined',
        status: null,
        note: 'User declined to discuss the historical project further.',
        superseded_by: null,
        source_turn: 5,
        source_statement: "I'd rather not get into that one.",
      },
    ],
    user_goals: [],
    asset_provider_mentions: [],
    current_phase: 2,
    gate_1_state: 'met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

describe('Alpha 0 checkpoint: create -> mutate -> serialize -> deserialize -> mutate again', () => {
  const base = buildBaseStructuredUnderstanding()

  const correction: Omit<ScopedObservation, 'superseded_by'> = {
    observation_id: 'so-confirmed-corrected',
    scope: 'current_project',
    workflow_stage: 'T1',
    confidence: 'confirmed',
    status: 'completed',
    note: 'Actually, Runway was used only for the background plate; foreground was Kling.',
    source_turn: 6,
    source_statement: 'Actually, Runway was just the background -- foreground was Kling.',
  }

  // Mutate (pre-serialization)
  const mutated = correctObservation(base, 'so-confirmed', correction)

  // Serialize -> deserialize
  const json = serializeStructuredUnderstanding(mutated)
  const restored = deserializeStructuredUnderstanding(json)

  test('active (non-superseded) facts survive with correct values', () => {
    const active = restored.scoped_observations.filter((o) => o.superseded_by === null)
    const activeIds = active.map((o) => o.observation_id).sort()
    expect(activeIds).toEqual(
      [
        'so-confirmed-corrected',
        'so-confirmed-absent',
        'so-unresolved-visibility',
        'so-unknown',
        'so-declined',
      ].sort(),
    )
    const corrected = active.find((o) => o.observation_id === 'so-confirmed-corrected')
    expect(corrected?.note).toBe(correction.note)
  })

  test('scoped observations survive with scope/confidence/note intact', () => {
    const absent = restored.scoped_observations.find((o) => o.observation_id === 'so-confirmed-absent')
    expect(absent).toMatchObject({
      scope: 'current_project',
      confidence: 'confirmed_absent',
      note: 'No legal review occurred before delivery.',
    })
  })

  test('current_project vs historical_project scope stays distinct', () => {
    const byScope = Object.fromEntries(restored.scoped_observations.map((o) => [o.observation_id, o.scope]))
    expect(byScope['so-confirmed-absent']).toBe('current_project')
    expect(byScope['so-unknown']).toBe('historical_project')
    expect(byScope['so-declined']).toBe('historical_project')
  })

  test('all 5 confidence states survive individually, none collapsed', () => {
    const confidences = new Set(restored.scoped_observations.map((o) => o.confidence))
    expect(confidences).toEqual(
      new Set(['confirmed', 'confirmed_absent', 'unresolved_no_visibility', 'unknown', 'declined']),
    )
  })

  test('source_turn attribution survives per observation', () => {
    const byId = Object.fromEntries(restored.scoped_observations.map((o) => [o.observation_id, o.source_turn]))
    expect(byId['so-confirmed-absent']).toBe(2)
    expect(byId['so-unresolved-visibility']).toBe(3)
    expect(byId['so-unknown']).toBe(4)
    expect(byId['so-declined']).toBe(5)
    expect(byId['so-confirmed-corrected']).toBe(6)
  })

  test('superseded observations remain present (not deleted) after round-trip', () => {
    const superseded = restored.scoped_observations.find((o) => o.observation_id === 'so-confirmed')
    expect(superseded).toBeDefined()
    expect(superseded?.confidence).toBe('confirmed')
    expect(superseded?.note).toBe('Generated entirely in Runway.')
  })

  test('superseded_by links remain intact and resolve to the correct observation', () => {
    const superseded = restored.scoped_observations.find((o) => o.observation_id === 'so-confirmed')
    expect(superseded?.superseded_by).toBe('so-confirmed-corrected')

    const target = restored.scoped_observations.find((o) => o.observation_id === superseded?.superseded_by)
    expect(target).toBeDefined()
    expect(target?.superseded_by).toBeNull()
  })

  test('post-deserialization mutation produces the same result as the identical pre-serialization mutation', () => {
    const secondCorrection: Omit<ScopedObservation, 'superseded_by'> = {
      observation_id: 'so-confirmed-absent-corrected',
      scope: 'current_project',
      workflow_stage: 'T2',
      confidence: 'confirmed',
      status: 'completed',
      note: 'Correction: a junior reviewer did glance at it, briefly.',
      source_turn: 7,
      source_statement: 'Actually wait, someone did look at it quickly.',
    }

    // Apply the identical mutation to a fresh clone of `mutated` (pre-serialization
    // lineage) and to `restored` (post-deserialization lineage).
    const preSerializationClone: StructuredUnderstanding = JSON.parse(JSON.stringify(mutated))
    const fromPreSerialization = correctObservation(preSerializationClone, 'so-confirmed-absent', secondCorrection)
    const fromPostDeserialization = correctObservation(restored, 'so-confirmed-absent', secondCorrection)

    const normalize = (su: StructuredUnderstanding) =>
      JSON.stringify({
        ...su,
        scoped_observations: [...su.scoped_observations].sort((a, b) =>
          a.observation_id.localeCompare(b.observation_id),
        ),
      })

    expect(normalize(fromPreSerialization)).toBe(normalize(fromPostDeserialization))
  })
})
