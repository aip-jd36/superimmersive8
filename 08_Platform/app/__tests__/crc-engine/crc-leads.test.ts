/**
 * crc_leads repository tests (CRC Results Gate milestone, 2026-08-14).
 * Covers PM test cases L (same normalized email idempotent) and mixed-case
 * dedup, via a fake client -- the actual atomic ON CONFLICT guarantee lives
 * in the upsert_crc_lead Postgres function itself and is not something a
 * fake JS client can verify; see the final report for how that's reviewed
 * instead.
 */

import { normalizeEmail, upsertCrcLead, linkSessionToLead } from '../../lib/crc-engine/crc-leads'

describe('normalizeEmail', () => {
  test('trims and lowercases', () => {
    expect(normalizeEmail('  JD@Example.COM  ')).toBe('jd@example.com')
  })

  test('does not strip Gmail dots or +aliases -- approved rule is trim+lowercase only', () => {
    expect(normalizeEmail('j.d+crc@gmail.com')).toBe('j.d+crc@gmail.com')
  })
})

function fakeRpcClient(rpcResults: Record<string, { data: unknown; error: unknown }>) {
  const calls: { fn: string; args: unknown }[] = []
  const client = {
    rpc: jest.fn((fn: string, args: unknown) => {
      calls.push({ fn, args })
      return Promise.resolve(rpcResults[fn] ?? { data: null, error: { message: `no fake result configured for ${fn}` } })
    }),
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(async () => ({ error: null })),
      })),
    })),
  }
  return { client: client as any, calls }
}

describe('upsertCrcLead', () => {
  test('normalizes before calling the RPC and returns the lead id', async () => {
    const { client, calls } = fakeRpcClient({ upsert_crc_lead: { data: 'lead-123', error: null } })
    const result = await upsertCrcLead(client, '  JD@Example.com ')
    expect(result).toEqual({ leadId: 'lead-123', emailNormalized: 'jd@example.com' })
    expect(calls[0].fn).toBe('upsert_crc_lead')
    expect((calls[0].args as any).p_email_normalized).toBe('jd@example.com')
    expect((calls[0].args as any).p_email).toBe('  JD@Example.com ')
  })

  // PM case L / mixed-case dedup: both calls normalize to the same key --
  // real dedup itself is the DB's UNIQUE constraint + ON CONFLICT, verified
  // by code review of the migration (see final report), not here.
  test('a mixed-case resubmission of the same address normalizes identically', async () => {
    const { client, calls } = fakeRpcClient({ upsert_crc_lead: { data: 'lead-123', error: null } })
    await upsertCrcLead(client, 'jd@Example.com')
    await upsertCrcLead(client, 'JD@EXAMPLE.COM')
    expect((calls[0].args as any).p_email_normalized).toBe((calls[1].args as any).p_email_normalized)
  })

  test('throws on RPC error rather than returning a fake success -- blocks the caller from proceeding to send', async () => {
    const { client } = fakeRpcClient({ upsert_crc_lead: { data: null, error: { message: 'connection failed' } } })
    await expect(upsertCrcLead(client, 'jd@example.com')).rejects.toThrow('connection failed')
  })
})

describe('linkSessionToLead', () => {
  test('resolves without throwing on success', async () => {
    const { client } = fakeRpcClient({})
    await expect(linkSessionToLead(client, 'session-1', 'lead-123')).resolves.toBeUndefined()
  })

  test('throws on update error', async () => {
    const client = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(async () => ({ error: { message: 'update failed' } })),
        })),
      })),
    }
    await expect(linkSessionToLead(client as any, 'session-1', 'lead-123')).rejects.toThrow('update failed')
  })
})
