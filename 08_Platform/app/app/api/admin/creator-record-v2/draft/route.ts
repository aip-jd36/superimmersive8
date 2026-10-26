/**
 * POST /api/admin/creator-record-v2/draft   (CR-V2-VERTICAL-SLICE-1)
 *
 * INTERNAL PROTOTYPE. Admin-only. Turns submitted questionnaire answers into a
 * DRAFT Creator Record view using the existing deterministic guidance
 * pipeline over the real governed claim fixtures and the INTERNAL, UNAPPROVED
 * pilot sources (`lib/creator-record/pilot/`).
 *
 * No database read or write beyond the admin check, no upload, no payment,
 * no email, no PDF, no AI model call, no persistence: the draft exists only
 * in the response.
 *
 * Authorization reuses the existing fail-closed admin gate
 * (`checkReviewerContextAccess`: authenticated user with `users.is_admin`),
 * the same gate the other `/api/admin/*` reviewer surfaces use.
 */

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { buildCreatorRecordDraft, pilotSources } from '@/lib/creator-record/prototype/build-draft'
import { MAX_BODY_BYTES, parseFormState } from '@/lib/creator-record/prototype/parse-form-state'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const access = await checkReviewerContextAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = parseFormState(body)
  if (!parsed.ok) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const now = new Date()
  const result = buildCreatorRecordDraft({
    state: parsed.state,
    sources: pilotSources(),
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    as_of: now.toISOString().slice(0, 10),
    record: { record_id: `PROTOTYPE-${randomUUID().slice(0, 8).toUpperCase()}`, record_version: 1, captured_at: now.toISOString() },
  })
  if (!result.ok) return NextResponse.json({ ok: false, issues: result.issues }, { status: 422 })
  return NextResponse.json({ ok: true, view: result.view })
}
