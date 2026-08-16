/**
 * Deterministic extraction-contract tests (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 6a substage 1).
 *
 * Uses the constant mock extractor -- proves the proposal -> normalization
 * -> attestation -> mutation -> diagnostic pipeline and plumbing. Does NOT
 * count as evidence that natural-language extraction works (that's
 * substage 2, real-model evaluation, reported separately).
 *
 * Run: npx jest __tests__/interview-engine/extraction.test.ts
 */

import type { StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation, ExtractionDiagnostic } from '../../lib/interview-engine/extraction'
import { normalizeCandidate, runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'

function emptySU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
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
    raw_text: 'We used Runway.',
    kind: 'tool_mention',
    raw_tool_name: 'Runway',
    ...overrides,
  }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    ...overrides,
  }
}

describe('normalizeCandidate: conservative alias disambiguation', () => {
  test('a known single-surface tool resolves directly', () => {
    const result = normalizeCandidate(toolCandidate({ raw_tool_name: 'Runway', raw_text: 'We used Runway.' }))
    expect(result).toEqual({ status: 'resolved', canonical_identifier: 'runway-gen3' })
  })

  test('a known multi-surface alias with NO access-method phrase stays known_ambiguous', () => {
    const result = normalizeCandidate(toolCandidate({ raw_tool_name: 'Nano Banana', raw_text: 'I used Nano Banana for this one.' }))
    expect(result).toEqual({ status: 'known_ambiguous', candidate_identifiers: ['gemini-api', 'gemini-consumer-app'] })
  })

  test('a clear access-method phrase resolves the ambiguity', () => {
    const result = normalizeCandidate(
      toolCandidate({ raw_tool_name: 'Nano Banana', raw_text: 'I used Nano Banana through the API, developer key.' }),
    )
    // access_surface added 2026-08-08 (JD instruction): the same match that
    // resolves the canonical identifier also deterministically tells us the
    // surface -- see extraction.ts's resolveAttestedToolField.
    expect(result).toEqual({ status: 'resolved', canonical_identifier: 'gemini-api', access_surface: 'API' })
  })

  test('a contradictory turn (both surfaces implied) stays known_ambiguous rather than guessing', () => {
    const result = normalizeCandidate(
      toolCandidate({
        raw_tool_name: 'Nano Banana',
        raw_text: 'I used Nano Banana, the app, but I think it was actually through the API.',
      }),
    )
    expect(result.status).toBe('known_ambiguous')
  })

  test('an unrecognized tool name is diagnostically distinct from a known-ambiguous one', () => {
    const result = normalizeCandidate(toolCandidate({ raw_tool_name: 'SuperCoolTool9000', raw_text: 'We used SuperCoolTool9000.' }))
    expect(result).toEqual({ status: 'unrecognized' })
  })
})

describe('runExtractionPipeline: accepted proposals', () => {
  test('resolved tool is accepted, applied_identifier is the mention_id', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'We used Runway.' },
      constantExtractor([toolCandidate()]),
    )
    expect(updated.tool_mentions).toHaveLength(1)
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    // Turn-qualified, not the bare model-assigned proposal_id -- see extraction.ts's own mentionId minting comment.
    expect(diagnostics[0].decision).toEqual({ outcome: 'accepted', applied_identifier: 't1-c1' })
    expect(diagnostics[0].normalization).toEqual({ status: 'resolved', canonical_identifier: 'runway-gen3' })
  })

  test('known-ambiguous tool is accepted AS an unresolved_alias -- recording ambiguity is a valid accepted proposal, not a rejection', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Nano Banana.' },
      constantExtractor([toolCandidate({ raw_tool_name: 'Nano Banana', raw_text: 'I used Nano Banana.' })]),
    )
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Nano Banana' })
    expect(updated.tool_mentions[0].confidence).toBe('unresolved_no_visibility')
    expect(diagnostics[0].decision.outcome).toBe('accepted')
    expect(diagnostics[0].normalization.status).toBe('known_ambiguous')
  })

  test('scoped_observation candidate is accepted, applied_identifier is the observation_id', async () => {
    const candidate: CandidateObservation = {
      proposal_id: 'c1',
      turn: 2,
      raw_text: 'Legal reviewed it before it went out.',
      kind: 'scoped_observation',
      scope: 'current_project',
      workflow_stage: 'T2',
      observation_confidence_hint: 'confirmed',
    }
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 2, text: candidate.raw_text },
      constantExtractor([candidate]),
    )
    expect(updated.scoped_observations).toHaveLength(1)
    expect(updated.scoped_observations[0].workflow_stage).toBe('T2')
    // Turn-qualified (CRC production hygiene fix, 2026-08-16): observation_id
    // is now `t${turn}-${proposal_id}`, matching mention_id/goal_id's own
    // established minting pattern -- see attestCandidate's scoped_observation
    // branch.
    expect(diagnostics[0].decision).toEqual({ outcome: 'accepted', applied_identifier: 't2-c1' })
  })

  test('project_fact candidate is accepted via setIntendedUse, applied_identifier names the field', async () => {
    const candidate: CandidateObservation = {
      proposal_id: 'c1',
      turn: 1,
      raw_text: "It's for a paid social ad campaign.",
      kind: 'project_fact',
      raw_fact_field: 'intended_use',
      fact_confidence_hint: 'confirmed',
      fact_value_hint: 'Paid social ad campaign',
    }
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: candidate.raw_text },
      constantExtractor([candidate]),
    )
    expect(updated.project_facts.intended_use).toEqual({
      attestation: { state: 'confirmed', value: 'Paid social ad campaign' },
      source_turn: 1,
      source_statement: candidate.raw_text,
    })
    expect(diagnostics[0].decision).toEqual({ outcome: 'accepted', applied_identifier: 'project_facts.intended_use' })
  })

  test('a corrected tool mention supersedes the prior one and is accepted', async () => {
    const first = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Nano Banana.' },
      constantExtractor([toolCandidate({ raw_tool_name: 'Nano Banana', raw_text: 'I used Nano Banana.' })]),
    )
    const su = first.updated

    const correction = toolCandidate({
      proposal_id: 'c2',
      turn: 2,
      raw_tool_name: 'Nano Banana',
      raw_text: 'Oh, through the API, developer key.',
      // Turn-qualified target, matching the first candidate's actual persisted mention_id (t1-c1).
      supersedes_tool_mention_id: 't1-c1',
    })
    const { updated, diagnostics } = await runExtractionPipeline(
      su,
      { turn: 2, text: correction.raw_text },
      constantExtractor([correction]),
    )

    // Turn-qualified, not the old '-resolved' suffix scheme -- see extraction.ts's own mentionId minting comment.
    const prior = updated.tool_mentions.find((m) => m.mention_id === 't1-c1')
    const resolved = updated.tool_mentions.find((m) => m.mention_id === 't2-c2')
    expect(prior?.superseded_by).toBe('t2-c2')
    expect(resolved?.resolution).toEqual({ kind: 'canonical', identifier: 'gemini-api' })
    expect(diagnostics[0].decision.outcome).toBe('accepted')
  })

  test('multiple candidates in one turn accumulate correctly across the loop', async () => {
    const candidates: CandidateObservation[] = [
      toolCandidate({ proposal_id: 'c1' }),
      {
        proposal_id: 'c2',
        turn: 1,
        raw_text: "It's for a pitch, not a paid campaign.",
        kind: 'project_fact',
        raw_fact_field: 'intended_use',
        fact_confidence_hint: 'confirmed',
        fact_value_hint: 'Client-facing pitch deck video',
      },
    ]
    const { updated, diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'combined' }, constantExtractor(candidates))
    expect(updated.tool_mentions).toHaveLength(1)
    expect(updated.project_facts.intended_use.attestation).toEqual({ state: 'confirmed', value: 'Client-facing pitch deck video' })
    expect(diagnostics).toHaveLength(2)
    expect(diagnostics.every((d: ExtractionDiagnostic) => d.decision.outcome === 'accepted')).toBe(true)
  })
})

describe('runExtractionPipeline: rejected proposals', () => {
  test('a correction targeting a nonexistent tool mention is rejected with a stable reason_code', async () => {
    const candidate = toolCandidate({ supersedes_tool_mention_id: 'does-not-exist' })
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: candidate.raw_text },
      constantExtractor([candidate]),
    )
    expect(updated.tool_mentions).toHaveLength(0)
    expect(diagnostics[0].decision).toMatchObject({ outcome: 'rejected', reason_code: 'MUTATION_TARGET_NOT_FOUND' })
  })

  test('a correction targeting an already-superseded observation is rejected with a stable reason_code', async () => {
    const step1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Legal reviewed it.' },
      constantExtractor([
        {
          proposal_id: 'c1',
          turn: 1,
          raw_text: 'Legal reviewed it.',
          kind: 'scoped_observation',
          observation_confidence_hint: 'confirmed',
        },
      ]),
    )

    const step2 = await runExtractionPipeline(
      step1.updated,
      { turn: 2, text: 'Actually, no one reviewed it.' },
      constantExtractor([
        {
          proposal_id: 'c2',
          turn: 2,
          raw_text: 'Actually, no one reviewed it.',
          kind: 'scoped_observation',
          observation_confidence_hint: 'confirmed_absent',
          // Turn-qualified (CRC production hygiene fix, 2026-08-16): the
          // turn-1 candidate above mints observation_id 't1-c1', not the
          // bare 'c1' -- see attestCandidate's scoped_observation branch.
          supersedes_observation_id: 't1-c1',
        },
      ]),
    )

    // A second, independent attempt to correct the now-superseded original must be rejected.
    const { diagnostics } = await runExtractionPipeline(
      step2.updated,
      { turn: 3, text: 'Wait, someone did glance at it.' },
      constantExtractor([
        {
          proposal_id: 'c3',
          turn: 3,
          raw_text: 'Wait, someone did glance at it.',
          kind: 'scoped_observation',
          observation_confidence_hint: 'confirmed',
          // Turn-qualified (CRC production hygiene fix, 2026-08-16): the
          // turn-1 candidate above mints observation_id 't1-c1', not the
          // bare 'c1' -- see attestCandidate's scoped_observation branch.
          supersedes_observation_id: 't1-c1',
        },
      ]),
    )
    expect(diagnostics[0].decision).toMatchObject({ outcome: 'rejected', reason_code: 'MUTATION_TARGET_ALREADY_SUPERSEDED' })
  })
})

describe('runExtractionPipeline: deferred proposals', () => {
  test('a low_confidence candidate is deferred, never proposed as a fact', async () => {
    const candidate = toolCandidate({ low_confidence: true })
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: candidate.raw_text },
      constantExtractor([candidate]),
    )
    expect(updated.tool_mentions).toHaveLength(0)
    expect(diagnostics[0].proposed_fact).toEqual({ kind: 'undetermined' })
    expect(diagnostics[0].decision).toMatchObject({ outcome: 'deferred', reason_code: 'CANDIDATE_TOO_LOW_CONFIDENCE' })
  })

  test('a scoped_observation candidate missing its confidence hint is deferred as unclassifiable', async () => {
    const candidate: CandidateObservation = {
      proposal_id: 'c1',
      turn: 1,
      raw_text: 'Something about review, unclear what.',
      kind: 'scoped_observation',
      // observation_confidence_hint intentionally omitted
    }
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: candidate.raw_text }, constantExtractor([candidate]))
    expect(diagnostics[0].decision).toMatchObject({ outcome: 'deferred', reason_code: 'CANDIDATE_UNCLASSIFIABLE' })
  })
})

describe('diagnostics answer all five required questions', () => {
  test('a single accepted proposal carries candidate, normalization, and decision together', async () => {
    const candidate = toolCandidate()
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: candidate.raw_text }, constantExtractor([candidate]))
    const d = diagnostics[0]
    expect(d.candidate).toEqual(candidate) // what the model proposed
    expect(d.normalization).toEqual({ status: 'resolved', canonical_identifier: 'runway-gen3' }) // what normalization produced
    expect(d.decision.outcome).toBe('accepted') // whether mutation accepted it
    expect(d.decision).not.toHaveProperty('reason_code') // (accepted proposals carry no rejection/deferral reason)
    // Turn-qualified, not the bare model-assigned proposal_id -- see extraction.ts's own mentionId minting comment.
    expect((d.decision as { applied_identifier: string }).applied_identifier).toBe('t1-c1')
  })

  test('a rejected proposal carries a human-readable reason alongside its stable reason_code', async () => {
    const candidate = toolCandidate({ supersedes_tool_mention_id: 'does-not-exist' })
    const { diagnostics } = await runExtractionPipeline(emptySU(), { turn: 1, text: candidate.raw_text }, constantExtractor([candidate]))
    const decision = diagnostics[0].decision as { outcome: string; reason_code: string; reason: string }
    expect(decision.reason_code).toBe('MUTATION_TARGET_NOT_FOUND') // why (machine-readable)
    expect(decision.reason.length).toBeGreaterThan(0) // why (human-readable)
  })
})

describe('immutability', () => {
  test('the source StructuredUnderstanding is never mutated', async () => {
    const su = emptySU()
    const before = JSON.parse(JSON.stringify(su))
    await runExtractionPipeline(su, { turn: 1, text: 'We used Runway.' }, constantExtractor([toolCandidate()]))
    expect(su).toEqual(before)
  })
})

describe('user_goal extraction pipeline (Milestone 1, 2026-08-15)', () => {
  test('one goal candidate is accepted and applied', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially?' },
      constantExtractor([goalCandidate()]),
    )
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0]).toMatchObject({ raw_text: 'Can I use this commercially?', state: 'confirmed', superseded_by: null })
    expect(diagnostics[0].decision.outcome).toBe('accepted')
  })

  test('goal_category_hint/goal_scope_hint are carried through onto the applied UserGoal (Milestone 2, 2026-08-15)', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Do I own the copyright for this?' },
      constantExtractor([goalCandidate({ raw_text: 'Do I own the copyright for this?', goal_category_hint: 'copyright_ownership', goal_scope_hint: 'informational' })]),
    )
    expect(updated.user_goals[0].category).toBe('copyright_ownership')
    expect(updated.user_goals[0].scope).toBe('informational')
  })

  test('goal_category_hint omitted -> UserGoal.category defaults to "unknown" (Milestone 2 conservative fallback, never guessed)', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially?' },
      constantExtractor([goalCandidate({ goal_category_hint: undefined })]),
    )
    expect(updated.user_goals[0].category).toBe('unknown')
  })

  test('goal_scope_hint omitted -> UserGoal.scope defaults to "informational" (Milestone 2 conservative fallback -- never assume a determination request)', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially?' },
      constantExtractor([goalCandidate({ goal_scope_hint: undefined })]),
    )
    expect(updated.user_goals[0].scope).toBe('informational')
  })

  test('goal_scope_hint "determination_request" is carried through onto the applied UserGoal', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can you certify this is cleared for commercial use?' },
      constantExtractor([goalCandidate({ raw_text: 'Can you certify this is cleared for commercial use?', goal_scope_hint: 'determination_request' })]),
    )
    expect(updated.user_goals[0].scope).toBe('determination_request')
  })

  test('a declarative-need goal (not phrased as a question) is accepted identically to a question-phrased one', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'My client needs proof this is cleared.' },
      constantExtractor([goalCandidate({ raw_text: 'My client needs proof this is cleared.' })]),
    )
    expect(updated.user_goals[0].raw_text).toBe('My client needs proof this is cleared.')
    expect(updated.user_goals[0].state).toBe('confirmed')
  })

  test('two goals proposed in one turn are both applied as distinct, independent goals -- never merged', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially and do I own the copyright?' },
      constantExtractor([
        goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this commercially' }),
        goalCandidate({ proposal_id: 'c2', raw_text: 'do I own the copyright' }),
      ]),
    )
    const active = updated.user_goals.filter((g) => g.superseded_by === null)
    expect(active).toHaveLength(2)
    expect(active.map((g) => g.raw_text).sort()).toEqual(['Can I use this commercially', 'do I own the copyright'])
  })

  test('a goal introduced on a later turn is appended alongside an earlier unrelated goal', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially?' },
      constantExtractor([goalCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'Can I use this commercially?' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 3, text: 'Can I also post this on YouTube?' },
      constantExtractor([goalCandidate({ proposal_id: 'c1', turn: 3, raw_text: 'Can I also post this on YouTube?' })]),
    )
    expect(turn2.updated.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(2)
  })

  test('a correction (is_correction + correction_of_raw_text matching an existing goal) supersedes that specific goal, not a fresh add', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Do I own the copyright?' },
      constantExtractor([goalCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'Do I own the copyright?' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: "Actually, I don't care about copyright -- I just need to know if my client can use it." },
      constantExtractor([
        goalCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'I just need to know if my client can use it',
          is_correction: true,
          correction_of_raw_text: 'copyright',
        }),
      ]),
    )
    const active = turn2.updated.user_goals.filter((g) => g.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].raw_text).toBe('I just need to know if my client can use it')
    const superseded = turn2.updated.user_goals.find((g) => g.raw_text === 'Do I own the copyright?')
    expect(superseded?.superseded_by).not.toBeNull()
  })

  test('retraction/decline (is_correction targeting the only active goal, declined state) supersedes with a declined replacement, not a delete', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Do I own the copyright?' },
      constantExtractor([goalCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'Do I own the copyright?' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: "Never mind, forget I asked." },
      constantExtractor([
        goalCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Never mind, forget I asked.',
          goal_confidence_hint: 'declined',
          is_correction: true,
          correction_of_raw_text: 'that was wrong',
        }),
      ]),
    )
    const active = turn2.updated.user_goals.filter((g) => g.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].state).toBe('declined')
    const prior = turn2.updated.user_goals.find((g) => g.raw_text === 'Do I own the copyright?')
    expect(prior?.superseded_by).not.toBeNull()
  })

  test('a confirmed_absent goal ("I am just experimenting") is a valid, distinct attested state, not dropped', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I'm just experimenting, no particular question." },
      constantExtractor([goalCandidate({ goal_confidence_hint: 'confirmed_absent', raw_text: "I'm just experimenting, no particular question." })]),
    )
    expect(updated.user_goals[0].state).toBe('confirmed_absent')
  })

  test('a 4th concurrent active goal is rejected with a diagnosable reason, not silently dropped or accepted', async () => {
    let su = emptySU()
    for (let i = 1; i <= 3; i++) {
      const result = await runExtractionPipeline(
        su,
        { turn: i, text: `Goal ${i}` },
        constantExtractor([goalCandidate({ proposal_id: `c${i}`, turn: i, raw_text: `Goal ${i}` })]),
      )
      su = result.updated
    }
    const { updated, diagnostics } = await runExtractionPipeline(
      su,
      { turn: 4, text: 'Goal 4' },
      constantExtractor([goalCandidate({ proposal_id: 'c4', turn: 4, raw_text: 'Goal 4' })]),
    )
    expect(updated.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(3)
    const decision = diagnostics[0].decision as { outcome: string; reason_code: string }
    expect(decision.outcome).toBe('rejected')
    expect(decision.reason_code).toBe('MUTATION_ERROR_OTHER')
  })

  test('no incidental-question candidate proposed -- the extractor simply never emits one, and nothing is captured', async () => {
    // Mirrors how "What does CRC do?" is meant to be handled: the extractor
    // (schema/prompt-guided, see anthropic-extractor.ts) proposes NO
    // user_goal candidate at all for it. This test proves the pipeline side
    // of that contract: when zero user_goal candidates are proposed for a
    // turn, user_goals stays exactly as it was -- no candidate, no goal,
    // ever, by construction.
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'What does CRC do?' }, constantExtractor([]))
    expect(updated.user_goals).toEqual([])
  })

  test('an ordinary workflow statement with no accompanying goal produces zero user_goal candidates alongside its tool_mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I am using Kling for a client ad.' },
      constantExtractor([toolCandidate({ raw_tool_name: 'Kling', raw_text: 'Kling' })]),
    )
    expect(updated.tool_mentions).toHaveLength(1)
    expect(updated.user_goals).toEqual([])
  })

  test('no silent inference -- a low_confidence goal candidate is deferred, never applied as a fact', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'hmm, not sure what I want to know' },
      constantExtractor([goalCandidate({ low_confidence: true, goal_confidence_hint: undefined })]),
    )
    expect(updated.user_goals).toEqual([])
    expect(diagnostics[0].decision.outcome).toBe('deferred')
  })

  test('a goal candidate missing goal_confidence_hint is deferred as unclassifiable, never applied', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'something ambiguous' },
      constantExtractor([goalCandidate({ goal_confidence_hint: undefined })]),
    )
    expect(updated.user_goals).toEqual([])
    const decision = diagnostics[0].decision as { outcome: string; reason_code: string }
    expect(decision.outcome).toBe('deferred')
    expect(decision.reason_code).toBe('CANDIDATE_UNCLASSIFIABLE')
  })
})

/**
 * Part B regression cases (CRC production hygiene fix, 2026-08-16, canonical
 * session fd92b4aa-072f-4d45-918f-ea520231b0d0). Root cause: scoped_observation
 * was the one candidate kind still minting observation_id from the bare,
 * turn-local model proposal_id (see attestCandidate's scoped_observation
 * branch). Two unrelated observations proposed with the same bare
 * proposal_id on different turns collided; addObservation() threw, and
 * runExtractionPipeline's own per-candidate try/catch silently converted
 * that throw into an internal-only 'rejected' diagnostic -- the user's
 * turn-4 answer was correctly extracted and then silently dropped by
 * mutation, never a defect in extraction itself.
 */
function observationCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'They gave me their logo.',
    kind: 'scoped_observation',
    observation_confidence_hint: 'confirmed',
    ...overrides,
  }
}

describe('Part B: scoped_observation id-collision fix + regression cases (CRC production hygiene, 2026-08-16, canonical session fd92b4aa-072f-4d45-918f-ea520231b0d0)', () => {
  test('canonical incident reproduction: two unrelated observations proposed under the SAME bare proposal_id on different turns (turn 2 "c1", turn 4 "c1") both survive as distinct active observations', async () => {
    const turn2 = await runExtractionPipeline(
      emptySU(),
      { turn: 2, text: 'They gave me their logo.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'They gave me their logo.' })]),
    )
    const turn4 = await runExtractionPipeline(
      turn2.updated,
      { turn: 4, text: 'They said I could only use it for this commercial.' },
      constantExtractor([
        observationCandidate({ proposal_id: 'c1', turn: 4, raw_text: 'They said I could only use it for this commercial.' }),
      ]),
    )
    expect(turn4.diagnostics[0].decision.outcome).toBe('accepted')
    const active = turn4.updated.scoped_observations.filter((o) => o.superseded_by === null)
    expect(active).toHaveLength(2)
    expect(active.map((o) => o.note).sort()).toEqual([
      'They gave me their logo.',
      'They said I could only use it for this commercial.',
    ])
  })

  test('regression case 1: a distinct new fact (permission limitation) survives alongside an existing fact (logo supplied) -- both remain active, neither overwrites the other', async () => {
    const step1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'They gave me their logo.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'They gave me their logo.' })]),
    )
    const step2 = await runExtractionPipeline(
      step1.updated,
      { turn: 2, text: 'They said I could use it only in this commercial.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'They said I could use it only in this commercial.' })]),
    )
    const active = step2.updated.scoped_observations.filter((o) => o.superseded_by === null)
    expect(active).toHaveLength(2)
    expect(active.some((o) => o.note === 'They gave me their logo.')).toBe(true)
    expect(active.some((o) => o.note === 'They said I could use it only in this commercial.')).toBe(true)
  })

  test('regression case 2: a near-duplicate restatement does not crash or silently drop the original -- KNOWN GAP: no semantic-deduplication layer exists (out of this task\'s two approved fixes), so a restated candidate is currently added as a second active observation rather than recognized as redundant', async () => {
    const step1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'They gave me their logo.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'They gave me their logo.' })]),
    )
    const step2 = await runExtractionPipeline(
      step1.updated,
      { turn: 2, text: 'Yes, they gave me their logo.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Yes, they gave me their logo.' })]),
    )
    // What matters for THIS fix: no id collision, no thrown/rejected
    // candidate, no loss of the original fact.
    expect(step2.diagnostics[0].decision.outcome).toBe('accepted')
    const active = step2.updated.scoped_observations.filter((o) => o.superseded_by === null)
    expect(active.some((o) => o.note === 'They gave me their logo.')).toBe(true)
  })

  test('regression case 3: a stated correction of a permission scope does not silently accumulate as a contradictory unrelated fact -- KNOWN GAP: no resolveObservationTarget() exists (unlike resolveToolMentionTarget/resolveUserGoalTarget), so is_correction/correction_of_raw_text alone cannot resolve a scoped_observation supersession target; a real supersession requires supersedes_observation_id to be set directly', async () => {
    const step1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'They said I could use the logo for this commercial.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'They said I could use the logo for this commercial.' })]),
    )
    const firstId = step1.updated.scoped_observations[0].observation_id

    // The deterministic path THIS fix touches: an explicit supersession
    // target (as tool_mention/user_goal corrections already require)
    // correctly supersedes, never duplicates.
    const step2 = await runExtractionPipeline(
      step1.updated,
      { turn: 2, text: 'Actually, they said I could use it for all of our campaign materials.' },
      constantExtractor([
        observationCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually, they said I could use it for all of our campaign materials.',
          is_correction: true,
          correction_of_raw_text: 'this commercial',
          supersedes_observation_id: firstId,
        }),
      ]),
    )
    const active = step2.updated.scoped_observations.filter((o) => o.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].note).toBe('Actually, they said I could use it for all of our campaign materials.')
    const prior = step2.updated.scoped_observations.find((o) => o.observation_id === firstId)
    expect(prior?.superseded_by).not.toBeNull()
  })

  test('regression case 4: expressed uncertainty about permission is preserved as its own distinct fact -- does not overwrite or fabricate a permission grant onto the existing "logo supplied" fact', async () => {
    const step1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'They gave me their logo.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 1, raw_text: 'They gave me their logo.' })]),
    )
    const step2 = await runExtractionPipeline(
      step1.updated,
      { turn: 2, text: "I don't know what permission they gave us." },
      constantExtractor([
        observationCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: "I don't know what permission they gave us.",
          observation_confidence_hint: 'unknown',
        }),
      ]),
    )
    const active = step2.updated.scoped_observations.filter((o) => o.superseded_by === null)
    // The original supply-of-logo fact is untouched -- still confirmed, still active.
    const logoFact = active.find((o) => o.note === 'They gave me their logo.')
    expect(logoFact?.confidence).toBe('confirmed')
    // The uncertainty is its own separate, honestly-labeled fact -- never
    // fabricated into a confirmed permission grant.
    const uncertainty = active.find((o) => o.note === "I don't know what permission they gave us.")
    expect(uncertainty?.confidence).toBe('unknown')
  })

  test('decline is preserved distinctly from unknown -- a user who explicitly declines to answer is not recorded the same way as one who genuinely does not know', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I'd rather not say." },
      constantExtractor([
        observationCandidate({ proposal_id: 'c1', turn: 1, raw_text: "I'd rather not say.", observation_confidence_hint: 'declined' }),
      ]),
    )
    expect(updated.scoped_observations[0].confidence).toBe('declined')
  })
})

/**
 * Canonical end-to-end regression test, based on the real production session
 * (fd92b4aa-072f-4d45-918f-ea520231b0d0) this task's two fixes were diagnosed
 * from. Reconstructs the same candidate shapes across the same turn numbers
 * the live model actually produced, run through the real, now-fixed
 * pipeline -- not a synthetic minimal repro.
 */
describe('canonical regression: full session reconstruction (fd92b4aa-072f-4d45-918f-ea520231b0d0)', () => {
  test('client-supplied logo, permission limitation, workflow role, tool mention, and user goals all survive together with no cross-contamination', async () => {
    let su = emptySU()

    const turn1 = await runExtractionPipeline(
      su,
      { turn: 1, text: 'I used Kling to make a commercial, paid plan.' },
      constantExtractor([
        toolCandidate({ proposal_id: 'c1', turn: 1, raw_tool_name: 'Kling', raw_text: 'I used Kling to make a commercial, paid plan.' }),
        goalCandidate({
          proposal_id: 'c2',
          turn: 1,
          raw_text: 'Can I use this commercially?',
          goal_category_hint: 'commercial_use',
        }),
      ]),
    )
    su = turn1.updated

    const turn2 = await runExtractionPipeline(
      su,
      { turn: 2, text: 'They gave me their logo.' },
      constantExtractor([observationCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'They gave me their logo.' })]),
    )
    su = turn2.updated

    const turn3 = await runExtractionPipeline(
      su,
      { turn: 3, text: "I'm the person directly creating the AI content." },
      constantExtractor([
        {
          proposal_id: 'c1',
          turn: 3,
          raw_text: "I'm the person directly creating the AI content.",
          kind: 'project_fact',
          raw_fact_field: 'workflow_role',
          fact_confidence_hint: 'confirmed',
          fact_value_hint: "I'm the person directly creating the AI content.",
        },
        goalCandidate({
          proposal_id: 'c2',
          turn: 3,
          raw_text: 'Do I own the copyright for this?',
          goal_category_hint: 'copyright_ownership',
        }),
      ]),
    )
    su = turn3.updated

    // Turn 4: the previously-lost answer. Same bare proposal_id ("c1") as
    // turn 2's logo observation -- this is the exact collision that used to
    // silently drop this candidate.
    const turn4 = await runExtractionPipeline(
      su,
      { turn: 4, text: 'They said I could only use it for this commercial.' },
      constantExtractor([
        observationCandidate({ proposal_id: 'c1', turn: 4, raw_text: 'They said I could only use it for this commercial.' }),
      ]),
    )
    su = turn4.updated

    // 1. Client-supplied logo retained.
    const active = su.scoped_observations.filter((o) => o.superseded_by === null)
    expect(active.some((o) => o.note === 'They gave me their logo.')).toBe(true)
    // 2. Permission limitation retained separately (not merged, not lost).
    expect(active.some((o) => o.note === 'They said I could only use it for this commercial.')).toBe(true)
    // 3. No meaningless duplication.
    expect(active).toHaveLength(2)
    // 4. workflow_role captured verbatim (renders separately -- see
    // understood-summary.test.ts's roleClause suite for the rendering half).
    expect(su.project_facts.workflow_role.attestation).toMatchObject({
      state: 'confirmed',
      value: "I'm the person directly creating the AI content.",
    })
    // 5. Exactly two user goals remain, no duplicates.
    const activeGoals = su.user_goals.filter((g) => g.superseded_by === null)
    expect(activeGoals).toHaveLength(2)
    expect(activeGoals.map((g) => g.category).sort()).toEqual(['commercial_use', 'copyright_ownership'])
    // 6. Kling paid-plan tool mention remains intact.
    expect(su.tool_mentions).toHaveLength(1)
    expect(su.tool_mentions[0].resolution).toMatchObject({ kind: 'canonical', identifier: 'kling' })
  })
})
