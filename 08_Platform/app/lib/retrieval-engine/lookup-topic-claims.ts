/**
 * Topic claim lookup + applicability evaluation (CRC Living Knowledge
 * Phase 1, 2026-08-16). Parallel to lookup-rows.ts, not a modification of
 * it -- matches PRD v0.2 §14's "Tool Retrieval + Topic/LK Retrieval"
 * model, and the repo-grounded finding that a non-tool-scoped claim has no
 * MatrixRow to attach to, so it needs its own lookup path.
 *
 * Two-step process, deliberately kept as two small pure functions rather
 * than one: (1) topic match -- does an active, confirmed UserGoal's
 * category match a TopicClaim's topic, on a currently-Adopted +
 * CRC-eligible, non-superseded claim; (2) applicability match -- of the
 * topic-matched claims, does the deterministic predicate evaluation over
 * ApplicabilityFacts pass. A claim that matches (1) but fails (2) is not
 * an error -- it's the exact "relevant but not applicable" case PRD v0.2
 * §9 requires (e.g. a US-jurisdiction copyright claim when jurisdiction
 * is unconfirmed). No guessing, no partial credit -- a claim only ever
 * becomes a RetrievalResult when every one of its requirements evaluates
 * true.
 */

import type { Attested, GoalCategory, ToolMention, UserGoal } from '@/types/interview-engine'
import type { ApplicabilityRequirement, RetrievalDiagnostic, TopicClaim, UnmetApplicabilityDetail } from './types'

/**
 * Only the two Phase 1 IMPLEMENTED fact sources -- see APPLICABILITY_FACTS'
 * own doc comment in types.ts for why the other three predicate types are
 * reserved, not evaluable, in Phase 1.
 */
export interface ApplicabilityFacts {
  jurisdiction: Attested<string>
  toolMentions: ToolMention[]
}

/**
 * Jurisdiction value canonicalization (Copyright UAT Output-Path
 * Diagnostic P0 fix, 2026-08-19). Confirmed root cause: a real live UAT
 * user answered the deterministic jurisdiction question with "It's in the
 * US" -- correctly extracted and attested as `confirmed, value: "US"` --
 * but COPY-001/002/003's own governed `applicability_requirements` are
 * authored as the literal string `"United States"`. Strict equality
 * (`actual === req.value`) then failed even though the user's jurisdiction
 * was genuinely, unambiguously known, silently withholding all three
 * claims and leaving only CLAIM-COPY-004-v1 (which has no jurisdiction
 * requirement at all) visible.
 *
 * Same narrow, curated-alias-table pattern as `KNOWN_TOOLS`/
 * `KNOWN_ASSET_PROVIDERS` in extraction.ts -- exact-string lookup after
 * trim+lowercase, NOT fuzzy/substring/startsWith matching, and NOT an
 * LLM call. An unrecognized string (e.g. "United Kingdom", "California",
 * "North America", "US market maybe") is returned unchanged and therefore
 * still fails a `"United States"` requirement exactly as before --
 * fail-closed by construction: this table can only ever make MORE strings
 * resolve to a KNOWN canonical value, never fewer, and never guesses.
 *
 * Scoped to `fact === 'jurisdiction'` only (see the one call site below) --
 * `tool_plan_tier` requirements are deliberately NOT canonicalized here;
 * that is a different fact type with its own (currently exact-match)
 * semantics, out of this fix's scope.
 *
 * Only one canonical jurisdiction is governed today -- every real
 * `applicability_requirements` entry across the current
 * `TOPIC_CLAIMS_FIXTURE` uses the literal value `"United States"`
 * (confirmed by direct inspection before this fix was written; COPY-001/
 * 002/003 are the only claims with a jurisdiction requirement at all).
 * This registry is therefore intentionally small -- not a world-country
 * database -- and should only grow when a real governed claim actually
 * requires a second jurisdiction value.
 *
 * Applied at the APPLICABILITY COMPARISON BOUNDARY, never at attestation/
 * capture time: `ProjectFacts.jurisdiction.attestation.value` (the user's
 * own raw words, e.g. "US") is never rewritten -- only the transient
 * comparison inside `evaluateRequirement` canonicalizes both sides before
 * comparing. This preserves the raw attested fact untouched, requires no
 * persistence/schema change, and keeps the fix exactly where the semantic
 * mismatch actually occurs.
 */
const JURISDICTION_VALUE_ALIASES: Record<string, string> = {
  'united states': 'United States',
  'united states of america': 'United States',
  us: 'United States',
  usa: 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  'the us': 'United States',
}

export function canonicalizeJurisdictionValue(value: string): string {
  const key = value.trim().toLowerCase()
  return JURISDICTION_VALUE_ALIASES[key] ?? value
}

/**
 * Piece 1 (CRC Narrow Governed Selector Questioning milestone, 2026-08-24).
 * Per-requirement structured outcome -- the single semantic source of truth
 * both `isApplicable()` below and Retrieval's own richer `applicability_unmet`
 * diagnostic detail (assemble sites in this file and retrieve.ts) derive
 * from. Exactly three states, mirroring the three branches already present
 * in this evaluation logic before this milestone (never invented):
 * `'unresolved'` when the relevant structured fact isn't confirmed (the
 * existing `actual === undefined` branch), `'not_met'` when it's confirmed
 * but the comparison fails, `'met'` when it's confirmed and matches.
 */
export type ApplicabilityRequirementStatus = 'met' | 'unresolved' | 'not_met'

export interface ApplicabilityRequirementOutcome {
  requirement: ApplicabilityRequirement
  status: ApplicabilityRequirementStatus
}

function evaluateRequirementStatus(req: ApplicabilityRequirement, facts: ApplicabilityFacts): ApplicabilityRequirementStatus {
  let actual: string | undefined

  if (req.fact === 'jurisdiction') {
    actual = facts.jurisdiction.state === 'confirmed' ? facts.jurisdiction.value : undefined
  } else if (req.fact === 'tool_plan_tier') {
    const mention = facts.toolMentions.find(
      (m) => m.superseded_by === null && m.resolution.kind === 'canonical' && m.resolution.identifier === req.tool,
    )
    actual = mention && mention.plan_tier.state === 'confirmed' ? mention.plan_tier.value : undefined
  }

  // Unconfirmed/unresolvable fact -> unresolved, never guessed. This is the
  // single mechanism that makes "jurisdiction unknown" and "wrong
  // jurisdiction" behave identically for isApplicable()'s own boolean
  // purposes (both fail the overall gate) while still being distinguishable
  // for selector-questioning purposes (one is worth asking about, the other
  // never is).
  if (actual === undefined) return 'unresolved'

  if (req.fact === 'jurisdiction') {
    const canonicalActual = canonicalizeJurisdictionValue(actual)
    const canonicalRequired = canonicalizeJurisdictionValue(req.value)
    const matches = req.operator === 'equals' ? canonicalActual === canonicalRequired : canonicalActual !== canonicalRequired
    return matches ? 'met' : 'not_met'
  }

  const matches = req.operator === 'equals' ? actual === req.value : actual !== req.value
  return matches ? 'met' : 'not_met'
}

/** Piece 1: every requirement's outcome, in array order. Never filters -- callers needing only the unmet subset (e.g. diagnostic population below) filter this output themselves, so there is exactly one evaluation pass regardless of caller. */
export function evaluateApplicabilityDetailed(requirements: ApplicabilityRequirement[], facts: ApplicabilityFacts): ApplicabilityRequirementOutcome[] {
  return requirements.map((requirement) => ({ requirement, status: evaluateRequirementStatus(requirement, facts) }))
}

/**
 * True only when EVERY requirement evaluates 'met'. An empty requirements
 * list is vacuously applicable (no gate at all) -- unchanged public
 * semantics, byte-identical to every existing caller/test, now derived from
 * `evaluateApplicabilityDetailed` rather than its own separate boolean pass,
 * so there is exactly one applicability-evaluation code path in this module
 * (Piece 1's own "Retrieval remains the single source of truth" requirement).
 */
export function isApplicable(requirements: ApplicabilityRequirement[], facts: ApplicabilityFacts): boolean {
  return evaluateApplicabilityDetailed(requirements, facts).every((o) => o.status === 'met')
}

/**
 * Provider pre-filter (Living Knowledge — Third-Party Source Rights, M3,
 * 2026-08-18, per THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md
 * §7-§11, PM-approved). `null` provider_scope (generic claim) always
 * passes -- unconditionally, regardless of `assetProviders`. A non-null
 * provider_scope passes only when at least one of its values is present in
 * `assetProviders` -- canonical, active, resolved identifiers only (see
 * `lookupTopicClaims`'s own call site: `assetProviders` is sourced from
 * `RetrievalHandoff.asset_providers`, which by construction (handoff.ts)
 * never contains an unresolved alias, raw text, or anything derived from a
 * ToolMention). This function is intentionally the ONLY place provider
 * matching happens -- it runs BEFORE Lifecycle/CRC-eligible/applicability
 * evaluation (see `lookupTopicClaims` below), so a provider mismatch never
 * contributes to `anyEligible`/`anyApplicable` bookkeeping and never
 * produces a diagnostic of its own. A mismatched claim is excluded from
 * `candidates` before the rest of the loop ever sees it -- structurally
 * indistinguishable from a claim that was never a candidate at all. No
 * `provider_scope_unmet` diagnostic exists anywhere in this codebase, per
 * explicit PM instruction -- filtering happens silently, by construction,
 * not by a diagnostic a downstream consumer must remember to suppress.
 */
export function providerScopeMatches(claim: TopicClaim, assetProviders: readonly string[]): boolean {
  if (claim.provider_scope === null) return true
  return claim.provider_scope.some((p) => assetProviders.includes(p))
}

export interface TopicLookupResult {
  matches: TopicClaim[]
  diagnostics: RetrievalDiagnostic[]
}

/**
 * Only ACTIVE (superseded_by === null), CONFIRMED goals are considered --
 * mirrors buildBoundedInterpretations' own filter exactly (a declined or
 * superseded goal has nothing to look up knowledge for).
 *
 * `assetProviders` (Living Knowledge — Third-Party Source Rights, M3,
 * 2026-08-18): additive, defaults to `[]` -- every pre-existing call site
 * continues to compile and behave identically without passing it (a
 * provider-scoped claim simply never matches when no providers are
 * supplied, which is exactly correct: no provider information means no
 * provider-specific claim can be a candidate). Canonical identifiers only
 * -- see `providerScopeMatches`'s own doc comment above for the exact
 * contract.
 *
 * `discoveredTopics` (Track A — Generic Discovered Relevance milestone,
 * 2026-08-21): additive, defaults to `[]`, same zero-behavior-change
 * discipline as every parameter above it. Unioned into
 * `activeGoalCategories` alongside the explicit-goal-derived categories --
 * a category present here is treated identically to one an explicit,
 * confirmed UserGoal already supplies for every purpose downstream of this
 * one union point (provider_scope/lifecycle/CRC-eligible/applicability
 * gating is completely unchanged, still runs exactly as before). Never a
 * UserGoal itself, never persisted, never fabricated -- see
 * lib/crc-engine/discovered-relevance.ts for how this list is derived
 * from structured evidence via an engineering-owned, fail-closed trigger
 * registry.
 */
export function lookupTopicClaims(
  goals: UserGoal[],
  topicClaims: TopicClaim[],
  facts: ApplicabilityFacts,
  assetProviders: string[] = [],
  discoveredTopics: GoalCategory[] = [],
): TopicLookupResult {
  const diagnostics: RetrievalDiagnostic[] = []
  const matches: TopicClaim[] = []
  const seen = new Set<string>()

  const activeGoalCategories = new Set<GoalCategory>([
    ...goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category),
    ...discoveredTopics,
  ])

  for (const category of activeGoalCategories) {
    // Provider pre-filter runs as part of computing `candidates` itself --
    // BEFORE Lifecycle/CRC-eligible/applicability evaluation below. A
    // provider-mismatched claim never enters this array at all, so it can
    // never affect `anyEligible`/`anyApplicable` or produce a diagnostic.
    const candidates = topicClaims
      .filter((c) => c.topic === category && c.superseded_by === null)
      .filter((c) => providerScopeMatches(c, assetProviders))

    if (candidates.length === 0) {
      diagnostics.push({ identifier: category, reason: 'no_topic_claim' })
      continue
    }

    let anyEligible = false
    let anyApplicable = false
    // Piece 1: aggregated across every eligible-but-inapplicable claim in
    // this category -- the diagnostic below is still emitted once per
    // category (unchanged shape), but now carries enough detail for
    // selector-questioning.ts to regroup by claim_id itself (§K of the
    // accepted design: need aggregation happens downstream, not here).
    const unmetDetail: UnmetApplicabilityDetail[] = []

    for (const claim of candidates) {
      if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue
      anyEligible = true

      const outcomes = evaluateApplicabilityDetailed(claim.applicability_requirements, facts)
      const isClaimApplicable = outcomes.every((o) => o.status === 'met')
      if (!isClaimApplicable) {
        for (const o of outcomes) {
          if (o.status !== 'met') unmetDetail.push({ claim_id: claim.claim_id, requirement: o.requirement, status: o.status })
        }
        continue
      }
      anyApplicable = true

      const dedupeKey = claim.claim_id
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      matches.push(claim)
    }

    if (!anyEligible) {
      diagnostics.push({ identifier: category, reason: 'not_adopted_or_eligible' })
    } else if (!anyApplicable) {
      diagnostics.push({ identifier: category, reason: 'applicability_unmet', unmet_applicability: unmetDetail })
    }
  }

  return { matches, diagnostics }
}
