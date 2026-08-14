/**
 * POST /api/crc/results-gate-shown -- Results Gate impression tracking
 * (CRC Results Gate milestone, 2026-08-14, PM-approved §15/§22). Mirrors
 * /api/crc/bridge-shown exactly: fired once from the teaser+gate screen's
 * own mount effect, idempotent server-side via logResultsGateShownEventOnce
 * -- the screen can legitimately re-render on refresh, but this metric
 * needs exactly one impression per session, not one per render.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logResultsGateShownEventOnce } from '@/lib/crc-engine/analytics-events'

const COOKIE_NAME = 'crc_session'

export async function POST(_request: NextRequest) {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ status: 'ok' })
  }
  await logResultsGateShownEventOnce(supabaseAdmin, token)
  return NextResponse.json({ status: 'ok' })
}
