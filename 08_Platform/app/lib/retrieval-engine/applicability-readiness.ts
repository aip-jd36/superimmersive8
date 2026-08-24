/**
 * Applicability readiness -- a Retrieval-owned primitive exposing governed
 * applicability gaps across BOTH TopicClaim and MatrixClaim sources, usable
 * before an interview has completed (CRC Generic Applicability Readiness
 * milestone, 2026-08-24; narrow correction to the Governed Selector
 * Questioning implementation, following the Retrieval Ownership Diagnostic
 * of the same date).
 *
 * Answers exactly one question, generically over claim source: for the
 * currently permitted explicit-goal relevance universe, which Adopted,
 * CRC-eligible governed claims are currently withheld because a structured
 * applicability requirement is unmet, and which specific requirement(s)?
 * Returns `RetrievalDiagnostic[]` -- the SAME shared type `retrieve()`
 * itself already produces, per this module's own "prefer reusing existing
 * RetrievalDiagnostic structures" mandate -- filtered to `reason:
 * 'applicability_unmet'` only (this primitive's whole purpose is exposing
 * gaps, not general diagnostics).
 *
 * Duplicates NO authoritative selection logic:
 *   - TopicClaim gaps: produced by calling `lookupTopicClaims()` directly,
 *     unmodified, the exact same authoritative function `retrieve()`'s own
 *     topic-path stage calls -- see that function's own header for why it
 *     is already a first-class, reusable Retrieval primitive, not an
 *     internal helper unsafe outside `retrieve()` (Retrieval Ownership
 *     Diagnostic, 2026-08-24, §C).
 *   - MatrixClaim gaps: produced by composing the exact same three
 *     already-exported, already-pure Retrieval primitives `retrieve()`'s
 *     own Matrix-path stage composes -- `lookupRows` (Phase 4),
 *     `enumerateEligibleClaims` (Phase 5), `evaluateApplicabilityDetailed`
 *     (Piece 1, 2026-08-24) -- in the identical order, with identical
 *     semantics. `retrieve.ts` itself is untouched by this module; both it
 *     and this module now independently compose the same underlying
 *     primitives, never each other, never a duplicated reimplementation of
 *     any of them.
 *
 * One genuinely NEW piece of logic exists here, and only here: an explicit-
 * goal-relevance filter applied to Matrix-origin candidates
 * (`activeConfirmedGoalCategories`, exported from lookup-topic-claims.ts).
 * This is necessary because Matrix/tool claims are retrieved by RESOLVED
 * TOOL IDENTITY alone in `retrieve()` -- a Kling claim surfaces whenever
 * Kling is mentioned, with no goal-category gate at all, unlike TopicClaims,
 * which are only ever looked up per active goal category in the first
 * place. Readiness (unlike final Retrieval) must additionally decide
 * whether a Matrix-origin gap is worth acting on before completion, and the
 * explicit-goal-only policy (Governed Selector Questioning design, 2026-08-
 * 24, §L) requires exactly the same "is this relevant to something the user
 * actually asked" bar TopicClaim gaps already get for free from their own
 * goal-driven lookup. This filter is generic (keyed on the claim's own
 * `topic` field against active goal categories, using the exact same
 * primitive TopicClaim retrieval itself uses) -- it is NOT a
 * `if (source === 'matrix')` branch inside consumer code, and it is applied
 * uniformly by this one Retrieval-owned module, never by
 * lib/crc-engine/selector-questioning.ts, which remains completely
 * source-blind (see that module's own header after this correction).
 *
 * Consumers needing final, customer-facing `RetrievalResult` composition
 * (candidate_statement text, publication_scope, provenance for Projection)
 * must still use full `retrieve()` -- this primitive intentionally omits
 * `assembleResult`/`assembleTopicResult` entirely; it exposes gaps, not
 * governed content. Never exposed to Projection/API/email/UI -- consumed
 * exclusively by lib/crc-engine/selector-questioning.ts.
 */

import type { RetrievalHandoff, UserGoal } from '@/types/interview-engine'
import { extractMatchableFacts } from './extract-matchable-facts'
import { lookupRows } from './lookup-rows'
import { enumerateEligibleClaims } from './enumerate-eligible-claims'
import { activeConfirmedGoalCategories, evaluateApplicabilityDetailed, lookupTopicClaims, type ApplicabilityFacts } from './lookup-topic-claims'
import type { MatrixRow, RetrievalDiagnostic, TopicClaim, UnmetApplicabilityDetail } from './types'

/**
 * Matrix-origin gaps only -- composes `lookupRows`/`enumerateEligibleClaims`/
 * `evaluateApplicabilityDetailed` exactly as `retrieve()`'s own Matrix-path
 * stage does, plus the explicit-goal-relevance filter this module's own
 * header explains. `seen` mirrors `retrieve()`'s own dedupe discipline
 * (`RetrievalHandoffTool` entries are not guaranteed unique per canonical
 * identifier -- see handoff.ts -- so `lookupRows` can hand back the same
 * row/claim pair more than once).
 */
function deriveMatrixApplicabilityGaps(handoff: RetrievalHandoff, matrix: MatrixRow[], activeGoalCategories: Set<string>, facts: ApplicabilityFacts): RetrievalDiagnostic[] {
  const diagnostics: RetrievalDiagnostic[] = []
  const seen = new Set<string>()
  const matchable = extractMatchableFacts(handoff)
  const lookups = lookupRows(matchable.tools, matrix)

  for (const { row } of lookups) {
    if (!row) continue
    for (const claim of enumerateEligibleClaims(row)) {
      const topic = claim.topic ?? 'unknown'
      if (!activeGoalCategories.has(topic)) continue

      const dedupeKey = `${row.identifier}:${claim.claim_id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const outcomes = evaluateApplicabilityDetailed(claim.applicability_requirements, facts)
      if (outcomes.every((o) => o.status === 'met')) continue

      const unmetDetail: UnmetApplicabilityDetail[] = []
      for (const o of outcomes) {
        if (o.status !== 'met') unmetDetail.push({ claim_id: claim.claim_id, requirement: o.requirement, status: o.status })
      }
      diagnostics.push({ identifier: topic, reason: 'applicability_unmet', unmet_applicability: unmetDetail })
    }
  }

  return diagnostics
}

/**
 * The single generic entry point: governed applicability gaps across both
 * claim sources, for the currently permitted explicit-goal relevance
 * universe. `handoff` supplies canonical tool identifiers (for the Matrix
 * path) and canonical asset-provider identifiers (for the TopicClaim
 * path's own `providerScopeMatches` gate, via `lookupTopicClaims`'s
 * existing `assetProviders` parameter) -- both derived by the SAME
 * `buildRetrievalHandoff()` function `runCRCConversation()` itself uses to
 * build the handoff passed into full `retrieve()`, guaranteeing parity by
 * construction, never by re-derivation (see this module's own header;
 * `buildRetrievalHandoff` lives in lib/interview-engine/, so it is the
 * caller's job to build `handoff` -- this module, like `retrieve()` itself,
 * only ever receives it, never builds it, preserving the existing
 * subsystem-boundary discipline that lib/retrieval-engine/ never imports
 * Interview Engine LOGIC).
 */
export function deriveApplicabilityReadinessGaps(
  handoff: RetrievalHandoff,
  matrix: MatrixRow[],
  goals: UserGoal[],
  topicClaims: TopicClaim[],
  facts: ApplicabilityFacts,
): RetrievalDiagnostic[] {
  const activeGoalCategories = activeConfirmedGoalCategories(goals)

  const matrixGaps = deriveMatrixApplicabilityGaps(handoff, matrix, activeGoalCategories, facts)

  const topicLookup = lookupTopicClaims(goals, topicClaims, facts, handoff.asset_providers)
  const topicGaps = topicLookup.diagnostics.filter((d) => d.reason === 'applicability_unmet')

  return [...matrixGaps, ...topicGaps]
}
