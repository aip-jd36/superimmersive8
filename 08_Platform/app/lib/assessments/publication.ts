/**
 * Publication authorization — pure domain (CA-RLK-2g).
 *
 * The single authoritative boundary for whether a Public Assessment Record is
 * publicly visible. Publication is an explicit, audited, deliberate act — never
 * inferred from processing_status = 'DELIVERED' alone, `verification_url`,
 * `is_system_test`, `institutional_status`, report existence, or provenance
 * state.
 *
 * Pure: imports only the `ProcessingStatus` type. Safe for both the server
 * public-record lookup and client admin projection, so both consume ONE rule.
 *
 * Authoritative predicate:
 *   isPubliclyVisible  ⇔  processing_status === 'DELIVERED'
 *                         AND exactly one structurally-valid ACTIVE
 *                             (non-revoked) publication episode exists.
 *
 * Fail closed for: missing episode, malformed episode, unknown
 * publication_basis, >1 active episode, unknown processing status, inconsistent
 * revoke fields.
 */

import type { ProcessingStatus } from '@/types/assessment'

// ── Vocabulary ─────────────────────────────────────────────────────────────

export const PUBLICATION_BASES = ['EXPLICIT_AUTHORIZATION', 'LEGACY_DELIVERED_MIGRATION'] as const
export type PublicationBasis = (typeof PUBLICATION_BASES)[number]

/**
 * A publication episode as needed by projection / the visibility predicate.
 * Mirrors the `assessment_publications` row shape.
 */
export interface PublicationEpisode {
  id: string
  assessment_id: string
  publication_basis: PublicationBasis | string
  recorded_at: string
  published_by: string | null
  revoked_at: string | null
  revoked_by: string | null
  revoked_reason: string | null
}

// ── Structural validity ────────────────────────────────────────────────────

/** A structurally coherent episode (regardless of active/revoked). */
export function isStructurallyValidEpisode(ep: PublicationEpisode | null | undefined): ep is PublicationEpisode {
  if (!ep || typeof ep !== 'object') return false
  if (typeof ep.assessment_id !== 'string' || !ep.assessment_id) return false
  if (typeof ep.recorded_at !== 'string' || !ep.recorded_at) return false
  if (!PUBLICATION_BASES.includes(ep.publication_basis as PublicationBasis)) return false
  // EXPLICIT_AUTHORIZATION requires a named actor.
  if (ep.publication_basis === 'EXPLICIT_AUTHORIZATION' && !ep.published_by) return false
  // Revoke fields are all-null or all-set with a non-empty reason.
  const revokedParts = [ep.revoked_at, ep.revoked_by, ep.revoked_reason]
  const setCount = revokedParts.filter((v) => v != null).length
  if (setCount !== 0 && setCount !== 3) return false
  if (setCount === 3 && String(ep.revoked_reason).trim().length === 0) return false
  return true
}

export function isActiveEpisode(ep: PublicationEpisode | null | undefined): ep is PublicationEpisode {
  return isStructurallyValidEpisode(ep) && ep.revoked_at == null
}

export function isRevokedEpisode(ep: PublicationEpisode | null | undefined): ep is PublicationEpisode {
  return isStructurallyValidEpisode(ep) && ep.revoked_at != null
}

// ── Authoritative visibility predicate ─────────────────────────────────────

export type PublicVisibility = 'RECORD' | 'TOMBSTONE' | 'NOT_PUBLIC'

export interface PublicVisibilityInput {
  processingStatus: ProcessingStatus | string | null
  /** The single active (non-revoked) episode for this assessment, or null. */
  activeEpisode: PublicationEpisode | null
  /**
   * True when the assessment has publication history but no active episode
   * (i.e. its most recent publication was revoked). Drives the tombstone.
   */
  hasRevokedHistory: boolean
}

/**
 * The one authoritative resolution of a Public Assessment Record's public state.
 *
 *  RECORD     — DELIVERED + a valid active episode → full public record.
 *  TOMBSTONE  — DELIVERED + publication history exists but is currently revoked
 *               → bounded R2 tombstone.
 *  NOT_PUBLIC — everything else (fail closed).
 */
export function resolvePublicVisibility(input: PublicVisibilityInput): PublicVisibility {
  if (input.processingStatus !== 'DELIVERED') return 'NOT_PUBLIC'

  if (isActiveEpisode(input.activeEpisode)) return 'RECORD'

  // No valid active episode. If there is a (revoked) publication history for
  // a DELIVERED assessment, that is a tombstone — distinct from never-published.
  if (input.hasRevokedHistory) return 'TOMBSTONE'

  return 'NOT_PUBLIC'
}

/** Convenience: is the full record publicly visible right now? */
export function isPubliclyVisible(input: PublicVisibilityInput): boolean {
  return resolvePublicVisibility(input) === 'RECORD'
}

// ── Admin projection ───────────────────────────────────────────────────────

export type AdminPublicationState =
  | { kind: 'not_published' }
  | { kind: 'published_explicit'; recordedAt: string; publishedBy: string }
  | { kind: 'published_legacy'; recordedAt: string }
  | { kind: 'revoked'; recordedAt: string; revokedAt: string; revokedReason: string }

/**
 * Project the admin "Publication" section from the current active episode (if
 * any) plus the most recent episode overall (for the revoked state). Legacy
 * episodes never invent an actor.
 */
export function projectAdminPublicationState(
  activeEpisode: PublicationEpisode | null,
  mostRecentEpisode: PublicationEpisode | null,
): AdminPublicationState {
  if (isActiveEpisode(activeEpisode)) {
    if (activeEpisode.publication_basis === 'LEGACY_DELIVERED_MIGRATION') {
      return { kind: 'published_legacy', recordedAt: activeEpisode.recorded_at }
    }
    return {
      kind: 'published_explicit',
      recordedAt: activeEpisode.recorded_at,
      publishedBy: activeEpisode.published_by as string,
    }
  }
  if (isRevokedEpisode(mostRecentEpisode)) {
    return {
      kind: 'revoked',
      recordedAt: mostRecentEpisode.recorded_at,
      revokedAt: mostRecentEpisode.revoked_at as string,
      revokedReason: mostRecentEpisode.revoked_reason as string,
    }
  }
  return { kind: 'not_published' }
}
