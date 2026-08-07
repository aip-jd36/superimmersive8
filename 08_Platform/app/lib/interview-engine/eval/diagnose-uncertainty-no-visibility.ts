/**
 * Targeted diagnostic for the uncertainty_no_visibility failure surfaced by
 * the raw_tool_name rerun (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6a).
 *
 * NOT a Jest test, NOT part of the standard 14-scenario corpus (corpus.ts is
 * NOT modified by this file). Invoked only via:
 *
 *   npx tsx lib/interview-engine/eval/diagnose-uncertainty-no-visibility.ts
 *
 * Makes NO prompt or schema changes -- this is a read-only diagnostic run
 * against the current (already-fixed) adapter, purely to characterize one
 * failure mode before deciding whether it's sampling variance, a prompt/
 * schema weakness, or an overly rigid fixture expectation.
 *
 * Scores SEMANTICALLY, not by exact candidate shape: a trial passes when
 * the respondent's lack of visibility is preserved somewhere in the output
 * with the correct confidence state, regardless of how many candidates it's
 * split across or which `kind` the model assigned.
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import type { CandidateObservation } from '../extraction'
import { extractWithDiagnostics, DEFAULT_MODEL } from '../anthropic-extractor'

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

// ── Turn definitions ─────────────────────────────────────────────────────

interface VisibilityTurn {
  id: string
  text: string
  trials: number
  /** Substring (case-insensitive) expected to appear in the candidate covering the visibility gap. */
  visibilityTrigger: string
  /** Confidence hints accepted as correctly preserving lack-of-visibility for THIS turn's wording. */
  acceptableConfidence: Array<CandidateObservation['observation_confidence_hint'] | CandidateObservation['fact_confidence_hint']>
  /** Whether this turn also states a separate, directly-supported "someone else owns this" fact. */
  hasSecondaryOwnerFact: boolean
  /** Substring identifying the secondary owner-fact candidate, if hasSecondaryOwnerFact. */
  ownerFactTrigger?: string
  note?: string
}

const TURNS: VisibilityTurn[] = [
  {
    id: 'original',
    text: "Honestly, I don't have access to that -- someone else on the team manages billing and approvals.",
    trials: 20,
    visibilityTrigger: "don't have access",
    acceptableConfidence: ['unresolved_no_visibility'],
    hasSecondaryOwnerFact: true,
    ownerFactTrigger: 'manages billing',
  },
  {
    id: 'paraphrase_1_not_involved',
    text: "I'm not involved in that part, so I don't know.",
    trials: 5,
    visibilityTrigger: "don't know",
    // Genuinely ambiguous wording: "not involved... so I don't know" sits on
    // the boundary between "I personally lack visibility" and "genuinely
    // nobody knows" -- unlike the other turns, it never names someone else
    // who plausibly does know. Both confidence states are accepted here;
    // flagged explicitly in the report as a fixture-wording ambiguity, not
    // scored as strictly as the others.
    acceptableConfidence: ['unresolved_no_visibility', 'unknown'],
    hasSecondaryOwnerFact: false,
    note: 'Lenient: wording does not name an alternate knower, unlike the other turns -- unresolved_no_visibility and unknown both accepted.',
  },
  {
    id: 'paraphrase_2_someone_else_handles',
    text: "Someone else handles approvals; I don't see that process.",
    trials: 5,
    visibilityTrigger: "don't see that process",
    acceptableConfidence: ['unresolved_no_visibility'],
    hasSecondaryOwnerFact: true,
    ownerFactTrigger: 'handles approvals',
  },
  {
    id: 'paraphrase_3_may_be_review',
    text: "There may be a review, but I don't have visibility into it.",
    trials: 5,
    visibilityTrigger: "don't have visibility",
    acceptableConfidence: ['unresolved_no_visibility'],
    hasSecondaryOwnerFact: false,
  },
  {
    id: 'paraphrase_4_billing_approval_details',
    text: "I don't have access to the billing or approval details.",
    trials: 5,
    visibilityTrigger: "don't have access",
    acceptableConfidence: ['unresolved_no_visibility'],
    hasSecondaryOwnerFact: false,
  },
  {
    id: 'paraphrase_5_another_teammate',
    text: "Another teammate manages that, so I can't confirm what happens.",
    trials: 5,
    visibilityTrigger: "can't confirm",
    acceptableConfidence: ['unresolved_no_visibility'],
    hasSecondaryOwnerFact: true,
    ownerFactTrigger: 'manages that',
  },
]

// ── Scoring ──────────────────────────────────────────────────────────────

interface TrialRecord {
  turnId: string
  turnText: string
  trial: number
  candidates: CandidateObservation[]
  visibilityCandidate: CandidateObservation | undefined
  visibilityConfidence: string | undefined
  preserved: boolean
  confirmedAbsenceMisclassification: boolean
  mergedIntoConfirmed: boolean
  ownerFactDecomposed: boolean | null // null when turn has no secondary owner fact
  invented: string[]
  scopeIssues: string[]
  inputTokens: number
  outputTokens: number
  latencyMs: number
  error?: string
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function checkInvented(candidates: CandidateObservation[], turnText: string): string[] {
  const normTurn = normalize(turnText)
  return candidates.filter((c) => !normTurn.includes(normalize(c.raw_text))).map((c) => c.raw_text)
}

function scoreTrial(turn: VisibilityTurn, trial: number, candidates: CandidateObservation[]): Omit<
  TrialRecord,
  'turnId' | 'turnText' | 'trial' | 'inputTokens' | 'outputTokens' | 'latencyMs' | 'error'
> {
  // BUG FIX (found while manually re-reading raw output for the first run of
  // this script): the model sometimes emits TWO candidates with IDENTICAL
  // raw_text -- one framing the statement as a project_fact (e.g.
  // workflow_role: confirmed_absent) and a separate one correctly capturing
  // it as a scoped_observation: unresolved_no_visibility. The original
  // .find() picked whichever came first in the array, which could be the
  // "wrong" (less informative) duplicate even when a correct one existed
  // right beside it. Fixed: check ALL candidates matching the trigger
  // phrase, and treat the trial as preserved if ANY of them carries an
  // acceptable confidence -- the model produced the right answer, just
  // alongside an extra, redundant framing, not instead of it.
  const normTrigger = normalize(turn.visibilityTrigger)
  const matchingCandidates = candidates.filter((c) => normalize(c.raw_text).includes(normTrigger))
  const visibilityCandidate =
    matchingCandidates.find((c) => {
      const conf = c.observation_confidence_hint ?? c.fact_confidence_hint
      return !!conf && turn.acceptableConfidence.includes(conf as any)
    }) ?? matchingCandidates[0]
  const visibilityConfidence = visibilityCandidate
    ? (visibilityCandidate.observation_confidence_hint ?? visibilityCandidate.fact_confidence_hint)
    : undefined

  const preserved = matchingCandidates.some((c) => {
    const conf = c.observation_confidence_hint ?? c.fact_confidence_hint
    return !!conf && turn.acceptableConfidence.includes(conf as any)
  })
  // Confirmed-absence / merged-confirmed are reported against the SELECTED
  // (best-available) candidate above, so a genuinely correct duplicate
  // doesn't get double-counted as also a failure.
  const confirmedAbsenceMisclassification = !preserved && visibilityConfidence === 'confirmed_absent'
  const mergedIntoConfirmed = !preserved && visibilityConfidence === 'confirmed'

  let ownerFactDecomposed: boolean | null = null
  if (turn.hasSecondaryOwnerFact && turn.ownerFactTrigger) {
    const normOwnerTrigger = normalize(turn.ownerFactTrigger)
    const ownerCandidate = candidates.find(
      (c) => c !== visibilityCandidate && normalize(c.raw_text).includes(normOwnerTrigger),
    )
    ownerFactDecomposed = !!ownerCandidate && (ownerCandidate.observation_confidence_hint ?? ownerCandidate.fact_confidence_hint) === 'confirmed'
  }

  const invented = checkInvented(candidates, turn.text)
  const scopeIssues = candidates
    .filter((c) => c.kind === 'scoped_observation' && c.scope && c.scope !== 'current_project')
    .map((c) => `${c.raw_text} -> scope=${c.scope}`)

  return {
    candidates,
    visibilityCandidate,
    visibilityConfidence,
    preserved,
    confirmedAbsenceMisclassification,
    mergedIntoConfirmed,
    ownerFactDecomposed,
    invented,
    scopeIssues,
  }
}

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`
}

async function main() {
  loadEnvLocal()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. See .env.local.example. Not falling back to any mock.')
    process.exit(1)
  }

  const model = process.env.INTERVIEW_EXTRACTOR_MODEL ?? DEFAULT_MODEL
  const totalTrials = TURNS.reduce((sum, t) => sum + t.trials, 0)
  console.log(`Targeted uncertainty_no_visibility diagnostic -- model: ${model}, ${totalTrials} total trials across ${TURNS.length} turn variants\n`)

  const records: TrialRecord[] = []

  for (const turn of TURNS) {
    for (let trial = 1; trial <= turn.trials; trial++) {
      process.stdout.write(`  ${turn.id} (trial ${trial}/${turn.trials})... `)
      try {
        const { candidates, inputTokens, outputTokens, latencyMs } = await extractWithDiagnostics({ turn: 1, text: turn.text }, { model })
        const scored = scoreTrial(turn, trial, candidates)
        records.push({ turnId: turn.id, turnText: turn.text, trial, inputTokens, outputTokens, latencyMs, ...scored })
        console.log(scored.preserved ? 'PRESERVED' : scored.confirmedAbsenceMisclassification ? 'CONFIRMED-ABSENT MISCLASSIFICATION' : 'MISS')
      } catch (err) {
        records.push({
          turnId: turn.id,
          turnText: turn.text,
          trial,
          candidates: [],
          visibilityCandidate: undefined,
          visibilityConfidence: undefined,
          preserved: false,
          confirmedAbsenceMisclassification: false,
          mergedIntoConfirmed: false,
          ownerFactDecomposed: null,
          invented: [],
          scopeIssues: [],
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
        })
        console.log('ERROR')
      }
    }
  }

  // ── Aggregate ────────────────────────────────────────────────────────

  const preservedCount = records.filter((r) => r.preserved).length
  const confirmedAbsenceCount = records.filter((r) => r.confirmedAbsenceMisclassification).length
  const mergedConfirmedCount = records.filter((r) => r.mergedIntoConfirmed).length
  const totalInvented = records.reduce((s, r) => s + r.invented.length, 0)
  const totalCandidates = records.reduce((s, r) => s + r.candidates.length, 0)
  const scopeIssueCount = records.reduce((s, r) => s + r.scopeIssues.length, 0)

  const decomposableRecords = records.filter((r) => {
    const turn = TURNS.find((t) => t.id === r.turnId)!
    return turn.hasSecondaryOwnerFact
  })
  const decomposedCount = decomposableRecords.filter((r) => r.ownerFactDecomposed).length

  const candidateCounts = new Map<number, number>()
  const confidenceValues = new Map<string, number>()
  for (const r of records) {
    candidateCounts.set(r.candidates.length, (candidateCounts.get(r.candidates.length) ?? 0) + 1)
    if (r.visibilityConfidence) confidenceValues.set(r.visibilityConfidence, (confidenceValues.get(r.visibilityConfidence) ?? 0) + 1)
    else confidenceValues.set('(no visibility-clause candidate found)', (confidenceValues.get('(no visibility-clause candidate found)') ?? 0) + 1)
  }

  const totalInputTokens = records.reduce((s, r) => s + r.inputTokens, 0)
  const totalOutputTokens = records.reduce((s, r) => s + r.outputTokens, 0)
  const avgLatency = records.reduce((s, r) => s + r.latencyMs, 0) / records.length

  // ── Report ───────────────────────────────────────────────────────────

  const lines: string[] = []
  const log = (s = '') => {
    console.log(s)
    lines.push(s)
  }

  log('\n=== Targeted Diagnostic: uncertainty_no_visibility ===')
  log(`Model: ${model} | No prompt/schema changes made for this run.`)
  log(`Total trials: ${totalTrials} (original x20, 5 paraphrases x5 each)\n`)

  log(`No-visibility preservation rate:              ${pct(preservedCount, totalTrials)} (${preservedCount}/${totalTrials})`)
  log(`Confirmed-absence misclassification rate:      ${pct(confirmedAbsenceCount, totalTrials)} (${confirmedAbsenceCount}/${totalTrials})`)
  log(`Merged-into-flat-"confirmed" rate (informational, not a named required metric): ${pct(mergedConfirmedCount, totalTrials)} (${mergedConfirmedCount}/${totalTrials})`)
  log(`Valid multi-candidate decomposition rate:      ${pct(decomposedCount, decomposableRecords.length)} (${decomposedCount}/${decomposableRecords.length} trials whose turn states a directly-supported secondary owner fact)`)
  log(`Invented-fact rate:                            ${pct(totalInvented, totalCandidates)} (${totalInvented}/${totalCandidates} candidates)`)
  log(`Scope issues (non-current_project where current_project expected): ${scopeIssueCount}`)
  log(`\nToken usage: ${totalInputTokens} input / ${totalOutputTokens} output across ${totalTrials} trials`)
  log(`Average latency: ${avgLatency.toFixed(0)}ms per call`)

  log('\n--- By turn variant ---')
  for (const turn of TURNS) {
    const turnRecords = records.filter((r) => r.turnId === turn.id)
    const turnPreserved = turnRecords.filter((r) => r.preserved).length
    const turnConfirmedAbsence = turnRecords.filter((r) => r.confirmedAbsenceMisclassification).length
    log(
      `${turn.id} (${turnRecords.length} trials${turn.note ? ` -- ${turn.note}` : ''}): ` +
        `preserved ${pct(turnPreserved, turnRecords.length)} (${turnPreserved}/${turnRecords.length}), ` +
        `confirmed-absence misclass ${pct(turnConfirmedAbsence, turnRecords.length)} (${turnConfirmedAbsence}/${turnRecords.length})`,
    )
  }

  log('\n--- Candidate-shape distribution (candidate count per trial) ---')
  for (const [count, freq] of [...candidateCounts.entries()].sort((a, b) => a[0] - b[0])) {
    log(`${count} candidate(s): ${freq} trial(s) (${pct(freq, totalTrials)})`)
  }

  log('\n--- Visibility-clause confidence-value distribution ---')
  for (const [value, freq] of [...confidenceValues.entries()].sort((a, b) => b[1] - a[1])) {
    log(`${value}: ${freq} (${pct(freq, totalTrials)})`)
  }

  const failures = records.filter((r) => !r.preserved || r.error)
  if (failures.length > 0) {
    log(`\n=== Raw Output For Every Failure (${failures.length}) ===`)
    for (const f of failures) {
      log(`\n--- ${f.turnId} (trial ${f.trial}) ---`)
      log(`Turn: "${f.turnText}"`)
      if (f.error) {
        log(`Error: ${f.error}`)
        continue
      }
      log(`Visibility-clause candidate: ${f.visibilityCandidate ? JSON.stringify(f.visibilityCandidate) : '(none matched trigger phrase)'}`)
      log(`Full candidate output: ${JSON.stringify(f.candidates, null, 2)}`)
    }
  } else {
    log('\nNo failures -- every trial preserved lack-of-visibility correctly.')
  }

  log('\n=== Provisional Acceptance Standard ===')
  const preservationOk = preservedCount / totalTrials >= 0.9
  const confirmedAbsenceOk = confirmedAbsenceCount === 0
  const inventedOk = totalInvented === 0
  log(`>= 90% no-visibility preservation: ${preservationOk ? 'MET' : 'NOT MET'} (${pct(preservedCount, totalTrials)})`)
  log(`0% conversion into confirmed absence: ${confirmedAbsenceOk ? 'MET' : 'NOT MET'} (${confirmedAbsenceCount}/${totalTrials})`)
  log(`0 invented facts: ${inventedOk ? 'MET' : 'NOT MET'} (${totalInvented})`)

  if (mergedConfirmedCount > 0) {
    log(
      `\nNote: ${mergedConfirmedCount} trial(s) merged the visibility gap into a flat "confirmed" candidate about the ` +
        `secondary owner fact, losing the respondent's own lack-of-visibility distinctly. Per the review instruction: if the ` +
        `model repeatedly captures the confirmed secondary fact but loses respondent visibility, this pattern -- not the raw ` +
        `preservation rate alone -- is the signal to classify as a prompt/schema weakness rather than normal variance.`,
    )
  }

  const reportDir = join(__dirname, '..', '..', '..', '..', 'implementation', 'eval-reports')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `DIAGNOSTIC-UNCERTAINTY-NO-VISIBILITY-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(reportPath, lines.join('\n'), 'utf-8')
  console.log(`\nReport written to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Diagnostic crashed:', err)
  process.exit(1)
})
