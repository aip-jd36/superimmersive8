/**
 * Governed ApplicabilityFact display vocabulary (M2B -- Bounded
 * Unresolved-Applicability Realization, 2026-09-05, following the M2A /
 * M2A.1 read-only design diagnostics).
 *
 * Answers exactly one question: may Consultative Composition name a
 * governed applicability fact in bounded, user-facing prose, and with what
 * fixed words? Nothing else.
 *
 * Separate governance authority from, and deliberately never coupled to:
 *   - selector-askability.ts -- governs whether CRC may proactively ASK
 *     about a fact, and with what question wording. A display label and an
 *     askability question are different concepts with different lifecycles:
 *     a fact can be surfaced in explanation without ever being askable
 *     (e.g. a future non-askable fact), and a fact's askability can change
 *     without its label changing. Human review REJECTED extending
 *     `SelectorAskabilityEntry` with a `display_label` field for exactly
 *     this reason (M2A.1 §5) -- this registry exists instead.
 *   - dependency-askability.ts -- an orthogonal vocabulary keyed on governed
 *     dependency-ID strings (TopicClaim.unresolved_project_dependencies),
 *     never ApplicabilityFact values.
 *   - buildBoundedInterpretations (lib/bounded-interpretation/) -- human
 *     review explicitly REJECTED threading this vocabulary upstream into
 *     Bounded Interpretation "merely so BI can generate richer presentation
 *     copy" (M2A.1 human decision, item 3). Bounded Interpretation remains
 *     authoritative for what CRC may conclude; this registry is consumed
 *     exclusively downstream, by Composition
 *     (unresolved-applicability-realization.ts), never passed upstream.
 *
 * A label is PURELY LEXICAL/DISPLAY: a fixed, human-reviewed noun phrase a
 * user reads in place of the internal `ApplicabilityFact` enum value. A
 * label must NEVER encode:
 *   - an applicability result (met/unresolved/not_met);
 *   - an evidence requirement (which document/artifact would establish it);
 *   - project-specific interpretation;
 *   - materiality, risk, or "importance";
 *   - legal meaning or a legal conclusion;
 *   - a Commercial Assurance action ("CA will verify...", "CA requires...").
 * A label is never generated from the enum name (no de-snake-casing), never
 * LLM-generated, and never derived from an existing selector question's own
 * wording -- see this file's own header above and the realization module's
 * header for why reusing question copy for explanation would conflate
 * questioning with projection.
 *
 * SHIPPED EMPTY through M2B (2026-09-05), by explicit instruction, mirroring
 * selector-askability.ts's own precedent exactly ("SHIPPED EMPTY ... by
 * explicit PM/Architecture instruction -- the registry existing, fully
 * wired, and fail-closed WAS the capability; no fact was registered
 * askable"). A repository-wide search for an already-approved, genuinely
 * user-facing display label for `tool_account_status` (as distinct from the
 * existing selector QUESTION text, informal governance-review prose, or
 * test wording) found none at that time -- see M2B's own implementation
 * report.
 *
 * `tool_account_status` ACTIVATED (M2B.1, 2026-09-05) -- first real entry
 * this registry has ever carried, following explicit human/PM approval of
 * the neutral lexical alias "account or membership status" and nothing
 * else. The approval is scoped exactly this narrowly: it authorizes ONLY
 * that `tool_account_status` may be referred to by this noun phrase in
 * bounded Composition prose. It does NOT authorize, and this entry must
 * never be read as encoding: a paid-plan -> Member Account inference, a
 * plan-tier -> account-status inference, any provider-specific mapping, a
 * legal/commercial conclusion, an evidence requirement, materiality/risk,
 * or any Commercial Assurance wording -- see this module's own header
 * above for the complete, unchanged list of what a label must never
 * encode. No other `ApplicabilityFact` is activated by this change --
 * `tool_plan_tier` and `jurisdiction` remain unregistered (fail-closed).
 *
 * Adding any FUTURE real entry remains a governance decision this file
 * does not make on its own authority; it requires the same explicit
 * PM/Architecture review discipline selector-askability.ts's own header
 * describes for registering a fact askable, applied here to registering a
 * fact's display label instead.
 *
 * Absence defaults to no label, never a fallback to the raw enum string or
 * an improvised description -- see `getApplicabilityFactLabel`'s own
 * fail-closed contract below, and unresolved-applicability-realization.ts's
 * own consumption of it.
 */

import type { ApplicabilityFact } from '@/lib/retrieval-engine/types'

export interface ApplicabilityFactDisplayEntry {
  /**
   * Fixed, human-reviewed lexical/display alias only -- see this module's
   * own header for the full list of what a label must never encode. Never
   * LLM-generated, never de-snake-cased from the enum, never copied from an
   * askability question's own wording.
   */
  label: string
}

/**
 * One entry (M2B.1, 2026-09-05, human/PM-approved). `tool_plan_tier` and
 * `jurisdiction` are deliberately NOT entries here -- see module header --
 * and must not be added without their own separate governance sign-off. Do
 * not populate any future entry from informal wording found in
 * governance-review markdown, PLATFORM-RIGHTS-MATRIX.md column headers, or
 * an existing selector question's own text -- none of those are an
 * approved display label on their own.
 */
const APPLICABILITY_FACT_DISPLAY: Partial<Record<ApplicabilityFact, ApplicabilityFactDisplayEntry>> = {
  tool_account_status: { label: 'account or membership status' },
}

/**
 * Fail-closed by construction, never a thrown error -- an unregistered fact
 * returns `undefined`, structurally identical to "no label exists" from
 * every caller's point of view. The sole caller
 * (unresolved-applicability-realization.ts) treats `undefined` as a reason
 * to produce no specific realization at all, falling back to the existing
 * generic Bounded Interpretation copy -- never to the raw enum value, never
 * to an improvised description.
 */
export function getApplicabilityFactLabel(fact: ApplicabilityFact): string | undefined {
  return APPLICABILITY_FACT_DISPLAY[fact]?.label
}
