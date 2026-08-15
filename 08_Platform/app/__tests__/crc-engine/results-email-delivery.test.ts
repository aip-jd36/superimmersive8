/**
 * Results-email delivery orchestration tests (CRC Results Gate milestone,
 * 2026-08-14). Covers PM test cases F, G, H, T, U, V and the general
 * outcome-branching contract. `sendCrcResultsEmail` and `runCRCConversation`
 * are both mocked -- this test is about the ORCHESTRATION's sequencing and
 * failure-handling, not about email rendering (results-email-template
 * tests that) or Retrieval/Projection (tested elsewhere). Mocking
 * sendCrcResultsEmail also directly proves PM cases T/U/V: nothing in this
 * module imports or constructs an Anthropic adapter at all, so there is no
 * code path here that could make a model call regardless of outcome.
 */

import { deliverCrcResultsEmail } from '../../lib/crc-engine/results-email-delivery'

jest.mock('@/lib/emails', () => ({
  sendCrcResultsEmail: jest.fn(),
}))
jest.mock('../../lib/crc-engine/run-crc-conversation', () => ({
  runCRCConversation: jest.fn(() => ({ output: { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' } })),
}))

import { sendCrcResultsEmail } from '@/lib/emails'

const mockSend = sendCrcResultsEmail as jest.Mock

function fakeClient(opts: {
  upsertLeadError?: unknown
  linkError?: unknown
  emailUpdateError?: unknown
  claim: { claimed: boolean; reason: string | null }
  claimError?: unknown
  recordError?: unknown
}) {
  const rpcCalls: { fn: string; args: unknown }[] = []
  const client = {
    rpc: jest.fn((fn: string, args: unknown) => {
      rpcCalls.push({ fn, args })
      if (fn === 'upsert_crc_lead') {
        return opts.upsertLeadError ? Promise.resolve({ data: null, error: opts.upsertLeadError }) : Promise.resolve({ data: 'lead-1', error: null })
      }
      if (fn === 'claim_crc_result_send') {
        return opts.claimError ? Promise.resolve({ data: null, error: opts.claimError }) : Promise.resolve({ data: [opts.claim], error: null })
      }
      if (fn === 'record_crc_result_send_outcome') {
        return Promise.resolve({ error: opts.recordError ?? null })
      }
      return Promise.resolve({ data: null, error: { message: `unexpected rpc ${fn}` } })
    }),
    from: jest.fn((table: string) => ({
      update: jest.fn(() => ({
        eq: jest.fn(async () => ({ error: table === 'crc_sessions' ? (opts.linkError ?? opts.emailUpdateError ?? null) : null })),
      })),
      insert: jest.fn(async () => ({ error: null })),
    })),
  }
  return { client: client as any, rpcCalls }
}

const BASE_PARAMS = {
  sessionId: 'session-1',
  email: 'jd@pmfstrategy.com',
  isExplicitResend: false,
  structuredUnderstanding: {} as any,
  matrix: [] as any,
  attributionToken: 'attr-1',
}

beforeEach(() => {
  mockSend.mockReset()
})

describe('deliverCrcResultsEmail', () => {
  // PM case G: DB failure before send -> result remains gated (never
  // reaches the point of computing/sending real content).
  // PM case F: DB failure before send -> Resend is NOT called.
  test('lead upsert failure blocks the send entirely -- Resend is never called', async () => {
    const { client } = fakeClient({ upsertLeadError: { message: 'db down' }, claim: { claimed: true, reason: null } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'lead_persistence_failed' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('session-link failure also blocks the send -- Resend is never called', async () => {
    const { client } = fakeClient({ linkError: { message: 'link failed' }, claim: { claimed: true, reason: null } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'lead_persistence_failed' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('a blocked claim (e.g. cooldown) never reaches Resend', async () => {
    const { client } = fakeClient({ claim: { claimed: false, reason: 'cooldown' } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'blocked', reason: 'cooldown' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('distinct_recipient_limit is surfaced as a blocked reason', async () => {
    const { client } = fakeClient({ claim: { claimed: false, reason: 'distinct_recipient_limit' } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'blocked', reason: 'distinct_recipient_limit' })
  })

  test('already_sent is treated as success (idempotent no-op), not an error', async () => {
    const { client } = fakeClient({ claim: { claimed: false, reason: 'already_sent' } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result.kind).toBe('already_sent')
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('a successful claim + provider acceptance -> sent, with a masked email', async () => {
    mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
    const { client } = fakeClient({ claim: { claimed: true, reason: null } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'sent', maskedEmail: 'j•••@pmfstrategy.com' })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  test('provider confirms rejection -> send_failed', async () => {
    mockSend.mockResolvedValue({ status: 'failed', error: 'invalid recipient' })
    const { client } = fakeClient({ claim: { claimed: true, reason: null } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'send_failed' })
  })

  // PM case J: provider timeout maps to unknown/ambiguous, not falsely confirmed accepted.
  test('provider timeout/unknown outcome -> send_unknown, never conflated with a confirmed failure', async () => {
    mockSend.mockResolvedValue({ status: 'unknown', error: 'timeout' })
    const { client } = fakeClient({ claim: { claimed: true, reason: null } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result).toEqual({ kind: 'send_unknown' })
  })

  // PM case H: provider accepted + DB status-update failure -> user still gets honest confirmation.
  test('provider acceptance survives a subsequent outcome-recording failure -- still reports sent', async () => {
    mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
    const { client } = fakeClient({ claim: { claimed: true, reason: null }, recordError: { message: 'db write failed after send' } })
    const result = await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(result.kind).toBe('sent')
  })

  test('an explicit resend is threaded through to the claim RPC', async () => {
    mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
    const { client, rpcCalls } = fakeClient({ claim: { claimed: true, reason: null } })
    await deliverCrcResultsEmail(client, { ...BASE_PARAMS, isExplicitResend: true })
    const claimCall = rpcCalls.find((c) => c.fn === 'claim_crc_result_send')
    expect((claimCall!.args as any).p_is_explicit_resend).toBe(true)
  })
})
