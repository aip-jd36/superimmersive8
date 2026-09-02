/**
 * CC-3B / CC-3B.1 -- consultative-realization helper suite. Deterministic,
 * no live model. The real-pipeline cases (retrieve + BI + plan) exercise
 * both an explicit-only and an explicit+discovered scenario end to end.
 */

import { partitionKnowledgeItemsByPlan, planHasExplicitGoalSections } from '@/lib/crc-engine/consultative-realization'
import { buildConsultativeAnswerPlan, type ConsultativeAnswerPlan, type PlanGoalSection } from '@/lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ProjectionKnowledgeItem } from '@/lib/projection-layer/types'
import type { AssetProviderMention, RetrievalHandoff, StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { deriveAssessmentJurisdictionFacts } from '@/lib/crc-engine/assessment-jurisdiction-scope'

// ── builders ───────────────────────────────────────────────────────────────

const ki = (claim_id: string, matrix_identifier = `m-${claim_id}`): ProjectionKnowledgeItem => ({ claim_id, matrix_identifier, statement: `stmt ${claim_id}`, last_verified: '2026-09-01' })

function section(overrides: Partial<PlanGoalSection> = {}): PlanGoalSection {
  return {
    goal_text: 'g', category: 'commercial_use', bi_status: 'directly_relevant', disposition: 'governed_guidance_available',
    supported_claim_refs: [], summary_claim_refs: [], unresolved_items: [], missing_evidence: [], boundary_ref: 'tool_source', bi_summary_blocks: ['x'],
    ...overrides,
  }
}
const claimRef = (claim_id: string, matrix_identifier: string) => ({ claim_id, matrix_identifier, match_origin: 'exact_topic' as const, matched_goal_category: 'commercial_use' as const, relationship_id: null, last_verified: null })
const emptyPlan: ConsultativeAnswerPlan = { explicit_sections: [], discovered_context: [], render_once_markers: [], commercial_assurance_refs: [] }
const planWith = (sections: PlanGoalSection[]): ConsultativeAnswerPlan => ({ explicit_sections: sections, discovered_context: [], render_once_markers: [], commercial_assurance_refs: [] })

// ── real-pipeline helpers ──────────────────────────────────────────────────

function h(o: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [], ...o }
}
const tool = (identifier: string) => ({ identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const })
const goal = (goal_id: string, raw_text: string, category: UserGoal['category']): UserGoal => ({ goal_id, raw_text, category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: raw_text })
const tm = (identifier: string): ToolMention => ({ mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier }, access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null })
const apm = (identifier: string): AssetProviderMention => ({ mention_id: `ap-${identifier}`, resolution: { kind: 'canonical', identifier }, confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } })
const facts = (tms: ToolMention[] = []): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: tms })

function realPipeline(su: Partial<StructuredUnderstanding> & Pick<StructuredUnderstanding, 'user_goals' | 'tool_mentions' | 'asset_provider_mentions'>) {
  const full: StructuredUnderstanding = {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'client ad' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    scoped_observations: [], assessment_jurisdiction_mentions: [], content_presence_mentions: [],
    current_phase: 3, gate_1_state: 'met', gate_2_state: 'stable', completion_reason: null, opt_out_scope: null,
    ...su,
  }
  const handoff = buildRetrievalHandoff(full)
  const applic = { jurisdiction: deriveAssessmentJurisdictionFacts(full), toolMentions: full.tool_mentions }
  const discovered = deriveDiscoveredTopicOccurrences(full, TOPIC_CLAIMS_FIXTURE)
  const { results, diagnostics } = retrieve(handoff, MATRIX_FIXTURE, full.user_goals, TOPIC_CLAIMS_FIXTURE, applic, TOPIC_RELATIONSHIPS_FIXTURE, handoff.asset_providers, discovered)
  const interps = buildBoundedInterpretations(full.user_goals, results, diagnostics, full.project_facts.human_contribution_description.attestation)
  const { output } = assembleProjectionOutput(handoff, results, interps)
  const plan = buildConsultativeAnswerPlan(interps, results, diagnostics)
  return { results, interps, output, plan }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CC-3B.1 -- render ownership: real explicit-only pipeline (Suno + Kling)', () => {
  const { output, plan } = realPipeline({ user_goals: [goal('g1', 'Can I use it commercially?', 'commercial_use')], tool_mentions: [tm('suno'), tm('kling')], asset_provider_mentions: [] })

  test('every governed statement in the goal summary is owned by the section -> supplementary is empty', () => {
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan(output.knowledge_items, plan)
    expect(renderedInGoalSection.map((i) => i.claim_id).sort()).toEqual(['kling-commercial-use-baseline', 'suno'])
    expect(supplementary).toEqual([])
  })

  test('summary_claim_refs == supported_claim_refs here (no discovered claims) and both carry (matrix_identifier, claim_id)', () => {
    const s = plan.explicit_sections[0]
    expect(s.summary_claim_refs.map((r) => [r.matrix_identifier, r.claim_id]).sort()).toEqual([['kling', 'kling-commercial-use-baseline'], ['suno', 'suno']])
    expect(s.supported_claim_refs.map((r) => r.claim_id).sort()).toEqual(s.summary_claim_refs.map((r) => r.claim_id).sort())
  })
})

describe('CC-3B.1 -- render ownership: real explicit + discovered pipeline (Kling + iStock)', () => {
  const { results, interps, output, plan } = realPipeline({
    user_goals: [goal('g1', 'Can I use it commercially?', 'commercial_use')],
    tool_mentions: [tm('kling')],
    asset_provider_mentions: [apm('istock')],
  })

  test('the pipeline actually produced discovered-origin stock results folded into the commercial_use BI summary', () => {
    const discoveredIds = results.filter((r) => r.match_origin === 'discovered_topic').map((r) => r.claim_id)
    expect(discoveredIds.length).toBeGreaterThan(0)
    // every discovered claim is in the goal's supporting_claim_ids (BI folded it in)
    for (const id of discoveredIds) expect(interps[0].supporting_claim_ids).toContain(id)
  })

  test('summary_claim_refs INCLUDES the discovered stock claims; supported_claim_refs does NOT', () => {
    const s = plan.explicit_sections[0]
    const summaryIds = s.summary_claim_refs.map((r) => r.claim_id)
    const supportedIds = s.supported_claim_refs.map((r) => r.claim_id)
    expect(supportedIds).toEqual(['kling-commercial-use-baseline'])
    expect(summaryIds).toContain('kling-commercial-use-baseline')
    expect(summaryIds.filter((id) => id.startsWith('CLAIM-STOCK')).length).toBeGreaterThan(0)
  })

  test('CORRECTED: the discovered stock claims are renderedInGoalSection (owned by the summary), NOT supplementary', () => {
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan(output.knowledge_items, plan)
    // pre-CC-3B.1 bug: the stock claims were supplementary and rendered a second time.
    expect(supplementary).toEqual([])
    expect(renderedInGoalSection.map((i) => i.claim_id).filter((id) => id.startsWith('CLAIM-STOCK')).length).toBeGreaterThan(0)
  })

  test('Track C provenance survives: discovered_context still lists every discovered stock claim, separately', () => {
    const discoveredIds = results.filter((r) => r.match_origin === 'discovered_topic').map((r) => r.claim_id).sort()
    expect(plan.discovered_context.map((d) => d.claim_ref.claim_id).sort()).toEqual(discoveredIds)
    for (const d of plan.discovered_context) expect(d.authorizing_goal_category).toBe('commercial_use')
  })

  test('no fabricated UserGoal for third_party_source_rights -- exactly one explicit section, category commercial_use', () => {
    expect(plan.explicit_sections.map((s) => s.category)).toEqual(['commercial_use'])
  })

  test('structural identity is (matrix_identifier, claim_id): discovered stock claims share matrix_identifier "third_party_source_rights"', () => {
    for (const r of plan.explicit_sections[0].summary_claim_refs) {
      if (r.claim_id.startsWith('CLAIM-STOCK')) expect(r.matrix_identifier).toBe('third_party_source_rights')
    }
  })
})

describe('CC-3B.1 -- structural identity contract', () => {
  test('a knowledge_item is owned only when BOTH matrix_identifier AND claim_id match a summary ref', () => {
    const plan = planWith([section({ summary_claim_refs: [claimRef('shared', 'row-a')] })])
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('shared', 'row-a'), ki('shared', 'row-b')], plan)
    expect(renderedInGoalSection.map((i) => i.matrix_identifier)).toEqual(['row-a'])
    expect(supplementary.map((i) => i.matrix_identifier)).toEqual(['row-b'])
  })

  test('two different structural identities with IDENTICAL prose are never collapsed', () => {
    const a: ProjectionKnowledgeItem = { claim_id: 'x', matrix_identifier: 'row-a', statement: 'Exactly the same governed sentence.', last_verified: null }
    const b: ProjectionKnowledgeItem = { claim_id: 'x', matrix_identifier: 'row-b', statement: 'Exactly the same governed sentence.', last_verified: null }
    const plan = planWith([section({ summary_claim_refs: [claimRef('x', 'row-a')] })])
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([a, b], plan)
    expect(renderedInGoalSection).toEqual([a])
    expect(supplementary).toEqual([b])
  })

  test('an item with an empty matrix_identifier fails closed to supplementary (rendered, not suppressed)', () => {
    const bad: ProjectionKnowledgeItem = { claim_id: 'x', matrix_identifier: '', statement: 's', last_verified: null }
    const plan = planWith([section({ summary_claim_refs: [claimRef('x', 'row-a')] })])
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([bad], plan)
    expect(renderedInGoalSection).toEqual([])
    expect(supplementary).toEqual([bad])
  })

  test('nothing is ever dropped; order preserved within each bucket', () => {
    const plan = planWith([section({ summary_claim_refs: [claimRef('a', 'm-a'), claimRef('c', 'm-c')] })])
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('c'), ki('b'), ki('a'), ki('d')], plan)
    expect(renderedInGoalSection.map((i) => i.claim_id)).toEqual(['c', 'a'])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['b', 'd'])
    expect(renderedInGoalSection.length + supplementary.length).toBe(4)
  })

  test('empty plan -> everything supplementary; planHasExplicitGoalSections false', () => {
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('a'), ki('b')], emptyPlan)
    expect(renderedInGoalSection).toEqual([])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['a', 'b'])
    expect(planHasExplicitGoalSections(emptyPlan)).toBe(false)
  })

  test('deterministic + no input mutation', () => {
    const plan = planWith([section({ summary_claim_refs: [claimRef('a', 'm-a')] })])
    const items = [ki('a'), ki('b')]
    const snap = JSON.stringify(items)
    const first = partitionKnowledgeItemsByPlan(items, plan)
    const second = partitionKnowledgeItemsByPlan(items, plan)
    expect(first).toEqual(second)
    expect(JSON.stringify(items)).toEqual(snap)
  })
})

describe('CC-3B.1 -- discovered claim NOT in an authoritative goal rendering stays available for subordinate rendering', () => {
  test('a discovered_context claim whose authorizing goal joined no claim prose (empty summary_claim_refs) is supplementary', () => {
    // determination_declined / outside_coverage: BI uses a fixed template, supporting_claim_ids == [] -> summary_claim_refs == []
    const plan: ConsultativeAnswerPlan = {
      explicit_sections: [section({ disposition: 'determination_declined', bi_status: 'determination_declined', boundary_ref: 'determination_declined', summary_claim_refs: [], supported_claim_refs: [] })],
      discovered_context: [{ claim_ref: claimRef('DISCOVERED', 'third_party_source_rights'), authorizing_goal_category: 'commercial_use' }],
      render_once_markers: [], commercial_assurance_refs: [],
    }
    const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan([ki('DISCOVERED', 'third_party_source_rights')], plan)
    expect(renderedInGoalSection).toEqual([])
    expect(supplementary.map((i) => i.claim_id)).toEqual(['DISCOVERED'])
  })
})
