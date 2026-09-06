/**
 * CAH-3F -- GET the (at most one) email-correlated CRC candidate for a
 * submission the authenticated customer owns.
 *
 * MINIMAL disclosure only. Never returns CRC content. See
 * lib/crc-assurance-handoff/capabilities/email-correlation.ts. This route is
 * NOT a generic association API: it derives every authority-relevant input
 * server-side (actor from the session, verified email from the session,
 * submission from the path) and never accepts them, `crcSessionId`, or
 * `authorizationBasis` from the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { discoverEmailCorrelatedCandidate } from '@/lib/crc-assurance-handoff/capabilities/email-correlation'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ available: false, reason: 'unauthenticated' }, { status: 401 })
  }

  // The CRC email is unverified; the Assurance account email is verified via
  // Supabase's email-confirmation flow. Require both a present email and a
  // confirmed-at marker before correlating.
  const verifiedEmail = user.email ?? null
  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at)
  if (!verifiedEmail || !emailVerified) {
    return NextResponse.json({ available: false, reason: 'email_not_verified' }, { status: 403 })
  }

  const result = await discoverEmailCorrelatedCandidate({
    actorUserId: user.id,
    verifiedEmail,
    submissionId: params.id,
  })
  return NextResponse.json(result)
}
