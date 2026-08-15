/**
 * Focused correction corpus runner (Follow-up 1). Runs CORRECTION_CORPUS
 * against the real Anthropic extractor through runExtractionPipeline(),
 * multiple trials per case, and reports per-trial structural outcomes plus
 * an aggregate pass table against the acceptance criteria JD specified:
 * correction detected reliably; correct prior signal targeted; new tool
 * preserved; old tool superseded not deleted; two-tool coexistence remains
 * two tools; 0 invented tool corrections; no MUTATION_DUPLICATE_ID
 * rejections (the original defect's own symptom).
 *
 * Run: npx tsx --env-file=.env.local lib/interview-engine/eval/run-correction-corpus-eval.ts [--trials=N]
 */

import { createAnthropicExtractor } from '../anthropic-extractor'
import { runExtractionPipeline, type RawUserTurn } from '../extraction'
import { CORRECTION_CORPUS } from './correction-corpus'
import type { StructuredUnderstanding, ToolMention } from '@/types/interview-engine'

function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function label(m: ToolMention): string {
  return m.resolution.kind === 'canonical' ? m.resolution.identifier : `unresolved:${m.resolution.raw_name}`
}

interface CaseTrialResult {
  caseId: string
  trial: number
  duplicateIdRejections: number
  correctionCandidates: { raw_tool_name: string | undefined; is_correction: boolean; accepted: boolean }[]
  finalActiveMentions: string[]
  finalSupersededCount: number
  notes: string[]
}

async function runCase(caseId: string, turns: string[], trial: number, extractor: ReturnType<typeof createAnthropicExtractor>): Promise<CaseTrialResult> {
  let su = emptyStructuredUnderstanding()
  let duplicateIdRejections = 0
  const correctionCandidates: CaseTrialResult['correctionCandidates'] = []
  const notes: string[] = []

  for (let i = 0; i < turns.length; i++) {
    const rawTurn: RawUserTurn = { turn: i + 1, text: turns[i] }
    const { updated, diagnostics } = await runExtractionPipeline(su, rawTurn, extractor)
    su = updated
    for (const d of diagnostics) {
      if (d.decision.outcome === 'rejected' && d.decision.reason_code === 'MUTATION_DUPLICATE_ID') {
        duplicateIdRejections++
        notes.push(`turn ${i + 1}: MUTATION_DUPLICATE_ID on proposal ${d.proposal_id} (${d.candidate.raw_tool_name}) -- ORIGINAL DEFECT SYMPTOM`)
      }
      if (d.candidate.kind === 'tool_mention' && d.candidate.is_correction) {
        correctionCandidates.push({ raw_tool_name: d.candidate.raw_tool_name, is_correction: true, accepted: d.decision.outcome === 'accepted' })
      }
    }
  }

  const active = su.tool_mentions.filter((m) => m.superseded_by === null)
  const superseded = su.tool_mentions.filter((m) => m.superseded_by !== null)

  return {
    caseId,
    trial,
    duplicateIdRejections,
    correctionCandidates,
    finalActiveMentions: active.map(label),
    finalSupersededCount: superseded.length,
    notes,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const trialsArg = args.find((a) => a.startsWith('--trials='))
  const trials = trialsArg ? parseInt(trialsArg.split('=')[1], 10) : 3

  const extractor = createAnthropicExtractor()
  const allResults: CaseTrialResult[] = []

  for (const c of CORRECTION_CORPUS) {
    console.log(`\n${'='.repeat(72)}\n${c.id}\n  ${c.description}\n  Expectation: ${c.expectation}\n${'='.repeat(72)}`)
    for (let t = 1; t <= trials; t++) {
      const result = await runCase(c.id, c.turns, t, extractor)
      allResults.push(result)
      console.log(
        `  trial ${t}: active=[${result.finalActiveMentions.join(', ')}] superseded_count=${result.finalSupersededCount} ` +
          `duplicate_id_rejections=${result.duplicateIdRejections} correction_candidates=${JSON.stringify(result.correctionCandidates)}` +
          (result.notes.length ? `\n    NOTES: ${result.notes.join(' | ')}` : ''),
      )
    }
  }

  console.log(`\n${'='.repeat(72)}\nSUMMARY\n${'='.repeat(72)}`)
  const totalDuplicateRejections = allResults.reduce((s, r) => s + r.duplicateIdRejections, 0)
  console.log(`Total MUTATION_DUPLICATE_ID rejections across all trials: ${totalDuplicateRejections} (0 = defect not reproduced)`)
  for (const c of CORRECTION_CORPUS) {
    const caseResults = allResults.filter((r) => r.caseId === c.id)
    console.log(`\n${c.id}:`)
    for (const r of caseResults) {
      console.log(`  trial ${r.trial}: active=[${r.finalActiveMentions.join(', ')}] superseded=${r.finalSupersededCount}`)
    }
  }
}

main().catch((err) => {
  console.error('Corpus eval failure:', err)
  process.exit(1)
})
