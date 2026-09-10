/**
 * Bounded Interpretation input adapters (CAH-4G Slice 1, 2026-09-10).
 *
 * `buildBoundedInterpretations` consumes the generic `BiIntent` contract
 * (`types.ts`). Each caller adapts its own genuine domain data into that
 * contract here — the rule table never learns a caller's shape.
 *
 * Slice 1 provides the CRC adapter only. `userGoalsToBiIntents` is a pure,
 * deterministic mapping: it performs EXACTLY the active-and-confirmed filter
 * Bounded Interpretation previously applied inline
 * (`build-bounded-interpretation.ts`, historical line 178:
 * `g.superseded_by === null && g.state === 'confirmed'`) and maps the four
 * fields the rule table reads. It adds no field, drops no goal the old
 * inline filter kept, and preserves goal order — so
 * `buildBoundedInterpretations(userGoalsToBiIntents(goals), …)` is
 * behaviour-identical to the pre-slice `buildBoundedInterpretations(goals, …)`
 * for every input. That equivalence is exercised by the entire existing
 * `__tests__/bounded-interpretation/**` + CRC/retrieval integration suites,
 * which now route through this adapter unchanged.
 *
 * The research-intent adapters (a research intent to `BiIntent`, and a
 * reviewer claim to a bounded-interpretation result) land with the reviewer
 * research runtime in a later slice, next to their first real consumer —
 * they are not created speculatively here.
 *
 * Import boundary: this file (unlike Bounded Interpretation's core —
 * `build-bounded-interpretation.ts`, `rules.ts`, `types.ts`) is permitted to
 * import a caller's contract type (`@/types/interview-engine`'s `UserGoal`),
 * because adapting caller data is precisely its job. The core stays free of
 * every caller shape.
 */

import type { UserGoal } from '@/types/interview-engine'
import type { BiIntent } from './types'

/**
 * CRC adapter: genuine, captured `UserGoal[]` → generic `BiIntent[]`.
 *
 * Filters to active (`superseded_by === null`) and `confirmed` goals — the
 * exact predicate Bounded Interpretation applied internally before this
 * slice — then maps `goal_id → intent_id`, `raw_text → intent_text`, and
 * carries `category` / `scope` verbatim. No synthetic goals, no field
 * invention, order preserved.
 */
export function userGoalsToBiIntents(goals: UserGoal[]): BiIntent[] {
  return goals
    .filter((g) => g.superseded_by === null && g.state === 'confirmed')
    .map((g) => ({
      intent_id: g.goal_id,
      intent_text: g.raw_text,
      category: g.category,
      scope: g.scope,
    }))
}
