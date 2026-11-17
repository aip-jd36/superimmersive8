/**
 * SI8-PRIVACY-CRC-1C — scheduler readiness for the CRC raw-IP retention workflow (mirrors
 * __tests__/creator-record/retention-sweep-workflow.test.ts, the precedent it copies).
 *
 * Checked: the triggers and schedule; a secret-free gate job decides from CRC_RAW_IP_RETENTION_ENABLED, compared in the shell, and
 * the sweep job (the only holder of the secret) runs only on its exact output; the secret name and endpoint match the route;
 * missing configuration fails the job visibly; nothing in the job can print an address.
 */
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawnSync } from 'child_process'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml') as { safeLoad?: (s: string) => unknown; load: (s: string) => unknown }

const REPO = join(__dirname, '..', '..', '..', '..')
const APP = join(__dirname, '..', '..')
const FILE = join(REPO, '.github', 'workflows', 'crc-raw-ip-retention.yml')
const ROUTE = join(APP, 'app', 'api', 'internal', 'crc', 'raw-ip-retention', 'route.ts')
const source = readFileSync(FILE, 'utf8')
const route = readFileSync(ROUTE, 'utf8')
type Step = { name?: string; id?: string; env?: Record<string, string>; run?: string }
type Job = { needs?: string; if?: string; outputs?: Record<string, string>; steps: Step[]; 'timeout-minutes'?: number }
const wf = (yaml.safeLoad ?? yaml.load)(source) as {
  on: { schedule: { cron: string }[]; workflow_dispatch: unknown }
  jobs: Record<string, Job>
  permissions: Record<string, string>
  concurrency: { group: string; 'cancel-in-progress': boolean }
}

describe('CRC raw-IP retention workflow', () => {
  test('valid YAML; daily schedule plus manual dispatch; read-only token; no overlapping runs', () => {
    expect(Object.keys(wf.on).sort()).toEqual(['schedule', 'workflow_dispatch'])
    expect(wf.on.schedule).toEqual([{ cron: '23 3 * * *' }]) // daily, 03:23 UTC
    expect(wf.permissions).toEqual({ contents: 'read' })
    expect(wf.concurrency).toEqual({ group: 'crc-raw-ip-retention', 'cancel-in-progress': false })
    expect(Object.keys(wf.jobs).sort()).toEqual(['gate', 'sweep'])
  })

  test('the gate job references no secret and decides from the repository variable', () => {
    const gate = JSON.stringify(wf.jobs.gate)
    expect(gate).not.toMatch(/secrets\.|curl|raw-ip-retention/)
    const step = wf.jobs.gate.steps.find((s) => s.id === 'decide')!
    expect(step.env).toEqual({ CRC_RAW_IP_RETENTION_ENABLED_VALUE: '${{ vars.CRC_RAW_IP_RETENTION_ENABLED }}' })
    expect(wf.jobs.gate.outputs).toEqual({ enabled: '${{ steps.decide.outputs.enabled }}' })
    expect(source).not.toMatch(/vars\.CRC_RAW_IP_RETENTION_ENABLED\s*==/)
  })

  test('the sweep job needs the gate, runs only on its exact output, and is the only holder of the secret', () => {
    expect(wf.jobs.sweep.needs).toBe('gate')
    expect(wf.jobs.sweep.if).toBe("needs.gate.outputs.enabled == 'true'")
    expect(source.match(/secrets\./g)).toEqual(['secrets.'])
    expect(JSON.stringify(wf.jobs.sweep)).toContain('secrets.CRC_RAW_IP_RETENTION_SWEEP_SECRET')
  })

  test('the secret name and endpoint match the route, which uses its own secret (not the payment or Creator Record one)', () => {
    expect(route).toContain('process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET')
    expect(route).not.toMatch(/PAYMENT_SWEEP_SECRET|CREATOR_RECORD_RETENTION_SWEEP_SECRET/)
    expect(source).toContain('https://app.superimmersive8.com/api/internal/crc/raw-ip-retention')
    expect(existsSync(ROUTE)).toBe(true)
    expect(route).toContain('export async function POST')
  })

  test('failures are visible: missing secret exits 1, and curl fails the job on any non-2xx (503 unconfigured, 401, 500)', () => {
    const run = wf.jobs.sweep.steps[0].run!
    expect(run).toContain('if [ -z "$CRC_RAW_IP_RETENTION_SWEEP_SECRET" ]')
    expect(run).toContain('exit 1')
    expect(run).toContain('--fail-with-body')
    expect(run).toContain('-X POST')
    expect(wf.jobs.sweep['timeout-minutes']).toBe(5)
    expect(route).toMatch(/not_configured'\) return NextResponse\.json\(\{ error: 'Sweep not configured' \}, \{ status: 503 \}\)/)
    expect(route).toContain('{ status: report.ok ? 200 : 500 }')
  })

  test('nothing the job prints can contain an address: no verbose curl, no echo of the response beyond the counts body', () => {
    const run = wf.jobs.sweep.steps[0].run!
    expect(run).not.toMatch(/curl[^\n]*\s-v\b|--verbose|--trace|set -x/)
    // The only body the endpoint returns is counts or fixed codes (raw-ip-retention.test.ts); the secret is a header, never echoed.
    expect(run).not.toMatch(/echo[^\n]*SECRET\}?"?\s*$/m)
  })

  const bash = spawnSync('bash', ['--version'])
  const withBash = bash.status === 0 ? test : test.skip
  withBash.each([
    ['unset', undefined, 'false'],
    ['empty', '', 'false'],
    ['false', 'false', 'false'],
    ['upper case', 'TRUE', 'false'],
    ['leading space', ' true', 'false'],
    ['trailing newline', 'true\n', 'false'],
    ['injection attempt', 'true"; echo "enabled=true', 'false'],
    ['exactly true', 'true', 'true'],
  ])('gate step: %s → enabled=%s', (_label, value, expected) => {
    const step = wf.jobs.gate.steps.find((s) => s.id === 'decide')!
    const dir = mkdtempSync(join(tmpdir(), 'crc-ip-gate-'))
    try {
      const out = join(dir, 'output')
      const env = { PATH: process.env.PATH ?? '', GITHUB_OUTPUT: out } as Record<string, string> as NodeJS.ProcessEnv
      if (value !== undefined) env.CRC_RAW_IP_RETENTION_ENABLED_VALUE = value
      const r = spawnSync('bash', ['-e', '-c', step.run!], { env, encoding: 'utf8' })
      expect(r.status).toBe(0)
      expect(readFileSync(out, 'utf8').trim().split('\n')).toEqual([`enabled=${expected}`])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  withBash('sweep step with no secret configured: exits 1 before any request', () => {
    const run = wf.jobs.sweep.steps[0].run!.replace(/curl[\s\S]*$/, 'echo REQUEST_SENT')
    const r = spawnSync('bash', ['-e', '-c', run], { env: { PATH: process.env.PATH ?? '' } as Record<string, string> as NodeJS.ProcessEnv, encoding: 'utf8' })
    expect(r.status).toBe(1)
    expect(r.stdout).not.toContain('REQUEST_SENT')
  })
})
