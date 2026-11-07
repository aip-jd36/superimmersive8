/**
 * Request handling shared by the customer routes and the admin UAT routes, so both parse bodies identically. The caller
 * has already authenticated `userId` and chooses the dependencies; nothing here reads an identity or a mode from the request.
 */
import { NextResponse } from 'next/server'
import { checkCustomerExaminationGate, requestCustomerExamination, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { preparePrepared, type FlowDeps } from '@/lib/creator-record/customer-flow/service'
import { EVIDENCE_MAX_REQUEST_BYTES } from '@/lib/creator-record/evidence-intake/contract'
import { checkEvidenceGate, uploadEvidence, type EvidenceDeps } from '@/lib/creator-record/evidence-intake/service'
import { MAX_BODY_BYTES } from '@/lib/creator-record/prototype/parse-form-state'
import { readLimitedText } from '@/lib/creator-record/public-uat/read-limited'
import { evidenceError, invalidRequest, readLimitedBytes } from '@/lib/creator-record-flow/evidence-http'
import { examinationError, examinationRequestBody } from '@/lib/creator-record-flow/examination-customer'
import { NO_STORE, respond } from '@/lib/creator-record-flow/http'

/** A size-limited JSON body, then the prepare flow. */
export async function handlePrepareRequest(request: Request, userId: string, deps: () => FlowDeps): Promise<NextResponse> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'The request could not be read.', code: 'invalid_request' }, { status: 400, headers: NO_STORE })
  }
  const read = await readLimitedText(request.body, MAX_BODY_BYTES)
  if (!read.ok) return NextResponse.json({ error: 'The request could not be read.', code: 'invalid_request' }, { status: read.status, headers: NO_STORE })
  let body: unknown
  try {
    body = JSON.parse(read.text)
  } catch {
    return NextResponse.json({ error: 'The request could not be read.', code: 'invalid_request' }, { status: 400, headers: NO_STORE })
  }
  return respond(await preparePrepared(deps(), userId, body))
}

/** The gate first, then a size-limited multipart body with exactly `file` and `consent`, then the intake. */
export async function handleEvidenceUpload(request: Request, userId: string, deps: EvidenceDeps): Promise<NextResponse> {
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
}

/**
 * The gate first, then a body that is empty or carries only the creator's AI-examination permission (Decision 8Q), then one
 * examination of the user's own document.
 */
export async function handleExaminationRequest(request: Request, userId: string, documentId: string, deps: CustomerExaminationDeps): Promise<NextResponse> {
  const gated = await checkCustomerExaminationGate(deps, userId)
  if (gated) return examinationError(gated)
  const body = await examinationRequestBody(request)
  if (!body.ok) return examinationError({ status: 400, code: 'invalid_request' })
  const r = await requestCustomerExamination(deps, userId, documentId, { aiPermission: body.aiPermission })
  return r.ok ? NextResponse.json({ examination: { run_id: r.run_id, result: r.result } }, { status: 200, headers: NO_STORE }) : examinationError(r)
}
