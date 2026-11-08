/**
 * CR-V2-MVP-M2 — the approved inputs the customer flow prepares records from.
 *
 * CR-V2-MVP-M4B: read ONLY from the publication authority bundle this build may use
 * (`../governed/publication-authority`): the governance bundle (`../governed/sources`) unless the
 * environment verifiably asks for an isolated synthetic test. Never the pilot. When no bundle may be
 * used (malformed or unsafe environment), every input is empty and every source unavailable, so the
 * flow prepares, sells and issues nothing. Every governed source is empty or null until the M0
 * approvals exist, so `checkApprovedSources` refuses and the flow prepares nothing ("unavailable").
 */

import type { ApprovedInputs, SubmissionsMode } from './service'
import type { GovernanceSnapshot } from '../customer-record/eligibility'
import { governanceSnapshotFrom, UNAVAILABLE } from '../customer-record/governance-state'
import type { TopicClaims } from '../customer-record/sources'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY } from '../governed/sources'
import { CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY } from '../governed/synthetic-test-authority'
import { resolvePublicationAuthority, selectAuthorityBundle, type PublicationAuthorityBundle } from '../governed/publication-authority'

/**
 * CR-V2-MVP-M2 — stop for NEW Creator Record v2 submissions (preparing and reviewing).
 * 'stopped' is the default; only a reviewed code change opens it for the invited pilot.
 * Issuance has its own, separate stop (`CREATOR_RECORD_V2_ISSUANCE`).
 */
export const CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'stopped'

/** CR-V2-MVP-M4B — the bundle this running build may publish from, resolved from the environment now; null = none. */
export function currentPublicationAuthority(env: Readonly<Record<string, string | undefined>> = process.env): PublicationAuthorityBundle | null {
  return selectAuthorityBundle(resolvePublicationAuthority(env), { governance: CREATOR_RECORD_GOVERNANCE_AUTHORITY, synthetic_test: CREATOR_RECORD_SYNTHETIC_TEST_AUTHORITY })
}

/** No authority: nothing approved, nothing versioned (refused as unavailable). */
const NO_AUTHORITY_INPUTS: ApprovedInputs = Object.freeze({
  sources: {
    kind: 'governed',
    registry_input: { questions: [], observation_map: [] },
    presentation: {},
    acknowledgement_ids: [],
    ledger: [],
    dependency_labels: {},
    caveats: {},
    versions: { registry: 'none approved', ledger: 'none approved' },
    max_tools: 0,
    questionnaire_approval: null,
  },
  source_text: null,
  source_text_examination: null,
}) as ApprovedInputs

export function approvedCustomerRecordInputs(bundle: PublicationAuthorityBundle | null = currentPublicationAuthority()): ApprovedInputs {
  if (!bundle) return NO_AUTHORITY_INPUTS
  return {
    sources: {
      kind: 'governed',
      registry_input: bundle.registry_input,
      presentation: bundle.presentation,
      acknowledgement_ids: Object.keys(bundle.acknowledgements),
      ledger: bundle.publication_ledger,
      dependency_labels: bundle.dependency_labels,
      caveats: bundle.caveats,
      versions: { registry: bundle.versions.registry, ledger: bundle.versions.ledger },
      max_tools: bundle.max_tools,
      questionnaire_approval: bundle.questionnaire_approval,
    },
    source_text: bundle.source_text_approval === null ? null : { approval: bundle.source_text_approval, acknowledgements: bundle.acknowledgements },
    // CR-V2-SCHEMA8-PATH-1: the schema 8 approval of the same wording, from the same bundle (null when none).
    source_text_examination: examinationApprovalOf(bundle) === null ? null : { approval: examinationApprovalOf(bundle), acknowledgements: bundle.acknowledgements },
  }
}

const examinationApprovalOf = (bundle: PublicationAuthorityBundle) => bundle.source_text_examination_approval ?? null

/** Every Source Text Approval the bundle carries (one per record schema it publishes), for the issuance snapshot. */
function sourceTextApprovalsOf(bundle: PublicationAuthorityBundle) {
  return [bundle.source_text_approval, examinationApprovalOf(bundle)].filter((a): a is NonNullable<typeof a> => a !== null)
}

/**
 * CR-V2-MVP-M3 — the authoritative governance state a prepared record is checked against at checkout and
 * again at issuance (`../customer-record/eligibility`). Built from the same bundle only; while it is
 * empty every reference is unknown, so nothing is eligible. With no bundle, every source is unavailable
 * (indeterminate: refused).
 */
export function approvedGovernanceSnapshot(issuanceDate: string, topicClaims: TopicClaims, bundle: PublicationAuthorityBundle | null = currentPublicationAuthority()): GovernanceSnapshot {
  if (!bundle) return governanceSnapshotFrom({ issuance_date: issuanceDate, sources: UNAVAILABLE, topicClaims, source_text_approvals: UNAVAILABLE })
  return governanceSnapshotFrom({
    issuance_date: issuanceDate,
    sources: approvedCustomerRecordInputs(bundle).sources,
    topicClaims,
    source_text_approvals: sourceTextApprovalsOf(bundle),
    authority_class: bundle.authority_class,
  })
}

/**
 * CR-V2-MVP-M3 — the approved customer PDF templates and their approval (both null until M0, or with no bundle).
 *
 * CR-V2-MVP-M4A: with `recordSchema`, the ONE approved set for that record schema: the bundle's main set or one of its
 * `pdf_template_sets`, chosen by the schema its approval names. None, or more than one, gives no templates (rendering refuses). The
 * chosen set is then checked in full by the renderer (`checkTemplates`: fingerprint, lifecycle, identity, schema, wording lock).
 * Without `recordSchema`, the main set, exactly as before.
 */
export function approvedPdfTemplates(
  bundle: PublicationAuthorityBundle | null = currentPublicationAuthority(),
  recordSchema?: { id: string; version: number },
): { templates: unknown; approval: PdfTemplateApproval | null } {
  if (!bundle) return { templates: null, approval: null }
  if (!recordSchema) return { templates: bundle.pdf_templates, approval: bundle.pdf_template_approval }
  const sets = [{ templates: bundle.pdf_templates, approval: bundle.pdf_template_approval }, ...(bundle.pdf_template_sets ?? [])]
  const matching = sets.filter((t) => t.approval !== null && t.approval.record_schema?.id === recordSchema.id && t.approval.record_schema?.version === recordSchema.version)
  return matching.length === 1 ? { templates: matching[0].templates, approval: matching[0].approval } : { templates: null, approval: null }
}
