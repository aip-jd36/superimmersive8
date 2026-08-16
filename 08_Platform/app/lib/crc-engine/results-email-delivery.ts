/**
 * Results-email delivery orchestration (CRC Results Gate milestone,
 * 2026-08-14, PM-revised). The single place that sequences: lead
 * persistence (required, blocks send on failure) -> atomic send claim ->
 * recompute the already-completed result (pure, no model call) -> send via
 * Resend (awaited) -> record the outcome.
 *
 * DB-failure policy (PM revision, non-negotiable):
 *   - lead upsert/link failure -> the send never happens at all, Resend is
 *     never called, the caller gets an honest retryable error.
 *   - Resend confirms acceptance, then the outcome-recording write fails ->
 *     the user still sees "sent" (Resend already did its job); the
 *     inconsistency is logged loudly via logPilotEvent for reconciliation,
 *     never silently swallowed and never turned into a false failure
 *     message.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { runCRCConversation } from './run-crc-conversation'
import type { MatrixRow, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import { buildResultsEmailContent } from './results-email-template'
import { sendCrcResultsEmail } from '@/lib/emails'
import { upsertCrcLead, linkSessionToLead, normalizeEmail } from './crc-leads'
import { saveCrcSessionEmail } from './supabase-session-store'
import { maskEmail, type ResultsEmailClaimReason } from './results-gate-copy'
import { logPilotEvent } from './pilot-events'
import { CRC_CONFIG } from './config'

export type DeliveryResult =
  | { kind: 'sent'; maskedEmail: string }
  | { kind: 'already_sent'; maskedEmail: string }
  | { kind: 'blocked'; reason: ResultsEmailClaimReason }
  | { kind: 'lead_persistence_failed' }
  | { kind: 'send_failed' }
  | { kind: 'send_unknown' }

export interface DeliverParams {
  sessionId: string
  email: string
  isExplicitResend: boolean
  structuredUnderstanding: StructuredUnderstanding
  matrix: MatrixRow[]
  /**
   * CRC Living Knowledge Phase 1, 2026-08-16. Optional, defaulted to `[]`
   * -- required so a session whose completed result included a topic-claim
   * goal_interpretation still gets that same content in its results email
   * (the email recomputes the result via the same runCRCConversation()
   * call; omitting topicClaims here would silently produce an
   * incomplete/wrong email, a real regression this parameter prevents).
   */
  topicClaims?: TopicClaim[]
  /**
   * Governed Topic Relationships orchestrator-wiring follow-up,
   * 2026-08-16. Same discipline and same reasoning as `topicClaims`
   * immediately above -- required so the email recomputation stays in sync
   * with whatever the interactive/finalization path produced, never
   * relationship-unaware while the browser path is relationship-aware (or
   * vice versa).
   */
  relationships?: TopicRelationship[]
  attributionToken: string | null | undefined
}

export async function deliverCrcResultsEmail(client: SupabaseClient, params: DeliverParams): Promise<DeliveryResult> {
  const emailNormalized = normalizeEmail(params.email)

  // ── Required identity persistence -- blocks the send entirely on failure ──
  let leadId: string
  try {
    const lead = await upsertCrcLead(client, params.email)
    leadId = lead.leadId
    await linkSessionToLead(client, params.sessionId, leadId)
    // Same three columns this product has always written on email capture
    // (email/email_captured_at/identity_source) -- unchanged shape, reused
    // as-is, just triggered from this new point in the flow instead of the
    // retired mid-conversation gate.
    await saveCrcSessionEmail(client, params.sessionId, params.email)
    await client
      .from('crc_sessions')
      .update({ capture_notice_version: CRC_CONFIG.captureNoticeVersion })
      .eq('id', params.sessionId)
  } catch (err) {
    console.error('[results-email-delivery] lead persistence failed, send blocked', err)
    return { kind: 'lead_persistence_failed' }
  }

  // ── Atomic send-ownership claim (see claim_crc_result_send in the migration) ──
  const { data: claimRows, error: claimError } = await client.rpc('claim_crc_result_send', {
    p_session_id: params.sessionId,
    p_email_normalized: emailNormalized,
    p_is_explicit_resend: params.isExplicitResend,
    p_cooldown_seconds: CRC_CONFIG.resultsEmailResendCooldownSeconds,
    p_max_explicit_resends: CRC_CONFIG.resultsEmailMaxExplicitResends,
    p_max_distinct_recipients: CRC_CONFIG.resultsEmailMaxDistinctRecipients,
  })
  if (claimError) {
    console.error('[results-email-delivery] claim_crc_result_send query failed, send blocked', claimError)
    return { kind: 'lead_persistence_failed' }
  }
  const claim = (claimRows as { claimed: boolean; reason: string | null }[])[0]
  if (!claim.claimed) {
    if (claim.reason === 'already_sent') {
      return { kind: 'already_sent', maskedEmail: maskEmail(params.email) }
    }
    return { kind: 'blocked', reason: claim.reason as ResultsEmailClaimReason }
  }

  // ── Recompute the already-completed result -- pure, no model call, same
  // function GET already uses for a completed session. ──
  const result = runCRCConversation(params.structuredUnderstanding, params.matrix, params.topicClaims ?? [], params.relationships ?? [])
  const { html, text } = buildResultsEmailContent(result.output, params.attributionToken, params.email)

  const outcome = await sendCrcResultsEmail(params.email, 'Your Commercial Readiness Check results', html, text)

  const now = new Date().toISOString()
  const dbStatus = outcome.status === 'accepted' ? 'accepted' : outcome.status === 'failed' ? 'failed' : 'unknown'
  const { error: recordError } = await client.rpc('record_crc_result_send_outcome', {
    p_session_id: params.sessionId,
    p_email_normalized: emailNormalized,
    p_status: dbStatus,
    p_accepted_at: now,
    p_template_version: CRC_CONFIG.resultsEmailTemplateVersion,
  })
  if (recordError) {
    // Per the approved DB-failure policy: if Resend already accepted the
    // message, this persistence failure must NOT change what the user is
    // told. Logged loudly so it's diagnosable/reconcilable, never silent.
    console.error('[results-email-delivery] record_crc_result_send_outcome failed after send', recordError)
    await logPilotEvent(client, {
      session_id: params.sessionId,
      event_type: 'persistence_error',
      detail: `results_email_outcome_record_failed:${outcome.status}`,
    })
  }

  if (outcome.status === 'accepted') {
    return { kind: 'sent', maskedEmail: maskEmail(params.email) }
  }
  if (outcome.status === 'failed') {
    return { kind: 'send_failed' }
  }
  return { kind: 'send_unknown' }
}
