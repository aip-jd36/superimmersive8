/**
 * CR-V2-UAT-PROD-MIN-1 — real PostgreSQL tests for invite_pilot_user.sql / remove_pilot_user.sql (operator scripts for
 * the identity-scoped synthetic UAT), on the schema through 20261106000000 with Production-shaped and staging-shaped
 * assessments stubs. Proves: placeholders, malformed and mismatched targets refused; only a dedicated, history-free,
 * non-admin identity is invited; exactly one invitation is removed, only one this script created; nothing else changes.
 *
 * STUB: the assessments row that tells Production from staging. Disposable local `si8_test_*` database only.
 * Skipped without DATABASE_URL_TEST (required in CI).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { Client } from 'pg'

const URL = process.env.DATABASE_URL_TEST
const APP = join(__dirname, '..', '..')
const DIR = join(APP, 'supabase', 'migrations')
const OPERATOR = join(APP, 'supabase', 'operator', 'creator-record-v2-uat')
const CHAIN = [
  '20261021000000_payment_fulfillments.sql', '20261022000000_payment_zero_total_paid.sql', '20261028000000_creator_record_artifacts.sql',
  '20261101000000_creator_record_v2_prepared.sql', '20261102000000_creator_record_v2_submission_binding.sql', '20261103000000_creator_record_v2_evidence.sql',
  '20261104000000_creator_record_v2_examination_runs.sql', '20261105000000_creator_record_v2_operator_synthetic_uat.sql', '20261106000000_creator_record_v2_customer_path_uat.sql',
].map((f) => join(DIR, f))
const PROD_REF = 'lehqgcgnenwdmuzudbrs'
const STAGING_REF = 'stagingprojectref000'

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  const db = u.pathname.replace(/^\//, '')
  if (!db.startsWith('si8_test_')) throw new Error(`refusing to run: database "${db}" is not si8_test_*`)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error(`refusing to run: host "${u.hostname}" is not a local disposable database`)
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI — the UAT pilot-invite DB suite must not be skipped')
const maybe = URL ? describe : describe.skip

const fail = async (p: Promise<unknown>) => { try { await p; return '' } catch (e) { return (e as Error).message } }
const setConst = (sql: string, name: string, value: string) => {
  const re = new RegExp(`(${name}\\s+constant text\\s+:= )'EDIT:(?:[^']|'')*'`)
  if (!re.test(sql)) throw new Error(`constant ${name} not found`)
  return sql.replace(re, `$1'${value.replace(/'/g, "''")}'`)
}

maybe('synthetic UAT pilot invitation scripts (PostgreSQL)', () => {
  let admin: Client
  const invite = (o: { target?: string; ref?: string; email: string }) => {
    let s = readFileSync(join(OPERATOR, 'invite_pilot_user.sql'), 'utf8')
    for (const [k, v] of Object.entries({ c_target: o.target ?? 'production', c_project_ref: o.ref ?? PROD_REF, c_test_user_email: o.email, c_added_by: 'db test operator', c_change_ref: 'TEST-UAT-MIN' })) s = setConst(s, k, v)
    return admin.query(s)
  }
  const remove = (o: { target?: string; ref?: string; email: string }) => {
    let s = readFileSync(join(OPERATOR, 'remove_pilot_user.sql'), 'utf8')
    for (const [k, v] of Object.entries({ c_target: o.target ?? 'production', c_project_ref: o.ref ?? PROD_REF, c_test_user_email: o.email })) s = setConst(s, k, v)
    return admin.query(s)
  }
  async function user(o: { admin?: boolean } = {}) {
    const id = randomUUID()
    const email = `uat-${id}@example.test`
    await admin.query('INSERT INTO public.users (id, email, name, is_admin) VALUES ($1, $2, $3, $4)', [id, email, 'Tester', o.admin ?? false])
    return { id, email }
  }
  const invited = async (id: string) => (await admin.query('SELECT count(*) n FROM public.creator_record_v2_pilot_access WHERE user_id = $1', [id])).rows[0].n === '1'
  const setShape = (methodology: string) => admin.query(`DELETE FROM public.assessments; INSERT INTO public.assessments VALUES ('ASSESS-005-2026-07-12', '${methodology}', true)`)

  beforeAll(async () => {
    assertDisposable(URL as string)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query('DROP SCHEMA IF EXISTS public CASCADE')
    await admin.query('CREATE SCHEMA public')
    await admin.query(readFileSync(join(__dirname, 'bootstrap.sql'), 'utf8'))
    await admin.query('DROP SCHEMA IF EXISTS storage CASCADE')
    await admin.query('CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean, file_size_limit bigint, allowed_mime_types text[])')
    for (const m of CHAIN) await admin.query(readFileSync(m, 'utf8'))
    await admin.query('CREATE TABLE public.assessments (assessment_number text PRIMARY KEY, methodology_version text, is_system_test boolean)')
    await setShape('SI8 Reviewer Manual v0.1') // Production-shaped
  })
  afterAll(async () => { await admin?.end() })

  test('placeholders, malformed or mismatched targets are refused; nothing is written', async () => {
    expect(await fail(admin.query(readFileSync(join(OPERATOR, 'invite_pilot_user.sql'), 'utf8')))).toBe('REFUSED: edit every EDIT constant first')
    expect(await fail(admin.query(readFileSync(join(OPERATOR, 'remove_pilot_user.sql'), 'utf8')))).toBe('REFUSED: edit every EDIT constant first')
    const u = await user()
    expect(await fail(invite({ email: u.email, ref: STAGING_REF }))).toBe('REFUSED: a production invitation must name the Production project ref')
    expect(await fail(invite({ email: u.email, target: 'staging', ref: STAGING_REF }))).toBe('REFUSED: this database does not look like the staging database')
    expect(await fail(invite({ email: u.email, target: 'staging', ref: PROD_REF }))).toBe('REFUSED: a staging invitation can never name the Production project ref')
    expect(await fail(invite({ email: 'nobody@example.test' }))).toBe('REFUSED: exactly one user must have that email (found 0)')
    expect(await invited(u.id)).toBe(false)
  })

  test('only a dedicated, history-free, non-admin identity is invited, once', async () => {
    const a = await user({ admin: true })
    expect(await fail(invite({ email: a.email }))).toBe('REFUSED: the identity is an admin')
    const withDoc = await user()
    const docId = randomUUID()
    await admin.query(`INSERT INTO public.creator_record_v2_documents (id, user_id, sha256, media_type, byte_size, file_name, storage_path, consent_version, state)
                       VALUES ($1, $2, $3, 'application/pdf', 10, 'r', $4, 'DRAFT-UNAPPROVED-cr-v2-evidence-storage-consent-0', 'pending')`, [docId, withDoc.id, 'b'.repeat(64), `${withDoc.id}/${docId}`])
    expect(await fail(invite({ email: withDoc.email }))).toBe('REFUSED: the identity has history (submission, prepared record, live document or UAT grant); use a fresh identity')
    const ok = await user()
    expect(await fail(invite({ email: ok.email }))).toBe('')
    expect(await invited(ok.id)).toBe(true)
    expect(await fail(invite({ email: ok.email }))).toBe('REFUSED: the identity is already invited')
  })

  test('remove deletes exactly that one script-created invitation and nothing else; a manual invitation is not touched', async () => {
    const u = await user()
    await invite({ email: u.email })
    const other = await user()
    await admin.query(`INSERT INTO public.creator_record_v2_pilot_access (user_id, added_by, reason) VALUES ($1, 'someone', 'a real pilot creator')`, [other.id])
    const before = Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_pilot_access')).rows[0].n)
    expect(await fail(remove({ email: u.email }))).toBe('')
    expect(await invited(u.id)).toBe(false)
    expect(Number((await admin.query('SELECT count(*) n FROM public.creator_record_v2_pilot_access')).rows[0].n)).toBe(before - 1)
    expect(await fail(remove({ email: u.email }))).toBe('REFUSED: no synthetic UAT invitation for that identity (removed 0); nothing changed')
    expect(await fail(remove({ email: other.email }))).toBe('REFUSED: no synthetic UAT invitation for that identity (removed 0); nothing changed')
    expect(await invited(other.id)).toBe(true)
    expect(await fail(remove({ email: u.email, ref: STAGING_REF }))).toBe('REFUSED: this database does not look like Production')
  })

  test('on a staging-shaped database the staging target works and the production target is refused', async () => {
    await setShape('STAGING-PLACEHOLDER')
    const u = await user()
    expect(await fail(invite({ email: u.email }))).toBe('REFUSED: this database does not look like Production')
    expect(await fail(invite({ email: u.email, target: 'staging', ref: STAGING_REF }))).toBe('')
    expect(await fail(remove({ email: u.email, target: 'staging', ref: STAGING_REF }))).toBe('')
    await setShape('SI8 Reviewer Manual v0.1')
  })
})
