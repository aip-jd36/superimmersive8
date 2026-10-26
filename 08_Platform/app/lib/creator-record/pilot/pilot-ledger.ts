/**
 * CR-V2-VERTICAL-SLICE-1 — PILOT publication ledger, dependency labels and
 * caveats for the INTERNAL admin prototype only.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ INTERNAL AND UNAPPROVED. These are NOT Creator Record publication    │
 * │ approvals. No CRPR exists for any claim below. Explanations are      │
 * │ drafts written to stay inside each claim's governed statement; they  │
 * │ have had no publication review and no counsel review.                │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * The authoritative ledger is `../governed/sources.ts`
 * (CREATOR_RECORD_PUBLICATION_LEDGER), which is empty and therefore fails
 * closed. Every entry here has an id starting `PILOT-UAT-` and an approver
 * string saying it is not a governance approval.
 *
 * Pilot claims (all current, reviewer-eligible, not jurisdiction-scoped):
 * Pika (baseline + three paid-plan claims), Kling (baseline + Member account),
 * Getty Editorial, and one Artlist music claim. Runway and Higgsfield are
 * deliberately ABSENT (open governance: FGR_030/CPR_037, FGR_031/CPR_038), so
 * a record that declares them shows "no approved guidance yet".
 *
 * Each entry's `claim_last_verified` must equal the governed claim's own
 * `last_verified`; otherwise the contract refuses it
 * (`claim_reverified_since_approval`) — a test asserts every entry matches
 * TOPIC_CLAIMS_FIXTURE today.
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import { PILOT_MARKER } from './pilot-registry'

export const PILOT_LEDGER_VERSION = 'PILOT-UAT-LEDGER-1'
const PILOT_APPROVER = `${PILOT_MARKER} — internal prototype only, NOT a Creator Record publication approval`

const entry = (claim_id: string, claim_last_verified: string, explanation: string, over: Partial<PublicationLedgerEntry> = {}): PublicationLedgerEntry => ({
  entry_id: `${PILOT_MARKER}-LEDGER-${claim_id}`,
  version: 1,
  claim_id,
  claim_last_verified,
  creator_record_eligible: 'Yes',
  explanation,
  applicability_policy: 'met_or_unresolved',
  evidence_notes: {},
  required_caveats: ['PILOT-CAVEAT-PROVIDER-TERMS'],
  approver: PILOT_APPROVER,
  decision_date: '2026-10-26',
  refresh_by: '2027-01-31',
  superseded_by: null,
  ...over,
})

export const PILOT_PUBLICATION_LEDGER: readonly PublicationLedgerEntry[] = [
  entry('CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1', '2026-09-06',
    'Pika’s Terms of Service limit generated output to personal, non-commercial use by default. Pika’s paid subscription plans include commercial-use rights.'),
  entry('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1', '2026-09-06',
    'Pika’s terms say its Standard plan includes commercial-use rights for generated output.'),
  entry('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1', '2026-09-06',
    'Pika’s terms say its Pro plan includes commercial-use rights for generated output.'),
  entry('CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1', '2026-09-06',
    'Pika’s terms say its Fancy plan includes commercial-use rights for generated output.'),
  entry('CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1', '2026-09-02',
    'Kling’s Terms of Service say generated output may not be used, reproduced, distributed, modified or adapted for commercial purposes without Kling’s written permission.'),
  entry('CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1', '2026-09-02',
    'Kling’s Terms of Paid Service say that a Kling Member Account (a subscription to Kling’s Membership Service) allows commercial use of generated output without further written permission, except for building products or services that compete with Kling AI.'),
  entry('CLAIM-STOCK-GETTY-EDITORIAL-001-v1', '2026-08-17',
    'Getty Images’ standard Editorial Content licence does not cover commercial, promotional, advertorial, endorsement, advertising or marketing use (or gambling, betting or gaming use) unless Getty has expressly authorized that use in writing. Getty offers a separate process for requesting that authorization.',
    {
      evidence_notes: {
        editorial_designation_confirmed: 'Whether an asset is Editorial can only be shown from the Getty licence or the asset’s Getty page.',
        separate_authorization_obtained: 'Only a written authorization from Getty can show this.',
        asset_confirmed_getty: 'The Getty licence or download history can show which assets came from Getty.',
      },
    }),
  entry('CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1', '2026-08-27',
    'Artlist’s stated policy is that work already completed and published remains covered after a subscription ends, while new use does not.',
    {
      evidence_notes: {
        artlist_subscription_active_at_publication_confirmed: 'Your Artlist account or invoices can show whether the subscription was active when the video was published.',
      },
    }),
]

/** PILOT plain-language labels for the dependencies the pilot claims and questions use. Unapproved. */
export const PILOT_DEPENDENCY_LABELS: Readonly<Record<string, string>> = {
  advertisement_purpose_confirmed: 'Whether the video is used in advertising',
  synthetic_performer_present_confirmed: 'Whether a real person’s likeness or voice appears',
  which_music_provider: 'Where the music came from',
  which_provider: 'Which stock service the material came from',
  human_contribution_description: 'Your own creative contribution',
  asset_confirmed_getty: 'Which assets came from Getty Images',
  editorial_designation_confirmed: 'Whether a Getty asset is designated Editorial',
  separate_authorization_obtained: 'Whether Getty has authorized the use in writing',
  artlist_subscription_active_at_publication_confirmed: 'Whether your Artlist subscription was active when the video was published',
}

/** PILOT caveat texts, by template id. Unapproved. */
export const PILOT_CAVEATS: Readonly<Record<string, string>> = {
  'PILOT-CAVEAT-PROVIDER-TERMS': 'Provider terms change. This reflects the terms as SI8 last reviewed them, not necessarily the terms in force when you made or publish the video.',
}
