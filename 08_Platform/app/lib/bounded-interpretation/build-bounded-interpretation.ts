/**
 * Bounded Interpretation composition (CRC Milestone 2, 2026-08-15;
 * extended for Case 3A/3B during the Living Knowledge governance review,
 * 2026-08-16). Pure function: active, confirmed user goals +
 * already-computed RetrievalResult[] (+ optional RetrievalDiagnostic[]) ->
 * BoundedInterpretation[]. No new inference, no fact-conditional matching
 * added to Retrieval, no model call.
 *
 * Only goals that are both ACTIVE (`superseded_by === null`) and
 * `state === 'confirmed'` produce an interpretation — a declined,
 * confirmed_absent, or superseded goal has no "thing the user actually
 * asked" left to interpret (mirrors PM invariant #8: "positive
 * interpretation requires confirmed fact").
 *
 * `diagnostics` (new, additive, defaults to `[]` -- every pre-existing
 * caller/test continues to compile and behave identically without
 * passing it): this module's only use of it is Case 3A detection --
 * "does this goal's category have an `applicability_unmet`
 * RetrievalDiagnostic," meaning a formally-gated claim exists but its
 * required fact (jurisdiction, tool plan tier) isn't confirmed. This
 * module never re-derives applicability itself, never reads
 * `ApplicabilityRequirement`/`isApplicable()` directly, and never imports
 * anything from Retrieval's LOGIC modules to compute this -- it only
 * reads a diagnostic Retrieval already produced, exactly the same
 * "lookup, not inference" discipline this module's own header always
 * described for `results`.
 */

import type { RetrievalDiagnostic, RetrievalResult } from '@/lib/retrieval-engine/types'
import type { Attested, UserGoal } from '@/types/interview-engine'
import type { BoundedInterpretation, UnresolvedRelevantClaim } from './types'
import {
  DETERMINATION_DECLINED_TEMPLATE,
  directlyRelevantSummary,
  humanContributionRelevanceSentence,
  outsideCoverageSummary,
  relevantApplicabilityUnresolvedNoContentSummary,
  relevantApplicabilityUnresolvedWithContentBlocks,
  relevantApplicabilityUnresolvedWithContentSummary,
} from './rules'

const HUMAN_CONTRIBUTION_DEPENDENCY = 'human_contribution_description'

/**
 * CC-1 — Claim-Level Bounded Grouping (2026-08-21, PM/Architecture-
 * authorized, narrowly scoped). Mechanical, representation-neutral read of
 * existing governance metadata Retrieval already passed through -- not a
 * new fact, not an inference. Deliberately named for what the array
 * literally contains ("has a governed project dependency"), never
 * "resolved"/"unresolved_issue_resolved"/"cleared"/"safe" -- per the
 * follow-up diagnostic (2026-08-21), a `length === 0` result never means
 * the underlying project fact was checked, confirmed, or resolved; it only
 * means this mechanism represents no governed project dependency for that
 * claim. See build-bounded-interpretation.ts's own module header and
 * rules.ts's own doc comment on relevantApplicabilityUnresolvedWithContentSummary
 * for how this boolean is used -- to GROUP already-selected, already-quoted
 * claim statements, never to rank, explain, or strengthen them.
 */
function hasGovernedProjectDependencies(match: RetrievalResult): boolean {
  return match.unresolved_project_dependencies.length > 0
}

/**
 * H5 -- minimal echo-only relevance composition (Copyright UAT Correction
 * Milestone, 2026-08-19, PM-approved narrow scope, exact conditions A/B/C
 * from the milestone task). NOT full Project-Fact-Aware Bounded Composition
 * (still deferred, still unauthorized) -- this decides only WHETHER to
 * additionally echo the user's own self-reported contribution alongside
 * the existing, unchanged Case 3B hedge; it does not select claims
 * differently, rank contribution, or mark any dependency resolved.
 *
 * A. the goal this interpretation is for is copyright_ownership or
 *    copyrightability;
 * B. at least one matched claim carries 'human_contribution_description'
 *    in its unresolved_project_dependencies (a read of existing governance
 *    metadata Retrieval already passed through -- see RetrievalResult's
 *    own `unresolved_project_dependencies` field, a passthrough of
 *    TopicClaim's own field);
 * C. ProjectFacts.human_contribution_description is confirmed.
 *
 * All three must hold. This function makes no claim-selection or wording
 * decision beyond that boolean -- rules.ts's own humanContributionRelevanceSentence
 * owns the actual fixed, deterministic sentence.
 */
function shouldIncludeHumanContributionSentence(
  category: UserGoal['category'],
  matches: RetrievalResult[],
  humanContributionDescription: Attested<string>,
): boolean {
  const concernsHumanContributionGoal = category === 'copyright_ownership' || category === 'copyrightability'
  const matchedClaimCarriesDependency = matches.some((m) => m.unresolved_project_dependencies.includes(HUMAN_CONTRIBUTION_DEPENDENCY))
  const contributionConfirmed = humanContributionDescription.state === 'confirmed'
  return concernsHumanContributionGoal && matchedClaimCarriesDependency && contributionConfirmed
}

/**
 * Generic Mixed-Resolution Bounded Interpretation milestone (2026-08-24,
 * following the CRC Generic Mixed-Resolution Bounded Interpretation Design
 * Diagnostic of the same date). Confirmed gap this closes: when at least one
 * claim already matched a goal's category, this module previously returned
 * immediately from the `matches.length > 0` branch below without ever
 * consulting `diagnostics` again -- so a DIFFERENT, also-relevant,
 * CRC-eligible governed claim for the SAME category that Retrieval withheld
 * only because its `applicability_requirements` gate is `'unresolved'`
 * (never `'not_met'`) was silently dropped before Projection/Composition
 * could ever know it existed. This is the exact case Case 3A (below, in
 * `buildBoundedInterpretations` itself) already handles correctly for "no
 * resolved claim + relevant applicability unresolved" -- but Case 3A's own
 * diagnostic check is reachable only when `matches.length === 0`, so it
 * never ran for this case either. This function does not replace or modify
 * Case 3A; it fills the gap Case 3A structurally cannot reach.
 *
 * Reads ONLY already-computed `RetrievalDiagnostic`/`UnmetApplicabilityDetail`
 * data (lib/retrieval-engine/types.ts) -- never re-runs `isApplicable`/
 * `evaluateApplicabilityDetailed` itself, mirroring this module's own
 * existing "lookup, not inference" discipline for `results` and Case 3A's
 * own diagnostic-reading discipline exactly.
 *
 * `status === 'unresolved'` only -- `'not_met'` entries are a settled
 * exclusion (the claim genuinely does not apply to the current project
 * state) and must never appear here; collapsing the two would misrepresent
 * a known-false fact as an open question. `matchedClaimIds` is a defensive
 * exclusion, not a load-bearing one: a single `evaluateApplicabilityDetailed`
 * pass per claim means a claim_id can never simultaneously appear in both
 * `matches[]` and an `applicability_unmet` diagnostic for the same category
 * today, but excluding it here costs nothing and keeps the invariant
 * explicit rather than assumed.
 *
 * Source-blind across TopicClaim/MatrixClaim/discovered-topic origin --
 * this function only ever reads `RetrievalDiagnostic.identifier`/`reason`/
 * `unmet_applicability`, the same uniform shape every Retrieval path already
 * produces; there is no `if (source === ...)` branch anywhere in this file.
 */
function collectUnresolvedRelevantClaimIds(category: UserGoal['category'], diagnostics: RetrievalDiagnostic[], matchedClaimIds: Set<string>): UnresolvedRelevantClaim[] {
  const ids = new Set<string>()
  for (const diagnostic of diagnostics) {
    if (diagnostic.identifier !== category || diagnostic.reason !== 'applicability_unmet' || !diagnostic.unmet_applicability) continue
    for (const detail of diagnostic.unmet_applicability) {
      if (detail.status !== 'unresolved') continue
      if (matchedClaimIds.has(detail.claim_id)) continue
      ids.add(detail.claim_id)
    }
  }
  return Array.from(ids, (claim_id) => ({ claim_id }))
}

export function buildBoundedInterpretations(
  goals: UserGoal[],
  results: RetrievalResult[],
  diagnostics: RetrievalDiagnostic[] = [],
  humanContributionDescription: Attested<string> = { state: 'unknown' },
): BoundedInterpretation[] {
  const activeConfirmedGoals = goals.filter((g) => g.superseded_by === null && g.state === 'confirmed')

  return activeConfirmedGoals.map((goal) => {
    // Scope check first, unconditionally -- a determination request never
    // receives a category-specific coverage answer, even when a matching
    // claim exists, per PM revision 2/3: answering the category question
    // at all would still be issuing something CRC doesn't issue.
    if (goal.scope === 'determination_request') {
      return buildInterpretation(goal, 'determination_declined', DETERMINATION_DECLINED_TEMPLATE, [DETERMINATION_DECLINED_TEMPLATE], [])
    }

    // matched_goal_category, not topic (Governed Topic Relationships
    // milestone, 2026-08-16): topic is the claim's OWN intrinsic subject
    // and stays unchanged for a related_topic result (e.g.
    // 'copyrightability'), so matching on it would silently exclude every
    // related-topic result from ever reaching a goal. matched_goal_category
    // is the field Retrieval sets specifically to answer "which goal caused
    // this result to surface" -- equals topic for every pre-existing
    // exact_topic result (tool or direct topic match), so this is a
    // behavior-preserving generalization, not a new matching concept.
    const matches = results.filter((r) => r.matched_goal_category === goal.category)
    if (matches.length > 0) {
      // Generic Mixed-Resolution Bounded Interpretation milestone
      // (2026-08-24): computed once per goal, used by BOTH return paths
      // below (Case 3B/CC-1 and plain directly_relevant) -- never by the
      // defensive `combinedStatement === ''` fallback a few lines down,
      // which renders as `outside_current_coverage` and keeps that status's
      // existing (empty) representation unchanged.
      const unresolvedRelevantClaims = collectUnresolvedRelevantClaimIds(
        goal.category,
        diagnostics,
        new Set(matches.map((m) => m.claim_id)),
      )
      // Multiple matches are possible (e.g. two mentioned tools both tagged
      // 'commercial_use') -- join every matched claim's own governed
      // statement rather than picking just one, since dropping a
      // retrieved, eligible claim silently would be its own kind of
      // omission this pipeline otherwise avoids everywhere else.
      const combinedStatement = matches.map((m) => m.candidate_statement).filter((s): s is string => s !== null).join(' ')
      const claimIds = matches.map((m) => m.claim_id)
      // Whether ANY matched claim was reached via a governed relationship
      // rather than directly -- drives the generic, fixed epistemic-
      // boundary clause in rules.ts (never a topic-interpolated sentence,
      // per PM's explicit override of the design report's original
      // proposal). M2 never reads relationship_id, rationale, or any
      // internal topic name beyond this boolean.
      const includesRelatedTopicContent = matches.some((m) => m.match_origin === 'related_topic')
      if (combinedStatement === '') {
        // Defensive: every 'directly_relevant'-eligible RetrievalResult in
        // practice carries a non-null candidate_statement (assembleResult
        // never emits a result without one for a Yes claim -- see
        // retrieval-engine/assemble-result.ts), so this branch is not
        // reachable with the current Matrix. Falls back to
        // outside_current_coverage rather than rendering an empty
        // sentence, never fabricating claim text to fill the gap.
        return buildInterpretation(goal, 'outside_current_coverage', outsideCoverageSummary(goal.category), [outsideCoverageSummary(goal.category)], [])
      }

      // Case 3B (Living Knowledge governance review, 2026-08-16): every
      // matched claim already passed its formal applicability gate(s) --
      // this is a read of RetrievalResult.unresolved_project_dependencies,
      // governance metadata Retrieval already carried through, never a
      // new fact-matching capability. If ANY matched claim's real-world
      // application still depends on project facts CRC doesn't model,
      // the whole combined statement renders under the unresolved-
      // applicability template instead of directly_relevant -- content is
      // still quoted (matches directly_relevant's own quoting discipline),
      // only the closing sentence and status differ.
      if (matches.some(hasGovernedProjectDependencies)) {
        // CC-1 -- Claim-Level Bounded Grouping (2026-08-21): the prior
        // single `combinedStatement` flattened every matched claim
        // (dependency-bearing and dependency-free alike) into one join,
        // then applied the SAME unresolved-applicability hedge to all of
        // it -- including a claim (e.g. a tool-sourced commercial-use
        // claim) that carries no governed project dependency at all. This
        // preserves both claim-level groups as distinguishable, still-
        // verbatim `candidate_statement` clauses instead: dependency-
        // bearing matches keep the existing hedge/status exactly as
        // before; dependency-free matches (if any are ALSO present for
        // this goal) are rendered via the same fixed boundary language
        // `directly_relevant` already uses for a dependency-free claim --
        // no new wording, no positive project-state conclusion. The
        // overall goal `status` remains 'relevant_applicability_unresolved'
        // unchanged (still triggered by the same `.some()` check above,
        // just now backed by the named helper instead of an inline
        // expression -- behavior-identical refactor).
        const dependencyBearingMatches = matches.filter(hasGovernedProjectDependencies)
        const noDependencyMatches = matches.filter((m) => !hasGovernedProjectDependencies(m))

        const dependencyBearingStatement = dependencyBearingMatches
          .map((m) => m.candidate_statement)
          .filter((s): s is string => s !== null)
          .join(' ')
        const noDependencyStatement =
          noDependencyMatches.length > 0
            ? noDependencyMatches
                .map((m) => m.candidate_statement)
                .filter((s): s is string => s !== null)
                .join(' ') || null
            : null
        const noDependencyAllToolSourced = noDependencyMatches.every((m) => m.source_fact.kind === 'tool')

        // H5 (Copyright UAT Correction Milestone, 2026-08-19): additive
        // only -- when all three conditions hold, a bounded, deterministic
        // sentence echoing the user's own self-reported contribution is
        // inserted BEFORE the unchanged closing hedge below; otherwise this
        // renders byte-identical to before H5 existed. Still evaluated
        // against ALL matches (unchanged) -- H5's own gating is untouched
        // by this milestone.
        const humanContributionSentence = shouldIncludeHumanContributionSentence(goal.category, matches, humanContributionDescription)
          ? humanContributionRelevanceSentence(humanContributionDescription.state === 'confirmed' ? humanContributionDescription.value : '')
          : null
        return buildInterpretation(
          goal,
          'relevant_applicability_unresolved',
          relevantApplicabilityUnresolvedWithContentSummary(
            goal.category,
            dependencyBearingStatement,
            includesRelatedTopicContent,
            humanContributionSentence,
            noDependencyStatement,
            noDependencyAllToolSourced,
          ),
          // CRC Email/UI Structural Readability -- Phase 1 (2026-08-23):
          // the ordered-blocks sibling of the summary call directly above,
          // same inputs, same authority, same words -- see rules.ts's own
          // doc comment for why `blocks.join(' ')` reconstructs the
          // `summary` string above byte-for-byte.
          relevantApplicabilityUnresolvedWithContentBlocks(
            goal.category,
            dependencyBearingStatement,
            includesRelatedTopicContent,
            humanContributionSentence,
            noDependencyStatement,
            noDependencyAllToolSourced,
          ),
          claimIds,
          unresolvedRelevantClaims,
        )
      }

      // Source-aware boundary clause (LK Phase 1 governance refinement,
      // 2026-08-16) -- see rules.ts's own boundaryClause doc comment. Every
      // matched RetrievalResult already carries its own source_fact.kind;
      // this is a read of existing data, not a new fact or new matching
      // logic.
      const allToolSourced = matches.every((m) => m.source_fact.kind === 'tool')
      const directlyRelevantResult = directlyRelevantSummary(goal.category, combinedStatement, allToolSourced, includesRelatedTopicContent)
      // Single-group shape (every matched claim dependency-free) has no
      // internal boundary CC-1 ever computed -- one block, not artificially
      // split, per this milestone's own "if a case naturally yields one
      // block, render one block" scope.
      return buildInterpretation(goal, 'directly_relevant', directlyRelevantResult, [directlyRelevantResult], claimIds, unresolvedRelevantClaims)
    }

    // Case 3A (Living Knowledge governance review, 2026-08-16): no result
    // reached matches[] for this category, but a RetrievalDiagnostic says
    // that's specifically because a formal applicability gate failed
    // (governed coverage exists, just not confirmed-applicable) rather
    // than because no governed coverage exists at all. Content-free by
    // design -- see relevantApplicabilityUnresolvedNoContentSummary's own
    // doc comment for why nothing is quoted here.
    const hasUnmetApplicability = diagnostics.some((d) => d.identifier === goal.category && d.reason === 'applicability_unmet')
    if (hasUnmetApplicability) {
      const noContentSummary = relevantApplicabilityUnresolvedNoContentSummary(goal.category)
      return buildInterpretation(goal, 'relevant_applicability_unresolved', noContentSummary, [noContentSummary], [])
    }

    const outsideCoverage = outsideCoverageSummary(goal.category)
    return buildInterpretation(goal, 'outside_current_coverage', outsideCoverage, [outsideCoverage], [])
  })
}

function buildInterpretation(
  goal: UserGoal,
  status: BoundedInterpretation['status'],
  summary: string,
  summary_blocks: string[],
  supporting_claim_ids: string[],
  // Generic Mixed-Resolution Bounded Interpretation milestone (2026-08-24):
  // additive, defaults to [] -- every pre-existing call site (Case 3A,
  // determination_declined, outside_current_coverage, the defensive
  // combinedStatement==='' fallback) is unaffected and renders byte-identical
  // output without passing it.
  unresolved_relevant_claims: UnresolvedRelevantClaim[] = [],
): BoundedInterpretation {
  return {
    goal_id: goal.goal_id,
    goal_text: goal.raw_text,
    category: goal.category,
    status,
    summary,
    summary_blocks,
    supporting_claim_ids,
    unresolved_relevant_claims,
  }
}
