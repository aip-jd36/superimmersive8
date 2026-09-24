/**
 * Governed ApplicabilityFact display vocabulary -- registry tests (M2B.1,
 * 2026-09-05; extended CRC-CC-SCOPE-6B, 2026-09-24, jurisdiction
 * activation). Deterministic, no mocking -- exercises the real production
 * registry directly. Deliberately narrow: proves exactly the two activated
 * entries and the fail-closed default for everything else, not a general
 * vocabulary-testing framework.
 */

import { getApplicabilityFactLabel } from '@/lib/crc-engine/applicability-fact-display'

describe('getApplicabilityFactLabel -- production registry', () => {
  test("tool_account_status -> the one human/PM-approved label, exactly (unchanged by SCOPE-6B)", () => {
    expect(getApplicabilityFactLabel('tool_account_status')).toBe('account or membership status')
  })

  test('jurisdiction -> the SCOPE-6B human/PM-approved label, exactly', () => {
    expect(getApplicabilityFactLabel('jurisdiction')).toBe('assessment jurisdiction')
  })

  test('tool_plan_tier remains unregistered -- fail closed, never a fallback string (SCOPE-6B explicitly does not touch this)', () => {
    expect(getApplicabilityFactLabel('tool_plan_tier')).toBeUndefined()
  })

  test('the jurisdiction label never contains the words "territory" or "distribution" -- guards against conflating AssessmentJurisdictionMention with DistributionTerritoryMention', () => {
    const label = getApplicabilityFactLabel('jurisdiction')
    expect(label).toBeDefined()
    expect(label!.toLowerCase()).not.toContain('territory')
    expect(label!.toLowerCase()).not.toContain('distribut')
  })

  test('an unrecognized fact value fails closed to undefined, never throws, never de-snake-cases', () => {
    // Defensive: ApplicabilityFact is a closed union in production, but this
    // registry's own lookup must not throw or improvise for any string a
    // caller could pass -- mirrors selector-askability.ts's own "absence
    // defaults to non-askable, never the reverse" discipline exactly.
    expect(getApplicabilityFactLabel('not_a_real_fact' as unknown as Parameters<typeof getApplicabilityFactLabel>[0])).toBeUndefined()
  })

  test('exactly two ApplicabilityFacts are registered, tool_plan_tier is not one of them', () => {
    const facts: Array<Parameters<typeof getApplicabilityFactLabel>[0]> = ['jurisdiction', 'tool_plan_tier', 'tool_account_status']
    const registered = facts.filter((f) => getApplicabilityFactLabel(f) !== undefined)
    expect(registered.sort()).toEqual(['jurisdiction', 'tool_account_status'])
  })
})
