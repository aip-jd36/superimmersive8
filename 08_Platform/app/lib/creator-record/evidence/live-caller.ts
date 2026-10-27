/**
 * CR-V2-EVIDENCE-SLICE-1 / CR-V2-MVP-1 — the live extraction adapter, behind the gate.
 *
 * The Anthropic adapter (`../receipt-examination/examine.anthropic.ts`, the
 * only SDK importer in lib/creator-record) is reached ONLY through the dynamic
 * import below, and only after `liveExtractionEnabled()` is true (code lock AND
 * environment, `./config.ts`). With the gate off this throws before anything
 * is loaded or constructed.
 *
 * Safeguards on the live path (CR-V2-MVP-1):
 *   - model pinned in code (`LIVE_EXTRACTION_MODEL`): the model the receipt
 *     spike was evaluated with (SPIKE-1C/1E, synthetic fixtures); no env
 *     override on the app path, so a model cannot change without review;
 *   - a DEDICATED key (`LIVE_EXTRACTION_API_KEY_ENV`): intended for a separate
 *     Anthropic workspace whose monthly spend limit is the hard cost cap; absent
 *     → fail closed (the shared ANTHROPIC_API_KEY is never used here);
 *   - one request per invocation (adapter `maxRetries: 0`), at most two
 *     invocations per document (`examineReceiptDocument`), 25 s per request;
 *   - a per-server-instance budget (`LIVE_MAX_MODEL_CALLS_PER_INSTANCE`):
 *     once spent, the caller throws without calling (→ `model_error`). Best
 *     effort only (serverless instances each hold their own count); the
 *     workspace spend limit and the firewall are the real limits.
 */

import type { ReceiptModelCaller } from '../receipt-examination/examine'
import { liveExtractionEnabled } from './config'

export const LIVE_REQUEST_TIMEOUT_MS = 25_000
export const LIVE_EXTRACTION_MODEL = 'claude-sonnet-5'
export const LIVE_EXTRACTION_API_KEY_ENV = 'CREATOR_RECORD_EXTRACTION_API_KEY'
export const LIVE_MAX_MODEL_CALLS_PER_INSTANCE = 40

/** A call budget. The app's live path shares ONE per server instance; a bounded run (e.g. an acceptance test) brings its own. */
export interface CallBudget {
  used: number
}
const INSTANCE_BUDGET: CallBudget = { used: 0 }

/** Test seam only: the per-instance budget used so far. */
export function liveCallsUsedThisInstance(): number {
  return INSTANCE_BUDGET.used
}

/**
 * Wraps a caller with a hard call budget: once `max` calls have been made
 * against `budget`, further invocations throw WITHOUT calling the model.
 */
export function withInstanceBudget(caller: ReceiptModelCaller, max: number = LIVE_MAX_MODEL_CALLS_PER_INSTANCE, budget: CallBudget = INSTANCE_BUDGET): ReceiptModelCaller {
  return async (request) => {
    if (budget.used >= max) throw new Error('Live document examination budget is spent.')
    budget.used += 1
    return caller(request)
  }
}

export async function loadLiveCaller(env: Readonly<Record<string, string | undefined>> = process.env): Promise<ReceiptModelCaller> {
  if (!liveExtractionEnabled(env)) throw new Error('Live document examination is disabled.')
  if (!env[LIVE_EXTRACTION_API_KEY_ENV]) throw new Error('Live document examination needs its dedicated key.')
  const adapter = await import('../receipt-examination/examine.anthropic')
  return withInstanceBudget(adapter.createAnthropicReceiptCaller({ model: LIVE_EXTRACTION_MODEL, apiKeyEnv: LIVE_EXTRACTION_API_KEY_ENV, timeoutMs: LIVE_REQUEST_TIMEOUT_MS }))
}
