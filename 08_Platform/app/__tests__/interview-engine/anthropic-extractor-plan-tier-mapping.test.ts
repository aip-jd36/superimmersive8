/**
 * Deterministic unit test for toCandidateObservation's plan_tier/
 * access_surface mapping (originally A3 fix, CRC Pilot Findings,
 * 2026-08-15; rewritten for the P0 Anthropic schema-union-limit fix,
 * 2026-08-21, which replaced the eight flat wire fields
 * access_surface_confidence_hint/value_hint and
 * plan_tier_confidence_hint/value_hint with one generic
 * `attributes: ExtractedAttribute[]` array -- see anthropic-extractor.ts's
 * own header near EXTRACTED_ATTRIBUTE_KEY_VALUES for the full rationale).
 * Pure field-mapping logic, no live model call -- consistent with this
 * project's standing discipline of never exercising a live model inside a
 * deterministic test suite (see anthropic-extractor-context.test.ts's own
 * header). The OUTPUT shape asserted here (CandidateObservation's own
 * plan_tier_confidence_hint/plan_tier_value_hint/access_surface_*_hint
 * fields) is UNCHANGED by the P0 fix -- only the wire INPUT shape changed;
 * this file proves that translation is still correct.
 */

import { toCandidateObservation } from '@/lib/interview-engine/anthropic-extractor'

function baseParsed(overrides: Record<string, unknown> = {}) {
  return {
    proposal_id: 'c1',
    raw_text: 'Kling',
    kind: 'tool_mention' as const,
    raw_tool_name: 'Kling',
    raw_provider_name: null,
    attributes: [] as { key: string; confidence: string; value: string }[],
    is_correction: false,
    correction_of_raw_text: null,
    scope: null,
    workflow_stage: null,
    observation_confidence_hint: null,
    raw_fact_field: null,
    fact_confidence_hint: null,
    fact_value_hint: null,
    goal_confidence_hint: null,
    goal_category_hint: null,
    goal_scope_hint: null,
    low_confidence: false,
    ...overrides,
  }
}

describe('toCandidateObservation -- plan_tier/access_surface hint mapping (via generic attributes[])', () => {
  test('confirmed plan_tier attribute is forwarded verbatim, never a branded-tier substitution', () => {
    const out = toCandidateObservation(baseParsed({ attributes: [{ key: 'plan_tier', confidence: 'confirmed', value: 'paid' }] }) as any, 1)
    expect(out.plan_tier_confidence_hint).toBe('confirmed')
    expect(out.plan_tier_value_hint).toBe('paid')
  })

  test('confirmed access_surface attribute is forwarded verbatim', () => {
    const out = toCandidateObservation(baseParsed({ attributes: [{ key: 'access_surface', confidence: 'confirmed', value: 'the website' }] }) as any, 1)
    expect(out.access_surface_confidence_hint).toBe('confirmed')
    expect(out.access_surface_value_hint).toBe('the website')
  })

  test('both attributes present in the same candidate are independent and both forwarded (test L)', () => {
    const out = toCandidateObservation(
      baseParsed({
        attributes: [
          { key: 'plan_tier', confidence: 'confirmed', value: 'free' },
          { key: 'access_surface', confidence: 'confirmed', value: 'via the website' },
        ],
      }) as any,
      1,
    )
    expect(out.plan_tier_value_hint).toBe('free')
    expect(out.access_surface_value_hint).toBe('via the website')
  })

  test('unknown confidence (expressed uncertainty) is preserved, not upgraded to confirmed, and value is undefined for an empty-string wire value', () => {
    const out = toCandidateObservation(baseParsed({ attributes: [{ key: 'plan_tier', confidence: 'unknown', value: '' }] }) as any, 1)
    expect(out.plan_tier_confidence_hint).toBe('unknown')
    expect(out.plan_tier_value_hint).toBeUndefined()
  })

  test('empty attributes array (nothing stated) collapses to undefined for both hints, never a fabricated fact (test F/R)', () => {
    const out = toCandidateObservation(baseParsed() as any, 1)
    expect(out.plan_tier_confidence_hint).toBeUndefined()
    expect(out.plan_tier_value_hint).toBeUndefined()
    expect(out.access_surface_confidence_hint).toBeUndefined()
    expect(out.access_surface_value_hint).toBeUndefined()
  })

  test('every other existing field mapping is unaffected by this change', () => {
    const out = toCandidateObservation(
      baseParsed({ raw_text: 'We used Kling.', raw_tool_name: 'Kling', is_correction: true, correction_of_raw_text: 'Runway' }) as any,
      3,
    )
    expect(out.turn).toBe(3)
    expect(out.raw_text).toBe('We used Kling.')
    expect(out.raw_tool_name).toBe('Kling')
    expect(out.is_correction).toBe(true)
    expect(out.correction_of_raw_text).toBe('Runway')
  })
})
