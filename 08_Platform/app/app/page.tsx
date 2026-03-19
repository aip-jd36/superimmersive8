import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If logged in, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // If not logged in, redirect to login page
  redirect('/auth/login')
}
