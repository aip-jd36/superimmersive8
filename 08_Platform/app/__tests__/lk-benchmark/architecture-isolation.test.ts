/**
 * LK-68 -- I: static proof that benchmark instrumentation has no
 * import/dependency path into, or from, Living Knowledge authority /
 * Retrieval / Bounded Interpretation / Composition / questioning /
 * extraction. This is a real architectural boundary, not incidental prose --
 * it checks actual import/require statements only.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.resolve(__dirname, '../..')

const CRC_ARCHITECTURE_DIRS = [
  'lib/retrieval-engine',
  'lib/bounded-interpretation',
  'lib/projection-layer',
  'lib/interview-engine',
  'lib/crc-engine',
]

const BENCHMARK_DIR = 'lib/lk-benchmark'

function listSourceFiles(relDir: string): string[] {
  const absDir = path.join(APP_ROOT, relDir)
  if (!fs.existsSync(absDir)) return []
  const results: string[] = []
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(relDir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(rel))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      results.push(rel)
    }
  }
  return results
}

const IMPORT_LINE_PATTERN = /^\s*(import|export)\b.*from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/gm

function importSpecifiers(fileContent: string): string[] {
  const specs: string[] = []
  let match: RegExpExecArray | null
  IMPORT_LINE_PATTERN.lastIndex = 0
  while ((match = IMPORT_LINE_PATTERN.exec(fileContent)) !== null) {
    const spec = match[2] ?? match[3]
    if (spec) specs.push(spec)
  }
  return specs
}

describe('I: lk-benchmark architecture isolation', () => {
  test('no CRC/Living Knowledge architecture file imports lk-benchmark', () => {
    const violations: string[] = []
    for (const dir of CRC_ARCHITECTURE_DIRS) {
      for (const file of listSourceFiles(dir)) {
        const content = fs.readFileSync(path.join(APP_ROOT, file), 'utf-8')
        for (const spec of importSpecifiers(content)) {
          if (spec.includes('lk-benchmark')) {
            violations.push(`${file} imports "${spec}"`)
          }
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('lk-benchmark imports nothing from CRC/Living Knowledge architecture directories', () => {
    const violations: string[] = []
    for (const file of listSourceFiles(BENCHMARK_DIR)) {
      const content = fs.readFileSync(path.join(APP_ROOT, file), 'utf-8')
      for (const spec of importSpecifiers(content)) {
        const normalized = spec.replace(/^@\//, '')
        if (CRC_ARCHITECTURE_DIRS.some((dir) => normalized.startsWith(dir))) {
          violations.push(`${file} imports "${spec}"`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('lk-benchmark source files exist (sanity check that the scan is not vacuously passing)', () => {
    expect(listSourceFiles(BENCHMARK_DIR).length).toBeGreaterThan(0)
  })
})
