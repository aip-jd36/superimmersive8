/**
 * CAH-4G.3 Slice 3 — static architecture firewall for `lib/hrr/**`.
 *
 * `lib/hrr/` is the CAH-4G convergence layer: it may import `lib/reviewer-lk/`
 * selection + `lib/bounded-interpretation/` — and NOTHING else that would let
 * it retrieve CRC-eligible knowledge, read Linked CRC context, mutate
 * assessment state, persist the raw reviewer question, write an audit row,
 * compose an answer with a model, or touch the UI.
 */

import * as fs from 'fs'
import * as path from 'path'

const APP_ROOT = path.join(__dirname, '..', '..')
const HRR_DIR = 'lib/hrr'

function listTs(rel: string): string[] {
  const full = path.join(APP_ROOT, rel)
  if (!fs.existsSync(full)) return []
  const out: string[] = []
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const p = `${rel}/${e.name}`
    if (e.isDirectory()) out.push(...listTs(p))
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}
const read = (rel: string) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf-8')
const codeOnly = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const importLines = (rel: string) => (read(rel).match(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]/gm) ?? []).join('\n')

const HRR_FILES = listTs(HRR_DIR)

describe('lib/hrr module tree', () => {
  test('is present and non-trivial', () => {
    expect(HRR_FILES.length).toBeGreaterThanOrEqual(4)
    expect(HRR_FILES).toEqual(expect.arrayContaining([
      'lib/hrr/run-hrr-research.ts',
      'lib/hrr/bi-adapters.ts',
      'lib/hrr/types.ts',
      'lib/hrr/project-hrr-research-answer.ts',
    ]))
  })
})

describe('lib/hrr imports the reviewer selector + Bounded Interpretation ONLY', () => {
  test.each(HRR_FILES)('%s imports no CRC retrieval orchestrator / eligibility enumerator', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/@\/lib\/retrieval-engine\/retrieve/)
    expect(imp).not.toMatch(/enumerate-eligible-claims|enumerateEligibleClaims/)
    expect(imp).not.toMatch(/lookup-topic-relationships|lookup-discovered-topic-claims/)
  })

  test.each(HRR_FILES)('%s never imports CRC sessions / CRC engine / CRC sales / CRC project or assurance context', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/@\/lib\/crc-engine/)
    expect(imp).not.toMatch(/@\/lib\/crc-sales/)
    expect(imp).not.toMatch(/@\/lib\/crc-project-context/)
    expect(imp).not.toMatch(/@\/lib\/crc-assurance/)
    expect(imp).not.toMatch(/crc_sessions|supabase-session-store|crc-leads/)
  })

  test.each(HRR_FILES)('%s never imports a Linked CRC transcript / CRC context service', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/@\/lib\/reviewer-context/)
    expect(imp).not.toMatch(/reviewer-crc-context|crc.*transcript|linked.*crc/i)
  })

  test.each(HRR_FILES)('%s never imports an assessment write service or the workbook mutation path', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/@\/lib\/assessments/)
    expect(imp).not.toMatch(/patchWorkbookAtomic|updateAssessment|signOffAssessment|workbook\/route/)
  })

  test.each(HRR_FILES)('%s imports no composition model / Anthropic adapter / the raw intent classifier adapter', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/@anthropic-ai\/sdk/)
    expect(imp).not.toMatch(/anthropic-structured-output-retry|anthropic-decision|anthropic-extractor|anthropic-candidate-question/)
    expect(imp).not.toMatch(/interpret-research-intent\.anthropic/)
    // Slice 4 (CAH-4G.4): the deterministic composer exists, but the pipeline
    // core (run-hrr-research.ts / bi-adapters.ts) must never depend on it —
    // composition is strictly downstream, and project-hrr-research-answer.ts
    // itself never imports its own name.
    expect(imp).not.toMatch(/project-hrr-research-answer|projectHrrResearchAnswer/)
  })

  test.each(HRR_FILES)('%s imports no UI / React component', (rel) => {
    const imp = importLines(rel)
    expect(imp).not.toMatch(/\.tsx['"]|ReviewerLkLookup|ReviewerShell|next\/server|react/i)
  })
})

describe('lib/hrr writes nothing and persists no raw question', () => {
  test.each(HRR_FILES)('%s performs no DB write, no audit call, no raw-question persistence/logging', (rel) => {
    const src = codeOnly(rel)
    expect(src).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/)
    expect(src).not.toMatch(/\.rpc\s*\(/)
    expect(src).not.toMatch(/\.from\s*\(\s*['"]/)
    expect(src).not.toMatch(/recordHrrResearchAccess|recordReviewerLkAccess|logPilotEvent/)
    expect(src).not.toMatch(/console\.(log|info|warn|error)\([^)]*attributedQuestion/)
  })

  test('run-hrr-research.ts never passes the raw question into selection / applicability / BI', () => {
    const src = codeOnly('lib/hrr/run-hrr-research.ts')
    // attributedQuestion is read once, only to place it on the result
    const uses = src.match(/attributedQuestion/g) ?? []
    expect(uses.length).toBeGreaterThan(0)
    // it must NOT be forwarded to researchOneTopic / selectReviewerClaims / buildBoundedInterpretations
    expect(src).not.toMatch(/researchOneTopic\([^)]*attributedQuestion/)
    expect(src).not.toMatch(/selectReviewerClaims\([^)]*attributedQuestion/)
    expect(src).not.toMatch(/buildBoundedInterpretations\([^)]*attributedQuestion/)
    // it is only ever surfaced on the result as `attributed_question` (shorthand)
    expect(src).toMatch(/^\s*attributed_question,\s*$/m)
  })
})

describe('only gated / normalized intent can enter the orchestrator', () => {
  test('runHrrResearch accepts HrrAuthorityGateResult (the deterministic gate output), not raw PermittedResearchIntent or a parse result', () => {
    const src = read('lib/hrr/run-hrr-research.ts')
    expect(src).toMatch(/gate:\s*HrrAuthorityGateResult/)
    expect(src).not.toMatch(/gate:\s*PermittedResearchIntent/)
    expect(src).not.toMatch(/parsed_output|messages\.parse|validateAndNormalizePermittedResearchIntent/)
  })

  test('researchIntentToBiIntent maps ONLY {topic, scope} into BiIntent — no applicability/project fact, no raw reviewer text', () => {
    const src = codeOnly('lib/hrr/bi-adapters.ts')
    // isolate the researchIntentToBiIntent function body
    const body = src.slice(src.indexOf('export function researchIntentToBiIntent'), src.indexOf('export function reviewerClaimToBiResult'))
    expect(body).not.toMatch(/applicability|jurisdiction|project_fact|human_contribution|toolMentions|applicability_outcomes/i)
    expect(body).toMatch(/reviewerTopicLabel\(intent\.topic\)/) // fixed topic label, never raw reviewer text
    expect(body).toMatch(/category:\s*intent\.topic/)
    expect(body).toMatch(/scope:\s*intent\.scope/)
  })

  test('reviewerClaimToBiResult TRANSLATES the already-determined applicability — it never re-evaluates or infers a fact (CAH-4G.3A)', () => {
    const src = codeOnly('lib/hrr/bi-adapters.ts')
    const body = src.slice(src.indexOf('export function reviewerClaimToBiResult'))
    // reads the upstream outcome...
    expect(body).toMatch(/claim\.applicability_outcomes\.filter\(\(o\) => o\.status === 'unresolved'\)/)
    expect(body).toMatch(/status:\s*'unresolved'|status:\s*'established'/)
    // ...but NEVER calls the evaluator or an inference primitive
    expect(body).not.toMatch(/evaluateApplicabilityDetailed|isApplicable|evaluateRequirementStatus|jurisdiction|toolMentions/)
    expect(body).not.toMatch(/@anthropic|messages\.parse/)
  })
})

describe('reviewer-lk authority firewall is unchanged (lib/reviewer-lk still imports no BI)', () => {
  test('no lib/reviewer-lk file imports bounded-interpretation or a composition module', () => {
    for (const rel of listTs('lib/reviewer-lk')) {
      expect(importLines(rel)).not.toMatch(/bounded-interpretation|consultative-answer-plan|consultative-realization/)
    }
  })
})
