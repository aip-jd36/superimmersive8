/**
 * Topic claim lookup + applicability evaluator deterministic tests (CRC
 * Living Knowledge Phase 1, 2026-08-16). No live model needed -- pure
 * functions, same discipline as retrieve.test.ts.
 */

import { canonicalizeJurisdictionValue, evaluateApplicabilityDetailed, isApplicable, lookupTopicClaims, type ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import type { ToolMention, UserGoal } from '@/types/interview-engine'

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'category'>): UserGoal {
  return {
    state: 'confirmed',
    raw_text: 'placeholder',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: 'placeholder',
    ...overrides,
  }
}

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Scope text.',
    crc_candidate_statement: 'Candidate statement.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-16',
    superseded_by: null,
    ...overrides,
  }
}

function facts(overrides: Partial<ApplicabilityFacts> = {}): ApplicabilityFacts {
  return { jurisdiction: { included: [], excluded: [] }, toolMentions: [], ...overrides }
}

function toolMention(overrides: Partial<ToolMention> & Pick<ToolMention, 'mention_id' | 'resolution'>): ToolMention {
  return {
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

describe('canonicalizeJurisdictionValue (Copyright UAT Output-Path Diagnostic P0 fix, 2026-08-19)', () => {
  test('positive: recognized United States aliases all canonicalize to "United States"', () => {
    for (const value of ['United States', 'US', 'USA', 'U.S.', 'U.S.A.', 'the US']) {
      expect(canonicalizeJurisdictionValue(value)).toBe('United States')
    }
  })

  test('positive: case/whitespace robustness', () => {
    expect(canonicalizeJurisdictionValue('us')).toBe('United States')
    expect(canonicalizeJurisdictionValue('  US  ')).toBe('United States')
    expect(canonicalizeJurisdictionValue('united states')).toBe('United States')
    expect(canonicalizeJurisdictionValue('United States of America')).toBe('United States')
  })

  test('negative: unrecognized/unrelated strings are returned unchanged, never coerced -- fail-closed by construction', () => {
    for (const value of ['United Kingdom', 'Canada', 'North America', 'California', 'New York', 'America-ish', 'US market maybe', '']) {
      expect(canonicalizeJurisdictionValue(value)).toBe(value)
    }
  })

  test('negative: no substring/startsWith matching -- "US market maybe" is not coerced merely because it contains "US"', () => {
    expect(canonicalizeJurisdictionValue('US market maybe')).not.toBe('United States')
  })
})

describe('isApplicable', () => {
  test('empty requirements list is vacuously applicable', () => {
    expect(isApplicable([], facts())).toBe(true)
  })

  test('jurisdiction requirement met when confirmed and equal', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { included: ['United States'], excluded: [] } }))).toBe(true)
  })

  test('jurisdiction requirement unmet when confirmed but different value', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { included: ['Taiwan'], excluded: [] } }))).toBe(false)
  })

  test('jurisdiction requirement unmet when unknown -- never guessed', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { included: [], excluded: [] } }))).toBe(false)
  })

  test('jurisdiction requirement unmet when declined', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { included: [], excluded: [] } }))).toBe(false)
  })

  test('not_equals operator', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'not_equals', value: 'United States' }]
    // Assessment-Jurisdiction Mention Model (2026-08-28): a different jurisdiction
    // being included (Taiwan) no longer implies the required one (United States) is
    // excluded -- silence about US is unresolved, not a positive not_equals match.
    // Only an EXPLICIT exclusion satisfies not_equals now; see the dedicated
    // explicit-exclusion coverage elsewhere in this file.
    expect(isApplicable(req, facts({ jurisdiction: { included: ['Taiwan'], excluded: [] } }))).toBe(false)
    expect(isApplicable(req, facts({ jurisdiction: { included: ['United States'], excluded: [] } }))).toBe(false)
  })

  test('tool_plan_tier requirement met for the specific tool', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' } })
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(true)
  })

  test('tool_plan_tier requirement unmet when the mention is for a different tool', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'free' } })
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(false)
  })

  test('tool_plan_tier requirement unmet when a superseded mention is the only match', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' }, superseded_by: 'm2' })
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(false)
  })

  test('jurisdiction requirement met for every recognized United States alias (Copyright UAT Output-Path Diagnostic P0 fix, 2026-08-19)', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    for (const alias of ['US', 'USA', 'U.S.', 'U.S.A.', 'the US', 'United States', 'united states']) {
      expect(isApplicable(req, facts({ jurisdiction: { included: [alias], excluded: [] } }))).toBe(true)
    }
  })

  test('jurisdiction requirement still unmet for an unrecognized value -- normalization does not weaken the gate (fail-closed regression)', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    for (const value of ['United Kingdom', 'Canada', 'North America', 'California']) {
      expect(isApplicable(req, facts({ jurisdiction: { included: [value], excluded: [] } }))).toBe(false)
    }
  })

  test('not_equals operator also benefits from canonicalization -- a US alias correctly matches a US-scoped not_equals requirement whether included or excluded', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'not_equals', value: 'United States' }]
    expect(isApplicable(req, facts({ jurisdiction: { included: ['USA'], excluded: [] } }))).toBe(false)
    // Assessment-Jurisdiction Mention Model (2026-08-28): not_equals is now met
    // only by an EXPLICIT exclusion of the required value -- canonicalization
    // still applies to that exclusion (a "USA" alias in excluded[] correctly
    // matches the "United States" requirement).
    expect(isApplicable(req, facts({ jurisdiction: { included: [], excluded: ['USA'] } }))).toBe(true)
  })

  test('tool_plan_tier requirement is NOT canonicalized -- normalization is scoped strictly to jurisdiction, per the exact opposite value used verbatim', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'FREE' }]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' } })
    // Deliberately case-sensitive still -- proves the jurisdiction canonicalization added by this fix was not accidentally applied globally.
    expect(isApplicable(req, facts({ toolMentions: [tm] }))).toBe(false)
  })

  test('multiple requirements: ALL must pass (deterministic .every(), no partial credit)', () => {
    const req: ApplicabilityRequirement[] = [
      { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
      { fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'free' },
    ]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'elevenlabs' }, plan_tier: { state: 'confirmed', value: 'free' } })
    expect(isApplicable(req, facts({ jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [tm] }))).toBe(true)
    expect(isApplicable(req, facts({ jurisdiction: { included: [], excluded: [] }, toolMentions: [tm] }))).toBe(false)
  })
})

describe('evaluateApplicabilityDetailed (Piece 1, CRC Narrow Governed Selector Questioning milestone, 2026-08-24)', () => {
  test('all requirements met -> every outcome is "met"', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    const outcomes = evaluateApplicabilityDetailed(req, facts({ jurisdiction: { included: ['United States'], excluded: [] } }))
    expect(outcomes).toEqual([{ requirement: req[0], status: 'met' }])
  })

  test('unresolved requirement (unconfirmed fact) -> "unresolved", never "not_met"', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    const outcomes = evaluateApplicabilityDetailed(req, facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(outcomes).toEqual([{ requirement: req[0], status: 'unresolved' }])
  })

  test('known nonmatching requirement -> "not_met", never "unresolved"', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    // Assessment-Jurisdiction Mention Model (2026-08-28): a genuinely
    // "known-not-applicable" (not_met) status now requires an EXPLICIT
    // exclusion -- merely including a different jurisdiction (e.g. Taiwan,
    // with nothing said about the US) is unresolved, not not_met; see the
    // "unresolved requirement" test immediately above for that case.
    const outcomes = evaluateApplicabilityDetailed(req, facts({ jurisdiction: { included: [], excluded: ['United States'] } }))
    expect(outcomes).toEqual([{ requirement: req[0], status: 'not_met' }])
  })

  test('mixed unresolved + not_met -> each requirement keeps its own independent status', () => {
    const req: ApplicabilityRequirement[] = [
      { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
      { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
    ]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'free' } })
    const outcomes = evaluateApplicabilityDetailed(req, facts({ jurisdiction: { included: [], excluded: [] }, toolMentions: [tm] }))
    expect(outcomes).toEqual([
      { requirement: req[0], status: 'unresolved' },
      { requirement: req[1], status: 'not_met' },
    ])
  })

  test('multiple unresolved requirements -> both reported independently, in array order', () => {
    const req: ApplicabilityRequirement[] = [
      { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
      { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
    ]
    const outcomes = evaluateApplicabilityDetailed(req, facts({ jurisdiction: { included: [], excluded: [] }, toolMentions: [] }))
    expect(outcomes).toEqual([
      { requirement: req[0], status: 'unresolved' },
      { requirement: req[1], status: 'unresolved' },
    ])
  })

  test('empty requirements list -> empty outcome array', () => {
    expect(evaluateApplicabilityDetailed([], facts())).toEqual([])
  })

  test('isApplicable retains its old boolean semantics exactly, now derived from evaluateApplicabilityDetailed -- true only when every outcome is "met"', () => {
    const req: ApplicabilityRequirement[] = [
      { fact: 'jurisdiction', operator: 'equals', value: 'United States' },
      { fact: 'tool_plan_tier', tool: 'kling', operator: 'equals', value: 'paid' },
    ]
    const tm = toolMention({ mention_id: 'm1', resolution: { kind: 'canonical', identifier: 'kling' }, plan_tier: { state: 'confirmed', value: 'paid' } })
    const allMet = facts({ jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [tm] })
    expect(isApplicable(req, allMet)).toBe(true)
    expect(evaluateApplicabilityDetailed(req, allMet).every((o) => o.status === 'met')).toBe(true)

    const oneUnresolved = facts({ jurisdiction: { included: [], excluded: [] }, toolMentions: [tm] })
    expect(isApplicable(req, oneUnresolved)).toBe(false)

    const oneNotMet = facts({ jurisdiction: { included: ['Taiwan'], excluded: [] }, toolMentions: [tm] })
    expect(isApplicable(req, oneNotMet)).toBe(false)
  })
})

describe('lookupTopicClaims -- goal filtering', () => {
  test('empty goals -> empty matches', () => {
    expect(lookupTopicClaims([], [claim({ claim_id: 'C-1', topic: 'commercial_use' })], facts())).toEqual({ matches: [], diagnostics: [] })
  })

  test('a superseded goal is never looked up', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership', superseded_by: 'g-2' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    expect(lookupTopicClaims([g], [c], facts()).matches).toEqual([])
  })

  test('a declined goal is never looked up', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership', state: 'declined' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    expect(lookupTopicClaims([g], [c], facts()).matches).toEqual([])
  })
})

describe('lookupTopicClaims -- topic matching + eligibility gates', () => {
  test('no claim for the goal category -> no_topic_claim diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const result = lookupTopicClaims([g], [claim({ claim_id: 'C-1', topic: 'likeness' })], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'no_topic_claim' }])
  })

  test('a Candidate-lifecycle claim is excluded -- not_adopted_or_eligible diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership', lifecycle: 'Candidate' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'not_adopted_or_eligible' }])
  })

  test('an Adopted but CRC-Eligible: No claim is excluded (reviewer-only) -- not_adopted_or_eligible diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership', lifecycle: 'Adopted', crc_eligible: 'No' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([{ identifier: 'copyright_ownership', reason: 'not_adopted_or_eligible' }])
  })

  test('Adopted + CRC-Eligible but a superseded (non-current) version is excluded', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1-v1', topic: 'copyright_ownership', superseded_by: 'C-1-v2' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([])
  })

  test('Adopted + CRC-Eligible + applicable -> matches', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([c])
    expect(result.diagnostics).toEqual([])
  })

  test('Adopted + CRC-Eligible but applicability unmet -> applicability_unmet diagnostic, not a fabricated match', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'copyright_ownership',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'C-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  test('applicability met -> the claim surfaces', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { included: ['United States'], excluded: [] } }))
    expect(result.matches).toEqual([c])
  })

  test('a US alias ("US") satisfies a "United States" jurisdiction requirement at the lookupTopicClaims level (Copyright UAT Output-Path Diagnostic P0 fix, 2026-08-19)', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { included: ['US'], excluded: [] } }))
    expect(result.matches).toEqual([c])
    expect(result.diagnostics).toEqual([])
  })

  test('wrong jurisdiction -> unmet, not a fabricated match (US-only claim, Taiwan confirmed but US never excluded)', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({
      claim_id: 'C-1',
      topic: 'copyright_ownership',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    // Assessment-Jurisdiction Mention Model (2026-08-28): confirming Taiwan as
    // an in-scope jurisdiction does NOT implicitly exclude United States --
    // silence about US is unresolved, not not_met. The claim is still
    // correctly withheld (matches stays empty) either way; only the
    // diagnostic's status classification changes. See the mixed-resolution
    // diagnostic-parity tests below for genuine not_met coverage (explicit
    // exclusion).
    const result = lookupTopicClaims([g], [c], facts({ jurisdiction: { included: ['Taiwan'], excluded: [] } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'copyright_ownership',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'C-1', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  test('an unsettled + CRC-eligible + applicable claim surfaces just like an established one -- character is descriptive, not a gate', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership', claim_character: 'unsettled' })
    const result = lookupTopicClaims([g], [c], facts())
    expect(result.matches).toEqual([c])
  })

  test('two distinct goal categories each independently resolved in one call', () => {
    const g1 = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const g2 = goal({ goal_id: 'g-2', category: 'likeness' })
    const c1 = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    const result = lookupTopicClaims([g1, g2], [c1], facts())
    expect(result.matches).toEqual([c1])
    expect(result.diagnostics).toEqual([{ identifier: 'likeness', reason: 'no_topic_claim' }])
  })

  test('no duplicate matches when the same claim_id would otherwise be counted twice', () => {
    const g = goal({ goal_id: 'g-1', category: 'copyright_ownership' })
    const c = claim({ claim_id: 'C-1', topic: 'copyright_ownership' })
    const result = lookupTopicClaims([g], [c, c], facts())
    expect(result.matches).toHaveLength(1)
  })
})

// ── CRC Generic Applicability Diagnostic Parity milestone (2026-08-24) --
// Gap A fix: the category-level diagnostic used to be gated on
// `!anyApplicable`, so a fully-computed `unmetDetail` array for an unresolved
// (or not_met) sibling was silently discarded whenever ANY other claim in the
// same category was applicable. Now gated on `unmetDetail.length > 0`. ────
describe('lookupTopicClaims -- mixed-resolution diagnostic parity (CRC Generic Applicability Diagnostic Parity milestone, 2026-08-24)', () => {
  // A. one met + one unresolved
  test('A: one met claim + one unresolved claim in the same category -- the met claim retrieves, the unresolved one is withheld WITH a diagnostic (previously silently dropped)', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'commercial_use' })
    const unresolved = claim({
      claim_id: 'UNRESOLVED',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [met, unresolved], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([met])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'UNRESOLVED', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  // B. one met + one not_met
  test('B: one met claim + one known-not-applicable claim -- the met claim retrieves, the not_met one is withheld with a not_met (never unresolved) diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'commercial_use' })
    const notMet = claim({
      claim_id: 'NOT-MET',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    // Assessment-Jurisdiction Mention Model (2026-08-28): a genuine not_met
    // now requires an EXPLICIT exclusion, not merely a different included
    // value (see the diagnostic-parity test A immediately above for the
    // "different value included, nothing excluded" -- unresolved -- case).
    const result = lookupTopicClaims([g], [met, notMet], facts({ jurisdiction: { included: [], excluded: ['United States'] } }))
    expect(result.matches).toEqual([met])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'NOT-MET', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'not_met' }],
      },
    ])
  })

  // C. one met + one unresolved + one not_met
  test('C: one met + one unresolved + one not_met, all in the same category -- correct per-claim distinction preserved', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'commercial_use' })
    const unresolved = claim({
      claim_id: 'UNRESOLVED',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'test-tool', operator: 'equals', value: 'pro' }],
    })
    const notMet = claim({
      claim_id: 'NOT-MET',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    // Assessment-Jurisdiction Mention Model (2026-08-28): explicit exclusion
    // is what makes NOT-MET's jurisdiction requirement genuinely not_met.
    const result = lookupTopicClaims(
      [g],
      [met, unresolved, notMet],
      facts({ jurisdiction: { included: [], excluded: ['United States'] }, toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'test-tool' } })] }),
    )
    expect(result.matches).toEqual([met])
    expect(result.diagnostics).toHaveLength(1)
    const detail = result.diagnostics[0].unmet_applicability
    expect(detail).toContainEqual({ claim_id: 'UNRESOLVED', requirement: { fact: 'tool_plan_tier', tool: 'test-tool', operator: 'equals', value: 'pro' }, status: 'unresolved' })
    expect(detail).toContainEqual({ claim_id: 'NOT-MET', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'not_met' })
    expect(detail).toHaveLength(2)
  })

  // D. two met + one unresolved
  test('D: two met claims + one unresolved claim -- both met claims retrieve, unresolved one preserved via diagnostic', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const metA = claim({ claim_id: 'MET-A', topic: 'commercial_use' })
    const metB = claim({ claim_id: 'MET-B', topic: 'commercial_use' })
    const unresolved = claim({
      claim_id: 'UNRESOLVED',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [metA, metB, unresolved], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches.map((m) => m.claim_id).sort()).toEqual(['MET-A', 'MET-B'])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'UNRESOLVED', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  // E. zero met + one unresolved -- existing Case 3A-compatible behavior unchanged
  test('E: zero met claims + one unresolved claim -- identical shape to the pre-existing Case-3A-compatible diagnostic (no behavior change for this pre-existing case)', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const unresolved = claim({
      claim_id: 'UNRESOLVED',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [unresolved], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toEqual([
      {
        identifier: 'commercial_use',
        reason: 'applicability_unmet',
        unmet_applicability: [{ claim_id: 'UNRESOLVED', requirement: { fact: 'jurisdiction', operator: 'equals', value: 'United States' }, status: 'unresolved' }],
      },
    ])
  })

  // F. zero met + all not_met
  test('F: zero met claims, all not_met -- diagnostic preserved with not_met detail for every claim, matches stay empty', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const notMetA = claim({ claim_id: 'NOT-MET-A', topic: 'commercial_use', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    const notMetB = claim({ claim_id: 'NOT-MET-B', topic: 'commercial_use', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    // Assessment-Jurisdiction Mention Model (2026-08-28): explicit exclusion
    // required for genuine not_met.
    const result = lookupTopicClaims([g], [notMetA, notMetB], facts({ jurisdiction: { included: [], excluded: ['United States'] } }))
    expect(result.matches).toEqual([])
    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].unmet_applicability?.every((d) => d.status === 'not_met')).toBe(true)
    expect(result.diagnostics[0].unmet_applicability?.map((d) => d.claim_id).sort()).toEqual(['NOT-MET-A', 'NOT-MET-B'])
  })

  // G. multiple unresolved claims -> deterministic claim identities, no accidental loss
  test('G: multiple distinct unresolved claims in the same category -- all preserved, no accidental loss or collapsing', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'commercial_use' })
    const unresolvedA = claim({ claim_id: 'UNRESOLVED-A', topic: 'commercial_use', applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }] })
    const unresolvedB = claim({
      claim_id: 'UNRESOLVED-B',
      topic: 'commercial_use',
      applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'test-tool', operator: 'equals', value: 'pro' }],
    })
    const result = lookupTopicClaims(
      [g],
      [met, unresolvedA, unresolvedB],
      facts({ jurisdiction: { included: [], excluded: [] }, toolMentions: [toolMention({ mention_id: 'tm-1', resolution: { kind: 'canonical', identifier: 'test-tool' } })] }),
    )
    expect(result.matches).toEqual([met])
    expect(result.diagnostics[0].unmet_applicability?.map((d) => d.claim_id).sort()).toEqual(['UNRESOLVED-A', 'UNRESOLVED-B'])
  })

  // Provider-scope protection (§12): a provider-mismatched claim must never contribute to the diagnostic.
  test('provider-scope protection: a provider-mismatched sibling never contributes unmet_applicability detail -- it was never a candidate in the first place', () => {
    const g = goal({ goal_id: 'g-1', category: 'third_party_source_rights' })
    const met = claim({ claim_id: 'MET', topic: 'third_party_source_rights' })
    const otherProvider = claim({
      claim_id: 'OTHER-PROVIDER',
      topic: 'third_party_source_rights',
      provider_scope: ['getty'],
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    // 'istock' supplied -- OTHER-PROVIDER (scoped to 'getty') never becomes a candidate at all.
    const result = lookupTopicClaims([g], [met, otherProvider], facts({ jurisdiction: { included: [], excluded: [] } }), ['istock'])
    expect(result.matches).toEqual([met])
    expect(result.diagnostics).toEqual([])
  })

  // Lifecycle/eligibility protection (§13): an ineligible sibling must never contribute unmet_applicability detail.
  test('lifecycle/eligibility protection: a CRC-Eligible: No sibling never contributes unmet_applicability detail, even though it is applicability-gated', () => {
    const g = goal({ goal_id: 'g-1', category: 'commercial_use' })
    const met = claim({ claim_id: 'MET', topic: 'commercial_use' })
    const ineligible = claim({
      claim_id: 'INELIGIBLE',
      topic: 'commercial_use',
      crc_eligible: 'No',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    })
    const result = lookupTopicClaims([g], [met, ineligible], facts({ jurisdiction: { included: [], excluded: [] } }))
    expect(result.matches).toEqual([met])
    expect(result.diagnostics).toEqual([])
  })
})
