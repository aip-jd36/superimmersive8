import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect authenticated routes
  if (
    !session &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/submit') ||
      request.nextUrl.pathname.startsWith('/record') ||
      request.nextUrl.pathname.startsWith('/certify'))
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  // CRC-ACCESS-1 (2026-09-22): '/crc/:path*' and '/api/crc/:path*' removed.
  // They existed here only to carry the pilot-access-code gate (and, for
  // the API namespace, a bypass working around that gate's own Supabase
  // session-check overhead) -- neither CRC page nor CRC API paths are
  // subject to the Supabase-auth protection below (they were never in the
  // /dashboard|/submit|/record|/certify list), so once the gate is gone
  // there is no remaining reason for this middleware to run on them at
  // all. Rate limiting/abuse prevention (lib/crc-engine/abuse-prevention.ts)
  // and Results Gate are independent, route-layer mechanisms untouched by
  // this matcher and remain fully authoritative.
  matcher: ['/dashboard/:path*', '/submit/:path*', '/record/:path*', '/certify/:path*'],
}
