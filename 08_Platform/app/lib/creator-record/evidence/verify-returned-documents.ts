/**
 * CR-V2-EVIDENCE-PROD-UAT-1 — server-side check of documents the browser sends
 * back with the answers (nothing is stored, so they come back from the page).
 *
 * In a fixture-replay-only build every legitimate observation can be
 * re-derived from SI8's own replay table, so the browser's copy is checked
 * against it rather than trusted:
 *   - only `fixture_replay` documents are accepted (live extraction is locked
 *     off in this build, `./config.ts`); a document labelled `live_model` is
 *     refused;
 *   - an examined document must name a fixture whose SHA-256 is in the table,
 *     and its extraction must equal the table's validated extraction exactly;
 *   - a "received but not read" document must NOT be a known fixture;
 *   - versions must be the current ones.
 * Display-only either way; this only prevents a page from showing a forged or
 * mislabelled observation. Server-only (loads the replay table).
 *
 * CR-V2-MVP-1: in a build that PERMITS live extraction (code lock lifted and
 * the environment set), a `live_model` document cannot be re-derived (nothing
 * is stored), so it is accepted only in its strictly parsed form, labelled
 * live, with 1–2 model calls, the current schema and prompt versions and no
 * replay id. It stays display-only: it never reaches the guidance pipeline.
 * In the locked build (the default) a `live_model` document is refused.
 *
 * CR-V2-MVP-7: a `live_model` observation is accepted only with a valid
 * server-issued attestation (`./attestation.ts`) bound to the requesting
 * admin's verified user and session, unexpired, over the observation exactly
 * as received. A fixture-replay document must carry no attestation.
 *
 * CR-V2-MVP-6: the G-R2 text-layer cross-check is deferred (unwired from the
 * MVP path), so a returned document must carry the "not run" result the
 * examine route now always produces. Any other cross-check result is a
 * forged or stale field and is refused.
 */

import { RECEIPT_PROMPT_VERSION } from '../receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction } from '../receipt-examination/schema'
import { checkAttestation, type EvidenceContext } from './attestation'
import { extractionMode } from './config'
import type { ToolDocument } from './document-observations'
import { DEFAULT_REPLAY_TABLE, REPLAY_SET_VERSION, type ReplayTable } from './replay'

const canonical = (v: unknown) => JSON.stringify(v)

/** What the server needs to accept a live observation. Absent → every live observation is refused. */
export interface LiveEvidenceCheck {
  /** The requester's verified context; null when it could not be verified. */
  context: EvidenceContext | null
  /** The server-only signing key; null when not configured. */
  key: Buffer | null
  now_ms: number
}

export function verifyReturnedDocument(td: ToolDocument, table: ReplayTable = DEFAULT_REPLAY_TABLE, mode = extractionMode(), live?: LiveEvidenceCheck): boolean {
  const d = td.document
  if (d.cross_check.status !== 'not_run' || d.cross_check.other_plan_names.length > 0 || d.cross_check.provider !== null) return false
  if (d.extraction_mode === 'live_model') {
    if (mode !== 'live_model' || d.replay_fixture_id !== null || d.model_calls < 1 || d.model_calls > 2) return false
    if (!live || !live.context || !live.key || checkAttestation(td.attestation, d, live.context, live.key, live.now_ms) !== 'valid') return false
    if (d.versions.schema !== RECEIPT_EXTRACTION_SCHEMA_VERSION || d.versions.prompt !== RECEIPT_PROMPT_VERSION || d.versions.replay_set !== null) return false
    return d.outcome === 'document_examined' ? validateReceiptExtraction(d.extraction) !== null : d.extraction === null
  }
  if (td.attestation !== undefined) return false
  if (d.extraction_mode !== 'fixture_replay' || d.model_calls !== 0) return false
  if (d.versions.schema !== RECEIPT_EXTRACTION_SCHEMA_VERSION || d.versions.prompt !== null || d.versions.replay_set !== REPLAY_SET_VERSION) return false
  const entry = table.get(d.sha256)
  switch (d.outcome) {
    case 'document_examined': {
      if (!entry || entry.fixture_id !== d.replay_fixture_id) return false
      const expected = validateReceiptExtraction(entry.parsed_output)
      return expected !== null && canonical(expected) === canonical(d.extraction)
    }
    case 'document_provided_not_examined':
      return !entry && d.replay_fixture_id === null
    case 'could_not_examine':
      // Rejected before examination (format, size, empty) or a replay entry that failed the schema.
      return d.extraction === null && (d.reason === 'schema_invalid' ? !!entry && entry.fixture_id === d.replay_fixture_id : d.replay_fixture_id === null && ['unsupported_format', 'file_too_large', 'empty_file'].includes(d.reason ?? ''))
  }
}

export function verifyReturnedDocuments(docs: readonly ToolDocument[], table: ReplayTable = DEFAULT_REPLAY_TABLE, mode = extractionMode(), live?: LiveEvidenceCheck): boolean {
  return docs.every((d) => verifyReturnedDocument(d, table, mode, live))
}
