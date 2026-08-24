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
 * to the full `AttestedFact<string>` shape (NOT a bare `Attested<string>` --
 * an earlier version of this function defaulted to `{state: 'unknown'}`
 * alone, which `??`'s union-typed inference let past `tsc --noEmit`
 * silently (the mismatch only surfaced at the two call sites that read
 * `.state` directly instead of `.attestation.state`, not here) but would
 * have crashed at runtime the moment any real code -- in particular
 * jurisdiction-clarification.ts's own `.jurisdiction.attestation.state`
 * read -- touched a historical session's deserialized jurisdiction. Caught
 * and fixed before this reached production; see the dedicated regression
 * tests below), so a historical session and a session where jurisdiction
 * genuinely hasn't been asked about yet are indistinguishable at read
 * time (both correctly mean "not confirmed") AND structurally match the
 * type every other project fact in this codebase already uses.
 */
/**
 * `asset_provider_mentions` defaulted to `[]` when absent (Living Knowledge
 * — Third-Party Source Rights, M1+M2, 2026-08-18): same reasoning and same
 * funnel as the `user_goals` default above -- a session persisted before
 * this field existed round-trips through JSON.parse with no
 * `asset_provider_mentions` key at all, which would otherwise leave it
 * `undefined` at runtime despite the type claiming `AssetProviderMention[]`.
 */
/**
 * `project_facts.human_contribution_description` defaulted when absent
 * (Copyright UAT Correction Milestone, 2026-08-19): same reasoning, same
 * funnel, same full-`AttestedFact<string>` shape as the `jurisdiction`
 * default immediately above (added 2026-08-16) -- a session persisted
 * before this field existed has a `project_facts` object but no
 * `human_contribution_description` key on it. No database migration
 * needed: `StructuredUnderstanding` is stored as JSONB and this funnel is
 * the single normalization point every load path already goes through.
 */
export function deserializeStructuredUnderstanding(json: string): StructuredUnderstanding {
  const parsed = JSON.parse(json) as StructuredUnderstanding
  const user_goals = (parsed.user_goals ?? []).map((g) => ({
    ...g,
    category: g.category ?? 'unknown',
    scope: g.scope ?? 'informational',
  }))
  const project_facts: StructuredUnderstanding['project_facts'] = {
    ...parsed.project_facts,
    jurisdiction: parsed.project_facts?.jurisdiction ?? { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    human_contribution_description: parsed.project_facts?.human_contribution_description ?? {
      attestation: { state: 'unknown' },
      source_turn: 0,
      source_statement: '',
    },
  }
  /**
   * `usage`/`license` per-element defaulting (Track B — Generic
   * Living-Knowledge Readiness/Askability milestone, 2026-08-20): a session
   * persisted before these two AssetProviderMention fields existed has an
   * `asset_provider_mentions` array, but individual elements lack
   * `usage`/`license` keys. Same reasoning and same funnel as the
   * per-goal `category`/`scope` backfill above -- defaulted here once, to
   * the same conservative `{state: 'unknown'}` fallback every other
   * newly-added Attested<T> field in this codebase defaults to.
   */
  const asset_provider_mentions = (parsed.asset_provider_mentions ?? []).map((m) => ({
    ...m,
    usage: m.usage ?? { state: 'unknown' as const },
    license: m.license ?? { state: 'unknown' as const },
  }))
  return { ...parsed, user_goals, project_facts, asset_provider_mentions }
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

/**
 * `knowledge_readiness_used` defaulted to `{}` when absent (Track B —
 * Generic Living-Knowledge Readiness/Askability milestone, 2026-08-20):
 * same reasoning as the Record<string, number> fields this mirrors
 * (`follow_ups_used`/`uncertainty_clarifications_used`, both foundational
 * since Phase 4 and therefore never needing this treatment) -- a session
 * persisted before this field existed has no `knowledge_readiness_used`
 * key at all, which would otherwise leave it `undefined` at runtime
 * despite the type claiming `Record<string, number>`; any code that reads
 * `state.knowledge_readiness_used[key]` would throw on such a session
 * without this default.
 */
export function deserializeBoundaryState(json: string): BoundaryState {
  const parsed = JSON.parse(json) as BoundaryState
  // selector_needs_used (CRC Narrow Governed Selector Questioning milestone,
  // 2026-08-24): same Record<string, number> default-on-missing treatment as
  // knowledge_readiness_used immediately above, for the same reason -- a
  // session persisted before this field existed has no key for it at all.
  return { ...parsed, knowledge_readiness_used: parsed.knowledge_readiness_used ?? {}, selector_needs_used: parsed.selector_needs_used ?? {} }
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
