/**
 * LK-APPLICABILITY-EXCLUSION-1B — governed scope-exclusion gate (ADR-001 §L).
 * Synthetic claims only. The capability is dormant: no governed claim uses it.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { projectHrrResearchAnswer } from '@/lib/hrr/project-hrr-research-answer'
import { runHrrResearch, topicSelectionGateResult } from '@/lib/hrr/run-hrr-research'
import { governedPlanValuesByTool } from '@/lib/production-review/build-production-facts'
import { runProductionReview } from '@/lib/production-review/run-production-review'
import { evaluateApplicabilityExclusionGate, normalizeExclusionValue, validateApplicabilityExclusions } from '@/lib/retrieval-engine/applicability-exclusions'
import { deriveApplicabilityReadinessGaps } from '@/lib/retrieval-engine/applicability-readiness'
import { lookupDiscoveredTopicClaims } from '@/lib/retrieval-engine/lookup-discovered-topic-claims'
import {
  evaluateApplicabilityExpression,
  evaluateClaimApplicability,
  exclusionGateBlocks,
  lookupTopicClaims,
  type ApplicabilityFacts,
} from '@/lib/retrieval-engine/lookup-topic-claims'
import { lookupRelatedTopicClaims } from '@/lib/retrieval-engine/lookup-topic-relationships'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { ApplicabilityExclusion, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import { isCanonicalToolIdentity } from '@/lib/tool-identity/registry'
import type { RetrievalHandoff, ToolMention, UserGoal } from '@/types/interview-engine'

// ── Synthetic helpers ──
const TOOL = 'runway-gen3' // a real canonical id; the claims below are synthetic
const ENT: ApplicabilityExclusion = { fact: 'tool_plan_tier', tool: TOOL, value: 'Enterprise' }

let mentionSeq = 0
function mention(over: { tool?: string; plan?: string | null; planState?: 'confirmed' | 'unknown'; account?: string | null; superseded?: boolean; ambiguous?: boolean } = {}): ToolMention {
  mentionSeq += 1
  const plan = over.plan ?? null
  return {
    mention_id: `m${mentionSeq}`,
    resolution: over.ambiguous ? ({ kind: 'ambiguous', candidates: [TOOL] } as unknown as ToolMention['resolution']) : { kind: 'canonical', identifier: over.tool ?? TOOL },
    access_surface: { state: 'unknown' },
    plan_tier: plan === null || over.planState === 'unknown' ? { state: 'unknown' } : { state: 'confirmed', value: plan },
    account_status: over.account ? { state: 'confirmed', value: over.account } : { state: 'unknown' },
    confidence: 'unknown',
    source_turn: 1,
    source_statement: 'synthetic',
    superseded_by: over.superseded ? 'later' : null,
  }
}
const facts = (...mentions: ToolMention[]): ApplicabilityFacts => ({ jurisdiction: { included: [], excluded: [] }, toolMentions: mentions })

function claim(over: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: 'CLAIM-SYN-EXCL-v1',
    topic: 'commercial_use',
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: null,
    crc_candidate_statement: 'SYN statement: commercial use is permitted on non-Enterprise plans.',
    publication_scope: 'Reviewer/Commercial Assurance',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: [TOOL],
    last_verified: '2026-09-01',
    superseded_by: null,
    ...over,
  }
}
const goal = (category: string) => ({ goal_id: 'g1', raw_text: 'Can I use this commercially?', category, state: 'confirmed', scope: 'informational', superseded_by: null, source_turn: 1 }) as unknown as UserGoal

describe('validation: invalid governance fails closed', () => {
  test('absent is valid', () => expect(validateApplicabilityExclusions(undefined)).toEqual([]))
  test.each([
    ['not an array', { fact: 'tool_plan_tier' }, 'not_an_array'],
    ['empty array', [], 'empty_array'],
    ['a non-object entry', ['Enterprise'], 'malformed_exclusion'],
    ['missing value', [{ fact: 'tool_plan_tier', tool: TOOL }], 'malformed_exclusion'],
    ['non-string tool', [{ fact: 'tool_plan_tier', tool: 7, value: 'X' }], 'malformed_exclusion'],
    ['jurisdiction target', [{ fact: 'jurisdiction', tool: TOOL, value: 'California' }], 'unsupported_fact'],
    ['unknown fact', [{ fact: 'organization_size', tool: TOOL, value: 'X' }], 'unsupported_fact'],
    ['missing tool', [{ fact: 'tool_plan_tier', value: 'X' }], 'missing_tool'],
    ['blank tool', [{ fact: 'tool_plan_tier', tool: '  ', value: 'X' }], 'missing_tool'],
    ['blank value', [{ fact: 'tool_plan_tier', tool: TOOL, value: '   ' }], 'empty_value'],
  ])('%s → %s', (_n, raw, kind) => {
    expect(validateApplicabilityExclusions(raw).map((v) => v.kind)).toContain(kind)
  })

  test('an invalid exclusion makes the whole claim\'s applicability invalid, even when ordinary evaluation is valid', () => {
    const r = evaluateClaimApplicability({ applicability_requirements: [], applicability_exclusions: [{ fact: 'jurisdiction', tool: TOOL, value: 'X' }] }, facts())
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.violations).toEqual([])
      expect(r.exclusion_violations.map((v) => v.kind)).toEqual(['unsupported_fact'])
    }
  })

  test('invalid any_of stays invalid with valid exclusions', () => {
    const r = evaluateClaimApplicability({ applicability_requirements: [], applicability_any_of: [], applicability_exclusions: [ENT] }, facts())
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.violations.map((v) => v.kind)).toEqual(['empty_outer_array'])
  })
})

describe('truth table (confirmed facts only, conservative normalization)', () => {
  const gate = (...ms: ToolMention[]) => evaluateApplicabilityExclusionGate([ENT], ms)
  const result = (...ms: ToolMention[]) => {
    const g = gate(...ms)
    if (!g.valid) throw new Error('invalid')
    return g.outcomes[0].result
  }

  test.each([
    ['confirmed "Enterprise"', [mention({ plan: 'Enterprise' })], 'triggered'],
    ['confirmed "enterprise" (case)', [mention({ plan: 'enterprise' })], 'triggered'],
    ['confirmed "  ENTERPRISE  " (whitespace)', [mention({ plan: '  ENTERPRISE  ' })], 'triggered'],
    ['confirmed full-width "Ｅｎｔｅｒｐｒｉｓｅ" (NFKC)', [mention({ plan: 'Ｅｎｔｅｒｐｒｉｓｅ' })], 'triggered'],
    ['confirmed "Pro"', [mention({ plan: 'Pro' })], 'not_triggered_confirmed_other_value'],
    ['confirmed "Enterprise plan" (no alias inference)', [mention({ plan: 'Enterprise plan' })], 'not_triggered_confirmed_other_value'],
    ['no mention', [], 'not_triggered_not_confirmed'],
    ['plan unknown', [mention({ plan: null })], 'not_triggered_not_confirmed'],
    ['plan present but unconfirmed', [mention({ plan: 'Enterprise', planState: 'unknown' })], 'not_triggered_not_confirmed'],
    ['superseded confirmed "Enterprise"', [mention({ plan: 'Enterprise', superseded: true })], 'not_triggered_not_confirmed'],
    ['non-canonical (ambiguous) mention', [mention({ plan: 'Enterprise', ambiguous: true })], 'not_triggered_not_confirmed'],
    ['another tool confirmed "Enterprise"', [mention({ tool: 'kling', plan: 'Enterprise' })], 'not_triggered_not_confirmed'],
    // LK-EXCLUSION-ACTIVATION-READINESS-1 (§L.9): a conflict withholds confirmation -- indeterminate, never excluded and never covered.
    ['conflicting confirmed values (Pro + Enterprise) are indeterminate', [mention({ plan: 'Pro' }), mention({ plan: 'Enterprise' })], 'indeterminate_conflicting_values'],
    ['agreeing confirmed values (Enterprise + enterprise) trigger', [mention({ plan: 'Enterprise' }), mention({ plan: ' enterprise ' })], 'triggered'],
  ] as const)('%s → %s', (_n, ms, expected) => {
    expect(result(...(ms as unknown as ToolMention[]))).toBe(expected)
  })

  test('account status is excludable the same way; plan facts do not trigger account exclusions', () => {
    const acct: ApplicabilityExclusion = { fact: 'tool_account_status', tool: TOOL, value: 'Business Account' }
    const g1 = evaluateApplicabilityExclusionGate([acct], [mention({ account: 'business account' })])
    const g2 = evaluateApplicabilityExclusionGate([acct], [mention({ plan: 'Business Account' })])
    expect(g1.valid && g1.outcomes[0].result).toBe('triggered')
    expect(g2.valid && g2.outcomes[0].result).toBe('not_triggered_not_confirmed')
  })

  test('multiple exclusions: any trigger excludes; each keeps its own diagnostic', () => {
    const g = evaluateApplicabilityExclusionGate([ENT, { fact: 'tool_plan_tier', tool: TOOL, value: 'Max' }], [mention({ plan: 'Max' })])
    expect(g.valid && g.triggered).toBe(true)
    expect(g.valid && g.outcomes.map((o) => [o.exclusion_index, o.result])).toEqual([
      [0, 'not_triggered_confirmed_other_value'],
      [1, 'triggered'],
    ])
  })

  test('diagnostic provenance records the confirmed facts considered and the matching mention', () => {
    const m = mention({ plan: 'enterprise' })
    const g = evaluateApplicabilityExclusionGate([ENT], [m])
    expect(g).toEqual({
      valid: true,
      triggered: true,
      indeterminate: false,
      outcomes: [
        { exclusion: ENT, exclusion_index: 0, result: 'triggered', confirmed_facts: [{ mention_id: m.mention_id, value: 'enterprise' }], withheld_facts: [], matched_mention_ids: [m.mention_id] },
      ],
    })
  })

  test('normalization is comparison-only and never maps aliases', () => {
    expect(normalizeExclusionValue('  Ｅｎｔｅｒｐｒｉｓｅ \t Plan ')).toBe('enterprise plan')
    expect(normalizeExclusionValue('Enterprise plan')).not.toBe(normalizeExclusionValue('Enterprise'))
  })
})

describe('the shared claim evaluator: exclusions never create positive coverage', () => {
  test('triggered → not_met, nothing material, requirement outcomes untouched', () => {
    const c = { applicability_requirements: [{ fact: 'tool_plan_tier' as const, tool: TOOL, operator: 'equals' as const, value: 'Pro' }], applicability_exclusions: [ENT] }
    const r = evaluateClaimApplicability(c, facts(mention({ plan: 'Enterprise' })))
    expect(r.valid && r.status).toBe('not_met')
    expect(r.valid && r.material_unresolved).toEqual([])
    expect(r.valid && r.excluded).toBe(true)
    expect(r.valid && r.all_outcomes.map((o) => o.requirement.operator)).toEqual(['equals'])
  })

  test('untriggered with an unknown plan preserves UNRESOLVED; the exclusion is never an outcome', () => {
    const c = { applicability_requirements: [{ fact: 'tool_plan_tier' as const, tool: TOOL, operator: 'equals' as const, value: 'Pro' }], applicability_exclusions: [ENT] }
    const r = evaluateClaimApplicability(c, facts(mention({ plan: null })))
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.material_unresolved.map((o) => o.requirement.value)).toEqual(['Pro'])
    expect(r.valid && r.all_outcomes).toHaveLength(1)
  })

  test('exclusion-only metadata cannot satisfy an any_of group', () => {
    const c = { applicability_requirements: [], applicability_any_of: [[{ fact: 'tool_plan_tier' as const, tool: TOOL, operator: 'equals' as const, value: 'Pro' }], [{ fact: 'tool_account_status' as const, tool: TOOL, operator: 'equals' as const, value: 'Member' }]], applicability_exclusions: [ENT] }
    const r = evaluateClaimApplicability(c, facts(mention({ plan: null })))
    expect(r.valid && r.status).toBe('unresolved')
    expect(r.valid && r.all_outcomes.every((o) => o.requirement.operator === 'equals')).toBe(true)
  })

  test('a claim with no requirements stays exactly as without exclusions (vacuous, not newly established)', () => {
    const withX = evaluateClaimApplicability({ applicability_requirements: [], applicability_exclusions: [ENT] }, facts(mention({ plan: null })))
    const without = evaluateApplicabilityExpression([], undefined, facts(mention({ plan: null })))
    expect(withX.valid && without.valid && [withX.status, withX.all_outcomes, withX.material_unresolved]).toEqual([without.valid && without.status, without.valid && without.all_outcomes, without.valid && without.material_unresolved])
  })

  test('no exclusions configured: identical to the ordinary evaluator for every governed claim and several fact states', () => {
    const states = [facts(), facts(mention({ plan: 'Pro' })), facts(mention({ tool: 'pika', plan: 'Standard' })), facts(mention({ tool: 'kling', account: 'Member Account' }))]
    for (const c of TOPIC_CLAIMS_FIXTURE) {
      for (const f of states) {
        const base = evaluateApplicabilityExpression(c.applicability_requirements, c.applicability_any_of, f)
        const r = evaluateClaimApplicability(c, f)
        if (!base.valid) expect(r.valid).toBe(false)
        else expect(r).toEqual({ ...base, exclusion_outcomes: [], excluded: false })
      }
    }
  })

  test('equals / not_equals semantics unchanged', () => {
    const eq = evaluateApplicabilityExpression([{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'Pro' }], undefined, facts(mention({ plan: 'pro' })))
    const ne = evaluateApplicabilityExpression([{ fact: 'tool_plan_tier', tool: TOOL, operator: 'not_equals', value: 'Pro' }], undefined, facts())
    expect(eq.valid && eq.status).toBe('not_met') // still exact, case-sensitive
    expect(ne.valid && ne.status).toBe('unresolved')
  })
})

describe('every retrieval / reviewer path enforces exclusions', () => {
  const X = claim({ applicability_exclusions: [ENT] })
  const ENTERPRISE = facts(mention({ plan: 'Enterprise' }))
  const PRO = facts(mention({ plan: 'Pro' }))

  test('CRC topic lookup: excluded when triggered, included otherwise', () => {
    expect(lookupTopicClaims([goal('commercial_use')], [X], ENTERPRISE, [], [], [TOOL]).matches).toEqual([])
    expect(lookupTopicClaims([goal('commercial_use')], [X], PRO, [], [], [TOOL]).matches.map((c) => c.claim_id)).toEqual([X.claim_id])
    expect(lookupTopicClaims([goal('commercial_use')], [X], facts(), [], [], [TOOL]).matches.map((c) => c.claim_id)).toEqual([X.claim_id])
  })

  test('CRC relationship lookup (legacy mandatory-only path): exclusion enforced, invalid exclusion blocks', () => {
    const rel: TopicRelationship = {
      relationship_id: 'REL-SYN-v1', source_topic: 'copyright_ownership', target_topic: 'commercial_use', relationship_type: 'relevant_consideration', rationale: 'syn',
      lifecycle: 'Adopted', adoption_approver: 'SYN', adoption_decision_date: '2026-10-01', publication_scope: 'Reviewer/Commercial Assurance', crc_eligible: 'Yes', crc_approver: 'SYN', crc_decision_date: '2026-10-01', last_reviewed: '2026-10-01', superseded_by: null,
    }
    const g = [goal('copyright_ownership')]
    expect(lookupRelatedTopicClaims(g, [rel], [X], ENTERPRISE).matches).toEqual([])
    expect(lookupRelatedTopicClaims(g, [rel], [X], PRO).matches.map((m) => m.claim.claim_id)).toEqual([X.claim_id])
    const invalid = claim({ applicability_exclusions: [{ fact: 'jurisdiction', tool: TOOL, value: 'X' }] as unknown as ApplicabilityExclusion[] })
    expect(lookupRelatedTopicClaims(g, [rel], [invalid], PRO).matches).toEqual([])
    expect(exclusionGateBlocks(invalid, PRO)).toBe(true)
  })

  test('CRC discovered-topic lookup: excluded when triggered', () => {
    const occ = [{ topic: 'commercial_use', trigger_id: 'T', source_kind: 'syn', source_id: 's', source_goal_category: 'commercial_use' }] as never
    expect(lookupDiscoveredTopicClaims(occ, [X], ENTERPRISE).matches).toEqual([])
    expect(lookupDiscoveredTopicClaims(occ, [X], PRO).matches.map((m) => m.claim.claim_id)).toEqual([X.claim_id])
  })

  test('readiness never turns an exclusion into an unresolved question', () => {
    const h = { tools: [], unresolved_aliases: [], asset_providers: [], unresolved_asset_provider_mentions: [], workflow_role: 'unresolved', intended_use: 'unclear', scoped_observations: [], certainty_state: 'gate_1_unmet', exclusions: [] } as unknown as RetrievalHandoff
    for (const f of [ENTERPRISE, PRO, facts()]) expect(deriveApplicabilityReadinessGaps(h, [], [goal('commercial_use')], [X], f)).toEqual([])
  })

  test('reviewer selector: triggered → not_met with diagnostics; untriggered → unchanged shape, no exclusion outcome shown as established', () => {
    const sel = (f: ApplicabilityFacts) => selectReviewerClaims({ topic: 'commercial_use', topicClaims: [X], assetProviderIds: [], activeToolIds: [TOOL], applicabilityFacts: f }).claims[0]
    const ex = sel(ENTERPRISE)
    expect(ex.applicability_status).toBe('not_met')
    expect(ex.applicability_outcomes).toEqual([])
    expect(ex.applicability_exclusion_outcomes!.map((o) => o.result)).toEqual(['triggered'])
    const unknown = sel(facts())
    expect(unknown.applicability_status).toBe('met') // vacuous, exactly as for a claim with no requirements
    expect(unknown.applicability_outcomes).toEqual([])
    expect(unknown.applicability_exclusion_outcomes!.map((o) => o.result)).toEqual(['not_triggered_not_confirmed'])
    const invalid = selectReviewerClaims({ topic: 'commercial_use', topicClaims: [claim({ applicability_exclusions: [] as ApplicabilityExclusion[] })], assetProviderIds: [], activeToolIds: [TOOL], applicabilityFacts: PRO })
    expect(invalid.withheld).toEqual([{ claim_id: X.claim_id, reason: 'invalid_governed_applicability' }])
  })

  test('HRR explains a triggered exclusion in does-not-apply, and never projects an untriggered one', () => {
    const run = (f: ApplicabilityFacts) =>
      runHrrResearch({ gate: topicSelectionGateResult('commercial_use'), reviewerContext: { context: { resolved_tool_ids: [TOOL], resolved_asset_provider_ids: [], jurisdiction_included: [] }, applicabilityFacts: f, activeToolIds: [TOOL], assetProviderIds: [] }, topicClaims: [X] }).per_topic[0]
    const ex = run(ENTERPRISE)
    expect(ex.governed_claims).toEqual([])
    expect(ex.does_not_apply.map((c) => c.claim_id)).toEqual([X.claim_id])
    expect(ex.does_not_apply[0].applicability_exclusion_outcomes!.filter((o) => o.result === 'triggered').map((o) => o.exclusion)).toEqual([ENT])
    const pro = run(PRO)
    expect(pro.does_not_apply).toEqual([])
    expect(pro.bi_status).toBe('directly_relevant')
  })

  test('HRR answer projection: triggered exclusion projected as the does-not-apply reason; untriggered never projected', () => {
    const answerFor = (f: ApplicabilityFacts) =>
      projectHrrResearchAnswer(
        runHrrResearch({ gate: topicSelectionGateResult('commercial_use'), reviewerContext: { context: { resolved_tool_ids: [TOOL], resolved_asset_provider_ids: [], jurisdiction_included: [] }, applicabilityFacts: f, activeToolIds: [TOOL], assetProviderIds: [] }, topicClaims: [X] }),
      ).topics[0]
    const ex = answerFor(ENTERPRISE)
    expect(ex.does_not_apply.map((c) => c.triggered_exclusions)).toEqual([[ENT]])
    const unknown = answerFor(facts())
    expect(JSON.stringify(unknown)).not.toContain('triggered_exclusions')
    expect(JSON.stringify(unknown)).not.toContain('Enterprise"')
  })

  // The Creator Record case lives in __tests__/creator-record/applicability-exclusions-creator-record.test.ts
  // (the Creator Record module is not yet committed; LK-GOV-CORRECTION-1C).

  test('Product A: exclusion values are governed plan values, so a declared excluded plan is not applied', () => {
    expect(Array.from(governedPlanValuesByTool([X]).get(TOOL) ?? [])).toEqual(['Enterprise'])
    const r = runProductionReview({ tools_used: [{ tool_name: 'Runway', plan_type: 'Enterprise' }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, [X])
    const f = r.topics.find((t) => t.topic === 'commercial_use')!.findings[0]
    expect(f.applicability).toBe('does_not_apply_on_declared_facts')
    const pro = runProductionReview({ tools_used: [{ tool_name: 'Runway', plan_type: 'Pro' }], territory_preferences: null, third_party_assets: null, audio_disclosure: null }, [X])
    expect(pro.topics.find((t) => t.topic === 'commercial_use')!.findings[0].applicability).toBe('applies')
  })

  test('BI never sees an excluded claim on the reviewer path', () => {
    const sel = selectReviewerClaims({ topic: 'commercial_use', topicClaims: [X], assetProviderIds: [], activeToolIds: [TOOL], applicabilityFacts: ENTERPRISE })
    const fed = sel.claims.filter((c) => c.applicability_status !== 'not_met')
    expect(fed).toEqual([])
    expect(buildBoundedInterpretations([{ intent_id: 'i', intent_text: 'x', category: 'commercial_use', scope: 'informational' }], [])[0].status).toBe('outside_current_coverage')
  })
})

describe('dormancy and governance consistency', () => {
  test('no governed claim uses applicability_exclusions in this milestone', () => {
    expect(TOPIC_CLAIMS_FIXTURE.filter((c) => c.applicability_exclusions !== undefined).map((c) => c.claim_id)).toEqual([])
  })

  test('any future fixture exclusion must be valid and name a canonical tool', () => {
    for (const c of TOPIC_CLAIMS_FIXTURE) {
      expect(validateApplicabilityExclusions(c.applicability_exclusions)).toEqual([])
      for (const x of c.applicability_exclusions ?? []) expect(isCanonicalToolIdentity(x.tool)).toBe(true)
    }
  })
})
