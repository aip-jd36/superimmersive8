/**
 * CR-DOC-READER-EXT-10B — the production binding of `licenceReadingEnabledFor` (`@/lib/creator-record/customer-flow/approved-inputs`).
 *
 * Licence reading for a controlled UAT is limited to admins: `public.users.is_admin`, read fresh on every call with the service role
 * (signed-in and anonymous API roles have no SELECT or UPDATE on `public.users`). This is not an entitlement framework: there is no
 * table, no grant and nothing a client can send. Every caller passes a server-derived user id: the authenticated session user at
 * examination, the server-bound record owner at checkout and issuance. Any lookup error is false (fail closed), and while licence
 * reading is not enabled for this build nothing is looked up.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import { licenceReadingEnabledFor } from '@/lib/creator-record/customer-flow/approved-inputs'

/** Exactly `true` only when the row exists and `is_admin` is true. Throws on a lookup error (the caller fails closed). */
export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('users').select('is_admin').eq('id', userId).maybeSingle()
  if (error) throw new Error(`creator_record_v2_store:admin_lookup:${error.code ?? 'unknown'}`)
  return (data as { is_admin?: unknown } | null)?.is_admin === true
}

/** Licence reading for this creator: switch on, selected PDF set can print it, and an admin. */
export function productionLicenceReadingEnabledFor(userId: unknown): Promise<boolean> {
  return licenceReadingEnabledFor(userId, isAdminUser)
}
