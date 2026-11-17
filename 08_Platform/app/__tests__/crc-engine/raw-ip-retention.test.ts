/**
 * SI8-PRIVACY-CRC-1B — the raw-IP retention runner and its internal route (no database; the SQL function is tested on real
 * PostgreSQL in __tests__/db/crc-raw-ip-retention.db.test.ts). Synthetic values only.
 */
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { rpc: jest.fn() } }))

import { NextRequest } from 'next/server'
import { runCrcRawIpRetention, RAW_IP_RETENTION_BATCH_LIMIT } from '@/lib/crc-engine/raw-ip-retention'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { POST } from '@/app/api/internal/crc/raw-ip-retention/route'

const SECRET = 'x'.repeat(40)
const SYNTHETIC_IP = '203.0.113.77' // TEST-NET-3 (RFC 5737), never a real visitor
const mockRpc = supabaseAdmin.rpc as unknown as jest.Mock

function client(result: { data: unknown; error: unknown } | Error) {
  return {
    rpc: jest.fn(async () => {
      if (result instanceof Error) throw result
      return result as never
    }),
  }
}

let errorSpy: jest.SpyInstance
beforeEach(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  mockRpc.mockReset()
})
afterEach(() => errorSpy.mockRestore())
const logged = () => JSON.stringify(errorSpy.mock.calls)

describe('runCrcRawIpRetention', () => {
  test('calls the one database function with the bounded limit and returns counts', async () => {
    const c = client({ data: [{ cleared: 3, remaining_expired: 0 }], error: null })
    await expect(runCrcRawIpRetention(c)).resolves.toEqual({ ok: true, cleared: 3, remaining_expired: 0 })
    expect(c.rpc).toHaveBeenCalledWith('clear_expired_crc_pilot_raw_ip', { p_limit: RAW_IP_RETENTION_BATCH_LIMIT })
    expect(RAW_IP_RETENTION_BATCH_LIMIT).toBe(1000)
  })

  test('a database error is reported with its code only; message and details never reach the logs', async () => {
    const c = client({ data: null, error: { code: '42501', message: `boom ${SYNTHETIC_IP}`, details: SYNTHETIC_IP } })
    await expect(runCrcRawIpRetention(c)).resolves.toEqual({ ok: false, code: 'rpc_failed', db_error_code: '42501' })
    expect(errorSpy).toHaveBeenCalled()
    expect(logged()).not.toContain(SYNTHETIC_IP)
  })

  test('a thrown error is reported without its content', async () => {
    const c = client(new Error(`network ${SYNTHETIC_IP}`))
    await expect(runCrcRawIpRetention(c)).resolves.toEqual({ ok: false, code: 'rpc_failed' })
    expect(errorSpy).toHaveBeenCalled()
    expect(logged()).not.toContain(SYNTHETIC_IP)
  })

  test.each([
    [null],
    [[]],
    [[{ cleared: '1', remaining_expired: 0 }]],
    [[{ cleared: -1, remaining_expired: 0 }]],
    [[{ cleared: 1 }]],
  ])('an unexpected response shape fails closed (%j)', async (data) => {
    await expect(runCrcRawIpRetention(client({ data, error: null }))).resolves.toEqual({ ok: false, code: 'unexpected_response' })
  })
})

describe('POST /api/internal/crc/raw-ip-retention', () => {
  const req = (auth?: string) =>
    new NextRequest('http://localhost/api/internal/crc/raw-ip-retention', { method: 'POST', headers: auth ? { authorization: auth } : {} })
  const OLD = process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET
  afterEach(() => {
    if (OLD === undefined) delete process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET
    else process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET = OLD
  })

  test('503 and no database call when the secret is not configured', async () => {
    delete process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET
    const res = await POST(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(503)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('503 when the configured secret is too short', async () => {
    process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET = 'short'
    expect((await POST(req('Bearer short'))).status).toBe(503)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('401 and no database call on a wrong or missing bearer', async () => {
    process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET = SECRET
    expect((await POST(req('Bearer wrong'))).status).toBe(401)
    expect((await POST(req())).status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  test('200 with counts only on success', async () => {
    process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET = SECRET
    mockRpc.mockResolvedValue({ data: [{ cleared: 2, remaining_expired: 0 }], error: null })
    const res = await POST(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, cleared: 2, remaining_expired: 0 })
  })

  test('500 with a fixed code on a database failure, so the scheduled job fails visibly', async () => {
    process.env.CRC_RAW_IP_RETENTION_SWEEP_SECRET = SECRET
    mockRpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: SYNTHETIC_IP } })
    const res = await POST(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ ok: false, code: 'rpc_failed', db_error_code: 'XX000' })
    expect(JSON.stringify(body)).not.toContain(SYNTHETIC_IP)
    expect(logged()).not.toContain(SYNTHETIC_IP)
  })
})
