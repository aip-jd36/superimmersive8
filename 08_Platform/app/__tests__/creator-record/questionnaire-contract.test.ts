/**
 * CR-V2-DECL-1B-1 — the questionnaire contract approval gate.
 *
 * Proves: the digest is deterministic and moves with every classified field; an unclassified field is refused, never omitted;
 * every approval defect refuses at both the form gate and preparation; validation reads the same definition that was approved;
 * records prepared before this contract read and re-prepare byte for byte; the commercial locks and the empty governance bundle
 * are untouched. It also records what the digest does not prove.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'node:crypto'
import { getPrepared, preparePrepared, verifiedRecord, type ApprovedInputs, type FlowDeps, type NewPreparedRow, type PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { approvedCustomerRecordInputs, CREATOR_RECORD_V2_SUBMISSIONS, currentPublicationAuthority } from '@/lib/creator-record/customer-flow/approved-inputs'
import { syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import { AUTHORITY_KINDS } from '@/lib/creator-record/customer-record/authority-content'
import {
  questionnaireContract, QUESTIONNAIRE_CONTRACT_ID, QUESTIONNAIRE_FIELD_CLASSES, QUESTIONNAIRE_VALIDATION_RULES, unclassifiedQuestionnaireFields, type QuestionnaireContractApproval,
} from '@/lib/creator-record/customer-record/questionnaire-contract'
import { buildCustomerRecord, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, verifyCustomerRecord } from '@/lib/creator-record/customer-record/record'
import { checkApprovedSources } from '@/lib/creator-record/customer-record/sources'
import { sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV } from '@/lib/creator-record/governed/sources'
import { selectAuthorityBundle } from '@/lib/creator-record/governed/publication-authority'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN_N, SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256, SYNTHETIC_SOURCE_TEXT_SHA256 } from '@/lib/creator-record/governed/synthetic-test-authority'
import { MAX_TEXT_LENGTH, type CreatorRecordFormState } from '@/lib/creator-record/prototype/form'
import type { CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { CUSTOMER_SECTION_TITLES, QUESTIONNAIRE_SECTION_ORDER, TOOL_QUESTION_ROLES } from '@/lib/creator-record/prototype/questionnaire-structure'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { questionnaireApprovalFor } from '@/test-support/questionnaire-approval'

/* eslint-disable @typescript-eslint/no-explicit-any */
const SYN = SYN_N!
const ACKS = SYN.acknowledgements
const AS_OF = '2026-11-05'
const WORDING = 'a'.repeat(64)
const V5 = { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION }
const V6 = { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const synSources = (): any => clone(syntheticUatInputs().sources)
const sourceText = () => syntheticUatInputs().source_text
const q = (s: any, id: string) => s.registry_input.questions.find((x: any) => x.q_id === id)
const o = (s: any, id: string) => s.registry_input.observation_map.find((x: any) => x.o_id === id)
const digest = (s: CreatorRecordSources): string => {
  const r = questionnaireContract(s, WORDING)
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r.sha256
}
const fullDigest = (s: CreatorRecordSources): string => {
  const reg = loadQuestionRegistry(s.registry_input)
  if (!reg.ok) throw new Error(reg.errors.join('; '))
  const r = questionnaireContract(s, sourceTextDigest(sourceTextContent(s, reg.registry, ACKS)))
  if (!r.ok) throw new Error(JSON.stringify(r))
  return r.sha256
}
const gate = (s: CreatorRecordSources, schema = V5, text: ApprovedInputs['source_text'] = sourceText()) => {
  const c = checkApprovedSources(s, text, CLAIMS, AS_OF, schema)
  return c.ok ? [] : c.refusals.map((r) => r.code)
}
const baseState = (a: Record<string, string[]> = {}): CreatorRecordFormState => ({
  answers: { P1: ['Probe'], P3: ['own_channels'], F1: ['TW'], F2: ['US'], L1: ['no'], M0: ['none'], H1: ['edited'], ...a },
  tools: [{ T1: ['kling'], T3: ['Pro'] }],
  acknowledgements: { A1: true, A2: true },
})
const prepare = (s: CreatorRecordSources, state: unknown = baseState()) =>
  buildCustomerRecord({ state, sources: s, source_text: sourceText(), topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: 'PREP-00000000-0000-4000-8000-000000000001', record_version: 1, captured_at: '2026-11-05T00:00:00.000Z' } })
const prepareCodes = (s: CreatorRecordSources) => {
  const r = prepare(s)
  return r.ok ? [] : r.stage === 'sources' ? r.refusals.map((x) => x.code) : [`form:${r.stage}`]
}
const reapprove = (s: any) => ({ ...s, questionnaire_approval: questionnaireApprovalFor(s, ACKS) })

describe('canonical contract', () => {
  test('the digest is deterministic: same input, repeated, cloned or with object keys in another order', () => {
    const s = synSources()
    const reordered = { ...s, presentation: Object.fromEntries(Object.entries(s.presentation).reverse()), versions: { ledger: s.versions.ledger, registry: s.versions.registry } }
    expect(digest(s)).toBe(digest(synSources()))
    expect(digest(s)).toBe(digest(clone(s)))
    expect(digest(reordered)).toBe(digest(s))
  })

  test('the shipped synthetic approval pins exactly the shipped contract', () => {
    expect(fullDigest(syntheticUatInputs().sources)).toBe(SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256)
    expect(SYN.questionnaire_approval?.contract_sha256).toBe(SYNTHETIC_QUESTIONNAIRE_CONTRACT_SHA256)
  })

  test('the contract carries the wording digest, the rules version and the structure held in code', () => {
    const r = questionnaireContract(synSources(), SYNTHETIC_SOURCE_TEXT_SHA256)
    if (!r.ok) throw new Error('contract')
    expect(r.contract).toMatchObject({
      contract: { id: QUESTIONNAIRE_CONTRACT_ID, format_version: 1 },
      validation_rules: QUESTIONNAIRE_VALIDATION_RULES,
      wording_sha256: SYNTHETIC_SOURCE_TEXT_SHA256,
      sections: { order: [...QUESTIONNAIRE_SECTION_ORDER], titles: CUSTOMER_SECTION_TITLES },
      tool_question_roles: TOOL_QUESTION_ROLES,
      uncertainty: { not_sure: 'not_sure', not_applicable: 'not_applicable', free_text_not_sure_verbatim: 'Not sure' },
    })
    expect((r.contract.answer_constraints as any).max_text_length).toBe(MAX_TEXT_LENGTH)
  })

  // One row for EVERY classified field. The completeness test below fails if a classified field has no row.
  const contractFields: Record<string, (s: any) => void> = {
    'sources.registry_input': (s) => { s.registry_input.questions.pop() },
    'sources.presentation': (s) => { delete s.presentation.M1X },
    'sources.acknowledgement_ids': (s) => { s.acknowledgement_ids = [...s.acknowledgement_ids, 'A9'] },
    'sources.versions': (s) => { s.versions.registry = 'OTHER' },
    'sources.max_tools': (s) => { s.max_tools = 9 },
    'versions.registry': (s) => { s.versions.registry = 'OTHER' },
    'registry_input.questions': (s) => { s.registry_input.questions.reverse() },
    'registry_input.observation_map': (s) => { s.registry_input.observation_map.reverse() },
    'registry_input.semantic_mappings': (s) => { s.registry_input.semantic_mappings.pop() },
    'registry_input.prohibited_dependency_targets': (s) => { s.registry_input.prohibited_dependency_targets = [] },
    'question.q_id': (s) => { q(s, 'L1').q_id = 'L9' },
    'question.version': (s) => { q(s, 'L1').version = 2 },
    'question.question_kind': (s) => { q(s, 'L1').question_kind = 'description' },
    'question.wording_ref': (s) => { q(s, 'L1').wording_ref = 'OTHER' },
    'question.options': (s) => { q(s, 'L1').options = ['yes', 'not_sure'] },
    'question.display_condition': (s) => { q(s, 'T1X').display_condition = { kind: 'always' } },
    'question.approval': (s) => { q(s, 'L1').approval.status = 'retired' },
    'observation_map_entry.o_id': (s) => { o(s, 'SYN-M4C-O-H1').o_id = 'OTHER' },
    'observation_map_entry.version': (s) => { o(s, 'SYN-M4C-O-H1').version = 2 },
    'observation_map_entry.q_id': (s) => { o(s, 'SYN-M4C-O-H1').q_id = 'L1' },
    'observation_map_entry.q_version': (s) => { o(s, 'SYN-M4C-O-H1').q_version = 2 },
    'observation_map_entry.applies_to': (s) => { o(s, 'SYN-M4C-O-H1').applies_to = { kind: 'option', value: 'edited' } },
    'observation_map_entry.observation_kind': (s) => { o(s, 'SYN-M4C-O-H1').observation_kind = 'declared_value' },
    'observation_map_entry.target': (s) => { o(s, 'SYN-M4C-O-H1').target = { kind: 'dependency', dependency_id: 'which_music_provider' } },
    'observation_map_entry.value_mapping_version': (s) => { o(s, 'SYN-M4C-O-H1').value_mapping_version = 'OTHER' },
    'observation_map_entry.approval': (s) => { o(s, 'SYN-M4C-O-H1').approval.review_ref = 'OTHER' },
    'semantic_mapping.q_id': (s) => { s.registry_input.semantic_mappings[0].q_id = 'L1' },
    'semantic_mapping.q_version': (s) => { s.registry_input.semantic_mappings[0].q_version = 2 },
    'semantic_mapping.dependency_id': (s) => { s.registry_input.semantic_mappings[0].dependency_id = 'OTHER' },
    'semantic_mapping.review_ref': (s) => { s.registry_input.semantic_mappings[0].review_ref = 'OTHER' },
    'entry_approval.status': (s) => { q(s, 'P1').approval.status = 'pending' },
    'entry_approval.approver': (s) => { q(s, 'P1').approval.approver = 'OTHER' },
    'entry_approval.decision_date': (s) => { q(s, 'P1').approval.decision_date = '2030-01-01' },
    'entry_approval.review_ref': (s) => { q(s, 'P1').approval.review_ref = 'OTHER' },
    'presentation.q_id': (s) => { s.presentation.P1.q_id = 'OTHER' },
    'presentation.section': (s) => { s.presentation.P1.section = 'contribution' },
    'presentation.input': (s) => { s.presentation.L1.input = 'multi' },
    'presentation.required': (s) => { s.presentation.P1.required = false },
    'presentation.per_tool': (s) => { s.presentation.T3.per_tool = false },
    'presentation.allow_not_sure': (s) => { s.presentation.P1.allow_not_sure = true },
    'presentation.exclusive_options': (s) => { delete s.presentation.M0.exclusive_options },
  }
  const wordingFields: Record<string, (s: any) => void> = {
    'sources.dependency_labels': (s) => { s.dependency_labels.which_music_provider = 'OTHER' },
    'sources.caveats': (s) => { s.caveats[Object.keys(s.caveats)[0]] = 'OTHER' },
    'presentation.text': (s) => { s.presentation.P1.text = 'OTHER' },
    'presentation.help': (s) => { s.presentation.P1.help = 'OTHER' },
    'presentation.option_labels': (s) => { s.presentation.L1.option_labels.yes = 'OTHER' },
  }
  const outsideFields: Record<string, (s: any) => void> = {
    'sources.kind': (s) => { s.kind = 'pilot' },
    'sources.questionnaire_approval': (s) => { s.questionnaire_approval = null },
    'sources.ledger': (s) => { s.ledger = [] },
    'versions.ledger': (s) => { s.versions.ledger = 'OTHER' },
  }

  test('every classified field has a row below (a new classification needs a test)', () => {
    const classified = Object.entries(QUESTIONNAIRE_FIELD_CLASSES).flatMap(([group, fields]) => Object.keys(fields).map((f) => `${group}.${f}`)).sort()
    expect([...Object.keys(contractFields), ...Object.keys(wordingFields), ...Object.keys(outsideFields)].sort()).toEqual(classified)
    for (const [group, fields] of Object.entries(QUESTIONNAIRE_FIELD_CLASSES)) {
      for (const [f, cls] of Object.entries(fields)) {
        const key = `${group}.${f}`
        expect(key in contractFields ? 'contract' : key in wordingFields ? 'wording' : (cls === 'gate' || cls === 'separately_governed') ? cls : 'unexpected').toBe(cls)
      }
    }
  })

  test.each(Object.keys(contractFields))('changing %s changes the digest', (key) => {
    const s = synSources()
    contractFields[key](s)
    expect(unclassifiedQuestionnaireFields(s)).toEqual([])
    expect(digest(s)).not.toBe(digest(synSources()))
  })

  test.each(Object.keys(wordingFields))('changing %s changes the digest through the wording digest', (key) => {
    const s = synSources()
    wordingFields[key](s)
    expect(digest(s)).toBe(digest(synSources())) // not in the contract directly
    expect(fullDigest(s)).not.toBe(fullDigest(synSources()))
  })

  test.each(Object.keys(outsideFields))('%s stays outside the digest: it has its own approval, or it is the gate itself', (key) => {
    const s = synSources()
    outsideFields[key](s)
    expect(digest(s)).toBe(digest(synSources()))
  })

  test('question order and observation order change the digest; so does section order and every structure constant', () => {
    const base = fullDigest(synSources())
    const inIsolation = (mod: string, over: Record<string, unknown>): string => {
      let out = ''
      jest.isolateModules(() => {
        jest.doMock(mod, () => ({ ...jest.requireActual(mod), ...over }))
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const c = require('@/lib/creator-record/customer-record/questionnaire-contract')
        const r = c.questionnaireContract(synSources(), SYNTHETIC_SOURCE_TEXT_SHA256)
        out = r.sha256
        jest.dontMock(mod)
      })
      return out
    }
    const structure = '@/lib/creator-record/prototype/questionnaire-structure'
    const parsing = '@/lib/creator-record/prototype/parse-form-state'
    const form = '@/lib/creator-record/prototype/form'
    expect(inIsolation(structure, {})).toBe(base)
    for (const [mod, over] of [
      [structure, { QUESTIONNAIRE_SECTION_ORDER: [...QUESTIONNAIRE_SECTION_ORDER].reverse() }],
      [structure, { CUSTOMER_SECTION_TITLES: { ...CUSTOMER_SECTION_TITLES, project: 'OTHER' } }],
      [structure, { TOOL_QUESTION_ROLES: { ...TOOL_QUESTION_ROLES, plan: 'T9' } }],
      [form, { MAX_TEXT_LENGTH: 501 }],
      [form, { FREE_TEXT_NOT_SURE_VERBATIM: 'OTHER' }],
      [parsing, { MAX_VALUES_PER_ANSWER: 13 }],
      [parsing, { MAX_TOOL_BLOCKS: 11 }],
      [parsing, { MAX_BODY_BYTES: 32001 }],
      [parsing, { QUESTION_ID_PATTERN: /^x$/ }],
      [parsing, { ACKNOWLEDGEMENT_ID_PATTERN: /^x$/ }],
    ] as [string, Record<string, unknown>][]) expect(inIsolation(mod, over)).not.toBe(base)
  })
})

describe('an unclassified field is refused, never omitted', () => {
  const unknownAt: [string, (s: any) => void, string][] = [
    ['the sources', (s) => { s.brand_new = 1 }, 'sources.brand_new'],
    ['versions', (s) => { s.versions.brand_new = 1 }, 'versions.brand_new'],
    ['the registry', (s) => { s.registry_input.brand_new = 1 }, 'registry_input.brand_new'],
    ['a question', (s) => { q(s, 'L1').brand_new = 1 }, 'questions[7].brand_new'],
    ['a question approval', (s) => { q(s, 'L1').approval.brand_new = 1 }, 'questions[7].approval.brand_new'],
    ['a display condition', (s) => { q(s, 'T1X').display_condition.brand_new = 1 }, 'questions[5].display_condition.brand_new'],
    ['a nested display condition', (s) => { q(s, 'M1X').display_condition.conditions[1].brand_new = 1 }, 'questions[10].display_condition.conditions[1].brand_new'],
    ['an observation map entry', (s) => { o(s, 'SYN-M4C-O-H1').brand_new = 1 }, '].brand_new'],
    ['a map target', (s) => { o(s, 'SYN-M4C-O-H1').target.brand_new = 1 }, '.target.brand_new'],
    ['a map applies_to', (s) => { o(s, 'SYN-M4C-O-H1').applies_to.brand_new = 1 }, '.applies_to.brand_new'],
    ['a semantic mapping', (s) => { s.registry_input.semantic_mappings[0].brand_new = 1 }, 'semantic_mappings[0].brand_new'],
    ['a presentation entry', (s) => { s.presentation.L1.brand_new = 1 }, 'presentation.L1.brand_new'],
  ]
  test.each(unknownAt)('a new field on %s', (_where, mutate, ref) => {
    const s = synSources()
    mutate(s)
    const built = questionnaireContract(s, WORDING)
    expect(built.ok).toBe(false)
    if (!built.ok && built.reason === 'unclassified') expect(built.fields.some((f) => f.includes(ref))).toBe(true)
    const c = checkApprovedSources(s, sourceText(), CLAIMS, AS_OF, V5)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.refusals.some((r) => r.code === 'questionnaire_contract_unclassified_field' && String(r.ref).includes(ref))).toBe(true)
    expect(prepare(s).ok).toBe(false)
  })

  test('re-approving cannot get a field past classification', () => {
    const s = synSources()
    s.presentation.L1.brand_new = 1
    expect(() => questionnaireApprovalFor(s, ACKS)).toThrow(/fixture contract refused/)
    s.questionnaire_approval = { ...s.questionnaire_approval, contract_sha256: 'b'.repeat(64) }
    expect(gate(s)).toContain('questionnaire_contract_unclassified_field')
  })

  test.each([
    ['a new condition kind', (s: any) => { q(s, 'T1X').display_condition = { kind: 'answer_excludes', q_id: 'T1', any_of: [] } }],
    ['a new target kind', (s: any) => { o(s, 'SYN-M4C-O-H1').target = { kind: 'brand_new' } }],
    ['a new applies_to kind', (s: any) => { o(s, 'SYN-M4C-O-H1').applies_to = { kind: 'brand_new' } }],
    ['an unknown section', (s: any) => { s.presentation.L1.section = 'brand_new' }],
    ['an unknown input type', (s: any) => { s.presentation.L1.input = 'slider' }],
  ])('%s is refused', (_where, mutate) => {
    const s = synSources()
    mutate(s)
    expect(unclassifiedQuestionnaireFields(s).length).toBeGreaterThan(0)
    expect(questionnaireContract(s, WORDING).ok).toBe(false)
  })

  test('a value the canonical form cannot represent is refused, not dropped', () => {
    const s = synSources()
    s.presentation.L1.required = undefined
    expect(questionnaireContract(s, WORDING)).toMatchObject({ ok: false, reason: 'not_canonical' })
    expect(gate(s)).toContain('questionnaire_contract_malformed')
  })
})

describe('approval: refused at the form gate and at preparation', () => {
  const approved = () => syntheticUatInputs().sources
  const withApproval = (a: unknown): CreatorRecordSources => ({ ...approved(), questionnaire_approval: a as QuestionnaireContractApproval })
  const good = () => SYN.questionnaire_approval as QuestionnaireContractApproval
  const cases: [string, unknown, string][] = [
    ['missing (null)', null, 'questionnaire_contract_missing'],
    ['missing (undefined)', undefined, 'questionnaire_contract_missing'],
    ['not an object', 'approved', 'questionnaire_contract_malformed'],
    ['a list', [], 'questionnaire_contract_malformed'],
    ['an extra key', { ...good(), extra: 1 }, 'questionnaire_contract_malformed'],
    ['a missing key', (({ review_ref: _r, ...rest }) => rest)(good()), 'questionnaire_contract_malformed'],
    ['another contract id', { ...good(), contract_id: 'other' }, 'questionnaire_contract_malformed'],
    ['version zero', { ...good(), contract_version: 0 }, 'questionnaire_contract_malformed'],
    ['a fractional version', { ...good(), contract_version: 1.5 }, 'questionnaire_contract_malformed'],
    ['a malformed digest', { ...good(), contract_sha256: 'abc' }, 'questionnaire_contract_malformed'],
    ['an uppercase digest', { ...good(), contract_sha256: good().contract_sha256.toUpperCase() }, 'questionnaire_contract_malformed'],
    ['an unknown lifecycle', { ...good(), lifecycle: 'live' }, 'questionnaire_contract_malformed'],
    ['a blank authority', { ...good(), authority: ' ' }, 'questionnaire_contract_malformed'],
    ['a bad decision date', { ...good(), decision_date: 'soon' }, 'questionnaire_contract_malformed'],
    ['no review reference', { ...good(), review_ref: null }, 'questionnaire_contract_malformed'],
    ['pending', { ...good(), lifecycle: 'pending' }, 'questionnaire_contract_not_approved'],
    ['withdrawn', { ...good(), lifecycle: 'withdrawn' }, 'questionnaire_contract_withdrawn'],
    ['superseded', { ...good(), lifecycle: 'superseded' }, 'questionnaire_contract_superseded'],
    ['a digest of something else', { ...good(), contract_sha256: 'b'.repeat(64) }, 'questionnaire_contract_digest_mismatch'],
    ['a pilot-marked authority', { ...good(), authority: 'Pilot reviewer' }, 'pilot_marker'],
    ['a pilot-marked reference', { ...good(), review_ref: 'unapproved draft' }, 'pilot_marker'],
  ]
  test.each(cases)('%s', (_name, a, code) => {
    const s = withApproval(a)
    expect(gate(s, V5)).toContain(code)
    expect(gate(s, V6, syntheticUatInputs().source_text_examination)).toContain(code)
    expect(prepareCodes(s)).toContain(code)
  })

  test('the shipped approval passes for both record schemas', () => {
    expect(gate(approved(), V5)).toEqual([])
    expect(gate(approved(), V6, syntheticUatInputs().source_text_examination)).toEqual([])
    expect(prepare(approved()).ok).toBe(true)
  })
})

describe('changed behaviour is refused until re-approved, and validation follows what was approved', () => {
  const changes: [string, (s: any) => void, CreatorRecordFormState][] = [
    ['requiredness', (s) => { s.presentation.P1.required = false }, (() => { const x = baseState(); delete x.answers.P1; return x })()],
    ['exclusivity', (s) => { delete s.presentation.M0.exclusive_options }, baseState({ M0: ['none', 'music'], M1: ['artlist'] })],
    ['visibility', (s) => { q(s, 'T1X').display_condition = { kind: 'answer_includes', q_id: 'T1', any_of: ['not_sure'] } }, baseState()],
    ['a mapping', (s) => { o(s, 'SYN-M4C-O-M1-DEP').target = { kind: 'dependency', dependency_id: 'human_contribution_description' }; s.registry_input.semantic_mappings = s.registry_input.semantic_mappings.map((m: any) => (m.q_id === 'M1' ? { ...m, dependency_id: 'human_contribution_description' } : m)) }, baseState()],
    ['question order', (s) => { s.registry_input.questions.reverse() }, baseState()],
    ['a section', (s) => { s.presentation.P1.section = 'contribution' }, baseState()],
  ]
  test.each(changes)('%s', (_name, mutate, state) => {
    const s = synSources()
    mutate(s)
    expect(gate(s)).toEqual(['questionnaire_contract_digest_mismatch'])
    expect(prepare(s, state)).toMatchObject({ ok: false, stage: 'sources' })
    const again = reapprove(s)
    expect(gate(again)).toEqual([])
    expect(prepare(again, state).ok).toBe(true)
  })

  test('the server validates against the approved definition: the same answers refused before the change, accepted only under its approval', () => {
    const blank = baseState()
    delete blank.answers.P1
    expect(prepare(syntheticUatInputs().sources, blank)).toMatchObject({ ok: false, stage: 'form' })
    const s = synSources()
    s.presentation.P1.required = false
    expect(prepare(s, blank)).toMatchObject({ ok: false, stage: 'sources' })
    expect(prepare(reapprove(s), blank).ok).toBe(true)
  })

  test('an approved question removed or retired is refused', () => {
    const removed = synSources()
    removed.registry_input.questions = removed.registry_input.questions.filter((x: any) => x.q_id !== 'L1')
    delete removed.presentation.L1
    expect(gate(removed)).toEqual(expect.arrayContaining(['questionnaire_contract_digest_mismatch', 'source_text_digest_mismatch']))
    const retired = synSources()
    q(retired, 'L1').approval.status = 'retired'
    expect(gate(retired)).toContain('questionnaire_contract_digest_mismatch')
  })

  test('re-pinning the wording digest alone no longer gets a changed question through', () => {
    const s = synSources()
    q(s, 'L1').question_kind = 'description'
    s.presentation.P1.text = '[TEST ONLY] changed'
    const reg = loadQuestionRegistry(s.registry_input)
    if (!reg.ok) throw new Error('registry')
    const text = { acknowledgements: ACKS, approval: { ...SYN.source_text_approval!, content_sha256: sourceTextDigest(sourceTextContent(s, reg.registry, ACKS)) } }
    expect(gate(s, V5, text)).toEqual(['questionnaire_contract_digest_mismatch'])
  })

  test('digest equality does not authenticate anyone: the authority is recorded text, and any non-empty value passes', () => {
    const s = { ...syntheticUatInputs().sources, questionnaire_approval: { ...(SYN.questionnaire_approval as QuestionnaireContractApproval), authority: 'Anyone at all' } }
    expect(gate(s)).toEqual([])
  })
})

describe('orphan option labels', () => {
  test('a label for an option the question no longer has is refused', () => {
    const s = synSources()
    q(s, 'H1').options = q(s, 'H1').options.filter((x: string) => x !== 'selected_outputs')
    const c = checkApprovedSources(reapprove(s), sourceText(), CLAIMS, AS_OF, V5)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.refusals).toEqual([{ code: 'option_label_orphan', ref: 'H1.selected_outputs' }])
  })

  test('a label on a free-text question is an orphan, except "Not sure" where the question offers it', () => {
    const s = synSources()
    s.presentation.P1.option_labels = { anything: 'Label' }
    expect(gate(s)).toContain('option_label_orphan')
    const allowed = synSources()
    allowed.presentation.T3.option_labels = { not_sure: 'Not sure' }
    expect(gate(allowed)).not.toContain('option_label_orphan')
    const notOffered = synSources()
    notOffered.presentation.P1.option_labels = { not_sure: 'Not sure' }
    expect(gate(notOffered)).toContain('option_label_orphan')
  })

  test('the shipped synthetic bundle has none', () => {
    expect(gate(syntheticUatInputs().sources)).not.toContain('option_label_orphan')
  })
})

describe('the customer flow', () => {
  const OWNER = '11111111-1111-4111-8111-111111111111'
  function deps(inputs: () => ApprovedInputs, rows: PreparedRow[] = []): FlowDeps {
    let n = 0
    return {
      submissions: 'stopped', hasPilotAccess: async () => true,
      store: {
        async insert(r: NewPreparedRow) { const row: PreparedRow = { ...r, status: 'prepared', created_at: '2026-11-05T12:00:00.000Z', reviewed_at: null, submission_id: null }; rows.push(row); return row },
        async get(id) { return rows.find((r) => r.id === id) ?? null },
        async latestVersion(d) { return rows.filter((r) => r.draft_id === d).sort((a, b) => b.version - a.version)[0] ?? null },
        async markReviewed() { return null },
      },
      inputs: () => approvedCustomerRecordInputs(GOV), topicClaims: CLAIMS, now: () => new Date('2026-11-05T12:00:00.000Z'),
      newId: () => `${String(++n).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
      syntheticUat: { admits: (u) => u === OWNER, inputs },
    }
  }

  test('an unapproved questionnaire prepares nothing: the flow answers unavailable and writes no row', async () => {
    const rows: PreparedRow[] = []
    const s = synSources()
    s.presentation.P1.required = false
    const r = await preparePrepared(deps(() => ({ ...syntheticUatInputs(), sources: s }), rows), OWNER, { state: baseState() })
    expect(r).toMatchObject({ ok: false, status: 503, code: 'unavailable' })
    expect(rows).toHaveLength(0)
  })

  test('the admin UAT path prepares under the synthetic approval', async () => {
    const rows: PreparedRow[] = []
    expect(await preparePrepared(deps(syntheticUatInputs, rows), OWNER, { state: baseState() })).toMatchObject({ ok: true })
    expect(rows).toHaveLength(1)
  })

  test('the submission API is unchanged: a contract field in the body is still refused', async () => {
    const r = await preparePrepared(deps(syntheticUatInputs), OWNER, { state: baseState(), questionnaire_sha256: 'a'.repeat(64) })
    expect(r).toMatchObject({ ok: false, status: 400, code: 'invalid_request' })
  })

  test('both pages gate on checkApprovedSources, which is the check tested here', () => {
    for (const page of ['app/creator-record/page.tsx', 'app/admin/creator-record-v2/uat/page.tsx']) {
      expect(readFileSync(join(__dirname, '..', '..', page), 'utf8')).toMatch(/checkApprovedSources\(inputs\.sources,/)
    }
  })
})

describe('records prepared before this contract', () => {
  // Saved by running the real service at fa1b8675, before this slice. Synthetic, with fake identifiers.
  const saved = JSON.parse(readFileSync(join(__dirname, '..', '..', 'test-support', 'fixtures', 'pre-questionnaire-contract-rows.json'), 'utf8')) as PreparedRow[]
  const OWNER = '11111111-1111-4111-8111-111111111111'

  test('the fixture holds one schema 5 and one schema 6 version', () => {
    expect(saved.map((r) => r.record_schema_version).sort()).toEqual([5, 6])
  })

  test.each(saved.map((r) => [r.record_schema_version, r] as const))('schema %i still verifies and reads, under no contract and with no stamp', async (_v, row) => {
    expect(createHash('sha256').update(row.canonical, 'utf8').digest('hex')).toBe(row.sha256)
    expect(verifyCustomerRecord(row.canonical, row.sha256).ok).toBe(true)
    expect(verifiedRecord(row)).not.toBeNull()
    expect(row.canonical).not.toContain('questionnaire')
    const d: FlowDeps = {
      submissions: 'stopped', hasPilotAccess: async () => true,
      store: { insert: async () => { throw new Error('no write') }, get: async (id) => (id === row.id ? row : null), latestVersion: async () => row, markReviewed: async () => null },
      inputs: () => approvedCustomerRecordInputs(GOV), topicClaims: CLAIMS, now: () => new Date('2026-11-05T12:00:00.000Z'), newId: () => { throw new Error('no id') },
      syntheticUat: { admits: () => true, inputs: syntheticUatInputs },
    }
    expect(await getPrepared(d, OWNER, row.id)).toMatchObject({ ok: true, view: { id: row.id, status: row.status } })
  })

  test('a record prepared now is byte-identical to one prepared before: no stamp, same digest', () => {
    const row = saved.find((r) => r.record_schema_version === 5)!
    const record = JSON.parse(row.canonical)
    const rebuilt = buildCustomerRecord({
      state: row.form_state, sources: syntheticUatInputs().sources, source_text: sourceText(), topicClaims: CLAIMS, as_of: record.record.prepared_on,
      record: { record_id: row.record_ref, record_version: row.version, captured_at: record.record.captured_at },
      documents: record.documents.items.map(({ examination: _e, ...d }: any) => d),
    })
    expect(rebuilt).toMatchObject({ ok: true, canonical: row.canonical, sha256: row.sha256 })
  })
})

describe('locks and boundaries', () => {
  test('the customer governance bundle stays empty, unapproved and closed', () => {
    expect(GOV.questionnaire_approval).toBeNull()
    expect(GOV.registry_input.questions).toHaveLength(0)
    const i = approvedCustomerRecordInputs(GOV)
    expect(gate(i.sources, V5, i.source_text)).toEqual(expect.arrayContaining(['questionnaire_contract_missing', 'no_approved_questions', 'source_text_missing']))
    expect(i.sources.questionnaire_approval).toBeNull()
  })

  test('the synthetic approval is never governance: refused by class and by text', () => {
    const asGovernance = { ...GOV, questionnaire_approval: SYN.questionnaire_approval }
    expect(selectAuthorityBundle({ ok: true, mode: 'governance' }, { governance: asGovernance, synthetic_test: SYN })).toBeNull()
    expect(selectAuthorityBundle({ ok: true, mode: 'governance' }, { governance: SYN, synthetic_test: null })).toBeNull()
    expect(SYN.questionnaire_approval?.authority).toMatch(/SYNTHETIC/)
    expect(SYN.questionnaire_approval?.review_ref).toMatch(/synthetic/)
  })

  test('production resolves to the governance bundle, which has no questionnaire approval', () => {
    expect(currentPublicationAuthority({ VERCEL_ENV: 'production' })?.questionnaire_approval).toBeNull()
  })

  test('publication, payment and issuance locks are unchanged', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(false)
  })

  test('issuance is unchanged: no new authority kind', () => {
    expect([...AUTHORITY_KINDS]).toEqual(['source_text', 'question', 'observation_map_entry', 'publication_entry', 'governed_claim', 'record_schema', 'builder'])
  })
})
