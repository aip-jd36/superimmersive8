/**
 * Real-model candidate-question GENERATION QUALITY evaluation
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6b, step 5). Isolated from
 * Constraint B enforcement entirely -- that's already proven deterministic
 * in constraint-b-candidate-question.test.ts. This harness only asks: does
 * the model produce well-formed proposals that respect the eligible-signal
 * boundary?
 *
 * NOT a Jest test. Invoked only via: npm run eval:candidate-question
 * Fails explicitly if ANTHROPIC_API_KEY is unset; never falls back to the
 * mock generator. Makes live, billed calls when it runs.
 *
 * Reported separately from deterministic boundary-enforcement results, per
 * instruction -- this measures generation quality, not enforcement.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { deriveEligibleSignals } from '../candidate-question'
import { generateWithDiagnostics, DEFAULT_MODEL } from '../anthropic-candidate-question'
import { DIALOGUE_FIXTURES, DIALOGUE_FIXTURE_IDS } from '../fixtures'

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

const TRIALS_PER_FIXTURE = 2

interface TrialResult {
  fixtureId: string
  trial: number
  hasCandidate: boolean
  questionKind: string | null
  targetSignalId: string | null
  validSignalReference: boolean // true when target_signal_id is null OR found in the eligible set
  eligibleSignalCount: number
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
    console.error('the mock generator when a key is missing -- it stops here instead.\n')
    console.error('To supply it:')
    console.error('  1. Copy 08_Platform/app/.env.local.example to 08_Platform/app/.env.local (gitignored, never committed)')
    console.error('  2. Set ANTHROPIC_API_KEY=sk-ant-... in that file')
    console.error('  3. Re-run: npm run eval:candidate-question\n')
    process.exit(1)
  }

  const model = process.env.INTERVIEW_CANDIDATE_QUESTION_MODEL ?? DEFAULT_MODEL
  console.log(`Real-model candidate-question GENERATION QUALITY evaluation -- model: ${model}`)
  console.log(`${DIALOGUE_FIXTURE_IDS.length} fixtures x ${TRIALS_PER_FIXTURE} trials = ${DIALOGUE_FIXTURE_IDS.length * TRIALS_PER_FIXTURE} total\n`)

  const results: TrialResult[] = []

  for (const fixtureId of DIALOGUE_FIXTURE_IDS) {
    const fixture = DIALOGUE_FIXTURES[fixtureId]
    const eligibleSignals = deriveEligibleSignals(fixture.structured_understanding)

    for (let trial = 1; trial <= TRIALS_PER_FIXTURE; trial++) {
      process.stdout.write(`  ${fixtureId} (trial ${trial}/${TRIALS_PER_FIXTURE})... `)
      try {
        const { proposal, inputTokens, outputTokens, latencyMs } = await generateWithDiagnostics({
          structured_understanding: fixture.structured_understanding,
          eligible_signals: eligibleSignals,
          phase: fixture.structured_understanding.current_phase,
        })

        const validSignalReference =
          proposal === null || proposal.target_signal_id === null || eligibleSignals.some((s) => s.signal_id === proposal.target_signal_id)

        results.push({
          fixtureId,
          trial,
          hasCandidate: proposal !== null,
          questionKind: proposal?.question_kind ?? null,
          targetSignalId: proposal?.target_signal_id ?? null,
          validSignalReference,
          eligibleSignalCount: eligibleSignals.length,
          inputTokens,
          outputTokens,
          latencyMs,
        })
        console.log(validSignalReference ? 'OK' : 'INVALID SIGNAL REFERENCE')
      } catch (err) {
        results.push({
          fixtureId,
          trial,
          hasCandidate: false,
          questionKind: null,
          targetSignalId: null,
          validSignalReference: false,
          eligibleSignalCount: eligibleSignals.length,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        })
        console.log('ERROR')
      }
    }
  }

  const total = results.length
  const withCandidate = results.filter((r) => r.hasCandidate)
  const validRefs = results.filter((r) => r.validSignalReference)
  const invalidRefs = results.filter((r) => !r.validSignalReference)
  const kindCounts = new Map<string, number>()
  for (const r of withCandidate) kindCounts.set(r.questionKind!, (kindCounts.get(r.questionKind!) ?? 0) + 1)

  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0)
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0)
  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / total

  const lines: string[] = []
  const log = (s = '') => {
    console.log(s)
    lines.push(s)
  }

  log('\n=== Candidate-Question Generation Quality Report (isolated, no boundary enforcement) ===')
  log(`Model: ${model} | ${DIALOGUE_FIXTURE_IDS.length} fixtures x ${TRIALS_PER_FIXTURE} trials = ${total} total\n`)
  log(`has_candidate rate:            ${pct(withCandidate.length, total)} (${withCandidate.length}/${total})`)
  log(`Valid signal-reference rate:   ${pct(validRefs.length, total)} (${validRefs.length}/${total}) -- target_signal_id null or found in the eligible set`)
  log(`Token usage: ${totalInputTokens} input / ${totalOutputTokens} output across ${total} trials`)
  log(`Average latency: ${avgLatency.toFixed(0)}ms per call`)

  log('\n--- By fixture ---')
  for (const fixtureId of DIALOGUE_FIXTURE_IDS) {
    const fixtureResults = results.filter((r) => r.fixtureId === fixtureId)
    const withCand = fixtureResults.filter((r) => r.hasCandidate).length
    log(
      `${fixtureId}: has_candidate ${withCand}/${fixtureResults.length}, ` +
        `kinds: ${JSON.stringify(fixtureResults.map((r) => r.questionKind))}`,
    )
  }

  log('\n--- question_kind distribution (among has_candidate=true trials) ---')
  for (const [kind, count] of [...kindCounts.entries()].sort((a, b) => b[1] - a[1])) {
    log(`${kind}: ${count} (${pct(count, withCandidate.length)})`)
  }

  if (invalidRefs.length > 0) {
    log(`\n=== Invalid Signal References (${invalidRefs.length}) ===`)
    for (const r of invalidRefs) {
      log(`\n${r.fixtureId} (trial ${r.trial}): target_signal_id="${r.targetSignalId}", eligible count=${r.eligibleSignalCount}`)
      if (r.error) log(`Error: ${r.error}`)
    }
  } else {
    log('\nNo invalid signal references -- every non-null target_signal_id was in the eligible set.')
  }

  const reportDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `CANDIDATE-QUESTION-GENERATION-EVAL-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Evaluation harness crashed:', err)
  process.exit(1)
})
