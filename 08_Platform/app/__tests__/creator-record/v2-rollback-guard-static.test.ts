/**
 * CR-V2-MVP-M4B — the v2 marker column never exists without its rollback guard.
 *
 * The guard's behaviour is proven against real PostgreSQL (15 and 17) in
 * __tests__/db/creator-record-v2-binding.db.test.ts. This static check pins the deploy property: the
 * one migration that adds `submissions.creator_record_product` also installs both guard triggers, so no
 * database can hold a v2 submission that pre-M3 code could issue a V1 PDF for.
 */

import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations')
const sql = (f: string) => readFileSync(path.join(DIR, f), 'utf8').replace(/--[^\n]*/g, '')

describe('v2 rollback guard (static)', () => {
  test('exactly one migration adds the marker column, and it installs both guards', () => {
    const adders = readdirSync(DIR).filter((f) => /ADD COLUMN IF NOT EXISTS creator_record_product/i.test(sql(f)))
    expect(adders).toEqual(['20261102000000_creator_record_v2_submission_binding.sql'])
    const s = sql(adders[0])
    expect(s).toMatch(/CREATE TRIGGER creator_record_artifacts_product_guard\s+BEFORE INSERT OR UPDATE ON public\.creator_record_artifacts/)
    expect(s).toMatch(/CREATE TRIGGER rights_packages_creator_record_v2_guard\s+BEFORE INSERT OR UPDATE ON public\.rights_packages/)
  })

  test('the database guard and the v2 renderer agree on what a v2 generator version is', () => {
    const s = sql('20261102000000_creator_record_v2_submission_binding.sql')
    expect(s).toContain(`NEW.generator_version ~ '^creator-record-v2-pdf-v[1-9][0-9]*$'`)
    const renderers = readFileSync(path.join(__dirname, '..', '..', 'lib', 'creator-record-artifacts', 'renderers.ts'), 'utf8')
    expect(renderers).toContain('const V2_GENERATOR_VERSION = /^creator-record-v2-pdf-v[1-9][0-9]*$/')
    expect(renderers).toContain("export const CREATOR_RECORD_V2_GENERATOR_VERSION = 'creator-record-v2-pdf-v1'")
  })
})
