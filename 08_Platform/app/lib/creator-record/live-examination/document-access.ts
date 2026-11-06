/**
 * CR-V2-DOC-LIVE-1B — which document, for which record, tool and user. Disabled, and imported by nothing but the production ports.
 *
 * The one way into a bound examination. The document table has no tool column: the association lives in the prepared version's own
 * canonical record, so that is what is checked, against the stored digest, BEFORE anything else runs. A held reading is not returned
 * either until the binding holds and the document is still stored. The request is built here from the scope, so the two cannot name different users or documents.
 *
 * Access stays server-side: the ports read with the service role, nothing issues a URL, the read is logged before the bytes are fetched,
 * and the bytes are then re-checked by SHA-256, size and sniffed type (`./examine`). Documents are not logged or stored here.
 */

import type { ProfileRef } from '../examination/envelope'
import { sha256Hex } from '../record-core/canonical'
import { examineLiveAndRecord, type LiveAdapterDeps, type LiveRecordResult } from './examine'

export interface LiveDocumentScope {
  actor_user_id: string
  prepared_id: string
  document_id: string
  tool_index: number
}

export interface PreparedBindingRow {
  id: string
  user_id: string
  canonical: string
  sha256: string
}

export interface LivePreparedSource {
  getPrepared(preparedId: string): Promise<PreparedBindingRow | null>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function parseLiveDocumentScope(raw: unknown): LiveDocumentScope | null {
  if (!isObj(raw) || Object.keys(raw).length !== 4) return null
  const { actor_user_id, prepared_id, document_id, tool_index } = raw
  if (typeof actor_user_id !== 'string' || !UUID.test(actor_user_id) || typeof prepared_id !== 'string' || !UUID.test(prepared_id) || typeof document_id !== 'string' || !UUID.test(document_id)) return null
  if (typeof tool_index !== 'number' || !Number.isInteger(tool_index) || tool_index < 0) return null
  return { actor_user_id, prepared_id, document_id, tool_index }
}

/** Null when the prepared version belongs to this user, is intact, and links this document, with these bytes, to this tool. Otherwise the failing check. */
export function verifyDocumentBinding(row: PreparedBindingRow, scope: LiveDocumentScope, documentSha256: string): string | null {
  if (row.id !== scope.prepared_id) return 'prepared_id'
  if (row.user_id !== scope.actor_user_id) return 'prepared_owner'
  if (typeof row.canonical !== 'string' || sha256Hex(row.canonical) !== row.sha256) return 'prepared_digest'
  let record: unknown
  try {
    record = JSON.parse(row.canonical)
  } catch {
    return 'prepared_json'
  }
  const items = isObj(record) && isObj(record.documents) ? record.documents.items : null
  if (!Array.isArray(items)) return 'prepared_shape'
  const linked = items.filter((i) => isObj(i) && i.document_id === scope.document_id && i.tool_index === scope.tool_index)
  if (linked.length !== 1) return 'tool_association'
  if ((linked[0] as Record<string, unknown>).sha256 !== documentSha256) return 'document_sha256'
  return null
}

export async function examineBoundDocument(deps: LiveAdapterDeps & { prepared: LivePreparedSource }, rawScope: unknown, profile: Pick<ProfileRef, 'id' | 'version'>): Promise<LiveRecordResult> {
  const scope = parseLiveDocumentScope(rawScope)
  if (!scope) return { kind: 'refused', code: 'invalid_request', read_logged: false }
  let row: PreparedBindingRow | null
  let document: Awaited<ReturnType<LiveAdapterDeps['storage']['getDocument']>>
  try {
    ;[row, document] = await Promise.all([deps.prepared.getPrepared(scope.prepared_id), deps.storage.getDocument(scope.document_id)])
  } catch {
    return { kind: 'unavailable', reason: 'storage_unavailable' }
  }
  if (!row || !document || verifyDocumentBinding(row, scope, document.sha256) !== null) return { kind: 'refused', code: 'document_not_bound', read_logged: false }
  // A held reading is returned without touching the document again, so its state is checked here, after the binding: an unbound caller learns nothing about it.
  if (document.state !== 'stored') return { kind: 'refused', code: 'document_not_stored', read_logged: false }
  return examineLiveAndRecord(deps, { actor_user_id: scope.actor_user_id, document_id: scope.document_id, profile: { id: profile.id, version: profile.version } })
}
