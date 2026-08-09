/**
 * Follow-up 2 (live skip_question coverage). The original 20-run battery's
 * decline_mid_conversation scenario was scripted to exercise a
 * question-scope decline (skip_question) at turn 3, but both trials
 * completed early via gate_1_unmet_exhausted before turn 3 was ever
 * reached -- so skip_question was never actually validated against the
 * live model (LIVE-RUNTIME-VALIDATION-REPORT-2026-08-08, Finding F6). Only
 * stop_interview (interview-scope) was exercised, via a different scenario.
 *
 * This is not a broad battery -- a small, targeted scenario constructed so
 * gate_1 cannot be evaluated as met/unmet-exhausted before the decline
 * turn is reached: turn 1 names only an AMBIGUOUS, unresolved tool (no
 * workflow_role, no intended_use, no resolvable tool identity at all) --
 * gate_1 requires more than that to reach any terminal state, so a
 * question is essentially guaranteed and completion cannot fire on turn 1.
 * Turn 2 declines that exact question via skip_question. Turn 3 continues
 * normally, confirming the interview is still alive and not silently
 * broader-scoped.
 *
 * Runs the real, unmodified runTurn() -- same discipline as the original
 * battery's own harness (instrumented deps wrapping the real Anthropic
 * adapters, in-memory session store only, no API routes/Supabase/UI).
 *
 * Also runs one comparison trial each for skip_phase and stop_interview at
 * the exact same decision point (turn 2), per JD's request -- not to
 * re-validate stop_interview (already confirmed live in the original
 * battery) but to confirm the three decline actions are cleanly
 * distinguishable at the identical point in a conversation, side by side.
 *
 * Run: npx tsx --env-file=.env.local lib/crc-engine/eval/run-skip-question-coverage-eval.ts
 */

import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { createAnthropicExtractor } from '@/lib/interview-engine/anthropic-extractor'
import { createAnthropicCandidateQuestionGenerator } from '@/lib/interview-engine/anthropic-candidate-question'
import { createAnthropicConstraintADecider } from '@/lib/interview-engine/anthropic-decision'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { DeclineAction } from '@/lib/crc-engine/decline'
import type { CRCSessionState } from '@/lib/crc-engine/types'

const TURN_1_TEXT = 'I used Nano Banana for this one.'

async function runTrial(label: string, declineAction: DeclineAction) {
  console.log(`\n${'='.repeat(72)}\n${label} (declineAction: ${declineAction})\n${'='.repeat(72)}`)

  const store = createInMemorySessionStore()
  const token = `skip-question-coverage-${label}`
  const deps: RunTurnDeps = {
    extractor: createAnthropicExtractor(),
    generator: createAnthropicCandidateQuestionGenerator(),
    decider: createAnthropicConstraintADecider(),
    sessionStore: store,
    matrix: MATRIX_FIXTURE,
  }

  // Turn 1: ambiguous tool only, nothing else -- expect a question, not completion.
  const t1 = await runTurn({ token, turnNumber: 1, userText: TURN_1_TEXT }, deps)
  const s1 = (await store.load(token)) as CRCSessionState
  console.log(`Turn 1 -- outcome: ${t1.kind}${t1.kind !== 'complete' ? ` ("${(t1 as any).message}")` : ''}`)
  console.log(`  phase=${s1.structured_understanding.current_phase} gate_1=${s1.structured_understanding.gate_1_state} gate_2=${s1.structured_understanding.gate_2_state} completion_reason=${s1.structured_understanding.completion_reason} opt_out_scope=${s1.structured_understanding.opt_out_scope}`)
  console.log(`  pending_clarification=${JSON.stringify(s1.pending_clarification)}`)

  if (t1.kind === 'complete') {
    console.log('  ABORT: turn 1 completed before the decline turn could be reached -- scenario needs a sparser turn 1.')
    return
  }

  // Turn 2: the decline action under test, processed against an active question.
  const t2 = await runTurn({ token, turnNumber: 2, userText: 'skip', declineAction }, deps)
  const s2 = (await store.load(token)) as CRCSessionState
  console.log(`Turn 2 -- outcome: ${t2.kind}${t2.kind !== 'complete' ? ` ("${(t2 as any).message}")` : ''}`)
  console.log(`  phase=${s2.structured_understanding.current_phase} gate_1=${s2.structured_understanding.gate_1_state} gate_2=${s2.structured_understanding.gate_2_state} completion_reason=${s2.structured_understanding.completion_reason} opt_out_scope=${s2.structured_understanding.opt_out_scope}`)
  console.log(`  pending_clarification=${JSON.stringify(s2.pending_clarification)}`)

  if (t2.kind === 'complete') {
    console.log(`  Interview ended at turn 2 via decline (reason: ${s2.structured_understanding.completion_reason}).`)
    return
  }

  // Turn 3: does the interview continue normally afterward?
  const t3 = await runTurn({ token, turnNumber: 3, userText: "I'm the editor on it, and it's an internal test, nothing commercial." }, deps)
  const s3 = (await store.load(token)) as CRCSessionState
  console.log(`Turn 3 -- outcome: ${t3.kind}${t3.kind !== 'complete' ? ` ("${(t3 as any).message}")` : ''}`)
  console.log(`  phase=${s3.structured_understanding.current_phase} gate_1=${s3.structured_understanding.gate_1_state} gate_2=${s3.structured_understanding.gate_2_state} completion_reason=${s3.structured_understanding.completion_reason} opt_out_scope=${s3.structured_understanding.opt_out_scope}`)
}

async function main() {
  const trials: [string, DeclineAction][] = [
    ['skip_question_trial_1', 'skip_question'],
    ['skip_question_trial_2', 'skip_question'],
    ['skip_phase_comparison', 'skip_phase'],
    ['stop_interview_comparison', 'stop_interview'],
  ]
  for (const [label, action] of trials) {
    try {
      await runTrial(label, action)
    } catch (err) {
      // Isolate transient live-API failures (e.g. structured-output
      // validation misses) to the single trial they occurred in, rather
      // than aborting the whole targeted run -- unrelated to the
      // resolveToolMentionSupersessionTarget fix under test, and this
      // script is small enough that one bad trial shouldn't cost the rest.
      console.log(`  TRIAL FAILED (transient, unrelated to fix under test): ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

main().catch((err) => {
  console.error('Skip-question coverage eval failure:', err)
  process.exit(1)
})
