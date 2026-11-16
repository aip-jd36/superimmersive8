/**
 * SI8-UX-2 harness: the PRODUCTION question registry, presentation, acknowledgements and contract digest, as the server page passes
 * them to the client, printed as JSON for the browser harness (server modules cannot be bundled for the browser).
 * Usage: npx tsx test-support/si8-ux-2/export-props.ts
 */
import { approvedCustomerRecordInputs } from '@/lib/creator-record/customer-flow/approved-inputs'
import { CREATOR_RECORD_GOVERNANCE_AUTHORITY as GOV, CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256 } from '@/lib/creator-record/governed/sources'

const sources = approvedCustomerRecordInputs(GOV).sources
process.stdout.write(JSON.stringify({
  registryInput: sources.registry_input,
  presentation: sources.presentation,
  acknowledgements: GOV.acknowledgements,
  maxTools: sources.max_tools,
  questionnaireContractSha256: CREATOR_RECORD_QUESTIONNAIRE_CONTRACT_SHA256,
}))
