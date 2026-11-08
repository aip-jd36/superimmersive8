/**
 * CR-V2-EXAM-INTEGRATION-X2 — production wiring and HTTP handling for the creator examination route
 * (`app/api/creator-record-v2/evidence/[id]/examination`).
 *
 * The ports are exactly the existing ones: the submissions stop (code constant), the pilot invitation, and the
 * examination persistence ports (`./examination-production`: service role; replay-only core). Nothing here reads,
 * creates or changes a UAT grant or the environment marker: the database alone decides whether an examination read
 * is permitted. Errors carry a fixed code only.
 *
 * CR-V2-MVP-M2A: the customer live examination is wired in ONLY while both code locks are true (`customerLiveEnabledInThisBuild`), and
 * its modules are then loaded on demand. With either lock false — this build — the route and the projection port are exactly the
 * replay path above, and nothing live is loaded.
 */
import { NextResponse } from 'next/server'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { AiPermissionRefusal, examinationProjectionFor, verifyReferencedReadings, type AiPermissionRefusalCode, type CustomerExaminationDeps, type CustomerExaminationError, type ReferencedReading } from '@/lib/creator-record/customer-flow/examination'
import type { FlowDeps } from '@/lib/creator-record/customer-flow/service'
import { productionExaminationDeps } from '@/lib/creator-record-flow/examination-production'
import { aiExaminationPermissionVersion } from './authorization-versions'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { customerLiveEnabledInThisBuild, customerLiveOffered } from './live-offer'
import { hasPilotAccess } from './pilot-access'
import { NO_STORE } from './http'

// Both code locks (`customerLiveEnabledInThisBuild`), and the offer of a NEW live examination (`customerLiveOffered`: the locks
// AND the approved privacy notice and terms) — CR-V2-MVP-LAUNCH-FOUNDATION-1, `./live-offer`.
export { customerLiveEnabledInThisBuild, customerLiveOffered }

/** The fixed refusals of `creator_record_v2_grant_ai_examination_permission` (20261112000000). */
const AI_PERMISSION_REFUSALS: Readonly<Record<string, AiPermissionRefusalCode>> = {
  creator_record_v2_ai_permission_withdrawn: 'withdrawn',
  creator_record_v2_retention_not_found: 'not_found',
  creator_record_v2_ai_permission_invalid: 'invalid',
}

/**
 * Decision 8Q: the owner's explicit, versioned permission for one document, recorded in the database before a live examination.
 * CR-V2-SCHEMA8-PATH-1 (E6/E7): `version` is the CURRENT identifier (wording + approved policy versions), computed per request; the
 * database also requires it to be the version currently authorized there (20261113000000).
 */
const productionAiPermission = (version: string): NonNullable<CustomerExaminationDeps['aiPermission']> => ({
  version,
  async grant(userId, documentId, version) {
    const { data, error } = await supabaseAdmin.rpc('creator_record_v2_grant_ai_examination_permission', { p_user_id: userId, p_document_id: documentId, p_permission_version: version })
    const known = error && error.code === 'P0001' && typeof error.message === 'string' ? AI_PERMISSION_REFUSALS[error.message] : undefined
    if (known) throw new AiPermissionRefusal(known)
    if (error || (data !== 'granted' && data !== 'existing')) throw new Error('creator_record_ai_permission_unavailable')
    return data as 'granted' | 'existing'
  },
})

/** The customer live port: the reviewed production ports, the committed fixture registry and the real executor. No other composition. */
const productionCustomerLive: NonNullable<CustomerExaminationDeps['live']> = {
  async examine(userId, documentId) {
    const [{ examineCustomerDocumentLive }, { customerLivePorts }, { DEFAULT_REPLAY_TABLE }] = await Promise.all([
      import('@/lib/creator-record/live-examination/customer'),
      import('@/lib/creator-record-flow/customer-live-production'),
      import('@/lib/creator-record/evidence/replay'),
    ])
    return examineCustomerDocumentLive({ ports: customerLivePorts, isKnownSyntheticFixture: (sha256) => DEFAULT_REPLAY_TABLE.has(sha256), now: () => new Date() }, userId, documentId)
  },
}

export function productionCustomerExaminationDeps(): CustomerExaminationDeps {
  // E7: no live examination without a current, policy-bound permission identifier to ask for.
  const permission = aiExaminationPermissionVersion()
  return {
    submissions: CREATOR_RECORD_V2_SUBMISSIONS,
    hasPilotAccess,
    adapter: productionExaminationDeps(),
    log: (event, detail) => console.warn(`[creator-record-v2/examination] ${event}`, detail),
    now: () => new Date(),
    ...(customerLiveOffered() && permission !== null ? { live: productionCustomerLive, aiPermission: productionAiPermission(permission) } : {}),
  }
}

/**
 * CR-V2-EXAM-INTEGRATION-X3: the prepare flow's projection port. The creator's one persisted run for a document they
 * own, re-verified and projected (X0); never a grant, the marker or the status function.
 */
export const productionExaminationProjections: NonNullable<FlowDeps['examinations']> = {
  projectionFor: (userId, documentId) =>
    examinationProjectionFor(
      productionExaminationDeps().storage,
      userId,
      documentId,
      undefined,
      customerLiveEnabledInThisBuild()
        ? { listAttempts: async (owner, id) => (await import('@/lib/creator-record-flow/customer-live-production')).listCustomerLiveAttempts(owner, id, 'receipt') }
        : undefined,
    ),
}

/**
 * CR-V2-MVP-M4A: the purchase and issuance re-check of a record's referenced readings (`verifyReferencedReadings`). Replay runs are
 * read through the existing examination storage port. Model readings are read through the customer live ports, loaded on demand and
 * ONLY while both code locks are true; with either lock false (this build) a record holding a model reading is refused at checkout
 * and at issuance (`unavailable`). Reads only: nothing is examined, reserved or sent.
 */
export function productionReadingsIntact(ownerUserId: string, refs: readonly ReferencedReading[]) {
  return verifyReferencedReadings(
    {
      listRuns: (owner, documentId) => productionExaminationDeps().storage.listRuns(owner, documentId),
      ...(customerLiveEnabledInThisBuild()
        ? { listLiveAttempts: async (owner: string, id: string, profileId: string) => (await import('@/lib/creator-record-flow/customer-live-production')).listCustomerLiveAttempts(owner, id, profileId) }
        : {}),
    },
    ownerUserId,
    refs,
  )
}

const MESSAGES: Record<CustomerExaminationError['code'] | 'invalid_request', string> = {
  invalid_request: 'The request could not be read.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  not_invited: 'Creator Record is currently available by invitation only.',
  not_found: 'Not found.',
  not_ready: 'This document is still being added. Try again in a moment.',
  not_examinable: 'This document cannot be examined.',
  examination_not_permitted: 'Document examination is not available for this document.',
  examination_limit_reached: 'Document examination has reached its limit for now.',
  unavailable: 'Document examination is not available right now.',
  // CR-V2-MVP-LAUNCH-FOUNDATION-1 (8Q). DRAFT wording, not approved.
  ai_permission_required: 'Confirm that SI8 may send this document to an AI model provider to be read before examining it.',
}

export function examinationError(e: CustomerExaminationError | { status: 400; code: 'invalid_request' }): NextResponse {
  return NextResponse.json({ error: MESSAGES[e.code], code: e.code }, { status: e.status, headers: NO_STORE })
}

/**
 * The examination request carries nothing but the document id (in the path). Its body must be empty or exactly
 * `{}`: any field — a grant, nonce, envelope, profile or credential — is refused, never read.
 */
export async function emptyRequestBody(request: Request, limit = 64): Promise<boolean> {
  const r = await examinationRequestBody(request, limit)
  return r.ok && r.aiPermission === null
}

/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 (Decision 8Q): the body is empty, `{}`, or exactly `{ "ai_permission": "<version>" }` — the
 * creator's explicit permission for AI examination of this one document. Nothing else is accepted or read: no grant, nonce,
 * envelope, profile or credential. The version is checked by the examination service against the current permission version.
 */
export async function examinationRequestBody(request: Request, limit = 256): Promise<{ ok: true; aiPermission: string | null } | { ok: false }> {
  if (!request.body) return { ok: true, aiPermission: null }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return { ok: false }
    }
    chunks.push(value)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return { ok: true, aiPermission: null }
  try {
    const v = JSON.parse(text)
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return { ok: false }
    const keys = Object.keys(v)
    if (keys.length === 0) return { ok: true, aiPermission: null }
    if (keys.length === 1 && keys[0] === 'ai_permission' && typeof v.ai_permission === 'string' && v.ai_permission.length >= 1 && v.ai_permission.length <= 120)
      return { ok: true, aiPermission: v.ai_permission }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}
