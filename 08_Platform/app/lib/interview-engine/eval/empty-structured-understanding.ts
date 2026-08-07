/**
 * A fresh, empty StructuredUnderstanding for the eval harness to start each
 * scenario trial from. Kept as its own small module rather than importing
 * one of the __tests__/ helper functions -- non-test code should not import
 * from the test tree.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'

export function emptyStructuredUnderstanding(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}
