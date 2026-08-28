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
 *     `crc_eligible` (always, forced to `'Yes'`) and `crc_publication_scope`
 *     (see `SCOPE DERIVATION` below). Both are set on an ISOLATED COPY, never
 *     on the caller's own `claim` object, which is never mutated. The clone
 *     this module builds is never returned to the caller, only a plain
 *     string `claim_id` is (see `SyntheticEligibilityCanaryResult`), so
 *     nothing resembling a "synthetically eligible claim object" can leak
 *     into or be mistaken for governed state anywhere downstream.
 *   - `synthetic_runtime_scope != real CRC publication authorization`: the
 *     derived scope text (below) exists solely to satisfy an existing
 *     runtime shape requirement, never to imply that content has been
 *     reviewed or approved for real CRC publication.
 *
 * ── SCOPE DERIVATION (integration-review corrected, 2026-08-30 repair --
 * this module previously accepted an arbitrary, caller-authored
 * `syntheticPublicationScope: string` with no structural tie to the claim's
 * own governed content; independent review found this created real,
 * demonstrated semantic-freedom risk -- a caller could supply prose
 * unrelated to, or stronger than, anything the claim's own governance
 * actually says, and it would flow into the synthetic result undetected.
 * Fixed by removing that field entirely): `crc_eligible` is NOT, on its
 * own, "the eligibility gate." Real, existing, unmodified production code
 * (`assemble-result.ts`'s own `assembleTopicResult`) independently and
 * correctly refuses to produce a result for a `crc_eligible: 'Yes'` claim
 * whose `crc_publication_scope` is `null` -- diagnostic
 * `yes_claim_missing_scope` -- a genuine "never fabricate a scope" safety
 * property, not a bug. This module now derives the synthetic runtime scope
 * using a fixed, non-configurable precedence over the SAME claim's own
 * already-governed fields only:
 *
 *     claim.crc_publication_scope ?? claim.crc_candidate_statement ?? FAIL
 *
 * A. Real, non-null `crc_publication_scope` (e.g. Music A-3, already
 *    published) -- used unchanged, no derivation needed.
 * B. Real `crc_publication_scope` is `null` (e.g. Likeness Candidate A,
 *    withheld) but `crc_candidate_statement` is not -- the candidate
 *    statement (already drafted, already reviewed at the FGR stage, just
 *    not yet CRC-approved) is used as the synthetic runtime scope.
 * C. Both are `null` -- refuses to run (see the function's own fail-closed
 *    check) rather than fabricating prose from any other source. Never
 *    derived from topic, claim_id, dependencies, provider, jurisdiction, a
 *    UserGoal, or any test-scenario value -- only from the claim's own two
 *    named fields.
 *
 * No scenario-level field exists through which a caller can supply
 * arbitrary publication-scope prose -- this is enforced by the type
 * signature itself (`SyntheticEligibilityCanaryScenario` has no such
 * field), not merely by convention.
 *
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
 * ── STRUCTURAL CLAIM ISOLATION (integration-review corrected, 2026-08-30
 * repair -- `Object.freeze({ ...claim, ... })` freezes only the new
 * top-level object; `TopicClaim`'s mutable nested fields
 * (`applicability_requirements`, `unresolved_project_dependencies`,
 * `provider_scope`) were the SAME array/object references as on the
 * caller's source claim, not copies -- independent review directly
 * demonstrated a caller mutating the source claim's own array after a
 * canary run could change a previously-returned result's own field,
 * because real, unmodified `assemble-result.ts` assigns
 * `unresolved_project_dependencies: claim.unresolved_project_dependencies`
 * by reference): this module now builds the synthetic clone from
 * `structuredClone(claim)` -- a full, independent, structurally-shared-
 * nothing copy -- before applying the two field overrides. `TopicClaim` is
 * a plain, JSON-serializable data shape (strings, string arrays, `null`,
 * and flat objects of strings only; no functions, `Date`s, class
 * instances, or circular references), so `structuredClone` is safe and
 * exact here; no new dependency, no JSON-stringify round-trip, no custom
 * per-field copying was introduced. `Object.freeze` on the resulting
 * object remains as an additional, cheap defensive measure against this
 * module's own accidental self-mutation -- it is NOT what provides
 * isolation from the source (that is `structuredClone`'s own job, already
 * complete before freeze is ever applied), and it is still shallow, not
 * recursive: this comment states that precisely rather than implying deep
 * immutability freeze alone never provided.
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
  // No caller-authored publication-scope field exists here, deliberately --
  // see this module's own "SCOPE DERIVATION" header. The synthetic runtime
  // scope is always derived internally from the claim's own governed
  // fields; there is no scenario-level API through which a caller can
  // supply arbitrary publication-scope prose.
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

  // Fixed precedence over the claim's OWN governed fields only -- see this
  // module's own "SCOPE DERIVATION" header. No test-scenario input, no
  // caller-authored string, participates in this derivation at all.
  const derivedPublicationScope = claim.crc_publication_scope ?? claim.crc_candidate_statement
  if (derivedPublicationScope === null) {
    throw new Error(
      `Synthetic eligibility canary refuses to run: claim "${claim.claim_id}" has no real crc_publication_scope AND no crc_candidate_statement to derive a synthetic runtime scope from. ` +
        'Real, unmodified production code (assemble-result.ts) correctly refuses to assemble a result for an eligible claim with no scope text -- this harness will not work around that by fabricating one from any other source.',
    )
  }

  // Full, independent, structurally-shared-nothing copy of the caller's
  // claim -- see this module's own "STRUCTURAL CLAIM ISOLATION" header for
  // why a shallow spread was insufficient. TopicClaim's mutable nested
  // fields (applicability_requirements, unresolved_project_dependencies,
  // provider_scope) are copied, not aliased, by structuredClone -- no array
  // or object reference on the returned synthetic claim is shared with
  // `claim`. Exactly two fields are then overridden on this isolated copy;
  // `claim` itself is never touched. Object.freeze remains as an additional,
  // cheap, shallow defensive measure against this module's own accidental
  // self-mutation -- isolation from the source is already complete by this
  // point, independent of freeze.
  const isolatedClaim = structuredClone(claim)
  const syntheticClaim: TopicClaim = Object.freeze({
    ...isolatedClaim,
    crc_eligible: 'Yes' as const,
    crc_publication_scope: derivedPublicationScope,
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
