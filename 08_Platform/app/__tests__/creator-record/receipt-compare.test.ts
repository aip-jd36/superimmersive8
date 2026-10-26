/**
 * PRODUCT-A-MVP-SPIKE-1A / SPIKE-1D — deterministic comparison rules. The
 * central invariant: 'consistent' only when every input is present and
 * unambiguous, and (v2) when no other listed plan observation conflicts.
 */

import {
  compareExtractionToDeclared,
  comparePlan,
  compareProvider,
  compareServicePeriodCoverage,
  compareTransactionChronology,
  COMPARISON_RULES_VERSION,
  distinctPlanObservations,
  MERCHANT_ALIASES,
  resolveIdentity,
  type DeclaredTool,
} from '@/lib/creator-record/receipt-examination/compare'
import type { ExtractedField, PlanCandidate, PlanCandidateContext, ReceiptExtraction } from '@/lib/creator-record/receipt-examination/schema'

const P = (value: string): ExtractedField => ({ status: 'present', value, evidence: value })
const N: ExtractedField = { status: 'not_shown', value: null, evidence: null }
const U: ExtractedField = { status: 'unreadable', value: null, evidence: null }
const A: ExtractedField = { status: 'ambiguous', value: null, evidence: null }

const cand = (text: string, context: PlanCandidateContext = 'charge_line', evidence = text): PlanCandidate => ({ text, evidence, context })

/** Unless candidates are given, a well-behaved v2 extraction lists exactly the selected plan (or nothing). */
function ex(over: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  const plan = over.product_or_plan_name ?? P('Runway Standard Plan (Monthly)')
  return {
    document_type: 'invoice',
    readability: 'legible',
    issuer_name: P('Runway AI, Inc.'),
    product_or_plan_name: plan,
    transaction_date: P('2026-03-03'),
    service_period_start: P('2026-03-03'),
    service_period_end: P('2026-04-02'),
    plan_candidates: plan.status === 'present' ? [cand(plan.value!)] : [],
    multiple_plans_shown: false,
    instruction_like_text_present: false,
    ...over,
  }
}

const declared: DeclaredTool = { tool_name: 'Runway Gen-3', plan_type: 'Standard', start_date: '2026-03-10', end_date: '2026-03-28' }

describe('provider identity', () => {
  test('reuses canonical tool identity; legal suffixes and trailing "AI"/"Labs" are generic cleanup', () => {
    expect(resolveIdentity('Runway AI, Inc.')).toEqual({ status: 'resolved', id: 'runway-gen3' })
    expect(resolveIdentity('Runway Gen-3')).toEqual({ status: 'resolved', id: 'runway-gen3' })
    expect(resolveIdentity('Pika Labs, Inc.')).toEqual({ status: 'resolved', id: 'pika' })
    expect(resolveIdentity('ElevenLabs Inc.')).toEqual({ status: 'resolved', id: 'elevenlabs' })
    expect(resolveIdentity('Midjourney Video')).toEqual({ status: 'resolved', id: 'midjourney' })
  })

  test('no provider-specific alias table is needed for the fixture set', () => {
    expect(Object.keys(MERCHANT_ALIASES)).toHaveLength(0)
  })

  test('same provider -> consistent; different known provider -> differs', () => {
    expect(compareProvider(ex(), declared)).toEqual({ result: 'consistent', reason: 'same_canonical_identity' })
    expect(compareProvider(ex({ issuer_name: P('ElevenLabs Inc.') }), declared).result).toBe('differs')
  })

  test('a look-alike name is never consistent', () => {
    expect(compareProvider(ex({ issuer_name: P('Runway Financial Services LLC') }), declared)).toEqual({
      result: 'unresolved',
      reason: 'issuer_not_recognized',
    })
  })

  test('a reseller / merchant of record is unresolved, not differs', () => {
    expect(compareProvider(ex({ issuer_name: P('ResellerHub Payments Ltd') }), { ...declared, tool_name: 'Pika' }).result).toBe('unresolved')
  })

  test('unrecognized declared tool is consistent only on literal name equality', () => {
    const d = { ...declared, tool_name: 'Acme Motion' }
    expect(compareProvider(ex({ issuer_name: P('Acme Motion Inc.') }), d)).toEqual({ result: 'consistent', reason: 'same_normalized_name' })
    expect(compareProvider(ex({ issuer_name: P('Acme Motion Studios Group') }), d).result).toBe('unresolved')
  })

  test('issuer not shown / unreadable / ambiguous never resolves to consistent', () => {
    expect(compareProvider(ex({ issuer_name: N }), declared).result).toBe('not_shown')
    expect(compareProvider(ex({ issuer_name: U }), declared).result).toBe('unresolved')
    expect(compareProvider(ex({ issuer_name: A }), declared).result).toBe('unresolved')
    expect(compareProvider(ex(), { ...declared, tool_name: null }).result).toBe('unresolved')
  })
})

describe('plan', () => {
  test('filler words, parentheticals and provider tokens are ignored', () => {
    expect(comparePlan(ex(), declared)).toEqual({ result: 'consistent', reason: 'plan_tokens_equal' })
    expect(comparePlan(ex({ issuer_name: P('Kling AI'), product_or_plan_name: P('Kling AI Pro') }), { ...declared, tool_name: 'Kling AI', plan_type: 'Pro' }).result).toBe('consistent')
  })

  test('different plan -> differs', () => {
    expect(comparePlan(ex(), { ...declared, plan_type: 'Pro' }).result).toBe('differs')
  })

  test('multiple plans shown -> unresolved even when a value is present', () => {
    expect(comparePlan(ex({ multiple_plans_shown: true }), declared)).toEqual({ result: 'unresolved', reason: 'multiple_plans_shown' })
  })

  test('a generic line such as "Subscription" is not a plan', () => {
    expect(comparePlan(ex({ product_or_plan_name: P('Subscription') }), declared)).toEqual({ result: 'unresolved', reason: 'plan_not_identifiable' })
  })

  test('missing values', () => {
    expect(comparePlan(ex({ product_or_plan_name: N }), declared).result).toBe('not_shown')
    expect(comparePlan(ex(), { ...declared, plan_type: '' }).result).toBe('unresolved')
  })
})

describe('transaction chronology vs service-period coverage are separate', () => {
  test('a payment before production is chronology-consistent but is not coverage', () => {
    const noPeriod = ex({ service_period_start: N, service_period_end: N })
    expect(compareTransactionChronology(noPeriod, declared)).toEqual({ result: 'consistent', reason: 'transaction_on_or_before_start' })
    expect(compareServicePeriodCoverage(noPeriod, declared)).toEqual({ result: 'not_shown', reason: 'period_not_shown' })
  })

  test('payment after the declared start -> chronology differs', () => {
    expect(compareTransactionChronology(ex({ transaction_date: P('2026-03-11') }), declared).result).toBe('differs')
  })

  test('coverage requires the explicit period to span the whole declared window', () => {
    expect(compareServicePeriodCoverage(ex(), declared).result).toBe('consistent')
    expect(compareServicePeriodCoverage(ex(), { ...declared, end_date: '2026-04-20' }).result).toBe('differs')
    expect(compareServicePeriodCoverage(ex(), { ...declared, start_date: '2026-03-01' }).result).toBe('differs')
  })

  test('incomplete, ambiguous or invalid periods are unresolved', () => {
    expect(compareServicePeriodCoverage(ex({ service_period_end: N }), declared)).toEqual({ result: 'unresolved', reason: 'period_incomplete' })
    expect(compareServicePeriodCoverage(ex({ service_period_end: A }), declared).result).toBe('unresolved')
    expect(compareServicePeriodCoverage(ex({ service_period_start: P('2026-05-01') }), declared)).toEqual({ result: 'unresolved', reason: 'period_invalid' })
  })

  test('missing or invalid declared dates are unresolved', () => {
    expect(compareTransactionChronology(ex(), { ...declared, start_date: null }).result).toBe('unresolved')
    expect(compareTransactionChronology(ex(), { ...declared, start_date: '10/03/2026' })).toEqual({ result: 'unresolved', reason: 'declared_value_invalid' })
    expect(compareServicePeriodCoverage(ex(), { ...declared, end_date: null }).result).toBe('unresolved')
  })

  test('ambiguous transaction date is unresolved', () => {
    expect(compareTransactionChronology(ex({ transaction_date: A }), declared)).toEqual({ result: 'unresolved', reason: 'field_ambiguous' })
  })
})

describe('document gates', () => {
  test('non-billing documents produce no field comparisons', () => {
    const r = compareExtractionToDeclared(ex({ document_type: 'not_a_billing_document' }), declared)
    for (const v of Object.values(r)) expect(v).toEqual({ result: 'not_shown', reason: 'document_not_billing' })
  })

  test('illegible and unknown documents are unresolved', () => {
    for (const v of Object.values(compareExtractionToDeclared(ex({ readability: 'illegible' }), declared))) expect(v.result).toBe('unresolved')
    for (const v of Object.values(compareExtractionToDeclared(ex({ document_type: 'unknown' }), declared))) expect(v.result).toBe('unresolved')
  })

  test('instruction-like text never changes a comparison', () => {
    expect(compareExtractionToDeclared(ex({ instruction_like_text_present: true }), declared)).toEqual(compareExtractionToDeclared(ex(), declared))
  })
})

describe('no unsupported consistent conclusion (exhaustive over field states)', () => {
  const states: ExtractedField[] = [N, U, A]
  test.each(['issuer_name', 'product_or_plan_name', 'transaction_date', 'service_period_start', 'service_period_end'] as const)(
    'when %s is not present, the comparisons that depend on it are never consistent',
    (field) => {
      const dependsOn: Record<string, string[]> = {
        issuer_name: ['provider'],
        product_or_plan_name: ['plan'],
        transaction_date: ['transaction_chronology'],
        service_period_start: ['service_period_coverage'],
        service_period_end: ['service_period_coverage'],
      }
      for (const s of states) {
        const r = compareExtractionToDeclared(ex({ [field]: s }), declared) as unknown as Record<string, { result: string }>
        for (const key of dependsOn[field]) expect(r[key].result).not.toBe('consistent')
      }
    },
  )
})

describe('v2 plan candidates (SPIKE-1D)', () => {
  const pro: DeclaredTool = { ...declared, plan_type: 'Pro' }
  const providers = [declared.tool_name, 'Runway AI, Inc.']

  test('comparison contract is versioned', () => {
    expect(COMPARISON_RULES_VERSION).toBe('receipt-comparison-v2')
  })

  test('SPIKE-1C false consistent: title "Standard" + charge line "Pro Plan (Monthly)" is unresolved once both are listed', () => {
    // The exact SPIKE-1C model output, except that the v2 contract lists both observations.
    const spike1c = ex({
      product_or_plan_name: P('Pro Plan (Monthly)'),
      plan_candidates: [cand('Standard', 'heading_or_title', 'Standard subscription receipt'), cand('Pro Plan (Monthly)')],
      multiple_plans_shown: false,
    })
    expect(comparePlan(spike1c, pro)).toEqual({ result: 'unresolved', reason: 'plan_candidates_conflict' })
    // ...whichever observation the model selected, and whichever plan was declared.
    expect(comparePlan({ ...spike1c, product_or_plan_name: P('Standard') }, declared).result).toBe('unresolved')
    expect(comparePlan(spike1c, declared).result).toBe('unresolved')
  })

  test('the conflict rule does not depend on multiple_plans_shown', () => {
    const conflicting = ex({ product_or_plan_name: P('Pro plan'), plan_candidates: [cand('Standard', 'current_plan_label'), cand('Pro plan')] })
    expect(conflicting.multiple_plans_shown).toBe(false)
    expect(comparePlan(conflicting, pro).result).toBe('unresolved')
  })

  test('multiple_plans_shown still gates on its own', () => {
    expect(comparePlan(ex({ multiple_plans_shown: true }), declared)).toEqual({ result: 'unresolved', reason: 'multiple_plans_shown' })
  })

  test('repeated equivalent descriptions of one plan are not a conflict', () => {
    const repeated = ex({
      product_or_plan_name: P('Pro Plan (Monthly)'),
      plan_candidates: [cand('Pro Plan receipt', 'heading_or_title'), cand('Pro Plan (Monthly)'), cand('Runway Pro', 'other'), cand('PRO plan', 'account_detail')],
    })
    expect(distinctPlanObservations(repeated, providers)).toEqual(['pro'])
    expect(comparePlan(repeated, pro)).toEqual({ result: 'consistent', reason: 'plan_tokens_equal' })
    expect(comparePlan(repeated, declared).result).toBe('differs')
  })

  test('"Current plan: Standard" and a "Standard plan" row are the same plan', () => {
    const e = ex({ issuer_name: P('Runway'), product_or_plan_name: P('Standard'), plan_candidates: [cand('Standard', 'current_plan_label'), cand('Standard plan')] })
    expect(comparePlan(e, declared).result).toBe('consistent')
  })

  test('billing history with a plan change is unresolved', () => {
    const history = ex({
      issuer_name: P('Kling AI'),
      product_or_plan_name: P('Pro'),
      plan_candidates: [cand('Pro', 'current_plan_label'), cand('Standard Plan'), cand('Pro Plan'), cand('Pro Plan')],
    })
    expect(comparePlan(history, { ...pro, tool_name: 'Kling AI' })).toEqual({ result: 'unresolved', reason: 'plan_candidates_conflict' })
  })

  test('no subset or prefix equivalence: "Standard" vs "Standard Plus" are distinct', () => {
    const e = ex({ product_or_plan_name: P('Standard'), plan_candidates: [cand('Standard'), cand('Standard Plus', 'account_detail')] })
    expect(comparePlan(e, declared).result).toBe('unresolved')
  })

  test('an ambiguous or unreadable plan reference stays unresolved', () => {
    expect(comparePlan(ex({ product_or_plan_name: A, plan_candidates: [cand('Pro Pl…')] }), pro).result).toBe('unresolved')
    expect(comparePlan(ex({ product_or_plan_name: A, plan_candidates: [] }), pro).result).toBe('unresolved')
    expect(comparePlan(ex({ product_or_plan_name: U, plan_candidates: [] }), pro).result).toBe('unresolved')
  })

  test('a selected plan with no matching listed observation is unresolved, never consistent', () => {
    expect(comparePlan(ex({ plan_candidates: [] }), declared)).toEqual({ result: 'unresolved', reason: 'plan_candidates_missing' })
    expect(comparePlan(ex({ plan_candidates: [cand('Subscription')] }), declared)).toEqual({ result: 'unresolved', reason: 'plan_candidates_missing' })
  })

  test('a listed plan with no selected plan is unresolved, never not_shown', () => {
    expect(comparePlan(ex({ product_or_plan_name: N, plan_candidates: [cand('Pro')] }), pro)).toEqual({ result: 'unresolved', reason: 'plan_candidates_inconsistent' })
    expect(comparePlan(ex({ product_or_plan_name: N, plan_candidates: [cand('Subscription')] }), pro).result).toBe('not_shown')
    expect(comparePlan(ex({ product_or_plan_name: N, plan_candidates: [] }), pro).result).toBe('not_shown')
  })

  test('non-identifying candidates ("Subscription") do not create a conflict', () => {
    const e = ex({ product_or_plan_name: P('Pro Plan'), plan_candidates: [cand('Subscription', 'heading_or_title'), cand('Pro Plan')] })
    expect(comparePlan(e, pro).result).toBe('consistent')
  })

  test('candidate context never discards an observation', () => {
    for (const context of ['heading_or_title', 'current_plan_label', 'charge_line', 'account_detail', 'other'] as const) {
      const e = ex({ product_or_plan_name: P('Pro Plan'), plan_candidates: [cand('Pro Plan'), cand('Enterprise', context)] })
      expect(comparePlan(e, pro).result).toBe('unresolved')
    }
  })

  test('document gates still come first', () => {
    const conflicting = { plan_candidates: [cand('Standard'), cand('Pro')] }
    expect(comparePlan(ex({ ...conflicting, document_type: 'not_a_billing_document' }), pro).result).toBe('not_shown')
    expect(comparePlan(ex({ ...conflicting, readability: 'illegible' }), pro).result).toBe('unresolved')
  })

  test('KNOWN LIMITATION: a plan name the model never lists cannot be detected by these rules', () => {
    // SPIKE-1C shape with the title omitted from the candidates: the rules see
    // one plan and return consistent. Candidate extraction narrows, but does not
    // remove, the dependency on the model reporting every observation.
    const omitted = ex({ product_or_plan_name: P('Pro Plan (Monthly)'), plan_candidates: [cand('Pro Plan (Monthly)')] })
    expect(comparePlan(omitted, pro).result).toBe('consistent')
  })

  test('exhaustive: with two distinct identifying observations, plan is never consistent', () => {
    const names = ['Standard', 'Pro', 'Pro Plan (Monthly)', 'Unlimited', 'Standard Plus', 'Creator']
    const selections: ExtractedField[] = [N, U, A, ...names.map(P)]
    let checked = 0
    for (const a of names) {
      for (const b of names) {
        if (distinctPlanObservations(ex({ product_or_plan_name: N, plan_candidates: [cand(a), cand(b)] }), providers).length < 2) continue
        for (const sel of selections) {
          for (const plan_type of names) {
            const e = ex({ product_or_plan_name: sel, plan_candidates: [cand(a), cand(b)] })
            expect(comparePlan(e, { ...declared, plan_type }).result).not.toBe('consistent')
            checked += 1
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(500)
  })
})
