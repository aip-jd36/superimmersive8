/**
 * GET /api/admin/submissions/[id]/reviewer-crc-context/[association_id]/transcript
 * (CAH-4C)
 *
 * DELIBERATE, ON-DEMAND, FAIL-CLOSED AUDITED transcript access. Never loads
 * with the page; the reviewer must explicitly open it.
 *
 * Required sequence (CAH-4C §4 — the ordering is the contract, not just the
 * presence of the audit call):
 *
 *   1. authorize reviewer                          (checkReviewerContextAccess)
 *   2. resolve the ACTIVE association [association_id] OF submission [id],
 *      server-derive its crc_session_id, load + shape the transcript
 *      into memory                                 (getReviewerCrcTranscript)
 *        - not an active association of this submission  -> 404, zero content
 *        - a removed association                          -> 404 (list is active-only)
 *        - the CRC session row is gone                    -> 404, zero content
 *        - a transcript-read DB error                     -> 500, NO audit event
 *   3. PERSIST the durable context-access audit    (recordReviewerTranscriptAccess — throws on failure)
 *        - audit persistence fails -> 503, ZERO transcript bytes, no log-and-continue
 *   4. ONLY THEN return the verbatim transcript
 *
 * No request body. No caller-supplied crc_session_id — the session is resolved
 * server-side from the authoritative active association. Imports only the
 * reviewer-context auth + service + audit repository — never @/lib/assessments,
 * never the workbook write path.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkReviewerContextAccess } from '@/lib/reviewer-context/auth'
import { getReviewerCrcTranscript } from '@/lib/reviewer-context/service'
import { recordReviewerTranscriptAccess } from '@/lib/reviewer-context/repository'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string; association_id: string } }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  // 1. authorize
  const access = await checkReviewerContextAccess()
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: access.status },
    )
  }

  // 2. resolve (submission-scoped active association -> server-derived session -> shaped transcript)
  let resolved
  try {
    resolved = await getReviewerCrcTranscript(params.id, params.association_id)
  } catch (err) {
    console.error('[reviewer-crc-context/transcript] resolve failed', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!resolved.ok) {
    // no_such_active_association | session_unavailable — never distinguish, never leak
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 3. audit-before-content: durable access record MUST persist before any
  //    transcript byte is returned. Failure denies the transcript.
  try {
    await recordReviewerTranscriptAccess({
      actorUserId: access.userId,
      submissionId: params.id,
      associationId: params.association_id,
      crcSessionId: resolved.crcSessionId,
    })
  } catch (err) {
    console.error('[reviewer-crc-context/transcript] audit persistence failed — denying transcript', err)
    return NextResponse.json(
      { error: 'Transcript unavailable — access could not be recorded.' },
      { status: 503 },
    )
  }

  // 4. only now — verbatim, sequence-preserving, no classification
  return NextResponse.json({ entries: resolved.entries })
}
