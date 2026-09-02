/**
 * CC-3A -- Deterministic Consultative Answer Plan suite.
 *
 * Every case is deterministic (no live model). CASE 1 and CASE 2 drive the
 * REAL upstream pipeline (retrieve() + buildBoundedInterpretations() over
 * MATRIX_FIXTURE) so the plan is proven against authentic bounded state.
 * CASE 3-8 use focused literal inputs to pin the pure-function contract
 * (match_origin routing, correction, evidence classification, fail-closed
 * provenance, dedup intent, stable ordering) precisely.
 *
 * The planner has no call sites in production code -- these tests are the
 * only consumer in CC-3A.
 */

import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BoundedInterpretation, InterpretationStatus } from '@/lib/bounded-interpretation/types'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalDiagnostic, RetrievalResult } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

// ── input builders ─────────────────────────────────────────────────────────

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    asset_providers: [],
    unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}

function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text' | 'category'>): UserGoal {
  return {
    state: 'confirmed',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
    ...overrides,
  }
}

function toolMention(identifier: string, overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: `m-${identifier}`,
    resolution: { kind: 'canonical', identifier },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: identifier,
    superseded_by: null,
    ...overrides,
  }
}

const NO_JURISDICTION = { included: [], excluded: [] }

function facts(toolMentions: ToolMention[] = []): ApplicabilityFacts {
  return { jurisdiction: NO_JURISDICTION, toolMentions }
}

// literal RetrievalResult -- for the cases that pin match_origin / provenance / dedup
function result(overrides: Partial<RetrievalResult> & Pick<RetrievalResult, 'claim_id' | 'matched_goal_category'>): RetrievalResult {
  return {
    source_fact: { kind: 'tool', identifier: overrides.claim_id },
    matrix_identifier: overrides.claim_id,
    publication_scope: 'scope',
    candidate_statement: `stmt for ${overrides.claim_id}`,
    last_verified: '2026-09-01',
    topic: overrides.matched_goal_category,
    unresolved_project_dependencies: [],
    match_origin: 'exact_topic',
    relationship_id: null,
    ...overrides,
  }
}

/**
 * Serialize the plan with every `bi_summary_blocks` blanked -- that field is
 * the DELIBERATE verbatim passthrough of the already-governed BI summary and
 * is allowed to contain claim prose. Everything ELSE the plan carries must be
 * references / structural data only, never governed prose.
 */
function planWithoutBiPassthrough(plan: ReturnType<typeof buildConsultativeAnswerPlan>): string {
  return JSON.stringify(plan, (key, value) => (key === 'bi_summary_blocks' ? [] : value))
}

function interp(overrides: Partial<BoundedInterpretation> & Pick<BoundedInterpretation, 'goal_id' | 'category' | 'status'>): BoundedInterpretation {
  return {
    goal_text: `goal for ${overrides.category}`,
    summary: 'summary',
    summary_blocks: ['summary'],
    supporting_claim_ids: [],
    unresolved_relevant_claims: [],
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CC-3A -- CASE 1: straightforward governed result (real pipeline, Runway)', () => {
  const g = goal({ goal_id: 'g1', raw_text: 'Can I use it commercially?', category: 'commercial_use' })
  const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE, [g], [], facts())
  const interps = buildBoundedInterpretations([g], out.results, out.diagnostics)
  const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  const section = plan.explicit_sections[0]

  test('exactly one explicit section, disposition governed_guidance_available', () => {
    expect(plan.explicit_sections).toHaveLength(1)
    expect(section.disposition).toBe('governed_guidance_available')
    expect(section.bi_status).toBe('directly_relevant')
  })

  test('the supporting claim is referenced with full provenance, no prose copied', () => {
    expect(section.supported_claim_refs).toEqual([
      expect.objectContaining({ claim_id: 'runway-gen3', matrix_identifier: 'runway-gen3', match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null }),
    ])
    // the plan carries NO governed candidate_statement prose outside the
    // deliberate bi_summary_blocks passthrough
    expect(planWithoutBiPassthrough(plan)).not.toContain('Runway')
    for (const ref of section.supported_claim_refs) {
      expect(Object.keys(ref).sort()).toEqual(['claim_id', 'last_verified', 'match_origin', 'matched_goal_category', 'matrix_identifier', 'relationship_id'])
    }
  })

  test('no unresolved items, no missing evidence, no CA refs, tool-sourced boundary', () => {
    expect(section.unresolved_items).toEqual([])
    expect(section.missing_evidence).toEqual([])
    expect(plan.commercial_assurance_refs).toEqual([])
    expect(section.boundary_ref).toBe('tool_source')
  })

  test('bi_summary_blocks is the verbatim BI passthrough', () => {
    expect(section.bi_summary_blocks).toEqual(interps[0].summary_blocks)
  })
})

describe('CC-3A -- CASE 2: unresolved condition (real pipeline, Suno + Kling)', () => {
  const g = goal({ goal_id: 'g1', raw_text: 'Can I use it commercially?', category: 'commercial_use' })
  const out = retrieve(
    handoff({ tools: [tool('suno'), tool('kling')] }),
    MATRIX_FIXTURE,
    [g],
    [],
    facts([toolMention('suno'), toolMention('kling')]), // kling account_status unknown -> member claim applicability unresolved
  )
  const interps = buildBoundedInterpretations([g], out.results, out.diagnostics)
  const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  const section = plan.explicit_sections[0]

  test('BI produced directly_relevant with an unresolved_relevant_claim (sanity on the fixture shape)', () => {
    expect(interps[0].status).toBe('directly_relevant')
    expect(interps[0].unresolved_relevant_claims).toEqual([{ claim_id: 'kling-commercial-use-member' }])
  })

  test('disposition is the LESS permissive with-open-items form, never a bare "available"', () => {
    expect(section.disposition).toBe('governed_guidance_available_with_open_items')
    expect(section.boundary_ref).toBe('case_3b_unresolved')
  })

  test('the withheld Kling member claim is retained as a neutral unresolved item -- never labelled a blocker', () => {
    expect(section.unresolved_items).toContainEqual({ kind: 'withheld_relevant_claim', claim_id: 'kling-commercial-use-member' })
    const serialized = JSON.stringify(section.unresolved_items)
    expect(serialized).not.toMatch(/\b(blocker|blocks|prevents|defeats|clears|resolved|material)\b/i)
  })

  test('the unresolved Kling account-status applicability is captured with its fact + tool', () => {
    expect(section.unresolved_items).toContainEqual({
      kind: 'unresolved_applicability',
      claim_id: 'kling-commercial-use-member',
      fact: 'tool_account_status',
      tool: 'kling',
    })
  })

  test('tool_account_status is classified answerable_in_conversation (it IS a registered askable selector)', () => {
    const me = section.missing_evidence.find((m) => m.applicability_fact === 'tool_account_status')
    expect(me).toEqual({ source_claim_id: 'kling-commercial-use-member', dependency_id: null, applicability_fact: 'tool_account_status', classification: 'answerable_in_conversation' })
  })

  test('CA refs carry the structured pointer only -- no prose about what CA will resolve', () => {
    expect(plan.commercial_assurance_refs).toContainEqual({ source_claim_id: 'kling-commercial-use-member', dependency_id: null, applicability_fact: 'tool_account_status' })
    expect(JSON.stringify(plan.commercial_assurance_refs)).not.toMatch(/resolve|clear|verif|assess/i)
  })

  test('the conditional Suno statement is NOT decomposed -- only the claim_id is referenced (verbatim BI passthrough aside)', () => {
    expect(section.supported_claim_refs.map((r) => r.claim_id).sort()).toEqual(['kling-commercial-use-baseline', 'suno'])
    // the planner never restructures the "Free/Basic vs Pro/Premier" conditional
    // into its own assertions -- outside bi_summary_blocks it carries no claim prose
    expect(planWithoutBiPassthrough(plan)).not.toContain('Pro or Premier')
    expect(planWithoutBiPassthrough(plan)).not.toContain('assigns')
  })
})

describe('CC-3A -- CASE 3: explicit goal + discovered context stay separate', () => {
  const g = interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', goal_text: 'Can I use it commercially?', supporting_claim_ids: ['tool-claim', 'stock-claim'] })
  const results: RetrievalResult[] = [
    result({ claim_id: 'tool-claim', matched_goal_category: 'commercial_use', match_origin: 'exact_topic' }),
    result({ claim_id: 'stock-claim', matched_goal_category: 'commercial_use', match_origin: 'discovered_topic', source_fact: { kind: 'topic', identifier: 'third_party_source_rights' }, topic: 'third_party_source_rights' }),
  ]
  const plan = buildConsultativeAnswerPlan([g], results, [])

  test('explicit section holds only the exact_topic claim', () => {
    expect(plan.explicit_sections[0].supported_claim_refs.map((r) => r.claim_id)).toEqual(['tool-claim'])
  })

  test('the discovered claim is in discovered_context, with its authorizing explicit-goal category', () => {
    expect(plan.discovered_context).toEqual([
      { claim_ref: expect.objectContaining({ claim_id: 'stock-claim', match_origin: 'discovered_topic' }), authorizing_goal_category: 'commercial_use' },
    ])
  })

  test('discovered context never becomes a section and never gets a goal_text', () => {
    expect(plan.explicit_sections).toHaveLength(1)
    expect(JSON.stringify(plan.discovered_context)).not.toContain('goal_text')
  })

  test('a discovered result whose category has no active goal is omitted (fail closed)', () => {
    const orphan = result({ claim_id: 'orphan', matched_goal_category: 'likeness', match_origin: 'discovered_topic' })
    const p = buildConsultativeAnswerPlan([g], [...results, orphan], [])
    expect(p.discovered_context.map((d) => d.claim_ref.claim_id)).toEqual(['stock-claim'])
  })
})

describe('CC-3A -- CASE 4: correction / supersession leaves zero stale refs', () => {
  // pre-correction: Suno is the operative tool
  const preInterp = interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', supporting_claim_ids: ['suno'] })
  const preResults = [result({ claim_id: 'suno', matched_goal_category: 'commercial_use' })]
  const prePlan = buildConsultativeAnswerPlan([preInterp], preResults, [])

  // post-correction: BI + Retrieval already filtered the superseded Suno mention out,
  // so the planner simply never receives a Suno interpretation or result.
  const postInterp = interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', supporting_claim_ids: ['kling-commercial-use-baseline'] })
  const postResults = [result({ claim_id: 'kling-commercial-use-baseline', matched_goal_category: 'commercial_use' })]
  const postPlan = buildConsultativeAnswerPlan([postInterp], postResults, [])

  test('pre-correction plan references Suno', () => {
    expect(JSON.stringify(prePlan)).toContain('suno')
  })

  test('post-correction plan has zero Suno references anywhere', () => {
    expect(JSON.stringify(postPlan)).not.toContain('suno')
    expect(postPlan.explicit_sections[0].supported_claim_refs.map((r) => r.claim_id)).toEqual(['kling-commercial-use-baseline'])
    expect(postPlan.discovered_context).toEqual([])
    expect(postPlan.commercial_assurance_refs).toEqual([])
  })

  test('the planner holds no cross-call state -- rebuilding from the same input twice is byte-identical', () => {
    expect(buildConsultativeAnswerPlan([postInterp], postResults, [])).toEqual(postPlan)
  })
})

describe('CC-3A -- CASE 5: evidence-only facts stay evidence-only', () => {
  const g = interp({ goal_id: 'g1', category: 'copyrightability', status: 'relevant_applicability_unresolved', supporting_claim_ids: ['topic-claim'] })
  const results: RetrievalResult[] = [
    result({
      claim_id: 'topic-claim',
      matched_goal_category: 'copyrightability',
      source_fact: { kind: 'topic', identifier: 'copyrightability' },
      topic: 'copyrightability',
      unresolved_project_dependencies: ['human_contribution_description', 'some_unregistered_evidence_only_dep'],
    }),
  ]
  const plan = buildConsultativeAnswerPlan([g], results, [])
  const section = plan.explicit_sections[0]

  test('a registered askable dependency -> answerable_in_conversation', () => {
    expect(section.missing_evidence).toContainEqual({ source_claim_id: 'topic-claim', dependency_id: 'human_contribution_description', applicability_fact: null, classification: 'answerable_in_conversation' })
  })

  test('an UNREGISTERED dependency fails closed to requires_documentary_evidence -- never askable', () => {
    expect(section.missing_evidence).toContainEqual({ source_claim_id: 'topic-claim', dependency_id: 'some_unregistered_evidence_only_dep', applicability_fact: null, classification: 'requires_documentary_evidence' })
    const docItems = section.missing_evidence.filter((m) => m.classification === 'requires_documentary_evidence')
    expect(docItems.length).toBeGreaterThan(0)
    // nothing in the plan turns an evidence-only fact into a question
    expect(JSON.stringify(plan)).not.toMatch(/question|self-attest|ask the user/i)
  })
})

describe('CC-3A -- CASE 6: missing provenance fails closed', () => {
  const g = interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', supporting_claim_ids: ['good', 'no-matrix-id', 'not-in-results'] })
  const results: RetrievalResult[] = [
    result({ claim_id: 'good', matched_goal_category: 'commercial_use' }),
    { ...result({ claim_id: 'no-matrix-id', matched_goal_category: 'commercial_use' }), matrix_identifier: '' },
  ]
  const plan = buildConsultativeAnswerPlan([g], results, [])

  test('only the fully-provenanced claim ref is emitted; the others are silently dropped, never invented', () => {
    expect(plan.explicit_sections[0].supported_claim_refs.map((r) => r.claim_id)).toEqual(['good'])
  })
})

describe('CC-3A -- CASE 7: duplicate presentation identity', () => {
  const g1 = interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', supporting_claim_ids: ['shared', 'kling-commercial-use-baseline'] })
  const g2 = interp({ goal_id: 'g2', category: 'copyrightability', status: 'directly_relevant', supporting_claim_ids: ['shared', 'kling-commercial-use-member'] })
  const results: RetrievalResult[] = [
    result({ claim_id: 'shared', matrix_identifier: 'row-x', matched_goal_category: 'commercial_use' }),
    result({ claim_id: 'shared', matrix_identifier: 'row-x', matched_goal_category: 'copyrightability' }),
    result({ claim_id: 'kling-commercial-use-baseline', matched_goal_category: 'commercial_use' }),
    result({ claim_id: 'kling-commercial-use-member', matched_goal_category: 'copyrightability' }),
  ]
  const plan = buildConsultativeAnswerPlan([g1, g2], results, [])

  test('the repeated (matrix_identifier, claim_id) is marked once for future single rendering, occurrence_count 2', () => {
    expect(plan.render_once_markers).toEqual([{ matrix_identifier: 'row-x', claim_id: 'shared', occurrence_count: 2 }])
  })

  test('the two textually-similar but differently-identified Kling claims are NEVER collapsed', () => {
    const allRefIds = plan.explicit_sections.flatMap((s) => s.supported_claim_refs.map((r) => r.claim_id))
    expect(allRefIds).toContain('kling-commercial-use-baseline')
    expect(allRefIds).toContain('kling-commercial-use-member')
    expect(plan.render_once_markers.find((m) => m.claim_id.startsWith('kling'))).toBeUndefined()
  })

  test('provenance is retained on every occurrence -- dedup is intent only, not deletion', () => {
    const sharedRefs = plan.explicit_sections.flatMap((s) => s.supported_claim_refs).filter((r) => r.claim_id === 'shared')
    expect(sharedRefs).toHaveLength(2)
    expect(sharedRefs.map((r) => r.matched_goal_category).sort()).toEqual(['commercial_use', 'copyrightability'])
  })
})

describe('CC-3A -- CASE 8: ambiguous unresolved ordering', () => {
  const g = interp({
    goal_id: 'g1',
    category: 'commercial_use',
    status: 'directly_relevant',
    supporting_claim_ids: ['c1'],
    unresolved_relevant_claims: [{ claim_id: 'z-claim' }, { claim_id: 'a-claim' }, { claim_id: 'm-claim' }],
  })
  const results = [result({ claim_id: 'c1', matched_goal_category: 'commercial_use' })]
  const plan = buildConsultativeAnswerPlan([g], results, [])
  const items = plan.explicit_sections[0].unresolved_items

  test('all three unresolved items are retained -- none dropped', () => {
    expect(items).toHaveLength(3)
  })

  test('order is deterministic and stable (kind, then identity) -- not a materiality rank', () => {
    expect(items).toEqual([
      { kind: 'withheld_relevant_claim', claim_id: 'a-claim' },
      { kind: 'withheld_relevant_claim', claim_id: 'm-claim' },
      { kind: 'withheld_relevant_claim', claim_id: 'z-claim' },
    ])
    // rebuilding yields the identical order
    expect(buildConsultativeAnswerPlan([g], results, []).explicit_sections[0].unresolved_items).toEqual(items)
  })

  test('no item carries a rank / priority / severity field', () => {
    for (const it of items) {
      expect(Object.keys(it).sort()).toEqual(['claim_id', 'kind'])
    }
  })
})

describe('CC-3A -- fail-closed on unrecognized BI status', () => {
  const weird = { ...interp({ goal_id: 'g1', category: 'commercial_use', status: 'some_future_status' as unknown as InterpretationStatus }), summary_blocks: ['authoritative BI text'] }
  const plan = buildConsultativeAnswerPlan([weird], [], [])
  const section = plan.explicit_sections[0]

  test('disposition is unclassified, bi_status marked unknown, boundary falls back to bridge', () => {
    expect(section.disposition).toBe('unclassified')
    expect(section.bi_status).toBe('unknown')
    expect(section.boundary_ref).toBe('bridge')
  })

  test('no derived structure is invented; the authoritative BI summary is preserved verbatim', () => {
    expect(section.supported_claim_refs).toEqual([])
    expect(section.unresolved_items).toEqual([])
    expect(section.missing_evidence).toEqual([])
    expect(section.bi_summary_blocks).toEqual(['authoritative BI text'])
  })
})

describe('CC-3A -- determination_declined and outside_coverage carry no derived items', () => {
  const dd = interp({ goal_id: 'g1', category: 'commercial_use', status: 'determination_declined' })
  const oc = interp({ goal_id: 'g2', category: 'copyright_ownership', status: 'outside_current_coverage' })
  // a stray diagnostic for the same category must NOT leak into these sections
  const diags: RetrievalDiagnostic[] = [
    { identifier: 'commercial_use', reason: 'applicability_unmet', unmet_applicability: [{ claim_id: 'x', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'US' }, status: 'unresolved' }] },
  ]
  const plan = buildConsultativeAnswerPlan([dd, oc], [], diags)

  test('determination_declined -> disposition determination_declined, zero unresolved/missing items', () => {
    const s = plan.explicit_sections[0]
    expect(s.disposition).toBe('determination_declined')
    expect(s.unresolved_items).toEqual([])
    expect(s.missing_evidence).toEqual([])
    expect(s.boundary_ref).toBe('determination_declined')
  })

  test('outside_current_coverage -> disposition outside_governed_coverage, zero derived items', () => {
    const s = plan.explicit_sections[1]
    expect(s.disposition).toBe('outside_governed_coverage')
    expect(s.unresolved_items).toEqual([])
    expect(s.boundary_ref).toBe('outside_coverage')
  })
})

describe('CC-3A -- not_met applicability is never an open item', () => {
  const g = interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', supporting_claim_ids: ['c1'] })
  const results = [result({ claim_id: 'c1', matched_goal_category: 'commercial_use' })]
  const diags: RetrievalDiagnostic[] = [
    {
      identifier: 'commercial_use',
      reason: 'applicability_unmet',
      unmet_applicability: [
        { claim_id: 'not-met-claim', requirement: { fact: 'tool_plan_tier', tool: 'x', operator: 'equals', value: 'paid' }, status: 'not_met' },
        { claim_id: 'unresolved-claim', requirement: { fact: 'tool_account_status', tool: 'y', operator: 'equals', value: 'Member Account' }, status: 'unresolved' },
      ],
    },
  ]
  const plan = buildConsultativeAnswerPlan([g], results, diags)
  const items = plan.explicit_sections[0].unresolved_items

  test('only the unresolved applicability appears; the not_met one is a settled exclusion', () => {
    expect(items).toEqual([{ kind: 'unresolved_applicability', claim_id: 'unresolved-claim', fact: 'tool_account_status', tool: 'y' }])
  })
})

describe('CC-3A -- purity / no mutation of inputs', () => {
  test('inputs are not mutated', () => {
    const interps = [interp({ goal_id: 'g1', category: 'commercial_use', status: 'directly_relevant', supporting_claim_ids: ['c1'], unresolved_relevant_claims: [{ claim_id: 'b' }, { claim_id: 'a' }] })]
    const results = [result({ claim_id: 'c1', matched_goal_category: 'commercial_use' })]
    const diags: RetrievalDiagnostic[] = []
    const snapshotInterps = JSON.stringify(interps)
    const snapshotResults = JSON.stringify(results)
    buildConsultativeAnswerPlan(interps, results, diags)
    expect(JSON.stringify(interps)).toEqual(snapshotInterps)
    expect(JSON.stringify(results)).toEqual(snapshotResults)
  })
})
