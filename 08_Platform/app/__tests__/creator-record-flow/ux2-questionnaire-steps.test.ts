/**
 * SI8-UX-2 — the multi-step questionnaire is presentation over the unchanged governed questionnaire.
 *
 * Uses the PRODUCTION question registry and presentation (`CREATOR_RECORD_GOVERNANCE_AUTHORITY`), so every question, option,
 * condition and requirement checked here is the authoritative one. Proves: the steps are the governed sections in the governed
 * order, then the acknowledgements; every issue belongs to exactly one step; a step's own check is the same `validateForm` result
 * filtered to that step; conditional questions appear and become required on their step exactly as before; hidden answers are
 * still discarded; server issues open the earliest step they concern.
 */
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { formToObservations, validateForm, visibleQuestions, type CreatorRecordFormState, type FormConfig, type FormIssue } from '@/lib/creator-record/prototype/form'
import { CUSTOMER_SECTION_TITLES, QUESTIONNAIRE_SECTION_ORDER } from '@/lib/creator-record/prototype/questionnaire-structure'
import { ACKNOWLEDGEMENTS_STEP, firstStepWithIssues, issuesForStep, questionnaireSteps, stepOfIssue } from '@/lib/creator-record-flow/questionnaire-steps'

const sources = approvedCustomerRecordInputs(GOV).sources
const loaded = loadQuestionRegistry(sources.registry_input)
if (!loaded.ok) throw new Error('registry')
const ACK_IDS = Object.keys(GOV.acknowledgements)
const CONFIG: FormConfig = { registry: loaded.registry, presentation: sources.presentation, acknowledgement_ids: ACK_IDS, max_tools: sources.max_tools }
const P = sources.presentation as Record<string, { section: string }>
const ALL_STEPS = questionnaireSteps(new Set(QUESTIONNAIRE_SECTION_ORDER))
const state = (answers: Record<string, string[]>, tools: Record<string, string[]>[] = [{}], acknowledgements: Record<string, boolean> = {}): CreatorRecordFormState => ({ answers, tools, acknowledgements })
const ids = (issues: FormIssue[]) => issues.map((i) => `${i.q_id}${i.tool_index !== null ? `@${i.tool_index}` : ''}:${i.issue}`).sort()
const stepIssues = (s: CreatorRecordFormState, step: string) => ids(issuesForStep(validateForm(CONFIG, s), step, P, ACK_IDS, ALL_STEPS))

describe('steps are the governed sections, in order, then the acknowledgements', () => {
  test('seven steps, governed order and titles unchanged', () => {
    expect(ALL_STEPS).toEqual(['project', 'locations', 'tools', 'people', 'materials', 'contribution', ACKNOWLEDGEMENTS_STEP])
    expect(QUESTIONNAIRE_SECTION_ORDER).toEqual(['project', 'locations', 'tools', 'people', 'materials', 'contribution'])
    expect(CUSTOMER_SECTION_TITLES).toEqual({
      acknowledgements: 'Before you continue', contribution: 'Your own contribution', locations: 'Where you are and where it will be shown',
      materials: 'Material from other sources', people: 'Real people', project: 'Your video', tools: 'The AI tools you used',
    })
  })

  test('every always-shown question is on its governed section\'s step', () => {
    const shown = visibleQuestions(CONFIG, {})
    expect(shown.single.map((q) => `${q.q_id}:${P[q.q_id].section}`)).toEqual(['P1:project', 'P2:project', 'P3:project', 'F1:locations', 'F2:locations', 'L1:people', 'M0:materials', 'H1:contribution', 'H2:contribution'])
    expect(shown.per_tool.map((q) => `${q.q_id}:${P[q.q_id].section}`)).toEqual(['T1:tools', 'T3:tools', 'T4:tools'])
  })

  test('the steps exactly partition the full validation result (nothing lost, nothing duplicated)', () => {
    const all = validateForm(CONFIG, state({}, [{}], {}))
    const perStep = ALL_STEPS.flatMap((s) => issuesForStep(all, s, P, ACK_IDS, ALL_STEPS))
    expect(ids(perStep)).toEqual(ids(all))
  })
})

describe('each step checks exactly its own governed requirements', () => {
  const empty = state({})
  test('project: P1 and P3 required, P2 optional', () => expect(stepIssues(empty, 'project')).toEqual(['P1:required', 'P3:required']))
  test('locations: F1 and F2 required; F3 hidden unless the video is client work or paid advertising', () => {
    expect(stepIssues(empty, 'locations')).toEqual(['F1:required', 'F2:required'])
    expect(stepIssues(state({ P3: ['own_channels'] }), 'locations')).toEqual(['F1:required', 'F2:required'])
    expect(stepIssues(state({ P3: ['client_work'] }), 'locations')).toEqual(['F1:required', 'F2:required', 'F3:required'])
    expect(stepIssues(state({ P3: ['paid_advertising'] }), 'locations')).toEqual(['F1:required', 'F2:required', 'F3:required'])
  })
  test('tools: T1, T3 and T4 required per tool; at least one tool; T1 offers only Higgsfield, Runway and Not sure', () => {
    expect(stepIssues(empty, 'tools')).toEqual(['T1@0:required', 'T3@0:required', 'T4@0:required'])
    expect(stepIssues(state({}, []), 'tools')).toEqual(['null:no_tools'])
    expect(stepIssues(state({}, [{ T1: ['pika'], T3: ['Standard'], T4: ['October 2026'] }]), 'tools')).toEqual(['T1@0:invalid_option'])
    expect(loaded.registry.questions.get('T1')!.options).toEqual(['higgsfield', 'runway-gen3', 'not_sure'])
    expect(stepIssues(state({}, [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['March–May 2026'] }, { T1: ['higgsfield'], T3: ['not_sure'], T4: ['not_sure'] }]), 'tools')).toEqual([])
  })
  test('people: L1 required', () => expect(stepIssues(empty, 'people')).toEqual(['L1:required']))
  test('materials: M0 required; each follow-up appears and is required only under its condition', () => {
    expect(stepIssues(empty, 'materials')).toEqual(['M0:required'])
    expect(stepIssues(state({ M0: ['music'] }), 'materials')).toEqual(['M1:required', 'M2:required'])
    expect(stepIssues(state({ M0: ['music'], M1: ['other_provider'] }), 'materials')).toEqual(['M1X:required', 'M2:required'])
    expect(stepIssues(state({ M0: ['stock'] }), 'materials')).toEqual(['M3:required', 'M3D:required'])
    expect(stepIssues(state({ M0: ['brands'] }), 'materials')).toEqual(['M4:required'])
    expect(stepIssues(state({ M0: ['client_material'] }), 'materials')).toEqual(['M4:required'])
    expect(stepIssues(state({ M0: ['none', 'music'] }), 'materials')).toEqual(['M0:exclusive_option_conflict', 'M1:required', 'M2:required'])
  })
  test('contribution: H1 required, H2 optional', () => expect(stepIssues(empty, 'contribution')).toEqual(['H1:required']))
  test('acknowledgements: A1 and A2 required', () => {
    expect(stepIssues(empty, ACKNOWLEDGEMENTS_STEP)).toEqual(['A1:acknowledgement_required', 'A2:acknowledgement_required'])
    expect(stepIssues(state({}, [{}], { A1: true, A2: true }), ACKNOWLEDGEMENTS_STEP)).toEqual([])
  })
})

describe('hidden answers are still removed, whatever step they were given on', () => {
  test('an answer to a follow-up hidden by a later change on another step is discarded before mapping', () => {
    const answers = { P1: ['T'], P3: ['own_channels'], F1: ['TW'], F2: ['US'], F3: ['US'], L1: ['no'], M0: ['none'], M1: ['artlist'], M2: ['yes'], H1: ['edited'] }
    const s = state(answers, [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['October 2026'] }], { A1: true, A2: true })
    expect(validateForm(CONFIG, s)).toEqual([])
    const ctx = { record_id: 'UX2-TEST', record_version: 1, captured_at: '2026-11-16T00:00:00.000Z' }
    const { discarded } = formToObservations(CONFIG, s, ctx)
    expect(discarded.map((d) => d.q_id).sort()).toEqual(['F3', 'M1', 'M2'])
  })
})

describe('server issues open the earliest step they concern', () => {
  const issue = (q_id: string | null, i: FormIssue['issue'], tool_index: number | null = null): FormIssue => ({ q_id, tool_index, issue: i })
  test('mapping of every kind of issue', () => {
    expect(stepOfIssue(issue('P1', 'required'), P, ACK_IDS, ALL_STEPS)).toBe('project')
    expect(stepOfIssue(issue('F3', 'required'), P, ACK_IDS, ALL_STEPS)).toBe('locations')
    expect(stepOfIssue(issue('T4', 'required', 1), P, ACK_IDS, ALL_STEPS)).toBe('tools')
    expect(stepOfIssue(issue(null, 'too_many_tools'), P, ACK_IDS, ALL_STEPS)).toBe('tools')
    expect(stepOfIssue(issue('M3D', 'required'), P, ACK_IDS, ALL_STEPS)).toBe('materials')
    expect(stepOfIssue(issue('A2', 'acknowledgement_required'), P, ACK_IDS, ALL_STEPS)).toBe(ACKNOWLEDGEMENTS_STEP)
    // An issue the presentation does not know is still shown (first step), never dropped.
    expect(stepOfIssue(issue('ZZ9', 'unknown_question'), P, ACK_IDS, ALL_STEPS)).toBe('project')
  })
  test('the earliest step wins; none → null', () => {
    expect(firstStepWithIssues([issue('A1', 'acknowledgement_required'), issue('M2', 'required'), issue('T1', 'required', 0)], P, ACK_IDS, ALL_STEPS)).toBe('tools')
    expect(firstStepWithIssues([], P, ACK_IDS, ALL_STEPS)).toBeNull()
  })
})
