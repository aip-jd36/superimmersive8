/**
 * Content-Presence Mention Model tests (CRC Content-Presence Mention Model —
 * Generic Implementation, 2026-08-28).
 *
 * Covers the Test Matrix required by the implementation task's own §27:
 * mutation invariants (mutations.ts), and end-to-end extraction (explicit
 * presence/absence, real/synthetic self-report, singular correction,
 * aggregate/plural correction safety, fail-closed ambiguous correction,
 * provenance, no fabricated UserGoal/Track A -- extraction.ts). Mirrors
 * assessment-jurisdiction-mentions.test.ts's own established pattern: mock
 * extractor, runExtractionPipeline exercised end-to-end for the
 * pipeline-level cases -- proves the proposal -> normalization ->
 * attestation -> mutation pipeline, not natural-language extraction
 * accuracy (a live-model eval concern, out of scope here, same split as
 * every other candidate kind in this codebase).
 *
 * Run: npx jest __tests__/interview-engine/content-presence-mentions.test.ts
 */

import type { ContentPresenceMention, StructuredUnderstanding } from '../../types/interview-engine'
import type { CandidateObservation } from '../../lib/interview-engine/extraction'
import { runExtractionPipeline } from '../../lib/interview-engine/extraction'
import { addContentPresenceMention, supersedeContentPresenceMention } from '../../lib/interview-engine/mutations'
import { constantExtractor } from '../../lib/interview-engine/mock-extractor'

function emptySU(overrides: Partial<StructuredUnderstanding> = {}): StructuredUnderstanding {
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
    ...overrides,
  }
}

function mention(
  overrides: Partial<ContentPresenceMention> & Pick<ContentPresenceMention, 'mention_id' | 'category'>,
): ContentPresenceMention {
  return {
    real_or_synthetic: null,
    confidence: 'confirmed',
    source_turn: 1,
    source_statement: 'placeholder',
    superseded_by: null,
    ...overrides,
  }
}

function presenceCandidate(overrides: Partial<CandidateObservation> = {}): CandidateObservation {
  return {
    proposal_id: 'c1',
    turn: 1,
    raw_text: 'A real person appears in the video.',
    kind: 'content_presence_mention',
    raw_content_presence_category: 'person_visual_presence',
    ...overrides,
  }
}

function active(su: StructuredUnderstanding): ContentPresenceMention[] {
  return su.content_presence_mentions.filter((m) => m.superseded_by === null)
}

// ── mutations.ts invariants ─────────────────────────────────────────────

describe('addContentPresenceMention / supersedeContentPresenceMention -- mirrors addAssessmentJurisdictionMention exactly', () => {
  test('add: a duplicate mention_id is rejected', () => {
    let su = emptySU()
    su = addContentPresenceMention(su, mention({ mention_id: 'm-1', category: 'person_visual_presence' }))
    expect(() => addContentPresenceMention(su, mention({ mention_id: 'm-1', category: 'person_voice_presence' }))).toThrow(/already exists/)
  })

  test('add: a newly added mention cannot already be superseded', () => {
    const su = emptySU()
    expect(() =>
      addContentPresenceMention(su, mention({ mention_id: 'm-1', category: 'person_visual_presence', superseded_by: 'm-2' })),
    ).toThrow(/cannot already be superseded/)
  })

  test('supersede: target must exist', () => {
    const su = emptySU()
    expect(() =>
      supersedeContentPresenceMention(su, 'does-not-exist', mention({ mention_id: 'm-2', category: 'person_visual_presence' })),
    ).toThrow(/unknown content presence mention/)
  })

  test('supersede: target must be the current, non-superseded head of its chain -- cannot re-target a historical snapshot', () => {
    let su = emptySU()
    su = addContentPresenceMention(su, mention({ mention_id: 'm-1', category: 'person_visual_presence' }))
    su = supersedeContentPresenceMention(su, 'm-1', mention({ mention_id: 'm-2', category: 'person_visual_presence', real_or_synthetic: 'synthetic' }))
    expect(() =>
      supersedeContentPresenceMention(su, 'm-1', mention({ mention_id: 'm-3', category: 'person_visual_presence' })),
    ).toThrow(/already superseded/)
  })

  test('add: no cap -- distinct category/classification combinations coexist (visual real + voice synthetic)', () => {
    let su = emptySU()
    su = addContentPresenceMention(su, mention({ mention_id: 'm-1', category: 'person_visual_presence', real_or_synthetic: 'real' }))
    su = addContentPresenceMention(su, mention({ mention_id: 'm-2', category: 'person_voice_presence', real_or_synthetic: 'synthetic' }))
    expect(active(su)).toHaveLength(2)
  })
})

// ── content_presence_mention extraction -- end-to-end pipeline ──────────

describe('content_presence_mention extraction -- end-to-end pipeline', () => {
  // 1. explicit visual presence
  test('1: explicit visual presence -- "A real person appears in the video." creates a confirmed person_visual_presence mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A real person appears in the video.' },
      constantExtractor([presenceCandidate({ raw_text: 'A real person appears in the video.' })]),
    )
    expect(active(updated)).toEqual([
      { mention_id: 't1-c1', category: 'person_visual_presence', real_or_synthetic: null, confidence: 'confirmed', source_turn: 1, source_statement: 'A real person appears in the video.', superseded_by: null },
    ])
  })

  // 2. explicit voice presence
  test('2: explicit voice presence -- "The video has a synthetic person\'s voice." creates a confirmed person_voice_presence mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "The video has a synthetic person's voice." },
      constantExtractor([
        presenceCandidate({
          raw_text: "The video has a synthetic person's voice.",
          raw_content_presence_category: 'person_voice_presence',
        }),
      ]),
    )
    const activeMentions = active(updated)
    expect(activeMentions).toHaveLength(1)
    expect(activeMentions[0].category).toBe('person_voice_presence')
  })

  // 3. explicit unqualified absence
  test('3: explicit unqualified absence -- "No person\'s image appears." denies presence of any kind, no real_or_synthetic set', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "No person's image appears." },
      constantExtractor([
        presenceCandidate({ raw_text: "No person's image appears.", is_content_presence_absent: true }),
      ]),
    )
    expect(updated.content_presence_mentions).toEqual([
      { mention_id: 't1-c1', category: 'person_visual_presence', real_or_synthetic: null, confidence: 'confirmed_absent', source_turn: 1, source_statement: "No person's image appears.", superseded_by: null },
    ])
  })

  // 4. explicit real-qualified absence
  test('4: explicit real-qualified absence -- "No REAL person\'s image appears." denies only real presence, leaving synthetic presence unaddressed', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "No real person's image appears." },
      constantExtractor([
        presenceCandidate({
          raw_text: "No real person's image appears.",
          is_content_presence_absent: true,
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'real',
        }),
      ]),
    )
    expect(updated.content_presence_mentions).toEqual([
      { mention_id: 't1-c1', category: 'person_visual_presence', real_or_synthetic: 'real', confidence: 'confirmed_absent', source_turn: 1, source_statement: "No real person's image appears.", superseded_by: null },
    ])
    // Must NOT mean "no visual person content of any kind" -- a later,
    // independent synthetic-visual statement is fully expressible alongside
    // this qualified denial.
    const t2 = await runExtractionPipeline(
      updated,
      { turn: 2, text: 'Actually, a synthetic person does appear visually.' },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually, a synthetic person does appear visually.',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
        }),
      ]),
    )
    const activeAfter = active(t2.updated)
    expect(activeAfter).toHaveLength(2)
    expect(activeAfter.map((m) => m.real_or_synthetic).sort()).toEqual(['real', 'synthetic'])
  })

  // 5. silence creates no mention
  test('5: silence -- a turn with no content-presence candidate produces no mention', async () => {
    const { updated } = await runExtractionPipeline(emptySU(), { turn: 1, text: "I'm using Kling for a client ad." }, constantExtractor([]))
    expect(updated.content_presence_mentions).toEqual([])
  })

  // 6. real self-report
  test('6: real self-report -- attribute confidence "confirmed" + value "real" is stored on the mention', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A real person appears.' },
      constantExtractor([presenceCandidate({ real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    expect(active(updated)[0].real_or_synthetic).toBe('real')
  })

  // 7. synthetic self-report
  test('7: synthetic self-report -- "It\'s fully synthetic." stores real_or_synthetic: synthetic', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "It's fully synthetic." },
      constantExtractor([presenceCandidate({ raw_text: "It's fully synthetic.", real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'synthetic' })]),
    )
    expect(active(updated)[0].real_or_synthetic).toBe('synthetic')
  })

  // 8. ambiguous/unstated classification
  test('8: ambiguous/unstated -- "A person appears." (no real/synthetic hint) leaves real_or_synthetic null, never a guessed value', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A person appears.' },
      constantExtractor([presenceCandidate({ raw_text: 'A person appears.' })]),
    )
    expect(active(updated)[0].real_or_synthetic).toBeNull()
  })

  // 9. "resembles a celebrity" does not infer real
  test('9: "It resembles a celebrity." -- even if a candidate is proposed, real_or_synthetic must never be inferred as "real" from resemblance alone', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'It resembles a celebrity.' },
      // Mirrors correct extractor behavior per SYSTEM_PROMPT: no real_or_synthetic hint set for a mere resemblance statement.
      constantExtractor([presenceCandidate({ raw_text: 'It resembles a celebrity.' })]),
    )
    expect(active(updated)[0].real_or_synthetic).toBeNull()
  })

  // 10. visual and voice coexist independently
  test('10: visual and voice coexist independently -- "A recognizable person appears visually and their cloned voice is also used."', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A recognizable person appears visually and their cloned voice is also used.' },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          raw_text: 'A recognizable person appears visually',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'real',
        }),
        presenceCandidate({
          proposal_id: 'c2',
          raw_text: 'their cloned voice is also used',
          raw_content_presence_category: 'person_voice_presence',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
        }),
      ]),
    )
    const activeMentions = active(t1.updated)
    expect(activeMentions).toHaveLength(2)
    const visual = activeMentions.find((m) => m.category === 'person_visual_presence')
    const voice = activeMentions.find((m) => m.category === 'person_voice_presence')
    expect(visual?.real_or_synthetic).toBe('real')
    expect(voice?.real_or_synthetic).toBe('synthetic')
  })

  // 11. singular real -> synthetic correction
  test('11: singular correction -- "A real person appears." -> "Actually it\'s fully synthetic." supersedes cleanly (1:1)', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A real person appears.' },
      constantExtractor([presenceCandidate({ real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: "Actually it's fully synthetic." },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: "Actually it's fully synthetic.",
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
          is_correction: true,
          correction_of_raw_text: 'the real person',
        }),
      ]),
    )
    expect(t2.updated.content_presence_mentions).toHaveLength(2)
    const activeMentions = active(t2.updated)
    expect(activeMentions).toEqual([
      { mention_id: 't2-c1', category: 'person_visual_presence', real_or_synthetic: 'synthetic', confidence: 'confirmed', source_turn: 2, source_statement: "Actually it's fully synthetic.", superseded_by: null },
    ])
    const superseded = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't1-c1')
    expect(superseded?.superseded_by).toBe('t2-c1')
  })

  // 12. unqualified -> synthetic singular correction
  test('12: unqualified -> synthetic singular correction -- "A person appears." -> "Actually that\'s a fully synthetic character." supersedes the one active compatible target', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A person appears.' },
      constantExtractor([presenceCandidate({ raw_text: 'A person appears.' })]),
    )
    expect(active(t1.updated)[0].real_or_synthetic).toBeNull()

    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: "Actually that's a fully synthetic character." },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: "Actually that's a fully synthetic character.",
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
          is_correction: true,
          correction_of_raw_text: 'a person',
        }),
      ]),
    )
    const activeMentions = active(t2.updated)
    expect(activeMentions).toHaveLength(1)
    expect(activeMentions[0].real_or_synthetic).toBe('synthetic')
    expect(activeMentions[0].mention_id).toBe('t2-c1')
  })

  // 13. recognizability-only correction does not fabricate state
  test('13: recognizability-only follow-up -- "Actually I don\'t know whether they\'re identifiable." is not a content_presence_mention candidate at all; no mutation occurs', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A recognizable person appears.' },
      constantExtractor([presenceCandidate({ raw_text: 'A recognizable person appears.' })]),
    )
    // No content_presence_mention candidate proposed for the follow-up --
    // recognizability has no structured representation to correct.
    const t2 = await runExtractionPipeline(t1.updated, { turn: 2, text: "Actually I don't know whether they're identifiable." }, constantExtractor([]))
    expect(t2.updated.content_presence_mentions).toEqual(t1.updated.content_presence_mentions)
    expect(active(t2.updated)).toHaveLength(1)
    expect(active(t2.updated)[0].mention_id).toBe('t1-c1')
  })

  // 14. aggregate/plural correction does NOT decompose or supersede non-deterministically
  test('14: aggregate/plural correction safety -- "Two real people appear." -> "Actually one is synthetic." (model incorrectly flags is_correction) does NOT supersede the original real mention', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Two real people appear.' },
      constantExtractor([presenceCandidate({ raw_text: 'Two real people appear.', real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    expect(active(t1.updated)).toHaveLength(1)
    const originalRealMentionId = active(t1.updated)[0].mention_id

    // Simulates the model INCORRECTLY setting is_correction: true for a
    // partitive/aggregate referent ("one of them") -- per this task's own
    // explicit requirement, code-side resolution must remain safe even when
    // the model gets this wrong.
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually one of them is synthetic.' },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually one of them is synthetic.',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
          is_correction: true,
          correction_of_raw_text: 'one of them',
        }),
      ]),
    )

    // The original real-presence mention is preserved, untouched, still active.
    const originalMention = t2.updated.content_presence_mentions.find((m) => m.mention_id === originalRealMentionId)
    expect(originalMention?.superseded_by).toBeNull()
    expect(originalMention?.real_or_synthetic).toBe('real')

    // The newly stated synthetic fact is recorded as a FRESH, uncorrelated
    // addition, never a fabricated decomposition (no count, no invented
    // "real: 1, synthetic: 1" split).
    const activeMentions = active(t2.updated)
    expect(activeMentions).toHaveLength(2)
    expect(activeMentions.map((m) => m.real_or_synthetic).sort()).toEqual(['real', 'synthetic'])
  })

  // 15. zero-match correction fails closed
  test('15: zero-match correction fails closed -- a correction with no matching active category still creates a genuine new mention, never guesses', async () => {
    const { updated, diagnostics } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Actually the voice is synthetic.' },
      constantExtractor([
        presenceCandidate({
          raw_content_presence_category: 'person_voice_presence',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
          is_correction: true,
          correction_of_raw_text: 'the voice',
        }),
      ]),
    )
    // No prior person_voice_presence mention existed to match -- fails
    // closed (no supersession), but the candidate itself still creates a
    // genuine NEW mention (fail-closed means "do not guess a target," not
    // "reject the whole candidate").
    expect(active(updated)).toHaveLength(1)
    expect(active(updated)[0].category).toBe('person_voice_presence')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].decision.outcome).not.toBe('rejected')
  })

  // 16. multiple-match correction fails closed
  test('16: multiple-match correction fails closed -- two active mentions of the same category are never guessed between', async () => {
    // An artificial but valid same-category-twice state (two independent
    // add candidates in one turn, never deduplicated by category -- mirrors
    // the assessment-jurisdiction precedent's own "Test Territory" test).
    let su = emptySU()
    su = addContentPresenceMention(su, mention({ mention_id: 'm-1', category: 'person_visual_presence', real_or_synthetic: 'real', source_turn: 1, source_statement: 'a' }))
    su = addContentPresenceMention(su, mention({ mention_id: 'm-2', category: 'person_visual_presence', real_or_synthetic: null, source_turn: 1, source_statement: 'b' }))

    const { updated } = await runExtractionPipeline(
      su,
      { turn: 2, text: 'Actually the person is synthetic.' },
      constantExtractor([
        presenceCandidate({
          turn: 2,
          raw_text: 'Actually the person is synthetic.',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
          is_correction: true,
          correction_of_raw_text: 'the person',
        }),
      ]),
    )
    // Both original mentions remain active (untouched) -- the ambiguous
    // correction created a new mention instead of guessing which one.
    const activeMentions = active(updated)
    expect(activeMentions.filter((m) => m.mention_id === 'm-1' || m.mention_id === 'm-2')).toHaveLength(2)
    expect(activeMentions.some((m) => m.real_or_synthetic === 'synthetic' && m.mention_id !== 'm-1' && m.mention_id !== 'm-2')).toBe(true)
  })

  // 17. source_statement preserved verbatim
  test('17: source_statement is preserved verbatim -- never rewritten, never paraphrased', async () => {
    const rawText = 'uhh yeah so like theres def a real person in it, my sister actually'
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: rawText },
      constantExtractor([presenceCandidate({ raw_text: rawText, real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    expect(active(updated)[0].source_statement).toBe(rawText)
  })

  // 18. short contextual answer preserves literal "Yes."
  test('18: a bare contextual "Yes." answer preserves the literal source_statement, never rewritten to a fabricated fuller statement', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 2, text: 'Yes.', answering_content_presence_question: true },
      constantExtractor([presenceCandidate({ raw_text: 'Yes.', turn: 2 })]),
    )
    expect(active(updated)[0].source_statement).toBe('Yes.')
  })

  // 19. unrelated provider/tool/location statement creates no content presence
  test('19: unrelated statements (provider, tool, location, client identity) never create content presence when no content_presence_mention candidate is proposed', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'We used Getty. We filmed in New York. The client is an actor. We\'re using ElevenLabs.' },
      // Mirrors correct extractor behavior: no content_presence_mention
      // candidate proposed for any of these (they describe sources/tools/
      // production facts, never the output itself).
      constantExtractor([]),
    )
    expect(updated.content_presence_mentions).toEqual([])
  })

  // 20. no UserGoal fabricated
  test('20: no UserGoal is fabricated by a content-presence candidate', async () => {
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A real person appears.' },
      constantExtractor([presenceCandidate({ real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    expect(updated.user_goals).toEqual([])
  })
})

// ── Track A / Track C regression ─────────────────────────────────────────

describe('content presence does not participate in Track A discovered relevance (2026-08-28 -- no evidenced trigger exists)', () => {
  // 21. no Track A discovered relevance created
  test('21: deriveDiscoveredTopicOccurrences produces nothing from a content_presence_mentions-only session -- no source kind exists for it', async () => {
    const { deriveDiscoveredTopicOccurrences } = await import('../../lib/crc-engine/discovered-relevance')
    const { updated } = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A real person appears.' },
      constantExtractor([presenceCandidate({ real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    expect(active(updated)).toHaveLength(1)
    const occurrences = deriveDiscoveredTopicOccurrences(updated, [])
    expect(occurrences).toEqual([])
  })
})
