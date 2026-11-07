/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — unit tests: the AI-examination permission in the examination service and the route body (8Q),
 * the withdrawal control and its route (8N), the dashboard's support-required and paused states, and the legal-page
 * infrastructure that keeps real documents and live examination closed until approved policies exist.
 * The database side is tested on PostgreSQL in __tests__/db/creator-record-v2-ai-permission.db.test.ts.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { renderToStaticMarkup } from 'react-dom/server'

jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))

import { AiPermissionRefusal, requestCustomerExamination, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import type { CustomerLiveResult } from '@/lib/creator-record/live-examination/customer'
import { examinationRequestBody, emptyRequestBody } from '@/lib/creator-record-flow/examination-customer'
import { v2DashboardState, v2DashboardView, v2FulfilmentView } from '@/lib/creator-record-flow/dashboard'
import { V2_CONSENT, V2_DASHBOARD } from '@/lib/creator-record-flow/wording'
import { legalPageContent, legalPoliciesApproved, PRIVACY_NOTICE, TERMS_OF_SERVICE, type ApprovedLegalDocument } from '@/lib/legal/policies'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { ConsentWithdrawalControl } from '@/components/creator-record/ConsentWithdrawalControl'
import { EvidencePanel } from '@/components/creator-record/EvidencePanel'
import { readConsentState } from '@/lib/creator-record/evidence-intake/retention'
import { AI_EXAMINATION_PERMISSION_DRAFT_VERSION, EVIDENCE_CONSENT_DRAFT_VERSION } from '@/lib/creator-record/evidence-intake/contract'

const APP = path.join(__dirname, '..', '..')
const OWNER = 'aaaaaaaa-2222-4333-8444-555555555555'
const DOC = '11111111-2222-4333-8444-555555555555'
const VERSION = AI_EXAMINATION_PERMISSION_DRAFT_VERSION
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8')

// ── 8Q: the examination service ──
function liveDeps(over: Partial<CustomerExaminationDeps> = {}) {
  const order: string[] = []
  const examined: CustomerLiveResult = { result: { kind: 'examined', attempt_id: 'att-1', envelope: {} as never, model_called: true }, reservation_refusal: null, settlement: { status: 'settled', charged_micro_usd: 1 } }
  const deps: CustomerExaminationDeps = {
    submissions: 'open', hasPilotAccess: async () => true, now: () => new Date(),
    adapter: { storage: { getDocument: async () => ({ id: DOC, user_id: OWNER, state: 'stored' }) } } as unknown as CustomerExaminationDeps['adapter'],
    live: { examine: async () => { order.push('examine'); return examined } },
    aiPermission: { version: VERSION, grant: async (u, d, v) => { order.push(`grant:${u}:${d}:${v}`); return 'granted' } },
    ...over,
  }
  return { deps, order }
}

describe('Decision 8Q: AI-examination permission in the examination service', () => {
  test('a live examination records the explicit permission for this document first, then examines', async () => {
    const { deps, order } = liveDeps()
    expect(await requestCustomerExamination(deps, OWNER, DOC, { aiPermission: VERSION })).toEqual({ ok: true, run_id: 'att-1', result: 'created' })
    expect(order).toEqual([`grant:${OWNER}:${DOC}:${VERSION}`, 'examine'])
  })
  test.each([
    ['missing', undefined],
    ['null', null],
    ['a different version', 'DRAFT-UNAPPROVED-cr-v2-ai-examination-permission-1'],
    ['the storage consent identifier', EVIDENCE_CONSENT_DRAFT_VERSION],
  ])('permission %s → 400 ai_permission_required; nothing recorded or examined', async (_l, aiPermission) => {
    const { deps, order } = liveDeps()
    expect(await requestCustomerExamination(deps, OWNER, DOC, { aiPermission })).toEqual({ ok: false, status: 400, code: 'ai_permission_required' })
    expect(order).toEqual([])
  })
  test.each([
    [new AiPermissionRefusal('withdrawn'), { status: 409, code: 'examination_not_permitted' }],
    [new AiPermissionRefusal('not_found'), { status: 404, code: 'not_found' }],
    [new AiPermissionRefusal('invalid'), { status: 400, code: 'ai_permission_required' }],
    [new Error('db down'), { status: 503, code: 'unavailable' }],
  ])('a refused or unavailable grant (%s) never examines', async (thrown, expected) => {
    const { deps, order } = liveDeps({ aiPermission: { version: VERSION, grant: async () => { throw thrown } } })
    expect(await requestCustomerExamination(deps, OWNER, DOC, { aiPermission: VERSION })).toEqual({ ok: false, ...expected })
    expect(order).toEqual([])
  })
  test('live examination wired without a permission port is unavailable (fail closed)', async () => {
    const { deps, order } = liveDeps({ aiPermission: undefined })
    expect(await requestCustomerExamination(deps, OWNER, DOC, { aiPermission: VERSION })).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(order).toEqual([])
  })
})

describe('the examination request body', () => {
  const req = (body?: string) => new Request('http://local.invalid/', { method: 'POST', ...(body === undefined ? {} : { body }) })
  test.each([
    [undefined, { ok: true, aiPermission: null }],
    ['', { ok: true, aiPermission: null }],
    ['{}', { ok: true, aiPermission: null }],
    [JSON.stringify({ ai_permission: VERSION }), { ok: true, aiPermission: VERSION }],
    [JSON.stringify({ ai_permission: VERSION, grant: 'x' }), { ok: false }],
    [JSON.stringify({ grant: 'x' }), { ok: false }],
    [JSON.stringify({ ai_permission: 1 }), { ok: false }],
    [JSON.stringify({ ai_permission: '' }), { ok: false }],
    [JSON.stringify({ ai_permission: 'x'.repeat(121) }), { ok: false }],
    ['[]', { ok: false }],
    ['not json', { ok: false }],
  ])('%p → %o', async (body, expected) => {
    expect(await examinationRequestBody(req(body))).toEqual(expected)
  })
  test('the earlier empty-body check still refuses any field, including the permission', async () => {
    expect(await emptyRequestBody(req('{}'))).toBe(true)
    expect(await emptyRequestBody(req(JSON.stringify({ ai_permission: VERSION })))).toBe(false)
  })
  test('the route handler parses the body and passes only the permission to the service', () => {
    const h = src('lib/creator-record-flow/route-handlers.ts')
    expect(h).toMatch(/examinationRequestBody\(request\)/)
    expect(h).toMatch(/requestCustomerExamination\(deps, userId, documentId, \{ aiPermission: body\.aiPermission \}\)/)
  })
})

describe('the browser asks separately for AI permission, only when live examination is offered', () => {
  const docs = [{ id: DOC, file_name: 'receipt.pdf', media_type: 'application/pdf', byte_size: 10, sha256: 'a'.repeat(64), created_at: '' }]
  const panel = (aiPermissionVersion?: string) => renderToStaticMarkup(
    <EvidencePanel consentVersion={EVIDENCE_CONSENT_DRAFT_VERSION} maxTools={1} attachments={[]} onAttachmentsChange={() => undefined}
      includeExaminations={false} onIncludeExaminationsChange={() => undefined} initialDocuments={docs} {...(aiPermissionVersion ? { aiPermissionVersion } : {})} />,
  )
  test('offered: a separate, unticked permission box, and Examine is disabled until it is ticked', () => {
    const html = panel(VERSION)
    expect(html).toContain('data-ai-permission')
    expect(html).toMatch(/AI model provider/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Examine<\/button>/)
  })
  test('not offered (replay): no AI permission box; the storage consent is unchanged; legal links shown', () => {
    const html = panel()
    expect(html).not.toContain('data-ai-permission')
    expect(html).toMatch(/href="\/privacy"/)
    expect(html).toMatch(/href="\/terms"/)
  })
  test('the panel sends the permission as the only body field', () => {
    expect(src('components/creator-record/EvidencePanel.tsx')).toMatch(/JSON\.stringify\(\{ ai_permission: props\.aiPermissionVersion \}\)/)
  })
  test('the page offers the permission only when live examination is offered (code locks AND approved policies)', () => {
    const page = src('app/creator-record/page.tsx')
    expect(page).toMatch(/customerLiveOffered\(\) \? \{ aiPermissionVersion: AI_EXAMINATION_PERMISSION_DRAFT_VERSION \}/)
    expect(src('lib/creator-record-flow/examination-customer.ts')).toMatch(/customerLiveOffered\(\) \? \{ live: productionCustomerLive, aiPermission: productionAiPermission \}/)
  })
})

// ── 8N: withdrawal control ──
describe('the withdrawal control', () => {
  test('before: explains the effect and offers a two-step withdrawal', () => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initialWithdrawnAt={null} />)
    expect(html).toContain(V2_CONSENT.withdraw)
    expect(html).toContain('data-consent-control')
    expect(html).not.toContain('data-consent-withdrawn')
  })
  test('after: shows the withdrawn, paused state and offers no way to re-grant', () => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initialWithdrawnAt="2026-11-08T10:00:00.000Z" />)
    expect(html).toContain('data-consent-withdrawn')
    expect(html).toMatch(/paused/)
    expect(html).not.toContain(V2_CONSENT.withdraw)
    expect(html).not.toMatch(/<button/)
  })
  test('uses the existing route with an explicit confirmation body', () => {
    const c = src('components/creator-record/ConsentWithdrawalControl.tsx')
    expect(c).toMatch(/fetch\('\/api\/creator-record-v2\/consent-withdrawal'/)
    expect(c).toMatch(/JSON\.stringify\(\{ confirm: true \}\)/)
  })
  test('the consent-state read fails closed', async () => {
    expect(await readConsentState({ retention: {} as never }, OWNER)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(await readConsentState({ retention: { consentState: async () => { throw new Error('x') } } as never }, OWNER)).toEqual({ ok: false, status: 503, code: 'unavailable' })
    expect(await readConsentState({ retention: { consentState: async () => ({ withdrawn: true, withdrawn_at: '2026-11-08T10:00:00.000Z' }) } as never }, OWNER)).toEqual({ ok: true, withdrawn: true, withdrawn_at: '2026-11-08T10:00:00.000Z' })
  })
  test('the route: GET reads the session user’s own state; POST still needs the confirmation; neither is behind the submissions stop', () => {
    const r = src('app/api/creator-record-v2/consent-withdrawal/route.ts')
    expect(r).toMatch(/export async function GET\(\)/)
    expect(r).toMatch(/readConsentState\(productionRetentionDeps\(\), userId\)/)
    expect(r).toMatch(/isConfirmation\(await readJsonBody\(req\)\)/)
    expect(r).not.toMatch(/CREATOR_RECORD_V2_SUBMISSIONS|hasPilotAccess|checkEvidenceGate/)
  })
  test('the dashboard shows it to Creator Record v2 creators only, and hides it when the state cannot be read', () => {
    expect(src('app/dashboard/page.tsx')).toMatch(/\{consentControl\.show && <ConsentWithdrawalControl initialWithdrawnAt=\{consentControl\.withdrawnAt\} \/>\}/)
    const helper = src('lib/creator-record-flow/consent-dashboard.ts')
    expect(helper).toMatch(/\.eq\('origin', 'owner_upload'\)/)
    expect(helper).toMatch(/catch \{\s*return \{ show: false \}/)
  })
})

// ── Dashboard states ──
describe('dashboard: paid orders awaiting a person, and paused records', () => {
  test.each([
    [{ payment_status: 'paid', artifact: 'none', fulfilment: 'manual_resolution' }, 'support_required'],
    [{ payment_status: 'paid', artifact: 'pending', fulfilment: 'manual_resolution' }, 'support_required'],
    [{ payment_status: 'paid', artifact: 'issued', fulfilment: 'manual_resolution' }, 'ready'],
    [{ payment_status: 'paid', artifact: 'none', fulfilment: 'automatic' }, 'preparing'],
    [{ payment_status: 'paid', artifact: 'none', fulfilment: 'none' }, 'preparing'],
    [{ payment_status: 'paid', artifact: 'none', fulfilment: 'unknown' }, 'unavailable'],
    [{ payment_status: 'paid', artifact: 'unknown', fulfilment: 'manual_resolution' }, 'unavailable'],
    [{ payment_status: 'unpaid', artifact: 'none', paused: true }, 'paused'],
    [{ payment_status: 'unpaid', artifact: 'none', paused: false }, 'awaiting_payment'],
    [{ payment_status: 'unpaid', artifact: 'none', paused: 'unknown' }, 'awaiting_payment'],
    [{ payment_status: 'refunded', artifact: 'none', fulfilment: 'manual_resolution', paused: true }, 'refunded'],
  ] as const)('%o → %s', (input, state) => {
    expect(v2DashboardState(input)).toBe(state)
  })
  test('the ledger status is reduced to "manual resolution or not" and never shown', () => {
    expect(v2FulfilmentView({ fulfillment_status: 'needs_reconciliation' }, false)).toBe('manual_resolution')
    for (const s of ['pending', 'in_progress', 'failed', 'completed']) expect(v2FulfilmentView({ fulfillment_status: s }, false)).toBe('automatic')
    expect(v2FulfilmentView(null, false)).toBe('none')
    expect(v2FulfilmentView({ fulfillment_status: 'needs_reconciliation' }, true)).toBe('unknown')
    for (const s of ['support_required', 'paused'] as const) {
      const v = v2DashboardView(s)
      expect(v.download).toBe(false)
      expect(`${v.badge} ${v.message}`).not.toMatch(/reconcil|ledger|fulfil|needs_|consent_withdrawn|retention|being prepared/i)
      expect(v.message).toMatch(/jd@superimmersive8\.com/)
    }
    expect(v2DashboardView('support_required').message).toBe(V2_DASHBOARD.support_required)
  })
  test('the detail page reads the fulfilment and pause state server-side and passes only the reduced values', () => {
    const page = src('app/dashboard/submissions/[id]/page.tsx')
    expect(page).toMatch(/v2FulfilmentView\(fulfilmentRow/)
    expect(page).toMatch(/rpc\('creator_record_v2_prepared_consent_paused'/)
  })
})

// ── Legal pages ──
describe('privacy and terms: infrastructure only, nothing published until approved', () => {
  const complete: ApprovedLegalDocument = { version: 'privacy-test-1', effective_date: '2026-12-01', approval_reference: 'ref', title: 'Privacy notice', paragraphs: ['Text.'] }
  test('no approved content exists, so the policies are not approved and the pages say "not available yet"', () => {
    expect(PRIVACY_NOTICE).toBeNull()
    expect(TERMS_OF_SERVICE).toBeNull()
    expect(legalPoliciesApproved()).toBe(false)
    const html = renderToStaticMarkup(<LegalDocumentPage doc={null} fallbackTitle="Privacy notice" />)
    expect(html).toContain('data-legal-unavailable')
    expect(html).toContain('This document is not available yet.')
  })
  test('both documents must be complete; one is not enough', () => {
    expect(legalPoliciesApproved({ privacy: complete, terms: complete })).toBe(true)
    expect(legalPoliciesApproved({ privacy: complete, terms: null })).toBe(false)
    expect(legalPoliciesApproved({ privacy: { ...complete, paragraphs: [] }, terms: complete })).toBe(false)
    expect(legalPoliciesApproved({ privacy: { ...complete, approval_reference: ' ' }, terms: complete })).toBe(false)
    expect(legalPageContent({ ...complete, version: 'Not A Version' })).toEqual({ available: false })
    expect(renderToStaticMarkup(<LegalDocumentPage doc={complete} fallbackTitle="x" />)).toContain('Version privacy-test-1')
  })
  test('real documents and new live examination also require the approved policies (fail closed)', () => {
    expect(src('lib/creator-record-flow/evidence-production.ts')).toMatch(/realDocumentsPermitted: EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED && legalPoliciesApproved\(\)/)
    expect(src('lib/creator-record-flow/live-offer.ts')).toMatch(/customerLiveOffered = \(\): boolean => customerLiveEnabledInThisBuild\(\) && legalPoliciesApproved\(\)/)
    // The page asks the small offer module, never the examination wiring (so it reaches no examination port).
    expect(src('app/creator-record/page.tsx')).toMatch(/from '@\/lib\/creator-record-flow\/live-offer'/)
    expect(src('app/creator-record/page.tsx')).not.toMatch(/examination-customer/)
  })
  test('the pages are public (outside the auth middleware) and not indexed while unavailable', () => {
    expect(src('middleware.ts')).not.toMatch(/privacy|terms/)
    for (const p of ['app/privacy/page.tsx', 'app/terms/page.tsx']) expect(src(p)).toMatch(/robots: \{ index: false, follow: false \}/)
  })
})

describe('no commercial gate is opened', () => {
  test('locks and stops unchanged', () => {
    expect(src('lib/creator-record/evidence-intake/contract.ts')).toMatch(/export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = false/)
    expect(src('lib/creator-record/live-examination/controls.ts')).toMatch(/export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false/)
    expect(src('lib/creator-record/live-examination/controls.ts')).toMatch(/export const CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false/)
    expect(src('lib/creator-record/customer-flow/approved-inputs.ts')).toMatch(/CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'stopped'/)
    expect(src('lib/creator-record-artifacts/config.ts')).toMatch(/CREATOR_RECORD_V2_ISSUANCE: V2IssuanceMode = 'stopped'/)
  })
})
