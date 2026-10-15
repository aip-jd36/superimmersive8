/**
 * CAA-PRODUCT-A-2 — declared production facts.
 */
import { buildProductionFacts, governedPlanValuesByTool } from '@/lib/production-review/build-production-facts'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

const base = { territory_preferences: 'North America', third_party_assets: null, audio_disclosure: null }

function facts(tools: unknown, extra: Partial<typeof base> = {}) {
  return buildProductionFacts({ ...base, ...extra, tools_used: tools }, TOPIC_CLAIMS_FIXTURE)
}

describe('buildProductionFacts', () => {
  test('distribution territory (G1) is never an applicability jurisdiction fact', () => {
    for (const territory of ['North America', 'United States', 'New York', 'Global', 'Europe']) {
      const b = facts([{ tool_name: 'Runway Gen-3', plan_type: 'Pro' }], { territory_preferences: territory })
      expect(b.applicabilityFacts.jurisdiction).toEqual({ included: [], excluded: [] })
      expect(b.facts.declared_distribution_territory).toBe(territory)
    }
  })

  test('accepts JSONB stored as a JSON-encoded string (existing /certify shape)', () => {
    const b = facts(JSON.stringify([{ tool_name: 'Runway Gen-3', plan_type: 'Pro', receipt_path: 'u/receipts/a.pdf', is_primary: true }]))
    expect(b.facts.tools_input).toBe('readable')
    expect(b.activeToolIds).toEqual(['runway-gen3'])
    expect(b.facts.tools[0]).toMatchObject({ receipt_presented: true, is_primary: true, account_status_basis: 'not_declared' })
  })

  test('a declared plan reaches applicability only when it equals a governed value for that tool', () => {
    const governed = governedPlanValuesByTool(TOPIC_CLAIMS_FIXTURE)
    expect(governed.get('pika')).toEqual(new Set(['Standard', 'Pro', 'Fancy']))
    expect(governed.has('runway-gen3')).toBe(false)

    const pika = facts([{ tool_name: 'Pika', plan_type: 'Pro' }])
    expect(pika.facts.tools[0].plan_relation).toBe('matches_governed_value')
    expect(pika.applicabilityFacts.toolMentions[0].plan_tier).toEqual({ state: 'confirmed', value: 'Pro' })

    const runway = facts([{ tool_name: 'Runway Gen-3', plan_type: 'Pro' }])
    expect(runway.facts.tools[0].plan_relation).toBe('not_a_governed_value')
    expect(runway.applicabilityFacts.toolMentions[0].plan_tier).toEqual({ state: 'unknown' })

    // Case-sensitive exact match only — no fuzzy promotion.
    const pikaLower = facts([{ tool_name: 'Pika', plan_type: 'pro' }])
    expect(pikaLower.applicabilityFacts.toolMentions[0].plan_tier).toEqual({ state: 'unknown' })
  })

  test('account status is never set (not collected by intake)', () => {
    const b = facts([{ tool_name: 'Kling AI', plan_type: 'Pro' }])
    expect(b.applicabilityFacts.toolMentions[0].account_status).toEqual({ state: 'unknown' })
  })

  test('conflicting governed plans for the same tool fail closed to unknown', () => {
    const b = facts([
      { tool_name: 'Pika', plan_type: 'Pro' },
      { tool_name: 'Pika', plan_type: 'Standard' },
    ])
    expect(b.activeToolIds).toEqual(['pika'])
    expect(b.applicabilityFacts.toolMentions.every((m) => m.plan_tier.state === 'unknown')).toBe(true)
  })

  test('unrecognized and missing tool names contribute no identity', () => {
    const b = facts([{ tool_name: 'Sora' }, { tool_name: 'Midjourney Video' }, { tool_name: 'Nimbus Video X' }, { plan_type: 'Pro' }, null, 42])
    expect(b.activeToolIds).toEqual([])
    expect(b.applicabilityFacts.toolMentions).toEqual([])
    expect(b.facts.tools.map((t) => t.identity)).toEqual([
      { kind: 'unresolved', reason: 'unrecognized' },
      { kind: 'unresolved', reason: 'unrecognized' },
      { kind: 'unresolved', reason: 'unrecognized' },
      { kind: 'unresolved', reason: 'missing_name' },
      { kind: 'unresolved', reason: 'missing_name' },
      { kind: 'unresolved', reason: 'missing_name' },
    ])
  })

  test('asset providers are never inferred from free text', () => {
    const b = facts([{ tool_name: 'Runway Gen-3' }], {
      third_party_assets: JSON.stringify({ has_third_party: true, items: [{ type: 'Music / SFX', description: 'Artlist track from Getty', license_status: 'Licensed' }] }) as any,
      audio_disclosure: { source_type: 'licensed' } as any,
    })
    expect(b.assetProviderIds).toEqual([])
    expect(b.facts.declared_third_party_asset_count).toBe(1)
    expect(b.facts.declared_licensed_audio).toBe(true)
  })

  test.each([['not json'], [{ not: 'an array' }], [null], [undefined], ['"a string"']])(
    'malformed tools list %p is unreadable (fail closed)',
    (bad) => {
      const b = facts(bad)
      expect(b.facts.tools_input).toBe('unreadable')
      expect(b.activeToolIds).toEqual([])
    },
  )
})
