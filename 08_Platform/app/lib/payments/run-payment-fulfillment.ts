/**
 * CAA-SECURITY-3B — run (or resume) fulfillment for one accepted payment.
 *
 * Contract:
 *   - Nothing happens without a claim (lease + fencing token from the DB).
 *   - PDF before email. An existing Creator Record PDF (rights_packages row
 *     with a document_url) is completion evidence and is never regenerated;
 *     success after generation is proven by re-reading that evidence, not by
 *     the generator's return value.
 *   - Email is marked 'sending' BEFORE the provider call. accepted → recorded
 *     with the provider id; definite rejection → 'failed' (retried later);
 *     anything ambiguous → 'unknown' (never resent automatically).
 *   - Creator Record steps require the submission to still be an approved
 *     Creator Record; the Certified "received" email requires the submission
 *     to still be awaiting review. Payment never approves anything here.
 *   - Transitions into the manual queue raise one admin alert.
 *
 * Dependencies are injected so the runner is unit-testable; see
 * fulfillment-deps.ts for the production wiring.
 */
import type { ClaimResult, FulfillmentSubmission } from './repository'
import type { PaymentEmailOutcome } from './email-outcome'

export interface FulfillmentDeps {
  claim(sessionId: string): Promise<ClaimResult>
  markStep(sessionId: string, token: string, step: 'pdf' | 'email', status: string,
           providerId?: string | null, errorText?: string | null): Promise<boolean>
  finish(sessionId: string, token: string, errorText: string | null): Promise<string>
  loadSubmission(submissionId: string): Promise<FulfillmentSubmission | null>
  hasCreatorRecordPdf(submissionId: string): Promise<boolean>
  generateCreatorRecordPdf(submission: FulfillmentSubmission): Promise<void>
  loadUserContact(userId: string): Promise<{ name: string | null; email: string | null } | null>
  sendCreatorRecordEmail(p: { creatorName: string; filmTitle: string; dashboardUrl: string; to: string }): Promise<PaymentEmailOutcome>
  sendCertifiedReceivedEmail(p: { creatorName: string; filmTitle: string; dashboardUrl: string; to: string }): Promise<PaymentEmailOutcome>
  notifyAdmin(p: { tier: string; filmTitle: string; creatorName: string; creatorEmail: string }): Promise<void>
  alert(subject: string, fields: Record<string, string | number | null | undefined>): Promise<void>
  siteUrl: string
}

export type FulfillmentRunStatus =
  | 'completed' | 'failed' | 'needs_reconciliation' | 'not_claimed' | 'fenced' | 'error'

export interface FulfillmentRunResult {
  sessionId: string
  status: FulfillmentRunStatus
  reason: string
}

/** Claim reasons that mean the row has just moved into the manual queue. */
export const CLAIM_REASONS_REQUIRING_ALERT: ReadonlySet<string> = new Set([
  'email_outcome_unknown', 'attempts_exhausted', 'retry_window_expired',
])

const CERTIFIED_TIERS = new Set(['certified', 'si8_certified'])
const AWAITING_REVIEW = new Set(['pending', 'under_review'])

class Fenced extends Error {}

export async function runPaymentFulfillment(sessionId: string, deps: FulfillmentDeps): Promise<FulfillmentRunResult> {
  const claim = await deps.claim(sessionId)
  if (!claim.claimed || !claim.claimToken) {
    if (CLAIM_REASONS_REQUIRING_ALERT.has(claim.reason)) {
      await deps.alert('Fulfillment needs reconciliation', {
        session: sessionId, submission: claim.submissionId, reason: claim.reason,
      })
    }
    return { sessionId, status: 'not_claimed', reason: claim.reason }
  }
  const token = claim.claimToken
  const mark = async (step: 'pdf' | 'email', status: string, providerId: string | null = null, err: string | null = null) => {
    const ok = await deps.markStep(sessionId, token, step, status, providerId, err)
    if (!ok) throw new Fenced(`${step}->${status}`)
  }

  let lastError: string | null = null
  try {
    const sub = claim.submissionId ? await deps.loadSubmission(claim.submissionId) : null
    let pdfStatus = claim.pdfStatus

    // ---- PDF (Creator Record only) ----
    if (pdfStatus === 'pending') {
      if (!sub || sub.tier !== 'creator_record' || sub.status !== 'approved') {
        await mark('pdf', 'not_required', null, sub ? 'pdf_not_applicable:submission_not_approved_creator_record' : 'pdf_not_applicable:submission_missing')
        pdfStatus = 'not_required'
      } else if (await deps.hasCreatorRecordPdf(sub.id)) {
        await mark('pdf', 'completed')
        pdfStatus = 'completed'
      } else {
        try {
          await deps.generateCreatorRecordPdf(sub)
        } catch (err) {
          lastError = `pdf_generation_error:${err instanceof Error ? err.message : String(err)}`
        }
        if (await deps.hasCreatorRecordPdf(sub.id)) {
          await mark('pdf', 'completed')
          pdfStatus = 'completed'
        } else {
          lastError = lastError ?? 'pdf_generation_failed'
        }
      }
    }

    // ---- Email (only after the PDF step is settled) ----
    const emailStatus = claim.emailStatus
    if (pdfStatus !== 'pending' && (emailStatus === 'pending' || emailStatus === 'failed')) {
      const isCreatorRecord = sub?.tier === 'creator_record'
      const eligible = !!sub && (
        isCreatorRecord ? sub.status === 'approved'
          : CERTIFIED_TIERS.has(sub.tier ?? '') && AWAITING_REVIEW.has(sub.status ?? '')
      )
      const contact = eligible && sub ? await deps.loadUserContact(sub.user_id) : null
      if (!eligible || !sub) {
        await mark('email', 'not_required', null, 'email_not_applicable:submission_state')
      } else if (!contact?.email) {
        await mark('email', 'not_required', null, 'email_not_applicable:no_recipient')
        await deps.alert('Payment fulfillment email had no recipient', { session: sessionId, submission: sub.id })
      } else {
        const params = {
          creatorName: contact.name || 'Creator',
          filmTitle: sub.title || 'your submission',
          dashboardUrl: isCreatorRecord
            ? `${deps.siteUrl}/dashboard/submissions/${sub.id}`
            : `${deps.siteUrl}/dashboard`,
          to: contact.email,
        }
        await mark('email', 'sending')
        const outcome = isCreatorRecord
          ? await deps.sendCreatorRecordEmail(params)
          : await deps.sendCertifiedReceivedEmail(params)
        if (outcome.status === 'accepted') {
          await mark('email', 'accepted', outcome.providerId)
          await deps.notifyAdmin({ tier: sub.tier ?? '', filmTitle: params.filmTitle, creatorName: params.creatorName, creatorEmail: contact.email })
        } else if (outcome.status === 'failed') {
          lastError = `email_rejected:${outcome.code}`
          await mark('email', 'failed', null, lastError)
        } else {
          lastError = `email_outcome_unknown:${outcome.reason}`
          await mark('email', 'unknown', null, lastError)
        }
      }
    }
  } catch (err) {
    if (err instanceof Fenced) {
      return { sessionId, status: 'fenced', reason: err.message }
    }
    lastError = `fulfillment_error:${err instanceof Error ? err.message : String(err)}`
    console.error('❌ Payment fulfillment error', { sessionId, error: lastError })
  }

  let finalStatus: string
  try {
    finalStatus = await deps.finish(sessionId, token, lastError)
  } catch (err) {
    // Lease expiry returns the row to the retry pool; nothing is lost.
    console.error('❌ Payment fulfillment finish error', { sessionId, error: String(err) })
    return { sessionId, status: 'error', reason: 'finish_failed' }
  }
  if (finalStatus === 'not_owner') return { sessionId, status: 'fenced', reason: 'finish_not_owner' }
  if (finalStatus === 'needs_reconciliation') {
    await deps.alert('Fulfillment needs reconciliation', {
      session: sessionId, submission: claim.submissionId, reason: lastError ?? 'needs_reconciliation',
    })
  }
  return {
    sessionId,
    status: finalStatus === 'completed' || finalStatus === 'failed' || finalStatus === 'needs_reconciliation'
      ? finalStatus : 'error',
    reason: lastError ?? finalStatus,
  }
}
