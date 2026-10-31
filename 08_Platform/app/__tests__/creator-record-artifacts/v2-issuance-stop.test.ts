/**
 * CR-V2-MVP-M2 — the Creator Record v2 issuance stop.
 *
 * Every issuance path selects the renderer at one boundary (`selectCreatorRecordRenderer`):
 * payment fulfilment from the webhook, the recovery sweep and admin reconciliation (all
 * `runPaymentFulfillment` with `productionFulfillmentDeps`), and the admin generation retry.
 * A v2 submission is refused there while issuance is stopped (the default), before anything
 * is rendered, stored or issued, and a stopped run never completes fulfilment.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const counts = { artifactStatus: 0, gate: 0, issueArtifact: 0, legacy: 0, legacyHas: 0 }
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))
jest.mock('@/lib/creator-record-artifacts/store', () => ({
  artifactStatus: async () => ((counts.artifactStatus++), null),
  artifactGateDecision: async () => ((counts.gate++), 'all'),
  artifactTable: {},
  privateObjectStore: {},
  newAttemptId: () => 'attempt',
}))
jest.mock('@/lib/creator-record-artifacts/issue', () => ({ issueCreatorRecordArtifact: async () => ((counts.issueArtifact++), { outcome: 'issued', artifact: { record_id: 'CR-2026-0A1B2C3D' } }) }))
jest.mock('@/lib/payments/repository', () => {
  const actual = jest.requireActual('@/lib/payments/repository')
  return { ...actual, hasCreatorRecordPdf: async () => ((counts.legacyHas++), false), loadFulfillmentSubmission: async () => null }
})
jest.mock('@/lib/pdf/generateChainOfTitle', () => ({ generateCreatorRecordPDF: async () => ((counts.legacy++), 'https://legacy.example/x.pdf') }))
jest.mock('@/lib/emails', () => ({
  sendCreatorRecordReadyPaymentEmail: async () => ({ status: 'accepted', providerId: 'p' }),
  sendCertifiedPaymentReceivedEmail: async () => ({ status: 'accepted', providerId: 'p' }),
  notifyAdminPaymentFulfillment: async () => undefined,
  sendPaymentLedgerAdminAlert: async () => undefined,
}))

import { CREATOR_RECORD_V2_ISSUANCE } from '@/lib/creator-record-artifacts/config'
import {
  CREATOR_RECORD_V1_FAMILY, CREATOR_RECORD_V2_FAMILY, CreatorRecordIssuanceStoppedError, UnsupportedProductFamilyError,
  productFamilyFor, rendererForFamily, selectCreatorRecordRenderer,
} from '@/lib/creator-record-artifacts/renderers'
import { issueCreatorRecord, issueDepsFor, precedencePortsFor } from '@/lib/creator-record-artifacts/production'
import { runPaymentFulfillment, type FulfillmentDeps } from '@/lib/payments/run-payment-fulfillment'
import { productionFulfillmentDeps } from '@/lib/payments/fulfillment-deps'
import type { FulfillmentSubmission } from '@/lib/payments/repository'

const v2 = (over: Partial<FulfillmentSubmission> = {}): FulfillmentSubmission => ({
  id: 'sub-v2', user_id: 'u1', tier: 'creator_record', status: 'approved', title: 'V2 video', filmmaker_name: null, tools_used: null,
  authorship_statement: null, likeness_confirmation: null, ip_confirmation: null, territory_preferences: null, creator_record_product: 'v2', ...over,
})
const v1 = (): FulfillmentSubmission => ({ ...v2(), id: 'sub-v1', creator_record_product: undefined })
const reset = () => { for (const k of Object.keys(counts) as (keyof typeof counts)[]) counts[k] = 0 }

describe('the stop at the renderer-selection boundary', () => {
  test('v2 issuance is stopped by default', () => {
    expect(CREATOR_RECORD_V2_ISSUANCE).toBe('stopped')
  })

  test('only the stored marker selects v2; anything unknown fails closed; v1 is unchanged', () => {
    expect(productFamilyFor({ tier: 'creator_record' })).toBe(CREATOR_RECORD_V1_FAMILY)
    expect(productFamilyFor({ tier: 'creator_record', creator_record_product: null })).toBe(CREATOR_RECORD_V1_FAMILY)
    expect(productFamilyFor({ tier: 'creator_record', creator_record_product: 'v2' })).toBe(CREATOR_RECORD_V2_FAMILY)
    expect(productFamilyFor({ tier: 'creator_record', creator_record_product: 'v3' })).toBeNull()
    expect(productFamilyFor({ tier: 'creator_record', creator_record_product: '' })).toBeNull()
    expect(productFamilyFor({ tier: 'si8_certified', creator_record_product: 'v2' })).toBeNull()
    expect(selectCreatorRecordRenderer(v1()).family).toBe(CREATOR_RECORD_V1_FAMILY)
  })

  // CR-V2-MVP-M3: the v2 renderer is now registered, but is reachable only with the stop lifted.
  test('a v2 submission is refused as stopped; with the stop lifted only the v2 renderer (never v1, never legacy) is selected', () => {
    expect(() => selectCreatorRecordRenderer(v2())).toThrow(CreatorRecordIssuanceStoppedError)
    expect(() => selectCreatorRecordRenderer(v2())).toThrow(UnsupportedProductFamilyError)
    expect(() => rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'stopped')).toThrow(CreatorRecordIssuanceStoppedError)
    const lifted = rendererForFamily(CREATOR_RECORD_V2_FAMILY, 'enabled')
    expect(lifted.family).toBe(CREATOR_RECORD_V2_FAMILY)
    expect(lifted.legacy_path_permitted).toBe(false)
    expect(lifted.generator_version).toBe('creator-record-v2-pdf-v1')
    expect(() => rendererForFamily(null, 'enabled')).toThrow(UnsupportedProductFamilyError)
    expect(rendererForFamily(CREATOR_RECORD_V1_FAMILY, 'stopped').family).toBe(CREATOR_RECORD_V1_FAMILY)
  })

  test('the fulfilment generate step refuses before any artifact or legacy lookup', async () => {
    reset()
    await expect(issueCreatorRecord(v2(), async () => { counts.legacy++ })).rejects.toBeInstanceOf(CreatorRecordIssuanceStoppedError)
    expect(() => issueDepsFor(v2())).toThrow(CreatorRecordIssuanceStoppedError)
    await expect(precedencePortsFor(v2(), async () => undefined).issue('sub-v2')).rejects.toBeInstanceOf(CreatorRecordIssuanceStoppedError)
    expect(counts).toEqual({ artifactStatus: 0, gate: 0, issueArtifact: 0, legacy: 0, legacyHas: 0 })
  })
})

describe('a stopped issuance never completes fulfilment', () => {
  function fulfilmentDeps(sub: FulfillmentSubmission) {
    const steps: string[] = []
    const emails: string[] = []
    const prod = productionFulfillmentDeps()
    const deps: FulfillmentDeps = {
      ...prod,
      claim: async () => ({ claimed: true, claimToken: 't', reason: 'claimed', submissionId: sub.id, pdfStatus: 'pending', emailStatus: 'pending' }) as never,
      markStep: async (_s, _t, step, status) => ((steps.push(`${step}:${status}`)), true),
      finish: async (_s, _t, errorText) => (errorText ? 'failed' : 'completed'),
      loadSubmission: async () => sub,
      hasCreatorRecordPdf: async () => false,
      loadUserContact: async () => ({ name: 'Creator', email: 'creator@example.test' }),
      sendCreatorRecordEmail: async () => ((emails.push('ready')), { status: 'accepted', providerId: 'p' }),
      sendCertifiedReceivedEmail: async () => ((emails.push('certified')), { status: 'accepted', providerId: 'p' }),
      notifyAdmin: async () => undefined,
      alert: async () => undefined,
    }
    // The generate step is the production one: issueCreatorRecord over the production artifact path.
    expect(deps.generateCreatorRecordPdf).toBe(prod.generateCreatorRecordPdf)
    return { deps, steps, emails }
  }

  test('webhook, sweep and reconcile (runPaymentFulfillment) leave the PDF step pending and send no email', async () => {
    reset()
    const { deps, steps, emails } = fulfilmentDeps(v2())
    const result = await runPaymentFulfillment('cs_test_v2', deps)
    expect(result.status).not.toBe('completed')
    expect(result.reason).toMatch(/creator_record_v2_issuance_stopped/)
    expect(steps).toEqual([])
    expect(emails).toEqual([])
    expect(counts).toEqual({ artifactStatus: 0, gate: 0, issueArtifact: 0, legacy: 0, legacyHas: 0 })
  })

  test('the same run for a v1 submission still reaches the artifact path (v1 unchanged)', async () => {
    reset()
    const { deps } = fulfilmentDeps(v1())
    await runPaymentFulfillment('cs_test_v1', deps)
    expect(counts.artifactStatus + counts.gate + counts.issueArtifact).toBeGreaterThan(0)
  })
})

describe('every issuance entry point goes through the boundary', () => {
  const APP = path.resolve(__dirname, '../..')
  const src = (rel: string) => readFileSync(path.join(APP, rel), 'utf8')

  test('webhook, sweep and reconcile run fulfilment with the production deps', () => {
    for (const rel of ['app/api/webhooks/stripe/route.ts', 'app/api/internal/payment-fulfillments/sweep/route.ts', 'app/api/admin/payments/[sessionId]/reconcile/route.ts']) {
      const s = src(rel)
      expect(s).toMatch(/runPaymentFulfillment\(/)
      expect(s).toMatch(/productionFulfillmentDeps\(\)/)
    }
  })

  test('the production generate step is issueCreatorRecord, which selects the renderer first', () => {
    expect(src('lib/payments/fulfillment-deps.ts')).toMatch(/generateCreatorRecordPdf: \(sub\) => issueCreatorRecord\(sub,/)
    const prod = src('lib/creator-record-artifacts/production.ts')
    const fn = prod.slice(prod.indexOf('export async function issueCreatorRecord'))
    expect(fn.indexOf('selectCreatorRecordRenderer(sub)')).toBeGreaterThan(-1)
    expect(fn.indexOf('selectCreatorRecordRenderer(sub)')).toBeLessThan(fn.indexOf('issueCreatorRecordPdf('))
  })

  test('the admin retry route selects the renderer before any eligibility, artifact or legacy step', () => {
    const s = src('app/api/admin/submissions/[id]/generate-creator-record/route.ts')
    const select = s.indexOf('selectCreatorRecordRenderer(submission')
    expect(select).toBeGreaterThan(-1)
    for (const later of ['issuancePath(', 'issueCreatorRecordArtifact(', 'generateCreatorRecordPDF({']) expect(s.indexOf(later)).toBeGreaterThan(select)
  })
})
