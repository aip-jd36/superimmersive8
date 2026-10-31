/**
 * CR-V2-MVP-M2 — the approved inputs the customer flow prepares records from.
 *
 * Read ONLY from the authoritative governed sources (`../governed/sources`).
 * Never the pilot. Every governed source is empty or null until the M0
 * approvals exist, so `checkApprovedSources` refuses and the flow prepares
 * nothing ("unavailable").
 */

import type { ApprovedInputs, SubmissionsMode } from './service'
import type { GovernanceSnapshot } from '../customer-record/eligibility'
import { governanceSnapshotFrom } from '../customer-record/governance-state'
import type { TopicClaims } from '../customer-record/sources'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import {
  CREATOR_RECORD_ACKNOWLEDGEMENTS,
  CREATOR_RECORD_CAVEATS,
  CREATOR_RECORD_DEPENDENCY_LABELS,
  CREATOR_RECORD_MAX_TOOLS,
  CREATOR_RECORD_PDF_TEMPLATE_APPROVAL,
  CREATOR_RECORD_PDF_TEMPLATES,
  CREATOR_RECORD_PRESENTATION,
  CREATOR_RECORD_PUBLICATION_LEDGER,
  CREATOR_RECORD_REGISTRY_INPUT,
  CREATOR_RECORD_SOURCE_TEXT_APPROVAL,
  CREATOR_RECORD_VERSIONS,
} from '../governed/sources'

/**
 * CR-V2-MVP-M2 — stop for NEW Creator Record v2 submissions (preparing and reviewing).
 * 'stopped' is the default; only a reviewed code change opens it for the invited pilot.
 * Issuance has its own, separate stop (`CREATOR_RECORD_V2_ISSUANCE`).
 */
export const CREATOR_RECORD_V2_SUBMISSIONS: SubmissionsMode = 'stopped'

export function approvedCustomerRecordInputs(): ApprovedInputs {
  return {
    sources: {
      kind: 'governed',
      registry_input: CREATOR_RECORD_REGISTRY_INPUT,
      presentation: CREATOR_RECORD_PRESENTATION,
      acknowledgement_ids: Object.keys(CREATOR_RECORD_ACKNOWLEDGEMENTS),
      ledger: CREATOR_RECORD_PUBLICATION_LEDGER,
      dependency_labels: CREATOR_RECORD_DEPENDENCY_LABELS,
      caveats: CREATOR_RECORD_CAVEATS,
      versions: { registry: CREATOR_RECORD_VERSIONS.registry, ledger: CREATOR_RECORD_VERSIONS.ledger },
      max_tools: CREATOR_RECORD_MAX_TOOLS,
    },
    source_text: CREATOR_RECORD_SOURCE_TEXT_APPROVAL === null ? null : { approval: CREATOR_RECORD_SOURCE_TEXT_APPROVAL, acknowledgements: CREATOR_RECORD_ACKNOWLEDGEMENTS },
  }
}

/**
 * CR-V2-MVP-M3 — the authoritative governance state a prepared record is checked against at checkout and
 * again at issuance (`../customer-record/eligibility`). Built from the same approved sources only; while
 * they are empty every reference is unknown, so nothing is eligible.
 */
export function approvedGovernanceSnapshot(issuanceDate: string, topicClaims: TopicClaims): GovernanceSnapshot {
  const inputs = approvedCustomerRecordInputs()
  return governanceSnapshotFrom({
    issuance_date: issuanceDate,
    sources: inputs.sources,
    topicClaims,
    source_text_approvals: CREATOR_RECORD_SOURCE_TEXT_APPROVAL === null ? [] : [CREATOR_RECORD_SOURCE_TEXT_APPROVAL],
  })
}

/** CR-V2-MVP-M3 — the approved customer PDF templates and their approval (both null until M0). */
export function approvedPdfTemplates(): { templates: unknown; approval: PdfTemplateApproval | null } {
  return { templates: CREATOR_RECORD_PDF_TEMPLATES, approval: CREATOR_RECORD_PDF_TEMPLATE_APPROVAL }
}
