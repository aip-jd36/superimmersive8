/**
 * Commercial Readiness Indicators (CRC Limited Pilot, 2026-08-12). Sits
 * immediately after Extraction and before the Commercial Readiness
 * Discovery Catalog (design approved this date; catalog eligibility logic
 * lives in `commercial-readiness-catalog.ts`, not here).
 *
 * Purpose: for exactly three pilot categories -- client involvement,
 * person depicted, reference material used -- determine whether the
 * category is even *applicable* to the workflow the user has already
 * described, using only text the user has already confirmed. This module
 * answers Applicability only. It has no opinion on whether a category has
 * already been sufficiently covered this conversation (that is Evidence
 * Gap, decided from StructuredUnderstanding/catalog state in
 * `commercial-readiness-catalog.ts`) -- see that module for how
 * Applicability and Evidence Gap combine into eligibility.
 *
 * `[EPISTEMIC WARNING]` These are deterministic, pattern-derived
 * applicability indicators over already-confirmed free text
 * (`project_facts.intended_use`, `project_facts.workflow_role`, active
 * `scoped_observations[].note`). They are NOT verified facts and are not
 * equivalent to Extraction-confirmed structured fields -- no field in
 * `StructuredUnderstanding` today structurally represents "client
 * involved," "person depicted," or "reference material used" (confirmed by
 * a full re-read of types/interview-engine.ts, 2026-08-11). An indicator
 * is a phrase-matching heuristic over prose that happened to be confirmed
 * for an unrelated reason (e.g. workflow_role was attested because the
 * user described their role, not because anyone asked about client work).
 * These indicators may ONLY gate whether a commercial-readiness discovery
 * question is eligible to be asked. They must never populate Retrieval,
 * Projection, governance output, or any user-facing finding directly, and
 * must never be persisted onto StructuredUnderstanding, BoundaryState, or
 * SessionStore.
 *
 * Matching discipline (approved 2026-08-12): phrase-level matching over
 * loose substring matching, case-insensitive, no fuzzy matching. Every
 * phrase below is deliberately 2+ words (or a distinctive possessive
 * token like "client's") specifically to avoid single-word collisions
 * that are common in this domain -- e.g. bare "client" would false-
 * positive on "the Runway web client" (a software client, not a business
 * client), and bare "model" would false-positive on "the Runway model" (an
 * AI model, not a person). See the eval report for the full positive/
 * negative/ambiguous/incidental-false-positive test matrix this list was
 * built against.
 *
 * Precedence rule: negative phrases are checked before affirmative
 * phrases, per indicator. If both somehow match, the result is 'negative'.
 * This is a deliberate bias toward the same failure mode as 'unknown'
 * (both suppress the discovery question) rather than toward 'affirmative'
 * (which would inject a question) -- consistent with the approved
 * design principle that false negatives are preferable to speculative
 * false positives for this pilot.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'

export type IndicatorState = 'affirmative' | 'negative' | 'unknown'

export interface CommercialReadinessIndicators {
  client_involvement: IndicatorState
  person_depicted: IndicatorState
  reference_material_used: IndicatorState
}

// ── Phrase lists ─────────────────────────────────────────────────────────
// Exported for direct test inspection and transparency, not because any
// consumer outside this module and its tests should read them directly.

export const CLIENT_INVOLVEMENT_AFFIRMATIVE_PHRASES = [
  'for a client',
  'for my client',
  'for the client',
  'my client',
  "client's",
  'for a customer',
  'for my customer',
  'on behalf of a client',
  'for a brand',
  'for an agency',
] as const

export const CLIENT_INVOLVEMENT_NEGATIVE_PHRASES = [
  'no client',
  'not for a client',
  'personal project',
  'my own project',
  'independent project',
  'hobby project',
  'for myself',
] as const

export const PERSON_DEPICTED_AFFIRMATIVE_PHRASES = [
  'a real person',
  'my face',
  'his face',
  'her face',
  'their face',
  /**
   * `[LIVE-VALIDATED FIX -- 2026-08-12]` "my own face" / "his own face" /
   * "her own face" / "their own face" -- proven missing during live
   * integration testing: a real trial ("It shows my own face and voice
   * talking straight to camera") produced person_depicted: 'unknown'
   * because "my own face" is not a substring of "my face" (the possessive
   * modifier "own" breaks the match). This is a genuinely common, natural
   * first-person phrasing, not a rare edge case -- added per the
   * integration spec's explicit allowance ("do not change the phrase
   * lists unless integration testing proves an actual defect").
   */
  'my own face',
  'his own face',
  'her own face',
  'their own face',
  'an actor',
  'a real human',
  'photo of myself',
  'photo of a friend',
  'myself in the video',
  "someone's likeness",
] as const

export const PERSON_DEPICTED_NEGATIVE_PHRASES = [
  'no people',
  'no person',
  'not a real person',
  'fully synthetic',
  'no human subjects',
  'product shot',
  'no faces',
] as const

export const REFERENCE_MATERIAL_USED_AFFIRMATIVE_PHRASES = [
  'reference image',
  'reference photo',
  'reference footage',
  'existing footage',
  'based on a photo',
  'used a photo of',
  'source image',
  'uploaded an image',
  'starting image',
  'started with an image',
  'started with a photo',
  'footage from my',
] as const

export const REFERENCE_MATERIAL_USED_NEGATIVE_PHRASES = [
  'text prompt only',
  'just a text prompt',
  'generated from text',
  'no reference',
  'text-to-video only',
  'from scratch',
  'no existing footage',
  'purely text-based',
] as const

// ── Derivation ───────────────────────────────────────────────────────────

function collectConfirmedText(su: StructuredUnderstanding): string[] {
  const texts: string[] = []
  if (su.project_facts.intended_use.attestation.state === 'confirmed') {
    texts.push(su.project_facts.intended_use.attestation.value)
  }
  if (su.project_facts.workflow_role.attestation.state === 'confirmed') {
    texts.push(su.project_facts.workflow_role.attestation.value)
  }
  for (const obs of su.scoped_observations) {
    if (obs.superseded_by === null) texts.push(obs.note)
  }
  return texts
}

function containsAnyPhrase(lowercasedTexts: string[], phrases: readonly string[]): boolean {
  return phrases.some((phrase) => {
    const lowerPhrase = phrase.toLowerCase()
    return lowercasedTexts.some((text) => text.includes(lowerPhrase))
  })
}

function deriveIndicator(
  lowercasedTexts: string[],
  affirmativePhrases: readonly string[],
  negativePhrases: readonly string[],
): IndicatorState {
  if (containsAnyPhrase(lowercasedTexts, negativePhrases)) return 'negative'
  if (containsAnyPhrase(lowercasedTexts, affirmativePhrases)) return 'affirmative'
  return 'unknown'
}

export function deriveCommercialReadinessIndicators(su: StructuredUnderstanding): CommercialReadinessIndicators {
  const lowercasedTexts = collectConfirmedText(su).map((t) => t.toLowerCase())

  return {
    client_involvement: deriveIndicator(lowercasedTexts, CLIENT_INVOLVEMENT_AFFIRMATIVE_PHRASES, CLIENT_INVOLVEMENT_NEGATIVE_PHRASES),
    person_depicted: deriveIndicator(lowercasedTexts, PERSON_DEPICTED_AFFIRMATIVE_PHRASES, PERSON_DEPICTED_NEGATIVE_PHRASES),
    reference_material_used: deriveIndicator(
      lowercasedTexts,
      REFERENCE_MATERIAL_USED_AFFIRMATIVE_PHRASES,
      REFERENCE_MATERIAL_USED_NEGATIVE_PHRASES,
    ),
  }
}
