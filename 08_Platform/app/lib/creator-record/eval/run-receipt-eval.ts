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
 *
 * CRV2-IA-4D3 S2b — reading contract v3 (`--contract v3`; default v2, whose behaviour, options and `versions` are unchanged):
 *   --contract v3                        real model extraction with the v3 prompt and schema (the live caller sends exactly that pair),
 *                                        strict v3 validation and the shared issuer-evidence rule. No v2 reading is ever converted.
 *   --set issuer-evidence|baseline|all   issuer-evidence: the pinned rendered issuer-evidence documents; baseline: the 45 v2 documents
 *                                        scored against the additive v3 issuer truth AND for plan/date regression (default issuer-evidence)
 *   --subset id1,id2                     optional filter within the selected sets
 *   --private-fixture FILE --private-sha256 HEX
 *                                        one local document outside the repository, named by a descriptor outside the repository; its
 *                                        hash must match both. Requires --out outside the repository. Its reading is redacted in the report.
 *   --repeats is fixed at 1 and --truth-corrections is refused under v3.
 * Every report carries `attribution`: runner, model, reading contract, schema, prompt, profile, fixture sets (with spec and pinned
 * hashes), truth and scorer versions. A v3 verdict needs BOTH the issuer-evidence gates and, when the baseline is selected, the plan/date
 * regression gates; without the baseline it is INCOMPLETE.
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
import { RECEIPT_EXAMINATION_SYSTEM_PROMPT, RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3, RECEIPT_PROMPT_VERSION, RECEIPT_PROMPT_VERSION_V3 } from '../receipt-examination/prompt'
import { COMPARISON_RULES_VERSION } from '../receipt-examination/compare'
import { RECEIPT_EXTRACTION_SCHEMA, RECEIPT_EXTRACTION_SCHEMA_V3, RECEIPT_EXTRACTION_SCHEMA_VERSION, EXTRACTED_FIELD_NAMES } from '../receipt-examination/schema'
import { issuerEvidenceOf, RECEIPT_EXTRACTION_SCHEMA_VERSION_V3, type IssuerEvidenceState } from '../receipt-examination/issuer-evidence'
import { RECEIPT_PROFILE, RECEIPT_PROFILE_V2_INACTIVE, RECEIPT_READING_CONTRACT_V3 } from '../examination/receipt-profile'
import { ISSUER_EVIDENCE_SCORING_VERSION, scoreIssuerEvidence, type IssuerEvidenceScore, type ScorableIssuerDocument } from './score-issuer-evidence'
import { scoreV3Regression, V3_REGRESSION_SCORING_VERSION, type V3RegressionSummary } from './score-v3-regression'
import {
  ISSUER_EVIDENCE_SET_REF,
  loadIssuerEvidenceSet,
  loadPrivateFixture,
  loadV3BaselineTruth,
  parseV3Sets,
  privateManifestEntry,
  type V3FixtureSet,
} from './v3-fixture-sets'
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
import { ISSUER_EVIDENCE_FIXTURES } from './issuer-evidence-fixtures'
import { isStructuredOutputParseFailure } from '@/lib/interview-engine/anthropic-structured-output-retry'
import { LIVE_EXTRACTION_API_KEY_ENV, LIVE_EXTRACTION_MODEL, LIVE_REQUEST_TIMEOUT_MS } from '../evidence/live-caller'
import { countPdfPages } from '../evidence/pdf-text-layer'
import { boundLiveInputTokens, LIVE_BOUNDS, LIVE_MODEL_PRICES, unsafeSdkEnvironment } from '../live-examination/controls'
/** The adapter's fixed failure kinds (`classifyAnthropicFailure`). Not imported: this file reaches the adapter only dynamically. */
type ProviderFailureKind = 'timeout' | 'rate_limited' | 'overloaded' | 'server_error' | 'auth' | 'rejected' | 'connection' | 'unknown'
import { SCORING_VERSION, scoreObservation, summarize, type EvalSummary, type Pricing, type RunObservation } from './score'

export type EvalMode = 'dry-run' | 'mock' | 'live'
export type EvalContract = 'v2' | 'v3'
/** CRV2-IA-4D3 S2b. Recorded in every report's `attribution`. */
export const RECEIPT_EVAL_RUNNER_VERSION = 'receipt-eval-runner-v2' as const
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
  /** CRV2-IA-4D3 S2b. Reading contract under evaluation (default v2). */
  contract: EvalContract
  /** v3 only: `--set`. Null = not given. */
  sets: string | null
  /** v3 only: whether `--subset` was given explicitly (it then filters within the selected sets). */
  subsetGiven: boolean
  privateFixture: string | null
  privateSha256: string | null
}

export interface LiveCaller {
  call: ReceiptModelCaller
  /** Fixed failure kind of a thrown provider error, decided by the SDK's own error classes. */
  classifyFailure: (err: unknown) => ProviderFailureKind
}

export interface EvalDeps {
  /** Constructs the real caller. Only ever invoked in live mode, after every guard passes. */
  createLiveCaller: (model: string, keyEnv: SyntheticCredentialEnv, readingContract?: LiveReadingContract) => Promise<LiveCaller>
  log: (line: string) => void
}

/** The schema version naming the request contract the live caller sends (prompt and schema together). */
export type LiveReadingContract = typeof RECEIPT_EXTRACTION_SCHEMA_VERSION | typeof RECEIPT_EXTRACTION_SCHEMA_VERSION_V3

export const defaultEvalDeps: EvalDeps = {
  createLiveCaller: async (model, keyEnv, readingContract) => {
    const mod = await import('../receipt-examination/examine.anthropic')
    return {
      call: mod.createAnthropicReceiptCaller({ model, apiKeyEnv: keyEnv, timeoutMs: LIVE_REQUEST_TIMEOUT_MS, readingContract: readingContract ?? RECEIPT_EXTRACTION_SCHEMA_VERSION }),
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
  const contract = (get('--contract') ?? 'v2') as EvalContract
  if (contract !== 'v2' && contract !== 'v3') throw new Error(`unknown --contract ${contract}`)
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
    contract,
    sets: get('--set') ?? null,
    subsetGiven: argv.includes('--subset'),
    privateFixture: get('--private-fixture') ?? null,
    privateSha256: get('--private-sha256') ?? null,
  }
}

/** CRV2-IA-4D3 S2b. Options that belong to one contract only, and the private-document rules. Pure; every mode. */
export function assertContractOptions(opts: EvalOptions): void {
  if (opts.contract === 'v2') {
    if (opts.sets !== null || opts.privateFixture !== null || opts.privateSha256 !== null) throw new Error('--set and --private-fixture need --contract v3')
    return
  }
  if (opts.repeats !== 1) throw new Error('--contract v3 runs each document once (--repeats 1)')
  if (opts.truthCorrections) throw new Error('--truth-corrections applies to the v2 contract only')
  if ((opts.privateFixture === null) !== (opts.privateSha256 === null)) throw new Error('give both --private-fixture and --private-sha256, or neither')
  // A report that read the private document is written outside the repository, in every mode (never the default temp path by accident).
  if (opts.privateFixture !== null && (opts.out === null || insideRepository(opts.out))) throw new Error('--private-fixture requires --out outside the repository')
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
  /** CRV2-IA-4D3 S2b. Complete version attribution: what was run, against what, scored how. */
  attribution: EvalAttribution
  /** CRV2-IA-4D3 S2b. The v3 results (`--contract v3`); null for a v2 run, whose results stay in `per_document` and `summary`. */
  v3: V3ReportSection | null
}

export interface EvalAttribution {
  runner: typeof RECEIPT_EVAL_RUNNER_VERSION
  /** The requested model in live mode; null otherwise (no model was called). */
  model: string | null
  reading_contract: EvalContract
  schema: string
  prompt: string
  profile: { id: string; version: number; active: boolean }
  fixture_sets: Array<{ id: string; version: string; spec_sha256: string; generator_version: string; pinned_document_hashes: boolean; documents: number }>
  truth: string[]
  scorers: string[]
}

export interface V3DocumentResult {
  fixture_id: string
  set: V3FixtureSet | 'private'
  status: ExaminationOutcome['status']
  could_not_examine_reason: string | null
  /** The issuer state the shared rule derives from the reading, or null when there is no reading. */
  derived_state: IssuerEvidenceState | null
  /** The roles of the statements read, in order. Business names are in `extraction` (redacted for the private document). */
  statement_roles: string[]
  /** The validated v3 reading (untrusted document-derived strings, for manual review). Null for the private document (redacted). */
  extraction: unknown
  extraction_redacted: boolean
}

export interface V3ReportSection {
  sets: V3FixtureSet[]
  private_fixture: { id: string; sha256: string; media_type: string } | null
  per_document: V3DocumentResult[]
  issuer: IssuerEvidenceScore | null
  issuer_by_set: Record<string, { correct: number; total: number }>
  /** Plan/date regression on the baseline (null when the baseline is not selected). */
  regression: V3RegressionSummary | null
  /** PASS only when the issuer gates pass AND the regression gates pass; INCOMPLETE without the baseline or without readings. */
  verdict: 'PASS' | 'FAIL' | 'INCOMPLETE' | null
}

/** Attribution of a v2 run: exactly what the runner has always used. */
function v2Attribution(opts: EvalOptions, spec: { spec_version: string }, manifest: FixtureManifest, documents: number): EvalAttribution {
  return {
    runner: RECEIPT_EVAL_RUNNER_VERSION,
    model: opts.mode === 'live' ? opts.model : null,
    reading_contract: 'v2',
    schema: RECEIPT_EXTRACTION_SCHEMA_VERSION,
    prompt: RECEIPT_PROMPT_VERSION,
    profile: { id: RECEIPT_PROFILE.ref.id, version: RECEIPT_PROFILE.ref.version, active: true },
    fixture_sets: [{ id: 'si8/creator-record-v2-receipt-fixtures', version: spec.spec_version, spec_sha256: manifest.spec_sha256, generator_version: manifest.generator_version, pinned_document_hashes: false, documents }],
    truth: [spec.spec_version],
    scorers: [SCORING_VERSION, COMPARISON_RULES_VERSION],
  }
}

export async function runReceiptEval(opts: EvalOptions, deps: EvalDeps = defaultEvalDeps, env: EnvLike = process.env): Promise<EvalReport> {
  assertLiveAllowed(opts, env)
  assertContractOptions(opts)
  if (opts.contract === 'v3') return runReceiptEvalV3(opts, deps, env)

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
    attribution: v2Attribution(opts, spec, manifest, fixtures.length),
    v3: null,
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
      if (live && stopBeforeDocument(report, opts, estIn1)) break
      const counted: ReceiptModelCaller = live
        ? createCountedCaller({ report, opts, live, requestedModel }, { fixtureId: f.id, repeat, boundInputTokens: bound.input_tokens, worstInputTokens: estIn1 })
        : createOracleCaller(f)
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

// ---------------------------------------------------------------- v3 (CRV2-IA-4D3 S2b)

/** The v3 contract's extra fixed request text over v2 (prompt + schema), in the rough estimate's four-characters-per-token form. */
const V3_EXTRA_PROMPT_TOKENS = Math.max(
  0,
  Math.ceil((RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3.length + JSON.stringify(RECEIPT_EXTRACTION_SCHEMA_V3).length - RECEIPT_EXAMINATION_SYSTEM_PROMPT.length - JSON.stringify(RECEIPT_EXTRACTION_SCHEMA).length) / 4),
)
/** The same difference under the live bound's rule (two tokens per UTF-8 byte). The live bound counts the v2 text; v3 adds this. */
export const V3_EXTRA_BOUND_TOKENS = Math.max(
  0,
  2 *
    (Buffer.byteLength(RECEIPT_EXAMINATION_SYSTEM_PROMPT_V3) +
      Buffer.byteLength(JSON.stringify(RECEIPT_EXTRACTION_SCHEMA_V3)) -
      Buffer.byteLength(RECEIPT_EXAMINATION_SYSTEM_PROMPT) -
      Buffer.byteLength(JSON.stringify(RECEIPT_EXTRACTION_SCHEMA))),
)

interface V3Doc {
  id: string
  set: V3FixtureSet | 'private'
  entry: ManifestEntry
  /** Reads the document, re-checking its hash every time. */
  read: () => Uint8Array
  /** v3 issuer truth; null = issuer not scored (an unreadable baseline document). */
  issuerTruth: ScorableIssuerDocument['truth'] | null
  /** The v2 fixture, for plan/date regression scoring (baseline documents only). */
  baseline: ResolvedFixture | null
}

const NOT_SHOWN_OUTPUT_FIELD = { status: 'not_shown', value: null, evidence: null }

/**
 * Offline v3 oracle (mock mode): the truth in the v3 OUTPUT shape — issuer statements and no `issuer_name` — so the reading goes through
 * the same strict v3 validator and the same derivation as a live reading. No network.
 */
export function createOracleCallerV3(doc: { issuerTruth: ScorableIssuerDocument['truth'] | null; baseline: ResolvedFixture | null }): ReceiptModelCaller {
  return async () => {
    const issuer_statements = (doc.issuerTruth?.statements ?? []).map((st) => ({ business: st.business, role: st.role, evidence: st.business }))
    let parsed: Record<string, unknown>
    if (doc.baseline) {
      const v2 = (await createOracleCaller(doc.baseline)({ content: [], maxTokens: BASE_MAX_TOKENS })).parsed_output as Record<string, unknown>
      const { issuer_name: _omit, ...rest } = v2
      void _omit
      parsed = { ...rest, issuer_statements }
    } else {
      parsed = {
        document_type: 'receipt',
        readability: 'legible',
        product_or_plan_name: NOT_SHOWN_OUTPUT_FIELD,
        transaction_date: NOT_SHOWN_OUTPUT_FIELD,
        service_period_start: NOT_SHOWN_OUTPUT_FIELD,
        service_period_end: NOT_SHOWN_OUTPUT_FIELD,
        plan_candidates: [],
        multiple_plans_shown: false,
        instruction_like_text_present: false,
        issuer_statements,
      }
    }
    const response: ReceiptModelResponse = { id: 'oracle', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: parsed }
    return response
  }
}

async function runReceiptEvalV3(opts: EvalOptions, deps: EvalDeps, env: EnvLike): Promise<EvalReport> {
  const sets = parseV3Sets(opts.sets ?? 'issuer-evidence')
  const spec = loadFixtureSpec()
  const docs: V3Doc[] = []
  const fixtureSets: EvalAttribution['fixture_sets'] = []
  const truth: string[] = []

  if (sets.includes('issuer-evidence')) {
    const ie = loadIssuerEvidenceSet(opts.fixturesDir)
    const byId = new Map(ie.manifest.documents.map((e) => [e.id, e]))
    for (const f of ie.fixtures) {
      const e = byId.get(f.id)!
      docs.push({ id: f.id, set: 'issuer-evidence', entry: e, read: () => readFixtureBytes(ie.dir, e), issuerTruth: f.truth, baseline: null })
    }
    fixtureSets.push({ id: ISSUER_EVIDENCE_SET_REF.id, version: ie.pins.spec_version, spec_sha256: ie.pins.spec_sha256, generator_version: ie.manifest.generator_version, pinned_document_hashes: true, documents: ie.fixtures.length })
    truth.push(`${ie.pins.spec_version} (issuer-evidence-fixtures.ts)`)
  }
  if (sets.includes('baseline')) {
    const manifest = loadManifest(opts.fixturesDir)
    if (!manifest) throw new Error(`no manifest in ${opts.fixturesDir}: run generate_receipt_fixtures.py first`)
    if (manifest.spec_sha256 !== specSha256()) throw new Error('generated fixtures are stale: the spec changed since generation; regenerate them')
    const v3Truth = loadV3BaselineTruth(spec)
    const byId = new Map(manifest.documents.map((e) => [e.id, e]))
    for (const f of resolveFixtures(spec)) {
      const e = byId.get(f.id)
      if (!e) throw new Error(`fixture ${f.id} missing from manifest`)
      docs.push({ id: f.id, set: 'baseline', entry: e, read: () => readFixtureBytes(opts.fixturesDir, e), issuerTruth: v3Truth.byId.get(f.id) ?? null, baseline: f })
    }
    fixtureSets.push({ id: 'si8/creator-record-v2-receipt-fixtures', version: spec.spec_version, spec_sha256: manifest.spec_sha256, generator_version: manifest.generator_version, pinned_document_hashes: false, documents: spec.documents.length })
    truth.push(spec.spec_version, v3Truth.file.truth_version)
  }

  let selected = docs
  if (opts.subsetGiven && opts.subset !== 'all') {
    const ids = opts.subset.split(',').map((x) => x.trim()).filter(Boolean)
    for (const id of ids) if (!docs.some((d) => d.id === id)) throw new Error(`unknown fixture id in subset: ${id}`)
    selected = docs.filter((d) => ids.includes(d.id))
  }
  let privateFixture: V3ReportSection['private_fixture'] = null
  if (opts.privateFixture !== null && opts.privateSha256 !== null) {
    const p = loadPrivateFixture(opts.privateFixture, opts.privateSha256, (f) => insideRepository(f))
    selected = [...selected, { id: p.id, set: 'private', entry: privateManifestEntry(p), read: () => p.bytes, issuerTruth: p.truth, baseline: null }]
    privateFixture = { id: p.id, sha256: p.sha256, media_type: p.media_type }
    fixtureSets.push({ id: 'private (outside the repository)', version: p.id, spec_sha256: p.sha256, generator_version: 'n/a', pinned_document_hashes: true, documents: 1 })
    truth.push('private descriptor (outside the repository)')
  }
  if (selected.length === 0) throw new Error('no documents selected')

  const bounds = new Map<string, LiveBoundRecord>()
  for (const d of selected) bounds.set(d.id, liveBoundFor(d.id, d.entry.media_type, d.read())) // hash check for every document, all modes
  const estimate = (d: V3Doc) => estimateInputTokens(d.entry) + V3_EXTRA_PROMPT_TOKENS
  const estIn = selected.reduce((a, d) => a + estimate(d), 0)
  const estOut = ESTIMATED_OUTPUT_TOKENS * selected.length

  const report: EvalReport = {
    mode: opts.mode,
    generated_at: new Date().toISOString(),
    versions: {
      schema: RECEIPT_EXTRACTION_SCHEMA_VERSION_V3,
      prompt: RECEIPT_PROMPT_VERSION_V3,
      profile: `${RECEIPT_PROFILE_V2_INACTIVE.ref.id}@${RECEIPT_PROFILE_V2_INACTIVE.ref.version}`,
      scoring: ISSUER_EVIDENCE_SCORING_VERSION,
      spec: fixtureSets.map((f) => f.version).join('+'),
    },
    subset: selected.map((d) => d.id),
    repeats: 1,
    pricing: opts.pricing,
    model: opts.mode === 'live' ? opts.model : null,
    credential_source: opts.mode === 'live' ? syntheticCredentialEnv(env) : null,
    manifest: null,
    plan: {
      documents: selected.length,
      max_api_requests: selected.length * 2,
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
    live_input_bound: selected.map((d) => bounds.get(d.id)!),
    pricing_matches_live_table: pricingMatchesLiveTable(opts),
    per_document: [],
    summary: null,
    corrected: null,
    attribution: {
      runner: RECEIPT_EVAL_RUNNER_VERSION,
      model: opts.mode === 'live' ? opts.model : null,
      reading_contract: 'v3',
      schema: RECEIPT_EXTRACTION_SCHEMA_VERSION_V3,
      prompt: RECEIPT_PROMPT_VERSION_V3,
      profile: { id: RECEIPT_PROFILE_V2_INACTIVE.ref.id, version: RECEIPT_PROFILE_V2_INACTIVE.ref.version, active: false },
      fixture_sets: fixtureSets,
      truth,
      scorers: [ISSUER_EVIDENCE_SCORING_VERSION, ...(sets.includes('baseline') ? [V3_REGRESSION_SCORING_VERSION, SCORING_VERSION, COMPARISON_RULES_VERSION] : [])],
    },
    v3: { sets, private_fixture: privateFixture, per_document: [], issuer: null, issuer_by_set: {}, regression: null, verdict: null },
  }
  const v3 = report.v3!

  const counts = (['issuer-evidence', 'baseline', 'private'] as const).map((s) => `${s} ${selected.filter((d) => d.set === s).length}`).join(', ')
  if (opts.mode === 'dry-run') {
    deps.log(`[dry-run] contract v3 (${RECEIPT_EXTRACTION_SCHEMA_VERSION_V3}, ${RECEIPT_PROMPT_VERSION_V3}, profile ${report.versions.profile}); ${selected.length} documents (${counts}); no model calls made.`)
    deps.log(`[dry-run] worst-case API requests (one retry each): ${report.plan.max_api_requests}`)
    deps.log(`[dry-run] ESTIMATED tokens: input ~${estIn}, output ~${estOut}` + (report.plan.estimated_cost_usd === null ? ' (no pricing supplied)' : `, ESTIMATED cost ~$${report.plan.estimated_cost_usd.toFixed(4)}`))
    const admitted = report.live_input_bound.filter((b) => b.admitted).length
    deps.log(`[dry-run] live input bound: ${admitted} of ${selected.length} admitted, ${selected.length - admitted} refused`)
    return finish(report, opts, deps)
  }

  const requestedModel = opts.model ?? ''
  const live = opts.mode === 'live' ? await deps.createLiveCaller(requestedModel, syntheticCredentialEnv(env) as SyntheticCredentialEnv, RECEIPT_EXTRACTION_SCHEMA_VERSION_V3) : null
  const outcomes = new Map<string, ExaminationOutcome>()
  for (const d of selected) {
    if (report.stopped_early) break
    const bound = bounds.get(d.id)!
    const estIn1 = Math.max(estimate(d) * INPUT_ESTIMATE_SAFETY_FACTOR, bound.input_tokens === null ? 0 : bound.input_tokens + V3_EXTRA_BOUND_TOKENS)
    if (live && stopBeforeDocument(report, opts, estIn1)) break
    const caller = live
      ? createCountedCaller({ report, opts, live, requestedModel }, { fixtureId: d.id, repeat: 1, boundInputTokens: bound.input_tokens, worstInputTokens: estIn1 })
      : createOracleCallerV3(d)
    const outcome = await examineReceiptDocument(d.read(), { callModel: caller, contract: RECEIPT_READING_CONTRACT_V3 })
    outcomes.set(d.id, outcome)
    const state = outcome.status === 'examined' ? issuerEvidenceOf(outcome.extraction).state : null
    deps.log(
      `[${opts.mode}] ${d.id}: ${outcome.status === 'examined' ? `examined (issuer ${state})` : `could_not_examine (${outcome.reason})`}` +
        (live && report.spend.conservative_usd !== null ? ` [spend <= $${report.spend.conservative_usd.toFixed(4)}]` : ''),
    )
  }

  v3.per_document = selected
    .filter((d) => outcomes.has(d.id))
    .map((d) => {
      const o = outcomes.get(d.id)!
      const ex = o.status === 'examined' ? o.extraction : null
      const redacted = d.set === 'private'
      return {
        fixture_id: d.id,
        set: d.set,
        status: o.status,
        could_not_examine_reason: o.status === 'could_not_examine' ? o.reason : null,
        derived_state: ex ? issuerEvidenceOf(ex).state : null,
        statement_roles: ex ? (ex.issuer_evidence?.statements ?? []).map((st) => st.role) : [],
        extraction: redacted ? null : ex,
        extraction_redacted: redacted,
      }
    })

  // Issuer evidence: every selected document with a v3 truth, plus the historical v2 reading (it must stay unclassified).
  const scorable: ScorableIssuerDocument[] = selected.filter((d) => d.issuerTruth !== null).map((d) => ({ kind: 'document', id: d.id, truth: d.issuerTruth! }))
  const readings = new Map(
    scorable.map((x) => {
      const o = outcomes.get(x.id)
      return [x.id, o && o.status === 'examined' ? o.extraction : null] as const
    }),
  )
  const historical = ISSUER_EVIDENCE_FIXTURES.filter((f) => f.kind === 'historical_v2_reading')
  v3.issuer = scoreIssuerEvidence(readings, [...scorable, ...historical])
  for (const r of v3.issuer.documents) {
    const set = selected.find((d) => d.id === r.id)!.set
    const b = (v3.issuer_by_set[set] ??= { correct: 0, total: 0 })
    b.total += 1
    if (r.state_correct) b.correct += 1
  }

  // Plan/date regression: the selected baseline documents, v2 semantics, issuer field excluded (see score-v3-regression.ts).
  const baselineDocs = selected.filter((d) => d.baseline !== null)
  if (baselineDocs.length > 0) {
    const observations: RunObservation[] = baselineDocs.filter((d) => outcomes.has(d.id)).map((d) => ({ fixture_id: d.id, repeat: 1, outcome: outcomes.get(d.id)! }))
    const fixtures = baselineDocs.map((d) => d.baseline!)
    const scores = observations.map((o) => scoreObservation(fixtures.find((f) => f.id === o.fixture_id)!, o, baselineDocs.find((d) => d.id === o.fixture_id)!.entry.document_text))
    v3.regression = scoreV3Regression(fixtures, observations, scores, opts.pricing)
  }
  const regressionVerdict = v3.regression?.verdict ?? null
  v3.verdict =
    v3.issuer.verdict === 'FAIL' || regressionVerdict === 'FAIL'
      ? 'FAIL'
      : regressionVerdict === null || regressionVerdict === 'INCOMPLETE' || report.stopped_early !== null
        ? 'INCOMPLETE'
        : 'PASS'
  deps.log(
    `[${opts.mode}] v3 verdict: ${v3.verdict}; issuer gates ${v3.issuer.verdict} (${v3.issuer.gates.filter((g) => !g.passed).map((g) => g.id).join(', ') || 'all pass'}); ` +
      `plan/date regression ${regressionVerdict ?? 'not run (baseline not selected)'}; API requests: ${report.api_requests_made}`,
  )
  return finish(report, opts, deps)
}

// ---------------------------------------------------------------- live accounting (shared by both contracts)

interface LiveLoopContext {
  report: EvalReport
  opts: EvalOptions
  live: LiveCaller
  requestedModel: string
}

/** Before a document: stops the run when the next document could exceed --max-calls or --max-usd. True = stopped. */
function stopBeforeDocument(report: EvalReport, opts: EvalOptions, worstInputTokens: number): boolean {
  if (opts.maxCalls !== null && report.api_requests_made + 2 > opts.maxCalls) {
    report.stopped_early = `--max-calls ${opts.maxCalls} would be exceeded`
    return true
  }
  if (opts.pricing && opts.maxUsd !== null) {
    const worstNext = worstCaseUsd(worstInputTokens, BASE_MAX_TOKENS, opts.pricing) + worstCaseUsd(worstInputTokens, RETRY_MAX_TOKENS, opts.pricing)
    if ((report.spend.conservative_usd ?? 0) + worstNext > opts.maxUsd) {
      report.stopped_early = `--max-usd ${opts.maxUsd} could be exceeded by the next document`
      return true
    }
  }
  return false
}

/**
 * One document's caller in live mode: every provider request counted, recorded (metadata only) and charged, and the run stopped on any
 * incompatible outcome. Unchanged from the v2 runner's inline caller (CR-V2-DOC-LIVE-1C-B2B); shared so v3 runs under the same guards.
 */
function createCountedCaller(
  ctx: LiveLoopContext,
  doc: { fixtureId: string; repeat: number; boundInputTokens: number | null; worstInputTokens: number },
): ReceiptModelCaller {
  const { report, opts, live, requestedModel } = ctx
  const f = { id: doc.fixtureId }
  const repeat = doc.repeat
  const bound = { input_tokens: doc.boundInputTokens }
  const estIn1 = doc.worstInputTokens
  let attempt = 0
  const stop = (why: string) => {
    if (!report.stopped_early) report.stopped_early = why
  }
  return async (req) => {
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
