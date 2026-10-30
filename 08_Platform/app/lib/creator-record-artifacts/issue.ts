/**
 * CR-ARTIFACT-1 — issue a private Creator Record PDF artifact.
 *
 * Contract (CR-ARTIFACT-1A):
 *   - One artifact per submission (`creator_record_artifacts.submission_id` is
 *     UNIQUE). Completion is `status = 'issued'`, set only after the stored
 *     object has been read back and its SHA-256 equals the recorded digest.
 *   - An issued artifact is immutable: it is never re-rendered, re-uploaded or
 *     replaced (also enforced by a database trigger).
 *   - Objects are written with `upsert: false` at an attempt-specific path, so
 *     no write can overwrite another attempt's bytes.
 *   - A pending artifact whose object is missing may be taken over by a new
 *     attempt (compare-and-swap on `attempt_id`). A stale worker can then
 *     neither overwrite the newer attempt nor mark its own attempt issued.
 *   - Fail closed: any storage or database error other than a definite
 *     "object not found" is thrown and retried later; a stored object whose
 *     digest differs from the record is never accepted or overwritten.
 *
 * Pure apart from the injected ports (unit-tested with fakes).
 */

import { createHash } from 'node:crypto'
import { ARTIFACT_GENERATOR_VERSION, recordIdFor, storagePathFor } from './config'

export type ArtifactStatus = 'pending' | 'issued'

export interface ArtifactRow {
  id: string
  submission_id: string
  record_id: string
  attempt_id: string
  storage_path: string
  sha256: string
  byte_size: number
  generator_version: string
  status: ArtifactStatus
  uat: boolean
  issued_at: string | null
}

export type NewPendingArtifact = Omit<ArtifactRow, 'id' | 'status' | 'issued_at'>

export interface ArtifactTable {
  find(submissionId: string): Promise<ArtifactRow | null>
  /** Insert a pending row; 'conflict' when another attempt already owns the submission. */
  insertPending(row: NewPendingArtifact): Promise<{ result: 'inserted'; row: ArtifactRow } | { result: 'conflict' }>
  /** Move a pending row to a new attempt, only if it is still pending on `expectedAttemptId`. */
  takeOver(id: string, expectedAttemptId: string, next: Pick<ArtifactRow, 'attempt_id' | 'storage_path' | 'sha256' | 'byte_size' | 'generator_version'>): Promise<boolean>
  /** pending → issued, only for this exact attempt and digest. */
  markIssued(id: string, attemptId: string, sha256: string): Promise<boolean>
}

export interface ObjectStore {
  /** The stored bytes; null ONLY when the object definitely does not exist. Throws on any other error. */
  get(path: string): Promise<Uint8Array | null>
  /** Store without overwriting: 'exists' when the path is already taken. Throws on any other error. */
  put(path: string, bytes: Uint8Array): Promise<'stored' | 'exists'>
}

export interface IssueDeps {
  artifacts: ArtifactTable
  objects: ObjectStore
  /** Render the PDF bytes for a record id. */
  render(recordId: string): Promise<Uint8Array>
  newAttemptId(): string
  now(): Date
  /** True when issued through the internal UAT allowlist (before cutover). */
  uat: boolean
  /**
   * CR-ARTIFACT-1C: operational events, by artifact row id only. A takeover, or
   * a stale attempt that lost the race, may leave an ORPHAN object at the losing
   * attempt's path: private, never referenced by the row, never served. There
   * is no cleanup job; operators find orphans with the query in the migration
   * header.
   */
  onEvent?(event: { event: 'takeover' | 'stale_attempt_lost'; artifactId: string }): void
}

export type IssueResult =
  | { outcome: 'issued'; artifact: ArtifactRow }
  | { outcome: 'already_issued'; artifact: ArtifactRow }
  /** Another attempt owns or completed the issuance; the caller re-reads the state. */
  | { outcome: 'contended' }
  /** A stored object does not match its record. Nothing was accepted or overwritten. */
  | { outcome: 'integrity_conflict'; artifactId: string }

export const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export async function issueCreatorRecordArtifact(submissionId: string, deps: IssueDeps): Promise<IssueResult> {
  const existing = await deps.artifacts.find(submissionId)
  if (existing?.status === 'issued') return { outcome: 'already_issued', artifact: existing }
  if (existing) return resumePending(existing, deps)

  const recordId = recordIdFor(submissionId, deps.now())
  const attemptId = deps.newAttemptId()
  const bytes = await deps.render(recordId)
  const inserted = await deps.artifacts.insertPending({
    submission_id: submissionId,
    record_id: recordId,
    attempt_id: attemptId,
    storage_path: storagePathFor(submissionId, attemptId),
    sha256: sha256Hex(bytes),
    byte_size: bytes.byteLength,
    generator_version: ARTIFACT_GENERATOR_VERSION,
    uat: deps.uat,
  })
  if (inserted.result === 'conflict') return { outcome: 'contended' }
  return storeAndIssue(inserted.row, bytes, deps)
}

async function resumePending(row: ArtifactRow, deps: IssueDeps): Promise<IssueResult> {
  const stored = await deps.objects.get(row.storage_path)
  if (stored) return verifyAndIssue(row, stored, deps)

  // The pending attempt's object never landed: take over with a NEW attempt and path.
  const attemptId = deps.newAttemptId()
  const bytes = await deps.render(row.record_id)
  // The bytes are re-rendered by the current generator, so the row records that generator (CR-PDF-CLAIMS-1C.1).
  const next = { attempt_id: attemptId, storage_path: storagePathFor(row.submission_id, attemptId), sha256: sha256Hex(bytes), byte_size: bytes.byteLength, generator_version: ARTIFACT_GENERATOR_VERSION }
  if (!(await deps.artifacts.takeOver(row.id, row.attempt_id, next))) return { outcome: 'contended' }
  deps.onEvent?.({ event: 'takeover', artifactId: row.id })
  return storeAndIssue({ ...row, ...next }, bytes, deps)
}

async function storeAndIssue(row: ArtifactRow, bytes: Uint8Array, deps: IssueDeps): Promise<IssueResult> {
  // 'exists' can only be this attempt's own earlier write (the path is attempt-specific); it is verified below.
  await deps.objects.put(row.storage_path, bytes)
  const stored = await deps.objects.get(row.storage_path)
  if (!stored) throw new Error('creator_record_artifact_not_visible_after_upload')
  return verifyAndIssue(row, stored, deps)
}

async function verifyAndIssue(row: ArtifactRow, stored: Uint8Array, deps: IssueDeps): Promise<IssueResult> {
  if (sha256Hex(stored) !== row.sha256) return { outcome: 'integrity_conflict', artifactId: row.id }
  if (await deps.artifacts.markIssued(row.id, row.attempt_id, row.sha256)) {
    const issued = await deps.artifacts.find(row.submission_id)
    if (issued?.status === 'issued' && issued.attempt_id === row.attempt_id) return { outcome: 'issued', artifact: issued }
    throw new Error('creator_record_artifact_state_unconfirmed')
  }
  // Lost the race (taken over, or completed by another attempt): never claim success for this attempt.
  deps.onEvent?.({ event: 'stale_attempt_lost', artifactId: row.id })
  return { outcome: 'contended' }
}
