/**
 * Structural validation for `TopicClaim.applicability_any_of` /
 * `MatrixClaim.applicability_any_of` (Generic Shallow Applicability
 * Expression Contract, ADR-001-generic-applicability-architecture.md §K.2/
 * §K.8, PM Freeze Amendment 2026-09-15).
 *
 * Answers exactly one question: is a given `applicability_any_of` value
 * structurally well-formed governed knowledge? Deliberately NOT a general
 * runtime schema-validation framework -- this is the smallest enforcement
 * mechanism consistent with this codebase's existing Living Knowledge
 * discipline, which has no runtime-loaded/user-submitted `TopicClaim` path
 * anywhere: every claim is a hand-authored, TypeScript-typed fixture
 * literal, reviewed by a human (FGR/CPR) and checked by a test-time
 * consistency guard against `GOVERNED-CLAIMS.md`
 * (`topic-claims-fixture-consistency.test.ts`). This module is the ADR-001
 * §K.8-frozen extension of that same three-layer scheme -- a deterministic,
 * pure, never-throwing violation list, consumed by a new structural test
 * (this milestone) and, per ADR-001 §K.3, as the evaluator's own
 * defense-in-depth entry gate (evaluateApplicabilityExpression in
 * lookup-topic-claims.ts calls this before ever running the three-valued
 * algebra).
 *
 * ADR-001 §K.2's frozen validity contract:
 *   VALID: field absent; field present with >=1 group; every group with
 *   >=1 syntactically well-formed `ApplicabilityRequirement` (a known
 *   `fact` in `APPLICABILITY_FACTS`, a supported `operator`).
 *   INVALID: `applicability_any_of: []` (empty outer array); any empty
 *   inner group; a malformed requirement; an unknown `ApplicabilityFact`;
 *   an unsupported operator; deeper/invalid nesting (structurally
 *   unreachable through the `ApplicabilityRequirement[][]` type itself --
 *   TypeScript, not this module, is what makes a third array level
 *   impossible for a compiled fixture).
 *   Duplicate requirements/groups remain valid and idempotent -- hygiene
 *   only, never reported as a violation by this module.
 *
 * `unknown fact`/`unsupported operator` are deliberately checked with a
 * plain runtime `includes`/literal comparison, not inferred from the
 * TypeScript type -- so this module still catches a real error on data that
 * somehow bypassed the compiler (the defense-in-depth path ADR-001 §K.3
 * describes), not only on data the type system already rejects.
 */

import { APPLICABILITY_FACTS, type ApplicabilityRequirement } from './types'

export const APPLICABILITY_ANY_OF_VIOLATION_KINDS = [
  'empty_outer_array',
  'empty_group',
  'malformed_requirement',
  'unknown_fact',
  'unsupported_operator',
] as const
export type ApplicabilityAnyOfViolationKind = (typeof APPLICABILITY_ANY_OF_VIOLATION_KINDS)[number]

export interface ApplicabilityAnyOfViolation {
  kind: ApplicabilityAnyOfViolationKind
  /** Index into the outer (OR) array. Absent only for `'empty_outer_array'`, which has no group to index. */
  group_index?: number
  /** Index into the inner (AND) group. Absent for `'empty_outer_array'`/`'empty_group'`, which have no requirement to index. */
  requirement_index?: number
  /** Human-readable, never rendered to a CRC user -- engineering/governance-review detail only. */
  detail: string
}

const SUPPORTED_OPERATORS = ['equals', 'not_equals'] as const

function isWellFormedRequirement(candidate: unknown): candidate is ApplicabilityRequirement {
  if (candidate === null || typeof candidate !== 'object') return false
  const req = candidate as Record<string, unknown>
  return (
    typeof req.fact === 'string' &&
    (APPLICABILITY_FACTS as readonly string[]).includes(req.fact) &&
    typeof req.operator === 'string' &&
    (SUPPORTED_OPERATORS as readonly string[]).includes(req.operator) &&
    typeof req.value === 'string' &&
    (req.tool === undefined || typeof req.tool === 'string')
  )
}

/**
 * Pure, deterministic, never-throwing. `undefined` (the field absent --
 * every production claim today) is always valid, per ADR-001 §K.2/§K.4's
 * own absent-semantics rule -- this function must never be called as a
 * precondition for "does this claim use the field at all," only to check a
 * value that IS present.
 */
export function validateApplicabilityAnyOf(value: ApplicabilityRequirement[][] | undefined): ApplicabilityAnyOfViolation[] {
  if (value === undefined) return []

  if (value.length === 0) {
    return [{ kind: 'empty_outer_array', detail: 'applicability_any_of is present but has zero groups -- an empty outer array is invalid governed knowledge (ADR-001 §K.2), never authorable.' }]
  }

  const violations: ApplicabilityAnyOfViolation[] = []

  value.forEach((group, group_index) => {
    if (!Array.isArray(group) || group.length === 0) {
      violations.push({ kind: 'empty_group', group_index, detail: `group ${group_index} is empty -- an empty inner AND-group is invalid governed knowledge (ADR-001 §K.2), never authorable.` })
      return
    }

    group.forEach((requirement, requirement_index) => {
      if (isWellFormedRequirement(requirement)) return

      const req = requirement as Record<string, unknown> | null | undefined
      if (req == null || typeof req !== 'object') {
        violations.push({ kind: 'malformed_requirement', group_index, requirement_index, detail: `group ${group_index} requirement ${requirement_index} is not a well-formed object.` })
        return
      }
      if (typeof req.fact !== 'string' || !(APPLICABILITY_FACTS as readonly string[]).includes(req.fact)) {
        violations.push({ kind: 'unknown_fact', group_index, requirement_index, detail: `group ${group_index} requirement ${requirement_index} has an unrecognized fact: ${JSON.stringify(req.fact)}.` })
        return
      }
      if (typeof req.operator !== 'string' || !(SUPPORTED_OPERATORS as readonly string[]).includes(req.operator)) {
        violations.push({ kind: 'unsupported_operator', group_index, requirement_index, detail: `group ${group_index} requirement ${requirement_index} has an unsupported operator: ${JSON.stringify(req.operator)}.` })
        return
      }
      violations.push({ kind: 'malformed_requirement', group_index, requirement_index, detail: `group ${group_index} requirement ${requirement_index} is malformed (missing/wrong-typed value or tool).` })
    })
  })

  return violations
}

export function isApplicabilityAnyOfValid(value: ApplicabilityRequirement[][] | undefined): boolean {
  return validateApplicabilityAnyOf(value).length === 0
}
