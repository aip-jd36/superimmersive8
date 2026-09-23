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

import type { GoalCategory, ToolMention, UserGoal } from '@/types/interview-engine'
import type { ApplicabilityRequirement, ApplicabilityUnresolvedReason, RetrievalDiagnostic, TopicClaim, UnmetApplicabilityDetail } from './types'
import { validateApplicabilityAnyOf, type ApplicabilityAnyOfViolation } from './applicability-any-of-structural-validation'

/**
 * Assessment-jurisdiction membership facts (CRC Assessment-Jurisdiction
 * Mention Model, 2026-08-28, replacing the original `Attested<string>`
 * scalar per the accepted Jurisdiction Acquisition Contract semantic
 * diagnostic). `included`/`excluded` are already-derived, already-
 * canonicalization-agnostic raw value lists -- the current, non-superseded
 * assessment-jurisdiction mentions with confidence `confirmed` /
 * `confirmed_absent` respectively (plus the bounded legacy-scalar
 * compatibility bridge for a genuinely untouched session -- see
 * lib/crc-engine/assessment-jurisdiction-scope.ts, the single place this
 * derivation happens; Retrieval itself never reads `StructuredUnderstanding`
 * directly and remains unaware of mentions, supersession, or the legacy
 * bridge -- it only ever sees these two flat lists). A value present in
 * neither list is `unresolved` for every requirement referencing it -- never
 * inferred as included or excluded from silence.
 */
export interface AssessmentJurisdictionFacts {
  included: string[]
  excluded: string[]
}

/**
 * Only the two Phase 1 IMPLEMENTED fact sources -- see APPLICABILITY_FACTS'
 * own doc comment in types.ts for why the other three predicate types are
 * reserved, not evaluable, in Phase 1. `jurisdiction`'s own shape widened
 * 2026-08-28 (see AssessmentJurisdictionFacts above) from a single
 * `Attested<string>` to membership over a cardinality-many assessment scope
 * -- the fact NAME and its role in `ApplicabilityRequirement` are unchanged;
 * only how it is satisfied changed, so no governed claim needs any edit.
 */
export interface ApplicabilityFacts {
  jurisdiction: AssessmentJurisdictionFacts
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

/**
 * CRC-CC-SCOPE-3 (2026-09-23) -- the evaluator's own internal result shape,
 * computed together in one pass so `status` and `unresolved_reason` can
 * never drift apart or be derived by two independent code paths (see
 * `ApplicabilityUnresolvedReason`'s own header, types.ts, for the full
 * authority argument). `unresolved_reason` is `null` whenever `status` is
 * not `'unresolved'`, and remains `null` for any `'unresolved'` outcome no
 * evaluator branch below has opted into annotating.
 */
interface RequirementStatusOutcome {
  status: ApplicabilityRequirementStatus
  unresolved_reason: ApplicabilityUnresolvedReason | null
}

export interface ApplicabilityRequirementOutcome {
  requirement: ApplicabilityRequirement
  status: ApplicabilityRequirementStatus
  unresolved_reason: ApplicabilityUnresolvedReason | null
}

/**
 * Jurisdiction membership check (CRC Assessment-Jurisdiction Mention Model,
 * 2026-08-28). Deliberately a separate, self-contained three-way computation
 * rather than reducing to the generic single-`actual`-string pattern the
 * other two facts below still use -- `facts.jurisdiction` is now a
 * cardinality-many membership set (AssessmentJurisdictionFacts), not a
 * single attested value, so "the one confirmed value" no longer exists to
 * compare. Canonicalization is applied to every value on both sides before
 * comparison, same mechanism, same discipline as before this milestone.
 *
 * Precedence when a value appears in BOTH `included` and `excluded` after
 * canonicalization (a malformed state that correct mutation invariants
 * should make unreachable -- see supersedeAssessmentJurisdictionMention's
 * own single-active-mention-per-chain guarantee; this is defensive, not
 * expected): fail closed to `unresolved`, never guess by picking whichever
 * list happens to be checked first. A requirement is `met` only when the
 * required value is included AND not also excluded.
 *
 * CRC-CC-SCOPE-3 (2026-09-23): also computes `unresolved_reason` in the
 * SAME pass, from the SAME `includedMatch`/`isIncluded` already derived
 * above -- never a second, independent re-derivation (see
 * `ApplicabilityUnresolvedReason`'s own header, types.ts). Populated only
 * for `operator === 'equals'` (the sole operator this reason is authorized
 * for -- `not_equals` is explicitly out of scope and always gets `null`
 * here) when the requirement is genuinely `'unresolved'` AND at least one
 * OTHER value is already established (`facts.included.length > 0`, and by
 * construction this requirement's own value is not among them, since
 * `isIncluded` is false whenever this branch is reached). Explicit
 * exclusion already resolves to `not_met` above and never reaches this
 * field (see `ApplicabilityUnresolvedReason`'s own header for why
 * `excluded[]` needs no separate representation here).
 */
function evaluateJurisdictionRequirementStatus(req: ApplicabilityRequirement, facts: AssessmentJurisdictionFacts): RequirementStatusOutcome {
  const canonicalRequired = canonicalizeJurisdictionValue(req.value)
  const includedMatch = facts.included.some((v) => canonicalizeJurisdictionValue(v) === canonicalRequired)
  const excludedMatch = facts.excluded.some((v) => canonicalizeJurisdictionValue(v) === canonicalRequired)

  if (includedMatch && excludedMatch) return { status: 'unresolved', unresolved_reason: null } // conflicting current state -- fail closed, never guess
  const isIncluded = includedMatch
  const isExcluded = excludedMatch

  if (req.operator === 'equals') {
    if (isIncluded) return { status: 'met', unresolved_reason: null }
    if (isExcluded) return { status: 'not_met', unresolved_reason: null } // explicit exclusion -- silence is never treated this way, only a real confirmed_absent mention
    // never addressed at all -- not established, not the same as excluded.
    // `unresolved_reason` distinguishes "nothing established for this
    // dimension at all" (facts.included.length === 0) from "other value(s)
    // are established, just not this one" (facts.included.length > 0) --
    // status stays `'unresolved'` either way; only this additive, bounded
    // technical context differs.
    const unresolved_reason: ApplicabilityUnresolvedReason | null = facts.included.length > 0 ? 'value_not_among_established_values' : null
    return { status: 'unresolved', unresolved_reason }
  }

  // operator === 'not_equals': met when explicitly excluded, unresolved when
  // never addressed (never guessed from silence), not_met when explicitly
  // included. `unresolved_reason` is deliberately NEVER populated here --
  // `not_equals` is not authorized for this reason (an established OTHER
  // value says nothing about whether THIS value is excluded, unlike the
  // `equals` case -- see ApplicabilityUnresolvedReason's own header).
  if (isExcluded) return { status: 'met', unresolved_reason: null }
  if (isIncluded) return { status: 'not_met', unresolved_reason: null }
  return { status: 'unresolved', unresolved_reason: null }
}

/**
 * CRC-CC-SCOPE-3 (2026-09-23): `unresolved_reason` is `null` for both
 * scalar branches below (`tool_plan_tier`/`tool_account_status`) in every
 * case -- neither evaluator has opted into producing it, and a scalar
 * fact's own "confirmed but different value" case already resolves to
 * `'not_met'` (see the `matches` check below), never `'unresolved'`, so
 * the ambiguity this reason exists to describe cannot arise for a scalar
 * fact today regardless.
 */
function evaluateRequirementStatus(req: ApplicabilityRequirement, facts: ApplicabilityFacts): RequirementStatusOutcome {
  if (req.fact === 'jurisdiction') return evaluateJurisdictionRequirementStatus(req, facts.jurisdiction)

  let actual: string | undefined

  if (req.fact === 'tool_plan_tier') {
    const mention = facts.toolMentions.find(
      (m) => m.superseded_by === null && m.resolution.kind === 'canonical' && m.resolution.identifier === req.tool,
    )
    actual = mention && mention.plan_tier.state === 'confirmed' ? mention.plan_tier.value : undefined
  } else if (req.fact === 'tool_account_status') {
    // CRC Kling Governed Knowledge Correction + Decomposition milestone
    // (2026-08-24): identical lookup/scoping discipline to `tool_plan_tier`
    // immediately above -- same per-tool find, same `superseded_by`/`canonical`
    // filter, same "unconfirmed -> undefined -> unresolved" fallthrough below.
    // Reads `ToolMention.account_status`, a structurally distinct field from
    // `plan_tier` (see that field's own doc comment, types/interview-engine.ts).
    const mention = facts.toolMentions.find(
      (m) => m.superseded_by === null && m.resolution.kind === 'canonical' && m.resolution.identifier === req.tool,
    )
    actual = mention && mention.account_status.state === 'confirmed' ? mention.account_status.value : undefined
  }

  // Unconfirmed/unresolvable fact -> unresolved, never guessed. This is the
  // single mechanism that makes "jurisdiction unknown" and "wrong
  // jurisdiction" behave identically for isApplicable()'s own boolean
  // purposes (both fail the overall gate) while still being distinguishable
  // for selector-questioning purposes (one is worth asking about, the other
  // never is).
  if (actual === undefined) return { status: 'unresolved', unresolved_reason: null }

  const matches = req.operator === 'equals' ? actual === req.value : actual !== req.value
  return matches ? { status: 'met', unresolved_reason: null } : { status: 'not_met', unresolved_reason: null }
}

/** Piece 1: every requirement's outcome, in array order. Never filters -- callers needing only the unmet subset (e.g. diagnostic population below) filter this output themselves, so there is exactly one evaluation pass regardless of caller. */
export function evaluateApplicabilityDetailed(requirements: ApplicabilityRequirement[], facts: ApplicabilityFacts): ApplicabilityRequirementOutcome[] {
  return requirements.map((requirement) => {
    const outcome = evaluateRequirementStatus(requirement, facts)
    return { requirement, status: outcome.status, unresolved_reason: outcome.unresolved_reason }
  })
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

// ── Generic Shallow Applicability Expression evaluator (ADR-001-generic-
// applicability-architecture.md §K, PM Freeze Amendment, 2026-09-15;
// Generic Shallow Applicability -- Runtime Foundation milestone) ───────────
//
// The SOLE evaluator of `TopicClaim.applicability_any_of`/
// `MatrixClaim.applicability_any_of`'s OR/AND structure. No other module in
// this codebase may independently interpret that structure (ADR-001
// §K.7/§K.9) -- every consumer (Retrieval, Track B, Bounded Interpretation)
// must call `evaluateApplicabilityExpression` and read only its
// authoritative `status` and centrally-derived `material_unresolved`
// output, never rescan `all_outcomes` to (re)derive either.

/** Kleene strong three-valued AND -- `not_met` dominates, `met` is the identity, two `unresolved` stay `unresolved`. Frozen, ADR-001 §K.4. Not exported -- no consumer may implement this algebra independently. */
function andStatus(a: ApplicabilityRequirementStatus, b: ApplicabilityRequirementStatus): ApplicabilityRequirementStatus {
  if (a === 'not_met' || b === 'not_met') return 'not_met'
  if (a === 'unresolved' || b === 'unresolved') return 'unresolved'
  return 'met'
}

/** Kleene strong three-valued OR -- `met` dominates, `not_met` is the identity, two `unresolved` stay `unresolved`. Frozen, ADR-001 §K.4. Not exported -- no consumer may implement this algebra independently. */
function orStatus(a: ApplicabilityRequirementStatus, b: ApplicabilityRequirementStatus): ApplicabilityRequirementStatus {
  if (a === 'met' || b === 'met') return 'met'
  if (a === 'unresolved' || b === 'unresolved') return 'unresolved'
  return 'not_met'
}

/** AND-reduces a group's own per-leaf outcomes to one status. `[].reduce(andStatus, 'met')` = `'met'` for an empty group -- the existing, unchanged vacuous-truth convention `applicability_requirements: []` already relies on. */
function groupStatus(outcomes: ApplicabilityRequirementOutcome[]): ApplicabilityRequirementStatus {
  return outcomes.reduce((acc, o) => andStatus(acc, o.status), 'met' as ApplicabilityRequirementStatus)
}

interface EvaluatedGroup {
  status: ApplicabilityRequirementStatus
  outcomes: ApplicabilityRequirementOutcome[]
}

function evaluateGroup(group: ApplicabilityRequirement[], facts: ApplicabilityFacts): EvaluatedGroup {
  const outcomes = evaluateApplicabilityDetailed(group, facts)
  return { status: groupStatus(outcomes), outcomes }
}

/**
 * The one authoritative applicability conclusion any downstream consumer may
 * use (ADR-001 §K.6). `status` is sole authority. `material_unresolved` is
 * the sole centrally-derived unresolved-dependency source (ADR-001 §K.5) --
 * empty unless `status === 'unresolved'`. `all_outcomes` is NON-AUTHORITATIVE
 * diagnostic/provenance detail (every leaf this expression evaluated,
 * mandatory group first, then each alternative group in order) -- no
 * downstream consumer may rescan it to (re)derive `status` or materiality.
 */
/**
 * A material-unresolved entry's status is always `'unresolved'` by
 * construction (see `evaluateApplicabilityExpression`'s own materiality
 * derivation) -- narrowed here, not just at the value level, so a caller
 * converting this into an `UnmetApplicabilityDetail` (whose own `status`
 * excludes `'met'`) never needs an unsound cast.
 *
 * `unresolved_reason` (CRC-CC-SCOPE-3, 2026-09-23): verbatim passthrough of
 * the same field on the leaf `ApplicabilityRequirementOutcome` this entry
 * was derived from -- see `ApplicabilityUnresolvedReason`'s own header
 * (types.ts) for the full authority argument.
 */
export interface MaterialUnresolvedOutcome {
  requirement: ApplicabilityRequirement
  status: 'unresolved'
  unresolved_reason: ApplicabilityUnresolvedReason | null
}

export interface ApplicabilityExpressionOutcome {
  status: ApplicabilityRequirementStatus
  material_unresolved: MaterialUnresolvedOutcome[]
  all_outcomes: ApplicabilityRequirementOutcome[]
}

/**
 * Invalid governed applicability (ADR-001 §K.3) -- structurally distinct
 * from every valid `status` value, never a fourth normal applicability
 * state. Produced only when `applicability_any_of` itself fails
 * `validateApplicabilityAnyOf` (defense-in-depth: this can only happen today
 * if malformed data somehow bypasses the TypeScript-typed fixture files and
 * the test-time consistency guard, per ADR-001 §K.8). A caller receiving
 * this MUST exclude the claim from candidacy (mirroring how a settled
 * `not_met` claim is already excluded) via a diagnostic path distinguishable
 * from `applicability_unmet` -- never feeding `violations` into
 * `unresolvedRequirementsIfClaimStillEligible`/materiality/Track B, never an
 * ordinary `unresolved_project_dependencies` string, never silently
 * reinterpreted as `met` or `not_met`.
 */
export interface ApplicabilityExpressionInvalid {
  valid: false
  violations: ApplicabilityAnyOfViolation[]
}

export type ApplicabilityExpressionResult = ({ valid: true } & ApplicabilityExpressionOutcome) | ApplicabilityExpressionInvalid

/**
 * The sole evaluator of the combined mandatory-AND-group-plus-alternative-
 * AND-groups expression (ADR-001 §K.1/§K.4-§K.6):
 *
 *   MANDATORY    = AND(mandatory)                            -- unchanged, today's existing flat-array meaning
 *   ALTERNATIVES = MET (no-op) if alternatives is undefined, else OR(AND(group_1), AND(group_2), ...)
 *   AGGREGATE    = AND(MANDATORY, ALTERNATIVES)
 *
 * `alternatives` absent (every production claim today) makes `ALTERNATIVES`
 * vacuously `met`, so `AGGREGATE` collapses to exactly `MANDATORY` -- byte-
 * identical to `isApplicable`'s existing behavior for every current claim
 * (ADR-001 §K.1's own backward-compatibility guarantee).
 *
 * Material-unresolved derivation (ADR-001 §K.5): only computed when
 * `AGGREGATE === 'unresolved'` (nothing is material once the aggregate has
 * already resolved either way). Within that case, a leaf is material iff its
 * own immediate AND-group's status is not `'not_met'` (no `not_met` sibling
 * -- the group remains "live"). The mandatory group and each alternative
 * group are each checked independently by this same rule.
 */
export function evaluateApplicabilityExpression(
  mandatory: ApplicabilityRequirement[],
  alternatives: ApplicabilityRequirement[][] | undefined,
  facts: ApplicabilityFacts,
): ApplicabilityExpressionResult {
  if (alternatives !== undefined) {
    const violations = validateApplicabilityAnyOf(alternatives)
    if (violations.length > 0) return { valid: false, violations }
  }

  const mandatoryGroup = evaluateGroup(mandatory, facts)
  const alternativeGroups = alternatives === undefined ? [] : alternatives.map((group) => evaluateGroup(group, facts))
  const alternativesStatus: ApplicabilityRequirementStatus = alternatives === undefined ? 'met' : alternativeGroups.reduce((acc, g) => orStatus(acc, g.status), 'not_met' as ApplicabilityRequirementStatus)

  const status = andStatus(mandatoryGroup.status, alternativesStatus)

  const all_outcomes = [...mandatoryGroup.outcomes, ...alternativeGroups.flatMap((g) => g.outcomes)]

  const material_unresolved: MaterialUnresolvedOutcome[] = []
  if (status === 'unresolved') {
    if (mandatoryGroup.status !== 'not_met') {
      for (const o of mandatoryGroup.outcomes)
        if (o.status === 'unresolved') material_unresolved.push({ requirement: o.requirement, status: 'unresolved', unresolved_reason: o.unresolved_reason })
    }
    for (const g of alternativeGroups) {
      if (g.status === 'not_met') continue
      for (const o of g.outcomes)
        if (o.status === 'unresolved') material_unresolved.push({ requirement: o.requirement, status: 'unresolved', unresolved_reason: o.unresolved_reason })
    }
  }

  return { valid: true, status, material_unresolved, all_outcomes }
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

/**
 * Tool pre-filter (Living Knowledge — Canonical Tool-Scope Primitive, LK-7,
 * 2026-08-29). Structurally identical to `providerScopeMatches` immediately
 * above -- same null-is-generic, non-empty-array-requires-membership
 * semantics, same "runs before Lifecycle/CRC-eligible/applicability, no
 * diagnostic of its own" placement (see `lookupTopicClaims` below). A
 * deliberately separate function, not a generalized "scope matches" helper
 * shared with `providerScopeMatches` -- see `TopicClaim.tool_scope`'s own
 * doc comment (types.ts) for why tool and provider identity are kept
 * structurally independent throughout this codebase. `activeToolIds` must be
 * canonical, active, resolved tool identifiers only (never an unresolved
 * alias, never a raw `AssetProviderMention` identifier) -- see this
 * function's own call site below for the exact source
 * (`RetrievalHandoff.tools`, already computed by `buildRetrievalHandoff`).
 * This function narrows an already topic-matched claim only -- it never
 * decides topic relevance itself and must never be called, or have its
 * result treated as, a substitute for the existing goal/Track-A relevance
 * gate.
 */
export function toolScopeMatches(claim: TopicClaim, activeToolIds: readonly string[]): boolean {
  if (claim.tool_scope === null) return true
  return claim.tool_scope.some((t) => activeToolIds.includes(t))
}

/**
 * Distribution-territory DISCOVERY-CANDIDATE test (Generic Orthogonal-Fact
 * Discovery — TopicRelationship Authorization milestone, 2026-09-11,
 * correcting the original Generic Distribution/Output-Use Territory
 * Contract, 2026-09-11). Structurally similar to `providerScopeMatches`/
 * `toolScopeMatches` immediately above -- same exact-literal, case-
 * insensitive matching shape -- but with a DELIBERATELY INVERTED null-check
 * (see `TopicClaim.geographic_relevance_scope`'s own doc comment, types.ts,
 * for the full rationale) AND A DIFFERENT ROLE: this function answers ONLY
 * "is this claim a candidate the stated territory makes potentially
 * relevant" (Core Distinction A, discovery condition) -- it is NEVER a
 * downstream narrowing filter over an already-topic-relevant candidate set,
 * unlike `providerScopeMatches`/`toolScopeMatches`. It is called from
 * `deriveClaimTargetedDiscoveryOccurrences` (lib/crc-engine/
 * discovered-relevance.ts) -- one-way import, crc-engine consuming a pure
 * retrieval-engine function, the same established dependency direction
 * crc-engine already uses for `TopicClaim`/`TopicRelationship` types --
 * NEVER from `lookupTopicClaims` or `lookupDiscoveredTopicClaims`. Which
 * EXPLICIT GOAL a resulting candidate may actually inform is a wholly
 * separate, independently governed question -- see
 * `relationshipIsAdoptedAndCrcEligible` (lookup-topic-relationships.ts) and
 * `deriveClaimTargetedDiscoveryOccurrences`'s own header for that half.
 *
 * `claim.geographic_relevance_scope == null` (covers both `null` and
 * `undefined` -- see the field's own optionality doc comment) means this
 * claim does NOT participate in territory-driven discovery -- returns
 * `false`, the inverse of `providerScopeMatches`/`toolScopeMatches`'s `true`
 * for their own null case. A non-empty array matches case-insensitively
 * against `distributionTerritories` (raw, user-stated literal values --
 * never canonicalized, never passed through an alias table).
 */
export function territoryRelevanceMatches(claim: TopicClaim, distributionTerritories: readonly string[]): boolean {
  if (claim.geographic_relevance_scope == null) return false
  const scope = claim.geographic_relevance_scope.map((v) => v.toLowerCase())
  return distributionTerritories.some((t) => scope.includes(t.toLowerCase()))
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

/**
 * Extracted (CRC Generic Applicability Readiness milestone, 2026-08-24) from
 * this function's own former inline computation -- byte-identical logic,
 * now a small, shared, exported primitive so `applicability-readiness.ts`'s
 * Matrix-path gap derivation can apply the exact same explicit-goal-
 * relevance rule TopicClaim retrieval already enforces structurally via its
 * own goal-driven lookup, rather than reproducing this one-line filter a
 * second time. Deliberately excludes discovered-topic categories (unlike
 * `lookupTopicClaims`'s own `activeGoalCategories`, which unions them in) --
 * this helper answers only "which categories does an EXPLICIT, confirmed
 * UserGoal currently supply," the exact question selector-readiness needs
 * (explicit-goal-only policy) and the exact question this function's own
 * inline computation always answered before Track A discovery was unioned
 * in at the call site.
 */
export function activeConfirmedGoalCategories(goals: UserGoal[]): Set<GoalCategory> {
  return new Set(goals.filter((g) => g.superseded_by === null && g.state === 'confirmed').map((g) => g.category))
}

/**
 * `activeToolIds` (Living Knowledge — Canonical Tool-Scope Primitive, LK-7,
 * 2026-08-29): additive, defaults to `[]` -- every pre-existing call site
 * continues to compile and behave identically without passing it (a
 * tool-scoped claim simply never matches when no tool identifiers are
 * supplied, which is exactly correct: no tool information means no
 * tool-specific claim can be a candidate). Placed last, after the
 * pre-existing `discoveredTopics` parameter, so no existing positional call
 * site is disturbed. Canonical identifiers only -- see `toolScopeMatches`'s
 * own doc comment above for the exact contract. Deliberately NOT unioned
 * into `activeGoalCategories` or treated as a relevance signal of any kind
 * -- a tool identifier being present here narrows candidacy for claims that
 * are ALREADY topic-matched; it never causes a claim to become topic-matched
 * on its own (see `TopicClaim.tool_scope`'s own doc comment for the full
 * boundary). No Track A discovered-relevance behavior is introduced or
 * implied by this parameter.
 */
export function lookupTopicClaims(
  goals: UserGoal[],
  topicClaims: TopicClaim[],
  facts: ApplicabilityFacts,
  assetProviders: string[] = [],
  discoveredTopics: GoalCategory[] = [],
  activeToolIds: string[] = [],
): TopicLookupResult {
  const diagnostics: RetrievalDiagnostic[] = []
  const matches: TopicClaim[] = []
  const seen = new Set<string>()

  const activeGoalCategories = new Set<GoalCategory>([...activeConfirmedGoalCategories(goals), ...discoveredTopics])

  for (const category of activeGoalCategories) {
    // Provider pre-filter runs as part of computing `candidates` itself --
    // BEFORE Lifecycle/CRC-eligible/applicability evaluation below. A
    // provider-mismatched claim never enters this array at all, so it can
    // never affect `anyEligible`/`anyApplicable` or produce a diagnostic.
    // Tool pre-filter (LK-7) runs the same way, independently -- a claim
    // must pass BOTH gates (when both scope fields are non-null) to remain
    // a candidate; see `toolScopeMatches`'s own doc comment.
    const candidates = topicClaims
      .filter((c) => c.topic === category && c.superseded_by === null)
      .filter((c) => providerScopeMatches(c, assetProviders))
      .filter((c) => toolScopeMatches(c, activeToolIds))

    if (candidates.length === 0) {
      diagnostics.push({ identifier: category, reason: 'no_topic_claim' })
      continue
    }

    let anyEligible = false
    // Piece 1: aggregated across every eligible-but-inapplicable claim in
    // this category -- the diagnostic below is still emitted once per
    // category (unchanged shape), but now carries enough detail for
    // selector-questioning.ts to regroup by claim_id itself (§K of the
    // accepted design: need aggregation happens downstream, not here).
    //
    // Generic Shallow Applicability -- Runtime Foundation milestone
    // (2026-09-15): the applicability CALCULATION now goes through
    // `evaluateApplicabilityExpression` (mandatory + optional
    // `applicability_any_of` alternatives), replacing the direct
    // `evaluateApplicabilityDetailed`/`.every()` pair -- the inclusion/
    // exclusion POLICY below is otherwise byte-for-byte unchanged: only
    // `status === 'met'` reaches `matches[]`; anything else contributes
    // diagnostic detail and is excluded. `unmetDetail` is now populated from
    // the evaluator's own centrally-derived `material_unresolved` (ADR-001
    // §K.5), not a raw leaf dump -- for every claim that has no
    // `applicability_any_of` (every production claim today), this is
    // byte-identical to the old population (a single mandatory AND-group's
    // own unresolved leaves, with no `not_met` sibling in that same group --
    // exactly the case the old code's `outcomes` loop already produced,
    // since a `not_met` sibling there always forced the WHOLE flat array's
    // old boolean to `false` too). Invalid governed applicability (ADR-001
    // §K.3) is aggregated separately, per category, and never contributes to
    // `unmetDetail` -- see the dedicated `applicability_invalid_governance`
    // diagnostic below.
    const unmetDetail: UnmetApplicabilityDetail[] = []
    const invalidGovernanceClaimIds: string[] = []
    // Tracked independently of `unmetDetail.length` (Generic Shallow
    // Applicability -- Runtime Foundation milestone, 2026-09-15): a claim
    // whose own aggregate is `not_met` now contributes NOTHING to
    // `unmetDetail` (ADR-001 §K.5 -- nothing is material once a claim's own
    // expression has settled false), but `build-bounded-interpretation.ts`'s
    // own Case 3A detection (`hasUnmetApplicability`) keys on DIAGNOSTIC
    // PRESENCE alone (`reason === 'applicability_unmet'`), never on
    // `unmet_applicability`'s content -- see that module's own
    // `hasUnmetApplicability` line. This flag preserves that existing
    // consumer policy exactly: the diagnostic still fires whenever any
    // eligible, validly-governed claim in this category failed to fully
    // match, even when nothing in it is materially unresolved.
    let anyNonMet = false

    for (const claim of candidates) {
      if (claim.lifecycle !== 'Adopted' || claim.crc_eligible !== 'Yes') continue
      anyEligible = true

      const result = evaluateApplicabilityExpression(claim.applicability_requirements, claim.applicability_any_of, facts)

      if (!result.valid) {
        invalidGovernanceClaimIds.push(claim.claim_id)
        continue
      }

      if (result.status !== 'met') {
        anyNonMet = true
        for (const o of result.material_unresolved)
          unmetDetail.push({ claim_id: claim.claim_id, requirement: o.requirement, status: o.status, unresolved_reason: o.unresolved_reason })
        continue
      }

      const dedupeKey = claim.claim_id
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      matches.push(claim)
    }

    // CRC Generic Applicability Diagnostic Parity milestone (2026-08-24):
    // gated on `anyNonMet` (was `unmetDetail.length > 0` before the Generic
    // Shallow Applicability -- Runtime Foundation milestone, 2026-09-15,
    // decoupled these two for the reason explained on `anyNonMet`'s own
    // comment above), NOT on `!anyApplicable` (the original, pre-2026-08-24
    // condition) -- that original condition silently discarded a
    // fully-computed unmet-detail whenever ANY sibling claim in the same
    // category was applicable, so a category with one matched claim and one
    // genuinely unresolved/not_met sibling produced no diagnostic at all for
    // the sibling. `anyNonMet` is a strict generalization: when no claim in
    // the category is applicable (the pre-existing Case 3A shape), every
    // eligible candidate necessarily sets it, so this branch fires
    // identically to before -- zero behavior change for that case. It
    // additionally fires in the previously-suppressed mixed case, without
    // ever changing which claims reach `matches[]` above (that loop is
    // completely untouched).
    if (!anyEligible) {
      diagnostics.push({ identifier: category, reason: 'not_adopted_or_eligible' })
    } else {
      if (anyNonMet) diagnostics.push({ identifier: category, reason: 'applicability_unmet', unmet_applicability: unmetDetail })
      // Invalid-governance defense (ADR-001 §K.3): a distinct diagnostic,
      // never carrying `unmet_applicability` -- never feeds materiality,
      // never creates a Track B need, never silently reinterpreted as
      // `applicability_unmet`. Unreachable for any production claim today
      // (every `applicability_any_of` is absent or already valid).
      if (invalidGovernanceClaimIds.length > 0) diagnostics.push({ identifier: category, reason: 'applicability_invalid_governance' })
    }
  }

  return { matches, diagnostics }
}
