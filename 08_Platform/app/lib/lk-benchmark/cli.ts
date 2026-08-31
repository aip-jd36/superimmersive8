#!/usr/bin/env tsx
/**
 * Prospective Living Knowledge benchmark ledger CLI (LK-68).
 *
 * Usage: npx tsx lib/lk-benchmark/cli.ts <command> <trialId> [args] [--flags]
 *
 *   trial-start   <trialId> --provenance "..."
 *   trial-end     <trialId> --provenance "..."
 *   hrt           <trialId> --provenance "..." [--note "..."]
 *   handoff       <trialId> --provenance "..." [--note "..."]
 *   stage-start   <trialId> <label> --provenance "..."
 *   stage-end     <trialId> <label> --provenance "..."
 *   stage-fail    <trialId> <label> --provenance "..."
 *   friction      <trialId> --provenance "..." --note "..."
 *   discovery     <trialId> --provenance "..." --note "..."
 *   summary       <trialId>
 *
 * Optional --ledger <path> overrides the default repository-local ledger
 * (06_Operations/institutional-knowledge/lk-benchmark/<trialId>.jsonl).
 *
 * This CLI only ever appends already-decided facts supplied by its caller.
 * It never infers a governance outcome, never advances a Candidate
 * lifecycle, and never touches CRC runtime or Living Knowledge state -- see
 * types.ts's NOTE_GOVERNANCE_DISCLAIMER.
 */

import {
  defaultLedgerPath,
  endMachineStage,
  failMachineStage,
  readEvents,
  recordArchitectureDiscovery,
  recordHumanReviewTurn,
  recordManualOrchestrationHandoff,
  recordProcessFriction,
  recordTrialEnd,
  recordTrialStart,
  startMachineStage,
} from './ledger'
import { computeSummary, renderSummaryMarkdown } from './summary'

interface ParsedArgs {
  positional: string[]
  flags: Record<string, string>
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = argv[i + 1]
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`FAIL CLOSED: flag --${key} requires a value`)
      }
      flags[key] = value
      i++
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

function requireFlag(flags: Record<string, string>, name: string): string {
  const value = flags[name]
  if (value === undefined) {
    throw new Error(`FAIL CLOSED: --${name} is required`)
  }
  return value
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2)
  if (!command) {
    throw new Error(
      'FAIL CLOSED: no command given. Usage: cli.ts <trial-start|trial-end|hrt|handoff|stage-start|stage-end|stage-fail|friction|discovery|summary> <trialId> [...args] [--flags]'
    )
  }
  const { positional, flags } = parseArgs(rest)
  const [trialId, ...restPositional] = positional
  if (!trialId) {
    throw new Error('FAIL CLOSED: trialId is required as the first positional argument')
  }
  const ledgerPath = flags.ledger ?? defaultLedgerPath(trialId)

  switch (command) {
    case 'trial-start': {
      const event = recordTrialStart(ledgerPath, trialId, requireFlag(flags, 'provenance'))
      console.log(`TRIAL_START recorded: ${JSON.stringify(event)}`)
      break
    }
    case 'trial-end': {
      const { event, danglingStageLabels } = recordTrialEnd(ledgerPath, trialId, requireFlag(flags, 'provenance'))
      console.log(`TRIAL_END recorded: ${JSON.stringify(event)}`)
      if (danglingStageLabels.length > 0) {
        console.warn(
          `WARNING: ${danglingStageLabels.length} MACHINE_STAGE label(s) were started but never ended/failed -- excluded from all totals: ${danglingStageLabels.join(', ')}`
        )
      }
      break
    }
    case 'hrt': {
      const event = recordHumanReviewTurn(ledgerPath, trialId, requireFlag(flags, 'provenance'), flags.note)
      console.log(`HUMAN_REVIEW_TURN recorded (${event.modelledSeconds}s modelled): ${JSON.stringify(event)}`)
      break
    }
    case 'handoff': {
      const event = recordManualOrchestrationHandoff(
        ledgerPath,
        trialId,
        requireFlag(flags, 'provenance'),
        flags.note
      )
      console.log(`MANUAL_ORCHESTRATION_HANDOFF recorded (${event.modelledSeconds}s modelled): ${JSON.stringify(event)}`)
      break
    }
    case 'stage-start': {
      const [label] = restPositional
      if (!label) throw new Error('FAIL CLOSED: stage-start requires <label> as the second positional argument')
      const event = startMachineStage(ledgerPath, trialId, label, requireFlag(flags, 'provenance'))
      console.log(`MACHINE_STAGE start recorded: ${JSON.stringify(event)}`)
      break
    }
    case 'stage-end': {
      const [label] = restPositional
      if (!label) throw new Error('FAIL CLOSED: stage-end requires <label> as the second positional argument')
      const event = endMachineStage(ledgerPath, trialId, label, requireFlag(flags, 'provenance'))
      console.log(`MACHINE_STAGE end recorded (${event.durationSeconds}s measured, status=completed): ${JSON.stringify(event)}`)
      break
    }
    case 'stage-fail': {
      const [label] = restPositional
      if (!label) throw new Error('FAIL CLOSED: stage-fail requires <label> as the second positional argument')
      const event = failMachineStage(ledgerPath, trialId, label, requireFlag(flags, 'provenance'))
      console.log(`MACHINE_STAGE end recorded (${event.durationSeconds}s measured, status=failed): ${JSON.stringify(event)}`)
      break
    }
    case 'friction': {
      const event = recordProcessFriction(
        ledgerPath,
        trialId,
        requireFlag(flags, 'provenance'),
        requireFlag(flags, 'note')
      )
      console.log(`PROCESS_FRICTION recorded: ${JSON.stringify(event)}`)
      break
    }
    case 'discovery': {
      const event = recordArchitectureDiscovery(
        ledgerPath,
        trialId,
        requireFlag(flags, 'provenance'),
        requireFlag(flags, 'note')
      )
      console.log(`ARCHITECTURE_DISCOVERY recorded: ${JSON.stringify(event)}`)
      break
    }
    case 'summary': {
      const events = readEvents(ledgerPath)
      const summary = computeSummary(events, trialId)
      console.log(renderSummaryMarkdown(summary))
      break
    }
    default:
      throw new Error(`FAIL CLOSED: unknown command "${command}"`)
  }
}

main()
