/**
 * CC-3B -- consultative-realization helper suite. Deterministic. No live
 * model. CASE 1 / 2 / 5 drive the real retrieve() + buildBoundedInterpretations()
 * + buildConsultativeAnswerPlan() pipeline over MATRIX_FIXTURE; the rest use
 * focused literals to pin the pure-function contract.
 */

import { partitionKnowledgeItemsByPlan, planHasExplicitGoalSections } from '@/lib/crc-engine/consultative-realization'
import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ProjectionKnowledgeItem } from '@/lib/projection-layer/types'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [],
    certainty_state: 'gate_1_unmet', exclusions: [], ...overrides,
  }
}
const t = (identifier: string) => ({ identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const })
function goal(goal_id: string, raw_text: string, category: UserGoal['category']): UserGoal {
  return { goal_id, raw_text, category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: raw_text }
}
function tm(identifier: string): ToolMention {
  return {
    mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier },
    access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' },
    confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null,
  }
}
const facts = (toolMentions: ToolMention[] = []): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions })
const ki = (claim_id: string): ProjectionKnowledgeItem => ({ claim_id, statement: `stmt ${claim_id}`, last_verified: '2026-09-01' })

describe('CC-3B partitionKnowledgeItemsByPlan -- real pipeline', () => {
  test('CASE 1: single commercial_use goal + Runway -> the Runway claim is renderedInGoalSection, supplementary is empty', () => {
    const g = goal('g1', 'Can I use it commercially?', 'commercial_use')
    const out = retrieve(handoff({ tools: [t('runway-gen3')] }), MATRIX_FIXTURE, [g], [], facts())
    const interps = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)

    const knowledgeItems: ProjectionKnowledgeItem[] = [ki('runway-gen3')]
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan(knowledgeItems, plan)
    expect(renderedInGoalSection.map((i) => i.claim_id)).toEqual(['runway-gen3'])
    expect(supplementary).toEqual([])
    expect(planHasExplicitGoalSections(plan)).toBe(true)
  })

  test('CASE 2: Suno + Kling -> both governed claims are renderedInGoalSection, nothing left over', () => {
    const g = goal('g1', 'Can I use it commercially?', 'commercial_use')
    const out = retrieve(handoff({ tools: [t('suno'), t('kling')] }), MATRIX_FIXTURE, [g], [], facts([tm('suno'), tm('kling')]))
    const interps = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)

    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan(
      [ki('suno'), ki('kling-commercial-use-baseline')],
      plan,
    )
    expect(renderedInGoalSection.map((i) => i.claim_id).sort()).toEqual(['kling-commercial-use-baseline', 'suno'])
    expect(supplementary).toEqual([])
  })
})

describe('CC-3B partitionKnowledgeItemsByPlan -- contract', () => {
  const planWithSection = {
    explicit_sections: [
      { goal_text: 'g', category: 'commercial_use' as const, bi_status: 'directly_relevant' as const, disposition: 'governed_guidance_available' as const,
        supported_claim_refs: [{ claim_id: 'covered', matrix_identifier: 'm1', match_origin: 'exact_topic' as const, matched_goal_category: 'commercial_use' as const, relationship_id: null, last_verified: null }],
        unresolved_items: [], missing_evidence: [], boundary_ref: 'tool_source' as const, bi_summary_blocks: ['x'] },
    ],
    discovered_context: [],
    render_once_markers: [],
    commercial_assurance_refs: [],
  }
  const emptyPlan = { explicit_sections: [], discovered_context: [], render_once_markers: [], commercial_assurance_refs: [] }

  test('an item covered by a goal section goes to renderedInGoalSection; an uncovered one goes to supplementary; nothing is dropped', () => {
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('covered'), ki('other')], planWithSection)
    expect(renderedInGoalSection.map((i) => i.claim_id)).toEqual(['covered'])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['other'])
    // total preserved
    expect(renderedInGoalSection.length + supplementary.length).toBe(2)
  })

  test('two DIFFERENT claim_ids are never collapsed, even with similar prose', () => {
    const a: ProjectionKnowledgeItem = { claim_id: 'kling-commercial-use-baseline', statement: 'Under Kling terms, commercial use needs written permission.', last_verified: null }
    const b: ProjectionKnowledgeItem = { claim_id: 'kling-commercial-use-member', statement: 'Under Kling terms, a Member account permits commercial use.', last_verified: null }
    const planCoveringOnlyBaseline = {
      ...planWithSection,
      explicit_sections: [{ ...planWithSection.explicit_sections[0], supported_claim_refs: [{ ...planWithSection.explicit_sections[0].supported_claim_refs[0], claim_id: 'kling-commercial-use-baseline' }] }],
    }
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([a, b], planCoveringOnlyBaseline)
    expect(renderedInGoalSection.map((i) => i.claim_id)).toEqual(['kling-commercial-use-baseline'])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['kling-commercial-use-member'])
  })

  test('empty plan -> everything is supplementary, nothing renderedInGoalSection', () => {
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('a'), ki('b')], emptyPlan)
    expect(renderedInGoalSection).toEqual([])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['a', 'b'])
    expect(planHasExplicitGoalSections(emptyPlan)).toBe(false)
  })

  test('order is preserved within each bucket', () => {
    const p = { ...planWithSection, explicit_sections: [{ ...planWithSection.explicit_sections[0], supported_claim_refs: [
      { ...planWithSection.explicit_sections[0].supported_claim_refs[0], claim_id: 'x' },
      { ...planWithSection.explicit_sections[0].supported_claim_refs[0], claim_id: 'z' },
    ] }] }
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('z'), ki('a'), ki('x'), ki('b')], p)
    expect(renderedInGoalSection.map((i) => i.claim_id)).toEqual(['z', 'x'])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['a', 'b'])
  })

  test('deterministic -- repeated calls with the same input are identical', () => {
    const first = partitionKnowledgeItemsByPlan([ki('covered'), ki('other')], planWithSection)
    const second = partitionKnowledgeItemsByPlan([ki('covered'), ki('other')], planWithSection)
    expect(first).toEqual(second)
  })

  test('inputs are not mutated', () => {
    const items = [ki('covered'), ki('other')]
    const snap = JSON.stringify(items)
    partitionKnowledgeItemsByPlan(items, planWithSection)
    expect(JSON.stringify(items)).toEqual(snap)
  })
})
