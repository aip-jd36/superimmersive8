/**
 * CRV2-IA-4A — the per-objective view of the record's applicability facts (IA-3E §5).
 *
 * Pure. Reads the record-wide facts and returns, for one objective, the facts the shared selector receives:
 *   - `jurisdiction.included` = the declared guidance places from question versions an approved authorization names for
 *     THIS objective; nothing otherwise (default deny);
 *   - `jurisdiction.excluded` is always empty: a place not chosen is unknown, never excluded;
 *   - every other fact is passed through unchanged (same object identity when nothing is projected).
 *
 * It never evaluates applicability. The one evaluator stays the shared one, reached through `selectReviewerClaims`.
 */

import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { authorizedFactSources, type ObjectiveFactAuthorization } from '../contract/objective-fact-authorization'
import type { DeclaredGuidancePlace } from './facts'

export interface ObjectiveFactProjection {
  facts: ApplicabilityFacts
  /** Exactly the declared guidance-place observations passed on for this objective (provenance). */
  jurisdiction_basis: DeclaredGuidancePlace[]
}

export function projectFactsForObjective(
  base: ApplicabilityFacts,
  places: readonly DeclaredGuidancePlace[],
  authorizations: readonly ObjectiveFactAuthorization[],
  objective_id: string,
): ObjectiveFactProjection {
  const sources = authorizedFactSources(authorizations, objective_id, 'jurisdiction')
  const basis = places.filter((p) => sources.some((s) => s.q_id === p.q_id && s.q_version === p.q_version))
  // The record-wide base never carries jurisdiction; with nothing authorized the selector sees exactly the base.
  if (basis.length === 0) return { facts: base, jurisdiction_basis: [] }
  const included = Array.from(new Set(basis.map((p) => p.place)))
  return { facts: { ...base, jurisdiction: { included, excluded: [] } }, jurisdiction_basis: basis }
}
