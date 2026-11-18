import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendNewUserSignupEmail } from '@/lib/emails'
import { notifyConfirmedSignup } from '@/lib/auth/signup-notification'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Redirect to next destination if provided, otherwise dashboard
  const next = requestUrl.searchParams.get('next')
  const destination = next && next.startsWith('/') ? next : '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    // CR-PUBLIC-2A-FIX: the admin notification for a newly confirmed account, from this trusted server-side event only.
    // It never affects the redirect (notifyConfirmedSignup swallows its own failures).
    if (!error && data?.user) await notifyConfirmedSignup(data.user, destination, { send: sendNewUserSignupEmail })
  }

  return NextResponse.redirect(new URL(destination, request.url))
}
