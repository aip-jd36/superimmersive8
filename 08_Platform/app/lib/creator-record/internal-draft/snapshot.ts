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
 *   - C1 (PM decision for OC-1): NEUTRAL FALLBACK only. OC-1B: the prototype's
 *     view is read only through the structured projection in `./projection`,
 *     which never reads its summary, its reconciliation, its evidence-
 *     reconciliation trace or a document's G-R2 cross-check, and refuses any
 *     field it does not know. The summary is built from structured counts and the
 *     internal templates; nothing is filtered by matching wording.
 *   - Versions are recorded only where they exist. Missing ones are listed in
 *     `missing_versions`; none is invented. Pilot sources are recorded as
 *     unapproved. The internal templates carry their own version (OC-1B).
 *   - A draft never carries an issued Creator Record id.
 */

import type { DeclaredObservation, DocumentObservation } from '../contract/provenance'
import type { CreatorRecordConclusion } from '../contract/compose'
import type { CreatorRecordGuidanceResult } from '../integration/run-creator-record-guidance'
import type { DraftDeclarationGroup, DraftNotEstablished, DraftOpenItem, DraftRecordView, DraftRow } from '../presentation/build-draft-record'
import { T } from '../presentation/templates'
import { buildCreatorRecordDraft, loadFormConfig, type BuildDraftInput } from '../prototype/build-draft'
import { formToObservations, type FormIssue } from '../prototype/form'
import { canonicalJson, sha256Hex } from './canonical'
import { projectPermittedDraft } from './projection'
import { internalDraftTemplateContract, type InternalDraftTemplateContract } from './template-contract'
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
  /** The internal draft template contract (id, version, fingerprint). Not the prototype's templates, which have no version. */
  templates: InternalDraftTemplateContract
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

export function buildInternalDraftSnapshot(input: BuildDraftInput): SnapshotResult {
  if (ISSUED_RECORD_ID.test(input.record.record_id)) throw new InternalDraftSnapshotError('an issued Creator Record id cannot be used for a draft')
  const draft = buildCreatorRecordDraft(input)
  if (!draft.ok) return { ok: false, issues: draft.issues }
  return snapshotFromDraft(input, draft.view, draft.guidance)
}

/**
 * The snapshot of one draft, built from the structured projection of the
 * prototype's output (`./projection`). Exported so tests can alter that output.
 * Throws `InternalDraftProjectionError` when the output has an unknown, missing
 * or ill-typed field, and `InternalDraftTemplateContractError` when the
 * templates changed without a version update.
 */
export function snapshotFromDraft(input: BuildDraftInput, draftView: DraftRecordView, guidance: CreatorRecordGuidanceResult): { ok: true; snapshot: InternalDraftSnapshot; canonical: string; sha256: string } {
  if (ISSUED_RECORD_ID.test(input.record.record_id)) throw new InternalDraftSnapshotError('an issued Creator Record id cannot be used for a draft')
  const templates = internalDraftTemplateContract()
  const { view, documents } = projectPermittedDraft(draftView, input.documents ?? [])
  const { observations } = formToObservations(loadFormConfig(input.sources), input.state, input.record)
  const hasDocuments = documents.length > 0

  // ── Guidance: the projected cards, with the full provenance of the composition item they came from ──
  const items = new Map(guidance.composition.items.map((i) => [i.claim_id, i]))
  if (view.guidance.cards.length !== guidance.composition.items.length) throw new InternalDraftSnapshotError('guidance cards do not correspond to the composition items')
  const cards: SnapshotGuidanceCard[] = view.guidance.cards.map((c) => {
    const item = items.get(c.claim_id)
    if (!item || item.conclusion !== c.conclusion) throw new InternalDraftSnapshotError(`guidance card ${c.claim_id} does not match its composition item`)
    if (c.conclusion_label !== T.conclusion_label[c.conclusion]) throw new InternalDraftSnapshotError(`guidance card ${c.claim_id} has a non-standard conclusion label`)
    const p = item.provenance
    return {
      ...c,
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

  // ── Summary (C1): structured counts and internal templates only. The prototype's summary list is never read. ──
  const unresolved = cards.filter((c) => c.conclusion === 'relevant_applicability_unresolved').length
  const conditions = view.open_items.not_established.length + view.open_items.items.length
  const summary = [
    D.summary_intro,
    D.summary_counts(cards.length, unresolved),
    ...(cards.length > 0 ? [D.summary_conditions(conditions)] : []),
    D.summary_documents(documents.length),
    D.summary_not_assessment,
  ]

  // The projection guarantees the view's documents correspond one to one, in order.
  const docItems: SnapshotDocument[] = documents.map((td, i) => {
    const d = td.document
    const v = view.documents.items[i]
    return {
      document_id: d.document_id, tool_index: td.tool_index, heading: v.heading, file_name: d.file_name, sha256: d.sha256,
      outcome: d.outcome, extraction_mode: d.extraction_mode, versions: d.versions, model_calls: d.model_calls, rows: v.rows, notes: v.notes,
    }
  })

  const toolCount = input.state.tools.length
  if (documents.some((d) => d.tool_index >= toolCount)) throw new InternalDraftSnapshotError('a document is attached to a tool that was not declared')
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
    templates,
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
    documents: { intro: D.documents_intro, items: docItems, empty: hasDocuments ? null : D.comparison_no_documents },
    document_observations: view.trace.document_observations,
    comparison: { intro: hasDocuments ? D.comparison_intro : D.comparison_no_documents, tools: hasDocuments ? comparisonTools : [] },
    guidance: { intro: view.guidance.intro, empty: view.guidance.empty, cards },
    open_items: {
      intro: view.open_items.intro,
      empty: view.open_items.empty,
      not_established: view.open_items.not_established,
      items: view.open_items.items.map((o) => ({ ...o, documents: hasDocuments ? D.open_documents_some : D.open_documents_none })),
      documents_mentioned: view.open_items.documents_mentioned,
    },
    not_shown: view.not_shown,
    independent_review: view.independent_review,
    not_done: [...D.not_done_base, ...(hasDocuments ? [D.not_done_documents] : [])],
    method: [
      ...view.method,
      { label: D.method_comparison_policy, value: D.method_comparison_policy_value },
      { label: D.method_snapshot_schema, value: `${INTERNAL_DRAFT_SNAPSHOT_SCHEMA} v${INTERNAL_DRAFT_SNAPSHOT_SCHEMA_VERSION}` },
      { label: D.method_templates, value: `${templates.id} v${templates.version} (${templates.fingerprint})` },
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
