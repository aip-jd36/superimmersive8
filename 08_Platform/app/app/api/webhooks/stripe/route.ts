import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSubmissionReceivedEmail } from '@/lib/emails'

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
      // Update submission payment status
      const { data: submission, error: updateError } = await supabaseAdmin
        .from('submissions')
        .update({
          payment_status: 'paid',
          stripe_payment_intent_id: session.payment_intent,
          amount_paid: session.amount_total,
          status: 'pending', // Now ready for review
        })
        .eq('id', submissionId)
        .select('*, users(full_name, email)')
        .single()

      if (updateError) throw updateError

      // Send confirmation email
      if (submission && submission.users) {
        const user = Array.isArray(submission.users) ? submission.users[0] : submission.users
        await sendSubmissionReceivedEmail(
          user.full_name || 'Creator',
          submission.title,
          user.email
        )
      }

      console.log('Submission payment processed:', submissionId)
    } catch (error: any) {
      console.error('Error processing webhook:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}
