/**
 * CRC <-> Assurance association -- data access (CAH-3D, extended read-only by
 * CAH-3F).
 *
 * The ONLY module in lib/crc-assurance-handoff/ that talks to the database.
 * Reads exactly what the service and reviewed capability modules need
 * (submission existence + ownership; CRC session existence + persisted state;
 * CAH-3F: email->lead->session correlation reads, and an inverse
 * active-association lookup by CRC session); performs the atomic create/remove
 * via the two Postgres functions from migration 20260904000000, which write
 * the association row AND the required security-critical audit event in one
 * transaction (CAH-3D §23).
 *
 * It NEVER writes to crc_sessions / crc_leads / submissions / users / any
 * Assurance table, and never reads or writes crc_sales_state / crc_sales_events.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AuthorizationBasis, CrcAssuranceAssociation } from './types'

// ── reads ────────────────────────────────────────────────────────────────

/** Returns the owning users.id for a submission, or null if the submission does not exist. */
export async function getSubmissionOwner(submissionId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('user_id')
    .eq('id', submissionId)
    .maybeSingle()
  if (error) throw new Error(`[crc-assurance-handoff/repository] getSubmissionOwner: ${error.message}`)
  if (!data) return null
  return (data as { user_id: string }).user_id
}

export interface CrcSessionForAssociation {
  structured_understanding: unknown
  runtime_commit: string | null
}

/** Loads the persisted CRC state needed for association. null if the session does not exist. */
export async function getCrcSessionForAssociation(crcSessionId: string): Promise<CrcSessionForAssociation | null> {
  const { data, error } = await supabaseAdmin
    .from('crc_sessions')
    .select('structured_understanding, runtime_commit')
    .eq('id', crcSessionId)
    .maybeSingle()
  if (error) throw new Error(`[crc-assurance-handoff/repository] getCrcSessionForAssociation: ${error.message}`)
  if (!data) return null
  const row = data as { structured_understanding: unknown; runtime_commit: string | null }
  return { structured_understanding: row.structured_understanding, runtime_commit: row.runtime_commit }
}

const ASSOCIATION_COLUMNS =
  'id, crc_session_id, submission_id, associated_by, associated_at, authorization_basis, ' +
  'status, removed_at, removed_by, crc_state_fingerprint, crc_state_canon_version, ' +
  'crc_session_runtime_commit, created_at, updated_at'

export async function getAssociationById(id: string): Promise<CrcAssuranceAssociation | null> {
  const { data, error } = await supabaseAdmin
    .from('crc_assurance_associations')
    .select(ASSOCIATION_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`[crc-assurance-handoff/repository] getAssociationById: ${error.message}`)
  if (!data) return null
  return data as unknown as CrcAssuranceAssociation
}

/** Active associations for a submission -- read-only helper, no consumer/projection. */
export async function listActiveAssociationsForSubmission(submissionId: string): Promise<CrcAssuranceAssociation[]> {
  const { data, error } = await supabaseAdmin
    .from('crc_assurance_associations')
    .select(ASSOCIATION_COLUMNS)
    .eq('submission_id', submissionId)
    .eq('status', 'active')
    .order('associated_at', { ascending: false })
  if (error) throw new Error(`[crc-assurance-handoff/repository] listActiveAssociationsForSubmission: ${error.message}`)
  return (data ?? []) as unknown as CrcAssuranceAssociation[]
}

/**
 * Active associations that reference a given CRC session (inverse of the
 * above). CAH-3F uses this to fail closed when a candidate CRC session is
 * already associated with a DIFFERENT submission -- the DB permits it (no
 * global UNIQUE(crc_session_id)) but the CAH-3F capability deliberately does
 * not (V1 conservative boundary, §12).
 */
export async function listActiveAssociationsForCrcSession(crcSessionId: string): Promise<CrcAssuranceAssociation[]> {
  const { data, error } = await supabaseAdmin
    .from('crc_assurance_associations')
    .select(ASSOCIATION_COLUMNS)
    .eq('crc_session_id', crcSessionId)
    .eq('status', 'active')
  if (error) throw new Error(`[crc-assurance-handoff/repository] listActiveAssociationsForCrcSession: ${error.message}`)
  return (data ?? []) as unknown as CrcAssuranceAssociation[]
}

// ── CAH-3F: email -> lead -> session correlation reads ────────────────────
//
// These are plain lookups. Correlation is by exact match on the CRC's own
// canonical `email_normalized` (crc_leads is UNIQUE on it). No Gmail-dot /
// plus-address / fuzzy matching -- conservative and deterministic (CAH-3F §7).

/** The crc_leads.id for an exact normalized-email match, or null. */
export async function findCrcLeadIdByNormalizedEmail(emailNormalized: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('crc_leads')
    .select('id')
    .eq('email_normalized', emailNormalized)
    .maybeSingle()
  if (error) throw new Error(`[crc-assurance-handoff/repository] findCrcLeadIdByNormalizedEmail: ${error.message}`)
  if (!data) return null
  return (data as { id: string }).id
}

export interface CorrelatedCrcSessionRow {
  id: string
  structured_understanding: unknown
  identity_source: string | null
  email: string | null
  crc_lead_id: string | null
}

/**
 * CRC sessions linked to a lead via the email gate. The caller applies the
 * authoritative governed-completion filter (CAH-3F composes the same
 * `COMPLETION_REASONS` set the association core uses -- see
 * email-correlation.ts).
 */
export async function listSessionsForCrcLead(leadId: string): Promise<CorrelatedCrcSessionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('crc_sessions')
    .select('id, structured_understanding, identity_source, email, crc_lead_id')
    .eq('crc_lead_id', leadId)
    .eq('identity_source', 'email_gate')
  if (error) throw new Error(`[crc-assurance-handoff/repository] listSessionsForCrcLead: ${error.message}`)
  return (data ?? []) as unknown as CorrelatedCrcSessionRow[]
}

// ── atomic writes (create/remove + required audit, one transaction each) ──

export type CreateAtomicReason =
  | 'not_submission_owner'
  | 'duplicate_active'
  | 'reference_not_found'

export type CreateAtomicResult =
  | { ok: true; association: CrcAssuranceAssociation }
  | { ok: false; reason: CreateAtomicReason }

export interface CreateAtomicParams {
  crcSessionId: string
  submissionId: string
  actorUserId: string
  authorizationBasis: AuthorizationBasis
  fingerprint: string
  canonVersion: string
  runtimeCommit: string | null
}

/** Unwraps the jsonb `{ ok, reason?, association? }` shape returned by both RPCs. */
function rpcObject(data: unknown): Record<string, unknown> {
  const row = Array.isArray(data) ? (data[0] as unknown) : data
  if (row === null || typeof row !== 'object') {
    throw new Error('[crc-assurance-handoff/repository] RPC returned no object')
  }
  return row as Record<string, unknown>
}

export async function createAssociationAtomic(p: CreateAtomicParams): Promise<CreateAtomicResult> {
  const { data, error } = await supabaseAdmin.rpc('create_crc_assurance_association', {
    p_crc_session_id: p.crcSessionId,
    p_submission_id: p.submissionId,
    p_associated_by: p.actorUserId,
    p_authorization_basis: p.authorizationBasis,
    p_crc_state_fingerprint: p.fingerprint,
    p_crc_state_canon_version: p.canonVersion,
    p_crc_session_runtime_commit: p.runtimeCommit,
  })
  if (error) throw new Error(`[crc-assurance-handoff/repository] createAssociationAtomic: ${error.message}`)
  const row = rpcObject(data)
  if (row.ok === true && row.association && typeof row.association === 'object') {
    return { ok: true, association: row.association as unknown as CrcAssuranceAssociation }
  }
  return { ok: false, reason: (row.reason as CreateAtomicReason) ?? 'reference_not_found' }
}

export type RemoveAtomicReason = 'association_not_found' | 'not_active' | 'not_submission_owner'

export type RemoveAtomicResult =
  | { ok: true; association: CrcAssuranceAssociation }
  | { ok: false; reason: RemoveAtomicReason }

export async function removeAssociationAtomic(associationId: string, actorUserId: string): Promise<RemoveAtomicResult> {
  const { data, error } = await supabaseAdmin.rpc('remove_crc_assurance_association', {
    p_association_id: associationId,
    p_removed_by: actorUserId,
  })
  if (error) throw new Error(`[crc-assurance-handoff/repository] removeAssociationAtomic: ${error.message}`)
  const row = rpcObject(data)
  if (row.ok === true && row.association && typeof row.association === 'object') {
    return { ok: true, association: row.association as unknown as CrcAssuranceAssociation }
  }
  return { ok: false, reason: (row.reason as RemoveAtomicReason) ?? 'association_not_found' }
}
