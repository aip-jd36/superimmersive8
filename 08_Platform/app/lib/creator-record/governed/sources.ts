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
import type { SourceTextApproval } from '../customer-record/source-text'
import type { PdfTemplateApproval } from '../customer-pdf/templates'

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

// CR-V2-MVP-M3: the customer PDF template set and its approval (`../customer-pdf/templates`). Rendering
// refuses without both, so no Creator Record v2 PDF can be issued until they are approved (M0).

/** The approved customer PDF template set (data only). None approved yet. */
export const CREATOR_RECORD_PDF_TEMPLATES: unknown = null

/** The approval covering `CREATOR_RECORD_PDF_TEMPLATES`. None issued yet. */
export const CREATOR_RECORD_PDF_TEMPLATE_APPROVAL: PdfTemplateApproval | null = null
