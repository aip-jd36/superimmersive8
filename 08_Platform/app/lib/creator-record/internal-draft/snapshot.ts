/**
 * CR-OPTION-C-OC1 — the deterministic INTERNAL draft snapshot of a Creator Record v2.
 *
 * Pure: no I/O, no clock, no randomness (the caller supplies `as_of` and the
 * record context, exactly as for `buildCreatorRecordDraft`). Built only from the
 * existing prototype's own output, which is reused unchanged:
 *   - `buildCreatorRecordDraft` → the draft view and the guidance result;
 *   - `formToObservations` → the declared observations, with their question and
 *     Observation Map versions (the same call the draft builder makes).
 *
 * Boundaries:
 *   - Declarations come only from the creator's answers. Documents never change
 *     them (Option C): the guidance pipeline receives declarations only.
 *   - C1 (PM decision for OC-1): NEUTRAL FALLBACK only. The prototype's
 *     provisional reconciliation results, its comparison summary counts and the
 *     G-R2 cross-check are NOT carried into the snapshot at all, so nothing
 *     downstream can display them.
 *   - Versions are recorded only where they exist. Missing ones are listed in
 *     `missing_versions`; none is invented. Pilot sources are recorded as
 *     unapproved.
 *   - A draft never carries an issued Creator Record id.
 */

import type { DeclaredObservation, DocumentObservation } from '../contract/provenance'
import type { CreatorRecordConclusion } from '../contract/compose'
import type { DraftDeclarationGroup, DraftNotEstablished, DraftOpenItem, DraftRow } from '../presentation/build-draft-record'
import { T } from '../presentation/templates'
import { buildCreatorRecordDraft, loadFormConfig, type BuildDraftInput } from '../prototype/build-draft'
import { formToObservations, type FormIssue } from '../prototype/form'
import { canonicalJson, sha256Hex } from './canonical'
import {
  COMPARISON_POLICY, D, INTERNAL_DRAFT_GENERATOR_ID, INTERNAL_DRAFT_SNAPSHOT_SCHEMA, INTERNAL_DRAFT_SNAPSHOT_SCHEMA_VERSION,
  ISSUED_RECORD_ID, NOT_YET_VERSIONED,
} from './templates'

export interface SnapshotGuidanceCard {
  claim_id: string
  subject: string
  conclusion: CreatorRecordConclusion
  conclusion_label: string
  explanation: string
  basis: string[]
  depends_on: string[]
  open_item_labels: string[]
  caveats: string[]
  source: string
  provenance: {
    claim_last_verified: string
    objective_id: string
    objective_version: number
    bi_status: string
    publication_entry_id: string
    publication_entry_version: number
    publication_approver: string
    publication_decision_date: string
  }
}

export interface SnapshotDocument {
  document_id: string
  tool_index: number
  heading: string
  file_name: string
  sha256: string
  outcome: string
  extraction_mode: string
  versions: { schema: string; prompt: string | null; replay_set: string | null }
  model_calls: number
  /** What the document appears to show, in the prototype's fixed wording. Never a comparison. */
  rows: DraftRow[]
  notes: string[]
}

export interface InternalDraftSnapshot {
  schema: typeof INTERNAL_DRAFT_SNAPSHOT_SCHEMA
  schema_version: typeof INTERNAL_DRAFT_SNAPSHOT_SCHEMA_VERSION
  status: 'internal_unissued_draft'
  generator_id: typeof INTERNAL_DRAFT_GENERATOR_ID
  comparison_policy: typeof COMPARISON_POLICY
  record: { draft_id: string; version: number; prepared_on: string; captured_at: string; title: string }
  sources: {
    kind: 'governed' | 'pilot'
    /** Pilot sources are internal and unapproved; recorded as such, never as approved. */
    approval: 'pilot_unapproved' | 'governed_sources'
    registry_version: string
    ledger_version: string
    guidance_as_of: string
  }
  missing_versions: string[]
  pilot_notice: string[]
  summary: string[]
  declarations: { intro: string; groups: DraftDeclarationGroup[] }
  declared_observations: DeclaredObservation[]
  documents: { intro: string; items: SnapshotDocument[]; empty: string | null }
  document_observations: DocumentObservation[]
  comparison: { intro: string; tools: { tool_index: number; document_id: string | null; line: string }[] }
  guidance: { intro: string; empty: string | null; cards: SnapshotGuidanceCard[] }
  open_items: { intro: string; empty: string | null; not_established: DraftNotEstablished[]; items: DraftOpenItem[]; documents_mentioned: DraftRow[] }
  not_shown: { intro: string | null; lines: string[]; empty: string | null }
  independent_review: { intro: string; lines: string[] }
  not_done: string[]
  method: DraftRow[]
}

export type SnapshotResult =
  | { ok: true; snapshot: InternalDraftSnapshot; canonical: string; sha256: string }
  | { ok: false; issues: FormIssue[] }

export class InternalDraftSnapshotError extends Error {
  constructor(reason: string) {
    super(`internal_draft_snapshot_rejected: ${reason}`)
  }
}

/** Optional fields that are absent are omitted, never written as `undefined`. */
function plain<V>(value: V): V {
  return JSON.parse(JSON.stringify(value)) as V
}

/** The prototype's comparison summary line for these results, recomputed exactly as the view builds it. */
function reconciliationSummaryLines(view: { trace: { evidence_reconciliation: { tool_index: number; provider: { result: string; reason: string }; plan: { result: string; reason: string } }[] } }, documentCount: number): string[] {
  if (documentCount === 0) return []
  const recon = view.trace.evidence_reconciliation
  const rows = recon.flatMap((r) => [r.provider, r.plan]).filter((f) => f.reason !== 'no_document')
  const count = (result: string) => rows.filter((f) => f.result === result).length
  const lines: string[] = []
  if (rows.length > 0) {
    lines.push(T.recon_summary(rows.length, { consistent: count('appears_consistent'), conflict: count('appears_to_conflict'), not_established: count('does_not_establish'), not_assessed: count('not_assessed') }))
  }
  const withoutDocument = recon.filter((r) => r.provider.reason === 'no_document').length
  if (withoutDocument > 0) lines.push(T.summary_tools_without_documents(withoutDocument, recon.length))
  return lines
}

export function buildInternalDraftSnapshot(input: BuildDraftInput): SnapshotResult {
  if (ISSUED_RECORD_ID.test(input.record.record_id)) throw new InternalDraftSnapshotError('an issued Creator Record id cannot be used for a draft')

  const draft = buildCreatorRecordDraft(input)
  if (!draft.ok) return { ok: false, issues: draft.issues }
  const { view, guidance } = draft
  const documents = input.documents ?? []
  const { observations } = formToObservations(loadFormConfig(input.sources), input.state, input.record)

  // ── C1: neutral fallback. Drop the comparison summary lines (fail closed if they cannot be located) ──
  const comparisonLines = reconciliationSummaryLines(view, documents.length)
  for (const line of comparisonLines) if (!view.summary.includes(line)) throw new InternalDraftSnapshotError('comparison summary line not found in the draft view')
  const summary = view.summary.filter((l) => !comparisonLines.includes(l) && l !== T.recon_none)
  const intro = summary.findIndex((l) => l === T.summary_not_assessment)
  summary.splice(intro >= 0 ? intro : summary.length, 0, D.summary_documents(documents.length))

  // ── Guidance: the view's cards, with the full provenance of the composition item they came from ──
  const items = new Map(guidance.composition.items.map((i) => [i.claim_id, i]))
  const cards: SnapshotGuidanceCard[] = view.guidance.cards.map((c) => {
    const item = items.get(c.claim_id)
    if (!item || item.conclusion !== c.conclusion) throw new InternalDraftSnapshotError(`guidance card ${c.claim_id} does not match its composition item`)
    if (c.conclusion_label !== T.conclusion_label[c.conclusion]) throw new InternalDraftSnapshotError(`guidance card ${c.claim_id} has a non-standard conclusion label`)
    const p = item.provenance
    return {
      claim_id: c.claim_id, subject: c.subject, conclusion: c.conclusion, conclusion_label: c.conclusion_label, explanation: c.explanation,
      basis: c.basis, depends_on: c.depends_on, open_item_labels: c.open_item_labels, caveats: c.caveats, source: c.source,
      provenance: {
        claim_last_verified: p.claim.last_verified,
        objective_id: p.objective.objective_id,
        objective_version: p.objective.version,
        bi_status: p.bounded_interpretation.status,
        publication_entry_id: p.publication.entry_id,
        publication_entry_version: p.publication.version,
        publication_approver: p.publication.approver,
        publication_decision_date: p.publication.decision_date,
      },
    }
  })

  const docItems: SnapshotDocument[] = documents.map((td) => {
    const d = td.document
    const v = view.documents.items.find((x) => x.document_id === d.document_id)
    if (!v) throw new InternalDraftSnapshotError('document missing from the draft view')
    return {
      document_id: d.document_id, tool_index: td.tool_index, heading: v.heading, file_name: d.file_name, sha256: d.sha256,
      outcome: d.outcome, extraction_mode: d.extraction_mode, versions: { ...d.versions }, model_calls: d.model_calls, rows: v.rows, notes: v.notes,
    }
  })

  const toolCount = input.state.tools.length
  const comparisonTools = Array.from({ length: toolCount }, (_, i) => {
    const doc = documents.find((d) => d.tool_index === i)
    return { tool_index: i, document_id: doc ? doc.document.document_id : null, line: doc ? D.comparison_tool_with_document(i + 1) : D.comparison_tool_without_document(i + 1) }
  })

  const snapshot: InternalDraftSnapshot = plain({
    schema: INTERNAL_DRAFT_SNAPSHOT_SCHEMA,
    schema_version: INTERNAL_DRAFT_SNAPSHOT_SCHEMA_VERSION,
    status: 'internal_unissued_draft' as const,
    generator_id: INTERNAL_DRAFT_GENERATOR_ID,
    comparison_policy: COMPARISON_POLICY,
    record: { draft_id: input.record.record_id, version: input.record.record_version, prepared_on: input.as_of, captured_at: input.record.captured_at, title: view.header.title },
    sources: {
      kind: input.sources.kind,
      approval: input.sources.kind === 'pilot' ? ('pilot_unapproved' as const) : ('governed_sources' as const),
      registry_version: input.sources.versions.registry,
      ledger_version: input.sources.versions.ledger,
      guidance_as_of: input.as_of,
    },
    missing_versions: [...NOT_YET_VERSIONED],
    pilot_notice: view.banner ? [view.banner.title, ...view.banner.lines] : [],
    summary,
    declarations: view.declarations,
    declared_observations: [...observations].sort((a, b) => (a.observation_id < b.observation_id ? -1 : a.observation_id > b.observation_id ? 1 : 0)),
    documents: { intro: view.documents.intro, items: docItems, empty: view.documents.empty },
    document_observations: view.trace.document_observations,
    comparison: { intro: documents.length > 0 ? D.comparison_intro : D.comparison_no_documents, tools: documents.length > 0 ? comparisonTools : [] },
    guidance: { intro: view.guidance.intro, empty: view.guidance.empty, cards },
    open_items: {
      intro: view.open_items.intro,
      empty: view.open_items.empty,
      not_established: view.open_items.not_established,
      items: view.open_items.items.map((o) => (o.documents === T.open_documents_some ? { ...o, documents: D.open_documents_some } : o)),
      documents_mentioned: view.open_items.documents_mentioned,
    },
    not_shown: view.not_shown,
    independent_review: view.independent_review,
    not_done: view.not_done.map((l) => (l === T.not_done_documents ? D.not_done_documents : l)),
    method: [
      ...view.method,
      { label: D.method_comparison_policy, value: D.method_comparison_policy_value },
      { label: D.method_snapshot_schema, value: `${INTERNAL_DRAFT_SNAPSHOT_SCHEMA} v${INTERNAL_DRAFT_SNAPSHOT_SCHEMA_VERSION}` },
      { label: D.method_generator, value: INTERNAL_DRAFT_GENERATOR_ID },
      { label: D.method_missing_versions, value: NOT_YET_VERSIONED.join(', ') },
    ],
  })

  const canonical = canonicalJson(snapshot)
  return { ok: true, snapshot, canonical, sha256: sha256Hex(canonical) }
}

/** True only when `sha256` is the digest of this snapshot's canonical form. */
export function snapshotDigestMatches(snapshot: InternalDraftSnapshot, sha256: string): boolean {
  return /^[0-9a-f]{64}$/.test(sha256) && sha256Hex(canonicalJson(snapshot)) === sha256
}
