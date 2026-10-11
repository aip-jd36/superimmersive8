/**
 * Unit tests for results-email-artifacts.ts (CRC-OUTBOUND-ARTIFACT-1B,
 * 2026-10-11). Covers the module's own pure/unit-level contract -- content
 * hashing, artifact/delivery-attempt row construction, and fail-open vs
 * fail-closed behavior -- separately from results-email-delivery.test.ts's
 * orchestration-level coverage of how this module is actually wired in.
 */

import {
  computeResultsEmailContentHash,
  createResultsEmailArtifact,
  findMostRecentResultsEmailArtifactId,
  recordResultsEmailDeliveryAttempt,
  type ResultsEmailContent,
} from '../../lib/crc-engine/results-email-artifacts'

const CONTENT: ResultsEmailContent = {
  subject: 'Your Commercial Readiness Check results',
  html: '<p>hello</p>',
  text: 'hello',
}

describe('computeResultsEmailContentHash', () => {
  // Case H.
  test('is deterministic for the same content', () => {
    expect(computeResultsEmailContentHash(CONTENT)).toBe(computeResultsEmailContentHash({ ...CONTENT }))
  })

  test('changes when the HTML changes', () => {
    const other = { ...CONTENT, html: '<p>goodbye</p>' }
    expect(computeResultsEmailContentHash(CONTENT)).not.toBe(computeResultsEmailContentHash(other))
  })

  test('changes when the subject changes', () => {
    const other = { ...CONTENT, subject: 'A different subject' }
    expect(computeResultsEmailContentHash(CONTENT)).not.toBe(computeResultsEmailContentHash(other))
  })

  test('changes when the plain text changes', () => {
    const other = { ...CONTENT, text: 'goodbye' }
    expect(computeResultsEmailContentHash(CONTENT)).not.toBe(computeResultsEmailContentHash(other))
  })

  test('is a 64-character lowercase hex SHA-256 digest', () => {
    expect(computeResultsEmailContentHash(CONTENT)).toMatch(/^[0-9a-f]{64}$/)
  })
})

function fakeClient(opts: { insertError?: unknown; selectData?: { id: string }[] | null; selectError?: unknown }) {
  const insertCalls: unknown[] = []
  const client = {
    from: jest.fn(() => ({
      insert: jest.fn((row: unknown) => {
        insertCalls.push(row)
        return Promise.resolve({ error: opts.insertError ?? null })
      }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(async () => ({ data: opts.selectData ?? null, error: opts.selectError ?? null })),
          })),
        })),
      })),
    })),
  }
  return { client: client as any, insertCalls }
}

describe('createResultsEmailArtifact', () => {
  test('inserts exactly the given content and resolves with a generated id -- Case A', async () => {
    const { client, insertCalls } = fakeClient({})
    const artifact = await createResultsEmailArtifact(client, {
      crcSessionId: 'session-1',
      crcLeadId: 'lead-1',
      recipientNormalized: 'jd@pmfstrategy.com',
      content: CONTENT,
      templateVersion: 'results-email-v1',
      attributionToken: 'attr-1',
      previousArtifactId: null,
    })

    expect(typeof artifact.id).toBe('string')
    expect(artifact.id.length).toBeGreaterThan(0)
    expect(artifact.contentHash).toBe(computeResultsEmailContentHash(CONTENT))

    const row = insertCalls[0] as any
    expect(row.subject).toBe(CONTENT.subject)
    expect(row.html).toBe(CONTENT.html)
    expect(row.text).toBe(CONTENT.text)
    expect(row.content_hash).toBe(artifact.contentHash)
    expect(row.crc_session_id).toBe('session-1')
    expect(row.crc_lead_id).toBe('lead-1')
    expect(row.recipient_normalized).toBe('jd@pmfstrategy.com')
    expect(row.template_version).toBe('results-email-v1')
    expect(row.previous_artifact_id).toBeNull()
    expect(typeof row.runtime_commit).toBe('string')
    expect(typeof row.generated_at).toBe('string')
    expect(row.id).toBe(artifact.id)
  })

  // Case B.
  test('throws on insert failure -- fail-closed, caller must never call the provider', async () => {
    const { client } = fakeClient({ insertError: { message: 'db down' } })
    await expect(
      createResultsEmailArtifact(client, {
        crcSessionId: 'session-1',
        crcLeadId: null,
        recipientNormalized: 'jd@pmfstrategy.com',
        content: CONTENT,
        templateVersion: 'results-email-v1',
        attributionToken: null,
        previousArtifactId: null,
      }),
    ).rejects.toThrow(/createResultsEmailArtifact failed/)
  })

  test('threads previousArtifactId through unchanged', async () => {
    const { client, insertCalls } = fakeClient({})
    await createResultsEmailArtifact(client, {
      crcSessionId: 'session-1',
      crcLeadId: null,
      recipientNormalized: 'jd@pmfstrategy.com',
      content: CONTENT,
      templateVersion: 'results-email-v1',
      attributionToken: null,
      previousArtifactId: 'artifact-0',
    })
    expect((insertCalls[0] as any).previous_artifact_id).toBe('artifact-0')
  })
})

describe('findMostRecentResultsEmailArtifactId', () => {
  test('returns the id of the most recent artifact when one exists', async () => {
    const { client } = fakeClient({ selectData: [{ id: 'artifact-99' }] })
    const id = await findMostRecentResultsEmailArtifactId(client, 'session-1')
    expect(id).toBe('artifact-99')
  })

  test('returns null when no prior artifact exists -- a genuine first send', async () => {
    const { client } = fakeClient({ selectData: [] })
    const id = await findMostRecentResultsEmailArtifactId(client, 'session-1')
    expect(id).toBeNull()
  })

  // Fail-open: a read failure here must never throw or block a send.
  test('returns null on a query error rather than throwing', async () => {
    const { client } = fakeClient({ selectError: { message: 'db down' } })
    const id = await findMostRecentResultsEmailArtifactId(client, 'session-1')
    expect(id).toBeNull()
  })
})

describe('recordResultsEmailDeliveryAttempt', () => {
  test('inserts attempt_number 1, provider "resend", and the given outcome fields -- Case E', async () => {
    const { client, insertCalls } = fakeClient({})
    const outcome = await recordResultsEmailDeliveryAttempt(client, {
      artifactId: 'artifact-1',
      outcome: 'accepted',
      providerMessageId: 'resend-123',
      errorDetail: null,
      acceptedAt: '2026-10-11T00:00:00.000Z',
    })
    expect(outcome).toEqual({ ok: true })
    const row = insertCalls[0] as any
    expect(row.artifact_id).toBe('artifact-1')
    expect(row.attempt_number).toBe(1)
    expect(row.provider).toBe('resend')
    expect(row.outcome).toBe('accepted')
    expect(row.provider_message_id).toBe('resend-123')
    expect(row.accepted_at).toBe('2026-10-11T00:00:00.000Z')
  })

  // Case J: never throws -- returns a result object so the caller can
  // decide how to surface it without changing the user-facing outcome.
  test('returns ok:false on insert failure rather than throwing', async () => {
    const { client } = fakeClient({ insertError: { message: 'db down after send' } })
    const outcome = await recordResultsEmailDeliveryAttempt(client, {
      artifactId: 'artifact-1',
      outcome: 'accepted',
      providerMessageId: 'resend-123',
      errorDetail: null,
      acceptedAt: '2026-10-11T00:00:00.000Z',
    })
    expect(outcome).toEqual({ ok: false, error: 'db down after send' })
  })

  // Case C/D: failed/unknown outcomes carry no provider message id.
  test('a failed outcome persists error_detail and no provider_message_id', async () => {
    const { client, insertCalls } = fakeClient({})
    await recordResultsEmailDeliveryAttempt(client, {
      artifactId: 'artifact-1',
      outcome: 'failed',
      providerMessageId: null,
      errorDetail: 'invalid recipient',
      acceptedAt: null,
    })
    const row = insertCalls[0] as any
    expect(row.outcome).toBe('failed')
    expect(row.provider_message_id).toBeNull()
    expect(row.error_detail).toBe('invalid recipient')
    expect(row.accepted_at).toBeNull()
  })
})
