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
import type { BoundedInterpretation } from './types'
import {
  DETERMINATION_DECLINED_TEMPLATE,
  directlyRelevantSummary,
  humanContributionRelevanceSentence,
  outsideCoverageSummary,
  relevantApplicabilityUnresolvedNoContentSummary,
  relevantApplicabilityUnresolvedWithContentSummary,
} from './rules'

const HUMAN_CONTRIBUTION_DEPENDENCY = 'human_contribution_description'

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
      return buildInterpretation(goal, 'determination_declined', DETERMINATION_DECLINED_TEMPLATE, [])
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
        return buildInterpretation(goal, 'outside_current_coverage', outsideCoverageSummary(goal.category), [])
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
      if (matches.some((m) => m.unresolved_project_dependencies.length > 0)) {
        // H5 (Copyright UAT Correction Milestone, 2026-08-19): additive
        // only -- when all three conditions hold, a bounded, deterministic
        // sentence echoing the user's own self-reported contribution is
        // inserted BEFORE the unchanged closing hedge below; otherwise this
        // renders byte-identical to before H5 existed.
        const humanContributionSentence = shouldIncludeHumanContributionSentence(goal.category, matches, humanContributionDescription)
          ? humanContributionRelevanceSentence(humanContributionDescription.state === 'confirmed' ? humanContributionDescription.value : '')
          : null
        return buildInterpretation(
          goal,
          'relevant_applicability_unresolved',
          relevantApplicabilityUnresolvedWithContentSummary(goal.category, combinedStatement, includesRelatedTopicContent, humanContributionSentence),
          claimIds,
        )
      }

      // Source-aware boundary clause (LK Phase 1 governance refinement,
      // 2026-08-16) -- see rules.ts's own boundaryClause doc comment. Every
      // matched RetrievalResult already carries its own source_fact.kind;
      // this is a read of existing data, not a new fact or new matching
      // logic.
      const allToolSourced = matches.every((m) => m.source_fact.kind === 'tool')
      return buildInterpretation(
        goal,
        'directly_relevant',
        directlyRelevantSummary(goal.category, combinedStatement, allToolSourced, includesRelatedTopicContent),
        claimIds,
      )
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
      return buildInterpretation(goal, 'relevant_applicability_unresolved', relevantApplicabilityUnresolvedNoContentSummary(goal.category), [])
    }

    return buildInterpretation(goal, 'outside_current_coverage', outsideCoverageSummary(goal.category), [])
  })
}

function buildInterpretation(
  goal: UserGoal,
  status: BoundedInterpretation['status'],
  summary: string,
  supporting_claim_ids: string[],
): BoundedInterpretation {
  return {
    goal_id: goal.goal_id,
    goal_text: goal.raw_text,
    category: goal.category,
    status,
    summary,
    supporting_claim_ids,
  }
}
