import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendSubmissionApprovedEmail, sendOptInConfirmationEmail } from '@/lib/emails'
import { generateChainOfTitlePDF } from '@/lib/pdf/generateChainOfTitle'

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

    console.log('🔍 Approving submission:', params.id, 'hasOptIn:', hasOptIn)

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
        // Generate Chain of Title PDF
        console.log('📄 Generating Chain of Title PDF for', catalogId)

        // Parse tools from JSONB
        let tools = []
        try {
          tools = JSON.parse(submission.tools_used as string || '[]')
        } catch (e) {
          console.error('Error parsing tools_used:', e)
          tools = []
        }

        // Parse modification rights
        const modificationRights = {
          authorized: submission.modification_authorized || false,
          scope: submission.modification_scope || undefined,
        }

        // Generate PDF
        const pdfUrl = await generateChainOfTitlePDF({
          catalogId,
          submissionId: params.id,
          filmmakerName: submission.filmmaker_name,
          title: submission.title,
          tools,
          modificationRights,
          territory: submission.territory_preferences || 'Global',
        })

        if (pdfUrl) {
          console.log('✅ Chain of Title PDF generated:', pdfUrl)
        } else {
          console.error('❌ Failed to generate Chain of Title PDF')
        }

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
