/**
 * ToolMention Supersession Fact Persistence milestone (2026-08-24).
 *
 * Reproduces, generically (Runway -- NOT Kling), the defect a live CRC UAT
 * exposed: a later, unrelated same-tool mention supersedes the active
 * ToolMention and silently resets access_surface/plan_tier/account_status
 * to unknown for any field the new candidate didn't itself address --
 * because attestCandidate builds every field fresh from only that turn's
 * own hints, with zero visibility into (or inheritance from) the mention
 * being superseded.
 *
 * Tests A-G below MUST fail against the pre-fix code and pass after the
 * generic merge fix (see extraction.ts's own new mergeToolMentionFields
 * helper, called only at the existing supersession dispatch site in
 * runExtractionPipeline -- no change to attestCandidate's own pure
 * candidate->fields contract).
 */

import type { StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'

function emptySU(): StructuredUnderstanding {
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
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'I used Runway.',
    kind: 'tool_mention',
    raw_tool_name: 'Runway',
    ...overrides,
  }
}

function activeMention(su: StructuredUnderstanding) {
  return su.tool_mentions.find((m) => m.superseded_by === null)
}

describe('A: omitted field persists -- a later same-tool mention that addresses nothing must not erase a previously confirmed account_status', () => {
  test('confirmed Member Account survives an unrelated later re-mention of the same tool', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway.' },
      constantExtractor([toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' })]),
    )
    expect(turn1.updated.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Member Account' })

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I generated it myself using Runway.' },
      constantExtractor([toolCandidate({ turn: 2, raw_text: 'I generated it myself using Runway.' })]),
    )
    expect(activeMention(turn2.updated)?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })
})

describe('B/C: explicit correction replaces (either direction)', () => {
  test('B: Member Account -> explicit Regular Account correction replaces it', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway.' },
      constantExtractor([toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Actually, I have a Regular Account.' },
      constantExtractor([
        toolCandidate({ turn: 2, raw_text: 'Actually, I have a Regular Account.', account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Regular Account' }),
      ]),
    )
    expect(activeMention(turn2.updated)?.account_status).toEqual({ state: 'confirmed', value: 'Regular Account' })
  })

  test('C: Regular Account -> explicit Member Account correction replaces it', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway.' },
      constantExtractor([toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Regular Account' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Actually, I have a Member Account.' },
      constantExtractor([
        toolCandidate({ turn: 2, raw_text: 'Actually, I have a Member Account.', account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' }),
      ]),
    )
    expect(activeMention(turn2.updated)?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })
})

describe('D: plan_tier generic persistence -- same mechanism, not an account_status special case', () => {
  test('confirmed plan_tier survives an unrelated later re-mention of the same tool', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway.' },
      constantExtractor([toolCandidate({ plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'paid' })]),
    )
    expect(turn1.updated.tool_mentions[0].plan_tier).toEqual({ state: 'confirmed', value: 'paid' })

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I edited it myself using Runway.' },
      constantExtractor([toolCandidate({ turn: 2, raw_text: 'I edited it myself using Runway.' })]),
    )
    expect(activeMention(turn2.updated)?.plan_tier).toEqual({ state: 'confirmed', value: 'paid' })
  })
})

describe('E: other new information still updates while untouched old facts survive', () => {
  test('a later mention that only addresses plan_tier updates plan_tier but leaves an already-confirmed account_status intact', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway.' },
      constantExtractor([toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I use the paid plan on Runway.' },
      constantExtractor([toolCandidate({ turn: 2, raw_text: 'I use the paid plan on Runway.', plan_tier_confidence_hint: 'confirmed', plan_tier_value_hint: 'paid' })]),
    )
    const active = activeMention(turn2.updated)
    expect(active?.plan_tier).toEqual({ state: 'confirmed', value: 'paid' })
    expect(active?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })
})

describe('F: different-tool isolation -- facts must never transfer between tools', () => {
  test('correcting one tool never populates a second, independently-mentioned tool', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway and ElevenLabs.' },
      constantExtractor([
        toolCandidate({ proposal_id: 'c1', account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' }),
        toolCandidate({ proposal_id: 'c2', raw_text: 'ElevenLabs', raw_tool_name: 'ElevenLabs' }),
      ]),
    )
    const runwayMention = turn1.updated.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'runway-gen3')
    const elevenLabsMention = turn1.updated.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'elevenlabs')
    expect(runwayMention?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
    expect(elevenLabsMention?.account_status).toEqual({ state: 'unknown' })

    // Re-mention ElevenLabs only, addressing nothing -- must stay unknown, never inherit Runway's Member Account.
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I also used ElevenLabs for the voice.' },
      constantExtractor([toolCandidate({ turn: 2, raw_text: 'I also used ElevenLabs for the voice.', raw_tool_name: 'ElevenLabs' })]),
    )
    const activeElevenLabs = turn2.updated.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'elevenlabs' && m.superseded_by === null)
    expect(activeElevenLabs?.account_status).toEqual({ state: 'unknown' })
  })
})

describe('G: explicit uncertainty/withdrawal fails closed -- must NOT always inherit', () => {
  test('a later mention that explicitly expresses uncertainty about account_status resets to unknown, never re-inheriting the old confirmed value', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Runway.' },
      constantExtractor([toolCandidate({ account_status_confidence_hint: 'confirmed', account_status_value_hint: 'Member Account' })]),
    )
    expect(turn1.updated.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Member Account' })

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: "Actually, I'm not sure what kind of account I have." },
      constantExtractor([
        toolCandidate({ turn: 2, raw_text: "Actually, I'm not sure what kind of account I have.", account_status_confidence_hint: 'unknown' }),
      ]),
    )
    expect(activeMention(turn2.updated)?.account_status).toEqual({ state: 'unknown' })
  })
})
