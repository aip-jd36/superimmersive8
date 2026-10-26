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
 *                      --max-calls N     (hard ceiling on API requests)
 *                      --max-usd X       (hard ceiling on conservatively-accounted spend;
 *                                         needs --input/--output-usd-per-mtok)
 *                      ANTHROPIC_API_KEY in the process environment
 *
 * Other options:
 *   --subset first-paid | all | id1,id2   (default: first-paid)
 *   --repeats N                           (default 1; 2 measures run-to-run agreement)
 *   --input-usd-per-mtok X --output-usd-per-mtok Y
 *                                         explicit pricing for cost figures; omitted = no cost computed
 *   --model ID                            live only; else CREATOR_RECORD_RECEIPT_MODEL or the adapter default
 *   --fixtures-dir DIR                    generated fixtures (default eval/fixtures/generated)
 *   --out FILE                            JSON report path (default: OS temp directory)
 *   --truth-corrections FILE|default      ALSO score under versioned additive truth corrections;
 *                                         reported separately in `corrected`, never replacing `summary`
 *
 * The API key is never read by this file, logged or written to the report.
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
import { SCORING_VERSION, scoreObservation, summarize, type EvalSummary, type Pricing, type RunObservation } from './score'

export type EvalMode = 'dry-run' | 'mock' | 'live'
/** Only ANTHROPIC_API_KEY (presence) and CREATOR_RECORD_RECEIPT_MODEL are consulted. */
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

export interface EvalDeps {
  /** Constructs the real caller. Only ever invoked in live mode, after every guard passes. */
  createLiveCaller: (model: string | null) => Promise<ReceiptModelCaller>
  log: (line: string) => void
}

export const defaultEvalDeps: EvalDeps = {
  createLiveCaller: async (model) => {
    const mod = await import('../receipt-examination/examine.anthropic')
    return mod.createAnthropicReceiptCaller(model ? { model } : undefined)
  },
  log: (line) => console.log(line),
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

/** Throws unless every live-mode guard is satisfied. Pure. */
export function assertLiveAllowed(opts: EvalOptions, env: EnvLike): void {
  if (opts.mode !== 'live') return
  if (!opts.confirmPaidCalls) throw new Error('live mode requires --confirm-paid-calls')
  if (opts.maxCalls === null || opts.maxCalls < 1) throw new Error('live mode requires --max-calls N (N >= 1)')
  if (opts.maxUsd === null || opts.maxUsd <= 0) throw new Error('live mode requires --max-usd X (X > 0)')
  if (!opts.pricing) throw new Error('live mode requires --input-usd-per-mtok and --output-usd-per-mtok (needed for --max-usd)')
  if (!env.ANTHROPIC_API_KEY) throw new Error('live mode requires ANTHROPIC_API_KEY in the process environment')
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
  for (const f of fixtures) {
    const e = entries.get(f.id)
    if (!e) throw new Error(`fixture ${f.id} missing from manifest`)
    readFixtureBytes(opts.fixturesDir, e) // hash check for every selected document, all modes
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
    model: opts.mode === 'live' ? opts.model ?? env.CREATOR_RECORD_RECEIPT_MODEL ?? 'adapter default' : null,
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
    per_document: [],
    summary: null,
    corrected: null,
  }

  if (opts.mode === 'dry-run') {
    deps.log(`[dry-run] ${fixtures.length} documents x ${opts.repeats} repeat(s); no model calls made.`)
    deps.log(`[dry-run] worst-case API requests (one retry each): ${report.plan.max_api_requests}`)
    deps.log(`[dry-run] ESTIMATED tokens: input ~${estIn}, output ~${estOut}` + (report.plan.estimated_cost_usd === null ? ' (no pricing supplied)' : `, ESTIMATED cost ~$${report.plan.estimated_cost_usd.toFixed(4)}`))
    return finish(report, opts, deps)
  }

  const live = opts.mode === 'live' ? await deps.createLiveCaller(opts.model) : null
  const observations: RunObservation[] = []
  for (let repeat = 1; repeat <= opts.repeats && !report.stopped_early; repeat++) {
    for (const f of fixtures) {
      const estIn1 = estimateInputTokens(entries.get(f.id)!) * INPUT_ESTIMATE_SAFETY_FACTOR
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
      const base = live ?? createOracleCaller(f)
      const counted: ReceiptModelCaller = async (req) => {
        if (!live) return base(req)
        report.api_requests_made += 1
        if (req.maxTokens === RETRY_MAX_TOKENS) report.spend.retry_calls += 1
        try {
          const res = await base(req)
          const tin = res.usage?.input_tokens ?? 0
          const tout = res.usage?.output_tokens ?? 0
          report.spend.succeeded_calls += 1
          report.spend.accounted_input_tokens += tin
          report.spend.accounted_output_tokens += tout
          if (opts.pricing) {
            const usd = (tin * opts.pricing.input_usd_per_mtok + tout * opts.pricing.output_usd_per_mtok) / 1_000_000
            report.spend.accounted_usd! += usd
            report.spend.conservative_usd! += usd
          }
          return res
        } catch (err) {
          // Usage is unknown for a call that threw; charge its worst case.
          report.spend.failed_calls += 1
          if (opts.pricing) report.spend.conservative_usd! += worstCaseUsd(estIn1, req.maxTokens, opts.pricing)
          throw err
        }
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
