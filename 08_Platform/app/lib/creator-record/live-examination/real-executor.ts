/**
 * CR-V2-DOC-LIVE-1B — the real executor for envelope v3. Disabled, and imported by nothing (test-enforced).
 *
 * Not a second pipeline: the same engine, profile, retry policy and envelope as a mocked examination. This is one more `LiveExecutor`,
 * over the existing Anthropic adapter (`../receipt-examination/examine.anthropic.ts`, still the only SDK importer here), which is loaded
 * with a dynamic import only after every lock has passed. With the code lock false this throws on its first line.
 *
 * What it adds around each request:
 *   - a pinned model and the dedicated key (`../evidence/live-caller`), no environment override, no SDK retries;
 *   - a deadline, so a request that does not end becomes a timeout rather than a hang;
 *   - the model in the response must be the model requested, so the provenance is true;
 *   - a parsed output counts only with `end_turn`: a truncated or refused response is never a reading;
 *   - fixed failure kinds, with no error text kept;
 *   - a spend guard: each attempt reserves its planning maximum first, and is refused when the ceiling cannot cover it.
 *
 * Holds counts and token totals only. Nothing here logs, and no prompt, document or model text is kept.
 */

import { isStructuredOutputParseFailure } from '@/lib/interview-engine/anthropic-structured-output-retry'
import { LIVE_EXTRACTION_API_KEY_ENV, LIVE_EXTRACTION_MODEL, LIVE_REQUEST_TIMEOUT_MS, withInstanceBudget } from '../evidence/live-caller'
import type { ProviderFailureKind } from '../receipt-examination/examine.anthropic'
import type { ReceiptModelCaller, ReceiptModelResponse } from '../receipt-examination/examine'
import { estimatedUsd, LIVE_BOUNDS, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, liveEvaluationEnabled, parseLiveEvaluationAuthorization, unsafeSdkEnvironment, worstCaseAttemptUsd } from './controls'
import { LiveModelTimeout, MAX_LIVE_ATTEMPTS, type LiveAttemptGuard, type LiveExecutor } from './examine'

export class LiveExaminationDisabled extends Error {
  constructor(reason: string) {
    super(`live_examination_disabled:${reason}`)
  }
}

export type LiveFailureKind = ProviderFailureKind | 'model_mismatch' | 'unexpected_response' | 'not_reserved'

/** A provider failure of a fixed kind. Its message is the kind alone. */
export class LiveProviderFailure extends Error {
  constructor(readonly kind: LiveFailureKind) {
    super(`live_provider_failure:${kind}`)
  }
}

/** These do not get better by trying again, so the run stops admitting attempts. */
const RUN_STOPPING: readonly LiveFailureKind[] = ['auth', 'rejected', 'model_mismatch', 'not_reserved']

export interface LiveAnthropicAdapter {
  createAnthropicReceiptCaller(options: { model: string; apiKeyEnv: string; timeoutMs: number }): ReceiptModelCaller
  classifyAnthropicFailure(err: unknown): ProviderFailureKind
}

/** Metadata for the evaluation report. No content. */
export interface LiveRunReport {
  attempts_admitted: number
  requests: number
  /** Responses that carried complete token usage. Fewer than `requests` means the true cost is unknown. */
  responses_with_usage: number
  input_tokens: number
  output_tokens: number
  total_request_ms: number
  estimated_usd: number
  reserved_usd: number
  not_end_turn: number
  parse_failures: number
  failures: Partial<Record<LiveFailureKind, number>>
  stopped: LiveFailureKind | 'over_ceiling' | null
}

export interface RealLiveExecutor extends LiveExecutor {
  guard: LiveAttemptGuard
  report(): LiveRunReport
}

export interface LoadRealExecutorOptions {
  env?: Readonly<Record<string, string | undefined>>
  now?: () => Date
  /** Test seam. The default is the only import of the adapter. */
  loadAdapter?: () => Promise<LiveAnthropicAdapter>
  deadlineMs?: number
}

const withDeadline = async <T>(work: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new LiveModelTimeout()), ms)
  })
  try {
    return await Promise.race([work, deadline])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function loadRealLiveExecutor(rawAuthorization: unknown, options: LoadRealExecutorOptions = {}): Promise<RealLiveExecutor> {
  if (LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD !== true) throw new LiveExaminationDisabled('code_lock')
  const env = options.env ?? process.env
  // The SDK reads the process environment itself, whatever `env` the caller passes, so both are checked.
  if (unsafeSdkEnvironment(env, process.env).length > 0) throw new LiveExaminationDisabled('unsafe_sdk_environment')
  const now = options.now ?? (() => new Date())
  const authorization = parseLiveEvaluationAuthorization(rawAuthorization)
  if (!authorization) throw new LiveExaminationDisabled('authorization_invalid')
  if (!liveEvaluationEnabled(env, authorization, now())) throw new LiveExaminationDisabled('authorization_not_in_force')
  if (!env[LIVE_EXTRACTION_API_KEY_ENV]) throw new LiveExaminationDisabled('dedicated_key_missing')
  const model = LIVE_EXTRACTION_MODEL
  const attemptUsd = worstCaseAttemptUsd(model)
  if (attemptUsd === null) throw new LiveExaminationDisabled('model_not_priced')

  const adapter = await (options.loadAdapter ?? (() => import('../receipt-examination/examine.anthropic') as Promise<LiveAnthropicAdapter>))()
  const maxAttempts = authorization.permitted_documents.length * MAX_LIVE_ATTEMPTS
  const caller = withInstanceBudget(adapter.createAnthropicReceiptCaller({ model, apiKeyEnv: LIVE_EXTRACTION_API_KEY_ENV, timeoutMs: LIVE_REQUEST_TIMEOUT_MS }), maxAttempts * LIVE_BOUNDS.max_requests_per_attempt, { used: 0 })
  const deadlineMs = options.deadlineMs ?? LIVE_REQUEST_TIMEOUT_MS + LIVE_BOUNDS.deadline_margin_ms
  const permitted = new Set(authorization.permitted_documents.map((d) => d.sha256))

  const r: LiveRunReport = { attempts_admitted: 0, requests: 0, responses_with_usage: 0, input_tokens: 0, output_tokens: 0, total_request_ms: 0, estimated_usd: 0, reserved_usd: 0, not_end_turn: 0, parse_failures: 0, failures: {}, stopped: null }
  const fail = (kind: LiveFailureKind) => {
    r.failures[kind] = (r.failures[kind] ?? 0) + 1
    if (RUN_STOPPING.includes(kind) && r.stopped === null) r.stopped = kind
  }

  return {
    identity: { mode: 'live_model', provider: 'anthropic', model },
    guard: {
      documentPermitted: (sha256) => permitted.has(sha256),
      reserveAttempt() {
        if (r.stopped !== null || !liveEvaluationEnabled(env, authorization, now())) return false
        if (Math.max(r.reserved_usd, r.estimated_usd) + attemptUsd > authorization.max_estimated_usd) return false
        r.reserved_usd += attemptUsd
        r.attempts_admitted += 1
        return true
      },
    },
    report: () => ({ ...r, failures: { ...r.failures } }),
    async callModel(request) {
      if (request.maxTokens > LIVE_BOUNDS.max_output_tokens_per_request) throw new LiveProviderFailure('rejected')
      // Every request belongs to an admitted attempt: nothing reaches the provider without a reservation.
      if (r.requests >= r.attempts_admitted * LIVE_BOUNDS.max_requests_per_attempt) {
        fail('not_reserved')
        throw new LiveProviderFailure('not_reserved')
      }
      r.requests += 1
      const started = now().getTime()
      let response: ReceiptModelResponse
      try {
        response = await withDeadline(caller(request), deadlineMs)
      } catch (err) {
        if (err instanceof LiveModelTimeout) {
          fail('timeout')
          throw err
        }
        // The engine's one recovery retry depends on seeing this exact error.
        if (isStructuredOutputParseFailure(err)) {
          r.parse_failures += 1
          throw err
        }
        const kind = adapter.classifyAnthropicFailure(err)
        fail(kind)
        throw kind === 'timeout' ? new LiveModelTimeout() : new LiveProviderFailure(kind)
      } finally {
        r.total_request_ms += now().getTime() - started
      }
      if (typeof response !== 'object' || response === null || typeof response.id !== 'string' || !Array.isArray(response.content)) {
        fail('unexpected_response')
        throw new LiveProviderFailure('unexpected_response')
      }
      const usage = response.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined
      const known = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
      if (usage && known(usage.input_tokens) && known(usage.output_tokens)) {
        r.input_tokens += usage.input_tokens
        r.output_tokens += usage.output_tokens
        r.responses_with_usage += 1
      }
      r.estimated_usd = estimatedUsd(model, r.input_tokens, r.output_tokens) ?? r.estimated_usd
      if (r.estimated_usd > authorization.max_estimated_usd && r.stopped === null) r.stopped = 'over_ceiling'
      if ((response as unknown as { model?: unknown }).model !== model) {
        fail('model_mismatch')
        throw new LiveProviderFailure('model_mismatch')
      }
      if (response.stop_reason !== 'end_turn') {
        r.not_end_turn += 1
        return { ...response, parsed_output: null }
      }
      return response
    },
  }
}
