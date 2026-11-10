/**
 * CR-V2-RECEIPT-GATE-1B — the G-R2 plan scope for a receipt's issuer.
 *
 * Issuer recognition reuses the receipt comparison's existing canonical
 * identity resolution (`compare.ts` `resolveIdentity`: SI8's tool-identity
 * normalization plus its generic merchant-name cleanup of legal suffixes and
 * trailing "AI"/"Labs"), so "Runway AI, Inc." resolves to the same canonical
 * tool as "Runway". No new alias table or provider mapping.
 *
 * Deliberately NOT used here: the reconciliation path's seller identity
 * (`integration/seller-identity.ts`), which refuses suffix stripping and is
 * left unchanged.
 *
 * The vocabulary is the product-side factual list only
 * (`provider-plan-vocabulary.ts`), applied for the ONE resolved tool. Any
 * doubt — no issuer, unrecognised or ambiguous issuer, no usable vocabulary —
 * yields `unavailable`, which never supports a positive comparison.
 */

import type { PlanScope } from '../evidence/plan-cross-check'
import { resolveIdentity } from './compare'
import { PROVIDER_PLAN_VOCABULARY, vocabularyForTool, type ProviderPlanVocabularyEntry } from './provider-plan-vocabulary'

export function receiptPlanScope(
  today: string,
  entries: readonly ProviderPlanVocabularyEntry[] = PROVIDER_PLAN_VOCABULARY,
): (issuer: string | null) => PlanScope {
  return (issuer) => {
    if (!issuer || !issuer.trim()) return { status: 'unavailable', reason: 'provider_not_shown' }
    const identity = resolveIdentity(issuer)
    if (identity.status === 'ambiguous') return { status: 'unavailable', reason: 'provider_ambiguous' }
    if (identity.status !== 'resolved') return { status: 'unavailable', reason: 'provider_not_recognized' }
    const v = vocabularyForTool(identity.id, today, entries)
    if (v.status !== 'usable') return { status: 'unavailable', reason: v.reason }
    return { status: 'established', provider: identity.id, vocabulary: v.plan_names, complete: v.complete }
  }
}
