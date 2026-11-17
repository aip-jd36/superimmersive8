/**
 * CR-V2-MVP-M2 — the Creator Record v2 pilot invite list (service role; read only by the application).
 * Shared by the prepared-record and evidence-intake production ports (CR-V2-DOC-1).
 *
 * CR-PUBLIC-1: production ports bind `hasCreatorRecordAccess`, which applies the access policy (`./access-policy`): the
 * invitation list in 'invitation' mode (the default), any signed-in user in 'public' mode. `hasPilotAccess` reads the list only.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createCreatorRecordAccessCheck, creatorRecordAccessMode } from './access-policy'

export const PILOT_ACCESS_TABLE = 'creator_record_v2_pilot_access'

export async function hasPilotAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from(PILOT_ACCESS_TABLE).select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(`creator_record_v2_store:pilot_access:${error.code ?? 'unknown'}`)
  return !!data
}

/** The one access check every production Creator Record v2 port binds. The mode is read at each call. */
export async function hasCreatorRecordAccess(userId: string): Promise<boolean> {
  return createCreatorRecordAccessCheck(creatorRecordAccessMode(), hasPilotAccess)(userId)
}
