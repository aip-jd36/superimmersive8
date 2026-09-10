/**
 * Deterministic mock `ResearchIntentInterpreter` for tests (CAH-4G.2 Slice
 * 2). Parallel to `mock-decision.ts` / `mock-extractor.ts` in
 * `lib/interview-engine/` — returns whatever it was constructed with,
 * ignoring the reviewer question entirely. The normal test suite never
 * touches live Anthropic access.
 */

import type { ResearchIntentInterpreter } from './interpret-research-intent'
import type { PermittedResearchIntent } from './types'

/** Always resolves to `intent`, ignoring the question. */
export function constantResearchIntentInterpreter(intent: PermittedResearchIntent): ResearchIntentInterpreter {
  return async (_reviewerQuestion: string) => intent
}

/** Resolves the question through `fn` — for tests that need per-input behavior. */
export function functionResearchIntentInterpreter(
  fn: (reviewerQuestion: string) => PermittedResearchIntent,
): ResearchIntentInterpreter {
  return async (reviewerQuestion: string) => fn(reviewerQuestion)
}
