/**
 * CR-V2-MVP-M4B — synthetic approval isolation.
 *
 * Proves: synthetic test approvals are refused in Production (any environment that is not verifiably
 * an isolated test) and accepted only under the explicit isolated-test conditions; unknown, malformed or
 * ambiguous environment state fails closed; the decision rests on the bundle's structural class, not on
 * approver names; genuine (governance) approval behaviour and the issuance stops are unchanged.
 *
 * Every "approved" input here is a SYNTHETIC TEST FIXTURE (pilot content relabelled; placeholder
 * templates). The real governed sources are empty.
 */

import { pilotSources, type CreatorRecordSources } from '@/lib/creator-record/prototype/build-draft'
import type { GovernanceApproval } from '@/lib/creator-record/contract/types'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { buildCustomerRecord as buildCurrentRecord, CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, HISTORICAL_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { checkApprovedSources } from '@/lib/creator-record/customer-record/sources'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { evaluateIssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { CUSTOMER_PDF_TEMPLATE_ID, templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerDocument, documentModelCanonical } from '@/lib/creator-record/customer-pdf/document-model'
import {
  approvedCustomerRecordInputs, approvedGovernanceSnapshot, approvedPdfTemplates, currentPublicationAuthority, CREATOR_RECORD_V2_SUBMISSIONS,
} from '@/lib/creator-record/customer-flow/approved-inputs'
import { purchaseOfferable, renderV2ForIssuance, V2IssuanceRefusal, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import {
  PRODUCTION_SUPABASE_PROJECT_REF, resolvePublicationAuthority, selectAuthorityBundle, sourceTextApprovalsDistinct, supabaseProjectRef, type PublicationAuthorityBundle,
} from '@/lib/creator-record/governed/publication-authority'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import * as Governed from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CreatorRecordIssuanceStoppedError, rendererForFamily } from '@/lib/creator-record-artifacts/renderers'
import { questionnaireApprovalFor } from '@/test-support/questionnaire-approval'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { APPLICABILITY_FACTS } from '@/lib/retrieval-engine/types'
import { withCommercialSupportUnderTest } from '@/test-support/commercial-support'
import { customerWordingIdentity } from '@/lib/creator-record-flow/customer-wording'
import { V2_CHECKOUT_COPY } from '@/lib/creator-record-flow/wording'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { authorizePublication } from '@/lib/creator-record/contract/publication-ledger'
import { CURRENT_ISSUANCE_SUPPORT, governanceSnapshotFrom } from '@/lib/creator-record/customer-record/governance-state'
import { AI_EXAMINATION_PERMISSION_APPROVED_WORDING, aiExaminationPermissionVersion, EVIDENCE_CONSENT_APPROVED_WORDING, evidenceConsentVersion } from '@/lib/creator-record-flow/authorization-versions'
import { EVIDENCE_CONSENT_DRAFT_VERSION, EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { approvedPolicyVersions, legalPoliciesApproved } from '@/lib/legal/policies'
import { customerLiveOffered } from '@/lib/creator-record-flow/live-offer'

const buildCustomerRecord = buildCurrentRecord

jest.mock('@/lib/creator-record-flow/production', () => ({ renderCreatorRecordV2Pdf: jest.fn() }))

// ── Environments ──
const ISOLATED_REF = 'abcdefghijklmnopqrst'
const ISOLATED = Object.freeze({
  SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test',
  VERCEL_ENV: 'preview',
  NEXT_PUBLIC_SUPABASE_URL: `https://${ISOLATED_REF}.supabase.co`,
  SI8_CR_SYNTHETIC_SUPABASE_REF: ISOLATED_REF,
  STRIPE_SECRET_KEY: 'sk_test_51Synthetic',
})
const PRODUCTION = Object.freeze({
  VERCEL_ENV: 'production',
  NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
  STRIPE_SECRET_KEY: 'sk_live_51Real',
})

// ── Synthetic approved authority (test fixture only) ──
const SYN: GovernanceApproval = { status: 'approved', approver: 'SYNTHETIC TEST APPROVER (fixture only)', decision_date: '2026-10-30', review_ref: 'SYNTHETIC-REVIEW-1' }

function syntheticBundle(over: Partial<PublicationAuthorityBundle> = {}, approver: string = SYN.approver as string): PublicationAuthorityBundle {
  const p = pilotSources()
  const a: GovernanceApproval = { ...SYN, approver }
  const sources: CreatorRecordSources = {
    ...p,
    kind: 'governed',
    registry_input: {
      ...p.registry_input,
      questions: p.registry_input.questions.map((q) => ({ ...q, approval: q.approval.status === 'approved' ? a : q.approval })),
      observation_map: p.registry_input.observation_map.map((o) => ({ ...o, approval: o.approval.status === 'approved' ? a : o.approval })),
    },
    ledger: p.ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^PILOT-UAT-/, 'SYN-'), approver })),
    versions: { registry: 'SYN-REGISTRY-1', ledger: 'SYN-LEDGER-1' },
  }
  const acks = Object.fromEntries(sources.acknowledgement_ids.map((id) => [id, `Placeholder acknowledgement ${id}.`]))
  const reg = loadQuestionRegistry(sources.registry_input)
  if (!reg.ok) throw new Error('registry')
  // CR-V2-MVP-PROD-PREP-1: approvals cover what the approved inputs publish, which includes the customer wording set from code.
  const published: CreatorRecordSources = { ...sources, customer_wording: customerWordingIdentity() }
  const text: SourceTextApproval = {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(published, reg.registry, acks)),
    categories: [...SOURCE_TEXT_CATEGORIES], record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: approver, decision_date: '2026-10-30', review_ref: 'SYN-TEXT-REVIEW-1',
  }
  const templates = placeholderTemplates(p)
  const templateApproval: PdfTemplateApproval = {
    template_id: CUSTOMER_PDF_TEMPLATE_ID, version: 1, fingerprint: templateFingerprint(templates), record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    lifecycle: 'approved', authority: approver, decision_date: '2026-10-30', review_ref: 'SYN-TEMPLATE-REVIEW-1',
  }
  return {
    authority_class: 'synthetic_test',
    registry_input: sources.registry_input, publication_ledger: sources.ledger, dependency_labels: sources.dependency_labels, presentation: sources.presentation,
    acknowledgements: acks, caveats: sources.caveats, versions: sources.versions, max_tools: sources.max_tools,
    source_text_approval: text, questionnaire_approval: questionnaireApprovalFor(published, acks, { authority: approver, review_ref: 'SYN-CONTRACT-REVIEW-1' }), pdf_templates: templates, pdf_template_approval: templateApproval,
    ...over,
  }
}

function placeholderTemplates(p: CreatorRecordSources) {
  const t = (x: string) => `[Placeholder] ${x}`
  const qs: Record<string, 'project' | 'contribution'> = {}
  for (const [q, m] of Object.entries(p.presentation)) if (!m.per_tool) qs[q] = m.section === 'project' || m.section === 'locations' ? 'project' : 'contribution'
  return {
    template_id: CUSTOMER_PDF_TEMPLATE_ID, version: 1, record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION },
    document_title: t('Creator Record {record_id}'), stamp: 'PLACEHOLDER WORDING FOR TESTING ONLY · CREATOR RECORD · SELF-DECLARED · NOT A CLEARANCE OR LEGAL OPINION', footer: t('Creator Record {record_id}'), page_label: 'Page {page} of {pages}',
    sections: {
      about: { heading: t('1. About'), intro: [t('Intro.')], counts: { answers: { one: t('{n} answer.'), other: t('{n} answers.') }, guidance: { one: t('{n} item.'), other: t('{n} items.') }, open_items: { one: t('{n} open.'), other: t('{n} open.') } } },
      project: { heading: t('2. Project'), intro: t('As told.'), empty: t('Nothing.') },
      tools: { heading: t('3. Tools'), intro: t('Tools.'), tool_heading: t('Tool {n}'), empty: t('None.') },
      contribution: { heading: t('4. Contribution'), intro: t('As told.'), empty: t('Nothing.') },
      guidance: { heading: t('5. Guidance'), intro: t('Educational.'), empty: t('None.'), item_heading: t('Guidance {index}: {subject}'), subject_with_tool: '{topic} (tool {n})', conclusion: t('Reads'), selected_because: t('Because'), on_what_you_told_us: t('On what you told us'), depends_on: t('Depends on'), unspecified_condition: t('Unspecified.'), caveats: t('Note'), item_limitation: t('Describes published terms only.'), topic_level: t('Topic level.') },
      open_items: { heading: t('6. Open items'), intro: t('Not established.'), empty: t('None.'), item_ref: t('Guidance {index}'), for_guidance: t('For'), not_established_heading: t('Not established'), affects: t('Affects {items}'), unspecified_heading: t('Unspecified'), topic_qualified_heading: t('Topic qualified'), what_you_told_us: t('Told'), nothing_told: t('Nothing'), evidence_note: t('Evidence'), status: t('Status'), sufficiency: t('Evidence'), not_sure_heading: t('Not sure'), documents_heading: t('Documents'), documents_not_provided: t('No documents.'), limitations_heading: t('Limitations'), limitations: [t('Limited.')] },
      not_done: { heading: t('7. Not done'), lines: [t('No review.')] },
      provenance: { heading: t('8. Provenance'), acknowledgements_heading: t('Acknowledged'), identity_heading: t('Record'), sources_heading: t('Sources'), publications_heading: t('Guidance sources'), labels: { record_id: t('Record id'), issued_on: t('Issued on'), prepared_ref: t('Ref'), record_version: t('Version'), prepared_on: t('Prepared'), captured_at: t('Captured'), snapshot: t('SHA-256'), record_schema: t('Schema'), record_schema_version: t('Schema version'), builder: t('Builder'), builder_version: t('Builder version'), registry_version: t('Registry'), ledger_version: t('Ledger'), wording: t('Wording'), wording_version: t('Wording version'), wording_digest: t('Wording digest'), templates: t('Templates'), templates_version: t('Templates version'), templates_fingerprint: t('Templates fingerprint'), questionnaire_contract: t('Questionnaire contract'), questionnaire_contract_version: t('Questionnaire contract version'), questionnaire_contract_ref: t('Questionnaire contract reference'), publication_version: t('Entry version') } },
    },
    question_sections: qs,
    conclusion_labels: { relevant_on_declared_facts: t('Relevant'), relevant_applicability_unresolved: t('Relevant, depending') },
    topic_labels: { commercial_use: t('Commercial use'), third_party_source_rights: t('Third-party material') },
    fact_labels: Object.fromEntries(APPLICABILITY_FACTS.map((f) => [f, `[Placeholder] ${f.replace(/_/g, ' ')}`])),
    not_sure_label: t('Not sure'),
    documents: { intro: t('Documents you added, listed as received.'), item_label: t('Document {n}'), type: t('Type'), category: t('Your description'), tool: t('Tool'), tool_value: t('Tool {n}'), size: t('Size'), size_value: t('{bytes} bytes'), fingerprint: t('SHA-256 fingerprint'), fingerprint_note: t('A fingerprint identifies the exact file received. It does not show that the document is genuine, who created it, or when.'), examination: t('Examination'), not_examined: t('Not examined by SI8') },
    document_type_labels: { 'application/pdf': t('PDF'), 'image/png': t('PNG image'), 'image/jpeg': t('JPEG image') },
    document_category_labels: { billing_receipt: t('Receipt or invoice'), licence: t('Licence'), provider_terms: t('Provider terms'), release_or_consent: t('Release or consent'), permission: t('Permission'), project_file: t('Project file'), other: t('Other') },
    dependency_codes: { status: { open: t('Open') }, sufficiency: { not_assessed: t('Not assessed') } },
  }
}

const SYNTHETIC = syntheticBundle()
/** The same approvals with nothing synthetic-looking in any approval text; the class is kept. */
function cleanText(b: PublicationAuthorityBundle): PublicationAuthorityBundle {
  // CR-V2-DECL-1B-1: relabelling is a change to the contract, so it needs its own contract approval.
  const out = relabelled(b)
  return { ...out, questionnaire_approval: questionnaireApprovalFor(approvedCustomerRecordInputs(out).sources, out.acknowledgements, { authority: 'Head of Governance', review_ref: 'GOV-CONTRACT-1' }) }
}
function relabelled(b: PublicationAuthorityBundle): PublicationAuthorityBundle {
  const relabel = (a: GovernanceApproval): GovernanceApproval => ({ ...a, approver: 'Head of Governance', review_ref: 'GOV-1' })
  return {
    ...b,
    versions: { registry: 'REG-2026-11', ledger: 'LED-2026-11' },
    registry_input: {
      ...b.registry_input,
      questions: b.registry_input.questions.map((q) => (q.approval.status === 'approved' ? { ...q, approval: relabel(q.approval) } : q)),
      observation_map: b.registry_input.observation_map.map((o) => (o.approval.status === 'approved' ? { ...o, approval: relabel(o.approval) } : o)),
    },
    publication_ledger: b.publication_ledger.map((e) => ({ ...e, entry_id: e.entry_id.replace(/^SYN-/, 'CR-'), approver: 'Head of Governance' })),
    source_text_approval: { ...(b.source_text_approval as SourceTextApproval), authority: 'Head of Governance', review_ref: 'GOV-TEXT-1' },
    pdf_template_approval: { ...(b.pdf_template_approval as PdfTemplateApproval), authority: 'Head of Governance', review_ref: 'GOV-TEMPLATE-1' },
  }
}
/** What `currentPublicationAuthority` does, with the synthetic slot filled by the fixture. */
const authorityFor = (env: Record<string, string | undefined>, synthetic: PublicationAuthorityBundle | null = SYNTHETIC, governance: PublicationAuthorityBundle = CREATOR_RECORD_GOVERNANCE_AUTHORITY) =>
  selectAuthorityBundle(resolvePublicationAuthority(env), { governance, synthetic_test: synthetic })

// ── A record prepared under the isolated synthetic authority ──
const SUB = '33333333-3333-4333-8333-333333333333'
const PREP = '00000000-0000-4000-8000-00000000abcd'
const ANS = { P1: ['Synthetic M4B video'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }
function prepare(bundle: PublicationAuthorityBundle | null) {
  const inputs = approvedCustomerRecordInputs(bundle)
  return buildCustomerRecord({
    state: { answers: { ...ANS }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } },
    sources: inputs.sources, source_text: inputs.source_text, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-01',
    record: { record_id: `PREP-${PREP}`, record_version: 1, captured_at: '2026-11-01T09:00:00.000Z' },
  })
}
const built = prepare(SYNTHETIC)
if (!built.ok) throw new Error('synthetic fixture did not build')
const ROW: PreparedRow = {
  id: PREP, user_id: 'u', draft_id: 'd', version: 1, record_ref: `PREP-${PREP}`, record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: built.record.schema_version,
  canonical: built.canonical, sha256: built.sha256, form_state: {} as never, status: 'reviewed', created_at: '', reviewed_at: '', submission_id: SUB,
}
const issueDeps = (bundle: PublicationAuthorityBundle | null): V2IssuanceDeps => ({
  boundTo: async () => ROW,
  latestVersion: async () => ROW,
  governance: (d) => withCommercialSupportUnderTest(approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE, bundle)),
  templates: () => approvedPdfTemplates(bundle),
  renderPdf: async (input) => new TextEncoder().encode(documentModelCanonical(buildCustomerDocument(input))),
})
const issue = (bundle: PublicationAuthorityBundle | null) =>
  renderV2ForIssuance(issueDeps(bundle), { id: SUB, user_id: 'u', tier: 'creator_record', creator_record_product: 'v2' }, 'CR-2026-33333333', new Date('2026-11-01T10:00:00Z'))
const refusalOf = async (p: Promise<unknown>) => {
  try {
    await p
    return 'issued'
  } catch (e) {
    return e instanceof V2IssuanceRefusal ? e.code : String(e)
  }
}

describe('resolvePublicationAuthority: governance unless the environment verifiably asks for an isolated test', () => {
  test('no mode, or "governance", is governance (Production needs no new variable)', () => {
    expect(resolvePublicationAuthority({})).toEqual({ ok: true, mode: 'governance' })
    expect(resolvePublicationAuthority(PRODUCTION)).toEqual({ ok: true, mode: 'governance' })
    expect(resolvePublicationAuthority({ ...PRODUCTION, SI8_CR_PUBLICATION_AUTHORITY: 'governance' })).toEqual({ ok: true, mode: 'governance' })
  })

  test('the full isolated-test environment selects synthetic mode (also a local Supabase)', () => {
    expect(resolvePublicationAuthority(ISOLATED)).toEqual({ ok: true, mode: 'synthetic_isolated_test', database_ref: ISOLATED_REF })
    expect(resolvePublicationAuthority({ ...ISOLATED, VERCEL_ENV: undefined })).toMatchObject({ ok: true, mode: 'synthetic_isolated_test' })
    expect(resolvePublicationAuthority({ ...ISOLATED, VERCEL_ENV: 'development' })).toMatchObject({ ok: true, mode: 'synthetic_isolated_test' })
    expect(resolvePublicationAuthority({ ...ISOLATED, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', SI8_CR_SYNTHETIC_SUPABASE_REF: 'local', STRIPE_SECRET_KEY: 'rk_test_abc' }))
      .toEqual({ ok: true, mode: 'synthetic_isolated_test', database_ref: 'local' })
  })

  test.each([
    ['an unknown mode', { SI8_CR_PUBLICATION_AUTHORITY: 'synthetic' }, 'mode_malformed'],
    ['an empty mode', { SI8_CR_PUBLICATION_AUTHORITY: '' }, 'mode_malformed'],
    ['a differently-cased mode', { SI8_CR_PUBLICATION_AUTHORITY: 'Synthetic-Isolated-Test' }, 'mode_malformed'],
    ['a padded mode', { SI8_CR_PUBLICATION_AUTHORITY: ' synthetic-isolated-test' }, 'mode_malformed'],
    ['Vercel Production', { VERCEL_ENV: 'production' }, 'production_environment'],
    ['an unknown Vercel environment', { VERCEL_ENV: 'staging' }, 'environment_ambiguous'],
    ['an empty Vercel environment', { VERCEL_ENV: '' }, 'environment_ambiguous'],
    ['the Production database', { NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`, SI8_CR_SYNTHETIC_SUPABASE_REF: PRODUCTION_SUPABASE_PROJECT_REF }, 'production_database'],
    ['no database URL', { NEXT_PUBLIC_SUPABASE_URL: undefined }, 'database_unidentified'],
    ['a malformed database URL', { NEXT_PUBLIC_SUPABASE_URL: 'not a url' }, 'database_unidentified'],
    ['a non-Supabase host', { NEXT_PUBLIC_SUPABASE_URL: `https://${ISOLATED_REF}.supabase.co.evil.test` }, 'database_unidentified'],
    ['a plain-http Supabase host', { NEXT_PUBLIC_SUPABASE_URL: `http://${ISOLATED_REF}.supabase.co` }, 'database_unidentified'],
    ['no database binding', { SI8_CR_SYNTHETIC_SUPABASE_REF: undefined }, 'database_not_bound'],
    ['a binding to another database', { SI8_CR_SYNTHETIC_SUPABASE_REF: 'zzzzzzzzzzzzzzzzzzzz' }, 'database_not_bound'],
    ['a live Stripe key', { STRIPE_SECRET_KEY: 'sk_live_51Real' }, 'payments_not_test_mode'],
    ['a live restricted key', { STRIPE_SECRET_KEY: 'rk_live_51Real' }, 'payments_not_test_mode'],
    ['no Stripe key', { STRIPE_SECRET_KEY: undefined }, 'payments_not_test_mode'],
    ['a malformed Stripe key', { STRIPE_SECRET_KEY: 'sk_test_' }, 'payments_not_test_mode'],
  ])('synthetic mode with %s fails closed', (_, over, refusal) => {
    expect(resolvePublicationAuthority({ ...ISOLATED, ...over })).toEqual({ ok: false, refusal })
  })

  test('the Production project ref is the one the app is deployed against', () => {
    expect(supabaseProjectRef(`https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`)).toBe(PRODUCTION_SUPABASE_PROJECT_REF)
    const { readFileSync } = jest.requireActual<typeof import('fs')>('fs')
    expect(readFileSync(require('path').join(__dirname, '..', '..', 'DEPLOYMENT.md'), 'utf8')).toContain(`https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`)
  })
})

describe('selectAuthorityBundle: each mode accepts only its own structural class', () => {
  test('governance mode never selects a synthetic-classed bundle, however its approvers are named', () => {
    const realLooking = cleanText(SYNTHETIC) // still classed synthetic_test; no approval text reads as synthetic
    expect(realLooking.authority_class).toBe('synthetic_test')
    expect(authorityFor(PRODUCTION, SYNTHETIC, SYNTHETIC)).toBeNull()
    expect(authorityFor(PRODUCTION, realLooking, realLooking)).toBeNull()
    expect(authorityFor({}, realLooking, realLooking)).toBeNull()
  })

  test('governance mode refuses a governance-classed bundle whose approvals read as synthetic (second check)', () => {
    expect(authorityFor(PRODUCTION, null, { ...SYNTHETIC, authority_class: 'governance' })).toBeNull()
  })

  test('synthetic mode never selects the governance bundle, or a governance-classed bundle in the synthetic slot', () => {
    expect(authorityFor(ISOLATED, null)).toBeNull()
    expect(authorityFor(ISOLATED, { ...SYNTHETIC, authority_class: 'governance' })).toBeNull()
    expect(authorityFor(ISOLATED, { ...SYNTHETIC, authority_class: 'something' as never })).toBeNull()
    expect(authorityFor(ISOLATED)).toBe(SYNTHETIC)
  })

  test('a refused environment selects nothing', () => {
    expect(authorityFor({ ...ISOLATED, VERCEL_ENV: 'production' })).toBeNull()
    expect(authorityFor({ SI8_CR_PUBLICATION_AUTHORITY: 'yes' })).toBeNull()
  })

  test('the shipped bundles: governance is classed governance; the synthetic slot (M4C) is classed synthetic_test', () => {
    expect(CREATOR_RECORD_GOVERNANCE_AUTHORITY.authority_class).toBe('governance')
    expect(CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY?.authority_class).toBe('synthetic_test')
    expect(currentPublicationAuthority(PRODUCTION)).toBe(CREATOR_RECORD_GOVERNANCE_AUTHORITY)
    expect(currentPublicationAuthority(ISOLATED)).toBe(CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY)
    // The shipped synthetic bundle never reaches governance mode, in any slot.
    expect(authorityFor(PRODUCTION, CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY, CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as PublicationAuthorityBundle)).toBeNull()
  })
})

describe('end to end: prepare, checkout governance and issuance', () => {
  test('isolated test conditions: the synthetic authority prepares, is eligible and issues', async () => {
    const bundle = authorityFor(ISOLATED)
    expect(prepare(bundle).ok).toBe(true)
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, withCommercialSupportUnderTest(approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, bundle))).decision).toBe('eligible')
    expect(await refusalOf(issue(bundle))).toBe('issued')
  })

  test.each([
    ['Production', PRODUCTION],
    ['Production asking for synthetic mode', { ...PRODUCTION, SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test', SI8_CR_SYNTHETIC_SUPABASE_REF: PRODUCTION_SUPABASE_PROJECT_REF, STRIPE_SECRET_KEY: 'sk_test_51x' }],
    ['a preview against the Production database', { ...ISOLATED, NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`, SI8_CR_SYNTHETIC_SUPABASE_REF: PRODUCTION_SUPABASE_PROJECT_REF }],
    ['an isolated preview with a live key', { ...ISOLATED, STRIPE_SECRET_KEY: 'sk_live_51Real' }],
    ['a malformed mode', { ...ISOLATED, SI8_CR_PUBLICATION_AUTHORITY: 'on' }],
  ])('%s: a record prepared under synthetic authority is neither preparable, eligible nor issuable', async (_, env) => {
    const bundle = authorityFor(env)
    expect(bundle === null || bundle.authority_class === 'governance').toBe(true)
    // CR-V2-MVP-LEGAL-CONTENT-6: governance content is approved, so Production can build ITS OWN record; never the synthetic one.
    const own = prepare(bundle)
    expect(own.ok ? own.sha256 !== ROW.sha256 : true).toBe(true)
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, bundle)).decision).not.toBe('eligible')
    expect(await refusalOf(issue(bundle))).toMatch(/^governance_(ineligible|indeterminate)$/)
  })

  test('no authority fails closed as indeterminate (unavailable), never as an empty-but-approved state', () => {
    const none_ = approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, null)
    expect(none_.authorities.questionnaire_contract).toEqual({ status: 'unavailable' })
    // A synthetic record is refused definitively; a definitive refusal outranks what could not be read.
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, none_).decision).toBe('ineligible')
    expect(approvedPdfTemplates(null)).toEqual({ templates: null, approval: null })
    const none = approvedCustomerRecordInputs(null)
    expect(none.source_text).toBeNull()
    expect(none.sources).toMatchObject({ registry_input: { questions: [], observation_map: [] }, ledger: [], max_tools: 0, versions: { registry: 'none approved', ledger: 'none approved' } })
  })
})

describe('genuine governance behaviour is unchanged', () => {
  test('the governance bundle yields exactly the inputs M3 built from the governed constants', () => {
    expect(approvedCustomerRecordInputs(CREATOR_RECORD_GOVERNANCE_AUTHORITY)).toEqual({
      sources: {
        kind: 'governed', registry_input: Governed.CREATOR_RECORD_REGISTRY_INPUT, presentation: Governed.CREATOR_RECORD_PRESENTATION,
        acknowledgement_ids: Object.keys(Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS), ledger: Governed.CREATOR_RECORD_PUBLICATION_LEDGER,
        dependency_labels: Governed.CREATOR_RECORD_DEPENDENCY_LABELS, caveats: Governed.CREATOR_RECORD_CAVEATS,
        versions: { ...Governed.CREATOR_RECORD_VERSIONS }, max_tools: Governed.CREATOR_RECORD_MAX_TOOLS,
        questionnaire_approval: Governed.CREATOR_RECORD_QUESTIONNAIRE_APPROVAL,
        // CR-V2-MVP-PROD-PREP-1: the customer wording set this build renders, always from code.
        customer_wording: customerWordingIdentity(),
      },
      // CR-V2-MVP-LEGAL-CONTENT-6: the founder-approved schema 7 and schema 8 approvals of the same wording.
      source_text: { approval: Governed.CREATOR_RECORD_SOURCE_TEXT_APPROVAL, acknowledgements: Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS },
      source_text_examination: { approval: Governed.CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL, acknowledgements: Governed.CREATOR_RECORD_ACKNOWLEDGEMENTS },
    })
    expect(Governed.CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL?.record_schema.version).toBe(8)
    expect(approvedPdfTemplates(CREATOR_RECORD_GOVERNANCE_AUTHORITY)).toEqual({ templates: Governed.CREATOR_RECORD_PDF_TEMPLATES, approval: Governed.CREATOR_RECORD_PDF_TEMPLATE_APPROVAL })
  })

  test('a genuinely-labelled governance bundle is accepted in Production and decided by the unchanged eligibility rules', async () => {
    // Same content as the fixture, classed governance with non-synthetic approval text (stands in for real M0 approvals).
    const fixed: PublicationAuthorityBundle = { ...cleanText(SYNTHETIC), authority_class: 'governance' }
    const selected = authorityFor(PRODUCTION, null, fixed)
    expect(selected).toBe(fixed)
    expect(prepare(selected).ok).toBe(true)
    // A record prepared under the synthetic authority is still not eligible under the genuine one (different approvals).
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, selected)).decision).not.toBe('eligible')
  })
})

describe('the stops stay authoritative in every authority mode', () => {
  test('both stops ship open for the controlled UAT (CR-V2-MVP-PROD-UAT-ACTIVATION-1), and v2 issuance is refused while stopped even with the synthetic authority selected', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('open')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('enabled')
    expect(authorityFor(ISOLATED)).toBe(SYNTHETIC)
    expect(() => rendererForFamily('creator_record_v2', 'stopped')).toThrow(CreatorRecordIssuanceStoppedError)
  })
})

// ── CR-V2-SCHEMA8-PATH-1 ──
describe('E1: one governance bundle approves the same wording for schema 7 and for schema 8', () => {
  const base: PublicationAuthorityBundle = { ...cleanText(SYNTHETIC), authority_class: 'governance' }
  const text7 = base.source_text_approval as SourceTextApproval
  const text8: SourceTextApproval = { ...text7, version: 2, record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }, review_ref: 'GOV-TEXT-8' }
  const both: PublicationAuthorityBundle = { ...base, source_text_examination_approval: text8 }
  const check = (b: PublicationAuthorityBundle, slot: 'source_text' | 'source_text_examination', version: number) => {
    const inputs = approvedCustomerRecordInputs(b)
    return checkApprovedSources(inputs.sources, inputs[slot] ?? null, TOPIC_CLAIMS_FIXTURE, '2026-11-01', { id: CUSTOMER_RECORD_SCHEMA, version })
  }
  const codes = (r: ReturnType<typeof check>) => (r.ok ? [] : Array.from(new Set(r.refusals.map((x) => x.code))).sort())

  test('Production selects the bundle; each approval reaches its own slot and passes for its own schema only', () => {
    expect(authorityFor(PRODUCTION, null, both)).toBe(both)
    const inputs = approvedCustomerRecordInputs(both)
    expect(inputs.source_text?.approval).toBe(text7)
    expect(inputs.source_text_examination?.approval).toBe(text8)
    expect(inputs.source_text_examination?.acknowledgements).toBe(both.acknowledgements)
    expect(check(both, 'source_text', CUSTOMER_RECORD_SCHEMA_VERSION).ok).toBe(true)
    expect(check(both, 'source_text_examination', CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION).ok).toBe(true)
    // Crossed: each approval is refused for the other schema, never reinterpreted.
    expect(codes(check(both, 'source_text', CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION))).toContain('source_text_schema_mismatch')
    expect(codes(check(both, 'source_text_examination', CUSTOMER_RECORD_SCHEMA_VERSION))).toContain('source_text_schema_mismatch')
  })

  test('without a schema 8 approval schema 8 has nothing to pass, and schema 7 is exactly as before', () => {
    expect(approvedCustomerRecordInputs(base).source_text_examination).toBeNull()
    expect(check(base, 'source_text', CUSTOMER_RECORD_SCHEMA_VERSION).ok).toBe(true)
    expect(prepare(base).ok).toBe(true)
    expect(prepare(both).ok).toBe(true)
  })

  test('the issuance snapshot carries both approvals, so a withdrawal of one never touches records of the other schema', () => {
    const snap = (b: PublicationAuthorityBundle) => withCommercialSupportUnderTest(approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, b))
    const entries = (b: PublicationAuthorityBundle) => {
      const st = snap(b).authorities.source_text as { status: string; entries?: { id: string; version: string; lifecycle: string }[] }
      return st.status === 'ok' && st.entries ? st.entries.map((e) => `${e.id}@${e.version}:${e.lifecycle}`) : st.status
    }
    expect(entries(both)).toEqual([`${text7.source_id}@1:approved`, `${text8.source_id}@2:approved`])
    const p = prepare(both)
    if (!p.ok) throw new Error('prepare')
    expect(evaluateIssuanceEligibility(p.canonical, p.sha256, snap(both)).decision).toBe('eligible')
    const schema8Withdrawn: PublicationAuthorityBundle = { ...both, source_text_examination_approval: { ...text8, lifecycle: 'withdrawn' } }
    expect(evaluateIssuanceEligibility(p.canonical, p.sha256, snap(schema8Withdrawn)).decision).toBe('eligible')
    const schema7Withdrawn: PublicationAuthorityBundle = { ...both, source_text_approval: { ...text7, lifecycle: 'withdrawn' } }
    expect(evaluateIssuanceEligibility(p.canonical, p.sha256, snap(schema7Withdrawn)).decision).toBe('ineligible')
  })

  test('two approvals with the same identity are refused as a bundle (they would be ambiguous at issuance): fail closed', () => {
    const same: PublicationAuthorityBundle = { ...both, source_text_examination_approval: { ...text8, version: text7.version } }
    expect(sourceTextApprovalsDistinct(same)).toBe(false)
    expect(sourceTextApprovalsDistinct(both)).toBe(true)
    expect(authorityFor(PRODUCTION, null, same)).toBeNull()
    expect(authorityFor(ISOLATED, { ...same, authority_class: 'synthetic_test' })).toBeNull()
  })

  test('a schema 8 approval that reads as synthetic makes Production refuse the whole bundle', () => {
    const marked: PublicationAuthorityBundle = { ...both, source_text_examination_approval: { ...text8, review_ref: 'SYNTHETIC-TEXT-8' } }
    expect(authorityFor(PRODUCTION, null, marked)).toBeNull()
  })
})

describe('E2: purchaseOfferable — the page may offer payment only when every pure purchase condition holds', () => {
  const deps = (over: Partial<Parameters<typeof purchaseOfferable>[0]> = {}): Parameters<typeof purchaseOfferable>[0] => ({
    issuance: 'enabled', submissions: 'open', legalPoliciesApproved: () => true,
    governance: (d) => withCommercialSupportUnderTest(approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE, SYNTHETIC)),
    templates: () => approvedPdfTemplates(SYNTHETIC),
    now: () => new Date('2026-11-01T10:00:00Z'),
    ...over,
  })

  test('an eligible, reviewed, renderable version is offered', () => {
    expect(purchaseOfferable(deps(), ROW)).toBe(true)
  })

  test.each<[string, Partial<Parameters<typeof purchaseOfferable>[0]>]>([
    ['issuance stopped', { issuance: 'stopped' }],
    ['submissions stopped', { submissions: 'stopped' }],
    ['policies not published', { legalPoliciesApproved: () => false }],
    ['no policy port', { legalPoliciesApproved: undefined }],
    ['the policy port throws', { legalPoliciesApproved: () => { throw new Error('x') } }],
    ['no commercial support listed for the schema', { governance: (d) => { const s = approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE, SYNTHETIC); return { ...s, authorities: { ...s.authorities, record_schema: { status: 'ok', entries: [] }, builder: { status: 'ok', entries: [] } } } } }],
    ['governance unavailable', { governance: (d) => approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE, null) }],
    ['governance throws', { governance: () => { throw new Error('x') } }],
    ['no templates port', { templates: undefined }],
    ['no approved templates', { templates: () => ({ templates: null, approval: null }) }],
  ])('not offered: %s', (_l, over) => {
    expect(purchaseOfferable(deps(over), ROW)).toBe(false)
  })

  test('not offered for an unreviewed or tampered version', () => {
    expect(purchaseOfferable(deps(), { ...ROW, status: 'prepared' })).toBe(false)
    expect(purchaseOfferable(deps(), { ...ROW, sha256: 'f'.repeat(64) })).toBe(false)
  })
})

// ── CR-V2-MVP-PROD-PREP-1: changed wording, expired guidance, absent issuance authorization and missing legal documents ──
describe('CR-V2-MVP-PROD-PREP-1: no unapproved or stale content reaches a prepared, sold or issued record', () => {
  // A governance-classed bundle standing in for real approvals (test only; never in Production).
  const fixed: PublicationAuthorityBundle = { ...cleanText(SYNTHETIC), authority_class: 'governance' }
  const prep = prepare(fixed)
  if (!prep.ok) throw new Error('fixed bundle did not prepare')
  const reasons = (e: ReturnType<typeof evaluateIssuanceEligibility>) => (e.decision === 'ineligible' ? Array.from(new Set(e.reasons.map((r) => `${r.kind}:${r.code}`))).sort() : [e.decision])
  const sourceTextStates = (s: ReturnType<typeof approvedGovernanceSnapshot>) => {
    const l = s.authorities.source_text
    return l && l.status === 'ok' ? l.entries.map((e) => e.lifecycle) : [l?.status]
  }
  const ISSUE = '2026-11-08'

  test('baseline: the record prepared under the bundle is eligible, now that issuance support is authorized (R15)', () => {
    expect(evaluateIssuanceEligibility(prep.canonical, prep.sha256, withCommercialSupportUnderTest(approvedGovernanceSnapshot(ISSUE, TOPIC_CLAIMS_FIXTURE, fixed))).decision).toBe('eligible')
    // JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110: the shipped support list now names schema 7 and its builder.
    expect(evaluateIssuanceEligibility(prep.canonical, prep.sha256, approvedGovernanceSnapshot(ISSUE, TOPIC_CLAIMS_FIXTURE, fixed)).decision).toBe('eligible')
  })

  test('changed bundle wording under the same approval: preparation refuses, and checkout and issuance refuse the earlier record', () => {
    const changed: PublicationAuthorityBundle = { ...fixed, acknowledgements: { ...fixed.acknowledgements, A2: `${fixed.acknowledgements.A2} Changed.` } }
    const again = prepare(changed)
    expect(again.ok).toBe(false)
    expect(!again.ok && again.stage === 'sources' ? again.refusals.map((r) => r.code) : []).toContain('source_text_digest_mismatch')
    const snapshot = approvedGovernanceSnapshot(ISSUE, TOPIC_CLAIMS_FIXTURE, changed)
    expect(sourceTextStates(snapshot)).toEqual(['pending'])
    expect(reasons(evaluateIssuanceEligibility(prep.canonical, prep.sha256, withCommercialSupportUnderTest(snapshot)))).toContain('source_text:lifecycle_pending')
  })

  test('changed customer wording in code (a different wording-set identity) refuses preparation and issuance the same way', () => {
    const inputs = approvedCustomerRecordInputs(fixed)
    const otherCode = { ...inputs.sources, customer_wording: { ...customerWordingIdentity(), sha256: 'e'.repeat(64) } }
    const prepared = buildCurrentRecord({
      state: { answers: { ...ANS }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } },
      sources: otherCode, source_text: inputs.source_text, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-01',
      record: { record_id: `PREP-${PREP}`, record_version: 1, captured_at: '2026-11-01T09:00:00.000Z' },
    })
    expect(!prepared.ok && prepared.stage === 'sources' ? prepared.refusals.map((r) => r.code) : []).toContain('source_text_digest_mismatch')
    // At checkout and issuance the current digest is recomputed: an approval naming any other digest reads as pending.
    const reg = loadQuestionRegistry(otherCode.registry_input)
    if (!reg.ok) throw new Error('registry')
    const current = sourceTextDigest(sourceTextContent(otherCode, reg.registry, fixed.acknowledgements))
    const snapshot = governanceSnapshotFrom({ issuance_date: ISSUE, sources: otherCode, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [fixed.source_text_approval as SourceTextApproval], source_text_current_sha256: current, authority_class: 'governance' })
    expect(sourceTextStates(snapshot)).toEqual(['pending'])
    expect(reasons(evaluateIssuanceEligibility(prep.canonical, prep.sha256, withCommercialSupportUnderTest(snapshot)))).toContain('source_text:lifecycle_pending')
    // A digest that could not be established refuses too (fail closed).
    expect(sourceTextStates(governanceSnapshotFrom({ issuance_date: ISSUE, sources: inputs.sources, topicClaims: TOPIC_CLAIMS_FIXTURE, source_text_approvals: [fixed.source_text_approval as SourceTextApproval], source_text_current_sha256: null }))).toEqual(['pending'])
  })

  test('expired guidance: past a ledger entry refresh date, guidance from it is refused and the earlier record is not issued', () => {
    const entries = prep.record.sources.publications
    expect(entries.length).toBeGreaterThan(0)
    const d = new Date(`${entries[0].refresh_by}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    const lapsed = d.toISOString().slice(0, 10)
    expect(reasons(evaluateIssuanceEligibility(prep.canonical, prep.sha256, withCommercialSupportUnderTest(approvedGovernanceSnapshot(lapsed, TOPIC_CLAIMS_FIXTURE, fixed))))).toContain('publication_entry:validity_lapsed')
    const entry = fixed.publication_ledger.find((e) => e.entry_id === entries[0].entry_id)!
    const claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === entry.claim_id)!
    expect(authorizePublication(fixed.publication_ledger, claim, lapsed)).toEqual({ authorized: false, reason: 'refresh_lapsed' })
  })

  test('the Production bundle carries the founder-approved content only, and a synthetic record is still not issuable', () => {
    // CR-V2-MVP-LEGAL-CONTENT-6 (JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109): R1-R6 and the consent wording are approved; R7 (ledger), R9/R10 (templates) and
    // issuance support (R15) are not, so nothing can be issued.
    const G = CREATOR_RECORD_GOVERNANCE_AUTHORITY
    // CR-V2-MVP-PROVIDER-SCOPE-1: four ledger entries (Pika baseline v1 superseded by its v2 withdrawal); wording and contract approvals re-versioned.
    expect([G.registry_input.questions.length, G.publication_ledger.length, G.pdf_template_sets?.length]).toEqual([21, 4, 1])
    expect([G.source_text_approval?.review_ref, G.source_text_examination_approval?.review_ref, G.questionnaire_approval?.review_ref]).toEqual(['JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111 schema 7', 'JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111 schema 8', 'JD-CR-V2-MVP-PROVIDER-SCOPE-2-20261111'])
    expect([G.pdf_template_approval?.review_ref, G.pdf_template_sets?.[0].approval.review_ref]).toEqual(['JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110 R9', 'JD-CR-V2-MVP-INTEGRATION-4-20261110'])
    expect([EVIDENCE_CONSENT_APPROVED_WORDING?.id, AI_EXAMINATION_PERMISSION_APPROVED_WORDING?.id]).toEqual(['cr-v2-storage-consent-1', 'cr-v2-ai-permission-1'])
    expect(CURRENT_ISSUANCE_SUPPORT).toEqual({ record_schemas: [{ id: 'si8/creator-record-v2-record', version: 7 }, { id: 'si8/creator-record-v2-record', version: 8 }], builders: [{ id: 'si8/creator-record-v2-record-builder', version: 5 }, { id: 'si8/creator-record-v2-record-builder', version: 7 }], examination_methods: [{ origin: 'live_model', provider: 'anthropic', model: 'claude-sonnet-5', profile: { id: 'receipt', version: 1, schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2' } }] }) // R15 option (a), JD-CR-V2-MVP-APPROVAL-PACKET-1-20261110
    expect(evaluateIssuanceEligibility(prep.canonical, prep.sha256, approvedGovernanceSnapshot(ISSUE, TOPIC_CLAIMS_FIXTURE, G)).decision).not.toBe('eligible')
  })

  test('published legal documents: bound consent identifiers, but still no real-document intake and no live reading (separate locks)', () => {
    // CR-V2-MVP-LEGAL-CONTENT-6: the founder-approved Privacy Notice and Terms are published.
    expect(legalPoliciesApproved()).toBe(true)
    expect(approvedPolicyVersions()).toEqual({ privacy: 'privacy-2026-11-09', terms: 'terms-2026-11-09' })
    expect(customerLiveOffered()).toBe(true) // CR-V2-MVP-PROD-UAT-ACTIVATION-1: both live locks ship true; a reading still needs the database enablement row and an invitation
    expect(evidenceConsentVersion()).toBe('cr-v2-storage-consent-1__privacy-2026-11-09__terms-2026-11-09')
    expect(aiExaminationPermissionVersion()).toBe('cr-v2-ai-permission-1__privacy-2026-11-09__terms-2026-11-09')
    expect(EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED).toBe(true)
    const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
    expect(read('lib/creator-record-flow/evidence-production.ts')).toMatch(/realDocumentsPermitted: EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED && legalPoliciesApproved\(\)/)
    expect(read('lib/creator-record-flow/live-offer.ts')).toMatch(/customerLiveEnabledInThisBuild\(\) && legalPoliciesApproved\(\)/)
  })

  test('no application module reads the DRAFT content package', () => {
    const files: string[] = []
    const walkDir = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) walkDir(p)
        else if (/\.(ts|tsx)$/.test(e.name)) files.push(p)
      }
    }
    for (const d of ['app', 'components', 'lib']) walkDir(join(process.cwd(), d))
    // An import, require or file read of the drafts folder (a comment pointing reviewers to it is not a read).
    expect(files.filter((f) => /(from\s+|import\(|require\(|readFileSync\()[^;\n]*content-drafts/.test(readFileSync(f, 'utf8')))).toEqual([])
  })
})

// ── CR-V2-APPROVAL-AUTHORITY-FIX-1: the reproduced wording bypass (a customer string edited, nothing re-pinned) ──
describe('CR-V2-APPROVAL-AUTHORITY-FIX-1: edited customer wording cannot reach an issuable record without a new approval', () => {
  const fixed: PublicationAuthorityBundle = { ...cleanText(SYNTHETIC), authority_class: 'governance' }
  const prep = prepare(fixed)
  if (!prep.ok) throw new Error('fixed bundle did not prepare')
  const states = (s: ReturnType<typeof approvedGovernanceSnapshot>) => {
    const l = s.authorities.source_text
    return l && l.status === 'ok' ? l.entries.map((e) => e.lifecycle) : [l?.status]
  }
  const edit = <R,>(run: () => R): R => {
    const original = V2_CHECKOUT_COPY.description
    try {
      ;(V2_CHECKOUT_COPY as { description: string }).description = 'UNAPPROVED EDIT: cleared for commercial use.'
      return run()
    } finally {
      ;(V2_CHECKOUT_COPY as { description: string }).description = original
    }
  }

  test('before the edit the approval matches and the record is eligible once issuance is authorized', () => {
    expect(states(approvedGovernanceSnapshot('2026-11-09', TOPIC_CLAIMS_FIXTURE, fixed))).toEqual(['approved'])
    expect(evaluateIssuanceEligibility(prep.canonical, prep.sha256, withCommercialSupportUnderTest(approvedGovernanceSnapshot('2026-11-09', TOPIC_CLAIMS_FIXTURE, fixed))).decision).toBe('eligible')
  })

  test('after the edit (no re-pin, no new approval): preparation refuses and the earlier record is no longer issuable', () => {
    edit(() => {
      const again = prepare(fixed)
      expect(!again.ok && again.stage === 'sources' ? again.refusals.map((r) => r.code) : []).toContain('source_text_digest_mismatch')
      const snapshot = approvedGovernanceSnapshot('2026-11-09', TOPIC_CLAIMS_FIXTURE, fixed)
      expect(states(snapshot)).toEqual(['pending'])
      const e = evaluateIssuanceEligibility(prep.canonical, prep.sha256, withCommercialSupportUnderTest(snapshot))
      expect(e.decision).toBe('ineligible')
      expect(e.decision === 'ineligible' ? e.reasons.map((r) => `${r.kind}:${r.code}`) : []).toContain('source_text:lifecycle_pending')
    })
  })

  test('schema 7 and schema 8 approvals stay independent: each is checked against its own schema, and the edit voids both', () => {
    const text7 = fixed.source_text_approval as SourceTextApproval
    const text8: SourceTextApproval = { ...text7, version: 2, record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION }, review_ref: 'GOV-TEXT-8' }
    const both: PublicationAuthorityBundle = { ...fixed, source_text_examination_approval: text8 }
    const inputs = approvedCustomerRecordInputs(both)
    const codes = (slot: 'source_text' | 'source_text_examination', version: number) => {
      const r = checkApprovedSources(inputs.sources, inputs[slot] ?? null, TOPIC_CLAIMS_FIXTURE, '2026-11-01', { id: CUSTOMER_RECORD_SCHEMA, version })
      return r.ok ? [] : Array.from(new Set(r.refusals.map((x) => x.code)))
    }
    expect([codes('source_text', 7), codes('source_text_examination', 8)]).toEqual([[], []])
    expect(codes('source_text', 8)).toContain('source_text_schema_mismatch')
    expect(codes('source_text_examination', 7)).toContain('source_text_schema_mismatch')
    edit(() => expect(states(approvedGovernanceSnapshot('2026-11-09', TOPIC_CLAIMS_FIXTURE, both))).toEqual(['pending', 'pending']))
    expect(states(approvedGovernanceSnapshot('2026-11-09', TOPIC_CLAIMS_FIXTURE, both))).toEqual(['approved', 'approved'])
  })
})
