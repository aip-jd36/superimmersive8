/**
 * Explicit decline actions (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §4,
 * Live Interview Runtime milestone). UI affordances, not LLM
 * interpretation -- `DeclineAction` is the fixed, closed set of things a
 * user can click; `resolveDeclineSignal` maps each 1:1 onto
 * `boundaries.ts`'s own already-typed `DeclineSignal`, with zero
 * inference. This is the entire design: three UI actions, three signal
 * scopes, no classifier.
 *
 * `DeclineSignal.scope` also allows `'ambiguous'`, a fourth value this
 * module never produces -- per the runtime doc's own disclosed
 * consequence, an affordance-only design makes that value structurally
 * unreachable through this path. Not a defect; recorded, not silently
 * left unreachable without explanation.
 */

import type { DeclineSignal } from '@/lib/interview-engine/boundaries'

export const DECLINE_ACTIONS = ['skip_question', 'skip_phase', 'stop_interview'] as const
export type DeclineAction = (typeof DECLINE_ACTIONS)[number]

export function resolveDeclineSignal(action: DeclineAction): DeclineSignal {
  switch (action) {
    case 'skip_question':
      return { scope: 'question' }
    case 'skip_phase':
      return { scope: 'phase' }
    case 'stop_interview':
      return { scope: 'interview' }
  }
}
