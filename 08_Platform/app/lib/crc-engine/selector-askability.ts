/**
 * Selector askability registry (CRC Narrow Governed Selector Questioning
 * milestone, 2026-08-24, following the Governed Selector Questioning
 * architecture design of the same date, itself following the CRC Tool Plan
 * Semantics / Normalization diagnostic and the CRC Governed Selector
 * Questioning / Answer-Aware Question Value architecture diagnostic).
 *
 * Separate governance authority from:
 *   - dependency-askability.ts -- governs `TopicClaim.unresolved_project_
 *     dependencies` strings, an orthogonal concept (a dependency exists on
 *     an ALREADY-APPLICABLE proposition; a selector determines whether the
 *     proposition applies at all -- see Track B's own header, unchanged,
 *     for the full reasoning this milestone preserves rather than collapses);
 *   - FollowUpNeed (boundaries.ts) -- interview-side duplicate-question
 *     bookkeeping only, never authorization (see the Tool Plan Semantics
 *     diagnostic's own finding: "Deterministic code downstream uses
 *     target_follow_up_need to avoid re-asking something already answered
 *     -- it does not affect whether your question is otherwise permitted");
 *   - applicability_requirements/ApplicabilityFact themselves (retrieval-
 *     engine/types.ts) -- Living Knowledge's own applicability schema,
 *     never extended or touched by this file.
 *
 * Answers exactly one question: may CRC proactively ask the user for
 * structured applicability fact F? It must NEVER classify whether a claim
 * applies, provider entitlement, commercial rights, or plan semantics --
 * that remains Living Knowledge's and Retrieval's job alone. In particular,
 * this registry must never carry a mapping like "Kling Pro -> paid" or any
 * other provider-specific plan/entitlement knowledge -- see the Tool Plan
 * Semantics diagnostic's own explicit prohibition on smuggling commercial-
 * rights classification into structured/governance metadata.
 *
 * SHIPPED EMPTY through the CRC Narrow Governed Selector Questioning
 * milestone and the Minimal Generic tool_account_status Capture milestone
 * (both 2026-08-24), by explicit PM/Architecture instruction -- the
 * registry existing, fully wired, and fail-closed WAS the capability; no
 * fact was registered askable. First entry registered in the Activate
 * tool_account_status Selector milestone (2026-08-24, this file), following
 * a bounded live-model UAT. Absence still defaults to non-askable, never
 * the reverse, for every other/future fact -- mirrors dependency-askability.ts's
 * own explicit discipline ("Absence defaults to non-askable, never the
 * reverse -- a dependency is never askable unless explicitly, deliberately
 * listed here") applied to a disjoint vocabulary (ApplicabilityFact, not a
 * governed dependency-ID string). An unrecognized/unregistered fact never
 * throws and never blocks anything -- it is simply invisible to
 * selector-questioning.ts, structurally identical to "not askable" from the
 * interview's point of view.
 *
 * `'not_askable'` and `'evidence_only'` are both terminal-non-askable to
 * every reader of this registry -- kept as two distinct literal values
 * (rather than collapsed to one, or simply omitted) so a future entry can
 * record WHY a fact is non-askable (an explicit governance decision vs. an
 * evidence-only classification) for audit purposes, without either ever
 * being treated as askable by construction.
 */

import type { ApplicabilityFact } from '@/lib/retrieval-engine/types'

export type SelectorTreatment = 'askable_in_crc' | 'not_askable' | 'evidence_only'

export interface SelectorAskabilityEntry {
  treatment: SelectorTreatment
  /**
   * Fixed, deterministic, never LLM-generated -- same "trivial verbatim
   * lookup" discipline as JURISDICTION_CLARIFICATION_QUESTION/
   * HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION. Required only when
   * `treatment === 'askable_in_crc'`. May contain the literal placeholder
   * `{tool}` for a tool-scoped fact -- selector-questioning.ts's own
   * proposal builder substitutes it with the already-known, canonically
   * resolved tool identifier, never a claim's own governed prose and never
   * an LLM-synthesized value.
   */
  question_text?: string
}

/**
 * `tool_account_status` registered (Activate tool_account_status Selector
 * milestone, 2026-08-24) -- the first entry this registry has ever carried,
 * following PM/Architecture's explicit ACCEPT/GO on the account_status
 * capture + a bounded live-model UAT verifying capture behaves well enough
 * in practice. The question is a single fixed, generic template (uses the
 * existing `{tool}` substitution -- Kling is simply the first governed
 * consumer, never special-cased here or in selector-questioning.ts). It
 * asks only for the user's own CURRENT factual account/membership status --
 * never "paid"/"free" (those name plan_tier, a structurally separate
 * concept this fact must not be conflated with, per the Tool Plan
 * Semantics diagnostic's own prohibition), never a legal/commercial
 * conclusion, and never anything about generation-time or historical
 * status (tool_account_status is deliberately the current, reported fact
 * only -- see ToolMention.account_status's own doc comment).
 *
 * Question wording revised (CRC-GOVERNED-SELECTOR-QUESTION-COPY-1,
 * 2026-10-07), following a real Production UAT + read-only diagnostic
 * (CRC-GOVERNED-SELECTOR-ANSWER-MAPPING-1): the original wording ("Do you
 * know what kind of {tool} account or membership you currently have?")
 * read, to an ordinary user, as a request for their plan/tier name -- a
 * real user answered with a plan name ("a paid Kling Pro plan"), which
 * extraction correctly declined to treat as `account_status` (a plan/grade
 * name is explicitly NOT the governed status term -- see
 * anthropic-extractor.ts's own tool_mention attribute rules), leaving the
 * selector unresolved even though the user reasonably believed they had
 * answered. This is a pure copy change, not a semantic one: it explicitly
 * contrasts "plan or subscription tier" against "account or membership" so
 * the user has a better chance of recognizing these as two different
 * things, without naming any provider's specific governed vocabulary
 * (never "Member Account"/"Regular Account" or any other provider-specific
 * class), without implying paid = member, without demanding a legal
 * characterization, and without hinting at which answer would be
 * favorable. Still a single fixed, generic, `{tool}`-substituted template
 * -- the extraction rule, the selector cap, applicability evaluation, BI,
 * and Composition are all unchanged and remain the actual source of
 * correctness; this wording only reduces the chance of an avoidable,
 * good-faith non-answer.
 *
 * Do not add `jurisdiction` (owned entirely by the existing, unmigrated
 * jurisdiction-clarification.ts -- selector-questioning.ts's own
 * HANDLED_BY_DEDICATED_MODULE guard excludes it defensively regardless of
 * what this registry ever contains) or `tool_plan_tier` (still unauthorized
 * -- registering it requires its own separate, explicit PM/legal governance
 * decision on safe question wording, which this milestone does not make)
 * without that separate, explicit decision.
 */
const SELECTOR_ASKABILITY: Partial<Record<ApplicabilityFact, SelectorAskabilityEntry>> = {
  tool_account_status: {
    treatment: 'askable_in_crc',
    question_text: 'Apart from your plan or subscription tier, do you know what type of account or membership you have with {tool}?',
  },
}

/** Fail-closed by construction, never a thrown error -- an unregistered fact returns undefined, structurally identical to an explicit 'not_askable' entry from every caller's point of view. */
export function getSelectorAskabilityEntry(fact: ApplicabilityFact): SelectorAskabilityEntry | undefined {
  return SELECTOR_ASKABILITY[fact]
}

export function isSelectorAskable(fact: ApplicabilityFact): boolean {
  return getSelectorAskabilityEntry(fact)?.treatment === 'askable_in_crc'
}
