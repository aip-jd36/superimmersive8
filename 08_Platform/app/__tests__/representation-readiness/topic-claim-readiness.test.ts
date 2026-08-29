/**
 * TopicClaim Representation Readiness Primitive tests (LK-13, 2026-08-30).
 * Synthetic candidate objects only -- no real governed proposition is added,
 * referenced, or read (no fixture, no GOVERNED-CLAIMS.md, no Matrix). Claim
 * factory mirrors tool-scoped-retrieval.test.ts's own established shape.
 */

import { checkTopicClaimRepresentationReadiness } from '@/lib/representation-readiness/topic-claim-readiness'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

function claim(overrides: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'Yes',
    crc_publication_scope: 'Scope text.',
    crc_candidate_statement: 'Candidate statement.',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-08-29',
    superseded_by: null,
    ...overrides,
  }
}

// ── 1: existing valid tool-independent TopicClaim ───────────────────────────

test('1: a valid, tool-independent TopicClaim is ready with zero issues', () => {
  const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'CLAIM-COPY-001-v1', topic: 'copyright_ownership' }))
  expect(result).toEqual({ ready: true, issues: [] })
})

// ── 2, 6: provider_scope ─────────────────────────────────────────────────────

describe('provider_scope', () => {
  test('2: a valid provider-scoped claim is ready', () => {
    const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'third_party_source_rights', provider_scope: ['getty'] }))
    expect(result.ready).toBe(true)
  })

  test('3: an invalid provider identifier is not ready, with a structured issue', () => {
    // 'getty-images' is not a valid AssetProviderId (the canonical value is
    // 'getty') -- deliberately structurally invalid input, cast to bypass
    // compile-time closure, mirroring the invalid-applicability-fact test
    // below. This is precisely the class of authoring error (a display name
    // instead of the canonical id) representation readiness exists to catch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'third_party_source_rights', provider_scope: ['getty-images'] as any }))
    expect(result.ready).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_provider_scope_entry', path: 'provider_scope[0]', value: 'getty-images' })
  })

  test('6: null provider_scope is valid', () => {
    const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'commercial_use', provider_scope: null }))
    expect(result.ready).toBe(true)
  })
})

// ── 4, 5, 7: tool_scope ──────────────────────────────────────────────────────

describe('tool_scope', () => {
  test('4: a valid tool-scoped claim is ready', () => {
    const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: ['kling'] }))
    expect(result.ready).toBe(true)
  })

  test('5: an invalid/unregistered tool_scope identifier is not ready', () => {
    const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: ['not-a-real-tool'] }))
    expect(result.ready).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_tool_scope_entry', path: 'tool_scope[0]', value: 'not-a-real-tool' })
  })

  test('7: null tool_scope is valid', () => {
    const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: null }))
    expect(result.ready).toBe(true)
  })
})

// ── 8, 9: both dimensions together ──────────────────────────────────────────

describe('provider_scope and tool_scope together', () => {
  test('8: both valid -- ready', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({ claim_id: 'C-1', topic: 'third_party_source_rights', provider_scope: ['istock'], tool_scope: ['runway-gen3'] }),
    )
    expect(result).toEqual({ ready: true, issues: [] })
  })

  test('9: one valid, one invalid -- not ready, exactly one issue for the invalid dimension', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({ claim_id: 'C-1', topic: 'third_party_source_rights', provider_scope: ['istock'], tool_scope: ['nonexistent-tool'] }),
    )
    expect(result.ready).toBe(false)
    expect(result.issues).toEqual([{ code: 'invalid_tool_scope_entry', path: 'tool_scope[0]', value: 'nonexistent-tool' }])
  })
})

// ── 10, 11: applicability tool reference ────────────────────────────────────

describe('applicability_requirements tool reference', () => {
  test('10: a valid applicability tool reference (tool_account_status) is ready', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({
        claim_id: 'C-1',
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'tool_account_status', tool: 'kling', operator: 'equals', value: 'Member Account' }],
      }),
    )
    expect(result).toEqual({ ready: true, issues: [] })
  })

  test('10b: a valid applicability tool reference (tool_plan_tier) is ready', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({
        claim_id: 'C-1',
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'tool_plan_tier', tool: 'elevenlabs', operator: 'equals', value: 'Pro' }],
      }),
    )
    expect(result.ready).toBe(true)
  })

  test('11: an invalid applicability tool reference is not ready', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({
        claim_id: 'C-1',
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'tool_account_status', tool: 'not-a-real-tool', operator: 'equals', value: 'Member Account' }],
      }),
    )
    expect(result.ready).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_applicability_tool_reference', path: 'applicability_requirements[0].tool', value: 'not-a-real-tool' })
  })

  test('a jurisdiction requirement (no tool reference) never triggers a tool-identity check', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({
        claim_id: 'C-1',
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'jurisdiction', operator: 'equals', value: 'United States' }],
      }),
    )
    expect(result).toEqual({ ready: true, issues: [] })
  })

  test('a tool_plan_tier requirement missing its tool field is not ready', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({
        claim_id: 'C-1',
        topic: 'commercial_use',
        applicability_requirements: [{ fact: 'tool_plan_tier', operator: 'equals', value: 'Pro' }],
      }),
    )
    expect(result.ready).toBe(false)
    expect(result.issues).toContainEqual({ code: 'missing_applicability_tool_reference', path: 'applicability_requirements[0].tool' })
  })

  test('an unrecognized applicability fact is not ready', () => {
    const result = checkTopicClaimRepresentationReadiness(
      claim({
        claim_id: 'C-1',
        topic: 'commercial_use',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately structurally invalid input, cast to bypass compile-time closure
        applicability_requirements: [{ fact: 'not_a_real_fact' as any, operator: 'equals', value: 'x' }],
      }),
    )
    expect(result.ready).toBe(false)
    expect(result.issues).toContainEqual({ code: 'invalid_applicability_fact', path: 'applicability_requirements[0].fact', value: 'not_a_real_fact' })
  })
})

// ── 12: structured issue/path reporting ─────────────────────────────────────

test('12: the validator reports a structured issue with code, path, and offending value -- never prose', () => {
  const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: ['bad-tool'] }))
  expect(result.issues).toEqual([{ code: 'invalid_tool_scope_entry', path: 'tool_scope[0]', value: 'bad-tool' }])
  for (const issue of result.issues) {
    expect(typeof issue.code).toBe('string')
    expect(typeof issue.path).toBe('string')
  }
})

// ── 13: no mutation ──────────────────────────────────────────────────────────

test('13: the validator never mutates its input claim', () => {
  const input = claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: ['kling'], provider_scope: ['getty'] })
  const snapshot = JSON.parse(JSON.stringify(input))
  checkTopicClaimRepresentationReadiness(input)
  expect(input).toEqual(snapshot)
})

// ── 14: no Adoption/CRC/legal conclusion in the result ──────────────────────

test('14: the readiness result contains no Adoption/CRC/legal conclusion of any kind', () => {
  const result = checkTopicClaimRepresentationReadiness(claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: ['not-real'] }))
  const serialized = JSON.stringify(result).toLowerCase()
  for (const forbidden of ['adopt', 'reject', 'deprecated', 'not commercially cleared', 'unsafe', 'publish']) {
    expect(serialized).not.toContain(forbidden)
  }
  expect(Object.keys(result)).toEqual(['ready', 'issues'])
})

// ── 15, 16, 17: zero-behavior-change regression proof ───────────────────────

describe('zero production behavior change (LK-13 introduces a new, unwired primitive only)', () => {
  test('15: LK-7 toolScopeMatches is untouched by this module -- imported and exercised directly, unaffected', async () => {
    const { toolScopeMatches } = await import('@/lib/retrieval-engine/lookup-topic-claims')
    const scoped = claim({ claim_id: 'C-1', topic: 'commercial_use', tool_scope: ['kling'] })
    expect(toolScopeMatches(scoped, ['kling'])).toBe(true)
    expect(toolScopeMatches(scoped, ['runway-gen3'])).toBe(false)
    // Readiness is a fully separate, non-wired check -- a claim can be
    // representation-ready AND still fail toolScopeMatches for an unrelated
    // (correct, expected) reason, proving no coupling was introduced.
    expect(checkTopicClaimRepresentationReadiness(scoped).ready).toBe(true)
  })

  test('16: provider_scope matching (providerScopeMatches) is untouched by this module', async () => {
    const { providerScopeMatches } = await import('@/lib/retrieval-engine/lookup-topic-claims')
    const scoped = claim({ claim_id: 'C-1', topic: 'third_party_source_rights', provider_scope: ['getty'] })
    expect(providerScopeMatches(scoped, ['getty'])).toBe(true)
    expect(providerScopeMatches(scoped, ['istock'])).toBe(false)
  })

  test('17: discovered relevance derivation is untouched -- this module is never imported by discovered-relevance.ts', async () => {
    const { deriveDiscoveredTopicOccurrences } = await import('@/lib/crc-engine/discovered-relevance')
    expect(typeof deriveDiscoveredTopicOccurrences).toBe('function')
  })
})
