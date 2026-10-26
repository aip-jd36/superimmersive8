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
  applicability_policy: 'met_only' | 'met_or_unresolved' | null
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
  'jurisdiction_scoped_guidance_disabled',
] as const
export type PublicationRefusalReason = (typeof PUBLICATION_REFUSAL_REASONS)[number]

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
  if (e.applicability_policy !== 'met_only' && e.applicability_policy !== 'met_or_unresolved') return refuse('missing_applicability_policy')
  if (!isIsoDate(e.refresh_by)) return refuse('missing_refresh_by')
  if (e.refresh_by < asOf) return refuse('refresh_lapsed')
  if (e.claim_last_verified !== claim.last_verified) return refuse('claim_reverified_since_approval')
  // CR-IMPL-1b: Creator Record has no approved way to select jurisdiction-specific
  // guidance (CR-ARCH-1 §2a), so such a claim is never authorized, whatever the entry says.
  if (isJurisdictionScoped(claim)) return refuse('jurisdiction_scoped_guidance_disabled')
  return { authorized: true, entry: e }
}
