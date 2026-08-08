/**
 * Finalization trigger (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §8, Live
 * Interview Runtime milestone). Pure function: given this turn's already-
 * computed Gate 1/Gate 2 results and phase, decide whether the interview
 * is complete. Runtime-owned, not Interview Engine's -- "the natural-
 * completion check" is explicitly Runtime's own responsibility per the
 * accepted architecture doc's ownership table (§1), even though it reads
 * Interview Engine's own gate/phase outputs.
 *
 * Reuses `CompletionReason` from `@/types/interview-engine` rather than
 * inventing a new type -- the exact same three values `run-dialogue.ts`'s
 * own (post-hoc, scripted-loop) completion computation already produces,
 * just evaluated live, per turn, instead of once after a script finishes.
 *
 * Decline always short-circuits, at any phase: `gate1.state ===
 * 'not_applicable_declined'` already reflects an interview-scope decline
 * (evaluateGate1's own decline branch reads `su.opt_out_scope` directly,
 * and the accepted per-turn loop orders decline pre-processing before
 * gate evaluation -- Phase 7's own shipped bugfix -- so this state is
 * always live and current for the turn it's checked on). Per
 * `PRD_CRC_v1.0.md` §9's User Override rule, a decline ends things
 * "immediately... regardless of either gate's status" -- and, by the same
 * logic, regardless of phase too.
 *
 * `[FINDING]` Completion is otherwise gated on `phase === 3`, not merely
 * on the gates themselves -- a real correction found while re-checking
 * this design against `INTERVIEW_ENGINE_ARCHITECTURE.md` §11: *"Gate 1
 * can be satisfied as early as end of Phase 2, and Phase 3 proceeds
 * regardless, since it gathers a different kind of understanding."* A
 * naive `gate1.state === 'met' && gate2.state === 'stable'` check with no
 * phase guard would let a very quick, complete Phase 1-2 answer skip
 * Phase 3's own commercial-journey discovery entirely -- exactly what §11
 * says must not happen. This mirrors `PRD_CRC_v1.0.md` §8's own flow
 * diagram, where Gate 2 stability is only ever evaluated as a loop-exit
 * condition from *inside* Phase 3's own per-turn loop, never before it.
 *
 * The `gate_1_unmet_exhausted` branch also requires `phase === 3` for the
 * same reason, and matches §9's own framing directly: *"Phase 1–2
 * completed but thin... Do not keep probing past the normal Phase 1–2
 * flow"* -- "Phase 1-2 completed" is exactly what `phase === 3` means
 * under the adopted runtime model (Phase 1 -> 2 -> 3 -> Completion Check).
 */

import type { Gate1Result, Gate2Result } from '@/lib/interview-engine/gates'
import type { CompletionReason } from '@/types/interview-engine'

export interface CompletionResult {
  is_complete: boolean
  reason: CompletionReason
}

export function checkCompletion(gate1: Gate1Result, gate2: Gate2Result, phase: 1 | 2 | 3): CompletionResult {
  if (gate1.state === 'not_applicable_declined') {
    return { is_complete: true, reason: 'declined' }
  }

  if (phase !== 3) {
    return { is_complete: false, reason: null }
  }

  if (gate1.state === 'met' && gate2.state === 'stable') {
    return { is_complete: true, reason: 'gate_1_gate_2_met' }
  }

  if (gate1.state === 'not_met') {
    return { is_complete: true, reason: 'gate_1_unmet_exhausted' }
  }

  return { is_complete: false, reason: null }
}
