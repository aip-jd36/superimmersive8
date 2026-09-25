/**
 * Governed dependency display vocabulary -- registry tests (CRC-CC-SCOPE-6F,
 * 2026-09-25). Deterministic, no mocking -- exercises the real production
 * registry directly. Mirrors applicability-fact-display.test.ts's own
 * convention exactly. Deliberately narrow: proves exactly the one activated
 * entry and the fail-closed default for everything else.
 */

import { getDependencyDisplayLabel } from '@/lib/crc-engine/dependency-fact-display'

describe('getDependencyDisplayLabel -- production registry', () => {
  test('human_contribution_description -> the one human/PM-approved label, exactly', () => {
    expect(getDependencyDisplayLabel('human_contribution_description')).toBe('human contribution to the finished work')
  })

  test('the approved label never contains the word "creative" -- SCOPE-6E explicitly rejected human creative contribution', () => {
    const label = getDependencyDisplayLabel('human_contribution_description')
    expect(label).toBeDefined()
    expect(label!.toLowerCase()).not.toContain('creative')
  })

  test('the approved label never contains legal-conclusion vocabulary', () => {
    const label = getDependencyDisplayLabel('human_contribution_description')!
    expect(label.toLowerCase()).not.toMatch(/copyright|authorship|ownership|clearance|sufficient|meaningful|legally|evidence|verified|approved|commercial/)
  })

  test('every other current stock/evidence-only dependency remains unregistered -- fail closed, never a fallback string', () => {
    const stockIds = ['editorial_designation_confirmed', 'separate_authorization_obtained', 'release_status_confirmed', 'rights_and_clearance_status', 'asset_confirmed_getty', 'asset_confirmed_istock', 'asset_confirmed_shutterstock', 'which_provider']
    for (const id of stockIds) {
      expect(getDependencyDisplayLabel(id)).toBeUndefined()
    }
  })

  test('an unrecognized/unknown dependency ID fails closed to undefined, never throws, never de-snake-cases', () => {
    expect(getDependencyDisplayLabel('not_a_real_dependency_id')).toBeUndefined()
    expect(getDependencyDisplayLabel('')).toBeUndefined()
  })

  test('the label is not mechanically derived from the ID -- de-snake-casing the ID would NOT produce the approved label', () => {
    const mechanicallyDerived = 'human_contribution_description'.replace(/_/g, ' ')
    expect(getDependencyDisplayLabel('human_contribution_description')).not.toBe(mechanicallyDerived)
  })

  test('exactly one dependency ID is registered', () => {
    const candidates = ['human_contribution_description', 'editorial_designation_confirmed', 'separate_authorization_obtained', 'release_status_confirmed', 'rights_and_clearance_status']
    const registered = candidates.filter((id) => getDependencyDisplayLabel(id) !== undefined)
    expect(registered).toEqual(['human_contribution_description'])
  })
})
