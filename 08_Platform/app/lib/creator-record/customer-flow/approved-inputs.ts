/**
 * CR-V2-MVP-M2 — the approved inputs the customer flow prepares records from.
 *
 * Read ONLY from the authoritative governed sources (`../governed/sources`).
 * Never the pilot. Every governed source is empty or null until the M0
 * approvals exist, so `checkApprovedSources` refuses and the flow prepares
 * nothing ("unavailable").
 */

import type { ApprovedInputs, SubmissionsMode } from './service'
import {
  CREATOR_RECORD_ACKNOWLEDGEMENTS,
  CREATOR_RECORD_CAVEATS,
  CREATOR_RECORD_DEPENDENCY_LABELS,
  CREATOR_RECORD_MAX_TOOLS,
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
