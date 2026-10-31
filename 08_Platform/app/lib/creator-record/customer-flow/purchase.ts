/**
 * CR-V2-MVP-M3 — Creator Record v2 purchase and issuance rules.
 *
 * PURE apart from the injected ports; unit-tested with fakes. Production wiring:
 * `lib/creator-record-flow/production.ts`.
 *
 * Purchase (two server steps, both fail closed):
 *   1. `startPurchase` — the creator's reviewed version becomes a submission. The
 *      database function binds it atomically and idempotently (one submission per
 *      reviewed version; the digest this server just verified must be the stored one;
 *      a superseded version is refused).
 *   2. `checkV2Checkout` — run by the existing checkout route for a v2 submission
 *      BEFORE any Stripe call: the submission's bound version must still verify,
 *      belong to the session user, be the draft's latest version and be eligible
 *      under the current governance state.
 *   Both refuse while v2 issuance is stopped, new submissions are stopped, the
 *   creator is not invited, or any governed approval is unavailable — nothing is
 *   sold that could not be issued.
 *
 * Issuance (`renderV2ForIssuance`, the v2 renderer's body):
 *   The persisted v2 identity, the bound version (owner, review state, SHA-256) and
 *   current governance eligibility are re-checked, then the PDF is rendered from the
 *   stored record exactly as prepared. A later correction does NOT stop issuance of
 *   the version that was paid for. Any failure throws `V2IssuanceRefusal`: nothing is
 *   rendered or stored and the fulfilment step stays incomplete (retried, then the
 *   manual reconciliation queue). There is no fallback to any other renderer.
 */

import { evaluateIssuanceEligibility, type GovernanceSnapshot, type IssuanceEligibility } from '../customer-record/eligibility'
import type { CustomerDocumentInput } from '../customer-pdf/document-model'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import { verifiedRecord, type PreparedRow, type SubmissionsMode } from './service'

export type V2IssuanceMode = 'stopped' | 'enabled'

export type BindReason = 'created' | 'existing' | 'not_found' | 'not_reviewed' | 'digest_mismatch' | 'superseded'

export interface PurchaseDeps {
  submissions: SubmissionsMode
  issuance: V2IssuanceMode
  hasPilotAccess(userId: string): Promise<boolean>
  getPrepared(id: string): Promise<PreparedRow | null>
  latestVersion(draftId: string): Promise<PreparedRow | null>
  /** The version bound to a submission, or null. */
  boundTo(submissionId: string): Promise<PreparedRow | null>
  /** `create_creator_record_v2_submission`: atomic, idempotent. */
  bind(p: { preparedId: string; userId: string; sha256: string }): Promise<{ submissionId: string | null; reason: BindReason }>
  governance(issuanceDate: string): GovernanceSnapshot
  now(): Date
  log?(event: string, detail: Record<string, unknown>): void
}

export type PurchaseError =
  | { ok: false; status: 403; code: 'not_invited' }
  | { ok: false; status: 404; code: 'not_found' }
  | { ok: false; status: 409; code: 'not_reviewed' | 'superseded' | 'ineligible' }
  | { ok: false; status: 500; code: 'integrity_failure' }
  | { ok: false; status: 503; code: 'submissions_stopped' | 'issuance_stopped' | 'unavailable' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type WithoutOk<T> = T extends unknown ? Omit<T, 'ok'> : never
const err = (e: WithoutOk<PurchaseError>): PurchaseError => ({ ok: false, ...e }) as PurchaseError

async function gate(deps: PurchaseDeps, userId: string): Promise<PurchaseError | null> {
  if (deps.issuance !== 'enabled') return err({ status: 503, code: 'issuance_stopped' })
  if (deps.submissions !== 'open') return err({ status: 503, code: 'submissions_stopped' })
  if (!(await deps.hasPilotAccess(userId))) return err({ status: 403, code: 'not_invited' })
  return null
}

const today = (d: Date) => d.toISOString().slice(0, 10)

/** Eligibility of a stored version now. Definitive refusals and anything undecidable both refuse. */
function eligibilityError(e: IssuanceEligibility): PurchaseError | null {
  if (e.decision === 'eligible') return null
  if (e.decision === 'invalid_record') return err({ status: 500, code: 'integrity_failure' })
  if (e.decision === 'ineligible') return err({ status: 409, code: 'ineligible' })
  return err({ status: 503, code: 'unavailable' })
}

/** Checks shared by both steps: owner, integrity, reviewed, latest, eligible now. */
async function purchasable(deps: PurchaseDeps, userId: string, row: PreparedRow | null): Promise<PurchaseError | null> {
  if (!row || row.user_id !== userId) return err({ status: 404, code: 'not_found' })
  if (!verifiedRecord(row)) {
    deps.log?.('creator_record_v2_integrity_failure', { prepared_id: row.id })
    return err({ status: 500, code: 'integrity_failure' })
  }
  if (row.status !== 'reviewed') return err({ status: 409, code: 'not_reviewed' })
  const latest = await deps.latestVersion(row.draft_id)
  if (!latest || latest.id !== row.id) return err({ status: 409, code: 'superseded' })
  const eligibility = evaluateIssuanceEligibility(row.canonical, row.sha256, deps.governance(today(deps.now())))
  const refused = eligibilityError(eligibility)
  if (refused) deps.log?.('creator_record_v2_purchase_refused', { prepared_id: row.id, decision: eligibility.decision })
  return refused
}

/** Step 1: the creator's reviewed version becomes (or already is) a submission. `id` is untrusted. */
export async function startPurchase(deps: PurchaseDeps, userId: string, id: unknown): Promise<{ ok: true; submission_id: string } | PurchaseError> {
  const gated = await gate(deps, userId)
  if (gated) return gated
  if (typeof id !== 'string' || !UUID.test(id)) return err({ status: 404, code: 'not_found' })
  const row = await deps.getPrepared(id)
  const refused = await purchasable(deps, userId, row)
  if (refused || !row) return refused ?? err({ status: 404, code: 'not_found' })

  const bound = await deps.bind({ preparedId: row.id, userId, sha256: row.sha256 })
  switch (bound.reason) {
    case 'created':
    case 'existing':
      if (!bound.submissionId || !UUID.test(bound.submissionId)) throw new Error('creator_record_v2_bind_without_submission')
      return { ok: true, submission_id: bound.submissionId }
    case 'not_found':
      return err({ status: 404, code: 'not_found' })
    case 'not_reviewed':
      return err({ status: 409, code: 'not_reviewed' })
    case 'superseded':
      return err({ status: 409, code: 'superseded' })
    case 'digest_mismatch':
      deps.log?.('creator_record_v2_integrity_failure', { prepared_id: row.id, at: 'bind' })
      return err({ status: 500, code: 'integrity_failure' })
    default:
      throw new Error('creator_record_v2_bind_unknown_reason')
  }
}

export interface CheckoutSubmission {
  id: string
  user_id: string
  tier: string | null
  creator_record_product: string | null
}

/** Step 2: may this v2 submission be checked out now? Returns the bound record's digest. */
export async function checkV2Checkout(deps: PurchaseDeps, userId: string, sub: CheckoutSubmission): Promise<{ ok: true; sha256: string; record_ref: string } | PurchaseError> {
  if (sub.creator_record_product !== 'v2' || sub.tier !== 'creator_record' || sub.user_id !== userId) return err({ status: 404, code: 'not_found' })
  const gated = await gate(deps, userId)
  if (gated) return gated
  const row = await deps.boundTo(sub.id)
  if (row && row.submission_id !== sub.id) return err({ status: 500, code: 'integrity_failure' })
  const refused = await purchasable(deps, userId, row)
  if (refused || !row) return refused ?? err({ status: 404, code: 'not_found' })
  return { ok: true, sha256: row.sha256, record_ref: row.record_ref }
}

// ── Issuance ──

export const V2_ISSUANCE_REFUSALS = [
  'not_v2_submission',
  'record_unbound',
  'binding_mismatch',
  'record_not_reviewed',
  'record_integrity',
  'governance_ineligible',
  'governance_indeterminate',
] as const
export type V2IssuanceRefusalCode = (typeof V2_ISSUANCE_REFUSALS)[number]

/** Nothing was rendered or stored. The fulfilment step stays incomplete. */
export class V2IssuanceRefusal extends Error {
  constructor(readonly code: V2IssuanceRefusalCode) {
    super(`creator_record_v2_issuance_refused:${code}`)
  }
}

export interface V2IssuanceDeps {
  boundTo(submissionId: string): Promise<PreparedRow | null>
  governance(issuanceDate: string): GovernanceSnapshot
  templates(): { templates: unknown; approval: PdfTemplateApproval | null }
  /** Renders exactly the given record (the customer PDF builder re-verifies it and the templates). */
  renderPdf(input: CustomerDocumentInput): Promise<Uint8Array>
}

export async function renderV2ForIssuance(deps: V2IssuanceDeps, sub: CheckoutSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array> {
  if (sub.creator_record_product !== 'v2' || sub.tier !== 'creator_record') throw new V2IssuanceRefusal('not_v2_submission')
  const row = await deps.boundTo(sub.id)
  if (!row) throw new V2IssuanceRefusal('record_unbound')
  if (row.submission_id !== sub.id || row.user_id !== sub.user_id) throw new V2IssuanceRefusal('binding_mismatch')
  if (row.status !== 'reviewed') throw new V2IssuanceRefusal('record_not_reviewed')
  if (!verifiedRecord(row)) throw new V2IssuanceRefusal('record_integrity')
  const issuedOn = today(issuedAt)
  const eligibility = evaluateIssuanceEligibility(row.canonical, row.sha256, deps.governance(issuedOn))
  if (eligibility.decision === 'invalid_record') throw new V2IssuanceRefusal('record_integrity')
  if (eligibility.decision === 'ineligible') throw new V2IssuanceRefusal('governance_ineligible')
  if (eligibility.decision !== 'eligible') throw new V2IssuanceRefusal('governance_indeterminate')
  const t = deps.templates()
  return deps.renderPdf({ canonical: row.canonical, sha256: row.sha256, issued: { record_id: recordId, issued_on: issuedOn }, templates: t.templates, template_approval: t.approval })
}
