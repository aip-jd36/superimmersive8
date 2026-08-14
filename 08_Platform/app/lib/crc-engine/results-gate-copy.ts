/**
 * User-facing copy for the Results Gate (email delivery model, CRC Results
 * Gate milestone, 2026-08-14, PM-revised). Pure, no React -- directly
 * unit-testable, same pattern as rate-limit-copy.ts.
 *
 * Every string here is either fixed (approved verbatim by PM) or derived
 * from a single deterministic number (consideration_count) -- nothing here
 * ever touches ProjectionOutput content itself (that's the whole point of
 * the gate: the teaser proves something was found without revealing what).
 */

/** consideration_count is knowledge_items.length -- see route.ts. */
export interface TeaserCopy {
  heading: string
  body: string
}

export function buildTeaserCopy(considerationCount: number): TeaserCopy {
  const heading = 'Your Commercial Readiness Check is ready'
  if (considerationCount === 0) {
    return {
      heading,
      body: "We'll send you a summary of what we understood and the current guidance relevant to your workflow.",
    }
  }
  const noun = considerationCount === 1 ? 'consideration' : 'considerations'
  return {
    heading,
    body: `We found ${considerationCount} commercial-readiness ${noun} based on the workflow you described.`,
  }
}

/** Fixed copy, approved verbatim -- PM revision 2026-08-14 (no "Work email"). */
export const RESULTS_GATE_COPY = {
  heading: 'Where should we send your results?',
  valueProp: "Enter an email you can access and we'll send you your complete Commercial Readiness Check.",
  fieldLabel: 'Email address',
  buttonText: 'Email my results',
  disclosure: 'SI8 may also follow up with information relevant to Commercial Assurance.',
} as const

/**
 * Fixed single-character-plus-three-dots mask, regardless of local-part
 * length -- matches the approved illustration ("j•••@company.com")
 * exactly, and as a side effect never leaks the true length of the local
 * part either. Returns the input unchanged if it doesn't contain '@' (should
 * never happen for an already-validated address, but this is a display
 * helper, not a validator -- fail safe rather than throw).
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return email
  return `${email[0]}•••${email.slice(atIndex)}`
}

export interface ConfirmationCopy {
  heading: string
  body: string
  body2: string
}

export function buildConfirmationCopy(maskedEmail: string): ConfirmationCopy {
  return {
    heading: 'Check your inbox',
    body: `We've sent your Commercial Readiness Check to ${maskedEmail}.`,
    body2: 'Your results include the findings and current guidance relevant to the workflow you described.',
  }
}

/**
 * Reasons claim_crc_result_send() (the Postgres RPC) can return for a
 * failed claim. 'already_sent' is deliberately NOT an error -- the route
 * layer treats it as "render the existing confirmation," never passes it
 * to this function.
 */
export type ResultsEmailClaimReason =
  | 'session_not_found'
  | 'distinct_recipient_limit'
  | 'send_in_progress'
  | 'cooldown'
  | 'resend_limit'
  | 'not_yet_sent'

export function getResultsEmailErrorMessage(reason: ResultsEmailClaimReason): string {
  switch (reason) {
    case 'distinct_recipient_limit':
      return "We've tried a few addresses for this Commercial Readiness Check already. Start a new Commercial Readiness Check if you'd like to try again with a different email."
    case 'resend_limit':
      return "We've already resent this a couple of times. Start a new Commercial Readiness Check if you still haven't received it."
    case 'cooldown':
      return 'Please wait a moment before requesting another resend.'
    case 'send_in_progress':
      return "We're still working on that — try again in a moment."
    case 'not_yet_sent':
    case 'session_not_found':
      return 'Something went wrong. Please try again.'
  }
}
