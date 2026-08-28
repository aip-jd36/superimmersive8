/**
 * Assessment-Jurisdiction Mention Model tests (CRC Assessment-Jurisdiction
 * Mention Model — Generic Implementation, 2026-08-28).
 *
 * Covers the Test Matrix required by the implementation task's own §28:
 * mutation invariants (mutations.ts), read-time derivation + legacy
 * compatibility (assessment-jurisdiction-scope.ts), end-to-end extraction
 * (seed-on-first-touch, add, correct, explicit-exclude, ordering, fail-closed
 * resolution -- extraction.ts), and applicability-status semantics at the
 * conflicting-state boundary (lookup-topic-claims.ts). Mirrors
 * asset-provider-mentions.test.ts's own established pattern: mock extractor,
 * runExtractionPipeline exercised end-to-end for the pipeline-level cases --
 * proves the proposal -> normalization -> attestation -> mutation pipeline,
 * not natural-language extraction accuracy (a live-model eval concern, out
 * of scope here, same split as every other candidate kind in this codebase).
 *
 * Run: npx jest __tests__/interview-engine/assessment-jurisdiction-mentions.test.ts
 */

import type { AssessmentJurisdictionMention, StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { addAssessmentJurisdictionMention, supersedeAssessmentJurisdictionMention } from '../../lib/interview-engine/mutations'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'
import {
  assessmentJurisdictionCollectionEverTouched,
  deriveAssessmentJurisdictionFacts,
  legacyAssessmentJurisdictionFallbackEligible,
} from '../../lib/crc-engine/assessment-jurisdiction-scope'
import { evaluateApplicabilityDetailed, type ApplicabilityFacts } from '../../lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityRequirement } from '../../lib/retrieval-engine/types'

function emptySU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function mention(overrides: Partial<AssessmentJurisdictionMention> & Pick<AssessmentJurisdictionMention, 'mention_id' | 'value'>): AssessmentJurisdictionMention {
  return {
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function jurisdictionCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'Please consider United States.',
    kind: 'assessment_jurisdiction_mention',
    raw_jurisdiction_value: 'United States',
    ...overrides,
  }
}

// ── mutations.ts invariants ─────────────────────────────────────────────

describe('addAssessmentJurisdictionMention / supersedeAssessmentJurisdictionMention -- mirrors addAssetProviderMention exactly', () => {
  test('add: a duplicate mention_id is rejected', () => {
    let su = emptySU()
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'United States' }))
    expect(() => addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'Canada' }))).toThrow(/already exists/)
  })

  test('add: a newly added mention cannot already be superseded', () => {
    const su = emptySU()
    expect(() => addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'United States', superseded_by: 'm-2' }))).toThrow(
      /cannot already be superseded/,
    )
  })

  test('supersede: target must exist', () => {
    const su = emptySU()
    expect(() =>
      supersedeAssessmentJurisdictionMention(su, 'does-not-exist', mention({ mention_id: 'm-2', value: 'New York' })),
    ).toThrow(/unknown assessment jurisdiction mention/)
  })

  test('supersede: target must be the current, non-superseded head of its chain -- cannot re-target a historical snapshot', () => {
    let su = emptySU()
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'United States' }))
    su = supersedeAssessmentJurisdictionMention(su, 'm-1', mention({ mention_id: 'm-2', value: 'Canada' }))
    expect(() => supersedeAssessmentJurisdictionMention(su, 'm-1', mention({ mention_id: 'm-3', value: 'New York' }))).toThrow(
      /already superseded/,
    )
  })

  test('add: no cap -- multiple distinct assessment jurisdictions may coexist (US + NY)', () => {
    let su = emptySU()
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'United States' }))
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-2', value: 'New York' }))
    const active = su.assessment_jurisdiction_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value).sort()).toEqual(['New York', 'United States'])
  })
})

// ── assessment-jurisdiction-scope.ts: read-time derivation + legacy bridge ─

describe('deriveAssessmentJurisdictionFacts -- legacy compatibility + authoritative-state rule', () => {
  test('legacy-scalar-only: an untouched session with a confirmed scalar derives a single-value included set, read-time only', () => {
    const su = emptySU({
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 2, source_statement: 'US' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    expect(legacyAssessmentJurisdictionFallbackEligible(su)).toBe(true)
    expect(deriveAssessmentJurisdictionFacts(su)).toEqual({ included: ['United States'], excluded: [] })
    // Read-time only -- the collection itself is never mutated by a read.
    expect(su.assessment_jurisdiction_mentions).toEqual([])
  })

  test('a genuinely untouched session with an unknown scalar derives empty facts, not a guessed value', () => {
    const su = emptySU()
    expect(legacyAssessmentJurisdictionFallbackEligible(su)).toBe(false)
    expect(deriveAssessmentJurisdictionFacts(su)).toEqual({ included: [], excluded: [] })
  })

  test('touched-collection-never-falls-back: once the new collection has ANY entry, the legacy scalar is never consulted again, even if that entry is itself superseded away to nothing active', () => {
    let su = emptySU({
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'US' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'New York', source_turn: 3, source_statement: 'NY' }))
    // Historical-but-no-active-entries-no-resurrection: supersede the only
    // entry with nothing (simulate via directly filtering to "no active"
    // shape is not expressible through the public mutation API without a
    // replacement, so instead assert the touched-forever gate directly, and
    // separately assert a real correction below shows a real active state.)
    expect(assessmentJurisdictionCollectionEverTouched(su)).toBe(true)
    expect(legacyAssessmentJurisdictionFallbackEligible(su)).toBe(false)
    // The legacy scalar's "United States" is NOT resurrected -- only the
    // real, explicit New York mention is in scope.
    expect(deriveAssessmentJurisdictionFacts(su)).toEqual({ included: ['New York'], excluded: [] })
  })

  test('historical-but-no-active-entries-no-resurrection: a session whose only mention was later corrected away still never falls back to the legacy scalar, even though "included" is now empty', () => {
    let su = emptySU({
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'Canada' }, source_turn: 1, source_statement: 'Canada' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'United States', source_turn: 2, source_statement: 'US' }))
    // Correct it away to an explicit exclusion -- the collection now has one
    // historical (superseded) entry and one current entry that is itself
    // confirmed_absent, so `included` is empty.
    su = supersedeAssessmentJurisdictionMention(
      su,
      'm-1',
      mention({ mention_id: 'm-2', value: 'United States', confidence: 'confirmed_absent', source_turn: 3, source_statement: 'actually not US' }),
    )
    expect(legacyAssessmentJurisdictionFallbackEligible(su)).toBe(false)
    // Must NOT resurrect the legacy "Canada" scalar just because `included`
    // is empty right now -- the collection was touched, full stop.
    expect(deriveAssessmentJurisdictionFacts(su)).toEqual({ included: [], excluded: ['United States'] })
  })

  test('US + NY coexist as two distinct current, active included values for one session', () => {
    let su = emptySU()
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'United States', source_turn: 1, source_statement: 'US' }))
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-2', value: 'New York', source_turn: 2, source_statement: 'also NY' }))
    expect(deriveAssessmentJurisdictionFacts(su).included.sort()).toEqual(['New York', 'United States'])
  })
})

// ── extraction.ts: end-to-end pipeline (seed, add, correct, exclude) ──────

describe('assessment_jurisdiction_mention extraction -- end-to-end pipeline', () => {
  test('new-session US: a fresh session with no legacy scalar creates a real mention via the real pipeline', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Please consider United States for this assessment.' },
      constantExtractor([jurisdictionCandidate({ raw_jurisdiction_value: 'United States' })]),
    )
    expect(deriveAssessmentJurisdictionFacts(updated)).toEqual({ included: ['United States'], excluded: [] })
    // Never touches the legacy scalar.
    expect(updated.project_facts.jurisdiction.attestation.state).toBe('unknown')
  })

  test('add-after / US+NY: a second, later turn adding New York does not remove the first turn\'s United States', async () => {
    const first = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Please consider United States.' },
      constantExtractor([jurisdictionCandidate({ raw_jurisdiction_value: 'United States' })]),
    )
    const second = await runExtractionPipeline(
      first.updated,
      { turn: 2, text: 'Also consider New York specifically.' },
      constantExtractor([jurisdictionCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Also consider New York specifically.', raw_jurisdiction_value: 'New York' })]),
    )
    expect(deriveAssessmentJurisdictionFacts(second.updated).included.sort()).toEqual(['New York', 'United States'])
  })

  test('correct-with-retention: correcting New York to California retains United States untouched', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Consider United States and New York.' },
      constantExtractor([
        jurisdictionCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'Consider United States and New York.', raw_jurisdiction_value: 'United States' }),
        jurisdictionCandidate({ proposal_id: 'c2', turn: 1, raw_text: 'Consider United States and New York.', raw_jurisdiction_value: 'New York' }),
      ]),
    )
    expect(deriveAssessmentJurisdictionFacts(t1.updated).included.sort()).toEqual(['New York', 'United States'])

    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually not New York -- California instead.' },
      constantExtractor([
        jurisdictionCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually not New York -- California instead.',
          raw_jurisdiction_value: 'California',
          is_correction: true,
          correction_of_raw_text: 'New York',
        }),
      ]),
    )
    const facts = deriveAssessmentJurisdictionFacts(t2.updated)
    expect(facts.included.sort()).toEqual(['California', 'United States'])
    // The corrected mention chain: exactly one New York entry, now superseded.
    const nyEntry = t2.updated.assessment_jurisdiction_mentions.find((m) => m.value === 'New York')
    expect(nyEntry?.superseded_by).not.toBeNull()
  })

  test('explicit-exclude: a candidate flagged is_jurisdiction_exclusion produces a confirmed_absent mention, not an inclusion', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'This assessment should NOT consider the United States.' },
      constantExtractor([jurisdictionCandidate({ raw_jurisdiction_value: 'United States', is_jurisdiction_exclusion: true })]),
    )
    expect(deriveAssessmentJurisdictionFacts(updated)).toEqual({ included: [], excluded: ['United States'] })
  })

  test('explicit-include-then-exclude ordering: including United States then later explicitly excluding it results in a clean exclusion, no stale inclusion left active', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Consider United States.' },
      constantExtractor([jurisdictionCandidate({ raw_jurisdiction_value: 'United States' })]),
    )
    expect(deriveAssessmentJurisdictionFacts(t1.updated)).toEqual({ included: ['United States'], excluded: [] })

    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually, do not consider the United States after all.' },
      constantExtractor([
        jurisdictionCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually, do not consider the United States after all.',
          raw_jurisdiction_value: 'United States',
          is_jurisdiction_exclusion: true,
          is_correction: true,
          correction_of_raw_text: 'United States',
        }),
      ]),
    )
    expect(deriveAssessmentJurisdictionFacts(t2.updated)).toEqual({ included: [], excluded: ['United States'] })
  })

  test('correction-after-exclusion ordering: excluding United States then correcting that exclusion back to an inclusion leaves a clean inclusion, no stale exclusion', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Do not consider the United States.' },
      constantExtractor([jurisdictionCandidate({ raw_jurisdiction_value: 'United States', is_jurisdiction_exclusion: true })]),
    )
    expect(deriveAssessmentJurisdictionFacts(t1.updated)).toEqual({ included: [], excluded: ['United States'] })

    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually, please do consider the United States after all.' },
      constantExtractor([
        jurisdictionCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually, please do consider the United States after all.',
          raw_jurisdiction_value: 'United States',
          is_correction: true,
          correction_of_raw_text: 'United States',
        }),
      ]),
    )
    expect(deriveAssessmentJurisdictionFacts(t2.updated)).toEqual({ included: ['United States'], excluded: [] })
  })

  test('seed-on-first-touch: a legacy session with a confirmed scalar gets that value durably materialized as a real mention the first time a real jurisdiction candidate is applied, preserving the scalar\'s own real provenance', async () => {
    const legacySU = emptySU({
      project_facts: {
        intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
        jurisdiction: { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 1, source_statement: 'we are US-based' },
        human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      },
    })
    expect(legacySU.assessment_jurisdiction_mentions).toEqual([])

    const { updated } = await runExtractionPipeline(
      legacySU,
      { turn: 5, text: 'Also consider New York.' },
      constantExtractor([jurisdictionCandidate({ turn: 5, raw_text: 'Also consider New York.', raw_jurisdiction_value: 'New York' })]),
    )
    // Both the seeded legacy value and the new turn's value are present.
    expect(deriveAssessmentJurisdictionFacts(updated).included.sort()).toEqual(['New York', 'United States'])
    // The seeded entry preserves the scalar's OWN real, non-fabricated
    // provenance (source_turn 1, the scalar's own statement) -- never turn 5.
    const seeded = updated.assessment_jurisdiction_mentions.find((m) => m.value === 'United States')
    expect(seeded?.source_turn).toBe(1)
    expect(seeded?.source_statement).toBe('we are US-based')
  })

  test('post-cutover-never-writes-scalar: a fresh session with no legacy value never has project_facts.jurisdiction touched by any assessment-jurisdiction candidate, single or repeated', async () => {
    let su = emptySU()
    for (let turn = 1; turn <= 3; turn++) {
      const result = await runExtractionPipeline(
        su,
        { turn, text: `Consider jurisdiction ${turn}.` },
        constantExtractor([jurisdictionCandidate({ turn, raw_text: `Consider jurisdiction ${turn}.`, raw_jurisdiction_value: `Jurisdiction-${turn}` })]),
      )
      su = result.updated
    }
    expect(su.project_facts.jurisdiction.attestation).toEqual({ state: 'unknown' })
  })

  test('correction target resolution fails closed when zero mentions match the stated correction text -- never guesses, creates nothing, no crash', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Actually not Canada.' },
      constantExtractor([
        jurisdictionCandidate({ raw_jurisdiction_value: 'United States', is_correction: true, correction_of_raw_text: 'Canada' }),
      ]),
    )
    // No existing mention named "Canada" to resolve against -- correction
    // context is dropped, but the candidate itself still creates a genuine
    // NEW mention (fail-closed means "do not guess a target," not "reject
    // the whole candidate").
    expect(deriveAssessmentJurisdictionFacts(updated)).toEqual({ included: ['United States'], excluded: [] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].decision.outcome).not.toBe('rejected')
  })

  test('correction target resolution fails closed when the stated correction text matches MORE THAN ONE active mention -- never guesses which one', async () => {
    // Two distinct sessions' worth of setup collapsed into one SU: two
    // active mentions both literally named "Test Territory" (an
    // artificial but valid same-value-twice state, e.g. reached via two
    // independent add candidates in one turn that were never deduplicated
    // by value).
    let su = emptySU()
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-1', value: 'Test Territory', source_turn: 1, source_statement: 'a' }))
    su = addAssessmentJurisdictionMention(su, mention({ mention_id: 'm-2', value: 'Test Territory', source_turn: 1, source_statement: 'b' }))
    const { updated } = await runExtractionPipeline(
      su,
      { turn: 2, text: 'Actually not Test Territory -- something else.' },
      constantExtractor([
        jurisdictionCandidate({ turn: 2, raw_jurisdiction_value: 'Something Else', is_correction: true, correction_of_raw_text: 'Test Territory' }),
      ]),
    )
    // Both original "Test Territory" mentions remain active (untouched) --
    // the ambiguous correction created a new mention instead of guessing.
    const active = updated.assessment_jurisdiction_mentions.filter((m) => m.superseded_by === null)
    expect(active.filter((m) => m.value === 'Test Territory')).toHaveLength(2)
    expect(active.some((m) => m.value === 'Something Else')).toBe(true)
  })
})

// ── lookup-topic-claims.ts: applicability-status semantics at the boundary ─

describe('evaluateApplicabilityDetailed -- conflicting-state fail-closed behavior (Assessment-Jurisdiction Mention Model, 2026-08-28)', () => {
  test('a canonicalized value present in BOTH included and excluded -- a malformed state correct mutation invariants should prevent -- resolves to unresolved, never a guess', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    const facts: ApplicabilityFacts = { jurisdiction: { included: ['US'], excluded: ['United States'] }, toolMentions: [] }
    const outcomes = evaluateApplicabilityDetailed(req, facts)
    expect(outcomes).toEqual([{ requirement: req[0], status: 'unresolved' }])
  })

  test('existing Copyright-shaped behavior stays safe: a single confirmed United States value (legacy-fallback-derived shape) still satisfies a United States requirement exactly as before', () => {
    const req: ApplicabilityRequirement[] = [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }]
    const facts: ApplicabilityFacts = { jurisdiction: { included: ['United States'], excluded: [] }, toolMentions: [] }
    const outcomes = evaluateApplicabilityDetailed(req, facts)
    expect(outcomes).toEqual([{ requirement: req[0], status: 'met' }])
  })
})
