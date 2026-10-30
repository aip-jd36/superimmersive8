/**
 * CR-CHECKOUT-CLAIMS-1A — customer-facing claims in the Creator Record and Commercial Assurance purchase
 * workflows (the Stripe Checkout copy itself is tested behaviourally in security/checkout-integrity).
 *
 *   - The tool modal (shared by /record and /certify) makes no blanket claim about free plans, no
 *     upgrade promise, and no claim that SI8 approval governs commercial use; its data and validation
 *     are unchanged.
 *   - /record describes the Creator Record as self-attested documentation, never as SI8 verification.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8')

describe('AddToolModal', () => {
  const src = read('components/AddToolModal.tsx')

  test('no upgrade promise, no blanket free-plan restriction, no SI8-approval prerequisite', () => {
    expect(src).not.toMatch(/upgrad/i)
    expect(src).not.toMatch(/not eligible for commercial use/i)
    expect(src).not.toMatch(/required for SI8 Certified approval/i)
    expect(src).toContain('Commercial-use terms vary by provider and plan.')
  })

  test('plan values, validation and the receipt requirement are unchanged', () => {
    for (const v of ['Pro', 'Plus', 'Team', 'Enterprise', 'Standard', 'Free']) expect(src).toContain(`<option value="${v}">`)
    expect(src).toContain("if (!planType) newErrors.planType = 'Plan type is required'")
    expect(src).toContain("if (requireReceipt && !receipt) newErrors.receipt = 'Receipt upload is required for SI8 Certified'")
    expect(src).toContain('required={requireReceipt}')
  })
})

describe('/record terminology', () => {
  const src = read('app/record/page.tsx')

  test('the record-type step is not described as SI8 verification', () => {
    expect(src).not.toMatch(/Verification Tier|Which verification|verification tier/i)
    expect(src).toContain('1. Choose Your Record Type')
    expect(src).toContain('Self-attested documentation of your production *')
  })

  test('an explicit Creator Record selection is still required before intake and before submit', () => {
    expect(src.match(/setTierError\('Please select Creator Record to continue'\)/g)).toHaveLength(2)
    expect(src).toContain("onClick={() => { setSelectedTier('creator_record'); setSubmissionMode('creator') }}")
  })
})
