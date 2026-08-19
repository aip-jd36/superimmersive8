/**
 * Dependency askability registry tests (Copyright UAT Correction Milestone,
 * 2026-08-19, PM-approved H1/H6).
 */

import { isDependencyAskableInCrc } from '@/lib/crc-engine/dependency-askability'

describe('isDependencyAskableInCrc', () => {
  test('human_contribution_description is askable_in_crc', () => {
    expect(isDependencyAskableInCrc('human_contribution_description')).toBe(true)
  })

  test('a dependency string absent from the registry defaults to non-askable, never the reverse', () => {
    expect(isDependencyAskableInCrc('separate_authorization_obtained')).toBe(false)
    expect(isDependencyAskableInCrc('editorial_designation_confirmed')).toBe(false)
    expect(isDependencyAskableInCrc('which_provider')).toBe(false)
    expect(isDependencyAskableInCrc('some_future_unregistered_dependency')).toBe(false)
  })
})
