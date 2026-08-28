/**
 * Deterministic extraction-contract tests for the Minimal Generic
 * tool_account_status Capture milestone (2026-08-24).
 *
 * Proves the pipeline-level (attestCandidate / resolveAttestedToolField)
 * half of the mechanism: given a CandidateObservation carrying
 * account_status_confidence_hint/account_status_value_hint, the resulting
 * ToolMention.account_status is populated (or correctly left unknown)
 * exactly as the confidence/value hint pair dictates -- mirrors the
 * existing plan_tier/access_surface test style in extraction.test.ts
 * exactly (same emptySU/toolCandidate helper shapes, same
 * runExtractionPipeline + constantExtractor harness).
 *
 * Does NOT exercise the real model (anthropic-extractor.ts's SYSTEM_PROMPT)
 * -- whether the LLM reliably produces the RIGHT hint from ambiguous
 * natural language (e.g. never setting a hint for "I bought credits") is a
 * prompt-design question, not something a deterministic mock-extractor
 * test can prove. This suite proves the deterministic mapping/mutation
 * layer is correct once a hint exists (or correctly doesn't exist).
 *
 * Letter labels (A-K) match the Minimal Generic tool_account_status
 * Capture milestone's own required test matrix.
 *
 * Run: npx jest __tests__/interview-engine/account-status-capture.test.ts
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
    raw_text: 'We used Kling.',
    kind: 'tool_mention',
    raw_tool_name: 'Kling',
    ...overrides,
  }
}

describe('account_status capture: clear statements resolve to confirmed (tests A/B/C)', () => {
  test('A: explicit Kling Member Account -> confirmed "Member Account"', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have a Kling Member Account.' },
      constantExtractor([
        toolCandidate({
          raw_text: 'I have a Kling Member Account.',
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Member Account',
        }),
      ]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })

  test('B: explicit Kling Regular Account -> confirmed "Regular Account"', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have a Kling Regular Account.' },
      constantExtractor([
        toolCandidate({
          raw_text: 'I have a Kling Regular Account.',
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Regular Account',
        }),
      ]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Regular Account' })
  })

  test('C: a direct-synonym statement ("I\'m a Kling member") can resolve to confirmed "Member Account" when the extractor emits that hint -- proves the pipeline can represent this outcome; whether the real model reliably produces it from this exact phrasing is a prompt-design question, reported separately', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I'm a Kling member." },
      constantExtractor([
        toolCandidate({
          raw_text: "I'm a Kling member.",
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Member Account',
        }),
      ]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })
})

describe('account_status capture: ambiguity fails closed to unknown (tests D/E/F/G/H)', () => {
  test('D: "Kling Pro" must not silently become Member Account -- no hint set, stays unknown', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I use Kling Pro.' },
      constantExtractor([toolCandidate({ raw_text: 'I use Kling Pro.' })]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })

  test('E: "I pay for Kling" must not silently become Member Account -- no hint set, stays unknown', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I pay for Kling.' },
      constantExtractor([toolCandidate({ raw_text: 'I pay for Kling.' })]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })

  test('F: "I bought credits" must not silently become Regular Account (or Member Account) -- explicit correction of the prior diagnostic\'s rejected inference; buying credits does not establish absence of membership, so this must fail closed to unknown', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I bought credits.' },
      constantExtractor([toolCandidate({ raw_text: 'I bought credits.' })]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })

  test('G: free-version wording must not silently become Regular Account unless directly stated in canonical account-status terms -- no hint set, stays unknown', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I'm on the free version." },
      constantExtractor([toolCandidate({ raw_text: "I'm on the free version." })]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })

  test('H: don\'t know / not sure -> unknown (explicit uncertainty hint, not merely an absent one)', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I'm not sure if I have a member account." },
      constantExtractor([
        toolCandidate({
          raw_text: "I'm not sure if I have a member account.",
          account_status_confidence_hint: 'unknown',
        }),
      ]),
    )
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })

  test('bare tool mention with nothing said about account status stays unknown (baseline default, unaffected by this milestone)', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'We used Kling.' }, constantExtractor([toolCandidate()]))
    expect(updated.tool_mentions[0].account_status).toEqual({ state: 'unknown' })
  })
})

describe('account_status capture: tool isolation (test I)', () => {
  test('I: a Kling account-status statement does not populate another tool\'s account_status', async () => {
    const candidates: CandidateObservation[] = [
      toolCandidate({
        proposal_id: 'c1',
        raw_tool_name: 'Kling',
        raw_text: 'I have a Kling Member Account.',
        account_status_confidence_hint: 'confirmed',
        account_status_value_hint: 'Member Account',
      }),
      toolCandidate({
        proposal_id: 'c2',
        raw_tool_name: 'Runway',
        raw_text: 'Also used Runway.',
      }),
    ]
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'combined' }, constantExtractor(candidates))
    expect(updated.tool_mentions).toHaveLength(2)
    const kling = updated.tool_mentions.find((m) => m.source_statement === 'I have a Kling Member Account.')
    const runway = updated.tool_mentions.find((m) => m.source_statement === 'Also used Runway.')
    expect(kling?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
    expect(runway?.account_status).toEqual({ state: 'unknown' })
  })
})

describe('account_status capture: correction semantics (tests J/K)', () => {
  test('J: explicit Member Account -> explicit Regular Account correction behaves per existing correction semantics', async () => {
    const first = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have a Kling Member Account.' },
      constantExtractor([
        toolCandidate({
          raw_text: 'I have a Kling Member Account.',
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Member Account',
        }),
      ]),
    )
    const su = first.updated
    const priorId = su.tool_mentions[0].mention_id
    expect(su.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Member Account' })

    const { updated } = await runExtractionPipeline(
      su,
      { turn: 2, text: 'Actually, I have a Regular Account, not Member.' },
      constantExtractor([
        toolCandidate({
          proposal_id: 'c2',
          turn: 2,
          raw_tool_name: 'Kling',
          raw_text: 'Actually, I have a Regular Account, not Member.',
          supersedes_tool_mention_id: priorId,
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Regular Account',
        }),
      ]),
    )
    const prior = updated.tool_mentions.find((m) => m.mention_id === priorId)
    const resolved = updated.tool_mentions.find((m) => m.mention_id !== priorId)
    expect(prior?.superseded_by).toBe(resolved?.mention_id)
    expect(resolved?.account_status).toEqual({ state: 'confirmed', value: 'Regular Account' })
  })

  test('K: explicit Regular Account -> explicit Member Account correction behaves per existing correction semantics', async () => {
    const first = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have a Kling Regular Account.' },
      constantExtractor([
        toolCandidate({
          raw_text: 'I have a Kling Regular Account.',
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Regular Account',
        }),
      ]),
    )
    const su = first.updated
    const priorId = su.tool_mentions[0].mention_id
    expect(su.tool_mentions[0].account_status).toEqual({ state: 'confirmed', value: 'Regular Account' })

    const { updated } = await runExtractionPipeline(
      su,
      { turn: 2, text: 'Actually, I have a Member Account, not Regular.' },
      constantExtractor([
        toolCandidate({
          proposal_id: 'c2',
          turn: 2,
          raw_tool_name: 'Kling',
          raw_text: 'Actually, I have a Member Account, not Regular.',
          supersedes_tool_mention_id: priorId,
          account_status_confidence_hint: 'confirmed',
          account_status_value_hint: 'Member Account',
        }),
      ]),
    )
    const prior = updated.tool_mentions.find((m) => m.mention_id === priorId)
    const resolved = updated.tool_mentions.find((m) => m.mention_id !== priorId)
    expect(prior?.superseded_by).toBe(resolved?.mention_id)
    expect(resolved?.account_status).toEqual({ state: 'confirmed', value: 'Member Account' })
  })
})
