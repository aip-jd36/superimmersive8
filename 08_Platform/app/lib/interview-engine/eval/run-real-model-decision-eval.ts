/**
 * Real-model Constraint A evaluation harness (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6c). NOT a Jest test -- invoked only via: npm run eval:decision
 *
 * Fails explicitly if ANTHROPIC_API_KEY is unset; never falls back to the
 * mock decider. Makes live, billed calls when it runs.
 *
 * Runs the 15-case corpus x TRIALS_PER_CASE trials, compares each decision
 * against its hand-labeled expectation, computes the required metrics, and
 * -- for the corpus cases carrying an after_structured_understanding --
 * separately computes the retrospective diff and compares it to the
 * prospective prediction. The retrospective result is never used to score
 * or influence the prospective decision itself; it is reported alongside
 * it for calibration review only.
 *
 * Every disagreement is printed with full detail (case, trial, expected,
 * actual, rationale) so it can be classified into model decision failure /
 * evaluation-fixture ambiguity / schema-output failure / genuine
 * architecture problem during review -- this harness surfaces the raw
 * material for that classification, it does not make the classification
 * call itself for anything beyond mechanically-detectable schema/exception
 * failures.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { CONSTRAINT_A_CORPUS } from './constraint-a-corpus'
import { computeRetrospectiveDiff } from './retrospective-diff'
import { decideWithDiagnostics, DEFAULT_MODEL } from '../anthropic-decision'
import type { ConstraintADecision, ConstraintAReasonCode } from '../decision'

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

const TRIALS_PER_CASE = 3

interface TrialResult {
  caseId: string
  trial: number
  expectedShouldAsk: boolean
  acceptableReasonCodes: ConstraintAReasonCode[]
  decision: ConstraintADecision | null
  correctDirection: boolean
  correctReasonCode: boolean
  inputTokens: number
  outputTokens: number
  latencyMs: number
  error?: string
}

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`
}

async function main() {
  loadEnvLocal()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\nANTHROPIC_API_KEY is not set.\n')
    console.error('This evaluator makes live calls to the Anthropic API and never substitutes')
    console.error('the mock decider when a key is missing -- it stops here instead.\n')
    console.error('To supply it:')
    console.error('  1. Copy 08_Platform/app/.env.local.example to 08_Platform/app/.env.local (gitignored, never committed)')
    console.error('  2. Set ANTHROPIC_API_KEY=sk-ant-... in that file')
    console.error('  3. Re-run: npm run eval:decision\n')
    process.exit(1)
  }

  const model = process.env.INTERVIEW_CONSTRAINT_A_MODEL ?? DEFAULT_MODEL
  console.log(`Real-model Constraint A evaluation -- model: ${model}`)
  console.log(`${CONSTRAINT_A_CORPUS.length} cases x ${TRIALS_PER_CASE} trials = ${CONSTRAINT_A_CORPUS.length * TRIALS_PER_CASE} total\n`)

  const results: TrialResult[] = []

  for (const testCase of CONSTRAINT_A_CORPUS) {
    for (let trial = 1; trial <= TRIALS_PER_CASE; trial++) {
      process.stdout.write(`  ${testCase.id} (trial ${trial}/${TRIALS_PER_CASE})... `)
      try {
        const { decision, inputTokens, outputTokens, latencyMs } = await decideWithDiagnostics({
          structured_understanding: testCase.structured_understanding,
          candidate: testCase.candidate,
          phase: testCase.candidate.phase,
        })

        const correctDirection = decision.should_ask === testCase.expected_should_ask
        const correctReasonCode = testCase.acceptable_reason_codes.includes(decision.reason_code)

        results.push({
          caseId: testCase.id,
          trial,
          expectedShouldAsk: testCase.expected_should_ask,
          acceptableReasonCodes: testCase.acceptable_reason_codes,
          decision,
          correctDirection,
          correctReasonCode,
          inputTokens,
          outputTokens,
          latencyMs,
        })
        console.log(correctDirection ? (correctReasonCode ? 'CORRECT' : 'RIGHT DIRECTION, REASON MISMATCH') : 'WRONG DIRECTION')
      } catch (err) {
        results.push({
          caseId: testCase.id,
          trial,
          expectedShouldAsk: testCase.expected_should_ask,
          acceptableReasonCodes: testCase.acceptable_reason_codes,
          decision: null,
          correctDirection: false,
          correctReasonCode: false,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        })
        console.log('ERROR (schema/output failure)')
      }
    }
  }

  // ── Aggregate metrics ──────────────────────────────────────────────────

  const total = results.length
  const schemaFailures = results.filter((r) => r.error)
  const scored = results.filter((r) => !r.error)

  const correctDirectionCount = scored.filter((r) => r.correctDirection).length
  const falsePositiveAsk = scored.filter((r) => !r.expectedShouldAsk && r.decision?.should_ask === true).length
  const falseNegativeSuppress = scored.filter((r) => r.expectedShouldAsk && r.decision?.should_ask === false).length
  const correctReasonCodeCount = scored.filter((r) => r.correctReasonCode).length

  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0)
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0)
  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / total

  // Consistency: for each case, what fraction of its trials agree with the case's OWN majority direction (not necessarily the expected one -- this measures stability, not correctness, per "consistency across repeated trials").
  const consistencyByCase = new Map<string, number>()
  for (const testCase of CONSTRAINT_A_CORPUS) {
    const caseResults = scored.filter((r) => r.caseId === testCase.id)
    if (caseResults.length === 0) continue
    const askCount = caseResults.filter((r) => r.decision?.should_ask === true).length
    const majorityCount = Math.max(askCount, caseResults.length - askCount)
    consistencyByCase.set(testCase.id, majorityCount / caseResults.length)
  }
  const avgConsistency = [...consistencyByCase.values()].reduce((s, v) => s + v, 0) / consistencyByCase.size

  // Retrieval-motivated drift: did the specifically Retrieval-motivated case get suppressed with the right reason, and did any OTHER case get incorrectly tagged RETRIEVAL_MOTIVATED?
  const retrievalCase = scored.filter((r) => r.caseId === 'purely_retrieval_motivated')
  const retrievalCaseCorrect = retrievalCase.filter((r) => r.correctDirection && r.decision?.reason_code === 'RETRIEVAL_MOTIVATED').length
  const misappliedRetrievalCode = scored.filter((r) => r.caseId !== 'purely_retrieval_motivated' && r.decision?.reason_code === 'RETRIEVAL_MOTIVATED').length

  // Reviewer-style over-questioning tendency: did the incident-level-detail case get suppressed, and more broadly, what's the false-positive-ask rate on ALL suppress-expected cases (already computed above as falsePositiveAsk).
  const incidentCase = scored.filter((r) => r.caseId === 'incident_level_detail_unnecessary')
  const incidentCaseCorrect = incidentCase.filter((r) => r.correctDirection).length

  // ── Retrospective comparison (step 7) ───────────────────────────────────

  const retrospectiveCases = CONSTRAINT_A_CORPUS.filter((c) => c.after_structured_understanding)
  const retrospectiveComparisons = retrospectiveCases.map((c) => {
    const diff = computeRetrospectiveDiff(c.structured_understanding, c.after_structured_understanding!)
    const caseResults = scored.filter((r) => r.caseId === c.id)
    const prospectiveAskRate = caseResults.length === 0 ? null : caseResults.filter((r) => r.decision?.should_ask).length / caseResults.length
    return {
      caseId: c.id,
      retrospectiveMaterialChange: diff.materialChange,
      retrospectiveChangedFields: diff.changedFields,
      prospectiveAskRate,
      aligned: prospectiveAskRate !== null && (prospectiveAskRate >= 0.5) === diff.materialChange,
    }
  })

  // ── Report ───────────────────────────────────────────────────────────

  const lines: string[] = []
  const log = (s = '') => {
    console.log(s)
    lines.push(s)
  }

  log('\n=== Constraint A Real-Model Evaluation Report ===')
  log(`Model: ${model} | ${CONSTRAINT_A_CORPUS.length} cases x ${TRIALS_PER_CASE} trials = ${total} total\n`)

  log(`Schema/output failure rate:        ${pct(schemaFailures.length, total)} (${schemaFailures.length}/${total})`)
  log(`Ask/suppress accuracy:             ${pct(correctDirectionCount, scored.length)} (${correctDirectionCount}/${scored.length})`)
  log(`False-positive ask rate:           ${pct(falsePositiveAsk, scored.filter((r) => !r.expectedShouldAsk).length)} (asked when expected suppress)`)
  log(`False-negative suppress rate:      ${pct(falseNegativeSuppress, scored.filter((r) => r.expectedShouldAsk).length)} (suppressed when expected ask)`)
  log(`Reason-code accuracy:              ${pct(correctReasonCodeCount, scored.length)} (${correctReasonCodeCount}/${scored.length})`)
  log(`Average per-case consistency:      ${pct(avgConsistency * 100, 100)} (fraction of a case's own trials agreeing with its own majority)`)
  log(`Retrieval-motivated case correctly identified: ${pct(retrievalCaseCorrect, retrievalCase.length)} (${retrievalCaseCorrect}/${retrievalCase.length})`)
  log(`RETRIEVAL_MOTIVATED misapplied to a non-Retrieval case: ${misappliedRetrievalCode} time(s)`)
  log(`Incident-level-detail case correctly suppressed (over-questioning check): ${pct(incidentCaseCorrect, incidentCase.length)} (${incidentCaseCorrect}/${incidentCase.length})`)
  log(`\nToken usage: ${totalInputTokens} input / ${totalOutputTokens} output across ${total} trials`)
  log(`Average latency: ${avgLatency.toFixed(0)}ms per call`)

  log('\n--- By case ---')
  for (const testCase of CONSTRAINT_A_CORPUS) {
    const caseResults = scored.filter((r) => r.caseId === testCase.id)
    const correct = caseResults.filter((r) => r.correctDirection).length
    log(`${testCase.id}: ${correct}/${caseResults.length} correct direction, consistency ${pct((consistencyByCase.get(testCase.id) ?? 0) * 100, 100)}`)
  }

  log('\n--- Retrospective vs. prospective comparison (step 7) ---')
  for (const r of retrospectiveComparisons) {
    log(
      `${r.caseId}: retrospective material_change=${r.retrospectiveMaterialChange} (${JSON.stringify(r.retrospectiveChangedFields)}), ` +
        `prospective ask rate=${r.prospectiveAskRate === null ? 'n/a' : pct(r.prospectiveAskRate * 100, 100)}, aligned=${r.aligned}`,
    )
  }

  const disagreements = scored.filter((r) => !r.correctDirection || !r.correctReasonCode)
  if (disagreements.length > 0) {
    log(`\n=== All Disagreements (${disagreements.length}), for classification during review ===`)
    for (const d of disagreements) {
      const testCase = CONSTRAINT_A_CORPUS.find((c) => c.id === d.caseId)!
      log(`\n--- ${d.caseId} (trial ${d.trial}) ---`)
      log(`Candidate question: "${testCase.candidate.question_text}"`)
      log(`Expected: should_ask=${d.expectedShouldAsk}, acceptable reason codes=${JSON.stringify(d.acceptableReasonCodes)}`)
      log(`Actual: ${JSON.stringify(d.decision)}`)
    }
  } else {
    log('\nNo disagreements.')
  }

  if (schemaFailures.length > 0) {
    log(`\n=== Schema/Output Failures (${schemaFailures.length}) ===`)
    for (const f of schemaFailures) {
      log(`${f.caseId} (trial ${f.trial}): ${f.error}`)
    }
  }

  const reportDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `CONSTRAINT-A-EVAL-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Evaluation harness crashed:', err)
  process.exit(1)
})
