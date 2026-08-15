/**
 * Deterministic unit test for toCandidateObservation's new
 * access_surface_confidence_hint/access_surface_value_hint/
 * plan_tier_confidence_hint/plan_tier_value_hint mapping (A3 fix, CRC Pilot
 * Findings, 2026-08-15). Pure field-mapping logic, no live model call --
 * consistent with this project's standing discipline of never exercising a
 * live model inside a deterministic test suite (see
 * anthropic-extractor-context.test.ts's own header). Live-model extraction
 * accuracy for these hints is covered separately by
 * lib/interview-engine/eval/corpus.ts's plan_tier_* scenarios, run via
 * `npm run eval:extraction`, per this codebase's established split between
 * deterministic unit tests and live-model eval scenarios.
 *
 * Root cause this fix addresses: the live extractor's JSON schema
 * (CANDIDATE_RESPONSE_SCHEMA) previously had no properties at all for these
 * four fields, so no matter what the user said about their plan/tier, the
 * live model was structurally incapable of ever populating them --
 * extraction.ts's own resolveAttestedToolField (which consumes these hints)
 * was already correct and unchanged by this fix.
 */

import { toCandidateObservation } from '@/lib/interview-engine/anthropic-extractor'

function baseParsed(overrides: Record<string, unknown> = {}) {
  return {
    proposal_id: 'c1',
    raw_text: 'Kling',
    kind: 'tool_mention' as const,
    raw_tool_name: 'Kling',
    access_surface_confidence_hint: null,
    access_surface_value_hint: null,
    plan_tier_confidence_hint: null,
    plan_tier_value_hint: null,
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

describe('toCandidateObservation -- plan_tier/access_surface hint mapping', () => {
  test('confirmed plan_tier hint is forwarded verbatim, never a branded-tier substitution', () => {
    const out = toCandidateObservation(
      baseParsed({ plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'paid' }),
      1,
    )
    expect(out.plan_tier_confidence_hint).toBe('confirmed')
    expect(out.plan_tier_value_hint).toBe('paid')
  })

  test('confirmed access_surface hint is forwarded verbatim', () => {
    const out = toCandidateObservation(
      baseParsed({ access_surface_confidence_hint: 'confirmed', access_surface_value_hint: 'the website' }),
      1,
    )
    expect(out.access_surface_confidence_hint).toBe('confirmed')
    expect(out.access_surface_value_hint).toBe('the website')
  })

  test('both hints present in the same candidate are independent and both forwarded', () => {
    const out = toCandidateObservation(
      baseParsed({
        plan_tier_confidence_hint: 'confirmed',
        plan_tier_value_hint: 'free',
        access_surface_confidence_hint: 'confirmed',
        access_surface_value_hint: 'via the website',
      }),
      1,
    )
    expect(out.plan_tier_value_hint).toBe('free')
    expect(out.access_surface_value_hint).toBe('via the website')
  })

  test('unknown confidence hint (expressed uncertainty) is preserved, not upgraded to confirmed', () => {
    const out = toCandidateObservation(baseParsed({ plan_tier_confidence_hint: 'unknown', plan_tier_value_hint: null }), 1)
    expect(out.plan_tier_confidence_hint).toBe('unknown')
    expect(out.plan_tier_value_hint).toBeUndefined()
  })

  test('null hints (nothing stated) collapse to undefined, never a fabricated fact', () => {
    const out = toCandidateObservation(baseParsed(), 1)
    expect(out.plan_tier_confidence_hint).toBeUndefined()
    expect(out.plan_tier_value_hint).toBeUndefined()
    expect(out.access_surface_confidence_hint).toBeUndefined()
    expect(out.access_surface_value_hint).toBeUndefined()
  })

  test('every other existing field mapping is unaffected by this change', () => {
    const out = toCandidateObservation(
      baseParsed({ raw_text: 'We used Kling.', raw_tool_name: 'Kling', is_correction: true, correction_of_raw_text: 'Runway' }),
      3,
    )
    expect(out.turn).toBe(3)
    expect(out.raw_text).toBe('We used Kling.')
    expect(out.raw_tool_name).toBe('Kling')
    expect(out.is_correction).toBe(true)
    expect(out.correction_of_raw_text).toBe('Runway')
  })
})
