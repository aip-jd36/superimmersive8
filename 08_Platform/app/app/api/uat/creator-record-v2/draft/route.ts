/**
 * POST /api/uat/creator-record-v2/draft   (CR-V2-WORK-UAT-HARNESS-2)
 *
 * PUBLIC, TEMPORARY, SYNTHETIC-ONLY UAT harness. No authentication by design —
 * it reaches NO privileged capability: no auth or session lookup, no
 * Supabase, no service role, no storage, no email, no payment, no document
 * examination, no AI model (the runtime import closure is test-enforced).
 *
 * Order (each step fails closed before the next):
 *   1. kill switch / expiry window (`publicUatStatus`) — 404 before ANY part of
 *      the request is read;
 *   2. JSON content type; declared Content-Length, then a streamed 32 KB limit;
 *   3. strict parsing: questionnaire form state + allowlisted fixture ids only
 *      (no uploads, no browser-supplied observations, no unexpected fields);
 *   4. the unchanged Creator Record orchestrator over the pilot sources, with
 *      document observations built server-side from the replay table;
 *   5. public presentation (designation added, internal metadata removed).
 * Nothing is stored or logged. Responses are `no-store` and `noindex`.
 */

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { buildPublicUatDraft } from '@/lib/creator-record/public-uat/build-public-uat-draft'
import { publicUatStatus } from '@/lib/creator-record/public-uat/config'
import { parsePublicUatRequest, PUBLIC_UAT_MAX_BODY_BYTES } from '@/lib/creator-record/public-uat/parse-public-request'
import { readLimitedText } from '@/lib/creator-record/public-uat/read-limited'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: HEADERS })

export async function POST(req: NextRequest) {
  if (!publicUatStatus().open) return json({ error: 'Not found' }, 404)

  const contentType = (req.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.startsWith('application/json')) return json({ error: 'Invalid request' }, 400)
  const declared = Number(req.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > PUBLIC_UAT_MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413)
  const raw = await readLimitedText(req.body, PUBLIC_UAT_MAX_BODY_BYTES)
  if (!raw.ok) return raw.status === 413 ? json({ error: 'Request too large' }, 413) : json({ error: 'Invalid request' }, 400)

  let body: unknown
  try {
    body = JSON.parse(raw.text)
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }
  const parsed = parsePublicUatRequest(body)
  if (!parsed.ok) return json({ error: 'Invalid request' }, 400)

  const now = new Date()
  const result = buildPublicUatDraft({
    state: parsed.state,
    refs: parsed.documents,
    topicClaims: TOPIC_CLAIMS_FIXTURE,
    as_of: now.toISOString().slice(0, 10),
    record: { record_id: `UAT-${randomUUID().slice(0, 8).toUpperCase()}`, record_version: 1, captured_at: now.toISOString() },
  })
  if (!result.ok) return json({ ok: false, issues: result.issues }, 422)
  return json({ ok: true, view: result.view }, 200)
}
