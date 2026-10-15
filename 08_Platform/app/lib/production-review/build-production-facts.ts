/**
 * Submission → declared production facts (CAA-PRODUCT-A-2).
 *
 * Reads the EXISTING /certify submission shape (no intake change) and produces
 * structured, customer-declared production facts plus the `ApplicabilityFacts`
 * the governed evaluator consumes.
 *
 * Authority rules:
 *   - Every fact here is a customer DECLARATION. Nothing is verified.
 *   - Tool identity comes only from `normalizeCandidate` (fail closed: an
 *     unresolved or ambiguous name contributes no identity).
 *   - A declared plan is passed to applicability only when it exactly equals a
 *     value an existing governed `tool_plan_tier` requirement for that same
 *     canonical tool uses. Anything else stays `unknown` → `unresolved`.
 *   - Account status is not collected by /certify, so it is always `unknown`.
 *   - Distribution territory (G1) is carried for display and NEVER becomes the
 *     applicability `jurisdiction` fact.
 *   - Asset-provider identity is not captured by intake, so no provider id is
 *     ever inferred (e.g. from free-text descriptions).
 *
 * Pure. No I/O.
 */

import { normalizeCandidate } from '@/lib/interview-engine/extraction'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ApplicabilityRequirement, TopicClaim } from '@/lib/retrieval-engine/types'
import type { ToolMention } from '@/types/interview-engine'
import type { DeclaredTool, DeclaredToolIdentity, ProductionFacts } from './types'

/** The subset of the `submissions` row this module reads. */
export interface ProductionFactsInput {
  tools_used: unknown
  territory_preferences: unknown
  third_party_assets: unknown
  audio_disclosure: unknown
}

export interface ProductionFactsBundle {
  facts: ProductionFacts
  applicabilityFacts: ApplicabilityFacts
  activeToolIds: string[]
  /** Always `[]` in this slice — see module header. */
  assetProviderIds: string[]
}

/** JSONB columns may hold either parsed JSON or a JSON-encoded string. */
function parseJsonMaybe(value: unknown): { ok: true; value: unknown } | { ok: false } {
  if (typeof value !== 'string') return { ok: true, value }
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false }
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function allRequirements(claim: TopicClaim): ApplicabilityRequirement[] {
  return [...claim.applicability_requirements, ...(claim.applicability_any_of ?? []).flat()]
}

/** Governed `tool_plan_tier` values per canonical tool, taken only from existing governed requirements. */
export function governedPlanValuesByTool(topicClaims: TopicClaim[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const claim of topicClaims) {
    for (const req of allRequirements(claim)) {
      if (req.fact !== 'tool_plan_tier' || !req.tool) continue
      if (!out.has(req.tool)) out.set(req.tool, new Set())
      out.get(req.tool)!.add(req.value)
    }
  }
  return out
}

function resolveIdentity(rawName: string | null): DeclaredToolIdentity {
  if (!rawName) return { kind: 'unresolved', reason: 'missing_name' }
  const result = normalizeCandidate({
    kind: 'tool_mention',
    raw_tool_name: rawName,
    raw_text: rawName,
    proposal_id: 'production-review',
    turn: 0,
  })
  if (result.status === 'resolved') return { kind: 'canonical', tool_id: result.canonical_identifier }
  if (result.status === 'known_ambiguous') return { kind: 'unresolved', reason: 'ambiguous' }
  return { kind: 'unresolved', reason: 'unrecognized' }
}

function countThirdPartyAssets(value: unknown): number {
  const parsed = parseJsonMaybe(value)
  if (!parsed.ok || !parsed.value || typeof parsed.value !== 'object') return 0
  const v = parsed.value as Record<string, unknown>
  if (v.has_third_party !== true || !Array.isArray(v.items)) return 0
  return v.items.length
}

function declaresLicensedAudio(value: unknown): boolean {
  const parsed = parseJsonMaybe(value)
  if (!parsed.ok || !parsed.value || typeof parsed.value !== 'object') return false
  return (parsed.value as Record<string, unknown>).source_type === 'licensed'
}

export function buildProductionFacts(input: ProductionFactsInput, topicClaims: TopicClaim[]): ProductionFactsBundle {
  const governedPlans = governedPlanValuesByTool(topicClaims)
  const parsedTools = parseJsonMaybe(input.tools_used)
  const toolsReadable = parsedTools.ok && Array.isArray(parsedTools.value)

  const tools: DeclaredTool[] = []
  const toolMentions: ToolMention[] = []
  const activeToolIds: string[] = []

  if (toolsReadable) {
    ;(parsedTools.value as unknown[]).forEach((entry, index) => {
      const e = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
      const rawName = str(e.tool_name) ?? str(e.toolName) ?? str(e.tool)
      const identity = resolveIdentity(rawName)
      const declaredPlan = str(e.plan_type) ?? str(e.planType)

      let planRelation: DeclaredTool['plan_relation'] = 'not_declared'
      if (declaredPlan) {
        const governed = identity.kind === 'canonical' ? governedPlans.get(identity.tool_id) : undefined
        planRelation = governed?.has(declaredPlan) ? 'matches_governed_value' : 'not_a_governed_value'
      }

      tools.push({
        index,
        raw_name: rawName,
        identity,
        declared_plan: declaredPlan,
        plan_relation: planRelation,
        account_status_basis: 'not_declared',
        declared_window: { start: str(e.start_date) ?? str(e.startDate), end: str(e.end_date) ?? str(e.endDate) },
        receipt_presented: !!(str(e.receipt_path) ?? str(e.receipt_url)),
        is_primary: e.is_primary === true || e.isPrimary === true,
      })

      if (identity.kind !== 'canonical') return
      if (!activeToolIds.includes(identity.tool_id)) activeToolIds.push(identity.tool_id)
      // One mention per declared entry. A declaration is passed through as the
      // evaluator's "confirmed" state ONLY for governed plan values; the output
      // lanes always label it `customer_declared`, never verified.
      toolMentions.push({
        mention_id: `production-review:tool:${index}`,
        resolution: { kind: 'canonical', identifier: identity.tool_id },
        access_surface: { state: 'unknown' },
        plan_tier:
          planRelation === 'matches_governed_value' && declaredPlan
            ? { state: 'confirmed', value: declaredPlan }
            : { state: 'unknown' },
        account_status: { state: 'unknown' },
        confidence: 'unknown',
        source_turn: 0,
        source_statement: rawName ?? '',
        superseded_by: null,
      })
    })
  }

  // The evaluator finds the FIRST non-superseded mention per tool. If the same
  // tool was declared twice with different governed plans, the declarations
  // conflict: drop the plan for that tool rather than pick one (fail closed).
  for (const toolId of activeToolIds) {
    const plans = new Set(
      toolMentions
        .filter((m) => m.resolution.kind === 'canonical' && m.resolution.identifier === toolId && m.plan_tier.state === 'confirmed')
        .map((m) => (m.plan_tier as { value: string }).value),
    )
    if (plans.size > 1) {
      for (const m of toolMentions) {
        if (m.resolution.kind === 'canonical' && m.resolution.identifier === toolId) m.plan_tier = { state: 'unknown' }
      }
    }
  }

  const facts: ProductionFacts = {
    tools_input: toolsReadable ? 'readable' : 'unreadable',
    tools,
    declared_distribution_territory: str(input.territory_preferences),
    declared_third_party_asset_count: countThirdPartyAssets(input.third_party_assets),
    declared_licensed_audio: declaresLicensedAudio(input.audio_disclosure),
  }

  return {
    facts,
    // Jurisdiction is deliberately empty: G1 territory is not an assessment jurisdiction.
    applicabilityFacts: { jurisdiction: { included: [], excluded: [] }, toolMentions },
    activeToolIds,
    assetProviderIds: [],
  }
}
