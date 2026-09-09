/**
 * CRC project-context projection — neutral data contract (CAH-4B).
 *
 * The pure, presentation-only projection of a persisted `StructuredUnderstanding`
 * into a bounded, non-interpreting "what the customer described" shape. Extracted
 * mechanically from `lib/crc-sales/types.ts` (the `Sales*` projection types) so
 * that BOTH the CRC→Sales surface AND the Commercial Assurance reviewer-context
 * surface can consume ONE projection without either importing the other. The
 * shapes are byte-identical to the pre-extraction `Sales*` types — this is a
 * relocation + rename, never a redesign.
 *
 * Carries NO risk / materiality / readiness / priority / next-action concept,
 * no governed claim prose, no interpretation of any assertion. Same discipline
 * as `lib/crc-sales/projection.ts`'s own header.
 */

import type { GoalCategory, ConfidenceState } from '@/types/interview-engine'

/** An explicit, confirmed `UserGoal` the customer stated (non-superseded). Never synthesized from discovered relevance. */
export interface CrcProjectGoal {
  raw_text: string
  category: GoalCategory
  scope: string
  state: ConfidenceState
}

/** A single current (non-superseded) customer-described project-context fact. */
export interface CrcProjectAssertion {
  /** Stable label for the kind of assertion, e.g. 'tool', 'asset_provider', 'intended_use'. Never a domain-specific composer key. */
  kind: string
  /** Human-neutral summary of what the user stated — verbatim `source_statement` where one exists, else a fixed structural rendering of the resolved value. Never interpreted. */
  stated: string
  /** Canonical identifier where the mention resolved to one (e.g. a tool id); null otherwise. */
  canonical_id: string | null
  state: ConfidenceState
  source_turn: number
}

/** A superseded / corrected customer statement, preserved verbatim. */
export interface CrcCorrectionHistoryItem {
  kind: string
  /** The superseded statement, verbatim. */
  stated: string
  source_turn: number
  superseded_by: string | null
}

export interface CrcProjectContext {
  goals: CrcProjectGoal[]
  /** Current (non-superseded) assertions only. */
  assertions: CrcProjectAssertion[]
  /** Available on demand — superseded assertions / goals, preserved verbatim. */
  correction_history: CrcCorrectionHistoryItem[]
}
