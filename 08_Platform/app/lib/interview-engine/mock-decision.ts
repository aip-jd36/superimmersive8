/**
 * Mock ConstraintADecider for deterministic tests. Parallel to
 * mock-extractor.ts and mock-candidate-question.ts -- returns whatever it
 * was constructed with, ignoring input entirely.
 */

import type { ConstraintADecider, ConstraintADecision, ConstraintAInput } from './decision'

export function constantConstraintADecider(decision: ConstraintADecision): ConstraintADecider {
  return async (_input: ConstraintAInput) => decision
}
