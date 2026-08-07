/**
 * Full-pipeline integration evaluation (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6b, step 9): real Phase 6a extraction -> deriveEligibleSignals ->
 * real Phase 6b candidate-question generation -> validateCandidateReference
 * -> evaluateBoundary, chained end to end with two independent live-model
 * calls per turn (extraction, then generation).
 *
 * NOT a Jest test. Invoked only via: npm run eval:candidate-question-integration
 * Fails explicitly if ANTHROPIC_API_KEY is unset; never falls back to mocks.
 * Makes live, billed calls when it runs.
 *
 * Includes the roadmap's noted future evaluation case (two independent
 * bundled ambiguities in one interview) as an explicit WATCHED scenario --
 * its outcome is reported, not gated. It exists to determine whether the
 * Rule 5 once-per-interview cap causes material under-questioning of a
 * second, unrelated ambiguity, per the explicit prototype-assumption
 * qualification in the roadmap. A "the second ambiguity gets suppressed"
 * result is an expected, correct outcome of the current design, not a
 * failure -- this scenario is about observing whether that outcome looks
 * materially costly in practice, which is a judgment call for review, not
 * something this harness itself decides.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { RawUserTurn } from '../extraction'
import { runExtractionPipeline } from '../extraction'
import { createAnthropicExtractor } from '../anthropic-extractor'
import { deriveEligibleSignals, validateCandidateReference } from '../candidate-question'
import { createAnthropicCandidateQuestionGenerator } from '../anthropic-candidate-question'
import { createInitialBoundaryState, evaluateBoundary, type BoundaryState } from '../boundaries'
import { emptyStructuredUnderstanding } from './empty-structured-understanding'

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

async function main() {
  loadEnvLocal()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\nANTHROPIC_API_KEY is not set.\n')
    console.error('This evaluator makes live calls to the Anthropic API and never substitutes')
    console.error('mocks when a key is missing -- it stops here instead.\n')
    console.error('To supply it:')
    console.error('  1. Copy 08_Platform/app/.env.local.example to 08_Platform/app/.env.local (gitignored, never committed)')
    console.error('  2. Set ANTHROPIC_API_KEY=sk-ant-... in that file')
    console.error('  3. Re-run: npm run eval:candidate-question-integration\n')
    process.exit(1)
  }

  const extractor = createAnthropicExtractor()
  const generator = createAnthropicCandidateQuestionGenerator()

  const lines: string[] = []
  const log = (s = '') => {
    console.log(s)
    lines.push(s)
  }

  log('=== Full-Pipeline Integration Evaluation ===')
  log('Real Phase 6a extraction -> deriveEligibleSignals -> real Phase 6b generation -> validate -> enforce\n')

  // ── Scenario A: straightforward conversation ──────────────────────────

  log('--- Scenario A: straightforward conversation ---')
  const turnsA: RawUserTurn[] = [
    { turn: 1, text: 'We used Runway Gen-3 for this one, team API plan.' },
    { turn: 2, text: "It's for a paid social ad campaign." },
    { turn: 3, text: "I'm the producer on this." },
  ]
  let suA = emptyStructuredUnderstanding()
  for (const turn of turnsA) {
    const { updated } = await runExtractionPipeline(suA, turn, extractor)
    suA = updated
  }
  log(`Extraction result: ${suA.tool_mentions.length} tool mention(s), ${suA.scoped_observations.length} observation(s)`)

  const eligibleA = deriveEligibleSignals(suA)
  log(`Eligible signals: ${JSON.stringify(eligibleA)}`)

  const proposalA = await generator({ structured_understanding: suA, eligible_signals: eligibleA, phase: suA.current_phase })
  log(`Generated proposal: ${JSON.stringify(proposalA)}`)

  if (proposalA) {
    const validationA = validateCandidateReference(proposalA, eligibleA)
    log(`Validation: ${JSON.stringify(validationA)}`)
    if (validationA.outcome === 'accepted') {
      const boundaryResultA = evaluateBoundary(createInitialBoundaryState(), validationA.candidate)
      log(`Constraint B: allowed=${boundaryResultA.allowed}, reason=${boundaryResultA.reason_code}, action=${boundaryResultA.action_scope}`)
    }
  } else {
    log('Generator returned no candidate (has_candidate: false).')
  }

  // ── Scenario B (WATCHED, not gated): two independent bundled ambiguities ──

  log('\n--- Scenario B (WATCHED, not a Phase 6b completion gate): two independent bundled ambiguities ---')
  log('Purpose: observe whether the once-per-interview disentangling_question cap causes material')
  log('under-questioning of a second, unrelated ambiguity. Suppression of the second is an EXPECTED,')
  log('correct outcome of the current design -- this scenario reports what happens, not a pass/fail.\n')

  const turnsB: RawUserTurn[] = [
    {
      turn: 1,
      text: 'It went through our internal creative review first, and separately, a bigger client account started asking about tool documentation last quarter.',
    },
    { turn: 2, text: 'We used Kling for this one.' },
    {
      turn: 3,
      text: 'Also, this reminds me -- on one project the client wanted proof of authorship, but on a totally different one last year they just wanted a verbal confirmation.',
    },
  ]

  let suB = emptyStructuredUnderstanding()
  let boundaryStateB: BoundaryState = createInitialBoundaryState()
  const attempts: { afterTurn: number; proposal: unknown; boundaryResult: unknown }[] = []

  for (const turn of turnsB) {
    const { updated } = await runExtractionPipeline(suB, turn, extractor)
    suB = updated

    const eligibleB = deriveEligibleSignals(suB)
    const proposal = await generator({ structured_understanding: suB, eligible_signals: eligibleB, phase: suB.current_phase })

    let boundaryResult: unknown = null
    if (proposal) {
      const validation = validateCandidateReference(proposal, eligibleB)
      if (validation.outcome === 'accepted') {
        const result = evaluateBoundary(boundaryStateB, validation.candidate)
        boundaryStateB = result.next_state
        boundaryResult = { allowed: result.allowed, reason_code: result.reason_code, action_scope: result.action_scope }
      } else {
        boundaryResult = { validationRejected: validation }
      }
    }

    attempts.push({ afterTurn: turn.turn, proposal, boundaryResult })
    log(`After turn ${turn.turn}: proposal=${JSON.stringify(proposal)}`)
    log(`  -> boundary: ${JSON.stringify(boundaryResult)}`)
  }

  const disentanglingAttempts = attempts.filter(
    (a) => a.proposal && (a.proposal as { question_kind?: string }).question_kind === 'disentangling_question',
  )
  log(`\nTotal disentangling_question proposals across the interview: ${disentanglingAttempts.length}`)
  log(`Final disentangling_question_asked state: ${boundaryStateB.disentangling_question_asked}`)
  if (disentanglingAttempts.length >= 2) {
    log('OBSERVATION: the model proposed a second disentangling question for the second, independent ambiguity.')
    log('Whether it was suppressed by the cap is shown in the boundary results above -- review for material under-questioning.')
  } else {
    log(
      'OBSERVATION: the model proposed at most one disentangling_question across this interview -- either it did not ' +
        'recognize a second, independent bundled ambiguity as needing one, or the scenario turns did not surface it clearly. ' +
        'Not evidence either way about the cap itself; only evidence about generation in this specific run.',
    )
  }

  const reportDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `CANDIDATE-QUESTION-INTEGRATION-EVAL-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Evaluation harness crashed:', err)
  process.exit(1)
})
