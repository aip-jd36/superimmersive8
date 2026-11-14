/**
 * CR-V2-CUTOVER-1 — Creator Record v2 is the only Creator Record a new customer can buy.
 *
 * Pins the shipped launch configuration: v1 is refused for new submissions (create route) and new
 * checkouts (checkout route; behaviour in checkout-integrity / submission-create-route), every v1 entry
 * point leads to the v2 entry point, and everything that serves EXISTING v1 records is untouched:
 * payment recording, fulfilment and its retries, the v1 renderer, and historical PDF delivery. v2 stays
 * stopped and fail-closed; an unknown product marker is never treated as v1.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { V2_DASHBOARD } from '@/lib/creator-record-flow/wording'
import { buildIntakeInsert, CREATOR_RECORD_V1_NEW_SALES, isV1CreatorRecord } from '@/lib/submissions/build-intake-insert'
import {
  CREATOR_RECORD_V1_FAMILY, CREATOR_RECORD_V2_FAMILY, CreatorRecordIssuanceStoppedError, productFamilyFor, rendererForFamily, selectCreatorRecordRenderer,
  UnsupportedProductFamilyError,
} from '@/lib/creator-record-artifacts/renderers'
import { ARTIFACT_GENERATOR_VERSION, CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import { CREATOR_RECORD_V2_SUBMISSIONS } from '@/lib/creator-record/customer-flow/approved-inputs'

jest.mock('@/lib/creator-record-flow/production', () => ({ renderCreatorRecordV2Pdf: jest.fn() }))

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8')

describe('launch configuration', () => {
  test('v1 new sales are retired; both v2 stops ship open for the controlled UAT (CR-V2-MVP-PROD-UAT-ACTIVATION-1)', () => {
    expect(CREATOR_RECORD_V1_NEW_SALES).toBe('retired')
    expect(CREATOR_RECORD_V2_SUBMISSIONS).toBe('stopped')
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('enabled')
  })

  test.each([
    [{ tier: 'creator_record', creator_record_product: null }, true],
    [{ tier: 'creator_record' }, true],
    [{ tier: 'creator_record', creator_record_product: 'v2' }, false],
    [{ tier: 'creator_record', creator_record_product: 'v3' }, false], // unknown: not v1 (fails closed elsewhere)
    [{ tier: 'creator_record', creator_record_product: '' }, false],
    [{ tier: 'si8_certified', creator_record_product: null }, false],
    [{ tier: 'certified' }, false],
  ])('isV1CreatorRecord(%j) = %p', (row, v1) => {
    expect(isV1CreatorRecord(row)).toBe(v1)
  })

  test('new v1 creation is refused; si8_certified is unaffected', () => {
    expect(buildIntakeInsert({ title: 'T', tier: 'creator_record' }, 'u')).toEqual({ ok: false, reason: 'tier no longer offered' })
    expect(buildIntakeInsert({ title: 'T', tier: 'si8_certified' }, 'u').ok).toBe(true)
    expect(buildIntakeInsert({ title: 'T', tier: 'creator_record' }, 'u', 'open').ok).toBe(true) // rollback lever only
  })
})

describe('v1 entry points lead to the v2 entry point', () => {
  test('/record (and /submit, which redirects to it) redirects to /creator-record while v1 is retired', () => {
    const layout = read('app/record/layout.tsx')
    expect(layout).toContain("if (CREATOR_RECORD_V1_NEW_SALES !== 'open') redirect('/creator-record')")
    expect(read('app/submit/page.tsx')).toContain("redirect('/record')")
  })

  test('the dashboard offers Creator Record only through /creator-record, without the v1 price', () => {
    const page = read('app/dashboard/page.tsx')
    // CR-V2-APPROVAL-AUTHORITY-FIX-1: the label lives in the customer wording set.
    expect(page).toContain("{ href: '/creator-record', label: V2_DASHBOARD.entry_label }")
    expect(V2_DASHBOARD.entry_label).toBe('Creator Record')
    expect(page).not.toMatch(/<Link href="\/record">/)
    expect(read('app/dashboard/layout.tsx')).toContain("href={CREATOR_RECORD_V1_NEW_SALES === 'open' ? '/record' : '/creator-record'}")
  })

  test('sign-up never sends a new customer to the v1 form or shows it as the product', () => {
    expect(read('app/auth/signup/page.tsx')).toContain("setNextPath(next === '/record' && CREATOR_RECORD_V1_NEW_SALES !== 'open' ? '/creator-record' : next)")
  })
})

describe('existing v1 records are served unchanged', () => {
  test('a paid v1 submission still resolves to the v1 renderer on every issuance path (webhook, sweep, reconcile, retry)', () => {
    const r = selectCreatorRecordRenderer({ tier: 'creator_record', creator_record_product: null })
    expect(r.family).toBe(CREATOR_RECORD_V1_FAMILY)
    expect(r.generator_version).toBe(ARTIFACT_GENERATOR_VERSION)
    expect(r.ownsGeneratorVersion('legacy-creator-record-pdf-v1')).toBe(true)
  })

  test('no payment, fulfilment, retry, reconciliation or delivery path reads the cutover setting', () => {
    for (const f of [
      'app/api/webhooks/stripe/route.ts',
      'lib/payments/run-payment-fulfillment.ts',
      'app/api/internal/payment-fulfillments/sweep/route.ts',
      'app/api/admin/payments/[sessionId]/reconcile/route.ts',
      'app/api/admin/submissions/[id]/generate-creator-record/route.ts',
      'app/api/creator-record/[id]/pdf/route.ts',
      'lib/creator-record-artifacts/deliver.ts',
      'lib/creator-record-artifacts/renderers.ts',
    ]) {
      expect(read(f)).not.toMatch(/CREATOR_RECORD_V1_NEW_SALES|isV1CreatorRecord/)
    }
  })

  test('historical v1 PDFs: delivery still reads private artifacts and the legacy documents bucket', () => {
    const route = read('app/api/creator-record/[id]/pdf/route.ts')
    expect(route).toContain("const LEGACY_DOCUMENTS_BUCKET = 'documents'")
    expect(route).toContain('findArtifact: (submissionId) => artifactTable.find(submissionId)')
    expect(route).toContain(".from('rights_packages').select('submission_id, document_path, document_url')")
  })

  test('the database still prices creator_record, so a v1 session opened before the cutover settles', () => {
    expect(read('supabase/migrations/20261021000000_payment_fulfillments.sql')).toMatch(/WHEN 'creator_record'\s+THEN 2900/)
  })
})

describe('v2 never falls back to v1', () => {
  test('a v2 submission is refused while issuance is stopped, never given the v1 renderer', () => {
    expect(productFamilyFor({ tier: 'creator_record', creator_record_product: 'v2' })).toBe(CREATOR_RECORD_V2_FAMILY)
    expect(() => rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'stopped')).toThrow(CreatorRecordIssuanceStoppedError) // CR-V2-MVP-PROD-UAT-ACTIVATION-1: the stop, explicitly
    expect(selectCreatorRecordRenderer({ tier: 'creator_record', creator_record_product: 'v2' }).family).toBe(CREATOR_RECORD_V2_FAMILY)
  })

  test('when enabled, the v2 renderer permits no legacy path and owns no v1 version', () => {
    const v2 = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
    expect(v2.legacy_path_permitted).toBe(false)
    expect(v2.ownsGeneratorVersion(ARTIFACT_GENERATOR_VERSION)).toBe(false)
  })

  test.each(['v3', '', 'V2', 'v1'])('unknown marker %p fails closed (no renderer, no v1 default)', (marker) => {
    expect(() => selectCreatorRecordRenderer({ tier: 'creator_record', creator_record_product: marker })).toThrow(UnsupportedProductFamilyError)
  })
})
