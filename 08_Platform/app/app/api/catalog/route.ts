import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    console.log('🔷 API /api/catalog GET called')

    // Fetch all opt-ins that are:
    // 1. opted_in = true
    // 2. visible = true (admin approved for catalog)
    // 3. submission is approved
    const { data: entries, error } = await supabaseAdmin
      .from('opt_ins')
      .select(`
        id,
        catalog_id,
        video_url,
        thumbnail_url,
        public_description,
        submission:submissions (
          title,
          genre,
          filmmaker_name,
          status
        )
      `)
      .eq('opted_in', true)
      .eq('visible', true)
      .eq('submissions.status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching catalog:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Filter out entries where submission is null (shouldn't happen but safety check)
    const validEntries = entries?.filter((entry: any) => entry.submission) || []

    console.log('✅ Fetched catalog entries:', validEntries.length)
    return NextResponse.json({ entries: validEntries }, { status: 200 })
  } catch (error: any) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
