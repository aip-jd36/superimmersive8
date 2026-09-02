/**
 * CC-3A -- human-reviewable plan snapshots.
 *
 * Builds a ConsultativeAnswerPlan for four representative shapes, driving the
 * REAL retrieve() + buildBoundedInterpretations() pipeline over MATRIX_FIXTURE
 * / TOPIC_CLAIMS_FIXTURE wherever possible, and prints each plan verbatim.
 *
 * Run:  npx tsx lib/crc-engine/scripts/cc3a-plan-snapshots.ts   (from 08_Platform/app)
 *
 * This is a review aid, not a test and not production code. It renders NO
 * hypothetical user-facing prose -- only the plan structure.
 */

import { buildConsultativeAnswerPlan } from '@/lib/crc-engine/consultative-answer-plan'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BoundedInterpretation } from '@/lib/bounded-interpretation/types'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [],
    certainty_state: 'gate_1_unmet', exclusions: [], ...overrides,
  }
}
const t = (identifier: string) => ({ identifier, access_surface: 'unresolved' as const, plan_tier: 'unknown' as const })
function g(goal_id: string, raw_text: string, category: UserGoal['category']): UserGoal {
  return { goal_id, raw_text, category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: raw_text }
}
function tm(identifier: string, overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: `m-${identifier}`, resolution: { kind: 'canonical', identifier },
    access_surface: { state: 'unknown' }, plan_tier: { state: 'unknown' }, account_status: { state: 'unknown' },
    confidence: 'confirmed', source_turn: 1, source_statement: identifier, superseded_by: null, ...overrides,
  }
}
const facts = (toolMentions: ToolMention[] = []): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions })

function show(title: string, inputSummary: string, biStatuses: string[], plan: unknown, doesNotConclude: string[]) {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`)
  console.log(`INPUT SUMMARY: ${inputSummary}`)
  console.log(`BI STATUS:     ${biStatuses.join(', ')}`)
  console.log(`PLAN STRUCTURE:\n${JSON.stringify(plan, null, 2)}`)
  console.log(`WHAT THE PLAN DELIBERATELY DOES NOT CONCLUDE:`)
  for (const d of doesNotConclude) console.log(`  - ${d}`)
}

// ── 1. simple directly relevant (Runway) ──
{
  const goal = g('g1', 'Can I use it commercially?', 'commercial_use')
  const out = retrieve(handoff({ tools: [t('runway-gen3')] }), MATRIX_FIXTURE, [goal], [], facts())
  const interps = buildBoundedInterpretations([goal], out.results, out.diagnostics)
  const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  show('1. SIMPLE DIRECTLY RELEVANT', 'commercial_use goal + Runway tool', interps.map((i) => i.status), plan, [
    'that the project is commercially cleared / rights-cleared / certified',
    'anything beyond the referenced runway-gen3 claim (no ownership, no jurisdiction analysis)',
    'boundary_ref is a *reference* to an existing rules.ts string, not new prose',
  ])
}

// ── 2. unresolved applicability + dependency (Suno + Kling, Kling account status unknown) ──
{
  const goal = g('g1', 'Can I use it commercially?', 'commercial_use')
  const out = retrieve(handoff({ tools: [t('suno'), t('kling')] }), MATRIX_FIXTURE, [goal], [], facts([tm('suno'), tm('kling')]))
  const interps = buildBoundedInterpretations([goal], out.results, out.diagnostics)
  const plan = buildConsultativeAnswerPlan(interps, out.results, out.diagnostics)
  show('2. UNRESOLVED APPLICABILITY / DEPENDENCY', 'commercial_use goal + Suno + Kling (Kling account_status unknown)', interps.map((i) => i.status), plan, [
    'that the Kling Member exception applies (its applicability is unresolved, retained as a neutral item)',
    'that the unresolved account-status item is THE blocker, or that it prevents commercial use',
    'that the Suno Free/Basic-vs-Pro/Premier conditional resolves either way (only claim_id is referenced)',
    'anything about what Commercial Assurance "will resolve" -- commercial_assurance_refs is a pointer only',
  ])
}

// ── 3. explicit goal + discovered context (literal discovered result, real BI shape) ──
{
  // Real explicit-goal BI over a topic fixture, then a discovered result appended
  // to demonstrate routing. (A full Track-A discovery pipeline is exercised in
  // discovered-relevance-retrieval.test.ts; here we only show the plan's split.)
  const explicit: BoundedInterpretation = {
    goal_id: 'g1', goal_text: 'Can I use it commercially?', category: 'commercial_use',
    status: 'directly_relevant', summary: 'BI summary (verbatim passthrough).', summary_blocks: ['BI summary (verbatim passthrough).'],
    supporting_claim_ids: ['kling-commercial-use-baseline', 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1'], unresolved_relevant_claims: [],
  }
  const results: RetrievalResult[] = [
    { source_fact: { kind: 'tool', identifier: 'kling' }, claim_id: 'kling-commercial-use-baseline', matrix_identifier: 'kling', publication_scope: 's', candidate_statement: 's', last_verified: '2026-08-24', topic: 'commercial_use', unresolved_project_dependencies: [], match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null },
    { source_fact: { kind: 'topic', identifier: 'third_party_source_rights' }, claim_id: 'CLAIM-STOCK-ISTOCK-EDITORIAL-001-v1', matrix_identifier: 'third_party_source_rights', publication_scope: 's', candidate_statement: 's', last_verified: '2026-08-18', topic: 'third_party_source_rights', unresolved_project_dependencies: [], match_origin: 'discovered_topic', matched_goal_category: 'commercial_use', relationship_id: null },
  ]
  const plan = buildConsultativeAnswerPlan([explicit], results, [])
  show('3. EXPLICIT GOAL + DISCOVERED CONTEXT', 'one commercial_use goal; one exact_topic tool claim + one discovered_topic stock claim', ['directly_relevant'], plan, [
    'that the discovered stock claim is something the user asked about (it stays in discovered_context)',
    'a fabricated UserGoal for third_party_source_rights',
    'that discovered context outranks the explicit section',
  ])
}

// ── 4. correction / supersession (pre vs post) ──
{
  const pre: BoundedInterpretation = {
    goal_id: 'g1', goal_text: 'Can I use it commercially?', category: 'commercial_use', status: 'directly_relevant',
    summary: 's', summary_blocks: ['s'], supporting_claim_ids: ['suno'], unresolved_relevant_claims: [],
  }
  const preResults: RetrievalResult[] = [{ source_fact: { kind: 'tool', identifier: 'suno' }, claim_id: 'suno', matrix_identifier: 'suno', publication_scope: 's', candidate_statement: 's', last_verified: '2026-09-01', topic: 'commercial_use', unresolved_project_dependencies: [], match_origin: 'exact_topic', matched_goal_category: 'commercial_use', relationship_id: null }]
  const post: BoundedInterpretation = { ...pre, supporting_claim_ids: ['kling-commercial-use-baseline'] }
  const postResults: RetrievalResult[] = [{ ...preResults[0], source_fact: { kind: 'tool', identifier: 'kling' }, claim_id: 'kling-commercial-use-baseline', matrix_identifier: 'kling', last_verified: '2026-08-24' }]
  console.log(`\n${'='.repeat(78)}\n4. CORRECTION / SUPERSESSION (Suno -> Kling)\n${'='.repeat(78)}`)
  console.log('INPUT SUMMARY: pre-correction BI/results reference Suno; post-correction BI/results (already active-state-filtered upstream) reference only Kling')
  console.log('BI STATUS:     directly_relevant (both)')
  console.log(`PLAN (pre-correction):\n${JSON.stringify(buildConsultativeAnswerPlan([pre], preResults, []), null, 2)}`)
  console.log(`PLAN (post-correction):\n${JSON.stringify(buildConsultativeAnswerPlan([post], postResults, []), null, 2)}`)
  console.log('WHAT THE PLAN DELIBERATELY DOES NOT CONCLUDE:')
  console.log('  - the post-correction plan retains NO Suno reference (the planner holds no history; it carries only what BI/Retrieval already active-state-filtered)')
  console.log('  - no "you changed your answer" / diff narrative is produced')
}

void TOPIC_CLAIMS_FIXTURE // imported for parity with the test setup; not needed by these four snapshots
