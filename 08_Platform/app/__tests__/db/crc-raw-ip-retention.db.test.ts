/**
 * SI8-PRIVACY-CRC-1B — clear_expired_crc_pilot_raw_ip() on real PostgreSQL (migration 20261118000000 applied verbatim).
 *
 * The table is created with the Production shape of crc_pilot_events (columns read from information_schema, 2026-11-17:
 * id uuid, session_id text, event_type text, detail text, created_at timestamptz, raw_ip text; RLS on; no triggers) and the
 * event_type check from 20260814000000. Synthetic rows only (TEST-NET addresses, RFC 5737). Disposable local `si8_test_*`
 * database only.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'
import { runCrcRawIpRetention, type RawIpRetentionClient } from '@/lib/crc-engine/raw-ip-retention'

const URL = process.env.DATABASE_URL_TEST
const MIGRATION = join(__dirname, '..', '..', 'supabase', 'migrations', '20261118000000_crc_pilot_events_raw_ip_retention.sql')

function assertDisposable(url: string) {
  const u = new globalThis.URL(url)
  if (!u.pathname.replace(/^\//, '').startsWith('si8_test_')) throw new Error('refusing to run: not an si8_test_* database')
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) throw new Error('refusing to run: host is not local')
}
if (process.env.CI && !URL) throw new Error('DATABASE_URL_TEST is required in CI')
const maybe = URL ? describe : describe.skip

const SETUP = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.clear_expired_crc_pilot_raw_ip(integer);
DROP TABLE IF EXISTS public.crc_pilot_events;
CREATE TABLE public.crc_pilot_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT,
  event_type  TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_ip      TEXT,
  CONSTRAINT crc_pilot_events_event_type_values CHECK (event_type IN (
    'retryable_failure', 'persistence_error', 'missing_session', 'skip_question', 'skip_phase', 'stop_interview', 'rate_limited'))
);
ALTER TABLE public.crc_pilot_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.crc_pilot_events TO service_role;
`

type Row = { id: string; session_id: string | null; event_type: string; detail: string | null; created_at: Date; raw_ip: string | null }

maybe('clear_expired_crc_pilot_raw_ip (PostgreSQL, 20261118000000)', () => {
  let admin: Client
  let svc: Client

  async function seed(rows: { days: number; raw_ip: string | null; event_type?: string; session_id?: string; detail?: string }[]) {
    await admin.query('TRUNCATE public.crc_pilot_events')
    for (const r of rows) {
      await admin.query(
        `INSERT INTO public.crc_pilot_events (session_id, event_type, detail, created_at, raw_ip)
         VALUES ($1, $2, $3, now() - make_interval(days => $4::int) - interval '1 minute', $5)`,
        [r.session_id ?? `synthetic-session-${r.days}`, r.event_type ?? 'rate_limited', r.detail ?? `synthetic detail ${r.days}`, r.days, r.raw_ip],
      )
    }
  }
  const all = async (): Promise<Row[]> => (await admin.query('SELECT * FROM public.crc_pilot_events ORDER BY created_at, id')).rows
  const call = async (c: Client, limit?: number) =>
    (await c.query(limit === undefined ? 'SELECT * FROM public.clear_expired_crc_pilot_raw_ip()' : 'SELECT * FROM public.clear_expired_crc_pilot_raw_ip($1)', limit === undefined ? [] : [limit])).rows[0]

  beforeAll(async () => {
    assertDisposable(URL!)
    admin = new Client({ connectionString: URL })
    await admin.connect()
    await admin.query(SETUP)
    await admin.query(readFileSync(MIGRATION, 'utf8'))
    svc = new Client({ connectionString: URL })
    await svc.connect()
    await svc.query('SET ROLE service_role')
  })
  afterAll(async () => {
    await svc?.end()
    await admin?.end()
  })

  test('younger than 30 days keeps its raw IP; older than 30 days is cleared; the rows and other columns stay', async () => {
    await seed([
      { days: 1, raw_ip: '203.0.113.1' },
      { days: 29, raw_ip: '203.0.113.29' },
      { days: 31, raw_ip: '198.51.100.31' },
      { days: 95, raw_ip: '198.51.100.95' },
    ])
    const before = await all()
    expect(await call(svc)).toEqual({ cleared: 2, remaining_expired: 0 })
    const after = await all()
    expect(after).toHaveLength(4)
    const byDays = (rows: Row[], ip: string) => rows.find((r) => r.detail === `synthetic detail ${ip}`)!
    for (const d of ['1', '29']) expect(byDays(after, d).raw_ip).toBe(byDays(before, d).raw_ip)
    for (const d of ['31', '95']) expect(byDays(after, d).raw_ip).toBeNull()
    // Every other column, and every row, unchanged.
    const strip = (rows: Row[]) => rows.map(({ raw_ip: _ignored, ...rest }) => rest)
    expect(strip(after)).toEqual(strip(before))
  })

  test('an already-cleared old row and rows with no IP stay unchanged; repeated runs change nothing further', async () => {
    await seed([
      { days: 40, raw_ip: null },
      { days: 50, raw_ip: '198.51.100.50' },
      { days: 2, raw_ip: null, event_type: 'persistence_error' },
    ])
    expect(await call(svc)).toEqual({ cleared: 1, remaining_expired: 0 })
    const once = await all()
    expect(await call(svc)).toEqual({ cleared: 0, remaining_expired: 0 })
    expect(await call(svc)).toEqual({ cleared: 0, remaining_expired: 0 })
    expect(await all()).toEqual(once)
    expect(once.every((r) => r.raw_ip === null)).toBe(true)
  })

  test('bounded: at most p_limit rows per call, oldest first, and the remainder is reported', async () => {
    await seed([
      { days: 60, raw_ip: '198.51.100.60' },
      { days: 50, raw_ip: '198.51.100.50' },
      { days: 40, raw_ip: '198.51.100.40' },
    ])
    expect(await call(svc, 2)).toEqual({ cleared: 2, remaining_expired: 1 })
    const rows = await all()
    expect(rows.map((r) => r.raw_ip)).toEqual([null, null, '198.51.100.40'])
    expect(await call(svc, 2)).toEqual({ cleared: 1, remaining_expired: 0 })
  })

  test.each([[0], [-1], [10001]])('an out-of-range limit (%i) is refused without changing anything', async (limit) => {
    await seed([{ days: 45, raw_ip: '198.51.100.45' }])
    await expect(call(svc, limit)).rejects.toMatchObject({ code: '22023' })
    expect((await all())[0].raw_ip).toBe('198.51.100.45')
  })

  test('only the service role may run it', async () => {
    await seed([{ days: 45, raw_ip: '198.51.100.45' }])
    for (const role of ['anon', 'authenticated']) {
      const c = new Client({ connectionString: URL })
      await c.connect()
      try {
        await c.query(`SET ROLE ${role}`)
        await expect(c.query('SELECT * FROM public.clear_expired_crc_pilot_raw_ip()')).rejects.toMatchObject({ code: '42501' })
      } finally {
        await c.end()
      }
    }
    expect((await all())[0].raw_ip).toBe('198.51.100.45')
  })

  test('end to end through the app runner: counts only, no address in the result', async () => {
    await seed([{ days: 33, raw_ip: '198.51.100.33' }, { days: 3, raw_ip: '203.0.113.3' }])
    const viaPg: RawIpRetentionClient = {
      rpc: async (_fn, args) => {
        try {
          return { data: (await svc.query('SELECT * FROM public.clear_expired_crc_pilot_raw_ip($1)', [args.p_limit])).rows, error: null }
        } catch (e) {
          return { data: null, error: { code: (e as { code?: string }).code } }
        }
      },
    }
    const report = await runCrcRawIpRetention(viaPg)
    expect(report).toEqual({ ok: true, cleared: 1, remaining_expired: 0 })
    expect(JSON.stringify(report)).not.toMatch(/\d+\.\d+\.\d+\.\d+/)
    expect((await all()).map((r) => r.raw_ip)).toEqual([null, '203.0.113.3'])
  })
})
