/**
 * CAH-3F -- Authenticated Email-Correlated CRC Candidate Confirmation.
 *
 * A single association-authorization capability. Its proposition is EXACTLY:
 *
 *   "An authenticated Commercial Assurance customer whose VERIFIED account
 *    email correlates with the UNVERIFIED email attached to a completed CRC
 *    session X has DELIBERATELY requested that X be associated with Assurance
 *    submission Y."
 *
 * It is NOT, and must never be read/named/tested as:
 *   - "the customer historically owned X";
 *   - "the customer historically operated X";
 *   - "the CRC email was verified";
 *   - "the CRC assertions are true";
 *   - "CRC content is Assurance evidence".
 *
 * Email equality establishes CORRELATION only. This capability uses that
 * correlation to (a) discover a candidate and (b) make a MINIMAL, allow-listed
 * pre-association disclosure. It never exposes substantive CRC project state.
 *
 * ── Boundary ──
 *
 * This module OWNS: verified-email correlation, candidate discovery, minimal
 * disclosure shaping, server-side revalidation, the fixed authorization basis,
 * and the conservative V1 cross-submission rule. It DELEGATES everything
 * generic -- submission ownership, CRC existence, governed completion, state
 * binding, cardinality (duplicate-active-pair), persistence, and the atomic
 * audit -- to the merged NON-AUTHORIZING core
 * (`createAssociationAfterAuthorization`). It MUST NOT import Sales, Retrieval,
 * Bounded Interpretation, Projection, Composition, or `runCRCConversation`,
 * and MUST NOT read the `crc_session` cookie (cross-device works through email
 * correlation, never same-browser continuity).
 *
 * The authenticated actor id and verified email are supplied by the trusted
 * customer route AFTER it has authenticated the session; the client never
 * supplies them, `crcSessionId`, or `authorizationBasis`.
 */

import { createHash } from 'crypto'
import { COMPLETION_REASONS, type CompletionReason } from '@/types/interview-engine'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import { normalizeEmail } from '@/lib/crc-engine/crc-leads'
import { createAssociationAfterAuthorization } from '../service'
import {
  getSubmissionOwner,
  findCrcLeadIdByNormalizedEmail,
  listSessionsForCrcLead,
  listActiveAssociationsForCrcSession,
  type CorrelatedCrcSessionRow,
} from '../repository'

/**
 * The fixed basis this capability -- and ONLY this capability -- records. It is
 * a hard-coded constant, never a parameter. It is PURE PROVENANCE: it says
 * "created through the email-correlation capability", not "email match proved
 * anything".
 */
export const EMAIL_CORRELATION_AUTHORIZATION_BASIS = 'authenticated_email_candidate_confirmation' as const

/**
 * The authoritative governed-completion set. Instantiated the same way the
 * association core (service.ts) and the Sales eligibility check
 * (crc-sales/eligibility.ts) do -- from the single canonical `COMPLETION_REASONS`
 * const. A structural test asserts this equals the core's set exactly.
 * `product_stop_reason` is NEVER consulted (an anti-abuse turn ceiling or a
 * retired email-decline is not a customer-completed CRC).
 */
const GOVERNED_COMPLETION_REASONS: ReadonlySet<CompletionReason> = new Set(
  COMPLETION_REASONS as readonly CompletionReason[],
)

function isGovernedCompleted(raw: unknown): boolean {
  try {
    const su = deserializeStructuredUnderstanding(JSON.stringify(raw))
    const r = su.completion_reason
    return r !== null && GOVERNED_COMPLETION_REASONS.has(r)
  } catch {
    return false
  }
}

/**
 * Opaque candidate handle: a NON-SECRET, one-way SHA-256 digest of the CRC
 * session id (same primitive as the core's `crc_state_fingerprint`). It:
 *   - does not expose the raw crc_session UUID;
 *   - cannot be reversed to a UUID;
 *   - cannot be used to enumerate anything (it is only ever computed against
 *     THIS customer's own email-correlated sessions);
 *   - is not a reusable authorization credential -- the POST re-derives the
 *     entire candidate set and re-checks correlation, eligibility, ownership,
 *     and the cross-submission rule before it means anything.
 * No persistence, no server secret, no token framework.
 */
function candidateHandleFor(crcSessionId: string): string {
  return createHash('sha256').update(`cah3f:${crcSessionId}`, 'utf8').digest('hex').slice(0, 24)
}

// ── Discovery (GET) -- MINIMAL allow-listed disclosure ────────────────────

/**
 * The ONLY shape the discovery route may return. No CRC content, no timestamp
 * (PM tightened CAH-3F's proposed coarse-timestamp discriminator away -- there
 * is no non-substantive customer-recognizable discriminator in persisted CRC
 * state), no raw session id, no Sales state, no Retrieval/BI/Projection/
 * Composition. A future field added to any upstream type cannot leak here: the
 * discovery function constructs this object literally, field by field.
 */
export type EmailCorrelatedCandidateDiscovery =
  | { available: true; candidateHandle: string }
  | {
      available: false
      reason:
        | 'no_candidate'
        | 'multiple_candidates_require_stronger_disambiguation'
        | 'candidate_already_associated_elsewhere'
        | 'submission_not_found'
        | 'not_submission_owner'
        | 'lookup_failed'
    }

export interface DiscoverInput {
  /** From the authenticated Assurance session (route-derived, never client). */
  actorUserId: string
  /** From trusted authenticated server state -- the customer's VERIFIED account email. */
  verifiedEmail: string
  /** From the route path -- the submission the customer is viewing. */
  submissionId: string
}

interface EligibleCandidate {
  crcSessionId: string
  handle: string
}

/**
 * Server-side. Returns the exactly-one eligible email-correlated candidate, or
 * a bounded fail-closed reason. Never fabricates, never ranks, never
 * auto-selects among multiple.
 */
async function resolveEligibleCandidates(
  input: DiscoverInput,
): Promise<{ ok: true; candidates: EligibleCandidate[] } | { ok: false; reason: 'submission_not_found' | 'not_submission_owner' | 'lookup_failed' }> {
  try {
    const owner = await getSubmissionOwner(input.submissionId)
    if (owner === null) return { ok: false, reason: 'submission_not_found' }
    if (owner !== input.actorUserId) return { ok: false, reason: 'not_submission_owner' }

    const emailNormalized = normalizeEmail(input.verifiedEmail)
    if (emailNormalized.length === 0) return { ok: true, candidates: [] }

    const leadId = await findCrcLeadIdByNormalizedEmail(emailNormalized)
    if (leadId === null) return { ok: true, candidates: [] }

    const rows: CorrelatedCrcSessionRow[] = await listSessionsForCrcLead(leadId)
    const candidates: EligibleCandidate[] = rows
      // Defence: the query already scopes by lead + email_gate; re-assert the
      // correlation state and apply the authoritative completion filter.
      .filter((r) => r.crc_lead_id === leadId && r.identity_source === 'email_gate' && isGovernedCompleted(r.structured_understanding))
      .map((r) => ({ crcSessionId: r.id, handle: candidateHandleFor(r.id) }))
      // Deterministic order (by handle) -- for stable behaviour only; the
      // capability NEVER picks among >1, it fails closed.
      .sort((a, b) => (a.handle < b.handle ? -1 : a.handle > b.handle ? 1 : 0))

    return { ok: true, candidates }
  } catch {
    return { ok: false, reason: 'lookup_failed' }
  }
}

export async function discoverEmailCorrelatedCandidate(
  input: DiscoverInput,
): Promise<EmailCorrelatedCandidateDiscovery> {
  const res = await resolveEligibleCandidates(input)
  if (!res.ok) return { available: false, reason: res.reason }

  if (res.candidates.length === 0) return { available: false, reason: 'no_candidate' }
  if (res.candidates.length > 1) {
    // No safe, non-substantive, customer-recognizable discriminator exists in
    // persisted CRC state -> fail closed (CAH-3F §10/§11). A stronger future
    // possession-reference capability may handle this case.
    return { available: false, reason: 'multiple_candidates_require_stronger_disambiguation' }
  }

  const only = res.candidates[0]
  try {
    const existing = await listActiveAssociationsForCrcSession(only.crcSessionId)
    const elsewhere = existing.some((a) => a.submission_id !== input.submissionId)
    if (elsewhere) return { available: false, reason: 'candidate_already_associated_elsewhere' }
  } catch {
    return { available: false, reason: 'lookup_failed' }
  }

  return { available: true, candidateHandle: only.handle }
}

// ── Association (POST) -- full server-side revalidation ───────────────────

export type EmailCorrelatedAssociationResult =
  | { ok: true }
  | {
      ok: false
      code:
        | 'submission_not_found'
        | 'not_submission_owner'
        | 'no_candidate'
        | 'multiple_candidates_require_stronger_disambiguation'
        | 'stale_candidate'
        | 'candidate_already_associated_elsewhere'
        | 'candidate_not_completed'
        | 'duplicate_active'
        | 'persistence_failed'
    }

export interface AssociateInput extends DiscoverInput {
  /** The opaque handle the browser is confirming (from a prior discovery response). */
  candidateHandle: string
}

/**
 * Server-side. Does NOT trust discovery-time state: it re-derives the entire
 * eligible candidate set, requires it to be exactly one, requires that one to
 * match the confirmed handle, enforces the V1 cross-submission rule, then
 * invokes the generic non-authorizing core with the FIXED basis. The client
 * never supplies `crcSessionId` or `authorizationBasis`.
 */
export async function associateEmailCorrelatedCandidate(
  input: AssociateInput,
): Promise<EmailCorrelatedAssociationResult> {
  const res = await resolveEligibleCandidates(input)
  if (!res.ok) {
    return { ok: false, code: res.reason === 'lookup_failed' ? 'persistence_failed' : res.reason }
  }

  if (res.candidates.length === 0) return { ok: false, code: 'no_candidate' }
  if (res.candidates.length > 1) return { ok: false, code: 'multiple_candidates_require_stronger_disambiguation' }

  const only = res.candidates[0]
  if (only.handle !== input.candidateHandle) return { ok: false, code: 'stale_candidate' }

  // V1 conservative cross-submission boundary (CAH-3F §12): the DB permits a
  // CRC session to be associated with more than one submission (no global
  // UNIQUE(crc_session_id)); this capability does not. Fail closed.
  let elsewhere: boolean
  try {
    const existing = await listActiveAssociationsForCrcSession(only.crcSessionId)
    elsewhere = existing.some((a) => a.submission_id !== input.submissionId)
  } catch {
    return { ok: false, code: 'persistence_failed' }
  }
  if (elsewhere) return { ok: false, code: 'candidate_already_associated_elsewhere' }

  const core = await createAssociationAfterAuthorization({
    actorUserId: input.actorUserId,
    submissionId: input.submissionId,
    crcSessionId: only.crcSessionId,
    authorizationBasis: EMAIL_CORRELATION_AUTHORIZATION_BASIS,
  })

  if (core.ok) return { ok: true }
  switch (core.code) {
    case 'submission_not_found':
      return { ok: false, code: 'submission_not_found' }
    case 'not_submission_owner':
      return { ok: false, code: 'not_submission_owner' }
    case 'crc_session_not_found':
      // The session vanished between candidate resolution and the core call.
      return { ok: false, code: 'stale_candidate' }
    case 'crc_session_not_completed':
    case 'crc_state_unreadable':
      return { ok: false, code: 'candidate_not_completed' }
    case 'duplicate_active':
      return { ok: false, code: 'duplicate_active' }
    default:
      return { ok: false, code: 'persistence_failed' }
  }
}
