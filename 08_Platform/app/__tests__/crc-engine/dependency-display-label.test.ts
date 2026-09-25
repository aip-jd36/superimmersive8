/**
 * CRC-CC-SCOPE-6F (2026-09-25) -- Governed Dependency Display Label
 * Activation. Focused coverage for the newly-registered
 * `human_contribution_description -> 'human contribution to the finished
 * work'` entry in dependency-fact-display.ts, and its propagation through
 * ConsultativeRealization's new additive `display_label` field into the
 * results-email renderer.
 *
 * Two groups, mirroring jurisdiction-display-label.test.ts's own SCOPE-6B
 * convention exactly:
 *   - GROUP 1 (Plan/Realization level, literal builders): the original
 *     UAT-D1 triple reproduction, fail-closed adversarial cases, presentation-
 *     role orthogonality, no-grouping/no-claim-ID proofs.
 *   - GROUP 2 (real end-to-end, runCRCConversation + real, unmodified
 *     TOPIC_CLAIMS_FIXTURE entries, INCLUDING the Taiwan consumer SCOPE-6E
 *     discovered): the real evaluator, real BI, real Plan, real Realization,
 *     proving the label is claim/jurisdiction-independent across all four
 *     real current consumers, not just the three familiar US claims.
 */

import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import type { ConsultativeAnswerPlan, PlanGoalSection, PlanUnresolvedItem, PlanMissingEvidenceRef } from '@/lib/crc-engine/consultative-answer-plan'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory, StructuredUnderstanding } from '@/types/interview-engine'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'
import { getAskabilityEntry, isDependencyAskableInCrc } from '@/lib/crc-engine/dependency-askability'
import { HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION } from '@/lib/crc-engine/human-contribution-clarification'
import { getApplicabilityFactLabel } from '@/lib/crc-engine/applicability-fact-display'

// ── GROUP 1 builders (mirrors jurisdiction-display-label.test.ts) ────────

const COPYRIGHTABILITY: GoalCategory = 'copyrightability'
const TRADEMARK: GoalCategory = 'trademark'
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
  // opening_line non-empty by default so buildResultsEmailContent's own
  // `isFullyEmpty` short-circuit (which renders a fixed "interview is
  // complete" message and skips `realization` entirely) is never
  // accidentally triggered by these literal-builder fixtures.
  return { opening_line: "Here's what I understood about your workflow.", understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '', ...overrides }
}
function openDependency(source_claim_id: string, dependency_id: string): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id, dependency_id }
}
function applicabilityItem(claim_id: string): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id, fact: 'jurisdiction', tool: null, unresolved_reason: null }
}

// ── GROUP 1: original UAT-D1 triple reproduction (Part 14) ───────────────

describe('SCOPE-6F -- original UAT-D1 dependency triple, before/after', () => {
  const items: PlanUnresolvedItem[] = [
    openDependency('CLAIM-COPY-001', HCD),
    openDependency('CLAIM-COPY-002', HCD),
    openDependency('CLAIM-COPY-003', HCD),
  ]
  const evidence: PlanMissingEvidenceRef[] = items.map((i) => ({ source_claim_id: (i as any).source_claim_id, dependency_id: HCD, applicability_fact: null, classification: 'answerable_in_conversation' }))
  const sec = section({ category: COPYRIGHTABILITY, unresolved_items: items, missing_evidence: evidence })
  const fullPlan = plan({ explicit_sections: [sec] })
  const realization = buildConsultativeRealization(fullPlan, projectionOutput())
  const email = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', fullPlan, [], realization)

  test('three underlying claims survive as three distinct unresolved items -- no dedup', () => {
    expect(realization.unresolved_groups[0].items).toHaveLength(3)
    expect(new Set(realization.unresolved_groups[0].items.map((i) => (i as any).source_claim_id)).size).toBe(3)
  })

  test('all three presentation entries resolve the SAME governed display_label', () => {
    const labels = realization.unresolved_item_presentation.map((p) => p.display_label)
    expect(labels).toEqual(['human contribution to the finished work', 'human contribution to the finished work', 'human contribution to the finished work'])
  })

  test('AFTER: three instances of the new governed sentence in "Still open"; no invented count/summary line replaces them there', () => {
    const matches = email.text.match(/Your human contribution to the finished work hasn't been confirmed in this conversation\./g) || []
    expect(matches).toHaveLength(3)
    // Scoped to "Still open" only -- "What's still needed"'s own pre-existing,
    // unchanged, unrelated classification-count line ("3 items can be
    // confirmed in a follow-up conversation.") legitimately still mentions a
    // count; this milestone does not touch that section at all.
    const stillOpenOnly = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    expect(stillOpenOnly).not.toMatch(/\b3 (items|claims|considerations)\b/i)
  })

  test('the old generic fallback string no longer appears for this dependency', () => {
    expect(email.text).not.toContain("An additional governed consideration for this topic hasn't been confirmed.")
  })

  test('no grouping: no shared heading, no group count, items remain in the flat "Still open" list exactly as before', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    const bulletLines = stillOpen.split('\n').filter((l) => l.trim().startsWith('-'))
    expect(bulletLines).toHaveLength(3)
    expect(stillOpen).not.toMatch(/^\s*Human contribution/m) // no heading line introduced
  })

  test('no claim descriptor: the three lines remain textually identical, sibling claims remain indistinguishable', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    const bulletLines = stillOpen.split('\n').filter((l) => l.trim().startsWith('-'))
    expect(new Set(bulletLines).size).toBe(1)
  })

  test('no candidate-statement/claim-substance leakage', () => {
    expect(email.text).not.toMatch(/copyright eligib|prompts alone|selecting, arranging, or editing/i)
    expect(email.text).not.toContain('CLAIM-COPY')
  })
})

// ── GROUP 1: fail-closed adversarial matrix (Part 10 / 31) ────────────────

describe('SCOPE-6F -- fail-closed matrix', () => {
  test('A: registered human_contribution_description -> exact approved label', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].display_label).toBe('human contribution to the finished work')
  })

  test('B: unknown/unregistered dependency ID -> null label, current generic fallback', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', 'some_future_unregistered_dependency')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].display_label).toBeNull()
    const email = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', plan({ explicit_sections: [sec] }), [], r)
    expect(email.text).toContain("An additional governed consideration for this topic hasn't been confirmed.")
  })

  test('C: unregistered evidence-only-shaped dependency ID -> null label, current generic fallback', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', 'editorial_designation_confirmed')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].display_label).toBeNull()
  })

  test('D: applicability unresolved item -> unaffected, display_label always null regardless of dependency registry', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [applicabilityItem('C1')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].display_label).toBeNull()
    // Applicability's OWN label resolution (unaffected, still renderer-owned, still resolves) --
    // proves the two registries remain independent, neither shadows the other.
    const email = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', plan({ explicit_sections: [sec] }), [], r)
    expect(email.text).toContain('Your assessment jurisdiction')
  })

  test('E: withheld_relevant_claim item -> unaffected, display_label always null', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [{ kind: 'withheld_relevant_claim', claim_id: 'C1', fact: null, tool: null, unresolved_reason: null }] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation[0].display_label).toBeNull()
  })

  test('F: multiple sibling open-project-dependency items preserved independently, each resolving its own display_label entry', () => {
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD), openDependency('C2', 'unknown_dep')] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_item_presentation).toHaveLength(2)
    expect(r.unresolved_item_presentation[0].display_label).toBe('human contribution to the finished work')
    expect(r.unresolved_item_presentation[1].display_label).toBeNull()
  })
})

// ── GROUP 1: presentation-role orthogonality (Part 8 / 25) ────────────────

describe('SCOPE-6F -- presentation role remains untouched and unconsumed', () => {
  test('open_project_dependency role remains primary regardless of whether a label resolves', () => {
    const secLabeled = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD)] })
    const secUnlabeled = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', 'unknown_dep')] })
    const rLabeled = buildConsultativeRealization(plan({ explicit_sections: [secLabeled] }), projectionOutput())
    const rUnlabeled = buildConsultativeRealization(plan({ explicit_sections: [secUnlabeled] }), projectionOutput())
    expect(rLabeled.unresolved_item_presentation[0].presentation_role).toBe('primary')
    expect(rUnlabeled.unresolved_item_presentation[0].presentation_role).toBe('primary')
  })
})

// ── GROUP 1: Track C (Part 28) ────────────────────────────────────────────

describe('SCOPE-6F -- discovered_context unaffected', () => {
  test('discovered_context remains a verbatim passthrough, never touched by dependency-label resolution', () => {
    const discovered = [{ claim_ref: { claim_id: 'D1', matrix_identifier: 'm', match_origin: 'discovered_topic' as const, matched_goal_category: 'trademark' as const, relationship_id: null, last_verified: null }, authorizing_goal_category: 'trademark' as const }]
    const r = buildConsultativeRealization(plan({ discovered_context: discovered }), projectionOutput())
    expect(r.discovered_context).toBe(discovered)
  })
})

// ── GROUP 2: real end-to-end, real evaluator, all FOUR real governed claims ──

const ALL_FOUR_CLAIMS = TOPIC_CLAIMS_FIXTURE.filter((c) => ['CLAIM-COPY-001-v1', 'CLAIM-COPY-002-v1', 'CLAIM-COPY-003-v1', 'CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1'].includes(c.claim_id))

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

describe('SCOPE-6F -- real end-to-end: all four real governed consumers (Part 15, fourth-consumer control)', () => {
  test('sanity: exactly four real claims found, all still carry the dependency unchanged', () => {
    expect(ALL_FOUR_CLAIMS).toHaveLength(4)
    for (const c of ALL_FOUR_CLAIMS) expect(c.unresolved_project_dependencies).toEqual([HCD])
  })

  test('United States established -> the three US claims match, each contributes its OWN labeled dependency line; Taiwan claim remains a SEPARATE, jurisdiction-unresolved item, unaffected', () => {
    const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
    const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    const matches = email.text.match(/Your human contribution to the finished work hasn't been confirmed in this conversation\./g) || []
    expect(matches).toHaveLength(3)
    // the Taiwan claim's own jurisdiction-unresolved item uses the applicability label, not the dependency label
    expect(email.text).toContain('Your assessment jurisdiction')
  })

  test('Taiwan established -> the Taiwan claim matches and contributes the SAME governed dependency label through its own, independent path; the three US claims become jurisdiction-unresolved instead', () => {
    const result = runCRCConversation(baseSU('Taiwan'), [], ALL_FOUR_CLAIMS, [])
    const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    const matches = email.text.match(/Your human contribution to the finished work hasn't been confirmed in this conversation\./g) || []
    expect(matches).toHaveLength(1) // only the TW claim matched -> only it contributes an open_project_dependency item
  })

  test('no jurisdiction/claim-specific branching: the label is byte-identical whether it originates from a US claim or the Taiwan claim', () => {
    const usResult = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
    const twResult = runCRCConversation(baseSU('Taiwan'), [], ALL_FOUR_CLAIMS, [])
    const usRealization = buildConsultativeRealization(usResult.plan, usResult.output, usResult.consultative_notes ?? [])
    const twRealization = buildConsultativeRealization(twResult.plan, twResult.output, twResult.consultative_notes ?? [])
    const usLabels = usRealization.unresolved_item_presentation.filter((p) => p.item.kind === 'open_project_dependency').map((p) => p.display_label)
    const twLabels = twRealization.unresolved_item_presentation.filter((p) => p.item.kind === 'open_project_dependency').map((p) => p.display_label)
    expect(new Set([...usLabels, ...twLabels])).toEqual(new Set(['human contribution to the finished work']))
  })
})

// ── GROUP 2: leakage tests (Part 16/17/18) ────────────────────────────────

describe('SCOPE-6F -- leakage tests against real governed data', () => {
  const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
  const realization = buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? [])
  const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)

  test('"creative" never appears in the dependency category sentence text', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    expect(stillOpen.toLowerCase()).not.toContain('creative')
  })

  test('no real candidate-statement fragment (from any of the four claims, US or Taiwan) leaks into the Still Open section', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'), email.text.indexOf("WHAT'S STILL NEEDED"))
    for (const c of ALL_FOUR_CLAIMS) {
      // a crude but effective fragment check: no 8-word run of the real governed text appears
      expect(c.crc_candidate_statement).not.toBeNull()
      const words = c.crc_candidate_statement!.split(/\s+/)
      for (let i = 0; i + 8 <= words.length; i += 4) {
        const fragment = words.slice(i, i + 8).join(' ')
        expect(stillOpen).not.toContain(fragment)
      }
    }
  })

  test('the internal dependency-ID string never appears in user-facing output', () => {
    expect(email.text).not.toContain('human_contribution_description')
  })

  test('no claim_id ever appears in user-facing output', () => {
    for (const c of ALL_FOUR_CLAIMS) expect(email.text).not.toContain(c.claim_id)
  })
})

// ── GROUP 2: regression controls (Part 19-24) ─────────────────────────────

describe('SCOPE-6F -- regression controls against real production registries', () => {
  test('askability unchanged: human_contribution_description remains askable_in_crc, question text unchanged', () => {
    expect(isDependencyAskableInCrc('human_contribution_description')).toBe(true)
    expect(getAskabilityEntry('human_contribution_description')).toEqual({ treatment: 'askable_in_crc' })
    expect(HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION).toBe(
      'Beyond entering prompts, what did you personally do to shape the final video — for example selecting takes, arranging the sequence, editing, or compositing?',
    )
  })

  test('evidence classification unchanged: real real end-to-end missing_evidence still classifies as answerable_in_conversation', () => {
    const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
    const classifications = result.plan.explicit_sections[0].missing_evidence.filter((m) => m.dependency_id === HCD).map((m) => m.classification)
    expect(classifications.every((c) => c === 'answerable_in_conversation')).toBe(true)
  })

  test('stock/evidence-only dependency remains untouched: no label, no askability, no classification change', () => {
    expect(getAskabilityEntry('editorial_designation_confirmed')).toBeUndefined()
    expect(isDependencyAskableInCrc('editorial_designation_confirmed')).toBe(false)
  })

  test('applicability display registry unchanged: jurisdiction/tool_account_status/tool_plan_tier exactly as before', () => {
    expect(getApplicabilityFactLabel('jurisdiction')).toBe('assessment jurisdiction')
    expect(getApplicabilityFactLabel('tool_account_status')).toBe('account or membership status')
    expect(getApplicabilityFactLabel('tool_plan_tier')).toBeUndefined()
  })

  test('selector askability (a separate registry from dependency askability) unchanged', () => {
    expect(getSelectorAskabilityEntry('tool_account_status')?.treatment).toBe('askable_in_crc')
    expect(getSelectorAskabilityEntry('jurisdiction')).toBeUndefined()
  })

  test('M2B jurisdiction ConsultativeNote remains suppressed real end-to-end, unaffected by dependency-label activation', () => {
    const result = runCRCConversation(baseSU('United States'), [], ALL_FOUR_CLAIMS, [])
    // the Taiwan claim is jurisdiction-unresolved in this scenario -- the dedicated
    // jurisdiction guard in realizeUnresolvedApplicability must still fire regardless
    expect(result.consultative_notes).toEqual([])
  })

  test('CC-4C.2F collapse predicate unchanged: dependency labels are never used as a dedup key', () => {
    // two DIFFERENT open_project_dependency items sharing the SAME dependency_id must
    // never collapse into one -- 2F's own predicate only ever touches a
    // withheld_relevant_claim/unresolved_applicability pair, never this kind.
    const sec = section({ category: COPYRIGHTABILITY, unresolved_items: [openDependency('C1', HCD), openDependency('C2', HCD)] })
    const r = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(r.unresolved_groups[0].items).toHaveLength(2)
  })
})
