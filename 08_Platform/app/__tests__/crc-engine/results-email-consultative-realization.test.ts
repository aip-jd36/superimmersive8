/**
 * CC-4C.2B -- Email consumes ConsultativeRealization. Tests the NEW
 * `realization` branch of `buildResultsEmailContent` (results-email-template.ts)
 * -- per-goal answers driven by `ConsultativeRealization.goal_answers`
 * (never `output.goal_interpretations`), the three new answer-level
 * sections ("Still open" / "What's still needed" / Commercial Assurance
 * handoff), empty-state behavior, HTML/plain-text parity, and existing
 * knowledge-item dedup (CC-3B) preservation with `realization` now present.
 *
 * Most cases build literal `ConsultativeAnswerPlan` / `ProjectionOutput` /
 * `ConsultativeNote[]` fixtures directly (same style as
 * `consultative-realization-contract.test.ts`'s own builders) so this suite
 * pins the RENDERER's own contract precisely and deterministically. CASE N
 * additionally drives the real retrieve()/BI/plan pipeline (same `pipeline()`
 * pattern as `results-email-template.test.ts`'s own CC-3B suite) to prove
 * genuine end-to-end wiring, not just literal-fixture rendering.
 *
 * Assertions are structural/text-presence/count based, never full-string
 * prose snapshots.
 */

import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import type {
  ConsultativeAnswerPlan,
  PlanClaimRef,
  PlanGoalSection,
  PlanMissingEvidenceRef,
  PlanUnresolvedItem,
} from '@/lib/crc-engine/consultative-answer-plan'
import type { ConsultativeNote } from '@/lib/crc-engine/unresolved-applicability-realization'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory } from '@/types/interview-engine'

import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations as buildBoundedInterpretationsRaw } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { realizeUnresolvedApplicability, toConsultativeNotes } from '@/lib/crc-engine/unresolved-applicability-realization'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

const buildBoundedInterpretations = (goals: UserGoal[], results: Parameters<typeof buildBoundedInterpretationsRaw>[1], diagnostics?: Parameters<typeof buildBoundedInterpretationsRaw>[2]) =>
  buildBoundedInterpretationsRaw(userGoalsToBiIntents(goals), results, diagnostics)

// ── literal builders (mirrors consultative-realization-contract.test.ts) ──

function claimRef(overrides: Partial<PlanClaimRef> & Pick<PlanClaimRef, 'claim_id'>): PlanClaimRef {
  return { matrix_identifier: overrides.claim_id, match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null, last_verified: null, ...overrides }
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
  return { explicit_sections: [], discovered_context: [], render_once_markers: [], commercial_assurance_refs: [], ...overrides }
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
  return { text: 'This is an M2B-realized note sentence.', ...overrides }
}

function unresolvedApplicabilityItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'CLAIM-A', fact: 'tool_account_status', tool: 'synthtool', ...overrides }
}
function withheldClaimItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'withheld_relevant_claim' }>> = {}): PlanUnresolvedItem {
  return { kind: 'withheld_relevant_claim', claim_id: 'CLAIM-B', fact: null, tool: null, ...overrides }
}
function openDependencyItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'open_project_dependency' }>> = {}): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id: 'CLAIM-A', dependency_id: 'dep-1', ...overrides }
}
function missingEvidenceRef(overrides: Partial<PlanMissingEvidenceRef> & Pick<PlanMissingEvidenceRef, 'classification'>): PlanMissingEvidenceRef {
  return { source_claim_id: 'CLAIM-A', dependency_id: null, applicability_fact: null, ...overrides }
}

const COPYRIGHT: GoalCategory = 'copyright_ownership'
const TRADEMARK: GoalCategory = 'trademark'

/** Text that must never appear anywhere -- the milestone's own forbidden-conclusion list. */
const FORBIDDEN_CONCLUSION_LANGUAGE = /\b(resolved|appears_resolved|cleared|approved|is safe|commercially ready|blocker|the material issue|key issue|main concern|most important|just confirm that)\b/i

describe('CC-4C.2B -- results-email-template.ts consumes ConsultativeRealization', () => {
  describe('CASE A: single explicit goal, governed guidance available', () => {
    const sec = section({ category: COPYRIGHT, goal_text: 'Who owns the copyright?', disposition: 'governed_guidance_available', bi_summary_blocks: ['Governed answer text, verbatim.'] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('goal rendered once', () => {
      expect(html.match(/Who owns the copyright\?/g)?.length).toBe(1)
      expect(text.match(/Who owns the copyright\?/g)?.length).toBe(1)
    })

    test('BI content preserved verbatim', () => {
      expect(html).toContain('Governed answer text, verbatim.')
      expect(text).toContain('Governed answer text, verbatim.')
    })

    test('no false "resolved" or equivalent wording anywhere', () => {
      expect(html).not.toMatch(FORBIDDEN_CONCLUSION_LANGUAGE)
      expect(text).not.toMatch(FORBIDDEN_CONCLUSION_LANGUAGE)
    })

    test('no empty "Still open" / "What\'s still needed" headings', () => {
      for (const target of [html, text]) {
        expect(target).not.toMatch(/still open/i)
        expect(target).not.toMatch(/still needed/i)
      }
    })
  })

  describe('CASE B: single goal with unresolved applicability', () => {
    const item = unresolvedApplicabilityItem({ fact: 'tool_account_status' })
    const sec = section({
      category: COPYRIGHT,
      disposition: 'governed_guidance_available_with_open_items',
      unresolved_items: [item],
      missing_evidence: [missingEvidenceRef({ classification: 'answerable_in_conversation', applicability_fact: 'tool_account_status' })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('per-goal BI content (which already carries the boundary clause) remains present unchanged', () => {
      expect(text).toContain(sec.bi_summary_blocks[0])
    })

    test('unresolved condition appears in the answer-level "Still open" section, naming the registered display label', () => {
      expect(text).toMatch(/still open/i)
      expect(text).toContain('account or membership status')
    })

    test('missing evidence classification is represented (answerable_in_conversation)', () => {
      expect(text).toMatch(/still needed/i)
      expect(text).toContain('can be confirmed in a follow-up conversation')
    })

    test('no stronger applicability conclusion appears anywhere', () => {
      expect(html).not.toMatch(FORBIDDEN_CONCLUSION_LANGUAGE)
      expect(text).not.toMatch(FORBIDDEN_CONCLUSION_LANGUAGE)
      expect(text).not.toMatch(/definitely applies|does apply|confirmed to apply/i)
    })
  })

  describe('CASE C: documentary evidence dependency', () => {
    const item = openDependencyItem({ source_claim_id: 'CLAIM-A', dependency_id: 'dep-license-doc' })
    const sec = section({
      category: COPYRIGHT,
      disposition: 'governed_guidance_available_with_open_items',
      unresolved_items: [item],
      missing_evidence: [missingEvidenceRef({ classification: 'requires_documentary_evidence', dependency_id: 'dep-license-doc' })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('missing evidence is surfaced', () => {
      expect(text).toContain('requires supporting documentation')
    })

    test('it is not rendered as self-attestable -- classification label never says "confirm" or "answerable"', () => {
      for (const target of [html, text]) {
        expect(target.toLowerCase()).not.toContain('can be confirmed in a follow-up conversation')
        expect(target.toLowerCase()).not.toMatch(/\bconfirm\b/)
      }
    })

    test('no "just confirm" language or equivalent anywhere in the email', () => {
      for (const target of [html, text]) {
        expect(target.toLowerCase()).not.toMatch(/just confirm|simply confirm|just tell us|just let us know/)
      }
    })
  })

  describe('CASE D: multi-goal Copyright + Trademark style fixture', () => {
    const copyrightSec = section({
      category: COPYRIGHT,
      goal_text: 'Who owns the copyright on the generated footage?',
      disposition: 'governed_guidance_available',
      bi_summary_blocks: ['Copyright-specific governed text.'],
      unresolved_items: [withheldClaimItem({ claim_id: 'COPY-WITHHELD' })],
    })
    const trademarkSec = section({
      category: TRADEMARK,
      goal_text: 'Is the logo in the ad a trademark problem?',
      disposition: 'governed_guidance_available_with_open_items',
      bi_summary_blocks: ['Trademark-specific governed text.'],
      unresolved_items: [openDependencyItem({ source_claim_id: 'TM-CLAIM', dependency_id: 'dep-logo-consent' })],
      missing_evidence: [missingEvidenceRef({ classification: 'requires_documentary_evidence', source_claim_id: 'TM-CLAIM', dependency_id: 'dep-logo-consent' })],
    })
    const p = plan({ explicit_sections: [copyrightSec, trademarkSec] })
    const realization = buildConsultativeRealization(p, projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', p, [], realization)

    test('both explicit goals remain separate, order preserved', () => {
      const copyrightIdx = text.indexOf('Who owns the copyright on the generated footage?')
      const trademarkIdx = text.indexOf('Is the logo in the ad a trademark problem?')
      expect(copyrightIdx).toBeGreaterThan(-1)
      expect(trademarkIdx).toBeGreaterThan(-1)
      expect(copyrightIdx).toBeLessThan(trademarkIdx)
    })

    test('no cross-domain contamination -- each goal shows only its own content', () => {
      expect(text).toContain('Copyright-specific governed text.')
      expect(text).toContain('Trademark-specific governed text.')
      // The Copyright card's own bounded content never includes the Trademark sentence and vice versa.
      const copyrightBlock = text.slice(text.indexOf('Who owns the copyright'), text.indexOf('Is the logo in the ad'))
      expect(copyrightBlock).not.toContain('Trademark-specific governed text.')
    })

    test('unresolved/evidence content remains attributable to the correct goal via goal-text attribution', () => {
      expect(text).toMatch(/For: "Is the logo in the ad a trademark problem\?"/)
      expect(text).toMatch(/For: "Who owns the copyright on the generated footage\?"/)
    })

    test('exactly one answer-level Commercial Assurance handoff', () => {
      const closingCta = 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.'
      expect(text.split(closingCta).length - 1).toBe(1)
      expect(html.split(closingCta).length - 1).toBe(1)
    })

    test('no per-goal repeated CA closing CTA -- the closing_cta string never appears inside either goal card', () => {
      const closingCta = 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.'
      const goalAnswersRegion = text.slice(text.indexOf('WHAT THIS MEANS'), text.indexOf('STILL OPEN'))
      expect(goalAnswersRegion).not.toContain(closingCta)
    })
  })

  describe('CASE E: multiple goals with different boundary_refs', () => {
    const secA = section({ category: COPYRIGHT, goal_text: 'goal A', boundary_ref: 'tool_source', bi_summary_blocks: ['content A'] })
    const secB = section({ category: TRADEMARK, goal_text: 'goal B', boundary_ref: 'outside_coverage', bi_summary_blocks: ['content B'] })
    const p = plan({ explicit_sections: [secA, secB] })
    const realization = buildConsultativeRealization(p, projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', p, [], realization)

    test('each boundary remains with its own goal -- content is not merged or swapped', () => {
      const idxA = text.indexOf('goal A')
      const idxB = text.indexOf('goal B')
      const blockA = text.slice(idxA, idxB)
      expect(blockA).toContain('content A')
      expect(blockA).not.toContain('content B')
    })

    test('no merged/synthesized boundary text -- realization carries no answer_level_boundary field to leak', () => {
      expect(realization).not.toHaveProperty('answer_level_boundary')
    })
  })

  describe('CASE F: multiple goals with identical boundary_refs', () => {
    const secA = section({ category: COPYRIGHT, goal_text: 'goal A', boundary_ref: 'case_3b_unresolved', bi_summary_blocks: ['content A'] })
    const secB = section({ category: TRADEMARK, goal_text: 'goal B', boundary_ref: 'case_3b_unresolved', bi_summary_blocks: ['content B'] })
    const p = plan({ explicit_sections: [secA, secB] })
    const realization = buildConsultativeRealization(p, projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', p, [], realization)

    test('each boundary remains with its own goal even though the underlying boundary_ref values are equal -- no dedup', () => {
      expect(text).toContain('content A')
      expect(text).toContain('content B')
      expect(html.match(/goal A|goal B/g)?.length).toBe(2)
    })
  })

  describe('CASE G: mixed-state goal -- governed guidance available AND an unresolved_relevant_claim', () => {
    const sec = section({
      category: COPYRIGHT,
      disposition: 'governed_guidance_available_with_open_items',
      bi_summary_blocks: ['Governed guidance is available for this.'],
      unresolved_items: [withheldClaimItem()],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('governed guidance is rendered', () => {
      expect(text).toContain('Governed guidance is available for this.')
    })

    test('the unresolved condition is ALSO surfaced, not hidden because guidance exists', () => {
      expect(text).toMatch(/still open/i)
    })

    test('no "resolved" characterization anywhere, for either the goal card or the unresolved section', () => {
      expect(html).not.toMatch(FORBIDDEN_CONCLUSION_LANGUAGE)
      expect(text).not.toMatch(FORBIDDEN_CONCLUSION_LANGUAGE)
    })
  })

  describe('CASE H: multiple unresolved items', () => {
    const items: PlanUnresolvedItem[] = [
      withheldClaimItem({ claim_id: 'C1' }),
      unresolvedApplicabilityItem({ claim_id: 'C2', fact: 'jurisdiction' }),
      openDependencyItem({ source_claim_id: 'C3', dependency_id: 'dep-3' }),
    ]
    const sec = section({ category: COPYRIGHT, disposition: 'governed_guidance_available_with_open_items', unresolved_items: items })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('deterministic, non-ranked order -- matches the plan\'s own existing item order exactly, unreordered', () => {
      expect(realization.unresolved_groups[0].items).toEqual(items)
    })

    test('no "main/key/most important" language anywhere', () => {
      expect(text.toLowerCase()).not.toMatch(/\b(main|key|most important|top|primary)\s+(issue|concern|item)\b/)
    })
  })

  describe('CASE I: all missing-evidence classifications, semantic distinction preserved', () => {
    const sec = section({
      category: COPYRIGHT,
      missing_evidence: [
        missingEvidenceRef({ classification: 'answerable_in_conversation', dependency_id: 'dep-ask' }),
        missingEvidenceRef({ classification: 'requires_documentary_evidence', dependency_id: 'dep-doc' }),
        missingEvidenceRef({ classification: 'applicability_unresolved', applicability_fact: 'jurisdiction' }),
      ],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('all three classification labels are present and textually distinct', () => {
      expect(text).toContain('can be confirmed in a follow-up conversation')
      expect(text).toContain('requires supporting documentation')
      expect(text).toContain('not yet determined whether this applies')
    })
  })

  describe('CASE J: discovered context / Track C remains subordinate', () => {
    // Mirrors results-email-template.test.ts's own CASE 3 pattern: a
    // discovered-origin knowledge_item whose claim is NOT in any goal
    // section's summary_claim_refs renders under the existing "Also
    // relevant to your workflow" heading, not as a new "You asked:" card --
    // unchanged by CC-4C.2B (Part 8: reuse the existing mechanism).
    const sec = section({ category: COPYRIGHT, goal_text: 'Can I use this commercially?', summary_claim_refs: [] })
    const discoveredRef = claimRef({ claim_id: 'istock-editorial-001', matrix_identifier: 'istock', matched_goal_category: COPYRIGHT, match_origin: 'discovered_topic' })
    const p = plan({
      explicit_sections: [sec],
      discovered_context: [{ claim_ref: discoveredRef, authorizing_goal_category: COPYRIGHT }],
    })
    const output = projectionOutput({
      knowledge_items: [{ claim_id: 'istock-editorial-001', matrix_identifier: 'istock', statement: 'iStock editorial-use governed statement.', last_verified: null }],
    })
    const realization = buildConsultativeRealization(p, output)
    const { html, text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', p, [], realization)

    test('authorizing_goal_category preserved on the realization', () => {
      expect(realization.discovered_context[0].authorizing_goal_category).toBe(COPYRIGHT)
    })

    test('discovered content does not appear as its own "You asked:" card', () => {
      const youAskedCount = (text.match(/You asked:/g) || []).length
      expect(youAskedCount).toBe(1) // only the one real explicit goal
    })

    test('discovered content renders under the existing subordinate heading, not fabricated as a goal', () => {
      expect(html).toContain('Also relevant to your workflow')
      expect(text).toContain('iStock editorial-use governed statement.')
    })
  })

  describe('CASE K: empty states render cleanly, no invented reassurance', () => {
    const sec = section({ category: COPYRIGHT, unresolved_items: [], missing_evidence: [] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput({ closing_cta: '' }))
    const { html, text } = buildResultsEmailContent(projectionOutput({ closing_cta: '' }), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)

    test('no "Still open" / "What\'s still needed" headings when their groups are empty', () => {
      for (const target of [html, text]) {
        expect(target).not.toMatch(/still open/i)
        expect(target).not.toMatch(/still needed/i)
      }
    })

    test('no Commercial Assurance sentence when applies is false', () => {
      expect(realization.commercial_assurance.applies).toBe(false)
      for (const target of [html, text]) {
        expect(target).not.toContain('human-reviewed commercial assurance assessment of the full workflow')
      }
    })

    test('no invented reassurance language ("nothing else is outstanding" or equivalent)', () => {
      for (const target of [html, text]) {
        expect(target.toLowerCase()).not.toMatch(/nothing (else )?is outstanding|nothing further is needed|all clear|you're all set|everything (else )?checks out/)
      }
    })
  })

  describe('CASE L: Commercial Assurance absent/empty structural case', () => {
    test('no refs and empty closing_cta -> applies is false, no handoff invented', () => {
      const realization = buildConsultativeRealization(plan(), projectionOutput({ closing_cta: '' }))
      const { html, text } = buildResultsEmailContent(projectionOutput({ closing_cta: '' }), 'attr-1', 'jd@example.com', plan(), [], realization)
      expect(realization.commercial_assurance).toEqual({ applies: false, closing_cta: '' })
      expect(html).not.toContain('SI8 can review it')
      expect(text).not.toContain('SI8 can review it')
    })
  })

  describe('CASE M: HTML / plain-text structural parity', () => {
    const copyrightSec = section({ category: COPYRIGHT, goal_text: 'parity goal A', bi_summary_blocks: ['parity content A'], unresolved_items: [withheldClaimItem()] })
    const trademarkSec = section({
      category: TRADEMARK,
      goal_text: 'parity goal B',
      boundary_ref: 'outside_coverage',
      bi_summary_blocks: ['parity content B'],
      missing_evidence: [missingEvidenceRef({ classification: 'requires_documentary_evidence' })],
    })
    const p = plan({ explicit_sections: [copyrightSec, trademarkSec] })
    const realization = buildConsultativeRealization(p, projectionOutput())
    const { html, text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', p, [], realization)

    test.each([
      ['goal A', 'parity goal A'],
      ['goal B', 'parity goal B'],
      ['governed content A', 'parity content A'],
      ['governed content B', 'parity content B'],
      ['missing-evidence label', 'requires supporting documentation'],
      ['CA closing_cta', 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.'],
    ])('%s is present in both HTML and plain-text', (_label, fragment) => {
      expect(html).toContain(fragment)
      expect(text).toContain(fragment)
    })

    test('unresolved-item presence parity ("Still open" heading in both)', () => {
      expect(html).toContain('Still open')
      expect(text).toContain('STILL OPEN')
    })
  })

  describe('CASE N: existing knowledge-item dedup (CC-3B) regression, now WITH realization also present', () => {
    const h = (o: Partial<RetrievalHandoff> = {}): RetrievalHandoff => ({
      tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [],
      workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [], ...o,
    })
    const tool = (identifier: string) => ({ identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const })
    const g = (goal_id: string, raw_text: string, category: UserGoal['category']): UserGoal =>
      ({ goal_id, raw_text, category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: raw_text })
    const facts = (tms: ToolMention[] = []): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: tms })

    function pipeline(handoff: RetrievalHandoff, goals: UserGoal[], applic: ApplicabilityFacts) {
      const out = retrieve(handoff, MATRIX_FIXTURE, goals, [], applic, [], handoff.asset_providers, [])
      const interps = buildBoundedInterpretations(goals, out.results, out.diagnostics)
      const { output } = assembleProjectionOutput(handoff, out.results, interps)
      const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
      const consultative_notes = toConsultativeNotes(realizeUnresolvedApplicability(plan.explicit_sections))
      const realization = buildConsultativeRealization(plan, output, consultative_notes)
      return { output, plan, consultative_notes, realization }
    }

    // NOTE (CC-4C.2B Final Report Part X): 'runway-gen3' -- the fixture the
    // sibling results-email-template.test.ts's own CASE 1/2 use -- currently
    // produces ZERO eligible retrieve() results against live MATRIX_FIXTURE
    // (`reason: 'no_eligible_claims'`), a PRE-EXISTING drift confirmed
    // present on an unmodified origin/main baseline too, unrelated to this
    // milestone. 'luma' is used here instead specifically so this real-
    // pipeline regression test exercises genuine non-empty content rather
    // than silently asserting nothing.
    test('CASE 1-equivalent (Luma, one goal): governed guidance still appears exactly ONCE, now via the realization branch', () => {
      const { output, plan, consultative_notes, realization } = pipeline(h({ tools: [tool('luma')] }), [g('g1', 'Can I use it commercially?', 'commercial_use')], facts())
      const stmt: string | undefined = output.knowledge_items[0]?.statement
      expect(stmt).toBeTruthy()
      const { text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan, consultative_notes, realization)
      expect(text.split((stmt as string).slice(0, 40)).length - 1).toBe(1)
      expect(text).toMatch(/what this means for what you asked/i)
      expect(text).not.toContain('CURRENT GUIDANCE')
    })

    test('deterministic: same output+plan+notes+realization renders identically across calls', () => {
      const { output, plan, consultative_notes, realization } = pipeline(h({ tools: [tool('luma')] }), [g('g1', 'commercial?', 'commercial_use')], facts())
      const first = buildResultsEmailContent(output, 'a', 'e@x.com', plan, consultative_notes, realization)
      const second = buildResultsEmailContent(output, 'a', 'e@x.com', plan, consultative_notes, realization)
      expect(first).toEqual(second)
    })
  })
})
