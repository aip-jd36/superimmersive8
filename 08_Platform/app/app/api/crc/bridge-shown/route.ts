/**
 * POST /api/crc/bridge-shown -- Commercial Assurance bridge impression
 * tracking (CRC Identity + Abuse Prevention + Analytics milestone, JD's
 * approved addition to the design report). Fired once from
 * CommercialAssuranceBridge's own mount effect. Idempotent server-side via
 * logBridgeShownEventOnce -- the bridge can legitimately mount more than
 * once for the same session (e.g. a page refresh on an already-complete
 * session), but the funnel metric this exists for (bridge shown -> CTA
 * clicked -> Calendly -> Assessment -> revenue) needs exactly one
 * impression per session, not one per render.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logBridgeShownEventOnce } from '@/lib/crc-engine/analytics-events'

const COOKIE_NAME = 'crc_session'

export async function POST(_request: NextRequest) {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ status: 'ok' })
  }
  await logBridgeShownEventOnce(supabaseAdmin, token)
  return NextResponse.json({ status: 'ok' })
}
