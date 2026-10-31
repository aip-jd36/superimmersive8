/**
 * CR-V2-MVP-M3 — Creator Record v2 customer wording for checkout, the ready email and the dashboard.
 *
 * DRAFT — PENDING M0 WORDING APPROVAL. Not approved customer wording. Every string a v2 customer sees
 * outside the questionnaire and the PDF is here, so the M0 review can replace it in one place.
 *
 * Rules (test-enforced, `__tests__/creator-record-flow/v2-wording.test.ts`): self-declared and
 * educational; never legal advice, clearance, certification, verification, approval or a human review;
 * never a review date; never "safe to use".
 */

export const V2_WORDING_STATUS = 'DRAFT — pending M0 wording approval' as const

export const V2_CHECKOUT_COPY = {
  name: 'Creator Record — Self-Declared Record',
  description: 'A PDF record of what you told us about your AI video, with educational guidance. Not legal advice, a clearance or a human-reviewed SI8 assessment.',
} as const

export const V2_READY_EMAIL = {
  subject: 'Your Creator Record is ready',
  intro: 'Your Creator Record PDF is ready to download from your dashboard.',
  nature: 'It records what you told us about your video, with educational guidance where SI8 has published it. SI8 did not check your answers or review your video or documents.',
  limits: 'It is not legal advice, a commercial clearance or a human-reviewed SI8 Commercial Assurance Assessment.',
  cta: 'Download your Creator Record',
} as const

export const V2_DASHBOARD = {
  heading: 'Creator Record',
  awaiting_payment: 'Your declarations are confirmed. Complete payment to receive your Creator Record.',
  preparing: 'Payment received. Your Creator Record PDF is being prepared. If it is not ready soon, contact us: your payment is recorded and nothing more is charged.',
  ready: 'Your Creator Record PDF is ready.',
  unavailable: 'The status of your Creator Record could not be shown right now. Please try again later.',
  download: 'Download Creator Record PDF',
  nature: 'A self-declared record of what you told us, with educational guidance. Not legal advice, a clearance or a human-reviewed SI8 assessment.',
  badge_awaiting_payment: 'AWAITING PAYMENT',
  badge_preparing: 'BEING PREPARED',
  badge_ready: 'READY',
  refunded: 'This purchase was refunded.',
} as const

export const V2_REVIEW_PAGE = {
  pay: 'Continue to payment',
  paying: 'Opening payment…',
  payment_closed: 'You confirmed these declarations. This version is now fixed. Payment is not open yet.',
  confirmed: 'You confirmed these declarations. This version is now fixed.',
} as const
