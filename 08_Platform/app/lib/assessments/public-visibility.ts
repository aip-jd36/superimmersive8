/**
 * Public visibility gate for assessments — the single governed predicate for
 * "is this assessment eligible to appear on the public Public Assessment
 * Record route".
 *
 * A pure module: it imports ONLY the `ProcessingStatus` type. It contains no
 * server clients, no Node dependencies, and is therefore safe to import from
 * both the server-side public-record lookup (`repository.findAssessmentForVerification`)
 * and client components (the admin Sign & Deliver panel), so that both
 * consumers project public eligibility from the *same* governed rule rather
 * than each maintaining its own status list.
 *
 * DELIVERED is the only publicly visible processing status. DRAFT,
 * REPORT_GENERATED, SIGNING, SIGNED, and FAILED must all resolve identically
 * to a nonexistent assessment number — no leaking that a draft exists, its
 * preliminary outcome, or that review/signing is underway.
 */

import type { ProcessingStatus } from '@/types/assessment'

export const PUBLICLY_VISIBLE_PROCESSING_STATUSES: readonly ProcessingStatus[] = ['DELIVERED']

export function isPubliclyVisibleProcessingStatus(status: ProcessingStatus): boolean {
  return PUBLICLY_VISIBLE_PROCESSING_STATUSES.includes(status)
}
