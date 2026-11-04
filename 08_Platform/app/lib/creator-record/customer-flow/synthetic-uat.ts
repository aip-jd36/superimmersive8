/**
 * CR-V2-UAT-PROD-MIN-1 — identity-scoped synthetic Production UAT (PM-approved architectural exception).
 *
 * WHAT IT IS: Production may serve the SYNTHETIC test bundle to ONE named SI8 test identity during ONE short, fixed
 * window, so that identity can exercise the X3 journey. Nothing else changes:
 *   - the global stops stay as they are (CREATOR_RECORD_V2_SUBMISSIONS / _ISSUANCE: 'stopped');
 *   - Production's governance bundle stays empty and is never mixed with synthetic content;
 *   - every other identity, and every unauthenticated request, is refused exactly as before;
 *   - purchase and issuance are NOT admitted (their gates never consult this module);
 *   - real-document intake and live extraction stay locked (unrelated code locks);
 *   - examination still needs the database's customer-path grant (X1), which enforces its own document, fixture,
 *     expiry, budget and revocation.
 *
 * INERT BY DEFAULT: the configuration is `null` in every commit except a temporary, reviewed UAT commit, which sets it
 * and is reverted afterwards. While set, it admits only `user_id`, only for `starts_at <= now < expires_at`, and only for
 * a window of at most SYNTHETIC_UAT_MAX_WINDOW_MS. It never admits by itself: the pilot invitation is still required by
 * every gate, so removing the invitation closes the path too. Expiry closes it with no deploy and no manual step.
 *
 * The browser never supplies any of this: the identity is the session user, the time is the server's clock.
 *
 * PROVENANCE: the synthetic bundle's authority is named "SYNTHETIC TEST AUTHORITY (staging rehearsal only; no SI8
 * decision)". The "staging rehearsal" wording is historical (M4C); the identifier and digests are kept unchanged and the
 * authority is reused here solely for this isolated Production UAT. Every version prepared inside the window stores that
 * authority, the SYN-… registry / ledger versions and (for v6) the synthetic v6 approval in its digest-covered sources:
 * it stays visibly synthetic and unapproved, cannot pass the purchase governance check, and is never issued.
 *
 * NOT COVERED by the window, by design: the existing DOC-1 owner download of the owner's own document (unchanged
 * contract: authenticated owner or admin only, every read logged; another user gets not_found).
 */
import { approvedCustomerRecordInputs } from './approved-inputs'
import type { ApprovedInputs } from './service'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY, SYNTHETIC_TEST_V6_SOURCE_TEXT_APPROVAL } from '../governed/synthetic-test-authority'

export interface SyntheticUatConfig {
  /** The one SI8 test identity admitted (auth user id). */
  user_id: string
  /** ISO 8601 instants; the window is [starts_at, expires_at). */
  starts_at: string
  expires_at: string
  /** The approval reference for this UAT window (reviewed with the commit that sets it). */
  change_ref: string
}

/** The temporary UAT window. `null` = inert. Set ONLY in a reviewed, temporary UAT commit; revert afterwards. */
// TEMPORARY — CR-V2-UAT-PROD-8 (PM-approved window). One synthetic SI8 test identity (pilot invitation
// CR-V2-UAT-PROD-7). Window: 2026-11-06 03:00–15:00 UTC (11:00–23:00 Taipei), exactly 12 hours, the existing cap.
// It opens and closes by itself on the server clock. Revert to `null` after the UAT.
export const CREATOR_RECORD_V2_SYNTHETIC_UAT: SyntheticUatConfig | null = {
  user_id: '3adfe2e0-3a48-45cb-a2e9-2f6d2b3683a6',
  starts_at: '2026-11-06T03:00:00.000Z',
  expires_at: '2026-11-06T15:00:00.000Z',
  change_ref: 'CR-V2-UAT-PROD-8',
}

/** No window can be longer than this, whatever the configuration says. */
export const SYNTHETIC_UAT_MAX_WINDOW_MS = 12 * 60 * 60 * 1000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

/** True only for the configured identity, inside a well-formed window of at most the maximum length. Fail closed. */
export function syntheticUatWindowOpen(config: SyntheticUatConfig | null, userId: unknown, now: Date): boolean {
  if (!config || typeof userId !== 'string' || !UUID.test(userId)) return false
  if (typeof config.user_id !== 'string' || !UUID.test(config.user_id) || config.user_id !== userId) return false
  if (typeof config.change_ref !== 'string' || config.change_ref.trim() === '') return false
  if (typeof config.starts_at !== 'string' || !ISO.test(config.starts_at) || typeof config.expires_at !== 'string' || !ISO.test(config.expires_at)) return false
  const start = Date.parse(config.starts_at)
  const end = Date.parse(config.expires_at)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > SYNTHETIC_UAT_MAX_WINDOW_MS) return false
  const t = now.getTime()
  return t >= start && t < end
}

/**
 * The inputs served ONLY inside an open window: the synthetic test bundle (every visible string marked TEST, every
 * approval by the synthetic test authority) plus its synthetic v6 wording approval for examination-bearing versions.
 * Never returned to any other request; never part of the governance bundle.
 */
export function syntheticUatInputs(): ApprovedInputs {
  const bundle = CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY
  if (!bundle) return approvedCustomerRecordInputs(null)
  const base = approvedCustomerRecordInputs(bundle)
  return { ...base, source_text_examination: { approval: SYNTHETIC_TEST_V6_SOURCE_TEXT_APPROVAL, acknowledgements: bundle.acknowledgements } }
}

/** The ports the customer gates consult. Absent (or an inert config) = no exception. */
export interface SyntheticUatPorts {
  admits(userId: string, now: Date): boolean
  inputs(): ApprovedInputs
}

/** Production wiring: the committed configuration and the server clock. */
export const productionSyntheticUat: SyntheticUatPorts = {
  admits: (userId, now) => syntheticUatWindowOpen(CREATOR_RECORD_V2_SYNTHETIC_UAT, userId, now),
  inputs: syntheticUatInputs,
}

/** A stored record built from synthetic sources (its wording approval names the synthetic test authority). */
export const isSyntheticRecordAuthority = (authority: unknown) => typeof authority === 'string' && /synthetic|fixture/i.test(authority)
