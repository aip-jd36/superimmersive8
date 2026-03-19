import Stripe from 'stripe'

/**
 * STRIPE SETUP REQUIRED:
 *
 * 1. Go to https://dashboard.stripe.com (create account if needed)
 * 2. Enable test mode (toggle in top right)
 * 3. Go to Developers → API keys
 * 4. Copy:
 *    - Publishable key (pk_test_...) → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *    - Secret key (sk_test_...) → STRIPE_SECRET_KEY
 * 5. Create a product:
 *    - Dashboard → Products → Add product
 *    - Name: "AI Video Chain of Title Verification"
 *    - Price: $499 USD one-time
 *    - Copy the Price ID (price_...) → Update STRIPE_PRICE_ID below
 * 6. Set up webhook:
 *    - Developers → Webhooks → Add endpoint
 *    - URL: https://www.superimmersive8.com/api/webhooks/stripe (after deployment)
 *    - Events: checkout.session.completed
 *    - Copy webhook secret (whsec_...) → STRIPE_WEBHOOK_SECRET
 * 7. For testing locally:
 *    - Install Stripe CLI: brew install stripe/stripe-cli/stripe
 *    - Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *    - Use test card: 4242 4242 4242 4242, any future exp, any CVC
 */

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Stripe Price ID for AI Video Chain of Title Verification ($499) - Test Mode
export const VERIFICATION_PRICE_ID = 'price_1TCgphDHFv9ajBxS0Fj9f1h2'
