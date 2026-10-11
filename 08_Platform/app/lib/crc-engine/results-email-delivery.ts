/**
 * Results-email delivery orchestration (CRC Results Gate milestone,
 * 2026-08-14, PM-revised; extended by CRC-OUTBOUND-ARTIFACT-1B,
 * 2026-10-11). The single place that sequences: lead persistence (required,
 * blocks send on failure) -> atomic send claim -> recompute the
 * already-completed result (pure, no model call) -> persist the exact
 * generated artifact (required, blocks send on failure) -> send via Resend
 * (awaited, using the SAME in-memory content just persisted) -> record the
 * delivery attempt -> record the session-summary outcome.
 *
 * DB-failure policy (PM revision, non-negotiable):
 *   - lead upsert/link failure -> the send never happens at all, Resend is
 *     never called, the caller gets an honest retryable error.
 *   - CRC-OUTBOUND-ARTIFACT-1B extends this identically to artifact
 *     persistence: if the exact rendered content cannot be durably
 *     persisted, Resend is never called either -- the session's already-
 *     claimed 'pending' status is restored to 'unknown' (via the existing
 *     record_crc_result_send_outcome RPC, no new state machine) so the
 *     claim can be retried, and the caller gets an honest retryable error.
 *   - Resend confirms acceptance, then the outcome-recording write fails ->
 *     the user still sees "sent" (Resend already did its job); the
 *     inconsistency is logged loudly via logPilotEvent for reconciliation,
 *     never silently swallowed and never turned into a false failure
 *     message. CRC-OUTBOUND-ARTIFACT-1B's delivery-attempt row is written
 *     under the identical policy: a failure to record the attempt after
 *     Resend has already responded never changes what the user is told.
 *
 * CRC-OUTBOUND-ARTIFACT-1B retry decision (see results-email-artifacts.ts's
 * own header for the full reasoning): every successful claim that reaches
 * this point -- first send, ordinary retry after failed/unknown, or
 * explicit resend -- generates and persists a NEW artifact. This milestone
 * does not attempt same-artifact-retry (reusing one artifact across
 * multiple delivery attempts), because distinguishing "retry of unchanged
 * content" from "first send" would require a material change to
 * claim_crc_result_send's own return contract, which is out of this
 * milestone's bounded scope.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { runCRCConversation } from './run-crc-conversation'
import type { MatrixRow, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import { buildResultsEmailContent } from './results-email-template'
import { buildConsultativeRealization } from './consultative-realization-contract'
import { sendCrcResultsEmail } from '@/lib/emails'
import { upsertCrcLead, linkSessionToLead, normalizeEmail } from './crc-leads'
import { saveCrcSessionEmail } from './supabase-session-store'
import { maskEmail, type ResultsEmailClaimReason } from './results-gate-copy'
import { logPilotEvent } from './pilot-events'
import { CRC_CONFIG } from './config'
import { createResultsEmailArtifact, findMostRecentResultsEmailArtifactId, recordResultsEmailDeliveryAttempt } from './results-email-artifacts'

export type DeliveryResult =
  | { kind: 'sent'; maskedEmail: string }
  | { kind: 'already_sent'; maskedEmail: string }
  | { kind: 'blocked'; reason: ResultsEmailClaimReason }
  | { kind: 'lead_persistence_failed' }
  | { kind: 'artifact_persistence_failed' }
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
  // CC-3B: pass the deterministic plan so the email renderer suppresses the
  // duplicate rendering of governed statements already shown inside a goal
  // section. `result.output` is unchanged by CC-3B.
  // M2B: pass the SAME already-computed `result.consultative_notes` -- one
  // realization per turn, never a second one computed here.
  // CC-4C.2B (2026-09-19): also build the shared ConsultativeRealization
  // (CC-4C.2A) from the SAME already-computed `result.plan` / `result.
  // output` / `result.consultative_notes` -- narrowest safe integration
  // point (single production call site of buildResultsEmailContent; see
  // the CC-4C.2B Final Report Part 1 for why this is preferred over adding
  // a field to CRCPipelineResult itself). Pure, zero I/O, computed once,
  // per turn, here. Guarded on `result.plan`/`result.output` -- both are
  // non-optional on the real `CRCPipelineResult` (runCRCConversation always
  // returns them), but `buildResultsEmailContent`'s own `plan`/
  // `consultativeNotes` parameters have been optional since CC-3B/M2B, and
  // this guard preserves that exact same fail-open discipline rather than
  // assuming a shape stronger than the function signature itself commits to.
  const realization = result.plan && result.output ? buildConsultativeRealization(result.plan, result.output, result.consultative_notes ?? []) : undefined
  const { html, text } = buildResultsEmailContent(result.output, params.attributionToken, params.email, result.plan, result.consultative_notes, realization)
  // CRC-OUTBOUND-ARTIFACT-1B: captured once, in one local value, and never
  // recomputed -- this exact object is both what gets persisted below AND
  // what gets handed to sendCrcResultsEmail further down. No second
  // render, no reconstructed subject, no rebuilt CTA URL between
  // persistence and delivery.
  const emailContent = { subject: 'Your Commercial Readiness Check results', html, text }

  // ── CRC-OUTBOUND-ARTIFACT-1B: persist the exact artifact BEFORE any
  // provider call. Lineage lookup is best-effort/fail-open (see that
  // function's own header); artifact creation is fail-closed -- if it
  // throws, Resend must never be called. ──
  const previousArtifactId = await findMostRecentResultsEmailArtifactId(client, params.sessionId)
  let artifactId: string
  try {
    const artifact = await createResultsEmailArtifact(client, {
      crcSessionId: params.sessionId,
      crcLeadId: leadId,
      recipientNormalized: emailNormalized,
      content: emailContent,
      templateVersion: CRC_CONFIG.resultsEmailTemplateVersion,
      attributionToken: params.attributionToken,
      previousArtifactId,
    })
    artifactId = artifact.id
  } catch (err) {
    // Governing invariant (1A decision E): the exact generated content
    // could not be durably persisted, so it must never be handed to
    // Resend. The claim above already moved this session to 'pending' --
    // reusing the existing record_crc_result_send_outcome RPC (no new
    // state machine) restores it to 'unknown', the same free-to-retry
    // state an ambiguous provider response already produces today, so the
    // next request can claim and attempt again rather than being
    // permanently stranded in 'pending'.
    console.error('[results-email-delivery] createResultsEmailArtifact failed, send blocked', err)
    const { error: restoreError } = await client.rpc('record_crc_result_send_outcome', {
      p_session_id: params.sessionId,
      p_email_normalized: emailNormalized,
      p_status: 'unknown',
      p_accepted_at: new Date().toISOString(),
      p_template_version: CRC_CONFIG.resultsEmailTemplateVersion,
    })
    if (restoreError) {
      console.error('[results-email-delivery] failed to restore claim state after artifact persistence failure', restoreError)
    }
    await logPilotEvent(client, {
      session_id: params.sessionId,
      event_type: 'persistence_error',
      detail: 'results_email_artifact_persistence_failed',
    })
    return { kind: 'artifact_persistence_failed' }
  }

  const outcome = await sendCrcResultsEmail(params.email, emailContent.subject, emailContent.html, emailContent.text)

  // ── CRC-OUTBOUND-ARTIFACT-1B: one delivery-attempt row per actual
  // provider call, linked to the artifact just persisted. Same
  // never-change-the-user-facing-result-on-local-failure policy as the
  // existing record_crc_result_send_outcome failure case below. ──
  const attemptRecord = await recordResultsEmailDeliveryAttempt(client, {
    artifactId,
    outcome: outcome.status,
    providerMessageId: outcome.status === 'accepted' ? outcome.providerId : null,
    errorDetail: outcome.status === 'accepted' ? null : outcome.error,
    acceptedAt: outcome.status === 'accepted' ? new Date().toISOString() : null,
  })
  if (!attemptRecord.ok) {
    console.error('[results-email-delivery] recordResultsEmailDeliveryAttempt failed after send', attemptRecord.error)
    await logPilotEvent(client, {
      session_id: params.sessionId,
      event_type: 'persistence_error',
      detail: `results_email_attempt_record_failed:${outcome.status}`,
    })
  }

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
