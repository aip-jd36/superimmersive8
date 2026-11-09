/**
 * PRODUCT-A-MVP-SPIKE-1A — synthetic receipt-examination evaluation runner.
 *
 *   npx tsx lib/creator-record/eval/run-receipt-eval.ts [options]
 *
 * Modes (default: dry-run — NO model call is possible in this mode):
 *   --mode dry-run   validate spec, fixtures and hashes; print the plan and a
 *                    token/cost ESTIMATE. Never constructs a model client.
 *   --mode mock      run the full pipeline with an offline "oracle" caller that
 *                    returns the ground truth. Exercises scoring; no network.
 *   --mode live      REAL, PAID Anthropic calls. Requires ALL of:
 *                      --confirm-paid-calls
 *                      --max-calls N     (hard limit on API requests, retries included)
 *                      --max-usd X       (PREDICTIVE, not a hard cap: checked before each document
 *                                         against its worst case; actual usage is only known after
 *                                         the response. Needs --input/--output-usd-per-mtok)
 *                      --model ID        exactly the live pin (CR-V2-DOC-LIVE-1C-B2B)
 *                      an Anthropic key in the process environment: CREATOR_RECORD_EXTRACTION_API_KEY if set, otherwise
 *                      ANTHROPIC_API_KEY (CR-V2-SYNTHETIC-KEY-REUSE-1; this synthetic tool only)
 *                    An external workspace spending limit is required before any paid run; nothing here replaces it.
 *
 * Other options:
 *   --subset first-paid | all | id1,id2   (default: first-paid)
 *   --repeats N                           (default 1; 2 measures run-to-run agreement)
 *   --input-usd-per-mtok X --output-usd-per-mtok Y
 *                                         explicit pricing for cost figures; omitted = no cost computed
 *   --model ID                            live only, and required: must equal the live pin. CREATOR_RECORD_RECEIPT_MODEL is
 *                                         never inherited, and live mode refuses while it names another model
 *   --fixtures-dir DIR                    generated fixtures (default eval/fixtures/generated)
 *   --out FILE                            JSON report path (default: OS temp directory)
 *   --truth-corrections FILE|default      ALSO score under versioned additive truth corrections;
 *                                         reported separately in `corrected`, never replacing `summary`
 *
 * The API key is never read by this file, logged or written to the report.
 *
 * CR-V2-DOC-LIVE-1C-B2B — synthetic compatibility workflow. Live mode now matches the live examination's provider settings: the pinned
 * model passed explicitly, the dedicated key, the 25-second request timeout, and no unsafe SDK environment variable. Every provider
 * request is recorded in `requests` (metadata only: models, stop reason, tokens, latency, outcome). The run stops before any further
 * request on an authentication failure, a rejected request, a response naming another model, a stop reason other than `end_turn` or
 * `max_tokens`, or a malformed response; a reading is accepted only from an `end_turn` response. Each fixture's live input bound is
 * computed offline in every mode (`live_input_bound`). None of this unlocks or reaches the live examination runner.
 */

import { writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  BASE_MAX_TOKENS,
  RETRY_MAX_TOKENS,
  examineReceiptDocument,
  type ExaminationOutcome,
  type ReceiptModelCaller,
  type ReceiptModelResponse,
} from '../receipt-examination/examine'
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT, RECEIPT_PROMPT_VERSION } from '../receipt-examination/prompt'
import { COMPARISON_RULES_VERSION } from '../receipt-examination/compare'
import { RECEIPT_EXTRACTION_SCHEMA, RECEIPT_EXTRACTION_SCHEMA_VERSION, EXTRACTED_FIELD_NAMES } from '../receipt-examination/schema'
import {
  DEFAULT_GENERATED_DIR,
  loadFixtureSpec,
  loadManifest,
  readFixtureBytes,
  resolveFixtures,
  selectFixtures,
  specSha256,
  type FixtureManifest,
  type ManifestEntry,
  type ResolvedFixture,
} from './fixtures'
import { applyTruthCorrections, DEFAULT_TRUTH_CORRECTIONS_PATH, loadTruthCorrections } from './truth-corrections'
import { isStructuredOutputParseFailure } from '@/lib/interview-engine/anthropic-structured-output-retry'
import { LIVE_EXTRACTION_API_KEY_ENV, LIVE_EXTRACTION_MODEL, LIVE_REQUEST_TIMEOUT_MS } from '../evidence/live-caller'
import { countPdfPages } from '../evidence/pdf-text-layer'
import { boundLiveInputTokens, LIVE_BOUNDS, LIVE_MODEL_PRICES, unsafeSdkEnvironment } from '../live-examination/controls'
/** The adapter's fixed failure kinds (`classifyAnthropicFailure`). Not imported: this file reaches the adapter only dynamically. */
type ProviderFailureKind = 'timeout' | 'rate_limited' | 'overloaded' | 'server_error' | 'auth' | 'rejected' | 'connection' | 'unknown'
import { SCORING_VERSION, scoreObservation, summarize, type EvalSummary, type Pricing, type RunObservation } from './score'

export type EvalMode = 'dry-run' | 'mock' | 'live'
/** Only the dedicated key's presence, CREATOR_RECORD_RECEIPT_MODEL and the unsafe SDK variables are consulted. */
export type EnvLike = Readonly<Record<string, string | undefined>>

export interface EvalOptions {
  mode: EvalMode
  subset: string
  repeats: number
  maxCalls: number | null
  maxUsd: number | null
  confirmPaidCalls: boolean
  pricing: Pricing | null
  model: string | null
  fixturesDir: string
  out: string | null
  truthCorrections: string | null
}

export interface LiveCaller {
  call: ReceiptModelCaller
  /** Fixed failure kind of a thrown provider error, decided by the SDK's own error classes. */
  classifyFailure: (err: unknown) => ProviderFailureKind
}

export interface EvalDeps {
  /** Constructs the real caller. Only ever invoked in live mode, after every guard passes. */
  createLiveCaller: (model: string, keyEnv: SyntheticCredentialEnv) => Promise<LiveCaller>
  log: (line: string) => void
}

export const defaultEvalDeps: EvalDeps = {
  createLiveCaller: async (model, keyEnv) => {
    const mod = await import('../receipt-examination/examine.anthropic')
    return {
      call: mod.createAnthropicReceiptCaller({ model, apiKeyEnv: keyEnv, timeoutMs: LIVE_REQUEST_TIMEOUT_MS }),
      classifyFailure: mod.classifyAnthropicFailure,
    }
  },
  log: (line) => console.log(line),
}

/** Failures that do not get better by trying again: the run stops before its next request. */
const RUN_STOPPING_FAILURES: readonly ProviderFailureKind[] = ['auth', 'rejected']
/** `end_turn` carries a reading; `max_tokens` carries none and gets the engine's one recovery retry. Anything else stops the run. */
const COMPATIBLE_STOP_REASONS: readonly string[] = ['end_turn', 'max_tokens']

/** One provider request. Metadata only: no prompt, document, model text or key. */
export interface RequestRecord {
  request_index: number
  fixture_id: string
  repeat: number
  /** 1 = the first request for the document, 2 = the engine's recovery retry. */
  attempt: number
  max_tokens: number
  requested_model: string
  /** As the response names it. Null when no response arrived. */
  response_model: string | null
  stop_reason: string | null
  /** Null when no response arrived, or it reported no usable count. */
  input_tokens: number | null
  output_tokens: number | null
  latency_ms: number
  outcome: 'parsed' | 'no_parsed_output' | 'parse_failure' | 'provider_error' | 'model_mismatch' | 'incompatible_stop_reason' | 'unexpected_response'
  error_kind: ProviderFailureKind | null
  /** The live examination's pre-call bound for this document, or null when the live bound refuses it. */
  live_bound_input_tokens: number | null
}

/** What the live examination's pre-call checks would say about a fixture. Computed offline. */
export interface LiveBoundRecord {
  fixture_id: string
  media_type: string
  bytes: number
  pdf_pages: number | null
  admitted: boolean
  input_tokens: number | null
  refusal: string | null
}

export function liveBoundFor(id: string, media: string, bytes: Uint8Array): LiveBoundRecord {
  const pdf = media === 'application/pdf'
  const pages = pdf ? countPdfPages(bytes) : null
  const base = { fixture_id: id, media_type: media, bytes: bytes.length, pdf_pages: pages }
  if (media !== 'application/pdf' && media !== 'image/png' && media !== 'image/jpeg') return { ...base, admitted: false, input_tokens: null, refusal: 'unsupported_media_type' }
  if (bytes.length > LIVE_BOUNDS.max_document_bytes) return { ...base, admitted: false, input_tokens: null, refusal: 'file_too_large' }
  if (pdf && pages !== null && pages > LIVE_BOUNDS.max_pdf_pages) return { ...base, admitted: false, input_tokens: null, refusal: 'too_many_pages' }
  const b = boundLiveInputTokens(bytes, media)
  return b.ok ? { ...base, admitted: true, input_tokens: b.input_tokens, refusal: null } : { ...base, admitted: false, input_tokens: null, refusal: b.reason }
}

export function parseArgs(argv: string[]): EvalOptions {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const mode = (get('--mode') ?? 'dry-run') as EvalMode
  if (!['dry-run', 'mock', 'live'].includes(mode)) throw new Error(`unknown --mode ${mode}`)
  const num = (name: string): number | null => {
    const v = get(name)
    if (v === undefined) return null
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number`)
    return n
  }
  const inP = num('--input-usd-per-mtok')
  const outP = num('--output-usd-per-mtok')
  if ((inP === null) !== (outP === null)) throw new Error('give both --input-usd-per-mtok and --output-usd-per-mtok, or neither')
  return {
    mode,
    subset: get('--subset') ?? 'first-paid',
    repeats: Math.max(1, Math.floor(num('--repeats') ?? 1)),
    maxCalls: num('--max-calls'),
    maxUsd: num('--max-usd'),
    confirmPaidCalls: argv.includes('--confirm-paid-calls'),
    pricing: inP === null || outP === null ? null : { input_usd_per_mtok: inP, output_usd_per_mtok: outP },
    model: get('--model') ?? null,
    fixturesDir: get('--fixtures-dir') ?? DEFAULT_GENERATED_DIR,
    out: get('--out') ?? null,
    truthCorrections: get('--truth-corrections') ?? null,
  }
}

/**
 * CR-V2-SYNTHETIC-KEY-REUSE-1 — the credential of a SYNTHETIC compatibility run. This tool reads only SI8's committed synthetic
 * fixtures (each checked against its manifest hash), so it may use SI8's existing Anthropic key. Precedence: the dedicated key
 * `CREATOR_RECORD_EXTRACTION_API_KEY` when set and non-empty, otherwise `ANTHROPIC_API_KEY`; neither = refused. Only the variable's
 * NAME is ever used or reported; the SDK reads the value itself. Nothing here loads `.env.local` or any other file.
 *
 * Unchanged and separate: the real-document evaluation runner and the app live path read ONLY the dedicated key, never
 * ANTHROPIC_API_KEY (pinned by synthetic-key-reuse-isolation.test.ts).
 */
export const SYNTHETIC_CREDENTIAL_SOURCES = [LIVE_EXTRACTION_API_KEY_ENV, 'ANTHROPIC_API_KEY'] as const
export type SyntheticCredentialEnv = (typeof SYNTHETIC_CREDENTIAL_SOURCES)[number]
export function syntheticCredentialEnv(env: EnvLike): SyntheticCredentialEnv | null {
  for (const name of SYNTHETIC_CREDENTIAL_SOURCES) {
    const v = env[name]
    if (typeof v === 'string' && v.trim() !== '') return name
  }
  return null
}

/** The repository this file belongs to (five levels above `lib/creator-record/eval`). A live report must be written outside it. */
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..')
export function insideRepository(file: string, root: string = REPOSITORY_ROOT): boolean {
  const rel = path.relative(path.resolve(root).toLowerCase(), path.resolve(file).toLowerCase())
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * Throws unless every live-mode guard is satisfied. Pure. The SDK reads the real process environment itself, whatever `env` is passed,
 * so both are checked for unsafe variables.
 */
export function assertLiveAllowed(opts: EvalOptions, env: EnvLike, processEnv: EnvLike = process.env): void {
  if (opts.mode !== 'live') return
  if (!opts.confirmPaidCalls) throw new Error('live mode requires --confirm-paid-calls')
  if (opts.maxCalls === null || opts.maxCalls < 1) throw new Error('live mode requires --max-calls N (N >= 1)')
  if (opts.maxUsd === null || opts.maxUsd <= 0) throw new Error('live mode requires --max-usd X (X > 0)')
  if (!opts.pricing) throw new Error('live mode requires --input-usd-per-mtok and --output-usd-per-mtok (needed for --max-usd)')
  if (opts.model !== LIVE_EXTRACTION_MODEL) throw new Error(`live mode requires --model ${LIVE_EXTRACTION_MODEL}, the live pin`)
  const inherited = env.CREATOR_RECORD_RECEIPT_MODEL
  if (inherited !== undefined && inherited !== '' && inherited !== opts.model) throw new Error('live mode requires CREATOR_RECORD_RECEIPT_MODEL to be unset or to equal --model')
  const unsafe = unsafeSdkEnvironment(env, processEnv)
  if (unsafe.length > 0) throw new Error(`live mode requires these SDK variables to be unset: ${unsafe.join(', ')}`)
  if (!syntheticCredentialEnv(env)) throw new Error(`live mode requires an Anthropic key in the process environment: ${SYNTHETIC_CREDENTIAL_SOURCES.join(' or ')}`)
  // A paid run's report holds per-request metadata; it is written outside the repository (which is public).
  if (opts.out !== null && insideRepository(opts.out)) throw new Error('live mode requires --out to be outside the repository')
}

/** Whether the command-line pricing equals the live examination's cached price table for the model. Null outside live mode. */
function pricingMatchesLiveTable(opts: EvalOptions): boolean | null {
  if (opts.mode !== 'live' || !opts.pricing || !opts.model) return null
  const p = LIVE_MODEL_PRICES[opts.model]
  return !!p && p.input === opts.pricing.input_usd_per_mtok && p.output === opts.pricing.output_usd_per_mtok
}

// ---------------------------------------------------------------- estimates

const FIXED_PROMPT_TOKENS = Math.ceil((RECEIPT_EXAMINATION_SYSTEM_PROMPT.length + JSON.stringify(RECEIPT_EXTRACTION_SCHEMA).length) / 4) + 300
const ESTIMATED_OUTPUT_TOKENS = 450
const PDF_PAGE_IMAGE_TOKENS = 1600
/** Input estimates are rough; the spend guard assumes a request may be this many times larger. */
export const INPUT_ESTIMATE_SAFETY_FACTOR = 3

/** Rough input-token estimate. Labelled an ESTIMATE everywhere it is shown. */
export function estimateInputTokens(entry: ManifestEntry): number {
  if (entry.media_type === 'application/pdf') {
    return FIXED_PROMPT_TOKENS + PDF_PAGE_IMAGE_TOKENS + Math.ceil(entry.document_text.length / 4)
  }
  let w = entry.width ?? 1000
  let h = entry.height ?? 1000
  const longEdge = Math.max(w, h)
  if (longEdge > 1568) {
    w = (w * 1568) / longEdge
    h = (h * 1568) / longEdge
  }
  const mp = w * h
  if (mp > 1_150_000) {
    const k = Math.sqrt(1_150_000 / mp)
    w *= k
    h *= k
  }
  return FIXED_PROMPT_TOKENS + Math.ceil((w * h) / 750)
}

// ---------------------------------------------------------------- mock caller

/** Offline caller returning the ground truth in the model's output shape. No network. */
export function createOracleCaller(fixture: ResolvedFixture): ReceiptModelCaller {
  return async () => {
    const t = fixture.truth
    const fields = Object.fromEntries(
      EXTRACTED_FIELD_NAMES.map((f) => [
        f,
        { status: t[f].status, value: t[f].status === 'present' ? t[f].value : null, evidence: t[f].status === 'present' ? t[f].value : null },
      ]),
    )
    const parsed = {
      document_type: t.document_type,
      readability: t.readability,
      ...fields,
      plan_candidates: fixture.plan_names_shown.map((text) => ({ text, evidence: text, context: 'other' })),
      multiple_plans_shown: t.multiple_plans_shown ?? false,
      instruction_like_text_present: t.instruction_like_text_present ?? false,
    }
    const response: ReceiptModelResponse = {
      id: 'oracle',
      stop_reason: 'end_turn',
      content: [{ type: 'text' }],
      usage: { input_tokens: 0, output_tokens: 0 },
      parsed_output: parsed,
    }
    return response
  }
}

// ---------------------------------------------------------------- run

export interface EvalReport {
  mode: EvalMode
  generated_at: string
  versions: Record<string, string>
  subset: string[]
  repeats: number
  pricing: Pricing | null
  model: string | null
  /** CR-V2-SYNTHETIC-KEY-REUSE-1: the NAME of the variable the live key came from; never its value. Null outside live mode. */
  credential_source: SyntheticCredentialEnv | null
  manifest: Pick<FixtureManifest, 'generator_version' | 'spec_sha256' | 'pymupdf_version' | 'pillow_version'> | null
  plan: { documents: number; max_api_requests: number; estimated_input_tokens: number; estimated_output_tokens: number; estimated_cost_usd: number | null }
  api_requests_made: number
  /** Live call accounting. `conservative_usd` also charges every call that threw as if it billed its worst case. */
  spend: {
    succeeded_calls: number
    failed_calls: number
    retry_calls: number
    accounted_input_tokens: number
    accounted_output_tokens: number
    accounted_usd: number | null
    conservative_usd: number | null
    max_usd: number | null
  }
  stopped_early: string | null
  /** CR-V2-DOC-LIVE-1C-B2B. Live mode: one entry per provider request, in order. Empty in dry-run and mock modes. */
  requests: RequestRecord[]
  /** CR-V2-DOC-LIVE-1C-B2B. Every selected fixture, every mode: the live examination's pre-call checks, computed offline. */
  live_input_bound: LiveBoundRecord[]
  /** Live mode: whether the command-line pricing equals the live examination's cached price table. */
  pricing_matches_live_table: boolean | null
  /** Scores plus the raw model extraction (untrusted document-derived strings, kept for manual review). */
  per_document: Array<ReturnType<typeof scoreObservation> & { extraction: unknown }>
  /** Scores under the ORIGINAL ground truth. */
  summary: EvalSummary | null
  /** Optional second scoring under versioned additive corrections. Never merged into `summary`. */
  corrected: {
    corrections_version: string
    corrections: Array<{ fixture_id: string; field: string; add_value_accept: string[] }>
    per_document_fields: Array<{ fixture_id: string; repeat: number; fields: Record<string, string> }>
    summary: EvalSummary
  } | null
}

export async function runReceiptEval(opts: EvalOptions, deps: EvalDeps = defaultEvalDeps, env: EnvLike = process.env): Promise<EvalReport> {
  assertLiveAllowed(opts, env)

  const spec = loadFixtureSpec()
  const fixtures = selectFixtures(resolveFixtures(spec), spec, opts.subset)
  const manifest = loadManifest(opts.fixturesDir)
  if (!manifest) throw new Error(`no manifest in ${opts.fixturesDir}: run generate_receipt_fixtures.py first`)
  if (manifest.spec_sha256 !== specSha256()) throw new Error('generated fixtures are stale: the spec changed since generation; regenerate them')
  const entries = new Map(manifest.documents.map((e) => [e.id, e]))
  const bounds = new Map<string, LiveBoundRecord>()
  for (const f of fixtures) {
    const e = entries.get(f.id)
    if (!e) throw new Error(`fixture ${f.id} missing from manifest`)
    const bytes = readFixtureBytes(opts.fixturesDir, e) // hash check for every selected document, all modes
    bounds.set(f.id, liveBoundFor(f.id, e.media_type, bytes))
  }

  const estIn = fixtures.reduce((a, f) => a + estimateInputTokens(entries.get(f.id)!), 0) * opts.repeats
  const estOut = ESTIMATED_OUTPUT_TOKENS * fixtures.length * opts.repeats
  const report: EvalReport = {
    mode: opts.mode,
    generated_at: new Date().toISOString(),
    versions: {
      schema: RECEIPT_EXTRACTION_SCHEMA_VERSION,
      prompt: RECEIPT_PROMPT_VERSION,
      comparison: COMPARISON_RULES_VERSION,
      scoring: SCORING_VERSION,
      spec: spec.spec_version,
    },
    subset: fixtures.map((f) => f.id),
    repeats: opts.repeats,
    pricing: opts.pricing,
    model: opts.mode === 'live' ? opts.model : null,
    credential_source: opts.mode === 'live' ? syntheticCredentialEnv(env) : null,
    manifest: {
      generator_version: manifest.generator_version,
      spec_sha256: manifest.spec_sha256,
      pymupdf_version: manifest.pymupdf_version,
      pillow_version: manifest.pillow_version,
    },
    plan: {
      documents: fixtures.length,
      max_api_requests: fixtures.length * opts.repeats * 2,
      estimated_input_tokens: estIn,
      estimated_output_tokens: estOut,
      estimated_cost_usd: opts.pricing ? (estIn * opts.pricing.input_usd_per_mtok + estOut * opts.pricing.output_usd_per_mtok) / 1_000_000 : null,
    },
    api_requests_made: 0,
    spend: {
      succeeded_calls: 0,
      failed_calls: 0,
      retry_calls: 0,
      accounted_input_tokens: 0,
      accounted_output_tokens: 0,
      accounted_usd: opts.pricing ? 0 : null,
      conservative_usd: opts.pricing ? 0 : null,
      max_usd: opts.maxUsd,
    },
    stopped_early: null,
    requests: [],
    live_input_bound: fixtures.map((f) => bounds.get(f.id)!),
    pricing_matches_live_table: pricingMatchesLiveTable(opts),
    per_document: [],
    summary: null,
    corrected: null,
  }

  if (opts.mode === 'dry-run') {
    deps.log(`[dry-run] ${fixtures.length} documents x ${opts.repeats} repeat(s); no model calls made.`)
    deps.log(`[dry-run] worst-case API requests (one retry each): ${report.plan.max_api_requests}`)
    deps.log(`[dry-run] ESTIMATED tokens: input ~${estIn}, output ~${estOut}` + (report.plan.estimated_cost_usd === null ? ' (no pricing supplied)' : `, ESTIMATED cost ~$${report.plan.estimated_cost_usd.toFixed(4)}`))
    const admitted = report.live_input_bound.filter((b) => b.admitted).length
    deps.log(`[dry-run] live input bound: ${admitted} of ${fixtures.length} admitted, ${fixtures.length - admitted} refused`)
    return finish(report, opts, deps)
  }

  const requestedModel = opts.model ?? ''
  const live = opts.mode === 'live' ? await deps.createLiveCaller(requestedModel, syntheticCredentialEnv(env) as SyntheticCredentialEnv) : null
  const observations: RunObservation[] = []
  for (let repeat = 1; repeat <= opts.repeats && !report.stopped_early; repeat++) {
    for (const f of fixtures) {
      if (report.stopped_early) break
      const bound = bounds.get(f.id)!
      // The worst case for the spend guard: the larger of the rough estimate (with its safety factor) and the live bound.
      const estIn1 = Math.max(estimateInputTokens(entries.get(f.id)!) * INPUT_ESTIMATE_SAFETY_FACTOR, bound.input_tokens ?? 0)
      if (live && opts.maxCalls !== null && report.api_requests_made + 2 > opts.maxCalls) {
        report.stopped_early = `--max-calls ${opts.maxCalls} would be exceeded`
        break
      }
      if (live && opts.pricing && opts.maxUsd !== null) {
        const worstNext = worstCaseUsd(estIn1, BASE_MAX_TOKENS, opts.pricing) + worstCaseUsd(estIn1, RETRY_MAX_TOKENS, opts.pricing)
        if ((report.spend.conservative_usd ?? 0) + worstNext > opts.maxUsd) {
          report.stopped_early = `--max-usd ${opts.maxUsd} could be exceeded by the next document`
          break
        }
      }
      const oracle = createOracleCaller(f)
      let attempt = 0
      const stop = (why: string) => {
        if (!report.stopped_early) report.stopped_early = why
      }
      const counted: ReceiptModelCaller = async (req) => {
        if (!live) return oracle(req)
        // Nothing more reaches the provider once the run has stopped, including this document's retry.
        if (report.stopped_early) throw new Error('run stopped')
        attempt += 1
        report.api_requests_made += 1
        if (req.maxTokens === RETRY_MAX_TOKENS) report.spend.retry_calls += 1
        const rec: RequestRecord = {
          request_index: report.api_requests_made,
          fixture_id: f.id,
          repeat,
          attempt,
          max_tokens: req.maxTokens,
          requested_model: requestedModel,
          response_model: null,
          stop_reason: null,
          input_tokens: null,
          output_tokens: null,
          latency_ms: 0,
          outcome: 'provider_error',
          error_kind: null,
          live_bound_input_tokens: bound.input_tokens,
        }
        report.requests.push(rec)
        const started = Date.now()
        let res: ReceiptModelResponse
        try {
          res = await live.call(req)
        } catch (err) {
          rec.latency_ms = Date.now() - started
          // Usage is unknown for a call that threw; charge its worst case.
          report.spend.failed_calls += 1
          if (opts.pricing) report.spend.conservative_usd! += worstCaseUsd(estIn1, req.maxTokens, opts.pricing)
          if (isStructuredOutputParseFailure(err)) {
            rec.outcome = 'parse_failure' // the engine's one recovery retry depends on seeing this error unchanged
          } else {
            rec.error_kind = live.classifyFailure(err)
            if (RUN_STOPPING_FAILURES.includes(rec.error_kind)) stop(`provider ${rec.error_kind} failure: no further requests`)
          }
          throw err
        }
        rec.latency_ms = Date.now() - started
        if (typeof res !== 'object' || res === null || typeof res.id !== 'string' || !Array.isArray(res.content)) {
          rec.outcome = 'unexpected_response'
          report.spend.failed_calls += 1
          if (opts.pricing) report.spend.conservative_usd! += worstCaseUsd(estIn1, req.maxTokens, opts.pricing)
          stop('unexpected response shape: no further requests')
          throw new Error('unexpected response shape')
        }
        const usage = res.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined
        const known = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
        rec.input_tokens = known(usage?.input_tokens) ? (usage!.input_tokens as number) : null
        rec.output_tokens = known(usage?.output_tokens) ? (usage!.output_tokens as number) : null
        const responseModel = (res as unknown as { model?: unknown }).model
        rec.response_model = typeof responseModel === 'string' ? responseModel : null
        rec.stop_reason = typeof res.stop_reason === 'string' ? res.stop_reason : null
        report.spend.succeeded_calls += 1
        report.spend.accounted_input_tokens += rec.input_tokens ?? 0
        report.spend.accounted_output_tokens += rec.output_tokens ?? 0
        if (opts.pricing) {
          const usd = ((rec.input_tokens ?? 0) * opts.pricing.input_usd_per_mtok + (rec.output_tokens ?? 0) * opts.pricing.output_usd_per_mtok) / 1_000_000
          report.spend.accounted_usd! += usd
          // A response without a usable count is charged its worst case, never zero.
          report.spend.conservative_usd! += rec.input_tokens === null || rec.output_tokens === null ? Math.max(usd, worstCaseUsd(estIn1, req.maxTokens, opts.pricing)) : usd
        }
        if (rec.response_model !== requestedModel) {
          rec.outcome = 'model_mismatch'
          stop('the response named another model: no further requests')
          throw new Error('model mismatch')
        }
        if (rec.stop_reason === null || !COMPATIBLE_STOP_REASONS.includes(rec.stop_reason)) {
          rec.outcome = 'incompatible_stop_reason'
          stop('incompatible stop reason: no further requests')
          throw new Error('incompatible stop reason')
        }
        // As the live executor does: only an end_turn response can carry a reading.
        if (rec.stop_reason !== 'end_turn') {
          rec.outcome = 'no_parsed_output'
          return { ...res, parsed_output: null }
        }
        rec.outcome = res.parsed_output == null ? 'no_parsed_output' : 'parsed'
        return res
      }
      const bytes = readFixtureBytes(opts.fixturesDir, entries.get(f.id)!)
      const outcome: ExaminationOutcome = await examineReceiptDocument(bytes, { callModel: counted })
      observations.push({ fixture_id: f.id, repeat, outcome })
      deps.log(`[${opts.mode}] ${f.id} r${repeat}: ${outcome.status === 'examined' ? 'examined' : `could_not_examine (${outcome.reason})`}` + (live && report.spend.conservative_usd !== null ? ` [spend <= $${report.spend.conservative_usd.toFixed(4)}]` : ''))
    }
  }

  report.per_document = observations.map((o) => {
    const f = fixtures.find((x) => x.id === o.fixture_id)!
    const extraction = o.outcome.status === 'examined' ? o.outcome.extraction : null
    return { ...scoreObservation(f, o, entries.get(f.id)!.document_text), extraction }
  })
  report.summary = summarize(fixtures, observations, report.per_document, opts.pricing)
  if (opts.truthCorrections) {
    const c = loadTruthCorrections(opts.truthCorrections === 'default' ? DEFAULT_TRUTH_CORRECTIONS_PATH : opts.truthCorrections)
    const corrected = applyTruthCorrections(fixtures, c)
    const scores = observations.map((o) => scoreObservation(corrected.find((x) => x.id === o.fixture_id)!, o, entries.get(o.fixture_id)!.document_text))
    report.corrected = {
      corrections_version: c.corrections_version,
      corrections: c.corrections.map(({ fixture_id, field, add_value_accept }) => ({ fixture_id, field, add_value_accept })),
      per_document_fields: scores.map((sc) => ({ fixture_id: sc.fixture_id, repeat: sc.repeat, fields: sc.fields as Record<string, string> })),
      summary: summarize(corrected, observations, scores, opts.pricing),
    }
    deps.log(`[${opts.mode}] under ${c.corrections_version}: verdict ${report.corrected.summary.verdict} (original-truth verdict ${report.summary.verdict} is unchanged)`)
  }
  deps.log(`[${opts.mode}] verdict: ${report.summary.verdict}; false consistent: ${report.summary.false_consistent}; API requests: ${report.api_requests_made}`)
  return finish(report, opts, deps)
}

function worstCaseUsd(inputTokens: number, maxTokens: number, p: Pricing): number {
  return (inputTokens * p.input_usd_per_mtok + maxTokens * p.output_usd_per_mtok) / 1_000_000
}

function finish(report: EvalReport, opts: EvalOptions, deps: EvalDeps): EvalReport {
  const out = opts.out ?? path.join(os.tmpdir(), `si8-receipt-eval-${opts.mode}-${Date.now()}.json`)
  writeFileSync(out, JSON.stringify(report, null, 2))
  deps.log(`report written to ${out}`)
  return report
}

if (require.main === module) {
  runReceiptEval(parseArgs(process.argv.slice(2))).catch((err) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
