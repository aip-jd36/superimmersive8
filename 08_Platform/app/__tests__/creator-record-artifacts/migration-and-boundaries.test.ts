/**
 * CR-ARTIFACT-1 — static checks: the migration is additive and private, and
 * the new module stays inside its boundaries (no assurance semantics, no
 * public bucket, no change to the fulfilment runner or the legacy generator).
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const APP = path.resolve(__dirname, '..', '..')
const read = (rel: string) => readFileSync(path.join(APP, rel), 'utf8')
const SQL = read('supabase/migrations/20261028000000_creator_record_artifacts.sql')
const code = SQL.replace(/--.*$/gm, '')

describe('migration (additive, private)', () => {
  test('creates a PRIVATE pdf-only bucket and never changes an existing one', () => {
    expect(code).toMatch(/INSERT INTO storage\.buckets[\s\S]*'creator-records', 'creator-records', false, 10485760, ARRAY\['application\/pdf'\]\)\s*ON CONFLICT \(id\) DO NOTHING/)
    expect(code).not.toMatch(/UPDATE\s+storage\.buckets|'documents'|report-pdfs|signed-assets/i)
  })

  test('additive only: no DROP, ALTER of an existing table, DELETE or policy change', () => {
    expect(code).not.toMatch(/\bDROP\s+(TABLE|COLUMN|POLICY|BUCKET)\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
    expect(code).not.toMatch(/CREATE\s+POLICY|ALTER\s+POLICY/i)
    const altered = Array.from(code.matchAll(/ALTER TABLE\s+([\w.]+)/gi)).map((m) => m[1])
    expect(new Set(altered)).toEqual(new Set(['public.creator_record_artifacts', 'public.creator_record_artifact_uat']))
    expect(code).not.toMatch(/rights_packages|payment_fulfillments|submissions\s+ADD|ALTER TABLE public\.submissions/i)
  })

  test('the artifact table enforces identity, digest, status and path shape; RLS on, no policies', () => {
    expect(code).toMatch(/submission_id\s+uuid NOT NULL UNIQUE/)
    expect(code).toMatch(/record_id\s+text NOT NULL UNIQUE/)
    expect(code).toMatch(/storage_path\s+text NOT NULL UNIQUE/)
    expect(code).toMatch(/sha256 ~ '\^\[0-9a-f\]\{64\}\$'/)
    expect(code).toMatch(/status IN \('pending', 'issued'\)/)
    expect(code).toMatch(/CHECK \(storage_path = submission_id::text \|\| '\/' \|\| attempt_id::text \|\| '\.pdf'\)/)
    expect(code).toMatch(/ALTER TABLE public\.creator_record_artifacts ENABLE ROW LEVEL SECURITY/)
    expect(code).toMatch(/ALTER TABLE public\.creator_record_artifact_uat ENABLE ROW LEVEL SECURITY/)
  })

  test('issued rows are immutable in the database (update and delete refused)', () => {
    expect(code).toMatch(/BEFORE UPDATE OR DELETE ON public\.creator_record_artifacts/)
    expect(code).toMatch(/IF OLD\.status = 'issued' THEN\s+RAISE EXCEPTION 'issued creator record artifacts are immutable'/)
  })

  test('CR-ARTIFACT-1J: least privilege — revoke everything from every API role, then grant service_role only what the code uses', () => {
    const grants = Array.from(code.matchAll(/^\s*(REVOKE|GRANT)\b[^;]*;/gim)).map((m) => m[0].trim().replace(/\s+/g, ' '))
    expect(grants).toEqual([
      'REVOKE ALL ON TABLE public.creator_record_artifacts FROM PUBLIC, anon, authenticated, service_role;',
      'REVOKE ALL ON TABLE public.creator_record_artifact_uat FROM PUBLIC, anon, authenticated, service_role;',
      'REVOKE ALL ON FUNCTION public.creator_record_artifacts_guard() FROM PUBLIC, anon, authenticated, service_role;',
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.creator_record_artifacts TO service_role;',
      'GRANT SELECT ON TABLE public.creator_record_artifact_uat TO service_role;',
    ])
    // The revokes come after every CREATE they apply to, so default grants are removed, not pre-empted.
    expect(code.indexOf('REVOKE ALL ON TABLE public.creator_record_artifact_uat')).toBeGreaterThan(code.indexOf('CREATE TABLE IF NOT EXISTS public.creator_record_artifact_uat'))
    expect(code.indexOf('REVOKE ALL ON FUNCTION')).toBeGreaterThan(code.indexOf('CREATE OR REPLACE FUNCTION public.creator_record_artifacts_guard'))
  })

  test('the application never deletes, upserts or writes the allowlist (so the grant set above is sufficient)', () => {
    const store = read('lib/creator-record-artifacts/store.ts')
    expect(store).not.toMatch(/\.delete\(|\.upsert\(/)
    expect(store).not.toMatch(/from\(UAT_ALLOWLIST_TABLE\)\s*\.(insert|update)/)
  })

  test('it is the newest migration (applies after every existing one)', () => {
    const files = readdirSync(path.join(APP, 'supabase', 'migrations')).filter((f) => f.endsWith('.sql')).sort()
    expect(files[files.length - 1]).toBe('20261028000000_creator_record_artifacts.sql')
  })
})

describe('module boundaries', () => {
  const dir = path.join(APP, 'lib', 'creator-record-artifacts')
  const sources = readdirSync(dir).map((f) => [f, read(path.join('lib', 'creator-record-artifacts', f))] as const)

  test('no assurance, sign-off, publication or Option C imports; no public bucket; no rights_packages writes', () => {
    for (const [f, src] of sources) {
      expect([f, /lib\/assessments|signoff|publication|lib\/creator-record\//.test(src)]).toEqual([f, false])
      expect([f, /'documents'|getPublicUrl|createSignedUrl/.test(src)]).toEqual([f, false])
      expect([f, /from\('rights_packages'\)/.test(src)]).toEqual([f, false])
    }
  })

  test('the fulfilment runner is not touched: the new path enters only through its two injected dependencies', () => {
    const runner = read('lib/payments/run-payment-fulfillment.ts')
    expect(runner).not.toMatch(/creator-record-artifacts/)
    const deps = read('lib/payments/fulfillment-deps.ts')
    expect(deps).toMatch(/hasCreatorRecordPdf: creatorRecordComplete/)
    expect(deps).toMatch(/generateCreatorRecordPdf: \(sub\) => issueCreatorRecord\(sub, \(\) => generateFromSubmission\(sub\)\)/)
  })

  test('the legacy generator is unchanged (ordinary customers keep the existing path until cutover)', () => {
    const legacy = read('lib/pdf/generateChainOfTitle.tsx')
    expect(legacy).not.toMatch(/creator-record-artifacts/)
    expect(legacy).toMatch(/\.from\('documents'\)/)
  })

  test('the delivery route streams through the authenticated handler only', () => {
    const route = read('app/api/creator-record/[id]/pdf/route.ts')
    expect(route).toMatch(/deliverCreatorRecordPdf\(params\.id/)
    expect(route).toMatch(/tier === 'creator_record'/)
    expect(route).not.toMatch(/createSignedUrl|getPublicUrl/)
  })
})
