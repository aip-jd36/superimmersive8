/**
 * CR-V2-DECL-1A — generic declaration integrity: semantic mapping, uncertainty, exclusive selections and conditional
 * completeness. Pilot and synthetic bundles obey the same contracts; governance stays empty. Every "approved" source
 * here is a test fixture.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { QUESTIONNAIRE_CHROME } from '@/lib/creator-record-flow/wording'
import { declarationIntegrityRefusals, loadQuestionRegistry, NOT_APPLICABLE, type QuestionEntry, type RegistryInput } from '@/lib/creator-record/contract/question-registry'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { applyMultiSelection, formToObservations, validateForm, visibleQuestions, type CreatorRecordFormState, type FormConfig } from '@/lib/creator-record/prototype/form'
import { loadFormConfig } from '@/lib/creator-record/prototype/declared-guidance'
import { buildCreatorRecordDraft, pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { PILOT_QUESTION_META, PILOT_REGISTRY_INPUT } from '@/lib/creator-record/pilot/pilot-registry'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN_NULLABLE, SYNTHETIC_PDF_TEMPLATES_FINGERPRINT, SYNTHETIC_SOURCE_TEXT_SHA256 } from '@/lib/creator-record/governed/synthetic-test-authority'
import { resolvePublicationAuthority, selectAuthorityBundle } from '@/lib/creator-record/governed/publication-authority'
import { approvedCustomerRecordInputs, approvedPdfTemplates, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, isUncertainValue, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { checkApprovedSources } from '@/lib/creator-record/customer-record/sources'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { buildCustomerDocument } from '@/lib/creator-record/customer-pdf/document-model'
import { templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { getPrepared, preparePrepared as prepareAsSent, reviewPrepared, type ApprovedInputs, type FlowDeps, type NewPreparedRow, type PreparedRow, type PreparedStore } from '@/lib/creator-record/customer-flow/service'
import { T } from '@/lib/creator-record/presentation/templates'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { namingCurrentContract } from '@/test-support/questionnaire-approval'

const preparePrepared = namingCurrentContract(prepareAsSent)

if (!SYN_NULLABLE) throw new Error('synthetic authority is not populated')
const SYN = SYN_NULLABLE
const AS_OF = '2026-11-05'
const SCHEMA = { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION }
const CTX = { record_id: 'PREP-decl-1a', record_version: 1, captured_at: '2026-11-05T00:00:00.000Z' }

// ── Pilot: the 22-question candidate set ──
const pilot = pilotSources()
const config = (): FormConfig => loadFormConfig(pilot)
const pilotTool = { T1: ['kling'], T3: ['Pro'], T4: ['May 2026'] }
const pilotState = (answers: Record<string, string[]> = {}, tool: Record<string, string[]> = pilotTool): CreatorRecordFormState => ({
  answers: { P1: ['Video'], P3: ['own_channels'], F1: ['US'], F2: ['US'], L1: ['no'], M0: ['none'], H1: ['edited'], ...answers },
  tools: [tool],
  acknowledgements: { A1: true, A2: true },
})
const issuesOf = (state: CreatorRecordFormState, cfg = config()) => validateForm(cfg, state).map((i) => `${i.q_id}:${i.issue}`)

// ── Synthetic: the bundle admin UAT runs on, built through the real record builder and PDF model ──
const synInputs = approvedCustomerRecordInputs(SYN)
const synPdf = approvedPdfTemplates(SYN)
const synState = (answers: Record<string, string[]> = {}, tool: Record<string, string[]> = { T1: ['kling'], T3: ['Pro'] }) => ({
  answers: { P1: ['Video'], P3: ['own_channels'], F1: ['US'], F2: ['US'], L1: ['no'], M0: ['none'], H1: ['edited'], ...answers },
  tools: [tool],
  acknowledgements: { A1: true, A2: true },
})
const buildSyn = (state: unknown, inputs: ApprovedInputs = synInputs) => buildCustomerRecord({ state, sources: inputs.sources, source_text: inputs.source_text, topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: 'PREP-decl-1a', record_version: 1, captured_at: CTX.captured_at } })
function built(state: unknown, inputs: ApprovedInputs = synInputs) {
  const b = buildSyn(state, inputs)
  if (!b.ok) throw new Error(`not built: ${JSON.stringify(b)}`)
  return b
}
const pdfModel = (stored: { canonical: string; sha256: string }) => { const b = stored; return buildCustomerDocument({ canonical: b.canonical, sha256: b.sha256, issued: { record_id: 'CR-2026-ABCDEF12', issued_on: AS_OF }, templates: synPdf.templates, template_approval: synPdf.approval }) }
function pdfNotSureList(b: { canonical: string; sha256: string }): string[] {
  const blocks = pdfModel(b).sections.find((s) => s.id === 'open_items')!.blocks
  const at = blocks.findIndex((x) => 'text' in x && x.text === '[TEST ONLY] Not sure')
  if (at < 0) return []
  const out: string[] = []
  for (const x of blocks.slice(at + 1)) {
    if (x.kind !== 'bullet') break
    out.push(x.text)
  }
  return out
}
const question = (q_id: string) => SYN.presentation[q_id].text

const obsOf = (o: readonly { question: { q_id: string }; observation_kind: string; target: { kind: string } }[], q_id: string) => o.filter((x) => x.question.q_id === q_id).map((x) => ({ kind: x.observation_kind, target: x.target.kind }))

describe('A. semantic mapping', () => {
  test.each(['yes', 'no', 'not_sure'])('L1 %s stays a record-only declaration, in the pilot and through the synthetic record', (v) => {
    const fromPilot = formToObservations(config(), pilotState({ L1: [v], ...(v === 'yes' ? { L3: ['yes'] } : {}) }), CTX).observations
    expect(obsOf(fromPilot, 'L1')).toEqual([{ kind: 'record_only', target: 'none' }])
    const rec = built(synState({ L1: [v] })).record
    expect(obsOf(rec.declarations.observations, 'L1')).toEqual([{ kind: 'record_only', target: 'none' }])
    expect(rec.declarations.answers.find((a) => a.q_id === 'L1')?.values.map((x) => x.value)).toEqual([v])
  })

  test('no bundle maps any answer to a synthetic performer fact or to advertisement purpose', () => {
    for (const reg of [PILOT_REGISTRY_INPUT, SYN.registry_input]) {
      const targets = reg.observation_map.flatMap((o) => (o.target.kind === 'dependency' ? [o.target.dependency_id] : []))
      expect(targets.filter((t) => /synthetic_performer|advertisement_purpose/.test(t))).toEqual([])
    }
  })

  const appr: GovernanceApproval = { status: 'approved', approver: 'Test', decision_date: '2026-11-01', review_ref: 'TEST' }
  const reg = (over: Partial<RegistryInput> = {}): RegistryInput => ({
    questions: [{ q_id: 'Q', version: 2, question_kind: 'factual_value', wording_ref: 'x', options: ['a', 'not_sure'], display_condition: { kind: 'always' }, approval: appr }],
    observation_map: [{ o_id: 'O', version: 1, q_id: 'Q', q_version: 2, applies_to: { kind: 'any_answer' }, observation_kind: 'declared_value', target: { kind: 'dependency', dependency_id: 'dep' }, value_mapping_version: 'm', approval: appr }],
    semantic_mappings: [{ q_id: 'Q', q_version: 2, dependency_id: 'dep', review_ref: 'REVIEW-1' }],
    ...over,
  })
  const pres = { Q: { input: 'single', required: true } }
  const codes = (r: RegistryInput) => declarationIntegrityRefusals(r, pres).map((x) => x.code)

  test('a reviewed mapping for this question version passes', () => expect(codes(reg())).toEqual([]))
  test('a target that merely exists is never enough: no pair is refused', () => expect(codes(reg({ semantic_mappings: undefined }))).toEqual(['semantic_mapping_unreviewed']))
  test('an empty review reference is not a review', () => expect(codes(reg({ semantic_mappings: [{ q_id: 'Q', q_version: 2, dependency_id: 'dep', review_ref: ' ' }] }))).toEqual(['semantic_mapping_unreviewed']))
  test('a pair for another question version is stale and leaves the mapping unreviewed', () => {
    expect(codes(reg({ semantic_mappings: [{ q_id: 'Q', q_version: 1, dependency_id: 'dep', review_ref: 'R' }] })).sort()).toEqual(['semantic_mapping_stale', 'semantic_mapping_unreviewed'])
  })
  test('a pair no active mapping uses is stale', () => {
    expect(codes(reg({ semantic_mappings: [{ q_id: 'Q', q_version: 2, dependency_id: 'dep', review_ref: 'R' }, { q_id: 'Q', q_version: 2, dependency_id: 'gone', review_ref: 'R' }] }))).toEqual(['semantic_mapping_stale'])
  })
  test('an unapproved map entry attaches nothing, so needs no pair', () => {
    const r = reg({ semantic_mappings: [] })
    expect(codes({ ...r, observation_map: r.observation_map.map((o) => ({ ...o, approval: { ...appr, status: 'pending' as const } })) })).toEqual([])
  })

  test('both fail closed where a bundle is used: the source check refuses and the form config will not load', () => {
    const withoutPairs: CreatorRecordSources = { ...synInputs.sources, registry_input: { ...synInputs.sources.registry_input, semantic_mappings: [] } }
    const check = checkApprovedSources(withoutPairs, synInputs.source_text, CLAIMS, AS_OF, SCHEMA)
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.refusals.filter((r) => r.code === 'semantic_mapping_unreviewed').map((r) => r.ref).sort()).toEqual(['SYN-M4C-O-H1', 'SYN-M4C-O-M1-DEP'])
    expect(() => loadFormConfig(withoutPairs)).toThrow(/semantic_mapping_unreviewed/)
    const stalePilot: CreatorRecordSources = { ...pilot, registry_input: { ...pilot.registry_input, semantic_mappings: pilot.registry_input.semantic_mappings!.map((m) => ({ ...m, q_version: m.q_version + 1 })) } }
    expect(() => loadFormConfig(stalePilot)).toThrow(/semantic_mapping_stale/)
  })

  test('a pilot or synthetic review cannot authorize the governance bundle', () => {
    const marked: CreatorRecordSources = { ...synInputs.sources, registry_input: { ...synInputs.sources.registry_input, semantic_mappings: synInputs.sources.registry_input.semantic_mappings!.map((m) => ({ ...m, review_ref: 'PILOT-UAT review' })) } }
    const check = checkApprovedSources(marked, synInputs.source_text, CLAIMS, AS_OF, SCHEMA)
    expect(!check.ok && check.refusals.some((r) => r.code === 'pilot_marker')).toBe(true)
    const smuggled = { ...CREATOR_RECORD_GOVERNANCE_AUTHORITY, registry_input: { ...CREATOR_RECORD_GOVERNANCE_AUTHORITY.registry_input, semantic_mappings: SYN.registry_input.semantic_mappings } }
    expect(selectAuthorityBundle({ ok: true, mode: 'governance' }, { governance: smuggled, synthetic_test: SYN })).toBeNull()
  })

  test('every retained mapping has reviewed provenance, targets a governed fact and never a prohibited one', () => {
    const governed = new Set(CLAIMS.flatMap((c) => c.unresolved_project_dependencies ?? []))
    const pairs = (r: RegistryInput) => (r.semantic_mappings ?? []).map((m) => `${m.q_id} v${m.q_version} -> ${m.dependency_id}`).sort()
    expect(pairs(PILOT_REGISTRY_INPUT)).toEqual(['H1 v1 -> human_contribution_description', 'M1 v1 -> which_music_provider', 'M3 v1 -> which_provider'])
    expect(pairs(SYN.registry_input)).toEqual(['H1 v1 -> human_contribution_description', 'M1 v1 -> which_music_provider'])
    for (const r of [PILOT_REGISTRY_INPUT, SYN.registry_input]) {
      for (const m of r.semantic_mappings ?? []) {
        expect(m.review_ref.trim()).not.toBe('')
        expect(governed.has(m.dependency_id)).toBe(true)
        expect(r.prohibited_dependency_targets).not.toContain(m.dependency_id)
      }
    }
    expect(declarationIntegrityRefusals(PILOT_REGISTRY_INPUT, PILOT_QUESTION_META)).toEqual([])
    expect(declarationIntegrityRefusals(SYN.registry_input, SYN.presentation)).toEqual([])
  })

  test('a governed declaration only sits beside its dependency: the row stays open and not assessed', () => {
    const r = buildCreatorRecordDraft({ state: pilotState({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }), sources: pilot, topicClaims: CLAIMS, as_of: AS_OF, record: CTX })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const rows = r.guidance.composition.items.flatMap((i) => i.dependency_rows)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row).toMatchObject({ status: 'open', sufficiency: 'not_assessed', treated_as: 'evidence_required' })
  })
})

describe('B. uncertainty preservation', () => {
  test('closed-option "Not sure" appears in PDF open items, with the dedicated free-text form', () => {
    const b = built(synState({ P3: ['not_sure'], L1: ['not_sure'], M0: ['not_sure'] }, { T1: ['not_sure'], T3: ['not_sure'] }))
    expect(pdfNotSureList(b)).toEqual(['P3', 'T1', 'T3', 'L1', 'M0'].map(question))
  })

  test('the stored record and its digest are unchanged by the read: values keep their kinds', () => {
    const b = built(synState({ L1: ['not_sure'] }))
    pdfModel(b)
    expect(verifyCustomerRecord(b.canonical, b.sha256).ok).toBe(true)
    expect(b.record.declarations.answers.find((a) => a.q_id === 'L1')?.values[0].kind).toBe('option')
    expect(b.record.declarations.answers.find((a) => a.q_id === 'T3')?.values[0].kind).toBe('free_text')
  })

  test('mixed uncertainty stays visible and verbatim: both values are kept, printed and listed as open', () => {
    const b = built(synState({ F2: ['not_sure', 'US'], H1: ['edited', 'not_sure'] }))
    const f2 = b.record.declarations.answers.find((a) => a.q_id === 'F2')!
    expect(f2.values.map((v) => v.value)).toEqual(['not_sure', 'US'])
    expect(f2.answer_verbatim).toBe('[TEST ONLY] Option not_sure; [TEST ONLY] Option US')
    expect(pdfNotSureList(b)).toEqual(['F2', 'H1'].map(question))
    const printed = pdfModel(b).sections.flatMap((s) => s.blocks).flatMap((x) => ('text' in x ? [x.text] : []))
    expect(printed).toEqual(expect.arrayContaining(['[TEST ONLY] Option not_sure', '[TEST ONLY] Option US', '[TEST ONLY] Option edited']))
  })

  test('free text is never misclassified: "Not sure" typed as a plan name stays that plan name', () => {
    const b = built(synState({}, { T1: ['kling'], T3: ['Not sure'] }))
    const t3 = b.record.declarations.answers.find((a) => a.q_id === 'T3')!
    expect(t3.values).toEqual([{ value: 'Not sure', kind: 'free_text', label: null }])
    expect(pdfNotSureList(b)).toEqual([])
    expect(isUncertainValue(t3.values[0])).toBe(false)
  })

  test('a typed answer on a question with no "Not sure" choice is kept as typed', () => {
    const o = formToObservations(config(), pilotState({ P1: ['not_sure'] }), CTX).observations.filter((x) => x.question.q_id === 'P1')
    expect(o.map((x) => x.answer_verbatim)).toEqual(['not_sure'])
  })

  test('the free-text "Not sure" choice still records as uncertainty', () => {
    const o = formToObservations(config(), pilotState({}, { T1: ['kling'], T3: ['not_sure'], T4: ['not_sure'] }), CTX).observations.filter((x) => x.question.q_id === 'T4')
    expect(o.map((x) => x.answer_verbatim)).toEqual(['Not sure'])
  })
})

describe('C. exclusive selections', () => {
  test('an exclusive combination is refused by server validation, in both bundles', () => {
    expect(issuesOf(pilotState({ M0: ['none', 'music'], M1: ['artlist'], M2: ['yes'] }))).toEqual(['M0:exclusive_option_conflict'])
    expect(issuesOf(pilotState({ M0: ['not_sure', 'none'] }))).toEqual(['M0:exclusive_option_conflict'])
    const b = buildSyn(synState({ M0: ['none', 'music'], M1: ['artlist'] }))
    expect(b.ok).toBe(false)
    if (!b.ok && b.stage === 'form') expect(b.issues).toEqual([{ q_id: 'M0', tool_index: null, issue: 'exclusive_option_conflict' }])
  })

  test('ordinary multi-selects and partial uncertainty stay accepted', () => {
    expect(issuesOf(pilotState({ M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] }))).toEqual([])
    expect(issuesOf(pilotState({ M0: ['not_sure', 'music'], M1: ['artlist'], M2: ['yes'] }))).toEqual([])
    expect(issuesOf(pilotState({ P3: ['own_channels', 'festival_or_screening'] }))).toEqual([])
    expect(issuesOf(pilotState({ P3: ['not_sure', 'paid_advertising'], F3: ['GB'], F2: ['not_sure', 'US'], H1: ['not_sure', 'edited'] }))).toEqual([])
    expect(issuesOf(pilotState({ M0: ['none'] }))).toEqual([])
  })

  test('invalid configuration is refused: unknown option, "not sure", free text, a non-multi input, an empty or repeated list', () => {
    const q = (over: Partial<QuestionEntry>): QuestionEntry => ({ q_id: 'Q', version: 1, question_kind: 'factual_value', wording_ref: 'x', options: ['a', 'none', 'not_sure'], display_condition: { kind: 'always' }, approval: { status: 'approved', approver: 'T', decision_date: '2026-11-01', review_ref: 'T' }, ...over })
    const codes = (exclusive: readonly string[], input = 'multi', over: Partial<QuestionEntry> = {}) => declarationIntegrityRefusals({ questions: [q(over)], observation_map: [] }, { Q: { input, required: true, exclusive_options: exclusive } }).map((x) => x.code)
    expect(codes(['none'])).toEqual([])
    for (const bad of [codes(['missing']), codes(['not_sure']), codes(['none'], 'single'), codes(['none'], 'multi', { options: 'free_text' }), codes([]), codes(['none', 'none'])]) expect(bad).toEqual(['exclusive_option_invalid'])
  })

  test('the questionnaire applies the same metadata when ticking', () => {
    expect(applyMultiSelection(['music', 'stock'], 'none', true, ['none'])).toEqual(['none'])
    expect(applyMultiSelection(['none'], 'music', true, ['none'])).toEqual(['music'])
    expect(applyMultiSelection(['not_sure'], 'music', true, ['none'])).toEqual(['not_sure', 'music'])
    expect(applyMultiSelection(['music', 'not_sure'], 'not_sure', false, ['none'])).toEqual(['music'])
    expect(applyMultiSelection(['a'], 'b', true)).toEqual(['a', 'b'])
    const src = readFileSync(join(__dirname, '..', '..', 'components', 'creator-record', 'CreatorRecordQuestionnaire.tsx'), 'utf8')
    expect(src).toContain('applyMultiSelection(current, o, e.target.checked, p.exclusive_options)')
    // CR-V2-MVP-PROD-PREP-1: the issue wording lives in the customer wording set; the component reads it from there.
    expect(src).toContain('= C.issues')
    expect(QUESTIONNAIRE_CHROME.issues.exclusive_option_conflict).toMatch(/cannot be combined/)
  })

  test('validation holds no question id or content domain', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    const form = strip(readFileSync(join(__dirname, '..', '..', 'lib', 'creator-record', 'prototype', 'form.ts'), 'utf8'))
    const registry = strip(readFileSync(join(__dirname, '..', '..', 'lib', 'creator-record', 'contract', 'question-registry.ts'), 'utf8'))
    for (const src of [form, registry]) expect(src).not.toMatch(/['"](P1|P3|F1|F2|F3|L1|L3|M0|M1|M1X|M2|M3|M3X|M3D|M4|H1|H2|T1X|T4|music|stock|brands)['"]/)
  })
})

describe('D. conditional completeness', () => {
  test.each<[string, Record<string, string[]>, string[]]>([
    ['likeness', { L1: ['yes'] }, ['L3']],
    ['music', { M0: ['music'] }, ['M1', 'M2']],
    ['stock', { M0: ['stock'] }, ['M3', 'M3D']],
    ['brands', { M0: ['brands'] }, ['M4']],
    ['client material', { M0: ['client_material'] }, ['M4']],
    ['client work', { P3: ['client_work'] }, ['F3']],
    ['paid advertising', { P3: ['paid_advertising'] }, ['F3']],
  ])('a visible follow-up cannot disappear unanswered: %s', (_n, answers, required) => {
    expect(issuesOf(pilotState(answers))).toEqual(required.map((q) => `${q}:required`))
  })

  test('the synthetic bundle obeys the same rule', () => {
    const b = buildSyn(synState({ M0: ['music'] }))
    expect(!b.ok && b.stage === 'form' && b.issues).toEqual([{ q_id: 'M1', tool_index: null, issue: 'required' }])
  })

  test('"Not sure" satisfies a follow-up and stays uncertainty, never a negative', () => {
    expect(issuesOf(pilotState({ L1: ['yes'], L3: ['not_sure'], M0: ['brands'], M4: ['not_sure'] }))).toEqual([])
  })

  test('hidden follow-ups are not required, and a stale hidden answer never reaches the record', () => {
    expect(issuesOf(pilotState({ L1: ['no'], M0: ['none'] }))).toEqual([])
    const stale = pilotState({ M0: ['none'], M1: ['artlist'], M2: ['yes'], L1: ['no'], L3: ['yes'] })
    expect(issuesOf(stale)).toEqual([])
    const r = formToObservations(config(), stale, CTX)
    expect(r.discarded.map((d) => d.q_id).sort()).toEqual(['L3', 'M1', 'M2'])
    expect(r.observations.map((o) => o.question.q_id)).not.toEqual(expect.arrayContaining(['M1']))
    expect(JSON.stringify(built(synState({ M0: ['none'], M1: ['artlist'] })).record.declarations)).not.toContain('artlist')
  })

  test('a conditional question that is not required is refused as configuration', () => {
    const appr: GovernanceApproval = { status: 'approved', approver: 'T', decision_date: '2026-11-01', review_ref: 'T' }
    const q = (q_id: string, display_condition: QuestionEntry['display_condition']): QuestionEntry => ({ q_id, version: 1, question_kind: 'factual_value', wording_ref: 'x', options: ['yes', 'not_sure'], display_condition, approval: appr })
    const qs = [q('A', { kind: 'always' }), q('B', { kind: 'answer_includes', q_id: 'A', any_of: ['yes'] })]
    const pres = (required: boolean) => ({ A: { input: 'single', required: false }, B: { input: 'single', required } })
    expect(declarationIntegrityRefusals({ questions: qs, observation_map: [] }, pres(false))).toEqual([{ code: 'conditional_question_not_required', ref: 'B' }])
    expect(declarationIntegrityRefusals({ questions: qs, observation_map: [] }, pres(true))).toEqual([])
  })

  describe('nested conditional visibility', () => {
    const appr: GovernanceApproval = { status: 'approved', approver: 'T', decision_date: '2026-11-01', review_ref: 'T' }
    const q = (q_id: string, parent: string | null): QuestionEntry => ({
      q_id, version: 1, question_kind: 'factual_value', wording_ref: 'x', options: ['yes', 'no', 'not_sure'],
      display_condition: parent ? { kind: 'answer_includes', q_id: parent, any_of: ['yes'] } : { kind: 'always' }, approval: appr,
    })
    const loaded = loadQuestionRegistry({ questions: [q('A', null), q('B', 'A'), q('C', 'B'), q('D', 'C')], observation_map: [] })
    if (!loaded.ok) throw new Error('registry')
    const pm = (q_id: string) => ({ q_id, input: 'single' as const, required: true, per_tool: false, option_labels: {}, allow_not_sure: false })
    const cfg: FormConfig = { registry: loaded.registry, presentation: { A: pm('A'), B: pm('B'), C: pm('C'), D: pm('D') }, acknowledgement_ids: [], max_tools: 1 }
    const st = (answers: Record<string, string[]>): CreatorRecordFormState => ({ answers, tools: [{}], acknowledgements: {} })
    const shown = (answers: Record<string, string[]>) => visibleQuestions(cfg, answers).single.map((x) => x.q_id)
    const qIssues = (answers: Record<string, string[]>) => validateForm(cfg, st(answers)).filter((i) => i.q_id).map((i) => `${i.q_id}:${i.issue}`)

    test('each level appears only when its visible parent says so', () => {
      expect(shown({})).toEqual(['A'])
      expect(shown({ A: ['yes'] })).toEqual(['A', 'B'])
      expect(shown({ A: ['yes'], B: ['yes'] })).toEqual(['A', 'B', 'C'])
      expect(shown({ A: ['yes'], B: ['yes'], C: ['yes'] })).toEqual(['A', 'B', 'C', 'D'])
    })
    test('a hidden parent cannot reveal or require anything further down', () => {
      const stale = { A: ['no'], B: ['yes'], C: ['yes'] }
      expect(shown(stale)).toEqual(['A'])
      expect(qIssues(stale)).toEqual([])
      expect(qIssues({ A: ['no'], B: ['yes'] })).toEqual([])
    })
    test('a stale chain maps without refusal, and is reported as discarded', () => {
      const r = formToObservations(cfg, st({ A: ['no'], B: ['yes'], C: ['yes'] }), CTX)
      expect(r.observations.map((o) => o.question.q_id)).toEqual(['A'])
      expect(r.discarded.map((d) => d.q_id).sort()).toEqual(['B', 'C'])
    })
    test('a visible level is still required', () => {
      expect(qIssues({ A: ['yes'] })).toEqual(['B:required'])
      expect(qIssues({ A: ['yes'], B: ['yes'] })).toEqual(['C:required'])
    })
    test('a cycle reveals nothing and terminates', () => {
      const cyc = loadQuestionRegistry({ questions: [q('X', 'Y'), q('Y', 'X')], observation_map: [] })
      if (!cyc.ok) throw new Error('registry')
      expect(visibleQuestions({ ...cfg, registry: cyc.registry, presentation: { X: pm('X'), Y: pm('Y') } }, { X: ['yes'], Y: ['yes'] }).single).toEqual([])
    })
  })

  describe('"Not applicable" stays distinct from "No"', () => {
    test('L3 and M2 offer it; a question that does not define it refuses it', () => {
      const options = (id: string) => PILOT_REGISTRY_INPUT.questions.find((x) => x.q_id === id)?.options
      expect(options('L3')).toContain(NOT_APPLICABLE)
      expect(options('M2')).toContain(NOT_APPLICABLE)
      expect(PILOT_QUESTION_META.L3.option_labels[NOT_APPLICABLE]).toBeTruthy()
      expect(issuesOf(pilotState({ L1: ['yes'], L3: [NOT_APPLICABLE], M0: ['music'], M1: ['artlist'], M2: [NOT_APPLICABLE] }))).toEqual([])
      expect(issuesOf(pilotState({ M0: ['stock'], M3: ['getty'], M3D: [NOT_APPLICABLE] }))).toEqual(['M3D:invalid_option'])
    })

    test('it records as itself, attached to nothing governed, never normalized to "no"', () => {
      const obs = formToObservations(config(), pilotState({ L1: ['yes'], L3: [NOT_APPLICABLE] }), CTX).observations.filter((o) => o.question.q_id === 'L3')
      expect(obs).toHaveLength(1)
      expect(obs[0]).toMatchObject({ normalized_value: NOT_APPLICABLE, observation_kind: 'record_only', target: { kind: 'none' }, answer_verbatim: 'Not applicable', map_entry: null })
    })

    test('a map entry can never attach it', () => {
      const q: QuestionEntry = { q_id: 'Q', version: 1, question_kind: 'factual_value', wording_ref: 'x', options: ['a', NOT_APPLICABLE, 'not_sure'], display_condition: { kind: 'always' }, approval: { status: 'approved', approver: 'T', decision_date: '2026-11-01', review_ref: 'T' } }
      const r = loadQuestionRegistry({ questions: [q], observation_map: [{ o_id: 'O', version: 1, q_id: 'Q', q_version: 1, applies_to: { kind: 'option', value: NOT_APPLICABLE }, observation_kind: 'declared_value', target: { kind: 'tool_identity' }, value_mapping_version: 'm', approval: q.approval }] })
      expect(r.ok).toBe(false)
    })

    test('an any-answer map entry does not attach it either', () => {
      const appr: GovernanceApproval = { status: 'approved', approver: 'T', decision_date: '2026-11-01', review_ref: 'T' }
      const q: QuestionEntry = { q_id: 'Q', version: 1, question_kind: 'factual_value', wording_ref: 'x', options: ['a', NOT_APPLICABLE, 'not_sure'], display_condition: { kind: 'always' }, approval: appr }
      const reg = loadQuestionRegistry({ questions: [q], observation_map: [{ o_id: 'O', version: 1, q_id: 'Q', q_version: 1, applies_to: { kind: 'any_answer' }, observation_kind: 'declared_value', target: { kind: 'tool_identity' }, value_mapping_version: 'm', approval: appr }] })
      if (!reg.ok) throw new Error('registry')
      const cfg: FormConfig = { registry: reg.registry, presentation: { Q: { q_id: 'Q', input: 'single', required: true, per_tool: false, option_labels: { [NOT_APPLICABLE]: 'NA' }, allow_not_sure: false } }, acknowledgement_ids: [], max_tools: 1 }
      const o = formToObservations(cfg, { answers: { Q: [NOT_APPLICABLE] }, tools: [{}], acknowledgements: {} }, CTX).observations
      expect(o.map((x) => [x.observation_kind, x.target.kind])).toEqual([['record_only', 'none']])
    })

    test('the prototype says so plainly and does not list it as a document mentioned', () => {
      const draft = (answers: Record<string, string[]>) => {
        const r = buildCreatorRecordDraft({ state: pilotState(answers), sources: pilot, topicClaims: CLAIMS, as_of: AS_OF, record: CTX })
        if (!r.ok) throw new Error('draft')
        return r.view
      }
      const na = draft({ L1: ['yes'], L3: [NOT_APPLICABLE] })
      const no = draft({ L1: ['yes'], L3: ['no'] })
      expect(na.open_items.documents_mentioned).toEqual([])
      expect(no.open_items.documents_mentioned.map((d) => d.note)).toEqual([T.existence_no])
      const text = JSON.stringify(na)
      expect(text).toContain(T.existence_not_applicable)
      expect(text).not.toContain(T.existence_no)
      expect(text).not.toContain(T.existence_not_sure)
    })

    test('through a record and the PDF: printed as answered, kept apart from uncertainty', () => {
      // A test-only variant of the synthetic bundle in which L1 also offers it. The shipped bundle and its pins are untouched.
      const label = '[TEST ONLY] Option not_applicable'
      const sources: CreatorRecordSources = {
        ...synInputs.sources,
        registry_input: { ...synInputs.sources.registry_input, questions: synInputs.sources.registry_input.questions.map((q) => (q.q_id === 'L1' ? { ...q, options: [...(q.options as string[]), NOT_APPLICABLE] } : q)) },
        presentation: { ...synInputs.sources.presentation, L1: { ...synInputs.sources.presentation.L1, option_labels: { ...synInputs.sources.presentation.L1.option_labels, [NOT_APPLICABLE]: label } } },
      }
      const reg = loadQuestionRegistry(sources.registry_input)
      if (!reg.ok) throw new Error('registry')
      const inputs: ApprovedInputs = { sources: withQuestionnaireApproval(sources, SYN.acknowledgements), source_text: { acknowledgements: SYN.acknowledgements, approval: { ...SYN.source_text_approval!, content_sha256: sourceTextDigest(sourceTextContent(sources, reg.registry, SYN.acknowledgements)) } } }
      const b = built(synState({ L1: [NOT_APPLICABLE] }), inputs)
      const l1 = b.record.declarations.answers.find((a) => a.q_id === 'L1')!
      expect(l1.values).toEqual([{ value: NOT_APPLICABLE, kind: 'option', label }])
      expect(isUncertainValue(l1.values[0])).toBe(false)
      expect(pdfNotSureList(b)).toEqual([])
      const printed = pdfModel(b).sections.flatMap((s) => s.blocks).flatMap((x) => ('text' in x ? [x.text] : []))
      expect(printed).toContain(label)
      expect(printed).not.toContain('[TEST ONLY] Option no')
    })
  })
})

describe('correction and version semantics', () => {
  const NOW = new Date('2026-11-05T09:00:00.000Z')
  const OWNER = '11111111-1111-4111-8111-111111111111'
  const SYNTHETIC: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }
  function inputs(): ApprovedInputs {
    const sources: CreatorRecordSources = {
      ...pilot,
      kind: 'governed',
      registry_input: {
        ...pilot.registry_input,
        questions: pilot.registry_input.questions.map((q) => ({ ...q, approval: SYNTHETIC })),
        observation_map: pilot.registry_input.observation_map.map((o) => ({ ...o, approval: SYNTHETIC })),
      },
      ledger: pilot.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver: SYNTHETIC.approver as string })),
      versions: { registry: 'SYNTHETIC-REGISTRY-1', ledger: 'SYNTHETIC-LEDGER-1' },
    }
    const acks = Object.fromEntries(sources.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id}.`]))
    const reg = loadQuestionRegistry(sources.registry_input)
    if (!reg.ok) throw new Error('registry')
    return {
      sources: withQuestionnaireApproval(sources, acks),
      source_text: {
        acknowledgements: acks,
        approval: {
          source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(sources, reg.registry, acks)),
          categories: [...SOURCE_TEXT_CATEGORIES], record_schema: SCHEMA, lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-TEXT-REVIEW-1',
        },
      },
    }
  }
  function flow() {
    const rows = new Map<string, PreparedRow>()
    const calls = { insert: 0 }
    const store: PreparedStore = {
      async insert(row: NewPreparedRow) {
        calls.insert++
        const full: PreparedRow = { ...row, status: 'prepared', created_at: NOW.toISOString(), reviewed_at: null, submission_id: null }
        rows.set(row.id, JSON.parse(JSON.stringify(full)))
        return JSON.parse(JSON.stringify(full))
      },
      async get(id) { const r = rows.get(id); return r ? JSON.parse(JSON.stringify(r)) : null },
      async latestVersion(d) { const l = Array.from(rows.values()).filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version); return l[0] ? JSON.parse(JSON.stringify(l[0])) : null },
      async markReviewed(id, u) {
        const r = rows.get(id)
        if (!r || r.user_id !== u || r.status !== 'prepared') return null
        r.status = 'reviewed'
        r.reviewed_at = NOW.toISOString()
        return JSON.parse(JSON.stringify(r))
      },
    }
    let seq = 0
    const deps: FlowDeps = { submissions: 'open', hasPilotAccess: async () => true, store, inputs, topicClaims: CLAIMS, now: () => NOW, newId: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}` }
    return { deps, rows, calls }
  }

  test('invalid combinations and missing follow-ups cannot reach prepared-version creation', async () => {
    const { deps, calls } = flow()
    const invalid: Record<string, string[]>[] = [{ M0: ['none', 'music'], M1: ['artlist'], M2: ['yes'] }, { M0: ['music'] }, { L1: ['yes'] }]
    for (const answers of invalid) {
      const r = await preparePrepared(deps, OWNER, { state: pilotState(answers) })
      expect(r).toMatchObject({ ok: false, status: 400, code: 'invalid_answers' })
    }
    expect(calls.insert).toBe(0)
  })

  test('a correction creates the next version, and the confirmed version is unchanged', async () => {
    const { deps, rows } = flow()
    const v1 = await preparePrepared(deps, OWNER, { state: pilotState({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }) })
    if (!v1.ok) throw new Error('v1')
    const confirmed = await reviewPrepared(deps, OWNER, v1.view.id)
    expect(confirmed).toMatchObject({ ok: true, view: { status: 'reviewed', version: 1 } })
    const before = JSON.stringify(rows.get(v1.view.id))

    // Refused corrections leave everything as it was.
    const refused = await preparePrepared(deps, OWNER, { state: pilotState({ M0: ['none', 'music'], M1: ['artlist'], M2: ['yes'] }), draft_id: v1.view.draft_id })
    expect(refused).toMatchObject({ ok: false, code: 'invalid_answers' })
    expect(rows.size).toBe(1)

    const v2 = await preparePrepared(deps, OWNER, { state: pilotState({ M0: ['none'], L1: ['yes'], L3: [NOT_APPLICABLE] }), draft_id: v1.view.draft_id })
    if (!v2.ok) throw new Error('v2')
    expect(v2.view).toMatchObject({ version: 2, status: 'prepared', draft_id: v1.view.draft_id })
    expect(JSON.stringify(rows.get(v1.view.id))).toBe(before)
    const reread = await getPrepared(deps, OWNER, v1.view.id)
    expect(reread).toMatchObject({ ok: true, view: { status: 'reviewed', version: 1 } })
    if (reread.ok) expect(reread.view.declarations.answers.find((a) => a.q_id === 'M0')?.answer).toBe(PILOT_QUESTION_META.M0.option_labels.music)
  })

  test('a follow-up answered, hidden by a correction and shown again comes back visibly, in the stored answers only', async () => {
    const { deps } = flow()
    const v1 = await preparePrepared(deps, OWNER, { state: pilotState({ M0: ['music'], M1: ['artlist'], M2: ['yes'] }) })
    if (!v1.ok) throw new Error('v1')
    const hidden = pilotState({ M0: ['none'], M1: ['artlist'], M2: ['yes'] })
    const v2 = await preparePrepared(deps, OWNER, { state: hidden, draft_id: v1.view.draft_id })
    if (!v2.ok) throw new Error('v2')
    expect(v2.view.declarations.answers.map((a) => a.q_id)).not.toContain('M1')
    expect(v2.view.form_state.answers.M1).toEqual(['artlist'])
    const v3 = await preparePrepared(deps, OWNER, { state: { ...v2.view.form_state, answers: { ...v2.view.form_state.answers, M0: ['music'] } }, draft_id: v1.view.draft_id })
    if (!v3.ok) throw new Error('v3')
    expect(v3.view.version).toBe(3)
    expect(v3.view.declarations.answers.map((a) => a.q_id)).toEqual(expect.arrayContaining(['M1', 'M2']))
  })
})

describe('guidance is unchanged by removing the two mappings', () => {
  // The established matrix: tools x plans x uses x likeness x materials, fully answered.
  const states: CreatorRecordFormState[] = []
  for (const L1 of ['no', 'not_sure', 'yes']) for (const tool of ['kling', 'pika', 'runway-gen3', 'other_tool', 'not_sure']) for (const plan of ['Pro', 'Standard', 'not_sure']) for (const P3 of [['own_channels'], ['paid_advertising'], ['client_work', 'paid_advertising']]) for (const mat of ['none', 'music', 'stock', 'both']) {
    const a: Record<string, string[]> = { P3, L1: [L1], M0: mat === 'both' ? ['music', 'stock'] : [mat] }
    if (P3.length > 1 || P3[0] === 'paid_advertising') a.F3 = ['GB']
    if (L1 === 'yes') a.L3 = ['yes']
    if (mat === 'music' || mat === 'both') Object.assign(a, { M1: ['artlist'], M2: ['yes'] })
    if (mat === 'stock' || mat === 'both') Object.assign(a, { M3: ['getty'], M3D: ['yes'] })
    const t: Record<string, string[]> = { T1: [tool], T3: [plan], T4: ['May 2026'] }
    if (tool === 'other_tool') t.T1X = ['Other']
    states.push(pilotState(a, t))
  }
  const template = pilot.registry_input.observation_map.find((o) => o.q_id === 'H1')!
  // The mappings as they were before CR-V2-DECL-1A.
  const previous: CreatorRecordSources = {
    ...pilot,
    registry_input: {
      ...pilot.registry_input,
      observation_map: [
        ...pilot.registry_input.observation_map,
        { ...template, o_id: 'PREV-O-P3', q_id: 'P3', applies_to: { kind: 'option', value: 'paid_advertising' }, observation_kind: 'declared_value', target: { kind: 'dependency', dependency_id: 'advertisement_purpose_confirmed' } },
        { ...template, o_id: 'PREV-O-L1', q_id: 'L1', applies_to: { kind: 'option', value: 'yes' }, observation_kind: 'declared_presence', target: { kind: 'dependency', dependency_id: 'synthetic_performer_present_confirmed' } },
      ],
      semantic_mappings: [
        ...pilot.registry_input.semantic_mappings!,
        { q_id: 'P3', q_version: 1, dependency_id: 'advertisement_purpose_confirmed', review_ref: 'TEST' },
        { q_id: 'L1', q_version: 1, dependency_id: 'synthetic_performer_present_confirmed', review_ref: 'TEST' },
      ],
    },
  }
  const guidance = (sources: CreatorRecordSources, state: CreatorRecordFormState) => {
    const r = buildCreatorRecordDraft({ state, sources, topicClaims: CLAIMS, as_of: AS_OF, record: CTX })
    if (!r.ok) throw new Error(JSON.stringify(r.issues))
    return JSON.stringify(r.guidance.composition)
  }

  test('identical on every state of the matrix', () => {
    expect(states.length).toBe(540)
    expect(states.filter((s) => guidance(pilot, s) !== guidance(previous, s))).toEqual([])
  })

  test('the matrix exercises real guidance', () => {
    expect(new Set(states.map((s) => guidance(pilot, s))).size).toBeGreaterThan(5)
  })
})

describe('compatibility', () => {
  // CR-V2-MVP-PROD-PREP-1: re-pinned once, because the Source Text content now names the customer wording set.
  test('synthetic pinned digests are unchanged, and still match the wording and templates', () => {
    expect(SYNTHETIC_SOURCE_TEXT_SHA256).toBe('973029718942ffd4aa60b481126fef74d65cad3b693dd38252052172e1faf1f0')
    expect(SYNTHETIC_PDF_TEMPLATES_FINGERPRINT).toBe('19857320de6f205f3c56d899beb5f05cf8b1359e3e6035dc32be123880458ec2')
    const reg = loadQuestionRegistry(SYN.registry_input)
    if (!reg.ok) throw new Error('registry')
    expect(sourceTextDigest(sourceTextContent(synInputs.sources, reg.registry, SYN.acknowledgements))).toBe(SYNTHETIC_SOURCE_TEXT_SHA256)
    expect(templateFingerprint(SYN.pdf_templates)).toBe(SYNTHETIC_PDF_TEMPLATES_FINGERPRINT)
    expect(checkApprovedSources(synInputs.sources, synInputs.source_text, CLAIMS, AS_OF, SCHEMA).ok).toBe(true)
  })

  test('governance stays empty, and prepares nothing, until approved sources exist', () => {
    const g = CREATOR_RECORD_GOVERNANCE_AUTHORITY
    expect(g.registry_input.questions).toEqual([])
    expect(g.registry_input.observation_map).toEqual([])
    expect(g.registry_input.semantic_mappings ?? []).toEqual([])
    expect(g.presentation).toEqual({})
    expect(g.publication_ledger).toEqual([])
    expect(g.source_text_approval).toBeNull()
    expect(resolvePublicationAuthority({})).toEqual({ ok: true, mode: 'governance' })
    const inputs = approvedCustomerRecordInputs(g)
    const check = checkApprovedSources(inputs.sources, inputs.source_text, CLAIMS, AS_OF, SCHEMA)
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.refusals.map((r) => r.code)).toContain('no_approved_questions')
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
  })
})
