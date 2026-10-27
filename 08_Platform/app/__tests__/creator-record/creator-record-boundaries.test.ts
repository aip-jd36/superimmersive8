/**
 * PRODUCT-A-MVP-SPIKE-1A — architecture boundaries of the isolated feasibility
 * module, enforced by source inspection.
 *
 *  - Only examine.anthropic.ts imports the Anthropic SDK, and the runner loads
 *    it only through a dynamic import (live mode).
 *  - lib/creator-record imports nothing from Living Knowledge, retrieval,
 *    bounded interpretation, projection, reviewer research, Product A preview,
 *    CRC, Supabase, payments, PDF or the app routes.
 *  - Only the CR-V2-VERTICAL-SLICE-1 internal admin prototype imports
 *    lib/creator-record, through an exact allowlist; browser code imports only
 *    pure contract/form/pilot/template modules, never the guidance engine.
 *  - The result vocabulary carries no assurance wording.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { DOCUMENT_TYPES, FIELD_STATUSES, READABILITY_VALUES } from '@/lib/creator-record/receipt-examination/schema'

const APP_ROOT = path.resolve(__dirname, '..', '..')
const MODULE_ROOT = path.join(APP_ROOT, 'lib', 'creator-record')

function walk(dir: string, exts = ['.ts', '.tsx']): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'generated') continue
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

const moduleFiles = walk(MODULE_ROOT)
const staticImports = (src: string) => Array.from(src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)).map((m) => m[1])
/** Imports that survive compilation (excludes `import type`). */
const runtimeImports = (src: string) => Array.from(src.matchAll(/^\s*import\s(?!type\s)[^;]*?from\s+['"]([^'"]+)['"]/gm)).map((m) => m[1])
const CONTRACT_ROOT = path.join(MODULE_ROOT, 'contract')
const INTEGRATION_ROOT = path.join(MODULE_ROOT, 'integration')
/**
 * CR-IMPL-1b: the integration layer is the ONLY place in lib/creator-record that
 * may load existing SI8 runtime code, and only these modules (reused unchanged).
 */
const INTEGRATION_RUNTIME_ALLOWED = [
  '@/lib/bounded-interpretation/build-bounded-interpretation',
  '@/lib/hrr/bi-adapters',
  '@/lib/interview-engine/extraction',
  '@/lib/production-review/build-production-facts',
  // LK-EXCLUSION-ACTIVATION-READINESS-1: the shared governed-value contract (ADR-001 §L.9).
  '@/lib/retrieval-engine/governed-applicability-values',
  '@/lib/reviewer-lk/select-reviewer-claims',
]
const INTEGRATION_TYPE_ONLY_ALLOWED = [
  '@/lib/bounded-interpretation/types',
  '@/lib/retrieval-engine/lookup-topic-claims',
  '@/lib/retrieval-engine/types',
  '@/lib/reviewer-lk/types',
  '@/types/interview-engine',
]
/** CR-IMPL-1: the contract core may read the real governed shapes, type-only. */
const CONTRACT_TYPE_ONLY_ALLOWED = ['@/lib/retrieval-engine/types', '@/lib/bounded-interpretation/types']
/**
 * CR-V2-VERTICAL-SLICE-1: governed sources, pilot data, presentation and the
 * prototype orchestrator. No runtime import outside lib/creator-record; only
 * the governed claim shape, type-only.
 */
const SLICE_DIRS = ['governed', 'pilot', 'presentation', 'prototype'].map((d) => path.join(MODULE_ROOT, d))
const SLICE_TYPE_ONLY_ALLOWED = ['@/lib/retrieval-engine/types']
const inSlice = (f: string) => SLICE_DIRS.some((d) => f.startsWith(d + path.sep))
/** CR-V2-WORK-UAT-HARNESS-2: the public harness module (its own, stricter rule below). */
const PUBLIC_UAT_ROOT = path.join(MODULE_ROOT, 'public-uat')

describe('lib/creator-record boundaries', () => {
  test('only examine.anthropic.ts imports the Anthropic SDK', () => {
    const importers = moduleFiles.filter((f) => staticImports(readFileSync(f, 'utf8')).some((i) => i.startsWith('@anthropic-ai/sdk')))
    expect(importers.map((f) => path.basename(f))).toEqual(['examine.anthropic.ts'])
  })

  test('the runner reaches the SDK adapter only via a dynamic import', () => {
    const runner = readFileSync(path.join(MODULE_ROOT, 'eval', 'run-receipt-eval.ts'), 'utf8')
    expect(staticImports(runner).some((i) => i.includes('examine.anthropic'))).toBe(false)
    expect(runner).toContain("await import('../receipt-examination/examine.anthropic')")
  })

  test('imports nothing from governed-knowledge, CRC, Product A/B or application layers', () => {
    const forbidden = [
      '@/lib/retrieval-engine', '@/lib/bounded-interpretation', '@/lib/projection-layer', '@/lib/reviewer-lk',
      '@/lib/hrr', '@/lib/production-review', '@/lib/crc-engine', '@/lib/assessments', '@/lib/supabase',
      '@/lib/payments', '@/lib/pdf', '@/lib/emails', '@/app/', '@/components/', 'stripe', '@supabase/',
    ]
    const offenders = moduleFiles.flatMap((f) => {
      const src = readFileSync(f, 'utf8')
      const runtime = new Set(runtimeImports(src))
      return staticImports(src)
        .filter((i) => forbidden.some((x) => i.startsWith(x)))
        .filter((i) => !(f.startsWith(CONTRACT_ROOT) && CONTRACT_TYPE_ONLY_ALLOWED.includes(i) && !runtime.has(i)))
        .filter((i) => !(f.startsWith(INTEGRATION_ROOT) && (INTEGRATION_RUNTIME_ALLOWED.includes(i) || (INTEGRATION_TYPE_ONLY_ALLOWED.includes(i) && !runtime.has(i)))))
        .filter((i) => !(inSlice(f) && SLICE_TYPE_ONLY_ALLOWED.includes(i) && !runtime.has(i)))
        // CR-V2-WORK-UAT-HARNESS-2: public-uat/ may read the governed claim shape, type-only.
        .filter((i) => !(f.startsWith(PUBLIC_UAT_ROOT + path.sep) && SLICE_TYPE_ONLY_ALLOWED.includes(i) && !runtime.has(i)))
        .map((i) => `${path.basename(f)} -> ${i}`)
    })
    expect(offenders).toEqual([])
  })

  test('the only reused application modules are tool-name normalization and the structured-output helpers', () => {
    const external = new Set(
      moduleFiles.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => i.startsWith('@/'))),
    )
    expect(Array.from(external).sort()).toEqual([
      '@/lib/bounded-interpretation/build-bounded-interpretation',
      '@/lib/bounded-interpretation/types',
      '@/lib/hrr/bi-adapters',
      '@/lib/interview-engine/anthropic-structured-output-retry',
      '@/lib/interview-engine/extraction',
      '@/lib/production-review/build-production-facts',
      '@/lib/retrieval-engine/governed-applicability-values',
      '@/lib/retrieval-engine/lookup-topic-claims',
      '@/lib/retrieval-engine/types',
      '@/lib/reviewer-lk/select-reviewer-claims',
      '@/lib/reviewer-lk/types',
      // CR-V2-EVIDENCE-SLICE-1: the canonical identity registries (identity/ only).
      '@/lib/tool-identity/registry',
      '@/types/interview-engine',
    ])
  })

  test('CR-IMPL-1 contract core: no runtime import outside lib/creator-record/contract, only the two governed type modules', () => {
    const contractFiles = walk(CONTRACT_ROOT)
    const runtimeExternal = contractFiles.flatMap((f) => runtimeImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('./') && !i.startsWith('../')).map((i) => `${path.basename(f)} -> ${i}`))
    expect(runtimeExternal).toEqual([])
    const typeExternal = new Set(contractFiles.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => i.startsWith('@/'))))
    expect(Array.from(typeExternal).every((i) => CONTRACT_TYPE_ONLY_ALLOWED.includes(i))).toBe(true)
    // Relative imports stay inside the contract folder (no receipt examination, eval or SDK).
    const escaping = contractFiles.flatMap((f) =>
      staticImports(readFileSync(f, 'utf8'))
        .filter((i) => i.startsWith('.'))
        .filter((i) => !path.resolve(path.dirname(f), i).startsWith(CONTRACT_ROOT))
        .map((i) => `${path.basename(f)} -> ${i}`),
    )
    expect(escaping).toEqual([])
  })

  test('CR-IMPL-1b integration: runtime imports are exactly the allowlist; everything else type-only; nothing outside creator-record contract/integration', () => {
    const files = walk(INTEGRATION_ROOT)
    const runtime = new Set(files.flatMap((f) => runtimeImports(readFileSync(f, 'utf8')).filter((i) => i.startsWith('@/'))))
    expect(Array.from(runtime).sort()).toEqual(INTEGRATION_RUNTIME_ALLOWED)
    const typeOnly = new Set(files.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => i.startsWith('@/') && !runtime.has(i))))
    expect(Array.from(typeOnly).every((i) => INTEGRATION_TYPE_ONLY_ALLOWED.includes(i))).toBe(true)
    const nonAlias = files.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('@/') && !i.startsWith('.')).map((i) => `${path.basename(f)} -> ${i}`))
    expect(nonAlias).toEqual([])
    const escaping = files.flatMap((f) =>
      staticImports(readFileSync(f, 'utf8'))
        .filter((i) => i.startsWith('.'))
        .filter((i) => {
          const target = path.resolve(path.dirname(f), i)
          return !(target.startsWith(INTEGRATION_ROOT) || target.startsWith(CONTRACT_ROOT)) || target.includes(`${path.sep}testing${path.sep}`)
        })
        .map((i) => `${path.basename(f)} -> ${i}`),
    )
    expect(escaping).toEqual([])
  })

  test('CR-IMPL-1b: the contract core never imports the integration layer (dependency direction)', () => {
    const back = walk(CONTRACT_ROOT).flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => i.includes('integration')).map((i) => `${path.basename(f)} -> ${i}`))
    expect(back).toEqual([])
  })

  test('CR-IMPL-1 synthetic fixtures are imported only by tests', () => {
    const importers = moduleFiles.filter((f) => /testing\/synthetic-fixtures/.test(readFileSync(f, 'utf8')))
    expect(importers).toEqual([])
  })

  test('CR-V2-VERTICAL-SLICE-1: only the internal admin prototype imports lib/creator-record (exact allowlist)', () => {
    const appFiles = [
      ...walk(path.join(APP_ROOT, 'app')),
      ...walk(path.join(APP_ROOT, 'components')),
      ...walk(path.join(APP_ROOT, 'lib')).filter((f) => !f.startsWith(MODULE_ROOT)),
    ]
    const importers = appFiles
      .filter((f) => /from\s+['"][^'"]*creator-record\//.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(APP_ROOT, f).split(path.sep).join('/'))
      .sort()
    expect(importers).toEqual([
      'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx',
      'app/admin/creator-record-v2/page.tsx',
      'app/api/admin/creator-record-v2/draft/route.ts',
      'app/api/admin/creator-record-v2/examine/route.ts',
      'app/api/uat/creator-record-v2/draft/route.ts',
      'app/uat/creator-record-v2/PublicUatClient.tsx',
      'app/uat/creator-record-v2/page.tsx',
      'components/creator-record/CreatorRecordQuestionnaire.tsx',
      'components/creator-record/DocumentReviewPanel.tsx',
      'components/creator-record/DraftRecordView.tsx',
    ])
  })

  test('CR-V2-VERTICAL-SLICE-1: only the server route loads the guidance engine; browser code gets pure modules only', () => {
    const importsOf = (rel: string) => staticImports(readFileSync(path.join(APP_ROOT, rel), 'utf8')).filter((i) => i.includes('creator-record/'))
    expect(importsOf('app/api/admin/creator-record-v2/draft/route.ts').sort()).toEqual([
      '@/lib/creator-record/evidence/verify-returned-documents',
      '@/lib/creator-record/prototype/build-draft',
      '@/lib/creator-record/prototype/parse-form-state',
    ])
    // CR-V2-EVIDENCE-SLICE-1: the examine route loads only the evidence module; the page only the gate and the plan suggestions.
    expect(importsOf('app/api/admin/creator-record-v2/examine/route.ts').sort()).toEqual([
      '@/lib/creator-record/evidence/config',
      '@/lib/creator-record/evidence/document-observations',
      '@/lib/creator-record/evidence/examine-upload',
      '@/lib/creator-record/evidence/live-caller',
    ])
    expect(importsOf('app/admin/creator-record-v2/page.tsx').sort()).toEqual(['@/lib/creator-record/evidence/config', '@/lib/creator-record/integration/plan-suggestions'])
    const BROWSER_ALLOWED = [
      '@/lib/creator-record/contract/question-registry',
      '@/lib/creator-record/evidence/document-observations',
      '@/lib/creator-record/pilot/pilot-registry',
      '@/lib/creator-record/presentation/build-draft-record',
      '@/lib/creator-record/presentation/templates',
      '@/lib/creator-record/prototype/form',
      '@/components/creator-record/CreatorRecordQuestionnaire',
      '@/components/creator-record/DocumentReviewPanel',
      '@/components/creator-record/DraftRecordView',
    ]
    for (const f of [
      'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx',
      'components/creator-record/CreatorRecordQuestionnaire.tsx',
      'components/creator-record/DocumentReviewPanel.tsx',
      'components/creator-record/DraftRecordView.tsx',
    ]) {
      const src = readFileSync(path.join(APP_ROOT, f), 'utf8')
      const runtime = runtimeImports(src).filter((i) => i.includes('creator-record'))
      for (const i of runtime) expect(BROWSER_ALLOWED).toContain(i)
    }
    // build-draft-record is imported by browser code type-only.
    const client = readFileSync(path.join(APP_ROOT, 'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx'), 'utf8')
    expect(runtimeImports(client)).not.toContain('@/lib/creator-record/presentation/build-draft-record')
  })

  test('CR-V2-VERTICAL-SLICE-1: governed sources, pilot, presentation and prototype make no runtime import outside lib/creator-record', () => {
    const files = SLICE_DIRS.flatMap((d) => walk(d))
    expect(files.length).toBeGreaterThan(5)
    const runtimeExternal = files.flatMap((f) => runtimeImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('.')).map((i) => `${path.basename(f)} -> ${i}`))
    expect(runtimeExternal).toEqual([])
    const typeExternal = new Set(files.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('.'))))
    expect(Array.from(typeExternal).every((i) => SLICE_TYPE_ONLY_ALLOWED.includes(i))).toBe(true)
    const escaping = files.flatMap((f) =>
      staticImports(readFileSync(f, 'utf8'))
        .filter((i) => i.startsWith('.'))
        .filter((i) => {
          const t = path.resolve(path.dirname(f), i)
          // CR-V2-EVIDENCE-SLICE-1: of evidence/, only the pure observation module is reachable from the slice.
          const evidenceOtherThanObservations = t.includes(`${path.sep}evidence${path.sep}`) && !t.endsWith(`${path.sep}evidence${path.sep}document-observations`)
          return !t.startsWith(MODULE_ROOT) || t.includes(`${path.sep}testing${path.sep}`) || t.includes(`${path.sep}receipt-examination`) || t.includes(`${path.sep}eval`) || evidenceOtherThanObservations
        })
        .map((i) => `${path.basename(f)} -> ${i}`),
    )
    expect(escaping).toEqual([])
  })

  test('CR-V2-WORK-UAT-HARNESS-2: public-uat/ makes no runtime import outside lib/creator-record and reaches no examination, live, gate or SDK module', () => {
    const files = walk(PUBLIC_UAT_ROOT)
    expect(files.length).toBeGreaterThan(3)
    const runtimeExternal = files.flatMap((f) => runtimeImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('.')).map((i) => `${path.basename(f)} -> ${i}`))
    expect(runtimeExternal).toEqual([])
    const typeExternal = new Set(files.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('.'))))
    expect(Array.from(typeExternal).every((i) => SLICE_TYPE_ONLY_ALLOWED.includes(i))).toBe(true)
    const allowed = [
      'contract/provenance',
      'evidence/document-observations',
      'evidence/replay',
      'presentation/build-draft-record',
      'presentation/templates',
      'prototype/build-draft',
      'prototype/form',
      'prototype/parse-form-state',
      'receipt-examination/prompt',
      'receipt-examination/schema',
    ]
    for (const f of files) {
      for (const i of staticImports(readFileSync(f, 'utf8')).filter((x) => x.startsWith('.'))) {
        const t = path.relative(MODULE_ROOT, path.resolve(path.dirname(f), i)).split(path.sep).join('/')
        expect([t, t.startsWith('public-uat/') || allowed.includes(t)]).toEqual([t, true])
      }
    }
    // receipt-examination/prompt (it builds the model request) is reachable type-only.
    for (const f of files) expect(runtimeImports(readFileSync(f, 'utf8')).some((i) => i.endsWith('receipt-examination/prompt'))).toBe(false)
  })

  test('CR-V2-EVIDENCE-SLICE-1: identity/ loads only the two canonical registries and the contract', () => {
    const files = walk(path.join(MODULE_ROOT, 'identity'))
    expect(files.length).toBe(1)
    const imports = files.flatMap((f) => staticImports(readFileSync(f, 'utf8')))
    expect(imports.filter((i) => !i.startsWith('.')).sort()).toEqual(['@/lib/tool-identity/registry', '@/types/interview-engine'])
    expect(imports.filter((i) => i.startsWith('.'))).toEqual(['../contract/question-registry'])
    // Identity is never derived from a publication ledger or from alias resolution.
    expect(imports.some((i) => /pilot|governed|ledger|extraction/.test(i))).toBe(false)
  })

  test('CR-V2-EVIDENCE-SLICE-1: evidence/ makes no storage, database, network or SDK import; the live adapter only behind the gate', () => {
    const files = walk(path.join(MODULE_ROOT, 'evidence'))
    const external = files.flatMap((f) => staticImports(readFileSync(f, 'utf8')).filter((i) => !i.startsWith('.')).map((i) => `${path.basename(f)} -> ${i}`))
    expect(external).toEqual(['examine-upload.ts -> node:crypto'])
    const relativeTargets = new Set(
      files.flatMap((f) =>
        staticImports(readFileSync(f, 'utf8'))
          .filter((i) => i.startsWith('.'))
          .map((i) => path.relative(MODULE_ROOT, path.resolve(path.dirname(f), i)).split(path.sep).join('/')),
      ),
    )
    for (const t of Array.from(relativeTargets)) {
      expect(['contract/provenance', 'receipt-examination/examine', 'receipt-examination/prompt', 'receipt-examination/schema'].includes(t) || t.startsWith('evidence/')).toBe(true)
    }
    for (const f of files) expect(staticImports(readFileSync(f, 'utf8')).some((i) => i.includes('examine.anthropic'))).toBe(false)
    const live = readFileSync(path.join(MODULE_ROOT, 'evidence', 'live-caller.ts'), 'utf8')
    const gate = live.indexOf('if (!liveExtractionEnabled(env))')
    const load = live.indexOf("await import('../receipt-examination/examine.anthropic')")
    expect(gate).toBeGreaterThan(-1)
    expect(load).toBeGreaterThan(gate)
    // Nothing else in the app reaches the adapter, except the eval runner.
    const reachers = [...moduleFiles, ...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components'))]
      .filter((f) => !f.endsWith('examine.anthropic.ts') && /examine\.anthropic'/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(APP_ROOT, f).split(path.sep).join('/'))
      .sort()
    expect(reachers).toEqual(['lib/creator-record/eval/run-receipt-eval.ts', 'lib/creator-record/evidence/live-caller.ts'])
  })

  test('CR-V2-VERTICAL-SLICE-1: the authoritative sources never import the pilot and carry no pilot marker', () => {
    const src = readFileSync(path.join(MODULE_ROOT, 'governed', 'sources.ts'), 'utf8')
    expect(staticImports(src).some((i) => i.includes('pilot'))).toBe(false)
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/PILOT/)
  })

  test('CR-V2-VERTICAL-SLICE-1: pilot data is reachable only through the prototype orchestrator and the prototype client', () => {
    const files = [...moduleFiles.filter((f) => !f.includes(`${path.sep}pilot${path.sep}`)), ...walk(path.join(APP_ROOT, 'app')), ...walk(path.join(APP_ROOT, 'components'))]
    const importers = files
      .filter((f) => staticImports(readFileSync(f, 'utf8')).some((i) => /creator-record\/pilot\/|^\.\.?\/(\.\.\/)*pilot\//.test(i)))
      .map((f) => path.relative(APP_ROOT, f).split(path.sep).join('/'))
      .sort()
    expect(importers).toEqual([
      'app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx',
      // CR-V2-WORK-UAT-HARNESS-2: the public harness client renders the same pilot questionnaire.
      'app/uat/creator-record-v2/PublicUatClient.tsx',
      'lib/creator-record/prototype/build-draft.ts',
    ])
  })

  test('result vocabulary contains no assurance wording', () => {
    const compareSrc = readFileSync(path.join(MODULE_ROOT, 'receipt-examination', 'compare.ts'), 'utf8')
    const reasonUnion = compareSrc.slice(compareSrc.indexOf('export type ComparisonReason'), compareSrc.indexOf('export interface Comparison '))
    const vocabulary = [...DOCUMENT_TYPES, ...READABILITY_VALUES, ...FIELD_STATUSES, 'consistent', 'differs', 'not_shown', 'unresolved', reasonUnion].join(' ')
    expect(vocabulary).not.toMatch(/verif|certif|clear|approv|complian|entitle|licen[cs]e|audit|pass(ed)?\b/i)
  })
})
