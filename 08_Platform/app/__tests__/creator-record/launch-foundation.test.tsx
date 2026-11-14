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
import { EXAM_TEXT } from '@/lib/creator-record-flow/examination-ui'
import { legalPageContent, legalPoliciesApproved, PRIVACY_NOTICE, TERMS_OF_SERVICE, type ApprovedLegalDocument } from '@/lib/legal/policies'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { ConsentWithdrawalControl } from '@/components/creator-record/ConsentWithdrawalControl'
import { EvidencePanel } from '@/components/creator-record/EvidencePanel'
import { readConsentState } from '@/lib/creator-record/evidence-intake/retention'
import { consentControlState } from '@/lib/creator-record-flow/consent-dashboard'
import { requestConsentWithdrawal } from '@/lib/creator-record-flow/consent-withdrawal-request'
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
    // CR-V2-MVP-LEGAL-CONTENT-6: the approved R11 label for the examine button.
    expect(html).toMatch(new RegExp('<button[^>]*disabled=""[^>]*>' + EXAM_TEXT.examine + '</button>'))
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
    // CR-V2-SCHEMA8-PATH-1 (E7): the permission asked for is the current one, bound to the approved policy versions.
    expect(page).toMatch(/const aiPermissionVersion = customerLiveOffered\(\) \? aiExaminationPermissionVersion\(\) : null/)
    expect(src('lib/creator-record-flow/examination-customer.ts')).toMatch(/customerLiveOffered\(\) && permission !== null \? \{ live: productionCustomerLive, aiPermission: productionAiPermission\(permission\) \}/)
  })
})

// ── 8N: withdrawal control ──
describe('the withdrawal control', () => {
  test('before: explains the effect and offers a two-step withdrawal', () => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initial={{ state: 'active' }} />)
    expect(html).toContain(V2_CONSENT.withdraw)
    expect(html).toContain('data-consent-control')
    expect(html).not.toContain('data-consent-withdrawn')
    expect(html).not.toContain('data-consent-unknown')
  })
  test('after: shows the withdrawn, paused state and offers no way to re-grant', () => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initial={{ state: 'withdrawn', withdrawnAt: '2026-11-08T10:00:00.000Z' }} />)
    expect(html).toContain('data-consent-withdrawn')
    expect(html).toMatch(/paused/)
    expect(html).not.toContain(V2_CONSENT.withdraw)
    expect(html).not.toMatch(/<button/)
  })
  test('uses the existing route with an explicit confirmation body', () => {
    const c = src('components/creator-record/ConsentWithdrawalControl.tsx')
    expect(c).toMatch(/requestConsentWithdrawal\(/)
    const r = src('lib/creator-record-flow/consent-withdrawal-request.ts')
    expect(r).toMatch(/CONSENT_WITHDRAWAL_PATH = '\/api\/creator-record-v2\/consent-withdrawal'/)
    expect(r).toMatch(/JSON\.stringify\(\{ confirm: true \}\)/)
    expect(r).not.toMatch(/@\/lib\/supabase|server-only/)
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
  test('the dashboard renders the control from the helper and tells it whether the creator has a v2 submission', () => {
    const page = src('app/dashboard/page.tsx')
    expect(page).toMatch(/\{consentControl\.show && <ConsentWithdrawalControl initial=\{consentControl\.initial\} \/>\}/)
    expect(page).toMatch(/consentControlState\(user\.id, \{ hasV2Submission: submissions\.some\(\(s\) => s\.creator_record_product === 'v2'\) \}\)/)
    expect(src('lib/creator-record-flow/consent-dashboard.ts')).toMatch(/\.eq\('origin', 'owner_upload'\)/)
  })
})

// ── CORRECTIONS-1: the withdrawal stays available when the state cannot be read ──
type DbResult = { data?: unknown; error?: unknown; count?: unknown }
type Behaviour = DbResult | 'throw' | 'hang'
const LEDGER_PRESENT = { data: [], error: null }
const LEDGER_WITH_RECORD = { data: [{ id: 7 }], error: null }
function fakeDb(state: Behaviour, docs: Behaviour, ledger: Behaviour = LEDGER_PRESENT) {
  const calls: string[] = []
  const settle = (b: Behaviour): PromiseLike<DbResult> => {
    if (b === 'throw') return Promise.reject(new Error('db down'))
    if (b === 'hang') return new Promise(() => undefined)
    return Promise.resolve(b)
  }
  const chainFor = (b: Behaviour, t: string) => {
    const chain = {
      select: (cols: string, opts: unknown) => { calls.push(`select:${t}:${cols}:${JSON.stringify(opts)}`); return chain },
      eq: (c: string, v: unknown) => { calls.push(`eq:${t}:${c}=${String(v)}`); return chain },
      limit: (n: number) => { calls.push(`limit:${t}:${n}`); return chain },
      then: (ok: (v: DbResult) => unknown, bad?: (e: unknown) => unknown) => settle(b).then(ok, bad),
    }
    return chain
  }
  const db = {
    rpc: (fn: string, args: unknown) => { calls.push(`rpc:${fn}:${JSON.stringify(args)}`); return settle(state) },
    from: (t: string) => { calls.push(`from:${t}`); return chainFor(t === 'creator_record_v2_consent_withdrawals' ? ledger : docs, t) },
  }
  return { db: db as never, calls }
}
const WITHDRAWN_AT = '2026-11-08T10:00:00.000Z'
const NOT_WITHDRAWN = { data: [{ withdrawn: false, withdrawn_at: null }], error: null }
const WITHDRAWN = { data: [{ withdrawn: true, withdrawn_at: WITHDRAWN_AT }], error: null }
const HAS_DOCS = { count: 2, error: null }
const NO_DOCS = { count: 0, error: null }
const DOCS_ERROR = { count: null, error: { message: 'x' } }

describe('consentControlState: read failures never remove the withdrawal from a v2 creator', () => {
  test.each<[string, Behaviour, Behaviour, boolean, unknown]>([
    // Known states (unchanged behaviour).
    ['not withdrawn, with documents', NOT_WITHDRAWN, HAS_DOCS, false, { show: true, initial: { state: 'active' } }],
    ['not withdrawn, no documents, no v2 submission (V1 customer)', NOT_WITHDRAWN, NO_DOCS, false, { show: false }],
    ['withdrawn', WITHDRAWN, NO_DOCS, false, { show: true, initial: { state: 'withdrawn', withdrawnAt: WITHDRAWN_AT } }],
    // The state read fails.
    ['state RPC error, v2 submission', { data: null, error: { code: '42883', message: 'function does not exist' } }, DOCS_ERROR, true, { show: true, initial: { state: 'unknown' } }],
    ['state RPC throws, v2 submission', 'throw', 'throw', true, { show: true, initial: { state: 'unknown' } }],
    ['state RPC error, no submission but documents', { data: null, error: { message: 'x' } }, HAS_DOCS, false, { show: true, initial: { state: 'unknown' } }],
    ['state RPC error, no sign of v2 use (V1 customer)', { data: null, error: { message: 'x' } }, NO_DOCS, false, { show: false }],
    // Unexpected or malformed responses.
    ['empty result', { data: [], error: null }, HAS_DOCS, true, { show: true, initial: { state: 'unknown' } }],
    ['null data', { data: null, error: null }, HAS_DOCS, true, { show: true, initial: { state: 'unknown' } }],
    ['withdrawn is not a boolean', { data: [{ withdrawn: 'yes', withdrawn_at: WITHDRAWN_AT }], error: null }, HAS_DOCS, true, { show: true, initial: { state: 'unknown' } }],
    ['withdrawn without a time (never shown as "not withdrawn")', { data: [{ withdrawn: true, withdrawn_at: null }], error: null }, HAS_DOCS, false, { show: true, initial: { state: 'unknown' } }],
    ['withdrawn with an unparseable time', { data: [{ withdrawn: true, withdrawn_at: 'soon' }], error: null }, HAS_DOCS, true, { show: true, initial: { state: 'unknown' } }],
    ['a scalar instead of a row', { data: 'ok', error: null }, HAS_DOCS, true, { show: true, initial: { state: 'unknown' } }],
    // The document read fails after a known "not withdrawn".
    ['not withdrawn, documents unreadable, v2 submission', NOT_WITHDRAWN, DOCS_ERROR, true, { show: true, initial: { state: 'active' } }],
    ['not withdrawn, documents unreadable, no v2 submission', NOT_WITHDRAWN, DOCS_ERROR, false, { show: false }],
    ['not withdrawn, malformed count, v2 submission', NOT_WITHDRAWN, { count: 'many', error: null }, true, { show: true, initial: { state: 'active' } }],
  ])('%s (withdrawal ledger readable)', async (_label, state, docs, hasV2Submission, expected) => {
    const { db } = fakeDb(state, docs)
    expect(await consentControlState(OWNER, { hasV2Submission, db })).toEqual(expected)
  })

  test('a read that does not answer in time is treated as unreadable (never hangs the dashboard)', async () => {
    const { db } = fakeDb('hang', 'hang')
    const started = Date.now()
    expect(await consentControlState(OWNER, { hasV2Submission: true, db, timeoutMs: 20 })).toEqual({ show: true, initial: { state: 'unknown' } })
    expect(Date.now() - started).toBeLessThan(2_000)
    const v1 = fakeDb('hang', 'hang')
    expect(await consentControlState(OWNER, { hasV2Submission: false, db: v1.db, timeoutMs: 20 })).toEqual({ show: false })
  })

  test('reads only the session user’s own state and documents (no capability probe when the state is known)', async () => {
    const { db, calls } = fakeDb(NOT_WITHDRAWN, HAS_DOCS)
    await consentControlState(OWNER, { hasV2Submission: false, db })
    expect(calls.filter((c) => c.startsWith('rpc:') || c.startsWith('from:'))).toEqual([`rpc:creator_record_v2_consent_state:${JSON.stringify({ p_user_id: OWNER })}`, 'from:creator_record_v2_documents'])
  })
})

describe('consentControlState: whether the online withdrawal can work decides what an unreadable state offers', () => {
  const MISSING_FN = { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.creator_record_v2_consent_state(p_user_id) in the schema cache' } }
  const TRANSIENT = { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }
  const run = (state: Behaviour, ledger: Behaviour, hasV2Submission = true, docs: Behaviour = DOCS_ERROR) =>
    consentControlState(OWNER, { hasV2Submission, db: fakeDb(state, docs, ledger).db, timeoutMs: 20 })

  test.each<[string, Behaviour]>([
    ['PostgREST: table not in schema cache (PGRST205)', { count: null, error: { code: 'PGRST205', message: 'Could not find the table' } }],
    ['PostgreSQL: undefined table (42P01)', { count: null, error: { code: '42P01', message: 'relation does not exist' } }],
  ])('withdrawal backend confirmed missing — %s → support-only "unavailable"', async (_l, ledger) => {
    expect(await run(MISSING_FN, ledger)).toEqual({ show: true, initial: { state: 'unavailable' } })
    expect(await run({ data: null, error: { code: '42883', message: 'function does not exist' } }, ledger)).toEqual({ show: true, initial: { state: 'unavailable' } })
  })

  test('20261111 present but 20261112 missing (status function missing, ledger readable) → withdrawal still offered', async () => {
    expect(await run(MISSING_FN, LEDGER_PRESENT)).toEqual({ show: true, initial: { state: 'unknown' } })
  })

  test('transient status failure with the backend present → the usable withdrawal fallback is kept', async () => {
    expect(await run(TRANSIENT, LEDGER_PRESENT)).toEqual({ show: true, initial: { state: 'unknown' } })
    expect(await run('throw', LEDGER_WITH_RECORD)).toEqual({ show: true, initial: { state: 'unknown' } })
  })

  test.each<[string, Behaviour]>([
    ['the probe fails transiently', { count: null, error: { code: '57014', message: 'timeout' } }],
    ['the probe has no code', { count: null, error: { message: 'fetch failed' } }],
    ['the probe throws', 'throw'],
    ['the probe does not answer in time', 'hang'],
    ['the probe returns no row array', { data: null, error: null }],
    ['the probe answers like a HEAD 404 (no error, no data, status 204)', { data: null, error: null, count: null }],
    ['a permission error (not a missing object)', { count: null, error: { code: '42501', message: 'permission denied' } }],
  ])('capability cannot be established (%s) → support-only "unconfirmed", online withdrawal not promised', async (_l, ledger) => {
    expect(await run(TRANSIENT, ledger)).toEqual({ show: true, initial: { state: 'unconfirmed' } })
  })

  test('no sign of v2 use: no probe and no control, whatever the backend', async () => {
    const { db, calls } = fakeDb(MISSING_FN, NO_DOCS, { count: null, error: { code: '42P01', message: 'x' } })
    expect(await consentControlState(OWNER, { hasV2Submission: false, db })).toEqual({ show: false })
    expect(calls).not.toContain('from:creator_record_v2_consent_withdrawals')
  })

  test('the probe reads at most one id of the session user’s own ledger rows (a GET, never a head-only count)', async () => {
    const { db, calls } = fakeDb(TRANSIENT, DOCS_ERROR)
    await consentControlState(OWNER, { hasV2Submission: true, db })
    expect(calls).toContain('select:creator_record_v2_consent_withdrawals:id:undefined')
    expect(calls).toContain(`eq:creator_record_v2_consent_withdrawals:user_id=${OWNER}`)
    expect(calls).toContain('limit:creator_record_v2_consent_withdrawals:1')
    expect(src('lib/creator-record-flow/consent-dashboard.ts')).not.toMatch(/head: true\s*\}\)\.eq\('user_id', userId\)\s*,|consent_withdrawals'\)\.select\('id', \{ count/)
  })
})

describe('Check 2: the notice concerns only creators with documents or a withdrawal record', () => {
  const run = (hasV2Submission: boolean, docs: Behaviour, ledger: Behaviour) =>
    consentControlState(OWNER, { hasV2Submission, db: fakeDb({ data: null, error: { code: 'PGRST202', message: 'x' } }, docs, ledger).db, timeoutMs: 20 })
  const LEDGER_MISSING = { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }

  test('an empty V2 questionnaire alone (no documents, no withdrawal record) shows nothing, backend present or missing', async () => {
    expect(await run(true, NO_DOCS, LEDGER_PRESENT)).toEqual({ show: false })
    expect(await run(true, NO_DOCS, LEDGER_MISSING)).toEqual({ show: false })
    expect(await run(true, NO_DOCS, 'hang')).toEqual({ show: false })
  })
  test('documents → shown (support-only when the backend is missing)', async () => {
    expect(await run(false, HAS_DOCS, LEDGER_MISSING)).toEqual({ show: true, initial: { state: 'unavailable' } })
    expect(await run(true, HAS_DOCS, LEDGER_PRESENT)).toEqual({ show: true, initial: { state: 'unknown' } })
  })
  test('a withdrawal record without documents → shown with the withdrawal still offered', async () => {
    expect(await run(true, NO_DOCS, LEDGER_WITH_RECORD)).toEqual({ show: true, initial: { state: 'unknown' } })
    expect(await run(false, DOCS_ERROR, LEDGER_WITH_RECORD)).toEqual({ show: true, initial: { state: 'unknown' } })
  })
  test('documents genuinely unreadable: a v2 submission keeps it shown (fail closed); without one, nothing', async () => {
    expect(await run(true, DOCS_ERROR, LEDGER_MISSING)).toEqual({ show: true, initial: { state: 'unavailable' } })
    expect(await run(true, 'throw', 'hang')).toEqual({ show: true, initial: { state: 'unconfirmed' } })
    expect(await run(false, DOCS_ERROR, LEDGER_PRESENT)).toEqual({ show: false })
  })
  test('V1 customer (no v2 submission, no documents): unchanged dashboard and no ledger read', async () => {
    const { db, calls } = fakeDb({ data: null, error: { code: 'PGRST202', message: 'x' } }, NO_DOCS, LEDGER_WITH_RECORD)
    expect(await consentControlState(OWNER, { hasV2Submission: false, db })).toEqual({ show: false })
    expect(calls).not.toContain('from:creator_record_v2_consent_withdrawals')
  })
})

describe('Check 1: the capability probe against the real postgrest-js client', () => {
  // A minimal fetch that answers like PostgREST: a missing table is 404 with a JSON error body, except on HEAD (no body).
  type Answer = 'present-empty' | 'present-record' | 'missing'
  const fakeFetch = (answer: Answer, seen: string[]) => async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    seen.push(`${method} ${String(input)}`)
    const missing = answer === 'missing'
    const body = method === 'HEAD' ? '' : missing ? JSON.stringify({ code: 'PGRST205', details: null, hint: null, message: "Could not find the table 'public.creator_record_v2_consent_withdrawals' in the schema cache" }) : answer === 'present-record' ? '[{"id":7}]' : '[]'
    const status = missing ? 404 : 200
    const headers = new Map<string, string>([['content-type', 'application/json'], ['content-range', missing ? '' : answer === 'present-record' ? '0-0/1' : '*/0']])
    return { ok: status < 300, status, statusText: missing ? 'Not Found' : 'OK', headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null }, text: async () => body } as unknown as Response
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PostgrestClient } = require('@supabase/postgrest-js') as typeof import('@supabase/postgrest-js')
  const client = (answer: Answer, seen: string[]) => new PostgrestClient('http://postgrest.invalid', { fetch: fakeFetch(answer, seen) as typeof fetch })
  const stateFails = { rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'x' } }) }
  const dbWith = (answer: Answer, seen: string[]) => {
    const c = client(answer, seen)
    return { rpc: stateFails.rpc, from: (t: string) => (t === 'creator_record_v2_documents' ? { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ count: 1, error: null }) }) }) } : c.from(t)) } as never
  }

  test('why not HEAD: postgrest-js reports a HEAD 404 for a missing table as no error and no count (indistinguishable)', async () => {
    const r = await client('missing', []).from('creator_record_v2_consent_withdrawals').select('id', { count: 'exact', head: true }).eq('user_id', OWNER)
    expect(r.error).toBeNull()
    expect(r.count).toBeNull()
    expect(r.status).toBe(204)
  })
  test('missing table → GET carries the PGRST205 code → support-only "unavailable"', async () => {
    const seen: string[] = []
    expect(await consentControlState(OWNER, { hasV2Submission: true, db: dbWith('missing', seen) })).toEqual({ show: true, initial: { state: 'unavailable' } })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatch(/^GET http:\/\/postgrest\.invalid\/creator_record_v2_consent_withdrawals\?select=id&user_id=eq\.aaaaaaaa-2222-4333-8444-555555555555&limit=1$/)
  })
  test('present and EMPTY ledger is told apart from a missing one → withdrawal offered', async () => {
    expect(await consentControlState(OWNER, { hasV2Submission: true, db: dbWith('present-empty', []) })).toEqual({ show: true, initial: { state: 'unknown' } })
  })
  test('present with a record → withdrawal offered', async () => {
    expect(await consentControlState(OWNER, { hasV2Submission: true, db: dbWith('present-record', []) })).toEqual({ show: true, initial: { state: 'unknown' } })
  })

  test.each(['unavailable', 'unconfirmed'] as const)('rendering %s: support contact only, no button, no promise of online withdrawal', (state) => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initial={{ state }} />)
    expect(html).toContain(`data-consent-support-only="${state}"`)
    expect(html).toContain('jd@superimmersive8.com')
    expect(html).not.toMatch(/<button/)
    expect(html).not.toContain(V2_CONSENT.withdraw)
    expect(html).not.toMatch(/You can still withdraw|withdraw permission here/i)
    expect(html).not.toContain('data-consent-withdrawn')
  })

  test('rendering unknown (backend present): the withdrawal button is still offered', () => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initial={{ state: 'unknown' }} />)
    expect(html).toContain(V2_CONSENT.withdraw)
    expect(html).not.toContain('data-consent-support-only')
  })

  test('the unknown state still offers the same two-step withdrawal, and says the status cannot be shown', () => {
    const html = renderToStaticMarkup(<ConsentWithdrawalControl initial={{ state: 'unknown' }} />)
    expect(html).toContain('data-consent-unknown')
    expect(html).toContain(V2_CONSENT.unknown)
    expect(html).toContain(V2_CONSENT.withdraw)
    expect(html).not.toContain('data-consent-withdrawn')
    expect(html).not.toContain(V2_CONSENT.active)
  })

  test('display only: the dashboard helper authorizes nothing and is not used by any examination path', () => {
    const helper = src('lib/creator-record-flow/consent-dashboard.ts')
    expect(helper).not.toMatch(/grant_ai_examination_permission|examin(e|ation)\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/)
    for (const f of ['lib/creator-record-flow/examination-customer.ts', 'lib/creator-record/customer-flow/examination.ts', 'lib/creator-record-flow/route-handlers.ts'])
      expect(src(f)).not.toMatch(/consent-dashboard|consentControlState/)
  })
})

describe('requestConsentWithdrawal: the outcome is reported only as far as it is known', () => {
  type Res = { ok: boolean; status: number; json: () => Promise<unknown> }
  const res = (status: number, body: unknown, jsonThrows = false): Res => ({ ok: status >= 200 && status < 300, status, json: async () => { if (jsonThrows) throw new Error('bad json'); return body } })
  const recorder = (r: Res | 'throw' | 'hang') => {
    const seen: { input: string; init: RequestInit }[] = []
    const f = async (input: string, init: RequestInit) => {
      seen.push({ input, init })
      if (r === 'throw') throw new TypeError('Failed to fetch')
      if (r === 'hang') return new Promise<Res>(() => undefined)
      return r
    }
    return { f, seen }
  }

  test('confirmed: the server returned the withdrawal time; the same idempotent POST and body as before', async () => {
    const { f, seen } = recorder(res(200, { consent_withdrawal: { result: 'created', withdrawn_at: WITHDRAWN_AT } }))
    expect(await requestConsentWithdrawal(f)).toEqual({ kind: 'withdrawn', withdrawnAt: WITHDRAWN_AT })
    expect(seen).toHaveLength(1)
    expect(seen[0].input).toBe('/api/creator-record-v2/consent-withdrawal')
    expect(seen[0].init.method).toBe('POST')
    expect(seen[0].init.body).toBe(JSON.stringify({ confirm: true }))
  })
  test('a repeat withdrawal ("existing") is confirmed the same way', async () => {
    const { f } = recorder(res(200, { consent_withdrawal: { result: 'existing', withdrawn_at: WITHDRAWN_AT } }))
    expect(await requestConsentWithdrawal(f)).toEqual({ kind: 'withdrawn', withdrawnAt: WITHDRAWN_AT })
  })
  test('401: refused before anything was done → signed out', async () => {
    expect(await requestConsentWithdrawal(recorder(res(401, { error: 'Unauthorized' })).f)).toEqual({ kind: 'signed_out' })
  })
  test.each<[string, Res | 'throw']>([
    ['a server error', res(500, { error: 'internal' })],
    ['unavailable', res(503, { code: 'unavailable' })],
    ['a bad request', res(400, { code: 'invalid_request' })],
    ['a network error', 'throw'],
    ['200 with an unreadable body', res(200, null, true)],
    ['200 without a withdrawal time', res(200, { consent_withdrawal: { result: 'created' } })],
    ['200 with an unparseable time', res(200, { consent_withdrawal: { withdrawn_at: 'later' } })],
    ['200 with an unexpected body', res(200, { ok: true })],
  ])('%s → uncertain (never "withdrawn", never "nothing changed")', async (_l, r) => {
    expect(await requestConsentWithdrawal(recorder(r).f)).toEqual({ kind: 'uncertain' })
  })
  test('a request that does not answer in time is aborted and reported as uncertain', async () => {
    const { f, seen } = recorder('hang')
    expect(await requestConsentWithdrawal(f, 20)).toEqual({ kind: 'uncertain' })
    expect((seen[0].init.signal as AbortSignal | undefined)?.aborted).toBe(true)
  })
  test('the wording for an uncertain outcome says it could not be confirmed and that trying again is harmless', () => {
    expect(V2_CONSENT.failed).toMatch(/could not confirm whether your withdrawal was recorded/i)
    expect(V2_CONSENT.failed).toMatch(/try again/i)
    expect(V2_CONSENT.failed).toMatch(/same effect as withdrawing once/i)
    for (const s of Object.values(V2_CONSENT)) expect(s).not.toMatch(/nothing was changed/i)
    expect(src('components/creator-record/ConsentWithdrawalControl.tsx')).toMatch(/outcome\.kind === 'signed_out' \? V2_CONSENT\.signed_out : V2_CONSENT\.failed/)
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
  test('the founder-approved documents are published; a missing document still renders "not available yet"', () => {
    // CR-V2-MVP-LEGAL-CONTENT-6 (JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109).
    expect(PRIVACY_NOTICE?.approval_reference).toBe('JD-CR-V2-MVP-LEGAL-CONTENT-5-20261109')
    expect(TERMS_OF_SERVICE?.approval_reference).toBe('JD-CR-V2-MVP-RELEASE-AUTHORIZATION-1-20261114 terms') // CR-V2-MVP-RELEASE-AUTHORIZATION-1
    expect(legalPoliciesApproved()).toBe(true)
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
    expect(src('lib/creator-record/evidence-intake/contract.ts')).toMatch(/export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = true/) // CR-V2-MVP-PROD-UAT-ACTIVATION-1
    expect(src('lib/creator-record/live-examination/controls.ts')).toMatch(/export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = true/)
    expect(src('lib/creator-record/live-examination/controls.ts')).toMatch(/export const CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = true/)
    expect(src('lib/creator-record/customer-flow/approved-inputs.ts')).toMatch(/CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'open'/)
    expect(src('lib/creator-record-artifacts/config.ts')).toMatch(/CREATOR_RECORD_V2_ISSUANCE: V2IssuanceMode = 'enabled'/)
  })
})
