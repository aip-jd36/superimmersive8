/**
 * CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1 Production Representation tests
 * (ProdIM-HIGGSFIELD-COMMERCIAL-USE-001-v1, 2026-10-14, following CPR_036's
 * reconsideration-and-approval of CPR_035's original WITHHOLD).
 *
 * Unlike higgsfield-commercial-use-pm-adoption.test.ts (synthetic TopicClaim,
 * no fixture entry existed yet), these tests exercise the REAL, live
 * TOPIC_CLAIMS_FIXTURE entry through the actual retrieve() -> Bounded
 * Interpretation pipeline -- including the real Higgsfield+Kling and
 * Runway+Kling multi-D0 coexistence cases CRC-BI-MULTI-D0-PRESERVATION-1
 * (commit 9dd9b9c4) was built to fix, now proven against production data
 * rather than a throwaway canary.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { buildBoundedInterpretations as buildBoundedInterpretationsRaw } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { userGoalsToBiIntents } from '@/lib/bounded-interpretation/adapters'
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
function goal(overrides: Partial<UserGoal> & Pick<UserGoal, 'goal_id' | 'raw_text'>): UserGoal {
  return { state: 'confirmed', category: 'commercial_use', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: overrides.raw_text, ...overrides }
}
const buildBoundedInterpretations = (goals: Parameters<typeof userGoalsToBiIntents>[0], ...rest: [any, any?, any?]) =>
  buildBoundedInterpretationsRaw(userGoalsToBiIntents(goals), ...rest)

const NO_JURISDICTION = { jurisdiction: { included: [], excluded: [] }, toolMentions: [] }

describe('CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1 -- real production fixture reachability', () => {
  test('fixture contains the claim exactly once, matching the governed claim ID', () => {
    const matches = TOPIC_CLAIMS_FIXTURE.filter((c) => c.claim_id === 'CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1')
    expect(matches).toHaveLength(1)
    expect(matches[0].topic).toBe('commercial_use')
    expect(matches[0].crc_eligible).toBe('Yes')
    expect(matches[0].lifecycle).toBe('Adopted')
    expect(matches[0].tool_scope).toEqual(['higgsfield'])
    expect(matches[0].provider_scope).toBeNull()
    expect(matches[0].applicability_requirements).toEqual([])
    expect(matches[0].unresolved_project_dependencies).toEqual([])
  })

  test('single Higgsfield mention: reaches directly_relevant, unconditional, no Enterprise inference from "business account"', () => {
    const g = goal({ goal_id: 'g3', raw_text: 'I used Higgsfield on a business account, can I use this commercially?' })
    const out = retrieve(handoff({ tools: [tool('higgsfield')] }), MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE, NO_JURISDICTION)
    expect(out.results.map((r) => r.claim_id)).toContain('CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1')
    const bi = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const match = bi.find((m) => m.goal_id === 'g3')
    expect(match?.status).toBe('directly_relevant')
    expect(match?.summary).toContain('permitted, unconditionally')
    expect(match?.summary).not.toMatch(/business account.*Enterprise/i)
  })

  test('unrelated tool (Runway) does not match the Higgsfield claim', () => {
    const g = goal({ goal_id: 'g4', raw_text: 'Can I use this video commercially?' })
    const out = retrieve(handoff({ tools: [tool('runway-gen3')] }), MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE, NO_JURISDICTION)
    expect(out.results.map((r) => r.claim_id)).not.toContain('CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1')
  })

  test('Higgsfield + Kling: both retrieve, preserved as separate BI blocks, no fusion, no precedence inferred (the exact defect CPR_035 found and CRC-BI-MULTI-D0-PRESERVATION-1 fixed)', () => {
    const g = goal({ goal_id: 'g1', raw_text: 'Can I use this video commercially?' })
    const out = retrieve(handoff({ tools: [tool('higgsfield'), tool('kling')] }), MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE, NO_JURISDICTION)
    const ids = out.results.map((r) => r.claim_id).sort()
    expect(ids).toContain('CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1')
    expect(ids).toContain('CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1')

    const bi = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const match = bi.find((m) => m.goal_id === 'g1')
    expect(match?.status).toBe('directly_relevant')
    expect(match?.summary_blocks.length).toBeGreaterThanOrEqual(2)
    const higgsfieldBlock = match?.summary_blocks.find((b) => b.includes('Higgsfield'))
    const klingBlock = match?.summary_blocks.find((b) => b.includes('Kling'))
    expect(higgsfieldBlock).toBeDefined()
    expect(klingBlock).toBeDefined()
    // Neither block contains the other's conflicting language -- no fusion, no precedence.
    expect(higgsfieldBlock).not.toContain('written permission')
    expect(klingBlock).not.toContain('permitted, unconditionally')
  })

  test('Runway + Kling: the already-live production fix remains intact after Higgsfield representation', () => {
    const g = goal({ goal_id: 'g2', raw_text: 'Can I use this video commercially?' })
    const out = retrieve(handoff({ tools: [tool('runway-gen3'), tool('kling')] }), MATRIX_FIXTURE, [g], TOPIC_CLAIMS_FIXTURE, NO_JURISDICTION)
    const bi = buildBoundedInterpretations([g], out.results, out.diagnostics)
    const match = bi.find((m) => m.goal_id === 'g2')
    expect(match?.status).toBe('directly_relevant')
    const runwayBlock = match?.summary_blocks.find((b) => b.includes('Runway'))
    const klingBlock = match?.summary_blocks.find((b) => b.includes('Kling'))
    expect(runwayBlock).toBeDefined()
    expect(klingBlock).toBeDefined()
    expect(runwayBlock).not.toContain('written permission')
  })
})
