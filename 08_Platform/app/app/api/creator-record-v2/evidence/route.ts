/**
 * /api/creator-record-v2/evidence   (CR-V2-DOC-1)
 *
 * GET  — the signed-in creator's stored documents (metadata only).
 * POST — add one document: multipart `file` + `consent` (the consent identifier), at most 4 MB.
 *
 * Stopped by default: while CREATOR_RECORD_V2_SUBMISSIONS is 'stopped' (Production) both answer 503 before
 * any body is read. Invite-only. While the evidence code lock is in place only SI8's synthetic test
 * documents are stored. Nothing is examined.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkEvidenceGate, listEvidence, uploadEvidence } from '@/lib/creator-record/evidence-intake/service'
import { EVIDENCE_MAX_REQUEST_BYTES } from '@/lib/creator-record/evidence-intake/contract'
import { productionEvidenceDeps } from '@/lib/creator-record-flow/evidence-production'
import { evidenceError, invalidRequest, readLimitedBytes } from '@/lib/creator-record-flow/evidence-http'
import { internalError, NO_STORE, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const r = await listEvidence(productionEvidenceDeps(), userId)
    return r.ok ? NextResponse.json({ documents: r.documents }, { status: 200, headers: NO_STORE }) : evidenceError(r)
  } catch (err) {
    console.error('[creator-record-v2/evidence] list failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}

export async function POST(request: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const deps = productionEvidenceDeps()
    const gated = await checkEvidenceGate(deps, userId)
    if (gated) return evidenceError(gated)

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) return invalidRequest()
    const declared = Number(request.headers.get('content-length') ?? '')
    if (Number.isFinite(declared) && declared > EVIDENCE_MAX_REQUEST_BYTES) return invalidRequest(413)
    const body = await readLimitedBytes(request.body, EVIDENCE_MAX_REQUEST_BYTES)
    if (!body.ok) return invalidRequest(body.status)

    let form: FormData
    try {
      form = await new Request('http://local.invalid/', { method: 'POST', headers: { 'content-type': contentType }, body: new Blob([body.bytes as BlobPart]) }).formData()
    } catch {
      return invalidRequest()
    }
    const keys = Array.from(form.keys()).sort()
    if (keys.length !== 2 || keys[0] !== 'consent' || keys[1] !== 'file') return invalidRequest()
    const file = form.get('file')
    const consent = form.get('consent')
    if (!(file instanceof Blob) || typeof consent !== 'string') return invalidRequest()

    const r = await uploadEvidence(deps, userId, { bytes: new Uint8Array(await file.arrayBuffer()), file_name: 'name' in file ? (file as File).name : null, consent })
    return r.ok ? NextResponse.json({ document: r.document, deduplicated: r.deduplicated }, { status: r.deduplicated ? 200 : 201, headers: NO_STORE }) : evidenceError(r)
  } catch (err) {
    console.error('[creator-record-v2/evidence] upload failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
