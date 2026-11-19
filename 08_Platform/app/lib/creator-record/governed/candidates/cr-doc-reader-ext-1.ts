/**
 * CR-DOC-READER-EXT-1 — DRAFT Creator Record publication candidates for Path 1 (music and stock).
 *
 * STATUS: HISTORICAL DRAFTS. Approved 2026-11-19 (D1-D3, JD-CR-DOC-READER-EXT-6E-20261119) and published from
 * `../sources.ts` (CREATOR_RECORD_PUBLICATION_LEDGER, generated from these drafts; a test proves the published wording is identical).
 * Nothing here is imported by the governed sources, the approved inputs or any production path. Every entry is `creator_record_eligible: 'Pending'` with no approver, decision date or refresh date, so the
 * existing contract refuses it (`not_eligible` / `missing_approval`) even if it were placed in a ledger. Activation needs:
 * founder approval of each entry (explanation, policy, caveats, refresh), approval of the dependency labels through a new Source
 * Text approval, counsel review, and a new ledger version in `governed/sources.ts`.
 *
 * Content rules:
 *   - existing, adopted, non-superseded governed claims only (no new propositions); `claim_last_verified` is the claim's own;
 *   - explanations are new drafts, never copied from CRC text, and stay within each claim's CRC publication scope;
 *   - `requirements_met`: these claims carry open project dependencies that Creator Record never resolves, so the conclusion is
 *     capped at "relevant, applicability unresolved"; `met_only` would never show them;
 *   - `selection_questions`: music claims only from M1, stock claims only from M3 (CR-DOC-READER-EXT-1 A);
 *   - evidence notes say only that a document MAY show something relevant. They never say a dependency is satisfied or that a
 *     document is sufficient evidence of rights or authorization.
 */
import type { PublicationLedgerEntry } from '../../contract/publication-ledger'

export const CR_DOC_READER_EXT_1_STATUS = 'DRAFT — NOT APPROVED, NOT ACTIVE' as const

/** The four candidate claims (the founder's list; the Pond5 claim's governed id carries `-CONSENT-`). */
export const CANDIDATE_CLAIM_IDS = [
  'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1',
  'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1',
  'CLAIM-STOCK-EDITORIAL-001-v2',
  'CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1',
] as const

const NOT_CONFIRMED = 'It does not confirm'
const note = (shows: string, notConfirmed: string) =>
  `A document you added may show ${shows}. If one appears to, it is listed as an automated reading: SI8 did not check it. ${NOT_CONFIRMED} ${notConfirmed}.`

const pending = (entry: Omit<PublicationLedgerEntry, 'version' | 'creator_record_eligible' | 'approver' | 'decision_date' | 'refresh_by' | 'superseded_by' | 'required_caveats' | 'applicability_policy'>): PublicationLedgerEntry =>
  Object.freeze({
    version: 1,
    creator_record_eligible: 'Pending',
    applicability_policy: 'requirements_met',
    required_caveats: ['CR-CAV-PROVIDER-OWN-TERMS', 'CR-CAV-TERMS-CHANGE'],
    approver: null,
    decision_date: null,
    refresh_by: null,
    superseded_by: null,
    ...entry,
  })

export const CANDIDATE_LEDGER_ENTRIES: readonly PublicationLedgerEntry[] = Object.freeze([
  pending({
    entry_id: 'CR-DOC-READER-EXT-1-LEDGER-CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1',
    claim_id: 'CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1',
    claim_last_verified: '2026-09-10',
    selection_questions: ['M1'],
    explanation:
      'Artlist’s own terms say its Social licence is for personal content and does not cover client or brand work, paid or promoted videos, or broadcast. Its Pro/Business licence covers client and brand work, paid or promoted videos and commercials; broadcasting under Pro/Business is subject to Artlist’s separate Enterprise or Max Business requirement for agencies, broadcasters and larger companies. This record does not show which Artlist licence your account holds.',
    evidence_notes: {
      artlist_license_type_confirmed: note('an Artlist licence or plan type', 'which licence your account holds, or that it covers your video'),
    },
  }),
  pending({
    entry_id: 'CR-DOC-READER-EXT-1-LEDGER-CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1',
    claim_id: 'CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1',
    claim_last_verified: '2026-09-10',
    selection_questions: ['M1'],
    explanation:
      'Epidemic Sound’s own terms say its Single-Track Private Tier licence excludes advertisements and other paid-media productions. Its Commercial Tier does not carry that exclusion, but excludes broadcast-type content such as TV adverts. Which applies depends on the tier you hold. This record does not show which tier your account holds, and neither tier on its own clears a project for commercial use.',
    evidence_notes: {
      epidemic_license_tier_confirmed: note('an Epidemic Sound licence tier', 'which tier your account holds, or that it covers your video'),
    },
  }),
  pending({
    entry_id: 'CR-DOC-READER-EXT-1-LEDGER-CLAIM-STOCK-EDITORIAL-001-v2',
    claim_id: 'CLAIM-STOCK-EDITORIAL-001-v2',
    claim_last_verified: '2026-08-27',
    selection_questions: ['M3'],
    explanation:
      'Stock services generally license content they mark “Editorial” for descriptive or newsworthy use, not for advertising, promotion, endorsement or merchandise. Some offer a separate way to authorise commercial use of a specific Editorial asset. This record does not show whether your asset is marked Editorial or whether any separate authorisation exists.',
    evidence_notes: {
      editorial_designation_confirmed: note('an Editorial or Commercial marking', 'how your asset is designated'),
      separate_authorization_obtained: note('a written permission', 'that authorisation was given, or that it covers your use'),
    },
  }),
  pending({
    entry_id: 'CR-DOC-READER-EXT-1-LEDGER-CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1',
    claim_id: 'CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1',
    claim_last_verified: '2026-08-30',
    selection_questions: ['M3'],
    explanation:
      'Pond5’s own licence agreement says content it marks Editorial is intended for newsworthy or general-interest use and, without Pond5’s express and specific written consent, may not be used in merchandise, advertising (other than in-context advertising of the production it appears in), endorsements, promotions or other commercial productions. This record does not show whether your asset is marked Editorial or whether Pond5 gave consent.',
    evidence_notes: {
      editorial_designation_confirmed: note('an Editorial or Commercial marking', 'how your asset is designated'),
      separate_authorization_obtained: note('a written consent', 'that consent was given, or that it covers your use'),
    },
  }),
])

/** DRAFT Creator Record display labels for the candidates' dependencies that have none today (Source Text approval needed). */
export const CANDIDATE_DEPENDENCY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  artlist_license_type_confirmed: 'Which Artlist licence applies',
  epidemic_license_tier_confirmed: 'Which Epidemic Sound licence tier applies',
  editorial_designation_confirmed: 'Whether the asset is marked Editorial',
  separate_authorization_obtained: 'Whether separate written authorisation was obtained',
})
