/**
 * Bounded Interpretation composition (CRC Milestone 2, 2026-08-15). Pure
 * function: active, confirmed user goals + already-computed
 * RetrievalResult[] -> BoundedInterpretation[]. No new inference, no
 * fact-conditional matching added to Retrieval, no model call.
 *
 * Only goals that are both ACTIVE (`superseded_by === null`) and
 * `state === 'confirmed'` produce an interpretation — a declined,
 * confirmed_absent, or superseded goal has no "thing the user actually
 * asked" left to interpret (mirrors PM invariant #8: "positive
 * interpretation requires confirmed fact").
 */

import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { UserGoal } from '@/types/interview-engine'
import type { BoundedInterpretation } from './types'
import { DETERMINATION_DECLINED_TEMPLATE, directlyRelevantSummary, outsideCoverageSummary } from './rules'

export function buildBoundedInterpretations(goals: UserGoal[], results: RetrievalResult[]): BoundedInterpretation[] {
  const activeConfirmedGoals = goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')

  return activeConfirmedGoals.map((goal) => {
    // Scope check first, unconditionally -- a determination request never
    // receives a category-specific coverage answer, even when a matching
    // claim exists, per PM revision 2/3: answering the category question
    // at all would still be issuing something CRC doesn't issue.
    if (goal.scope === 'determination_request') {
      return buildInterpretation(goal, 'determination_declined', DETERMINATION_DECLINED_TEMPLATE, [])
    }

    const matches = results.filter((r) => r.topic === goal.category)
    if (matches.length > 0) {
      // Multiple matches are possible (e.g. two mentioned tools both tagged
      // 'commercial_use') -- join every matched claim's own governed
      // statement rather than picking just one, since dropping a
      // retrieved, eligible claim silently would be its own kind of
      // omission this pipeline otherwise avoids everywhere else.
      const combinedStatement = matches.map((m) => m.candidate_statement).filter((s): s is string => s !== null).join(' ')
      const claimIds = matches.map((m) => m.claim_id)
      if (combinedStatement === '') {
        // Defensive: every 'directly_relevant'-eligible RetrievalResult in
        // practice carries a non-null candidate_statement (assembleResult
        // never emits a result without one for a Yes claim -- see
        // retrieval-engine/assemble-result.ts), so this branch is not
        // reachable with the current Matrix. Falls back to
        // outside_current_coverage rather than rendering an empty
        // sentence, never fabricating claim text to fill the gap.
        return buildInterpretation(goal, 'outside_current_coverage', outsideCoverageSummary(goal.category), [])
      }
      // Source-aware boundary clause (LK Phase 1 governance refinement,
      // 2026-08-16) -- see rules.ts's own boundaryClause doc comment. Every
      // matched RetrievalResult already carries its own source_fact.kind;
      // this is a read of existing data, not a new fact or new matching
      // logic.
      const allToolSourced = matches.every((m) => m.source_fact.kind === 'tool')
      return buildInterpretation(goal, 'directly_relevant', directlyRelevantSummary(goal.category, combinedStatement, allToolSourced), claimIds)
    }

    return buildInterpretation(goal, 'outside_current_coverage', outsideCoverageSummary(goal.category), [])
  })
}

function buildInterpretation(
  goal: UserGoal,
  status: BoundedInterpretation['status'],
  summary: string,
  supporting_claim_ids: string[],
): BoundedInterpretation {
  return {
    goal_id: goal.goal_id,
    goal_text: goal.raw_text,
    category: goal.category,
    status,
    summary,
    supporting_claim_ids,
  }
}
