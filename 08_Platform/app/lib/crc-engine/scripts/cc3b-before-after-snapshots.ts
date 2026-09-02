/**
 * CC-3B -- human-review BEFORE vs AFTER of the user-visible results email.
 *
 * BEFORE = buildResultsEmailContent(output)                 (no plan -- pre-CC-3B)
 * AFTER  = buildResultsEmailContent(output, ..., plan)      (CC-3B)
 *
 * Real retrieve() + buildBoundedInterpretations() + assembleProjectionOutput()
 * + buildConsultativeAnswerPlan() over MATRIX_FIXTURE wherever possible.
 * Prints the PLAIN-TEXT body of each email (the HTML carries the same
 * content). This is a review aid, not a test, not production code.
 *
 * Run:  npx tsx lib/crc-engine/scripts/cc3b-before-after-snapshots.ts   (from 08_Platform/app)
 */

import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { partitionKnowledgeItemsByPlan } from '@/lib/crc-engine/consultative-realization'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { ConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

const h = (o: Partial<RetrievalHandoff> = {}): RetrievalHandoff => ({
  tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [],
  workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [], ...o,
})
const tool = (identifier: string) => ({ identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const })
const g = (id: string, raw: string, category: UserGoal['category']): UserGoal =>
  ({ goal_id: id, raw_text: raw, category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: raw })
const tm = (identifier: string): ToolMention => ({
  mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier },
  access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' },
  confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null,
})
const facts = (tms: ToolMention[] = []): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: tms })

function pipeline(handoff: RetrievalHandoff, goals: UserGoal[], applic: ApplicabilityFacts) {
  const out = retrieve(handoff, MATRIX_FIXTURE, goals, [], applic)
  const interps = buildBoundedInterpretations(goals, out.results, out.diagnostics)
  const { output } = assembleProjectionOutput(handoff, out.results, interps)
  const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  return { output, plan, biStatuses: interps.map((i) => i.status) }
}

function show(
  title: string,
  inputSummary: string,
  biStatus: string,
  output: ProjectionOutput,
  plan: ConsultativeAnswerPlan,
  doesNotConclude: string[],
) {
  const before = buildResultsEmailContent(output, 'token', 'user@example.com').text
  const after = buildResultsEmailContent(output, 'token', 'user@example.com', plan).text
  const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan(output.knowledge_items, plan)

  console.log(`\n${'='.repeat(80)}\n${title}\n${'='.repeat(80)}`)
  console.log(`INPUT SUMMARY: ${inputSummary}`)
  console.log(`BI STATUS: ${biStatus}`)
  console.log(`PLAN STRUCTURE SUMMARY: ${plan.explicit_sections.length} explicit section(s); ` +
    `${plan.explicit_sections.reduce((n, s) => n + s.supported_claim_refs.length, 0)} supported claim ref(s); ` +
    `${plan.explicit_sections.reduce((n, s) => n + s.unresolved_items.length, 0)} unresolved item(s); ` +
    `${plan.discovered_context.length} discovered-context item(s); ` +
    `${plan.commercial_assurance_refs.length} CA ref(s)`)
  console.log(`\n--- BEFORE USER-VISIBLE OUTPUT (plain text) ---\n${before}`)
  console.log(`--- AFTER USER-VISIBLE OUTPUT (plain text) ---\n${after}`)
  console.log(`DE-DUPLICATION APPLIED: ${renderedInGoalSection.length} knowledge_item(s) suppressed as already-in-goal-section ` +
    `[${renderedInGoalSection.map((i) => i.claim_id).join(', ') || 'none'}]; ` +
    `${supplementary.length} kept as supplementary [${supplementary.map((i) => i.claim_id).join(', ') || 'none'}]`)
  const unresolvedShown = plan.explicit_sections.flatMap((s) => s.unresolved_items.map((u) => JSON.stringify(u)))
  console.log(`UNRESOLVED ITEMS SHOWN (structural, in plan; rendered via BI's own hedge sentence, not new prose): ${unresolvedShown.join(' | ') || 'none'}`)
  console.log(`BOUNDARY LANGUAGE: unchanged -- the single educational disclaimer ("not an SI8 Commercial Assurance Assessment ... does not provide legal advice or certify commercial use") + the Commercial Assurance CTA, both once, at the end`)
  console.log(`WHAT THE NEW OUTPUT DELIBERATELY DOES NOT CONCLUDE:`)
  for (const d of doesNotConclude) console.log(`  - ${d}`)
}

// 1. simple directly relevant
{
  const { output, plan, biStatuses } = pipeline(h({ tools: [tool('runway-gen3')] }), [g('g1', 'Can I use it commercially?', 'commercial_use')], facts())
  show('1. SIMPLE DIRECTLY RELEVANT (Runway, one commercial_use goal)',
    'user named Runway, asked "Can I use it commercially?"', biStatuses.join(', '), output, plan,
    ['that the project is commercially cleared / certified',
     'anything beyond the referenced runway-gen3 claim',
     'the governed statement now appears once (in "What this means"), not twice'])
}

// 2. unresolved applicability (Suno + Kling)
{
  const { output, plan, biStatuses } = pipeline(h({ tools: [tool('suno'), tool('kling')] }),
    [g('g1', 'Can I use it commercially?', 'commercial_use')], facts([tm('suno'), tm('kling')]))
  show('2. UNRESOLVED APPLICABILITY (Suno + Kling, Kling account status unknown)',
    'user named Suno + Kling, asked about commercial use', biStatuses.join(', '), output, plan,
    ['that the Kling Member exception applies (its applicability is unresolved)',
     'that the unresolved account-status item is "the blocker" / "prevents commercial use" / "is resolved"',
     'that account status "resolves commercial readiness"',
     'the Suno + Kling guidance appears once, not duplicated across "Current guidance" and "What this means"'])
}

// 3. explicit + discovered (literal -- discovered pipeline exercised in discovered-relevance-retrieval.test.ts)
{
  const output: ProjectionOutput = {
    opening_line: 'You mentioned a video tool and some stock footage.',
    understood_summary: 'You mentioned using kling. Your role on this: editor.',
    knowledge_items: [
      { claim_id: 'kling-commercial-use-baseline', statement: 'Under Kling’s current Terms of Service, using generated Output commercially requires written permission.', last_verified: '2026-08-24' },
      { claim_id: 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1', statement: 'iStock editorial-licensed assets carry use restrictions that can conflict with commercial deployment.', last_verified: '2026-08-18' },
    ],
    goal_interpretations: [{
      goal_text: 'Can I use it commercially?',
      summary: 'Under Kling’s current Terms of Service, using generated Output commercially requires written permission. iStock editorial-licensed assets carry use restrictions that can conflict with commercial deployment. This is relevant to whether this can be used commercially, though it reflects the platforms’ own terms.',
      summary_blocks: ['Under Kling’s current Terms of Service, using generated Output commercially requires written permission. iStock editorial-licensed assets carry use restrictions that can conflict with commercial deployment. This is relevant to whether this can be used commercially, though it reflects the platforms’ own terms.'],
    }],
    closing_cta: '',
  }
  const plan: ConsultativeAnswerPlan = {
    explicit_sections: [{
      goal_text: 'Can I use it commercially?', category: 'commercial_use', bi_status: 'directly_relevant', disposition: 'governed_guidance_available',
      supported_claim_refs: [{ claim_id: 'kling-commercial-use-baseline', matrix_identifier: 'kling', match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null, last_verified: '2026-08-24' }],
      unresolved_items: [], missing_evidence: [], boundary_ref: 'tool_source', bi_summary_blocks: ['x'],
    }],
    discovered_context: [{ claim_ref: { claim_id: 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1', matrix_identifier: 'third_party_source_rights', match_origin: 'discovered_topic', matched_goal_category: 'commercial_use', relationship_id: null, last_verified: '2026-08-18' }, authorizing_goal_category: 'commercial_use' }],
    render_once_markers: [], commercial_assurance_refs: [],
  }
  show('3. EXPLICIT GOAL + DISCOVERED CONTEXT (Kling explicit; iStock stock claim discovered)',
    'explicit commercial_use goal about Kling; a stock-media consideration surfaced from the described workflow', 'directly_relevant', output, plan,
    ['that the stock-media consideration is something the user explicitly asked about (it renders under a neutral subordinate heading, after the explicit answer)',
     'a fabricated UserGoal for third-party source rights',
     'NOTE (known limitation, reported for CC-3C): the discovered claim’s text is still embedded inside the BI goal summary because BI does not distinguish match_origin -- CC-3B does not modify BI summaries'])
}

// 4. determination declined
{
  const { output, plan, biStatuses } = pipeline(h({ tools: [tool('runway-gen3')] }),
    [g('g1', 'Can you certify this is cleared for commercial use?', 'commercial_use')], facts())
  // Force the determination scope so BI resolves to determination_declined
  const dg = { ...g('g1', 'Can you certify this is cleared for commercial use?', 'commercial_use'), scope: 'determination_request' as const }
  const p2 = pipeline(h({ tools: [tool('runway-gen3')] }), [dg], facts())
  show('4. DETERMINATION DECLINED (user asked CRC to certify)',
    'user asked "Can you certify this is cleared for commercial use?"', p2.biStatuses.join(', '), p2.output, p2.plan,
    ['CRC does not certify / clear / determine -- the existing determination-declined BI copy renders unchanged',
     'no governed guidance is invented to fill the gap'])
  void output; void plan; void biStatuses
}

// 5. no goal / outside coverage
{
  const { output, plan, biStatuses } = pipeline(h({ tools: [tool('runway-gen3')] }), [], facts())
  show('5. NO GOAL STATED (outside the goal-interpretation path)',
    'user named Runway but asked no explicit question', biStatuses.join(', ') || '(no goals -> no interpretations)', output, plan,
    ['with an empty plan, CC-3B changes nothing -- "Current guidance" renders exactly as before (fail-closed to existing behavior)'])
}
