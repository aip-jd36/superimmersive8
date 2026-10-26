/**
 * CR-IMPL-1b — Creator Record declarations → the existing retrieval inputs.
 *
 * Mirrors the Product A preview's fact builder
 * (lib/production-review/build-production-facts.ts) and reuses its exported
 * `governedPlanValuesByTool` plus the canonical `normalizeCandidate`:
 *   - tool and provider identity only from `normalizeCandidate` (fail closed:
 *     unresolved or ambiguous names contribute no identity);
 *   - a declared plan reaches the evaluator as `confirmed` only as the one
 *     governed `tool_plan_tier` value it maps to under the shared contract
 *     (retrieval-engine/governed-applicability-values.ts, ADR-001 §L.9:
 *     case/whitespace/Unicode-insensitive, no aliases); the declaration is
 *     kept verbatim. A tool declared with more than one different plan passes
 *     none as confirmed, and governed values among them are reported to the
 *     exclusion gate as withheld;
 *   - account status is not passed in this milestone (always `unknown`);
 *   - jurisdiction is ALWAYS empty. Location answers never reach it.
 * Every fact keeps the declared observation it came from.
 */

import { normalizeCandidate } from '@/lib/interview-engine/extraction'
import { governedPlanValuesByTool } from '@/lib/production-review/build-production-facts'
import { matchGovernedValue, normalizeGovernedValue, type GovernedValueMatch, type WithheldToolFact } from '@/lib/retrieval-engine/governed-applicability-values'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { ToolMention } from '@/types/interview-engine'
import { activeObservations, type DeclaredObservation } from '../contract/provenance'

export type FactDropReason =
  | 'tool_unresolved'
  | 'tool_ambiguous'
  | 'instance_has_conflicting_tools'
  | 'plan_without_resolved_tool'
  | 'plan_not_a_governed_value'
  | 'plan_ambiguous_governed_value'
  | 'plan_conflicting_declarations'
  | 'account_status_not_supported'
  | 'provider_unresolved'

export interface FactProvenance {
  tools: { observation_id: string; instance: string | null; declared: string; tool_id: string | null }[]
  plans: {
    observation_id: string
    instance: string | null
    tool_id: string | null
    declared: string
    /** The governed value the declaration maps to (null if none, or ambiguous). Passed only when `passed_to_applicability`. */
    governed_value: string | null
    passed_to_applicability: boolean
  }[]
  providers: { observation_id: string; declared: string; provider_id: string | null }[]
  dropped: { observation_id: string; reason: FactDropReason }[]
}

export interface CreatorRecordFactsBundle {
  applicabilityFacts: ApplicabilityFacts
  activeToolIds: string[]
  assetProviderIds: string[]
  provenance: FactProvenance
}

const declaredValue = (o: DeclaredObservation) => o.normalized_value ?? o.answer_verbatim

export function buildCreatorRecordFacts(observations: readonly DeclaredObservation[], topicClaims: TopicClaim[]): CreatorRecordFactsBundle {
  const active = activeObservations(observations)
  const governedPlans = governedPlanValuesByTool(topicClaims)
  const provenance: FactProvenance = { tools: [], plans: [], providers: [], dropped: [] }

  // Tool identity, per answer instance.
  const toolByInstance = new Map<string, string | null>()
  const activeToolIds: string[] = []
  for (const o of active) {
    if (o.target.kind !== 'tool_identity') continue
    const raw = declaredValue(o)
    const r = normalizeCandidate({ kind: 'tool_mention', raw_tool_name: raw, raw_text: raw, proposal_id: 'creator-record', turn: 0 })
    const toolId = r.status === 'resolved' ? r.canonical_identifier : null
    if (r.status === 'known_ambiguous') provenance.dropped.push({ observation_id: o.observation_id, reason: 'tool_ambiguous' })
    else if (toolId === null) provenance.dropped.push({ observation_id: o.observation_id, reason: 'tool_unresolved' })
    provenance.tools.push({ observation_id: o.observation_id, instance: o.instance, declared: raw, tool_id: toolId })
    if (toolId && !activeToolIds.includes(toolId)) activeToolIds.push(toolId)
    if (o.instance !== null) {
      const prev = toolByInstance.get(o.instance)
      // Two different tools in one instance cannot bind a plan: fail closed.
      toolByInstance.set(o.instance, prev === undefined ? toolId : prev === toolId ? toolId : null)
      if (prev !== undefined && prev !== toolId) provenance.dropped.push({ observation_id: o.observation_id, reason: 'instance_has_conflicting_tools' })
    }
  }

  // Plans → one ToolMention per declared plan, as Product A does per declared entry.
  const toolMentions: ToolMention[] = []
  const planMatches = new Map<string, GovernedValueMatch>()
  for (const o of active) {
    if (o.target.kind !== 'applicability_fact') continue
    if (o.target.fact === 'tool_account_status') {
      provenance.dropped.push({ observation_id: o.observation_id, reason: 'account_status_not_supported' })
      continue
    }
    const declared = declaredValue(o)
    const toolId = o.target.tool ?? (o.instance !== null ? toolByInstance.get(o.instance) ?? null : null)
    if (!toolId) {
      provenance.dropped.push({ observation_id: o.observation_id, reason: 'plan_without_resolved_tool' })
      provenance.plans.push({ observation_id: o.observation_id, instance: o.instance, tool_id: null, declared, governed_value: null, passed_to_applicability: false })
      continue
    }
    const match = matchGovernedValue(declared, governedPlans.get(toolId))
    planMatches.set(o.observation_id, match)
    const governed = match.kind === 'canonical'
    if (match.kind === 'not_governed') provenance.dropped.push({ observation_id: o.observation_id, reason: 'plan_not_a_governed_value' })
    if (match.kind === 'ambiguous') provenance.dropped.push({ observation_id: o.observation_id, reason: 'plan_ambiguous_governed_value' })
    provenance.plans.push({
      observation_id: o.observation_id,
      instance: o.instance,
      tool_id: toolId,
      declared,
      governed_value: governed ? match.value : null,
      passed_to_applicability: governed,
    })
    toolMentions.push({
      mention_id: `creator-record:plan:${o.observation_id}`,
      resolution: { kind: 'canonical', identifier: toolId },
      access_surface: { state: 'unknown' },
      plan_tier: governed ? { state: 'confirmed', value: match.value } : { state: 'unknown' },
      account_status: { state: 'unknown' },
      confidence: 'unknown',
      source_turn: 0,
      source_statement: declared,
      superseded_by: null,
    })
  }
  // More than one different declared plan for one tool (compared after
  // normalization, governed or not): confirm none of them (the evaluator would
  // otherwise pick the first). Governed or ambiguous values among them are
  // reported as withheld so an exclusion cannot be silently bypassed.
  const withheldToolFacts: WithheldToolFact[] = []
  const planToolIds = Array.from(new Set(provenance.plans.map((p) => p.tool_id).filter((t): t is string => t !== null)))
  for (const toolId of planToolIds) {
    const mine = provenance.plans.filter((p) => p.tool_id === toolId)
    const conflicting = new Set(mine.map((p) => normalizeGovernedValue(p.declared))).size > 1
    for (const p of mine) {
      const match = planMatches.get(p.observation_id)!
      const mentionId = `creator-record:plan:${p.observation_id}`
      if (conflicting) {
        toolMentions.find((m) => m.mention_id === mentionId)!.plan_tier = { state: 'unknown' }
        if (p.passed_to_applicability) {
          p.passed_to_applicability = false
          provenance.dropped.push({ observation_id: p.observation_id, reason: 'plan_conflicting_declarations' })
        }
      }
      if (match.kind === 'not_governed' || (!conflicting && match.kind === 'canonical')) continue
      withheldToolFacts.push({
        mention_id: mentionId,
        tool: toolId,
        fact: 'tool_plan_tier',
        value: match.kind === 'canonical' ? match.value : p.declared,
        reason: conflicting ? 'conflicting_declarations' : 'ambiguous_governed_value',
      })
    }
  }

  // Asset providers.
  const assetProviderIds: string[] = []
  for (const o of active) {
    if (o.target.kind !== 'asset_provider_identity') continue
    const raw = declaredValue(o)
    const r = normalizeCandidate({ kind: 'asset_provider_mention', raw_provider_name: raw, raw_text: raw, proposal_id: 'creator-record', turn: 0 })
    const providerId = r.status === 'resolved' ? r.canonical_identifier : null
    if (providerId === null) provenance.dropped.push({ observation_id: o.observation_id, reason: 'provider_unresolved' })
    else if (!assetProviderIds.includes(providerId)) assetProviderIds.push(providerId)
    provenance.providers.push({ observation_id: o.observation_id, declared: raw, provider_id: providerId })
  }

  return {
    // Jurisdiction is deliberately and always empty: no location answer is an assessment jurisdiction.
    applicabilityFacts: {
      jurisdiction: { included: [], excluded: [] },
      toolMentions,
      ...(withheldToolFacts.length > 0 ? { withheldToolFacts } : {}),
    },
    activeToolIds,
    assetProviderIds,
    provenance,
  }
}
