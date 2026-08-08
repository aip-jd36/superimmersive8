/**
 * Explicit decline action deterministic test suite
 * (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §4, Live Interview Runtime
 * milestone). Trivial mapping, tested anyway -- matching this project's
 * own established discipline of testing even the obvious.
 */

import { resolveDeclineSignal } from '@/lib/crc-engine/decline'

describe('resolveDeclineSignal', () => {
  test('skip_question -> { scope: "question" }', () => {
    expect(resolveDeclineSignal('skip_question')).toEqual({ scope: 'question' })
  })

  test('skip_phase -> { scope: "phase" }', () => {
    expect(resolveDeclineSignal('skip_phase')).toEqual({ scope: 'phase' })
  })

  test('stop_interview -> { scope: "interview" }', () => {
    expect(resolveDeclineSignal('stop_interview')).toEqual({ scope: 'interview' })
  })

  test('never produces scope: "ambiguous" -- structurally unreachable through this path, by design', () => {
    const actions = ['skip_question', 'skip_phase', 'stop_interview'] as const
    for (const action of actions) {
      expect(resolveDeclineSignal(action).scope).not.toBe('ambiguous')
    }
  })
})
