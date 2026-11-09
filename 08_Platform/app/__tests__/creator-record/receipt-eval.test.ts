/**
 * PRODUCT-A-MVP-SPIKE-1A — synthetic fixture spec, deterministic scoring and
 * the evaluation runner's no-model-call default. No network, no SDK.
 */

import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { compareExtractionToDeclared } from '@/lib/creator-record/receipt-examination/compare'
import type { ExaminationOutcome, ReceiptModelCaller } from '@/lib/creator-record/receipt-examination/examine'
import { EXTRACTED_FIELD_NAMES, type ReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import {
  DEFAULT_GENERATED_DIR,
  FIXTURE_CATEGORIES,
  FIXTURE_HISTORY_DIR,
  loadManifest,
  SPEC_PATH,
  loadFixtureSpec,
  resolveFixtures,
  specSha256,
  type ResolvedFixture,
} from '@/lib/creator-record/eval/fixtures'
import { scoreObservation, summarize, type RunObservation } from '@/lib/creator-record/eval/score'
import { assertLiveAllowed, liveBoundFor, parseArgs, runReceiptEval, type EvalDeps } from '@/lib/creator-record/eval/run-receipt-eval'
import { LIVE_EXTRACTION_MODEL } from '@/lib/creator-record/evidence/live-caller'
import { syntheticPdf, syntheticTextPdf } from '@/test-support/synthetic-pdf'
import { applyTruthCorrections, loadTruthCorrections, type TruthCorrections } from '@/lib/creator-record/eval/truth-corrections'

const spec = loadFixtureSpec()
const fixtures = resolveFixtures(spec)
const byId = new Map(fixtures.map((f) => [f.id, f]))

function truthExtraction(f: ResolvedFixture): ReceiptExtraction {
  const t = f.truth
  const fields = Object.fromEntries(
    EXTRACTED_FIELD_NAMES.map((n) => [n, { status: t[n].status, value: t[n].value, evidence: t[n].value }]),
  ) as Pick<ReceiptExtraction, (typeof EXTRACTED_FIELD_NAMES)[number]>
  return {
    document_type: t.document_type,
    readability: t.readability,
    ...fields,
    plan_candidates: f.plan_names_shown.map((text) => ({ text, evidence: text, context: 'other' as const })),
    multiple_plans_shown: t.multiple_plans_shown ?? false,
    instruction_like_text_present: t.instruction_like_text_present ?? false,
  }
}

function examined(extraction: ReceiptExtraction): ExaminationOutcome {
  return {
    status: 'examined',
    extraction,
    detected_media_type: 'application/pdf',
    usage: { attempts: 1, input_tokens: 2000, output_tokens: 300, latency_ms: 1000 },
    schema_version: 'receipt-extraction-v2',
    prompt_version: 'receipt-prompt-v2',
  }
}

describe('synthetic fixture spec', () => {
  test('30-45 documents covering every required category', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30)
    expect(fixtures.length).toBeLessThanOrEqual(45)
    for (const c of FIXTURE_CATEGORIES) expect(fixtures.filter((f) => f.category === c).length).toBeGreaterThanOrEqual(3)
    expect(fixtures.some((f) => f.id.includes('pricing'))).toBe(true)
    expect(fixtures.some((f) => f.truth.multiple_plans_shown === true)).toBe(true)
  })

  test('first paid subset has 10-15 known documents and touches every category', () => {
    expect(spec.first_paid_subset.length).toBeGreaterThanOrEqual(10)
    expect(spec.first_paid_subset.length).toBeLessThanOrEqual(15)
    const cats = new Set(spec.first_paid_subset.map((id) => byId.get(id)!.category))
    for (const c of FIXTURE_CATEGORIES) expect(cats.has(c)).toBe(true)
  })

  test('identities are fictitious: every email address uses example.test; a synthetic marker is defined', () => {
    const raw = readFileSync(SPEC_PATH, 'utf8')
    const emails = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g) ?? []
    expect(emails.length).toBeGreaterThan(0)
    for (const e of emails) expect(e.endsWith('@example.test')).toBe(true)
    expect(spec.synthetic_marker).toMatch(/SYNTHETIC/)
  })

  test('every expected comparison equals what the rules produce from the ground truth (spec/rules self-consistency)', () => {
    const mismatches: string[] = []
    for (const f of fixtures) {
      const ex = truthExtraction(f)
      for (const s of f.scenarios) {
        const r = compareExtractionToDeclared(ex, s.declared)
        for (const key of Object.keys(s.expected) as (keyof typeof r)[]) {
          if (r[key].result !== s.expected[key]) mismatches.push(`${f.id}/${s.id}/${key}: ${r[key].result} != ${s.expected[key]}`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe('deterministic scoring', () => {
  const observe = (f: ResolvedFixture, ex: ReceiptExtraction, repeat = 1): RunObservation => ({ fixture_id: f.id, repeat, outcome: examined(ex) })

  test('ground-truth predictions pass every threshold that has data', () => {
    const obs = fixtures.map((f) => observe(f, truthExtraction(f)))
    const scores = obs.map((o) => scoreObservation(byId.get(o.fixture_id)!, o, ''))
    const s = summarize(fixtures, obs, scores, { input_usd_per_mtok: 3, output_usd_per_mtok: 15 })
    expect(s.false_consistent).toBe(0)
    expect(s.comparison_accuracy.correct).toBe(s.comparison_accuracy.total)
    expect(s.thresholds.filter((t) => t.pass === false)).toEqual([])
    expect(s.cost_usd!.total).toBeCloseTo((fixtures.length * (2000 * 3 + 300 * 15)) / 1e6, 10)
  })

  test('same inputs give the same summary', () => {
    const obs = fixtures.map((f) => observe(f, truthExtraction(f)))
    const run = () => summarize(fixtures, obs, obs.map((o) => scoreObservation(byId.get(o.fixture_id)!, o, '')), null)
    expect(run()).toEqual(run())
  })

  test('an invented value on an absent field is counted as unsupported (hallucination)', () => {
    const f = byId.get('missing-no-date')!
    const ex = { ...truthExtraction(f), transaction_date: { status: 'present' as const, value: '2026-02-01', evidence: 'Date: 2026-02-01' } }
    const score = scoreObservation(f, observe(f, ex), 'kling ai receipt')
    expect(score.fields.transaction_date).toBe('unsupported_value')
    expect(score.evidence_unsupported).toContain('transaction_date')
    const s = summarize([f], [observe(f, ex)], [score], null)
    expect(s.unsupported_values_critical).toBe(1)
    expect(s.verdict).toBe('FAIL')
  })

  test('a wrong date that makes chronology look fine is a false consistent (hard fail)', () => {
    const f = byId.get('conflict-date-after-production')!
    const ex = { ...truthExtraction(f), transaction_date: { status: 'present' as const, value: '2026-04-20', evidence: 'x' } }
    const score = scoreObservation(f, observe(f, ex), '')
    expect(score.comparisons.filter((c) => c.false_consistent).map((c) => c.key)).toEqual(['transaction_chronology'])
    expect(score.fields.transaction_date).toBe('wrong_value')
  })

  test('abstaining on a photo is not wrong; a wrong value on a photo is', () => {
    const f = byId.get('photo-runway-rotated')!
    const abstain = { ...truthExtraction(f), transaction_date: { status: 'unreadable' as const, value: null, evidence: null } }
    expect(scoreObservation(f, observe(f, abstain), '').fields.transaction_date).toBe('abstained_ok')
    const wrong = { ...truthExtraction(f), transaction_date: { status: 'present' as const, value: '2026-08-03', evidence: 'x' } }
    expect(scoreObservation(f, observe(f, wrong), '').fields.transaction_date).toBe('wrong_value')
  })

  test('an injected value reported by the model is detected', () => {
    const f = byId.get('inject-visible-instructions')!
    const followed = { ...truthExtraction(f), product_or_plan_name: { status: 'present' as const, value: 'Enterprise', evidence: 'Enterprise' } }
    expect(scoreObservation(f, observe(f, followed), '').injection_followed).toEqual(['product_or_plan_name'])
    const p = byId.get('inject-pricing-page-claims-invoice')!
    expect(scoreObservation(p, observe(p, { ...truthExtraction(p), document_type: 'invoice' }), '').injection_followed).toEqual(['document_type'])
  })

  test('could_not_examine yields no comparison result and never a false consistent', () => {
    const f = byId.get('pdf-kling-pro-monthly')!
    const outcome: ExaminationOutcome = {
      status: 'could_not_examine',
      reason: 'schema_invalid',
      detected_media_type: 'application/pdf',
      usage: { attempts: 1, input_tokens: 10, output_tokens: 5, latency_ms: 50 },
      schema_version: 'receipt-extraction-v2',
      prompt_version: 'receipt-prompt-v2',
    }
    const score = scoreObservation(f, { fixture_id: f.id, repeat: 1, outcome }, '')
    expect(score.comparisons.every((c) => c.actual === null && !c.false_consistent)).toBe(true)
  })

  test('run-to-run agreement is measured when repeats exist', () => {
    const f = byId.get('pdf-kling-pro-monthly')!
    const a = truthExtraction(f)
    const b = { ...a, product_or_plan_name: { status: 'present' as const, value: 'Pro', evidence: 'Pro' } }
    const obs = [observe(f, a, 1), observe(f, b, 2)]
    const s = summarize([f], obs, obs.map((o) => scoreObservation(f, o, '')), null)
    expect(s.run_to_run_agreement).toEqual({ agreeing: 0, compared: 1 })
  })
})

describe('evaluation runner: no model calls without explicit opt-in', () => {
  const ids = ['pdf-runway-standard-monthly', 'shot-runway-billing-history']
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'si8-receipt-eval-test-'))
    const files: [string, string, Buffer][] = [
      [ids[0], 'application/pdf', Buffer.from('%PDF-1.7\nsynthetic')],
      [ids[1], 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])],
    ]
    const documents = files.map(([id, media, bytes]) => {
      const file = `${id}.${media === 'application/pdf' ? 'pdf' : 'png'}`
      writeFileSync(path.join(dir, file), bytes)
      return { id, file, media_type: media, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), width: 1280, height: 800, document_text: '' }
    })
    writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify({ generator_version: 'test', spec_version: spec.spec_version, spec_sha256: specSha256(), pymupdf_version: 'test', pillow_version: 'test', documents }),
    )
  })

  function deps(): EvalDeps & { createLiveCaller: jest.Mock } {
    return { createLiveCaller: jest.fn(), log: () => undefined }
  }
  const base = () => ({ ...parseArgs([]), subset: ids.join(','), fixturesDir: dir, out: path.join(dir, `r-${Math.random()}.json`) })

  test('defaults to dry-run', () => {
    expect(parseArgs([]).mode).toBe('dry-run')
    expect(parseArgs([]).confirmPaidCalls).toBe(false)
  })

  test('dry-run never constructs a model caller and needs no API key', async () => {
    const d = deps()
    const report = await runReceiptEval(base(), d, {})
    expect(d.createLiveCaller).not.toHaveBeenCalled()
    expect(report.api_requests_made).toBe(0)
    expect(report.summary).toBeNull()
    expect(report.plan.max_api_requests).toBe(4)
  })

  test('mock mode runs the full pipeline offline', async () => {
    const d = deps()
    const report = await runReceiptEval({ ...base(), mode: 'mock' }, d, {})
    expect(d.createLiveCaller).not.toHaveBeenCalled()
    expect(report.api_requests_made).toBe(0)
    expect(report.summary!.false_consistent).toBe(0)
    // Raw extraction is kept beside each score for manual review.
    expect(report.per_document[0].extraction).toMatchObject({ document_type: expect.any(String) })
  })

  const PRICING = { input_usd_per_mtok: 2, output_usd_per_mtok: 10 }
  const LIVE_OK = { confirmPaidCalls: true, maxCalls: 10, maxUsd: 2, pricing: PRICING, model: LIVE_EXTRACTION_MODEL }
  const KEY_ENV = { CREATOR_RECORD_EXTRACTION_API_KEY: 'test-not-a-key' }
  const NO_PROCESS_ENV = {}
  const liveCaller = (call: ReceiptModelCaller, classifyFailure: (err: unknown) => any = () => 'unknown') => ({ call, classifyFailure })
  const live = (over: object, d: EvalDeps, env: Record<string, string> = KEY_ENV) => runReceiptEval({ ...base(), mode: 'live', ...LIVE_OK, ...over }, d, env)
  /** A well-formed response from the pinned model. */
  const ok = (over: object = {}) => ({ id: 'msg_test', model: LIVE_EXTRACTION_MODEL, stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 1000, output_tokens: 300 }, parsed_output: null, ...over })

  test.each<[string, Record<string, unknown>, Record<string, string>]>([
    ['without --confirm-paid-calls', { ...LIVE_OK, confirmPaidCalls: false }, KEY_ENV],
    ['without --max-calls', { ...LIVE_OK, maxCalls: null }, KEY_ENV],
    ['without --max-usd', { ...LIVE_OK, maxUsd: null }, KEY_ENV],
    ['without pricing', { ...LIVE_OK, pricing: null }, KEY_ENV],
    ['without --model', { ...LIVE_OK, model: null }, KEY_ENV],
    ['with a model other than the live pin', { ...LIVE_OK, model: 'claude-other-model' }, KEY_ENV],
    ['while CREATOR_RECORD_RECEIPT_MODEL names another model', LIVE_OK, { ...KEY_ENV, CREATOR_RECORD_RECEIPT_MODEL: 'claude-other-model' }],
    // CR-V2-SYNTHETIC-KEY-REUSE-1: the shared ANTHROPIC_API_KEY is now accepted for this synthetic tool; no key at all still refuses.
    ['without any Anthropic key', LIVE_OK, {}],
    ['with only blank keys', LIVE_OK, { CREATOR_RECORD_EXTRACTION_API_KEY: ' ', ANTHROPIC_API_KEY: '' }],
    ['with --out inside the repository', { ...LIVE_OK, out: path.join(__dirname, 'report-in-repo.json') }, KEY_ENV],
    ...['ANTHROPIC_BASE_URL', 'ANTHROPIC_LOG', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_PROFILE', 'ANTHROPIC_CUSTOM_HEADERS'].map((v): [string, Record<string, unknown>, Record<string, string>] => [`while ${v} is set`, LIVE_OK, { ...KEY_ENV, [v]: 'x' }]),
  ])('live mode refuses %s before any caller is constructed', async (_l, over, env) => {
    const d = deps()
    await expect(runReceiptEval({ ...base(), mode: 'live', ...over }, d, env)).rejects.toThrow(/live mode requires/)
    expect(d.createLiveCaller).not.toHaveBeenCalled()
  })

  test('an unsafe SDK variable in the real process environment refuses too, whatever env is passed', () => {
    expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK }, KEY_ENV, { ANTHROPIC_BASE_URL: 'https://example.test' })).toThrow(/ANTHROPIC_BASE_URL/)
    expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK }, KEY_ENV, NO_PROCESS_ENV)).not.toThrow()
    expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK }, { ...KEY_ENV, CREATOR_RECORD_RECEIPT_MODEL: LIVE_EXTRACTION_MODEL }, NO_PROCESS_ENV)).not.toThrow()
  })

  test('live mode with every guard satisfied uses the injected caller with the pinned model and respects --max-calls', async () => {
    const calls: number[] = []
    const fake: ReceiptModelCaller = async () => {
      calls.push(1)
      throw new Error('network disabled in test')
    }
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake))
    const report = await live({ maxCalls: 2 }, d)
    expect(d.createLiveCaller).toHaveBeenCalledTimes(1)
    expect(d.createLiveCaller).toHaveBeenCalledWith(LIVE_EXTRACTION_MODEL, 'CREATOR_RECORD_EXTRACTION_API_KEY')
    expect(report.credential_source).toBe('CREATOR_RECORD_EXTRACTION_API_KEY')
    expect(report.model).toBe(LIVE_EXTRACTION_MODEL)
    expect(calls).toHaveLength(1)
    expect(report.api_requests_made).toBe(1)
    expect(report.spend).toMatchObject({ succeeded_calls: 0, failed_calls: 1, accounted_usd: 0 })
    expect(report.spend.conservative_usd).toBeGreaterThan(0) // a thrown call is charged its worst case
    expect(report.stopped_early).toMatch(/max-calls/)
    expect(report.requests).toEqual([expect.objectContaining({ request_index: 1, attempt: 1, outcome: 'provider_error', error_kind: 'unknown', response_model: null, input_tokens: null })])
    expect(JSON.stringify(report)).not.toContain('test-not-a-key')
  })

  // ── CR-V2-SYNTHETIC-KEY-REUSE-1 ──
  describe('synthetic credential selection', () => {
    const failing: ReceiptModelCaller = async () => { throw new Error('network disabled in test') }
    const run = async (env: Record<string, string>, maxCalls = 1) => {
      const lines: string[] = []
      const d: EvalDeps & { createLiveCaller: jest.Mock } = { createLiveCaller: jest.fn(), log: (l) => lines.push(l) }
      d.createLiveCaller.mockResolvedValue(liveCaller(failing))
      const opts = { ...base(), mode: 'live' as const, ...LIVE_OK, maxCalls }
      const report = await runReceiptEval(opts, d, env)
      return { d, report, lines, written: readFileSync(opts.out as string, 'utf8') }
    }

    test('the existing ANTHROPIC_API_KEY is accepted when the dedicated key is absent; only its name is recorded', async () => {
      const { d, report, lines, written } = await run({ ANTHROPIC_API_KEY: 'shared-test-value-not-a-key' })
      expect(d.createLiveCaller).toHaveBeenCalledWith(LIVE_EXTRACTION_MODEL, 'ANTHROPIC_API_KEY')
      expect(report.credential_source).toBe('ANTHROPIC_API_KEY')
      expect(written + lines.join(' ')).not.toContain('shared-test-value-not-a-key')
    })

    test('the dedicated key still works, and takes precedence when both are set (even when they are equal)', async () => {
      for (const env of <Record<string, string>[]>[{ CREATOR_RECORD_EXTRACTION_API_KEY: 'dedicated-test-value' }, { CREATOR_RECORD_EXTRACTION_API_KEY: 'dedicated-test-value', ANTHROPIC_API_KEY: 'shared-test-value' }, { CREATOR_RECORD_EXTRACTION_API_KEY: 'same-test-value', ANTHROPIC_API_KEY: 'same-test-value' }]) {
        const { d, report, lines, written } = await run(env)
        expect(d.createLiveCaller).toHaveBeenCalledWith(LIVE_EXTRACTION_MODEL, 'CREATOR_RECORD_EXTRACTION_API_KEY')
        expect(report.credential_source).toBe('CREATOR_RECORD_EXTRACTION_API_KEY')
        for (const v of Object.values(env)) expect(written + lines.join(' ')).not.toContain(v)
      }
    })

    test('unsafe SDK variables still refuse with the shared key, and every other control is unchanged', async () => {
      const shared = { ANTHROPIC_API_KEY: 'shared-test-value' }
      for (const v of ['ANTHROPIC_BASE_URL', 'ANTHROPIC_LOG', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_PROFILE', 'ANTHROPIC_CUSTOM_HEADERS'])
        expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK }, { ...shared, [v]: 'x' }, NO_PROCESS_ENV)).toThrow(new RegExp(v))
      expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK, model: 'claude-other-model' }, shared, NO_PROCESS_ENV)).toThrow(/live pin/)
      expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK, confirmPaidCalls: false }, shared, NO_PROCESS_ENV)).toThrow(/confirm-paid-calls/)
      expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK, maxCalls: null }, shared, NO_PROCESS_ENV)).toThrow(/max-calls/)
      expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK, maxUsd: null }, shared, NO_PROCESS_ENV)).toThrow(/max-usd/)
      expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK, pricing: null }, shared, NO_PROCESS_ENV)).toThrow(/usd-per-mtok/)
      expect(() => assertLiveAllowed({ ...base(), mode: 'live', ...LIVE_OK }, { ...shared, CREATOR_RECORD_RECEIPT_MODEL: 'claude-other-model' }, NO_PROCESS_ENV)).toThrow(/CREATOR_RECORD_RECEIPT_MODEL/)
      expect(LIVE_EXTRACTION_MODEL).toBe('claude-sonnet-5')
    })

    test('--max-calls stays a hard request limit with the shared key', async () => {
      // One document may need 2 requests: a limit of 1 stops before it; a limit of 2 allows exactly one failing request here.
      const one = await run({ ANTHROPIC_API_KEY: 'shared-test-value' }, 1)
      expect([one.report.api_requests_made, one.report.stopped_early]).toEqual([0, expect.stringMatching(/max-calls/)])
      const two = await run({ ANTHROPIC_API_KEY: 'shared-test-value' }, 2)
      expect(two.report.api_requests_made).toBe(1)
      expect(two.report.stopped_early).toMatch(/max-calls/)
    })

    test('dry-run and mock modes still need no key and record no credential source', async () => {
      const r = await runReceiptEval(base(), deps(), {})
      expect(r.credential_source).toBeNull()
    })
  })

  test('live mode stops before a document whose worst case could exceed --max-usd', async () => {
    const fake: ReceiptModelCaller = jest.fn(async () => {
      throw new Error('must not be called')
    })
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake))
    const report = await live({ maxUsd: 0.0001 }, d)
    expect(fake).not.toHaveBeenCalled()
    expect(report.api_requests_made).toBe(0)
    expect(report.stopped_early).toMatch(/max-usd/)
  })

  test('live spend is accounted from actual usage; retries are counted and each request is recorded', async () => {
    let n = 0
    const fake: ReceiptModelCaller = async () => {
      n += 1
      // First call per document has no structured output -> one retry.
      return n % 2 === 1 ? ok({ stop_reason: 'max_tokens', usage: { input_tokens: 1000, output_tokens: 100 } }) : ok()
    }
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake))
    const report = await live({}, d)
    expect(report.api_requests_made).toBe(4)
    expect(report.spend).toMatchObject({ succeeded_calls: 4, failed_calls: 0, retry_calls: 2, accounted_input_tokens: 4000, accounted_output_tokens: 800 })
    expect(report.spend.accounted_usd).toBeCloseTo((4000 * 2 + 800 * 10) / 1e6, 10)
    expect(report.spend.conservative_usd).toBeCloseTo(report.spend.accounted_usd!, 10)
    expect(report.stopped_early).toBeNull()
    expect(report.requests.map((r) => [r.request_index, r.fixture_id, r.attempt, r.max_tokens, r.stop_reason, r.outcome])).toEqual([
      [1, ids[0], 1, 1024, 'max_tokens', 'no_parsed_output'],
      [2, ids[0], 2, 2048, 'end_turn', 'no_parsed_output'],
      [3, ids[1], 1, 1024, 'max_tokens', 'no_parsed_output'],
      [4, ids[1], 2, 2048, 'end_turn', 'no_parsed_output'],
    ])
    for (const r of report.requests) {
      expect(r).toMatchObject({ requested_model: LIVE_EXTRACTION_MODEL, response_model: LIVE_EXTRACTION_MODEL, error_kind: null })
      expect(r.input_tokens).toBe(1000)
      expect(r.latency_ms).toBeGreaterThanOrEqual(0)
    }
    // Metadata only: the record carries no field beyond the contract.
    expect(Object.keys(report.requests[0]).sort()).toEqual(['attempt', 'error_kind', 'fixture_id', 'input_tokens', 'latency_ms', 'live_bound_input_tokens', 'max_tokens', 'outcome', 'output_tokens', 'repeat', 'request_index', 'requested_model', 'response_model', 'stop_reason'])
  })

  test('a reading is accepted only from an end_turn response', async () => {
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(async (req) => ok({ stop_reason: 'max_tokens', parsed_output: { anything: true }, usage: { input_tokens: 10, output_tokens: req.maxTokens } })))
    const report = await live({}, d)
    expect(report.requests.every((r) => r.outcome === 'no_parsed_output')).toBe(true)
    expect(report.per_document.every((p) => p.extraction === null)).toBe(true)
  })

  test.each([
    ['the response names another model', () => ok({ model: `${LIVE_EXTRACTION_MODEL}-20990101` }), 'model_mismatch', /another model/],
    ['the response names no model', () => ok({ model: undefined }), 'model_mismatch', /another model/],
    ['the stop reason is a refusal', () => ok({ stop_reason: 'refusal' }), 'incompatible_stop_reason', /stop reason/],
    ['the stop reason is missing', () => ok({ stop_reason: null }), 'incompatible_stop_reason', /stop reason/],
    ['the response is malformed', () => ({ id: 42 }), 'unexpected_response', /unexpected response/],
  ])('the run stops before any further request when %s', async (_l, response, outcome, why) => {
    const fake = jest.fn(async () => response() as never)
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake))
    const report = await live({}, d)
    expect(fake).toHaveBeenCalledTimes(1) // not the retry, not the next document
    expect(report.requests).toHaveLength(1)
    expect(report.requests[0].outcome).toBe(outcome)
    expect(report.stopped_early).toMatch(why)
  })

  test.each(['auth', 'rejected'])('a provider %s failure stops the run before any further request', async (kind) => {
    const fake = jest.fn(async () => {
      throw new Error('provider said no')
    })
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake, () => kind))
    const report = await live({}, d)
    expect(fake).toHaveBeenCalledTimes(1)
    expect(report.requests).toEqual([expect.objectContaining({ outcome: 'provider_error', error_kind: kind })])
    expect(report.stopped_early).toMatch(new RegExp(kind))
  })

  test('a transient provider failure is recorded and does not stop the run; --max-calls still bounds it', async () => {
    const fake = jest.fn(async () => {
      throw new Error('overloaded')
    })
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake, () => 'overloaded'))
    const report = await live({ maxCalls: 2 }, d)
    expect(fake).toHaveBeenCalledTimes(1) // a provider error is not retried; the next document would pass --max-calls
    expect(report.requests[0]).toMatchObject({ outcome: 'provider_error', error_kind: 'overloaded' })
    expect(report.stopped_early).toMatch(/max-calls/)
  })

  test('a response without usable token counts is charged its worst case, never zero', async () => {
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(async () => ok({ usage: undefined, parsed_output: null })))
    const report = await live({}, d)
    expect(report.requests[0]).toMatchObject({ input_tokens: null, output_tokens: null })
    expect(report.spend.accounted_usd).toBe(0)
    expect(report.spend.conservative_usd).toBeGreaterThan(0)
  })

  test('a structured-output parse failure is recorded and gets the engine retry, not a stop', async () => {
    let n = 0
    const fake = jest.fn(async () => {
      n += 1
      if (n % 2 === 1) {
        throw new Error('Failed to parse structured output: synthetic test')
      }
      return ok()
    })
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(fake))
    const report = await live({}, d)
    expect(report.requests[0]).toMatchObject({ attempt: 1, outcome: 'parse_failure', error_kind: null })
    expect(report.requests[1]).toMatchObject({ attempt: 2, max_tokens: 2048, outcome: 'no_parsed_output' })
    expect(report.stopped_early).toBeNull()
  })

  test('the pricing is compared with the live price table, and is not required to match', async () => {
    const d = deps()
    d.createLiveCaller.mockResolvedValue(liveCaller(async () => ok()))
    expect((await live({}, d)).pricing_matches_live_table).toBe(true)
    expect((await live({ pricing: { input_usd_per_mtok: 3, output_usd_per_mtok: 15 } }, d)).pricing_matches_live_table).toBe(false)
    expect((await runReceiptEval(base(), deps(), {})).pricing_matches_live_table).toBeNull()
  })

  test('every mode reports the live input bound for each selected fixture; dry-run makes no request', async () => {
    const d = deps()
    const report = await runReceiptEval(base(), d, {})
    expect(report.requests).toEqual([])
    expect(report.live_input_bound.map((b) => b.fixture_id)).toEqual(ids)
    for (const b of report.live_input_bound) expect(b.admitted ? b.input_tokens! > 0 && b.refusal === null : b.input_tokens === null && b.refusal !== null).toBe(true)
  })

  test('liveBoundFor applies the live checks: size, pages, media type and the input bound', () => {
    const text = syntheticTextPdf('Receipt')
    const admitted = liveBoundFor('a', 'application/pdf', text)
    expect(admitted).toMatchObject({ admitted: true, refusal: null, pdf_pages: 1 })
    expect(admitted.input_tokens).toBeGreaterThan(0)
    expect(liveBoundFor('b', 'application/pdf', syntheticPdf(6))).toMatchObject({ admitted: false, refusal: 'too_many_pages', pdf_pages: 6 })
    expect(liveBoundFor('c', 'image/gif', new Uint8Array([1]))).toMatchObject({ admitted: false, refusal: 'unsupported_media_type' })
    expect(liveBoundFor('d', 'application/pdf', new Uint8Array(1_048_577))).toMatchObject({ admitted: false, refusal: 'file_too_large' })
  })

  test('assertLiveAllowed is a no-op outside live mode', () => {
    expect(() => assertLiveAllowed({ ...base(), mode: 'dry-run' }, {})).not.toThrow()
  })

  test('a fixture whose bytes changed after generation is refused', async () => {
    const m = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
    const tampered = mkdtempSync(path.join(os.tmpdir(), 'si8-receipt-eval-tamper-'))
    for (const doc of m.documents) writeFileSync(path.join(tampered, doc.file), Buffer.from('%PDF-1.7\nchanged'))
    writeFileSync(path.join(tampered, 'manifest.json'), JSON.stringify(m))
    await expect(runReceiptEval({ ...base(), fixturesDir: tampered }, deps(), {})).rejects.toThrow(/manifest hash/)
  })
})

describe('versioned truth corrections (SPIKE-1B.2) apply to the frozen v1 spec only', () => {
  const V1_SPEC = path.join(FIXTURE_HISTORY_DIR, 'receipt-fixtures-v1.json')
  const v1Hash = specSha256(V1_SPEC)
  const all = resolveFixtures(loadFixtureSpec(V1_SPEC))
  const committed = loadTruthCorrections()
  const apply = (f: ResolvedFixture[], c: TruthCorrections) => applyTruthCorrections(f, c, v1Hash)

  test('the frozen v1 spec is byte-identical to the one SPIKE-1B/1C ran against', () => {
    expect(v1Hash).toBe('2974fa9ecbbea4ab09371623a9c372809a8527b21b9907dcde06a9951b97a904')
  })

  test('v1 corrections are refused against the v2 spec (v2 already contains the adjudicated value)', () => {
    expect(() => applyTruthCorrections(fixtures, committed)).toThrow(/different fixture spec/)
    expect(byId.get('shot-runway-billing-history')!.value_accept.product_or_plan_name).toEqual(['Standard'])
  })

  test('the committed corrections target the v1 spec, are additive, and carry a rationale', () => {
    expect(committed.base_spec_sha256).toBe(v1Hash)
    const out = apply(all, committed)
    for (const k of committed.corrections) {
      const before = all.find((f) => f.id === k.fixture_id)!
      const after = out.find((f) => f.id === k.fixture_id)!
      expect(after.truth).toEqual(before.truth)
      expect(after.scenarios).toEqual(before.scenarios)
      expect(after.value_accept[k.field]).toEqual([...(before.value_accept[k.field] ?? []), ...k.add_value_accept])
      expect(k.rationale.length).toBeGreaterThan(40)
    }
  })

  test('inputs are not mutated', () => {
    const snapshot = JSON.stringify(all)
    apply(all, committed)
    expect(JSON.stringify(all)).toBe(snapshot)
  })

  test.each([
    ['a different spec hash', { base_spec_sha256: 'x' }, /different fixture spec/],
    ['a correction on a non-present field', { corrections: [{ fixture_id: 'missing-no-date', field: 'transaction_date', add_value_accept: ['2026-01-01'], adjudicated: 'x', rationale: 'r'.repeat(50) }] }, /not 'present'/],
    ['an empty addition', { corrections: [{ fixture_id: 'shot-runway-billing-history', field: 'product_or_plan_name', add_value_accept: [], adjudicated: 'x', rationale: 'r'.repeat(50) }] }, /at least one/],
    ['no rationale', { corrections: [{ fixture_id: 'shot-runway-billing-history', field: 'product_or_plan_name', add_value_accept: ['Standard'], adjudicated: 'x', rationale: '' }] }, /rationale/],
  ])('rejects %s', (_l, over, err) => {
    expect(() => apply(all, { ...committed, ...over } as TruthCorrections)).toThrow(err)
  })
})

describe('fixture spec v2 (SPIKE-1D)', () => {
  const NEW_V2 = ['conflict-current-plan-vs-charge-line', 'pdf-pro-repeated-descriptions', 'shot-history-plan-change', 'shot-truncated-plan-name']
  const v1Hashes = JSON.parse(readFileSync(path.join(FIXTURE_HISTORY_DIR, 'receipt-fixtures-v1.document-hashes.json'), 'utf8')) as {
    spec_sha256: string
    documents: Record<string, string>
  }

  test('v2 = the 41 v1 documents plus 4 plan-observation documents', () => {
    expect(spec.spec_version).toBe('receipt-fixtures-v2')
    expect(Object.keys(v1Hashes.documents)).toHaveLength(41)
    expect(fixtures.map((f) => f.id)).toEqual([...Object.keys(v1Hashes.documents), ...NEW_V2])
  })

  test('the render content of every v1 document is unchanged', () => {
    const v1 = loadFixtureSpec(path.join(FIXTURE_HISTORY_DIR, 'receipt-fixtures-v1.json'))
    const renderKeys = ['template', 'content', 'content_from', 'content_overrides', 'render'] as const
    const pick = (d: Record<string, unknown>) => JSON.stringify(renderKeys.map((k) => d[k] ?? null))
    const v2ById = new Map(spec.documents.map((d) => [d.id, d as unknown as Record<string, unknown>]))
    for (const d of v1.documents) expect(pick(v2ById.get(d.id)!)).toBe(pick(d as unknown as Record<string, unknown>))
  })

  const generated = loadManifest(DEFAULT_GENERATED_DIR)
  ;(generated && generated.spec_version === 'receipt-fixtures-v2' ? test : test.skip)('generated v2 bytes of every v1 document match the v1 hashes', () => {
    const now = new Map(generated!.documents.map((d) => [d.id, d.sha256]))
    for (const [id, sha] of Object.entries(v1Hashes.documents)) expect(now.get(id)).toBe(sha)
  })

  test('documents that print more than one plan observation carry explicit plan_names_shown truth', () => {
    expect(byId.get('conflict-two-plan-names')!.plan_names_shown).toEqual(['Standard', 'Pro Plan (Monthly)'])
    expect(byId.get('shot-midjourney-plan-change')!.plan_names_shown).toEqual(['Basic Plan', 'Standard Plan'])
    expect(byId.get('shot-runway-billing-history')!.plan_names_shown).toEqual(['Standard', 'Standard plan'])
    // Derived default: the truth plan value, or nothing.
    expect(byId.get('pdf-kling-pro-monthly')!.plan_names_shown).toEqual(['Pro Plan - Monthly'])
    expect(byId.get('missing-amount-only-receipt')!.plan_names_shown).toEqual([])
  })

  test('new cases: heading/charge conflict, plan change and truncated plan are unresolved; repeated equivalents are not', () => {
    const plan = (id: string) => byId.get(id)!.scenarios.map((s) => s.expected.plan)
    expect(plan('conflict-current-plan-vs-charge-line')).toEqual(['unresolved', 'unresolved'])
    expect(plan('shot-history-plan-change')).toEqual(['unresolved'])
    expect(plan('shot-truncated-plan-name')).toEqual(['unresolved'])
    expect(plan('pdf-pro-repeated-descriptions')).toEqual(['consistent', 'differs'])
  })
})

describe('v2 scoring: plan conflicts (SPIKE-1D)', () => {
  const observe = (f: ResolvedFixture, ex: ReceiptExtraction): RunObservation => ({ fixture_id: f.id, repeat: 1, outcome: examined(ex) })

  test('the SPIKE-1C output shape (one plan listed, flag false) on the two-plan fixture is a hard failure', () => {
    const f = byId.get('conflict-two-plan-names')!
    const spike1c: ReceiptExtraction = {
      ...truthExtraction(f),
      product_or_plan_name: { status: 'present', value: 'Pro Plan (Monthly)', evidence: 'Pro Plan (Monthly)' },
      plan_candidates: [{ text: 'Pro Plan (Monthly)', evidence: 'Pro Plan (Monthly)', context: 'charge_line' }],
      multiple_plans_shown: false,
    }
    const score = scoreObservation(f, observe(f, spike1c), '')
    expect(score.plan_conflict).toEqual({ expected: true, surfaced: false })
    expect(score.comparisons.filter((c) => c.false_consistent).map((c) => c.key)).toEqual(['plan'])
    const s = summarize([f], [observe(f, spike1c)], [score], null)
    expect(s.thresholds.find((t) => t.id === 'plan_conflicts_surfaced')!.pass).toBe(false)
    expect(s.verdict).toBe('FAIL')
  })

  test('the same output with both observations listed is unresolved, with no false consistent', () => {
    const f = byId.get('conflict-two-plan-names')!
    const v2: ReceiptExtraction = {
      ...truthExtraction(f),
      product_or_plan_name: { status: 'present', value: 'Pro Plan (Monthly)', evidence: 'Pro Plan (Monthly)' },
      plan_candidates: [
        { text: 'Standard', evidence: 'Standard subscription receipt', context: 'heading_or_title' },
        { text: 'Pro Plan (Monthly)', evidence: 'Pro Plan (Monthly)', context: 'charge_line' },
      ],
      multiple_plans_shown: false,
    }
    const score = scoreObservation(f, observe(f, v2), '')
    expect(score.plan_conflict).toEqual({ expected: true, surfaced: true })
    expect(score.comparisons.find((c) => c.key === 'plan')!.actual).toBe('unresolved')
    expect(score.comparisons.some((c) => c.false_consistent)).toBe(false)
  })

  test('candidate texts missing from the document text are reported', () => {
    const f = byId.get('pdf-kling-pro-monthly')!
    const ex = { ...truthExtraction(f), plan_candidates: [{ text: 'Enterprise', evidence: 'Enterprise', context: 'other' as const }] }
    expect(scoreObservation(f, observe(f, ex), 'kling ai invoice pro plan - monthly').plan_candidates_not_in_document).toEqual(['Enterprise'])
  })
})
