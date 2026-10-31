/**
 * CR-V2-MVP-M2 — production ports for the Creator Record v2 customer flow
 * (`lib/creator-record/customer-flow/service.ts`).
 *
 * Service-role access to the two M2 tables. The tables grant nothing to anon or
 * authenticated; the routes are the authorization boundary and always pass the
 * session user. Database error details are logged here by code only.
 */

import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { FlowDeps, NewPreparedRow, PreparedRow, PreparedStore } from '@/lib/creator-record/customer-flow/service'
import { approvedCustomerRecordInputs, CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'

export const PREPARED_TABLE = 'creator_record_v2_prepared'
export const PILOT_ACCESS_TABLE = 'creator_record_v2_pilot_access'

const COLUMNS = 'id, user_id, draft_id, version, record_ref, record_schema, record_schema_version, canonical, sha256, form_state, status, created_at, reviewed_at, submission_id'

export class PreparedStoreError extends Error {
  constructor(op: string, code: string | undefined) {
    super(`creator_record_v2_store:${op}:${code ?? 'unknown'}`)
  }
}

export const preparedStore: PreparedStore = {
  async insert(row: NewPreparedRow): Promise<PreparedRow> {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).insert({ ...row, status: 'prepared' }).select(COLUMNS).single()
    if (error || !data) throw new PreparedStoreError('insert', error?.code)
    return data as PreparedRow
  },
  async get(id: string): Promise<PreparedRow | null> {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select(COLUMNS).eq('id', id).maybeSingle()
    if (error) throw new PreparedStoreError('get', error.code)
    return (data as PreparedRow | null) ?? null
  },
  async latestVersion(draftId: string): Promise<PreparedRow | null> {
    const { data, error } = await supabaseAdmin.from(PREPARED_TABLE).select(COLUMNS).eq('draft_id', draftId).order('version', { ascending: false }).limit(1).maybeSingle()
    if (error) throw new PreparedStoreError('latest', error.code)
    return (data as PreparedRow | null) ?? null
  },
  async markReviewed(id: string, userId: string): Promise<PreparedRow | null> {
    const { data, error } = await supabaseAdmin
      .from(PREPARED_TABLE)
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'prepared')
      .select(COLUMNS)
      .maybeSingle()
    if (error) throw new PreparedStoreError('review', error.code)
    return (data as PreparedRow | null) ?? null
  },
}

export async function hasPilotAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from(PILOT_ACCESS_TABLE).select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw new PreparedStoreError('pilot_access', error.code)
  return !!data
}

export function productionFlowDeps(): FlowDeps {
  return {
    submissions: CREATOR_RECORD_V2_SUBMISSIONS,
    hasPilotAccess,
    store: preparedStore,
    inputs: approvedCustomerRecordInputs,
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    now: () => new Date(),
    newId: () => randomUUID(),
    log: (event, detail) => console.warn(event, detail),
  }
}
