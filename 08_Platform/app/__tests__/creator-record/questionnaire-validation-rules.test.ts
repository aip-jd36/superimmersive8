/**
 * CR-V2-DECL-1B-1 — the guard on `QUESTIONNAIRE_VALIDATION_RULES`.
 *
 * The rules are code, so no contract digest can see them. These two checks make a change to them hard to miss:
 *   1. BEHAVIOUR: a fixed registry and fixed answers go through the real validation; the digest of every result is pinned.
 *      It catches a behaviour change anywhere in the code they reach, but only for inputs exercised here.
 *   2. SOURCE: the digest of the rule files is pinned. It catches any edit to those files, even a comment, and nothing outside them.
 *
 * WHEN THIS FAILS: if behaviour changed, raise the rules version and add a new pin. The version is in the contract, so that also
 * changes the contract digest and every approval must be renewed, which is the point. If only the source changed and behaviour did
 * not (a comment, a rename), update the source pin for the current version and say so in the commit.
 *
 * LIMITS. It runs only when the test suite runs: nothing detects a rule change at runtime, and no CI job runs this suite today.
 * Someone can edit a pin without raising the version; only review catches that. It does not detect arbitrary code changes.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { declarationIntegrityRefusals, loadQuestionRegistry, mapAnswer, type RegistryInput } from '@/lib/creator-record/contract/question-registry'
import { QUESTIONNAIRE_VALIDATION_RULES } from '@/lib/creator-record/customer-record/questionnaire-contract'
import { applyMultiSelection, formToObservations, shownToolQuestionIds, validateForm, visibleQuestions, visibleToolQuestions, type CreatorRecordFormState, type FormConfig, type QuestionPresentation } from '@/lib/creator-record/prototype/form'
import { parseFormState } from '@/lib/creator-record/prototype/parse-form-state'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'

/** One entry per rules version, never removed. */
const PINS: Record<number, { behaviour: string; source: string }> = {
  1: { behaviour: 'd459041bbd7959d7d760b094709cb34820144f889ae9173d84d76bb54923ca1d', source: 'a939b6eaae66d90938331b0ab1a95b638d75fb0dcf9ff61aa12ec3dbe14609b1' },
}
const RULE_FILES = ['lib/creator-record/contract/question-registry.ts', 'lib/creator-record/prototype/form.ts', 'lib/creator-record/prototype/parse-form-state.ts', 'lib/creator-record/prototype/declared-guidance.ts']

const approval = { status: 'approved' as const, approver: 'Fixture', decision_date: '2026-01-01', review_ref: 'FIXTURE' }
const question = (q_id: string, options: string[] | 'free_text', display_condition: RegistryInput['questions'][number]['display_condition'] = { kind: 'always' }) =>
  ({ q_id, version: 1, question_kind: 'factual_value' as const, wording_ref: q_id, options, display_condition, approval })
const INPUT: RegistryInput = {
  questions: [
    question('A', ['x', 'y', 'none', 'not_sure']),
    question('B', ['yes', 'no', 'not_sure', 'not_applicable'], { kind: 'answer_includes', q_id: 'A', any_of: ['x'] }),
    question('C', 'free_text', { kind: 'all', conditions: [{ kind: 'answer_includes', q_id: 'A', any_of: ['x'] }, { kind: 'answer_includes', q_id: 'B', any_of: ['yes'] }] }),
    question('D', 'free_text'),
    question('E', ['p', 'q', 'not_sure']),
    question('F', 'free_text', { kind: 'answer_includes', q_id: 'E', any_of: ['q'] }),
    question('G', 'free_text'),
  ],
  observation_map: [
    { o_id: 'O1', version: 1, q_id: 'A', q_version: 1, applies_to: { kind: 'option', value: 'x' }, observation_kind: 'declared_presence', target: { kind: 'dependency', dependency_id: 'dep' }, value_mapping_version: 'M', approval },
    { o_id: 'O2', version: 1, q_id: 'E', q_version: 1, applies_to: { kind: 'option', value: 'p' }, observation_kind: 'declared_value', target: { kind: 'tool_identity' }, value_mapping_version: 'M', approval },
    { o_id: 'O3', version: 1, q_id: 'G', q_version: 1, applies_to: { kind: 'any_answer' }, observation_kind: 'declared_value', target: { kind: 'applicability_fact', fact: 'tool_plan_tier' }, value_mapping_version: 'M', approval },
  ],
  semantic_mappings: [{ q_id: 'A', q_version: 1, dependency_id: 'dep', review_ref: 'R' }],
}
const p = (q_id: string, over: Partial<QuestionPresentation> = {}): QuestionPresentation => ({ q_id, input: 'single', required: true, per_tool: false, option_labels: {}, allow_not_sure: false, ...over })
const PRESENTATION: Record<string, QuestionPresentation> = {
  A: p('A', { input: 'multi', exclusive_options: ['none'], option_labels: { x: 'X', y: 'Y', none: 'None', not_sure: 'Not sure' } }),
  B: p('B', { option_labels: { yes: 'Yes', no: 'No', not_sure: 'Not sure', not_applicable: 'N/A' } }),
  C: p('C', { input: 'text' }),
  D: p('D', { input: 'textarea', required: false, allow_not_sure: true }),
  E: p('E', { input: 'select', per_tool: true, option_labels: { p: 'P', q: 'Q', not_sure: 'Not sure' } }),
  F: p('F', { input: 'text', per_tool: true }),
  G: p('G', { input: 'plan', per_tool: true, allow_not_sure: true }),
}
const loaded = loadQuestionRegistry(INPUT)
if (!loaded.ok) throw new Error(loaded.errors.join('; '))
const CONFIG: FormConfig = { registry: loaded.registry, presentation: PRESENTATION, acknowledgement_ids: ['A1'], max_tools: 2 }
const CTX = { record_id: 'REC', record_version: 1, captured_at: '2026-01-01T00:00:00.000Z' }

const tool = (over: Record<string, string[]> = {}) => ({ E: ['p'], G: ['Plan'], ...over })
const st = (answers: Record<string, string[]>, tools: Record<string, string[]>[] = [tool()], ack = true): CreatorRecordFormState => ({ answers, tools, acknowledgements: { A1: ack } })
const STATES: Record<string, CreatorRecordFormState> = {
  valid_minimal: st({ A: ['y'] }),
  valid_chain: st({ A: ['x'], B: ['yes'], C: ['typed'], D: ['more'] }),
  required_top_blank: st({}),
  required_conditional_blank: st({ A: ['x'] }),
  required_chain_blank: st({ A: ['x'], B: ['yes'] }),
  blank_whitespace: st({ A: ['x'], B: ['yes'], C: ['   '] }),
  exclusive_conflict: st({ A: ['none', 'x'], B: ['no'] }),
  exclusive_alone: st({ A: ['none'] }),
  not_sure_with_value: st({ A: ['x', 'not_sure'], B: ['not_sure'] }),
  not_applicable: st({ A: ['x'], B: ['not_applicable'] }),
  invalid_option: st({ A: ['z'] }),
  two_on_single: st({ A: ['x'], B: ['yes', 'no'] }),
  two_free_text: st({ A: ['y'], D: ['one', 'two'] }),
  too_long: st({ A: ['y'], D: ['x'.repeat(501)] }),
  exactly_long_enough: st({ A: ['y'], D: ['x'.repeat(500)] }),
  free_text_not_sure: st({ A: ['y'], D: ['not_sure'] }),
  hidden_answer_kept_out: st({ A: ['y'], B: ['yes'], C: ['hidden'] }),
  hidden_answer_cannot_reveal: st({ A: ['y'], B: ['yes'] }),
  unknown_question: st({ A: ['y'], ZZ: ['q'] }),
  unknown_tool_question: st({ A: ['y'] }, [tool({ ZZ: ['q'] })]),
  no_tools: st({ A: ['y'] }, []),
  too_many_tools: st({ A: ['y'] }, [tool(), tool(), tool()]),
  tool_conditional_shown: st({ A: ['y'] }, [tool({ E: ['q'], F: ['named'] })]),
  tool_conditional_blank: st({ A: ['y'] }, [tool({ E: ['q'] })]),
  tool_conditional_hidden: st({ A: ['y'] }, [tool({ F: ['named'] })]),
  tool_not_sure_plan: st({ A: ['y'] }, [tool({ G: ['not_sure'] })]),
  second_tool_blank: st({ A: ['y'] }, [tool(), {}]),
  acknowledgement_missing: st({ A: ['y'] }, [tool()], false),
}

function behaviour(): unknown {
  const forms = Object.fromEntries(Object.entries(STATES).map(([name, s]) => {
    const issues = validateForm(CONFIG, s)
    const shown = visibleQuestions(CONFIG, s.answers)
    return [name, {
      issues,
      shown: { single: shown.single.map((q) => q.q_id), per_tool: shown.per_tool.map((q) => q.q_id) },
      tools: s.tools.map((t) => visibleToolQuestions(CONFIG, s.answers, t).map((q) => q.q_id)),
      tool_ids: shownToolQuestionIds(CONFIG, s),
      mapped: issues.length === 0 ? formToObservations(CONFIG, s, CTX) : null,
    }]
  }))
  const selections = [
    applyMultiSelection(['x'], 'none', true, ['none']), applyMultiSelection(['none'], 'x', true, ['none']), applyMultiSelection(['x', 'y'], 'x', false, ['none']),
    applyMultiSelection(['x'], 'y', true), applyMultiSelection([], 'not_sure', true, ['none']),
  ]
  const parsing = [
    STATES.valid_chain, { answers: { a: ['x'] }, tools: [], acknowledgements: {} }, { answers: {}, tools: [], acknowledgements: { B1: true } }, { answers: {}, tools: [], acknowledgements: {}, extra: 1 },
    { answers: { A: Array(13).fill('x') }, tools: [], acknowledgements: {} }, { answers: {}, tools: Array(11).fill({}), acknowledgements: {} }, { answers: { ABCDEFG: ['x'] }, tools: [], acknowledgements: {} },
  ].map((b) => parseFormState(b).ok)
  const refused = {
    conditional_not_required: declarationIntegrityRefusals(INPUT, { ...PRESENTATION, B: { ...PRESENTATION.B, required: false } }),
    exclusive_not_sure: declarationIntegrityRefusals(INPUT, { ...PRESENTATION, A: { ...PRESENTATION.A, exclusive_options: ['not_sure'] } }),
    unreviewed: declarationIntegrityRefusals({ ...INPUT, semantic_mappings: [] }, PRESENTATION),
    stale: declarationIntegrityRefusals({ ...INPUT, semantic_mappings: [...(INPUT.semantic_mappings ?? []), { q_id: 'A', q_version: 9, dependency_id: 'dep', review_ref: 'R' }] }, PRESENTATION),
    registry_no_not_sure: loadQuestionRegistry({ ...INPUT, questions: [question('A', ['x'])], observation_map: [] }),
    map_not_sure: mapAnswer(loaded.ok ? loaded.registry : (null as never), { A: ['x'] }, CTX, { q_id: 'A', q_version: 2, values: ['x'], verbatim: 'X' }),
  }
  return JSON.parse(JSON.stringify({ forms, selections, parsing, refused }))
}

const hash = (v: unknown) => sha256Hex(canonicalJson(v))
const sourceHash = () => sha256Hex(canonicalJson(RULE_FILES.map((f) => [f, readFileSync(join(__dirname, '..', '..', f), 'utf8').replace(/\r\n/g, '\n')])))

describe('questionnaire validation rules guard', () => {
  test('there is a pin for this version and every earlier one', () => {
    expect(Object.keys(PINS).map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: QUESTIONNAIRE_VALIDATION_RULES.version }, (_, i) => i + 1))
  })

  test('behaviour matches the pin for this rules version', () => {
    expect(hash(behaviour())).toBe(PINS[QUESTIONNAIRE_VALIDATION_RULES.version].behaviour)
  })

  test('the rule files match the pin for this rules version', () => {
    expect(sourceHash()).toBe(PINS[QUESTIONNAIRE_VALIDATION_RULES.version].source)
  })

  test('the corpus really exercises the rules: each kind of issue and a discarded answer appear', () => {
    const b = behaviour() as { forms: Record<string, { issues: { issue: string }[]; mapped: { discarded: unknown[] } | null }> }
    const seen = new Set(Object.values(b.forms).flatMap((f) => f.issues.map((i) => i.issue)))
    expect(Array.from(seen).sort()).toEqual(['acknowledgement_required', 'exclusive_option_conflict', 'invalid_option', 'no_tools', 'required', 'single_choice_only', 'too_long', 'too_many_tools', 'unknown_question'])
    expect(Object.values(b.forms).some((f) => (f.mapped?.discarded.length ?? 0) > 0)).toBe(true)
  })

  test('the guard notices a behaviour change: a corpus result moved by one rule changes the digest', () => {
    const relaxed: FormConfig = { ...CONFIG, presentation: { ...PRESENTATION, A: { ...PRESENTATION.A, exclusive_options: [] } } }
    expect(validateForm(relaxed, STATES.exclusive_conflict)).toEqual([])
    expect(validateForm(CONFIG, STATES.exclusive_conflict)).toEqual([{ q_id: 'A', tool_index: null, issue: 'exclusive_option_conflict' }])
    const b = behaviour() as { forms: Record<string, { issues: unknown[] }> }
    const moved = JSON.parse(JSON.stringify(b))
    moved.forms.exclusive_conflict.issues = []
    expect(hash(moved)).not.toBe(hash(b))
  })
})
