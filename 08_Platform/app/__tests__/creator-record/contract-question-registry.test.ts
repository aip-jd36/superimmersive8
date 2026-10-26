/**
 * CR-IMPL-1 — Question Registry (Q) and Observation Map (O): fail-closed
 * loading, question eligibility, declaration-to-observation mapping and
 * provenance. Synthetic entries only.
 */

import { activeObservations, type DeclaredObservation, type RecordContext } from '@/lib/creator-record/contract/provenance'
import { eligibleQuestions, loadQuestionRegistry, mapAnswer, type QuestionRegistry, type RegistryInput } from '@/lib/creator-record/contract/question-registry'
import { buildDependencyRows } from '@/lib/creator-record/contract/dependency-rows'
import { APPROVED, synLabel, synRegistryInput } from '@/lib/creator-record/contract/testing/synthetic-fixtures'

const CTX: RecordContext = { record_id: 'SYN-REC-1', record_version: 1, captured_at: '2026-10-25T00:00:00Z' }

function load(input: RegistryInput = synRegistryInput()): QuestionRegistry {
  const r = loadQuestionRegistry(input)
  if (!r.ok) throw new Error(r.errors.join('; '))
  return r.registry
}

function answer(reg: QuestionRegistry, q_id: string, values: string[], answers: Record<string, string[]> = {}): DeclaredObservation[] {
  const r = mapAnswer(reg, answers, CTX, { q_id, q_version: 1, values, verbatim: values.join(', ') })
  if (!r.ok) throw new Error(r.reason)
  return r.observations
}

describe('registry loading fails closed', () => {
  test('the synthetic registry loads', () => {
    expect(loadQuestionRegistry(synRegistryInput()).ok).toBe(true)
  })

  const broken: [string, (i: RegistryInput) => void, RegExp][] = [
    ['a prohibited question kind (legal adequacy)', (i) => ((i.questions[0] as { question_kind: string }).question_kind = 'legal_adequacy'), /not permitted/],
    ['closed options without not_sure', (i) => (i.questions[0].options = ['syn_free', 'syn_paid']), /must include 'not_sure'/],
    ['a display condition on an unknown question', (i) => (i.questions[0].display_condition = { kind: 'answer_includes', q_id: 'NOPE', any_of: ['x'] }), /unknown question NOPE/],
    ['a self-referencing display condition', (i) => (i.questions[0].display_condition = { kind: 'answer_includes', q_id: 'SYN-TOOL-PLAN', any_of: ['x'] }), /references itself/],
    ['a duplicate question', (i) => i.questions.push({ ...i.questions[0] }), /duplicate question/],
    ['a map entry targeting jurisdiction', (i) => ((i.observation_map[0].target as { fact: string }).fact = 'jurisdiction'), /'jurisdiction' cannot be declared/],
    ['a map entry targeting a prohibited dependency', (i) => (i.observation_map[1].target = { kind: 'dependency', dependency_id: 'syn_legal_determination_dep' }), /may not be targeted/],
    ['a map entry attaching not_sure', (i) => (i.observation_map[1].applies_to = { kind: 'option', value: 'not_sure' }), /never attaches/],
    ['a map entry for an option the question lacks', (i) => (i.observation_map[1].applies_to = { kind: 'option', value: 'maybe' }), /not an option/],
    ['a map entry against a different question version', (i) => (i.observation_map[1].q_version = 2), /does not match/],
    ['a map entry with record_only kind', (i) => ((i.observation_map[1] as { observation_kind: string }).observation_kind = 'record_only'), /not mappable/],
    ['an unknown location role', (i) => ((i.observation_map[4].target as { role: string }).role = 'governing_law'), /unknown location role/],
  ]
  test.each(broken)('rejects the whole registry: %s', (_name, mutate, err) => {
    const input = synRegistryInput()
    mutate(input)
    const r = loadQuestionRegistry(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join('\n')).toMatch(err)
  })
})

describe('question eligibility (layer Q)', () => {
  const reg = load()
  const ids = (a: Record<string, string[]>) => eligibleQuestions(reg, a).map((q) => q.q_id)

  test('pending entries are never shown', () => {
    expect(ids({})).not.toContain('SYN-PENDING-Q')
  })

  test('conditional questions depend only on earlier answers', () => {
    expect(ids({})).not.toContain('SYN-DOC-EXISTS')
    expect(ids({ 'SYN-PRESENCE': ['no'] })).not.toContain('SYN-DOC-EXISTS')
    expect(ids({ 'SYN-PRESENCE': ['yes'] })).toContain('SYN-DOC-EXISTS')
  })

  test('display conditions cannot reference dependency state (only answer-based kinds exist)', () => {
    const input = synRegistryInput()
    ;(input.questions[0] as { display_condition: unknown }).display_condition = { kind: 'dependency_unresolved', dependency_id: 'syn_presence_dep' }
    const r = loadQuestionRegistry(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/only answer-based conditions exist/)
  })

  test('an empty registry asks nothing', () => {
    const r = loadQuestionRegistry({ questions: [], observation_map: [] })
    expect(r.ok && eligibleQuestions(r.registry, {})).toEqual([])
  })
})

describe('declaration-to-observation mapping (layer O)', () => {
  const reg = load()

  test('answers to questions that are not shown are refused', () => {
    expect(mapAnswer(reg, {}, CTX, { q_id: 'SYN-PENDING-Q', q_version: 1, values: ['yes'], verbatim: 'Yes' })).toEqual({ ok: false, reason: 'question_not_active' })
    expect(mapAnswer(reg, {}, CTX, { q_id: 'SYN-DOC-EXISTS', q_version: 1, values: ['yes'], verbatim: 'Yes' })).toEqual({ ok: false, reason: 'question_not_active' })
    expect(mapAnswer(reg, {}, CTX, { q_id: 'UNKNOWN', q_version: 1, values: ['yes'], verbatim: 'Yes' })).toEqual({ ok: false, reason: 'question_not_active' })
  })

  test('version mismatch, invalid option and empty answers are refused', () => {
    expect(mapAnswer(reg, {}, CTX, { q_id: 'SYN-PRESENCE', q_version: 2, values: ['yes'], verbatim: 'Yes' })).toEqual({ ok: false, reason: 'question_version_mismatch' })
    expect(mapAnswer(reg, {}, CTX, { q_id: 'SYN-PRESENCE', q_version: 1, values: ['perhaps'], verbatim: 'Perhaps' })).toEqual({ ok: false, reason: 'invalid_option' })
    expect(mapAnswer(reg, {}, CTX, { q_id: 'SYN-PRESENCE', q_version: 1, values: [], verbatim: '' })).toEqual({ ok: false, reason: 'empty_answer' })
  })

  test('an approved mapping attaches the declaration with full provenance', () => {
    const [obs] = answer(reg, 'SYN-TOOL-PLAN', ['syn_paid'])
    expect(obs).toEqual({
      observation_id: 'SYN-REC-1:v1:SYN-TOOL-PLAN:0',
      source_kind: 'customer_declared',
      record_id: 'SYN-REC-1',
      record_version: 1,
      question: { q_id: 'SYN-TOOL-PLAN', q_version: 1 },
      instance: null,
      answer_verbatim: 'syn_paid',
      normalized_value: 'syn_paid',
      observation_kind: 'declared_value',
      target: { kind: 'applicability_fact', fact: 'tool_plan_tier', tool: 'syn-tool' },
      map_entry: { o_id: 'SYN-O-PLAN', o_version: 1, value_mapping_version: 'SYN-MAP-1' },
      captured_at: '2026-10-25T00:00:00Z',
      supersedes: null,
    })
  })

  test('an answer with only a pending mapping is record-only', () => {
    const [obs] = answer(reg, 'SYN-PRESENCE', ['no'])
    expect(obs.observation_kind).toBe('record_only')
    expect(obs.target).toEqual({ kind: 'none' })
    expect(obs.map_entry).toBeNull()
    expect(obs.answer_verbatim).toBe('no')
  })

  test('"not sure" never attaches to anything governed', () => {
    const [obs] = answer(reg, 'SYN-TOOL-PLAN', ['not_sure'])
    expect(obs.target).toEqual({ kind: 'none' })
    expect(obs.map_entry).toBeNull()
  })

  test('free text keeps the verbatim answer and has no normalized value', () => {
    const r = mapAnswer(reg, {}, CTX, { q_id: 'SYN-DESCRIBE', q_version: 1, values: ['I edited it'], verbatim: 'I edited it' })
    expect(r.ok && r.observations[0]).toMatchObject({ answer_verbatim: 'I edited it', normalized_value: null, observation_kind: 'declared_description' })
  })

  test('the registry has no approval of its own: an approval with no approver is inert', () => {
    const input = synRegistryInput()
    input.questions = input.questions.map((q) => (q.q_id === 'SYN-PRESENCE' ? { ...q, approval: { ...APPROVED, approver: null } } : q))
    expect(eligibleQuestions(load(input), {}).map((q) => q.q_id)).not.toContain('SYN-PRESENCE')
  })
})

describe('customer declarations never resolve dependencies', () => {
  const reg = load()

  test('an existence "yes" on an evidence-only dependency is shown beside it; the dependency stays open and not assessed', () => {
    const answers = { 'SYN-PRESENCE': ['yes'] }
    const obs = [...answer(reg, 'SYN-PRESENCE', ['yes']), ...answer(reg, 'SYN-DOC-EXISTS', ['yes'], answers)]
    const [row] = buildDependencyRows(['syn_evidence_only_dep'], obs, synLabel)
    expect(row).toMatchObject({
      dependency_id: 'syn_evidence_only_dep',
      label: 'SYN evidence-only dimension',
      evidence_requirement: 'not_defined_by_governance',
      treated_as: 'evidence_required',
      sufficiency: 'not_assessed',
      status: 'open',
    })
    expect(row.declarations.map((d) => [d.observation_id, d.observation_kind, d.map_entry.o_id])).toEqual([['SYN-REC-1:v1:SYN-DOC-EXISTS:0', 'declared_document_existence', 'SYN-O-DOC']])
  })

  test('record-only observations never appear on a dependency row', () => {
    const obs = answer(reg, 'SYN-PRESENCE', ['no'])
    expect(buildDependencyRows(['syn_presence_dep'], obs, synLabel)[0].declarations).toEqual([])
  })

  test('missing labels stay null, never the raw dependency id', () => {
    expect(buildDependencyRows(['syn_presence_dep'], [], synLabel)[0].label).toBeNull()
  })

  test('superseded declarations are excluded from rows but kept in history', () => {
    const first = answer(reg, 'SYN-DESCRIBE', ['v1 text'])[0]
    const second: DeclaredObservation = { ...first, observation_id: 'SYN-REC-1:v2:SYN-DESCRIBE:0', record_version: 2, answer_verbatim: 'v2 text', supersedes: first.observation_id }
    const all = [first, second]
    expect(activeObservations(all)).toEqual([second])
    expect(buildDependencyRows(['syn_description_dep'], all, synLabel)[0].declarations.map((d) => d.answer_verbatim)).toEqual(['v2 text'])
    expect(all).toHaveLength(2)
  })
})
