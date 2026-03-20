import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = createClient()

  // Use getUser() instead of getSession() as recommended by Supabase
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    console.log('🔐 requireAdmin - No authenticated user, redirecting to login')
    redirect('/auth/login')
  }

  console.log('🔐 requireAdmin - Auth user ID:', authUser.id)
  console.log('🔐 requireAdmin - Auth user email:', authUser.email)

  // Check if user is admin using service role (bypasses RLS)
  const { data: userData, error: dbError } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', authUser.id)
    .single()

  console.log('🔐 requireAdmin - userData from DB:', userData)
  console.log('🔐 requireAdmin - DB error:', dbError)
  console.log('🔐 requireAdmin - is_admin value:', userData?.is_admin)

  if (!userData?.is_admin) {
    console.log('🔐 requireAdmin - User is NOT admin, redirecting to dashboard')
    redirect('/dashboard')
  }

  console.log('🔐 requireAdmin - ✅ ADMIN ACCESS GRANTED')
  return authUser
}
