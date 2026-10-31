/**
 * CR-IMPL-1b — Creator Record guidance pipeline over the EXISTING Product A
 * architecture. Pure: no I/O, no model call, no writes.
 *
 *   declared observations
 *     → buildCreatorRecordFacts()             (jurisdiction always empty)
 *     → per fixed objective: selectReviewerClaims()            reused unchanged
 *         (provider/tool scope, lifecycle, publication scope, supersession,
 *          authoritative applicability evaluation)
 *     → not_met excluded (as in HRR and Product A)
 *     → Creator Record publication authorization, BEFORE BI   default off
 *     → buildBoundedInterpretations() via reviewerClaimToBiResult()  reused unchanged
 *     → composeGuidance(): re-checks authorization, never stronger than BI
 *
 * Reviewer eligibility is only the base gate; it never authorizes Creator
 * Record publication. A claim BI never sees cannot change BI's conclusion
 * for any other claim. Every exclusion is reported with its reason.
 */

import { buildBoundedInterpretations } from '@/lib/bounded-interpretation/build-bounded-interpretation'
import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'
import { reviewerClaimToBiResult } from '@/lib/hrr/bi-adapters'
import { providerScopeMatches, toolScopeMatches } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import { selectReviewerClaims } from '@/lib/reviewer-lk/select-reviewer-claims'
import type { ReviewerLkClaim, ReviewerLkWithheld } from '@/lib/reviewer-lk/types'
import { composeGuidance, type Composition, type ObjectiveEvaluation, type ScopeSelectionBasis, type SelectedClaim, type SelectionBasis } from '../contract/compose'
import type { DeclaredObservation } from '../contract/provenance'
import { authorizePublication, type PublicationLedgerEntry, type PublicationRefusalReason } from '../contract/publication-ledger'
import type { IsoDate } from '../contract/types'
import { buildCreatorRecordFacts, type CreatorRecordFactsBundle } from './facts'
import { CREATOR_RECORD_OBJECTIVES, objectiveToBiIntent, type CreatorRecordObjectiveDefinition } from './objectives'

export interface CreatorRecordGuidanceInput {
  observations: readonly DeclaredObservation[]
  topicClaims: TopicClaim[]
  ledger: readonly PublicationLedgerEntry[]
  dependencyLabel: (dependencyId: string) => string | undefined
  as_of: IsoDate
  /** Defaults to the two fixed objectives; overridable for tests only. */
  objectives?: readonly CreatorRecordObjectiveDefinition[]
}

export interface ObjectiveTrace {
  objective_id: string
  /** Reviewer base-gate withholdings, unchanged. */
  withheld: ReviewerLkWithheld[]
  excluded_not_met: string[]
  /** Selected and applicable, but not authorized for Creator Record: never reaches BI. */
  refused_before_bi: { claim_id: string; reason: PublicationRefusalReason | 'claim_metadata_missing' }[]
  /** Exactly the claim ids passed to BI. */
  bi_input_claim_ids: string[]
  bi_status: InterpretationStatus | null
}

export type GovernanceGap =
  | { kind: 'ledger_entry_without_governed_claim'; entry_id: string; claim_id: string }
  | { kind: 'claim_refused'; claim_id: string; objective_id: string; reason: PublicationRefusalReason | 'claim_metadata_missing' }

export interface CreatorRecordGuidanceResult {
  facts: CreatorRecordFactsBundle
  objectives: ObjectiveTrace[]
  composition: Composition
  governance_gaps: GovernanceGap[]
}

/** The selection evidence could not be established exactly. Nothing is guessed. */
export class SelectionProvenanceError extends Error {
  constructor(readonly claim_id: string, reason: string) {
    super(`creator_record_selection_provenance: ${claim_id}: ${reason}`)
  }
}

/**
 * CR-V2-2E — why a scope-restricted claim was selected, captured at the
 * selection boundary. The selector received exactly `facts.activeToolIds` and
 * `facts.assetProviderIds` and kept the claim because the governed scope
 * predicates (`toolScopeMatches`, `providerScopeMatches`) held. Here the same
 * predicates are applied to each id of those same sets, and each matched id is
 * traced to the declared observations that contributed it (`facts.provenance`,
 * the record of how those sets were built in this run). Nothing is inferred
 * from co-occurrence: an id that no observation contributed, or a scoped claim
 * with no matched id, refuses.
 */
export function selectionBasisFor(claim: TopicClaim, facts: CreatorRecordFactsBundle): SelectionBasis {
  const scopes: ScopeSelectionBasis[] = []
  const capture = (scope: ScopeSelectionBasis['scope'], scoped: boolean, ids: readonly string[], matches: (id: string) => boolean, contributed: readonly { observation_id: string; id: string | null }[]) => {
    if (!scoped) return
    const matched_ids = ids.filter(matches).sort()
    if (matched_ids.length === 0) throw new SelectionProvenanceError(claim.claim_id, `selected without a matched ${scope} id`)
    for (const id of matched_ids) if (!contributed.some((c) => c.id === id)) throw new SelectionProvenanceError(claim.claim_id, `${scope} id ${id} has no contributing declaration`)
    const observation_ids = Array.from(new Set(contributed.filter((c) => c.id !== null && matched_ids.includes(c.id)).map((c) => c.observation_id))).sort()
    scopes.push({ scope, matched_ids, observation_ids })
  }
  capture('tool', claim.tool_scope !== null, facts.activeToolIds, (id) => toolScopeMatches(claim, [id]), facts.provenance.tools.map((t) => ({ observation_id: t.observation_id, id: t.tool_id })))
  capture('asset_provider', claim.provider_scope !== null, facts.assetProviderIds, (id) => providerScopeMatches(claim, [id]), facts.provenance.providers.map((p) => ({ observation_id: p.observation_id, id: p.provider_id })))
  return { scopes }
}

function toSelected(claim: ReviewerLkClaim, governed: TopicClaim, facts: CreatorRecordFactsBundle): SelectedClaim {
  const requirements = [...governed.applicability_requirements, ...(governed.applicability_any_of ?? []).flat()]
  // Only declarations that actually reached the evaluator, bound to the requirement's own tool.
  const declared_basis = facts.provenance.plans
    .filter((p) => p.passed_to_applicability && requirements.some((r) => r.fact === 'tool_plan_tier' && r.tool === p.tool_id))
    .map((p) => ({ fact: 'tool_plan_tier', tool: p.tool_id, instance: p.instance, observation_id: p.observation_id, normalized_value: p.declared }))
  return {
    claim: governed,
    applicability_status: claim.applicability_status as 'met' | 'unresolved',
    applicability_material_unresolved: [...claim.applicability_material_unresolved],
    declared_basis,
    selection_basis: selectionBasisFor(governed, facts),
  }
}

export function runCreatorRecordGuidance(input: CreatorRecordGuidanceInput): CreatorRecordGuidanceResult {
  const facts = buildCreatorRecordFacts(input.observations, input.topicClaims)
  const governedById = new Map(input.topicClaims.map((c) => [c.claim_id, c]))
  const traces: ObjectiveTrace[] = []
  const evaluations: ObjectiveEvaluation[] = []
  const gaps: GovernanceGap[] = []

  for (const objective of input.objectives ?? CREATOR_RECORD_OBJECTIVES) {
    const selected = selectReviewerClaims({
      topic: objective.topic,
      topicClaims: input.topicClaims,
      assetProviderIds: facts.assetProviderIds,
      activeToolIds: facts.activeToolIds,
      applicabilityFacts: facts.applicabilityFacts,
    })

    const trace: ObjectiveTrace = { objective_id: objective.objective_id, withheld: selected.withheld, excluded_not_met: [], refused_before_bi: [], bi_input_claim_ids: [], bi_status: null }
    const fedReviewer: ReviewerLkClaim[] = []
    const fed: SelectedClaim[] = []

    for (const claim of selected.claims) {
      if (claim.applicability_status === 'not_met') {
        trace.excluded_not_met.push(claim.claim_id)
        continue
      }
      const governed = governedById.get(claim.claim_id)
      const auth = governed ? authorizePublication(input.ledger, governed, input.as_of) : null
      if (!governed || !auth || !auth.authorized) {
        const reason = !governed ? 'claim_metadata_missing' : (auth as { reason: PublicationRefusalReason }).reason
        trace.refused_before_bi.push({ claim_id: claim.claim_id, reason })
        gaps.push({ kind: 'claim_refused', claim_id: claim.claim_id, objective_id: objective.objective_id, reason })
        continue
      }
      fedReviewer.push(claim)
      fed.push(toSelected(claim, governed, facts))
    }

    let interpretation = null
    if (fedReviewer.length > 0) {
      ;[interpretation] = buildBoundedInterpretations([objectiveToBiIntent(objective)], fedReviewer.map(reviewerClaimToBiResult))
      trace.bi_input_claim_ids = fedReviewer.map((c) => c.claim_id)
      trace.bi_status = interpretation?.status ?? null
    }
    traces.push(trace)
    evaluations.push({ objective, fed_claims: fed, interpretation: interpretation ?? null })
  }

  for (const e of input.ledger) {
    if (e.superseded_by === null && !governedById.has(e.claim_id)) gaps.push({ kind: 'ledger_entry_without_governed_claim', entry_id: e.entry_id, claim_id: e.claim_id })
  }

  const composition = composeGuidance({ evaluations, ledger: input.ledger, observations: input.observations, dependencyLabel: input.dependencyLabel, as_of: input.as_of })
  return { facts, objectives: traces, composition, governance_gaps: gaps }
}
