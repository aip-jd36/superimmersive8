import { extractMatchableFacts } from '@/lib/retrieval-engine/extract-matchable-facts'
import type { RetrievalHandoff, ScopedObservation } from '@/types/interview-engine'

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

function observation(overrides: Partial<ScopedObservation> & Pick<ScopedObservation, 'observation_id' | 'confidence'>): ScopedObservation {
  return {
    scope: 'current_project',
    workflow_stage: null,
    status: null,
    note: 'placeholder',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

describe('extractMatchableFacts', () => {
  test('resolved tools always enter the matchable set', () => {
    const result = extractMatchableFacts(handoff({ tools: [{ identifier: 'runway-gen3', access_surface: 'unresolved', plan_tier: 'unknown' }] }))
    expect(result.tools).toEqual(['runway-gen3'])
  })

  test('confirmed and confirmed_absent observations are both matchable -- a stated absence is not a gap', () => {
    const result = extractMatchableFacts(
      handoff({
        scoped_observations: [
          observation({ observation_id: 'so-1', confidence: 'confirmed' }),
          observation({ observation_id: 'so-2', confidence: 'confirmed_absent' }),
        ],
      }),
    )
    expect(result.observations.map((o) => o.observation_id).sort()).toEqual(['so-1', 'so-2'])
  })

  test.each(['unresolved_no_visibility', 'unknown', 'declined'] as const)('%s observations never enter the matchable set', (confidence) => {
    const result = extractMatchableFacts(handoff({ scoped_observations: [observation({ observation_id: 'so-1', confidence })] }))
    expect(result.observations).toEqual([])
  })

  test('intended_use: unclear does not enter the matchable set', () => {
    expect(extractMatchableFacts(handoff({ intended_use: 'unclear' })).intended_use).toBeNull()
  })

  test('intended_use: declined does not enter the matchable set (reachable runtime value RetrievalHandoff\'s own type under-declares)', () => {
    expect(extractMatchableFacts(handoff({ intended_use: 'declined' })).intended_use).toBeNull()
  })

  test('intended_use: confirmed_absent does not enter the matchable set (taxonomy-drift fix, 2026-08-08 -- this module previously omitted confirmed_absent from its own sentinel list and would have treated it as a real matchable value)', () => {
    expect(extractMatchableFacts(handoff({ intended_use: 'confirmed_absent' })).intended_use).toBeNull()
  })

  test('workflow_role: confirmed_absent does not enter the matchable set (same taxonomy-drift fix, now shared with understood-summary.ts via NON_AFFIRMATIVE_HANDOFF_SENTINELS)', () => {
    expect(extractMatchableFacts(handoff({ workflow_role: 'confirmed_absent' })).workflow_role).toBeNull()
  })

  test('a confirmed intended_use value is preserved verbatim', () => {
    expect(extractMatchableFacts(handoff({ intended_use: 'Paid social ad campaign' })).intended_use).toBe('Paid social ad campaign')
  })

  test('workflow_role: unresolved and declined both excluded; a real value is preserved', () => {
    expect(extractMatchableFacts(handoff({ workflow_role: 'unresolved' })).workflow_role).toBeNull()
    expect(extractMatchableFacts(handoff({ workflow_role: 'declined' })).workflow_role).toBeNull()
    expect(extractMatchableFacts(handoff({ workflow_role: 'Producer' })).workflow_role).toBe('Producer')
  })

  test('unresolved_aliases never appear anywhere in the matchable set', () => {
    const result = extractMatchableFacts(handoff({ unresolved_aliases: ['Nano Banana'] }))
    expect(result.tools).toEqual([])
  })

  test('does not read handoff.exclusions -- sentinel values on each field are already sufficient', () => {
    // A field can be marked in exclusions[] and the function must still behave correctly purely from the field's own value.
    const result = extractMatchableFacts(handoff({ intended_use: 'declined', exclusions: ['project_facts.intended_use'] }))
    expect(result.intended_use).toBeNull()
  })
})
