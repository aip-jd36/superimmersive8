/**
 * CR-ARTIFACT-1 — private Creator Record artifact rollout configuration.
 *
 * The rollout mode is a CODE constant (like the live-extraction lock): no
 * environment value or request can widen it. Changing it is a reviewed code
 * change and a deployment.
 *
 *   'allowlist' (default until cutover): only submissions listed in
 *     `creator_record_artifact_uat` use the private path; every other Creator
 *     Record keeps the existing legacy path, unchanged.
 *   'all': every new Creator Record issuance uses the private path (cutover —
 *     needs separate PM approval).
 *   'off' (CR-ARTIFACT-1C, issuance-preserving rollback): no NEW submission
 *     enters the private path and no allowlist lookup is made — but every
 *     existing artifact keeps full authority: issued ones stay complete and
 *     deliverable, pending ones are resumed privately, never re-issued on the
 *     public legacy path.
 *
 * Whatever the mode, a submission that already has an artifact row always
 * continues on the private path, and one that already has a legacy PDF is
 * never re-issued (see ./precedence.ts).
 *
 * ROLLBACK FLOOR: once any row exists in `creator_record_artifacts`, never
 * deploy code older than CR-ARTIFACT-1. Pre-artifact code ignores artifacts:
 * it would show no download link and could re-issue a public legacy PDF.
 * Roll back by deploying this code with 'off' (or by emptying the allowlist).
 */

export type ArtifactRolloutMode = 'off' | 'allowlist' | 'all'

export const CREATOR_RECORD_ARTIFACT_ROLLOUT: ArtifactRolloutMode = 'allowlist'

export const CREATOR_RECORDS_BUCKET = 'creator-records'
export const ARTIFACTS_TABLE = 'creator_record_artifacts'
export const UAT_ALLOWLIST_TABLE = 'creator_record_artifact_uat'

/** Identifies the renderer that produced the bytes; recorded on every artifact. */
export const ARTIFACT_GENERATOR_VERSION = 'legacy-creator-record-pdf-v1'

/** Customer-facing record id, fixed at the first attempt: CR-{year}-{first 8 hex of the submission id}. */
export function recordIdFor(submissionId: string, now: Date): string {
  return `CR-${now.getUTCFullYear()}-${submissionId.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** Object path inside the private bucket. Tied to the attempt, so a takeover never overwrites. */
export function storagePathFor(submissionId: string, attemptId: string): string {
  return `${submissionId}/${attemptId}.pdf`
}

/**
 * The authenticated delivery route for a submission's Creator Record PDF.
 * Deliberately outside `app/api/dashboard/submissions/`, whose routes are the
 * CRC-handoff customer routes guarded by __tests__/crc-assurance-handoff/boundaries.test.ts.
 */
export function deliveryPathFor(submissionId: string): string {
  return `/api/creator-record/${submissionId}/pdf`
}
