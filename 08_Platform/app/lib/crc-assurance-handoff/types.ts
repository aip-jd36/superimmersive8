/**
 * CRC <-> Assurance association core -- domain contract (CAH-3D, corrected by
 * CAH-3D.1, re-architected by CAH-3E.2).
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
 *
 * ── CAH-3E.2: this module no longer decides authorization at all ──
 *
 * CAH-3D.1 fixed a bypass (a placeholder basis meaning "no mechanism was
 * established" was production-valid) by adding a generic enablement gate
 * (`AuthorizationPolicy` / `CURRENTLY_ENABLED_AUTHORIZATION_BASES`) inside this
 * package. CAH-3E.1 found that gate itself was the wrong shape: it let the
 * generic core "decide" whether an authorization basis was acceptable by
 * checking a caller-suppliable string against a caller-injectable policy --
 * exactly the kind of decision a mechanism-agnostic core must never make.
 * CAH-3E.1's own proposed fix (a portable, Symbol-branded `AuthorizationGrant`)
 * was reviewed and REJECTED: it only moved the same problem one layer down
 * (caller supplies a grant instead of a string). CAH-3E.2 is the accepted
 * design: authorization is established ENTIRELY by a capability module
 * (none exist yet -- e.g. a future same-browser, email, reference, or token
 * capability), which then calls this package's non-authorizing primitive
 * (`createAssociationAfterAuthorization` in service.ts) purely to enforce
 * generic invariants and persist the result. This module therefore no longer
 * has ANY concept of "enabled" -- `CURRENTLY_ENABLED_AUTHORIZATION_BASES` and
 * `AuthorizationPolicy` are removed entirely (not merely emptied). Whether a
 * basis is usable in practice is now a property of whether a real capability
 * module and route exist and call this primitive -- code, not configuration --
 * so there is no set whose membership could ever, by itself, create a usable
 * authorization path.
 */

// ── Authorization basis (CAH-3C.1 §H, CAH-3D §6, CAH-3D.1, CAH-3E.2) ──────

/**
 * KNOWN / DESCRIBED semantic input classes for how a real association-
 * authorization capability could permit a creation. Every member names a
 * concrete future capability -- an actual mechanism a later reviewed milestone
 * would build:
 *
 *   - authenticated_email_candidate_confirmation
 *   - same_browser_session_confirmation
 *   - possession_reference_confirmation
 *   - association_token_confirmation
 *   - delegated_authorization
 *
 * There is NO placeholder / "uninferred" / "internal" member (CAH-3D.1).
 *
 * KNOWN is a syntactic/vocabulary fact only -- "this is a name a real
 * capability might one day use." It is NOT "ENABLED" (that concept no longer
 * exists in this package at all -- see the module header) and it is NOT
 * "AUTHORIZED" (that a real capability actually validated THIS request). This
 * package cannot tell the difference between a basis that is merely KNOWN and
 * one under active, correct use by a genuine capability -- that truth lives
 * entirely in which code, if any, calls `createAssociationAfterAuthorization`
 * with it. See service.ts's own header for the full trust-boundary statement.
 */
export type AuthorizationBasis =
  | 'authenticated_email_candidate_confirmation'
  | 'same_browser_session_confirmation'
  | 'possession_reference_confirmation'
  | 'association_token_confirmation'
  | 'delegated_authorization'

/**
 * The syntactic vocabulary the DB CHECK bounds `authorization_basis` to.
 * Retained ONLY as input-data validity (the same category as validating that
 * `submissionId` looks like a UUID) -- not as an authorization decision. Being
 * KNOWN means the string is a recognised future capability name; it says
 * nothing about whether the corresponding real-world signal was ever checked
 * for this specific request.
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
  /**
   * Authenticated actor id (public.users.id / auth.users.id). Supplied by a
   * trusted caller -- a capability module that has ALREADY authenticated this
   * actor as part of establishing its own authorization signal. This
   * primitive does not authenticate; it only enforces that this actor owns
   * `submissionId` (see service.ts).
   */
  actorUserId: string
  /** Target Assurance submission. */
  submissionId: string
  /**
   * CRC session to associate. Supplied by a trusted caller that has ALREADY
   * derived this from its own validated signal (e.g. a resolved cookie, a
   * confirmed email-matched candidate). This primitive does not discover or
   * validate candidates.
   */
  crcSessionId: string
  /**
   * WHICH concrete authorization capability permitted this action -- PURE
   * PROVENANCE, persisted verbatim. Must be a KNOWN vocabulary name or the
   * create fails closed on data validity (`unknown_authorization_basis`).
   * This primitive does NOT decide whether that capability's real-world
   * signal was actually satisfied for this request -- see service.ts's
   * header. Supplying this field is not itself authorization; it only records
   * which capability's caller this was.
   */
  authorizationBasis: AuthorizationBasis
}

export type CreateAssociationResult =
  | { ok: true; association: CrcAssuranceAssociation }
  | {
      ok: false
      code:
        | 'unknown_authorization_basis'
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
