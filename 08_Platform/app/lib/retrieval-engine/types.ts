/**
 * Retrieval Engine — domain types (RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 1,
 * Prototype Beta). Sibling to, not nested inside, lib/interview-engine/ —
 * architecturally independent per PRD_CRC_v1.0.md §3.
 *
 * Deliberately minimal: no relevance/risk/ranking/audience/applicability/
 * display-priority fields anywhere in this file. The architecture doc's own
 * emphasis is correctness and determinism, not ranking quality, and the
 * committed [PROTOTYPE ASSUMPTION -- TO VALIDATE] in that document is that
 * every CRC-Eligible: Yes claim under a matched row is retrievable, full
 * stop -- no applicability schema exists yet, and none is invented here.
 *
 * CRC Candidate Statement (added to RetrievalResult 2026-08-08, per JD
 * review of PROJECTION_LAYER_ARCHITECTURE.md's original claim_id
 * side-lookup design): carried on RetrievalResult as an opaque passthrough
 * field, copied verbatim from the same already-matched, already-eligible
 * claim that supplies `publication_scope`. This is a narrow,
 * consumer-driven contract extension, not a reopening of Phase 5/6's own
 * logic -- Retrieval still performs zero rendering, zero interpretation,
 * and makes no decision based on this field's content or presence (in
 * particular: unlike `publication_scope`, a null `candidate_statement`
 * does NOT cause a result to be skipped -- that is a Projection-time
 * concern, not a Retrieval-time one; see assemble-result.ts).
 *
 * Topic tagging (added to MatrixClaim/RetrievalResult 2026-08-15, CRC
 * Milestone 2 -- User Goal + Bounded Interpretation, PM revision 5:
 * "approve the minimal Matrix topic-tagging approach... do not build full
 * topic-based Retrieval in M2"). `MatrixClaim.topic` is OPTIONAL and
 * purely descriptive metadata -- it plays no role in Retrieval's own
 * matching logic (lookup-rows.ts, enumerate-eligible-claims.ts are
 * unchanged; a claim's eligibility and whether it surfaces at all is
 * decided exactly as before, tool-identifier-keyed only). It exists solely
 * so a downstream, Retrieval-external consumer (lib/bounded-interpretation/)
 * can ask "is there an already-eligible, already-retrieved result whose
 * subject matter matches this user goal's category" without Retrieval
 * itself growing any topic-based matching, ranking, or filtering
 * capability. `RetrievalResult.topic` is REQUIRED (never left undefined
 * for a consumer to guess about) -- assembleResult defaults an untagged
 * claim's topic to 'unknown', the same conservative fallback GoalCategory
 * uses everywhere else in this codebase.
 */

import type { GoalCategory } from '@/types/interview-engine'

export const CRC_ELIGIBLE_VALUES = ['Yes', 'No', 'Pending'] as const
export type CrcEligible = (typeof CRC_ELIGIBLE_VALUES)[number]

/**
 * One claim, exactly as recorded in a Matrix row's CRC Claims sub-table
 * (PLATFORM-RIGHTS-MATRIX.md, schema in PRD_LIVING_NOTEBOOK.md §
 * CRC-Eligible Governance § CRC Claims sub-table). `crc_publication_scope`
 * and `crc_candidate_statement` are human-authored governance/audit prose --
 * this type carries them verbatim; nothing in this module parses or
 * interprets their meaning anywhere.
 */
export interface MatrixClaim {
  claim_id: string
  crc_eligible: CrcEligible
  /** null only for a claim with no scope authored yet (typically CRC-Eligible: Pending). */
  crc_publication_scope: string | null
  /** Copied verbatim into RetrievalResult.candidate_statement -- see module header. */
  crc_candidate_statement: string | null
  /** Optional descriptive tag -- see module header's "Topic tagging" note. Absent on a claim means "not yet classified," not "no subject matter." */
  topic?: GoalCategory
}

/**
 * One Matrix row. `identifier` is the canonical tool identifier -- the same
 * string Interview's own normalizeCandidate resolves to and
 * RetrievalHandoffTool.identifier carries. Deliberately excludes every
 * research/audit field the Matrix records for human reviewers (Plan Tier,
 * Source Wording, SI8 Interpretation, Training Data Disclosure, Known
 * Restrictions, Source, Status, CRC Decision Date, CRC Approver) --
 * RETRIEVAL_ENGINE_ARCHITECTURE.md Phase 6 lists these as never belonging
 * in Retrieval's output, and there is no reason for Retrieval's own input
 * representation to carry them either if they're never used.
 */
export interface MatrixRow {
  identifier: string
  /** Row-level factual-freshness date (the Matrix's own "Last Verified" field) -- distinct from claim-level CRC Decision Date, which this type does not carry. */
  last_verified: string | null
  claims: MatrixClaim[]
}

/**
 * Which handoff fact triggered a match. Only 'tool' is reachable in this
 * milestone -- the current Matrix is tool-row-keyed only; non-tool-keyed
 * indexing (scoped observations, intended_use, workflow_role) is an
 * explicitly deferred open question in RETRIEVAL_ENGINE_ARCHITECTURE.md,
 * not designed here. The type still names the other kinds so a future
 * indexing design has a natural place to extend this union, rather than
 * inventing a new type at that point.
 */
export const RETRIEVAL_SOURCE_FACT_KINDS = ['tool'] as const
export type RetrievalSourceFactKind = (typeof RETRIEVAL_SOURCE_FACT_KINDS)[number]

export interface RetrievalSourceFact {
  kind: RetrievalSourceFactKind
  /** The matched value itself -- for kind 'tool', the canonical identifier. */
  identifier: string
}

/**
 * One eligible, traceable knowledge reference. Not a rendered Knowledge
 * Card (RETRIEVAL_ENGINE_ARCHITECTURE.md §5) -- Projection remains deferred.
 * `publication_scope` and `candidate_statement` are the two pieces of
 * Matrix prose Retrieval is permitted to pass forward, both verbatim, both
 * never parsed or interpreted for meaning anywhere in this module.
 * Everything else the Matrix records for human reviewers -- SI8
 * Interpretation, CRC Decision Date, CRC Approver, Status, any risk
 * conclusion -- is absent by construction, not by omission: this type
 * simply has no field for any of them.
 */
export interface RetrievalResult {
  source_fact: RetrievalSourceFact
  claim_id: string
  matrix_identifier: string
  publication_scope: string
  /** Opaque passthrough -- see the module-header note on MatrixClaim.crc_candidate_statement above. */
  candidate_statement: string | null
  last_verified: string | null
  /** Required, always resolved (defaults to 'unknown' for an untagged claim) -- see module header's "Topic tagging" note. Descriptive only; never influenced how this result was matched or whether it was included. */
  topic: GoalCategory
}

/**
 * Why a candidate fact produced no result -- diagnostic only, never
 * surfaced to a user, never a risk/warning signal. Exists so tests (and
 * future engineering visibility into Matrix coverage gaps) can distinguish
 * "no row for this tool at all" from "row exists, no claim is eligible"
 * from "never a candidate in the first place" -- RETRIEVAL_ENGINE_
 * ARCHITECTURE.md §6 names this distinction explicitly as worth keeping
 * internally even though a user-facing consumer would see all three as
 * the same "nothing surfaced" outcome.
 */
export const NON_MATCH_REASONS = [
  'unresolved_alias',
  'no_matrix_row',
  'no_eligible_claims',
  /**
   * Defensive only -- a Yes claim with no CRC Publication Scope text is a
   * Matrix authoring inconsistency (Yes should always carry real scope
   * text), not a state Phase 5's filter itself produces from correct data.
   * Never fabricate scope text to fill the gap; skip the claim and record
   * why, per the same "an empty result is always safer than an invented
   * one" discipline as the rest of this module.
   */
  'yes_claim_missing_scope',
] as const
export type NonMatchReason = (typeof NON_MATCH_REASONS)[number]

export interface RetrievalDiagnostic {
  identifier: string
  reason: NonMatchReason
}
