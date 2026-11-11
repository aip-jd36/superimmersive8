/**
 * CRV2-IA-4D3 S2b — plan, date and safety regression scoring for v3 readings of the 45-document baseline. Pure; never calls a model.
 *
 * Reuses the v2 evaluation semantics unchanged: every v3 reading is scored by `scoreObservation` and aggregated by `summarize`
 * against the ORIGINAL v2 truth, with the same thresholds and limits. The only difference: the `issuer_name` field outcome is removed
 * before aggregation. Under v3 the issuer is derived from issuer statements by the shared rule and scored by the issuer-evidence
 * scorer against the v3 truth, so the v2 issuer truth (a letterhead read as the issuer) would count the intended v3 behaviour as a
 * regression. Removing it changes only the issuer-dependent figures; every plan, date, service-period, classification, legibility,
 * injection and comparison-safety figure is computed exactly as v2 computes it.
 *
 * Gates: every v2 threshold except the two that depend on the issuer — `issuer_accuracy` (scored by the v3 issuer scorer instead) and
 * `comparison_accuracy` (its provider comparison depends on the issuer; reported, not gated). `false_consistent` stays a hard gate.
 */

import type { ResolvedFixture } from './fixtures'
import { summarize, type DocumentScore, type EvalSummary, type Pricing, type RunObservation, type Threshold } from './score'

export const V3_REGRESSION_SCORING_VERSION = 'receipt-v3-plan-date-regression-v1' as const
export const ISSUER_DEPENDENT_THRESHOLDS = ['issuer_accuracy', 'comparison_accuracy'] as const

export interface V3RegressionSummary {
  scoring_version: typeof V3_REGRESSION_SCORING_VERSION
  /** The v2 aggregate over the v3 readings, issuer field removed. Informational in full; only `gated` decides. */
  summary: EvalSummary
  gated: Threshold[]
  excluded: Threshold[]
  verdict: 'PASS' | 'FAIL' | 'INCOMPLETE'
}

export function withoutIssuerField(score: DocumentScore): DocumentScore {
  const { issuer_name: _f, ...fields } = score.fields
  const { issuer_name: _u, ...unsupported } = score.unsupported_value_in_document
  void _f
  void _u
  return { ...score, fields, unsupported_value_in_document: unsupported, evidence_unsupported: score.evidence_unsupported.filter((f) => f !== 'issuer_name') }
}

export function scoreV3Regression(fixtures: ResolvedFixture[], observations: RunObservation[], scores: DocumentScore[], pricing: Pricing | null): V3RegressionSummary {
  const summary = summarize(fixtures, observations, scores.map(withoutIssuerField), pricing)
  const excludedIds = ISSUER_DEPENDENT_THRESHOLDS as readonly string[]
  const gated = summary.thresholds.filter((t) => !excludedIds.includes(t.id))
  const excluded = summary.thresholds.filter((t) => excludedIds.includes(t.id))
  const failed = gated.some((t) => t.pass === false)
  const incomplete = gated.some((t) => t.hard && t.pass === null)
  return { scoring_version: V3_REGRESSION_SCORING_VERSION, summary, gated, excluded, verdict: failed ? 'FAIL' : incomplete ? 'INCOMPLETE' : 'PASS' }
}
