/**
 * Plan-name token rules (receipt-comparison-v2, G-R1 as implemented), moved
 * unchanged out of `compare.ts` (CR-V2-MVP-3) so browser-safe code can reuse
 * them without loading tool-identity normalization. Pure.
 */

import type { ReceiptExtraction } from './schema'

/** Lowercase, NFKC, punctuation → space (hyphens kept), collapsed. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const PLAN_FILLER = new Set([
  'plan', 'plans', 'subscription', 'subscriptions', 'tier', 'membership', 'package', 'monthly', 'month', 'months',
  'annual', 'annually', 'yearly', 'year', 'years', 'billed', 'billing', 'per', 'mo', 'yr', 'the', 'a', 'an', 'of',
  'and', 'license', 'licence', 'renewal', 'recurring', '-',
  // v2: document-kind words that appear in titles such as "Pro Plan receipt".
  'receipt', 'invoice',
])

/** Plan tokens after removing filler words and tokens of the provider names. */
export function planTokens(plan: string, providerNames: (string | null)[]): string[] {
  const providerTokens = new Set(
    providerNames
      .filter((n): n is string => !!n)
      .flatMap((n) => normalizeName(n).split(/[\s-]+/))
      .filter(Boolean),
  )
  const tokens = normalizeName(plan)
    .split(/[\s-]+/)
    .filter((t) => t && !PLAN_FILLER.has(t) && !providerTokens.has(t))
  return Array.from(new Set(tokens)).sort()
}

/**
 * Distinct identifying plan observations on the document: every candidate plus
 * the selected value, reduced to identifying tokens. Observations with no
 * identifying token (e.g. "Subscription") carry no plan identity and are
 * skipped. Equivalence is exact token-set equality only.
 */
export function distinctPlanObservations(ex: ReceiptExtraction, providers: (string | null)[]): string[] {
  const texts = ex.plan_candidates.map((p) => p.text)
  if (ex.product_or_plan_name.status === 'present') texts.push(ex.product_or_plan_name.value!)
  const keys = new Set<string>()
  for (const t of texts) {
    const tokens = planTokens(t, providers)
    if (tokens.length) keys.add(tokens.join(' '))
  }
  return Array.from(keys).sort()
}
