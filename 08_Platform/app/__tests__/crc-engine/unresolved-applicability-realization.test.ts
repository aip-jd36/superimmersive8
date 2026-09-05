/**
 * M2B -- Bounded Unresolved-Applicability Realization tests. Deterministic,
 * no live model. `selector-askability.ts` and `applicability-fact-display.ts`
 * are mocked -- same jest.mock() precedent selector-questioning.test.ts
 * already established for the sibling `selector-askability.ts` registry --
 * so every positive-path scenario here uses synthetic, test-mocked
 * classification/label content, never depending on (or guessing at)
 * production registry state.
 */

import {
  realizeUnresolvedApplicability,
  toConsultativeNotes,
  type RealizedUnresolvedApplicabilityNote,
} from '@/lib/crc-engine/unresolved-applicability-realization'
import { getSelectorAskabilityEntry } from '@/lib/crc-engine/selector-askability'
import { getApplicabilityFactLabel } from '@/lib/crc-engine/applicability-fact-display'
import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import type { PlanClaimRef, PlanGoalSection, PlanUnresolvedItem } from '@/lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BoundedInterpretation } from '@/lib/bounded-interpretation/types'
import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { UserGoal } from '@/types/interview-engine'

jest.mock('@/lib/crc-engine/selector-askability', () => ({ getSelectorAskabilityEntry: jest.fn() }))
jest.mock('@/lib/crc-engine/applicability-fact-display', () => ({ getApplicabilityFactLabel: jest.fn() }))

const mockedAskability = getSelectorAskabilityEntry as jest.Mock
const mockedLabel = getApplicabilityFactLabel as jest.Mock

const SYNTH_TOOL = 'synthtool'
const OTHER_TOOL = 'othertool'
const TEST_LABEL = 'test membership status'

beforeEach(() => {
  mockedAskability.mockReset()
  mockedLabel.mockReset()
})

// ── builders ─────────────────────────────────────────────────────────────

function claimRef(overrides: Partial<PlanClaimRef> & Pick<PlanClaimRef, 'claim_id'>): PlanClaimRef {
  return {
    matrix_identifier: SYNTH_TOOL,
    match_origin: 'exact_topic',
    matched_goal_category: 'commercial_use',
    relationship_id: null,
    last_verified: null,
    ...overrides,
  }
}

function unresolvedApplicabilityItem(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'MEMBER-CLAIM', fact: 'tool_account_status', tool: SYNTH_TOOL, ...overrides }
}

/** A section shaped like the mixed case (BI's own generic hedge already appended -- see realization module's own gating comment). */
function section(overrides: Partial<PlanGoalSection> = {}): PlanGoalSection {
  return {
    goal_text: 'Can I use this commercially?',
    category: 'commercial_use',
    bi_status: 'directly_relevant',
    disposition: 'governed_guidance_available_with_open_items',
    supported_claim_refs: [claimRef({ claim_id: 'BASELINE-CLAIM' })],
    summary_claim_refs: [claimRef({ claim_id: 'BASELINE-CLAIM' })],
    unresolved_items: [unresolvedApplicabilityItem()],
    missing_evidence: [],
    boundary_ref: 'case_3b_unresolved',
    bi_summary_blocks: [
      'Baseline statement text.',
      "There's additional governed guidance relevant to this topic that hasn't been confirmed as applicable based on what's been described here — it may or may not apply, and CRC can't determine that from this conversation.",
    ],
    ...overrides,
  }
}

function askableEntry() {
  return { treatment: 'askable_in_crc' as const, question_text: 'x' }
}

// ── 1: supported unresolved applicability + approved test label -> one specific note ──

describe('realizeUnresolvedApplicability -- positive path', () => {
  test('1: supported askable fact + approved label -> exactly one note, with the exact bounded text', () => {
    mockedAskability.mockImplementation((fact: string) => (fact === 'tool_account_status' ? askableEntry() : undefined))
    mockedLabel.mockImplementation((fact: string) => (fact === 'tool_account_status' ? TEST_LABEL : undefined))

    const notes = realizeUnresolvedApplicability([section()])
    expect(notes).toHaveLength(1)
    expect(notes[0]).toEqual<RealizedUnresolvedApplicabilityNote>({
      goal_index: 0,
      category: 'commercial_use',
      goal_text: 'Can I use this commercially?',
      claim_id: 'MEMBER-CLAIM',
      fact: 'tool_account_status',
      tool: SYNTH_TOOL,
      text: `Specifically, this depends on your ${TEST_LABEL}, which hasn't been confirmed in this conversation.`,
    })
  })

  // 3: raw enum never rendered.
  test('3: rendered text never contains the raw ApplicabilityFact enum value', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const [note] = realizeUnresolvedApplicability([section()])
    expect(note.text).not.toContain('tool_account_status')
  })

  test('rendered text never contains the internal tool identifier', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const [note] = realizeUnresolvedApplicability([section()])
    expect(note.text).not.toContain(SYNTH_TOOL)
  })
})

// ── 2: no approved label -> zero note (fail closed) ─────────────────────────

describe('realizeUnresolvedApplicability -- fail-closed', () => {
  test('2: askable but no approved label -> zero notes (fail closed to existing generic BI copy)', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => undefined)
    expect(realizeUnresolvedApplicability([section()])).toEqual([])
  })

  // 4: met -> zero note. A `met` requirement never produces an
  // `unresolved_applicability` item at all (Retrieval/CC-3A's own job) --
  // simulated here by a section with no such item.
  test('4: no unresolved_applicability item at all (requirement met) -> zero notes', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    expect(realizeUnresolvedApplicability([section({ unresolved_items: [] })])).toEqual([])
  })

  // 5: not_met -> zero note. CC-3A itself never emits an `unresolved_applicability`
  // item for a not_met requirement (consultative-answer-plan.ts's own "not_met
  // applicability is never an open item" test) -- this module inherits that by
  // construction: given the same empty `unresolved_items` a not_met section
  // produces, it realizes nothing.
  test('5: not_met (no unresolved_applicability item, mirroring CC-3A\'s own not_met exclusion) -> zero notes', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    expect(realizeUnresolvedApplicability([section({ unresolved_items: [{ kind: 'withheld_relevant_claim', claim_id: 'X' }] })])).toEqual([])
  })

  // 9/10: requires_documentary_evidence / evidence-only -> zero note.
  test('9: classification is not askable_in_crc (requires_documentary_evidence / evidence_only) -> zero notes, no document language possible since nothing is rendered', () => {
    mockedAskability.mockImplementation(() => ({ treatment: 'evidence_only' as const }))
    mockedLabel.mockImplementation(() => TEST_LABEL) // even WITH a label, evidence-only must not fire
    expect(realizeUnresolvedApplicability([section()])).toEqual([])
  })

  test('10: classification unregistered (applicability_unresolved) -> zero notes', () => {
    mockedAskability.mockImplementation(() => undefined)
    mockedLabel.mockImplementation(() => TEST_LABEL)
    expect(realizeUnresolvedApplicability([section()])).toEqual([])
  })

  // 11: jurisdiction -> zero M2B note, regardless of what the registries say.
  test('11: fact is jurisdiction -> zero notes even if hypothetically askable and labeled (dedicated path guard)', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => 'jurisdiction label that should never render')
    const jurisdictionSection = section({ unresolved_items: [unresolvedApplicabilityItem({ fact: 'jurisdiction', tool: null, claim_id: 'JUR-CLAIM' })] })
    expect(realizeUnresolvedApplicability([jurisdictionSection])).toEqual([])
  })

  // 12: multiple distinct unresolved facts -> zero specific note (no ranking, no listing).
  test('12: two distinct unresolved applicability facts in one section -> zero notes (fail closed, never a list, never a ranked pick)', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const multi = section({
      unresolved_items: [
        unresolvedApplicabilityItem({ fact: 'tool_account_status', tool: SYNTH_TOOL, claim_id: 'A' }),
        unresolvedApplicabilityItem({ fact: 'tool_plan_tier', tool: SYNTH_TOOL, claim_id: 'B' }),
      ],
    })
    expect(realizeUnresolvedApplicability([multi])).toEqual([])
  })

  test('two claims sharing the SAME single distinct fact still produce exactly one note (not "multiple")', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const sameFactTwice = section({
      unresolved_items: [
        unresolvedApplicabilityItem({ fact: 'tool_account_status', tool: SYNTH_TOOL, claim_id: 'A' }),
        unresolvedApplicabilityItem({ fact: 'tool_account_status', tool: SYNTH_TOOL, claim_id: 'B' }),
      ],
    })
    expect(realizeUnresolvedApplicability([sameFactTwice])).toHaveLength(1)
  })

  // 14: irrelevant fact -> zero note (no unresolved_applicability item present at all).
  test('14: section with no unresolved_items whatsoever -> zero notes', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    expect(realizeUnresolvedApplicability([section({ unresolved_items: [] })])).toEqual([])
  })

  // Case-3A scope exclusion: no matched claim at all (pure Case 3A) ->
  // out of this milestone's scope, BI's own already-specific template covers it.
  test('pure Case 3A (no matched/supported claim at all) -> zero notes even with an otherwise-qualifying unresolved_applicability item', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const caseA = section({
      supported_claim_refs: [],
      summary_claim_refs: [],
      disposition: 'governed_guidance_withheld_pending_applicability',
      boundary_ref: 'case_3a_no_content',
      bi_summary_blocks: ['SI8 has governed knowledge relevant to whether this can be used commercially, but it depends on project-specific information that hasn\'t been confirmed in this conversation.'],
    })
    expect(realizeUnresolvedApplicability([caseA])).toEqual([])
  })
})

// ── 6/7/8: neutral, non-blame wording is invariant across why the fact is unresolved ──

describe('realizeUnresolvedApplicability -- neutral across every "why unresolved" cause', () => {
  const scenarios: Array<[string, PlanGoalSection]> = [
    ['6: user does not know', section()],
    ['7: user declined the selector question', section()],
    ['8: related-but-insufficient answer given (e.g. plan_tier stated, account_status still unresolved)', section()],
  ]

  test.each(scenarios)('%s -> identical bounded text (input shape to this module cannot distinguish these causes, by design)', (_label, input) => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const [note] = realizeUnresolvedApplicability([input])
    expect(note.text).toBe(`Specifically, this depends on your ${TEST_LABEL}, which hasn't been confirmed in this conversation.`)
    expect(note.text).not.toMatch(/you didn't|you declined|you could have|CRC asked/i)
  })
})

// ── 13: discovered-only unresolved applicability -> structurally impossible ──

describe('realizeUnresolvedApplicability -- explicit-goal sections only (Track C / discovered-relevance protection)', () => {
  test('13: the function signature accepts PlanGoalSection[] only -- discovered_context is never in scope by construction', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    // A plan built with zero explicit goals (a discovered-only claim lives in
    // plan.discovered_context, never in plan.explicit_sections) has nothing
    // for this function to see, regardless of what discovered_context holds.
    const plan = buildConsultativeAnswerPlan([], [], [])
    expect(plan.explicit_sections).toEqual([])
    expect(realizeUnresolvedApplicability(plan.explicit_sections)).toEqual([])
  })
})

// ── goal/section association: array position, not {category, goal_text} ────

describe('realizeUnresolvedApplicability -- goal/section association (human review constraint A)', () => {
  test('two explicit goals sharing an IDENTICAL category and IDENTICAL goal_text are each evaluated independently, by position -- no ambiguous shared attachment', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)

    const qualifies = section() // index 0: qualifies for a note
    const doesNotQualify = section({ unresolved_items: [] }) // index 1: identical category+goal_text, but no unresolved item

    const notes = realizeUnresolvedApplicability([qualifies, doesNotQualify])
    expect(notes).toHaveLength(1)
    expect(notes[0].goal_index).toBe(0)
    // index 1 never receives a note despite sharing category/goal_text with index 0.
    expect(notes.some((n) => n.goal_index === 1)).toBe(false)
  })

  test('conversely, two identical-text goals that BOTH qualify each receive their OWN independent note at their OWN index', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const notes = realizeUnresolvedApplicability([section(), section()])
    expect(notes.map((n) => n.goal_index)).toEqual([0, 1])
    expect(notes[0].text).toBe(notes[1].text) // same fact, same label -> same text -- not an error, just not ambiguous attachment
  })

  test('array-position parity holds against the REAL sibling arrays ProjectionOutput/CC-3A build from the identical interpretations input', () => {
    // Real pipeline: two claims (both tool-scoped baseline claims, unconditional)
    // feeding two distinct goal categories, proving plan.explicit_sections and
    // a goal_interpretations-equivalent array stay index-aligned because both
    // are unconditional 1:1 .map()s over the same `interpretations` array --
    // see the realization module's own header for the two call sites this
    // documents (assemble-projection-output.ts, consultative-answer-plan.ts).
    function goal(id: string, category: UserGoal['category']): UserGoal {
      return { goal_id: id, raw_text: 'x', category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'x' }
    }
    function result(claim_id: string, category: UserGoal['category']): RetrievalResult {
      return {
        source_fact: { kind: 'tool', identifier: claim_id },
        claim_id,
        matrix_identifier: claim_id,
        publication_scope: 'scope',
        candidate_statement: `stmt ${claim_id}`,
        last_verified: null,
        topic: category,
        unresolved_project_dependencies: [],
        match_origin: 'exact_topic',
        relationship_id: null,
        matched_goal_category: category,
      }
    }
    const goals = [goal('g1', 'commercial_use'), goal('g2', 'copyright_ownership')]
    const results = [result('c1', 'commercial_use'), result('c2', 'copyright_ownership')]
    const interpretations: BoundedInterpretation[] = buildBoundedInterpretations(goals, results, [])
    const plan = buildConsultativeAnswerPlan(interpretations, results, [])
    expect(plan.explicit_sections.map((s) => s.category)).toEqual(['commercial_use', 'copyright_ownership'])
    // Positional correspondence: index i of explicit_sections describes the
    // SAME goal as index i of `interpretations` -- exactly what a
    // goal_interpretations array (built the identical way) would also carry.
    expect(plan.explicit_sections.map((s) => s.goal_text)).toEqual(interpretations.map((i) => i.goal_text))
  })
})

// ── 15/16/17: correction / recomputation -- pure function, no stored state ──

describe('realizeUnresolvedApplicability -- correction semantics', () => {
  test('15/16/17: unresolved -> note exists; correction to met/not_met (no item) -> note disappears; correction back to unresolved -> note is rebuilt identically', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)

    const unresolvedState = [section()]
    const resolvedState = [section({ unresolved_items: [] })] // met or not_met both collapse to "no unresolved_applicability item"

    const first = realizeUnresolvedApplicability(unresolvedState)
    expect(first).toHaveLength(1)

    const afterCorrection = realizeUnresolvedApplicability(resolvedState)
    expect(afterCorrection).toEqual([])

    const backToUnresolved = realizeUnresolvedApplicability(unresolvedState)
    expect(backToUnresolved).toEqual(first) // byte-identical rebuild, no memoized/stale state
  })
})

// ── purity / no re-derivation / no raw text / genericity ───────────────────

describe('realizeUnresolvedApplicability -- purity and boundary discipline', () => {
  test('does not mutate its input', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const sections = [section()]
    const snapshot = JSON.stringify(sections)
    realizeUnresolvedApplicability(sections)
    expect(JSON.stringify(sections)).toEqual(snapshot)
  })

  // 18/19: import-boundary discipline, same fs-based technique already
  // established by __tests__/crc-engine/subsystem-boundaries.test.ts.
  // Scoped to actual `import` LINES only (not the whole file, which
  // legitimately discusses these concepts in prose in its own header
  // explaining what it does NOT do) -- same `importLinesOf` discipline
  // subsystem-boundaries.test.ts already uses.
  test('18/19: the realization module never imports an applicability evaluator, StructuredUnderstanding, or any Retrieval/Interview LOGIC module -- type-only cross-subsystem imports aside', () => {
    const fs = require('fs')
    const path = require('path')
    const source: string = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'crc-engine', 'unresolved-applicability-realization.ts'),
      'utf-8',
    )
    const importText = (source.match(/^import .+$/gm) ?? []).join('\n')
    expect(importText).not.toMatch(/evaluateApplicabilityDetailed|isApplicable/)
    expect(importText).not.toMatch(/StructuredUnderstanding/)
    expect(importText).not.toMatch(/lib\/retrieval-engine\/(retrieve|lookup-|enumerate-eligible-claims|extract-matchable-facts|assemble-result|matrix-fixture)/)
    expect(importText).not.toMatch(/lib\/interview-engine\//)
    expect(importText).not.toMatch(/lib\/bounded-interpretation\/(rules|build-bounded-interpretation)/)
    expect(importText).not.toMatch(/anthropic/i)
  })

  // 20: provider genericity -- no branch on any specific tool/provider name.
  test('20: the realization module contains no provider/tool-specific branch (no literal "kling"/"runway"/etc.)', () => {
    const fs = require('fs')
    const path = require('path')
    const source: string = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'crc-engine', 'unresolved-applicability-realization.ts'),
      'utf-8',
    )
    expect(source.toLowerCase()).not.toMatch(/kling|runway|suno|synthesia|storyblocks|pond5|artlist/)
  })

  test('genericity proven functionally: a second, entirely different synthetic tool produces the identical sentence shape', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const notesA = realizeUnresolvedApplicability([section({ unresolved_items: [unresolvedApplicabilityItem({ tool: SYNTH_TOOL })] })])
    const notesB = realizeUnresolvedApplicability([section({ unresolved_items: [unresolvedApplicabilityItem({ tool: OTHER_TOOL })] })])
    expect(notesA[0].text).toBe(notesB[0].text) // tool identity never appears in rendered text
    expect(notesA[0].tool).toBe(SYNTH_TOOL)
    expect(notesB[0].tool).toBe(OTHER_TOOL)
  })

  // 24: BI byte-identity -- this module never touches any BI structure; a
  // literal proof is that `section.bi_summary_blocks` passed in is never
  // read or altered.
  test('24: bi_summary_blocks is never read or referenced by the realization function', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const s = section({ bi_summary_blocks: ['UNIQUE_MARKER_TEXT_1', 'UNIQUE_MARKER_TEXT_2'] })
    const [note] = realizeUnresolvedApplicability([s])
    expect(note.text).not.toContain('UNIQUE_MARKER_TEXT')
    expect(s.bi_summary_blocks).toEqual(['UNIQUE_MARKER_TEXT_1', 'UNIQUE_MARKER_TEXT_2']) // unchanged
  })

  // 26: the composition note never independently restates BI's own conclusion.
  test('26: rendered text never independently restates Bounded Interpretation\'s own applicability conclusion or invents materiality/evidence/CA language', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const [note] = realizeUnresolvedApplicability([section()])
    expect(note.text).not.toMatch(/CRC can't determine|CRC cannot determine|may or may not apply|additional governed guidance/i)
    expect(note.text).not.toMatch(/material|significant|risk|blocks?|prevents|defeats|clears|verif|require|document|principal|severity|priority/i)
    expect(note.text).not.toMatch(/commercial assurance/i)
  })
})

// ── transport narrowing ─────────────────────────────────────────────────────

describe('toConsultativeNotes', () => {
  test('narrows to {goal_index, text} only -- no claim_id/fact/tool/category/goal_text leaks into the transport shape', () => {
    mockedAskability.mockImplementation(() => askableEntry())
    mockedLabel.mockImplementation(() => TEST_LABEL)
    const rich = realizeUnresolvedApplicability([section()])
    const narrow = toConsultativeNotes(rich)
    expect(narrow).toEqual([{ goal_index: 0, text: rich[0].text }])
    for (const n of narrow) {
      expect(Object.keys(n).sort()).toEqual(['goal_index', 'text'])
    }
  })
})
