/**
 * CR-V2-EXAM-INTEGRATION-X2 — production wiring and HTTP handling for the creator examination route
 * (`app/api/creator-record-v2/evidence/[id]/examination`).
 *
 * The ports are exactly the existing ones: the submissions stop (code constant), the pilot invitation, and the
 * examination persistence ports (`./examination-production`: service role; replay-only core). Nothing here reads,
 * creates or changes a UAT grant or the environment marker: the database alone decides whether an examination read
 * is permitted. Errors carry a fixed code only.
 */
import { NextResponse } from 'next/server'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { examinationProjectionFor, type CustomerExaminationDeps, type CustomerExaminationError } from '@/lib/creator-record/customer-flow/examination'
import type { FlowDeps } from '@/lib/creator-record/customer-flow/service'
import { productionExaminationDeps } from '@/lib/creator-record-flow/examination-production'
import { hasPilotAccess } from './pilot-access'
import { NO_STORE } from './http'

export function productionCustomerExaminationDeps(): CustomerExaminationDeps {
  return {
    submissions: CREATOR_RECORD_V2_SUBMISSIONS,
    hasPilotAccess,
    adapter: productionExaminationDeps(),
    log: (event, detail) => console.warn(`[creator-record-v2/examination] ${event}`, detail),
  }
}

/**
 * CR-V2-EXAM-INTEGRATION-X3: the prepare flow's projection port. The creator's one persisted run for a document they
 * own, re-verified and projected (X0); never a grant, the marker or the status function.
 */
export const productionExaminationProjections: NonNullable<FlowDeps['examinations']> = {
  projectionFor: (userId, documentId) => examinationProjectionFor(productionExaminationDeps().storage, userId, documentId),
}

const MESSAGES: Record<CustomerExaminationError['code'] | 'invalid_request', string> = {
  invalid_request: 'The request could not be read.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  not_invited: 'Creator Record is currently available by invitation only.',
  not_found: 'Not found.',
  not_ready: 'This document is still being added. Try again in a moment.',
  not_examinable: 'This document cannot be examined.',
  examination_not_permitted: 'Document examination is not available for this document.',
  unavailable: 'Document examination is not available right now.',
}

export function examinationError(e: CustomerExaminationError | { status: 400; code: 'invalid_request' }): NextResponse {
  return NextResponse.json({ error: MESSAGES[e.code], code: e.code }, { status: e.status, headers: NO_STORE })
}

/**
 * The examination request carries nothing but the document id (in the path). Its body must be empty or exactly
 * `{}`: any field — a grant, nonce, envelope, profile or credential — is refused, never read.
 */
export async function emptyRequestBody(request: Request, limit = 64): Promise<boolean> {
  if (!request.body) return true
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return false
    }
    chunks.push(value)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return true
  try {
    const v = JSON.parse(text)
    return v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0
  } catch {
    return false
  }
}
