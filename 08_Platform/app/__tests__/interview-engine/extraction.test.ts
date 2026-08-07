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
    },
    tool_mentions: [],
    scoped_observations: [],
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
    expect(diagnostics[0].decision).toEqual({ outcome: 'accepted', applied_identifier: 'c1' })
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
    expect(diagnostics[0].decision).toEqual({ outcome: 'accepted', applied_identifier: 'c1' })
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
      supersedes_tool_mention_id: 'c1',
    })
    const { updated, diagnostics } = await runExtractionPipeline(
      su,
      { turn: 2, text: correction.raw_text },
      constantExtractor([correction]),
    )

    const prior = updated.tool_mentions.find((m) => m.mention_id === 'c1')
    const resolved = updated.tool_mentions.find((m) => m.mention_id === 'c2-resolved')
    expect(prior?.superseded_by).toBe('c2-resolved')
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
          supersedes_observation_id: 'c1',
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
          supersedes_observation_id: 'c1',
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
    expect((d.decision as { applied_identifier: string }).applied_identifier).toBe('c1')
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
