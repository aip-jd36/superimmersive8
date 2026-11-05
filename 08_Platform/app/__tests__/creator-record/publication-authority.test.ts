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
import { buildCustomerRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { SOURCE_TEXT_CATEGORIES, SOURCE_TEXT_SOURCE_ID, sourceTextContent, sourceTextDigest, type SourceTextApproval } from '@/lib/creator-record/customer-record/source-text'
import { evaluateIssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { CUSTOMER_PDF_TEMPLATE_ID, templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerDocument, documentModelCanonical } from '@/lib/creator-record/customer-pdf/document-model'
import {
  approvedCustomerRecordInputs, approvedGovernanceSnapshot, approvedPdfTemplates, currentPublicationAuthority, CREATOR_RECORD_V2_SUBMISSIONS,
} from '@/lib/creator-record/customer-flow/approved-inputs'
import { renderV2ForIssuance, V2IssuanceRefusal, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import {
  PRODUCTION_SUPABASE_PROJECT_REF, resolvePublicationAuthority, selectAuthorityBundle, supabaseProjectRef, type PublicationAuthorityBundle,
} from '@/lib/creator-record/governed/publication-authority'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import * as Governed from '@/lib/creator-record/governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CreatorRecordIssuanceStoppedError, rendererForFamily } from '@/lib/creator-record-artifacts/renderers'
import { questionnaireApprovalFor } from '@/test-support/questionnaire-approval'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { APPLICABILITY_FACTS } from '@/lib/retrieval-engine/types'

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
  const text: SourceTextApproval = {
    source_id: SOURCE_TEXT_SOURCE_ID as typeof SOURCE_TEXT_SOURCE_ID, version: 1, content_sha256: sourceTextDigest(sourceTextContent(sources, reg.registry, acks)),
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
    source_text_approval: text, questionnaire_approval: questionnaireApprovalFor(sources, acks, { authority: approver, review_ref: 'SYN-CONTRACT-REVIEW-1' }), pdf_templates: templates, pdf_template_approval: templateApproval,
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
      provenance: { heading: t('8. Provenance'), acknowledgements_heading: t('Acknowledged'), identity_heading: t('Record'), sources_heading: t('Sources'), publications_heading: t('Guidance sources'), labels: { record_id: t('Record id'), issued_on: t('Issued on'), prepared_ref: t('Ref'), record_version: t('Version'), prepared_on: t('Prepared'), captured_at: t('Captured'), snapshot: t('SHA-256'), record_schema: t('Schema'), record_schema_version: t('Schema version'), builder: t('Builder'), builder_version: t('Builder version'), registry_version: t('Registry'), ledger_version: t('Ledger'), wording: t('Wording'), wording_version: t('Wording version'), wording_digest: t('Wording digest'), templates: t('Templates'), templates_version: t('Templates version'), templates_fingerprint: t('Templates fingerprint'), publication_version: t('Entry version') } },
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
  governance: (d) => approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE, bundle),
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
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, bundle)).decision).toBe('eligible')
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
    expect(prepare(bundle).ok).toBe(false)
    expect(evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, bundle)).decision).not.toBe('eligible')
    expect(await refusalOf(issue(bundle))).toMatch(/^governance_(ineligible|indeterminate)$/)
  })

  test('no authority fails closed as indeterminate (unavailable), never as an empty-but-approved state', () => {
    const e = evaluateIssuanceEligibility(ROW.canonical, ROW.sha256, approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, null))
    expect(e).toMatchObject({ decision: 'indeterminate', cause: 'unavailable' })
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
      },
      source_text: null,
    })
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
  test('both stops ship stopped, and v2 issuance is refused while stopped even with the synthetic authority selected', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(authorityFor(ISOLATED)).toBe(SYNTHETIC)
    expect(() => rendererForFamily('creator_record_v2')).toThrow(CreatorRecordIssuanceStoppedError)
  })
})
