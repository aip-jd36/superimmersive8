import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7' }}>
      {/* Nav */}
      <nav className="bg-white border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Left: logo + links */}
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="font-display text-lg font-bold tracking-tight"
                style={{ color: '#1a1918', letterSpacing: '-0.02em' }}
              >
                SuperImmersive <span style={{ color: '#C8900A' }}>8</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: '#52504A' }}
                >
                  Dashboard
                </Link>
                <Link
                  href="/submit"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: '#52504A' }}
                >
                  Submit New
                </Link>
                <Link
                  href="/showcase"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: '#52504A' }}
                >
                  Showcase
                </Link>
              </div>
            </div>

            {/* Right: user + logout */}
            <div className="flex items-center gap-4">
              <span className="text-sm hidden sm:block" style={{ color: '#8C8A82' }}>
                {userData?.full_name || userData?.name || user.email}
              </span>
              <form action={handleSignOut}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="text-sm font-medium"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#52504A' }}
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
