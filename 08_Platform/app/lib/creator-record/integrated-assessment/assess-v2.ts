/**
 * CR-DOC-READER-EXT-1 (C) — integrated assessment method v2 (Path 1). DEFINED, INACTIVE: no approved template set carries it and
 * no record path calls it.
 *
 * v2 = v1 (`./assess.ts`, unchanged and still the only method any approved template prints) plus ONE addition: the governed
 * dependency rows of an item selected through a material provider (music or stock) may relate documents, instead of always
 * reporting `evidence_requirement_not_defined`. Everything else is v1's output, copied.
 *
 * Authority (unchanged from v1): runs after composition; conclusion, applicability and every dependency's standing (`open`) and
 * sufficiency (`not_assessed`) are copied, never changed. Nothing here is an input to Retrieval, applicability, Bounded
 * Interpretation or composition. No comparison: a reading is never matched against a declaration (original D10 stands).
 *
 * A dependency relates documents only when BOTH hold: the publication ledger supplied an approved evidence note for it (the row's
 * `evidence_note`), and the governed relevance table names it. Otherwise it stays `evidence_requirement_not_defined`.
 *
 * Association is the creator's declared category only, and it is never proof of provider, asset or project identity. A document is
 * considered for the dependency when it is not linked to an AI tool and its category is in the table; it can reach
 * `relevant_observation_unverified` only when ALL of these hold, else `cannot_establish` (fail closed):
 *   - the creator has not disputed it (creator responses take precedence);
 *   - it was examined, by exactly the profile its current category calls for (else `profile_mismatch`: the category changed
 *     after the reading, or another profile read it);
 *   - exactly one material provider question is answered, and it is the one the item was selected through (else
 *     `association_ambiguous`); for a `permission` document, the brand/client permission question (M4) is not answered;
 *   - the reading is not classified as something other than a licence or permission, is not illegible, and shows exactly one
 *     distinct value in the relevant fields (several distinct values → `leaves_uncertainty`).
 * Every relevant reading carries `association_basis: 'creator_declared_category'` so the presentation must say so.
 */
import { activeObservations, type DeclaredObservation } from '../contract/provenance'
import type { CreatorResponseCode } from '../customer-record/examination-section'
import { CATEGORY_PROFILES } from '../examination/category-profile'
import { assessIntegrated, type IntegratedAssessmentInput, type IntegratedGuidanceItem, type IntegratedRequirement } from './assess'
import { DRAFT_DEPENDENCY_RELEVANCE, MATERIAL_PROVIDER_QUESTIONS, PERMISSION_AMBIGUITY_QUESTIONS, type DependencyRelevanceTable } from './dependency-relevance'
import { INTEGRATED_ASSESSMENT_METHOD_V2, type DependencyDocumentReason, type DependencyDocumentStatus } from './vocabulary-v2'

type ObservationViewV2 = { observation_id: string; field: string; status: string; value: string | null; excerpt: string | null; basis?: string }
type ResponseTarget = { kind: 'observation'; run_id: string; observation_id: string } | { kind: 'comparison'; tool_index: number; document_id: string; field: string }
export interface DocumentItemV2 {
  document_id: string
  tool_index: number | null
  category: string
  examination: 'not_examined' | { run_id: string; envelope: { profile: { id: string; version: number }; outcome: { status: string }; observations: readonly ObservationViewV2[] } }
}
export interface IntegratedAssessmentInputV2 {
  declarations: { observations: readonly DeclaredObservation[] }
  documents: { items: readonly DocumentItemV2[] }
  guidance: {
    items: readonly (Omit<IntegratedAssessmentInput['guidance']['items'][number], 'dependency_rows'> & {
      dependency_rows: readonly { dependency_id: string; label: string | null; evidence_note: string | null; declarations: readonly { observation_id: string; answer_verbatim: string }[] }[]
    })[]
  }
  creator_responses?: { items: readonly { target: ResponseTarget; code: CreatorResponseCode }[] }
}

export interface DependencyDocumentEvidence {
  document_id: string
  category: string
  status: DependencyDocumentStatus
  reason: DependencyDocumentReason
  /** Only for `relevant_observation_unverified`: the printed value, verbatim, with provenance. Never verified, never a match. */
  observed: { value: string; excerpt: string | null; observation_ids: string[]; run_id: string; verification: 'not_verified'; association_basis: 'creator_declared_category' } | null
  responses: CreatorResponseCode[]
}
export type IntegratedRequirementV2 = IntegratedRequirement | (Omit<IntegratedRequirement, 'evidence' | 'documents'> & { evidence: 'documents_considered' | 'no_linked_document'; documents: DependencyDocumentEvidence[] })
export interface IntegratedAssessmentV2 {
  method: typeof INTEGRATED_ASSESSMENT_METHOD_V2
  items: (Omit<IntegratedGuidanceItem, 'requirements'> & { requirements: IntegratedRequirementV2[] })[]
}

const DOCUMENT_LEVEL_CODES: readonly CreatorResponseCode[] = ['wrong_document', 'not_relevant']
const NOT_A_LICENCE_KINDS = new Set(['not_a_licence_or_permission', 'unknown'])
const flat = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

export function assessIntegratedV2(record: IntegratedAssessmentInputV2, relevance: DependencyRelevanceTable = DRAFT_DEPENDENCY_RELEVANCE): IntegratedAssessmentV2 {
  // v1 for everything it covers, unchanged.
  const v1 = assessIntegrated(record as unknown as IntegratedAssessmentInput)
  const active = activeObservations(record.declarations.observations)
  const byId = new Map(record.declarations.observations.map((o) => [o.observation_id, o]))
  const responses = record.creator_responses?.items ?? []

  // Which material provider questions this record answers, and whether M4 (brand/client permission) is answered.
  const answeredMaterial = new Set(active.filter((o) => o.target.kind === 'asset_provider_identity' && (MATERIAL_PROVIDER_QUESTIONS as readonly string[]).includes(o.question.q_id)).map((o) => o.question.q_id))
  const permissionAmbiguous = active.some((o) => (PERMISSION_AMBIGUITY_QUESTIONS as readonly string[]).includes(o.question.q_id))

  const items = record.guidance.items.map((item, i) => {
    const base = v1.items[i]
    // The material question this item was selected through (asset-provider declarations only).
    const providerObs = item.selection_basis.scopes.filter((s) => s.scope === 'asset_provider').flatMap((s) => s.observation_ids)
    const itemQuestions = new Set(providerObs.map((id) => byId.get(id)?.question.q_id).filter((q): q is string => typeof q === 'string'))
    const requirements: IntegratedRequirementV2[] = base.requirements.map((r) => {
      if (r.requirement.kind !== 'dependency' || providerObs.length === 0) return r
      const dependencyId = r.requirement.dependency_id
      const row = item.dependency_rows.find((d) => d.dependency_id === dependencyId)
      const sources = relevance[dependencyId]
      // Not authorized for document relevance: no approved evidence note, or not in the governed table.
      if (!row || row.evidence_note === null || !sources) return r
      const candidates = record.documents.items.filter((d) => Object.prototype.hasOwnProperty.call(sources, d.category))
      if (candidates.length === 0) return { ...r, evidence: 'no_linked_document', linked_document_ids: [], documents: [] }
      return {
        ...r,
        evidence: 'documents_considered',
        linked_document_ids: candidates.map((d) => d.document_id),
        documents: candidates.map((d) => dependencyEvidence(d, sources[d.category].fields, responses, itemQuestions, answeredMaterial, permissionAmbiguous)),
      }
    })
    return { claim_id: base.claim_id, conclusion: base.conclusion, requirements }
  })
  return { method: INTEGRATED_ASSESSMENT_METHOD_V2, items }
}

function dependencyEvidence(
  d: DocumentItemV2,
  fields: readonly string[],
  responses: NonNullable<IntegratedAssessmentInputV2['creator_responses']>['items'],
  itemQuestions: ReadonlySet<string>,
  answeredMaterial: ReadonlySet<string>,
  permissionAmbiguous: boolean,
): DependencyDocumentEvidence {
  const out = (status: DependencyDocumentStatus, reason: DependencyDocumentReason, extra: Partial<DependencyDocumentEvidence> = {}): DependencyDocumentEvidence => ({ document_id: d.document_id, category: d.category, status, reason, observed: null, responses: [], ...extra })
  if (d.tool_index !== null) return out('cannot_establish', 'linked_to_tool')
  const e = d.examination
  if (e === 'not_examined') return out('not_examined', 'not_examined')

  // Creator responses first: a disputed reading is never relied on.
  const relevantIds = new Set(e.envelope.observations.filter((o) => fields.includes(o.field)).map((o) => o.observation_id))
  const runIds = new Set(e.envelope.observations.map((o) => o.observation_id))
  const codes = responses
    .filter((x) =>
      x.target.kind === 'observation'
        ? x.target.run_id === e.run_id && runIds.has(x.target.observation_id) && (DOCUMENT_LEVEL_CODES.includes(x.code) || relevantIds.has(x.target.observation_id))
        : x.target.document_id === d.document_id && DOCUMENT_LEVEL_CODES.includes(x.code),
    )
    .map((x) => x.code)
  if (codes.length > 0) return out('creator_disputed', 'creator_response', { responses: codes })

  if (e.envelope.outcome.status !== 'examined') return out('cannot_establish', 'examination_failed')
  const expected = (CATEGORY_PROFILES as Record<string, { id: string } | null>)[d.category]
  if (!expected || e.envelope.profile.id !== expected.id) return out('cannot_establish', 'profile_mismatch')

  // Association by declared category only: exactly one material context, and it is this item's.
  if (answeredMaterial.size !== 1 || itemQuestions.size !== 1 || !answeredMaterial.has(Array.from(itemQuestions)[0])) return out('cannot_establish', 'association_ambiguous')
  if (d.category === 'permission' && permissionAmbiguous) return out('cannot_establish', 'association_ambiguous')

  const cls = (field: string) => e.envelope.observations.find((o) => o.field === field && o.basis === 'examiner_classification')?.value ?? null
  const kind = cls('document_kind')
  if (kind !== null && NOT_A_LICENCE_KINDS.has(kind)) return out('cannot_establish', 'not_a_licence_or_permission')
  if (cls('readability') === 'illegible') return out('cannot_establish', 'document_illegible')

  const relevant = e.envelope.observations.filter((o) => fields.includes(o.field) && o.basis !== 'examiner_classification')
  const present = relevant.filter((o) => o.status === 'present' && typeof o.value === 'string' && o.value.trim() !== '')
  if (present.length === 0) {
    if (relevant.some((o) => o.status === 'ambiguous')) return out('leaves_uncertainty', 'field_ambiguous')
    if (relevant.some((o) => o.status === 'unreadable')) return out('cannot_establish', 'field_unreadable')
    return out('cannot_establish', 'field_not_shown')
  }
  if (new Set(present.map((o) => flat(o.value as string))).size > 1) return out('leaves_uncertainty', 'multiple_values_shown')
  return out('relevant_observation_unverified', 'field_present', {
    observed: { value: present[0].value as string, excerpt: present[0].excerpt, observation_ids: present.map((o) => o.observation_id), run_id: e.run_id, verification: 'not_verified', association_basis: 'creator_declared_category' },
  })
}
