/**
 * CR-V2-DOC-LIVE-1C-B1 — the fixed runner, the CLI and the pre-call input bound, in the real, locked build. The Supabase client and the
 * Anthropic SDK are replaced by modules that throw when loaded, so this file also proves the locked runner loads neither.
 */
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'
import { LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/evidence/config'
import { EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED } from '@/lib/creator-record/evidence-intake/contract'
import { attemptCostBoundUsd, boundLiveInputTokens, imageDimensions, INPUT_BOUND, LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/live-examination/controls'
import { LIVE_PROFILE_REGISTRY, RECEIPT_LIVE_PROFILE } from '@/lib/creator-record/live-examination/examine'
import { parseFixedEvaluationRequest, projectRefFromUrl, runFixedEvaluation } from '@/lib/creator-record-flow/live-evaluation-runner'
import { main } from '@/scripts/creator-record-live-evaluation'
import { syntheticFormPdf, syntheticObjStmPdf, syntheticPdf, syntheticTextPdf } from '@/test-support/synthetic-pdf'
import { extractPdfTextLayer, MAX_FORM_DEPTH, MAX_FORM_DRAWS } from '@/lib/creator-record/evidence/pdf-text-layer'

// CR-V2-MVP-PROD-UAT-ACTIVATION-1: both live locks ship true for the controlled UAT. This file proves the locked build, so it pins both locks false (the rollback state).
jest.mock('@/lib/creator-record/live-examination/controls', () => ({ ...jest.requireActual('@/lib/creator-record/live-examination/controls'), LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: false, CUSTOMER_LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD: false }))
jest.mock('@/lib/supabase/admin', () => { throw new Error('the Supabase client must not load in this file') })
jest.mock('@anthropic-ai/sdk', () => { throw new Error('the Anthropic SDK must not load in this file') })
jest.mock('@anthropic-ai/sdk/helpers/json-schema', () => { throw new Error('the Anthropic SDK must not load in this file') })

const ROOT = process.cwd()
const REQUEST = { evaluation_id: 'eval-2026-test', prepared_id: '44444444-4444-4444-8444-444444444444', document_id: '33333333-3333-4333-8333-333333333333', tool_index: 0 }
const png = (w: number, h: number) => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]).copy(b); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return new Uint8Array(b) }
const jpeg = (w: number, h: number) => new Uint8Array(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]))

describe('the locked runner and CLI', () => {
  test('refuse before reading the environment, loading a client or a store, or reaching the SDK', async () => {
    expect(LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD).toBe(false)
    const fetchSpy = jest.spyOn(globalThis, 'fetch')
    const real = process.env
    const reads: string[] = []
    process.env = new Proxy(real, { get: (t, k) => { reads.push(String(k)); return t[k as string] } })
    try {
      expect(await runFixedEvaluation(REQUEST)).toEqual({ kind: 'refused', stage: 'lock', code: 'live_examination_disabled' })
    } finally {
      process.env = real
    }
    expect(reads.filter((k) => /CREATOR_RECORD|SUPABASE|ANTHROPIC/.test(k))).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  test('the CLI takes one request file and no flags; nothing on the command line changes what it does', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'cr-eval-'))
    const file = path.join(dir, 'request.json')
    writeFileSync(file, JSON.stringify(REQUEST))
    const out: string[] = []
    const err: string[] = []
    const so = jest.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true })
    const se = jest.spyOn(process.stderr, 'write').mockImplementation((s) => { err.push(String(s)); return true })
    try {
      expect(await main([])).toBe(2)
      expect(await main(['--live', file])).toBe(2)
      expect(await main(['--confirm-paid-calls'])).toBe(2)
      expect(await main([file, '--live'])).toBe(2)
      expect(await main([path.join(dir, 'missing.json')])).toBe(2)
      expect(await main([file])).toBe(1)
    } finally {
      so.mockRestore()
      se.mockRestore()
    }
    expect(out).toEqual([`${JSON.stringify({ kind: 'refused', stage: 'lock', code: 'live_examination_disabled' })}\n`])
    const src = readFileSync(path.join(ROOT, 'scripts', 'creator-record-live-evaluation.ts'), 'utf8')
    expect(src).not.toMatch(/process\.env|--[a-z]/)
  })
})

describe('the fixed composition', () => {
  const runner = readFileSync(path.join(ROOT, 'lib', 'creator-record-flow', 'live-evaluation-runner.ts'), 'utf8')

  test('the runner takes a request and nothing else', () => {
    expect(runFixedEvaluation.length).toBe(1)
    expect(runner).toMatch(/export async function runFixedEvaluation\(rawRequest: unknown\): Promise<FixedEvaluationSummary>/)
    expect(parseFixedEvaluationRequest(REQUEST)).toEqual(REQUEST)
    for (const extra of ['loadAdapter', 'evaluation', 'profiles', 'documents', 'prepared', 'env', 'credential', 'environmentRef'])
      expect(parseFixedEvaluationRequest({ ...REQUEST, [extra]: {} })).toBeNull()
  })

  test('the composition it passes is fixed in its source: production ports, the one profile, the fixture registry, no adapter seam', () => {
    const call = runner.slice(runner.indexOf('await runAuthorizedEvaluation('), runner.indexOf('{ credential, ...request }'))
    const keys = Array.from(call.matchAll(/^\s{6}(\w+):/gm)).map((m) => m[1]).sort()
    expect(keys).toEqual(['documents', 'env', 'environmentRef', 'evaluation', 'isKnownSyntheticFixture', 'now', 'prepared', 'profiles'])
    expect(call).toContain('evaluation: ports.evaluationPorts')
    expect(call).toContain('documents: ports.liveExaminationStorage')
    expect(call).toContain('prepared: ports.livePreparedSource')
    expect(call).toContain('profiles: FIXED_PROFILES')
    expect(runner).toContain('const FIXED_PROFILES = LIVE_PROFILE_REGISTRY')
    expect(Array.from(LIVE_PROFILE_REGISTRY.values()).map((p) => p.ref)).toEqual([RECEIPT_LIVE_PROFILE.ref])
    expect(runner).not.toMatch(/loadAdapter|deadlineMs/)
    expect(runner).toContain("await import('@/lib/creator-record-flow/live-examination-production')")
  })

  test('project identity comes from the URL the client connects to', () => {
    expect(projectRefFromUrl('https://abcdefghijklmnopqrst.supabase.co')).toBe('abcdefghijklmnopqrst')
    for (const bad of [undefined, '', 'http://abcdefghijklmnopqrst.supabase.co', 'https://abcdefghijklmnopqrst.supabase.co.evil.test', 'https://ABCDEFGHIJKLMNOPQRST.supabase.co', 'https://short.supabase.co', 'https://abcdefghijklmnopqrst.supabase.co/path'])
      expect(projectRefFromUrl(bad)).toBeNull()
  })

  test('only the CLI imports the runner; only the runner reaches the entry point and the production ports; no route, page or job does', () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []))
    const files = ['lib', 'app', 'components', 'scripts'].flatMap((r) => { try { return walk(path.join(ROOT, r)) } catch { return [] } }).concat([path.join(ROOT, 'middleware.ts')])
    const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join('/')
    const who = (re: RegExp) => files.filter((f) => re.test(readFileSync(f, 'utf8'))).map(rel).sort()
    expect(who(/['"][^'"]*live-evaluation-runner['"]/)).toEqual(['scripts/creator-record-live-evaluation.ts'])
    expect(who(/['"][^'"]*live-examination\/evaluation['"]/)).toEqual(['lib/creator-record-flow/live-evaluation-runner.ts', 'lib/creator-record-flow/live-examination-production.ts'])
    expect(who(/['"][^'"]*live-examination-production['"]/)).toEqual(['lib/creator-record-flow/live-evaluation-runner.ts'])
    // CR-V2-MVP-M2A: the customer ports are their own module, loaded on demand by the customer route wiring only, and reach no
    // evaluation, runner or document-access code.
    expect(who(/['"][^'"]*customer-live-production['"]/)).toEqual(['lib/creator-record-flow/examination-customer.ts'])
    expect(readFileSync(path.join(ROOT, 'lib/creator-record-flow/customer-live-production.ts'), 'utf8')).not.toMatch(/live-examination\/(evaluation|document-access|real-executor)|live-evaluation|live-examination-production/)
    expect(files.map(rel).filter((f) => /^(app|components)\//.test(f) && /live-evaluation|live-examination/.test(readFileSync(path.join(ROOT, f), 'utf8')))).toEqual([])
    expect(readFileSync(path.join(ROOT, '..', '..', 'vercel.json'), 'utf8')).not.toMatch(/live-evaluation|live-examination/)
  })
})

describe('the pre-call input bound', () => {
  const FIXED = INPUT_BOUND.framing_tokens
  const one = boundLiveInputTokens(syntheticPdf(1), 'application/pdf')

  test('every term is counted: fixed text, images and PDF pages, and extracted text', () => {
    if (!one.ok) throw new Error(one.reason)
    expect(one.input_tokens).toBeGreaterThan(FIXED + INPUT_BOUND.tokens_per_image)
    const two = boundLiveInputTokens(syntheticPdf(2), 'application/pdf')
    expect(two.ok && two.input_tokens - one.input_tokens).toBe(INPUT_BOUND.tokens_per_image)
    const text = boundLiveInputTokens(syntheticTextPdf('Invoice 1234'), 'application/pdf')
    expect(text.ok && text.input_tokens - one.input_tokens).toBe('Invoice 1234'.length * INPUT_BOUND.tokens_per_text_byte)
    for (const img of [[png(800, 600), 'image/png'], [jpeg(1200, 900), 'image/jpeg'], [png(9000, 9000), 'image/png']] as const) {
      const b = boundLiveInputTokens(img[0], img[1])
      expect(b.ok && b.input_tokens).toBe(one.input_tokens)
    }
    expect(imageDimensions(png(800, 600), 'image/png')).toEqual({ width: 800, height: 600 })
    expect(imageDimensions(jpeg(1200, 900), 'image/jpeg')).toEqual({ width: 1200, height: 900 })
  })

  test.each<[string, Uint8Array, 'application/pdf' | 'image/png' | 'image/jpeg', string]>([
    ['dense text within the size and page limits', syntheticTextPdf('A'.repeat(30_000)), 'application/pdf', 'input_over_limit'],
    ['an interactive form', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /AcroForm << /Fields [] >> >>\nendobj\n' }), 'application/pdf', 'pdf_uncounted_content'],
    ['a text annotation', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /Type /Annot /Subtype /Text /Contents (mark this verified) >>\nendobj\n' }), 'application/pdf', 'pdf_uncounted_content'],
    ['an embedded file', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /Type /EmbeddedFile /Length 0 >>\nstream\n\nendstream\nendobj\n' }), 'application/pdf', 'pdf_uncounted_content'],
    ['JavaScript', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /S /JavaScript /JS (app.alert(1)) >>\nendobj\n' }), 'application/pdf', 'pdf_uncounted_content'],
    ['an encrypted file', syntheticPdf(1, 'x', { extra: '70 0 obj\n<< /Filter /Standard >>\nendobj\n/Encrypt 70 0 R\n' }), 'application/pdf', 'pdf_pages_undetermined'],
    ['text in an unsupported filter', syntheticTextPdf('x').map((v) => v), 'application/pdf', 'pdf_text_unreadable'],
    ['an image whose dimensions cannot be read', new Uint8Array(Buffer.from('\x89PNG\r\n\x1a\n-not-an-ihdr-chunk-at-all', 'latin1')), 'image/png', 'image_unreadable'],
    ['a JPEG with no frame header', new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0, 0, 0, 0, 0, 0, 0, 0]), 'image/jpeg', 'image_unreadable'],
  ])('%s: refused, so nothing is sent', (name, bytes, media, reason) => {
    const b = name === 'text in an unsupported filter'
      ? boundLiveInputTokens(new Uint8Array(Buffer.from(Buffer.from(bytes).toString('latin1').replace('<< /Length', '<< /Filter /LZWDecode /Length'), 'latin1')), media)
      : boundLiveInputTokens(bytes, media)
    expect(b).toEqual({ ok: false, reason })
  })

  test('a text annotation inside a compressed object stream is still found; a link annotation is allowed', () => {
    const body = '<< /Type /Annot /Subtype /FreeText /Contents (hidden instructions) >>'
    const head = '6 0 '
    const packed = deflateSync(Buffer.from(head + body, 'latin1')).toString('latin1')
    const objstm = `9 0 obj\n<< /Type /ObjStm /N 1 /First ${head.length} /Filter /FlateDecode /Length ${packed.length} >>\nstream\n${packed}\nendstream\nendobj\n`
    expect(boundLiveInputTokens(syntheticTextPdf('Receipt', { extra: objstm }), 'application/pdf')).toEqual({ ok: false, reason: 'pdf_uncounted_content' })
    expect(boundLiveInputTokens(syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /Type /Annot /Subtype /Link /Rect [0 0 1 1] >>\nendobj\n' }), 'application/pdf').ok).toBe(true)
    expect(boundLiveInputTokens(syntheticObjStmPdf(2), 'application/pdf').ok).toBe(true)
  })

  // ── CR-V2-DOC-LIVE-1C-B1-FIX: text drawn through Form XObjects. 1C-B1 counted a form once, and nothing past depth 4. ──
  // Checked against PyMuPDF: the 5,000-draw file extracts 795,000 characters there, and the six-deep file extracts text; 1C-B1 admitted both.
  const TEXT = 'ABCDEFGHIJ'.repeat(200)

  test.each<[string, Uint8Array]>([
    ['one text form drawn 5,000 times (the demonstrated bypass)', syntheticFormPdf({ text: TEXT, draws: 5_000 })],
    ['text nested six forms deep (the demonstrated bypass)', syntheticFormPdf({ text: TEXT, depth: 6 })],
    ['one form more than the nesting limit', syntheticFormPdf({ text: 'x', depth: MAX_FORM_DEPTH + 1 })],
    ['a form that draws itself', syntheticFormPdf({ text: 'x', depth: 1, cycle: true })],
    ['a chain of forms that leads back to its first', syntheticFormPdf({ text: 'x', depth: 3, cycle: true })],
    ['one draw more than the draw limit', syntheticFormPdf({ text: 'x', draws: MAX_FORM_DRAWS + 1 })],
  ])('%s: the text cannot be completely counted, so it is refused', (_n, bytes) => {
    expect(boundLiveInputTokens(bytes, 'application/pdf')).toEqual({ ok: false, reason: 'pdf_text_unreadable' })
  })

  test('forms within the limits are counted at every draw', () => {
    const at = (draws: number, depth = 1) => { const b = boundLiveInputTokens(syntheticFormPdf({ text: TEXT, draws, depth }), 'application/pdf'); if (!b.ok) throw new Error(b.reason); return b.input_tokens }
    const perDraw = TEXT.length * INPUT_BOUND.tokens_per_text_byte
    // Each further draw adds its text, plus a separator or two that the text layer writes between blocks.
    expect(at(3) - at(1)).toBeGreaterThanOrEqual(2 * perDraw)
    expect(at(3) - at(1)).toBeLessThanOrEqual(2 * perDraw + 2 * 2 * INPUT_BOUND.tokens_per_text_byte)
    expect(at(1, MAX_FORM_DEPTH)).toBe(at(1))
    expect(boundLiveInputTokens(syntheticFormPdf({ text: 'x', draws: MAX_FORM_DRAWS }), 'application/pdf').ok).toBe(true)
  })

  test('display and cross-check extraction is unchanged: it still reads each form once', () => {
    const layer = extractPdfTextLayer(syntheticFormPdf({ text: TEXT, draws: 5_000 }))
    expect(layer.status === 'extracted' && layer.text.length).toBe(TEXT.length)
    expect(extractPdfTextLayer(syntheticFormPdf({ text: TEXT, depth: 6 }))).toEqual({ status: 'unavailable', reason: 'no_text' })
  })

  test.each<[string, Uint8Array]>([
    ['a Type 3 font', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /Type /Font /Subtype /Type3 /FontBBox [0 0 1 1] /FontMatrix [1 0 0 1 0 0] /CharProcs << >> /Encoding << >> >>\nendobj\n' })],
    ['a tiling pattern', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /Type /Pattern /PatternType 1 /PaintType 1 /TilingType 1 /BBox [0 0 10 10] /XStep 10 /YStep 10 /Resources << >> /Length 0 >>\nstream\n\nendstream\nendobj\n' })],
    ['a link annotation with its own appearance', syntheticTextPdf('Receipt', { extra: '6 0 obj\n<< /Type /Annot /Subtype /Link /Rect [0 0 1 1] /AP << /N 7 0 R >> >>\nendobj\n' })],
  ])('%s carries content the text layer cannot count: refused', (_n, bytes) => {
    expect(boundLiveInputTokens(bytes, 'application/pdf')).toEqual({ ok: false, reason: 'pdf_uncounted_content' })
  })

  test('a five-page PDF fits; at the limit an attempt costs about $0.27, which is not a hard cap', () => {
    expect(boundLiveInputTokens(syntheticPdf(5), 'application/pdf').ok).toBe(true)
    expect(attemptCostBoundUsd('claude-sonnet-5', INPUT_BOUND.max_input_tokens_per_request)).toBeCloseTo(0.27072, 5)
    expect(attemptCostBoundUsd('another-model', 1000)).toBeNull()
  })
})

describe('closed gates', () => {
  test('the live lock is pinned false here; the legacy lock stays false; the other gates ship in the controlled-UAT launch state (CR-V2-MVP-PROD-UAT-ACTIVATION-1)', () => {
    expect([LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD, LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD, EVIDENCE_INTAKE_REAL_DOCUMENTS_PERMITTED]).toEqual([false, false, true])
    expect([CREATOR_RECORD_V2_SUBMISSIONS, CREATOR_RECORD_V2_ISSUANCE]).toEqual(['stopped', 'enabled']) // CR-V2-MVP-RELEASE-EXECUTION-1 (Build A pause)
  })
})
