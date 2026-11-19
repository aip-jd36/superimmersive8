/**
 * CR-DOC-READER-EXT-9R3 — the manual licence evaluation workflow: trigger, pinning, secret scope, limits and public-log hygiene.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { execFileSync } from 'child_process'

// js-yaml is present through Jest's own dependencies; only its safe loader is used.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml') as { safeLoad?: (s: string) => unknown; load: (s: string) => unknown }

const REPO = join(__dirname, '..', '..', '..', '..')
const source = readFileSync(join(REPO, '.github', 'workflows', 'cr-doc-reader-ext-9r3-licence-evaluation.yml'), 'utf8')
type Step = { name?: string; id?: string; if?: string; uses?: string; with?: Record<string, unknown>; env?: Record<string, string>; run?: string }
type Job = { if?: string; 'runs-on': string; steps: Step[] }
const wf = (yaml.safeLoad ?? yaml.load)(source) as { on: Record<string, unknown>; permissions: Record<string, string>; env: Record<string, string>; jobs: Record<string, Job> }
const job = wf.jobs['licence-evaluation']
const step = (name: RegExp) => job.steps.find((s) => s.name && name.test(s.name))!

describe('licence evaluation workflow', () => {
  test('manual only: no push, pull request or schedule trigger, and no dispatch inputs', () => {
    expect(Object.keys(wf.on)).toEqual(['workflow_dispatch'])
    expect(wf.on.workflow_dispatch).toBeNull()
    expect(job.if).toBe("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && github.repository == 'aip-jd36/superimmersive8'")
  })

  test('read-only token; one job; pinned actions; no upload, cache, deployment or database step', () => {
    expect(wf.permissions).toEqual({ contents: 'read' })
    expect(Object.keys(wf.jobs)).toEqual(['licence-evaluation'])
    for (const s of job.steps.filter((x) => x.uses)) expect(s.uses).toMatch(/@[0-9a-f]{40}$/)
    expect(source).not.toMatch(/upload-artifact|actions\/cache|vercel|supabase|psql|SUPABASE|DATABASE_URL|curl /i)
    expect(source).not.toMatch(/^\s*cache:/m)
  })

  test('checks out exactly the reviewed revision, which must exist here and contain the v2 contract and the controls', () => {
    const sha = wf.env.REVIEWED_SHA
    expect(sha).toMatch(/^[0-9a-f]{40}$/)
    expect(step(/Check out/).with).toMatchObject({ ref: '${{ env.REVIEWED_SHA }}', 'persist-credentials': false })
    expect(step(/Verify the reviewed revision/).run).toMatch(/git merge-base --is-ancestor "\$REVIEWED_SHA" FETCH_HEAD/)
    const show = (f: string) => execFileSync('git', ['show', `${sha}:08_Platform/app/${f}`], { cwd: REPO, encoding: 'utf8' })
    expect(show('lib/creator-record/licence-examination/schema.ts')).toContain("LICENCE_EXTRACTION_SCHEMA_VERSION = 'licence-extraction-v2'")
    expect(show('lib/creator-record/licence-examination/prompt.ts')).toContain("LICENCE_PROMPT_VERSION = 'licence-prompt-v2'")
    expect(show('lib/creator-record/eval/run-licence-eval.ts')).toContain('syntheticCredentialEnv')
    expect(show('lib/creator-record/eval/licence-eval-summary.ts')).toContain('export function summarize')
    expect(show('lib/creator-record/customer-flow/approved-inputs.ts')).toContain("export const LICENCE_READING_SWITCH = 'off' as 'off' | 'on'")
  })

  test('the secret reaches exactly one step: the live run', () => {
    expect(source.match(/secrets\./g)).toHaveLength(1)
    const withSecret = job.steps.filter((s) => JSON.stringify(s).includes('secrets.'))
    expect(withSecret.map((s) => s.id)).toEqual(['live'])
    expect(withSecret[0].env).toEqual({ ANTHROPIC_API_KEY: '${{ secrets.ANTHROPIC_API_KEY }}' })
    expect(wf.env).not.toHaveProperty('ANTHROPIC_API_KEY')
  })

  test('limits: 24 + 6 = 30 requests; $1.58 + $0.40 within $2.00; pinned model and prices; one run per document', () => {
    expect(wf.env).toMatchObject({ MODEL: 'claude-sonnet-5', CONTRACT: 'licence-extraction-v2', PROMPT: 'licence-prompt-v2', PRE_MAX_CALLS: '24', SUP_MAX_CALLS: '6', TOTAL_MAX_CALLS: '30', PRE_MAX_USD: '1.58', SUP_MAX_USD: '0.40', TOTAL_MAX_USD: '2.00' })
    const live = step(/Live run/).run!
    expect(live).toMatch(/--runs 1 --input-usd-per-mtok 2 --output-usd-per-mtok 10/)
    expect(live).toMatch(/--spec preregistered --max-calls "\$PRE_MAX_CALLS" --max-usd "\$PRE_MAX_USD"/)
    expect(live).toMatch(/--spec supplement-9r3 --max-calls "\$SUP_MAX_CALLS" --max-usd "\$SUP_MAX_USD"/)
    expect((live.match(/run-licence-eval\.ts/g) ?? []).length).toBe(2)
    expect(live).toMatch(/--out "\$RUNNER_TEMP\/licence-eval"/)
  })

  test('the paid step comes after the pin check and the dry run; the public log is the allow-list summary', () => {
    const names = job.steps.map((s) => s.name ?? '')
    const i = (re: RegExp) => names.findIndex((n) => re.test(n))
    expect(i(/pins/)).toBeLessThan(i(/Live run/))
    expect(i(/Dry run/)).toBeLessThan(i(/Live run/))
    expect(i(/Public summary/)).toBeGreaterThan(i(/Live run/))
    expect(step(/Public summary/).run).toMatch(/licence-eval-summary\.ts/)
    expect(step(/Public summary/).env).toBeUndefined()
    // No step prints a report or a raw file.
    expect(source).not.toMatch(/cat [^\n]*report|cat [^\n]*licence-eval\//)
  })
})
