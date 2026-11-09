/**
 * CR-V2-MVP-M2 — shared HTTP handling for the Creator Record v2 customer routes.
 * The creator is always the authenticated session user. Responses are private and
 * never cached; errors carry a fixed code only (no database or internal detail).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FlowResult } from '@/lib/creator-record/customer-flow/service'
import type { PurchaseError } from '@/lib/creator-record/customer-flow/purchase'
import { FLOW_MESSAGES, PURCHASE_MESSAGES } from './wording'

export const NO_STORE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' }

export async function sessionUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

export const unauthorized = () => NextResponse.json({ error: FLOW_MESSAGES.unauthorized }, { status: 401, headers: NO_STORE })

// CR-V2-MVP-PROD-PREP-1: the wording lives in `./wording` (customer wording set), text unchanged.
const MESSAGES: Readonly<Record<string, string>> = FLOW_MESSAGES

export function respond(result: FlowResult): NextResponse {
  if (result.ok) return NextResponse.json({ prepared: result.view }, { status: 200, headers: NO_STORE })
  const body: Record<string, unknown> = { error: MESSAGES[result.code], code: result.code }
  if (result.code === 'invalid_answers') body.issues = result.issues
  return NextResponse.json(body, { status: result.status, headers: NO_STORE })
}

export const internalError = () => NextResponse.json({ error: FLOW_MESSAGES.internal_error }, { status: 500, headers: NO_STORE })

const PURCHASE: Readonly<Record<PurchaseError['code'], string>> = PURCHASE_MESSAGES

/** CR-V2-MVP-M3: fixed customer message for a purchase refusal (no internal detail). */
export const purchaseMessage = (code: PurchaseError['code']): string => PURCHASE[code]
