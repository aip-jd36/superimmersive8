/**
 * SI8-PRIVACY-CRC-1C — results-gate disclosure provenance: `capture_notice_version` records the disclosure the visitor's gate
 * actually rendered, never the server's current policy.
 *
 * The CRC notice's publication state is mocked and flipped between "page render" and "submit", which is exactly what happens to a
 * visitor whose page loaded before the publishing deploy and who submits after it. The request then goes through the real
 * parseRequest and the real deliverCrcResultsEmail (provider and artifact persistence mocked, as in results-email-delivery.test.ts).
 */
import { readFileSync } from 'fs'
import path from 'path'

const policy = { published: false }
jest.mock('@/lib/legal/crc-privacy-notice', () => ({
  ...jest.requireActual('@/lib/legal/crc-privacy-notice'),
  crcPrivacyNoticePublished: (doc?: unknown) =>
    doc === undefined ? policy.published : jest.requireActual('@/lib/legal/crc-privacy-notice').crcPrivacyNoticePublished(doc),
}))
jest.mock('@/lib/emails', () => ({ sendCrcResultsEmail: jest.fn() }))
jest.mock('../../lib/crc-engine/run-crc-conversation', () => ({
  runCRCConversation: jest.fn(() => ({ output: { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' } })),
}))
jest.mock('../../lib/crc-engine/results-email-artifacts', () => ({
  createResultsEmailArtifact: jest.fn(async () => ({ id: 'artifact-1', contentHash: 'hash-1', generatedAt: '2026-11-17T00:00:00.000Z' })),
  findMostRecentResultsEmailArtifactId: jest.fn(async () => null),
  recordResultsEmailDeliveryAttempt: jest.fn(async () => ({ ok: true })),
}))

import { sendCrcResultsEmail } from '@/lib/emails'
import { parseRequest } from '@/lib/crc-engine/api-contract'
import { deliverCrcResultsEmail } from '@/lib/crc-engine/results-email-delivery'
import {
  parseResultsGateDisclosureVersion, resultsGateDisclosure, RESULTS_GATE_NOTICE_V1, RESULTS_GATE_NOTICE_V2, SUPPORTED_RESULTS_GATE_DISCLOSURE_VERSIONS,
} from '@/lib/crc-engine/results-gate-disclosure'
import { CRC_CONFIG } from '@/lib/crc-engine/config'

const mockSend = sendCrcResultsEmail as jest.Mock
const APP = path.join(__dirname, '..', '..')
const src = (p: string) => readFileSync(path.join(APP, p), 'utf8').replace(/\r\n/g, '\n')

function fakeClient() {
  const updates: { table: string; payload: Record<string, unknown> }[] = []
  const rpcCalls: string[] = []
  const client = {
    rpc: jest.fn((fn: string) => {
      rpcCalls.push(fn)
      if (fn === 'upsert_crc_lead') return Promise.resolve({ data: 'lead-1', error: null })
      if (fn === 'claim_crc_result_send') return Promise.resolve({ data: [{ claimed: true, reason: null }], error: null })
      if (fn === 'record_crc_result_send_outcome') return Promise.resolve({ error: null })
      return Promise.resolve({ data: null, error: { message: `unexpected rpc ${fn}` } })
    }),
    from: jest.fn((table: string) => ({
      update: jest.fn((payload: Record<string, unknown>) => {
        updates.push({ table, payload })
        return { eq: jest.fn(async () => ({ error: null })) }
      }),
      insert: jest.fn(async () => ({ error: null })),
    })),
  }
  const noticeWrites = () => updates.filter((u) => u.table === 'crc_sessions' && 'capture_notice_version' in u.payload).map((u) => u.payload.capture_notice_version)
  return { client: client as any, noticeWrites, rpcCalls }
}

const BASE = { sessionId: 'synthetic-session-1', structuredUnderstanding: {} as any, matrix: [] as any, attributionToken: 'attr-1' }

/** The page's own body for an email submission (app/crc/page.tsx handleResultsEmailSubmit). */
function pageEmailBody(gate: ReturnType<typeof resultsGateDisclosure>, email: string) {
  return { email, resultsGateDisclosureVersion: gate.version }
}

/** The route's email branch: parse, then deliver with the parsed disclosure (app/api/crc/turn/route.ts). */
async function submit(body: Record<string, unknown>) {
  const parsed = parseRequest(body)
  if ('error' in parsed) return { refused: parsed.error, ...fakeClient() }
  const fc = fakeClient()
  await deliverCrcResultsEmail(fc.client, {
    ...BASE,
    email: parsed.kind === 'email' ? parsed.email : 'synthetic@example.com',
    isExplicitResend: parsed.kind === 'resend_result_email',
    captureNoticeVersion: parsed.kind === 'email' ? parsed.disclosureVersion : undefined,
  })
  return { refused: null, ...fc }
}

beforeEach(() => {
  policy.published = false
  mockSend.mockReset()
  mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-synthetic' })
})

describe('recorded version = rendered version', () => {
  test('visitor sees v1 and submits while v1 is active', async () => {
    const gate = resultsGateDisclosure()
    expect(gate).toEqual({ showPrivacyLink: false, version: 'results-gate-v1' })
    const r = await submit(pageEmailBody(gate, 'synthetic@example.com'))
    expect(r.refused).toBeNull()
    expect(r.noticeWrites()).toEqual(['results-gate-v1'])
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  test('visitor sees v2 and submits while v2 is active', async () => {
    policy.published = true
    const gate = resultsGateDisclosure()
    expect(gate).toEqual({ showPrivacyLink: true, version: 'results-gate-v2' })
    const r = await submit(pageEmailBody(gate, 'synthetic@example.com'))
    expect(r.noticeWrites()).toEqual(['results-gate-v2'])
  })

  test('visitor sees v1 before publication, then submits after v2 is published: recorded as v1', async () => {
    const gate = resultsGateDisclosure() // page rendered by the build before publication
    policy.published = true // the publishing deploy happens before the visitor submits
    const r = await submit(pageEmailBody(gate, 'synthetic@example.com'))
    expect(r.noticeWrites()).toEqual(['results-gate-v1'])
  })

  test('a page loaded before this field existed (no field) after publication: recorded as v1, the only gate such a page renders', async () => {
    policy.published = true
    const r = await submit({ email: 'synthetic@example.com' })
    expect(r.noticeWrites()).toEqual(['results-gate-v1'])
  })

  test('the server never consults its own policy for the recorded version', () => {
    const delivery = src('lib/crc-engine/results-email-delivery.ts')
    expect(delivery).not.toMatch(/crcPrivacyNoticePublished|resultsGateDisclosure\(|crc-privacy-notice/)
    expect(delivery).toContain('capture_notice_version: params.captureNoticeVersion')
    expect(src('lib/crc-engine/api-contract.ts')).not.toMatch(/crcPrivacyNoticePublished|resultsGateDisclosure\(/)
    expect(src('app/api/crc/turn/route.ts')).toContain("captureNoticeVersion: parsed.kind === 'email' ? parsed.disclosureVersion : undefined,")
  })
})

describe('fail closed on unsupported values', () => {
  test.each([
    ['results-gate-v3'], [''], ['RESULTS-GATE-V1'], [' results-gate-v1'], ['results-gate-v1 '], [1], [true], [null], [{}], [['results-gate-v1']],
    ['x'.repeat(500)],
  ])('%j is refused before anything is persisted or sent', async (value) => {
    const r = await submit({ email: 'synthetic@example.com', resultsGateDisclosureVersion: value })
    expect(r.refused).toBe('resultsGateDisclosureVersion is not supported.')
    expect(r.rpcCalls).toEqual([])
    expect(r.noticeWrites()).toEqual([])
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('the field is refused on any request other than an email submission', () => {
    for (const body of [
      { resendResultEmail: true, resultsGateDisclosureVersion: 'results-gate-v1' },
      { message: 'hi', resultsGateDisclosureVersion: 'results-gate-v1' },
      { declineAction: 'skip_question', resultsGateDisclosureVersion: 'results-gate-v1' },
      { guidedInit: { guidedEntryInitId: 'x' }, resultsGateDisclosureVersion: 'results-gate-v1' },
      { resultsGateDisclosureVersion: 'results-gate-v1' },
    ]) expect(parseRequest(body)).toEqual({ error: 'resultsGateDisclosureVersion is only accepted with email.' })
  })

  test('supported values are exactly v1 and v2; v1 equals the launched config constant', () => {
    expect(SUPPORTED_RESULTS_GATE_DISCLOSURE_VERSIONS).toEqual(['results-gate-v1', 'results-gate-v2'])
    expect(RESULTS_GATE_NOTICE_V1).toBe(CRC_CONFIG.captureNoticeVersion)
    expect(parseResultsGateDisclosureVersion(undefined)).toEqual({ ok: true, version: 'results-gate-v1', source: 'legacy_client' })
    expect(parseResultsGateDisclosureVersion(RESULTS_GATE_NOTICE_V2)).toEqual({ ok: true, version: 'results-gate-v2', source: 'reported' })
  })
})

describe('existing results-email behaviour', () => {
  test('an explicit resend sends again and leaves the recorded version untouched', async () => {
    policy.published = true
    const r = await submit({ resendResultEmail: true })
    expect(r.refused).toBeNull()
    expect(r.noticeWrites()).toEqual([])
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(r.rpcCalls).toEqual(['upsert_crc_lead', 'claim_crc_result_send', 'record_crc_result_send_outcome'])
  })

  test('an email submission makes the same calls as before, plus the one version write', async () => {
    const r = await submit(pageEmailBody(resultsGateDisclosure(), 'synthetic@example.com'))
    expect(r.rpcCalls).toEqual(['upsert_crc_lead', 'claim_crc_result_send', 'record_crc_result_send_outcome'])
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe('the page reports what it renders', () => {
  const page = src('app/crc/page.tsx')

  test('one decision drives both the link and the reported version', () => {
    expect(page).toContain('const gateDisclosure = resultsGateDisclosure()')
    expect(page).toContain('{gateDisclosure.showPrivacyLink && <ResultsGatePrivacyLink locale={locale} />}')
    expect(page).toContain('submitResultsEmail({ email: trimmed, resultsGateDisclosureVersion: gateDisclosure.version })')
  })

  test('the link and the field ship together: the only email submission carries the field, and nothing else renders the link', () => {
    expect(page.match(/submitResultsEmail\(\{ email:/g)).toHaveLength(1)
    expect(page.match(/<ResultsGatePrivacyLink/g)).toHaveLength(1)
  })
})
