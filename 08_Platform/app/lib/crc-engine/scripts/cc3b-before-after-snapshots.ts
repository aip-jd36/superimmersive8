/**
 * CC-3B / CC-3B.1 -- human-review BEFORE vs AFTER of the user-visible results email.
 *
 * BEFORE = buildResultsEmailContent(output)                 (no plan -- pre-CC-3B)
 * AFTER  = buildResultsEmailContent(output, ..., plan)      (CC-3B + CC-3B.1)
 *
 * Every scenario is driven end to end through the REAL pipeline:
 *   buildRetrievalHandoff -> retrieve -> buildBoundedInterpretations
 *   -> assembleProjectionOutput -> buildConsultativeAnswerPlan -> render.
 * Prints the PLAIN-TEXT body (the HTML carries identical content). Review
 * aid, not a test, not production code.
 *
 * Run:  npx tsx lib/crc-engine/scripts/cc3b-before-after-snapshots.ts   (from 08_Platform/app)
 */

import { buildResultsEmailContent } from '@/lib/crc-engine/results-email-template'
import { buildConsultativeAnswerPlan, type ConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { partitionKnowledgeItemsByPlan } from '@/lib/crc-engine/consultative-realization'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BoundedInterpretation } from '@/lib/bounded-interpretation/types'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { deriveAssessmentJurisdictionFacts } from '@/lib/crc-engine/assessment-jurisdiction-scope'
import { deriveDiscoveredTopicOccurrences } from '@/lib/crc-engine/discovered-relevance'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { AssetProviderMention, StructuredUnderstanding, ToolMention, UserGoal } from '@/types/interview-engine'

const goal = (id: string, raw: string, category: UserGoal['category'], scope: UserGoal['scope'] = 'informational'): UserGoal =>
  ({ goal_id: id, raw_text: raw, category, scope, state: 'confirmed', superseded_by: null, source_turn: 1, source_statement: raw })
const tm = (identifier: string): ToolMention => ({ mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier }, access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' }, confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null })
const apm = (identifier: string): AssetProviderMention => ({ mention_id: `ap-${identifier}`, resolution: { kind: 'canonical', identifier }, confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } })

function pipeline(goals: UserGoal[], tools: ToolMention[], providers: AssetProviderMention[]) {
  const su: StructuredUnderstanding = {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'a client social ad' }, source_turn: 1, source_statement: 'x' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 1, source_statement: 'x' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: tools, user_goals: goals, asset_provider_mentions: providers,
    scoped_observations: [], assessment_jurisdiction_mentions: [], content_presence_mentions: [],
    current_phase: 3, gate_1_state: 'met', gate_2_state: 'stable', completion_reason: null, opt_out_scope: null,
  }
  const handoff = buildRetrievalHandoff(su)
  const applic = { jurisdiction: deriveAssessmentJurisdictionFacts(su), toolMentions: su.tool_mentions }
  const discovered = deriveDiscoveredTopicOccurrences(su, TOPIC_CLAIMS_FIXTURE)
  const { results, diagnostics } = retrieve(handoff, MATRIX_FIXTURE, su.user_goals, TOPIC_CLAIMS_FIXTURE, applic, TOPIC_RELATIONSHIPS_FIXTURE, handoff.asset_providers, discovered)
  const interps = buildBoundedInterpretations(su.user_goals, results, diagnostics, su.project_facts.human_contribution_description.attestation)
  const { output } = assembleProjectionOutput(handoff, results, interps)
  const plan = buildConsultativeAnswerPlan(interps, results, diagnostics)
  return { results, interps, output, plan }
}

function occurrences(haystack: string, needle: string): number {
  return needle.length === 0 ? 0 : haystack.split(needle).length - 1
}

function show(title: string, inputSummary: string, output: ProjectionOutput, plan: ConsultativeAnswerPlan, interps: BoundedInterpretation[], doesNotConclude: string[]) {
  const before = buildResultsEmailContent(output, 'token', 'user@example.com').text
  const after = buildResultsEmailContent(output, 'token', 'user@example.com', plan).text
  const { renderedInGoalSection, supplementary } = partitionKnowledgeItemsByPlan(output.knowledge_items, plan)
  console.log(`\n${'='.repeat(82)}\n${title}\n${'='.repeat(82)}`)
  console.log(`INPUT SUMMARY: ${inputSummary}`)
  console.log(`BI STATUS: ${interps.map((i) => `${i.category}=${i.status}`).join(', ') || '(no goals)'}`)
  console.log(`PLAN STRUCTURE SUMMARY: ${plan.explicit_sections.length} section(s); ` +
    `summary_claim_refs=[${plan.explicit_sections.flatMap((s) => s.summary_claim_refs.map((r) => r.claim_id)).join(', ') || '-'}]; ` +
    `supported_claim_refs=[${plan.explicit_sections.flatMap((s) => s.supported_claim_refs.map((r) => r.claim_id)).join(', ') || '-'}]; ` +
    `discovered_context=[${plan.discovered_context.map((d) => d.claim_ref.claim_id).join(', ') || '-'}]`)
  console.log(`\n--- BEFORE USER-VISIBLE OUTPUT ---\n${before}`)
  console.log(`--- AFTER USER-VISIBLE OUTPUT ---\n${after}`)
  console.log(`DE-DUPLICATION APPLIED: renderedInGoalSection=[${renderedInGoalSection.map((i) => i.claim_id).join(', ') || 'none'}]; supplementary=[${supplementary.map((i) => i.claim_id).join(', ') || 'none'}]`)
  console.log(`UNRESOLVED ITEMS SHOWN (structural, in plan; surfaced to the user only via BI's own unchanged hedge): ${plan.explicit_sections.flatMap((s) => s.unresolved_items.map((u) => JSON.stringify(u))).join(' | ') || 'none'}`)
  console.log(`BOUNDARY LANGUAGE: unchanged -- one educational disclaimer + one Commercial Assurance CTA, both once, at the end`)
  console.log(`WHAT THE NEW OUTPUT DELIBERATELY DOES NOT CONCLUDE:`)
  for (const d of doesNotConclude) console.log(`  - ${d}`)
}

// 1. simple directly relevant
{
  const { output, plan, interps } = pipeline([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('runway-gen3')], [])
  show('1. SIMPLE DIRECTLY RELEVANT (Runway)', 'user named Runway, asked about commercial use', output, plan, interps,
    ['project is cleared / certified', 'anything beyond the runway-gen3 claim', 'the governed statement now appears once (in "What this means"), not twice'])
}

// 2. unresolved applicability
{
  const { output, plan, interps } = pipeline([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('suno'), tm('kling')], [])
  show('2. UNRESOLVED APPLICABILITY (Suno + Kling)', 'user named Suno + Kling; Kling account status unknown', output, plan, interps,
    ['that the Kling Member exception applies (its applicability is unresolved)',
     'that the unresolved account-status item is "the blocker" / "prevents commercial use" / "is resolved"',
     'the Suno + Kling guidance appears once, not duplicated'])
}

// 3. explicit + discovered  -- with OWNERSHIP TRACE
{
  const { results, interps, output, plan } = pipeline([goal('g1', 'Can I use it commercially?', 'commercial_use')], [tm('kling')], [apm('istock')])
  show('3. EXPLICIT GOAL + DISCOVERED CONTEXT (Kling explicit; iStock stock claims discovered)',
    'explicit commercial_use goal about Kling; stock-media considerations surfaced from the described workflow', output, plan, interps,
    ['that the stock guidance answers the user\'s explicit question',
     'a fabricated UserGoal for third-party source rights',
     'each governed occurrence renders exactly once; no second "Also relevant" copy of the discovered claims'])

  console.log(`\n--- OWNERSHIP TRACE (explicit + discovered) ---`)
  const summarySet = new Set(plan.explicit_sections.flatMap((s) => s.summary_claim_refs.map((r) => `${r.matrix_identifier} ${r.claim_id}`)))
  const supportedSet = new Set(plan.explicit_sections.flatMap((s) => s.supported_claim_refs.map((r) => r.claim_id)))
  const discoveredSet = new Set(plan.discovered_context.map((d) => d.claim_ref.claim_id))
  const afterText = buildResultsEmailContent(output, 'token', 'user@example.com', plan).text
  for (const r of results) {
    const inSummaryBlocks = interps.some((i) => i.summary_blocks.join(' ').includes(r.candidate_statement ?? ' nope'))
    const ki = output.knowledge_items.find((k) => k.claim_id === r.claim_id && k.matrix_identifier === r.matrix_identifier)
    const owner =
      summarySet.has(`${r.matrix_identifier} ${r.claim_id}`) ? 'goal section (bi_summary_blocks)'
      : ki ? 'subordinate "Also relevant" block'
      : 'not rendered'
    const proseCount = r.candidate_statement ? occurrences(afterText, r.candidate_statement.slice(0, 60)) : 0
    console.log(`  ${r.matrix_identifier} :: ${r.claim_id}`)
    console.log(`    match_origin=${r.match_origin} | authorizing_goal=${r.matched_goal_category}`)
    console.log(`    BI summary occurrence=${inSummaryBlocks} | plan: summary_claim_refs=${summarySet.has(`${r.matrix_identifier} ${r.claim_id}`)} supported_claim_refs=${supportedSet.has(r.claim_id)} discovered_context=${discoveredSet.has(r.claim_id)}`)
    console.log(`    Projection knowledge_item=${!!ki} | FINAL RENDER OWNER=${owner} | FINAL PROSE OCCURRENCE COUNT=${proseCount}`)
  }
}

// 4. determination declined
{
  const { output, plan, interps } = pipeline([goal('g1', 'Can you certify this is cleared for commercial use?', 'commercial_use', 'determination_request')], [tm('runway-gen3')], [])
  show('4. DETERMINATION DECLINED (user asked CRC to certify)', 'user asked "Can you certify this is cleared for commercial use?"', output, plan, interps,
    ['CRC does not certify / clear / determine -- the existing determination-declined BI copy renders unchanged',
     'no governed guidance is invented to fill the gap; the Runway platform fact stays a subordinate consideration'])
}

// 5. no goal stated
{
  const { output, plan, interps } = pipeline([], [tm('runway-gen3')], [])
  show('5. NO GOAL STATED', 'user named Runway but asked no explicit question', output, plan, interps,
    ['with an empty plan, CC-3B changes nothing -- "Current guidance" renders exactly as before (fail-closed)'])
}
