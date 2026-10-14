/**
 * Higgsfield commercial-use PM Adoption tests (CAND-HIGGSFIELD-COMMERCIAL-USE-001-v1,
 * FGR_029, PM Adoption 2026-10-14).
 *
 * This claim has NO TOPIC_CLAIMS_FIXTURE entry yet -- Production Representation
 * is a separate, not-yet-authorized future milestone (Publication Policy
 * Principle 7: CRC-eligible-pending-CPR does not mean production-reachable).
 * These tests therefore exercise the generic mechanisms this claim's governed
 * record depends on -- tool identity resolution, tool_scope matching,
 * multi-tool coexistence, dependency/applicability shape, and the resulting
 * Bounded Interpretation ceiling -- against a synthetic TopicClaim object built
 * to match the adopted GOVERNED-CLAIMS.md entry's own fields exactly, not a
 * live production fixture lookup.
 */

import { normalizeCandidate, type CandidateObservation } from '@/lib/interview-engine/extraction'
import { toolScopeMatches } from '@/lib/retrieval-engine/lookup-topic-claims'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import {
  buildBoundedInterpretations as buildBoundedInterpretationsRaw,
} from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
import { checkCanonicalizationReadiness } from '@/lib/crc-engine/canonicalization-readiness'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'

function handoff(overrides: Partial<RetrievalHandoff> = {}): RetrievalHandoff {
  return {
    tools: [],
    unresolved_aliases: [],
    asset_providers: [],
    unresolved_asset_provider_mentions: [],
    workflow_role: 'unresolved',
    intended_use: 'unclear',
    scoped_observations: [],
    certainty_state: 'gate_1_unmet',
    exclusions: [],
    ...overrides,
  }
}

function tool(identifier: string) {
  return { identifier, access_surface: 'unresolved', plan_tier: 'unknown' }
}

const buildBoundedInterpretations = (
  goals: Parameters<typeof userGoalsToBiIntents>[0],
  ...rest: [Parameters<typeof buildBoundedInterpretationsRaw>[1], Parameters<typeof buildBoundedInterpretationsRaw>[2]?, Parameters<typeof buildBoundedInterpretationsRaw>[3]?]
) => buildBoundedInterpretationsRaw(userGoalsToBiIntents(goals), ...rest)

// Synthetic claim mirroring the GOVERNED-CLAIMS.md CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1
// entry's own governed fields exactly -- not the live production fixture (none exists yet).
const HIGGSFIELD_CLAIM: TopicClaim = {
  claim_id: 'CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1',
  topic: 'commercial_use',
  claim_character: 'established',
  jurisdiction: 'Global',
  lifecycle: 'Adopted',
  crc_eligible: 'No', // CPR not yet performed -- CRC Publication Scope: PENDING
  crc_publication_scope: 'PENDING',
  crc_candidate_statement: null,
  applicability_requirements: [],
  unresolved_project_dependencies: [],
  provider_scope: null,
  tool_scope: ['higgsfield'],
  publication_scope: 'Reviewer/Commercial Assurance',
  last_verified: '2026-10-14',
  superseded_by: null,
}

const KLING_SHAPED_CLAIM: TopicClaim = {
  ...HIGGSFIELD_CLAIM,
  claim_id: 'SYNTHETIC-KLING-SHAPED-CLAIM-FOR-COEXISTENCE-TEST',
  tool_scope: ['kling'],
}

function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return {
    state: 'confirmed',
    category: 'commercial_use',
    scope: 'informational',
    superseded_by: null,
    source_turn: 1,
    source_statement: overrides.raw_text,
    ...overrides,
  }
}

describe('1-2-3: Higgsfield tool identity resolution and tool_scope matching', () => {
  test('canonicalization readiness passes for the governed representative expression', () => {
    expect(checkCanonicalizationReadiness({ kind: 'tool', identifier: 'higgsfield', representativeExpression: 'Higgsfield' })).toBe(true)
  })

  test('bare-name extraction alias resolves "higgsfield" to the canonical tool ID', () => {
    const candidate: CandidateObservation = {
      proposal_id: 'test-higgsfield-1',
      turn: 1,
      raw_text: 'I used Higgsfield for this',
      kind: 'tool_mention',
      raw_tool_name: 'Higgsfield',
    }
    const result = normalizeCandidate(candidate)
    expect(result.status).toBe('resolved')
    if (result.status !== 'resolved') throw new Error('unreachable')
    expect(result.canonical_identifier).toBe('higgsfield')
  })

  test('tool_scope matches when "higgsfield" is an active tool ID', () => {
    expect(toolScopeMatches(HIGGSFIELD_CLAIM, ['higgsfield'])).toBe(true)
  })

  test('tool_scope does NOT match an unrelated tool (e.g. kling alone)', () => {
    expect(toolScopeMatches(HIGGSFIELD_CLAIM, ['kling'])).toBe(false)
  })
})

describe('4: Higgsfield + Kling coexistence (no suppression, no supersession)', () => {
  test('both claims independently match when both ToolMentions are active', () => {
    const activeToolIds = ['higgsfield', 'kling']
    expect(toolScopeMatches(HIGGSFIELD_CLAIM, activeToolIds)).toBe(true)
    expect(toolScopeMatches(KLING_SHAPED_CLAIM, activeToolIds)).toBe(true)
  })

  test('Higgsfield-only activity does not make the Kling-shaped claim match, and vice versa', () => {
    expect(toolScopeMatches(KLING_SHAPED_CLAIM, ['higgsfield'])).toBe(false)
    expect(toolScopeMatches(HIGGSFIELD_CLAIM, ['kling'])).toBe(false)
  })
})

describe('5-7: D0 dependency model and permanent directly_relevant ceiling', () => {
  test('claim carries D0 -- no applicability requirements, no unresolved dependencies', () => {
    expect(HIGGSFIELD_CLAIM.applicability_requirements).toEqual([])
    expect(HIGGSFIELD_CLAIM.unresolved_project_dependencies).toEqual([])
  })

  test('a fully-applicable D0 retrieval result reaches directly_relevant, not a fabricated hedge', () => {
    // Governed Lifecycle is Adopted but CRC Publication Review has NOT yet
    // been performed, so the real GOVERNED-CLAIMS.md record correctly has
    // crc_eligible: 'No' / CRC Publication Scope: PENDING -- lookupTopicClaims
    // correctly filters this claim out of real retrieval today (diagnostic
    // reason: 'not_adopted_or_eligible'), which is the CORRECT governance
    // boundary (Adoption != CRC publication != production reachability), not
    // a defect to work around. This test instead proves the downstream
    // mechanism this claim's own D0/applicability shape would exercise once
    // a future, separate CPR approves it -- using crc_eligible: 'Yes' only
    // to reach that later pipeline stage, never asserting current
    // reachability.
    const futureCrcEligibleClaim: TopicClaim = {
      ...HIGGSFIELD_CLAIM,
      crc_eligible: 'Yes',
      // candidate_statement is also genuinely null pre-CPR (no CRC wording
      // exists yet) -- BI defensively renders a null-statement directly_relevant
      // candidate as outside_current_coverage rather than an empty quote, so
      // this hypothetical-future-state test supplies placeholder wording too.
      crc_candidate_statement: "Under Higgsfield's current Terms of Use, commercial use of generated Output is permitted.",
    }
    const g = goal({ goal_id: 'g1', raw_text: 'Can I use this Higgsfield video commercially?' })
    const out = retrieve(
      handoff({ tools: [tool('higgsfield')] }),
      [], // no legacy MatrixRow for Higgsfield -- TopicClaim-only identity
      [g],
      [futureCrcEligibleClaim],
      { jurisdiction: { included: [], excluded: [] }, toolMentions: [] },
    )
    const bi = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const match = bi.find((m) => m.goal_id === 'g1')
    expect(match).toBeDefined()
    expect(match?.status).toBe('directly_relevant')
    expect(match?.supporting_claim_ids).toContain(HIGGSFIELD_CLAIM.claim_id)
  })
})

describe('8: provider_scope remains null (Higgsfield is a tool, not an AssetProviderMention vendor)', () => {
  test('provider_scope is null on the adopted claim shape', () => {
    expect(HIGGSFIELD_CLAIM.provider_scope).toBeNull()
  })
})

describe('9: no Enterprise status inferred from a generic "business account" statement', () => {
  test('claim applicability does not reference any account/plan fact -- "business account" cannot gate this claim either way', () => {
    const requirementFacts = HIGGSFIELD_CLAIM.applicability_requirements.map((r) => (r as { fact: string }).fact)
    expect(requirementFacts).not.toContain('tool_account_status')
    expect(requirementFacts).not.toContain('tool_plan_tier')
  })
})
