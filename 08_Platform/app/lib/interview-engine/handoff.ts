/**
 * Interview -> Retrieval handoff assembly (CRC_PROTOTYPE_ALPHA_ROADMAP.md
 * Phase 5; INTERVIEW_ENGINE_ARCHITECTURE.md §12).
 *
 * A pure projection from current StructuredUnderstanding into the handoff
 * object. This phase validates the contract only -- Retrieval itself is
 * completely absent, and this module does not import gates.ts, boundaries.ts,
 * or anything Matrix/Retrieval-related. Answers exactly one question: given
 * the Interview Engine's current understanding, what factual, structured
 * state may be supplied downstream?
 *
 * certainty_state is read directly from `understanding.gate_1_state` -- a
 * field already stored on StructuredUnderstanding per architecture doc §3's
 * per-turn output contract -- rather than by importing evaluateGate1 from
 * gates.ts. This is a deliberate, load-bearing choice: it keeps this module
 * independent of the gate evaluator (per the Phase 5 requirement) while
 * still avoiding a second, independent reimplementation of Gate 1's own
 * logic that could silently drift from gates.ts over time. The caller is
 * responsible for keeping gate_1_state current (as gates.ts already is, per
 * Phase 3); this module trusts, but does not recompute, it.
 */

import type {
  Attested,
  RetrievalHandoff,
  RetrievalHandoffTool,
  StructuredUnderstanding,
} from '@/types/interview-engine'

/**
 * Maps a single Attested<string> fact to its handoff string representation.
 * Preserves declined and confirmed_absent as their own distinct literal
 * values -- never silently folded into the same fallback as genuine
 * unresolved/unknown -- per the explicit "no hidden conversion of decline
 * into unknown or absence" exclusion. unresolved_no_visibility and unknown
 * share one fallback (the field's own designated sentinel word, e.g.
 * 'unresolved'/'unknown'/'unclear') since the frozen §12 schema itself only
 * anticipated one non-confirmed fallback per field, not the full 5-state
 * taxonomy at the string-value level.
 */
function attestedToHandoffValue(attested: Attested<string>, unresolvedFallback: string): string {
  switch (attested.state) {
    case 'confirmed':
      return attested.value
    case 'confirmed_absent':
      return 'confirmed_absent'
    case 'declined':
      return 'declined'
    case 'unresolved_no_visibility':
    case 'unknown':
      return unresolvedFallback
  }
}

const CERTAINTY_STATE_BY_GATE_1: Record<StructuredUnderstanding['gate_1_state'], RetrievalHandoff['certainty_state']> = {
  met: 'gate_1_met',
  not_met: 'gate_1_unmet',
  not_applicable_declined: 'declined',
}

export function buildRetrievalHandoff(understanding: StructuredUnderstanding): RetrievalHandoff {
  const activeTools = understanding.tool_mentions.filter((m) => m.superseded_by === null)
  const activeObservations = understanding.scoped_observations.filter((o) => o.superseded_by === null)
  const activeAssetProviders = understanding.asset_provider_mentions.filter((m) => m.superseded_by === null)

  const tools: RetrievalHandoffTool[] = []
  const unresolvedAliases: string[] = []
  for (const m of activeTools) {
    if (m.resolution.kind === 'canonical') {
      tools.push({
        identifier: m.resolution.identifier,
        access_surface: attestedToHandoffValue(m.access_surface, 'unresolved'),
        plan_tier: attestedToHandoffValue(m.plan_tier, 'unknown'),
      })
    } else {
      // Never forced into a canonical tool -- an unresolved alias contributes
      // only its raw name, nothing invented in its place.
      unresolvedAliases.push(m.resolution.raw_name)
    }
  }

  /**
   * Living Knowledge — Third-Party Source Rights, M1+M2 (2026-08-18). Mirrors
   * the tools/unresolvedAliases block immediately above exactly, simplified
   * (no access_surface/plan_tier dimension). Deliberately NOT merged into
   * `tools`/`unresolved_aliases` -- an asset provider is not a tool, and
   * conflating the two arrays would make it impossible for Projection to
   * distinguish "an AI generation platform I don't recognize" from "a source
   * material provider I don't recognize" (see understood-summary.ts).
   */
  const assetProviders: string[] = []
  const unresolvedAssetProviderMentions: string[] = []
  for (const m of activeAssetProviders) {
    if (m.resolution.kind === 'canonical') {
      assetProviders.push(m.resolution.identifier)
    } else {
      unresolvedAssetProviderMentions.push(m.resolution.raw_name)
    }
  }

  const exclusions: string[] = []
  if (understanding.project_facts.intended_use.attestation.state === 'declined') exclusions.push('project_facts.intended_use')
  if (understanding.project_facts.workflow_role.attestation.state === 'declined') exclusions.push('project_facts.workflow_role')
  for (const m of activeTools) {
    if (m.access_surface.state === 'declined') exclusions.push(`tool_mentions.${m.mention_id}.access_surface`)
    if (m.plan_tier.state === 'declined') exclusions.push(`tool_mentions.${m.mention_id}.plan_tier`)
  }
  for (const o of activeObservations) {
    if (o.confidence === 'declined') exclusions.push(`scoped_observations.${o.observation_id}`)
  }

  return {
    tools,
    unresolved_aliases: unresolvedAliases,
    asset_providers: assetProviders,
    unresolved_asset_provider_mentions: unresolvedAssetProviderMentions,
    workflow_role: attestedToHandoffValue(understanding.project_facts.workflow_role.attestation, 'unresolved'),
    intended_use: attestedToHandoffValue(understanding.project_facts.intended_use.attestation, 'unclear'),
    // Active (non-superseded) observations only, in whatever scope they
    // actually carry -- current_project and historical_project entries are
    // passed through untouched and unmerged, never collapsed together.
    scoped_observations: activeObservations,
    certainty_state: CERTAINTY_STATE_BY_GATE_1[understanding.gate_1_state],
    exclusions,
  }
}
