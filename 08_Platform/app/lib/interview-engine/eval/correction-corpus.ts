/**
 * Focused correction corpus (Follow-up 1, tool-correction extraction fix).
 * Small, targeted live-model set -- not a rerun of the full Live Interview
 * Runtime battery -- built specifically to validate
 * resolveToolMentionSupersessionTarget (extraction.ts) against the variants
 * JD specified: true correction (direct and "meant"), a same-tool
 * access-surface correction, an ambiguous workflow-switch framing, a
 * temporally-framed correction, and a genuine two-tool-coexistence contrast
 * case that must NOT trigger any supersession.
 *
 * Runs at the runExtractionPipeline() level (Extraction + Mutation fused),
 * not the full runTurn() -- this follow-up is scoped to Extraction's own
 * behavior, not the whole runtime (that regression check is separate, via
 * run-correction-regression-runtime.ts).
 */

export interface CorrectionCorpusCase {
  id: string
  description: string
  turns: string[]
  /** What resolveToolMentionSupersessionTarget is expected to do -- checked by the runner, not asserted by this file. */
  expectation: string
}

export const CORRECTION_CORPUS: CorrectionCorpusCase[] = [
  {
    id: 'true_correction_direct',
    description: 'Direct correction naming both the new and old tool in one sentence.',
    turns: ['We used Midjourney for the visuals.', 'Actually, we used Runway, not Midjourney.'],
    expectation: 'Runway active/canonical/confirmed; Midjourney superseded, not deleted.',
  },
  {
    id: 'true_correction_meant',
    description: '"I meant X, not Y" phrasing.',
    turns: ['We used Runway for this one.', 'Sorry, I meant Kling, not Runway.'],
    expectation: 'Kling active; Runway superseded, not deleted.',
  },
  {
    id: 'access_surface_correction',
    description: 'Correction of HOW an already-established ambiguous tool was accessed, not WHICH tool -- same underlying tool (Nano Banana), corrected access surface.',
    turns: ['We used Nano Banana through the API for this one.', 'Correction — that was the Gemini app, not the API.'],
    expectation: 'Old API-surfaced Nano Banana mention superseded by a new mention with corrected access surface (exact resolution depends on whether the registry\'s own disambiguation regex matches this exact phrasing -- reported as observed, not assumed).',
  },
  {
    id: 'workflow_switch',
    description: 'Ambiguous framing: describes a real sequence (concept tool, then final tool) without "that was wrong" correction language. Not scripted as a correction -- observing how the model classifies it and confirming state isn\'t corrupted either way.',
    turns: ['We started with Midjourney for early concepts.', 'We switched from Midjourney to Runway for the final.'],
    expectation: 'No specific pass/fail bar -- report is_correction classification and resulting tool_mentions state as an observation, and confirm no MUTATION_DUPLICATE_ID rejection occurs regardless of classification.',
  },
  {
    id: 'true_correction_earlier',
    description: 'Temporally-framed correction referencing an earlier, different turn.',
    turns: ['We used Kling for the animation.', 'Earlier I said Kling, but that was wrong. It was Pika.'],
    expectation: 'Pika active (unresolved_alias is expected -- Pika is not in KNOWN_TOOLS, a pre-existing registry-completeness gap unrelated to this fix); Kling superseded, not deleted.',
  },
  {
    id: 'two_tool_coexistence',
    description: 'Non-correction contrast case: two tools genuinely both used. Must NOT trigger any supersession.',
    turns: ['We used both Kling and Pika on this one — Kling for the b-roll, Pika for the hero shot.'],
    expectation: 'Two independent active tool_mentions (Kling, Pika); neither superseded; is_correction false/absent on both.',
  },
]
