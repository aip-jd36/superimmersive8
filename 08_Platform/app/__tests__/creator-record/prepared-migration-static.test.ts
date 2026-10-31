/**
 * CR-V2-MVP-M2 — static checks of the prepared-record migration (no database here).
 * Additive only; least privilege; immutable content; prepared -> reviewed only; bind once.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const SQL = readFileSync(path.resolve(__dirname, '../../supabase/migrations/20261101000000_creator_record_v2_prepared.sql'), 'utf8')
const code = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')

test('it is additive: it creates only its own objects and alters no existing table', () => {
  expect(code).not.toMatch(/\bDROP\s+(TABLE|COLUMN|FUNCTION|POLICY)\b/i)
  expect(code).not.toMatch(/\bDELETE\s+FROM\b|\bUPDATE\s+public\.(?!creator_record_v2_)/i)
  const altered = Array.from(code.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\.(\w+)/gi)).map((m) => m[1])
  expect(new Set(altered)).toEqual(new Set(['creator_record_v2_prepared', 'creator_record_v2_pilot_access']))
  const created = Array.from(code.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.(\w+)/gi)).map((m) => m[1])
  expect(created).toEqual(['creator_record_v2_prepared', 'creator_record_v2_pilot_access'])
  expect(code).toMatch(/DROP TRIGGER IF EXISTS creator_record_v2_prepared_guard ON public\.creator_record_v2_prepared/)
})

test('least privilege: RLS on, nothing for anon or authenticated, service role only', () => {
  expect(code).toMatch(/ALTER TABLE public\.creator_record_v2_prepared ENABLE ROW LEVEL SECURITY/)
  expect(code).toMatch(/ALTER TABLE public\.creator_record_v2_pilot_access ENABLE ROW LEVEL SECURITY/)
  expect(code).not.toMatch(/CREATE\s+POLICY/i)
  expect(code).toMatch(/REVOKE ALL ON TABLE public\.creator_record_v2_prepared FROM PUBLIC, anon, authenticated, service_role/)
  expect(code).toMatch(/REVOKE ALL ON TABLE public\.creator_record_v2_pilot_access FROM PUBLIC, anon, authenticated, service_role/)
  const grants = Array.from(code.matchAll(/GRANT\s+([A-Z, ]+)\s+ON\s+TABLE\s+public\.(\w+)\s+TO\s+(\w+)/g)).map((m) => `${m[2]}:${m[1].trim()}:${m[3]}`)
  expect(grants).toEqual(['creator_record_v2_prepared:SELECT, INSERT, UPDATE:service_role', 'creator_record_v2_pilot_access:SELECT:service_role'])
})

test('the prepared record keeps owner, exact content and digest, one version per draft number', () => {
  for (const col of ['user_id', 'draft_id', 'version', 'record_ref', 'record_schema', 'record_schema_version', 'canonical', 'sha256', 'form_state', 'status', 'created_at', 'reviewed_at', 'submission_id']) {
    expect(code).toMatch(new RegExp(`\\n\\s+${col}\\s`))
  }
  expect(code).toMatch(/user_id\s+uuid NOT NULL REFERENCES public\.users\(id\)/)
  expect(code).toMatch(/sha256\s+char\(64\) NOT NULL CHECK \(sha256 ~ '\^\[0-9a-f\]\{64\}\$'\)/)
  expect(code).toMatch(/status\s+text NOT NULL CHECK \(status IN \('prepared', 'reviewed'\)\)/)
  expect(code).toMatch(/UNIQUE \(draft_id, version\)/)
  expect(code).toMatch(/CHECK \(submission_id IS NULL OR status = 'reviewed'\)/)
})

test('the guard keeps content immutable, allows only prepared -> reviewed, binds once and protects reviewed rows', () => {
  expect(code).toMatch(/BEFORE INSERT OR UPDATE OR DELETE ON public\.creator_record_v2_prepared/)
  for (const col of ['user_id', 'draft_id', 'version', 'record_ref', 'record_schema', 'record_schema_version', 'canonical', 'sha256', 'form_state', 'created_at']) {
    expect(code).toMatch(new RegExp(`NEW\\.${col} <> OLD\\.${col}`))
  }
  expect(code).toMatch(/prepared record content is immutable/)
  expect(code).toMatch(/a prepared record may only be marked reviewed/)
  expect(code).toMatch(/a reviewed prepared record is bound once/)
  expect(code).toMatch(/IF OLD\.status = 'reviewed' THEN\s+RAISE EXCEPTION 'reviewed prepared records are immutable'/)
  expect(code).toMatch(/every version of a draft belongs to one owner/)
  expect(code).toMatch(/a prepared record is inserted as prepared, unreviewed and unbound/)
})
