import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // DEBUG: Log session info
  console.log('🔐 requireAdmin - Session user ID:', session.user.id)
  console.log('🔐 requireAdmin - Session user email:', session.user.email)

  // Check if user is admin
  const { data: user, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  // DEBUG: Log query result
  console.log('🔐 requireAdmin - user data:', user)
  console.log('🔐 requireAdmin - error:', error)
  console.log('🔐 requireAdmin - is_admin value:', user?.is_admin)

  if (!user?.is_admin) {
    console.log('🔐 requireAdmin - REDIRECTING to /dashboard (not admin)')
    redirect('/dashboard') // Non-admins go to creator dashboard
  }

  console.log('🔐 requireAdmin - ADMIN ACCESS GRANTED')
  return session
}
