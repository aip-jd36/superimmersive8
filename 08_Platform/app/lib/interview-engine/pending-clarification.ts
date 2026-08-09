/**
 * Pending clarification (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §3, Live
 * Interview Runtime milestone; carried forward from
 * PROTOTYPE_ALPHA_RETROSPECTIVE.md's own Option D3 recommendation, closing
 * the `ambiguous_multi_surface_tool` gap that failed to disambiguate in
 * 3/3 live runs during Prototype Alpha).
 *
 * `unresolved_summary` is a small, deterministic, templated rendering of
 * the record a pending question targets -- computed by a pure function of
 * `StructuredUnderstanding`, the same shape of function
 * `deriveEligibleSignals` already is, never copied from a live model's own
 * prose. This is the entire point of D3 over D2: Extraction's next-turn
 * context must not depend on a *different* subsystem's non-deterministic
 * phrasing (candidate-question generation's own live `question_text`,
 * already documented to vary run-to-run for identical underlying state).
 *
 * Lives in lib/interview-engine/, not lib/crc-engine/, for the same
 * reason `buildRetrievalHandoff` does: this is logic operating on
 * `StructuredUnderstanding`-shaped data to produce a value a downstream
 * consumer (the next turn's Extraction call) reads. The *state* -- whether
 * one is currently pending, and its persistence -- is Runtime's own
 * concern (LIVE_INTERVIEW_RUNTIME_ARCHITECTURE.md §3), not this module's.
 *
 * Only two of the six `CandidateQuestionKind` values ever carry a
 * `target_signal_id` (confirmed by reading `boundaries.ts` directly --
 * it throws if `signal_id` is missing for these two):
 * `follow_up_on_signal` and `uncertainty_clarification`. For any other
 * kind, or a null `target_signal_id`, there is no specific record to
 * clarify -- `buildPendingClarification` returns `null`, and Runtime's
 * own session state should clear any previously-pending value rather than
 * carry one forward past the turn it applied to (§3: "singular, not
 * plural" -- at most one at a time, by construction of the one-question-
 * per-turn discipline the rest of this pipeline already enforces).
 */

import { PROJECT_FACT_SIGNAL_IDS, type CandidateQuestionProposal } from './candidate-question'
import type { StructuredUnderstanding } from '@/types/interview-engine'

export const PENDING_CLARIFICATION_KINDS = ['follow_up_on_signal', 'uncertainty_clarification'] as const
export type PendingClarificationKind = (typeof PENDING_CLARIFICATION_KINDS)[number]

export interface PendingClarification {
  signal_id: string
  kind: PendingClarificationKind
  unresolved_summary: string
}

function isPendingClarificationKind(kind: string): kind is PendingClarificationKind {
  return (PENDING_CLARIFICATION_KINDS as readonly string[]).includes(kind)
}

/** Deterministic templating only -- never the proposal's own live-generated question_text. See module header. */
function renderUnresolvedSummary(signal_id: string, su: StructuredUnderstanding): string | null {
  const tool = su.tool_mentions.find((m) => m.mention_id === signal_id && m.superseded_by === null)
  if (tool) {
    return tool.resolution.kind === 'canonical'
      ? `tool mention '${tool.resolution.identifier}'`
      : `tool mention '${tool.resolution.raw_name}', not yet resolved to a specific platform`
  }

  const observation = su.scoped_observations.find((o) => o.observation_id === signal_id && o.superseded_by === null)
  if (observation) {
    return `a ${observation.scope} observation, currently ${observation.confidence}`
  }

  if (signal_id === PROJECT_FACT_SIGNAL_IDS.intended_use) {
    return `project fact intended_use, currently ${su.project_facts.intended_use.attestation.state}`
  }
  if (signal_id === PROJECT_FACT_SIGNAL_IDS.workflow_role) {
    return `project fact workflow_role, currently ${su.project_facts.workflow_role.attestation.state}`
  }

  return null
}

export function buildPendingClarification(proposal: CandidateQuestionProposal, su: StructuredUnderstanding): PendingClarification | null {
  if (!isPendingClarificationKind(proposal.question_kind)) return null
  if (proposal.target_signal_id === null) return null

  const unresolved_summary = renderUnresolvedSummary(proposal.target_signal_id, su)
  if (unresolved_summary === null) return null

  return { signal_id: proposal.target_signal_id, kind: proposal.question_kind, unresolved_summary }
}
