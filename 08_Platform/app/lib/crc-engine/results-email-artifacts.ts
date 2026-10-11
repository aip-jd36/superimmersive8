/**
 * Durable exact results-email provenance (CRC-OUTBOUND-ARTIFACT-1B,
 * 2026-10-11), implementing the architecture CRC-OUTBOUND-ARTIFACT-1A
 * established by reading the real, current delivery pipeline
 * (results-email-delivery.ts) and finding that the exact rendered
 * {subject, html, text} triple handed to the email provider was never
 * durably persisted -- only session-level delivery STATUS
 * (crc_sessions.results_email_*) survived.
 *
 * Two concepts, two tables (1A decision C):
 *   - ARTIFACT (crc_results_email_artifacts): "what exactly did SI8
 *     generate?" -- the immutable customer-facing content, created exactly
 *     once per generated email, never updated after insert. There is no
 *     update helper for artifact content anywhere in this module, by
 *     design -- immutability is enforced entirely at the application layer
 *     (no code path writes to subject/html/text/content_hash a second
 *     time), the same discipline the existing CRC-PILOT-OBS-3 trace
 *     table already uses for its own append-only rows (that table also
 *     carries no update helper).
 *   - DELIVERY ATTEMPT (crc_results_email_delivery_attempts): "what
 *     happened when SI8 attempted to deliver that artifact?" -- one row
 *     per actual Resend API call, always created (if at all) strictly
 *     after its artifact already exists (artifact_id is a required FK).
 *
 * GOVERNING INVARIANT (1A decision E, non-negotiable): if the artifact
 * cannot be durably persisted, the provider is never called. This mirrors
 * the already-existing, already-shipped lead-persistence-blocks-send
 * policy in results-email-delivery.ts -- not a new paradigm, an extension
 * of one already in production.
 *
 * RETRY DECISION (explicit deviation from the "preferred" architecture in
 * the governing 1B prompt, Section 15/Y -- documented here and in the
 * CRC-OUTBOUND-ARTIFACT-1B Final Report): this milestone generates a NEW
 * artifact for every regenerated send -- first send, an ordinary retry
 * after failed/unknown, AND an explicit resend all produce their own fresh
 * artifact, never a reused one. The "preferred" alternative (reuse the
 * same artifact + a second delivery attempt for an ordinary retry of
 * otherwise-unchanged content) was evaluated and rejected for 1B
 * specifically because claim_crc_result_send's own return contract
 * (`{claimed, reason}`) does not currently distinguish "this is a retry of
 * previously-failed content" from "this is a genuine first send" -- the
 * ONLY way to tell them apart today is to inspect crc_sessions.results_
 * email_status before claiming, which is itself a material change to the
 * claim sequencing the governing prompt explicitly says must trigger a
 * HOLD rather than be implemented speculatively. Generating a fresh
 * artifact every time sidesteps that distinction entirely while still
 * satisfying the actual product requirement (every provider call has an
 * exact, durable, immutable record of what was sent) -- it is safety- and
 * provenance-preserving, merely not the most storage-efficient shape.
 * `previous_artifact_id` still gives full lineage across every regenerated
 * send regardless of which trigger produced it.
 *
 * Content hash: SHA-256 over `JSON.stringify({subject, html, text})` --
 * the same createHash('sha256').update(canonical, 'utf8') pattern already
 * used elsewhere in this codebase (lib/crc-assurance-handoff/state-
 * binding.ts, lib/interview-engine/extraction.ts) for exactly this
 * "canonical JSON, not ad hoc string concatenation" discipline. A fixed,
 * flat, three-key object literal with string values has no key-ordering
 * or field-boundary ambiguity under JSON.stringify. This is integrity/
 * debugging metadata only -- never a signature, certification, or legal
 * attestation; no signing/key infrastructure is introduced.
 *
 * attempt_number is hardcoded to 1 here, not computed from a count query:
 * under the retry decision above, a newly-created artifact has by
 * construction never had a prior attempt, so its first (and, under this
 * milestone, only) delivery attempt is always attempt 1. The sibling
 * migration's own UNIQUE (artifact_id, attempt_number) constraint remains
 * as defense-in-depth, ready for a future same-artifact-retry milestone
 * that would need attempt_number to actually increment.
 */

import { randomUUID, createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRuntimeCommit } from './runtime-metadata'

export interface ResultsEmailContent {
  subject: string
  html: string
  text: string
}

/**
 * Pure. Called both by createResultsEmailArtifact (to persist the hash)
 * and by tests (to prove the persisted hash matches the exact persisted
 * content) -- exported deliberately so no second computation of "the
 * canonical form" can ever drift from this one.
 */
export function computeResultsEmailContentHash(content: ResultsEmailContent): string {
  const canonical = JSON.stringify({ subject: content.subject, html: content.html, text: content.text })
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

export interface CreateResultsEmailArtifactParams {
  crcSessionId: string
  crcLeadId: string | null
  recipientNormalized: string
  content: ResultsEmailContent
  templateVersion: string
  attributionToken: string | null | undefined
  /** The immediately prior artifact for this session, if any -- see this module's own header ("RETRY DECISION") for why this is populated for every regenerated send, not only explicit resend. */
  previousArtifactId: string | null
}

export interface ResultsEmailArtifact {
  id: string
  contentHash: string
  generatedAt: string
}

/**
 * Throws on failure -- same convention as crc-leads.ts's upsertCrcLead:
 * per the governing invariant, an artifact-persistence failure must block
 * the send entirely. The caller (results-email-delivery.ts) is responsible
 * for catching this, ensuring Resend is never called, and restoring the
 * session's already-claimed 'pending' status to an existing retryable
 * state (see that module's own header for the exact mechanism -- reuses
 * record_crc_result_send_outcome, no new state machine).
 *
 * The artifact id is generated here (randomUUID(), the same pattern
 * app/api/crc/turn/route.ts already uses for session tokens and
 * attribution tokens) rather than left to the database's own
 * gen_random_uuid() default, so the caller has the id immediately for the
 * delivery-attempt FK without a second round-trip.
 */
export async function createResultsEmailArtifact(client: SupabaseClient, params: CreateResultsEmailArtifactParams): Promise<ResultsEmailArtifact> {
  const id = randomUUID()
  const generatedAt = new Date().toISOString()
  const contentHash = computeResultsEmailContentHash(params.content)
  const { error } = await client.from('crc_results_email_artifacts').insert({
    id,
    crc_session_id: params.crcSessionId,
    crc_lead_id: params.crcLeadId,
    recipient_normalized: params.recipientNormalized,
    subject: params.content.subject,
    html: params.content.html,
    text: params.content.text,
    content_hash: contentHash,
    template_version: params.templateVersion,
    runtime_commit: getRuntimeCommit(),
    attribution_token: params.attributionToken ?? null,
    generated_at: generatedAt,
    previous_artifact_id: params.previousArtifactId,
  })
  if (error) {
    throw new Error(`[results-email-artifacts] createResultsEmailArtifact failed: ${error.message}`)
  }
  return { id, contentHash, generatedAt }
}

/**
 * Lineage lookup only -- deliberately fail-open (returns null on any
 * error, never throws), unlike createResultsEmailArtifact above. The
 * governing product requirement is "every provider call has an exact
 * durable artifact" -- previous_artifact_id is enrichment describing HOW
 * that artifact relates to an earlier one, not part of the core
 * provenance invariant itself. A transient read failure here must not
 * block an otherwise-healthy send; it simply means this particular
 * artifact's lineage pointer is null, same as a genuine first send.
 */
export async function findMostRecentResultsEmailArtifactId(client: SupabaseClient, crcSessionId: string): Promise<string | null> {
  try {
    const { data, error } = await client
      .from('crc_results_email_artifacts')
      .select('id')
      .eq('crc_session_id', crcSessionId)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error || !data || data.length === 0) return null
    return (data[0] as { id: string }).id
  } catch (err) {
    console.error('[results-email-artifacts] findMostRecentResultsEmailArtifactId failed, proceeding with no lineage', err)
    return null
  }
}

export type ResultsEmailDeliveryOutcome = 'accepted' | 'failed' | 'unknown'

export interface RecordDeliveryAttemptParams {
  artifactId: string
  outcome: ResultsEmailDeliveryOutcome
  providerMessageId: string | null
  errorDetail: string | null
  acceptedAt: string | null
}

/**
 * Never throws -- returns a result object instead. This call happens
 * AFTER Resend has already been invoked (and, for an 'accepted' outcome,
 * after Resend has already confirmed receipt), so a failure here is the
 * exact same external-consistency boundary the existing
 * record_crc_result_send_outcome failure-after-acceptance case already
 * documents and accepts (results-email-delivery.ts): the user must not be
 * told the send failed merely because this local bookkeeping write
 * failed. The caller logs the discrepancy loudly via the existing
 * logPilotEvent('persistence_error', ...) mechanism; this function itself
 * has no opinion on how the failure is surfaced, only on whether the row
 * was written.
 */
export async function recordResultsEmailDeliveryAttempt(
  client: SupabaseClient,
  params: RecordDeliveryAttemptParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client.from('crc_results_email_delivery_attempts').insert({
    artifact_id: params.artifactId,
    attempt_number: 1,
    attempted_at: new Date().toISOString(),
    provider: 'resend',
    provider_message_id: params.providerMessageId,
    outcome: params.outcome,
    error_detail: params.errorDetail,
    accepted_at: params.acceptedAt,
  })
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
