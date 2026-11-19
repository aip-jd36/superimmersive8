/**
 * CR-DOC-READER-EXT-5A — licence/permission reading activation readiness (mock and replay only; no model is called).
 *
 *   - ONE default-off switch; licence reading is enabled only with the switch on AND a selected schema 8 template set that can print
 *     a licence reading. Registered approved v7 cannot (regression: licence reading cannot be enabled with v7).
 *   - The static compatibility check agrees with the renderer (v7 refuses a real licence record; v8 renders it).
 *   - Feature off: active profiles, customer live registry and issuance support are exactly as before; the route ignores the category.
 *   - Feature on: category routing (licence → licence profile; unsupported and unknown categories refused before anything is read).
 *   - The real executor reads each profile with its own reading contract; receipt requests are unchanged; other profiles refused.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

const requestSpy = jest.fn()
jest.mock('@/lib/creator-record/customer-flow/examination', () => {
  const actual = jest.requireActual('@/lib/creator-record/customer-flow/examination')
  return { ...actual, checkCustomerExaminationGate: jest.fn(async () => null), requestCustomerExamination: (...a: unknown[]) => requestSpy(...a) }
})

import { approvedPdfTemplates, LICENCE_READING_SWITCH, licenceReadingEnabled } from '@/lib/creator-record/customer-flow/approved-inputs'
import { LICENCE_POSSIBLE_LIMITATIONS, missingLicenceLabels, templatesRenderLicenceReadings } from '@/lib/creator-record/customer-flow/licence-compatibility'
import { ACTIVE_CUSTOMER_PROFILES, customerProfilesFor, profileForCategory } from '@/lib/creator-record/examination/category-profile'
import { licenceLimitations, LICENCE_PROFILE_ID } from '@/lib/creator-record/examination/licence-profile'
import { LICENCE_FIELD_NAMES, LICENCE_READABILITY_VALUES } from '@/lib/creator-record/licence-examination/schema'
import { CURRENT_ISSUANCE_SUPPORT, issuanceSupportFor, LICENCE_EXAMINATION_METHOD } from '@/lib/creator-record/customer-record/governance-state'
import { CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { buildCustomerDocument, CustomerPdfRefusal } from '@/lib/creator-record/customer-pdf/document-model'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '@/lib/creator-record/governed/sources'
import type { PublicationAuthorityBundle } from '@/lib/creator-record/governed/publication-authority'
import { LIVE_PROFILE_REGISTRY } from '@/lib/creator-record/live-examination/examine'
import { customerLiveProfileRegistry } from '@/lib/creator-record/live-examination/licence-live-profile'
import { loadCustomerLiveExecutor } from '@/lib/creator-record/live-examination/real-executor'
import { examinationRequestBody } from '@/lib/creator-record-flow/examination-customer'
import { handleExaminationRequest } from '@/lib/creator-record-flow/route-handlers'
import { ISSUED, licenceRecord, SYNTHETIC_V8, V8 } from '@/test-support/doc-reader-ext-fixture'

const APP = path.join(__dirname, '../..')
const S8 = { id: CUSTOMER_RECORD_SCHEMA, version: 8 }
const GOV = CREATOR_RECORD_GOVERNANCE_AUTHORITY
/** The governance bundle as it would be after a v8 approval: v8 approved (synthetic), v7 superseded. */
/** CR-DOC-READER-EXT-9: the governance bundle as it was before activation: v7 approved and selected, v8 pending. */
const preActivation = (): PublicationAuthorityBundle => ({
  ...GOV,
  pdf_template_sets: (GOV.pdf_template_sets ?? []).map((s) =>
    s.approval.record_schema.version !== 8 ? s : s.approval.version === 7 ? { ...s, approval: { ...s.approval, lifecycle: 'approved' } } : s.approval.version === 8 ? { ...s, approval: { ...s.approval, lifecycle: 'pending' } } : s,
  ),
})
const v7Set = () => (GOV.pdf_template_sets ?? []).find((s) => s.approval.record_schema.version === 8 && s.approval.version === 7)!

const withV8Approved = (): PublicationAuthorityBundle => ({
  ...GOV,
  pdf_template_sets: (GOV.pdf_template_sets ?? []).map((s) =>
    s.approval.record_schema.version !== 8 ? s : s.approval.version === 7 ? { ...s, approval: { ...s.approval, lifecycle: 'superseded' } } : s.approval.version === 8 ? { templates: s.templates, approval: SYNTHETIC_V8 } : s,
  ),
})

describe('the switch and the PDF compatibility gate', () => {
  test('CR-DOC-READER-EXT-9: the switch is on in source; off still means disabled whatever the templates', () => {
    expect(LICENCE_READING_SWITCH).toBe('on')
    expect(readFileSync(path.join(APP, 'lib/creator-record/customer-flow/approved-inputs.ts'), 'utf8')).toMatch(/export const LICENCE_READING_SWITCH = 'on' as 'off' \| 'on'/)
    expect(licenceReadingEnabled()).toBe(true)
    expect(licenceReadingEnabled('off', GOV)).toBe(false)
    expect(licenceReadingEnabled('off', withV8Approved())).toBe(false)
  })

  test('REGRESSION: licence reading cannot be enabled while the incompatible v7 is the selected schema 8 set', () => {
    const selected = approvedPdfTemplates(preActivation(), S8)
    expect(selected.approval?.version).toBe(7)
    expect(templatesRenderLicenceReadings(selected.templates)).toBe(false)
    expect(missingLicenceLabels(selected.templates)).toEqual(expect.arrayContaining(['field:document_kind', 'field:licence_or_plan_type', 'classification:document_kind=licence_or_licence_certificate']))
    expect(licenceReadingEnabled('on', preActivation())).toBe(false)
  })

  test('enabled only with the switch on AND v8 approved and selected; two approved schema 8 sets select nothing (off)', () => {
    expect(licenceReadingEnabled('on', withV8Approved())).toBe(true)
    const both: PublicationAuthorityBundle = { ...GOV, pdf_template_sets: (preActivation().pdf_template_sets ?? []).map((s) => (s.approval.version === 8 ? { templates: s.templates, approval: SYNTHETIC_V8 } : s)) }
    expect(licenceReadingEnabled('on', both)).toBe(false)
    expect(licenceReadingEnabled('on', null)).toBe(false)
  })

  test('CR-DOC-READER-EXT-9: the registered v8 is approved and selected, v7 superseded, and v8 passes the compatibility check', () => {
    const v8 = (GOV.pdf_template_sets ?? []).find((s) => s.approval.version === 8)!
    expect(v8.approval.lifecycle).toBe('approved')
    expect(v7Set().approval.lifecycle).toBe('superseded')
    expect(approvedPdfTemplates(GOV, S8).approval?.version).toBe(8)
    expect(missingLicenceLabels(v8.templates)).toEqual([])
  })

  test('the static check agrees with the renderer: v7 refuses a real licence record, v8 renders it', async () => {
    const rec = await licenceRecord({ M0: ['music'], M1: ['artlist'], M2: ['yes'] })
    const v7 = { templates: v7Set().templates, approval: { ...v7Set().approval, lifecycle: 'approved' as const } } // as when it was selected
    let refusal: unknown = null
    try {
      buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: v7.templates, template_approval: v7.approval! })
    } catch (e) {
      refusal = e
    }
    expect(refusal).toBeInstanceOf(CustomerPdfRefusal)
    expect((refusal as CustomerPdfRefusal).code).toBe('observation_field_unlabelled')
    expect(() => buildCustomerDocument({ canonical: rec.canonical, sha256: rec.sha256, issued: ISSUED, templates: V8.templates, template_approval: SYNTHETIC_V8 })).not.toThrow()
  })

  test('the static limitation list equals the profile mapping over every branch', () => {
    const all = new Set<string>()
    for (const readability of LICENCE_READABILITY_VALUES) for (const instr of [true, false]) for (const present of [true, false]) {
      const fields = Object.fromEntries(LICENCE_FIELD_NAMES.map((f) => [f, present ? { status: 'present', value: 'x', evidence: 'x' } : { status: 'not_shown', value: null, evidence: null }]))
      for (const l of licenceLimitations({ document_kind: 'unknown', readability, instruction_like_text_present: instr, personal_details_present: false, ...fields } as never)) all.add(l)
    }
    expect([...all].sort()).toEqual([...LICENCE_POSSIBLE_LIMITATIONS].sort())
  })
})

describe('feature off: everything exactly as before', () => {
  test('profiles, live registry and issuance support are the unchanged defaults', () => {
    expect(customerProfilesFor(false)).toBe(ACTIVE_CUSTOMER_PROFILES)
    expect(customerLiveProfileRegistry(false)).toBe(LIVE_PROFILE_REGISTRY)
    expect([...LIVE_PROFILE_REGISTRY.keys()]).toEqual(['receipt@1'])
    expect(issuanceSupportFor(false)).toBe(CURRENT_ISSUANCE_SUPPORT)
    expect(profileForCategory('licence').ok).toBe(false)
  })
  test('feature on adds the licence profile, its live profile and its method, and nothing else', () => {
    expect(customerProfilesFor(true).map((p) => `${p.id}@${p.version}`)).toEqual(['receipt@1', 'licence@1'])
    expect([...customerLiveProfileRegistry(true).keys()]).toEqual(['receipt@1', 'licence@1'])
    const s = issuanceSupportFor(true)
    expect(s.record_schemas).toBe(CURRENT_ISSUANCE_SUPPORT.record_schemas)
    expect(s.examination_methods).toEqual([...(CURRENT_ISSUANCE_SUPPORT.examination_methods ?? []), LICENCE_EXAMINATION_METHOD])
    expect(LICENCE_EXAMINATION_METHOD.profile).toEqual({ id: LICENCE_PROFILE_ID, version: 1, schema: 'licence-extraction-v1', prompt: 'licence-prompt-v1' })
  })
})

describe('the route: category routing only while the licence profile is active', () => {
  const ID = '11111111-1111-4111-8111-111111111111'
  const post = (body?: unknown) => new Request('http://x/', { method: 'POST', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) })
  const deps = (licence: boolean) => ({ submissions: 'open', hasPilotAccess: async () => true, adapter: {} as never, activeProfiles: customerProfilesFor(licence) }) as never
  beforeEach(() => {
    requestSpy.mockReset()
    requestSpy.mockResolvedValue({ ok: true, run_id: 'r', result: 'created' })
  })

  test('the body accepts ai_permission and/or a bounded category, nothing else', async () => {
    expect(await examinationRequestBody(post({ category: 'licence' }))).toEqual({ ok: true, aiPermission: null, category: 'licence' })
    expect(await examinationRequestBody(post({ ai_permission: 'v1', category: 'billing_receipt' }))).toEqual({ ok: true, aiPermission: 'v1', category: 'billing_receipt' })
    expect(await examinationRequestBody(post({ category: 'licence', profile: 'licence' }))).toEqual({ ok: false })
    expect(await examinationRequestBody(post({ category: 7 }))).toEqual({ ok: false })
    expect(await examinationRequestBody(post({ category: 'x'.repeat(41) }))).toEqual({ ok: false })
    expect(await examinationRequestBody(post())).toEqual({ ok: true, aiPermission: null })
  })

  test('feature off: the declared category is ignored (receipt reader, as before)', async () => {
    await handleExaminationRequest(post({ category: 'licence' }), ID, ID, deps(false))
    expect(requestSpy.mock.calls[0][3]).toEqual({ aiPermission: null })
  })

  test('feature on: the declared category is passed to the router', async () => {
    await handleExaminationRequest(post({ category: 'permission' }), ID, ID, deps(true))
    expect(requestSpy.mock.calls[0][3]).toEqual({ aiPermission: null, category: 'permission' })
  })

  test('feature on, routing decisions: licence/permission → licence; receipts → receipt; unsupported and unknown refused', async () => {
    const { routeExaminationProfile } = jest.requireActual('@/lib/creator-record/customer-flow/examination')
    const active = customerProfilesFor(true)
    expect(routeExaminationProfile('licence', active)).toMatchObject({ ok: true, profile: { id: 'licence', version: 1 } })
    expect(routeExaminationProfile('permission', active)).toMatchObject({ ok: true, profile: { id: 'licence', version: 1 } })
    expect(routeExaminationProfile('billing_receipt', active)).toMatchObject({ ok: true, profile: { id: 'receipt', version: 1 } })
    for (const c of ['release_or_consent', 'project_file', 'other', 'nonsense']) expect(routeExaminationProfile(c, active)).toMatchObject({ ok: false, error: { status: 422, code: 'not_examinable' } })
    expect(routeExaminationProfile(undefined, active)).toMatchObject({ ok: true, profile: { id: 'receipt' } })
  })

  test("the route's literal 'licence' is the licence profile id", () => {
    expect(LICENCE_PROFILE_ID).toBe('licence')
  })
})

describe('the real executor reads each profile with its own contract', () => {
  const env = { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }
  const sha = 'a'.repeat(64)
  const adapter = () => {
    const created: unknown[] = []
    return { created, load: async () => ({ createAnthropicReceiptCaller: (o: unknown) => (created.push(o), (async () => { throw new Error('no call in this test') }) as never), classifyAnthropicFailure: () => 'unknown' as const }) }
  }

  test('receipt (named or not): the caller options are exactly as before, with no reading contract', async () => {
    for (const scope of [{ document_sha256: sha }, { document_sha256: sha, profile: { id: 'receipt', version: 1 } }]) {
      const a = adapter()
      await loadCustomerLiveExecutor(scope, { env, loadAdapter: a.load as never })
      expect(a.created).toEqual([{ model: 'claude-sonnet-5', apiKeyEnv: 'CREATOR_RECORD_EXTRACTION_API_KEY', timeoutMs: expect.any(Number) }])
    }
  })
  test('licence: the licence reading contract', async () => {
    const a = adapter()
    await loadCustomerLiveExecutor({ document_sha256: sha, profile: { id: 'licence', version: 1 } }, { env, loadAdapter: a.load as never })
    expect(a.created).toEqual([expect.objectContaining({ readingContract: 'licence-extraction-v1' })])
  })
  test('any other profile is refused before the adapter loads', async () => {
    for (const profile of [{ id: 'licence', version: 2 }, { id: 'release', version: 1 }, { id: 'receipt', version: 3 }]) {
      const a = adapter()
      await expect(loadCustomerLiveExecutor({ document_sha256: sha, profile }, { env, loadAdapter: a.load as never })).rejects.toThrow('live_examination_disabled:profile_not_supported')
      expect(a.created).toEqual([])
    }
  })
  test('the input bound stays conservative: the licence prompt and schema are no larger than the receipt ones it is sized for', () => {
    const { RECEIPT_EXAMINATION_SYSTEM_PROMPT } = jest.requireActual('@/lib/creator-record/receipt-examination/prompt')
    const { RECEIPT_EXTRACTION_SCHEMA } = jest.requireActual('@/lib/creator-record/receipt-examination/schema')
    const { LICENCE_SYSTEM_PROMPT } = jest.requireActual('@/lib/creator-record/licence-examination/prompt')
    const { LICENCE_EXTRACTION_SCHEMA } = jest.requireActual('@/lib/creator-record/licence-examination/schema')
    const b = (s: string) => Buffer.byteLength(s, 'utf8')
    expect(b(LICENCE_SYSTEM_PROMPT) + b(JSON.stringify(LICENCE_EXTRACTION_SCHEMA))).toBeLessThanOrEqual(b(RECEIPT_EXAMINATION_SYSTEM_PROMPT) + b(JSON.stringify(RECEIPT_EXTRACTION_SCHEMA)))
  })
})
