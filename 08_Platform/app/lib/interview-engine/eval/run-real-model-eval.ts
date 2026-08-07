/**
 * Real-model extraction evaluation harness (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6a substage 2).
 *
 * NOT a Jest test. Never runs during `npx jest` -- it lives outside
 * __tests__/, is named without .test./.spec., and is only ever invoked via:
 *
 *   npm run eval:extraction
 *
 * Fails explicitly and immediately if ANTHROPIC_API_KEY is unavailable --
 * never silently substitutes the mock extractor. This script makes live,
 * billed calls to the Anthropic API when it runs.
 *
 * Reports results SEPARATELY from and in addition to the deterministic
 * unit-test suite (extraction.test.ts) -- this measures whether
 * natural-language extraction actually works; that file only proves the
 * pipeline plumbing.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { CandidateObservation, ExtractionDiagnostic, RawUserTurn } from '../extraction'
import { runExtractionPipeline } from '../extraction'
import { createAnthropicExtractor, DEFAULT_MODEL } from '../anthropic-extractor'
import { EVAL_CORPUS, type EvalScenario } from './corpus'
import { emptyStructuredUnderstanding } from './empty-structured-understanding'

// ── Minimal .env.local loader (no dependency added for this alone) ────────

function loadEnvLocal(): void {
  const envPath = join(__dirname, '..', '..', '..', '.env.local')
  if (!existsSync(envPath)) return
  const contents = readFileSync(envPath, 'utf-8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

// ── Config ───────────────────────────────────────────────────────────────

const TRIALS_PER_SCENARIO = 3

// ── Metrics ──────────────────────────────────────────────────────────────

interface TrialResult {
  scenarioId: string
  trial: number
  schemaValid: boolean
  scenarioPassed: boolean
  scenarioNotes: string
  inventedFactCandidates: string[]
  falseResolutionCandidates: string[]
  inputTokens: number
  outputTokens: number
  latencyMs: number
  error?: string
  rawTurns: RawUserTurn[]
  candidatesByTurn: CandidateObservation[][]
}

const KNOWN_CANONICAL_IDENTIFIERS = ['runway-gen3', 'kling', 'elevenlabs', 'gemini-api', 'gemini-consumer-app']

function normalizeForSubstringCheck(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function checkInventedFacts(candidates: CandidateObservation[], turnText: string): string[] {
  const normalizedTurn = normalizeForSubstringCheck(turnText)
  return candidates
    .filter((c) => !normalizedTurn.includes(normalizeForSubstringCheck(c.raw_text)))
    .map((c) => c.raw_text)
}

function checkFalseResolutions(candidates: CandidateObservation[]): string[] {
  return candidates
    .filter((c) => c.kind === 'tool_mention' && c.raw_tool_name && KNOWN_CANONICAL_IDENTIFIERS.includes(c.raw_tool_name.toLowerCase()))
    .map((c) => c.raw_tool_name!)
}

async function runScenarioTrial(scenario: EvalScenario, trial: number, model: string): Promise<TrialResult> {
  const extractor = createAnthropicExtractor({ model })
  let su = emptyStructuredUnderstanding()
  const diagnosticsByTurn: ExtractionDiagnostic[][] = []
  const candidatesByTurn: CandidateObservation[][] = []
  let inputTokens = 0
  let outputTokens = 0
  let latencyMs = 0
  let inventedFactCandidates: string[] = []
  let falseResolutionCandidates: string[] = []

  try {
    for (const turn of scenario.turns) {
      const start = Date.now()
      const candidates = await extractor(turn)
      latencyMs += Date.now() - start
      candidatesByTurn.push(candidates)
      inventedFactCandidates.push(...checkInventedFacts(candidates, turn.text))
      falseResolutionCandidates.push(...checkFalseResolutions(candidates))

      const { updated, diagnostics } = await runExtractionPipeline(su, turn, async () => candidates)
      su = updated
      diagnosticsByTurn.push(diagnostics)
    }

    const { passed, notes } = scenario.check(diagnosticsByTurn, su)

    return {
      scenarioId: scenario.id,
      trial,
      schemaValid: true,
      scenarioPassed: passed,
      scenarioNotes: notes,
      inventedFactCandidates,
      falseResolutionCandidates,
      inputTokens,
      outputTokens,
      latencyMs,
      rawTurns: scenario.turns,
      candidatesByTurn,
    }
  } catch (err) {
    return {
      scenarioId: scenario.id,
      trial,
      schemaValid: false,
      scenarioPassed: false,
      scenarioNotes: 'Extractor call or schema parsing failed.',
      inventedFactCandidates,
      falseResolutionCandidates,
      inputTokens,
      outputTokens,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
      rawTurns: scenario.turns,
      candidatesByTurn,
    }
  }
}

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`
}

function byCategory(results: TrialResult[], ids: string[]): TrialResult[] {
  return results.filter((r) => ids.includes(r.scenarioId))
}

async function main() {
  loadEnvLocal()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\nANTHROPIC_API_KEY is not set.\n')
    console.error('This evaluator makes live calls to the Anthropic API and never substitutes')
    console.error('the mock extractor when a key is missing -- it stops here instead.\n')
    console.error('To supply it:')
    console.error('  1. Copy 08_Platform/app/.env.local.example to 08_Platform/app/.env.local (gitignored, never committed)')
    console.error('  2. Set ANTHROPIC_API_KEY=sk-ant-... in that file')
    console.error('  3. Re-run: npm run eval:extraction\n')
    process.exit(1)
  }

  const model = process.env.INTERVIEW_EXTRACTOR_MODEL ?? DEFAULT_MODEL
  console.log(`Running real-model extraction evaluation -- model: ${model}, ${TRIALS_PER_SCENARIO} trial(s) per scenario\n`)

  const results: TrialResult[] = []
  for (const scenario of EVAL_CORPUS) {
    for (let trial = 1; trial <= TRIALS_PER_SCENARIO; trial++) {
      process.stdout.write(`  ${scenario.id} (trial ${trial}/${TRIALS_PER_SCENARIO})... `)
      const result = await runScenarioTrial(scenario, trial, model)
      results.push(result)
      console.log(result.scenarioPassed ? 'PASS' : 'FAIL')
    }
  }

  // ── Aggregate metrics ──────────────────────────────────────────────────

  const totalTrials = results.length
  const schemaValidCount = results.filter((r) => r.schemaValid).length
  const scenarioPassCount = results.filter((r) => r.scenarioPassed).length
  const totalCandidates = results.reduce((sum, r) => sum + r.candidatesByTurn.flat().length, 0)
  const totalInvented = results.reduce((sum, r) => sum + r.inventedFactCandidates.length, 0)
  const totalFalseResolutions = results.reduce((sum, r) => sum + r.falseResolutionCandidates.length, 0)

  const ambiguityScenarios = ['nano_banana_ambiguous', 'contradictory_access_surface']
  const ambiguityResults = byCategory(results, ambiguityScenarios)
  const ambiguityPreserved = ambiguityResults.filter((r) => r.scenarioPassed).length

  const correctionResults = byCategory(results, ['late_correction'])
  const correctionDetected = correctionResults.filter((r) => r.scenarioPassed).length

  const scopeResults = byCategory(results, ['current_and_historical'])
  const scopeCorrect = scopeResults.filter((r) => r.scenarioPassed).length

  const classificationResults = byCategory(results, ['explicit_absence', 'uncertainty_no_visibility', 'refusal_decline'])
  const classificationCorrect = classificationResults.filter((r) => r.scenarioPassed).length

  const bundledResults = byCategory(results, ['bundled_multi_signal'])
  const bundledCorrect = bundledResults.filter((r) => r.scenarioPassed).length

  const totalInputTokens = results.reduce((sum, r) => sum + r.inputTokens, 0)
  const totalOutputTokens = results.reduce((sum, r) => sum + r.outputTokens, 0)
  const avgLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0) / totalTrials

  const failures = results.filter((r) => !r.scenarioPassed)

  // ── Report ───────────────────────────────────────────────────────────

  const lines: string[] = []
  const log = (s: string = '') => {
    console.log(s)
    lines.push(s)
  }

  log('\n=== Real-Model Extraction Evaluation Report ===')
  log(`Model: ${model}`)
  log(`Trials per scenario: ${TRIALS_PER_SCENARIO} | Scenarios: ${EVAL_CORPUS.length} | Total trials: ${totalTrials}\n`)

  log(`Schema-valid response rate:        ${pct(schemaValidCount, totalTrials)} (${schemaValidCount}/${totalTrials})`)
  log(`Scenario pass rate (precision/recall stand-in -- see note below): ${pct(scenarioPassCount, totalTrials)} (${scenarioPassCount}/${totalTrials})`)
  log(`False-resolution rate:             ${pct(totalFalseResolutions, totalCandidates)} (${totalFalseResolutions}/${totalCandidates} candidates)`)
  log(`Invented-fact rate:                ${pct(totalInvented, totalCandidates)} (${totalInvented}/${totalCandidates} candidates)`)
  log(`Ambiguity-preservation rate:       ${pct(ambiguityPreserved, ambiguityResults.length)} (${ambiguityPreserved}/${ambiguityResults.length})`)
  log(`Correction-detection rate:         ${pct(correctionDetected, correctionResults.length)} (${correctionDetected}/${correctionResults.length})`)
  log(`Current-vs-historical scope accuracy: ${pct(scopeCorrect, scopeResults.length)} (${scopeCorrect}/${scopeResults.length})`)
  log(`Absent/unknown/unresolved/declined classification accuracy: ${pct(classificationCorrect, classificationResults.length)} (${classificationCorrect}/${classificationResults.length})`)
  log(`Bundled-answer splitting accuracy: ${pct(bundledCorrect, bundledResults.length)} (${bundledCorrect}/${bundledResults.length})`)
  log(`\nToken usage: ${totalInputTokens} input / ${totalOutputTokens} output tokens across ${totalTrials} trials`)
  log(`Average latency: ${avgLatencyMs.toFixed(0)}ms per extraction call`)

  log(
    `\nNote: "candidate precision and recall" in the strict statistical sense would require a hand-labeled\n` +
      `reference candidate set per scenario. This harness instead uses each scenario's own targeted check()\n` +
      `(pass/fail against the specific property that scenario exists to test) as the practical stand-in for\n` +
      `Prototype Alpha. Reported above as "scenario pass rate." Building true precision/recall scoring is a\n` +
      `larger investment not undertaken here -- flagged, not silently substituted without comment.`,
  )

  if (failures.length > 0) {
    log(`\n=== Material Failures (${failures.length}) ===`)
    for (const f of failures) {
      log(`\n--- ${f.scenarioId} (trial ${f.trial}) ---`)
      log(`Raw turn(s): ${JSON.stringify(f.rawTurns.map((t) => t.text))}`)
      if (f.error) log(`Error: ${f.error}`)
      log(`Notes: ${f.scenarioNotes}`)
      log(`Model output: ${JSON.stringify(f.candidatesByTurn, null, 2)}`)
      if (f.inventedFactCandidates.length > 0) log(`Possible invented facts: ${JSON.stringify(f.inventedFactCandidates)}`)
      if (f.falseResolutionCandidates.length > 0) log(`Possible false resolutions: ${JSON.stringify(f.falseResolutionCandidates)}`)
    }
  } else {
    log('\nNo material failures.')
  }

  const reportDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `EXTRACTION-EVAL-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Evaluation harness crashed:', err)
  process.exit(1)
})
