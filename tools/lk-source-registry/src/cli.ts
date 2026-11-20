/**
 * Offline validation command for the Living Knowledge source registry.
 *
 *   cd 08_Platform/app
 *   npx tsx ../../tools/lk-source-registry/src/cli.ts [path/to/registry.json]
 *
 * Prints the validation and coverage report to standard output.
 * Exit code: 0 VALID, 2 VALID_PENDING_CONFIRMATION, 3 REVIEW_REQUIRED, 1 INVALID.
 * Reads repository files only. No network, no model, no writes.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEvidence, REPO_ROOT } from './evidence.ts'
import { renderReport } from './report.ts'
import { validateRegistry } from './validate.ts'
import type { Registry } from './model.ts'

export const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'tools', 'lk-source-registry', 'registry.json')

export async function run(registryPath: string): Promise<{ report: string; exitCode: number }> {
  let registry: unknown = null
  let readProblem: string | null = null
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  } catch (e) {
    readProblem = `registry could not be read as JSON: ${(e as Error).message}`
  }
  const evidence = await loadEvidence(registry)
  if (readProblem) evidence.problems.push(readProblem)
  const result = validateRegistry(registry, evidence)
  const report = renderReport(result.verdict === 'INVALID' ? null : (registry as Registry), evidence, result)
  const exitCode = { VALID: 0, INVALID: 1, VALID_PENDING_CONFIRMATION: 2, REVIEW_REQUIRED: 3 }[result.verdict]
  return { report, exitCode }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_REGISTRY).then(({ report, exitCode }) => {
    process.stdout.write(report + '\n')
    process.exitCode = exitCode
  })
}
