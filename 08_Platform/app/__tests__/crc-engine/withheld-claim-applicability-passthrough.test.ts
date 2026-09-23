/**
 * CC-4C.2D -- Withheld Claim Applicability-Fact Passthrough. End-to-end and
 * adversarial coverage for the bounded `fact`/`tool` passthrough on
 * `withheld_relevant_claim`, from real `retrieve()` diagnostics through
 * Bounded Interpretation, `ConsultativeAnswerPlan`, `ConsultativeRealization`,
 * and the email renderer.
 *
 * Complements (does not replace) the updated assertions in
 * `__tests__/bounded-interpretation/build-bounded-interpretation.test.ts`
 * (which already prove the BI-level passthrough against the full real
 * `retrieve()` pipeline, including the pre-existing one-claim-two-facts
 * fixture, CASE F). This file focuses on: full-stack wiring through Plan/
 * Realization/email, adversarial leakage checks (candidate_statement,
 * operator, value, claim_id, tool), the registered/unregistered label
 * cases end-to-end, and out-of-sample genericity.
 */

import { buildBoundedInterpretations as buildBoundedInterpretationsRaw } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { MatrixRow } from '@/lib/retrieval-engine/types'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'
import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import { realizeUnresolvedApplicability, toConsultativeNotes } from '@/lib/crc-engine/unresolved-applicability-realization'
import type { GoalCategory } from '@/types/interview-engine'

const buildBoundedInterpretations = (goals: UserGoal[], results: Parameters<typeof buildBoundedInterpretationsRaw>[1], diagnostics?: Parameters<typeof buildBoundedInterpretationsRaw>[2]) =>
  buildBoundedInterpretationsRaw(userGoalsToBiIntents(goals), results, diagnostics)

// ── builders (mirrors build-bounded-interpretation.test.ts's own conventions) ──

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [], ...overrides }
}
function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const }
}
function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text' | 'category'>): UserGoal {
  return { state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: overrides.raw_text, ...overrides }
}
function toolMention(identifier: string, overrides: Partial<ToolMention> = {}): ToolMention {
  return { mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier }, access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null, ...overrides }
}
function matrixRow(overrides: Partial<MatrixRow['claims'][number]> & Pick<MatrixRow['claims'][number], 'claim_id' | 'topic'>): MatrixRow {
  return {
    identifier: overrides.claim_id,
    last_verified: '2026-08-24',
    claims: [{ crc_eligible: 'Yes', crc_publication_scope: 'Test scope text.', crc_candidate_statement: 'Test governed statement.', applicability_requirements: [], ...overrides }],
  }
}
const unknownFacts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

/** Full pipeline: retrieve() -> BI -> Plan -> notes -> Realization -> email. Mirrors run-crc-conversation.ts's own sequence. */
function fullPipeline(h: RetrievalHandoff, goals: UserGoal[], matrix: MatrixRow[], facts: ApplicabilityFacts) {
  const out = retrieve(h, matrix, goals, [], facts, [], h.asset_providers, [])
  const interps = buildBoundedInterpretations(goals, out.results, out.diagnostics)
  const { output } = assembleProjectionOutput(h, out.results, interps)
  const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  const notes = toConsultativeNotes(realizeUnresolvedApplicability(plan.explicit_sections))
  const realization = buildConsultativeRealization(plan, output, notes)
  const email = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan, notes, realization)
  return { out, interps, output, plan, notes, realization, email }
}

const SENTINEL_STATEMENT = 'SENTINEL-PROPOSITION-MUST-NEVER-LEAK-4C2D'
const SENTINEL_VALUE = 'SENTINEL-VALUE-9182-must-never-leak'

// ─────────────────────────────────────────────────────────────────────────

describe('CC-4C.2D -- A/B/C/D/E: BI-level field retention/exclusion', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' }),
    matrixRow({
      claim_id: 'WITHHELD',
      topic: 'commercial_use',
      crc_candidate_statement: SENTINEL_STATEMENT,
      applicability_requirements: [{ fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: SENTINEL_VALUE }],
    }),
  ]
  const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
  const out = retrieve(handoff({ tools: [tool('MATCHED'), tool('WITHHELD')] }), matrix, [g], [], unknownFacts)
  const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
  const withheld = interp.unresolved_relevant_claims.find((c) => c.claim_id === 'WITHHELD')

  test('A: BI retains fact for the withheld relevant claim', () => {
    expect(withheld?.fact).toBe('tool_account_status')
  })

  test('B: BI retains optional tool when present', () => {
    expect(withheld?.tool).toBe('synthtool')
  })

  test('C: BI does not retain operator anywhere on the withheld item', () => {
    expect(withheld).not.toHaveProperty('operator')
    expect(JSON.stringify(withheld)).not.toContain('equals')
  })

  test('D: BI does not retain value anywhere on the withheld item', () => {
    expect(withheld).not.toHaveProperty('value')
    expect(JSON.stringify(withheld)).not.toContain(SENTINEL_VALUE)
  })

  test('E: BI does not retain candidate_statement anywhere on the withheld item', () => {
    expect(JSON.stringify(withheld)).not.toContain(SENTINEL_STATEMENT)
    expect(JSON.stringify(interp.unresolved_relevant_claims)).not.toContain(SENTINEL_STATEMENT)
  })
})

describe('CC-4C.2D -- F/G: Plan and Realization copy verbatim', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' }),
    matrixRow({ claim_id: 'WITHHELD', topic: 'commercial_use', applicability_requirements: [{ fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: 'paid' }] }),
  ]
  const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
  const out = retrieve(handoff({ tools: [tool('MATCHED'), tool('WITHHELD')] }), matrix, [g], [], unknownFacts)
  const [interp] = buildBoundedInterpretations([g], out.results, out.diagnostics)
  const plan = buildConsultativeAnswerPlan([interp], out.results, out.diagnostics)
  const { output } = assembleProjectionOutput(handoff(), out.results, [interp])
  const realization = buildConsultativeRealization(plan, output)

  test('F: Plan copies claim_id + fact + tool exactly from BI, no lookups back into Retrieval', () => {
    const planItem = plan.explicit_sections[0].unresolved_items.find((i) => i.kind === 'withheld_relevant_claim')
    const biItem = interp.unresolved_relevant_claims.find((c) => c.claim_id === 'WITHHELD')
    expect(planItem).toEqual({ kind: 'withheld_relevant_claim', claim_id: 'WITHHELD', fact: biItem?.fact, tool: biItem?.tool, unresolved_reason: biItem?.unresolved_reason })
  })

  // CC-4C.2F (2026-09-19): this fixture's WITHHELD claim is EXACTLY the
  // exact same-claim collapse-eligible shape CC-4C.2E proved (its own
  // `unresolved_relevant_claims` entry and its own raw-diagnostic
  // `unresolved_applicability` sibling share identical claim_id/fact/tool).
  // Test G's own original premise ("Realization preserves the Plan item
  // exactly, unchanged") no longer holds for `withheld_relevant_claim`
  // specifically -- this is the intended, human-approved behavior change
  // this milestone implements, not a regression. Plan itself remains
  // fully unchanged (still proven by Test F, and independently by
  // CC-4C.2F's own Plan-preservation tests).
  test('G (CC-4C.2F-revised): the eligible withheld_relevant_claim/unresolved_applicability pair collapses in Realization -- the unresolved_applicability sibling survives verbatim from Plan, the withheld item does not', () => {
    const planWithheldItem = plan.explicit_sections[0].unresolved_items.find((i) => i.kind === 'withheld_relevant_claim')
    const planApplicabilityItem = plan.explicit_sections[0].unresolved_items.find((i) => i.kind === 'unresolved_applicability')
    expect(planWithheldItem).toBeDefined() // Plan still has it -- provenance-complete
    const realizationWithheldItem = realization.unresolved_groups[0].items.find((i) => i.kind === 'withheld_relevant_claim')
    const realizationApplicabilityItem = realization.unresolved_groups[0].items.find((i) => i.kind === 'unresolved_applicability')
    expect(realizationWithheldItem).toBeUndefined() // collapsed
    expect(realizationApplicabilityItem).toEqual(planApplicabilityItem) // surviving item copied verbatim
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
  })
})

describe('CC-4C.2D -- H: registered tool_account_status label, full pipeline', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' }),
    matrixRow({
      claim_id: 'WITHHELD',
      topic: 'commercial_use',
      crc_candidate_statement: SENTINEL_STATEMENT,
      applicability_requirements: [{ fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: SENTINEL_VALUE }],
    }),
  ]
  const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
  const { email } = fullPipeline(handoff({ tools: [tool('MATCHED'), tool('WITHHELD')] }), [g], matrix, unknownFacts)

  test('user learns the unresolved information category (account or membership status)', () => {
    expect(email.text).toContain('account or membership status')
  })

  test('user does NOT learn the withheld proposition', () => {
    expect(email.html).not.toContain(SENTINEL_STATEMENT)
    expect(email.text).not.toContain(SENTINEL_STATEMENT)
  })

  test('user does NOT learn the required operator/value', () => {
    expect(email.html).not.toContain(SENTINEL_VALUE)
    expect(email.text).not.toContain(SENTINEL_VALUE)
    expect(email.html.toLowerCase()).not.toMatch(/\bequals\b/)
  })

  test('no new provider-specific interpretation appears (tool name "synthtool" is never rendered)', () => {
    expect(email.html).not.toContain('synthtool')
    expect(email.text).not.toContain('synthtool')
  })

  test('"Still open" section is present and uses the bounded fact-category sentence', () => {
    expect(email.text).toMatch(/still open/i)
    expect(email.text).toContain('Your account or membership status hasn’t been confirmed in this conversation.'.replace('’', "'"))
  })
})

describe('CC-4C.2D -- I: unregistered ApplicabilityFact fails closed, full pipeline', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' }),
    matrixRow({
      claim_id: 'WITHHELD',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    }),
  ]
  const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
  const { interps, email } = fullPipeline(handoff({ tools: [tool('MATCHED'), tool('WITHHELD')] }), [g], matrix, unknownFacts)

  test('getApplicabilityFactLabel is undefined for jurisdiction (not registered) -- reconfirmed, not assumed', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getApplicabilityFactLabel } = require('@/lib/crc-engine/applicability-fact-display')
    expect(getApplicabilityFactLabel('jurisdiction')).toBeUndefined()
  })

  test('BI still carries the fact (jurisdiction) even though no label is registered for it', () => {
    expect(interps[0].unresolved_relevant_claims.find((c: { claim_id: string }) => c.claim_id === 'WITHHELD')?.fact).toBe('jurisdiction')
  })

  // CC-4C.2F (2026-09-19): this WITHHELD/jurisdiction fixture is ALSO the
  // exact same-claim collapse-eligible shape (non-null fact, matching
  // unresolved_applicability sibling) -- so it now collapses to ONE
  // "Still open" line, surviving as `unresolved_applicability`'s own
  // fallback sentence ("A related condition..."), not
  // `withheld_relevant_claim`'s own ("An additional governed
  // consideration..."). Fail-closed behavior (no label fabricated) is
  // still fully intact -- this test now also proves the duplicate is gone.
  test('email retains the existing generic fallback sentence, now exactly once -- fail-closed behavior is a PASS, no label is fabricated', () => {
    expect(email.text).toContain("A related condition hasn't been confirmed in this conversation.")
    expect(email.text).not.toContain('jurisdiction')
    const stillOpenLines = (email.text.match(/hasn't been confirmed in this conversation\./g) || []).length
    expect(stillOpenLines).toBe(1)
  })
})

describe('CC-4C.2D -- N: open_project_dependency output unchanged/generic (regression)', () => {
  test('a documentary-evidence open_project_dependency still renders the existing generic sentence, never a new label', () => {
    const plan = {
      explicit_sections: [
        {
          goal_text: 'Can I use this commercially?',
          category: 'commercial_use' as const,
          bi_status: 'directly_relevant' as const,
          disposition: 'governed_guidance_available_with_open_items' as const,
          supported_claim_refs: [],
          summary_claim_refs: [],
          unresolved_items: [{ kind: 'open_project_dependency' as const, source_claim_id: 'C1', dependency_id: 'editorial_designation_confirmed' }],
          missing_evidence: [{ source_claim_id: 'C1', dependency_id: 'editorial_designation_confirmed', applicability_fact: null, classification: 'requires_documentary_evidence' as const }],
          boundary_ref: 'tool_source' as const,
          bi_summary_blocks: ['Governed text.'],
        },
      ],
      discovered_context: [],
      render_once_markers: [],
      commercial_assurance_refs: [],
    }
    const output = { opening_line: "Here's what I understood.", understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' }
    const realization = buildConsultativeRealization(plan, output)
    const { html, text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan, [], realization)
    expect(text).toContain("An additional governed consideration for this topic hasn't been confirmed.")
    expect(html).not.toContain('editorial_designation_confirmed')
    expect(text).not.toContain('editorial_designation_confirmed')
    expect(text).toContain('requires supporting documentation')
  })
})

describe('CC-4C.2D -- O: unresolved_applicability behavior unchanged (regression)', () => {
  test('an already-matched claim\'s own unresolved_applicability item still uses getApplicabilityFactLabel exactly as before', () => {
    const matrix = [
      matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.', applicability_requirements: [{ fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: 'paid' }] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const { email } = fullPipeline(handoff({ tools: [tool('MATCHED')] }), [g], matrix, unknownFacts)
    expect(email.text).toContain('account or membership status')
  })
})

describe('CC-4C.2D -- P: multiple explicit goals preserve provenance / no contamination', () => {
  const matrixCopy = [
    matrixRow({ claim_id: 'MATCHED-COPY', topic: 'copyright_ownership', crc_candidate_statement: 'Copyright matched statement.' }),
    matrixRow({ claim_id: 'WITHHELD-COPY', topic: 'copyright_ownership', crc_candidate_statement: 'SENTINEL-COPY', applicability_requirements: [{ fact: 'tool_account_status', tool: 'toolA', operator: 'equals', value: 'x' }] }),
  ]
  const matrixTrademark = [
    matrixRow({ claim_id: 'MATCHED-TM', topic: 'trademark', crc_candidate_statement: 'Trademark matched statement.' }),
    matrixRow({ claim_id: 'WITHHELD-TM', topic: 'trademark', crc_candidate_statement: 'SENTINEL-TM', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] }),
  ]
  const matrix = [...matrixCopy, ...matrixTrademark]
  const gCopy = goal({ goal_id: 'g-1', raw_text: 'Who owns the copyright?', category: 'copyright_ownership' })
  const gTM = goal({ goal_id: 'g-2', raw_text: 'Is this a trademark risk?', category: 'trademark' })
  const { plan, realization, email } = fullPipeline(
    handoff({ tools: [tool('MATCHED-COPY'), tool('WITHHELD-COPY'), tool('MATCHED-TM'), tool('WITHHELD-TM')] }),
    [gCopy, gTM],
    matrix,
    unknownFacts,
  )

  test('two goals, two separate unresolved_groups, correct fact per goal', () => {
    expect(realization.unresolved_groups).toHaveLength(2)
    const copyGroup = realization.unresolved_groups.find((g) => g.category === 'copyright_ownership')
    const tmGroup = realization.unresolved_groups.find((g) => g.category === 'trademark')
    expect((copyGroup?.items[0] as { fact: string | null }).fact).toBe('tool_account_status')
    expect((tmGroup?.items[0] as { fact: string | null }).fact).toBe('jurisdiction')
  })

  test('no cross-goal contamination -- the account-status label attributes only to the Copyright "For:" group', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'))
    const forCopyright = stillOpen.indexOf('Who owns the copyright?')
    const forTrademark = stillOpen.indexOf('Is this a trademark risk?')
    expect(forCopyright).toBeGreaterThan(-1)
    expect(forTrademark).toBeGreaterThan(-1)
    const copyrightBlock = stillOpen.slice(forCopyright, forTrademark)
    expect(copyrightBlock).toContain('account or membership status')
    expect(copyrightBlock).not.toContain('jurisdiction')
  })

  test('no withheld candidate_statement leaks for either goal', () => {
    expect(email.text).not.toContain('SENTINEL-COPY')
    expect(email.text).not.toContain('SENTINEL-TM')
  })

  test('plan explicit_sections categories preserved in order, unaffected by this milestone', () => {
    expect(plan.explicit_sections.map((s) => s.category)).toEqual(['copyright_ownership', 'trademark'])
  })
})

describe('CC-4C.2D -- Q: Track C discovered context unchanged', () => {
  test('discovered_context / authorizing_goal_category shape is untouched by this milestone', () => {
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const matrix = [matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' })]
    const { plan, realization } = fullPipeline(handoff({ tools: [tool('MATCHED')] }), [g], matrix, unknownFacts)
    expect(plan.discovered_context).toEqual([])
    expect(realization.discovered_context).toEqual([])
    // No fabricated UserGoal / explicit goal created from a withheld claim's fact/tool.
    expect(plan.explicit_sections).toHaveLength(1)
  })
})

describe('CC-4C.2D -- R: evidence-only / documentary dependency behavior unchanged', () => {
  test('a stock-shaped evidence-only dependency (editorial_designation_confirmed) still classifies requires_documentary_evidence, never answerable_in_conversation', () => {
    const plan = {
      explicit_sections: [
        {
          goal_text: 'Can I use this stock footage commercially?',
          category: 'commercial_use' as const,
          bi_status: 'directly_relevant' as const,
          disposition: 'governed_guidance_available_with_open_items' as const,
          supported_claim_refs: [],
          summary_claim_refs: [],
          unresolved_items: [{ kind: 'open_project_dependency' as const, source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed' }],
          missing_evidence: [{ source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed', applicability_fact: null, classification: 'requires_documentary_evidence' as const }],
          boundary_ref: 'tool_source' as const,
          bi_summary_blocks: ['Governed text.'],
        },
      ],
      discovered_context: [],
      render_once_markers: [],
      commercial_assurance_refs: [],
    }
    const output = { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' }
    const realization = buildConsultativeRealization(plan, output)
    expect(realization.missing_evidence_groups[0].items[0].classification).toBe('requires_documentary_evidence')
    const { text } = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', plan, [], realization)
    expect(text.toLowerCase()).not.toMatch(/just confirm|simply confirm/)
  })
})

describe('CC-4C.2D -- S: deterministic realization/output', () => {
  test('identical inputs produce deep-equal realization and email output', () => {
    const matrix = [
      matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' }),
      matrixRow({ claim_id: 'WITHHELD', topic: 'commercial_use', applicability_requirements: [{ fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: 'paid' }] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const h = handoff({ tools: [tool('MATCHED'), tool('WITHHELD')] })
    const first = fullPipeline(h, [g], matrix, unknownFacts)
    const second = fullPipeline(h, [g], matrix, unknownFacts)
    expect(first.realization).toEqual(second.realization)
    expect(first.email).toEqual(second.email)
  })
})

describe('CC-4C.2D -- T: out-of-sample genericity across GoalCategory values, no domain branches', () => {
  const categories: GoalCategory[] = ['copyright_ownership', 'trademark', 'likeness', 'third_party_source_rights']
  test.each(categories)('category %s: withheld claim with tool_account_status renders the identical bounded label, no category-specific wording', (category) => {
    const matrix = [
      matrixRow({ claim_id: 'MATCHED', topic: category, crc_candidate_statement: 'Matched governed statement.' }),
      matrixRow({ claim_id: 'WITHHELD', topic: category, applicability_requirements: [{ fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: 'paid' }] }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'A question about this.', category })
    const { email } = fullPipeline(handoff({ tools: [tool('MATCHED'), tool('WITHHELD')] }), [g], matrix, unknownFacts)
    expect(email.text).toContain('account or membership status')
  })
})

describe('CC-4C.2D -- U: multiple unresolved facts / claim ambiguity fails closed (see also build-bounded-interpretation.test.ts CASE F)', () => {
  test('a withheld claim with two distinct unresolved facts fails closed to {fact: null, tool: null} at BI, and to the generic sentence in the email -- never picks one arbitrarily', () => {
    const matrix = [
      matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: 'Matched governed statement.' }),
      matrixRow({
        claim_id: 'AMBIGUOUS',
        topic: 'commercial_use',
        applicability_requirements: [
          { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
          { fact: 'tool_account_status', tool: 'synthtool', operator: 'equals', value: 'paid' },
        ],
      }),
    ]
    const g = goal({ goal_id: 'g-1', raw_text: 'Can I use this commercially?', category: 'commercial_use' })
    const facts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [toolMention('synthtool')] }
    const { interps, plan, realization, email } = fullPipeline(handoff({ tools: [tool('MATCHED'), tool('AMBIGUOUS')] }), [g], matrix, facts)
    const item = interps[0].unresolved_relevant_claims.find((c) => c.claim_id === 'AMBIGUOUS')
    expect(item).toEqual({ claim_id: 'AMBIGUOUS', fact: null, tool: null, unresolved_reason: null })

    // NOTE: the SAME claim's two `unmet_applicability` diagnostic entries
    // ALSO, independently, each produce their own `unresolved_applicability`
    // PlanUnresolvedItem (consultative-answer-plan.ts's second, pre-existing
    // loop over raw `diagnostics`, unrelated to and unchanged by this
    // milestone -- it never checks `matchedClaimIds` and was never scoped
    // to "only for claims that are also matched"). So the email legitimately
    // DOES render "account or membership status" via that SIBLING item --
    // this is pre-existing, unrelated behavior, not this test's concern.
    // What THIS test must isolate and prove is the `withheld_relevant_claim`
    // item specifically, at the Plan/Realization level, structurally.
    const withheldItem = plan.explicit_sections[0].unresolved_items.find((i) => i.kind === 'withheld_relevant_claim')
    expect(withheldItem).toEqual({ kind: 'withheld_relevant_claim', claim_id: 'AMBIGUOUS', fact: null, tool: null, unresolved_reason: null })
    const withheldRealizationItem = realization.unresolved_groups[0].items.find((i) => i.kind === 'withheld_relevant_claim')
    expect(withheldRealizationItem).toEqual(withheldItem)
    expect(email.text).toContain("An additional governed consideration for this topic hasn't been confirmed.")
  })
})
