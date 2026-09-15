/**
 * crc_turn_traces authority-firewall guarantee (CRC-PILOT-OBS-3). Same
 * file-tree-scanning discipline as subsystem-boundaries.test.ts: proves,
 * structurally, that the new observational trace table can never become
 * authority for CRC behavior.
 *
 * The intended invariant (CRC-PILOT-OBS-2/2A/3 design):
 *   CRC runtime WRITES a trace -> later humans/analytics may inspect it
 * NOT:
 *   CRC runtime READS the trace -> the trace influences Retrieval/BI/
 *   Projection/questioning
 *
 * Two things prove this: (1) lib/crc-engine/turn-traces.ts exports no read
 * function at all -- only recordCrcCompletionTrace(), a write-only helper --
 * so there is nothing for any authoritative module to even call; (2) no
 * authoritative subsystem file imports turn-traces.ts or mentions
 * crc_turn_traces by name.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as turnTraces from '../../lib/crc-engine/turn-traces'

const APP_ROOT = path.join(__dirname, '..', '..')

function listTsFiles(dir: string): string[] {
  const full = path.join(APP_ROOT, dir)
  if (!fs.existsSync(full)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listTsFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(entryPath)
    }
  }
  return out
}

const INTERVIEW_ENGINE_FILES = listTsFiles('lib/interview-engine')
const RETRIEVAL_ENGINE_FILES = listTsFiles('lib/retrieval-engine')
const PROJECTION_LAYER_FILES = listTsFiles('lib/projection-layer').filter((f) => !f.includes(`${path.sep}gallery${path.sep}`))
const BOUNDED_INTERPRETATION_FILES = listTsFiles('lib/bounded-interpretation')
const CRC_ENGINE_FILES = listTsFiles('lib/crc-engine')

function sourceOf(relativeFile: string): string {
  return fs.readFileSync(path.join(APP_ROOT, relativeFile), 'utf-8')
}

describe('crc_turn_traces authority firewall', () => {
  test('turn-traces.ts exports exactly one function, and it is a writer -- no read/query function exists for any CRC runtime module to consume', () => {
    const exportedNames = Object.keys(turnTraces)
    expect(exportedNames.sort()).toEqual(['TRACE_SCHEMA_VERSION', 'recordCrcCompletionTrace'].sort())
    // Defensive: the module source itself never calls .select( on the client
    // -- it is structurally write-only, not merely write-only "by convention."
    const source = sourceOf('lib/crc-engine/turn-traces.ts')
    expect(source).not.toMatch(/\.select\(/)
  })

  test('no file under lib/interview-engine/, lib/retrieval-engine/, lib/projection-layer/, or lib/bounded-interpretation/ imports turn-traces.ts or mentions crc_turn_traces', () => {
    const authoritativeFiles = [...INTERVIEW_ENGINE_FILES, ...RETRIEVAL_ENGINE_FILES, ...PROJECTION_LAYER_FILES, ...BOUNDED_INTERPRETATION_FILES]
    expect(authoritativeFiles.length).toBeGreaterThan(0)
    for (const file of authoritativeFiles) {
      const source = sourceOf(file)
      expect(source).not.toMatch(/turn-traces/i)
      expect(source).not.toMatch(/crc_turn_traces/i)
    }
  })

  test('within lib/crc-engine/ itself, only turn-traces.ts mentions crc_turn_traces -- run-turn.ts and run-crc-conversation.ts (the orchestrator) remain entirely unaware the trace table exists', () => {
    const filesReferencingTable = CRC_ENGINE_FILES.filter((f) => /crc_turn_traces/.test(sourceOf(f)))
      .map((f) => f.split(path.sep).join('/'))
      .filter((f) => f !== 'lib/crc-engine/turn-traces.ts')
    expect(filesReferencingTable).toEqual([])
  })

  test('run-turn.ts and run-crc-conversation.ts do not import turn-traces.ts', () => {
    for (const file of ['lib/crc-engine/run-turn.ts', 'lib/crc-engine/run-crc-conversation.ts']) {
      expect(sourceOf(file)).not.toMatch(/turn-traces/i)
    }
  })

  test('the one legitimate writer (app/api/crc/turn/route.ts) only calls recordCrcCompletionTrace -- it does not query crc_turn_traces back', () => {
    const source = sourceOf(path.join('app', 'api', 'crc', 'turn', 'route.ts'))
    expect(source).toMatch(/recordCrcCompletionTrace/)
    expect(source).not.toMatch(/from\(['"]crc_turn_traces['"]\)\s*\.\s*select/)
  })
})
