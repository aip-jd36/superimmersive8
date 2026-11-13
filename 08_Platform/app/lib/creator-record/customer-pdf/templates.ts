/**
 * CR-V2-2B — the customer PDF template contract and its approval.
 *
 * The template set is DATA ONLY (strings, string lists, `{placeholder}` slots
 * and closed code→label maps; no functions), so its fingerprint is exact: the
 * SHA-256 of its canonical JSON. It covers everything the PDF prints that is
 * not record content: the stamp, headings, introductions, fixed lists,
 * provenance labels, conclusion and code labels, and which questionnaire
 * section a single question is printed in.
 *
 * Its approval is SEPARATE from the questionnaire Source Text Approval
 * (CR-V2-1A): a PDF template change never touches a prepared record, never
 * changes its digest and never makes it ineligible. The PDF records which
 * template set rendered it.
 *
 * No template set ships with the application: none is approved. Rendering
 * therefore always refuses outside tests, which supply placeholder templates
 * and a synthetic approval.
 */

import { CREATOR_RECORD_CONCLUSIONS } from '../contract/compose'
import { isIsoDate } from '../contract/types'
import { violatesCustomerWordingLock, violatesDependencyLabelLock } from '../contract/wording-lock'
import { CREATOR_RECORD_OBJECTIVE_TOPICS } from '../integration/objectives'
import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { arr, fail, int, isPlainObject, obj, oneOf, opt, ProjectionRefusal, str, type P } from '../record-core/projection'
import { EVIDENCE_CATEGORIES, EVIDENCE_MEDIA_TYPES } from '../evidence-intake/vocabulary'
import { CONTENT_CLASSES, EXAMINATION_FAILURE_REASONS, EXAMINATION_LIMITATIONS, EXECUTOR_MODES, OBSERVATION_BASES, OBSERVATION_STATUSES } from '../examination/envelope'
import { COMPARISON_FIELDS, CREATOR_RESPONSE_CODES } from '../customer-record/examination-section'
import { LIVE_LIMITATIONS } from '../live-examination/envelope'
import { DOCUMENT_EVIDENCE_REASONS, DOCUMENT_EVIDENCE_STATUSES, REQUIREMENT_EVIDENCE, REQUIREMENT_STANDINGS } from '../integrated-assessment/vocabulary'

export const CUSTOMER_PDF_TEMPLATE_ID = 'si8/creator-record-v2-pdf-templates'
export const CUSTOMER_PDF_SECTIONS = ['about', 'project', 'tools', 'contribution', 'guidance', 'open_items', 'not_done', 'provenance'] as const
/**
 * CR-V2-MVP-M3A: an examination-bearing record (schema 8) adds one section, `documents`, after the creator's own declarations and
 * before guidance, so what a document appears to show is never printed among what the creator told SI8.
 */
export const CUSTOMER_PDF_EXAMINATION_SECTIONS = ['about', 'project', 'tools', 'contribution', 'documents', 'guidance', 'open_items', 'not_done', 'provenance'] as const
/**
 * CR-SUM-PDF-B1 (Option R): a template set that carries the optional `readiness_summary` block prints the consultative summary
 * INSTEAD OF `guidance` and `open_items`, followed by `record_limitations` (the record-level content that section carried:
 * the document inventory of a schema 7 record and the record's limitations). Never both presentations in one document.
 */
// CR-PDF-IMPL-1: the three-level reading order (identity; about; the summary; then the supporting record).
export const CUSTOMER_PDF_READINESS_SECTIONS = ['identity', 'about', 'readiness_summary', 'project', 'tools', 'contribution', 'record_limitations', 'not_done', 'provenance'] as const
export const CUSTOMER_PDF_READINESS_EXAMINATION_SECTIONS = ['identity', 'about', 'readiness_summary', 'project', 'tools', 'contribution', 'documents', 'record_limitations', 'not_done', 'provenance'] as const
export type CustomerPdfSectionId = (typeof CUSTOMER_PDF_EXAMINATION_SECTIONS)[number] | (typeof CUSTOMER_PDF_READINESS_SECTIONS)[number]
/** The examination states a document can be in. `not_examined` is the record's own value; the other two are the envelope's outcome. */
export const DOCUMENT_EXAMINATION_STATES = ['not_examined', 'examined', 'could_not_examine'] as const
/** Sections a single (not per-tool) question may be printed in. Per-tool answers are always printed under Tools. */
export const QUESTION_SECTIONS = ['project', 'contribution'] as const

const plural = obj({ one: str, other: str })
/** A closed code → label map: exactly these keys, each a non-empty string. */
const exactLabels = (keys: readonly string[]): P<Record<string, string>> => (v, path) => {
  if (!isPlainObject(v)) return fail(path, 'expected an object')
  const got = Object.keys(v).sort()
  if (got.join('|') !== [...keys].sort().join('|')) return fail(path, 'labels must cover exactly the supported codes')
  for (const k of got) if (typeof v[k] !== 'string' || (v[k] as string).trim() === '') fail(`${path}.${k}`, 'expected a non-empty string')
  return v as Record<string, string>
}
/** An open id → value map (keys are governed ids, values validated). */
const mapOf = <V>(p: P<V>): P<Record<string, V>> => (v, path) => {
  if (!isPlainObject(v)) return fail(path, 'expected an object')
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, p(x, `${path}.${k}`)]))
}

const templateSpec = obj({
  template_id: oneOf([CUSTOMER_PDF_TEMPLATE_ID] as const),
  version: int,
  record_schema: obj({ id: str, version: int }),
  document_title: str,
  stamp: str,
  footer: str,
  page_label: str,
  sections: obj({
    about: obj({ heading: str, intro: arr(str), counts: obj({ answers: plural, guidance: plural, open_items: plural }) }),
    project: obj({ heading: str, intro: str, empty: str }),
    tools: obj({ heading: str, intro: str, tool_heading: str, empty: str }),
    contribution: obj({ heading: str, intro: str, empty: str }),
    guidance: obj({
      heading: str, intro: str, empty: str, item_heading: str, subject_with_tool: str, conclusion: str,
      // CR-V2-2H: printed after every guidance explanation (educational guidance, not a project-specific determination).
      item_limitation: str,
      selected_because: str, on_what_you_told_us: str, depends_on: str, unspecified_condition: str,
      // CR-V2-2I: an item whose own conditions are met, qualified only by the topic-level interpretation. Names no other item:
      // the record does not establish which inputs produced the topic-level status.
      topic_level: str,
      caveats: str,
    }),
    open_items: obj({
      heading: str, intro: str, empty: str, item_ref: str, for_guidance: str, what_you_told_us: str, nothing_told: str, evidence_note: str, status: str, sufficiency: str,
      not_established_heading: str, affects: str, unspecified_heading: str, topic_qualified_heading: str,
      not_sure_heading: str, documents_heading: str, documents_not_provided: str, limitations_heading: str, limitations: arr(str),
    }),
    not_done: obj({ heading: str, lines: arr(str) }),
    provenance: obj({
      heading: str, acknowledgements_heading: str, identity_heading: str, sources_heading: str, publications_heading: str,
      labels: obj({
        record_id: str, issued_on: str, prepared_ref: str, record_version: str, prepared_on: str, captured_at: str, snapshot: str,
        record_schema: str, record_schema_version: str, builder: str, builder_version: str, registry_version: str, ledger_version: str,
        // CR-V2-2H: no approver name and no internal ledger identifier is printed (both stay in the verified record).
        wording: str, wording_version: str, wording_digest: str,
        // CR-V2-PDF-7: the contract's id, version and a short reference. The full digest stays in the record.
        questionnaire_contract: str, questionnaire_contract_version: str, questionnaire_contract_ref: str,
        templates: str, templates_version: str, templates_fingerprint: str,
        publication_version: str,
      }),
    }),
  }),
  /**
   * CR-V2-DOC-1: the document inventory printed under Open items. `item_label` fills `{n}`, `size_value`
   * `{bytes}` and `tool_value` `{n}`. `fingerprint_note` states that a fingerprint identifies bytes only;
   * `not_examined` states that SI8 did not examine the document.
   */
  documents: obj({
    intro: str, item_label: str, type: str, category: str, tool: str, tool_value: str, size: str, size_value: str,
    fingerprint: str, fingerprint_note: str, examination: str, not_examined: str,
  }),
  /**
   * CR-V2-MVP-M3A: the examination-bearing record (schema 8). Optional in the contract, so a schema 7 template set and its
   * fingerprint are unchanged; a schema 8 record refuses to render without it. Every observation is printed with its basis and
   * reading status, under `intro` and `limitations_heading`, which must say what an observation is not. Observation fields,
   * qualifiers and examiner classification values are closed per profile: an unlabelled one refuses. `document_heading` fills `{n}`,
   * `comparison_response` `{field}` and `profile_value` `{id}` and `{version}`. `comparison_note` states that this PDF does not say
   * whether a document matches the creator's declarations; `open_items_pointer` replaces the open-items document inventory.
   */
  examination: opt(obj({
    heading: str, intro: arr(str), document_heading: str,
    status: str, status_labels: exactLabels(DOCUMENT_EXAMINATION_STATES),
    failure: str, failure_labels: exactLabels(EXAMINATION_FAILURE_REASONS),
    observations_heading: str, no_observations: str,
    field_labels: mapOf(str), qualifier: str, qualifier_labels: mapOf(str), classification_labels: mapOf(mapOf(str)),
    basis: str, basis_labels: exactLabels(OBSERVATION_BASES),
    reading: str, reading_labels: exactLabels(OBSERVATION_STATUSES),
    value: str, excerpt: str,
    your_response: str, response_labels: exactLabels(CREATOR_RESPONSE_CODES),
    comparison_response: str, comparison_field_labels: exactLabels(COMPARISON_FIELDS),
    limitations_heading: str, limitation_labels: exactLabels(EXAMINATION_LIMITATIONS),
    provenance_heading: str, reference: str, method: str, method_labels: exactLabels(EXECUTOR_MODES),
    content: str, content_labels: exactLabels(CONTENT_CLASSES), profile: str, profile_value: str,
    comparison_note: str, open_items_pointer: str,
  })),
  /**
   * CR-V2-MVP-M2A: the wording for a reading made by an AI model (a customer live examination). Optional, so a template set approved
   * without it is unchanged; a record holding a live reading refuses to render without it. `method` is the method row's value,
   * `provider` and `model` label the provider and model rows, `executed_at` the time row; limitation labels cover the live codes.
   */
  live_examination: opt(obj({
    method: str, provider: str, provider_labels: exactLabels(['anthropic']), model: str, executed_at: str,
    content_labels: exactLabels(['customer_document']), limitation_labels: exactLabels(LIVE_LIMITATIONS),
  })),
  /**
   * CR-V2-MVP-INTEGRATION-2 (PRD MVP scope §9): the integrated assessment, printed INSIDE each guidance item. Optional: a template
   * set approved without it renders exactly as before (this is the activation gate; approving a set that carries it activates it).
   * `intro` and `not_compared` must say that a reading is not verified and was not compared with the creator's answer (D10).
   * `document` fills `{n}` (the document's number in the documents section); `method` fills `{version}`.
   */
  integrated_assessment: opt(obj({
    heading: str, intro: str, requirement: str, unlabelled_requirement: str,
    you_told_us: str, nothing_told: str,
    standing: str, standing_labels: exactLabels(REQUIREMENT_STANDINGS),
    evidence_labels: exactLabels(REQUIREMENT_EVIDENCE.filter((x) => x !== 'documents_considered')),
    document: str, status_labels: exactLabels(DOCUMENT_EVIDENCE_STATUSES), reason: str, reason_labels: exactLabels(DOCUMENT_EVIDENCE_REASONS),
    appears_to_show: str, excerpt: str, your_response: str,
    not_compared: str, method: str,
  })),
  /**
   * CR-SUM-PDF-B1 (Option R): the consultative summary's wording (`../readiness-summary/summary` and `./render` template sets).
   * Optional: a template set approved without it renders exactly as before. Approving a set that carries it is what selects the
   * summary in place of `guidance` and `open_items`; the summary and render approvals are derived from THIS set's approval
   * (bound by its fingerprint), never approved separately. Every string is under the same wording lock.
   */
  readiness_summary: opt(obj({
    summary: obj({
      template_id: str, version: int,
      conclusion_labels: exactLabels(CREATOR_RECORD_CONCLUSIONS), topic_labels: mapOf(str), topic_framing: mapOf(str),
      selected_because_label: str, based_on_label: str, subject_questions: arr(str), topic_qualified_note: str, unspecified_condition_note: str,
    }),
    render: obj({
      template_id: str, version: int, summary_method: obj({ id: str, version: int }),
      heading: str, orientation: str, declared_heading: str, guidance_heading: str, guidance_intro: str, item_limitation: str,
      conclusion_label: str, caveats_label: str, consideration_ref_label: str, caveat_applies_to_label: str, depends_on_label: str,
      fact_labels: mapOf(str),
      unresolved_heading: str, unresolved_intro: str, unresolved_empty: str,
      dependency_told_label: str, dependency_nothing_told: str, dependency_evidence_label: str,
      dependency_status_label: str, dependency_status_labels: exactLabels(['open']),
      dependency_sufficiency_label: str, dependency_sufficiency_labels: exactLabels(['not_assessed']),
      topic_qualified_heading: str, unspecified_heading: str, not_sure_heading: str,
      not_established_heading: str, guidance_empty: str, uncovered_intro: str, rest_of_answers: str,
      assurance_heading: str, assurance_text: str,
      // CR-PDF-IMPL-1: the record-limitations heading (N3) and the overview row of a consideration with no open matter (N4).
      limitations_heading: str, overview_no_open: str,
    }),
  })),
  document_type_labels: exactLabels(EVIDENCE_MEDIA_TYPES),
  document_category_labels: exactLabels(EVIDENCE_CATEGORIES),
  question_sections: mapOf(oneOf(QUESTION_SECTIONS)),
  conclusion_labels: exactLabels(CREATOR_RECORD_CONCLUSIONS),
  topic_labels: exactLabels(CREATOR_RECORD_OBJECTIVE_TOPICS),
  /** Applicability fact codes the guidance may depend on. An unlisted fact refuses rendering. */
  fact_labels: mapOf(str),
  not_sure_label: str,
  dependency_codes: obj({
    status: exactLabels(['open']),
    sufficiency: exactLabels(['not_assessed']),
  }),
})

export type CustomerPdfTemplates = ReturnType<typeof templateSpec>

export const TEMPLATE_LIFECYCLE = ['pending', 'approved', 'withdrawn', 'superseded'] as const

export interface PdfTemplateApproval {
  template_id: typeof CUSTOMER_PDF_TEMPLATE_ID
  version: number
  /** SHA-256 of the canonical JSON of the approved template set. */
  fingerprint: string
  /** The customer-record schema the templates were approved for. */
  record_schema: { id: string; version: number }
  lifecycle: (typeof TEMPLATE_LIFECYCLE)[number]
  authority: string
  decision_date: string
  review_ref: string | null
}

export const templateFingerprint = (templates: unknown): string => sha256Hex(canonicalJson(templates))

/**
 * PRD v0.3 §5.4 wording lock, applied to every template string (`../contract/wording-lock`, shared with the approved-source
 * check since CR-V2-SCHEMA8-PATH-1). Negated "clearance" ("not a clearance") and "approved for Creator Records" are the only
 * exceptions. Dependency code labels may not use met / satisfied / confirmed / resolved.
 */
export function wordingLockViolations(templates: CustomerPdfTemplates): string[] {
  const out: string[] = []
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      if (violatesCustomerWordingLock(v)) out.push(path)
      return
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (path !== '' || k !== 'template_id') walk(x, path ? `${path}.${k}` : k)
  }
  walk(templates, '')
  for (const [k, v] of Object.entries(templates.dependency_codes)) for (const [code, label] of Object.entries(v)) if (violatesDependencyLabelLock(label)) out.push(`dependency_codes.${k}.${code}`)
  return out.sort()
}

export const TEMPLATE_REFUSAL_CODES = [
  'templates_malformed',
  'approval_missing',
  'approval_not_approved',
  'approval_withdrawn',
  'approval_superseded',
  'approval_identity_mismatch',
  'fingerprint_mismatch',
  'schema_mismatch',
  'pilot_marker',
  'wording_lock',
] as const
export type TemplateRefusalCode = (typeof TEMPLATE_REFUSAL_CODES)[number]

const UNAPPROVED_MARKER = /pilot|prototype|unapproved|not a governance approval/i

export type TemplateCheck = { ok: true; templates: CustomerPdfTemplates; fingerprint: string } | { ok: false; refusals: { code: TemplateRefusalCode; ref: string | null }[] }

/** The templates are exactly the approved set, for this record schema, and pass the wording lock. */
export function checkTemplates(templates: unknown, approval: PdfTemplateApproval | null, recordSchema: { id: string; version: number }): TemplateCheck {
  const refusals: { code: TemplateRefusalCode; ref: string | null }[] = []
  let t: CustomerPdfTemplates
  try {
    t = templateSpec(templates, 'templates')
  } catch (err) {
    if (err instanceof ProjectionRefusal) return { ok: false, refusals: [{ code: 'templates_malformed', ref: err.path }] }
    throw err
  }
  const fingerprint = templateFingerprint(templates)
  if (!approval) refusals.push({ code: 'approval_missing', ref: null })
  else {
    if (approval.lifecycle === 'withdrawn') refusals.push({ code: 'approval_withdrawn', ref: null })
    else if (approval.lifecycle === 'superseded') refusals.push({ code: 'approval_superseded', ref: null })
    else if (approval.lifecycle !== 'approved' || typeof approval.authority !== 'string' || approval.authority.trim() === '' || !isIsoDate(approval.decision_date)) refusals.push({ code: 'approval_not_approved', ref: null })
    if (UNAPPROVED_MARKER.test(String(approval.authority)) || UNAPPROVED_MARKER.test(String(approval.review_ref ?? ''))) refusals.push({ code: 'pilot_marker', ref: null })
    if (approval.template_id !== t.template_id || approval.version !== t.version) refusals.push({ code: 'approval_identity_mismatch', ref: null })
    if (approval.fingerprint !== fingerprint) refusals.push({ code: 'fingerprint_mismatch', ref: null })
    if (!approval.record_schema || approval.record_schema.id !== recordSchema.id || approval.record_schema.version !== recordSchema.version) refusals.push({ code: 'schema_mismatch', ref: 'approval' })
  }
  if (t.record_schema.id !== recordSchema.id || t.record_schema.version !== recordSchema.version) refusals.push({ code: 'schema_mismatch', ref: 'templates' })
  for (const path of wordingLockViolations(t)) refusals.push({ code: 'wording_lock', ref: path })
  return refusals.length > 0 ? { ok: false, refusals } : { ok: true, templates: t, fingerprint }
}

/** Fill `{name}` slots mechanically. Every slot must be supplied and every supplied value used. */
export function fill(template: string, values: Record<string, string | number>): string {
  const used = new Set<string>()
  const out = template.replace(/\{([a-z_]+)\}/g, (_, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) throw new Error(`template slot {${name}} has no value`)
    used.add(name)
    return String(values[name])
  })
  for (const k of Object.keys(values)) if (!used.has(k)) throw new Error(`template has no slot {${k}}`)
  return out
}
