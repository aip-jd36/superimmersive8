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

// ── Authorization basis (CAH-3C.1 §H, CAH-3D §6) ──────────────────────────

/**
 * SEMANTIC INPUT CLASSES for how a (trusted, already-authorized) caller was
 * permitted to create an association. CAH-3D builds NONE of the real-world
 * front doors, so it supports exactly one honestly-labelled value:
 *
 *   'core_internal_uninferred' -- a trusted internal service caller (tests, or
 *   a future deliberate internal backfill). No real-world possession or
 *   identity signal was inferred. Implies NOTHING about historical CRC
 *   ownership.
 *
 * The remaining members are declared for type-completeness of the eventual
 * contract but are NOT accepted by the core service (`isSupportedAuthorizationBasis`
 * returns false) and are NOT in the DB CHECK constraint. Each is unlocked --
 * in this type, in `SUPPORTED_AUTHORIZATION_BASES`, and in the migration's
 * CHECK -- only by the milestone that builds the corresponding front door.
 */
export type AuthorizationBasis =
  | 'core_internal_uninferred'
  | 'authenticated_email_candidate_confirmation'
  | 'same_browser_session_confirmation'
  | 'possession_reference_confirmation'
  | 'association_token_confirmation'
  | 'delegated_authorization'

/**
 * The ONLY authorization bases the CAH-3D core will accept. Anything else --
 * including a future-declared member of `AuthorizationBasis` that no front
 * door has yet been built for -- fails closed.
 */
export const SUPPORTED_AUTHORIZATION_BASES: ReadonlySet<AuthorizationBasis> = new Set<AuthorizationBasis>([
  'core_internal_uninferred',
])

export function isSupportedAuthorizationBasis(v: unknown): v is AuthorizationBasis {
  return typeof v === 'string' && SUPPORTED_AUTHORIZATION_BASES.has(v as AuthorizationBasis)
}

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
  /** How the caller was authorized. Must be in SUPPORTED_AUTHORIZATION_BASES or the create fails closed. */
  authorizationBasis: AuthorizationBasis
}

export type CreateAssociationResult =
  | { ok: true; association: CrcAssuranceAssociation }
  | {
      ok: false
      code:
        | 'unsupported_authorization_basis'
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
