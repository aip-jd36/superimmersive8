/**
 * Generic Synthetic Eligibility Canary Harness (CRC PM / Architecture,
 * 2026-08-30) -- TEST-SUPPORT INFRASTRUCTURE ONLY. Never imported by any
 * production runtime path (`run-turn.ts`, `run-crc-conversation.ts`, any API
 * route). Its only legitimate callers are test files.
 *
 * Extracted from a technique demonstrated manually, independently, twice in
 * this repository -- once for `CLAIM-MUSIC-ARTLIST-PROJECT-LICENSE-
 * DURATION-001-v1` ("A-3", prior to its own real CRC publication) and once
 * for `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` (still `CRC Publication
 * Scope: WITHHELD` today) -- both times using the identical shape: take a
 * real, already-Adopted governed claim, clone it with exactly `crc_eligible`
 * overridden to `'Yes'`, run the real, unmodified `retrieve()` ->
 * `buildBoundedInterpretations()` -> `assembleProjectionOutput()` pipeline,
 * and inspect the result. This module generalizes that one technique. It is
 * not an onboarding engine, a readiness-report system, a state machine, a
 * dependency evaluator, or provider-onboarding automation -- none of those
 * are implemented here, and none should be added to this file.
 *
 * ── THE AUTHORITY INVARIANT: CANARY PASS != CRC APPROVAL ──────────────────
 *
 * Structural, not merely documented:
 *   - This module has no write capability of any kind -- no file I/O, no
 *     database call, no mutation of any governed artifact or fixture. It is
 *     a pure function over its own arguments.
 *   - Exactly two fields are ever overridden on the synthetic clone --
 *     `crc_eligible` (always, forced to `'Yes'`) and, ONLY when the real
 *     claim's own `crc_publication_scope` is `null`, `crc_publication_scope`
 *     itself (see `SELF-CAUGHT CORRECTION` below for why this second field
 *     is real, existing-invariant-required, not scope creep). The caller's
 *     own `claim` object is never mutated; the frozen clone this module
 *     builds is never returned to the caller, only a plain string
 *     `claim_id` is (see `SyntheticEligibilityCanaryResult`), so nothing
 *     resembling a "synthetically eligible claim object" can leak into or
 *     be mistaken for governed state anywhere downstream of this call.
 *
 * ── SELF-CAUGHT CORRECTION (discovered during two-domain testing, not
 * assumed in advance): `crc_eligible` is NOT, on its own, "the eligibility
 * gate." Real, existing, unmodified production code (`assemble-result.ts`'s
 * own `assembleTopicResult`) independently and correctly refuses to produce
 * a result for a `crc_eligible: 'Yes'` claim whose `crc_publication_scope`
 * is `null` -- diagnostic `yes_claim_missing_scope` -- a genuine
 * "never fabricate a scope" safety property, not a bug. A withheld claim
 * (e.g. Likeness Candidate A) has real `crc_publication_scope: null` by
 * definition (it was never approved, so no CRC-facing scope was ever
 * authored). Without accounting for this, the harness could exercise the
 * eligible path only for a claim that ALREADY has real scope text (Music
 * A-3) and would silently, uselessly no-op for exactly the claims a canary
 * is most useful for (an as-yet-unpublished one). The fix is NOT to
 * fabricate scope text inside this module (that would be exactly the
 * "strengthen the scenario" fabrication forbidden by design) -- it is to
 * require the CALLER to supply an explicit `syntheticPublicationScope`
 * (scenario-level, never invented here) whenever the real claim has none,
 * and to fail closed, loudly, if a null-scope claim is supplied without
 * one. Both prior manual canaries this module generalizes in fact already
 * did exactly this (using the claim's own already-governed, already-
 * reviewed `crc_candidate_statement` text) -- this correction recovers that
 * precedent into the generic contract, it does not invent new behavior. ──
 *   - There is no `passed: boolean` field, no verdict, no recommendation
 *     anywhere in the result shape. `runSyntheticEligibilityCanary` returns
 *     raw pipeline facts only (what `retrieve()`/`buildBoundedInterpretations()`/
 *     `assembleProjectionOutput()` actually produced) -- what "passing" means
 *     for a given scenario is entirely the calling test's own `expect()`
 *     assertions, never this module's own judgment.
 *   - No companion "commit"/"promote"/"publish" function exists in this
 *     file, and none should be added -- there is structurally no path from
 *     a synthetic override to a persisted eligibility change.
 *
 * ── WHAT THIS MODULE DOES NOT KNOW ─────────────────────────────────────────
 *
 * It has no branch, condition, or special case keyed on `claim_id`, `topic`,
 * `provider_scope`, jurisdiction value, or any other domain-specific value.
 * It does not know it has ever been called for Music or Likeness, and must
 * never be given a reason to. Domain-specific values belong entirely in the
 * scenario a TEST supplies -- see `__tests__/crc-engine/synthetic-eligibility-
 * canary.test.ts`, which exercises this same function against both domains.
 *
 * ── WHAT THIS MODULE DOES NOT DO ────────────────────────────────────────────
 *
 * Does not resolve, project, or infer any `unresolved_project_dependencies`
 * entry -- it reports exactly what the real claim/pipeline already carries.
 * Does not invoke or simulate dependency questioning/askability. Does not add
 * Track A discovered relevance (callers pass `discoveredTopicOccurrences: []`
 * implicitly by omission -- this module's own signature has no parameter for
 * it). Does not reinterpret or strengthen Bounded Interpretation's own
 * `status`/`summary` -- both are returned exactly as `buildBoundedInterpretations`
 * produced them. Does not perform provider registration, cross-domain bleed
 * checking, or any governance decision.
 */

import { retrieve } from '@/lib/retrieval-engine/retrieve'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { MatrixRow, RetrievalDiagnostic, TopicClaim } from '@/lib/retrieval-engine/types'
import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { BoundedInterpretation } from '@/lib/bounded-interpretation/types'
import { assembleProjectionOutput } from '@/lib/projection-layer/assemble-projection-output'
import type { ProjectionOutput } from '@/lib/projection-layer/types'
import type { Attested, RetrievalHandoff, UserGoal } from '@/types/interview-engine'

/**
 * Generic runtime inputs -- every field is an existing production type,
 * nothing new introduced. `claim` is the one real, already-Adopted governed
 * claim under test (from a real committed fixture, or a hand-transcribed
 * test-only representation of a claim with no fixture entry -- this module
 * neither knows nor cares which). Everything else is exactly what
 * `retrieve()`/`buildBoundedInterpretations()` already accept in production.
 */
export interface SyntheticEligibilityCanaryScenario {
  claim: TopicClaim
  handoff: RetrievalHandoff
  goals: UserGoal[]
  applicabilityFacts: ApplicabilityFacts
  /** Matrix (tool-scoped) claims to also consider -- default none; neither Music A-3 nor Likeness Candidate A is Matrix/tool-scoped. */
  matrix?: MatrixRow[]
  /** Canonical asset-provider identifiers the current project state names (e.g. `['artlist']`) -- the same parameter `retrieve()` itself accepts; default none. Irrelevant for a `provider_scope: null` claim, required for a provider-scoped one -- the scenario supplies it, this module never infers it. */
  assetProviders?: string[]
  humanContributionDescription?: Attested<string>
  /**
   * Required ONLY when `claim.crc_publication_scope` is `null` (see this
   * module's own "SELF-CAUGHT CORRECTION" header). The caller supplies this
   * -- typically the claim's own already-governed `crc_candidate_statement`
   * -- never invented by this module. When the real claim already carries a
   * non-null `crc_publication_scope`, this field is ignored; the real value
   * is used unchanged.
   */
  syntheticPublicationScope?: string
}

/**
 * Raw pipeline facts only -- see this module's own header for why no
 * pass/fail verdict field exists here. `synthetic_claim_id` is a plain
 * string, not the synthetic claim object itself, deliberately.
 */
export interface SyntheticEligibilityCanaryResult {
  synthetic_claim_id: string
  retrieved_claim_ids: string[]
  matched_goal_categories: string[]
  retrieval_diagnostics: RetrievalDiagnostic[]
  /** Exactly `RetrievalResult.unresolved_project_dependencies` per retrieved claim -- never computed, never resolved, a pure passthrough. */
  unresolved_project_dependencies_by_claim: Record<string, string[]>
  bounded_interpretations: BoundedInterpretation[]
  /** `null` when Projection produced nothing to show (mirrors `assembleProjectionOutput`'s own empty-output shape) -- never fabricated. */
  projection: ProjectionOutput | null
}

/**
 * Fail-closed refusal reasons this module will throw for -- narrow,
 * evidence-justified, not a general validation policy. See this module's
 * own header for what "fail-closed" means here: refuse to construct the
 * synthetic scenario at all, rather than guessing or proceeding on
 * incomplete/unsafe input.
 */
export function runSyntheticEligibilityCanary(scenario: SyntheticEligibilityCanaryScenario): SyntheticEligibilityCanaryResult {
  const { claim } = scenario

  if (claim.lifecycle !== 'Adopted') {
    throw new Error(
      `Synthetic eligibility canary refuses to run: claim "${claim.claim_id}" has lifecycle "${claim.lifecycle}", not "Adopted". ` +
        'This harness verifies runtime readiness for an already-governed claim -- it never decides Adoption, and canarying a non-Adopted claim would misrepresent what the result means.',
    )
  }
  if (claim.superseded_by !== null) {
    throw new Error(
      `Synthetic eligibility canary refuses to run: claim "${claim.claim_id}" has been superseded by "${claim.superseded_by}". ` +
        'Canary the current, non-superseded claim instead -- a superseded claim is no longer the governing record.',
    )
  }

  if (claim.crc_publication_scope === null && !scenario.syntheticPublicationScope) {
    throw new Error(
      `Synthetic eligibility canary refuses to run: claim "${claim.claim_id}" has no real crc_publication_scope, and no scenario.syntheticPublicationScope was supplied. ` +
        'Real, unmodified production code (assemble-result.ts) correctly refuses to assemble a result for an eligible claim with no scope text -- this harness will not work around that by fabricating one itself. ' +
        'Supply an explicit scenario.syntheticPublicationScope (e.g. the claim\'s own crc_candidate_statement) if you intend to exercise the eligible-with-scope path for this claim.',
    )
  }

  // Exactly two fields ever overridden, via a fresh object -- `claim` itself
  // is never touched. `crc_publication_scope` only changes when the real
  // claim has none (see this module's own "SELF-CAUGHT CORRECTION" header) --
  // a real, already-authored scope is always used unchanged. Frozen so any
  // accidental downstream mutation attempt (there should be none --
  // retrieve()/buildBoundedInterpretations() are both pure) fails loudly
  // instead of silently succeeding.
  const syntheticClaim: TopicClaim = Object.freeze({
    ...claim,
    crc_eligible: 'Yes' as const,
    crc_publication_scope: claim.crc_publication_scope ?? scenario.syntheticPublicationScope ?? null,
  })

  const { results, diagnostics } = retrieve(
    scenario.handoff,
    scenario.matrix ?? [],
    scenario.goals,
    [syntheticClaim],
    scenario.applicabilityFacts,
    [],
    scenario.assetProviders ?? [],
    [],
  )

  const interpretations = buildBoundedInterpretations(scenario.goals, results, diagnostics, scenario.humanContributionDescription ?? { state: 'unknown' })

  const projection = assembleProjectionOutput(scenario.handoff, results, interpretations)
  const projectionIsEmpty = projection.output.understood_summary === '' && projection.output.knowledge_items.length === 0 && projection.output.goal_interpretations.length === 0

  const unresolvedByClaimId: Record<string, string[]> = {}
  for (const r of results) unresolvedByClaimId[r.claim_id] = r.unresolved_project_dependencies

  return {
    synthetic_claim_id: syntheticClaim.claim_id,
    retrieved_claim_ids: results.map((r) => r.claim_id),
    matched_goal_categories: [...new Set(results.map((r) => r.matched_goal_category))],
    retrieval_diagnostics: diagnostics,
    unresolved_project_dependencies_by_claim: unresolvedByClaimId,
    bounded_interpretations: interpretations,
    projection: projectionIsEmpty ? null : projection.output,
  }
}
