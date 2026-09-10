/**
 * HRR authority gate (CAH-4G.2 Slice 2, 2026-09-10).
 *
 * A DETERMINISTIC layer that runs AFTER structured classification. The model
 * classifies the reviewer's intent; this gate decides what the governed
 * research system is PERMITTED to route. Commercial Assurance authority is
 * NOT enforced by prompt wording — it is enforced here, in plain code.
 *
 * Each semantic intent in the utterance is routed INDEPENDENTLY
 * (`HRR_GRI_TECHNICAL_DESIGN.md §D/§T-5`, CAH-4G.1):
 *   - an assessment-decision request is declined (its own refusal note);
 *   - every explicitly-supported research clause survives on its own, keeping
 *     its OWN scope — a prohibited intent NEVER rewrites a permitted clause's
 *     scope;
 *   - a research clause that ITSELF asks for a determination keeps
 *     `scope: 'determination_request'`, so Bounded Interpretation can later
 *     produce `determination_declined` for it on its own merits (that is
 *     BI's semantic ceiling, not this gate's job);
 *   - nothing explicitly supported + no decision requested -> unsupported,
 *     offer the governed research paths. Never an invented "closest topic".
 *
 * This gate produces NO answer, NO governed proposition, NO assessment
 * conclusion. It never retrieves, never evaluates applicability, never runs
 * BI. It imports nothing from `lib/assessments`, the workbook write path,
 * `lib/crc-sales`, `retrieve.ts`, `lib/bounded-interpretation`, or the
 * consultative composition layer.
 */

import {
  REVIEWER_RESEARCH_TOPICS,
  type ExplicitResearchIntent,
  type HrrAuthorityGateResult,
  type PermittedResearchIntent,
} from './types'

export interface HrrAuthorityGateOptions {
  /**
   * A reference to the originating (audited) reviewer action, stamped onto
   * each interpreted `ExplicitResearchIntent.source_text_ref`. NOT the raw
   * question. Absent in Slice 2 (no audited action id exists yet) -> `null`.
   */
  sourceTextRef?: string | null
}

/** The full governed research-path list to offer when nothing explicit survived — governed enum order, never ranked, never an invented "closest topic". */
const ALL_RESEARCH_PATHS = [...REVIEWER_RESEARCH_TOPICS]

/**
 * Deterministic. `classified` is the validated/normalized classifier output
 * (already deduped + capped by `validateAndNormalizePermittedResearchIntent`).
 */
export function hrrAuthorityGate(
  classified: PermittedResearchIntent,
  options: HrrAuthorityGateOptions = {},
): HrrAuthorityGateResult {
  const sourceTextRef = options.sourceTextRef ?? null

  const research_intents: ExplicitResearchIntent[] = classified.research_intents.map((clause) => ({
    source_kind: 'interpreted_question',
    topic: clause.topic,
    scope: clause.scope, // carried through verbatim — never altered by the gate
    interpreted: true,
    source_text_ref: sourceTextRef,
  }))

  const hasResearch = research_intents.length > 0
  const decisionRequested = classified.assessment_decision_requested

  if (decisionRequested) {
    // The assessment-decision intent is declined as its own block. Research
    // clauses (if any) still run, at their own scope. Offer paths only when
    // there is nothing else to show.
    return {
      authority_note: 'assessment_judgment_redirected',
      research_intents,
      offered_research_paths: hasResearch ? null : [...ALL_RESEARCH_PATHS],
      unresolved_ambiguity: classified.unresolved_ambiguity,
    }
  }

  if (hasResearch) {
    return {
      authority_note: 'research',
      research_intents,
      offered_research_paths: null,
      unresolved_ambiguity: classified.unresolved_ambiguity,
    }
  }

  // Nothing explicit to research, no decision requested.
  return {
    authority_note: 'unsupported',
    research_intents: [],
    offered_research_paths: [...ALL_RESEARCH_PATHS],
    unresolved_ambiguity: classified.unresolved_ambiguity,
  }
}
