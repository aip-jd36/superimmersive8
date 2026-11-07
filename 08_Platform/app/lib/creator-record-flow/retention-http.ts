/**
 * CR-V2-MVP-RETENTION-M1A — shared HTTP handling for the retention routes. Fixed codes only (no customer wording: none is approved),
 * private and never cached. A state-changing request must be a JSON body carrying an explicit confirmation, so a cross-site form
 * cannot submit one (a form cannot send `application/json` without a preflight).
 */

import { NextRequest, NextResponse } from 'next/server'
import type { RetentionError } from '@/lib/creator-record/evidence-intake/retention'
import { NO_STORE } from './http'

export const retentionError = (e: RetentionError) => NextResponse.json({ code: e.code }, { status: e.status, headers: NO_STORE })

const MAX_BODY_BYTES = 4096

/** The parsed JSON body, or null when it is not JSON, too large or unreadable. */
export async function readJsonBody(req: NextRequest): Promise<unknown | null> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return null
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null
  try {
    const text = await req.text()
    if (text.length > MAX_BODY_BYTES) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** `{ "confirm": true }` and nothing else. */
export const isConfirmation = (body: unknown): boolean =>
  !!body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1 && (body as { confirm?: unknown }).confirm === true
