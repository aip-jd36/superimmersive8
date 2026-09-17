/**
 * Guided Entry mobile product surface (GE-2) — pure state machine for
 * components/crc/CrcEntryFlow.tsx.
 *
 * Extracted deliberately: this repository's jest config has no
 * component-rendering environment (testEnvironment: 'node', no
 * @testing-library/react — same constraint CRC Wait-State UX's own
 * wait-indicator.ts was split out for). Every requirement Phase 16 of the
 * GE-2 task asks for (Back preserves answers, changing role clears stale
 * answers, skip never manufactures a value, the final submission shape) is
 * expressible as a pure reducer/selector test here, with zero DOM.
 * CrcEntryFlow.tsx itself is a thin `useReducer` wrapper — no state logic
 * of its own.
 */

import type { GuidedEntryDefinition, GuidedFieldSpec } from '@/types/guided-entry'
import type { GuidedSubmission } from '@/components/crc/CrcEntryFlow'

export type GuidedEntryFlowScreen = 'choice' | 'guided_step' | 'free_form'

export interface GuidedEntryFlowState {
  screen: GuidedEntryFlowScreen
  selectedDefinition: GuidedEntryDefinition | null
  stepIndex: number
  answers: Record<string, string>
  concern: string
  freeFormText: string
}

export type GuidedEntryFlowAction =
  | { type: 'SELECT_ROLE'; definition: GuidedEntryDefinition }
  | { type: 'SELECT_FREE_FORM' }
  | { type: 'GO_BACK' }
  | { type: 'SET_FIELD_ANSWER'; fieldId: string; value: string }
  | { type: 'SKIP_FIELD'; fieldId: string }
  | { type: 'ADVANCE_STEP' }
  | { type: 'SET_CONCERN'; value: string }
  | { type: 'SET_FREE_FORM_TEXT'; value: string }

export function initialGuidedEntryFlowState(): GuidedEntryFlowState {
  return { screen: 'choice', selectedDefinition: null, stepIndex: 0, answers: {}, concern: '', freeFormText: '' }
}

/** Non-workflow_role fields only — workflow_role is never its own visible step (see selectRole's own reasoning in this module's reducer branch below). */
export function visibleFields(definition: GuidedEntryDefinition | null): GuidedFieldSpec[] {
  return definition ? definition.fields.filter((f) => f.kind !== 'workflow_role') : []
}

export function isOnConcernStep(state: GuidedEntryFlowState): boolean {
  return state.selectedDefinition !== null && state.stepIndex === visibleFields(state.selectedDefinition).length
}

export function currentField(state: GuidedEntryFlowState): GuidedFieldSpec | undefined {
  if (!state.selectedDefinition || isOnConcernStep(state)) return undefined
  return visibleFields(state.selectedDefinition)[state.stepIndex]
}

export function guidedEntryFlowReducer(state: GuidedEntryFlowState, action: GuidedEntryFlowAction): GuidedEntryFlowState {
  switch (action.type) {
    case 'SELECT_ROLE': {
      // The workflow_role field has exactly one option by construction on
      // every current definition -- auto-answered here, from the card tap
      // itself, never rendered as its own screen (Phase 5: "Role selected
      // -> Tool -> Jurisdiction -> Question", no separate role-confirmation
      // step). Selecting a DIFFERENT role always starts `answers` fresh --
      // a stale tool/jurisdiction answer from a previously-explored role
      // must never leak into a submission for a role the user only later
      // settled on (Phase 16 test 14's own requirement).
      const roleField = action.definition.fields.find((f) => f.kind === 'workflow_role')
      const answers: Record<string, string> = {}
      if (roleField?.options[0]) answers[roleField.fieldId] = roleField.options[0].value
      return { screen: 'guided_step', selectedDefinition: action.definition, stepIndex: 0, answers, concern: '', freeFormText: state.freeFormText }
    }
    case 'SELECT_FREE_FORM':
      return { ...state, screen: 'free_form' }
    case 'GO_BACK': {
      if (state.screen === 'free_form') return { ...state, screen: 'choice' }
      if (state.screen === 'guided_step') {
        if (state.stepIndex === 0) return { ...state, screen: 'choice', selectedDefinition: null, answers: {} }
        // Answers already entered on earlier steps are preserved -- Back
        // never clears `answers`, only moves the step pointer (Phase 16
        // test 13's own requirement).
        return { ...state, stepIndex: state.stepIndex - 1 }
      }
      return state
    }
    case 'SET_FIELD_ANSWER':
      return { ...state, answers: { ...state.answers, [action.fieldId]: action.value } }
    case 'SKIP_FIELD': {
      // Skip removes any prior answer for this field (never leaves a
      // stale value behind) and advances -- it never substitutes a
      // placeholder/invented value (Phase 16 test 12's own requirement).
      const answers = { ...state.answers }
      delete answers[action.fieldId]
      return { ...state, answers, stepIndex: state.stepIndex + 1 }
    }
    case 'ADVANCE_STEP':
      return { ...state, stepIndex: state.stepIndex + 1 }
    case 'SET_CONCERN':
      return { ...state, concern: action.value }
    case 'SET_FREE_FORM_TEXT':
      return { ...state, freeFormText: action.value }
  }
}

/**
 * Builds the exact request payload guidedInit expects (Phase 9's own rule:
 * ScenarioSelection != UserGoal -- `concern` is the only free-text field,
 * carried through untouched, never parsed/classified/mapped here). Returns
 * null if the state isn't actually ready to submit (no role selected, or
 * an empty concern) -- the caller is expected to also disable its own
 * submit control on this same condition, this is the authoritative check.
 */
export function buildGuidedSubmission(state: GuidedEntryFlowState, guidedEntryInitId: string): GuidedSubmission | null {
  if (!state.selectedDefinition) return null
  const concern = state.concern.trim()
  if (concern.length === 0) return null
  return {
    guidedEntryInitId,
    definitionId: state.selectedDefinition.definitionId,
    definitionVersion: state.selectedDefinition.version,
    fields: Object.entries(state.answers).map(([fieldId, value]) => ({ fieldId, value })),
    concern,
  }
}
