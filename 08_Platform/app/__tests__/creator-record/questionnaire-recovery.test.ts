/**
 * CR-V2-DECL-1B-2 — what happens to entered answers when the questionnaire changed under an open page.
 *
 * The pure comparison, then the client's rules read from its source. The repo has no DOM test environment; the browser journey
 * itself was run in Chrome against a production build and is reported with the slice, not pinned here.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { carryAnswersToContract, RECOVERY_TEXT, type AnswerChangeReason, type QuestionnaireDefinition } from '@/lib/creator-record-flow/questionnaire-recovery'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import type { CreatorRecordFormState } from '@/lib/creator-record/prototype/form'

/* eslint-disable @typescript-eslint/no-explicit-any */
const APP = join(__dirname, '..', '..')
const definition = (): QuestionnaireDefinition & { registryInput: any; presentation: any; acknowledgements: any } => {
  const i = JSON.parse(JSON.stringify(syntheticUatInputs()))
  return { registryInput: i.sources.registry_input, presentation: i.sources.presentation, acknowledgements: i.source_text.acknowledgements, maxTools: i.sources.max_tools }
}
const STATE = (): CreatorRecordFormState => ({
  answers: { P1: ['My title'], P3: ['own_channels', 'paid_advertising'], F1: ['TW'], F2: ['US'], L1: ['no'], M0: ['music'], M1: ['artlist'], H1: ['edited'] },
  tools: [{ T1: ['kling'], T3: ['Pro'] }],
  acknowledgements: { A1: true, A2: true },
})
const question = (d: any, id: string) => d.registryInput.questions.find((q: any) => q.q_id === id)
const reasonsOf = (r: ReturnType<typeof carryAnswersToContract>) => r.recovery.changes.map((c) => [c.q_id, c.reason])

describe('nothing changed for an answer: it is kept', () => {
  test('a change elsewhere keeps every other answer exactly as entered', () => {
    const next = definition()
    next.presentation.P1.text = 'Changed'
    const r = carryAnswersToContract(definition(), next, STATE())
    const { P1: _changed, ...rest } = STATE().answers
    expect(r.state!.answers).toEqual(rest)
    expect(r.state!.tools).toEqual(STATE().tools)
  })

  test.each([
    ['an entry approval', (d: any) => { question(d, 'F2').approval = { ...question(d, 'F2').approval, decision_date: '2026-12-01' } }],
    ['requiredness alone', (d: any) => { d.presentation.F2.required = false }],
    ['a label on an option that was not chosen', (d: any) => { d.presentation.F2.option_labels.GB = 'Changed' }],
    ['a new option beside the chosen one', (d: any) => { question(d, 'F2').options = [...question(d, 'F2').options, 'FR']; d.presentation.F2.option_labels.FR = 'France' }],
  ])('%s does not touch the answer', (_n, change) => {
    const next = definition()
    change(next)
    const r = carryAnswersToContract(definition(), next, STATE())
    expect(r.state!.answers.F2).toEqual(['US'])
    expect(r.recovery.changes).toEqual([])
  })
})

describe('anything that changes what an answer means takes it out and reports it', () => {
  const cases: [string, string, AnswerChangeReason, (d: any) => void][] = [
    ['changed question wording', 'P1', 'question_changed', (d) => { d.presentation.P1.text = 'Changed' }],
    ['changed help', 'P1', 'question_changed', (d) => { d.presentation.P1.help = 'Now means something else' }],
    ['a raised question version', 'P1', 'question_changed', (d) => { question(d, 'P1').version = 2 }],
    ['a different input', 'F1', 'question_changed', (d) => { d.presentation.F1.input = 'select' }],
    ['a free-text question that became closed', 'P1', 'question_changed', (d) => { question(d, 'P1').options = ['a', 'b']; d.presentation.P1.option_labels = { a: 'A', b: 'B' } }],
    ['changed exclusivity', 'F2', 'question_changed', (d) => { d.presentation.F2.exclusive_options = ['not_sure'] }],
    ['a question-wide mapping', 'H1', 'question_changed', (d) => { d.registryInput.observation_map.find((o: any) => o.q_id === 'H1').target = { kind: 'dependency', dependency_id: 'other' } }],
    ['a semantic mapping', 'H1', 'question_changed', (d) => { d.registryInput.semantic_mappings = d.registryInput.semantic_mappings.filter((m: any) => m.q_id !== 'H1') }],
    ['changed applicability', 'M1', 'applicability_changed', (d) => { question(d, 'M1').display_condition = { kind: 'answer_includes', q_id: 'M0', any_of: ['music', 'not_sure'] } }],
    ['a removed question', 'H1', 'question_removed', (d) => { d.registryInput.questions = d.registryInput.questions.filter((q: any) => q.q_id !== 'H1'); delete d.presentation.H1 }],
    ['a removed option', 'F1', 'option_removed', (d) => { question(d, 'F1').options = question(d, 'F1').options.filter((o: string) => o !== 'TW') }],
    ['changed option meaning, stored value unchanged', 'F1', 'option_changed', (d) => { d.presentation.F1.option_labels.TW = 'Taiwan, excluding its islands' }],
    ['what a chosen option maps to, label unchanged', 'M1', 'option_changed', (d) => { d.registryInput.observation_map.find((o: any) => o.o_id === 'SYN-M4C-O-M1-artlist').target = { kind: 'dependency', dependency_id: 'other' } }],
  ]
  test.each(cases)('%s', (_n, id, reason, change) => {
    const next = definition()
    change(next)
    const r = carryAnswersToContract(definition(), next, STATE())
    expect(r.state!.answers[id]).toBeUndefined()
    expect(reasonsOf(r)).toEqual([[id, reason]])
  })

  test('the report keeps the wording the creator saw and what they entered, so nothing is lost silently', () => {
    const before = definition()
    const next = definition()
    next.presentation.P1.text = 'Changed'
    next.presentation.F1.option_labels.TW = 'Changed label'
    const r = carryAnswersToContract(before, next, STATE())
    expect(r.recovery.changes).toEqual([
      { reason: 'question_changed', q_id: 'P1', tool_index: null, question: before.presentation.P1.text, previous: 'My title' },
      { reason: 'option_changed', q_id: 'F1', tool_index: null, question: before.presentation.F1.text, previous: before.presentation.F1.option_labels.TW },
    ])
  })

  test('a multi-choice answer keeps the choices that still mean the same, and reports only the rest', () => {
    const next = definition()
    next.presentation.P3.option_labels.paid_advertising = 'Changed'
    const r = carryAnswersToContract(definition(), next, STATE())
    expect(r.state!.answers.P3).toEqual(['own_channels'])
    expect(r.recovery.changes).toMatchObject([{ q_id: 'P3', reason: 'option_changed', previous: definition().presentation.P3.option_labels.paid_advertising }])
  })

  test('a per-tool answer is compared in its own tool block, and reported against it', () => {
    const next = definition()
    next.presentation.T3.text = 'Changed'
    const state = STATE()
    state.tools = [{ T1: ['kling'], T3: ['Pro'] }, { T1: ['pika'], T3: ['Standard'] }]
    const r = carryAnswersToContract(definition(), next, state)
    expect(r.state!.tools).toEqual([{ T1: ['kling'] }, { T1: ['pika'] }])
    expect(r.recovery.changes.map((c) => [c.q_id, c.tool_index, c.previous])).toEqual([['T3', 0, 'Pro'], ['T3', 1, 'Standard']])
  })

  test('tool blocks the new contract no longer allows are removed and reported, never dropped silently', () => {
    const next = definition()
    next.maxTools = 1
    const state = STATE()
    state.tools = [{ T1: ['kling'] }, { T1: ['pika'], T3: ['Standard'] }]
    const r = carryAnswersToContract(definition(), next, state)
    expect(r.state!.tools).toEqual([{ T1: ['kling'] }])
    expect(r.recovery.changes.map((c) => [c.reason, c.q_id, c.tool_index])).toEqual([['tool_removed', 'T1', 1], ['tool_removed', 'T3', 1]])
  })

  test('a free-text "Not sure" is shown as the creator saw it', () => {
    const next = definition()
    next.presentation.T3.text = 'Changed'
    const state = STATE()
    state.tools = [{ T1: ['kling'], T3: ['not_sure'] }]
    expect(carryAnswersToContract(definition(), next, state).recovery.changes[0].previous).toBe('Not sure')
  })
})

describe('acknowledgements and new questions', () => {
  test('acknowledgements are always cleared, even when their wording did not change', () => {
    const r = carryAnswersToContract(definition(), definition(), STATE())
    expect(r.state!.acknowledgements).toEqual({})
    expect(r.recovery.acknowledgements_cleared).toBe(true)
  })

  test('nothing ticked: nothing to report', () => {
    expect(carryAnswersToContract(definition(), definition(), { ...STATE(), acknowledgements: { A1: false } }).recovery.acknowledgements_cleared).toBe(false)
  })

  test('a new question is announced, and answers nothing', () => {
    const next = definition()
    next.registryInput.questions = [...next.registryInput.questions, { ...question(next, 'P1'), q_id: 'P9' }]
    next.presentation.P9 = { ...next.presentation.P1, q_id: 'P9', text: 'A new question' }
    const r = carryAnswersToContract(definition(), next, STATE())
    expect(r.recovery.added_questions).toEqual(['A new question'])
    expect(r.state!.answers.P9).toBeUndefined()
  })

  test('no answers yet: nothing to carry, and no answers invented', () => {
    expect(carryAnswersToContract(definition(), definition(), undefined).state).toBeUndefined()
  })

  test('the input is never modified', () => {
    const state = STATE()
    const copy = JSON.parse(JSON.stringify(state))
    const next = definition()
    next.presentation.P1.text = 'Changed'
    carryAnswersToContract(definition(), next, state)
    expect(state).toEqual(copy)
  })
})

describe('generic, and client safe', () => {
  const source = readFileSync(join(APP, 'lib', 'creator-record-flow', 'questionnaire-recovery.ts'), 'utf8')
  test('knows no question, option or bundle', () => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/['"](P1|P3|F1|F2|T1|T1X|T3|L1|M0|M1|M1X|H1|A1|A2)['"]/)
    expect(code).not.toMatch(/\b(kling|pika|artlist|music)\b/i)
  })
  test('imports types only, so nothing server-side reaches the browser', () => {
    expect(source.match(/^import .*$/gm)!.every((l) => l.startsWith('import type '))).toBe(true)
  })
  test('every reason has wording', () => {
    expect(Object.keys(RECOVERY_TEXT.reasons).sort()).toEqual(['applicability_changed', 'option_changed', 'option_removed', 'question_changed', 'question_removed', 'tool_removed'])
  })
})

describe('the client', () => {
  const client = readFileSync(join(APP, 'app', 'creator-record', 'CreatorRecordV2Client.tsx'), 'utf8').replace(/\r\n/g, '\n')
  const effect = client.slice(client.indexOf('useEffect(() => {'), client.indexOf('[props.questionnaireContractSha256])'))

  test('names the questionnaire on screen, outside the answers', () => {
    expect(client).toContain('contractSha256: displayed.sha256')
    expect(client).toContain('questionnaire_contract_sha256: displayed.sha256')
  })
  test('EXPLICIT RESUBMISSION ONLY: receiving the update sends nothing', () => {
    expect(effect).not.toMatch(/\bpost\(|\bsubmit\(|\bfetch\(/)
  })
  test('the only way to the update is the button, and it only asks the server for the page', () => {
    expect(client.match(/router\.refresh\(\)/g)).toHaveLength(1)
    expect(client).toMatch(/onClick=\{\(\) => \{ setUpdateRequested\(true\); startUpdate\(\(\) => router\.refresh\(\)\) \}\}/)
  })
  test('the form is withdrawn until the update has arrived', () => {
    const stale = client.slice(client.indexOf('if (questionnaireChanged) {'), client.indexOf('<CreatorRecordQuestionnaire'))
    expect(stale.indexOf('return (')).toBeGreaterThan(-1)
    expect(client.indexOf('if (questionnaireChanged) {')).toBeLessThan(client.indexOf('<CreatorRecordQuestionnaire'))
    expect(effect).toContain('setQuestionnaireChanged(false)')
  })
  test('the answers come back only through the comparison', () => {
    expect(effect).toContain('carryAnswersToContract(displayed.definition, next, lastState)')
    expect(effect).toContain('setLastState(carried.state)')
    expect(effect).toContain('setFormKey((k) => k + 1)')
  })
  test('a response names its own version\'s contract, and a refusal does not become a correction', () => {
    const respond = client.slice(client.indexOf('async function respond('), client.indexOf('async function submit('))
    expect(respond).toContain('contractSha256: view.questionnaire_contract?.contract_sha256 ?? null')
    expect(respond).not.toContain('displayed.sha256')
    expect(respond).toContain('setError(RECOVERY_TEXT.respond_blocked)')
    expect(respond).not.toMatch(/setMode|setQuestionnaireChanged|correct\(/)
  })
  test('a correction fills in answers only under the same contract; otherwise it lists them', () => {
    const correct = client.slice(client.indexOf('function correct()'), client.indexOf('const uatNotice'))
    expect(correct).toContain('view.questionnaire_contract?.contract_sha256 === displayed.sha256')
    expect(correct).toContain('setLastState(sameQuestionnaire ? view.form_state : undefined)')
    expect(correct).toContain('setEarlierAnswers(sameQuestionnaire ? null : view.declarations.answers)')
  })
  test('both pages pass the digest from the same render as the questions', () => {
    for (const page of [['app', 'creator-record', 'page.tsx'], ['app', 'admin', 'creator-record-v2', 'uat', 'page.tsx']]) {
      expect(readFileSync(join(APP, ...page), 'utf8')).toContain('questionnaireContractSha256={check.approved.questionnaire_contract.contract_sha256}')
    }
  })
})
