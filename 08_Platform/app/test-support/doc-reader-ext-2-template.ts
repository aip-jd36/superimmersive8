/**
 * CR-DOC-READER-EXT-2 — DRAFT schema 8 PDF template set v8 for Path 1. STATUS: PROPOSED — NOT APPROVED, NOT REGISTERED.
 *
 * Built from the registered, approved schema 8 set v7 (CR-DESIGN-2D) by additions only, plus ONE revised line:
 *   - `version` 8;
 *   - labels for the licence profile's fields and classifications (the documents section refuses an unlabelled field);
 *   - the `integrated_assessment_v2` block (method v2, printed in the documents section; wording from
 *     `lib/creator-record/integrated-assessment/v2-wording-candidate`);
 *   - `sections.not_done.lines[4]`: v7 says readings were not compared "with the guidance". With v2 a document can be linked to an
 *     open point in the guidance, so that clause would be untrue; the revised line keeps the no-comparison statement and says a link
 *     does not settle a point.
 * Kept in test-support, like the other proposed template sets (`./readiness-proposed-templates.ts`): no production module reaches it.
 * Everything else is v7 verbatim. v7 and every other registered set, and every issued PDF, are unchanged. The approval below is
 * `pending`: `checkTemplates` refuses it, so no record can be issued with this set. Activation needs founder approval of the
 * wording (and counsel review), registration in `governed/sources.ts`, and a deliberate selection change.
 */
import { CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION, CUSTOMER_RECORD_SCHEMA } from '@/lib/creator-record/customer-record/record'
import { templateFingerprint, type PdfTemplateApproval } from '@/lib/creator-record/customer-pdf/templates'
import { V2_WORDING_CANDIDATE } from '@/lib/creator-record/integrated-assessment/v2-wording-candidate'
import { CREATOR_RECORD_PDF_TEMPLATE_SETS } from '@/lib/creator-record/governed/sources'

export const CR_DOC_READER_EXT_2_TEMPLATE_STATUS = 'PROPOSED — NOT APPROVED, NOT REGISTERED' as const
export const CANDIDATE_TEMPLATE_BASE = { schema: 8, version: 7 } as const
export const CANDIDATE_TEMPLATE_VERSION = 8

export const V7_NOT_DONE_COMPARISON_LINE = 'SI8 did not compare your documents, or their readings, with what you told SI8 or with the guidance.'
export const V7_FIELDS_NOT_ESTABLISHED = 'Some details could not be read from the document.'
export const V8_FIELDS_NOT_ESTABLISHED = 'Some details were not shown on the document or could not be read.'
export const V8_NOT_DONE_COMPARISON_LINE = 'SI8 did not compare your documents, or their readings, with what you told SI8. Where this record links a document to an open point in the guidance, the link does not settle that point.'

export const LICENCE_FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  document_kind: 'Kind of document (as read)',
  personal_details_present: 'Details about a person shown (as read)', // CR-DOC-READER-EXT-7B R3
  licence_or_plan_type: 'Licence or plan type shown',
  content_designation: 'Designation shown',
  permission_statement: 'Permission statement shown',
  licensed_item_reference: 'Item shown',
  issue_date: 'Issue date shown',
  valid_until: 'End date shown',
})
export const LICENCE_CLASSIFICATION_LABELS: Readonly<Record<string, Record<string, string>>> = Object.freeze({
  document_kind: {
    licence_or_licence_certificate: 'Licence or licence certificate',
    licence_receipt_or_order: 'Licence receipt or order',
    permission_or_consent_letter: 'Permission or consent letter',
    provider_terms: 'Provider terms',
    not_a_licence_or_permission: 'Not a licence or permission',
    unknown: 'Unknown',
  },
  // CR-DOC-READER-EXT-6A: no assurance that details were not copied (only emails and phone numbers are blocked by validation).
  personal_details_present: { true: 'Yes', false: 'No' },
})

/** CR-DOC-READER-EXT-6B: printed in place of what a licence/permission reading does not show (customer privacy projection). */
export const READING_PRIVACY_TEMPLATE = Object.freeze({
  value_withheld: 'Shown in the document; not reproduced here',
  excerpts_withheld: 'Text from this document is not reproduced here, because a licence or permission may include details about other people. The document itself has the exact wording.',
})

const W = V2_WORDING_CANDIDATE
export const INTEGRATED_ASSESSMENT_V2_TEMPLATE = Object.freeze({
  heading: W.heading,
  intro: W.intro,
  association: W.association,
  open_point: W.open_dependency,
  point: 'Point',
  unlabelled_point: 'An open point in the guidance',
  no_document: W.no_document,
  document: 'Document {n}',
  reading: 'Reading',
  reading_labels: { read: 'Read automatically', not_read: 'Not read', could_not_read: 'Could not be read' },
  link: 'How it relates to this point',
  status_labels: { ...W.status_labels },
  reason: 'Why',
  reason_labels: { ...W.reason_labels },
  appears_to_show: 'Appears to show',
  excerpt: 'Excerpt',
  your_response: 'Your response',
  method: 'Integrated assessment method, version {version}.',
})

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export interface CandidateTemplateSet {
  status: typeof CR_DOC_READER_EXT_2_TEMPLATE_STATUS
  base: { template_id: string; version: number; fingerprint: string }
  templates: Record<string, any>
  approval: PdfTemplateApproval
}

export function candidateTemplateSetV8(): CandidateTemplateSet {
  const base = (CREATOR_RECORD_PDF_TEMPLATE_SETS as readonly { templates: any; approval: PdfTemplateApproval }[]).filter(
    (s) => s.approval.record_schema?.version === CANDIDATE_TEMPLATE_BASE.schema && s.approval.version === CANDIDATE_TEMPLATE_BASE.version,
  )
  // CR-DOC-READER-EXT-9: v7 is superseded once v8 is active; its frozen content is still the base.
  if (base.length !== 1 || !['approved', 'superseded'].includes(base[0].approval.lifecycle)) throw new Error('candidate template base: registered approved schema 8 v7 not found')
  const t = clone(base[0].templates)
  t.version = CANDIDATE_TEMPLATE_VERSION
  for (const [k, v] of Object.entries(LICENCE_FIELD_LABELS)) {
    if (Object.prototype.hasOwnProperty.call(t.examination.field_labels, k)) throw new Error(`field label ${k} already exists`)
    t.examination.field_labels[k] = v
  }
  for (const [k, v] of Object.entries(LICENCE_CLASSIFICATION_LABELS)) {
    if (Object.prototype.hasOwnProperty.call(t.examination.classification_labels, k)) throw new Error(`classification ${k} already exists`)
    t.examination.classification_labels[k] = { ...v }
  }
  const i = (t.sections.not_done.lines as string[]).indexOf(V7_NOT_DONE_COMPARISON_LINE)
  if (i !== 4) throw new Error('v7 not_done comparison line not where expected')
  t.sections.not_done.lines[i] = V8_NOT_DONE_COMPARISON_LINE
  t.integrated_assessment_v2 = clone(INTEGRATED_ASSESSMENT_V2_TEMPLATE)
  t.reading_privacy = clone(READING_PRIVACY_TEMPLATE)
  // CR-DOC-READER-EXT-7B R2: the limitation is reported when a detail was not shown OR could not be read (both reading types).
  for (const set of [t.examination.limitation_labels, t.live_examination.limitation_labels]) {
    if (set.fields_not_established !== V7_FIELDS_NOT_ESTABLISHED) throw new Error('v7 fields_not_established label not as expected')
    set.fields_not_established = V8_FIELDS_NOT_ESTABLISHED
  }
  return {
    status: CR_DOC_READER_EXT_2_TEMPLATE_STATUS,
    base: { template_id: base[0].approval.template_id, version: base[0].approval.version, fingerprint: base[0].approval.fingerprint },
    templates: t,
    approval: {
      template_id: t.template_id,
      version: CANDIDATE_TEMPLATE_VERSION,
      fingerprint: templateFingerprint(t),
      record_schema: { id: CUSTOMER_RECORD_SCHEMA, version: CUSTOMER_RECORD_EXAMINATION_SCHEMA_VERSION },
      lifecycle: 'pending',
      authority: null,
      decision_date: null,
      review_ref: 'CR-DOC-READER-EXT-2 proposed set (not approved)',
    } as unknown as PdfTemplateApproval,
  }
}
