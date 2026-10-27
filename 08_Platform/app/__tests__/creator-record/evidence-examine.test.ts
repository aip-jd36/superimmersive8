/**
 * CR-V2-EVIDENCE-SLICE-1 — the admin-only examine route and the examination
 * wrapper: authorization before the body, size and byte validation, zero
 * model calls on invalid input, fixture replay vs the disabled-by-default live
 * gate, and no storage or logging.
 *
 * FIXTURE REPLAY ONLY. Nothing here calls a model; the "live" path is
 * exercised with a scripted caller behind a mocked adapter. Extraction
 * quality is NOT tested here and cannot be: it needs real live runs.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const checkReviewerContextAccess = jest.fn()
jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))

const adapterLoads = { count: 0 }
const scriptedLive = jest.fn()
jest.mock('@/lib/creator-record/receipt-examination/examine.anthropic', () => {
  adapterLoads.count += 1
  return { createAnthropicReceiptCaller: () => scriptedLive }
})

import { POST } from '@/app/api/admin/creator-record-v2/examine/route'
import { LIVE_EXTRACTION_ENV, LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD, extractionMode, liveExtractionEnabled } from '@/lib/creator-record/evidence/config'
import { MAX_UPLOAD_BYTES, parseExaminedDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { loadLiveCaller } from '@/lib/creator-record/evidence/live-caller'
import { buildReplayTable, DEFAULT_REPLAY_TABLE, type ReplayFixture } from '@/lib/creator-record/evidence/replay'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'

const APP = path.resolve(__dirname, '..', '..')
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const pngBytes = (tag: string) => new Uint8Array([...PNG, ...Buffer.from(`synthetic-test:${tag}`)])
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const entry = (id: string) => REPLAY_FIXTURES.find((f) => f.fixture_id === id)!
/** A one-entry replay table keyed by these exact bytes (deterministic; no generated files needed). */
const tableFor = (bytes: Uint8Array, fixtureId: string) => buildReplayTable([{ ...entry(fixtureId), sha256: sha(bytes) } as ReplayFixture])

function multipart(parts: Record<string, Blob | string>): Request {
  const form = new FormData()
  for (const [k, v] of Object.entries(parts)) form.append(k, v)
  return new Request('http://localhost/api/admin/creator-record-v2/examine', { method: 'POST', body: form })
}
const fileBlob = (bytes: Uint8Array, name = 'receipt.png', type = 'image/png') => new File([bytes as BlobPart], name, { type })

const ORIGINAL_ENV = process.env[LIVE_EXTRACTION_ENV]
beforeEach(() => {
  checkReviewerContextAccess.mockReset()
  checkReviewerContextAccess.mockResolvedValue({ ok: true, userId: 'admin-1' })
  scriptedLive.mockReset()
  adapterLoads.count = 0
  delete process.env[LIVE_EXTRACTION_ENV]
})
afterAll(() => {
  if (ORIGINAL_ENV === undefined) delete process.env[LIVE_EXTRACTION_ENV]
  else process.env[LIVE_EXTRACTION_ENV] = ORIGINAL_ENV
})

describe('the live gate is disabled by default', () => {
  test('no setting, or any value other than exactly "enabled", means fixture replay', () => {
    expect(liveExtractionEnabled({})).toBe(false)
    for (const v of ['true', '1', 'ENABLED', 'yes', ' enabled']) expect(liveExtractionEnabled({ [LIVE_EXTRACTION_ENV]: v })).toBe(false)
    expect(extractionMode({})).toBe('fixture_replay')
    // The environment alone opens only a gate the code lock would also have to open.
    expect(extractionMode({ [LIVE_EXTRACTION_ENV]: 'enabled' }, true)).toBe('live_model')
  })

  test('CODE LOCK: this build does not permit live extraction, whatever the environment says', () => {
    expect(LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD).toBe(false)
    expect(liveExtractionEnabled({ [LIVE_EXTRACTION_ENV]: 'enabled' })).toBe(false)
    expect(extractionMode({ [LIVE_EXTRACTION_ENV]: 'enabled' })).toBe('fixture_replay')
    const src = readFileSync(path.join(APP, 'lib', 'creator-record', 'evidence', 'config.ts'), 'utf8')
    expect(src).toMatch(/export const LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: boolean = false\r?\n/)
    // The route and the live loader rely on the locked defaults only.
    const route = readFileSync(path.join(APP, 'app', 'api', 'admin', 'creator-record-v2', 'examine', 'route.ts'), 'utf8')
    expect(route).toMatch(/const mode = extractionMode\(\)/)
    expect(readFileSync(path.join(APP, 'lib', 'creator-record', 'evidence', 'live-caller.ts'), 'utf8')).toMatch(/if \(!liveExtractionEnabled\(env\)\)/)
  })

  test('the live adapter is never loaded, with the gate off or with only the environment set', async () => {
    await expect(loadLiveCaller({})).rejects.toThrow('disabled')
    await expect(loadLiveCaller({ [LIVE_EXTRACTION_ENV]: 'enabled' })).rejects.toThrow('disabled')
    expect(adapterLoads.count).toBe(0)
  })
})

describe('examineUpload — input checks before any model call', () => {
  test.each([
    ['empty file', new Uint8Array(), 'empty_file'],
    ['plain text renamed to .pdf', new Uint8Array(Buffer.from('hello, not a pdf')), 'unsupported_format'],
    ['a .docx (zip) file', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]), 'unsupported_format'],
    ['larger than the limit', new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(0x25), 'file_too_large'],
  ])('%s → could_not_examine, zero model calls, live caller never invoked', async (_name, bytes, reason) => {
    const live = jest.fn()
    for (const mode of ['fixture_replay', 'live_model'] as const) {
      const d = await examineUpload(bytes, 'x.pdf', { mode, liveCaller: live })
      expect(d.outcome).toBe('could_not_examine')
      expect(d.reason).toBe(reason)
      expect(d.model_calls).toBe(0)
      expect(d.extraction).toBeNull()
    }
    expect(live).not.toHaveBeenCalled()
  })

  test('the media type comes from the bytes, never the file name or declared type', async () => {
    const bytes = pngBytes('media')
    const d = await examineUpload(bytes, 'looks-like.pdf', { mode: 'fixture_replay', replayTable: tableFor(bytes, 'pdf-pika-pro-no-period') })
    expect(d.detected_media_type).toBe('image/png')
  })

  test('the SHA-256 identifies the exact bytes; the file name is sanitized', async () => {
    const bytes = pngBytes('hash')
    const d = await examineUpload(bytes, 'C:\\fakepath\\..\\my\u202ereceipt.png', { mode: 'fixture_replay' })
    expect(d.sha256).toBe(sha(bytes))
    expect(d.document_id).toBe(`DOC-${sha(bytes).slice(0, 12).toUpperCase()}`)
    expect(d.file_name).toBe('myreceipt.png')
  })
})

describe('examineUpload — fixture replay', () => {
  test('a known synthetic fixture is replayed through the real examination path, labelled, with zero model calls', async () => {
    const bytes = pngBytes('replay-hit')
    const live = jest.fn()
    const d = await examineUpload(bytes, 'pika.png', { mode: 'fixture_replay', liveCaller: live, replayTable: tableFor(bytes, 'pdf-pika-pro-no-period') })
    expect(d).toEqual(
      expect.objectContaining({ outcome: 'document_examined', reason: null, extraction_mode: 'fixture_replay', replay_fixture_id: 'pdf-pika-pro-no-period', model_calls: 0 }),
    )
    expect(d.versions.prompt).toBeNull()
    expect(d.versions.replay_set).toMatch(/oracle-replay/)
    expect(d.extraction?.product_or_plan_name).toEqual({ status: 'present', value: 'Pro', evidence: 'Pro' })
    expect(live).not.toHaveBeenCalled()
    expect(parseExaminedDocument(JSON.parse(JSON.stringify(d)))).toEqual(d)
  })

  test('an unknown file is received but not examined (no guess, no model call)', async () => {
    const d = await examineUpload(pngBytes('unknown'), 'other.png', { mode: 'fixture_replay' })
    expect(d).toEqual(expect.objectContaining({ outcome: 'document_provided_not_examined', reason: 'no_replay_fixture', model_calls: 0, extraction: null }))
  })

  test('a replay entry that fails the extraction schema fails closed', async () => {
    const bytes = pngBytes('bad-replay')
    const table = buildReplayTable([{ fixture_id: 'broken', sha256: sha(bytes), media_type: 'image/png', parsed_output: { document_type: 'receipt' } }])
    const d = await examineUpload(bytes, 'b.png', { mode: 'fixture_replay', replayTable: table })
    expect(d).toEqual(expect.objectContaining({ outcome: 'could_not_examine', reason: 'schema_invalid', model_calls: 0, extraction: null }))
  })

  test('the committed replay table covers all 45 synthetic fixtures with unique hashes', () => {
    expect(REPLAY_FIXTURES).toHaveLength(45)
    expect(DEFAULT_REPLAY_TABLE.size).toBe(45)
  })

  const generated = path.join(APP, 'lib', 'creator-record', 'eval', 'fixtures', 'generated', 'manifest.json')
  const hasGenerated = (() => {
    try {
      readFileSync(generated)
      return true
    } catch {
      return false
    }
  })()
  ;(hasGenerated ? test : test.skip)('the committed replay table matches the regenerated synthetic fixtures (when generated locally)', async () => {
    const { buildReplayEntries } = await import('@/lib/creator-record/eval/build-replay-table')
    const fresh = await buildReplayEntries()
    expect(fresh.entries).toEqual(REPLAY_FIXTURES)
  })

  ;(hasGenerated ? test : test.skip)('every real synthetic fixture file, examined end to end, passes the draft route’s server-side check (when generated locally)', async () => {
    const { verifyReturnedDocument } = await import('@/lib/creator-record/evidence/verify-returned-documents')
    const dir = path.dirname(generated)
    const manifest = JSON.parse(readFileSync(generated, 'utf8')) as { documents: { id: string; file: string }[] }
    for (const m of manifest.documents) {
      const d = await examineUpload(new Uint8Array(readFileSync(path.join(dir, m.file))), m.file, { mode: 'fixture_replay' })
      expect(d.replay_fixture_id).toBe(m.id)
      const roundTripped = parseExaminedDocument(JSON.parse(JSON.stringify(d)))!
      expect(verifyReturnedDocument({ tool_index: 0, document: roundTripped, review: { document_id: d.document_id, decision: 'not_reviewed', adopted_value: null } })).toBe(true)
    }
  })
})

describe('examineUpload — live mode (scripted caller; no real model)', () => {
  const ok = { id: 'x', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 10, output_tokens: 5 }, parsed_output: entry('pdf-pika-pro-no-period').parsed_output }

  test('a successful live read is labelled live_model with its call count and prompt version', async () => {
    const caller = jest.fn().mockResolvedValue(ok)
    const d = await examineUpload(pngBytes('live'), 'l.png', { mode: 'live_model', liveCaller: caller })
    expect(d).toEqual(expect.objectContaining({ outcome: 'document_examined', extraction_mode: 'live_model', replay_fixture_id: null, model_calls: 1 }))
    expect(d.versions.prompt).toBe('receipt-prompt-v2')
  })

  test('at most two calls per document, then fail closed', async () => {
    const caller = jest.fn().mockResolvedValue({ ...ok, parsed_output: null })
    const d = await examineUpload(pngBytes('live-missing'), 'l.png', { mode: 'live_model', liveCaller: caller })
    expect(caller).toHaveBeenCalledTimes(2)
    expect(d).toEqual(expect.objectContaining({ outcome: 'could_not_examine', reason: 'structured_output_missing', model_calls: 2, extraction: null }))
  })

  test('a provider error is not retried and fails closed', async () => {
    const caller = jest.fn().mockRejectedValue(new Error('timeout'))
    const d = await examineUpload(pngBytes('live-error'), 'l.png', { mode: 'live_model', liveCaller: caller })
    expect(caller).toHaveBeenCalledTimes(1)
    expect(d.reason).toBe('model_error')
  })

  test('live mode without a caller fails closed with no call', async () => {
    const d = await examineUpload(pngBytes('live-none'), 'l.png', { mode: 'live_model' })
    expect(d).toEqual(expect.objectContaining({ outcome: 'could_not_examine', reason: 'model_error', model_calls: 0 }))
  })
})

describe('POST /api/admin/creator-record-v2/examine', () => {
  test.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
  ])('%s before any byte of the body is read', async (status, error) => {
    checkReviewerContextAccess.mockResolvedValue({ ok: false, status })
    const touched = { body: false, formData: false, text: false }
    const req = {
      headers: new Headers({ 'content-type': 'multipart/form-data; boundary=x', 'content-length': '10' }),
      get body() {
        touched.body = true
        return null
      },
      formData: async () => {
        touched.formData = true
        return new FormData()
      },
      text: async () => {
        touched.text = true
        return ''
      },
    }
    const res = await POST(req as any)
    expect(res.status).toBe(status)
    expect(await res.json()).toEqual({ error })
    expect(touched).toEqual({ body: false, formData: false, text: false })
  })

  test('declared Content-Length over the limit → 413 before the body is read', async () => {
    const touched = { body: false }
    const req = {
      headers: new Headers({ 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(MAX_UPLOAD_BYTES * 2) }),
      get body() {
        touched.body = true
        return null
      },
    }
    const res = await POST(req as any)
    expect(res.status).toBe(413)
    expect(touched.body).toBe(false)
  })

  test('a streamed body over the limit (no Content-Length) → 413', async () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 128 * 1024)
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < big.length; i += 256 * 1024) c.enqueue(big.subarray(i, i + 256 * 1024))
        c.close()
      },
    })
    const req = { headers: new Headers({ 'content-type': 'multipart/form-data; boundary=x' }), body: stream }
    const res = await POST(req as any)
    expect(res.status).toBe(413)
  })

  test.each([
    ['not multipart', () => new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })],
    ['missing tool_index', () => multipart({ file: fileBlob(pngBytes('a')) })],
    ['extra field', () => multipart({ file: fileBlob(pngBytes('a')), tool_index: '0', note: 'x' })],
    ['tool_index out of range', () => multipart({ file: fileBlob(pngBytes('a')), tool_index: '7' })],
    ['file is a string', () => multipart({ file: 'not a file', tool_index: '0' })],
  ])('malformed (%s) → 400', async (_name, make) => {
    const res = await POST(make() as any)
    expect(res.status).toBe(400)
  })

  test('unsupported bytes → 200 with could_not_examine and zero model calls, even with the live gate on', async () => {
    process.env[LIVE_EXTRACTION_ENV] = 'enabled'
    const res = await POST(multipart({ file: fileBlob(new Uint8Array(Buffer.from('not a document')), 'fake.pdf', 'application/pdf'), tool_index: '0' }) as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.document).toEqual(expect.objectContaining({ outcome: 'could_not_examine', reason: 'unsupported_format', model_calls: 0 }))
    expect(scriptedLive).not.toHaveBeenCalled()
  })

  test('default (gate off): fixture replay only — the adapter is never loaded, no model call', async () => {
    const res = await POST(multipart({ file: fileBlob(pngBytes('route-default')), tool_index: '1' }) as any)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.tool_index).toBe(1)
    expect(data.document).toEqual(expect.objectContaining({ extraction_mode: 'fixture_replay', outcome: 'document_provided_not_examined', model_calls: 0 }))
    expect(adapterLoads.count).toBe(0)
    expect(scriptedLive).not.toHaveBeenCalled()
  })

  test('CODE LOCK: even with the environment set to "enabled", the route stays fixture-replay and never loads the adapter', async () => {
    process.env[LIVE_EXTRACTION_ENV] = 'enabled'
    scriptedLive.mockResolvedValue({ id: 'x', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: entry('pdf-pika-pro-no-period').parsed_output })
    const res = await POST(multipart({ file: fileBlob(pngBytes('route-live')), tool_index: '0' }) as any)
    const data = await res.json()
    expect(data.document).toEqual(expect.objectContaining({ extraction_mode: 'fixture_replay', model_calls: 0 }))
    expect(adapterLoads.count).toBe(0)
    expect(scriptedLive).not.toHaveBeenCalled()
  })

  test('the request cannot choose the mode (no mode field is accepted)', async () => {
    process.env[LIVE_EXTRACTION_ENV] = 'enabled'
    const res = await POST(multipart({ file: fileBlob(pngBytes('route-mode')), tool_index: '0', mode: 'live_model' }) as any)
    expect(res.status).toBe(400)
    expect(adapterLoads.count).toBe(0)
  })

  test('nothing about the request is logged', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined))
    await POST(multipart({ file: fileBlob(pngBytes('quiet')), tool_index: '0' }) as any)
    for (const s of spies) {
      expect(s).not.toHaveBeenCalled()
      s.mockRestore()
    }
  })
})

describe('no persistent storage and no reuse of /api/upload', () => {
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  const files = [
    'app/api/admin/creator-record-v2/examine/route.ts',
    'lib/creator-record/evidence/examine-upload.ts',
    'lib/creator-record/evidence/document-observations.ts',
    'lib/creator-record/evidence/replay.ts',
    'lib/creator-record/evidence/config.ts',
    'lib/creator-record/evidence/live-caller.ts',
    'components/creator-record/DocumentReviewPanel.tsx',
    'components/creator-record/CreatorRecordQuestionnaire.tsx',
  ]
  test.each(files)('%s: no storage, database, file-system write, upload route, browser storage or logging', (f) => {
    const src = stripComments(readFileSync(path.join(APP, f), 'utf8'))
    expect(src).not.toMatch(/storage\.|\.upload\(|\.from\(['"`]|\.rpc\(|\.(insert|upsert)\(|@\/lib\/supabase|@\/lib\/storage|\/api\/upload|writeFile|createWriteStream|localStorage|sessionStorage|indexedDB|console\./)
  })
})
