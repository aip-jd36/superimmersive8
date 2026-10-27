/**
 * POST /api/admin/creator-record-v2/examine   (CR-V2-EVIDENCE-SLICE-1)
 *
 * INTERNAL PROTOTYPE. Admin-only. Examines ONE uploaded document for one tool
 * block and returns what it appears to show, as a labelled, display-only
 * observation. Synthetic test documents only.
 *
 * Order (each step fails closed before the next):
 *   1. admin authorization (`checkReviewerContextAccess`) — before any byte of
 *      the body is read;
 *   2. server-enforced consent (CR-V2-MVP-1): the request must carry the exact
 *      consent statement header, or it is refused before the body is read;
 *   3. size: declared Content-Length, then a streamed hard limit;
 *   3. strict multipart shape: exactly `file` and `tool_index`;
 *   4. examination (`examineUpload`): byte-sniffed format and size checks
 *      before any model call; fixture replay by default (zero model calls);
 *      live model only behind the disabled-by-default gate.
 *
 * Nothing is stored: no storage bucket, database write or file system write.
 * The bytes live only in this request. Nothing about the document is logged.
 * Deliberately does NOT reuse /api/upload (persistent storage, browser-declared
 * types, non-admin callers).
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { DOCUMENT_CONSENT_HEADER, DOCUMENT_CONSENT_VALUE, MAX_EXAMINE_REQUEST_BYTES, MAX_UPLOAD_BYTES } from '@/lib/creator-record/evidence/document-observations'
import { extractionMode } from '@/lib/creator-record/evidence/config'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { evidenceSigningKey, issueAttestation } from '@/lib/creator-record/evidence/attestation'
import { getVerifiedSessionContext } from '@/lib/reviewer-context/session-context'
import { loadLiveCaller } from '@/lib/creator-record/evidence/live-caller'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_TOOL_INDEX = 2

type Read = { ok: true; bytes: Uint8Array } | { ok: false; status: 400 | 413 }

/** Reads the body up to `limit` bytes; stops and refuses as soon as it is exceeded. */
async function readLimited(req: NextRequest, limit: number): Promise<Read> {
  if (!req.body) return { ok: false, status: 400 }
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return { ok: false, status: 413 }
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return { ok: true, bytes: out }
}

const tooLarge = () => NextResponse.json({ error: `File too large (limit ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB)` }, { status: 413 })
const invalid = () => NextResponse.json({ error: 'Invalid request' }, { status: 400 })

export async function POST(req: NextRequest) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  if (req.headers.get(DOCUMENT_CONSENT_HEADER) !== DOCUMENT_CONSENT_VALUE) return NextResponse.json({ error: 'Consent required' }, { status: 428 })
  // CR-V2-MVP-7: a live reading is attested to this admin session; without a signing key or a verified
  // session, refuse BEFORE the body is read, so no model call is ever made for an observation that could not be accepted.
  const mode = extractionMode()
  const signingKey = mode === 'live_model' ? evidenceSigningKey() : null
  const session = mode === 'live_model' ? await getVerifiedSessionContext(access.userId) : null
  if (mode === 'live_model' && !signingKey) return NextResponse.json({ error: 'Live document reading is not configured' }, { status: 503 })
  if (mode === 'live_model' && !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return invalid()
  const declared = Number(req.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_EXAMINE_REQUEST_BYTES) return tooLarge()

  const body = await readLimited(req, MAX_EXAMINE_REQUEST_BYTES)
  if (!body.ok) return body.status === 413 ? tooLarge() : invalid()

  let form: FormData
  try {
    form = await new Request('http://local.invalid/', { method: 'POST', headers: { 'content-type': contentType }, body: new Blob([body.bytes as BlobPart]) }).formData()
  } catch {
    return invalid()
  }
  const keys = Array.from(form.keys()).sort()
  if (keys.length !== 2 || keys[0] !== 'file' || keys[1] !== 'tool_index') return invalid()
  const file = form.get('file')
  const toolIndexRaw = form.get('tool_index')
  if (!(file instanceof Blob) || typeof toolIndexRaw !== 'string' || !/^[0-9]$/.test(toolIndexRaw)) return invalid()
  const tool_index = Number(toolIndexRaw)
  if (tool_index > MAX_TOOL_INDEX) return invalid()
  if (file.size > MAX_UPLOAD_BYTES) return tooLarge()

  const bytes = new Uint8Array(await file.arrayBuffer())
  let liveCaller
  if (mode === 'live_model') {
    try {
      liveCaller = await loadLiveCaller()
    } catch {
      liveCaller = undefined // examineUpload fails closed (model_error) without a caller
    }
  }
  // CR-V2-MVP-6: the G-R2 text-layer cross-check is deferred; no plan scope is passed, so it is recorded as not run.
  const document = await examineUpload(bytes, 'name' in file ? (file as File).name : null, { mode, liveCaller })
  if (mode === 'live_model' && signingKey && session) {
    return NextResponse.json({ ok: true, tool_index, document, attestation: issueAttestation(document, session, signingKey, Date.now()) })
  }
  return NextResponse.json({ ok: true, tool_index, document })
}
