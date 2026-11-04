/**
 * Permanent admin-only Production UAT: the real persisted Creator Record v2 journey, on synthetic inputs, for an existing
 * SI8 administrator (`/admin/creator-record-v2/uat`).
 *
 * The customer services are reused unchanged, through these injected dependencies:
 *   - `submissions: 'stopped'` is fixed, so the services always take their synthetic branch, before and after launch.
 *   - The synthetic port and the pilot check answer only for the administrator the route authenticated.
 *   - `realDocumentsPermitted: false` is fixed: only committed fixture bytes are stored, even after real intake opens.
 *   - Runs are read only under the `admin_synthetic_uat` boundary. Customer paths keep their own list, which excludes it.
 *
 * What does not exist here, by construction: purchase or issuance ports, email, model calls, a client-supplied mode or
 * identity. Authority is the session plus `users.is_admin`, checked per request by the existing gate, and again by the
 * database for every examination read and run (20261107000000).
 */
import { NextResponse } from 'next/server'
import { examinationProjectionFor, type CustomerExaminationDeps } from '@/lib/creator-record/customer-flow/examination'
import { verifiedRecord, type FlowDeps } from '@/lib/creator-record/customer-flow/service'
import { isSyntheticRecordAuthority, syntheticUatInputs } from '@/lib/creator-record/customer-flow/synthetic-uat'
import type { EvidenceDeps } from '@/lib/creator-record/evidence-intake/service'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { productionEvidenceDeps } from '@/lib/creator-record-flow/evidence-production'
import { productionCustomerExaminationDeps } from '@/lib/creator-record-flow/examination-customer'
import { productionExaminationDeps } from '@/lib/creator-record-flow/examination-production'
import { NO_STORE } from '@/lib/creator-record-flow/http'
import { preparedVersionsOf, productionFlowDeps } from '@/lib/creator-record-flow/production'

export const ADMIN_UAT_API_BASE = '/api/admin/creator-record-v2/uat'
export const ADMIN_UAT_BOUNDARIES = ['admin_synthetic_uat'] as const

/** The authenticated administrator, or the refusal to return. Fail closed: any uncertainty is a refusal. */
export async function adminUatSession(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const access = await checkReviewerContextAccess().catch(() => ({ ok: false as const, status: 403 as const }))
  if (access.ok) return { ok: true, userId: access.userId }
  return { ok: false, response: NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status, headers: NO_STORE }) }
}

const only = (adminId: string) => (userId: string) => userId === adminId

export function adminUatFlowDeps(adminId: string): FlowDeps {
  return {
    ...productionFlowDeps(),
    submissions: 'stopped',
    hasPilotAccess: async (userId) => only(adminId)(userId),
    syntheticUat: { admits: only(adminId), inputs: syntheticUatInputs },
    examinations: { projectionFor: (userId, documentId) => examinationProjectionFor(productionExaminationDeps().storage, userId, documentId, ADMIN_UAT_BOUNDARIES) },
  }
}

export function adminUatEvidenceDeps(adminId: string): EvidenceDeps {
  return {
    ...productionEvidenceDeps(),
    submissions: 'stopped',
    hasPilotAccess: async (userId) => only(adminId)(userId),
    realDocumentsPermitted: false,
    syntheticUat: { admits: only(adminId) },
  }
}

export function adminUatExaminationDeps(adminId: string): CustomerExaminationDeps {
  return {
    ...productionCustomerExaminationDeps(),
    submissions: 'stopped',
    hasPilotAccess: async (userId) => only(adminId)(userId),
    syntheticUat: { admits: only(adminId) },
    visibleBoundaries: ADMIN_UAT_BOUNDARIES,
  }
}

export interface AdminUatVersion {
  id: string
  draft_id: string
  version: number
  status: string
  schema_version: number
  created_at: string
}

/** The administrator's own recent synthetic versions that still verify, newest first. Metadata only. */
export async function adminUatVersions(adminId: string): Promise<AdminUatVersion[]> {
  const rows = await preparedVersionsOf(adminId, 50)
  return rows.flatMap((row) => {
    const record = verifiedRecord(row)
    if (!record || !isSyntheticRecordAuthority(record.sources.source_text.authority)) return []
    return [{ id: row.id, draft_id: row.draft_id, version: row.version, status: row.status, schema_version: record.schema_version, created_at: row.created_at }]
  })
}
