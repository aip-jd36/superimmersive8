/**
 * CR-ARTIFACT-1 — production adapters (service role only) for the private
 * Creator Record artifact path. The only module that knows Supabase specifics.
 */

import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ARTIFACTS_TABLE, CREATOR_RECORD_ARTIFACT_ROLLOUT, CREATOR_RECORDS_BUCKET, UAT_ALLOWLIST_TABLE, type ArtifactRolloutMode } from './config'
import type { ArtifactRow, ArtifactTable, ObjectStore } from './issue'

const COLUMNS = 'id, submission_id, record_id, attempt_id, storage_path, sha256, byte_size, generator_version, status, uat, issued_at'

export class ArtifactStoreError extends Error {
  constructor(op: string, readonly code: string | undefined) {
    super(`creator_record_artifact_${op}_failed${code ? `:${code}` : ''}`)
  }
}

/** PostgREST / Postgres "table does not exist" (the migration has not been applied). */
export const isMissingRelation = (code: string | undefined) => code === '42P01' || code === 'PGRST205'

export const artifactTable: ArtifactTable = {
  async find(submissionId) {
    const { data, error } = await supabaseAdmin.from(ARTIFACTS_TABLE).select(COLUMNS).eq('submission_id', submissionId).maybeSingle()
    if (error) throw new ArtifactStoreError('find', error.code)
    return (data as ArtifactRow | null) ?? null
  },
  async insertPending(row) {
    const { data, error } = await supabaseAdmin.from(ARTIFACTS_TABLE).insert({ ...row, status: 'pending' }).select(COLUMNS).single()
    if (error?.code === '23505') return { result: 'conflict' }
    if (error || !data) throw new ArtifactStoreError('insert', error?.code)
    return { result: 'inserted', row: data as ArtifactRow }
  },
  async takeOver(id, expectedAttemptId, next) {
    const { data, error } = await supabaseAdmin
      .from(ARTIFACTS_TABLE)
      .update(next)
      .eq('id', id)
      .eq('attempt_id', expectedAttemptId)
      .eq('status', 'pending')
      .select('id')
    if (error) throw new ArtifactStoreError('takeover', error.code)
    return Array.isArray(data) && data.length === 1
  },
  async markIssued(id, attemptId, sha256) {
    const { data, error } = await supabaseAdmin
      .from(ARTIFACTS_TABLE)
      .update({ status: 'issued', issued_at: new Date().toISOString() })
      .eq('id', id)
      .eq('attempt_id', attemptId)
      .eq('sha256', sha256)
      .eq('status', 'pending')
      .select('id')
    if (error) throw new ArtifactStoreError('issue', error.code)
    return Array.isArray(data) && data.length === 1
  },
}

/** Storage error shapes (storage-js StorageApiError: `status` + `statusCode`). */
const storageCode = (e: unknown) => String((e as { statusCode?: unknown })?.statusCode ?? '')
const storageMessage = (e: unknown) => String((e as { message?: unknown })?.message ?? '')
export const isObjectNotFound = (e: unknown) => storageCode(e) === '404' || /object not found/i.test(storageMessage(e))
export const isObjectExists = (e: unknown) => storageCode(e) === '409' || /already exists|duplicate/i.test(storageMessage(e))

export const privateObjectStore: ObjectStore = {
  async get(path) {
    const { data, error } = await supabaseAdmin.storage.from(CREATOR_RECORDS_BUCKET).download(path)
    if (error) {
      if (isObjectNotFound(error)) return null
      throw new ArtifactStoreError('download', storageCode(error) || undefined)
    }
    return new Uint8Array(await data.arrayBuffer())
  },
  async put(path, bytes) {
    const { error } = await supabaseAdmin.storage.from(CREATOR_RECORDS_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false })
    if (!error) return 'stored'
    if (isObjectExists(error)) return 'exists'
    throw new ArtifactStoreError('upload', storageCode(error) || undefined)
  },
}

/**
 * The artifact row's status, or null when there is definitely none.
 * CR-ARTIFACT-1C: fail closed — ANY lookup error, including a missing table,
 * is thrown, never read as "no artifact". (PostgREST answers PGRST205 both
 * before the migration and while its schema cache is stale just after it, so a
 * missing table cannot prove that no artifact exists.) The migration must
 * therefore be applied before this code is deployed.
 */
export async function artifactStatus(submissionId: string): Promise<'pending' | 'issued' | null> {
  const { data, error } = await supabaseAdmin.from(ARTIFACTS_TABLE).select('status').eq('submission_id', submissionId).maybeSingle()
  if (error) throw new ArtifactStoreError('status', error.code)
  return ((data as { status?: 'pending' | 'issued' } | null)?.status ?? null)
}

/**
 * CR-ARTIFACT-1C — rollout eligibility, three states:
 *   'allowlisted'      the submission is explicitly listed (or mode 'all');
 *   'not_allowlisted'  definitively outside the rollout (no row; or mode 'off');
 *   'unknown'          eligibility could not be established (any lookup error,
 *                      including a missing table) — the caller must FAIL CLOSED:
 *                      neither the private nor the public legacy path is used.
 * There is no request-controlled input: the mode is a code constant and the
 * allowlist is written only by the operator.
 */
export type GateDecision = 'allowlisted' | 'not_allowlisted' | 'unknown'

export async function artifactGateDecision(submissionId: string, mode: ArtifactRolloutMode = CREATOR_RECORD_ARTIFACT_ROLLOUT): Promise<GateDecision> {
  if (mode === 'off') return 'not_allowlisted'
  if (mode === 'all') return 'allowlisted'
  const { data, error } = await supabaseAdmin.from(UAT_ALLOWLIST_TABLE).select('submission_id').eq('submission_id', submissionId).maybeSingle()
  if (error) {
    console.error('creator_record_artifact_gate_unknown', { code: error.code })
    return 'unknown'
  }
  return data ? 'allowlisted' : 'not_allowlisted'
}

export const newAttemptId = () => randomUUID()
