/**
 * POST /api/crc/pilot-access -- validates the shared CRC pilot access
 * code server-side and, on success, issues an httpOnly cookie marking the
 * browser as pilot-approved (CRC Limited Pilot, Part 6). The raw code
 * (CRC_PILOT_ACCESS_CODE) never leaves the server -- the response and the
 * cookie both carry only a fixed marker, never the code itself.
 *
 * Deliberately exempt from the pilot-access gate in middleware.ts (see
 * that file) -- otherwise no one could ever pass the gate in the first
 * place.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PILOT_ACCESS_COOKIE_NAME, PILOT_ACCESS_COOKIE_VALUE, PILOT_ACCESS_COOKIE_MAX_AGE_SECONDS } from '@/lib/crc-engine/pilot-access'

export async function POST(request: NextRequest) {
  let body: { code?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid_request' }, { status: 400 })
  }

  const expected = process.env.CRC_PILOT_ACCESS_CODE
  if (!expected) {
    console.error('[api/crc/pilot-access] CRC_PILOT_ACCESS_CODE is not configured')
    return NextResponse.json({ status: 'invalid_code' }, { status: 403 })
  }

  if (typeof body.code !== 'string' || body.code !== expected) {
    return NextResponse.json({ status: 'invalid_code' }, { status: 403 })
  }

  const response = NextResponse.json({ status: 'ok' })
  response.cookies.set(PILOT_ACCESS_COOKIE_NAME, PILOT_ACCESS_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PILOT_ACCESS_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
