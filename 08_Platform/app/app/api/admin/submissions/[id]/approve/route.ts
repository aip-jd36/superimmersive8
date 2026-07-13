import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendSubmissionApprovedEmail } from '@/lib/emails'

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

    // Parse body — hasOptIn no longer used (CATALOG DISABLED)
    await request.json().catch(() => {})

    console.log('🔍 Approving submission:', params.id)

    // For SI8 Certified, verify workbook Section 6 is signed off before approving
    const { data: submissionCheck } = await supabaseAdmin
      .from('submissions')
      .select('tier, workbook_data, risk_rating')
      .eq('id', params.id)
      .single()

    if (submissionCheck?.tier === 'si8_certified') {
      const workbookData = submissionCheck.workbook_data as any
      const workbookSignedOff = workbookData?.section_6?.signed_off === true

      if (!workbookSignedOff) {
        return NextResponse.json(
          { error: 'Reviewer workbook Section 6 must be signed off before approving an SI8 Certified submission' },
          { status: 400 }
        )
      }
    }

    // Fetch submission with user data for email
    // Use explicit foreign key (!user_id) to avoid ambiguous relationship error
    const { data: submission, error: fetchError } = await supabaseAdmin
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

    console.log('📊 Fetch result:', { found: !!submission, error: fetchError?.message })

    if (!submission) {
      console.log('❌ Submission not found')
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Update submission status to approved
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    // Send approval email notification
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    await sendSubmissionApprovedEmail(
      submission.filmmaker_name,
      submission.title,
      dashboardUrl,
      submission.user.email,
      submission.risk_rating || undefined
    )

    console.log(`Submission ${params.id} approved and email sent to ${submission.user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in approve route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
