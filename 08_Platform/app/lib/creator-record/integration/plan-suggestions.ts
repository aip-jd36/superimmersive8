/**
 * CR-V2-EVIDENCE-SLICE-1 — plan names offered as PARTIAL suggestions in the
 * questionnaire's plan question.
 *
 * Source: the governed `tool_plan_tier` values that the governed claims
 * themselves name (`governedPlanValuesByTool`, the same vocabulary the fact
 * builder matches against). This is NOT a list of a provider's plans: a tool's
 * plans that no governed claim names (e.g. a free tier) are absent, which is
 * why the questionnaire always offers "Another plan" and "Not sure".
 *
 * A suggestion is submitted as the plain plan text, exactly as a typed answer
 * would be; it confers nothing. Not derived from any publication ledger.
 */

import { governedPlanValuesByTool, resolveIdentity } from '@/lib/production-review/build-production-facts'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

/**
 * CR-V2-MVP-3 / -MVP-4 (G-R2): the provider-scoped plan-name vocabulary for
 * the document text-layer cross-check.
 *
 * The seller's name, exactly as the reading reported it, is resolved with the
 * SAME fail-closed tool-identity resolution used for declared tools
 * (`resolveIdentity` → `normalizeCandidate`): existing aliases only, no
 * fuzzy matching, no stripping of company suffixes, no guess between
 * candidates. Only that one tool's governed plan values are applied. No
 * seller, an unrecognised or ambiguous seller, or a tool with no governed
 * plan values → unavailable. Never another tool's vocabulary.
 */
export type SellerPlanScope =
  | { status: 'established'; provider: string; vocabulary: readonly string[] }
  | { status: 'unavailable'; reason: 'provider_not_shown' | 'provider_not_recognized' | 'provider_ambiguous' | 'no_governed_plan_names' }

/** Structurally the evidence layer's `PlanScope` (kept local: the integration layer does not import evidence). */
export function planScopeForSeller(topicClaims: TopicClaim[]): (seller: string | null) => SellerPlanScope {
  const byTool = planSuggestionsByTool(topicClaims)
  return (seller) => {
    if (!seller || !seller.trim()) return { status: 'unavailable', reason: 'provider_not_shown' }
    const identity = resolveIdentity(seller)
    if (identity.kind !== 'canonical') return { status: 'unavailable', reason: identity.reason === 'ambiguous' ? 'provider_ambiguous' : identity.reason === 'missing_name' ? 'provider_not_shown' : 'provider_not_recognized' }
    const vocabulary = byTool[identity.tool_id] ?? []
    return vocabulary.length > 0 ? { status: 'established', provider: identity.tool_id, vocabulary } : { status: 'unavailable', reason: 'no_governed_plan_names' }
  }
}

export function planSuggestionsByTool(topicClaims: TopicClaim[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  governedPlanValuesByTool(topicClaims).forEach((values, tool) => {
    out[tool] = Array.from(values).sort((a, b) => a.localeCompare(b, 'en'))
  })
  return out
}
