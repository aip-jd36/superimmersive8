/**
 * CR-DOC-READER-EXT-9R3 — the licence evaluation's credential, call, spend and privacy controls (no network, no paid call).
 */
import os from 'node:os'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { accountedSpend, liveRefusals, loadLicenceSpec, runLicenceEval, type LicenceEvalPlan } from '@/lib/creator-record/eval/run-licence-eval'
import { summarize, type LicenceLiveReport } from '@/lib/creator-record/eval/licence-eval-summary'
import { withInstanceBudget } from '@/lib/creator-record/evidence/live-caller'
import type { ReceiptModelCaller } from '@/lib/creator-record/receipt-examination/examine'

const APP = path.join(__dirname, '../..')
const PLAN: LicenceEvalPlan = { model: 'claude-sonnet-5', runs: 1, documents: 12, attempts: 12, max_requests: 24, max_cost_usd: 1.5761, per_document: [] }
const OUT = path.join(os.tmpdir(), 'licence-eval-9r3-test')
const args = (over: Record<string, string | boolean> = {}) => ({
  'confirm-paid-calls': true, model: 'claude-sonnet-5', 'input-usd-per-mtok': '2', 'output-usd-per-mtok': '10', 'max-usd': '1.58', 'max-calls': '24', out: OUT, ...over,
})

describe('credential: the synthetic reuse rule, never anything else', () => {
  test('only ANTHROPIC_API_KEY (the GitHub secret) is accepted', () => expect(liveRefusals(args(), PLAN, { ANTHROPIC_API_KEY: 'x' })).toEqual([]))
  test('only the dedicated key is accepted', () => expect(liveRefusals(args(), PLAN, { CREATOR_RECORD_EXTRACTION_API_KEY: 'x' })).toEqual([]))
  test('no key, or an empty one, is refused', () => {
    expect(liveRefusals(args(), PLAN, {}).join()).toMatch(/no Anthropic key/)
    expect(liveRefusals(args(), PLAN, { ANTHROPIC_API_KEY: '  ' }).join()).toMatch(/no Anthropic key/)
  })
  test('an SDK variable that could redirect or log a request is refused', () => expect(liveRefusals(args(), PLAN, { ANTHROPIC_API_KEY: 'x', ANTHROPIC_BASE_URL: 'https://example.test' }).join()).toMatch(/ANTHROPIC_BASE_URL/))
  test('the app live path still reads only the dedicated key (unchanged)', () => {
    for (const f of ['lib/creator-record/live-examination/real-executor.ts', 'lib/creator-record/evidence/live-caller.ts']) expect(readFileSync(path.join(APP, f), 'utf8')).not.toMatch(/['"`]ANTHROPIC_API_KEY['"`]|\.ANTHROPIC_API_KEY/) // code references (a comment saying it is never used is fine)
  })
})

describe('calls and spend', () => {
  test('the call budget must cover the plan; spend must cover the worst case and stay at most $10', () => {
    expect(liveRefusals(args({ 'max-calls': '23' }), PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/--max-calls must cover the planned 24/)
    expect(liveRefusals(args({ 'max-usd': '1.5' }), PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/--max-usd must cover/)
    expect(liveRefusals(args({ 'max-usd': '11' }), { ...PLAN, max_cost_usd: 10.5 }, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/ceiling/)
    expect(liveRefusals(args({ model: 'claude-opus-5-5' }), PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/pinned/)
    expect(liveRefusals(args({ 'input-usd-per-mtok': '3' }), PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/price table/)
    expect(liveRefusals(args({ 'confirm-paid-calls': false }), PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/confirm-paid-calls/)
  })
  test('retries count against the budget: a model that never returns structured output cannot exceed it', async () => {
    let sent = 0
    const inner: ReceiptModelCaller = async () => { sent += 1; return { id: 'x', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 10, output_tokens: 5 } } as never }
    const caller = withInstanceBudget(inner, 5, { used: 0 })
    const spec = loadLicenceSpec()
    const pdf = new Uint8Array(Buffer.from('%PDF-1.4\n%synthetic\n'))
    const r = await runLicenceEval(spec, 1, () => caller, () => pdf)
    expect(sent).toBe(5)
    expect(r.results.reduce((a, x) => a + x.model_calls, 0)).toBeLessThanOrEqual(5 + spec.fixtures.length) // refused calls are counted by the engine, never sent
    expect(r.results.every((x) => x.outcome === 'could_not_examine')).toBe(true)
  })
  test('accounted spend uses provider-reported tokens at the code price table', () => {
    const s = accountedSpend('claude-sonnet-5', [{ requests: [{ response_model: 'claude-sonnet-5', stop_reason: 'end_turn', input_tokens: 5187, output_tokens: 418 }] }])
    expect(s).toEqual({ requests: 1, input_tokens: 5187, output_tokens: 418, accounted_usd: 0.014554 }) // the EXT-9R2 Production reading, exactly
  })
})

describe('raw evidence stays private', () => {
  test('a live report is never written inside the repository', () => {
    expect(liveRefusals(args({ out: path.join(APP, 'tmp-report') }), PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/outside the repository/)
    const { out: _omit, ...noOut } = args()
    expect(liveRefusals(noOut, PLAN, { ANTHROPIC_API_KEY: 'x' }).join()).toMatch(/--out is required/)
  })

  const PLANTED = ['Jordan Fictional-Person', '12 Imaginary Lane', 'Paper Lanterns', 'subject to the license terms', 'sk-ant-test-0000']
  function report(over: Partial<LicenceLiveReport> = {}): LicenceLiveReport {
    const req = { response_model: 'claude-sonnet-5', stop_reason: 'end_turn', input_tokens: 5000, output_tokens: 400 }
    return {
      mode: 'live', spec: 'licence-fixtures-supplement-9r3-v1', model: 'claude-sonnet-5', credential_source: 'ANTHROPIC_API_KEY',
      contract: { schema: 'licence-extraction-v2', prompt: 'licence-prompt-v2' }, limits: { max_calls: 6, max_usd: 0.4 }, api_requests_made: 2,
      spend: { requests: 2, input_tokens: 10000, output_tokens: 800, accounted_usd: 0.028 },
      criteria: { criteria_version: 'licence-eval-criteria-v1', pass: false, criteria: [{ id: 'C3a_privacy_leaks', pass: false, value: 1, threshold: 0, detail: ['sup-long-permission-personal-pdf#1: leaked "Jordan Fictional-Person"'] }] },
      results: [
        { fixture_id: 'sup-long-licence-statement-pdf', run: 1, outcome: 'examined', reason: null, model_calls: 1, violation: null, requests: [req], extraction: { permission_statement: { value: 'subject to the license terms' } }, raw_outputs: [{ x: 'Paper Lanterns' }] } as never,
        { fixture_id: 'sup-long-permission-personal-pdf', run: 1, outcome: 'could_not_examine', reason: 'schema_invalid', model_calls: 1, violation: { code: 'contact_details', field: 'permission_statement' }, requests: [req], raw_outputs: [{ x: 'Jordan Fictional-Person, 12 Imaginary Lane' }] } as never,
      ],
      no_call: [], plan: { max_requests: 6, max_cost_usd: 0.3981 }, ...over,
    }
  }
  test('the public summary prints no raw output, value, excerpt, criterion detail text or credential', () => {
    const { lines } = summarize([report()])
    const text = lines.join('\n')
    for (const p of PLANTED) expect(text).not.toContain(p)
    expect(text).toContain('contact_details@permission_statement')
    expect(text).toContain('C3a_privacy_leaks FAIL value 1 threshold 0 (1 detail line(s): sup-long-permission-personal-pdf#1)')
    expect(text).toMatch(/RESULT: FAIL/)
  })
  test('free text smuggled into a printed field is redacted', () => {
    const r = report({ spec: 'Jordan Fictional-Person' })
    r.results[1] = { ...r.results[1], reason: 'leak Jordan Fictional-Person', violation: { code: 'x y', field: '12 Imaginary Lane' } }
    const text = summarize([r]).lines.join('\n')
    for (const p of PLANTED) expect(text).not.toContain(p)
    expect(text).toContain('<redacted>')
  })
  test('control checks: total requests above 30, another model or contract, or a request count mismatch fail the run', () => {
    expect(summarize([report({ api_requests_made: 31, limits: { max_calls: 40, max_usd: 3 } })]).lines.join()).toMatch(/total requests 31 above 30/)
    expect(summarize([report({ contract: { schema: 'licence-extraction-v1', prompt: 'licence-prompt-v1' } })]).lines.join()).toMatch(/contract differs/)
    expect(summarize([report({ model: 'claude-opus-5-5' })]).lines.join()).toMatch(/model differs/)
    expect(summarize([report({ api_requests_made: 3 })]).lines.join()).toMatch(/request count mismatch/)
  })
  test('a clean passing report passes', () => {
    const r = report({ criteria: { criteria_version: 'licence-eval-criteria-v1', pass: true, criteria: [{ id: 'C5b_unreadable_results', pass: true, value: 0, threshold: 1, detail: [] }] } })
    expect(summarize([r]).ok).toBe(true)
  })
})
