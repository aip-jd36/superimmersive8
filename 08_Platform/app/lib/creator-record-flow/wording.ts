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
  preparing: 'Payment received. Your Creator Record PDF is being prepared. If it is not ready soon, contact us at jd@superimmersive8.com: your payment is recorded and nothing more is charged.',
  // CR-V2-MVP-LAUNCH-FOUNDATION-1: a paid order waiting for a person (any reason), and a record paused by withdrawn AI permission.
  support_required: 'We need to look at this Creator Record before it can be completed, and we will contact you. Your payment is recorded and nothing more is charged. You can also email jd@superimmersive8.com.',
  paused: 'This record is paused because you withdrew permission for AI examination of a document it uses. It cannot be paid for or completed as it is. Email jd@superimmersive8.com to discuss your options.',
  badge_support_required: 'NEEDS ATTENTION',
  badge_paused: 'PAUSED',
  ready: 'Your Creator Record PDF is ready.',
  unavailable: 'The status of your Creator Record could not be shown right now. Please try again later.',
  download: 'Download Creator Record PDF',
  nature: 'A self-declared record of what you told us, with educational guidance. Not legal advice, a clearance or a human-reviewed SI8 assessment.',
  badge_awaiting_payment: 'AWAITING PAYMENT',
  badge_preparing: 'BEING PREPARED',
  badge_ready: 'READY',
  refunded: 'This purchase was refunded.',
} as const

/** CR-V2-MVP-LAUNCH-FOUNDATION-1: the dashboard control for withdrawing AI-examination permission (Decision 8Q / 8N). */
export const V2_CONSENT = {
  title: 'AI examination permission',
  active: 'You can withdraw permission for AI examination of the documents you have added. After you withdraw, no AI model reads those documents again, and records that use them are paused. This does not delete your documents; you can ask for deletion separately.',
  withdraw: 'Withdraw AI examination permission',
  confirm_prompt: 'Withdraw now? This cannot be undone for the documents you have already added.',
  confirm: 'Yes, withdraw',
  cancel: 'Keep permission',
  working: 'Withdrawing…',
  withdrawn: 'You withdrew permission for AI examination. No AI model reads the documents you added before then, and records that use them are paused. Email jd@superimmersive8.com about any paid order.',
  withdrawn_on: 'Withdrawn on',
  failed: 'Your request could not be completed. Nothing was changed. Please try again.',
} as const

export const V2_REVIEW_PAGE = {
  pay: 'Continue to payment',
  paying: 'Opening payment…',
  payment_closed: 'You confirmed these declarations. This version is now fixed. Payment is not open yet.',
  confirmed: 'You confirmed these declarations. This version is now fixed.',
} as const
