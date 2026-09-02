/**
 * CRC subsystem boundary guarantees (Prototype Beta, CRC End-to-End
 * Integration milestone, Phase 4). Scans the actual file trees under
 * lib/interview-engine/, lib/retrieval-engine/, lib/projection-layer/,
 * and lib/crc-engine/ -- not a hand-picked sample of files -- so a new
 * file added to any subsystem later is automatically covered, not
 * silently exempt.
 *
 * Distinguishes "imports Interview Engine" (forbidden for Retrieval and
 * Projection: any of Interview's own LOGIC modules -- gates, boundaries,
 * extraction, mutations, handoff assembly, candidate-question, decision,
 * signal-lineage, serialization, or the anthropic-/mock- adapters) from
 * "imports the shared types module" (permitted, and already established
 * practice: @/types/interview-engine is a deliberate cross-subsystem
 * contract surface, not Interview's private internals -- see
 * RETRIEVAL_ENGINE_ARCHITECTURE.md §2 and PROJECTION_LAYER_ARCHITECTURE.md
 * §2, both of which read RetrievalHandoff from exactly this module by
 * design). Same distinction applied to @/lib/retrieval-engine/types
 * (Projection's one already-approved exception -- RetrievalResult is one
 * of its two canonical inputs) versus lib/retrieval-engine/'s own LOGIC
 * files (retrieve.ts, lookup-rows.ts, enumerate-eligible-claims.ts,
 * extract-matchable-facts.ts, assemble-result.ts).
 */

import * as fs from 'fs'
import * as path from 'path'

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

function importLinesOf(relativeFile: string): string[] {
  const source = fs.readFileSync(path.join(APP_ROOT, relativeFile), 'utf-8')
  return source.match(/^import .+$/gm) ?? []
}

const INTERVIEW_ENGINE_FILES = listTsFiles('lib/interview-engine')
const RETRIEVAL_ENGINE_FILES = listTsFiles('lib/retrieval-engine')
const PROJECTION_LAYER_FILES = listTsFiles('lib/projection-layer').filter((f) => !f.includes(`${path.sep}gallery${path.sep}`))
const CRC_ENGINE_FILES = listTsFiles('lib/crc-engine')
const BOUNDED_INTERPRETATION_FILES = listTsFiles('lib/bounded-interpretation')

describe('subsystem boundaries -- Interview Engine', () => {
  test('no file under lib/interview-engine/ (including eval/) imports retrieval-engine or projection-layer', () => {
    expect(INTERVIEW_ENGINE_FILES.length).toBeGreaterThan(0)
    for (const file of INTERVIEW_ENGINE_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(/retrieval-engine/i)
      expect(importText).not.toMatch(/projection-layer/i)
    }
  })
})

describe('subsystem boundaries -- Retrieval Engine', () => {
  const INTERVIEW_LOGIC_PATTERN = /lib\/interview-engine\/(gates|boundaries|extraction|mutations|handoff|candidate-question|decision|signal-lineage|serialization|anthropic-|mock-)/i

  test('no file under lib/retrieval-engine/ imports Interview Engine LOGIC (only the shared @/types/interview-engine contract module is permitted)', () => {
    expect(RETRIEVAL_ENGINE_FILES.length).toBeGreaterThan(0)
    for (const file of RETRIEVAL_ENGINE_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(INTERVIEW_LOGIC_PATTERN)
    }
  })

  test('no file under lib/retrieval-engine/ imports projection-layer', () => {
    for (const file of RETRIEVAL_ENGINE_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(/projection-layer/i)
    }
  })
})

describe('subsystem boundaries -- Projection Layer', () => {
  const INTERVIEW_LOGIC_PATTERN = /lib\/interview-engine\/(gates|boundaries|extraction|mutations|handoff|candidate-question|decision|signal-lineage|serialization|anthropic-|mock-)/i
  const RETRIEVAL_LOGIC_PATTERN = /lib\/retrieval-engine\/(retrieve|lookup-rows|enumerate-eligible-claims|extract-matchable-facts|assemble-result|matrix-fixture)/i

  test('no file under lib/projection-layer/ imports Interview Engine LOGIC (only the shared @/types/interview-engine contract module is permitted)', () => {
    expect(PROJECTION_LAYER_FILES.length).toBeGreaterThan(0)
    for (const file of PROJECTION_LAYER_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(INTERVIEW_LOGIC_PATTERN)
    }
  })

  test('no file under lib/projection-layer/ imports Retrieval Engine LOGIC or its Matrix fixture (only @/lib/retrieval-engine/types is permitted)', () => {
    for (const file of PROJECTION_LAYER_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(RETRIEVAL_LOGIC_PATTERN)
    }
  })

  test('no file under lib/projection-layer/ imports the Platform Rights Matrix or Living Notebook by any path', () => {
    for (const file of PROJECTION_LAYER_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(/platform-rights-matrix/i)
      expect(importText).not.toMatch(/living-notebook/i)
      expect(importText).not.toMatch(/matrix-fixture/i)
    }
  })

  test('no file under lib/projection-layer/ imports Bounded Interpretation LOGIC (only @/lib/bounded-interpretation/types is permitted, mirroring the existing RetrievalResult exception)', () => {
    for (const file of PROJECTION_LAYER_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(/lib\/bounded-interpretation\/(rules|build-bounded-interpretation)/i)
    }
  })
})

describe('subsystem boundaries -- Bounded Interpretation', () => {
  const INTERVIEW_LOGIC_PATTERN = /lib\/interview-engine\/(gates|boundaries|extraction|mutations|handoff|candidate-question|decision|signal-lineage|serialization|anthropic-|mock-)/i
  const RETRIEVAL_LOGIC_PATTERN = /lib\/retrieval-engine\/(retrieve|lookup-rows|enumerate-eligible-claims|extract-matchable-facts|assemble-result|matrix-fixture)/i

  test('no file under lib/bounded-interpretation/ imports Interview Engine LOGIC (only the shared @/types/interview-engine contract module is permitted)', () => {
    expect(BOUNDED_INTERPRETATION_FILES.length).toBeGreaterThan(0)
    for (const file of BOUNDED_INTERPRETATION_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(INTERVIEW_LOGIC_PATTERN)
    }
  })

  test('no file under lib/bounded-interpretation/ imports Retrieval Engine LOGIC or its Matrix fixture (only @/lib/retrieval-engine/types is permitted)', () => {
    for (const file of BOUNDED_INTERPRETATION_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(RETRIEVAL_LOGIC_PATTERN)
    }
  })

  test('no file under lib/bounded-interpretation/ imports Projection Layer -- this module is upstream of Projection, never a consumer of it', () => {
    for (const file of BOUNDED_INTERPRETATION_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(/projection-layer/i)
    }
  })

  test('no file under lib/bounded-interpretation/ imports the Platform Rights Matrix, Living Notebook, or any LLM/adapter module', () => {
    for (const file of BOUNDED_INTERPRETATION_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(/platform-rights-matrix/i)
      expect(importText).not.toMatch(/living-notebook/i)
      expect(importText).not.toMatch(/anthropic/i)
    }
  })
})

describe('subsystem boundaries -- jurisdiction capture is user-attested only (CRC Living Knowledge Phase 1, 2026-08-16)', () => {
  const JURISDICTION_SIGNAL_FILES = ['lib/crc-engine/jurisdiction-clarification.ts', 'lib/interview-engine/extraction.ts', 'lib/interview-engine/mutations.ts']
  const NON_ATTESTATION_SIGNAL_PATTERN = /traffic-classification|abuse-prevention|abuse-key|geoip|x-forwarded|request\.headers|NextRequest/i

  test('none of the three files that can set project_facts.jurisdiction import traffic-classification, abuse-prevention, or any IP/header/geolocation module', () => {
    for (const file of JURISDICTION_SIGNAL_FILES) {
      const importText = importLinesOf(file).join('\n')
      expect(importText).not.toMatch(NON_ATTESTATION_SIGNAL_PATTERN)
    }
  })

  test('traffic-classification.ts and abuse-prevention.ts (the actual IP/header-signal modules) never mention jurisdiction -- proves the exclusion holds from the other direction too, not just by absence of an import', () => {
    const trafficClassificationSource = fs.readFileSync(path.join(APP_ROOT, 'lib/crc-engine/traffic-classification.ts'), 'utf-8')
    const abusePreventionSource = fs.readFileSync(path.join(APP_ROOT, 'lib/crc-engine/abuse-prevention.ts'), 'utf-8')
    expect(trafficClassificationSource).not.toMatch(/jurisdiction/i)
    expect(abusePreventionSource).not.toMatch(/jurisdiction/i)
  })

  test('setJurisdiction has ZERO call sites anywhere in production code -- not extraction.ts, not any traffic-classification, abuse-prevention, or API-route file (CRC Assessment-Jurisdiction Mention Model — Post-Integration Cleanup, 2026-08-28)', () => {
    // Strengthened from "exactly one call site: extraction.ts" -- the
    // Integration Review's Finding 1 identified that extraction.ts's own
    // dispatch branch calling setJurisdiction was reachable only by the
    // extractor's wire-schema enum happening to exclude 'jurisdiction' as a
    // raw_fact_field value, not by any structural type guarantee. This
    // cleanup removed 'jurisdiction' from CandidateObservation.raw_fact_field
    // and ProposedFact's own project_fact field union, and deleted the now-
    // impossible dispatch branch -- so setJurisdiction is now unreachable by
    // construction, not merely by prompt/schema discipline. The function
    // itself remains in mutations.ts (legacy scalar mutation, historically
    // still a valid StructuredUnderstanding operation), but nothing in
    // production code calls it any more.
    const allProductionFiles = [...INTERVIEW_ENGINE_FILES, ...CRC_ENGINE_FILES, ...RETRIEVAL_ENGINE_FILES, ...PROJECTION_LAYER_FILES]
    const callSites = allProductionFiles
      .filter((file) => {
        const source = fs.readFileSync(path.join(APP_ROOT, file), 'utf-8')
        return /setJurisdiction\(/.test(source) && !file.endsWith('mutations.ts')
      })
      .map((file) => file.split(path.sep).join('/'))
    expect(callSites).toEqual([])
  })
})

describe('subsystem boundaries -- crc-engine orchestrator', () => {
  test('the orchestrator IS the one module that imports actual logic from all three subsystems (positive assertion -- proves it is doing the coordination job, not just re-exporting types)', () => {
    expect(CRC_ENGINE_FILES.length).toBeGreaterThan(0)
    const importText = CRC_ENGINE_FILES.map((f) => importLinesOf(f).join('\n')).join('\n')
    expect(importText).toMatch(/lib\/interview-engine\/handoff/)
    expect(importText).toMatch(/lib\/retrieval-engine\/retrieve/)
    expect(importText).toMatch(/lib\/projection-layer\/assemble-projection-output/)
  })

  test('the orchestrator never imports an LLM/adapter module directly (buildRetrievalHandoff is a pure function; any model-backed component stays inside Interview Engine\'s own eval harness)', () => {
    const importText = CRC_ENGINE_FILES.map((f) => importLinesOf(f).join('\n')).join('\n')
    expect(importText).not.toMatch(/anthropic/i)
    expect(importText).not.toMatch(/openai/i)
    expect(importText).not.toMatch(/@anthropic-ai/i)
  })
})

describe('subsystem boundaries -- Consultative Answer Plan (CC-3A)', () => {
  const PLAN_FILE = 'lib/crc-engine/consultative-answer-plan.ts'
  const importText = importLinesOf(PLAN_FILE).join('\n')

  test('it exists (guards against a silent rename breaking this whole block)', () => {
    expect(fs.existsSync(path.join(APP_ROOT, PLAN_FILE))).toBe(true)
  })

  test('imports no Bounded Interpretation LOGIC -- only @/lib/bounded-interpretation/types', () => {
    expect(importText).not.toMatch(/lib\/bounded-interpretation\/(rules|build-bounded-interpretation)/i)
    expect(importText).toMatch(/@\/lib\/bounded-interpretation\/types/)
  })

  test('imports no Retrieval Engine LOGIC or Matrix fixture -- only @/lib/retrieval-engine/types', () => {
    expect(importText).not.toMatch(/lib\/retrieval-engine\/(retrieve|lookup-|enumerate-eligible-claims|extract-matchable-facts|assemble-result|matrix-fixture)/i)
    expect(importText).not.toMatch(/platform-rights-matrix/i)
  })

  test('imports no Interview Engine LOGIC -- only the shared @/types/interview-engine contract module', () => {
    expect(importText).not.toMatch(/lib\/interview-engine\//i)
  })

  test('imports no Projection Layer module (it will be consumed BY realization later, never a consumer of it)', () => {
    expect(importText).not.toMatch(/lib\/projection-layer\//i)
  })

  test('imports no LLM/adapter module -- the planner is a pure deterministic function', () => {
    expect(importText).not.toMatch(/anthropic/i)
    expect(importText).not.toMatch(/openai/i)
  })

  test('its only value (non-type) imports are the two crc-engine askability registries', () => {
    const valueImports = (importLinesOf(PLAN_FILE) ?? []).filter((line) => !/^import type /.test(line))
    for (const line of valueImports) {
      expect(line).toMatch(/\.\/(dependency-askability|selector-askability)/)
    }
  })

  test('CC-3B: the plan is consumed ONLY by the deterministic realization path -- never by BI, Retrieval, Interview, questioning, or ProjectionOutput assembly', () => {
    const ALLOWED = new Set([
      'lib/crc-engine/consultative-answer-plan.ts',
      'lib/crc-engine/consultative-realization.ts',
      'lib/crc-engine/run-crc-conversation.ts', // orchestrator builds the plan
      'lib/crc-engine/results-email-template.ts', // CC-3B: consumes plan to de-duplicate rendering
      'lib/crc-engine/results-email-delivery.ts', // passes the built plan to the template
      'lib/crc-engine/scripts/cc3a-plan-snapshots.ts',
      'lib/crc-engine/scripts/cc3b-before-after-snapshots.ts',
    ])
    const FORBIDDEN = [
      ...BOUNDED_INTERPRETATION_FILES,
      ...RETRIEVAL_ENGINE_FILES,
      ...INTERVIEW_ENGINE_FILES,
      'lib/projection-layer/assemble-projection-output.ts',
      'lib/projection-layer/project-knowledge-items.ts',
      'lib/projection-layer/understood-summary.ts',
      'lib/projection-layer/types.ts',
      'lib/crc-engine/run-turn.ts',
      'lib/crc-engine/complete-response.ts',
      'lib/crc-engine/selector-questioning.ts',
      'lib/crc-engine/knowledge-readiness.ts',
    ]
    for (const file of FORBIDDEN) {
      const source = fs.readFileSync(path.join(APP_ROOT, file), 'utf-8')
      expect(source).not.toMatch(/buildConsultativeAnswerPlan|consultative-answer-plan|consultative-realization/)
    }
    for (const file of CRC_ENGINE_FILES) {
      const source = fs.readFileSync(path.join(APP_ROOT, file), 'utf-8')
      if (/buildConsultativeAnswerPlan|consultative-answer-plan|consultative-realization/.test(source)) {
        expect(ALLOWED.has(file.split(path.sep).join('/'))).toBe(true)
      }
    }
  })
})

describe('subsystem boundaries -- Consultative Realization (CC-3B)', () => {
  const FILE = 'lib/crc-engine/consultative-realization.ts'
  const importText = importLinesOf(FILE).join('\n')

  test('it exists', () => {
    expect(fs.existsSync(path.join(APP_ROOT, FILE))).toBe(true)
  })

  test('imports no BI/Retrieval/Interview LOGIC, no Matrix, no LLM -- only types', () => {
    expect(importText).not.toMatch(/lib\/bounded-interpretation\/(rules|build-bounded-interpretation)/i)
    expect(importText).not.toMatch(/lib\/retrieval-engine\/(retrieve|lookup-|enumerate-eligible-claims|extract-matchable-facts|assemble-result|matrix-fixture)/i)
    expect(importText).not.toMatch(/lib\/interview-engine\//i)
    expect(importText).not.toMatch(/platform-rights-matrix/i)
    expect(importText).not.toMatch(/anthropic/i)
    expect(importText).not.toMatch(/openai/i)
  })

  test('every import is type-only', () => {
    for (const line of importLinesOf(FILE)) {
      expect(line).toMatch(/^import type /)
    }
  })
})
