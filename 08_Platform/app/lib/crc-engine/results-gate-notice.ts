/**
 * SI8-PRIVACY-CRC-1B — which results-gate disclosure version a new email capture records (`crc_sessions.capture_notice_version`).
 *
 *   results-gate-v1  the gate as launched 2026-08-14: heading, value proposition, field, button and the Commercial Assurance
 *                    follow-up sentence. No privacy link.
 *   results-gate-v2  the same copy, the follow-up sentence verbatim, plus a link to the published CRC privacy notice.
 *
 * v2 is recorded only when the link is actually displayed, i.e. only once `CRC_PRIVACY_NOTICE` is published. The gate component
 * decides whether to render the link from the same function, so the rendered gate and the recorded version come from one
 * build-time value. Earlier sessions are never rewritten: the column is only written at email capture, for that session.
 *
 * Known limit: a visitor who loaded the page from the build before publication and submits after the publishing deploy is recorded
 * as v2 although their gate showed no link. This can happen only in the minutes around the single publishing deploy.
 */
import { CRC_CONFIG } from './config'
import { crcPrivacyNoticePublished } from '@/lib/legal/crc-privacy-notice'
import type { ApprovedLegalDocument } from '@/lib/legal/policies'

export const RESULTS_GATE_NOTICE_V2 = 'results-gate-v2'

export function currentCaptureNoticeVersion(doc?: ApprovedLegalDocument | null): string {
  const published = doc === undefined ? crcPrivacyNoticePublished() : crcPrivacyNoticePublished(doc)
  return published ? RESULTS_GATE_NOTICE_V2 : CRC_CONFIG.captureNoticeVersion
}
