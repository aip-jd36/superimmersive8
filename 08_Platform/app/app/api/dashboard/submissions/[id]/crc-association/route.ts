/**
 * CAH-3F -- POST an explicit, deliberate request to associate the (single,
 * safely identifiable) email-correlated CRC candidate with a submission the
 * authenticated customer owns.
 *
 * The act means ONLY: "Associate this candidate CRC with this Assurance
 * submission." It does NOT mean "I personally ran this CRC" or "everything in
 * this CRC remains true" -- the client is never asked to attest either.
 *
 * All authority-relevant inputs are server-derived. The client body carries at
 * most `{ confirm: true, candidateHandle }`. The capability fully revalidates
 * correlation + eligibility + the V1 cross-submission rule, then invokes the
 * generic NON-AUTHORIZING core with a FIXED authorization basis.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { associateEmailCorrelatedCandidate } from '@/lib/crc-assurance-handoff/capabilities/email-correlation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ ok: false, code: 'unauthenticated' }, { status: 401 })
  }

  const verifiedEmail = user.email ?? null
  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at)
  if (!verifiedEmail || !emailVerified) {
    return NextResponse.json({ ok: false, code: 'email_not_verified' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { confirm?: unknown; candidateHandle?: unknown } | null
  const candidateHandle = typeof body?.candidateHandle === 'string' ? body.candidateHandle : ''
  const explicitlyConfirmed = body?.confirm === true
  if (!explicitlyConfirmed || candidateHandle.length === 0) {
    return NextResponse.json({ ok: false, code: 'confirmation_required' }, { status: 400 })
  }

  const result = await associateEmailCorrelatedCandidate({
    actorUserId: user.id,
    verifiedEmail,
    submissionId: params.id,
    candidateHandle,
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
