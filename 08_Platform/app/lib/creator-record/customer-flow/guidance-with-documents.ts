/**
 * Governed guidance beside the document examinations of the same tool: a read-only view of a verified record.
 *
 * Pure. It derives, and adds nothing to the record:
 *   - GUIDANCE comes only from `guidance.items`, already produced by the existing pipeline from declarations alone. Its
 *     conclusion, applicability and open dependencies are copied as recorded, never re-evaluated or combined.
 *   - The LINK to a document is the record's own: the tool declarations that selected the claim
 *     (`selection_basis`) and the tool the creator linked the document to (`tool_index`). A claim with no tool scope,
 *     or an id the record cannot trace, links to no document. Nothing is matched by provider or plan name.
 *   - OBSERVATIONS stay in the examination and are referenced by id. A document here decides nothing: there is no
 *     code path from an observation or a comparison to a conclusion, a requirement or a dependency.
 */

import { identityLabel } from '../identity/selectable-identities'
import { toolInstance } from '../prototype/form'
import type { CustomerRecordV2 } from '../customer-record/record'

export interface GuidanceDocumentLink {
  document_id: string
  tool_index: number
  /** Whether a persisted examination is recorded for this document. Never a statement about its content. */
  examination: { status: 'examined'; run_id: string; verification: 'not_verified'; observation_ids: string[]; limitations: string[] } | { status: 'not_examined' }
  /** This version's provisional comparison for this tool and document, as recorded, if any. */
  comparison: { provider: { result: string; reason: string }; plan: { result: string; reason: string } } | null
}

export interface GuidanceWithDocuments {
  claim_id: string
  conclusion: CustomerRecordV2['guidance']['items'][number]['conclusion']
  explanation: string
  caveats: string[]
  applicability_status: 'met' | 'unresolved'
  /** Exactly the recorded material requirements: what this version does not establish. */
  unresolved_requirements: { fact: CustomerRecordV2['guidance']['items'][number]['applicability']['material_unresolved'][number]['fact']; tool: string | null; tool_label: string | null; value: string }[]
  /** The recorded open dependencies. Always `open`: no document can change them. */
  open_dependencies: { dependency_id: string; label: string | null; status: 'open' }[]
  /** What the creator declared that this guidance relies on, attributed to the creator. */
  declared_plans: { tool_label: string; plan: string }[]
  tool_labels: string[]
  provenance: { claim_last_verified: string; bounded_interpretation_status: string; publication_entry_id: string; publication_version: number }
  documents: GuidanceDocumentLink[]
}

export function guidanceWithDocuments(record: CustomerRecordV2): GuidanceWithDocuments[] {
  const instanceOf = new Map(record.declarations.observations.map((o) => [o.observation_id, o.instance]))
  const comparisons = record.comparison.policy === 'derived_per_version' ? record.comparison.items : []

  return record.guidance.items.map((item) => {
    const toolScopes = item.selection_basis.scopes.filter((s) => s.scope === 'tool')
    const instances = new Set(toolScopes.flatMap((s) => s.observation_ids.map((id) => instanceOf.get(id) ?? null)).filter((i): i is string => i !== null))
    const documents = record.documents.items.flatMap((d): GuidanceDocumentLink[] => {
      if (d.tool_index === null || !instances.has(toolInstance(d.tool_index))) return []
      const e = d.examination
      const c = comparisons.find((x) => x.tool_index === d.tool_index && x.document_id === d.document_id)
      return [{
        document_id: d.document_id,
        tool_index: d.tool_index,
        examination: typeof e === 'object' && e !== null
          ? { status: 'examined', run_id: e.run_id, verification: e.verification, observation_ids: e.envelope.observations.map((o) => o.observation_id), limitations: [...e.envelope.limitations] }
          : { status: 'not_examined' },
        comparison: c ? { provider: { result: c.provider.result, reason: c.provider.reason }, plan: { result: c.plan.result, reason: c.plan.reason } } : null,
      }]
    })
    return {
      claim_id: item.claim_id,
      conclusion: item.conclusion,
      explanation: item.explanation,
      caveats: item.caveats.map((c) => c.text),
      applicability_status: item.applicability.status,
      unresolved_requirements: item.applicability.material_unresolved.map((r) => ({ fact: r.fact, tool: r.tool ?? null, tool_label: r.tool ? identityLabel(r.tool) : null, value: String(r.value) })),
      open_dependencies: item.dependency_rows.map((r) => ({ dependency_id: r.dependency_id, label: r.label, status: r.status })),
      declared_plans: item.declared_applicability_basis.flatMap((b) => (b.fact === 'tool_plan_tier' && b.tool && b.normalized_value ? [{ tool_label: identityLabel(b.tool), plan: b.normalized_value }] : [])),
      tool_labels: Array.from(new Set(toolScopes.flatMap((s) => s.matched_ids))).map((id) => identityLabel(id)),
      provenance: {
        claim_last_verified: item.provenance.claim.last_verified,
        bounded_interpretation_status: item.provenance.bounded_interpretation.status,
        publication_entry_id: item.provenance.publication.entry_id,
        publication_version: item.provenance.publication.version,
      },
      documents,
    }
  })
}
