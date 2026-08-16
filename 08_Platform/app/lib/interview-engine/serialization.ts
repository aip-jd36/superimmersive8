/**
 * Serialization for StructuredUnderstanding — Alpha 0 checkpoint
 * (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 1a).
 *
 * The domain model is plain JSON-safe data (string/number/null literals,
 * arrays, discriminated unions tagged by a string field) — no Date, Map, Set,
 * or class instances anywhere in it — so a direct JSON.stringify/parse round
 * trip is lossless. These wrappers exist as the single named entry point for
 * that round trip, not because the underlying operation is non-trivial: any
 * future need for a custom reviver/replacer (e.g. if a non-JSON-safe field is
 * ever added) has exactly one place to go in.
 */

import type { RetrievalHandoff, StructuredUnderstanding } from '@/types/interview-engine'
import type { BoundaryState } from './boundaries'

export function serializeStructuredUnderstanding(su: StructuredUnderstanding): string {
  return JSON.stringify(su)
}

/**
 * `user_goals` defaulted to `[]` when absent (CRC User Goal — Milestone 1,
 * 2026-08-15): a session persisted before this field existed round-trips
 * through a plain JSON.parse with no `user_goals` key at all, which would
 * otherwise leave it `undefined` at runtime despite the type claiming
 * `UserGoal[]` -- any code that reads `su.user_goals` as an array (e.g.
 * `.filter()`) would throw on such a session. This is the single funnel
 * every StructuredUnderstanding load path (in particular
 * supabase-session-store.ts) already goes through, so the default lives
 * here once rather than at each call site. No other field needs the same
 * treatment: every other array/object field on this type has existed since
 * before any session currently in the database was created.
 *
 * Per-goal `category`/`scope` backfill (Milestone 2, 2026-08-15): a goal
 * persisted between Milestone 1's launch and Milestone 2's deploy has a
 * `user_goals` array but no `category`/`scope` keys on its individual
 * elements (those fields didn't exist yet). Same reasoning as the
 * array-level default above -- defaulted here once, to the same
 * conservative fallbacks attestCandidate itself uses for a newly-extracted
 * goal (`'unknown'` / `'informational'`), so a historical goal and a goal
 * the extractor genuinely couldn't classify are indistinguishable at read
 * time, which is correct: both mean "no confident classification exists."
 */
/**
 * `project_facts.jurisdiction` defaulted when absent (CRC Living Knowledge
 * Phase 1, 2026-08-16): a session persisted before this field existed has
 * a `project_facts` object but no `jurisdiction` key on it. Same funnel,
 * same reasoning as the `user_goals` default above -- defaulted here once
 * to `{state: 'unknown'}`, the same conservative fallback every other
 * unconfirmed attested field in this codebase uses, so a historical
 * session and a session where jurisdiction genuinely hasn't been asked
 * about yet are indistinguishable at read time (both correctly mean "not
 * confirmed").
 */
export function deserializeStructuredUnderstanding(json: string): StructuredUnderstanding {
  const parsed = JSON.parse(json) as StructuredUnderstanding
  const user_goals = (parsed.user_goals ?? []).map((g) => ({
    ...g,
    category: g.category ?? 'unknown',
    scope: g.scope ?? 'informational',
  }))
  const project_facts = {
    ...parsed.project_facts,
    jurisdiction: parsed.project_facts?.jurisdiction ?? { state: 'unknown' as const },
  }
  return { ...parsed, user_goals, project_facts }
}

/**
 * BoundaryState (Phase 4) is equally plain JSON-safe data -- a Record<string,
 * number>, a boolean, and an array -- so it gets the same named round-trip
 * entry point, kept deliberately separate from StructuredUnderstanding's
 * (rather than folded into one generic serialize function) since the two
 * types are intentionally never nested inside each other.
 */
export function serializeBoundaryState(state: BoundaryState): string {
  return JSON.stringify(state)
}

export function deserializeBoundaryState(json: string): BoundaryState {
  return JSON.parse(json) as BoundaryState
}

/**
 * RetrievalHandoff (Phase 5) is equally plain JSON-safe data. Same named
 * round-trip entry point, same reasoning as the two pairs above.
 */
export function serializeRetrievalHandoff(handoff: RetrievalHandoff): string {
  return JSON.stringify(handoff)
}

export function deserializeRetrievalHandoff(json: string): RetrievalHandoff {
  return JSON.parse(json) as RetrievalHandoff
}
