/**
 * CRV2-IA-4D3 S2b — the v3 evaluation runner, fixture sets, truth and gates. No model call: dry-run, the offline oracle, and a stub
 * live caller that records what it is asked for.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION_V3 } from '@/lib/creator-record/receipt-examination/issuer-evidence'
import { RECEIPT_EXTRACTION_SCHEMA_VERSION, validateReceiptExtractionV3 } from '@/lib/creator-record/receipt-examination/schema'
import { issuerEvidenceRenderSpecJson, ISSUER_EVIDENCE_SPEC_PATH } from '@/lib/creator-record/eval/export-issuer-evidence-spec'
import { DEFAULT_GENERATED_DIR, loadFixtureSpec, loadManifest, resolveFixtures, specSha256 } from '@/lib/creator-record/eval/fixtures'
import { ISSUER_EVIDENCE_FIXTURES, type IssuerEvidenceDocumentFixture } from '@/lib/creator-record/eval/issuer-evidence-fixtures'
import {
  assertContractOptions,
  createOracleCallerV3,
  parseArgs,
  RECEIPT_EVAL_RUNNER_VERSION,
  runReceiptEval,
  type EvalDeps,
  type EvalOptions,
} from '@/lib/creator-record/eval/run-receipt-eval'
import { scoreIssuerEvidence, type ScorableIssuerDocument } from '@/lib/creator-record/eval/score-issuer-evidence'
import { scoreV3Regression, withoutIssuerField } from '@/lib/creator-record/eval/score-v3-regression'
import { scoreObservation } from '@/lib/creator-record/eval/score'
import {
  canonicalTextSha256,
  insideGitWorkTree,
  ISSUER_EVIDENCE_HASHES_FILE,
  loadIssuerEvidenceSet,
  loadPrivateFixture,
  loadV3BaselineTruth,
  parseV3Sets,
  V3_BASELINE_TRUTH_FILE,
} from '@/lib/creator-record/eval/v3-fixture-sets'
import { examineReceiptDocument } from '@/lib/creator-record/receipt-examination/examine'
import { RECEIPT_READING_CONTRACT_V3 } from '@/lib/creator-record/examination/receipt-profile'

const spec = loadFixtureSpec()
const baseline = resolveFixtures(spec)
const docFixtures = ISSUER_EVIDENCE_FIXTURES.filter((f): f is IssuerEvidenceDocumentFixture => f.kind === 'document')
const sha = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex')
const PDF = (id: string) => Buffer.from(`%PDF-1.7\nsynthetic test bytes for ${id}`)

/** A fake generated directory holding all 45 baseline documents (placeholder PDF bytes) with a valid manifest. */
function fakeBaselineDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'si8-v3-eval-'))
  const documents = baseline.map((f) => {
    const bytes = PDF(f.id)
    writeFileSync(path.join(dir, `${f.id}.pdf`), bytes)
    return { id: f.id, file: `${f.id}.pdf`, media_type: 'application/pdf', bytes: bytes.length, sha256: sha(bytes), width: null, height: null, document_text: '' }
  })
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ generator_version: 'test', spec_version: spec.spec_version, spec_sha256: specSha256(), pymupdf_version: 'test', pillow_version: 'test', documents }))
  return dir
}

const deps = (): EvalDeps & { createLiveCaller: jest.Mock; lines: string[] } => {
  const lines: string[] = []
  return { createLiveCaller: jest.fn(), log: (l) => lines.push(l), lines }
}
const v3opts = (over: Partial<EvalOptions>): EvalOptions => ({ ...parseArgs(['--contract', 'v3']), out: path.join(os.tmpdir(), `si8-v3-${Math.random()}.json`), ...over })

describe('fixture set, pinned hashes and baseline truth (committed files)', () => {
  test('the committed render spec is exactly the export of the TypeScript fixtures', () => {
    expect(readFileSync(ISSUER_EVIDENCE_SPEC_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(issuerEvidenceRenderSpecJson())
  })

  test('pinned hashes cover exactly the rendered documents and bind the committed spec', () => {
    const pins = JSON.parse(readFileSync(ISSUER_EVIDENCE_HASHES_FILE, 'utf8'))
    expect(Object.keys(pins.documents)).toEqual(docFixtures.map((f) => f.id))
    expect(pins.spec_sha256).toBe(canonicalTextSha256(ISSUER_EVIDENCE_SPEC_PATH))
    for (const h of Object.values(pins.documents)) expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  test('the set now includes a document naming no business and a styled sender-only letterhead', () => {
    const none = docFixtures.find((f) => f.id === 'iev3-no-business-named')!
    expect(none.truth).toEqual({ state: 'missing', business: null, statements: [] })
    const lh = docFixtures.find((f) => f.id === 'iev3-styled-letterhead-sender-only')!
    expect(lh.letterhead?.name).toBe('Epsilon Post Studio Ltd')
    expect(lh.truth.state).toBe('not_attributed')
    expect(lh.lines.join(' ')).not.toContain('Epsilon') // the business appears in the letterhead only
  })

  test('v3 baseline truth: bound to the committed v2 spec, one entry per document, additive (v2 truth untouched)', () => {
    const t = loadV3BaselineTruth(spec)
    expect(t.byId.size).toBe(45)
    const states = Array.from(t.byId.values()).map((x) => x?.state ?? 'not_scored')
    expect(states.filter((s) => s === 'identified')).toHaveLength(1) // only the explicit "Merchant of record" document
    expect(t.byId.get('conflict-reseller-merchant')).toMatchObject({ state: 'identified', business: 'ResellerHub Payments Ltd' })
    expect(t.byId.get('pdf-runway-standard-monthly')?.state).toBe('not_attributed') // a header alone never establishes issuance
    for (const id of ['unreadable-heavy-blur', 'unreadable-tiny-thumbnail', 'unreadable-dark-image']) expect(t.byId.get(id)).toBeNull()
    for (const v of Array.from(t.byId.values())) expect((v?.accept_states ?? []) as string[]).not.toContain('identified')
    // The v2 truth is unchanged: the same document still carries its v2 issuer value.
    expect(baseline.find((f) => f.id === 'pdf-runway-standard-monthly')!.truth.issuer_name).toEqual({ status: 'present', value: 'Runway AI, Inc.' })
  })

  test('a truth file bound to another spec is refused', () => {
    const tmp = path.join(mkdtempSync(path.join(os.tmpdir(), 'si8-v3-truth-')), 't.json')
    const t = JSON.parse(readFileSync(V3_BASELINE_TRUTH_FILE, 'utf8'))
    writeFileSync(tmp, JSON.stringify({ ...t, base_spec_sha256: '0'.repeat(64) }))
    expect(() => loadV3BaselineTruth(spec, tmp)).toThrow(/not bound/)
  })

  test('rendered documents that differ from the pins are refused', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'si8-v3-ie-'))
    const dir = path.join(root, 'issuer-evidence')
    mkdirSync(dir)
    const documents = docFixtures.map((f) => {
      const b = PDF(f.id)
      writeFileSync(path.join(dir, `${f.id}.pdf`), b)
      return { id: f.id, file: `${f.id}.pdf`, media_type: 'application/pdf', bytes: b.length, sha256: sha(b), width: null, height: null, document_text: '' }
    })
    writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ generator_version: 'x', spec_version: 'x', spec_sha256: sha(readFileSync(ISSUER_EVIDENCE_SPEC_PATH)), pymupdf_version: 'x', pillow_version: 'x', documents }))
    expect(() => loadIssuerEvidenceSet(root)).toThrow(/does not match its pinned hash/)
  })

  // Runs only against a local rendering of the current spec file (generated/ is git-ignored; a checkout's line-ending conversion
  // makes an earlier rendering stale, which the loader refuses by design).
  const rendered = loadManifest(path.join(DEFAULT_GENERATED_DIR, 'issuer-evidence'))
  ;(rendered && rendered.spec_sha256 === sha(readFileSync(ISSUER_EVIDENCE_SPEC_PATH)) ? test : test.skip)('locally rendered issuer-evidence documents match their pins', () => {
    expect(loadIssuerEvidenceSet().fixtures).toHaveLength(docFixtures.length)
  })
})

describe('options and guards', () => {
  test('the default contract is v2; v3 options are refused without --contract v3', () => {
    expect(parseArgs([]).contract).toBe('v2')
    expect(() => parseArgs(['--contract', 'v4'])).toThrow(/unknown --contract/)
    expect(() => assertContractOptions(parseArgs(['--set', 'all']))).toThrow(/need --contract v3/)
    expect(() => assertContractOptions(parseArgs(['--private-fixture', 'x', '--private-sha256', 'y']))).toThrow(/need --contract v3/)
  })

  test('v3 refuses repeats, truth corrections, a private document without its hash, or without --out outside the repository', () => {
    expect(() => assertContractOptions(parseArgs(['--contract', 'v3', '--repeats', '2']))).toThrow(/--repeats 1/)
    expect(() => assertContractOptions(parseArgs(['--contract', 'v3', '--truth-corrections', 'default']))).toThrow(/v2 contract only/)
    expect(() => assertContractOptions(parseArgs(['--contract', 'v3', '--private-fixture', 'x']))).toThrow(/both --private-fixture/)
    expect(() => assertContractOptions(parseArgs(['--contract', 'v3', '--private-fixture', 'x', '--private-sha256', 'y']))).toThrow(/--out outside the repository/)
    expect(() => assertContractOptions(parseArgs(['--contract', 'v3', '--private-fixture', 'x', '--private-sha256', 'y', '--out', path.join(process.cwd(), 'r.json')]))).toThrow(/--out outside/)
  })

  test('--set parsing', () => {
    expect(parseV3Sets('all')).toEqual(['issuer-evidence', 'baseline'])
    expect(parseV3Sets('baseline')).toEqual(['baseline'])
    expect(() => parseV3Sets('everything')).toThrow(/unknown --set/)
  })
})

describe('private document loader', () => {
  const tmp = () => mkdtempSync(path.join(os.tmpdir(), 'si8-v3-private-'))
  const truth = { state: 'denied', business: null, statements: [{ business: 'Runway', role: 'issuer_denied' }] }
  const write = (dir: string, over: Record<string, unknown> = {}) => {
    const bytes = PDF('private')
    writeFileSync(path.join(dir, 'doc.pdf'), bytes)
    const d = path.join(dir, 'descriptor.json')
    writeFileSync(d, JSON.stringify({ id: 'private-test-doc', file: 'doc.pdf', sha256: sha(bytes), truth, ...over }))
    return { d, h: sha(bytes) }
  }
  const outside = () => false

  ;(insideGitWorkTree(os.tmpdir()) ? test.skip : test)('accepts a document whose hash matches the descriptor and the command line', () => {
    const { d, h } = write(tmp())
    const p = loadPrivateFixture(d, h, outside)
    expect(p).toMatchObject({ id: 'private-test-doc', media_type: 'application/pdf', sha256: h })
  })

  test('refuses a wrong hash, a non-neutral id, an identified accept state, or a path inside the repository', () => {
    const dir = tmp()
    const { d, h } = write(dir)
    expect(() => loadPrivateFixture(d, '0'.repeat(64), outside)).toThrow(/pinned SHA-256|git working tree/)
    const bad = write(tmp(), { id: 'Runway receipt' })
    expect(() => loadPrivateFixture(bad.d, bad.h, outside)).toThrow(/private-\[a-z0-9-\]|git working tree/)
    const acc = write(tmp(), { truth: { ...truth, accept_states: ['identified'] } })
    expect(() => loadPrivateFixture(acc.d, acc.h, outside)).toThrow(/accept_states|git working tree/)
    expect(() => loadPrivateFixture(d, h, () => true)).toThrow(/outside the repository/)
    expect(() => loadPrivateFixture(path.join(process.cwd(), 'package.json'), h, outside)).toThrow(/outside the repository/)
  })
})

describe('v3 runner (no model call)', () => {
  let dir: string
  beforeAll(() => {
    dir = fakeBaselineDir()
  })

  test('v2 dry run is unchanged: v2 versions, v2 attribution, no v3 section', async () => {
    const d = deps()
    const r = await runReceiptEval({ ...parseArgs(['--subset', 'all']), fixturesDir: dir, out: path.join(dir, 'v2.json') }, d, {})
    expect(r.versions).toEqual({ schema: 'receipt-extraction-v2', prompt: 'receipt-prompt-v2', comparison: 'receipt-comparison-v2', scoring: 'receipt-scoring-v2', spec: 'receipt-fixtures-v2' })
    expect(r.attribution).toMatchObject({ runner: RECEIPT_EVAL_RUNNER_VERSION, reading_contract: 'v2', schema: RECEIPT_EXTRACTION_SCHEMA_VERSION, profile: { id: 'receipt', version: 1, active: true } })
    expect(r.v3).toBeNull()
    expect(r.plan).toMatchObject({ documents: 45, max_api_requests: 90 })
    expect(d.createLiveCaller).not.toHaveBeenCalled()
  })

  test('v3 dry run selects the v3 contract, the baseline set, full attribution, and makes no call', async () => {
    const d = deps()
    const r = await runReceiptEval(v3opts({ sets: 'baseline', fixturesDir: dir, pricing: { input_usd_per_mtok: 2, output_usd_per_mtok: 10 } }), d, {})
    expect(d.createLiveCaller).not.toHaveBeenCalled()
    expect(r.api_requests_made).toBe(0)
    expect(r.plan).toMatchObject({ documents: 45, max_api_requests: 90 })
    expect(r.versions).toMatchObject({ schema: 'receipt-extraction-v3', prompt: 'receipt-prompt-v3', profile: 'receipt@2' })
    expect(r.attribution).toMatchObject({
      runner: RECEIPT_EVAL_RUNNER_VERSION,
      model: null,
      reading_contract: 'v3',
      schema: 'receipt-extraction-v3',
      prompt: 'receipt-prompt-v3',
      profile: { id: 'receipt', version: 2, active: false },
    })
    expect(r.attribution.truth).toEqual(['receipt-fixtures-v2', 'receipt-fixtures-v3-issuer-truth-v1'])
    expect(r.attribution.scorers).toEqual(expect.arrayContaining(['issuer-evidence-scoring-v1', 'receipt-v3-plan-date-regression-v1', 'receipt-scoring-v2']))
    expect(r.v3?.verdict).toBeNull()
    expect(d.lines[0]).toMatch(/contract v3 .*45 documents/)
  })

  test('v3 mock run: real v3 validation and derivation of oracle readings; baseline issuer and regression gates PASS', async () => {
    const r = await runReceiptEval(v3opts({ mode: 'mock', sets: 'baseline', fixturesDir: dir }), deps(), {})
    expect(r.v3!.issuer!.verdict).toBe('PASS')
    expect(r.v3!.regression!.verdict).toBe('PASS')
    expect(r.v3!.regression!.gated.map((t) => t.id)).not.toContain('issuer_accuracy')
    expect(r.v3!.regression!.excluded.map((t) => t.id).sort()).toEqual(['comparison_accuracy', 'issuer_accuracy'])
    expect(r.v3!.verdict).toBe('PASS')
    expect(r.v3!.issuer_by_set.baseline).toEqual({ correct: 42, total: 42 })
    expect(r.v3!.per_document.find((x) => x.fixture_id === 'conflict-reseller-merchant')!.derived_state).toBe('identified')
  })

  test('without the baseline the verdict is INCOMPLETE, never PASS', async () => {
    const r = await runReceiptEval(v3opts({ mode: 'mock', sets: 'baseline', subsetGiven: true, subset: 'pdf-kling-pro-monthly', fixturesDir: dir }), deps(), {})
    expect(r.v3!.verdict).not.toBe('PASS') // one baseline document: the regression thresholds that need more are untested
  })

  test('live mode passes the v3 contract to the caller, records every request and stops at --max-calls', async () => {
    const calls: string[] = []
    const d = deps()
    d.createLiveCaller.mockImplementation(async (_model: string, _key: string, contract: string) => {
      calls.push(contract)
      return {
        call: async () => ({ ...(await createOracleCallerV3({ issuerTruth: { state: 'not_attributed', business: null, statements: [{ business: 'Kling AI', role: 'sender_only' }] }, baseline: baseline.find((f) => f.id === 'pdf-kling-pro-monthly')! })({ content: [], maxTokens: 1024 })), model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 50 } }),
        classifyFailure: () => 'unknown' as const,
      }
    })
    const out = path.join(mkdtempSync(path.join(os.tmpdir(), 'si8-v3-live-')), 'r.json')
    const opts = v3opts({
      mode: 'live', sets: 'baseline', fixturesDir: dir, confirmPaidCalls: true, maxCalls: 4, maxUsd: 8, model: 'claude-sonnet-5',
      pricing: { input_usd_per_mtok: 2, output_usd_per_mtok: 10 }, out,
    })
    const r = await runReceiptEval(opts, d, { ANTHROPIC_API_KEY: 'test' })
    expect(calls).toEqual([RECEIPT_EXTRACTION_SCHEMA_VERSION_V3])
    expect(r.api_requests_made).toBeLessThanOrEqual(4)
    expect(r.stopped_early).toMatch(/--max-calls 4/)
    expect(r.requests.every((q) => q.requested_model === 'claude-sonnet-5' && q.outcome === 'parsed')).toBe(true)
    expect(r.v3!.verdict).not.toBe('PASS') // stopped early: readings incomplete
    expect(JSON.parse(readFileSync(out, 'utf8')).attribution.model).toBe('claude-sonnet-5')
  })

  test('live mode refuses a report path inside the repository', async () => {
    const opts = v3opts({ mode: 'live', sets: 'baseline', fixturesDir: dir, confirmPaidCalls: true, maxCalls: 4, maxUsd: 8, model: 'claude-sonnet-5', pricing: { input_usd_per_mtok: 2, output_usd_per_mtok: 10 }, out: path.join(process.cwd(), 'r.json') })
    await expect(runReceiptEval(opts, deps(), { ANTHROPIC_API_KEY: 'test' })).rejects.toThrow(/--out to be outside the repository/)
  })
})

describe('gates', () => {
  const truthDoc = (id: string, t: ScorableIssuerDocument['truth']): ScorableIssuerDocument => ({ kind: 'document', id, truth: t })

  test('a letterhead read as an issuing attribution FAILS the critical false-identification gate', async () => {
    const f = baseline.find((x) => x.id === 'pdf-kling-pro-monthly')!
    const oracle = createOracleCallerV3({ issuerTruth: { state: 'identified', business: 'Kling AI', statements: [{ business: 'Kling AI', role: 'issuer_attribution' }] }, baseline: f })
    const o = await examineReceiptDocument(PDF('x'), { callModel: oracle, contract: RECEIPT_READING_CONTRACT_V3 })
    expect(o.status).toBe('examined')
    const s = scoreIssuerEvidence(new Map([['k', o.status === 'examined' ? o.extraction : null]]), [truthDoc('k', { state: 'not_attributed', business: null, statements: [{ business: 'Kling AI', role: 'sender_only' }] })])
    expect(s.gates.find((g) => g.id === 'false_identified')!.passed).toBe(false)
    expect(s.verdict).toBe('FAIL')
  })

  test('accept_states make an equally correct state count, but never relax the critical gates', () => {
    const r = validateReceiptExtractionV3({
      document_type: 'invoice', readability: 'partially_legible',
      product_or_plan_name: { status: 'not_shown', value: null, evidence: null }, transaction_date: { status: 'not_shown', value: null, evidence: null },
      service_period_start: { status: 'not_shown', value: null, evidence: null }, service_period_end: { status: 'not_shown', value: null, evidence: null },
      plan_candidates: [], multiple_plans_shown: false, instruction_like_text_present: false, issuer_statements: [],
    })
    const t = { state: 'not_attributed' as const, business: null, statements: [{ business: 'Kling AI', role: 'sender_only' as const }] }
    expect(scoreIssuerEvidence(new Map([['p', r]]), [truthDoc('p', t)]).documents[0].state_correct).toBe(false)
    expect(scoreIssuerEvidence(new Map([['p', r]]), [truthDoc('p', { ...t, accept_states: ['missing'] })]).documents[0].state_correct).toBe(true)
  })

  test('regression scoring ignores the issuer field but keeps plan and date: an invented date still FAILS', async () => {
    const f = baseline.find((x) => x.id === 'missing-no-date')!
    const oracle = createOracleCallerV3({ issuerTruth: null, baseline: f })
    const good = await examineReceiptDocument(PDF('g'), { callModel: oracle, contract: RECEIPT_READING_CONTRACT_V3 })
    const obs = [{ fixture_id: f.id, repeat: 1, outcome: good }]
    const scores = obs.map((o) => scoreObservation(f, o, ''))
    expect(scores[0].fields.issuer_name).toBe('missed') // the v2 truth expects the header as issuer...
    expect(withoutIssuerField(scores[0]).fields.issuer_name).toBeUndefined() // ...which the regression scorer does not count
    expect(scoreV3Regression([f], obs, scores, null).gated.find((t) => t.id === 'unsupported_critical')!.pass).toBe(true)
    if (good.status !== 'examined') throw new Error('expected a reading')
    const invented = { ...good, extraction: { ...good.extraction, transaction_date: { status: 'present' as const, value: '2026-01-01', evidence: 'RECEIPT' } } }
    const bad = [{ fixture_id: f.id, repeat: 1, outcome: invented }]
    const r = scoreV3Regression([f], bad, bad.map((o) => scoreObservation(f, o, '')), null)
    expect(r.gated.find((t) => t.id === 'unsupported_critical')!.pass).toBe(false)
    expect(r.verdict).toBe('FAIL')
  })
})
