/**
 * ResearchSessionContext — bounded HRR session context: PURE TYPES + SELECTOR
 * ONLY (CAH-4G.15, 2026-09-11).
 *
 * ============================================================================
 * INERT. Nothing in this file is imported by the live HRR research route,
 * the classifier, `hrrAuthorityGate`, or `runHrrResearch`. It changes NO
 * production behavior. It exists to make the CAH-4G.14 design
 * (`lib/reviewer-lk/ADR-003-hrr-conversation-context.md`, "CAH-4G.14 —
 * Bounded Research Session Context: Refined Design + Pre-Registration")
 * mechanically testable BEFORE any implementation-authorization decision.
 * Wiring this into the live classifier call, the research route's
 * `parseBody`, or any request/response shape is explicitly NOT part of this
 * milestone and remains gated on `ADR-003` §19's nine conditions.
 * ============================================================================
 *
 * `ResearchSessionContext` is DERIVED, not stored. It is a pure, stateless
 * projection of the EXISTING client `HrrThreadState` (`hrr-thread.ts`,
 * unmodified) — no new reducer action, no new persisted field, no
 * localStorage/sessionStorage/cookie/DB/migration. "Clear conversation"
 * already resets `HrrThreadState.turns` to `[]`; deriving from that trivially
 * empties this context too, with zero new code path.
 *
 * Every field is an identifier or enum — never prose. The derivation reads
 * ONLY structured fields already present on `HrrResearchAnswer`
 * (`lib/hrr/types.ts`): `topics[].topic` (a governed enum) and
 * `topics[].unresolved_inputs[].identifier` (an existing bounded governed
 * identifier — `ApplicabilityFact` or a governed project-dependency string,
 * never invented here). It NEVER inspects `orientation`, `boundary_note`,
 * `bi_summary_blocks`, `governed_considerations[].statement_verbatim`, any
 * other rendered/composed prose field, or the reviewer's own raw question
 * text (`HrrReviewerTurn` free-form `question` is never read by this
 * module — CAH-4G.15 Phase 4's hard gate).
 */

import type { HrrThreadState } from '@/app/admin/submissions/[id]/review/hrr-thread'
import type { ReviewerResearchTopic } from '@/lib/reviewer-lk/types'
import { REVIEWER_RESEARCH_TOPICS } from '@/lib/reviewer-lk/types'

/**
 * Hard structural bound on referent count — a fixed constant, never inferred
 * from array length. Mirrors the existing `HRR_MAX_RESOLVED_TOPICS`
 * convention (`lib/reviewer-lk/types.ts`).
 */
export const HRR_MAX_UNRESOLVED_REFERENTS = 5

/**
 * Hard structural bound on ONE referent identifier's string length. Governed
 * identifiers (`ApplicabilityFact` values, project-dependency identifiers)
 * are short fixed tokens in practice; this cap makes that a mechanically
 * enforced property of the contract, not an informal assumption.
 */
export const HRR_MAX_REFERENT_IDENTIFIER_LENGTH = 100

/**
 * The bounded, generic HRR session context. Every field traces to a
 * mechanism that already exists in the shipped architecture:
 *   - `activeFocus` / `activeFocusOrigin` reuse the EXISTING
 *     `ExplicitResearchIntent.source_kind` / `HrrResearchTopicResult
 *     .intent_origin` enum (`lib/reviewer-lk/types.ts` / `lib/hrr/types.ts`)
 *     — no new type.
 *   - `unresolvedReferents` reuses the EXISTING
 *     `HrrUnresolvedInput.identifier` field already present on every
 *     answer (`lib/hrr/types.ts`) — no new data invented.
 *
 * Structurally incapable of carrying: transcript, prior answer prose,
 * generated summaries, cached applicability/BI results, project-fact
 * values, or an assessment conclusion — there is no field for any of them.
 */
export interface ResearchSessionContext {
  /** The single governed topic the session is anchored to, or `null` — fail-closed default. Never free text. */
  activeFocus: ReviewerResearchTopic | null
  /** How `activeFocus` was established. `null` iff `activeFocus` is `null`. */
  activeFocusOrigin: 'topic_selection' | 'interpreted_question' | null
  /**
   * Bounded, deduplicated, capped identifiers of the most recently surfaced
   * unresolved items for `activeFocus`. `[]` iff `activeFocus` is `null`.
   * Never the requirement's content/note/prose — identifiers only, each
   * ≤ `HRR_MAX_REFERENT_IDENTIFIER_LENGTH` chars, count ≤
   * `HRR_MAX_UNRESOLVED_REFERENTS`.
   */
  unresolvedReferents: string[]
}

/** The fail-closed empty context — "no clear active focus". A fresh object each call; never a shared mutable singleton to mutate by accident. */
export function emptyResearchSessionContext(): ResearchSessionContext {
  return { activeFocus: null, activeFocusOrigin: null, unresolvedReferents: [] }
}

/** Convenience read-only alias for the common case — do not mutate. */
export const EMPTY_RESEARCH_SESSION_CONTEXT: ResearchSessionContext = emptyResearchSessionContext()

const REVIEWER_RESEARCH_TOPIC_SET = new Set<string>(REVIEWER_RESEARCH_TOPICS)

/**
 * Pure, deterministic selector: `HrrThreadState` (as already maintained by
 * `hrrThreadReducer`, unmodified) -> `ResearchSessionContext`.
 *
 * Scans settled turns from the most recent backward, looking for the most
 * recent turn whose answer resolved to EXACTLY ONE governed topic (a
 * "single-focus" turn). All other turn shapes are handled per the
 * pre-registered CAH-4G.15 Phase 5 lifecycle table:
 *
 *  1. empty thread                -> EMPTY (loop does not execute)
 *  2. first topic-pick             -> that topic becomes `activeFocus`
 *  3. first free-form resolved     -> that topic becomes `activeFocus`
 *  4. same-focus turn (repeat)     -> most recent single-topic turn wins
 *  5. explicit topic switch        -> most recent single-topic turn wins
 *     (a topic different from an older one simply IS the most recent)
 *  6. failed turn (`status:'error'`)      -> transparent, skip, look further back
 *  7. authority-only turn (`topics: []`)  -> transparent, skip, look further back
 *  8. pending turn (`status:'pending'`)   -> transparent, skip (no answer yet)
 *  9. stale/aborted turn                  -> not representable here: the
 *     reducer's own `settle` guard (`action.seq !== state.inFlight`)
 *     already discards a stale settle before it is ever appended to
 *     `turns` — there is no stale-turn shape for this selector to see.
 * 10. clear conversation           -> `turns: []` -> case 1 (EMPTY)
 * 11. multi-topic/ambiguous result -> `activeFocus` RESET to `null`,
 *     scanning STOPS (does not fall through to an older single-topic turn)
 *     — a design decision (`ADR-003` §6), not evidence-proven; forcing the
 *     next question to be explicit is judged safer than guessing which of
 *     several named topics is "the" active one.
 * 12. no resolved topic anywhere   -> loop exhausts -> EMPTY
 * 13. unknown/malformed topic value (defensive; should be architecturally
 *     unreachable — HRR only ever researches `ReviewerResearchTopic`
 *     values) -> that entry is filtered out before the single/multi
 *     distinction is made, so it degrades to case 7/11/12 as appropriate,
 *     never propagated as `activeFocus`.
 */
export function deriveResearchSessionContext(thread: HrrThreadState): ResearchSessionContext {
  for (let i = thread.turns.length - 1; i >= 0; i--) {
    const turn = thread.turns[i]
    if (turn.role !== 'hrr') continue // reviewer turns (topic label / raw question prose) are never a source — Phase 4
    if (turn.status !== 'answer') continue // 'pending' (case 8) / 'error' (case 6) — transparent, keep scanning back

    // Filter to recognized governed topics only (case 13 defensive narrowing).
    const resolvedTopics = turn.answer.topics.filter((t) => REVIEWER_RESEARCH_TOPIC_SET.has(t.topic))

    if (resolvedTopics.length === 0) continue // authority-only turn (case 7), or every topic was malformed (case 13) — transparent
    if (resolvedTopics.length > 1) return emptyResearchSessionContext() // multi-topic/ambiguous (case 11) — reset, stop scanning

    const [only] = resolvedTopics
    const referents = only.unresolved_inputs
      .map((u) => u.identifier)
      .filter((id) => id.length > 0 && id.length <= HRR_MAX_REFERENT_IDENTIFIER_LENGTH)
      .slice(0, HRR_MAX_UNRESOLVED_REFERENTS)

    return {
      activeFocus: only.topic as ReviewerResearchTopic,
      activeFocusOrigin: only.intent_origin,
      unresolvedReferents: referents,
    }
  }
  return emptyResearchSessionContext() // case 1 (empty thread) / case 12 (nothing ever resolved)
}

/**
 * Pure, deterministic, bounded-length text builder — the proposed classifier
 * input prefix (`ADR-003` §9), analogous to CRC's `buildUserMessageContent`
 * fixed `[Context: …]` lines. NOT wired to any classifier call in this
 * milestone. Fixed-template, enum/identifier-only — structurally incapable
 * of carrying prose, since its only inputs are `ResearchSessionContext`'s
 * own bounded fields.
 *
 * `null` iff `context.activeFocus === null` — no context, no prefix, the
 * caller's classifier input is byte-identical to today's unmodified system.
 */
export function buildResearchSessionContextPrefix(context: ResearchSessionContext): string | null {
  if (context.activeFocus === null) return null
  const referentsPart =
    context.unresolvedReferents.length > 0 ? ` Unresolved: ${context.unresolvedReferents.join(', ')}.` : ''
  return `[Context: Active Research Focus = ${context.activeFocus}.${referentsPart}]`
}
