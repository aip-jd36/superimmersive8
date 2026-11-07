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
 *   stored record exactly as prepared. Any failure throws `V2IssuanceRefusal`: nothing is
 *   rendered or stored and the fulfilment step stays incomplete (retried, then the
 *   manual reconciliation queue). There is no fallback to any other renderer.
 *   CR-V2-MVP-ELIGIBILITY-1: the bound version must still be the draft's latest. A checkout session can stay open while the
 *   creator corrects their answers or governance changes, and the payment is accepted regardless: that payment is recorded
 *   by the ledger, and this refusal sends it to the reconciliation queue instead of issuing a version the creator replaced.
 *   A record already issued is never affected. `authorizeV2Issuance` is run again just before an artifact is marked issued.
 *
 * CR-V2-MVP-M4A — schema 8 records holding document readings:
 *   - every referenced reading is re-checked at checkout and at issuance by its own kind (`ExaminationReference.kind`: a replay run,
 *     or a stored customer live attempt), through `examinationsIntact`; absent, a record with any reading is refused;
 *   - eligibility also needs each reading's method to be commercially supported (`../customer-record/eligibility`);
 *   - the approved PDF templates for the record's OWN schema must be able to render it, checked before checkout (nothing is sold
 *     that could not be issued) and again at issuance and before an artifact is marked issued (`templates_unavailable`).
 *   Payment never implies that an examination succeeded or that anything is cleared: a refusal after payment leaves the payment
 *   recorded and the fulfilment step incomplete, for the existing retry and manual reconciliation queue. No refund is made here.
 */

import { evaluateIssuanceEligibility, type GovernanceSnapshot, type IssuanceEligibility } from '../customer-record/eligibility'
import { buildCustomerDocument, type CustomerDocumentInput } from '../customer-pdf/document-model'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import { verifiedRecord, type PreparedRow, type SubmissionsMode } from './service'
import type { CustomerRecordV2 } from '../customer-record/record'
import type { EvidenceIntegrity } from '../evidence-intake/service'
import type { ExaminationRunReference, RunReferenceIntegrity } from '../examination/projection'

export type V2IssuanceMode = 'stopped' | 'enabled'

/** CR-V2-MVP-M4A: the approved template set for one record schema, as `approvedPdfTemplates(bundle, schema)` selects it. */
export type TemplatesForSchema = (recordSchema: { id: string; version: number }) => { templates: unknown; approval: PdfTemplateApproval | null }

/** CR-V2-MVP-M4A: a referenced reading, with what is needed to find it again: its kind and reading profile. */
export type ExaminationReference = ExaminationRunReference & { kind: 'replay' | 'live'; profile_id: string }

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
  /**
   * CR-V2-DOC-1B: every document the version references is still held intact (`verifyEvidenceIntact`).
   * Absent → a version that references any document cannot be bought (fail closed).
   */
  evidenceIntact?(userId: string, items: readonly EvidenceItem[]): Promise<EvidenceIntegrity>
  /**
   * CR-V2-EXAM-INTEGRATION-X0: every examination run the version references still passes every stored-run check
   * and has the envelope digest the record captured (`verifyReferencedRuns`). Absent → a version that references
   * any examination cannot be bought (fail closed). Never consulted for a record without examinations.
   */
  examinationsIntact?(userId: string, refs: readonly ExaminationReference[]): Promise<RunReferenceIntegrity>
  /**
   * CR-V2-MVP-M4A: the approved templates for a record schema. Checkout refuses unless they can render the version now. Absent →
   * nothing is sold (fail closed).
   */
  templates?: TemplatesForSchema
}

/** The inventory fields the evidence check needs, read from the verified record. */
export type EvidenceItem = { document_id: string; sha256: string; byte_size: number }

/** True only when the record references no document, or every one is held intact. Fail closed. */
async function evidenceHeld(check: ((userId: string, items: readonly EvidenceItem[]) => Promise<EvidenceIntegrity>) | undefined, userId: string, record: CustomerRecordV2): Promise<EvidenceIntegrity> {
  const items = record.documents.items.map((d) => ({ document_id: d.document_id, sha256: d.sha256, byte_size: d.byte_size }))
  if (items.length === 0) return { ok: true }
  if (!check) return { ok: false, reason: 'unavailable' }
  return check(userId, items)
}

/** CR-V2-EXAM-INTEGRATION-X0: true when the record references no examination run, or every one still verifies. Fail closed. */
async function examinationsHeld(check: ((userId: string, refs: readonly ExaminationReference[]) => Promise<RunReferenceIntegrity>) | undefined, userId: string, record: CustomerRecordV2): Promise<RunReferenceIntegrity> {
  const refs: ExaminationReference[] = record.documents.items.flatMap((d) => {
    const e = d.examination
    if (typeof e !== 'object' || e === null) return []
    return [{ run_id: e.run_id, document_id: d.document_id, envelope_sha256: e.envelope_sha256, kind: (e as { execution_boundary: string }).execution_boundary === 'customer_live_examination' ? 'live' as const : 'replay' as const, profile_id: e.envelope.profile.id }]
  })
  if (refs.length === 0) return { ok: true }
  if (!check) return { ok: false, reason: 'unavailable' }
  try {
    return await check(userId, refs)
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export type PurchaseError =
  | { ok: false; status: 403; code: 'not_invited' }
  | { ok: false; status: 404; code: 'not_found' }
  | { ok: false; status: 409; code: 'not_reviewed' | 'superseded' | 'ineligible' | 'evidence_unavailable' }
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

/** A fixed, well-formed record id for the render check only (never issued, never stored). */
const CHECK_RECORD_ID = 'CR-2000-00000000'

/**
 * CR-V2-MVP-M4A: could this exact version be rendered now, with the approved templates for its own schema? The customer document
 * model is built (pure: no PDF, no I/O) and discarded; any refusal (missing, withdrawn, superseded, mismatched or unapproved
 * templates, or a reading the templates cannot label) is `false`. Fail closed.
 */
function renderable(templates: TemplatesForSchema | undefined, row: PreparedRow, record: CustomerRecordV2, on: string): boolean {
  if (!templates) return false
  try {
    const t = templates({ id: record.schema, version: record.schema_version })
    buildCustomerDocument({ canonical: row.canonical, sha256: row.sha256, issued: { record_id: CHECK_RECORD_ID, issued_on: on }, templates: t.templates, template_approval: t.approval })
    return true
  } catch {
    return false
  }
}

/** Checks shared by both steps: owner, integrity, reviewed, latest, eligible now. */
async function purchasable(deps: PurchaseDeps, userId: string, row: PreparedRow | null): Promise<PurchaseError | null> {
  if (!row || row.user_id !== userId) return err({ status: 404, code: 'not_found' })
  const record = verifiedRecord(row)
  if (!record) {
    deps.log?.('creator_record_v2_integrity_failure', { prepared_id: row.id })
    return err({ status: 500, code: 'integrity_failure' })
  }
  if (row.status !== 'reviewed') return err({ status: 409, code: 'not_reviewed' })
  const latest = await deps.latestVersion(row.draft_id)
  if (!latest || latest.id !== row.id) return err({ status: 409, code: 'superseded' })
  // CR-V2-DOC-1B: never sell a record whose referenced documents SI8 no longer holds intact.
  const held = await evidenceHeld(deps.evidenceIntact?.bind(deps), userId, record)
  if (!held.ok) {
    deps.log?.('creator_record_v2_evidence_unavailable', { prepared_id: row.id, reason: held.reason })
    return err({ status: 409, code: 'evidence_unavailable' })
  }
  // CR-V2-EXAM-INTEGRATION-X0: never sell a record whose referenced examination runs no longer verify.
  const runs = await examinationsHeld(deps.examinationsIntact?.bind(deps), userId, record)
  if (!runs.ok) {
    deps.log?.('creator_record_v2_examination_unavailable', { prepared_id: row.id, reason: runs.reason })
    return err({ status: 409, code: 'evidence_unavailable' })
  }
  const eligibility = evaluateIssuanceEligibility(row.canonical, row.sha256, deps.governance(today(deps.now())))
  const refused = eligibilityError(eligibility)
  if (refused) {
    deps.log?.('creator_record_v2_purchase_refused', { prepared_id: row.id, decision: eligibility.decision })
    return refused
  }
  // CR-V2-MVP-M4A: nothing is sold that the approved templates for its schema could not render.
  if (!renderable(deps.templates, row, record, today(deps.now()))) {
    deps.log?.('creator_record_v2_purchase_refused', { prepared_id: row.id, decision: 'templates_unavailable' })
    return err({ status: 503, code: 'unavailable' })
  }
  return null
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
  'record_superseded',
  'record_integrity',
  'governance_ineligible',
  'governance_indeterminate',
  // CR-V2-DOC-1B: a referenced document is no longer held intact (or could not be checked).
  'evidence_unavailable',
  // CR-V2-MVP-M4A: no approved template set for the record's schema can render it now (missing, withdrawn, mismatched, unapproved).
  'templates_unavailable',
  // CR-V2-MVP-RETENTION-M1A (8N): the creator withdrew AI-processing consent for a referenced document; paused until an explicit
  // customer decision (no such workflow exists yet). The database refuses the artifact as well.
  'consent_withdrawn',
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
  latestVersion(draftId: string): Promise<PreparedRow | null>
  governance(issuanceDate: string): GovernanceSnapshot
  /** CR-V2-MVP-M4A: the approved template set for the record's own schema. */
  templates: TemplatesForSchema
  /** Renders exactly the given record (the customer PDF builder re-verifies it and the templates). */
  renderPdf(input: CustomerDocumentInput): Promise<Uint8Array>
  /** CR-V2-DOC-1B: as for checkout. Absent → a record that references any document is not issued. */
  evidenceIntact?(userId: string, items: readonly EvidenceItem[]): Promise<EvidenceIntegrity>
  /** CR-V2-EXAM-INTEGRATION-X0: as for checkout. Absent → a record that references any examination is not issued. */
  examinationsIntact?(userId: string, refs: readonly ExaminationReference[]): Promise<RunReferenceIntegrity>
}

/** Every condition for issuing now, on the bound version only. Throws `V2IssuanceRefusal`; returns the row it checked. */
export async function authorizeV2Issuance(deps: V2IssuanceDeps, sub: CheckoutSubmission, issuedAt: Date): Promise<PreparedRow> {
  if (sub.creator_record_product !== 'v2' || sub.tier !== 'creator_record') throw new V2IssuanceRefusal('not_v2_submission')
  const row = await deps.boundTo(sub.id)
  if (!row) throw new V2IssuanceRefusal('record_unbound')
  if (row.submission_id !== sub.id || row.user_id !== sub.user_id) throw new V2IssuanceRefusal('binding_mismatch')
  if (row.status !== 'reviewed') throw new V2IssuanceRefusal('record_not_reviewed')
  const latest = await deps.latestVersion(row.draft_id)
  if (!latest || latest.id !== row.id) throw new V2IssuanceRefusal('record_superseded')
  const record = verifiedRecord(row)
  if (!record) throw new V2IssuanceRefusal('record_integrity')
  // CR-V2-DOC-1B: the PDF lists each referenced document; issue only while SI8 still holds every one intact.
  const held = await evidenceHeld(deps.evidenceIntact?.bind(deps), row.user_id, record)
  if (!held.ok) throw new V2IssuanceRefusal(held.reason === 'consent_withdrawn' ? 'consent_withdrawn' : 'evidence_unavailable')
  // CR-V2-EXAM-INTEGRATION-X0: and every referenced examination run still verifies.
  if (!(await examinationsHeld(deps.examinationsIntact?.bind(deps), row.user_id, record)).ok) throw new V2IssuanceRefusal('evidence_unavailable')
  const eligibility = evaluateIssuanceEligibility(row.canonical, row.sha256, deps.governance(today(issuedAt)))
  if (eligibility.decision === 'invalid_record') throw new V2IssuanceRefusal('record_integrity')
  if (eligibility.decision === 'ineligible') throw new V2IssuanceRefusal('governance_ineligible')
  if (eligibility.decision !== 'eligible') throw new V2IssuanceRefusal('governance_indeterminate')
  // CR-V2-MVP-M4A: the approved templates for its schema must still render it (also before a resumed attempt is marked issued).
  if (!renderable(deps.templates, row, record, today(issuedAt))) throw new V2IssuanceRefusal('templates_unavailable')
  return row
}

export async function renderV2ForIssuance(deps: V2IssuanceDeps, sub: CheckoutSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array> {
  const row = await authorizeV2Issuance(deps, sub, issuedAt)
  const record = verifiedRecord(row)
  if (!record) throw new V2IssuanceRefusal('record_integrity')
  const t = deps.templates({ id: record.schema, version: record.schema_version })
  return deps.renderPdf({ canonical: row.canonical, sha256: row.sha256, issued: { record_id: recordId, issued_on: today(issuedAt) }, templates: t.templates, template_approval: t.approval })
}
