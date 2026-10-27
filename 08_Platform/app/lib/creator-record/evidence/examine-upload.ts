/**
 * CR-V2-EVIDENCE-SLICE-1 — examine one uploaded document, fail closed.
 *
 * Server-only. Reuses the receipt-examination contract unchanged
 * (`examineReceiptDocument`: byte-sniffed format, size ceiling, at most two
 * model calls, schema validation, no repair). This wrapper adds only:
 *   - a stricter size ceiling (MAX_UPLOAD_BYTES) and a SHA-256 of the bytes;
 *   - the extraction mode: `fixture_replay` (default, zero model calls) or
 *     `live_model` (only with a caller the route obtained behind the
 *     disabled-by-default gate in `./config.ts`);
 *   - the labelled, display-only `ExaminedDocument`.
 *
 * Nothing is stored, logged or returned beyond the structured observation:
 * the bytes stay in this call's memory only. Every rejected input is decided
 * BEFORE any model call.
 */

import { createHash } from 'node:crypto'
import { detectMediaType, examineReceiptDocument, type ReceiptModelCaller } from '../receipt-examination/examine'
import { RECEIPT_PROMPT_VERSION } from '../receipt-examination/prompt'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION } from '../receipt-examination/schema'
import { documentIdFor, MAX_LIVE_UPLOAD_BYTES, MAX_UPLOAD_BYTES, sanitizeFileName, type ExaminedDocument, type ExtractionMode, type NotExaminedReason } from './document-observations'
import { extractPdfTextLayer } from './pdf-text-layer'
import { crossCheckPlan, notRun, type PlanScope } from './plan-cross-check'
import { DEFAULT_REPLAY_TABLE, REPLAY_SET_VERSION, type ReplayFixture, type ReplayTable } from './replay'

export interface ExamineUploadDeps {
  mode: ExtractionMode
  /** Required for `live_model`; never used in replay. */
  liveCaller?: ReceiptModelCaller
  replayTable?: ReplayTable
  /**
   * CR-V2-MVP-3 / -MVP-4 (G-R2): resolves the reported seller name to the
   * provider-scoped plan-name vocabulary for the text-layer cross-check.
   * Without it the cross-check is reported as not run — never as "nothing
   * else found".
   */
  planScope?: (seller: string | null) => PlanScope
}

const replayCaller = (fixture: ReplayFixture): ReceiptModelCaller => async () => ({
  id: 'fixture-replay',
  stop_reason: 'end_turn',
  content: [{ type: 'text' }],
  usage: { input_tokens: 0, output_tokens: 0 },
  parsed_output: fixture.parsed_output,
})

export async function examineUpload(bytes: Uint8Array, rawFileName: string | null | undefined, deps: ExamineUploadDeps): Promise<ExaminedDocument> {
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const media = detectMediaType(bytes)
  const base = {
    document_id: documentIdFor(sha256),
    file_name: sanitizeFileName(rawFileName),
    sha256,
    bytes: bytes.length,
    detected_media_type: media,
    extraction_mode: deps.mode,
  }
  const versions = (replay: boolean) => ({
    schema: RECEIPT_EXTRACTION_SCHEMA_VERSION,
    prompt: replay ? null : RECEIPT_PROMPT_VERSION,
    replay_set: replay ? REPLAY_SET_VERSION : null,
  })
  const notExamined = (reason: NotExaminedReason, outcome: ExaminedDocument['outcome'] = 'could_not_examine', model_calls = 0, replay_fixture_id: string | null = null): ExaminedDocument => ({
    ...base,
    outcome,
    reason,
    replay_fixture_id,
    versions: versions(deps.mode === 'fixture_replay'),
    model_calls,
    extraction: null,
    cross_check: notRun('not_examined'),
  })
  /** G-R2 on the same bytes, for whichever reading was made (replay or live). Deterministic; no model. */
  const crossCheck = (extraction: ExaminedDocument['extraction']) =>
    deps.planScope
      ? crossCheckPlan(
          extraction,
          media === 'application/pdf' ? extractPdfTextLayer(bytes) : { status: 'unavailable', reason: 'not_pdf' },
          deps.planScope(extraction && extraction.issuer_name.status === 'present' ? extraction.issuer_name.value : null),
        )
      : notRun('no_vocabulary')

  // Input checks: always before any model call.
  if (bytes.length === 0) return notExamined('empty_file')
  if (bytes.length > MAX_UPLOAD_BYTES) return notExamined('file_too_large')
  if (deps.mode === 'live_model' && bytes.length > MAX_LIVE_UPLOAD_BYTES) return notExamined('file_too_large')
  if (!media) return notExamined('unsupported_format')

  if (deps.mode === 'fixture_replay') {
    const fixture = (deps.replayTable ?? DEFAULT_REPLAY_TABLE).get(sha256)
    if (!fixture) return notExamined('no_replay_fixture', 'document_provided_not_examined')
    const outcome = await examineReceiptDocument(bytes, { callModel: replayCaller(fixture) })
    if (outcome.status !== 'examined') return notExamined(outcome.reason, 'could_not_examine', 0, fixture.fixture_id)
    return { ...base, outcome: 'document_examined', reason: null, replay_fixture_id: fixture.fixture_id, versions: versions(true), model_calls: 0, extraction: outcome.extraction, cross_check: crossCheck(outcome.extraction) }
  }

  if (!deps.liveCaller) return notExamined('model_error')
  const outcome = await examineReceiptDocument(bytes, { callModel: deps.liveCaller })
  const calls = outcome.usage.attempts
  if (outcome.status !== 'examined') return notExamined(outcome.reason, 'could_not_examine', calls)
  return { ...base, outcome: 'document_examined', reason: null, replay_fixture_id: null, versions: versions(false), model_calls: calls, extraction: outcome.extraction, cross_check: crossCheck(outcome.extraction) }
}
