/**
 * CR-V2-DECL-1B-2 — what happens to entered answers when the questionnaire changed under an open page.
 *
 * Pure and client-safe. Generic: it compares the two questionnaire definitions the page was given, by their metadata, and
 * knows no question. An answer is kept only when nothing about its meaning differs between the two; anything else is taken
 * out of the form and REPORTED, with what the creator had entered, so nothing is lost silently. Acknowledgements are always
 * cleared: they are statements about wording, and they are given again against what is on screen now.
 *
 * This never decides what is acceptable. The server validates whatever is submitted next, and only an explicit submit sends it.
 *
 * WORDING STATUS: DRAFT, NOT APPROVED, like the rest of this flow's messages.
 */
import type { CreatorRecordFormState, QuestionPresentation } from '@/lib/creator-record/prototype/form'
import type { RegistryInput } from '@/lib/creator-record/contract/question-registry'

export interface QuestionnaireDefinition {
  registryInput: RegistryInput
  presentation: Readonly<Record<string, QuestionPresentation & { text: string; help: string | null }>>
  acknowledgements: Readonly<Record<string, string>>
  maxTools: number
}

export type AnswerChangeReason = 'question_removed' | 'question_changed' | 'applicability_changed' | 'option_removed' | 'option_changed' | 'tool_removed'

export interface AnswerChange {
  reason: AnswerChangeReason
  q_id: string
  tool_index: number | null
  /** The question as it was on screen when the creator answered it. */
  question: string
  /** What the creator had entered, as it was on screen. */
  previous: string
}

export interface QuestionnaireRecovery {
  changes: AnswerChange[]
  /** New questions in the updated questionnaire. */
  added_questions: string[]
  acknowledgements_cleared: boolean
}

export type ContractProvenance = 'not_recorded' | 'changed'

const SEPARATE_FROM_DECLARATIONS = 'A response to a document observation is separate from your declarations. “Correct my answers” prepares a new declaration version, and the responses you chose here do not carry forward.'
const NEW_DECLARATION_VERSION = 'Submitting prepares a new declaration version, and this version stays as it is. Responses to document observations do not carry forward.'

export const RECOVERY_TEXT = {
  changed_heading: 'The questionnaire has changed',
  changed_body: 'It changed after this page was loaded. Nothing was recorded, and your answers have not been lost. Load the updated questions to review them. Nothing is submitted until you choose to submit again.',
  load: 'Load the updated questions',
  loading: 'Loading…',
  load_failed: 'The updated questions could not be loaded. Nothing was recorded. Please try again.',
  updated_heading: 'Review the updated questions',
  updated_body: 'Your other answers were kept. Check them against the questions below, then submit when you are ready.',
  reasons: {
    question_removed: 'This question is no longer asked',
    question_changed: 'This question changed, so please answer it again',
    applicability_changed: 'When this question applies has changed, so please answer it again if it is shown',
    option_removed: 'This choice is no longer offered',
    option_changed: 'What this choice means has changed, so please choose again',
    tool_removed: 'Fewer tools can be declared now',
  } satisfies Record<AnswerChangeReason, string>,
  earlier_answer: 'You had entered',
  added_heading: 'New questions',
  acknowledgements: 'Please confirm the statements at the end of the form again.',
  respond_blocked: {
    not_recorded: `Your responses to the document observations were not recorded, and this version was not changed. This version does not record which questionnaire contract it was prepared under, so that cannot be established and responses cannot be added to it. ${SEPARATE_FROM_DECLARATIONS}`,
    changed: `Your responses to the document observations were not recorded, and this version was not changed. The questionnaire contract has changed since this version was prepared, so responses cannot be added to it. ${SEPARATE_FROM_DECLARATIONS}`,
  } satisfies Record<ContractProvenance, string>,
  correction: {
    not_recorded: {
      heading: 'This version does not record its questionnaire contract',
      body: `Which questionnaire contract it was prepared under cannot be established, so your earlier answers are listed for reference and are not filled in. Please answer the questions below. ${NEW_DECLARATION_VERSION}`,
    },
    changed: {
      heading: 'The questionnaire contract has changed since this version was prepared',
      body: `Your earlier answers are listed for reference and are not filled in, because their questions may no longer mean the same thing. Please answer the questions below. ${NEW_DECLARATION_VERSION}`,
    },
  } satisfies Record<ContractProvenance, { heading: string; body: string }>,
} as const

/**
 * Why a version cannot take a response, or have its answers filled in, stated only as far as its own record establishes it. Call
 * this only once the version is known not to be under the current contract. A version with no recorded contract is never
 * described as a mismatch: nothing shows that its questionnaire differed.
 */
export const contractProvenanceOf = (recorded: { contract_sha256: string } | null): ContractProvenance => (recorded ? 'changed' : 'not_recorded')

/** Key-order independent, so a difference is always a difference in content. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(v) ?? 'null'
}

const withoutApproval = (entry: object) => Object.fromEntries(Object.entries(entry).filter(([k]) => k !== 'approval'))

/** What an answer to this question means, apart from when it applies and its individual options. */
function questionMeaning(d: QuestionnaireDefinition, q_id: string): string {
  const q = d.registryInput.questions.find((x) => x.q_id === q_id)!
  const p = d.presentation[q_id]
  return stable({
    version: q.version, question_kind: q.question_kind, wording_ref: q.wording_ref, free_text: q.options === 'free_text',
    text: p.text, help: p.help ?? null, input: p.input, per_tool: p.per_tool, allow_not_sure: p.allow_not_sure, exclusive_options: p.exclusive_options ?? [],
    map: d.registryInput.observation_map.filter((o) => o.q_id === q_id && (q.options === 'free_text' || o.applies_to.kind !== 'option')).map(withoutApproval),
    semantic: (d.registryInput.semantic_mappings ?? []).filter((m) => m.q_id === q_id).map((m) => ({ dependency_id: m.dependency_id })),
  })
}

/** What choosing this option means: its wording and what it maps to. */
function optionMeaning(d: QuestionnaireDefinition, q_id: string, value: string): string {
  return stable({
    label: d.presentation[q_id].option_labels[value] ?? null,
    map: d.registryInput.observation_map.filter((o) => o.q_id === q_id && o.applies_to.kind === 'option' && o.applies_to.value === value).map((o) => withoutApproval({ ...o, q_version: undefined, version: undefined })),
  })
}

const offered = (d: QuestionnaireDefinition, q_id: string) => d.registryInput.questions.find((x) => x.q_id === q_id)

function shownValue(d: QuestionnaireDefinition, q_id: string, value: string): string {
  if (value === 'not_sure' && d.presentation[q_id]?.option_labels[value] === undefined) return 'Not sure'
  return d.presentation[q_id]?.option_labels[value] ?? value
}

/** The answers that are still safe to keep, and a report of every one that is not. */
export function carryAnswersToContract(previous: QuestionnaireDefinition, next: QuestionnaireDefinition, state: CreatorRecordFormState | undefined): { state: CreatorRecordFormState | undefined; recovery: QuestionnaireRecovery } {
  const changes: AnswerChange[] = []
  const carry = (answers: Record<string, string[]>, tool_index: number | null): Record<string, string[]> => {
    const kept: Record<string, string[]> = {}
    for (const [q_id, values] of Object.entries(answers)) {
      const entered = values.filter((v) => v.trim() !== '')
      if (entered.length === 0) continue
      const before = offered(previous, q_id)
      const question = previous.presentation[q_id]?.text ?? q_id
      const report = (reason: AnswerChangeReason, shown: readonly string[]) => changes.push({ reason, q_id, tool_index, question, previous: shown.map((v) => shownValue(previous, q_id, v)).join('; ') })
      const after = offered(next, q_id)
      if (!before || !after || !next.presentation[q_id]) {
        report('question_removed', entered)
        continue
      }
      if (stable(before.display_condition) !== stable(after.display_condition)) {
        report('applicability_changed', entered)
        continue
      }
      if (questionMeaning(previous, q_id) !== questionMeaning(next, q_id)) {
        report('question_changed', entered)
        continue
      }
      if (after.options === 'free_text') {
        kept[q_id] = values
        continue
      }
      const options = after.options
      const stillOffered = entered.filter((v) => options.includes(v))
      const removed = entered.filter((v) => !options.includes(v))
      const unchanged = stillOffered.filter((v) => optionMeaning(previous, q_id, v) === optionMeaning(next, q_id, v))
      const altered = stillOffered.filter((v) => !unchanged.includes(v))
      if (removed.length > 0) report('option_removed', removed)
      if (altered.length > 0) report('option_changed', altered)
      if (unchanged.length > 0) kept[q_id] = unchanged
    }
    return kept
  }

  const addedIds = next.registryInput.questions.filter((q) => !offered(previous, q.q_id) && next.presentation[q.q_id]).map((q) => next.presentation[q.q_id].text)
  if (!state) return { state, recovery: { changes, added_questions: addedIds, acknowledgements_cleared: false } }

  const answers = carry(state.answers, null)
  const limit = Math.max(1, next.maxTools)
  state.tools.slice(limit).forEach((t, n) => {
    for (const [q_id, values] of Object.entries(t)) {
      const entered = values.filter((v) => v.trim() !== '')
      if (entered.length > 0) changes.push({ reason: 'tool_removed', q_id, tool_index: limit + n, question: previous.presentation[q_id]?.text ?? q_id, previous: entered.map((v) => shownValue(previous, q_id, v)).join('; ') })
    }
  })
  const tools = state.tools.slice(0, limit).map((t, i) => carry(t, i))
  return {
    state: { answers, tools, acknowledgements: {} },
    recovery: { changes, added_questions: addedIds, acknowledgements_cleared: Object.values(state.acknowledgements).some((v) => v === true) },
  }
}
