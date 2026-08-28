/**
 * Serialization round-trip tests, including the Milestone 1 (2026-08-15)
 * backward-compatibility requirement: a session persisted before
 * `user_goals` existed on StructuredUnderstanding must still deserialize
 * safely, with `user_goals` defaulted to `[]` rather than `undefined` --
 * see serialization.ts's own deserializeStructuredUnderstanding for the
 * fix this tests.
 */

import { deserializeStructuredUnderstanding, serializeStructuredUnderstanding } from '../../lib/interview-engine/serialization'
import type { AssessmentJurisdictionMention, ContentPresenceMention, StructuredUnderstanding } from '../../types/interview-engine'

function currentSU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'confirmed', value: 'AI commercial for my client' }, source_turn: 1, source_statement: 'placeholder' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [{ goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', category: 'unknown', scope: 'informational', superseded_by: null, source_turn: 1, source_statement: 'placeholder' }],
    asset_provider_mentions: [],
    assessment_jurisdiction_mentions: [],
    content_presence_mentions: [],
    current_phase: 1,
    gate_1_state: 'not_met',
    gate_2_state: 'not_yet_stable',
    completion_reason: null,
    opt_out_scope: null,
  }
}

describe('serializeStructuredUnderstanding / deserializeStructuredUnderstanding', () => {
  test('a current-shape session round-trips losslessly, including user_goals', () => {
    const su = currentSU()
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped).toEqual(su)
  })

  test('a historical session JSON predating user_goals deserializes with user_goals defaulted to [], not undefined', () => {
    const historicalShape = currentSU()
    // Simulate a real pre-Milestone-1 row: build the JSON by hand, WITHOUT
    // a user_goals key at all -- not simply `{ ...su, user_goals: undefined }`,
    // since JSON.stringify would already drop an explicit undefined key,
    // but a real historical Supabase row genuinely never had the key.
    const { user_goals: _omitted, ...withoutUserGoals } = historicalShape
    const historicalJson = JSON.stringify(withoutUserGoals)
    expect(historicalJson).not.toContain('user_goals')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.user_goals).toEqual([])
    expect(Array.isArray(deserialized.user_goals)).toBe(true)
    // Every other field survives unchanged -- this is a targeted default,
    // not a rewrite of the rest of the historical row.
    expect(deserialized.project_facts).toEqual(historicalShape.project_facts)
    expect(deserialized.current_phase).toBe(historicalShape.current_phase)
  })

  test('a historical session with user_goals absent does not throw when the result is used as an array (.filter, .some)', () => {
    const historicalShape = currentSU()
    const { user_goals: _omitted, ...withoutUserGoals } = historicalShape
    const deserialized = deserializeStructuredUnderstanding(JSON.stringify(withoutUserGoals))
    expect(() => deserialized.user_goals.filter((g) => g.superseded_by === null)).not.toThrow()
    expect(() => deserialized.user_goals.some((g) => g.state === 'confirmed')).not.toThrow()
  })

  test('a Milestone-1-era goal (user_goals array present, but individual goals lack category/scope) backfills category to "unknown" and scope to "informational" (Milestone 2, 2026-08-15)', () => {
    // Simulate a real row persisted between Milestone 1's launch and
    // Milestone 2's deploy: user_goals exists, but its elements predate the
    // category/scope fields, exactly as `as any` bypasses the current type
    // to construct (the real historical JSON in the database has no such
    // type to bypass -- it simply never had these keys).
    const historicalGoal = { goal_id: 'g-1', state: 'confirmed', raw_text: 'Can I use this commercially?', superseded_by: null, source_turn: 1, source_statement: 'placeholder' }
    const historicalJson = JSON.stringify({ ...currentSU(), user_goals: [historicalGoal] })
    expect(historicalJson).not.toContain('"category"')
    expect(historicalJson).not.toContain('"scope"')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.user_goals[0].category).toBe('unknown')
    expect(deserialized.user_goals[0].scope).toBe('informational')
    // Every other field on the goal survives unchanged.
    expect(deserialized.user_goals[0].raw_text).toBe('Can I use this commercially?')
  })

  test('a current-shape goal with category/scope already set round-trips those values unchanged, never overwritten by the backfill default', () => {
    const su = currentSU()
    su.user_goals[0].category = 'likeness'
    su.user_goals[0].scope = 'determination_request'
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped.user_goals[0].category).toBe('likeness')
    expect(roundTripped.user_goals[0].scope).toBe('determination_request')
  })

  test('a historical session predating project_facts.jurisdiction (CRC Living Knowledge Phase 1, 2026-08-16) deserializes with jurisdiction defaulted to the full AttestedFact<string> shape (unknown state, source_turn 0, empty source_statement), not undefined -- and every other project_facts field survives unchanged', () => {
    const historicalShape = currentSU()
    const { jurisdiction: _omittedJurisdiction, ...projectFactsWithoutJurisdiction } = historicalShape.project_facts
    const historicalJson = JSON.stringify({ ...historicalShape, project_facts: projectFactsWithoutJurisdiction })
    // Checks for the exact `project_facts.jurisdiction` key, not the bare
    // substring "jurisdiction" -- the top-level `assessment_jurisdiction_mentions`
    // field (added by the Assessment-Jurisdiction Mention Model milestone,
    // 2026-08-28) legitimately contains that substring and is untouched here.
    expect(historicalJson).not.toContain('"jurisdiction":')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.project_facts.jurisdiction).toEqual({ attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' })
    expect(deserialized.project_facts.intended_use).toEqual(historicalShape.project_facts.intended_use)
    expect(deserialized.project_facts.workflow_role).toEqual(historicalShape.project_facts.workflow_role)
  })

  test('a historical session missing jurisdiction does not throw when the applicability evaluator reads project_facts.jurisdiction.attestation.state', () => {
    const historicalShape = currentSU()
    const { jurisdiction: _omittedJurisdiction, ...projectFactsWithoutJurisdiction } = historicalShape.project_facts
    const deserialized = deserializeStructuredUnderstanding(JSON.stringify({ ...historicalShape, project_facts: projectFactsWithoutJurisdiction }))
    expect(() => deserialized.project_facts.jurisdiction.attestation.state).not.toThrow()
    expect(deserialized.project_facts.jurisdiction.attestation.state).toBe('unknown')
  })

  test('a current-shape session with jurisdiction already confirmed round-trips that value unchanged, never overwritten by the backfill default', () => {
    const su = currentSU()
    su.project_facts.jurisdiction = { attestation: { state: 'confirmed', value: 'United States' }, source_turn: 3, source_statement: 'US' }
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped.project_facts.jurisdiction).toEqual({ attestation: { state: 'confirmed', value: 'United States' }, source_turn: 3, source_statement: 'US' })
  })

  test('a historical session predating project_facts.human_contribution_description (Copyright UAT Correction Milestone, 2026-08-19) deserializes with it defaulted to the full AttestedFact<string> shape (unknown state, source_turn 0, empty source_statement), not undefined -- and every other project_facts field survives unchanged. No database migration required -- this is the same JSONB-storage/deserialize-funnel backfill discipline as the jurisdiction test immediately above.', () => {
    const historicalShape = currentSU()
    const { human_contribution_description: _omitted, ...projectFactsWithoutHumanContribution } = historicalShape.project_facts
    const historicalJson = JSON.stringify({ ...historicalShape, project_facts: projectFactsWithoutHumanContribution })
    expect(historicalJson).not.toContain('human_contribution_description')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.project_facts.human_contribution_description).toEqual({ attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' })
    expect(deserialized.project_facts.intended_use).toEqual(historicalShape.project_facts.intended_use)
    expect(deserialized.project_facts.workflow_role).toEqual(historicalShape.project_facts.workflow_role)
    expect(deserialized.project_facts.jurisdiction).toEqual(historicalShape.project_facts.jurisdiction)
  })

  test('a historical session missing human_contribution_description does not throw when eligibility code reads project_facts.human_contribution_description.attestation.state', () => {
    const historicalShape = currentSU()
    const { human_contribution_description: _omitted, ...projectFactsWithoutHumanContribution } = historicalShape.project_facts
    const deserialized = deserializeStructuredUnderstanding(JSON.stringify({ ...historicalShape, project_facts: projectFactsWithoutHumanContribution }))
    expect(() => deserialized.project_facts.human_contribution_description.attestation.state).not.toThrow()
    expect(deserialized.project_facts.human_contribution_description.attestation.state).toBe('unknown')
  })

  test('a current-shape session with human_contribution_description already confirmed round-trips that value unchanged, never overwritten by the backfill default', () => {
    const su = currentSU()
    su.project_facts.human_contribution_description = { attestation: { state: 'confirmed', value: 'I only wrote prompts.' }, source_turn: 3, source_statement: 'I only wrote prompts.' }
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped.project_facts.human_contribution_description).toEqual({ attestation: { state: 'confirmed', value: 'I only wrote prompts.' }, source_turn: 3, source_statement: 'I only wrote prompts.' })
  })

  test('a historical session predating asset_provider_mentions (Living Knowledge — Third-Party Source Rights, M1+M2, 2026-08-18) deserializes with it defaulted to [], not undefined -- and every other field survives unchanged', () => {
    const historicalShape = currentSU()
    const { asset_provider_mentions: _omitted, ...withoutAssetProviderMentions } = historicalShape
    const historicalJson = JSON.stringify(withoutAssetProviderMentions)
    expect(historicalJson).not.toContain('asset_provider_mentions')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.asset_provider_mentions).toEqual([])
    expect(Array.isArray(deserialized.asset_provider_mentions)).toBe(true)
    expect(deserialized.project_facts).toEqual(historicalShape.project_facts)
    expect(deserialized.user_goals).toEqual(historicalShape.user_goals)
  })

  test('a historical session missing asset_provider_mentions does not throw when the result is used as an array (.filter, .some)', () => {
    const historicalShape = currentSU()
    const { asset_provider_mentions: _omitted, ...withoutAssetProviderMentions } = historicalShape
    const deserialized = deserializeStructuredUnderstanding(JSON.stringify(withoutAssetProviderMentions))
    expect(() => deserialized.asset_provider_mentions.filter((m) => m.superseded_by === null)).not.toThrow()
  })

  test('a current-shape session with asset_provider_mentions already populated round-trips those values unchanged', () => {
    const su = currentSU()
    su.asset_provider_mentions = [
      { mention_id: 't1-c1', resolution: { kind: 'canonical', identifier: 'getty' }, confidence: 'confirmed', source_turn: 1, source_statement: 'I used Getty.', superseded_by: null, usage: { state: 'unknown' }, license: { state: 'unknown' } },
    ]
    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))
    expect(roundTripped.asset_provider_mentions).toEqual(su.asset_provider_mentions)
  })

  // W. old persisted session compatibility (Track B — Generic Living-Knowledge
  // Readiness/Askability milestone, 2026-08-20): a session persisted with a
  // populated asset_provider_mentions ARRAY, but before usage/license existed
  // as per-element fields -- distinct from the "array itself missing"
  // historical case above.
  test('a historical asset_provider_mention lacking usage/license keys entirely deserializes with both defaulted to {state: "unknown"}, not undefined', () => {
    const historicalJson = JSON.stringify({
      ...currentSU(),
      asset_provider_mentions: [
        { mention_id: 't1-c1', resolution: { kind: 'canonical', identifier: 'istock' }, confidence: 'confirmed', source_turn: 1, source_statement: 'I used iStock.', superseded_by: null },
      ],
    })
    expect(historicalJson).not.toContain('"usage"')
    expect(historicalJson).not.toContain('"license"')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.asset_provider_mentions[0].usage).toEqual({ state: 'unknown' })
    expect(deserialized.asset_provider_mentions[0].license).toEqual({ state: 'unknown' })
    // Everything else on the mention survives unchanged.
    expect(deserialized.asset_provider_mentions[0].mention_id).toBe('t1-c1')
    expect(deserialized.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'istock' })
  })

  // Post-Integration Cleanup (CRC Assessment-Jurisdiction Mention Model —
  // Post-Integration Cleanup, 2026-08-28), Finding 3: a direct, focused
  // round-trip test for MIXED assessment_jurisdiction_mentions state --
  // a current confirmed inclusion, a superseded historical mention, and a
  // current confirmed_absent exclusion together -- through the real,
  // generic serialize/deserialize mechanism (no special-cased serializer;
  // serializeStructuredUnderstanding is a plain JSON.stringify, and
  // deserializeStructuredUnderstanding's only special handling for this
  // field is the backward-compatible `?? []` default tested elsewhere in
  // this file). This is also the direct proof, previously only reasoned
  // about structurally, that the legacy-scalar bridge's own "touched"
  // evidence (assessment-jurisdiction-scope.ts) survives a real reload: the
  // raw collection length (including the superseded entry) is what proves
  // "touched," and that entry is neither dropped nor silently resurrected
  // into the legacy scalar by this round trip.
  test('mixed assessment_jurisdiction_mentions state (current inclusion + superseded historical mention + current exclusion) round-trips losslessly, preserving provenance, supersession, and touched-state evidence', () => {
    const su = currentSU()
    const supersededNewYork: AssessmentJurisdictionMention = {
      mention_id: 't1-c1',
      value: 'New York',
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'Also consider New York.',
      superseded_by: 't2-c1',
    }
    const correctedCalifornia: AssessmentJurisdictionMention = {
      mention_id: 't2-c1',
      value: 'California',
      confidence: 'confirmed',
      source_turn: 2,
      source_statement: 'Not New York -- California.',
      superseded_by: null,
    }
    const excludedCanada: AssessmentJurisdictionMention = {
      mention_id: 't3-c1',
      value: 'Canada',
      confidence: 'confirmed_absent',
      source_turn: 3,
      source_statement: "Don't assess Canada.",
      superseded_by: null,
    }
    su.assessment_jurisdiction_mentions = [supersededNewYork, correctedCalifornia, excludedCanada]

    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))

    // All entries present, current vs. superseded state unchanged.
    expect(roundTripped.assessment_jurisdiction_mentions).toEqual(su.assessment_jurisdiction_mentions)
    expect(roundTripped.assessment_jurisdiction_mentions).toHaveLength(3)

    // Exclusion survives distinctly from inclusion.
    const active = roundTripped.assessment_jurisdiction_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => ({ value: m.value, confidence: m.confidence })).sort((a, b) => a.value.localeCompare(b.value))).toEqual([
      { value: 'California', confidence: 'confirmed' },
      { value: 'Canada', confidence: 'confirmed_absent' },
    ])

    // Provenance survives exactly (real source_turn/source_statement, not fabricated).
    expect(roundTripped.assessment_jurisdiction_mentions[0].source_turn).toBe(1)
    expect(roundTripped.assessment_jurisdiction_mentions[0].source_statement).toBe('Also consider New York.')
    expect(roundTripped.assessment_jurisdiction_mentions[2].source_turn).toBe(3)
    expect(roundTripped.assessment_jurisdiction_mentions[2].source_statement).toBe("Don't assess Canada.")

    // superseded_by linkage survives (the historical New York entry still
    // correctly points at the mention that replaced it).
    expect(roundTripped.assessment_jurisdiction_mentions[0].superseded_by).toBe('t2-c1')
    expect(roundTripped.assessment_jurisdiction_mentions[1].superseded_by).toBeNull()

    // Raw collection length (including the superseded entry) still proves
    // "touched" -- the legacy scalar fallback therefore cannot resurrect,
    // even though this session's legacy scalar itself is 'unknown' (never
    // populated -- see Finding 1: current extraction cannot write it).
    expect(roundTripped.assessment_jurisdiction_mentions.length).toBeGreaterThan(0)
    expect(roundTripped.project_facts.jurisdiction.attestation.state).toBe('unknown')
  })

  // CRC Content-Presence Mention Model — Generic Implementation, 2026-08-28,
  // §26: a direct, focused round-trip test for mixed content_presence_mentions
  // state -- an active confirmed mention (with real_or_synthetic set), a
  // superseded historical mention, and a current confirmed_absent mention --
  // through the real, generic serialize/deserialize mechanism (no
  // special-cased serializer; same discipline as the mixed
  // assessment_jurisdiction_mentions test immediately above).
  test('mixed content_presence_mentions state (active confirmed with real_or_synthetic + superseded historical mention + current confirmed_absent) round-trips losslessly, preserving provenance, supersession, and touched-state evidence', () => {
    const su = currentSU()
    const supersededUnqualified: ContentPresenceMention = {
      mention_id: 't1-c1',
      category: 'person_visual_presence',
      real_or_synthetic: null,
      confidence: 'confirmed',
      source_turn: 1,
      source_statement: 'A person appears.',
      superseded_by: 't2-c1',
    }
    const correctedSynthetic: ContentPresenceMention = {
      mention_id: 't2-c1',
      category: 'person_visual_presence',
      real_or_synthetic: 'synthetic',
      confidence: 'confirmed',
      source_turn: 2,
      source_statement: "Actually that's a fully synthetic character.",
      superseded_by: null,
    }
    const absentVoice: ContentPresenceMention = {
      mention_id: 't3-c1',
      category: 'person_voice_presence',
      real_or_synthetic: null,
      confidence: 'confirmed_absent',
      source_turn: 3,
      source_statement: "No person's voice is used.",
      superseded_by: null,
    }
    su.content_presence_mentions = [supersededUnqualified, correctedSynthetic, absentVoice]

    const roundTripped = deserializeStructuredUnderstanding(serializeStructuredUnderstanding(su))

    // All entries present, current vs. superseded state unchanged.
    expect(roundTripped.content_presence_mentions).toEqual(su.content_presence_mentions)
    expect(roundTripped.content_presence_mentions).toHaveLength(3)

    // real_or_synthetic survives where stored, and stays null where unset --
    // never collapsed into a third asserted value by the round trip.
    const active = roundTripped.content_presence_mentions.filter((m) => m.superseded_by === null)
    expect(active.map((m) => ({ category: m.category, real_or_synthetic: m.real_or_synthetic, confidence: m.confidence })).sort((a, b) => a.category.localeCompare(b.category))).toEqual([
      { category: 'person_visual_presence', real_or_synthetic: 'synthetic', confidence: 'confirmed' },
      { category: 'person_voice_presence', real_or_synthetic: null, confidence: 'confirmed_absent' },
    ])

    // Provenance survives exactly (real source_turn/source_statement, not fabricated).
    expect(roundTripped.content_presence_mentions[0].source_turn).toBe(1)
    expect(roundTripped.content_presence_mentions[0].source_statement).toBe('A person appears.')
    expect(roundTripped.content_presence_mentions[2].source_turn).toBe(3)
    expect(roundTripped.content_presence_mentions[2].source_statement).toBe("No person's voice is used.")

    // superseded_by linkage survives (the historical unqualified entry
    // still correctly points at the mention that replaced it).
    expect(roundTripped.content_presence_mentions[0].superseded_by).toBe('t2-c1')
    expect(roundTripped.content_presence_mentions[1].superseded_by).toBeNull()

    // Raw collection length (including the superseded entry) proves
    // "touched" -- no migration fabricates content-presence facts, and an
    // empty collection (tested separately below) always means "no recorded
    // information," never "confirmed absence."
    expect(roundTripped.content_presence_mentions.length).toBeGreaterThan(0)
  })

  test('a historical session predating content_presence_mentions deserializes with it defaulted to [], not undefined -- and every other field survives unchanged', () => {
    const historicalShape = currentSU()
    const { content_presence_mentions: _omitted, ...withoutContentPresenceMentions } = historicalShape
    const historicalJson = JSON.stringify(withoutContentPresenceMentions)
    expect(historicalJson).not.toContain('content_presence_mentions')

    const deserialized = deserializeStructuredUnderstanding(historicalJson)
    expect(deserialized.content_presence_mentions).toEqual([])
    expect(Array.isArray(deserialized.content_presence_mentions)).toBe(true)
    expect(deserialized.project_facts).toEqual(historicalShape.project_facts)
    expect(deserialized.user_goals).toEqual(historicalShape.user_goals)
  })
})
