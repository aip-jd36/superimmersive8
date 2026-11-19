/**
 * CR-DOC-READER-EXT-1 (C) — integrated assessment method v2 (Path 1), inactive.
 *
 * Guidance items come from the REAL record builder (the four candidates under a SYNTHETIC test approval, as in
 * doc-reader-ext-selection.test.ts); documents and their readings are synthetic replay data. Proven:
 *   - a dependency with an approved evidence note and a governed relevance entry relates documents; everything else is v1;
 *   - possible relevance only (`relevant_observation_unverified`, association basis = the creator's declared category); never
 *     satisfied, never sufficient, standing `open` and conclusions copied unchanged;
 *   - fail closed: ambiguous material context, M4 permission ambiguity, tool-linked document, profile/category mismatch, not a
 *     licence, illegible, unshown / ambiguous / multiple values; creator responses take precedence;
 *   - v1 (the only method any approved template prints) is unchanged.
 */
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import type { PublicationLedgerEntry } from '@/lib/creator-record/contract/publication-ledger'
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import type { SourceTextInput } from '@/lib/creator-record/customer-record/sources'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'

import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_PUBLICATION_LEDGER } from '@/lib/creator-record/governed/sources'
import type { CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import { TOPIC_CLAIMS_FIXTURE as CLAIMS } from '@/lib/retrieval-engine/topic-claims-fixture'
import { withQuestionnaireApproval } from '@/test-support/questionnaire-approval'
import { assessIntegrated, type IntegratedAssessmentInput } from '@/lib/creator-record/integrated-assessment/assess'
import { assessIntegratedV2, type DocumentItemV2, type IntegratedAssessmentInputV2 } from '@/lib/creator-record/integrated-assessment/assess-v2'
import { DEPENDENCY_RELEVANCE_STATUS, DRAFT_DEPENDENCY_RELEVANCE } from '@/lib/creator-record/integrated-assessment/dependency-relevance'
import { DEPENDENCY_DOCUMENT_REASONS, DEPENDENCY_DOCUMENT_STATUSES, INTEGRATED_ASSESSMENT_METHOD_V2 } from '@/lib/creator-record/integrated-assessment/vocabulary-v2'
import { INTEGRATED_ASSESSMENT_METHOD } from '@/lib/creator-record/integrated-assessment/vocabulary'

const AS_OF = '2026-11-18'
const ARTLIST = 'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1'
const STOCK = 'CLAIM-STOCK-EDITORIAL-001-v2'
const RUNWAY = 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1'
// CR-DOC-READER-EXT-6E: the four entries are now published in the live ledger; tests use them as is, or replace them.
const PUBLISHED = CREATOR_RECORD_PUBLICATION_LEDGER.filter((e) => e.entry_id.startsWith('CR-DOC-READER-EXT-1-LEDGER-'))
const BASE = approvedCustomerRecordInputs(GOV).sources
const sourcesWith = (entries: readonly PublicationLedgerEntry[]): CreatorRecordSources =>
  withQuestionnaireApproval({ ...BASE, ledger: [...BASE.ledger.filter((e) => !PUBLISHED.includes(e)), ...entries] })
const ACKS = (s: CreatorRecordSources): Record<string, string> => Object.fromEntries(s.acknowledgement_ids.map((id) => [id, `Synthetic acknowledgement ${id} (test fixture only).`]))
function textFor(s: CreatorRecordSources): SourceTextInput {
  const loaded = loadQuestionRegistry(s.registry_input)
  if (!loaded.ok) throw new Error('registry')
  const approval: SourceTextApproval = {
    source_id: SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(s, loaded.registry, ACKS(s))),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: 'SYNTHETIC TEST AUTHORITY (fixture only)', decision_date: AS_OF, review_ref: 'SYNTHETIC-DOC-READER-EXT-1',
  }
  return { approval, acknowledgements: ACKS(s) }
}
const SOURCES = sourcesWith(PUBLISHED)
const BASE_ANS = { P1: ['Assessment test video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], H1: ['edited'] }
const state = (materials: Record<string, string[]>) => ({ answers: { ...BASE_ANS, ...materials }, tools: [{ T1: ['runway-gen3'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } })
function record(materials: Record<string, string[]>, sources: CreatorRecordSources = SOURCES) {
  const r = buildCustomerRecord({ state: state(materials), sources, source_text: textFor(sources), topicClaims: CLAIMS, as_of: AS_OF, record: { record_id: 'PREP-doc-reader-ext-1c', record_version: 1, captured_at: `${AS_OF}T00:00:00.000Z` } })
  if (!r.ok) throw new Error(JSON.stringify(r).slice(0, 400))
  return r.record
}
const MUSIC = { M0: ['music'], M1: ['artlist'], M2: ['yes'] }
const STOCKS = { M0: ['stock'], M3: ['getty'], M3D: ['yes'] }
const BOTH = { M0: ['music', 'stock'], M1: ['artlist'], M2: ['yes'], M3: ['getty'], M3D: ['yes'] }

// Synthetic documents (replay data only).
type Obs = { field: string; status?: string; value: string | null; excerpt?: string | null; basis?: string }
const reading = (profile: 'licence' | 'receipt', run: string, obs: Obs[], outcome = 'examined') => ({
  run_id: run,
  envelope: {
    profile: { id: profile, version: 1 },
    outcome: { status: outcome },
    observations: obs.map((o, i) => ({ observation_id: `${run}:${o.field}:${i}`, field: o.field, status: o.status ?? 'present', value: o.value, excerpt: o.excerpt ?? (o.value ? `printed: ${o.value}` : null), basis: o.basis ?? 'printed_text' })),
  },
})
const cls = (field: string, value: string): Obs => ({ field, value, basis: 'examiner_classification', excerpt: null })
const LICENCE_PRO = reading('licence', 'run-1', [cls('document_kind', 'licence_or_licence_certificate'), cls('readability', 'legible'), { field: 'licence_or_plan_type', value: 'Pro' }])
const doc = (over: Partial<DocumentItemV2> = {}): DocumentItemV2 => ({ document_id: 'doc-1', tool_index: null, category: 'licence', examination: LICENCE_PRO, ...over })

function input(rec: ReturnType<typeof record>, documents: DocumentItemV2[], responses: IntegratedAssessmentInputV2['creator_responses'] = undefined): IntegratedAssessmentInputV2 {
  return { declarations: rec.declarations as unknown as IntegratedAssessmentInputV2['declarations'], documents: { items: documents }, guidance: rec.guidance as unknown as IntegratedAssessmentInputV2['guidance'], ...(responses ? { creator_responses: responses } : {}) }
}
const dep = (a: ReturnType<typeof assessIntegratedV2>, claim: string, id: string) =>
  a.items.find((i) => i.claim_id === claim)!.requirements.find((r) => r.requirement.kind === 'dependency' && r.requirement.dependency_id === id)!
const evidenceOf = (a: ReturnType<typeof assessIntegratedV2>, claim: string, id: string) => (dep(a, claim, id).documents as { status: string; reason: string }[]).map((d) => `${d.status}:${d.reason}`)

describe('method v2: relates documents only where governed', () => {
  const rec = record(MUSIC)
  test('licence read by the licence profile, one material context: possible relevance only, with provenance', () => {
    const a = assessIntegratedV2(input(rec, [doc()]))
    expect(a.method).toEqual(INTEGRATED_ASSESSMENT_METHOD_V2)
    const r = dep(a, ARTLIST, 'artlist_license_type_confirmed')
    expect(r.standing).toBe('open')
    expect(r.evidence).toBe('documents_considered')
    const d = (r.documents as any[])[0]
    expect(d).toMatchObject({ status: 'relevant_observation_unverified', reason: 'field_present', category: 'licence' })
    expect(d.observed).toMatchObject({ value: 'Pro', verification: 'not_verified', association_basis: 'creator_declared_category', run_id: 'run-1' })
  })
  test('conclusions, applicability and every other requirement are v1 output, unchanged', () => {
    const a = assessIntegratedV2(input(rec, [doc()]))
    const v1 = assessIntegrated(input(rec, [doc()]) as unknown as IntegratedAssessmentInput)
    expect(v1.method).toEqual(INTEGRATED_ASSESSMENT_METHOD)
    for (const [i, item] of a.items.entries()) {
      expect(item.conclusion).toBe(v1.items[i].conclusion)
      for (const [j, req] of item.requirements.entries()) {
        const before = v1.items[i].requirements[j]
        expect(req.requirement).toEqual(before.requirement)
        expect(req.standing).toBe(before.standing)
        if (!(req.requirement.kind === 'dependency' && req.requirement.dependency_id === 'artlist_license_type_confirmed')) expect(req).toEqual(before)
      }
    }
    expect(a.items.find((i) => i.claim_id === RUNWAY)).toEqual(v1.items.find((i) => i.claim_id === RUNWAY))
  })
  test('a provider-identity dependency (not in the table) stays undefined', () => {
    expect(dep(assessIntegratedV2(input(rec, [doc()])), ARTLIST, 'which_music_provider').evidence).toBe('evidence_requirement_not_defined')
  })
  test('a dependency without an approved evidence note is not related to documents', () => {
    const noNotes = PUBLISHED.map((e) => ({ ...e, evidence_notes: {} }))
    const r2 = record(MUSIC, sourcesWith(noNotes))
    expect(dep(assessIntegratedV2(input(r2, [doc()])), ARTLIST, 'artlist_license_type_confirmed').evidence).toBe('evidence_requirement_not_defined')
  })
  test('no document in a mapped category: no_linked_document; an unmapped category is never considered', () => {
    expect(dep(assessIntegratedV2(input(rec, [])), ARTLIST, 'artlist_license_type_confirmed').evidence).toBe('no_linked_document')
    expect(dep(assessIntegratedV2(input(rec, [doc({ category: 'project_file' })])), ARTLIST, 'artlist_license_type_confirmed').evidence).toBe('no_linked_document')
  })
})

describe('fail closed', () => {
  test('both music and stock answered: association ambiguous for either claim', () => {
    const rec = record(BOTH)
    expect(evidenceOf(assessIntegratedV2(input(rec, [doc()])), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['cannot_establish:association_ambiguous'])
    const editorial = doc({ examination: reading('licence', 'run-2', [cls('document_kind', 'licence_or_licence_certificate'), { field: 'content_designation', value: 'Editorial' }]) })
    expect(evidenceOf(assessIntegratedV2(input(rec, [editorial])), STOCK, 'editorial_designation_confirmed')).toEqual(['cannot_establish:association_ambiguous'])
  })
  test('a permission document while the brand/client permission question (M4) is answered is ambiguous', () => {
    const rec = record({ M0: ['stock', 'brands'], M3: ['getty'], M3D: ['yes'], M4: ['yes'] })
    const permission = doc({ category: 'permission', examination: reading('licence', 'run-3', [cls('document_kind', 'permission_or_consent_letter'), { field: 'permission_statement', value: 'Permission granted' }]) })
    expect(evidenceOf(assessIntegratedV2(input(rec, [permission])), STOCK, 'separate_authorization_obtained')).toEqual(['cannot_establish:association_ambiguous'])
  })
  test('without M4 the same permission is possible relevance for stock separate authorisation', () => {
    const rec = record(STOCKS)
    const permission = doc({ category: 'permission', examination: reading('licence', 'run-3', [cls('document_kind', 'permission_or_consent_letter'), { field: 'permission_statement', value: 'Permission granted' }]) })
    expect(evidenceOf(assessIntegratedV2(input(rec, [permission])), STOCK, 'separate_authorization_obtained')).toEqual(['relevant_observation_unverified:field_present'])
  })
  test('CR-DOC-READER-EXT-9R5A: a licence whose own grant of use was read as a permission statement stays possible relevance only; the separate-authorisation point stays open and unverified', () => {
    const rec = record(STOCKS)
    const licence = doc({ examination: reading('licence', 'run-9r5a', [cls('document_kind', 'licence_or_licence_certificate'), cls('readability', 'legible'), { field: 'permission_statement', value: 'Licensed for use in one integrated Project.' }]) })
    const a = assessIntegratedV2(input(rec, [licence]))
    const r = dep(a, STOCK, 'separate_authorization_obtained')
    expect(r.standing).toBe('open')
    const d = (r.documents as any[])[0]
    expect(d).toMatchObject({ status: 'relevant_observation_unverified', reason: 'field_present', category: 'licence' })
    expect(d.observed).toMatchObject({ verification: 'not_verified', association_basis: 'creator_declared_category' })
    // The item's conclusion is v1's, unchanged by the reading.
    const v1 = assessIntegrated(input(rec, [licence]) as unknown as IntegratedAssessmentInput)
    expect(a.items.find((i) => i.claim_id === STOCK)!.conclusion).toBe(v1.items.find((i) => i.claim_id === STOCK)!.conclusion)
  })
  test('a document linked to an AI tool is not associated with a material dependency', () => {
    expect(evidenceOf(assessIntegratedV2(input(record(MUSIC), [doc({ tool_index: 0 })])), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['cannot_establish:linked_to_tool'])
  })
  test('category / profile mismatch: a licence read by the receipt profile, or re-filed after reading', () => {
    const rec = record(MUSIC)
    const asReceipt = doc({ examination: reading('receipt', 'run-4', [cls('document_type', 'receipt'), { field: 'product_or_plan_name', value: 'Pro' }]) })
    expect(evidenceOf(assessIntegratedV2(input(rec, [asReceipt])), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['cannot_establish:profile_mismatch'])
    const refiled = doc({ category: 'billing_receipt' })
    expect(evidenceOf(assessIntegratedV2(input(rec, [refiled])), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['cannot_establish:profile_mismatch'])
  })
  test('a receipt filed as a receipt and read by the receipt profile may show the plan', () => {
    const receipt = doc({ category: 'billing_receipt', examination: reading('receipt', 'run-5', [cls('document_type', 'receipt'), { field: 'product_or_plan_name', value: 'Social' }]) })
    expect(evidenceOf(assessIntegratedV2(input(record(MUSIC), [receipt])), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['relevant_observation_unverified:field_present'])
  })
  test('not a licence, illegible, not shown, ambiguous, several values, failed examination, not examined', () => {
    const rec = record(MUSIC)
    const cases: [DocumentItemV2, string][] = [
      [doc({ examination: reading('licence', 'r6', [cls('document_kind', 'not_a_licence_or_permission'), { field: 'licence_or_plan_type', value: 'Pro' }]) }), 'cannot_establish:not_a_licence_or_permission'],
      [doc({ examination: reading('licence', 'r7', [cls('document_kind', 'licence_or_licence_certificate'), cls('readability', 'illegible'), { field: 'licence_or_plan_type', value: 'Pro' }]) }), 'cannot_establish:document_illegible'],
      [doc({ examination: reading('licence', 'r8', [cls('document_kind', 'licence_or_licence_certificate'), { field: 'licence_or_plan_type', status: 'not_shown', value: null }]) }), 'cannot_establish:field_not_shown'],
      [doc({ examination: reading('licence', 'r9', [cls('document_kind', 'licence_or_licence_certificate'), { field: 'licence_or_plan_type', status: 'ambiguous', value: null }]) }), 'leaves_uncertainty:field_ambiguous'],
      [doc({ category: 'billing_receipt', examination: reading('receipt', 'r10', [cls('document_type', 'receipt'), { field: 'product_or_plan_name', value: 'Social' }, { field: 'plan_candidate', value: 'Pro' }]) }), 'leaves_uncertainty:multiple_values_shown'],
      [doc({ examination: reading('licence', 'r11', [], 'could_not_examine') }), 'cannot_establish:examination_failed'],
      [doc({ examination: 'not_examined' }), 'not_examined:not_examined'],
    ]
    for (const [d, expected] of cases) expect(evidenceOf(assessIntegratedV2(input(rec, [d])), ARTLIST, 'artlist_license_type_confirmed')).toEqual([expected])
  })
  test('creator responses take precedence over a relevant reading', () => {
    const rec = record(MUSIC)
    const responses = { items: [{ target: { kind: 'observation' as const, run_id: 'run-1', observation_id: 'run-1:licence_or_plan_type:2' }, code: 'reading_incorrect' as const }] }
    expect(evidenceOf(assessIntegratedV2(input(rec, [doc()], responses)), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['creator_disputed:creator_response'])
    const wrongDoc = { items: [{ target: { kind: 'observation' as const, run_id: 'run-1', observation_id: 'run-1:document_kind:0' }, code: 'wrong_document' as const }] }
    expect(evidenceOf(assessIntegratedV2(input(rec, [doc()], wrongDoc)), ARTLIST, 'artlist_license_type_confirmed')).toEqual(['creator_disputed:creator_response'])
  })
})

describe('never satisfied, never sufficient', () => {
  test('no status, reason or evidence value claims satisfaction, sufficiency or a match', () => {
    const CLAIM_WORDS = ['satisfied', 'sufficient', 'sufficiency', 'match', 'matches', 'matched', 'verified', 'confirmed', 'valid', 'cleared', 'established']
    for (const s of [...DEPENDENCY_DOCUMENT_STATUSES, ...DEPENDENCY_DOCUMENT_REASONS]) for (const token of s.split('_')) expect(CLAIM_WORDS).not.toContain(token)
  })
  test('every dependency stays open in every scenario', () => {
    for (const m of [MUSIC, STOCKS, BOTH]) {
      const a = assessIntegratedV2(input(record(m), [doc(), doc({ document_id: 'doc-2', category: 'permission' })]))
      for (const item of a.items) for (const r of item.requirements) if (r.requirement.kind === 'dependency') expect(r.standing).toBe('open')
    }
  })
  test('the relevance table is a draft over existing governed dependency ids only', () => {
    expect(DEPENDENCY_RELEVANCE_STATUS).toBe('APPROVED — JD-CR-DOC-READER-EXT-6E-20261119') // D4
    const governed = new Set(CLAIMS.flatMap((c) => c.unresolved_project_dependencies))
    for (const id of Object.keys(DRAFT_DEPENDENCY_RELEVANCE)) expect(governed.has(id)).toBe(true)
    expect(DRAFT_DEPENDENCY_RELEVANCE).not.toHaveProperty('which_music_provider')
    expect(DRAFT_DEPENDENCY_RELEVANCE).not.toHaveProperty('which_provider')
  })
})
