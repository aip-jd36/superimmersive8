/**
 * CRC -> Sales bounded context -- data contract (CAH-3B).
 *
 * Every field here traces to an authoritative upstream representation:
 * persisted `crc_sessions` / `crc_leads` columns, the persisted
 * `StructuredUnderstanding` (current non-superseded view), persisted
 * `crc_sales_state`, or -- ONLY in `SalesAnswerContext` -- a recompute of
 * Retrieval + Bounded Interpretation via the unchanged CRC pipeline.
 *
 * This module carries NO risk / materiality / readiness / priority /
 * next-action concept, and no governed claim prose. A claim's
 * CRC-publication-eligibility flag is not represented at all. See CAH-3A
 * §J/§M and CAH-3B §13-§18.
 */

import type { GoalCategory, ConfidenceState } from '@/types/interview-engine'
import type { MatchOrigin } from '@/lib/retrieval-engine/types'
import type { SalesStatus, SalesCloseReason } from './workflow'

// ── Contact list ──────────────────────────────────────────────────────────

export interface SalesContactListItem {
  contact_id: string
  email: string
  /** Number of Sales-eligible sessions for this contact (>= 1 by construction). */
  eligible_session_count: number
  /** Best available completion/recency proxy across the contact's eligible sessions (ISO). */
  most_recent_eligible_at: string
  /** Per-status counts across the contact's eligible sessions, e.g. {NEW: 1, CONVERTING: 1}. Derived; NEW is the default for sessions with no crc_sales_state row. */
  status_summary: Record<SalesStatus, number>
}

// ── Session workflow state ────────────────────────────────────────────────

export interface SalesSessionWorkflowState {
  status: SalesStatus
  close_reason: SalesCloseReason | null
  contacted_at: string | null
  converting_at: string | null
  closed_at: string | null
  updated_at: string | null
  /** Never a NEW-default row -- present only when an operational transition has occurred. */
  persisted: boolean
}

// ── Default (persisted, no recompute) session context ─────────────────────

export interface SalesGoal {
  raw_text: string
  category: GoalCategory
  scope: string
  state: ConfidenceState
}

export interface SalesAssertion {
  /** Stable label for the kind of assertion, e.g. 'tool', 'asset_provider', 'intended_use'. Never a domain-specific composer key. */
  kind: string
  /** Human-neutral summary of what the user stated -- verbatim `source_statement` where one exists, else a fixed structural rendering of the resolved value. Never interpreted. */
  stated: string
  /** Canonical identifier where the mention resolved to one (e.g. a tool id); null otherwise. */
  canonical_id: string | null
  state: ConfidenceState
  source_turn: number
}

export interface SalesCorrectionHistoryItem {
  kind: string
  /** The superseded statement, verbatim. */
  stated: string
  source_turn: number
  superseded_by: string | null
}

export interface SalesSessionContext {
  session_id: string
  created_at: string
  /** email_captured_at when present, else updated_at -- the safest available proxy (no completed_at column exists). */
  completion_proxy_at: string
  completion_proxy_source: 'email_captured_at' | 'updated_at'
  completion_reason: string
  results_email_status: string | null
  results_email_last_recipient: string | null
  results_email_accepted_at: string | null
  traffic_type: string
  repeat_crc_count: number

  workflow: SalesSessionWorkflowState

  /** null when structured_understanding is corrupt/unparseable -- the session still lists (eligibility was established from columns), project facts are simply absent, never fabricated. */
  project: SalesSessionProject | null

  /** Engineering fields, only rendered behind an explicit debug view. */
  debug: {
    runtime_commit: string | null
    turn_count: number | null
  }
}

export interface SalesSessionProject {
  goals: SalesGoal[]
  /** Current (non-superseded) assertions only. */
  assertions: SalesAssertion[]
  /** Available on demand -- superseded assertions / goals, preserved verbatim. */
  correction_history: SalesCorrectionHistoryItem[]
}

// ── Answer context (recomputed, current governed knowledge) ───────────────

/**
 * Every item in a `SalesAnswerContext` is one of these exhaustive kinds,
 * each tied to a permitted upstream representation. There is no free-floating
 * conclusion, no ranking, no "top issue".
 */
export interface SalesAnswerGoalStatus {
  goal_category: GoalCategory
  goal_text: string
  /** Deterministic fixed rendering of BoundedInterpretation.status (see answer-context.ts INTERPRETATION_STATUS_LABEL). 'unclassified' for any unrecognised status. */
  interpretation_status: string
  interpretation_status_label: string
  /** claim_ids BI itself cited as supporting this goal's bounded answer (BoundedInterpretation.supporting_claim_ids). Identifiers only. */
  supporting_claim_ids: string[]
  /** claim_ids BI itself flagged as relevant-but-withheld (BoundedInterpretation.unresolved_relevant_claims). Identifiers only. */
  unresolved_relevant_claim_ids: string[]
}

export interface SalesAnswerGovernedReference {
  claim_id: string
  matrix_identifier: string
  topic: GoalCategory
  match_origin: MatchOrigin
  /** The explicit goal category that caused this result to surface (Track C provenance for discovered_topic). */
  matched_goal_category: GoalCategory
  relationship_id: string | null
  last_verified: string | null
}

export interface SalesAnswerUnresolvedApplicability {
  claim_id: string
  /** The applicability fact the requirement is about (e.g. 'tool_account_status'). Identifier only -- not a question, not a self-attestation prompt. */
  fact: string
  /** 'unresolved' | 'not_met' -- verbatim from UnmetApplicabilityDetail.status. */
  status: string
  /** The explicit goal category this diagnostic was raised under. */
  goal_category: GoalCategory
}

export interface SalesAnswerContext {
  available: boolean
  /** Present only when available === true. */
  computed_at?: string
  /** The deploy commit the CRC session originally ran under, if recorded -- shown so the rep knows current governed knowledge may differ from what the customer was told. */
  session_runtime_commit?: string | null
  temporal_note: string
  goal_statuses?: SalesAnswerGoalStatus[]
  governed_references?: SalesAnswerGovernedReference[]
  unresolved_applicability?: SalesAnswerUnresolvedApplicability[]
}

// ── Transcript ────────────────────────────────────────────────────────────

export interface SalesTranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestamp: string | null
}
