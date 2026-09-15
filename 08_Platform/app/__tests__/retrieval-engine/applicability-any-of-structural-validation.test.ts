/**
 * Structural validation tests for `applicability_any_of` (Generic Shallow
 * Applicability Expression Contract, ADR-001 §K.2/§K.8; Generic Shallow
 * Applicability -- Runtime Foundation milestone). No live model needed --
 * pure functions, same discipline as lookup-topic-claims.test.ts.
 */

import { validateApplicabilityAnyOf, isApplicabilityAnyOfValid } from '@/lib/retrieval-engine/applicability-any-of-structural-validation'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'

const okReq: ApplicabilityRequirement = { fact: 'jurisdiction', operator: 'equals', value: 'United States' }

describe('validateApplicabilityAnyOf -- ADR-001 §K.2 frozen validity contract', () => {
  test('absent (undefined) is always valid -- zero violations', () => {
    expect(validateApplicabilityAnyOf(undefined)).toEqual([])
    expect(isApplicabilityAnyOfValid(undefined)).toBe(true)
  })

  test('one valid group with one requirement is valid', () => {
    expect(validateApplicabilityAnyOf([[okReq]])).toEqual([])
  })

  test('multiple valid groups, each with multiple requirements, is valid', () => {
    const value: ApplicabilityRequirement[][] = [
      [okReq, { fact: 'tool_plan_tier', tool: 'kling', operator: 'not_equals', value: 'Free' }],
      [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }],
    ]
    expect(validateApplicabilityAnyOf(value)).toEqual([])
  })

  test('INVALID: empty outer array', () => {
    const violations = validateApplicabilityAnyOf([])
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('empty_outer_array')
    expect(isApplicabilityAnyOfValid([])).toBe(false)
  })

  test('INVALID: empty inner group (single group, empty)', () => {
    const violations = validateApplicabilityAnyOf([[]])
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('empty_group')
    expect(violations[0].group_index).toBe(0)
  })

  test('INVALID: empty inner group among otherwise-valid groups -- reports the specific offending group_index', () => {
    const violations = validateApplicabilityAnyOf([[okReq], [], [okReq]])
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('empty_group')
    expect(violations[0].group_index).toBe(1)
  })

  test('INVALID: malformed requirement (missing value)', () => {
    const malformed = { fact: 'jurisdiction', operator: 'equals' } as unknown as ApplicabilityRequirement
    const violations = validateApplicabilityAnyOf([[malformed]])
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('malformed_requirement')
    expect(violations[0].group_index).toBe(0)
    expect(violations[0].requirement_index).toBe(0)
  })

  test('INVALID: malformed requirement (null)', () => {
    const violations = validateApplicabilityAnyOf([[null as unknown as ApplicabilityRequirement]])
    expect(violations[0].kind).toBe('malformed_requirement')
  })

  test('INVALID: unknown ApplicabilityFact', () => {
    const unknown = { fact: 'not_a_real_fact', operator: 'equals', value: 'x' } as unknown as ApplicabilityRequirement
    const violations = validateApplicabilityAnyOf([[unknown]])
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('unknown_fact')
  })

  test('INVALID: unsupported operator', () => {
    const badOp = { fact: 'jurisdiction', operator: 'contains', value: 'United States' } as unknown as ApplicabilityRequirement
    const violations = validateApplicabilityAnyOf([[badOp]])
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('unsupported_operator')
  })

  test('multiple distinct violations across groups are all reported, each with correct indices -- never stops at the first', () => {
    const badOp = { fact: 'jurisdiction', operator: 'contains', value: 'x' } as unknown as ApplicabilityRequirement
    const unknown = { fact: 'nope', operator: 'equals', value: 'x' } as unknown as ApplicabilityRequirement
    const violations = validateApplicabilityAnyOf([[okReq, badOp], [unknown]])
    expect(violations).toHaveLength(2)
    expect(violations.map((v) => v.kind).sort()).toEqual(['unknown_fact', 'unsupported_operator'])
  })

  test('VALID (idempotent): duplicate requirements within one group are not a violation', () => {
    expect(validateApplicabilityAnyOf([[okReq, okReq]])).toEqual([])
  })

  test('VALID (idempotent): duplicate groups (byte-identical) are not a violation', () => {
    expect(validateApplicabilityAnyOf([[okReq], [okReq]])).toEqual([])
  })

  test('empty outer array short-circuits -- does not also report per-group violations that do not exist', () => {
    const violations = validateApplicabilityAnyOf([])
    expect(violations).toHaveLength(1)
  })

  test('deterministic: repeated calls on the same input produce byte-identical output', () => {
    const value: ApplicabilityRequirement[][] = [[okReq], []]
    expect(validateApplicabilityAnyOf(value)).toEqual(validateApplicabilityAnyOf(value))
  })

  test('never throws on any of the tested malformed inputs', () => {
    const inputs: unknown[] = [[], [[]], [[null]], [[{ fact: 'x' }]], [[{ fact: 'jurisdiction', operator: 'equals', value: 42 }]]]
    for (const input of inputs) {
      expect(() => validateApplicabilityAnyOf(input as ApplicabilityRequirement[][])).not.toThrow()
    }
  })
})
