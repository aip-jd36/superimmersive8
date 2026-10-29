/**
 * CAA-SECURITY-3B — service-role access to the payment ledger.
 *
 * Every ledger state transition goes through a database function
 * (supabase/migrations/20261021000000_payment_fulfillments.sql); this module
 * never writes payment_fulfillments directly. Database errors are thrown as
 * PaymentLedgerError so callers fail closed.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { CheckoutSessionFacts } from './stripe-session-facts'

export class PaymentLedgerError extends Error {
  constructor(operation: string, public readonly code?: string) {
    super(`payment ledger ${operation} failed${code ? ` (${code})` : ''}`)
    this.name = 'PaymentLedgerError'
  }
}

export const FULFILLMENT_LEASE_SECONDS = 300
export const FULFILLMENT_MAX_ATTEMPTS = 6
export const FULFILLMENT_RETRY_WINDOW_SECONDS = 7 * 24 * 3600

export type LedgerOutcome = 'accepted' | 'duplicate_payment' | 'rejected'

export interface RecordPaymentResult {
  outcome: LedgerOutcome
  reason: string
  isNew: boolean
  fulfillmentStatus: string
  tier: string | null
  submissionId: string | null
}

export interface ClaimResult {
  claimed: boolean
  claimToken: string | null
  reason: string
  submissionId: string | null
  tier: string | null
  pdfStatus: string | null
  emailStatus: string | null
}

export type ReconcileAction = 'retry_fulfillment' | 'authorize_email_resend' | 'close_unknown_email' | 'resolve_anomaly'
export const RECONCILE_ACTIONS: readonly ReconcileAction[] = [
  'retry_fulfillment', 'authorize_email_resend', 'close_unknown_email', 'resolve_anomaly',
]

export interface FulfillmentSubmission {
  id: string
  user_id: string
  tier: string | null
  status: string | null
  title: string | null
  filmmaker_name: string | null
  tools_used: unknown
  authorship_statement: string | null
  likeness_confirmation: unknown
  ip_confirmation: unknown
  territory_preferences: string | null
  /** CR-PDF-DECLARATIONS-1: as recorded. Optional so an older caller degrades to "not recorded", never to a declaration. */
  custodian_declaration?: boolean | null
  indemnification_confirmed?: boolean | null
}

const firstRow = (data: unknown) => (Array.isArray(data) ? data[0] : data) as Record<string, any> | undefined

export async function getListPriceCents(tier: string | null): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc('payment_list_price_cents', { p_tier: tier })
  if (error) throw new PaymentLedgerError('price lookup', error.code)
  return typeof data === 'number' ? data : null
}

export async function recordCheckoutPayment(f: CheckoutSessionFacts): Promise<RecordPaymentResult> {
  const { data, error } = await supabaseAdmin.rpc('record_checkout_payment', {
    p_session_id: f.sessionId,
    p_event_id: f.eventId,
    p_client_reference_id: f.clientReferenceId,
    p_session_created_epoch: f.sessionCreatedEpoch,
    p_session_status: f.sessionStatus,
    p_mode: f.mode,
    p_payment_status: f.paymentStatus,
    p_payment_intent_id: f.paymentIntentId,
    p_currency: f.currency,
    p_amount_subtotal: f.amountSubtotal,
    p_amount_total: f.amountTotal,
    p_amount_discount: f.amountDiscount,
    p_amount_tax: f.amountTax,
    p_amount_shipping: f.amountShipping,
  })
  const row = firstRow(data)
  if (error || !row) throw new PaymentLedgerError('record', error?.code)
  return {
    outcome: row.out_outcome,
    reason: row.out_reason,
    isNew: row.out_is_new === true,
    fulfillmentStatus: row.out_fulfillment_status,
    tier: row.out_tier ?? null,
    submissionId: row.out_submission_id ?? null,
  }
}

export async function claimFulfillment(sessionId: string): Promise<ClaimResult> {
  const { data, error } = await supabaseAdmin.rpc('claim_payment_fulfillment', {
    p_session_id: sessionId,
    p_lease_seconds: FULFILLMENT_LEASE_SECONDS,
    p_max_attempts: FULFILLMENT_MAX_ATTEMPTS,
    p_retry_window_seconds: FULFILLMENT_RETRY_WINDOW_SECONDS,
  })
  const row = firstRow(data)
  if (error || !row) throw new PaymentLedgerError('claim', error?.code)
  return {
    claimed: row.out_claimed === true,
    claimToken: row.out_claim_token ?? null,
    reason: row.out_reason,
    submissionId: row.out_submission_id ?? null,
    tier: row.out_tier ?? null,
    pdfStatus: row.out_pdf_status ?? null,
    emailStatus: row.out_email_status ?? null,
  }
}

export async function markFulfillmentStep(
  sessionId: string, claimToken: string, step: 'pdf' | 'email', status: string,
  providerId: string | null = null, errorText: string | null = null,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('mark_payment_fulfillment_step', {
    p_session_id: sessionId, p_claim_token: claimToken, p_step: step, p_status: status,
    p_provider_id: providerId, p_error: errorText,
  })
  if (error) throw new PaymentLedgerError('mark step', error.code)
  return data === true
}

export async function finishFulfillment(sessionId: string, claimToken: string, errorText: string | null): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('finish_payment_fulfillment', {
    p_session_id: sessionId, p_claim_token: claimToken, p_error: errorText,
  })
  if (error || typeof data !== 'string') throw new PaymentLedgerError('finish', error?.code)
  return data
}

export async function reconcileFulfillment(sessionId: string, action: ReconcileAction, actorId: string, note: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('reconcile_payment_fulfillment', {
    p_session_id: sessionId, p_action: action, p_actor_id: actorId, p_note: note,
  })
  if (error || typeof data !== 'string') throw new PaymentLedgerError('reconcile', error?.code)
  return data
}

/** Automatic-retry candidates. No age cutoff: the claim decides eligibility. */
export async function listRetryCandidates(limit: number, nowIso: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_fulfillments')
    .select('stripe_checkout_session_id')
    .or(`fulfillment_status.in.(pending,failed),and(fulfillment_status.eq.in_progress,claimed_until.lt."${nowIso}")`)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new PaymentLedgerError('list retry candidates', error.code)
  return (data ?? []).map((r: any) => r.stripe_checkout_session_id as string)
}

export const ATTENTION_FILTER = 'anomaly_status.eq.open,fulfillment_status.in.(needs_reconciliation,failed)'

/** Durable manual reconciliation queue — never filtered by age. */
export async function countAttention(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('payment_fulfillments')
    .select('stripe_checkout_session_id', { count: 'exact', head: true })
    .or(ATTENTION_FILTER)
  if (error) throw new PaymentLedgerError('count attention', error.code)
  return count ?? 0
}

export async function listAttention(limit: number): Promise<Record<string, any>[]> {
  const { data, error } = await supabaseAdmin
    .from('payment_fulfillments')
    .select('stripe_checkout_session_id, submission_ref, submission_id, session_binding, tier, expected_amount, amount_subtotal, amount_total, currency, stripe_payment_status, outcome, outcome_reason, anomaly_status, fulfillment_status, pdf_status, email_status, email_provider_id, attempts, last_error, last_attempt_at, reconciliation_log, created_at')
    .or(ATTENTION_FILTER)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new PaymentLedgerError('list attention', error.code)
  return data ?? []
}

export async function loadFulfillmentSubmission(submissionId: string): Promise<FulfillmentSubmission | null> {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id, user_id, tier, status, title, filmmaker_name, tools_used, authorship_statement, likeness_confirmation, ip_confirmation, territory_preferences, custodian_declaration, indemnification_confirmed')
    .eq('id', submissionId)
    .maybeSingle()
  if (error) throw new PaymentLedgerError('load submission', error.code)
  return (data as FulfillmentSubmission | null) ?? null
}

/** Real evidence that the Creator Record PDF exists (rights_packages is UNIQUE per submission). */
export async function hasCreatorRecordPdf(submissionId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('rights_packages')
    .select('id, document_url')
    .eq('submission_id', submissionId)
    .maybeSingle()
  if (error) throw new PaymentLedgerError('check pdf', error.code)
  return !!(data && (data as any).document_url)
}

export async function loadUserContact(userId: string): Promise<{ name: string | null; email: string | null } | null> {
  const { data, error } = await supabaseAdmin.from('users').select('name, email').eq('id', userId).maybeSingle()
  if (error) throw new PaymentLedgerError('load user', error.code)
  return (data as any) ?? null
}
