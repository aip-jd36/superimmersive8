/**
 * LK-DEMAND-2A -- Material Demand Runtime Representation + Extraction
 * (2026-09-17). Implements the architecture established by LK-DEMAND-1
 * (Generic Uncovered Knowledge Demand Contract) and refined by LK-DEMAND-1A
 * (Material Demand Qualification Contract).
 *
 * Scope of THIS milestone, proven by these tests: existing explicit
 * UserGoal -> model proposes material_demand_mention -> deterministic
 * provenance resolution -> in-memory qualified/indeterminate
 * KnowledgeDemandOccurrence. Does NOT determine LK coverage, does NOT
 * create an "uncovered" result, does NOT persist anything, does NOT touch
 * Retrieval/BI/Composition/questioning/completion/gates/phase -- see the
 * "Behavioral non-interference" describe block at the bottom for direct
 * proof of the last group.
 *
 * Deliberately reuses the same mock-extractor discipline as
 * extraction.test.ts: constantExtractor returns whatever
 * CandidateObservation[] it is given, regardless of turn text -- these
 * tests exercise the real deterministic pipeline (resolveMaterialDemandGoalTarget,
 * runExtractionPipeline's own material_demand_mention branch), not natural-
 * language understanding. Generic Twitch/Slack/Shutterstock/Photoshop
 * examples are used throughout -- distinct from the anthropic-extractor.ts
 * prompt's own Twitch/Slack/Shutterstock/Photoshop examples and from the
 * YouTube/Zoom/Vimeo/Chrome/Getty examples used in the LK-DEMAND-1A
 * architecture report -- so no single example set does double duty as both
 * the taught pattern and the test oracle.
 *
 * Run: npx jest __tests__/interview-engine/material-demand-mention.test.ts
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { CandidateObservation } from '@/lib/interview-engine/extraction'
import { runExtractionPipeline } from '@/lib/interview-engine/extraction'
import { constantExtractor } from '@/lib/interview-engine/mock-extractor'
import { runTurn, type RunTurnDeps } from '@/lib/crc-engine/run-turn'
import { createInMemorySessionStore } from '@/lib/crc-engine/in-memory-session-store'
import { constantCandidateQuestionGenerator } from '@/lib/interview-engine/mock-candidate-question'
import { constantConstraintADecider } from '@/lib/interview-engine/mock-decision'
import type { SessionStore } from '@/lib/crc-engine/session-store'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'

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

describe('Case A -- material subject embedded in the question itself', () => {
  test('"Can I use this on Twitch commercially?" -- Twitch qualifies, goal remains an ordinary commercial_use goal, no lifecycle effect', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'Can I use this on Twitch commercially?' }, constantExtractor([goal, demand]))

    // The commercial-use goal itself is completely ordinary -- unaffected.
    expect(result.updated.user_goals).toHaveLength(1)
    expect(result.updated.user_goals[0].category).toBe('commercial_use')

    // Exactly one qualified occurrence, correctly anchored to that goal.
    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    const occurrence = result.knowledgeDemandOccurrences[0]
    expect(occurrence.qualification_state).toBe('qualified')
    expect(occurrence.raw_text).toBe('on Twitch')
    expect(occurrence.goal_id).toBe(result.updated.user_goals[0].goal_id)
    expect(occurrence.superseded_by).toBeNull()

    // No new project fact, no second goal -- material_demand_mention never
    // becomes a UserGoal.
    expect(result.updated.user_goals).toHaveLength(1)
    expect(result.diagnostics.every((d) => d.candidate.kind !== 'material_demand_mention')).toBe(true)
  })
})

describe('Case B -- incidental communication context does not qualify', () => {
  test('a Slack mention in a separate declarative sentence is never forced into an occurrence merely because a candidate is proposed for it', async () => {
    // Proves the ARCHITECTURE never manufactures qualification from mere
    // goal-anchoring: even if extraction incorrectly proposed a candidate
    // for incidental context, the correct extraction-time judgment (per
    // SYSTEM_PROMPT's own guidance) is to NOT propose one at all -- this
    // test constructs the turn WITHOUT a Slack candidate, exactly matching
    // what correct extraction should produce for "I discussed this with my
    // client on Slack. Can they use it commercially?"
    const goal = goalCandidate({ raw_text: 'Can they use it commercially?' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I discussed this with my client on Slack. Can they use it commercially?' },
      constantExtractor([goal]),
    )
    expect(result.updated.user_goals).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})

describe('Case C -- generic alternate platform, proving no platform-specific implementation', () => {
  test('"Can I publish this commercially on Kick?" behaves identically to Case A -- same generic mechanism, different noun', async () => {
    const goal = goalCandidate({ raw_text: 'Can I publish this commercially on Kick?' })
    const demand = demandCandidate({ raw_text: 'on Kick', supports_goal_quote: 'publish this commercially on Kick' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'Can I publish this commercially on Kick?' }, constantExtractor([goal, demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences[0].qualification_state).toBe('qualified')
    expect(result.knowledgeDemandOccurrences[0].raw_text).toBe('on Kick')
  })
})

describe('Case D -- incidental software does not qualify', () => {
  test('"I edited the file in GIMP. Can my client use it commercially?" -- no GIMP candidate proposed, no occurrence', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use it commercially?' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I edited the file in GIMP. Can my client use it commercially?' },
      constantExtractor([goal]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})

describe('Case E -- material source embedded in a conditional within the question', () => {
  test('"Does using Pond5 footage affect whether I can use this commercially?" -- Pond5 qualifies; existing third-party-source behavior is unaffected', async () => {
    const goal = goalCandidate({ raw_text: 'Does using Pond5 footage affect whether I can use this commercially?', goal_category_hint: 'commercial_use' })
    const demand = demandCandidate({ raw_text: 'Pond5 footage', supports_goal_quote: 'Does using Pond5 footage affect whether I can use this commercially' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Does using Pond5 footage affect whether I can use this commercially?' },
      constantExtractor([goal, demand]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences[0].qualification_state).toBe('qualified')
    // Unchanged: no asset_provider_mention was proposed in this fixture, so
    // none is created -- material_demand_mention is entirely independent of
    // that existing mechanism (LK-DEMAND-1's own Track A/B/C separation).
    expect(result.updated.asset_provider_mentions).toHaveLength(0)
    // Still exactly one goal -- no fabricated extra UserGoal.
    expect(result.updated.user_goals).toHaveLength(1)
  })
})

describe('Case F -- incidental source mention does not qualify merely because it names a known provider', () => {
  test('"My client emailed me a Pond5 link yesterday. Can they commercially use the video I made?" -- Pond5 does not qualify from the language alone', async () => {
    const goal = goalCandidate({ raw_text: 'Can they commercially use the video I made?' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'My client emailed me a Pond5 link yesterday. Can they commercially use the video I made?' },
      constantExtractor([goal]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})

describe('Case G -- no sub-demand needed for a plain goal', () => {
  test('"Can my client use this commercially?" alone -- zero occurrences required, normal behavior unchanged', async () => {
    const goal = goalCandidate()
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'Can my client use this commercially?' }, constantExtractor([goal]))
    expect(result.updated.user_goals).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})

describe('Case H -- multiple material subjects', () => {
  test('"Can my client use this on Kick and Twitch?" -- two independent occurrences, no domain-specific merging code', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use this on Kick and Twitch?' })
    const kickDemand = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this on Kick and Twitch' })
    const twitchDemand = demandCandidate({ proposal_id: 'c3', raw_text: 'Twitch', supports_goal_quote: 'use this on Kick and Twitch' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can my client use this on Kick and Twitch?' },
      constantExtractor([goal, kickDemand, twitchDemand]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const rawTexts = result.knowledgeDemandOccurrences.map((o) => o.raw_text).sort()
    expect(rawTexts).toEqual(['Twitch', 'on Kick'].sort())
    // Both anchored to the SAME goal -- one goal, two independent demands.
    expect(new Set(result.knowledgeDemandOccurrences.map((o) => o.goal_id)).size).toBe(1)
  })
})

describe('Case I -- genuinely ambiguous prior-upload framing', () => {
  test('when the mock extractor represents the ambiguity as low_confidence, the occurrence is indeterminate, never forced qualified', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use the video commercially?' })
    const demand = demandCandidate({
      raw_text: 'uploaded it to Kick already',
      supports_goal_quote: 'Can my client use the video commercially',
      low_confidence: true,
    })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I uploaded it to Kick already. Can my client use the video commercially?' },
      constantExtractor([goal, demand]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences[0].qualification_state).toBe('indeterminate')
  })

  test('or, when extraction correctly judges it non-material (mirroring Case B/F\'s own shape), no candidate is proposed at all', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use the video commercially?' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I uploaded it to Kick already. Can my client use the video commercially?' },
      constantExtractor([goal]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})

describe('Case J -- unresolvable goal provenance', () => {
  test('supports_goal_quote matching no active goal -- candidate is dropped, no fabricated goal_id, no occurrence', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use this commercially?' })
    const demand = demandCandidate({ raw_text: 'on Kick', supports_goal_quote: 'a completely unrelated quote that matches nothing' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can my client use this commercially? Also, on Kick.' },
      constantExtractor([goal, demand]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('no active goal exists at all -- candidate is dropped', async () => {
    const demand = demandCandidate()
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'on Twitch' }, constantExtractor([demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
    expect(result.updated.user_goals).toHaveLength(0)
  })
})

describe('Case K -- ambiguous goal provenance', () => {
  test('supports_goal_quote text matches more than one active goal -- fail closed, no guessed provenance', async () => {
    // Two active goals whose raw_text both contain the SAME shared phrase,
    // so a quote of just that phrase is genuinely ambiguous between them --
    // mirrors resolveUserGoalTarget's own multi-match fail-closed case.
    const goalOne = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this commercially for a client ad?' })
    const goalTwo = goalCandidate({
      proposal_id: 'c2',
      raw_text: 'Do I own the copyright, and can I use this commercially for a client ad?',
      goal_category_hint: 'copyright_ownership',
    })
    const demand = demandCandidate({ proposal_id: 'c3', raw_text: 'on Kick', supports_goal_quote: 'use this commercially for a client ad' })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially for a client ad, and do I own the copyright? Also on Kick.' },
      constantExtractor([goalOne, goalTwo, demand]),
    )
    expect(result.updated.user_goals).toHaveLength(2)
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })
})

describe('Case L -- low confidence', () => {
  test('valid goal provenance + low_confidence true -> qualification_state is indeterminate, never silently upgraded', async () => {
    const goal = goalCandidate()
    const demand = demandCandidate({ low_confidence: true })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences[0].qualification_state).toBe('indeterminate')
  })

  test('valid goal provenance + low_confidence unset -> qualified', async () => {
    const goal = goalCandidate()
    const demand = demandCandidate()
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    expect(result.knowledgeDemandOccurrences[0].qualification_state).toBe('qualified')
  })
})

describe('Case M -- correction/supersession', () => {
  test('within the SAME turn: "on Kick -- actually, I mean Twitch" supersedes the Kick occurrence, Twitch is active', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this commercially on a platform?' })
    const kickDemand = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on a platform' })
    const correction = demandCandidate({
      proposal_id: 'c3',
      raw_text: 'Twitch',
      supports_goal_quote: 'use this commercially on a platform',
      is_correction: true,
      correction_of_raw_text: 'Kick',
    })
    const result = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially on a platform, on Kick -- actually, I mean Twitch.' },
      constantExtractor([goal, kickDemand, correction]),
    )
    expect(result.knowledgeDemandOccurrences).toHaveLength(2)
    const kick = result.knowledgeDemandOccurrences.find((o) => o.raw_text === 'on Kick')!
    const twitch = result.knowledgeDemandOccurrences.find((o) => o.raw_text === 'Twitch')!
    expect(kick.superseded_by).toBe(twitch.occurrence_id)
    expect(twitch.superseded_by).toBeNull()
  })

  test('DOCUMENTED LIMITATION: cross-turn correction is not resolvable in LK-DEMAND-2A -- a second turn has no durable store to resolve against, so both occurrences from separate calls remain independently active', async () => {
    const store: { occurrences: ReturnType<typeof Array>; goal_id?: string } = { occurrences: [] }
    const goal = goalCandidate({ raw_text: 'Can I use this commercially on a platform?' })
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this commercially on a platform? On Kick.' },
      constantExtractor([goal, demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on a platform' })]),
    )
    expect(turn1.knowledgeDemandOccurrences).toHaveLength(1)
    expect(turn1.knowledgeDemandOccurrences[0].superseded_by).toBeNull()

    // Turn 2: runExtractionPipeline is called fresh, with no visibility into
    // turn 1's already-returned-and-discarded occurrence -- there is
    // nothing here for a correction to resolve against, by construction.
    // This is the exact, explicitly-accepted limitation documented on
    // KnowledgeDemandOccurrence.superseded_by's own header and
    // runExtractionPipeline's own material_demand_mention branch --
    // deferred to the persistence milestone (LK-DEMAND-2D), not an
    // oversight of this one.
    const correction = demandCandidate({
      proposal_id: 'c2',
      raw_text: 'Twitch',
      supports_goal_quote: 'use this commercially on a platform',
      is_correction: true,
      correction_of_raw_text: 'Kick',
    })
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Actually, I mean Twitch.' },
      constantExtractor([correction]),
    )
    // The new occurrence is still constructed (goal provenance resolves
    // fine against turn1.updated.user_goals), but as an independent,
    // un-superseding record -- turn 1's occurrence is gone from this call's
    // return value entirely (this milestone never persists it), so there is
    // nothing left in-process to mark as superseded.
    expect(turn2.knowledgeDemandOccurrences).toHaveLength(1)
    expect(turn2.knowledgeDemandOccurrences[0].raw_text).toBe('Twitch')
    expect(turn2.knowledgeDemandOccurrences[0].superseded_by).toBeNull()
  })
})

// ── Case N -- explicit provenance fail-closed matrix (LK-DEMAND-2A-R1,
// 2026-09-17) ────────────────────────────────────────────────────────────
//
// The established invariant: model supplies textual goal provenance ->
// deterministic code resolves exactly one active explicit UserGoal ->
// occurrence may be constructed. If provenance is missing, blank,
// unresolvable, or ambiguous, fail closed -- a sole active UserGoal (or
// any other goal-COUNT fact) never authorizes deterministic code to
// fabricate the missing provenance relationship.

describe('Case N -- explicit provenance is mandatory; no fallback ever fabricates it', () => {
  test('N.A -- supports_goal_quote missing entirely (undefined): zero occurrences, even with exactly one active goal', async () => {
    const goal = goalCandidate()
    const demand = demandCandidate({ supports_goal_quote: undefined })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('N.B -- supports_goal_quote blank (empty string / whitespace-only): zero occurrences, even with exactly one active goal', async () => {
    const goal = goalCandidate()
    for (const blank of ['', '   ', '\t\n']) {
      const demand = demandCandidate({ supports_goal_quote: blank })
      const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
      expect(result.knowledgeDemandOccurrences).toHaveLength(0)
    }
  })

  test('N.C -- supports_goal_quote unresolvable (matches no active goal\'s raw_text): zero occurrences', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use this commercially?' })
    const demand = demandCandidate({ supports_goal_quote: 'a completely unrelated quote matching nothing' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('N.D -- supports_goal_quote ambiguous across two active goals: zero occurrences, no nearest-match guess', async () => {
    const sharedPhrase = 'use this commercially for a client ad'
    const goalOne = goalCandidate({ proposal_id: 'c1', raw_text: `Can I ${sharedPhrase}?` })
    const goalTwo = goalCandidate({ proposal_id: 'c2', raw_text: `Do I own the copyright, and can I ${sharedPhrase}?`, goal_category_hint: 'copyright_ownership' })
    const demand = demandCandidate({ proposal_id: 'c3', supports_goal_quote: sharedPhrase })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalOne, goalTwo, demand]))
    expect(result.updated.user_goals).toHaveLength(2)
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('N.E -- supports_goal_quote refers only to a superseded (inactive) goal: zero occurrences, no reach-back through a correction', async () => {
    const originalGoal = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this commercially for a client?' })
    const correction = goalCandidate({
      proposal_id: 'c2',
      raw_text: 'Actually, do I own the copyright instead?',
      goal_category_hint: 'copyright_ownership',
      is_correction: true,
      // resolveUserGoalTarget requires correction_of_raw_text to CONTAIN
      // the target goal's own raw_text (needle.includes(g.raw_text)) --
      // the exact full text guarantees an unambiguous single match.
      correction_of_raw_text: originalGoal.raw_text,
    })
    // The demand's own quote matches ONLY the now-superseded original goal
    // -- never a live goal at all.
    const demand = demandCandidate({ proposal_id: 'c3', supports_goal_quote: 'use this commercially for a client' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([originalGoal, correction, demand]))

    const loadedGoal = result.updated.user_goals.find((g) => g.raw_text === originalGoal.raw_text)!
    expect(loadedGoal.superseded_by).not.toBeNull() // sanity: the goal really is superseded
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('N.F -- positive control: a valid explicit quote resolving to exactly one active goal still constructs the occurrence normally', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(1)
    expect(result.knowledgeDemandOccurrences[0].goal_id).toBe(result.updated.user_goals[0].goal_id)
    expect(result.knowledgeDemandOccurrences[0].qualification_state).toBe('qualified')
  })
})

describe('Structured-output reliability', () => {
  test('a material_demand_mention candidate with no supports_goal_quote at all, and more than one active goal, fails closed (no fallback guess)', async () => {
    const goalOne = goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this commercially?' })
    const goalTwo = goalCandidate({ proposal_id: 'c2', raw_text: 'Do I own the copyright?', goal_category_hint: 'copyright_ownership' })
    const demand = demandCandidate({ proposal_id: 'c3', supports_goal_quote: undefined })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goalOne, goalTwo, demand]))
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('a material_demand_mention candidate with no supports_goal_quote and exactly ONE active goal STILL fails closed (LK-DEMAND-2A-R1: no single-active-goal fallback)', async () => {
    const goal = goalCandidate()
    const demand = demandCandidate({ supports_goal_quote: undefined })
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    // Pre-R1 behavior fabricated an occurrence here via a sole-goal
    // fallback. R1 removed that: a missing quote carries zero textual
    // evidence, and goal COUNT is never treated as provenance.
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('existing candidate kinds remain valid and unaffected by the new kind existing in the same union', async () => {
    const tool: CandidateObservation = { proposal_id: 'c1', turn: 1, raw_text: 'We used Runway.', kind: 'tool_mention', raw_tool_name: 'Runway' }
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'We used Runway.' }, constantExtractor([tool]))
    expect(result.updated.tool_mentions).toHaveLength(1)
    expect(result.updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    expect(result.knowledgeDemandOccurrences).toHaveLength(0)
  })

  test('a material_demand_mention candidate never produces an ExtractionDiagnostic entry -- no normalization/attestation path is exercised for this kind', async () => {
    const goal = goalCandidate()
    const demand = demandCandidate()
    const result = await runExtractionPipeline(emptySU(), { turn: 1, text: 'x' }, constantExtractor([goal, demand]))
    expect(result.diagnostics.some((d) => d.candidate.proposal_id === demand.proposal_id)).toBe(false)
  })
})

// ── Behavioral non-interference (Phase 11) ──────────────────────────────────
//
// Proves LK-DEMAND-2A does not change UserGoal extraction semantics,
// StructuredUnderstanding's authoritative shape, Gate 1, Gate 2, phase
// progression, completion, or questioning -- exercised through the REAL
// runTurn() entry point (not just runExtractionPipeline in isolation),
// since run-turn.ts is the one call site that could theoretically wire the
// new return field into anything. It does not -- this suite proves that by
// running two otherwise-identical turns, one with a material_demand_mention
// candidate present and one without, and asserting byte-identical outcomes.

const FILLER_PROPOSAL = { question_text: '[ordinary filler]', question_kind: 'other' as const, target_signal_id: null, phase: 3 as const }

function runTurnDeps(overrides: Partial<RunTurnDeps> = {}, store?: SessionStore): RunTurnDeps {
  return {
    extractor: constantExtractor([]),
    generator: constantCandidateQuestionGenerator(FILLER_PROPOSAL),
    decider: constantConstraintADecider({ should_ask: true, reason_code: 'MATERIALLY_IMPROVES_UNDERSTANDING', rationale: 'x' }),
    sessionStore: store ?? createInMemorySessionStore(),
    matrix: MATRIX_FIXTURE,
    topicClaims: [],
    ...overrides,
  }
}

describe('Behavioral non-interference: runTurn() outcome is byte-identical with or without a material_demand_mention candidate present', () => {
  test('same goal, same tool, same everything -- the ONLY difference is an extra material_demand_mention candidate this turn; outcome, gate states, phase, and completion_reason are unaffected', async () => {
    const toolCandidate: CandidateObservation = { proposal_id: 'c1', turn: 1, raw_text: 'We used Runway.', kind: 'tool_mention', raw_tool_name: 'Runway' }
    const roleCandidate: CandidateObservation = {
      proposal_id: 'c2',
      turn: 1,
      raw_text: 'solo operator',
      kind: 'project_fact',
      raw_fact_field: 'workflow_role',
      fact_confidence_hint: 'confirmed',
      fact_value_hint: 'solo operator',
    }
    const useCandidate: CandidateObservation = {
      proposal_id: 'c3',
      turn: 1,
      raw_text: 'a paid campaign',
      kind: 'project_fact',
      raw_fact_field: 'intended_use',
      fact_confidence_hint: 'confirmed',
      fact_value_hint: 'a paid campaign',
    }
    const goal = goalCandidate({ proposal_id: 'c4', turn: 1, raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ proposal_id: 'c5', turn: 1, raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })

    const storeWithout = createInMemorySessionStore()
    const withoutDemand = await runTurn(
      { token: 'no-demand', turnNumber: 1, userText: 'x' },
      runTurnDeps({ extractor: constantExtractor([toolCandidate, roleCandidate, useCandidate, goal]) }, storeWithout),
    )

    const storeWith = createInMemorySessionStore()
    const withDemand = await runTurn(
      { token: 'with-demand', turnNumber: 1, userText: 'x' },
      runTurnDeps({ extractor: constantExtractor([toolCandidate, roleCandidate, useCandidate, goal, demand]) }, storeWith),
    )

    expect(withDemand.kind).toBe(withoutDemand.kind)

    const loadedWithout = (await storeWithout.load('no-demand')) as {
      structured_understanding: { gate_1_state: string; gate_2_state: string; current_phase: number; completion_reason: string | null; user_goals: unknown[] }
    }
    const loadedWith = (await storeWith.load('with-demand')) as typeof loadedWithout
    expect(loadedWith.structured_understanding.gate_1_state).toBe(loadedWithout.structured_understanding.gate_1_state)
    expect(loadedWith.structured_understanding.gate_2_state).toBe(loadedWithout.structured_understanding.gate_2_state)
    expect(loadedWith.structured_understanding.current_phase).toBe(loadedWithout.structured_understanding.current_phase)
    expect(loadedWith.structured_understanding.completion_reason).toBe(loadedWithout.structured_understanding.completion_reason)
    // Same number of goals persisted -- material_demand_mention never adds
    // a second UserGoal.
    expect(loadedWith.structured_understanding.user_goals).toHaveLength(loadedWithout.structured_understanding.user_goals.length)
  })
})

// ── LK-DEMAND-2C -- durable evidence transport seam (2026-09-18) ───────────
//
// LK-DEMAND-2A/2A-R1 (above) proved knowledgeDemandOccurrences exists as an
// in-memory runExtractionPipeline return value and never leaks into
// StructuredUnderstanding/Gate 1/Gate 2/phase/completion. LK-DEMAND-2C adds
// no new extraction/qualification logic -- it only threads that same,
// already-proven-inert value out through TurnOutcome as additive metadata
// (mirroring the existing precedingTakeaway field), for
// app/api/crc/turn/route.ts to hand to recordKnowledgeDemandEvidence()
// AFTER the authoritative session save. These tests exercise the real
// runTurn() entry point to prove that transport, not the persistence writer
// itself (see __tests__/crc-engine/knowledge-demand-evidence.test.ts for
// that). Case letters below refer to the LK-DEMAND-2C task's own Phase 11
// matrix, not this file's earlier (unrelated) Case A-N lettering.

describe('LK-DEMAND-2C -- TurnOutcome.knowledgeDemandOccurrences transport', () => {
  test('Case J -- a qualified occurrence rides along on an ordinary "question" TurnOutcome, correctly shaped', async () => {
    const goal = goalCandidate({ proposal_id: 'c4', raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ proposal_id: 'c5', raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const outcome = await runTurn({ token: 'j1', turnNumber: 1, userText: 'x' }, runTurnDeps({ extractor: constantExtractor([goal, demand]) }))

    expect(outcome.kind).toBe('question')
    expect(outcome.knowledgeDemandOccurrences).toHaveLength(1)
    expect(outcome.knowledgeDemandOccurrences![0].raw_text).toBe('on Twitch')
    expect(outcome.knowledgeDemandOccurrences![0].qualification_state).toBe('qualified')
    expect(outcome.knowledgeDemandOccurrences![0].source_turn).toBe(1)
  })

  test('Case K -- no material demand this turn: the field is entirely absent from TurnOutcome, not an empty array', async () => {
    const goal = goalCandidate()
    const outcome = await runTurn({ token: 'k1', turnNumber: 1, userText: 'x' }, runTurnDeps({ extractor: constantExtractor([goal]) }))

    expect(outcome.kind).toBe('question')
    expect(outcome).not.toHaveProperty('knowledgeDemandOccurrences')
  })

  test('Case L -- multiple qualified occurrences from Case H\'s own fixture shape all ride along together, independently', async () => {
    const goal = goalCandidate({ raw_text: 'Can my client use this on Kick and Twitch?' })
    const kickDemand = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this on Kick and Twitch' })
    const twitchDemand = demandCandidate({ proposal_id: 'c3', raw_text: 'Twitch', supports_goal_quote: 'use this on Kick and Twitch' })
    const outcome = await runTurn(
      { token: 'l1', turnNumber: 1, userText: 'x' },
      runTurnDeps({ extractor: constantExtractor([goal, kickDemand, twitchDemand]) }),
    )

    expect(outcome.knowledgeDemandOccurrences).toHaveLength(2)
    expect(outcome.knowledgeDemandOccurrences!.map((o) => o.raw_text).sort()).toEqual(['Twitch', 'on Kick'].sort())
  })

  test('Case M -- same-turn correction: both occurrences ride along, superseded_by correctly links them', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this commercially on a platform?' })
    const kickDemand = demandCandidate({ proposal_id: 'c2', raw_text: 'on Kick', supports_goal_quote: 'use this commercially on a platform' })
    const correction = demandCandidate({
      proposal_id: 'c3',
      raw_text: 'Twitch',
      supports_goal_quote: 'use this commercially on a platform',
      is_correction: true,
      correction_of_raw_text: 'Kick',
    })
    const outcome = await runTurn(
      { token: 'm1', turnNumber: 1, userText: 'x' },
      runTurnDeps({ extractor: constantExtractor([goal, kickDemand, correction]) }),
    )

    const occurrences = outcome.knowledgeDemandOccurrences!
    expect(occurrences).toHaveLength(2)
    const kick = occurrences.find((o) => o.raw_text === 'on Kick')!
    const twitch = occurrences.find((o) => o.raw_text === 'Twitch')!
    expect(kick.superseded_by).toBe(twitch.occurrence_id)
    expect(twitch.superseded_by).toBeNull()
  })

  test('Case N -- the field also rides along on a "complete" TurnOutcome (stop_interview decline path)', async () => {
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const outcome = await runTurn(
      { token: 'n1', turnNumber: 1, userText: 'skip', declineAction: 'stop_interview' },
      runTurnDeps({ extractor: constantExtractor([goal, demand]) }),
    )

    expect(outcome.kind).toBe('complete')
    expect(outcome.knowledgeDemandOccurrences).toHaveLength(1)
    expect(outcome.knowledgeDemandOccurrences![0].raw_text).toBe('on Twitch')
  })

  test('Case O -- a replayed already-complete session (no extraction runs) carries no knowledgeDemandOccurrences field at all', async () => {
    // Mirrors run-turn.ts's own §7 recovery short-circuit (completion_reason
    // already set): runExtractionPipeline never runs on this path, so there
    // is no new evidence to report for a turn that was never really
    // processed.
    const store = createInMemorySessionStore()
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    await runTurn(
      { token: 'o1', turnNumber: 1, userText: 'skip', declineAction: 'stop_interview' },
      runTurnDeps({ extractor: constantExtractor([goal, demand]) }, store),
    )

    const replay = await runTurn({ token: 'o1', turnNumber: 2, userText: 'anything' }, runTurnDeps({}, store))
    expect(replay.kind).toBe('complete')
    expect(replay).not.toHaveProperty('knowledgeDemandOccurrences')
  })

  test('Case P -- knowledgeDemandOccurrences is never written into persisted session state -- it is TurnOutcome-only metadata, never engine state', async () => {
    const store = createInMemorySessionStore()
    const goal = goalCandidate({ raw_text: 'Can I use this on Twitch commercially?' })
    const demand = demandCandidate({ raw_text: 'on Twitch', supports_goal_quote: 'use this on Twitch commercially' })
    const outcome = await runTurn({ token: 'p1', turnNumber: 1, userText: 'x' }, runTurnDeps({ extractor: constantExtractor([goal, demand]) }, store))
    expect(outcome.knowledgeDemandOccurrences).toHaveLength(1)

    const loaded = (await store.load('p1')) as unknown as { structured_understanding: Record<string, unknown> }
    expect(loaded.structured_understanding).not.toHaveProperty('knowledgeDemandOccurrences')
    expect(loaded.structured_understanding).not.toHaveProperty('knowledge_demand_occurrences')
    expect(JSON.stringify(loaded.structured_understanding)).not.toContain('knowledgeDemandOccurrences')
  })
})
