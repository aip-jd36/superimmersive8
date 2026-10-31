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
import { CREATOR_RECORD_OBJECTIVE_TOPICS } from '../integration/objectives'
import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { arr, fail, int, isPlainObject, obj, oneOf, ProjectionRefusal, str, type P } from '../record-core/projection'

export const CUSTOMER_PDF_TEMPLATE_ID = 'si8/creator-record-v2-pdf-templates'
export const CUSTOMER_PDF_SECTIONS = ['about', 'project', 'tools', 'contribution', 'guidance', 'open_items', 'not_done', 'provenance'] as const
export type CustomerPdfSectionId = (typeof CUSTOMER_PDF_SECTIONS)[number]
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
        templates: str, templates_version: str, templates_fingerprint: str,
        publication_version: str,
      }),
    }),
  }),
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
 * PRD v0.3 §5.4 wording lock, applied to every template string. Negated
 * "clearance" ("not a clearance") and "approved for Creator Records" are the
 * only exceptions. Dependency code labels may not use met / satisfied /
 * confirmed / resolved.
 */
const BANNED = /\b(cleared|clearance|compliant|certified|certification|verified|verification|approved)\b|licensed to|permitted to|safe to|applies to you|governed by|does not apply/i
const ALLOWED = [/\bnot (a |an )?(legal )?clearance\b/gi, /\bnot cleared\b/gi, /\bapproved for Creator Records\b/gi]
const DEPENDENCY_BANNED = /\b(met|satisfied|confirmed|resolved)\b/i

export function wordingLockViolations(templates: CustomerPdfTemplates): string[] {
  const out: string[] = []
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') {
      let t = v
      for (const a of ALLOWED) t = t.replace(a, '')
      if (BANNED.test(t)) out.push(path)
      return
    }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (path !== '' || k !== 'template_id') walk(x, path ? `${path}.${k}` : k)
  }
  walk(templates, '')
  for (const [k, v] of Object.entries(templates.dependency_codes)) for (const [code, label] of Object.entries(v)) if (DEPENDENCY_BANNED.test(label)) out.push(`dependency_codes.${k}.${code}`)
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
