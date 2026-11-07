/**
 * CR-V2-MVP-RETENTION-M1A — original-document retention on real PostgreSQL, every migration through 20261111000000 applied verbatim.
 *
 * Covers: referenced originals expiring without touching issued-record integrity; consent withdrawal stopping every later examination
 * (including one already reserved and running); deletion requests independent of the submissions stop, and their documented open
 * state; holds that cannot silently defeat a deletion request; the 14-day paid-order extension ending at its maximum and stopping
 * automated issuance; failed object removal detected (overdue) and recovered; concurrency between expiry, requests and examination;
 * and the privilege boundary (service_role cannot bypass any of it).
 *
 * Disposable local `si8_test_*` database only. Objects are kept in memory (Storage is not part of this schema). The live-examination
 * code locks are lifted for this file only (module mock); the model is a fake behind the executor's adapter seam (never called for
 * real, no provider, no spending).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash, randomUUID } from 'crypto'
import { Client } from 'pg'

jest.mock('@/lib/creator-record/live-examination/controls', () => ({
  ...jest.requireActual('@/lib/creator-record/live-examination/controls'),
  LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
  CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: true,
}))

import { cleanupEvidence, deleteEvidence, verifyEvidenceIntact, type EvidenceDeps, type EvidenceObjects, type EvidenceRow, type EvidenceStore } from '@/lib/creator-record/evidence-intake/service'
import {
  applyHoldAction, requestEvidenceDeletion, RETENTION_DATABASE_REFUSALS, RetentionRefusal, runRetentionSweep, withdrawEvidenceConsent,
  type RetentionDeps, type RetentionPorts,
} from '@/lib/creator-record/evidence-intake/retention'
import { CUSTOMER_LIVE_DATABASE_REFUSALS, examineCustomerDocumentLive, type CustomerLivePorts } from '@/lib/creator-record/live-examination/customer'
import { LivePortError } from '@/lib/creator-record/live-examination/examine'
import type { LiveAnthropicAdapter } from '@/lib/creator-record/live-examination/real-executor'
import { deliverCreatorRecordPdf } from '@/lib/creator-record-artifacts/deliver'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { syntheticTextPdf } from '@/test-support/synthetic-pdf'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql', '20261022000000_payment_zero_total_paid.sql', '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql', '20261102000000_creator_record_v2_submission_binding.sql', '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql', '20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql',
  '20261107000000_creator_record_v2_admin_uat.sql', '20261108000000_creator_record_v2_live_examination_foundation.sql', '20261110000000_creator_record_v2_customer_live_examination.sql',
  '20261111000000_creator_record_v2_retention_m1a.sql',
].map((f) => join(DIR, f))
const CONSENT = 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0'
const ENV = { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-key-not-real' }
const OUTPUT = REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output
const V2_GENERATOR = 'creator-record-v2-pdf-v1'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  if (!u.pathname.replace(/^\//, '').startsWith('si8_test_')) throw new Error('refusing to run: not an si8_test_* database')
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error('refusing to run: host is not local')
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const hex64 = () => createHash('sha256').update(randomUUID()).digest('hex')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null))

maybe('Creator Record v2 original-document retention (PostgreSQL, through 20261111000000)', () => {
  let admin: Client
  let svc: Client
  let svc2: Client
  const bytesOf = new Map<string, Uint8Array>()
  const objects = new Map<string, Uint8Array>()

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of MIGRATIONS) await admin.query(readFileSync(m, 'utf8'))
    await admin.query(`INSERT INTO public.creator_record_v2_customer_live_enablement (supabase_project_ref, max_attempts_per_creator_per_day, max_spend_micro_usd_per_creator, max_reserve_micro_usd_per_attempt, established_by, reason)
      VALUES ('localpg15retentionm1', 24, 5000000, 1000000, 'db test operator', 'isolated local PostgreSQL test')`)
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
    svc2 = new Client({ connectionString: URL })
    await svc2.connect()
    await svc2.query('SET ROLE service_role')
  }, 60_000)
  afterAll(async () => {
    await svc2?.end().catch(() => undefined)
    await svc?.end().catch(() => undefined)
    await admin?.end().catch(() => undefined)
  })

  // ── Ports over pg (production uses PostgREST with the same functions and the same service role) ──
  const rowOf = (r: Record<string, unknown>): EvidenceRow => ({
    ...(r as unknown as EvidenceRow), sha256: String(r.sha256).trim(), byte_size: Number(r.byte_size),
    created_at: iso(r.created_at)!, stored_at: iso(r.stored_at), deleted_at: iso(r.deleted_at), object_removed_at: iso(r.object_removed_at),
  })
  const COLS = 'id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, created_at, stored_at, deleted_at, object_removed_at'
  const pgStore = (c: () => Client): EvidenceStore => ({
    insertPending: async () => { throw new Error('not used') },
    markStored: async () => { throw new Error('not used') },
    async removePending(id) { return (await c().query(`DELETE FROM public.creator_record_v2_documents WHERE id = $1 AND state = 'pending'`, [id])).rowCount === 1 },
    async get(id) { const r = (await c().query(`SELECT ${COLS} FROM public.creator_record_v2_documents WHERE id = $1`, [id])).rows[0]; return r ? rowOf(r) : null },
    listStored: async () => [],
    countLive: async () => 0,
    async markDeleted(id, userId, at) {
      try {
        const r = await c().query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = $3 WHERE id = $1 AND user_id = $2 AND state = 'stored'`, [id, userId, at])
        return r.rowCount === 1 ? 'deleted' : 'not_stored'
      } catch (e) { if ((e as { code?: string }).code === 'P0001') return 'referenced'; throw e }
    },
    async markObjectRemoved(id, at) { await c().query(`UPDATE public.creator_record_v2_documents SET object_removed_at = $2 WHERE id = $1 AND state = 'deleted' AND object_removed_at IS NULL`, [id, at]) },
    async pendingCreatedBefore(before) { return (await c().query(`SELECT ${COLS} FROM public.creator_record_v2_documents WHERE state = 'pending' AND created_at < $1`, [before])).rows.map(rowOf) },
    async deletedWithObject() { return (await c().query(`SELECT ${COLS} FROM public.creator_record_v2_documents WHERE state = 'deleted' AND object_removed_at IS NULL LIMIT 200`)).rows.map(rowOf) },
    logAccess: async () => { throw new Error('not used') },
  })
  const store = pgStore(() => svc)
  let removalFails = false
  const memObjects: EvidenceObjects = {
    put: async (p, b) => { objects.set(p, b) },
    get: async (p) => objects.get(p) ?? null,
    async remove(p) { if (removalFails) throw new Error('storage unavailable'); objects.delete(p) },
  }
  const refusal = (e: unknown): never => {
    const code = RETENTION_DATABASE_REFUSALS[(e as { message?: string }).message ?? '']
    if (code) throw new RetentionRefusal(code)
    throw e
  }
  const retentionPorts = (c: () => Client): RetentionPorts => ({
    async requestDeletion(u, d) { try { return (await c().query('SELECT * FROM public.creator_record_v2_request_document_deletion($1, $2)', [u, d])).rows[0] } catch (e) { return refusal(e) } },
    async withdrawConsent(u) {
      try { const r = (await c().query('SELECT * FROM public.creator_record_v2_withdraw_consent($1)', [u])).rows[0]; return { withdrawal_id: Number(r.withdrawal_id), withdrawn_at: iso(r.withdrawn_at)!, result: r.result } } catch (e) { return refusal(e) }
    },
    async placeHold(d, a, reason, days) { try { return (await c().query('SELECT public.creator_record_v2_place_retention_hold($1, $2, $3, $4) v', [d, a, reason, days])).rows[0].v } catch (e) { return refusal(e) } },
    async renewHold(h, a, reason, days) { try { return (await c().query('SELECT public.creator_record_v2_renew_retention_hold($1, $2, $3, $4) v', [h, a, reason, days])).rows[0].v } catch (e) { return refusal(e) } },
    async releaseHold(h, a, reason) { try { return (await c().query('SELECT public.creator_record_v2_release_retention_hold($1, $2, $3) v', [h, a, reason])).rows[0].v } catch (e) { return refusal(e) } },
    async apply(limit) { try { return (await c().query('SELECT public.creator_record_v2_apply_retention($1) v', [limit])).rows[0].v } catch (e) { return refusal(e) } },
    async status() { return (await c().query('SELECT public.creator_record_v2_retention_status() v')).rows[0].v },
  })
  const alerts: { subject: string; fields: Record<string, string | number> }[] = []
  const deps: RetentionDeps & { alert: (s: string, f: Record<string, string | number>) => Promise<void> } = {
    retention: retentionPorts(() => svc), store, objects: memObjects, now: () => new Date(),
    alert: async (subject, fields) => { alerts.push({ subject, fields }) },
  }

  // ── Fixtures ──
  async function user(isAdmin = false) {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, $4)', [id, `${id}@example.test`, 'Tester', isAdmin])
    return id
  }
  /** An owner upload stored `days` days ago, with its object. */
  async function doc(owner: string, days = 0) {
    const bytes = syntheticTextPdf(`Synthetic retention document ${randomUUID()}`)
    const id = randomUUID()
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', $4, 'receipt.pdf', $5, $6, 'pending')`,
      [id, owner, sha(bytes), bytes.length, `${owner}/${id}`, CONSENT])
    await svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() - make_interval(days => $2) WHERE id = $1`, [id, days])
    bytesOf.set(id, bytes)
    objects.set(`${owner}/${id}`, bytes)
    return { id, sha256: sha(bytes), byte_size: bytes.length, path: `${owner}/${id}` }
  }
  const docRow = async (id: string) => (await admin.query('SELECT * FROM public.creator_record_v2_documents WHERE id = $1', [id])).rows[0]
  /** A reviewed prepared version referencing the documents (minimal canonical: the link trigger reads documents.items only). */
  async function prepared(owner: string, docs: { id: string; sha256: string }[]) {
    const id = randomUUID()
    const canonical = JSON.stringify({ documents: { items: docs.map((d) => ({ document_id: d.id, sha256: d.sha256 })) } })
    await svc.query(`INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
      VALUES ($1, $2, $3, 1, $4, 'si8/creator-record-v2-record', 8, $5, $6, '{}'::jsonb, 'prepared')`, [id, owner, randomUUID(), `PREP-${id}`, canonical, sha(new TextEncoder().encode(canonical))])
    await svc.query(`UPDATE public.creator_record_v2_prepared SET status = 'reviewed', reviewed_at = now() WHERE id = $1`, [id])
    return id
  }
  /** Bound and paid (the webhook's own function, synthetic session facts). Returns submission and session. */
  async function paidOrder(owner: string, preparedId: string) {
    const p = (await svc.query('SELECT sha256 FROM public.creator_record_v2_prepared WHERE id = $1', [preparedId])).rows[0]
    const b = (await svc.query('SELECT * FROM public.create_creator_record_v2_submission($1, $2, $3, $4)', [preparedId, owner, String(p.sha256).trim(), 'Creator'])).rows[0]
    const session = `cs_test_${randomUUID().replace(/-/g, '')}`
    await svc.query('UPDATE public.submissions SET stripe_checkout_session_id = $2 WHERE id = $1', [b.out_submission_id, session])
    const r = (await svc.query('SELECT * FROM public.record_checkout_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
      [session, `evt_${randomUUID().replace(/-/g, '')}`, b.out_submission_id, Math.floor(Date.now() / 1000), 'complete', 'payment', 'paid', 'pi_test_ret', 'usd', 2900, 2900, 0, 0, 0])).rows[0]
    expect(r.out_outcome).toBe('accepted')
    return { submissionId: b.out_submission_id as string, session }
  }
  async function issue(submissionId: string) {
    const attempt = randomUUID()
    const pdf = new TextEncoder().encode(`%PDF-1.7 synthetic issued record ${submissionId}`)
    const path = `${submissionId}/${attempt}.pdf`
    objects.set(path, pdf)
    await svc.query(`INSERT INTO public.creator_record_artifacts (submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, uat, status) VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'pending')`,
      [submissionId, `CR2-${randomUUID().slice(0, 8)}`, attempt, path, sha(pdf), pdf.length, V2_GENERATOR])
    await svc.query(`UPDATE public.creator_record_artifacts SET status = 'issued', issued_at = now() WHERE submission_id = $1`, [submissionId])
  }
  const ledger = async (session: string) => (await admin.query('SELECT * FROM public.payment_fulfillments WHERE stripe_checkout_session_id = $1', [session])).rows[0]
  const events = async (documentId: string) => (await admin.query('SELECT event FROM public.creator_record_v2_retention_events WHERE document_id = $1 ORDER BY id', [documentId])).rows.map((r) => r.event)
  const apply = () => deps.retention.apply(200)
  const REASON = 'Disputed payment under review by support'

  // ── 1. Expiry of a referenced original preserves issued-record integrity ──
  test('a referenced original expires after 90 days; its issued record, links and fingerprint are untouched and still delivered', async () => {
    const owner = await user()
    const d = await doc(owner, 91)
    const fresh = await doc(owner, 89)
    const pid = await prepared(owner, [d, fresh])
    const { submissionId } = await paidOrder(owner, pid)
    await issue(submissionId)
    const before = {
      prepared: (await admin.query('SELECT canonical, sha256, status, submission_id FROM public.creator_record_v2_prepared WHERE id = $1', [pid])).rows[0],
      links: (await admin.query('SELECT * FROM public.creator_record_v2_prepared_documents WHERE prepared_id = $1 ORDER BY document_id', [pid])).rows,
      artifact: (await admin.query('SELECT sha256, storage_path, status, issued_at FROM public.creator_record_artifacts WHERE submission_id = $1', [submissionId])).rows[0],
    }

    const report = await apply()
    expect(report.expired).toBeGreaterThanOrEqual(1)
    const row = await docRow(d.id)
    expect(row.state).toBe('deleted')
    expect(row.deletion_reason).toBe('retention_expired')
    expect(String(row.sha256).trim()).toBe(d.sha256)  // identity and fingerprint kept
    expect((await docRow(fresh.id)).state).toBe('stored')  // 89 days: not yet

    // Physical removal by the existing cleanup.
    const cleanup = await cleanupEvidence({ store, objects: memObjects, now: () => new Date() })
    expect(cleanup.failures).toBe(0)
    expect(objects.has(d.path)).toBe(false)
    expect((await docRow(d.id)).object_removed_at).not.toBeNull()

    // Nothing about the record changed.
    expect((await admin.query('SELECT canonical, sha256, status, submission_id FROM public.creator_record_v2_prepared WHERE id = $1', [pid])).rows[0]).toEqual(before.prepared)
    expect((await admin.query('SELECT * FROM public.creator_record_v2_prepared_documents WHERE prepared_id = $1 ORDER BY document_id', [pid])).rows).toEqual(before.links)
    expect((await admin.query('SELECT sha256, storage_path, status, issued_at FROM public.creator_record_artifacts WHERE submission_id = $1', [submissionId])).rows[0]).toEqual(before.artifact)
    expect(await events(d.id)).toEqual(['retention_expired'])

    // The issued PDF is still delivered to its owner, bytes re-verified.
    const res = await deliverCreatorRecordPdf(submissionId, {
      currentUserId: async () => owner, submissionOwner: async () => owner, isAdmin: async () => false,
      findArtifact: async (sid) => { const r = (await svc.query('SELECT id, submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, status, uat, issued_at FROM public.creator_record_artifacts WHERE submission_id = $1', [sid])).rows[0]; return r ? { ...r, sha256: String(r.sha256).trim(), issued_at: iso(r.issued_at) } : null },
      getObject: async (p) => objects.get(p) ?? null, legacyReferences: async () => [], getLegacyObject: async () => null, log: () => undefined,
    })
    expect(res.status).toBe(200)

    // A record not yet sold that references the expired original can no longer be bought or issued (existing fail-closed check).
    expect(await verifyEvidenceIntact({ store, objects: memObjects }, owner, [{ document_id: d.id, sha256: d.sha256, byte_size: d.byte_size }])).toEqual({ ok: false, reason: 'not_stored' })
    // A deleted original stays deleted: its reason is final.
    await expect(admin.query(`UPDATE public.creator_record_v2_documents SET deletion_reason = 'owner_deleted' WHERE id = $1`, [d.id])).rejects.toThrow('a deleted document is final')
  })

  test('re-upload after expiry creates a new document (new identity), the expired one stays as it was', async () => {
    const owner = await user()
    const d = await doc(owner, 120)
    await apply()
    expect((await docRow(d.id)).state).toBe('deleted')
    const id = randomUUID()
    const bytes = bytesOf.get(d.id)!
    await svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state) VALUES ($1, $2, $3, 'application/pdf', $4, 'receipt.pdf', $5, $6, 'pending')`,
      [id, owner, d.sha256, bytes.length, `${owner}/${id}`, CONSENT])
    expect((await docRow(id)).state).toBe('pending')
    expect((await docRow(d.id)).deletion_reason).toBe('retention_expired')
  })

  // ── 2. The paid-order extension ends at its maximum ──
  test('an unfinished paid order extends expiry to 104 days at most; then the original expires and automated issuance stops', async () => {
    const owner = await user()
    const d = await doc(owner, 95)
    const pid = await prepared(owner, [d])
    const { session } = await paidOrder(owner, pid)

    await apply()
    await apply()
    expect((await docRow(d.id)).state).toBe('stored')
    expect(await events(d.id)).toEqual(['paid_order_extension_applied'])  // recorded once, never renewed

    // The same order at 105 days: the extension has ended.
    const late = await user()
    const d2 = await doc(late, 105)
    const pid2 = await prepared(late, [d2])
    const order = await paidOrder(late, pid2)
    const report = await apply()
    expect((await docRow(d2.id)).deletion_reason).toBe('retention_expired')
    expect(report.issuance_stopped).toBeGreaterThanOrEqual(1)
    const f = await ledger(order.session)
    expect(f.fulfillment_status).toBe('needs_reconciliation')
    expect(f.last_error).toMatch(/^retention_original_unavailable: .*refund or manual resolution required/)
    expect(f.reconciliation_log.at(-1)).toMatchObject({ actor: 'system:creator_record_v2_retention', action: 'stop_automated_issuance' })
    // Automated issuance is stopped: the ledger no longer lets the sweep claim it.
    const claim = (await svc.query('SELECT * FROM public.claim_payment_fulfillment($1, 300, 6, 604800)', [order.session])).rows[0]
    expect(claim.out_claimed).toBe(false)
    expect(claim.out_reason).toBe('needs_reconciliation')
    // Idempotent: a further run does not flag it again.
    const logLength = f.reconciliation_log.length
    await apply()
    expect((await ledger(order.session)).reconciliation_log.length).toBe(logLength)
    expect((await deps.retention.status()).manual_resolution_open).toBeGreaterThanOrEqual(1)
    // The first order is still within its extension.
    expect((await ledger(session)).fulfillment_status).toBe('pending')
  })

  test('an issued order no longer extends anything: the original expires on time', async () => {
    const owner = await user()
    const d = await doc(owner, 92)
    const pid = await prepared(owner, [d])
    const { submissionId, session } = await paidOrder(owner, pid)
    await issue(submissionId)
    await apply()
    expect((await docRow(d.id)).deletion_reason).toBe('retention_expired')
    expect((await ledger(session)).fulfillment_status).toBe('pending')  // not touched: it has an issued artifact
  })

  // ── 3. Holds ──
  test('holds: named admin only, at most 30 days, defer expiry, explicit renewal once per hold, immutable and never deleted', async () => {
    const owner = await user()
    const adminId = await user(true)
    const d = await doc(owner, 91)
    expect(await applyHoldAction(deps, owner, { action: 'place', document_id: d.id, reason: REASON, days: 10 })).toMatchObject({ ok: false, code: 'not_authorized' })
    expect(await applyHoldAction(deps, adminId, { action: 'place', document_id: d.id, reason: REASON, days: 31 })).toMatchObject({ ok: false, code: 'invalid_request' })
    await expect(svc.query('SELECT public.creator_record_v2_place_retention_hold($1, $2, $3, 31)', [d.id, adminId, REASON])).rejects.toThrow('creator_record_v2_hold_invalid')
    await expect(svc.query('SELECT public.creator_record_v2_place_retention_hold($1, $2, $3, 5)', [d.id, adminId, 'too short'])).rejects.toThrow('creator_record_v2_hold_invalid')

    const placed = await applyHoldAction(deps, adminId, { action: 'place', document_id: d.id, reason: REASON, days: 30 })
    if (!placed.ok) throw new Error(JSON.stringify(placed))
    expect(await applyHoldAction(deps, adminId, { action: 'place', document_id: d.id, reason: REASON, days: 5 })).toMatchObject({ ok: false, code: 'hold_already_active' })
    const hold = (await admin.query('SELECT * FROM public.creator_record_v2_retention_holds WHERE id = $1', [placed.hold_id])).rows[0]
    expect(hold.authorized_by).toBe(adminId)
    expect(new Date(hold.expires_at).getTime() - new Date(hold.starts_at).getTime()).toBe(30 * 86400_000)

    expect((await apply()).held).toBeGreaterThanOrEqual(1)
    expect((await docRow(d.id)).state).toBe('stored')
    expect((await deps.retention.status()).overdue_expiry).toBe(0)  // a held document is not overdue

    const renewed = await applyHoldAction(deps, adminId, { action: 'renew', hold_id: placed.hold_id, reason: 'Dispute still open, renewed by admin', days: 14 })
    expect(renewed).toMatchObject({ ok: true, result: 'renewed' })
    expect(await applyHoldAction(deps, adminId, { action: 'renew', hold_id: placed.hold_id, reason: 'A second renewal of the same hold', days: 14 })).toMatchObject({ ok: false, code: 'hold_not_renewable' })

    await expect(admin.query('UPDATE public.creator_record_v2_retention_holds SET expires_at = expires_at + interval \'1 day\' WHERE id = $1', [placed.hold_id])).rejects.toThrow('changed only by being released')
    await expect(admin.query('DELETE FROM public.creator_record_v2_retention_holds WHERE id = $1', [placed.hold_id])).rejects.toThrow('never deleted')

    // Releasing both ends the deferral; the next run expires the original.
    await applyHoldAction(deps, adminId, { action: 'release', hold_id: placed.hold_id, reason: 'Dispute resolved, hold released' })
    expect((await apply()).held).toBeGreaterThanOrEqual(1)  // the renewal is still active
    await applyHoldAction(deps, adminId, { action: 'release', hold_id: (renewed as { hold_id: string }).hold_id, reason: 'Dispute resolved, hold released' })
    await apply()
    expect((await docRow(d.id)).deletion_reason).toBe('retention_expired')
    expect(await events(d.id)).toEqual(['hold_placed', 'hold_renewed', 'hold_released', 'hold_released', 'retention_expired'])
  })

  // ── 4. Deletion requests ──
  test('a deletion request completes at once for an unreferenced or a referenced original, independent of any gate', async () => {
    const owner = await user()
    const other = await user()
    const loose = await doc(owner)
    const referenced = await doc(owner)
    await prepared(owner, [referenced])

    // The owner-delete path still refuses a referenced document, and records `owner_deleted` for an unreferenced one.
    const gated: EvidenceDeps = { submissions: 'open', hasPilotAccess: async () => true, realDocumentsPermitted: false, isSyntheticTestDocument: () => true, store, objects: memObjects, newId: randomUUID, now: () => new Date() }
    expect(await deleteEvidence(gated, owner, referenced.id)).toMatchObject({ ok: false, code: 'document_retained' })

    // Another creator's document is not found; a malformed id is not found without a database call.
    expect(await requestEvidenceDeletion(deps, other, loose.id)).toMatchObject({ ok: false, status: 404, code: 'not_found' })
    expect(await requestEvidenceDeletion(deps, owner, 'not-a-uuid')).toMatchObject({ ok: false, code: 'not_found' })

    for (const d of [loose, referenced]) {
      const r = await requestEvidenceDeletion(deps, owner, d.id)
      expect(r).toEqual({ ok: true, request: { status: 'completed', awaiting: null, resolution: 'deleted' } })
      expect((await docRow(d.id)).deletion_reason).toBe('deletion_request')
      expect((await docRow(d.id)).object_removed_at).not.toBeNull()
      expect(objects.has(d.path)).toBe(false)
    }
    // Asking again: recorded, already deleted.
    expect(await requestEvidenceDeletion(deps, owner, loose.id)).toEqual({ ok: true, request: { status: 'completed', awaiting: null, resolution: 'already_deleted' } })

    // The owner-delete path still records its own reason.
    const third = await doc(owner)
    expect(await deleteEvidence(gated, owner, third.id)).toEqual({ ok: true })
    expect((await docRow(third.id)).deletion_reason).toBe('owner_deleted')
  })

  test('a hold cannot silently defeat a deletion request: the request stays open and visible, no hold can be added or renewed, and it completes when the hold ends', async () => {
    const owner = await user()
    const adminId = await user(true)
    const d = await doc(owner)
    const hold = await applyHoldAction(deps, adminId, { action: 'place', document_id: d.id, reason: REASON, days: 30 })
    if (!hold.ok) throw new Error('hold')

    const r = await requestEvidenceDeletion(deps, owner, d.id)
    expect(r).toEqual({ ok: true, request: { status: 'open', awaiting: 'administrative_hold', resolution: null } })
    expect((await docRow(d.id)).state).toBe('stored')
    // Idempotent: one open request per document.
    await requestEvidenceDeletion(deps, owner, d.id)
    expect((await admin.query('SELECT count(*)::int n FROM public.creator_record_v2_deletion_requests WHERE document_id = $1', [d.id])).rows[0].n).toBe(1)

    // The hold cannot be extended past the request, nor a new one placed.
    expect(await applyHoldAction(deps, adminId, { action: 'renew', hold_id: hold.hold_id, reason: 'Trying to extend past the request', days: 30 })).toMatchObject({ ok: false, code: 'deletion_request_open' })
    const d2 = await doc(owner)
    await requestEvidenceDeletion(deps, owner, d2.id)  // completes at once (no hold)
    expect((await docRow(d2.id)).state).toBe('deleted')

    // Visible to the sweep, which alerts an operator.
    alerts.length = 0
    const sweep = await runRetentionSweep(deps)
    expect(sweep.notices).toContain('deletion_request_awaiting_hold')
    expect(alerts.length).toBe(1)
    expect((await deps.retention.status()).deletion_requests_awaiting_hold).toBeGreaterThanOrEqual(1)

    // A hold that simply runs out (inserted with a 2-second term by the database operator) completes the request on the next run.
    const owner2 = await user()
    const d3 = await doc(owner2)
    await admin.query(`INSERT INTO public.creator_record_v2_retention_holds (document_id, authorized_by, reason, starts_at, expires_at) VALUES ($1, $2, $3, now(), now() + interval '2 seconds')`, [d3.id, adminId, REASON])
    expect(await requestEvidenceDeletion(deps, owner2, d3.id)).toMatchObject({ ok: true, request: { status: 'open', awaiting: 'administrative_hold' } })
    await sleep(2500)
    await apply()
    const req = (await admin.query('SELECT * FROM public.creator_record_v2_deletion_requests WHERE document_id = $1', [d3.id])).rows[0]
    expect(req).toMatchObject({ status: 'completed', resolution: 'deleted', awaiting: null })
    expect((await docRow(d3.id)).deletion_reason).toBe('deletion_request')
    expect(await events(d3.id)).toEqual(['deletion_requested', 'deletion_awaiting_resolution', 'deleted_on_request'])

    // Releasing the first hold completes the first request too.
    await applyHoldAction(deps, adminId, { action: 'release', hold_id: hold.hold_id, reason: 'Released to honour the deletion request' })
    await apply()
    expect((await docRow(d.id)).deletion_reason).toBe('deletion_request')
  })

  test('a deletion request waits for an unfinished paid order at most 14 days, then deletes and stops automated issuance', async () => {
    const owner = await user()
    const d = await doc(owner)
    const pid = await prepared(owner, [d])
    const { submissionId } = await paidOrder(owner, pid)
    expect(await requestEvidenceDeletion(deps, owner, d.id)).toEqual({ ok: true, request: { status: 'open', awaiting: 'paid_order_in_progress', resolution: null } })
    // Once the record is issued, the request completes.
    await issue(submissionId)
    await apply()
    expect((await docRow(d.id)).deletion_reason).toBe('deletion_request')

    const owner2 = await user()
    const d2 = await doc(owner2)
    const pid2 = await prepared(owner2, [d2])
    const order = await paidOrder(owner2, pid2)
    // A request made 15 days ago (inserted by the database operator; the function always stamps the current time).
    await admin.query(`INSERT INTO public.creator_record_v2_deletion_requests (user_id, document_id, status, requested_at) VALUES ($1, $2, 'open', now() - interval '15 days')`, [owner2, d2.id])
    await apply()
    expect((await docRow(d2.id)).deletion_reason).toBe('deletion_request')
    expect((await ledger(order.session)).fulfillment_status).toBe('needs_reconciliation')
  })

  // ── 5. Consent withdrawal ──
  const fakeAdapter = (during?: () => Promise<void>, calls = { n: 0 }): LiveAnthropicAdapter => ({
    createAnthropicReceiptCaller: (o) => async () => {
      calls.n += 1
      if (during) await during()
      return { id: 'msg_live_ret', model: o.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '' }], usage: { input_tokens: 3000, output_tokens: 400 }, parsed_output: OUTPUT } as never
    },
    classifyAnthropicFailure: () => 'server_error',
  })
  const refusalOf = (e: unknown) => CUSTOMER_LIVE_DATABASE_REFUSALS[(e as { message?: string }).message ?? ''] ?? null
  const livePorts: CustomerLivePorts = {
    async getDocument(id) {
      const r = await svc.query('SELECT id, user_id, sha256, media_type, byte_size, state FROM public.creator_record_v2_documents WHERE id = $1', [id])
      return r.rows[0] ? { ...r.rows[0], sha256: String(r.rows[0].sha256).trim() } : null
    },
    async logLiveRead(documentId, owner) {
      try { return Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination') RETURNING id`, [documentId, owner])).rows[0].id) }
      catch (e) { throw new LivePortError('log_read', refusalOf(e)) }
    },
    readObject: async (record) => bytesOf.get(record.id) ?? null,
    async listLiveAttempts(owner, documentId, profileId) {
      const r = await svc.query('SELECT * FROM public.creator_record_v2_live_examination_attempts WHERE user_id = $1 AND document_id = $2 AND profile_id = $3', [owner, documentId, profileId])
      return r.rows.map((x) => ({ ...x, examination_key: String(x.examination_key).trim(), document_sha256: String(x.document_sha256).trim(), envelope_sha256: String(x.envelope_sha256).trim(), access_log_id: Number(x.access_log_id), created_at: iso(x.created_at), executed_at: iso(x.executed_at) }))
    },
    async reserve(logId, profileId, tokens, micro) {
      try { return (await svc.query('SELECT public.creator_record_v2_reserve_customer_live_examination($1, $2, $3, $4) id', [logId, profileId, tokens, micro])).rows[0].id }
      catch (e) { throw new LivePortError('record', refusalOf(e)) }
    },
    async record(reservationId, text) {
      try { return (await svc.query('SELECT attempt_id, result FROM public.creator_record_v2_record_customer_live_examination($1, $2)', [reservationId, text])).rows[0] }
      catch (e) { throw new LivePortError('record', refusalOf(e)) }
    },
    settle: async (reservationId, charged) => Number((await svc.query('SELECT public.creator_record_v2_settle_customer_live_reservation($1, $2) n', [reservationId, charged])).rows[0].n),
  }
  const examine = (owner: string, docId: string, adapter: LiveAnthropicAdapter) =>
    examineCustomerDocumentLive({ ports: livePorts, isKnownSyntheticFixture: () => false, now: () => new Date(), executorOptions: { env: ENV, loadAdapter: async () => adapter } }, owner, docId)
  const attempts = async (docId: string) => (await admin.query('SELECT count(*)::int n FROM public.creator_record_v2_live_examination_attempts WHERE document_id = $1', [docId])).rows[0].n

  test('consent withdrawn while an examination is running: the reading is refused, retries and re-examination never reach the model', async () => {
    const owner = await user()
    const d = await doc(owner)
    const calls = { n: 0 }
    const r = await examine(owner, d.id, fakeAdapter(async () => { await withdrawEvidenceConsent({ retention: retentionPorts(() => svc2) }, owner) }, calls))
    expect(calls.n).toBe(1)  // the read and reservation were taken before the withdrawal
    expect(r.result).toEqual({ kind: 'not_recorded', reason: 'consent_withdrawn' })
    expect(r.settlement.status).toBe('settled')  // the spend is still accounted for
    expect(await attempts(d.id)).toBe(0)

    // Retry: refused at the read, before any byte is read or any model call.
    const again = await examine(owner, d.id, fakeAdapter(undefined, calls))
    expect(again.result).toEqual({ kind: 'not_read', reason: 'consent_withdrawn' })
    expect(calls.n).toBe(1)

    // (The run above is the stale-authorization case: its read was logged and its reservation taken before the withdrawal.)
    // A later document, then a second withdrawal: a read logged before it does not let a reservation or any examination row through.
    const d2 = await doc(owner)  // created after the first withdrawal: fresh consent
    const logId = Number((await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination') RETURNING id`, [d2.id, owner])).rows[0].id)
    expect((await withdrawEvidenceConsent({ retention: retentionPorts(() => svc) }, owner))).toMatchObject({ ok: true, result: 'created' })
    await expect(svc.query(`SELECT public.creator_record_v2_reserve_customer_live_examination($1, 'receipt', 3000, 500000) id`, [logId])).rejects.toThrow('creator_record_v2_consent_withdrawn')
    await expect(svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'live_examination')`, [d2.id, owner])).rejects.toThrow('creator_record_v2_consent_withdrawn')
    for (const table of ['creator_record_v2_live_examination_attempts', 'creator_record_v2_examination_runs', 'creator_record_v2_customer_live_reservations']) {
      await expect(admin.query(`INSERT INTO public.${table} (document_id) VALUES ($1)`, [d2.id])).rejects.toThrow('creator_record_v2_consent_withdrawn')
    }
    // A plain file download by the owner is not AI processing and stays possible.
    await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role, purpose) VALUES ($1, $2, 'owner', 'file_download')`, [d2.id, owner])

    // Withdrawal is append-only and idempotent.
    expect((await withdrawEvidenceConsent({ retention: retentionPorts(() => svc) }, owner))).toMatchObject({ ok: true, result: 'existing' })
    await expect(admin.query('DELETE FROM public.creator_record_v2_consent_withdrawals WHERE user_id = $1', [owner])).rejects.toThrow('append-only')
  })

  test('a document uploaded after a withdrawal (with fresh consent) can be examined; one uploaded before cannot', async () => {
    const owner = await user()
    const before = await doc(owner)
    await withdrawEvidenceConsent({ retention: retentionPorts(() => svc) }, owner)
    await sleep(5)
    const after = await doc(owner)
    expect((await examine(owner, before.id, fakeAdapter())).result).toEqual({ kind: 'not_read', reason: 'consent_withdrawn' })
    expect((await examine(owner, after.id, fakeAdapter())).result.kind).toBe('examined')
  })

  // ── 6. Concurrency ──
  test('expiry during an active examination: the reading is not stored for an original that is gone', async () => {
    const owner = await user()
    const d = await doc(owner, 91)
    const r = await examine(owner, d.id, fakeAdapter(async () => { await retentionPorts(() => svc2).apply(200) }))
    expect(r.result).toEqual({ kind: 'not_recorded', reason: 'document_mismatch' })
    expect(await attempts(d.id)).toBe(0)
    expect((await docRow(d.id)).deletion_reason).toBe('retention_expired')
  })

  test('concurrent sweeps and a concurrent deletion request delete each original exactly once', async () => {
    const owner = await user()
    const docs = await Promise.all([doc(owner, 100), doc(owner, 100), doc(owner, 100)])
    const [a, b, req] = await Promise.all([
      retentionPorts(() => svc).apply(200), retentionPorts(() => svc2).apply(200),
      (async () => { const c = new Client({ connectionString: URL }); await c.connect(); await c.query('SET ROLE service_role'); try { return await retentionPorts(() => c).requestDeletion(owner, docs[0].id) } finally { await c.end() } })(),
    ])
    expect(req.status).toBe('completed')
    for (const d of docs) {
      const row = await docRow(d.id)
      expect(row.state).toBe('deleted')
      expect(['retention_expired', 'deletion_request']).toContain(row.deletion_reason)
    }
    const expiredEvents = (await admin.query(`SELECT count(*)::int n FROM public.creator_record_v2_retention_events WHERE event IN ('retention_expired', 'deleted_on_request') AND document_id = ANY($1)`, [docs.map((d) => d.id)])).rows[0].n
    expect(expiredEvents).toBe(3)
    expect(a.expired + b.expired).toBeLessThanOrEqual(3)
  })

  // ── 7. Failed object removal is detected and recovered ──
  test('a failed object removal fails the sweep, is reported overdue after 7 days and is recovered by a later run', async () => {
    const owner = await user()
    const d = await doc(owner)
    // Deleted 8 days ago by its owner (the database operator back-dates the deletion; the guard leaves deleted_at to the caller).
    await admin.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() - interval '8 days' WHERE id = $1`, [d.id])
    removalFails = true
    alerts.length = 0
    try {
      const failed = await runRetentionSweep(deps)
      expect(failed.ok).toBe(false)
      expect(failed.problems).toEqual(expect.arrayContaining(['object_removal_failed', 'overdue_removal']))
      expect(failed.status!.overdue_removal).toBeGreaterThanOrEqual(1)
      expect(alerts[0].subject).toBe('Creator Record retention sweep needs attention')
      expect(JSON.stringify(alerts)).not.toContain(d.id)  // counts only
      expect(objects.has(d.path)).toBe(true)
    } finally {
      removalFails = false
    }
    const recovered = await runRetentionSweep(deps)
    expect(recovered.problems).not.toContain('object_removal_failed')
    expect(objects.has(d.path)).toBe(false)
    expect((await docRow(d.id)).object_removed_at).not.toBeNull()
    expect(recovered.status!.overdue_removal).toBe(0)
  })

  test('an original past its deadline that no sweep expired is reported overdue', async () => {
    const owner = await user()
    await doc(owner, 98)
    expect((await deps.retention.status()).overdue_expiry).toBeGreaterThanOrEqual(1)
    await apply()
    expect((await deps.retention.status()).overdue_expiry).toBe(0)
  })

  // ── 8. Privilege boundary ──
  test('service_role cannot bypass retention: no direct retention deletion, no writes to the new tables, no internal functions', async () => {
    const owner = await user()
    const d = await doc(owner)
    await prepared(owner, [d])
    await expect(svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now(), deletion_reason = 'retention_expired' WHERE id = $1`, [d.id])).rejects.toThrow('a retention deletion is made only by the retention functions')
    await expect(svc.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [d.id])).rejects.toThrow('a document referenced by a prepared record is retained')
    for (const sql of [
      `INSERT INTO public.creator_record_v2_deletion_requests (user_id, document_id, status) VALUES ('${owner}', '${d.id}', 'open')`,
      `INSERT INTO public.creator_record_v2_consent_withdrawals (user_id, scope, withdrawn_at) VALUES ('${owner}', 'ai_examination', now())`,
      `INSERT INTO public.creator_record_v2_retention_holds (document_id, authorized_by, reason, starts_at, expires_at) VALUES ('${d.id}', '${owner}', '${REASON}', now(), now() + interval '1 day')`,
      `INSERT INTO public.creator_record_v2_retention_events (event) VALUES ('retention_expired')`,
      `SELECT public.creator_record_v2_resolve_deletion_request('${randomUUID()}')`,
      `SELECT public.creator_record_v2_retention_stop_issuance()`,
    ]) await expect(svc.query(sql)).rejects.toThrow(/permission denied/)
    for (const role of ['anon', 'authenticated']) {
      const c = new Client({ connectionString: URL })
      await c.connect()
      await c.query(`SET ROLE ${role}`)
      try {
        await expect(c.query(`SELECT public.creator_record_v2_apply_retention(10)`)).rejects.toThrow(/permission denied/)
        await expect(c.query(`SELECT * FROM public.creator_record_v2_request_document_deletion('${owner}', '${d.id}')`)).rejects.toThrow(/permission denied/)
        await expect(c.query(`SELECT * FROM public.creator_record_v2_withdraw_consent('${owner}')`)).rejects.toThrow(/permission denied/)
      } finally { await c.end() }
    }
    expect((await docRow(d.id)).state).toBe('stored')
  })

  test('an operator-seeded synthetic document is outside the policy (never expired by it)', async () => {
    // Seeded documents can only be created under an operator grant; this checks the selection only.
    const r = (await admin.query(`SELECT pg_get_functiondef('public.creator_record_v2_apply_retention(integer)'::regprocedure) d`)).rows[0].d as string
    expect(r).toContain(`d.origin = 'owner_upload'`)
  })
})
