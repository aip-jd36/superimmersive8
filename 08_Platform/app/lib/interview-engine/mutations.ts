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
  ScopedObservation,
  StructuredUnderstanding,
  ToolMention,
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
