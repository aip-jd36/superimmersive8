/**
 * GET /api/creator-record-v2/evidence/[id]/file   (CR-V2-DOC-1)
 *
 * The stored bytes of one document, to its owner or to an admin. Every read is logged before any content is
 * returned (no log, no content). The bytes are re-hashed against the stored fingerprint. Served only as an
 * attachment with `nosniff`, a sandboxing CSP and no caching; never rendered inline and never via a public
 * or signed URL. Another creator's document is indistinguishable from a missing one.
 */
import { NextRequest } from 'next/server'
import { readEvidenceFile } from '@/lib/creator-record/evidence-intake/service'
import { productionEvidenceDeps } from '@/lib/creator-record-flow/evidence-production'
import { evidenceError, isAdminUser } from '@/lib/creator-record-flow/evidence-http'
import { internalError, sessionUserId, unauthorized } from '@/lib/creator-record-flow/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' }

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await sessionUserId()
  if (!userId) return unauthorized()
  try {
    const r = await readEvidenceFile(productionEvidenceDeps(), { userId, isAdmin: await isAdminUser(userId) }, params.id)
    if (!r.ok) return evidenceError(r)
    const name = `document-${params.id.slice(0, 8)}.${EXT[r.media_type]}`
    return new Response(r.bytes as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': r.media_type,
        'Content-Length': String(r.bytes.byteLength),
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (err) {
    console.error('[creator-record-v2/evidence] read failed', { error: err instanceof Error ? err.message : 'unknown' })
    return internalError()
  }
}
