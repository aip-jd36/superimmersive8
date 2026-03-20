import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()

  // Use getUser() instead of getSession() as recommended by Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // If logged in, redirect to dashboard
  if (!authError && user) {
    redirect('/dashboard')
  }

  // If not logged in, redirect to login page
  redirect('/auth/login')
}
