/**
 * CR-CERTIFIED-PATH-1B — legacy `certified` ($499) tier containment.
 *
 * New legacy purchases are blocked at three layers (form, create route, checkout route; the last two
 * are exercised behaviourally in submission-create-route / checkout-integrity). This suite pins what
 * must NOT change: historical rows stay readable and payable sessions already in flight still settle,
 * because payment recording lives in the database and the fulfilment runner, which keep `certified`.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildIntakeInsert, CREATABLE_SUBMISSION_TIERS, LEGACY_SUBMISSION_TIER, SUBMISSION_TIERS,
} from '@/lib/submissions/build-intake-insert'

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8')

describe('/record no longer offers the legacy tier', () => {
  const src = read('app/record/page.tsx')

  test('no legacy tier literal, selection, fallback or $499 offer remains', () => {
    expect(src).not.toMatch(/['"`]certified['"`]/)
    expect(src).not.toMatch(/\|\|\s*['"`]certified/)
    expect(src).not.toMatch(/\$499/)
    expect(src).not.toMatch(/\bCOTSidebar\b/)
    expect(src).toContain("useState<'creator_record' | null>(null)")
  })

  test('submit refuses anything but an explicit creator_record before calling the create route', () => {
    const guard = src.indexOf("if (selectedTier !== 'creator_record') {")
    const create = src.indexOf("fetch('/api/submissions/create'")
    expect(guard).toBeGreaterThan(-1)
    expect(create).toBeGreaterThan(guard)
    expect(src.match(/tier: selectedTier,/g)).toHaveLength(2)
  })

  test('/certify still creates the legitimate si8_certified tier, unchanged', () => {
    expect(read('app/certify/page.tsx').match(/tier: 'si8_certified'/g)).toHaveLength(2)
  })
})

describe('server-side creation rule', () => {
  test('new submissions may be creator_record or si8_certified only; certified stays a known stored tier', () => {
    expect([...CREATABLE_SUBMISSION_TIERS]).toEqual(['creator_record', 'si8_certified'])
    expect(LEGACY_SUBMISSION_TIER).toBe('certified')
    expect(SUBMISSION_TIERS).toContain('certified')
  })

  test.each([
    [{ title: 'T', tier: 'creator_record' }, true, undefined],
    [{ title: 'T', tier: 'si8_certified' }, true, undefined],
    [{ title: 'T', tier: 'certified' }, false, 'tier no longer offered'],
    [{ title: 'T' }, false, 'tier is required'],
    [{ title: 'T', tier: null }, false, 'tier is required'],
    [{ title: 'T', tier: '' }, false, 'tier is required'],
    [{ title: 'T', tier: 'platinum' }, false, 'invalid tier'],
  ])('%j → ok=%p', (data: Record<string, unknown>, ok, reason) => {
    const r = buildIntakeInsert(data, 'u1')
    expect(r.ok).toBe(ok)
    if (!r.ok) expect(r.reason).toBe(reason)
    else expect(r.row.tier).toBe(data.tier)
  })
})

describe('historical payment processing keeps the legacy tier (no schema or function change)', () => {
  const ledger = read('supabase/migrations/20261021000000_payment_fulfillments.sql')
  const zeroTotal = read('supabase/migrations/20261022000000_payment_zero_total_paid.sql')

  test('the database price authority still prices certified, so an in-flight session is not "unknown_tier"', () => {
    expect(ledger).toMatch(/WHEN 'certified'\s+THEN 49900/)
    expect(ledger).toContain("CONSTRAINT pf_tier_values CHECK (tier IS NULL OR tier IN ('creator_record', 'certified', 'si8_certified'))")
    expect(zeroTotal).toContain("v_tier  := CASE WHEN v_sub.tier IN ('creator_record', 'certified', 'si8_certified') THEN v_sub.tier END;")
  })

  test('the fulfilment runner still treats certified as a $499 received-email tier', () => {
    expect(read('lib/payments/run-payment-fulfillment.ts')).toContain("const CERTIFIED_TIERS = new Set(['certified', 'si8_certified'])")
  })

  test.each([
    'app/api/webhooks/stripe/route.ts',
    'lib/payments/run-payment-fulfillment.ts',
    'lib/payments/repository.ts',
    'app/api/admin/payments/[sessionId]/reconcile/route.ts',
    'app/api/admin/submissions/[id]/approve/route.ts',
  ])('%s does not apply the new-purchase block', (p) => {
    const src = read(p)
    expect(src).not.toMatch(/LEGACY_SUBMISSION_TIER|CREATABLE_SUBMISSION_TIERS|legacy_tier_not_offered/)
  })
})

describe('historical submissions stay readable and administrable', () => {
  const admin = read('app/admin/submissions/[id]/page.tsx')

  test('the admin detail page labels the legacy tier as legacy, never as a current SI8 Certified Assessment', () => {
    expect(admin).toContain("(submission as any).tier === 'certified' ? 'Legacy Certified — no Assessment requirement enforced' :")
    expect(admin).not.toMatch(/'creator_record' \? 'Creator Record' :\s*'SI8 Certified'/)
  })

  test('the Assessment workflow and its sign-off gate remain si8_certified-only (unchanged)', () => {
    expect(admin).toContain("const isCertified = (submission as any).tier === 'si8_certified'")
    expect(read('app/api/admin/submissions/[id]/approve/route.ts')).toContain("if (submissionCheck?.tier === 'si8_certified') {")
  })
})
