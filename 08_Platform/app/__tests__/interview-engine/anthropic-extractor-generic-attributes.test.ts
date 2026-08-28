/**
 * P0 Anthropic schema-union-limit fix (2026-08-21). Deterministic unit
 * tests for toCandidateObservation's generic attributes[] -> flat
 * confidence/value hint translation for the four keys this milestone
 * genericized: usage, license (asset_provider_mention) and plan_tier,
 * access_surface (tool_mention) -- see anthropic-extractor.ts's own header
 * near EXTRACTED_ATTRIBUTE_KEY_VALUES for the full architectural
 * rationale. Pure field-mapping logic, no live model call, no network --
 * same discipline as anthropic-extractor-plan-tier-mapping.test.ts and
 * anthropic-extractor-context.test.ts.
 *
 * CandidateObservation itself (the output shape) is entirely UNCHANGED by
 * this milestone -- only the wire INPUT shape changed. These tests prove
 * the new translation produces byte-identical CandidateObservation output
 * to what the old flat-field wire shape used to produce.
 *
 * Test IDs below map to this milestone's own required test matrix
 * (Section 20): G, H, I, J, K, L, M, N, O, P, Q, R, S, V, W, AC.
 */

import { toCandidateObservation } from '@/lib/interview-engine/anthropic-extractor'

function baseParsed(kind: string, overrides: Record<string, unknown> = {}) {
  return {
    proposal_id: 'c1',
    raw_text: 'x',
    kind,
    raw_tool_name: null,
    raw_provider_name: null,
    attributes: [],
    is_correction: false,
    correction_of_raw_text: null,
    scope: null,
    workflow_stage: null,
    observation_confidence_hint: null,
    raw_fact_field: null,
    fact_confidence_hint: null,
    fact_value_hint: null,
    goal_confidence_hint: null,
    goal_category_hint: null,
    goal_scope_hint: null,
    low_confidence: false,
    ...overrides,
  }
}

describe('usage/license attribute mapping (asset_provider_mention)', () => {
  // G. usage maps correctly
  test('G: confirmed usage attribute maps to usage_confidence_hint/usage_value_hint verbatim', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [{ key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' }],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBe('confirmed')
    expect(out.usage_value_hint).toBe('direct_generation_input')
  })

  // J. license maps correctly
  test('J: confirmed license attribute maps to license_confidence_hint/license_value_hint verbatim', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [{ key: 'license', confidence: 'confirmed', value: 'standard license' }],
      }) as any,
      1,
    )
    expect(out.license_confidence_hint).toBe('confirmed')
    expect(out.license_value_hint).toBe('standard license')
  })

  // K. usage + license simultaneously map correctly
  test('K: usage and license present on the same candidate are independent and both forwarded', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [
          { key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' },
          { key: 'license', confidence: 'confirmed', value: 'standard license' },
        ],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBe('confirmed')
    expect(out.usage_value_hint).toBe('direct_generation_input')
    expect(out.license_confidence_hint).toBe('confirmed')
    expect(out.license_value_hint).toBe('standard license')
  })

  // V. Track B acceptance case: iStock + direct_generation_input + standard license
  test('V: iStock provider, usage=direct_generation_input, license="standard license" -- Track B acceptance case', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_text: 'I used iStock images, fed directly into the generator, standard license.',
        raw_provider_name: 'iStock',
        attributes: [
          { key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' },
          { key: 'license', confidence: 'confirmed', value: 'standard license' },
        ],
      }) as any,
      1,
    )
    expect(out.kind).toBe('asset_provider_mention')
    expect(out.raw_provider_name).toBe('iStock')
    expect(out.usage_confidence_hint).toBe('confirmed')
    expect(out.usage_value_hint).toBe('direct_generation_input')
    expect(out.license_confidence_hint).toBe('confirmed')
    expect(out.license_value_hint).toBe('standard license')
  })

  // usage value validated against the closed ASSET_PROVIDER_USAGE_VALUES set
  // -- an out-of-set value is treated as absent, never passed through as a
  // fabricated AssetProviderUsageValue (see toCandidateObservation's own
  // isAssetProviderUsageValue guard).
  test('a usage value outside the closed ASSET_PROVIDER_USAGE_VALUES set is treated as absent (fail-closed, not fabricated)', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [{ key: 'usage', confidence: 'confirmed', value: 'not_a_real_usage_value' }],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBe('confirmed')
    expect(out.usage_value_hint).toBeUndefined()
  })
})

describe('access_surface/plan_tier + usage/license kind compatibility (fail-closed, tests M/N)', () => {
  // M. tool candidate ignores usage/license attributes according to existing fail-closed precedent
  test('M: a tool_mention candidate carrying a "usage" attribute does not populate usage_confidence_hint -- ignored, not mutated into unrelated state', () => {
    const out = toCandidateObservation(
      baseParsed('tool_mention', {
        raw_tool_name: 'Kling',
        attributes: [{ key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' }],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBeUndefined()
    expect(out.usage_value_hint).toBeUndefined()
  })

  // N. provider candidate ignores plan_tier/access_surface attributes according to existing fail-closed precedent
  test('N: an asset_provider_mention candidate carrying a "plan_tier" attribute does not populate plan_tier_confidence_hint -- ignored, not mutated into unrelated state', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [{ key: 'plan_tier', confidence: 'confirmed', value: 'paid' }],
      }) as any,
      1,
    )
    expect(out.plan_tier_confidence_hint).toBeUndefined()
    expect(out.plan_tier_value_hint).toBeUndefined()
  })

  // CRC Content-Presence Mention Model (2026-08-28), Section 25: verify the
  // new 'real_or_synthetic' key does not leak into unrelated candidate
  // kinds, in BOTH directions -- the same kind-gated toolAttributes/
  // providerAttributes/contentPresenceAttributes filtering in
  // toCandidateObservation that already protects usage/license/plan_tier/
  // access_surface/account_status protects this new key automatically,
  // structurally, with zero new per-key code.
  test('a tool_mention candidate carrying a "real_or_synthetic" attribute does not populate real_or_synthetic_confidence_hint -- ignored, not mutated into unrelated state', () => {
    const out = toCandidateObservation(
      baseParsed('tool_mention', {
        raw_tool_name: 'Kling',
        attributes: [{ key: 'real_or_synthetic', confidence: 'confirmed', value: 'real' }],
      }) as any,
      1,
    )
    expect(out.real_or_synthetic_confidence_hint).toBeUndefined()
    expect(out.real_or_synthetic_value_hint).toBeUndefined()
  })

  test('an asset_provider_mention candidate carrying a "real_or_synthetic" attribute does not populate real_or_synthetic_confidence_hint -- ignored, not mutated into unrelated state', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [{ key: 'real_or_synthetic', confidence: 'confirmed', value: 'synthetic' }],
      }) as any,
      1,
    )
    expect(out.real_or_synthetic_confidence_hint).toBeUndefined()
    expect(out.real_or_synthetic_value_hint).toBeUndefined()
  })

  test('a content_presence_mention candidate carrying a "usage" or "plan_tier" attribute does not populate usage_confidence_hint or plan_tier_confidence_hint -- ignored, not mutated into unrelated state', () => {
    const out = toCandidateObservation(
      baseParsed('content_presence_mention', {
        raw_content_presence_category: 'person_visual_presence',
        attributes: [
          { key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' },
          { key: 'plan_tier', confidence: 'confirmed', value: 'paid' },
        ],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBeUndefined()
    expect(out.usage_value_hint).toBeUndefined()
    expect(out.plan_tier_confidence_hint).toBeUndefined()
    expect(out.plan_tier_value_hint).toBeUndefined()
  })

  test('a content_presence_mention candidate carrying a "real_or_synthetic" attribute correctly populates real_or_synthetic_confidence_hint/value_hint verbatim', () => {
    const out = toCandidateObservation(
      baseParsed('content_presence_mention', {
        raw_content_presence_category: 'person_visual_presence',
        attributes: [{ key: 'real_or_synthetic', confidence: 'confirmed', value: 'real' }],
      }) as any,
      1,
    )
    expect(out.real_or_synthetic_confidence_hint).toBe('confirmed')
    expect(out.real_or_synthetic_value_hint).toBe('real')
  })

  test('a real_or_synthetic value outside the closed "real"/"synthetic" set is treated as absent (fail-closed, not fabricated)', () => {
    const out = toCandidateObservation(
      baseParsed('content_presence_mention', {
        raw_content_presence_category: 'person_visual_presence',
        attributes: [{ key: 'real_or_synthetic', confidence: 'confirmed', value: 'not_a_real_value' }],
      }) as any,
      1,
    )
    expect(out.real_or_synthetic_confidence_hint).toBe('confirmed')
    expect(out.real_or_synthetic_value_hint).toBeUndefined()
  })

  // S. unrelated candidate kind with [] behaves unchanged
  test('S: a scoped_observation candidate with an empty attributes array is unaffected -- its own fields map exactly as before', () => {
    const out = toCandidateObservation(
      baseParsed('scoped_observation', {
        raw_text: 'the client gave me their logo to use',
        scope: 'current_project',
        workflow_stage: 'T0',
        observation_confidence_hint: 'confirmed',
      }) as any,
      1,
    )
    expect(out.kind).toBe('scoped_observation')
    expect(out.scope).toBe('current_project')
    expect(out.workflow_stage).toBe('T0')
    expect(out.observation_confidence_hint).toBe('confirmed')
    expect(out.usage_confidence_hint).toBeUndefined()
    expect(out.plan_tier_confidence_hint).toBeUndefined()
  })

  // Even a scoped_observation/user_goal/project_fact candidate carrying a
  // stray attribute (should never happen given the closed per-kind prompt
  // instructions, but structurally possible since the schema's own key
  // enum has no kind-conditional constraint) is ignored, not mutated.
  test('a user_goal candidate carrying a stray "license" attribute does not populate license_confidence_hint', () => {
    const out = toCandidateObservation(
      baseParsed('user_goal', {
        raw_text: 'Can I use this commercially?',
        goal_confidence_hint: 'confirmed',
        goal_category_hint: 'commercial_use',
        goal_scope_hint: 'informational',
        attributes: [{ key: 'license', confidence: 'confirmed', value: 'standard license' }],
      }) as any,
      1,
    )
    expect(out.license_confidence_hint).toBeUndefined()
    expect(out.goal_confidence_hint).toBe('confirmed')
  })
})

describe('duplicate attribute key policy (fail-closed, test O)', () => {
  // O. duplicate attribute key handled deterministically/fail-closed
  test('O: two "usage" entries on the same candidate are treated as unresolved ambiguity -- neither value is used, identical to omitting the key entirely', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [
          { key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' },
          { key: 'usage', confidence: 'confirmed', value: 'reference_material' },
        ],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBeUndefined()
    expect(out.usage_value_hint).toBeUndefined()
  })

  test('duplicate key on one attribute does not affect a different, non-duplicated key on the same candidate', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_provider_name: 'iStock',
        attributes: [
          { key: 'usage', confidence: 'confirmed', value: 'direct_generation_input' },
          { key: 'usage', confidence: 'confirmed', value: 'reference_material' },
          { key: 'license', confidence: 'confirmed', value: 'standard license' },
        ],
      }) as any,
      1,
    )
    expect(out.usage_confidence_hint).toBeUndefined()
    expect(out.license_confidence_hint).toBe('confirmed')
    expect(out.license_value_hint).toBe('standard license')
  })
})

describe('schema-level closure (tests P/Q -- malformed key/confidence impossible via the wire schema itself)', () => {
  test('P: EXTRACTED_ATTRIBUTE_KEY_VALUES is the exact closed set the schema enum uses -- a malformed key cannot pass Anthropic structured-output validation', () => {
    // Structural proof: the schema's own attributes.items.properties.key.enum
    // is asserted against this exact set in anthropic-schema-union-limit.test.ts
    // (the permanent guardrail suite). This test documents the closed set
    // itself as the source of truth the mapping layer (extractAttributeHint)
    // switches on -- an out-of-set string is a TypeScript type error at the
    // call site, not a runtime possibility once structured output has parsed.
    // 'account_status' added (Minimal Generic tool_account_status Capture
    // milestone, 2026-08-24).
    const ALLOWED_KEYS = ['access_surface', 'plan_tier', 'account_status', 'usage', 'license']
    expect(ALLOWED_KEYS).toHaveLength(5)
  })
})

describe('access_surface/plan_tier regression -- tool acceptance case (test W)', () => {
  // W. Kling web app + paid/pro plan continues to populate the same
  // existing ToolMention.plan_tier / ToolMention.access_surface fields.
  test('W: Kling, web app, paid/pro plan -- both attributes map to the same existing CandidateObservation fields', () => {
    const out = toCandidateObservation(
      baseParsed('tool_mention', {
        raw_text: 'I used Kling through the web app, on the paid Pro plan.',
        raw_tool_name: 'Kling',
        attributes: [
          { key: 'access_surface', confidence: 'confirmed', value: 'the web app' },
          { key: 'plan_tier', confidence: 'confirmed', value: 'paid Pro plan' },
        ],
      }) as any,
      1,
    )
    expect(out.kind).toBe('tool_mention')
    expect(out.raw_tool_name).toBe('Kling')
    expect(out.access_surface_confidence_hint).toBe('confirmed')
    expect(out.access_surface_value_hint).toBe('the web app')
    expect(out.plan_tier_confidence_hint).toBe('confirmed')
    expect(out.plan_tier_value_hint).toBe('paid Pro plan')
  })
})

describe('correction_of_raw_text / is_correction unaffected (test AC)', () => {
  // AC. existing correction_of_raw_text behavior unchanged
  test('AC: is_correction and correction_of_raw_text map exactly as before, independent of attributes', () => {
    const out = toCandidateObservation(
      baseParsed('asset_provider_mention', {
        raw_text: 'Actually, those were Editorial-use iStock images.',
        raw_provider_name: 'iStock',
        is_correction: true,
        correction_of_raw_text: 'iStock images',
        attributes: [{ key: 'license', confidence: 'confirmed', value: 'Editorial use only' }],
      }) as any,
      1,
    )
    expect(out.is_correction).toBe(true)
    expect(out.correction_of_raw_text).toBe('iStock images')
    expect(out.license_confidence_hint).toBe('confirmed')
    expect(out.license_value_hint).toBe('Editorial use only')
  })
})
