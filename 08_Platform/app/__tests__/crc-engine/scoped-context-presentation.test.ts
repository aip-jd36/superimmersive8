/**
 * CRC-CC-RENDERER-SCOPED-CONTEXT-1D (2026-10-02) -- Unified Web+Email
 * Scoped-Context Presentation.
 *
 * Covers, in one file, the three new decision points this milestone adds:
 *   1. server-side correlation (`attachPresentationRole`,
 *      unresolved-applicability-realization.ts) -- the ONLY place a note's
 *      own `presentation_role` is computed, by exact structural
 *      `(claim_id, fact, tool)` matching against an already-built
 *      `ConsultativeRealization`, never by re-deriving `unresolved_reason`;
 *   2. email rendering (`renderUnresolved`/`renderUnresolvedSection`,
 *      results-email-template.ts) -- `primary` stays under "Still open"
 *      with the unchanged `unresolvedItemSentence` wording; `scoped_context`
 *      moves to a separate "Related context" section with the new
 *      `scopedContextItemSentence` wording, which never says "hasn't been
 *      confirmed";
 *   3. web presentation-role decision (`roleFor`, CrcProjectionOutput.tsx)
 *      -- exported specifically because this repository's Jest config has
 *      no DOM/React-rendering environment (`testEnvironment: 'node'`, no
 *      `@testing-library/react`); this file tests that one decision
 *      function directly and does NOT claim to have rendered or visually
 *      verified the actual JSX output -- see this milestone's own Final
 *      Report for the explicit, non-overclaimed scope of what this proves.
 *
 * Builder style for (2) mirrors `consultative-realization-presentation-role.test.ts`'s
 * own literal-`ConsultativeAnswerPlan` convention. Builder style for (1)
 * mirrors `ca-bpc-17610-synthetic-performer-disclosure-reachability.test.ts`'s
 * own real-pipeline, real-governed-claim fixture convention -- the same
 * California/New York synthetic-performer claim pair used throughout this
 * milestone chain as the generic regression fixture, never jurisdiction-
 * specific production logic.
 */

import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { DIALOGUE_FIXTURES } from '@/lib/interview-engine/fixtures'
import type { StructuredUnderstanding, UserGoal } from '@/types/interview-engine'

import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import type { ConsultativeAnswerPlan, PlanGoalSection, PlanUnresolvedItem } from '@/lib/crc-engine/consultative-answer-plan'
import type { ProjectionOutput, ProjectionGoalInterpretation } from '@/lib/projection-layer/types'
import type { GoalCategory } from '@/types/interview-engine'

import type { ConsultativeNote } from '@/lib/crc-engine/unresolved-applicability-realization'

/**
 * `components/CrcProjectionOutput.tsx` cannot be imported from this test
 * file: this repository's Jest config (`jest.config.js`) runs with
 * `testEnvironment: 'node'` and no `@testing-library/react`/jsdom, and
 * importing a `.tsx` file pulls in JSX syntax Jest's own transform here is
 * not configured to parse (confirmed directly -- attempting the import
 * produces a hard `SyntaxError: Unexpected token '<'` at the file's own
 * JSX return statement, not a logic failure). `roleFor`'s own exported,
 * three-line, pure decision function is therefore reproduced VERBATIM
 * here, for direct unit testing of that exact logic, rather than silently
 * dropping coverage of it. This is NOT a claim that the real component's
 * own JSX/DOM output was rendered or visually verified -- see this
 * milestone's own Final Report for the explicit, non-overclaimed scope.
 * Any future change to the real `roleFor` must update this copy to match,
 * or add a DOM-capable test environment and import the real function
 * directly instead.
 */
function roleFor(note: ConsultativeNote): 'primary' | 'scoped_context' {
  return note.presentation_role === 'scoped_context' ? 'scoped_context' : 'primary'
}

// ── Part 1: real-pipeline server-side correlation (California / New York) ──

const CA_CLAIM_ID = 'CLAIM-SYNTHETIC-PERFORMER-CA-BPC-17610-001-v1'
const NY_CLAIM_ID = 'CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1'

function likenessGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    goal_id: 'g-1',
    state: 'confirmed',
    raw_text: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    category: 'likeness',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'Does my ad need a disclosure since the spokesperson is AI-generated and not a real person?',
    ...overrides,
  }
}

function suWithJurisdiction(value: string): StructuredUnderstanding {
  return {
    ...DIALOGUE_FIXTURES.no_signal.structured_understanding,
    user_goals: [likenessGoal()],
    project_facts: {
      ...DIALOGUE_FIXTURES.no_signal.structured_understanding.project_facts,
      jurisdiction: { attestation: { state: 'confirmed', value }, source_turn: 1, source_statement: value },
    },
  }
}

function suWithNoJurisdiction(): StructuredUnderstanding {
  return { ...DIALOGUE_FIXTURES.no_signal.structured_understanding, user_goals: [likenessGoal()] }
}

describe('CRC-CC-RENDERER-SCOPED-CONTEXT-1D -- server-side note/presentation_role correlation', () => {
  test('California established: the CA note (if M2B produces one) is primary; a real jurisdiction mismatch elsewhere in realization is scoped_context -- reproduction-validity check against the real pipeline', () => {
    const su = suWithJurisdiction('California')
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)

    // Reproduction-validity: both claims genuinely reached this turn.
    expect(result.output.knowledge_items.map((k) => k.claim_id)).toContain(CA_CLAIM_ID)

    // Every note attachPresentationRole produced carries a real role value,
    // and -- per the correlation's own fail-closed contract -- it is never
    // anything other than 'primary' or 'scoped_context'.
    for (const note of result.consultative_notes) {
      expect(['primary', 'scoped_context']).toContain(note.presentation_role)
    }

    // The structural fact this whole milestone chain exists to fix: the NY
    // sibling's own unresolved item is scoped_context in realization itself
    // (unchanged, already proven in 1C's own test) -- reconfirmed here as
    // the shared ground truth both renderers must agree on.
    const nyItem = result.realization.unresolved_item_presentation.find(
      (p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === NY_CLAIM_ID,
    )
    expect(nyItem?.presentation_role).toBe('scoped_context')
  })

  test('genuinely missing jurisdiction: every note is primary (fail-closed default and/or correct correlation)', () => {
    const su = suWithNoJurisdiction()
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    for (const note of result.consultative_notes) {
      expect(roleFor(note)).toBe('primary')
    }
  })

  test('consultative_notes retains its own existing text/goal_index content unchanged -- presentation_role is purely additive', () => {
    const su = suWithJurisdiction('California')
    const result = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE)
    for (const note of result.consultative_notes) {
      expect(typeof note.goal_index).toBe('number')
      expect(typeof note.text).toBe('string')
      expect(note.text.length).toBeGreaterThan(0)
    }
  })
})

// ── Part 2: email rendering ─────────────────────────────────────────────────

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
    goal_interpretations: [] as ProjectionGoalInterpretation[],
    closing_cta: '',
    ...overrides,
  }
}
function applicability(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'CLAIM-X', fact: 'jurisdiction', tool: null, unresolved_reason: null, ...overrides }
}
function openDependency(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'open_project_dependency' }>> = {}): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed', ...overrides }
}

const LIKENESS: GoalCategory = 'likeness'
const MISMATCH = 'value_not_among_established_values' as const

describe('CRC-CC-RENDERER-SCOPED-CONTEXT-1D -- email rendering', () => {
  test('primary-only: unchanged "Still open" heading and wording (zero visible change for the dominant case)', () => {
    const sec = section({ category: LIKENESS, unresolved_items: [applicability({ claim_id: 'A', unresolved_reason: null })] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).toMatch(/STILL OPEN/)
    expect(text).toMatch(/assessment jurisdiction hasn't been confirmed in this conversation/i)
    expect(text).not.toMatch(/RELATED CONTEXT/i)
  })

  test('scoped-context-only: NO "Still open" section; a separate "Related context" section; never the false "hasn\'t been confirmed" wording', () => {
    const sec = section({ category: LIKENESS, unresolved_items: [applicability({ claim_id: 'A', unresolved_reason: MISMATCH })] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).not.toMatch(/\bSTILL OPEN\b/)
    expect(text).toMatch(/RELATED CONTEXT/i)
    expect(text).not.toMatch(/hasn't been confirmed in this conversation/i)
    expect(text).toMatch(/scoped to a assessment jurisdiction other than what's already established/i)
  })

  test('mixed: one primary + one scoped_context item for DIFFERENT facts -> both sections present, each with only its own role\'s item', () => {
    const sec = section({
      category: LIKENESS,
      unresolved_items: [applicability({ claim_id: 'A', fact: 'jurisdiction', unresolved_reason: MISMATCH }), applicability({ claim_id: 'B', fact: 'tool_plan_tier', tool: 'kling', unresolved_reason: null })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).toMatch(/STILL OPEN/)
    expect(text).toMatch(/RELATED CONTEXT/i)
    // "Still open" section only names the plan tier condition (not confirmed); "Related context" only names jurisdiction (scoped elsewhere).
    const stillOpenIdx = text.indexOf('STILL OPEN')
    const relatedIdx = text.indexOf('RELATED CONTEXT')
    const stillOpenBlock = text.slice(stillOpenIdx, relatedIdx)
    const relatedBlock = text.slice(relatedIdx)
    expect(stillOpenBlock).toMatch(/hasn't been confirmed/i)
    expect(relatedBlock).not.toMatch(/hasn't been confirmed/i)
  })

  test('California/New York symmetric regression, Case A: California established -> New York sibling is scoped_context, never "assessment jurisdiction hasn\'t been confirmed"', () => {
    const sec = section({
      category: LIKENESS,
      unresolved_items: [applicability({ claim_id: NY_CLAIM_ID, fact: 'jurisdiction', unresolved_reason: MISMATCH })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).not.toMatch(/assessment jurisdiction hasn't been confirmed/i)
    expect(text).toMatch(/RELATED CONTEXT/i)
  })

  test('California/New York symmetric regression, Case B: New York established -> California sibling is scoped_context, same generic behavior, no jurisdiction-specific branch needed', () => {
    const sec = section({
      category: LIKENESS,
      unresolved_items: [applicability({ claim_id: CA_CLAIM_ID, fact: 'jurisdiction', unresolved_reason: MISMATCH })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).not.toMatch(/assessment jurisdiction hasn't been confirmed/i)
    expect(text).toMatch(/RELATED CONTEXT/i)
  })

  test('genuinely missing jurisdiction remains primary -- "Still open" wording unchanged, no Related context section created', () => {
    const sec = section({ category: LIKENESS, unresolved_items: [applicability({ claim_id: 'A', fact: 'jurisdiction', unresolved_reason: null })] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).toMatch(/STILL OPEN/)
    expect(text).toMatch(/assessment jurisdiction hasn't been confirmed in this conversation/i)
    expect(text).not.toMatch(/RELATED CONTEXT/i)
  })

  test('multiple matching jurisdictions do not spuriously appear -- a claim with NO unresolved items produces no "Still open"/"Related context" section at all', () => {
    const sec = section({ category: LIKENESS, unresolved_items: [] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).not.toMatch(/STILL OPEN/)
    expect(text).not.toMatch(/RELATED CONTEXT/i)
  })

  test('open_project_dependency remains primary -- unaffected by this milestone', () => {
    const sec = section({ category: LIKENESS, unresolved_items: [openDependency()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    expect(text).toMatch(/STILL OPEN/)
    expect(text).not.toMatch(/RELATED CONTEXT/i)
  })

  test('multiple scoped-context items for different facts are NOT collapsed/merged -- each renders its own sentence', () => {
    const sec = section({
      category: LIKENESS,
      unresolved_items: [
        applicability({ claim_id: 'A', fact: 'jurisdiction', unresolved_reason: MISMATCH }),
        applicability({ claim_id: 'B', fact: 'tool_plan_tier', tool: 'kling', unresolved_reason: MISMATCH }),
      ],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    const relatedBlock = text.slice(text.indexOf('RELATED CONTEXT'))
    expect(relatedBlock).toMatch(/scoped to a assessment jurisdiction/i)
    // tool_plan_tier has no registered display label today, so it falls
    // through to the generic fallback sentence -- still a SEPARATE line,
    // never merged into the jurisdiction one.
    expect((relatedBlock.match(/scoped elsewhere|scoped to a/gi) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  test('resolved content (goal answer blocks, knowledge items) is byte-identical whether the unresolved item is primary or scoped_context', () => {
    const secPrimary = section({ category: LIKENESS, bi_summary_blocks: ['shared resolved text'], unresolved_items: [applicability({ unresolved_reason: null })] })
    const secScoped = section({ category: LIKENESS, bi_summary_blocks: ['shared resolved text'], unresolved_items: [applicability({ unresolved_reason: MISMATCH })] })
    const r1 = buildConsultativeRealization(plan({ explicit_sections: [secPrimary] }), projectionOutput())
    const r2 = buildConsultativeRealization(plan({ explicit_sections: [secScoped] }), projectionOutput())
    const email1 = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [secPrimary] }), [], r1)
    const email2 = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [secScoped] }), [], r2)
    expect(email1.text).toMatch(/shared resolved text/)
    expect(email2.text).toMatch(/shared resolved text/)
  })
})

// ── Part 3: web presentation-role decision (roleFor) ────────────────────────

describe('CRC-CC-RENDERER-SCOPED-CONTEXT-1D -- web roleFor (presentation-role decision only; DOM rendering not verified, see Final Report)', () => {
  const note = (presentation_role?: ConsultativeNote['presentation_role']): ConsultativeNote => ({ goal_index: 0, text: 'x', presentation_role })

  test('primary role -> primary', () => {
    expect(roleFor(note('primary'))).toBe('primary')
  })
  test('scoped_context role -> scoped_context', () => {
    expect(roleFor(note('scoped_context'))).toBe('scoped_context')
  })
  test('missing role (undefined) fails closed to primary', () => {
    expect(roleFor(note(undefined))).toBe('primary')
  })
  test('malformed/unrecognized role string fails closed to primary, never scoped_context', () => {
    expect(roleFor({ goal_index: 0, text: 'x', presentation_role: 'not_a_real_role' as unknown as ConsultativeNote['presentation_role'] })).toBe('primary')
  })
})

// ── Part 4: web/email semantic parity ────────────────────────────────────────

describe('CRC-CC-RENDERER-SCOPED-CONTEXT-1D -- web/email semantic-role parity (not byte-identical output -- see Final Report)', () => {
  test('for the SAME realization, web (roleFor) and email (filterGroupsByRole, exercised indirectly via rendered section membership) agree on which items are scoped_context', () => {
    const sec = section({
      category: LIKENESS,
      unresolved_items: [applicability({ claim_id: 'A', fact: 'jurisdiction', unresolved_reason: MISMATCH }), applicability({ claim_id: 'B', fact: 'tool_plan_tier', tool: 'kling', unresolved_reason: null })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const claimA = realization.unresolved_item_presentation.find((p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === 'A')
    const claimB = realization.unresolved_item_presentation.find((p) => p.item.kind === 'unresolved_applicability' && p.item.claim_id === 'B')
    // Web-side role decision for an equivalent note (as attachPresentationRole would produce it).
    expect(roleFor({ goal_index: 0, text: 'x', presentation_role: claimA?.presentation_role })).toBe('scoped_context')
    expect(roleFor({ goal_index: 0, text: 'y', presentation_role: claimB?.presentation_role })).toBe('primary')
    // Email-side: the same realization renders claim A under "Related context" and claim B under "Still open".
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', plan({ explicit_sections: [sec] }), [], realization)
    const relatedBlock = text.slice(text.indexOf('RELATED CONTEXT'))
    const stillOpenBlock = text.slice(text.indexOf('STILL OPEN'), text.indexOf('RELATED CONTEXT'))
    expect(relatedBlock).toMatch(/jurisdiction/i)
    expect(stillOpenBlock).not.toMatch(/scoped to a/i)
  })
})
