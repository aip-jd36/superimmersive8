/**
 * CRC end-to-end orchestrator (Prototype Beta, CRC End-to-End Integration
 * milestone). Coordinates the three already-built, already-independently-
 * tested subsystems -- Interview Engine, Retrieval Engine, Projection
 * Layer -- into one deterministic pipeline. This is the ONLY module in the
 * codebase that imports actual logic from all three: `buildRetrievalHandoff`
 * (Interview), `retrieve` (Retrieval), `assembleProjectionOutput`
 * (Projection). Every other module's relationship to a sibling subsystem is
 * type-only (see the subsystem-boundaries test suite, which verifies this
 * as a structural property, not a discipline).
 *
 * Glue only: four already-published pure function calls, in order, each
 * one's full output passed to the next unmodified. No reinterpretation of
 * any value, no duplicated business logic, no re-implementation of
 * Retrieval's matching or Projection's rendering. If this function ever
 * needs to inspect or branch on the CONTENT of a handoff, a result, or an
 * output (beyond simply passing it forward), that is a sign business logic
 * is leaking into the orchestrator and belongs in the owning subsystem
 * instead.
 *
 * Milestone 2 addition (2026-08-15, User Goal + Bounded Interpretation):
 * `buildBoundedInterpretations` is the fourth pure call, reading
 * `understanding.user_goals` directly (Interview Engine's true terminal
 * state this module already has in hand) alongside the already-computed
 * `results` from Retrieval -- never re-entering Interview or Retrieval,
 * never a second RetrievalHandoff. Its output is passed to
 * `assembleProjectionOutput`'s new third parameter unmodified, same
 * "full output passed to the next unmodified" discipline as every other
 * step here.
 *
 * Input boundary (architecture decision, Phase 1 review, 2026-08-08):
 * `StructuredUnderstanding`, NOT raw conversation turns. JD's own
 * conceptual diagram for this milestone starts at "User conversation," but
 * running a full multi-turn scripted conversation requires injected
 * extractor/generator/decider dependencies (live-model or mocked) --
 * that is Interview Engine's own already-built eval-harness concern
 * (lib/interview-engine/eval/run-dialogue.ts), not "the smallest possible
 * deterministic orchestration function" this milestone asks for. This
 * module's own input is Interview Engine's true terminal state -- one
 * already-published, unmodified `buildRetrievalHandoff()` call away from
 * the `RetrievalHandoff` both Retrieval and Projection already treat as
 * their canonical shared contract. Composing this orchestrator with
 * `run-dialogue.ts`'s own `final_su` output (to represent a full scripted
 * conversation, deterministic under the mock stack) is possible from
 * calling code without this module needing to know anything about how a
 * `StructuredUnderstanding` was produced -- see the end-to-end test suite
 * for exactly this composition.
 *
 * `matrix: MatrixRow[]` is a required parameter, never defaulted to
 * `MATRIX_FIXTURE`, mirroring `retrieve()`'s own established discipline
 * (RETRIEVAL_ENGINE_ARCHITECTURE.md §2) -- so a future real-Matrix adapter
 * swaps in cleanly, and tests can supply exactly the rows a given case
 * needs.
 */

import { buildRetrievalHandoff } from '@/lib/interview-engine/handoff'
import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { MatrixRow, RetrievalDiagnostic, RetrievalResult, TopicClaim, TopicRelationship } from '@/lib/retrieval-engine/types'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import type { ProjectionDiagnostic, ProjectionOutput } from '@/lib/projection-layer/types'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import { deriveDiscoveredTopicOccurrences } from './discovered-relevance'
import { deriveAssessmentJurisdictionFacts } from './assessment-jurisdiction-scope'
import type { RetrievalHandoff, StructuredUnderstanding } from '@/types/interview-engine'

export interface CRCPipelineDiagnostics {
  retrieval: RetrievalDiagnostic[]
  projection: ProjectionDiagnostic[]
}

/**
 * Diagnostics only (module header, and per instruction) -- never a second
 * source of truth for the final output. `projection_output` here is the
 * exact same object as the top-level `output` field, not a copy -- kept on
 * the trace for a single self-describing structure that shows the full
 * Interview -> Retrieval -> Projection chain in one place, at the cost of
 * one referentially-identical duplicate field, not a value-level one.
 */
export interface CRCPipelineTrace {
  retrieval_handoff: RetrievalHandoff
  retrieval_results: RetrievalResult[]
  projection_output: ProjectionOutput
}

export interface CRCPipelineResult {
  output: ProjectionOutput
  diagnostics: CRCPipelineDiagnostics
  trace: CRCPipelineTrace
}

/**
 * `topicClaims` (CRC Living Knowledge Phase 1, 2026-08-16): additive,
 * defaults to `[]` -- every pre-existing call site continues to compile
 * and behave identically without passing it, same discipline as
 * `assembleProjectionOutput`'s own `interpretations` parameter. Real
 * callers pass `TOPIC_CLAIMS_FIXTURE` explicitly (mirroring how `matrix`
 * is never defaulted to `MATRIX_FIXTURE` here) once Wave 1 claims exist.
 *
 * Applicability facts (jurisdiction, tool plan tiers) are read straight
 * off `understanding` and passed to `retrieve()` unmodified -- never
 * routed through `RetrievalHandoff`, per the same "user_goals cannot leak
 * downstream by construction" principle Milestone 1 already established.
 * BUG FIX (Living Knowledge governance review, 2026-08-16): this doc
 * comment described that behavior since Phase 1 shipped, but the function
 * body never actually built or passed `applicabilityFacts` -- every real
 * call site (run-turn.ts x3, results-email-delivery.ts) called this
 * function with only 3 arguments, so `retrieve()`'s 5th parameter silently
 * defaulted to `{jurisdiction: {state: 'unknown'}, toolMentions: []}`
 * regardless of what the user actually confirmed. Harmless while every
 * Topic claim is Lifecycle: Candidate (nothing could ever have surfaced
 * either way), but would have silently broken jurisdiction- and
 * tool-plan-tier-gated applicability the moment any claim went live.
 * Fixed here to match what the comment always claimed. Tool plan tiers
 * come from `understanding.tool_mentions` unmodified, the exact same
 * array `buildRetrievalHandoff` itself reads for its own tool matching.
 * `jurisdiction` (updated CRC Assessment-Jurisdiction Mention Model,
 * 2026-08-28) no longer reads `understanding.project_facts.jurisdiction`
 * directly here -- see `deriveAssessmentJurisdictionFacts` above, which
 * owns the cardinality-many membership derivation and its own bounded
 * legacy-scalar compatibility bridge. Never guessed, never inferred from
 * IP/locale/traffic signals or factual territory/distribution facts either
 * way -- see jurisdiction-clarification.ts and assessment-jurisdiction-
 * scope.ts's own headers for why no such inference path exists anywhere
 * upstream of this read.
 *
 * `relationships` (Governed Topic Relationships orchestrator-wiring
 * follow-up, 2026-08-16): additive, defaults to `[]`, same discipline as
 * `topicClaims` immediately above it -- every pre-existing call site
 * continues to compile and behave identically without passing it. Real
 * callers pass `TOPIC_RELATIONSHIPS_FIXTURE` explicitly (mirroring exactly
 * how `topicClaims` callers pass `TOPIC_CLAIMS_FIXTURE`), threaded straight
 * through to `retrieve()`'s own 6th parameter, unmodified. Passing the real
 * fixture here produces zero behavior change today: the one real
 * relationship record is `crc_eligible: 'Pending'`, so
 * `lookupRelatedTopicClaims()` excludes it before any target claim is even
 * considered -- see the load-bearing governance test in
 * __tests__/crc-engine/run-crc-conversation.test.ts proving this is
 * because governance says Pending, not because the plumbing is missing.
 */
export function runCRCConversation(
  understanding: StructuredUnderstanding,
  matrix: MatrixRow[],
  topicClaims: TopicClaim[] = [],
  relationships: TopicRelationship[] = [],
): CRCPipelineResult {
  const handoff = buildRetrievalHandoff(understanding)
  const applicabilityFacts: ApplicabilityFacts = {
    // CRC Assessment-Jurisdiction Mention Model (2026-08-28): sourced from
    // the single, generic derivation owned by assessment-jurisdiction-scope.ts
    // (cardinality-many included/excluded membership, with its own bounded
    // legacy-scalar compatibility bridge) -- this orchestrator never reads
    // `understanding.project_facts.jurisdiction` directly any more, same
    // "glue only, no business logic leaking into the orchestrator" discipline
    // this module's own header already requires.
    jurisdiction: deriveAssessmentJurisdictionFacts(understanding),
    toolMentions: understanding.tool_mentions,
  }
  // assetProviders (Living Knowledge — Third-Party Source Rights, M3,
  // 2026-08-18): sourced from `handoff.asset_providers`, already computed
  // above by `buildRetrievalHandoff` -- not re-derived independently from
  // `understanding.asset_provider_mentions`, so there is exactly one place
  // canonical/unresolved provider resolution happens. Every one of this
  // function's 8 real call sites (run-turn.ts x3, results-email-delivery.ts,
  // app/api/crc/turn/route.ts x4) already passes the full StructuredUnderstanding
  // and needs zero changes -- provider data flows through automatically.
  // Track A — Generic Discovered Relevance milestone (2026-08-21), provenance
  // preserved by Track C — Discovered-Topic Goal Provenance (2026-08-21):
  // derived fresh from the same `understanding`/`topicClaims` this function
  // already has in hand -- no new state, no new call site category. Glue
  // only, matching this module's own header discipline:
  // `deriveDiscoveredTopicOccurrences` is owned entirely by
  // discovered-relevance.ts, its full output (now the richer,
  // goal-provenance-preserving occurrence list, not a flattened
  // `GoalCategory[]`) passed to `retrieve()`'s own additive parameter
  // unmodified.
  const discoveredTopicOccurrences = deriveDiscoveredTopicOccurrences(understanding, topicClaims)
  const { results, diagnostics: retrievalDiagnostics } = retrieve(handoff, matrix, understanding.user_goals, topicClaims, applicabilityFacts, relationships, handoff.asset_providers, discoveredTopicOccurrences)
  // H5 -- minimal echo-only relevance composition (Copyright UAT Correction
  // Milestone, 2026-08-19): threading the confirmed/unconfirmed contribution
  // fact through is additive-only -- see build-bounded-interpretation.ts's
  // own shouldIncludeHumanContributionSentence for the exact narrow
  // conditions under which this changes rendered output at all.
  const interpretations = buildBoundedInterpretations(
    understanding.user_goals,
    results,
    retrievalDiagnostics,
    understanding.project_facts.human_contribution_description.attestation,
  )
  const { output, diagnostics: projectionDiagnostics } = assembleProjectionOutput(handoff, results, interpretations)

  return {
    output,
    diagnostics: { retrieval: retrievalDiagnostics, projection: projectionDiagnostics },
    trace: { retrieval_handoff: handoff, retrieval_results: results, projection_output: output },
  }
}
