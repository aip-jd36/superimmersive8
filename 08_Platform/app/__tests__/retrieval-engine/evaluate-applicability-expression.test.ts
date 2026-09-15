/**
 * Authoritative evaluator tests for the Generic Shallow Applicability
 * Expression Contract (ADR-001-generic-applicability-architecture.md §K;
 * Generic Shallow Applicability -- Runtime Foundation milestone). Covers:
 * the frozen three-state AND/OR algebra, the eight architecture acceptance
 * cases from the Runtime Foundation task itself, backward compatibility
 * (alternatives absent), and the invalid-governance defense-in-depth path.
 * No live model needed -- pure functions, same discipline as
 * lookup-topic-claims.test.ts.
 */

import { evaluateApplicabilityExpression, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'
import type { ToolMention } from '@/types/interview-engine'

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
}

/**
 * One synthetic, uniquely-identified leaf requirement + the ToolMention (if
 * any) needed to drive it to the desired status, using `tool_account_status`
 * as a generic, already-real `ApplicabilityFact` -- never a new fact type.
 * `id` doubles as the synthetic canonical tool identifier so each leaf is
 * independently controllable.
 */
function leaf(id: string, status: 'met' | 'not_met' | 'unresolved'): { requirement: ApplicabilityRequirement; mention: ToolMention | null } {
  const requirement: ApplicabilityRequirement = { fact: 'tool_account_status', tool: id, operator: 'equals', value: 'Member Account' }
  if (status === 'unresolved') return { requirement, mention: null }
  const mention: ToolMention = {
    mention_id: `m-${id}`,
    resolution: { kind: 'canonical', identifier: id },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'confirmed', value: status === 'met' ? 'Member Account' : 'Regular Account' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: `${id} account status`,
    superseded_by: null,
  }
  return { requirement, mention }
}

/** Builds one AND-group (an array of requirements) plus the merged facts needed to drive every leaf to its stated status. */
function group(...leaves: ReturnType<typeof leaf>[]): { requirements: ApplicabilityRequirement[]; facts: ApplicabilityFacts } {
  return {
    requirements: leaves.map((l) => l.requirement),
    facts: facts({ toolMentions: leaves.map((l) => l.mention).filter((m): m is ToolMention => m !== null) }),
  }
}

function mergeFacts(...many: ApplicabilityFacts[]): ApplicabilityFacts {
  return facts({ toolMentions: many.flatMap((f) => f.toolMentions) })
}

describe('evaluateApplicabilityExpression -- frozen three-state AND/OR algebra (ADR-001 §K.4)', () => {
  const M = leaf('m', 'met').requirement
  const N = leaf('n', 'not_met').requirement
  const U = leaf('u', 'unresolved').requirement
  const allFacts = mergeFacts(group(leaf('m', 'met')).facts, group(leaf('n', 'not_met')).facts, group(leaf('u', 'unresolved')).facts)

  // AND is exercised via the mandatory group alone (alternatives absent).
  describe('AND (mandatory group, alternatives absent)', () => {
    test('MET + MET = MET', () => {
      const r = evaluateApplicabilityExpression([M, M], undefined, allFacts)
      expect(r.valid && r.status).toBe('met')
    })
    test('MET + UNRESOLVED = UNRESOLVED', () => {
      const r = evaluateApplicabilityExpression([M, U], undefined, allFacts)
      expect(r.valid && r.status).toBe('unresolved')
    })
    test('MET + NOT_MET = NOT_MET', () => {
      const r = evaluateApplicabilityExpression([M, N], undefined, allFacts)
      expect(r.valid && r.status).toBe('not_met')
    })
    test('UNRESOLVED + UNRESOLVED = UNRESOLVED', () => {
      const r = evaluateApplicabilityExpression([U, U], undefined, allFacts)
      expect(r.valid && r.status).toBe('unresolved')
    })
    test('UNRESOLVED + NOT_MET = NOT_MET', () => {
      const r = evaluateApplicabilityExpression([U, N], undefined, allFacts)
      expect(r.valid && r.status).toBe('not_met')
    })
    test('NOT_MET + NOT_MET = NOT_MET', () => {
      const r = evaluateApplicabilityExpression([N, N], undefined, allFacts)
      expect(r.valid && r.status).toBe('not_met')
    })
  })

  // OR is exercised via alternatives with an empty (vacuously-met) mandatory group.
  describe('OR (alternative groups, mandatory empty)', () => {
    function orOf(a: ApplicabilityRequirement, b: ApplicabilityRequirement) {
      return evaluateApplicabilityExpression([], [[a], [b]], allFacts)
    }
    test('MET + MET = MET', () => expect(orOf(M, M).valid && (orOf(M, M) as any).status).toBe('met'))
    test('MET + NOT_MET = MET', () => expect((orOf(M, N) as any).status).toBe('met'))
    test('MET + UNRESOLVED = MET', () => expect((orOf(M, U) as any).status).toBe('met'))
    test('NOT_MET + NOT_MET = NOT_MET', () => expect((orOf(N, N) as any).status).toBe('not_met'))
    test('NOT_MET + UNRESOLVED = UNRESOLVED', () => expect((orOf(N, U) as any).status).toBe('unresolved'))
    test('UNRESOLVED + UNRESOLVED = UNRESOLVED', () => expect((orOf(U, U) as any).status).toBe('unresolved'))
  })

  test('empty mandatory group is vacuously MET (unchanged existing convention)', () => {
    const r = evaluateApplicabilityExpression([], undefined, facts())
    expect(r.valid && r.status).toBe('met')
  })

  test('alternatives absent is vacuously MET -- contributes no-op to composition', () => {
    const r = evaluateApplicabilityExpression([M], undefined, allFacts)
    expect(r.valid && r.status).toBe('met')
  })
})

describe('evaluateApplicabilityExpression -- backward compatibility (ADR-001 §K.1)', () => {
  test('field absent: mandatory met alone drives the aggregate, identical to isApplicable([...]) today', () => {
    const g = group(leaf('a', 'met'))
    const r = evaluateApplicabilityExpression(g.requirements, undefined, g.facts)
    expect(r).toEqual({ valid: true, status: 'met', material_unresolved: [], all_outcomes: [{ requirement: g.requirements[0], status: 'met' }] })
  })

  test('field absent: mandatory unresolved alone', () => {
    const g = group(leaf('a', 'unresolved'))
    const r = evaluateApplicabilityExpression(g.requirements, undefined, g.facts)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([{ requirement: g.requirements[0], status: 'unresolved' }])
  })

  test('field absent: mandatory not_met alone', () => {
    const g = group(leaf('a', 'not_met'))
    const r = evaluateApplicabilityExpression(g.requirements, undefined, g.facts)
    expect(r.valid && r.status).toBe('not_met')
    expect(r.valid && r.material_unresolved).toEqual([])
  })

  test('field absent: multiple mandatory requirements, mixed', () => {
    const met = leaf('a', 'met')
    const unresolved = leaf('b', 'unresolved')
    const f = mergeFacts(group(met).facts, group(unresolved).facts)
    const r = evaluateApplicabilityExpression([met.requirement, unresolved.requirement], undefined, f)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([{ requirement: unresolved.requirement, status: 'unresolved' }])
  })

  test('jurisdiction requirement, unchanged behavior', () => {
    const req: ApplicabilityRequirement = { fact: 'jurisdiction', operator: 'equals', value: 'United States' }
    const r = evaluateApplicabilityExpression([req], undefined, facts({ jurisdiction: { included: ['United States'], excluded: [] } }))
    expect(r.valid && r.status).toBe('met')
  })

  test('tool_plan_tier requirement, unchanged behavior', () => {
    const req: ApplicabilityRequirement = { fact: 'tool_plan_tier', tool: 'kling', operator: 'not_equals', value: 'Free' }
    const mention: ToolMention = {
      mention_id: 'm1',
      resolution: { kind: 'canonical', identifier: 'kling' },
      access_surface: { state: 'unknown' },
      plan_tier: { state: 'confirmed', value: 'Standard' },
      account_status: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'Standard plan',
      superseded_by: null,
    }
    const r = evaluateApplicabilityExpression([req], undefined, facts({ toolMentions: [mention] }))
    expect(r.valid && r.status).toBe('met')
  })

  test('tool_account_status requirement, unchanged behavior', () => {
    const g = group(leaf('kling', 'met'))
    const r = evaluateApplicabilityExpression(g.requirements, undefined, g.facts)
    expect(r.valid && r.status).toBe('met')
  })
})

describe('evaluateApplicabilityExpression -- the eight architecture acceptance cases (Runtime Foundation milestone, Phase 8)', () => {
  test('CASE 1: mandatory=[] ; alternatives = [A met] OR [B unresolved] => aggregate met, material=[]', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const f = mergeFacts(group(A).facts, group(B).facts)
    const r = evaluateApplicabilityExpression([], [[A.requirement], [B.requirement]], f)
    expect(r.valid && r.status).toBe('met')
    expect(r.valid && r.material_unresolved).toEqual([])
  })

  test('CASE 2: alternatives = [A not_met] OR [B unresolved] => aggregate unresolved, material=[B]', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'unresolved')
    const f = mergeFacts(group(A).facts, group(B).facts)
    const r = evaluateApplicabilityExpression([], [[A.requirement], [B.requirement]], f)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([{ requirement: B.requirement, status: 'unresolved' }])
  })

  test('CASE 3: alternatives = [A unresolved] OR [B unresolved] => aggregate unresolved, material=[A, B]', () => {
    const A = leaf('a', 'unresolved')
    const B = leaf('b', 'unresolved')
    const f = mergeFacts(group(A).facts, group(B).facts)
    const r = evaluateApplicabilityExpression([], [[A.requirement], [B.requirement]], f)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([
      { requirement: A.requirement, status: 'unresolved' },
      { requirement: B.requirement, status: 'unresolved' },
    ])
  })

  test('CASE 4: alternatives = [A met AND B unresolved] OR [C not_met] => aggregate unresolved, material=[B]', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const f = mergeFacts(group(A).facts, group(B).facts, group(C).facts)
    const r = evaluateApplicabilityExpression([], [[A.requirement, B.requirement], [C.requirement]], f)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([{ requirement: B.requirement, status: 'unresolved' }])
  })

  test('CASE 5: alternatives = [A not_met AND B unresolved] OR [C not_met] => aggregate not_met, material=[]', () => {
    const A = leaf('a', 'not_met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const f = mergeFacts(group(A).facts, group(B).facts, group(C).facts)
    const r = evaluateApplicabilityExpression([], [[A.requirement, B.requirement], [C.requirement]], f)
    expect(r.valid && r.status).toBe('not_met')
    expect(r.valid && r.material_unresolved).toEqual([])
  })

  test('CASE 6: mandatory=[A unresolved, B met] ; alternatives=[C met] => aggregate unresolved, material=[A]', () => {
    const A = leaf('a', 'unresolved')
    const B = leaf('b', 'met')
    const C = leaf('c', 'met')
    const f = mergeFacts(group(A).facts, group(B).facts, group(C).facts)
    const r = evaluateApplicabilityExpression([A.requirement, B.requirement], [[C.requirement]], f)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([{ requirement: A.requirement, status: 'unresolved' }])
  })

  test('CASE 7: mandatory=[A unresolved, B not_met] ; alternatives=[C met] => aggregate not_met, material=[]', () => {
    const A = leaf('a', 'unresolved')
    const B = leaf('b', 'not_met')
    const C = leaf('c', 'met')
    const f = mergeFacts(group(A).facts, group(B).facts, group(C).facts)
    const r = evaluateApplicabilityExpression([A.requirement, B.requirement], [[C.requirement]], f)
    expect(r.valid && r.status).toBe('not_met')
    expect(r.valid && r.material_unresolved).toEqual([])
  })

  test('CASE 8: mandatory=[A met] ; alternatives=[B unresolved AND C not_met] OR [D unresolved] => aggregate unresolved, material=[D] (B correctly non-material, its own group is dead)', () => {
    const A = leaf('a', 'met')
    const B = leaf('b', 'unresolved')
    const C = leaf('c', 'not_met')
    const D = leaf('d', 'unresolved')
    const f = mergeFacts(group(A).facts, group(B).facts, group(C).facts, group(D).facts)
    const r = evaluateApplicabilityExpression([A.requirement], [[B.requirement, C.requirement], [D.requirement]], f)
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved).toEqual([{ requirement: D.requirement, status: 'unresolved' }])
  })
})

describe('evaluateApplicabilityExpression -- invalid-governance defense-in-depth (ADR-001 §K.3)', () => {
  test('empty outer array: valid=false, never met/not_met/unresolved', () => {
    const r = evaluateApplicabilityExpression([], [], facts())
    expect(r.valid).toBe(false)
    expect((r as any).status).toBeUndefined()
    expect(r.valid === false && r.violations[0].kind).toBe('empty_outer_array')
  })

  test('empty inner group: valid=false', () => {
    const r = evaluateApplicabilityExpression([], [[]], facts())
    expect(r.valid).toBe(false)
    expect(r.valid === false && r.violations[0].kind).toBe('empty_group')
  })

  test('malformed requirement: valid=false', () => {
    const malformed = { fact: 'jurisdiction', operator: 'equals' } as unknown as ApplicabilityRequirement
    const r = evaluateApplicabilityExpression([], [[malformed]], facts())
    expect(r.valid).toBe(false)
  })

  test('unknown fact: valid=false', () => {
    const unknown = { fact: 'nope', operator: 'equals', value: 'x' } as unknown as ApplicabilityRequirement
    const r = evaluateApplicabilityExpression([], [[unknown]], facts())
    expect(r.valid).toBe(false)
  })

  test('unsupported operator: valid=false', () => {
    const badOp = { fact: 'jurisdiction', operator: 'contains', value: 'x' } as unknown as ApplicabilityRequirement
    const r = evaluateApplicabilityExpression([], [[badOp]], facts())
    expect(r.valid).toBe(false)
  })

  test('invalid result never carries status/material_unresolved/all_outcomes fields -- structurally cannot be mistaken for a valid outcome', () => {
    const r = evaluateApplicabilityExpression([], [], facts())
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect('status' in r).toBe(false)
      expect('material_unresolved' in r).toBe(false)
      expect('all_outcomes' in r).toBe(false)
    }
  })

  test('duplicate requirements remain valid and idempotent through the full evaluator, not just the validator', () => {
    const M = leaf('a', 'met')
    const r = evaluateApplicabilityExpression([], [[M.requirement, M.requirement]], group(M).facts)
    expect(r.valid && r.status).toBe('met')
  })

  test('duplicate groups remain valid and idempotent through the full evaluator', () => {
    const M = leaf('a', 'met')
    const r = evaluateApplicabilityExpression([], [[M.requirement], [M.requirement]], group(M).facts)
    expect(r.valid && r.status).toBe('met')
  })

  test('mandatory-array malformation is NOT validated by this gate -- applicability_requirements keeps its own, separate, pre-existing (compile-time-only) contract; only applicability_any_of is defensively validated at runtime, per ADR-001 §K.2/§K.8 scoping this to the new field', () => {
    // Documents the deliberate scope boundary: passing a well-formed mandatory array alongside
    // an invalid alternatives array still reports exactly the alternatives violation.
    const okMandatory: ApplicabilityRequirement = { fact: 'jurisdiction', operator: 'equals', value: 'United States' }
    const r = evaluateApplicabilityExpression([okMandatory], [], facts())
    expect(r.valid).toBe(false)
  })
})
