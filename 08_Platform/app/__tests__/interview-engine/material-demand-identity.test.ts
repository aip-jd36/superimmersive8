/**
 * LK-DEMAND-2C-R1/R2 (2026-09-18) -- Deterministic, Exact-Provenance
 * Evidence Identity.
 *
 * Proves computeMaterialDemandOccurrenceId's own contract (extraction.ts):
 * KnowledgeDemandOccurrence.occurrence_id is a SHA-256 digest of
 * (source_turn, resolved-goal raw_text, demand raw_text) -- no
 * model-assigned proposal_id, no model-derived goal_id, and (R2) no
 * same-turn ordinal. The durable-evidence invariant this establishes:
 *
 *   ONE accepted user turn x ONE exact explicit goal source text x
 *   ONE exact material-demand source text = ONE durable Material Demand
 *   observation.
 *
 * This is EXACT provenance identity -- never fuzzy dedup, semantic
 * normalization, cross-turn dedup, cross-session dedup, subject
 * resolution, or coverage resolution. See computeMaterialDemandOccurrenceId's
 * own header for the full contract and its one disclosed, deliberately
 * unsolved limitation (genuinely different verbatim spans for
 * semantically-equivalent content stay distinct).
 *
 * Companion to __tests__/interview-engine/material-demand-mention.test.ts
 * (LK-DEMAND-2A/2A-R1/2C, unaffected qualification/provenance/transport
 * behavior -- all 35 of its tests still pass unchanged) -- this file is
 * scoped ONLY to the identity/idempotency question itself.
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

describe('Case A -- exact retry, different model-assigned proposal_id -> SAME occurrence_id', () => {
  test('two independent extraction calls for the same turn/goal-text/demand-text produce the SAME occurrence_id despite entirely different proposal_id labels', async () => {
    const goalCall1 = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this on Twitch commercially?' })
    const demandCall1 = demandCandidate({ proposal_id: 'c2', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const goalCall2 = goalCandidate({ proposal_id: 'zz9', raw_text: 'Can I use this on Twitch commercially?' })
    const demandCall2 = demandCandidate({ proposal_id: 'qq1', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })

    const result1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalCall1, demandCall1]))
    const result2 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalCall2, demandCall2]))

    expect(result1.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result2.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result1.knowledgeDemandOccurrences[0].occurrence_id).toBe(result2.knowledgeDemandOccurrences[0].occurrence_id)
  })
})

describe('Case B -- candidate array reordering (of candidates unrelated to goal-before-demand sequencing) -> SAME occurrence_id', () => {
  test('an unrelated tool_mention candidate appearing before vs after the goal/demand pair does not change the resulting occurrence_id', async () => {
    // NOTE: reordering the demand candidate itself to appear BEFORE its own
    // goal candidate is not a legitimate "reordering has no effect" case --
    // provenance resolution reads current.user_goals, which the goal
    // candidate populates only once it has itself been processed earlier in
    // the array (documented in resolveMaterialDemandGoalTarget's own call
    // site comment); that sequencing requirement is pre-existing 2A
    // behavior, unrelated to and unchanged by this identity repair. This
    // case instead varies the position of a candidate that has NO
    // dependency relationship with the goal/demand pair at all.
    const tool: CandidateObservation = { proposal_id: 't1', turn: 1, raw_text: 'We used Runway.', kind: 'tool_mention', raw_tool_name: 'Runway' }
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })

    const order1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([tool, goal, demand]))
    const order2 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand, tool]))

    expect(order1.knowledgeDemandOccurrences[0].occurrence_id).toBe(order2.knowledgeDemandOccurrences[0].occurrence_id)
  })
})

describe('Case C -- exact duplicate candidates converge on ONE durable observation', () => {
  test('the same raw_text proposed twice for one goal in one turn -- ONE occurrence_id, not two (R2 reverses R1 Case F)', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially, on Twitch?' })
    const first = demandCandidate({ proposal_id: 'c2', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially, on Twitch' })
    const second = demandCandidate({ proposal_id: 'c3', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially, on Twitch' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, first, second]))

    // Both ephemeral entries may still be present in the array (persistence
    // collapses them -- see Case-writer test below) -- the invariant this
    // proves is IDENTITY convergence, not array cardinality.
    expect(result.knowledgeDemandOccurrences.length).toBeGreaterThanOrEqual(1)
    const ids = new Set(result.knowledgeDemandOccurrences.map((o) => o.occurrence_id))
    expect(ids.size).toBe(1)
  })
})

describe('Case D -- two genuinely distinct demand texts, same turn, same goal -> distinct identities', () => {
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

describe('Case E -- same exact demand text, same exact goal text, DIFFERENT turn -> distinct identity', () => {
  test('turn 1 and turn 2 each independently mention "on Twitch" for the identically-worded goal -> different occurrence_id', async () => {
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

describe('Case F -- identical demand text, same turn, DIFFERENT exact goal text -> distinct identity', () => {
  test('"on Twitch" attached to two differently-worded goals -> two occurrences, two different occurrence_id values', async () => {
    const goalOne = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this on Twitch commercially for client A?' })
    const goalTwo = goalCandidate({ proposal_id: 'c2', raw_text: 'Can my agency use this on Twitch commercially for client B?', goal_category_hint: 'commercial_use' })
    const demandOne = demandCandidate({ proposal_id: 'c3', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially for client A' })
    const demandTwo = demandCandidate({ proposal_id: 'c4', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially for client B' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalOne, goalTwo, demandOne, demandTwo]))

    expect(result.updated.user_goals).toHaveLength(2)
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const [a, b] = result.knowledgeDemandOccurrences
    expect(a.goal_id).not.toBe(b.goal_id)
    expect(a.occurrence_id).not.toBe(b.occurrence_id)
  })
})

describe('Case G -- identical tuple across different sessions is safely namespaced at persistence, not at the runtime digest', () => {
  test('runtime occurrence_id may coincide across two sessions (session_id excluded from the digest by design); the writer sends each under its own session_id, which is what actually prevents collision', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const resultSessionA = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    const resultSessionB = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))

    // Runtime digest coincides -- expected and acceptable.
    expect(resultSessionA.knowledgeDemandOccurrences[0].occurrence_id).toBe(resultSessionB.knowledgeDemandOccurrences[0].occurrence_id)

    const upsertCalls: { rows: unknown }[] = []
    const fakeClient = {
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows: unknown) => {
          upsertCalls.push({ rows })
          return { error: null }
        }),
      })),
    } as any

    await recordKnowledgeDemandEvidence(fakeClient, { sessionId: 'session-A', occurrences: resultSessionA.knowledgeDemandOccurrences })
    await recordKnowledgeDemandEvidence(fakeClient, { sessionId: 'session-B', occurrences: resultSessionB.knowledgeDemandOccurrences })

    const rowA = (upsertCalls[0].rows as any[])[0]
    const rowB = (upsertCalls[1].rows as any[])[0]
    expect(rowA.session_id).toBe('session-A')
    expect(rowB.session_id).toBe('session-B')
    expect(rowA.occurrence_id).toBe(rowB.occurrence_id)
    // The DB's own UNIQUE(session_id, occurrence_id) constraint (not this
    // test, which has no live DB) is what makes this safe -- proven at the
    // schema level by the migration + knowledge-demand-evidence.test.ts's
    // own idempotency-options assertion.
  })
})

describe('Case H -- same-turn correction lineage remains correct under the R2 (no-ordinal) identity scheme', () => {
  test('"on Kick -- actually, I mean Twitch" still supersedes correctly, using the new deterministic occurrence_id values', async () => {
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
  })

  test('cross-turn correction remains unimplemented (unchanged, documented limitation)', async () => {
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

describe('Case I -- exact duplicate emission cannot create self-supersession or ambiguous lineage', () => {
  test('two exact-duplicate "on Kick" candidates (same occurrence_id) followed by a correction targeting "Kick" -- fails closed on the existing multi-match guard, exactly as it already did before R2; no self-reference, no crash', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this commercially on Kick, on Kick?' })
    const kickA = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on Kick, on Kick' })
    const kickB = demandCandidate({ proposal_id: 'c3', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on Kick, on Kick' })
    const correction = demandCandidate({
      proposal_id: 'c4',
      raw_text: 'Twitch',
      supports_goal_quote: 'use this commercially on Kick, on Kick',
      is_correction: true,
      correction_of_raw_text: 'Kick',
    })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, kickA, kickB, correction]))

    // Two duplicate Kick entries (both un-superseded, ambiguous multi-match
    // for the correction's own text-based target resolution) plus the new
    // Twitch occurrence, independently created -- the correction fails
    // closed on WHICH Kick it targets (pre-existing 2A/R1 behavior,
    // unrelated to occurrence_id identity), never guesses, never points to
    // itself.
    const kicks = result.knowledgeDemandOccurrences.filter((o) => o.raw_text === 'on Kick')
    const twitch = result.knowledgeDemandOccurrences.find((o) => o.raw_text === 'Twitch')!
    expect(kicks.length).toBeGreaterThanOrEqual(1)
    for (const kick of kicks) {
      expect(kick.superseded_by).toBeNull()
      expect(kick.superseded_by).not.toBe(kick.occurrence_id) // no self-supersession
    }
    expect(twitch.superseded_by).toBeNull()
  })
})

describe('Case J (writer) -- exact duplicate occurrences collapse to ONE upserted row', () => {
  test('recordKnowledgeDemandEvidence dedupes rows sharing an occurrence_id before writing', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially, on Twitch?' })
    const first = demandCandidate({ proposal_id: 'c2', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially, on Twitch' })
    const second = demandCandidate({ proposal_id: 'c3', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially, on Twitch' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, first, second]))

    const upsertCalls: { rows: unknown }[] = []
    const fakeClient = {
      from: jest.fn(() => ({
        upsert: jest.fn(async (rows: unknown) => {
          upsertCalls.push({ rows })
          return { error: null }
        }),
      })),
    } as any

    await recordKnowledgeDemandEvidence(fakeClient, { sessionId: 'sess-dup', occurrences: result.knowledgeDemandOccurrences })

    expect(upsertCalls).toHaveLength(1)
    const rows = upsertCalls[0].rows as any[]
    expect(rows).toHaveLength(1) // durably ONE observation, not N
  })
})

describe('Case K -- no fuzzy/semantic normalization participates in identity', () => {
  test('a case/whitespace-different demand text is treated as a DIFFERENT occurrence, never silently collapsed', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const lower = demandCandidate({ proposal_id: 'c2', raw_text: 'on twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const proper = demandCandidate({ proposal_id: 'c3', raw_text: 'On Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, lower, proper]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const ids = new Set(result.knowledgeDemandOccurrences.map((o) => o.occurrence_id))
    expect(ids.size).toBe(2)
  })
})

describe('Case S -- YouTube-shaped demand remains raw evidence only under the R2 identity scheme', () => {
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

  test('two genuinely different verbatim spans for the same real-world platform are NOT collapsed -- the disclosed, deliberately unsolved limitation', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client show this commercially on YouTube?' })
    const short = demandCandidate({ proposal_id: 'c2', raw_text: 'on YouTube', supports_goal_quote: 'show this commercially on YouTube' })
    const long = demandCandidate({ proposal_id: 'c3', raw_text: 'show it commercially on YouTube', supports_goal_quote: 'show this commercially on YouTube' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, short, long]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    expect(result.knowledgeDemandOccurrences[0].occurrence_id).not.toBe(result.knowledgeDemandOccurrences[1].occurrence_id)
  })
})

describe('Case T -- incidental Zoom-shaped mention still produces zero occurrences (unaffected by the identity repair)', () => {
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
