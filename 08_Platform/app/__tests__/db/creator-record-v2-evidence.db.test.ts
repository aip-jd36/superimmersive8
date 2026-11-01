/**
 * CR-V2-DOC-1 — real PostgreSQL tests for 20261103000000_creator_record_v2_evidence.sql, applied verbatim
 * after the payment ledger, artifacts, M2 and M3 migrations (deploy order).
 *
 * Covers: least privilege (no client access; the service role cannot write references or alter the access
 * log); the document life cycle (pending → stored → deleted, immutable content, only pending rows removable);
 * one live row per creator and SHA-256; references derived by the database from each prepared version's own
 * record, refusing foreign, unstored or altered documents; referenced documents retained; the bucket.
 *
 * Disposable local `si8_test_*` database only. Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const DIR = join(__dirname, '..', '..', 'supabase', 'migrations')
const MIGRATIONS = [
  '20261021000000_payment_fulfillments.sql',
  '20261022000000_payment_zero_total_paid.sql',
  '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql',
  '20261102000000_creator_record_v2_submission_binding.sql',
  '20261103000000_creator_record_v2_evidence.sql',
].map((f) => join(DIR, f))
const BOOTSTRAP = join(__dirname, 'bootstrap.sql')

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the creator record v2 evidence DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const errCode = async (p: Promise<unknown>) => {
  try {
    await p
    return 'no error'
  } catch (e) {
    return (e as { code?: string }).code ?? 'unknown'
  }
}
const SHA = (c: string) => c.repeat(64)

maybe('creator record v2 evidence intake (PostgreSQL)', () => {
  let admin: Client
  let svc: Client
  const extra: Client[] = []
  async function connect(role: 'service_role' | 'anon' | 'authenticated'): Promise<Client> {
    const c = new Client({ connectionString: URL })
    await c.connect()
    await c.query(`SET ROLE ${role}`)
    extra.push(c)
    return c
  }
  async function user() {
    const id = randomUUID()
    await admin.query('INSERT INTO public.users (id, email, name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, 'Tester'])
    return id
  }
  async function pendingDoc(c: Client, userId: string, sha = SHA('a')) {
    const id = randomUUID()
    await c.query(
      `INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
       VALUES ($1, $2, $3, 'application/pdf', 1234, 'receipt.pdf', $4, 'DRAFT-UNAPPROVED-test', 'pending')`,
      [id, userId, sha, `${userId}/${id}`],
    )
    return id
  }
  const store = (c: Client, id: string) => c.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', stored_at = now() WHERE id = $1`, [id])
  const del = (c: Client, id: string) => c.query(`UPDATE public.creator_record_v2_documents SET state = 'deleted', deleted_at = now() WHERE id = $1`, [id])
  async function storedDoc(userId: string, sha = SHA('a')) {
    const id = await pendingDoc(svc, userId, sha)
    await store(svc, id)
    return id
  }
  async function prepared(c: Client, userId: string, items: { document_id: string; sha256: string }[], opts: { draftId?: string; version?: number } = {}) {
    const id = randomUUID()
    const canonical = JSON.stringify({ documents: { policy: 'inventory_only', items } })
    await c.query(
      `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
       VALUES ($1, $2, $3, $4, $5, 'si8/creator-record-v2-record', 5, $6, $7, '{"answers":{}}'::jsonb, 'prepared')`,
      [id, userId, opts.draftId ?? randomUUID(), opts.version ?? 1, `PREP-${id}`, canonical, SHA('c')],
    )
    return id
  }
  const links = async (preparedId: string) => (await admin.query('SELECT document_id, sha256 FROM public.creator_record_v2_prepared_documents WHERE prepared_id = $1', [preparedId])).rows

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(BOOTSTRAP, 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of MIGRATIONS) await admin.query(readFileSync(m, 'utf8'))
    svc = await connect('service_role')
  })
  afterAll(async () => {
    for (const c of extra) await c.end().catch(() => undefined)
    await admin?.end()
  })

  test('the bucket is private: PDF, PNG and JPEG only, 4 MB', async () => {
    const b = (await admin.query(`SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'creator-record-evidence'`)).rows[0]
    expect(b).toEqual({ public: false, file_size_limit: '4194304', allowed_mime_types: ['application/pdf', 'image/png', 'image/jpeg'] })
  })

  test('least privilege: no client access; the service role cannot write references or alter the access log', async () => {
    const u = await user()
    const id = await storedDoc(u, SHA('b'))
    for (const role of ['anon', 'authenticated'] as const) {
      const c = await connect(role)
      expect(await errCode(c.query('SELECT * FROM public.creator_record_v2_documents'))).toBe('42501')
      expect(await errCode(c.query('SELECT * FROM public.creator_record_v2_prepared_documents'))).toBe('42501')
      expect(await errCode(c.query('SELECT * FROM public.creator_record_v2_evidence_access_log'))).toBe('42501')
    }
    expect(await errCode(svc.query('INSERT INTO public.creator_record_v2_prepared_documents (prepared_id, document_id, sha256) VALUES ($1, $2, $3)', [randomUUID(), id, SHA('b')]))).toBe('42501')
    await svc.query(`INSERT INTO public.creator_record_v2_evidence_access_log (document_id, actor_user_id, actor_role) VALUES ($1, $2, 'admin')`, [id, u])
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_evidence_access_log SET actor_role = 'owner'`))).toBe('42501')
    expect(await errCode(svc.query('DELETE FROM public.creator_record_v2_evidence_access_log'))).toBe('42501')
    expect(await errCode(admin.query(`UPDATE public.creator_record_v2_evidence_access_log SET actor_role = 'owner'`))).toBe('P0001') // append-only even for the owner role
    for (const fn of ['creator_record_v2_documents_guard', 'creator_record_v2_prepared_documents_link', 'creator_record_v2_append_only_guard']) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        expect((await admin.query(`SELECT has_function_privilege($1, 'public.' || $2 || '()', 'EXECUTE') AS ok`, [role, fn])).rows[0].ok).toBe(false)
      }
    }
    const rls = (await admin.query(`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('creator_record_v2_documents', 'creator_record_v2_prepared_documents', 'creator_record_v2_evidence_access_log') ORDER BY relname`)).rows
    expect(rls.every((r: { relrowsecurity: boolean }) => r.relrowsecurity)).toBe(true)
  })

  test('life cycle: inserted pending; content immutable; pending → stored → deleted; only a pending row can be removed', async () => {
    const u = await user()
    const early = randomUUID()
    expect(await errCode(svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state, stored_at)
      VALUES ($1, $2, $3, 'application/pdf', 1, 'x', $4, 'c', 'stored', now())`, [early, u, SHA('d'), `${u}/${early}`]))).toBe('P0001')
    const badPath = randomUUID()
    expect(await errCode(svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
      VALUES ($1, $2, $3, 'application/pdf', 1, 'x', 'elsewhere/x', 'c', 'pending')`, [badPath, u, SHA('d')]))).toBe('23514')
    const html = randomUUID()
    expect(await errCode(svc.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
      VALUES ($1, $2, $3, 'text/html', 1, 'x', $4, 'c', 'pending')`, [html, u, SHA('d'), `${u}/${html}`]))).toBe('23514')

    const id = await pendingDoc(svc, u, SHA('d'))
    expect(await errCode(del(svc, id))).toBe('P0001') // pending → deleted is not a transition
    await store(svc, id)
    for (const set of [`sha256 = '${SHA('e')}'`, `byte_size = 9`, `file_name = 'renamed.pdf'`, `storage_path = 'x'`, `user_id = '${await user()}'`, `consent_version = 'other'`, `state = 'pending', stored_at = NULL`]) {
      expect(await errCode(svc.query(`UPDATE public.creator_record_v2_documents SET ${set} WHERE id = $1`, [id]))).not.toBe('no error')
    }
    expect(await errCode(svc.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [id]))).toBe('P0001')
    await del(svc, id)
    await svc.query('UPDATE public.creator_record_v2_documents SET object_removed_at = now() WHERE id = $1', [id])
    expect(await errCode(svc.query(`UPDATE public.creator_record_v2_documents SET state = 'stored', deleted_at = NULL WHERE id = $1`, [id]))).not.toBe('no error')
    expect(await errCode(svc.query('UPDATE public.creator_record_v2_documents SET object_removed_at = now() + interval \'1 day\' WHERE id = $1', [id]))).toBe('P0001')

    const abandoned = await pendingDoc(svc, u, SHA('f'))
    expect((await svc.query('DELETE FROM public.creator_record_v2_documents WHERE id = $1', [abandoned])).rowCount).toBe(1)
  })

  test('one live document per creator and SHA-256 (concurrent duplicates converge); deleted content may be added again', async () => {
    const u = await user()
    const v = await user()
    const a = await connect('service_role')
    const b = await connect('service_role')
    const results = await Promise.allSettled([pendingDoc(a, u, SHA('1')), pendingDoc(b, u, SHA('1'))])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected' && (r.reason as { code?: string }).code === '23505')).toHaveLength(1)
    expect((await pendingDoc(svc, v, SHA('1'))).length).toBe(36) // another creator is independent
    const live = (await admin.query(`SELECT id FROM public.creator_record_v2_documents WHERE user_id = $1 AND sha256 = $2`, [u, SHA('1')])).rows[0].id
    await store(svc, live)
    await del(svc, live)
    expect((await pendingDoc(svc, u, SHA('1'))).length).toBe(36)
  })

  test('references are derived from the prepared record and refuse foreign, unstored or altered documents', async () => {
    const u = await user()
    const other = await user()
    const mine = await storedDoc(u, SHA('2'))
    const theirs = await storedDoc(other, SHA('3'))
    const pending = await pendingDoc(svc, u, SHA('4'))
    const gone = await storedDoc(u, SHA('5'))
    await del(svc, gone)

    const ok = await prepared(svc, u, [{ document_id: mine, sha256: SHA('2') }])
    expect(await links(ok)).toEqual([{ document_id: mine, sha256: SHA('2') }])
    expect(await links(await prepared(svc, u, []))).toEqual([])

    for (const items of [
      [{ document_id: theirs, sha256: SHA('3') }],
      [{ document_id: pending, sha256: SHA('4') }],
      [{ document_id: gone, sha256: SHA('5') }],
      [{ document_id: mine, sha256: SHA('9') }],
      [{ document_id: randomUUID(), sha256: SHA('2') }],
    ]) expect(await errCode(prepared(svc, u, items))).toBe('P0001')
    // A refused version leaves nothing behind.
    expect((await admin.query('SELECT count(*)::int AS n FROM public.creator_record_v2_prepared WHERE user_id = $1', [u])).rows[0].n).toBe(2)
  })

  test('a referenced document is retained; removing an unreviewed version releases it; a reviewed version keeps it for good', async () => {
    const u = await user()
    const id = await storedDoc(u, SHA('6'))
    const draft = randomUUID()
    const p1 = await prepared(svc, u, [{ document_id: id, sha256: SHA('6') }], { draftId: draft })
    expect(await errCode(del(svc, id))).toBe('P0001')
    await admin.query('DELETE FROM public.creator_record_v2_prepared WHERE id = $1', [p1]) // unreviewed: allowed by the M2 guard
    expect(await links(p1)).toEqual([])
    const p2 = await prepared(svc, u, [{ document_id: id, sha256: SHA('6') }])
    await svc.query(`UPDATE public.creator_record_v2_prepared SET status = 'reviewed', reviewed_at = now() WHERE id = $1`, [p2])
    expect(await errCode(admin.query('DELETE FROM public.creator_record_v2_prepared WHERE id = $1', [p2]))).toBe('P0001')
    expect(await errCode(del(svc, id))).toBe('P0001')
    expect(await errCode(admin.query('DELETE FROM public.creator_record_v2_prepared_documents WHERE prepared_id = $1', [p2]))).toBe('P0001')
    expect((await admin.query('SELECT state FROM public.creator_record_v2_documents WHERE id = $1', [id])).rows[0].state).toBe('stored')
  })

  test('CR-V2-DOC-1B: the per-creator cap holds under concurrent inserts from separate connections (24 live, deleted rows do not count)', async () => {
    const u = await user()
    const conns = await Promise.all(Array.from({ length: 30 }, () => connect('service_role')))
    const results = await Promise.allSettled(conns.map((c, i) => pendingDoc(c, u, (i + 10).toString(16).padStart(64, '0'))))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(24)
    expect(results.filter((r) => r.status === 'rejected').map((r) => ((r as PromiseRejectedResult).reason as { code?: string }).code)).toEqual(Array(6).fill('S8EQ1'))
    const one = (await admin.query(`SELECT id FROM public.creator_record_v2_documents WHERE user_id = $1 LIMIT 1`, [u])).rows[0].id
    expect(await errCode(pendingDoc(svc, u, SHA('9')))).toBe('S8EQ1')
    await store(svc, one)
    await del(svc, one)
    expect((await pendingDoc(svc, u, SHA('9'))).length).toBe(36) // a deleted document frees its slot
  })

  test('CR-V2-DOC-1B: a delete racing a prepared-version reference never leaves a deleted document referenced', async () => {
    const u = await user()
    const id = await storedDoc(u, SHA('7'))
    const a = await connect('service_role')
    const b = await connect('service_role')
    // A references the document inside an open transaction (the link trigger locks the row FOR SHARE).
    await a.query('BEGIN')
    const preparedId = randomUUID()
    await a.query(
      `INSERT INTO public.creator_record_v2_prepared (id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status)
       VALUES ($1, $2, $3, 1, $4, 'si8/creator-record-v2-record', 5, $5, $6, '{"answers":{}}'::jsonb, 'prepared')`,
      [preparedId, u, randomUUID(), `PREP-${preparedId}`, JSON.stringify({ documents: { items: [{ document_id: id, sha256: SHA('7') }] } }), SHA('c')],
    )
    // B tries to delete it concurrently: it must wait for A, then see the reference and refuse.
    const deleting = errCode(del(b, id))
    await new Promise((r) => setTimeout(r, 150))
    await a.query('COMMIT')
    expect(await deleting).toBe('P0001')
    expect((await admin.query('SELECT state FROM public.creator_record_v2_documents WHERE id = $1', [id])).rows[0].state).toBe('stored')
    expect(await links(preparedId)).toEqual([{ document_id: id, sha256: SHA('7') }])

    // The opposite order: B deletes first (open transaction), A references it: A waits, then sees it deleted and refuses.
    const id2 = await storedDoc(u, SHA('8'))
    await b.query('BEGIN')
    await del(b, id2)
    const referencing = errCode(prepared(a, u, [{ document_id: id2, sha256: SHA('8') }]))
    await new Promise((r) => setTimeout(r, 150))
    await b.query('COMMIT')
    expect(await referencing).toBe('P0001')
  })
})

