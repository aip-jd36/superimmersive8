#!/usr/bin/env tsx
/**
 * Prospective Living Knowledge benchmark ledger CLI (LK-68; LK-82
 * measurement-semantics correction).
 *
 * Usage: npx tsx lib/lk-benchmark/cli.ts <command> <trialId> [args] [--flags]
 *
 *   trial-start          <trialId> --provenance "..."
 *   trial-end            <trialId> --provenance "..."
 *   hrt                  <trialId> --provenance "..." [--note "..."]
 *   handoff               <trialId> --provenance "..." [--note "..."]
 *   stage-start           <trialId> <label> --provenance "..."
 *   stage-end             <trialId> <label> --provenance "..."
 *   stage-fail            <trialId> <label> --provenance "..."
 *   machine-execution      <trialId> <label> --provenance "..." -- <command> [args...]
 *   friction               <trialId> --provenance "..." --note "..."
 *   discovery              <trialId> --provenance "..." --note "..."
 *   process-wait            <trialId> --provenance "..." --note "..."
 *   operator-unavailable    <trialId> --provenance "..." --note "..."
 *   unmeasured-work         <trialId> --provenance "..." --note "..."
 *   summary                 <trialId>
 *
 * Optional --ledger <path> overrides the default repository-local ledger
 * (06_Operations/institutional-knowledge/lk-benchmark/<trialId>.jsonl).
 *
 * `stage-start`/`stage-end`/`stage-fail` bracket the elapsed wall-clock time
 * between two SEPARATE CLI invocations -- never reported as measured machine
 * execution (see types.ts/summary.ts). `machine-execution` is the LK-82
 * primitive that genuinely measures execution: it is a SINGLE invocation
 * that spawns and owns the bounded subprocess after the literal `--`
 * separator itself, with `shell: false` -- the command and its arguments are
 * passed as a real argv array, never interpolated into a shell string.
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
  recordMachineExecution,
  recordOperatorUnavailable,
  recordProcessFriction,
  recordProcessWait,
  recordTrialEnd,
  recordTrialStart,
  recordUnmeasuredWork,
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

/**
 * Splits argv on the first LITERAL `--` token (exact match only -- never a
 * prefix match against `--flag`). Everything before is parsed normally by
 * `parseArgs`; everything after is returned untouched as the raw subprocess
 * argv for `machine-execution` -- never re-joined into a string, never
 * passed through a shell.
 */
function splitOnDoubleDash(argv: string[]): { before: string[]; command: string[] | null } {
  const idx = argv.indexOf('--')
  if (idx === -1) return { before: argv, command: null }
  return { before: argv.slice(0, idx), command: argv.slice(idx + 1) }
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
      'FAIL CLOSED: no command given. Usage: cli.ts <trial-start|trial-end|hrt|handoff|stage-start|stage-end|stage-fail|machine-execution|friction|discovery|process-wait|operator-unavailable|unmeasured-work|summary> <trialId> [...args] [--flags]'
    )
  }
  const { before, command: subprocessCommand } = splitOnDoubleDash(rest)
  const { positional, flags } = parseArgs(before)
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
      console.log(`MACHINE_STAGE end recorded (${event.durationSeconds}s bracketed elapsed, status=completed -- NOT measured machine execution; use machine-execution for that): ${JSON.stringify(event)}`)
      break
    }
    case 'stage-fail': {
      const [label] = restPositional
      if (!label) throw new Error('FAIL CLOSED: stage-fail requires <label> as the second positional argument')
      const event = failMachineStage(ledgerPath, trialId, label, requireFlag(flags, 'provenance'))
      console.log(`MACHINE_STAGE end recorded (${event.durationSeconds}s bracketed elapsed, status=failed -- NOT measured machine execution; use machine-execution for that): ${JSON.stringify(event)}`)
      break
    }
    case 'machine-execution': {
      const [label] = restPositional
      if (!label) throw new Error('FAIL CLOSED: machine-execution requires <label> as the second positional argument')
      if (!subprocessCommand || subprocessCommand.length === 0) {
        throw new Error(
          'FAIL CLOSED: machine-execution requires a literal `--` followed by the command to run, e.g. machine-execution <trialId> <label> --provenance "..." -- npx jest __tests__/foo.test.ts'
        )
      }
      const event = recordMachineExecution(ledgerPath, trialId, label, requireFlag(flags, 'provenance'), subprocessCommand)
      console.log(`MACHINE_EXECUTION recorded (${event.durationSeconds}s measured, status=${event.status}, exitCode=${event.exitCode}): ${JSON.stringify(event)}`)
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
    case 'process-wait': {
      const event = recordProcessWait(ledgerPath, trialId, requireFlag(flags, 'provenance'), requireFlag(flags, 'note'))
      console.log(`PROCESS_WAIT recorded (no duration -- qualitative marker only): ${JSON.stringify(event)}`)
      break
    }
    case 'operator-unavailable': {
      const event = recordOperatorUnavailable(ledgerPath, trialId, requireFlag(flags, 'provenance'), requireFlag(flags, 'note'))
      console.log(`OPERATOR_UNAVAILABLE recorded (no duration -- qualitative marker only): ${JSON.stringify(event)}`)
      break
    }
    case 'unmeasured-work': {
      const event = recordUnmeasuredWork(ledgerPath, trialId, requireFlag(flags, 'provenance'), requireFlag(flags, 'note'))
      console.log(`UNMEASURED_WORK recorded (no duration -- qualitative marker only): ${JSON.stringify(event)}`)
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
