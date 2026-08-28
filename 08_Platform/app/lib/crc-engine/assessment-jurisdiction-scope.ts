/**
 * Assessment-jurisdiction scope derivation + legacy compatibility bridge (CRC
 * Assessment-Jurisdiction Mention Model, 2026-08-28, implementing the
 * accepted design). Ownership/location: `lib/crc-engine/`, mirroring
 * `jurisdiction-clarification.ts`'s own precedent -- READ-ONLY orchestration
 * that needs both Interview Engine (`StructuredUnderstanding`) and Retrieval
 * Engine (`AssessmentJurisdictionFacts`) TYPES.
 *
 * Deliberately narrow scope, corrected during implementation (subsystem-
 * boundaries.test.ts's own "no file under lib/interview-engine/ imports
 * retrieval-engine" rule): mutation orchestration (seeding, add, correction
 * target resolution) originally drafted here was moved to
 * lib/interview-engine/extraction.ts instead, using a local, simple
 * case-insensitive string comparison for target-matching rather than this
 * module's own `canonicalizeJurisdictionValue`-based authoritative
 * comparison -- extraction.ts (Interview Engine) cannot import Retrieval
 * Engine logic, mirroring exactly how `resolveAssetProviderMentionTarget`'s
 * own existing correction-matching already uses a simple local `.toLowerCase()`
 * comparison rather than any registry/alias-resolution logic. This module
 * therefore owns ONLY the read-time derivation Retrieval's own applicability
 * input is built from -- never a mutation, never called from extraction.ts.
 *
 * ── Authoritative-state rule (no launch-marker timestamp needed) ──────────
 *
 * The design report proposed reusing this repository's `resultsGateLaunchedAt`-
 * style launch-marker pattern. Direct implementation-time re-examination found
 * a marker is NOT actually required for this specific case, for a structural
 * reason the results-gate case doesn't share: code deploys atomically, and
 * from the moment this module ships, EVERY turn for EVERY session (old or
 * new) is processed by code that never writes `project_facts.jurisdiction`
 * again. This means a CONFIRMED value in the legacy scalar can only ever
 * reflect something a user said BEFORE this code shipped, for any session,
 * full stop -- there is no scenario, old session or new, where reading it as
 * a fallback when the new collection is empty could resurrect anything a
 * POST-deploy turn wrote, because post-deploy code structurally cannot write
 * it. The authority rule therefore needs only one, purely structural check --
 * has the new collection EVER received any entry, active or superseded (§L
 * of the design report's own compatibility matrix) -- with no timestamp
 * comparison anywhere. This is a deliberate, disclosed simplification of the
 * design report's own proposal, not a silent deviation -- see the
 * Assessment-Jurisdiction Mention Model — Generic Implementation Final
 * Report §C for the full original reasoning.
 *
 * Strengthened (Post-Integration Cleanup, 2026-08-28, closing the Integration
 * Review's Finding 1): the generic implementation left a SEPARATE, unrelated
 * `project_fact`/`jurisdiction` candidate path wired in extraction.ts's own
 * dispatch, still calling the legacy `setJurisdiction` mutation -- reachable
 * only because the extractor's own wire-schema enum happened to exclude
 * 'jurisdiction' as a valid `raw_fact_field` value, not because the TYPE
 * SYSTEM made it impossible to construct such a candidate. That path has now
 * been removed at the type level (`CandidateObservation.raw_fact_field` and
 * `ProposedFact`'s own `project_fact` field union no longer include
 * `'jurisdiction'` at all), and the dispatch branch calling `setJurisdiction`
 * has been deleted. `setJurisdiction` itself remains in mutations.ts (a
 * historical, still-well-formed StructuredUnderstanding operation, not
 * deleted per this cleanup's own "smallest change" discipline), but no
 * production code anywhere calls it any more -- confirmed by
 * subsystem-boundaries.test.ts's own zero-call-site assertion. The "no
 * timestamp needed" argument above is therefore now structurally complete,
 * not just true for the assessment-jurisdiction candidate path specifically.
 *
 * ── What this module does NOT do ────────────────────────────────────────
 *
 * Never infers assessment scope from factual territory (distribution,
 * filming, client, or subject location) -- that remains the extractor's own,
 * unchanged discipline (anthropic-extractor.ts). Never performs geographic
 * containment or hierarchy matching -- comparison at the applicability
 * boundary is flat-value canonicalized equality only, via the same
 * `canonicalizeJurisdictionValue` Retrieval itself already uses (see
 * lookup-topic-claims.ts's own `evaluateJurisdictionRequirementStatus`).
 * Never fabricates provenance -- the one place old data crosses into the new
 * representation (the legacy seed, extraction.ts) reuses the scalar's own
 * real, already-attested `source_turn`/`source_statement`.
 */

import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { AssessmentJurisdictionFacts } from '@/lib/retrieval-engine/lookup-topic-claims'

export type { AssessmentJurisdictionFacts }

/** Current (non-superseded) mentions only -- same convention as every other mention type in this codebase. */
function currentMentions(su: StructuredUnderstanding) {
  return su.assessment_jurisdiction_mentions.filter((m) => m.superseded_by === null)
}

/**
 * Structural "has this session's new mechanism ever been touched" check --
 * the RAW array length, including superseded entries, not just current ones
 * (per the design report's own explicit instruction: "A collection with
 * historical superseded/excluded entries counts as touched"). This is the
 * one, sole gate for legacy-scalar eligibility -- no timestamp involved.
 * Exported so extraction.ts's own mutation orchestrator can apply the
 * identical rule when deciding whether to seed.
 */
export function assessmentJurisdictionCollectionEverTouched(su: StructuredUnderstanding): boolean {
  return su.assessment_jurisdiction_mentions.length > 0
}

/**
 * Whether the legacy scalar may be used as a bounded, read-time-only
 * compatibility bridge for THIS session right now. Both conditions must
 * hold: the collection has never been touched, and the scalar itself is
 * actually confirmed (an unconfirmed/unknown/declined scalar has nothing to
 * bridge). Exported for the identical reason as
 * `assessmentJurisdictionCollectionEverTouched` above.
 */
export function legacyAssessmentJurisdictionFallbackEligible(su: StructuredUnderstanding): boolean {
  if (assessmentJurisdictionCollectionEverTouched(su)) return false
  return su.project_facts.jurisdiction.attestation.state === 'confirmed'
}

/**
 * The single, generic read entry point Retrieval's applicability input is
 * built from (lib/crc-engine/run-crc-conversation.ts) and the generic
 * jurisdiction-need computation reads (lib/crc-engine/jurisdiction-
 * clarification.ts). Pure, deterministic, read-only -- never mutates `su`.
 * For a genuinely untouched legacy session with a confirmed scalar,
 * synthesizes a single-value `included` set read-time-only (never persisted
 * here -- see extraction.ts's own seeding for the durable, one-time
 * materialization path used when a real mutation is about to occur). For
 * every other session, reads the current collection directly: `confirmed`
 * mentions populate `included`, `confirmed_absent` mentions populate
 * `excluded`.
 */
export function deriveAssessmentJurisdictionFacts(su: StructuredUnderstanding): AssessmentJurisdictionFacts {
  // Re-checks `state === 'confirmed'` directly (duplicating the same test
  // `legacyAssessmentJurisdictionFallbackEligible` already performed) purely
  // for TypeScript's own narrowing -- discriminated-union narrowing does not
  // flow across a function-call boundary, so `.value` is only accessible on
  // `Attested<string>` when the `state === 'confirmed'` check is inline.
  const scalar = su.project_facts.jurisdiction.attestation
  if (legacyAssessmentJurisdictionFallbackEligible(su) && scalar.state === 'confirmed') {
    return { included: [scalar.value], excluded: [] }
  }
  const current = currentMentions(su)
  return {
    included: current.filter((m) => m.confidence === 'confirmed').map((m) => m.value),
    excluded: current.filter((m) => m.confidence === 'confirmed_absent').map((m) => m.value),
  }
}
