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

  // Check if user is admin
  const { data: user } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', session.user.id)
    .single()

  if (!user?.is_admin) {
    redirect('/dashboard') // Non-admins go to creator dashboard
  }

  return session
}
