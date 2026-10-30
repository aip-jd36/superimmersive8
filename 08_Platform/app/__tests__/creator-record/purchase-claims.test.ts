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
    expect(src).toContain("if (requireReceipt && !receipt) newErrors.receipt = 'Receipt upload is required for the Commercial Assurance Assessment'")
    expect(src).toContain('required={requireReceipt}')
  })
})

describe('/record delivery claims (CR-RELEASE-READINESS-1B)', () => {
  const src = read('app/record/page.tsx')

  test('no instant, immediate or emailed-PDF promise', () => {
    expect(src).not.toMatch(/instant|immediately|automated delivery|PDF will be emailed/i)
  })

  test('the approved summary, description and delivery statement are shown', () => {
    expect(src).toContain("'Creator Record — $29 · Self-attested documentation, generated after payment'")
    expect(src).toContain('Self-attested documentation of your AI-video production. Generated after payment. Not a commercial clearance assessment.')
    expect(src).toContain('After payment, we prepare your Creator Record PDF and email you a link to access it from your dashboard. Delivery may take additional time if processing is delayed.')
  })

  test('the existing self-attestation and not-for-commercial-use disclosures remain', () => {
    expect(src).toContain('<strong>NOT for commercial use.</strong>')
    expect(src).toContain('<li><strong>Tier:</strong> Creator Record — $29 (self-attested)</li>')
  })
})

describe('portal metadata', () => {
  test('no retired Rights Verified or licensing-marketplace claim', () => {
    const src = read('app/layout.tsx')
    expect(src).toContain("title: 'SI8 Creator Portal',")
    expect(src).toContain("description: 'Create and manage your Creator Record documentation and Commercial Assurance Assessment submissions.',")
    expect(src).not.toMatch(/Rights Verified|licensing revenue/)
  })
})

describe('Commercial Assurance purchase naming', () => {
  const NAME = 'SI8 Commercial Assurance Assessment — $499'
  const certify = read('app/certify/page.tsx')
  const dashboard = read('app/dashboard/page.tsx')
  const modal = read('components/AddToolModal.tsx')

  test('the purchase page, review summary and dashboard entry links use one product name', () => {
    expect(certify.split(NAME).length - 1).toBe(2)
    expect(dashboard.split(`<Link href="/certify">${NAME}</Link>`).length - 1).toBe(2)
    expect(certify).toContain('COMMERCIAL ASSURANCE')
    expect(certify).toContain('Human review of submitted project information and supporting evidence')
    expect(certify).toContain('<strong>Commercial Assurance Assessment requirement:</strong>')
  })

  // The GA4 event label is an internal analytics identifier (never rendered); it is kept for continuity.
  const GA4_LABEL = "event_label: 'SI8 Certified $499',"

  test('no customer-facing "SI8 Certified" product name remains on these surfaces', () => {
    for (const src of [certify.replace(GA4_LABEL, ''), dashboard, modal]) expect(src).not.toMatch(/SI8 Certified|SI8 CERTIFIED/)
  })

  test('internal identifiers are unchanged', () => {
    expect(certify.match(/tier: 'si8_certified'/g)).toHaveLength(2)
    expect(certify).toContain(GA4_LABEL)
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
