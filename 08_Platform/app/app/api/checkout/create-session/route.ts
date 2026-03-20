import { NextRequest, NextResponse } from 'next/server'
import { stripe, VERIFICATION_PRICE_ID } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { submissionId, creatorEmail } = await request.json()

    if (!submissionId || !creatorEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user is authenticated using getUser()
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AI Video Chain of Title Verification',
              description: 'Rights Verified verification service - includes Rights Package PDF after approval',
            },
            unit_amount: 49900, // $499.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/submit?payment=cancelled`,
      client_reference_id: submissionId,
      customer_email: creatorEmail,
      metadata: {
        submissionId,
      },
    })

    // Update submission with Stripe session ID
    await supabase
      .from('submissions')
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq('id', submissionId)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
