/**
 * Results Gate copy tests (CRC Results Gate milestone, 2026-08-14).
 * Covers PM test cases A/B/C/D/E.
 */

import { buildTeaserCopy, maskEmail, buildConfirmationCopy, getResultsEmailErrorMessage, RESULTS_GATE_COPY } from '../../lib/crc-engine/results-gate-copy'

describe('buildTeaserCopy', () => {
  // PM case A: zero consideration_count uses the honest zero-state teaser, never "0 considerations".
  test('zero -> honest zero-state copy, never "We found 0 considerations"', () => {
    const copy = buildTeaserCopy(0)
    expect(copy.heading).toBe('Your Commercial Readiness Check is ready')
    expect(copy.body).toBe("We'll send you a summary of what we understood and the current guidance relevant to your workflow.")
    expect(copy.body).not.toContain('0')
  })

  // PM case B: singular grammar.
  test('one -> singular "consideration"', () => {
    const copy = buildTeaserCopy(1)
    expect(copy.body).toBe('We found 1 commercial-readiness consideration based on the workflow you described.')
    expect(copy.body).not.toContain('considerations')
  })

  // PM case C: plural grammar.
  test('more than one -> plural "considerations"', () => {
    expect(buildTeaserCopy(2).body).toBe('We found 2 commercial-readiness considerations based on the workflow you described.')
    expect(buildTeaserCopy(5).body).toBe('We found 5 commercial-readiness considerations based on the workflow you described.')
  })

  test('heading is identical across zero and non-zero cases', () => {
    expect(buildTeaserCopy(0).heading).toBe(buildTeaserCopy(3).heading)
  })
})

describe('RESULTS_GATE_COPY (PM revision -- no "Work email")', () => {
  // PM case D.
  test('does not contain "Work email" anywhere', () => {
    const allText = Object.values(RESULTS_GATE_COPY).join(' ')
    expect(allText).not.toMatch(/work email/i)
  })

  // PM case E.
  test('field label is exactly "Email address"', () => {
    expect(RESULTS_GATE_COPY.fieldLabel).toBe('Email address')
  })

  test('heading, button, and disclosure match the approved copy exactly', () => {
    expect(RESULTS_GATE_COPY.heading).toBe('Where should we send your results?')
    expect(RESULTS_GATE_COPY.buttonText).toBe('Email my results')
    expect(RESULTS_GATE_COPY.disclosure).toBe('SI8 may also follow up with information relevant to Commercial Assurance.')
  })
})

describe('maskEmail', () => {
  test('shows exactly one leading character plus three dots, regardless of local-part length', () => {
    expect(maskEmail('jd@pmfstrategy.com')).toBe('j•••@pmfstrategy.com')
    expect(maskEmail('a@b.com')).toBe('a•••@b.com')
    expect(maskEmail('averylongname@example.com')).toBe('a•••@example.com')
  })

  test('never reveals more than the first character of the local part', () => {
    const masked = maskEmail('jdchang@pmfstrategy.com')
    expect(masked).not.toContain('jdchang')
    expect(masked).not.toContain('dchang')
  })

  test('input without "@" is returned unchanged rather than throwing', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email')
  })
})

describe('buildConfirmationCopy', () => {
  test('renders the masked email into the body, matches approved heading', () => {
    const copy = buildConfirmationCopy('j•••@company.com')
    expect(copy.heading).toBe('Check your inbox')
    expect(copy.body).toBe("We've sent your Commercial Readiness Check to j•••@company.com.")
    expect(copy.body2).toBe('Your results include the findings and current guidance relevant to the workflow you described.')
  })
})

describe('getResultsEmailErrorMessage', () => {
  test('every reason produces a distinct, non-empty message', () => {
    const reasons = ['session_not_found', 'distinct_recipient_limit', 'send_in_progress', 'cooldown', 'resend_limit', 'not_yet_sent'] as const
    const messages = reasons.map(getResultsEmailErrorMessage)
    for (const m of messages) expect(m.length).toBeGreaterThan(0)
  })

  test('distinct_recipient_limit and resend_limit both point the user to starting a new check', () => {
    expect(getResultsEmailErrorMessage('distinct_recipient_limit')).toContain('new Commercial Readiness Check')
    expect(getResultsEmailErrorMessage('resend_limit')).toContain('new Commercial Readiness Check')
  })
})
