/**
 * CRC-CC-SCOPE-5 -- Bounded Realization Presentation-Role Implementation.
 * Focused, adversarial coverage for the new, additive
 * `unresolved_item_presentation` / `missing_evidence_presentation` arrays on
 * `ConsultativeRealization`, and the two Realization-owned functions that
 * derive them: `presentationRoleForUnresolvedReason` (allowlisted, NOT
 * `reason !== null`) and `findCorrelatedUnresolvedItem` (exact-match-only,
 * fail-closed).
 *
 * Builder style mirrors `exact-same-claim-applicability-collapse.test.ts`'s
 * own literal-`ConsultativeAnswerPlan` convention for full, precise control
 * over adversarial/multiplicity shapes not reachable through the real
 * retrieve()/BI pipeline.
 */

import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import type { ConsultativeAnswerPlan, PlanClaimRef, PlanGoalSection, PlanMissingEvidenceRef, PlanUnresolvedItem } from '@/lib/crc-engine/consultative-answer-plan'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory } from '@/types/interview-engine'
import type { ApplicabilityUnresolvedReason } from '@/lib/retrieval-engine/types'

// ── literal builders (mirrors exact-same-claim-applicability-collapse.test.ts) ──

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
  return { explicit_sections: [], discovered_context: [], render_once_markers: [], commercial_assurance_refs: [], ...overrides }
}
function projectionOutput(overrides: Partial<ProjectionOutput> = {}): ProjectionOutput {
  return {
    opening_line: "Here's what I understood about your workflow.",
    understood_summary: '',
    knowledge_items: [],
    goal_interpretations: [],
    closing_cta: '',
    ...overrides,
  }
}
function withheld(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'withheld_relevant_claim' }>> = {}): PlanUnresolvedItem {
  return { kind: 'withheld_relevant_claim', claim_id: 'CLAIM-X', fact: 'jurisdiction', tool: null, unresolved_reason: null, ...overrides }
}
function applicability(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'CLAIM-X', fact: 'jurisdiction', tool: null, unresolved_reason: null, ...overrides }
}
function openDependency(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'open_project_dependency' }>> = {}): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed', ...overrides }
}
function missingEvidenceRef(overrides: Partial<PlanMissingEvidenceRef> & Pick<PlanMissingEvidenceRef, 'classification'>): PlanMissingEvidenceRef {
  return { source_claim_id: 'CLAIM-X', dependency_id: null, applicability_fact: null, ...overrides }
}

const COMMERCIAL: GoalCategory = 'commercial_use'
const COPYRIGHT: GoalCategory = 'copyright_ownership'
const REASON: ApplicabilityUnresolvedReason = 'value_not_among_established_values'

// ─────────────────────────────────────────────────────────────────────────
// PART 12 -- reason mapping
// ─────────────────────────────────────────────────────────────────────────

describe('SCOPE-5 -- reason -> presentation role mapping (Part 12)', () => {
  test('A: value_not_among_established_values -> scoped_context', () => {
    const sec = section({ category: COPYRIGHT, unresolved_items: [applicability({ unresolved_reason: REASON })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation).toHaveLength(1)
    expect(r.unresolved_item_presentation[0].presentation_role).toBe('scoped_context')
  })

  test('B: null reason -> primary', () => {
    const sec = section({ category: COPYRIGHT, unresolved_items: [applicability({ unresolved_reason: null })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].presentation_role).toBe('primary')
  })

  test('C: ambiguous BI aggregation (fact === null, the fail-closed shape) -> primary', () => {
    // A withheld_relevant_claim with fact: null is exactly BI's own fail-closed
    // ambiguous-aggregation representation (CC-4C.2D) -- unresolved_reason is
    // therefore also null on this shape, by the same upstream discipline.
    const sec = section({ category: COPYRIGHT, unresolved_items: [withheld({ fact: null, unresolved_reason: null })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].presentation_role).toBe('primary')
  })

  test('D: normal unresolved item with no special reason -> primary', () => {
    const sec = section({ category: COMMERCIAL, unresolved_items: [applicability({ claim_id: 'ORDINARY', fact: 'tool_account_status', tool: 'kling', unresolved_reason: null })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].presentation_role).toBe('primary')
  })

  test('E: open_project_dependency -> primary (no unresolved_reason field exists on this kind at all)', () => {
    const sec = section({ category: COMMERCIAL, unresolved_items: [openDependency()] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation).toHaveLength(1)
    expect(r.unresolved_item_presentation[0].item.kind).toBe('open_project_dependency')
    expect(r.unresolved_item_presentation[0].presentation_role).toBe('primary')
  })

  test('guard: the authorized mapping is allowlisted, not `reason !== null` -- exhaustive over the CURRENT single-literal union, proven by the fact that adding a member to ApplicabilityUnresolvedReason without updating AUTHORIZED_SCOPED_CONTEXT_REASONS is a compile error (this test documents the intent; the compile-time guarantee itself is enforced by the Record<ApplicabilityUnresolvedReason, boolean> type at the production call site, not re-derivable here without duplicating the type)', () => {
    // Directly re-assert scenario A and B together, proving the mapping is a
    // real lookup (produces different roles for different inputs), not a
    // constant -- the simplest behavioral proof that it isn't hard-coded to
    // always return one value.
    const secReason = section({ category: COPYRIGHT, goal_text: 'g1', unresolved_items: [applicability({ claim_id: 'A', unresolved_reason: REASON })] })
    const secNull = section({ category: COPYRIGHT, goal_text: 'g2', unresolved_items: [applicability({ claim_id: 'B', unresolved_reason: null })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [secReason, secNull] }), projectionOutput())
    expect(r.unresolved_item_presentation.find((p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === 'A')?.presentation_role).toBe('scoped_context')
    expect(r.unresolved_item_presentation.find((p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === 'B')?.presentation_role).toBe('primary')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// PART 13 -- unknown/malformed runtime value (adversarial, bypasses the type system)
// ─────────────────────────────────────────────────────────────────────────

describe('SCOPE-5 -- unknown/malformed runtime reason fails closed (Part 13)', () => {
  test('a reason string not present in the production union (forced via an adversarial cast, never widening the production type) -> primary', () => {
    const bogusReason = 'not_a_real_reason_literal' as unknown as ApplicabilityUnresolvedReason
    const sec = section({ category: COPYRIGHT, unresolved_items: [applicability({ unresolved_reason: bogusReason })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].presentation_role).toBe('primary')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// PART 14 -- evidence coherence
// ─────────────────────────────────────────────────────────────────────────

describe('SCOPE-5 -- missing-evidence presentation-role coherence (Part 14)', () => {
  test('A: exact correlation to a scoped_context unresolved item -> evidence role scoped_context', () => {
    const item = applicability({ claim_id: 'C-1', fact: 'jurisdiction', unresolved_reason: REASON })
    const evidence = missingEvidenceRef({ source_claim_id: 'C-1', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [item], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_presentation).toHaveLength(1)
    expect(r.missing_evidence_presentation[0].presentation_role).toBe('scoped_context')
    expect(r.missing_evidence_presentation[0].item).toEqual(evidence)
  })

  test('B: exact correlation to a primary unresolved item -> evidence role primary', () => {
    const item = applicability({ claim_id: 'C-2', fact: 'jurisdiction', unresolved_reason: null })
    const evidence = missingEvidenceRef({ source_claim_id: 'C-2', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [item], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_presentation[0].presentation_role).toBe('primary')
  })

  test('B2: exact correlation, open_project_dependency origin -> evidence role primary (dependency kind never carries a reason)', () => {
    const item = openDependency({ source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed' })
    const evidence = missingEvidenceRef({ source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed', applicability_fact: null, classification: 'requires_documentary_evidence' })
    const sec = section({ category: COMMERCIAL, unresolved_items: [item], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_presentation[0].presentation_role).toBe('primary')
  })

  test('C: no exact correlation (evidence references a claim_id with no matching unresolved item at all) -> primary', () => {
    const evidence = missingEvidenceRef({ source_claim_id: 'ORPHAN', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_presentation[0].presentation_role).toBe('primary')
  })

  test('D: ambiguous correlation (two unresolved items share the exact same source_claim_id + applicability_fact identity) -> primary', () => {
    // Synthetic multiplicity -- not currently reachable through the real
    // pipeline (SCOPE-3A's own finding: zero production claim shares an
    // (claim_id, fact) pair with another item today), but the fail-closed
    // contract must still hold if it ever becomes reachable.
    const itemA = applicability({ claim_id: 'DUP', fact: 'jurisdiction', unresolved_reason: REASON })
    const itemB = applicability({ claim_id: 'DUP', fact: 'jurisdiction', unresolved_reason: REASON, tool: 'irrelevant-distinguisher-that-plan-would-never-actually-produce' })
    const evidence = missingEvidenceRef({ source_claim_id: 'DUP', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [itemA, itemB], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_presentation[0].presentation_role).toBe('primary')
  })

  test('E: conflicting originating roles across the only two exact candidates -> primary. Uses two SAME-KIND (unresolved_applicability) items sharing claim_id+fact with DIFFERING unresolved_reason -- CC-4C.2F never collapses same-kind duplicates (its predicate only ever removes a withheld_relevant_claim, never a same-kind pair, "regardless of how many fields they share"), so both genuinely survive into Realization and both remain exact candidates for the same evidence ref, one scoped_context and one primary', () => {
    const itemScoped = applicability({ claim_id: 'CONFLICT', fact: 'jurisdiction', unresolved_reason: REASON })
    const itemPrimary = applicability({ claim_id: 'CONFLICT', fact: 'jurisdiction', unresolved_reason: null })
    const evidence = missingEvidenceRef({ source_claim_id: 'CONFLICT', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [itemScoped, itemPrimary], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    // Sanity: both same-kind items genuinely survived 2F's collapse (proves this
    // is testing real multiplicity, not an artifact of collapse removing one).
    expect(r.unresolved_groups[0].items).toHaveLength(2)
    expect(r.missing_evidence_presentation[0].presentation_role).toBe('primary')
  })

  test('F: evidence item remains present regardless of role (never dropped)', () => {
    const evidence = missingEvidenceRef({ source_claim_id: 'ORPHAN', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_groups[0].items).toEqual([evidence])
    expect(r.missing_evidence_presentation).toHaveLength(1)
  })

  test('G: evidence classification is never altered by presentation-role derivation', () => {
    const item = applicability({ claim_id: 'C-3', fact: 'jurisdiction', unresolved_reason: REASON })
    const evidence = missingEvidenceRef({ source_claim_id: 'C-3', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, unresolved_items: [item], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_presentation[0].item.classification).toBe('applicability_unresolved')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// PART 15 -- semantic preservation
// ─────────────────────────────────────────────────────────────────────────

describe('SCOPE-5 -- full semantic preservation, additive-only (Part 15)', () => {
  test('unresolved_groups content is byte-identical to pre-SCOPE-5 shape (claim_id/fact/tool/unresolved_reason/kind all preserved)', () => {
    const item = applicability({ claim_id: 'PRESERVE', fact: 'jurisdiction', tool: null, unresolved_reason: REASON })
    const sec = section({ category: COPYRIGHT, unresolved_items: [item] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_groups[0].items).toEqual([item])
  })

  test('missing_evidence_groups content is byte-identical to pre-SCOPE-5 shape (source_claim_id/dependency_id/applicability_fact/classification all preserved)', () => {
    const evidence = missingEvidenceRef({ source_claim_id: 'PRESERVE', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })
    const sec = section({ category: COPYRIGHT, missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.missing_evidence_groups[0].items).toEqual([evidence])
  })

  test('goal_index and category preserved on the new presentation arrays', () => {
    const sec = section({ category: COPYRIGHT, unresolved_items: [applicability({ unresolved_reason: REASON })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].goal_index).toBe(0)
    expect(r.unresolved_item_presentation[0].category).toBe(COPYRIGHT)
  })

  test('goal_answers disposition is completely unaffected by presentation role (no BI-disposition change)', () => {
    const sec = section({ category: COPYRIGHT, disposition: 'governed_guidance_available_with_open_items', unresolved_items: [applicability({ unresolved_reason: REASON })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.goal_answers[0].disposition).toBe('governed_guidance_available_with_open_items')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// PART 16 -- multi-goal / multi-claim
// ─────────────────────────────────────────────────────────────────────────

describe('SCOPE-5 -- multi-goal / multi-claim, goal-local only (Part 16)', () => {
  test('two explicit goals with different role mixes remain independently correct', () => {
    const secScoped = section({ category: COPYRIGHT, goal_text: 'goal 1', unresolved_items: [applicability({ claim_id: 'G1-A', unresolved_reason: REASON })] })
    const secPrimary = section({ category: COMMERCIAL, goal_text: 'goal 2', unresolved_items: [applicability({ claim_id: 'G2-A', fact: 'tool_account_status', tool: 'kling', unresolved_reason: null })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [secScoped, secPrimary] }), projectionOutput())
    const g1 = r.unresolved_item_presentation.find((p) => p.goal_index === 0)
    const g2 = r.unresolved_item_presentation.find((p) => p.goal_index === 1)
    expect(g1?.presentation_role).toBe('scoped_context')
    expect(g2?.presentation_role).toBe('primary')
  })

  test('multiple claims sharing value_not_among_established_values all correctly receive scoped_context, independently', () => {
    const sec = section({
      category: COPYRIGHT,
      unresolved_items: [
        applicability({ claim_id: 'M-1', unresolved_reason: REASON }),
        applicability({ claim_id: 'M-2', unresolved_reason: REASON }),
        applicability({ claim_id: 'M-3', unresolved_reason: REASON }),
      ],
    })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation).toHaveLength(3)
    expect(r.unresolved_item_presentation.every((p) => p.presentation_role === 'scoped_context')).toBe(true)
  })

  test('a reason-null item alongside a scoped-context item in the SAME goal keeps each its own role', () => {
    const sec = section({
      category: COPYRIGHT,
      unresolved_items: [applicability({ claim_id: 'MIXED-A', unresolved_reason: REASON }), applicability({ claim_id: 'MIXED-B', unresolved_reason: null })],
    })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation.find((p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === 'MIXED-A')?.presentation_role).toBe('scoped_context')
    expect(r.unresolved_item_presentation.find((p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === 'MIXED-B')?.presentation_role).toBe('primary')
  })

  test('no cross-goal correlation: an evidence ref in goal 2 never correlates to an unresolved item in goal 1, even with an identical claim_id', () => {
    const secA = section({ category: COPYRIGHT, goal_text: 'g1', unresolved_items: [applicability({ claim_id: 'SHARED-ID', fact: 'jurisdiction', unresolved_reason: REASON })] })
    const secB = section({
      category: COMMERCIAL,
      goal_text: 'g2',
      missing_evidence: [missingEvidenceRef({ source_claim_id: 'SHARED-ID', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })],
    })
    const r = buildConsultativeRealization(plan({ explicit_sections: [secA, secB] }), projectionOutput())
    const evidenceInGoal2 = r.missing_evidence_presentation.find((p) => p.goal_index === 1)
    expect(evidenceInGoal2?.presentation_role).toBe('primary') // no unresolved item in goal 2 to correlate against
  })

  test('no cross-goal evidence inheritance: goal 1 evidence role is independent of goal 2 content', () => {
    const secA = section({
      category: COPYRIGHT,
      goal_text: 'g1',
      unresolved_items: [applicability({ claim_id: 'A-1', fact: 'jurisdiction', unresolved_reason: REASON })],
      missing_evidence: [missingEvidenceRef({ source_claim_id: 'A-1', applicability_fact: 'jurisdiction', classification: 'applicability_unresolved' })],
    })
    const secB = section({ category: COMMERCIAL, goal_text: 'g2', unresolved_items: [applicability({ claim_id: 'A-1', fact: 'jurisdiction', unresolved_reason: null })] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [secA, secB] }), projectionOutput())
    const evidenceInGoal1 = r.missing_evidence_presentation.find((p) => p.goal_index === 0)
    expect(evidenceInGoal1?.presentation_role).toBe('scoped_context') // correctly inherited from goal 1's own item, unaffected by goal 2's identically-named but distinct claim
  })
})
