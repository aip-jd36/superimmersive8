/**
 * Content-Presence Mention Model tests (CRC Content-Presence Mention Model —
 * Generic Implementation, 2026-08-28; corrected by Content-Presence
 * Correction Safety — Append-Only Closure/Implementation, 2026-08-28).
 *
 * INTENTIONAL BEHAVIOR CHANGE, disclosed here rather than silently: the
 * original implementation (commit e86bc5d) allowed free-form extraction to
 * automatically supersede an existing ContentPresenceMention in two
 * circumstances -- a singular real<->synthetic reclassification, and (per
 * an aggregate-marker regex) most other same-category corrections. An
 * independent integration review proved the aggregate-marker regex was not
 * a real safety boundary (8/8 adversarial phrasings bypassed it), and a
 * follow-up architecture closure went further: this mention type carries no
 * count, individual identity, or project/temporal scope, so NO free-form
 * correction statement -- not even an apparently-singular one, not even a
 * pure polarity flip like "present" -> "absent" -- can ever be proven to
 * target one specific prior proposition rather than describe a different,
 * additional, or later-scoped fact. Every content_presence_mention produced
 * from ordinary conversation is therefore now an unconditional ADDITION
 * (`addContentPresenceMention`); `is_correction`/`correction_of_raw_text`
 * are read by other candidate kinds but are structurally ignored for this
 * one. `supersedeContentPresenceMention` remains exported from mutations.ts,
 * reachable only by tests and a possible future SYSTEM-controlled
 * correction mechanism (never free-form extraction) -- see its own
 * mutation-invariant tests below, still valid and unchanged.
 *
 * Covers the original Test Matrix (mutation invariants, explicit
 * presence/absence, real/synthetic self-report, provenance, no fabricated
 * UserGoal/Track A) PLUS the append-only regression corpus required by the
 * Append-Only Implementation task: all 8 previously-failing adversarial
 * aggregate scenarios, genuine singular reclassification, both polarity-flip
 * directions, a temporal/scope example, and recognizability-only including a
 * simulated model error. Mirrors assessment-jurisdiction-mentions.test.ts's
 * own established pattern: mock extractor, runExtractionPipeline exercised
 * end-to-end -- proves the pipeline, not natural-language extraction
 * accuracy (a live-model eval concern, out of scope here).
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

  // 11. INTENTIONAL BEHAVIOR CHANGE (was: singular real -> synthetic
  // correction, supersession). A genuinely singular-looking real->synthetic
  // reclassification is now append-only, same as every other case -- this
  // representation cannot distinguish "genuinely singular" from "aggregate
  // collapsed to one mention" or "a different, later scope" from the
  // candidate's own structured fields, so it is never treated as safer than
  // any other same-category reclassification. `is_correction: true` and
  // `correction_of_raw_text` are present on the candidate exactly as before
  // and are structurally ignored.
  test('11: "A real person appears." -> "Actually it\'s fully synthetic." is append-only -- old mention remains active, new one is added, zero supersession', async () => {
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
    expect(activeMentions.map((m) => m.real_or_synthetic).sort()).toEqual(['real', 'synthetic'])
    const original = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't1-c1')
    expect(original?.superseded_by).toBeNull()
    expect(original?.real_or_synthetic).toBe('real')
    const added = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't2-c1')
    expect(added?.superseded_by).toBeNull()
    expect(added?.real_or_synthetic).toBe('synthetic')
  })

  // 12. INTENTIONAL BEHAVIOR CHANGE (was: unqualified -> synthetic singular
  // correction, supersession). Same reasoning as #11 -- an unqualified prior
  // statement's own cardinality is just as unknown as a qualified one, so it
  // gets no special treatment either.
  test('12: "A person appears." -> "Actually that\'s a fully synthetic character." is append-only -- both mentions remain active', async () => {
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
    expect(activeMentions).toHaveLength(2)
    expect(activeMentions.find((m) => m.mention_id === 't1-c1')?.real_or_synthetic).toBeNull()
    expect(activeMentions.find((m) => m.mention_id === 't2-c1')?.real_or_synthetic).toBe('synthetic')
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

  // 13b. recognizability-only correction, MODEL ERROR simulation (Append-Only
  // Closure §14/§N). Even if the model incorrectly proposes a candidate for
  // this scenario (misreading "identifiable" as bearing on classification)
  // and incorrectly flags is_correction, the append-only architecture makes
  // deletion structurally impossible -- not merely unlikely -- because
  // is_correction is never inspected for this candidate kind at all.
  test('13b: recognizability-only follow-up, simulated model error (is_correction incorrectly set true) -- old presence mention still cannot be deleted, worst case is a harmless addition', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A recognizable person appears.' },
      constantExtractor([presenceCandidate({ raw_text: 'A recognizable person appears.' })]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: "Actually I don't know whether they're identifiable." },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: "Actually I don't know whether they're identifiable.",
          is_correction: true,
          correction_of_raw_text: 'a recognizable person',
        }),
      ]),
    )
    const original = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't1-c1')
    expect(original?.superseded_by).toBeNull()
    expect(active(t2.updated)).toHaveLength(2) // worst case: a harmless extra mention, never a deletion
  })

  // 14. aggregate/plural correction does NOT decompose or supersede
  // non-deterministically. Historically (commit e86bc5d) this safety was
  // provided by a phrase-list guard on correction_of_raw_text -- proven
  // unsafe by independent integration review (8/8 adversarial phrasings
  // bypassed it) and removed entirely (Append-Only Closure, 2026-08-28).
  // Safety now comes from there being no resolver at all: is_correction and
  // correction_of_raw_text are read here (this candidate still has them set)
  // but are never inspected by the pipeline for this candidate kind, so the
  // outcome below no longer depends on the specific wording of
  // correction_of_raw_text -- see the 8-scenario permanent regression block
  // below, which proves this directly against wording that has no marker
  // word at all.
  test('14: aggregate/plural correction safety -- "Two real people appear." -> "Actually one is synthetic." (model incorrectly flags is_correction) does NOT supersede the original real mention', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'Two real people appear.' },
      constantExtractor([presenceCandidate({ raw_text: 'Two real people appear.', real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    expect(active(t1.updated)).toHaveLength(1)
    const originalRealMentionId = active(t1.updated)[0].mention_id

    // Simulates the model INCORRECTLY setting is_correction: true for a
    // partitive/aggregate referent ("one of them") -- harmless now
    // regardless, since is_correction is never inspected for this kind.
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

  // 15. INTENTIONAL RENAME (was: "zero-match correction fails closed"). No
  // resolver exists at all for this candidate kind, so there is no "match"
  // being attempted in the first place -- a candidate flagged is_correction
  // with no plausible target is handled identically to one with a
  // plausible target (#16) or no correction fields at all: always a plain
  // addition.
  test('15: a correction-flagged candidate with no matching active category still creates a genuine new mention (no resolver ever runs)', async () => {
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
    expect(active(updated)).toHaveLength(1)
    expect(active(updated)[0].category).toBe('person_voice_presence')
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].decision.outcome).not.toBe('rejected')
  })

  // 16. INTENTIONAL RENAME (was: "multiple-match correction fails closed").
  // Same point as #15, now with two pre-existing active mentions of the same
  // category present -- proves no target selection is ever attempted among
  // them, regardless of how many candidates exist to choose from.
  test('16: two pre-existing active mentions of the same category are both left untouched by a correction-flagged candidate -- no target selection occurs', async () => {
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

// ── Append-Only Regression Corpus (Content-Presence Correction Safety —
// Append-Only Implementation, 2026-08-28) ──────────────────────────────────
//
// Permanent regression coverage for the 8 adversarial scenarios that proved
// the original phrase-list mechanism unsafe (Integration Review), plus the
// polarity-conflict and temporal-scope cases identified during the follow-up
// architecture closure. Every case here asserts the SAME outcome shape:
// the prior mention remains active and untouched, the new statement is
// added as an independent mention, and the result does not depend in any
// way on the specific wording of correction_of_raw_text -- because it is
// never read for this candidate kind at all.

describe('append-only regression corpus -- 8 adversarial aggregate scenarios (Integration Review, all previously unsafe)', () => {
  const scenarios: Array<{ name: string; original: string; followup: string; correctionOfRawText: string }> = [
    { name: 'two -> second', original: 'Two real people appear.', followup: 'Actually the second is synthetic.', correctionOfRawText: 'the real person' },
    { name: 'three -> last one', original: 'Three real people appear.', followup: 'The last one is synthetic.', correctionOfRawText: 'the real person appearing' },
    { name: 'several -> another', original: 'Several real people appear.', followup: 'Another one is synthetic.', correctionOfRawText: 'a real person' },
    { name: 'multiple -> one isnt real', original: 'There are multiple real people.', followup: "One isn't real.", correctionOfRawText: 'the real people' },
    { name: 'pair -> one', original: 'A pair of real people appear.', followup: 'One is synthetic.', correctionOfRawText: 'real people appear' },
    { name: 'some -> one', original: 'Some real people appear.', followup: 'One is synthetic.', correctionOfRawText: 'real presence' },
    { name: 'both -> the woman', original: 'Both are real.', followup: 'The woman is synthetic.', correctionOfRawText: 'the real person in the video' },
    { name: 'the two -> only the left', original: 'The two people are real.', followup: 'Only the person on the left is real.', correctionOfRawText: 'the real people appearing' },
  ]

  for (const s of scenarios) {
    test(`${s.name}: "${s.original}" -> "${s.followup}" is append-only regardless of correction_of_raw_text wording`, async () => {
      const t1 = await runExtractionPipeline(
        emptySU(),
        { turn: 1, text: s.original },
        constantExtractor([presenceCandidate({ raw_text: s.original, real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
      )
      expect(active(t1.updated)).toHaveLength(1)
      const originalId = active(t1.updated)[0].mention_id

      const t2 = await runExtractionPipeline(
        t1.updated,
        { turn: 2, text: s.followup },
        constantExtractor([
          presenceCandidate({
            proposal_id: 'c2',
            turn: 2,
            raw_text: s.followup,
            real_or_synthetic_confidence_hint: 'confirmed',
            real_or_synthetic_value_hint: 'synthetic',
            is_correction: true,
            correction_of_raw_text: s.correctionOfRawText,
          }),
        ]),
      )

      const original = t2.updated.content_presence_mentions.find((m) => m.mention_id === originalId)
      expect(original?.superseded_by).toBeNull()
      expect(original?.real_or_synthetic).toBe('real')
      expect(active(t2.updated)).toHaveLength(2)
    })
  }
})

describe('append-only regression corpus -- polarity conflicts and temporal/scope statements', () => {
  // B. present(real) -> absent(real)
  test('B: "A real person appears." -> "Actually no real person appears." is append-only -- old presence remains, new absence is added', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'A real person appears.' },
      constantExtractor([presenceCandidate({ real_or_synthetic_confidence_hint: 'confirmed', real_or_synthetic_value_hint: 'real' })]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually no real person appears.' },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually no real person appears.',
          is_content_presence_absent: true,
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'real',
          is_correction: true,
          correction_of_raw_text: 'a real person',
        }),
      ]),
    )
    const original = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't1-c1')
    expect(original?.superseded_by).toBeNull()
    expect(original?.confidence).toBe('confirmed')
    const added = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't2-c1')
    expect(added?.confidence).toBe('confirmed_absent')
    expect(active(t2.updated)).toHaveLength(2)
  })

  // C. absent(real) -> present(real)
  test('C: "No real person appears." -> "Actually a real person appears." is append-only -- old absence remains, new presence is added', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: 'No real person appears.' },
      constantExtractor([
        presenceCandidate({
          raw_text: 'No real person appears.',
          is_content_presence_absent: true,
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'real',
        }),
      ]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'Actually a real person appears.' },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'Actually a real person appears.',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'real',
          is_correction: true,
          correction_of_raw_text: 'no real person',
        }),
      ]),
    )
    const original = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't1-c1')
    expect(original?.superseded_by).toBeNull()
    expect(original?.confidence).toBe('confirmed_absent')
    const added = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't2-c1')
    expect(added?.confidence).toBe('confirmed')
    expect(active(t2.updated)).toHaveLength(2)
  })

  // D. temporal/scope example -- absent(voice, unqualified) -> present(voice, synthetic)
  test('D: "No person\'s voice is used." -> "A synthetic voice is now used." is append-only -- both statements may describe different points in the project\'s timeline, never collapsed into one', async () => {
    const t1 = await runExtractionPipeline(
      emptySU(),
      { turn: 1, text: "No person's voice is used." },
      constantExtractor([
        presenceCandidate({
          raw_text: "No person's voice is used.",
          raw_content_presence_category: 'person_voice_presence',
          is_content_presence_absent: true,
        }),
      ]),
    )
    const t2 = await runExtractionPipeline(
      t1.updated,
      { turn: 2, text: 'A synthetic voice is now used.' },
      constantExtractor([
        presenceCandidate({
          proposal_id: 'c1',
          turn: 2,
          raw_text: 'A synthetic voice is now used.',
          raw_content_presence_category: 'person_voice_presence',
          real_or_synthetic_confidence_hint: 'confirmed',
          real_or_synthetic_value_hint: 'synthetic',
        }),
      ]),
    )
    const original = t2.updated.content_presence_mentions.find((m) => m.mention_id === 't1-c1')
    expect(original?.superseded_by).toBeNull()
    expect(original?.confidence).toBe('confirmed_absent')
    expect(active(t2.updated)).toHaveLength(2)
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
