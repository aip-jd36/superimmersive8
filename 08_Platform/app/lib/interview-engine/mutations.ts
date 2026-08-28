/**
 * Mutation and supersession engine (CRC_PROTOTYPE_ALPHA_ROADMAP.md Phase 2).
 *
 * Deterministic operations for adding, correcting, superseding, retracting,
 * and splitting one answer into multiple observations. This is the ONLY
 * module permitted to apply a mutation to a StructuredUnderstanding —
 * Extraction (Phase 6a) produces proposals, never mutates directly.
 *
 * Supersede-and-mark only, per architecture doc §4: correcting a fact never
 * deletes or edits the prior observation in place. It adds a new one and
 * marks the prior `superseded_by: <new_id>`. Both the current active state
 * and the full superseded history remain recoverable from the object.
 *
 * Invariant enforced here (not explicit in the architecture doc, made
 * explicit by this implementation): a correction may only target the
 * CURRENTLY ACTIVE (non-superseded) observation on a given thread. Chaining
 * a new correction off an already-superseded node is rejected -- a user
 * correcting something is correcting the current understanding, not
 * re-editing a historical snapshot. Corrections always extend the chain from
 * its current head.
 */

import type {
  AssessmentJurisdictionMention,
  AssetProviderMention,
  Attested,
  ContentPresenceMention,
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
  UserGoal,
} from '@/types/interview-engine'

// ── Scoped observations ─────────────────────────────────────────────────────

/**
 * Add one new observation. Used directly for a single fresh fact, and as the
 * building block for splitting one bundled answer into multiple observations
 * (call once per extracted fact, all sharing the same source_turn -- see
 * addObservations below for the batch form).
 */
export function addObservation(
  su: StructuredUnderstanding,
  observation: ScopedObservation,
): StructuredUnderstanding {
  if (su.scoped_observations.some((o) => o.observation_id === observation.observation_id)) {
    throw new Error(`Observation id already exists: ${observation.observation_id}`)
  }
  if (observation.superseded_by !== null) {
    throw new Error(
      `A newly added observation cannot already be superseded (observation_id: ${observation.observation_id})`,
    )
  }
  return {
    ...su,
    scoped_observations: [...su.scoped_observations, observation],
  }
}

/**
 * Add multiple observations from one bundled/multi-signal answer (PRD
 * Dialogue F shape). This is deliberately just addObservation applied N
 * times -- splitting a bundled answer into distinct facts is a property of
 * how many observations you add per turn, not a separate mechanism. Callers
 * are expected (not enforced here) to give every observation in the batch
 * the same source_turn, since they came from one user statement.
 */
export function addObservations(
  su: StructuredUnderstanding,
  observations: ScopedObservation[],
): StructuredUnderstanding {
  return observations.reduce(addObservation, su)
}

/**
 * Supersede the current active observation identified by targetId with a
 * new one. The prior observation is marked superseded_by, never deleted or
 * edited. Throws if targetId doesn't exist or is already superseded (see
 * module-level invariant above).
 */
export function supersedeObservation(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: ScopedObservation,
): StructuredUnderstanding {
  const target = su.scoped_observations.find((o) => o.observation_id === targetId)
  if (!target) {
    throw new Error(`Cannot supersede unknown observation: ${targetId}`)
  }
  if (target.superseded_by !== null) {
    throw new Error(
      `Cannot supersede observation ${targetId}: it is already superseded by ${target.superseded_by}. ` +
      `Corrections must target the current head of the chain, not a historical snapshot.`,
    )
  }
  if (replacement.observation_id === targetId) {
    throw new Error(`Replacement observation must have a different id than the observation it supersedes: ${targetId}`)
  }
  if (su.scoped_observations.some((o) => o.observation_id === replacement.observation_id)) {
    throw new Error(`Replacement observation id already exists: ${replacement.observation_id}`)
  }
  if (replacement.superseded_by !== null) {
    throw new Error(
      `A newly added replacement observation cannot already be superseded (observation_id: ${replacement.observation_id})`,
    )
  }

  return {
    ...su,
    scoped_observations: [
      ...su.scoped_observations.map((o) =>
        o.observation_id === targetId ? { ...o, superseded_by: replacement.observation_id } : o,
      ),
      replacement,
    ],
  }
}

/**
 * Retract an observation without asserting a new fact in its place --
 * "actually, forget what I said about that." Implemented as a supersede
 * whose replacement carries a low-certainty confidence (default 'unknown')
 * rather than a confirmed value, so retraction reuses the exact same
 * non-destructive mechanism as correction instead of being a second,
 * parallel deletion path. The prior observation remains fully recoverable,
 * same as any other supersession.
 */
export function retractObservation(
  su: StructuredUnderstanding,
  targetId: string,
  retraction: {
    observation_id: string
    source_turn: number
    source_statement: string
    note: string
    confidence?: Extract<ScopedObservation['confidence'], 'unknown' | 'declined'>
  },
): StructuredUnderstanding {
  const target = su.scoped_observations.find((o) => o.observation_id === targetId)
  if (!target) {
    throw new Error(`Cannot retract unknown observation: ${targetId}`)
  }
  const replacement: ScopedObservation = {
    observation_id: retraction.observation_id,
    scope: target.scope,
    workflow_stage: target.workflow_stage,
    confidence: retraction.confidence ?? 'unknown',
    status: null,
    note: retraction.note,
    superseded_by: null,
    source_turn: retraction.source_turn,
    source_statement: retraction.source_statement,
  }
  return supersedeObservation(su, targetId, replacement)
}

// ── Tool mentions ────────────────────────────────────────────────────────────

export function addToolMention(
  su: StructuredUnderstanding,
  mention: ToolMention,
): StructuredUnderstanding {
  if (su.tool_mentions.some((m) => m.mention_id === mention.mention_id)) {
    throw new Error(`Tool mention id already exists: ${mention.mention_id}`)
  }
  if (mention.superseded_by !== null) {
    throw new Error(
      `A newly added tool mention cannot already be superseded (mention_id: ${mention.mention_id})`,
    )
  }
  return {
    ...su,
    tool_mentions: [...su.tool_mentions, mention],
  }
}

/**
 * Supersede a tool mention -- e.g. resolving an unresolved_alias to a
 * canonical identifier, or correcting an earlier canonical resolution. Same
 * invariants as supersedeObservation: target must exist and must currently
 * be the active (non-superseded) head of its chain.
 */
export function supersedeToolMention(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: ToolMention,
): StructuredUnderstanding {
  const target = su.tool_mentions.find((m) => m.mention_id === targetId)
  if (!target) {
    throw new Error(`Cannot supersede unknown tool mention: ${targetId}`)
  }
  if (target.superseded_by !== null) {
    throw new Error(
      `Cannot supersede tool mention ${targetId}: it is already superseded by ${target.superseded_by}. ` +
      `Corrections must target the current head of the chain, not a historical snapshot.`,
    )
  }
  if (replacement.mention_id === targetId) {
    throw new Error(`Replacement tool mention must have a different id than the mention it supersedes: ${targetId}`)
  }
  if (su.tool_mentions.some((m) => m.mention_id === replacement.mention_id)) {
    throw new Error(`Replacement tool mention id already exists: ${replacement.mention_id}`)
  }
  if (replacement.superseded_by !== null) {
    throw new Error(
      `A newly added replacement tool mention cannot already be superseded (mention_id: ${replacement.mention_id})`,
    )
  }

  return {
    ...su,
    tool_mentions: [
      ...su.tool_mentions.map((m) =>
        m.mention_id === targetId ? { ...m, superseded_by: replacement.mention_id } : m,
      ),
      replacement,
    ],
  }
}

// ── Asset provider mentions (Living Knowledge — Third-Party Source Rights,
// M1+M2, 2026-08-18) ─────────────────────────────────────────────────────────

/**
 * Mirrors addToolMention exactly — same duplicate-id / already-superseded-
 * on-add invariants, no additional cap (unlike user_goals' MAX_ACTIVE_
 * USER_GOALS, no PM-approved cap was requested for asset provider mentions;
 * a project may legitimately name several distinct providers).
 */
export function addAssetProviderMention(
  su: StructuredUnderstanding,
  mention: AssetProviderMention,
): StructuredUnderstanding {
  if (su.asset_provider_mentions.some((m) => m.mention_id === mention.mention_id)) {
    throw new Error(`Asset provider mention id already exists: ${mention.mention_id}`)
  }
  if (mention.superseded_by !== null) {
    throw new Error(
      `A newly added asset provider mention cannot already be superseded (mention_id: ${mention.mention_id})`,
    )
  }
  return {
    ...su,
    asset_provider_mentions: [...su.asset_provider_mentions, mention],
  }
}

/**
 * Mirrors supersedeToolMention exactly — same invariants (target must exist
 * and must currently be the active/non-superseded head of its chain).
 */
export function supersedeAssetProviderMention(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: AssetProviderMention,
): StructuredUnderstanding {
  const target = su.asset_provider_mentions.find((m) => m.mention_id === targetId)
  if (!target) {
    throw new Error(`Cannot supersede unknown asset provider mention: ${targetId}`)
  }
  if (target.superseded_by !== null) {
    throw new Error(
      `Cannot supersede asset provider mention ${targetId}: it is already superseded by ${target.superseded_by}. ` +
      `Corrections must target the current head of the chain, not a historical snapshot.`,
    )
  }
  if (replacement.mention_id === targetId) {
    throw new Error(`Replacement asset provider mention must have a different id than the mention it supersedes: ${targetId}`)
  }
  if (su.asset_provider_mentions.some((m) => m.mention_id === replacement.mention_id)) {
    throw new Error(`Replacement asset provider mention id already exists: ${replacement.mention_id}`)
  }
  if (replacement.superseded_by !== null) {
    throw new Error(
      `A newly added replacement asset provider mention cannot already be superseded (mention_id: ${replacement.mention_id})`,
    )
  }

  return {
    ...su,
    asset_provider_mentions: [
      ...su.asset_provider_mentions.map((m) =>
        m.mention_id === targetId ? { ...m, superseded_by: replacement.mention_id } : m,
      ),
      replacement,
    ],
  }
}

// ── Assessment jurisdiction mentions (CRC Assessment-Jurisdiction Mention
// Model, 2026-08-28) ─────────────────────────────────────────────────────────

/**
 * Mirrors addAssetProviderMention exactly -- same duplicate-id /
 * already-superseded-on-add invariants, no cap (a user may legitimately ask
 * for several distinct assessment jurisdictions). Pure and mechanical, same
 * as every other function in this module -- WHETHER to seed a legacy scalar
 * value before this call, or how to resolve a stated correction to a
 * specific target mention_id, are policy decisions made by the caller
 * (lib/crc-engine/assessment-jurisdiction-scope.ts), never by this function.
 */
export function addAssessmentJurisdictionMention(
  su: StructuredUnderstanding,
  mention: AssessmentJurisdictionMention,
): StructuredUnderstanding {
  if (su.assessment_jurisdiction_mentions.some((m) => m.mention_id === mention.mention_id)) {
    throw new Error(`Assessment jurisdiction mention id already exists: ${mention.mention_id}`)
  }
  if (mention.superseded_by !== null) {
    throw new Error(
      `A newly added assessment jurisdiction mention cannot already be superseded (mention_id: ${mention.mention_id})`,
    )
  }
  return {
    ...su,
    assessment_jurisdiction_mentions: [...su.assessment_jurisdiction_mentions, mention],
  }
}

/**
 * Mirrors supersedeAssetProviderMention exactly -- same invariants (target
 * must exist and must currently be the active/non-superseded head of its
 * chain). Used for BOTH a correction ("not New York -- California") and an
 * explicit exclusion (a replacement carrying confidence: 'confirmed_absent')
 * -- there is no separate exclusion function, mirroring UserGoal's own
 * "correction and retraction are the same supersede-with-a-new-attested-
 * value mechanism" precedent.
 */
export function supersedeAssessmentJurisdictionMention(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: AssessmentJurisdictionMention,
): StructuredUnderstanding {
  const target = su.assessment_jurisdiction_mentions.find((m) => m.mention_id === targetId)
  if (!target) {
    throw new Error(`Cannot supersede unknown assessment jurisdiction mention: ${targetId}`)
  }
  if (target.superseded_by !== null) {
    throw new Error(
      `Cannot supersede assessment jurisdiction mention ${targetId}: it is already superseded by ${target.superseded_by}. ` +
      `Corrections must target the current head of the chain, not a historical snapshot.`,
    )
  }
  if (replacement.mention_id === targetId) {
    throw new Error(`Replacement assessment jurisdiction mention must have a different id than the mention it supersedes: ${targetId}`)
  }
  if (su.assessment_jurisdiction_mentions.some((m) => m.mention_id === replacement.mention_id)) {
    throw new Error(`Replacement assessment jurisdiction mention id already exists: ${replacement.mention_id}`)
  }
  if (replacement.superseded_by !== null) {
    throw new Error(
      `A newly added replacement assessment jurisdiction mention cannot already be superseded (mention_id: ${replacement.mention_id})`,
    )
  }

  return {
    ...su,
    assessment_jurisdiction_mentions: [
      ...su.assessment_jurisdiction_mentions.map((m) =>
        m.mention_id === targetId ? { ...m, superseded_by: replacement.mention_id } : m,
      ),
      replacement,
    ],
  }
}

// ── Content presence mentions (CRC Content-Presence Mention Model,
// 2026-08-28) ─────────────────────────────────────────────────────────────

/**
 * Mirrors addAssessmentJurisdictionMention exactly -- same duplicate-id /
 * already-superseded-on-add invariants, no cap. Pure and mechanical: WHETHER
 * a candidate is a fresh addition or a correction target, and how a stated
 * correction resolves to a specific target mention_id, are policy decisions
 * made by the caller (lib/interview-engine/extraction.ts), never by this
 * function.
 */
export function addContentPresenceMention(
  su: StructuredUnderstanding,
  mention: ContentPresenceMention,
): StructuredUnderstanding {
  if (su.content_presence_mentions.some((m) => m.mention_id === mention.mention_id)) {
    throw new Error(`Content presence mention id already exists: ${mention.mention_id}`)
  }
  if (mention.superseded_by !== null) {
    throw new Error(
      `A newly added content presence mention cannot already be superseded (mention_id: ${mention.mention_id})`,
    )
  }
  return {
    ...su,
    content_presence_mentions: [...su.content_presence_mentions, mention],
  }
}

/**
 * Mirrors supersedeAssessmentJurisdictionMention exactly -- same invariants
 * (target must exist and must currently be the active/non-superseded head of
 * its chain). Used for BOTH a correction (real -> synthetic) and an explicit
 * exclusion (a replacement carrying confidence: 'confirmed_absent') -- there
 * is no separate exclusion function, same precedent as
 * supersedeAssessmentJurisdictionMention.
 */
export function supersedeContentPresenceMention(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: ContentPresenceMention,
): StructuredUnderstanding {
  const target = su.content_presence_mentions.find((m) => m.mention_id === targetId)
  if (!target) {
    throw new Error(`Cannot supersede unknown content presence mention: ${targetId}`)
  }
  if (target.superseded_by !== null) {
    throw new Error(
      `Cannot supersede content presence mention ${targetId}: it is already superseded by ${target.superseded_by}. ` +
      `Corrections must target the current head of the chain, not a historical snapshot.`,
    )
  }
  if (replacement.mention_id === targetId) {
    throw new Error(`Replacement content presence mention must have a different id than the mention it supersedes: ${targetId}`)
  }
  if (su.content_presence_mentions.some((m) => m.mention_id === replacement.mention_id)) {
    throw new Error(`Replacement content presence mention id already exists: ${replacement.mention_id}`)
  }
  if (replacement.superseded_by !== null) {
    throw new Error(
      `A newly added replacement content presence mention cannot already be superseded (mention_id: ${replacement.mention_id})`,
    )
  }

  return {
    ...su,
    content_presence_mentions: [
      ...su.content_presence_mentions.map((m) =>
        m.mention_id === targetId ? { ...m, superseded_by: replacement.mention_id } : m,
      ),
      replacement,
    ],
  }
}

// ── User goals (Milestone 1, 2026-08-15) ────────────────────────────────────

/**
 * Max concurrent ACTIVE (non-superseded) user goals a session may hold --
 * PM-approved cap, 2026-08-15. Superseding an existing goal never grows the
 * active count (one active entry is replaced by another), so the cap is
 * enforced only here, in addUserGoal, never in supersedeUserGoal -- the
 * same "cap growth vs. supersession" distinction every other bounded list
 * in this codebase already respects (e.g. boundaries.ts's per-signal caps
 * are untouched by ordinary correction/supersession elsewhere).
 */
export const MAX_ACTIVE_USER_GOALS = 3

/**
 * Add one new user goal. Mirrors addObservation's own invariants exactly
 * (duplicate-id / already-superseded-on-add rejection), plus the
 * PM-approved active-goal cap: a 4th concurrent active goal is rejected
 * rather than silently accepted or silently dropped -- Extraction's own
 * pipeline (extraction.ts) classifies this rejection the same way it
 * already classifies every other mutation-invariant violation (via
 * classifyMutationError's MUTATION_ERROR_OTHER fallback), so a 4th stated
 * goal surfaces as a visible, diagnosable rejection, never a silent no-op.
 */
export function addUserGoal(su: StructuredUnderstanding, goal: UserGoal): StructuredUnderstanding {
  if (su.user_goals.some((g) => g.goal_id === goal.goal_id)) {
    throw new Error(`User goal id already exists: ${goal.goal_id}`)
  }
  if (goal.superseded_by !== null) {
    throw new Error(`A newly added user goal cannot already be superseded (goal_id: ${goal.goal_id})`)
  }
  const activeCount = su.user_goals.filter((g) => g.superseded_by === null).length
  if (activeCount >= MAX_ACTIVE_USER_GOALS) {
    throw new Error(
      `Cannot add user goal ${goal.goal_id}: maximum of ${MAX_ACTIVE_USER_GOALS} active user goals already reached. ` +
        `A correction to an existing goal must supersede it (supersedeUserGoal), not add a new one.`,
    )
  }
  return {
    ...su,
    user_goals: [...su.user_goals, goal],
  }
}

/**
 * Supersede the current active user goal identified by targetId with a
 * new one -- same supersede-and-mark, never-delete-or-edit discipline as
 * supersedeObservation/supersedeToolMention, same invariants (target must
 * exist and must currently be the active head of its own chain). Used for
 * BOTH a content correction ("actually I just need to know if my client
 * can use it") and a retraction/decline (a replacement carrying
 * state: 'declined' or 'confirmed_absent') -- there is no separate retract
 * function, mirroring ToolMention's own precedent (which also has no
 * dedicated retract function; correction and retraction are the same
 * supersede-with-a-new-attested-value mechanism, differing only in what
 * state that value carries), not ScopedObservation's separate
 * retractObservation convenience wrapper.
 */
export function supersedeUserGoal(
  su: StructuredUnderstanding,
  targetId: string,
  replacement: UserGoal,
): StructuredUnderstanding {
  const target = su.user_goals.find((g) => g.goal_id === targetId)
  if (!target) {
    throw new Error(`Cannot supersede unknown user goal: ${targetId}`)
  }
  if (target.superseded_by !== null) {
    throw new Error(
      `Cannot supersede user goal ${targetId}: it is already superseded by ${target.superseded_by}. ` +
      `Corrections must target the current head of the chain, not a historical snapshot.`,
    )
  }
  if (replacement.goal_id === targetId) {
    throw new Error(`Replacement user goal must have a different id than the goal it supersedes: ${targetId}`)
  }
  if (su.user_goals.some((g) => g.goal_id === replacement.goal_id)) {
    throw new Error(`Replacement user goal id already exists: ${replacement.goal_id}`)
  }
  if (replacement.superseded_by !== null) {
    throw new Error(`A newly added replacement user goal cannot already be superseded (goal_id: ${replacement.goal_id})`)
  }

  return {
    ...su,
    user_goals: [
      ...su.user_goals.map((g) => (g.goal_id === targetId ? { ...g, superseded_by: replacement.goal_id } : g)),
      replacement,
    ],
  }
}

// ── Project facts ────────────────────────────────────────────────────────────

/**
 * Plain immutable replacement, not supersede-and-mark: ProjectFacts fields
 * were never modeled with history/supersession semantics (a single live
 * attested value, not an array of observations), so there is no prior
 * fact to mark superseded -- only to replace with a new AttestedFact that
 * carries its own attestation, source_turn, and source_statement. The
 * caller (Extraction, Phase 6a) supplies all three explicitly; nothing here
 * defaults or infers them. su is not mutated -- a new StructuredUnderstanding
 * is returned, same discipline as every other function in this module. A
 * full supersession chain for these fields is not implemented for Prototype
 * Alpha, since the existing domain model doesn't provide one for
 * single-value project facts and none of the eight dialogue fixtures need
 * one -- if that changes, ProjectFacts would need its own array-of-history
 * shape, not a bolt-on to this function.
 */
export function setIntendedUse(
  su: StructuredUnderstanding,
  value: Attested<string>,
  sourceTurn: number,
  sourceStatement: string,
): StructuredUnderstanding {
  return {
    ...su,
    project_facts: {
      ...su.project_facts,
      intended_use: { attestation: value, source_turn: sourceTurn, source_statement: sourceStatement },
    },
  }
}

export function setWorkflowRole(
  su: StructuredUnderstanding,
  value: Attested<string>,
  sourceTurn: number,
  sourceStatement: string,
): StructuredUnderstanding {
  return {
    ...su,
    project_facts: {
      ...su.project_facts,
      workflow_role: { attestation: value, source_turn: sourceTurn, source_statement: sourceStatement },
    },
  }
}

/**
 * `jurisdiction` (CRC Living Knowledge Phase 1, 2026-08-16). Same plain
 * immutable-replacement discipline as setIntendedUse/setWorkflowRole
 * above, verbatim -- no supersession chain, per ProjectFacts' own
 * documented reasoning (types/interview-engine.ts). A later, corrected
 * statement simply overwrites the current AttestedFact.
 *
 * UNUSED in production as of the CRC Assessment-Jurisdiction Mention Model —
 * Post-Integration Cleanup (2026-08-28): extraction.ts's own project_fact
 * dispatch branch for 'jurisdiction' was removed (that candidate shape is no
 * longer even constructible -- see CandidateObservation.raw_fact_field /
 * ProposedFact's own project_fact field union in extraction.ts), closing the
 * Integration Review's Finding 1. Kept rather than deleted, per that
 * cleanup's own smallest-change discipline -- `project_facts.jurisdiction`
 * itself is still a legitimate, still-read field (the legacy scalar
 * compatibility bridge in lib/crc-engine/assessment-jurisdiction-scope.ts
 * reads it directly), and this function remains a well-formed, historically
 * accurate StructuredUnderstanding operation over that same field. Confirmed
 * zero call sites anywhere in production code by
 * subsystem-boundaries.test.ts's own dedicated assertion.
 */
export function setJurisdiction(
  su: StructuredUnderstanding,
  value: Attested<string>,
  sourceTurn: number,
  sourceStatement: string,
): StructuredUnderstanding {
  return {
    ...su,
    project_facts: {
      ...su.project_facts,
      jurisdiction: { attestation: value, source_turn: sourceTurn, source_statement: sourceStatement },
    },
  }
}

/**
 * `human_contribution_description` (Copyright UAT Correction Milestone,
 * 2026-08-19, PM-approved H2; invariant clarified and now actually
 * enforced upstream, Copyright UAT Cumulative-Restatement Fix, 2026-08-19,
 * P1). Same plain immutable-replacement discipline as
 * setIntendedUse/setWorkflowRole/setJurisdiction above, verbatim -- no
 * supersession chain, no change to this function's own body.
 *
 * Exact invariant this function TRUSTS its caller to have already
 * guaranteed (it does not, and cannot, re-check any of this itself --
 * it has no access to the candidate that produced `value`, only the
 * value): a `value` reaching this function while a confirmed description
 * already exists must be a COMPLETE CURRENT-STATE RESTATEMENT -- either
 * the full cumulative picture (an additive extension folds prior detail
 * IN, never drops it) or the full corrected picture (a genuine correction
 * replaces the specific corrected detail, not merely appends a
 * contradiction) -- never just the new sentence fragment alone. Before
 * this fix, that invariant was documented but unenforceable (the
 * extractor had no way to see the current value at all, so "restate the
 * cumulative picture" was an unfulfillable instruction) and had no
 * upstream guard, which is exactly how a real live UAT's incidental,
 * unrelated disclosure ("I sourced everything else on my end") silently
 * overwrote a rich, already-confirmed answer. Both gaps are now closed
 * one layer up, in extraction.ts's own `runExtractionPipeline`: (a) the
 * extractor is given the current confirmed value via
 * `RawUserTurn.current_human_contribution_description` (see anthropic-
 * extractor.ts's `buildUserMessageContent`), so it has something real to
 * extend/correct FROM, and (b) a candidate proposing to replace an
 * already-confirmed value is deterministically REJECTED before ever
 * reaching this function unless the extractor flagged it `is_correction`
 * (the same generic, already-established "extractor flags it, code
 * enforces it" split tool_mention/user_goal/asset_provider_mention
 * corrections already use). This function's own contract is therefore
 * unchanged -- it has always been, and remains, an unconditional trust-the-
 * caller overwrite -- only the caller's own reliability improved.
 */
export function setHumanContributionDescription(
  su: StructuredUnderstanding,
  value: Attested<string>,
  sourceTurn: number,
  sourceStatement: string,
): StructuredUnderstanding {
  return {
    ...su,
    project_facts: {
      ...su.project_facts,
      human_contribution_description: { attestation: value, source_turn: sourceTurn, source_statement: sourceStatement },
    },
  }
}
