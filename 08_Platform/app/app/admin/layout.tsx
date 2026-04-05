import { requireAdmin } from '@/lib/auth/admin'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

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
                href="/admin"
                className="font-display text-lg font-bold tracking-tight"
                style={{ color: '#1a1918', letterSpacing: '-0.02em' }}
              >
                SuperImmersive <span style={{ color: '#C8900A' }}>8</span>
                <span
                  className="ml-2 text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                >
                  Admin
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/admin"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: '#52504A' }}
                >
                  Review Queue
                </Link>
                <Link
                  href="/admin/catalog"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: '#52504A' }}
                >
                  Catalog
                </Link>
                <Link
                  href="/admin/users"
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-secondary"
                  style={{ color: '#52504A' }}
                >
                  Users
                </Link>
              </div>
            </div>

            {/* Right: sign out */}
            <div className="flex items-center gap-4">
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-sm font-medium px-3 py-1.5 rounded-md border transition-colors hover:bg-secondary"
                  style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#52504A' }}
                >
                  Logout
                </button>
              </form>
            </div>

          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
