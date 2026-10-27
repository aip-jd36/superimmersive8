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
 *
 * Per-tool questions (CR-V2-EVIDENCE-SLICE-1) may carry a display condition
 * on an earlier answer IN THE SAME TOOL BLOCK (e.g. T1X "What is the tool
 * called?" only when T1 is "not listed"). Their eligibility is evaluated per
 * block, over the block's own shown answers plus the shown single answers.
 */

import type { DeclaredObservation, RecordContext } from '../contract/provenance'
import { eligibleQuestions, mapAnswer, NOT_SURE, type Answers, type QuestionEntry, type QuestionRegistry } from '../contract/question-registry'

export const MAX_TEXT_LENGTH = 500

export interface QuestionPresentation {
  q_id: string
  input: 'text' | 'textarea' | 'single' | 'multi' | 'select' | 'plan'
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
  issue: 'required' | 'invalid_option' | 'too_long' | 'single_choice_only' | 'too_many_tools' | 'no_tools' | 'acknowledgement_required' | 'unknown_question' | 'stale_document_review'
}

export interface DiscardedAnswer {
  q_id: string
  tool_index: number | null
}

export const toolInstance = (index: number) => `tool-${index + 1}`

const isAnswered = (values: readonly string[] | undefined) => !!values && values.some((v) => v.trim() !== '')
const isPerTool = (config: FormConfig, q_id: string) => config.presentation[q_id]?.per_tool === true

/**
 * Questions currently shown, in registry order, split into single questions
 * and the per-tool questions shown on the single answers alone. A per-tool
 * question conditioned on a block's own answers appears only through
 * `visibleToolQuestions` for that block.
 */
export function visibleQuestions(config: FormConfig, answers: Answers): { single: QuestionEntry[]; per_tool: QuestionEntry[] } {
  const shown = eligibleQuestions(config.registry, answers).filter((q) => config.presentation[q.q_id] !== undefined)
  return {
    single: shown.filter((q) => !isPerTool(config, q.q_id)),
    per_tool: shown.filter((q) => isPerTool(config, q.q_id)),
  }
}

/** Single answers to questions that are currently shown. Only these may steer display conditions. */
function shownSingleAnswers(config: FormConfig, answers: Answers): Record<string, readonly string[]> {
  const shown = new Set(visibleQuestions(config, answers).single.map((q) => q.q_id))
  return Object.fromEntries(Object.entries(answers).filter(([id, v]) => shown.has(id) && isAnswered(v)))
}

/**
 * The answers that decide eligibility inside one tool block: the shown single
 * answers plus the block's own answers to questions that are themselves
 * shown. Iterated to a fixed point, so a hidden answer can never reveal a
 * question.
 */
function toolScope(config: FormConfig, answers: Answers, tool: Answers): Record<string, readonly string[]> {
  const base = shownSingleAnswers(config, answers)
  let scope: Record<string, readonly string[]> = { ...base }
  for (let i = 0; i <= Object.keys(tool).length; i++) {
    const eligible = new Set(eligibleQuestions(config.registry, scope).filter((q) => isPerTool(config, q.q_id)).map((q) => q.q_id))
    const own = Object.fromEntries(Object.entries(tool).filter(([id, v]) => eligible.has(id) && isAnswered(v)))
    const next: Record<string, readonly string[]> = { ...base, ...own }
    if (JSON.stringify(next) === JSON.stringify(scope)) break
    scope = next
  }
  return scope
}

/** Per-tool questions shown for one tool block, in registry order. */
export function visibleToolQuestions(config: FormConfig, answers: Answers, tool: Answers): QuestionEntry[] {
  return eligibleQuestions(config.registry, toolScope(config, answers, tool)).filter((q) => isPerTool(config, q.q_id))
}

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
    if ((p.input === 'single' || p.input === 'select') && vs.length > 1) issues.push({ q_id: q.q_id, tool_index, issue: 'single_choice_only' })
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
    for (const q of visibleToolQuestions(config, state.answers, t)) issues.push(...checkValues(q, config.presentation[q.q_id], t[q.q_id], i))
  })
  for (const a of config.acknowledgement_ids) if (state.acknowledgements[a] !== true) issues.push({ q_id: a, tool_index: null, issue: 'acknowledgement_required' })
  return issues
}

function verbatimFor(q: QuestionEntry, p: QuestionPresentation, values: readonly string[]): string {
  if (q.options === 'free_text') return values[0] === NOT_SURE ? 'Not sure' : values[0].trim()
  return values.map((v) => p.option_labels[v] ?? v).join('; ')
}

/** The per-tool question ids shown for each tool block (index-aligned with `state.tools`, capped at `max_tools`). */
export function shownToolQuestionIds(config: FormConfig, state: CreatorRecordFormState): string[][] {
  return state.tools.slice(0, config.max_tools).map((t) => visibleToolQuestions(config, state.answers, t).map((q) => q.q_id))
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
  const discarded: DiscardedAnswer[] = []
  for (const [id, v] of Object.entries(state.answers)) if (isAnswered(v) && !shownSingle.has(id)) discarded.push({ q_id: id, tool_index: null })
  const toolsInScope = state.tools.slice(0, config.max_tools)
  const shownPerTool = toolsInScope.map((t) => visibleToolQuestions(config, state.answers, t))
  state.tools.forEach((t, i) => {
    const mine = new Set((shownPerTool[i] ?? []).map((q) => q.q_id))
    for (const [id, v] of Object.entries(t)) if (isAnswered(v) && !mine.has(id)) discarded.push({ q_id: id, tool_index: i })
  })

  // Only shown answers can steer display conditions.
  const effective: Answers = shownSingleAnswers(config, state.answers)
  const observations: DeclaredObservation[] = []
  const run = (q: QuestionEntry, values: readonly string[] | undefined, scope: Answers, instance?: string) => {
    if (!isAnswered(values)) return
    const p = config.presentation[q.q_id]
    const vs = q.options === 'free_text' ? [(values as readonly string[])[0].trim()] : [...(values as readonly string[])]
    const r = mapAnswer(config.registry, scope, ctx, { q_id: q.q_id, q_version: q.version, values: vs, verbatim: verbatimFor(q, p, vs), instance })
    if (!r.ok) throw new Error(`answer to ${q.q_id} refused by the contract: ${r.reason}`)
    observations.push(...r.observations)
  }
  for (const q of shown.single) run(q, state.answers[q.q_id], effective)
  toolsInScope.forEach((t, i) => {
    const scope = toolScope(config, state.answers, t)
    for (const q of shownPerTool[i]) run(q, t[q.q_id], scope, toolInstance(i))
  })
  return { observations, discarded }
}
