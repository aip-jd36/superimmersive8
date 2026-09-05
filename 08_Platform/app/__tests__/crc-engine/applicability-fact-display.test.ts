/**
 * Governed ApplicabilityFact display vocabulary -- registry tests (M2B.1,
 * 2026-09-05). Deterministic, no mocking -- exercises the real production
 * registry directly. Deliberately narrow: proves exactly the one activated
 * entry and the fail-closed default for everything else, not a general
 * vocabulary-testing framework.
 */

import { getApplicabilityFactLabel } from '@/lib/crc-engine/applicability-fact-display'

describe('getApplicabilityFactLabel -- production registry', () => {
  test("tool_account_status -> the one human/PM-approved label, exactly", () => {
    expect(getApplicabilityFactLabel('tool_account_status')).toBe('account or membership status')
  })

  test('tool_plan_tier remains unregistered -- fail closed, never a fallback string', () => {
    expect(getApplicabilityFactLabel('tool_plan_tier')).toBeUndefined()
  })

  test('jurisdiction remains unregistered here -- owned entirely by its own dedicated clarification path, never this registry', () => {
    expect(getApplicabilityFactLabel('jurisdiction')).toBeUndefined()
  })

  test('an unrecognized fact value fails closed to undefined, never throws, never de-snake-cases', () => {
    // Defensive: ApplicabilityFact is a closed union in production, but this
    // registry's own lookup must not throw or improvise for any string a
    // caller could pass -- mirrors selector-askability.ts's own "absence
    // defaults to non-askable, never the reverse" discipline exactly.
    expect(getApplicabilityFactLabel('not_a_real_fact' as unknown as Parameters<typeof getApplicabilityFactLabel>[0])).toBeUndefined()
  })

  test('exactly one ApplicabilityFact is registered', () => {
    const facts: Array<Parameters<typeof getApplicabilityFactLabel>[0]> = ['jurisdiction', 'tool_plan_tier', 'tool_account_status']
    const registered = facts.filter((f) => getApplicabilityFactLabel(f) !== undefined)
    expect(registered).toEqual(['tool_account_status'])
  })
})
