/**
 * CRC <-> Assurance association core -- domain contract (CAH-3D).
 *
 * Implements the CAH-3C.1 semantic association contract and NOTHING beyond it:
 * the durable representation of an authenticated Assurance submission owner's
 * deliberate claim that a completed CRC work product relates to their
 * submission.
 *
 * This module (and this whole directory) MUST NOT:
 *   - implement candidate discovery (email match / cookie / reference / token);
 *   - implement any customer / reviewer / Sales / admin route or UI;
 *   - import lib/crc-sales/*, a Bounded Interpretation constructor,
 *     Projection/Composition builders, or Assurance reviewer/outcome logic;
 *   - call runCRCConversation (no current-LK / current-BI recomputation here);
 *   - branch on any provider / tool / topic / Living-Knowledge domain.
 * Enforced structurally by __tests__/crc-assurance-handoff/boundaries.test.ts.
 *
 * ── Authority (CAH-3C.1 §C, P2/P3) ──
 *
 * An association is a fresh, attributable C1 assertion by an identified actor.
 * It is NOT proof that the actor historically created, controlled, participated
 * in, or owned the CRC session -- CRC has no authenticated identity and
 * crc_sessions.email is unverified. No type or field here is named
 * `ownership_*` / `verified_crc_owner` / `crc_owner`. The "how was this
 * permitted" fact is `authorization_basis` -- a PERMISSION fact only.
 */

// ── Authorization basis (CAH-3C.1 §H, CAH-3D §6, CAH-3D.1) ────────────────

/**
 * KNOWN / DESCRIBED semantic input classes for how a real association-
 * authorization capability could permit a creation. Every member names a
 * concrete future capability -- an actual mechanism a later reviewed milestone
 * would build and enable:
 *
 *   - authenticated_email_candidate_confirmation  (Variant A front door)
 *   - same_browser_session_confirmation
 *   - possession_reference_confirmation
 *   - association_token_confirmation
 *   - delegated_authorization
 *
 * CAH-3D.1: there is NO placeholder / "uninferred" / "internal" member. The
 * CAH-3D `core_internal_uninferred` value was removed -- it let the production
 * service create a real durable association even though NO real association-
 * authorization capability had been implemented. Submission ownership proves
 * "this actor may act on this submission"; it does NOT prove "this actor is
 * authorized to associate this particular CRC work product." An
 * authorization_basis must record HOW that specific action was permitted -- so
 * a basis meaning "no mechanism was established" cannot be production-valid.
 */
export type AuthorizationBasis =
  | 'authenticated_email_candidate_confirmation'
  | 'same_browser_session_confirmation'
  | 'possession_reference_confirmation'
  | 'association_token_confirmation'
  | 'delegated_authorization'

/**
 * The syntactic vocabulary the DB CHECK bounds `authorization_basis` to. Being
 * KNOWN means the string is a recognised future capability name -- NOT that it
 * currently authorizes anything.
 */
export const KNOWN_AUTHORIZATION_BASES: ReadonlySet<AuthorizationBasis> = new Set<AuthorizationBasis>([
  'authenticated_email_candidate_confirmation',
  'same_browser_session_confirmation',
  'possession_reference_confirmation',
  'association_token_confirmation',
  'delegated_authorization',
])

export function isKnownAuthorizationBasis(v: unknown): v is AuthorizationBasis {
  return typeof v === 'string' && KNOWN_AUTHORIZATION_BASES.has(v as AuthorizationBasis)
}

/**
 * The bases whose corresponding authorization CAPABILITY has actually been
 * implemented and enabled. CAH-3D / CAH-3D.1 implement ZERO real-world
 * capabilities -- so this set is EMPTY, and the production association service
 * cannot create any association today, for any basis (CAH-3D.1 §1).
 *
 * A member is added here ONLY by the milestone that builds and reviews the
 * corresponding capability -- never as a convenience, never for testability
 * (see `AuthorizationPolicy` for the test seam), never via env var / NODE_ENV.
 * A structural test asserts this set is initialised empty.
 */
export const CURRENTLY_ENABLED_AUTHORIZATION_BASES: ReadonlySet<AuthorizationBasis> = new Set<AuthorizationBasis>([])

// ── Association record ────────────────────────────────────────────────────

export type AssociationStatus = 'active' | 'removed'

export interface CrcAssuranceAssociation {
  /** Association identity (CAH-3C.1 P6). */
  id: string
  /** CRC work-product reference. */
  crc_session_id: string
  /** Assurance submission reference. */
  submission_id: string
  /** Authenticated actor who made the deliberate association claim. */
  associated_by: string
  /** When the claim was made (SB2). */
  associated_at: string
  /** HOW the product permitted the action -- a permission fact, never ownership. */
  authorization_basis: AuthorizationBasis
  status: AssociationStatus
  removed_at: string | null
  removed_by: string | null
  /** Canonical-form digest of the persisted StructuredUnderstanding at association time (SB3). */
  crc_state_fingerprint: string
  /** Canonicalization contract version that produced the fingerprint (fails comparison closed across versions). */
  crc_state_canon_version: string
  /** SB5 weak temporal anchor -- the CRC session's runtime_commit at association time. Never mixed into the fingerprint. */
  crc_session_runtime_commit: string | null
  created_at: string
  updated_at: string
}

// ── Create ───────────────────────────────────────────────────────────────

export interface CreateAssociationInput {
  /** Authenticated actor id (public.users.id / auth.users.id). Supplied by a trusted caller. */
  actorUserId: string
  /** Target Assurance submission. */
  submissionId: string
  /** CRC session to associate. */
  crcSessionId: string
  /**
   * Which concrete authorization capability permitted this action. Must be a
   * KNOWN basis AND currently ENABLED (via the injected `AuthorizationPolicy`)
   * or the create fails closed. Today no basis is enabled -> no create
   * succeeds (CAH-3D.1 §1).
   */
  authorizationBasis: AuthorizationBasis
}

export type CreateAssociationResult =
  | { ok: true; association: CrcAssuranceAssociation }
  | {
      ok: false
      code:
        | 'unknown_authorization_basis'
        | 'authorization_basis_not_enabled'
        | 'submission_not_found'
        | 'not_submission_owner'
        | 'crc_session_not_found'
        | 'crc_session_not_completed'
        | 'crc_state_unreadable'
        | 'duplicate_active'
        | 'reference_not_found'
        | 'persistence_failed'
    }

// ── Remove ───────────────────────────────────────────────────────────────

export interface RemoveAssociationInput {
  actorUserId: string
  associationId: string
}

export type RemoveAssociationResult =
  | { ok: true; association: CrcAssuranceAssociation }
  | {
      ok: false
      code: 'association_not_found' | 'not_active' | 'not_submission_owner' | 'persistence_failed'
    }

// ── State comparison (SB4) ───────────────────────────────────────────────

/**
 * Neutral only. 'changed' / 'unchanged' carry NO materiality, risk, or
 * readiness meaning -- whether a difference matters is a human judgement under
 * the Assurance methodology, made elsewhere. 'comparison_unavailable' is the
 * fail-closed result when the stored and current canonicalization versions
 * differ (never a false 'unchanged').
 */
export type CrcStateComparison = 'unchanged' | 'changed' | 'comparison_unavailable'
