/**
 * Product A preview projection (CAA-PRODUCT-A-2).
 *
 * ProductionReviewResult (structured) → ProductionReviewPreview (display-ready
 * strings). DETERMINISTIC: no model call, no I/O. Every rendered string is one
 * of:
 *   (a) a governed statement, verbatim;
 *   (b) a fixed template from `PRODUCTION_REVIEW_TEMPLATES` (the only authored
 *       prose in Product A — enumerable and test-locked);
 *   (c) a mechanical value: claim id, version, date, tool id, declared value,
 *       or a governed dependency key shown verbatim.
 *
 * The four lanes (applicability / fact basis / dependencies / permitted
 * conclusion) are rendered as separate fields and never merged. No template
 * states that use is cleared, compliant, certified, licensed, or verified.
 */

import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'
import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'
import type {
  DeclaredTool,
  PaApplicability,
  PaFactBasis,
  ProductionClaimFinding,
  ProductionReviewResult,
} from './types'

export const PREVIEW_BANNER = 'INTERNAL PRODUCT A PREVIEW — NOT CUSTOMER-FACING'

/** The only place negated legal terms appear. Excluded from the wording-lock scan by design. */
export const PREVIEW_DISCLAIMER: readonly string[] = [
  'This preview is not legal advice and is not a clearance, certification, or compliance determination.',
  'Every production fact shown here is a customer declaration. Nothing has been independently checked: a recognizable plan name is not proof of subscription, and an uploaded file is not proof of a license.',
  'Governed knowledge is shown as of the last-verified date of each claim. This preview does not establish which provider terms were in force on the declared production dates.',
  'Reviewer-eligible knowledge is used because this preview is restricted to SI8 administrators. It does not authorize customer publication.',
]

export const PRODUCTION_REVIEW_TEMPLATES = {
  applicability: {
    applies: 'Applies on the declared facts',
    applies_if: 'Applies only if a further condition is established — unresolved',
    does_not_apply_on_declared_facts: 'Not treated as applying on the declared facts',
  } satisfies Record<PaApplicability, string>,
  factBasis: {
    customer_declared: 'Based on customer declaration only — not independently checked',
    document_presented: 'A document was presented but has not been examined',
    not_declared: 'Not declared',
  } satisfies Record<PaFactBasis, string>,
  conclusion: {
    appliesNoRequirement:
      "SI8's governed knowledge identifies this provider condition as relevant to {tool}, a tool declared for this production. This review has not examined evidence of how {tool} was used, and it does not determine that the use is permitted.",
    appliesOnDeclaredFact:
      'On the plan declared for {tool}, this governed condition applies. A declared plan is not proof of subscription, and this review has not examined evidence of it.',
    appliesIf:
      'Whether this governed condition applies to {tool} depends on facts this review does not have. It remains unresolved, and nothing positive is concluded from it.',
    doesNotApply:
      "On the facts declared for {tool}, this governed condition's requirement is not met, so it is not treated as applying. This depends entirely on the declaration being accurate.",
    noToolScope:
      "SI8's governed knowledge identifies this condition as relevant to the declared production. This review has not examined evidence relating to it.",
  },
  unresolvedRequirement: {
    tool_account_status:
      'Requires the account status for {tool} to be {operator} "{value}". The current intake does not collect account status, so this is unresolved.',
    tool_plan_tier:
      'Requires the plan tier for {tool} to be {operator} "{value}". The declared plan does not establish this, so it is unresolved.',
    jurisdiction:
      'Requires the assessment jurisdiction to be {operator} "{value}". This review does not establish an assessment jurisdiction, and declared distribution territory is not used as one.',
  },
  operator: { equals: '', not_equals: 'other than' },
  dependency: 'Governed project fact not established by this review: {key}',
  topicCeiling: {
    directly_relevant: 'Governed knowledge relevant to the declared tools was found for this topic.',
    relevant_applicability_unresolved:
      'Governed knowledge was found for this topic, but whether it applies depends on facts this review does not have.',
    outside_current_coverage: 'No reviewer-eligible governed knowledge matched the declared production for this topic.',
    determination_declined: 'No determination is offered for this topic.',
  } satisfies Record<InterpretationStatus, string>,
  toolIdentity: {
    canonical: 'Recognized as {tool}',
    unrecognized: 'Not recognized — no governed knowledge can be applied to this tool',
    ambiguous: 'Ambiguous name — could refer to more than one tool, so no governed knowledge is applied',
    missing_name: 'No tool name was provided',
  },
  plan: {
    matches_governed_value: 'Declared: {plan} — used as a declared input to plan-specific conditions',
    not_a_governed_value: 'Declared: {plan} — no governed condition for this tool depends on this plan value',
    withheld_conflicting_declarations: 'Declared: {plan} — not used: this tool was declared with more than one different plan',
    withheld_ambiguous_governed_value: 'Declared: {plan} — not used: it matches more than one governed plan spelling',
    not_declared: 'No plan declared',
    toolUnresolved: 'Declared: {plan} — not evaluated because the tool was not recognized',
  },
  accountStatus: 'Not collected by the current intake',
  window: 'Declared production window: {start} to {end}',
  windowMissing: 'No production window declared',
  receipt: {
    presented: 'Receipt file presented — not opened or examined',
    absent: 'No receipt file presented',
  },
  missing: {
    accountStatus: 'Account status is not collected by the current intake for any tool.',
    receiptsUnexamined: 'Receipt files, where presented, have not been examined. No subscription or provider account has been established.',
    noPlan: 'No plan was declared for {tool}.',
    noWindow: 'No production window was declared for {tool}.',
    noReceipt: 'No receipt file was presented for {tool}.',
    assetProviders:
      'The intake declares {count} third-party asset(s) but does not capture which provider supplied them, so provider-specific governed knowledge was not evaluated.',
    audioProvider:
      'Licensed audio was declared, but the intake does not capture the music provider, so provider-specific governed knowledge was not evaluated.',
  },
  coverage: {
    toolWithoutCoverage: '{tool}: recognized, but no reviewer-eligible governed claim in the reviewed topics applies to it.',
    unresolvedTool: '{name}: tool identity could not be resolved; nothing is concluded about it.',
    matrixNotConsulted:
      'Platform Rights Matrix rows are not consulted by this preview; only governed topic claims with reviewer eligibility are used.',
    termsAtDate:
      'No governed record of earlier provider terms exists, so the terms in force on the declared production dates are not established.',
    providerScoped: 'Provider-scoped claims (stock footage, music libraries) are only evaluated when the provider is identified.',
    otherTopics:
      'Only commercial-use and third-party source-rights knowledge is reviewed. Copyright, likeness, trademark, and disclosure topics are out of scope for this preview.',
    territory:
      'Declared distribution territory is shown for context only. It is not used as an assessment jurisdiction, so jurisdiction-specific conditions remain unresolved.',
  },
  unreadable:
    'The declared tools list could not be read. No governed knowledge was evaluated for this submission.',
} as const

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? vars[k] : `{${k}}`))
}

export interface PreviewTool {
  position: number
  declared_name: string
  identity: string
  canonical_tool_id: string | null
  plan: string
  account_status: string
  window: string
  receipt: string
  primary: boolean
}

export interface PreviewCondition {
  claim_id: string
  claim_version: string | null
  last_verified: string | null
  topic_label: string
  tools: string[]
  applicability: PaApplicability
  applicability_label: string
  fact_basis_label: string
  governed_statement: string | null
  unresolved: string[]
  open_dependencies: string[]
  permitted_conclusion: string
  governed_claims_reference: string
}

export interface PreviewTopicCeiling {
  topic_label: string
  ceiling: string
}

export interface ProductionReviewPreview {
  banner: string
  disclaimer: readonly string[]
  status: ProductionReviewResult['status']
  declared_distribution_territory: string | null
  tools: PreviewTool[]
  topic_ceilings: PreviewTopicCeiling[]
  conditions: PreviewCondition[]
  not_applying: PreviewCondition[]
  missing_information: string[]
  coverage_limitations: string[]
  knowledge_provenance: ProductionReviewResult['knowledge_snapshot']
}

function toolLabel(f: ProductionClaimFinding): string {
  return f.tool_ids.length > 0 ? f.tool_ids.join(', ') : 'the declared production'
}

function unresolvedLine(req: ApplicabilityRequirement): string {
  const t = PRODUCTION_REVIEW_TEMPLATES.unresolvedRequirement[req.fact]
  const operator = PRODUCTION_REVIEW_TEMPLATES.operator[req.operator]
  return fill(t, { tool: req.tool ?? 'this tool', operator, value: req.value }).replace(/ {2,}/g, ' ')
}

function conclusionFor(f: ProductionClaimFinding): string {
  const c = PRODUCTION_REVIEW_TEMPLATES.conclusion
  const tool = toolLabel(f)
  if (f.applicability === 'applies_if') return fill(c.appliesIf, { tool })
  if (f.applicability === 'does_not_apply_on_declared_facts') return fill(c.doesNotApply, { tool })
  if (f.tool_ids.length === 0) return c.noToolScope
  // `applies`: "met on a declaration" is worded differently from "unconditional".
  return fill(f.evaluated_requirement_count > 0 ? c.appliesOnDeclaredFact : c.appliesNoRequirement, { tool })
}

function toCondition(f: ProductionClaimFinding): PreviewCondition {
  const permitted = conclusionFor(f)
  return {
    claim_id: f.claim_id,
    claim_version: f.claim_version,
    last_verified: f.last_verified,
    topic_label: reviewerTopicLabel(f.topic),
    tools: f.tool_ids,
    applicability: f.applicability,
    applicability_label: PRODUCTION_REVIEW_TEMPLATES.applicability[f.applicability],
    fact_basis_label: PRODUCTION_REVIEW_TEMPLATES.factBasis[f.fact_basis],
    governed_statement: f.statement,
    unresolved: f.unresolved_requirements.map(unresolvedLine),
    open_dependencies: f.open_dependencies.map((key) => fill(PRODUCTION_REVIEW_TEMPLATES.dependency, { key })),
    permitted_conclusion: permitted,
    governed_claims_reference: f.governed_claims_reference,
  }
}

function previewTool(t: DeclaredTool): PreviewTool {
  const T = PRODUCTION_REVIEW_TEMPLATES
  const canonical = t.identity.kind === 'canonical' ? t.identity.tool_id : null
  const identity =
    t.identity.kind === 'canonical' ? fill(T.toolIdentity.canonical, { tool: t.identity.tool_id }) : T.toolIdentity[t.identity.reason]
  return {
    position: t.index + 1,
    declared_name: t.raw_name ?? '—',
    identity,
    canonical_tool_id: canonical,
    plan:
      canonical === null && t.declared_plan
        ? fill(T.plan.toolUnresolved, { plan: t.declared_plan })
        : fill(T.plan[t.plan_relation], { plan: t.declared_plan ?? '' }),
    account_status: T.accountStatus,
    window:
      t.declared_window.start || t.declared_window.end
        ? fill(T.window, { start: t.declared_window.start ?? '—', end: t.declared_window.end ?? '—' })
        : T.windowMissing,
    receipt: t.receipt_presented ? T.receipt.presented : T.receipt.absent,
    primary: t.is_primary,
  }
}

export function projectProductionReview(result: ProductionReviewResult): ProductionReviewPreview {
  const T = PRODUCTION_REVIEW_TEMPLATES
  const base = {
    banner: PREVIEW_BANNER,
    disclaimer: PREVIEW_DISCLAIMER,
    status: result.status,
    declared_distribution_territory: result.facts.declared_distribution_territory,
    tools: result.facts.tools.map(previewTool),
    knowledge_provenance: result.knowledge_snapshot,
  }

  if (result.status === 'input_unreadable') {
    return {
      ...base,
      topic_ceilings: [],
      conditions: [],
      not_applying: [],
      missing_information: [T.unreadable],
      coverage_limitations: [],
    }
  }

  const all = result.topics.flatMap((t) => t.findings)
  const conditions = all.filter((f) => f.applicability !== 'does_not_apply_on_declared_facts').map(toCondition)
  const notApplying = all.filter((f) => f.applicability === 'does_not_apply_on_declared_facts').map(toCondition)

  const missing: string[] = [T.missing.accountStatus, T.missing.receiptsUnexamined]
  for (const tool of result.facts.tools) {
    const name = tool.identity.kind === 'canonical' ? tool.identity.tool_id : tool.raw_name ?? `tool #${tool.index + 1}`
    if (tool.plan_relation === 'not_declared') missing.push(fill(T.missing.noPlan, { tool: name }))
    if (!tool.declared_window.start && !tool.declared_window.end) missing.push(fill(T.missing.noWindow, { tool: name }))
    if (!tool.receipt_presented) missing.push(fill(T.missing.noReceipt, { tool: name }))
  }
  if (result.facts.declared_third_party_asset_count > 0) {
    missing.push(fill(T.missing.assetProviders, { count: String(result.facts.declared_third_party_asset_count) }))
  }
  if (result.facts.declared_licensed_audio) missing.push(T.missing.audioProvider)

  const coverage: string[] = [
    ...result.tools_without_governed_coverage.map((tool) => fill(T.coverage.toolWithoutCoverage, { tool })),
    ...result.unresolved_tools.map((t) => fill(T.coverage.unresolvedTool, { name: t.raw_name ?? `tool #${t.index + 1}` })),
    T.coverage.providerScoped,
    T.coverage.matrixNotConsulted,
    T.coverage.termsAtDate,
    T.coverage.otherTopics,
    T.coverage.territory,
  ]

  return {
    ...base,
    topic_ceilings: result.topics.map((t) => ({
      topic_label: reviewerTopicLabel(t.topic),
      ceiling: T.topicCeiling[t.bounded_interpretation_status ?? 'outside_current_coverage'],
    })),
    conditions,
    not_applying: notApplying,
    missing_information: missing,
    coverage_limitations: coverage,
  }
}
