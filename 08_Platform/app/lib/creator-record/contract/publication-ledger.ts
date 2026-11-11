/**
 * CR-IMPL-1 — separate Creator Record publication authorization (v0.3 §4.2).
 *
 * Additive to, and independent of, CRC eligibility and reviewer eligibility:
 * neither `crc_eligible` nor `publication_scope` is read here, so neither can
 * authorize a Creator Record. The default is ineligible — no entry, or any
 * missing, stale or unapproved field, means the claim is not shown.
 */

import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { isIsoDate, type IsoDate } from './types'

export type ClaimDescriptor = Pick<TopicClaim, 'claim_id' | 'applicability_requirements' | 'applicability_any_of' | 'unresolved_project_dependencies' | 'last_verified' | 'superseded_by'>

export interface PublicationLedgerEntry {
  entry_id: string
  version: number
  /** Exact claim identity, including its version suffix. */
  claim_id: string
  /** The claim's last_verified date the approval was given against. */
  claim_last_verified: IsoDate
  creator_record_eligible: 'Yes' | 'No' | 'Pending'
  /** Separately approved customer explanation. Never copied from CRC text. */
  explanation: string | null
  /**
   * met_only           shown only when the conclusion is `relevant_on_declared_facts` (applicability met, no open dependency);
   * met_or_unresolved  shown when applicability is met or unresolved (never for a jurisdiction-scoped claim);
   * requirements_met   CRV2-IA-4A: shown only when the shared applicability status is `met`; open project dependencies are
   *                    allowed and cap the conclusion at `relevant_applicability_unresolved`.
   */
  applicability_policy: ApplicabilityPolicy | null
  /** Approved evidence text per dependency id. */
  evidence_notes: Readonly<Record<string, string>>
  required_caveats: string[]
  approver: string | null
  decision_date: IsoDate | null
  refresh_by: IsoDate | null
  superseded_by: string | null
}

export const PUBLICATION_REFUSAL_REASONS = [
  'no_ledger_entry',
  'multiple_current_entries',
  'not_eligible',
  'missing_explanation',
  'missing_applicability_policy',
  'missing_approval',
  'missing_refresh_by',
  'refresh_lapsed',
  'claim_superseded',
  'claim_not_verified',
  'claim_reverified_since_approval',
  // CRV2-IA-4A (replaces `jurisdiction_scoped_guidance_disabled`): a jurisdiction-scoped claim's entry must use a policy that
  // requires applicability to be met. `met_or_unresolved` would let guidance about a place the creator did not choose through.
  'jurisdiction_scoped_requires_met_policy',
] as const
export type PublicationRefusalReason = (typeof PUBLICATION_REFUSAL_REASONS)[number]

export const APPLICABILITY_POLICIES = ['met_only', 'met_or_unresolved', 'requirements_met'] as const
export type ApplicabilityPolicy = (typeof APPLICABILITY_POLICIES)[number]

export function isApplicabilityPolicy(v: unknown): v is ApplicabilityPolicy {
  return typeof v === 'string' && (APPLICABILITY_POLICIES as readonly string[]).includes(v)
}

/** Policies a jurisdiction-scoped claim may use: both require the shared applicability status to be `met`. */
const JURISDICTION_SCOPED_POLICIES: readonly ApplicabilityPolicy[] = ['met_only', 'requirements_met']

export type PublicationAuthorization = { authorized: true; entry: PublicationLedgerEntry } | { authorized: false; reason: PublicationRefusalReason }

/** True when any applicability requirement (including any-of alternatives) concerns jurisdiction. */
export function isJurisdictionScoped(claim: ClaimDescriptor): boolean {
  const all = [...claim.applicability_requirements, ...(claim.applicability_any_of ?? []).flat()]
  return all.some((r) => r.fact === 'jurisdiction')
}

export function authorizePublication(ledger: readonly PublicationLedgerEntry[], claim: ClaimDescriptor, asOf: IsoDate): PublicationAuthorization {
  if (!isIsoDate(asOf)) throw new Error('as_of must be YYYY-MM-DD')
  const refuse = (reason: PublicationRefusalReason): PublicationAuthorization => ({ authorized: false, reason })

  if (claim.superseded_by !== null) return refuse('claim_superseded')
  if (!isIsoDate(claim.last_verified)) return refuse('claim_not_verified')

  const current = ledger.filter((e) => e.claim_id === claim.claim_id && e.superseded_by === null)
  if (current.length === 0) return refuse('no_ledger_entry')
  if (current.length > 1) return refuse('multiple_current_entries')
  const e = current[0]

  if (e.creator_record_eligible !== 'Yes') return refuse('not_eligible')
  if (!e.approver || !isIsoDate(e.decision_date)) return refuse('missing_approval')
  if (!e.explanation || e.explanation.trim() === '') return refuse('missing_explanation')
  if (!isApplicabilityPolicy(e.applicability_policy)) return refuse('missing_applicability_policy')
  if (!isIsoDate(e.refresh_by)) return refuse('missing_refresh_by')
  if (e.refresh_by < asOf) return refuse('refresh_lapsed')
  if (e.claim_last_verified !== claim.last_verified) return refuse('claim_reverified_since_approval')
  // CRV2-IA-4A: a jurisdiction-scoped claim is authorized only under a policy that requires `met` applicability. This is
  // configuration only; the facts check (jurisdiction requirement actually met) runs before Bounded Interpretation in the
  // integration layer, independent of what any entry says.
  if (isJurisdictionScoped(claim) && !JURISDICTION_SCOPED_POLICIES.includes(e.applicability_policy)) return refuse('jurisdiction_scoped_requires_met_policy')
  return { authorized: true, entry: e }
}
