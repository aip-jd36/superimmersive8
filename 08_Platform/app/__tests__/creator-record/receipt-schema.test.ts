/**
 * PRODUCT-A-MVP-SPIKE-1A / SPIKE-1D — closed extraction schema: deterministic
 * validation and the Anthropic union-parameter ceiling.
 */

import { transformJSONSchema } from '@anthropic-ai/sdk/lib/transform-json-schema'
import {
  MAX_PLAN_CANDIDATES,
  RECEIPT_EXTRACTION_SCHEMA,
  RECEIPT_EXTRACTION_SCHEMA_VERSION,
  isIsoCalendarDate,
  validateReceiptExtraction,
} from '@/lib/creator-record/receipt-examination/schema'

const present = (value: string, evidence = value) => ({ status: 'present', value, evidence })
const absent = (status = 'not_shown') => ({ status, value: null, evidence: null })
const candidate = (text: string, context = 'charge_line', evidence = text) => ({ text, evidence, context })

function validRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    document_type: 'invoice',
    readability: 'legible',
    issuer_name: present('Runway AI, Inc.'),
    product_or_plan_name: present('Runway Standard Plan (Monthly)'),
    transaction_date: present('2026-03-03', 'Date: March 3, 2026'),
    service_period_start: absent(),
    service_period_end: absent(),
    plan_candidates: [candidate('Runway Standard Plan (Monthly)')],
    multiple_plans_shown: false,
    instruction_like_text_present: false,
    ...overrides,
  }
}

function countUnionParameters(node: unknown, out: string[] = [], p = '$'): string[] {
  if (node == null || typeof node !== 'object') return out
  const s = node as Record<string, unknown>
  if (Array.isArray(s.type) || Array.isArray(s.anyOf) || Array.isArray(s.oneOf)) out.push(p)
  const props = s.properties as Record<string, unknown> | undefined
  if (props) for (const [k, v] of Object.entries(props)) countUnionParameters(v, out, `${p}.${k}`)
  if (s.items) countUnionParameters(s.items, out, `${p}.items`)
  return out
}

describe('receipt extraction schema', () => {
  test('is versioned', () => {
    expect(RECEIPT_EXTRACTION_SCHEMA_VERSION).toBe('receipt-extraction-v2')
  })

  test('stays within the Anthropic structured-output union limit (16) on the wire', () => {
    const unions = countUnionParameters(transformJSONSchema(RECEIPT_EXTRACTION_SCHEMA as never))
    expect(unions.length).toBeLessThanOrEqual(16)
    expect(unions.length).toBe(10)
  })

  test('is closed: additionalProperties false at the top level and on every field', () => {
    expect(RECEIPT_EXTRACTION_SCHEMA.additionalProperties).toBe(false)
    for (const f of ['issuer_name', 'product_or_plan_name', 'transaction_date', 'service_period_start', 'service_period_end'] as const) {
      expect(RECEIPT_EXTRACTION_SCHEMA.properties[f].additionalProperties).toBe(false)
    }
  })

  test('accepts a well-formed extraction and trims values', () => {
    const ex = validateReceiptExtraction(validRaw({ issuer_name: present('  Kling AI ', ' Kling AI ') }))
    expect(ex).not.toBeNull()
    expect(ex!.issuer_name.value).toBe('Kling AI')
  })

  test('accepts null / not-shown / unreadable / ambiguous fields', () => {
    const ex = validateReceiptExtraction(
      validRaw({ issuer_name: absent('unreadable'), product_or_plan_name: absent('ambiguous'), transaction_date: absent() }),
    )
    expect(ex).not.toBeNull()
    expect(ex!.transaction_date).toEqual({ status: 'not_shown', value: null, evidence: null })
  })

  test.each([
    ['extra top-level key', validRaw({ verified: true })],
    ['missing key', (() => { const r = validRaw(); delete r.readability; return r })()],
    ['unknown document type', validRaw({ document_type: 'license' })],
    ['unknown readability', validRaw({ readability: 'perfect' })],
    ['non-boolean flag', validRaw({ multiple_plans_shown: 'no' })],
    ['present without value', validRaw({ issuer_name: { status: 'present', value: null, evidence: 'x' } })],
    ['present without evidence', validRaw({ issuer_name: { status: 'present', value: 'Kling AI', evidence: null } })],
    ['value without present status', validRaw({ issuer_name: { status: 'not_shown', value: 'Kling AI', evidence: null } })],
    ['field extra key', validRaw({ issuer_name: { ...present('Kling AI'), confidence: 0.9 } })],
    ['non-ISO date', validRaw({ transaction_date: present('March 3, 2026') })],
    ['impossible date', validRaw({ transaction_date: present('2026-02-30') })],
    ['overlong evidence', validRaw({ issuer_name: present('Kling AI', 'x'.repeat(201)) })],
    ['plan_candidates missing', (() => { const r = validRaw(); delete r.plan_candidates; return r })()],
    ['plan_candidates not an array', validRaw({ plan_candidates: 'Pro' })],
    ['too many plan candidates', validRaw({ plan_candidates: Array.from({ length: MAX_PLAN_CANDIDATES + 1 }, (_, i) => candidate(`Plan ${i}`)) })],
    ['candidate extra key', validRaw({ plan_candidates: [{ ...candidate('Pro'), confidence: 0.9 }] })],
    ['candidate missing evidence', validRaw({ plan_candidates: [{ text: 'Pro', context: 'charge_line' }] })],
    ['candidate empty text', validRaw({ plan_candidates: [candidate('  ')] })],
    ['candidate unknown context', validRaw({ plan_candidates: [candidate('Pro', 'footnote')] })],
    ['candidate overlong text', validRaw({ plan_candidates: [candidate('x'.repeat(121))] })],
    ['not an object', 'invoice'],
    ['null', null],
  ])('rejects (fails closed) on %s', (_label, raw) => {
    expect(validateReceiptExtraction(raw)).toBeNull()
  })

  test('isIsoCalendarDate checks real calendar dates', () => {
    expect(isIsoCalendarDate('2024-02-29')).toBe(true)
    expect(isIsoCalendarDate('2026-02-29')).toBe(false)
    expect(isIsoCalendarDate('2026-13-01')).toBe(false)
    expect(isIsoCalendarDate('2026-3-1')).toBe(false)
  })
})

describe('plan candidates (v2)', () => {
  test('an empty list and up to the maximum are accepted; values are trimmed', () => {
    expect(validateReceiptExtraction(validRaw({ plan_candidates: [] }))!.plan_candidates).toEqual([])
    const max = Array.from({ length: MAX_PLAN_CANDIDATES }, (_, i) => candidate(`Plan ${i}`))
    expect(validateReceiptExtraction(validRaw({ plan_candidates: max }))!.plan_candidates).toHaveLength(MAX_PLAN_CANDIDATES)
    expect(validateReceiptExtraction(validRaw({ plan_candidates: [candidate(' Pro ', 'heading_or_title', ' Pro receipt ')] }))!.plan_candidates).toEqual([
      { text: 'Pro', evidence: 'Pro receipt', context: 'heading_or_title' },
    ])
  })

  test('the candidate list is closed on the wire', () => {
    const items = RECEIPT_EXTRACTION_SCHEMA.properties.plan_candidates.items
    expect(items.additionalProperties).toBe(false)
    expect(items.required).toEqual(['text', 'evidence', 'context'])
  })
})
