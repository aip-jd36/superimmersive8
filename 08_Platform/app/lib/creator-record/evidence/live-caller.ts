/**
 * CR-V2-EVIDENCE-SLICE-1 — the live extraction adapter, behind the gate.
 *
 * The Anthropic adapter (`../receipt-examination/examine.anthropic.ts`, the
 * only SDK importer in lib/creator-record) is reached ONLY through the dynamic
 * import below, and only after `liveExtractionEnabled()` is true. With the
 * gate off this throws before anything is loaded or constructed.
 *
 * Bounds: one request per caller invocation (adapter `maxRetries: 0`), at most
 * two invocations per document (`examineReceiptDocument`), 25 s per request.
 */

import type { ReceiptModelCaller } from '../receipt-examination/examine'
import { liveExtractionEnabled } from './config'

export const LIVE_REQUEST_TIMEOUT_MS = 25_000

export async function loadLiveCaller(env: Readonly<Record<string, string | undefined>> = process.env): Promise<ReceiptModelCaller> {
  if (!liveExtractionEnabled(env)) throw new Error('Live document examination is disabled.')
  const adapter = await import('../receipt-examination/examine.anthropic')
  return adapter.createAnthropicReceiptCaller({ timeoutMs: LIVE_REQUEST_TIMEOUT_MS })
}
