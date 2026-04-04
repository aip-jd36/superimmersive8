import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to next destination if provided, otherwise dashboard
  const next = requestUrl.searchParams.get('next')
  const destination = next && next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(new URL(destination, request.url))
}
