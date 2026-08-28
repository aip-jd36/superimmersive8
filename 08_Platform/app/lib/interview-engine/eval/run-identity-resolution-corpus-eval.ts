/**
 * Focused identity-resolution corpus runner (proposal-ID collision class
 * fix, 2026-08-09). Runs IDENTITY_RESOLUTION_CORPUS against the real
 * Anthropic extractor through runExtractionPipeline(), multiple trials per
 * case, reporting per-trial structural outcomes plus an aggregate summary
 * against the acceptance criteria: zero silent drops; zero duplicate-ID
 * rejection for legitimate re-mentions; zero invented supersessions;
 * correction corpus remains green; no runtime regressions (checked
 * separately, via the crc-engine battery harness).
 *
 * Run: npx tsx --env-file=.env.local lib/interview-engine/eval/run-identity-resolution-corpus-eval.ts [--trials=N]
 */

import { createAnthropicExtractor } from '../anthropic-extractor'
import { runExtractionPipeline, type RawUserTurn } from '../extraction'
import { IDENTITY_RESOLUTION_CORPUS } from './identity-resolution-corpus'
import type { StructuredUnderstanding, ToolMention } from '@/types/interview-engine'

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

function label(m: ToolMention): string {
  return m.resolution.kind === 'canonical' ? m.resolution.identifier : `unresolved:${m.resolution.raw_name}`
}

interface CaseTrialResult {
  caseId: string
  trial: number
  duplicateIdRejections: number
  totalCandidates: number
  correctionCandidates: number
  finalActiveMentions: string[]
  finalSupersededCount: number
  notes: string[]
}

async function runCase(caseId: string, turns: string[], trial: number, extractor: ReturnType<typeof createAnthropicExtractor>): Promise<CaseTrialResult> {
  let su = emptyStructuredUnderstanding()
  let duplicateIdRejections = 0
  let totalCandidates = 0
  let correctionCandidates = 0
  const notes: string[] = []

  for (let i = 0; i < turns.length; i++) {
    const rawTurn: RawUserTurn = { turn: i + 1, text: turns[i] }
    const { updated, diagnostics } = await runExtractionPipeline(su, rawTurn, extractor)
    su = updated
    for (const d of diagnostics) {
      if (d.candidate.kind === 'tool_mention') totalCandidates++
      if (d.candidate.kind === 'tool_mention' && d.candidate.is_correction) correctionCandidates++
      if (d.decision.outcome === 'rejected' && d.decision.reason_code === 'MUTATION_DUPLICATE_ID') {
        duplicateIdRejections++
        notes.push(`turn ${i + 1}: MUTATION_DUPLICATE_ID on proposal ${d.proposal_id} (${d.candidate.raw_tool_name}) -- SILENT DROP`)
      }
    }
  }

  const active = su.tool_mentions.filter((m) => m.superseded_by === null)
  const superseded = su.tool_mentions.filter((m) => m.superseded_by !== null)

  return {
    caseId,
    trial,
    duplicateIdRejections,
    totalCandidates,
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

  for (const c of IDENTITY_RESOLUTION_CORPUS) {
    console.log(`\n${'='.repeat(72)}\n${c.id}\n  ${c.description}\n  Expectation: ${c.expectation}\n${'='.repeat(72)}`)
    for (let t = 1; t <= trials; t++) {
      const result = await runCase(c.id, c.turns, t, extractor)
      allResults.push(result)
      console.log(
        `  trial ${t}: active=[${result.finalActiveMentions.join(', ')}] superseded_count=${result.finalSupersededCount} ` +
          `duplicate_id_rejections=${result.duplicateIdRejections}` +
          (result.notes.length ? `\n    NOTES: ${result.notes.join(' | ')}` : ''),
      )
    }
  }

  console.log(`\n${'='.repeat(72)}\nSUMMARY\n${'='.repeat(72)}`)
  const totalDuplicateRejections = allResults.reduce((s, r) => s + r.duplicateIdRejections, 0)
  console.log(`Total MUTATION_DUPLICATE_ID rejections across all trials: ${totalDuplicateRejections} (0 = acceptance criterion met)`)
  for (const c of IDENTITY_RESOLUTION_CORPUS) {
    const caseResults = allResults.filter((r) => r.caseId === c.id)
    console.log(`\n${c.id}:`)
    for (const r of caseResults) {
      console.log(`  trial ${r.trial}: active=[${r.finalActiveMentions.join(', ')}] superseded=${r.finalSupersededCount} dup_rejections=${r.duplicateIdRejections}`)
    }
  }
}

main().catch((err) => {
  console.error('Corpus eval failure:', err)
  process.exit(1)
})
