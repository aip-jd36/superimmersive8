/**
 * CR-V2-MVP-M4C — the shipped synthetic test authority (`governed/synthetic-test-authority.ts`).
 *
 * Proves the fixture is (a) clearly test-only: every customer-visible string is new placeholder wording,
 * no pilot wording, every approval names the synthetic authority; (b) pinned like a real approval: its
 * source-text digest and template fingerprint match the wording exactly; (c) usable only under the
 * isolated-test runtime conditions, end to end (prepare → checkout eligibility → issuance render), and
 * refused in Production and every unsafe environment; (d) inert while the stops are stopped.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY as SYN, SYNTHETIC_PDF_TEMPLATES_FINGERPRINT, SYNTHETIC_SOURCE_TEXT_SHA256, SYNTHETIC_TEST_AUTHORITY_NAME } from '@/lib/creator-record/governed/synthetic-test-authority'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import { PRODUCTION_SUPABASE_PROJECT_REF } from '@/lib/creator-record/governed/publication-authority'
import {
  approvedCustomerRecordInputs, approvedGovernanceSnapshot, approvedPdfTemplates, currentPublicationAuthority, CREATOR_RECORD_V2_SUBMISSIONS,
} from '@/lib/creator-record/customer-flow/approved-inputs'
import { loadQuestionRegistry } from '@/lib/creator-record/contract/question-registry'
import { buildCustomerRecord as buildCurrentRecord, CUSTOMER_RECORD_SCHEMA, CUSTOMER_RECORD_SCHEMA_VERSION, HISTORICAL_RECORD_SCHEMA_VERSION } from '@/lib/creator-record/customer-record/record'
import { checkSourceText, sourceTextContent, sourceTextDigest } from '@/lib/creator-record/customer-record/source-text'
import { evaluateIssuanceEligibility } from '@/lib/creator-record/customer-record/eligibility'
import { checkTemplates, CUSTOMER_PDF_TEMPLATE_ID, templateFingerprint } from '@/lib/creator-record/customer-pdf/templates'
import { buildCustomerDocument, documentModelCanonical } from '@/lib/creator-record/customer-pdf/document-model'
import { renderV2ForIssuance, V2IssuanceRefusal, type V2IssuanceDeps } from '@/lib/creator-record/customer-flow/purchase'
import type { PreparedRow } from '@/lib/creator-record/customer-flow/service'
import { CANONICAL_ASSET_PROVIDER_ID_LIST, CANONICAL_TOOL_ID_LIST } from '@/lib/creator-record/identity/selectable-identities'
import { PILOT_ACKNOWLEDGEMENTS, PILOT_QUESTION_META } from '@/lib/creator-record/pilot/pilot-registry'
import { PILOT_CAVEATS, PILOT_DEPENDENCY_LABELS, PILOT_PUBLICATION_LEDGER } from '@/lib/creator-record/pilot/pilot-ledger'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CreatorRecordIssuanceStoppedError, rendererForFamily } from '@/lib/creator-record-artifacts/renderers'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { historicalForm } from '@/test-support/historical-record'

/** Issuance and the customer PDF support schema 5 only: records in that format, as a row prepared then would be. */
const buildCustomerRecord = (input: Parameters<typeof buildCurrentRecord>[0]) => historicalForm(buildCurrentRecord(input))

jest.mock('@/lib/creator-record-flow/production', () => ({ renderCreatorRecordV2Pdf: jest.fn() }))

const ISOLATED_REF = 'abcdefghijklmnopqrst'
const ISOLATED = Object.freeze({
  SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test',
  VERCEL_ENV: 'preview',
  NEXT_PUBLIC_SUPABASE_URL: `https://${ISOLATED_REF}.supabase.co`,
  SI8_CR_SYNTHETIC_SUPABASE_REF: ISOLATED_REF,
  STRIPE_SECRET_KEY: 'sk_test_51Staging',
})
const PRODUCTION = Object.freeze({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`, STRIPE_SECRET_KEY: 'sk_live_51Real' })

if (!SYN) throw new Error('synthetic test authority is not populated')
const bundle = SYN
const inputs = approvedCustomerRecordInputs(bundle)
const reg = loadQuestionRegistry(bundle.registry_input)
if (!reg.ok) throw new Error(`synthetic registry does not load: ${reg.errors.join('; ')}`)

const allClaims = Object.values(TOPIC_CLAIMS_FIXTURE).flat() as { claim_id: string; last_verified: string; superseded_by: string | null }[]

describe('the synthetic test authority is classed, named and worded as a test', () => {
  test('class, authority name and version strings are synthetic', () => {
    expect(bundle.authority_class).toBe('synthetic_test')
    expect(SYNTHETIC_TEST_AUTHORITY_NAME).toMatch(/^SYNTHETIC TEST AUTHORITY/)
    expect(bundle.versions.registry).toMatch(/^SYN-.*synthetic test/)
    expect(bundle.versions.ledger).toMatch(/^SYN-.*synthetic test/)
  })

  test('every approval names the synthetic authority (none names a person or a real review)', () => {
    const approvals = [...bundle.registry_input.questions.map((q) => q.approval), ...bundle.registry_input.observation_map.map((o) => o.approval)]
    for (const a of approvals) expect(a).toMatchObject({ status: 'approved', approver: SYNTHETIC_TEST_AUTHORITY_NAME, review_ref: expect.stringMatching(/^SYN-/) })
    for (const e of bundle.publication_ledger) expect(e).toMatchObject({ approver: SYNTHETIC_TEST_AUTHORITY_NAME, entry_id: expect.stringMatching(/^SYN-M4C-LEDGER-/) })
    expect(bundle.source_text_approval).toMatchObject({ authority: SYNTHETIC_TEST_AUTHORITY_NAME, review_ref: expect.stringMatching(/^SYN-/) })
    expect(bundle.pdf_template_approval).toMatchObject({ authority: SYNTHETIC_TEST_AUTHORITY_NAME, review_ref: expect.stringMatching(/^SYN-/) })
  })

  test('every customer-visible string is marked test-only', () => {
    const texts: string[] = []
    for (const m of Object.values(bundle.presentation)) texts.push(m.text, ...(m.help ? [m.help] : []), ...Object.values(m.option_labels))
    texts.push(...Object.values(bundle.acknowledgements), ...Object.values(bundle.caveats), ...Object.values(bundle.dependency_labels))
    for (const e of bundle.publication_ledger) texts.push(e.explanation as string, ...Object.values(e.evidence_notes))
    const walk = (v: unknown, key = ''): void => {
      if (typeof v === 'string') {
        if (!['template_id', 'id', 'page_label', 'subject_with_tool'].includes(key) && !/^(project|contribution)$/.test(v)) texts.push(v)
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, key))
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k)
    }
    walk(bundle.pdf_templates)
    expect(texts.length).toBeGreaterThan(100)
    for (const s of texts) expect(s).toMatch(/^\[TEST ONLY\] |^SYNTHETIC TEST RECORD/)
  })

  test('no pilot wording is reused (questions, options, acknowledgements, caveats, labels, explanations)', () => {
    const pilot = new Set<string>([
      ...Object.values(PILOT_QUESTION_META).flatMap((m) => [m.text, m.help ?? '', ...Object.values(m.option_labels)]),
      ...Object.values(PILOT_ACKNOWLEDGEMENTS), ...Object.values(PILOT_CAVEATS), ...Object.values(PILOT_DEPENDENCY_LABELS),
      ...PILOT_PUBLICATION_LEDGER.flatMap((e) => [e.explanation ?? '', ...Object.values(e.evidence_notes)]),
    ].filter((s) => s.length > 12))
    const ours = JSON.stringify(bundle)
    for (const s of pilot) expect(ours.includes(s)).toBe(false)
    expect(ours).not.toMatch(/PILOT/)
  })

  test('the file imports types only and nothing from the pilot', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'lib', 'creator-record', 'governed', 'synthetic-test-authority.ts'), 'utf8')
    expect(src).not.toMatch(/^\s*import\s+(?!type\s)/m)
    expect(src).not.toMatch(/pilot\//)
  })
})

describe('the synthetic test authority is structurally sound and pinned like a real approval', () => {
  test('tool and provider options are canonical identities', () => {
    const codes = (q: string) => bundle.registry_input.questions.find((x) => x.q_id === q)?.options as string[]
    for (const c of codes('T1')) expect([...CANONICAL_TOOL_ID_LIST, 'other_tool', 'not_sure']).toContain(c)
    for (const c of codes('M1')) expect([...CANONICAL_ASSET_PROVIDER_ID_LIST, 'other_provider', 'not_sure']).toContain(c)
  })

  test('every ledger entry references a current governed claim at its own last_verified date', () => {
    for (const e of bundle.publication_ledger) {
      const c = allClaims.find((x) => x.claim_id === e.claim_id)
      expect(c).toBeDefined()
      expect(c?.superseded_by).toBeNull()
      expect(e.claim_last_verified).toBe(c?.last_verified)
      for (const id of e.required_caveats) expect(bundle.caveats[id]).toBeDefined()
    }
  })

  test('the source-text digest is pinned to exactly this wording', () => {
    const digest = sourceTextDigest(sourceTextContent(inputs.sources, reg.registry, bundle.acknowledgements))
    expect(SYNTHETIC_SOURCE_TEXT_SHA256).toBe(digest)
    expect(checkSourceText(inputs.sources, reg.registry, bundle.acknowledgements, bundle.source_text_approval, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION }).ok).toBe(true)
  })

  test('the template fingerprint is pinned, and the templates pass the wording lock', () => {
    expect(SYNTHETIC_PDF_TEMPLATES_FINGERPRINT).toBe(templateFingerprint(bundle.pdf_templates))
    expect(bundle.pdf_template_approval?.template_id).toBe(CUSTOMER_PDF_TEMPLATE_ID)
    expect(checkTemplates(bundle.pdf_templates, bundle.pdf_template_approval, { id: CUSTOMER_RECORD_SCHEMA, version: HISTORICAL_RECORD_SCHEMA_VERSION })).toMatchObject({ ok: true })
  })

  test('a wording change without re-pinning is refused (digest mismatch)', () => {
    const changed = { ...bundle.acknowledgements, A1: `${bundle.acknowledgements.A1} (edited)` }
    expect(checkSourceText(inputs.sources, reg.registry, changed, bundle.source_text_approval, { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_SCHEMA_VERSION })).toMatchObject({ ok: false })
  })
})

// ── End to end, with the shipped fixture ──
const SUB = '44444444-4444-4444-8444-444444444444'
const PREP = '00000000-0000-4000-8000-000000004c01'
function prepare(b: ReturnType<typeof currentPublicationAuthority>) {
  const i = approvedCustomerRecordInputs(b)
  return buildCustomerRecord({
    state: {
      answers: { P1: ['M4C staging rehearsal'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['music'], M1: ['artlist'], H1: ['edited'] },
      tools: [{ T1: ['pika'], T3: ['Standard'] }],
      acknowledgements: { A1: true, A2: true },
    },
    sources: i.sources, source_text: i.source_text, topicClaims: TOPIC_CLAIMS_FIXTURE, as_of: '2026-11-01',
    record: { record_id: `PREP-${PREP}`, record_version: 1, captured_at: '2026-11-01T09:00:00.000Z' },
  })
}
const built = prepare(bundle)
const issueWith = (b: ReturnType<typeof currentPublicationAuthority>) => {
  if (!built.ok) throw new Error('not built')
  const row: PreparedRow = {
    id: PREP, user_id: 'u', draft_id: 'd', version: 1, record_ref: `PREP-${PREP}`, record_schema: CUSTOMER_RECORD_SCHEMA, record_schema_version: built.record.schema_version,
    canonical: built.canonical, sha256: built.sha256, form_state: {} as never, status: 'reviewed', created_at: '', reviewed_at: '', submission_id: SUB,
  }
  const deps: V2IssuanceDeps = {
    boundTo: async () => row,
    governance: (d) => approvedGovernanceSnapshot(d, TOPIC_CLAIMS_FIXTURE, b),
    templates: () => approvedPdfTemplates(b),
    renderPdf: async (input) => new TextEncoder().encode(documentModelCanonical(buildCustomerDocument(input))),
  }
  return renderV2ForIssuance(deps, { id: SUB, user_id: 'u', tier: 'creator_record', creator_record_product: 'v2' }, 'CR-2026-44444444', new Date('2026-11-01T10:00:00Z'))
    .then((bytes) => ({ issued: true as const, text: new TextDecoder().decode(bytes) }))
    .catch((e) => ({ issued: false as const, code: e instanceof V2IssuanceRefusal ? e.code : String(e) }))
}

describe('end to end with the shipped fixture', () => {
  test('isolated test conditions select it; it prepares, is eligible and renders a visibly synthetic record', async () => {
    expect(currentPublicationAuthority(ISOLATED)).toBe(bundle)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(evaluateIssuanceEligibility(built.canonical, built.sha256, approvedGovernanceSnapshot('2026-11-01', TOPIC_CLAIMS_FIXTURE, currentPublicationAuthority(ISOLATED))).decision).toBe('eligible')
    const out = await issueWith(currentPublicationAuthority(ISOLATED))
    expect(out.issued).toBe(true)
    if (out.issued) {
      expect(out.text).toContain('SYNTHETIC TEST RECORD')
      expect(out.text).toContain('[TEST ONLY] Placeholder explanation for CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1')
    }
  })

  test.each([
    ['Production (no mode set)', PRODUCTION],
    ['Production with the synthetic mode set', { ...PRODUCTION, SI8_CR_PUBLICATION_AUTHORITY: 'synthetic-isolated-test', SI8_CR_SYNTHETIC_SUPABASE_REF: PRODUCTION_SUPABASE_PROJECT_REF }],
    ['a preview pointed at the Production database', { ...ISOLATED, NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`, SI8_CR_SYNTHETIC_SUPABASE_REF: PRODUCTION_SUPABASE_PROJECT_REF }],
    ['a preview with a live Stripe key', { ...ISOLATED, STRIPE_SECRET_KEY: 'sk_live_51Real' }],
    ['a preview with no database binding', { ...ISOLATED, SI8_CR_SYNTHETIC_SUPABASE_REF: undefined }],
    ['a malformed mode', { ...ISOLATED, SI8_CR_PUBLICATION_AUTHORITY: 'synthetic' }],
  ])('%s never uses it: nothing prepares and a synthetic record is not issued', async (_, env) => {
    const selected = currentPublicationAuthority(env)
    expect(selected).not.toBe(bundle)
    expect(prepare(selected).ok).toBe(false)
    expect((await issueWith(selected)).issued).toBe(false)
  })

  test('Production still resolves to the (empty) governance bundle', () => {
    expect(currentPublicationAuthority(PRODUCTION)).toBe(CREATOR_RECORD_GOVERNANCE_AUTHORITY)
  })

  test('both stops remain stopped, so the shipped fixture cannot issue through the real renderer anywhere', () => {
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
    expect(() => rendererForFamily('creator_record_v2')).toThrow(CreatorRecordIssuanceStoppedError)
  })
})
