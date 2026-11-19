/**
 * CR-DOC-READER-EXT-3 — licence/permission reading evaluation runner.
 *
 *   npx tsx --tsconfig tsconfig.json lib/creator-record/eval/run-licence-eval.ts --mode dry-run [--runs 2]
 *   npx tsx --tsconfig tsconfig.json lib/creator-record/eval/run-licence-eval.ts --mode mock
 *   # PAID — only with explicit founder authorization of the spend ceiling, and a workspace spend limit on the dedicated key:
 *   CREATOR_RECORD_EXTRACTION_API_KEY=<dedicated evaluation key> npx tsx --tsconfig tsconfig.json lib/creator-record/eval/run-licence-eval.ts \
 *     --mode live --confirm-paid-calls --model claude-sonnet-5 --runs 2 --max-calls <n> --max-usd <approved> \
 *     --input-usd-per-mtok <confirmed> --output-usd-per-mtok <confirmed> [--out <dir>] [--spec preregistered|supplement-9r3]
 *
 * Generate the documents first: `python -I lib/creator-record/eval/fixtures/generate_licence_fixtures.py`.
 * dry-run makes no call and prints the plan and the maximum cost. mock replays the ideal outputs through the real engine (no call).
 * live refuses unless: --confirm-paid-calls; the pinned model; prices equal the code's price table; the dedicated key (and only it);
 * no SDK environment variable that could redirect or log a request; --max-usd covers the planned maximum and is at most 10;
 * --max-calls covers the planned requests. The call budget is enforced by the caller wrapper: nothing beyond it is sent.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { LIVE_EXTRACTION_API_KEY_ENV, LIVE_EXTRACTION_MODEL, LIVE_REQUEST_TIMEOUT_MS, withInstanceBudget } from '../evidence/live-caller'
import { LICENCE_READING_CONTRACT } from '../examination/licence-profile'
import { licenceExtractionViolation } from '../licence-examination/schema'
import { attemptCostBoundUsd, boundLiveInputTokens, LIVE_BOUNDS, LIVE_MODEL_PRICES, unsafeSdkEnvironment } from '../live-examination/controls'
import { examineWithContract, MAX_DOCUMENT_BYTES, type ReceiptModelCaller } from '../receipt-examination/examine'
import { idealOutput, scoreLicenceEval, type LicenceRunResult, type LicenceSpec } from './score-licence'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')
export const LICENCE_EVAL_MAX_USD_CEILING = 10

/** The pre-registered set, and the CR-DOC-READER-EXT-9R3 supplement (long statements), which is scored and reported separately. */
export const LICENCE_EVAL_SPECS = { preregistered: 'licence-fixtures.json', 'supplement-9r3': 'licence-fixtures-supplement-9r3.json' } as const
export type LicenceEvalSpecName = keyof typeof LICENCE_EVAL_SPECS

export function loadLicenceSpec(name: LicenceEvalSpecName = 'preregistered'): LicenceSpec {
  if (!Object.prototype.hasOwnProperty.call(LICENCE_EVAL_SPECS, name)) throw new Error(`unknown --spec ${name}`)
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, LICENCE_EVAL_SPECS[name]), 'utf8')) as LicenceSpec
}
function fixtureBytes(id: string, media: 'pdf' | 'png'): Uint8Array {
  const file = path.join(FIXTURES_DIR, 'generated', 'licence', `${id}.${media}`)
  try {
    return new Uint8Array(readFileSync(file))
  } catch {
    throw new Error(`missing ${file}: run python -I lib/creator-record/eval/fixtures/generate_licence_fixtures.py first`)
  }
}
const noCallBytes = (kind: 'empty' | 'text' | 'oversized') => (kind === 'empty' ? new Uint8Array(0) : kind === 'text' ? new Uint8Array(Buffer.from('plain text, not a document')) : new Uint8Array(MAX_DOCUMENT_BYTES + 1))
const mediaOf = (m: 'pdf' | 'png') => (m === 'pdf' ? 'application/pdf' : 'image/png') as 'application/pdf' | 'image/png'

export interface LicenceEvalPlan { model: string; runs: number; documents: number; attempts: number; max_requests: number; max_cost_usd: number; per_document: { fixture_id: string; input_bound_tokens: number; attempt_max_usd: number }[] }

/** The plan: every attempt at its pre-call input bound, both requests, every output token. */
export function planLicenceEval(spec: LicenceSpec, model: string, runs: number): LicenceEvalPlan {
  const per = spec.fixtures.map((f) => {
    const b = boundLiveInputTokens(fixtureBytes(f.fixture_id, f.media), mediaOf(f.media))
    if (!b.ok) throw new Error(`${f.fixture_id}: input bound ${b.reason}`)
    const usd = attemptCostBoundUsd(model, b.input_tokens)
    if (usd === null) throw new Error(`no price for ${model}`)
    return { fixture_id: f.fixture_id, input_bound_tokens: b.input_tokens, attempt_max_usd: usd }
  })
  const attempts = per.length * runs
  return { model, runs, documents: per.length, attempts, max_requests: attempts * LIVE_BOUNDS.max_requests_per_attempt, max_cost_usd: Math.round(per.reduce((s, p) => s + p.attempt_max_usd, 0) * runs * 10000) / 10000, per_document: per }
}

/** Wraps a caller to record every structured output (before validation) and the call count, per attempt. */
function recording(caller: ReceiptModelCaller) {
  const raw: unknown[] = []
  let calls = 0
  const wrapped: ReceiptModelCaller = async (req) => {
    calls += 1
    const res = await caller(req)
    raw.push((res as { parsed_output?: unknown }).parsed_output ?? null)
    return res
  }
  return { wrapped, raw, calls: () => calls }
}

export async function runLicenceEval(spec: LicenceSpec, runs: number, callerFor: (fixtureId: string) => ReceiptModelCaller, bytesFor: (id: string, media: 'pdf' | 'png') => Uint8Array = fixtureBytes) {
  const results: LicenceRunResult[] = []
  for (const f of spec.fixtures) {
    for (let run = 1; run <= runs; run++) {
      const rec = recording(callerFor(f.fixture_id))
      const o = await examineWithContract(bytesFor(f.fixture_id, f.media), { callModel: rec.wrapped, contract: LICENCE_READING_CONTRACT })
      // CR-DOC-READER-EXT-9R3: a schema-invalid result carries the generic rule it broke (a code and a field name, no content).
      const violation = o.status !== 'examined' && o.reason === 'schema_invalid' ? licenceExtractionViolation(rec.raw[rec.raw.length - 1]) : null
      results.push({ fixture_id: f.fixture_id, run, outcome: o.status, reason: o.status === 'examined' ? null : o.reason, extraction: o.status === 'examined' ? o.extraction : null, raw_outputs: rec.raw, model_calls: rec.calls(), violation })
    }
  }
  const noCall: LicenceRunResult[] = []
  for (const c of spec.no_call_cases) {
    const rec = recording(async () => { throw new Error('a malformed document must not reach the model') })
    const o = await examineWithContract(noCallBytes(c.kind), { callModel: rec.wrapped, contract: LICENCE_READING_CONTRACT })
    noCall.push({ fixture_id: c.fixture_id, run: 1, outcome: o.status, reason: o.status === 'examined' ? null : o.reason, extraction: null, raw_outputs: rec.raw, model_calls: rec.calls() })
  }
  return { results, noCall, score: scoreLicenceEval(spec, results, noCall) }
}

export function mockCaller(spec: LicenceSpec, fixtureId: string): ReceiptModelCaller {
  const f = spec.fixtures.find((x) => x.fixture_id === fixtureId)!
  return async () => ({ id: 'mock', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: idealOutput(f) })
}

/** Every reason a live run would be refused, before anything is loaded. Empty = may run. */
export function liveRefusals(args: Record<string, string | boolean>, plan: LicenceEvalPlan, env: Readonly<Record<string, string | undefined>>): string[] {
  const out: string[] = []
  const num = (k: string) => (typeof args[k] === 'string' ? Number(args[k]) : NaN)
  if (args['confirm-paid-calls'] !== true) out.push('--confirm-paid-calls missing')
  if (args.model !== LIVE_EXTRACTION_MODEL) out.push(`--model must be the pinned ${LIVE_EXTRACTION_MODEL}`)
  const p = LIVE_MODEL_PRICES[LIVE_EXTRACTION_MODEL]
  if (num('input-usd-per-mtok') !== p.input || num('output-usd-per-mtok') !== p.output) out.push('prices must equal the code price table (confirm the live page first)')
  if (!env[LIVE_EXTRACTION_API_KEY_ENV]) out.push(`${LIVE_EXTRACTION_API_KEY_ENV} (the dedicated key) is not set`)
  if (env.ANTHROPIC_API_KEY) out.push('ANTHROPIC_API_KEY is set: only the dedicated key may be present')
  for (const k of unsafeSdkEnvironment(env)) out.push(`${k} is set`)
  const maxUsd = num('max-usd')
  if (!(maxUsd >= plan.max_cost_usd)) out.push(`--max-usd must cover the planned maximum ${plan.max_cost_usd}`)
  if (!(maxUsd <= LICENCE_EVAL_MAX_USD_CEILING)) out.push(`--max-usd above the ${LICENCE_EVAL_MAX_USD_CEILING} ceiling`)
  if (!(num('max-calls') >= plan.max_requests)) out.push(`--max-calls must cover the planned ${plan.max_requests} requests`)
  return out
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const a: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '')
    if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) a[k] = argv[++i]
    else a[k] = true
  }
  return a
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const specName = (typeof args.spec === 'string' ? args.spec : 'preregistered') as LicenceEvalSpecName
  const spec = loadLicenceSpec(specName)
  const runs = typeof args.runs === 'string' ? Number(args.runs) : 2
  const plan = planLicenceEval(spec, LIVE_EXTRACTION_MODEL, runs)
  const mode = args.mode ?? 'dry-run'
  if (mode === 'dry-run') return console.log(JSON.stringify({ mode, plan }, null, 1))
  if (mode === 'mock') {
    const r = await runLicenceEval(spec, runs, (id) => mockCaller(spec, id))
    console.log(JSON.stringify({ mode, score: r.score }, null, 1))
    return void (process.exitCode = r.score.pass ? 0 : 1)
  }
  if (mode !== 'live') throw new Error('--mode dry-run | mock | live')
  const refusals = liveRefusals(args, plan, process.env)
  if (refusals.length > 0) {
    console.error(JSON.stringify({ mode, refused: refusals, plan }, null, 1))
    return void (process.exitCode = 2)
  }
  const { createAnthropicLicenceCaller } = await import('../receipt-examination/examine.anthropic')
  const caller = withInstanceBudget(createAnthropicLicenceCaller({ model: LIVE_EXTRACTION_MODEL, apiKeyEnv: LIVE_EXTRACTION_API_KEY_ENV, timeoutMs: LIVE_REQUEST_TIMEOUT_MS }), Number(args['max-calls']), { used: 0 })
  const r = await runLicenceEval(spec, runs, () => caller)
  const report = { mode, spec: spec.spec_version, model: LIVE_EXTRACTION_MODEL, criteria: r.score, results: r.results, no_call: r.noCall, plan }
  if (typeof args.out === 'string') {
    mkdirSync(args.out, { recursive: true })
    writeFileSync(path.join(args.out, `licence-eval-report-${specName}.json`), JSON.stringify(report, null, 1))
  }
  console.log(JSON.stringify({ mode, pass: r.score.pass, criteria: r.score.criteria.map((c) => ({ id: c.id, pass: c.pass, value: c.value })) }, null, 1))
  process.exitCode = r.score.pass ? 0 : 1
}

if (require.main === module) void main()
