/**
 * CR-V2-MVP-3 — PRD v0.3 §6.2 G-R2: the plan cross-check against a document's
 * own text layer. Pure; no model, no I/O.
 *
 * DEFERRED (CR-V2-MVP-6): unwired from the active MVP path (the examine route
 * passes no plan scope, and returned documents must carry "not run").
 * Kept with its tests for possible later use. "Adoption" below refers to the
 * removed MVP-3 design.
 *
 * Contract (G-R2 as specified, applied to display and adoption):
 *   - Runs only for an examined billing document whose text layer could be
 *     read independently (`pdf-text-layer.ts`). Images, scans and unreadable
 *     PDFs → `text_layer_unavailable`: conflicts are NOT ruled out.
 *   - Quality gate: the text layer is trusted only if it contains what the
 *     automated reading reported (the seller, the plan and every printed
 *     plan-name observation). Otherwise → `text_layer_unusable`.
 *   - Provider-scoped vocabulary (CR-V2-MVP-4): only the governed plan names
 *     (`tool_plan_tier` values named by governed claims) of the ONE tool the
 *     seller's name resolves to, under SI8's existing tool-identity
 *     resolution, supplied by the caller as a `PlanScope`. A seller name that
 *     is absent, unrecognised or ambiguous, or a tool with no governed plan
 *     names → `provider_scope_unavailable`: no other tool's names are ever
 *     applied, and conflicts are NOT ruled out. A vocabulary name
 *     printed in the text layer (as a whole word, as written) that is not
 *     represented in the reported plan observations → `other_plan_names_found`.
 *     Occurrences inside the seller's name do not count (G-R1: issuer names
 *     never feed plan tokens).
 *   - One-directional: the text layer can only push toward "could not be
 *     determined" and withhold adoption. It never establishes which plan was
 *     purchased, never confirms a reading, and never relaxes anything.
 *   - The model's observations are kept unchanged; the cross-check is a
 *     separate, labelled result.
 */

import { BILLING_DOCUMENT_TYPES, type ReceiptExtraction } from '../receipt-examination/schema'
import type { TextLayer } from './pdf-text-layer'

/** Browser-safe (type-only link to the server-side reader); kept equal to `plan-cross-check-v1/${PDF_TEXT_LAYER_VERSION}` (test-enforced). */
export const PLAN_CROSS_CHECK_VERSION = 'plan-cross-check-v1/pdf-text-layer-v1'

export const CROSS_CHECK_STATUSES = ['other_plan_names_found', 'no_other_plan_names_found', 'text_layer_unavailable', 'text_layer_unusable', 'provider_scope_unavailable', 'not_applicable', 'not_run'] as const
export type CrossCheckStatus = (typeof CROSS_CHECK_STATUSES)[number]

/** Why no provider-scoped vocabulary could be applied (CR-V2-MVP-4). */
export const PLAN_SCOPE_UNAVAILABLE_REASONS = ['provider_not_shown', 'provider_not_recognized', 'provider_ambiguous', 'no_governed_plan_names'] as const
export type PlanScopeUnavailableReason = (typeof PLAN_SCOPE_UNAVAILABLE_REASONS)[number]

/** The vocabulary for one document: its seller resolved to exactly one canonical tool, with that tool's governed plan names. */
export type PlanScope =
  | { status: 'established'; provider: string; vocabulary: readonly string[] }
  | { status: 'unavailable'; reason: PlanScopeUnavailableReason }

export interface PlanCrossCheck {
  version: string
  status: CrossCheckStatus
  /** Governed plan names printed in the document's own text but absent from the reported plan observations. */
  other_plan_names: { name: string; excerpt: string }[]
  /** Why the text layer or the provider scope could not be used, when it could not. */
  reason: string | null
  /** Provenance: the canonical tool whose governed plan names were applied, or null when none was. */
  provider: string | null
}

const MAX_EXCERPT = 80
const tokens = (s: string) => s.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
const flat = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
const squash = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function notRun(reason: string): PlanCrossCheck {
  return { version: PLAN_CROSS_CHECK_VERSION, status: 'not_run', other_plan_names: [], reason, provider: null }
}

export function crossCheckPlan(extraction: ReceiptExtraction | null, layer: TextLayer, scope: PlanScope): PlanCrossCheck {
  const provider = scope.status === 'established' ? scope.provider : null
  const result = (status: CrossCheckStatus, other_plan_names: PlanCrossCheck['other_plan_names'] = [], reason: string | null = null): PlanCrossCheck => ({ version: PLAN_CROSS_CHECK_VERSION, status, other_plan_names, reason, provider: status === 'other_plan_names_found' || status === 'no_other_plan_names_found' ? provider : null })
  if (!extraction || !BILLING_DOCUMENT_TYPES.includes(extraction.document_type)) return result('not_applicable')
  if (layer.status !== 'extracted') return result('text_layer_unavailable', [], layer.reason)
  if (scope.status !== 'established') return result('provider_scope_unavailable', [], scope.reason)
  if (scope.vocabulary.length === 0) return result('provider_scope_unavailable', [], 'no_governed_plan_names')
  const vocabulary = scope.vocabulary

  const text = layer.text
  const flatText = flat(text)
  const squashText = squash(text)
  const contains = (needle: string) => flatText.includes(flat(needle)) || squashText.includes(squash(needle))

  // Quality gate: the text layer must contain what the reading reported.
  const anchors = [
    ...(extraction.issuer_name.status === 'present' && extraction.issuer_name.value ? [extraction.issuer_name.value] : []),
    ...(extraction.product_or_plan_name.status === 'present' && extraction.product_or_plan_name.value ? [extraction.product_or_plan_name.value] : []),
    ...extraction.plan_candidates.map((c) => c.text),
  ]
  if (anchors.length === 0) return result('text_layer_unusable', [], 'nothing_reported_to_anchor')
  if (anchors.some((a) => !contains(a))) return result('text_layer_unusable', [], 'reading_not_found_in_text_layer')

  // Plan names the reading represents (token sets).
  const represented = [
    ...(extraction.product_or_plan_name.status === 'present' && extraction.product_or_plan_name.value ? [extraction.product_or_plan_name.value] : []),
    ...extraction.plan_candidates.map((c) => c.text),
  ].map((v) => new Set(tokens(v)))
  const isRepresented = (name: string) => {
    const t = tokens(name)
    return t.length > 0 && represented.some((set) => t.every((x) => set.has(x)))
  }

  // Spans of the seller's name, which never count as plan mentions.
  const issuer = extraction.issuer_name.status === 'present' ? extraction.issuer_name.value : null
  const issuerSpans: [number, number][] = []
  if (issuer) {
    const re = new RegExp(escapeRe(issuer).replace(/\s+/g, '\\s+'), 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) issuerSpans.push([m.index, m.index + m[0].length])
  }

  const found: PlanCrossCheck['other_plan_names'] = []
  for (const name of Array.from(new Set(vocabulary.map((v) => v.trim()).filter(Boolean)))) {
    if (isRepresented(name)) continue
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?![\\p{L}\\p{N}])`, 'gu')
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const at = m.index
      if (issuerSpans.some(([a, b]) => at >= a && at < b)) continue
      const lineStart = text.lastIndexOf('\n', at) + 1
      const lineEnd = text.indexOf('\n', at)
      const line = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim()
      found.push({ name, excerpt: line.length > MAX_EXCERPT ? `${line.slice(0, MAX_EXCERPT - 1)}…` : line })
      break
    }
  }
  return found.length > 0 ? result('other_plan_names_found', found) : result('no_other_plan_names_found')
}
