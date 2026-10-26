/**
 * CR-IMPL-1 — explicit provenance for customer declarations and document
 * observations (v0.3 §2.8).
 *
 * There is deliberately no `verified` source kind. A document observation is
 * what a document appears to show; a declaration is what the customer said.
 * Neither is ever upgraded to a governed fact here.
 */

import type { LocationRole, ObservationKind, ObservationTarget } from './types'

export const OBSERVATION_SOURCE_KINDS = ['customer_declared', 'document_examined', 'document_provided_not_examined', 'not_provided'] as const
export type ObservationSourceKind = (typeof OBSERVATION_SOURCE_KINDS)[number]

export interface RecordContext {
  record_id: string
  record_version: number
  captured_at: string
}

export interface DeclaredObservation {
  observation_id: string
  source_kind: 'customer_declared'
  record_id: string
  record_version: number
  question: { q_id: string; q_version: number }
  /** Repeated-block instance the answer belongs to (e.g. a tool slot), or null. */
  instance: string | null
  /** Exactly what the customer entered or selected, never rewritten. */
  answer_verbatim: string
  /** Option code or normalized value; null for free text. */
  normalized_value: string | null
  observation_kind: ObservationKind
  target: ObservationTarget
  /** The approved Observation Map entry that produced the attachment; null = record-only default. */
  map_entry: { o_id: string; o_version: number; value_mapping_version: string } | null
  captured_at: string
  supersedes: string | null
}

export interface DocumentObservation {
  observation_id: string
  source_kind: Exclude<ObservationSourceKind, 'customer_declared'>
  record_id: string
  record_version: number
  /** Byte identity of the stored file only — not authenticity, authorship or date. Null when not provided. */
  file: { sha256: string; category: string } | null
  /** Examination profile that produced the observation; null unless examined. */
  profile: { id: string; version: string } | null
  field: string | null
  /** What the document appears to show. */
  value: string | null
  excerpt: string | null
  captured_at: string
  supersedes: string | null
}

export type Observation = DeclaredObservation | DocumentObservation

export function declaredObservationId(ctx: RecordContext, qId: string, index: number, instance: string | null = null): string {
  return `${ctx.record_id}:v${ctx.record_version}:${qId}:${instance === null ? '' : `${instance}:`}${index}`
}

/** Observations not superseded by a later one. Superseded observations stay in history; they are only excluded here. */
export function activeObservations<T extends Observation>(all: readonly T[]): T[] {
  const superseded = new Set(all.map((o) => o.supersedes).filter((s): s is string => s !== null))
  return all.filter((o) => !superseded.has(o.observation_id))
}

export function isLocationObservation(o: DeclaredObservation): o is DeclaredObservation & { target: { kind: 'location'; role: LocationRole } } {
  return o.target.kind === 'location'
}
