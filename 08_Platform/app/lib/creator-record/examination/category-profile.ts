/**
 * CR-DOC-READER-EXT-1 (B) — which examination profile a declared document category calls for. DEFINED, NOT WIRED.
 *
 * The customer examination path still names the receipt profile for every document (the request carries only the document id,
 * and the document row stores no category); wiring this selection in is a separate, approval-gated step. Rules:
 *   - receipts and provider documents keep the receipt profile, exactly as today (legacy behaviour preserved);
 *   - licences and permissions call for the licence profile, which is INACTIVE: selection reports it as not active, never as the
 *     receipt profile (a licence is never silently read as a receipt once this is wired);
 *   - releases, project files and "other" are not examined; an unknown category fails closed.
 * Selection uses only the creator's declared category, never the document's content.
 */
import { EVIDENCE_CATEGORIES, type EvidenceCategory } from '../evidence-intake/vocabulary'
import { LICENCE_PROFILE_ID, LICENCE_PROFILE_VERSION } from './licence-profile'
import { RECEIPT_PROFILE_ID, RECEIPT_PROFILE_VERSION } from './receipt-profile'

type ProfileId = { id: string; version: number }

export const CATEGORY_PROFILES: Readonly<Record<EvidenceCategory, ProfileId | null>> = Object.freeze({
  billing_receipt: { id: RECEIPT_PROFILE_ID, version: RECEIPT_PROFILE_VERSION },
  provider_terms: { id: RECEIPT_PROFILE_ID, version: RECEIPT_PROFILE_VERSION },
  licence: { id: LICENCE_PROFILE_ID, version: LICENCE_PROFILE_VERSION },
  permission: { id: LICENCE_PROFILE_ID, version: LICENCE_PROFILE_VERSION },
  release_or_consent: null,
  project_file: null,
  other: null,
})

/** Profiles a customer examination may use today. The licence profile is deliberately absent (inactive). */
export const ACTIVE_CUSTOMER_PROFILES: readonly ProfileId[] = Object.freeze([{ id: RECEIPT_PROFILE_ID, version: RECEIPT_PROFILE_VERSION }])

export type CategoryProfileSelection =
  | { ok: true; profile: ProfileId }
  | { ok: false; reason: 'category_unknown' | 'category_not_examined' | 'profile_inactive'; profile?: ProfileId }

export function profileForCategory(category: unknown, active: readonly ProfileId[] = ACTIVE_CUSTOMER_PROFILES): CategoryProfileSelection {
  if (typeof category !== 'string' || !(EVIDENCE_CATEGORIES as readonly string[]).includes(category)) return { ok: false, reason: 'category_unknown' }
  const profile = CATEGORY_PROFILES[category as EvidenceCategory]
  if (!profile) return { ok: false, reason: 'category_not_examined' }
  if (!active.some((a) => a.id === profile.id && a.version === profile.version)) return { ok: false, reason: 'profile_inactive', profile }
  return { ok: true, profile }
}
