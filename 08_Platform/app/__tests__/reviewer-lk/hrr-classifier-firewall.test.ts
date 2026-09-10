/**
 * CAH-4G.2 Slice 2 — static architecture firewall for the HRR
 * research-intent classifier + authority gate.
 *
 * The classifier is an INTENT-ENTRY mechanism only. Structurally, it and the
 * authority gate must be incapable of retrieving governed knowledge,
 * evaluating applicability, running Bounded Interpretation, composing an
 * answer, reading Linked CRC context, mutating assessment state, or
 * persisting the raw reviewer question. And the existing topic-button path
 * must invoke NO classifier / model call (Phase 11).
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const importLines = (rel: string) => (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

const SLICE2_FILES = [
  'lib/reviewer-lk/interpret-research-intent.ts',
  'lib/reviewer-lk/interpret-research-intent.anthropic.ts',
  'lib/reviewer-lk/interpret-research-intent.mock.ts',
  'lib/reviewer-lk/hrr-authority-gate.ts',
]

describe('the classifier + authority gate retrieve / evaluate / interpret / compose NOTHING', () => {
  test.each(SLICE2_FILES)('%s imports no governed-knowledge retrieval, applicability, BI, or composition module', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/select-reviewer-claims/)
    expect(imp).not.toMatch(/@\/lib\/retrieval-engine\/retrieve/)
    expect(imp).not.toMatch(/lookup-topic-claims|evaluateApplicability|applicability/i)
    expect(imp).not.toMatch(/@\/lib\/bounded-interpretation/)
    expect(imp).not.toMatch(/consultative-answer-plan|consultative-realization|project-reviewer-claims|projectHrrResearchAnswer/)
  })

  test.each(SLICE2_FILES)('%s imports nothing from lib/assessments, the workbook write path, or lib/crc-sales / crc-engine', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/@\/lib\/assessments/)
    expect(imp).not.toMatch(/patchWorkbookAtomic|updateAssessment|signOffAssessment|workbook\/route/)
    expect(imp).not.toMatch(/@\/lib\/crc-sales|@\/lib\/crc-engine|@\/lib\/crc-project-context|@\/lib\/crc-assurance/)
  })

  test.each(SLICE2_FILES)('%s reads no Linked CRC transcript / CRC context and holds no conversation history', (rel) => {
    const src = codeOnly(rel)
    const imp = importLines(rel)
    expect(imp).not.toMatch(/reviewer-context|reviewer-crc-context|crc.*transcript|linked.*crc/i)
    expect(src).not.toMatch(/transcript|conversation_history|prior_question|previousQuestion|history\b/i)
  })

  test.each(SLICE2_FILES)('%s does not import the CRC UserGoal-shaped types as its intent type', (rel) => {
    // A type-only import of the shared @/types/interview-engine module is fine
    // (GoalScope), but the intent shape must be HRR-owned, never `UserGoal`.
    const src = read(rel)
    expect(src).not.toMatch(/\bUserGoal\b/)
    expect(src).not.toMatch(/buildRetrievalHandoff|StructuredUnderstanding|user_goals/)
  })

  test.each(SLICE2_FILES)('%s performs no DB write (no .insert / .update / .upsert / .delete / .rpc)', (rel) => {
    const src = codeOnly(rel)
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/)
    expect(src).not.toMatch(/\.rpc\s*\(/)
    expect(src).not.toMatch(/\.from\s*\(\s*['"]/)
  })

  test('the raw reviewer question is never persisted or logged as content', () => {
    for (const rel of SLICE2_FILES) {
      const src = codeOnly(rel)
      // no persistence primitives (covered above); also no logging of the question text itself
      expect(src).not.toMatch(/console\.(log|info|warn|error)\([^)]*reviewerQuestion/)
      expect(src).not.toMatch(/logPilotEvent|recordHrrResearchAccess|audit/i)
    }
  })

  test('no answer-composition path: the classifier module declares no function whose name implies it answers / composes / concludes', () => {
    const converterShape = /\b(answer|compose|conclude|summari[sz]e|render|project)[A-Za-z]*(Answer|Response|Conclusion|Statement|Claim)\b/i
    for (const rel of SLICE2_FILES) {
      const decls = codeOnly(rel).match(/(?:export\s+)?(?:function|const)\s+[A-Za-z0-9_]+/g) ?? []
      for (const d of decls) expect(d).not.toMatch(converterShape)
    }
  })
})

describe('the authority gate is deterministic (no model, no async I/O)', () => {
  test('hrr-authority-gate.ts imports no SDK, no async model adapter, and its exported gate is synchronous', () => {
    const src = read('lib/reviewer-lk/hrr-authority-gate.ts')
    expect(importLines('lib/reviewer-lk/hrr-authority-gate.ts')).not.toMatch(/@anthropic-ai\/sdk|anthropic-|\.anthropic|Promise/)
    expect(src).toMatch(/export function hrrAuthorityGate\(/)
    expect(src).not.toMatch(/async function hrrAuthorityGate|await /)
  })
})

describe('Phase 11 — the topic-button path invokes NO classifier / model call', () => {
  const TOPIC_PATH_FILES = [
    'lib/reviewer-lk/select-reviewer-claims.ts',
    'lib/reviewer-lk/project-reviewer-claims.ts',
    'lib/reviewer-lk/repository.ts',
    'lib/reviewer-lk/submission-facts.ts',
    'lib/reviewer-lk/eligibility.ts',
    'lib/reviewer-lk/topic-labels.ts',
    'app/api/admin/submissions/[id]/reviewer-lk/route.ts',
  ]

  test.each(TOPIC_PATH_FILES)('%s imports no HRR classifier / authority gate / Anthropic adapter', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/interpret-research-intent|hrr-authority-gate|hrr-intent/i)
    expect(imp).not.toMatch(/@anthropic-ai\/sdk|anthropic-structured-output-retry|anthropic-decision|anthropic-extractor/)
  })

  test('the reviewer-lk route still exports GET only and reads no request body (topic path unchanged)', () => {
    const src = codeOnly('app/api/admin/submissions/[id]/reviewer-lk/route.ts')
    expect(src).toMatch(/export async function GET\b/)
    expect(src).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)\b/)
    expect(src).not.toMatch(/request\.(json|formData|text)\(\)/)
    expect(src).toMatch(/searchParams\.get\(\s*['"]topic['"]\s*\)/)
  })
})

describe('Slice 2 adds no route, no migration, no UI', () => {
  test('no new HRR route file exists', () => {
    const routeDir = path.join(APP_ROOT, 'app/api/admin/submissions/[id]/reviewer-lk')
    const entries = fs.existsSync(routeDir) ? fs.readdirSync(routeDir) : []
    expect(entries).toEqual(['route.ts']) // no research/route.ts, no POST route
  })

  test('no CAH-4G migration was added', () => {
    const migDir = path.join(APP_ROOT, '..', 'supabase', 'migrations')
    const migs = fs.existsSync(migDir) ? fs.readdirSync(migDir) : []
    expect(migs.filter((m) => /hrr|cah.?4g|research_audit|research_mode/i.test(m))).toEqual([])
  })

  test('the reviewer lookup UI still has no free-form input (unchanged by Slice 2)', () => {
    const src = codeOnly('app/admin/submissions/[id]/review/ReviewerLkLookup.tsx')
    expect(src).not.toMatch(/<textarea|<input\b/)
    expect(src).not.toMatch(/interpret-research-intent|hrr-authority-gate/)
  })
})

describe('shared structured-output retry helper — HRR reuse is additive only', () => {
  test('StructuredOutputAdapterName includes hrr_intent_classifier without a runtime branch on adapter name', () => {
    const src = read('lib/interview-engine/anthropic-structured-output-retry.ts')
    expect(src).toMatch(/'decider'\s*\|\s*'candidate_generator'\s*\|\s*'hrr_intent_classifier'/)
    // the adapter value is only ever a telemetry / error-message label, never a switch key
    expect(src).not.toMatch(/switch\s*\(\s*adapter\s*\)|if\s*\(\s*adapter\s*===\s*'/)
  })

  test('the HRR anthropic adapter reuses the shared helper, not a forked retry stack', () => {
    const imp = importLines('lib/reviewer-lk/interpret-research-intent.anthropic.ts')
    expect(imp).toMatch(/callWithOneRecoveryRetry[\s\S]*anthropic-structured-output-retry/)
  })
})
