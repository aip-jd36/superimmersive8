/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — whether the dashboard shows the AI-examination permission control, and in which state.
 *
 * Shown only to a creator who has added a Creator Record v2 document or has already withdrawn; everyone else (every V1 customer)
 * sees an unchanged dashboard. Read-only, service role, the session user only. If anything cannot be read (for example before
 * 20261112000000 is applied), the control is not shown — it could not act — and nothing else on the dashboard changes.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function consentControlState(userId: string): Promise<{ show: false } | { show: true; withdrawnAt: string | null }> {
  try {
    const { data: state, error: stateError } = await supabaseAdmin.rpc('creator_record_v2_consent_state', { p_user_id: userId })
    if (stateError) return { show: false }
    const row = (Array.isArray(state) ? state[0] : state) as { withdrawn?: unknown; withdrawn_at?: unknown } | null
    if (!row || typeof row.withdrawn !== 'boolean') return { show: false }
    const withdrawnAt = row.withdrawn && typeof row.withdrawn_at === 'string' ? row.withdrawn_at : null
    if (row.withdrawn) return { show: true, withdrawnAt }
    const { count, error } = await supabaseAdmin
      .from('creator_record_v2_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('origin', 'owner_upload')
    if (error || !count) return { show: false }
    return { show: true, withdrawnAt: null }
  } catch {
    return { show: false }
  }
}
