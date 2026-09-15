/**
 * Generic Follow-Up Target Reconciliation -- ToolMention adoption
 * (2026-09-15). Closes the production-proven NY Performer UAT defect: a
 * plan-tier follow-up about an already-canonical ToolMention created a
 * SECOND, spurious `unresolved_alias` mention instead of enriching the
 * existing one, because (a) the extractor's candidate raw_tool_name
 * happened to echo the canonical identifier itself, which KNOWN_TOOLS did
 * not recognize as a valid input (normalization idempotency gap), and (b)
 * the structural `PendingClarification.signal_id` -- which already,
 * correctly, identified the existing ToolMention the question concerned --
 * was never threaded into `resolveToolMentionTarget`'s own deterministic
 * reconciliation (target-provenance gap).
 *
 * Tests assert on authoritative `StructuredUnderstanding.tool_mentions`
 * state (active count, `resolution.kind`, `superseded_by` chains), never
 * rendered copy. No live model/API calls -- `constantExtractor` (existing
 * mock, mirrors extraction.test.ts's own convention) supplies fixed
 * `CandidateObservation[]` per turn.
 *
 * Scope: ToolMention only, per the architecture freeze -- the other five
 * resolver families (AssetProviderMention, UserGoal,
 * AssessmentJurisdictionMention, DistributionTerritoryMention,
 * OrganizationLocationMention) and ScopedObservation are explicitly
 * untouched and unexercised for pending-target behavior here.
 */

import type { StructuredUnderstanding, ToolMention, ProjectFacts } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { normalizeCandidate, runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'
import type { RawUserTurn } from '../../lib/interview-engine/extraction'
import type { PendingClarification } from '../../lib/interview-engine/pending-clarification'
import { evaluateGate1 } from '../../lib/interview-engine/gates'

function projectFacts(): ProjectFacts {
  return {
    intended_use: { attestation: { state: 'confirmed', value: 'Commercial advertisement' }, source_turn: 1, source_statement: 'placeholder' },
    workflow_role: { attestation: { state: 'confirmed', value: 'Producer' }, source_turn: 1, source_statement: 'placeholder' },
    jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
  }
}

function baseSU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
  return {
    project_facts: projectFacts(),
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    distribution_territory_mentions: [],
    organization_location_mentions: [],
    current_phase: 3,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
    ...overrides,
  }
}

function canonicalRunwayMention(overrides: Partial<ToolMention> = {}): ToolMention {
  return {
    mention_id: 'tm-1',
    resolution: { kind: 'canonical', identifier: 'runway-gen3' },
    access_surface: { state: 'unknown' },
    plan_tier: { state: 'unknown' },
    account_status: { state: 'unknown' },
    confidence: 'confirmed',
    source_turn: 6,
    source_statement: 'I used Runway.',
    superseded_by: null,
    ...overrides,
  }
}

function planTierCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c-plan-tier',
    turn: 7,
    raw_text: 'I was using a paid individual plan.',
    kind: 'tool_mention',
    plan_tier_confidence_hint: 'confirmed',
    plan_tier_value_hint: 'paid individual plan',
    ...overrides,
  }
}

function pendingRunwayClarification(overrides: Partial<PendingClarification> = {}): PendingClarification {
  return {
    signal_id: 'tm-1',
    kind: 'follow_up_on_signal',
    unresolved_summary: "tool mention 'runway-gen3'",
    ...overrides,
  }
}

function turn(overrides: Partial<RawUserTurn> = {}): RawUserTurn {
  return { turn: 7, text: 'I was using a paid individual plan.', ...overrides }
}

describe('normalization idempotency (generic, not Runway-only)', () => {
  test('canonical tool identifier resolves to itself', () => {
    expect(normalizeCandidate({ proposal_id: 'x', turn: 1, raw_text: '', kind: 'tool_mention', raw_tool_name: 'runway-gen3' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'runway-gen3',
    })
  })

  test('a second, unrelated canonical tool identifier also resolves to itself (proves the fix is generic, not a Runway special case)', () => {
    expect(normalizeCandidate({ proposal_id: 'x', turn: 1, raw_text: '', kind: 'tool_mention', raw_tool_name: 'kling' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'kling',
    })
  })

  test('existing natural aliases remain unaffected', () => {
    expect(normalizeCandidate({ proposal_id: 'x', turn: 1, raw_text: '', kind: 'tool_mention', raw_tool_name: 'Runway' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'runway-gen3',
    })
  })

  test('a genuinely unknown string remains unrecognized -- idempotency adds no new leniency', () => {
    expect(normalizeCandidate({ proposal_id: 'x', turn: 1, raw_text: '', kind: 'tool_mention', raw_tool_name: 'SomeToolThatDoesNotExist123' })).toEqual({
      status: 'unrecognized',
    })
  })

  test('asset-provider canonical identifiers also normalize idempotently (adobe-stock has no natural-alias self-entry today, proving the same gap existed there)', () => {
    expect(normalizeCandidate({ proposal_id: 'x', turn: 1, raw_text: '', kind: 'asset_provider_mention', raw_provider_name: 'adobe-stock' })).toEqual({
      status: 'resolved',
      canonical_identifier: 'adobe-stock',
    })
  })
})

describe('ToolMention pending-target reconciliation', () => {
  test('1/10. exact production failure class: canonical tool + plan-tier follow-up whose raw_tool_name echoes the canonical identifier -- enriches the existing mention, no spurious duplicate, and existing unmodified Gate 1 now evaluates met for tool identity', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const pending = pendingRunwayClarification()
    const candidates = [planTierCandidate({ raw_tool_name: 'runway-gen3' })]

    const { updated } = await runExtractionPipeline(su, turn({ pending_clarification: pending }), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    expect(active[0].plan_tier).toEqual({ state: 'confirmed', value: 'paid individual plan' })
    // Enrichment used supersede-and-replace: the original record is no longer active.
    expect(updated.tool_mentions.find((m) => m.mention_id === 'tm-1')?.superseded_by).not.toBeNull()

    // Gate 1 itself is completely unmodified (gates.ts untouched) -- this
    // asserts the CONSEQUENCE of the corrected state, not a changed gate.
    const gate1 = evaluateGate1(updated)
    expect(gate1.state).toBe('met')
  })

  test('exercises Step 3 specifically: raw_tool_name that does NOT even idempotently resolve (genuinely unrecognized string) still enriches via pending-target fallback', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const pending = pendingRunwayClarification()
    const candidates = [planTierCandidate({ raw_tool_name: 'SomeToolThatDoesNotExist123' })]

    const { updated } = await runExtractionPipeline(su, turn({ pending_clarification: pending }), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    expect(active[0].plan_tier).toEqual({ state: 'confirmed', value: 'paid individual plan' })
  })

  test('3. natural alias repeated -- unchanged existing enrichment behavior', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const candidates = [planTierCandidate({ raw_tool_name: 'Runway' })]

    // No pending_clarification at all -- proves this path (Step 1) is
    // completely independent of the new mechanism.
    const { updated } = await runExtractionPipeline(su, turn(), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    expect(active[0].plan_tier).toEqual({ state: 'confirmed', value: 'paid individual plan' })
  })

  test('4. explicit correction to a different tool wins over the pending target -- old mention superseded to the NEW tool, not enriched under the old identity', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const pending = pendingRunwayClarification()
    const candidates: CandidateObservation[] = [
      {
        proposal_id: 'c-correction',
        turn: 7,
        raw_text: 'Actually, I used Pika, not Runway.',
        kind: 'tool_mention',
        raw_tool_name: 'Pika',
        is_correction: true,
        correction_of_raw_text: 'Runway',
      },
    ]

    const { updated } = await runExtractionPipeline(su, turn({ text: 'Actually, I used Pika, not Runway.', pending_clarification: pending }), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'pika' })
    expect(updated.tool_mentions.find((m) => m.mention_id === 'tm-1')?.superseded_by).not.toBeNull()
  })

  test('5. explicit addition of a genuinely distinct second tool remains independently addable -- pending target (Runway) is untouched, Pika is added fresh', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const pending = pendingRunwayClarification()
    const candidates: CandidateObservation[] = [
      { proposal_id: 'c-addition', turn: 7, raw_text: 'I also used Pika.', kind: 'tool_mention', raw_tool_name: 'Pika' },
    ]

    const { updated } = await runExtractionPipeline(su, turn({ text: 'I also used Pika.', pending_clarification: pending }), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(2)
    const identifiers = active.map((m) => (m.resolution.kind === 'canonical' ? m.resolution.identifier : m.resolution.raw_name)).sort()
    expect(identifiers).toEqual(['pika', 'runway-gen3'])
    // The original Runway mention is untouched, not superseded.
    expect(updated.tool_mentions.find((m) => m.mention_id === 'tm-1')?.superseded_by).toBeNull()
  })

  test('6. stale/superseded pending target is never used as fallback -- superseded mention is not resurrected, candidate falls through to existing CREATE behavior', async () => {
    const su = baseSU({
      tool_mentions: [
        canonicalRunwayMention({ superseded_by: 'tm-2' }),
        canonicalRunwayMention({ mention_id: 'tm-2', source_turn: 6 }),
      ],
    })
    // Pending target points at the now-superseded tm-1, not the current active tm-2.
    const pending = pendingRunwayClarification({ signal_id: 'tm-1' })
    const candidates = [planTierCandidate({ raw_tool_name: 'SomeToolThatDoesNotExist123' })]

    const { updated } = await runExtractionPipeline(su, turn({ pending_clarification: pending }), constantExtractor(candidates))

    // tm-1 must remain superseded -- never resurrected as the enrichment target.
    expect(updated.tool_mentions.find((m) => m.mention_id === 'tm-1')?.superseded_by).toBe('tm-2')
    // Existing fallback: unresolvable identity + no valid pending target -> CREATE.
    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(2)
    expect(active.some((m) => m.resolution.kind === 'unresolved_alias')).toBe(true)
  })

  test('7. genuine multi-match ambiguity is never broken by a pending target -- fails closed exactly as before', async () => {
    const su = baseSU({
      tool_mentions: [canonicalRunwayMention({ mention_id: 'tm-1' }), canonicalRunwayMention({ mention_id: 'tm-2', source_statement: 'placeholder 2' })],
    })
    const pending = pendingRunwayClarification({ signal_id: 'tm-1' })
    // A candidate that identity-matches BOTH active canonical Runway mentions.
    const candidates = [planTierCandidate({ raw_tool_name: 'runway-gen3' })]

    const { updated } = await runExtractionPipeline(su, turn({ pending_clarification: pending }), constantExtractor(candidates))

    // Neither existing mention is superseded; a third, unresolved record is
    // added instead -- the existing "never guess among multiple matches"
    // behavior, completely unaffected by the pending target.
    expect(updated.tool_mentions.find((m) => m.mention_id === 'tm-1')?.superseded_by).toBeNull()
    expect(updated.tool_mentions.find((m) => m.mention_id === 'tm-2')?.superseded_by).toBeNull()
    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(3)
  })

  test('8. unrelated/non-tool response -- no ToolMention mutation merely because a ToolMention clarification was pending', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const pending = pendingRunwayClarification()
    // No tool_mention-kind candidate at all this turn.
    const candidates: CandidateObservation[] = []

    const { updated } = await runExtractionPipeline(su, turn({ text: "Let's skip that.", pending_clarification: pending }), constantExtractor(candidates))

    expect(updated.tool_mentions).toEqual(su.tool_mentions)
  })

  test('9. unresolved alias -> later canonical resolution -- existing Step 1 unresolved-to-resolved consolidation remains intact', async () => {
    const su = baseSU({
      tool_mentions: [{ ...canonicalRunwayMention(), resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' } }],
    })
    const candidates: CandidateObservation[] = [
      { proposal_id: 'c-disambig', turn: 7, raw_text: 'Through the API, developer key.', kind: 'tool_mention', raw_tool_name: 'Nano Banana' },
    ]

    const { updated } = await runExtractionPipeline(su, turn({ text: 'Through the API, developer key.' }), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution.kind).toBe('canonical')
  })
})

describe('cross-kind / multi-candidate smoke (proportional, not broad orchestration coverage)', () => {
  test('a ToolMention pending-target fallback candidate and an unrelated same-turn project_fact candidate are each reconciled independently -- the new mechanism does not capture or redirect the unrelated candidate', async () => {
    const su = baseSU({ tool_mentions: [canonicalRunwayMention()] })
    const pending = pendingRunwayClarification()
    const candidates: CandidateObservation[] = [
      planTierCandidate({ raw_tool_name: 'SomeToolThatDoesNotExist123' }),
      {
        proposal_id: 'c-workflow-role',
        turn: 7,
        raw_text: "I'm directing the project.",
        kind: 'project_fact',
        raw_fact_field: 'workflow_role',
        fact_value_hint: 'Director',
        fact_confidence_hint: 'confirmed',
      } as CandidateObservation,
    ]

    const { updated } = await runExtractionPipeline(su, turn({ pending_clarification: pending }), constantExtractor(candidates))

    const active = updated.tool_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'runway-gen3' })
    expect(active[0].plan_tier).toEqual({ state: 'confirmed', value: 'paid individual plan' })
    // The unrelated project_fact candidate was processed on its own merits,
    // not redirected by or through the ToolMention pending-target mechanism.
    expect(updated.project_facts.workflow_role.attestation).toEqual({ state: 'confirmed', value: 'Director' })
  })
})
