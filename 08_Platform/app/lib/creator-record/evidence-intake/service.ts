/**
 * CR-V2-DOC-1 — Creator Record v2 evidence intake: upload, list, delete, read, reference and clean up.
 *
 * PURE apart from the injected ports (unit-tested with fakes). No model call, no examination, no Living
 * Knowledge: a document is stored and inventoried, nothing more. The creator is always the session user.
 *
 * Gates (every write, and listing):
 *   1. the Creator Record v2 submissions stop must be open (`CREATOR_RECORD_V2_SUBMISSIONS`; stopped in
 *      Production), then the creator must be invited;
 *   2. the request must carry the consent identifier (a DRAFT, see `./contract`), recorded on the row;
 *   3. the code lock: while real documents are not permitted, only SI8's synthetic test documents are stored.
 *
 * Concurrency and cleanup:
 *   - the database allows ONE live row per creator and SHA-256; the row is inserted `pending` FIRST, so
 *     racing uploads of the same bytes converge: the winner stores the object, every other request gets the
 *     stored row (deduplicated) or "upload in progress";
 *   - the object path is `<user_id>/<document_id>` from a server id, never a file name; objects are written
 *     without overwrite;
 *   - a failed object write removes the pending row; a row left pending (crash) is removed by cleanup, with
 *     its object if any; a deleted document's object is removed, and cleanup retries a failed removal.
 *
 * Deletion here (owner delete, behind the submissions stop): only a stored document that no prepared version
 * references (the database refuses otherwise). A referenced original is removed only by the retention policy
 * (CR-V2-MVP-RETENTION-M1A, `./retention`: 90-day expiry, a deletion request, both decided by the database).
 * Prepared and paid records keep their own fingerprint of every document either way, and never read the bytes
 * again; the cleanup below removes the object of every deleted document, whatever the reason.
 *
 * Evidence at payment and issuance (CR-V2-DOC-1B): `verifyEvidenceIntact` re-checks every document a version
 * references (row still stored, same owner and SHA-256, bytes present and re-hashed). Checkout and issuance
 * refuse when it fails, so no Creator Record is sold or issued listing a document SI8 no longer holds intact.
 *
 * Reads: owner or admin only; every read is logged BEFORE any content is returned (a failed log returns no
 * content); the stored bytes are re-hashed and must match the row.
 */

import {
  EVIDENCE_CONSENT_DRAFT_VERSION,
  EVIDENCE_MAX_LIVE_PER_CREATOR,
  EVIDENCE_PENDING_STALE_MS,
  sanitizeEvidenceFileName,
  sha256Bytes,
  validateEvidenceBytes,
  type EvidenceReference,
  type EvidenceRefusal,
} from './contract'
import type { EvidenceCategory, EvidenceMediaType } from './vocabulary'

export type EvidenceState = 'pending' | 'stored' | 'deleted'

export interface EvidenceRow {
  id: string
  user_id: string
  sha256: string
  media_type: EvidenceMediaType
  byte_size: number
  file_name: string
  storage_path: string
  /** CR-V2-PROD-UAT-B: null only for an operator-seeded synthetic document (no customer consent exists for it). */
  consent_version: string | null
  state: EvidenceState
  created_at: string
  stored_at: string | null
  deleted_at: string | null
  object_removed_at: string | null
}

export type NewEvidenceRow = Pick<EvidenceRow, 'id' | 'user_id' | 'sha256' | 'media_type' | 'byte_size' | 'file_name' | 'storage_path'> & { consent_version: string }

export interface EvidenceStore {
  /**
   * Insert a pending row; on a live (user, sha256) conflict, insert nothing and return the live row (or null if it
   * vanished). `quota_exceeded`: the database's per-creator cap refused the insert (authoritative under concurrency).
   */
  insertPending(row: NewEvidenceRow): Promise<{ inserted: true; row: EvidenceRow } | { inserted: false; existing: EvidenceRow | null; quota_exceeded?: boolean }>
  /** pending → stored for this owner; null if the row is no longer pending. */
  markStored(id: string, userId: string, at: Date): Promise<EvidenceRow | null>
  /** Remove a row only while it is pending. */
  removePending(id: string): Promise<boolean>
  get(id: string): Promise<EvidenceRow | null>
  /** Stored documents of a creator, newest first. */
  listStored(userId: string): Promise<EvidenceRow[]>
  /** Live (pending or stored) documents of a creator. */
  countLive(userId: string): Promise<number>
  /** stored → deleted for this owner. 'referenced' when a prepared version references it (the database refuses). */
  markDeleted(id: string, userId: string, at: Date): Promise<'deleted' | 'referenced' | 'not_stored'>
  markObjectRemoved(id: string, at: Date): Promise<void>
  pendingCreatedBefore(before: Date): Promise<EvidenceRow[]>
  deletedWithObject(): Promise<EvidenceRow[]>
  logAccess(documentId: string, actorUserId: string, role: 'owner' | 'admin'): Promise<void>
}

export interface EvidenceObjects {
  /** Write once; throws if the path exists or the write fails. */
  put(path: string, bytes: Uint8Array, mediaType: EvidenceMediaType): Promise<void>
  /** The bytes, or null when the object does not exist. */
  get(path: string): Promise<Uint8Array | null>
  /** Remove; a missing object is not an error. */
  remove(path: string): Promise<void>
}

export interface EvidenceDeps {
  /** The Creator Record v2 submissions stop (CREATOR_RECORD_V2_SUBMISSIONS). */
  submissions: 'open' | 'stopped'
  hasPilotAccess(userId: string): Promise<boolean>
  /** The code lock (`EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED`). */
  realDocumentsPermitted: boolean
  /** True only for SI8's own synthetic test documents (by SHA-256). */
  isSyntheticTestDocument(sha256: string): boolean
  store: EvidenceStore
  objects: EvidenceObjects
  newId(): string
  now(): Date
  log?(event: string, detail: Record<string, unknown>): void
  /**
   * CR-V2-UAT-PROD-MIN-1: the identity-scoped synthetic UAT exception to the submissions stop (one named identity, one
   * fixed window; the pilot invitation is still required). Absent or inert = none. The synthetic-only lock is unchanged.
   */
  syntheticUat?: { admits(userId: string, now: Date): boolean }
  /**
   * CR-V2-SCHEMA8-PATH-1 (E7): the storage-consent identifier an upload must carry now, bound to the approved privacy notice and
   * terms (`lib/creator-record-flow/authorization-versions.ts`). The upload accepts only this and records it with the document.
   * Absent: the draft identifier, which only ever admits SI8's synthetic test documents — real documents need
   * `realDocumentsPermitted`, and every wiring that can set it also supplies this.
   */
  consentVersion?: string
}

export interface EvidenceView {
  id: string
  file_name: string
  media_type: EvidenceMediaType
  byte_size: number
  sha256: string
  created_at: string
}

export type EvidenceError =
  | { ok: false; status: 400; code: 'invalid_request' | 'consent_required' | EvidenceRefusal }
  | { ok: false; status: 403; code: 'not_invited' | 'synthetic_documents_only' }
  | { ok: false; status: 404; code: 'not_found' }
  | { ok: false; status: 409; code: 'upload_in_progress' | 'too_many_documents' | 'document_retained' | 'consent_outdated' }
  | { ok: false; status: 410; code: 'object_missing' }
  | { ok: false; status: 500; code: 'integrity_failure' | 'storage_failed' }
  | { ok: false; status: 503; code: 'submissions_stopped' | 'audit_unavailable' }

type WithoutOk<T> = T extends unknown ? Omit<T, 'ok'> : never
const err = (e: WithoutOk<EvidenceError>): EvidenceError => ({ ok: false, ...e }) as EvidenceError
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const viewOf = (r: EvidenceRow): EvidenceView => ({ id: r.id, file_name: r.file_name, media_type: r.media_type, byte_size: r.byte_size, sha256: r.sha256, created_at: r.created_at })

async function gate(deps: EvidenceDeps, userId: string): Promise<EvidenceError | null> {
  if (deps.submissions !== 'open' && !(deps.syntheticUat && deps.syntheticUat.admits(userId, deps.now()))) return err({ status: 503, code: 'submissions_stopped' })
  if (!(await deps.hasPilotAccess(userId))) return err({ status: 403, code: 'not_invited' })
  return null
}

/** The same gate, for a route to apply BEFORE reading a request body (so a stopped build buffers nothing). */
export const checkEvidenceGate = gate

export interface UploadInput {
  bytes: Uint8Array
  file_name: unknown
  consent: unknown
}

/**
 * CR-V2-SCHEMA8-PATH-1-DEDUP-CORRECTION: the answer for identical bytes the creator already holds. Only a document stored under the
 * SAME storage-consent identifier is returned as the deduplicated result. One stored under a different identifier (an earlier consent
 * wording or earlier privacy notice or terms) is refused `consent_outdated`: the current consent is never reported as covering it.
 * Nothing is changed: the stored document, its recorded consent (immutable), any AI-examination permission and any withdrawal stay
 * exactly as they are, and no new document is created.
 */
function heldResult(held: EvidenceRow, consentVersion: string): { ok: true; document: EvidenceView; deduplicated: true } | EvidenceError {
  if (held.consent_version !== consentVersion) return err({ status: 409, code: 'consent_outdated' })
  return { ok: true, document: viewOf(held), deduplicated: true }
}

/** Store one document. Idempotent per creator and content: the same bytes return the same document (under the same consent). */
export async function uploadEvidence(deps: EvidenceDeps, userId: string, input: UploadInput): Promise<{ ok: true; document: EvidenceView; deduplicated: boolean } | EvidenceError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  // CR-V2-SCHEMA8-PATH-1 (E7): only the current identifier (wording + approved policy versions) is accepted, and it is recorded.
  const consentVersion = deps.consentVersion ?? EVIDENCE_CONSENT_DRAFT_VERSION
  // A real document is never stored under the unbound draft identifier (fail closed even if a wiring omitted it).
  if (deps.realDocumentsPermitted && consentVersion === EVIDENCE_CONSENT_DRAFT_VERSION) return err({ status: 400, code: 'consent_required' })
  if (input.consent !== consentVersion) return err({ status: 400, code: 'consent_required' })

  const v = validateEvidenceBytes(input.bytes)
  if (!v.ok) return err({ status: 400, code: v.code })
  if (!deps.realDocumentsPermitted && !deps.isSyntheticTestDocument(v.sha256)) return err({ status: 403, code: 'synthetic_documents_only' })

  if ((await deps.store.countLive(userId)) >= EVIDENCE_MAX_LIVE_PER_CREATOR) {
    // A re-upload of a document already held is still answered (deduplicated), even at the limit.
    const held = (await deps.store.listStored(userId)).find((r) => r.sha256 === v.sha256)
    if (held) return heldResult(held, consentVersion)
    return err({ status: 409, code: 'too_many_documents' })
  }

  const id = deps.newId()
  const row: NewEvidenceRow = {
    id,
    user_id: userId,
    sha256: v.sha256,
    media_type: v.media_type,
    byte_size: v.byte_size,
    file_name: sanitizeEvidenceFileName(input.file_name),
    storage_path: `${userId}/${id}`,
    consent_version: consentVersion,
  }
  const claim = await deps.store.insertPending(row)
  if (!claim.inserted && claim.quota_exceeded) {
    const held = (await deps.store.listStored(userId)).find((r) => r.sha256 === v.sha256)
    if (held) return heldResult(held, consentVersion)
    return err({ status: 409, code: 'too_many_documents' })
  }
  if (!claim.inserted) {
    const existing = claim.existing
    if (existing && existing.state === 'stored' && existing.user_id === userId) return heldResult(existing, consentVersion)
    return err({ status: 409, code: 'upload_in_progress' })
  }

  try {
    await deps.objects.put(row.storage_path, input.bytes, row.media_type)
  } catch (e) {
    deps.log?.('creator_record_evidence_store_failed', { document_id: id, stage: 'object' })
    await deps.store.removePending(id).catch(() => undefined)
    return err({ status: 500, code: 'storage_failed' })
  }
  const stored = await deps.store.markStored(id, userId, deps.now())
  if (!stored) {
    deps.log?.('creator_record_evidence_store_failed', { document_id: id, stage: 'mark_stored' })
    // Leave nothing behind: cleanup also catches this if the removals fail.
    await deps.objects.remove(row.storage_path).catch(() => undefined)
    await deps.store.removePending(id).catch(() => undefined)
    return err({ status: 500, code: 'storage_failed' })
  }
  return { ok: true, document: viewOf(stored), deduplicated: false }
}

export async function listEvidence(deps: EvidenceDeps, userId: string): Promise<{ ok: true; documents: EvidenceView[] } | EvidenceError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  return { ok: true, documents: (await deps.store.listStored(userId)).map(viewOf) }
}

/** Delete an UNREFERENCED stored document. A referenced document is retained (409). */
export async function deleteEvidence(deps: EvidenceDeps, userId: string, id: unknown): Promise<{ ok: true } | EvidenceError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  if (typeof id !== 'string' || !UUID.test(id)) return err({ status: 404, code: 'not_found' })
  const row = await deps.store.get(id)
  if (!row || row.user_id !== userId || row.state !== 'stored') return err({ status: 404, code: 'not_found' })
  const outcome = await deps.store.markDeleted(id, userId, deps.now())
  if (outcome === 'referenced') return err({ status: 409, code: 'document_retained' })
  if (outcome === 'not_stored') return err({ status: 404, code: 'not_found' })
  try {
    await deps.objects.remove(row.storage_path)
    await deps.store.markObjectRemoved(id, deps.now())
  } catch {
    // The row is deleted; cleanup retries removing the object.
    deps.log?.('creator_record_evidence_object_removal_deferred', { document_id: id })
  }
  return { ok: true }
}

export interface EvidenceActor {
  userId: string
  isAdmin: boolean
}

/** The stored bytes for the owner or an admin. Logged before any content; re-hashed against the row. */
export async function readEvidenceFile(deps: EvidenceDeps, actor: EvidenceActor, id: unknown): Promise<{ ok: true; bytes: Uint8Array; media_type: EvidenceMediaType; file_name: string } | EvidenceError> {
  if (typeof id !== 'string' || !UUID.test(id)) return err({ status: 404, code: 'not_found' })
  const row = await deps.store.get(id)
  if (!row || row.state !== 'stored') return err({ status: 404, code: 'not_found' })
  const role = row.user_id === actor.userId ? 'owner' : actor.isAdmin ? 'admin' : null
  // Another creator's document is indistinguishable from a missing one.
  if (!role) return err({ status: 404, code: 'not_found' })
  try {
    await deps.store.logAccess(row.id, actor.userId, role)
  } catch {
    return err({ status: 503, code: 'audit_unavailable' })
  }
  const bytes = await deps.objects.get(row.storage_path)
  if (!bytes) {
    deps.log?.('creator_record_evidence_object_missing', { document_id: row.id })
    return err({ status: 410, code: 'object_missing' })
  }
  if (bytes.length !== row.byte_size || sha256Bytes(bytes) !== row.sha256) {
    deps.log?.('creator_record_evidence_integrity_failure', { document_id: row.id })
    return err({ status: 500, code: 'integrity_failure' })
  }
  return { ok: true, bytes, media_type: row.media_type, file_name: row.file_name }
}

/** A verified inventory entry for a prepared version (content-addressed by SHA-256). */
export interface ResolvedEvidence {
  document_id: string
  sha256: string
  media_type: EvidenceMediaType
  byte_size: number
  file_name: string
  category: EvidenceCategory
  tool_index: number | null
}

/**
 * Resolve a creator's references to their own stored documents. Any foreign, missing, pending or deleted
 * document refuses the whole set (the database re-checks the same at insert).
 */
export async function resolveEvidenceReferences(store: Pick<EvidenceStore, 'get'>, userId: string, refs: readonly EvidenceReference[]): Promise<{ ok: true; documents: ResolvedEvidence[] } | { ok: false }> {
  const out: ResolvedEvidence[] = []
  for (const ref of refs) {
    const row = await store.get(ref.document_id)
    if (!row || row.user_id !== userId || row.state !== 'stored') return { ok: false }
    out.push({ document_id: row.id, sha256: row.sha256, media_type: row.media_type, byte_size: row.byte_size, file_name: row.file_name, category: ref.category, tool_index: ref.tool_index })
  }
  return { ok: true, documents: out }
}

/** Remove abandoned pending uploads (with any object) and objects of deleted documents. Not exposed to creators. */
export async function cleanupEvidence(deps: Pick<EvidenceDeps, 'store' | 'objects' | 'now' | 'log'>): Promise<{ pending_removed: number; objects_removed: number; failures: number }> {
  let pending_removed = 0
  let objects_removed = 0
  let failures = 0
  const before = new Date(deps.now().getTime() - EVIDENCE_PENDING_STALE_MS)
  for (const row of await deps.store.pendingCreatedBefore(before)) {
    try {
      // Row first (only while still pending), then its object: if the upload completed meanwhile, the row is
      // stored, nothing is removed, and its bytes stay. An upload whose row was removed fails its own
      // pending → stored step and removes its object itself.
      if (!(await deps.store.removePending(row.id))) continue
      pending_removed += 1
      await deps.objects.remove(row.storage_path)
    } catch {
      failures += 1
    }
  }
  for (const row of await deps.store.deletedWithObject()) {
    try {
      await deps.objects.remove(row.storage_path)
      await deps.store.markObjectRemoved(row.id, deps.now())
      objects_removed += 1
    } catch {
      failures += 1
    }
  }
  if (failures > 0) deps.log?.('creator_record_evidence_cleanup_failures', { failures })
  return { pending_removed, objects_removed, failures }
}

/** `consent_withdrawn` (CR-V2-MVP-RETENTION-M1A, 8N): set by the production check, not by `verifyEvidenceIntact` itself. */
export type EvidenceIntegrity = { ok: true } | { ok: false; reason: 'not_stored' | 'fingerprint_mismatch' | 'object_missing' | 'object_altered' | 'unavailable' | 'consent_withdrawn' }

/**
 * CR-V2-DOC-1B: every document a prepared version references is still held intact: its row is stored, owned by
 * the version's creator, with the recorded SHA-256 and size, and its bytes are present and re-hash to it. Any
 * storage or database error is `unavailable` (fail closed). Examines nothing.
 */
export async function verifyEvidenceIntact(
  ports: { store: Pick<EvidenceStore, 'get'>; objects: Pick<EvidenceObjects, 'get'> },
  userId: string,
  items: readonly { document_id: string; sha256: string; byte_size: number }[],
): Promise<EvidenceIntegrity> {
  try {
    for (const item of items) {
      const row = await ports.store.get(item.document_id)
      if (!row || row.state !== 'stored' || row.user_id !== userId) return { ok: false, reason: 'not_stored' }
      if (row.sha256 !== item.sha256 || row.byte_size !== item.byte_size) return { ok: false, reason: 'fingerprint_mismatch' }
      const bytes = await ports.objects.get(row.storage_path)
      if (!bytes) return { ok: false, reason: 'object_missing' }
      if (bytes.length !== item.byte_size || sha256Bytes(bytes) !== item.sha256) return { ok: false, reason: 'object_altered' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
