/**
 * CRC -> Sales lead eligibility (CAH-3B, Correction 1 applied).
 *
 * A completed CRC session becomes a *Sales lead* only when it is BOTH
 * semantically completed AND contactable. This module owns the predicate,
 * and nothing else in lib/crc-sales/ re-derives it.
 *
 * ── CORRECTION 1: product_stop_reason contributes NOTHING to eligibility ──
 *
 * CAH-3A proposed `completion_reason != null OR product_stop_reason != null`.
 * The CAH-3B inspection of every producer and allowed value of
 * `product_stop_reason` found:
 *
 *   - 'email_declined'  -- RETIRED (Results Gate milestone, 2026-08-14). No
 *     code path writes it any more; the DB CHECK still permits it for
 *     historical rows only. Semantics: the user declined the (now-removed)
 *     mid-conversation email gate. Exceptional / historical -> FAIL CLOSED.
 *
 *   - 'conversation_limit_reached' -- written by app/api/crc/turn/route.ts
 *     when `checkTurnCeiling` fires (`turnNumber > CRC_CONFIG.maxTurnsPer
 *     Session`, default 15), and only for rate-limited traffic
 *     (`traffic_type === 'pilot' && abuse_key !== null`). The migration
 *     that introduced the column states this explicitly: it is "a business
 *     decision to stop SPENDING on a session -- not the interview engine
 *     deciding it's naturally finished." An anti-abuse turn cap on a
 *     runaway conversation is not a customer-completed CRC. Technical /
 *     abuse-adjacent -> FAIL CLOSED.
 *
 * Result: eligibility depends ONLY on `structured_understanding.
 * completion_reason` (an Interview-Engine-owned, governed value). A session
 * that is "done" solely because of `product_stop_reason` (i.e.
 * `completion_reason` is still null) is NOT Sales-eligible.
 *
 * ── Which completion_reason values qualify ──
 *
 * All five governed COMPLETION_REASONS represent the interview genuinely
 * concluding. None is technical, abusive, or ambiguous, so all five
 * qualify -- CAH-3A §6 ("normal governed CRC completion_reason values that
 * represent completed conversations may qualify"). `declined` and
 * `gate_1_unmet_exhausted` are surfaced to Sales AS the completion_reason
 * value so a rep can see the conversation ended differently; they are not
 * excluded (thin project context on those is handled by the fail-closed
 * projection, never fabricated).
 *
 * ── Contactability ──
 *
 * email must have come through the existing CRC email-gate path and must
 * have resolved to a durable contact identity:
 *   email IS NOT NULL AND identity_source = 'email_gate' AND crc_lead_id IS NOT NULL
 */

import { COMPLETION_REASONS, type CompletionReason } from '@/types/interview-engine'

/**
 * All five governed engine completion values are Sales-eligible. Kept as an
 * explicit exhaustive list (not `!= null`) so a future 6th COMPLETION_REASON
 * value is a deliberate decision here, not a silent inclusion.
 */
export const SALES_ELIGIBLE_COMPLETION_REASONS: ReadonlySet<CompletionReason> = new Set(
  COMPLETION_REASONS as readonly CompletionReason[],
)

/**
 * The subset of `crc_sessions` fields eligibility depends on. Deliberately
 * minimal -- the repository selects exactly these.
 */
export interface SalesEligibilityInput {
  /** `structured_understanding.completion_reason` -- the ONLY completion signal that counts (Correction 1). */
  completion_reason: CompletionReason
  email: string | null
  identity_source: string | null
  crc_lead_id: string | null
}

export function isSalesEligible(input: SalesEligibilityInput): boolean {
  if (input.completion_reason == null) return false
  if (!SALES_ELIGIBLE_COMPLETION_REASONS.has(input.completion_reason)) return false
  if (input.email == null || input.email.trim().length === 0) return false
  if (input.identity_source !== 'email_gate') return false
  if (input.crc_lead_id == null) return false
  return true
}
