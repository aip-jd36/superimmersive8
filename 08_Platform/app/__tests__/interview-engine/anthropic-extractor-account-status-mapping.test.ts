/**
 * Deterministic unit test for toCandidateObservation's account_status
 * mapping (Minimal Generic tool_account_status Capture milestone,
 * 2026-08-24) -- mirrors anthropic-extractor-plan-tier-mapping.test.ts
 * exactly, same harness, same style. Pure field-mapping logic (wire
 * attributes[] -> CandidateObservation's flat hint fields), no live model
 * call.
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

describe('toCandidateObservation -- account_status hint mapping (via generic attributes[])', () => {
  test('confirmed account_status attribute ("Member Account") is forwarded verbatim', () => {
    const out = toCandidateObservation(
      baseParsed({ attributes: [{ key: 'account_status', confidence: 'confirmed', value: 'Member Account' }] }) as any,
      1,
    )
    expect(out.account_status_confidence_hint).toBe('confirmed')
    expect(out.account_status_value_hint).toBe('Member Account')
  })

  test('confirmed account_status attribute ("Regular Account") is forwarded verbatim', () => {
    const out = toCandidateObservation(
      baseParsed({ attributes: [{ key: 'account_status', confidence: 'confirmed', value: 'Regular Account' }] }) as any,
      1,
    )
    expect(out.account_status_confidence_hint).toBe('confirmed')
    expect(out.account_status_value_hint).toBe('Regular Account')
  })

  test('account_status is independent of plan_tier/access_surface -- all three can appear together on the same candidate', () => {
    const out = toCandidateObservation(
      baseParsed({
        attributes: [
          { key: 'plan_tier', confidence: 'confirmed', value: 'paid' },
          { key: 'access_surface', confidence: 'confirmed', value: 'the app' },
          { key: 'account_status', confidence: 'confirmed', value: 'Member Account' },
        ],
      }) as any,
      1,
    )
    expect(out.plan_tier_value_hint).toBe('paid')
    expect(out.access_surface_value_hint).toBe('the app')
    expect(out.account_status_value_hint).toBe('Member Account')
  })

  test('unknown confidence (expressed uncertainty) is preserved, not upgraded to confirmed, and value is undefined for an empty-string wire value', () => {
    const out = toCandidateObservation(baseParsed({ attributes: [{ key: 'account_status', confidence: 'unknown', value: '' }] }) as any, 1)
    expect(out.account_status_confidence_hint).toBe('unknown')
    expect(out.account_status_value_hint).toBeUndefined()
  })

  test('empty attributes array (nothing stated) collapses to undefined for both hints, never a fabricated fact', () => {
    const out = toCandidateObservation(baseParsed() as any, 1)
    expect(out.account_status_confidence_hint).toBeUndefined()
    expect(out.account_status_value_hint).toBeUndefined()
  })

  test('a duplicate account_status key in the same attributes array is treated as absent, never picking the first/last (fail-closed on ambiguity)', () => {
    const out = toCandidateObservation(
      baseParsed({
        attributes: [
          { key: 'account_status', confidence: 'confirmed', value: 'Member Account' },
          { key: 'account_status', confidence: 'confirmed', value: 'Regular Account' },
        ],
      }) as any,
      1,
    )
    expect(out.account_status_confidence_hint).toBeUndefined()
    expect(out.account_status_value_hint).toBeUndefined()
  })
})
