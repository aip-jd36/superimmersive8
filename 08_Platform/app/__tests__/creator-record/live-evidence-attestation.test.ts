/**
 * CR-V2-MVP-7 — the live evidence boundary: server-issued, session-bound,
 * short-lived attestations for live document observations.
 *
 * Deterministic. No model call: the Anthropic adapter is mocked with a
 * scripted caller. The live code lock is NOT lifted: in the route tests the
 * config module is mocked for this file only, to exercise the code that would
 * run once live extraction is enabled; a separate test uses the real config to
 * show the lock still refuses live observations. The signing key is a test
 * value set in this process only.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const checkReviewerContextAccess = jest.fn()
jest.mock('@/lib/reviewer-context/auth', () => ({ checkReviewerContextAccess }))
const getVerifiedSessionContext = jest.fn()
jest.mock('@/lib/reviewer-context/session-context', () => ({ getVerifiedSessionContext }))
const scriptedLive = jest.fn()
jest.mock('@/lib/creator-record/receipt-examination/examine.anthropic', () => ({ createAnthropicReceiptCaller: () => scriptedLive }))
const mode = { value: 'fixture_replay' as 'fixture_replay' | 'live_model' }
jest.mock('@/lib/creator-record/evidence/config', () => {
  const actual = jest.requireActual('@/lib/creator-record/evidence/config')
  return { ...actual, extractionMode: () => mode.value, liveExtractionEnabled: () => mode.value === 'live_model' }
})

import { ATTESTATION_TTL_SECONDS, canonicalJson, checkAttestation, EVIDENCE_SIGNING_KEY_ENV, evidenceSigningKey, issueAttestation } from '@/lib/creator-record/evidence/attestation'
import { DOCUMENT_CONSENT_HEADER, DOCUMENT_CONSENT_VALUE, parseExaminedDocument, type ExaminedDocument, type ToolDocument } from '@/lib/creator-record/evidence/document-observations'
import { examineUpload } from '@/lib/creator-record/evidence/examine-upload'
import { LIVE_EXTRACTION_API_KEY_ENV } from '@/lib/creator-record/evidence/live-caller'
import { verifyReturnedDocument, type LiveEvidenceCheck } from '@/lib/creator-record/evidence/verify-returned-documents'
import { documentForFixture } from '@/lib/creator-record/public-uat/fixtures'
import { REPLAY_FIXTURES } from '@/lib/creator-record/evidence/replay-fixtures.data'
import type { ReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'
import { POST as EXAMINE } from '@/app/api/admin/creator-record-v2/examine/route'
import { POST as DRAFT } from '@/app/api/admin/creator-record-v2/draft/route'

const APP = path.resolve(__dirname, '..', '..')
const KEY_TEXT = 'test-only-signing-key-0123456789abcdef-not-a-secret'
const KEY = Buffer.from(KEY_TEXT, 'utf8')
const CTX = { user_id: 'admin-1', session_id: 'session-A' }
const T0 = Date.UTC(2026, 9, 27, 12, 0, 0)
const PNG = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, n])
const PIKA: ReceiptExtraction = {
  ...(REPLAY_FIXTURES.find((f) => f.fixture_id === 'pdf-pika-pro-no-period')!.parsed_output as ReceiptExtraction),
  issuer_name: { status: 'present', value: 'Pika', evidence: 'Pika' },
}
const scripted = (ex: ReceiptExtraction) => jest.fn().mockResolvedValue({ id: 'scripted', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: ex })
const liveDoc = (ex: ReceiptExtraction = PIKA, n = 1) => examineUpload(PNG(n), 'receipt.png', { mode: 'live_model', liveCaller: scripted(ex) })
const roundTrip = (d: ExaminedDocument) => parseExaminedDocument(JSON.parse(JSON.stringify(d)))!
const clone = <X>(x: X): X => JSON.parse(JSON.stringify(x))

const ORIGINAL = { key: process.env[EVIDENCE_SIGNING_KEY_ENV], api: process.env[LIVE_EXTRACTION_API_KEY_ENV] }
beforeEach(() => {
  mode.value = 'fixture_replay'
  checkReviewerContextAccess.mockReset().mockResolvedValue({ ok: true, userId: 'admin-1' })
  getVerifiedSessionContext.mockReset().mockResolvedValue(CTX)
  scriptedLive.mockReset().mockResolvedValue({ id: 'scripted', stop_reason: 'end_turn', content: [{ type: 'text' }], usage: { input_tokens: 0, output_tokens: 0 }, parsed_output: PIKA })
  process.env[EVIDENCE_SIGNING_KEY_ENV] = KEY_TEXT
  process.env[LIVE_EXTRACTION_API_KEY_ENV] = 'test-placeholder-no-real-call'
})
afterAll(() => {
  for (const [k, v] of [[EVIDENCE_SIGNING_KEY_ENV, ORIGINAL.key], [LIVE_EXTRACTION_API_KEY_ENV, ORIGINAL.api]] as const) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('attestation (pure)', () => {
  test('a valid attestation verifies over the observation as it comes back from the browser', async () => {
    const d = await liveDoc()
    const token = issueAttestation(d, CTX, KEY, T0)
    expect(checkAttestation(token, roundTrip(d), CTX, KEY, T0 + 1000)).toBe('valid')
    expect(canonicalJson(roundTrip(d))).toBe(canonicalJson(d))
  })

  test.each<[string, (d: any) => void]>([
    ['the plan value', (d) => (d.extraction.product_or_plan_name.value = 'Fancy')],
    ['an added plan name', (d) => d.extraction.plan_candidates.push({ text: 'Standard', evidence: 'Standard', context: 'other' })],
    ['the seller', (d) => (d.extraction.issuer_name.value = 'Runway')],
    ['the document type', (d) => (d.extraction.document_type = 'invoice')],
  ])('a modified observation (%s) → document_mismatch', async (_n, edit) => {
    const d = await liveDoc()
    const token = issueAttestation(d, CTX, KEY, T0)
    const m = clone(d)
    edit(m)
    expect(checkAttestation(token, m, CTX, KEY, T0)).toBe('document_mismatch')
  })

  test.each<[string, (d: any) => void]>([
    ['model call count', (d) => (d.model_calls = 2)],
    ['prompt version', (d) => (d.versions.prompt = 'receipt-prompt-v1')],
    ['fingerprint', (d) => ((d.sha256 = 'a'.repeat(64)), (d.document_id = 'DOC-AAAAAAAAAAAA'))],
    ['file name', (d) => (d.file_name = 'other.png')],
    ['cross-check result', (d) => (d.cross_check = { ...d.cross_check, status: 'no_other_plan_names_found' })],
  ])('modified provenance (%s) → document_mismatch', async (_n, edit) => {
    const d = await liveDoc()
    const token = issueAttestation(d, CTX, KEY, T0)
    const m = clone(d)
    edit(m)
    expect(checkAttestation(token, m, CTX, KEY, T0)).toBe('document_mismatch')
  })

  test('expiry: valid just before, expired at the limit; a future-dated token is refused', async () => {
    const d = await liveDoc()
    const token = issueAttestation(d, CTX, KEY, T0)
    expect(checkAttestation(token, d, CTX, KEY, T0 + (ATTESTATION_TTL_SECONDS - 1) * 1000)).toBe('valid')
    expect(checkAttestation(token, d, CTX, KEY, T0 + ATTESTATION_TTL_SECONDS * 1000)).toBe('expired')
    expect(checkAttestation(issueAttestation(d, CTX, KEY, T0 + 10 * 60_000), d, CTX, KEY, T0)).toBe('not_yet_valid')
  })

  test('wrong admin or wrong session → context_mismatch (no reuse across users or sign-ins)', async () => {
    const d = await liveDoc()
    const token = issueAttestation(d, CTX, KEY, T0)
    expect(checkAttestation(token, d, { ...CTX, user_id: 'admin-2' }, KEY, T0)).toBe('context_mismatch')
    expect(checkAttestation(token, d, { ...CTX, session_id: 'session-B' }, KEY, T0)).toBe('context_mismatch')
  })

  test('missing, malformed, wrong-key or edited tokens are refused', async () => {
    const d = await liveDoc()
    const token = issueAttestation(d, CTX, KEY, T0)
    const [p, s] = token.split('.')
    expect(checkAttestation(undefined, d, CTX, KEY, T0)).toBe('missing')
    expect(checkAttestation('', d, CTX, KEY, T0)).toBe('missing')
    expect(checkAttestation('not a token', d, CTX, KEY, T0)).toBe('malformed')
    expect(checkAttestation(issueAttestation(d, CTX, Buffer.from('another-key-of-sufficient-length-0123456789'), T0), d, CTX, KEY, T0)).toBe('bad_signature')
    expect(checkAttestation(`${p}.${s.slice(0, -2)}${s.endsWith('AA') ? 'BB' : 'AA'}`, d, CTX, KEY, T0)).toBe('bad_signature')
    // Extending the expiry or switching the session in the payload breaks the signature.
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'))
    for (const forged of [{ ...payload, exp: payload.exp + 86_400 }, { ...payload, sid: 'session-B' }, { ...payload, doc: '0'.repeat(64) }]) {
      expect(checkAttestation(`${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${s}`, d, { ...CTX, session_id: forged.sid }, KEY, T0)).toBe('bad_signature')
    }
  })

  test('the signing key is required, has a minimum length and is never part of the token', async () => {
    expect(evidenceSigningKey({})).toBeNull()
    expect(evidenceSigningKey({ [EVIDENCE_SIGNING_KEY_ENV]: 'short' })).toBeNull()
    expect(evidenceSigningKey({ [EVIDENCE_SIGNING_KEY_ENV]: KEY_TEXT })).toEqual(KEY)
    const token = issueAttestation(await liveDoc(), CTX, KEY, T0)
    expect(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')).not.toContain(KEY_TEXT)
    expect(token).not.toContain(Buffer.from(KEY_TEXT).toString('base64url'))
  })
})

describe('verifyReturnedDocument with live evidence', () => {
  const check = (over: Partial<LiveEvidenceCheck> = {}): LiveEvidenceCheck => ({ context: CTX, key: KEY, now_ms: T0, ...over })
  test('a live observation is accepted only with a valid attestation, in a build that permits live', async () => {
    const d = roundTrip(await liveDoc())
    const td: ToolDocument = { tool_index: 0, document: d, attestation: issueAttestation(d, CTX, KEY, T0) }
    expect(verifyReturnedDocument(td, undefined, 'live_model', check())).toBe(true)
    expect(verifyReturnedDocument(td, undefined, 'fixture_replay', check())).toBe(false) // the lock still refuses it
    expect(verifyReturnedDocument({ ...td, attestation: undefined }, undefined, 'live_model', check())).toBe(false)
    expect(verifyReturnedDocument(td, undefined, 'live_model')).toBe(false)
    expect(verifyReturnedDocument(td, undefined, 'live_model', check({ key: null }))).toBe(false)
    expect(verifyReturnedDocument(td, undefined, 'live_model', check({ context: null }))).toBe(false)
    expect(verifyReturnedDocument(td, undefined, 'live_model', check({ context: { ...CTX, session_id: 'session-B' } }))).toBe(false)
    expect(verifyReturnedDocument(td, undefined, 'live_model', check({ now_ms: T0 + ATTESTATION_TTL_SECONDS * 1000 }))).toBe(false)
  })
  test('replay: an attestation issued for one observation cannot be attached to another', async () => {
    const a = roundTrip(await liveDoc(PIKA, 1))
    const b = roundTrip(await liveDoc({ ...PIKA, product_or_plan_name: { status: 'present', value: 'Fancy', evidence: 'Fancy $76.00' }, plan_candidates: [{ text: 'Fancy', evidence: 'Fancy $76.00', context: 'charge_line' }] }, 2))
    expect(verifyReturnedDocument({ tool_index: 0, document: b, attestation: issueAttestation(a, CTX, KEY, T0) }, undefined, 'live_model', check())).toBe(false)
  })
  test('fixture replay: still checked against SI8’s table, and must carry no attestation', () => {
    const d = documentForFixture('pdf-pika-pro-no-period')
    expect(verifyReturnedDocument({ tool_index: 0, document: d })).toBe(true)
    expect(verifyReturnedDocument({ tool_index: 0, document: d, attestation: issueAttestation(d, CTX, KEY, T0) })).toBe(false)
  })
})

// ───────────────────────────────────────── routes (config mocked for this file only)

const consent = { [DOCUMENT_CONSENT_HEADER]: DOCUMENT_CONSENT_VALUE }
const examineReq = () => {
  const form = new FormData()
  form.append('file', new File([PNG(9) as BlobPart], 'receipt.png', { type: 'image/png' }))
  form.append('tool_index', '0')
  return new Request('http://localhost/api/admin/creator-record-v2/examine', { method: 'POST', headers: consent, body: form }) as any
}
const draftReq = (body: unknown) => ({ text: async () => JSON.stringify(body) }) as any
const FORM = { answers: { P1: ['MVP-7'], P3: ['own_channels'], F1: ['TW'], F2: ['online_worldwide'], L1: ['no'], M0: ['none'], H1: ['edited'] }, tools: [{ T1: ['pika'], T3: ['Pro'], T4: ['May 2026'] }], acknowledgements: { A1: true, A2: true } }

describe('examine route (live path, lock mocked open in this test file only)', () => {
  test('issues a session-bound attestation with a live observation; the key never reaches the response', async () => {
    mode.value = 'live_model'
    const res = await EXAMINE(examineReq())
    const raw = await res.text()
    expect(res.status).toBe(200)
    const data = JSON.parse(raw)
    expect(data.document.extraction_mode).toBe('live_model')
    expect(checkAttestation(data.attestation, roundTrip(data.document), CTX, KEY, Date.now())).toBe('valid')
    expect(raw).not.toContain(KEY_TEXT)
    expect(getVerifiedSessionContext).toHaveBeenCalledWith('admin-1')
  })
  test('without a signing key → 503, and without a verified session → 401, both BEFORE any model call', async () => {
    mode.value = 'live_model'
    delete process.env[EVIDENCE_SIGNING_KEY_ENV]
    expect((await EXAMINE(examineReq())).status).toBe(503)
    process.env[EVIDENCE_SIGNING_KEY_ENV] = KEY_TEXT
    getVerifiedSessionContext.mockResolvedValue(null)
    expect((await EXAMINE(examineReq())).status).toBe(401)
    expect(scriptedLive).not.toHaveBeenCalled()
  })
  test('fixture replay: no attestation is issued and no session lookup is made', async () => {
    const res = await EXAMINE(examineReq())
    expect((await res.json()).attestation).toBeUndefined()
    expect(getVerifiedSessionContext).not.toHaveBeenCalled()
  })
})

describe('draft route (live path, lock mocked open in this test file only)', () => {
  const examined = async () => {
    mode.value = 'live_model'
    const data = await (await EXAMINE(examineReq())).json()
    return { document: data.document as ExaminedDocument, attestation: data.attestation as string }
  }
  test('valid → 200; the reconciliation is computed by the server', async () => {
    const { document, attestation } = await examined()
    const res = await DRAFT(draftReq({ ...FORM, documents: [{ tool_index: 0, document, attestation }] }))
    expect(res.status).toBe(200)
    const view = (await res.json()).view
    expect(view.trace.evidence_reconciliation[0]).toEqual(expect.objectContaining({ provider: { result: 'appears_consistent', reason: 'same_tool' } }))
  })
  test.each<[string, (b: { document: any; attestation: string }) => unknown]>([
    ['a modified observation', (b) => ({ ...b, document: { ...b.document, extraction: { ...b.document.extraction, product_or_plan_name: { status: 'present', value: 'Fancy', evidence: 'Fancy' } } } })],
    ['modified provenance', (b) => ({ ...b, document: { ...b.document, model_calls: 2 } })],
    ['a missing attestation', (b) => ({ document: b.document })],
    ['an invalid attestation', (b) => ({ ...b, attestation: 'abc.def' })],
  ])('%s → 400 document_not_accepted', async (_n, mutate) => {
    const b = await examined()
    const res = await DRAFT(draftReq({ ...FORM, documents: [{ tool_index: 0, ...(mutate(b) as object) }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('document_not_accepted')
  })
  test('another session (sign-out / sign-in, or another browser) cannot reuse the observation', async () => {
    const b = await examined()
    getVerifiedSessionContext.mockResolvedValue({ ...CTX, session_id: 'session-B' })
    expect((await DRAFT(draftReq({ ...FORM, documents: [{ tool_index: 0, ...b }] }))).status).toBe(400)
    getVerifiedSessionContext.mockResolvedValue(null)
    expect((await DRAFT(draftReq({ ...FORM, documents: [{ tool_index: 0, ...b }] }))).status).toBe(400)
  })
  test('a forged reconciliation next to a valid attestation is still refused', async () => {
    const b = await examined()
    const res = await DRAFT(draftReq({ ...FORM, documents: [{ tool_index: 0, ...b, reconciliation: { plan: { result: 'appears_consistent', reason: 'same_plan_name' } } }] }))
    expect(res.status).toBe(400)
  })
  test('locked build: the same valid live observation is refused', async () => {
    const b = await examined()
    mode.value = 'fixture_replay'
    expect((await DRAFT(draftReq({ ...FORM, documents: [{ tool_index: 0, ...b }] }))).status).toBe(400)
  })
})

describe('the real code lock is unchanged', () => {
  test('LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD is still false in source', () => {
    const src = readFileSync(path.join(APP, 'lib', 'creator-record', 'evidence', 'config.ts'), 'utf8')
    expect(src).toMatch(/export const LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: boolean = false/)
    expect(jest.requireActual('@/lib/creator-record/evidence/config').extractionMode({ CREATOR_RECORD_LIVE_EXTRACTION: 'enabled' })).toBe('fixture_replay')
  })
  test('browser code never imports the attestation module or the signing key name', () => {
    for (const f of ['app/admin/creator-record-v2/CreatorRecordPrototypeClient.tsx', 'components/creator-record/CreatorRecordQuestionnaire.tsx', 'components/creator-record/DocumentReviewPanel.tsx', 'components/creator-record/DraftRecordView.tsx', 'app/uat/creator-record-v2/PublicUatClient.tsx', 'lib/creator-record/evidence/document-observations.ts']) {
      const src = readFileSync(path.join(APP, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      expect([f, /evidence\/attestation|CREATOR_RECORD_EVIDENCE_SIGNING_KEY|createHmac/.test(src)]).toEqual([f, false])
    }
  })
})
