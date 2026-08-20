/**
 * Track B — Generic Living-Knowledge Readiness/Askability milestone
 * (2026-08-20). Direct unit tests for the generalized registry -- proves
 * (a) `isDependencyAskableInCrc`'s pre-generalization behavior for
 * `human_contribution_description` is byte-identical to before this
 * milestone, (b) `getAskabilityEntry` (new) correctly exposes the full
 * entry, (c) `human_contribution_description` deliberately carries no
 * `generic_acquisition` strategy (the dedicated module owns it
 * exclusively -- see knowledge-readiness.ts's own exclusion set), and
 * (d) an unregistered dependency fails closed on both functions, never
 * throws.
 */

import { isDependencyAskableInCrc, getAskabilityEntry } from '@/lib/crc-engine/dependency-askability'

describe('isDependencyAskableInCrc (preserved, pre-generalization behavior)', () => {
  test('human_contribution_description remains askable_in_crc, exactly as before this milestone', () => {
    expect(isDependencyAskableInCrc('human_contribution_description')).toBe(true)
  })

  test('an unregistered dependency id is never askable -- fail-closed, no throw', () => {
    expect(() => isDependencyAskableInCrc('foo_evidence_status')).not.toThrow()
    expect(isDependencyAskableInCrc('foo_evidence_status')).toBe(false)
  })

  test('a real, currently-unregistered stock dependency (editorial_designation_confirmed) is not askable -- confirms no silent governance change was made by this milestone', () => {
    expect(isDependencyAskableInCrc('editorial_designation_confirmed')).toBe(false)
    expect(isDependencyAskableInCrc('asset_confirmed_istock')).toBe(false)
  })
})

describe('getAskabilityEntry (new in this milestone)', () => {
  test('human_contribution_description returns treatment askable_in_crc with NO generic_acquisition strategy -- the dedicated module owns it exclusively', () => {
    const entry = getAskabilityEntry('human_contribution_description')
    expect(entry).toEqual({ treatment: 'askable_in_crc' })
    expect(entry?.generic_acquisition).toBeUndefined()
  })

  test('an unregistered dependency id returns undefined, never throws', () => {
    expect(() => getAskabilityEntry('foo_evidence_status')).not.toThrow()
    expect(getAskabilityEntry('foo_evidence_status')).toBeUndefined()
  })
})
