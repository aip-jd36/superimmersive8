/**
 * CR-V2-MVP-INTEGRATION-2 — the MVP integrated assessment (PRD_CREATOR_RECORD_v2_MVP_SCOPE.md §9).
 *
 * Pure, derived from a stored record; nothing is persisted. For each guidance item it relates every governed requirement the
 * item carries to the creator's declarations for it and to what the documents linked to it appear to show, and says what that
 * means for the requirement.
 *
 * Authority (§9.3):
 *   - Runs AFTER composition. The item's conclusion, applicability and dependency status are copied, never re-evaluated: an
 *     observation cannot strengthen, weaken or resolve anything. Nothing here is an input to Retrieval, applicability, Bounded
 *     Interpretation or composition.
 *   - No determination (D10): a reading is never compared with a declaration. "Relevant observation" means only that the
 *     document appears to show something bearing on the requirement; it is never verification or sufficiency.
 *   - Links are the record's own (`selection_basis`, the document's `tool_index`, a declared-plan basis's instance). Nothing is
 *     matched by provider or plan name. One generic fact-type table; no provider-specific logic.
 *   - Creator responses take precedence over a reading. A reading that cannot be recovered exactly, or a document whose link to
 *     the requirement's tool cannot be established, is `cannot_establish` (fail closed).
 *   - Governed dependencies have no governed evidence requirement (`contract/dependency-rows.ts`), so documents are never
 *     assessed against them.
 */

import { activeObservations, type DeclaredObservation } from '../contract/provenance'
import type { CreatorResponseCode } from '../customer-record/examination-section'
import { receiptReadingOf, type ReceiptReadableEnvelope } from '../examination/receipt-reading'
import { toolInstance } from '../prototype/form'
import { BILLING_DOCUMENT_TYPES } from '../receipt-examination/schema'
import { DOCUMENT_EVIDENCE_REASONS, DOCUMENT_EVIDENCE_STATUSES, INTEGRATED_ASSESSMENT_METHOD, REQUIREMENT_EVIDENCE, REQUIREMENT_STANDINGS, type DocumentEvidenceReason, type DocumentEvidenceStatus, type RequirementEvidence, type RequirementStanding } from './vocabulary'

export { DOCUMENT_EVIDENCE_REASONS, DOCUMENT_EVIDENCE_STATUSES, INTEGRATED_ASSESSMENT_METHOD, REQUIREMENT_EVIDENCE, REQUIREMENT_STANDINGS }
export type { DocumentEvidenceReason, DocumentEvidenceStatus, RequirementEvidence, RequirementStanding }

/** The one generic table: which requirement fact types a document examination can bear on, and through which reading. */
const DOCUMENT_READABLE_FACTS = { tool_plan_tier: 'plan' } as const

export interface DocumentEvidence {
  document_id: string
  status: DocumentEvidenceStatus
  reason: DocumentEvidenceReason
  /** Only for `relevant_observation_unverified`: the reading as reported, verbatim, with its provenance. Never verified. */
  observed: { value: string; excerpt: string | null; observation_ids: string[]; run_id: string; verification: 'not_verified' } | null
  /** Only for `creator_disputed`: the creator's own response codes, in record order. */
  responses: CreatorResponseCode[]
}

export interface IntegratedRequirement {
  requirement: { kind: 'applicability'; fact: string; tool: string | null } | { kind: 'dependency'; dependency_id: string; label: string | null }
  standing: RequirementStanding
  /** What the creator told SI8 for this requirement, attributed to the creator, verbatim. */
  declared: { observation_id: string; answer_verbatim: string }[]
  evidence: RequirementEvidence
  /** Documents the record links to this requirement (all states). */
  linked_document_ids: string[]
  /** Non-empty exactly when `evidence` is `documents_considered`. */
  documents: DocumentEvidence[]
}

export interface IntegratedGuidanceItem {
  claim_id: string
  /** Copied from composition. */
  conclusion: string
  requirements: IntegratedRequirement[]
}

export interface IntegratedAssessment {
  method: typeof INTEGRATED_ASSESSMENT_METHOD
  items: IntegratedGuidanceItem[]
}

// ── The record view this reads (structural: the stored CustomerRecordV2 and the PDF's verified view both satisfy it) ──

/** A stored observation: what the exact inversion reads, plus its id. */
type ObservationView = ReceiptReadableEnvelope['observations'][number] & { observation_id: string }
type ResponseTarget = { kind: 'observation'; run_id: string; observation_id: string } | { kind: 'comparison'; tool_index: number; document_id: string; field: string }
export interface IntegratedAssessmentInput {
  declarations: { observations: readonly DeclaredObservation[] }
  documents: { items: readonly { document_id: string; tool_index: number | null; examination: 'not_examined' | { run_id: string; envelope: Omit<ReceiptReadableEnvelope, 'observations'> & { observations: readonly ObservationView[] } } }[] }
  guidance: {
    items: readonly {
      claim_id: string
      conclusion: string
      applicability: { status: string; material_unresolved: readonly { fact: string; tool?: string | null }[] }
      declared_applicability_basis: readonly { fact: string; tool: string | null; instance: string | null; observation_id: string }[]
      dependency_rows: readonly { dependency_id: string; label: string | null; declarations: readonly { observation_id: string; answer_verbatim: string }[] }[]
      selection_basis: { scopes: readonly { scope: string; matched_ids: readonly string[]; observation_ids: readonly string[] }[] }
    }[]
  }
  creator_responses?: { items: readonly { target: ResponseTarget; code: CreatorResponseCode }[] }
}

const PLAN_FIELDS = new Set(['product_or_plan_name', 'plan_candidate'])
const DOCUMENT_LEVEL_CODES: readonly CreatorResponseCode[] = ['wrong_document', 'not_relevant']
const INCOMPLETE = /…|\.\.\.|�/
const flat = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

type DocumentItem = IntegratedAssessmentInput['documents']['items'][number]

function planEvidence(d: DocumentItem, responses: NonNullable<IntegratedAssessmentInput['creator_responses']>['items'], linkEstablished: boolean): DocumentEvidence {
  const out = (status: DocumentEvidenceStatus, reason: DocumentEvidenceReason, extra: Partial<DocumentEvidence> = {}): DocumentEvidence => ({ document_id: d.document_id, status, reason, observed: null, responses: [], ...extra })
  const e = d.examination
  if (e === 'not_examined') return out('not_examined', 'not_examined')

  // Creator responses first: a disputed reading is never relied on.
  const planObservationIds = new Set(e.envelope.observations.filter((o) => PLAN_FIELDS.has(o.field)).map((o) => o.observation_id))
  const runObservationIds = new Set(e.envelope.observations.map((o) => o.observation_id))
  const codes = responses
    .filter((x) =>
      x.target.kind === 'observation'
        ? x.target.run_id === e.run_id && runObservationIds.has(x.target.observation_id) && (DOCUMENT_LEVEL_CODES.includes(x.code) || planObservationIds.has(x.target.observation_id))
        : x.target.document_id === d.document_id && (x.target.field === 'plan' || DOCUMENT_LEVEL_CODES.includes(x.code)),
    )
    .map((x) => x.code)
  if (codes.length > 0) return out('creator_disputed', 'creator_response', { responses: codes })

  if (e.envelope.outcome.status !== 'examined') return out('cannot_establish', 'examination_failed')
  if (!linkEstablished) return out('cannot_establish', 'tool_link_not_established')
  const reading = receiptReadingOf(e.envelope)
  if (!reading) return out('cannot_establish', 'reading_not_recoverable')
  if (!BILLING_DOCUMENT_TYPES.includes(reading.document_type)) return out('cannot_establish', 'not_a_billing_document')
  if (reading.readability === 'illegible') return out('cannot_establish', 'document_illegible')
  const p = reading.product_or_plan_name
  if (p.status === 'not_shown') return out('cannot_establish', 'field_not_shown')
  if (p.status === 'unreadable') return out('cannot_establish', 'field_unreadable')
  if (p.status === 'ambiguous') return out('leaves_uncertainty', 'field_ambiguous')
  const texts = [p.value!, ...reading.plan_candidates.map((c) => c.text)]
  if (texts.some((t) => INCOMPLETE.test(t))) return out('leaves_uncertainty', 'plan_text_incomplete')
  if (reading.multiple_plans_shown || new Set(texts.map(flat)).size > 1) return out('leaves_uncertainty', 'multiple_plans_shown')
  const selected = e.envelope.observations.filter((o) => o.field === 'product_or_plan_name' && o.status === 'present' && o.value === p.value)
  if (selected.length !== 1) return out('cannot_establish', 'reading_not_recoverable')
  return out('relevant_observation_unverified', 'field_present', {
    observed: { value: p.value!, excerpt: selected[0].excerpt, observation_ids: [selected[0].observation_id, ...Array.from(planObservationIds).filter((id) => id !== selected[0].observation_id)], run_id: e.run_id, verification: 'not_verified' },
  })
}

export function assessIntegrated(record: IntegratedAssessmentInput): IntegratedAssessment {
  const active = activeObservations(record.declarations.observations)
  const byId = new Map(record.declarations.observations.map((o) => [o.observation_id, o]))
  const responses = record.creator_responses?.items ?? []

  const items = record.guidance.items.map((item): IntegratedGuidanceItem => {
    const toolScopes = item.selection_basis.scopes.filter((s) => s.scope === 'tool')
    const itemInstances = new Set(toolScopes.flatMap((s) => s.observation_ids.map((id) => byId.get(id)?.instance ?? null)).filter((i): i is string => i !== null))
    const docsFor = (instances: ReadonlySet<string>) => record.documents.items.filter((d) => d.tool_index !== null && instances.has(toolInstance(d.tool_index)))
    // A tool id is attributable to the item's instances only when the item was selected on exactly that one tool.
    const scopeTools = Array.from(new Set(toolScopes.flatMap((s) => s.matched_ids)))
    const attributable = (tool: string | null) => tool !== null && scopeTools.length === 1 && scopeTools[0] === tool

    const applicabilityRow = (fact: string, tool: string | null, standing: RequirementStanding, instances: ReadonlySet<string>, linkEstablished: boolean, declared: IntegratedRequirement['declared']): IntegratedRequirement => {
      const linked = docsFor(instances)
      const base = { requirement: { kind: 'applicability' as const, fact, tool }, standing, declared, linked_document_ids: linked.map((d) => d.document_id) }
      if (!Object.prototype.hasOwnProperty.call(DOCUMENT_READABLE_FACTS, fact)) return { ...base, evidence: 'not_read_from_documents', documents: [] }
      if (linked.length === 0) return { ...base, evidence: 'no_linked_document', documents: [] }
      return { ...base, evidence: 'documents_considered', documents: linked.map((d) => planEvidence(d, responses, linkEstablished)) }
    }

    const requirements: IntegratedRequirement[] = []
    for (const b of item.declared_applicability_basis) {
      const o = byId.get(b.observation_id)
      const instances = new Set(b.instance !== null ? [b.instance] : [])
      requirements.push(applicabilityRow(b.fact, b.tool, 'rests_on_declaration', instances, b.instance !== null, o ? [{ observation_id: o.observation_id, answer_verbatim: o.answer_verbatim }] : []))
    }
    for (const q of item.applicability.material_unresolved) {
      const tool = q.tool ?? null
      const declared = active
        .filter((o) => o.target.kind === 'applicability_fact' && o.target.fact === q.fact && o.instance !== null && itemInstances.has(o.instance) && (o.target.tool === undefined || o.target.tool === tool))
        .map((o) => ({ observation_id: o.observation_id, answer_verbatim: o.answer_verbatim }))
      requirements.push(applicabilityRow(q.fact, tool, 'not_established', itemInstances, attributable(tool), declared))
    }
    for (const dep of item.dependency_rows) {
      requirements.push({
        requirement: { kind: 'dependency', dependency_id: dep.dependency_id, label: dep.label },
        standing: 'open',
        declared: dep.declarations.map((x) => ({ observation_id: x.observation_id, answer_verbatim: x.answer_verbatim })),
        evidence: 'evidence_requirement_not_defined',
        linked_document_ids: docsFor(itemInstances).map((d) => d.document_id),
        documents: [],
      })
    }
    return { claim_id: item.claim_id, conclusion: item.conclusion, requirements }
  })
  return { method: INTEGRATED_ASSESSMENT_METHOD, items }
}
