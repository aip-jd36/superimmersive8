/**
 * CAA-PRODUCT-A-2 — Product A pipeline against REAL governed knowledge.
 */
import { runProductionReview } from '@/lib/production-review/run-production-review'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { ProductionReviewResult } from '@/lib/production-review/types'

function run(tools: unknown, claims: TopicClaim[] = TOPIC_CLAIMS_FIXTURE, extra: Record<string, unknown> = {}) {
  return runProductionReview(
    { tools_used: tools, territory_preferences: 'North America', third_party_assets: null, audio_disclosure: null, ...extra },
    claims,
  )
}

const findings = (r: ProductionReviewResult) => r.topics.flatMap((t) => t.findings)
const find = (r: ProductionReviewResult, id: string) => findings(r).find((f) => f.claim_id === id)

describe('runProductionReview — governed commercial-use conditions', () => {
  test('1. Runway Pro: recognized declaration applies, but only as a customer declaration', () => {
    const r = run([{ tool_name: 'Runway Gen-3', plan_type: 'Pro', receipt_path: 'u/receipts/r.pdf' }])
    const f = find(r, 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1')!
    expect(f).toBeDefined()
    expect(f.applicability).toBe('applies')
    expect(f.fact_basis).toBe('customer_declared')
    expect(f.evaluated_requirement_count).toBe(0)
    expect(f.tool_ids).toEqual(['runway-gen3'])
    expect(r.topics.find((t) => t.topic === 'commercial_use')!.bounded_interpretation_status).toBe('directly_relevant')
    // No finding ever claims a verified basis.
    expect(findings(r).every((x) => x.fact_basis === 'customer_declared')).toBe(true)
  })

  test('2. Kling: baseline applies; Member Account condition stays unresolved and BI never treats it as established', () => {
    const r = run([{ tool_name: 'Kling AI', plan_type: 'Pro' }])
    expect(find(r, 'CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1')!.applicability).toBe('applies')
    const member = find(r, 'CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1')!
    expect(member.applicability).toBe('applies_if')
    expect(member.unresolved_requirements).toEqual([
      { fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' },
    ])
    // Semantic ceiling: an unresolved governed condition caps the topic below directly_relevant.
    const commercial = r.topics.find((t) => t.topic === 'commercial_use')!
    expect(commercial.bounded_interpretation_status).toBe('relevant_applicability_unresolved')
  })

  test('3. Pika: only the declared plan-specific claim applies; other plan claims do not', () => {
    const r = run([{ tool_name: 'Pika', plan_type: 'Pro' }])
    expect(find(r, 'CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1')!.applicability).toBe('applies')
    expect(find(r, 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')!.applicability).toBe('applies')
    expect(find(r, 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1')!.evaluated_requirement_count).toBe(1)
    expect(find(r, 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1')!.applicability).toBe('does_not_apply_on_declared_facts')
    expect(find(r, 'CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1')!.applicability).toBe('does_not_apply_on_declared_facts')
  })

  test('3b. Pika with an undeclared / non-governed plan: plan claims stay unresolved, never applied', () => {
    for (const plan of [undefined, 'Team', 'pro']) {
      const r = run([{ tool_name: 'Pika', plan_type: plan }])
      for (const id of ['STANDARD', 'PRO', 'FANCY']) {
        expect(find(r, `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-${id}-001-v1`)!.applicability).toBe('applies_if')
      }
    }
  })

  test('4. Sora, Midjourney Video and unknown tools: no findings, reported as unresolved identity', () => {
    const r = run([{ tool_name: 'Sora' }, { tool_name: 'Midjourney Video' }, { tool_name: 'Nimbus Video X' }, { tool_name: 'Other' }])
    expect(findings(r)).toEqual([])
    expect(r.unresolved_tools.map((t) => t.raw_name)).toEqual(['Sora', 'Midjourney Video', 'Nimbus Video X', 'Other'])
  })

  test('4b. a recognized tool with no reviewer-eligible topic claim is reported as a coverage gap', () => {
    const r = run([{ tool_name: 'Veo' }, { tool_name: 'ElevenLabs' }])
    expect(r.tools_without_governed_coverage).toEqual(['elevenlabs', 'google-veo'])
  })

  test('5. missing provider identity: no provider-scoped finding is ever produced', () => {
    const r = run([{ tool_name: 'Runway Gen-3' }], TOPIC_CLAIMS_FIXTURE, {
      third_party_assets: { has_third_party: true, items: [{ type: 'Stock Footage', description: 'Getty clip', license_status: 'Licensed' }] },
      audio_disclosure: { source_type: 'licensed' },
    })
    expect(findings(r).filter((f) => f.topic === 'third_party_source_rights')).toEqual([])
    const providerScoped = new Set(TOPIC_CLAIMS_FIXTURE.filter((c) => c.provider_scope !== null).map((c) => c.claim_id))
    expect(findings(r).some((f) => providerScoped.has(f.claim_id))).toBe(false)
  })

  test('6. superseded and ineligible claims are excluded and reported as withheld', () => {
    const runway = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1')!
    const synthetic: TopicClaim[] = [
      { ...runway, claim_id: 'TEST-SUPERSEDED-001-v1', superseded_by: 'TEST-SUPERSEDED-001-v2' },
      { ...runway, claim_id: 'TEST-CANDIDATE-001-v1', lifecycle: 'Candidate' },
      { ...runway, claim_id: 'TEST-INTERNAL-001-v1', publication_scope: 'Internal/research' },
      { ...runway, claim_id: 'TEST-NOSCOPE-001-v1', publication_scope: undefined },
      { ...runway, claim_id: 'TEST-ELIGIBLE-001-v1' },
    ]
    const r = run([{ tool_name: 'Runway Gen-3' }], synthetic)
    expect(findings(r).map((f) => f.claim_id)).toEqual(['TEST-ELIGIBLE-001-v1'])
    const withheld = Object.fromEntries(r.topics.flatMap((t) => t.withheld).map((w) => [w.claim_id, w.reason]))
    expect(withheld).toEqual({
      'TEST-SUPERSEDED-001-v1': 'superseded',
      'TEST-CANDIDATE-001-v1': 'not_adopted',
      'TEST-INTERNAL-001-v1': 'publication_scope_not_reviewer_eligible',
      'TEST-NOSCOPE-001-v1': 'publication_scope_missing_or_unknown',
    })
    // Real fixture: deprecated stock claims are withheld, never surfaced.
    const real = run([{ tool_name: 'Runway Gen-3' }])
    expect(findings(real).some((f) => f.lifecycle !== 'Adopted')).toBe(false)
  })

  test('7. distribution territory never resolves a jurisdiction-gated claim', () => {
    const runway = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1')!
    const gated: TopicClaim = {
      ...runway,
      claim_id: 'TEST-JURISDICTION-GATED-001-v1',
      applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
    }
    for (const territory of ['United States', 'North America', 'Global']) {
      const r = run([{ tool_name: 'Runway Gen-3' }], [gated], { territory_preferences: territory })
      expect(find(r, 'TEST-JURISDICTION-GATED-001-v1')!.applicability).toBe('applies_if')
    }
  })

  test.each([['not json'], [{ tools: [] }], [null]])('8. malformed tools input %p fails closed with no evaluation', (bad) => {
    const r = run(bad)
    expect(r.status).toBe('input_unreadable')
    expect(r.topics).toEqual([])
    expect(r.knowledge_snapshot).toEqual([])
  })

  test('9. deterministic output and knowledge provenance matching the governed fixture', () => {
    const tools = [{ tool_name: 'Kling AI' }, { tool_name: 'Pika', plan_type: 'Pro' }, { tool_name: 'Runway Gen-3' }]
    const a = run(tools)
    const b = run(JSON.stringify(tools))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const ids = a.knowledge_snapshot.map((k) => k.claim_id)
    expect(ids).toEqual([...ids].sort())
    for (const k of a.knowledge_snapshot) {
      const governed = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === k.claim_id)!
      expect(governed).toBeDefined()
      expect(k.last_verified).toBe(governed.last_verified)
      expect(k.lifecycle).toBe(governed.lifecycle)
      expect(k.claim_version).toBe(k.claim_id.match(/-(v\d+)$/)![1])
    }
    for (const f of findings(a)) {
      const governed = TOPIC_CLAIMS_FIXTURE.find((c) => c.claim_id === f.claim_id)!
      expect(f.statement).toBe(governed.crc_candidate_statement)
      expect(f.open_dependencies).toEqual(governed.unresolved_project_dependencies)
    }
  })

  test('does not mutate the governed knowledge it reads', () => {
    const before = JSON.stringify(TOPIC_CLAIMS_FIXTURE)
    run([{ tool_name: 'Kling AI' }, { tool_name: 'Pika', plan_type: 'Pro' }])
    expect(JSON.stringify(TOPIC_CLAIMS_FIXTURE)).toBe(before)
  })
})
