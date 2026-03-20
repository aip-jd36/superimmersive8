import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendSubmissionApprovedEmail, sendOptInConfirmationEmail } from '@/lib/emails'

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

    const { hasOptIn } = await request.json()

    // Fetch submission with user data for email
    const { data: submission } = await supabaseAdmin
      .from('submissions')
      .select(`
        *,
        user:users (
          email,
          name
        )
      `)
      .eq('id', params.id)
      .single()

    if (!submission) {
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

    // If has opt-in, generate catalog ID and set visible
    if (hasOptIn) {
      // Generate catalog ID in format SI8-2026-XXXX
      const year = new Date().getFullYear()

      // Get highest catalog ID for this year to determine next sequence number
      const { data: existingEntries } = await supabaseAdmin
        .from('opt_ins')
        .select('catalog_id')
        .like('catalog_id', `SI8-${year}-%`)
        .order('catalog_id', { ascending: false })
        .limit(1)

      let sequence = 1
      if (existingEntries && existingEntries.length > 0 && existingEntries[0].catalog_id) {
        const lastId = existingEntries[0].catalog_id
        const lastSequence = parseInt(lastId.split('-')[2])
        sequence = lastSequence + 1
      }

      const catalogId = `SI8-${year}-${sequence.toString().padStart(4, '0')}`

      // Update opt_in record
      const { error: optInError } = await supabaseAdmin
        .from('opt_ins')
        .update({
          visible: true,
          catalog_id: catalogId,
        })
        .eq('submission_id', params.id)

      if (optInError) {
        console.error('Error updating opt-in:', optInError)
        // Don't fail the whole approval if catalog update fails
      } else {
        // Send catalog opt-in confirmation email
        const catalogUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/catalog`
        await sendOptInConfirmationEmail(
          submission.filmmaker_name,
          submission.title,
          catalogUrl,
          submission.user.email
        )
      }
    }

    // Send approval email notification
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    await sendSubmissionApprovedEmail(
      submission.filmmaker_name,
      submission.title,
      dashboardUrl,
      submission.user.email
    )

    console.log(`Submission ${params.id} approved and email sent to ${submission.user.email}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in approve route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
