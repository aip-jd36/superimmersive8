/**
 * CR-V2-MVP-RETENTION-M1A — unit tests: retention service (fake ports), the 12-month customer download period, and the route
 * boundaries (deletion request and consent withdrawal are not behind the submissions stop; the sweep has its own secret).
 * The database behaviour is tested on PostgreSQL in __tests__/db/creator-record-v2-retention-m1a.db.test.ts.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  applyHoldAction, parseHoldAction, requestEvidenceDeletion, RetentionRefusal, runRetentionSweep, withdrawEvidenceConsent,
  type RetentionDeps, type RetentionPorts, type RetentionStatusReport,
} from '@/lib/creator-record/evidence-intake/retention'
import type { EvidenceObjects, EvidenceRow, EvidenceStore } from '@/lib/creator-record/evidence-intake/service'
import { customerAccessEnds, customerAccessExpired, deliverCreatorRecordPdf, type DeliveryPorts } from '@/lib/creator-record-artifacts/deliver'
import { sha256Hex, type ArtifactRow } from '@/lib/creator-record-artifacts/issue'
import { CUSTOMER_LIVE_DATABASE_REFUSALS } from '@/lib/creator-record/live-examination/customer'

const APP = join(__dirname, '..', '..')
const DOC = '11111111-2222-4333-8444-555555555555'
const HOLD = '99999999-2222-4333-8444-555555555555'
const USER = 'aaaaaaaa-2222-4333-8444-555555555555'
const REASON = 'Disputed payment under review by support'

const quiet: RetentionStatusReport = { overdue_expiry: 0, removal_pending: 0, overdue_removal: 0, open_deletion_requests: 0, deletion_requests_awaiting_hold: 0, active_holds: 0, manual_resolution_open: 0 }
const applied = { deletion_requests: { deleted: 0, already_deleted: 0, awaiting_resolution: 0 }, expired: 0, extended: 0, held: 0, issuance_stopped: 0 }

function harness(over: Partial<RetentionPorts> = {}, rows: EvidenceRow[] = []) {
  const calls: string[] = []
  const removed: string[] = []
  let removeFails = false
  const retention: RetentionPorts = {
    requestDeletion: async () => ({ request_id: 'r', status: 'completed', awaiting: null, resolution: 'deleted' }),
    withdrawConsent: async () => ({ withdrawal_id: 1, withdrawn_at: '2026-11-07T00:00:00.000Z', result: 'created' }),
    placeHold: async () => HOLD,
    renewHold: async () => HOLD,
    releaseHold: async () => 'released',
    apply: async () => applied,
    status: async () => quiet,
    ...over,
  }
  const byId = new Map(rows.map((r) => [r.id, r]))
  const store = {
    get: async (id: string) => byId.get(id) ?? null,
    markObjectRemoved: async (id: string) => { calls.push(`markObjectRemoved:${id}`) },
    pendingCreatedBefore: async () => [],
    deletedWithObject: async () => rows.filter((r) => r.state === 'deleted' && !r.object_removed_at),
    removePending: async () => false,
  } as unknown as EvidenceStore
  const objects: EvidenceObjects = {
    put: async () => undefined, get: async () => null,
    async remove(p) { if (removeFails) throw new Error('down'); removed.push(p) },
  }
  const alerts: { subject: string; fields: Record<string, string | number> }[] = []
  const logs: string[] = []
  const deps: RetentionDeps & { alert: (s: string, f: Record<string, string | number>) => Promise<void> } = {
    retention, store, objects, now: () => new Date('2026-11-07T00:00:00Z'), log: (e) => { logs.push(e) },
    alert: async (subject, fields) => { alerts.push({ subject, fields }) },
  }
  return { deps, calls, removed, alerts, logs, failRemoval: () => { removeFails = true } }
}
const deletedRow = (over: Partial<EvidenceRow> = {}): EvidenceRow => ({
  id: DOC, user_id: USER, sha256: 'a'.repeat(64), media_type: 'application/pdf', byte_size: 10, file_name: 'r.pdf', storage_path: `${USER}/${DOC}`,
  consent_version: 'c', state: 'deleted', created_at: '', stored_at: '', deleted_at: '', object_removed_at: null, ...over,
})

describe('deletion requests', () => {
  test('a malformed id is not found, without a database call', async () => {
    let called = false
    const h = harness({ requestDeletion: async () => { called = true; throw new Error('x') } })
    expect(await requestEvidenceDeletion(h.deps, USER, '../etc')).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(called).toBe(false)
  })
  test('deleted now: the object is removed and recorded at once', async () => {
    const h = harness({}, [deletedRow()])
    expect(await requestEvidenceDeletion(h.deps, USER, DOC)).toEqual({ ok: true, request: { status: 'completed', awaiting: null, resolution: 'deleted' } })
    expect(h.removed).toEqual([`${USER}/${DOC}`])
    expect(h.calls).toEqual([`markObjectRemoved:${DOC}`])
  })
  test('open (awaiting a hold): nothing is removed, the reason is returned', async () => {
    const h = harness({ requestDeletion: async () => ({ request_id: 'r', status: 'open', awaiting: 'administrative_hold', resolution: null }) }, [deletedRow()])
    expect(await requestEvidenceDeletion(h.deps, USER, DOC)).toEqual({ ok: true, request: { status: 'open', awaiting: 'administrative_hold', resolution: null } })
    expect(h.removed).toEqual([])
  })
  test('a failed object removal still answers (the sweep retries it) and is logged', async () => {
    const h = harness({}, [deletedRow()])
    h.failRemoval()
    expect(await requestEvidenceDeletion(h.deps, USER, DOC)).toMatchObject({ ok: true })
    expect(h.logs).toEqual(['creator_record_evidence_object_removal_deferred'])
    expect(h.calls).toEqual([])
  })
  test('refusals map to fixed codes; anything else is unavailable', async () => {
    expect(await requestEvidenceDeletion(harness({ requestDeletion: async () => { throw new RetentionRefusal('not_found') } }).deps, USER, DOC)).toEqual({ ok: false, status: 404, code: 'not_found' })
    expect(await requestEvidenceDeletion(harness({ requestDeletion: async () => { throw new Error('db down') } }).deps, USER, DOC)).toEqual({ ok: false, status: 503, code: 'unavailable' })
  })
})

describe('consent withdrawal', () => {
  test('created / existing, and unavailable fails closed', async () => {
    expect(await withdrawEvidenceConsent(harness().deps, USER)).toEqual({ ok: true, result: 'created', withdrawn_at: '2026-11-07T00:00:00.000Z' })
    expect(await withdrawEvidenceConsent(harness({ withdrawConsent: async () => { throw new Error('x') } }).deps, USER)).toEqual({ ok: false, status: 503, code: 'unavailable' })
  })
  test('the live engine maps the database refusal to a fixed code', () => {
    expect(CUSTOMER_LIVE_DATABASE_REFUSALS.creator_record_v2_consent_withdrawn).toBe('consent_withdrawn')
  })
})

describe('administrative holds', () => {
  test('strict input: closed keys, a 10–1000 character reason, 1–30 days, uuids', () => {
    expect(parseHoldAction({ action: 'place', document_id: DOC, reason: REASON, days: 30 })).toEqual({ action: 'place', document_id: DOC, reason: REASON, days: 30 })
    for (const bad of [
      { action: 'place', document_id: DOC, reason: REASON, days: 31 },
      { action: 'place', document_id: DOC, reason: REASON, days: 0 },
      { action: 'place', document_id: DOC, reason: REASON, days: 1.5 },
      { action: 'place', document_id: DOC, reason: 'short', days: 5 },
      { action: 'place', document_id: DOC, reason: REASON, days: 5, auto_renew: true },
      { action: 'place', document_id: 'x', reason: REASON, days: 5 },
      { action: 'renew', hold_id: HOLD, reason: REASON },
      { action: 'release', hold_id: HOLD, reason: REASON, days: 5 },
      { action: 'extend', hold_id: HOLD, reason: REASON, days: 5 },
      null, [], 'place',
    ]) expect(parseHoldAction(bad)).toBeNull()
  })
  test('invalid input never reaches the database; refusals keep their meaning', async () => {
    let called = false
    const h = harness({ placeHold: async () => { called = true; return HOLD } })
    expect(await applyHoldAction(h.deps, USER, { action: 'place', document_id: DOC, reason: REASON, days: 45 })).toEqual({ ok: false, status: 400, code: 'invalid_request' })
    expect(called).toBe(false)
    const conflict = harness({ renewHold: async () => { throw new RetentionRefusal('deletion_request_open') } })
    expect(await applyHoldAction(conflict.deps, USER, { action: 'renew', hold_id: HOLD, reason: REASON, days: 10 })).toEqual({ ok: false, status: 409, code: 'deletion_request_open' })
    const notAdmin = harness({ placeHold: async () => { throw new RetentionRefusal('not_authorized') } })
    expect(await applyHoldAction(notAdmin.deps, USER, { action: 'place', document_id: DOC, reason: REASON, days: 10 })).toEqual({ ok: false, status: 403, code: 'not_authorized' })
    expect(await applyHoldAction(harness().deps, USER, { action: 'release', hold_id: HOLD, reason: REASON })).toEqual({ ok: true, hold_id: HOLD, result: 'released' })
  })
})

describe('retention sweep', () => {
  test('nothing to report: ok, no alert', async () => {
    const h = harness()
    const r = await runRetentionSweep(h.deps)
    expect(r).toMatchObject({ ok: true, problems: [], notices: [] })
    expect(h.alerts).toEqual([])
  })
  test('a failed object removal fails the sweep and alerts (counts only)', async () => {
    const h = harness({}, [deletedRow()])
    h.failRemoval()
    const r = await runRetentionSweep(h.deps)
    expect(r.ok).toBe(false)
    expect(r.problems).toEqual(['object_removal_failed'])
    expect(h.alerts).toHaveLength(1)
    expect(JSON.stringify(h.alerts)).not.toContain(DOC)
  })
  test('anything overdue fails the sweep', async () => {
    const r = await runRetentionSweep(harness({ status: async () => ({ ...quiet, overdue_expiry: 2, overdue_removal: 1 }) }).deps)
    expect(r.ok).toBe(false)
    expect(r.problems).toEqual(['overdue_expiry', 'overdue_removal'])
  })
  test('the database step failing does not stop object removal, and fails the sweep', async () => {
    const h = harness({ apply: async () => { throw new Error('db down') } }, [deletedRow()])
    const r = await runRetentionSweep(h.deps)
    expect(r.ok).toBe(false)
    expect(r.problems).toEqual(['apply_failed'])
    expect(h.removed).toEqual([`${USER}/${DOC}`])
  })
  test('an unreadable status fails the sweep (fail closed)', async () => {
    const r = await runRetentionSweep(harness({ status: async () => { throw new Error('x') } }).deps)
    expect(r).toMatchObject({ ok: false, problems: ['status_unavailable'] })
  })
  test('decisions needed (manual resolution, a request waiting on a hold) alert without failing', async () => {
    const h = harness({ apply: async () => ({ ...applied, issuance_stopped: 1 }), status: async () => ({ ...quiet, deletion_requests_awaiting_hold: 1, manual_resolution_open: 1 }) })
    const r = await runRetentionSweep(h.deps)
    expect(r).toMatchObject({ ok: true, notices: ['manual_resolution_required', 'deletion_request_awaiting_hold'] })
    expect(h.alerts[0].subject).toBe('Creator Record retention decision needed')
  })
})

describe('customer download period (12 months after issuance, v2 only, owner only)', () => {
  const V2 = 'creator-record-v2-pdf-v1'
  test('calendar months, fail closed on an unreadable time', () => {
    expect(customerAccessEnds('2026-01-31T10:00:00.000Z')!.toISOString()).toBe('2027-01-31T10:00:00.000Z')
    expect(customerAccessExpired({ generator_version: V2, issued_at: '2026-01-31T10:00:00.000Z' }, new Date('2027-01-31T09:59:59.999Z'))).toBe(false)
    expect(customerAccessExpired({ generator_version: V2, issued_at: '2026-01-31T10:00:00.000Z' }, new Date('2027-01-31T10:00:00.000Z'))).toBe(true)
    expect(customerAccessExpired({ generator_version: V2, issued_at: null }, new Date())).toBe(true)
    expect(customerAccessExpired({ generator_version: V2, issued_at: 'garbage' }, new Date())).toBe(true)
    expect(customerAccessExpired({ generator_version: 'creator-record-pdf-v1', issued_at: '2020-01-01T00:00:00.000Z' }, new Date())).toBe(false)
  })

  const bytes = new TextEncoder().encode('%PDF-1.7 issued')
  const artifact = (generator: string, issuedAt: string): ArtifactRow => ({
    id: 'a', submission_id: DOC, record_id: 'CR2-0001', attempt_id: HOLD, storage_path: `${DOC}/${HOLD}.pdf`, sha256: sha256Hex(bytes), byte_size: bytes.length,
    generator_version: generator, status: 'issued', uat: false, issued_at: issuedAt,
  })
  const ports = (role: 'owner' | 'admin', a: ArtifactRow, now: string): DeliveryPorts => ({
    currentUserId: async () => (role === 'owner' ? USER : 'bbbbbbbb-2222-4333-8444-555555555555'),
    submissionOwner: async () => USER, isAdmin: async () => role === 'admin', findArtifact: async () => a, getObject: async () => bytes,
    legacyReferences: async () => [], getLegacyObject: async () => null, log: () => undefined, now: () => new Date(now),
  })
  test('owner: delivered until the period ends, then 410 access_expired (fixed code, no wording)', async () => {
    const a = artifact(V2, '2026-01-01T00:00:00.000Z')
    expect((await deliverCreatorRecordPdf(DOC, ports('owner', a, '2026-12-31T23:59:59.000Z'))).status).toBe(200)
    const expired = await deliverCreatorRecordPdf(DOC, ports('owner', a, '2027-01-01T00:00:00.000Z'))
    expect(expired.status).toBe(410)
    expect(await expired.json()).toEqual({ code: 'access_expired' })
    expect(expired.headers.get('cache-control')).toContain('no-store')
  })
  test('admin access is unchanged after the period; V1 records are untouched', async () => {
    expect((await deliverCreatorRecordPdf(DOC, ports('admin', artifact(V2, '2024-01-01T00:00:00.000Z'), '2027-06-01T00:00:00.000Z'))).status).toBe(200)
    expect((await deliverCreatorRecordPdf(DOC, ports('owner', artifact('creator-record-pdf-v2', '2024-01-01T00:00:00.000Z'), '2027-06-01T00:00:00.000Z'))).status).toBe(200)
  })
})

describe('route boundaries', () => {
  const src = (p: string) => readFileSync(join(APP, p), 'utf8')
  test('deletion request and consent withdrawal do not depend on the submissions stop or the invitation', () => {
    for (const p of ['app/api/creator-record-v2/evidence/[id]/deletion-request/route.ts', 'app/api/creator-record-v2/consent-withdrawal/route.ts', 'lib/creator-record/evidence-intake/retention.ts']) {
      const s = src(p)
      expect(s).not.toMatch(/checkEvidenceGate|hasPilotAccess|CREATOR_RECORD_V2_SUBMISSIONS|syntheticUat/)
    }
    expect(src('app/api/creator-record-v2/evidence/[id]/deletion-request/route.ts')).toMatch(/sessionUserId\(\)/)
    expect(src('app/api/creator-record-v2/consent-withdrawal/route.ts')).toMatch(/isConfirmation/)
  })
  test('the sweep has its own secret and fails closed; the admin route checks the admin before acting', () => {
    const sweep = src('app/api/internal/creator-record-v2/retention/sweep/route.ts')
    expect(sweep).toMatch(/process\.env\.CREATOR_RECORD_RETENTION_SWEEP_SECRET/)
    expect(sweep).not.toMatch(/PAYMENT_SWEEP_SECRET/)
    const holds = src('app/api/admin/creator-record-v2/retention/holds/route.ts')
    expect(holds.indexOf('isAdminUser(userId)')).toBeLessThan(holds.indexOf('applyHoldAction('))
    expect(src('../../.github/workflows/creator-record-retention-sweep.yml')).toMatch(/secrets\.CREATOR_RECORD_RETENTION_SWEEP_SECRET/)
  })
  test('no commercial gate is opened', () => {
    expect(src('lib/creator-record/evidence-intake/contract.ts')).toMatch(/export const EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED: boolean = false/)
    expect(src('lib/creator-record/live-examination/controls.ts')).toMatch(/export const LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false/)
    expect(src('lib/creator-record/live-examination/controls.ts')).toMatch(/export const CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: boolean = false/)
  })
})
