import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PILOT_ACCESS_COOKIE_NAME, PILOT_ACCESS_COOKIE_VALUE } from '@/lib/crc-engine/pilot-access'

export async function middleware(request: NextRequest) {
  // CRC Limited Pilot, Part 6 -- shared-code gate, checked before the
  // Supabase auth setup below since it doesn't need it at all. Exempts the
  // access page itself and its own validation route, or no one could ever
  // pass the gate.
  const pathname = request.nextUrl.pathname
  const isCrcPath = pathname.startsWith('/crc')
  const isCrcApiPath = pathname.startsWith('/api/crc')
  const isPilotAccessExempt = pathname === '/crc/access' || pathname === '/api/crc/pilot-access'

  if ((isCrcPath || isCrcApiPath) && !isPilotAccessExempt) {
    const pilotCookie = request.cookies.get(PILOT_ACCESS_COOKIE_NAME)?.value
    if (pilotCookie !== PILOT_ACCESS_COOKIE_VALUE) {
      if (isCrcApiPath) {
        return NextResponse.json({ status: 'pilot_access_required' }, { status: 401 })
      }
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/crc/access'
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // CRC API namespace bypass (P0 timeout diagnostic, 2026-08-21): reached
  // only once the pilot-access gate above has already been fully evaluated
  // -- either this path was exempt from it, or the pilot cookie matched.
  // Every /api/crc/* route reads/writes through supabaseAdmin (the
  // service-role client) exclusively; none constructs a Supabase user
  // session or depends on one. The Supabase server-client construction and
  // supabase.auth.getSession() call below exist only for the authenticated
  // application paths (/dashboard, /submit, /record, /certify) and were
  // running unconditionally for /api/crc/* too, at the cost of a real
  // network call (a session-refresh request) on an expired/near-expiry
  // Supabase cookie -- diagnosed as the likely cause of a production
  // MIDDLEWARE_INVOCATION_TIMEOUT. This short-circuit removes that
  // unnecessary work for the CRC API namespace only; /crc/:path* page
  // requests and the four protected app namespaces are untouched below.
  if (isCrcApiPath) {
    return NextResponse.next()
  }

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
  matcher: ['/dashboard/:path*', '/submit/:path*', '/record/:path*', '/certify/:path*', '/crc/:path*', '/api/crc/:path*'],
}
