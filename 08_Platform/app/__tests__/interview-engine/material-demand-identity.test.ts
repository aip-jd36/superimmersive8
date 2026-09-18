/**
 * LK-DEMAND-2C-R1 (2026-09-18) -- Deterministic Evidence Identity Repair.
 *
 * Proves computeMaterialDemandOccurrenceId's own contract (extraction.ts):
 * KnowledgeDemandOccurrence.occurrence_id no longer depends on the
 * extractor's own model-assigned proposal_id label. Identity is now a
 * SHA-256 digest of (turn, resolved-goal raw_text, demand raw_text,
 * same-turn ordinal) -- all stable, non-model-assigned provenance.
 *
 * Companion to __tests__/interview-engine/material-demand-mention.test.ts
 * (LK-DEMAND-2A/2A-R1/2C, unaffected qualification/provenance/transport
 * behavior -- all 35 of its tests still pass unchanged after this repair,
 * proving same-turn supersession and every other existing contract
 * survived) -- this file is scoped ONLY to the identity/idempotency
 * question itself.
 *
 * Run: npx jest __tests__/interview-engine/material-demand-identity.test.ts
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { runExtractionPipeline } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { recordKnowledgeDemandEvidence } from '@/lib/crc-engine/knowledge-demand-evidence'

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
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'Can I use this commercially?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'commercial_use',
    goal_scope_hint: 'informational',
    ...overrides,
  }
}

function demandCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c2',
    turn: 1,
    raw_text: 'on Twitch',
    kind: 'material_demand_mention',
    supports_goal_quote: 'use this commercially',
    ...overrides,
  }
}

describe('Case A/B -- identical accepted-turn retry, different model-assigned proposal_id, SAME durable identity', () => {
  test('two independent extraction calls for the same turn/goal-text/demand-text produce the SAME occurrence_id despite entirely different proposal_id labels', async () => {
    const goalCall1 = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this on Twitch commercially?' })
    const demandCall1 = demandCandidate({ proposal_id: 'c2', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    // Simulated retry: SAME turn, SAME userText, but the model assigns
    // completely different proposal_id labels this sample.
    const goalCall2 = goalCandidate({ proposal_id: 'zz9', raw_text: 'Can I use this on Twitch commercially?' })
    const demandCall2 = demandCandidate({ proposal_id: 'qq1', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })

    const result1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalCall1, demandCall1]))
    const result2 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalCall2, demandCall2]))

    expect(result1.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result2.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result1.knowledgeDemandOccurrences[0].occurrence_id).toBe(result2.knowledgeDemandOccurrences[0].occurrence_id)
    // goal_id itself is allowed to differ (each call mints its own UserGoal
    // in-memory) -- the point is durable EVIDENCE identity, not runtime
    // UserGoal identity, which is out of this repair's scope.
  })
})

describe('Case C -- two genuinely distinct demands, same turn, same goal -> two distinct durable identities', () => {
  test('"on Kick and Twitch" -- Kick and Twitch get different occurrence_id', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use this on Kick and Twitch?' })
    const kick = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this on Kick and Twitch' })
    const twitch = demandCandidate({ proposal_id: 'c3', raw_text: 'Twitch', supports_goal_quote: 'use this on Kick and Twitch' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, kick, twitch]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const [a, b] = result.knowledgeDemandOccurrences
    expect(a.occurrence_id).not.toBe(b.occurrence_id)
  })
})

describe('Case D -- same demand text, same goal text, DIFFERENT turn -> distinct durable identity', () => {
  test('turn 1 and turn 2 each independently mention "on Twitch" for the same-worded goal -> different occurrence_id', async () => {
    const goalText = 'Can I use this on Twitch commercially?'
    const goal1 = goalCandidate({ turn: 1, raw_text: goalText })
    const demand1 = demandCandidate({ turn: 1, raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const result1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal1, demand1]))

    const goal2 = goalCandidate({ turn: 2, raw_text: goalText })
    const demand2 = demandCandidate({ turn: 2, raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const result2 = await runExtractionPipeline(emptySU(), { turn: 2, text: 'x' }, constantExtractor([goal2, demand2]))

    expect(result1.knowledgeDemandOccurrences[0].occurrence_id).not.toBe(result2.knowledgeDemandOccurrences[0].occurrence_id)
  })
})

describe('Case E -- identical demand text, same turn, but supporting TWO DIFFERENT goals -> distinct durable identities', () => {
  test('"on Twitch" mentioned once per goal, in two unambiguous quotes -> two occurrences, two different occurrence_id values', async () => {
    const goalOne = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this on Twitch commercially for client A?' })
    const goalTwo = goalCandidate({ proposal_id: 'c2', raw_text: 'Can my agency use this on Twitch commercially for client B?', goal_category_hint: 'commercial_use' })
    const demandOne = demandCandidate({ proposal_id: 'c3', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially for client A' })
    const demandTwo = demandCandidate({ proposal_id: 'c4', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially for client B' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalOne, goalTwo, demandOne, demandTwo]))

    expect(result.updated.user_goals).toHaveLength(2)
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const [a, b] = result.knowledgeDemandOccurrences
    expect(a.raw_text).toBe('on Twitch')
    expect(b.raw_text).toBe('on Twitch')
    expect(a.goal_id).not.toBe(b.goal_id)
    expect(a.occurrence_id).not.toBe(b.occurrence_id)
  })
})

describe('Case F -- same-turn correction lineage remains valid under the new identity scheme', () => {
  test('"on Kick -- actually, I mean Twitch" still supersedes correctly, and BOTH occurrence_id and superseded_by are the new deterministic values', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this commercially on a platform?' })
    const kickDemand = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on a platform' })
    const correction = demandCandidate({
      proposal_id: 'c3',
      raw_text: 'Twitch',
      supports_goal_quote: 'use this commercially on a platform',
      is_correction: true,
      correction_of_raw_text: 'Kick',
    })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, kickDemand, correction]))

    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const kick = result.knowledgeDemandOccurrences.find((o) => o.raw_text === 'on Kick')!
    const twitch = result.knowledgeDemandOccurrences.find((o) => o.raw_text === 'Twitch')!
    expect(kick.superseded_by).toBe(twitch.occurrence_id)
    expect(twitch.superseded_by).toBeNull()
    // Neither is the old proposal_id-shaped id anymore.
    expect(kick.occurrence_id).not.toContain('-c2')
    expect(twitch.occurrence_id).not.toContain('-c3')
  })

  test('DOCUMENTED, UNCHANGED LIMITATION: cross-turn correction is still not introduced by this repair', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this commercially on a platform?' })
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'x' },
      constantExtractor([goal, demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on a platform' })]),
    )
    expect(turn1.knowledgeDemandOccurrences[0].superseded_by).toBeNull()

    const correction = demandCandidate({
      proposal_id: 'c2',
      raw_text: 'Twitch',
      supports_goal_quote: 'use this commercially on a platform',
      is_correction: true,
      correction_of_raw_text: 'Kick',
    })
    const turn2 = await runExtractionPipeline(turn1.updated, { turn: 2, text: 'x' }, constantExtractor([correction]))
    expect(turn2.knowledgeDemandOccurrences).toHaveLength(1)
    expect(turn2.knowledgeDemandOccurrences[0].superseded_by).toBeNull()
  })
})

describe('Case F (collision matrix) -- two textually-identical demands for the SAME goal on the SAME turn stay independent, not collapsed', () => {
  test('the same raw_text proposed twice for one goal in one turn -- two occurrences, two distinct occurrence_id values (ordinal-disambiguated)', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially, on Twitch?' })
    const first = demandCandidate({ proposal_id: 'c2', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially, on Twitch' })
    const second = demandCandidate({ proposal_id: 'c3', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially, on Twitch' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, first, second]))

    // Matches the PRE-EXISTING 2A contract (no dedup mechanism exists in
    // extraction.ts for this) -- this repair must not newly collapse what
    // was already independent.
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const [a, b] = result.knowledgeDemandOccurrences
    expect(a.raw_text).toBe('on Twitch')
    expect(b.raw_text).toBe('on Twitch')
    expect(a.occurrence_id).not.toBe(b.occurrence_id)
  })
})

describe('Case H -- retry produces a KEY the DB upsert can actually deduplicate (integration with the persistence writer)', () => {
  test('two "retried" extraction calls for the same accepted turn hand the writer rows with the SAME occurrence_id, satisfying UNIQUE(session_id, occurrence_id)', async () => {
    const goalCall1 = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demandCall1 = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const goalCall2 = goalCandidate({ proposal_id: 'r1', raw_text: 'Can I use this on Twitch commercially?' })
    const demandCall2 = demandCandidate({ proposal_id: 'r2', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })

    const result1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalCall1, demandCall1]))
    const result2 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalCall2, demandCall2]))

    const upsertCalls: { rows: unknown }[] = []
    const fakeClient = {
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows: unknown) => {
          upsertCalls.push({ rows })
          return { error: null }
        }),
      })),
    } as any

    await recordKnowledgeDemandEvidence(fakeClient, { sessionId: 'sess-retry', occurrences: result1.knowledgeDemandOccurrences })
    await recordKnowledgeDemandEvidence(fakeClient, { sessionId: 'sess-retry', occurrences: result2.knowledgeDemandOccurrences })

    expect(upsertCalls).toHaveLength(2)
    const firstRowId = (upsertCalls[0].rows as any[])[0].occurrence_id
    const secondRowId = (upsertCalls[1].rows as any[])[0].occurrence_id
    // Same session_id + same occurrence_id on both calls -- this is
    // precisely what UNIQUE(session_id, occurrence_id) + ignoreDuplicates
    // needs to actually collapse the retry to one row in Postgres (proven
    // structurally here; the DB constraint enforcement itself is proven by
    // the migration + knowledge-demand-evidence.test.ts's own idempotency
    // options assertion).
    expect(firstRowId).toBe(secondRowId)
  })
})

describe('Case P -- YouTube-shaped demand remains raw evidence only under the new identity scheme', () => {
  test('a YouTube commercial-use demand produces exactly the bounded evidence shape, zero subject/coverage fields', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client show this commercially on YouTube?' })
    const demand = demandCandidate({ raw_text: 'on YouTube', supports_goal_quote: 'show this commercially on YouTube' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))

    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    const occurrence = result.knowledgeDemandOccurrences[0]
    expect(Object.keys(occurrence).sort()).toEqual(
      ['goal_id', 'occurrence_id', 'qualification_state', 'raw_text', 'source_statement', 'source_turn', 'superseded_by'].sort(),
    )
    expect(occurrence.qualification_state).toBe('qualified')
    expect(occurrence.raw_text).toBe('on YouTube')
  })
})

describe('Case Q -- incidental Zoom mention still produces zero occurrences (unaffected by the identity repair)', () => {
  test('"I discussed this with my client on Zoom. Can they use it commercially?" -- no Zoom candidate proposed, zero occurrences', async () => {
    const goal = goalCandidate({ raw_text: 'Can they use it commercially?' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I discussed this with my client on Zoom. Can they use it commercially?' },
      constantExtractor([goal]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})
