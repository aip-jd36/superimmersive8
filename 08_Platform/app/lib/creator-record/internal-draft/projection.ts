/**
 * CR-OPTION-C-OC1B — the structured, fail-closed projection from the prototype's
 * output to the data the internal draft is permitted to use.
 *
 * Why: OC-1 removed the prototype's comparison lines from its flat `summary`
 * string list by recomputing and matching their exact wording. A wording change
 * (or a new comparison line) could then pass through. Here nothing is filtered by
 * text. The internal draft never reads the prototype's summary, its
 * reconciliation, its evidence-reconciliation trace, or any document field other
 * than identity and how it was read. It reads only the fields listed below, by
 * name and type.
 *
 * Fail closed, generically (combinators in `../record-core/projection`): every object is projected against an exact key list.
 * An unknown key (for example a new comparison field), a missing key or a value
 * of the wrong type stops the projection; nothing unrecognised is carried and no
 * neutral wording is invented for it. `WITHHELD` keys must be present (so the
 * shape is still known) but their values are never read.
 */

import { CREATOR_RECORD_CONCLUSIONS } from '../contract/compose'
import { OBSERVATION_SOURCE_KINDS, type DocumentObservation } from '../contract/provenance'
import { DOCUMENT_OUTCOMES, EXTRACTION_MODES, type ToolDocument } from '../evidence/document-observations'
import type { DraftDeclarationGroup, DraftDocument, DraftGuidanceCard, DraftNotEstablished, DraftRecordView, DraftRow } from '../presentation/build-draft-record'
import { arr, bool, hex64, int, nullable, obj, oneOf, opt, ProjectionRefusal, str, WITHHELD, type P } from '../record-core/projection'

export class InternalDraftProjectionError extends Error {
  constructor(path: string, reason: string) {
    super(`internal_draft_projection_refused: ${path}: ${reason}`)
  }
}

// ── What the internal draft may use ──

const row: P<DraftRow> = obj({ label: str, value: str, note: opt(str) })

const declarationGroup: P<DraftDeclarationGroup> = obj({ id: str, heading: str, rows: arr(row), note: opt(str) })

/** What a document appears to show (the prototype's document view is built from the document alone). */
const documentView: P<DraftDocument> = obj({ document_id: str, heading: str, rows: arr(row), notes: arr(str) })

const guidanceCard: P<Omit<DraftGuidanceCard, 'provenance'>> = obj({
  claim_id: str, subject: str, conclusion: oneOf(CREATOR_RECORD_CONCLUSIONS), conclusion_label: str, explanation: str,
  basis: arr(str), depends_on: arr(str), open_item_labels: arr(str), caveats: arr(str), source: str,
  // Full provenance is taken from the composition item instead (see snapshot.ts).
  provenance: WITHHELD,
})

const notEstablished: P<DraftNotEstablished> = obj({ key: str, label: str, told_us: str, status: str, for_guidance: arr(str), next: opt(str) })

/** An open item without the prototype's statement about documents (`documents`), which the internal draft states itself. */
const openItem = obj({ dependency_id: str, label: str, told_us: str, documents: WITHHELD, evidence: str, sufficiency: str, status: str, for_guidance: arr(str) })

const DOCUMENT_SOURCE_KINDS = OBSERVATION_SOURCE_KINDS.filter((k): k is DocumentObservation['source_kind'] => k !== 'customer_declared')

const documentObservation: P<DocumentObservation> = obj({
  observation_id: str, source_kind: oneOf(DOCUMENT_SOURCE_KINDS), record_id: str, record_version: int,
  file: nullable(obj({ sha256: hex64, category: str })), profile: nullable(obj({ id: str, version: str })),
  field: nullable(str), value: nullable(str), excerpt: nullable(str), captured_at: str, supersedes: nullable(str),
}) as P<DocumentObservation>

const permittedView = obj({
  pilot: bool,
  banner: nullable(obj({ title: str, lines: arr(str) })),
  header: obj({ title: str, record_title: WITHHELD, record_id: WITHHELD, version: WITHHELD, prepared_on: WITHHELD, status: WITHHELD }),
  // The prototype's summary mixes guidance counts with comparison counts. Never read: the internal summary is built from structured counts.
  summary: WITHHELD,
  declarations: obj({ intro: str, groups: arr(declarationGroup) }),
  documents: obj({ intro: WITHHELD, items: arr(documentView), empty: WITHHELD }),
  // Provisional comparison results (C1): never read.
  reconciliation: WITHHELD,
  guidance: obj({ intro: str, cards: arr(guidanceCard), empty: nullable(str) }),
  open_items: obj({ intro: str, not_established: arr(notEstablished), items: arr(openItem), empty: nullable(str), documents_mentioned: arr(row) }),
  not_shown: obj({ intro: nullable(str), lines: arr(str), empty: nullable(str) }),
  independent_review: obj({ intro: str, lines: arr(str) }),
  // Contains the prototype's document sentence; the internal draft composes its own list.
  not_done: WITHHELD,
  method: arr(row),
  trace: obj({
    objectives: WITHHELD, omissions: WITHHELD, governance_gaps: WITHHELD, dropped_facts: WITHHELD, discarded_answers: WITHHELD,
    document_observations: arr(documentObservation),
    // Server-computed comparison results (C1): never read.
    evidence_reconciliation: WITHHELD,
  }),
})

/** A document's identity and how it was read. Its extraction is used only through the prototype's document view; its G-R2 cross-check never. */
const toolDocument = obj({
  tool_index: int,
  document: obj({
    document_id: str, file_name: str, sha256: hex64, bytes: WITHHELD, detected_media_type: WITHHELD,
    outcome: oneOf(DOCUMENT_OUTCOMES), reason: WITHHELD, extraction_mode: oneOf(EXTRACTION_MODES), replay_fixture_id: WITHHELD,
    versions: obj({ schema: str, prompt: nullable(str), replay_set: nullable(str) }),
    model_calls: int, extraction: WITHHELD, cross_check: WITHHELD,
  }),
})

export type PermittedView = ReturnType<typeof permittedView>
export type PermittedDocument = ReturnType<typeof toolDocument>
export interface PermittedDraft {
  view: PermittedView
  documents: PermittedDocument[]
}

/**
 * Projects the prototype's draft view and the documents to the permitted data.
 * Throws `InternalDraftProjectionError` on any unknown, missing or ill-typed field,
 * and when the documents and the view's document list do not correspond one to one.
 */
export function projectPermittedDraft(view: DraftRecordView, documents: readonly ToolDocument[]): PermittedDraft {
  let v: PermittedView
  let docs: PermittedDocument[]
  try {
    v = permittedView(view, 'view')
    docs = arr(toolDocument)(documents, 'documents')
  } catch (err) {
    if (err instanceof ProjectionRefusal) throw new InternalDraftProjectionError(err.path, err.reason)
    throw err
  }
  const ids = docs.map((d) => d.document.document_id)
  if (new Set(ids).size !== ids.length) throw new InternalDraftProjectionError('documents', 'duplicate document id')
  if (v.documents.items.length !== docs.length || v.documents.items.some((d, i) => d.document_id !== ids[i])) throw new InternalDraftProjectionError('view.documents.items', 'does not correspond to the documents added')
  return { view: v, documents: docs }
}
