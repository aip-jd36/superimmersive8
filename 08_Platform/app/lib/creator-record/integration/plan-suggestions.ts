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

import { governedPlanValuesByTool } from '@/lib/production-review/build-production-facts'
import type { TopicClaim } from '@/lib/retrieval-engine/types'

export function planSuggestionsByTool(topicClaims: TopicClaim[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  governedPlanValuesByTool(topicClaims).forEach((values, tool) => {
    out[tool] = Array.from(values).sort((a, b) => a.localeCompare(b, 'en'))
  })
  return out
}
