/**
 * CR-DOC-READER-EXT-1 (C) — DRAFT governed relevance table: which observation fields of which reading MAY bear on a governed
 * project dependency. STATUS: DRAFT — NOT APPROVED. Governance data, not interpretation: an entry never says a field satisfies a
 * dependency or that a document is sufficient evidence of anything. It only names where a relevant printed value could appear.
 *
 * Keys are existing governed dependency ids (`unresolved_project_dependencies` of the candidate claims). Each entry names the
 * declared document categories it applies to and, per category, the reading profile that must have produced the reading and the
 * printed fields to look at. Provider-identity dependencies (`which_music_provider`, `which_provider`) are deliberately absent:
 * the provider is already declared, and issuer readings are not used to link anything.
 */

export const DEPENDENCY_RELEVANCE_STATUS = 'DRAFT — NOT APPROVED' as const

export interface RelevanceSource {
  /** The profile whose reading this is (must equal the reading's own profile). */
  profile_id: string
  /** Printed fields that may show a relevant value. */
  fields: readonly string[]
}

/** dependency id → declared category → where a relevant printed value could appear. */
export type DependencyRelevanceTable = Readonly<Record<string, Readonly<Record<string, RelevanceSource>>>>

const LICENCE_TYPE: RelevanceSource = { profile_id: 'licence', fields: ['licence_or_plan_type'] }
const RECEIPT_PLAN: RelevanceSource = { profile_id: 'receipt', fields: ['product_or_plan_name', 'plan_candidate'] }

export const DRAFT_DEPENDENCY_RELEVANCE: DependencyRelevanceTable = Object.freeze({
  artlist_license_type_confirmed: { licence: LICENCE_TYPE, billing_receipt: RECEIPT_PLAN },
  epidemic_license_tier_confirmed: { licence: LICENCE_TYPE, billing_receipt: RECEIPT_PLAN },
  editorial_designation_confirmed: { licence: { profile_id: 'licence', fields: ['content_designation'] } },
  separate_authorization_obtained: { permission: { profile_id: 'licence', fields: ['permission_statement'] }, licence: { profile_id: 'licence', fields: ['permission_statement'] } },
})

/**
 * CR-DOC-READER-EXT-6A — the ledger entries whose evidence notes speak about a document the creator added ("A document you added may
 * show …"): the four CR-DOC-READER-EXT-1 candidates (a test pins this list to them). Other entries' notes are general statements of
 * what evidence could show a point, and print as before.
 */
export const DOCUMENT_SCOPED_NOTE_ENTRIES: ReadonlySet<string> = new Set([
  'CR-DOC-READER-EXT-1-LEDGER-CLAIM-MUSIC-ARTLIST-SOCIAL-VS-PRO-001-v1',
  'CR-DOC-READER-EXT-1-LEDGER-CLAIM-MUSIC-EPIDEMIC-TIER-ADVERTISING-001-v1',
  'CR-DOC-READER-EXT-1-LEDGER-CLAIM-STOCK-EDITORIAL-001-v2',
  'CR-DOC-READER-EXT-1-LEDGER-CLAIM-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001-v1',
])

/**
 * CR-DOC-READER-EXT-6A — whether a dependency row's evidence note is printed. A document-scoped note (an entry above) is printed only
 * when the record holds at least one document, not linked to an AI tool, of a category this table names for that dependency (the
 * association rule of method v2). With none, the explanation and the open point print without the note. Every other note prints
 * as before. Display only: the record keeps the note (method v2 reads it as the governance signal that documents may be relevant).
 */
export function documentNoteApplies(entryId: string, dependencyId: string, documents: readonly { category: string; tool_index: number | null }[], table: DependencyRelevanceTable = DRAFT_DEPENDENCY_RELEVANCE): boolean {
  if (!DOCUMENT_SCOPED_NOTE_ENTRIES.has(entryId)) return true
  if (!Object.prototype.hasOwnProperty.call(table, dependencyId)) return false
  const sources = table[dependencyId]
  return documents.some((d) => d.tool_index === null && Object.prototype.hasOwnProperty.call(sources, d.category))
}

/** Material questions a document may be associated with by its declared category, and the question whose answer makes a
 * `permission` document ambiguous (brand or client permission, M4). */
export const MATERIAL_PROVIDER_QUESTIONS = ['M1', 'M3'] as const
export const PERMISSION_AMBIGUITY_QUESTIONS = ['M4'] as const
