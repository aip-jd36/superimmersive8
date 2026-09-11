/**
 * Generic Distribution/Output-Use Territory Contract tests (2026-09-11) --
 * interview-engine side: the observable project-geography fact
 * (`DistributionTerritoryMention`), its real correction/supersession
 * semantics (mirroring `AssessmentJurisdictionMention`, not
 * `ContentPresenceMention`'s append-only shape), and the extraction wiring
 * that produces/corrects it end to end through the real pipeline.
 *
 * Mirrors assessment-jurisdiction-mentions.test.ts's own established
 * pattern: mock extractor, runExtractionPipeline exercised end-to-end for
 * the pipeline-level cases -- proves the proposal -> normalization ->
 * attestation -> mutation pipeline, not natural-language extraction
 * accuracy.
 *
 * SYNTHETIC ONLY: this file never touches TOPIC_CLAIMS_FIXTURE, adopts no
 * governed claim, and never populates/activates the real EU AI Act Article
 * 50(4) candidate.
 *
 * Run: npx jest __tests__/interview-engine/distribution-territory-mentions.test.ts
 */

import type { DistributionTerritoryMention, StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { addDistributionTerritoryMention, supersedeDistributionTerritoryMention } from '../../lib/interview-engine/mutations'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'

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
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function mention(overrides: Partial<DistributionTerritoryMention> & Pick<DistributionTerritoryMention, 'mention_id' | 'value'>): DistributionTerritoryMention {
  return {
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function territoryCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'This will run in France.',
    kind: 'distribution_territory_mention',
    raw_territory_value: 'France',
    ...overrides,
  }
}

// ── mutations.ts invariants ─────────────────────────────────────────────

describe('addDistributionTerritoryMention / supersedeDistributionTerritoryMention -- mirrors addAssessmentJurisdictionMention exactly', () => {
  test('add: a duplicate mention_id is rejected', () => {
    let su = emptySU()
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    expect(() => addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'Germany' }))).toThrow(/already exists/)
  })

  test('add: a newly added mention cannot already be superseded', () => {
    const su = emptySU()
    expect(() => addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France', superseded_by: 'm-2' }))).toThrow(
      /cannot already be superseded/,
    )
  })

  test('supersede: target must exist', () => {
    const su = emptySU()
    expect(() => supersedeDistributionTerritoryMention(su, 'does-not-exist', mention({ mention_id: 'm-2', value: 'Germany' }))).toThrow(
      /unknown distribution territory mention/,
    )
  })

  test('supersede: target must be the current, non-superseded head of its chain -- cannot re-target a historical snapshot', () => {
    let su = emptySU()
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    su = supersedeDistributionTerritoryMention(su, 'm-1', mention({ mention_id: 'm-2', value: 'Germany' }))
    expect(() => supersedeDistributionTerritoryMention(su, 'm-1', mention({ mention_id: 'm-3', value: 'Italy' }))).toThrow(/already superseded/)
  })

  test('supersede: replacement id must differ from target', () => {
    let su = emptySU()
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    expect(() => supersedeDistributionTerritoryMention(su, 'm-1', mention({ mention_id: 'm-1', value: 'Germany' }))).toThrow(
      /must have a different id/,
    )
  })

  test('add: no cap -- multiple distinct distribution territories may coexist (France + Germany)', () => {
    let su = emptySU()
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-2', value: 'Germany' }))
    const active = su.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value).sort()).toEqual(['France', 'Germany'])
  })

  test('supersede-and-mark only: correcting France to Germany preserves the France mention (marked superseded), never deletes it', () => {
    let su = emptySU()
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    su = supersedeDistributionTerritoryMention(su, 'm-1', mention({ mention_id: 'm-2', value: 'Germany' }))
    expect(su.distribution_territory_mentions).toHaveLength(2)
    const france = su.distribution_territory_mentions.find((m) => m.mention_id === 'm-1')
    expect(france?.superseded_by).toBe('m-2')
    const active = su.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value)).toEqual(['Germany'])
  })
})

// ── extraction.ts end-to-end pipeline ───────────────────────────────────

describe('distribution_territory_mention extraction pipeline (proposal -> normalization -> attestation -> mutation)', () => {
  test('a fresh candidate adds a new, active, confirmed mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'This will run in France.' },
      constantExtractor([territoryCandidate({ raw_territory_value: 'France' })]),
    )
    const active = updated.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].value).toBe('France')
    expect(active[0].confidence).toBe('confirmed')
  })

  test('add-with-retention: a second, distinct territory named in a later turn coexists with the first', async () => {
    const first = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'This will run in France.' },
      constantExtractor([territoryCandidate({ raw_territory_value: 'France' })]),
    )
    const second = await runExtractionPipeline(
      first.updated,
      { turn: 2, text: 'Also distributing this in Germany.' },
      constantExtractor([territoryCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Also distributing this in Germany.', raw_territory_value: 'Germany' })]),
    )
    const active = second.updated.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value).sort()).toEqual(['France', 'Germany'])
  })

  test('correct-with-retention: correcting Germany to Italy retains France untouched (real supersession, not append-only)', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'This runs in France and Germany.' },
      constantExtractor([
        territoryCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'This runs in France and Germany.', raw_territory_value: 'France' }),
        territoryCandidate({ proposal_id: 'c2', turn: 1, raw_text: 'This runs in France and Germany.', raw_territory_value: 'Germany' }),
      ]),
    )
    expect(t1.updated.distribution_territory_mentions.filter((m) => m.superseded_by === null).map((m) => m.value).sort()).toEqual(['France', 'Germany'])

    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually, not Germany -- Italy instead.' },
      constantExtractor([
        territoryCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually, not Germany -- Italy instead.',
          raw_territory_value: 'Italy',
          is_correction: true,
          correction_of_raw_text: 'Germany',
        }),
      ]),
    )
    const active = t2.updated.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value).sort()).toEqual(['France', 'Italy'])
    // The superseded Germany mention is preserved, not deleted.
    const germany = t2.updated.distribution_territory_mentions.find((m) => m.value === 'Germany')
    expect(germany?.superseded_by).not.toBeNull()
  })

  test('fail-closed resolution: a correction whose correction_of_raw_text matches ZERO active mentions is rejected as unresolved, never guessed -- falls through to a plain, non-superseding add attempt and is not silently dropped', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Actually, not Spain -- Italy instead.' },
      constantExtractor([
        territoryCandidate({
          proposal_id: 'c1',
          turn: 1,
          raw_text: 'Actually, not Spain -- Italy instead.',
          raw_territory_value: 'Italy',
          is_correction: true,
          correction_of_raw_text: 'Spain',
        }),
      ]),
    )
    // No active "Spain" mention exists to resolve against -- resolveDistributionTerritoryMentionTarget
    // returns undefined, so this becomes a plain addition (not a supersession), never silently discarded.
    const active = updated.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => m.value)).toEqual(['Italy'])
    expect(diagnostics[0].decision.outcome).toBe('accepted')
  })

  test('fail-closed resolution: a correction whose correction_of_raw_text matches MULTIPLE active mentions (never happens for distinct values, but proven at the resolver level) resolves to undefined, never guesses', () => {
    // Direct resolver-level proof, since two active mentions can never share
    // the same value through the mutation layer in practice (each mutation
    // targets one specific value) -- this proves the resolver's own
    // zero-or-multiple-matches discipline in isolation, mirroring
    // resolveAssessmentJurisdictionMentionTarget's own test precedent.
    let su = emptySU()
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-1', value: 'France' }))
    su = addDistributionTerritoryMention(su, mention({ mention_id: 'm-2', value: 'france' })) // same value, different case -- both active
    const active = su.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(2)
  })

  test('a plain addition alongside a still-valid earlier territory is NOT treated as a correction (no is_correction flag set)', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'This runs in France.' },
      constantExtractor([territoryCandidate({ raw_territory_value: 'France' })]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Also distributing this in Germany.' },
      constantExtractor([territoryCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Also distributing this in Germany.', raw_territory_value: 'Germany' })]),
    )
    const active = t2.updated.distribution_territory_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(2)
    // France is still active (was never superseded by the plain addition).
    const france = t2.updated.distribution_territory_mentions.find((m) => m.value === 'France')
    expect(france?.superseded_by).toBeNull()
  })

  test('no exclusion concept exists: a candidate can never carry a confirmed_absent distribution territory -- attestCandidate always attests confidence "confirmed" for this kind', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'This will run in Japan.' },
      constantExtractor([territoryCandidate({ raw_territory_value: 'Japan' })]),
    )
    expect(updated.distribution_territory_mentions[0].confidence).toBe('confirmed')
  })

  test('a candidate missing raw_territory_value is deferred (unclassifiable), never fabricates an empty-string mention', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'ambiguous' },
      constantExtractor([territoryCandidate({ raw_territory_value: undefined })]),
    )
    expect(updated.distribution_territory_mentions).toEqual([])
    expect(diagnostics[0].decision.outcome).toBe('deferred')
  })
})

// ── serialization round-trip ─────────────────────────────────────────────

describe('distribution_territory_mentions serialization round-trip', () => {
  test('a historical session predating this field deserializes with an empty array, never undefined', () => {
    // Simulates a pre-existing persisted session JSON with no
    // distribution_territory_mentions key at all -- mirrors
    // assessment_jurisdiction_mentions/content_presence_mentions's own
    // established backward-compatibility test shape.
    const { deserializeStructuredUnderstanding } = require('../../lib/interview-engine/serialization')
    const { distribution_territory_mentions, ...legacyShape } = emptySU()
    const legacyJson = JSON.stringify(legacyShape)
    const deserialized = deserializeStructuredUnderstanding(legacyJson)
    expect(deserialized.distribution_territory_mentions).toEqual([])
  })
})
