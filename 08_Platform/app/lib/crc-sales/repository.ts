/**
 * CRC -> Sales data access (CAH-3B).
 *
 * The ONLY module in lib/crc-sales/ that talks to the database. Reads
 * authoritative CRC state from `crc_sessions` / `crc_leads`; reads/writes
 * ONLY operational Sales state in `crc_sales_state`; writes the
 * fail-closed transcript-access audit row in `crc_sales_events`.
 *
 * It never writes to `crc_sessions` / `crc_leads` and never touches any
 * Commercial Assurance table.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { CompletionReason } from '@/types/interview-engine'
import { isSalesEligible } from './eligibility'
import { buildSalesSessionProject } from './projection'
import {
  validateTransition,
  timestampColumnFor,
  type SalesStatus,
  type SalesCloseReason,
} from './workflow'
import type {
  SalesContactListItem,
  SalesSessionContext,
  SalesSessionWorkflowState,
  SalesTranscriptEntry,
} from './types'

// Columns needed to evaluate eligibility + build the default projection.
const SESSION_COLUMNS =
  'id, created_at, updated_at, email, email_captured_at, identity_source, crc_lead_id, ' +
  'structured_understanding, transcript, results_email_status, results_email_last_recipient, ' +
  'results_email_accepted_at, traffic_type, runtime_commit, turn_count'

interface RawSessionRow {
  id: string
  created_at: string
  updated_at: string
  email: string | null
  email_captured_at: string | null
  identity_source: string | null
  crc_lead_id: string | null
  structured_understanding: unknown
  transcript: unknown
  results_email_status: string | null
  results_email_last_recipient: string | null
  results_email_accepted_at: string | null
  traffic_type: string
  runtime_commit: string | null
  turn_count: number | null
}

interface SalesStateRow {
  crc_session_id: string
  status: SalesStatus
  close_reason: SalesCloseReason | null
  contacted_at: string | null
  converting_at: string | null
  closed_at: string | null
  updated_at: string | null
}

// ── helpers ───────────────────────────────────────────────────────────────

function completionReasonOf(raw: unknown): CompletionReason {
  try {
    const su = deserializeStructuredUnderstanding(JSON.stringify(raw)) as StructuredUnderstanding
    return su.completion_reason ?? null
  } catch {
    return null
  }
}

function safeDeserialize(raw: unknown): StructuredUnderstanding | null {
  try {
    return deserializeStructuredUnderstanding(JSON.stringify(raw)) as StructuredUnderstanding
  } catch {
    return null
  }
}

function completionProxy(row: RawSessionRow): { at: string; source: 'email_captured_at' | 'updated_at' } {
  if (row.email_captured_at) return { at: row.email_captured_at, source: 'email_captured_at' }
  return { at: row.updated_at, source: 'updated_at' }
}

function eligibleRowsFrom(rows: RawSessionRow[]): RawSessionRow[] {
  return rows.filter((r) =>
    isSalesEligible({
      completion_reason: completionReasonOf(r.structured_understanding),
      email: r.email,
      identity_source: r.identity_source,
      crc_lead_id: r.crc_lead_id,
    }),
  )
}

function deriveWorkflow(state: SalesStateRow | undefined): SalesSessionWorkflowState {
  if (!state) {
    return { status: 'NEW', close_reason: null, contacted_at: null, converting_at: null, closed_at: null, updated_at: null, persisted: false }
  }
  return {
    status: state.status,
    close_reason: state.close_reason,
    contacted_at: state.contacted_at,
    converting_at: state.converting_at,
    closed_at: state.closed_at,
    updated_at: state.updated_at,
    persisted: true,
  }
}

// ── candidate fetch (cheap column filters; JS eligibility is the authority) ─

async function fetchCandidateSessions(extraLeadId?: string): Promise<RawSessionRow[]> {
  let q = supabaseAdmin
    .from('crc_sessions')
    .select(SESSION_COLUMNS)
    .not('email', 'is', null)
    .not('crc_lead_id', 'is', null)
    .eq('identity_source', 'email_gate')
    .order('email_captured_at', { ascending: false, nullsFirst: false })
  if (extraLeadId) q = q.eq('crc_lead_id', extraLeadId)
  const { data, error } = await q
  if (error) throw new Error(`[crc-sales/repository] fetchCandidateSessions: ${error.message}`)
  return (data ?? []) as unknown as RawSessionRow[]
}

async function fetchSalesStates(sessionIds: string[]): Promise<Map<string, SalesStateRow>> {
  const map = new Map<string, SalesStateRow>()
  if (sessionIds.length === 0) return map
  const { data, error } = await supabaseAdmin
    .from('crc_sales_state')
    .select('crc_session_id, status, close_reason, contacted_at, converting_at, closed_at, updated_at')
    .in('crc_session_id', sessionIds)
  if (error) throw new Error(`[crc-sales/repository] fetchSalesStates: ${error.message}`)
  for (const r of (data ?? []) as SalesStateRow[]) map.set(r.crc_session_id, r)
  return map
}

async function fetchLeadEmails(leadIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (leadIds.length === 0) return map
  const { data, error } = await supabaseAdmin.from('crc_leads').select('id, email').in('id', leadIds)
  if (error) throw new Error(`[crc-sales/repository] fetchLeadEmails: ${error.message}`)
  for (const r of (data ?? []) as Array<{ id: string; email: string }>) map.set(r.id, r.email)
  return map
}

// ── public API ────────────────────────────────────────────────────────────

export async function listSalesContacts(): Promise<SalesContactListItem[]> {
  const eligible = eligibleRowsFrom(await fetchCandidateSessions())
  const states = await fetchSalesStates(eligible.map((r) => r.id))
  const leadEmails = await fetchLeadEmails([...new Set(eligible.map((r) => r.crc_lead_id!).filter(Boolean))])

  const byContact = new Map<string, RawSessionRow[]>()
  for (const r of eligible) {
    const arr = byContact.get(r.crc_lead_id!) ?? []
    arr.push(r)
    byContact.set(r.crc_lead_id!, arr)
  }

  const items: SalesContactListItem[] = []
  for (const [contactId, sessions] of byContact) {
    const email = leadEmails.get(contactId)
    if (!email) continue // fail closed: contact identity unresolved
    const status_summary: Record<SalesStatus, number> = { NEW: 0, CONTACTED: 0, CONVERTING: 0, CLOSED: 0 }
    let mostRecent = ''
    for (const s of sessions) {
      const st = states.get(s.id)?.status ?? 'NEW'
      status_summary[st] += 1
      const proxy = completionProxy(s).at
      if (proxy > mostRecent) mostRecent = proxy
    }
    items.push({
      contact_id: contactId,
      email,
      eligible_session_count: sessions.length,
      most_recent_eligible_at: mostRecent,
      status_summary,
    })
  }

  items.sort((a, b) => (a.most_recent_eligible_at < b.most_recent_eligible_at ? 1 : a.most_recent_eligible_at > b.most_recent_eligible_at ? -1 : 0))
  return items
}

export interface SalesContactDetail {
  contact_id: string
  email: string
  sessions: SalesSessionContext[]
}

export async function getSalesContactDetail(leadId: string): Promise<SalesContactDetail | null> {
  const leadEmails = await fetchLeadEmails([leadId])
  const email = leadEmails.get(leadId)
  if (!email) return null

  const eligible = eligibleRowsFrom(await fetchCandidateSessions(leadId))
  if (eligible.length === 0) return null

  const states = await fetchSalesStates(eligible.map((r) => r.id))
  const repeatCount = eligible.length

  const sessions: SalesSessionContext[] = eligible
    .map((r) => {
      const proxy = completionProxy(r)
      const su = safeDeserialize(r.structured_understanding)
      return {
        session_id: r.id,
        created_at: r.created_at,
        completion_proxy_at: proxy.at,
        completion_proxy_source: proxy.source,
        completion_reason: completionReasonOf(r.structured_understanding) ?? 'unknown',
        results_email_status: r.results_email_status,
        results_email_last_recipient: r.results_email_last_recipient,
        results_email_accepted_at: r.results_email_accepted_at,
        traffic_type: r.traffic_type,
        repeat_crc_count: repeatCount,
        workflow: deriveWorkflow(states.get(r.id)),
        project: su ? buildSalesSessionProject(su) : null,
        debug: { runtime_commit: r.runtime_commit, turn_count: r.turn_count },
      }
    })
    .sort((a, b) => (a.completion_proxy_at < b.completion_proxy_at ? 1 : a.completion_proxy_at > b.completion_proxy_at ? -1 : 0))

  return { contact_id: leadId, email, sessions }
}

/** Loads an ELIGIBLE session's SU for the answer-context service. Returns null for a non-existent or non-eligible session. */
export async function getEligibleSessionForAnswerContext(
  sessionId: string,
): Promise<{ su: StructuredUnderstanding; runtime_commit: string | null } | null> {
  const { data, error } = await supabaseAdmin.from('crc_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle()
  if (error) throw new Error(`[crc-sales/repository] getEligibleSessionForAnswerContext: ${error.message}`)
  if (!data) return null
  const row = data as unknown as RawSessionRow
  if (eligibleRowsFrom([row]).length === 0) return null
  const su = safeDeserialize(row.structured_understanding)
  if (!su) return null
  return { su, runtime_commit: row.runtime_commit }
}

/** Loads an ELIGIBLE session's transcript entries. Returns null for a non-existent / non-eligible session; [] for an empty transcript. */
export async function getEligibleSessionTranscript(sessionId: string): Promise<SalesTranscriptEntry[] | null> {
  const { data, error } = await supabaseAdmin.from('crc_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle()
  if (error) throw new Error(`[crc-sales/repository] getEligibleSessionTranscript: ${error.message}`)
  if (!data) return null
  const row = data as unknown as RawSessionRow
  if (eligibleRowsFrom([row]).length === 0) return null

  const raw = Array.isArray(row.transcript) ? (row.transcript as Array<Record<string, unknown>>) : []
  const entries: SalesTranscriptEntry[] = []
  for (const e of raw) {
    const role = e.role
    if (role !== 'user' && role !== 'assistant') continue
    const text = typeof e.text === 'string' ? e.text : ''
    const timestamp = typeof e.timestamp === 'string' ? e.timestamp : null
    entries.push({ role, text, timestamp })
  }
  return entries
}

/**
 * Fail-closed transcript-access audit. Throws if the row cannot be
 * persisted -- the caller MUST NOT return transcript content on throw
 * (CAH-3B Correction 2). Contains no transcript / conversation text.
 */
export async function recordTranscriptViewAudit(actorUserId: string, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('crc_sales_events')
    .insert({ event_type: 'transcript_viewed', actor_user_id: actorUserId, crc_session_id: sessionId })
  if (error) {
    throw new Error(`[crc-sales/repository] recordTranscriptViewAudit failed: ${error.message}`)
  }
}

// ── workflow transition ───────────────────────────────────────────────────

export type ApplyTransitionResult =
  | { ok: true; workflow: SalesSessionWorkflowState }
  | { ok: false; code: 'session_not_found' | 'invalid_transition' | 'missing_close_reason' | 'unexpected_close_reason' | 'unknown_status' | 'unknown_close_reason' }

export async function applySalesTransition(
  sessionId: string,
  to: SalesStatus,
  closeReason: SalesCloseReason | null,
  actorUserId: string,
): Promise<ApplyTransitionResult> {
  // Session must exist AND be Sales-eligible.
  const { data, error } = await supabaseAdmin.from('crc_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle()
  if (error) throw new Error(`[crc-sales/repository] applySalesTransition load: ${error.message}`)
  if (!data) return { ok: false, code: 'session_not_found' }
  if (eligibleRowsFrom([data as unknown as RawSessionRow]).length === 0) return { ok: false, code: 'session_not_found' }

  const current = (await fetchSalesStates([sessionId])).get(sessionId)
  const from: SalesStatus = current?.status ?? 'NEW'

  const v = validateTransition(from, to, closeReason)
  if (!v.ok) return { ok: false, code: v.code }

  const tsCol = timestampColumnFor(to)
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    crc_session_id: sessionId,
    status: v.to,
    close_reason: v.close_reason,
    updated_by: actorUserId,
  }
  if (tsCol) patch[tsCol] = now

  const { data: upserted, error: upErr } = await supabaseAdmin
    .from('crc_sales_state')
    .upsert(patch, { onConflict: 'crc_session_id' })
    .select('crc_session_id, status, close_reason, contacted_at, converting_at, closed_at, updated_at')
    .single()
  if (upErr) throw new Error(`[crc-sales/repository] applySalesTransition upsert: ${upErr.message}`)

  return { ok: true, workflow: deriveWorkflow(upserted as SalesStateRow) }
}
