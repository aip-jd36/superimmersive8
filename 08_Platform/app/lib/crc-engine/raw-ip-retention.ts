/**
 * SI8-PRIVACY-CRC-1B — run the 30-day raw-IP retention for `crc_pilot_events.raw_ip` (PROPOSED; inactive until the migration
 * 20261118000000 is applied, the sweep secret is configured and the GitHub workflow is enabled).
 *
 * The database decides everything (`clear_expired_crc_pilot_raw_ip`, 30 days, bounded, idempotent). This module only calls it
 * and turns the result into counts and fixed codes. It never receives an IP address, and on failure it logs only the database
 * error code, never the message or details, so no stored value can reach the logs.
 */

/** The smallest surface needed: one RPC call. `supabaseAdmin` satisfies it. */
export interface RawIpRetentionClient {
  rpc(fn: 'clear_expired_crc_pilot_raw_ip', args: { p_limit: number }): PromiseLike<{ data: unknown; error: { code?: string } | null }>
}

export const RAW_IP_RETENTION_BATCH_LIMIT = 1000

export type RawIpRetentionReport =
  | { ok: true; cleared: number; remaining_expired: number }
  | { ok: false; code: 'rpc_failed' | 'unexpected_response'; db_error_code?: string }

export async function runCrcRawIpRetention(client: RawIpRetentionClient, limit: number = RAW_IP_RETENTION_BATCH_LIMIT): Promise<RawIpRetentionReport> {
  let result: { data: unknown; error: { code?: string } | null }
  try {
    result = await client.rpc('clear_expired_crc_pilot_raw_ip', { p_limit: limit })
  } catch {
    console.error('[crc-raw-ip-retention] rpc threw')
    return { ok: false, code: 'rpc_failed' }
  }
  if (result.error) {
    const dbCode = typeof result.error.code === 'string' ? result.error.code : undefined
    console.error('[crc-raw-ip-retention] rpc failed', { db_error_code: dbCode ?? null })
    return { ok: false, code: 'rpc_failed', ...(dbCode ? { db_error_code: dbCode } : {}) }
  }
  const row = Array.isArray(result.data) ? result.data[0] : undefined
  const cleared = row && typeof row === 'object' ? (row as Record<string, unknown>).cleared : undefined
  const remaining = row && typeof row === 'object' ? (row as Record<string, unknown>).remaining_expired : undefined
  if (!Number.isInteger(cleared) || !Number.isInteger(remaining) || (cleared as number) < 0 || (remaining as number) < 0) {
    console.error('[crc-raw-ip-retention] unexpected response shape')
    return { ok: false, code: 'unexpected_response' }
  }
  return { ok: true, cleared: cleared as number, remaining_expired: remaining as number }
}
