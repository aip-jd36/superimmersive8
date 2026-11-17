/**
 * SI8-PRIVACY-CRC-1C — results-gate disclosure provenance: which disclosure the visitor's gate actually rendered when their email
 * was requested, recorded in `crc_sessions.capture_notice_version`.
 *
 *   results-gate-v1  the gate as launched 2026-08-14: heading, value proposition, field, button and the Commercial Assurance
 *                    follow-up sentence. No privacy link.
 *   results-gate-v2  the same copy, the follow-up sentence verbatim, plus the link to the published CRC privacy notice
 *                    (English and Traditional Chinese, SI8-PRIVACY-CRC-3; the link opens the visitor's CRC language).
 *
 * WHO DECIDES. The gate that renders the link also reports, with the email submission, the version it rendered
 * (`resultsGateDisclosureVersion`). Both come from `resultsGateDisclosure()` evaluated once in the visitor's own page build, so the
 * reported version is the rendered one. The server never derives it from the policy it currently publishes: during the publishing
 * deploy a page built before publication (v1, no link) can submit to a server built after it, and must still be recorded as v1.
 *
 * PROVENANCE RULES (`parseResultsGateDisclosureVersion`):
 *   - a supported value is recorded as given;
 *   - a present but unsupported or malformed value fails closed: the request is refused before anything is persisted or sent;
 *   - an absent value is a page build from before this field existed. Every such build renders the v1 gate (no deployed build
 *     before SI8-PRIVACY-CRC-1C ever rendered a privacy link), so it is recorded as v1. This holds only while the link and this
 *     field ship together, which `__tests__/legal/crc-privacy-notice.test.ts` checks.
 * Resends do not render the gate, so they never write the column (`results-email-delivery.ts`).
 *
 * Client-safe: no server config, no policy text.
 */
import { crcPrivacyNoticePublished, type CrcPrivacyNotice } from '@/lib/legal/crc-privacy-notice'

export const RESULTS_GATE_NOTICE_V1 = 'results-gate-v1'
export const RESULTS_GATE_NOTICE_V2 = 'results-gate-v2'
export const SUPPORTED_RESULTS_GATE_DISCLOSURE_VERSIONS = [RESULTS_GATE_NOTICE_V1, RESULTS_GATE_NOTICE_V2] as const
export type ResultsGateDisclosureVersion = (typeof SUPPORTED_RESULTS_GATE_DISCLOSURE_VERSIONS)[number]

export interface ResultsGateDisclosure {
  showPrivacyLink: boolean
  version: ResultsGateDisclosureVersion
}

/** What this page build renders under the gate, and the version that rendering is. One decision for both. */
export function resultsGateDisclosure(doc?: CrcPrivacyNotice | null): ResultsGateDisclosure {
  const showPrivacyLink = doc === undefined ? crcPrivacyNoticePublished() : crcPrivacyNoticePublished(doc)
  return { showPrivacyLink, version: showPrivacyLink ? RESULTS_GATE_NOTICE_V2 : RESULTS_GATE_NOTICE_V1 }
}

export type DisclosureVersionParse =
  | { ok: true; version: ResultsGateDisclosureVersion; source: 'reported' | 'legacy_client' }
  | { ok: false }

export function parseResultsGateDisclosureVersion(raw: unknown): DisclosureVersionParse {
  if (raw === undefined) return { ok: true, version: RESULTS_GATE_NOTICE_V1, source: 'legacy_client' }
  if (typeof raw === 'string' && (SUPPORTED_RESULTS_GATE_DISCLOSURE_VERSIONS as readonly string[]).includes(raw)) {
    return { ok: true, version: raw as ResultsGateDisclosureVersion, source: 'reported' }
  }
  return { ok: false }
}
