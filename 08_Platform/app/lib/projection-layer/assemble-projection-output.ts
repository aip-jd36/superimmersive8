/**
 * Full ProjectionOutput assembly (PROJECTION_LAYER_ARCHITECTURE.md §3
 * Step [D], §4, §5, §8; Prototype Beta, Slice 3). Pure composition of the
 * two already-built, already-tested pure functions -- no new inference,
 * no new rendering logic, no rewriting of anything either one produces.
 *
 * `[PRINCIPLE]` opening_line and closing_cta are fixed, deterministic v1
 * copy (JD decision, 2026-08-08) -- no LLM generation, no variation, no
 * dynamic CTA logic. The closing CTA is deliberately softer than a direct
 * sales pitch: it preserves the CRC/SI8 boundary this whole pipeline is
 * built around (CRC reports structured knowledge; SI8 performs the
 * separate, human-reviewed commercial assurance assessment) -- this
 * module has no mechanism to change that copy per-conversation and must
 * not grow one without an explicit future decision.
 *
 * `[PRINCIPLE]` Fully-empty handling (JD decision, 2026-08-08; extended
 * 2026-08-15 for Milestone 2): when `understood_summary === ''` AND
 * `knowledge_items.length === 0` AND `goal_interpretations.length === 0`,
 * this function returns an all-empty ProjectionOutput -- including empty
 * opening_line and closing_cta -- rather than the fixed copy. This is a
 * deliberate exception to "opening/closing are always fixed": the system
 * must never manufacture framing ("Here's what I understood...") or a
 * commercial CTA when there is genuinely nothing substantive to project
 * (e.g. a full opt-out, or a conversation that produced zero confirmed
 * facts and zero eligible knowledge). A stated, confirmed user goal is
 * substantive on its own -- a conversation with no facts/knowledge but one
 * confirmed goal still has something real to project (the interpretation
 * itself), so it must not trigger the all-empty branch.
 * `assembleProjectionOutput` always returns a valid `ProjectionOutput`
 * object either way -- never `null`, never an optional wrapper -- callers
 * branch on field emptiness, not on presence/absence of the object itself.
 *
 * Diagnostics from `projectKnowledgeItems` are returned as a sibling of
 * `output`, never folded into `ProjectionOutput` itself -- `ProjectionOutput`
 * has no diagnostics field (types.ts), matching the Output Contract
 * exactly, and mirroring how `retrieve()` and `projectKnowledgeItems()`
 * both already return `{ <content>, diagnostics }` shapes rather than
 * embedding diagnostics in their own content.
 *
 * Composition only: `buildUnderstoodFacts` + `renderUnderstoodSummary`
 * (Slice 2) produce `understood_summary`; `projectKnowledgeItems`
 * (Slice 1B) produces `knowledge_items` + `diagnostics`. This module adds
 * zero fact-interpretation of its own -- it decides only (a) which fixed
 * copy to attach, per the all-empty rule above, and (b) how to shape the
 * final object. "Topics that often come up" has no field on
 * `ProjectionOutput` and no code path here that could populate one --
 * still unsupported by design, not by omission (PROJECTION_LAYER_
 * ARCHITECTURE.md §5).
 *
 * Import boundary, unchanged from every other module in this layer: no
 * Matrix, no Living Notebook, no Retrieval-internal module, no LLM/adapter
 * code. The one necessary exception is `RetrievalResult`'s own type
 * (lib/retrieval-engine/types.ts) -- one of Projection's two canonical
 * inputs, already an established exception in project-knowledge-items.ts.
 */

import type { RetrievalHandoff } from '@/types/interview-engine'
import type { RetrievalResult } from '@/lib/retrieval-engine/types'
import type { BoundedInterpretation } from '@/lib/bounded-interpretation/types'
import { buildUnderstoodFacts, renderUnderstoodSummary } from './understood-summary'
import { projectKnowledgeItems } from './project-knowledge-items'
import type { ProjectionDiagnostic, ProjectionGoalInterpretation, ProjectionOutput } from './types'

const OPENING_LINE = "Here's what I understood about your workflow."
const CLOSING_CTA = 'If you need a human-reviewed commercial assurance assessment of the full workflow, SI8 can review it.'

export interface AssembleProjectionOutputResult {
  output: ProjectionOutput
  diagnostics: ProjectionDiagnostic[]
}

/**
 * Narrows the internal BoundedInterpretation shape (goal_id, status,
 * supporting_claim_ids -- all internal-only) down to the rendering-safe
 * ProjectionGoalInterpretation shape, mirroring projectKnowledgeItems'
 * own RetrievalResult -> ProjectionKnowledgeItem narrowing one function
 * over. Pure, no branching on content -- every interpretation the caller
 * hands in is rendered; deciding WHICH interpretations exist is
 * lib/bounded-interpretation's job, not this one's.
 */
function renderGoalInterpretations(interpretations: BoundedInterpretation[]): ProjectionGoalInterpretation[] {
  return interpretations.map((i) => ({ goal_text: i.goal_text, summary: i.summary, summary_blocks: i.summary_blocks }))
}

/**
 * `interpretations` defaults to `[]` (Milestone 2, 2026-08-15) -- additive,
 * backward-compatible third parameter. Every existing caller that predates
 * Milestone 2 (in particular this module's own test suite) continues to
 * compile and behave identically without passing it.
 */
export function assembleProjectionOutput(
  handoff: RetrievalHandoff,
  results: RetrievalResult[],
  interpretations: BoundedInterpretation[] = [],
): AssembleProjectionOutputResult {
  const understood_summary = renderUnderstoodSummary(buildUnderstoodFacts(handoff))
  const { knowledge_items, diagnostics } = projectKnowledgeItems(results)
  const goal_interpretations = renderGoalInterpretations(interpretations)

  if (understood_summary === '' && knowledge_items.length === 0 && goal_interpretations.length === 0) {
    return {
      output: { opening_line: '', understood_summary: '', knowledge_items: [], goal_interpretations: [], closing_cta: '' },
      diagnostics,
    }
  }

  return {
    output: {
      opening_line: OPENING_LINE,
      understood_summary,
      knowledge_items,
      goal_interpretations,
      closing_cta: CLOSING_CTA,
    },
    diagnostics,
  }
}
