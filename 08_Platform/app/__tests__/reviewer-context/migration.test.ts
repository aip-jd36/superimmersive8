/**
 * CAH-4C §5 / §11 — source guards on the crc_context_access_events migration.
 * Confirms the append-only audit contract, RLS/grant posture, CHECK vocabulary,
 * no FK, and only the two justified indexes — WITHOUT executing Postgres.
 */

import * as fs from 'fs'
import * as path from 'path'

const sql = fs.readFileSync(
  path.join(__dirname, '..', '..', 'supabase', 'migrations', '20260909010000_reviewer_crc_context_access_events.sql'),
  'utf-8',
)
const flat = sql.replace(/\s+/g, ' ')
// executable SQL only — the doc comment legitimately NAMES other tables while
// explaining what this migration deliberately does NOT do.
const code = sql
  .split(/\r?\n/)
  .map((l) => l.replace(/--.*/, ''))
  .join('\n')
const codeFlat = code.replace(/\s+/g, ' ')

test('creates exactly the crc_context_access_events table (additive; IF NOT EXISTS)', () => {
  expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS crc_context_access_events/)
  const creates = sql.match(/CREATE TABLE/g) ?? []
  expect(creates.length).toBe(1)
})

test('columns: id / access_kind / actor_user_id / submission_id / association_id / crc_session_id / created_at', () => {
  for (const col of [
    'id             UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    'access_kind    TEXT NOT NULL',
    'actor_user_id  UUID NOT NULL',
    'submission_id  UUID NOT NULL',
    'association_id UUID',
    'crc_session_id UUID',
    'created_at     TIMESTAMPTZ NOT NULL DEFAULT now()',
  ]) {
    expect(sql).toContain(col)
  }
})

test('governed access_kind vocabulary — only "transcript" today', () => {
  expect(flat).toMatch(/CHECK \(access_kind IN \('transcript'\)\)/)
  // no speculative future values baked in
  expect(flat).not.toMatch(/'lk_research'|'living_knowledge'|'project_context'/)
})

test("a 'transcript' access is association- AND session-scoped (CHECK)", () => {
  expect(flat).toMatch(
    /CHECK \( access_kind <> 'transcript' OR \(association_id IS NOT NULL AND crc_session_id IS NOT NULL\) \)/,
  )
})

test('append-only: no FK, no UPDATE/DELETE trigger, no updated_at column', () => {
  expect(code).not.toMatch(/REFERENCES/)
  expect(code).not.toMatch(/ON DELETE/)
  expect(code).not.toMatch(/updated_at/)
  expect(code).not.toMatch(/CREATE TRIGGER/)
})

test('RLS enabled with ZERO policies; service_role-only grant', () => {
  expect(sql).toMatch(/ALTER TABLE crc_context_access_events ENABLE ROW LEVEL SECURITY/)
  expect(sql).not.toMatch(/CREATE POLICY/)
  expect(sql).toMatch(/GRANT ALL ON public\.crc_context_access_events TO service_role/)
  // no grant to anon / authenticated
  expect(sql).not.toMatch(/GRANT[^;]*TO (anon|authenticated)/)
})

test('only the two justified indexes (submission, association), association index partial on NOT NULL', () => {
  const idx = sql.match(/CREATE INDEX[^;]+;/g) ?? []
  expect(idx.length).toBe(2)
  expect(flat).toMatch(/crc_context_access_events_submission_idx ON crc_context_access_events \(submission_id, created_at DESC\)/)
  expect(flat).toMatch(/crc_context_access_events_association_idx ON crc_context_access_events \(association_id, created_at DESC\) WHERE association_id IS NOT NULL/)
})

test('no unrelated schema change — touches only the new table', () => {
  expect(code).not.toMatch(/ALTER TABLE (?!crc_context_access_events)/)
  expect(code).not.toMatch(/DROP TABLE (?!IF EXISTS crc_context_access_events)/)
  expect(code).not.toMatch(/crc_sessions|crc_sales|assessments|submissions|workbook/)
})
