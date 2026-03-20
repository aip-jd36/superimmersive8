import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user using getUser()
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 API /api/submissions GET - User ID:', user.id)

    // Fetch submissions using service role (bypasses RLS)
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Fetched submissions:', submissions?.length || 0)
    return NextResponse.json({ submissions }, { status: 200 })
  } catch (error: any) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
