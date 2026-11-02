/**
 * CR-V2-DOC-2C-B — static consistency of the examination persistence migration with the committed code.
 *
 *   - The seeded synthetic fixture registry equals the committed replay data exactly: fingerprint, set, id and
 *     recording_sha256 = sha256Hex(canonicalJson(parsed_output)) — the digest the DOC-2B core binds into the key.
 *   - The migration never establishes the isolated-environment marker, and refuses the same Production ref the
 *     staging tooling pins.
 *   - The key the database recomputes is built from the same envelope id and version as the committed contract.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { REPLAY_FIXTURES, REPLAY_SPEC_VERSION } from '@/lib/creator-record/evidence/replay-fixtures.data'
import { REPLAY_SET_VERSION } from '@/lib/creator-record/evidence/replay'
import { EXAMINATION_ENVELOPE } from '@/lib/creator-record/examination/envelope'
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'

const APP = process.cwd()
const SQL = readFileSync(path.join(APP, 'supabase', 'migrations', '20261104000000_creator_record_v2_examination_runs.sql'), 'utf8')
const code = SQL.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n')

describe('CR-V2-DOC-2C-B examination migration ↔ committed code', () => {
  test('the seeded fixture registry is exactly the committed replay data, including each recording digest', () => {
    const rows = Array.from(SQL.matchAll(/\('([0-9a-f]{64})', '([^']+)', '([^']+)', '([0-9a-f]{64})'\)/g)).map((m) => ({ sha256: m[1], set: m[2], id: m[3], recording: m[4] }))
    const expected = REPLAY_FIXTURES.map((f) => ({ sha256: f.sha256, set: REPLAY_SET_VERSION, id: f.fixture_id, recording: sha256Hex(canonicalJson(f.parsed_output)) }))
    expect(REPLAY_SET_VERSION).toBe(`${REPLAY_SPEC_VERSION}/oracle-replay`)
    expect(rows).toHaveLength(45)
    expect(rows).toEqual(expected)
  })

  test('the migration never establishes the environment marker and refuses the pinned Production ref', () => {
    expect(code).not.toMatch(/INSERT\s+INTO\s+public\.creator_record_v2_examination_environment/i)
    const staging = readFileSync(path.join(APP, 'scripts', 'staging', 'apply-staging-migrations.sh'), 'utf8')
    const prodRef = staging.match(/^PROD_REF='([a-z0-9]{20})'$/m)![1]
    expect(code).toContain(`supabase_project_ref <> '${prodRef}'`)
    expect(code).toContain(`environment_project_ref <> '${prodRef}'`)
  })

  test('no API role is granted anything on the marker; no live mode, customer content or workflow authority is representable', () => {
    expect(code).not.toMatch(/GRANT[^;]*creator_record_v2_examination_environment/i)
    expect(code).toMatch(/executor_mode\s+text NOT NULL CHECK \(executor_mode = 'fixture_replay'\)/)
    expect(code).toMatch(/content_class\s+text NOT NULL CHECK \(content_class = 'known_synthetic_fixture'\)/)
    expect(code).toMatch(/workflow_authorization\s+text NOT NULL CHECK \(workflow_authorization = 'not_established'\)/)
    expect(code).not.toMatch(/'live_model'|'customer'/)
  })

  test('the database key recomputation uses the committed envelope id and version', () => {
    expect(EXAMINATION_ENVELOPE).toEqual({ id: 'si8/creator-record-v2-examination', version: 2 })
    expect(code).toContain(`"envelope":{"id":"${EXAMINATION_ENVELOPE.id}","version":${EXAMINATION_ENVELOPE.version}}`)
    expect(code).toContain(`v_env #> '{envelope,version}' = '${EXAMINATION_ENVELOPE.version}'::jsonb`)
  })
})
