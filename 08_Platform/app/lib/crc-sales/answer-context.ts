/**
 * CRC -> Sales SECONDARY "answer context" (CAH-3B §15-§18).
 *
 * OPTIONAL, lazy, current-governed-knowledge view. It runs the UNCHANGED
 * CRC pipeline and then projects ONLY permitted upstream representations.
 * It is NOT required for the lead list, contact detail, transcript, or
 * Sales workflow state -- any of those work with this returning
 * `{ available: false }`.
 *
 * ── BI ownership (CAH-3B.1) ──
 *
 * This module CONSUMES authoritative Bounded Interpretation; it does not
 * PRODUCE it. The authority chain is:
 *
 *   Living Knowledge -> Retrieval -> Bounded Interpretation -> Sales projection
 *
 * `runCRCConversation()` is the single authoritative CRC pipeline. It
 * computes Retrieval AND Bounded Interpretation internally and now exposes
 * both on its result (`trace.retrieval_results`, `diagnostics.retrieval`,
 * and `bounded_interpretations` -- the last exposed by the CAH-3B.1
 * additive contract change, the exact array the pipeline already passed to
 * Projection). This module reads those authoritative values and does
 * nothing more than field selection + deterministic rendering + fail-closed
 * handling. It MUST NOT import or invoke `buildBoundedInterpretations` or
 * any BI-construction primitive -- enforced by
 * __tests__/crc-sales/bi-ownership.test.ts.
 *
 * ── Structural boundedness (Correction 4) ──
 *
 * Every emitted item is one of three exhaustive kinds, each tied to a
 * permitted upstream representation, each carrying machine-readable
 * provenance:
 *   - goal status         <- BoundedInterpretation (status + supporting /
 *                            unresolved claim id lists)
 *   - governed reference   <- RetrievalResult (identifiers + Track C
 *                            provenance)
 *   - unresolved applicability <- RetrievalDiagnostic{reason:'applicability_unmet'}
 *
 * A `discovered_topic` RetrievalResult with no `matched_goal_category` is
 * OMITTED (Track C provenance missing -> fail closed). An unrecognised BI
 * status renders as `unclassified` -- never improvised wording, never an
 * LLM call. There is no ranking, no scoring, no "top issue", no
 * recommendation. No item is derived from raw `StructuredUnderstanding`.
 */

import { runCRCConversation } from '@/lib/crc-engine/run-crc-conversation'
import { MATRIX_FIXTURE } from '@/lib/retrieval-engine/matrix-fixture'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'
import { TOPIC_RELATIONSHIPS_FIXTURE } from '@/lib/retrieval-engine/topic-relationships-fixture'
import type { StructuredUnderstanding } from '@/types/interview-engine'
import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'
import type {
  SalesAnswerContext,
  SalesAnswerGoalStatus,
  SalesAnswerGovernedReference,
  SalesAnswerUnresolvedApplicability,
} from './types'

const TEMPORAL_NOTE =
  'This reflects SI8’s current governed knowledge, recomputed now from the customer’s CRC project state. ' +
  'It is not a record of exactly what CRC told the customer during the conversation.'

/**
 * Exhaustive, fixed rendering of every BoundedInterpretation.status value.
 * A value not in this map renders as `unclassified` (fail closed) -- the
 * map is asserted exhaustive against INTERPRETATION_STATUSES by test.
 */
const INTERPRETATION_STATUS_LABEL: Record<InterpretationStatus, string> = {
  directly_relevant: 'CRC shared governed platform information relevant to this goal.',
  relevant_applicability_unresolved:
    'CRC found governed information relevant to this goal but could not confirm from the conversation how it applies.',
  outside_current_coverage: 'CRC had no governed coverage to share for this goal.',
  determination_declined: 'The customer asked CRC to certify or determine something, which CRC does not do.',
}

const UNCLASSIFIED_LABEL = 'CRC’s answer for this goal could not be classified.'

export function buildSalesAnswerContext(
  su: StructuredUnderstanding,
  sessionRuntimeCommit: string | null,
): SalesAnswerContext {
  let results
  let retrievalDiagnostics
  let interpretations
  try {
    const pipe = runCRCConversation(su, MATRIX_FIXTURE, TOPIC_CLAIMS_FIXTURE, TOPIC_RELATIONSHIPS_FIXTURE)
    // Consume authoritative upstream values -- never re-run Retrieval or BI.
    results = pipe.trace.retrieval_results
    retrievalDiagnostics = pipe.diagnostics.retrieval
    interpretations = pipe.bounded_interpretations
  } catch {
    return { available: false, temporal_note: TEMPORAL_NOTE, session_runtime_commit: sessionRuntimeCommit }
  }
  // Missing authoritative BI -> do not reconstruct it; current-LK context unavailable.
  if (!Array.isArray(interpretations)) {
    return { available: false, temporal_note: TEMPORAL_NOTE, session_runtime_commit: sessionRuntimeCommit }
  }

  const goal_statuses: SalesAnswerGoalStatus[] = interpretations.map((bi) => {
    const known = (INTERPRETATION_STATUS_LABEL as Record<string, string | undefined>)[bi.status]
    return {
      goal_category: bi.category,
      goal_text: bi.goal_text,
      interpretation_status: known ? bi.status : 'unclassified',
      interpretation_status_label: known ?? UNCLASSIFIED_LABEL,
      supporting_claim_ids: [...bi.supporting_claim_ids],
      unresolved_relevant_claim_ids: bi.unresolved_relevant_claims.map((c) => c.claim_id),
    }
  })

  const governed_references: SalesAnswerGovernedReference[] = []
  for (const r of results) {
    // Track C fail-closed: a discovered result with no authorizing goal
    // category cannot be safely shown (it would read as an explicit-goal
    // answer). matched_goal_category is required, always resolved for
    // exact_topic/related_topic; for discovered_topic it carries the
    // originating explicit goal. Omit if absent.
    if (r.match_origin === 'discovered_topic' && (r.matched_goal_category == null || String(r.matched_goal_category).length === 0)) {
      continue
    }
    governed_references.push({
      claim_id: r.claim_id,
      matrix_identifier: r.matrix_identifier,
      topic: r.topic,
      match_origin: r.match_origin,
      matched_goal_category: r.matched_goal_category,
      relationship_id: r.relationship_id,
      last_verified: r.last_verified,
    })
  }

  const unresolved_applicability: SalesAnswerUnresolvedApplicability[] = []
  for (const d of retrievalDiagnostics) {
    if (d.reason !== 'applicability_unmet' || !d.unmet_applicability) continue
    for (const detail of d.unmet_applicability) {
      unresolved_applicability.push({
        claim_id: detail.claim_id,
        fact: detail.requirement.fact,
        status: detail.status,
        // The diagnostic's `identifier` is the goal category it was raised under.
        goal_category: d.identifier as SalesAnswerUnresolvedApplicability['goal_category'],
      })
    }
  }

  return {
    available: true,
    computed_at: new Date().toISOString(),
    session_runtime_commit: sessionRuntimeCommit,
    temporal_note: TEMPORAL_NOTE,
    goal_statuses,
    governed_references,
    unresolved_applicability,
  }
}

export { INTERPRETATION_STATUS_LABEL }
