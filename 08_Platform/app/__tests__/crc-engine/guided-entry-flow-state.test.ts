/**
 * Guided Entry mobile product surface (GE-2) — pure state-machine tests
 * for components/crc/CrcEntryFlow.tsx (see guided-entry-flow-state.ts's
 * own header for why this logic is extracted and tested here rather than
 * via component rendering — this repo's jest config has no DOM/component
 * environment).
 *
 * Covers required tests 2, 3, 4, 6, 7, 8, 9, 12, 13, 14 from the GE-2 task.
 *
 * Run: npx jest __tests__/crc-engine/guided-entry-flow-state.test.ts
 */

import {
  buildGuidedSubmission,
  currentField,
  guidedEntryFlowReducer,
  initialGuidedEntryFlowState,
  isOnConcernStep,
  visibleFields,
  type GuidedEntryFlowState,
} from '../../lib/crc-engine/guided-entry-flow-state'
import { GUIDED_ENTRY_DEFINITIONS } from '../../lib/crc-engine/guided-entry-definitions'
import { isCanonicalToolIdentity } from '../../lib/tool-identity/registry'

const AGENCY = GUIDED_ENTRY_DEFINITIONS.find((d) => d.definitionId === 'agency-producing-for-client')!
const INDEPENDENT = GUIDED_ENTRY_DEFINITIONS.find((d) => d.definitionId === 'independent-own-work')!
const IN_HOUSE = GUIDED_ENTRY_DEFINITIONS.find((d) => d.definitionId === 'in-house-own-organization')!

describe('initial state', () => {
  test('starts on the choice screen with nothing selected', () => {
    const state = initialGuidedEntryFlowState()
    expect(state.screen).toBe('choice')
    expect(state.selectedDefinition).toBeNull()
    expect(state.answers).toEqual({})
  })
})

describe('SELECT_ROLE — the SAME generic action for all three roles (test 2/3/4)', () => {
  test.each([
    ['Agency', AGENCY],
    ['Independent', INDEPENDENT],
    ['In-house', IN_HOUSE],
  ])('%s enters guided_step via the identical reducer branch, auto-answering workflow_role', (_label, def) => {
    const state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: def })
    expect(state.screen).toBe('guided_step')
    expect(state.selectedDefinition).toBe(def)
    const roleField = def.fields.find((f) => f.kind === 'workflow_role')!
    expect(state.answers[roleField.fieldId]).toBe(roleField.options[0].value)
    expect(state.stepIndex).toBe(0)
  })

  test('workflow_role is never a visible step for any of the three roles (test 6: role card creates no separate UserGoal-adjacent step)', () => {
    for (const def of [AGENCY, INDEPENDENT, IN_HOUSE]) {
      expect(visibleFields(def).some((f) => f.kind === 'workflow_role')).toBe(false)
    }
  })
})

describe('SELECT_FREE_FORM (test 5)', () => {
  test('enters the free_form screen, independent of any guided state', () => {
    const state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_FREE_FORM' })
    expect(state.screen).toBe('free_form')
    expect(state.selectedDefinition).toBeNull()
  })
})

describe('field answers and skip (test 7, 8, 12)', () => {
  function afterSelectAgency(): GuidedEntryFlowState {
    return guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
  }

  test('CRC-GE-MULTITOOL-1: TOGGLE_FIELD_VALUE records a tool selection (test 7: no stronger status implied, plain value stored in an array)', () => {
    const s0 = afterSelectAgency()
    const toolField = currentField(s0)!
    expect(toolField.kind).toBe('tool')
    expect(toolField.cardinality).toBe('multiple')
    const s1 = guidedEntryFlowReducer(s0, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'runway-gen3' })
    expect(s1.answers[toolField.fieldId]).toEqual(['runway-gen3'])
  })

  test('CRC-GE-MULTITOOL-1: TOGGLE_FIELD_VALUE select/deselect multiple tools freely (test 20)', () => {
    const s0 = afterSelectAgency()
    const toolField = currentField(s0)!
    let state = guidedEntryFlowReducer(s0, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'kling' })
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'elevenlabs' })
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'suno' })
    expect((state.answers[toolField.fieldId] as string[]).slice().sort()).toEqual(['elevenlabs', 'kling', 'suno'])
    // Toggling an already-selected value again deselects it.
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'elevenlabs' })
    expect((state.answers[toolField.fieldId] as string[]).slice().sort()).toEqual(['kling', 'suno'])
  })

  test('CRC-GE-MULTITOOL-1: deselecting the last selected tool removes the field entirely, mirroring Skip semantics', () => {
    const s0 = afterSelectAgency()
    const toolField = currentField(s0)!
    let state = guidedEntryFlowReducer(s0, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'kling' })
    expect(toolField.fieldId in state.answers).toBe(true)
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'kling' })
    expect(toolField.fieldId in state.answers).toBe(false)
  })

  test('CRC-GE-MULTITOOL-1: buildGuidedSubmission emits {fieldId, values} for the multi-select tool field, {fieldId, value} for every single-select field, unchanged', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
    const toolField = currentField(state)!
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'kling' })
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'pika' })
    state = guidedEntryFlowReducer(state, { type: 'ADVANCE_STEP' })
    const jurisdictionField = currentField(state)!
    state = guidedEntryFlowReducer(state, { type: 'SET_FIELD_ANSWER', fieldId: jurisdictionField.fieldId, value: 'United States' })
    state = { ...state, concern: 'Can I use this commercially?' }
    const submission = buildGuidedSubmission(state, 'test-id-multi')!
    const toolEntry = submission.fields.find((f) => f.fieldId === toolField.fieldId)!
    expect(toolEntry.value).toBeUndefined()
    expect((toolEntry.values as string[]).slice().sort()).toEqual(['kling', 'pika'])
    const jurisdictionEntry = submission.fields.find((f) => f.fieldId === jurisdictionField.fieldId)!
    expect(jurisdictionEntry.values).toBeUndefined()
    expect(jurisdictionEntry.value).toBe('United States')
  })

  test('SET_FIELD_ANSWER records a jurisdiction answer (test 8)', () => {
    const s0 = afterSelectAgency()
    const toolField = currentField(s0)!
    const s1 = guidedEntryFlowReducer(s0, { type: 'ADVANCE_STEP' })
    const jurisdictionField = currentField(s1)!
    expect(jurisdictionField.kind).toBe('jurisdiction')
    const s2 = guidedEntryFlowReducer(s1, { type: 'SET_FIELD_ANSWER', fieldId: jurisdictionField.fieldId, value: 'United States' })
    expect(s2.answers[jurisdictionField.fieldId]).toBe('United States')
    expect(toolField.fieldId).not.toBe(jurisdictionField.fieldId)
  })

  test('SKIP_FIELD never manufactures a value — the field is simply absent from answers, and the step still advances (test 12)', () => {
    const s0 = afterSelectAgency()
    const toolField = currentField(s0)!
    const s1 = guidedEntryFlowReducer(s0, { type: 'SKIP_FIELD', fieldId: toolField.fieldId })
    expect(toolField.fieldId in s1.answers).toBe(false)
    expect(s1.stepIndex).toBe(1)
  })

  test('skipping after having answered removes the prior answer entirely (never a stale/placeholder value)', () => {
    const s0 = afterSelectAgency()
    const toolField = currentField(s0)!
    const s1 = guidedEntryFlowReducer(s0, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'kling' })
    const s2 = guidedEntryFlowReducer(s1, { type: 'SKIP_FIELD', fieldId: toolField.fieldId })
    expect(toolField.fieldId in s2.answers).toBe(false)
  })
})

describe('reaching and submitting the concern step (test 9)', () => {
  test('after tool + jurisdiction steps, isOnConcernStep becomes true and the concern text is what buildGuidedSubmission carries as `concern`', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
    state = guidedEntryFlowReducer(state, { type: 'SKIP_FIELD', fieldId: currentField(state)!.fieldId }) // tool
    state = guidedEntryFlowReducer(state, { type: 'SKIP_FIELD', fieldId: currentField(state)!.fieldId }) // jurisdiction
    expect(isOnConcernStep(state)).toBe(true)
    state = guidedEntryFlowReducer(state, { type: 'SET_CONCERN', value: 'Can I use this commercially?' })
    const submission = buildGuidedSubmission(state, 'test-id-1')
    expect(submission).not.toBeNull()
    expect(submission!.concern).toBe('Can I use this commercially?')
    // The role card's own establishment (workflow_role) is present, but
    // nothing resembling a UserGoal/goal_category is anywhere in this shape.
    expect(submission).not.toHaveProperty('goal_category')
    expect(submission).not.toHaveProperty('userGoal')
  })

  test('buildGuidedSubmission returns null for an empty/whitespace-only concern -- never submits a fabricated question', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
    state = { ...state, concern: '   ' }
    expect(buildGuidedSubmission(state, 'test-id-2')).toBeNull()
  })

  test('buildGuidedSubmission returns null with no role selected at all', () => {
    expect(buildGuidedSubmission(initialGuidedEntryFlowState(), 'test-id-3')).toBeNull()
  })
})

describe('Back navigation preserves prior answers (test 13)', () => {
  test('Back from jurisdiction to tool keeps the tool selection intact', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
    const toolField = currentField(state)!
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: toolField.fieldId, value: 'luma' })
    state = guidedEntryFlowReducer(state, { type: 'ADVANCE_STEP' }) // now on jurisdiction
    expect(currentField(state)!.kind).toBe('jurisdiction')
    state = guidedEntryFlowReducer(state, { type: 'GO_BACK' }) // back to tool
    expect(currentField(state)!.kind).toBe('tool')
    expect(state.answers[toolField.fieldId]).toEqual(['luma'])
  })

  test('Back from the first guided step returns to the choice screen and clears the role selection', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
    state = guidedEntryFlowReducer(state, { type: 'GO_BACK' })
    expect(state.screen).toBe('choice')
    expect(state.selectedDefinition).toBeNull()
  })

  test('Back from the free-form landing screen returns to choice', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_FREE_FORM' })
    state = guidedEntryFlowReducer(state, { type: 'GO_BACK' })
    expect(state.screen).toBe('choice')
  })
})

describe('changing role before initialization never leaves stale facts (test 14)', () => {
  test('selecting Independent after having answered fields under Agency starts answers fresh, with only the new role auto-answered', () => {
    let state = guidedEntryFlowReducer(initialGuidedEntryFlowState(), { type: 'SELECT_ROLE', definition: AGENCY })
    const agencyToolField = currentField(state)!
    state = guidedEntryFlowReducer(state, { type: 'TOGGLE_FIELD_VALUE', fieldId: agencyToolField.fieldId, value: 'pika' })
    state = guidedEntryFlowReducer(state, { type: 'GO_BACK' }) // back to choice
    state = guidedEntryFlowReducer(state, { type: 'SELECT_ROLE', definition: INDEPENDENT })

    const independentRoleField = INDEPENDENT.fields.find((f) => f.kind === 'workflow_role')!
    expect(Object.keys(state.answers)).toEqual([independentRoleField.fieldId])
    expect(state.answers[independentRoleField.fieldId]).toBe(independentRoleField.options[0].value)
    // The Agency-era tool answer must not survive into the Independent flow.
    expect(state.answers['tool']).toBeUndefined()

    const submission = buildGuidedSubmission({ ...state, concern: 'test' }, 'test-id-4')
    expect(submission!.definitionId).toBe('independent-own-work')
    expect(submission!.fields.find((f) => f.fieldId === agencyToolField.fieldId)).toBeUndefined()
  })
})

describe('tool selector uses authoritative canonical ids (test 10, cross-checked with GE-1)', () => {
  test('every tool option across all three definitions is a real, currently-canonical id', () => {
    for (const def of GUIDED_ENTRY_DEFINITIONS) {
      const toolField = def.fields.find((f) => f.kind === 'tool')
      if (!toolField) continue
      for (const option of toolField.options) {
        expect(isCanonicalToolIdentity(option.value)).toBe(true)
      }
    }
  })
})
