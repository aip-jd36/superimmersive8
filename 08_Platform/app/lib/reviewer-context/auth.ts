/**
 * Reviewer-context authorization boundary (CAH-4B §6).
 *
 * Deliberately SEPARATE from the projection/service logic so authorization can
 * evolve independently later. Today it is the same gate every `/admin/*` and
 * `/api/admin/*` reviewer surface already uses — an authenticated user with
 * `users.is_admin` — mirroring `lib/crc-sales/auth.ts`'s own
 * `requireCrcLeadAccess` shape.
 *
 * FUTURE: when a dedicated reviewer grant (e.g. `commercial_assurance_reviewer`
 * / `reviewer_context_access`) lands, ONLY this file changes — no route,
 * service, or projection code references `is_admin` directly.
 *
 * This is NOT an RBAC redesign. It is a one-purpose wrapper.
 *
 * Fail closed: any uncertainty (no user, lookup error) -> deny.
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type ReviewerContextAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 }

export async function checkReviewerContextAccess(): Promise<ReviewerContextAccessResult> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401 }

  const { data, error } = await supabaseAdmin.from('users').select('is_admin').eq('id', user.id).single()
  if (error) return { ok: false, status: 403 }
  // FUTURE: replace `is_admin` with a dedicated reviewer-context grant.
  if (!data?.is_admin) return { ok: false, status: 403 }

  return { ok: true, userId: user.id }
}
