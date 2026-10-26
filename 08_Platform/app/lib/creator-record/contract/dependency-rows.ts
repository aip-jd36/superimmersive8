/**
 * CR-IMPL-1 — one display row per open governed dependency (v0.3 §2.6).
 *
 * Layers E (evidence requirement) and S (sufficiency) belong to Living
 * Knowledge governance, which today defines neither per dependency. This
 * module therefore holds NO evidence or sufficiency data and accepts none:
 * every row is `open`, sufficiency is `not_assessed`, and the evidence
 * requirement is reported as not defined by governance (treated as
 * evidence-required). A customer declaration is shown beside the dependency
 * and cannot change any of these — the status type has a single value.
 */

import { activeObservations, type DeclaredObservation } from './provenance'

export interface DependencyDeclaration {
  observation_id: string
  observation_kind: DeclaredObservation['observation_kind']
  normalized_value: string | null
  answer_verbatim: string
  map_entry: NonNullable<DeclaredObservation['map_entry']>
}

export interface DependencyRow {
  dependency_id: string
  /** Approved display label, or null (no fallback to the raw id or an improvised description). */
  label: string | null
  /** What the customer told us, attached only through approved Observation Map entries. */
  declarations: DependencyDeclaration[]
  /** Approved ledger evidence note for this dependency, if any. */
  evidence_note: string | null
  evidence_requirement: 'not_defined_by_governance'
  treated_as: 'evidence_required'
  sufficiency: 'not_assessed'
  status: 'open'
}

export function buildDependencyRows(
  dependencyIds: readonly string[],
  observations: readonly DeclaredObservation[],
  labelFor: (dependencyId: string) => string | undefined,
  evidenceNotes: Readonly<Record<string, string>> = {},
): DependencyRow[] {
  const active = activeObservations(observations)
  return Array.from(new Set(dependencyIds)).map((id) => ({
    dependency_id: id,
    label: labelFor(id) ?? null,
    declarations: active.flatMap((o) =>
      o.target.kind === 'dependency' && o.target.dependency_id === id && o.map_entry
        ? [{ observation_id: o.observation_id, observation_kind: o.observation_kind, normalized_value: o.normalized_value, answer_verbatim: o.answer_verbatim, map_entry: o.map_entry }]
        : [],
    ),
    evidence_note: Object.prototype.hasOwnProperty.call(evidenceNotes, id) ? evidenceNotes[id] : null,
    evidence_requirement: 'not_defined_by_governance',
    treated_as: 'evidence_required',
    sufficiency: 'not_assessed',
    status: 'open',
  }))
}
