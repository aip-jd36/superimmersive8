import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    console.log('🔷 API /api/catalog GET called')

    // Fetch all opt-ins that are:
    // 1. opted_in = true
    // 2. visible = true (admin approved for catalog)
    // 3. submission is approved (filter in select using !inner)
    const { data: entries, error } = await supabaseAdmin
      .from('opt_ins')
      .select(`
        id,
        catalog_id,
        video_url,
        thumbnail_url,
        public_description,
        submission:submissions!inner (
          title,
          genre,
          filmmaker_name,
          status
        )
      `)
      .eq('opted_in', true)
      .eq('visible', true)
      .eq('submission.status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching catalog:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('✅ Fetched catalog entries:', entries?.length || 0)
    return NextResponse.json({ entries: entries || [] }, { status: 200 })
  } catch (error: any) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
