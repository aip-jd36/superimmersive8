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

/** Material questions a document may be associated with by its declared category, and the question whose answer makes a
 * `permission` document ambiguous (brand or client permission, M4). */
export const MATERIAL_PROVIDER_QUESTIONS = ['M1', 'M3'] as const
export const PERMISSION_AMBIGUITY_QUESTIONS = ['M4'] as const
