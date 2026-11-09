/**
 * CR-V2-SYNTHETIC-KEY-REUSE-1 — reusing SI8's existing Anthropic key is allowed for the synthetic compatibility tool ONLY. The
 * real-document evaluation runner and the app's live path keep reading the dedicated key alone, and never ANTHROPIC_API_KEY.
 * (Behaviour with only the shared key set is covered in `live-examination-real-unlocked.test.ts`: `dedicated_key_missing`.)
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { LIVE_EXTRACTION_API_KEY_ENV, loadLiveCaller } from '@/lib/creator-record/evidence/live-caller'
import { SYNTHETIC_CREDENTIAL_SOURCES, syntheticCredentialEnv } from '@/lib/creator-record/eval/run-receipt-eval'

const APP = path.resolve(__dirname, '../..')
const src = (f: string) => readFileSync(path.join(APP, f), 'utf8')
/** Source without comments, so prose that mentions a variable is not mistaken for code that reads it. */
const code = (f: string) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('real-document credential isolation is unchanged', () => {
  test('the real executor and the app live path pass only the dedicated key name to the adapter, and never read ANTHROPIC_API_KEY', () => {
    for (const f of ['lib/creator-record/live-examination/real-executor.ts', 'lib/creator-record/evidence/live-caller.ts']) {
      const body = code(f)
      expect(body).not.toMatch(/ANTHROPIC_API_KEY/)
      // Call sites only: the adapter option type (`apiKeyEnv: string`) is not a call.
      const keyArgs = (body.match(/apiKeyEnv:\s*[A-Za-z_'"]+/g) ?? []).filter((a) => a !== 'apiKeyEnv: string')
      expect(keyArgs.length).toBeGreaterThan(0)
      for (const a of keyArgs) expect(a).toBe('apiKeyEnv: LIVE_EXTRACTION_API_KEY_ENV')
    }
    expect(src('lib/creator-record/live-examination/real-executor.ts')).toContain("if (!env[LIVE_EXTRACTION_API_KEY_ENV]) throw new LiveExaminationDisabled('dedicated_key_missing')")
    expect(LIVE_EXTRACTION_API_KEY_ENV).toBe('CREATOR_RECORD_EXTRACTION_API_KEY')
  })

  test('the app live path refuses with only the shared key', async () => {
    await expect(loadLiveCaller({ ANTHROPIC_API_KEY: 'shared-test-value' })).rejects.toThrow()
  })

  test('the synthetic exception names exactly the two variables, dedicated first', () => {
    expect(SYNTHETIC_CREDENTIAL_SOURCES).toEqual(['CREATOR_RECORD_EXTRACTION_API_KEY', 'ANTHROPIC_API_KEY'])
    expect(syntheticCredentialEnv({})).toBeNull()
    expect(syntheticCredentialEnv({ ANTHROPIC_API_KEY: 'x' })).toBe('ANTHROPIC_API_KEY')
    expect(syntheticCredentialEnv({ ANTHROPIC_API_KEY: 'x', CREATOR_RECORD_EXTRACTION_API_KEY: 'y' })).toBe('CREATOR_RECORD_EXTRACTION_API_KEY')
  })

  test('the synthetic tool loads no environment file', () => {
    expect(code('lib/creator-record/eval/run-receipt-eval.ts')).not.toMatch(/dotenv|loadEnvConfig|\.env\.local|--env-file/)
  })
})
