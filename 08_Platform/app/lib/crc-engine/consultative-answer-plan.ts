/**
 * Deterministic Consultative Answer Plan (CC-3A, 2026-09-02 -- implements
 * the smallest safe slice of the approved CC-3 architecture, with the
 * "no semantic materiality" correction from human review applied).
 *
 * ── WHAT THIS IS ────────────────────────────────────────────────────────
 *
 * A single pure function, `buildConsultativeAnswerPlan`, that turns the
 * current turn's already-computed `BoundedInterpretation[]` +
 * `RetrievalResult[]` + `RetrievalDiagnostic[]` into an internal,
 * consultant-shaped `ConsultativeAnswerPlan`: one section per bounded
 * interpretation, with references to the supporting governed claims,
 * structured (non-semantic) unresolved items, missing-evidence
 * classification, a reference to which existing fixed boundary string
 * applies, discovered-context kept separate from explicit-goal content,
 * and a deduplication-intent record.
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────
 *
 * NOT a second interpretation engine. It never:
 *   - creates a new project conclusion;
 *   - modifies or re-derives Bounded Interpretation state;
 *   - infers legal/commercial materiality, or that an unresolved issue
 *     "blocks", "clears", or "defeats" a goal (CC-3A carries NO such
 *     concept -- see `unresolved_items`, a deliberately neutral name);
 *   - fabricates a condition -> consequence relationship (a governed
 *     candidate statement that is itself conditional is referenced by
 *     claim_id and left exactly as authored, never decomposed here);
 *   - paraphrases a governed candidate statement (this module carries
 *     NO governed prose at all -- only claim_id references, plus the
 *     already-safe verbatim `BoundedInterpretation.summary_blocks`
 *     passthrough for fallback rendering);
 *   - fabricates a UserGoal (discovered context never becomes a section);
 *   - makes an evidence-only fact askable (unknown askability fails
 *     closed to "requires documentary evidence", never to askable);
 *   - branches on a provider or topic *value* anywhere;
 *   - calls an LLM.
 *
 * ── NO SURFACE CHANGE IN CC-3A ──────────────────────────────────────────
 *
 * This function has ZERO call sites in production code. `ProjectionOutput`,
 * `assemble-projection-output.ts`, `results-email-template.ts`, and the
 * "Current guidance" / "What this means" rendering are all untouched.
 * The current duplicate presentation stays intentionally unfixed until
 * CC-3B wires this plan into realization. CC-3A only proves the plan can
 * be derived safely and deterministically.
 *
 * ── LOCATION ────────────────────────────────────────────────────────────
 *
 * `lib/crc-engine/`, not `lib/projection-layer/`, because this module
 * legitimately reads two crc-engine-owned registries
 * (`dependency-askability.ts`, `selector-askability.ts`) to classify
 * missing evidence -- same-subsystem, no boundary crossing -- and because
 * its future caller (`run-crc-conversation.ts`) is the crc-engine
 * orchestrator. Every other import is type-only, mirroring
 * `selector-questioning.ts`'s own established shape in this directory.
 */

import type { BoundedInterpretation, InterpretationStatus } from '@/lib/bounded-interpretation/types'
import type { ApplicabilityFact, MatchOrigin, RetrievalDiagnostic, RetrievalResult } from '@/lib/retrieval-engine/types'
import type { GoalCategory } from '@/types/interview-engine'
import { getAskabilityEntry } from './dependency-askability'
import { getSelectorAskabilityEntry } from './selector-askability'

// ── Plan types ─────────────────────────────────────────────────────────────

/**
 * A deterministic, NEVER-more-permissive rename of `BoundedInterpretation.
 * status` -- describes CRC's own knowledge state for a goal, never the
 * project's clearance state. See DISPOSITION MAPPING in
 * `buildGoalSection` for the exact input -> output table.
 *
 * `unclassified` is the fail-closed value for an unrecognized BI status:
 * the section still renders (from `bi_summary_blocks`), but carries no
 * derived structure.
 */
export const PLAN_DISPOSITIONS = [
  'governed_guidance_available',
  'governed_guidance_available_with_open_items',
  'governed_guidance_withheld_pending_applicability',
  'outside_governed_coverage',
  'determination_declined',
  'unclassified',
] as const
export type PlanDisposition = (typeof PLAN_DISPOSITIONS)[number]

/**
 * Reference to an existing fixed boundary string in
 * `lib/bounded-interpretation/rules.ts`. CC-3A only records WHICH string
 * applies; CC-3B's realization selects the actual copy. This module never
 * authors boundary prose.
 */
export const RULES_BOUNDARY_IDS = [
  'tool_source', // boundaryClause(true)
  'neutral_source', // boundaryClause(false)
  'case_3b_unresolved', // the Case-3B "not enough project-specific information" closing sentence
  'case_3a_no_content', // relevantApplicabilityUnresolvedNoContentSummary
  'outside_coverage', // OUTSIDE_COVERAGE_BY_CATEGORY[category]
  'determination_declined', // DETERMINATION_DECLINED_TEMPLATE
  'bridge', // BRIDGE_SENTENCE only (fail-closed default)
] as const
export type RulesBoundaryId = (typeof RULES_BOUNDARY_IDS)[number]

/** Traceable reference to one supporting governed claim. No claim prose. */
export interface PlanClaimRef {
  claim_id: string
  matrix_identifier: string
  match_origin: MatchOrigin
  matched_goal_category: GoalCategory
  relationship_id: string | null
  last_verified: string | null
}

/**
 * A structurally-unresolved item. Deliberately NEUTRAL: this is a fact
 * about what remains structurally open, never a claim that it is "the"
 * blocker or that it prevents/clears anything. Ordering of a section's
 * `unresolved_items` is a stable presentation order (see
 * `sortUnresolvedItems`), explicitly NOT a priority or materiality rank.
 */
export type PlanUnresolvedItem =
  | { kind: 'withheld_relevant_claim'; claim_id: string }
  | { kind: 'unresolved_applicability'; claim_id: string; fact: ApplicabilityFact; tool: string | null }
  | { kind: 'open_project_dependency'; source_claim_id: string; dependency_id: string }

export const MISSING_EVIDENCE_CLASSIFICATIONS = [
  'answerable_in_conversation', // an askable dependency/selector -- CRC MAY ask (whether it did is the Interview Engine's concern)
  'requires_documentary_evidence', // evidence-only -- a reviewer examines documents; NEVER a self-attestation question
  'applicability_unresolved', // an applicability fact that is neither askable nor evidence-only registered
] as const
export type MissingEvidenceClassification = (typeof MISSING_EVIDENCE_CLASSIFICATIONS)[number]

export interface PlanMissingEvidenceRef {
  source_claim_id: string
  dependency_id: string | null
  applicability_fact: ApplicabilityFact | null
  classification: MissingEvidenceClassification
}

export interface PlanGoalSection {
  /** Verbatim `BoundedInterpretation.goal_text` (the user's own words). */
  goal_text: string
  category: GoalCategory
  /** Raw BI status retained for trace; 'unknown' only when the BI status literal was unrecognized. */
  bi_status: InterpretationStatus | 'unknown'
  disposition: PlanDisposition
  /** Explicit-origin supporting claims only (`exact_topic` / `related_topic`). Discovered-origin results go to `discovered_context`. */
  supported_claim_refs: PlanClaimRef[]
  unresolved_items: PlanUnresolvedItem[]
  missing_evidence: PlanMissingEvidenceRef[]
  boundary_ref: RulesBoundaryId
  /** Verbatim passthrough of `BoundedInterpretation.summary_blocks` -- the authoritative fallback text. Never altered here. */
  bi_summary_blocks: string[]
}

export interface PlanDiscoveredContextItem {
  claim_ref: PlanClaimRef
  /** = `claim_ref.matched_goal_category` -- the explicit goal category that authorized this discovery (Track C provenance). */
  authorizing_goal_category: GoalCategory
}

/**
 * Deduplication INTENT only. CC-3A does not alter rendering; this records
 * which `(matrix_identifier, claim_id)` pairs appear more than once across
 * `explicit_sections` + `discovered_context`, so CC-3B can render each
 * once. Two DIFFERENT claim_ids never share a key and never collapse.
 */
export interface PlanRenderOnceMarker {
  matrix_identifier: string
  claim_id: string
  occurrence_count: number
}

export interface CommercialAssuranceRef {
  source_claim_id: string
  dependency_id: string | null
  applicability_fact: ApplicabilityFact | null
}

export interface ConsultativeAnswerPlan {
  explicit_sections: PlanGoalSection[]
  discovered_context: PlanDiscoveredContextItem[]
  render_once_markers: PlanRenderOnceMarker[]
  /**
   * Reference-only (CC-3A, per milestone scope §9). Structured pointers to
   * unresolved dependency / applicability items that COULD be relevant to
   * higher-assurance review. NO prose about what Commercial Assurance
   * "will resolve" or "will clear" -- that wording belongs to CC-3B after
   * review.
   */
  commercial_assurance_refs: CommercialAssuranceRef[]
}

// ── Derivation ─────────────────────────────────────────────────────────────

/** Fixed presentation order for unresolved-item kinds. NOT a priority/materiality rank -- purely a stable, deterministic ordering so output is reproducible. */
const UNRESOLVED_KIND_ORDER: Record<PlanUnresolvedItem['kind'], number> = {
  withheld_relevant_claim: 0,
  unresolved_applicability: 1,
  open_project_dependency: 2,
}

function identityOf(item: PlanUnresolvedItem): string {
  switch (item.kind) {
    case 'withheld_relevant_claim':
      return item.claim_id
    case 'unresolved_applicability':
      return `${item.claim_id}::${item.fact}::${item.tool ?? ''}`
    case 'open_project_dependency':
      return `${item.source_claim_id}::${item.dependency_id}`
  }
}

function sortUnresolvedItems(items: PlanUnresolvedItem[]): PlanUnresolvedItem[] {
  return [...items].sort((a, b) => {
    const k = UNRESOLVED_KIND_ORDER[a.kind] - UNRESOLVED_KIND_ORDER[b.kind]
    if (k !== 0) return k
    return identityOf(a).localeCompare(identityOf(b))
  })
}

/** A supporting result is usable only if it carries the provenance every downstream reference needs. Missing either id -> the ref is not emitted (fail closed). */
function hasClaimProvenance(r: RetrievalResult): boolean {
  return typeof r.claim_id === 'string' && r.claim_id.length > 0 && typeof r.matrix_identifier === 'string' && r.matrix_identifier.length > 0
}

function toClaimRef(r: RetrievalResult): PlanClaimRef {
  return {
    claim_id: r.claim_id,
    matrix_identifier: r.matrix_identifier,
    match_origin: r.match_origin,
    matched_goal_category: r.matched_goal_category,
    relationship_id: r.relationship_id,
    last_verified: r.last_verified,
  }
}

/**
 * DISPOSITION MAPPING (§5). Deterministic, never more permissive than the
 * BI status it reads.
 *
 *   directly_relevant, no open items                -> governed_guidance_available
 *   directly_relevant, >=1 open item                -> governed_guidance_available_with_open_items
 *   relevant_applicability_unresolved, content shown -> governed_guidance_available_with_open_items   (Case 3B)
 *   relevant_applicability_unresolved, no content    -> governed_guidance_withheld_pending_applicability (Case 3A)
 *   outside_current_coverage                         -> outside_governed_coverage
 *   determination_declined                           -> determination_declined
 *   (anything else)                                  -> unclassified   (FAIL CLOSED)
 */
function deriveDisposition(status: InterpretationStatus | string, hasContent: boolean, hasOpenItems: boolean): PlanDisposition {
  switch (status) {
    case 'directly_relevant':
      return hasOpenItems ? 'governed_guidance_available_with_open_items' : 'governed_guidance_available'
    case 'relevant_applicability_unresolved':
      return hasContent ? 'governed_guidance_available_with_open_items' : 'governed_guidance_withheld_pending_applicability'
    case 'outside_current_coverage':
      return 'outside_governed_coverage'
    case 'determination_declined':
      return 'determination_declined'
    default:
      return 'unclassified'
  }
}

function deriveBoundaryRef(disposition: PlanDisposition, allSupportedToolSourced: boolean): RulesBoundaryId {
  switch (disposition) {
    case 'governed_guidance_available':
      return allSupportedToolSourced ? 'tool_source' : 'neutral_source'
    case 'governed_guidance_available_with_open_items':
      return 'case_3b_unresolved'
    case 'governed_guidance_withheld_pending_applicability':
      return 'case_3a_no_content'
    case 'outside_governed_coverage':
      return 'outside_coverage'
    case 'determination_declined':
      return 'determination_declined'
    case 'unclassified':
      return 'bridge'
  }
}

function classifyDependency(dependencyId: string): MissingEvidenceClassification {
  const entry = getAskabilityEntry(dependencyId)
  if (entry?.treatment === 'askable_in_crc') return 'answerable_in_conversation'
  // 'evidence_only' OR unregistered -> documentary. Fail closed: an unknown
  // dependency is NEVER treated as askable.
  return 'requires_documentary_evidence'
}

function classifyApplicabilityFact(fact: ApplicabilityFact): MissingEvidenceClassification {
  const entry = getSelectorAskabilityEntry(fact)
  if (entry?.treatment === 'askable_in_crc') return 'answerable_in_conversation'
  if (entry?.treatment === 'evidence_only') return 'requires_documentary_evidence'
  // undefined / 'not_askable' -> neither askable nor evidence-only registered.
  // Fail closed: never askable.
  return 'applicability_unresolved'
}

/**
 * Builds the plan. Pure: no I/O, no LLM, no mutation of any input, no
 * cross-turn state. A superseded goal or tool cannot appear here because
 * BI is already filtered to active/confirmed goals and Retrieval already
 * filters to active tool/provider mentions -- so a superseded fact simply
 * produces no interpretation and no result for this function to carry.
 */
export function buildConsultativeAnswerPlan(
  interpretations: BoundedInterpretation[],
  results: RetrievalResult[],
  diagnostics: RetrievalDiagnostic[],
): ConsultativeAnswerPlan {
  const activeCategories = new Set<GoalCategory>(interpretations.map((i) => i.category))

  const explicit_sections: PlanGoalSection[] = interpretations.map((interp) => {
    const isDeterminationDeclined = interp.status === 'determination_declined'
    const isOutsideCoverage = interp.status === 'outside_current_coverage'

    // Supporting results for this goal: matched by claim_id against
    // `supporting_claim_ids`, AND by `matched_goal_category` -- mirroring
    // exactly how `build-bounded-interpretation.ts` itself selects a goal's
    // `matches` (`results.filter(r => r.matched_goal_category === goal.category)`),
    // so a claim_id that legitimately surfaces for two different goals is
    // attributed to the right section, not both. Discovered-origin supporting
    // results are routed to `discovered_context` (built below), never into
    // `supported_claim_refs`.
    const supportedResults = interp.supporting_claim_ids
      .flatMap((cid) => results.filter((r) => r.claim_id === cid && r.matched_goal_category === interp.category))
      .filter(hasClaimProvenance)
      .filter((r) => r.match_origin !== 'discovered_topic')

    const supported_claim_refs: PlanClaimRef[] = supportedResults.map(toClaimRef)

    // ── Unresolved items (skipped entirely for determination_declined /
    //    outside_current_coverage -- there is no claim to have open items
    //    about, and BI itself never gives those a category-specific answer). ──
    const unresolvedItems: PlanUnresolvedItem[] = []
    if (!isDeterminationDeclined && !isOutsideCoverage) {
      for (const { claim_id } of interp.unresolved_relevant_claims) {
        unresolvedItems.push({ kind: 'withheld_relevant_claim', claim_id })
      }
      for (const d of diagnostics) {
        if (d.reason !== 'applicability_unmet' || d.identifier !== interp.category || !d.unmet_applicability) continue
        for (const detail of d.unmet_applicability) {
          if (detail.status !== 'unresolved') continue // 'not_met' is a settled exclusion -- never an open item
          unresolvedItems.push({
            kind: 'unresolved_applicability',
            claim_id: detail.claim_id,
            fact: detail.requirement.fact,
            tool: detail.requirement.tool ?? null,
          })
        }
      }
      for (const r of supportedResults) {
        for (const dep of r.unresolved_project_dependencies) {
          unresolvedItems.push({ kind: 'open_project_dependency', source_claim_id: r.claim_id, dependency_id: dep })
        }
      }
    }
    const unresolved_items = sortUnresolvedItems(unresolvedItems)

    // ── Missing-evidence classification (derived purely from the registries). ──
    const missing_evidence: PlanMissingEvidenceRef[] = unresolved_items
      .map((item): PlanMissingEvidenceRef | null => {
        if (item.kind === 'unresolved_applicability') {
          return {
            source_claim_id: item.claim_id,
            dependency_id: null,
            applicability_fact: item.fact,
            classification: classifyApplicabilityFact(item.fact),
          }
        }
        if (item.kind === 'open_project_dependency') {
          return {
            source_claim_id: item.source_claim_id,
            dependency_id: item.dependency_id,
            applicability_fact: null,
            classification: classifyDependency(item.dependency_id),
          }
        }
        // withheld_relevant_claim: the claim is withheld because its OWN
        // applicability is unresolved; its specific missing fact surfaces as
        // its own `unresolved_applicability` diagnostic entry (handled above)
        // when Retrieval emits the detail. Nothing to classify from the bare
        // claim_id alone -- do not invent one.
        return null
      })
      .filter((x): x is PlanMissingEvidenceRef => x !== null)

    const allSupportedToolSourced = supportedResults.length > 0 && supportedResults.every((r) => r.source_fact.kind === 'tool')
    const disposition = deriveDisposition(interp.status, supported_claim_refs.length > 0, unresolved_items.length > 0)
    const boundary_ref = deriveBoundaryRef(disposition, allSupportedToolSourced)

    const biStatusLiteral: InterpretationStatus | 'unknown' = disposition === 'unclassified' ? 'unknown' : (interp.status as InterpretationStatus)

    return {
      goal_text: interp.goal_text,
      category: interp.category,
      bi_status: biStatusLiteral,
      disposition,
      supported_claim_refs,
      unresolved_items,
      missing_evidence,
      boundary_ref,
      bi_summary_blocks: interp.summary_blocks,
    }
  })

  // ── Discovered context: results reached via Track A discovery, kept
  //    strictly separate from explicit sections. Omitted (fail closed) if
  //    provenance is missing OR no active goal authorizes the category. ──
  const discovered_context: PlanDiscoveredContextItem[] = results
    .filter((r) => r.match_origin === 'discovered_topic')
    .filter(hasClaimProvenance)
    .filter((r) => activeCategories.has(r.matched_goal_category))
    .map((r) => ({ claim_ref: toClaimRef(r), authorizing_goal_category: r.matched_goal_category }))

  // ── Deduplication INTENT: which (matrix_identifier, claim_id) pairs
  //    appear more than once across all rendered claim references. ──
  const occurrences = new Map<string, PlanRenderOnceMarker>()
  const allRefs: PlanClaimRef[] = [
    ...explicit_sections.flatMap((s) => s.supported_claim_refs),
    ...discovered_context.map((d) => d.claim_ref),
  ]
  for (const ref of allRefs) {
    const key = `${ref.matrix_identifier} ${ref.claim_id}`
    const existing = occurrences.get(key)
    if (existing) existing.occurrence_count += 1
    else occurrences.set(key, { matrix_identifier: ref.matrix_identifier, claim_id: ref.claim_id, occurrence_count: 1 })
  }
  const render_once_markers = [...occurrences.values()]
    .filter((m) => m.occurrence_count > 1)
    .sort((a, b) => `${a.matrix_identifier} ${a.claim_id}`.localeCompare(`${b.matrix_identifier} ${b.claim_id}`))

  // ── Commercial Assurance references (reference-only in CC-3A). Union of
  //    every section's missing-evidence, deduped by identity. ──
  const caSeen = new Set<string>()
  const commercial_assurance_refs: CommercialAssuranceRef[] = []
  for (const section of explicit_sections) {
    for (const me of section.missing_evidence) {
      const key = `${me.source_claim_id} ${me.dependency_id ?? ''} ${me.applicability_fact ?? ''}`
      if (caSeen.has(key)) continue
      caSeen.add(key)
      commercial_assurance_refs.push({
        source_claim_id: me.source_claim_id,
        dependency_id: me.dependency_id,
        applicability_fact: me.applicability_fact,
      })
    }
  }

  return { explicit_sections, discovered_context, render_once_markers, commercial_assurance_refs }
}
