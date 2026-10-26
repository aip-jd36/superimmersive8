/**
 * CR-IMPL-1 — Creator Record contract core: shared types.
 *
 * Isolated and not wired into the application (see
 * __tests__/creator-record/creator-record-boundaries.test.ts). The contract
 * core never decides applicability, evidence requirements, sufficiency or
 * permitted conclusions — Living Knowledge and Bounded Interpretation remain
 * the authorities (PRD_CREATOR_RECORD_v2_DRAFT v0.3 §2.1). It only reads
 * their outputs, attaches provenance, and narrows.
 *
 * The only imports from outside lib/creator-record are TYPE-ONLY imports of
 * `@/lib/retrieval-engine/types` and `@/lib/bounded-interpretation/types`,
 * so the contract is written against the real governed shapes instead of a
 * mirrored copy.
 */

import type { ApplicabilityFact } from '@/lib/retrieval-engine/types'

/** YYYY-MM-DD. Every time-dependent check takes an explicit `as_of`; nothing reads the clock. */
export type IsoDate = string

/** Applicability facts a customer declaration may supply. `jurisdiction` is excluded by construction (v0.3 §3.4). */
export type DeclarableApplicabilityFact = Exclude<ApplicabilityFact, 'jurisdiction'>
export const DECLARABLE_APPLICABILITY_FACTS: readonly DeclarableApplicabilityFact[] = ['tool_plan_tier', 'tool_account_status']

/** Named human approval of a product-side registry or ledger entry. Anything but `approved` is inert. */
export interface GovernanceApproval {
  status: 'pending' | 'approved' | 'retired'
  approver: string | null
  decision_date: IsoDate | null
  review_ref: string | null
}

export function isApproved(a: GovernanceApproval | null | undefined): boolean {
  return !!a && a.status === 'approved' && !!a.approver && !!a.decision_date
}

export const LOCATION_ROLES = ['creator_base', 'distribution_market', 'client_base'] as const
export type LocationRole = (typeof LOCATION_ROLES)[number]

/**
 * Where a declared observation is attached. `none` = record-only.
 * `tool_identity` / `asset_provider_identity` carry a declared name that the
 * integration layer resolves through the existing canonical normalizer; an
 * `applicability_fact` without a fixed `tool` is bound to the tool declared
 * in the same answer `instance` (e.g. one tool block of the questionnaire).
 */
export type ObservationTarget =
  | { kind: 'applicability_fact'; fact: DeclarableApplicabilityFact; tool?: string }
  | { kind: 'tool_identity' }
  | { kind: 'asset_provider_identity' }
  | { kind: 'dependency'; dependency_id: string }
  | { kind: 'location'; role: LocationRole }
  | { kind: 'none' }

export const OBSERVATION_KINDS = [
  'declared_value',
  'declared_presence',
  'declared_document_existence',
  'declared_permission_existence',
  'declared_description',
  'record_only',
] as const
export type ObservationKind = (typeof OBSERVATION_KINDS)[number]

export function isIsoDate(s: unknown): s is IsoDate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}
