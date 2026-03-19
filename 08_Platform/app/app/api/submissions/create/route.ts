import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Verify service role key is set
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set!')
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔷 API /api/submissions/create called')

    const body = await request.json()
    const { submissionData, userId, catalogData } = body

    console.log('🔷 User ID:', userId)
    console.log('🔷 Submission data keys:', Object.keys(submissionData))
    console.log('🔷 Catalog opt-in:', catalogData?.catalog_opt_in || false)
    console.log('🔷 Using service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO')

    // Verify the user is authenticated
    if (!userId) {
      console.log('❌ No userId provided')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Insert submission using service role (bypasses RLS)
    console.log('🔷 Attempting to insert submission...')
    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .insert(submissionData)
      .select()
      .single()

    if (error) {
      console.error('❌ Submission insert error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 }
      )
    }

    console.log('✅ Submission created successfully:', submission.id)

    // If catalog opt-in is true, create opt_in record
    if (catalogData && catalogData.catalog_opt_in) {
      console.log('🔷 Creating catalog opt-in record...')

      const optInData = {
        submission_id: submission.id,
        opted_in: true,
        video_url: catalogData.video_url,
        thumbnail_url: catalogData.thumbnail_url || null,
        public_description: catalogData.public_description || submissionData.logline || null,
        visible: false, // Admin must approve before it's visible in catalog
      }

      const { data: optIn, error: optInError } = await supabaseAdmin
        .from('opt_ins')
        .insert(optInData)
        .select()
        .single()

      if (optInError) {
        console.error('⚠️ Opt-in creation failed:', optInError)
        // Don't fail the whole submission if opt-in fails
      } else {
        console.log('✅ Catalog opt-in created:', optIn.id)
      }
    }

    return NextResponse.json({ submission }, { status: 200 })
  } catch (error: any) {
    console.error('❌ API error:', error)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
