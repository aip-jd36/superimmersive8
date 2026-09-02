/**
 * GET /api/admin/crc-leads/sessions/[session_id]/transcript (CAH-3B, §19).
 *
 * FAIL-CLOSED AUDITED transcript access (Correction 2). Required sequence:
 *
 *   authenticate/authorize
 *   -> verify target session exists AND is Sales-eligible
 *   -> load transcript entries
 *   -> PERSIST the transcript-access audit event (throws on failure)
 *   -> only then return transcript content
 *
 * If the audit row cannot be persisted, NO transcript content is returned.
 * Transcript is never included in the list / contact-detail / answer-context
 * responses. Only user/assistant entries; internal/system metadata excluded.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCrcLeadAccess } from '@/lib/crc-sales/auth'
import { getEligibleSessionTranscript, recordTranscriptViewAudit } from '@/lib/crc-sales/repository'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { session_id: string } }) {
  const access = await requireCrcLeadAccess()
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: access.status })

  let entries
  try {
    entries = await getEligibleSessionTranscript(params.session_id)
  } catch (err) {
    console.error('[api/admin/crc-leads/.../transcript] load failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (entries === null) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Correction 2: audit MUST be durably recorded before any transcript
  // content is returned. A failure here denies the transcript.
  try {
    await recordTranscriptViewAudit(access.userId, params.session_id)
  } catch (err) {
    console.error('[api/admin/crc-leads/.../transcript] audit persistence failed — denying transcript', err)
    return NextResponse.json({ error: 'Transcript unavailable — access could not be recorded.' }, { status: 503 })
  }

  return NextResponse.json({ entries })
}
