/**
 * CRC-CC-SCOPE-6B (2026-09-24) -- Governed Jurisdiction Display Label
 * Activation. Focused coverage for the newly-registered
 * `jurisdiction -> 'assessment jurisdiction'` entry in
 * applicability-fact-display.ts, complementing (not replacing) the
 * registry-level tests in applicability-fact-display.test.ts and the
 * updated full-pipeline tests in
 * withheld-claim-applicability-passthrough.test.ts and
 * unresolved-applicability-realization-production.test.ts.
 *
 * Two groups:
 *   - GROUP 1 (Plan/Realization level, literal builders -- mirrors
 *     consultative-realization-presentation-role.test.ts's own convention):
 *     primary/scoped_context label orthogonality, and a representative
 *     UAT-D1 mixed-role reproduction.
 *   - GROUP 2 (real end-to-end, runCRCConversation + real, unmodified
 *     TOPIC_CLAIMS_FIXTURE entries + a full StructuredUnderstanding):
 *     the real applicability evaluator producing `value_not_among_established_
 *     values` from a real Taiwan/United States mismatch, and proof that a
 *     populated `distribution_territory_mentions` array never reaches the
 *     rendered jurisdiction sentence.
 */

import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import type { ConsultativeAnswerPlan, PlanClaimRef, PlanGoalSection, PlanMissingEvidenceRef, PlanUnresolvedItem } from '@/lib/crc-engine/consultative-answer-plan'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory, StructuredUnderstanding, UserGoal } from '@/types/interview-engine'
import type { ApplicabilityUnresolvedReason } from '@/lib/retrieval-engine/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

// ── GROUP 1 builders (mirrors consultative-realization-presentation-role.test.ts) ──

const REASON: ApplicabilityUnresolvedReason = 'value_not_among_established_values'
const COPYRIGHTABILITY: GoalCategory = 'copyrightability'
const TRADEMARK: GoalCategory = 'trademark'

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
function applicability(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'CLAIM-X', fact: 'jurisdiction', tool: null, unresolved_reason: null, ...overrides }
}
function openDependency(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'open_project_dependency' }>> = {}): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id: 'STOCK-1', dependency_id: 'human_contribution_description', ...overrides }
}

// ── GROUP 1: primary/scoped_context label orthogonality (Part 10) ────────

describe('SCOPE-6B -- jurisdiction label is identical regardless of presentation role', () => {
  test('primary (unresolved_reason: null) and scoped_context (value_not_among_established_values) render the SAME "Still open" sentence for jurisdiction', () => {
    const secPrimary = section({ category: COPYRIGHTABILITY, goal_text: 'g1', unresolved_items: [applicability({ claim_id: 'A', unresolved_reason: null })] })
    const secScoped = section({ category: COPYRIGHTABILITY, goal_text: 'g2', unresolved_items: [applicability({ claim_id: 'B', unresolved_reason: REASON })] })

    const realizationPrimary = buildConsultativeRealization(plan({ explicit_sections: [secPrimary] }), projectionOutput())
    const realizationScoped = buildConsultativeRealization(plan({ explicit_sections: [secScoped] }), projectionOutput())

    expect(realizationPrimary.unresolved_item_presentation[0].presentation_role).toBe('primary')
    expect(realizationScoped.unresolved_item_presentation[0].presentation_role).toBe('scoped_context')

    const emailPrimary = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', plan({ explicit_sections: [secPrimary] }), [], realizationPrimary)
    const emailScoped = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', plan({ explicit_sections: [secScoped] }), [], realizationScoped)

    // Same governed Level-1 sentence either way -- role never changes label wording.
    expect(emailPrimary.text).toContain("Your assessment jurisdiction hasn't been confirmed in this conversation.")
    expect(emailScoped.text).toContain("Your assessment jurisdiction hasn't been confirmed in this conversation.")
  })

  test('the sentence never explains WHY the item is unresolved -- no relationship/value language for either role', () => {
    const forbidden = /established|matches?|doesn'?t match|applies elsewhere|outside your jurisdiction|isn'?t met|not met/i
    const secPrimary = section({ category: COPYRIGHTABILITY, unresolved_items: [applicability({ unresolved_reason: null })] })
    const secScoped = section({ category: COPYRIGHTABILITY, unresolved_items: [applicability({ unresolved_reason: REASON })] })
    for (const sec of [secPrimary, secScoped]) {
      const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
      const email = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', plan({ explicit_sections: [sec] }), [], realization)
      expect(email.text).not.toMatch(forbidden)
    }
  })
})

// ── GROUP 1: representative UAT-D1 mixed-role reproduction (Part 13/14) ──

describe('SCOPE-6B -- UAT-D1 representative reproduction (mixed role, jurisdiction category label)', () => {
  const copyrightItems: PlanUnresolvedItem[] = [
    applicability({ claim_id: 'CLAIM-COPY-001', unresolved_reason: REASON }),
    applicability({ claim_id: 'CLAIM-COPY-002', unresolved_reason: REASON }),
    applicability({ claim_id: 'CLAIM-COPY-003', unresolved_reason: null }),
  ]
  const copyrightMissingEvidence: PlanMissingEvidenceRef[] = copyrightItems.map((i) => ({
    source_claim_id: (i as { claim_id: string }).claim_id,
    dependency_id: null,
    applicability_fact: 'jurisdiction',
    classification: 'applicability_unresolved',
  }))
  const copyrightSection = section({ category: COPYRIGHTABILITY, goal_text: 'Can I use this AI-generated video commercially?', unresolved_items: copyrightItems, missing_evidence: copyrightMissingEvidence })
  const trademarkSection = section({
    category: TRADEMARK,
    goal_text: 'Is the logo in the background a trademark problem?',
    unresolved_items: [openDependency({ source_claim_id: 'CLAIM-TM-001' })],
    missing_evidence: [{ source_claim_id: 'CLAIM-TM-001', dependency_id: 'human_contribution_description', applicability_fact: null, classification: 'answerable_in_conversation' }],
  })
  const fullPlan = plan({ explicit_sections: [copyrightSection, trademarkSection] })
  const realization = buildConsultativeRealization(fullPlan, projectionOutput())
  const email = buildResultsEmailContent(projectionOutput(), null, 'a@example.com', fullPlan, [], realization)

  test('roles are mixed exactly as UAT-D1 specifies: 2 scoped_context + 1 primary under Copyright, 1 primary under Trademark', () => {
    const copyRoles = realization.unresolved_item_presentation.filter((p) => p.category === COPYRIGHTABILITY).map((p) => p.presentation_role)
    expect(copyRoles.sort()).toEqual(['primary', 'scoped_context', 'scoped_context'])
    const tmRoles = realization.unresolved_item_presentation.filter((p) => p.category === TRADEMARK).map((p) => p.presentation_role)
    expect(tmRoles).toEqual(['primary'])
  })

  test('all three Copyright "Still open" lines now use the governed jurisdiction category sentence -- three times, still identical to each other', () => {
    const matches = email.text.match(/Your assessment jurisdiction hasn't been confirmed in this conversation\./g) || []
    expect(matches).toHaveLength(3)
  })

  test('the three lines remain textually IDENTICAL to one another -- SCOPE-6B does not, and is not claimed to, distinguish the three underlying claims', () => {
    const stillOpenStart = email.text.indexOf('STILL OPEN')
    const stillOpenEnd = email.text.indexOf("WHAT'S STILL NEEDED")
    const stillOpenSection = email.text.slice(stillOpenStart, stillOpenEnd)
    const lines = stillOpenSection.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('-'))
    expect(lines).toHaveLength(4) // 3 Copyright + 1 Trademark
    expect(new Set(lines.slice(0, 3)).size).toBe(1) // all 3 Copyright lines are the SAME string
  })

  // CRC-CC-SCOPE-6F (2026-09-25): this fixture's Trademark item uses
  // `openDependency()`'s own default dependency_id, which happens to be
  // `human_contribution_description` -- the exact dependency SCOPE-6F
  // activates a governed label for. This is a legitimate, expected
  // behavior change to this SCOPE-6B-authored fixture, not a regression:
  // the line now renders the new governed label instead of the old fully
  // generic fallback, exactly mirroring how SCOPE-6B itself changed
  // jurisdiction's own fallback in this same test file.
  test('the Trademark dependency line now uses the SCOPE-6F governed dependency label (this fixture happens to use human_contribution_description)', () => {
    expect(email.text).toContain("Your human contribution to the finished work hasn't been confirmed in this conversation.")
    expect(email.text).not.toContain("An additional governed consideration for this topic hasn't been confirmed.")
  })

  test('no claim identity (claim_id) or claim substance ever appears in the rendered text', () => {
    expect(email.text).not.toContain('CLAIM-COPY')
    expect(email.text).not.toContain('CLAIM-TM')
  })
})

// ── GROUP 2: real end-to-end, real evaluator, real governed claims ───────

const BASE_SU: StructuredUnderstanding = {
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
  assessment_jurisdiction_mentions: [{ mention_id: 'aj-1', value: 'Taiwan', confidence: 'confirmed', source_turn: 1, source_statement: 'This is for a Taiwan-based assessment.', superseded_by: null }],
  content_presence_mentions: [],
  distribution_territory_mentions: [{ mention_id: 'dt-1', value: 'Japan', confidence: 'confirmed', source_turn: 1, source_statement: "It'll be distributed in Japan.", superseded_by: null }],
  organization_location_mentions: [],
  current_phase: 4,
  gate_1_state: 'met',
  gate_2_state: 'stable',
  completion_reason: 'gate_1_gate_2_met',
  opt_out_scope: null,
}

// Real, unmodified governed claims from TOPIC_CLAIMS_FIXTURE -- CLAIM-COPY-001/002-v1
// are both gated `{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }`.
// With BASE_SU's real assessment jurisdiction established as Taiwan (a real, non-empty
// `included` set that does not contain 'United States'), the real evaluator
// (evaluateJurisdictionRequirementStatus, lookup-topic-claims.ts) produces
// `unresolved_reason: 'value_not_among_established_values'` for both -- not fabricated,
// not mocked.
const realCopyrightClaims: TopicClaim[] = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === 'CLAIM-COPY-001-v1' || c.claim_id === 'CLAIM-COPY-002-v1')

describe('SCOPE-6B -- real end-to-end: real evaluator + real governed claims + real StructuredUnderstanding', () => {
  test('sanity: the real fixture claims are actually gated on jurisdiction=United States, unchanged', () => {
    expect(realCopyrightClaims).toHaveLength(2)
    for (const c of realCopyrightClaims) {
      expect(c.applicability_requirements).toEqual([{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }])
    }
  })

  const result = runCRCConversation(BASE_SU, [], realCopyrightClaims, [])

  test('the real evaluator produces value_not_among_established_values for both real claims (Taiwan established, United States required)', () => {
    const plan1 = result.plan.explicit_sections[0]
    const reasons = plan1.unresolved_items.filter((i) => i.kind === 'unresolved_applicability').map((i) => (i as { unresolved_reason: string | null }).unresolved_reason)
    expect(reasons).toEqual(['value_not_among_established_values', 'value_not_among_established_values'])
  })

  test('the rendered email uses the governed "assessment jurisdiction" label, real end-to-end', async () => {
    const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    expect(email.text).toContain('assessment jurisdiction')
  })

  test('the real established assessment-jurisdiction value ("Taiwan") never leaks into the rendered sentence', () => {
    const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    expect(email.text).not.toContain('Taiwan')
  })

  test('the real required jurisdiction value ("United States") never leaks into the rendered sentence', () => {
    const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    expect(email.text).not.toContain('United States')
  })

  test('the real distribution-territory value ("Japan") never leaks into the rendered sentence -- distribution territory and assessment jurisdiction are not conflated', () => {
    const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    expect(email.text).not.toContain('Japan')
    expect(email.text).not.toMatch(/territory|distribut/i)
  })

  test('the internal reason literal ("value_not_among_established_values") never leaks into the rendered sentence', () => {
    const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    expect(email.text).not.toContain('value_not_among_established_values')
  })

  test('the M2B jurisdiction ConsultativeNote remains suppressed real end-to-end -- zero goal-level "Specifically, this depends on your assessment jurisdiction" sentence', () => {
    expect(result.consultative_notes).toEqual([])
    const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
    const email = buildResultsEmailContent(result.output, null, 'a@example.com', result.plan, result.consultative_notes, realization)
    expect(email.text).not.toContain('Specifically, this depends on')
  })
})
