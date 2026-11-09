/**
 * CR-V2-VERTICAL-SLICE-1 — the AUTHORITATIVE Creator Record governance sources.
 *
 * These are the only sources a customer-facing Creator Record may ever read.
 * Today every one of them is empty, because no Creator Record question,
 * Observation Map entry, dependency label or publication ledger entry has been
 * approved (PRD v0.3 §4.3: "zero entries exist today"). An empty source fails
 * closed: no question is shown and no governed claim is published.
 *
 * The internal prototype's pilot data lives in `../pilot/` and is NEVER merged
 * into these sources. `__tests__/creator-record/vertical-slice-boundaries.test.ts`
 * asserts that nothing here carries a pilot marker and that this file does not
 * import the pilot module.
 */

import type { PublicationLedgerEntry } from '../contract/publication-ledger'
import type { RegistryInput } from '../contract/question-registry'
import type { CreatorRecordSources } from '../prototype/build-draft'
import type { QuestionnaireContractApproval } from '../customer-record/questionnaire-contract'
import type { SourceTextApproval } from '../customer-record/source-text'
import type { PdfTemplateApproval } from '../customer-pdf/templates'
import type { PublicationAuthorityBundle } from './publication-authority'

/** Approved Question Registry and Observation Map entries. None approved yet. */
export const CREATOR_RECORD_REGISTRY_INPUT: RegistryInput = Object.freeze({ questions: [], observation_map: [] }) as RegistryInput

/** Approved Creator Record publication ledger. None approved yet. */
export const CREATOR_RECORD_PUBLICATION_LEDGER: readonly PublicationLedgerEntry[] = Object.freeze([])

/** Approved Creator Record dependency display labels. None approved yet. */
export const CREATOR_RECORD_DEPENDENCY_LABELS: Readonly<Record<string, string>> = Object.freeze({})

// CR-V2-MVP-M2: the remaining approved inputs a customer record needs. Every one is empty or null until
// the M0 approvals exist, so the customer flow refuses (fails closed) before preparing anything.

/** Approved question wording and option labels, per approved question. None approved yet. */
export const CREATOR_RECORD_PRESENTATION: CreatorRecordSources['presentation'] = Object.freeze({})

/** Approved acknowledgement wording, by acknowledgement id. None approved yet. */
export const CREATOR_RECORD_ACKNOWLEDGEMENTS: Readonly<Record<string, string>> = Object.freeze({})

/** Approved caveat wording, by caveat id. None approved yet. */
export const CREATOR_RECORD_CAVEATS: Readonly<Record<string, string>> = Object.freeze({})

/** Customer-facing versions of the approved registry and ledger. None approved yet (refused as unavailable). */
export const CREATOR_RECORD_VERSIONS: Readonly<{ registry: string; ledger: string }> = Object.freeze({ registry: 'none approved', ledger: 'none approved' })

/** Maximum number of tool blocks in the approved questionnaire. */
export const CREATOR_RECORD_MAX_TOOLS = 3

/** The Source Text Approval covering the wording above. None issued yet. */
export const CREATOR_RECORD_SOURCE_TEXT_APPROVAL: SourceTextApproval | null = null

/**
 * CR-V2-SCHEMA8-PATH-1: the Source Text Approval covering the same wording for the examination-bearing record (schema 8).
 * None issued yet.
 */
export const CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL: SourceTextApproval | null = null

/** The approval of the exact questionnaire contract (CR-V2-DECL-1B-1). None issued yet. */
export const CREATOR_RECORD_QUESTIONNAIRE_APPROVAL: QuestionnaireContractApproval | null = null

// CR-V2-MVP-M3: the customer PDF template set and its approval (`../customer-pdf/templates`). Rendering
// refuses without both, so no Creator Record v2 PDF can be issued until they are approved (M0).

/** The approved customer PDF template set (data only). None approved yet. */
export const CREATOR_RECORD_PDF_TEMPLATES: unknown = null

/** The approval covering `CREATOR_RECORD_PDF_TEMPLATES`. None issued yet. */
export const CREATOR_RECORD_PDF_TEMPLATE_APPROVAL: PdfTemplateApproval | null = null

/**
 * CR-V2-MVP-PROD-PREP-1: further approved template sets, one per other record schema. The schema 7 set goes in
 * `CREATOR_RECORD_PDF_TEMPLATES` above and the schema 8 (examination-bearing) set here, each with its own approval naming its
 * schema (`approvedPdfTemplates` selects exactly one per schema; none or more than one refuses). None approved yet.
 */
export const CREATOR_RECORD_PDF_TEMPLATE_SETS: readonly { readonly templates: unknown; readonly approval: PdfTemplateApproval }[] = Object.freeze([])

// CR-V2-MVP-PROD-PREP-1 — the other integration points an approved launch fills, outside this file (each null or empty today):
//   - customer wording set: `lib/creator-record-flow/customer-wording.ts` (identity, covered by the two Source Text Approvals above);
//   - approved consent and permission wording identifiers: `lib/creator-record-flow/authorization-versions.ts`;
//   - privacy notice and terms: `lib/legal/policies.ts`;
//   - what may be issued (record schemas, builders, reading methods): `CURRENT_ISSUANCE_SUPPORT` in
//     `lib/creator-record/customer-record/governance-state.ts` — deliberately empty until separately authorized.

// CR-V2-MVP-M4B: the governance bundle — the only bundle Production can publish from
// (`./publication-authority`). Synthetic test approvals never go here: they live in
// `./synthetic-test-authority`, which governance mode never reads.

/** Every approved input above, as the Production publication authority. */
export const CREATOR_RECORD_GOVERNANCE_AUTHORITY: PublicationAuthorityBundle = Object.freeze({
  authority_class: 'governance',
  registry_input: CREATOR_RECORD_REGISTRY_INPUT,
  publication_ledger: CREATOR_RECORD_PUBLICATION_LEDGER,
  dependency_labels: CREATOR_RECORD_DEPENDENCY_LABELS,
  presentation: CREATOR_RECORD_PRESENTATION,
  acknowledgements: CREATOR_RECORD_ACKNOWLEDGEMENTS,
  caveats: CREATOR_RECORD_CAVEATS,
  versions: CREATOR_RECORD_VERSIONS,
  max_tools: CREATOR_RECORD_MAX_TOOLS,
  source_text_approval: CREATOR_RECORD_SOURCE_TEXT_APPROVAL,
  source_text_examination_approval: CREATOR_RECORD_EXAMINATION_SOURCE_TEXT_APPROVAL,
  questionnaire_approval: CREATOR_RECORD_QUESTIONNAIRE_APPROVAL,
  pdf_templates: CREATOR_RECORD_PDF_TEMPLATES,
  pdf_template_approval: CREATOR_RECORD_PDF_TEMPLATE_APPROVAL,
  pdf_template_sets: CREATOR_RECORD_PDF_TEMPLATE_SETS,
})
