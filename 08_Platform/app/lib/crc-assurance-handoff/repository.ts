/**
 * CRC <-> Assurance association -- data access (CAH-3D).
 *
 * The ONLY module in lib/crc-assurance-handoff/ that talks to the database.
 * Reads exactly what the service needs to validate front-door-independent
 * invariants (submission existence + ownership; CRC session existence +
 * persisted state + runtime_commit); performs the atomic create/remove via
 * the two Postgres functions from migration 20260904000000, which write the
 * association row AND the required security-critical audit event in one
 * transaction (CAH-3D §23).
 *
 * It NEVER writes to crc_sessions / submissions / users / any Assurance table,
 * and never reads or writes crc_sales_state / crc_sales_events.
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
