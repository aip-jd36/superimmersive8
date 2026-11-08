/**
 * CR-V2-MVP-M3 — private delivery of a v2 artifact, the draft customer wording lock, the dashboard
 * state derivation and the purchase route.
 */

const sessionUserId = jest.fn()
jest.mock('@/lib/creator-record-flow/http', () => {
  const actual = jest.requireActual('@/lib/creator-record-flow/http')
  return { ...actual, sessionUserId: () => sessionUserId() }
})
const startPurchase = jest.fn()
jest.mock('@/lib/creator-record/customer-flow/purchase', () => ({ startPurchase: (...a: unknown[]) => startPurchase(...a) }))
const purchaseDeps = { marker: 'deps' }
jest.mock('@/lib/creator-record-flow/production', () => ({ productionPurchaseDeps: () => purchaseDeps }))

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { deliverCreatorRecordPdf, type DeliveryPorts } from '@/lib/creator-record-artifacts/deliver'
import { sha256Hex, type ArtifactRow } from '@/lib/creator-record-artifacts/issue'
import { CREATOR_RECORD_V2_GENERATOR_VERSION } from '@/lib/creator-record-artifacts/renderers'
import * as wording from '@/lib/creator-record-flow/wording'
import { EXAM_LIVE_TEXT } from '@/lib/creator-record-flow/examination-ui'
import { v2DashboardState, v2DashboardView, v2ListBadge } from '@/lib/creator-record-flow/dashboard'
import { POST as purchase } from '@/app/api/creator-record-v2/prepared/[id]/purchase/route'

const APP = path.resolve(__dirname, '../..')
const OWNER = 'owner-1'
const SUB = '33333333-3333-4333-8333-333333333333'

describe('private delivery of a v2 artifact (unchanged delivery path)', () => {
  const bytes = new TextEncoder().encode('%PDF-1.7 synthetic v2')
  const artifact = (over: Partial<ArtifactRow> = {}): ArtifactRow => ({
    id: 'a1', submission_id: SUB, record_id: 'CR-2026-33333333', attempt_id: 'att', storage_path: `${SUB}/att.pdf`, sha256: sha256Hex(bytes),
    byte_size: bytes.byteLength, generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION, status: 'issued', uat: false, issued_at: '2026-11-01T00:00:00Z', ...over,
  })
  const ports = (over: Partial<DeliveryPorts> = {}): DeliveryPorts => ({
    currentUserId: async () => OWNER, submissionOwner: async () => OWNER, isAdmin: async () => false,
    findArtifact: async () => artifact(), getObject: async () => bytes, legacyReferences: async () => [], getLegacyObject: async () => null, log: () => undefined, ...over,
  })

  test('the owner gets the exact bytes, privately and uncached', async () => {
    const res = await deliverCreatorRecordPdf(SUB, ports())
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store, max-age=0')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes)
  })

  test('anonymous 401; anyone else 404; pending 409; altered bytes 500', async () => {
    expect((await deliverCreatorRecordPdf(SUB, ports({ currentUserId: async () => null }))).status).toBe(401)
    expect((await deliverCreatorRecordPdf(SUB, ports({ currentUserId: async () => 'someone-else' }))).status).toBe(404)
    expect((await deliverCreatorRecordPdf(SUB, ports({ findArtifact: async () => artifact({ status: 'pending', issued_at: null }) }))).status).toBe(409)
    expect((await deliverCreatorRecordPdf(SUB, ports({ getObject: async () => new TextEncoder().encode('%PDF-1.7 altered') }))).status).toBe(500)
  })
})

describe('draft customer wording (PRD wording lock)', () => {
  const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [])
  // CR-V2-MVP-LAUNCH-FOUNDATION-1: the withdrawal control's wording is held to the same lock.
  const all = [wording.V2_CHECKOUT_COPY, wording.V2_READY_EMAIL, wording.V2_DASHBOARD, wording.V2_REVIEW_PAGE, wording.V2_CONSENT, EXAM_LIVE_TEXT].flatMap(strings)  // CR-V2-SCHEMA8-PATH-1 (E3): the live examination wording too
  // Same lock as the customer PDF templates: only negated "clearance" is allowed.
  const BANNED = /\b(cleared|clearance|compliant|certified|certification|verified|verification|approved|guarantee[sd]?)\b|licensed to|permitted to|safe to|reviewed by|review date|last reviewed/i
  const ALLOWED = [/\bnot (a |an )?(legal advice, a |commercial )?clearance\b/gi, /\bnot legal advice, a (commercial )?clearance\b/gi, /\bhuman-reviewed SI8 (Commercial Assurance )?[Aa]ssessment\b/g]

  test('is marked as a draft pending M0', () => {
    expect(wording.V2_WORDING_STATUS).toMatch(/DRAFT/)
    expect(readFileSync(path.join(APP, 'lib/creator-record-flow/wording.ts'), 'utf8')).toMatch(/DRAFT — PENDING M0 WORDING APPROVAL/)
  })

  test('no clearance, certification, verification, approval or review claim; no date', () => {
    expect(all.length).toBeGreaterThan(15)
    for (const s of all) {
      let t = s
      for (const a of ALLOWED) t = t.replace(a, '')
      expect([s, BANNED.test(t)]).toEqual([s, false])
      expect([s, /\b20\d\d\b|\d{4}-\d{2}-\d{2}/.test(s)]).toEqual([s, false])
    }
  })

  test('checkout, email and dashboard each say it is self-declared and not legal advice or a clearance', () => {
    for (const s of [wording.V2_CHECKOUT_COPY.description, wording.V2_READY_EMAIL.limits, wording.V2_DASHBOARD.nature]) {
      expect(s).toMatch(/not legal advice/i)
      expect(s).toMatch(/clearance/i)
    }
    expect(wording.V2_CHECKOUT_COPY.name).toMatch(/self-declared/i)
    expect(wording.V2_READY_EMAIL.nature).toMatch(/did not check your answers/i)
  })

  test('the v2 email uses only this wording and escapes it; no review date is printed', () => {
    const src = readFileSync(path.join(APP, 'lib/emails.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function sendCreatorRecordV2ReadyPaymentEmail'), src.indexOf('export async function sendCertifiedPaymentReceivedEmail'))
    expect(fn).toMatch(/subject: V2_READY_EMAIL\.subject/)
    for (const k of ['intro', 'nature', 'limits', 'cta']) expect(fn).toContain(`escapeHtml(V2_READY_EMAIL.${k})`)
    expect(fn).not.toMatch(/review|SELF-ATTESTED|ASSESSMENT_NOTICE|Date|toISOString/)
  })
})

describe('dashboard state', () => {
  test.each([
    [{ payment_status: 'unpaid', artifact: 'none' }, 'awaiting_payment'],
    [{ payment_status: null, artifact: 'none' }, 'awaiting_payment'],
    [{ payment_status: 'paid', artifact: 'none' }, 'preparing'],
    [{ payment_status: 'paid', artifact: 'pending' }, 'preparing'],
    [{ payment_status: 'paid', artifact: 'issued' }, 'ready'],
    [{ payment_status: 'paid', artifact: 'unknown' }, 'unavailable'],
    [{ payment_status: 'refunded', artifact: 'issued' }, 'refunded'],
    [{ payment_status: 'unpaid', artifact: 'issued' }, 'awaiting_payment'],
  ] as const)('%o → %s', (input, state) => {
    expect(v2DashboardState(input)).toBe(state)
  })

  test('only "ready" offers a download; nothing says approved', () => {
    for (const s of ['awaiting_payment', 'preparing', 'ready', 'refunded', 'unavailable', 'support_required', 'paused'] as const) {
      const v = v2DashboardView(s)
      expect(v.download).toBe(s === 'ready')
      expect(`${v.badge} ${v.message}`).not.toMatch(/approved/i)
    }
    for (const p of ['paid', 'unpaid', 'refunded', null]) expect(v2ListBadge(p)).not.toMatch(/approved|ready/i)
  })

  test('the detail page shows the v2 view for a v2 submission, before any v1 section', () => {
    const src = readFileSync(path.join(APP, 'app/dashboard/submissions/[id]/page.tsx'), 'utf8')
    const branch = src.indexOf("creator_record_product === 'v2'")
    expect(branch).toBeGreaterThan(-1)
    expect(branch).toBeLessThan(src.indexOf('Production Overview'))
    expect(branch).toBeLessThan(src.indexOf('<StatusBanner'))
  })
})

describe('POST /api/creator-record-v2/prepared/[id]/purchase', () => {
  const ID = '44444444-4444-4444-8444-444444444444'
  beforeEach(() => jest.clearAllMocks())

  test('401 without a session; nothing is called', async () => {
    sessionUserId.mockResolvedValue(null)
    expect((await purchase({} as Request, { params: { id: ID } })).status).toBe(401)
    expect(startPurchase).not.toHaveBeenCalled()
  })

  test('passes only the session user and the path id; returns the submission id', async () => {
    sessionUserId.mockResolvedValue(OWNER)
    startPurchase.mockResolvedValue({ ok: true, submission_id: SUB })
    const res = await purchase({ json: async () => ({ user_id: 'evil' }) } as unknown as Request, { params: { id: ID } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ submission_id: SUB })
    expect(startPurchase).toHaveBeenCalledWith(purchaseDeps, OWNER, ID)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })

  test('a refusal returns its fixed code and message; an exception is a generic 500', async () => {
    sessionUserId.mockResolvedValue(OWNER)
    startPurchase.mockResolvedValue({ ok: false, status: 503, code: 'issuance_stopped' })
    const res = await purchase({} as Request, { params: { id: ID } })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'Creator Record payments are not open yet.', code: 'issuance_stopped' })
    startPurchase.mockRejectedValue(new Error('creator_record_v2_store:bind:XX000'))
    const failed = await purchase({} as Request, { params: { id: ID } })
    expect(failed.status).toBe(500)
    expect(JSON.stringify(await failed.json())).not.toMatch(/XX000|bind/)
  })
})
