/**
 * CR-V2-DOC-1 — shared HTTP handling for the Creator Record v2 evidence routes.
 * The creator is always the session user. Responses are private and never cached; errors carry a fixed
 * code only (no database, storage or internal detail).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { EvidenceError } from '@/lib/creator-record/evidence-intake/service'
import { NO_STORE } from './http'
import { EVIDENCE_MESSAGES } from './wording'

// CR-V2-MVP-PROD-PREP-1: the wording lives in `./wording` (customer wording set), text unchanged.
const MESSAGES: Readonly<Record<EvidenceError['code'], string>> = EVIDENCE_MESSAGES

export function evidenceError(e: EvidenceError): NextResponse {
  return NextResponse.json({ error: MESSAGES[e.code], code: e.code }, { status: e.status, headers: NO_STORE })
}

export const invalidRequest = (status: 400 | 413 = 400) =>
  NextResponse.json({ error: status === 413 ? MESSAGES.file_too_large : MESSAGES.invalid_request, code: status === 413 ? 'file_too_large' : 'invalid_request' }, { status, headers: NO_STORE })

/** Read a request body up to `limit` bytes, stopping as soon as it is exceeded (no unbounded buffering). */
export async function readLimitedBytes(body: ReadableStream<Uint8Array> | null, limit: number): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; status: 400 | 413 }> {
  if (!body) return { ok: false, status: 400 }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return { ok: false, status: 413 }
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return { ok: true, bytes: out }
}

/** True only for an admin account (users.is_admin). Any lookup error is "not admin" (fail closed). */
export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('users').select('is_admin').eq('id', userId).maybeSingle()
  if (error) return false
  return (data as { is_admin?: boolean } | null)?.is_admin === true
}
