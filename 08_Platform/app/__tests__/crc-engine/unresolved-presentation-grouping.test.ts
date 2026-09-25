/**
 * CRC-CC-SCOPE-6D.1 (2026-09-25) -- Dimension-First Grouping Implementation.
 * Focused coverage for the new, additive `unresolved_presentation_groups`
 * field on `ConsultativeRealization`, its `UnresolvedDimensionIdentity`
 * grouping key, governed heading resolution, and the results-email
 * renderer's consumption of it.
 *
 * Two groups, mirroring this whole workstream's established convention:
 *   - GROUP 1 (Plan/Realization level, literal builders): dimension
 *     identity computation, heading authority, fail-closed matrix,
 *     adversarial tool-scoping, multi-goal locality, cardinality
 *     invariants, evidence correlation (including the ambiguous case),
 *     CC-4C.2F interaction, presentation-role orthogonality, Track C.
 *   - GROUP 2 (real end-to-end, runCRCConversation + real, unmodified
 *     TOPIC_CLAIMS_FIXTURE entries): the original UAT-D1 three-claim
 *     dependency case and the jurisdiction case, both through the real
 *     evaluator/BI/Plan/Realization/renderer pipeline.
 */

import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import type { ConsultativeUnresolvedPresentationGroup } from '@/lib/crc-engine/consultative-realization-contract'
import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import type { ConsultativeAnswerPlan, PlanGoalSection, PlanUnresolvedItem, PlanMissingEvidenceRef } from '@/lib/crc-engine/consultative-answer-plan'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory, StructuredUnderstanding } from '@/types/interview-engine'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

// ── builders (mirrors the whole workstream's own convention) ─────────────

const COPYRIGHTABILITY: GoalCategory = 'copyrightability'
const TRADEMARK: GoalCategory = 'trademark'
const COMMERCIAL: GoalCategory = 'commercial_use'
const HCD = 'human_contribution_description'

function section(overrides: Partial<PlanGoalSection> & Pick<PlanGoalSection, 'category'>): PlanGoalSection {
  return {
    goal_text: `goal for ${overrides.category}`,
    bi_status: 'directly_relevant',
    disposition: 'governed_guidance_available_with_open_items',
    supported_claim_refs: [],
    summary_claim_refs: [],
    unresolved_items: [],
    missing_evidence: [],
    boundary_ref: 'case_3b_unresolved',
    bi_summary_blocks: [`summary for ${overrides.category}`],
    ...overrides,
  }
}
function plan(overrides: Partial<ConsultativeAnswerPlan> = {}): ConsultativeAnswerPlan {
  return { explicit_sections: [], discovered_context: [], render_once_markers: [], commercial_assurance_refs: [], ...overrides }
}
function projectionOutput(overrides: Partial<ProjectionOutput> = {}): ProjectionOutput {
  return { opening_line: "Here's what I understood about your workflow.", understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '', ...overrides }
}
function openDependency(source_claim_id: string, dependency_id: string): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id, dependency_id }
}
function applicability(claim_id: string, fact: 'jurisdiction' | 'tool_account_status' | 'tool_plan_tier', tool: string | null): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id, fact, tool, unresolved_reason: null }
}
function withheld(claim_id: string, fact: 'jurisdiction' | 'tool_account_status' | 'tool_plan_tier' | null, tool: string | null): PlanUnresolvedItem {
  return { kind: 'withheld_relevant_claim', claim_id, fact, tool, unresolved_reason: null }
}
function evidenceForApplicability(claim_id: string, fact: string): PlanMissingEvidenceRef {
  return { source_claim_id: claim_id, dependency_id: null, applicability_fact: fact as any, classification: 'applicability_unresolved' }
}
function evidenceForDependency(source_claim_id: string, dependency_id: string): PlanMissingEvidenceRef {
  return { source_claim_id, dependency_id, applicability_fact: null, classification: 'answerable_in_conversation' }
}

function groupFor(realization: ReturnType<typeof buildConsultativeRealization>, goalIndex: number): ConsultativeUnresolvedPresentationGroup[] {
  return realization.unresolved_presentation_groups.filter((g) => g.goal_index === goalIndex)
}

// ── GROUP 1: dimension identity + heading authority ───────────────────────

describe('SCOPE-6D.1 -- dimension identity and heading resolution', () => {
  test('registered dependency dimension -> one group, governed heading', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].heading).toBe('human contribution to the finished work')
    expect(r.unresolved_presentation_groups[0].dimension_identity).toEqual({ kind: 'dependency', dependency_id: HCD })
  })

  test('registered applicability dimension (jurisdiction) -> one group, governed heading', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [applicability('C1', 'jurisdiction', null)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups[0].heading).toBe('assessment jurisdiction')
    expect(r.unresolved_presentation_groups[0].dimension_identity).toEqual({ kind: 'applicability_fact', fact: 'jurisdiction', tool: null })
  })

  test('registered applicability dimension (tool_account_status) -> governed heading', () => {
    const sec = section({ category: COMMERCIAL, unresolved_items: [applicability('C1', 'tool_account_status', 'kling')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups[0].heading).toBe('account or membership status')
  })

  test('unregistered applicability dimension (tool_plan_tier) -> group exists, heading null, no invented heading', () => {
    const sec = section({ category: COMMERCIAL, unresolved_items: [applicability('C1', 'tool_plan_tier', 'kling')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].heading).toBeNull()
  })

  test('unregistered/unknown dependency -> group exists, heading null', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', 'some_future_unregistered_dependency')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups[0].heading).toBeNull()
  })

  test('withheld_relevant_claim with fact === null -> ungrouped singleton, heading always null', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [withheld('C1', null, null)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].heading).toBeNull()
    expect(r.unresolved_presentation_groups[0].dimension_identity.kind).toBe('ungrouped')
  })

  test('withheld_relevant_claim with a real fact groups WITH a sibling unresolved_applicability sharing fact+tool', () => {
    const sec = section({ category: COMMERCIAL, unresolved_items: [withheld('C1', 'tool_account_status', 'kling'), applicability('C2', 'tool_account_status', 'kling')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].items).toHaveLength(2)
  })

  test('never renders raw internal identity: dimension_identity is a structured object, not directly interpolatable as a plain string', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const identity = r.unresolved_presentation_groups[0].dimension_identity
    expect(typeof identity).toBe('object')
    expect(typeof (identity as any).kind).toBe('string')
  })
})

// ── GROUP 1: tool-scoped adversarial case (mandatory) ─────────────────────

describe('SCOPE-6D.1 -- same fact, different tool: mandatory adversarial case', () => {
  test('two tool_account_status items with different tools form TWO separate groups, both with the SAME visible heading', () => {
    const sec = section({ category: COMMERCIAL, unresolved_items: [applicability('C1', 'tool_account_status', 'kling'), applicability('C2', 'tool_account_status', 'runway')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(2)
    expect(r.unresolved_presentation_groups[0].dimension_identity).not.toEqual(r.unresolved_presentation_groups[1].dimension_identity)
    expect(r.unresolved_presentation_groups[0].heading).toBe('account or membership status')
    expect(r.unresolved_presentation_groups[1].heading).toBe('account or membership status')
    // proves grouping is based on internal identity, not rendered text
    expect(r.unresolved_presentation_groups[0].items).toHaveLength(1)
    expect(r.unresolved_presentation_groups[1].items).toHaveLength(1)
  })
})

// ── GROUP 1: strict goal locality ──────────────────────────────────────────

describe('SCOPE-6D.1 -- strict goal locality', () => {
  test('same dependency across two explicit goals never pools into one group', () => {
    const sec1 = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD)] })
    const sec2 = section({ category: TRADEMARK, unresolved_items: [openDependency('C2', HCD)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec1, sec2] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(2)
    expect(r.unresolved_presentation_groups[0].goal_index).toBe(0)
    expect(r.unresolved_presentation_groups[1].goal_index).toBe(1)
    expect(r.unresolved_presentation_groups[0].heading).toBe(r.unresolved_presentation_groups[1].heading) // same heading text
    expect(r.unresolved_presentation_groups[0]).not.toBe(r.unresolved_presentation_groups[1]) // never the same group
  })

  test('same applicability fact across two explicit goals never pools into one group', () => {
    const sec1 = section({ category: COPYRIGHTABILITY, unresolved_items: [applicability('C1', 'jurisdiction', null)] })
    const sec2 = section({ category: TRADEMARK, unresolved_items: [applicability('C2', 'jurisdiction', null)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec1, sec2] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(2)
    expect(new Set(r.unresolved_presentation_groups.map((g) => g.goal_index)).size).toBe(2)
  })
})

// ── GROUP 1: same identity, different role -> one group ───────────────────

describe('SCOPE-6D.1 -- same identity, different presentation role', () => {
  test('two items with the same fact+tool but different unresolved_reason (=> different roles) form ONE group; roles remain on individual children', () => {
    const item1: PlanUnresolvedItem = { kind: 'unresolved_applicability', claim_id: 'C1', fact: 'jurisdiction', tool: null, unresolved_reason: 'value_not_among_established_values' }
    const item2: PlanUnresolvedItem = { kind: 'unresolved_applicability', claim_id: 'C2', fact: 'jurisdiction', tool: null, unresolved_reason: null }
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [item1, item2] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    const roles = r.unresolved_presentation_groups[0].items.map((c) => c.presentation_role)
    expect(roles.sort()).toEqual(['primary', 'scoped_context'])
  })
})

// ── GROUP 1: same identity, different claim -> one group, N children (UAT-D1 shape) ──

describe('SCOPE-6D.1 -- same dimension identity, distinct claims: grouping, not collapse', () => {
  test('three distinct source_claim_id values sharing one dependency -> ONE group, THREE children, each traceable to its own claim', () => {
    const items = [openDependency('CLAIM-A', HCD), openDependency('CLAIM-B', HCD), openDependency('CLAIM-C', HCD)]
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: items })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    const group = r.unresolved_presentation_groups[0]
    expect(group.items).toHaveLength(3)
    const claimIds = group.items.map((c) => (c.item as any).source_claim_id)
    expect(new Set(claimIds).size).toBe(3)
  })
})

// ── GROUP 1: cardinality invariants ────────────────────────────────────────

describe('SCOPE-6D.1 -- structural cardinality invariants', () => {
  test('total children across all groups for a goal equals total unresolved_item_presentation entries for that goal; every item occurs exactly once', () => {
    const items = [openDependency('C1', HCD), openDependency('C2', HCD), applicability('C3', 'jurisdiction', null), withheld('C4', null, null)]
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: items })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const flatCount = r.unresolved_item_presentation.length
    const groupedCount = r.unresolved_presentation_groups.reduce((sum, g) => sum + g.items.length, 0)
    expect(groupedCount).toBe(flatCount)
    expect(flatCount).toBe(4)
    // every flat presentation item appears in exactly one group's items array (by reference)
    for (const flatItem of r.unresolved_item_presentation) {
      const containingGroups = r.unresolved_presentation_groups.filter((g) => g.items.includes(flatItem))
      expect(containingGroups).toHaveLength(1)
    }
  })

  test('no item disappears, no item duplicates, when several dimensions coexist in one goal', () => {
    const items = [openDependency('C1', HCD), applicability('C2', 'tool_account_status', 'kling'), applicability('C3', 'tool_account_status', 'runway'), applicability('C4', 'tool_plan_tier', 'kling')]
    const sec = section({ category: COMMERCIAL, unresolved_items: items })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(4) // 4 distinct dimension identities
    expect(r.unresolved_presentation_groups.reduce((s, g) => s + g.items.length, 0)).toBe(4)
  })
})

// ── GROUP 1: missing-evidence correlation (item-first, not dimension-first) ──

describe('SCOPE-6D.1 -- missing-evidence correlation reuses the exact-one-item rule, never dimension-level', () => {
  test('correlated evidence is placed into its item\'s own group', () => {
    const item = openDependency('C1', HCD)
    const evidence = evidenceForDependency('C1', HCD)
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [item], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups[0].missing_evidence_items).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].missing_evidence_items[0].item).toBe(evidence)
  })

  test('three distinct claims, three correlated evidence refs, all placed into the ONE shared dependency group', () => {
    const items = [openDependency('C1', HCD), openDependency('C2', HCD), openDependency('C3', HCD)]
    const evidence = [evidenceForDependency('C1', HCD), evidenceForDependency('C2', HCD), evidenceForDependency('C3', HCD)]
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: items, missing_evidence: evidence })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].missing_evidence_items).toHaveLength(3)
  })

  test('ambiguous correlation (existing fail-closed rule): evidence ref not attached to ANY group, never guessed by matching dependency_id alone', () => {
    // two claims share source_claim_id + dependency_id would be needed for a real
    // ambiguity; here we exercise the "zero candidates" fail-closed branch instead,
    // which is the reachable adversarial shape for open_project_dependency evidence:
    // a ref whose source_claim_id does not match any present item.
    const item = openDependency('C1', HCD)
    const orphanEvidence = evidenceForDependency('NOT-PRESENT', HCD)
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [item], missing_evidence: [orphanEvidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups[0].missing_evidence_items).toHaveLength(0)
    // the evidence ref itself is NOT dropped from the Realization as a whole --
    // it remains in the flat, unchanged missing_evidence_presentation array.
    expect(r.missing_evidence_presentation).toHaveLength(1)
    expect(r.missing_evidence_presentation[0].item).toBe(orphanEvidence)
  })

  test('evidence classification is never reclassified by grouping', () => {
    const item = openDependency('C1', HCD)
    const evidence = evidenceForDependency('C1', HCD)
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [item], missing_evidence: [evidence] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups[0].missing_evidence_items[0].item.classification).toBe('answerable_in_conversation')
  })
})

// ── GROUP 1: presentation-role orthogonality ───────────────────────────────

describe('SCOPE-6D.1 -- presentation role never affects grouping', () => {
  test('role does not create, split, or suppress groups; each child keeps its own already-computed role', () => {
    const item1: PlanUnresolvedItem = { kind: 'unresolved_applicability', claim_id: 'C1', fact: 'jurisdiction', tool: null, unresolved_reason: 'value_not_among_established_values' }
    const item2: PlanUnresolvedItem = { kind: 'unresolved_applicability', claim_id: 'C2', fact: 'jurisdiction', tool: null, unresolved_reason: 'value_not_among_established_values' }
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [item1, item2] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].items.every((c) => c.presentation_role === 'scoped_context')).toBe(true)
  })
})

// ── GROUP 1: Track C ────────────────────────────────────────────────────

describe('SCOPE-6D.1 -- Track C / discovered_context unaffected', () => {
  test('discovered_context is never grouped, never touched, remains a verbatim passthrough', () => {
    const discovered = [{ claim_ref: { claim_id: 'D1', matrix_identifier: 'm', match_origin: 'discovered_topic' as const, matched_goal_category: 'trademark' as const, relationship_id: null, last_verified: null }, authorizing_goal_category: 'trademark' as const }]
    const r = buildConsultativeRealization(plan({ discovered_context: discovered }), projectionOutput())
    expect(r.discovered_context).toBe(discovered)
    expect(r.unresolved_presentation_groups).toHaveLength(0)
  })
})

// ── GROUP 1: CC-4C.2F interaction ──────────────────────────────────────────

describe('SCOPE-6D.1 -- CC-4C.2F collapse remains untouched; grouping operates on already-collapsed items only', () => {
  test('a 2F-eligible withheld/unresolved_applicability pair is collapsed to ONE item BEFORE grouping -- the group has exactly one child', () => {
    const withheldItem = withheld('SAME-CLAIM', 'tool_account_status', 'kling')
    const applicabilityItem = applicability('SAME-CLAIM', 'tool_account_status', 'kling')
    const sec = section({ category: COMMERCIAL, unresolved_items: [withheldItem, applicabilityItem] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_groups[0].items).toHaveLength(1) // 2F already collapsed this
    expect(r.unresolved_presentation_groups).toHaveLength(1)
    expect(r.unresolved_presentation_groups[0].items).toHaveLength(1) // grouping never re-introduces the collapsed item
  })
})

// ── GROUP 1: rendered "Still Open" output for the representative UAT-D1 mock ──

describe('SCOPE-6D.1 -- rendered output matches the accepted mock structure', () => {
  test('original UAT-D1 triple: one heading, three identical children, no count/relational prose', () => {
    const items = [openDependency('CLAIM-A', HCD), openDependency('CLAIM-B', HCD), openDependency('CLAIM-C', HCD)]
    const evidence = items.map((i) => evidenceForDependency((i as any).source_claim_id, HCD))
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: items, missing_evidence: evidence })
    const fullPlan = plan({ explicit_sections: [sec] })
    const realization = buildConsultativeRealization(fullPlan, projectionOutput())
    const email = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', fullPlan, [], realization)
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    expect(stillOpen).toContain('human contribution to the finished work')
    const headingCount = (stillOpen.match(/human contribution to the finished work/g) || []).length
    // heading (1) + three identical child sentences (each also containing the label) = 4 occurrences of the label substring total
    expect(headingCount).toBe(4)
    const childSentences = stillOpen.match(/^- .*$/gm) || []
    expect(childSentences).toHaveLength(3)
    expect(new Set(childSentences).size).toBe(1) // still textually identical -- expected, not a defect
    expect(stillOpen).not.toMatch(/\b3 (items|claims|considerations)\b/i)
    expect(stillOpen).not.toMatch(/several|multiple claims|the main|material issue|these considerations/i)
  })
})

// ── GROUP 2: real end-to-end, real evaluator, all consumers ───────────────

function baseSU(jurisdictionValue: string): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'commercial' }, source_turn: 1, source_statement: 'A commercial campaign.' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [{ goal_id: 'g-copy', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'copyrightability', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'Can I use this commercially?' }],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [{ mention_id: 'aj-1', value: jurisdictionValue, confidence: 'confirmed', source_turn: 1, source_statement: `This is a ${jurisdictionValue} assessment.`, superseded_by: null }],
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 4,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
  }
}

const ALL_FOUR_CLAIMS = TOPIC_CLAIMS_FIXTURE.filter((c) => ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'].includes(c.claim_id))

describe('SCOPE-6D.1 -- real end-to-end reproduction (original UAT-D1 dependency case)', () => {
  test('United States established -> the three US claims match, contributing ONE shared dependency group with three children and the governed heading', () => {
    const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
    const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
    const groups = realization.unresolved_presentation_groups.filter((g) => g.dimension_identity.kind === 'dependency')
    expect(groups).toHaveLength(1)
    expect(groups[0].heading).toBe('human contribution to the finished work')
    expect(groups[0].items).toHaveLength(3)
    const claimIds = groups[0].items.map((c) => (c.item as any).source_claim_id)
    expect(new Set(claimIds).size).toBe(3)

    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    const childLines = stillOpen.match(/^- Your human contribution to the finished work hasn't been confirmed in this conversation\.$/gm) || []
    expect(childLines).toHaveLength(3)
  })
})

describe('SCOPE-6D.1 -- real end-to-end reproduction (jurisdiction case)', () => {
  test('Taiwan established -> three US claims share ONE jurisdiction group with the governed heading; no required/established value leaks', () => {
    const result = runCRCConversation(baseSU('Taiwan'), [], ALL_FOUR_CLAIMS, [])
    const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
    const jurisdictionGroups = realization.unresolved_presentation_groups.filter((g) => g.dimension_identity.kind === 'applicability_fact')
    expect(jurisdictionGroups).toHaveLength(1)
    expect(jurisdictionGroups[0].heading).toBe('assessment jurisdiction')
    expect(jurisdictionGroups[0].items).toHaveLength(3)

    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    expect(stillOpen).not.toContain('Taiwan')
    expect(stillOpen).not.toContain('United States')
    expect(stillOpen).not.toContain('value_not_among_established_values')
  })
})

describe('SCOPE-6D.1 -- fourth-consumer (Taiwan) control: the dependency group forms identically through the Taiwan claim\'s own path', () => {
  test('Taiwan established -> the Taiwan claim alone matches and contributes the SAME governed dependency heading through its own group', () => {
    const result = runCRCConversation(baseSU('Taiwan'), [], ALL_FOUR_CLAIMS, [])
    const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
    const dependencyGroups = realization.unresolved_presentation_groups.filter((g) => g.dimension_identity.kind === 'dependency')
    expect(dependencyGroups).toHaveLength(1)
    expect(dependencyGroups[0].heading).toBe('human contribution to the finished work')
    expect(dependencyGroups[0].items).toHaveLength(1) // only the Taiwan claim matched
  })
})

describe('SCOPE-6D.1 -- multi-goal adversarial (real claims): Copyright and Trademark never pool even when both use the same dependency', () => {
  test('a Trademark goal reusing human_contribution_description forms its OWN separate group from the Copyright goal\'s group', () => {
    const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
    const trademarkSection = section({ category: TRADEMARK, unresolved_items: [openDependency('CLAIM-TM-EXTRA', HCD)] })
    const combinedPlan: ConsultativeAnswerPlan = { ...result.plan, explicit_sections: [...result.plan.explicit_sections, trademarkSection] }
    const realization = buildConsultativeRealization(combinedPlan, result.output, result.consultative_notes ?? [])
    const dependencyGroups = realization.unresolved_presentation_groups.filter((g) => g.dimension_identity.kind === 'dependency')
    expect(dependencyGroups).toHaveLength(2) // one per goal, never merged
    expect(new Set(dependencyGroups.map((g) => g.goal_index)).size).toBe(2)
    expect(dependencyGroups.every((g) => g.heading === 'human contribution to the finished work')).toBe(true)
  })
})

// ── GROUP 2: dumb-renderer / no-leakage checks against real governed data ──

describe('SCOPE-6D.1 -- leakage and dumb-renderer checks against real governed data', () => {
  const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
  const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
  const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)

  test('no dependency ID, claim ID, or "creative" leaks through the new grouped rendering path', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    expect(stillOpen).not.toContain('human_contribution_description')
    expect(stillOpen.toLowerCase()).not.toContain('creative')
    for (const c of ALL_FOUR_CLAIMS) expect(stillOpen).not.toContain(c.claim_id)
  })

  test('no real candidate-statement fragment leaks into the grouped Still Open section', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    for (const c of ALL_FOUR_CLAIMS) {
      expect(c.crc_candidate_statement).not.toBeNull()
      const words = c.crc_candidate_statement!.split(/\s+/)
      for (let i = 0; i + 8 <= words.length; i += 4) {
        expect(stillOpen).not.toContain(words.slice(i, i + 8).join(' '))
      }
    }
  })
})
