/**
 * Plan-name token rules, moved out of `compare.ts` (CR-V2-MVP-3) so
 * browser-safe code can reuse them without loading tool-identity
 * normalization. Pure. The G-R1 rules (`planIdentityTokens`,
 * receipt-comparison-v3) replaced the v2 rules in the comparison and the
 * reconciliation in CR-V2-RECEIPT-GATE-1B; the v2 rules remain only for the
 * evaluation scorer.
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

/**
 * LEGACY (receipt-comparison-v2 rules). Since CR-V2-RECEIPT-GATE-1B the
 * comparison and the reconciliation use `planIdentityTokens` instead; this
 * function is kept, unchanged, only for the evaluation scorer
 * (receipt-scoring-v2), so preserved scoring stays reproducible.
 * Plan tokens after removing filler words and tokens of the provider names.
 */
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

// ───────────────────────────── G-R1 (CR-V2-RECEIPT-GATE-1B, receipt-comparison-v3)

/** As `normalizeName`, except that bracketed text is KEPT: only the bracket characters become spaces. */
export function normalizePlanText(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fixed, SI8-defined (never customer- or issuer-derived) words that may follow a tool's name in a plan line. */
const IDENTITY_GENERIC_SUFFIX = new Set(['ai', 'labs', 'lab', 'ml'])

const identityTokensOf =(id: string) => normalizePlanText(id).split(/[\s_-]+/).filter(Boolean)

/**
 * G-R1 plan identity tokens (PRD v0.3 §6.2):
 *   - bracketed text is kept ("Pro (Unlimited)" ≠ "Pro");
 *   - nothing derived from customer-typed text or from the document's issuer
 *     name is ever removed. The only removal besides filler words is a LEADING
 *     tool name: a phrase SI8's existing alias resolution maps to this
 *     comparison's canonical tool ("Dream Machine Plus" → "plus" for `luma`),
 *     or a leading run of the canonical identifier's own tokens followed by
 *     fixed generic words ("Runway Pro" with `runway-gen3` → "pro");
 *   - a result with no tokens means the plan is not identifiable: callers
 *     must treat it as unresolved, never as equal to anything.
 * Sorted and de-duplicated; equivalence is exact token-set equality only.
 */
export function planIdentityTokens(
  plan: string,
  canonicalToolIds: readonly (string | null)[],
  /** Optional: SI8's existing tool-identity resolution (server side). A leading phrase is removed only if it resolves to one of `canonicalToolIds`. */
  identityOf?: (phrase: string) => string | null,
): string[] {
  let tokens = normalizePlanText(plan)
    .split(/[\s-]+/)
    .filter((t) => t && !PLAN_FILLER.has(t))
  const ids = canonicalToolIds.filter((id): id is string => !!id)
  if (identityOf && ids.length) {
    // Longest leading phrase that the existing resolver maps to this comparison's tool ("Dream Machine Plus" → "plus" for luma).
    for (let k = tokens.length; k > 0; k--) {
      const id = identityOf(tokens.slice(0, k).join(' '))
      if (id && ids.includes(id)) {
        tokens = tokens.slice(k)
        break
      }
    }
  }
  for (const id of ids) {
    // Longest leading run shared with the identifier's own tokens ("runway-gen3" removes a leading "runway").
    const prefix = identityTokensOf(id)
    let k = 0
    while (k < prefix.length && k < tokens.length && tokens[k] === prefix[k]) k++
    // Directly after a removed identifier only: the fixed generic company words ("Kling AI Pro" → "pro").
    if (k > 0) while (k < tokens.length && IDENTITY_GENERIC_SUFFIX.has(tokens[k])) k++
    tokens = tokens.slice(k)
  }
  return Array.from(new Set(tokens)).sort()
}

/** G-R1 counterpart of `distinctPlanObservations`. Observations with no identifying token are skipped. */
export function distinctPlanIdentities(
  ex: ReceiptExtraction,
  canonicalToolIds: readonly (string | null)[],
  identityOf?: (phrase: string) => string | null,
): string[] {
  const texts = ex.plan_candidates.map((p) => p.text)
  if (ex.product_or_plan_name.status === 'present') texts.push(ex.product_or_plan_name.value!)
  const keys = new Set<string>()
  for (const t of texts) {
    const tokens = planIdentityTokens(t, canonicalToolIds, identityOf)
    if (tokens.length) keys.add(tokens.join(' '))
  }
  return Array.from(keys).sort()
}

/**
 * LEGACY (receipt-scoring-v2 only; see `planTokens`).
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
