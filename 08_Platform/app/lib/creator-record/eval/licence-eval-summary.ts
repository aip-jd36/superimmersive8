/**
 * CR-DOC-READER-EXT-9R3 — the PUBLIC summary of a live licence evaluation (the repository and its Actions logs are public).
 *
 *   npx tsx --tsconfig tsconfig.json lib/creator-record/eval/licence-eval-summary.ts <report.json> [<report.json> ...]
 *
 * Prints an ALLOW-LIST only: counts, models, stop reasons, tokens and accounted cost, each criterion's id / pass / value / threshold
 * and the fixture-and-run labels its details name, outcome and failure reason per fixture, and violation codes with field names.
 * Never printed: raw model outputs, extracted values, excerpts, criterion detail text (it can quote a planted name), document text or
 * any credential. Exit 1 when a report is missing or a control check fails (limits, model, contract, credential source) or a criterion
 * fails.
 */
import { existsSync, readFileSync } from 'node:fs'

export interface SummaryLimits { max_calls_total: number; max_usd_total: number; model: string; schema: string; prompt: string }
export const EXT_9R3_LIMITS: SummaryLimits = { max_calls_total: 30, max_usd_total: 2, model: 'claude-sonnet-5', schema: 'licence-extraction-v2', prompt: 'licence-prompt-v2' }

interface Req { response_model: string | null; stop_reason: string | null; input_tokens: number; output_tokens: number }
interface Result { fixture_id: string; run: number; outcome: string; reason: string | null; model_calls: number; violation?: { code: string; field: string | null } | null; requests?: Req[] }
interface Criterion { id: string; pass: boolean; value: number; threshold: number; detail: string[] }
export interface LicenceLiveReport {
  mode: string; spec: string; model: string; credential_source: string | null
  contract: { schema: string; prompt: string }; limits: { max_calls: number; max_usd: number }; api_requests_made: number
  spend: { requests: number; input_tokens: number; output_tokens: number; accounted_usd: number | null }
  criteria: { criteria_version: string; pass: boolean; criteria: Criterion[] }
  results: Result[]; no_call: Result[]; plan: { max_requests: number; max_cost_usd: number }
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,80}$/
const SAFE_WORD = /^[a-z0-9_]{1,64}$/
/** A fixture id, reason, code or field, printed only when it has the shape of one (never free text). */
const safe = (s: unknown, re: RegExp = SAFE_WORD) => (typeof s === 'string' && re.test(s) ? s : '<redacted>')
const tally = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'
/** Only the `fixture#run` label at the start of a detail line; the rest of the line is never printed. */
const detailLabels = (detail: string[]) => [...new Set(detail.map((d) => /^([a-z0-9-]{1,80})#(\d{1,3})\b/.exec(d)).filter((m): m is RegExpExecArray => !!m).map((m) => `${m[1]}#${m[2]}`))]

export function summarize(reports: readonly LicenceLiveReport[], limits: SummaryLimits = EXT_9R3_LIMITS): { lines: string[]; ok: boolean } {
  const lines: string[] = []
  const fails: string[] = []
  let calls = 0
  let usd = 0
  for (const r of reports) {
    const reqs = r.results.flatMap((x) => x.requests ?? [])
    const models = [...new Set(reqs.map((q) => q.response_model ?? 'null'))]
    calls += r.api_requests_made
    usd += r.spend.accounted_usd ?? 0
    const label = safe(r.spec, /^[a-z0-9.-]{1,80}$/)
    lines.push(`== ${label} (${r.results.length} attempts)`)
    lines.push(`Contract ${safe(r.contract.schema, /^[a-z0-9-]{1,40}$/)} / ${safe(r.contract.prompt, /^[a-z0-9-]{1,40}$/)}; model requested ${safe(r.model, /^[a-z0-9-]{1,40}$/)}; response models ${models.map((m) => safe(m, /^[a-z0-9-]{1,60}$/)).join(',')}; credential source ${safe(r.credential_source, /^[A-Z_]{1,64}$/)}`)
    lines.push(`API requests ${r.api_requests_made} (limit ${r.limits.max_calls}, plan ${r.plan.max_requests}); retries ${r.results.filter((x) => x.model_calls > 1).length}; stop reasons ${tally(reqs.map((q) => safe(q.stop_reason)))}`)
    lines.push(`Tokens input ${r.spend.input_tokens}, output ${r.spend.output_tokens}; accounted cost $${r.spend.accounted_usd} (worst-case plan $${r.plan.max_cost_usd}, limit $${r.limits.max_usd})`)
    lines.push(`Outcomes: ${tally(r.results.map((x) => (x.outcome === 'examined' ? 'examined' : `could_not_examine:${safe(x.reason)}`)))}`)
    const violations = r.results.filter((x) => x.violation).map((x) => `${safe(x.violation!.code)}${x.violation!.field ? `@${safe(x.violation!.field)}` : ''}`)
    lines.push(`Schema violations: ${tally(violations)}`)
    for (const x of r.results) if (x.outcome !== 'examined') lines.push(`  ${safe(x.fixture_id, SAFE_ID)}#${x.run}: ${safe(x.reason)}${x.violation ? ` ${safe(x.violation.code)}@${safe(x.violation.field ?? 'top')}` : ''} (calls ${x.model_calls})`)
    lines.push(`Criteria ${safe(r.criteria.criteria_version, /^[a-z0-9.-]{1,40}$/)}: ${r.criteria.pass ? 'PASS' : 'FAIL'}`)
    for (const c of r.criteria.criteria) {
      const labels = detailLabels(c.detail)
      lines.push(`  ${safe(c.id, /^[A-Za-z0-9_]{1,40}$/)} ${c.pass ? 'pass' : 'FAIL'} value ${c.value} threshold ${c.threshold}${c.detail.length ? ` (${c.detail.length} detail line(s)${labels.length ? `: ${labels.join(', ')}` : ''})` : ''}`)
    }
    if (r.mode !== 'live') fails.push(`${label}: not a live report`)
    if (r.contract.schema !== limits.schema || r.contract.prompt !== limits.prompt) fails.push(`${label}: contract differs`)
    if (r.model !== limits.model || models.some((m) => m !== 'null' && m !== limits.model)) fails.push(`${label}: model differs`)
    if (r.api_requests_made > r.limits.max_calls) fails.push(`${label}: request limit exceeded`)
    if (reqs.length !== r.api_requests_made) fails.push(`${label}: request count mismatch`)
    if (!r.credential_source) fails.push(`${label}: no credential source`)
    if (!r.criteria.pass) fails.push(`${label}: criteria FAIL`)
  }
  if (calls > limits.max_calls_total) fails.push(`total requests ${calls} above ${limits.max_calls_total}`)
  if (usd > limits.max_usd_total) fails.push(`accounted cost above $${limits.max_usd_total}`)
  lines.push(`TOTAL: API requests ${calls} of at most ${limits.max_calls_total}; accounted cost $${Math.round(usd * 1e6) / 1e6} (limit $${limits.max_usd_total}). Check billed usage in the Anthropic account.`)
  lines.push(fails.length ? `RESULT: FAIL (${fails.map((f) => safe(f.replace(/[^a-z0-9 _.$:-]/gi, ''), /^[A-Za-z0-9 _.$:-]{1,200}$/)).join('; ')})` : 'RESULT: PASS')
  return { lines, ok: fails.length === 0 }
}

function main() {
  const files = process.argv.slice(2)
  if (files.length === 0) throw new Error('usage: licence-eval-summary.ts <report.json> ...')
  const missing = files.filter((f) => !existsSync(f))
  if (missing.length) {
    console.error(`RESULT: FAIL (${missing.length} live report(s) missing: the run refused or failed before writing)`)
    process.exitCode = 1
    return
  }
  const { lines, ok } = summarize(files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as LicenceLiveReport))
  for (const l of lines) console.log(l)
  process.exitCode = ok ? 0 : 1
}

if (require.main === module) main()
