import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendSubmissionRejectedEmail } from '@/lib/emails'

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

    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
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

    // Update submission status to rejected
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'rejected',
        review_notes: reason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    // Send rejection email notification with reason
    await sendSubmissionRejectedEmail(
      submission.filmmaker_name,
      submission.title,
      reason,
      submission.user.email
    )

    console.log(`Submission ${params.id} rejected and email sent to ${submission.user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reject route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
