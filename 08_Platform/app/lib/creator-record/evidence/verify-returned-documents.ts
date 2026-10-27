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
 */

import { RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtraction } from '../receipt-examination/schema'
import { extractionMode } from './config'
import type { ToolDocument } from './document-observations'
import { DEFAULT_REPLAY_TABLE, REPLAY_SET_VERSION, type ReplayTable } from './replay'

const canonical = (v: unknown) => JSON.stringify(v)

export function verifyReturnedDocument(td: ToolDocument, table: ReplayTable = DEFAULT_REPLAY_TABLE, mode = extractionMode()): boolean {
  const d = td.document
  if (mode !== 'fixture_replay' || d.extraction_mode !== 'fixture_replay' || d.model_calls !== 0) return false
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

export function verifyReturnedDocuments(docs: readonly ToolDocument[], table: ReplayTable = DEFAULT_REPLAY_TABLE, mode = extractionMode()): boolean {
  return docs.every((d) => verifyReturnedDocument(d, table, mode))
}
