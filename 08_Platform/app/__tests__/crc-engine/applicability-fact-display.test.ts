/**
 * Governed ApplicabilityFact display vocabulary -- registry tests (M2B.1,
 * 2026-09-05; extended CRC-CC-SCOPE-6B, 2026-09-24, jurisdiction
 * activation; CRC-CC-DISPLAY-VOCABULARY-2, 2026-10-08, exhaustive-coverage
 * tests). Deterministic, no mocking -- exercises the real production
 * registry directly. Deliberately narrow: proves exactly the two activated
 * entries and the fail-closed default for everything else, not a general
 * vocabulary-testing framework.
 */

import { getApplicabilityFactLabel } from '@/lib/crc-engine/applicability-fact-display'
import { APPLICABILITY_FACTS, type ApplicabilityFact } from '@/lib/retrieval-engine/types'

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

// ── CRC-CC-DISPLAY-VOCABULARY-2 (2026-10-08) -- exhaustive decision coverage ──
//
// The real enforcement is structural, not a runtime assertion: the
// production registry's own type annotation is now
// `Record<ApplicabilityFact, ApplicabilityFactDisplayEntry | null>`
// (exhaustive, not `Partial<...>`) -- omitting any current OR future
// `ApplicabilityFact` member from that table is a TypeScript compile error,
// which fails this entire test file (and every other file importing the
// module) before a single `test()` runs. The tests below are a cheap,
// redundant runtime sanity check that the lookup function itself never
// throws and never silently reverts to a weaker contract -- they do not,
// and cannot, substitute for the compiler's own exhaustiveness check.
describe('getApplicabilityFactLabel -- exhaustive decision coverage (CRC-CC-DISPLAY-VOCABULARY-2)', () => {
  test('every real ApplicabilityFact resolves without throwing, to either a non-empty string or exactly undefined', () => {
    for (const fact of APPLICABILITY_FACTS) {
      const label = getApplicabilityFactLabel(fact)
      expect(label === undefined || (typeof label === 'string' && label.length > 0)).toBe(true)
    }
  })

  test('tool_plan_tier is an EXPLICIT null decision, not a label -- unchanged by this milestone, no wording authored', () => {
    expect(getApplicabilityFactLabel('tool_plan_tier')).toBeUndefined()
  })

  test('the two previously-approved labels survive this coverage change byte-for-byte', () => {
    expect(getApplicabilityFactLabel('tool_account_status')).toBe('account or membership status')
    expect(getApplicabilityFactLabel('jurisdiction')).toBe('assessment jurisdiction')
  })

  test('APPLICABILITY_FACTS itself has not silently grown without this test file noticing (sanity on the fixture this suite depends on)', () => {
    const facts: readonly ApplicabilityFact[] = APPLICABILITY_FACTS
    expect(facts.slice().sort()).toEqual(['jurisdiction', 'tool_account_status', 'tool_plan_tier'])
  })
})
