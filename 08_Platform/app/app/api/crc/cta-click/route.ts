/**
 * POST /api/crc/cta-click -- CTA click tracking (CRC Identity + Abuse
 * Prevention + Analytics milestone, design report §8). Fire-and-forget
 * beacon from CommercialAssuranceBridge's own onClick handler. The CTA
 * opens in a new tab (target="_blank"), so the current page never unloads
 * -- an ordinary fetch() is sufficient, navigator.sendBeacon's
 * unload-safety guarantee isn't needed here.
 *
 * session_id always comes from the httpOnly cookie, never the request
 * body -- the client cannot read the raw session token (see turn/route.ts's
 * own module header), so it could not supply one even if this endpoint
 * wanted it to.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logAnalyticsEvent } from '@/lib/crc-engine/analytics-events'

const COOKIE_NAME = 'crc_session'

export async function POST(_request: NextRequest) {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) {
    // Nothing to log against -- not an error, just nothing to do.
    return NextResponse.json({ status: 'ok' })
  }
  await logAnalyticsEvent(supabaseAdmin, { session_id: token, event_type: 'cta_click', event_data: { destination: 'calendly' } })
  return NextResponse.json({ status: 'ok' })
}
