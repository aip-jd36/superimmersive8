/**
 * "What we understood" summary (PROJECTION_LAYER_ARCHITECTURE.md §3 Step
 * [A], §4, §8; Prototype Beta, Slice 2). `[PROTOTYPE ASSUMPTION -- TO
 * VALIDATE]`: deterministic templating over RetrievalHandoff's own
 * already-structured facts, no LLM. This slice tests whether that
 * assumption reads naturally enough in practice -- it is not a
 * permanently frozen rendering strategy (architecture doc §8, §10).
 *
 * Two-stage design, deliberately separated (the architecture doc's own
 * "structured representation first, then deterministic rendering"
 * question, answered here): `buildUnderstoodFacts()` extracts a narrow,
 * rendering-scoped view of the handoff -- only the fields this summary
 * ever needs, in a shape convenient for templating -- NOT a second
 * parallel copy of RetrievalHandoff's full domain model (confidence
 * states, tool-resolution kinds, provenance, exclusions, certainty_state
 * are all absent here, on purpose). `renderUnderstoodSummary()` then
 * turns that structured view into prose, with zero further
 * fact-interpretation of its own. Splitting these lets a later revision
 * change *wording* without touching *what counts as a fact*, and vice
 * versa -- exactly the discipline this whole pipeline already uses
 * everywhere else (Retrieval's own extract → filter → assemble split).
 *
 * Input: RetrievalHandoff only. Does not read RetrievalResult[], does not
 * import anything from lib/retrieval-engine/ -- verified structurally by
 * this module's own test (mirroring Slice 1B's import-boundary test).
 * One deliberate consequence of that boundary: the same
 * "confirmed"/"confirmed_absent"-only observation filter
 * lib/retrieval-engine/extract-matchable-facts.ts already implements is
 * reimplemented independently here (a few lines) rather than imported, so
 * this module carries zero dependency on any Retrieval-internal module.
 * This is not a duplication of RetrievalHandoff itself -- it is a small,
 * self-contained filter over one field of it, and it is *more* defensive
 * than the existing one (see the sentinel note below), not a downgrade.
 *
 * Preserve, never synthesize: every clause below states only a fact
 * already present in the handoff -- verbatim where the handoff carries
 * prose (observation notes, intended_use, workflow_role, tool
 * identifiers), and via fixed connective phrasing only where nothing is
 * being invented (e.g. "You mentioned using..."). Nothing here compares,
 * ranks, evaluates, or draws a conclusion across facts, and nothing here
 * contains risk, approval, or clearance language -- those concepts do not
 * exist anywhere in RetrievalHandoff, so there is nothing to accidentally
 * carry forward, but no fixed phrase below introduces any either.
 *
 * Non-affirmative sentinel handling -- decided here, and more defensive
 * than lib/retrieval-engine/extract-matchable-facts.ts's own
 * NON_MATCHABLE_SENTINELS list, worth flagging explicitly rather than
 * silently diverging: `attestedToHandoffValue()`
 * (lib/interview-engine/handoff.ts) can return `'confirmed_absent'` or
 * `'declined'` for ANY `Attested<string>` field it is applied to -- not
 * just the field-specific `'unresolved'`/`'unknown'`/`'unclear'` fallback
 * each field's own type comment documents. This is already known for
 * `workflow_role`/`intended_use` (extract-matchable-facts.ts's own header
 * comment names it) and, confirmed by inspection for this module, is
 * equally true for `RetrievalHandoffTool.access_surface`/`plan_tier`:
 * handoff.ts applies the exact same `attestedToHandoffValue()` function to
 * those two fields (lines 71-72). extract-matchable-facts.ts's own
 * sentinel list omits `'confirmed_absent'` -- it never needed to include
 * it, since Retrieval's `MatchableFacts.tools` never carries
 * access_surface/plan_tier at all, so the gap never had a code path to
 * matter through. Not fixed here (Retrieval's own code is out of this
 * slice's scope), but flagged in the Slice 2 report. This module's own
 * sentinel set includes `'confirmed_absent'`, checked uniformly against
 * all four scalar-valued fields (workflow_role, intended_use,
 * access_surface, plan_tier).
 *
 * Observation filtering: only `'confirmed'`/`'confirmed_absent'`
 * observations are rendered -- `'unresolved_no_visibility'`/`'unknown'`/
 * `'declined'` observations are silently omitted, never acknowledged as a
 * gap. This mirrors extract-matchable-facts.ts's own
 * `isMatchableObservation` discipline (reimplemented independently here,
 * per the import-boundary note above). "Do not pad" (explicit
 * instruction): a sparse handoff produces a sparse summary by
 * construction, not by a special-cased branch -- every clause function
 * below simply returns null when it has nothing confirmed to say, and
 * `renderUnderstoodSummary` filters nulls out before joining. When
 * nothing at all is confirmed, the result is `''` (empty string) -- how a
 * caller renders an empty summary (omit the section entirely, matching
 * every other "empty means absent" precedent in this pipeline) is an
 * assembly-layer decision, deliberately out of scope for this slice.
 */

import type { ObservationScope, RetrievalHandoff } from '@/types/interview-engine'

// ── Stage 1: structured extraction ──────────────────────────────────────

/** One resolved tool, narrowed to exactly what rendering needs. */
export interface UnderstoodTool {
  identifier: string
  access_surface: string | null
  plan_tier: string | null
}

/** One confirmed/confirmed-absent observation, narrowed to scope + note. */
export interface UnderstoodObservation {
  scope: ObservationScope
  note: string
}

export interface UnderstoodFacts {
  tools: UnderstoodTool[]
  unresolved_tool_mentions: string[]
  workflow_role: string | null
  intended_use: string | null
  observations: UnderstoodObservation[]
}

const NON_AFFIRMATIVE_SENTINELS: readonly string[] = ['unresolved', 'unknown', 'unclear', 'confirmed_absent', 'declined']

/** Collapses any of the sentinel strings a scalar Attested<string> field can produce to null; passes a real value through unchanged. */
function affirmativeScalar(value: string): string | null {
  return NON_AFFIRMATIVE_SENTINELS.includes(value) ? null : value
}

export function buildUnderstoodFacts(handoff: RetrievalHandoff): UnderstoodFacts {
  return {
    tools: handoff.tools.map((t) => ({
      identifier: t.identifier,
      access_surface: affirmativeScalar(t.access_surface),
      plan_tier: affirmativeScalar(t.plan_tier),
    })),
    unresolved_tool_mentions: [...handoff.unresolved_aliases],
    workflow_role: affirmativeScalar(handoff.workflow_role),
    intended_use: affirmativeScalar(handoff.intended_use),
    observations: handoff.scoped_observations
      .filter((o) => o.confidence === 'confirmed' || o.confidence === 'confirmed_absent')
      .map((o) => ({ scope: o.scope, note: o.note })),
  }
}

// ── Stage 2: deterministic rendering ────────────────────────────────────

function joinNaturally(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function describeTool(tool: UnderstoodTool): string {
  const parts = [tool.access_surface, tool.plan_tier].filter((p): p is string => p !== null)
  return parts.length > 0 ? `${tool.identifier} (${parts.join(', ')})` : tool.identifier
}

function toolsClause(tools: UnderstoodTool[]): string | null {
  if (tools.length === 0) return null
  return `You mentioned using ${joinNaturally(tools.map(describeTool))}.`
}

function unresolvedMentionsClause(mentions: string[], precededByToolsClause: boolean): string | null {
  if (mentions.length === 0) return null
  const lead = precededByToolsClause ? 'You also mentioned' : 'You mentioned'
  const quoted = mentions.map((m) => `"${m}"`)
  return `${lead} ${joinNaturally(quoted)}, which I wasn't able to match to a specific platform yet.`
}

function roleClause(role: string | null): string | null {
  if (role === null) return null
  return `You said your role on this is ${role}.`
}

function intendedUseClause(use: string | null): string | null {
  if (use === null) return null
  return `You mentioned this is for ${use}.`
}

const SCOPE_LABELS: Record<ObservationScope, string> = {
  current_project: 'On the current project',
  historical_project: 'From a past project',
  general_practice: 'In general',
}

/** Fixed, not input-order -- keeps current/historical/general readable and stable across runs regardless of the order observations happen to appear in the handoff. */
const SCOPE_ORDER: readonly ObservationScope[] = ['current_project', 'historical_project', 'general_practice']

/** One clause per scope that has at least one observation -- never one clause spanning multiple scopes, which is exactly the collapse the architecture doc's "important distinction" forbids. Multiple notes within the SAME scope are joined into that one scope's clause (required case: "multiple observations in one workflow"). */
function observationClauses(observations: UnderstoodObservation[]): string[] {
  const clauses: string[] = []
  for (const scope of SCOPE_ORDER) {
    const notes = observations.filter((o) => o.scope === scope).map((o) => o.note)
    if (notes.length === 0) continue
    clauses.push(`${SCOPE_LABELS[scope]}: ${notes.join(' ')}`)
  }
  return clauses
}

export function renderUnderstoodSummary(facts: UnderstoodFacts): string {
  const tools = toolsClause(facts.tools)
  const clauses = [
    tools,
    unresolvedMentionsClause(facts.unresolved_tool_mentions, tools !== null),
    roleClause(facts.workflow_role),
    intendedUseClause(facts.intended_use),
    ...observationClauses(facts.observations),
  ].filter((c): c is string => c !== null)

  return clauses.join(' ')
}
