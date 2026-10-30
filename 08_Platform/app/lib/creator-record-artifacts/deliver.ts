/**
 * CR-ARTIFACT-1 — authenticated delivery of a Creator Record PDF.
 *
 * Server-side streaming (no bearer signed URL is ever handed to the browser).
 * Access contract (CR-ARTIFACT-1A §4):
 *   anonymous                      → 401
 *   owner or admin, issued         → 200 PDF (bytes re-verified against the recorded SHA-256), private, no-store
 *   owner or admin, pending        → 409 {"status":"processing"}
 *   owner or admin, legacy only    → 200 PDF streamed server-side from the legacy bucket, private, no-store
 *                                    (CR-LEGACY-DOCUMENT-SECURITY-1C: never a redirect or a storage URL)
 *   legacy reference unusable      → 500 (missing object, ambiguous, malformed or cross-submission reference)
 *   anyone else / missing / bad id → 404 (indistinguishable)
 * Logs carry the outcome and the caller's role only — never a storage path,
 * URL, email, filename or bytes.
 */

import { sha256Hex, type ArtifactRow } from './issue'

/** A `rights_packages` row's document reference, as stored by the legacy generator. */
export interface LegacyReference {
  submission_id: string
  document_path: string | null
  document_url: string | null
}

export interface DeliveryPorts {
  currentUserId(): Promise<string | null>
  submissionOwner(submissionId: string): Promise<string | null>
  isAdmin(userId: string): Promise<boolean>
  findArtifact(submissionId: string): Promise<ArtifactRow | null>
  getObject(path: string): Promise<Uint8Array | null>
  /** Every legacy reference recorded for this submission (normally 0 or 1). Throws when unknown. */
  legacyReferences(submissionId: string): Promise<LegacyReference[]>
  /** Read-only, bound to the legacy bucket: null ONLY when the object definitely does not exist. */
  getLegacyObject(path: string): Promise<Uint8Array | null>
  log(event: { outcome: string; role: 'anonymous' | 'owner' | 'admin' | 'other' }): void
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** The only object names the legacy Creator Record generator writes: rights-packages/CR-{year}-{8 hex}_creator-record.pdf */
const LEGACY_PATH_RE = /^rights-packages\/(CR-\d{4}-([0-9A-F]{8}))_creator-record\.pdf$/

export type LegacyResolution =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'ok'; path: string; recordId: string }

/**
 * CR-LEGACY-DOCUMENT-SECURITY-1C — resolve the one legacy object an AUTHORIZED caller may read for this
 * submission. Ownership comes from the database row (rights_packages.submission_id), never the filename;
 * the filename is only checked for consistency with it. Fails closed:
 *   no reference, or no document_url (legacy completion evidence)  → none (404, as before)
 *   more than one reference, a row for another submission, a missing or malformed document_path,
 *   a path whose record id does not belong to this submission, or a document_url that does not
 *   point at that same path                                          → invalid (500)
 */
export function resolveLegacyDocument(submissionId: string, refs: LegacyReference[]): LegacyResolution {
  if (refs.length === 0) return { kind: 'none' }
  if (refs.length > 1) return { kind: 'invalid' }
  const [ref] = refs
  if (ref.submission_id !== submissionId) return { kind: 'invalid' }
  if (!ref.document_url) return ref.document_path ? { kind: 'invalid' } : { kind: 'none' }
  const path = ref.document_path ?? ''
  const m = LEGACY_PATH_RE.exec(path)
  if (!m || m[2] !== submissionId.replace(/-/g, '').slice(0, 8).toUpperCase()) return { kind: 'invalid' }
  if (!ref.document_url.endsWith(`/documents/${path}`)) return { kind: 'invalid' }
  return { kind: 'ok', path, recordId: m[1] }
}

const pdfResponse = (bytes: Uint8Array, recordId: string) =>
  new Response(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, {
    status: 200,
    headers: {
      ...NO_STORE,
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `attachment; filename="${recordId.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
    },
  })
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, 'Content-Type': 'application/json' } })

/**
 * CR-ARTIFACT-1C: any lookup failure → 500 with no detail. In particular, an
 * unreadable artifact state is never downgraded to the legacy URL.
 */
export async function deliverCreatorRecordPdf(submissionId: string, ports: DeliveryPorts): Promise<Response> {
  try {
    return await deliver(submissionId, ports)
  } catch {
    ports.log({ outcome: 'error', role: 'other' })
    return json({ error: 'The document is temporarily unavailable.' }, 500)
  }
}

async function deliver(submissionId: string, ports: DeliveryPorts): Promise<Response> {
  const userId = await ports.currentUserId()
  if (!userId) {
    ports.log({ outcome: 'unauthenticated', role: 'anonymous' })
    return json({ error: 'Unauthorized' }, 401)
  }
  if (!UUID_RE.test(submissionId)) {
    ports.log({ outcome: 'not_found', role: 'other' })
    return json({ error: 'Not found' }, 404)
  }
  const owner = await ports.submissionOwner(submissionId)
  const role = owner === userId ? 'owner' : (await ports.isAdmin(userId)) ? 'admin' : 'other'
  if (!owner || role === 'other') {
    ports.log({ outcome: 'not_found', role })
    return json({ error: 'Not found' }, 404)
  }

  const artifact = await ports.findArtifact(submissionId)
  if (artifact?.status === 'pending') {
    ports.log({ outcome: 'processing', role })
    return json({ status: 'processing' }, 409)
  }
  if (artifact?.status === 'issued') {
    const bytes = await ports.getObject(artifact.storage_path)
    if (!bytes || sha256Hex(bytes) !== artifact.sha256) {
      ports.log({ outcome: 'integrity_failure', role })
      return json({ error: 'The document is temporarily unavailable.' }, 500)
    }
    ports.log({ outcome: 'delivered', role })
    return pdfResponse(bytes, artifact.record_id)
  }

  // Legacy (pre-artifact) PDF: streamed from its original object; never regenerated, never re-issued,
  // never recorded as an artifact. No digest was ever recorded for these bytes, so none is checked.
  const legacy = resolveLegacyDocument(submissionId, await ports.legacyReferences(submissionId))
  if (legacy.kind === 'none') {
    ports.log({ outcome: 'not_found', role })
    return json({ error: 'Not found' }, 404)
  }
  if (legacy.kind === 'invalid') {
    ports.log({ outcome: 'legacy_reference_invalid', role })
    return json({ error: 'The document is temporarily unavailable.' }, 500)
  }
  const legacyBytes = await ports.getLegacyObject(legacy.path)
  if (!legacyBytes) {
    ports.log({ outcome: 'legacy_object_missing', role })
    return json({ error: 'The document is temporarily unavailable.' }, 500)
  }
  ports.log({ outcome: 'legacy_delivered', role })
  return pdfResponse(legacyBytes, legacy.recordId)
}
