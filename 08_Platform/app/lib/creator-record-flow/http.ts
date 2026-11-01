/**
 * CR-V2-MVP-M2 — shared HTTP handling for the Creator Record v2 customer routes.
 * The creator is always the authenticated session user. Responses are private and
 * never cached; errors carry a fixed code only (no database or internal detail).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FlowResult } from '@/lib/creator-record/customer-flow/service'
import type { PurchaseError } from '@/lib/creator-record/customer-flow/purchase'

export const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' }

export async function sessionUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })

const MESSAGES: Record<string, string> = {
  invalid_request: 'The request could not be read.',
  invalid_documents: 'One or more documents could not be used. Check your documents and try again.',
  invalid_answers: 'Some answers need attention.',
  not_invited: 'Creator Record is currently available by invitation only.',
  not_found: 'Not found.',
  superseded: 'A newer version of these answers exists. Review the latest version.',
  conflict: 'This version changed while you were reviewing it. Reload and try again.',
  integrity_failure: 'This record could not be verified. Nothing was changed.',
  submissions_stopped: 'Creator Record is not taking new submissions right now.',
  unavailable: 'Creator Record is not available yet.',
}

export function respond(result: FlowResult): NextResponse {
  if (result.ok) return NextResponse.json({ prepared: result.view }, { status: 200, headers: NO_STORE })
  const body: Record<string, unknown> = { error: MESSAGES[result.code], code: result.code }
  if (result.code === 'invalid_answers') body.issues = result.issues
  return NextResponse.json(body, { status: result.status, headers: NO_STORE })
}

export const internalError = () => NextResponse.json({ error: 'Something went wrong. Nothing was changed.' }, { status: 500, headers: NO_STORE })

const PURCHASE_MESSAGES: Record<PurchaseError['code'], string> = {
  not_invited: MESSAGES.not_invited,
  not_found: MESSAGES.not_found,
  not_reviewed: 'Confirm your declarations before payment.',
  superseded: MESSAGES.superseded,
  ineligible: 'This Creator Record cannot be completed at the moment.',
  integrity_failure: MESSAGES.integrity_failure,
  submissions_stopped: MESSAGES.submissions_stopped,
  issuance_stopped: 'Creator Record payments are not open yet.',
  evidence_unavailable: 'A document in this record is no longer available. Nothing was charged.',
  unavailable: 'Creator Record is not available right now.',
}

/** CR-V2-MVP-M3: fixed customer message for a purchase refusal (no internal detail). */
export const purchaseMessage = (code: PurchaseError['code']): string => PURCHASE_MESSAGES[code]
