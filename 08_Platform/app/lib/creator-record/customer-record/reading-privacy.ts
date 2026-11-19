/**
 * CR-DOC-READER-EXT-6B — privacy-safe customer projection of document readings.
 *
 * A licence or permission document often names other people (whoever granted a permission, a signatory, a licensee). The reading is
 * instructed not to copy such details, but only emails and phone numbers are enforced by validation; a name or an address can still
 * reach a value or an excerpt. So, BY DEFAULT and whatever the reading's own `personal_details_present` flag says, every customer-
 * facing surface (the pre-purchase review, the PDF documents section and the PDF relationship block) shows for a reading of a
 * privacy-projected profile:
 *   - no excerpt at all;
 *   - no value for a free-text statement field (`permission_statement`): only that one was shown;
 *   - every other observation as before: closed classifications (labelled by the template), validated ISO dates, and the bounded,
 *     contact-validated short values (licence or plan type, designation, item).
 * The stored reading and the record are unchanged (internal provenance): this is a display projection only, applied in one place per
 * surface through this module. Receipt readings are unchanged (receipts are the creator's own billing documents; their customer view
 * already withholds the issuer).
 */

export interface ReadingPrivacyRule {
  /** Excerpts are never shown to the customer. */
  readonly excerpts: 'withheld'
  /** Fields whose value is never shown to the customer (only that the document showed one). */
  readonly withheld_values: readonly string[]
}

/** Profiles whose readings are privacy-projected for customers, by profile id. */
export const READING_PRIVACY_RULES: Readonly<Record<string, ReadingPrivacyRule>> = Object.freeze({
  licence: Object.freeze({ excerpts: 'withheld' as const, withheld_values: Object.freeze(['permission_statement']) }),
})

export interface CustomerObservationText {
  value: string | null
  excerpt: string | null
  /** The document showed a value here that is not displayed (the surface prints a fixed line instead). */
  value_withheld: boolean
  /** An excerpt existed and is not displayed. */
  excerpt_withheld: boolean
}

/** What a customer surface may display of one observation of a reading made with `profileId`. */
export function customerObservationText(profileId: string, o: { field: string; status: string; value: string | null; excerpt: string | null }): CustomerObservationText {
  const rule = Object.prototype.hasOwnProperty.call(READING_PRIVACY_RULES, profileId) ? READING_PRIVACY_RULES[profileId] : undefined
  if (!rule) return { value: o.value, excerpt: o.excerpt, value_withheld: false, excerpt_withheld: false }
  const withholdValue = rule.withheld_values.includes(o.field) && o.value !== null
  return { value: withholdValue ? null : o.value, excerpt: null, value_withheld: withholdValue, excerpt_withheld: o.excerpt !== null }
}

/** Whether readings of this profile are privacy-projected (the surface then prints the fixed `excerpts_withheld` line once). */
export const isPrivacyProjected = (profileId: string): boolean => Object.prototype.hasOwnProperty.call(READING_PRIVACY_RULES, profileId)
