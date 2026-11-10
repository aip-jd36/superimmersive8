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

const CAPTURES = '06_Operations/creator-record/receipt-plan-vocabulary/'

/**
 * Approved entries only (CR-V2-RECEIPT-GATE-1B, JD 2026-11-10: provisional approval subject to source
 * verification; verified the same day: raw and extracted-text SHA-256 re-checked, every name present in the
 * extracted text, same-day re-fetch text-identical). Evidence: `${CAPTURES}MANIFEST.md`.
 * Runway is deliberately absent: its current-plan names are candidates only until decision D-1 is resolved.
 */
export const PROVIDER_PLAN_VOCABULARY: readonly ProviderPlanVocabularyEntry[] = Object.freeze([
  {
    tool_id: 'pika',
    plan_names: ['Free', 'Starter', 'Creator', 'Fancy', 'Enterprise', 'Basic', 'Standard', 'Pro', 'Unlimited'],
    // The provider's own page names its current AND legacy individual plans.
    coverage: 'complete',
    sources: [
      {
        url: 'https://pika.art/pricing',
        captured_at: '2026-11-10T14:04:56Z',
        capture_file: `${CAPTURES}pika/pika-pricing_20261110T140456Z.html`,
        raw_sha256: 'f8a8760bf55e65e4d7e4a5d4c8b9f0510e343eaee66e144f94dec6e506ce6123',
        text_sha256: '6d00011a5b3ccb221d9a2a093ab3e13bc10ff3b2bc1db958624e9f8c1f576b01',
        supports: ['Free', 'Starter', 'Creator', 'Fancy', 'Enterprise', 'Basic', 'Standard', 'Pro', 'Unlimited'],
      },
    ],
    owner: 'SI8 Product/Operations',
    review_by: '2027-02-10',
    approval: { status: 'approved', approved_by: 'JD', approved_on: '2026-11-10' },
  },
  {
    tool_id: 'higgsfield',
    plan_names: ['Team', 'Scale', 'Enterprise'],
    // Team plans only; individual plan names are not in any served official text. Never supports absence.
    coverage: 'partial',
    sources: [
      {
        url: 'https://higgsfield.ai/creator-hub/help-center/business/team-and-business-higgsfield',
        captured_at: '2026-11-10T14:07:33Z',
        capture_file: `${CAPTURES}higgsfield/higgsfield-help-team-and-business_20261110T140733Z.html`,
        raw_sha256: '5cba1b9b66e9008e7c29f536c93b1f8aea87c922a38a4effde3864eeee1930a9',
        text_sha256: 'fcc7a852b820930aabe2c41ad427b2f1dd86f39972e913786377c5b6a6d78f40',
        supports: ['Team', 'Scale', 'Enterprise'],
      },
      {
        url: 'https://higgsfield.ai/creator-hub/help-center/plans/how-do-higgsfield-plans-work',
        captured_at: '2026-11-10T14:06:58Z',
        capture_file: `${CAPTURES}higgsfield/higgsfield-help-how-plans-work_20261110T140658Z.html`,
        raw_sha256: 'f42fbf42a77d114c9116f11101cb07f38181760ad49b5ccabce871246d7ffd8f',
        text_sha256: '35da56422f8d26096f9260b6e5c7d2867cf34ad5802ad0705cbdc7d5c43a31fa',
        supports: ['Team', 'Scale', 'Enterprise'],
      },
    ],
    owner: 'SI8 Product/Operations',
    review_by: '2027-02-10',
    approval: { status: 'approved', approved_by: 'JD', approved_on: '2026-11-10' },
  },
] satisfies ProviderPlanVocabularyEntry[])

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
