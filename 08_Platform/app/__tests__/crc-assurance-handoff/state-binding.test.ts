/**
 * CAH-3D -- state binding (SB3/SB4). Pure; no DB.
 * Covers CAH-3D §29 tests 15-25.
 */

import {
  canonicalizeStructuredUnderstanding,
  computeCrcStateIdentity,
  compareCrcStateIdentity,
  CANONICALIZATION_VERSION,
} from '@/lib/crc-assurance-handoff/state-binding'
import type { StructuredUnderstanding } from '@/types/interview-engine'

function baseSU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'commercial ad' }, source_turn: 2, source_statement: 'for a paid ad' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [
      {
        mention_id: 'tm-1',
        resolution: { kind: 'canonical', identifier: 'runway-gen3' },
        access_surface: { state: 'unknown' },
        plan_tier: { state: 'unknown' },
        account_status: { state: 'unknown' },
        confidence: 'confirmed',
        source_turn: 1,
        source_statement: 'I used Runway',
        superseded_by: null,
      },
    ],
    scoped_observations: [],
    user_goals: [
      {
        goal_id: 'g-1',
        raw_text: 'can I use this commercially',
        category: 'commercial_use',
        scope: 'informational',
        state: 'confirmed',
        superseded_by: null,
        source_turn: 1,
        source_statement: 'can I use this commercially',
      },
    ],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 4,
    gate_1_state: 'met',
    gate_2_state: 'stable',
    completion_reason: 'gate_1_gate_2_met',
    opt_out_scope: null,
  }
}

describe('CAH-3D state binding -- SB3 identity', () => {
  test('15: identical persisted project state produces identical identity', () => {
    const a = computeCrcStateIdentity(baseSU())
    const b = computeCrcStateIdentity(baseSU())
    expect(a).toEqual(b)
    expect(a.canonicalization_version).toBe(CANONICALIZATION_VERSION)
    expect(a.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  test('16: incidental object-key ordering does not change identity', () => {
    const su = baseSU()
    const a = computeCrcStateIdentity(su)

    // Reconstruct top-level + a nested object with deliberately reversed key
    // insertion order. Same content, different key order.
    const reversedTop: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(su).reverse()) reversedTop[k] = v
    const pf = su.project_facts as unknown as Record<string, unknown>
    const reversedPf: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(pf).reverse()) reversedPf[k] = v
    reversedTop.project_facts = reversedPf

    expect(computeCrcStateIdentity(reversedTop)).toEqual(a)
  })

  test('17: an authority-relevant persisted-state change changes identity', () => {
    const su = baseSU()
    const changed = baseSU()
    changed.project_facts.intended_use = { attestation: { state: 'confirmed', value: 'DIFFERENT use' }, source_turn: 2, source_statement: 'for a paid ad' }
    expect(computeCrcStateIdentity(changed).fingerprint).not.toBe(computeCrcStateIdentity(su).fingerprint)
  })

  test('18: a superseded-history change changes identity', () => {
    const su = baseSU()
    const withSuperseded = baseSU()
    withSuperseded.tool_mentions.push({
      mention_id: 'tm-2',
      resolution: { kind: 'unresolved_alias', raw_name: 'Nano Banana' },
      access_surface: { state: 'unknown' },
      plan_tier: { state: 'unknown' },
      account_status: { state: 'unknown' },
      confidence: 'confirmed',
      source_turn: 3,
      source_statement: 'actually Nano Banana',
      superseded_by: 'tm-1',
    })
    expect(computeCrcStateIdentity(withSuperseded).fingerprint).not.toBe(computeCrcStateIdentity(su).fingerprint)
  })

  test('19: adding an append-only content-presence statement changes identity', () => {
    const su = baseSU()
    const withCp = baseSU()
    withCp.content_presence_mentions.push({
      mention_id: 'cp-1',
      category: 'person_visual_presence',
      real_or_synthetic: 'synthetic',
      confidence: 'confirmed',
      source_turn: 4,
      source_statement: 'a synthetic person appears',
      superseded_by: null,
    })
    expect(computeCrcStateIdentity(withCp).fingerprint).not.toBe(computeCrcStateIdentity(su).fingerprint)
  })

  test('20: a source-provenance change (source_turn / source_statement) changes identity', () => {
    const turnChange = baseSU()
    turnChange.user_goals[0].source_turn = 99
    expect(computeCrcStateIdentity(turnChange).fingerprint).not.toBe(computeCrcStateIdentity(baseSU()).fingerprint)

    const stmtChange = baseSU()
    stmtChange.user_goals[0].source_statement = 'reworded verbatim source'
    expect(computeCrcStateIdentity(stmtChange).fingerprint).not.toBe(computeCrcStateIdentity(baseSU()).fingerprint)
  })

  test('21: runtime_commit is not part of project-state identity', () => {
    // computeCrcStateIdentity takes ONLY the StructuredUnderstanding; there is
    // no runtime_commit parameter. The canonical string must not contain it.
    const canon = canonicalizeStructuredUnderstanding(baseSU())
    expect(canon).not.toMatch(/runtime_commit/i)
    expect(canon).not.toMatch(/[0-9a-f]{40}/) // no bare git SHA leaked in
  })

  test('22 + 23: current LK / Retrieval / BI / Projection / Composition cannot affect identity', () => {
    const canon = canonicalizeStructuredUnderstanding(baseSU())
    for (const forbidden of ['retrieval', 'bounded_interpretation', 'interpretation_status', 'projection', 'composition', 'matrix', 'topic_claim', 'last_verified', 'match_origin']) {
      expect(canon.toLowerCase()).not.toContain(forbidden)
    }
    // And structurally: the canonical object's top-level keys are a subset of
    // StructuredUnderstanding's own keys -- nothing recomputed is folded in.
    const keys = Object.keys(JSON.parse(canon)).sort()
    const suKeys = Object.keys(baseSU()).sort()
    for (const k of keys) expect(suKeys).toContain(k)
  })

  test('24: a future / unknown authority-relevant field cannot be silently ignored', () => {
    const su = baseSU() as unknown as Record<string, unknown>
    const withFutureField = { ...su, some_future_authority_field: [{ fact: 'x', superseded_by: null }] }
    expect(computeCrcStateIdentity(withFutureField).fingerprint).not.toBe(computeCrcStateIdentity(baseSU()).fingerprint)
  })

  test('25: incompatible canonicalization versions fail closed for comparison', () => {
    const same = { fingerprint: 'deadbeef', canonicalization_version: CANONICALIZATION_VERSION }
    const otherVersion = { fingerprint: 'deadbeef', canonicalization_version: 'csi-v99-future' }
    // Identical fingerprints, different version -> NOT "unchanged".
    expect(compareCrcStateIdentity(same, otherVersion)).toBe('comparison_unavailable')
    expect(compareCrcStateIdentity(otherVersion, same)).toBe('comparison_unavailable')
    // Same version: normal neutral comparison.
    expect(compareCrcStateIdentity(same, { ...same })).toBe('unchanged')
    expect(compareCrcStateIdentity(same, { fingerprint: 'other', canonicalization_version: CANONICALIZATION_VERSION })).toBe('changed')
  })

  test('unreadable persisted state throws (callers must fail closed)', () => {
    expect(() => canonicalizeStructuredUnderstanding({ user_goals: 'not-an-array' })).toThrow()
    expect(() => computeCrcStateIdentity({ tool_mentions: 42 })).toThrow()
  })
})
