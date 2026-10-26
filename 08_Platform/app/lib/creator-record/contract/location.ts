/**
 * CR-IMPL-1 / CR-IMPL-1b — location facts (v0.3 §3, corrected by CR-ARCH-1).
 *
 * Location answers are stored and displayed as customer declarations with
 * their role and provenance. That is all.
 *
 * CR-IMPL-1b removed the Creator Record location-SELECTION authority
 * (ledger selection triggers and country-to-region containment). Living
 * Knowledge already governs location relevance through
 * `TopicClaim.geographic_relevance_scope` — explicit per-claim opt-in,
 * literal values, no region inference (lib/retrieval-engine/types.ts) — and
 * Creator Record must not run a parallel one. Until a separate governance
 * decision says how (or whether) Creator Record may use that field, no
 * location answer selects, ranks or excludes any guidance.
 *
 * Location answers also never become the applicability evaluator's
 * `jurisdiction` fact: `declaredApplicabilityInputs` excludes it by type and
 * at runtime, and the integration layer always passes an empty jurisdiction.
 */

import { activeObservations, type DeclaredObservation } from './provenance'
import { DECLARABLE_APPLICABILITY_FACTS, type DeclarableApplicabilityFact, type LocationRole } from './types'

/** A declared location, as a literal. `declared_region` is the literal the customer picked (e.g. a region option) — membership is never inferred. */
export type LocationValue =
  | { kind: 'country'; code: string }
  | { kind: 'subdivision'; code: string }
  | { kind: 'declared_region'; code: string }
  | { kind: 'online_worldwide' }
  | { kind: 'other'; text: string }
  | { kind: 'not_sure' }

/** Versioned list of region option codes the questionnaire offers. Recognition only — it holds no membership. */
export interface LocationVocabulary {
  version: string
  region_codes: readonly string[]
}

export interface LocationObservation {
  observation_id: string
  role: LocationRole
  value: LocationValue
  vocabulary_version: string
}

const COUNTRY = /^[A-Z]{2}$/
const SUBDIVISION = /^[A-Z]{2}-[A-Z0-9]{1,3}$/

/** Deterministic option-code normalization. Unknown codes become `other` (kept verbatim), never a guess. */
export function normalizeLocationCode(code: string | null, verbatim: string, vocabulary: LocationVocabulary): LocationValue {
  if (code === null || code === 'other') return { kind: 'other', text: verbatim }
  if (code === 'not_sure') return { kind: 'not_sure' }
  if (code === 'online_worldwide') return { kind: 'online_worldwide' }
  if (vocabulary.region_codes.includes(code)) return { kind: 'declared_region', code }
  if (SUBDIVISION.test(code)) return { kind: 'subdivision', code }
  if (COUNTRY.test(code)) return { kind: 'country', code }
  return { kind: 'other', text: verbatim }
}

/** Location observations from the active declared observations, each keeping its role and observation id. Display/provenance only. */
export function locationObservations(observations: readonly DeclaredObservation[], vocabulary: LocationVocabulary): LocationObservation[] {
  return activeObservations(observations).flatMap((o) =>
    o.target.kind === 'location'
      ? [{ observation_id: o.observation_id, role: o.target.role, value: normalizeLocationCode(o.normalized_value, o.answer_verbatim, vocabulary), vocabulary_version: vocabulary.version }]
      : [],
  )
}

export interface DeclaredApplicabilityInput {
  fact: DeclarableApplicabilityFact
  tool?: string
  instance: string | null
  value: string
  observation_id: string
}

/**
 * The only declared values that may be offered to the (upstream) applicability
 * evaluator, labelled "on what you told us". Location observations are never
 * among them, and a `jurisdiction` target is refused even from untyped data.
 */
export function declaredApplicabilityInputs(observations: readonly DeclaredObservation[]): DeclaredApplicabilityInput[] {
  const out: DeclaredApplicabilityInput[] = []
  for (const o of activeObservations(observations)) {
    if (o.target.kind !== 'applicability_fact') continue
    const fact = o.target.fact as string
    if (!(DECLARABLE_APPLICABILITY_FACTS as readonly string[]).includes(fact)) throw new Error(`applicability fact '${fact}' cannot come from a declaration`)
    if (o.normalized_value === null) continue
    out.push({ fact: o.target.fact, ...(o.target.tool ? { tool: o.target.tool } : {}), instance: o.instance, value: o.normalized_value, observation_id: o.observation_id })
  }
  return out
}
