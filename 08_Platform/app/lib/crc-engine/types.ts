/**
 * CRC Runtime — domain types (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §6,
 * Live Interview Runtime milestone). Additive only -- nothing here
 * modifies any frozen Interview Engine, Retrieval Engine, or Projection
 * Layer type.
 *
 * `CRCSessionState` is exactly the minimum durable session state the
 * accepted architecture doc's own §6 table names -- `structured_understanding`,
 * `boundary_state`, and `pending_clarification` -- and nothing more.
 * Deliberately excludes:
 *   - `current_phase`/gate states: recomputable caches (`computePhase`,
 *     `evaluateGate1`/`evaluateGate2`), never a session's own source of
 *     truth, per §6/§2's own "prefer deriving" finding.
 *   - `completion_reason`/`opt_out_scope`: these already live inside
 *     `structured_understanding` itself (both are `StructuredUnderstanding`
 *     fields) -- storing them again here would be exactly the unnecessary
 *     duplication JD's own decision standard asks to avoid.
 *   - Full raw `conversation_history`: explicitly out of scope for the
 *     core loop's own durable state (§6) -- a UI-only, append-only
 *     concern if the product ever wants a literal chat scrollback.
 */

import type { BoundaryState } from '@/lib/interview-engine/boundaries'
import type { PendingClarification } from '@/lib/interview-engine/pending-clarification'
import type { StructuredUnderstanding } from '@/types/interview-engine'

export interface CRCSessionState {
  structured_understanding: StructuredUnderstanding
  boundary_state: BoundaryState
  pending_clarification: PendingClarification | null
}
