/**
 * CR-ARTIFACT-1 — authenticated delivery of a Creator Record PDF.
 *
 * Server-side streaming (no bearer signed URL is ever handed to the browser).
 * Access contract (CR-ARTIFACT-1A §4):
 *   anonymous                      → 401
 *   owner or admin, issued         → 200 PDF (bytes re-verified against the recorded SHA-256), private, no-store
 *   owner or admin, pending        → 409 {"status":"processing"}
 *   owner or admin, legacy only    → 302 to the existing legacy URL (exposure unchanged)
 *   anyone else / missing / bad id → 404 (indistinguishable)
 * Logs carry the outcome and the caller's role only — never a storage path,
 * URL, email, filename or bytes.
 */

import { sha256Hex, type ArtifactRow } from './issue'

export interface DeliveryPorts {
  currentUserId(): Promise<string | null>
  submissionOwner(submissionId: string): Promise<string | null>
  isAdmin(userId: string): Promise<boolean>
  findArtifact(submissionId: string): Promise<ArtifactRow | null>
  getObject(path: string): Promise<Uint8Array | null>
  legacyUrl(submissionId: string): Promise<string | null>
  log(event: { outcome: string; role: 'anonymous' | 'owner' | 'admin' | 'other' }): void
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    return new Response(body, {
      status: 200,
      headers: {
        ...NO_STORE,
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${artifact.record_id.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
      },
    })
  }

  const legacy = await ports.legacyUrl(submissionId)
  if (legacy) {
    ports.log({ outcome: 'legacy_redirect', role })
    return new Response(null, { status: 302, headers: { ...NO_STORE, Location: legacy } })
  }
  ports.log({ outcome: 'not_found', role })
  return json({ error: 'Not found' }, 404)
}
