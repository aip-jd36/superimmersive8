/**
 * CR-V2-MVP-7 — the verified session context of the current admin request,
 * for binding a server-issued evidence attestation.
 *
 * Uses Supabase's own `auth.getClaims()`, which verifies the access token
 * (against the project's JWKS, or the Auth server for symmetric keys) before
 * returning its claims. The session id is the token's `session_id` claim; it
 * changes on a new sign-in and stops being valid on sign-out. Never derived
 * from `getSession()` (unverified cookie data).
 *
 * Fail closed: an unverifiable token, a subject that is not the user the
 * admin gate authorized, or a missing session id → null.
 */

import { createClient } from '@/lib/supabase/server'

export interface VerifiedSessionContext {
  user_id: string
  session_id: string
}

export async function getVerifiedSessionContext(authorizedUserId: string): Promise<VerifiedSessionContext | null> {
  try {
    const { data, error } = await createClient().auth.getClaims()
    if (error || !data?.claims) return null
    const { sub, session_id } = data.claims as { sub?: unknown; session_id?: unknown }
    if (typeof sub !== 'string' || sub !== authorizedUserId) return null
    if (typeof session_id !== 'string' || session_id.length === 0 || session_id.length > 128) return null
    return { user_id: sub, session_id }
  } catch {
    return null
  }
}
