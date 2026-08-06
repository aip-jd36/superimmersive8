/**
 * Gate 1 (Minimum Understanding) and Gate 2 (Understanding Stability)
 * evaluators (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 3;
 * INTERVIEW_ENGINE_ARCHITECTURE.md §8-§10).
 *
 * Deterministic only: pure functions over StructuredUnderstanding snapshots.
 * No LLM, no live conversation, no Extraction, no Retrieval -- Retrieval is
 * never imported or referenced here, per the architectural independence
 * principle (architecture doc §1, §9: "Gate 2 is an Interview Engine test,
 * entirely independent of Retrieval, with zero visibility into what
 * Retrieval is doing").
 */

import type {
  ProjectFacts,
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
} from '@/types/interview-engine'

// ── Shared helpers ───────────────────────────────────────────────────────────

function activeToolMentions(su: StructuredUnderstanding): ToolMention[] {
  return su.tool_mentions.filter((m) => m.superseded_by === null)
}

function activeScopedObservations(su: StructuredUnderstanding): ScopedObservation[] {
  return su.scoped_observations.filter((o) => o.superseded_by === null)
}

// ── Gate 1 — Minimum Understanding (architecture doc §8) ───────────────────

/**
 * §8: "Two criteria (PRD §9): intended-use signal present (an unclear/mixed
 * value is acceptable), AND at least one of a named tool/platform or a
 * production step specific enough to retrieve against."
 *
 * "Unclear/mixed value acceptable" is read as a statement about VALUE
 * content, not confidence STATE -- an imprecise but stated answer
 * ("probably some kind of ad, not totally sure yet") is still `confirmed`;
 * it just carries an imprecise string. Gate 1 requires the state, not a
 * precise value.
 */
const GATE_1_REASON_CODES = [
  'MINIMUM_UNDERSTANDING_MET',
  'NO_TOOL_OR_PRODUCTION_STEP_IDENTIFIED',
  'AMBIGUOUS_TOOL_SURFACE_UNRESOLVED',
  'INTENDED_USE_MISSING',
  'DECLINED_BEFORE_MINIMUM_UNDERSTANDING',
] as const

export type Gate1ReasonCode = (typeof GATE_1_REASON_CODES)[number]

export interface Gate1Result {
  state: StructuredUnderstanding['gate_1_state']
  reason_code: Gate1ReasonCode
  /** Field/entity identifiers still blocking a 'met' result; empty when met. */
  unresolved_fields: string[]
}

/**
 * §8 IMPLEMENTATION GUIDANCE: a tool mention satisfies Gate 1 only when the
 * engine can identify the access surface actually used -- "Nano Banana"
 * alone is insufficient because the engine can't yet distinguish which of
 * two materially different things happened, not because two Matrix rows
 * happen to exist for it. An active `unresolved_alias` resolution is exactly
 * that unresolved state; an active `canonical` resolution means the engine
 * knows what was used, and per interpretation #2, per-tool access_surface/
 * plan_tier attested facts beyond that canonical identity (which surface
 * detail, which plan) are downstream/educational nuance -- an unresolved
 * Kling tier does not itself reopen Gate 1's tool-identity criterion.
 */
function toolIdentityUnderstood(activeTools: ToolMention[]): boolean {
  return activeTools.length > 0 && activeTools.every((m) => m.resolution.kind === 'canonical')
}

/**
 * §8's OR-branch: "a production step specific enough to retrieve against" --
 * satisfied independently of tool identity by a confirmed, workflow-stage-
 * tagged observation. This lets Gate 1 pass on production-step specificity
 * alone even with no tool named at all, per the frozen criterion's literal
 * OR (not modeled in any of the 8 Phase 1 fixtures, all of which reach Gate 1
 * via tool identity -- exercised directly by this phase's own tests).
 */
function productionStepUnderstood(activeObservations: ScopedObservation[]): boolean {
  return activeObservations.some((o) => o.workflow_stage !== null && o.confidence === 'confirmed')
}

function intendedUseUnderstood(projectFacts: ProjectFacts): boolean {
  return projectFacts.intended_use.state === 'confirmed'
}

export function evaluateGate1(su: StructuredUnderstanding): Gate1Result {
  const activeTools = activeToolMentions(su)
  const activeObservations = activeScopedObservations(su)

  const unresolvedAliases = activeTools.filter((m) => m.resolution.kind === 'unresolved_alias')
  const whatWasUsedUnderstood =
    toolIdentityUnderstood(activeTools) || productionStepUnderstood(activeObservations)
  const useUnderstood = intendedUseUnderstood(su.project_facts)
  const minimumUnderstandingMet = whatWasUsedUnderstood && useUnderstood

  // Interpretation #3: opt-out is not a Gate 1 outcome to be silently folded
  // into unknown/absence/stability/completion. Checked BEFORE the specific
  // not_met branches below: if a decline is present AND minimum
  // understanding is still missing, the decline is treated as the
  // operative reason, even when the underlying gap also happens to be
  // e.g. an unresolved alias -- a user who named an ambiguous tool and then
  // declined to disambiguate should read as "boundary hit," not as
  // "still ambiguous," since the former tells a caller to stop probing and
  // the latter implies it's still open to ask about. A decline that
  // occurred but did NOT prevent minimum understanding (e.g. the user
  // declined an unrelated question after tool + intended use were already
  // established) does not retroactively unmet Gate 1 -- this evaluator only
  // reads current state, consistent with architecture doc §11 ("a
  // correction... does not force a phase transition backward").
  // Computed once, shared by every branch below (including the decline
  // branch) -- a decline must never cause specific diagnostic detail (e.g.
  // which mention is ambiguous) to be discarded in favor of a generic
  // placeholder. The reason_code says WHY the gate isn't met; unresolved_fields
  // says WHAT is still unresolved, independently.
  const unresolvedFields: string[] = []
  if (unresolvedAliases.length > 0) {
    unresolvedFields.push(...unresolvedAliases.map((m) => `tool_mentions.${m.mention_id}`))
  } else if (!whatWasUsedUnderstood) {
    unresolvedFields.push('tool_mentions', 'scoped_observations.workflow_stage')
  }
  if (!useUnderstood) unresolvedFields.push('project_facts.intended_use')

  if (su.opt_out_scope !== null && !minimumUnderstandingMet) {
    return {
      state: 'not_applicable_declined',
      reason_code: 'DECLINED_BEFORE_MINIMUM_UNDERSTANDING',
      unresolved_fields: unresolvedFields,
    }
  }

  if (unresolvedAliases.length > 0) {
    return {
      state: 'not_met',
      reason_code: 'AMBIGUOUS_TOOL_SURFACE_UNRESOLVED',
      unresolved_fields: unresolvedFields,
    }
  }

  if (!whatWasUsedUnderstood) {
    return {
      state: 'not_met',
      reason_code: 'NO_TOOL_OR_PRODUCTION_STEP_IDENTIFIED',
      unresolved_fields: unresolvedFields,
    }
  }

  if (!useUnderstood) {
    return {
      state: 'not_met',
      reason_code: 'INTENDED_USE_MISSING',
      unresolved_fields: unresolvedFields,
    }
  }

  return {
    state: 'met',
    reason_code: 'MINIMUM_UNDERSTANDING_MET',
    unresolved_fields: [],
  }
}

// ── Gate 2 — Understanding Stability (architecture doc §9) ─────────────────

const GATE_2_REASON_CODES = ['NO_MATERIAL_CHANGE', 'MATERIAL_CHANGE_DETECTED', 'DECLINE_BLOCKS_STABILITY'] as const

export type Gate2ReasonCode = (typeof GATE_2_REASON_CODES)[number]

/**
 * "phase": restricted to the facts Gate 1 itself cares about (tool
 * identity/resolution, intended_use, workflow-stage-bearing observations) --
 * "interview": the full object, including per-tool access_surface/plan_tier
 * and workflow_role.
 *
 * OPEN GAP (report per Phase 3 instructions): the architecture doc doesn't
 * define a clean phase-vs-interview split for this. §11 states explicitly
 * that "a single user turn can supply Phase 1, 2, and 3-relevant information
 * simultaneously" and "Phase state tracks what's been understood, not what's
 * been asked in sequence" -- scoped_observations carry workflow_stage
 * (T0-T5, a video PRODUCTION step) and source_turn, neither of which
 * indicates which CRC INTERVIEW phase (1-4) produced the observation. There
 * is no field to restrict a scoped_observations diff to "only Phase 1-2
 * facts" vs "only Phase 3 facts." This implementation approximates "phase"
 * scope as "Gate-1-relevant fact set" and treats the scoped_observations
 * diff identically in both scopes, since observations aren't phase-tagged
 * and narrowing them further isn't cleanly computable from current state.
 * Not resolved here; would need a phase tag added to ScopedObservation (a
 * type change) to close properly.
 */
export type Gate2EvaluationScope = 'phase' | 'interview'

export interface Gate2Result {
  state: StructuredUnderstanding['gate_2_state']
  reason_code: Gate2ReasonCode
  /** Descriptive identifiers of what changed between the two snapshots; empty when stable. */
  changed_fields: string[]
  evaluation_scope: Gate2EvaluationScope
}

/**
 * §7 (reused by Gate 2 per §9): a plausible answer materially changes
 * understanding when it "would add a new scoped observation or change an
 * existing one's confidence/workflow_stage." Extended here to also include
 * `scope` (current_project vs. historical_project vs. general_practice):
 * §7's literal list doesn't name it, but a scope reclassification ("actually
 * that was a past project") is clearly a materially different understanding
 * of the situation in spirit, and excluding it would let a real correction
 * slip through as "stable." Flagged as an extension beyond the frozen
 * text's literal enumeration, not a strict reading of it.
 */
function diffScopedObservations(previous: ScopedObservation[], current: ScopedObservation[]): string[] {
  const changed: string[] = []
  const prevActive = new Map(previous.filter((o) => o.superseded_by === null).map((o) => [o.observation_id, o]))
  const currActive = new Map(current.filter((o) => o.superseded_by === null).map((o) => [o.observation_id, o]))

  for (const [id, obs] of currActive) {
    const prev = prevActive.get(id)
    if (!prev) {
      changed.push(`scoped_observations.${id} (new)`)
      continue
    }
    if (prev.confidence !== obs.confidence) changed.push(`scoped_observations.${id}.confidence`)
    if (prev.workflow_stage !== obs.workflow_stage) changed.push(`scoped_observations.${id}.workflow_stage`)
    if (prev.scope !== obs.scope) changed.push(`scoped_observations.${id}.scope`)
  }
  for (const id of prevActive.keys()) {
    if (!currActive.has(id)) changed.push(`scoped_observations.${id} (no longer active)`)
  }
  return changed
}

/**
 * Tool resolution identity is always diffed (Gate-1-relevant in both
 * scopes). access_surface/plan_tier are only diffed under 'interview' scope
 * -- per interpretation #2 they're downstream/educational detail that
 * doesn't gate minimum understanding, so a phase-scoped stability check
 * (which asks "is my Gate-1-relevant understanding stable") ignores them.
 */
function diffToolMentions(previous: ToolMention[], current: ToolMention[], includeAttestedDetails: boolean): string[] {
  const changed: string[] = []
  const prevActive = new Map(previous.filter((m) => m.superseded_by === null).map((m) => [m.mention_id, m]))
  const currActive = new Map(current.filter((m) => m.superseded_by === null).map((m) => [m.mention_id, m]))

  for (const [id, m] of currActive) {
    const prev = prevActive.get(id)
    if (!prev) {
      changed.push(`tool_mentions.${id} (new)`)
      continue
    }
    if (JSON.stringify(prev.resolution) !== JSON.stringify(m.resolution)) {
      changed.push(`tool_mentions.${id}.resolution`)
    }
    if (includeAttestedDetails) {
      if (JSON.stringify(prev.access_surface) !== JSON.stringify(m.access_surface)) {
        changed.push(`tool_mentions.${id}.access_surface`)
      }
      if (JSON.stringify(prev.plan_tier) !== JSON.stringify(m.plan_tier)) {
        changed.push(`tool_mentions.${id}.plan_tier`)
      }
    }
  }
  for (const id of prevActive.keys()) {
    if (!currActive.has(id)) changed.push(`tool_mentions.${id} (no longer active)`)
  }
  return changed
}

function diffProjectFacts(previous: ProjectFacts, current: ProjectFacts, includeWorkflowRole: boolean): string[] {
  const changed: string[] = []
  if (JSON.stringify(previous.intended_use) !== JSON.stringify(current.intended_use)) {
    changed.push('project_facts.intended_use')
  }
  if (includeWorkflowRole && JSON.stringify(previous.workflow_role) !== JSON.stringify(current.workflow_role)) {
    changed.push('project_facts.workflow_role')
  }
  return changed
}

/**
 * Retrospective, per architecture doc §9: measures whether the transition
 * from `previous` to `current` materially changed understanding. A caller
 * evaluating stability across more than one turn calls this repeatedly
 * across successive snapshot pairs -- this function itself only ever
 * compares two.
 */
export function evaluateGate2(
  previous: StructuredUnderstanding,
  current: StructuredUnderstanding,
  evaluationScope: Gate2EvaluationScope = 'interview',
): Gate2Result {
  const isInterviewScope = evaluationScope === 'interview'

  // Interpretation #3, extended to Gate 2: a decline occurring in this
  // transition must never be silently read as stability, even if no
  // tracked field also happens to change. Checked first and short-circuits
  // the rest of the diff -- the frozen contract only has two Gate 2 states
  // (architecture doc §3: "stable" | "not_yet_stable"), so this is
  // represented as not_yet_stable with a distinct reason_code rather than a
  // third state, per the instruction to change types only when the existing
  // ones are untenable -- they aren't here.
  const declineOccurredThisTransition = previous.opt_out_scope === null && current.opt_out_scope !== null

  const changed = [
    ...diffScopedObservations(previous.scoped_observations, current.scoped_observations),
    ...diffToolMentions(previous.tool_mentions, current.tool_mentions, isInterviewScope),
    ...diffProjectFacts(previous.project_facts, current.project_facts, isInterviewScope),
  ]

  if (declineOccurredThisTransition) {
    return {
      state: 'not_yet_stable',
      reason_code: 'DECLINE_BLOCKS_STABILITY',
      changed_fields: changed,
      evaluation_scope: evaluationScope,
    }
  }

  if (changed.length > 0) {
    return {
      state: 'not_yet_stable',
      reason_code: 'MATERIAL_CHANGE_DETECTED',
      changed_fields: changed,
      evaluation_scope: evaluationScope,
    }
  }

  return {
    state: 'stable',
    reason_code: 'NO_MATERIAL_CHANGE',
    changed_fields: [],
    evaluation_scope: evaluationScope,
  }
}
