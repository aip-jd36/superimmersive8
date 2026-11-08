/**
 * CR-V2-MVP-LAUNCH-FOUNDATION-1 — whether the dashboard shows the AI-examination permission control, and in which state.
 *
 * Shown only to a creator who has added a Creator Record v2 document or has already withdrawn; everyone else (every V1 customer)
 * sees an unchanged dashboard. Read-only, service role, the session user only.
 *
 * CR-V2-MVP-LAUNCH-FOUNDATION-1-CORRECTIONS-1: a state that cannot be read (an error, a timeout, an unexpected response) no longer
 * silently removes the control from a creator it concerns: one with Creator Record v2 documents or a withdrawal record (or a v2
 * submission when the documents cannot be read). What the control then offers depends on whether the online withdrawal can work,
 * established by reading at most one id of the creator's own rows in the withdrawal ledger (`creator_record_v2_consent_withdrawals`,
 * created in the same single-transaction migration as the withdrawal function and its grant, 20261111000000):
 *   - ledger readable           → `unknown`:     the status cannot be shown, the same idempotent withdrawal is still offered;
 *   - ledger confirmed missing  → `unavailable`: support only (no button), because the online withdrawal cannot work;
 *   - ledger not established    → `unconfirmed`: support only (no button); online withdrawal is not promised.
 * Display only: this never authorizes anything (AI examination is decided by the database).
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ConsentControlInitial } from './consent-withdrawal-request'

export type { ConsentControlInitial }
export type ConsentControlState = { show: false } | { show: true; initial: ConsentControlInitial }

/** How long the dashboard waits for each read before treating it as unreadable. */
export const CONSENT_READ_TIMEOUT_MS = 4_000

/** PostgREST / PostgreSQL codes meaning the function or table does not exist (a migration is not applied), not a transient fault. */
const MISSING_OBJECT_CODES: ReadonlySet<string> = new Set(['PGRST202', '42883', 'PGRST205', '42P01'])

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

const isMissingObject = (error: unknown): boolean =>
  !!error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string' && MISSING_OBJECT_CODES.has((error as { code: string }).code)

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

type Capability = { kind: 'present'; hasRecord: boolean } | { kind: 'absent' } | { kind: 'unknown' }

/**
 * Whether the online withdrawal exists: the ledger is readable (present — and whether this user has a withdrawal record),
 * confirmed missing (absent), or not established (unknown).
 *
 * A GET of at most one id of the user's own rows, NOT a head-only count: a HEAD response has no body, and postgrest-js turns a
 * HEAD 404 for a missing table into `{ error: null, count: null, status: 204 }`, which could never be told apart from other
 * failures. The id stays on the server; nothing from the ledger reaches the page. Service role (the ledger is service-role-only).
 */
async function withdrawalCapability(db: Db, userId: string, ms: number): Promise<Capability> {
  try {
    const r = await bounded(db.from('creator_record_v2_consent_withdrawals').select('id').eq('user_id', userId).limit(1), ms)
    if (r === TIMEOUT) return { kind: 'unknown' }
    if (r.error) return isMissingObject(r.error) ? { kind: 'absent' } : { kind: 'unknown' }
    return Array.isArray(r.data) ? { kind: 'present', hasRecord: r.data.length > 0 } : { kind: 'unknown' }
  } catch {
    return { kind: 'unknown' }
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
  const state = await readState(db, userId, ms)
  if (state && state.withdrawn) return { show: true, initial: { state: 'withdrawn', withdrawnAt: state.at } }
  const docs = await hasOwnDocuments(db, userId, ms)
  if (state) {
    // Known: not withdrawn. Offer withdrawal to anyone who has documents it would cover (or might: documents unreadable).
    if (docs === true || (docs === null && options.hasV2Submission)) return { show: true, initial: { state: 'active' } }
    return { show: false }
  }
  // Unreadable state. Relevant only to a creator with documents it would cover, or with a withdrawal record. A v2 submission alone
  // (for example an empty questionnaire) is not enough; it stands in only when the documents are genuinely unreadable (fail closed).
  if (!options.hasV2Submission && docs === false) return { show: false } // every V1 customer: unchanged, no further read
  const relevant = docs === true || (docs === null && options.hasV2Submission)
  const capability = await withdrawalCapability(db, userId, ms)
  if (!relevant && !(capability.kind === 'present' && capability.hasRecord)) return { show: false }
  if (capability.kind === 'present') return { show: true, initial: { state: 'unknown' } }
  return { show: true, initial: { state: capability.kind === 'absent' ? 'unavailable' : 'unconfirmed' } }
}
