/**
 * CR-V2-MVP-PROD-PREP-1, corrected by CR-V2-APPROVAL-AUTHORITY-FIX-1 — the customer wording set: every Creator Record v2 customer
 * string held in code outside the questionnaire bundle and the PDF templates (checkout, ready email, dashboard, consent and
 * permission controls, review page, questionnaire chrome, upload and examination panels, error messages, and the presentation
 * templates those panels use).
 *
 * It is NOT a separate approval. The Source Text Approval covers "customer-visible texts [that] carry no approval of their own"
 * (`lib/creator-record/customer-record/source-text.ts`); this set is its `customer_wording` category. The approved inputs put
 * `customerWordingIdentity()` into the Source Text content, so an approval names exactly the wording set it approved.
 *
 * The identity is DERIVED FROM THE WORDING ITSELF, at runtime, on every call:
 *   - every customer string, as the running build holds it (string values are identical in every build, minified or not);
 *   - for the presentation template functions, whose source text a running build does not hold, the pinned fingerprint of their
 *     source module, `CUSTOMER_WORDING_TEMPLATES_SHA256`, which every production build verifies against the source on disk
 *     (`scripts/customer-wording-check.js`, run from `next.config.js`). A build whose templates differ from the pin fails.
 * So any string edit changes the identity with no step anyone can forget, and any template edit fails the build until re-pinned,
 * which also changes the identity. Either way the Source Text content changes, no existing approval matches it, preparation refuses
 * (`source_text_digest_mismatch`) and checkout and issuance refuse (the approval reads as pending, `approvedGovernanceSnapshot`).
 * Changed wording cannot reach an issuable record without a new approval.
 *
 * DRAFT: every string in this set is engineering wording, pending M0 approval (see `08_Platform/content-drafts/creator-record-v2/`).
 */
import { canonicalJson, sha256Hex } from '@/lib/creator-record/record-core/canonical'
import { T } from '@/lib/creator-record/presentation/templates'
import {
  EVIDENCE_MESSAGES, EXAMINATION_MESSAGES, FLOW_MESSAGES, PAGE_TEXT, PANEL_TEXT, PURCHASE_MESSAGES, QUESTIONNAIRE_CHROME,
  V2_CHECKOUT_COPY, V2_CONSENT, V2_DASHBOARD, V2_READY_EMAIL, V2_REVIEW_PAGE,
} from './wording'
import { COMPARISON_LABELS, EXAM_LIVE_TEXT, EXAM_TEXT, LIMITATION_LABELS, OBSERVATION_STATUS_LABELS, RESPONSE_LABELS } from './examination-ui'

export const CUSTOMER_WORDING_SET_ID = 'si8/creator-record-v2-customer-wording' as const

export interface CustomerWordingIdentity {
  set_id: typeof CUSTOMER_WORDING_SET_ID
  /** The derivation's format version (not a wording version: the digest identifies the wording). */
  version: number
  sha256: string
}

/** Every module-level customer wording map, by a stable name. Customer wording typed anywhere else fails the build. */
export const CUSTOMER_WORDING_SOURCES = {
  checkout: V2_CHECKOUT_COPY,
  ready_email: V2_READY_EMAIL,
  dashboard: V2_DASHBOARD,
  consent: V2_CONSENT,
  review_page: V2_REVIEW_PAGE,
  flow_messages: FLOW_MESSAGES,
  purchase_messages: PURCHASE_MESSAGES,
  evidence_messages: EVIDENCE_MESSAGES,
  examination_messages: EXAMINATION_MESSAGES,
  questionnaire_chrome: QUESTIONNAIRE_CHROME,
  panel_text: PANEL_TEXT,
  page_text: PAGE_TEXT,
  examination_text: EXAM_TEXT,
  examination_live_text: EXAM_LIVE_TEXT,
  comparison_labels: COMPARISON_LABELS,
  observation_status_labels: OBSERVATION_STATUS_LABELS,
  response_labels: RESPONSE_LABELS,
  limitation_labels: LIMITATION_LABELS,
  presentation_templates: T,
} as const

/**
 * SHA-256 of the presentation templates' source module (`scripts/customer-wording-check.js` `templatesSha256`). Pinned, and
 * verified by every production build. Re-pinning is a wording change: it changes the identity, so the current approval stops
 * matching.
 */
export const CUSTOMER_WORDING_TEMPLATES_SHA256 = '8f4c388869fdecd886758c5659431a5f88b76225b2df355976f22302a27abfc0'

const IDENTITY_FORMAT_VERSION = 2

/** Every string exactly as held; each function marked by its position (its wording is covered by the templates fingerprint). */
function wordingView(v: unknown, at: string): unknown {
  if (typeof v === 'function') return { template: at }
  if (Array.isArray(v)) return v.map((x, i) => wordingView(x, `${at}[${i}]`))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, wordingView(x, `${at}.${k}`)]))
  return v
}

/** The canonical form the identity is the digest of. */
export function customerWordingCanonical(): string {
  return canonicalJson({ set_id: CUSTOMER_WORDING_SET_ID, strings: wordingView(CUSTOMER_WORDING_SOURCES, ''), templates_sha256: CUSTOMER_WORDING_TEMPLATES_SHA256 })
}

/** The identity of the wording this build renders NOW. Computed on every call, never cached. */
export function customerWordingIdentity(): CustomerWordingIdentity {
  return { set_id: CUSTOMER_WORDING_SET_ID, version: IDENTITY_FORMAT_VERSION, sha256: sha256Hex(customerWordingCanonical()) }
}
