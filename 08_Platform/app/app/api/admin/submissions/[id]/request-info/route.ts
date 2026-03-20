import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendInfoRequestEmail } from '@/lib/emails'

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // Verify admin auth using getUser() + service role
    const supabase = createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status using service role (bypasses RLS)
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', authUser.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { requestedInfo } = await request.json()

    if (!requestedInfo || !requestedInfo.trim()) {
      return NextResponse.json({ error: 'Requested info text required' }, { status: 400 })
    }

    // Fetch submission with user data for email
    // Use explicit foreign key (!user_id) to avoid ambiguous relationship error
    const { data: submission } = await supabaseAdmin
      .from('submissions')
      .select(`
        *,
        user:users!user_id (
          email,
          name
        )
      `)
      .eq('id', params.id)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Update submission status to needs_info
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'needs_info',
        review_notes: requestedInfo,
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    // Send email notification requesting additional info
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    await sendInfoRequestEmail(
      submission.filmmaker_name,
      submission.title,
      requestedInfo,
      dashboardUrl,
      submission.user.email
    )

    console.log(`Info requested for submission ${params.id} and email sent to ${submission.user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in request-info route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
