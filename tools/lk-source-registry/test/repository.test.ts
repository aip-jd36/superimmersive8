/**
 * The real pilot registry, checked against the real repository, offline
 * (PRD AC-1, AC-3, AC-4, AC-7 and the read-only boundary).
 *
 * These tests read committed files. They make no network request and write
 * nothing.
 */

import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { test } from 'node:test'
import { DEFAULT_REGISTRY, run } from '../src/cli.ts'
import { loadEvidence, REPO_ROOT } from '../src/evidence.ts'
import { matrixNotMonitored } from '../src/report.ts'
import { validateRegistry } from '../src/validate.ts'
import type { Registry } from '../src/model.ts'

const TOOL_DIR = path.join(REPO_ROOT, 'tools', 'lk-source-registry')
const registry = JSON.parse(fs.readFileSync(DEFAULT_REGISTRY, 'utf8')) as Registry

// AC-7: any attempt to use the network during these tests fails the test.
globalThis.fetch = (() => {
  throw new Error('network access attempted in an offline test')
}) as typeof fetch

test('the pilot registry holds the six expected sources', () => {
  assert.deepEqual(registry.sources.map((s) => s.source_id), [
    'uscoai-ai-page',
    'federal-register-copyright-office',
    'runway-terms-of-use',
    'higgsfield-terms-of-use-agreement',
    'ny-gbl-396-b',
    'kling-terms-of-service',
  ])
  const kling = registry.sources[5]
  assert.equal(kling.retrieval_method, 'human_capture')
  assert.deepEqual(kling.scope, { kind: 'tool', id: 'kling' })
})

test('every real baseline is empty', () => {
  for (const s of registry.sources) assert.equal(s.baseline, null, s.source_id)
})

test('the pilot registry has no validation error against the repository (AC-1, AC-3, AC-4)', async () => {
  const ev = await loadEvidence(registry)
  assert.deepEqual(ev.problems, [])
  const result = validateRegistry(registry, ev)
  assert.deepEqual(result.issues.filter((i) => i.severity === 'error'), [])
  assert.deepEqual(result.issues, [])
  assert.equal(result.verdict, 'VALID')
})

test('every entry carries the operator confirmation of 2026-11-20, and without it the registry is only pending', async () => {
  const entries = [...registry.relationships, ...registry.exclusions]
  assert.equal(registry.relationships.length, 4)
  assert.equal(registry.exclusions.length, 4)
  for (const e of entries) {
    assert.equal(e.confirmed_by, 'JD (SI8 operator)')
    assert.equal(e.confirmed_on, '2026-11-20')
  }
  // The same registry with the confirmations taken away is not VALID: the verdict rests on the recorded confirmation alone.
  const strip = <T extends { confirmed_by: string | null; confirmed_on: string | null }>(e: T): T => ({ ...e, confirmed_by: null, confirmed_on: null })
  const unconfirmed: Registry = { ...registry, relationships: registry.relationships.map(strip), exclusions: registry.exclusions.map(strip) }
  const result = validateRegistry(unconfirmed, await loadEvidence(unconfirmed))
  assert.equal(result.verdict, 'VALID_PENDING_CONFIRMATION')
  assert.equal(result.issues.length, 8)
  for (const i of result.issues) assert.match(i.code, /^(relationship|exclusion)_unconfirmed$/)
})

test('no relationship or exclusion names a pending or unadopted claim as existing', async () => {
  const ev = await loadEvidence(registry)
  for (const r of registry.relationships) assert.equal(ev.ledger.get(r.claim_ref), 'Adopted', r.claim_ref)
  for (const id of ['CLAIM-RUNWAY-COMMERCIAL-USE-001-v2', 'CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v2']) {
    assert.equal(ev.ledger.has(id), false)
    assert.equal(registry.relationships.some((r) => r.claim_ref === id), false)
  }
})

test('the Matrix section matches the Matrix fixture and names no Matrix identifier in the mapping', async () => {
  const ev = await loadEvidence(registry)
  const listed = matrixNotMonitored(ev)
  const eligible = ev.matrix.flatMap((row) => row.claims.filter((c) => c.crc_eligible === 'Yes').map((c) => c.claim_id)).sort()
  assert.deepEqual(listed.map((m) => m.claim_id), eligible)
  const matrixIds = new Set(ev.matrix.flatMap((row) => [row.identifier, ...row.claims.map((c) => c.claim_id)]))
  for (const r of [...registry.relationships, ...registry.exclusions]) assert.equal(matrixIds.has(r.claim_ref), false, r.claim_ref)
})

test('the validation command reports VALID and exits 0 for the confirmed registry', async () => {
  const { report, exitCode } = await run(DEFAULT_REGISTRY)
  assert.match(report, /^Verdict: VALID$/m)
  assert.match(report, /confirmed by JD \(SI8 operator\) on 2026-11-20; other dependencies may exist/)
  assert.doesNotMatch(report, /NOT CONFIRMED/)
  assert.match(report, /## CRC-reachable, not monitored \(Legacy Matrix\)/)
  assert.match(report, /## CRC-eligible governed claims with no registered source/)
  assert.equal(exitCode, 0)
})

test('an unreadable registry file is INVALID', async () => {
  const { report, exitCode } = await run(path.join(TOOL_DIR, 'does-not-exist.json'))
  assert.equal(exitCode, 1)
  assert.match(report, /evidence_unreadable/)
})

// ── Boundary: static checks on this tool's own source ─────────────────────

const sourceFiles = fs.readdirSync(path.join(TOOL_DIR, 'src')).map((f) => path.join(TOOL_DIR, 'src', f))

test('the tool has no write path, no network client and no model client', () => {
  const forbidden = [
    /\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|mkdir|mkdirSync|rm|rmSync|unlink|unlinkSync|rename|renameSync|copyFile|copyFileSync)\b/,
    /\bfetch\s*\(/,
    /from ['"](node:)?(http|https|net|tls|dgram|child_process)['"]/,
    /anthropic|openai/i,
    /process\.env/,
  ]
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, 'utf8')
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${path.basename(file)} matches ${pattern}`)
  }
})

test('the tool imports only its own modules and Node built-ins', () => {
  for (const file of sourceFiles) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/from ['"]([^'"]+)['"]/g)) {
      assert.match(m[1], /^(node:(fs|path|url)|\.\/[a-z]+\.ts)$/, `${path.basename(file)} imports ${m[1]}`)
    }
  }
})

test('nothing in the Production application imports this tool', () => {
  const appRoot = path.join(REPO_ROOT, '08_Platform', 'app')
  const skip = new Set(['node_modules', '.next', '.git'])
  const stack = [appRoot]
  while (stack.length) {
    const dir = stack.pop()!
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) stack.push(path.join(dir, entry.name))
      } else if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name)) {
        assert.doesNotMatch(fs.readFileSync(path.join(dir, entry.name), 'utf8'), /lk-source-registry/, path.join(dir, entry.name))
      }
    }
  }
})
