/**
 * Commercial Readiness Discovery Catalog eligibility test suite (CRC
 * Limited Pilot, 2026-08-12). Pure functions, no live model, no
 * BoundaryState/run-turn.ts involvement -- `alreadyAskedThisConversation`
 * is a plain injected boolean per the module's own design (see its header
 * comment for why).
 */

import { evaluateCategoryEligibility, selectEligibleCommercialReadinessCategory } from '@/lib/crc-engine/commercial-readiness-catalog'
import type { CommercialReadinessIndicators, IndicatorState } from '@/lib/crc-engine/commercial-readiness-indicators'

function indicators(overrides: Partial<CommercialReadinessIndicators> = {}): CommercialReadinessIndicators {
  return {
    client_involvement: 'unknown',
    person_depicted: 'unknown',
    reference_material_used: 'unknown',
    ...overrides,
  }
}

describe('evaluateCategoryEligibility', () => {
  test('applicable + evidence gap open + gate 1 met + phase 3 -> eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'affirmative' }),
      false,
      true,
      3,
    )
    expect(result).toEqual({
      category: 'client_provided_source_assets',
      applicability: 'affirmative',
      evidence_gap_open: true,
      eligible: true,
    })
  })

  test('applicability negative -> not eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'negative' }),
      false,
      true,
      3,
    )
    expect(result.eligible).toBe(false)
  })

  test('applicability unknown -> not eligible (conservative v1 rule: unknown never counts as applicable)', () => {
    const result = evaluateCategoryEligibility('client_provided_source_assets', indicators(), false, true, 3)
    expect(result.applicability).toBe('unknown')
    expect(result.eligible).toBe(false)
  })

  test('applicable but already asked this conversation -> evidence gap closed -> not eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'affirmative' }),
      true,
      true,
      3,
    )
    expect(result.evidence_gap_open).toBe(false)
    expect(result.eligible).toBe(false)
  })

  test('applicable + evidence gap open but gate 1 not met -> not eligible', () => {
    const result = evaluateCategoryEligibility(
      'client_provided_source_assets',
      indicators({ client_involvement: 'affirmative' }),
      false,
      false,
      3,
    )
    expect(result.eligible).toBe(false)
  })

  test('applicable + evidence gap open + gate 1 met but phase !== 3 -> not eligible', () => {
    for (const phase of [1, 2] as const) {
      const result = evaluateCategoryEligibility(
        'client_provided_source_assets',
        indicators({ client_involvement: 'affirmative' }),
        false,
        true,
        phase,
      )
      expect(result.eligible).toBe(false)
    }
  })

  test('each category reads its own dedicated indicator, not another category\'s', () => {
    const mixed = indicators({ client_involvement: 'affirmative', person_depicted: 'negative', reference_material_used: 'unknown' })
    expect(evaluateCategoryEligibility('client_provided_source_assets', mixed, false, true, 3).applicability).toBe('affirmative')
    expect(evaluateCategoryEligibility('likeness_publicity_rights', mixed, false, true, 3).applicability).toBe('negative')
    expect(evaluateCategoryEligibility('third_party_visual_assets', mixed, false, true, 3).applicability).toBe('unknown')
  })
})

describe('selectEligibleCommercialReadinessCategory', () => {
  test('no category applicable -> null', () => {
    expect(selectEligibleCommercialReadinessCategory(indicators(), false, true, 3)).toBeNull()
  })

  test('exactly one category applicable -> that category', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ person_depicted: 'affirmative' }), false, true, 3)
    expect(result).toBe('likeness_publicity_rights')
  })

  test('multiple categories applicable -> fixed pilot priority order picks client_provided_source_assets first', () => {
    const result = selectEligibleCommercialReadinessCategory(
      indicators({ client_involvement: 'affirmative', person_depicted: 'affirmative', reference_material_used: 'affirmative' }),
      false,
      true,
      3,
    )
    expect(result).toBe('client_provided_source_assets')
  })

  test('first-priority category applicable but negative -> falls through to next applicable category', () => {
    const result = selectEligibleCommercialReadinessCategory(
      indicators({ client_involvement: 'negative', person_depicted: 'affirmative' }),
      false,
      true,
      3,
    )
    expect(result).toBe('likeness_publicity_rights')
  })

  test('third-priority-only applicable -> third_party_visual_assets', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ reference_material_used: 'affirmative' }), false, true, 3)
    expect(result).toBe('third_party_visual_assets')
  })

  test('everything applicable but already asked this conversation -> null (global cap collapses evidence gap for all categories at once)', () => {
    const result = selectEligibleCommercialReadinessCategory(
      indicators({ client_involvement: 'affirmative', person_depicted: 'affirmative', reference_material_used: 'affirmative' }),
      true,
      true,
      3,
    )
    expect(result).toBeNull()
  })

  test('gate 1 not met -> null regardless of applicability', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ client_involvement: 'affirmative' }), false, false, 3)
    expect(result).toBeNull()
  })

  test('phase !== 3 -> null regardless of applicability', () => {
    const result = selectEligibleCommercialReadinessCategory(indicators({ client_involvement: 'affirmative' }), false, true, 2)
    expect(result).toBeNull()
  })
})
