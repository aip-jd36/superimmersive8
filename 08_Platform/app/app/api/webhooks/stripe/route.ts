import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSubmissionReceivedEmail, sendCreatorRecordApprovedEmail, sendSubmissionApprovedEmail } from '@/lib/emails'
import { generateCreatorRecordPDF } from '@/lib/pdf/generateChainOfTitle'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any

    const submissionId = session.client_reference_id || session.metadata?.submissionId

    if (!submissionId) {
      console.error('No submission ID found in session')
      return NextResponse.json({ error: 'No submission ID' }, { status: 400 })
    }

    try {
      console.log('🔷 Webhook: Processing payment for submission:', submissionId)

      const isCreatorRecord = session.metadata?.tier === 'creator_record'

      // Update submission payment status
      // Creator Record auto-approves (self-attested, no human review needed)
      // SI8 Certified goes to pending for human review queue
      const { data: submission, error: updateError } = await supabaseAdmin
        .from('submissions')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent,
          stripe_checkout_session_id: session.id,
          amount_paid: session.amount_total,
          status: isCreatorRecord ? 'approved' : 'pending',
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Webhook: Update error:', updateError)
        throw updateError
      }

      console.log('✅ Webhook: Submission payment updated successfully')

      // Get user info for email (separate query to avoid relationship ambiguity)
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', submission.user_id)
        .single()

      // Auto-generate Creator Record PDF (self-attested)
      if (isCreatorRecord) {
        console.log('📄 Webhook: Auto-generating Creator Record PDF...')
        try {
          let tools: any[] = []
          try { tools = JSON.parse(submission.tools_used as string || '[]') } catch {}

          let likenessConfirmation: Record<string, boolean> = {}
          try { likenessConfirmation = JSON.parse(submission.likeness_confirmation as string || '{}') } catch {}

          let ipConfirmation: Record<string, boolean> = {}
          try { ipConfirmation = JSON.parse(submission.ip_confirmation as string || '{}') } catch {}

          await generateCreatorRecordPDF({
            submissionId: submission.id,
            filmmakerName: submission.filmmaker_name || 'Unknown',
            title: submission.title,
            tools,
            authorshipStatement: submission.authorship_statement || undefined,
            likenessConfirmation,
            ipConfirmation,
            territory: submission.territory_preferences || submission.territory || 'Global',
          })
          console.log('✅ Webhook: Creator Record PDF generated')
        } catch (pdfError) {
          // PDF generation failure must not block webhook — creator can get PDF later
          console.error('⚠️ Webhook: Creator Record PDF generation failed (non-fatal):', pdfError)
        }
      }

      // Send confirmation email — approval email for Creator Record (auto-approved),
      // submission received email for SI8 Certified (goes to human review queue)
      if (user && submission) {
        if (isCreatorRecord) {
          await sendCreatorRecordApprovedEmail(
            user.name || 'Creator',
            submission.title,
            `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/submissions/${submission.id}`,
            user.email
          )
        } else {
          await sendSubmissionReceivedEmail(
            user.name || 'Creator',
            submission.title,
            user.email
          )
        }
        console.log('✅ Webhook: Confirmation email sent')
      }

      console.log('✅ Webhook: Processing complete for submission:', submissionId)
    } catch (error: any) {
      console.error('❌ Webhook: Error processing:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}
