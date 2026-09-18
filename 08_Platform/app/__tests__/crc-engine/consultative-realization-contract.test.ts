/**
 * CC-4C.2A -- Shared Consultative Realization contract tests. Deterministic,
 * no live model, no I/O. Every case builds literal `ConsultativeAnswerPlan`
 * / `ProjectionOutput` / `ConsultativeNote[]` fixtures directly (same style
 * as `unresolved-applicability-realization.test.ts`'s own `section()`
 * builder) rather than driving the full retrieval/BI pipeline -- this suite
 * pins the realization's OWN reshaping contract, independent of whether the
 * Plan/Projection construction upstream of it is correct (that is already
 * covered by consultative-answer-plan.test.ts and
 * assemble-projection-output.test.ts).
 *
 * Assertions are structural/semantic (field values, presence/absence,
 * ordering, identity), never prose snapshots.
 */

import {
  buildConsultativeRealization,
  type ConsultativeCommercialAssurance,
  type ConsultativeGoalAnswer,
} from '@/lib/crc-engine/consultative-realization-contract'
import type {
  ConsultativeAnswerPlan,
  PlanClaimRef,
  PlanDiscoveredContextItem,
  PlanGoalSection,
  PlanMissingEvidenceRef,
  PlanUnresolvedItem,
} from '@/lib/crc-engine/consultative-answer-plan'
import type { ConsultativeNote } from '@/lib/crc-engine/unresolved-applicability-realization'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory } from '@/types/interview-engine'

// ── builders ─────────────────────────────────────────────────────────────

function claimRef(overrides: Partial<PlanClaimRef> & Pick<PlanClaimRef, 'claim_id'>): PlanClaimRef {
  return {
    matrix_identifier: overrides.claim_id,
    match_origin: 'exact_topic',
    matched_goal_category: 'commercial_use',
    relationship_id: null,
    last_verified: null,
    ...overrides,
  }
}

function section(overrides: Partial<PlanGoalSection> & Pick<PlanGoalSection, 'category'>): PlanGoalSection {
  return {
    goal_text: `goal for ${overrides.category}`,
    bi_status: 'directly_relevant',
    disposition: 'governed_guidance_available',
    supported_claim_refs: [],
    summary_claim_refs: [],
    unresolved_items: [],
    missing_evidence: [],
    boundary_ref: 'tool_source',
    bi_summary_blocks: [`summary for ${overrides.category}`],
    ...overrides,
  }
}

function plan(overrides: Partial<ConsultativeAnswerPlan> = {}): ConsultativeAnswerPlan {
  return {
    explicit_sections: [],
    discovered_context: [],
    render_once_markers: [],
    commercial_assurance_refs: [],
    ...overrides,
  }
}

function projectionOutput(overrides: Partial<ProjectionOutput> = {}): ProjectionOutput {
  return {
    opening_line: "Here's what I understood about your workflow.",
    understood_summary: '',
    knowledge_items: [],
    goal_interpretations: [],
    closing_cta: 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.',
    ...overrides,
  }
}

function note(overrides: Partial<ConsultativeNote> & Pick<ConsultativeNote, 'goal_index'>): ConsultativeNote {
  return { text: 'Specifically, this depends on something, which hasn’t been confirmed in this conversation.', ...overrides }
}

function unresolvedApplicabilityItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'CLAIM-A', fact: 'tool_account_status', tool: 'synthtool', ...overrides }
}

function withheldClaimItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'withheld_relevant_claim' }>> = {}): PlanUnresolvedItem {
  return { kind: 'withheld_relevant_claim', claim_id: 'CLAIM-B', ...overrides }
}

function openDependencyItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'open_project_dependency' }>> = {}): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id: 'CLAIM-A', dependency_id: 'dep-1', ...overrides }
}

function missingEvidenceRef(overrides: Partial<PlanMissingEvidenceRef> & Pick<PlanMissingEvidenceRef, 'classification'>): PlanMissingEvidenceRef {
  return { source_claim_id: 'CLAIM-A', dependency_id: null, applicability_fact: null, ...overrides }
}

function discoveredItem(overrides: Partial<PlanDiscoveredContextItem> & Pick<PlanDiscoveredContextItem, 'authorizing_goal_category'>): PlanDiscoveredContextItem {
  return { claim_ref: claimRef({ claim_id: 'DISCOVERED-CLAIM', matched_goal_category: overrides.authorizing_goal_category }), ...overrides }
}

const CATEGORY_A: GoalCategory = 'copyright_ownership'
const CATEGORY_B: GoalCategory = 'trademark'

// ─────────────────────────────────────────────────────────────────────────

describe('CC-4C.2A -- CASE A: single explicit goal, governed guidance available', () => {
  const sec = section({
    category: CATEGORY_A,
    goal_text: 'Who owns the copyright on this?',
    disposition: 'governed_guidance_available',
    boundary_ref: 'tool_source',
    bi_summary_blocks: ['This is the verbatim governed answer.'],
  })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())

  test('exactly one goal answer', () => {
    expect(result.goal_answers).toHaveLength(1)
  })

  test('original goal identity/text preserved', () => {
    expect(result.goal_answers[0].category).toBe(CATEGORY_A)
    expect(result.goal_answers[0].goal_text).toBe('Who owns the copyright on this?')
    expect(result.goal_answers[0].goal_index).toBe(0)
  })

  test('existing content blocks preserved exactly', () => {
    expect(result.goal_answers[0].content_blocks).toEqual(['This is the verbatim governed answer.'])
  })

  test('PlanDisposition preserved', () => {
    expect(result.goal_answers[0].disposition).toBe('governed_guidance_available')
  })

  test('boundary_ref preserved exactly', () => {
    expect(result.goal_answers[0].boundary_ref).toBe('tool_source')
  })

  test('no unresolved/missing-evidence groups when the section carries none', () => {
    expect(result.unresolved_groups).toEqual([])
    expect(result.missing_evidence_groups).toEqual([])
  })
})

describe('CC-4C.2A -- CASE B: governed guidance available WITH unresolved relevant items (mixed-resolution state)', () => {
  const sec = section({
    category: CATEGORY_A,
    disposition: 'governed_guidance_available_with_open_items',
    unresolved_items: [withheldClaimItem()],
  })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())

  test('the goal remains governed-guidance-available (the WITH-open-items form) according to existing disposition', () => {
    expect(result.goal_answers[0].disposition).toBe('governed_guidance_available_with_open_items')
  })

  test('unresolved items remain present, attached to the same goal_index', () => {
    expect(result.unresolved_groups).toEqual([{ goal_index: 0, category: CATEGORY_A, items: [withheldClaimItem()] }])
  })

  test('the realization never introduces a "resolved" label anywhere in the output', () => {
    const serialized = JSON.stringify(result)
    expect(serialized).not.toMatch(/"resolved"|"appears_resolved"|"cleared"|"satisfied"|"complete"/i)
  })
})

describe('CC-4C.2A -- CASE C: unresolved applicability', () => {
  const item = unresolvedApplicabilityItem({ claim_id: 'CLAIM-X', fact: 'jurisdiction', tool: null })
  const sec = section({ category: CATEGORY_A, disposition: 'governed_guidance_available_with_open_items', unresolved_items: [item] })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())

  test('unresolved item preserved verbatim, including kind discrimination', () => {
    expect(result.unresolved_groups[0].items[0]).toEqual(item)
  })

  test('provenance preserved (goal_index + category)', () => {
    expect(result.unresolved_groups[0]).toMatchObject({ goal_index: 0, category: CATEGORY_A })
  })

  test('applicability fact preserved exactly', () => {
    const preserved = result.unresolved_groups[0].items[0]
    expect(preserved.kind).toBe('unresolved_applicability')
    if (preserved.kind === 'unresolved_applicability') expect(preserved.fact).toBe('jurisdiction')
  })

  test('no stronger applicability conclusion is generated -- the item carries no new field beyond what CC-3A already produced', () => {
    expect(Object.keys(result.unresolved_groups[0].items[0]).sort()).toEqual(Object.keys(item).sort())
  })
})

describe('CC-4C.2A -- CASE D: documentary evidence dependency', () => {
  const ref = missingEvidenceRef({ classification: 'requires_documentary_evidence', dependency_id: 'dep-evidence' })
  const sec = section({ category: CATEGORY_A, missing_evidence: [ref] })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())

  test('classification remains requires_documentary_evidence', () => {
    expect(result.missing_evidence_groups[0].items[0].classification).toBe('requires_documentary_evidence')
  })

  test('it does not become answerable_in_conversation', () => {
    expect(result.missing_evidence_groups[0].items[0].classification).not.toBe('answerable_in_conversation')
  })
})

describe('CC-4C.2A -- CASE E: multiple explicit goals', () => {
  const secA = section({ category: CATEGORY_A, goal_text: 'Copyright question', boundary_ref: 'tool_source' })
  const secB = section({ category: CATEGORY_B, goal_text: 'Trademark question', boundary_ref: 'case_3b_unresolved' })
  const result = buildConsultativeRealization(plan({ explicit_sections: [secA, secB] }), projectionOutput())

  test('goal ordering preserved (array order, by goal_index)', () => {
    expect(result.goal_answers.map((g) => g.goal_index)).toEqual([0, 1])
    expect(result.goal_answers.map((g) => g.category)).toEqual([CATEGORY_A, CATEGORY_B])
  })

  test('each goal retains its own boundary_ref', () => {
    expect(result.goal_answers[0].boundary_ref).toBe('tool_source')
    expect(result.goal_answers[1].boundary_ref).toBe('case_3b_unresolved')
  })

  test('NO answer-level boundary field exists anywhere on the realization', () => {
    expect(result).not.toHaveProperty('answer_level_boundary')
    expect(result).not.toHaveProperty('boundary')
    expect(Object.keys(result).sort()).toEqual(
      ['commercial_assurance', 'discovered_context', 'goal_answers', 'missing_evidence_groups', 'unresolved_groups'].sort(),
    )
  })

  test('no cross-goal content contamination', () => {
    expect(result.goal_answers[0].content_blocks).toEqual(secA.bi_summary_blocks)
    expect(result.goal_answers[1].content_blocks).toEqual(secB.bi_summary_blocks)
    expect(result.goal_answers[0].content_blocks).not.toEqual(result.goal_answers[1].content_blocks)
  })
})

describe('CC-4C.2A -- CASE F: different boundary_refs across goals', () => {
  const secA = section({ category: CATEGORY_A, boundary_ref: 'tool_source' })
  const secB = section({ category: CATEGORY_B, boundary_ref: 'outside_coverage' })
  const result = buildConsultativeRealization(plan({ explicit_sections: [secA, secB] }), projectionOutput())

  test('both remain independently attached to their own goals, no dedup, no merge, no synthesized boundary', () => {
    expect(result.goal_answers[0].boundary_ref).toBe('tool_source')
    expect(result.goal_answers[1].boundary_ref).toBe('outside_coverage')
  })
})

describe('CC-4C.2A -- CASE G: identical boundary_refs across goals', () => {
  const secA = section({ category: CATEGORY_A, boundary_ref: 'case_3b_unresolved' })
  const secB = section({ category: CATEGORY_B, boundary_ref: 'case_3b_unresolved' })
  const result = buildConsultativeRealization(plan({ explicit_sections: [secA, secB] }), projectionOutput())

  test('this deliberately locks the human-review decision: each goal STILL carries its own boundary_ref, even though the values happen to be equal -- no dedup, no unification', () => {
    expect(result.goal_answers[0].boundary_ref).toBe('case_3b_unresolved')
    expect(result.goal_answers[1].boundary_ref).toBe('case_3b_unresolved')
    expect(result.goal_answers).toHaveLength(2)
  })
})

describe('CC-4C.2A -- CASE H: provenance-preserving unresolved groups', () => {
  const secA = section({ category: CATEGORY_A, unresolved_items: [withheldClaimItem({ claim_id: 'A-1' })] })
  const secB = section({ category: CATEGORY_B, unresolved_items: [] })
  const secC = section({ category: 'likeness', unresolved_items: [openDependencyItem({ source_claim_id: 'C-1', dependency_id: 'dep-c' })] })
  const result = buildConsultativeRealization(plan({ explicit_sections: [secA, secB, secC] }), projectionOutput())

  test('a group exists for every goal with an unresolved item, and no others', () => {
    expect(result.unresolved_groups.map((g) => g.goal_index)).toEqual([0, 2])
  })

  test('originating goal identity/reference is mandatory on every group', () => {
    for (const group of result.unresolved_groups) {
      expect(typeof group.goal_index).toBe('number')
      expect(group.category).toBeTruthy()
    }
  })

  test('category/provenance is retained per group', () => {
    expect(result.unresolved_groups[0].category).toBe(CATEGORY_A)
    expect(result.unresolved_groups[1].category).toBe('likeness')
  })

  test('no unresolved item exists without an origin -- every item in the flattened set traces back to exactly one group', () => {
    const flattened = result.unresolved_groups.flatMap((g) => g.items.map((item) => ({ item, goal_index: g.goal_index })))
    expect(flattened).toHaveLength(2)
    expect(flattened.every((f) => typeof f.goal_index === 'number')).toBe(true)
  })
})

describe('CC-4C.2A -- CASE I: missing-evidence classifications remain distinct', () => {
  const sec = section({
    category: CATEGORY_A,
    missing_evidence: [
      missingEvidenceRef({ classification: 'answerable_in_conversation', dependency_id: 'dep-ask' }),
      missingEvidenceRef({ classification: 'requires_documentary_evidence', dependency_id: 'dep-doc' }),
      missingEvidenceRef({ classification: 'applicability_unresolved', applicability_fact: 'jurisdiction' }),
    ],
  })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())

  test('all three classifications are present and distinct', () => {
    const classifications = result.missing_evidence_groups[0].items.map((i) => i.classification)
    expect(classifications).toEqual(['answerable_in_conversation', 'requires_documentary_evidence', 'applicability_unresolved'])
    expect(new Set(classifications).size).toBe(3)
  })
})

describe('CC-4C.2A -- CASE J: multiple unresolved applicability facts (M2B fail-closed case)', () => {
  const sec = section({
    category: CATEGORY_A,
    disposition: 'governed_guidance_available_with_open_items',
    unresolved_items: [
      unresolvedApplicabilityItem({ claim_id: 'CLAIM-X', fact: 'jurisdiction' }),
      unresolvedApplicabilityItem({ claim_id: 'CLAIM-Y', fact: 'tool_plan_tier' }),
    ],
  })
  // M2B declines to produce a note when >=2 distinct applicability facts are unresolved for one goal.
  const notes: ConsultativeNote[] = []
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput(), notes)

  test('note may remain null when M2B declined', () => {
    expect(result.goal_answers[0].note).toBeNull()
  })

  test('realization still preserves BOTH existing unresolved items', () => {
    expect(result.unresolved_groups[0].items).toHaveLength(2)
    expect(result.unresolved_groups[0].items.map((i) => (i.kind === 'unresolved_applicability' ? i.fact : null))).toEqual(['jurisdiction', 'tool_plan_tier'])
  })

  test('realization does not invent replacement prose for the declined note', () => {
    expect(result.goal_answers[0].note).toBeNull()
    expect(result.goal_answers[0].content_blocks).toEqual(sec.bi_summary_blocks)
  })
})

describe('CC-4C.2A -- CASE K: discovered context / Track C', () => {
  const sec = section({ category: CATEGORY_A })
  const discovered = discoveredItem({ authorizing_goal_category: CATEGORY_A })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec], discovered_context: [discovered] }), projectionOutput())

  test('authorizing_goal_category preserved', () => {
    expect(result.discovered_context[0].authorizing_goal_category).toBe(CATEGORY_A)
  })

  test('discovered item does not become a goal answer', () => {
    expect(result.goal_answers).toHaveLength(1)
    expect(result.goal_answers.some((g) => g.goal_text === undefined)).toBe(false)
  })

  test('no fabricated UserGoal -- discovered_context items carry claim_ref + authorizing_goal_category only, never goal_text/disposition/boundary_ref', () => {
    expect(result.discovered_context[0]).toEqual(discovered)
    expect(result.discovered_context[0]).not.toHaveProperty('goal_text')
    expect(result.discovered_context[0]).not.toHaveProperty('disposition')
  })
})

describe('CC-4C.2A -- CASE L: Commercial Assurance refs', () => {
  test('duplicate structural refs collapse to one boolean applies=true, never multiple handoffs', () => {
    const dupRefs = [
      { source_claim_id: 'CLAIM-A', dependency_id: 'dep-1', applicability_fact: null },
      { source_claim_id: 'CLAIM-A', dependency_id: 'dep-1', applicability_fact: null },
      { source_claim_id: 'CLAIM-B', dependency_id: 'dep-2', applicability_fact: null },
    ]
    const result = buildConsultativeRealization(
      plan({ explicit_sections: [section({ category: CATEGORY_A })], commercial_assurance_refs: dupRefs }),
      projectionOutput(),
    )
    expect(result.commercial_assurance).toEqual<ConsultativeCommercialAssurance>({
      applies: true,
      closing_cta: 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.',
    })
  })

  test('no ref count, claim id, or dependency id is exposed on the realization itself', () => {
    const result = buildConsultativeRealization(
      plan({
        explicit_sections: [section({ category: CATEGORY_A })],
        commercial_assurance_refs: [{ source_claim_id: 'CLAIM-A', dependency_id: 'dep-1', applicability_fact: null }],
      }),
      projectionOutput(),
    )
    expect(Object.keys(result.commercial_assurance).sort()).toEqual(['applies', 'closing_cta'])
  })

  test('realization does not generate "will resolve/clear/approve/certify" semantics -- closing_cta is the verbatim, already-approved sentence, unmodified', () => {
    const result = buildConsultativeRealization(plan({ explicit_sections: [section({ category: CATEGORY_A })] }), projectionOutput())
    expect(result.commercial_assurance.closing_cta).not.toMatch(/will resolve|will clear|will approve|will certify|will confirm/i)
  })

  test('applies is false when no refs exist AND closing_cta is empty (the fully-empty ProjectionOutput case)', () => {
    const result = buildConsultativeRealization(plan(), projectionOutput({ closing_cta: '' }))
    expect(result.commercial_assurance).toEqual<ConsultativeCommercialAssurance>({ applies: false, closing_cta: '' })
  })
})

describe('CC-4C.2A -- CASE M: no unresolved dependencies -- explicit regression against inventing a resolved semantic', () => {
  const sec = section({ category: CATEGORY_A, disposition: 'governed_guidance_available', unresolved_items: [], missing_evidence: [] })
  const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())

  test('the realization type has no field named resolved/appears_resolved/cleared/satisfied/complete anywhere', () => {
    const goalAnswerKeys = Object.keys(result.goal_answers[0])
    expect(goalAnswerKeys).not.toContain('resolved')
    expect(goalAnswerKeys).not.toContain('appears_resolved')
    expect(goalAnswerKeys).not.toContain('cleared')
    expect(goalAnswerKeys).not.toContain('satisfied')
    expect(goalAnswerKeys).not.toContain('complete')
  })

  test('the only status field present is the verbatim PlanDisposition', () => {
    expect(result.goal_answers[0].disposition).toBe('governed_guidance_available')
  })

  test('an empty unresolved_items array produces no unresolved_group -- absence, not a positive "resolved" marker', () => {
    expect(result.unresolved_groups).toEqual([])
  })
})

describe('CC-4C.2A -- CASE N: out-of-sample genericity (alternate GoalCategory, no category-specific branch)', () => {
  const categories: GoalCategory[] = ['likeness', 'third_party_source_rights', 'unknown']
  test.each(categories)('category %s produces a structurally identical shape to any other category', (category) => {
    const sec = section({ category, unresolved_items: [withheldClaimItem()], missing_evidence: [missingEvidenceRef({ classification: 'requires_documentary_evidence' })] })
    const result = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(result.goal_answers[0].category).toBe(category)
    expect(result.unresolved_groups[0].category).toBe(category)
    expect(result.missing_evidence_groups[0].category).toBe(category)
    // Structural shape (key set) is identical regardless of category value -- no category ever changes the output's own shape.
    expect(Object.keys(result.goal_answers[0]).sort()).toEqual(
      ['boundary_ref', 'category', 'content_blocks', 'disposition', 'goal_index', 'goal_text', 'note'].sort(),
    )
  })
})

describe('CC-4C.2A -- CASE O: determinism', () => {
  test('identical inputs produce deep-equal output across independent calls', () => {
    const secA = section({ category: CATEGORY_A, unresolved_items: [withheldClaimItem(), unresolvedApplicabilityItem()], missing_evidence: [missingEvidenceRef({ classification: 'answerable_in_conversation' })] })
    const secB = section({ category: CATEGORY_B, boundary_ref: 'outside_coverage' })
    const discovered = [discoveredItem({ authorizing_goal_category: CATEGORY_A })]
    const refs = [{ source_claim_id: 'CLAIM-A', dependency_id: null, applicability_fact: 'jurisdiction' as const }]
    const notes = [note({ goal_index: 0 })]

    const inputPlan = plan({ explicit_sections: [secA, secB], discovered_context: discovered, commercial_assurance_refs: refs })
    const inputOutput = projectionOutput()

    const first = buildConsultativeRealization(inputPlan, inputOutput, notes)
    const second = buildConsultativeRealization(inputPlan, inputOutput, notes)
    expect(first).toEqual(second)
  })

  test('inputs are not mutated', () => {
    const sec = section({ category: CATEGORY_A, unresolved_items: [withheldClaimItem()] })
    const inputPlan = plan({ explicit_sections: [sec] })
    const before = JSON.parse(JSON.stringify(inputPlan))
    buildConsultativeRealization(inputPlan, projectionOutput())
    expect(inputPlan).toEqual(before)
  })
})
