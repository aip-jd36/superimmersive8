/**
 * Results-email delivery orchestration tests (CRC Results Gate milestone,
 * 2026-08-14; extended by CRC-OUTBOUND-ARTIFACT-1B, 2026-10-11). Covers PM
 * test cases F, G, H, T, U, V and the general outcome-branching contract,
 * plus the 1B artifact/delivery-attempt provenance cases.
 * `sendCrcResultsEmail`, `runCRCConversation`, and (as of 1B)
 * `results-email-artifacts.ts` are all mocked -- this test is about the
 * ORCHESTRATION's sequencing and failure-handling, not about email
 * rendering (results-email-template tests that), artifact persistence
 * internals (results-email-artifacts.test.ts tests that), or
 * Retrieval/Projection (tested elsewhere). Mocking sendCrcResultsEmail also
 * directly proves PM cases T/U/V: nothing in this module imports or
 * constructs an Anthropic adapter at all, so there is no code path here
 * that could make a model call regardless of outcome.
 */

import { deliverCrcResultsEmail } from '../../lib/crc-engine/results-email-delivery'

jest.mock('@/lib/emails', () => ({
  sendCrcResultsEmail: jest.fn(),
}))
jest.mock('../../lib/crc-engine/run-crc-conversation', () => ({
  runCRCConversation: jest.fn(() => ({ output: { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' } })),
}))
jest.mock('../../lib/crc-engine/results-email-artifacts', () => ({
  createResultsEmailArtifact: jest.fn(async () => ({ id: 'artifact-1', contentHash: 'hash-1', generatedAt: '2026-10-11T00:00:00.000Z' })),
  findMostRecentResultsEmailArtifactId: jest.fn(async () => null),
  recordResultsEmailDeliveryAttempt: jest.fn(async () => ({ ok: true })),
}))

import { sendCrcResultsEmail } from '@/lib/emails'
import { runCRCConversation } from '../../lib/crc-engine/run-crc-conversation'
import { createResultsEmailArtifact, findMostRecentResultsEmailArtifactId, recordResultsEmailDeliveryAttempt } from '../../lib/crc-engine/results-email-artifacts'

const mockSend = sendCrcResultsEmail as jest.Mock
const mockRunCRCConversation = runCRCConversation as jest.Mock
const mockCreateArtifact = createResultsEmailArtifact as jest.Mock
const mockFindPreviousArtifact = findMostRecentResultsEmailArtifactId as jest.Mock
const mockRecordAttempt = recordResultsEmailDeliveryAttempt as jest.Mock

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
  mockRunCRCConversation.mockClear()
  mockCreateArtifact.mockReset()
  mockCreateArtifact.mockImplementation(async () => ({ id: 'artifact-1', contentHash: 'hash-1', generatedAt: '2026-10-11T00:00:00.000Z' }))
  mockFindPreviousArtifact.mockReset()
  mockFindPreviousArtifact.mockImplementation(async () => null)
  mockRecordAttempt.mockReset()
  mockRecordAttempt.mockImplementation(async () => ({ ok: true }))
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
    // CRC-OUTBOUND-ARTIFACT-1B / Case I: the existing claim lock is what
    // prevents a losing concurrent request from ever reaching artifact
    // creation at all -- a blocked claim never generates an artifact.
    expect(mockCreateArtifact).not.toHaveBeenCalled()
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

  // Governed Topic Relationships orchestrator-wiring follow-up, 2026-08-16:
  // proves the email recompute path is relationship-aware, mirroring
  // exactly how topicClaims has always been threaded (module header's own
  // "the email recomputes the result via the same runCRCConversation()
  // call" reasoning, extended to relationships).
  test('params.relationships is threaded through to runCRCConversation, mirroring topicClaims', async () => {
    mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
    const { client } = fakeClient({ claim: { claimed: true, reason: null } })
    const relationships = [{ relationship_id: 'REL-TEST' } as any]
    const topicClaims = [{ claim_id: 'TEST-CLAIM' } as any]
    await deliverCrcResultsEmail(client, { ...BASE_PARAMS, topicClaims, relationships })
    expect(mockRunCRCConversation).toHaveBeenCalledWith(BASE_PARAMS.structuredUnderstanding, BASE_PARAMS.matrix, topicClaims, relationships)
  })

  test('omitting params.relationships defaults to [] -- backward compatible, matches topicClaims\' own default behavior', async () => {
    mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
    const { client } = fakeClient({ claim: { claimed: true, reason: null } })
    await deliverCrcResultsEmail(client, BASE_PARAMS)
    expect(mockRunCRCConversation).toHaveBeenCalledWith(BASE_PARAMS.structuredUnderstanding, BASE_PARAMS.matrix, [], [])
  })

  // ── CRC-OUTBOUND-ARTIFACT-1B ────────────────────────────────────────────

  describe('CRC-OUTBOUND-ARTIFACT-1B: artifact + delivery-attempt provenance', () => {
    // Case A: successful first send.
    test('a successful send creates exactly one artifact and one delivery attempt, with the exact persisted content', async () => {
      mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
      const { client } = fakeClient({ claim: { claimed: true, reason: null } })
      const result = await deliverCrcResultsEmail(client, BASE_PARAMS)

      expect(result.kind).toBe('sent')
      expect(mockCreateArtifact).toHaveBeenCalledTimes(1)
      expect(mockRecordAttempt).toHaveBeenCalledTimes(1)

      const artifactCall = mockCreateArtifact.mock.calls[0][1]
      expect(artifactCall.crcSessionId).toBe(BASE_PARAMS.sessionId)
      expect(artifactCall.recipientNormalized).toBe('jd@pmfstrategy.com')
      expect(artifactCall.content.subject).toBe('Your Commercial Readiness Check results')
      expect(typeof artifactCall.content.html).toBe('string')
      expect(typeof artifactCall.content.text).toBe('string')
      expect(artifactCall.previousArtifactId).toBeNull()

      // Case G / Section 8: proof that sendCrcResultsEmail received the
      // SAME values just persisted -- no second render.
      expect(mockSend).toHaveBeenCalledWith('jd@pmfstrategy.com', artifactCall.content.subject, artifactCall.content.html, artifactCall.content.text)

      // Case E: artifact persistence happens strictly before the provider call.
      expect(mockCreateArtifact.mock.invocationCallOrder[0]).toBeLessThan(mockSend.mock.invocationCallOrder[0])
      // Delivery attempt is recorded strictly after the provider call, linked to the new artifact.
      expect(mockSend.mock.invocationCallOrder[0]).toBeLessThan(mockRecordAttempt.mock.invocationCallOrder[0])
      expect(mockRecordAttempt.mock.calls[0][1]).toMatchObject({ artifactId: 'artifact-1', outcome: 'accepted', providerMessageId: 'resend-123' })
    })

    // Case B: artifact persistence failure.
    test('artifact persistence failure blocks Resend entirely and restores the claim to a retryable state, not a new stranded pending', async () => {
      mockCreateArtifact.mockImplementation(async () => {
        throw new Error('db down')
      })
      const { client, rpcCalls } = fakeClient({ claim: { claimed: true, reason: null } })
      const result = await deliverCrcResultsEmail(client, BASE_PARAMS)

      expect(result).toEqual({ kind: 'artifact_persistence_failed' })
      expect(mockSend).not.toHaveBeenCalled()
      expect(mockRecordAttempt).not.toHaveBeenCalled()

      // The existing record_crc_result_send_outcome RPC is reused to restore
      // the claim to 'unknown' (free-to-retry), never a new state machine.
      const restoreCall = rpcCalls.find((c) => c.fn === 'record_crc_result_send_outcome')
      expect(restoreCall).toBeDefined()
      expect((restoreCall!.args as any).p_status).toBe('unknown')
    })

    // Case C: provider definitive failure.
    test('provider failure records a failed delivery attempt against the already-persisted artifact', async () => {
      mockSend.mockResolvedValue({ status: 'failed', error: 'invalid recipient' })
      const { client } = fakeClient({ claim: { claimed: true, reason: null } })
      const result = await deliverCrcResultsEmail(client, BASE_PARAMS)

      expect(result).toEqual({ kind: 'send_failed' })
      expect(mockCreateArtifact).toHaveBeenCalledTimes(1)
      expect(mockRecordAttempt).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ artifactId: 'artifact-1', outcome: 'failed', providerMessageId: null, errorDetail: 'invalid recipient' }),
      )
    })

    // Case D: provider unknown/exception.
    test('provider unknown outcome records an unknown delivery attempt, artifact remains persisted', async () => {
      mockSend.mockResolvedValue({ status: 'unknown', error: 'timeout' })
      const { client } = fakeClient({ claim: { claimed: true, reason: null } })
      const result = await deliverCrcResultsEmail(client, BASE_PARAMS)

      expect(result).toEqual({ kind: 'send_unknown' })
      expect(mockCreateArtifact).toHaveBeenCalledTimes(1)
      expect(mockRecordAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: 'unknown', providerMessageId: null, errorDetail: 'timeout' }))
    })

    // Case E: accepted outcome persists the provider message ID, never implies "delivered".
    test('accepted outcome persists the Resend provider message ID on the delivery attempt', async () => {
      mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-abc' })
      const { client } = fakeClient({ claim: { claimed: true, reason: null } })
      await deliverCrcResultsEmail(client, BASE_PARAMS)

      expect(mockRecordAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: 'accepted', providerMessageId: 'resend-abc' }))
    })

    // Case F: explicit resend.
    test('explicit resend creates a NEW artifact linked via previousArtifactId, never mutating the prior one', async () => {
      mockFindPreviousArtifact.mockImplementation(async () => 'artifact-0')
      mockCreateArtifact.mockImplementation(async () => ({ id: 'artifact-2', contentHash: 'hash-2', generatedAt: '2026-10-11T01:00:00.000Z' }))
      mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-xyz' })
      const { client, rpcCalls } = fakeClient({ claim: { claimed: true, reason: null } })

      const result = await deliverCrcResultsEmail(client, { ...BASE_PARAMS, isExplicitResend: true })

      expect(result.kind).toBe('sent')
      const artifactCall = mockCreateArtifact.mock.calls[0][1]
      expect(artifactCall.previousArtifactId).toBe('artifact-0')
      expect(mockRecordAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ artifactId: 'artifact-2' }))
      const claimCall = rpcCalls.find((c) => c.fn === 'claim_crc_result_send')
      expect((claimCall!.args as any).p_is_explicit_resend).toBe(true)
    })

    // Case J: delivery-attempt persistence failure after provider acceptance.
    test('delivery-attempt persistence failure after acceptance still reports sent, per the existing never-change-the-user-facing-result policy', async () => {
      mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-123' })
      mockRecordAttempt.mockImplementation(async () => ({ ok: false, error: 'db write failed after send' }))
      const { client } = fakeClient({ claim: { claimed: true, reason: null } })
      const result = await deliverCrcResultsEmail(client, BASE_PARAMS)

      expect(result.kind).toBe('sent')
    })

    // Case K: retry decision actually implemented -- regenerate-on-retry,
    // documented explicitly per the governing prompt's Section 15/Y
    // escape hatch. An ordinary retry (same recipient, status
    // failed/unknown, isExplicitResend=false) still creates its own fresh
    // artifact, linked to the one it replaces via previousArtifactId --
    // never a reused artifact_id with a second attempt.
    test('ordinary retry (isExplicitResend=false, same recipient) creates its own new artifact rather than reusing a prior one', async () => {
      mockFindPreviousArtifact.mockImplementation(async () => 'artifact-0')
      mockCreateArtifact.mockImplementation(async () => ({ id: 'artifact-retry-1', contentHash: 'hash-retry-1', generatedAt: '2026-10-11T02:00:00.000Z' }))
      mockSend.mockResolvedValue({ status: 'accepted', providerId: 'resend-retry' })
      const { client } = fakeClient({ claim: { claimed: true, reason: null } })

      await deliverCrcResultsEmail(client, { ...BASE_PARAMS, isExplicitResend: false })

      expect(mockCreateArtifact).toHaveBeenCalledTimes(1)
      const artifactCall = mockCreateArtifact.mock.calls[0][1]
      expect(artifactCall.previousArtifactId).toBe('artifact-0')
      expect(mockRecordAttempt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ artifactId: 'artifact-retry-1' }))
    })
  })
})
