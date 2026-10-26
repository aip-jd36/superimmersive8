/**
 * PRODUCT-A-MVP-SPIKE-1A — deterministic comparison of an extraction against
 * what the customer declared for one tool. Pure functions, no model, no I/O.
 *
 * Four comparisons, deliberately kept separate:
 *   provider                 issuer on the document vs the declared tool
 *   plan                     plan/product on the document vs the declared plan
 *   transaction_chronology   was the payment dated on/before the declared start?
 *                            ('consistent' here is ONLY a date ordering — a
 *                            payment before production is NOT evidence that a
 *                            subscription covered the production period)
 *   service_period_coverage  does an EXPLICITLY printed service period cover the
 *                            whole declared window? Never inferred from a
 *                            transaction date.
 *
 * Invariant: 'consistent' is returned only when every input it depends on is
 * present and unambiguous. Every gap or doubt resolves to 'not_shown' or
 * 'unresolved'. None of these results is an entitlement, licence or rights
 * finding, and none feeds Living Knowledge, applicability or interpretation.
 *
 * Plan (v2, SPIKE-1D): the comparison considers EVERY printed plan-name
 * observation (`plan_candidates` plus the selected `product_or_plan_name`).
 * Two observations are the same plan only when their identifying tokens are
 * identical after removing formatting, filler words and provider-name tokens;
 * no subset, prefix or synonym equivalence. More than one distinct plan ->
 * 'unresolved', whichever one the model selected and whatever
 * `multiple_plans_shown` says. LIMITATION: these rules see only what the model
 * reported. A plan name the model never lists cannot be detected here.
 *
 * Provider identity reuses the existing canonical tool-identity normalization
 * (`normalizeCandidate`, unmodified). Generic merchant-name cleanup (legal
 * suffixes, trailing "AI"/"Labs") is the only addition; MERCHANT_ALIASES is
 * intentionally empty until the evaluation demonstrates a specific need.
 */

import { normalizeCandidate, type CandidateObservation } from '@/lib/interview-engine/extraction'
import {
  BILLING_DOCUMENT_TYPES,
  isIsoCalendarDate,
  type ExtractedField,
  type ReceiptExtraction,
} from './schema'

export const COMPARISON_RULES_VERSION = 'receipt-comparison-v2' as const

/** Mirrors the persisted `tools_used[]` keys written by app/record/page.tsx. */
export interface DeclaredTool {
  tool_name: string | null
  plan_type: string | null
  start_date: string | null
  end_date: string | null
}

export type ComparisonResult = 'consistent' | 'differs' | 'not_shown' | 'unresolved'

export type ComparisonReason =
  | 'document_not_billing'
  | 'document_type_unknown'
  | 'document_illegible'
  | 'field_not_shown'
  | 'field_unreadable'
  | 'field_ambiguous'
  | 'declared_value_missing'
  | 'declared_value_invalid'
  | 'same_canonical_identity'
  | 'same_normalized_name'
  | 'different_canonical_identity'
  | 'issuer_not_recognized'
  | 'issuer_ambiguous'
  | 'declared_tool_not_recognized'
  | 'multiple_plans_shown'
  | 'plan_candidates_conflict'
  | 'plan_candidates_missing'
  | 'plan_candidates_inconsistent'
  | 'plan_not_identifiable'
  | 'plan_tokens_equal'
  | 'plan_tokens_differ'
  | 'transaction_on_or_before_start'
  | 'transaction_after_start'
  | 'period_not_shown'
  | 'period_incomplete'
  | 'period_invalid'
  | 'period_covers_window'
  | 'period_does_not_cover_window'

export interface Comparison {
  result: ComparisonResult
  reason: ComparisonReason
}

export interface ToolComparison {
  provider: Comparison
  plan: Comparison
  transaction_chronology: Comparison
  service_period_coverage: Comparison
}

/** Explicit merchant-name → canonical identity aliases. Empty by design (see header). */
export const MERCHANT_ALIASES: Readonly<Record<string, string>> = Object.freeze({})

const c = (result: ComparisonResult, reason: ComparisonReason): Comparison => ({ result, reason })

// ---------------------------------------------------------------- gates

/** Document-level gate applied before any field comparison. */
function documentGate(ex: ReceiptExtraction): Comparison | null {
  if (ex.readability === 'illegible') return c('unresolved', 'document_illegible')
  if (ex.document_type === 'not_a_billing_document') return c('not_shown', 'document_not_billing')
  if (!BILLING_DOCUMENT_TYPES.includes(ex.document_type)) return c('unresolved', 'document_type_unknown')
  return null
}

function fieldGate(f: ExtractedField): Comparison | null {
  switch (f.status) {
    case 'present':
      return null
    case 'not_shown':
      return c('not_shown', 'field_not_shown')
    case 'unreadable':
      return c('unresolved', 'field_unreadable')
    default:
      return c('unresolved', 'field_ambiguous')
  }
}

// ---------------------------------------------------------------- names

const LEGAL_AND_GENERIC_TRAILING = new Set([
  'inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'company', 'gmbh', 'pte', 'plc',
  'sa', 'bv', 'ag', 'ai', 'labs', 'lab', 'technologies', 'technology', 'tech', 'video', 'audio', 'app', 'studio',
  'studios',
])

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

/** Successively shorter variants with trailing legal/generic tokens removed. */
function nameVariants(s: string): string[] {
  const tokens = normalizeName(s).split(' ').filter(Boolean)
  if (tokens[0] === 'the') tokens.shift()
  const out: string[] = [s.trim().toLowerCase()]
  if (tokens.length) out.push(tokens.join(' '))
  while (tokens.length > 1 && LEGAL_AND_GENERIC_TRAILING.has(tokens[tokens.length - 1])) {
    tokens.pop()
    out.push(tokens.join(' '))
  }
  return Array.from(new Set(out.filter(Boolean)))
}

/** Fully stripped core used only for exact-equality fallback. */
function nameCore(s: string): string {
  const v = nameVariants(s)
  return v[v.length - 1] ?? ''
}

export type IdentityResolution =
  | { status: 'resolved'; id: string }
  | { status: 'ambiguous'; candidates: string[] }
  | { status: 'unrecognized' }

function normalizeToolName(name: string): ReturnType<typeof normalizeCandidate> {
  const candidate: CandidateObservation = {
    proposal_id: 'creator-record-receipt-comparison',
    turn: 0,
    raw_text: name,
    kind: 'tool_mention',
    raw_tool_name: name,
  } as CandidateObservation
  return normalizeCandidate(candidate)
}

/** Canonical identity for a declared tool name or a document issuer. First decisive variant wins. */
export function resolveIdentity(name: string): IdentityResolution {
  for (const variant of nameVariants(name)) {
    const alias = MERCHANT_ALIASES[variant]
    if (alias) return { status: 'resolved', id: alias }
    const r = normalizeToolName(variant)
    if (r.status === 'resolved') return { status: 'resolved', id: r.canonical_identifier }
    if (r.status === 'known_ambiguous') return { status: 'ambiguous', candidates: r.candidate_identifiers }
  }
  return { status: 'unrecognized' }
}

// ---------------------------------------------------------------- comparisons

export function compareProvider(ex: ReceiptExtraction, declared: DeclaredTool): Comparison {
  const gate = documentGate(ex) ?? fieldGate(ex.issuer_name)
  if (gate) return gate
  if (!declared.tool_name || !declared.tool_name.trim()) return c('unresolved', 'declared_value_missing')

  const issuerRaw = ex.issuer_name.value!
  const issuer = resolveIdentity(issuerRaw)
  const tool = resolveIdentity(declared.tool_name)
  const sameCore = nameCore(issuerRaw) !== '' && nameCore(issuerRaw) === nameCore(declared.tool_name)

  if (tool.status === 'resolved') {
    if (issuer.status === 'resolved') {
      return issuer.id === tool.id ? c('consistent', 'same_canonical_identity') : c('differs', 'different_canonical_identity')
    }
    if (issuer.status === 'ambiguous') {
      return issuer.candidates.includes(tool.id) ? c('unresolved', 'issuer_ambiguous') : c('differs', 'different_canonical_identity')
    }
    // Unrecognized issuer (reseller, app store, parent company, payment processor):
    // never 'differs' and never 'consistent' unless the names are literally equal.
    return sameCore ? c('consistent', 'same_normalized_name') : c('unresolved', 'issuer_not_recognized')
  }

  if (sameCore) return c('consistent', 'same_normalized_name')
  return c('unresolved', 'declared_tool_not_recognized')
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

export function comparePlan(ex: ReceiptExtraction, declared: DeclaredTool): Comparison {
  const gate = documentGate(ex)
  if (gate) return gate
  if (ex.multiple_plans_shown) return c('unresolved', 'multiple_plans_shown')

  const providers = [declared.tool_name, ex.issuer_name.status === 'present' ? ex.issuer_name.value : null]
  // Conflict check first, independent of which observation the model selected.
  const observed = distinctPlanObservations(ex, providers)
  if (observed.length > 1) return c('unresolved', 'plan_candidates_conflict')

  const selected = ex.product_or_plan_name
  if (selected.status === 'not_shown') {
    // A plan name was listed but no plan was reported: contradictory, never 'not_shown'.
    return observed.length ? c('unresolved', 'plan_candidates_inconsistent') : c('not_shown', 'field_not_shown')
  }
  const fg = fieldGate(selected)
  if (fg) return fg
  // The selected value must be backed by a listed observation of the same plan.
  const docTokens = planTokens(selected.value!, providers)
  const docKey = docTokens.join(' ')
  if (!ex.plan_candidates.some((p) => planTokens(p.text, providers).join(' ') === docKey)) {
    return c('unresolved', 'plan_candidates_missing')
  }
  if (!declared.plan_type || !declared.plan_type.trim()) return c('unresolved', 'declared_value_missing')

  const declaredTokens = planTokens(declared.plan_type, providers)
  if (docTokens.length === 0 || declaredTokens.length === 0) return c('unresolved', 'plan_not_identifiable')
  const equal = docTokens.length === declaredTokens.length && docTokens.every((t, i) => t === declaredTokens[i])
  return equal ? c('consistent', 'plan_tokens_equal') : c('differs', 'plan_tokens_differ')
}

function declaredDate(v: string | null): { ok: true; value: string } | { ok: false; reason: ComparisonReason } {
  if (!v || !v.trim()) return { ok: false, reason: 'declared_value_missing' }
  return isIsoCalendarDate(v.trim()) ? { ok: true, value: v.trim() } : { ok: false, reason: 'declared_value_invalid' }
}

/** ISO YYYY-MM-DD strings compare correctly as strings. */
export function compareTransactionChronology(ex: ReceiptExtraction, declared: DeclaredTool): Comparison {
  const gate = documentGate(ex) ?? fieldGate(ex.transaction_date)
  if (gate) return gate
  const start = declaredDate(declared.start_date)
  if (!start.ok) return c('unresolved', start.reason)
  return ex.transaction_date.value! <= start.value
    ? c('consistent', 'transaction_on_or_before_start')
    : c('differs', 'transaction_after_start')
}

export function compareServicePeriodCoverage(ex: ReceiptExtraction, declared: DeclaredTool): Comparison {
  const gate = documentGate(ex)
  if (gate) return gate
  const s = ex.service_period_start
  const e = ex.service_period_end
  if (s.status === 'not_shown' && e.status === 'not_shown') return c('not_shown', 'period_not_shown')
  for (const f of [s, e]) {
    if (f.status === 'unreadable') return c('unresolved', 'field_unreadable')
    if (f.status === 'ambiguous') return c('unresolved', 'field_ambiguous')
  }
  if (s.status !== 'present' || e.status !== 'present') return c('unresolved', 'period_incomplete')
  if (s.value! > e.value!) return c('unresolved', 'period_invalid')

  const start = declaredDate(declared.start_date)
  if (!start.ok) return c('unresolved', start.reason)
  const end = declaredDate(declared.end_date)
  if (!end.ok) return c('unresolved', end.reason)
  if (start.value > end.value) return c('unresolved', 'declared_value_invalid')

  return s.value! <= start.value && e.value! >= end.value
    ? c('consistent', 'period_covers_window')
    : c('differs', 'period_does_not_cover_window')
}

export function compareExtractionToDeclared(ex: ReceiptExtraction, declared: DeclaredTool): ToolComparison {
  return {
    provider: compareProvider(ex, declared),
    plan: comparePlan(ex, declared),
    transaction_chronology: compareTransactionChronology(ex, declared),
    service_period_coverage: compareServicePeriodCoverage(ex, declared),
  }
}
