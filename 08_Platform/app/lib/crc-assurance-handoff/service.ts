/**
 * CRC <-> Assurance association -- internal service (CAH-3D §20-§22).
 *
 * INTERNAL ONLY. Not exposed through any public/customer/reviewer/Sales/admin
 * route in this milestone (CAH-3D §27) -- otherwise a caller could simply
 * assert an authorization basis. A trusted caller (tests today; a future
 * front-door milestone tomorrow) supplies:
 *
 *   - the authenticated actor id;
 *   - the target Assurance submission id;
 *   - the CRC session id;
 *   - the authorization_basis (how THAT caller was authorized).
 *
 * This service verifies only the invariants that are independent of the future
 * front door, then delegates the atomic write + required security-critical
 * audit to the repository's Postgres functions. Every failure is fail-closed:
 * no association is created / removed.
 *
 * It deliberately does NOT check email match, cookie possession, reference
 * codes, association tokens, or Sales CONVERTING -- those belong to the future
 * caller / front door (CAH-3D §2, §20).
 *
 * ── CAH-3D.1: authorization is a REQUIRED gate, and nothing is enabled ──
 *
 * Submission ownership proves the actor may act on the submission -- NOT that
 * they are authorized to associate this particular CRC work product. That
 * second permission is `AuthorizationPolicy.isEnabled(basis)`. The production
 * policy enables nothing (`CURRENTLY_ENABLED_AUTHORIZATION_BASES` is empty), so
 * `associateCrcSessionWithSubmission` cannot succeed today for ANY basis. The
 * `policy` parameter defaults to `PRODUCTION_AUTHORIZATION_POLICY`; only
 * unit tests pass an enabling policy, and only to exercise the persistence /
 * ownership / completion / state-binding / audit / duplicate / removal paths.
 */

import { COMPLETION_REASONS, type CompletionReason } from '@/types/interview-engine'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import { isKnownAuthorizationBasis } from './types'
import { PRODUCTION_AUTHORIZATION_POLICY, type AuthorizationPolicy } from './authorization-policy'
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

export async function associateCrcSessionWithSubmission(
  input: CreateAssociationInput,
  policy: AuthorizationPolicy = PRODUCTION_AUTHORIZATION_POLICY,
): Promise<CreateAssociationResult> {
  // 1a. The basis must be a recognised capability name (syntactic).
  if (!isKnownAuthorizationBasis(input.authorizationBasis)) {
    return { ok: false, code: 'unknown_authorization_basis' }
  }
  // 1b. ...and its capability must actually be implemented and enabled.
  //     Production enables nothing -> this rejects every basis today.
  if (!policy.isEnabled(input.authorizationBasis)) {
    return { ok: false, code: 'authorization_basis_not_enabled' }
  }

  try {
    // 2. Submission must exist AND be owned by the acting user.
    const owner = await getSubmissionOwner(input.submissionId)
    if (owner === null) return { ok: false, code: 'submission_not_found' }
    if (owner !== input.actorUserId) return { ok: false, code: 'not_submission_owner' }

    // 3. CRC session must exist.
    const session = await getCrcSessionForAssociation(input.crcSessionId)
    if (session === null) return { ok: false, code: 'crc_session_not_found' }

    // 4. CRC session must be genuinely completed (governed completion_reason only).
    const cr = completionReasonOf(session.structured_understanding)
    if (!cr.ok) return { ok: false, code: 'crc_state_unreadable' }
    if (cr.value === null || !GOVERNED_COMPLETION_REASONS.has(cr.value)) {
      return { ok: false, code: 'crc_session_not_completed' }
    }

    // 5. Capture state binding (SB3) from the PERSISTED project state.
    let identity
    try {
      identity = computeCrcStateIdentity(session.structured_understanding)
    } catch {
      return { ok: false, code: 'crc_state_unreadable' }
    }

    // 6. Atomic create + required 'association_created' audit (one transaction).
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
