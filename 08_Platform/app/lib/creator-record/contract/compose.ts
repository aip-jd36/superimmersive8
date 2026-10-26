/**
 * CR-IMPL-1 / CR-IMPL-1b — bounded Creator Record guidance composition.
 *
 * Input is one evaluation per system-defined objective: the objective, the
 * claims that objective fed to Bounded Interpretation (with the selector's
 * own per-claim applicability status), and the BI interpretation produced
 * for it. Composition keeps the explicit claim → objective → interpretation
 * → publication-authorization relationship and never combines conclusions:
 *   - a claim cited by more than one objective is omitted (ambiguous), never
 *     merged into a "weakest" or "strongest" status;
 *   - a cited claim that the objective did not feed to BI, or an
 *     interpretation whose goal_id does not echo its objective id, fails
 *     closed (provenance broken).
 *
 * The conclusion can only be equal to or weaker than what BI permitted for
 * that objective. Creator Record narrows further — open dependencies or
 * non-`met` applicability cap at "applicability unresolved" — and re-checks
 * publication authorization. It never evaluates applicability, evidence or
 * sufficiency, and never reads BI summary prose.
 */

import type { BoundedInterpretation, InterpretationStatus } from '@/lib/bounded-interpretation/types'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'
import { buildDependencyRows, type DependencyRow } from './dependency-rows'
import { authorizePublication, type ClaimDescriptor, type PublicationLedgerEntry, type PublicationRefusalReason } from './publication-ledger'
import { activeObservations, type DeclaredObservation } from './provenance'
import type { IsoDate } from './types'

/** Creator Record's own, weaker-or-equal vocabulary. It has no "directly relevant", "met" or "cleared". */
export const CREATOR_RECORD_CONCLUSIONS = ['relevant_applicability_unresolved', 'relevant_on_declared_facts'] as const
export type CreatorRecordConclusion = (typeof CREATOR_RECORD_CONCLUSIONS)[number]

/** Rank of what BI permits. 0 = nothing may be shown. */
export function biRankForStatus(status: InterpretationStatus): 0 | 1 | 2 {
  if (status === 'directly_relevant') return 2
  if (status === 'relevant_applicability_unresolved') return 1
  return 0
}

export function conclusionRank(c: CreatorRecordConclusion): 1 | 2 {
  return c === 'relevant_on_declared_facts' ? 2 : 1
}

/** A system-defined evaluation objective. Never a customer UserGoal and never discovered relevance. */
export interface CreatorRecordObjective {
  objective_id: string
  version: number
  topic: string
  origin: 'creator_record_system_objective'
}

/** One claim as the selector returned it and as it was fed to BI. */
export interface SelectedClaim {
  claim: ClaimDescriptor
  /** The selector's own per-claim applicability status (never re-derived here). `not_met` claims are never fed. */
  applicability_status: 'met' | 'unresolved'
  applicability_material_unresolved: ApplicabilityRequirement[]
  /**
   * The declarations the integration layer actually passed to the evaluator for
   * this claim's requirements (tool binding resolved upstream). When absent,
   * only declarations with a fixed tool are matched here.
   */
  declared_basis?: DeclaredBasis[]
}

export interface DeclaredBasis {
  fact: string
  tool: string | null
  instance: string | null
  observation_id: string
  normalized_value: string | null
}

export interface ObjectiveEvaluation {
  objective: CreatorRecordObjective
  /** Exactly the claims fed to BI for this objective, after pre-BI publication authorization. */
  fed_claims: SelectedClaim[]
  /** Null when nothing was fed (BI not called). */
  interpretation: BoundedInterpretation | null
}

export interface CompositionInput {
  evaluations: readonly ObjectiveEvaluation[]
  ledger: readonly PublicationLedgerEntry[]
  observations: readonly DeclaredObservation[]
  dependencyLabel: (dependencyId: string) => string | undefined
  as_of: IsoDate
}

export interface GuidanceItem {
  claim_id: string
  conclusion: CreatorRecordConclusion
  /** Approved Creator Record explanation (ledger), never BI or CRC prose. */
  explanation: string
  required_caveats: string[]
  /** Selector applicability, carried unchanged. */
  applicability: { status: 'met' | 'unresolved'; material_unresolved: ApplicabilityRequirement[] }
  /** Declared observations for this claim's non-jurisdiction applicability requirements, labelled "on what you told us". */
  declared_applicability_basis: DeclaredBasis[]
  dependency_rows: DependencyRow[]
  provenance: {
    claim: { claim_id: string; last_verified: IsoDate }
    objective: { objective_id: string; version: number; topic: string; origin: CreatorRecordObjective['origin'] }
    bounded_interpretation: { goal_id: string; status: InterpretationStatus; citation: 'supporting' | 'unresolved_relevant' }
    publication: { entry_id: string; version: number; approver: string; decision_date: IsoDate; refresh_by: IsoDate }
  }
}

export type OmissionReason =
  | PublicationRefusalReason
  | 'ambiguous_objective_citation'
  | 'interpretation_objective_mismatch'
  | 'cited_claim_not_fed'
  | 'not_cited_by_bi'
  | 'bi_permits_nothing'
  | 'policy_requires_met'

export interface Omission {
  claim_id: string
  objective_id: string | null
  reason: OmissionReason
}

export interface Composition {
  items: GuidanceItem[]
  omissions: Omission[]
}

interface Citation {
  evaluation: ObjectiveEvaluation
  interpretation: BoundedInterpretation
  selected: SelectedClaim
  citation: 'supporting' | 'unresolved_relevant'
}

export function composeGuidance(input: CompositionInput): Composition {
  const items: GuidanceItem[] = []
  const omissions: Omission[] = []
  const active = activeObservations(input.observations)

  // 1. Collect citations per claim, with provenance checks per objective.
  const citations = new Map<string, Citation[]>()
  const order: string[] = []
  for (const ev of input.evaluations) {
    const fed = new Map(ev.fed_claims.map((s) => [s.claim.claim_id, s]))
    const bi = ev.interpretation
    if (bi === null) {
      for (const s of ev.fed_claims) omissions.push({ claim_id: s.claim.claim_id, objective_id: ev.objective.objective_id, reason: 'not_cited_by_bi' })
      continue
    }
    if (bi.goal_id !== ev.objective.objective_id) {
      for (const s of ev.fed_claims) omissions.push({ claim_id: s.claim.claim_id, objective_id: ev.objective.objective_id, reason: 'interpretation_objective_mismatch' })
      continue
    }
    const cited = new Map<string, 'supporting' | 'unresolved_relevant'>()
    for (const id of bi.supporting_claim_ids) cited.set(id, 'supporting')
    for (const u of bi.unresolved_relevant_claims) if (!cited.has(u.claim_id)) cited.set(u.claim_id, 'unresolved_relevant')
    for (const [id, citation] of Array.from(cited)) {
      const selected = fed.get(id)
      if (!selected) {
        omissions.push({ claim_id: id, objective_id: ev.objective.objective_id, reason: 'cited_claim_not_fed' })
        continue
      }
      if (!citations.has(id)) order.push(id)
      citations.set(id, [...(citations.get(id) ?? []), { evaluation: ev, interpretation: bi, selected, citation }])
    }
    for (const s of ev.fed_claims) if (!cited.has(s.claim.claim_id)) omissions.push({ claim_id: s.claim.claim_id, objective_id: ev.objective.objective_id, reason: 'not_cited_by_bi' })
  }

  // 2. One conclusion per claim, from exactly one objective.
  for (const claimId of order) {
    const cs = citations.get(claimId)!
    if (new Set(cs.map((c) => c.evaluation.objective.objective_id)).size > 1) {
      omissions.push({ claim_id: claimId, objective_id: null, reason: 'ambiguous_objective_citation' })
      continue
    }
    const { evaluation, interpretation, selected, citation } = cs[0]
    const objectiveId = evaluation.objective.objective_id
    const omit = (reason: OmissionReason) => omissions.push({ claim_id: claimId, objective_id: objectiveId, reason })

    const biRank = citation === 'unresolved_relevant' ? Math.min(biRankForStatus(interpretation.status), 1) : biRankForStatus(interpretation.status)
    if (biRank === 0) {
      omit('bi_permits_nothing')
      continue
    }
    const auth = authorizePublication(input.ledger, selected.claim, input.as_of)
    if (!auth.authorized) {
      omit(auth.reason)
      continue
    }
    const entry = auth.entry

    // Narrow only.
    const capped = selected.applicability_status !== 'met' || selected.claim.unresolved_project_dependencies.length > 0
    const conclusion: CreatorRecordConclusion = biRank === 2 && !capped ? 'relevant_on_declared_facts' : 'relevant_applicability_unresolved'
    if (entry.applicability_policy === 'met_only' && conclusion !== 'relevant_on_declared_facts') {
      omit('policy_requires_met')
      continue
    }

    const requirements = [...selected.claim.applicability_requirements, ...(selected.claim.applicability_any_of ?? []).flat()].filter((r) => r.fact !== 'jurisdiction')
    const declared_applicability_basis: DeclaredBasis[] =
      selected.declared_basis?.map((b) => ({ ...b })) ??
      active.flatMap((o) => {
        if (o.target.kind !== 'applicability_fact' || o.target.tool === undefined) return []
        const t = o.target
        return requirements.some((r) => r.fact === t.fact && (r.tool ?? null) === t.tool)
          ? [{ fact: t.fact, tool: t.tool ?? null, instance: o.instance, observation_id: o.observation_id, normalized_value: o.normalized_value }]
          : []
      })

    items.push({
      claim_id: claimId,
      conclusion,
      explanation: entry.explanation as string,
      required_caveats: [...entry.required_caveats],
      applicability: { status: selected.applicability_status, material_unresolved: [...selected.applicability_material_unresolved] },
      declared_applicability_basis,
      dependency_rows: buildDependencyRows(selected.claim.unresolved_project_dependencies, active, input.dependencyLabel, entry.evidence_notes),
      provenance: {
        claim: { claim_id: claimId, last_verified: selected.claim.last_verified as IsoDate },
        objective: { ...evaluation.objective },
        bounded_interpretation: { goal_id: interpretation.goal_id, status: interpretation.status, citation },
        publication: {
          entry_id: entry.entry_id,
          version: entry.version,
          approver: entry.approver as string,
          decision_date: entry.decision_date as IsoDate,
          refresh_by: entry.refresh_by as IsoDate,
        },
      },
    })
  }
  return { items, omissions }
}
