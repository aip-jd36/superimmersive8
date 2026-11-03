/**
 * CR-V2-EXAM-INTEGRATION-X2 — a creator's examination of ONE of their own stored documents, and its history.
 *
 * Pure apart from the injected ports. Reuses, unchanged: the examination persistence adapter (`examineAndRecord`:
 * the DOC-2B core, replay only; audit event before any byte is read; the database's one write function) and the
 * strict read-back (`readExaminationHistory`: every stored run re-verified, fail closed).
 *
 * Boundaries, in order (each fails closed with a fixed code; nothing internal is returned):
 *   1. the session user (the route) — never a value from the request;
 *   2. the Creator Record v2 submissions stop and the pilot invitation (exactly the evidence-intake gate);
 *   3. the document is the creator's own (another creator's document is indistinguishable from a missing one);
 *   4. the DATABASE decides whether examination is permitted at all: an examination read is accepted only under the
 *      isolated-test marker or an active UAT grant naming this identity and this document (20261105000000 /
 *      20261106000000). With neither — Production today — it is refused and nothing is read.
 * The request carries nothing but the document id: no grant, nonce, envelope, profile, executor or credential is
 * accepted from the browser. Replay only: the production core ports are the committed replay executor and registry.
 *
 * History shows only runs this path can produce (isolated synthetic test, customer-path synthetic UAT). A history
 * containing an operator-seeded run (`operator_synthetic_uat`) is not shown here (unavailable, fail closed): those
 * belong to the operator UAT record, never to a customer view.
 *
 * Examination observations stay observations (`not_verified`): nothing here reaches declarations, guidance, records
 * or PDFs.
 */

import {
  examineAndRecord,
  readExaminationHistory,
  type ExaminationAdapterDeps,
  type PersistedRunRow,
  type VerifiedRun,
} from '../examination/persistence'
import { RECEIPT_READING_PROFILE } from '../examination/receipt-reading'

export type SubmissionsMode = 'open' | 'stopped'

export interface CustomerExaminationDeps {
  /** CREATOR_RECORD_V2_SUBMISSIONS. */
  submissions: SubmissionsMode
  hasPilotAccess(userId: string): Promise<boolean>
  /** The persistence adapter's ports (production: replay-only core). */
  adapter: ExaminationAdapterDeps
  log?(event: string, detail: Record<string, unknown>): void
}

export type CustomerExaminationErrorCode =
  | 'submissions_stopped'
  | 'not_invited'
  | 'not_found'
  | 'not_ready'
  | 'not_examinable'
  | 'examination_not_permitted'
  | 'unavailable'

export type CustomerExaminationError = { ok: false; status: 403 | 404 | 409 | 422 | 503; code: CustomerExaminationErrorCode }

export interface CustomerExaminationRun {
  run_id: string
  supersedes_id: string | null
  created_at: string
  /** The persisted envelope, verbatim, after the strict read-back. Observations are `not_verified`. */
  envelope: VerifiedRun['envelope']
}

/** Only these boundaries may appear in a customer's history. */
export const CUSTOMER_VISIBLE_BOUNDARIES = ['isolated_synthetic_test', 'customer_path_synthetic_uat'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const err = (status: CustomerExaminationError['status'], code: CustomerExaminationErrorCode): CustomerExaminationError => ({ ok: false, status, code })

async function gate(deps: CustomerExaminationDeps, userId: string): Promise<CustomerExaminationError | null> {
  if (deps.submissions !== 'open') return err(503, 'submissions_stopped')
  if (!(await deps.hasPilotAccess(userId))) return err(403, 'not_invited')
  return null
}

/** The gate alone, for a route to apply before reading anything else from the request. */
export const checkCustomerExaminationGate = gate

/** The document exists and is the creator's own; otherwise `not_found` (another creator's document looks missing). */
async function owned(deps: CustomerExaminationDeps, userId: string, documentId: unknown): Promise<{ ok: true; state: string } | CustomerExaminationError> {
  if (typeof documentId !== 'string' || !UUID.test(documentId)) return err(404, 'not_found')
  let doc
  try {
    doc = await deps.adapter.storage.getDocument(documentId)
  } catch {
    return err(503, 'unavailable')
  }
  if (!doc || doc.user_id !== userId) return err(404, 'not_found')
  return { ok: true, state: doc.state }
}

/** Request one examination of the creator's own stored document. Idempotent: the same document and profile converge. */
export async function requestCustomerExamination(
  deps: CustomerExaminationDeps,
  userId: string,
  documentId: unknown,
): Promise<{ ok: true; run_id: string; result: 'created' | 'existing' } | CustomerExaminationError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  const doc = await owned(deps, userId, documentId)
  if (!doc.ok) return doc
  if (doc.state !== 'stored') return err(409, 'not_ready')

  const r = await examineAndRecord(deps.adapter, {
    actor_user_id: userId,
    document_id: documentId as string,
    profile: { id: RECEIPT_READING_PROFILE.id, version: RECEIPT_READING_PROFILE.version },
  })
  switch (r.kind) {
    case 'recorded':
      return { ok: true, run_id: r.run_id, result: r.result }
    case 'refused':
      deps.log?.('creator_record_v2_examination_refused', { stage: r.refusal.stage, code: r.refusal.code })
      // The core's own request / owner checks: never reveal which.
      if (r.refusal.stage === 'request' || r.refusal.code === 'not_owner' || r.refusal.code === 'document_not_found') return err(404, 'not_found')
      if (r.refusal.code === 'document_not_stored') return err(409, 'not_ready')
      // Server-side configuration or storage (profile, executor, object): not the creator's document.
      if (r.refusal.stage === 'profile' || r.refusal.stage === 'executor' || r.refusal.code === 'object_unavailable') return err(503, 'unavailable')
      // Integrity or content (not a known synthetic fixture, no recording, unsupported type).
      return err(422, 'not_examinable')
    case 'not_read':
      deps.log?.('creator_record_v2_examination_not_read', { reason: r.reason })
      return r.reason === 'audit_unavailable' ? err(503, 'unavailable') : err(409, 'examination_not_permitted')
    case 'unavailable':
      deps.log?.('creator_record_v2_examination_unavailable', { stage: r.stage })
      return err(503, 'unavailable')
    case 'not_recorded':
      deps.log?.('creator_record_v2_examination_not_recorded', { reason: r.reason })
      return r.reason === 'persistence_unavailable' ? err(503, 'unavailable') : err(409, 'examination_not_permitted')
  }
}

/** The creator's own document's examination history, every run re-verified. */
export async function customerExaminationHistory(
  deps: CustomerExaminationDeps,
  userId: string,
  documentId: unknown,
): Promise<{ ok: true; runs: CustomerExaminationRun[] } | CustomerExaminationError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  const doc = await owned(deps, userId, documentId)
  if (!doc.ok) return doc

  const visible = {
    async listRuns(owner: string, id: string): Promise<PersistedRunRow[]> {
      const rows = await deps.adapter.storage.listRuns(owner, id)
      if (rows.some((row) => !(CUSTOMER_VISIBLE_BOUNDARIES as readonly string[]).includes(row.execution_boundary))) throw new Error('boundary_not_customer_visible')
      return rows
    },
  }
  const h = await readExaminationHistory(visible, userId, documentId as string)
  if (h.kind !== 'verified') {
    deps.log?.('creator_record_v2_examination_history_unavailable', { reason: h.reason })
    return err(503, 'unavailable')
  }
  return { ok: true, runs: h.runs.map((r) => ({ run_id: r.run_id, supersedes_id: r.supersedes_id, created_at: r.created_at, envelope: r.envelope })) }
}
