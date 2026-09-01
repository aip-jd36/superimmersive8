/**
 * AssetProviderMention + `third_party_source_rights` goal extraction tests
 * (Living Knowledge — Third-Party Source Rights, M1+M2, 2026-08-18).
 *
 * Mirrors extraction.test.ts's own established pattern (mock extractor,
 * runExtractionPipeline exercised end-to-end) -- proves the proposal ->
 * normalization -> attestation -> mutation -> diagnostic pipeline for the
 * new candidate kind, not natural-language extraction accuracy (that's a
 * live-model eval concern, out of scope here, same split as every other
 * candidate kind in this codebase).
 *
 * Run: npx jest __tests__/interview-engine/asset-provider-mentions.test.ts
 */

import type { AssetProviderMention, StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { normalizeCandidate, runExtractionPipeline, findCorroboratingAssetProvider } from '../../lib/interview-engine/extraction'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'
import { buildRetrievalHandoff } from '../../lib/interview-engine/handoff'

function emptySU(): StructuredUnderstanding {
  return {
    project_facts: {
      intended_use: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      workflow_role: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      jurisdiction: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
      human_contribution_description: { attestation: { state: 'unknown' }, source_turn: 0, source_statement: '' },
    },
    tool_mentions: [],
    scoped_observations: [],
    user_goals: [],
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

function providerCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'I used Getty.',
    kind: 'asset_provider_mention',
    raw_provider_name: 'Getty',
    ...overrides,
  }
}

// ── Track B — Generic Living-Knowledge Readiness/Askability milestone
// (2026-08-20): usage/license hint capture, multi-provider fail-closed
// safety, and correction/carry-forward semantics. ─────────────────────────

describe('usage/license hint capture', () => {
  test('A: a candidate with usage_confidence_hint confirmed populates AssetProviderMention.usage', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I uploaded the iStock images directly into Kling.' },
      constantExtractor([
        providerCandidate({
          raw_text: 'I uploaded the iStock images directly into Kling.',
          raw_provider_name: 'iStock',
          usage_confidence_hint: 'confirmed',
          usage_value_hint: 'direct_generation_input',
        }),
      ]),
    )
    expect(updated.asset_provider_mentions[0].usage).toEqual({ state: 'confirmed', value: 'direct_generation_input' })
    expect(updated.asset_provider_mentions[0].license).toEqual({ state: 'unknown' })
  })

  test('B: a candidate with license_confidence_hint confirmed populates AssetProviderMention.license', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have the standard iStock license.' },
      constantExtractor([
        providerCandidate({
          raw_text: 'I have the standard iStock license.',
          raw_provider_name: 'iStock',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'standard license',
        }),
      ]),
    )
    expect(updated.asset_provider_mentions[0].license).toEqual({ state: 'confirmed', value: 'standard license' })
    expect(updated.asset_provider_mentions[0].usage).toEqual({ state: 'unknown' })
  })

  test('a bare provider mention with no usage/license hint defaults both to unknown', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate()]))
    expect(updated.asset_provider_mentions[0].usage).toEqual({ state: 'unknown' })
    expect(updated.asset_provider_mentions[0].license).toEqual({ state: 'unknown' })
  })

  test('C: Getty and iStock both mentioned in the same turn -- a license hint on the iStock candidate only ever attaches to the iStock mention, never Getty', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used a Getty logo and I have the standard iStock license for the rest.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', raw_text: 'a Getty logo', raw_provider_name: 'Getty' }),
        providerCandidate({
          proposal_id: 'c2',
          raw_text: 'the standard iStock license',
          raw_provider_name: 'iStock',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'standard license',
        }),
      ]),
    )
    const getty = updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'getty')!
    const istock = updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'istock')!
    expect(getty.license).toEqual({ state: 'unknown' })
    expect(istock.license).toEqual({ state: 'confirmed', value: 'standard license' })
  })

  test('D: fail-closed -- if the extractor itself leaves the hint unset (genuinely ambiguous which provider), no license is attached to either provider', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have the standard license.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', raw_text: 'Getty and iStock', raw_provider_name: 'Getty' }),
        providerCandidate({ proposal_id: 'c2', raw_text: 'Getty and iStock', raw_provider_name: 'iStock' }),
        // Neither candidate carries a license hint -- the extractor's own
        // job (per SYSTEM_PROMPT) is to leave both unset when ambiguous;
        // this test proves the pipeline doesn't guess on its own even if
        // asked to process both providers in the same turn.
      ]),
    )
    for (const mention of updated.asset_provider_mentions) {
      expect(mention.license).toEqual({ state: 'unknown' })
    }
  })
})

describe('usage/license correction/carry-forward semantics', () => {
  test('E: a correction restating the same provider with a NEW license value overwrites the old one', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I have the standard iStock license.' },
      constantExtractor([providerCandidate({ raw_text: 'I have the standard iStock license.', raw_provider_name: 'iStock', license_confidence_hint: 'confirmed', license_value_hint: 'standard license' })]),
    )
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Actually, those were Editorial-use iStock images.' },
      constantExtractor([
        providerCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually, those were Editorial-use iStock images.',
          raw_provider_name: 'iStock',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'Editorial use only',
          is_correction: true,
        }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].license).toEqual({ state: 'confirmed', value: 'Editorial use only' })
  })

  test('a correction candidate that restates provider identity but says nothing new about usage carries the PREVIOUSLY confirmed usage forward, never resetting it to unknown', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I fed the iStock images directly into Kling.' },
      constantExtractor([providerCandidate({ raw_text: 'I fed the iStock images directly into Kling.', raw_provider_name: 'iStock', usage_confidence_hint: 'confirmed', usage_value_hint: 'direct_generation_input' })]),
    )
    expect(turn1.updated.asset_provider_mentions[0].usage).toEqual({ state: 'confirmed', value: 'direct_generation_input' })

    // Turn 2 restates iStock (e.g. answering an unrelated license question)
    // without any usage hint at all -- usage must be carried forward, not
    // reset to unknown.
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I have the standard iStock license.' },
      constantExtractor([
        providerCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'I have the standard iStock license.',
          raw_provider_name: 'iStock',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'standard license',
        }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].usage).toEqual({ state: 'confirmed', value: 'direct_generation_input' })
    expect(active[0].license).toEqual({ state: 'confirmed', value: 'standard license' })
  })

  test('N: correction supersedes the provider mention chain correctly -- exactly one active mention remains, carrying the latest values', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used iStock.' }, constantExtractor([providerCandidate({ raw_text: 'I used iStock.', raw_provider_name: 'iStock' })]))
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Actually I have the extended iStock license.' },
      constantExtractor([
        providerCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually I have the extended iStock license.',
          raw_provider_name: 'iStock',
          license_confidence_hint: 'confirmed',
          license_value_hint: 'extended license',
          is_correction: true,
        }),
      ]),
    )
    const all = turn2.updated.asset_provider_mentions
    expect(all).toHaveLength(2)
    const active = all.filter((m) => m.superseded_by === null)
    const superseded = all.filter((m) => m.superseded_by !== null)
    expect(active).toHaveLength(1)
    expect(superseded).toHaveLength(1)
    expect(active[0].license).toEqual({ state: 'confirmed', value: 'extended license' })
  })
})

function goalCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'Can I use this Getty image in an ad?',
    kind: 'user_goal',
    goal_confidence_hint: 'confirmed',
    goal_category_hint: 'third_party_source_rights',
    ...overrides,
  }
}

function toolCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 't1',
    turn: 1,
    raw_text: 'I used Kling.',
    kind: 'tool_mention',
    raw_tool_name: 'Kling',
    ...overrides,
  }
}

// ── Normalization / canonicalization (test plan items 6-13) ────────────────

describe('normalizeCandidate: asset provider canonicalization', () => {
  test('Getty resolves to canonical "getty"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Getty' }))).toEqual({ status: 'resolved', canonical_identifier: 'getty' })
  })

  test('"Getty Images" and "GettyImages" both resolve to the same canonical "getty"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Getty Images' }))).toEqual({ status: 'resolved', canonical_identifier: 'getty' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'GettyImages' }))).toEqual({ status: 'resolved', canonical_identifier: 'getty' })
  })

  test('iStock resolves to canonical "istock"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'iStock' }))).toEqual({ status: 'resolved', canonical_identifier: 'istock' })
  })

  test('"iStockphoto" and "iStock by Getty Images" both resolve to "istock", never "getty"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'iStockphoto' }))).toEqual({ status: 'resolved', canonical_identifier: 'istock' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'iStock by Getty Images' }))).toEqual({ status: 'resolved', canonical_identifier: 'istock' })
  })

  test('Shutterstock resolves to canonical "shutterstock"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Shutterstock' }))).toEqual({ status: 'resolved', canonical_identifier: 'shutterstock' })
  })

  test('Adobe Stock resolves to canonical "adobe-stock"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Adobe Stock' }))).toEqual({ status: 'resolved', canonical_identifier: 'adobe-stock' })
  })

  test('Getty and iStock are DISTINCT canonical identifiers, never collapsed despite being corporately related', () => {
    const getty = normalizeCandidate(providerCandidate({ raw_provider_name: 'Getty' }))
    const istock = normalizeCandidate(providerCandidate({ raw_provider_name: 'iStock' }))
    expect(getty.status).toBe('resolved')
    expect(istock.status).toBe('resolved')
    expect(getty).not.toEqual(istock)
  })

  test('an unrecognized provider name is unrecognized, not guessed into an existing canonical id', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'PhotoMega' }))).toEqual({ status: 'unrecognized' })
  })

  // Artlist registration (2026-08-27, Music Scenario A -- Artlist A-3
  // synthetic runtime canary): pure generic registry extension, same
  // mechanism/tests as Getty/iStock/Shutterstock/Adobe Stock above.
  test('Artlist resolves to canonical "artlist"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Artlist' }))).toEqual({ status: 'resolved', canonical_identifier: 'artlist' })
  })

  test('"artlist" (lowercase) and "artlist.io" both resolve to "artlist"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'artlist' }))).toEqual({ status: 'resolved', canonical_identifier: 'artlist' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'artlist.io' }))).toEqual({ status: 'resolved', canonical_identifier: 'artlist' })
  })

  test('Artlist is DISTINCT from every stock-media provider -- registering it introduces no collision', () => {
    const artlist = normalizeCandidate(providerCandidate({ raw_provider_name: 'Artlist' }))
    const getty = normalizeCandidate(providerCandidate({ raw_provider_name: 'Getty' }))
    expect(artlist).toEqual({ status: 'resolved', canonical_identifier: 'artlist' })
    expect(artlist).not.toEqual(getty)
  })

  test('Envato and Epidemic Sound remain unrecognized -- this milestone registers only Artlist, per its own one-provider scope', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Envato' }))).toEqual({ status: 'unrecognized' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Envato Elements' }))).toEqual({ status: 'unrecognized' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Epidemic Sound' }))).toEqual({ status: 'unrecognized' })
  })

  // Storyblocks alias registration (LK-54, 2026-08-30 -- Storyblocks
  // Conversational Reachability Data Completeness): same generic
  // mechanism/tests as Getty/iStock/Shutterstock/Adobe Stock/Artlist above.
  // Only the exact surface form production UAT actually observed
  // ("Storyblocks") is registered -- no speculative variants.
  test('Storyblocks resolves to canonical "storyblocks"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Storyblocks' }))).toEqual({ status: 'resolved', canonical_identifier: 'storyblocks' })
  })

  test('Storyblocks is DISTINCT from every other registered provider -- registering it introduces no collision', () => {
    const storyblocks = normalizeCandidate(providerCandidate({ raw_provider_name: 'Storyblocks' }))
    const getty = normalizeCandidate(providerCandidate({ raw_provider_name: 'Getty' }))
    const artlist = normalizeCandidate(providerCandidate({ raw_provider_name: 'Artlist' }))
    expect(storyblocks).toEqual({ status: 'resolved', canonical_identifier: 'storyblocks' })
    expect(storyblocks).not.toEqual(getty)
    expect(storyblocks).not.toEqual(artlist)
  })

  test('speculative Storyblocks surface forms not justified by observed evidence remain unrecognized -- this milestone registers only the exact observed "Storyblocks" form', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'storyblocks.com' }))).toEqual({ status: 'unrecognized' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Story Blocks' }))).toEqual({ status: 'unrecognized' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'SB' }))).toEqual({ status: 'unrecognized' })
  })

  // Pond5 alias registration (LK-66, 2026-08-30 -- Pond5 Observed
  // Surface-Form Reachability Correction): same generic mechanism/tests as
  // Storyblocks above. Only the exact surface form production UAT actually
  // observed ("Pond5") is registered -- no speculative variants.
  test('Pond5 resolves to canonical "pond5"', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'Pond5' }))).toEqual({ status: 'resolved', canonical_identifier: 'pond5' })
  })

  test('Pond5 is DISTINCT from every other registered provider -- registering it introduces no collision', () => {
    const pond5 = normalizeCandidate(providerCandidate({ raw_provider_name: 'Pond5' }))
    const getty = normalizeCandidate(providerCandidate({ raw_provider_name: 'Getty' }))
    const storyblocks = normalizeCandidate(providerCandidate({ raw_provider_name: 'Storyblocks' }))
    expect(pond5).toEqual({ status: 'resolved', canonical_identifier: 'pond5' })
    expect(pond5).not.toEqual(getty)
    expect(pond5).not.toEqual(storyblocks)
  })

  test('speculative Pond5 surface forms not justified by observed evidence remain unrecognized -- this milestone registers only the exact observed "Pond5" form', () => {
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'pond 5' }))).toEqual({ status: 'unrecognized' })
    expect(normalizeCandidate(providerCandidate({ raw_provider_name: 'pond5.com' }))).toEqual({ status: 'unrecognized' })
  })

  test('a tool_mention candidate is not_applicable to provider normalization (kind isolation)', () => {
    expect(normalizeCandidate(toolCandidate())).not.toEqual({ status: 'unrecognized' })
  })
})

// ── Explicit-goal vs. incidental-disclosure extraction (test plan items 1-5) ─

describe('third_party_source_rights goal extraction discipline', () => {
  test('an explicit rights question produces a confirmed third_party_source_rights goal', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this Getty image in an ad?' },
      constantExtractor([goalCandidate()]),
    )
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0]).toMatchObject({ category: 'third_party_source_rights', state: 'confirmed' })
  })

  test('an incidental disclosure ("I used Getty.") alone produces NO third_party_source_rights goal -- disclosure is not a goal', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Getty.' },
      constantExtractor([providerCandidate({ raw_text: 'I used Getty.', raw_provider_name: 'Getty' })]),
    )
    expect(updated.user_goals).toHaveLength(0)
    expect(updated.asset_provider_mentions).toHaveLength(1)
  })

  test('a mixed turn (commercial_use only, no source-rights question) never fabricates a third_party_source_rights goal', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use the AI video commercially?' },
      constantExtractor([goalCandidate({ raw_text: 'Can I use the AI video commercially?', goal_category_hint: 'commercial_use' })]),
    )
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0].category).toBe('commercial_use')
  })

  test('a turn stating both a source-rights question and a commercial-use question produces two distinct goals, never merged', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this Getty image in the video, and can I use the finished video commercially?' },
      constantExtractor([
        goalCandidate({ proposal_id: 'c1', raw_text: 'Can I use this Getty image in the video', goal_category_hint: 'third_party_source_rights' }),
        goalCandidate({ proposal_id: 'c2', raw_text: 'can I use the finished video commercially', goal_category_hint: 'commercial_use' }),
      ]),
    )
    const active = updated.user_goals.filter((g) => g.superseded_by === null)
    expect(active).toHaveLength(2)
    expect(active.map((g) => g.category).sort()).toEqual(['commercial_use', 'third_party_source_rights'])
  })

  test('no duplicate goals when the same explicit question is proposed once', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'Can I use this Getty image in an ad?' }, constantExtractor([goalCandidate()]))
    expect(updated.user_goals.filter((g) => g.superseded_by === null)).toHaveLength(1)
  })
})

// ── Entity separation: tool vs. asset provider (test plan items 14-16) ─────

describe('entity separation: AssetProviderMention vs. ToolMention never collide', () => {
  test('Kling extracts as a ToolMention, never an AssetProviderMention', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Kling.' }, constantExtractor([toolCandidate()]))
    expect(updated.tool_mentions).toHaveLength(1)
    expect(updated.asset_provider_mentions).toHaveLength(0)
  })

  test('Getty extracts as an AssetProviderMention, never a ToolMention', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate()]))
    expect(updated.asset_provider_mentions).toHaveLength(1)
    expect(updated.tool_mentions).toHaveLength(0)
  })

  test('"I\'m using a Getty image in Kling. Can I use the Getty image in the ad?" -- ToolMention(Kling), AssetProviderMention(Getty), and a third_party_source_rights goal all coexist without collision', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I'm using a Getty image in Kling. Can I use the Getty image in the ad?" },
      constantExtractor([
        toolCandidate({ proposal_id: 'c1', raw_text: 'Kling' }),
        providerCandidate({ proposal_id: 'c2', raw_text: 'Getty' }),
        goalCandidate({ proposal_id: 'c3', raw_text: 'Can I use the Getty image in the ad?' }),
      ]),
    )
    expect(updated.tool_mentions).toHaveLength(1)
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'kling' })
    expect(updated.asset_provider_mentions).toHaveLength(1)
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'canonical', identifier: 'getty' })
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0].category).toBe('third_party_source_rights')
  })
})

// ── Multiple providers / uncertain provider (test plan items 12-13) ────────

describe('multiple and uncertain provider mentions', () => {
  test('"I used Getty and Shutterstock." produces two distinct active AssetProviderMentions, never collapsed into one', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Getty and Shutterstock.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', raw_provider_name: 'Getty' }),
        providerCandidate({ proposal_id: 'c2', raw_provider_name: 'Shutterstock' }),
      ]),
    )
    const active = updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(2)
    const identifiers = active.map((m) => (m.resolution.kind === 'canonical' ? m.resolution.identifier : null)).sort()
    expect(identifiers).toEqual(['getty', 'shutterstock'])
  })

  test('"three from Getty and two from Shutterstock" still produces exactly two mentions, never five -- no asset-level inventory', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I got three images from Getty and two from Shutterstock.' },
      constantExtractor([
        providerCandidate({ proposal_id: 'c1', raw_provider_name: 'Getty' }),
        providerCandidate({ proposal_id: 'c2', raw_provider_name: 'Shutterstock' }),
      ]),
    )
    expect(updated.asset_provider_mentions.filter((m) => m.superseded_by === null)).toHaveLength(2)
  })

  test('"I got it from Getty or iStock, I don\'t remember which" -- low_confidence candidate is deferred, never resolved to either provider', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I got it from Getty or iStock, I don't remember which." },
      constantExtractor([providerCandidate({ raw_provider_name: 'Getty or iStock', low_confidence: true })]),
    )
    expect(updated.asset_provider_mentions).toHaveLength(0)
    expect(diagnostics[0].decision.outcome).toBe('deferred')
  })
})

// ── Provider-without-goal / goal-without-provider (test plan items 14-15) ──

describe('provider-without-goal and goal-without-provider are both valid, independent states', () => {
  test('a provider recognized with no accompanying goal captures the mention and creates no goal', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I sourced the image from Getty.' },
      constantExtractor([providerCandidate({ raw_text: 'I sourced the image from Getty.' })]),
    )
    expect(updated.asset_provider_mentions).toHaveLength(1)
    expect(updated.user_goals).toHaveLength(0)
  })

  test('a third_party_source_rights goal with no provider named is valid -- provider identity is not required to create the goal', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Can I use this stock image in my advertisement?' },
      constantExtractor([goalCandidate({ raw_text: 'Can I use this stock image in my advertisement?' })]),
    )
    expect(updated.user_goals).toHaveLength(1)
    expect(updated.user_goals[0].category).toBe('third_party_source_rights')
    expect(updated.asset_provider_mentions).toHaveLength(0)
  })
})

// ── Path B preservation: provider recognition never triggers retrieval
// effects on its own (test plan item 22) ────────────────────────────────────

describe('Path B preservation: AssetProviderMention alone never affects RetrievalHandoff beyond its own fields', () => {
  test('a provider mention with no goal produces a handoff with the provider recorded, no goal-shaped side effects', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate()]))
    const handoff = buildRetrievalHandoff(updated)
    expect(handoff.asset_providers).toEqual(['getty'])
    expect(handoff.unresolved_asset_provider_mentions).toEqual([])
    // No goal-shaped effect anywhere in the handoff -- confirmed by construction,
    // not merely by convention: RetrievalHandoff has no goals field at all.
    expect(Object.keys(handoff)).not.toContain('user_goals')
  })

  test('an unresolved provider alias renders distinctly in the handoff, never silently dropped or coerced into a canonical id', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used PhotoMega.' },
      constantExtractor([providerCandidate({ raw_text: 'I used PhotoMega.', raw_provider_name: 'PhotoMega' })]),
    )
    const handoff = buildRetrievalHandoff(updated)
    expect(handoff.asset_providers).toEqual([])
    expect(handoff.unresolved_asset_provider_mentions).toEqual(['PhotoMega'])
  })
})

// ── ID-minting collision safety (test plan item 17) ─────────────────────────

describe('AssetProviderMention IDs are turn-qualified and collision-safe across turns', () => {
  test('two different turns both proposing bare proposal_id "c1" never collide', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate({ proposal_id: 'c1', turn: 1 })]))
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I also used Shutterstock.' },
      constantExtractor([providerCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'I also used Shutterstock.', raw_provider_name: 'Shutterstock' })]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(2)
    const ids = active.map((m) => m.mention_id)
    expect(new Set(ids).size).toBe(2)
  })
})

// ── Correction / supersession (test plan item 18) ───────────────────────────

describe('AssetProviderMention correction mirrors ToolMention supersession behavior', () => {
  test('"Sorry, it was actually iStock." (is_correction, correction targets an active Getty mention) supersedes it -- one active mention, not two', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate({ proposal_id: 'c1', turn: 1 })]))
    expect(turn1.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)).toHaveLength(1)

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Sorry, it was actually iStock.' },
      constantExtractor([
        providerCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Sorry, it was actually iStock.',
          raw_provider_name: 'iStock',
          is_correction: true,
          correction_of_raw_text: 'Getty',
        }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'istock' })

    // Prior Getty mention is superseded, not deleted -- full history preserved.
    const supersededGetty = turn2.updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'getty')
    expect(supersededGetty?.superseded_by).not.toBeNull()
  })

  test('a later turn re-mentioning the same already-resolved provider consolidates onto the existing mention rather than creating a duplicate', async () => {
    const turn1 = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate({ proposal_id: 'c1', turn: 1 })]))
    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Yes, the Getty image is in the final cut.' },
      constantExtractor([providerCandidate({ proposal_id: 'c1', turn: 2, raw_text: 'Yes, the Getty image is in the final cut.', raw_provider_name: 'Getty' })]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
  })
})

// ── Final shape sanity check ────────────────────────────────────────────────

describe('AssetProviderMention final shape', () => {
  test('a resolved mention carries mention_id, resolution, confidence, provenance, and null superseded_by', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Getty.' }, constantExtractor([providerCandidate()]))
    const mention: AssetProviderMention = updated.asset_provider_mentions[0]
    expect(mention.mention_id).toMatch(/^t1-/)
    expect(mention.resolution).toEqual({ kind: 'canonical', identifier: 'getty' })
    expect(mention.confidence).toBe('confirmed')
    expect(mention.source_turn).toBe(1)
    expect(mention.source_statement).toBe('I used Getty.')
    expect(mention.superseded_by).toBeNull()
  })

  test('an unresolved mention carries resolution.kind "unresolved_alias" with the raw name preserved verbatim', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used PhotoMega.' },
      constantExtractor([providerCandidate({ raw_text: 'I used PhotoMega.', raw_provider_name: 'PhotoMega' })]),
    )
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'PhotoMega' })
    expect(updated.asset_provider_mentions[0].confidence).toBe('unresolved_no_visibility')
  })

  // Storyblocks reachability (LK-54, 2026-08-30): proves the real,
  // unmodified proposal -> normalization -> attestation -> mutation
  // pipeline (runExtractionPipeline, not just normalizeCandidate in
  // isolation) now produces a canonical Storyblocks mention -- same shape
  // assertions as the Getty "final shape" test above, same mechanism, only
  // the raw_provider_name differs. Confirms an unrelated, still-unregistered
  // name continues to fail closed through the identical real pipeline,
  // proving this addition changed nothing about fail-closed behavior for
  // any other provider.
  test('a resolved Storyblocks mention carries mention_id, resolution.kind="canonical"/identifier="storyblocks", confidence, provenance, and null superseded_by -- via the real extraction pipeline, not dictionary lookup alone', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Storyblocks.' },
      constantExtractor([providerCandidate({ raw_text: 'I used Storyblocks.', raw_provider_name: 'Storyblocks' })]),
    )
    const mention: AssetProviderMention = updated.asset_provider_mentions[0]
    expect(mention.mention_id).toMatch(/^t1-/)
    expect(mention.resolution).toEqual({ kind: 'canonical', identifier: 'storyblocks' })
    expect(mention.confidence).toBe('confirmed')
    expect(mention.source_turn).toBe(1)
    expect(mention.source_statement).toBe('I used Storyblocks.')
    expect(mention.superseded_by).toBeNull()
  })

  test('an unrelated still-unregistered provider name continues to fail closed as unresolved_alias through the same real pipeline, unaffected by the Storyblocks registration', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used PhotoMega.' },
      constantExtractor([providerCandidate({ raw_text: 'I used PhotoMega.', raw_provider_name: 'PhotoMega' })]),
    )
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'PhotoMega' })
    expect(updated.asset_provider_mentions[0].confidence).toBe('unresolved_no_visibility')
  })

  // Pond5 reachability (LK-66, 2026-08-30): same generic mechanism/tests as
  // Storyblocks above, real extraction pipeline, not dictionary lookup alone.
  test('a resolved Pond5 mention carries mention_id, resolution.kind="canonical"/identifier="pond5", confidence, provenance, and null superseded_by -- via the real extraction pipeline, not dictionary lookup alone', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Pond5.' },
      constantExtractor([providerCandidate({ raw_text: 'I used Pond5.', raw_provider_name: 'Pond5' })]),
    )
    const mention: AssetProviderMention = updated.asset_provider_mentions[0]
    expect(mention.mention_id).toMatch(/^t1-/)
    expect(mention.resolution).toEqual({ kind: 'canonical', identifier: 'pond5' })
    expect(mention.confidence).toBe('confirmed')
    expect(mention.source_turn).toBe(1)
    expect(mention.source_statement).toBe('I used Pond5.')
    expect(mention.superseded_by).toBeNull()
  })

  test('an unrelated still-unregistered provider name continues to fail closed as unresolved_alias through the same real pipeline, unaffected by the Pond5 registration', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used PhotoMega.' },
      constantExtractor([providerCandidate({ raw_text: 'I used PhotoMega.', raw_provider_name: 'PhotoMega' })]),
    )
    expect(updated.asset_provider_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'PhotoMega' })
    expect(updated.asset_provider_mentions[0].confidence).toBe('unresolved_no_visibility')
  })
})

// ── LK-78B: generic compound provider identity extraction remediation
// (2026-09-01 -- Trial 4 Production Reachability Boundary Diagnostic
// remediation). Two confirmed production failure mechanisms for compound
// provider/product expressions ("Adobe Stock / AI Studio", "Adobe Stock AI
// Studio"): (1) confidence-gate deferral even when the raw name corroborates
// exactly one known provider, (2) tool_mention/asset_provider_mention kind
// misclassification when the model reads a compound expression as a tool
// name because of generation-verb framing ("...to generate"). Both fixes
// are generic (findCorroboratingAssetProvider consults only
// KNOWN_ASSET_PROVIDERS, has no provider-specific branch) -- Adobe Stock is
// the reproduction fixture, not special-cased logic. Cross-provider
// controls below (Getty/iStock/Shutterstock/Storyblocks/Pond5) prove this
// directly. ─────────────────────────────────────────────────────────────

describe('LK-78B: findCorroboratingAssetProvider (unit)', () => {
  test('resolves a known provider inside a slash-compound expression, whitespace-bounded', () => {
    expect(findCorroboratingAssetProvider('Adobe Stock / AI Studio')).toBe('adobe-stock')
  })

  test('resolves a known provider inside a space-run compound expression (generation-verb framing observed live)', () => {
    expect(findCorroboratingAssetProvider('Adobe Stock AI Studio')).toBe('adobe-stock')
  })

  test('cross-provider: same mechanism resolves Getty, iStock, Shutterstock, Storyblocks, and Pond5 inside analogous compound expressions -- no Adobe-specific branch', () => {
    expect(findCorroboratingAssetProvider('Getty Creative Suite')).toBe('getty')
    expect(findCorroboratingAssetProvider('iStock Content Suite')).toBe('istock')
    expect(findCorroboratingAssetProvider('Shutterstock Creative Flow')).toBe('shutterstock')
    expect(findCorroboratingAssetProvider('Storyblocks / Premium Library')).toBe('storyblocks')
    expect(findCorroboratingAssetProvider('Pond5 Motion Library')).toBe('pond5')
  })

  test('a genuine tool name with no known provider substring never corroborates (Adobe Firefly, Kling)', () => {
    expect(findCorroboratingAssetProvider('Adobe Firefly')).toBeUndefined()
    expect(findCorroboratingAssetProvider('Kling')).toBeUndefined()
  })

  test('fail-closed: a compound naming two or more known providers never guesses -- "Getty or iStock" and a non-Adobe two-provider compound both stay unresolved', () => {
    expect(findCorroboratingAssetProvider('Getty or iStock')).toBeUndefined()
    expect(findCorroboratingAssetProvider('Getty or Shutterstock Suite')).toBeUndefined()
  })

  test('domain-suffix concatenation (no genuine word/phrase separation) does not corroborate -- preserves the existing evidence-only, no-speculative-variants discipline', () => {
    expect(findCorroboratingAssetProvider('storyblocks.com')).toBeUndefined()
    expect(findCorroboratingAssetProvider('pond5.com')).toBeUndefined()
  })
})

describe('LK-78B: confidence-gate corroboration bypass (attestation)', () => {
  // P1 -- exact LK-77/78A turn 1 reproduction: a low_confidence
  // asset_provider_mention whose raw name is the slash-compound expression.
  // Before this fix: deferred (CANDIDATE_TOO_LOW_CONFIDENCE), reachable in
  // no diagnostic, no ProposedFact. After: accepted, resolved to
  // 'adobe-stock', despite the extractor's own low_confidence hint --
  // because normalization already independently corroborated exactly one
  // canonical identity.
  test('P1: "Adobe Stock / AI Studio content" (low_confidence asset_provider_mention) is accepted and resolves to adobe-stock, not deferred', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Adobe Stock / AI Studio content' },
      constantExtractor([
        providerCandidate({
          raw_text: 'Adobe Stock / AI Studio content',
          raw_provider_name: 'Adobe Stock / AI Studio',
          low_confidence: true,
        }),
      ]),
    )
    expect(diagnostics[0].decision.outcome).toBe('accepted')
    const active = updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })
  })

  test('a low_confidence asset_provider_mention that does NOT corroborate any known provider still defers exactly as before (bypass is scoped, not a global confidence weakening)', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I got it from PhotoMega, or maybe a different site.' },
      constantExtractor([providerCandidate({ raw_provider_name: 'PhotoMega or a different site', low_confidence: true })]),
    )
    expect(diagnostics[0].decision.outcome).toBe('deferred')
    expect(updated.asset_provider_mentions).toHaveLength(0)
  })

  test('a low_confidence non-provider candidate kind (project_fact) is entirely unaffected by the bypass, which is scoped to asset_provider_mention only', async () => {
    const { diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'something uncertain' },
      constantExtractor([
        {
          proposal_id: 'c1',
          turn: 1,
          raw_text: 'something uncertain',
          kind: 'project_fact',
          raw_fact_field: 'intended_use',
          fact_confidence_hint: 'confirmed',
          fact_value_hint: 'something uncertain',
          low_confidence: true,
        } as CandidateObservation,
      ]),
    )
    expect(diagnostics[0].decision.outcome).toBe('deferred')
  })

  test('the pre-existing genuinely-ambiguous case ("Getty or iStock, I don\'t remember which") still defers -- normalization\'s exactly-one-match discipline means the bypass never fires for it', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I got it from Getty or iStock, I don't remember which." },
      constantExtractor([providerCandidate({ raw_provider_name: 'Getty or iStock', low_confidence: true })]),
    )
    expect(updated.asset_provider_mentions).toHaveLength(0)
    expect(diagnostics[0].decision.outcome).toBe('deferred')
  })
})

describe('LK-78B: tool/provider coexistence -- a tool_mention candidate whose raw name corroborates a provider derives a separate AssetProviderMention', () => {
  // P2 -- exact LK-77/78A turn 2 reproduction: the model classified this as
  // a tool_mention (generation-verb framing: "...to generate the content").
  // Before this fix: ToolMention(unresolved_alias "Adobe Stock AI Studio"),
  // zero AssetProviderMentions, claim unreachable. After: the original
  // ToolMention is untouched (still unresolved_alias -- "Adobe Stock AI
  // Studio" is not a registered tool), AND a derived, resolved
  // AssetProviderMention(adobe-stock) is created alongside it.
  test('P2: "I used Adobe Stock AI Studio to generate the content." (tool_mention) derives an adobe-stock AssetProviderMention without altering the original ToolMention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Adobe Stock AI Studio to generate the content.' },
      constantExtractor([
        toolCandidate({
          raw_text: 'I used Adobe Stock AI Studio to generate the content.',
          raw_tool_name: 'Adobe Stock AI Studio',
        }),
      ]),
    )
    expect(updated.tool_mentions).toHaveLength(1)
    expect(updated.tool_mentions[0].resolution).toEqual({ kind: 'unresolved_alias', raw_name: 'Adobe Stock AI Studio' })
    const activeProviders = updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(activeProviders).toHaveLength(1)
    expect(activeProviders[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })
  })

  test('cross-provider: the same coexistence mechanism derives Getty from a tool-framed compound mention -- no Adobe-specific branch', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Getty Creative Suite to edit the images.' },
      constantExtractor([toolCandidate({ raw_text: 'I used Getty Creative Suite to edit the images.', raw_tool_name: 'Getty Creative Suite' })]),
    )
    const activeProviders = updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(activeProviders).toHaveLength(1)
    expect(activeProviders[0].resolution).toEqual({ kind: 'canonical', identifier: 'getty' })
  })

  test('negative control: "I generated the images using Adobe Firefly." derives no AssetProviderMention -- Adobe Firefly names no known provider', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I generated the images using Adobe Firefly.' },
      constantExtractor([toolCandidate({ raw_text: 'I generated the images using Adobe Firefly.', raw_tool_name: 'Adobe Firefly' })]),
    )
    expect(updated.asset_provider_mentions).toHaveLength(0)
    expect(updated.tool_mentions).toHaveLength(1)
  })

  test('negative control: an ordinary non-Adobe tool ("Kling") derives no AssetProviderMention -- unaffected by the coexistence mechanism', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: 'I used Kling.' }, constantExtractor([toolCandidate()]))
    expect(updated.asset_provider_mentions).toHaveLength(0)
    expect(updated.tool_mentions).toHaveLength(1)
  })

  test('negative control: a generic ambiguous tool-framed compound naming two known providers derives no AssetProviderMention -- fail-closed, never guessed', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "I uploaded content via Getty or Shutterstock's plugin, not sure which." },
      constantExtractor([
        toolCandidate({
          raw_text: "I uploaded content via Getty or Shutterstock's plugin, not sure which.",
          raw_tool_name: 'Getty or Shutterstock plugin',
        }),
      ]),
    )
    expect(updated.asset_provider_mentions).toHaveLength(0)
  })

  test('a tool_mention corroborating a provider that already has an active mention does not create a duplicate', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Adobe Stock.' },
      constantExtractor([providerCandidate({ raw_text: 'I used Adobe Stock.', raw_provider_name: 'Adobe Stock' })]),
    )
    expect(turn1.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)).toHaveLength(1)

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'I used Adobe Stock AI Studio to generate the content.' },
      constantExtractor([
        toolCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'I used Adobe Stock AI Studio to generate the content.',
          raw_tool_name: 'Adobe Stock AI Studio',
        }),
      ]),
    )
    const activeProviders = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(activeProviders).toHaveLength(1)
    expect(activeProviders[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })
  })

  test('provider+tool coexistence in the same turn: a genuine tool (Kling) and a derivable provider (Adobe Stock AI Studio) both resolve distinctly, no interference', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Kling to animate footage sourced from Adobe Stock AI Studio, which I also used to generate some elements.' },
      constantExtractor([
        toolCandidate({ proposal_id: 'c1', raw_text: 'I used Kling to animate footage', raw_tool_name: 'Kling' }),
        toolCandidate({
          proposal_id: 'c2',
          raw_text: 'Adobe Stock AI Studio, which I also used to generate some elements',
          raw_tool_name: 'Adobe Stock AI Studio',
        }),
      ]),
    )
    expect(updated.tool_mentions).toHaveLength(2)
    expect(updated.tool_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'kling')).toBeTruthy()
    const activeProviders = updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(activeProviders).toHaveLength(1)
    expect(activeProviders[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })
  })
})

describe('LK-78B: correction semantics apply identically to a derived AssetProviderMention', () => {
  test('a derived adobe-stock mention (from a tool-framed compound) is superseded by a later explicit correction, exactly like a directly-stated mention', async () => {
    const turn1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'I used Adobe Stock AI Studio to generate the content.' },
      constantExtractor([toolCandidate({ raw_text: 'I used Adobe Stock AI Studio to generate the content.', raw_tool_name: 'Adobe Stock AI Studio' })]),
    )
    const activeAfter1 = turn1.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(activeAfter1).toHaveLength(1)
    expect(activeAfter1[0].resolution).toEqual({ kind: 'canonical', identifier: 'adobe-stock' })

    const turn2 = await runExtractionPipeline(
      turn1.updated,
      { turn: 2, text: 'Sorry, it was actually iStock, not Adobe Stock.' },
      constantExtractor([
        providerCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Sorry, it was actually iStock, not Adobe Stock.',
          raw_provider_name: 'iStock',
          is_correction: true,
          correction_of_raw_text: 'Adobe Stock',
        }),
      ]),
    )
    const active = turn2.updated.asset_provider_mentions.filter((m) => m.superseded_by === null)
    expect(active).toHaveLength(1)
    expect(active[0].resolution).toEqual({ kind: 'canonical', identifier: 'istock' })
    const supersededAdobe = turn2.updated.asset_provider_mentions.find((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === 'adobe-stock')
    expect(supersededAdobe?.superseded_by).not.toBeNull()
  })
})
