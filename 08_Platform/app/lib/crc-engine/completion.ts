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
 * `[FIXED 2026-08-10]` An interview-scope decline (`stop_interview`) is
 * checked directly against `optOutScope === 'interview'` -- passed in as
 * its own parameter, never inferred from `gate1.state`. This module
 * previously keyed off `gate1.state === 'not_applicable_declined'`, which
 * is a Gate 1 (understanding) outcome, not a termination decision: per
 * `evaluateGate1`'s own logic that state is only reachable when a decline
 * occurred AND minimum understanding was still unmet, so a user who
 * declined *after* already satisfying Gate 1 was silently left in an
 * active, unfinished session -- a confirmed engine defect (found live
 * against Production, 2026-08-10), and a direct contradiction of
 * `PRD_CRC_v1.0.md` §9's User Override rule below. The same stale
 * dependency also meant a `skip_question`/`skip_phase` decline issued
 * before minimum understanding was met could trigger this same
 * `not_applicable_declined` state and incorrectly end the *whole*
 * interview -- not just the one component -- a second, more severe latent
 * defect this fix resolves as a direct consequence, not a separate patch.
 * Gates evaluate understanding; they do not, and now structurally cannot,
 * determine whether an explicit user stop is honored -- that separation is
 * the fix, not an implementation detail of it. `evaluateGate1`/`gates.ts`
 * are unchanged; `not_applicable_declined` remains a meaningful, correct
 * description of Gate 1's own state, just no longer completion's signal.
 *
 * Decline always short-circuits, at any phase, any gate state: per
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
import type { CompletionReason, OptOutScope } from '@/types/interview-engine'

export interface CompletionResult {
  is_complete: boolean
  reason: CompletionReason
}

export function checkCompletion(gate1: Gate1Result, gate2: Gate2Result, phase: 1 | 2 | 3, optOutScope: OptOutScope): CompletionResult {
  // Interview-scope decline is an independent, higher-priority completion
  // condition -- checked first, and never derived from gate1.state (see
  // this module's own [FIXED 2026-08-10] header note for why). A single
  // completion reason ('declined') covers both "declined before minimum
  // understanding" and "declined after" -- that distinction is already
  // fully derivable from gate_1_state/StructuredUnderstanding downstream
  // and does not need its own completion-reason taxonomy entry.
  if (optOutScope === 'interview') {
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
