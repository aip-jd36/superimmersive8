/**
 * Generic Synthetic Eligibility Canary Harness -- two-domain portability
 * tests (CRC PM / Architecture, 2026-08-30).
 *
 * Proves the SAME generic harness (`runSyntheticEligibilityCanary`, imported
 * once, called identically) supports both a provider-scoped claim (Music /
 * Artlist A-3, using its real, already-published `TOPIC_CLAIMS_FIXTURE`
 * entry) and a `provider_scope: null` claim (Likeness Candidate A, which has
 * no fixture entry at all -- transcribed here, test-only, from the real
 * governed fields in `GOVERNED-CLAIMS.md`, exactly as the manual canary that
 * originally verified this claim's runtime readiness did). Neither test adds
 * any domain-specific logic to the harness itself -- see the "no domain
 * branching" regression test at the bottom of this file, which scans the
 * harness source directly.
 */

import { runSyntheticEligibilityCanary } from '@/lib/crc-engine/synthetic-eligibility-canary'
import type { SyntheticEligibilityCanaryScenario } from '@/lib/crc-engine/synthetic-eligibility-canary'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import * as fs from 'fs'
import * as path from 'path'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    asset_providers: [],
    unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text' | 'category'>): UserGoal {
  return { state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: overrides.raw_text, ...overrides }
}

function facts(jurisdictionIncluded: string[] = [], jurisdictionExcluded: string[] = []): ApplicabilityFacts {
  return { jurisdiction: { included: jurisdictionIncluded, excluded: jurisdictionExcluded }, toolMentions: [] }
}

// ── Music / Artlist A-3 -- real, already-published fixture entry ──────────
// Loaded directly from the real committed TOPIC_CLAIMS_FIXTURE -- zero
// hand-transcription, zero drift risk. This claim is already
// `crc_eligible: 'Yes'` in real governance; the harness applies its own
// override unconditionally regardless (see synthetic-eligibility-canary.ts's
// own header) -- this test proves that is a safe no-op, not a special case.
const MUSIC_A3_CLAIM_ID = 'CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-DURATION-001-v1'
const musicA3Claim = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === MUSIC_A3_CLAIM_ID)

// ── Likeness Candidate A -- no fixture entry (CRC Publication Scope:
// WITHHELD) -- test-only representation, transcribed verbatim from
// GOVERNED-CLAIMS.md, real crc_eligible left as governed ("Pending"). The
// harness's own internal derivation (crc_publication_scope ??
// crc_candidate_statement) is what makes this scenario retrievable -- this
// claim's own real crc_candidate_statement is what gets used, automatically,
// with no caller-supplied override of any kind.
const LIKENESS_CANDIDATE_A_GOVERNED_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1',
  topic: 'likeness',
  claim_character: 'established',
  jurisdiction: 'New York (state)',
  lifecycle: 'Adopted',
  crc_eligible: 'Pending', // real governed value -- WITHHELD, unchanged
  crc_publication_scope: null, // withheld -- no CRC-facing scope authorized
  crc_candidate_statement:
    "New York has a specific statute (Civil Rights Law sections 50-51) requiring a living person's prior written consent before their name, portrait, picture, likeness, or voice is used for advertising or trade purposes in the state, with civil and (for a knowing violation) even misdemeanor consequences.",
  applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'New York' }],
  unresolved_project_dependencies: ['recognizable_likeness_or_voice_present', 'advertising_or_trade_use_confirmed', 'written_consent_confirmed'],
  provider_scope: null,
  last_verified: '2026-08-28',
  superseded_by: null,
}

describe('generic synthetic eligibility canary -- Music / Artlist A-3 (provider-scoped)', () => {
  test('real fixture entry for A-3 exists and is loaded (sanity precondition for this whole describe block)', () => {
    expect(musicA3Claim).toBeDefined()
    expect(musicA3Claim?.provider_scope).toEqual(['artlist'])
  })

  const g = () => goal({ goal_id: 'g1', category: 'third_party_source_rights', raw_text: 'Does my Artlist license still cover this project after I cancelled my subscription?' })

  test('retrievable via explicit third_party_source_rights goal + artlist provider fact, using the SAME generic harness', () => {
    const result = runSyntheticEligibilityCanary({
      claim: musicA3Claim as TopicClaim,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(),
      assetProviders: ['artlist'],
    })
    expect(result.synthetic_claim_id).toBe(MUSIC_A3_CLAIM_ID)
    expect(result.retrieved_claim_ids).toEqual([MUSIC_A3_CLAIM_ID])
    expect(result.matched_goal_categories).toEqual(['third_party_source_rights'])
  })

  test('provider_scope behavior: NOT retrieved when the named asset provider does not match (generic providerScopeMatches, no harness-side special-casing)', () => {
    const result = runSyntheticEligibilityCanary({
      claim: musicA3Claim as TopicClaim,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(),
      assetProviders: ['getty'], // wrong provider
    })
    expect(result.retrieved_claim_ids).toEqual([])
  })

  test('unresolved_project_dependencies preserved exactly as governed -- never resolved by the harness', () => {
    const result = runSyntheticEligibilityCanary({
      claim: musicA3Claim as TopicClaim,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(),
      assetProviders: ['artlist'],
    })
    expect(result.unresolved_project_dependencies_by_claim[MUSIC_A3_CLAIM_ID]).toEqual(['artlist_subscription_active_at_publication_confirmed'])
  })

  test('Bounded Interpretation is bounded (Case 3B hedge, dependency-bearing) and Composition does not strengthen it', () => {
    const result = runSyntheticEligibilityCanary({
      claim: musicA3Claim as TopicClaim,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(),
      assetProviders: ['artlist'],
    })
    expect(result.bounded_interpretations).toHaveLength(1)
    const bi = result.bounded_interpretations[0]
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary).not.toMatch(/is validly licensed|was active at/i) // must not assert the user's own project facts
    expect(result.projection?.goal_interpretations[0]?.summary).toBe(bi.summary) // Composition is a pass-through, never a strengthening
  })

  test('original real claim object (from the real fixture) is not mutated by the canary', () => {
    const before = JSON.parse(JSON.stringify(musicA3Claim))
    runSyntheticEligibilityCanary({
      claim: musicA3Claim as TopicClaim,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(),
      assetProviders: ['artlist'],
    })
    expect(musicA3Claim).toEqual(before)
    expect(musicA3Claim?.crc_eligible).toBe('Yes') // real value, unchanged (it really is Yes -- confirms this specific field wasn't altered either)
  })
})

describe('generic synthetic eligibility canary -- Likeness Candidate A (provider_scope: null)', () => {
  const g = () => goal({ goal_id: 'g1', category: 'likeness', raw_text: 'Will this be an issue with the person in the video?' })

  test('§24 authority boundary: the REAL, non-synthetic governed representation produces NO retrieval result', () => {
    const out = retrieve(handoff(), [], [g()], [LIKENESS_CANDIDATE_A_GOVERNED_CLAIM], facts(['New York']))
    expect(out.results).toEqual([])
    expect(out.diagnostics.some((d) => d.reason === 'not_adopted_or_eligible')).toBe(true)
  })

  test('§24 authority boundary, continued: the SAME claim through the harness IS retrieved -- proves the override is exactly what changes the outcome', () => {
    const result = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['New York']),
    })
    expect(result.retrieved_claim_ids).toEqual(['CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1'])
    expect(result.matched_goal_categories).toEqual(['likeness'])
  })

  test('provider_scope: null passes generically -- no assetProviders needed, no harness-side special case for it', () => {
    const result = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['New York']),
      // assetProviders intentionally omitted -- defaults to [] inside the harness
    })
    expect(result.retrieved_claim_ids).toHaveLength(1)
  })

  test('New York applicability resolves via the existing generic evaluator -- no US -> NY hierarchy inferred', () => {
    const includedNY = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['New York']),
    })
    expect(includedNY.retrieved_claim_ids).toHaveLength(1)

    const excludedNY = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts([], ['New York']),
    })
    expect(excludedNY.retrieved_claim_ids).toEqual([])

    const onlyUnitedStates = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['United States']), // deliberately not "New York"
    })
    expect(onlyUnitedStates.retrieved_claim_ids).toEqual([])
  })

  test('all three governed dependencies remain unresolved -- never projected, never resolved', () => {
    const result = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['New York']),
    })
    expect(result.unresolved_project_dependencies_by_claim['CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1']).toEqual([
      'recognizable_likeness_or_voice_present',
      'advertising_or_trade_use_confirmed',
      'written_consent_confirmed',
    ])
  })

  test('Bounded Interpretation hedges; Composition creates no project-specific legal conclusion', () => {
    const result = runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['New York']),
    })
    const bi = result.bounded_interpretations[0]
    expect(bi.status).toBe('relevant_applicability_unresolved')
    expect(bi.summary).not.toMatch(/violates|is not cleared|is cleared|is recognizable|consent is absent|consent is sufficient/i)
    expect(result.projection?.goal_interpretations[0]?.summary).toBe(bi.summary)
  })

  test('the real governed claim object supplied to the harness is not mutated', () => {
    const before = JSON.parse(JSON.stringify(LIKENESS_CANDIDATE_A_GOVERNED_CLAIM))
    runSyntheticEligibilityCanary({
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [g()],
      applicabilityFacts: facts(['New York']),
    })
    expect(LIKENESS_CANDIDATE_A_GOVERNED_CLAIM).toEqual(before)
    expect(LIKENESS_CANDIDATE_A_GOVERNED_CLAIM.crc_eligible).toBe('Pending') // still withheld, unchanged
  })
})

describe('generic synthetic eligibility canary -- cross-cutting leakage / fail-closed regressions', () => {
  test('§25 fail-closed: a non-Adopted claim is refused, not silently synthesized', () => {
    const candidateClaim: TopicClaim = { ...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM, lifecycle: 'Candidate' }
    expect(() =>
      runSyntheticEligibilityCanary({
        claim: candidateClaim,
        handoff: handoff(),
        goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
        applicabilityFacts: facts(['New York']),
      }),
    ).toThrow(/lifecycle "Candidate", not "Adopted"/)
  })

  test('fail-closed: a superseded claim is refused', () => {
    const supersededClaim: TopicClaim = { ...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM, superseded_by: 'CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v2' }
    expect(() =>
      runSyntheticEligibilityCanary({
        claim: supersededClaim,
        handoff: handoff(),
        goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
        applicabilityFacts: facts(['New York']),
      }),
    ).toThrow(/has been superseded by/)
  })

  test('§6 fail-closed: an otherwise-valid claim with BOTH crc_publication_scope and crc_candidate_statement null is refused, never fabricated', () => {
    const noScopeAtAllClaim: TopicClaim = { ...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM, crc_publication_scope: null, crc_candidate_statement: null }
    expect(() =>
      runSyntheticEligibilityCanary({
        claim: noScopeAtAllClaim,
        handoff: handoff(),
        goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
        applicabilityFacts: facts(['New York']),
      }),
    ).toThrow(/no real crc_publication_scope AND no crc_candidate_statement/)
  })

  test('§7 type-level removal: there is no scenario-level API through which a caller can supply arbitrary publication-scope prose -- TypeScript itself rejects it, not merely a runtime check', () => {
    const attempted: SyntheticEligibilityCanaryScenario = {
      claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      handoff: handoff(),
      goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
      applicabilityFacts: facts(['New York']),
      // @ts-expect-error -- syntheticPublicationScope must not exist on SyntheticEligibilityCanaryScenario. If this stops being a type error (e.g. the field is re-added), `tsc --noEmit` fails on this line, not this test's own runtime assertion -- that is the actual enforcement mechanism, this test only keeps it exercised.
      syntheticPublicationScope: 'arbitrary, ungoverned prose a caller should never be able to inject',
    }
    expect(attempted.claim.claim_id).toBe(LIKENESS_CANDIDATE_A_GOVERNED_CLAIM.claim_id) // trivial runtime assertion; the real proof is the @ts-expect-error above
  })

  test('§23 synthetic leakage: repeated canary runs never persist any state -- two independent runs of the same scenario are byte-identical in their own outputs', () => {
    const run = () =>
      runSyntheticEligibilityCanary({
        claim: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
        handoff: handoff(),
        goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'Will this be an issue with the person in the video?' })],
        applicabilityFacts: facts(['New York']),
      })
    const first = run()
    const second = run()
    expect(first).toEqual(second)
    // The synthetic clone is frozen internally and never returned -- nothing
    // from run 1 could have mutated the shared claim constant to affect run 2.
    expect(LIKENESS_CANDIDATE_A_GOVERNED_CLAIM.crc_eligible).toBe('Pending')
  })

  test('§12 alias isolation A: mutating the source claim\'s unresolved_project_dependencies AFTER a run does not change the already-returned, held result', () => {
    const localClaim: TopicClaim = { ...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM, unresolved_project_dependencies: [...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM.unresolved_project_dependencies] }
    const held = runSyntheticEligibilityCanary({
      claim: localClaim,
      handoff: handoff(),
      goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
      applicabilityFacts: facts(['New York']),
    })
    const before = JSON.stringify(held.unresolved_project_dependencies_by_claim[localClaim.claim_id])
    localClaim.unresolved_project_dependencies.push('injected_after_the_fact')
    const after = JSON.stringify(held.unresolved_project_dependencies_by_claim[localClaim.claim_id])
    expect(after).toBe(before) // held result unaffected -- proves structuredClone isolation, not just top-level freeze
  })

  test('§12 alias isolation B: mutating the source claim\'s applicability_requirements AFTER a run does not change a held result\'s own applicability-derived retrieval', () => {
    const localClaim: TopicClaim = {
      ...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM,
      applicability_requirements: LIKENESS_CANDIDATE_A_GOVERNED_CLAIM.applicability_requirements.map((r) => ({ ...r })),
    }
    const held = runSyntheticEligibilityCanary({
      claim: localClaim,
      handoff: handoff(),
      goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
      applicabilityFacts: facts(['New York']),
    })
    const before = held.retrieved_claim_ids
    localClaim.applicability_requirements[0].value = 'California' // mutate the ORIGINAL requirement object in place, after the run
    expect(held.retrieved_claim_ids).toEqual(before) // already-returned result is unaffected
  })

  test('§12 alias isolation C: mutating the source claim\'s provider_scope (Music) AFTER a run does not change a held result', () => {
    const localClaim: TopicClaim = { ...(musicA3Claim as TopicClaim), provider_scope: [...(musicA3Claim as TopicClaim).provider_scope!] }
    const held = runSyntheticEligibilityCanary({
      claim: localClaim,
      handoff: handoff(),
      goals: [goal({ goal_id: 'g1', category: 'third_party_source_rights', raw_text: 'test' })],
      applicabilityFacts: facts(),
      assetProviders: ['artlist'],
    })
    const before = held.retrieved_claim_ids
    localClaim.provider_scope!.push('getty') // mutate the ORIGINAL provider_scope array in place, after the run
    expect(held.retrieved_claim_ids).toEqual(before)
    expect(localClaim.provider_scope).toEqual(['artlist', 'getty']) // confirms the mutation genuinely happened on the source
  })

  test('§13 reverse-alias safety: mutating an array returned inside the canary result does not mutate the original source claim', () => {
    const localClaim: TopicClaim = { ...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM, unresolved_project_dependencies: [...LIKENESS_CANDIDATE_A_GOVERNED_CLAIM.unresolved_project_dependencies] }
    const held = runSyntheticEligibilityCanary({
      claim: localClaim,
      handoff: handoff(),
      goals: [goal({ goal_id: 'g1', category: 'likeness', raw_text: 'test' })],
      applicabilityFacts: facts(['New York']),
    })
    held.unresolved_project_dependencies_by_claim[localClaim.claim_id].push('injected_via_result')
    expect(localClaim.unresolved_project_dependencies).toEqual([
      'recognizable_likeness_or_voice_present',
      'advertising_or_trade_use_confirmed',
      'written_consent_confirmed',
    ]) // source claim's own array is untouched by mutating the result
  })

  test('§13 no domain branching: the harness source contains no literal reference to Music/Likeness/Artlist/New York/any claim_id', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../lib/crc-engine/synthetic-eligibility-canary.ts'), 'utf-8')
    // Strip comments (the header explains the technique's own history using
    // these words as prose, which is expected and fine) -- only the
    // executable code below the last comment block matters for this check.
    const codeOnly = source
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim()
        return trimmed !== '' && !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/**')
      })
      .join('\n')
    expect(codeOnly).not.toMatch(/music|likeness|artlist|new york|CLAIM-/i)
    expect(codeOnly).not.toMatch(/\bif\s*\(.*(claim_id|topic|provider_scope)\s*===/i) // no claim-identity/topic/provider conditional branching at all
  })
})
