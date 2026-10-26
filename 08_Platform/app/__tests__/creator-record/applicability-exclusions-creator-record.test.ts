/**
 * Creator Record cases of LK-APPLICABILITY-EXCLUSION-1B and
 * LK-EXCLUSION-ACTIVATION-READINESS-1 (ADR-001 §L, §L.9).
 *
 * Moved verbatim from `__tests__/retrieval-engine/applicability-exclusions.test.ts`
 * and `__tests__/retrieval-engine/exclusion-activation-readiness.test.ts`
 * (LK-GOV-CORRECTION-1C) so the generic exclusion capability can be committed
 * without the uncommitted Creator Record module. Assertions are unchanged; the
 * three-consumer equivalence table in the generic file plus the table below
 * together assert the original four-consumer equivalence.
 * Synthetic claims only.
 */

import { runCreatorRecordGuidance } from '@/lib/creator-record/integration/run-creator-record-guidance'
import { loadQuestionRegistry, mapAnswer } from '@/lib/creator-record/contract/question-registry'
import { synLabel, synLedgerEntry, synRegistryInput } from '@/lib/creator-record/contract/testing/synthetic-fixtures'
import type { ApplicabilityExclusion, TopicClaim } from '@/lib/retrieval-engine/types'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'

const TOOL = 'runway-gen3' // a real canonical id; the claims below are synthetic
const ENT: ApplicabilityExclusion = { fact: 'tool_plan_tier', tool: TOOL, value: 'Enterprise' }

function claim(id: string, over: Partial<TopicClaim> = {}): TopicClaim {
  return {
    claim_id: id,
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

const registry = (() => {
  const r = loadQuestionRegistry(synRegistryInput())
  if (!r.ok) throw new Error('registry')
  return r.registry
})()

// ── From applicability-exclusions.test.ts ──
describe('LK-APPLICABILITY-EXCLUSION-1B: Creator Record path', () => {
  const X = claim('CLAIM-SYN-EXCL-v1', { applicability_exclusions: [ENT] })

  test('Creator Record pipeline (unchanged code) honours an exclusion through the shared selector', () => {
    const reg = registry
    const ctx = { record_id: 'SYN-X', record_version: 1, captured_at: '2026-10-26T00:00:00Z' }
    const d = (q: string, v: string) => { const r = mapAnswer(reg, {}, ctx, { q_id: q, q_version: 1, values: [v], verbatim: v, instance: 't1' }); if (!r.ok) throw new Error(r.reason); return r.observations }
    const run = (plan: string | null) =>
      runCreatorRecordGuidance({ observations: [...d('SYN-TOOL', 'Runway'), ...(plan ? d('SYN-PLAN', plan) : [])], topicClaims: [X], ledger: [synLedgerEntry({ claim_id: X.claim_id })], dependencyLabel: synLabel, as_of: '2026-10-26' })
    expect(run('Enterprise').objectives[0].excluded_not_met).toEqual([X.claim_id])
    expect(run('Enterprise').composition.items).toEqual([])
    expect(run(null).composition.items.map((i) => i.claim_id)).toEqual([X.claim_id])
  })
})

// ── From exclusion-activation-readiness.test.ts ──
describe('LK-EXCLUSION-ACTIVATION-READINESS-1: Creator Record consumer', () => {
  const X = claim('CLAIM-SYN-ACT-EXCL-v1', { applicability_exclusions: [ENT] })
  const PLAN_CLAIM = claim('CLAIM-SYN-ACT-PLAN-v1', {
    applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'SynPro' }],
  })

  type Verdict = 'covered' | 'excluded' | 'unresolved'
  function crObservations(plans: (string | null)[]) {
    const ctx = { record_id: 'SYN-ACT', record_version: 1, captured_at: '2026-10-26T00:00:00Z' }
    const d = (q: string, v: string, instance: string) => {
      const r = mapAnswer(registry, {}, ctx, { q_id: q, q_version: 1, values: [v], verbatim: v, instance })
      if (!r.ok) throw new Error(r.reason)
      return r.observations
    }
    return plans.flatMap((p, i) => [...d('SYN-TOOL', 'Runway', `t${i + 1}`), ...(p === null ? [] : d('SYN-PLAN', p, `t${i + 1}`))])
  }
  function creatorRecordVerdict(claims: TopicClaim[], plans: (string | null)[], id = X.claim_id): Verdict {
    const r = runCreatorRecordGuidance({ observations: crObservations(plans), topicClaims: claims, ledger: claims.map((c) => synLedgerEntry({ claim_id: c.claim_id })), dependencyLabel: synLabel, as_of: '2026-10-26' })
    if (r.objectives.some((o) => o.excluded_not_met.includes(id))) return 'excluded'
    const sel = selectReviewerClaims({ topic: 'commercial_use', topicClaims: claims, assetProviderIds: r.facts.assetProviderIds, activeToolIds: r.facts.activeToolIds, applicabilityFacts: r.facts.applicabilityFacts })
    const c = sel.claims.find((x) => x.claim_id === id)!
    return c.applicability_status === 'met' ? 'covered' : 'unresolved'
  }

  // Same table as the generic file's cross-consumer equivalence test.
  test.each([
    [['Enterprise'], 'excluded'],
    [['enterprise'], 'excluded'],
    [['  ENTERPRISE  '], 'excluded'],
    [['Ｅｎｔｅｒｐｒｉｓｅ'], 'excluded'],
    [['Enterprise plan'], 'covered'],
    [['Pro'], 'covered'],
    [[null], 'covered'],
    [['Pro', 'Enterprise'], 'unresolved'],
    [['Enterprise', 'enterprise'], 'excluded'],
  ] as const)('declared %p → %s in Creator Record', (plans, expected) => {
    expect(creatorRecordVerdict([X], plans as unknown as (string | null)[])).toBe(expected)
  })

  test('declaration-based consumers: a non-governed conflicting value still blocks coverage (Pro plan + Enterprise)', () => {
    expect(creatorRecordVerdict([X], ['Pro plan', 'Enterprise'])).toBe('unresolved')
  })

  test('conflicting declarations never satisfy a positive requirement (SynPro + Team)', () => {
    expect(creatorRecordVerdict([PLAN_CLAIM], ['SynPro', 'Team'], PLAN_CLAIM.claim_id)).toBe('unresolved')
  })

  test('ambiguous governed vocabulary: declaration withheld, exclusion indeterminate, claim held unresolved', () => {
    const colliding = [X, claim('CLAIM-SYN-ACT-COLLIDE-v1', { applicability_requirements: [{ fact: 'tool_plan_tier', tool: TOOL, operator: 'equals', value: 'ENTERPRISE' }] })]
    expect(creatorRecordVerdict(colliding, ['enterprise'])).toBe('unresolved')
  })
})
