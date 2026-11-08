/**
 * CR-V2-DOC-1 — shared HTTP handling for the Creator Record v2 evidence routes.
 * The creator is always the session user. Responses are private and never cached; errors carry a fixed
 * code only (no database, storage or internal detail).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { EvidenceError } from '@/lib/creator-record/evidence-intake/service'
import { NO_STORE } from './http'

const MESSAGES: Record<EvidenceError['code'], string> = {
  invalid_request: 'The request could not be read.',
  consent_required: 'Please confirm the document storage notice before adding documents.',
  empty_file: 'The file is empty.',
  file_too_large: 'The file is larger than 4 MB.',
  unsupported_format: 'Only PDF, PNG and JPEG files can be added.',
  pdf_malformed: 'This PDF could not be read.',
  pdf_encrypted: 'Password-protected or encrypted PDFs cannot be added.',
  pdf_active_content: 'This PDF contains scripts, attachments or interactive content and cannot be added.',
  image_header_invalid: 'This image could not be read.',
  image_too_large: 'This image is too large.',
  not_invited: 'Creator Record is currently available by invitation only.',
  synthetic_documents_only: 'Documents cannot be added yet.',
  not_found: 'Not found.',
  upload_in_progress: 'This file is still being added. Try again in a moment.',
  too_many_documents: 'You have reached the maximum number of documents.',
  document_retained: 'This document is part of a prepared record and is kept.',
  // CR-V2-SCHEMA8-PATH-1-DEDUP-CORRECTION. DRAFT wording, not approved.
  consent_outdated: 'You added this file earlier under a previous version of our storage notice, privacy notice or terms, so it cannot be reused under the current ones. Email jd@superimmersive8.com for help.',
  object_missing: 'This document is no longer available.',
  integrity_failure: 'This document could not be verified. Nothing was changed.',
  storage_failed: 'The document could not be stored. Nothing was kept.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  audit_unavailable: 'This document cannot be opened right now.',
}

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
