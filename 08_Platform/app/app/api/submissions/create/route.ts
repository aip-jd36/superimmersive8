import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔷 API /api/submissions/create called')

    const body = await request.json()
    const { submissionData, userId } = body

    console.log('🔷 User ID:', userId)
    console.log('🔷 Submission data keys:', Object.keys(submissionData))
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
