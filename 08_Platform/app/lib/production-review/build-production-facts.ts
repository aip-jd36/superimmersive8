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
 *   - A declared plan is passed to applicability only when it maps to exactly
 *     one governed `tool_plan_tier` value for that same canonical tool, under
 *     the shared contract (retrieval-engine/governed-applicability-values.ts,
 *     ADR-001 §L.9: equal after case/whitespace/Unicode normalization, no
 *     aliases). The canonical governed value is passed; the declaration is
 *     kept verbatim. Anything else stays `unknown` → `unresolved`.
 *   - A tool declared with more than one different plan passes none of them
 *     as confirmed. Governed values among them are reported to the exclusion
 *     gate as withheld, so a possibly-excluded plan can never yield coverage.
 *   - Account status is not collected by /certify, so it is always `unknown`.
 *   - Distribution territory (G1) is carried for display and NEVER becomes the
 *     applicability `jurisdiction` fact.
 *   - Asset-provider identity is not captured by intake, so no provider id is
 *     ever inferred (e.g. from free-text descriptions).
 *
 * Pure. No I/O.
 */

import { normalizeCandidate } from '@/lib/interview-engine/extraction'
import {
  governedToolFactValues,
  matchGovernedValue,
  normalizeGovernedValue,
  type GovernedValueMatch,
  type WithheldToolFact,
} from '@/lib/retrieval-engine/governed-applicability-values'
import type { ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
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

/**
 * Governed `tool_plan_tier` values per canonical tool: requirements, any_of
 * alternatives and exclusions (shared contract, ADR-001 §L.9).
 */
export function governedPlanValuesByTool(topicClaims: TopicClaim[]): Map<string, Set<string>> {
  return governedToolFactValues(topicClaims, 'tool_plan_tier')
}

/** Exported for CR-V2-MVP-4 (document seller → tool, same fail-closed resolution). */
export function resolveIdentity(rawName: string | null): DeclaredToolIdentity {
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
  const planMatches = new Map<number, GovernedValueMatch>()

  if (toolsReadable) {
    ;(parsedTools.value as unknown[]).forEach((entry, index) => {
      const e = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
      const rawName = str(e.tool_name) ?? str(e.toolName) ?? str(e.tool)
      const identity = resolveIdentity(rawName)
      const declaredPlan = str(e.plan_type) ?? str(e.planType)

      let planRelation: DeclaredTool['plan_relation'] = 'not_declared'
      let governedPlanValue: string | null = null
      if (declaredPlan) {
        const match = matchGovernedValue(declaredPlan, identity.kind === 'canonical' ? governedPlans.get(identity.tool_id) : undefined)
        planMatches.set(index, match)
        planRelation = match.kind === 'canonical' ? 'matches_governed_value' : match.kind === 'ambiguous' ? 'withheld_ambiguous_governed_value' : 'not_a_governed_value'
        governedPlanValue = match.kind === 'canonical' ? match.value : null
      }

      tools.push({
        index,
        raw_name: rawName,
        identity,
        declared_plan: declaredPlan,
        plan_relation: planRelation,
        governed_plan_value: governedPlanValue,
        account_status_basis: 'not_declared',
        declared_window: { start: str(e.start_date) ?? str(e.startDate), end: str(e.end_date) ?? str(e.endDate) },
        receipt_presented: !!(str(e.receipt_path) ?? str(e.receipt_url)),
        is_primary: e.is_primary === true || e.isPrimary === true,
      })

      if (identity.kind !== 'canonical') return
      if (!activeToolIds.includes(identity.tool_id)) activeToolIds.push(identity.tool_id)
      // One mention per declared entry. A declaration is passed through as the
      // evaluator's "confirmed" state ONLY as its canonical governed value; the
      // output lanes always label it `customer_declared`, never verified.
      toolMentions.push({
        mention_id: `production-review:tool:${index}`,
        resolution: { kind: 'canonical', identifier: identity.tool_id },
        access_surface: { state: 'unknown' },
        plan_tier: governedPlanValue !== null ? { state: 'confirmed', value: governedPlanValue } : { state: 'unknown' },
        account_status: { state: 'unknown' },
        confidence: 'unknown',
        source_turn: 0,
        source_statement: rawName ?? '',
        superseded_by: null,
      })
    })
  }

  // The evaluator finds the FIRST non-superseded mention per tool. If the same
  // tool was declared with more than one different plan (governed or not,
  // compared after normalization), the declarations conflict: confirm none of
  // them rather than pick one (fail closed). Governed or ambiguous values among
  // them are reported as withheld so an exclusion cannot be silently bypassed.
  const withheldToolFacts: WithheldToolFact[] = []
  for (const toolId of activeToolIds) {
    const mine = tools.filter((t) => t.identity.kind === 'canonical' && t.identity.tool_id === toolId && t.declared_plan !== null)
    const conflicting = new Set(mine.map((t) => normalizeGovernedValue(t.declared_plan!))).size > 1
    for (const t of mine) {
      const match = planMatches.get(t.index)!
      if (conflicting) {
        t.plan_relation = 'withheld_conflicting_declarations'
        t.governed_plan_value = null
        const m = toolMentions.find((x) => x.mention_id === `production-review:tool:${t.index}`)!
        m.plan_tier = { state: 'unknown' }
      }
      if (match.kind === 'not_governed' || (!conflicting && match.kind === 'canonical')) continue
      withheldToolFacts.push({
        mention_id: `production-review:tool:${t.index}`,
        tool: toolId,
        fact: 'tool_plan_tier',
        value: match.kind === 'canonical' ? match.value : t.declared_plan!,
        reason: conflicting ? 'conflicting_declarations' : 'ambiguous_governed_value',
      })
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
    applicabilityFacts: {
      jurisdiction: { included: [], excluded: [] },
      toolMentions,
      ...(withheldToolFacts.length > 0 ? { withheldToolFacts } : {}),
    },
    activeToolIds,
    assetProviderIds: [],
  }
}
