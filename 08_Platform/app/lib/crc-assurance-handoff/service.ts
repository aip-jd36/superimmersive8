/**
 * CRC <-> Assurance association -- NON-AUTHORIZING invariant/persistence
 * primitive (CAH-3D, corrected CAH-3D.1, re-architected CAH-3E.2).
 *
 * ── Semantic contract (CAH-3E.2) ──
 *
 * "The caller has already established whatever capability-specific
 *  authorization the product requires. This function does NOT establish or
 *  prove that authorization. It independently enforces the generic association
 *  invariants, binds the CRC state, and persists / atomically audits the
 *  resulting association and its authorization provenance."
 *
 * `createAssociationAfterAuthorization` is INTERNAL server-side infrastructure.
 * It is deliberately NOT part of `index.ts`'s public package surface: there is
 * no longer any generic, product-facing "give me an authorization basis and
 * I'll decide whether you are authorized" entry point (CAH-3E.2 §9). A future
 * reviewed capability module -- and only such a module -- imports this seam
 * directly and calls it AFTER it has:
 *   - validated its own mechanism-specific signal (a resolved cookie, a
 *     confirmed email-matched candidate, a redeemed token, ...);
 *   - authenticated the acting Assurance user;
 *   - derived the authoritative actor id and CRC session id from that signal
 *     (never from client-supplied request fields);
 *   - received the customer's deliberate association act;
 * and it passes its OWN fixed `authorizationBasis` constant (never a
 * parameter it received from anywhere else).
 *
 * ── Trust boundary (honest statement, CAH-3E.2 §X) ──
 *
 * Module visibility, naming and structural tests are ARCHITECTURE HYGIENE and
 * code-review signal -- NOT a security boundary. Any code already running with
 * the application's server-side / service_role privileges could import this
 * seam directly, or call the Supabase RPC directly, or write to the tables
 * directly; none of that is prevented here and none is claimed to be. The
 * database's service_role-only grant remains the actual high-trust persistence
 * boundary. What this design DOES achieve: the normal, product-facing
 * architecture encodes authorization ownership correctly (each capability owns
 * its own establishment + its own fixed provenance), and any route that
 * reached this primitive with client-controlled actor/session/basis would be a
 * glaring, code-review-catchable architecture violation -- not the intended
 * API.
 *
 * Every failure is fail-closed: no association is created / removed.
 */

import { COMPLETION_REASONS, type CompletionReason } from '@/types/interview-engine'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import { isKnownAuthorizationBasis } from './types'
import type {
  CreateAssociationInput,
  CreateAssociationResult,
  RemoveAssociationInput,
  RemoveAssociationResult,
} from './types'
import { computeCrcStateIdentity } from './state-binding'
import {
  getSubmissionOwner,
  getCrcSessionForAssociation,
  createAssociationAtomic,
  removeAssociationAtomic,
} from './repository'

/**
 * A CRC session is eligible for association only if the Interview Engine
 * genuinely concluded the conversation -- `completion_reason` is one of the
 * five governed `COMPLETION_REASONS`. `product_stop_reason` is NEVER read
 * here: an email-decline (retired) or an anti-abuse turn ceiling is not a
 * customer-completed CRC (CAH-3B Correction 1, restated for CAH-3D §29 test 14).
 * This is the single canonical definition of "genuinely completed" -- it must
 * never be reimplemented per-capability (CAH-3E.2 §B).
 */
const GOVERNED_COMPLETION_REASONS: ReadonlySet<CompletionReason> = new Set(
  COMPLETION_REASONS as readonly CompletionReason[],
)

function completionReasonOf(raw: unknown): { ok: true; value: CompletionReason } | { ok: false } {
  try {
    const su = deserializeStructuredUnderstanding(JSON.stringify(raw)) as StructuredUnderstanding
    return { ok: true, value: su.completion_reason }
  } catch {
    return { ok: false }
  }
}

/**
 * NON-AUTHORIZING. See module header. Enforces generic invariants, binds CRC
 * state, persists + atomically audits. Does NOT decide whether the upstream
 * capability's real-world authorization signal was satisfied.
 */
export async function createAssociationAfterAuthorization(
  input: CreateAssociationInput,
): Promise<CreateAssociationResult> {
  // 1. Data validity only (NOT an authorization decision): the basis string
  //    must be recognised vocabulary, matching the DB CHECK. KNOWN != ENABLED
  //    != AUTHORIZED -- see types.ts.
  if (!isKnownAuthorizationBasis(input.authorizationBasis)) {
    return { ok: false, code: 'unknown_authorization_basis' }
  }

  try {
    // 2. GENERIC: submission must exist AND be owned by the acting user.
    //    Applies identically to every authorization capability -- enforced
    //    here, once, authoritatively; never delegated to a front door.
    const owner = await getSubmissionOwner(input.submissionId)
    if (owner === null) return { ok: false, code: 'submission_not_found' }
    if (owner !== input.actorUserId) return { ok: false, code: 'not_submission_owner' }

    // 3. GENERIC: CRC session must exist.
    const session = await getCrcSessionForAssociation(input.crcSessionId)
    if (session === null) return { ok: false, code: 'crc_session_not_found' }

    // 4. GENERIC: CRC session must be genuinely completed (governed
    //    completion_reason only; product_stop_reason is never read). The
    //    single source of truth for "is this CRC actually done."
    const cr = completionReasonOf(session.structured_understanding)
    if (!cr.ok) return { ok: false, code: 'crc_state_unreadable' }
    if (cr.value === null || !GOVERNED_COMPLETION_REASONS.has(cr.value)) {
      return { ok: false, code: 'crc_session_not_completed' }
    }

    // 5. GENERIC: capture state binding (SB3) from the PERSISTED project state.
    let identity
    try {
      identity = computeCrcStateIdentity(session.structured_understanding)
    } catch {
      return { ok: false, code: 'crc_state_unreadable' }
    }

    // 6. GENERIC: atomic create + required 'association_created' audit
    //    (one transaction); duplicate-active-pair / cardinality enforced by
    //    the DB.
    const res = await createAssociationAtomic({
      crcSessionId: input.crcSessionId,
      submissionId: input.submissionId,
      actorUserId: input.actorUserId,
      authorizationBasis: input.authorizationBasis,
      fingerprint: identity.fingerprint,
      canonVersion: identity.canonicalization_version,
      runtimeCommit: session.runtime_commit,
    })
    if (!res.ok) {
      switch (res.reason) {
        case 'not_submission_owner':
          return { ok: false, code: 'not_submission_owner' }
        case 'duplicate_active':
          return { ok: false, code: 'duplicate_active' }
        case 'reference_not_found':
          return { ok: false, code: 'reference_not_found' }
        default:
          return { ok: false, code: 'persistence_failed' }
      }
    }
    return { ok: true, association: res.association }
  } catch {
    // Any DB/read failure -> no association is claimed.
    return { ok: false, code: 'persistence_failed' }
  }
}

/**
 * Removal is, and remains, independent of creation authorization (CAH-3E.2
 * §T): it requires only that the acting user owns the associated submission.
 * No basis, no capability, no original browser / cookie / email is required or
 * referenced.
 */
export async function removeCrcAssuranceAssociation(
  input: RemoveAssociationInput,
): Promise<RemoveAssociationResult> {
  try {
    // Ownership of the associated submission is enforced inside the atomic
    // Postgres function (it holds the row lock), so there is no separate
    // pre-check to race here.
    const res = await removeAssociationAtomic(input.associationId, input.actorUserId)
    if (!res.ok) {
      switch (res.reason) {
        case 'association_not_found':
          return { ok: false, code: 'association_not_found' }
        case 'not_active':
          return { ok: false, code: 'not_active' }
        case 'not_submission_owner':
          return { ok: false, code: 'not_submission_owner' }
        default:
          return { ok: false, code: 'persistence_failed' }
      }
    }
    return { ok: true, association: res.association }
  } catch {
    return { ok: false, code: 'persistence_failed' }
  }
}
