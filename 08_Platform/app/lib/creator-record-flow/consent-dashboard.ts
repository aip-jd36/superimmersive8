/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — whether the dashboard shows the AI-examination permission control, and in which state.
 *
 * Shown only to a creator who has added a Creator Record v2 document or has already withdrawn; everyone else (every V1 customer)
 * sees an unchanged dashboard. Read-only, service role, the session user only.
 *
 * CR-V2-MVP-LAUNCH-FOUNDATION-1-CORRECTIONS-1: a state that cannot be read (an error, a timeout, an unexpected response) no longer
 * removes the creator's ability to withdraw. A creator with a Creator Record v2 submission or document then sees the control in an
 * `unknown` state: it says the status cannot be shown and still offers the existing, idempotent withdrawal. This is display only;
 * it never authorizes anything (AI examination is decided by the database, which refuses it without a recorded permission and
 * after a withdrawal). Only when there is no sign of Creator Record v2 use at all does an unreadable state hide the control.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ConsentControlInitial } from './consent-withdrawal-request'

export type { ConsentControlInitial }
export type ConsentControlState = { show: false } | { show: true; initial: ConsentControlInitial }

/** How long the dashboard waits for each read before treating it as unreadable. */
export const CONSENT_READ_TIMEOUT_MS = 4_000

type Db = Pick<typeof supabaseAdmin, 'rpc' | 'from'>

const TIMEOUT = Symbol('timeout')

async function bounded<T>(work: PromiseLike<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([Promise.resolve(work), new Promise<typeof TIMEOUT>((resolve) => { timer = setTimeout(() => resolve(TIMEOUT), ms) })])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/** The session user's own withdrawal state: known (withdrawn or not), or unreadable. */
async function readState(db: Db, userId: string, ms: number): Promise<{ withdrawn: false } | { withdrawn: true; at: string } | null> {
  try {
    const r = await bounded(db.rpc('creator_record_v2_consent_state', { p_user_id: userId }), ms)
    if (r === TIMEOUT || r.error) return null
    const row = (Array.isArray(r.data) ? r.data[0] : r.data) as { withdrawn?: unknown; withdrawn_at?: unknown } | null | undefined
    if (!row || typeof row !== 'object' || typeof row.withdrawn !== 'boolean') return null
    if (!row.withdrawn) return { withdrawn: false }
    // Withdrawn without a usable time is an unexpected response, not "not withdrawn".
    return typeof row.withdrawn_at === 'string' && !Number.isNaN(Date.parse(row.withdrawn_at)) ? { withdrawn: true, at: row.withdrawn_at } : null
  } catch {
    return null
  }
}

/** Whether the user has uploaded a Creator Record v2 document: yes, no, or unreadable. */
async function hasOwnDocuments(db: Db, userId: string, ms: number): Promise<boolean | null> {
  try {
    const r = await bounded(
      db.from('creator_record_v2_documents').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('origin', 'owner_upload'),
      ms,
    )
    if (r === TIMEOUT || r.error || typeof r.count !== 'number') return null
    return r.count > 0
  } catch {
    return null
  }
}

export async function consentControlState(
  userId: string,
  options: { hasV2Submission: boolean; db?: Db; timeoutMs?: number },
): Promise<ConsentControlState> {
  const db = options.db ?? supabaseAdmin
  const ms = options.timeoutMs ?? CONSENT_READ_TIMEOUT_MS
  const unknown: ConsentControlState = { show: true, initial: { state: 'unknown' } }
  const state = await readState(db, userId, ms)
  if (state && state.withdrawn) return { show: true, initial: { state: 'withdrawn', withdrawnAt: state.at } }
  const docs = await hasOwnDocuments(db, userId, ms)
  if (state) {
    // Known: not withdrawn. Offer withdrawal to anyone who has documents it would cover (or might: documents unreadable).
    if (docs === true || (docs === null && options.hasV2Submission)) return { show: true, initial: { state: 'active' } }
    return { show: false }
  }
  // Unreadable state: keep the withdrawal available to any sign of Creator Record v2 use.
  return options.hasV2Submission || docs === true ? unknown : { show: false }
}
