/**
 * CR-V2-EXAM-INTEGRATION-X0 — the provisional comparison between a creator's declaration for one tool block and
 * one PERSISTED examination of a document attached to it.
 *
 * Pure. No new comparison logic: the existing, unchanged `reconcileToolEvidence` and seller-identity resolution
 * run on the receipt reading recovered exactly from the examination envelope (`../examination/receipt-reading`).
 * When the reading cannot be recovered exactly, the document counts as not read and every result is
 * `not_assessed`. A comparison is derived, never supplied: it is recomputed for every record version from that
 * version's own declarations, so it can never outlive the declaration it compared (Option C).
 *
 * A comparison is a labelled, provisional description ("appears consistent", "appears to conflict", "does not
 * establish", "not assessed"). It is never a verification, never a guidance input and never changes a declaration.
 */

import type { ExaminationEnvelope } from '../examination/envelope'
import { receiptReadingOf } from '../examination/receipt-reading'
import { resolveSellerIdentity } from '../integration/seller-identity'
import { reconcileToolEvidence, type EvidenceReconciliation, type ExaminedDocument } from './document-observations'
import { notRun } from './plan-cross-check'

/**
 * The comparison method a new record names. CR-V2-DOC-LIVE-1A: version 2 makes no determination, positive or negative. A declaration
 * and an observation are shown separately. `comparePersistedExamination` below could record "appears consistent" without the plan
 * cross-check that known omissions need (it passes `notRun`), and a model that omits a plan looks exactly like a document with one.
 */
export const PERSISTED_COMPARISON_METHOD = { id: 'si8/creator-record-v2-evidence-reconciliation', version: 2 } as const
/** What records made before version 2 name. They stay readable exactly as stored. */
export const HISTORICAL_COMPARISON_METHOD = { id: 'si8/creator-record-v2-evidence-reconciliation', version: 1 } as const
/** The only result version 2 records. */
export const COMPARISON_WITHHELD = { result: 'not_assessed', reason: 'determination_withheld' } as const

export interface PersistedComparisonInput {
  tool_index: number
  /** The record's own document id (the evidence store id). */
  document_id: string
  file_name: string
  envelope: ExaminationEnvelope
  /** The canonical tool the creator's own answer resolved to, or null. */
  declared_tool_id: string | null
  /** The creator's plan answer as given; null or "not_sure" when none. */
  declared_plan: string | null
}

export function comparePersistedExamination(input: PersistedComparisonInput): EvidenceReconciliation {
  const e = input.envelope
  const reading = receiptReadingOf(e)
  const document: ExaminedDocument = {
    document_id: input.document_id,
    file_name: input.file_name,
    sha256: e.document.sha256,
    bytes: e.document.byte_size,
    detected_media_type: e.document.media_type,
    outcome: reading ? 'document_examined' : 'could_not_examine',
    reason: null,
    extraction_mode: 'fixture_replay',
    replay_fixture_id: e.provenance.replay_fixture_id,
    versions: { schema: e.profile.schema, prompt: e.profile.prompt, replay_set: e.executor.replay_set },
    model_calls: 0,
    extraction: reading,
    cross_check: notRun('persisted_examination'),
  }
  return reconcileToolEvidence(
    { tool_index: input.tool_index, document, declared_tool_id: input.declared_tool_id, declared_plan: input.declared_plan },
    resolveSellerIdentity,
  )
}
