/**
 * CR-V2-RECEIPT-GATE-1B — the product-side factual plan-name vocabulary for
 * the G-R2 receipt text-layer cross-check (PRD v0.3 §6.2). Pure data + pure
 * validation; no I/O.
 *
 * What this is: the plan names a provider's OWN official documentation shows,
 * each traced to a dated capture. It is factual product data, not governance:
 * it is NOT Living Knowledge, NOT a commercial-use proposition and NOT a claim
 * about what any plan permits.
 *
 * Its only use: G-R2 may push a receipt plan comparison toward "could not be
 * determined" when the document's own text names a plan the automated reading
 * did not report. It never establishes a plan, never feeds declarations,
 * applicability, Bounded Interpretation, guidance or the publication ledger.
 *
 * Fail closed (PM decision, CR-V2-RECEIPT-GATE-1B): an entry is usable only
 * when it is explicitly approved by the named approval authority, within its
 * review date, and every plan name is supported by at least one recorded
 * capture of official provider documentation. Missing, unapproved, overdue,
 * duplicated or insufficiently sourced entries are unusable. A `partial`
 * entry (documentation does not show every plan) can only ever find
 * conflicts; it can never support "no other plan names found".
 *
 * Owner: SI8 Product/Operations. Initial approval authority: JD.
 * Entries proposed for approval are kept OUTSIDE this file until approved.
 */

export interface PlanVocabularySource {
  /** Official provider URL that was captured. */
  url: string
  /** Capture time, ISO 8601 UTC. */
  captured_at: string
  /** Where the preserved raw capture is stored. */
  capture_file: string
  raw_sha256: string
  /** SHA-256 of the extracted text (EVIDENCE-CAPTURE-SOP method); the stable change detector. */
  text_sha256: string
  /** Plan names, exactly as written, that this capture shows. */
  supports: readonly string[]
}

export interface ProviderPlanVocabularyEntry {
  /** Canonical tool identifier produced by SI8's existing tool-identity resolution. */
  tool_id: string
  /** Plan names exactly as the provider writes them (case-sensitive, whole-word matching). */
  plan_names: readonly string[]
  coverage: 'complete' | 'partial'
  sources: readonly PlanVocabularySource[]
  owner: string
  /** ISO date; after it the entry is overdue and unusable until re-reviewed. */
  review_by: string
  approval: { status: 'proposed' } | { status: 'approved'; approved_by: string; approved_on: string }
}

/** Approved entries only. Empty until the approval authority signs off. */
export const PROVIDER_PLAN_VOCABULARY: readonly ProviderPlanVocabularyEntry[] = Object.freeze([])

export const PLAN_VOCABULARY_UNUSABLE_REASONS = [
  'vocabulary_not_found',
  'vocabulary_duplicate',
  'vocabulary_not_approved',
  'vocabulary_review_overdue',
  'vocabulary_insufficiently_sourced',
] as const
export type PlanVocabularyUnusableReason = (typeof PLAN_VOCABULARY_UNUSABLE_REASONS)[number]

export type PlanVocabularyLookup =
  | { status: 'usable'; tool_id: string; plan_names: readonly string[]; complete: boolean }
  | { status: 'unusable'; reason: PlanVocabularyUnusableReason }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SHA256 = /^[0-9a-f]{64}$/
const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim() !== ''

function sourceOk(s: PlanVocabularySource): boolean {
  return (
    /^https:\/\/\S+$/.test(s.url) &&
    !Number.isNaN(Date.parse(s.captured_at)) &&
    nonEmpty(s.capture_file) &&
    SHA256.test(s.raw_sha256) &&
    SHA256.test(s.text_sha256) &&
    Array.isArray(s.supports) &&
    s.supports.length > 0
  )
}

/** Validates one entry against the fail-closed rules. `today` is an ISO date (YYYY-MM-DD). */
export function checkVocabularyEntry(e: ProviderPlanVocabularyEntry, today: string): PlanVocabularyLookup {
  if (e.approval.status !== 'approved' || !nonEmpty(e.approval.approved_by) || !ISO_DATE.test(e.approval.approved_on)) {
    return { status: 'unusable', reason: 'vocabulary_not_approved' }
  }
  if (!ISO_DATE.test(e.review_by) || !ISO_DATE.test(today) || today > e.review_by) return { status: 'unusable', reason: 'vocabulary_review_overdue' }
  const names = e.plan_names.map((n) => n.trim())
  if (!nonEmpty(e.owner) || names.length === 0 || names.some((n) => n === '') || new Set(names).size !== names.length) {
    return { status: 'unusable', reason: 'vocabulary_insufficiently_sourced' }
  }
  if (e.sources.length === 0 || !e.sources.every(sourceOk)) return { status: 'unusable', reason: 'vocabulary_insufficiently_sourced' }
  const supported = new Set(e.sources.flatMap((s) => s.supports))
  if (!names.every((n) => supported.has(n))) return { status: 'unusable', reason: 'vocabulary_insufficiently_sourced' }
  return { status: 'usable', tool_id: e.tool_id, plan_names: Object.freeze([...names]), complete: e.coverage === 'complete' }
}

/** The usable vocabulary for exactly one canonical tool, or why there is none. */
export function vocabularyForTool(
  toolId: string,
  today: string,
  entries: readonly ProviderPlanVocabularyEntry[] = PROVIDER_PLAN_VOCABULARY,
): PlanVocabularyLookup {
  const matching = entries.filter((e) => e.tool_id === toolId)
  if (matching.length === 0) return { status: 'unusable', reason: 'vocabulary_not_found' }
  if (matching.length > 1) return { status: 'unusable', reason: 'vocabulary_duplicate' }
  return checkVocabularyEntry(matching[0], today)
}
