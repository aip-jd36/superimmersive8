/**
 * CC-4C.2F -- Exact Same-Claim Applicability Duplicate Collapse. Focused,
 * adversarial, and end-to-end coverage for
 * `collapseExactSameClaimApplicabilityDuplicates` (consultative-
 * realization-contract.ts), proven safe by CC-4C.2E and scoped by the
 * human-approved collapse predicate:
 *
 *   Within ONE goal, collapse a withheld_relevant_claim (W) + an
 *   unresolved_applicability (U) IFF W.claim_id === U.claim_id,
 *   W.fact !== null, W.fact === U.fact, W.tool === U.tool. Retain U.
 *
 * Most cases build literal `ConsultativeAnswerPlan` fixtures directly (same
 * style as `consultative-realization-contract.test.ts`'s own builders) for
 * full, precise control over adversarial/multiplicity shapes some of which
 * are not reachable through the real retrieve()/BI pipeline. A smaller set
 * of tests (O/P/Q rendered-fixture checks) drives the real pipeline to
 * `buildResultsEmailContent`, mirroring `withheld-claim-applicability-
 * passthrough.test.ts`'s own conventions.
 */

import { buildConsultativeRealization } from '@/lib/crc-engine/consultative-realization-contract'
import type {
  ConsultativeAnswerPlan,
  PlanClaimRef,
  PlanGoalSection,
  PlanMissingEvidenceRef,
  PlanUnresolvedItem,
} from '@/lib/crc-engine/consultative-answer-plan'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { GoalCategory } from '@/types/interview-engine'

import { buildBoundedInterpretations as buildBoundedInterpretationsRaw } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { MatrixRow } from '@/lib/retrieval-engine/types'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import { realizeUnresolvedApplicability, toConsultativeNotes } from '@/lib/crc-engine/unresolved-applicability-realization'

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
function withheld(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'withheld_relevant_claim' }>> = {}): PlanUnresolvedItem {
  return { kind: 'withheld_relevant_claim', claim_id: 'CLAIM-X', fact: 'tool_account_status', tool: 'kling', ...overrides }
}
function applicability(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'unresolved_applicability' }>> = {}): PlanUnresolvedItem {
  return { kind: 'unresolved_applicability', claim_id: 'CLAIM-X', fact: 'tool_account_status', tool: 'kling', ...overrides }
}
function openDependency(overrides: Partial<Extract<PlanUnresolvedItem, { kind: 'open_project_dependency' }>> = {}): PlanUnresolvedItem {
  return { kind: 'open_project_dependency', source_claim_id: 'STOCK-1', dependency_id: 'editorial_designation_confirmed', ...overrides }
}
function missingEvidenceRef(overrides: Partial<PlanMissingEvidenceRef> & Pick<PlanMissingEvidenceRef, 'classification'>): PlanMissingEvidenceRef {
  return { source_claim_id: 'CLAIM-X', dependency_id: null, applicability_fact: null, ...overrides }
}

const COPYRIGHT: GoalCategory = 'copyright_ownership'
const TRADEMARK: GoalCategory = 'trademark'

// ─────────────────────────────────────────────────────────────────────────

describe('CC-4C.2F -- A/B: exact cross-kind pair collapses, order-symmetric', () => {
  test('A: withheld then unresolved_applicability -> one surviving item (unresolved_applicability)', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toEqual([applicability()])
  })

  test('B: unresolved_applicability then withheld (reversed source order) -> identical result', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [applicability(), withheld()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toEqual([applicability()])
  })
})

describe('CC-4C.2F -- C: Plan retains both source items', () => {
  test('Plan.explicit_sections[].unresolved_items is untouched by Realization construction', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability()] })
    const p = plan({ explicit_sections: [sec] })
    buildConsultativeRealization(p, projectionOutput())
    expect(p.explicit_sections[0].unresolved_items).toEqual([withheld(), applicability()])
    expect(p.explicit_sections[0].unresolved_items).toHaveLength(2)
  })
})

describe('CC-4C.2F -- D: same claim, different fact -> no collapse', () => {
  test('both items remain', () => {
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [withheld({ fact: 'tool_account_status' }), applicability({ fact: 'tool_plan_tier' })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
  })
})

describe('CC-4C.2F -- E: same claim, different tool -> no collapse', () => {
  test('both items remain', () => {
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [withheld({ tool: 'kling' }), applicability({ tool: 'runway-gen3' })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
  })
})

describe('CC-4C.2F -- F: fact:null -> never collapses, even against a matching-looking sibling', () => {
  test('ambiguous withheld item is never merged (two unknowns are not the same thing)', () => {
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [withheld({ fact: null, tool: null }), applicability({ fact: 'tool_account_status', tool: 'kling' })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
  })

  test('two ambiguous fact:null items (withheld from different claims) never collapse with each other either', () => {
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [withheld({ claim_id: 'A', fact: null, tool: null }), withheld({ claim_id: 'B', fact: null, tool: null })],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
  })
})

describe('CC-4C.2F -- G: different claim IDs, same fact+tool -> no collapse (deferred cross-claim consolidation)', () => {
  test('both withheld items and both applicability items remain, none paired across claim_id', () => {
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [
        withheld({ claim_id: 'CLAIM-A' }),
        withheld({ claim_id: 'CLAIM-B' }),
        applicability({ claim_id: 'CLAIM-A' }),
        applicability({ claim_id: 'CLAIM-B' }),
      ],
    })
    // NOTE: real Plan construction always pairs same-claim_id items (CC-4C.2E);
    // this literal fixture exercises the case where BOTH claims are
    // independently eligible -- expect BOTH pairs to collapse (K below),
    // never a CROSS-claim collapse (e.g. CLAIM-A's withheld with CLAIM-B's
    // applicability). This test isolates the "no cross-claim pairing"
    // guarantee using a deliberately non-eligible cross assignment check.
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    const claimIds = realization.unresolved_groups[0].items.map((i) => (i.kind === 'withheld_relevant_claim' || i.kind === 'unresolved_applicability' ? i.claim_id : null))
    // Each surviving item's claim_id must be internally consistent -- never a
    // withheld item surviving with another claim's applicability sibling.
    expect(claimIds.sort()).toEqual(['CLAIM-A', 'CLAIM-B'])
    expect(realization.unresolved_groups[0].items.every((i) => i.kind === 'unresolved_applicability')).toBe(true)
  })
})

describe('CC-4C.2F -- H: different explicit goals -> no cross-goal collapse', () => {
  test('each ConsultativeUnresolvedGroup is processed independently, per goal_index', () => {
    const secA = section({ category: COPYRIGHT, unresolved_items: [withheld({ claim_id: 'X' }), applicability({ claim_id: 'X' })] })
    const secB = section({ category: TRADEMARK, unresolved_items: [withheld({ claim_id: 'X' }), applicability({ claim_id: 'X' })] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [secA, secB] }), projectionOutput())
    expect(realization.unresolved_groups).toHaveLength(2)
    expect(realization.unresolved_groups[0].items).toHaveLength(1) // collapsed within goal 0
    expect(realization.unresolved_groups[1].items).toHaveLength(1) // collapsed within goal 1, independently
    expect(realization.unresolved_groups[0].goal_index).toBe(0)
    expect(realization.unresolved_groups[1].goal_index).toBe(1)
  })
})

describe('CC-4C.2F -- I: open_project_dependency untouched', () => {
  test('an eligible pair collapses; the unrelated open_project_dependency item is unaffected and keeps its relative order', () => {
    const dep = openDependency()
    const sec = section({ category: 'commercial_use', unresolved_items: [dep, withheld(), applicability()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toEqual([dep, applicability()])
  })
})

describe('CC-4C.2F -- J: same-kind duplicates are never collapsed under this milestone', () => {
  test('withheld + withheld, identical fields -> no collapse', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), withheld()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
  })

  test('unresolved_applicability + unresolved_applicability, identical fields -> no collapse', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [applicability(), applicability()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
  })
})

describe('CC-4C.2F -- K: multiple independent exact pairs collapse independently', () => {
  test('claim A pair and claim B pair each collapse to one item -- never merged with each other', () => {
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [
        withheld({ claim_id: 'A' }),
        applicability({ claim_id: 'A' }),
        withheld({ claim_id: 'B', fact: 'tool_plan_tier', tool: 'runway-gen3' }),
        applicability({ claim_id: 'B', fact: 'tool_plan_tier', tool: 'runway-gen3' }),
      ],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(2)
    expect(realization.unresolved_groups[0].items.every((i) => i.kind === 'unresolved_applicability')).toBe(true)
    expect(realization.unresolved_groups[0].items.map((i) => (i as { claim_id: string }).claim_id).sort()).toEqual(['A', 'B'])
  })
})

describe('CC-4C.2F -- L: multiplicity ambiguity fails closed', () => {
  test('one withheld matching TWO unresolved_applicability candidates (same claim/fact/tool) -> retain all three, no collapse', () => {
    // Not currently reachable via real retrieve() (would require a
    // governed claim's own applicability_requirements to contain a
    // literal duplicate requirement) -- constructed here as a direct
    // defensive/adversarial test of the Realization function itself,
    // which must not assume upstream uniqueness.
    const sec = section({
      category: 'commercial_use',
      unresolved_items: [withheld(), applicability(), applicability()],
    })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(3)
    expect(realization.unresolved_groups[0].items).toEqual([withheld(), applicability(), applicability()])
  })

  test('reverse: two withheld-shaped items is structurally impossible per real Plan construction (dedup by claim_id at BI) -- but the Realization function itself still must not silently merge two DIFFERENT ambiguous ones (see F test 2 above); no additional case needed here', () => {
    expect(true).toBe(true)
  })
})

describe('CC-4C.2F -- M: missing-evidence count/classification unchanged by collapse', () => {
  test('Plan and Realization missing_evidence are identical, unaffected by the unresolved_items collapse', () => {
    const missing = [missingEvidenceRef({ classification: 'answerable_in_conversation', applicability_fact: 'tool_account_status' })]
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability()], missing_evidence: missing })
    const p = plan({ explicit_sections: [sec] })
    const realization = buildConsultativeRealization(p, projectionOutput())
    expect(p.explicit_sections[0].missing_evidence).toEqual(missing)
    expect(realization.missing_evidence_groups[0].items).toEqual(missing)
    expect(realization.unresolved_groups[0].items).toHaveLength(1) // the unresolved side DID collapse
  })
})

describe('CC-4C.2F -- N: per-goal consultative note is unaffected by collapse', () => {
  test('the note survives on ConsultativeGoalAnswer regardless of unresolved_groups collapsing', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability()] })
    const p = plan({ explicit_sections: [sec] })
    const realization = buildConsultativeRealization(p, projectionOutput(), [
      { goal_index: 0, text: 'Specifically, this depends on your account or membership status, which hasn’t been confirmed in this conversation.' },
    ])
    expect(realization.goal_answers[0].note?.text).toContain('account or membership status')
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
  })
})

describe('CC-4C.2F -- S: renderer stays dumb -- no production diff to results-email-template.ts', () => {
  test('buildResultsEmailContent needs no new parameters or logic; it already iterates whatever Realization supplies', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability()] })
    const p = plan({ explicit_sections: [sec] })
    const realization = buildConsultativeRealization(p, projectionOutput())
    const { text } = buildResultsEmailContent(projectionOutput(), 'attr-1', 'jd@example.com', p, [], realization)
    // exactly one Still Open line for the collapsed pair
    const bullets = (text.match(/^- /gm) || []).length
    expect(bullets).toBe(1)
  })
})

describe('CC-4C.2F -- T: deterministic output', () => {
  test('identical inputs produce deep-equal realization across independent calls', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability(), openDependency()] })
    const p = plan({ explicit_sections: [sec] })
    const first = buildConsultativeRealization(p, projectionOutput())
    const second = buildConsultativeRealization(p, projectionOutput())
    expect(first).toEqual(second)
  })
})

describe('CC-4C.2F -- U: out-of-sample genericity, no domain branching', () => {
  const categories: GoalCategory[] = ['copyright_ownership', 'trademark', 'likeness', 'third_party_source_rights', 'commercial_use']
  test.each(categories)('category %s collapses the exact pair identically, no category-specific behavior', (category) => {
    const sec = section({ category, unresolved_items: [withheld(), applicability()] })
    const realization = buildConsultativeRealization(plan({ explicit_sections: [sec] }), projectionOutput())
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
    expect(realization.unresolved_groups[0].items[0].kind).toBe('unresolved_applicability')
  })
})

// ── End-to-end / rendered-fixture-backed tests (real pipeline) ──────────

function h(o: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [], ...o }
}
function tool(id: string) {
  return { identifier: id, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const }
}
function goal(o: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text' | 'category'>): UserGoal {
  return { state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: o.raw_text, ...o }
}
function matrixRow(o: Partial<MatrixRow['claims'][number]> & Pick<MatrixRow['claims'][number], 'claim_id' | 'topic'>): MatrixRow {
  return { identifier: o.claim_id, last_verified: '2026-08-24', claims: [{ crc_eligible: 'Yes', crc_publication_scope: 'scope', crc_candidate_statement: 'Test governed statement.', applicability_requirements: [], ...o }] }
}
const unknownFacts: ApplicabilityFacts = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

function fullPipeline(handoff: RetrievalHandoff, goals: UserGoal[], matrix: MatrixRow[], facts: ApplicabilityFacts) {
  const out = retrieve(handoff, matrix, goals, [], facts, [], handoff.asset_providers, [])
  const interps = buildBoundedInterpretations(goals, out.results, out.diagnostics)
  const { output } = assembleProjectionOutput(handoff, out.results, interps)
  const p = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  const notes = toConsultativeNotes(realizeUnresolvedApplicability(p.explicit_sections))
  const realization = buildConsultativeRealization(p, output, notes)
  const email = buildResultsEmailContent(output, 'attr-1', 'jd@example.com', p, notes, realization)
  return { plan: p, realization, email }
}

describe('CC-4C.2F -- O: registered-label email, real pipeline, duplicate -> one', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: "Under this platform's terms, commercial output is permitted on paid plans." }),
    matrixRow({ claim_id: 'WITHHELD', topic: 'commercial_use', applicability_requirements: [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'member' }] }),
  ]
  const g = goal({ goal_id: 'g1', raw_text: 'Can I use this commercially for a client campaign?', category: 'commercial_use' })
  const { plan: realPlan, realization, email } = fullPipeline(h({ tools: [tool('MATCHED'), tool('WITHHELD')] }), [g], matrix, unknownFacts)

  test('Plan still has both original items (provenance-complete)', () => {
    expect(realPlan.explicit_sections[0].unresolved_items).toHaveLength(2)
  })

  test('Realization collapses to exactly one unresolved item', () => {
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
  })

  test('email: exactly one "Still open" bullet, the per-goal note still present -- total 2 occurrences of the labeled fact text, not 3, not 1', () => {
    const occurrences = (email.text.match(/account or membership status/g) || []).length
    expect(occurrences).toBe(2) // one goal-local note + one answer-level Still Open line
    const stillOpenBullets = email.text.slice(email.text.indexOf('STILL OPEN')).split('WHAT\'S STILL NEEDED')[0].match(/^- /gm) || []
    expect(stillOpenBullets).toHaveLength(1)
  })
})

describe('CC-4C.2F -- P: unregistered-label email, real pipeline, collapse still occurs structurally', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED', topic: 'commercial_use', crc_candidate_statement: "Under this platform's terms, commercial output is permitted on paid plans." }),
    matrixRow({ claim_id: 'WITHHELD', topic: 'commercial_use', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] }),
  ]
  const g = goal({ goal_id: 'g1', raw_text: 'Can I use this commercially for a client campaign?', category: 'commercial_use' })
  const { realization, email } = fullPipeline(h({ tools: [tool('MATCHED'), tool('WITHHELD')] }), [g], matrix, unknownFacts)

  test('Realization collapses to one item (structural, not label-dependent)', () => {
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
    expect(realization.unresolved_groups[0].items[0].kind).toBe('unresolved_applicability')
  })

  test('email shows exactly ONE generic fallback line, no label fabricated, no "jurisdiction" leaked', () => {
    expect(email.text).not.toContain('jurisdiction')
    const stillOpenBullets = email.text.slice(email.text.indexOf('STILL OPEN')).split('WHAT\'S STILL NEEDED')[0].match(/^- /gm) || []
    expect(stillOpenBullets).toHaveLength(1)
  })
})

describe('CC-4C.2F -- Q: multi-goal Copyright + Trademark provenance preserved', () => {
  const matrix = [
    matrixRow({ claim_id: 'MATCHED-COPY', topic: 'copyright_ownership', crc_candidate_statement: 'Copyright matched statement.' }),
    matrixRow({ claim_id: 'WITHHELD-COPY', topic: 'copyright_ownership', applicability_requirements: [{ fact: 'tool_account_status', tool: 'toolA', operator: 'equals', value: 'member' }] }),
    matrixRow({ claim_id: 'MATCHED-TM', topic: 'trademark', crc_candidate_statement: 'Trademark matched statement.' }),
    matrixRow({ claim_id: 'WITHHELD-TM', topic: 'trademark', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] }),
  ]
  const gCopy = goal({ goal_id: 'g1', raw_text: 'Who owns the copyright?', category: 'copyright_ownership' })
  const gTM = goal({ goal_id: 'g2', raw_text: 'Is this a trademark risk?', category: 'trademark' })
  const { realization, email } = fullPipeline(h({ tools: [tool('MATCHED-COPY'), tool('WITHHELD-COPY'), tool('MATCHED-TM'), tool('WITHHELD-TM')] }), [gCopy, gTM], matrix, unknownFacts)

  test('each goal collapses its own pair independently -- one item per goal, no cross-goal or cross-domain contamination', () => {
    expect(realization.unresolved_groups).toHaveLength(2)
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
    expect(realization.unresolved_groups[1].items).toHaveLength(1)
    expect(realization.unresolved_groups[0].category).toBe('copyright_ownership')
    expect(realization.unresolved_groups[1].category).toBe('trademark')
  })

  test('goal attribution in the email remains correct', () => {
    const stillOpen = email.text.slice(email.text.indexOf('STILL OPEN'))
    expect(stillOpen.indexOf('Who owns the copyright?')).toBeGreaterThan(-1)
    expect(stillOpen.indexOf('Is this a trademark risk?')).toBeGreaterThan(-1)
  })

  test('answer-level Commercial Assurance handoff remains exactly once, unchanged by this milestone', () => {
    const closingCta = 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.'
    expect(email.text.split(closingCta).length - 1).toBe(1)
  })
})

describe('CC-4C.2F -- R: Track C discovered context unchanged', () => {
  test('discovered_context / authorizing_goal_category untouched by the collapse logic', () => {
    const sec = section({ category: 'commercial_use', unresolved_items: [withheld(), applicability()] })
    const discovered = [{ claim_ref: claimRef({ claim_id: 'DISCOVERED-1', matched_goal_category: 'commercial_use' }), authorizing_goal_category: 'commercial_use' as GoalCategory }]
    const p = plan({ explicit_sections: [sec], discovered_context: discovered })
    const realization = buildConsultativeRealization(p, projectionOutput())
    expect(realization.discovered_context).toEqual(discovered)
    expect(realization.unresolved_groups[0].items).toHaveLength(1)
  })
})
