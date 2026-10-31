/**
 * POST /api/creator-record-v2/prepared   (CR-V2-MVP-M2)
 *
 * Prepares a new version of the signed-in creator's Creator Record v2 from their
 * questionnaire answers. Body: `{ state, draft_id? }`, at most 32 KB. Pilot-gated
 * and stopped by default. Prepares nothing until the approved sources exist.
 */
import { NextRequest } from 'next/server'
import { preparePrepared } from '@/lib/creator-record/customer-flow/service'
import { MAX_BODY_BYTES } from '@/lib/creator-record/prototype/parse-form-state'
import { readLimitedText } from '@/lib/creator-record/public-uat/read-limited'
import { productionFlowDeps } from '@/lib/creator-record-flow/production'
import { internalError, NO_STORE, respond, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'The request could not be read.', code: 'invalid_request' }, { status: 400, headers: NO_STORE })
  }
  const read = await readLimitedText(request.body, MAX_BODY_BYTES)
  if (!read.ok) return NextResponse.json({ error: 'The request could not be read.', code: 'invalid_request' }, { status: read.status, headers: NO_STORE })
  let body: unknown
  try {
    body = JSON.parse(read.text)
  } catch {
    return NextResponse.json({ error: 'The request could not be read.', code: 'invalid_request' }, { status: 400, headers: NO_STORE })
  }
  try {
    return respond(await preparePrepared(productionFlowDeps(), userId, body))
  } catch (err) {
    console.error('[creator-record-v2/prepared] failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
