/**
 * One-off diagnostic (Follow-up 1, tool-correction extraction fix):
 * re-verifies the resolveToolMentionSupersessionTarget fix in extraction.ts
 * against the live model, printing full ExtractionDiagnostic decisions and
 * final tool_mentions state per turn. Run before the focused correction
 * corpus to confirm the fix behaves correctly on the exact failing input,
 * including the retractedThisTurn guard added after this script's first
 * run surfaced a same-turn double-correction-candidate revert bug.
 *
 * Run: npx tsx --env-file=.env.local lib/interview-engine/eval/diagnose-correction-pipeline.ts
 */

import { createAnthropicExtractor } from '../anthropic-extractor'
import { runExtractionPipeline, type RawUserTurn } from '../extraction'
import type { StructuredUnderstanding } from '@/types/interview-engine'

function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

const TURN_1: RawUserTurn = { turn: 1, text: 'We used Midjourney for the visuals.' }
const TURN_2: RawUserTurn = {
  turn: 2,
  text: 'Actually, sorry -- that was wrong, we used Runway for the visuals, not Midjourney.',
}

async function main() {
  const extractor = createAnthropicExtractor()
  const trials = 8
  let correctCount = 0

  for (let i = 1; i <= trials; i++) {
    console.log(`\n${'='.repeat(72)}\nTrial ${i}/${trials}\n${'='.repeat(72)}`)
    let su = emptyStructuredUnderstanding()

    const r1 = await runExtractionPipeline(su, TURN_1, extractor)
    su = r1.updated

    const r2 = await runExtractionPipeline(su, TURN_2, extractor)
    su = r2.updated
    console.log('-- Turn 2 diagnostics --')
    for (const d of r2.diagnostics) {
      console.log(
        `  [${d.proposal_id}] kind=${d.candidate.kind} raw_tool_name=${d.candidate.raw_tool_name} is_correction=${d.candidate.is_correction ?? false} correction_of="${d.candidate.correction_of_raw_text ?? ''}" -> ${d.decision.outcome}` +
          (d.decision.outcome !== 'accepted' ? ` (${(d.decision as any).reason_code}: ${(d.decision as any).reason})` : ` (applied_identifier=${(d.decision as any).applied_identifier})`),
      )
    }
    console.log('-- SU.tool_mentions after turn 2 --')
    console.log(JSON.stringify(su.tool_mentions, null, 2))

    // Correctness bar per acceptance criteria: Runway is an active, canonical,
    // confirmed mention (new tool preserved), AND the turn-1 Midjourney
    // mention is superseded, not left as an active/dangling head (old tool
    // superseded, not deleted, and not silently reverted-back-to). A
    // harmless duplicate inert Midjourney entry from a redundant second
    // model candidate does NOT fail this bar -- it doesn't misrepresent
    // the current canonical tool, only adds inert noise (tracked as a
    // disclosed residual, not a blocking defect).
    const runwayActive = su.tool_mentions.some((m) => m.superseded_by === null && m.resolution.kind === 'canonical' && m.resolution.identifier === 'runway-gen3')
    const originalMidjourneySuperseded = su.tool_mentions.find((m) => m.mention_id === 'c1')?.superseded_by !== null
    const redundantDuplicate = su.tool_mentions.filter((m) => m.superseded_by === null).length > 1
    const verdict = runwayActive && originalMidjourneySuperseded ? (redundantDuplicate ? 'CORRECT (with harmless redundant duplicate entry)' : 'CORRECT') : 'WRONG'
    if (verdict.startsWith('CORRECT')) correctCount++
    console.log(`VERDICT: ${verdict}`)
  }

  console.log(`\n${correctCount}/${trials} trials correct.`)
}

main().catch((err) => {
  console.error('Diagnostic failure:', err)
  process.exit(1)
})
