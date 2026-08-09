/**
 * Focused identity-resolution corpus (proposal-ID collision class fix,
 * 2026-08-09, LIVE-RUNTIME-FOLLOWUP-REPORT-2026-08-09). Validates
 * resolveToolMentionTarget's generalized Step 1 (same-tool identity match)
 * ahead of Step 2 (the existing is_correction-flagged retraction logic,
 * unchanged from the 2026-08-08 correction fix). Six cases, as specified:
 * repeated tool mention, workflow switch, same tool mentioned again later,
 * correction, coexistence, ambiguous re-mention.
 */

export interface IdentityCorpusCase {
  id: string
  description: string
  turns: string[]
  expectation: string
}

export const IDENTITY_RESOLUTION_CORPUS: IdentityCorpusCase[] = [
  {
    id: 'repeated_tool_mention',
    description: 'Same tool named twice in close succession, no correction language -- an ordinary re-mention adding new detail (plan tier).',
    turns: ['We used Runway for this.', 'Yeah, Runway again, team plan this time.'],
    expectation: 'One active tool_mention (runway-gen3), attached/updated with plan_tier -- never two parallel duplicates, zero duplicate-ID rejections.',
  },
  {
    id: 'workflow_switch',
    description: 'Describes a real tool sequence without "that was wrong" correction language.',
    turns: ['We started with Midjourney for early concepts.', 'We switched from Midjourney to Runway for the final.'],
    expectation: 'Zero duplicate-ID rejections regardless of whether the model flags is_correction or not -- Midjourney attaches/refreshes if re-mentioned, Runway creates cleanly either way.',
  },
  {
    id: 'same_tool_mentioned_again_later',
    description: 'The same tool resurfaces after several unrelated intervening turns, testing identity matching survives distraction.',
    turns: [
      'We used Kling for this.',
      "I'm the editor on it.",
      "It's an internal test, nothing commercial.",
      'Oh also, still Kling, forgot to mention it was the Pro plan.',
    ],
    expectation: 'A single active Kling mention across all four turns, updated with plan_tier at turn 4 -- never duplicated, never rejected.',
  },
  {
    id: 'correction',
    description: 'True correction -- the exact case the 2026-08-08 fix targeted. Must remain green under the generalized resolver.',
    turns: ['We used Midjourney for the visuals.', 'Actually, we used Runway, not Midjourney.'],
    expectation: 'Runway active/canonical; Midjourney superseded, not deleted. Same bar as the correction corpus.',
  },
  {
    id: 'coexistence',
    description: 'Two genuinely different tools used together -- must never be merged by the identity resolver.',
    turns: ['We used both Kling and Pika on this one — Kling for the b-roll, Pika for the hero shot.'],
    expectation: 'Two independent active mentions; neither superseded; no invented correction or merge.',
  },
  {
    id: 'ambiguous_re_mention',
    description: 'An ambiguous alias, re-stated by the same raw name with disambiguating text this time -- tests Step 1\'s raw-alias-text match branch, which consolidates identity across a normalization-status change (unresolved -> canonical).',
    turns: ['I used Nano Banana for this one.', 'Oh, I mentioned Nano Banana earlier — that one was through the API, developer key, not the phone app.'],
    expectation: 'The second mention attaches to (supersedes) the first, consolidating into one resolved gemini-api mention -- not two parallel Nano Banana records, one resolved and one still ambiguous.',
  },
]
