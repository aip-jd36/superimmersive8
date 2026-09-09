/**
 * Reviewer CRC Context — read-only data contract (CAH-4B).
 *
 * What a Commercial Assurance reviewer may see about the CRC conversation(s)
 * associated with the submission they are reviewing. It is CUSTOMER-PROVIDED
 * CONTEXT — not verified, and NOT assessment evidence. Nothing in this contract
 * may be written into `workbook_data`, an `assessments` row, an evidence record,
 * a control judgment, a gap, a finding, an outcome, confidence, a sign-off, or a
 * report conclusion. The authority firewall (module boundaries + structural
 * tests in `__tests__/reviewer-context/authority-firewall.test.ts`) enforces
 * that structurally, not by convention.
 *
 * The four provenance distinctions this surface needs are carried by the SHAPE,
 * not by a new authority-tag enum (CAH-4A's broader `ContextAuthorityTag`
 * taxonomy is deliberately deferred — see CAH-4B §5):
 *   - explicit customer goal            -> `CrcProjectContext.goals`
 *   - customer-described project fact    -> `CrcProjectContext.assertions`
 *   - superseded / corrected context     -> `CrcProjectContext.correction_history`
 *   - association provenance             -> `ReviewerCrcAssociationProvenance`
 *
 * Living Knowledge reviewer access is out of scope (CAH-4B §12 / CAH-4C §9).
 *
 * CAH-4C: the base `ReviewerCrcContext` still exposes only THAT a linked CRC
 * exists — never transcript content. The verbatim transcript is a SEPARATE,
 * deliberate, audit-gated read (`getReviewerCrcTranscript` -> the transcript
 * route); it is never smuggled into this contract's normal response.
 */

import type { CrcProjectContext } from '@/lib/crc-project-context/types'
import type { CrcTranscriptEntry } from '@/lib/crc-project-context/transcript'
import type { CrcStateComparison } from '@/lib/crc-assurance-handoff'

export type { CrcStateComparison, CrcTranscriptEntry }

/**
 * A permission / correlation fact about how the association was made — NEVER a
 * proof that the reviewer's customer historically created, operated, or owned
 * the CRC session (`crc_sessions.email` is unverified; see
 * `lib/crc-assurance-handoff/types.ts`).
 */
export interface ReviewerCrcAssociationProvenance {
  association_id: string
  /** A capability-name permission fact, verbatim. Never an ownership claim. */
  authorization_basis: string
  /** When the customer made the deliberate association claim. */
  associated_at: string
  /** CAH-4B surfaces only active associations. */
  status: 'active'
  /** Internal reference — resolved server-side from the authoritative association, never client-supplied. */
  crc_session_id: string
}

export interface ReviewerCrcContextItem {
  provenance: ReviewerCrcAssociationProvenance
  /**
   * Bounded, non-interpreting projection of the persisted `StructuredUnderstanding`.
   * `null` when the stored state is unparseable — the association still lists,
   * project context is simply absent, NEVER fabricated.
   */
  project: CrcProjectContext | null
  /**
   * Neutral comparison of the persisted CRC state now vs. the state bound at
   * association time. Exactly `'unchanged' | 'changed' | 'comparison_unavailable'`
   * — carries NO materiality / risk / staleness / validity / reassessment
   * meaning. Fails closed to `'comparison_unavailable'` across canonicalization
   * versions or on any read error.
   */
  state_comparison: CrcStateComparison
}

export type ReviewerCrcContext =
  | { linked: false }
  | { linked: true; associations: ReviewerCrcContextItem[] }
