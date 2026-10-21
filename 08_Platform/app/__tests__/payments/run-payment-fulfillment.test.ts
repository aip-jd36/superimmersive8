/**
 * CAA-SECURITY-3B — fulfillment runner (claim → PDF → email → finish).
 * The ledger transitions themselves are proven against real PostgreSQL in
 * __tests__/db/; here an in-memory fake mirrors their contract.
 */
import { runPaymentFulfillment, type FulfillmentDeps } from '@/lib/payments/run-payment-fulfillment'
import type { ClaimResult, FulfillmentSubmission } from '@/lib/payments/repository'
import type { PaymentEmailOutcome } from '@/lib/payments/email-outcome'

type Row = { fulfillment: string; pdf: string; email: string; token: string | null; providerId?: string }

function setup(opts: {
  tier?: string; status?: string; pdf?: string; email?: string; claimReason?: string
  pdfExists?: boolean; pdfGenerates?: boolean; emailOutcome?: PaymentEmailOutcome; noSubmission?: boolean; noEmail?: boolean
} = {}) {
  const row: Row = { fulfillment: 'pending', pdf: opts.pdf ?? 'pending', email: opts.email ?? 'pending', token: null }
  let pdfExists = !!opts.pdfExists
  const sub: FulfillmentSubmission = {
    id: 'sub-1', user_id: 'user-1', tier: opts.tier ?? 'creator_record', status: opts.status ?? 'approved',
    title: 'Film', filmmaker_name: 'F', tools_used: '[]', authorship_statement: null,
    likeness_confirmation: '{}', ip_confirmation: '{}', territory_preferences: 'Global',
  }
  const calls: string[] = []
  const deps: FulfillmentDeps = {
    claim: jest.fn(async (): Promise<ClaimResult> => {
      if (opts.claimReason) return { claimed: false, claimToken: null, reason: opts.claimReason, submissionId: 'sub-1', tier: sub.tier, pdfStatus: row.pdf, emailStatus: row.email }
      row.fulfillment = 'in_progress'; row.token = 'tok'
      return { claimed: true, claimToken: 'tok', reason: 'claimed', submissionId: opts.noSubmission ? null : 'sub-1', tier: sub.tier, pdfStatus: row.pdf, emailStatus: row.email }
    }),
    markStep: jest.fn(async (_s, token, step, status, providerId) => {
      if (token !== row.token) return false
      calls.push(`${step}:${status}`)
      if (step === 'pdf') row.pdf = status
      else { if (status === 'accepted' && !providerId) return false; row.email = status; if (providerId) row.providerId = providerId }
      return true
    }),
    finish: jest.fn(async () => {
      const done = ['not_required', 'completed'].includes(row.pdf) && ['not_required', 'accepted', 'reconciled'].includes(row.email)
      row.fulfillment = done ? 'completed' : ['sending', 'unknown'].includes(row.email) ? 'needs_reconciliation' : 'failed'
      if (row.email === 'sending') row.email = 'unknown'
      row.token = null
      return row.fulfillment
    }),
    loadSubmission: jest.fn(async () => (opts.noSubmission ? null : sub)),
    hasCreatorRecordPdf: jest.fn(async () => pdfExists),
    generateCreatorRecordPdf: jest.fn(async () => { calls.push('generate'); if (opts.pdfGenerates !== false) pdfExists = true }),
    loadUserContact: jest.fn(async () => ({ name: 'Creator', email: opts.noEmail ? null : 'c@example.com' })),
    sendCreatorRecordEmail: jest.fn(async () => { calls.push('send:cr'); return opts.emailOutcome ?? ({ status: 'accepted', providerId: 're_1' } as PaymentEmailOutcome) }),
    sendCertifiedReceivedEmail: jest.fn(async () => { calls.push('send:cert'); return opts.emailOutcome ?? ({ status: 'accepted', providerId: 're_2' } as PaymentEmailOutcome) }),
    notifyAdmin: jest.fn(async () => undefined),
    alert: jest.fn(async () => undefined),
    siteUrl: 'https://app.test',
  }
  return { deps, row, calls }
}

describe('runPaymentFulfillment', () => {
  it('Creator Record: generates the PDF, then sends the email, then completes', async () => {
    const { deps, row, calls } = setup()
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('completed')
    expect(calls).toEqual(['generate', 'pdf:completed', 'email:sending', 'send:cr', 'email:accepted'])
    expect(row.providerId).toBe('re_1')
    expect(deps.notifyAdmin).toHaveBeenCalledTimes(1)
  })

  it('never regenerates an existing PDF', async () => {
    const { deps, calls } = setup({ pdfExists: true })
    await runPaymentFulfillment('cs_1', deps)
    expect(deps.generateCreatorRecordPdf).not.toHaveBeenCalled()
    expect(calls[0]).toBe('pdf:completed')
  })

  it('PDF failure: proven by evidence re-read, no email, row fails for retry', async () => {
    const { deps, row, calls } = setup({ pdfGenerates: false })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r).toMatchObject({ status: 'failed', reason: 'pdf_generation_failed' })
    expect(row.pdf).toBe('pending')
    expect(calls).not.toContain('email:sending')
  })

  it('email retry after a definite rejection does not touch the completed PDF', async () => {
    const { deps, calls } = setup({ pdf: 'completed', email: 'failed' })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('completed')
    expect(deps.generateCreatorRecordPdf).not.toHaveBeenCalled()
    expect(deps.hasCreatorRecordPdf).not.toHaveBeenCalled()
    expect(calls).toEqual(['email:sending', 'send:cr', 'email:accepted'])
  })

  it('definite rejection → failed (retryable), no alert', async () => {
    const { deps, row } = setup({ emailOutcome: { status: 'failed', code: 'rate_limit_exceeded' } })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r).toMatchObject({ status: 'failed', reason: 'email_rejected:rate_limit_exceeded' })
    expect(row.email).toBe('failed')
    expect(deps.alert).not.toHaveBeenCalled()
  })

  it('ambiguous outcome → unknown → needs_reconciliation + one alert', async () => {
    const { deps, row } = setup({ emailOutcome: { status: 'unknown', reason: 'provider_error:application_error' } })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('needs_reconciliation')
    expect(row.email).toBe('unknown')
    expect(deps.alert).toHaveBeenCalledTimes(1)
  })

  it('a DB failure after sending leaves the outcome ambiguous (never "failed")', async () => {
    const { deps, row } = setup()
    ;(deps.markStep as jest.Mock).mockImplementation(async (_s: string, _t: string, step: string, status: string) => {
      if (step === 'pdf') { row.pdf = status; return true }
      if (status === 'sending') { row.email = 'sending'; return true }
      throw new Error('db down')
    })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('needs_reconciliation')
    expect(row.email).toBe('unknown')
  })

  it('Certified: received email only, never a PDF, never an approval', async () => {
    const { deps, calls } = setup({ tier: 'si8_certified', status: 'pending', pdf: 'not_required' })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('completed')
    expect(calls).toEqual(['email:sending', 'send:cert', 'email:accepted'])
    expect(deps.generateCreatorRecordPdf).not.toHaveBeenCalled()
  })

  it.each(['rejected', 'info_requested', 'approved'])('Certified %s: received email not sent', async (status) => {
    const { deps, calls } = setup({ tier: 'si8_certified', status, pdf: 'not_required' })
    await runPaymentFulfillment('cs_1', deps)
    expect(calls).toEqual(['email:not_required'])
  })

  it('Creator Record no longer approved: no PDF, no email', async () => {
    const { deps, calls } = setup({ status: 'rejected' })
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('completed')
    expect(calls).toEqual(['pdf:not_required', 'email:not_required'])
  })

  it('deleted submission: steps become not_required; nothing is sent', async () => {
    const { deps, calls } = setup({ noSubmission: true })
    await runPaymentFulfillment('cs_1', deps)
    expect(calls).toEqual(['pdf:not_required', 'email:not_required'])
    expect(deps.sendCreatorRecordEmail).not.toHaveBeenCalled()
  })

  it('missing recipient: not sent, admin alerted', async () => {
    const { deps } = setup({ noEmail: true })
    await runPaymentFulfillment('cs_1', deps)
    expect(deps.sendCreatorRecordEmail).not.toHaveBeenCalled()
    expect(deps.alert).toHaveBeenCalledTimes(1)
  })

  it.each(['email_outcome_unknown', 'attempts_exhausted', 'retry_window_expired'])(
    'claim transition %s alerts once and does nothing else', async (reason) => {
      const { deps, calls } = setup({ claimReason: reason })
      const r = await runPaymentFulfillment('cs_1', deps)
      expect(r).toEqual({ sessionId: 'cs_1', status: 'not_claimed', reason })
      expect(deps.alert).toHaveBeenCalledTimes(1)
      expect(calls).toEqual([])
    })

  it.each(['claimed_elsewhere', 'nothing_to_do', 'needs_reconciliation', 'already_complete'])(
    'claim %s: silent no-op', async (reason) => {
      const { deps } = setup({ claimReason: reason })
      await runPaymentFulfillment('cs_1', deps)
      expect(deps.alert).not.toHaveBeenCalled()
      expect(deps.loadSubmission).not.toHaveBeenCalled()
    })

  it('a fenced write stops the run without finishing', async () => {
    const { deps } = setup()
    ;(deps.markStep as jest.Mock).mockResolvedValue(false)
    const r = await runPaymentFulfillment('cs_1', deps)
    expect(r.status).toBe('fenced')
    expect(deps.finish).not.toHaveBeenCalled()
  })
})
