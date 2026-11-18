import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Fraunces, IBM_Plex_Mono } from 'next/font/google'

// SI8-APP-UX-REFRESH-1: the public website's display and monospace fonts, loaded for the dashboard area only.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' })

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const handleSignOut = async () => {
    'use server'
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  // SI8-APP-UX-REFRESH-1: `si8-app` scopes the website theme (app/globals.css) to this area. Presentation only.
  return (
    <div className={`si8-app min-h-screen ${fraunces.variable} ${plexMono.variable}`}>
      {/* Nav */}
      <nav className="border-b" style={{ backgroundColor: 'rgba(247,245,239,0.94)', borderColor: 'var(--si8-hair)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-16 items-center gap-4">

            {/* Left: logo + links */}
            <div className="flex items-center gap-8 min-w-0">
              <Link href="/dashboard" className="leading-none shrink-0">
                <span className="si8-display block text-[19px]">SuperImmersive&nbsp;8</span>
                <span className="block text-[9.5px] font-semibold uppercase mt-1" style={{ letterSpacing: '0.14em', color: 'var(--si8-faint)' }}>Commercial Assurance</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: 'var(--si8-deep)' }}
                >
                  Dashboard
                </Link>
                {/* SI8-APP-UX-FLOW-2: "Submit New" removed; new work starts from the dashboard's product cards. */}
                {/* CATALOG DISABLED: Showcase nav link hidden until catalog phase reactivated
                <Link href="/showcase" className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary" style={{ color: '#52504A' }}>
                  Showcase
                </Link>
                */}
              </div>
            </div>

            {/* Right: user + logout */}
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-sm hidden sm:block truncate" style={{ color: 'var(--si8-muted)' }}>
                {userData?.full_name || userData?.name || user.email}
              </span>
              <form action={handleSignOut}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="text-sm font-medium"
                  style={{ color: 'var(--si8-deep)' }}
                >
                  Logout
                </Button>
              </form>
            </div>

          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
