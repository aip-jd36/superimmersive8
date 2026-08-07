/**
 * Thin deterministic tests for Constraint A's contract and corpus
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 6c). No live model calls -- proves
 * the type contract and corpus well-formedness before any real-model
 * evaluation runs. Real decision quality is evaluated separately (the
 * standalone eval harness), reported apart from these results.
 *
 * Run: npx jest __tests__/interview-engine/decision.test.ts
 */

import {
  ASK_REASON_CODES,
  CONSTRAINT_A_REASON_CODES,
  SUPPRESS_REASON_CODES,
  type ConstraintADecision,
} from '../../lib/interview-engine/decision'
import { constantConstraintADecider } from '../../lib/interview-engine/mock-decision'
import { CONSTRAINT_A_CORPUS } from '../../lib/interview-engine/eval/constraint-a-corpus'
import { deriveEligibleSignals, validateCandidateReference } from '../../lib/interview-engine/candidate-question'

describe('reason code partition', () => {
  test('ASK_REASON_CODES and SUPPRESS_REASON_CODES are disjoint and together cover every code', () => {
    const overlap = ASK_REASON_CODES.filter((c) => SUPPRESS_REASON_CODES.includes(c))
    expect(overlap).toEqual([])
    const union = new Set([...ASK_REASON_CODES, ...SUPPRESS_REASON_CODES])
    expect(union).toEqual(new Set(CONSTRAINT_A_REASON_CODES))
  })

  test('each has exactly the expected count (7 named + 1 fallback per direction)', () => {
    expect(ASK_REASON_CODES).toHaveLength(8)
    expect(SUPPRESS_REASON_CODES).toHaveLength(8)
  })
})

describe('constantConstraintADecider', () => {
  test('returns exactly what it was constructed with, ignoring input', async () => {
    const decision: ConstraintADecision = { should_ask: true, reason_code: 'MISSING_INTENDED_USE', rationale: 'test' }
    const decider = constantConstraintADecider(decision)
    const c = CONSTRAINT_A_CORPUS[0]
    const result = await decider({ structured_understanding: c.structured_understanding, candidate: c.candidate, phase: c.candidate.phase })
    expect(result).toEqual(decision)
  })
})

describe('CONSTRAINT_A_CORPUS well-formedness', () => {
  test('covers all 15 required cases', () => {
    expect(CONSTRAINT_A_CORPUS).toHaveLength(15)
  })

  test('every case has a unique id', () => {
    const ids = CONSTRAINT_A_CORPUS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every acceptable_reason_codes entry only contains codes matching expected_should_ask direction', () => {
    for (const c of CONSTRAINT_A_CORPUS) {
      const allowedSet = c.expected_should_ask ? ASK_REASON_CODES : SUPPRESS_REASON_CODES
      for (const code of c.acceptable_reason_codes) {
        expect(allowedSet).toContain(code)
      }
    }
  })

  test('every candidate references a signal_id that is either null or eligible under its own structured_understanding', () => {
    for (const c of CONSTRAINT_A_CORPUS) {
      const eligible = deriveEligibleSignals(c.structured_understanding)
      const validation = validateCandidateReference(c.candidate, eligible)
      expect(validation.outcome).toBe('accepted')
    }
  })

  test('every case with an after_structured_understanding produces a structurally valid state', () => {
    for (const c of CONSTRAINT_A_CORPUS) {
      if (!c.after_structured_understanding) continue
      // Sanity: still a well-formed StructuredUnderstanding shape (derivable without throwing).
      expect(() => deriveEligibleSignals(c.after_structured_understanding!)).not.toThrow()
    }
  })
})
