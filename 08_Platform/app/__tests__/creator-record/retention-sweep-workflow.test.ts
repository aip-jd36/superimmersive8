/**
 * CR-V2-MVP-INTEGRATION-PREFLIGHT-1 — the retention sweep workflow is disabled by default.
 *
 * The workflow runs the retention endpoint only when the repository variable CREATOR_RECORD_RETENTION_SWEEP_ENABLED is exactly
 * `true`. Checked here: the structure (a secret-free gate job decides; the sweep job, the only holder of the secret, depends on it
 * and is skipped otherwise; scheduled and manual runs share the gate) and the gate's own shell step, executed for each kind of value.
 */
import { readFileSync, mkdtempSync, readFileSync as read, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawnSync } from 'child_process'

// js-yaml is present through Jest's own dependencies; only its safe loader is used.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml') as { safeLoad?: (s: string) => unknown; load: (s: string) => unknown }

const FILE = join(__dirname, '..', '..', '..', '..', '.github', 'workflows', 'creator-record-retention-sweep.yml')
const source = readFileSync(FILE, 'utf8')
type Step = { name?: string; id?: string; env?: Record<string, string>; run?: string }
type Job = { needs?: string; if?: string; outputs?: Record<string, string>; steps: Step[] }
const wf = (yaml.safeLoad ?? yaml.load)(source) as { on: Record<string, unknown>; jobs: Record<string, Job> }

describe('retention sweep workflow: activation gate', () => {
  test('valid YAML; scheduled and manual triggers only, both through the same jobs', () => {
    expect(Object.keys(wf.on).sort()).toEqual(['schedule', 'workflow_dispatch'])
    expect(Object.keys(wf.jobs).sort()).toEqual(['gate', 'sweep'])
  })

  test('the gate job references no secret and decides from the repository variable', () => {
    const gate = JSON.stringify(wf.jobs.gate)
    expect(gate).not.toMatch(/secrets\./)
    expect(gate).not.toMatch(/curl|retention\/sweep/)
    const step = wf.jobs.gate.steps.find((s) => s.id === 'decide')!
    expect(step.env).toEqual({ RETENTION_SWEEP_ENABLED_VALUE: '${{ vars.CREATOR_RECORD_RETENTION_SWEEP_ENABLED }}' })
    expect(wf.jobs.gate.outputs).toEqual({ enabled: '${{ steps.decide.outputs.enabled }}' })
    expect(wf.jobs.gate.if).toBeUndefined()
  })

  test('the sweep job, the only holder of the secret and the endpoint, needs the gate and runs only on its exact output', () => {
    expect(wf.jobs.sweep.needs).toBe('gate')
    expect(wf.jobs.sweep.if).toBe("needs.gate.outputs.enabled == 'true'")
    expect(JSON.stringify(wf.jobs.sweep)).toMatch(/secrets\.CREATOR_RECORD_RETENTION_SWEEP_SECRET/)
    expect(source.match(/secrets\./g)).toHaveLength(1)
    expect(source.match(/retention\/sweep/g)).toHaveLength(1)
    // The variable is never compared by a GitHub expression (whose string equality ignores case).
    expect(source).not.toMatch(/vars\.CREATOR_RECORD_RETENTION_SWEEP_ENABLED\s*==/)
  })

  const bash = spawnSync('bash', ['--version'])
  const withBash = bash.status === 0 ? test : test.skip
  withBash.each([
    ['unset', undefined, 'false'],
    ['empty', '', 'false'],
    ['false', 'false', 'false'],
    ['upper case', 'TRUE', 'false'],
    ['capitalized', 'True', 'false'],
    ['leading space', ' true', 'false'],
    ['trailing space', 'true ', 'false'],
    ['trailing newline', 'true\n', 'false'],
    ['yes', 'yes', 'false'],
    ['one', '1', 'false'],
    ['injection attempt', 'true"; echo "enabled=true', 'false'],
    ['exactly true', 'true', 'true'],
  ])('gate step: %s → enabled=%s', (_label, value, expected) => {
    const step = wf.jobs.gate.steps.find((s) => s.id === 'decide')!
    const dir = mkdtempSync(join(tmpdir(), 'retention-gate-'))
    try {
      const out = join(dir, 'output')
      // Only these variables: nothing from the test runner's own environment can satisfy the gate.
      const env = { PATH: process.env.PATH ?? '', GITHUB_OUTPUT: out } as Record<string, string> as NodeJS.ProcessEnv
      if (value !== undefined) env.RETENTION_SWEEP_ENABLED_VALUE = value
      const r = spawnSync('bash', ['-e', '-c', step.run!], { env, encoding: 'utf8' })
      expect(r.status).toBe(0)
      expect(read(out, 'utf8').trim().split('\n')).toEqual([`enabled=${expected}`])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
