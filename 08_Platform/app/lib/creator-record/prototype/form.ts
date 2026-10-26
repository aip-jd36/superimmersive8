/**
 * CR-V2-VERTICAL-SLICE-1 — questionnaire form state → declared observations.
 *
 * Pure and deterministic. The questionnaire is driven entirely by the
 * contract's own `eligibleQuestions()` (what is shown) and `mapAnswer()`
 * (what an answer becomes). Nothing here decides applicability, evidence or
 * conclusions.
 *
 * Changing an earlier answer can hide a later question (e.g. answering "No"
 * to L1 hides L3). An answer to a question that is no longer shown is
 * DISCARDED before mapping, and reported, so a stale answer can never reach
 * the record (`mapAnswer` would refuse it anyway).
 */

import type { DeclaredObservation, RecordContext } from '../contract/provenance'
import { eligibleQuestions, mapAnswer, NOT_SURE, type Answers, type QuestionEntry, type QuestionRegistry } from '../contract/question-registry'

export const MAX_TEXT_LENGTH = 500

export interface QuestionPresentation {
  q_id: string
  input: 'text' | 'textarea' | 'single' | 'multi'
  required: boolean
  per_tool: boolean
  option_labels: Readonly<Record<string, string>>
  allow_not_sure: boolean
}

/** What the browser submits. Values are option codes, or one free-text value (`not_sure` for "Not sure"). */
export interface CreatorRecordFormState {
  answers: Record<string, string[]>
  /** One answer map per declared tool, in order. */
  tools: Record<string, string[]>[]
  acknowledgements: Record<string, boolean>
}

export interface FormConfig {
  registry: QuestionRegistry
  presentation: Readonly<Record<string, QuestionPresentation>>
  acknowledgement_ids: readonly string[]
  max_tools: number
}

export interface FormIssue {
  q_id: string | null
  tool_index: number | null
  issue: 'required' | 'invalid_option' | 'too_long' | 'single_choice_only' | 'too_many_tools' | 'no_tools' | 'acknowledgement_required' | 'unknown_question'
}

export interface DiscardedAnswer {
  q_id: string
  tool_index: number | null
}

export const toolInstance = (index: number) => `tool-${index + 1}`

/** Questions currently shown, in registry order, split into single questions and the per-tool block. */
export function visibleQuestions(config: FormConfig, answers: Answers): { single: QuestionEntry[]; per_tool: QuestionEntry[] } {
  const shown = eligibleQuestions(config.registry, answers).filter((q) => config.presentation[q.q_id] !== undefined)
  return {
    single: shown.filter((q) => !config.presentation[q.q_id].per_tool),
    per_tool: shown.filter((q) => config.presentation[q.q_id].per_tool),
  }
}

const isAnswered = (values: readonly string[] | undefined) => !!values && values.some((v) => v.trim() !== '')

function checkValues(q: QuestionEntry, p: QuestionPresentation, values: readonly string[] | undefined, tool_index: number | null): FormIssue[] {
  const issues: FormIssue[] = []
  if (!isAnswered(values)) {
    if (p.required) issues.push({ q_id: q.q_id, tool_index, issue: 'required' })
    return issues
  }
  const vs = values as readonly string[]
  if (q.options === 'free_text') {
    if (vs.length !== 1) issues.push({ q_id: q.q_id, tool_index, issue: 'single_choice_only' })
    if (vs.some((v) => v.length > MAX_TEXT_LENGTH)) issues.push({ q_id: q.q_id, tool_index, issue: 'too_long' })
  } else {
    if (vs.some((v) => !(q.options as string[]).includes(v))) issues.push({ q_id: q.q_id, tool_index, issue: 'invalid_option' })
    if (p.input === 'single' && vs.length > 1) issues.push({ q_id: q.q_id, tool_index, issue: 'single_choice_only' })
  }
  return issues
}

/** All problems with the form as submitted. An empty list means a draft can be produced. */
export function validateForm(config: FormConfig, state: CreatorRecordFormState): FormIssue[] {
  const issues: FormIssue[] = []
  const known = new Set(Array.from(config.registry.questions.keys()))
  for (const id of Object.keys(state.answers)) if (!known.has(id)) issues.push({ q_id: id, tool_index: null, issue: 'unknown_question' })
  state.tools.forEach((t, i) => {
    for (const id of Object.keys(t)) if (!known.has(id)) issues.push({ q_id: id, tool_index: i, issue: 'unknown_question' })
  })

  const shown = visibleQuestions(config, state.answers)
  for (const q of shown.single) issues.push(...checkValues(q, config.presentation[q.q_id], state.answers[q.q_id], null))
  if (state.tools.length === 0) issues.push({ q_id: null, tool_index: null, issue: 'no_tools' })
  if (state.tools.length > config.max_tools) issues.push({ q_id: null, tool_index: null, issue: 'too_many_tools' })
  state.tools.slice(0, config.max_tools).forEach((t, i) => {
    for (const q of shown.per_tool) issues.push(...checkValues(q, config.presentation[q.q_id], t[q.q_id], i))
  })
  for (const a of config.acknowledgement_ids) if (state.acknowledgements[a] !== true) issues.push({ q_id: a, tool_index: null, issue: 'acknowledgement_required' })
  return issues
}

function verbatimFor(q: QuestionEntry, p: QuestionPresentation, values: readonly string[]): string {
  if (q.options === 'free_text') return values[0] === NOT_SURE ? 'Not sure' : values[0].trim()
  return values.map((v) => p.option_labels[v] ?? v).join('; ')
}

/**
 * Maps the current form to declared observations through the contract.
 * Only shown questions are mapped; answers to hidden questions are returned
 * as `discarded`. Throws only on a contract refusal, which validateForm()
 * prevents — a caller must validate first.
 */
export function formToObservations(config: FormConfig, state: CreatorRecordFormState, ctx: RecordContext): { observations: DeclaredObservation[]; discarded: DiscardedAnswer[] } {
  const shown = visibleQuestions(config, state.answers)
  const shownSingle = new Set(shown.single.map((q) => q.q_id))
  const shownPerTool = new Set(shown.per_tool.map((q) => q.q_id))
  const discarded: DiscardedAnswer[] = []
  for (const [id, v] of Object.entries(state.answers)) if (isAnswered(v) && !shownSingle.has(id)) discarded.push({ q_id: id, tool_index: null })
  state.tools.forEach((t, i) => {
    for (const [id, v] of Object.entries(t)) if (isAnswered(v) && !shownPerTool.has(id)) discarded.push({ q_id: id, tool_index: i })
  })

  // Only shown answers can steer display conditions.
  const effective: Answers = Object.fromEntries(Object.entries(state.answers).filter(([id, v]) => shownSingle.has(id) && isAnswered(v)))
  const observations: DeclaredObservation[] = []
  const run = (q: QuestionEntry, values: readonly string[] | undefined, instance?: string) => {
    if (!isAnswered(values)) return
    const p = config.presentation[q.q_id]
    const vs = q.options === 'free_text' ? [(values as readonly string[])[0].trim()] : [...(values as readonly string[])]
    const r = mapAnswer(config.registry, effective, ctx, { q_id: q.q_id, q_version: q.version, values: vs, verbatim: verbatimFor(q, p, vs), instance })
    if (!r.ok) throw new Error(`answer to ${q.q_id} refused by the contract: ${r.reason}`)
    observations.push(...r.observations)
  }
  for (const q of shown.single) run(q, state.answers[q.q_id])
  state.tools.slice(0, config.max_tools).forEach((t, i) => {
    for (const q of shown.per_tool) run(q, t[q.q_id], toolInstance(i))
  })
  return { observations, discarded }
}
