/**
 * CRC -> Sales authorization (CAH-3B, §11-§12).
 *
 * v1 reuses the existing internal `users.is_admin` gate -- the SAME
 * mechanism every /api/admin/* route already uses. This is a TEMPORARY
 * implementation mechanism, not the final Sales security architecture.
 *
 * The future capability is `crc_lead_access`: a distinct grant so a
 * reviewer who is not Sales can be denied CRC lead context. It is
 * deliberately NOT built here (team of one; CAH-3A §H). When it lands,
 * ONLY this function changes -- every route calls `requireCrcLeadAccess`,
 * nothing else.
 *
 * Fail closed: any uncertainty (no user, lookup error, ambiguous) -> deny.
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type CrcLeadAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 }

export async function requireCrcLeadAccess(): Promise<CrcLeadAccessResult> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401 }

  const { data, error } = await supabaseAdmin.from('users').select('is_admin').eq('id', user.id).single()
  if (error) return { ok: false, status: 403 }
  // FUTURE: replace `is_admin` with a dedicated `crc_lead_access` grant.
  if (!data?.is_admin) return { ok: false, status: 403 }

  return { ok: true, userId: user.id }
}
