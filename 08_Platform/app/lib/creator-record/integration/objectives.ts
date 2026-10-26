/**
 * CR-IMPL-1b — the two fixed, system-defined Creator Record evaluation
 * objectives (PM decision, CR-ARCH-1 §3).
 *
 * These are product objectives, not customer UserGoals: no lifecycle, no
 * source turn, never persisted as goals, never passed to retrieval as
 * discovered relevance. The BiIntent uses a fixed label and `informational`
 * scope, mirroring the Product A preview's intent
 * (lib/production-review/run-production-review.ts) and HRR's
 * researchIntentToBiIntent. BI echoes `intent_id` to `goal_id`, which is how
 * composition keeps the claim → objective → interpretation link.
 */

import type { BiIntent } from '@/lib/bounded-interpretation/types'
import type { CreatorRecordObjective } from '../contract/compose'

export const CREATOR_RECORD_OBJECTIVE_TOPICS = ['commercial_use', 'third_party_source_rights'] as const
export type CreatorRecordObjectiveTopic = (typeof CREATOR_RECORD_OBJECTIVE_TOPICS)[number]

/** Fixed internal labels. Never customer text, never rendered from here. */
const OBJECTIVE_LABELS: Record<CreatorRecordObjectiveTopic, string> = {
  commercial_use: 'Creator Record objective: commercial use of the AI tools declared',
  third_party_source_rights: 'Creator Record objective: rights in third-party source material declared',
}

export const OBJECTIVE_VERSION = 1

export interface CreatorRecordObjectiveDefinition extends CreatorRecordObjective {
  topic: CreatorRecordObjectiveTopic
}

export const CREATOR_RECORD_OBJECTIVES: readonly CreatorRecordObjectiveDefinition[] = CREATOR_RECORD_OBJECTIVE_TOPICS.map((topic) => ({
  objective_id: `creator-record:${topic}:v${OBJECTIVE_VERSION}`,
  version: OBJECTIVE_VERSION,
  topic,
  origin: 'creator_record_system_objective' as const,
}))

export function objectiveToBiIntent(objective: CreatorRecordObjectiveDefinition): BiIntent {
  return { intent_id: objective.objective_id, intent_text: OBJECTIVE_LABELS[objective.topic], category: objective.topic, scope: 'informational' }
}
